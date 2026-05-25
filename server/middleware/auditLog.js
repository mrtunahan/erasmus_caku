// /api/db/write için yazma denetim kaydı.
// "audit_logs" adında YENİ bir koleksiyona yazar; mevcut verilere
// dokunmaz. Fire-and-forget — log yazımındaki hata uygulamayı etkilemez.

const { logger } = require('../lib/logger');

const AUDIT_COLLECTION = 'audit_logs';

// İstekten kim/nereden bilgisini güvenli şekilde çıkar.
// DİKKAT: Frontend audit-log-modulu.jsx `actor`'ı STRING bekliyor
// (window.audit() yazımıyla uyumlu). Bu nedenle:
//   - actor: kısa string (kullanıcı adı / IP fallback) — UI render eder
//   - actorDetail: zengin obje — sorgulama/forensik için
function actorFrom(req) {
  const u = req.user || {};
  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    null;
  const username = u.username || u.email || u.name || null;
  const userId = u.userId || u.sub || u.id || null;
  return {
    actor: username || userId || (ip ? `ip:${ip}` : 'anonymous'),
    actorRole: u.role || null,
    actorDetail: {
      userId,
      username,
      role: u.role || null,
      ip,
      userAgent: req.headers['user-agent'] || null,
    },
  };
}

// Operasyondan log için anlamlı bir özet çıkar — büyük data alanlarını dahil etme.
function summarizeOp(op) {
  if (!op || typeof op !== 'object') return null;
  const out = {
    type: op.type || null,
    collection: op.collection || null,
    docId: op.docId || null,
  };
  if (op.merge) out.merge = true;
  if (op.subCollection) out.subCollection = op.subCollection;
  if (op.parentDocId) out.parentDocId = op.parentDocId;
  // Yazılan field listesi (değerler değil) — PII sızıntısını azaltır
  if (op.data && typeof op.data === 'object') {
    out.fields = Object.keys(op.data).slice(0, 40);
  }
  return out;
}

async function writeAudit(db, entry) {
  try {
    await db.collection(AUDIT_COLLECTION).insertOne(entry);
  } catch (err) {
    logger.warn({ err: err.message }, '[audit] yazılamadı');
  }
}

// Express middleware: /api/db/write öncesi req'i işaretler, sonrasında yazar.
// Cevap gönderildikten sonra (res.on('finish')) audit yazılır.
function auditWrites(getDb) {
  return function (req, res, next) {
    const startedAt = Date.now();
    const operations = Array.isArray(req.body?.operations) ? req.body.operations : [];
    const opsSummary = operations.slice(0, 100).map(summarizeOp);

    res.on('finish', () => {
      // Sadece başarılı veya başarısız yazma denemelerini logla; sağlık kontrolü vb. dışarıda
      const actorInfo = actorFrom(req);
      const entry = {
        requestId: req.id || null,
        at: new Date(),
        // Frontend uyumluluğu için: action/target/targetId string alanları
        // (window.audit() şeması). Server-side girişler için 'api_write'.
        action: 'api_write',
        target: req.originalUrl || req.url,
        targetId: '',
        actor: actorInfo.actor,
        actorRole: actorInfo.actorRole,
        actorDetail: actorInfo.actorDetail,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
        operations: opsSummary,
        operationCount: operations.length,
        // createdAt: frontend schema uyumluluğu (ISO string)
        createdAt: new Date().toISOString(),
      };
      // getDb() değer dönerse promise olur; biz fire-and-forget yapıyoruz
      Promise.resolve()
        .then(() => getDb())
        .then((db) => writeAudit(db, entry))
        .catch((err) => logger.warn({ err: err.message }, '[audit] DB elde edilemedi'));
    });

    next();
  };
}

module.exports = { auditWrites, AUDIT_COLLECTION };
