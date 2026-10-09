/**
 * DİJİTAL YOKLAMA — sunucu tarafı.
 *
 * Bu dosyanın tek bir işi var: öğrencinin okuttuğu kodun GERÇEKTEN o anda
 * o sınıftaki ekrandan okunduğuna karar vermek.
 *
 * ⚠ NEDEN AYRI BİR ROTA? Yoklama kaydı genel /api/db/write kapısından
 * yazılamaz. Yazılabilseydi öğrenci karekodu hiç okutmadan doğrudan
 * "durum: var" kaydı gönderirdi — karekodun dönmesi de, penceresi de
 * anlamsız kalırdı. Yoklama kaydını YALNIZ bu rota yazar ve yalnız kodu
 * doğruladıktan sonra yazar.
 *
 * ⚠ GİZLİ ANAHTAR (sirr) İSTEMCİYE YALNIZ OTURUMU AÇAN AKADEMİSYENE GİDER.
 * Öğrenciye giden hiçbir yanıtta yer almaz; `oturumuTemizle` her yanıtta
 * çağrılır ki ileride eklenecek bir alan yanlışlıkla sızdırmasın.
 *
 * ⚠ DOĞRULAMA SUNUCU SAATİYLE YAPILIR. Öğrencinin telefon saati ileri/geri
 * olabilir; kararı veren taraf onun cihazı değildir.
 *
 * Kural (kod üretimi, pencere, devamsızlık) istemciyle AYNI dosyadadır:
 * lib/yoklama.js. İkinci bir kopya tutulsaydı biri değişip öteki kalırdı ve
 * ders ortasında sınıftaki kimse yoklama veremezdi.
 */

const express = require('express');
const crypto = require('crypto');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { getDbSafe } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { profilBul: _profilBul } = require('../lib/akademisyen-kimlik');
const { kapsamNumaralari } = require('../lib/ogrenci-baglanti');

// Kural dosyası ESM; Node 22 tür algılamasıyla dinamik import sorunsuz.
let kuralSozu = null;
function kural() {
  if (!kuralSozu) kuralSozu = import('../../lib/yoklama.js');
  return kuralSozu;
}

let egitmenKuraliSozu = null;
function egitmenKurali() {
  if (!egitmenKuraliSozu) egitmenKuraliSozu = import('../../lib/ders-egitmenleri.js');
  return egitmenKuraliSozu;
}

let cihazKuraliSozu = null;
function cihazKurali() {
  if (!cihazKuraliSozu) cihazKuraliSozu = import('../../lib/cihaz-kimlik.js');
  return cihazKuraliSozu;
}

const router = express.Router();

// Canlı liste hız sınırı.
//
// ⚠ SINIR GERÇEK KULLANIMA GÖRE HESAPLANMALI. Tam ekran yoklama ekranı bu
// uca HER 3 SANİYEDE BİR sorar (bkz. akademisyen-sayfam.jsx →
// TamEkranYoklama): 15 dakikada 300 istek eder. 120'lik bir sınır, iki
// saatlik bir dersin daha altıncı dakikasında listeyi dondurur ve
// akademisyen sınıfta kimin okuttuğunu göremez hâle gelirdi — hatayı da
// fark etmez, liste sadece güncellenmeyi bırakır.
//
// 450: 300 (bir pencerelik normal yoklama) + yeniden açma, ağ tekrarları ve
// aynı hocanın arka arkaya iki ders yapması için pay. Kötüye kullanımı
// engellemeye yeter; meşru dersi kesmez.
const OTURUM_LISTE_ARALIGI_SN = 3;
//
// ⚠ SINIR KULLANICI BAŞINADIR, IP BAŞINA DEĞİL. Kampüs ağı dışarıya tek
// adresten çıkıyor; IP başına sınırda aynı anda yoklama alan iki hoca
// birbirinin hakkını tüketir, ikincisinin listesi dersin ortasında donardı.
const oturumListeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Math.ceil(((15 * 60) / OTURUM_LISTE_ARALIGI_SN) * 1.5),
  keyGenerator: (req) =>
    req.user && req.user.identifier ? 'k:' + String(req.user.identifier) : ipKeyGenerator(req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Canlı liste çok sık yenilendi. Birkaç dakika sonra tekrar deneyin.' },
});

const OTURUMLAR = 'yoklama_oturumlari';
const KAYITLAR = 'yoklama_kayitlari';
const CIHAZLAR = 'student_devices';

/** Akademik dönem anahtarı — cihaz değiştirme kotası dönem başına sıfırlanır. */
function donemAnahtari(d) {
  const t = d instanceof Date ? d : new Date();
  const ay = t.getMonth() + 1;
  // Şubat–Temmuz bahar, kalanı güz (fakültenin takvimiyle kabaca aynı).
  return ay >= 2 && ay <= 7 ? t.getFullYear() + '-bahar' : t.getFullYear() + '-guz';
}

const metin = (v) => String(v == null ? '' : v).trim();

/**
 * Bugünün tarihi TÜRKİYE SAATİYLE (YYYY-AA-GG).
 * ⚠ toISOString() UTC verir: gece 00:00–03:00 arasında açılan yoklama bir
 * önceki güne yazılır, haftası da kayardı.
 */
function bugunTr(t) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(t || new Date());
}

