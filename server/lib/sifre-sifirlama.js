// ══════════════════════════════════════════════════════════════
// ŞİFREMİ UNUTTUM — TEK KULLANIMLIK KOD KURALLARI
//
// Saf kurallar: veritabanı yok, ağ yok, express yok. Sıfırlama akışının
// güvenliği bu birkaç kararda saklı olduğu için hepsi test altında.
//
// ── KODUN KENDİSİ SAKLANMAZ ──
// Kod, şifre gibi davranır: bcrypt'lenip öyle yazılır. Veritabanını okuyan
// biri (yedek dosyası, sızıntı, yetkisiz erişim) kodu okuyup hesabı ele
// geçiremesin. Bu yüzden "kodu tekrar gönder" diye bir şey yoktur — eski kod
// geri getirilemez, yenisi üretilir.
//
// ── HESABIN VARLIĞI SIZDIRILMAZ ──
// Sıfırlama isteği, hesap olsa da olmasa da AYNI cevabı döndürmelidir. Aksi
// halde bu uç, "hangi numara kayıtlı" taramasının yeni adresi olur.
//
// ── ÜÇ AYRI TÜKENME ──
// Kod üç şekilde ölür ve üçü de ayrı ayrı gereklidir:
//   süre     → çalınan kod sonsuza kadar kullanılamasın
//   deneme   → 6 hane kaba kuvvetle denenmesin (1.000.000 ihtimal, sınırsız
//              deneme ile dakikalar içinde tükenir)
//   kullanım → tek kullanımlık; kullanılan kod ikinci kez çalışmaz
// ══════════════════════════════════════════════════════════════

const crypto = require('crypto');

/** Kodun geçerlilik süresi (dakika) ve izin verilen yanlış deneme sayısı. */
const GECERLILIK_DAKIKA = 15;
const AZAMI_DENEME = 5;

/**
 * Tek kullanımlık kod üretir.
 *
 * `Math.random()` KULLANILMAZ: tahmin edilebilir bir üreteçtir ve üretilen
 * kod dizisi gözlemlenerek sonraki kodlar kestirilebilir. `crypto.randomInt`
 * kriptografik üreteçten okur.
 *
 * @param {number} [hane=6]
 */
function kodUret(hane = 6) {
  const alt = Math.pow(10, hane - 1);
  const ust = Math.pow(10, hane);
  return String(crypto.randomInt(alt, ust));
}

/** Kaydın son kullanma zamanı. */
function sonKullanma(simdi = Date.now(), dakika = GECERLILIK_DAKIKA) {
  return simdi + dakika * 60 * 1000;
}

/**
 * Bu kod hâlâ kullanılabilir mi? (kodun DOĞRULUĞUNA bakmaz — o bcrypt işi)
 *
 * @param {object} kayit { sonKullanma, denemeSayisi, kullanildi }
 * @param {number} [simdi]
 * @returns {{ok:boolean, sebep?:string}}
 */
function kodDurumu(kayit, simdi = Date.now()) {
  if (!kayit) return { ok: false, sebep: 'kod-yok' };
  if (kayit.kullanildi) return { ok: false, sebep: 'kullanilmis' };
  if (Number(kayit.denemeSayisi || 0) >= AZAMI_DENEME) return { ok: false, sebep: 'deneme-bitti' };
  if (Number(kayit.sonKullanma || 0) <= simdi) return { ok: false, sebep: 'suresi-doldu' };
  return { ok: true };
}

/** Kullanıcıya gösterilecek mesaj — sebep ne olursa olsun aynı derecede kapalı. */
function durumMesaji(sebep) {
  switch (sebep) {
    case 'suresi-doldu':
      return 'Kodun süresi doldu. Yeni bir kod isteyin.';
    case 'deneme-bitti':
      return 'Çok fazla hatalı deneme yapıldı. Yeni bir kod isteyin.';
    case 'kullanilmis':
      return 'Bu kod daha önce kullanıldı. Yeni bir kod isteyin.';
    default:
      return 'Kod geçersiz. Yeni bir kod isteyin.';
  }
}

/** Karşılaştırma için e-posta anahtarı — baş/son boşluk ve büyük harf farkı. */
function epostaAnahtari(adres) {
  return String(adres == null ? '' : adres)
    .trim()
    .toLowerCase();
}

/** Basit biçim denetimi. Adresin GERÇEK olduğunu kanıtlamaz, yalnız şeklini. */
function epostaBicimiGecerli(adres) {
  const a = epostaAnahtari(adres);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a);
}

/**
 * Adresi maskeler: "ayse.yilmaz@karatekin.edu.tr" → "ay*********@karatekin.edu.tr"
 *
 * Kullanıcıya "kod nereye gitti" demek gerekir, yoksa yanlış adresi olan kişi
 * boşuna bekler. Ama adresin TAMAMINI yazmak, hesabı ele geçirmeye çalışan
 * birine kurbanın adresini vermek olur.
 */
function epostaMaskele(adres) {
  const a = epostaAnahtari(adres);
  const at = a.indexOf('@');
  if (at < 1) return '';
  const yerel = a.slice(0, at);
  const alan = a.slice(at + 1);
  const gorunen = yerel.slice(0, Math.min(2, yerel.length));
  return `${gorunen}${'*'.repeat(Math.max(1, yerel.length - gorunen.length))}@${alan}`;
}

/**
 * Jeton, şifre değişiminden ÖNCE mi verilmiş?
 *
 * Şifre sıfırlandığında eski oturumlar düşmelidir; aksi halde hesabı ele
 * geçiren kişinin açık oturumu jeton süresi dolana kadar (24 saat) çalışmaya
 * devam eder ve sıfırlama amacına ulaşmaz.
 *
 * Kullanıcı kaydına sürüm alanı eklemek yerine jetonun KENDİ `iat` damgası
 * kullanılır: hâlihazırda her jetonun içinde var, dolayısıyla dağıtım anında
 * kimsenin oturumu düşmez (damgası olmayan hesap = kimse düşmez).
 *
 * @param {number} iatSaniye  jetonun `iat` alanı (saniye)
 * @param {number} degisimMs  son şifre değişimi (ms) — yoksa 0
 */
function jetonEskimisMi(iatSaniye, degisimMs) {
  const iat = Number(iatSaniye);
  const degisim = Number(degisimMs);
  if (!Number.isFinite(iat) || !Number.isFinite(degisim) || degisim <= 0) return false;
  // `iat` saniye çözünürlüğünde: aynı saniye içinde verilen jeton eskimiş
  // SAYILMAZ, yoksa sıfırlamadan hemen sonra verilen jeton da düşerdi.
  return Math.floor(iat) * 1000 < Math.floor(degisim / 1000) * 1000;
}

/** (rol, kimlik) → damga anahtarı. */
function damgaAnahtari(rol, kimlik) {
  return `${String(rol || '')}:${String(kimlik || '')}`;
}

module.exports = {
  GECERLILIK_DAKIKA,
  AZAMI_DENEME,
  kodUret,
  sonKullanma,
  kodDurumu,
  durumMesaji,
  epostaAnahtari,
  epostaBicimiGecerli,
  epostaMaskele,
  jetonEskimisMi,
  damgaAnahtari,
};
