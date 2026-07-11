// ══════════════════════════════════════════════════════════════
// course_schedules YİNELENEN TEMİZLİĞİ
//
// Aynı (bölüm, dönem, yıl, seviye) için birden çok doküman varsa (ör. biri
// string _id ile boş, biri _docId ile dolu) EN ÇOK SLOT içeren TEK dokümanı
// tutar, diğerlerini siler. Böylece uygulamanın okuma (_docId öncelikli) ve
// yazma (_id öncelikli) yolları aynı dokümanı hedefler.
//
// GÜVENLİK: varsayılan DRY-RUN. APPLY=1 uygular + silinenleri
// `_sched_dedup_backup`'a yazar. UNDO=1 geri yükler. Tutulan doküman ASLA
// silinmez; yalnız aynı anahtarın FAZLA kopyaları silinir. Slot'u dolu bir
// doküman, daha dolu bir kopya yoksa asla silinmez.
//
// Kullanım:
//   node server/dedupe-course-schedules.js            # DRY-RUN
//   APPLY=1 node server/dedupe-course-schedules.js     # uygula
//   UNDO=1 node server/dedupe-course-schedules.js      # geri al
// ══════════════════════════════════════════════════════════════

const { getDbSafe, disconnect } = require('./config/database');

const APPLY = process.env.APPLY === '1';
const UNDO = process.env.UNDO === '1';
const COLL = 'course_schedules';
const BACKUP = '_sched_dedup_backup';

const slotCount = (doc) => Object.keys((doc && doc.slots) || {}).length;

// Anahtar: bölüm_dönem_yıl_seviye (docId veya alanlardan)
function keyOf(doc) {
  const parts = String(doc._docId || doc._id || '').split('_');
  const dept = doc.departmentId || parts[0] || '';
  const sem = doc.semester || parts[1] || '';
  const yr = doc.year || parts[2] || '';
  const sev = doc.seviye || (parts.length >= 4 ? parts[3] : 'lisans');
  return `${dept}__${sem}__${yr}__${sev}`;
}

async function runUndo(db) {
  const backups = await db.collection(BACKUP).find({}).toArray();
  if (!backups.length) {
    console.log('Backup boş — geri alınacak silme yok.');
    return;
  }
  console.log(`${backups.length} silinen doküman geri yükleniyor...`);
  let ok = 0;
  for (const b of backups) {
    try {
      const filter = b.doc._docId ? { _docId: b.doc._docId } : { _id: b.doc._id };
      const exists = await db.collection(COLL).findOne(filter);
      if (!exists) await db.collection(COLL).insertOne(b.doc);
      ok++;
    } catch (e) {
      console.error(`  Geri yükleme hatası: ${e.message}`);
    }
  }
  console.log(`${ok}/${backups.length} doküman geri yüklendi.`);
  if (ok === backups.length) {
    await db.collection(BACKUP).deleteMany({});
    console.log('Backup temizlendi.');
  } else {
    console.log('Bazıları geri yüklenemedi — backup KORUNDU.');
  }
}

(async () => {
  const db = await getDbSafe();

  if (UNDO) {
    await runUndo(db);
    await disconnect();
    return;
  }

  const all = await db.collection(COLL).find({}).toArray();
  const groups = {};
  all.forEach((d) => {
    const k = keyOf(d);
    (groups[k] = groups[k] || []).push(d);
  });

  console.log('═══════════════════════════════════════════════════');
  console.log(`Mod: ${APPLY ? 'UYGULA (APPLY=1)' : 'DRY-RUN (yalnız rapor)'}`);
  console.log(`Toplam doküman: ${all.length} | Benzersiz anahtar: ${Object.keys(groups).length}`);
  console.log('───────────────────────────────────────────────────');

  const backupOps = [];
  let dupGroups = 0;
  let toDelete = 0;

  for (const [k, docs] of Object.entries(groups)) {
    if (docs.length <= 1) continue;
    dupGroups++;
    // En çok slot'lu tut; eşitlikte _docId'li olanı tut (yazma yolu tutarlılığı)
    docs.sort((a, b) => {
      const d = slotCount(b) - slotCount(a);
      if (d !== 0) return d;
      return (b._docId ? 1 : 0) - (a._docId ? 1 : 0);
    });
    const keep = docs[0];
    const drop = docs.slice(1);
    console.log(
      `  ${k}  → ${docs.length} kopya | TUT: ${keep._docId || keep._id} (${slotCount(keep)} slot)`
    );
    for (const d of drop) {
      console.log(`        SİL: ${d._docId || d._id} (${slotCount(d)} slot)`);
      toDelete++;
      if (APPLY) {
        backupOps.push({ doc: d, at: new Date() });
        const filter = d._docId ? { _docId: d._docId } : { _id: d._id };
        // Aynı _docId'ye sahip birden çok kayıt olabileceğinden _id ile hedefle
        await db.collection(COLL).deleteOne(d._id ? { _id: d._id } : filter);
      }
    }
  }

  if (APPLY && backupOps.length) {
    await db.collection(BACKUP).insertMany(backupOps);
  }

  console.log('───────────────────────────────────────────────────');
  console.log(`Yinelenen grup: ${dupGroups} | ${APPLY ? 'Silinen' : 'Silinecek'}: ${toDelete}`);
  if (dupGroups === 0) {
    console.log('✓ Yinelenen yok — course_schedules temiz, yapılacak bir şey yok.');
  } else if (APPLY) {
    console.log(`✓ Uygulandı. Backup: ${backupOps.length} (${BACKUP}).`);
    console.log('  Geri almak için:  UNDO=1 node server/dedupe-course-schedules.js');
  } else {
    console.log('DRY-RUN bitti. Uygulamak için: APPLY=1 node server/dedupe-course-schedules.js');
  }

  await disconnect();
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
