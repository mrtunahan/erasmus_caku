/**
 * Tek seferlik temizleme: student_clubs koleksiyonundaki bozuk logoURL
 * kayıtlarını siler (disk'te dosyası olmayan referansları).
 *
 * Sunucuda çalıştır:
 *   node server/clean-club-logos.js
 *
 * Çıktı:
 *   - Kontrol edilen kayıt sayısı
 *   - Kaç logoURL temizlendi
 *   - Kalan (geçerli) logoURL sayısı
 */
const fs = require('fs');
const path = require('path');

(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const col = db.collection('student_clubs');

  const UPLOAD_DIR = path.join(__dirname, 'uploads');

  const clubs = await col.find({ logoURL: { $exists: true, $ne: '' } }).toArray();
  console.log(`logoURL'i dolu ${clubs.length} kulüp bulundu.`);

  let cleaned = 0;
  let kept = 0;
  for (const club of clubs) {
    // logoURL formatı: /api/files/download/<folder>/<filename>
    const m = (club.logoURL || '').match(/^\/api\/files\/download\/(.+)$/);
    if (!m) {
      // Beklenmedik format — temizle
      await col.updateOne({ _id: club._id }, { $set: { logoURL: '' } });
      cleaned++;
      console.log(`  ✗ ${club.name}: beklenmedik logoURL formatı — temizlendi`);
      continue;
    }
    const relPath = decodeURIComponent(m[1]);
    const absPath = path.join(UPLOAD_DIR, relPath);
    if (fs.existsSync(absPath)) {
      kept++;
    } else {
      await col.updateOne({ _id: club._id }, { $set: { logoURL: '' } });
      cleaned++;
      console.log(`  ✗ ${club.name}: dosya yok (${relPath}) — temizlendi`);
    }
  }

  console.log(`\n✓ Tamamlandı. Temizlenen: ${cleaned}, geçerli: ${kept}`);
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