/** Akademisyen adı karşılaştırması — unvan ve Türkçe büyük/küçük farkı ayıklanır. */
function adAnahtari(ad) {
  return metin(ad)
    .replace(/(prof\.?|doç\.?|dr\.?|öğr\.?|gör\.?|arş\.?|üyesi|dç\.?)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('tr');
}

// Hafta seçiminin üst sınırı (lib/yoklama-listesi.js HAFTA_SINIRI ile aynı).
const HAFTA_TAVANI = 20;
/** 1..HAFTA_TAVANI arası tam sayı ya da null. */
function haftaOku(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= HAFTA_TAVANI ? n : null;
}

/** Yanıta konacak güvenli oturum gövdesi — gizli anahtar ASLA geçmez. */
function oturumuTemizle(o, sirrDahil) {
  if (!o) return null;
  const g = {
    id: metin(o.id || o._id),
    dersId: metin(o.dersId),
    // Eski oturumlarda alan yok; teori sayılır (lib/ders-parcasi.js).
    parca: metin(o.parca) === 'uygulama' ? 'uygulama' : 'teori',
    dersKodu: metin(o.dersKodu),
    dersAdi: metin(o.dersAdi),
    dersSaati: Number(o.dersSaati) > 0 ? Number(o.dersSaati) : 1,
    akademisyen: metin(o.akademisyen),
    departmentId: metin(o.departmentId),
    tarih: metin(o.tarih),
    hafta: haftaOku(o.hafta),
    acik: !!o.acik,
    baslangic: o.baslangic || null,
    bitis: o.bitis || null,
  };
  if (sirrDahil) g.sirr = metin(o.sirr);
  return g;
}

async function oturumBul(db, id) {
  const kimlik = metin(id);
  if (!kimlik) return null;
  return db.collection(OTURUMLAR).findOne({ id: kimlik });
}

/** İstek sahibi bu oturumun akademisyeni mi? */
function sahibiMi(oturum, user) {
  if (!oturum || !user) return false;
  if (user.role === 'admin') return true;
  return adAnahtari(oturum.akademisyen) === adAnahtari(user.identifier);
}

// ── BİRLİKTE YOKLAMA (aynı dersin şube / müfredat kayıtları) ──
// Aynı sınıfta birlikte işlenen kayıtlar için her kayda AYRI oturum açılır
// (devam listesi kayıt başına kalır) ama hepsi AYNI gizli anahtarı ve
// `grupId`yi taşır. Kod, grubun ana oturumunun kimliğiyle üretilir; böylece
// tahtadaki tek karekod ve tek kısa kod bütün kayıtların öğrencilerinde
// geçerlidir (bkz. lib/ders-ayirt.js).
const kodKimligi = (o) => metin(o && (o.grupId || o.id));
const grupOzeti = (grup) =>
  (grup || []).map((o) => ({
    id: metin(o.id),
    dersId: metin(o.dersId),
    dersKodu: metin(o.dersKodu),
    dersAdi: metin(o.dersAdi),
  }));

async function grupOturumlari(db, oturum) {
  if (!oturum) return [];
  if (!metin(oturum.grupId)) return [oturum];
  return db
    .collection(OTURUMLAR)
    .find({ grupId: metin(oturum.grupId) })
    .toArray();
}

async function dersVeYetki(db, dersId, user) {
  const ders = await db
    .collection('sinav_dersler')
    .findOne({ $or: [{ id: dersId }, { _docId: dersId }] });
  if (ders && user.role !== 'admin') {
    const E = await egitmenKurali();
    const egitmenler = E.dersEgitmenleri(ders).concat(
      E.egitmenleriCoz(
        [].concat(ders.instructor || [], ders.instructors || [], ders.egitmenler || [])
      )
    );
    const benim = egitmenler.some((e) => E.ayniEgitmen(e, user.identifier));
    if (egitmenler.length > 0 && !benim) return { ders, yetki: false };
  }
  return { ders, yetki: true };
}

// ══════════════════════════════════════════════════════════════
// POST /api/yoklama/oturum — yoklamayı aç (akademisyen)
// ══════════════════════════════════════════════════════════════
router.post('/oturum', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'professor' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Yoklamayı yalnız akademisyen açabilir.' });
    }
    const g = req.body || {};
    const dersId = metin(g.dersId);
    if (!dersId) return res.status(400).json({ error: 'Ders seçilmedi.' });

    const db = await getDbSafe();

    // ── Hoca yalnız KENDİ dersinin yoklamasını açabilir ──
    // İstemci ders listesini zaten süzüyor; ama kapı burada. Ders kaydındaki
    // eğitmen adı istekteki kimlikle eşleşmiyorsa oturum açılmaz.
    // ⚠ Hoca alanı `professors` (dizi) / `professor` (metin) — istemcideki
    // dersEgitmeniMi ile AYNI kural (lib/ders-egitmenleri.js). Eskiden yalnız
    // `instructor` alanına bakılıyordu; gerçek kayıtlarda bu alan olmadığı
    // için kontrol hiç işlemiyor, herhangi bir hoca herhangi bir dersin
    // yoklamasını açabiliyordu.
    const { ders, yetki } = await dersVeYetki(db, dersId, user);
    if (!yetki) return res.status(403).json({ error: 'Bu ders size tanımlı değil.' });

    // Birlikte yoklaması alınacak öteki kayıtlar (aynı dersin başka şube ya
    // da müfredatı). Her biri de hocanın KENDİ dersi olmalı.
    const ekIdler = [
      ...new Set((Array.isArray(g.ekDersler) ? g.ekDersler : []).map(metin).filter(Boolean)),
    ]
      .filter((x) => x !== dersId)
      .slice(0, 6);
    const ekDersler = [];
    for (const ekId of ekIdler) {
      const ek = await dersVeYetki(db, ekId, user);
      if (!ek.yetki || !ek.ders) {
        return res
          .status(403)
          .json({ error: 'Birlikte seçilen derslerden biri size tanımlı değil.' });
      }
      ekDersler.push({ id: ekId, ders: ek.ders });
    }

    // ── TEORİ Mİ, UYGULAMA MI? ──
    // Uygulaması olan derste iki ayrı yoklama yürür; oturum hangi parçaya
    // ait olduğunu taşır. ⚠ `parca` alanı OLMAYAN eski oturumlar TEORİ
    // sayılır (istemcideki kuralla aynı: lib/ders-parcasi.js).
    const parca = metin(g.parca).toLocaleLowerCase('tr') === 'uygulama' ? 'uygulama' : 'teori';
    // Aynı ders+parça için açık bir oturum varsa ikincisini açma: iki ekran
    // iki farklı gizli anahtarla dönerse öğrencinin okuttuğu kod "başka
    // oturum" diye reddedilir. Teori ile uygulama BİRBİRİNİ ENGELLEMEZ.
    const parcaSuzgeci =
      parca === 'uygulama'
        ? { parca: 'uygulama' }
        : { $or: [{ parca: 'teori' }, { parca: { $exists: false } }, { parca: '' }] };
    // ── HANGİ HAFTA? ──
    // Akademisyen yoklamanın dönemin kaçıncı haftasına ait olduğunu seçer
    // (istemci önerilen haftayı doldurur). Seçilmezse devam listesi haftayı
    // tarihten çıkarır (lib/yoklama-listesi.js).
    const hafta = haftaOku(g.hafta);
    const mevcut = await db.collection(OTURUMLAR).findOne({ dersId, acik: true, ...parcaSuzgeci });
    if (mevcut) {
      const grup = await grupOturumlari(db, mevcut);
      if (hafta && Number(mevcut.hafta) !== hafta) {
        await db
          .collection(OTURUMLAR)
          .updateMany({ id: { $in: grup.map((x) => x.id) } }, { $set: { hafta } });
        mevcut.hafta = hafta;
      }
      return res.json({
        oturum: { ...oturumuTemizle(mevcut, true), grup: grupOzeti(grup) },
        sunucuZamani: Date.now(),
      });
    }
    // Birlikte seçilen kaydın kendi açık oturumu varsa grup kurulmaz: iki
    // ayrı kod tahtada yarışırdı.
    for (const ek of ekDersler) {
      const acik = await db
        .collection(OTURUMLAR)
        .findOne({ dersId: ek.id, acik: true, ...parcaSuzgeci });
      if (acik) {
        return res.status(409).json({
          error:
            metin(ek.ders.code || ek.ders.name) +
            ' için açık bir yoklama var; önce onu bitirin ya da birlikte seçmeyin.',
        });
      }
    }

    const oturumId = 'yk-' + crypto.randomBytes(9).toString('hex');
    const sirr = crypto.randomBytes(32).toString('hex');
    const oturum = {
      id: oturumId,
      // 32 baytlık gizli anahtar — oturuma özel, her açılışta yeniden üretilir.
      sirr,
      ...(ekDersler.length > 0 ? { grupId: oturumId } : {}),
      dersId,
      parca,
      dersKodu: metin(g.dersKodu || (ders && (ders.code || ders.kod))),
      dersAdi: metin(g.dersAdi || (ders && (ders.name || ders.ad))),
      dersSaati: Number(g.dersSaati) > 0 ? Number(g.dersSaati) : 1,
      akademisyen: metin(user.identifier),
      departmentId: metin(g.departmentId || (ders && ders.departmentId)),
      tarih: bugunTr(),
      hafta,
      acik: true,
      baslangic: new Date().toISOString(),
      bitis: null,
    };
    // `_docId`: genel okuma ucu kimliği `_docId || _id`'den kurar; kayıtlar
    // oturuma `id` ile bağlı olduğundan ikisi aynı olmalı.
    await db.collection(OTURUMLAR).insertOne({ ...oturum, _docId: oturumId });
    const grup = [oturum];
    for (const ek of ekDersler) {
      const ekId = 'yk-' + crypto.randomBytes(9).toString('hex');
      const ekOturum = {
        ...oturum,
        id: ekId,
        grupId: oturumId,
        dersId: ek.id,
        dersKodu: metin(ek.ders.code || ek.ders.kod),
        dersAdi: metin(ek.ders.name || ek.ders.ad),
        departmentId: metin(ek.ders.departmentId || oturum.departmentId),
      };
      await db.collection(OTURUMLAR).insertOne({ ...ekOturum, _docId: ekId });
      grup.push(ekOturum);
    }
    return res.json({
      oturum: { ...oturumuTemizle(oturum, true), grup: grupOzeti(grup) },
      sunucuZamani: Date.now(),
    });
  } catch (e) {
    console.error('[yoklama]', e && e.message);
    return res.status(500).json({ error: 'Yoklama açılamadı.' });
  }
});

