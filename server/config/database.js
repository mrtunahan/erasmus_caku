const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "caku_erasmus";

let client = null;
let db = null;

async function connect() {
  if (db) return db;

  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);

  console.log(`MongoDB bağlantısı kuruldu: ${DB_NAME}`);
  return db;
}

function getDb() {
  if (!db) {
    throw new Error("Veritabanı bağlantısı henüz kurulmadı. Önce connect() çağrılmalı.");
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

module.exports = { connect, getDb, disconnect };
