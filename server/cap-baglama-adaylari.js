/**
 * ÇAP ADAY ÇİFTLERİ — tarama ve (istenirse) bağlama.
 *
 * Çift numaralı ÇAP öğrencisinin iki `students` kaydı vardır; bağ karşılıklı
 * `bagliOgrenciNolar` alanıyla kurulur (bkz. lib/cap-numara-baglama.js). Alan
 * yeni olduğu için eski kayıtlarda boştur. Bu betik adayları çıkarır.
 *
 * ⚠ VARSAYILAN DAVRANIŞ HİÇBİR ŞEY YAZMAMAKTIR. Elimizdeki tek işaret
 * ad-soyaddır ve ad kimlik değildir: farklı bölümlerde aynı adlı iki AYRI kişi
 * olabilir. Yanlış kurulan bir bağ, birinin muafiyet/staj kayıtlarını ötekine
 * AÇAR. Bu yüzden liste önce insana gösterilir; yazma ayrı ve açık bir adımdır.
 *
 * Şüpheli çiftler (adı ikiden çok geçen, aynı bölümde olan, bölümü boş olan)
 * `--uygula` verilse bile ASLA bağlanmaz; yalnız listelenir.
 *
 * Kullanım:
 *   node server/cap-baglama-adaylari.js              # yalnız rapor
 *   node server/cap-baglama-adaylari.js --uygula     # KESİN adayları bağlar
 *
 * Idempotent: zaten bağlı çiftlere dokunmaz.
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const { adaylariBul, tekNumaraliCaplar } = require('./lib/cap-aday-eslestirme');

  const uygula = process.argv.includes('--uygula');
  const db = await getDbSafe();
  const ogrenciler = db.collection('students');

  const hepsi = await ogrenciler.find({}).toArray();
  const { kesin, supheli, zatenBagli } = adaylariBul(hepsi);

  const bolum = (k) => k.departmentId || '—';
  const satir = (k) => `${k.studentNumber} (${bolum(k)})`;

  console.log(`\nToplam ${hepsi.length} öğrenci kaydı tarandı.\n`);

  console.log(`── BAĞLANMAYA HAZIR (${kesin.length}) ──`);
  if (kesin.length === 0) console.log('  (yok)');
  kesin.forEach((c) => console.log(`  • ${c.ad}:  ${satir(c.a)}  ↔  ${satir(c.b)}`));

  console.log(`\n── ŞÜPHELİ, ELLE BAKIN (${supheli.length}) ──`);
  if (supheli.length === 0) console.log('  (yok)');
  supheli.forEach((c) => {
    console.log(`  • ${c.ad}: ${c.sebep}`);
    c.kayitlar.forEach((k) => console.log(`      ${satir(k)}`));
  });

  console.log(`\n── ZATEN BAĞLI (${zatenBagli.length}) ──`);
  if (zatenBagli.length === 0) console.log('  (yok)');
  zatenBagli.forEach((c) => console.log(`  • ${c.ad}:  ${satir(c.a)}  ↔  ${satir(c.b)}`));

  // Tek numarayla ÇAP: doğru olabilir de olmayabilir de — karar OBS'dedir.
  const tekNumara = tekNumaraliCaplar(hepsi);
  const acil = tekNumara.filter((x) => x.ayriKayitlar.length > 0);
  const normal = tekNumara.filter((x) => x.ayriKayitlar.length === 0);

  console.log(`\n── TEK NUMARAYLA ÇAP (${normal.length}) ──`);
  console.log(
    '  Bu öğrenciler ikinci programlarına AYNI numarayla giriyor görünüyor.\n' +
      "  OBS'de ikinci bir numaraları varsa kayıt yanlıştır: ikinci programın\n" +
      '  muafiyet/staj işleri birinci numaranın altına yazılır ve belgelerde\n' +
      '  yanlış numara çıkar. Listeyi OBS ile karşılaştırın.\n'
  );
  if (normal.length === 0) console.log('  (yok)');
  normal.forEach((x) =>
    console.log(
      `  • ${x.kayit.firstName || ''} ${x.kayit.lastName || ''}`.trimEnd() +
        `  ${satir(x.kayit)}  →  ek bölüm: ${x.ekBolumler.join(', ')}`
    )
  );

  console.log(`\n── ⚠ ÇİFT GÖRÜNENLER (${acil.length}) ──`);
  console.log(
    '  Hem ÇAP satırı HEM kendi kaydı var: bu kişiler ilgili bölümün öğrenci\n' +
      '  listesinde İKİ KEZ, farklı numaralarla görünüyor. Doğrusu: iki numarayı\n' +
      '  bağlayıp ek bölüm bağını kaldırmak.\n'
  );
  if (acil.length === 0) console.log('  (yok)');
  acil.forEach((x) => {
    console.log(`  • ${x.kayit.firstName || ''} ${x.kayit.lastName || ''}`.trimEnd());
    console.log(`      ÇAP satırı : ${satir(x.kayit)}  (ek bölüm: ${x.ekBolumler.join(', ')})`);
    x.ayriKayitlar.forEach((y) => console.log(`      kendi kaydı: ${satir(y)}`));
  });

  if (!uygula) {
    console.log(
      `\nHiçbir şey yazılmadı. Listeyi doğruladıktan sonra bağlamak için:\n` +
        `  node server/cap-baglama-adaylari.js --uygula\n`
    );
    process.exit(0);
  }

  console.log(`\n▸ ${kesin.length} çift bağlanıyor (şüpheliler atlanır)…`);
  let yazilan = 0;
  for (const c of kesin) {
    // Bağ KARŞILIKLI yazılır: tek yönlü kalırsa öğrenci bir numarayla girince
    // öbür programını görür, ters yönden göremez.
    const ekle = async (kayit, digerNo) => {
      const mevcut = Array.isArray(kayit.bagliOgrenciNolar)
        ? kayit.bagliOgrenciNolar.map(String)
        : [];
      if (mevcut.includes(String(digerNo))) return;
      await ogrenciler.updateOne(
        { _id: kayit._id },
        { $set: { bagliOgrenciNolar: mevcut.concat(String(digerNo)), updatedAt: new Date() } }
      );
    };
    await ekle(c.a, c.b.studentNumber);
    await ekle(c.b, c.a.studentNumber);
    yazilan++;
    console.log(`  ✓ ${c.ad}:  ${satir(c.a)}  ↔  ${satir(c.b)}`);
  }
  console.log(
    `\n✓ ${yazilan} çift bağlandı. ${supheli.length} şüpheli çift elle incelenmeli.\n` +
      `  "TEK NUMARAYLA ÇAP" ve "ÇİFT GÖRÜNENLER" listelerine dokunulmadı:\n` +
      `  onlar OBS ile karşılaştırılmadan değiştirilemez.\n`
  );
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e.message);
  process.exit(1);
});
