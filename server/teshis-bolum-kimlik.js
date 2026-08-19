/**
 * SALT OKUNUR TEŞHİS: bölüm kimliği hangi kayıtta hangi biçimde duruyor?
 *
 * Hiçbir şey yazmaz, hiçbir şey silmez. Amacı, kimlik birleştirme işine
 * girmeden önce riski RAKAMLA görmektir.
 *
 * ── SORUN ──
 * Bölüm listesi iki yerden geliyor ve kimlikleri tutmuyor:
 *   • `departments` koleksiyonu → ObjectId / _docId / code
 *   • koda gömülü çekirdek 6 bölüm → slug ('bilgisayar', 'makine', …) ve
 *     sabit yazılmış `facultyId: 'muhendislik'`
 * Kayıtların bir kısmı slug, bir kısmı ObjectId taşıyor. Ham eşitlikle
 * karşılaştıran her yer aynı bölümü farklı bölüm sanıyor (anket ataması,
 * şablon çözümü, yatay geçiş listesi bu yüzden bozuldu).
 *
 * ── ÇIKTI ──
 *   1. departments koleksiyonu: her bölümün TÜM kimlikleri + fakültesi
 *   2. Gömülü çekirdek slug'ların DB'de karşılığı var mı
 *   3. Koleksiyon/alan bazında: kaç kayıt slug, kaç kayıt DB kimliği, kaç
 *      kayıt TANINMAYAN bir değer taşıyor
 *   4. Bilinen tuzaklar: kapsamı boş anket atamaları, bölümü çözülemeyen
 *      yatay geçiş başvuruları, çözülemeyen şablon kapsamları
 *
 * Kullanım:  node server/teshis-bolum-kimlik.js
 */
const { bolumKimlikHaritasi, kimlikler } = require('./lib/bolum-kimlik');

// shared-components.jsx içindeki gömülü çekirdek liste (id + sabit facultyId).
const GOMULU_SLUGLAR = ['bilgisayar', 'elektrik', 'makine', 'insaat', 'gida', 'kimya'];
const GOMULU_FAKULTE = 'muhendislik';

/**
 * Bu alan bölüm KİMLİĞİ mi taşıyor?
 *
 * Ölçüt iki parçalı, çünkü ad taşıyan alanlar da 'bolum'/'department' içeriyor
 * ve onları saymak dağılımı bozardı:
 *   • adı bölümle ilgili olmalı (department / bolum / dept)
 *   • VE kimlik alanı olmalı — 'Id'/'Ids' ile bitmeli
 * 'basvurduguBolum' (ad) elenirken 'basvurduguBolumId' (kimlik) girer.
 * Bu kalıba uymayan ama kimlik tutan alanlar açıkça listelenir.
 */
const KIMLIK_ISTISNA = new Set(['additionaldepartments']);
function bolumKimlikAlaniMi(anahtar) {
  const s = String(anahtar || '').toLowerCase();
  if (KIMLIK_ISTISNA.has(s)) return true;
  if (!/(department|bolum|dept)/.test(s)) return false;
  return /ids?$/.test(s);
}

const trAd = (s) =>
  String(s == null ? '' : s)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^0-9a-zçğıöşü]/g, '');

/** Dokümandaki bölüm kimliği taşıyan (alanYolu, değer) çiftleri. */
function bolumAtiflari(deger, yol = '', cikti = []) {
  if (Array.isArray(deger)) {
    deger.forEach((x) => bolumAtiflari(x, yol, cikti));
    return cikti;
  }
  if (deger && typeof deger === 'object' && deger.constructor === Object) {
    Object.keys(deger).forEach((anahtar) => {
      const altYol = yol ? yol + '.' + anahtar : anahtar;
      const v = deger[anahtar];
      if (bolumKimlikAlaniMi(anahtar)) {
        (Array.isArray(v) ? v : [v]).forEach((x) => {
          if (typeof x === 'string' || typeof x === 'number') cikti.push([altYol, String(x)]);
        });
      } else {
        bolumAtiflari(v, altYol, cikti);
      }
    });
  }
  return cikti;
}

