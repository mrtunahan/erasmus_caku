const express = require("express");
const { getDb } = require("../config/database");
const { ObjectId } = require("mongodb");

const router = express.Router();

// İzin verilen koleksiyonlar (güvenlik sınırı)
const ALLOWED_COLLECTIONS = [
  "students",
  "sinav_programi",
  "sinav_dersler",
  "sinav_donemler",
  "professors",
  "users",
  "portal_posts",
  "portal_moderators",
  "portal_notifications",
  "portal_profiles",
  "portal_follows",
  "portal_reports",
  "muafiyet_settings",
  "muafiyet_records",
  "projects",
  "project_courses",
  "departments",
  "department_classrooms",
  "department_supervisors",
  "course_schedules",
  "exams",
  "exam_results",
  "exam_periods",
  "resources",
  "surveys",
  "forms",
  "internships",
  "yaz_okulu_students",
  "yaz_okulu_records",
  "yaz_okulu_settings",
  "portal_posts_comments",
  "portal_notifications_items",
  "trip_history",
  "course_groups",
  "course_group_posts",
  "events",
  "unides_projects",
  "unides_courses",
  "tubitak2209_projects",
  "tubitak2209_courses",
  "akademisyen_cache",
];

// Okuma izni verilen koleksiyonlar (write + read-only)
const READABLE_COLLECTIONS = [
  ...ALLOWED_COLLECTIONS,
  "exams",
  "exam_results",
  "exam_periods",
  "course_groups",
  "course_group_posts",
  "trip_history",
  "surveys",
  "events",
  "resources",
  "forms",
  "yaz_okulu_students",
  "yaz_okulu_records",
  "yaz_okulu_settings",
  "internships",
  "passwords",
];

// Timestamp alanlarını temizle ve sunucu timestamp'i ekle
function addTimestamps(data, isNew) {
  const cleaned = {};
  const increments = {};
  for (const [key, value] of Object.entries(data || {})) {
    // Client-side FieldValue.serverTimestamp() serialize edilemez, atla
    if (value && typeof value === "object" && value._methodName) continue;
    // __increment:N → MongoDB $inc operatörü
    if (typeof value === "string" && value.startsWith("__increment:")) {
      increments[key] = parseInt(value.split(":")[1], 10) || 1;
      continue;
    }
    cleaned[key] = value;
  }
  cleaned.updatedAt = new Date();
  if (isNew) cleaned.createdAt = new Date();
  return { cleaned, increments };
}

// addTimestamps sonucunu MongoDB update'e çevir
function buildUpdateOps(data, isNew) {
  const { cleaned, increments } = addTimestamps(data, isNew);
  const ops = { $set: cleaned };
  if (Object.keys(increments).length > 0) {
    ops.$inc = increments;
  }
  return ops;
}

// Koleksiyon referansı al (subcollection destekli)
function getCollection(db, op) {
  // MongoDB'de subcollection yok, düz koleksiyon olarak saklıyoruz
  if (op.parentDocId && op.subCollection) {
    return db.collection(`${op.collection}_${op.subCollection}`);
  }
  return db.collection(op.collection);
}

// Tek işlem yap
async function executeSingleOp(db, op) {
  const col = getCollection(db, op);

  switch (op.type) {
    case "add": {
      const { cleaned } = addTimestamps(op.data, true);
      const result = await col.insertOne(cleaned);
      return { success: true, id: result.insertedId.toString() };
    }
    case "set": {
      const { cleaned } = addTimestamps(op.data, true);
      const setId = ObjectId.isValid(op.docId) ? new ObjectId(op.docId) : op.docId;
      // Hem string hem ObjectId ile eşleşme dene
      const setFilter = { $or: [{ _id: op.docId }, ...(ObjectId.isValid(op.docId) ? [{ _id: new ObjectId(op.docId) }] : [])] };
      if (op.merge) {
        await col.updateOne(setFilter, { $set: cleaned }, { upsert: true });
      } else {
        await col.replaceOne(setFilter, { ...cleaned, _id: setId }, { upsert: true });
      }
      return { success: true };
    }
    case "update": {
      const updateOps = buildUpdateOps(op.data, false);
      let updateResult = await col.updateOne({ _id: op.docId }, updateOps);
      if (updateResult.matchedCount === 0 && ObjectId.isValid(op.docId)) {
        await col.updateOne({ _id: new ObjectId(op.docId) }, updateOps);
      }
      return { success: true };
    }
    case "delete": {
      let result = await col.deleteOne({ _id: op.docId });
      // String ile eşleşmediyse ObjectId ile dene
      if (result.deletedCount === 0 && ObjectId.isValid(op.docId)) {
        result = await col.deleteOne({ _id: new ObjectId(op.docId) });
      }
      return { success: true, deleted: result.deletedCount };
    }
    default:
      throw new Error(`Geçersiz işlem tipi: ${op.type}`);
  }
}

