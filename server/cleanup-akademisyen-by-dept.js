// ══════════════════════════════════════════════════════════════
// Bir bölümün akademisyen kartlarını "doğru bölüm adı" filtresine göre
// temizle + aynı _docId'ye sahip "yeni ÇAKUAVİS" kaydını korumak için
// departmentId'sini otomatik ata.
//
// KULLANIM:
//   DEPARTMENT_ID=bilgisayar \
//   KEEP_DEPT_NAME="Bilgisayar Mühendisliği Bölümü" \
//   EXTRA_DELETE="osmanguler,sbuyrukoglu" \
//     node server/cleanup-akademisyen-by-dept.js
//
//   Önce DRY_RUN; uygulamak için: APPLY=1
//
// MANTIK:
//   1. Aynı _docId'ye sahip BİRDEN FAZLA belge varsa:
//      • data.department === KEEP_DEPT_NAME olan KANONİK → tutulur,
//        departmentId DEPT olarak güncellenir.
//      • diğerleri silinir.
//      Yoksa skor (alan-doluluk) ile karar verilir.
//   2. Tekil belge ve departmentId === DEPT ise:
//      • data.department === KEEP_DEPT_NAME ise korunur.
//      • değilse silinir.
//   3. EXTRA_DELETE listesindeki _docId'lerin TÜM kopyaları silinir.
//   4. Diğer kayıtlara (başka departmentId) dokunulmaz.
//
// NOT: Sadece akademisyen_cache koleksiyonunu etkiler. professors
//   koleksiyonu (giriş ve kimlik) korunur.
// ══════════════════════════════════════════════════════════════
const { disconnect, getDbSafe } = require('./config/database');

const APPLY = process.env.APPLY === '1';
const DEPT = process.env.DEPARTMENT_ID || '';
const KEEP = (process.env.KEEP_DEPT_NAME || '').trim();
const EXTRA = (process.env.EXTRA_DELETE || '')
  .split(',')
  .map((s) => s.trim().toLocaleLowerCase('tr'))
  .filter(Boolean);

if (!DEPT) {
  console.error('DEPARTMENT_ID env zorunlu (örn. DEPARTMENT_ID=bilgisayar).');
  process.exit(1);
}

const norm = (s) => (s || '').toString().toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
const safeId = (d) => (d._docId ? String(d._docId) : d._id ? String(d._id) : '(idsiz)');
const pad = (s, n) => String(s == null ? '' : s).padEnd(n);
const fieldScore = (d) =>
  Object.entries(d).reduce((n, [k, v]) => {
    if (k === '_id') return n;
    if (v === '' || v == null) return n;
    if (Array.isArray(v) && v.length === 0) return n;
    return n + 1;
  }, 0);

(async () => {
  const db = await getDbSafe();
  const all = await db.collection('akademisyen_cache').find({}).toArray();
  // _docId'ye göre grupla
  const byDocId = new Map();
  for (const d of all) {
    const k = safeId(d).toLocaleLowerCase('tr');
    if (!byDocId.has(k)) byDocId.set(k, []);
    byDocId.get(k).push(d);
  }

  // İlgili _docId'ler: departmentId=DEPT altında VEYA mükerrer _docId VEYA EXTRA_DELETE'te.
  const relatedIds = new Set();
  for (const [id, arr] of byDocId.entries()) {
    if (arr.some((d) => d.departmentId === DEPT)) relatedIds.add(id);
    if (arr.length > 1) relatedIds.add(id);
  }
  EXTRA.forEach((u) => relatedIds.add(u));

  console.log(`\nDepartmentId="${DEPT}" için ilgili ${relatedIds.size} _docId taranıyor.`);
  if (KEEP) console.log(`Korunacak bölüm adı: "${KEEP}"`);
  if (EXTRA.length) console.log(`Extra silinecek: ${EXTRA.join(', ')}`);
  console.log('');

  const keepNorm = norm(KEEP);
  // Üç eylem listesi: KEEP+REASSIGN (departmentId=DEPT yap), KEEP_ASIS, DELETE
  const reassign = []; // { doc, fromDept, toDept }
  const keepAsIs = []; // doc
  const toDelete = []; // { doc, reason }

  for (const id of relatedIds) {
    const arr = (byDocId.get(id) || []).slice();
    const inExtra = EXTRA.includes(id);
    if (inExtra) {
      arr.forEach((d) => toDelete.push({ doc: d, reason: 'EXTRA_DELETE listesinde (' + id + ')' }));
      continue;
    }

    // Kanonik seç: KEEP_DEPT_NAME eşleşeni; yoksa en yüksek skorlu
    let canonical = null;
    if (KEEP) {
      canonical = arr.find((d) => norm(d.data && d.data.department) === keepNorm) || null;
    }
    if (!canonical) {
      canonical = arr.slice().sort((a, b) => fieldScore(b) - fieldScore(a))[0];
    }

    // Kanonik dışındakileri sil; kanonik departmentId yanlışsa düzelt
    for (const d of arr) {
      if (d._id.toString() === canonical._id.toString()) {
        if (d.departmentId !== DEPT) {
          reassign.push({ doc: d, fromDept: d.departmentId || '(boş)', toDept: DEPT });
        } else {
          keepAsIs.push(d);
        }
      } else {
        const reason =
          d.data && d.data.department
            ? 'mükerrer (data.department="' + (d.data && d.data.department) + '" ≠ "' + KEEP + '")'
            : 'mükerrer (boş data)';
        toDelete.push({ doc: d, reason });
      }
    }
  }

  console.log(`★ Korunacak (mevcut hâliyle): ${keepAsIs.length}`);
  keepAsIs.forEach((d) =>
    console.log(
      `   ✓ ${pad(safeId(d), 28)}  "${(d.data && d.data.fullName) || ''}"  [${(d.data && d.data.department) || '—'}]`
    )
  );

  console.log(`\n⇆ departmentId atanacak (KEEP → ${DEPT}): ${reassign.length}`);
  reassign.forEach((r) =>
    console.log(
      `   ↻ ${pad(safeId(r.doc), 28)}  "${(r.doc.data && r.doc.data.fullName) || ''}"  ` +
        `[${(r.doc.data && r.doc.data.department) || '—'}]  ` +
        `departmentId: ${r.fromDept} → ${r.toDept}`
    )
  );

  console.log(`\n× Silinecek: ${toDelete.length}`);
  toDelete.forEach((x) =>
    console.log(
      `   ✕ ${pad(safeId(x.doc), 28)}  "${(x.doc.data && x.doc.data.fullName) || ''}"  ` +
        `dept=${x.doc.departmentId || '—'}  → ${x.reason}`
    )
  );

  if (!APPLY) {
    console.log('\n[DRY_RUN] Hiçbir şey değişmedi. Uygulamak için: APPLY=1\n');
    await disconnect();
    return;
  }

  let assigned = 0;
  for (const r of reassign) {
    await db
      .collection('akademisyen_cache')
      .updateOne({ _id: r.doc._id }, { $set: { departmentId: r.toDept } });
    assigned++;
  }
  let removed = 0;
  for (const x of toDelete) {
    await db.collection('akademisyen_cache').deleteOne({ _id: x.doc._id });
    removed++;
  }
  console.log(`\n✓ ${assigned} kayda departmentId="${DEPT}" atandı, ${removed} kayıt silindi.`);
  console.log('  (professors koleksiyonuna dokunulmadı.)\n');
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
