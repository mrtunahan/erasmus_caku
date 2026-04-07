/**
 * Firebase Firestore → MongoDB Migration Script
 *
 * Kullanım:
 *   1. scripts/serviceAccountKey.json dosyasının mevcut olduğundan emin olun
 *   2. MongoDB'nin localhost:27017'de çalıştığından emin olun
 *   3. cd server && npm install
 *   4. node ../scripts/firebase-to-mongodb.js [--mode=merge|replace|dry-run]
 *
 * Modlar:
 *   merge   (varsayılan) - Firebase verileri ile lokaldeki MongoDB verileri birleştirilir.
 *             Aynı _id'ye sahip dokümanlar: Firebase verisi ile güncellenir (upsert).
 *             Sadece lokal'de olan dokümanlar korunur. Sıfır veri kaybı.
 *   replace - Koleksiyonları tamamen Firebase verileri ile değiştirir (eski davranış).
 *   dry-run - Hiçbir yazma yapmaz, sadece ne yapılacağını raporlar.
 */

const admin = require("firebase-admin");
const { MongoClient } = require("mongodb");
const path = require("path");

// ── Ayarlar ──
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const MONGO_DB = process.env.MONGO_DB || "erasmus_caku";
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "serviceAccountKey.json");

// Mod kontrolü
const args = process.argv.slice(2);
const modeArg = args.find(a => a.startsWith("--mode="));
const MODE = modeArg ? modeArg.split("=")[1] : "merge";

if (!["merge", "replace", "dry-run"].includes(MODE)) {
  console.error("Geçersiz mod: " + MODE + ". Kullanılabilir: merge, replace, dry-run");
  process.exit(1);
}

// Aktarılacak koleksiyonlar
const COLLECTIONS = [
  "students",
  "professors",
  "users",
  "passwords",
  "departments",
  "department_classrooms",
  "department_supervisors",
  "commissions",
  // Staj
  "internship_applications",
  "internship_uploads",
  "internship_periods",
  "internship_roadmap",
  // Sınav
  "sinav_programi",
  "sinav_dersler",
  "sinav_donemler",
  "exams",
  "exam_results",
  "exam_periods",
  // Portal
  "portal_posts",
  "portal_posts_comments",
  "portal_moderators",
  "portal_notifications",
  "portal_notifications_items",
  "portal_profiles",
  "portal_follows",
  "portal_reports",
  // Muafiyet
  "muafiyet_settings",
  "muafiyet_records",
  // Projeler
  "projects",
  "project_courses",
  "unides_projects",
  "unides_courses",
  "tubitak2209_projects",
  "tubitak2209_courses",
  // Ders
  "course_schedules",
  "course_groups",
  "course_group_posts",
  // Diğer
  "forms",
  "resources",
  "surveys",
  "events",
  "trip_history",
  "akademisyen_cache",
  "yaz_okulu_students",
  "yaz_okulu_records",
  "yaz_okulu_settings",
  "internships",
];

// ── Firebase Timestamp → JS Date dönüşümü ──
function convertFirestoreTypes(obj) {
  if (obj === null || obj === undefined) return obj;

  // Firestore Timestamp
  if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
    return new Date(obj._seconds * 1000 + obj._nanoseconds / 1000000);
  }

  // toDate() metodu olan Timestamp nesneleri
  if (typeof obj.toDate === "function") {
    return obj.toDate();
  }

  if (Array.isArray(obj)) {
    return obj.map(convertFirestoreTypes);
  }

  if (typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertFirestoreTypes(value);
    }
    return result;
  }

  return obj;
}

