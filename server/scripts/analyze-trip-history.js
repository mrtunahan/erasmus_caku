/**
 * SALT-OKUNUR analiz: trip_history koleksiyonundaki mükerrer birikimini
 * teşhis eder. HİÇBİR ŞEY YAZMAZ / SİLMEZ.
 *
 * Rapor içeriği:
 *  1) Toplam kayıt + öğrenci başına dağılım (en şişkin 10 öğrenci)
 *  2) İmza bazlı mükerrer analizi — imza: studentNumber + hostInstitution +
 *     type + sıralı ders kodları (uygulamadaki matchKey ile birebir aynı)
 *  3) Zaman histogramı (günlere göre kaç kayıt yazılmış — patlama gününü gösterir)
 *  4) Temizlik projeksiyonu: her imzanın EN ESKİ kaydı tutulursa kaç kayıt
 *     silinir (yalnızca sayı — silme işlemi ayrı betikte ve DRY-RUN'lı)
 *
 * Kullanım (sunucuda, proje KÖKÜNDE):
 *   node server/scripts/analyze-trip-history.js
 */
(async () => {
  const { getDbSafe, disconnect } = require('../config/database');
  const db = await getDbSafe();
  const col = db.collection('trip_history');

  const total = await col.countDocuments();
  console.log('═'.repeat(60));
  console.log('TRIP_HISTORY ANALİZİ (salt-okunur)');
  console.log('═'.repeat(60));
  console.log('Toplam kayıt:', total);

  // ── 1) Öğrenci başına dağılım ──
  const byStudent = await col
    .aggregate([
      { $group: { _id: '$studentNumber', n: { $sum: 1 }, name: { $first: '$studentName' } } },
      { $sort: { n: -1 } },
      { $limit: 10 },
    ])
    .toArray();
  console.log('\n── En çok kaydı olan 10 öğrenci ──');
  byStudent.forEach((s) =>
    console.log(`  ${String(s.n).padStart(6)}  ${s._id || '(numarasız)'}  ${s.name || ''}`)
  );

  // ── 2) İmza bazlı mükerrer analizi ──
  // Uygulamadaki matchKey ile aynı imza: type + sıralı home/host ders kodları
  const all = await col
    .find(
      {},
      {
        projection: {
          studentNumber: 1,
          hostInstitution: 1,
          type: 1,
          'homeCourses.code': 1,
          'hostCourses.code': 1,
          createdAt: 1,
        },
      }
    )
    .toArray();

  const sigOf = (d) =>
    JSON.stringify({
      s: d.studentNumber || '',
      i: d.hostInstitution || '',
      t: d.type || '',
      home: (d.homeCourses || []).map((c) => c.code).sort(),
      host: (d.hostCourses || []).map((c) => c.code).sort(),
    });

  const groups = new Map();
  all.forEach((d) => {
    const k = sigOf(d);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(d);
  });

  const uniqueSigs = groups.size;
  let dupExcess = 0;
  const topDups = [];
  for (const [k, docs] of groups.entries()) {
    if (docs.length > 1) {
      dupExcess += docs.length - 1;
      topDups.push({ k, n: docs.length });
    }
  }
  topDups.sort((a, b) => b.n - a.n);

  console.log('\n── Mükerrer imza analizi ──');
  console.log('Benzersiz imza sayısı :', uniqueSigs);
  console.log(
    'Fazla (mükerrer) kayıt:',
    dupExcess,
    `(toplamın %${Math.round((dupExcess / Math.max(1, total)) * 100)}'i)`
  );
  console.log('\nEn çok tekrarlanan 10 imza:');
  topDups.slice(0, 10).forEach((d) => {
    const p = JSON.parse(d.k);
    console.log(
      `  x${String(d.n).padStart(5)}  ${p.s}  ${p.t}  ${p.i.slice(0, 40)}  dersler:[${p.home.join(',')}]`
    );
  });

  // ── 3) Zaman histogramı (gün bazında, son 30 dolu gün) ──
  const byDay = new Map();
  all.forEach((d) => {
    const day = String(d.createdAt || '').slice(0, 10) || '(tarihsiz)';
    byDay.set(day, (byDay.get(day) || 0) + 1);
  });
  const days = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  console.log('\n── Günlere göre yazım (patlama günlerini gösterir) ──');
  days.slice(-30).forEach(([day, n]) => {
    const bar = '█'.repeat(Math.min(50, Math.ceil(n / Math.max(1, total / 500))));
    console.log(`  ${day}  ${String(n).padStart(6)}  ${bar}`);
  });

  // ── 4) Temizlik projeksiyonu ──
  console.log('\n── Temizlik projeksiyonu (HİÇBİR ŞEY SİLİNMEDİ) ──');
  console.log(
    `Her imzanın EN ESKİ kaydı tutulursa: ${uniqueSigs} kayıt kalır, ${dupExcess} kayıt silinir.`
  );
  console.log('Temizlik için: DRY_RUN raporu ile server/scripts/dedupe-trip-history.js');

  await disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('Analiz hatası:', e.message);
  process.exit(1);
});
