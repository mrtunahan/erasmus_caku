const express = require('express');
const rateLimit = require('express-rate-limit');
const { getDbSafe } = require('../config/database');
const { ObjectId } = require('mongodb');
const { auditWrites } = require('../middleware/auditLog');
const { softAuth } = require('../middleware/softAuth');

const router = express.Router();

// Audit log middleware — /write öncesi req işaretlenir, sonrasında
// fire-and-forget olarak `audit_logs` koleksiyonuna kaydedilir.
const auditMiddleware = auditWrites(getDbSafe);
// softAuth: token varsa req.user, yoksa audit_logs'a "soft_auth_miss" — bloklamaz.
const softAuthMiddleware = softAuth(getDbSafe);

// Rate limiting — okuma ve yazma için ayrı limitler.
// SPA sayfa açılışında 30-50 paralel apiRead yapıyor, bu yüzden okumalarda
// yüksek tutuyoruz. Yazmalar daha hassas olduğu için düşük kalıyor.
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1200, // dakikada 1200 okuma — sayfa geçişleri ve refresh'lere yer bırakır
  message: { error: 'Çok fazla istek. Lütfen biraz bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120, // dakikada 120 yazma
  message: { error: 'Çok fazla istek. Lütfen biraz bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// /write endpoint'i ve diğer POST'lar yazma limitine, GET'ler okuma limitine tabi
router.use((req, res, next) => {
  if (req.method === 'GET') return readLimiter(req, res, next);
  return writeLimiter(req, res, next);
});

// İzin verilen koleksiyonlar (güvenlik sınırı)
const ALLOWED_COLLECTIONS = [
  'students',
  'sinav_programi',
  'sinav_dersler',
  'sinav_donemler',
  'professors',
  'portal_posts',
  'portal_moderators',
  'portal_notifications',
  'portal_profiles',
  'portal_follows',
  'portal_reports',
  'muafiyet_settings',
  'muafiyet_records',
  'projects',
  'project_courses',
  'departments',
  'department_classrooms',
  'course_schedules',
  'exams',
  'exam_results',
  'exam_periods',
  'resources',
  'forms',
  'internships',
  'internship_applications',
  'internship_uploads',
  'internship_periods',
  'internship_roadmap',
  'internship_notifications',
  'commissions',
  'portal_posts_comments',
  'portal_notifications_items',
  'trip_history',
  'course_groups',
  'course_group_posts',
  'events',
  'unides_projects',
  'unides_courses',
  'tubitak2209_projects',
  'tubitak2209_courses',
  'akademisyen_cache',
  'erasmus_universities',
  'student_notifications',
  'performance_indicators',
  'performance_targets',
  'performance_forms',
  'performance_reports',
  'audit_logs',
  'notifications',
  'student_clubs',
  'club_documents',
  'surveys',
  'survey_assignments',
  'survey_responses',
  'universities',
  'faculties',
  'akademik_takvim',
  'document_templates',
];

// passwords koleksiyonu yalnızca sunucu tarafında (auth.js) doğrudan okunur.
// Generic /api/db okuma API'sinden ERİŞİLEMEZ — parola hash'lerinin
// kimlik doğrulamasız sızmasını önlemek için izin listesinden çıkarıldı.
const READABLE_COLLECTIONS = [...ALLOWED_COLLECTIONS];

// Where/orderBy field adları için güvenlik allowlist'i —
// Mongo operatör enjeksiyonu (örn. $where) ve prototip kirletmesini engeller.
const SAFE_FIELD_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;
const FORBIDDEN_FIELDS = new Set(['__proto__', 'constructor', 'prototype']);

function isSafeField(name) {
  if (typeof name !== 'string' || name.length === 0 || name.length > 100) return false;
  if (FORBIDDEN_FIELDS.has(name)) return false;
  return SAFE_FIELD_NAME.test(name);
}

// Rastgele 20 karakterlik ID üret
function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Timestamp alanlarını temizle ve sunucu timestamp'i ekle
function addTimestamps(data, isNew) {
  const cleaned = {};
  const increments = {};
  for (const [key, value] of Object.entries(data || {})) {
    // Client-side FieldValue.serverTimestamp() serialize edilemez, atla
    if (value && typeof value === 'object' && value._methodName) continue;
    // __increment:N → MongoDB $inc
    if (typeof value === 'string' && value.startsWith('__increment:')) {
      const incVal = parseInt(value.split(':')[1], 10);
      increments[key] = isNaN(incVal) ? 1 : incVal;
      continue;
    }
    cleaned[key] = value;
  }
  cleaned.updatedAt = new Date();
  if (isNew) cleaned.createdAt = new Date();
  return { cleaned, increments };
}

// Koleksiyon adını çöz (subcollection desteği)
function getCollectionName(op) {
  if (op.parentDocId && op.subCollection) {
    return `${op.collection}_${op.subCollection}`;
  }
  return op.collection;
}

// Tek işlem yap
async function executeSingleOp(db, op) {
  const colName = getCollectionName(op);
  const col = db.collection(colName);

  switch (op.type) {
    case 'add': {
      const { cleaned } = addTimestamps(op.data, true);
      const result = await col.insertOne(cleaned);
      return { success: true, id: result.insertedId.toString() };
    }
    case 'set': {
      const { cleaned } = addTimestamps(op.data, true);
      if (op.docId) {
        // Priority: check string _id first (real docs), then _docId (legacy)
        const buildFilter = async () => {
          const byId = await col.findOne({ _id: op.docId });
          if (byId) return { _id: op.docId };
          if (op.docId.length === 24) {
            try {
              const byObjId = await col.findOne({ _id: new ObjectId(op.docId) });
              if (byObjId) return { _id: new ObjectId(op.docId) };
            } catch (e) {}
          }
          // Fallback to _docId (legacy)
          return { _docId: op.docId };
        };
        const filter = await buildFilter();
        if (op.merge) {
          await col.updateOne(filter, { $set: cleaned }, { upsert: true });
        } else {
          await col.replaceOne(filter, { ...cleaned, _docId: op.docId }, { upsert: true });
        }
      } else {
        await col.insertOne(cleaned);
      }
      return { success: true };
    }
    case 'update': {
      const { cleaned, increments } = addTimestamps(op.data, false);
      const updateDoc = { $set: cleaned };
      if (Object.keys(increments).length > 0) {
        updateDoc.$inc = increments;
      }
      // Priority: check string _id first (real docs), then ObjectId, then _docId (legacy)
      let filter = { _docId: op.docId }; // fallback
      const byId = await col.findOne({ _id: op.docId });
      if (byId) {
        filter = { _id: op.docId };
      } else if (op.docId && op.docId.length === 24) {
        try {
          const byObjId = await col.findOne({ _id: new ObjectId(op.docId) });
          if (byObjId) filter = { _id: new ObjectId(op.docId) };
        } catch (e) {}
      }
      await col.updateOne(filter, updateDoc, { upsert: true });
      return { success: true };
    }
    case 'delete': {
      console.log(
        `[DELETE] koleksiyon: ${colName}, docId: ${op.docId}, zaman: ${new Date().toISOString()}`
      );
      // Priority: real doc by string _id first
      let filter = { _docId: op.docId };
      const byId = await col.findOne({ _id: op.docId });
      if (byId) {
        filter = { _id: op.docId };
      } else if (op.docId && op.docId.length === 24) {
        try {
          const byObjId = await col.findOne({ _id: new ObjectId(op.docId) });
          if (byObjId) filter = { _id: new ObjectId(op.docId) };
        } catch (e) {}
      }
      const result = await col.deleteOne(filter);
      console.log(`[DELETE] sonuç: ${result.deletedCount} belge silindi (${colName}/${op.docId})`);
      return { success: true, deleted: result.deletedCount };
    }
    default:
      throw new Error(`Geçersiz işlem tipi: ${op.type}`);
  }
}

// POST /api/db/write
router.post('/write', softAuthMiddleware, auditMiddleware, async (req, res) => {
  const { operations } = req.body;

  if (!operations || !Array.isArray(operations) || operations.length === 0) {
    return res.status(400).json({ error: 'operations dizisi gerekli.' });
  }

  for (const op of operations) {
    if (!ALLOWED_COLLECTIONS.includes(op.collection)) {
      return res.status(403).json({ error: `Koleksiyon izni yok: ${op.collection}` });
    }
  }

  const deleteCount = operations.filter((op) => op.type === 'delete').length;
  if (deleteCount > 20) {
    console.error(`BLOCKED: ${deleteCount} silme işlemi engellendi (max 20)`);
    return res.status(403).json({
      error: `Tek istekte en fazla 20 silme işlemi yapılabilir (istenen: ${deleteCount})`,
    });
  }

  const updateCount = operations.filter((op) => op.type === 'update' || op.type === 'set').length;
  if (updateCount > 50) {
    console.error(`BLOCKED: ${updateCount} güncelleme işlemi engellendi (max 50)`);
    return res.status(403).json({
      error: `Tek istekte en fazla 50 güncelleme işlemi yapılabilir (istenen: ${updateCount})`,
    });
  }

  try {
    const db = await getDbSafe();

    // Etkilenen koleksiyonları topla (gerçek zamanlı yayın için)
    const touched = new Set();
    const addTouched = (op) => {
      if (op && op.collection) touched.add(op.collection);
    };

    if (operations.length === 1) {
      const result = await executeSingleOp(db, operations[0]);
      addTouched(operations[0]);
      emitDbWrite(req, touched);
      return res.json(result);
    }

    const addedIds = [];
    for (const op of operations) {
      const result = await executeSingleOp(db, op);
      addTouched(op);
      if (result.id) addedIds.push(result.id);
    }
    emitDbWrite(req, touched);

    return res.json({ success: true, ids: addedIds });
  } catch (error) {
    console.error('mongoWrite error:', error);
    return res.status(500).json({ error: 'Yazma hatası: ' + error.message });
  }
});

// Socket.IO üzerinden değişen koleksiyonları yayınla (fire-and-forget)
function emitDbWrite(req, touchedSet) {
  try {
    const io = req.app && req.app.get && req.app.get('io');
    if (!io || !touchedSet || touchedSet.size === 0) return;
    const collections = Array.from(touchedSet);
    io.emit('db:write', { collections, at: new Date().toISOString() });
  } catch (e) {
    /* sessiz: real-time opsiyonel */
  }
}

// ══════════════════════════════════════════════
// GET /api/db/:collection - Koleksiyon okuma
// Query params:
//   where=field:op:value (tekrarlanabilir) - op: eq, ne, gt, gte, lt, lte
//   orderBy=field:direction (asc/desc)
//   limit=N
// ══════════════════════════════════════════════
router.get('/:collection', async (req, res) => {
  const { collection } = req.params;

  if (!READABLE_COLLECTIONS.includes(collection)) {
    return res.status(403).json({ error: `Koleksiyon okuma izni yok: ${collection}` });
  }

  try {
    const db = await getDbSafe();
    const col = db.collection(collection);

    const mongoOps = {
      eq: '$eq',
      ne: '$ne',
      gt: '$gt',
      gte: '$gte',
      lt: '$lt',
      lte: '$lte',
    };

    const filter = {};
    const whereParams = req.query.where
      ? Array.isArray(req.query.where)
        ? req.query.where
        : [req.query.where]
      : [];

    for (const w of whereParams) {
      const parts = w.split(':');
      if (parts.length < 3) continue;
      const field = parts[0];
      const op = parts[1];
      const value = parts.slice(2).join(':');

      // Field adını sıkı doğrula — Mongo operatör enjeksiyonu önlemi
      if (!isSafeField(field)) continue;

      const mongoOp = mongoOps[op];
      if (mongoOp) {
        let convertedValue = value;
        if (value.startsWith('s:')) {
          convertedValue = value.slice(2);
        } else if (value === 'true') convertedValue = true;
        else if (value === 'false') convertedValue = false;
        else if (value !== '' && !isNaN(value)) convertedValue = Number(value);

        // Object.defineProperty yerine doğrudan atama; field adı zaten
        // allowlist'ten geçti, prototype-pollution riski yok.
        filter[field] = { [mongoOp]: convertedValue };
      }
    }

    let cursor = col.find(filter);

    if (req.query.orderBy) {
      const [field, dir] = req.query.orderBy.split(':');
      if (isSafeField(field)) {
        cursor = cursor.sort({ [field]: dir === 'desc' ? -1 : 1 });
      }
    }

    const limitVal = req.query.limit ? parseInt(req.query.limit, 10) : 0;
    if (limitVal > 0) {
      cursor = cursor.limit(limitVal);
    }

    const docs = await cursor.toArray();

    const result = docs.map((doc) => {
      const { _id, _docId, ...rest } = doc;
      return {
        ...rest,
        id: _docId || _id.toString(),
      };
    });

    return res.json(result);
  } catch (error) {
    console.error(`Read ${collection} error:`, error);
    return res.status(500).json({ error: 'Okuma hatası: ' + error.message });
  }
});

// GET /api/db/:collection/:docId - Tek doküman okuma
router.get('/:collection/:docId', async (req, res) => {
  const { collection, docId } = req.params;

  if (!READABLE_COLLECTIONS.includes(collection)) {
    return res.status(403).json({ error: `Koleksiyon okuma izni yok: ${collection}` });
  }

  try {
    const db = await getDbSafe();
    const col = db.collection(collection);

    // Önce _docId ile ara, sonra _id ile dene
    let doc = await col.findOne({ _docId: docId });

    if (!doc) {
      // ObjectId olarak dene
      try {
        doc = await col.findOne({ _id: new ObjectId(docId) });
      } catch (_) {
        // ObjectId değilse geç
      }
    }

    if (!doc) {
      return res.json({ exists: false, data: null });
    }

    const { _id, _docId, ...rest } = doc;
    return res.json({ exists: true, data: rest, id: _docId || _id.toString() });
  } catch (error) {
    console.error(`Read ${collection}/${docId} error:`, error);
    return res.status(500).json({ error: 'Okuma hatası: ' + error.message });
  }
});

module.exports = router;
