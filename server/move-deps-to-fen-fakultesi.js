/**
 * Tek seferlik geçiş: Matematik / İstatistik / Fizik / Kimya / Biyoloji
 * bölümlerini "Fen Fakültesi"ne taşır. Fen Fakültesi kaydı yoksa
 * oluşturulur. İlgili akademisyenlerin de facultyId'si güncellenir.
 *
 * Eşleştirme adlara göre yapılır (case-insensitive, normalize edilmiş).
 * "Kimya Mühendisliği" Mühendislik'te kalır; bu script "Kimya Bölümü"nü
 * (veya yalnız "Kimya"yı) Fen'e taşır. "Mühendisliği" içeren ad varyantları
 * atlanır.
 *
 * Idempotent: zaten Fen'de olan kayıtlara dokunmaz.
 *
 * Kullanım:
 *   DRY_RUN=1 node server/move-deps-to-fen-fakultesi.js
 *   node server/move-deps-to-fen-fakultesi.js
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';

  const FEN_FACULTY = {
    id: 'fen',
    name: 'Fen Fakültesi',
    shortName: 'Fen Fak.',
    universityId: 'caku',
  };

  // Adı taşınacak bölümlerin normalize sözlüğü.
  const TARGETS = ['matematik', 'istatistik', 'fizik', 'kimya', 'biyoloji'];

  const normalize = (s) =>
    (s || '')
      .toString()
      .toLocaleLowerCase('tr')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  // 1) Fen Fakültesi var mı? Yoksa oluştur.
  const faculties = db.collection('faculties');
  let fen =
    (await faculties.findOne({ _docId: FEN_FACULTY.id })) ||
    (await faculties.findOne({ id: FEN_FACULTY.id })) ||
    (await faculties.findOne({ name: { $regex: /^fen fak/i } }));

  if (!fen) {
    console.log(`Fen Fakültesi yok → oluşturuluyor (id=${FEN_FACULTY.id}).`);
    if (!dry) {
      await faculties.insertOne({
        _docId: FEN_FACULTY.id,
        _id: FEN_FACULTY.id,
        ...FEN_FACULTY,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    fen = { ...FEN_FACULTY, _docId: FEN_FACULTY.id };
  } else {
    console.log(`Fen Fakültesi mevcut: _docId=${fen._docId || fen.id || fen._id}`);
  }
  const fenId = fen._docId || fen.id || FEN_FACULTY.id;

  // 2) Hedef bölümleri tespit et.
  const depts = await db.collection('departments').find({}).toArray();
  const toMove = depts.filter((d) => {
    const n = normalize(d.name);
    if (!n) return false;
    // "mühendisliği" içerenler dışlanır
    if (n.includes('muhendisligi') || n.includes('muhendislik')) return false;
    // Hedef sözcüklerden biri ile başlıyor veya ana sözcük eşleşmesi
    return TARGETS.some((t) => n === t || n.startsWith(t + ' '));
  });

  console.log(`\nFen'e taşınacak ${toMove.length} bölüm:`);
  toMove.forEach((d) =>
    console.log(
      `  • "${d.name}" (_docId=${d._docId || d.id || d._id}, mevcut facultyId=${d.facultyId || '-'})`
    )
  );

  // 3) Bölümleri güncelle.
  let movedDepts = 0;
  for (const d of toMove) {
    if ((d.facultyId || '') === fenId) {
      console.log(`  – "${d.name}" zaten Fen'de, atlandı.`);
      continue;
    }
    if (!dry) {
      await db
        .collection('departments')
        .updateOne({ _id: d._id }, { $set: { facultyId: fenId, updatedAt: new Date() } });
    }
    movedDepts++;
  }

  // 4) Bu bölümlere bağlı akademisyenlerin facultyId'sini de güncelle.
  const movedDeptIds = toMove.map((d) => String(d._docId || d.id || d._id));
  const movedDeptDocIds = toMove
    .map((d) => d._docId)
    .filter(Boolean)
    .map(String);
  const idSet = new Set([...movedDeptIds, ...movedDeptDocIds]);

  const profs = await db.collection('professors').find({}).toArray();
  const affectedProfs = profs.filter((p) => p.departmentId && idSet.has(String(p.departmentId)));
  console.log(`\nFakültesi Fen'e çekilecek ${affectedProfs.length} akademisyen:`);
  affectedProfs.forEach((p) =>
    console.log(`  • ${p.name}  [dept=${p.departmentId}, eski facultyId=${p.facultyId || '-'}]`)
  );
  let movedProfs = 0;
  for (const p of affectedProfs) {
    if ((p.facultyId || '') === fenId) continue;
    if (!dry) {
      await db
        .collection('professors')
        .updateOne({ _id: p._id }, { $set: { facultyId: fenId, updatedAt: new Date() } });
    }
    movedProfs++;
  }

  // 5) Bu bölümlere bağlı öğrencilerin facultyId'sini de güncelle (varsa).
  const students = await db.collection('students').find({}).toArray();
  const affectedStudents = students.filter(
    (s) => s.departmentId && idSet.has(String(s.departmentId))
  );
  console.log(`\nFakültesi Fen'e çekilecek ${affectedStudents.length} öğrenci.`);
  let movedStudents = 0;
  for (const s of affectedStudents) {
    if ((s.facultyId || '') === fenId) continue;
    if (!dry) {
      await db
        .collection('students')
        .updateOne({ _id: s._id }, { $set: { facultyId: fenId, updatedAt: new Date() } });
    }
    movedStudents++;
  }

  console.log(
    `\n${dry ? '[DRY RUN] yazılmadı.' : '✓ Tamamlandı.'} Bölüm: ${movedDepts}, akademisyen: ${movedProfs}, öğrenci: ${movedStudents}`
  );
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
