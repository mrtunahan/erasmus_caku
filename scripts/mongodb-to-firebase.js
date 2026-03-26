#!/usr/bin/env node
/**
 * MongoDB Backup -> Firebase Firestore Migration Script
 *
 * Reads JSON files from the latest MongoDB backup directory and uploads
 * them to Firebase Firestore using the Admin SDK.
 *
 * Usage:
 *   node scripts/mongodb-to-firebase.js
 *
 * Prerequisites:
 *   - npm install firebase-admin
 *   - Place your service account key at scripts/serviceAccountKey.json
 *   - MongoDB backup JSON files in mongo-backups/<timestamp>/ directory
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// ── Configuration ──
const PROJECT_ID = "caku-erasmus";
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "serviceAccountKey.json");
const BACKUPS_DIR = path.join(__dirname, "..", "mongo-backups");
const BATCH_SIZE = 500; // Firestore batch write limit
const SKIP_FILES = ["_summary.json", "system.profile.json"];

// ── Helpers ──

function log(msg) {
  const now = new Date().toLocaleTimeString("tr-TR");
  console.log(`[${now}] ${msg}`);
}

/**
 * Find the latest backup directory inside mongo-backups/.
 * Backup directories are expected to be named with timestamps or dates,
 * so sorting alphabetically and picking the last one gives the latest.
 * If the backups dir itself contains JSON files directly (no subdirectories),
 * use the backups dir as the source.
 */
