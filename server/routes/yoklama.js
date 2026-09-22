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
const rateLimit = require('express-rate-limit');
const { getDbSafe } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { profilBul } = require('../lib/akademisyen-kimlik');

// Kural dosyası ESM; Node 22 tür algılamasıyla dinamik import sorunsuz.
let kuralSozu = null;
function kural() {
  if (!kuralSozu) kuralSozu = import('../../lib/yoklama.js');
  return kuralSozu;
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
const oturumListeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Math.ceil(((15 * 60) / OTURUM_LISTE_ARALIGI_SN) * 1.5),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Canlı liste çok sık yenilendi. Birkaç dakika sonra tekrar deneyin.' },
});

const OTURUMLAR = 'yoklama_oturumlari';
const KAYITLAR = 'yoklama_kayitlari';

const metin = (v) => String(v == null ? '' : v).trim();

/** Akademisyen adı karşılaştırması — unvan ve Türkçe büyük/küçük farkı ayıklanır. */
function adAnahtari(ad) {
  return metin(ad)
    .replace(/(prof\.?|doç\.?|dr\.?|öğr\.?|gör\.?|arş\.?|üyesi|dç\.?)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('tr');
}

/** Yanıta konacak güvenli oturum gövdesi — gizli anahtar ASLA geçmez. */
function oturumuTemizle(o, sirrDahil) {
  if (!o) return null;
  const g = {
    id: metin(o.id || o._id),
    dersId: metin(o.dersId),
    dersKodu: metin(o.dersKodu),
    dersAdi: metin(o.dersAdi),
    dersSaati: Number(o.dersSaati) > 0 ? Number(o.dersSaati) : 1,
    akademisyen: metin(o.akademisyen),
    departmentId: metin(o.departmentId),
    tarih: metin(o.tarih),
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
    const ders = await db
      .collection('sinav_dersler')
      .findOne({ $or: [{ id: dersId }, { _docId: dersId }] });
    if (ders && user.role !== 'admin') {
      const egitmenler = []
        .concat(ders.instructor || [], ders.instructors || [], ders.egitmenler || [])
        .filter(Boolean);
      const benim = egitmenler.some((e) => adAnahtari(e) === adAnahtari(user.identifier));
      if (egitmenler.length > 0 && !benim) {
        return res.status(403).json({ error: 'Bu ders size tanımlı değil.' });
      }
    }

    // Aynı ders için açık bir oturum varsa ikincisini açma: iki ekran iki
    // farklı gizli anahtarla dönerse öğrencinin okuttuğu kod "başka oturum"
    // diye reddedilir.
    const mevcut = await db.collection(OTURUMLAR).findOne({ dersId, acik: true });
    if (mevcut) {
      return res.json({ oturum: oturumuTemizle(mevcut, true), sunucuZamani: Date.now() });
    }

    const oturum = {
      id: 'yk-' + crypto.randomBytes(9).toString('hex'),
      // 32 baytlık gizli anahtar — oturuma özel, her açılışta yeniden üretilir.
      sirr: crypto.randomBytes(32).toString('hex'),
      dersId,
      dersKodu: metin(g.dersKodu || (ders && (ders.code || ders.kod))),
      dersAdi: metin(g.dersAdi || (ders && (ders.name || ders.ad))),
      dersSaati: Number(g.dersSaati) > 0 ? Number(g.dersSaati) : 1,
      akademisyen: metin(user.identifier),
      departmentId: metin(g.departmentId || (ders && ders.departmentId)),
      tarih: new Date().toISOString().slice(0, 10),
      acik: true,
      baslangic: new Date().toISOString(),
      bitis: null,
    };
    await db.collection(OTURUMLAR).insertOne({ ...oturum });
    return res.json({ oturum: oturumuTemizle(oturum, true), sunucuZamani: Date.now() });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Yoklama açılamadı.' });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/yoklama/imzala — kodu okut (öğrenci)
// ══════════════════════════════════════════════════════════════
router.post('/imzala', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { kodDogrula, dogrulamaMesaji } = await kural();
    const ogrNo = metin(user && (user.studentNumber || user.identifier));
    if (!user || user.role !== 'student' || !ogrNo) {
      return res.status(403).json({ error: 'Yoklamayı yalnız öğrenci verebilir.' });
    }

    const ham = metin((req.body || {}).kod);
    const db = await getDbSafe();

    // Oturumu koddan çöz: hangi dersin yoklaması olduğunu kodun kendisi söyler.
    const parca = ham.split('.');
    const oturum = parca.length === 3 ? await oturumBul(db, parca[0]) : null;
    if (!oturum) {
      return res.status(400).json({ ok: false, sebep: 'bicim', error: dogrulamaMesaji('bicim') });
    }
    if (!oturum.acik) {
      return res.status(400).json({ ok: false, sebep: 'kapali', error: dogrulamaMesaji('kapali') });
    }

    // ⚠ KARAR SUNUCU SAATİYLE VERİLİR.
    const sonuc = kodDogrula(ham, {
      sirr: oturum.sirr,
      oturumId: oturum.id,
      simdi: Date.now(),
    });
    if (!sonuc.gecerli) {
      return res
        .status(400)
        .json({ ok: false, sebep: sonuc.sebep, error: dogrulamaMesaji(sonuc.sebep) });
    }

    // ── Öğrenci bu dersi alıyor mu? ──
    // Almıyorsa yoklama kaydı açmak listeyi kirletir; hoca tanımadığı bir
    // numarayı silmek zorunda kalır.
    const ogrenci = await db.collection('students').findOne({ studentNumber: ogrNo });
    const dersleri = Array.isArray(ogrenci && ogrenci.myCourseIds) ? ogrenci.myCourseIds : [];
    if (dersleri.length > 0 && !dersleri.map(String).includes(metin(oturum.dersId))) {
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

    await db.collection(KAYITLAR).insertOne({
      id: 'yk-k-' + crypto.randomBytes(8).toString('hex'),
      oturumId: oturum.id,
      dersId: metin(oturum.dersId),
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
      zaman: new Date().toISOString(),
    });

    return res.json({ ok: true, zaten: false, ders: oturum.dersAdi, mesaj: 'Yoklamanız alındı.' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Yoklama alınamadı.' });
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
    const katilimlar = await db
      .collection(KAYITLAR)
      .find({ oturumId: oturum.id })
      .project({ studentNumber: 1, adSoyad: 1, durum: 1, zaman: 1, elle: 1, _id: 0 })
      .toArray();
    return res.json({
      oturum: oturumuTemizle(oturum, sahibiMi(oturum, req.user)),
      katilimlar,
      sunucuZamani: Date.now(),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Liste alınamadı.' });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/yoklama/kapat — yoklamayı bitir ve listeyi yaz (akademisyen)
// ══════════════════════════════════════════════════════════════
router.post('/kapat', requireAuth, async (req, res) => {
  try {
    const db = await getDbSafe();
    const g = req.body || {};
    const oturum = await oturumBul(db, g.oturumId);
    if (!oturum) return res.status(404).json({ error: 'Oturum bulunamadı.' });
    if (!sahibiMi(oturum, req.user)) {
      return res.status(403).json({ error: 'Bu yoklama size ait değil.' });
    }

    // ── Akademisyenin elle işaretleri ──
    // Telefonu bozuk / pili biten öğrenci yüzünden yoklama tutulamaz
    // olmamalı; hoca "var" diyebilir. Kayıt `elle: true` ile işaretlenir ki
    // sonradan hangi yoklamanın elle girildiği görülebilsin.
    const elle = g.elleDurumlar && typeof g.elleDurumlar === 'object' ? g.elleDurumlar : {};
    const gecerli = new Set(['var', 'yok', 'izinli']);
    for (const [no, durum] of Object.entries(elle)) {
      const ogrNo = metin(no);
      const d = metin(durum);
      if (!ogrNo || !gecerli.has(d)) continue;
      await db.collection(KAYITLAR).updateOne(
        { oturumId: oturum.id, studentNumber: ogrNo },
        {
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
          $setOnInsert: { id: 'yk-k-' + crypto.randomBytes(8).toString('hex') },
        },
        { upsert: true }
      );
    }

    await db
      .collection(OTURUMLAR)
      .updateOne({ id: oturum.id }, { $set: { acik: false, bitis: new Date().toISOString() } });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Yoklama kapatılamadı.' });
  }
});

module.exports = router;
