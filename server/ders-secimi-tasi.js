/**
 * ESKİ DERS LİSTESİNİ DÖNEM KAYDINA TAŞIMA — kuru çalışma varsayılan, yedekli.
 *
 * Ders seçimi iki yerde tutuluyor: dönem bazlı `student_courses`
 * ("<no>__<dönem>") ve eski, dönemsiz `students.myCourseIds`. Eski liste
 * yalnız yeni kaydı olmayan öğrenci için ve İÇİNDE BULUNULAN dönemde sayılıyor
 * (Benim Sayfam, yoklama, ders odası, menü kapısı her biri ayrı ayrı). Bu
 * yüzden eski listesi olan öğrencinin seçimi her yeni dönemde kendiliğinden
 * "o dönemin seçimi" gibi davranıyordu.
 *
 * Bu betik, HİÇ dönem kaydı olmayan ve eski listesi dolu öğrenciler için
 * bulunulan dönemin kaydını açar:
 *   • kilitsiz açılır (öğrenci düzenleyip kaydedebilir — bugünkü davranış);
 *   • danışman boş kalır (öğrenci kaydederken seçer);
 *   • `students.myCourseIds` SİLİNMEZ, uygulama ona bakmaya devam eder;
 *   • var olan hiçbir dönem kaydına dokunulmaz.
 *
 * Kullanım (proje kökünden):
 *   node server/ders-secimi-tasi.js            # kuru: yalnız rapor
 *   UYGULA=1 node server/ders-secimi-tasi.js   # yedek al + yaz
 *
 * Geri alma: yazılan kayıtlar `kaynak: 'myCourseIds-tasima'` taşır;
 *   db.student_courses.deleteMany({ kaynak: 'myCourseIds-tasima' })
 */
require('dotenv').config();
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');

const metin = (v) => String(v == null ? '' : v).trim();

(async () => {
  const { getDbSafe, disconnect } = require('./config/database');
  const { donemAnahtari } = await import('../lib/ders-odasi.js');
  const uygula = process.env.UYGULA === '1';
  const db = await getDbSafe();
  const donem = donemAnahtari();
  const [academicYear, donemAdi] = donem.split('_');
  console.log(
    (uygula ? '▶ UYGULA: yedek alınıp yazılacak.' : '▶ KURU ÇALIŞMA: hiçbir şey yazılmaz.') +
      ' Dönem: ' +
      donem
  );

  const ogrenciler = await db
    .collection('students')
    .find(
      { 'myCourseIds.0': { $exists: true } },
      { projection: { studentNumber: 1, departmentId: 1, myCourseIds: 1 } }
    )
    .toArray();
  const kayitlilar = new Set(
    (
      await db
        .collection('student_courses')
        .find({}, { projection: { studentNumber: 1, _docId: 1 } })
        .toArray()
    ).flatMap((k) => [metin(k.studentNumber), metin(k._docId).split('__')[0]].filter(Boolean))
  );

  const tasinacak = ogrenciler.filter(
    (o) => metin(o.studentNumber) && !kayitlilar.has(metin(o.studentNumber))
  );
  console.log('Eski listesi dolu öğrenci       :', ogrenciler.length);
  console.log('  zaten dönem kaydı olan       :', ogrenciler.length - tasinacak.length);
  console.log('  taşınacak (yalnız eski liste):', tasinacak.length);
  tasinacak.slice(0, 15).forEach((o) => {
    console.log('   ·', o.studentNumber, '→', (o.myCourseIds || []).length, 'ders');
  });
  if (tasinacak.length > 15) console.log('   … ve', tasinacak.length - 15, 'öğrenci daha');

  if (!uygula || tasinacak.length === 0) {
    if (!uygula) console.log('\nYazmak için: UYGULA=1 node server/ders-secimi-tasi.js');
    await disconnect();
    return;
  }

  const yedekDizin = path.join(__dirname, '..', 'yedek');
  fs.mkdirSync(yedekDizin, { recursive: true });
  const yedek = path.join(
    yedekDizin,
    'ders-secimi-tasi-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json'
  );
  fs.writeFileSync(yedek, JSON.stringify({ donem, ogrenciler: tasinacak }, null, 2));
  console.log('\nYedek:', yedek);

  let yazilan = 0;
  for (const o of tasinacak) {
    const no = metin(o.studentNumber);
    const docId = no + '__' + donem;
    // Arada öğrenci kendisi kaydettiyse dokunulmaz (upsert değil, yoksa ekle).
    const r = await db.collection('student_courses').updateOne(
      { _docId: docId },
      {
        $setOnInsert: {
          _docId: docId,
          studentNumber: no,
          _owner: no,
          termKey: donem,
          academicYear,
          donem: donemAdi,
          departmentId: metin(o.departmentId),
          courseIds: (o.myCourseIds || []).map(String),
          advisor: '',
          locked: false,
          kaynak: 'myCourseIds-tasima',
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
    if (r.upsertedCount) yazilan++;
  }
  console.log('Yazılan dönem kaydı:', yazilan);
  await disconnect();
})().catch((e) => {
  console.error('HATA:', e && e.message);
  process.exit(1);
});
