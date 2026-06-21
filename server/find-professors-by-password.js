/**
 * Belirli düz şifrelere uyan akademisyenleri (professors) bulur.
 * Hangi default şifrenin (örn. 132333, 130994) hangi kullanıcıda
 * aktif olduğunu görmek için kullanılır.
 *
 * Kullanım:
 *   node server/find-professors-by-password.js 132333 130994
 *   node server/find-professors-by-password.js                # default: 132333 130994
 */
(async () => {
  const bcrypt = require('bcrypt');
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();

  const candidates = process.argv.slice(2);
  const passwords = candidates.length > 0 ? candidates : ['132333', '130994'];

  const profs = await db.collection('professors').find({}).toArray();
  console.log(`Toplam akademisyen: ${profs.length}`);
  console.log(`Denenecek şifreler: ${passwords.join(', ')}\n`);

  const results = {};
  passwords.forEach((p) => (results[p] = []));
  const noPassword = [];
  const other = [];

  for (const p of profs) {
    const hash = p.password || p.passwordHash || null;
    if (!hash) {
      noPassword.push(p.name);
      continue;
    }
    let matched = false;
    for (const pw of passwords) {
      try {
        if (await bcrypt.compare(pw, hash)) {
          results[pw].push({
            name: p.name,
            facultyId: p.facultyId || '-',
            departmentId: p.departmentId || '-',
          });
          matched = true;
          break;
        }
      } catch {
        /* hash bcrypt değil */
      }
    }
    if (!matched) other.push(p.name);
  }

  passwords.forEach((pw) => {
    console.log(`══ "${pw}" şifresine sahip akademisyenler (${results[pw].length}) ══`);
    results[pw].forEach((r) =>
      console.log(`  • ${r.name}   [fakülte=${r.facultyId}, bölüm=${r.departmentId}]`)
    );
    console.log('');
  });

  console.log(`Diğer şifre kullanan: ${other.length}`);
  console.log(`Şifre kaydı olmayan: ${noPassword.length}`);
  if (noPassword.length > 0) {
    noPassword.slice(0, 20).forEach((n) => console.log(`  • ${n}`));
    if (noPassword.length > 20) console.log(`  ... (+${noPassword.length - 20} kişi daha)`);
  }
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
