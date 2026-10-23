/**
 * ADAY HESABI — öğrenci numarası olmayan başvuranın kayıt/giriş uçları.
 *
 *   POST /api/aday/kayit          → hesap açar, oturum verir
 *   POST /api/aday/giris          → { tc, sifre }
 *   GET  /api/aday/ben            → adayın kendi bilgisi
 *   POST /api/aday/sifre-degistir → { eski, yeni }
 *
 * Personel:
 *   GET  /api/aday/liste          → kapsamındaki adaylar (T.C. maskeli)
 *   POST /api/aday/numara-ayir    → vekâleten başvuru için yeni aday no
 *   POST /api/aday/sifre-sifirla  → { adayNo } geçici şifre (bir kez gösterilir)
 *   POST /api/aday/numara-aktar   → { adayNo, ogrenciNo } kayıtları gerçek numaraya taşır
 *   POST /api/aday/kapat          → { adayNo }
 *
 * Kural ve gerekçe: lib/aday-hesap.js (form), server/lib/aday-yetki.js (yetki).
 *
 * ⚠ T.C. KİMLİK NO AÇIK SAKLANMAZ. Yalnız eşleştirme için tuzlu özeti
 * (mükerrer hesap ve kesin kayıtta eşleşme) ve ekranda gösterilecek maskeli
 * hâli tutulur.
 *
 * ⚠ ADAY NUMARASI SUNUCUDAN VERİLİR. Eskiden personel vekâleten başvuru
 * açarken numarayı tarayıcı, yalnız o modülün kayıtlarına bakarak
 * üretiyordu; hesabını kendi açan adayın numarasıyla aynı numara çıkabilir,
 * iki ayrı kişinin başvurusu tek kimlikte birleşirdi. Tek sayaç her iki yolu
 * da besler.
 */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { getDbSafe } = require('../config/database');
const { requireAuth, generateToken, setTokenCookie } = require('../middleware/auth');
const oturumIptal = require('../lib/oturum-iptal');
const { profilBul } = require('../lib/akademisyen-kimlik');
const { adayNoMu } = require('../lib/aday-yetki');
const { yetkiAlani, bolumAlanda, fakulteAlanda } = require('../lib/yetki-alani');

let kuralSozu = null;
const kural = () => (kuralSozu = kuralSozu || import('../../lib/aday-hesap.js'));

const router = express.Router();
const metin = (v) => String(v == null ? '' : v).trim();
const ADAYLAR = 'adaylar';
const DONEMLER = 'aday_basvuru_donemleri';
const UPLOAD_KOK = path.resolve(path.join(__dirname, '..', 'uploads'));
const SAYAC = 'aday_sayac';
const BCRYPT_TURU = 12;

// Özet tuzu. Üretimde ADAY_TC_TUZU tanımlanmalı; değişirse eski hesaplar
// T.C. ile bulunamaz (yeni hesap açılabilir) — bu yüzden JWT anahtarına
// bağlanmadı (o anahtar dönebilir).
const TC_TUZU = process.env.ADAY_TC_TUZU || 'caku-aday-tc-v1';
const tcOzeti = (tc) =>
  crypto
    .createHash('sha256')
    .update(TC_TUZU + ':' + metin(tc))
    .digest('hex');

// ── Hız sınırı (bellekte; amaç taramayı yavaşlatmak) ──
const denemeler = new Map();
const PENCERE_MS = 15 * 60 * 1000;
function sinirAsildiMi(anahtar, tavan) {
  const s = Date.now();
  const k = denemeler.get(anahtar);
  if (!k || s - k.ilk > PENCERE_MS) return false;
  return k.sayi >= tavan;
}
function denemeYaz(anahtar) {
  const s = Date.now();
  const k = denemeler.get(anahtar);
  if (!k || s - k.ilk > PENCERE_MS) denemeler.set(anahtar, { sayi: 1, ilk: s });
  else k.sayi++;
  if (denemeler.size > 20000) denemeler.clear();
}
const ipAnahtari = (req) => String(req.ip || (req.socket && req.socket.remoteAddress) || '?');

let indeksHazir = false;
async function indeksleriKur(db) {
  if (indeksHazir) return;
  indeksHazir = true;
  try {
    await db.collection(ADAYLAR).createIndex({ tcOzet: 1 }, { unique: true });
    await db.collection(ADAYLAR).createIndex({ adayNo: 1 }, { unique: true });
  } catch (e) {
    console.warn('[aday] indeks kurulamadı:', e && e.message);
  }
}

