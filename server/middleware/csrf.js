// Origin / Referer tabanlı CSRF koruması.
//
// Strateji: state-changing istekler (POST/PUT/DELETE/PATCH) için Origin
// veya Referer header'ı request'in geldiği host ile veya ALLOWED_ORIGINS
// allowlist'iyle eşleşmelidir. Eşleşmezse:
//   - Varsayılan: audit_logs'a "csrf_origin_mismatch" yazılır, istek geçer.
//   - CSRF_PROTECTION=enforce ile 403 döner.
//
// Mevcut Set-Cookie'lerde zaten SameSite=Strict var — bu middleware
// defense-in-depth katmanıdır. fetch() çağrıları tarayıcı tarafından
// otomatik Origin header'ı taşıdığı için meşru istekler etkilenmez.
//
// GET/HEAD/OPTIONS güvenli olduğu için atlanır.

const { logger } = require('../lib/logger');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// Varsayılan ENFORCE — açıkça CSRF_PROTECTION=soft ile gevşetilebilir.
// (Eski davranış: varsayılan soft, 'enforce' ile sıkıydı; tersine çevrildi.)
const ENFORCE = process.env.CSRF_PROTECTION !== 'soft';

function parsedHost(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  try {
    return new URL(urlStr).host;
  } catch (_e) {
    return null;
  }
}

function buildAllowedHosts(req) {
  const hosts = new Set();
  // İsteğin geldiği host (proxy arkasında x-forwarded-host'u onurlandır)
  const xfh = req.headers['x-forwarded-host'];
  if (typeof xfh === 'string') xfh.split(',').forEach((h) => hosts.add(h.trim().toLowerCase()));
  if (req.headers.host) hosts.add(String(req.headers.host).toLowerCase());

  // CORS allowlist'i (varsa) — security.js ile aynı env
  const raw = (process.env.ALLOWED_ORIGINS || '').trim();
  if (raw) {
    raw
      .split(',')
      .map((s) => parsedHost(s.trim()))
      .filter(Boolean)
      .forEach((h) => hosts.add(h.toLowerCase()));
  }
  return hosts;
}

function csrfOriginCheck(getDb) {
  return function (req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();

    // Authorization: Bearer ile gelen istekler CSRF'e bağışıktır — tarayıcı
    // bu header'ı sitelerarası otomatik göndermez. Cookie tabanlı olmayan
    // istemciler (script/mobil) böylece bloklanmaz.
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) return next();

    const origin = parsedHost(req.headers.origin);
    const referer = parsedHost(req.headers.referer);
    const candidate = origin || referer;
    const allowed = buildAllowedHosts(req);

    const ok = candidate && allowed.has(candidate.toLowerCase());

    if (!ok) {
      // Audit log'a yaz (fire-and-forget); enforce moddaysa reddet
      Promise.resolve()
        .then(() => getDb())
        .then((db) =>
          db.collection('audit_logs').insertOne({
            kind: 'csrf_origin_mismatch',
            requestId: req.id || null,
            at: new Date(),
            method: req.method,
            path: req.originalUrl || req.url,
            origin: req.headers.origin || null,
            referer: req.headers.referer || null,
            host: req.headers.host || null,
            enforced: ENFORCE,
          })
        )
        .catch((err) => logger.warn({ err: err.message }, '[csrf] audit yazılamadı'));

      if (ENFORCE) {
        return res
          .status(403)
          .json({ error: 'CSRF doğrulaması başarısız: Origin/Referer eşleşmiyor.' });
      }
    }

    next();
  };
}

module.exports = { csrfOriginCheck };
