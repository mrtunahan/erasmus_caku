/**
 * BİLDİRİM ZİLİ — navbar zilinin sunucu uçları.
 *
 *   GET  /api/bildirim            → bu kişinin bildirimleri (okundu bilgisiyle)
 *   POST /api/bildirim/okundu     → { ids: [...] } ya da { hepsi: true }
 *   POST /api/bildirim/sil        → { ids: [...] } ya da { hepsi: true }
 *
 * ⚠ NEDEN GENEL /api/db DEĞİL? Zil bütün koleksiyonu istemciye çekip
 * süzüyordu; silme kaydı doğrudan siliyordu (bölüme giden yayını bir kişi
 * silince bütün bölümden gidiyordu) ve öğrenci `notifications`a yazamadığı
 * için öğrenci tarafında okundu/sil hiç çalışmıyordu. Kural:
 * server/lib/bildirim-zil.js.
 *
 * ⚠ KAYNAK EŞİTLEMESİ. Staj, öğrenci ve portal bildirimlerinin modül içinde
 * kendi listeleri var. Zilde okunan/silinen bildirim kaynağında da okunur/
 * silinir; tersini (modülde okunan zilde) routes/db.js yazma yolu yapar.
 */

const express = require('express');
const { ObjectId } = require('mongodb');
const { getDbSafe } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { profilBul } = require('../lib/akademisyen-kimlik');
const { kapsamNumaralari } = require('../lib/ogrenci-baglanti');
const { bolumKimlikHaritasi, bolumVaryantlari } = require('../lib/bolum-kimlik');
const {
  zilKimligi,
  bildirimBenimMi,
  gizliMi,
  silmeTuru,
  kaynakHedefi,
  kaynakSilinirMi,
  zilGorunumu,
} = require('../lib/bildirim-zil');

let unvanSozu = null;
const unvanKurali = () => (unvanSozu = unvanSozu || import('../../lib/akademik-unvan.js'));
let yayinSozu = null;
const yayinKurali = () => (yayinSozu = yayinSozu || import('../../lib/yayin-kapsami.js'));

const router = express.Router();
const metin = (v) => String(v == null ? '' : v).trim();
const LISTE_TAVANI = 300;

/** Kayıt kimliği: string _id, ObjectId _id ya da eski _docId. */
function idSorgusu(id) {
  const v = metin(id);
  const kosul = [{ _id: v }, { _docId: v }];
  if (/^[0-9a-f]{24}$/i.test(v)) {
    try {
      kosul.push({ _id: new ObjectId(v) });
    } catch (_e) {
      /* geçersiz ObjectId: diğer koşullar yeter */
    }
  }
  return { $or: kosul };
}
const kayitIdsi = (d) => metin(d && (d._docId || (d._id && d._id.toString())));

async function kimlikCoz(db, user, istenenBolum) {
  const { unvansizAd } = await unvanKurali();
  const sadele = (v) => metin(unvansizAd(v)).toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
  // Aday yalnız KENDİSİNE giden bildirimi görür: bölüm duyurusu, öğrencilere
  // anket ataması gibi yayınlar öğrenciler içindir (bkz. server/lib/aday-yetki.js).
  if (user.aday) {
    return zilKimligi({
      user: { role: 'aday', identifier: user.identifier },
      bolumler: [],
      numaralar: [metin(user.identifier)],
      sadele,
    });
  }
  const bolumler = new Set();
  let numaralar = [];
  if (user.departmentId) bolumler.add(metin(user.departmentId));
  if (user.role === 'student') {
    const no = metin(user.identifier);
    try {
      const ogr = await db.collection('students').findOne({ studentNumber: no });
      (ogr && Array.isArray(ogr.additionalDepartments) ? ogr.additionalDepartments : []).forEach(
        (b) => bolumler.add(metin(b))
      );
      if (ogr && ogr.departmentId) bolumler.add(metin(ogr.departmentId));
      const bagli = await db
        .collection('students')
        .find(
          { bagliOgrenciNolar: { $exists: true, $ne: [] } },
          { projection: { studentNumber: 1, bagliOgrenciNolar: 1 } }
        )
        .toArray();
      numaralar = kapsamNumaralari(bagli, no);
    } catch (_e) {
      numaralar = [no];
    }
  } else {
    // Personel: profildeki bölümler + ekranda seçili bölüm (bölüm yetkilisi
    // ve üst yöneticiler bölüm değiştirerek çalışır; eski zil de seçili
    // bölümün yayınını gösteriyordu).
    if (user.role === 'professor') {
      try {
        const p = await profilBul(db, user.identifier);
        if (p && p.departmentId) bolumler.add(metin(p.departmentId));
        (p && Array.isArray(p.additionalDepartments) ? p.additionalDepartments : []).forEach((b) =>
          bolumler.add(metin(b))
        );
      } catch (_e) {
        /* profil yoksa yalnız seçili bölüm */
      }
    }
    if (metin(istenenBolum)) bolumler.add(metin(istenenBolum));
  }
  bolumler.delete('');
  // Aynı bölüm slug, ObjectId ya da eski kimlikle yazılmış olabilir; yayın
  // hangi biçimle gönderildiyse eşleşsin (server/lib/bolum-kimlik.js).
  try {
    const harita = bolumKimlikHaritasi(await db.collection('departments').find({}).toArray());
    [...bolumler].forEach((b) => bolumVaryantlari(harita, b).forEach((v) => bolumler.add(v)));
  } catch (_e) {
    /* bölüm listesi okunamazsa ham kimliklerle devam */
  }
  return zilKimligi({ user, bolumler: [...bolumler], numaralar, sadele });
}

