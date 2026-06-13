/**
 * Bir akademisyen için professor_passwords koleksiyonunda bcrypt'lenmiş
 * şifre belirler. Mevcut şifreyi (eğer aynı kullanıcıya başka bir ad
 * altında kayıtlıysa) opsiyonel olarak taşır.
 *
 * Kullanım (sunucuda):
 *   NAME="Arş. Gör. A. Tunahan KORKMAZ" PASSWORD="238023" \
 *   node server/set-professor-password.js
 *
 * Opsiyonel: COPY_FROM="A.Tunahan KORKMAZ"
 *   verirsen o eski ad altındaki hash'i kopyalar (şifreyi tekrar
 *   yazmaya gerek kalmaz). Sonrasında eski anahtarı siler.
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

  const doc = (await col.findOne({ _id: 'professor_passwords' })) || {};

  if (copyFrom && doc[copyFrom]) {
    // Eski ad altındaki hash'i yeni ada taşı
    const set = { [name]: doc[copyFrom], updatedAt: new Date() };
    const unset = { [copyFrom]: '' };
    await col.updateOne(
      { _id: 'professor_passwords' },
      { $set: set, $unset: unset },
      { upsert: true }
    );
    console.log(`✓ Şifre taşındı: "${copyFrom}" → "${name}"`);
    process.exit(0);
  }

  if (!password) {
    console.error('PASSWORD gerekli (en az 6 karakter).');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('Şifre en az 6 karakter olmalı.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  await col.updateOne(
    { _id: 'professor_passwords' },
    { $set: { [name]: hash, updatedAt: new Date() } },
    { upsert: true }
  );
  console.log(`✓ Şifre ayarlandı: "${name}"`);
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
