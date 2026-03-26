const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "caku_erasmus";

// Bağlantı havuzu ve timeout ayarları
const CLIENT_OPTIONS = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
};

let client = null;
let db = null;
let isConnecting = false;

async function connect() {
  if (db && client) {
    // Bağlantının hâlâ aktif olup olmadığını kontrol et
    try {
      await client.db("admin").command({ ping: 1 });
      return db;
    } catch {
      console.warn("MongoDB bağlantısı kopmuş, yeniden bağlanılıyor...");
      client = null;
      db = null;
    }
  }

  if (isConnecting) {
    // Eşzamanlı bağlantı denemelerini önle
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (!isConnecting) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
    if (db) return db;
  }

  isConnecting = true;

  const maxRetries = 5;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      client = new MongoClient(MONGO_URI, CLIENT_OPTIONS);
      await client.connect();
      db = client.db(DB_NAME);

      // Bağlantı olaylarını dinle
      client.on("close", () => {
        console.warn("MongoDB bağlantısı kapandı.");
        db = null;
        client = null;
      });

      client.on("error", (err) => {
        console.error("MongoDB bağlantı hatası:", err.message);
      });

      client.on("reconnect", () => {
        console.log("MongoDB yeniden bağlandı.");
      });

      console.log(
        `MongoDB bağlantısı kuruldu: ${DB_NAME} (deneme ${attempt}/${maxRetries})`
      );
      isConnecting = false;
      return db;
    } catch (err) {
      lastError = err;
      console.error(
        `MongoDB bağlantı denemesi ${attempt}/${maxRetries} başarısız:`,
        err.message
      );

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 16000);
        console.log(`${delay / 1000} saniye sonra tekrar denenecek...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  isConnecting = false;
  throw new Error(
    `MongoDB'ye ${maxRetries} denemede bağlanılamadı: ${lastError.message}`
  );
}

function getDb() {
  if (!db) {
    throw new Error(
      "Veritabanı bağlantısı henüz kurulmadı. Önce connect() çağrılmalı."
    );
  }
  return db;
}

/**
 * Güvenli getDb - bağlantı kopmuşsa otomatik yeniden bağlanır
 */
async function getDbSafe() {
  if (!db || !client) {
    return await connect();
  }
  try {
    await client.db("admin").command({ ping: 1 });
    return db;
  } catch {
    console.warn("Bağlantı kopmuş, yeniden bağlanılıyor...");
    client = null;
    db = null;
    return await connect();
  }
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
