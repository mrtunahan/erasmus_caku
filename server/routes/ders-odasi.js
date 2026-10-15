// ══════════════════════════════════════════════════════════════
// DERS ODALARI — /api/oda
//
// Kurallar lib/ders-odasi.js'te (saf, testli). Bu dosya yalnız yetkiyi,
// veritabanını, dosyaları ve bildirimleri yönetir.
//
// ── NİÇİN GENEL /api/db DEĞİL ──
// Odanın bütün güvenliği "kim bu odanın üyesi" sorusuna dayanır ve cevabı
// öğrencinin DÖNEM DERS SEÇİMİNDEN gelir. Genel veri kapısı bunu bilmez:
// öğrenci başkasının teslimini, notunu okuyabilir; son tarihi geçmiş ödeve
// teslim yazabilir; kendine not verebilirdi. Koleksiyonlar bu yüzden genel
// kapının izin listesinde YOKTUR; tek kapı burasıdır.
//
// Koleksiyonlar (türden bağımsız — ileride proje / staj odaları da kullanır):
//   ders_odalari    oda kaydı        _id = odaKimligi(tur, kaynakId, dönem)
//   oda_icerikleri  duyuru / ödev    _id = rastgele
//   oda_teslimleri  öğrenci teslimi  _id = icerikId + '__' + öğrenciNo
//   oda_yorumlari   paylaşım yorumu  _id = rastgele
//   oda_dosyalari   yüklenen dosya   _id = rastgele (dosya diskte)
// ══════════════════════════════════════════════════════════════

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { rateLimit } = require('express-rate-limit');
const { getDbSafe } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

let kuralSozu = null;
function kural() {
  if (!kuralSozu) kuralSozu = import('../../lib/ders-odasi.js');
  return kuralSozu;
}
let secimSozu = null;
function secimKurali() {
  if (!secimSozu) secimSozu = import('../../lib/ogrenci-ders-secimi.js');
  return secimSozu;
}
let egitmenSozu = null;
function egitmenKurali() {
  if (!egitmenSozu) egitmenSozu = import('../../lib/ders-egitmenleri.js');
  return egitmenSozu;
}

let akadProgramSozu = null;
function akademisyenProgramKurali() {
  if (!akadProgramSozu) akadProgramSozu = import('../../lib/akademisyen-programi.js');
  return akadProgramSozu;
}

let programSozu = null;
function programKurali() {
  if (!programSozu) {
    programSozu = Promise.all([
      import('../../lib/ders-slot.js'),
      import('../../lib/ders-saatleri.js'),
    ]);
  }
  return programSozu;
}

const ODALAR = 'ders_odalari';
const ICERIK = 'oda_icerikleri';
const TESLIM = 'oda_teslimleri';
const YORUM = 'oda_yorumlari';
const DOSYA = 'oda_dosyalari';
// Vize/final gibi ek not sütunlarının notları (ödev notları teslimde durur).
const EKNOT = 'oda_ek_notlar';
const KOLEKSIYONLAR = [ODALAR, ICERIK, TESLIM, YORUM, DOSYA, EKNOT];

const metin = (v) => String(v == null ? '' : v).trim();
const yeniId = () => crypto.randomBytes(9).toString('hex');
const DOSYA_MB = Number(process.env.ODA_DOSYA_MB) > 0 ? Number(process.env.ODA_DOSYA_MB) : 5;
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'ders_odalari');

const yazmaLimiti = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => 'oda:' + metin(req.user && req.user.identifier),
  validate: false,
  message: { error: 'Çok fazla istek. Biraz sonra tekrar deneyin.' },
});

const yukle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DOSYA_MB * 1024 * 1024, files: 1 },
});

function sar(fn) {
  return (req, res) =>
    Promise.resolve(fn(req, res)).catch((e) => {
      console.error('[oda]', e && e.message);
      if (!res.headersSent) res.status(500).json({ error: 'İşlem tamamlanamadı.' });
    });
}

function degisti(req) {
  try {
    const io = req.app && req.app.get && req.app.get('io');
    if (io) io.emit('db:write', { collections: KOLEKSIYONLAR, at: new Date().toISOString() });
  } catch (_) {
    /* gerçek zamanlı kritik değil */
  }
}

// ── KULLANICI ──
const ogrenciMi = (u) => !!u && u.role === 'student' && !u.aday;
const personelMi = (u) =>
  !!u && (u.role === 'professor' || u.role === 'bolum_yetkilisi' || u.role === 'admin');
const ogrenciNo = (u) => metin(u && (u.studentNumber || u.identifier));

// Yetkilinin alanı routes/db.js ile aynı kuraldan (bölüm / fakülte / üniversite).
async function yetkiliAlani(db, user) {
  try {
    const dbRouter = require('./db');
    if (typeof dbRouter.kullaniciAlani !== 'function') return null;
    // okuma=false: sade akademisyenin "kendi bölümü" okuma alanı burada SAYILMAZ —
    // aksi hâlde bölümdeki her hoca başka derslerin teslimlerini görürdü.
    return await dbRouter.kullaniciAlani(db, user, false);
  } catch (_) {
    return null;
  }
}
function bolumAlanda(alan, bolumId) {
  try {
    return require('../lib/yetki-alani').bolumAlanda(alan, bolumId);
  } catch (_) {
    return false;
  }
}

// ── DERS ──
const dersKimligi = (d) => metin(d && (d.id || d._docId || (d._id && d._id.toString())));

async function dersHocalari(ders) {
  if (!ders) return [];
  const E = await egitmenKurali();
  const liste = E.dersEgitmenleri(ders).concat(
    E.egitmenleriCoz(
      [].concat(ders.instructor || [], ders.instructors || [], ders.egitmenler || [])
    )
  );
  const out = [];
  liste.forEach((h) => {
    const v = metin(h);
    if (v && !out.some((x) => E.ayniEgitmen(x, v))) out.push(v);
  });
  return out;
}

// Dersin akademisyenlerinin iletişim bilgileri (Kişiler / Ders bilgisi
// kartında ada tıklanınca açılır). Yalnız öğrencinin zaten okuyabildiği
// alanlar döner (bkz. db.js STUDENT_READ_STRIPPED.professors): ad, unvan,
// e-posta, dahili, fotoğraf. Kayıt bulunamayan hoca yalnız adıyla gelir.
async function hocaIletisimleri(db, oda) {
  const hocalar = oda.hocalar || [];
  if (!hocalar.length) return [];
  const E = await egitmenKurali();
  const profiller = await db
    .collection('professors')
    .find({})
    .project({ name: 1, title: 1, unvan: 1, email: 1, dahili: 1, photoURL: 1 })
    .toArray()
    .catch(() => []);
  return hocalar.map((ad) => {
    const p = profiller.find((x) => metin(x.name) && E.ayniEgitmen(x.name, ad)) || {};
    return {
      ad,
      unvan: metin(p.unvan || p.title),
      email: metin(p.email),
      dahili: metin(p.dahili),
      photoURL: metin(p.photoURL),
    };
  });
}

async function hocaMi(oda, user) {
  if (!oda || !user) return false;
  const E = await egitmenKurali();
  return (oda.hocalar || []).some((h) => E.ayniEgitmen(h, user.identifier));
}

// ── ODA KARTI ÖZETİ (liste ekranı) ──
// Kartta: ödev / duyuru / öğrenci sayısı, haftalık ders saatleri, en yakın
// teslim, son paylaşım; öğrenciye kendi bekleyen ödev sayısı, akademisyene
// notlanmayı bekleyen teslim sayısı.
async function odaKartOzeti(db, oda, rol, user) {
  const K = await kural();
  const icerikler = await db
    .collection(ICERIK)
    .find({ odaId: oda._id })
    .project({
      tur: 1,
      baslik: 1,
      sonTarih: 1,
      olusturuldu: 1,
      ekler: 1,
      ekSureler: 1,
      kabulAcik: 1,
      gecKabul: 1,
    })
    .sort({ olusturuldu: -1 })
    .toArray();
  const odevler = icerikler.filter((i) => i.tur === 'odev');
  const simdi = Date.now();
  const yaklasan = odevler
    .filter((o) => o.sonTarih && new Date(o.sonTarih).getTime() > simdi)
    .sort((a, b) => (a.sonTarih < b.sonTarih ? -1 : 1))[0];
  const son = icerikler[0];
  const out = {
    odevSayisi: odevler.length,
    duyuruSayisi: icerikler.length - odevler.length,
    dosyaSayisi: icerikler.reduce((t, i) => t + (i.ekler || []).length, 0),
    ogrenciSayisi: (await odaOgrencileri(db, oda)).length,
    program: await odaProgrami(db, oda),
    yaklasan: yaklasan ? { baslik: metin(yaklasan.baslik), sonTarih: yaklasan.sonTarih } : null,
    sonPaylasim: son
      ? { tur: son.tur, baslik: metin(son.baslik), tarih: metin(son.olusturuldu) }
      : null,
  };
  const teslimler = await db.collection(TESLIM).find({ odaId: oda._id }).toArray();
  if (rol === 'ogrenci') {
    const no = ogrenciNo(user);
    const benim = new Map(
      teslimler.filter((t) => metin(t.ogrenciNo) === no).map((t) => [t.icerikId, t])
    );
    const durumlar = odevler.map((o) => K.teslimDurumu(o, benim.get(o._id), no));
    out.bekleyen = durumlar.filter((d) => d === 'atandi' || d === 'iade').length;
    out.eksik = durumlar.filter((d) => d === 'eksik').length;
    out.notlanan = durumlar.filter((d) => d === 'notlandi').length;
  } else {
    out.notBekleyen = teslimler.filter((t) => t.teslimEdildi && metin(t.puan) === '').length;
  }
  return out;
}

