// ══════════════════════════════════════════════════════════════
// departmentId KANONİKLEŞTİRME MİGRASYONU
//
// Sorun: Bölümler zamanla birden çok kimlik biçimiyle yaşıyor (id/_id/
// _docId/code). Kayıtlar (öğrenci, akademisyen, ders, proje, staj, performans
// vb.) departmentId'yi bu biçimlerden HERHANGİ biriyle saklamış olabilir.
// Uygulama ise KANONİK kimlikle filtreliyor → eski kimlikli kayıtlar
// "kayboluyor" ya da yanlış bölüme atfediliyor.
//
// Bu script her kaydın departmentId ALANINI kanonik kimliğe çevirir.
// Uygulamanın kanonik mantığı BİREBİR kopyalanır (aşağıya bak) — aksi halde
// kayıtlar yanlış id'ye taşınıp topluca kaybolabilirdi.
//
// GÜVENLİK:
//   • Varsayılan mod DRY-RUN — hiçbir şey yazılmaz, yalnız rapor.
//   • APPLY=1 → uygular. Her değişiklik önce `_deptid_migration_backup`
//     koleksiyonuna yazılır (geri alınabilir).
//   • UNDO=1  → backup'tan tüm değişiklikleri geri yükler.
//   • Yalnız departmentId ALANI değişir — docId/_id ASLA dokunulmaz.
//   • docId'si eski dept'i kodlayan dokümanlar (ör. course_schedules
//     `dept_sem_yil`) ATLANIR (aksi halde ileride yinelenen doküman oluşurdu;
//     bu koleksiyonlar zaten okuma tarafında deptIdVariants ile çözülüyor).
//   • Kanonik olmayana çözülemeyen (yetim) veya birden çok bölüme uyan
//     (belirsiz) değerler DEĞİŞTİRİLMEZ, raporlanır.
//   • Boş departmentId DOKUNULMAZ.
//
// Kullanım (sunucuda):
//   node server/migrate-departmentid-canonical.js          # DRY-RUN rapor
//   APPLY=1 node server/migrate-departmentid-canonical.js  # uygula
//   UNDO=1  node server/migrate-departmentid-canonical.js  # geri al
// ══════════════════════════════════════════════════════════════

const { getDbSafe, disconnect } = require('./config/database');

const APPLY = process.env.APPLY === '1';
const UNDO = process.env.UNDO === '1';
const BACKUP_COLL = '_deptid_migration_backup';

// ── Uygulamayla BİREBİR aynı: gömülü çekirdek bölümler (shared-components.jsx)
// Bunların id'si her zaman kanoniktir; DB'de aynı ADLA duran kayıtlar bu
// çekirdek id'ye çözülür (app-shell'deki ad-dedup davranışı).
const CORE_DEPTS = [
  { id: 'bilgisayar', name: 'Bilgisayar Mühendisliği' },
  { id: 'elektrik', name: 'Elektrik ve Elektronik Mühendisliği' },
  { id: 'makine', name: 'Makine Mühendisliği' },
  { id: 'insaat', name: 'İnşaat Mühendisliği' },
  { id: 'gida', name: 'Gıda Mühendisliği' },
  { id: 'kimya', name: 'Kimya Mühendisliği' },
];

// app-shell.jsx ile aynı normalize
const norm = (s) => (s || '').toString().toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();

// departmentId taşıyan veri koleksiyonları (audit_logs hariç — değişmez kayıt;
// course_schedules gibi docId-kodlu olanlar per-doc kontrolüyle atlanır).
const TARGET_COLLECTIONS = [
  'students',
  'professors',
  'sinav_dersler',
  'sinav_donemler',
  'department_classrooms',
  'course_schedules', // docId dept'i kodlar → dokümanları per-doc atlanır (güvenlik ağı)
  'exam_periods',
  'internships',
  'internship_applications',
  'internship_uploads',
  'internship_periods',
  'internship_roadmap',
  'internship_notifications',
  'projects',
  'project_courses',
  'unides_projects',
  'unides_courses',
  'tubitak2209_projects',
  'tubitak2209_courses',
  'forms',
  'resources',
  'events',
  'akademik_takvim',
  'commissions',
  'student_clubs',
  'club_documents',
  'muafiyet_records',
  'muafiyet_history',
  'surveys',
  'survey_assignments',
  'performance_data',
  'performance_indicators',
  'performance_targets',
  'performance_forms',
  'performance_reports',
  'strateji_izleme',
  'strateji_atama',
  'strateji_fac_ozet',
  'strateji_baglama',
  'trip_history',
  'document_templates',
];

