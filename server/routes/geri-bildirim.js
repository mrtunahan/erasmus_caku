/**
 * HATA / ÖNERİ BİLDİRİMİ — sunucu uçları (kurallar: server/lib/geri-bildirim.js)
 *
 *   GET  /api/geri-bildirim              → { benim, gelen, yetkili, bolumler }
 *   GET  /api/geri-bildirim/ozet         → { acik }  yetkilinin bekleyen kayıt sayısı (rozet)
 *   POST /api/geri-bildirim              → yeni bildirim
 *   POST /api/geri-bildirim/:id/mesaj    → { metin }
 *   POST /api/geri-bildirim/:id/durum    → { durum }
 *   POST /api/geri-bildirim/:id/yonlendir → { bolumId, not }
 *
 * ⚠ NEDEN GENEL /api/db DEĞİL? Kayıt kimin göreceğini (fakülte → bölüm)
 * yönlendirmeyle değiştiriyor; görünürlük, gönderenin bölümü ve hedef
 * sunucuda çözülmeli. Genel uç bu akışı taşımıyor.
 */
const express = require('express');
const crypto = require('crypto');
const { getDbSafe } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { profilBul } = require('../lib/akademisyen-kimlik');
const { bolumKimlikHaritasi, bolumVaryantlari } = require('../lib/bolum-kimlik');
const K = require('../lib/geri-bildirim');

const router = express.Router();
const KOL = 'geri_bildirimler';
const metin = (v) => String(v == null ? '' : v).trim();
const sar = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    console.error('[geri-bildirim]', e && e.message);
    res.status(500).json({ error: 'İşlem yapılamadı.' });
  });

// Yetki alanı routes/db.js ile AYNI kuraldan (yazma alanı: bölüm yetkilisinde
// yalnız ana bölüm, fakülte yetkilisinde fakültesi, üniversitede hepsi).
async function alanOf(db, user) {
  try {
    const dbRouter = require('./db');
    return (await dbRouter.kullaniciAlani(db, user, false)) || { tur: 'yok', bolumler: new Set() };
  } catch (_) {
    return { tur: 'yok', bolumler: new Set() };
  }
}

const kimOf = (user) => ({ rol: metin(user.role), kimlik: metin(user.identifier) });

async function bolumBilgisi(db) {
  const doklar = await db.collection('departments').find({}).toArray();
  const harita = bolumKimlikHaritasi(doklar);
  const adOf = (id) => {
    const v = bolumVaryantlari(harita, metin(id));
    const d = doklar.find((x) =>
      [x.id, x._docId, x.code, x._id && String(x._id)].map(metin).some((k) => v.includes(k))
    );
    return (d && metin(d.name)) || metin(id);
  };
  return { doklar, harita, adOf };
}

/** Gönderenin adı ve bölümü (istemciye güvenilmez). */
async function gonderenBilgisi(db, user) {
  if (user.role === 'student') {
    const no = metin(user.studentNumber || user.identifier);
    const o = (await db.collection('students').findOne({ studentNumber: no })) || {};
    return {
      ad: [o.firstName, o.lastName].filter(Boolean).join(' ').trim() || metin(o.name) || no,
      bolumId: metin(o.departmentId || user.departmentId),
      etiket: 'Öğrenci · ' + no,
    };
  }
  if (user.role === 'professor') {
    const p = (await profilBul(db, user.identifier).catch(() => null)) || {};
    return {
      ad: metin(p.name || user.identifier),
      bolumId: metin(p.departmentId || user.departmentId),
      etiket: p.isMemur ? 'Memur' : 'Akademisyen',
    };
  }
  return {
    ad: metin(user.identifier),
    bolumId: metin(user.departmentId),
    etiket: user.role === 'bolum_yetkilisi' ? 'Bölüm yetkilisi' : 'Yönetici',
  };
}

/** Bir bölümün fakülte yetkilileri (adları). */
async function fakulteYetkilileri(db, bolumId) {
  if (!bolumId) return [];
  const adaylar = await db
    .collection('professors')
    .find({ isFacultyManager: true }, { projection: { name: 1 } })
    .toArray();
  const out = [];
  for (const p of adaylar) {
    const ad = metin(p.name);
    if (!ad || out.includes(ad)) continue;
    const alan = await alanOf(db, { role: 'professor', identifier: ad });
    if (alan.tur === 'fakulte' && alan.bolumler.has(bolumId)) out.push(ad);
  }
  return out;
}

async function universiteYetkilileri(db) {
  const l = await db
    .collection('professors')
    .find({ isUniversityAdmin: true }, { projection: { name: 1 } })
    .toArray();
  return [...new Set(l.map((p) => metin(p.name)).filter(Boolean))];
}

