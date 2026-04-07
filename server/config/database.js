const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const MONGO_DB = process.env.MONGO_DB || "erasmus_caku";

let client = null;
let db = null;

async function connect() {
  if (db) return db;

  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(MONGO_DB);
    console.log(`MongoDB bağlantısı kuruldu (db: ${MONGO_DB}).`);
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
