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
  const kayipSluglar = [];
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
      kayipSluglar.push(slug);
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
  // ⚠ ÖLÇÜT İNCE: `kapsamTuru` HİÇ YOKSA kayıt ESKİDİR ve okuma tarafı onu
  // `departmentId` üzerinden çözer (lib/yayin-kapsami.js → kapsamsız dal).
  // Yani "kapsamDepartmentIds boş" tek başına bozukluk DEĞİLDİR. Gerçekten
  // kimseye ulaşmayan kayıt: kapsamTuru 'bolum'/'fakulte' YAZILI ama liste boş.
  const bozukAtama = atamalar.filter(
    (a) =>
      ['bolum', 'fakulte'].includes(String(a.kapsamTuru || '')) &&
      (!Array.isArray(a.kapsamDepartmentIds) || a.kapsamDepartmentIds.length === 0)
  );
  const eskiAtama = atamalar.filter(
    (a) => !String(a.kapsamTuru || '') && String(a.departmentId || '')
  );
  const sahipsizAtama = atamalar.filter(
    (a) => !String(a.kapsamTuru || '') && !String(a.departmentId || '')
  );
  console.log(`• Anket ataması: ${atamalar.length} kayıt`);
  console.log(
    `    ${bozukAtama.length} tanesi KAPSAMI YAZILI AMA BOŞ` +
      (bozukAtama.length ? '   ⚠ kimseye ulaşmıyor, yönetim listesinde de görünmüyor' : '')
  );
  console.log(`    ${eskiAtama.length} tanesi eski biçim (departmentId üzerinden çalışıyor)`);
  console.log(
    `    ${sahipsizAtama.length} tanesi ne kapsam ne bölüm taşıyor` +
      (sahipsizAtama.length ? '   ⚠ HERKESE açık sayılıyor' : '')
  );
  bozukAtama
    .concat(sahipsizAtama)
    .slice(0, 10)
    .forEach((a) => {
      console.log(
        `      surveyId=${a.surveyId} rol=${a.targetRole || '?'} grup=${a.targetGroup || '?'} ` +
          `kapsamTuru='${a.kapsamTuru || ''}' departmentId='${a.departmentId || ''}'`
      );
    });

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

  // ── 5) DB karşılığı olmayan slug'lar ──
  if (kayipSluglar.length) {
    console.log('\n══════ 5) DB’de karşılığı olmayan gömülü slug’lar ══════');
    console.log('Bu slug’ı taşıyan kayıtlar hiçbir DB bölümüne bağlanamıyor:\n');
    for (const slug of kayipSluglar) {
      let toplam = 0;
      const nerede = [];
      for (const ad of koleksiyonlar) {
        const docs = await db.collection(ad).find({}).toArray();
        let n = 0;
        docs.forEach((d) => {
          const { _id, ...govde } = d;
          bolumAtiflari(govde).forEach(([, deger]) => {
            if (deger === slug) n++;
          });
        });
        if (n) {
          nerede.push(`${ad}: ${n}`);
          toplam += n;
        }
      }
      console.log(`• '${slug}' → toplam ${toplam} atıf`);
      nerede.forEach((x) => console.log(`    ${x}`));
    }
  }

  // ── 6) Çekirdek bölümler: hangi kimlik biçimi kaç kayıtta ──
  // Okuma API'si (routes/db.js) `_id` ve `_docId` alanlarını SİLİP tek bir
  // `id` döndürüyor: `_docId || _id`. Çekirdek 6 bölümde `_docId` slug olduğu
  // için ObjectId biçimi kendiliğinden istemciye ULAŞMAZ; o biçimle
  // kaydedilmiş atıflar istemcide hiçbir bölüme bağlanamıyordu.
  //
  // Artık `departments` okumasında kimlik biçimleri `kimlikler` alanıyla
  // AÇIKÇA gönderiliyor ve istemci bunları birleştiriyor
  // (lib/bolum-birlestir.js). Aşağıdaki sayı, o düzeltmenin KAÇ KAYDI
  // kurtardığını gösterir: sıfırdan büyükse düzeltme olmadan bu kayıtlar
  // bölümsüz görünürdü.
  console.log('\n══════ 6) Çekirdek bölümlerde kimlik biçimi dağılımı ══════');
  const cekirdek = bolumler.filter((d) => {
    const ids = kimlikler(d);
    return ids.some((x) => GOMULU_SLUGLAR.includes(x));
  });
  const sayaclar = new Map(); // kimlik → { toplam, nerede:Map }
  cekirdek.forEach((d) =>
    kimlikler(d).forEach((k) => sayaclar.set(k, { toplam: 0, nerede: new Map() }))
  );
  for (const ad of koleksiyonlar) {
    const docs = await db.collection(ad).find({}).toArray();
    docs.forEach((d) => {
      const { _id, ...govde } = d;
      bolumAtiflari(govde).forEach(([, deger]) => {
        const s = sayaclar.get(deger);
        if (!s) return;
        s.toplam++;
        s.nerede.set(ad, (s.nerede.get(ad) || 0) + 1);
      });
    });
  }
  cekirdek.forEach((d) => {
    const ids = kimlikler(d);
    const slug = ids.find((x) => GOMULU_SLUGLAR.includes(x));
    const digerleri = ids.filter((x) => x !== slug);
    console.log(`\n• ${d.name}`);
    console.log(`    '${slug}' (slug, doğrudan ULAŞIR)      → ${sayaclar.get(slug).toplam} atıf`);
    digerleri.forEach((k) => {
      const s = sayaclar.get(k);
      const uyari = s.toplam ? '   ⚠ YALNIZ `kimlikler` ALANIYLA ULAŞIR' : '';
      console.log(`    '${k}' (ObjectId)  → ${s.toplam} atıf${uyari}`);
      if (s.toplam)
        [...s.nerede.entries()].forEach(([k2, n]) => console.log(`        ${k2}: ${n}`));
    });
  });

  // ── 7) AD EŞLEŞMESİ ÇAKIŞMASI: kişi kaç bölümde birden görünüyor? ──
  // Ortak kural (window.profMatchesDept) bölüm ADINA yalnız `departmentId`
  // BOŞKEN bakar. Fakülte Yönetimi ve Kullanıcı Yönetimi ise adı KOŞULSUZ
  // deniyor: `p.departmentId === deptId || p.department === deptName`.
  // Kimliği A bölümünü, eski `department` metni B bölümünü gösteren kişi bu
  // iki ekranda İKİ bölümde birden çıkıyor — "hayalet akademisyen" şikâyeti.
  //
  // Ortak kurala geçmek görünürlüğü DARALTIR, o yüzden önce sayılır:
  //   • çakışan  → kimliği ve adı FARKLI bölüm gösteriyor (hayalet üretir;
  //                düzeltmeden sonra yalnız kimliğin bölümünde görünür)
  //   • yalnız-ad → kimliği yok, yalnız ad var (kural bunu KORUR)
  //   • ad-yetim  → kimliği yok, adı da hiçbir bölüme uymuyor (zaten görünmez)
  console.log('\n══════ 7) Ad eşleşmesi çakışması (hayalet akademisyen) ══════');
  const adaGoreBolum = new Map(); // normalize ad → bölüm dokümanı
  bolumler.forEach((d) => {
    [d.name, d.shortName].filter(Boolean).forEach((ad) => {
      const k = trAd(ad);
      if (!k) return;
      // Aynı ada iki bölüm düşerse eşleştirme zaten güvenilmez: işaretle.
      adaGoreBolum.set(k, adaGoreBolum.has(k) ? null : d);
    });
  });

  for (const ad of ['professors', 'students']) {
    const docs = await db.collection(ad).find({}).toArray();
    const cakisan = [];
    let yalnizAd = 0;
    let adYetim = 0;
    docs.forEach((d) => {
      const adMetni = d.department || d.departmentName || '';
      if (!adMetni) return;
      const adinBolumu = adaGoreBolum.get(trAd(adMetni));
      const kimlik = String(d.departmentId || '');
      if (!kimlik) {
        if (adinBolumu) yalnizAd++;
        else adYetim++;
        return;
      }
      if (!adinBolumu) return; // ad hiçbir bölüme uymuyor → çakışma yok
      const kimligeGore = harita.kanonik[kimlik];
      const adaGore = harita.kanonik[kimlikler(adinBolumu)[0]];
      if (kimligeGore && adaGore && kimligeGore !== adaGore) {
        cakisan.push(`${d.name || d.adSoyad || d._docId}: kimlik→${kimlik}, ad→"${adMetni}"`);
      }
    });
    console.log(`\n• ${ad}: ${docs.length} kayıt`);
    console.log(`    çakışan (düzeltmeden sonra TEK bölümde görünür) → ${cakisan.length}`);
    cakisan.slice(0, 20).forEach((x) => console.log(`        ${x}`));
    if (cakisan.length > 20) console.log(`        … +${cakisan.length - 20} kayıt daha`);
    console.log(`    yalnız-ad (kural KORUR)                        → ${yalnizAd}`);
    console.log(`    ad-yetim (zaten hiçbir bölümde görünmüyor)     → ${adYetim}`);
  }

  console.log('\n(Bu betik hiçbir şey yazmadı.)');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