// ── ÖĞRENCİNİN DERSLERİ ──
// ⚠ SEÇİM İKİ YERDE OLABİLİR: dönem bazlı `student_courses` (yeni yol, Benim
// Sayfam oraya yazıyor) ve eski `students.myCourseIds`. Yalnız eskisine
// bakmak, yeni yoldan ders seçen öğrenciyi "kayıtlı değil" sayardı — karar
// istemcide lib/ogrenci-ders-secimi.js'te, burada da aynı birleşim uygulanır.
//
// Elle yazılan kısa kod hangi oturuma ait olduğunu SÖYLEMEZ; sunucu oturumu
// bu kümeden bulur (öğrencinin derslerinden açık olanları dener).
async function ogrenciVeDersleri(db, ogrNo) {
  const ogrenci = await db.collection('students').findOne({ studentNumber: ogrNo });
  // Belge kimliği `{öğrenciNo}__{dönem}`; `studentNumber` alanı sunucu
  // tarafında damgalanıyor ama ondan ÖNCE yazılmış kayıtlarda olmayabilir.
  // Numara JWT'den gelir; yine de desene kaçış uygulanır.
  const noDeseni = ogrNo.replace(/[^A-Za-z0-9]/g, '');
  const donemKayitlari = await db
    .collection('student_courses')
    .find(
      noDeseni
        ? { $or: [{ studentNumber: ogrNo }, { _docId: { $regex: '^' + noDeseni + '__' } }] }
        : { studentNumber: ogrNo }
    )
    .toArray()
    .catch(() => []);
  const dersKumesi = new Set();
  (Array.isArray(donemKayitlari) ? donemKayitlari : []).forEach((d) => {
    (Array.isArray(d && d.courseIds) ? d.courseIds : []).forEach((id) => {
      const v = metin(id);
      if (v) dersKumesi.add(v);
    });
  });
  (Array.isArray(ogrenci && ogrenci.myCourseIds) ? ogrenci.myCourseIds : []).forEach((id) => {
    const v = metin(id);
    if (v) dersKumesi.add(v);
  });
  return { ogrenci, dersleri: [...dersKumesi] };
}