// ── ÜYELİK: DÖNEM DERS SEÇİMİ ──
// Öğrenci yalnız o dönemin ders seçiminde seçtiği dersin odasına girer.
// Seçim iki yerde olabilir (bkz. lib/ogrenci-ders-secimi.js): dönem bazlı
// `student_courses` ve eski `students.myCourseIds`. Eski liste dönemsizdir;
// yalnız İÇİNDE BULUNULAN dönemde ve o döneme ait yeni kayıt yoksa sayılır.
async function donemDersleri(db, no, donem) {
  const n = metin(no);
  if (!n) return [];
  const desen = n.replace(/[^A-Za-z0-9]/g, '');
  const kayitlar = await db
    .collection('student_courses')
    .find({ $or: [{ _docId: desen + '__' + donem }, { studentNumber: n, termKey: donem }] })
    .toArray()
    .catch(() => []);
  const set = new Set();
  kayitlar.forEach((k) => (k.courseIds || []).forEach((id) => metin(id) && set.add(metin(id))));
  const K = await kural();
  if (!kayitlar.length && donem === K.donemAnahtari()) {
    const ogr = await db
      .collection('students')
      .findOne({ studentNumber: n }, { projection: { myCourseIds: 1 } })
      .catch(() => null);
    ((ogr && ogr.myCourseIds) || []).forEach((id) => metin(id) && set.add(metin(id)));
  }
  return [...set];
}

// Ders kayıtlarını kimlik listesiyle bulur — `id`, `_docId` ve Mongo `_id`
// biçimlerinin hepsiyle (genel "add" ile yazılan derslerin yalnız `_id`'si var).
function dersSorgusu(idler) {
  const ids = [...new Set((idler || []).map(metin).filter(Boolean))];
  const oidler = ids.filter((x) => /^[0-9a-f]{24}$/i.test(x)).map((x) => new ObjectId(x));
  const kosul = [{ id: { $in: ids } }, { _docId: { $in: ids } }];
  if (oidler.length) kosul.push({ _id: { $in: oidler } });
  return { $or: kosul };
}

// eposta: true → öğrencinin kayıtlı e-postası da döner (yalnız akademisyen ve
// yetkilinin okuduğu Notlar/Kişiler listesi için; öğrenciye gitmez).
async function odaOgrencileri(db, oda, secenek) {
  const K = await kural();
  const S = await secimKurali();
  const dersIdleri = K.odaDersKimlikleri(oda);
  const donem = metin(oda.donem);
  // Eski tek-liste seçim (myCourseIds) yalnız içinde bulunulan dönemde sayılır.
  const eskiListe = donem === K.donemAnahtari();
  const secimler = await db
    .collection('student_courses')
    .find({ courseIds: { $in: dersIdleri } })
    .toArray()
    .catch(() => []);
  const secimNo = (k) => metin(k.studentNumber) || metin(k._docId).split('__')[0];
  const adaylar = [...new Set(secimler.map(secimNo).filter(Boolean))];
  const ogrenciler = await db
    .collection('students')
    .find(
      eskiListe
        ? { $or: [{ studentNumber: { $in: adaylar } }, { myCourseIds: { $in: dersIdleri } }] }
        : { studentNumber: { $in: adaylar } }
    )
    .project({ studentNumber: 1, firstName: 1, lastName: 1, name: 1, email: 1, myCourseIds: 1 })
    .toArray()
    .catch(() => []);
  // Eski listede dersi olan öğrencinin bu döneme ait yeni kaydı var mı?
  const eskiAdaylar = eskiListe
    ? ogrenciler
        .filter((o) => (o.myCourseIds || []).some((id) => dersIdleri.includes(metin(id))))
        .map((o) => metin(o.studentNumber))
        .filter((n) => n && !adaylar.includes(n))
    : [];
  const ekSecimler = eskiAdaylar.length
    ? await db
        .collection('student_courses')
        .find({
          $or: [
            { studentNumber: { $in: eskiAdaylar }, termKey: donem },
            {
              _docId: {
                $in: eskiAdaylar.map((n) => n.replace(/[^A-Za-z0-9]/g, '') + '__' + donem),
              },
            },
          ],
        })
        .toArray()
        .catch(() => [])
    : [];
  // Kural Dijital Yoklama ile ORTAK: lib/ogrenci-ders-secimi.js → dersinOgrenciNolari.
  const liste = S.dersinOgrenciNolari({
    dersIdleri,
    donem,
    donemKayitlari: secimler.concat(ekSecimler),
    ogrenciKayitlari: ogrenciler,
    eskiListe,
  });
  const eposta = !!(secenek && secenek.eposta);
  const ad = new Map(
    ogrenciler.map((o) => [
      metin(o.studentNumber),
      { ...K.adSoyadAyir(o), ...(eposta ? { email: metin(o.email) } : {}) },
    ])
  );
  return liste.map((no) => ({
    no,
    ...(ad.get(no) || { ad: '', soyad: '', ...(eposta ? { email: '' } : {}) }),
  }));
}

/**
 * Kişinin bu odadaki rolü: 'hoca' | 'yetkili' | 'ogrenci' | null.
 * Yetkili (bölüm/fakülte/üniversite) odayı görür ama ödev, not ve teslim
 * işlemleri dersin hocasınındır.
 */
async function odaRolu(db, oda, user) {
  if (!oda || !user || user.aday) return null;
  if (ogrenciMi(user)) {
    const dersler = await donemDersleri(db, ogrenciNo(user), oda.donem);
    const K = await kural();
    return K.dersSeciliMi(oda, dersler) ? 'ogrenci' : null;
  }
  if (!personelMi(user)) return null;
  if (await hocaMi(oda, user)) return 'hoca';
  const alan = await yetkiliAlani(db, user);
  if (alan && alan.tur !== 'yok' && bolumAlanda(alan, oda.departmentId)) return 'yetkili';
  return null;
}

// Dersin haftalık saatleri ve derslikleri (ders programından). Program
// yoksa ya da okunamazsa boş liste: oda yine açılır.
async function odaProgrami(db, oda) {
  try {
    const K = await kural();
    const [Slot, Saat] = await programKurali();
    const yari = metin(oda.donem).split('_')[1] || '';
    const dokumanlar = await db.collection('course_schedules').find({}).toArray();
    const ayarlar = await db.collection('bolum_program_ayarlari').find({}).toArray();
    const ayar = new Map();
    ayarlar.forEach((k) => {
      const id = metin(k.id || k._docId || k.departmentId);
      if (id) ayar.set(id, k);
    });
    return K.dersProgramiOzeti(dokumanlar, {
      dersKod: oda.dersKod,
      yari,
      slotDersleri: Slot.slotDersleri,
      saatler: (bolum, seviye) => Saat.bolumSaatleri(ayar.get(bolum), seviye),
    });
  } catch (e) {
    console.warn('[oda] program okunamadı:', e && e.message);
    return [];
  }
}

// Dersin bu dönemki sınavları (Sınav Otomasyonu → sinav_programi). Okunamazsa
// boş liste: oda yine açılır.
async function odaSinavlariOku(db, oda) {
  try {
    const K = await kural();
    const idler = K.odaDersKimlikleri(oda);
    let sinavlar = await db
      .collection('sinav_programi')
      .find({ courseId: { $in: idler } })
      .toArray();
    // Ders başka bir kayıtla programa konmuşsa ders koduyla bulunur.
    if (!sinavlar.length) {
      sinavlar = await db
        .collection('sinav_programi')
        .find({ code: { $exists: true } })
        .project({ courseId: 1, code: 1, date: 1, timeSlot: 1, room: 1, periodId: 1, _docId: 1 })
        .toArray();
    }
    if (!sinavlar.length) return [];
    const donemler = await db.collection('sinav_donemler').find({}).toArray();
    return K.odaSinavlari(oda, sinavlar, donemler);
  } catch (e) {
    console.warn('[oda] sınav programı okunamadı:', e && e.message);
    return [];
  }
}

async function odaKaydet(db, ders, donem) {
  const K = await kural();
  const dersId = dersKimligi(ders);
  const _id = K.odaKimligi('ders', dersId, donem);
  const hocalar = await dersHocalari(ders);
  await db.collection(ODALAR).updateOne(
    { _id },
    {
      $set: {
        tur: 'ders',
        kaynakId: dersId,
        kaynakIdleri: K.dersKimlikleri(ders),
        donem,
        dersKod: metin(ders.code || ders.kod),
        dersAd: metin(ders.name || ders.ad),
        departmentId: metin(ders.departmentId),
        sinif: Number(ders.sinif) || null,
        hocalar,
        guncellendi: new Date().toISOString(),
      },
      $setOnInsert: { olusturuldu: new Date().toISOString(), renk: '', aciklama: '' },
    },
    { upsert: true }
  );
  return db.collection(ODALAR).findOne({ _id });
}

async function odaVeRol(req, res, odaId) {
  const db = await getDbSafe();
  const oda = await db.collection(ODALAR).findOne({ _id: metin(odaId) });
  if (!oda) {
    res.status(404).json({ error: 'Ders odası bulunamadı.' });
    return null;
  }
  const rol = await odaRolu(db, oda, req.user);
  if (!rol) {
    res.status(403).json({
      error: ogrenciMi(req.user)
        ? 'Bu ders odasına girmek için dersi o dönemin ders seçiminde seçmiş olmalısınız.'
        : 'Bu ders odasına erişiminiz yok.',
    });
    return null;
  }
  return { db, oda, rol };
}

async function icerikVeRol(req, res, icerikId) {
  const db = await getDbSafe();
  const icerik = await db.collection(ICERIK).findOne({ _id: metin(icerikId) });
  if (!icerik) {
    res.status(404).json({ error: 'Paylaşım bulunamadı.' });
    return null;
  }
  const b = await odaVeRol(req, res, icerik.odaId);
  if (!b) return null;
  return { ...b, icerik };
}

// ── BİLDİRİM ──
async function bildir(req, db, alicilar, mesaj, meta) {
  const liste = [...new Set((alicilar || []).map(metin).filter(Boolean))].map((id) => ({
    recipientType: 'user',
    recipientId: id,
    type: 'ders-odasi',
    module: 'dersodalari',
    title: mesaj.title,
    body: mesaj.body,
    link: 'dersodalari',
    meta: { kaynak: 'dersodalari', ...(meta || {}) },
    readBy: [],
    createdAt: new Date().toISOString(),
  }));
  if (!liste.length) return;
  try {
    await db.collection('notifications').insertMany(liste);
    const io = req && req.app && req.app.get && req.app.get('io');
    if (io) io.emit('db:write', { collections: ['notifications'], at: new Date().toISOString() });
  } catch (e) {
    console.warn('[oda] bildirim yazılamadı:', e && e.message);
  }
}

