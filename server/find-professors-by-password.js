/**
 * Belirli düz şifrelere uyan akademisyenleri (professors) bulur.
 * Şifreler `passwords` koleksiyonunda `_id: 'professor_passwords'` doc'unda
 * { [akademisyenAdı]: bcryptHash } olarak saklanır.
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
  const profByName = new Map();
  profs.forEach((p) => {
    if (p.name) profByName.set(p.name, p);
  });

  const pwDoc = (await db.collection('passwords').findOne({ _id: 'professor_passwords' })) || {};
  const { _id: _ignored1, _docId: _ignored2, updatedAt: _ignored3, ...entries } = pwDoc;

  const totalEntries = Object.keys(entries).length;
  console.log(`Toplam akademisyen kaydı: ${profs.length}`);
  console.log(`passwords/professor_passwords içindeki anahtar sayısı: ${totalEntries}`);
  console.log(`Denenecek şifreler: ${passwords.join(', ')}\n`);

  const results = {};
  passwords.forEach((p) => (results[p] = []));
  const other = [];
  const corrupted = [];

  for (const [name, hash] of Object.entries(entries)) {
    if (typeof hash !== 'string' || !hash.startsWith('$2')) {
      corrupted.push({ name, value: hash });
      continue;
    }
    let matched = false;
    for (const pw of passwords) {
      try {
        if (await bcrypt.compare(pw, hash)) {
          const p = profByName.get(name) || {};
          results[pw].push({
            name,
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
    if (!matched) other.push(name);
  }

  passwords.forEach((pw) => {
    console.log(`══ "${pw}" şifresine sahip akademisyenler (${results[pw].length}) ══`);
    results[pw].forEach((r) =>
      console.log(`  • ${r.name}   [fakülte=${r.facultyId}, bölüm=${r.departmentId}]`)
    );
    console.log('');
  });

  console.log(`Farklı bir şifre belirlemiş: ${other.length}`);
  if (other.length > 0 && other.length <= 30) {
    other.forEach((n) => console.log(`  • ${n}`));
  }
  if (corrupted.length > 0) {
    console.log(`\nBozuk/hashsiz anahtar (nested obj olabilir): ${corrupted.length}`);
    corrupted
      .slice(0, 10)
      .forEach((c) => console.log(`  • ${c.name} → ${JSON.stringify(c.value).slice(0, 80)}`));
  }

  const profsWithoutEntry = profs.filter((p) => p.name && !(p.name in entries));
  console.log(`\nHiç şifre girişi olmayan akademisyen: ${profsWithoutEntry.length}`);
  profsWithoutEntry.slice(0, 20).forEach((p) => console.log(`  • ${p.name}`));

  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