// ── ELLE KOD GİRİŞİ: DENEME SINIRI ──
// Altı haneli kod tahmin edilebilir bir şeydir: bir pencerede bir milyon
// olasılık, sınırsız deneme hakkı olan biri için çok değildir. Sınır
// ÖĞRENCİ BAŞINA konur; sınıftaki herkes aynı ağdan çıktığı için IP başına
// sınır meşru öğrencileri keserdi. Normal kullanımda bir öğrenci bir derste
// bir-iki istek gönderir; 30 deneme bolca yeter.
//
// ⚠ SAYAÇ BELLEKTE DURUR: sunucu yeniden başlarsa sıfırlanır. Amaç kaba
// kuvveti YAVAŞLATMAKTIR; tek savunma bu değildir (kod döner, cihaz bağlıdır,
// son söz akademisyenin listesindedir).
const DENEME_PENCERESI_MS = 10 * 60 * 1000;
const DENEME_SINIRI = 30;
const denemeler = new Map();

function denemeHakkiVarMi(anahtar) {
  const simdi = Date.now();
  const liste = (denemeler.get(anahtar) || []).filter((t) => simdi - t < DENEME_PENCERESI_MS);
  liste.push(simdi);
  denemeler.set(anahtar, liste);
  // Bellek sızdırmasın: ara sıra eskimiş anahtarlar atılır.
  if (denemeler.size > 5000) {
    for (const [k, v] of denemeler) {
      if (!v.length || simdi - v[v.length - 1] >= DENEME_PENCERESI_MS) denemeler.delete(k);
    }
  }
  return liste.length <= DENEME_SINIRI;
}

