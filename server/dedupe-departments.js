/**
 * departments dedupe + güvenli birleştirme.
 *
 * AYNI bölümün farklı yazımlarını (örn. "Elektrik ve Elektronik
 * Mühendisliği" ↔ "Elektrik-Elektronik Mühendisliği") tek kanonik kayda
 * indirir. Silmeden ÖNCE o bölüme bağlı professor/student kayıtlarını
 * kanonik bölüme taşır — böylece HİÇBİR KULLANICI VERİSİ KOPMAZ.
 *
 * Normalize: küçük harf (tr) + "-" → boşluk + " ve " kaldır + çoklu boşluk
 * tekleme. Böylece "ve" / "-" varyasyonları aynı grupta toplanır.
 *
 * Kanonik seçim skoru: bilinen _docId (bilgisayar/elektrik/...) > facultyId
 * dolu > _docId var.
 *
 * Kullanım (sunucuda):
 *   DRY_RUN=1 node server/dedupe-departments.js   # önce rapor (silmez)
 *   node server/dedupe-departments.js             # gerçek birleştirme
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const col = db.collection('departments');
  const profCol = db.collection('professors');
  const studCol = db.collection('students');
  const dry = process.env.DRY_RUN === '1';

  const all = await col.find({}).toArray();
  console.log(`Toplam departments kaydı: ${all.length}`);

  // Güçlü normalize: "ve" ve "-" farklarını eşitle
  const norm = (s) =>
    (s || '')
      .toString()
      .toLocaleLowerCase('tr')
      .replace(/-/g, ' ')
      .replace(/\bve\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const groups = new Map();
  for (const d of all) {
    const k = norm(d.name);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(d);
  }

  const dupGroups = [...groups.entries()].filter(([, list]) => list.length > 1);
  if (dupGroups.length === 0) {
    console.log('✓ Hiç duplicate bulunamadı.');
    process.exit(0);
  }
  console.log(`Tekrarlı bölüm grubu: ${dupGroups.length}\n`);

  const KNOWN_IDS = new Set(['bilgisayar', 'elektrik', 'makine', 'insaat', 'gida', 'kimya']);

  let deleted = 0;
  let movedProfs = 0;
  let movedStuds = 0;

  for (const [, list] of dupGroups) {
    const scored = list.map((d) => ({
      d,
      score: (KNOWN_IDS.has(d._docId) ? 100 : 0) + (d.facultyId ? 10 : 0) + (d._docId ? 1 : 0),
    }));
    scored.sort((a, b) => b.score - a.score);
    const keeper = scored[0].d;
    const keeperId = keeper._docId || String(keeper._id);
    const toRemove = scored.slice(1).map((s) => s.d);

    console.log(
      `• "${keeper.name}" KANONİK (_docId=${keeper._docId || '-'}, facultyId=${keeper.facultyId || '-'})`
    );

    for (const r of toRemove) {
      const rId = r._docId || String(r._id);
      // Bu eski kayda bağlı referansları kanonik kayda taşı
      const profFilter = {
        $or: [{ departmentId: rId }, { departmentId: String(r._id) }, { department: r.name }],
      };
      const studFilter = {
        $or: [
          { departmentId: rId },
          { departmentId: String(r._id) },
          { departmentName: r.name },
          { department: r.name },
        ],
      };
      const pCount = await profCol.countDocuments(profFilter);
      const sCount = await studCol.countDocuments(studFilter);
      console.log(
        `    ↳ siliniyor "${r.name}" (_docId=${r._docId || '-'}) — taşınacak akademisyen=${pCount}, öğrenci=${sCount}`
      );
      if (!dry) {
        if (pCount > 0) {
          await profCol.updateMany(profFilter, {
            $set: {
              departmentId: keeperId,
              department: keeper.name,
              facultyId: keeper.facultyId || 'muhendislik',
              updatedAt: new Date(),
            },
          });
          movedProfs += pCount;
        }
        if (sCount > 0) {
          await studCol.updateMany(studFilter, {
            $set: {
              departmentId: keeperId,
              departmentName: keeper.name,
              facultyId: keeper.facultyId || 'muhendislik',
              updatedAt: new Date(),
            },
          });
          movedStuds += sCount;
        }
        await col.deleteOne({ _id: r._id });
        deleted++;
      }
    }
  }

  if (dry) {
    console.log(
      '\n[DRY RUN] hiçbir şey değiştirilmedi. Gerçek işlem için DRY_RUN olmadan çalıştır.'
    );
  } else {
    console.log(
      `\n✓ Tamamlandı. Silinen kayıt: ${deleted}, taşınan akademisyen: ${movedProfs}, taşınan öğrenci: ${movedStuds}`
    );
  }
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
