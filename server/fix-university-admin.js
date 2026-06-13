/**
 * Tek seferlik düzeltme scripti — üniversite admin flag'lerini hedef
 * akademisyene taşır ve yanlış (basit ad ile oluşturulmuş) duplicate
 * professors kaydını siler.
 *
 * Kullanım (sunucuda):
 *   TARGET_PROF="Arş. Gör. A. Tunahan KORKMAZ" \
 *   WRONG_PROF="A.Tunahan KORKMAZ" \
 *   node server/fix-university-admin.js
 *
 * Davranış:
 *  1) TARGET_PROF kaydına isUniversityAdmin + isFacultyManager
 *     + facultyId=muhendislik + universityId=caku set eder
 *  2) WRONG_PROF kaydını siler (yalnızca varsa)
 *  3) İki kayıt da yoksa kullanıcıyı uyarır
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const col = db.collection('professors');

  const target = process.env.TARGET_PROF || '';
  const wrong = process.env.WRONG_PROF || '';
  const facultyId = process.env.FACULTY_ID || 'muhendislik';
  const universityId = process.env.UNIVERSITY_ID || 'caku';

  if (!target) {
    console.error('TARGET_PROF gerekli. Örn:');
    console.error(
      '  TARGET_PROF="Arş. Gör. A. Tunahan KORKMAZ" node server/fix-university-admin.js'
    );
    process.exit(1);
  }

  const targetDoc = await col.findOne({ name: target });
  if (!targetDoc) {
    console.error(`Hedef akademisyen bulunamadı: "${target}"`);
    console.error("İsmi tam olarak DB'deki name alanı ile yazmalısın (Türkçe karakter dahil).");
    process.exit(1);
  }

  await col.updateOne(
    { _id: targetDoc._id },
    {
      $set: {
        isUniversityAdmin: true,
        isFacultyManager: true,
        facultyId,
        universityId,
        updatedAt: new Date(),
      },
    }
  );
  console.log(`✓ ${target} → isUniversityAdmin + isFacultyManager (facultyId=${facultyId})`);

  if (wrong && wrong !== target) {
    const res = await col.deleteOne({ name: wrong });
    if (res.deletedCount > 0) console.log(`✓ Yanlış kayıt silindi: "${wrong}"`);
    else console.log(`(bilgi) Yanlış kayıt zaten yok: "${wrong}"`);
  }

  console.log('\nTamam. Şimdi akademisyen girişinden TARGET_PROF adıyla giriş yap.');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
