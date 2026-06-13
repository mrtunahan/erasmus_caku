/**
 * Tek seferlik migration: student_clubs koleksiyonundaki kulüpleri
 * departments ile eşleştir — bölüm yetkilisinin kendi kulüplerini
 * düzenleyebilmesi için departmentId + facultyId alanlarını doldurur.
 *
 * Mantık:
 *  - Kulübün `department` alanı (ad) departments koleksiyonundaki bir
 *    bölümle (normalize edilmiş ad eşleşmesiyle) eşleşiyorsa:
 *      → departmentId + facultyId atanır
 *  - Eşleşme yoksa eski kayıt korunur (admin yönetir).
 *
 * Idempotent: tekrar çalıştırmak güvenli; mevcut departmentId varsa atlanır.
 *
 * Kullanım (sunucuda):
 *   DRY_RUN=1 node server/migrate-club-departments.js   # önce rapor
 *   node server/migrate-club-departments.js             # gerçek atama
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';

  const depts = await db.collection('departments').find({}).toArray();
  const clubs = await db.collection('student_clubs').find({}).toArray();
  console.log(`departments: ${depts.length}, student_clubs: ${clubs.length}`);

  const norm = (s) =>
    (s || '')
      .toString()
      .toLocaleLowerCase('tr')
      .replace(/-/g, ' ')
      .replace(/\bve\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  // Bölüm adı (normalize) → { id, facultyId }
  const byName = new Map();
  for (const d of depts) {
    const k = norm(d.name);
    if (!k) continue;
    byName.set(k, {
      id: d._docId || String(d._id),
      facultyId: d.facultyId || '',
      name: d.name,
    });
  }

  let matched = 0;
  let skipped = 0;
  let unmatched = 0;
  const unmatchedNames = new Set();

  for (const c of clubs) {
    if (c.departmentId) {
      skipped++;
      continue;
    }
    const k = norm(c.department);
    const hit = byName.get(k);
    if (!hit) {
      unmatched++;
      if (c.department) unmatchedNames.add(c.department);
      continue;
    }
    matched++;
    if (!dry) {
      await db.collection('student_clubs').updateOne(
        { _id: c._id },
        {
          $set: {
            departmentId: hit.id,
            department: hit.name, // kanonik ad
            facultyId: hit.facultyId,
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  console.log(`\nEşleşen (atandı): ${matched}`);
  console.log(`Atlandı (zaten departmentId var): ${skipped}`);
  console.log(`Eşleşmeyen (admin yönetir): ${unmatched}`);
  if (unmatched > 0 && unmatched <= 50) {
    console.log('\nEşleşmeyen bölüm adları:');
    [...unmatchedNames].sort().forEach((n) => console.log('  • ' + n));
  }
  if (dry) console.log('\n[DRY RUN] hiçbir şey değiştirilmedi.');
  else console.log('\n✓ Tamamlandı.');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
