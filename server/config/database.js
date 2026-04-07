require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/erasmus_caku";

let client = null;
let db = null;

async function connect() {
  if (db) return db;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();

    // Veritabanı adını URI'den çıkar (son / sonrası, ? öncesi)
    const dbName = MONGODB_URI.split("/").pop().split("?")[0] || "erasmus_caku";
    db = client.db(dbName);

    console.log(`MongoDB bağlantısı kuruldu: ${MONGODB_URI}`);
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
