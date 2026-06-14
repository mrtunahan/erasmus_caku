/**
 * Tek seferlik migration: students koleksiyonundaki outgoingMatches ve
 * returnMatches dizilerindeki status alanı eksik OLAN eşleştirmeleri
 * 'pending' (onay bekliyor — sarı) yapar.
 *
 * Önceki eşleştirmeler status alanı olmadan kaydedilmişti; UI'daki "yoksa
 * onaylı say" varsayımı nedeniyle yeşil görünüyor ve akademisyen onay
 * butonu çıkmıyordu. Bu script onları onay-bekleyen duruma alarak
 * akademisyenin tek tek onaylamasını sağlar.
 *
 * Kullanım (sunucuda):
 *   DRY_RUN=1 node server/migrate-erasmus-pending.js   # rapor (yazmaz)
 *   node server/migrate-erasmus-pending.js             # gerçek işlem
 *
 * Opsiyonel:
 *   APPROVED=1 ile statussüz eşleştirmeler 'pending' yerine 'approved'
 *   damgalanır (geriye dönük "hepsini onaylı say" istenirse).
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';
  const decision = process.env.APPROVED === '1' ? 'approved' : 'pending';

  const students = await db.collection('students').find({}).toArray();
  console.log(`students: ${students.length}, hedef status: ${decision}`);

  let touchedStudents = 0;
  let touchedOutgoing = 0;
  let touchedReturn = 0;

  for (const s of students) {
    let changed = false;
    const stampArr = (arr, counter) => {
      const out = (arr || []).map((m) => {
        if (m && !m.status) {
          counter.n++;
          changed = true;
          return { ...m, status: decision };
        }
        return m;
      });
      return out;
    };
    const outCounter = { n: 0 };
    const retCounter = { n: 0 };
    const newOutgoing = stampArr(s.outgoingMatches, outCounter);
    const newReturn = stampArr(s.returnMatches, retCounter);
    if (!changed) continue;

    touchedStudents++;
    touchedOutgoing += outCounter.n;
    touchedReturn += retCounter.n;

    if (!dry) {
      await db.collection('students').updateOne(
        { _id: s._id },
        {
          $set: {
            outgoingMatches: newOutgoing,
            returnMatches: newReturn,
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  console.log(
    `Etkilenen öğrenci: ${touchedStudents}, gidiş: ${touchedOutgoing}, dönüş: ${touchedReturn}`
  );
  if (dry) console.log('\n[DRY RUN] hiçbir şey yazılmadı.');
  else console.log('\n✓ Tamamlandı.');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