/** Bir bölümün yetkilileri: bölüm yetkilisi bayraklı akademisyenler + bölüm girişi. */
async function bolumYetkilileri(db, bolumId, bilgi) {
  const v = bolumVaryantlari(bilgi.harita, bolumId);
  const profs = await db
    .collection('professors')
    .find({ isDeptManager: true, departmentId: { $in: v } }, { projection: { name: 1 } })
    .toArray();
  const adlar = profs.map((p) => metin(p.name));
  bilgi.doklar
    .filter((d) =>
      [d.id, d._docId, d.code, d._id && String(d._id)].map(metin).some((k) => v.includes(k))
    )
    .forEach((d) => {
      (Array.isArray(d.managerNames) ? d.managerNames : []).forEach((n) => adlar.push(metin(n)));
      if (d.managerName) adlar.push(metin(d.managerName));
    });
  return [...new Set(adlar.filter(Boolean))];
}

async function bildir(req, db, alicilar, mesaj, kayitId) {
  const liste = [...new Set((alicilar || []).map(metin).filter(Boolean))].map((id) => ({
    recipientType: 'user',
    recipientId: id,
    type: 'geri-bildirim',
    module: 'geribildirim',
    title: mesaj.title,
    body: mesaj.body,
    link: 'geribildirim',
    meta: { kaynak: 'geribildirim', kayitId },
    readBy: [],
    createdAt: new Date().toISOString(),
  }));
  if (!liste.length) return;
  try {
    await db.collection('notifications').insertMany(liste);
    const io = req.app && req.app.get && req.app.get('io');
    if (io) io.emit('db:write', { collections: ['notifications'], at: new Date().toISOString() });
  } catch (e) {
    console.warn('[geri-bildirim] bildirim yazılamadı:', e && e.message);
  }
}

/** Kaydı şu an kim ele alıyor? (gönderenin mesajında bildirilecekler) */
async function sorumlular(db, kayit, bilgi) {
  if (kayit.yonlendirilenBolum) return bolumYetkilileri(db, kayit.yonlendirilenBolum, bilgi);
  if (kayit.hedef === 'fakulte') {
    const f = await fakulteYetkilileri(db, kayit.bolumId);
    if (f.length) return f;
  }
  return universiteYetkilileri(db);
}

const yeniKimlik = () =>
  'gb-' + Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex');
const simdi = () => new Date().toISOString();

// ── Liste ──
router.get(
  '/',
  requireAuth,
  sar(async (req, res) => {
    const user = req.user;
    if (user.aday) return res.status(403).json({ error: 'Aday hesabı bildirim gönderemez.' });
    const db = await getDbSafe();
    const kim = kimOf(user);
    const alan = await alanOf(db, user);
    const benim = await db
      .collection(KOL)
      .find({ 'gonderen.kimlik': kim.kimlik, 'gonderen.rol': kim.rol })
      .sort({ olusturuldu: -1 })
      .limit(100)
      .toArray();
    let gelen = [];
    if (alan.tur !== 'yok') {
      const bolumler = [...(alan.bolumler || [])];
      const sorgu =
        alan.tur === 'universite'
          ? {}
          : alan.tur === 'fakulte'
            ? {
                $or: [
                  { hedef: 'fakulte', bolumId: { $in: bolumler } },
                  { yonlendirilenBolum: { $in: bolumler } },
                ],
              }
            : { yonlendirilenBolum: { $in: bolumler } };
      gelen = (await db.collection(KOL).find(sorgu).sort({ olusturuldu: -1 }).limit(300).toArray())
        // Sorgu daraltır; son söz kuralındır.
        .filter((k) => K.yetkiliSifati(k, alan));
    }
    // Yönlendirme listesi: yetkilinin alanındaki bölümler (tekilleştirilmiş).
    let bolumListesi = [];
    if (alan.tur === 'universite' || alan.tur === 'fakulte') {
      const bilgi = await bolumBilgisi(db);
      const gorulen = new Set();
      bolumListesi = bilgi.doklar
        .map((d) => ({
          id: metin(d._docId || d.id || (d._id && String(d._id))),
          ad: metin(d.name),
        }))
        .filter((d) => d.id && d.ad && (alan.tur === 'universite' || alan.bolumler.has(d.id)))
        .filter((d) => (gorulen.has(d.ad) ? false : (gorulen.add(d.ad), true)))
        .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
    }
    res.json({
      benim: benim.map((k) => K.gorunum(k, kim, alan)),
      gelen: gelen.map((k) => K.gorunum(k, kim, alan)),
      yetkili: alan.tur !== 'yok',
      bolumler: bolumListesi,
    });
  })
);