async function benimBildirimlerim(db, k) {
  const { yayinKapsamdaMi } = await yayinKurali();
  const kapsamdaMi = (hedef, bolumler) =>
    yayinKapsamdaMi(hedef, { departmentId: bolumler[0] || '', additionalDepartments: bolumler });
  const tum = await db
    .collection('notifications')
    .find({})
    .sort({ createdAt: -1 })
    .limit(5000)
    .toArray();
  return tum.filter((n) => bildirimBenimMi(n, k, { kapsamdaMi }) && !gizliMi(n, k));
}

function yayinla(req, koleksiyonlar) {
  try {
    const io = req.app && req.app.get && req.app.get('io');
    if (io && koleksiyonlar.size)
      io.emit('db:write', { collections: [...koleksiyonlar], at: new Date().toISOString() });
  } catch (_e) {
    /* gerçek zaman isteğe bağlı */
  }
}

// İstenen kayıtlar — YALNIZ bu kişinin zilindekiler. Başkasının bildirimini
// kimliğini bilerek okundu/sil yapmak mümkün olmamalı.
async function hedefKayitlar(db, k, govde) {
  const benim = await benimBildirimlerim(db, k);
  if (govde && govde.hepsi === true) return benim;
  const ids = new Set((Array.isArray(govde && govde.ids) ? govde.ids : []).map(metin));
  return benim.filter((n) => ids.has(kayitIdsi(n)));
}

async function kaynagiOkunduYap(db, n, k, dokunulan) {
  const h = kaynakHedefi(n);
  if (!h) return;
  const col = db.collection(h.koleksiyon);
  const kaynak = await col.findOne(idSorgusu(h.id));
  if (!kaynak) return;
  if (h.kaynak === 'internship_notifications') {
    await col.updateOne({ _id: kaynak._id }, { $addToSet: { readBy: k.anahtar } });
  } else if (h.kaynak === 'student_notifications') {
    // Öğrenci bildirimi tek kişiliktir; başkası okudu diye sahibinde
    // okunmuş görünmemeli.
    if (!k.hamAnahtarlar.has(metin(kaynak.studentNumber))) return;
    await col.updateOne({ _id: kaynak._id }, { $set: { read: true } });
  } else {
    await col.updateOne({ _id: kaynak._id }, { $set: { read: true } });
  }
  dokunulan.add(h.kaynak === 'portal_notifications' ? 'portal_notifications_items' : h.kaynak);
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const db = await getDbSafe();
    const k = await kimlikCoz(db, req.user || {}, req.query.bolum);
    const liste = (await benimBildirimlerim(db, k))
      .map((n) => zilGorunumu(n, k))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, LISTE_TAVANI);
    return res.json({ bildirimler: liste, okunmamis: liste.filter((n) => !n.okundu).length });
  } catch (e) {
    console.error('[bildirim]', e && e.message);
    return res.status(500).json({ error: 'Bildirimler okunamadı.' });
  }
});

