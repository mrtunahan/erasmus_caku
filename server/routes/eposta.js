/**
 * HESAP E-POSTASI ve ŞİFREMİ UNUTTUM
 *
 * Oturum açmış kullanıcı:
 *   GET  /api/eposta/durum           → { zorunlu, eposta, dogrulandi, oneri }
 *   POST /api/eposta/kod-gonder      → { eposta }  6 haneli kod gönderir
 *   POST /api/eposta/dogrula         → { kod }     adresi hesaba bağlar
 *
 * Giriş ekranı (oturum yok):
 *   POST /api/eposta/sifremi-unuttum → { eposta }  her durumda AYNI yanıt
 *   POST /api/eposta/sifre-yenile/kontrol → { jeton } bağlantı geçerli mi
 *   POST /api/eposta/sifre-yenile    → { jeton, sifre, sifre2 }
 *
 * Kurallar: server/lib/eposta-kurali.js · gönderim: server/lib/posta.js
 *
 * ⚠ HESAP VARLIĞI SIZMAZ. "Şifremi unuttum" adres kayıtlı olsun olmasın aynı
 * yanıtı verir; aksi hâlde biri adres listesiyle sistemde kimin hesabı
 * olduğunu tarayabilirdi.
 * ⚠ KOD VE JETON AÇIK SAKLANMAZ; yalnız özetleri tutulur.
 * ⚠ ŞİFRE SIFIRLANINCA ESKİ OTURUMLAR KAPANIR (server/lib/oturum-iptal.js).
 */

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { getDbSafe } = require('../config/database');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const { profilBul } = require('../lib/akademisyen-kimlik');
const K = require('../lib/eposta-kurali');
const posta = require('../lib/posta');
const oturumIptal = require('../lib/oturum-iptal');

let adayKuralSozu = null;
const adayKurali = () => (adayKuralSozu = adayKuralSozu || import('../../lib/aday-hesap.js'));

const router = express.Router();
const HESAPLAR = 'hesap_epostalari';
const BEKLEYEN = 'eposta_dogrulama';
const SIFIRLAMA = 'sifre_sifirlama';
const metin = (v) => String(v == null ? '' : v).trim();
const TUZ = () => String(process.env.EPOSTA_TUZU || JWT_SECRET);

// ── Hız sınırı (bellekte; uygulama tek süreç) ──
const sayaclar = new Map();
function sinirAsildi(anahtar, enCok, pencereDk) {
  const simdi = Date.now();
  // Tablo sınırsız büyümesin: süresi geçmiş sayaçlar ara ara temizlenir.
  if (sayaclar.size > 5000) {
    for (const [k, v] of sayaclar) if (simdi - v.bas > 60 * 60000) sayaclar.delete(k);
  }
  const k = sayaclar.get(anahtar);
  if (!k || simdi - k.bas > pencereDk * 60000) {
    sayaclar.set(anahtar, { bas: simdi, n: 1 });
    return false;
  }
  k.n++;
  return k.n > enCok;
}
const ipOf = (req) =>
  metin((req.headers['x-forwarded-for'] || '').toString().split(',')[0]) ||
  metin(req.ip) ||
  'bilinmiyor';

/** Bu ortamda e-posta doğrulaması girişte zorunlu mu? */
function zorunluMu() {
  return posta.postaHazirMi() || process.env.EPOSTA_ZORUNLU === '1';
}

/**
 * Kod gönderilebilir mi? Üretimde anahtar yoksa HAYIR: kullanıcı hiç
 * gelmeyecek bir kodu beklemesin. Geliştirmede ileti konsola yazılır.
 */
function gonderimMumkunMu() {
  return posta.postaHazirMi() || process.env.NODE_ENV !== 'production';
}

async function iz(db, kind, veri) {
  try {
    await db.collection('audit_logs').insertOne({ kind, at: new Date(), ...veri });
  } catch (_) {
    /* iz yazılamasa da akış sürer */
  }
}

const esitOzet = (a, b) => {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
};

// ═══════════════ Oturum açmış kullanıcı ═══════════════