(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();

  // ── 1) departments ──
  const bolumler = await db.collection('departments').find({}).toArray();
  const harita = bolumKimlikHaritasi(bolumler);
  const fakulteler = await db.collection('faculties').find({}).toArray();
  const fakAd = {};
  fakulteler.forEach((f) => {
    kimlikler(f).forEach((k) => {
      fakAd[k] = f.name || '(adsız)';
    });
  });

  console.log('══════ 1) departments koleksiyonu ══════');
  console.log(`Bölüm sayısı: ${bolumler.length}\n`);
  bolumler.forEach((d) => {
    const ids = kimlikler(d);
    const fak = String(d.facultyId || '');
    console.log(`• ${d.name || '(adsız)'}`);
    console.log(`    kimlikler : ${ids.join(' · ') || '(yok)'}`);
    console.log(
      `    fakülte   : ${fak || '(BOŞ)'} ${fak ? `— ${fakAd[fak] || '(fakülte kaydı YOK)'}` : ''}`
    );
  });

  // ── 2) Gömülü çekirdek slug'lar ──
  console.log('\n══════ 2) Koda gömülü çekirdek 6 bölüm ══════');
  console.log(`(gömülü listede facultyId sabit '${GOMULU_FAKULTE}' yazılı)\n`);
  GOMULU_SLUGLAR.forEach((slug) => {
    const dogrudan = harita.varyantlar[slug];
    if (dogrudan) {
      console.log(
        `• ${slug.padEnd(12)} → DB'de AYNI kimlikle var (fakülte: ${harita.fakulte[slug] || 'BOŞ'})`
      );
      return;
    }
    // Ad üzerinden eşi var mı?
    const es = bolumler.find((d) => trAd(d.name).startsWith(trAd(slug)));
    if (es) {
      console.log(
        `• ${slug.padEnd(12)} → DB'de BAŞKA kimlikle var: ${kimlikler(es).join(' · ')}` +
          `  (ad: ${es.name}, fakülte: ${es.facultyId || 'BOŞ'})   ⚠ KİMLİK UYUŞMUYOR`
      );
    } else {
      console.log(`• ${slug.padEnd(12)} → DB'de KARŞILIĞI YOK   ⚠ yalnız gömülü listede`);
    }
  });

  // ── 3) Koleksiyon/alan bazında kimlik biçimi dağılımı ──
  console.log('\n══════ 3) Kayıtlar hangi kimlik biçimini taşıyor ══════');
  const slugKumesi = new Set(GOMULU_SLUGLAR);
  const dbKumesi = new Set(Object.keys(harita.varyantlar));
  const koleksiyonlar = (await db.listCollections().toArray()).map((c) => c.name).sort();
  const bilinmeyenler = new Map(); // değer → kaç kez

  for (const ad of koleksiyonlar) {
    const docs = await db.collection(ad).find({}).toArray();
    const alanlar = new Map(); // alanYolu → {slug, db, ikisi, bos, bilinmeyen}
    docs.forEach((d) => {
      const { _id, ...govde } = d;
      bolumAtiflari(govde).forEach(([yol, deger]) => {
        if (!alanlar.has(yol))
          alanlar.set(yol, { slug: 0, db: 0, ikisi: 0, bos: 0, bilinmeyen: 0 });
        const s = alanlar.get(yol);
        if (!deger) return s.bos++;
        const slugMu = slugKumesi.has(deger);
        const dbMi = dbKumesi.has(deger);
        if (slugMu && dbMi) return s.ikisi++;
        if (slugMu) return s.slug++;
        if (dbMi) return s.db++;
        s.bilinmeyen++;
        bilinmeyenler.set(deger, (bilinmeyenler.get(deger) || 0) + 1);
      });
    });
    if (alanlar.size === 0) continue;
    console.log(`\n• ${ad}  (${docs.length} kayıt)`);
    [...alanlar.entries()].forEach(([yol, s]) => {
      const parcalar = [];
      if (s.ikisi) parcalar.push(`${s.ikisi} her ikisi`);
      if (s.slug) parcalar.push(`${s.slug} SLUG`);
      if (s.db) parcalar.push(`${s.db} DB kimliği`);
      if (s.bos) parcalar.push(`${s.bos} boş`);
      if (s.bilinmeyen) parcalar.push(`${s.bilinmeyen} TANINMAYAN`);
      const uyari = s.slug && s.db ? '   ⚠ AYNI ALANDA İKİ BİÇİM' : '';
      console.log(`    ${yol.padEnd(28)} ${parcalar.join(' · ')}${uyari}`);
    });
  }

  if (bilinmeyenler.size) {
    console.log('\n  Tanınmayan değerler (silinmiş bölüm ya da yazım hatası olabilir):');
    [...bilinmeyenler.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([v, n]) => console.log(`    ${v}  ×${n}`));
  }

  // ── 4) Bilinen tuzaklar ──
  console.log('\n══════ 4) Bilinen tuzaklar ══════');

  const atamalar = await db
    .collection('survey_assignments')
    .find({})
    .toArray()
    .catch(() => []);
  const kapsamsiz = atamalar.filter(
    (a) =>
      String(a.kapsamTuru || '') !== 'universite' &&
      (!Array.isArray(a.kapsamDepartmentIds) || a.kapsamDepartmentIds.length === 0)
  );
  console.log(
    `• Anket ataması: ${atamalar.length} kayıt, ${kapsamsiz.length} tanesinin kapsamı BOŞ` +
      (kapsamsiz.length ? '   ⚠ bunlar kimseye ulaşmıyor ve yönetim listesinde görünmüyor' : '')
  );

  const ygler = await db
    .collection('yatay_gecis_basvurular')
    .find({})
    .toArray()
    .catch(() => []);
  const ygSahipsiz = ygler.filter((r) => {
    if (r.basvurduguBolumId || r.departmentId) return false;
    const ad = trAd(r.basvurduguBolum);
    if (!ad) return true;
    return bolumler.filter((d) => trAd(d.name) === ad).length !== 1;
  });
  console.log(
    `• Yatay geçiş: ${ygler.length} başvuru, ${ygSahipsiz.length} tanesinin bölümü çözülemiyor` +
      (ygSahipsiz.length ? '   ⚠ hiçbir bölümün listesinde görünmez' : '')
  );

  const sablonlar = await db
    .collection('document_templates')
    .find({})
    .toArray()
    .catch(() => []);
  const sablonBolum = sablonlar.filter((t) => t.scope === 'department');
  const sablonKayip = sablonBolum.filter((t) => !dbKumesi.has(String(t.departmentId || '')));
  console.log(
    `• Şablon: ${sablonlar.length} kayıt (${sablonBolum.length} bölüm kapsamlı), ` +
      `${sablonKayip.length} tanesinin bölümü DB'de bulunamıyor` +
      (sablonKayip.length ? '   ⚠ o bölüme çözülmez' : '')
  );
  sablonKayip.slice(0, 10).forEach((t) => {
    console.log(`    ${t.module}/${t.docType || 'default'} → departmentId='${t.departmentId}'`);
  });

  console.log('\n(Bu betik hiçbir şey yazmadı.)');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
