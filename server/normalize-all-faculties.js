/**
 * Tek seferlik normalize: TÜM faculties kayıtlarını ObjectId formatından
 * kısa string ID'ye taşır (Türkçe slug). Bağımlı tüm kayıtların facultyId
 * alanları güncellenir. Hâlihazırda kısa string olanlar atlanır (Fen 'fen' gibi).
 *
 * Slug üretimi: ad → küçük harf (TR) → diakritik temizle → boşluk='-' →
 * alfanumerik dışı sil → tekrar eden '-' birleştir → 'fakultesi'/'yüksekokulu'
 * suffix'i çıkar. Çakışma olursa sayısal suffix eklenir.
 *
 * Sıra (her fakülte için):
 *   1. Hedef slug ID hesapla
 *   2. Yeni faculty kaydı oluştur (_id=slug, eski alanları kopyala)
 *   3. departments/professors/students.facultyId === eski → yeni slug
 *   4. Eski kaydı sil (referans kalmamışsa)
 *
 * Idempotent: zaten kısa string ID'li olanları (Fen 'fen' gibi) atlar.
 *
 * Kullanım:
 *   DRY_RUN=1 node server/normalize-all-faculties.js
 *   node server/normalize-all-faculties.js
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';

  const faculties = db.collection('faculties');
  const departments = db.collection('departments');
  const professors = db.collection('professors');
  const students = db.collection('students');

  // Türkçe-aware slug üreteci
  const slugify = (name) => {
    let s = (name || '')
      .toString()
      .toLocaleLowerCase('tr-TR')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim();
    // 'fakultesi', 'yüksekokulu', 'koordinatorlugu' suffix'lerini at
    s = s
      .replace(/\bfakultesi\b/g, '')
      .replace(/\byuksekokulu\b/g, '')
      .replace(/\bmeslek\b/g, '')
      .replace(/\bkoordinatorlugu\b/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    // Bilinen kısaltmalar
    if (/iktisadi.*idari/.test(s)) s = 'iibf';
    if (/insan.*toplum/.test(s)) s = 'itbf';
    if (/saglik.*bilimleri/.test(s)) s = 'sbf';
    if (/sanat.*tasarim.*mimarl/.test(s)) s = 'stmf';
    if (/islami/.test(s)) s = 'ilahiyat';
    if (/ortak-dersler/.test(s)) s = 'ortak';
    return s;
  };

  const all = await faculties.find({}).toArray();
  console.log(`Toplam fakülte: ${all.length}\n`);

  // 1. fazla: tüm hedef slug'ları hesapla + çakışmaları çöz
  const usedSlugs = new Set();
  const plan = []; // { record, oldId, newId, action }

  for (const f of all) {
    const oldId = String(f._id);
    // Zaten kısa string ID (ObjectId değil) ise atla
    const isObjectIdLike = /^[0-9a-f]{24}$/i.test(oldId);
    if (!isObjectIdLike) {
      console.log(`✓ Atlanıyor (zaten kısa ID): "${f.name}" _id='${oldId}'`);
      usedSlugs.add(oldId);
      continue;
    }
    let slug = slugify(f.name) || 'fak';
    let candidate = slug;
    let n = 2;
    while (usedSlugs.has(candidate)) {
      candidate = `${slug}-${n++}`;
    }
    usedSlugs.add(candidate);
    plan.push({ record: f, oldId, newId: candidate });
  }

  console.log(`\nNormalize edilecek ${plan.length} fakülte:`);
  plan.forEach((p) => console.log(`  • "${p.record.name}" → _id='${p.newId}'  (eski: ${p.oldId})`));

  // 2. faz: her biri için uygula
  let createdCount = 0;
  let depUpdated = 0;
  let profUpdated = 0;
  let stuUpdated = 0;
  let deletedCount = 0;
  let skippedDelete = 0;

  for (const { record, oldId, newId } of plan) {
    console.log(`\n── "${record.name}" → '${newId}' ──`);

    // 2a. Yeni kayıt oluştur (zaten varsa atla)
    const existing = await faculties.findOne({ _id: newId });
    if (existing) {
      console.log(`  [1] _id='${newId}' zaten var, oluşturma atlandı.`);
    } else {
      const { _id, _docId, ...rest } = record;
      console.log(`  [1] Yeni kayıt: _id='${newId}'`);
      if (!dry) {
        await faculties.insertOne({
          _id: newId,
          _docId: newId,
          id: newId,
          ...rest,
          updatedAt: new Date(),
        });
        createdCount++;
      }
    }

    // 2b. departments güncelle
    const depCount = await departments.countDocuments({ facultyId: oldId });
    if (depCount > 0) {
      console.log(`  [2] departments: ${depCount} bölüm güncellenecek`);
      if (!dry) {
        const r = await departments.updateMany(
          { facultyId: oldId },
          { $set: { facultyId: newId, updatedAt: new Date() } }
        );
        depUpdated += r.modifiedCount;
      }
    }

    // 2c. professors güncelle
    const profCount = await professors.countDocuments({ facultyId: oldId });
    if (profCount > 0) {
      console.log(`  [3] professors: ${profCount} akademisyen güncellenecek`);
      if (!dry) {
        const r = await professors.updateMany(
          { facultyId: oldId },
          { $set: { facultyId: newId, updatedAt: new Date() } }
        );
        profUpdated += r.modifiedCount;
      }
    }

    // 2d. students güncelle
    const stuCount = await students.countDocuments({ facultyId: oldId });
    if (stuCount > 0) {
      console.log(`  [4] students: ${stuCount} öğrenci güncellenecek`);
      if (!dry) {
        const r = await students.updateMany(
          { facultyId: oldId },
          { $set: { facultyId: newId, updatedAt: new Date() } }
        );
        stuUpdated += r.modifiedCount;
      }
    }

    // 2e. Eski kaydı sil (referans kalmamışsa)
    if (!dry) {
      const refDep = await departments.countDocuments({ facultyId: oldId });
      const refProf = await professors.countDocuments({ facultyId: oldId });
      const refStu = await students.countDocuments({ facultyId: oldId });
      if (refDep + refProf + refStu > 0) {
        console.log(`  [5] ⚠ Eski kayıt silinmedi — ${refDep}+${refProf}+${refStu} referans var`);
        skippedDelete++;
      } else {
        await faculties.deleteOne({ _id: record._id });
        console.log(`  [5] ✓ Eski kayıt silindi: ${oldId}`);
        deletedCount++;
      }
    } else {
      console.log(`  [5] (DRY_RUN) eski kayıt silinecek: ${oldId}`);
    }
  }

  console.log(
    `\n${dry ? '[DRY RUN] hiçbir yazma yapılmadı.' : '✓ Tamamlandı.'}\n` +
      `Yeni kayıt: ${createdCount}, dept güncellendi: ${depUpdated}, ` +
      `prof güncellendi: ${profUpdated}, stu güncellendi: ${stuUpdated}, ` +
      `eski silindi: ${deletedCount}, silme atlandı: ${skippedDelete}`
  );
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