router.get('/durum', requireAuth, async (req, res) => {
  const hesap = K.hesapAnahtari(req.user);
  if (!hesap) return res.json({ destek: false, zorunlu: false });
  try {
    const db = await getDbSafe();
    const kayit = await db.collection(HESAPLAR).findOne({ _id: hesap });
    const bekleyen = await db.collection(BEKLEYEN).findOne({ _id: hesap });
    // Öneri: akademisyende profildeki kurumsal adres, adayda kayıtta
    // verdiği adres. Yalnız kutuyu ÖNCEDEN doldurmak içindir; doğrulama
    // yine koddan geçer.
    let oneri = '';
    if (!kayit) {
      if (req.user.aday) {
        const a = await db.collection('adaylar').findOne({ adayNo: metin(req.user.identifier) });
        oneri = metin(a && a.eposta);
      } else if (req.user.role === 'professor') {
        const p = await profilBul(db, req.user.identifier).catch(() => null);
        oneri = metin(p && p.email);
      }
      if (!K.epostaGecerliMi(oneri)) oneri = '';
    }
    return res.json({
      destek: true,
      hazir: gonderimMumkunMu(),
      zorunlu: zorunluMu(),
      eposta: kayit ? kayit.eposta : '',
      dogrulandi: !!kayit,
      bekleyen:
        bekleyen && !K.suresiDolduMu(bekleyen.son, new Date()) ? metin(bekleyen.eposta) : '',
      oneri: K.epostaSadele(oneri),
    });
  } catch (e) {
    console.error('[eposta] durum:', e && e.message);
    return res.status(500).json({ error: 'E-posta bilgisi okunamadı.' });
  }
});

router.post('/kod-gonder', requireAuth, async (req, res) => {
  const hesap = K.hesapAnahtari(req.user);
  if (!hesap) return res.status(400).json({ error: 'Bu hesap türü için e-posta tanımlanamaz.' });
  const eposta = K.epostaSadele(req.body && req.body.eposta);
  if (!K.epostaGecerliMi(eposta)) {
    return res.status(400).json({ error: 'Geçerli bir e-posta adresi yazın.' });
  }
  if (!gonderimMumkunMu()) {
    return res
      .status(503)
      .json({ error: 'E-posta gönderimi henüz yapılandırılmadı. Daha sonra tekrar deneyin.' });
  }
  if (sinirAsildi('kod:' + hesap, 5, 60) || sinirAsildi('kod-ip:' + ipOf(req), 30, 60)) {
    return res.status(429).json({ error: 'Çok fazla kod istendi. Bir süre sonra tekrar deneyin.' });
  }
  try {
    const db = await getDbSafe();
    const kod = K.kodUret();
    const son = K.dakikaSonra(K.KOD_SURE_DK);
    await db.collection(BEKLEYEN).updateOne(
      { _id: hesap },
      {
        $set: {
          eposta,
          kodOzet: K.ozet(kod, TUZ() + ':' + hesap),
          son,
          deneme: 0,
          at: new Date(),
        },
      },
      { upsert: true }
    );
    const g = await posta.gonder({
      kime: eposta,
      konu: 'Offline Asistan doğrulama kodunuz: ' + kod,
      tur: 'eposta_dogrulama',
      baslik: 'E-posta adresinizi doğrulayın',
      paragraflar: [
        'Offline Asistan hesabınıza (' +
          K.hesapEtiketi(hesap) +
          ') bu adresi eklemek için aşağıdaki kodu ekrana girin.',
        'Kod ' + K.KOD_SURE_DK + ' dakika geçerlidir.',
      ],
      kod,
      altNot:
        'Bu isteği siz yapmadıysanız bu iletiyi dikkate almayın; adresiniz hiçbir hesaba bağlanmaz.',
    });
    if (!g.ok) {
      return res.status(502).json({
        error: 'Kod gönderilemedi. Adresi kontrol edip tekrar deneyin.',
      });
    }
    return res.json({ ok: true, eposta, sure: K.KOD_SURE_DK });
  } catch (e) {
    console.error('[eposta] kod-gonder:', e && e.message);
    return res.status(500).json({ error: 'Kod gönderilemedi.' });
  }
});