// ── Aday numarası: yıl başına tek sayaç ──
// Sayaç ilk kez kurulurken o yıl verilmiş EN BÜYÜK numaradan başlar
// (vekâleten açılmış eski başvurular dahil).
async function yeniAdayNo(db) {
  const yil = String(new Date().getFullYear());
  const anahtar = 'aday-' + yil;
  const col = db.collection(SAYAC);
  if (!(await col.findOne({ _id: anahtar }))) {
    const kalip = new RegExp('^ADAY-' + yil + '-(\\d+)$', 'i');
    let enBuyuk = 0;
    const tara = (liste, alan) =>
      liste.forEach((d) => {
        const e = kalip.exec(metin(d && d[alan]));
        if (e) enBuyuk = Math.max(enBuyuk, parseInt(e[1], 10) || 0);
      });
    const [a, y, m] = await Promise.all([
      db
        .collection(ADAYLAR)
        .find({}, { projection: { adayNo: 1 } })
        .toArray(),
      db
        .collection('yatay_gecis_basvurular')
        .find({}, { projection: { ogrenciNo: 1 } })
        .toArray(),
      db
        .collection('muafiyet_records')
        .find({}, { projection: { studentNo: 1 } })
        .toArray(),
    ]);
    tara(a, 'adayNo');
    tara(y, 'ogrenciNo');
    tara(m, 'studentNo');
    try {
      await col.insertOne({ _id: anahtar, son: enBuyuk });
    } catch (_e) {
      /* aynı anda başka istek kurduysa onunki geçerli */
    }
  }
  const r = await col.findOneAndUpdate(
    { _id: anahtar },
    { $inc: { son: 1 } },
    { returnDocument: 'after' }
  );
  let belge = r && r.value !== undefined ? r.value : r;
  if (!belge || typeof belge.son !== 'number') belge = await col.findOne({ _id: anahtar });
  return 'ADAY-' + yil + '-' + String(belge.son).padStart(4, '0');
}

function adayGorunumu(a) {
  return {
    adayNo: a.adayNo,
    ad: a.ad,
    soyad: a.soyad,
    tcMaske: a.tcMaske,
    eposta: a.eposta,
    telefon: a.telefon,
    turler: Array.isArray(a.turler) ? a.turler : [],
    departmentId: a.departmentId,
    departmentName: a.departmentName || '',
    durum: a.durum || 'aktif',
    ogrenciNo: a.ogrenciNo || '',
    sifreDegistirmeli: !!a.sifreDegistirmeli,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : metin(a.createdAt),
  };
}

function oturumAc(res, a) {
  const token = generateToken({
    role: 'aday',
    identifier: a.adayNo,
    departmentId: a.departmentId,
    turler: a.turler,
  });
  setTokenCookie(res, token);
  return token;
}

async function bolumBul(db, id) {
  const v = metin(id);
  if (!v) return null;
  return db.collection('departments').findOne({ $or: [{ _docId: v }, { id: v }] });
}