// ── GÖRÜNÜM TEMİZLEME ──
function icerikGorunumu(i) {
  return {
    id: i._id,
    odaId: i.odaId,
    tur: i.tur,
    baslik: i.baslik || '',
    metin: i.metin || '',
    puan: i.puan == null ? '' : i.puan,
    sonTarih: i.sonTarih || '',
    gecKabul: !!i.gecKabul,
    kabulAcik: i.kabulAcik !== false,
    ekSureler: i.ekSureler || {},
    ekler: i.ekler || [],
    yazar: i.yazar || '',
    olusturuldu: i.olusturuldu,
    duzenlendi: i.duzenlendi || '',
  };
}
function teslimGorunumu(t, ogrenciIcin) {
  if (!t) return null;
  const g = {
    id: t._id,
    icerikId: t.icerikId,
    ogrenciNo: t.ogrenciNo,
    dosyalar: t.dosyalar || [],
    teslimEdildi: !!t.teslimEdildi,
    teslimZamani: t.teslimZamani || '',
    gec: !!t.gec,
    geriVerildi: !!t.geriVerildi,
    geriVerilmeZamani: t.geriVerilmeZamani || '',
    iade: t.iade
      ? {
          gorus: metin(t.iade.gorus),
          zaman: metin(t.iade.zaman),
          kullanildi: !!t.iade.kullanildi,
          yenidenGonderim: metin(t.iade.yenidenGonderim),
        }
      : null,
    iadeSayisi: (t.iadeGecmisi || []).length,
  };
  // Öğrenci notu ancak akademisyen "geri ver" dedikten sonra görür.
  if (!ogrenciIcin || t.geriVerildi) {
    g.puan = t.puan == null ? '' : t.puan;
    g.geriBildirim = t.geriBildirim || '';
  } else {
    g.puan = '';
    g.geriBildirim = '';
  }
  return g;
}
function yorumGorunumu(y, user) {
  return {
    id: y._id,
    yazar: y.yazar,
    yazarAd: y.yazarAd || y.yazar,
    rol: y.rol,
    metin: y.metin,
    olusturuldu: y.olusturuldu,
    benim: metin(y.yazar) === metin(user && user.identifier),
  };
}
function dosyaGorunumu(d) {
  return { id: d._id, ad: d.ad, boyut: d.boyut, uzanti: d.uzanti, yukleyen: d.yukleyen };
}

// ══════════════════════════════════════════════════════════════
// UÇLAR
// ══════════════════════════════════════════════════════════════

router.get(
  '/ayarlar',
  requireAuth,
  sar(async (req, res) => {
    const K = await kural();
    res.json({
      dosyaMb: DOSYA_MB,
      uzantilar: K.IZINLI_UZANTILAR,
      teslimDosyaSiniri: K.TESLIM_DOSYA_SINIRI,
      donem: K.donemAnahtari(),
    });
  })
);

// Kişinin odaları. Öğrenci: dönem ders seçimi. Akademisyen: hocası olduğu
// dersler. Yetkili: ?bolum= verilirse o bölümün (alanındaysa) bütün dersleri.
router.get(
  '/odalar',
  requireAuth,
  sar(async (req, res) => {
    const user = req.user;
    if (user.aday) return res.status(403).json({ error: 'Aday hesabı ders odalarını göremez.' });
    const K = await kural();
    const donem = /^\d{4}-\d{4}_(guz|bahar)$/.test(metin(req.query.donem))
      ? metin(req.query.donem)
      : K.donemAnahtari();
    const db = await getDbSafe();
    let dersler = [];
    if (ogrenciMi(user)) {
      const ids = await donemDersleri(db, ogrenciNo(user), donem);
      if (ids.length) {
        dersler = await db.collection('sinav_dersler').find(dersSorgusu(ids)).toArray();
      }
    } else if (personelMi(user)) {
      const E = await egitmenKurali();
      const tum = await db.collection('sinav_dersler').find({}).toArray();
      const benim = [];
      for (const d of tum) {
        const hocalar = await dersHocalari(d);
        if (hocalar.some((h) => E.ayniEgitmen(h, user.identifier))) benim.push(d);
      }
      dersler = benim;
      const bolum = metin(req.query.bolum);
      if (bolum) {
        const alan = await yetkiliAlani(db, user);
        if (alan && alan.tur !== 'yok' && bolumAlanda(alan, bolum)) {
          const H = require('../lib/bolum-kimlik');
          const harita = H.bolumKimlikHaritasi(
            await db.collection('departments').find({}).toArray()
          );
          tum.forEach((d) => {
            if (!benim.includes(d) && H.ayniBolum(metin(d.departmentId), bolum, harita))
              dersler.push(d);
          });
        }
      }
    } else {
      return res.status(403).json({ error: 'Yetkiniz yok.' });
    }
    const odalar = [];
    for (const d of dersler) {
      if (!dersKimligi(d)) continue;
      const oda = await odaKaydet(db, d, donem);
      const rol = await odaRolu(db, oda, user);
      if (!rol) continue;
      odalar.push({ ...oda, id: oda._id, rol, ...(await odaKartOzeti(db, oda, rol, user)) });
    }
    odalar.sort((a, b) => metin(a.dersKod).localeCompare(metin(b.dersKod), 'tr'));
    res.json({ donem, odalar });
  })
);

router.get(
  '/oda/:odaId',
  requireAuth,
  sar(async (req, res) => {
    const b = await odaVeRol(req, res, req.params.odaId);
    if (!b) return;
    const { db, oda, rol } = b;
    const icerikler = await db
      .collection(ICERIK)
      .find({ odaId: oda._id })
      .sort({ olusturuldu: -1 })
      .toArray();
    // Gizli (öğrenci–akademisyen) yorumlar akış önizlemesine ve sayıya girmez.
    const yorumlar = await db
      .collection(YORUM)
      .find({ odaId: oda._id, gizliOgrenci: { $in: [null, ''] } })
      .sort({ olusturuldu: 1 })
      .toArray();
    const yorumSayisi = {};
    // Akış kartında son iki yorum önizlenir (tamamı paylaşım ayrıntısında).
    const sonYorumlar = {};
    yorumlar.forEach((y) => {
      yorumSayisi[y.icerikId] = (yorumSayisi[y.icerikId] || 0) + 1;
      const l = (sonYorumlar[y.icerikId] = sonYorumlar[y.icerikId] || []);
      l.push(yorumGorunumu(y, req.user));
      if (l.length > 2) l.shift();
    });
    let benimTeslimlerim = [];
    if (rol === 'ogrenci') {
      benimTeslimlerim = (
        await db
          .collection(TESLIM)
          .find({ odaId: oda._id, ogrenciNo: ogrenciNo(req.user) })
          .toArray()
      ).map((t) => teslimGorunumu(t, true));
    }
    const ogrenciler = await odaOgrencileri(db, oda);
    const ogrenciSayisi = ogrenciler.length;
    // Sınıf çalışmaları sekmesindeki üçlü (atandı / teslim / puanlandı) —
    // yalnız hoca ve yetkili görür.
    const odevOzetleri = {};
    if (rol !== 'ogrenci') {
      const K = await kural();
      const teslimler = await db.collection(TESLIM).find({ odaId: oda._id }).toArray();
      icerikler
        .filter((i) => i.tur === 'odev')
        .forEach((i) => {
          const ilgili = teslimler.filter((t) => t.icerikId === i._id);
          odevOzetleri[i._id] = K.odevOzeti(icerikGorunumu(i), ogrenciler, ilgili);
        });
    }
    res.json({
      oda: { ...oda, id: oda._id },
      rol,
      icerikler: icerikler.map(icerikGorunumu),
      yorumSayisi,
      sonYorumlar,
      program: await odaProgrami(db, oda),
      benimTeslimlerim,
      ogrenciSayisi,
      odevOzetleri,
      hocaBilgileri: await hocaIletisimleri(db, oda),
      sinavlar: await odaSinavlariOku(db, oda),
      ogrenciNo: rol === 'ogrenci' ? ogrenciNo(req.user) : '',
    });
  })
);

router.post(
  '/oda/:odaId/ozellestir',
  requireAuth,
  yazmaLimiti,
  sar(async (req, res) => {
    const b = await odaVeRol(req, res, req.params.odaId);
    if (!b) return;
    if (b.rol !== 'hoca') return res.status(403).json({ error: 'Yalnız dersin akademisyeni.' });
    const renk = /^#[0-9A-Fa-f]{6}$/.test(metin(req.body.renk)) ? metin(req.body.renk) : '';
    const aciklama = metin(req.body.aciklama).slice(0, 500);
    const K = await kural();
    const canliHam = metin(req.body.canliDers);
    const canliDers = K.guvenliBaglanti(canliHam);
    if (canliHam && !canliDers) {
      return res
        .status(400)
        .json({ error: 'Canlı ders bağlantısı http(s):// ile başlayan geçerli bir adres olmalı.' });
    }
    await b.db
      .collection(ODALAR)
      .updateOne({ _id: b.oda._id }, { $set: { renk, aciklama, canliDers } });
    degisti(req);
    res.json({ success: true });
  })
);

// Ödev / duyuru alanları — oluştururken ve düzenlerken aynı denetim.
async function icerikAlanlari(body, tur, mevcut) {
  const baslik = metin(body.baslik).slice(0, 200);
  const yazi = metin(body.metin).slice(0, 5000);
  if (tur === 'odev' && !baslik) return { hata: 'Ödev başlığı gerekli.' };
  if (tur === 'duyuru' && !yazi && !(body.ekler && body.ekler.length)) {
    return { hata: 'Duyuru metni boş olamaz.' };
  }
  const out = { baslik, metin: yazi };
  if (tur === 'odev') {
    const puanHam = metin(body.puan);
    if (puanHam !== '') {
      const p = Number(puanHam.replace(',', '.'));
      if (!Number.isFinite(p) || p <= 0 || p > 1000)
        return { hata: 'Puan 1 ile 1000 arası olmalı.' };
      out.puan = Math.round(p * 100) / 100;
    } else out.puan = '';
    const son = metin(body.sonTarih);
    if (son && isNaN(new Date(son).getTime())) return { hata: 'Son tarih okunamadı.' };
    out.sonTarih = son ? new Date(son).toISOString() : '';
    out.gecKabul = body.gecKabul == null ? (mevcut ? !!mevcut.gecKabul : true) : !!body.gecKabul;
    if (mevcut && metin(mevcut.sonTarih) !== out.sonTarih) out.hatirlatildi = false;
  }
  return { veri: out };
}

