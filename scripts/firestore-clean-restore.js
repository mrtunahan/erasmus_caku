#!/usr/bin/env node
/**
 * Firestore'daki tüm koleksiyonları temizle ve belirtilen backup'ı yükle
 * Kullanım: node scripts/firestore-clean-restore.js 00-44-26
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const SERVICE_ACCOUNT_PATH = path.join(__dirname, "serviceAccountKey.json");
const BACKUPS_DIR = path.join(__dirname, "..", "mongo-backups");
const BATCH_SIZE = 500;
const SKIP_FILES = ["_summary.json", "system.profile.json"];

const serviceAccount = require(SERVICE_ACCOUNT_PATH);
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

function log(msg) {
  const now = new Date().toLocaleTimeString("tr-TR");
  console.log(`[${now}] ${msg}`);
}

// Backup dizinini bul
function findBackupDir() {
  const arg = process.argv[2] || "";
  if (!arg) { console.error("Kullanım: node scripts/firestore-clean-restore.js <backup-adı>"); process.exit(1); }
  if (fs.existsSync(arg)) return arg;
  const entries = fs.readdirSync(BACKUPS_DIR, { withFileTypes: true });
  const match = entries.filter(e => e.isDirectory() && e.name.includes(arg)).map(e => e.name).sort();
  if (match.length > 0) return path.join(BACKUPS_DIR, match[match.length - 1]);
  console.error(`Backup bulunamadı: ${arg}`);
  process.exit(1);
}

// Koleksiyondaki TÜM belgeleri sil
async function deleteCollection(collectionName) {
  const col = db.collection(collectionName);
  const snapshot = await col.get();
  if (snapshot.empty) return 0;

  let deleted = 0;
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + BATCH_SIZE);
    chunk.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
}

// MongoDB tiplerini dönüştür
function convertMongoTypes(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(convertMongoTypes);
  if (value["$date"]) return new Date(value["$date"]);
  if (value["$oid"]) return value["$oid"];
  if (value["$numberLong"]) return Number(value["$numberLong"]);
  if (value["$numberDouble"]) return Number(value["$numberDouble"]);
  if (value["$numberInt"]) return Number(value["$numberInt"]);
  const result = {};
  for (const [k, v] of Object.entries(value)) {
    result[k] = convertMongoTypes(v);
  }
  return result;
}

async function main() {
  const backupDir = findBackupDir();
  log(`Backup: ${backupDir}`);

  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith(".json") && !SKIP_FILES.includes(f))
    .sort();

  log(`${files.length} koleksiyon bulundu`);

  // 1. ADIM: Tüm Firestore koleksiyonlarını temizle
  log("=== ADIM 1: Firestore temizleniyor ===");
  const allCollections = await db.listCollections();
  for (const col of allCollections) {
    const count = await deleteCollection(col.id);
    if (count > 0) log(`  ${col.id}: ${count} belge silindi`);
  }
  log("Firestore temizlendi.");

  // 2. ADIM: Backup'ı yükle
  log("=== ADIM 2: Backup yükleniyor ===");
  let totalDocs = 0;

  for (const file of files) {
    const colName = file.replace(".json", "");
    const data = JSON.parse(fs.readFileSync(path.join(backupDir, file), "utf8"));
    if (!Array.isArray(data) || data.length === 0) continue;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = data.slice(i, i + BATCH_SIZE);

      for (const doc of chunk) {
        const id = String(doc._id && doc._id["$oid"] ? doc._id["$oid"] : doc._id || doc.id || "");
        if (!id) continue;
        const cleaned = convertMongoTypes(doc);
        delete cleaned._id;
        delete cleaned.id;
        batch.set(db.collection(colName).doc(id), cleaned);
      }
      await batch.commit();
    }

    log(`  ${colName}: ${data.length} belge yüklendi`);
    totalDocs += data.length;
  }

  log(`\n=== TAMAMLANDI: ${totalDocs} belge yüklendi ===`);
  process.exit(0);
}

main().catch(err => { console.error("HATA:", err); process.exit(1); });