router.post('/dogrula', requireAuth, async (req, res) => {
  const hesap = K.hesapAnahtari(req.user);
  if (!hesap) return res.status(400).json({ error: 'Bu hesap türü için e-posta tanımlanamaz.' });
  const kod = metin(req.body && req.body.kod);
  if (!K.kodBicimiGecerliMi(kod)) {
    return res.status(400).json({ error: 'Kod 6 haneli bir sayıdır.' });
  }
  try {
    const db = await getDbSafe();
    const b = await db.collection(BEKLEYEN).findOne({ _id: hesap });
    if (!b || K.suresiDolduMu(b.son, new Date())) {
      return res.status(400).json({ error: 'Kodun süresi doldu. Yeni kod isteyin.' });
    }
    if ((b.deneme || 0) >= K.KOD_DENEME_SINIRI) {
      return res.status(429).json({ error: 'Çok fazla hatalı deneme. Yeni kod isteyin.' });
    }
    if (!esitOzet(b.kodOzet, K.ozet(kod, TUZ() + ':' + hesap))) {
      await db.collection(BEKLEYEN).updateOne({ _id: hesap }, { $inc: { deneme: 1 } });
      const kalan = K.KOD_DENEME_SINIRI - (b.deneme || 0) - 1;
      return res.status(400).json({
        error: kalan > 0 ? 'Kod hatalı. ' + kalan + ' deneme hakkınız kaldı.' : 'Kod hatalı.',
      });
    }
    const eski = await db.collection(HESAPLAR).findOne({ _id: hesap });
    const c = K.anahtarCoz(hesap);
    await db.collection(HESAPLAR).updateOne(
      { _id: hesap },
      {
        $set: {
          rol: c.rol,
          kimlik: c.kimlik,
          eposta: b.eposta,
          dogrulandiAt: new Date(),
        },
      },
      { upsert: true }
    );
    await db.collection(BEKLEYEN).deleteOne({ _id: hesap });
    await iz(db, 'eposta_dogrulandi', {
      hesap,
      eposta: K.epostaMaskele(b.eposta),
    });
    // Adres DEĞİŞTİYSE eski adrese haber ver: hesabı ele geçiren biri
    // adresi kendi adresiyle değiştirirse sahibi bundan haberdar olsun.
    if (eski && eski.eposta && eski.eposta !== b.eposta) {
      await posta.gonder({
        kime: eski.eposta,
        konu: 'Offline Asistan e-posta adresiniz değiştirildi',
        tur: 'eposta_degisti',
        baslik: 'E-posta adresiniz değiştirildi',
        paragraflar: [
          'Offline Asistan hesabınızın (' +
            K.hesapEtiketi(hesap) +
            ') e-posta adresi ' +
            K.epostaMaskele(b.eposta) +
            ' olarak değiştirildi.',
          'Bunu siz yapmadıysanız hemen bölüm sekreterliğine bildirin.',
        ],
      });
    }
    return res.json({ ok: true, eposta: b.eposta });
  } catch (e) {
    console.error('[eposta] dogrula:', e && e.message);
    return res.status(500).json({ error: 'Doğrulama yapılamadı.' });
  }
});

// ═══════════════ Şifremi unuttum ═══════════════

const GENEL_YANIT =
  'Bu adres bir hesaba bağlıysa şifre yenileme bağlantısı gönderildi. Gelen kutunuzu ' +
  '(ve istenmeyen klasörünü) kontrol edin. Bağlantı ' +
  K.BAGLANTI_SURE_DK +
  ' dakika geçerlidir.';

/** Aday hesabı hâlâ kullanılabilir mi (kapatılmış/aktarılmış değil)? */
async function hesapKullanilabilirMi(db, hesap) {
  const c = K.anahtarCoz(hesap);
  if (!c) return false;
  if (c.rol !== 'aday') return true;
  const a = await db.collection('adaylar').findOne({ adayNo: c.kimlik });
  return !!(a && (a.durum || 'aktif') === 'aktif');
}

