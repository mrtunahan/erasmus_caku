// ══════════════════════════════════════════════════════════════
// YETİM course_schedules DÜZELTME — taşı (dolu) / sil (boş)
//
// Silinmiş bir bölüm kimliği (FROM) altında mahsur kalmış ders programı
// dokümanlarını kanonik bölüme (TO) taşır. course_schedules docId'si
// departmentId'yi KODLADIĞI için alan güncellemesi yetmez — hedef docId
// (TO_sem_yil[_seviye]) altına taşınması gerekir.
//
// Kurallar:
//   • Yetim dokümanın slot'u BOŞ → SİL (kaybedecek bir şey yok).
//   • Dolu + hedef docId YOK → hedefi OLUŞTUR, yetimi sil (TAŞI).
//   • Dolu + hedef VAR ama BOŞ → hedefin slot'larını yaz, yetimi sil (TAŞI).
//   • Dolu + hedef VAR ve DOLU → ÇAKIŞMA: dokunma, raporla (veri ezilmez).
//
// GÜVENLİK: varsayılan DRY-RUN. APPLY=1 uygular + her işlemi
// `_orphan_sched_backup`'a yazar. UNDO=1 geri alır.
//
// Kullanım (sunucuda):
//   FROM=7gwPii8UmYine5QgnD8M TO=bilgisayar node server/fix-orphan-schedules.js
//   FROM=... TO=... APPLY=1 node server/fix-orphan-schedules.js
//   UNDO=1 node server/fix-orphan-schedules.js
// ══════════════════════════════════════════════════════════════

const { getDbSafe, disconnect } = require('./config/database');

const FROM = process.env.FROM || '';
const TO = process.env.TO || '';
const APPLY = process.env.APPLY === '1';
const UNDO = process.env.UNDO === '1';
const COLL = 'course_schedules';
const BACKUP = '_orphan_sched_backup';

const slotCount = (doc) => Object.keys((doc && doc.slots) || {}).length;

async function runUndo(db) {
  const backups = await db.collection(BACKUP).find({}).toArray();
  if (!backups.length) {
    console.log('Backup boş — geri alınacak işlem yok.');
    return;
  }
  console.log(`${backups.length} işlem geri alınıyor...`);
  let ok = 0;
  for (const b of backups) {
    try {
      const col = db.collection(COLL);
      if (b.action === 'delete') {
        // Silineni geri ekle (varsa dokunma)
        const exists = await col.findOne({ _docId: b.doc._docId });
        if (!exists) await col.insertOne(b.doc);
        ok++;
      } else if (b.action === 'create') {
        // Oluşturulanı sil
        await col.deleteOne({ _docId: b.targetDocId });
        ok++;
      } else if (b.action === 'overwrite') {
        // Hedefi eski haline döndür
        await col.replaceOne({ _docId: b.targetDocId }, b.targetBefore);
        ok++;
      }
    } catch (e) {
      console.error(`  Geri alma hatası (${b.action}): ${e.message}`);
    }
  }
  console.log(`${ok}/${backups.length} işlem geri alındı.`);
  if (ok === backups.length) {
    await db.collection(BACKUP).deleteMany({});
    console.log('Backup temizlendi.');
  } else {
    console.log('Bazı işlemler geri alınamadı — backup KORUNDU.');
  }
}

