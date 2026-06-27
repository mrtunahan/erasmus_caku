// ══════════════════════════════════════════════════════════════
// TANI (read-only): "tunahan" / "korkmaz" izini TÜM koleksiyonlarda ara
//   Kişinin hangi koleksiyonlarda (professors, faculties, departments,
//   universities, passwords vb.) geçtiğini bulur ki doğru fakülte/bölüm
//   ile professors'a ekleyebilelim. Hiçbir veri DEĞİŞTİRİLMEZ.
//
//   Çalıştırma:  node server/find-tunahan.js
// ══════════════════════════════════════════════════════════════
const { disconnect, getDbSafe } = require('./config/database');

const NEEDLE = /tunahan|korkmaz/i;

function deepFindMatch(obj, depth = 0) {
  if (depth > 6 || obj == null) return false;
  if (typeof obj === 'string') return NEEDLE.test(obj);
  if (typeof obj !== 'object') return false;
  for (const v of Object.values(obj)) {
    if (deepFindMatch(v, depth + 1)) return true;
  }
  return false;
}

(async () => {
  const db = await getDbSafe();
  const collections = await db.listCollections().toArray();
  console.log(`\n${collections.length} koleksiyon taranıyor (arama: tunahan|korkmaz)\n`);

  for (const c of collections) {
    const name = c.name;
    let docs;
    try {
      docs = await db.collection(name).find({}).toArray();
    } catch (e) {
      console.log(`  [${name}] okunamadı: ${e.message}`);
      continue;
    }
    const hits = docs.filter((d) => deepFindMatch(d));
    if (hits.length === 0) continue;
    console.log(`\n■ ${name}  (${hits.length} eşleşme)`);
    hits.forEach((d) => {
      // En anlamlı alanları öne çıkar; tamamını da JSON olarak ver
      const summary = {
        _id: d._id,
        name: d.name,
        managerName: d.managerName,
        managerNames: d.managerNames,
        firstName: d.firstName,
        lastName: d.lastName,
        departmentId: d.departmentId,
        facultyId: d.facultyId,
        universityId: d.universityId,
        isFacultyManager: d.isFacultyManager,
        isDeptManager: d.isDeptManager,
        isUniversityAdmin: d.isUniversityAdmin,
      };
      // undefined alanları at
      Object.keys(summary).forEach((k) => summary[k] === undefined && delete summary[k]);
      console.log('   • ' + JSON.stringify(summary));
    });
  }

  console.log('\nArama tamamlandı. (Hiçbir veri değiştirilmedi.)\n');
  await disconnect();
})().catch(async (e) => {
  console.error('HATA:', e.message);
  try {
    await disconnect();
  } catch (_) {
    /* yok say */
  }
  process.exit(1);
});
