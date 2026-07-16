/**
 * Salt-okunur teşhis: Sağ menüde "Fen Fakültesi"nin neden görünmediğini
 * anlamak için DB'deki fakülte / bölüm / ilgili akademisyen kayıtlarını döker.
 * HİÇBİR YAZMA YAPMAZ.
 *
 * Kullanım:
 *   node server/diagnose-fen-fakultesi.js
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();

  const faculties = await db.collection('faculties').find({}).toArray();
  const departments = await db.collection('departments').find({}).toArray();

  const fid = (d) => d._docId || d.id || (d._id && d._id.toString()) || '(id yok)';

  console.log('\n════════ FAKÜLTELER (faculties) ════════');
  faculties.forEach((f) => {
    console.log(`  • id=${fid(f)}  |  name=${f.name || '(ad yok)'}`);
  });

  const fen = faculties.find(
    (f) => /fen fak/i.test(f.name || '') || String(fid(f)).toLowerCase() === 'fen'
  );
  console.log('\n════════ FEN FAKÜLTESİ KAYDI ════════');
  if (!fen) {
    console.log('  ✗ Fen Fakültesi kaydı YOK. → move-deps-to-fen-fakultesi.js çalıştırılmalı.');
  } else {
    console.log(`  ✓ Bulundu. Menüde gruplama için kullanılacak id = "${fid(fen)}"`);
  }
  const fenId = fen ? fid(fen) : null;

  console.log('\n════════ BÖLÜMLER (departments) — facultyId ile ════════');
  departments.forEach((d) => {
    const mark = fenId && String(d.facultyId) === String(fenId) ? '  ← FEN' : '';
    console.log(
      `  • id=${fid(d)}  |  name=${d.name || '(ad yok)'}  |  facultyId=${d.facultyId || '(BOŞ)'}${mark}`
    );
  });

  const fenDepts = fenId
    ? departments.filter((d) => String(d.facultyId) === String(fenId))
    : [];
  console.log('\n════════ ÖZET ════════');
  console.log(`  Toplam fakülte : ${faculties.length}`);
  console.log(`  Toplam bölüm   : ${departments.length}`);
  console.log(`  Fen'e bağlı bölüm sayısı (facultyId === "${fenId}") : ${fenDepts.length}`);
  if (fenDepts.length === 0) {
    console.log(
      '\n  ⚠ Fen fakültesine bağlı HİÇ bölüm yok — sağ menüde "Fen Fakültesi" grubu\n' +
        '    bu yüzden görünmez. Olası nedenler:\n' +
        '      1) Bölümler DB\'de yok  → move-deps-to-fen-fakultesi.js\n' +
        '      2) Bölümlerin facultyId\'si farklı/eski (ObjectId) → normalize-fen-faculty.js\n' +
        '      3) Bölümlerin facultyId\'si boş.'
    );
  } else {
    console.log('\n  ✓ Fen bölümleri mevcut. Sorun istemci tarafında (adminScope/bayrak/derleme) olabilir.');
  }

  // A. Tunahan KORKMAZ'ın yetki bayrakları (üniversite admini mi?)
  const me = await db.collection('professors').findOne({ name: { $regex: /tunahan korkmaz/i } });
  console.log('\n════════ GİRİŞ YAPAN AKADEMİSYEN (Tunahan KORKMAZ) ════════');
  if (!me) {
    console.log('  (professors içinde "Tunahan KORKMAZ" bulunamadı)');
  } else {
    console.log(`  name              = ${me.name}`);
    console.log(`  departmentId      = ${me.departmentId || '-'}`);
    console.log(`  facultyId         = ${me.facultyId || '-'}`);
    console.log(`  isUniversityAdmin = ${!!me.isUniversityAdmin}`);
    console.log(`  isFacultyManager  = ${!!me.isFacultyManager}`);
    console.log(`  isDeptManager     = ${!!me.isDeptManager}`);
  }

  console.log('');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
