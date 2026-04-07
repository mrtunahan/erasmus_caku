const express = require("express");
const { ObjectId } = require("mongodb");
const { getDbSafe } = require("../config/database");

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
  "internship_applications",
  "internship_uploads",
  "internship_periods",
  "internship_roadmap",
  "commissions",
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
  "passwords",
];

// Rastgele ID üret (Firestore uyumlu 20 karakter)
function generateId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
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
    if (value && typeof value === "object" && value._methodName) continue;
    // __increment:N → MongoDB $inc
    if (typeof value === "string" && value.startsWith("__increment:")) {
      var incVal = parseInt(value.split(":")[1], 10);
      increments[key] = isNaN(incVal) ? 1 : incVal;
      continue;
    }
    cleaned[key] = value;
  }
  cleaned.updatedAt = new Date();
  if (isNew) cleaned.createdAt = new Date();
  return { cleaned, increments };
}

// Koleksiyon adı al (subcollection destekli)
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
    case "add": {
      const newId = generateId();
      const { cleaned } = addTimestamps(op.data, true);
      cleaned._id = newId;
      await col.insertOne(cleaned);
      return { success: true, id: newId };
    }
    case "set": {
      const { cleaned, increments } = addTimestamps(op.data, true);
      if (op.merge) {
        // merge: true → $set + $inc (upsert)
        const updateOps = { $set: cleaned };
        if (Object.keys(increments).length > 0) {
          updateOps.$inc = increments;
        }
        // createdAt sadece insert'te eklensin, update'te ezilmesin
        updateOps.$setOnInsert = { createdAt: new Date() };
        delete cleaned.createdAt;
        await col.updateOne(
          { _id: op.docId },
          updateOps,
          { upsert: true }
        );
      } else {
        // merge: false → dokümanı tamamen değiştir (upsert)
        cleaned._id = op.docId;
        await col.replaceOne(
          { _id: op.docId },
          cleaned,
          { upsert: true }
        );
      }
      return { success: true };
    }
    case "update": {
      const { cleaned, increments } = addTimestamps(op.data, false);
      const updateOps = { $set: cleaned };
      if (Object.keys(increments).length > 0) {
        updateOps.$inc = increments;
      }
      await col.updateOne({ _id: op.docId }, updateOps);
      return { success: true };
    }
    case "delete": {
      console.warn(`[DELETE] koleksiyon: ${colName}, docId: ${op.docId}, zaman: ${new Date().toISOString()}`);
      const result = await col.deleteOne({ _id: op.docId });
      console.warn(`[DELETE] sonuç: ${result.deletedCount} belge silindi (${colName}/${op.docId})`);
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

  // KORUMA: Tek istekte 20'den fazla silme işlemi engelle
  const deleteCount = operations.filter(op => op.type === "delete").length;
  if (deleteCount > 20) {
    console.error(`BLOCKED: ${deleteCount} silme işlemi engellendi (max 20)`);
    return res.status(403).json({ error: `Tek istekte en fazla 20 silme işlemi yapılabilir (istenen: ${deleteCount})` });
  }

  try {
    const db = await getDbSafe();

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
    console.error("dbWrite error:", error);
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
    const db = await getDbSafe();
    const col = db.collection(collection);

    // MongoDB filtre oluştur
    const filter = {};
    const whereParams = req.query.where
      ? (Array.isArray(req.query.where) ? req.query.where : [req.query.where])
      : [];

    const mongoOps = {
      eq: "$eq",
      ne: "$ne",
      gt: "$gt",
      gte: "$gte",
      lt: "$lt",
      lte: "$lte",
    };

    for (const w of whereParams) {
      const parts = w.split(":");
      if (parts.length < 3) continue;
      const field = parts[0];
      const op = parts[1];
      const value = parts.slice(2).join(":");

      const mongoOp = mongoOps[op];
      if (!mongoOp) continue;

      // Tip dönüşümü: s: prefix → string olarak koru
      let convertedValue = value;
      if (value.startsWith("s:")) {
        convertedValue = value.slice(2);
      } else if (value === "true") convertedValue = true;
      else if (value === "false") convertedValue = false;
      else if (value !== "" && !isNaN(value)) convertedValue = Number(value);

      if (op === "eq") {
        filter[field] = convertedValue;
      } else {
        filter[field] = filter[field] || {};
        filter[field][mongoOp] = convertedValue;
      }
    }

    // Sorgu oluştur
    let cursor = col.find(filter);

    // Sort
    if (req.query.orderBy) {
      const [field, dir] = req.query.orderBy.split(":");
      cursor = cursor.sort({ [field]: dir === "desc" ? -1 : 1 });
    }

    // Limit
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 0;
    if (limit > 0) {
      cursor = cursor.limit(limit);
    }

    const docs = await cursor.toArray();

    // _id → id dönüşümü (frontend uyumluluğu)
    const result = docs.map(doc => {
      const { _id, ...rest } = doc;
      return { ...rest, id: _id };
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
    const db = await getDbSafe();
    const doc = await db.collection(collection).findOne({ _id: docId });

    if (!doc) {
      return res.json({ exists: false, data: null });
    }

    const { _id, ...data } = doc;
    return res.json({ exists: true, data, id: _id });
  } catch (error) {
    console.error(`Read ${collection}/${docId} error:`, error);
    return res.status(500).json({ error: "Okuma hatası: " + error.message });
  }
});

module.exports = router;
