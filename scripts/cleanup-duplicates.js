/**
 * MongoDB Duplicate Cleaner Script
 *
 * Tekrar eden verileri tespit edip temizler.
 * Kullanım: cd server && node ../scripts/cleanup-duplicates.js [--dry-run]
 */

const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const MONGO_DB = process.env.MONGO_DB || "erasmus_caku";
const DRY_RUN = process.argv.includes("--dry-run");

// Her koleksiyon için benzersizlik alanları
// Aynı alanlara sahip kayıtlar "tekrar" sayılır
const DEDUP_RULES = {
  students: { fields: ["studentNumber"], label: "Öğrenci No" },
  professors: { fields: ["name"], label: "Profesör Adı" },
  users: { fields: ["studentNumber"], label: "Kullanıcı" },
  departments: { fields: ["name"], label: "Bölüm Adı" },
  sinav_programi: { fields: ["dersAdi", "departmentId", "donem"], label: "Sınav" },
  sinav_dersler: { fields: ["dersKodu", "departmentId"], label: "Ders Kodu" },
  projects: { fields: ["title", "departmentId"], label: "Proje" },
  portal_posts: { fields: ["content", "authorId"], label: "Portal Post" },
  portal_profiles: { fields: ["studentNumber"], label: "Portal Profil" },
  forms: { fields: ["title"], label: "Form" },
  trip_history: { fields: ["timestamp", "action", "userId"], label: "Trip" },
  course_schedules: { fields: ["departmentId", "donem"], label: "Ders Programı" },
  akademisyen_cache: { fields: ["_id"], label: "Akademisyen" },
  internship_applications: { fields: ["ogrenciNo"], label: "Staj Başvuru" },
  internship_uploads: { fields: ["ogrenciNo"], label: "Staj Yükleme" },
  commissions: { fields: ["name"], label: "Komisyon" },
  department_classrooms: { fields: ["departmentId", "name"], label: "Derslik" },
  department_supervisors: { fields: ["departmentId", "name"], label: "Danışman" },
  muafiyet_settings: { fields: ["departmentId"], label: "Muafiyet Ayar" },
  muafiyet_records: { fields: ["studentNumber"], label: "Muafiyet Kayıt" },
};

async function findAndRemoveDuplicates(db, collName, rule) {
  const col = db.collection(collName);
  const totalCount = await col.countDocuments();

  if (totalCount === 0) return { collection: collName, total: 0, duplicates: 0, removed: 0 };

  // Alanların var olup olmadığını kontrol et (ilk dokümana bak)
  const sample = await col.findOne();
  const validFields = rule.fields.filter(f => f === "_id" || (sample && sample[f] !== undefined));

  if (validFields.length === 0) {
    // Hiçbir alan yoksa, tüm alanları karşılaştır (_id ve timestamp hariç)
    return await findExactDuplicates(db, collName, totalCount);
  }

  // Aggregation ile grup oluştur
  const groupId = {};
  validFields.forEach(f => { groupId[f] = "$" + f; });

  const pipeline = [
    { $group: { _id: groupId, count: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } }
  ];

  const dupes = await col.aggregate(pipeline).toArray();

  if (dupes.length === 0) {
    return { collection: collName, total: totalCount, duplicates: 0, removed: 0 };
  }

  let totalRemoved = 0;
  for (const dupe of dupes) {
    // İlk kaydı koru, gerisini sil
    const idsToRemove = dupe.ids.slice(1);
    if (!DRY_RUN) {
      const result = await col.deleteMany({ _id: { $in: idsToRemove } });
      totalRemoved += result.deletedCount;
    } else {
      totalRemoved += idsToRemove.length;
    }
  }

  return { collection: collName, total: totalCount, duplicates: dupes.length, removed: totalRemoved };
}

// Tam eşleşme ile tekrar tespiti (alanlar bilinmiyorsa)
async function findExactDuplicates(db, collName, totalCount) {
  const col = db.collection(collName);
  const docs = await col.find().toArray();

  const seen = new Map();
  const toRemove = [];

  for (const doc of docs) {
    const { _id, createdAt, updatedAt, ...rest } = doc;
    const hash = JSON.stringify(rest);
    if (seen.has(hash)) {
      toRemove.push(_id);
    } else {
      seen.set(hash, _id);
    }
  }

  if (toRemove.length > 0 && !DRY_RUN) {
    await col.deleteMany({ _id: { $in: toRemove } });
  }

  return { collection: collName, total: totalCount, duplicates: toRemove.length, removed: toRemove.length };
}

async function cleanup() {
  console.log("═══════════════════════════════════════════════");
  console.log("  MongoDB Duplicate Cleaner");
  console.log("  Mod: " + (DRY_RUN ? "DRY-RUN (silme yapılmaz)" : "TEMIZLE"));
  console.log("═══════════════════════════════════════════════\n");

  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const db = mongo.db(MONGO_DB);

  // Tüm koleksiyonları al
  const collections = await db.listCollections().toArray();
  const collNames = collections.map(c => c.name).sort();

  const results = [];
  let totalDuplicates = 0;
  let totalRemoved = 0;

  for (const collName of collNames) {
    const rule = DEDUP_RULES[collName];
    let result;

    if (rule) {
      result = await findAndRemoveDuplicates(db, collName, rule);
    } else {
      // Kural tanımlı değilse tam eşleşme kontrolü
      const count = await db.collection(collName).countDocuments();
      result = await findExactDuplicates(db, collName, count);
    }

    if (result.duplicates > 0) {
      console.log(`[${collName}] ${result.total} kayıt, ${result.duplicates} tekrar grubu, ${result.removed} silindi`);
    }

    results.push(result);
    totalDuplicates += result.duplicates;
    totalRemoved += result.removed;
  }

  // Özet
  console.log("\n═══════════════════════════════════════════════");
  console.log("  Temizlik Özeti" + (DRY_RUN ? " (DRY-RUN)" : ""));
  console.log("═══════════════════════════════════════════════");

  const withDupes = results.filter(r => r.duplicates > 0);
  if (withDupes.length === 0) {
    console.log("  Tekrar eden kayıt bulunamadı!");
  } else {
    withDupes.forEach(r => {
      console.log(`  ${r.collection.padEnd(30)} ${String(r.duplicates).padStart(4)} tekrar → ${r.removed} silindi`);
    });
    console.log("───────────────────────────────────────────────");
    console.log(`  Toplam tekrar grubu: ${totalDuplicates}`);
    console.log(`  Toplam silinen:      ${totalRemoved}`);
  }
  console.log("═══════════════════════════════════════════════\n");

  await mongo.close();
  process.exit(0);
}

cleanup().catch(err => {
  console.error("Hata:", err);
  process.exit(1);
});