(async () => {
  const db = await getDbSafe();

  if (UNDO) {
    await runUndo(db);
    await disconnect();
    return;
  }

  if (!FROM || !TO) {
    console.error('FROM ve TO gerekli. Örn:');
    console.error('  FROM=7gwPii8UmYine5QgnD8M TO=bilgisayar node server/fix-orphan-schedules.js');
    await disconnect();
    process.exit(1);
  }

  const all = await db.collection(COLL).find({}).toArray();
  // Yetim: docId FROM_ ile başlıyor VEYA departmentId === FROM
  const orphans = all.filter((d) => {
    const id = String(d._docId || d._id || '');
    return id.startsWith(FROM + '_') || String(d.departmentId || '') === FROM;
  });

  console.log('═══════════════════════════════════════════════════');
  console.log(`Mod: ${APPLY ? 'UYGULA (APPLY=1)' : 'DRY-RUN (yalnız rapor)'}`);
  console.log(`FROM=${FROM}  →  TO=${TO}`);
  console.log(`Eşleşen yetim doküman: ${orphans.length}`);
  console.log('───────────────────────────────────────────────────');

  const backupOps = [];
  let moved = 0;
  let deleted = 0;
  let conflict = 0;

  for (const doc of orphans) {
    const id = String(doc._docId || doc._id || '');
    const suffix = id.startsWith(FROM + '_') ? id.slice(FROM.length + 1) : '';
    const targetDocId = suffix ? `${TO}_${suffix}` : null;
    const n = slotCount(doc);

    if (n === 0) {
      // BOŞ → sil
      console.log(`  SİL   ${id}  (boş)`);
      deleted++;
      if (APPLY) {
        backupOps.push({ action: 'delete', doc, at: new Date() });
        await db.collection(COLL).deleteOne({ _docId: doc._docId });
      }
      continue;
    }

    if (!targetDocId) {
      console.log(`  ATLA  ${id}  (docId çözümlenemedi, ${n} slot)`);
      continue;
    }

    const target = await db.collection(COLL).findOne({ _docId: targetDocId });
    const parts = suffix.split('_');
    const newFields = {
      departmentId: TO,
      semester: doc.semester || parts[0] || '',
      year: doc.year || parts[1] || '',
      seviye: doc.seviye || (parts.length >= 3 ? parts[2] : 'lisans'),
      slots: doc.slots || {},
      updatedAt: new Date(),
    };

    if (target && slotCount(target) > 0) {
      console.log(
        `  ÇAKIŞMA ${id} (${n} slot) → ${targetDocId} zaten DOLU (${slotCount(target)} slot). Dokunulmadı.`
      );
      conflict++;
      continue;
    }

    if (!target) {
      console.log(`  TAŞI  ${id} (${n} slot) → ${targetDocId} (yeni oluştur)`);
      moved++;
      if (APPLY) {
        const newDoc = { _docId: targetDocId, ...newFields, createdAt: new Date() };
        backupOps.push({ action: 'create', targetDocId, at: new Date() });
        await db.collection(COLL).insertOne(newDoc);
        backupOps.push({ action: 'delete', doc, at: new Date() });
        await db.collection(COLL).deleteOne({ _docId: doc._docId });
      }
    } else {
      // hedef var ama boş → slot'ları yaz
      console.log(`  TAŞI  ${id} (${n} slot) → ${targetDocId} (boş hedefe yaz)`);
      moved++;
      if (APPLY) {
        backupOps.push({ action: 'overwrite', targetDocId, targetBefore: target, at: new Date() });
        await db
          .collection(COLL)
          .replaceOne({ _docId: targetDocId }, { _docId: targetDocId, ...target, ...newFields });
        backupOps.push({ action: 'delete', doc, at: new Date() });
        await db.collection(COLL).deleteOne({ _docId: doc._docId });
      }
    }
  }

  if (APPLY && backupOps.length) {
    await db.collection(BACKUP).insertMany(backupOps);
  }

  console.log('───────────────────────────────────────────────────');
  console.log(`Taşınan: ${moved} | Silinen(boş): ${deleted} | Çakışma(atlandı): ${conflict}`);
  if (APPLY) {
    console.log(`✓ Uygulandı. Backup: ${backupOps.length} işlem (${BACKUP}).`);
    console.log('  Geri almak için:  UNDO=1 node server/fix-orphan-schedules.js');
  } else {
    console.log('DRY-RUN bitti — hiçbir şey yazılmadı.');
    console.log(
      `  Uygulamak için:  FROM=${FROM} TO=${TO} APPLY=1 node server/fix-orphan-schedules.js`
    );
  }

  await disconnect();
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
