/**
 * Tek seferlik migration: Üniversite → Fakülte → Bölüm hiyerarşisi.
 *
 * Yaptıkları:
 *  1) universities → 1 ÇAKÜ kaydı
 *  2) faculties → 1 "Mühendislik Fakültesi" kaydı (universityId: caku)
 *  3) Mevcut 6 departments kaydına facultyId ekle (Mühendislik'e bağla)
 *  4) Tüm professors kayıtlarına facultyId ekle (Mühendislik) — yoksa
 *  5) Tüm students kayıtlarına facultyId ekle (Mühendislik) — yoksa
 *  6) Mevcut admin (department_managers veya passwords 'admin') akademisyen
 *     olarak professors'a kaydedilir + isUniversityAdmin + isFacultyManager
 *     (Mühendislik) flag'leri eklenir. Mevcut bolum_yetkilisi kullanıcıları
 *     da professors'a eklenir + isDeptManager: true.
 *
 * Kullanım (sunucuda):
 *   node server/migrate-hierarchy.js
 *
 * Idempotent: tekrar çalıştırmak güvenli, mevcut kayıtları bozmaz.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const CAKU_ID = 'caku';
const ENG_FACULTY_ID = 'muhendislik';
const CAKU_DOC = {
  _docId: CAKU_ID,
  name: 'Çankırı Karatekin Üniversitesi',
  shortName: 'ÇAKÜ',
};
const ENG_FACULTY_DOC = {
  _docId: ENG_FACULTY_ID,
  universityId: CAKU_ID,
  name: 'Mühendislik Fakültesi',
  shortName: 'Mühendislik',
};

async function upsertById(col, docId, data) {
  const existing = await col.findOne({ _docId: docId });
  if (existing) {
    // Mevcut alanları koru, yeni alanları (varsa) ekle. Aşırı yazma yok.
    const toSet = {};
    for (const [k, v] of Object.entries(data)) {
      if (existing[k] === undefined) toSet[k] = v;
    }
    if (Object.keys(toSet).length > 0) {
      await col.updateOne({ _docId: docId }, { $set: { ...toSet, updatedAt: new Date() } });
    }
    return false; // yeni eklenmedi
  }
  await col.insertOne({ _docId: docId, ...data, createdAt: new Date(), updatedAt: new Date() });
  return true; // yeni eklendi
}

async function setIfMissing(col, filter, updates) {
  const docs = await col
    .find({ ...filter, $or: Object.keys(updates).map((k) => ({ [k]: { $exists: false } })) })
    .toArray();
  let count = 0;
  for (const doc of docs) {
    const toSet = {};
    for (const [k, v] of Object.entries(updates)) {
      if (doc[k] === undefined) toSet[k] = v;
    }
    if (Object.keys(toSet).length > 0) {
      await col.updateOne({ _id: doc._id }, { $set: { ...toSet, updatedAt: new Date() } });
      count++;
    }
  }
  return count;
}

(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();

  console.log('═══════════════════════════════════════════════════════');
  console.log('Hiyerarşi migration başlıyor');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1) Üniversite
  const universities = db.collection('universities');
  const uniCreated = await upsertById(universities, CAKU_ID, CAKU_DOC);
  console.log(`• universities: ${uniCreated ? 'ÇAKÜ eklendi' : 'ÇAKÜ zaten var'}`);

  // 2) Fakülte
  const faculties = db.collection('faculties');
  const facCreated = await upsertById(faculties, ENG_FACULTY_ID, ENG_FACULTY_DOC);
  console.log(`• faculties:    ${facCreated ? 'Mühendislik eklendi' : 'Mühendislik zaten var'}`);

  // 3) Mevcut bölümlere facultyId ekle (departments koleksiyonu zaten var ama
  //    bazı modüller sabit DEPARTMENTS array'ini kullanıyor — DB'de kayıt yoksa
  //    da seed edelim ki Fakülte Yöneticisi paneli görebilsin).
  const DEPT_SEED = [
    {
      id: 'bilgisayar',
      name: 'Bilgisayar Mühendisliği',
      shortName: 'Bilgisayar',
      color: '#3B82F6',
    },
    {
      id: 'elektrik',
      name: 'Elektrik ve Elektronik Mühendisliği',
      shortName: 'Elektrik-Elektronik',
      color: '#EAB308',
    },
    { id: 'makine', name: 'Makine Mühendisliği', shortName: 'Makine', color: '#EF4444' },
    { id: 'insaat', name: 'İnşaat Mühendisliği', shortName: 'İnşaat', color: '#F97316' },
    { id: 'gida', name: 'Gıda Mühendisliği', shortName: 'Gıda', color: '#22C55E' },
    { id: 'kimya', name: 'Kimya Mühendisliği', shortName: 'Kimya', color: '#8B5CF6' },
  ];
  const departments = db.collection('departments');
  let deptSeeded = 0,
    deptUpdated = 0;
  for (const d of DEPT_SEED) {
    const exists = await departments.findOne({ _docId: d.id });
    if (!exists) {
      await departments.insertOne({
        _docId: d.id,
        ...d,
        facultyId: ENG_FACULTY_ID,
        universityId: CAKU_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      deptSeeded++;
    } else if (!exists.facultyId) {
      await departments.updateOne(
        { _docId: d.id },
        { $set: { facultyId: ENG_FACULTY_ID, universityId: CAKU_ID, updatedAt: new Date() } }
      );
      deptUpdated++;
    }
  }
  console.log(`• departments:  ${deptSeeded} yeni eklendi, ${deptUpdated} facultyId güncellendi`);

  // 4) Professors → facultyId
  const professors = db.collection('professors');
  const profFixed = await setIfMissing(
    professors,
    {},
    { facultyId: ENG_FACULTY_ID, universityId: CAKU_ID }
  );
  console.log(`• professors:   ${profFixed} kayda facultyId/universityId eklendi`);

  // 5) Students → facultyId
  const students = db.collection('students');
  const studFixed = await setIfMissing(
    students,
    {},
    { facultyId: ENG_FACULTY_ID, universityId: CAKU_ID }
  );
  console.log(`• students:     ${studFixed} kayda facultyId/universityId eklendi`);

  // 6) Bölüm yetkilisi → professors + isDeptManager flag
  //    department_managers koleksiyonundaki kayıtları akademisyen olarak da kabul et
  let managerMigrated = 0;
  if (await db.listCollections({ name: 'department_managers' }).hasNext()) {
    const managers = await db.collection('department_managers').find({}).toArray();
    for (const m of managers) {
      const name = m.name || m.managerName || m._docId;
      if (!name) continue;
      const existing = await professors.findOne({ name });
      if (existing) {
        if (!existing.isDeptManager) {
          await professors.updateOne(
            { _id: existing._id },
            {
              $set: {
                isDeptManager: true,
                facultyId: ENG_FACULTY_ID,
                universityId: CAKU_ID,
                updatedAt: new Date(),
              },
            }
          );
          managerMigrated++;
        }
      } else {
        await professors.insertOne({
          name,
          department: m.department || '',
          departmentId: m.departmentId || '',
          facultyId: ENG_FACULTY_ID,
          universityId: CAKU_ID,
          isDeptManager: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        managerMigrated++;
      }
    }
  }
  console.log(
    `• dept managers: ${managerMigrated} professor kaydı eklendi/güncellendi (isDeptManager)`
  );

  // 7) Admin → professors + isUniversityAdmin + isFacultyManager
  //    Mevcut admin parolası varsa, adı bilinmiyor olabilir; ortam değişkeni
  //    ile bir akademisyen adı belirtmemize izin verelim.
  const adminProfName = process.env.UNIVERSITY_ADMIN_NAME || '';
  if (adminProfName) {
    const existing = await professors.findOne({ name: adminProfName });
    if (existing) {
      await professors.updateOne(
        { _id: existing._id },
        {
          $set: {
            isUniversityAdmin: true,
            isFacultyManager: true,
            facultyId: ENG_FACULTY_ID,
            universityId: CAKU_ID,
            updatedAt: new Date(),
          },
        }
      );
      console.log(
        `• üni admin:    "${adminProfName}" → isUniversityAdmin + isFacultyManager eklendi`
      );
    } else {
      await professors.insertOne({
        name: adminProfName,
        facultyId: ENG_FACULTY_ID,
        universityId: CAKU_ID,
        isUniversityAdmin: true,
        isFacultyManager: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`• üni admin:    "${adminProfName}" yeni professor kaydı oluşturuldu`);
    }
  } else {
    console.log('• üni admin:    UNIVERSITY_ADMIN_NAME ortam değişkeni yok, atlandı');
    console.log('                Akademisyen adını ekleyip tekrar çalıştırın:');
    console.log(
      '                UNIVERSITY_ADMIN_NAME="Ad Soyad" node server/migrate-hierarchy.js'
    );
  }

  console.log('\n✓ Hiyerarşi migration tamamlandı.');
  process.exit(0);
})().catch((e) => {
  console.error('Migration hatası:', e);
  process.exit(1);
});
