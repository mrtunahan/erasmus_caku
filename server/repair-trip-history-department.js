/**
 * Tek seferlik tamir: trip_history koleksiyonundaki departmentId'si boş
 * (ya da '-'/'(boş)') olan kayıtları, ilgili studentNumber üzerinden
 * students koleksiyonundan eşleştirerek doğru departmentId/facultyId ile
 * günceller. Böylece eski (departmentId damgası olmayan) eşleştirmeler
 * Eşleştirme Geçmişi'nde bölüm filtresine düşer ve görünür olur.
 *
 * Idempotent: zaten dolu olan kayıtlara dokunmaz.
 *
 * Kullanım:
 *   DRY_RUN=1 node server/repair-trip-history-department.js
 *   node server/repair-trip-history-department.js
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';

  const tripCol = db.collection('trip_history');
  const stuCol = db.collection('students');

  const students = await stuCol.find({}).toArray();
  const byNumber = new Map();
  students.forEach((s) => {
    if (s.studentNumber) byNumber.set(String(s.studentNumber), s);
  });
  console.log(`students indeksi: ${byNumber.size}`);

  // Boş ya da yer tutucu departmentId
  const emptyDeptQuery = {
    $or: [
      { departmentId: { $exists: false } },
      { departmentId: '' },
      { departmentId: null },
      { departmentId: '-' },
    ],
  };
  const total = await tripCol.countDocuments(emptyDeptQuery);
  console.log(`Tamir adayı (boş departmentId): ${total}`);

  const cursor = tripCol.find(emptyDeptQuery);
  let matched = 0;
  let updated = 0;
  let skipped = 0;
  const distrib = {};

  while (await cursor.hasNext()) {
    const entry = await cursor.next();
    const sn = entry.studentNumber ? String(entry.studentNumber) : '';
    const stu = sn ? byNumber.get(sn) : null;
    if (!stu || !stu.departmentId) {
      skipped++;
      continue;
    }
    matched++;
    distrib[stu.departmentId] = (distrib[stu.departmentId] || 0) + 1;
    if (!dry) {
      await tripCol.updateOne(
        { _id: entry._id },
        {
          $set: {
            departmentId: stu.departmentId,
            facultyId: stu.facultyId || entry.facultyId || '',
            universityId: stu.universityId || entry.universityId || '',
            updatedAt: new Date(),
            repaired: true,
          },
        }
      );
      updated++;
    }
  }

  console.log(`\nEşleşen: ${matched}, atlanan (öğrenci bulunamadı): ${skipped}`);
  console.log('Bölüm dağılımı:', distrib);
  console.log(
    `\n${dry ? '[DRY RUN] hiçbir kayıt yazılmadı.' : `✓ Tamamlandı. ${updated} kayıt güncellendi.`}`
  );
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