async function ekleriDogrula(db, odaId, ids, kisi) {
  const liste = Array.isArray(ids) ? ids.map(metin).filter(Boolean).slice(0, 20) : [];
  if (!liste.length) return [];
  const dosyalar = await db
    .collection(DOSYA)
    .find({ _id: { $in: liste }, odaId, amac: 'ek', yukleyen: kisi })
    .toArray();
  return dosyalar.map(dosyaGorunumu);
}

router.post(
  '/oda/:odaId/icerik',
  requireAuth,
  yazmaLimiti,
  sar(async (req, res) => {
    const b = await odaVeRol(req, res, req.params.odaId);
    if (!b) return;
    const { db, oda, rol } = b;
    if (rol !== 'hoca')
      return res.status(403).json({ error: 'Yalnız dersin akademisyeni paylaşım yapar.' });
    const tur = metin(req.body.tur) === 'odev' ? 'odev' : 'duyuru';
    const a = await icerikAlanlari(req.body, tur);
    if (a.hata) return res.status(400).json({ error: a.hata });
    const ekler = await ekleriDogrula(db, oda._id, req.body.ekler, metin(req.user.identifier));
    const icerik = {
      _id: yeniId(),
      odaId: oda._id,
      tur,
      ...a.veri,
      ekler,
      kabulAcik: true,
      ekSureler: {},
      hatirlatildi: false,
      yazar: metin(req.user.identifier),
      olusturuldu: new Date().toISOString(),
    };
    await db.collection(ICERIK).insertOne(icerik);
    if (ekler.length) {
      await db
        .collection(DOSYA)
        .updateMany({ _id: { $in: ekler.map((e) => e.id) } }, { $set: { icerikId: icerik._id } });
    }
    const K = await kural();
    const ogrenciler = await odaOgrencileri(db, oda);
    await bildir(
      req,
      db,
      ogrenciler.map((o) => o.no),
      K.bildirimMetni(tur, {
        dersKod: oda.dersKod,
        baslik: tur === 'odev' ? icerik.baslik : icerik.baslik || icerik.metin.slice(0, 80),
        sonTarih: icerik.sonTarih,
      }),
      { odaId: oda._id, icerikId: icerik._id }
    );
    degisti(req);
    res.json({ icerik: icerikGorunumu(icerik) });
  })
);

router.post(
  '/icerik/:id/guncelle',
  requireAuth,
  yazmaLimiti,
  sar(async (req, res) => {
    const b = await icerikVeRol(req, res, req.params.id);
    if (!b) return;
    if (b.rol !== 'hoca') return res.status(403).json({ error: 'Yalnız dersin akademisyeni.' });
    const a = await icerikAlanlari(req.body, b.icerik.tur, b.icerik);
    if (a.hata) return res.status(400).json({ error: a.hata });
    const yeni = { ...a.veri, duzenlendi: new Date().toISOString() };
    if (Array.isArray(req.body.ekler)) {
      const korunan = (b.icerik.ekler || []).filter((e) => req.body.ekler.includes(e.id));
      const eklenen = await ekleriDogrula(
        b.db,
        b.oda._id,
        req.body.ekler.filter((id) => !korunan.some((e) => e.id === id)),
        metin(req.user.identifier)
      );
      yeni.ekler = korunan.concat(eklenen);
      if (eklenen.length) {
        await b.db
          .collection(DOSYA)
          .updateMany(
            { _id: { $in: eklenen.map((e) => e.id) } },
            { $set: { icerikId: b.icerik._id } }
          );
      }
    }
    await b.db.collection(ICERIK).updateOne({ _id: b.icerik._id }, { $set: yeni });
    degisti(req);
    res.json({ icerik: icerikGorunumu({ ...b.icerik, ...yeni }) });
  })
);

function dosyaSilDisk(d) {
  try {
    const yol = path.join(UPLOAD_DIR, metin(d.yol));
    if (yol.startsWith(UPLOAD_DIR + path.sep) && fs.existsSync(yol)) fs.unlinkSync(yol);
  } catch (_) {
    /* dosya zaten yok */
  }
}

router.post(
  '/icerik/:id/sil',
  requireAuth,
  yazmaLimiti,
  sar(async (req, res) => {
    const b = await icerikVeRol(req, res, req.params.id);
    if (!b) return;
    if (b.rol !== 'hoca') return res.status(403).json({ error: 'Yalnız dersin akademisyeni.' });
    const { db, icerik } = b;
    const dosyalar = await db.collection(DOSYA).find({ icerikId: icerik._id }).toArray();
    dosyalar.forEach(dosyaSilDisk);
    await db.collection(DOSYA).deleteMany({ icerikId: icerik._id });
    await db.collection(TESLIM).deleteMany({ icerikId: icerik._id });
    await db.collection(YORUM).deleteMany({ icerikId: icerik._id });
    await db.collection(ICERIK).deleteOne({ _id: icerik._id });
    degisti(req);
    res.json({ success: true });
  })
);

// Gönderim ayarı: kabul anahtarı, son tarih, geç teslim, öğrenciye ek süre.
router.post(
  '/icerik/:id/ayar',
  requireAuth,
  yazmaLimiti,
  sar(async (req, res) => {
    const b = await icerikVeRol(req, res, req.params.id);
    if (!b) return;
    if (b.rol !== 'hoca') return res.status(403).json({ error: 'Yalnız dersin akademisyeni.' });
    const { db, oda, icerik } = b;
    if (icerik.tur !== 'odev') return res.status(400).json({ error: 'Yalnız ödevlerde.' });
    const K = await kural();
    const set = {};
    const yeniden = [];
    if (req.body.kabulAcik != null) {
      set.kabulAcik = !!req.body.kabulAcik;
      if (set.kabulAcik && icerik.kabulAcik === false) yeniden.push('*');
    }
    if (req.body.gecKabul != null) set.gecKabul = !!req.body.gecKabul;
    if (req.body.sonTarih != null) {
      const s = metin(req.body.sonTarih);
      if (s && isNaN(new Date(s).getTime()))
        return res.status(400).json({ error: 'Son tarih okunamadı.' });
      set.sonTarih = s ? new Date(s).toISOString() : '';
      set.hatirlatildi = false;
      if (set.sonTarih && (!icerik.sonTarih || set.sonTarih > icerik.sonTarih)) yeniden.push('*');
    }
    if (req.body.ekSure && metin(req.body.ekSure.ogrenciNo)) {
      const no = metin(req.body.ekSure.ogrenciNo);
      const s = metin(req.body.ekSure.sonTarih);
      if (s && isNaN(new Date(s).getTime()))
        return res.status(400).json({ error: 'Ek süre tarihi okunamadı.' });
      const ekSureler = { ...(icerik.ekSureler || {}) };
      if (s) {
        ekSureler[no] = new Date(s).toISOString();
        yeniden.push(no);
      } else delete ekSureler[no];
      set.ekSureler = ekSureler;
    }
    if (!Object.keys(set).length) return res.status(400).json({ error: 'Değişiklik yok.' });
    await db.collection(ICERIK).updateOne({ _id: icerik._id }, { $set: set });
    const guncel = { ...icerik, ...set };
    if (yeniden.length) {
      const hepsi = yeniden.includes('*');
      let alicilar = yeniden.filter((x) => x !== '*');
      if (hepsi) {
        const teslimEdenler = new Set(
          (
            await db.collection(TESLIM).find({ icerikId: icerik._id, teslimEdildi: true }).toArray()
          ).map((t) => metin(t.ogrenciNo))
        );
        alicilar = (await odaOgrencileri(db, oda))
          .map((o) => o.no)
          .filter((no) => !teslimEdenler.has(no));
      }
      await bildir(
        req,
        db,
        alicilar,
        K.bildirimMetni('yeniden-acildi', {
          dersKod: oda.dersKod,
          baslik: icerik.baslik,
          sonTarih: hepsi ? guncel.sonTarih : guncel.ekSureler[alicilar[0]],
        }),
        { odaId: oda._id, icerikId: icerik._id }
      );
    }
    degisti(req);
    res.json({ icerik: icerikGorunumu(guncel) });
  })
);

// İçerik ayrıntısı: yorumlar + (öğrenci) kendi teslimi / (hoca, yetkili) tüm liste.
router.get(
  '/icerik/:id',
  requireAuth,
  sar(async (req, res) => {
    const b = await icerikVeRol(req, res, req.params.id);
    if (!b) return;
    const { db, oda, icerik, rol } = b;
    const tumYorumlar = await db
      .collection(YORUM)
      .find({ icerikId: icerik._id })
      .sort({ olusturuldu: 1 })
      .toArray();
    // Gizli yorum (gizliOgrenci dolu) yalnız o öğrenciye ve dersin
    // akademisyenine / yetkiliye gider; sınıf yorumlarında görünmez.
    const ben = rol === 'ogrenci' ? ogrenciNo(req.user) : '';
    const yorumlar = tumYorumlar
      .filter((y) => !metin(y.gizliOgrenci))
      .map((y) => yorumGorunumu(y, req.user));
    const gizliYorumlar = tumYorumlar
      .filter((y) => metin(y.gizliOgrenci) && (rol !== 'ogrenci' || metin(y.gizliOgrenci) === ben))
      .map((y) => ({ ...yorumGorunumu(y, req.user), ogrenciNo: metin(y.gizliOgrenci) }));
    const out = {
      icerik: icerikGorunumu(icerik),
      oda: { ...oda, id: oda._id },
      rol,
      yorumlar,
      gizliYorumlar,
    };
    if (icerik.tur === 'odev') {
      if (rol === 'ogrenci') {
        const t = await db
          .collection(TESLIM)
          .findOne({ _id: icerik._id + '__' + ogrenciNo(req.user) });
        out.teslim = teslimGorunumu(t, true);
        out.ogrenciNo = ogrenciNo(req.user);
        const K = await kural();
        out.kabul = K.teslimKabulKarari(icerik, ogrenciNo(req.user), null, t);
      } else {
        out.ogrenciler = await odaOgrencileri(db, oda);
        out.teslimler = (await db.collection(TESLIM).find({ icerikId: icerik._id }).toArray()).map(
          (t) => teslimGorunumu(t, false)
        );
      }
    }
    res.json(out);
  })
);

