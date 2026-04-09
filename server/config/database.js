require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/erasmus_caku";

let client = null;
let db = null;

// Veritabanı indekslerini oluştur (varsa atlar, veri kaybı yapmaz)
async function setupIndexes(database) {
  try {
    // Öğrenci girişi ve sorguları
    await database.collection("students").createIndex({ studentNumber: 1 }, { unique: true, background: true });
    await database.collection("students").createIndex({ departmentId: 1 }, { background: true });

    // Bölüm yetkilisi girişi
    await database.collection("departments").createIndex({ managerName: 1 }, { background: true });

    // Staj modülü
    await database.collection("internship_applications").createIndex({ ogrenciNo: 1, status: 1 }, { background: true });
    await database.collection("internship_applications").createIndex({ departmentId: 1 }, { background: true });
    await database.collection("internship_notifications").createIndex({ targetStudentNo: 1 }, { background: true });
    await database.collection("internship_notifications").createIndex({ departmentId: 1 }, { background: true });

    // Portal
    await database.collection("portal_posts").createIndex({ departmentId: 1, createdAt: -1 }, { background: true });
    await database.collection("portal_posts").createIndex({ authorId: 1 }, { background: true });

    // Akademisyen cache
    await database.collection("akademisyen_cache").createIndex({ departmentId: 1 }, { background: true });

    // Sınav modülü
    await database.collection("sinav_dersler").createIndex({ departmentId: 1 }, { background: true });
    await database.collection("sinav_programi").createIndex({ departmentId: 1 }, { background: true });

    console.log("Veritabanı indeksleri hazır.");
  } catch (err) {
    // Index zaten varsa hata vermez, başka bir hata varsa logla
    if (!err.message.includes("already exists")) {
      console.warn("İndeks oluşturma uyarısı:", err.message);
    }
  }
}

async function connect() {
  if (db) return db;

  try {
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 30000,
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();

    // Veritabanı adını URI'den çıkar (son / sonrası, ? öncesi)
    const dbName = MONGODB_URI.split("/").pop().split("?")[0] || "erasmus_caku";
    db = client.db(dbName);

    console.log(`MongoDB bağlantısı kuruldu (db: ${dbName})`);

    // İndeksleri arka planda oluştur
    setupIndexes(db);

    return db;
  } catch (err) {
    console.error("MongoDB başlatılamadı:", err.message);
    throw new Error("MongoDB'ye bağlanılamadı: " + err.message);
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
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("MongoDB bağlantısı kapatıldı.");
  }
}

module.exports = { connect, getDb, getDbSafe, disconnect };