router.post('/okundu', requireAuth, async (req, res) => {
  try {
    const db = await getDbSafe();
    const k = await kimlikCoz(db, req.user || {}, req.body && req.body.bolum);
    const kayitlar = await hedefKayitlar(db, k, req.body);
    const dokunulan = new Set(['notifications']);
    for (const n of kayitlar) {
      await db
        .collection('notifications')
        .updateOne({ _id: n._id }, { $addToSet: { readBy: k.anahtar } });
      await kaynagiOkunduYap(db, n, k, dokunulan);
    }
    yayinla(req, dokunulan);
    return res.json({ ok: true, sayi: kayitlar.length });
  } catch (e) {
    console.error('[bildirim]', e && e.message);
    return res.status(500).json({ error: 'Okundu işaretlenemedi.' });
  }
});

router.post('/sil', requireAuth, async (req, res) => {
  try {
    const db = await getDbSafe();
    const k = await kimlikCoz(db, req.user || {}, req.body && req.body.bolum);
    const kayitlar = await hedefKayitlar(db, k, req.body);
    const dokunulan = new Set(['notifications']);
    let silinen = 0;
    let gizlenen = 0;
    for (const n of kayitlar) {
      if (silmeTuru(n) === 'gizle') {
        await db
          .collection('notifications')
          .updateOne({ _id: n._id }, { $addToSet: { gizleyenler: k.anahtar } });
        gizlenen++;
        await kaynagiOkunduYap(db, n, k, dokunulan);
        continue;
      }
      await db.collection('notifications').deleteOne({ _id: n._id });
      silinen++;
      const h = kaynakHedefi(n);
      if (!h) continue;
      const col = db.collection(h.koleksiyon);
      const kaynak = await col.findOne(idSorgusu(h.id));
      if (!kaynak) continue;
      if (kaynakSilinirMi(n, kaynak, k)) {
        await col.deleteOne({ _id: kaynak._id });
        dokunulan.add(h.koleksiyon === 'portal_notifications_items' ? h.koleksiyon : h.kaynak);
      } else {
        await kaynagiOkunduYap(db, n, k, dokunulan);
      }
    }
    yayinla(req, dokunulan);
    return res.json({ ok: true, silinen, gizlenen });
  } catch (e) {
    console.error('[bildirim]', e && e.message);
    return res.status(500).json({ error: 'Bildirim silinemedi.' });
  }
});

// ══════════════════════════════════════════════════════════════
// TOPLU BİLDİRİM — POST /api/bildirim/toplu
//
// "Bölümün öğrencileri" ve "dersin öğrencileri"ne giden bildirimler eskiden
// TARAYICIDAN, öğrenci başına AYRI bir yazma isteğiyle gönderiliyordu:
//   • 1000 öğrencili bölümde 1000 istek; kişi başı yazma sınırı dakikada
//     120 olduğu için bildirimlerin çoğu sessizce düşüyor, gönderenin diğer
//     işlemleri de bir dakika bloke oluyordu.
//   • Ders öğrencilerini bulan kod tanımsız bir eski arayüze bağlıydı;
//     "yeni proje grubu açıldı" bildirimi HİÇ gitmiyordu.
// Alıcılar artık sunucuda çözülür, kayıtlar tek seferde yazılır:
//   student_notifications (Benim Sayfam listesi) + notifications (zil).
//
// Gövde: { hedef: 'bolum' | 'ders', departmentId, dersKodu?, haric?,
//          title, message, type?, link?, meta? }
// Yetki: personel (öğrenci değil); 'bolum' hedefi için ayrıca portal
// moderatörü öğrenci.
// ══════════════════════════════════════════════════════════════
const TOPLU_UST_SINIR = 20000;
const { dersListesi } = require('../lib/ders-ogrencileri');

async function portalModeratoruMu(db, user) {
  const adaylar = [user.identifier, user.email, user.name].map(metin).filter(Boolean);
  try {
    if (user.role === 'student') {
      const no = metin(user.identifier);
      const s = await db
        .collection('students')
        .findOne({ studentNumber: { $in: [no, Number(no)] } });
      if (s) {
        adaylar.push(
          metin(s.email),
          metin(s.name),
          metin([s.firstName, s.lastName].filter(Boolean).join(' '))
        );
      }
    }
    const kimlikler = [...new Set(adaylar.filter(Boolean))];
    if (!kimlikler.length) return false;
    const m = await db
      .collection('portal_moderators')
      .findOne({ $or: [{ _docId: { $in: kimlikler } }, { userId: { $in: kimlikler } }] });
    return !!m;
  } catch (_) {
    return false;
  }
}

