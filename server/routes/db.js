const express = require("express");
const admin = require("firebase-admin");
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
    // __increment:N → Firestore FieldValue.increment
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

// addTimestamps sonucunu Firestore update verisine çevir
function buildUpdateData(data, isNew) {
  const { cleaned, increments } = addTimestamps(data, isNew);
  // Increment alanlarını FieldValue.increment ile ekle
  for (const [key, val] of Object.entries(increments)) {
    cleaned[key] = admin.firestore.FieldValue.increment(val);
  }
  return cleaned;
}

// Koleksiyon referansı al (subcollection destekli)
function getCollection(db, op) {
  // Firestore'da subcollection yok (düz koleksiyon olarak saklıyoruz)
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
      const docRef = await col.add(cleaned);
      return { success: true, id: docRef.id };
    }
    case "set": {
      const { cleaned } = addTimestamps(op.data, true);
      if (op.merge) {
        await col.doc(op.docId).set(cleaned, { merge: true });
      } else {
        await col.doc(op.docId).set(cleaned);
      }
      return { success: true };
    }
    case "update": {
      const updateData = buildUpdateData(op.data, false);
      await col.doc(op.docId).update(updateData);
      return { success: true };
    }
    case "delete": {
      console.warn(`[DELETE] koleksiyon: ${op.collection}, docId: ${op.docId}, zaman: ${new Date().toISOString()}`);
      await col.doc(op.docId).delete();
      console.warn(`[DELETE] sonuç: belge silindi (${op.collection}/${op.docId})`);
      return { success: true, deleted: 1 };
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
    const db = await getDbSafe();
    let query = db.collection(collection);

    // Firestore where filtresi oluştur
    const whereParams = req.query.where
      ? (Array.isArray(req.query.where) ? req.query.where : [req.query.where])
      : [];

    const firestoreOps = {
      eq: "==",
      ne: "!=",
      gt: ">",
      gte: ">=",
      lt: "<",
      lte: "<=",
    };

    for (const w of whereParams) {
      const parts = w.split(":");
      if (parts.length < 3) continue;
      const field = parts[0];
      const op = parts[1];
      const value = parts.slice(2).join(":");

      const fsOp = firestoreOps[op];
      if (fsOp) {
        // Tip dönüşümü: string → uygun tip
        let convertedValue = value;
        if (value === "true") convertedValue = true;
        else if (value === "false") convertedValue = false;
        else if (value !== "" && !isNaN(value)) convertedValue = Number(value);
        query = query.where(field, fsOp, convertedValue);
      }
    }

    // Sort
    if (req.query.orderBy) {
      const [field, dir] = req.query.orderBy.split(":");
      query = query.orderBy(field, dir === "desc" ? "desc" : "asc");
    }

    // Limit
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 0;
    if (limit > 0) {
      query = query.limit(limit);
    }

    const snapshot = await query.get();

    const result = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    }));

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
    const docRef = db.collection(collection).doc(docId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.json({ exists: false, data: null });
    }

    return res.json({ exists: true, data: doc.data(), id: doc.id });
  } catch (error) {
    console.error(`Read ${collection}/${docId} error:`, error);
    return res.status(500).json({ error: "Okuma hatası: " + error.message });
  }
});

module.exports = router;
