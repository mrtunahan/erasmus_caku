#!/usr/bin/env node
/**
 * Firebase Firestore → MongoDB Tam Yedekleme & Aktarma Scripti
 *
 * Kullanım:
 *   1. Firebase service account key dosyasını indirin:
 *      Firebase Console → Project Settings → Service Accounts → Generate New Private Key
 *   2. Key dosyasını scripts/ klasörüne koyun
 *   3. Çalıştırın:
 *      node scripts/firebase-to-mongodb.js --key=scripts/serviceAccountKey.json
 *
 *   Opsiyonel parametreler:
 *      --export-only     : Sadece JSON export yap, MongoDB'ye aktarma
 *      --mongo-uri=...   : MongoDB bağlantı URI (varsayılan: mongodb://localhost:27017)
 *      --db-name=...     : MongoDB veritabanı adı (varsayılan: caku_erasmus)
 *      --output-dir=...  : JSON çıktı dizini (varsayılan: ./firestore-backup)
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// ── Parametreleri oku ──
const args = {};
process.argv.slice(2).forEach(arg => {
  if (arg.startsWith("--")) {
    const [key, ...valParts] = arg.slice(2).split("=");
    args[key] = valParts.length > 0 ? valParts.join("=") : true;
  }
});

const SERVICE_ACCOUNT_PATH = args["key"] || args["service-account"] || null;
const EXPORT_ONLY = !!args["export-only"];
const MONGO_URI = args["mongo-uri"] || "mongodb://localhost:27017";
const DB_NAME = args["db-name"] || "caku_erasmus";
const OUTPUT_DIR = args["output-dir"] || "./firestore-backup";

// Tüm bilinen koleksiyonlar (alt koleksiyonlar dahil)
const COLLECTIONS = [
  "students",
  "users",
  "professors",
  "passwords",
  "departments",
  "department_classrooms",
  "department_supervisors",
  "sinav_programi",
  "sinav_dersler",
  "sinav_donemler",
  "exams",
  "exam_results",
  "exam_periods",
  "course_groups",
  "course_group_posts",
  "course_schedules",
  "trip_history",
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
  "yaz_okulu_students",
  "yaz_okulu_records",
  "yaz_okulu_settings",
  "surveys",
  "events",
  "resources",
  "forms",
  "internships",
];

// Alt koleksiyonlar: { parent: "parentCollection", sub: "subCollectionName" }
const SUBCOLLECTIONS = [
  { parent: "portal_posts", sub: "comments" },
  { parent: "portal_notifications", sub: "items" },
];

// ── Yardımcı fonksiyonlar ──

// Firestore Timestamp ve diğer özel tipleri JSON-serileştirilebilir hale getir
function serializeDoc(data) {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  // Firestore Timestamp
  if (data.constructor && data.constructor.name === "Timestamp") {
    return { _type: "timestamp", _seconds: data.seconds, _nanoseconds: data.nanoseconds, _isoDate: data.toDate().toISOString() };
  }
  // Firestore GeoPoint
  if (data.constructor && data.constructor.name === "GeoPoint") {
    return { _type: "geopoint", latitude: data.latitude, longitude: data.longitude };
  }
  // Firestore DocumentReference
  if (data.constructor && data.constructor.name === "DocumentReference") {
    return { _type: "reference", path: data.path };
  }

  if (Array.isArray(data)) {
    return data.map(item => serializeDoc(item));
  }

  const result = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = serializeDoc(value);
  }
  return result;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function log(msg) {
  const now = new Date().toLocaleTimeString("tr-TR");
  console.log(`[${now}] ${msg}`);
}

// ── Firebase'den tüm verileri export et ──
async function exportFirestore(db) {
  ensureDir(OUTPUT_DIR);

  const summary = { timestamp: new Date().toISOString(), collections: {}, totalDocuments: 0 };

  // Ana koleksiyonlar
  for (const colName of COLLECTIONS) {
    try {
      const snapshot = await db.collection(colName).get();
      const docs = [];

      snapshot.forEach(doc => {
        docs.push({
          _id: doc.id,
          _firestoreId: doc.id,
          ...serializeDoc(doc.data()),
        });
      });

      const filePath = path.join(OUTPUT_DIR, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf8");

      summary.collections[colName] = docs.length;
      summary.totalDocuments += docs.length;
      log(`✓ ${colName}: ${docs.length} belge export edildi`);
    } catch (e) {
      log(`✗ ${colName}: HATA - ${e.message}`);
      summary.collections[colName] = `ERROR: ${e.message}`;
    }
  }

  // Alt koleksiyonlar
  for (const { parent, sub } of SUBCOLLECTIONS) {
    try {
      const parentSnapshot = await db.collection(parent).get();
      const allSubDocs = [];

      for (const parentDoc of parentSnapshot.docs) {
        const subSnapshot = await parentDoc.ref.collection(sub).get();
        subSnapshot.forEach(subDoc => {
          allSubDocs.push({
            _id: `${parentDoc.id}_${subDoc.id}`,
            _firestoreId: subDoc.id,
            _parentId: parentDoc.id,
            _parentCollection: parent,
            ...serializeDoc(subDoc.data()),
          });
        });
      }

      const colKey = `${parent}__${sub}`;
      const filePath = path.join(OUTPUT_DIR, `${colKey}.json`);
      fs.writeFileSync(filePath, JSON.stringify(allSubDocs, null, 2), "utf8");

      summary.collections[colKey] = allSubDocs.length;
      summary.totalDocuments += allSubDocs.length;
      log(`✓ ${parent}/{id}/${sub}: ${allSubDocs.length} alt belge export edildi`);
    } catch (e) {
      log(`✗ ${parent}/{id}/${sub}: HATA - ${e.message}`);
    }
  }

  // Özet dosyası
  const summaryPath = path.join(OUTPUT_DIR, "_backup_summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");

  log(`\n════════════════════════════════════════`);
  log(`EXPORT TAMAMLANDI`);
  log(`Toplam: ${summary.totalDocuments} belge, ${Object.keys(summary.collections).length} koleksiyon`);
  log(`Dizin: ${path.resolve(OUTPUT_DIR)}`);
  log(`════════════════════════════════════════\n`);

  return summary;
}

// ── MongoDB'ye import et ──
async function importToMongoDB() {
  let MongoClient;
  try {
    MongoClient = require("mongodb").MongoClient;
  } catch (e) {
    log("mongodb paketi bulunamadı. Yükleniyor...");
    const { execSync } = require("child_process");
    execSync("npm install mongodb --no-save", { stdio: "inherit" });
    MongoClient = require("mongodb").MongoClient;
  }

  log(`MongoDB'ye bağlanılıyor: ${MONGO_URI}`);
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  log(`Veritabanı: ${DB_NAME}`);

  // JSON dosyalarını oku ve import et
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith(".json") && !f.startsWith("_"));

  let totalImported = 0;

  for (const file of files) {
    const colName = file.replace(".json", "");
    const filePath = path.join(OUTPUT_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    if (!Array.isArray(data) || data.length === 0) {
      log(`⊘ ${colName}: Boş koleksiyon, atlanıyor`);
      continue;
    }

    try {
      // GÜVENLİK: Mevcut veriyi silmeden önce kontrol
      const existingCount = await db.collection(colName).countDocuments();
      if (existingCount > 0 && !args["force-overwrite"]) {
        log(`⚠ ${colName}: ${existingCount} mevcut belge var, --force-overwrite olmadan atlanıyor`);
        continue;
      }
      if (existingCount > 0) {
        log(`⚠ ${colName}: ${existingCount} mevcut belge SİLİNİYOR (force-overwrite)`);
      }
      await db.collection(colName).drop().catch(() => {});
      // Import et
      await db.collection(colName).insertMany(data);
      totalImported += data.length;
      log(`✓ ${colName}: ${data.length} belge import edildi`);
    } catch (e) {
      log(`✗ ${colName}: HATA - ${e.message}`);
    }
  }

  log(`\n════════════════════════════════════════`);
  log(`MONGODB IMPORT TAMAMLANDI`);
  log(`Toplam: ${totalImported} belge`);
  log(`Veritabanı: ${DB_NAME}`);
  log(`URI: ${MONGO_URI}`);
  log(`════════════════════════════════════════\n`);

  await client.close();
}

// ── Ana akış ──
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║   Firebase Firestore → MongoDB Yedekleme & Aktarma   ║
║   Proje: caku-erasmus                                 ║
╚══════════════════════════════════════════════════════╝
`);

  // Firebase Admin SDK'yı başlat
  if (!SERVICE_ACCOUNT_PATH) {
    console.error(`
HATA: Service account key dosyası belirtilmedi!

Kullanım:
  node scripts/firebase-to-mongodb.js --key=scripts/serviceAccountKey.json

Service account key nasıl alınır:
  1. https://console.firebase.google.com/project/caku-erasmus/settings/serviceaccounts/adminsdk
  2. "Generate New Private Key" butonuna tıklayın
  3. İndirilen JSON dosyasını scripts/ klasörüne koyun
`);
    process.exit(1);
  }

  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`HATA: Service account key dosyası bulunamadı: ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
  }

  log("Firebase Admin SDK başlatılıyor...");
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || "caku-erasmus",
  });

  const db = admin.firestore();

  // Bağlantı testi
  try {
    const testSnap = await db.collection("departments").limit(1).get();
    log(`Firebase bağlantısı başarılı! (departments: ${testSnap.size} test belgesi)`);
  } catch (e) {
    console.error(`Firebase bağlantı hatası: ${e.message}`);
    process.exit(1);
  }

  // Export
  await exportFirestore(db);

  // MongoDB import
  if (!EXPORT_ONLY) {
    await importToMongoDB();
  } else {
    log("--export-only modu: MongoDB import atlandı.");
  }

  log("İşlem tamamlandı!");
  process.exit(0);
}

main().catch(e => {
  console.error("Kritik hata:", e);
  process.exit(1);
});