// ══════════════════════════════════════════════
// Aday: kayıt
// ══════════════════════════════════════════════
router.post('/kayit', async (req, res) => {
  // IP başına 15 dakikada 10 kayıt: okul/yurt ağlarında birden çok aday aynı
  // IP'den çıkabilir; sınır toplu sahte hesap açmayı yavaşlatmak içindir.
  const ip = 'kayit:' + ipAnahtari(req);
  if (sinirAsildiMi(ip, 10)) {
    return res.status(429).json({ error: 'Çok fazla kayıt denemesi. 15 dakika sonra deneyin.' });
  }
  denemeYaz(ip);
  try {
    const K = await kural();
    const g = req.body || {};
    const hatalar = K.adayKayitHatalari({ ...g, kvkk: g.kvkk === true });
    if (Object.keys(hatalar).length) {
      return res.status(400).json({ error: Object.values(hatalar)[0], hatalar });
    }
    const v = K.adayKaydiSadele(g);
    const db = await getDbSafe();
    await indeksleriKur(db);
    const bolum = await bolumBul(db, v.departmentId);
    if (!bolum) return res.status(400).json({ error: 'Seçilen bölüm bulunamadı.' });
    const tcOzet = tcOzeti(v.tc);
    if (await db.collection(ADAYLAR).findOne({ tcOzet })) {
      return res.status(409).json({
        error:
          'Bu T.C. kimlik numarasıyla açılmış bir aday hesabı var. Giriş yapın; şifrenizi ' +
          'unuttuysanız “Şifremi unuttum” ile yenileyin ya da bölümünüzden sıfırlatın.',
      });
    }
    const simdi = new Date();
    const kayit = {
      adayNo: await yeniAdayNo(db),
      ad: v.ad,
      soyad: v.soyad,
      tcOzet,
      tcMaske: K.tcMaskele(v.tc),
      eposta: v.eposta,
      telefon: v.telefon,
      turler: v.turler,
      departmentId: metin(bolum._docId || bolum.id || v.departmentId),
      departmentName: metin(bolum.name),
      durum: 'aktif',
      sifreHash: await bcrypt.hash(String(g.sifre), BCRYPT_TURU),
      // Aydınlatma kaydı (KVKK m.10): hangi sürüm, ne zaman — zaman sunucudan.
      kvkkAydinlatma: { surum: K.ADAY_KVKK_SURUM, tarih: simdi.toISOString(), tur: 'aydinlatma' },
      createdAt: simdi,
      updatedAt: simdi,
    };
    await db.collection(ADAYLAR).insertOne(kayit);
    const token = oturumAc(res, kayit);
    return res.json({ success: true, token, aday: adayGorunumu(kayit) });
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ error: 'Bu T.C. kimlik numarasıyla aday hesabı zaten var.' });
    }
    console.error('[aday] kayıt:', e && e.message);
    return res.status(500).json({ error: 'Kayıt yapılamadı.' });
  }
});

