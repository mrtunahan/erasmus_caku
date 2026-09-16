/**
 * BİR BELGE NEDEN MEMURA DÜŞMÜYOR? — salt okunur tanı.
 *
 * Belge görünürlüğü üç şeyin kesişimi: belge bir BÖLÜME bağlanmış olmalı
 * (yönlendirmenin kapsamı), memur o bölümde ilgili MODÜLE atanmış olmalı ve
 * belge memura GÖNDERİLMİŞ olmalı. Üçünden biri eksikse ekranda hiçbir şey
 * görünmez ve hangisinin eksik olduğu dışarıdan anlaşılmaz.
 *
 * Bu betik hiçbir şey yazmaz; kaydı, belgeyi ve atamaları yan yana koyup
 * her memur için "görür / görmez, çünkü…" der.
 *
 * Kullanım:
 *   node server/memur-belge-tanila.js 200905037        # öğrenci numarası
 *   node server/memur-belge-tanila.js <muafiyet kayıt id>
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const { memurunBelgesiMi, memurBolumModulleri } = require('./lib/memur-kapsam');

  const aranan = String(process.argv[2] || '').trim();
  if (!aranan) {
    console.log('Kullanım: node server/memur-belge-tanila.js <öğrenci no | kayıt id>');
    process.exit(1);
  }

  const db = await getDbSafe();
  const kayitId = (r) => String(r._docId || (r._id && r._id.toString()) || '');

  // Ad ya da numara ile ara — Türkçe duyarlı, kısmi eşleşme.
  const kucuk = (v) =>
    String(v == null ? '' : v)
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLocaleLowerCase('tr-TR')
      .trim();
  const q = kucuk(aranan);
  const esles = (r) =>
    String(r.studentNo || '') === aranan ||
    kayitId(r) === aranan ||
    (q.length >= 3 && kucuk(r.studentName).includes(q));

  const kayitlar = (await db.collection('muafiyet_records').find({}).toArray()).filter(esles);

  // ⚠ BELGE YALNIZ MUAFİYETTEN ÇIKMIYOR. Erasmus, yatay geçiş, ÇAP/yandal ve
  // performans da memura belge gönderiyor; bu betik önce yalnız muafiyet
  // kaydına bakıyordu ve o modüllerdeki aynı arıza teşhis edilemiyordu.
  // memur_outputs doğrudan da taranır.
  const tumBelgeler = await db.collection('memur_outputs').find({}).toArray();
  const belgeEsles = (b) => {
    const baslik = kucuk(b.title) + ' ' + kucuk(b.subtitle);
    return (
      String(b.ogrenciNo || '') === aranan ||
      String(b.sourceId || '').startsWith(aranan) ||
      (q.length >= 3 && baslik.includes(q))
    );
  };
  const serbestBelgeler = tumBelgeler.filter(
    (b) => belgeEsles(b) && !kayitlar.some((r) => String(b.sourceId || '') === kayitId(r))
  );

  if (kayitlar.length === 0 && serbestBelgeler.length === 0) {
    console.log(`\n"${aranan}" ile kayıt ya da belge bulunamadı.\n`);
    console.log('  Öğrenci numarası, kayıt kimliği ya da adın bir parçasıyla arayın.\n');
    process.exit(0);
  }

  const atamalar = await db.collection('memur_bolum_modulleri').find({}).toArray();
  const memurlar = await db.collection('professors').find({ isMemur: true }).toArray();
  const bos = (v) => (v == null || String(v).trim() === '' ? '(BOŞ)' : String(v));

  for (const rec of kayitlar) {
    const id = kayitId(rec);
    console.log('\n════════════════════════════════════════════');
    console.log(`KAYIT  ${rec.studentName || '—'}  ·  ${bos(rec.studentNo)}   [${id}]`);
    console.log(`  tür        : ${bos(rec.basvuruTuru)}   aşama: ${bos(rec.stage)}`);
    console.log(`  bölüm      : ${bos(rec.departmentId)}`);
    console.log(`  fakülte    : ${bos(rec.facultyId)}`);

    const belgeler = await db.collection('memur_outputs').find({ sourceId: id }).toArray();
    if (belgeler.length === 0) {
      console.log('\n  ⚠ Bu kayıt için ÜRETİLMİŞ BELGE YOK (memur_outputs boş).');
      console.log('    Belge hiç gönderilmemiş demektir.');
      continue;
    }

    for (const b of belgeler) {
      console.log(`\n  BELGE  ${bos(b.module)}/${bos(b.docType)}   [${kayitId(b)}]`);
      console.log(`    bölüm    : ${bos(b.departmentId)}`);
      console.log(`    fakülte  : ${bos(b.facultyId)}`);
      belgeyiIncele(b);
    }
  }

  // Bir belgenin yönlendirmelerini ve her memurun görüp göremediğini yazar.
  // Görünürlük üç şeyin kesişimi (gönderim + kapsam + atama); hangisinin
  // eksik olduğu dışarıdan anlaşılmıyor.
  function belgeyiIncele(b) {
    const gs = Array.isArray(b.gonderimler) ? b.gonderimler : [];
    if (gs.length === 0) {
      console.log('    ⚠ YÖNLENDİRME YOK — belge üretilmiş ama GÖNDERİLMEMİŞ.');
    }
    gs.forEach((g, i) => {
      console.log(
        `    yönlendirme ${i}: ${bos(g.hedefRol)} → kapsam ${bos(g.kapsamId)}` +
          `   durum: ${bos(g.durum)}`
      );
      if (g.hedefRol === 'memur' && !String(g.kapsamId || '').trim() && !b.departmentId) {
        console.log('      ⚠ KAPSAM BOŞ ve belgenin bölümü de boş — hiçbir memur ataması ile');
        console.log('        eşleşemez. Belgeyi yeniden "Gönder" ile yollayın.');
      }
    });

    console.log('\n    Memurlar:');
    if (memurlar.length === 0) console.log('      (sistemde memur yok)');
    memurlar.forEach((p) => {
      const memur = {
        memurId: kayitId(p),
        name: p.name || '',
        departmentId: p.departmentId || '',
        facultyId: p.facultyId || '',
        memurModules: Array.isArray(p.memurModules) ? p.memurModules : [],
        isStajCoordinator: !!p.isStajCoordinator,
      };
      const gorur = memurunBelgesiMi(b, memur, atamalar);
      const bolum = String(b.departmentId || '') || '(bölümsüz)';
      const mods = memurBolumModulleri(atamalar, b.departmentId || '', memur);
      console.log(
        `      ${gorur ? '✓ GÖRÜR ' : '✗ görmez'}  ${p.name}` +
          `   [${bolum} atamaları: ${mods.length ? mods.join(', ') : 'YOK'}]`
      );
      if (!gorur) return;
      // Sunucu "görür" diyorsa ekranda görünmemesinin sebebi İSTEMCİDEDİR.
      // İki koşul daha var ve ikisi de dışarıdan görünmüyor.
      const kendiAtamalari = atamalar.filter(
        (a) =>
          String(a.memurId || '') === memur.memurId ||
          String(a.memurName || '') === String(p.name || '')
      );
      const bolumler = kendiAtamalari.map((a) => a.departmentId).filter(Boolean);
      console.log(
        `          → Ekranda görünmesi için SAĞDAN "${bolum}" seçili olmalı.` +
          (bolumler.length > 1 ? `  (atandığı bölümler: ${bolumler.join(', ')})` : '')
      );
      const adsiz = kendiAtamalari.filter((a) => !String(a.memurName || '').trim());
      if (adsiz.length > 0) {
        console.log(
          `          → ${adsiz.length} atama kaydında memurName BOŞ. Oturumu ` +
            'deploy öncesinden kalan memur, kimliği taşımadığı için bu ' +
            'atamalara ad ile de bağlanamaz; çıkış yapıp yeniden girmeli.'
        );
      }
    });
  }

  for (const b of serbestBelgeler) {
    console.log('\n════════════════════════════════════════════');
    console.log(`BELGE (kayıt eşleşmedi)  ${b.title || '—'}`);
    console.log(`  modül    : ${bos(b.module)}/${bos(b.docType)}   [${kayitId(b)}]`);
    console.log(`  bölüm    : ${bos(b.departmentId)}`);
    console.log(`  fakülte  : ${bos(b.facultyId)}`);
    belgeyiIncele(b);
  }

  console.log('');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e.message);
  process.exit(1);
});
