// ══════════════════════════════════════════════════════════════
// E-POSTA GÖNDERİMİ
//
// Tek kullanımlık şifre kodları buradan çıkar. Projede daha önce hiçbir
// e-posta altyapısı yoktu; bu dosya tek giriş noktasıdır.
//
// ── YAPILANDIRILMAMIŞSA SESSİZ KALMAZ ──
// SMTP ayarları eksikse gönderim "başarılı" gibi davranmaz. Aksi halde
// kullanıcı kodu bekler, gelmez, kimse sebebini bilmez. `hazirMi()` false
// döner ve çağıran taraf kullanıcıya "bu yol şu an kullanılamıyor" der.
//
// ── ORTAM DEĞİŞKENLERİ ──
//   SMTP_HOST      zorunlu   posta sunucusu
//   SMTP_PORT      465 (SSL) ya da 587 (STARTTLS) — varsayılan 587
//   SMTP_USER      zorunlu   kimlik
//   SMTP_PASS      zorunlu   parola
//   SMTP_FROM      zorunlu   gönderen adresi ("ÇAKÜ <no-reply@karatekin.edu.tr>")
//   SMTP_SECURE    'true' → doğrudan TLS (genelde 465). Boşsa porttan çıkarılır.
// ══════════════════════════════════════════════════════════════

let nodemailer = null;
try {
  // Bağımlılık kurulmamışsa süreç ÇÖKMEZ: e-posta yolu kapalı kalır, geri
  // kalan sistem çalışmaya devam eder.
   
  nodemailer = require('nodemailer');
} catch (_) {
  nodemailer = null;
}

function ayarlar() {
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host: process.env.SMTP_HOST || '',
    port,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '',
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' ? true : port === 465,
  };
}

/** E-posta gönderimi kullanılabilir mi? */
function hazirMi() {
  const a = ayarlar();
  return !!(nodemailer && a.host && a.user && a.pass && a.from);
}

/** Neden hazır değil — kurulum yaparken tahmin ettirmemek için. */
function eksikNedir() {
  if (!nodemailer) return "nodemailer kurulu değil (server dizininde 'npm install')";
  const a = ayarlar();
  const eksik = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'].filter((k) => !process.env[k]);
  return eksik.length ? `eksik ortam değişkeni: ${eksik.join(', ')}` : '';
}

let tasiyici = null;
function tasiyiciAl() {
  if (tasiyici) return tasiyici;
  const a = ayarlar();
  tasiyici = nodemailer.createTransport({
    host: a.host,
    port: a.port,
    secure: a.secure,
    auth: { user: a.user, pass: a.pass },
  });
  return tasiyici;
}

/**
 * E-posta gönderir.
 * @returns {Promise<{ok:boolean, hata?:string}>} — atmaz, sonucu döner.
 */
async function gonder({ alici, konu, metin, html }) {
  if (!hazirMi()) return { ok: false, hata: eksikNedir() || 'e-posta yapılandırılmamış' };
  try {
    await tasiyiciAl().sendMail({
      from: ayarlar().from,
      to: alici,
      subject: konu,
      text: metin,
      html: html || undefined,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, hata: (e && e.message) || 'gönderim hatası' };
  }
}

/**
 * Tek kullanımlık şifre kodu e-postası.
 *
 * Kod HTML'in yanında düz metin olarak da yazılır: bazı istemciler HTML'i
 * göstermez ve kullanıcı kodu göremezdi.
 */
function kodMesaji(kod, dakika) {
  const konu = 'Şifre sıfırlama kodunuz';
  const metin =
    `Şifre sıfırlama kodunuz: ${kod}\n\n` +
    `Kod ${dakika} dakika geçerlidir ve yalnız bir kez kullanılabilir.\n\n` +
    'Bu isteği siz yapmadıysanız bu iletiyi yok sayın; şifreniz değişmez.';
  const html =
    `<p>Şifre sıfırlama kodunuz:</p>` +
    `<p style="font-size:28px;font-weight:700;letter-spacing:4px">${kod}</p>` +
    `<p>Kod <b>${dakika} dakika</b> geçerlidir ve yalnız bir kez kullanılabilir.</p>` +
    `<p style="color:#6b7280;font-size:13px">Bu isteği siz yapmadıysanız bu iletiyi yok sayın; şifreniz değişmez.</p>`;
  return { konu, metin, html };
}

module.exports = { hazirMi, eksikNedir, gonder, kodMesaji };