// ══════════════════════════════════════════════
// Aday: giriş
// ══════════════════════════════════════════════
router.post('/giris', async (req, res) => {
  const tc = metin(req.body && req.body.tc);
  const sifre = req.body && req.body.sifre;
  if (!/^\d{11}$/.test(tc) || typeof sifre !== 'string' || !sifre) {
    return res.status(400).json({ error: 'T.C. kimlik numarası ve şifre gerekli.' });
  }
  const anahtar = 'giris:' + tcOzeti(tc);
  const ip = 'girisip:' + ipAnahtari(req);
  if (sinirAsildiMi(anahtar, 5) || sinirAsildiMi(ip, 30)) {
    return res.status(429).json({ error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' });
  }
  try {
    const db = await getDbSafe();
    const a = await db.collection(ADAYLAR).findOne({ tcOzet: tcOzeti(tc) });
    const dogru = a && a.sifreHash ? await bcrypt.compare(sifre, a.sifreHash) : false;
    if (!dogru) {
      denemeYaz(anahtar);
      denemeYaz(ip);
      return res.json({ success: false, error: 'T.C. kimlik numarası ya da şifre hatalı.' });
    }
    if (a.durum === 'aktarildi') {
      return res.json({
        success: false,
        error:
          'Kesin kaydınız yapıldı; başvurularınız ' +
          a.ogrenciNo +
          ' numaralı öğrenci hesabınıza aktarıldı. "Öğrenci" sekmesinden giriş yapın.',
      });
    }
    if (a.durum !== 'aktif') {
      return res.json({ success: false, error: 'Aday hesabınız kapatıldı. Bölümünüze başvurun.' });
    }
    denemeler.delete(anahtar);
    const token = oturumAc(res, a);
    await db
      .collection(ADAYLAR)
      .updateOne({ _id: a._id }, { $set: { sonGiris: new Date().toISOString() } });
    return res.json({ success: true, token, aday: adayGorunumu(a) });
  } catch (e) {
    console.error('[aday] giriş:', e && e.message);
    return res.status(500).json({ error: 'Giriş yapılamadı.' });
  }
});

// Express 4 async hatayı kendisi yakalamaz; yakalanmayan ret süreci
// düşürebilir. try/catch'siz uçlar bununla sarılır.
const sar = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((e) => {
    console.error('[aday]', e && e.message);
    if (!res.headersSent) res.status(500).json({ error: 'Sunucu hatası.' });
  });

function adayMi(req, res, next) {
  if (!req.user || !req.user.aday) return res.status(403).json({ error: 'Yalnız aday hesabı.' });
  return next();
}

router.get(
  '/ben',
  requireAuth,
  adayMi,
  sar(async (req, res) => {
    const db = await getDbSafe();
    const a = await db.collection(ADAYLAR).findOne({ adayNo: metin(req.user.identifier) });
    if (!a || a.durum !== 'aktif')
      return res.status(404).json({ error: 'Aday hesabı bulunamadı.' });
    return res.json({ aday: adayGorunumu(a) });
  })
);

router.post(
  '/sifre-degistir',
  requireAuth,
  adayMi,
  sar(async (req, res) => {
    const { eski, yeni } = req.body || {};
    const anahtar = 'sifre:' + metin(req.user.identifier);
    if (sinirAsildiMi(anahtar, 5)) {
      return res.status(429).json({ error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' });
    }
    const K = await kural();
    const h = K.adayKayitHatalari({ sifre: yeni });
    if (h.sifre) return res.status(400).json({ error: h.sifre });
    const db = await getDbSafe();
    const a = await db.collection(ADAYLAR).findOne({ adayNo: metin(req.user.identifier) });
    if (!a || typeof eski !== 'string' || !(await bcrypt.compare(eski, a.sifreHash || ''))) {
      denemeYaz(anahtar);
      return res.json({ success: false, error: 'Mevcut şifre hatalı.' });
    }
    await db.collection(ADAYLAR).updateOne(
      { _id: a._id },
      {
        $set: {
          sifreHash: await bcrypt.hash(String(yeni), BCRYPT_TURU),
          sifreDegistirmeli: false,
          updatedAt: new Date(),
        },
      }
    );
    // Eski jetonlar geçersiz; bu cihaza yeni oturum (server/lib/oturum-iptal.js).
    await oturumIptal.iptalEt(db, 'aday:' + a.adayNo);
    oturumAc(res, a);
    return res.json({ success: true });
  })
);

// ══════════════════════════════════════════════
// Personel uçları
// ══════════════════════════════════════════════

// Personelin aday işlerinde hangi bölümlere bakabileceği.
// { hepsi: true } ya da { bolumler: Set }.
async function personelKapsami(db, user) {
  // Okuma alanı (listeyi kim görür) ve yönetim alanı (şifre sıfırlama, dönem)
  // TEK kuraldan gelir: server/lib/yetki-alani.js. Bölüm kimlikleri orada
  // varyantlarıyla (slug / ObjectId / eski kimlik) karşılaştırılır.
  if (!user || user.role === 'student') return null;
  if (!['admin', 'professor', 'bolum_yetkilisi'].includes(user.role)) return null;
  let profil = null;
  if (user.role === 'professor') {
    profil = await profilBul(db, user.identifier);
    if (!profil) return null;
  }
  const flags = {
    admin: user.role === 'admin',
    uniAdmin: !!(profil && profil.isUniversityAdmin),
    facManager: !!(profil && profil.isFacultyManager),
    deptManager: !!(profil && profil.isDeptManager),
  };
  const bolumler = await db.collection('departments').find({}).toArray();
  const okuma = yetkiAlani({ user, flags, profil, bolumler, okuma: true });
  const yonetim = yetkiAlani({ user, flags, profil, bolumler });
  return {
    okuma,
    yonetim,
    sistem: flags.admin,
    uniAdmin: flags.uniAdmin,
  };
}

// Adayın ilgilendirdiği bölümler: hesaptaki bölüm + başvurularının bölümleri.
async function adayBolumleri(db, a) {
  const set = new Set([metin(a.departmentId)]);
  const [y, m] = await Promise.all([
    db
      .collection('yatay_gecis_basvurular')
      .find({ ogrenciNo: a.adayNo }, { projection: { basvurduguBolumId: 1, departmentId: 1 } })
      .toArray(),
    db
      .collection('muafiyet_records')
      .find({ studentNo: a.adayNo }, { projection: { departmentId: 1 } })
      .toArray(),
  ]);
  y.concat(m).forEach((r) => {
    if (metin(r.basvurduguBolumId)) set.add(metin(r.basvurduguBolumId));
    if (metin(r.departmentId)) set.add(metin(r.departmentId));
  });
  set.delete('');
  return set;
}

const kapsamdaMi = (kapsam, bolumler) =>
  !!kapsam && [...bolumler].some((b) => bolumAlanda(kapsam.okuma, b));
// Bölüm yetkilisi ve üstü mü (bu adayın bölümlerinden birinde)?
const yonetimdeMi = (kapsam, bolumler) =>
  !!kapsam && [...bolumler].some((b) => bolumAlanda(kapsam.yonetim, b));

async function personelAdayi(req, res) {
  const db = await getDbSafe();
  const kapsam = await personelKapsami(db, req.user);
  if (!kapsam) {
    res.status(403).json({ error: 'Yetkiniz yok.' });
    return null;
  }
  const adayNo = metin(req.body && req.body.adayNo);
  const a = adayNoMu(adayNo) ? await db.collection(ADAYLAR).findOne({ adayNo }) : null;
  if (!a) {
    res.status(404).json({ error: 'Aday bulunamadı.' });
    return null;
  }
  const bolumler = await adayBolumleri(db, a);
  if (!kapsamdaMi(kapsam, bolumler)) {
    res.status(403).json({ error: 'Bu aday sizin bölümünüze başvurmamış.' });
    return null;
  }
  return { db, a, kapsam, bolumler };
}

router.get('/liste', requireAuth, async (req, res) => {
  try {
    const db = await getDbSafe();
    const kapsam = await personelKapsami(db, req.user);
    if (!kapsam) return res.status(403).json({ error: 'Yetkiniz yok.' });
    const istenen = metin(req.query.bolum);
    const tum = await db.collection(ADAYLAR).find({}).sort({ createdAt: -1 }).limit(2000).toArray();
    const liste = [];
    const K = await kural();
    for (const a of tum) {
      const bolumler = await adayBolumleri(db, a);
      if (!kapsamdaMi(kapsam, bolumler)) continue;
      if (istenen && !bolumler.has(istenen)) continue;
      liste.push({
        ...adayGorunumu(a),
        bolumler: [...bolumler],
        silinme: K.adaySilmeTarihi(a, await silmeBaglami(db, a, bolumler)),
        yetki: { sifirlama: yonetimdeMi(kapsam, bolumler) },
      });
    }
    return res.json({ adaylar: liste });
  } catch (e) {
    console.error('[aday] liste:', e && e.message);
    return res.status(500).json({ error: 'Adaylar okunamadı.' });
  }
});

// ══════════════════════════════════════════════
// Başvuru dönemleri (fakülte başına, tür başına)
// ══════════════════════════════════════════════
async function bolumunFakultesi(db, bolumId) {
  const b = await bolumBul(db, bolumId);
  return b ? metin(b.facultyId) : '';
}

async function fakulteDonemi(db, facultyId) {
  if (!facultyId) return {};
  const d = await db.collection(DONEMLER).findOne({ _id: facultyId });
  return (d && d.donemler) || {};
}

// Kimliksiz: kayıt formu ve aday ekranı "tarihler uygun mu" uyarısı için.
router.get('/donem', async (req, res) => {
  try {
    const db = await getDbSafe();
    const facultyId = await bolumunFakultesi(db, req.query.bolum);
    return res.json({ facultyId, donemler: await fakulteDonemi(db, facultyId) });
  } catch (e) {
    console.error('[aday] dönem:', e && e.message);
    return res.status(500).json({ error: 'Başvuru dönemi okunamadı.' });
  }
});

// Fakülte kimliğiyle (Fakülte Yönetimi ekranı).
router.get('/donem-fakulte', requireAuth, async (req, res) => {
  try {
    const db = await getDbSafe();
    const facultyId = metin(req.query.facultyId);
    return res.json({ facultyId, donemler: await fakulteDonemi(db, facultyId) });
  } catch (e) {
    console.error('[aday] dönem:', e && e.message);
    return res.status(500).json({ error: 'Başvuru dönemi okunamadı.' });
  }
});

// Fakülte yetkilisi (ve üniversite yetkilisi / sistem yöneticisi) yazar.
async function donemYetkisi(db, user, facultyId) {
  const k = await personelKapsami(db, user);
  if (!k) return false;
  return fakulteAlanda(k.yonetim, facultyId) && k.yonetim.tur !== 'bolum';
}

router.post('/donemler', requireAuth, async (req, res) => {
  try {
    const db = await getDbSafe();
    const facultyId = metin(req.body && req.body.facultyId);
    if (!facultyId) return res.status(400).json({ error: 'Fakülte gerekli.' });
    if (!(await donemYetkisi(db, req.user, facultyId))) {
      return res
        .status(403)
        .json({ error: 'Başvuru tarihlerini yalnız fakülte yetkilisi belirler.' });
    }
    const K = await kural();
    const hatalar = K.donemHatalari(req.body.donemler);
    if (Object.keys(hatalar).length) {
      return res.status(400).json({ error: Object.values(hatalar)[0], hatalar });
    }
    const donemler = K.donemleriSadele(req.body.donemler);
    await db.collection(DONEMLER).updateOne(
      { _id: facultyId },
      {
        $set: {
          facultyId,
          donemler,
          guncelleyen: metin(req.user.identifier || req.user.role),
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
    return res.json({ success: true, donemler });
  } catch (e) {
    console.error('[aday] dönem yazma:', e && e.message);
    return res.status(500).json({ error: 'Başvuru tarihleri kaydedilemedi.' });
  }
});

// ══════════════════════════════════════════════
// Otomatik silme (kural: lib/aday-hesap.js → adaySilmeTarihi)
// ══════════════════════════════════════════════
async function silmeBaglami(db, a, bolumler) {
  const bolumSet = bolumler || (await adayBolumleri(db, a));
  const fakulteler = new Set();
  for (const b of bolumSet) {
    const f = await bolumunFakultesi(db, b);
    if (f) fakulteler.add(f);
  }
  const donemler = [];
  for (const f of fakulteler) donemler.push(await fakulteDonemi(db, f));
  const [yatay, dikey] = await Promise.all([
    db.collection('yatay_gecis_basvurular').find({ ogrenciNo: a.adayNo }).toArray(),
    db.collection('muafiyet_records').find({ studentNo: a.adayNo }).toArray(),
  ]);
  return { donemler, yatay, dikey };
}

function dosyaSil(goreli) {
  const yol = path.resolve(path.join(UPLOAD_KOK, metin(goreli)));
  if (!yol.startsWith(UPLOAD_KOK + path.sep)) return false;
  try {
    fs.unlinkSync(yol);
    return true;
  } catch (_e) {
    return false;
  }
}

// Adayın BÜTÜN verisi: hesap, başvurular, talepler, bildirimler, belgeler.
// Geriye yalnız kimliksiz bir iz kalır (ne zaman, hangi gerekçeyle, kaç kayıt).
async function adayVerisiniSil(db, a, sebep) {
  const no = a.adayNo;
  const dosyalar = await db.collection('dosya_yukleyenler').find({ yukleyen: no }).toArray();
  let silinenDosya = 0;
  dosyalar.forEach((d) => {
    if (dosyaSil(d._id)) silinenDosya++;
  });
  const sil = async (kol, f) => {
    const r = await db.collection(kol).deleteMany(f);
    return (r && r.deletedCount) || 0;
  };
  const rapor = {
    yatay: await sil('yatay_gecis_basvurular', { ogrenciNo: no }),
    dikey: await sil('muafiyet_records', { studentNo: no }),
    bildirim:
      (await sil('notifications', { recipientType: 'user', recipientId: no })) +
      (await sil('student_notifications', { studentNumber: no })),
    dosya: silinenDosya,
  };
  await sil('dosya_yukleyenler', { yukleyen: no });
  await db.collection(ADAYLAR).deleteOne({ _id: a._id });
  aktifOnbellek.delete(no);
  await db
    .collection('audit_logs')
    .insertOne({ kind: 'aday_veri_silme', at: new Date(), adayNo: no, sebep, rapor })
    .catch(() => {});
  return rapor;
}

/**
 * Süresi dolan adayların verisini siler. Sunucu açılışında ve periyodik
 * olarak çağrılır (server/index.js).
 * @param {object} [secenek] { bugun: 'YYYY-AA-GG' } (deneme için)
 */
async function adayTemizligi(secenek) {
  const db = await getDbSafe();
  const K = await kural();
  const bugun = (secenek && secenek.bugun) || K.bugunTr();
  const adaylar = await db
    .collection(ADAYLAR)
    .find({ durum: { $in: ['aktif', 'kapali'] } })
    .toArray();
  const silinen = [];
  for (const a of adaylar) {
    const baglam = await silmeBaglami(db, a);
    const karar = K.adaySilmeTarihi(a, baglam);
    if (karar.tarih && bugun >= karar.tarih) {
      silinen.push({ adayNo: a.adayNo, ...(await adayVerisiniSil(db, a, karar.sebep)) });
    }
  }
  if (silinen.length) console.info('[aday] süresi dolan aday verisi silindi:', silinen.length);
  return { bugun, silinen };
}

// Elle tetikleme (sistem yöneticisi / üniversite yetkilisi). `bugun` yalnız
// üretim dışında kabul edilir — denemede ileri tarih verilebilsin diye.
router.post('/temizlik', requireAuth, async (req, res) => {
  try {
    const db = await getDbSafe();
    const k = await personelKapsami(db, req.user);
    if (!k || !(k.sistem || k.uniAdmin)) return res.status(403).json({ error: 'Yetkiniz yok.' });
    const bugun =
      process.env.NODE_ENV !== 'production' &&
      /^\d{4}-\d{2}-\d{2}$/.test(metin(req.body && req.body.bugun))
        ? metin(req.body.bugun)
        : undefined;
    return res.json(await adayTemizligi({ bugun }));
  } catch (e) {
    console.error('[aday] temizlik:', e && e.message);
    return res.status(500).json({ error: 'Temizlik çalıştırılamadı.' });
  }
});

router.post('/numara-ayir', requireAuth, async (req, res) => {
  try {
    const db = await getDbSafe();
    if (!(await personelKapsami(db, req.user)))
      return res.status(403).json({ error: 'Yetkiniz yok.' });
    return res.json({ adayNo: await yeniAdayNo(db) });
  } catch (e) {
    console.error('[aday] numara:', e && e.message);
    return res.status(500).json({ error: 'Numara üretilemedi.' });
  }
});

router.post('/sifre-sifirla', requireAuth, async (req, res) => {
  try {
    const bulunan = await personelAdayi(req, res);
    if (!bulunan) return;
    const { db, a, kapsam, bolumler } = bulunan;
    // Şifreyi yalnız bölüm yetkilisi (ve üstü) sıfırlar: geçici şifreyi
    // alan kişi adayın hesabına girebilir.
    if (!yonetimdeMi(kapsam, bolumler)) {
      return res
        .status(403)
        .json({ error: 'Aday şifresini yalnız bölüm yetkilisi sıfırlayabilir.' });
    }
    // Karışmayan karakterlerle 10 haneli geçici şifre (harf + rakam).
    const harfler = 'abcdefghjkmnpqrstuvwxyz';
    const rakamlar = '23456789';
    const tum = harfler + rakamlar;
    let gecici = harfler[crypto.randomInt(harfler.length)] + rakamlar[crypto.randomInt(8)];
    while (gecici.length < 10) gecici += tum[crypto.randomInt(tum.length)];
    await db.collection(ADAYLAR).updateOne(
      { _id: a._id },
      {
        $set: {
          sifreHash: await bcrypt.hash(gecici, BCRYPT_TURU),
          sifreDegistirmeli: true,
          sifirlayan: metin(req.user.identifier || req.user.role),
          updatedAt: new Date(),
        },
      }
    );
    // Sıfırlanan hesabın açık oturumları kapanır.
    await oturumIptal.iptalEt(db, 'aday:' + a.adayNo);
    return res.json({ success: true, geciciSifre: gecici });
  } catch (e) {
    console.error('[aday] sıfırlama:', e && e.message);
    return res.status(500).json({ error: 'Şifre sıfırlanamadı.' });
  }
});

router.post(
  '/kapat',
  requireAuth,
  sar(async (req, res) => {
    const bulunan = await personelAdayi(req, res);
    if (!bulunan) return;
    const { db, a, kapsam, bolumler } = bulunan;
    // Hesap kapatma yönetim işidir: sıradan akademisyen (okuma kapsamı)
    // adayın hesabını kapatamaz (şifre sıfırlamadaki kuralla aynı).
    if (!yonetimdeMi(kapsam, bolumler)) {
      return res.status(403).json({ error: 'Aday hesabını yalnız bölüm yetkilisi kapatabilir.' });
    }
    await db.collection(ADAYLAR).updateOne(
      { _id: a._id },
      {
        $set: {
          durum: 'kapali',
          kapatan: metin(req.user.identifier || req.user.role),
          // Otomatik silme takviminin referansı (lib/aday-hesap.js).
          kapatmaZamani: new Date().toISOString(),
          updatedAt: new Date(),
        },
      }
    );
    aktifOnbellek.delete(a.adayNo);
    return res.json({ success: true });
  })
);

// Kesin kayıt: adayın bütün kayıtları gerçek öğrenci numarasına taşınır ve
// aday hesabı kapanır. Sahiplik alanları (_owner) da taşınır; taşınmasaydı
// öğrenci kendi başvurusunu güncelleyemezdi (sahibi ADAY-… görünürdü).
router.post('/numara-aktar', requireAuth, async (req, res) => {
  try {
    const bulunan = await personelAdayi(req, res);
    if (!bulunan) return;
    const { db, a, kapsam, bolumler } = bulunan;
    // Numara aktarma adayın başvurularını ve belgelerini o numaraya taşır:
    // yalnız bölüm yetkilisi yapar.
    if (!yonetimdeMi(kapsam, bolumler)) {
      return res
        .status(403)
        .json({ error: 'Aday kayıtlarını öğrenci numarasına yalnız bölüm yetkilisi aktarabilir.' });
    }
    const no = metin(req.body && req.body.ogrenciNo);
    if (!/^\d{9}$/.test(no)) {
      return res.status(400).json({ error: 'Öğrenci numarası 9 haneli olmalı.' });
    }
    if (a.durum === 'aktarildi') {
      return res
        .status(409)
        .json({ error: 'Bu aday zaten ' + a.ogrenciNo + ' numarasına aktarıldı.' });
    }
    const eski = a.adayNo;
    const sayi = {};
    const tasi = async (kol, filtre, set, sayilmasin) => {
      const r = await db.collection(kol).updateMany(filtre, { $set: set });
      if (!sayilmasin) sayi[kol] = (r && (r.modifiedCount || r.matchedCount)) || 0;
    };
    await tasi(
      'yatay_gecis_basvurular',
      { ogrenciNo: eski },
      { ogrenciNo: no, vekaleten: false, adayNo: eski }
    );
    await tasi('yatay_gecis_basvurular', { _owner: eski }, { _owner: no }, true);
    await tasi('muafiyet_records', { studentNo: eski }, { studentNo: no, adayNo: eski });
    await tasi('muafiyet_records', { _owner: eski }, { _owner: no }, true);
    await tasi('notifications', { recipientType: 'user', recipientId: eski }, { recipientId: no });
    await tasi('student_notifications', { studentNumber: eski }, { studentNumber: no });
    await tasi('dosya_yukleyenler', { yukleyen: eski }, { yukleyen: no });
    await db.collection(ADAYLAR).updateOne(
      { _id: a._id },
      {
        $set: {
          durum: 'aktarildi',
          ogrenciNo: no,
          aktaran: metin(req.user.identifier || req.user.role),
          aktarimZamani: new Date().toISOString(),
          updatedAt: new Date(),
        },
      }
    );
    aktifOnbellek.delete(eski);
    try {
      const io = req.app && req.app.get && req.app.get('io');
      if (io) {
        io.emit('db:write', {
          collections: ['yatay_gecis_basvurular', 'muafiyet_records', 'notifications'],
          at: new Date().toISOString(),
        });
      }
    } catch (_e) {
      /* gerçek zaman isteğe bağlı */
    }
    return res.json({ success: true, tasinan: sayi });
  } catch (e) {
    console.error('[aday] aktarım:', e && e.message);
    return res.status(500).json({ error: 'Aktarım yapılamadı.' });
  }
});

module.exports = router;
module.exports.tcOzeti = tcOzeti;
module.exports.adayTemizligi = adayTemizligi;

// Oturumu süren adayın hesabı hâlâ açık mı? Hesap kapatıldıysa, numaraya
// aktarıldıysa ya da süresi dolup silindiyse eski jetonla (24 saat geçerli)
// yazma yapılamamalı. Kısa önbellek: her yazmada sorgu atılmasın.
const aktifOnbellek = new Map();
async function adayAktifMi(adayNo) {
  const no = metin(adayNo);
  const hit = aktifOnbellek.get(no);
  if (hit && Date.now() - hit.ts < 30 * 1000) return hit.aktif;
  const db = await getDbSafe();
  const a = await db.collection(ADAYLAR).findOne({ adayNo: no }, { projection: { durum: 1 } });
  const aktif = !!a && a.durum === 'aktif';
  aktifOnbellek.set(no, { aktif, ts: Date.now() });
  if (aktifOnbellek.size > 5000) aktifOnbellek.clear();
  return aktif;
}
module.exports.adayAktifMi = adayAktifMi;
module.exports.adayAktifOnbellekSil = (no) => aktifOnbellek.delete(metin(no));
