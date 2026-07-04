/**
 * trip_history mükerrer temizliği — VARSAYILAN DRY-RUN (hiçbir şey silmez).
 *
 * Kural: Aynı imzaya (studentNumber + hostInstitution + type + sıralı ders
 * kodları) sahip kayıtlardan yalnızca EN ESKİSİ tutulur, gerisi silinir.
 * İmza, uygulamanın kendi mükerrer anahtarıyla (matchKey) birebir aynıdır —
 * yani uygulamanın "zaten var" sayması gereken kayıtlar temizlenir; benzersiz
 * eşleştirme verisi KAYBOLMAZ.
 *
 * Kullanım (sunucuda, proje KÖKÜNDE):
 *   node server/scripts/dedupe-trip-history.js            # DRY-RUN: rapor, silme yok
 *   APPLY=1 node server/scripts/dedupe-trip-history.js    # gerçek silme
 *
 * GÜVENLİK:
 *  - APPLY=1'den önce mutlaka yedek alın: ./server/scripts/backup.sh
 *  - Silme _id listesiyle yapılır ve silinen id'ler log dosyasına yazılır:
 *    backups/trip_history_deleted_<tarih>.json (geri izlenebilirlik)
 */
const fs = require('fs');
const path = require('path');

(async () => {
  const APPLY = process.env.APPLY === '1';
  const { getDbSafe, disconnect } = require('../config/database');
  const db = await getDbSafe();
  const col = db.collection('trip_history');

  const total = await col.countDocuments();
  console.log(
    `Mod: ${APPLY ? '⚠ APPLY (SİLME AKTİF)' : 'DRY-RUN (silme yok)'} — toplam ${total} kayıt`
  );

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

  const toDelete = [];
  let keep = 0;
  for (const docs of groups.values()) {
    if (docs.length === 1) {
      keep++;
      continue;
    }
    // EN YENİYİ tut: (1) dönüş kayıtlarındaki not alanları her senkronla
    // güncel öğrenci durumundan yazılır — en güncel notlar en yeni kayıtta;
    // (2) createdAt iki farklı formatta (ISO + Date.toString) olduğundan
    // string sıralaması yanıltıcı — ObjectId zaman damgası formattan
    // bağımsız kronolojiktir, ona göre sıralanır.
    docs.sort((a, b) => String(a._id).localeCompare(String(b._id)));
    keep++;
    docs.slice(0, -1).forEach((d) => toDelete.push(d._id)); // sonuncusu (en yeni) kalır
  }

  console.log(`Benzersiz imza (tutulacak): ${keep}`);
  console.log(`Silinecek mükerrer kayıt : ${toDelete.length}`);

  if (!APPLY) {
    console.log('\nDRY-RUN bitti — hiçbir şey silinmedi.');
    console.log(
      'Gerçek temizlik için ÖNCE yedek alın, sonra: APPLY=1 node server/scripts/dedupe-trip-history.js'
    );
    await disconnect();
    process.exit(0);
  }

  // Silinen id'leri kalıcı log'a yaz (geri izlenebilirlik)
  const logDir = path.join(__dirname, '../../backups');
  fs.mkdirSync(logDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const logFile = path.join(logDir, `trip_history_deleted_${stamp}.json`);
  fs.writeFileSync(logFile, JSON.stringify(toDelete.map(String), null, 2));
  console.log('Silinecek id listesi kaydedildi:', logFile);

  // 500'lük partiler halinde sil
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 500) {
    const chunk = toDelete.slice(i, i + 500);
    const r = await col.deleteMany({ _id: { $in: chunk } });
    deleted += r.deletedCount;
    console.log(`  ${deleted}/${toDelete.length} silindi...`);
  }
  console.log(`\n✓ Tamamlandı. ${deleted} mükerrer silindi, ${keep} benzersiz kayıt korundu.`);
  console.log('Doğrulama: node server/scripts/analyze-trip-history.js');

  await disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e.message);
  process.exit(1);
});
