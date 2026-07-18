/**
 * Kiracı (tenant) kimlik config'i seed — beyaz etiket temeli.
 *
 * Uygulama/kurum/fakülte adları, altbilgi ve geliştirici notu artık kodda
 * sabit değil; 'tenant_config' koleksiyonundaki 'main' dokümanından okunur
 * (istemci: window.TENANT — shared-components.jsx). Kayıt yoksa istemci
 * mevcut varsayılanlarla çalışır (sıfır regresyon).
 *
 * Farklı bir üniversiteye kurulumda yalnızca bu dokümanın alanları değiştirilir.
 *
 * Idempotent: 'main' varsa dokunmaz; FORCE=1 ile üzerine yazar.
 *
 * Kullanım:
 *   DRY_RUN=1 node server/seed-tenant-config.js
 *   node server/seed-tenant-config.js
 *   FORCE=1 node server/seed-tenant-config.js
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';
  const force = process.env.FORCE === '1';
  const col = db.collection('tenant_config');

  const CONFIG = {
    _docId: 'main',
    _id: 'main',
    appName: 'Offline Asistan',
    universityName: 'Çankırı Karatekin Üniversitesi',
    facultyName: 'Mühendislik Fakültesi',
    // Altbilgideki birim adı (© satırı)
    unitName: 'ÇAKÜ Bilgisayar Mühendisliği',
    developerNote: 'Offline Asistan, Arş. Gör. A. Tunahan KORKMAZ tarafından geliştirilmektedir.',
    logoUrl: 'logo.png',
    // Öğrenci e-posta placeholder'ı gibi ikincil kullanımlar için
    studentEmailDomain: 'ogrenci.karatekin.edu.tr',
  };

  const existing = await col.findOne({ _docId: CONFIG._docId });
  if (existing && !force) {
    console.log('✓ tenant_config "main" zaten var — dokunulmadı (değiştirmek için FORCE=1).');
    process.exit(0);
  }
  console.log(`${existing ? 'Güncellenecek' : 'Eklenecek'}: tenant_config/main`);
  Object.entries(CONFIG).forEach(([k, v]) => {
    if (!k.startsWith('_')) console.log(`  • ${k} = ${v}`);
  });
  if (!dry) {
    await col.replaceOne(
      { _docId: CONFIG._docId },
      { ...CONFIG, updatedAt: new Date() },
      { upsert: true }
    );
    console.log('✓ Yazıldı.');
  } else {
    console.log('[DRY RUN] yazılmadı.');
  }
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
