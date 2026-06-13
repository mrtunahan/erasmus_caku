/**
 * Tek seferlik temizleme: departments koleksiyonundaki AYNI bölümün
 * birden fazla kaydını tek bir kanonik kayda indirir. KULLANICI VERİSİ
 * SİLİNMEZ — yalnızca duplicate bölüm kayıtları kaldırılır.
 *
 * Mantık:
 *  - Bölümler `name` alanı normalize edilerek (lower-case, trim, çoklu
 *    boşluk tekleme) gruplandırılır.
 *  - Her grupta kanonik kayıt: `_docId` alanı stabil olan (örn. 'bilgisayar')
 *    + facultyId dolu olan tercih edilir; yoksa en eskisi.
 *  - Diğerleri silinir.
 *  - DRY_RUN=1 ile çalıştırırsan yalnızca rapor verir, hiçbir şeyi silmez.
 *
 * Kullanım (sunucuda):
 *   DRY_RUN=1 node server/dedupe-departments.js   # önce kuru tur
 *   node server/dedupe-departments.js             # gerçek silme
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const col = db.collection('departments');
  const dry = process.env.DRY_RUN === '1';

  const all = await col.find({}).toArray();
  console.log(`Toplam departments kaydı: ${all.length}`);

  const norm = (s) => (s || '').toString().trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');

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
  console.log(`Tekrarlı bölüm sayısı: ${dupGroups.length}`);

  // Stabil ID listesi: migration scriptindeki id'ler (kanonik tercih)
  const KNOWN_IDS = new Set(['bilgisayar', 'elektrik', 'makine', 'insaat', 'gida', 'kimya']);

  let deletedCount = 0;
  for (const [k, list] of dupGroups) {
    // Skor: _docId stabil + facultyId dolu = tercih
    const scored = list.map((d) => ({
      d,
      score: (KNOWN_IDS.has(d._docId) ? 100 : 0) + (d.facultyId ? 10 : 0) + (d._docId ? 1 : 0),
    }));
    scored.sort((a, b) => b.score - a.score);
    const keeper = scored[0].d;
    const toRemove = scored.slice(1).map((s) => s.d);
    console.log(
      `  • "${list[0].name}" × ${list.length} → tutulan: _id=${String(keeper._id)} (_docId=${keeper._docId || '-'}, facultyId=${keeper.facultyId || '-'})`
    );
    for (const r of toRemove) {
      console.log(`      siliniyor: _id=${String(r._id)} (_docId=${r._docId || '-'})`);
      if (!dry) {
        await col.deleteOne({ _id: r._id });
        deletedCount++;
      }
    }
  }

  if (dry)
    console.log(
      `\n[DRY RUN] ${deletedCount === 0 ? 'silme yapılmadı' : ''} — gerçek silme için DRY_RUN olmadan tekrar çalıştır.`
    );
  else console.log(`\n✓ Tamamlandı. Silinen duplicate kayıt: ${deletedCount}`);
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
