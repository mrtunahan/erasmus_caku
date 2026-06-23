/**
 * Tek seferlik temizlik: professors koleksiyonundaki duplicate kayıtları
 * birleştirir. Aynı ad ile birden fazla kayıt varsa, en uygun olanı
 * (bayraklı + departmentId dolu + en eski) canonical kabul edip diğerlerini
 * siler. Canonical'a eksik alanlar duplicate'lerden kopyalanır; bayraklar
 * OR'lanır.
 *
 * Idempotent: aynı isimden tek kayıt varsa dokunmaz.
 *
 * Kullanım:
 *   DRY_RUN=1 node server/dedupe-professors.js
 *   node server/dedupe-professors.js
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';

  const profsCol = db.collection('professors');
  const profs = await profsCol.find({}).toArray();
  console.log(`Toplam professors kaydı: ${profs.length}`);

  const norm = (s) =>
    (s || '')
      .toString()
      .toLocaleLowerCase('tr-TR')
      .replace(/[.,]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const groups = new Map();
  profs.forEach((p) => {
    const k = norm(p.name);
    if (!k) return;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  });

  const duplicateGroups = [];
  for (const [k, arr] of groups) {
    if (arr.length > 1) duplicateGroups.push({ key: k, items: arr });
  }
  console.log(`Duplicate gruplar: ${duplicateGroups.length}`);

  let removed = 0;
  let mergedFields = 0;

  for (const g of duplicateGroups) {
    const sorted = g.items.slice().sort((a, b) => {
      const flagScore = (x) =>
        (x.isUniversityAdmin ? 4 : 0) + (x.isFacultyManager ? 2 : 0) + (x.isDeptManager ? 1 : 0);
      const fs = flagScore(b) - flagScore(a);
      if (fs !== 0) return fs;
      if (!!a.departmentId !== !!b.departmentId) return a.departmentId ? -1 : 1;
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ad - bd;
    });
    const canonical = sorted[0];
    const dupes = sorted.slice(1);

    console.log(`\n• "${canonical.name}" — ${g.items.length} kayıt`);
    console.log(`  ↳ canonical: _id=${canonical._id} (deptId=${canonical.departmentId || '-'})`);

    const patch = {};
    const fieldsToFill = [
      'departmentId',
      'department',
      'facultyId',
      'universityId',
      'title',
      'roles',
      'email',
    ];
    for (const f of fieldsToFill) {
      if (!canonical[f]) {
        for (const d of dupes) {
          if (d[f]) {
            patch[f] = d[f];
            break;
          }
        }
      }
    }
    ['isDeptManager', 'isFacultyManager', 'isUniversityAdmin', 'isStajCoordinator'].forEach(
      (flag) => {
        if (!canonical[flag] && dupes.some((d) => d[flag])) {
          patch[flag] = true;
        }
      }
    );
    if (Object.keys(patch).length > 0) {
      console.log(`  ↳ canonical'a aktarılan alanlar:`, patch);
      if (!dry) {
        await profsCol.updateOne(
          { _id: canonical._id },
          { $set: { ...patch, updatedAt: new Date() } }
        );
        mergedFields += Object.keys(patch).length;
      }
    }

    for (const d of dupes) {
      console.log(`  ✗ silinecek: _id=${d._id} (deptId=${d.departmentId || '-'})`);
      if (!dry) {
        await profsCol.deleteOne({ _id: d._id });
        removed++;
      }
    }
  }

  console.log(
    `\n${dry ? '[DRY RUN] yazılmadı.' : '✓ Tamamlandı.'} Silinen duplicate: ${removed}, canonical'a aktarılan alan: ${mergedFields}`
  );
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
