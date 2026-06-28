// ══════════════════════════════════════════════════════════════
// Bir bölümün akademisyen kartlarını "doğru bölüm adı" filtresine
// göre temizle.
//
//   Örnek: Bilgisayar Mühendisliği'nde yalnızca
//     data.department === "Bilgisayar Mühendisliği Bölümü"
//   olan kayıtlar kalsın, geri kalan tüm eski kayıtlar (Bilgisayar
//   Yazılımı, Bilgisayar Donanımı, Yazılım Geliştirme Birimi, vb.)
//   silinsin:
//
//     DEPARTMENT_ID=bilgisayar \
//     KEEP_DEPT_NAME="Bilgisayar Mühendisliği Bölümü" \
//       node server/cleanup-akademisyen-by-dept.js
//
//   Belirli kullanıcıları da kesin sil (virgülle ayır):
//     EXTRA_DELETE="osmanguler,sbuyrukoglu" \
//     DEPARTMENT_ID=bilgisayar \
//     KEEP_DEPT_NAME="Bilgisayar Mühendisliği Bölümü" \
//       node server/cleanup-akademisyen-by-dept.js
//
//   Uygulamak için APPLY=1 ekleyin.
//
// NOT: Sadece akademisyen_cache koleksiyonunu temizler (modüldeki kart
//   listesi). professors koleksiyonundaki kayıtlara (giriş için kullanılan)
//   DOKUNMAZ — bu güvenli; akademisyen sadece liste kartından silinir.
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

(async () => {
  const db = await getDbSafe();
  const docs = await db.collection('akademisyen_cache').find({ departmentId: DEPT }).toArray();

  console.log(`\n${docs.length} kayıt bulundu (departmentId=${DEPT}).`);
  if (KEEP) console.log(`Korunacak bölüm adı:  "${KEEP}"`);
  if (EXTRA.length) console.log(`Extra silinecek username'ler: ${EXTRA.join(', ')}`);
  console.log('');

  // Bazı eski kayıtlarda _docId olmayabilir (sadece _id var) — güvenli ID al.
  const safeId = (d) => {
    if (d._docId) return String(d._docId);
    if (d._id) return String(d._id);
    return '(idsiz)';
  };
  const pad = (s, n) => String(s == null ? '' : s).padEnd(n);

  const keepNorm = norm(KEEP);
  const toKeep = [];
  const toDelete = [];
  for (const d of docs) {
    const usr = safeId(d).toLocaleLowerCase('tr');
    const depName = norm(d.data && d.data.department);
    const inExtra = EXTRA.includes(usr);
    let drop = false;
    let reason = '';
    if (inExtra) {
      drop = true;
      reason = 'EXTRA_DELETE listesinde';
    } else if (KEEP && depName !== keepNorm) {
      drop = true;
      reason = `data.department="${(d.data && d.data.department) || '(boş)'}" ≠ "${KEEP}"`;
    }
    if (drop) toDelete.push({ doc: d, reason });
    else toKeep.push(d);
  }

  console.log(`★ Korunacak: ${toKeep.length}`);
  toKeep.forEach((d) =>
    console.log(
      `   ✓ ${pad(safeId(d), 28)}  "${(d.data && d.data.fullName) || ''}"  [${(d.data && d.data.department) || '—'}]`
    )
  );
  console.log(`\n× Silinecek: ${toDelete.length}`);
  toDelete.forEach((x) =>
    console.log(
      `   ✕ ${pad(safeId(x.doc), 28)}  "${(x.doc.data && x.doc.data.fullName) || ''}"  → ${x.reason}`
    )
  );

  if (!APPLY) {
    console.log('\n[DRY_RUN] Hiçbir şey silinmedi. Uygulamak için: APPLY=1 ekleyin.\n');
    await disconnect();
    return;
  }

  let removed = 0;
  for (const x of toDelete) {
    await db.collection('akademisyen_cache').deleteOne({ _id: x.doc._id });
    removed++;
  }
  console.log(`\n✓ ${removed} kayıt akademisyen_cache koleksiyonundan silindi.`);
  console.log('  (professors koleksiyonuna dokunulmadı; giriş ve kimlik kayıtları korunur.)\n');
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
