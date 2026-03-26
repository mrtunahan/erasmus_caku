const admin = require("firebase-admin");
const path = require("path");

let db = null;

async function connect() {
  if (db) return db;

  try {
    const serviceAccount = require(path.join(__dirname, "../../scripts/serviceAccountKey.json"));

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    db = admin.firestore();
    console.log("Firebase Firestore bağlantısı kuruldu.");
    return db;
  } catch (err) {
    console.error("Firebase başlatılamadı:", err.message);
    throw new Error("Firebase'e bağlanılamadı: " + err.message);
  }
}

function getDb() {
  if (!db) {
    throw new Error(
      "Veritabanı bağlantısı henüz kurulmadı. Önce connect() çağrılmalı."
    );
  }
  return db;
}

async function getDbSafe() {
  if (!db) {
    return await connect();
  }
  return db;
}

async function disconnect() {
  // Firestore bağlantı yönetimini otomatik yapar, no-op
  console.log("Firestore bağlantısı kapatıldı (no-op).");
}

module.exports = { connect, getDb, getDbSafe, disconnect };
