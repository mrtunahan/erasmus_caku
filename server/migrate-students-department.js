/**
 * Tek seferlik migration: Mevcut tüm öğrencilere departmentId="bilgisayar" ata
 * Kullanım: node server/migrate-students-department.js [SERVER_URL]
 * Varsayılan: http://localhost:3001
 */
const http = require("http");
const https = require("https");

const BASE = process.argv[2] || "http://localhost:3001";
const isHttps = BASE.startsWith("https");
const request = isHttps ? https : http;

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = request.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function migrate() {
  console.log(`Migration başlıyor (server: ${BASE})...`);
  console.log("Öğrenciler okunuyor...");

  const students = await fetch(`${BASE}/api/db/students`);
  if (!Array.isArray(students)) {
    console.error("Öğrenci listesi alınamadı:", students);
    process.exit(1);
  }

  console.log(`Toplam ${students.length} öğrenci bulundu.`);

  const toUpdate = students.filter(s => !s.departmentId);
  console.log(`${toUpdate.length} öğrencinin departmentId'si yok, güncelleniyor...`);

  if (toUpdate.length === 0) {
    console.log("Tüm öğrenciler zaten departmentId'ye sahip. Migration gerekli değil.");
    process.exit(0);
  }

  // Batch olarak güncelle (20'şer)
  const batchSize = 15;
  for (let i = 0; i < toUpdate.length; i += batchSize) {
    const batch = toUpdate.slice(i, i + batchSize);
    const operations = batch.map(s => ({
      type: "update",
      collection: "students",
      docId: s.id,
      data: {
        departmentId: "bilgisayar",
        departmentName: "Bilgisayar Mühendisliği",
      },
    }));

    const url = new URL(`${BASE}/api/db/write`);
    const body = JSON.stringify({ operations });
    const result = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (result.success) {
      batch.forEach(s => console.log(`  OK: ${s.studentNumber || s.id} -> bilgisayar`));
    } else {
      console.error(`  HATA: batch ${i}-${i + batch.length}:`, result);
    }
  }

  console.log(`\nMigration tamamlandı: ${toUpdate.length} öğrenci güncellendi.`);
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration hatası:", err);
  process.exit(1);
});
