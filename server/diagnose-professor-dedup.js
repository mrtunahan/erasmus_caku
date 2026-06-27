// ══════════════════════════════════════════════════════════════
// TANI (read-only): Akademisyen giriş listesi tekilleştirmesi
//   • Eski anahtar (ilk ad + BÜYÜK-HARF soyadı) ile YENİ anahtar
//     (unvanı soyulmuş tam ad) karşılaştırılır.
//   • Eski mantıkta GİZLENEN (farklı kişi olduğu halde aynı kovaya
//     düşüp elenen) akademisyenleri listeler.
//   • Yeni mantıkta hâlâ birleşen kayıtları (gerçek mükerrerler) gösterir.
//   • "korkmaz" / "tunahan" araması yapar.
//   Hiçbir veri DEĞİŞTİRİLMEZ.
//
//   Çalıştırma:  node server/diagnose-professor-dedup.js
// ══════════════════════════════════════════════════════════════
const { disconnect, getDbSafe } = require('./config/database');

const TITLES = [
  'Dr. Öğr. Üyesi',
  'Dr. Öğr. Gör.',
  'Öğr. Gör. Dr.',
  'Arş. Gör. Dr.',
  'Prof. Dr.',
  'Prof Dr.',
  'Doç. Dr.',
  'Öğr. Gör.',
  'Arş. Gör.',
  'Dr.',
];

function stripTitle(name) {
  let n = (name || '').trim();
  for (const t of TITLES) {
    if (n.startsWith(t)) {
      n = n.slice(t.length).trim();
      break;
    }
  }
  return n;
}

// Eski (hatalı) anahtar
function oldKey(name) {
  const bare = stripTitle(name);
  const parts = bare.split(/\s+/);
  const surnames = [];
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] === parts[i].toUpperCase() && parts[i].length > 1) surnames.unshift(parts[i]);
    else break;
  }
  const surname = surnames.join(' ');
  const firstName = parts.length > surnames.length ? parts[0].replace(/\./g, '').toUpperCase() : '';
  return (firstName + ' ' + surname).trim().toUpperCase();
}

// Yeni (düzeltilmiş) anahtar
function newKey(name) {
  return stripTitle(name).toLocaleLowerCase('tr').replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

function groupBy(list, keyFn) {
  const m = new Map();
  list.forEach((p) => {
    const k = keyFn(p.name);
    if (!k) return;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(p);
  });
  return m;
}

(async () => {
  const db = await getDbSafe();
  const profs = await db.collection('professors').find({}).toArray();
  console.log(`\nToplam professors kaydı: ${profs.length}\n`);

  // Eski mantıkta görünecek tekil sayısı vs yeni
  const oldGroups = groupBy(profs, oldKey);
  const newGroups = groupBy(profs, newKey);
  console.log(`Eski anahtarla görünen tekil akademisyen: ${oldGroups.size}`);
  console.log(`Yeni anahtarla görünen tekil akademisyen: ${newGroups.size}`);
  console.log(
    `→ Yeni mantık ${newGroups.size - oldGroups.size} DAHA FAZLA kişiyi gösteriyor (eskiden gizlenenler).\n`
  );

  // Eski mantıkta FARKLI kişilerin aynı kovaya düşüp gizlendiği durumlar
  console.log('───────────────────────────────────────────────');
  console.log('ESKİ mantıkta GİZLENEN (farklı tam ada sahip oldukları');
  console.log('halde aynı eski-anahtara düşen) akademisyenler:');
  console.log('───────────────────────────────────────────────');
  let hiddenCount = 0;
  [...oldGroups.entries()].forEach(([k, arr]) => {
    const distinctNames = new Set(arr.map((p) => newKey(p.name)));
    if (distinctNames.size > 1) {
      hiddenCount += distinctNames.size - 1;
      console.log(`\n  eski-anahtar "${k}" → ${distinctNames.size} farklı kişi:`);
      arr.forEach((p) => console.log(`     • ${p.name}  [${p.departmentId || '—'}]`));
    }
  });
  if (hiddenCount === 0) console.log('  (yok)');
  else console.log(`\n  TOPLAM eskiden gizlenen farklı kişi: ${hiddenCount}`);

  // Yeni mantıkta hâlâ birleşenler = gerçek mükerrer kayıtlar
  console.log('\n───────────────────────────────────────────────');
  console.log('YENİ mantıkta hâlâ birleşen kayıtlar (gerçek mükerrer');
  console.log('— aynı ad, muhtemelen farklı unvan/kayıt):');
  console.log('───────────────────────────────────────────────');
  let dupCount = 0;
  [...newGroups.entries()].forEach(([k, arr]) => {
    if (arr.length > 1) {
      dupCount++;
      console.log(`\n  "${k}" → ${arr.length} kayıt:`);
      arr.forEach((p) => console.log(`     • ${p.name}  [${p.departmentId || '—'}]  _id=${p._id}`));
    }
  });
  if (dupCount === 0) console.log('  (yok)');

  // Hedefli arama
  console.log('\n───────────────────────────────────────────────');
  console.log('ARAMA: "korkmaz" / "tunahan"');
  console.log('───────────────────────────────────────────────');
  const hits = profs.filter((p) => /korkmaz|tunahan/i.test(p.name || ''));
  if (hits.length === 0)
    console.log('  Eşleşen kayıt YOK — bu kişi professors koleksiyonunda değil.');
  hits.forEach((p) =>
    console.log(
      `  • "${p.name}"  dept=${p.departmentId || '—'}  fac=${p.facultyId || '—'}  ` +
        `eski="${oldKey(p.name)}"  yeni="${newKey(p.name)}"`
    )
  );

  console.log('\nTanı tamamlandı. (Hiçbir veri değiştirilmedi.)\n');
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