router.post(
  '/icerik/:id/yorum',
  requireAuth,
  yazmaLimiti,
  sar(async (req, res) => {
    const b = await icerikVeRol(req, res, req.params.id);
    if (!b) return;
    const { db, oda, icerik, rol } = b;
    const yazi = metin(req.body.metin).slice(0, 2000);
    if (!yazi) return res.status(400).json({ error: 'Yorum boş olamaz.' });
    // Gizli yorum: öğrenci kendi adına, akademisyen bir öğrenciye yazar.
    let gizliOgrenci = '';
    if (req.body.gizli) {
      if (rol === 'ogrenci') gizliOgrenci = ogrenciNo(req.user);
      else if (rol === 'hoca') {
        gizliOgrenci = metin(req.body.ogrenciNo);
        const uyeler = await odaOgrencileri(db, oda);
        if (!uyeler.some((s) => s.no === gizliOgrenci))
          return res.status(400).json({ error: 'Öğrenci bu derste kayıtlı değil.' });
      } else return res.status(403).json({ error: 'Gizli yorumu öğrenci ve akademisyen yazar.' });
    }
    let yazarAd = metin(req.user.identifier);
    if (rol === 'ogrenci') {
      const o = await db.collection('students').findOne({ studentNumber: ogrenciNo(req.user) });
      const K = await kural();
      const a = K.adSoyadAyir(o || {});
      yazarAd = [a.ad, a.soyad].filter(Boolean).join(' ') || yazarAd;
    }
    const y = {
      _id: yeniId(),
      odaId: oda._id,
      icerikId: icerik._id,
      yazar: metin(req.user.identifier),
      yazarAd,
      rol,
      metin: yazi,
      gizliOgrenci,
      olusturuldu: new Date().toISOString(),
    };
    await db.collection(YORUM).insertOne(y);
    if (gizliOgrenci && rol === 'hoca') {
      const K = await kural();
      await bildir(
        req,
        db,
        [gizliOgrenci],
        K.bildirimMetni('gizli-yorum', {
          dersKod: oda.dersKod,
          baslik: icerik.baslik || 'Ödev',
          yazar: yazarAd,
        }),
        { odaId: oda._id, icerikId: icerik._id }
      );
    }
    // Öğrenci yorum yazınca dersin hocalarına haber gider.
    if (rol === 'ogrenci') {
      const K = await kural();
      await bildir(
        req,
        db,
        oda.hocalar || [],
        K.bildirimMetni('yorum', {
          dersKod: oda.dersKod,
          baslik: icerik.baslik || 'Duyuru',
          yazar: yazarAd + (gizliOgrenci ? ' (gizli)' : ''),
        }),
        { odaId: oda._id, icerikId: icerik._id }
      );
    }
    degisti(req);
    res.json({ yorum: { ...y, id: y._id, benim: true, ogrenciNo: gizliOgrenci } });
  })
);

router.post(
  '/yorum/:id/sil',
  requireAuth,
  yazmaLimiti,
  sar(async (req, res) => {
    const db = await getDbSafe();
    const y = await db.collection(YORUM).findOne({ _id: metin(req.params.id) });
    if (!y) return res.status(404).json({ error: 'Yorum bulunamadı.' });
    const b = await odaVeRol(req, res, y.odaId);
    if (!b) return;
    if (b.rol !== 'hoca' && metin(y.yazar) !== metin(req.user.identifier)) {
      return res.status(403).json({ error: 'Yalnız kendi yorumunuzu silebilirsiniz.' });
    }
    await db.collection(YORUM).deleteOne({ _id: y._id });
    degisti(req);
    res.json({ success: true });
  })
);

// ── DOSYA YÜKLEME ──
// ?odaId=…&amac=ek (akademisyenin paylaşım eki) | teslim (öğrencinin ödevi)&icerikId=…
router.post(
  '/dosya',
  requireAuth,
  yazmaLimiti,
  (req, res, next) =>
    yukle.single('dosya')(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Dosya en fazla ' + DOSYA_MB + ' MB olabilir.' });
      }
      return res.status(400).json({ error: 'Dosya yüklenemedi.' });
    }),
  sar(async (req, res) => {
    const amac = metin(req.query.amac) === 'teslim' ? 'teslim' : 'ek';
    const b = await odaVeRol(req, res, req.query.odaId);
    if (!b) return;
    const { db, oda, rol } = b;
    if (!req.file) return res.status(400).json({ error: 'Dosya seçilmedi.' });
    const K = await kural();
    const ad = Buffer.from(req.file.originalname || 'dosya', 'latin1')
      .toString('utf8')
      .slice(0, 180);
    const karar = K.dosyaKarari({ ad, boyut: req.file.size }, DOSYA_MB);
    if (!karar.izin) return res.status(400).json({ error: karar.hata });

    let icerik = null;
    let teslim = null;
    const no = ogrenciNo(req.user);
    if (amac === 'ek') {
      if (rol !== 'hoca')
        return res.status(403).json({ error: 'Yalnız dersin akademisyeni ek yükler.' });
    } else {
      if (rol !== 'ogrenci') return res.status(403).json({ error: 'Ödevi yalnız öğrenci yükler.' });
      icerik = await db
        .collection(ICERIK)
        .findOne({ _id: metin(req.query.icerikId), odaId: oda._id });
      if (!icerik || icerik.tur !== 'odev')
        return res.status(404).json({ error: 'Ödev bulunamadı.' });
      teslim = await db.collection(TESLIM).findOne({ _id: icerik._id + '__' + no });
      const kabul = K.teslimKabulKarari(icerik, no, null, teslim);
      if (!kabul.izin) return res.status(400).json({ error: kabul.sebep });
      if (teslim && teslim.teslimEdildi) {
        return res
          .status(400)
          .json({ error: 'Ödev teslim edildi. Dosya eklemek için önce teslimi geri alın.' });
      }
      if (teslim && (teslim.dosyalar || []).length >= K.TESLIM_DOSYA_SINIRI) {
        return res
          .status(400)
          .json({ error: 'Bir teslimde en çok ' + K.TESLIM_DOSYA_SINIRI + ' dosya olabilir.' });
      }
    }

    const id = yeniId();
    const uzanti = K.dosyaUzantisi(ad);
    const klasor = path.join(UPLOAD_DIR, oda._id);
    fs.mkdirSync(klasor, { recursive: true });
    const yol = path.join(oda._id, id + '.' + uzanti);
    fs.writeFileSync(path.join(UPLOAD_DIR, yol), req.file.buffer);
    const kayit = {
      _id: id,
      odaId: oda._id,
      icerikId: icerik ? icerik._id : '',
      amac,
      ad,
      boyut: req.file.size,
      uzanti,
      yol,
      mime: metin(req.file.mimetype),
      yukleyen: amac === 'teslim' ? no : metin(req.user.identifier),
      olusturuldu: new Date().toISOString(),
    };
    await db.collection(DOSYA).insertOne(kayit);
    if (amac === 'teslim') {
      const dosyalar = ((teslim && teslim.dosyalar) || []).concat([dosyaGorunumu(kayit)]);
      await db.collection(TESLIM).updateOne(
        { _id: icerik._id + '__' + no },
        {
          $set: { dosyalar, guncellendi: new Date().toISOString() },
          $setOnInsert: {
            odaId: oda._id,
            icerikId: icerik._id,
            ogrenciNo: no,
            teslimEdildi: false,
            puan: '',
            geriVerildi: false,
          },
        },
        { upsert: true }
      );
      degisti(req);
    }
    res.json({ dosya: dosyaGorunumu(kayit) });
  })
);

async function teslimIslemi(req, res, fn) {
  const b = await icerikVeRol(req, res, req.params.id);
  if (!b) return;
  if (b.rol !== 'ogrenci') return res.status(403).json({ error: 'Yalnız öğrenci.' });
  if (b.icerik.tur !== 'odev') return res.status(400).json({ error: 'Bu paylaşım ödev değil.' });
  const no = ogrenciNo(req.user);
  const teslim = await b.db.collection(TESLIM).findOne({ _id: b.icerik._id + '__' + no });
  const K = await kural();
  return fn({ ...b, no, teslim, K });
}

router.post(
  '/teslim/:id/dosya-sil',
  requireAuth,
  yazmaLimiti,
  sar((req, res) =>
    teslimIslemi(req, res, async ({ db, icerik, no, teslim }) => {
      if (!teslim) return res.status(404).json({ error: 'Teslim bulunamadı.' });
      if (teslim.teslimEdildi) return res.status(400).json({ error: 'Önce teslimi geri alın.' });
      const dosyaId = metin(req.body.dosyaId);
      const d = await db
        .collection(DOSYA)
        .findOne({ _id: dosyaId, yukleyen: no, icerikId: icerik._id });
      if (d) {
        dosyaSilDisk(d);
        await db.collection(DOSYA).deleteOne({ _id: d._id });
      }
      const dosyalar = (teslim.dosyalar || []).filter((x) => x.id !== dosyaId);
      await db.collection(TESLIM).updateOne({ _id: teslim._id }, { $set: { dosyalar } });
      degisti(req);
      res.json({ success: true, dosyalar });
    })
  )
);

router.post(
  '/teslim/:id/gonder',
  requireAuth,
  yazmaLimiti,
  sar((req, res) =>
    teslimIslemi(req, res, async ({ db, oda, icerik, no, teslim, K }) => {
      const kabul = K.teslimKabulKarari(icerik, no, null, teslim);
      if (!kabul.izin) return res.status(400).json({ error: kabul.sebep });
      if (!teslim || !(teslim.dosyalar || []).length) {
        return res.status(400).json({ error: 'Teslim etmeden önce en az bir dosya ekleyin.' });
      }
      const simdi = new Date().toISOString();
      const set = { teslimEdildi: true, teslimZamani: simdi, gec: kabul.gec };
      // İade sonrası tek yeniden gönderim hakkı burada kullanılır.
      if (kabul.iade) set.iade = { ...teslim.iade, kullanildi: true, yenidenGonderim: simdi };
      await db.collection(TESLIM).updateOne({ _id: teslim._id }, { $set: set });
      degisti(req);
      res.json({ teslim: teslimGorunumu({ ...teslim, ...set, odaId: oda._id }, true) });
    })
  )
);

