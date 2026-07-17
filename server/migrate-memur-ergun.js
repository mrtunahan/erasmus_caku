/**
 * Tek seferlik geçiş: mevcut staj koordinatörlerini (ve adı "Ergün Çınar" olan
 * kullanıcıyı) YENİ "memur" rolüne taşır. Erişimleri DEĞİŞMEZ:
 *   isMemur:true + memurModules:['staj'] eklenir, isStajCoordinator KORUNUR.
 * Böylece Ergün Çınar giriş yapınca rol "Memur" olur ama staj paneli/SGK onayı
 * aynen çalışmaya devam eder (staj erişimi isStajCoordinator'a dayanıyor).
 *
 * Idempotent: zaten isMemur + memurModules içinde 'staj' olanlara dokunmaz.
 *
 * Kullanım:
 *   DRY_RUN=1 node server/migrate-memur-ergun.js
 *   node server/migrate-memur-ergun.js
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';
  const profs = db.collection('professors');

  const isErgun = (name) => {
    const s = (name || '').toLocaleLowerCase('tr');
    return (
      (s.includes('ergün') || s.includes('ergun')) &&
      (s.includes('çınar') || s.includes('çinar') || s.includes('cinar') || s.includes('cınar'))
    );
  };

  const all = await profs.find({}).toArray();
  const targets = all.filter((p) => p.isStajCoordinator || isErgun(p.name));

  console.log(`\nMemur rolüne taşınacak ${targets.length} kayıt:`);
  let changed = 0;
  for (const p of targets) {
    const modules = Array.isArray(p.memurModules) ? p.memurModules.slice() : [];
    if (!modules.includes('staj')) modules.push('staj');
    const already = p.isMemur === true && (p.memurModules || []).includes('staj');
    console.log(
      `  • ${p.name}  [fac=${p.facultyId || '-'}]  ${already ? '(zaten memur, atlandı)' : '→ isMemur:true, memurModules:' + JSON.stringify(modules)}`
    );
    if (already) continue;
    if (!dry) {
      await profs.updateOne(
        { _id: p._id },
        {
          $set: {
            isMemur: true,
            memurModules: modules,
            isStajCoordinator: true, // staj erişimi korunur
            updatedAt: new Date(),
          },
        }
      );
    }
    changed++;
  }

  console.log(`\n${dry ? '[DRY RUN] yazılmadı.' : '✓ Tamamlandı.'} Güncellenen: ${changed}`);
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