// ══════════════════════════════════════════════════════════════
// POST /api/yoklama/imzala — kodu okut (öğrenci)
// ══════════════════════════════════════════════════════════════
router.post('/imzala', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { kodDogrula, kisaKodDogrula, kisaKodNormalle, dogrulamaMesaji } = await kural();
    const ogrNo = metin(user && (user.studentNumber || user.identifier));
    if (!user || user.role !== 'student' || !ogrNo) {
      return res.status(403).json({ error: 'Yoklamayı yalnız öğrenci verebilir.' });
    }

    if (!denemeHakkiVarMi(ogrNo)) {
      return res.status(429).json({
        ok: false,
        sebep: 'cok_deneme',
        error: 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.',
      });
    }

    const ham = metin((req.body || {}).kod);
    const db = await getDbSafe();
    const { ogrenci, dersleri } = await ogrenciVeDersleri(db, ogrNo);

    // ── İKİ GİRİŞ YOLU ──
    // 1) Karekod: kodun kendisi hangi oturum olduğunu söyler.
    // 2) Elle yazılan altı hane: oturumu SÖYLEMEZ. Sunucu, öğrencinin
    //    derslerinden AÇIK olan oturumları dener; kod hangisinde tutarsa
    //    yoklama oraya yazılır. (Kamerası olmayan öğrencinin tek yolu budur.)
    const kisa = kisaKodNormalle(ham);
    let oturum = null;
    let sonuc = null;
    const simdi = Date.now();

    if (!kisa) {
      const parca = ham.split('.');
      oturum = parca.length === 3 ? await oturumBul(db, parca[0]) : null;
      if (!oturum) {
        return res.status(400).json({ ok: false, sebep: 'bicim', error: dogrulamaMesaji('bicim') });
      }
      if (!oturum.acik) {
        return res
          .status(400)
          .json({ ok: false, sebep: 'kapali', error: dogrulamaMesaji('kapali') });
      }
      // ⚠ KARAR SUNUCU SAATİYLE VERİLİR.
      sonuc = kodDogrula(ham, { sirr: oturum.sirr, oturumId: kodKimligi(oturum), simdi });
    } else {
      if (dersleri.length === 0) {
        return res
          .status(400)
          .json({ ok: false, sebep: 'kisa_ders_yok', error: dogrulamaMesaji('kisa_ders_yok') });
      }
      const acikOturumlar = await db
        .collection(OTURUMLAR)
        .find({ acik: true, dersId: { $in: dersleri } })
        .limit(30)
        .toArray();
      for (const o of acikOturumlar) {
        const d = kisaKodDogrula(ham, { sirr: o.sirr, oturumId: kodKimligi(o), simdi });
        if (d.gecerli) {
          oturum = o;
          sonuc = d;
          break;
        }
      }
      if (!oturum) {
        // Hangi oturumda tutmadığını söylemeyiz: deneme yanılmaya ipucu olur.
        return res
          .status(400)
          .json({ ok: false, sebep: 'kisa_kod', error: dogrulamaMesaji('kisa_kod') });
      }
    }

    if (!sonuc.gecerli) {
      return res
        .status(400)
        .json({ ok: false, sebep: sonuc.sebep, error: dogrulamaMesaji(sonuc.sebep) });
    }

    // Birlikte yoklama: karekod grubun ana oturumunu gösterir; öğrenci
    // grubun BAŞKA bir kaydına (öteki şube/müfredat) kayıtlıysa yoklama o
    // kaydın oturumuna yazılır.
    if (metin(oturum.grupId) && !dersleri.includes(metin(oturum.dersId))) {
      const kardes = (await grupOturumlari(db, oturum)).find(
        (o) => o.acik && dersleri.includes(metin(o.dersId))
      );
      if (kardes) oturum = kardes;
    }

    // Öğrenci bu dersi alıyor mu? (küme yukarıda çözüldü)
    if (dersleri.length > 0 && !dersleri.includes(metin(oturum.dersId))) {
      return res
        .status(403)
        .json({ ok: false, sebep: 'kayitli_degil', error: dogrulamaMesaji('kayitli_degil') });
    }

    // Aynı oturumda ikinci okutma yeni kayıt açmaz (öğrenci iki kez okutmuş
    // olabilir); "zaten alındı" der ve başarıyla döner.
    const zaten = await db
      .collection(KAYITLAR)
      .findOne({ oturumId: oturum.id, studentNumber: ogrNo });
    if (zaten) {
      return res.json({
        ok: true,
        zaten: true,
        ders: oturum.dersAdi,
        mesaj: 'Yoklamanız zaten alınmıştı.',
      });
    }

    // ══════════════════════════════════════════════════════════════
    // CİHAZ KONTROLLERİ
    //
    // Tehdit: A şifresini B'ye verir, B kendi telefonundan A'nın hesabına
    // girip okutur. Dönen karekod bunu görmez — kod gerçekten o sınıftan,
    // o anda okunmuştur. Kural ve gerekçeler lib/cihaz-kimlik.js'te.
    //
    // ⚠ PARMAK İZİ İSTEMCİDEN GELİR ve geliştirici konsolu açabilen biri
    // onu değiştirebilir. Bu katman "şifreni ver" kolaylığını ortadan
    // kaldırır ve iz bırakır; kararlı bir saldırganı durdurmaz. Son söz
    // akademisyenin canlı listesindedir.
    // ══════════════════════════════════════════════════════════════
    const { oturumdaBaskasiKullandiMi, baglamaKarari, baglamaYamasi, cihazMesaji } =
      await cihazKurali();
    const gelenCihaz = (req.body || {}).cihaz || {};
    const cihaz = { id: metin(gelenCihaz.id).slice(0, 80), iz: metin(gelenCihaz.iz).slice(0, 80) };
    const donem = donemAnahtari();

    // 1) OTURUM İÇİ TEKİLLİK — bir cihaz (tarayıcı kimliği), bir öğrenci.
    // Birlikte yoklamada tekillik bütün grup içindir: aynı telefon iki
    // kaydın öğrencisi adına okutamaz.
    const grupIdleri = (await grupOturumlari(db, oturum)).map((o) => o.id);
    const oturumKayitlari = await db
      .collection(KAYITLAR)
      .find({ oturumId: { $in: grupIdleri.length ? grupIdleri : [oturum.id] } })
      .project({ studentNumber: 1, cihazId: 1, cihazIz: 1, _id: 0 })
      .toArray();
    const cakisma = oturumdaBaskasiKullandiMi(oturumKayitlari, cihaz, ogrNo);
    if (cakisma.cakisma) {
      // Denemenin kendisi de kayda değer: hoca "kim kimin yerine okutmaya
      // çalıştı" sorusunu sonradan sorabilmeli.
      try {
        await db.collection('yoklama_uyarilari').insertOne({
          id: 'yk-u-' + crypto.randomBytes(8).toString('hex'),
          oturumId: oturum.id,
          dersId: metin(oturum.dersId),
          tarih: metin(oturum.tarih),
          tur: 'cihaz_paylasimi',
          studentNumber: ogrNo,
          cakisanOgrenci: metin(cakisma.ogrenciNo),
          cihazId: cihaz.id,
          cihazIz: cihaz.iz,
          zaman: new Date().toISOString(),
        });
      } catch (_) {
        /* uyarı kaydı yazılamazsa da asıl karar değişmez */
      }
      return res
        .status(403)
        .json({ ok: false, sebep: 'cihaz_paylasimi', error: cihazMesaji('cihaz_paylasimi') });
    }

    // 2) HESABA BAĞLI CİHAZ — kota ile esner, kilitlemez.
    const cihazKaydi = await db.collection(CIHAZLAR).findOne({ id: ogrNo });
    const karar = baglamaKarari(cihazKaydi, cihaz, { donem });
    if (karar.durum === 'kilitli') {
      return res
        .status(403)
        .json({ ok: false, sebep: 'cihaz_kilitli', error: cihazMesaji('cihaz_kilitli') });
    }
    if (karar.baglanacak) {
      const yama = baglamaYamasi(cihazKaydi, cihaz, karar, { donem });
      await db
        .collection(CIHAZLAR)
        .updateOne(
          { id: ogrNo },
          { $set: Object.assign({ id: ogrNo, studentNumber: ogrNo }, yama) },
          { upsert: true }
        );
    }

    const kayitId = 'yk-k-' + crypto.randomBytes(8).toString('hex');
    await db.collection(KAYITLAR).insertOne({
      id: kayitId,
      // Genel okuma ucu kimliği `_docId || _id`'den kurar; ikisi aynı kalsın.
      _docId: kayitId,
      oturumId: oturum.id,
      dersId: metin(oturum.dersId),
      // Oturum hangi parçanınsa kayıt da onundur; eski kayıtlarda alan yok
      // ve okuyanlar onları teoriye sayar (lib/ders-parcasi.js).
      parca: metin(oturum.parca) === 'uygulama' ? 'uygulama' : 'teori',
      dersKodu: metin(oturum.dersKodu),
      dersAdi: metin(oturum.dersAdi),
      dersSaati: Number(oturum.dersSaati) > 0 ? Number(oturum.dersSaati) : 1,
      tarih: metin(oturum.tarih),
      studentNumber: ogrNo,
      adSoyad: metin(
        (ogrenci && [ogrenci.firstName, ogrenci.lastName].filter(Boolean).join(' ')) || ''
      ),
      departmentId: metin(oturum.departmentId),
      durum: 'var',
      elle: false,
      // Gecikme kayda geçer: sürekli sınırda okutan bir numara, ekran
      // görüntüsü paylaşımının izidir.
      gecikmeMs: Number(sonuc.gecikmeMs) || 0,
      // Cihaz izi kayda geçer: oturum içi tekillik kontrolü bunu okur ve
      // akademisyen "yeni cihaz" işaretini listede görür.
      cihazId: cihaz.id,
      cihazIz: cihaz.iz,
      yeniCihaz: karar.durum === 'degisti',
      // Yalnız parmak izi başka bir öğrencininkiyle aynı (aynı model telefon
      // ya da gizli sekme): reddedilmez, akademisyene uyarı olarak görünür.
      ayniIzOgrenci: cakisma.izEslesti ? metin(cakisma.ogrenciNo) : '',
      zaman: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      zaten: false,
      ders: oturum.dersAdi,
      mesaj: 'Yoklamanız alındı.',
      uyari: karar.durum === 'degisti' ? cihazMesaji('cihaz_degisti', karar) : '',
    });
  } catch (e) {
    console.error('[yoklama]', e && e.message);
    return res.status(500).json({ error: 'Yoklama alınamadı.' });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /api/yoklama/oturum/:id — canlı liste (akademisyen)
// ══════════════════════════════════════════════════════════════
router.get('/oturum/:id', requireAuth, oturumListeLimiter, async (req, res) => {
  try {
    const db = await getDbSafe();
    const oturum = await oturumBul(db, req.params.id);
    if (!oturum) return res.status(404).json({ error: 'Oturum bulunamadı.' });
    if (!sahibiMi(oturum, req.user)) {
      return res.status(403).json({ error: 'Bu yoklama size ait değil.' });
    }
    const grup = await grupOturumlari(db, oturum);
    const katilimlar = await db
      .collection(KAYITLAR)
      .find({ oturumId: { $in: grup.map((o) => o.id) } })
      .project({
        dersId: 1,
        studentNumber: 1,
        adSoyad: 1,
        durum: 1,
        zaman: 1,
        elle: 1,
        yeniCihaz: 1,
        ayniIzOgrenci: 1,
        _id: 0,
      })
      .toArray();
    return res.json({
      oturum: { ...oturumuTemizle(oturum, sahibiMi(oturum, req.user)), grup: grupOzeti(grup) },
      katilimlar,
      sunucuZamani: Date.now(),
    });
  } catch (e) {
    console.error('[yoklama]', e && e.message);
    return res.status(500).json({ error: 'Liste alınamadı.' });
  }
});

// ── Akademisyenin elle işaretleri (kapatırken ve sonradan düzeltirken) ──
async function elleYaz(db, oturum, durumlar) {
  // ── Akademisyenin elle işaretleri ──
  // Telefonu bozuk / pili biten öğrenci yüzünden yoklama tutulamaz
  // olmamalı; hoca "var" diyebilir. Kayıt `elle: true` ile işaretlenir ki
  // sonradan hangi yoklamanın elle girildiği görülebilsin.
  const elle = durumlar && typeof durumlar === 'object' ? durumlar : {};
  const gecerli = new Set(['var', 'yok', 'izinli']);
  // ⚠ TEK TEK YAZILMIYOR. Her öğrenci için ayrı `updateOne` demek, 100
  // kişilik sınıfta 100 ardışık gidiş-dönüş demekti: yoklamayı bitirmek
  // saniyeler sürüyor, hocanın ekranı o süre boyunca kilitli kalıyordu.
  // Tek `bulkWrite` ile hepsi bir istekte gider.
  const yazmalar = [];
  const yeniKayitId = () => 'yk-k-' + crypto.randomBytes(8).toString('hex');
  for (const [no, durum] of Object.entries(elle)) {
    const ogrNo = metin(no);
    const d = metin(durum);
    if (!ogrNo || !gecerli.has(d)) continue;
    yazmalar.push({
      updateOne: {
        filter: { oturumId: oturum.id, studentNumber: ogrNo },
        update: {
          $set: {
            durum: d,
            elle: true,
            zaman: new Date().toISOString(),
            dersId: metin(oturum.dersId),
            dersKodu: metin(oturum.dersKodu),
            dersAdi: metin(oturum.dersAdi),
            dersSaati: Number(oturum.dersSaati) > 0 ? Number(oturum.dersSaati) : 1,
            tarih: metin(oturum.tarih),
            departmentId: metin(oturum.departmentId),
          },
          $setOnInsert: (() => {
            const id = yeniKayitId();
            return { id, _docId: id, parca: metin(oturum.parca) || 'teori' };
          })(),
        },
        upsert: true,
      },
    });
  }
  if (yazmalar.length > 0) {
    // ordered:false → bir satırdaki hata ötekileri engellemesin; yoklamanın
    // geri kalanı yazılsın.
    await db.collection(KAYITLAR).bulkWrite(yazmalar, { ordered: false });
  }
  return yazmalar.length;
}

// ══════════════════════════════════════════════════════════════
// POST /api/yoklama/kapat — yoklamayı bitir ve listeyi yaz (akademisyen)
// ══════════════════════════════════════════════════════════════
// ── YOKLAMA BİLDİRİMLERİ ──
// Yoklama alınınca öğrenciye hiçbir şey gitmiyordu: "yok" yazılan öğrenci
// bunu ancak devamsızlık sınırına dayandığında fark ediyordu. Kapanışta
// "yok" / "izinli" sayılan ve hocanın elle "var" yazdığı öğrenciye (kendisi
// okutmadığı için ekranda onay görmemiştir) zil bildirimi gider; sonradan
// yapılan düzeltme de bildirilir. Karekodla "var" olan öğrenci onayı zaten
// telefonunda gördü — her derste bildirim yağdırmak zili anlamsızlaştırırdı.
const DURUM_ADI = { var: 'Var', yok: 'Yok', izinli: 'İzinli' };

function yoklamaBildirimi(oturum, no, durum, duzeltme) {
  const ders = [metin(oturum.dersKodu), metin(oturum.dersAdi)].filter(Boolean).join(' ');
  const tarih = metin(oturum.tarih).split('-').reverse().join('.');
  return {
    recipientType: 'user',
    recipientId: no,
    module: 'yoklama',
    type: 'yoklama_' + durum,
    title: duzeltme ? 'Yoklama kaydınız düzeltildi' : 'Yoklama · ' + (ders || 'ders'),
    body:
      (ders ? ders + ' — ' : '') +
      (tarih ? tarih + ' tarihli yoklamada' : 'Yoklamada') +
      ' durumunuz: ' +
      (DURUM_ADI[durum] || durum) +
      (durum === 'var' && !duzeltme ? ' (akademisyen işaretledi)' : '') +
      '.',
    link: 'benim',
    meta: { kaynak: 'yoklama', oturumId: metin(oturum.id), dersId: metin(oturum.dersId) },
    readBy: [],
    createdAt: new Date().toISOString(),
  };
}

// Dersin kayıtlı öğrencileri (dönem ders kaydı + öğrencinin ders listesi).
async function dersListesi(db, dersId) {
  const id = metin(dersId);
  if (!id) return [];
  const nolar = new Set();
  const donem = await db
    .collection('student_courses')
    .find({ courseIds: id }, { projection: { studentNumber: 1, _docId: 1 } })
    .toArray()
    .catch(() => []);
  donem.forEach((d) => {
    const no = metin(d.studentNumber) || metin(d._docId).split('__')[0];
    if (no) nolar.add(no);
  });
  const ogr = await db
    .collection('students')
    .find({ myCourseIds: id }, { projection: { studentNumber: 1 } })
    .toArray()
    .catch(() => []);
  ogr.forEach((o) => metin(o.studentNumber) && nolar.add(metin(o.studentNumber)));
  return [...nolar];
}

async function bildirimleriYaz(req, db, liste) {
  if (!liste.length) return;
  try {
    await db.collection('notifications').insertMany(liste);
    const io = req.app && req.app.get && req.app.get('io');
    if (io) io.emit('db:write', { collections: ['notifications'], at: new Date().toISOString() });
  } catch (e) {
    console.warn('[yoklama] bildirim yazılamadı:', e && e.message);
  }
}

async function kapanisBildirimleri(req, db, grup) {
  const liste = [];
  for (const o of grup) {
    const kayitlar = await db
      .collection(KAYITLAR)
      .find({ oturumId: o.id }, { projection: { studentNumber: 1, durum: 1, elle: 1 } })
      .toArray();
    const durumu = new Map(kayitlar.map((k) => [metin(k.studentNumber), k]));
    const nolar = new Set(await dersListesi(db, o.dersId));
    kayitlar.forEach((k) => metin(k.studentNumber) && nolar.add(metin(k.studentNumber)));
    nolar.forEach((no) => {
      const k = durumu.get(no);
      const durum = (k && metin(k.durum)) || 'yok';
      if (durum === 'var' && !(k && k.elle)) return;
      liste.push(yoklamaBildirimi(o, no, durum, false));
    });
  }
  await bildirimleriYaz(req, db, liste);
}

router.post('/kapat', requireAuth, async (req, res) => {
  try {
    const db = await getDbSafe();
    const g = req.body || {};
    const oturum = await oturumBul(db, g.oturumId);
    if (!oturum) return res.status(404).json({ error: 'Oturum bulunamadı.' });
    if (!sahibiMi(oturum, req.user)) {
      return res.status(403).json({ error: 'Bu yoklama size ait değil.' });
    }

    // Birlikte yoklama: elle işaret, öğrencinin KAYITLI olduğu oturuma yazılır
    // (istemci `elleDersler`de öğrenci → ders verir); grup birlikte kapanır.
    const grup = await grupOturumlari(db, oturum);
    if (grup.length > 1) {
      const dersler = g.elleDersler && typeof g.elleDersler === 'object' ? g.elleDersler : {};
      const dagit = new Map(grup.map((o) => [o.id, {}]));
      Object.entries(g.elleDurumlar || {}).forEach(([no, durum]) => {
        const hedef = grup.find((o) => metin(o.dersId) === metin(dersler[no])) || oturum;
        dagit.get(hedef.id)[no] = durum;
      });
      for (const o of grup) await elleYaz(db, o, dagit.get(o.id));
    } else {
      await elleYaz(db, oturum, g.elleDurumlar);
    }

    await db
      .collection(OTURUMLAR)
      .updateMany(
        { id: { $in: grup.map((o) => o.id) } },
        { $set: { acik: false, bitis: new Date().toISOString() } }
      );
    // Zaten kapanmış bir yoklamayı yeniden kapatmak bildirimleri çoğaltmasın.
    if (grup.some((o) => o.acik !== false)) await kapanisBildirimleri(req, db, grup);
    return res.json({ ok: true });
  } catch (e) {
    console.error('[yoklama]', e && e.message);
    return res.status(500).json({ error: 'Yoklama kapatılamadı.' });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/yoklama/hafta — oturumun haftasını düzelt (akademisyen)
//
// Yanlış haftaya alınmış (ya da hafta seçilmeden alınmış eski) bir yoklama
// sonradan doğru haftaya taşınabilsin. `hafta: null` seçimi kaldırır;
// liste haftayı yeniden tarihten çıkarır.
// ══════════════════════════════════════════════════════════════
router.post('/hafta', requireAuth, async (req, res) => {
  try {
    const db = await getDbSafe();
    const g = req.body || {};
    const oturum = await oturumBul(db, g.oturumId);
    if (!oturum) return res.status(404).json({ error: 'Oturum bulunamadı.' });
    if (!sahibiMi(oturum, req.user)) {
      return res.status(403).json({ error: 'Bu yoklama size ait değil.' });
    }
    const hafta = g.hafta === null || g.hafta === '' ? null : haftaOku(g.hafta);
    if (g.hafta !== null && g.hafta !== '' && !hafta) {
      return res.status(400).json({ error: 'Hafta 1 ile ' + HAFTA_TAVANI + ' arasında olmalı.' });
    }
    await db.collection(OTURUMLAR).updateOne({ id: oturum.id }, { $set: { hafta } });
    return res.json({ ok: true, hafta });
  } catch (e) {
    console.error('[yoklama]', e && e.message);
    return res.status(500).json({ error: 'Hafta kaydedilemedi.' });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/yoklama/duzelt — KAPANMIŞ yoklamayı sonradan düzelt (akademisyen)
//
// Telefonu çalışmayan, yanlışlıkla reddedilen ya da raporlu öğrenci için
// yoklama kapandıktan sonra da "var / yok / izinli" yazılabilmeli. Eskiden
// bunun tek yolu yoklama açıkken tam ekrandan işaretlemekti; kapanınca
// düzeltilemiyordu. Kayıtlar `elle: true` ile işaretlenir.
// ══════════════════════════════════════════════════════════════
router.post('/duzelt', requireAuth, async (req, res) => {
  try {
    const db = await getDbSafe();
    const g = req.body || {};
    const oturum = await oturumBul(db, g.oturumId);
    if (!oturum) return res.status(404).json({ error: 'Oturum bulunamadı.' });
    if (!sahibiMi(oturum, req.user)) {
      return res.status(403).json({ error: 'Bu yoklama size ait değil.' });
    }
    // Yalnız GERÇEKTEN değişen durum bildirilir.
    const onceki = new Map(
      (
        await db
          .collection(KAYITLAR)
          .find({ oturumId: oturum.id }, { projection: { studentNumber: 1, durum: 1 } })
          .toArray()
      ).map((k) => [metin(k.studentNumber), metin(k.durum)])
    );
    const sayi = await elleYaz(db, oturum, g.durumlar);
    const gecerli = new Set(['var', 'yok', 'izinli']);
    const degisen = Object.entries(g.durumlar && typeof g.durumlar === 'object' ? g.durumlar : {})
      .map(([no, d]) => [metin(no), metin(d)])
      .filter(([no, d]) => no && gecerli.has(d) && (onceki.get(no) || 'yok') !== d);
    await bildirimleriYaz(
      req,
      db,
      degisen.map(([no, d]) => yoklamaBildirimi(oturum, no, d, true))
    );
    return res.json({ ok: true, yazilan: sayi });
  } catch (e) {
    console.error('[yoklama]', e && e.message);
    return res.status(500).json({ error: 'Yoklama düzeltilemedi.' });
  }
});

// ══════════════════════════════════════════════════════════════
// OKUMA UÇLARI — akademisyenin ve öğrencinin yoklama verisi
//
// ⚠ GENEL /api/db OKUMASI BÜTÜN KOLEKSİYONU GETİRİYORDU (tavan 20.000).
// Bir iki dönemde oturum ve kayıt sayısı bu tavanı aşar; liste SESSİZCE
// kesilir ve devamsızlık yanlış hesaplanırdı. Bu uçlar yalnız ilgili
// oturumları ve kayıtları döndürür. Cihaz kimliği/izi hiç dönmez.
// ══════════════════════════════════════════════════════════════
const KAYIT_PROJEKSIYONU = { _id: 0, cihazId: 0, cihazIz: 0 };

// Akademisyen: kendi açtığı oturumlar + o oturumların kayıtları.
router.get('/akademisyen-veri', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'professor' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Yalnız akademisyen.' });
    }
    const db = await getDbSafe();
    const oturumlar = await db
      .collection(OTURUMLAR)
      .find({ akademisyen: metin(user.identifier) })
      .project({ _id: 0, sirr: 0 })
      .toArray();
    const ids = oturumlar.map((o) => o.id).filter(Boolean);
    const kayitlar = ids.length
      ? await db
          .collection(KAYITLAR)
          .find({ oturumId: { $in: ids } })
          .project(KAYIT_PROJEKSIYONU)
          .toArray()
      : [];
    return res.json({ oturumlar, kayitlar });
  } catch (e) {
    console.error('[yoklama]', e && e.message);
    return res.status(500).json({ error: 'Yoklama verisi okunamadı.' });
  }
});

// Öğrenci: aldığı derslerin oturumları + KENDİ kayıtları (ÇAP'ta bağlı
// numaralar dahil — ikinci programın kayıtları ayrı numaranın altındadır).
router.get('/ogrenci-veri', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const ogrNo = metin(user && (user.studentNumber || user.identifier));
    if (!user || user.role !== 'student' || !ogrNo) {
      return res.status(403).json({ error: 'Yalnız öğrenci.' });
    }
    const db = await getDbSafe();
    let kapsam = [ogrNo];
    try {
      const bagli = await db
        .collection('students')
        .find(
          { bagliOgrenciNolar: { $exists: true, $ne: [] } },
          { projection: { studentNumber: 1, bagliOgrenciNolar: 1 } }
        )
        .toArray();
      kapsam = kapsamNumaralari(bagli, ogrNo);
    } catch (_e) {
      kapsam = [ogrNo];
    }
    const dersKumesi = new Set();
    for (const no of kapsam) {
      (await ogrenciVeDersleri(db, no)).dersleri.forEach((d) => dersKumesi.add(d));
    }
    const dersleri = [...dersKumesi];
    const oturumlar = dersleri.length
      ? await db
          .collection(OTURUMLAR)
          .find({ dersId: { $in: dersleri } })
          .project({ _id: 0, sirr: 0 })
          .toArray()
      : [];
    const kayitlar = await db
      .collection(KAYITLAR)
      .find({ studentNumber: { $in: kapsam } })
      .project(KAYIT_PROJEKSIYONU)
      .toArray();
    return res.json({ oturumlar, kayitlar });
  } catch (e) {
    console.error('[yoklama]', e && e.message);
    return res.status(500).json({ error: 'Yoklama verisi okunamadı.' });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/yoklama/cihaz-sifirla — öğrencinin cihaz kaydını temizle
//
// ⚠ BU KAPI OLMADAN CİHAZ BAĞLAMA BİR TUZAKTIR: telefonu bozulan, çalınan
// ya da kotasını tüketen öğrenci dönem boyunca yoklama veremez hâle gelir.
// Sıfırlamayı akademisyen/bölüm yetkilisi yapar ve kim sıfırladığı kayda
// geçer.
// ══════════════════════════════════════════════════════════════
router.post('/cihaz-sifirla', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (
      !user ||
      (user.role !== 'professor' && user.role !== 'bolum_yetkilisi' && user.role !== 'admin')
    ) {
      return res.status(403).json({ error: 'Cihaz kaydını yalnız akademisyen sıfırlayabilir.' });
    }
    const ogrNo = metin((req.body || {}).studentNumber);
    if (!ogrNo) return res.status(400).json({ error: 'Öğrenci numarası gerekli.' });

    const db = await getDbSafe();
    await db.collection(CIHAZLAR).updateOne(
      { id: ogrNo },
      {
        $set: {
          id: ogrNo,
          studentNumber: ogrNo,
          cihazId: '',
          cihazIz: '',
          degisimSayisi: 0,
          donem: donemAnahtari(),
          sifirlayan: metin(user.identifier),
          sifirlamaZamani: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
    return res.json({
      ok: true,
      mesaj: 'Cihaz kaydı sıfırlandı; öğrenci yeni cihaz bağlayabilir.',
    });
  } catch (e) {
    console.error('[yoklama]', e && e.message);
    return res.status(500).json({ error: 'Cihaz kaydı sıfırlanamadı.' });
  }
});

module.exports = router;