router.post('/sifremi-unuttum', async (req, res) => {
  const eposta = K.epostaSadele(req.body && req.body.eposta);
  if (!K.epostaGecerliMi(eposta)) {
    return res.status(400).json({ error: 'Geçerli bir e-posta adresi yazın.' });
  }
  if (sinirAsildi('unuttum-ip:' + ipOf(req), 10, 60)) {
    return res.status(429).json({ error: 'Çok fazla istek. Bir süre sonra tekrar deneyin.' });
  }
  // Adres başına sınır SESSİZ uygulanır (yanıt aynı kalır): birinin
  // posta kutusunu sıfırlama iletileriyle doldurmak mümkün olmasın.
  const adresSiniri = sinirAsildi('unuttum:' + eposta, 3, 60);
  try {
    const db = await getDbSafe();
    // Kullanıcıya her durumda aynı yanıt gider; neden gönderilmediği yalnız
    // sunucu günlüğüne ve eposta_gonderimleri kaydına (adres maskeli) düşer.
    const tani = (durum) => {
      console.info('[eposta] sifremi-unuttum:', K.epostaMaskele(eposta), durum);
      return db
        .collection('eposta_gonderimleri')
        .insertOne({ tur: 'sifre_sifirlama', kime: K.epostaMaskele(eposta), durum, at: new Date() })
        .catch(() => {});
    };
    if (adresSiniri) await tani('adres_siniri');
    if (!adresSiniri) {
      const hesaplar = await db.collection(HESAPLAR).find({ eposta }).limit(10).toArray();
      if (!hesaplar.length) await tani('dogrulanmis_hesap_yok');
      for (const h of hesaplar) {
        const hesap = String(h._id);
        if (!(await hesapKullanilabilirMi(db, hesap))) {
          await tani('hesap_kullanilamaz');
          continue;
        }
        const jeton = K.jetonUret();
        await db.collection(SIFIRLAMA).insertOne({
          _id: K.ozet(jeton, ''),
          hesap,
          son: K.dakikaSonra(K.BAGLANTI_SURE_DK),
          kullanildi: false,
          at: new Date(),
          ip: ipOf(req),
        });
        const sonuc = await posta.gonder({
          kime: eposta,
          konu: 'Offline Asistan şifre yenileme',
          tur: 'sifre_sifirlama',
          baslik: 'Şifrenizi yenileyin',
          paragraflar: [
            'Offline Asistan hesabınız (' +
              K.hesapEtiketi(hesap) +
              ') için şifre yenileme isteği aldık.',
            'Yeni şifrenizi belirlemek için aşağıdaki düğmeye basın. Bağlantı ' +
              K.BAGLANTI_SURE_DK +
              ' dakika geçerlidir ve yalnız bir kez kullanılabilir.',
          ],
          dugme: {
            metin: 'Şifremi yenile',
            url: posta.uygulamaAdresi() + '/panel/#sifre-yenile=' + jeton,
          },
          altNot: 'Bu isteği siz yapmadıysanız bu iletiyi dikkate almayın; şifreniz değişmez.',
        });
        if (!sonuc || !sonuc.ok) {
          console.warn('[eposta] sifremi-unuttum gönderilemedi:', sonuc && sonuc.hata);
        }
        await iz(db, 'sifre_sifirlama_istegi', { hesap, ip: ipOf(req) });
      }
    }
    return res.json({ ok: true, mesaj: GENEL_YANIT });
  } catch (e) {
    console.error('[eposta] sifremi-unuttum:', e && e.message);
    // Hata da aynı yanıtı verir; ayrıntı günlükte.
    return res.json({ ok: true, mesaj: GENEL_YANIT });
  }
});

async function jetonKaydi(db, jeton) {
  if (!K.jetonBicimiGecerliMi(jeton)) return null;
  const k = await db.collection(SIFIRLAMA).findOne({ _id: K.ozet(jeton, '') });
  if (!k || k.kullanildi || K.suresiDolduMu(k.son, new Date())) return null;
  return k;
}

router.post('/sifre-yenile/kontrol', async (req, res) => {
  if (sinirAsildi('yenile-ip:' + ipOf(req), 30, 15)) {
    return res.status(429).json({ error: 'Çok fazla istek.' });
  }
  try {
    const db = await getDbSafe();
    const k = await jetonKaydi(db, metin(req.body && req.body.jeton));
    if (!k) return res.json({ gecerli: false });
    return res.json({ gecerli: true, hesap: K.hesapEtiketi(k.hesap) });
  } catch (e) {
    console.error('[eposta] kontrol:', e && e.message);
    return res.status(500).json({ error: 'Bağlantı denetlenemedi.' });
  }
});

