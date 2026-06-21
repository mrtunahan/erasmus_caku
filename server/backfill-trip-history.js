/**
 * Tek seferlik backfill: mevcut + geçmiş TÜM öğrenci erasmus eşleştirmelerini
 * (gidiş + dönüş) trip_history koleksiyonuna işler. Bundan sonrası
 * uygulamada otomatik (syncStudentToTripHistory) zaten ekliyor.
 *
 * Idempotent: aynı (studentNumber + hostInstitution + type + dersler)
 * anahtarına sahip kayıt zaten varsa atlar. Tekrar çalıştırmak güvenli.
 *
 * Kullanım (sunucuda):
 *   DRY_RUN=1 node server/backfill-trip-history.js   # rapor
 *   node server/backfill-trip-history.js             # gerçek işlem
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';

  const students = await db.collection('students').find({}).toArray();
  const existing = await db.collection('trip_history').find({}).toArray();
  console.log(`students: ${students.length}, mevcut trip_history: ${existing.length}`);

  const codes = (arr) =>
    (arr || [])
      .map((c) => (c && c.code ? String(c.code) : ''))
      .filter(Boolean)
      .sort();
  const matchKey = (studentNumber, host, type, home, hostC) =>
    JSON.stringify({
      s: String(studentNumber || ''),
      h: String(host || ''),
      t: type,
      home: codes(home),
      host: codes(hostC),
    });

  const seen = new Set(
    existing.map((e) =>
      matchKey(e.studentNumber, e.hostInstitution, e.type, e.homeCourses, e.hostCourses)
    )
  );

  const ops = [];
  let outCount = 0;
  let retCount = 0;

  for (const s of students) {
    if (!s.hostInstitution) continue;

    const pushMatch = (m, type) => {
      const home = m.homeCourses || [];
      const host = m.hostCourses || [];
      if (home.length === 0 && host.length === 0) return;
      const key = matchKey(s.studentNumber, s.hostInstitution, type, home, host);
      if (seen.has(key)) return;
      seen.add(key);
      const base = {
        hostInstitution: s.hostInstitution,
        hostCountry: s.hostCountry || '',
        type,
        homeCourses: home,
        hostCourses: host,
        studentName: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        studentNumber: s.studentNumber,
        semester: s.semester || '',
        departmentId: s.departmentId || '',
        facultyId: s.facultyId || '',
        universityId: s.universityId || 'caku',
        createdAt: new Date().toISOString(),
        backfilled: true,
      };
      if (type === 'return') {
        base.hostGrade = m.hostGrade || '';
        base.homeGrade = m.homeGrade || '';
        base.hostGrades = m.hostGrades || {};
        base.homeGrades = m.homeGrades || {};
      }
      ops.push(base);
      if (type === 'outgoing') outCount++;
      else retCount++;
    };

    (s.outgoingMatches || []).forEach((m) => pushMatch(m, 'outgoing'));
    (s.returnMatches || []).forEach((m) => pushMatch(m, 'return'));
  }

  console.log(`Eklenecek: ${ops.length} (gidiş ${outCount}, dönüş ${retCount})`);

  if (dry) {
    console.log('\n[DRY RUN] hiçbir şey yazılmadı.');
    process.exit(0);
  }

  if (ops.length > 0) {
    // _docId üret (db.js generateId mantığına benzer) ve toplu ekle
    const docs = ops.map((o) => ({ ...o, _docId: genId(), updatedAt: new Date() }));
    await db.collection('trip_history').insertMany(docs);
  }

  console.log(`\n✓ Tamamlandı. ${ops.length} kayıt trip_history'ye eklendi.`);
  process.exit(0);

  function genId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 20; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
    return id;
  }
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
