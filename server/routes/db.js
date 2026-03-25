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
];

// Timestamp alanlarını temizle ve sunucu timestamp'i ekle
function addTimestamps(data, isNew) {
  const cleaned = {};
  for (const [key, value] of Object.entries(data || {})) {
    // Client-side FieldValue.serverTimestamp() serialize edilemez, atla
    if (value && typeof value === "object" && value._methodName) continue;
    cleaned[key] = value;
  }
  cleaned.updatedAt = new Date();
  if (isNew) cleaned.createdAt = new Date();
  return cleaned;
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
      const data = addTimestamps(op.data, true);
      const result = await col.insertOne(data);
      return { success: true, id: result.insertedId.toString() };
    }
    case "set": {
      const data = addTimestamps(op.data, true);
      if (op.merge) {
        await col.updateOne(
          { _id: op.docId },
          { $set: data },
          { upsert: true }
        );
      } else {
        await col.replaceOne(
          { _id: op.docId },
          { ...data, _id: op.docId },
          { upsert: true }
        );
      }
      return { success: true };
    }
    case "update": {
      const data = addTimestamps(op.data, false);
      await col.updateOne(
        { _id: op.docId },
        { $set: data }
      );
      return { success: true };
    }
    case "delete": {
      await col.deleteOne({ _id: op.docId });
      return { success: true };
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

module.exports = router;
