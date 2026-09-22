/**
 * KAPSAMSIZ ANKETLERİ TARA — ve istenirse kapsam damgası vur.
 *
 * Anket kaydının kapsamı (kapsamTuru / kapsamFacultyId / kapsamDepartmentIds)
 * sonradan eklendi. Bu alanlar eklenmeden ÖNCE açılmış her anket "kapsamsız"
 * kalır ve şu davranışa düşer:
 *
 *   • Listede HERKESE görünür (liste bugünkü işi durdurmasın diye).
 *   • Yalnız anketi AÇAN kişi (createdBy) ya da üniversite yetkilisi
 *     düzenleyip silebilir.
 *   • Anket bir kez düzenlenip kaydedildiğinde kaydedenin kapsamıyla
 *     kendiliğinden damgalanır.
 *
 * Yani "sorun" bir arıza değil, GEÇİŞ DURUMUDUR: kayıt hangi bölüme/fakülteye
 * ait olduğunu söylemiyor. Bu betik önce kaç tane olduğunu ve kimin açtığını
 * söyler; istenirse tek seferde damgalar.
 *
 * ⚠ VARSAYILAN DAVRANIŞ HİÇBİR ŞEY YAZMAMAKTIR. Kapsam bir YETKİ alanıdır:
 * yanlış damgalanan anket ya görünmesi gereken yerde görünmez ya da
 * görünmemesi gereken yerde görünür. Önce rapor okunur, karar insana aittir.
 *
 * Kullanım:
 *   node server/anket-kapsam-tara.js                     # yalnız rapor
 *   node server/anket-kapsam-tara.js --detay             # anket anket liste
 *   node server/anket-kapsam-tara.js --uygula --kapsam universite
 *   node server/anket-kapsam-tara.js --uygula --kapsam fakulte --fakulte <fakülteId>
 *   node server/anket-kapsam-tara.js --uygula --kapsam bolum  --bolum <bölümId>
 *   node server/anket-kapsam-tara.js --uygula --kapsam bolum  --bolum <id> --sahip "Ad Soyad"
 *
 * `--sahip` verilirse YALNIZ o kişinin açtığı kapsamsız anketler damgalanır;
 * bölüm bölüm ilerlemek için en güvenli yol budur.
 *
 * Idempotent: damgalanmış anket ikinci çalıştırmada listeye girmez.
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const { kimlikler } = require('./lib/bolum-kimlik');

  const arg = (ad) => {
    const i = process.argv.indexOf('--' + ad);
    return i >= 0 ? String(process.argv[i + 1] || '').trim() : '';
  };
  const uygula = process.argv.includes('--uygula');
  const detay = process.argv.includes('--detay');
  const kapsamTuru = arg('kapsam');
  const fakulteId = arg('fakulte');
  const bolumId = arg('bolum');
  const sahip = arg('sahip');

  const db = await getDbSafe();
  const anketler = await db.collection('surveys').find({}).toArray();
  const bolumler = await db.collection('departments').find({}).toArray();

  const GECERLI = ['universite', 'fakulte', 'bolum'];
  const kapsamli = (a) => GECERLI.includes(String((a && a.kapsamTuru) || ''));
  const ad = (v) => String(v == null ? '' : v).trim();

  const kapsamsizlar = anketler.filter((a) => !kapsamli(a));
  const damgalilar = anketler.filter(kapsamli);

  console.log('');
  console.log('════════════════════════════════════════════');
  console.log(`TOPLAM ANKET      : ${anketler.length}`);
  console.log(`KAPSAMI DAMGALI   : ${damgalilar.length}`);
  console.log(`KAPSAMSIZ (eski)  : ${kapsamsizlar.length}`);
  console.log('════════════════════════════════════════════');

  if (damgalilar.length > 0) {
    const sayac = {};
    damgalilar.forEach((a) => {
      const t = String(a.kapsamTuru);
      sayac[t] = (sayac[t] || 0) + 1;
    });
    console.log('\nDamgalı anketlerin dağılımı:');
    Object.entries(sayac).forEach(([t, n]) => console.log(`  ${t.padEnd(12)} ${n}`));
  }

  if (kapsamsizlar.length === 0) {
    console.log('\nKapsamsız anket yok — yapacak bir şey yok.');
    process.exit(0);
  }

  // Kimin açtığı: damgalama kararını verecek kişi budur.
  const sahipler = new Map();
  kapsamsizlar.forEach((a) => {
    const k = ad(a.createdBy) || '(bilinmiyor)';
    if (!sahipler.has(k)) sahipler.set(k, []);
    sahipler.get(k).push(a);
  });

  console.log('\nKAPSAMSIZ ANKETLER — kimin açtığına göre:');
  [...sahipler.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([kisi, liste]) => {
      console.log(`\n  ${kisi}  (${liste.length} anket)`);
      if (detay) {
        liste.forEach((a) => {
          const soru = Array.isArray(a.questions) ? a.questions.length : 0;
          console.log(`    · ${ad(a.title) || '(başlıksız)'}  —  ${soru} soru  —  id: ${a._id}`);
        });
      }
    });

  if (!detay) console.log('\n  (anket başlıkları için: --detay)');

  if (!uygula) {
    console.log('\n────────────────────────────────────────────');
    console.log('Hiçbir şey yazılmadı (rapor kipi).');
    console.log('Damgalamak için --uygula ve --kapsam verin, ör.:');
    console.log('  node server/anket-kapsam-tara.js --uygula --kapsam universite');
    console.log('  node server/anket-kapsam-tara.js --uygula --kapsam fakulte --fakulte <id>');
    console.log('  node server/anket-kapsam-tara.js --uygula --kapsam bolum --bolum <id>');
    console.log('\nFakülte/bölüm kimlikleri:');
    bolumler.slice(0, 40).forEach((b) => {
      console.log(
        `  bölüm ${String(b._id).padEnd(26)} ${ad(b.name).padEnd(34)} fakülte: ${ad(b.facultyId)}`
      );
    });
    process.exit(0);
  }

  // ── Yazma ──
  if (!GECERLI.includes(kapsamTuru)) {
    console.error('\n--kapsam universite | fakulte | bolum olmalı.');
    process.exit(1);
  }
  let yama = null;
  if (kapsamTuru === 'universite') {
    yama = { kapsamTuru: 'universite', kapsamFacultyId: '', kapsamDepartmentIds: [] };
  } else if (kapsamTuru === 'fakulte') {
    if (!fakulteId) {
      console.error('\nFakülte kapsamı için --fakulte <fakülteId> gerekir.');
      process.exit(1);
    }
    const ids = [];
    bolumler.forEach((b) => {
      if (b && ad(b.facultyId) === fakulteId) ids.push(...kimlikler(b));
    });
    if (ids.length === 0) {
      console.error('\nBu fakülteye bağlı bölüm bulunamadı — kapsam BOŞ kalırdı, yazılmadı.');
      process.exit(1);
    }
    yama = {
      kapsamTuru: 'fakulte',
      kapsamFacultyId: fakulteId,
      kapsamDepartmentIds: [...new Set(ids)],
    };
  } else {
    if (!bolumId) {
      console.error('\nBölüm kapsamı için --bolum <bölümId> gerekir.');
      process.exit(1);
    }
    const b = bolumler.find((x) => x && kimlikler(x).includes(bolumId));
    if (!b) {
      console.error('\nBölüm bulunamadı: ' + bolumId);
      process.exit(1);
    }
    yama = {
      kapsamTuru: 'bolum',
      kapsamFacultyId: ad(b.facultyId),
      kapsamDepartmentIds: kimlikler(b),
    };
  }

  const hedef = sahip ? kapsamsizlar.filter((a) => ad(a.createdBy) === sahip) : kapsamsizlar;
  if (hedef.length === 0) {
    console.log('\nSeçilen süzgeçle damgalanacak anket yok.');
    process.exit(0);
  }

  console.log('\n────────────────────────────────────────────');
  console.log(`DAMGALANACAK: ${hedef.length} anket → ${JSON.stringify(yama)}`);
  let yazilan = 0;
  for (const a of hedef) {
    await db.collection('surveys').updateOne({ _id: a._id }, { $set: yama });
    yazilan++;
  }
  console.log(`Yazıldı: ${yazilan} anket.`);
  console.log('Kalan kapsamsız anket: ' + (kapsamsizlar.length - yazilan));
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e && e.message ? e.message : e);
  process.exit(1);
});
