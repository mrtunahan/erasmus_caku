// ══════════════════════════════════════════════════════════════
// HESAP E-POSTASI — saf kurallar (veritabanı yok, ağ yok)
//
// Her kullanıcı (öğrenci, aday, akademisyen/memur, bölüm yetkilisi,
// yönetici) kendi gerçek adresini (kurumsal, Gmail, Outlook…) ekler ve
// gelen 6 haneli kodla doğrular. Şifre sıfırlama bağlantısı YALNIZ
// doğrulanmış adrese gider.
//
// Kod ve bağlantı jetonu veritabanına AÇIK yazılmaz; yalnız özeti tutulur
// (veritabanı sızsa bile bekleyen kodlar/bağlantılar kullanılamaz).
// ══════════════════════════════════════════════════════════════

const crypto = require('crypto');

const KOD_SURE_DK = 15;
const BAGLANTI_SURE_DK = 30;
const KOD_DENEME_SINIRI = 5;

const metin = (v) => String(v == null ? '' : v).trim();

// Pratik denetim: RFC'nin tamamı değil, gerçek adresleri kabul eden ve
// yazım hatalarını yakalayan kural. Türkçe karakter ve boşluk kabul edilmez.
const EPOSTA_KALIBI = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}$/;

function epostaSadele(v) {
  return metin(v).toLowerCase();
}

function epostaGecerliMi(v) {
  const e = epostaSadele(v);
  return e.length <= 254 && EPOSTA_KALIBI.test(e) && !e.includes('..');
}

/** Ekranda gösterim: ay***@gmail.com */
function epostaMaskele(v) {
  const e = epostaSadele(v);
  const at = e.indexOf('@');
  if (at < 1) return '';
  const ad = e.slice(0, at);
  const gorunen = ad.length <= 2 ? ad.slice(0, 1) : ad.slice(0, 2);
  return gorunen + '***' + e.slice(at);
}

/**
 * Hesap anahtarı: oturumdaki kullanıcıdan TEK biçim.
 * Aday jetonu öğrenci + aday bayrağına çözülür; anahtarı ayrı tutulur ki
 * aday numarası öğrenci numarasıyla karışmasın.
 */
function hesapAnahtari(kullanici) {
  const u = kullanici || {};
  const kimlik = metin(u.identifier);
  if (u.aday) return kimlik ? 'aday:' + kimlik : '';
  const rol = metin(u.role);
  if (rol === 'admin') return 'admin:' + (kimlik || 'admin');
  if (!['student', 'professor', 'bolum_yetkilisi'].includes(rol) || !kimlik) return '';
  return rol + ':' + kimlik;
}

/** Ham JWT yükünden (jetonKullanicisi öncesi) aynı anahtar. */
function jetonAnahtari(yuk) {
  const y = yuk || {};
  if (y.role === 'aday') return hesapAnahtari({ aday: true, identifier: y.identifier });
  return hesapAnahtari(y);
}

function anahtarCoz(anahtar) {
  const s = metin(anahtar);
  const i = s.indexOf(':');
  if (i < 1) return null;
  return { rol: s.slice(0, i), kimlik: s.slice(i + 1) };
}

const ROL_ADI = {
  student: 'Öğrenci',
  aday: 'Aday',
  professor: 'Akademisyen',
  bolum_yetkilisi: 'Bölüm yetkilisi',
  admin: 'Yönetici',
};

/** E-postada ve sıfırlama ekranında hesabı tanıtan kısa ad. */
function hesapEtiketi(anahtar) {
  const c = anahtarCoz(anahtar);
  if (!c) return '';
  const rol = ROL_ADI[c.rol] || c.rol;
  return c.rol === 'admin' ? rol : rol + ' · ' + c.kimlik;
}

/** 6 haneli doğrulama kodu (kriptografik rastgele, baştaki sıfırlar korunur). */
function kodUret() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

/** Sıfırlama bağlantısı jetonu: 32 bayt, adreste güvenli biçim. */
function jetonUret() {
  return crypto.randomBytes(32).toString('base64url');
}

/** Kod/jeton özeti. Tuz verilirse kod (yalnız 10^6 olasılık) kaba kuvvetle çözülemez. */
function ozet(deger, tuz) {
  return crypto
    .createHash('sha256')
    .update(metin(tuz) + ':' + metin(deger))
    .digest('hex');
}

function kodBicimiGecerliMi(kod) {
  return /^\d{6}$/.test(metin(kod));
}

function jetonBicimiGecerliMi(jeton) {
  return /^[A-Za-z0-9_-]{40,64}$/.test(metin(jeton));
}

/** Süre doldu mu? `son` ISO metin ya da Date. */
function suresiDolduMu(son, simdi) {
  const t = new Date(son).getTime();
  if (!Number.isFinite(t)) return true;
  return (simdi instanceof Date ? simdi.getTime() : Number(simdi) || Date.now()) > t;
}

function dakikaSonra(dk, simdi) {
  const t = simdi instanceof Date ? simdi.getTime() : Number(simdi) || Date.now();
  return new Date(t + dk * 60 * 1000);
}

/**
 * Yeni şifre kuralı — sistemdeki mevcut kuralla aynı (en az 6 karakter);
 * aday için aday kayıt kuralı ayrıca uygulanır (routes/eposta.js).
 */
function sifreHatasi(sifre, tekrar) {
  const s = typeof sifre === 'string' ? sifre : '';
  if (s.length < 6) return 'Şifre en az 6 karakter olmalıdır.';
  if (s.length > 128) return 'Şifre en fazla 128 karakter olabilir.';
  if (tekrar !== undefined && s !== tekrar) return 'Şifreler eşleşmiyor.';
  return '';
}

module.exports = {
  KOD_SURE_DK,
  BAGLANTI_SURE_DK,
  KOD_DENEME_SINIRI,
  epostaSadele,
  epostaGecerliMi,
  epostaMaskele,
  hesapAnahtari,
  jetonAnahtari,
  anahtarCoz,
  hesapEtiketi,
  kodUret,
  jetonUret,
  ozet,
  kodBicimiGecerliMi,
  jetonBicimiGecerliMi,
  suresiDolduMu,
  dakikaSonra,
  sifreHatasi,
};