router.post('/toplu', requireAuth, async (req, res) => {
  try {
    const user = req.user || {};
    const b = req.body || {};
    const hedef = metin(b.hedef);
    const bolum = metin(b.departmentId);
    if (hedef !== 'bolum' && hedef !== 'ders') {
      return res.status(400).json({ error: 'Geçersiz hedef.' });
    }
    if (user.aday) return res.status(403).json({ error: 'Aday toplu bildirim gönderemez.' });
    const db = await getDbSafe();
    if (user.role === 'student') {
      const izin = hedef === 'bolum' && (await portalModeratoruMu(db, user));
      if (!izin) return res.status(403).json({ error: 'Toplu bildirimi öğrenci gönderemez.' });
    }
    const title = metin(b.title).slice(0, 200);
    const message = metin(b.message).slice(0, 1000);
    if (!title && !message) return res.status(400).json({ error: 'Bildirim metni boş.' });

    // Bölümün bütün kimlik biçimleri (slug, ObjectId, kod, eski kimlik).
    const depts = await db.collection('departments').find({}).toArray();
    const harita = bolumKimlikHaritasi(depts);
    const bolumler = bolum ? bolumVaryantlari(harita, bolum) : [];

    let nolar = [];
    if (hedef === 'bolum') {
      if (!bolumler.length) return res.status(400).json({ error: 'Bölüm belirtilmedi.' });
      const ogr = await db
        .collection('students')
        .find({ departmentId: { $in: bolumler } }, { projection: { studentNumber: 1 } })
        .limit(TOPLU_UST_SINIR)
        .toArray();
      nolar = ogr.map((o) => metin(o.studentNumber));
    } else {
      const kod = metin(b.dersKodu).toLocaleUpperCase('tr-TR');
      if (!kod) return res.status(400).json({ error: 'Ders kodu belirtilmedi.' });
      const dersler = await db
        .collection('sinav_dersler')
        .find(bolumler.length ? { departmentId: { $in: bolumler } } : {})
        .toArray();
      const idler = dersler
        .filter((d) => metin(d.code).toLocaleUpperCase('tr-TR') === kod)
        .map((d) => metin(d._docId || (d._id && d._id.toString())))
        .filter(Boolean);
      const kume = new Set();
      for (const id of idler) (await dersListesi(db, id)).forEach((n) => kume.add(n));
      nolar = [...kume];
    }
    const haric = metin(b.haric);
    nolar = [...new Set(nolar.filter((n) => n && n !== haric))];
    if (!nolar.length) return res.json({ ok: true, gonderilen: 0 });

    const simdi = new Date().toISOString();
    const tur = metin(b.type).slice(0, 60) || 'bilgi';
    const link = metin(b.link).slice(0, 60);
    const meta = b.meta && typeof b.meta === 'object' ? b.meta : {};
    const gonderen = metin(user.name || user.identifier);
    await db.collection('student_notifications').insertMany(
      nolar.map((no) => ({
        studentNumber: no,
        type: tur,
        title,
        message,
        link,
        ...meta,
        gonderen,
        read: false,
        createdAt: simdi,
      }))
    );
    await db.collection('notifications').insertMany(
      nolar.map((no) => ({
        recipientType: 'user',
        recipientId: no,
        module: metin(b.module).slice(0, 40) || 'sistem',
        type: tur,
        title: title || 'Bildirim',
        body: message,
        link,
        meta: { kaynak: 'student_notifications', toplu: hedef },
        readBy: [],
        createdAt: simdi,
      }))
    );
    const io = req.app && req.app.get && req.app.get('io');
    if (io) {
      io.emit('db:write', { collections: ['notifications', 'student_notifications'], at: simdi });
    }
    return res.json({ ok: true, gonderilen: nolar.length });
  } catch (e) {
    console.error('[bildirim/toplu]', e && e.message);
    return res.status(500).json({ error: 'Toplu bildirim gönderilemedi.' });
  }
});

module.exports = router;
module.exports.idSorgusu = idSorgusu;
