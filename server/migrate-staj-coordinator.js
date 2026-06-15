/**
 * Tek seferlik geçiş: "Staj - Fakülte" tipi bölümü kaldırır, ona bağlı
 * personel kayıtlarını fakülte staj yetkisine (isStajCoordinator) çevirir.
 * Ayrıca Ergün ÇINAR'ı varsa Mühendislik fakültesine bağlayıp staj
 * yetkilisi olarak işaretler.
 *
 * Mantık:
 *  1) departments koleksiyonunda adı "Staj - Fakülte" benzeri olan veya
 *     _docId 'staj-fakulte' olan kayıtları bul.
 *  2) Bu bölüme bağlı professors → departmentId/department alanlarını
 *     temizle, facultyId='muhendislik', isStajCoordinator=true set et.
 *  3) Bu bölüme bağlı students varsa → uyarı (taşımaz; manuel inceleme).
 *  4) Bölüm kayıtlarını sil (departments).
 *  5) Adı "Ergün ÇINAR"a benzeyen tüm professors'a isStajCoordinator +
 *     facultyId: muhendislik set et.
 *
 * Kullanım:
 *   DRY_RUN=1 node server/migrate-staj-coordinator.js   # rapor
 *   node server/migrate-staj-coordinator.js             # gerçek
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';

  const departments = db.collection('departments');
  const professors = db.collection('professors');
  const students = db.collection('students');

  const FACULTY_ID = 'muhendislik';
  const UNIVERSITY_ID = 'caku';

  const normalize = (s) =>
    (s || '').toString().toLocaleLowerCase('tr').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

  // 1) "Staj - Fakülte" bölümünü tespit
  const stajDepts = await departments
    .find({
      $or: [{ _docId: 'staj-fakulte' }, { _docId: 'stajfakulte' }, { _docId: { $regex: /staj/i } }],
    })
    .toArray();
  const byName = await departments.find({}).toArray();
  for (const d of byName) {
    if (
      normalize(d.name).includes('staj') && normalize(d.name).includes('fakülte') === false
        ? normalize(d.name).includes('fakulte')
        : normalize(d.name).includes('fakülte')
    ) {
      if (!stajDepts.some((s) => String(s._id) === String(d._id))) stajDepts.push(d);
    } else if (
      normalize(d.name).includes('staj fakülte') ||
      normalize(d.name).includes('staj fakulte') ||
      normalize(d.name) === 'staj - fakülte' ||
      normalize(d.name) === 'staj fakülte'
    ) {
      if (!stajDepts.some((s) => String(s._id) === String(d._id))) stajDepts.push(d);
    }
  }
  // Yedek: explicit ad eşleşmesi
  for (const d of byName) {
    const n = normalize(d.name);
    if (
      (n === 'staj fakülte' || n === 'staj fakulte') &&
      !stajDepts.some((s) => String(s._id) === String(d._id))
    ) {
      stajDepts.push(d);
    }
  }

  console.log(`"Staj - Fakülte" benzeri ${stajDepts.length} bölüm bulundu:`);
  stajDepts.forEach((d) =>
    console.log(`  • "${d.name}" (_docId=${d._docId || '-'}, _id=${d._id})`)
  );

  // 2) Bu bölümlere bağlı professors → staj koordinatörüne çevir
  let profMigrated = 0;
  for (const d of stajDepts) {
    const ids = [String(d._id)];
    if (d._docId) ids.push(d._docId);
    const docs = await professors
      .find({ $or: [{ departmentId: { $in: ids } }, { department: d.name }] })
      .toArray();
    console.log(
      `  ↳ "${d.name}" bölümüne bağlı ${docs.length} akademisyen → staj yetkilisi olacak`
    );
    for (const p of docs) {
      console.log(`      • ${p.name}`);
      if (!dry) {
        await professors.updateOne(
          { _id: p._id },
          {
            $set: {
              isStajCoordinator: true,
              facultyId: FACULTY_ID,
              universityId: UNIVERSITY_ID,
              department: '',
              departmentId: '',
              updatedAt: new Date(),
            },
          }
        );
        profMigrated++;
      }
    }
  }

  // 3) Bu bölümlere bağlı students → uyarı
  for (const d of stajDepts) {
    const ids = [String(d._id)];
    if (d._docId) ids.push(d._docId);
    const studCount = await students.countDocuments({
      $or: [{ departmentId: { $in: ids } }, { departmentName: d.name }, { department: d.name }],
    });
    if (studCount > 0) {
      console.log(
        `  ⚠ "${d.name}" bölümüne bağlı ${studCount} öğrenci var — taşımıyorum; manuel incele`
      );
    }
  }

  // 4) Bölüm kayıtlarını sil
  let deptDeleted = 0;
  for (const d of stajDepts) {
    if (!dry) {
      await departments.deleteOne({ _id: d._id });
      deptDeleted++;
    }
  }
  console.log(`Silinen "Staj - Fakülte" bölüm sayısı: ${deptDeleted}`);

  // 5) Ergün ÇINAR'ı bul ve bayrakla
  const ergunMatches = await professors
    .find({
      $or: [{ name: { $regex: /erg[uü]n/i } }, { name: { $regex: /ç[ıi]nar/i } }],
    })
    .toArray();
  // Hem "ergün" hem "çınar" içeren akademisyenler
  const ergunHits = ergunMatches.filter((p) => {
    const n = (p.name || '').toLowerCase();
    const hasErgun = n.includes('ergün') || n.includes('ergun');
    const hasCinar =
      n.includes('çinar') || n.includes('çınar') || n.includes('cinar') || n.includes('cınar');
    return hasErgun && hasCinar;
  });
  console.log(`\nErgün ÇINAR benzeri ${ergunHits.length} akademisyen bulundu:`);
  for (const p of ergunHits) {
    console.log(`  • ${p.name} (_id=${p._id})`);
    if (!dry) {
      await professors.updateOne(
        { _id: p._id },
        {
          $set: {
            isStajCoordinator: true,
            facultyId: FACULTY_ID,
            universityId: UNIVERSITY_ID,
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  // Ergün ÇINAR yoksa OLUŞTUR — akademisyen giriş havuzuna (professors)
  // eklenir; departmentId boş, isStajCoordinator=true → akademisyen
  // listesinde her bölüm seçiminde görünür, sadece staj modülünü açar.
  let ergunCreated = false;
  if (ergunHits.length === 0) {
    const ergunName = process.env.ERGUN_NAME || 'Ergün ÇINAR';
    console.log(`Ergün ÇINAR kaydı yok → oluşturulacak: "${ergunName}"`);
    if (!dry) {
      const genId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 20; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
        return id;
      };
      await professors.insertOne({
        _docId: genId(),
        name: ergunName,
        title: 'Memur',
        department: '',
        departmentId: '',
        facultyId: FACULTY_ID,
        universityId: UNIVERSITY_ID,
        isStajCoordinator: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      ergunCreated = true;
      console.log(`  ✓ "${ergunName}" oluşturuldu (staj koordinatörü)`);
    }
  }

  console.log(`\n${dry ? '[DRY RUN] hiçbir şey yazılmadı.' : '✓ Tamamlandı.'}`);
  console.log(
    `Profesör güncellendi: ${profMigrated + (dry ? 0 : ergunHits.length)}, oluşturulan: ${ergunCreated ? 1 : 0}, bölüm silindi: ${deptDeleted}`
  );
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
