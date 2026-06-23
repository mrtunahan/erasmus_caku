/**
 * Tek seferlik normalize: Fen Fakültesi'nin _id'sini ObjectId formatından
 * 'fen' string'ine taşır. Tüm bağımlı kayıtların facultyId alanı eski
 * ObjectId'den 'fen'e güncellenir. Mühendislik Fakültesi gibi tahmin edilebilir
 * bir kısa anahtar elde edilir.
 *
 * Sıra (atomik değil ama güvenli):
 *   1. Yeni Fen kaydı oluştur (_id='fen', _docId='fen') — eski kayıt hâlâ durur
 *   2. departments.facultyId === ESKI_ID olanları 'fen' yap
 *   3. professors.facultyId === ESKI_ID olanları 'fen' yap
 *   4. students.facultyId === ESKI_ID olanları 'fen' yap
 *   5. Eski Fen Fakültesi kaydını sil (referans kalmamışsa)
 *
 * Idempotent: zaten 'fen' kullanılıyorsa hiçbir yazma yapılmaz.
 *
 * Kullanım:
 *   DRY_RUN=1 node server/normalize-fen-faculty.js
 *   node server/normalize-fen-faculty.js
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';

  const faculties = db.collection('faculties');
  const departments = db.collection('departments');
  const professors = db.collection('professors');
  const students = db.collection('students');

  // 1) Mevcut Fen kayıtlarını bul (ad veya _id ile)
  const allFenRecords = await faculties.find({ name: { $regex: /fen fak/i } }).toArray();
  console.log(`Fen ile eşleşen fakülte kaydı sayısı: ${allFenRecords.length}`);
  allFenRecords.forEach((f) =>
    console.log(
      `  • _id=${f._id}  _docId=${f._docId || '-'}  name="${f.name}"  shortName="${f.shortName || '-'}"`
    )
  );

  if (allFenRecords.length === 0) {
    console.error('HATA: Fen Fakültesi kaydı yok. Önce move-deps-to-fen-fakultesi.js çalıştırın.');
    process.exit(1);
  }

  // Hedef format
  const NEW_FEN = {
    _id: 'fen',
    _docId: 'fen',
    id: 'fen',
    name: 'Fen Fakültesi',
    shortName: 'Fen Fak.',
    universityId: 'caku',
  };

  // Zaten _id='fen' olan kayıt var mı?
  const existingNew = allFenRecords.find((f) => String(f._id) === 'fen');
  const oldRecords = allFenRecords.filter((f) => String(f._id) !== 'fen');

  if (existingNew && oldRecords.length === 0) {
    console.log('\n✓ Zaten normalize: tek bir Fen kaydı var ve _id="fen". İşlem gerekmez.');
    process.exit(0);
  }

  // 2) Yeni kayıt yoksa oluştur
  if (!existingNew) {
    console.log(`\n[1] Yeni Fen kaydı oluşturulacak: _id='fen'`);
    if (!dry) {
      await faculties.insertOne({
        ...NEW_FEN,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } else {
    console.log(`\n[1] _id='fen' kaydı zaten var, üzerine yazılmıyor.`);
  }

  // 3) Eski ID'leri set'le — bunların hepsi 'fen'e çevrilecek
  const oldIds = oldRecords.map((f) => String(f._id));
  console.log(`\n[2-4] Bağımlı referansları güncelle (eski ID'ler: ${oldIds.join(', ') || '-'})`);

  if (oldIds.length === 0) {
    console.log('  Eski kayıt yok, atlandı.');
  } else {
    // departments
    const depAffected = await departments.find({ facultyId: { $in: oldIds } }).toArray();
    console.log(`  departments: ${depAffected.length} bölüm güncellenecek`);
    depAffected.forEach((d) => console.log(`    • ${d.name}`));
    if (!dry && depAffected.length > 0) {
      await departments.updateMany(
        { facultyId: { $in: oldIds } },
        { $set: { facultyId: 'fen', updatedAt: new Date() } }
      );
    }

    // professors
    const profAffected = await professors.find({ facultyId: { $in: oldIds } }).toArray();
    console.log(`  professors: ${profAffected.length} akademisyen güncellenecek`);
    profAffected.forEach((p) => console.log(`    • ${p.name}`));
    if (!dry && profAffected.length > 0) {
      await professors.updateMany(
        { facultyId: { $in: oldIds } },
        { $set: { facultyId: 'fen', updatedAt: new Date() } }
      );
    }

    // students
    const stuCount = await students.countDocuments({ facultyId: { $in: oldIds } });
    console.log(`  students: ${stuCount} öğrenci güncellenecek`);
    if (!dry && stuCount > 0) {
      await students.updateMany(
        { facultyId: { $in: oldIds } },
        { $set: { facultyId: 'fen', updatedAt: new Date() } }
      );
    }
  }

  // 4) Son kontrol — referans kalmadıysa eski kayıtları sil
  console.log(`\n[5] Eski Fen kayıtlarını sil`);
  for (const old of oldRecords) {
    if (dry) {
      console.log(`  • ${old._id} silinecek (DRY_RUN)`);
      continue;
    }
    // Çift kontrol: hâlâ referans var mı?
    const refDep = await departments.countDocuments({ facultyId: String(old._id) });
    const refProf = await professors.countDocuments({ facultyId: String(old._id) });
    const refStu = await students.countDocuments({ facultyId: String(old._id) });
    if (refDep + refProf + refStu > 0) {
      console.log(`  ⚠ ${old._id} silinmedi — hâlâ ${refDep}+${refProf}+${refStu} referans var.`);
      continue;
    }
    await faculties.deleteOne({ _id: old._id });
    console.log(`  ✓ Silindi: ${old._id}`);
  }

  console.log(`\n${dry ? '[DRY RUN] hiçbir yazma yapılmadı.' : '✓ Tamamlandı.'}`);
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