// Bölümün kanonik kimliğini uygulamayla aynı kuralla belirle:
//   1) Adı bir çekirdek bölüme eşitse → çekirdek id (ör. 'bilgisayar')
//   2) Aksi halde → d.id || d._docId || d._id  (app-shell: id = d.id||d._docId)
function canonicalFor(deptRec) {
  const nkey = norm(deptRec.name);
  const core = CORE_DEPTS.find((c) => norm(c.name) === nkey);
  if (core) return core.id;
  return String(deptRec.id || deptRec._docId || deptRec._id || '');
}

async function buildVariantMap(db) {
  const depts = await db.collection('departments').find({}).toArray();
  const map = new Map(); // variant(string) -> canonical(string)
  const conflicts = new Map(); // variant -> Set(canonical) (belirsizler)
  const canonSet = new Set(); // geçerli kanonik değerler

  const addVariant = (variant, canon) => {
    if (!variant) return;
    const v = String(variant);
    if (!canon) return;
    if (map.has(v) && map.get(v) !== canon) {
      // Aynı varyant iki farklı kanoniğe → BELİRSİZ, dokunma
      const set = conflicts.get(v) || new Set([map.get(v)]);
      set.add(canon);
      conflicts.set(v, set);
    } else {
      map.set(v, canon);
    }
  };

  // Çekirdek bölümler: id ve ad kanoniğe map'lenir
  CORE_DEPTS.forEach((c) => {
    canonSet.add(c.id);
    addVariant(c.id, c.id);
  });

  // DB bölümleri
  depts.forEach((d) => {
    const canon = canonicalFor(d);
    if (!canon) return;
    canonSet.add(canon);
    [d.id, d._id, d._docId, d.code].forEach((k) => addVariant(k, canon));
  });

  // Belirsiz varyantları map'ten çıkar
  for (const v of conflicts.keys()) map.delete(v);

  return { map, conflicts, canonSet, deptCount: depts.length };
}

// docId eski dept'i kodluyor mu? (ör. "7gwPii_guz_2025") → atla
function docIdEncodesDept(doc, oldDept) {
  const ids = [doc._docId, doc._id].filter(Boolean).map(String);
  return ids.some((id) => id.startsWith(oldDept + '_'));
}

async function runUndo(db) {
  const backups = await db.collection(BACKUP_COLL).find({}).toArray();
  if (backups.length === 0) {
    console.log('Backup boş — geri alınacak değişiklik yok.');
    return;
  }
  console.log(`${backups.length} kayıt geri yükleniyor...`);
  let restored = 0;
  for (const b of backups) {
    try {
      const col = db.collection(b.collection);
      const filter = b.byDocId ? { _docId: b.docId } : { _id: b.docId };
      await col.updateOne(filter, { $set: { departmentId: b.oldValue } });
      restored++;
    } catch (e) {
      console.error(`  Geri yükleme hatası ${b.collection}/${b.docId}: ${e.message}`);
    }
  }
  console.log(`${restored}/${backups.length} kayıt eski departmentId değerine döndürüldü.`);
  if (restored === backups.length) {
    await db.collection(BACKUP_COLL).deleteMany({});
    console.log('Backup temizlendi.');
  } else {
    console.log('Bazı kayıtlar geri yüklenemedi — backup KORUNDU.');
  }
}

