// ══════════════════════════════════════════════════════════════
// Tanı (read-only): akademisyen_cache koleksiyonunda
//   ad/email/department ile arama. Aynı kişinin başka bir
//   departmentId ile kayıtlı olup olmadığını görmek için.
//
// Çalıştırma:
//   node server/inspect-akademisyen-cache.js                       (tüm kayıtlar)
//   QUERY="oznur,mehmet akif,bilgisayar mühendisliği" node ...     (filtre)
// ══════════════════════════════════════════════════════════════
const { disconnect, getDbSafe } = require('./config/database');

const QUERY = (process.env.QUERY || '')
  .split(',')
  .map((s) => s.trim().toLocaleLowerCase('tr'))
  .filter(Boolean);

const norm = (s) => (s || '').toString().toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();

function matches(doc) {
  if (QUERY.length === 0) return true;
  const hay = [
    doc._docId,
    doc.data && doc.data.fullName,
    doc.data && doc.data.email,
    doc.data && doc.data.department,
    doc.departmentId,
  ]
    .filter(Boolean)
    .map(norm)
    .join(' | ');
  return QUERY.some((q) => hay.indexOf(q) >= 0);
}

(async () => {
  const db = await getDbSafe();
  const all = await db.collection('akademisyen_cache').find({}).toArray();
  const hits = all.filter(matches);
  console.log(`\nToplam: ${all.length} kayıt · eşleşme: ${hits.length}\n`);

  // departmentId'ye göre grupla
  const byDept = new Map();
  for (const d of hits) {
    const k = d.departmentId || '(boş)';
    if (!byDept.has(k)) byDept.set(k, []);
    byDept.get(k).push(d);
  }

  for (const [dept, arr] of [...byDept.entries()].sort()) {
    console.log(`══ departmentId="${dept}"  (${arr.length} kayıt) ══`);
    arr.forEach((d) => {
      const fn = (d.data && d.data.fullName) || '(boş)';
      const dn = (d.data && d.data.department) || '—';
      const em = (d.data && d.data.email) || '—';
      const id = d._docId || (d._id && d._id.toString()) || '(idsiz)';
      console.log(`  _docId="${id}"  "${fn}"`);
      console.log(`    email=${em}   data.department="${dn}"`);
    });
    console.log('');
  }

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