router.post('/sifre-yenile', async (req, res) => {
  if (sinirAsildi('yenile-ip:' + ipOf(req), 30, 15)) {
    return res.status(429).json({ error: 'Çok fazla istek.' });
  }
  const jeton = metin(req.body && req.body.jeton);
  const sifre = req.body && req.body.sifre;
  const sifre2 = req.body && req.body.sifre2;
  const sifreHata = K.sifreHatasi(sifre, sifre2);
  if (sifreHata) return res.status(400).json({ error: sifreHata });
  try {
    const db = await getDbSafe();
    const k = await jetonKaydi(db, jeton);
    if (!k) {
      return res.status(400).json({
        error: 'Bağlantının süresi dolmuş ya da daha önce kullanılmış. Yeni bağlantı isteyin.',
      });
    }
    const c = K.anahtarCoz(k.hesap);
    if (c.rol === 'aday') {
      const A = await adayKurali();
      const h = A.adayKayitHatalari({ sifre, sifre2 });
      if (h.sifre || h.sifre2) return res.status(400).json({ error: h.sifre || h.sifre2 });
    }
    // Jeton TEK kullanımlık: önce kullanılmış işaretlenir; aynı anda gelen
    // iki istekten yalnız biri geçer.
    const isaret = await db
      .collection(SIFIRLAMA)
      .updateOne(
        { _id: k._id, kullanildi: false },
        { $set: { kullanildi: true, kullanildiAt: new Date() } }
      );
    if (!isaret || isaret.modifiedCount !== 1) {
      return res.status(400).json({ error: 'Bağlantı daha önce kullanılmış.' });
    }
    if (c.rol === 'aday') {
      if (!(await hesapKullanilabilirMi(db, k.hesap))) {
        return res.status(400).json({ error: 'Bu aday hesabı artık kullanılmıyor.' });
      }
      await db.collection('adaylar').updateOne(
        { adayNo: c.kimlik },
        {
          $set: {
            sifreHash: await bcrypt.hash(String(sifre), 12),
            sifreDegistirmeli: false,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      const { sifreYaz } = require('./auth');
      const yazildi = await sifreYaz(c.rol, c.kimlik, sifre);
      if (!yazildi) return res.status(400).json({ error: 'Hesap türü tanınmadı.' });
    }
    // Hesabın öteki bekleyen bağlantıları da geçersiz; eski oturumlar kapanır.
    await db
      .collection(SIFIRLAMA)
      .updateMany({ hesap: k.hesap, kullanildi: false }, { $set: { kullanildi: true } });
    await oturumIptal.iptalEt(db, k.hesap);
    await iz(db, 'password_change', {
      actor: { role: 'eposta_sifirlama', identifier: c.kimlik },
      target: { role: c.rol, identifier: c.kimlik },
      ip: ipOf(req),
    });
    const hesapEposta = await db.collection(HESAPLAR).findOne({ _id: k.hesap });
    if (hesapEposta && hesapEposta.eposta) {
      await posta.gonder({
        kime: hesapEposta.eposta,
        konu: 'Offline Asistan şifreniz değiştirildi',
        tur: 'sifre_degisti',
        baslik: 'Şifreniz değiştirildi',
        paragraflar: [
          'Offline Asistan hesabınızın (' +
            K.hesapEtiketi(k.hesap) +
            ') şifresi e-posta bağlantısıyla yenilendi. Açık oturumlarınız kapatıldı.',
          'Bunu siz yapmadıysanız hemen "Şifremi unuttum" ile şifrenizi yeniden belirleyin ve bölüm sekreterliğine bildirin.',
        ],
      });
    }
    return res.json({ ok: true, hesap: K.hesapEtiketi(k.hesap) });
  } catch (e) {
    console.error('[eposta] sifre-yenile:', e && e.message);
    return res.status(500).json({ error: 'Şifre yenilenemedi.' });
  }
});

// ── Yalnız geliştirme/test: gönderilen iletileri oku (POSTA_TEST_KUTUSU=1) ──
router.get('/_test/kutu', (req, res) => {
  if (!posta.testKutusuAcik()) return res.status(404).end();
  const kime = K.epostaSadele(req.query.kime);
  return res.json(posta.testKutusu.filter((m) => !kime || m.kime === kime));
});

module.exports = router;
module.exports._sayaclar = sayaclar;
