/**
 * SALT-OKUNUR inceleme: departments koleksiyonundaki tüm kayıtları ve her
 * birine kaç professor/student'ın bağlı olduğunu listeler. Hiçbir şey
 * silmez/değiştirmez. Duplicate/stray bölümleri güvenle birleştirmeden
 * önce gerçeği görmek için.
 *
 * Kullanım (sunucuda):
 *   node server/inspect-departments.js
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();

  const depts = await db.collection('departments').find({}).toArray();
  const profs = await db.collection('professors').find({}).toArray();
  const studs = await db.collection('students').find({}).toArray();

  const profByDeptId = {};
  const profByDeptName = {};
  profs.forEach((p) => {
    if (p.departmentId) profByDeptId[p.departmentId] = (profByDeptId[p.departmentId] || 0) + 1;
    if (p.department) profByDeptName[p.department] = (profByDeptName[p.department] || 0) + 1;
  });
  const studByDeptId = {};
  const studByDeptName = {};
  studs.forEach((s) => {
    if (s.departmentId) studByDeptId[s.departmentId] = (studByDeptId[s.departmentId] || 0) + 1;
    if (s.departmentName)
      studByDeptName[s.departmentName] = (studByDeptName[s.departmentName] || 0) + 1;
    else if (s.department) studByDeptName[s.department] = (studByDeptName[s.department] || 0) + 1;
  });

  console.log(`\n=== departments (${depts.length} kayıt) ===\n`);
  for (const d of depts) {
    const idStr = String(d._id);
    const docId = d._docId || '(yok)';
    // Bu bölüme kaç kişi bağlı? (hem _id, hem _docId, hem ad ile)
    const profCount =
      (profByDeptId[idStr] || 0) +
      (d._docId ? profByDeptId[d._docId] || 0 : 0) +
      (profByDeptName[d.name] || 0);
    const studCount =
      (studByDeptId[idStr] || 0) +
      (d._docId ? studByDeptId[d._docId] || 0 : 0) +
      (studByDeptName[d.name] || 0);
    console.log(`• "${d.name}"`);
    console.log(`    _id=${idStr}  _docId=${docId}  facultyId=${d.facultyId || '(yok)'}`);
    console.log(`    bağlı akademisyen≈${profCount}  öğrenci≈${studCount}`);
  }

  console.log('\n=== professor.departmentId dağılımı ===');
  console.log(profByDeptId);
  console.log('\n=== student.departmentId dağılımı ===');
  console.log(studByDeptId);

  console.log('\nBu çıktıyı paylaş — hangi kaydın kalıp hangisinin birleşeceğine karar verelim.');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
