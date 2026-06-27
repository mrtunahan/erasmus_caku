// ══════════════════════════════════════════════════════════════
// Arş. Gör. A. Tunahan KORKMAZ akademisyenini ekle / güncelle
//   • Bilgisayar Mühendisliği akademisyeni (departmentId: 'bilgisayar')
//   • Mühendislik Fakültesi yetkilisi  (isFacultyManager)
//   • Çankırı Karatekin Ünv. yetkilisi (isUniversityAdmin)
//
//   Fakülte/üniversite kimlikleri 'bilgisayar' bölümünden otomatik
//   çözülür; bulunamazsa faculties/universities koleksiyonlarından
//   ad eşleşmesiyle aranır.
//
//   GÜVENLİ: idempotent. Aynı adla kayıt varsa SİLMEZ, üzerine yazar
//   (flag'leri set eder). Önce DRY_RUN ile çalışır; uygulamak için:
//     APPLY=1 node server/add-tunahan-korkmaz.js
//   İsteğe bağlı geçici şifre:
//     APPLY=1 TEMP_PASSWORD='SizinSifre' node server/add-tunahan-korkmaz.js
// ══════════════════════════════════════════════════════════════
const bcrypt = require('bcrypt');
const { disconnect, getDbSafe } = require('./config/database');

const APPLY = process.env.APPLY === '1';
const TEMP_PASSWORD = process.env.TEMP_PASSWORD || 'Tunahan.2026';

const PROF = {
  name: 'Arş. Gör. A. Tunahan KORKMAZ',
  department: 'Bilgisayar Mühendisliği',
  departmentId: 'bilgisayar',
  isUniversityAdmin: true,
  isFacultyManager: true,
  isDeptManager: false,
  isStajCoordinator: false,
  additionalDepartments: [],
};

const norm = (s) => (s || '').toString().toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();

(async () => {
  const db = await getDbSafe();

  // ── 1. Fakülte / üniversite kimliklerini çöz ──
  let facultyId = '';
  let universityId = '';

  const dept = await db
    .collection('departments')
    .findOne({ $or: [{ _docId: 'bilgisayar' }, { id: 'bilgisayar' }, { name: PROF.department }] });
  if (dept) {
    facultyId = dept.facultyId || '';
    universityId = dept.universityId || '';
    console.log(
      `Bölüm bulundu: "${dept.name}"  facultyId=${facultyId || '—'}  universityId=${universityId || '—'}`
    );
  } else {
    console.log('UYARI: "bilgisayar" bölüm kaydı bulunamadı.');
  }

  if (!facultyId) {
    const fac = await db
      .collection('faculties')
      .findOne({ name: { $regex: 'mühendis', $options: 'i' } });
    if (fac) {
      facultyId = fac._docId || fac.id || (fac._id && fac._id.toString()) || '';
      if (!universityId) universityId = fac.universityId || '';
      console.log(`Fakülte (ad eşleşmesi): "${fac.name}"  → facultyId=${facultyId}`);
    } else {
      console.log('UYARI: Mühendislik fakültesi bulunamadı (faculties).');
    }
  }

  if (!universityId) {
    const uni = await db
      .collection('universities')
      .findOne({ name: { $regex: 'karatekin|çankırı|cankiri|çaku|caku', $options: 'i' } });
    if (uni) {
      universityId = uni._docId || uni.id || (uni._id && uni._id.toString()) || '';
      console.log(`Üniversite (ad eşleşmesi): "${uni.name}"  → universityId=${universityId}`);
    } else {
      console.log('UYARI: ÇAKÜ üniversite kaydı bulunamadı (universities).');
    }
  }

  // ── 2. Mevcut kayıt var mı? (tam ad + normalize kontrolü) ──
  const allProfs = await db.collection('professors').find({}).toArray();
  const existExact = allProfs.find((p) => p.name === PROF.name);
  const existNorm = allProfs.find((p) => norm(p.name) === norm(PROF.name));

  if (existNorm && !existExact) {
    console.log(
      `\nDİKKAT: Benzer adlı kayıt var: "${existNorm.name}" (_id=${existNorm._id}). ` +
        `Yeni kayıt EKLEMEK yerine bunu güncellemek isteyebilirsiniz.`
    );
  }

  const record = {
    ...PROF,
    facultyId,
    universityId,
    updatedAt: new Date(),
  };

  console.log('\n── Yazılacak professors kaydı ──');
  console.log(JSON.stringify(record, null, 2));
  console.log(
    `\nprofessor_passwords["${PROF.name}"] = bcrypt("${TEMP_PASSWORD}")  ` +
      `(ilk girişte değiştirilmesi önerilir)`
  );

  if (!APPLY) {
    console.log(
      '\n[DRY_RUN] Hiçbir şey yazılmadı. Uygulamak için: APPLY=1 node server/add-tunahan-korkmaz.js\n'
    );
    await disconnect();
    return;
  }

  // ── 3. Uygula ──
  if (existExact) {
    await db.collection('professors').updateOne({ _id: existExact._id }, { $set: record });
    console.log(`\n✓ Mevcut kayıt güncellendi (_id=${existExact._id}).`);
  } else {
    const ins = await db.collection('professors').insertOne({ ...record, createdAt: new Date() });
    console.log(`\n✓ Yeni akademisyen eklendi (_id=${ins.insertedId}).`);
  }

  // Şifre belirle (passwords/professor_passwords; noktalı anahtar için read-merge-write)
  const hash = await bcrypt.hash(TEMP_PASSWORD, 10);
  const col = db.collection('passwords');
  const existingPw = (await col.findOne({ _id: 'professor_passwords' })) || {
    _id: 'professor_passwords',
  };
  existingPw[PROF.name] = hash;
  existingPw.updatedAt = new Date();
  await col.replaceOne({ _id: 'professor_passwords' }, existingPw, { upsert: true });
  console.log(`✓ Geçici şifre belirlendi: "${TEMP_PASSWORD}"`);

  console.log('\nTamamlandı. Akademisyen girişinde isim görünür olmalı.\n');
  await disconnect();
})().catch(async (e) => {
  console.error('HATA:', e.message);
  try {
    await disconnect();
  } catch (_) {
    /* yok say */
  }
  process.exit(1);
});