async function migrate() {
  console.log("═══════════════════════════════════════════════");
  console.log("  Firebase Firestore → MongoDB Migration");
  console.log("  Mod: " + MODE.toUpperCase());
  console.log("═══════════════════════════════════════════════\n");

  // 1. Firebase bağlantısı
  console.log("Firebase'e bağlanılıyor...");
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const firestore = admin.firestore();
  console.log("Firebase bağlantısı kuruldu.\n");

  // 2. MongoDB bağlantısı
  console.log("MongoDB'ye bağlanılıyor...");
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const mongodb = mongo.db(MONGO_DB);
  console.log("MongoDB bağlantısı kuruldu (db: " + MONGO_DB + ").\n");

  // 3. Koleksiyonları aktar
  let totalDocs = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalCollections = 0;
  const summary = [];

  for (const collName of COLLECTIONS) {
    process.stdout.write("[" + collName + "] ");
    try {
      const snapshot = await firestore.collection(collName).get();

      if (snapshot.empty) {
        console.log("(Firebase'de boş, atlandı)");
        summary.push({ collection: collName, firebase: 0, inserted: 0, updated: 0, status: "boş" });
        continue;
      }

      const firebaseDocs = [];
      snapshot.forEach((doc) => {
        const data = convertFirestoreTypes(doc.data());
        firebaseDocs.push({
          _id: doc.id,
          ...data,
        });
      });

      if (MODE === "dry-run") {
        // Sadece rapor
        const mongoCount = await mongodb.collection(collName).countDocuments();
        console.log("Firebase: " + firebaseDocs.length + " belge, MongoDB: " + mongoCount + " belge (dry-run)");
        summary.push({ collection: collName, firebase: firebaseDocs.length, mongoExisting: mongoCount, inserted: 0, updated: 0, status: "dry-run" });
        totalDocs += firebaseDocs.length;
        totalCollections++;
        continue;
      }

      if (MODE === "replace") {
        // Eski davranış: sil ve yeniden yaz
        await mongodb.collection(collName).deleteMany({});
        await mongodb.collection(collName).insertMany(firebaseDocs);
        console.log(firebaseDocs.length + " belge aktarıldı (replace)");
        summary.push({ collection: collName, firebase: firebaseDocs.length, inserted: firebaseDocs.length, updated: 0, status: "OK" });
        totalDocs += firebaseDocs.length;
        totalInserted += firebaseDocs.length;
        totalCollections++;
        continue;
      }

      // MODE === "merge" (varsayılan)
      let inserted = 0;
      let updated = 0;
      const bulkOps = firebaseDocs.map((doc) => ({
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true,
        },
      }));

      if (bulkOps.length > 0) {
        const result = await mongodb.collection(collName).bulkWrite(bulkOps, { ordered: false });
        inserted = result.upsertedCount || 0;
        updated = result.modifiedCount || 0;
      }

      // Sadece lokal'de olan doküman sayısını kontrol et
      const mongoTotal = await mongodb.collection(collName).countDocuments();
      const localOnly = mongoTotal - firebaseDocs.length;

      console.log(
        "Firebase: " + firebaseDocs.length +
        " | yeni: " + inserted +
        " | güncellenen: " + updated +
        (localOnly > 0 ? " | sadece lokal: " + localOnly : "") +
        " (merge)"
      );
      summary.push({
        collection: collName,
        firebase: firebaseDocs.length,
        inserted,
        updated,
        localOnly: localOnly > 0 ? localOnly : 0,
        status: "OK",
      });
      totalDocs += firebaseDocs.length;
      totalInserted += inserted;
      totalUpdated += updated;
      totalCollections++;
    } catch (err) {
      console.log("HATA: " + err.message);
      summary.push({ collection: collName, firebase: 0, inserted: 0, updated: 0, status: "HATA: " + err.message });
    }
  }

  // 4. Özet
  console.log("\n═══════════════════════════════════════════════");
  console.log("  Migration Özeti (" + MODE.toUpperCase() + ")");
  console.log("═══════════════════════════════════════════════");
  console.log("  Toplam koleksiyon: " + totalCollections);
  console.log("  Firebase belge:    " + totalDocs);
  if (MODE !== "dry-run") {
    console.log("  Yeni eklenen:      " + totalInserted);
    console.log("  Güncellenen:       " + totalUpdated);
  }
  console.log("───────────────────────────────────────────────");
  summary.forEach(s => {
    const icon = s.status === "OK" ? "+" : s.status === "boş" ? "o" : s.status === "dry-run" ? "~" : "x";
    const detail = MODE === "dry-run"
      ? "Firebase:" + s.firebase + " MongoDB:" + (s.mongoExisting || 0)
      : "yeni:" + s.inserted + " guncellenen:" + s.updated + (s.localOnly ? " lokal:" + s.localOnly : "");
    console.log("  [" + icon + "] " + s.collection.padEnd(35) + " " + detail + "  " + s.status);
  });
  console.log("═══════════════════════════════════════════════\n");

  // Kapat
  await mongo.close();
  console.log("Bağlantılar kapatıldı. Migration tamamlandı!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("\nMigration hatası:", err);
  process.exit(1);
});