// POST /api/db/write
router.post("/write", async (req, res) => {
  const { operations } = req.body;

  if (!operations || !Array.isArray(operations) || operations.length === 0) {
    return res.status(400).json({ error: "operations dizisi gerekli." });
  }

  // Koleksiyonları doğrula
  for (const op of operations) {
    if (!ALLOWED_COLLECTIONS.includes(op.collection)) {
      return res.status(403).json({ error: `Koleksiyon izni yok: ${op.collection}` });
    }
  }

  // KORUMA: Tek istekte 20'den fazla silme işlemi engelle (toplu veri kaybını önler)
  const deleteCount = operations.filter(op => op.type === "delete").length;
  if (deleteCount > 20) {
    console.error(`BLOCKED: ${deleteCount} silme işlemi engellendi (max 20)`);
    return res.status(403).json({ error: `Tek istekte en fazla 20 silme işlemi yapılabilir (istenen: ${deleteCount})` });
  }

  try {
    const db = getDb();

    // Tek işlem
    if (operations.length === 1) {
      const result = await executeSingleOp(db, operations[0]);
      return res.json(result);
    }

    // Birden fazla işlem
    const addedIds = [];
    for (const op of operations) {
      const result = await executeSingleOp(db, op);
      if (result.id) addedIds.push(result.id);
    }

    return res.json({ success: true, ids: addedIds });
  } catch (error) {
    console.error("firestoreWrite error:", error);
    return res.status(500).json({ error: "Yazma hatası: " + error.message });
  }
});

// ══════════════════════════════════════════════
// GET /api/db/:collection - Koleksiyon okuma
// Query params:
//   where=field:op:value (tekrarlanabilir) - op: eq, ne, gt, gte, lt, lte
//   orderBy=field:direction (asc/desc)
//   limit=N
// ══════════════════════════════════════════════
router.get("/:collection", async (req, res) => {
  const { collection } = req.params;

  if (!READABLE_COLLECTIONS.includes(collection)) {
    return res.status(403).json({ error: `Koleksiyon okuma izni yok: ${collection}` });
  }

  try {
    const db = getDb();
    const col = db.collection(collection);

    // MongoDB filter oluştur
    const filter = {};
    const whereParams = req.query.where
      ? (Array.isArray(req.query.where) ? req.query.where : [req.query.where])
      : [];

    for (const w of whereParams) {
      const parts = w.split(":");
      if (parts.length < 3) continue;
      const field = parts[0];
      const op = parts[1];
      const value = parts.slice(2).join(":");

      const mongoOps = { eq: "$eq", ne: "$ne", gt: "$gt", gte: "$gte", lt: "$lt", lte: "$lte" };
      if (op === "eq") {
        filter[field] = value;
      } else if (mongoOps[op]) {
        filter[field] = { [mongoOps[op]]: value };
      }
    }

    // Sort
    const sort = {};
    if (req.query.orderBy) {
      const [field, dir] = req.query.orderBy.split(":");
      sort[field] = dir === "desc" ? -1 : 1;
    }

    // Limit
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 0;

    let cursor = col.find(filter);
    if (Object.keys(sort).length > 0) cursor = cursor.sort(sort);
    if (limit > 0) cursor = cursor.limit(limit);

    const docs = await cursor.toArray();

    // _id'yi id olarak dönüştür (Firestore uyumluluğu)
    const result = docs.map(doc => {
      const { _id, ...rest } = doc;
      return { ...rest, id: _id.toString() };
    });

    return res.json(result);
  } catch (error) {
    console.error(`Read ${collection} error:`, error);
    return res.status(500).json({ error: "Okuma hatası: " + error.message });
  }
});

// GET /api/db/:collection/:docId - Tek doküman okuma
router.get("/:collection/:docId", async (req, res) => {
  const { collection, docId } = req.params;

  if (!READABLE_COLLECTIONS.includes(collection)) {
    return res.status(403).json({ error: `Koleksiyon okuma izni yok: ${collection}` });
  }

  try {
    const db = getDb();
    let doc = await db.collection(collection).findOne({ _id: docId });
    // String ile bulunamadıysa ObjectId ile dene
    if (!doc && ObjectId.isValid(docId)) {
      doc = await db.collection(collection).findOne({ _id: new ObjectId(docId) });
    }

    if (!doc) {
      return res.json({ exists: false, data: null });
    }

    const { _id, ...rest } = doc;
    return res.json({ exists: true, data: rest, id: _id.toString() });
  } catch (error) {
    console.error(`Read ${collection}/${docId} error:`, error);
    return res.status(500).json({ error: "Okuma hatası: " + error.message });
  }
});

module.exports = router;
