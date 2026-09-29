/**
 * SALT OKUNUR TEŞHİS: TTO birimi ve TTO yöneticisi sayılan akademisyenler.
 *
 * Hiçbir şey yazmaz, hiçbir şey silmez.
 *
 * Kural (lib/tto-talep.js → ttoBirimUyesiMi): `departments` içinde adı
 * "Teknoloji Transfer Ofisi" / kısa adı ya da kodu "TTO" olan birime ANA birim
 * (departmentId) veya EK birim (additionalDepartments) olarak kayıtlı her
 * akademisyen TTO yöneticisidir. Başka bölümlerde ders vermesi bunu
 * değiştirmez: ders verdiği bölümler ek birim olarak durur.
 *
 * ── ÇIKTI ──
 *   1. TTO birimi olarak tanınan kayıtlar (ve adı benzeyip TANINMAYANLAR)
 *   2. TTO yöneticisi sayılan akademisyenler: ana birim, ek birimler
 *   3. Olası kayıt hataları: birim METNİ TTO diyen ama kimliği başka birime
 *      bakan kayıtlar; eski isTtoYoneticisi bayrağı olup birimde olmayanlar
 *
 * Kullanım:  node server/teshis-tto-birim.js
 */
const { kimlikler } = require('./lib/bolum-kimlik');

(async () => {
  const T = await import('../lib/tto-talep.js');
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();

  const bolumler = await db.collection('departments').find({}).toArray();
  const bolumAdi = {};
  bolumler.forEach((b) => kimlikler(b).forEach((k) => (bolumAdi[k] = b.name || '(adsız)')));
  const adiVer = (k) => (k ? bolumAdi[String(k)] || `TANINMAYAN kimlik (${k})` : '—');

  // ── 1) TTO birimi ──
  console.log('══════ 1) TTO birimi ══════');
  const tto = bolumler.filter(T.ttoBirimiMi);
  if (!tto.length) {
    console.log('  ⚠ TTO birimi olarak tanınan kayıt YOK — kimse TTO yöneticisi sayılmaz.');
    console.log('    Birimin adı "Teknoloji Transfer Ofisi" ya da kodu "TTO" olmalı.');
  }
  tto.forEach((b) => console.log(`  ✓ ${b.name}  [kimlikler: ${kimlikler(b).join(', ')}]`));
  const benzer = bolumler.filter(
    (b) => !T.ttoBirimiMi(b) && /transfer|teknoloji|ofis/i.test(String(b.name || ''))
  );
  benzer.forEach((b) =>
    console.log(`  ? Adı benziyor ama TANINMADI: "${b.name}" — gerekiyorsa adını düzeltin.`)
  );

  // ── 2) Yönetici sayılanlar ──
  console.log('\n══════ 2) TTO yöneticisi sayılan akademisyenler ══════');
  const hocalar = await db
    .collection('professors')
    .find(
      {},
      {
        projection: {
          name: 1,
          departmentId: 1,
          department: 1,
          additionalDepartments: 1,
          isTtoYoneticisi: 1,
        },
      }
    )
    .toArray();
  const adaGore = {};
  hocalar.forEach((p) => (adaGore[p.name] = adaGore[p.name] || []).push(p));
  const yoneticiler = Object.keys(adaGore).filter((ad) => T.ttoBirimUyesiMi(adaGore[ad], bolumler));
  if (!yoneticiler.length) console.log('  (yok)');
  yoneticiler.forEach((ad) => {
    console.log(`  • ${ad}`);
    adaGore[ad].forEach((p) => {
      const ekler = Array.isArray(p.additionalDepartments) ? p.additionalDepartments : [];
      console.log(`      ana birim: ${adiVer(p.departmentId)}`);
      console.log(`      ek birimler: ${ekler.length ? ekler.map(adiVer).join(', ') : '—'}`);
    });
  });

  // ── 3) Olası kayıt hataları ──
  console.log('\n══════ 3) Kontrol edilmesi gerekenler ══════');
  let uyari = 0;
  Object.keys(adaGore).forEach((ad) => {
    if (yoneticiler.includes(ad)) return;
    const kayitlar = adaGore[ad];
    if (kayitlar.some((p) => T.ttoBirimAdiMi(p.department))) {
      uyari++;
      console.log(
        `  ⚠ ${ad}: birim metni TTO diyor ama kimliği başka birime bakıyor ` +
          `(${kayitlar.map((p) => adiVer(p.departmentId)).join(', ')}) — yönetici SAYILMAZ.`
      );
    }
    if (kayitlar.some((p) => p.isTtoYoneticisi)) {
      uyari++;
      console.log(
        `  ⚠ ${ad}: eski "TTO yöneticisi" işareti var ama TTO biriminde değil — yönetici SAYILMAZ.`
      );
    }
  });
  if (!uyari) console.log('  ✓ sorun yok');

  console.log('\n(Bu betik hiçbir şey yazmadı.)');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
