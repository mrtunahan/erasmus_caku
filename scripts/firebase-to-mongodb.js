/**
 * Firebase Firestore → MongoDB Migration Script
 *
 * Kullanım:
 *   1. scripts/serviceAccountKey.json dosyasının mevcut olduğundan emin olun
 *   2. MongoDB'nin localhost:27017'de çalıştığından emin olun
 *   3. cd server && npm install mongodb (eğer yoksa)
 *   4. node ../scripts/firebase-to-mongodb.js
 *
 * Bu script Firebase Firestore'daki tüm koleksiyonları okuyup
 * yerel MongoDB'ye aktarır.
 */

const admin = require("firebase-admin");
const { MongoClient } = require("mongodb");
const path = require("path");

// ── Ayarlar ──
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const MONGO_DB = process.env.MONGO_DB || "erasmus_caku";
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "serviceAccountKey.json");

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
  console.log("═══════════════════════════════════════════════\n");

  // 1. Firebase bağlantısı
  console.log("🔗 Firebase'e bağlanılıyor...");
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const firestore = admin.firestore();
  console.log("✓ Firebase bağlantısı kuruldu.\n");

  // 2. MongoDB bağlantısı
  console.log("🔗 MongoDB'ye bağlanılıyor...");
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const mongodb = mongo.db(MONGO_DB);
  console.log(`✓ MongoDB bağlantısı kuruldu (db: ${MONGO_DB}).\n`);

  // 3. Koleksiyonları aktar
  let totalDocs = 0;
  let totalCollections = 0;
  const summary = [];

  for (const collName of COLLECTIONS) {
    process.stdout.write(`📦 ${collName}... `);
    try {
      const snapshot = await firestore.collection(collName).get();

      if (snapshot.empty) {
        console.log("(boş, atlandı)");
        summary.push({ collection: collName, count: 0, status: "boş" });
        continue;
      }

      const docs = [];
      snapshot.forEach((doc) => {
        const data = convertFirestoreTypes(doc.data());
        docs.push({
          _id: doc.id, // Firestore doc ID → MongoDB _id
          ...data,
        });
      });

      // Mevcut koleksiyonu temizle (idempotent migration)
      await mongodb.collection(collName).deleteMany({});
      // Ekle
      await mongodb.collection(collName).insertMany(docs);

      console.log(`${docs.length} belge aktarıldı ✓`);
      summary.push({ collection: collName, count: docs.length, status: "OK" });
      totalDocs += docs.length;
      totalCollections++;
    } catch (err) {
      console.log(`HATA: ${err.message}`);
      summary.push({ collection: collName, count: 0, status: `HATA: ${err.message}` });
    }
  }

  // 4. Özet
  console.log("\n═══════════════════════════════════════════════");
  console.log("  Migration Özeti");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Toplam koleksiyon: ${totalCollections}`);
  console.log(`  Toplam belge:      ${totalDocs}`);
  console.log("───────────────────────────────────────────────");
  summary.forEach(s => {
    const icon = s.status === "OK" ? "✓" : s.status === "boş" ? "○" : "✗";
    console.log(`  ${icon} ${s.collection.padEnd(35)} ${String(s.count).padStart(5)} belge  ${s.status}`);
  });
  console.log("═══════════════════════════════════════════════\n");

  // Kapat
  await mongo.close();
  console.log("Bağlantılar kapatıldı. Migration tamamlandı!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("\n❌ Migration hatası:", err);
  process.exit(1);
});
