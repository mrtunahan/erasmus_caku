// ══════════════════════════════════════════════════════════════
// SALT-OKUNUR: yetim course_schedules dokümanlarını incele
//
// Migrasyon dry-run'ı course_schedules'ta hiçbir bölüme çözülemeyen
// (yetim) departmentId'ler buldu. Bu script o dokümanların NE olduğunu
// gösterir ki doğru bölüme atayalım ya da silelim. HİÇBİR ŞEY DEĞİŞTİRMEZ.
//
// Kullanım:  node server/inspect-orphan-schedules.js
// ══════════════════════════════════════════════════════════════

const { getDbSafe, disconnect } = require('./config/database');

const CORE = {
  bilgisayar: 'Bilgisayar Mühendisliği',
  elektrik: 'Elektrik ve Elektronik Mühendisliği',
  makine: 'Makine Mühendisliği',
  insaat: 'İnşaat Mühendisliği',
  gida: 'Gıda Mühendisliği',
  kimya: 'Kimya Mühendisliği',
};
const norm = (s) => (s || '').toString().toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();

(async () => {
  const db = await getDbSafe();

  // Bilinen tüm kimlik varyantları → ad
  const depts = await db.collection('departments').find({}).toArray();
  const idToName = {};
  Object.entries(CORE).forEach(([id, name]) => (idToName[id] = name));
  depts.forEach((d) => {
    const nkey = norm(d.name);
    const coreId = Object.keys(CORE).find((id) => norm(CORE[id]) === nkey);
    const name = coreId ? CORE[coreId] : d.name || '(adsız)';
    [d.id, d._id, d._docId, d.code].forEach((k) => {
      if (k) idToName[String(k)] = name;
    });
  });

  const schedules = await db.collection('course_schedules').find({}).toArray();
  console.log(`Toplam course_schedules dokümanı: ${schedules.length}\n`);

  const resolved = [];
  const orphans = [];
  schedules.forEach((doc) => {
    const parts = String(doc._docId || doc._id || '').split('_');
    const deptId = doc.departmentId || parts[0] || '';
    const slots = doc.slots || {};
    const codes = new Set();
    Object.values(slots).forEach((s) => {
      if (s && s.courseCode) codes.add(s.courseCode);
      if (s && s.ikinci && s.ikinci.courseCode) codes.add(s.ikinci.courseCode);
    });
    const row = {
      docId: doc._docId || doc._id,
      deptId: String(deptId),
      deptName: idToName[String(deptId)] || null,
      semester: doc.semester || parts[1] || '',
      year: doc.year || parts[2] || '',
      seviye: doc.seviye || (parts.length >= 4 ? parts[3] : 'lisans'),
      slotCount: Object.keys(slots).length,
      codes: [...codes].slice(0, 8).join(', '),
    };
    if (row.deptName) resolved.push(row);
    else orphans.push(row);
  });

  const show = (title, rows) => {
    console.log(`━━━ ${title} (${rows.length}) ━━━`);
    rows.forEach((r) => {
      console.log(
        `  docId=${r.docId}\n` +
          `     bölüm=${r.deptName || 'YETİM(' + r.deptId + ')'}  dönem=${r.semester} ` +
          `yıl=${r.year} seviye=${r.seviye}  slot=${r.slotCount}\n` +
          `     dersler: ${r.codes || '(boş)'}`
      );
    });
    console.log('');
  };

  show('ÇÖZÜLEN (bölüme bağlı)', resolved);
  show('YETİM (silinmiş/eşleşmeyen bölüm)', orphans);

  if (orphans.length) {
    console.log('ÖNERİ: Yukarıdaki YETİM dokümanların ders kodlarına bakarak hangi');
    console.log('bölüme ait olduklarını belirle. İçerikleri boşsa (slot=0) güvenle');
    console.log('silinebilir; doluysa doğru bölüme yeniden atanabilir. Karar senin —');
    console.log('istersen kodları paylaş, güvenli bir taşı/sil scripti hazırlayayım.');
  }

  await disconnect();
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