router.post(
  '/teslim/:id/geri-al',
  requireAuth,
  yazmaLimiti,
  sar((req, res) =>
    teslimIslemi(req, res, async ({ db, icerik, no, teslim, K }) => {
      if (!teslim || !teslim.teslimEdildi) return res.status(400).json({ error: 'Teslim yok.' });
      if (teslim.geriVerildi)
        return res.status(400).json({ error: 'Not verilmiş ödev geri alınamaz.' });
      const kabul = K.teslimKabulKarari(icerik, no, null, teslim);
      if (!kabul.izin) {
        return res
          .status(400)
          .json({ error: 'Gönderim kapalı; teslim geri alınırsa yeniden teslim edilemez.' });
      }
      await db.collection(TESLIM).updateOne({ _id: teslim._id }, { $set: { teslimEdildi: false } });
      degisti(req);
      res.json({ teslim: teslimGorunumu({ ...teslim, teslimEdildi: false }, true) });
    })
  )
);

// ── NOT ──
router.post(
  '/icerik/:id/not',
  requireAuth,
  yazmaLimiti,
  sar(async (req, res) => {
    const b = await icerikVeRol(req, res, req.params.id);
    if (!b) return;
    if (b.rol !== 'hoca')
      return res.status(403).json({ error: 'Notu yalnız dersin akademisyeni verir.' });
    const { db, oda, icerik } = b;
    if (icerik.tur !== 'odev') return res.status(400).json({ error: 'Bu paylaşım ödev değil.' });
    const K = await kural();
    const no = metin(req.body.ogrenciNo);
    const uyeler = await odaOgrencileri(db, oda);
    if (!uyeler.some((u) => u.no === no))
      return res.status(400).json({ error: 'Öğrenci bu odada değil.' });
    const karar = K.puanKarari(req.body.puan, icerik.puan);
    if (!karar.gecerli) return res.status(400).json({ error: karar.hata });
    const set = {
      puan: karar.deger,
      geriBildirim: metin(req.body.geriBildirim).slice(0, 2000),
      notVeren: metin(req.user.identifier),
      notZamani: new Date().toISOString(),
      // Not değişirse öğrenciye yeniden "geri verilmesi" gerekir.
      geriVerildi: false,
    };
    await db.collection(TESLIM).updateOne(
      { _id: icerik._id + '__' + no },
      {
        $set: set,
        $setOnInsert: {
          odaId: oda._id,
          icerikId: icerik._id,
          ogrenciNo: no,
          teslimEdildi: false,
          dosyalar: [],
        },
      },
      { upsert: true }
    );
    degisti(req);
    res.json({ success: true, puan: karar.deger });
  })
);

// ── GÖRÜŞLE İADE ──
// Akademisyen teslimi görüşüyle öğrenciye geri gönderir: teslim açılır, not
// ve geri bildirim temizlenir (geçmişte saklanır) ve öğrenci, gönderim kapalı
// ya da süre dolmuş olsa bile BİR KEZ yeniden gönderebilir.
router.post(
  '/icerik/:id/iade',
  requireAuth,
  yazmaLimiti,
  sar(async (req, res) => {
    const b = await icerikVeRol(req, res, req.params.id);
    if (!b) return;
    if (b.rol !== 'hoca')
      return res.status(403).json({ error: 'Ödevi yalnız dersin akademisyeni iade eder.' });
    const { db, oda, icerik } = b;
    if (icerik.tur !== 'odev') return res.status(400).json({ error: 'Bu paylaşım ödev değil.' });
    const no = metin(req.body.ogrenciNo);
    const gorus = metin(req.body.gorus).slice(0, 2000);
    if (!gorus) return res.status(400).json({ error: 'İade için görüşünüzü yazın.' });
    const teslim = await db.collection(TESLIM).findOne({ _id: icerik._id + '__' + no });
    if (!teslim || !teslim.teslimEdildi)
      return res.status(400).json({ error: 'Öğrencinin teslim ettiği bir çalışma yok.' });
    const simdi = new Date().toISOString();
    await db.collection(TESLIM).updateOne(
      { _id: teslim._id },
      {
        $set: {
          teslimEdildi: false,
          geriVerildi: false,
          puan: '',
          geriBildirim: '',
          iade: { gorus, zaman: simdi, yapan: metin(req.user.identifier), kullanildi: false },
        },
        $push: {
          iadeGecmisi: {
            gorus,
            zaman: simdi,
            yapan: metin(req.user.identifier),
            oncekiPuan: teslim.puan == null ? '' : teslim.puan,
            oncekiTeslim: teslim.teslimZamani || '',
          },
        },
      }
    );
    const K = await kural();
    await bildir(
      req,
      db,
      [no],
      K.bildirimMetni('iade', { dersKod: oda.dersKod, baslik: icerik.baslik || 'Ödev' }),
      { odaId: oda._id, icerikId: icerik._id }
    );
    degisti(req);
    res.json({ success: true });
  })
);

router.post(
  '/icerik/:id/geri-ver',
  requireAuth,
  yazmaLimiti,
  sar(async (req, res) => {
    const b = await icerikVeRol(req, res, req.params.id);
    if (!b) return;
    if (b.rol !== 'hoca') return res.status(403).json({ error: 'Yalnız dersin akademisyeni.' });
    const { db, oda, icerik } = b;
    const istenen = new Set(
      (Array.isArray(req.body.ogrenciNolar) ? req.body.ogrenciNolar : []).map(metin)
    );
    const teslimler = await db.collection(TESLIM).find({ icerikId: icerik._id }).toArray();
    const verilecek = teslimler.filter(
      (t) => istenen.has(metin(t.ogrenciNo)) && metin(t.puan) !== '' && !t.geriVerildi
    );
    if (!verilecek.length)
      return res.status(400).json({ error: 'Seçilenlerde geri verilecek not yok.' });
    const simdi = new Date().toISOString();
    for (const t of verilecek) {
      await db
        .collection(TESLIM)
        .updateOne({ _id: t._id }, { $set: { geriVerildi: true, geriVerilmeZamani: simdi } });
    }
    const K = await kural();
    for (const t of verilecek) {
      await bildir(
        req,
        db,
        [t.ogrenciNo],
        K.bildirimMetni('not', {
          dersKod: oda.dersKod,
          baslik: icerik.baslik,
          puan: t.puan,
          maks: icerik.puan,
        }),
        { odaId: oda._id, icerikId: icerik._id }
      );
    }
    degisti(req);
    res.json({ success: true, sayi: verilecek.length });
  })
);

// Bütün notlar (Excel / PDF çizelgesi için).
router.get(
  '/oda/:odaId/notlar',
  requireAuth,
  sar(async (req, res) => {
    const b = await odaVeRol(req, res, req.params.odaId);
    if (!b) return;
    const { db, oda } = b;
    if (b.rol === 'ogrenci') return res.json(await ogrenciNotCizelgesi(db, oda, req.user));
    const odevler = (
      await db
        .collection(ICERIK)
        .find({ odaId: oda._id, tur: 'odev' })
        .sort({ olusturuldu: 1 })
        .toArray()
    ).map(icerikGorunumu);
    const teslimler = (await db.collection(TESLIM).find({ odaId: oda._id }).toArray()).map((t) =>
      teslimGorunumu(t, false)
    );
    const ogrenciler = await odaOgrencileri(db, oda, { eposta: true });
    let kunye = { bolumAd: '', fakulteAd: '' };
    try {
      const H = require('../lib/bolum-kimlik');
      const bolumler = await db.collection('departments').find({}).toArray();
      const harita = H.bolumKimlikHaritasi(bolumler);
      const bolum = bolumler.find((d) =>
        H.kimlikler(d).some((k) => H.ayniBolum(k, oda.departmentId, harita))
      );
      if (bolum) {
        kunye.bolumAd = metin(bolum.name);
        const fak = bolum.facultyId
          ? await db
              .collection('faculties')
              .findOne({ $or: [{ _docId: bolum.facultyId }, { id: bolum.facultyId }] })
          : null;
        kunye.fakulteAd = metin(fak && fak.name);
      }
    } catch (_) {
      kunye = { bolumAd: '', fakulteAd: '' };
    }
    const ekNotlar = (await db.collection(EKNOT).find({ odaId: oda._id }).toArray()).map(
      ekNotGorunumu
    );
    res.json({
      oda: { ...oda, id: oda._id },
      odevler,
      teslimler,
      ogrenciler,
      ekNotlar,
      notAyari: oda.notAyari || {},
      sinavlar: await odaSinavlariOku(db, oda),
      kunye,
    });
  })
);

const ekNotGorunumu = (n) => ({ kalemId: n.kalemId, ogrenciNo: n.ogrenciNo, puan: n.puan });