(async () => {
  const db = await getDbSafe();

  if (UNDO) {
    await runUndo(db);
    await disconnect();
    return;
  }

  const { map, conflicts, canonSet, deptCount } = await buildVariantMap(db);
  console.log('═══════════════════════════════════════════════════');
  console.log(`Mod: ${APPLY ? 'UYGULA (APPLY=1)' : 'DRY-RUN (yalnız rapor)'}`);
  console.log(
    `Bölüm kaydı: ${deptCount} | Kanonik kimlik: ${canonSet.size} | Varyant: ${map.size}`
  );
  if (conflicts.size > 0) {
    console.log(`⚠ Belirsiz varyant (dokunulmayacak): ${conflicts.size}`);
    for (const [v, set] of conflicts) console.log(`    "${v}" → ${[...set].join(' | ')}`);
  }
  console.log('───────────────────────────────────────────────────');

  const backupOps = [];
  const summary = [];
  let totalChange = 0;
  let totalOrphan = 0;
  let totalEncoded = 0;
  const orphanValues = new Map(); // value -> count

  for (const collName of TARGET_COLLECTIONS) {
    let docs;
    try {
      docs = await db
        .collection(collName)
        .find({ departmentId: { $exists: true } })
        .toArray();
    } catch (_) {
      continue; // koleksiyon yoksa geç
    }
    if (!docs.length) continue;

    let change = 0;
    let orphan = 0;
    let encoded = 0;
    let already = 0;
    const examples = [];

    for (const doc of docs) {
      const old = doc.departmentId;
      if (old === undefined || old === null || old === '') continue;
      const oldStr = String(old);

      // Zaten kanonik → dokunma
      if (canonSet.has(oldStr) && (!map.has(oldStr) || map.get(oldStr) === oldStr)) {
        already++;
        continue;
      }

      // Belirsiz → dokunma
      if (conflicts.has(oldStr)) continue;

      const canon = map.get(oldStr);
      if (!canon) {
        // Yetim: hiçbir bölüme çözülemiyor → dokunma, raporla
        orphan++;
        orphanValues.set(oldStr, (orphanValues.get(oldStr) || 0) + 1);
        continue;
      }
      if (canon === oldStr) {
        already++;
        continue;
      }

      // docId eski dept'i kodluyorsa atla (yinelenen doküman riski)
      if (docIdEncodesDept(doc, oldStr)) {
        encoded++;
        continue;
      }

      // Değişecek
      change++;
      if (examples.length < 3) examples.push(`${oldStr} → ${canon}`);

      if (APPLY) {
        const byDocId = doc._docId != null;
        backupOps.push({
          collection: collName,
          docId: byDocId ? doc._docId : doc._id,
          byDocId,
          field: 'departmentId',
          oldValue: old,
          newValue: canon,
          at: new Date(),
        });
        const filter = byDocId ? { _docId: doc._docId } : { _id: doc._id };
        await db.collection(collName).updateOne(filter, { $set: { departmentId: canon } });
      }
    }

    if (change || orphan || encoded) {
      summary.push({ collName, change, orphan, encoded, already, examples });
      totalChange += change;
      totalOrphan += orphan;
      totalEncoded += encoded;
    }
  }

  // Backup'ları tek seferde yaz (APPLY)
  if (APPLY && backupOps.length > 0) {
    for (let i = 0; i < backupOps.length; i += 200) {
      await db.collection(BACKUP_COLL).insertMany(backupOps.slice(i, i + 200));
    }
  }

  console.log('KOLEKSİYON BAZLI:');
  summary.forEach((s) => {
    console.log(
      `  ${s.collName.padEnd(26)} değiş:${String(s.change).padStart(4)}  ` +
        `yetim:${String(s.orphan).padStart(4)}  kodlu-atlandı:${String(s.encoded).padStart(3)}` +
        (s.examples.length ? `   ör: ${s.examples.join(', ')}` : '')
    );
  });
  console.log('───────────────────────────────────────────────────');
  console.log(`TOPLAM ${APPLY ? 'DEĞİŞTİRİLEN' : 'DEĞİŞECEK'}: ${totalChange}`);
  console.log(`TOPLAM yetim (dokunulmadı): ${totalOrphan}`);
  console.log(`TOPLAM docId-kodlu (atlandı): ${totalEncoded}`);
  if (orphanValues.size > 0) {
    console.log('Yetim departmentId değerleri (hiçbir bölüme çözülemedi):');
    for (const [v, c] of [...orphanValues.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    "${v}"  ×${c}`);
    }
  }

  if (APPLY) {
    console.log('───────────────────────────────────────────────────');
    console.log(`✓ Uygulandı. Backup: ${backupOps.length} kayıt (${BACKUP_COLL}).`);
    console.log('  Geri almak için:  UNDO=1 node server/migrate-departmentid-canonical.js');
  } else {
    console.log('───────────────────────────────────────────────────');
    console.log('DRY-RUN bitti — hiçbir şey yazılmadı.');
    console.log('  Uygulamak için:  APPLY=1 node server/migrate-departmentid-canonical.js');
  }

  await disconnect();
})().catch((e) => {
  console.error('Migrasyon hatası:', e);
  process.exit(1);
});
