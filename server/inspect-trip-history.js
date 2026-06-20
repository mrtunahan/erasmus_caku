/**
 * SALT-OKUNUR teşhis: Onaylanmış (status==='approved') Erasmus
 * eşleştirmeleri ile trip_history koleksiyonu arasındaki uyumu kontrol eder.
 * Hiçbir şey yazmaz/silmez.
 *
 * Ne gösterir:
 *  1) Her öğrenci için gidiş/dönüş eşleştirmelerinin status dağılımı.
 *  2) trip_history kayıtlarının departmentId/hostInstitution dağılımı.
 *  3) ONAYLI olduğu halde trip_history'de KARŞILIĞI OLMAYAN eşleştirmeler
 *     (asıl sorun adayı) — hangi öğrenci, hangi kurum, hangi dersler.
 *  4) departmentId uyuşmazlığı: öğrencinin departmentId'si ile geçmiş
 *     kaydının departmentId'si farklıysa (filtre yüzünden görünmez) uyarır.
 *
 * Kullanım (sunucuda, proje KÖKÜNDE):
 *   node server/inspect-trip-history.js
 *   node server/inspect-trip-history.js "POLITEHNICA Bucuresti"   # tek kurum
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const filterInst = process.argv[2] || null;

  const students = await db.collection('students').find({}).toArray();
  const history = await db.collection('trip_history').find({}).toArray();

  const norm = (arr) =>
    (arr || [])
      .map((c) => (c.code || '').toString().trim())
      .filter(Boolean)
      .sort();
  const matchKey = (type, home, host) =>
    JSON.stringify({ type, home: norm(home), host: norm(host) });

  // trip_history anahtar kümesi (kurum + tip + dersler)
  const histByInst = {};
  history.forEach((e) => {
    const inst = e.hostInstitution || '';
    if (!histByInst[inst]) histByInst[inst] = new Map();
    histByInst[inst].set(matchKey(e.type, e.homeCourses, e.hostCourses), e);
  });

  console.log(`Toplam öğrenci: ${students.length}, trip_history kaydı: ${history.length}`);
  console.log(
    `trip_history departmentId dağılımı:`,
    history.reduce((acc, e) => {
      const k = e.departmentId || '(boş)';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  );
  console.log('\n══════ ONAYLI ama GEÇMİŞTE OLMAYAN eşleştirmeler ══════');

  let missingCount = 0;
  let statusSummary = { approved: 0, pending: 0, rejected: 0, none: 0 };

  students.forEach((s) => {
    const inst = s.hostInstitution || '';
    if (filterInst && inst !== filterInst) return;
    const all = [
      ...(s.outgoingMatches || []).map((m) => ({ m, type: 'outgoing' })),
      ...(s.returnMatches || []).map((m) => ({ m, type: 'return' })),
    ];
    all.forEach(({ m, type }) => {
      const st = m.status || 'none';
      statusSummary[st] = (statusSummary[st] || 0) + 1;
      const home = m.homeCourses || [];
      const host = m.hostCourses || [];
      if (home.length === 0 && host.length === 0) return;
      const approved = (m.status || 'approved') === 'approved';
      if (!approved) return;
      const key = matchKey(type, home, host);
      const inHist = histByInst[inst] && histByInst[inst].has(key);
      if (!inHist) {
        missingCount++;
        console.log(
          `  ✗ ${s.firstName} ${s.lastName} (${s.studentNumber}) | ${inst} | ${type} | deptId=${s.departmentId || '(boş)'}`
        );
        console.log(
          `      ev: ${home.map((c) => c.code).join(', ') || '-'} → karşı: ${host.map((c) => c.code).join(', ') || '-'}`
        );
      } else {
        // departmentId uyuşmazlığı kontrolü (filtre yüzünden görünmez olabilir)
        const he = histByInst[inst].get(key);
        const sDept = s.departmentId || '';
        const hDept = he.departmentId || '';
        if (sDept && hDept && sDept !== hDept) {
          console.log(
            `  ⚠ deptId uyuşmazlığı: ${s.firstName} ${s.lastName} öğrenci.deptId=${sDept} ≠ geçmiş.deptId=${hDept} (${inst}, ${type})`
          );
        }
      }
    });
  });

  console.log(`\nEşleştirme status dağılımı (tüm öğrenciler):`, statusSummary);
  console.log(`Onaylı olup geçmişte bulunmayan eşleştirme sayısı: ${missingCount}`);
  console.log('\n[SALT-OKUNUR] hiçbir şey değiştirilmedi.');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