// Öğrencinin gördüğü not çizelgesi: bütün sınıfın notları var ama YALNIZ
// kendi satırında ad ve numara açıktır. Diğer öğrencilerin kimliği burada,
// sunucuda maskelenir; numaralar her istekte yeniden üretilen sahte
// anahtarlarla değiştirilir ve sıra karıştırılır — istemciye gerçek numara
// hiç gitmez. Ödev notu ancak "geri verildikten", ek sütun notu ancak sütun
// "yayınlandıktan" sonra görünür (taslak notlar sızmaz). Ödevlerin
// öğrenciye özel ek süreleri (numara anahtarlı) da çıkarılır.
async function ogrenciNotCizelgesi(db, oda, user) {
  const K = await kural();
  const ben = ogrenciNo(user);
  const ogrenciler = await odaOgrencileri(db, oda);
  const karisik = ogrenciler
    .filter((s) => s.no !== ben)
    .map((s) => ({ s, r: crypto.randomBytes(4).readUInt32BE(0) }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.s);
  const anahtar = new Map([[ben, ben]]);
  karisik.forEach((s, i) => anahtar.set(s.no, 'x' + (i + 1)));
  const benimKaydim = ogrenciler.find((s) => s.no === ben);
  const liste = (benimKaydim ? [{ ...benimKaydim, ben: true }] : []).concat(
    karisik.map((s) => ({
      no: anahtar.get(s.no),
      ad: K.adMaskele(s.ad),
      soyad: K.adMaskele(s.soyad),
      maskeli: true,
    }))
  );
  const odevler = (
    await db
      .collection(ICERIK)
      .find({ odaId: oda._id, tur: 'odev' })
      .sort({ olusturuldu: 1 })
      .toArray()
  ).map((i) => ({ ...icerikGorunumu(i), ekSureler: {} }));
  const teslimler = (await db.collection(TESLIM).find({ odaId: oda._id }).toArray())
    .filter((t) => t.geriVerildi && metin(t.puan) !== '' && anahtar.has(metin(t.ogrenciNo)))
    .map((t) => ({
      icerikId: t.icerikId,
      ogrenciNo: anahtar.get(metin(t.ogrenciNo)),
      puan: t.puan,
      teslimEdildi: !!t.teslimEdildi,
      geriVerildi: true,
    }));
  const ayar = oda.notAyari || {};
  const yayinda = new Set((ayar.ekKalemler || []).filter((k) => k.yayinlandi).map((k) => k.id));
  const ekNotlar = (await db.collection(EKNOT).find({ odaId: oda._id }).toArray())
    .filter((n) => yayinda.has(n.kalemId) && anahtar.has(metin(n.ogrenciNo)))
    .map((n) => ({ ...ekNotGorunumu(n), ogrenciNo: anahtar.get(metin(n.ogrenciNo)) }));
  return {
    oda: { ...oda, id: oda._id },
    odevler,
    teslimler,
    ogrenciler: liste,
    ekNotlar,
    notAyari: {
      agirliklar: ayar.agirliklar || {},
      // Yayınlanmamış sütun öğrenciye hiç gitmez; ortalama görünen
      // sütunların ağırlıklarıyla ölçeklenir.
      ekKalemler: (ayar.ekKalemler || []).filter((k) => k.yayinlandi),
    },
    sinavlar: await odaSinavlariOku(db, oda),
    kunye: { bolumAd: '', fakulteAd: '' },
  };
}

// ── DERSİ VERENLERİN ORTAK HAFTALIK PROGRAMI ──
// Öğrencinin Ders Programı modülüne (course_schedules) erişimi yok; bu yüzden
// odadaki herkes için hesap SUNUCUDA yapılır: dersin akademisyenlerinin bu
// yarıyıldaki bütün ders saatleri, Akademisyen Sayfam ile aynı kuralla
// (lib/akademisyen-programi.js) birleştirilir. Yalnız ders saati, kodu, adı,
// dersliği ve bölümü döner.
router.get(
  '/oda/:odaId/hoca-programi',
  requireAuth,
  sar(async (req, res) => {
    const b = await odaVeRol(req, res, req.params.odaId);
    if (!b) return;
    const { db, oda } = b;
    const P = await akademisyenProgramKurali();
    const [, Saat] = await programKurali();
    const yari = metin(oda.donem).split('_')[1] || '';
    const kimlik = (d) => metin(d.id || d._docId || (d._id && String(d._id)));
    const dokumanlar = (await db.collection('course_schedules').find({}).toArray()).map((d) => ({
      ...d,
      id: kimlik(d),
    }));
    const bolumler = (await db.collection('departments').find({}).toArray()).map((d) => ({
      ...d,
      id: kimlik(d),
      _id: d._id && String(d._id),
    }));
    const ayar = new Map();
    (await db.collection('bolum_program_ayarlari').find({}).toArray()).forEach((k) => {
      const id = metin(k.id || k._docId || k.departmentId);
      if (id) ayar.set(id, k);
    });
    const bolumSaatleri = {};
    bolumler.forEach((d) => {
      const kimlikler = [d.id, d._id, d._docId, d.code].filter(Boolean).map(String);
      const kayit = kimlikler.map((k) => ayar.get(k)).find(Boolean);
      const lisans = Saat.bolumSaatleri(kayit, 'lisans');
      const ustu = Saat.bolumSaatleri(kayit, 'lisansustu');
      kimlikler.forEach((k) => {
        bolumSaatleri[k + '|lisans'] = lisans;
        ['lisansustu', 'yukseklisans', 'doktora'].forEach((sv) => {
          bolumSaatleri[k + '|' + sv] = ustu;
        });
        bolumSaatleri[k] = lisans;
      });
    });
    const hocalar = (oda.hocalar || []).map((ad) => ({
      ad,
      kayitlar: P.akademisyenKayitlari(dokumanlar, {
        ad,
        donem: yari,
        bolumler,
        bolumSaatleri,
      }).map((k) => ({
        gun: k.gun,
        saat: k.saat,
        dersKodu: k.dersKodu,
        dersAdi: k.dersAdi,
        derslik: k.derslik,
        bolumAdi: k.bolumAdi,
        sinif: k.sinif,
      })),
    }));
    res.json({ donem: oda.donem, gunler: P.PROGRAM_GUNLERI, hocalar });
  })
);

// ── NOT AYARI: ağırlıklar ve ek sütunlar (vize, final, proje…) ──
router.post(
  '/oda/:odaId/not-ayari',
  requireAuth,
  yazmaLimiti,
  sar(async (req, res) => {
    const b = await odaVeRol(req, res, req.params.odaId);
    if (!b) return;
    if (b.rol !== 'hoca') return res.status(403).json({ error: 'Yalnız dersin akademisyeni.' });
    const { db, oda } = b;
    const K = await kural();
    const odevIdleri = (
      await db
        .collection(ICERIK)
        .find({ odaId: oda._id, tur: 'odev' })
        .project({ _id: 1 })
        .toArray()
    ).map((i) => i._id);
    const r = K.notAyariDogrula(req.body, odevIdleri, yeniId);
    if (r.hata) return res.status(400).json({ error: r.hata });
    const kalan = new Set(r.ayar.ekKalemler.map((k) => k.id));
    const silinen = ((oda.notAyari && oda.notAyari.ekKalemler) || [])
      .map((k) => k.id)
      .filter((id) => !kalan.has(id));
    if (silinen.length) {
      await db.collection(EKNOT).deleteMany({ odaId: oda._id, kalemId: { $in: silinen } });
    }
    await db
      .collection(ODALAR)
      .updateOne(
        { _id: oda._id },
        { $set: { notAyari: { ...r.ayar, guncellendi: new Date().toISOString() } } }
      );
    degisti(req);
    res.json({ success: true, notAyari: r.ayar });
  })
);

// ── KAYNAK KÜTÜPHANESİ BAĞLANTISI ──
// Oda dosyaları yetkiyle korunan oda klasöründe durur; kütüphane ise
// genel dosya deposunu (uploads/resources) ve `resources` koleksiyonunu
// kullanır. Aktarım iki yönde de dosyanın KOPYASIYLA yapılır: oda silinse
// de kütüphane kaydı yaşar, kütüphane kaydı silinse de odadaki ek kalır.
// Yalnız akademisyenin paylaşım ekleri arşivlenir — öğrenci teslimleri ASLA.
const KUTUPHANE = 'resources';
const KUTUPHANE_KLASORU = 'resources';
const GENEL_YUKLEME = path.join(__dirname, '..', 'uploads');

function kutuphaneDosyaYolu(fileUrl) {
  const m = /^\/api\/files\/download\/(.+)$/.exec(metin(fileUrl));
  if (!m) return '';
  const tam = path.resolve(GENEL_YUKLEME, decodeURIComponent(m[1]));
  return tam.startsWith(path.resolve(GENEL_YUKLEME) + path.sep) ? tam : '';
}

router.post(
  '/oda/:odaId/arsivle',
  requireAuth,
  yazmaLimiti,
  sar(async (req, res) => {
    const b = await odaVeRol(req, res, req.params.odaId);
    if (!b) return;
    if (b.rol !== 'hoca') return res.status(403).json({ error: 'Yalnız dersin akademisyeni.' });
    const { db, oda } = b;
    const K = await kural();
    const kategori = K.KUTUPHANE_KATEGORILERI[metin(req.body.kategori)]
      ? metin(req.body.kategori)
      : '';
    const idler = (Array.isArray(req.body.dosyaIdleri) ? req.body.dosyaIdleri : [])
      .map(metin)
      .filter(Boolean)
      .slice(0, 100);
    if (!idler.length) return res.status(400).json({ error: 'Arşivlenecek dosya seçin.' });
    const dosyalar = await db
      .collection(DOSYA)
      .find({ _id: { $in: idler }, odaId: oda._id, amac: 'ek' })
      .toArray();
    const icerikler = new Map(
      (
        await db
          .collection(ICERIK)
          .find({ _id: { $in: dosyalar.map((d) => d.icerikId).filter(Boolean) } })
          .toArray()
      ).map((i) => [i._id, i])
    );
    const zatenVar = new Set(
      (
        await db
          .collection(KUTUPHANE)
          .find({ 'kaynak.dosyaId': { $in: dosyalar.map((d) => d._id) } })
          .project({ 'kaynak.dosyaId': 1 })
          .toArray()
      ).map((r) => r.kaynak && r.kaynak.dosyaId)
    );
    const klasor = path.join(GENEL_YUKLEME, KUTUPHANE_KLASORU);
    fs.mkdirSync(klasor, { recursive: true });
    let eklenen = 0;
    for (const d of dosyalar) {
      if (zatenVar.has(d._id)) continue;
      const kaynakYol = path.join(UPLOAD_DIR, d.yol);
      if (!fs.existsSync(kaynakYol)) continue;
      const guvenliAd = metin(d.ad).replace(/[^a-zA-Z0-9._-]/g, '_') || d._id + '.' + d.uzanti;
      const dosyaAdi = Date.now() + '_' + guvenliAd;
      fs.copyFileSync(kaynakYol, path.join(klasor, dosyaAdi));
      const icerik = icerikler.get(d.icerikId) || {};
      await db.collection(KUTUPHANE).insertOne({
        title: metin(d.ad).replace(/\.[^.]+$/, '') || 'Ders materyali',
        description: [metin(icerik.baslik), K.donemEtiketi(oda.donem) + ' ders odasından']
          .filter(Boolean)
          .join(' — '),
        category: kategori || K.onerilenKategori(d.uzanti, icerik.tur),
        courseCode: metin(oda.dersKod).toLocaleUpperCase('tr-TR'),
        fileName: d.ad,
        fileSize: (Number(d.boyut || 0) / (1024 * 1024)).toFixed(2) + ' MB',
        fileType: d.uzanti,
        fileUrl: '/api/files/download/' + KUTUPHANE_KLASORU + '/' + dosyaAdi,
        departmentId: metin(oda.departmentId),
        downloadCount: 0,
        ratings: {},
        averageRating: 0,
        ratingCount: 0,
        uploadedBy: metin(req.user.identifier),
        uploadedByName: metin(req.user.name || req.user.identifier),
        createdAt: new Date().toISOString(),
        kaynak: { tur: 'ders-odasi', odaId: oda._id, donem: oda.donem, dosyaId: d._id },
      });
      eklenen++;
    }
    try {
      const io = req.app && req.app.get && req.app.get('io');
      if (io) io.emit('db:write', { collections: [KUTUPHANE], at: new Date().toISOString() });
    } catch (_) {
      /* gerçek zamanlı kritik değil */
    }
    res.json({ success: true, eklenen, atlanan: dosyalar.length - eklenen });
  })
);

// Bu dersin kütüphanedeki kaynakları (ders koduyla, bütün dönemlerden).
router.get(
  '/oda/:odaId/kutuphane',
  requireAuth,
  sar(async (req, res) => {
    const b = await odaVeRol(req, res, req.params.odaId);
    if (!b) return;
    if (b.rol !== 'hoca') return res.status(403).json({ error: 'Yalnız dersin akademisyeni.' });
    const K = await kural();
    const kod = K.dersKodAnahtari(b.oda.dersKod);
    const tum = await b.db
      .collection(KUTUPHANE)
      .find({ courseCode: { $exists: true } })
      .project({
        title: 1,
        fileName: 1,
        category: 1,
        fileSize: 1,
        fileUrl: 1,
        createdAt: 1,
        kaynak: 1,
        _docId: 1,
      })
      .toArray();
    const kaynaklar = tum
      .filter((r) => kod && K.dersKodAnahtari(r.courseCode) === kod && metin(r.fileUrl))
      .map((r) => ({
        id: metin(r._docId || r._id),
        baslik: metin(r.title),
        dosyaAdi: metin(r.fileName),
        kategori: metin(r.category),
        boyut: metin(r.fileSize),
        tarih: metin(r.createdAt),
        donem: metin(r.kaynak && r.kaynak.donem),
      }))
      .sort((a, b2) => (a.tarih < b2.tarih ? 1 : -1));
    res.json({ kaynaklar });
  })
);

// Kütüphaneden seçilen kaynakları odaya EK olarak kopyalar; dönen ekler
// paylaşım formuna eklenir (yayınlanınca öğrenciler görür).
router.post(
  '/oda/:odaId/kutuphaneden',
  requireAuth,
  yazmaLimiti,
  sar(async (req, res) => {
    const b = await odaVeRol(req, res, req.params.odaId);
    if (!b) return;
    if (b.rol !== 'hoca') return res.status(403).json({ error: 'Yalnız dersin akademisyeni.' });
    const { db, oda } = b;
    const K = await kural();
    const idler = (Array.isArray(req.body.kaynakIdleri) ? req.body.kaynakIdleri : [])
      .map(metin)
      .filter(Boolean)
      .slice(0, 20);
    const oidler = idler.filter((x) => /^[0-9a-f]{24}$/i.test(x)).map((x) => new ObjectId(x));
    const kaynaklar = await db
      .collection(KUTUPHANE)
      .find({ $or: [{ _docId: { $in: idler } }, { _id: { $in: oidler } }] })
      .toArray();
    const kod = K.dersKodAnahtari(oda.dersKod);
    const ekler = [];
    const hatalar = [];
    for (const r of kaynaklar) {
      const ad = metin(r.fileName) || metin(r.title);
      if (K.dersKodAnahtari(r.courseCode) !== kod) {
        hatalar.push(ad + ': başka dersin kaynağı');
        continue;
      }
      const kaynakYol = kutuphaneDosyaYolu(r.fileUrl);
      if (!kaynakYol || !fs.existsSync(kaynakYol)) {
        hatalar.push(ad + ': dosya bulunamadı');
        continue;
      }
      const boyut = fs.statSync(kaynakYol).size;
      const karar = K.dosyaKarari({ ad, boyut }, DOSYA_MB);
      if (!karar.izin) {
        hatalar.push(ad + ': ' + karar.hata);
        continue;
      }
      const id = yeniId();
      const uzanti = K.dosyaUzantisi(ad);
      fs.mkdirSync(path.join(UPLOAD_DIR, oda._id), { recursive: true });
      const yol = path.join(oda._id, id + '.' + uzanti);
      fs.copyFileSync(kaynakYol, path.join(UPLOAD_DIR, yol));
      const kayit = {
        _id: id,
        odaId: oda._id,
        icerikId: '',
        amac: 'ek',
        ad,
        boyut,
        uzanti,
        yol,
        mime: '',
        yukleyen: metin(req.user.identifier),
        olusturuldu: new Date().toISOString(),
        kutuphaneKaynagi: metin(r._docId || r._id),
      };
      await db.collection(DOSYA).insertOne(kayit);
      ekler.push(dosyaGorunumu(kayit));
    }
    res.json({ success: true, ekler, hatalar });
  })
);

// Ek sütuna not girme (boş puan notu siler).
router.post(
  '/oda/:odaId/ek-not',
  requireAuth,
  yazmaLimiti,
  sar(async (req, res) => {
    const b = await odaVeRol(req, res, req.params.odaId);
    if (!b) return;
    if (b.rol !== 'hoca')
      return res.status(403).json({ error: 'Notu yalnız dersin akademisyeni verir.' });
    const { db, oda } = b;
    const kalemId = metin(req.body.kalemId);
    const no = metin(req.body.ogrenciNo);
    const kalem = ((oda.notAyari && oda.notAyari.ekKalemler) || []).find((k) => k.id === kalemId);
    if (!kalem) return res.status(404).json({ error: 'Not sütunu bulunamadı.' });
    const uyeler = await odaOgrencileri(db, oda);
    if (!uyeler.some((s) => s.no === no))
      return res.status(400).json({ error: 'Öğrenci bu derste kayıtlı değil.' });
    const K = await kural();
    const karar = K.puanKarari(req.body.puan, kalem.maks);
    if (!karar.gecerli) return res.status(400).json({ error: karar.hata });
    const _id = [oda._id, kalemId, no].join('|');
    if (karar.deger === '') {
      await db.collection(EKNOT).deleteOne({ _id });
    } else {
      await db.collection(EKNOT).updateOne(
        { _id },
        {
          $set: {
            odaId: oda._id,
            kalemId,
            ogrenciNo: no,
            puan: karar.deger,
            giren: metin(req.user && req.user.identifier),
            guncellendi: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
    }
    degisti(req);
    res.json({ success: true, puan: karar.deger });
  })
);

// ── DOSYA İNDİRME ──
router.get(
  '/dosya/:id',
  requireAuth,
  sar(async (req, res) => {
    const db = await getDbSafe();
    const d = await db.collection(DOSYA).findOne({ _id: metin(req.params.id) });
    if (!d) return res.status(404).json({ error: 'Dosya bulunamadı.' });
    const b = await odaVeRol(req, res, d.odaId);
    if (!b) return;
    // Teslim dosyasını yalnız sahibi, dersin hocası ve yetkili görür.
    if (d.amac === 'teslim' && b.rol === 'ogrenci' && metin(d.yukleyen) !== ogrenciNo(req.user)) {
      return res.status(403).json({ error: 'Bu dosyaya erişiminiz yok.' });
    }
    const yol = path.join(UPLOAD_DIR, metin(d.yol));
    if (!yol.startsWith(UPLOAD_DIR + path.sep) || !fs.existsSync(yol)) {
      return res.status(404).json({ error: 'Dosya diskte bulunamadı.' });
    }
    const satirIci =
      req.query.goster === '1' &&
      ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'txt'].includes(d.uzanti);
    res.setHeader(
      'Content-Disposition',
      (satirIci ? 'inline' : 'attachment') + "; filename*=UTF-8''" + encodeURIComponent(d.ad)
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(yol);
  })
);

// ── SON TARİH HATIRLATMASI ──
// Sunucu saatte bir çağırır (server/index.js): son tarihe 24 saatten az
// kalan ödevlerde teslim etmemiş öğrencilere bir kez haber verilir.
async function hatirlatmalar() {
  const db = await getDbSafe();
  const K = await kural();
  const odevler = await db
    .collection(ICERIK)
    .find({ tur: 'odev', hatirlatildi: { $ne: true } })
    .toArray();
  let gonderilen = 0;
  for (const od of odevler) {
    if (!K.hatirlatmaZamaniMi(od)) continue;
    const oda = await db.collection(ODALAR).findOne({ _id: od.odaId });
    if (!oda) continue;
    const teslimEdenler = new Set(
      (await db.collection(TESLIM).find({ icerikId: od._id, teslimEdildi: true }).toArray()).map(
        (t) => metin(t.ogrenciNo)
      )
    );
    const alicilar = (await odaOgrencileri(db, oda))
      .map((o) => o.no)
      .filter((no) => !teslimEdenler.has(no));
    await bildir(
      null,
      db,
      alicilar,
      K.bildirimMetni('hatirlatma', {
        dersKod: oda.dersKod,
        baslik: od.baslik,
        sonTarih: od.sonTarih,
      }),
      { odaId: oda._id, icerikId: od._id }
    );
    await db.collection(ICERIK).updateOne({ _id: od._id }, { $set: { hatirlatildi: true } });
    gonderilen += alicilar.length;
  }
  return { gonderilen };
}

module.exports = router;
module.exports.hatirlatmalar = hatirlatmalar;
module.exports.ODA_KOLEKSIYONLARI = KOLEKSIYONLAR;
