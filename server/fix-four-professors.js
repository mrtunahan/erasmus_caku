/**
 * Tek seferlik düzeltme — kullanıcının net talimatına göre 4 akademisyenin
 * duplicate/yanlış bölüm kaydını temizler:
 *
 *  • Doç. Dr. Ömer Faruk DİLMAÇ → Kimya Müh kalır, İnşaat dupe silinir
 *  • Arş. Gör. Dr. Merve DURMAZ → Kimya Müh kalır, Makine dupe silinir
 *  • Prof Dr. İlyas İNCİ → Fen Fak. Fizik bölümüne taşınır, diğer kayıt silinir
 *  • Prof. Dr. Baran Önal ULUSOY → Gıda kalır, bozuk ID'li dupe silinir
 *
 * Kullanım:
 *   DRY_RUN=1 node server/fix-four-professors.js
 *   node server/fix-four-professors.js
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';

  const profsCol = db.collection('professors');
  const deptsCol = db.collection('departments');

  // Fizik bölümünü (Fen Fakültesi) bul — ad eşleşmesiyle, facultyId='fen'
  const fizikDept = await deptsCol.findOne({
    $and: [
      { name: { $regex: /^fizik/i } },
      { $or: [{ facultyId: 'fen' }, { name: { $regex: /bölüm/i } }] },
    ],
  });
  if (!fizikDept) {
    console.error(
      'HATA: Fen Fak. Fizik bölümü bulunamadı. Önce move-deps-to-fen-fakultesi.js çalıştırılmış olmalı.'
    );
    process.exit(1);
  }
  const fizikId = fizikDept._docId || fizikDept.id || String(fizikDept._id);
  const fizikName = fizikDept.name;
  console.log(`Fizik bölümü bulundu: _docId=${fizikId}, name="${fizikName}"`);

  // Hedef akademisyenleri çek (normalize edilmiş ad ile)
  const norm = (s) =>
    (s || '')
      .toString()
      .toLocaleLowerCase('tr-TR')
      .replace(/[.,]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const allProfs = await profsCol.find({}).toArray();
  const findByName = (target) => {
    const t = norm(target);
    return allProfs.filter((p) => norm(p.name) === t);
  };

  // Yardımcı: belirli bölüm kaydını sil, diğerlerini koru
  const fixProfessor = async (label, nameMatch, deletePredicate) => {
    const matches = findByName(nameMatch);
    console.log(`\n• ${label} — ${matches.length} kayıt bulundu`);
    matches.forEach((p) =>
      console.log(`    _id=${p._id} deptId=${p.departmentId || '-'} dept=${p.department || '-'}`)
    );
    let deleted = 0;
    let updated = 0;
    for (const p of matches) {
      const action = deletePredicate(p);
      if (action === 'delete') {
        console.log(`    ✗ silinecek: _id=${p._id}`);
        if (!dry) {
          await profsCol.deleteOne({ _id: p._id });
          deleted++;
        }
      } else if (typeof action === 'object' && action.update) {
        console.log(`    ↻ güncellenecek: _id=${p._id} →`, action.update);
        if (!dry) {
          await profsCol.updateOne(
            { _id: p._id },
            { $set: { ...action.update, updatedAt: new Date() } }
          );
          updated++;
        }
      } else {
        console.log(`    ✓ korunacak: _id=${p._id}`);
      }
    }
    return { deleted, updated };
  };

  // 1) Ömer Faruk DİLMAÇ — Kimya kalır, İnşaat silinir
  const r1 = await fixProfessor('Doç. Dr. Ömer Faruk DİLMAÇ', 'Doç. Dr. Ömer Faruk DİLMAÇ', (p) =>
    p.departmentId === 'insaat' ? 'delete' : 'keep'
  );

  // 2) Merve DURMAZ — Kimya kalır, Makine silinir
  const r2 = await fixProfessor('Arş. Gör. Dr. Merve DURMAZ', 'Arş. Gör. Dr. Merve DURMAZ', (p) =>
    p.departmentId === 'makine' ? 'delete' : 'keep'
  );

  // 3) İlyas İNCİ — İnşaat silinir, diğerini Fen Fizik'e taşı
  const r3 = await fixProfessor('Prof Dr. İlyas İNCİ', 'Prof Dr. İlyas İNCİ', (p) => {
    if (p.departmentId === 'insaat') return 'delete';
    return {
      update: {
        departmentId: fizikId,
        department: fizikName,
        facultyId: 'fen',
      },
    };
  });

  // 4) Baran Önal ULUSOY — Gıda kalır, bozuk ID'li dupe silinir
  const r4 = await fixProfessor(
    'Prof. Dr. Baran Önal ULUSOY',
    'Prof. Dr. Baran Önal ULUSOY',
    (p) => (p.departmentId === 'gida' ? 'keep' : 'delete')
  );

  const totalDel = r1.deleted + r2.deleted + r3.deleted + r4.deleted;
  const totalUpd = r1.updated + r2.updated + r3.updated + r4.updated;
  console.log(
    `\n${dry ? '[DRY RUN] yazılmadı.' : '✓ Tamamlandı.'} Silinen: ${totalDel}, güncellenen: ${totalUpd}`
  );
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
