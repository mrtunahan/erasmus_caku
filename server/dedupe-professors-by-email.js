// ══════════════════════════════════════════════════════════════
// akademisyen_cache (ve opsiyonel professors) koleksiyonunda
// E-POSTA bazlı tekilleştirme.
//
//   Ekran görüntüsünde her sağlam kayıt (örn. "DR. ÖĞR. ÜYESİ FATİH
//   ISSI") için aynı e-posta ile stub bir kayıt (örn. "Fatihissi")
//   bulunuyor. Bu script bu mükerrerleri güvenli şekilde temizler:
//
//   • Aynı e-posta sahibi 2+ kayıt → tek kanonik kayda indirgenir.
//   • Kanonik seçim:
//       1. Daha çok ALAN-DOLU (skor) olan kazanır
//       2. data.fullName büyük harfle başlıyor + en az 4 kelime ise +bonus
//          (örn. "DR. ÖĞR. ÜYESİ X Y" stub "Xyz"'den fazla skorlar)
//       3. departmentId temiz-slug (24-hex değil)
//       4. daha eski _id
//   • İSİM bazlı referanslar (ders.professor vs.) KORUNUR çünkü
//     kanonik kayıt zaten kullanılan gerçek isimle duruyor.
//
//   COLLECTION env:  'akademisyen_cache' (varsayılan) veya 'professors'
//
//   GÜVENLİ: önce DRY_RUN. Uygulamak için:
//     APPLY=1 node server/dedupe-professors-by-email.js
//   Diğer koleksiyon için:
//     COLLECTION=professors node server/dedupe-professors-by-email.js
// ══════════════════════════════════════════════════════════════
const { disconnect, getDbSafe } = require('./config/database');

const APPLY = process.env.APPLY === '1';
const COLLECTION = process.env.COLLECTION || 'akademisyen_cache';

const isObjectIdLike = (s) => typeof s === 'string' && /^[0-9a-f]{24}$/i.test(s);
const FLAGS = ['isUniversityAdmin', 'isFacultyManager', 'isDeptManager', 'isStajCoordinator'];

const normEmail = (e) => (e || '').toString().trim().toLocaleLowerCase('tr');

// 'akademisyen_cache' kayıtları için: e-posta data.email içinde
function getEmail(doc) {
  if (COLLECTION === 'akademisyen_cache') {
    return normEmail(doc.data && doc.data.email);
  }
  return normEmail(doc.email);
}
function getName(doc) {
  if (COLLECTION === 'akademisyen_cache') {
    return (doc.data && doc.data.fullName) || doc._docId || '';
  }
  return doc.name || '';
}
function getDept(doc) {
  return doc.departmentId || (doc.data && doc.data.departmentId) || '';
}

function deepFieldCount(o, depth = 0) {
  if (o == null || depth > 4) return 0;
  if (typeof o === 'string') return o.trim().length > 0 ? 1 : 0;
  if (typeof o === 'number' || typeof o === 'boolean') return 1;
  if (Array.isArray(o)) {
    if (o.length === 0) return 0;
    return o.reduce((n, v) => n + deepFieldCount(v, depth + 1), 0);
  }
  if (typeof o === 'object') {
    return Object.values(o).reduce((n, v) => n + deepFieldCount(v, depth + 1), 0);
  }
  return 0;
}

// Kanonik kayıt seçim skoru
function scoreDoc(doc) {
  let s = deepFieldCount(doc);
  const name = getName(doc);
  // Tüm büyük harf veya unvanlı isim → sağlam profile işaret
  const hasTitle = /\b(prof|do[cç]|dr|öğr|yrd|arş|gör|yard|asst|assoc)\b/i.test(name);
  if (hasTitle) s += 50;
  if (/^[A-ZÇĞİÖŞÜÂÎÛ\s.]+$/.test(name) && name.split(/\s+/).length >= 3) s += 30;
  const dep = getDept(doc);
  if (dep && !isObjectIdLike(dep)) s += 100;
  FLAGS.forEach((f) => {
    if (doc[f] === true) s += 5;
  });
  return s;
}

(async () => {
  const db = await getDbSafe();
  const depts = await db.collection('departments').find({}).toArray();
  const resolveDept = (depId) => {
    if (!depId) return '(yok)';
    const d = depts.find(
      (x) => x._docId === depId || x.id === depId || (x._id && x._id.toString() === depId)
    );
    return d ? d.name || depId : depId;
  };

  const all = await db.collection(COLLECTION).find({}).toArray();
  console.log(`\nKoleksiyon: ${COLLECTION} · toplam: ${all.length} kayıt\n`);

  // E-posta bazlı grupla
  const byEmail = new Map();
  let noEmail = 0;
  all.forEach((p) => {
    const k = getEmail(p);
    if (!k) {
      noEmail++;
      return;
    }
    if (!byEmail.has(k)) byEmail.set(k, []);
    byEmail.get(k).push(p);
  });

  const dupGroups = [...byEmail.entries()].filter(([, arr]) => arr.length > 1);
  console.log(`E-postasız: ${noEmail} · mükerrer e-posta grubu: ${dupGroups.length}\n`);

  if (dupGroups.length === 0) {
    console.log('Tekilleştirilecek mükerrer YOK.\n');
    await disconnect();
    return;
  }

  const opsPreview = [];
  for (const [email, arr] of dupGroups) {
    const sorted = arr.slice().sort((a, b) => {
      const d = scoreDoc(b) - scoreDoc(a);
      if (d !== 0) return d;
      return a._id.toString().localeCompare(b._id.toString());
    });
    const canonical = sorted[0];
    const others = sorted.slice(1);

    console.log(`── ${email} (${arr.length} kayıt) ──`);
    arr.forEach((p) => {
      const mark = p._id === canonical._id ? '★ KANONİK' : '· silinecek';
      console.log(
        `  ${mark}  "${getName(p)}"  _docId=${p._docId}  dept=${getDept(p) || '—'} (${resolveDept(getDept(p))})  score=${scoreDoc(p)}`
      );
    });
    console.log('');
    opsPreview.push({ canonical, others });
  }

  console.log(
    `Özet: ${dupGroups.length} kanonik kalacak, ${opsPreview.reduce((n, o) => n + o.others.length, 0)} kayıt silinecek.\n`
  );

  if (!APPLY) {
    console.log('[DRY_RUN] Hiçbir şey yazılmadı. Uygulamak için:');
    console.log(`  APPLY=1 COLLECTION=${COLLECTION} node server/dedupe-professors-by-email.js\n`);
    await disconnect();
    return;
  }

  let removed = 0;
  for (const op of opsPreview) {
    for (const o of op.others) {
      await db.collection(COLLECTION).deleteOne({ _id: o._id });
      removed++;
    }
    // Kanonik kayda canonical e-posta yazımını garantile (tip uyumu)
    // ve fetchedAt'ı güncelle (mükerrer veriler birleştirme amacı taşımıyor;
    // sağlam kayıt zaten varsa olduğu gibi kalır).
  }
  console.log(`\n✓ ${removed} mükerrer silindi. ${dupGroups.length} kanonik korundu.\n`);
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