// ── Rozet: yetkilinin ilgilenmesi beklenen kayıt sayısı ──
router.get(
  '/ozet',
  requireAuth,
  sar(async (req, res) => {
    const user = req.user;
    if (user.aday || user.role === 'student') return res.json({ acik: 0 });
    const db = await getDbSafe();
    const alan = await alanOf(db, user);
    if (alan.tur === 'yok') return res.json({ acik: 0 });
    const l = await db
      .collection(KOL)
      .find({ durum: { $in: ['yeni', 'yonlendirildi', 'incelemede'] } })
      .project({ hedef: 1, bolumId: 1, yonlendirilenBolum: 1, durum: 1 })
      .limit(1000)
      .toArray();
    // Fakülte yetkilisi yönlendirdiği kaydı artık bölümün işi sayar.
    const acik = l.filter((k) => {
      const s = K.yetkiliSifati(k, alan);
      if (!s) return false;
      return s === 'bolum' ? true : k.durum !== 'yonlendirildi';
    }).length;
    res.json({ acik });
  })
);

// ── Yeni bildirim ──
router.post(
  '/',
  requireAuth,
  sar(async (req, res) => {
    const user = req.user;
    if (user.aday) return res.status(403).json({ error: 'Aday hesabı bildirim gönderemez.' });
    const t = K.girdiTemizle(req.body);
    if (t.hata) return res.status(400).json({ error: t.hata });
    const db = await getDbSafe();
    const kim = kimOf(user);
    const gun = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const bugun = await db.collection(KOL).countDocuments({
      'gonderen.kimlik': kim.kimlik,
      'gonderen.rol': kim.rol,
      olusturuldu: { $gte: gun },
    });
    if (bugun >= K.SINIR.gunluk) {
      return res
        .status(429)
        .json({ error: 'Bir günde en çok ' + K.SINIR.gunluk + ' bildirim gönderebilirsiniz.' });
    }
    const g = await gonderenBilgisi(db, user);
    const bilgi = await bolumBilgisi(db);
    const benimAlan = await alanOf(db, user);
    // Fakülte yetkilisinin kendi bildirimi üniversiteye gider.
    const fakulteYet = benimAlan.tur === 'fakulte' ? [] : await fakulteYetkilileri(db, g.bolumId);
    const hedef = fakulteYet.length ? 'fakulte' : 'universite';
    const kayit = {
      _id: yeniKimlik(),
      ...t.veri,
      gonderen: { ...kim, ad: g.ad, etiket: g.etiket },
      bolumId: g.bolumId,
      bolumAd: bilgi.adOf(g.bolumId),
      hedef,
      durum: 'yeni',
      yonlendirilenBolum: '',
      mesajlar: [],
      gecmis: [{ olay: 'olusturuldu', kim: g.ad, zaman: simdi() }],
      olusturuldu: simdi(),
      guncellendi: simdi(),
    };
    await db.collection(KOL).insertOne(kayit);
    const alicilar = hedef === 'fakulte' ? fakulteYet : await universiteYetkilileri(db);
    await bildir(
      req,
      db,
      alicilar,
      {
        title: (K.TURLER[kayit.tur] || 'Bildirim') + ' · ' + kayit.modulAd,
        body: g.ad + ' (' + (kayit.bolumAd || 'bölüm belirsiz') + '): ' + kayit.konu,
      },
      kayit._id
    );
    res.json({ ok: true, kayit: K.gorunum(kayit, kim, benimAlan) });
  })
);

async function kayitVeYetki(req, res) {
  const db = await getDbSafe();
  const kayit = await db.collection(KOL).findOne({ _id: metin(req.params.id) });
  if (!kayit) {
    res.status(404).json({ error: 'Kayıt bulunamadı.' });
    return null;
  }
  const kim = kimOf(req.user);
  const alan = await alanOf(db, req.user);
  if (!K.gorebilirMi(kayit, kim, alan)) {
    res.status(403).json({ error: 'Bu kayda erişim yetkiniz yok.' });
    return null;
  }
  return { db, kayit, kim, alan };
}

