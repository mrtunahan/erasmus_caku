// "Soft" kimlik doğrulama: token varsa req.user'ı doldurur, yoksa engellemez —
// sadece audit_logs koleksiyonuna `soft_auth_miss` olarak kaydeder.
//
// Amaç: requireAuth'u enforce moda almadan önce hangi endpoint'lerin gerçekten
// anonim çağrı aldığını gözlemlemek. Telemetri toplandıktan sonra ilgili
// endpoint'ler requireAuth'a yükseltilebilir.
//
// DİKKAT: Bu middleware GÜVENLİK SAĞLAMAZ. Sadece görünürlük katmanıdır.
// Gerçek koruma için requireAuth gerekir.

const jwt = require('jsonwebtoken');
const { logger } = require('../lib/logger');

const DEV_FALLBACK_SECRET = 'caku-erasmus-dev-secret-key';
const JWT_SECRET = process.env.JWT_SECRET || DEV_FALLBACK_SECRET;

function extractToken(req) {
  if (req.cookies && req.cookies.caku_auth) return req.cookies.caku_auth;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) return authHeader.split(' ')[1];
  return null;
}

function actorIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    null
  );
}

function softAuth(getDb) {
  return function (req, res, next) {
    const token = extractToken(req);
    if (token) {
      try {
        req.user = jwt.verify(token, JWT_SECRET);
        return next();
      } catch (err) {
        // Geçersiz token — neden'i logla, sonra anonim olarak devam
        req.softAuthError = err.name;
      }
    }

    // Anonim erişimi audit_logs'a yaz (fire-and-forget)
    Promise.resolve()
      .then(() => getDb())
      .then((db) =>
        db.collection('audit_logs').insertOne({
          kind: 'soft_auth_miss',
          requestId: req.id || null,
          at: new Date(),
          method: req.method,
          path: req.originalUrl || req.url,
          reason: req.softAuthError || 'no_token',
          ip: actorIp(req),
          userAgent: req.headers['user-agent'] || null,
        })
      )
      .catch((err) => logger.warn({ err: err.message }, '[softAuth] audit yazılamadı'));

    next();
  };
}

module.exports = { softAuth };
