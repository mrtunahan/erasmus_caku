/**
 * Bir akademisyen için professor_passwords koleksiyonunda bcrypt'lenmiş
 * şifre belirler.
 *
 * ÖNEMLİ: Akademisyen adları nokta içerir (örn. "Arş. Gör. A. Tunahan
 * KORKMAZ"). MongoDB'de `$set: { [dotluKey]: ... }` noktaları nested alan
 * yolu sanar ve düz anahtarı güncellemez. Bu yüzden tüm dökümanı okuyup
 * JS nesnesinde düz anahtarı set edip replaceOne ile geri yazıyoruz —
 * böylece noktalı anahtar literal olarak saklanır. Ayrıca önceki hatalı
 * $set'lerden kalan nested çöp (değeri obje olan üst düzey anahtarlar)
 * temizlenir.
 *
 * Kullanım (sunucuda):
 *   NAME="Arş. Gör. A. Tunahan KORKMAZ" PASSWORD="238023" \
 *   node server/set-professor-password.js
 *
 * Opsiyonel COPY_FROM="Eski Ad" → o anahtardaki hash'i yeni ada taşır.
 */
(async () => {
  const bcrypt = require('bcrypt');
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const col = db.collection('passwords');

  const name = process.env.NAME || '';
  const password = process.env.PASSWORD || '';
  const copyFrom = process.env.COPY_FROM || '';

  if (!name) {
    console.error('NAME gerekli. Örn:');
    console.error(
      '  NAME="Arş. Gör. A. Tunahan KORKMAZ" PASSWORD="238023" node server/set-professor-password.js'
    );
    process.exit(1);
  }

  // Tüm dökümanı oku (yoksa boş başlat)
  const doc = (await col.findOne({ _id: 'professor_passwords' })) || { _id: 'professor_passwords' };

  // Önceki hatalı dotted-$set'lerden kalan nested çöpü temizle:
  // professor_passwords yalnızca string hash değerleri tutmalı. Değeri
  // düz string olmayan (Date/_id hariç) üst düzey anahtarları sil.
  let cleaned = 0;
  for (const k of Object.keys(doc)) {
    if (k === '_id') continue;
    const v = doc[k];
    if (v instanceof Date) continue;
    if (typeof v !== 'string') {
      delete doc[k];
      cleaned++;
    }
  }
  if (cleaned > 0) console.log(`(temizlik) ${cleaned} bozuk nested anahtar kaldırıldı`);

  if (copyFrom) {
    if (!doc[copyFrom] || typeof doc[copyFrom] !== 'string') {
      console.error(`COPY_FROM anahtarı bulunamadı veya geçersiz: "${copyFrom}"`);
      process.exit(1);
    }
    doc[name] = doc[copyFrom];
    delete doc[copyFrom];
    console.log(`✓ Şifre taşındı: "${copyFrom}" → "${name}"`);
  } else {
    if (!password || password.length < 6) {
      console.error('PASSWORD gerekli (en az 6 karakter).');
      process.exit(1);
    }
    doc[name] = await bcrypt.hash(password, 12);
    console.log(`✓ Şifre ayarlandı: "${name}"`);
  }

  doc.updatedAt = new Date();

  // replaceOne: noktalı anahtarları literal olarak yazar ($set dotted-path
  // sorununu tamamen atlar).
  await col.replaceOne({ _id: 'professor_passwords' }, doc, { upsert: true });

  // Doğrula
  const after = await col.findOne({ _id: 'professor_passwords' });
  const hash = after ? after[name] : null;
  if (hash && !copyFrom) {
    const ok = await bcrypt.compare(password, hash);
    console.log(`Doğrulama — "${password}" eşleşiyor mu:`, ok);
  } else {
    console.log('Yazıldı. Anahtar mevcut mu:', !!hash);
  }
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