// ── Mesaj (yanıt / ek bilgi) ──
router.post(
  '/:id/mesaj',
  requireAuth,
  sar(async (req, res) => {
    const b = await kayitVeYetki(req, res);
    if (!b) return;
    const { db, kayit, kim, alan } = b;
    const karar = K.mesajKarari(kayit, kim, alan);
    if (!karar.izin) return res.status(403).json({ error: karar.hata });
    const m = K.mesajTemizle(req.body && req.body.metin);
    if (m.hata) return res.status(400).json({ error: m.hata });
    const g = await gonderenBilgisi(db, req.user);
    const mesaj = { yazar: kim.kimlik, ad: g.ad, rol: karar.rol, metin: m.metin, zaman: simdi() };
    const set = { guncellendi: simdi() };
    // Yetkilinin ilk yanıtı kaydı "inceleniyor"a alır.
    if (karar.rol === 'yetkili' && kayit.durum === 'yeni') set.durum = 'incelemede';
    await db
      .collection(KOL)
      .updateOne({ _id: kayit._id }, { $push: { mesajlar: mesaj }, $set: set });
    const bilgi = await bolumBilgisi(db);
    const alicilar =
      karar.rol === 'yetkili' ? [kayit.gonderen.kimlik] : await sorumlular(db, kayit, bilgi);
    await bildir(
      req,
      db,
      alicilar.filter((a) => a !== kim.kimlik),
      {
        title: 'Bildiriminize yanıt · ' + kayit.modulAd,
        body: g.ad + ': ' + m.metin.slice(0, 140),
      },
      kayit._id
    );
    const yeni = await db.collection(KOL).findOne({ _id: kayit._id });
    res.json({ ok: true, kayit: K.gorunum(yeni, kim, alan) });
  })
);

// ── Durum ──
router.post(
  '/:id/durum',
  requireAuth,
  sar(async (req, res) => {
    const b = await kayitVeYetki(req, res);
    if (!b) return;
    const { db, kayit, kim, alan } = b;
    const durum = metin(req.body && req.body.durum);
    const karar = K.durumKarari(kayit, alan, durum);
    if (!karar.izin) return res.status(403).json({ error: karar.hata });
    const g = await gonderenBilgisi(db, req.user);
    await db.collection(KOL).updateOne(
      { _id: kayit._id },
      {
        $set: { durum, guncellendi: simdi() },
        $push: { gecmis: { olay: 'durum', detay: durum, kim: g.ad, zaman: simdi() } },
      }
    );
    await bildir(
      req,
      db,
      [kayit.gonderen.kimlik].filter((a) => a !== kim.kimlik),
      {
        title: 'Bildiriminiz: ' + (K.DURUMLAR[durum] || durum),
        body: kayit.konu,
      },
      kayit._id
    );
    const yeni = await db.collection(KOL).findOne({ _id: kayit._id });
    res.json({ ok: true, kayit: K.gorunum(yeni, kim, alan) });
  })
);

// ── Bölüme yönlendirme ──
router.post(
  '/:id/yonlendir',
  requireAuth,
  sar(async (req, res) => {
    const b = await kayitVeYetki(req, res);
    if (!b) return;
    const { db, kayit, kim, alan } = b;
    const hedefBolum = metin(req.body && req.body.bolumId);
    const karar = K.yonlendirmeKarari(kayit, alan, hedefBolum);
    if (!karar.izin) return res.status(403).json({ error: karar.hata });
    const not = metin(req.body && req.body.not).slice(0, K.SINIR.mesaj);
    const bilgi = await bolumBilgisi(db);
    const g = await gonderenBilgisi(db, req.user);
    const bolumAd = bilgi.adOf(hedefBolum);
    const guncelleme = {
      $set: {
        durum: 'yonlendirildi',
        yonlendirilenBolum: hedefBolum,
        yonlendirilenBolumAd: bolumAd,
        yonlendiren: g.ad,
        guncellendi: simdi(),
      },
      $push: {
        gecmis: { olay: 'yonlendirildi', detay: bolumAd, not, kim: g.ad, zaman: simdi() },
      },
    };
    await db.collection(KOL).updateOne({ _id: kayit._id }, guncelleme);
    if (not) {
      await db.collection(KOL).updateOne(
        { _id: kayit._id },
        {
          $push: {
            mesajlar: {
              yazar: kim.kimlik,
              ad: g.ad,
              rol: 'yetkili',
              metin: '[' + bolumAd + ' bölümüne yönlendirildi] ' + not,
              zaman: simdi(),
              ic: true,
            },
          },
        }
      );
    }
    await bildir(
      req,
      db,
      await bolumYetkilileri(db, hedefBolum, bilgi),
      {
        title: 'Size yönlendirilen bildirim · ' + kayit.modulAd,
        body: g.ad + ' yönlendirdi: ' + kayit.konu,
      },
      kayit._id
    );
    await bildir(
      req,
      db,
      [kayit.gonderen.kimlik],
      { title: 'Bildiriminiz bölüme yönlendirildi', body: bolumAd + ' · ' + kayit.konu },
      kayit._id
    );
    const yeni = await db.collection(KOL).findOne({ _id: kayit._id });
    res.json({ ok: true, kayit: K.gorunum(yeni, kim, alan) });
  })
);

module.exports = router;
