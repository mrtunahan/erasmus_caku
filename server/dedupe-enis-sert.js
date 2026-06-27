// ══════════════════════════════════════════════════════════════
// "Dr. Öğr. Üyesi Enis SERT" mükerrer professors kaydını tekilleştir
//   • Aynı ada sahip 2 kayıt tek kanonik kayda indirgenir.
//   • Referanslar İSİM bazlı olduğundan (courses.professor,
//     commissions.members[].name, kulüp danışmanı vb.) ad değişmediği
//     için referanslar KORUNUR — yeniden işaretlemeye gerek yoktur.
//   • Kanonik kayıt: departmentId'si TEMİZ slug olan (24-hex ObjectId
//     olmayan) tercih edilir; eşitlikte en çok alanı dolu / en eski.
//   • Mükerrer kaydın bölümü kanonikten FARKLI bir bölüme işaret
//     ediyorsa, çapraz-bölüm erişimi kaybolmasın diye canonical'ın
//     additionalDepartments dizisine eklenir.
//   • Bayraklar (isDeptManager vb.) birleştirilir (OR).
//
//   GÜVENLİ: önce DRY_RUN. Uygulamak için:  APPLY=1 node server/dedupe-enis-sert.js
// ══════════════════════════════════════════════════════════════
const { disconnect, getDbSafe } = require('./config/database');

const APPLY = process.env.APPLY === '1';
const TARGET_NAME = process.env.TARGET_NAME || 'Enis SERT';

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
const norm = (s) =>
  stripTitle(s).toLocaleLowerCase('tr').replace(/\./g, '').replace(/\s+/g, ' ').trim();

const isObjectIdLike = (s) => typeof s === 'string' && /^[0-9a-f]{24}$/i.test(s);
const FLAGS = ['isUniversityAdmin', 'isFacultyManager', 'isDeptManager', 'isStajCoordinator'];

const BOOL = (v) => v === true;
const fieldScore = (p) =>
  Object.values(p).filter((v) => v !== '' && v != null && !(Array.isArray(v) && v.length === 0))
    .length;

(async () => {
  const db = await getDbSafe();

  // Bölüm çözümleyici: depId (slug / _docId / ObjectId) → { id, name }
  const depts = await db.collection('departments').find({}).toArray();
  const resolveDept = (depId) => {
    if (!depId) return null;
    const d = depts.find(
      (x) => x._docId === depId || x.id === depId || (x._id && x._id.toString() === depId)
    );
    if (!d) return { id: depId, name: '(bilinmeyen bölüm)' };
    return { id: d._docId || d.id || (d._id && d._id.toString()), name: d.name || depId };
  };

  const all = await db.collection('professors').find({}).toArray();
  const dupes = all.filter((p) => norm(p.name) === norm(TARGET_NAME));

  console.log(`\n"${TARGET_NAME}" için ${dupes.length} kayıt bulundu:\n`);
  dupes.forEach((p) => {
    const dep = resolveDept(p.departmentId);
    console.log(
      `  _id=${p._id}  dept=${p.departmentId} (${dep ? dep.name : '—'})  ` +
        `flags=[${FLAGS.filter((f) => BOOL(p[f])).join(',') || '-'}]  alanlar=${fieldScore(p)}`
    );
  });

  if (dupes.length < 2) {
    console.log('\nTekilleştirilecek mükerrer yok. Çıkılıyor.\n');
    await disconnect();
    return;
  }

  // Kanonik seç: temiz-slug dept > daha çok dolu alan > daha eski (_id)
  const score = (p) => {
    let s = 0;
    if (p.departmentId && !isObjectIdLike(p.departmentId)) s += 1000; // temiz slug
    s += fieldScore(p);
    return s;
  };
  const sorted = dupes.slice().sort((a, b) => {
    const d = score(b) - score(a);
    if (d !== 0) return d;
    return a._id.toString().localeCompare(b._id.toString());
  });
  const canonical = sorted[0];
  const others = sorted.slice(1);

  // Birleştir
  const merged = { ...canonical };
  const extraDepts = new Set(
    Array.isArray(canonical.additionalDepartments) ? canonical.additionalDepartments : []
  );
  const canonicalDept = resolveDept(canonical.departmentId);

  others.forEach((p) => {
    // Bayrakları OR'la
    FLAGS.forEach((f) => {
      if (BOOL(p[f])) merged[f] = true;
    });
    // Boş alanları mükerrerden doldur
    Object.keys(p).forEach((k) => {
      if (k === '_id') return;
      const cur = merged[k];
      const empty = cur === '' || cur == null || (Array.isArray(cur) && cur.length === 0);
      if (empty && p[k] !== '' && p[k] != null) merged[k] = p[k];
    });
    // Farklı bölüme işaret ediyorsa additionalDepartments'a ekle
    const od = resolveDept(p.departmentId);
    if (
      od &&
      od.id &&
      canonicalDept &&
      norm(od.name) !== norm(canonicalDept.name) &&
      od.id !== canonical.departmentId
    ) {
      extraDepts.add(od.id);
      console.log(
        `\n  → Farklı bölüm tespit edildi ("${od.name}"). additionalDepartments'a eklenecek: ${od.id}`
      );
    }
    // mükerrerin kendi additionalDepartments'ı da korunur
    (Array.isArray(p.additionalDepartments) ? p.additionalDepartments : []).forEach((x) =>
      extraDepts.add(x)
    );
  });
  // canonical'ın kendi bölümünü ek listeden çıkar
  extraDepts.delete(canonical.departmentId);
  merged.additionalDepartments = Array.from(extraDepts);
  merged.updatedAt = new Date();
  delete merged._id;

  console.log(`\n── KANONİK kayıt (_id=${canonical._id}) güncellenecek ──`);
  console.log(
    JSON.stringify(
      {
        name: merged.name,
        departmentId: merged.departmentId,
        flags: FLAGS.filter((f) => merged[f]),
        additionalDepartments: merged.additionalDepartments,
      },
      null,
      2
    )
  );
  console.log(`\n── SİLİNECEK mükerrer kayıt(lar): ${others.map((o) => o._id).join(', ')}`);

  if (!APPLY) {
    console.log(
      '\n[DRY_RUN] Hiçbir şey yazılmadı. Uygulamak için: APPLY=1 node server/dedupe-enis-sert.js\n'
    );
    await disconnect();
    return;
  }

  await db.collection('professors').updateOne({ _id: canonical._id }, { $set: merged });
  console.log(`\n✓ Kanonik kayıt güncellendi (_id=${canonical._id}).`);
  for (const o of others) {
    await db.collection('professors').deleteOne({ _id: o._id });
    console.log(`✓ Mükerrer silindi (_id=${o._id}).`);
  }
  console.log('\nTamamlandı. (İsim bazlı referanslar korunur.)\n');
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