function findLatestBackupDir() {
  // Komut satırı argümanı kontrolü
  const arg = process.argv[2] || "";

  if (arg) {
    // Tam yol verilmişse direkt kullan
    if (fs.existsSync(arg)) return arg;
    // Kısmi isim verilmişse backup dizininde ara
    if (fs.existsSync(BACKUPS_DIR)) {
      const entries = fs.readdirSync(BACKUPS_DIR, { withFileTypes: true });
      const match = entries
        .filter((e) => e.isDirectory() && e.name.includes(arg))
        .map((e) => e.name)
        .sort();
      if (match.length > 0) return path.join(BACKUPS_DIR, match[match.length - 1]);
    }
    console.error(`ERROR: Backup not found: ${arg}`);
    process.exit(1);
  }

  if (!fs.existsSync(BACKUPS_DIR)) {
    console.error(`ERROR: Backup directory not found: ${BACKUPS_DIR}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(BACKUPS_DIR, { withFileTypes: true });

  // Check for subdirectories first
  const subdirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  if (subdirs.length > 0) {
    const latest = subdirs[subdirs.length - 1];
    return path.join(BACKUPS_DIR, latest);
  }

  // If no subdirectories, check if JSON files exist directly in BACKUPS_DIR
  const jsonFiles = entries.filter(
    (e) => e.isFile() && e.name.endsWith(".json")
  );
  if (jsonFiles.length > 0) {
    return BACKUPS_DIR;
  }

  console.error(`ERROR: No backup directories or JSON files found in ${BACKUPS_DIR}`);
  process.exit(1);
}

/**
 * Recursively convert MongoDB-specific types in a document to plain values.
 * Handles:
 *   - { "$date": "..." } -> JavaScript Date converted to Firestore Timestamp
 *   - { "$oid": "..." } -> string value
 *   - { "$numberLong": "..." } -> number
 *   - { "$numberDouble": "..." } -> number
 *   - { "$numberInt": "..." } -> number
 *   - { "$numberDecimal": "..." } -> number
 *   - Nested objects and arrays
 */
function convertMongoTypes(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item) => convertMongoTypes(item));
  }

  // Check for MongoDB extended JSON types
  const keys = Object.keys(value);

  // { "$date": "2026-01-01T00:00:00Z" } or { "$date": { "$numberLong": "..." } }
  if (keys.length === 1 && keys[0] === "$date") {
    const dateVal = value["$date"];
    if (typeof dateVal === "string") {
      return admin.firestore.Timestamp.fromDate(new Date(dateVal));
    }
    if (typeof dateVal === "object" && dateVal["$numberLong"]) {
      return admin.firestore.Timestamp.fromMillis(parseInt(dateVal["$numberLong"], 10));
    }
    return admin.firestore.Timestamp.fromDate(new Date(dateVal));
  }

  // { "$oid": "507f1f77bcf86cd799439011" }
  if (keys.length === 1 && keys[0] === "$oid") {
    return value["$oid"];
  }

  // { "$numberLong": "12345" }
  if (keys.length === 1 && keys[0] === "$numberLong") {
    return parseInt(value["$numberLong"], 10);
  }

  // { "$numberDouble": "1.5" }
  if (keys.length === 1 && keys[0] === "$numberDouble") {
    return parseFloat(value["$numberDouble"]);
  }

  // { "$numberInt": "42" }
  if (keys.length === 1 && keys[0] === "$numberInt") {
    return parseInt(value["$numberInt"], 10);
  }

  // { "$numberDecimal": "99.99" }
  if (keys.length === 1 && keys[0] === "$numberDecimal") {
    return parseFloat(value["$numberDecimal"]);
  }

  // Regular object - recursively convert all fields
  const result = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = convertMongoTypes(val);
  }
  return result;
}

/**
 * Extract the document ID from a MongoDB document.
 * Uses `id` or `_id` field. If the value is an ObjectId ({ "$oid": "..." }),
 * extracts the string. Falls back to generating a random ID.
 */
function extractDocId(doc) {
  const rawId = doc.id !== undefined ? doc.id : doc._id;

  if (rawId === undefined || rawId === null) {
    return null; // Let Firestore auto-generate
  }

  // Handle { "$oid": "..." }
  if (typeof rawId === "object" && rawId["$oid"]) {
    return rawId["$oid"];
  }

  return String(rawId);
}

/**
 * Upload a single collection's documents to Firestore in batches of BATCH_SIZE.
 */
async function uploadCollection(db, collectionName, documents) {
  let uploaded = 0;
  const total = documents.length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = documents.slice(i, i + BATCH_SIZE);

    for (const doc of chunk) {
      const docId = extractDocId(doc);

      // Create a copy without _id and id fields (Firestore stores ID separately)
      const data = { ...doc };
      delete data._id;
      // Only delete `id` if it was used as the document ID source
      // Keep `id` if there was also an `_id` (id might be a data field)
      if (doc._id === undefined && doc.id !== undefined) {
        delete data.id;
      }

      // Convert MongoDB types
      const convertedData = convertMongoTypes(data);

      const ref = docId
        ? db.collection(collectionName).doc(docId)
        : db.collection(collectionName).doc(); // auto-generate ID

      batch.set(ref, convertedData);
    }

    await batch.commit();
    uploaded += chunk.length;

    const pct = Math.round((uploaded / total) * 100);
    process.stdout.write(
      `\r  [${collectionName}] ${uploaded}/${total} documents uploaded (${pct}%)`
    );
  }

  console.log(); // newline after progress
  return uploaded;
}

/**
 * Check if a filename should be skipped.
 */
function shouldSkip(filename) {
  return SKIP_FILES.some(
    (skip) => filename === skip || filename.endsWith(skip)
  );
}

// ── Main ──
async function main() {
  console.log(`
+======================================================+
|   MongoDB Backup -> Firebase Firestore Migration      |
|   Project: ${PROJECT_ID}                              |
+======================================================+
`);

  // Validate service account key
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(
      `ERROR: Service account key not found at: ${SERVICE_ACCOUNT_PATH}\n` +
      `Please download it from Firebase Console and place it at the path above.`
    );
    process.exit(1);
  }

  // Find latest backup
  const backupDir = findLatestBackupDir();
  log(`Using backup directory: ${backupDir}`);

  // List JSON files
  const allFiles = fs.readdirSync(backupDir).filter((f) => f.endsWith(".json"));
  const jsonFiles = allFiles.filter((f) => !shouldSkip(f));

  if (jsonFiles.length === 0) {
    console.error(`ERROR: No JSON collection files found in ${backupDir}`);
    process.exit(1);
  }

  log(`Found ${jsonFiles.length} collection file(s) to process`);
  log(`Skipping: ${allFiles.filter((f) => shouldSkip(f)).join(", ") || "none"}`);

  // Initialize Firebase Admin SDK
  log("Initializing Firebase Admin SDK...");
  const serviceAccount = JSON.parse(
    fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || PROJECT_ID,
  });

  const db = admin.firestore();
  log("Firebase connection established");

  // Process each collection file
  let totalUploaded = 0;
  let successCount = 0;
  let errorCount = 0;
  const results = [];

  for (const file of jsonFiles) {
    const collectionName = file.replace(".json", "");
    const filePath = path.join(backupDir, file);

    try {
      const rawData = fs.readFileSync(filePath, "utf8");
      const documents = JSON.parse(rawData);

      if (!Array.isArray(documents)) {
        log(`WARNING: ${file} does not contain a JSON array, skipping`);
        continue;
      }

      if (documents.length === 0) {
        log(`SKIP: ${collectionName} - empty collection (0 documents)`);
        results.push({ collection: collectionName, count: 0, status: "empty" });
        continue;
      }

      log(`Uploading ${collectionName} (${documents.length} documents)...`);
      const count = await uploadCollection(db, collectionName, documents);
      totalUploaded += count;
      successCount++;
      results.push({ collection: collectionName, count, status: "success" });
    } catch (err) {
      errorCount++;
      log(`ERROR: ${collectionName} - ${err.message}`);
      results.push({
        collection: collectionName,
        count: 0,
        status: `error: ${err.message}`,
      });
    }
  }

  // Summary
  console.log(`
========================================
  MIGRATION COMPLETE
========================================
  Backup source : ${backupDir}
  Collections   : ${successCount} succeeded, ${errorCount} failed
  Total docs    : ${totalUploaded} uploaded
========================================
`);

  // Detailed results
  console.log("Details:");
  for (const r of results) {
    const icon = r.status === "success" ? "[OK]" : r.status === "empty" ? "[--]" : "[!!]";
    console.log(`  ${icon} ${r.collection}: ${r.count} documents (${r.status})`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
