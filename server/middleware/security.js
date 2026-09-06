// Güvenlik middleware'leri. helmet ve express-rate-limit opsiyonel olarak
// yüklenir; paketler kurulu değilse uygulama yine çalışır (geriye dönük
// uyumluluk). Üretimde paketlerin kurulu olduğundan emin olun.

function tryRequire(name) {
  try {
    return require(name);
  } catch (_e) {
    return null;
  }
}

// ── helmet (HTTP güvenlik başlıkları) ──────────────────────────
function helmetMiddleware() {
  const helmet = tryRequire('helmet');
  if (!helmet) {
    console.warn(
      '[security] helmet bulunamadı — güvenlik başlıkları devre dışı. `npm i helmet` önerilir.'
    );
    return (req, res, next) => next();
  }
  // CSP'yi index.html meta-tag üzerinden yönettiğimiz için burada kapatıyoruz.
  // Diğer header'lar (X-Content-Type-Options, Referrer-Policy vb.) etkin.
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
}

// ── Rate limiting (auth uçları için sıkı) ──────────────────────
function authRateLimiter() {
  const rateLimit = tryRequire('express-rate-limit');
  if (!rateLimit) {
    console.warn('[security] express-rate-limit bulunamadı — auth rate-limit yok.');
    return (req, res, next) => next();
  }
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dk
    max: 20, // IP başına 20 deneme
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla deneme. Lütfen birkaç dakika sonra tekrar deneyin.' },
  });
}

// ── Genel API rate limit (DoS savunması, gevşek) ──────────────
function apiRateLimiter() {
  const rateLimit = tryRequire('express-rate-limit');
  if (!rateLimit) return (req, res, next) => next();
  return rateLimit({
    windowMs: 60 * 1000, // 1 dk
    max: 600, // IP başına dakikada 600 istek
    standardHeaders: true,
    legacyHeaders: false,
  });
}

// CORS reddi bir SUNUCU HATASI DEĞİLDİR: istek bilinmeyen bir origin'den
// gelmiştir ve doğru davranış onu geri çevirmektir. Ama hata nesnesine durum
// konmadığı için merkezi yakalayıcı 500 sayıyor ve her ham-IP taraması
// loglara tam yığın iziyle düşüyordu. Durum artık 403.
function corsReddi(mesaj) {
  const hata = new Error(mesaj);
  hata.status = 403;
  hata.beklenen = true; // yığın izi basılmaz (bkz. middleware/errorHandler.js)
  return hata;
}

// ── CORS origin çözümleyici ────────────────────────────────────
// ALLOWED_ORIGINS env'i virgüllü liste alır; boşsa eski davranış
// (request origin'i yansıt) korunur — mevcut kurulumları kırmaz.
function corsOrigin() {
  const raw = (process.env.ALLOWED_ORIGINS || '').trim();
  if (!raw) {
    // Üretimde allowlist zorunlu: boşsa credential'lı CORS ile rastgele
    // origin'i yansıtma. Same-origin (origin başlığı yok) ve health probe'lara
    // izin verilir; cross-origin reddedilir.
    if (process.env.NODE_ENV === 'production') {
      return (origin, cb) => {
        if (!origin) return cb(null, true);
        return cb(corsReddi('CORS reddedildi: ALLOWED_ORIGINS tanımlı değil'));
      };
    }
    return true; // dev: eski davranış (request origin'i yansıt)
  }
  const allowed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return (origin, cb) => {
    // origin yoksa same-origin/curl/health probe — izin ver
    if (!origin) return cb(null, true);
    if (allowed.includes(origin)) return cb(null, true);
    return cb(corsReddi(`CORS reddedildi: ${origin}`));
  };
}

module.exports = { helmetMiddleware, authRateLimiter, apiRateLimiter, corsOrigin };
