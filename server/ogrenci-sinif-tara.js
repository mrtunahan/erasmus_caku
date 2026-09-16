/**
 * ÖĞRENCİ SINIFLARINI NUMARADAN ÇÖZ — tarama ve (istenirse) yazma.
 *
 * Sistem bugün öğrencinin sınıfını bilmiyor: `students.sinif` alanını
 * öğrencinin kendisi portaldan giriyor, girmeyende alan boş kalıyor. Boş
 * kaldığında anket eşleşmesi "sınıfı bilinmiyorsa göster" diyordu; yani
 * 1. sınıf anketi, sınıfını hiç girmemiş bütün öğrencilere düşüyordu.
 *
 * Numara zaten söylüyor: ilk iki hane GİRİŞ YILIdır (260905037 → 2026 girişli).
 * Sınıf = akademik yıl − giriş yılı + 1; akademik yıl eylülde döner.
 *
 * ⚠ VARSAYILAN DAVRANIŞ HİÇBİR ŞEY YAZMAMAKTIR. Numaradan çıkan sınıf bir
 * TAHMİNdir: kayıt dondurmuş, sınıfta kalmış ya da yatay geçişle gelmiş
 * öğrencide tutmaz. Yanlış yazılan sınıf herkesin profilinde yanlış durur ve
 * hangi kaydın elle girildiği artık ayırt edilemez. Bu yüzden önce rapor
 * verilir; yazma ayrı ve açık bir adımdır.
 *
 * Yazma yalnız SINIFI BOŞ olan (ya da daha önce bu betiğin yazdığı, artık
 * eskimiş) kayıtlara yapılır. Elle girilmiş sınıf asla ezilmez — çelişkili
 * olanlar yalnız listelenir, kararı insan verir.
 *
 * Yazılan değer `sinifKaynagi: 'numara'` ile işaretlenir ve bir KİLİT değil
 * ÖNBELLEKtir: her okumada numaradan yeniden hesaplanır, gelecek eylülde
 * kendiliğinden artar.
 *
 * Kullanım:
 *   node server/ogrenci-sinif-tara.js                    # yalnız rapor
 *   node server/ogrenci-sinif-tara.js --bolum bilgisayar # tek bölüm
 *   node server/ogrenci-sinif-tara.js --program 2        # ön lisans (2 yıl)
 *   node server/ogrenci-sinif-tara.js --uygula           # boş olanlara YAZAR
 *
 * Idempotent: ikinci çalıştırmada yazacak kayıt kalmaz.
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const { sinifTaramasi, akademikYilBasi } = require('./lib/ogrenci-sinif');

  const arg = (ad) => {
    const i = process.argv.indexOf('--' + ad);
    return i >= 0 ? process.argv[i + 1] : '';
  };
  const uygula = process.argv.includes('--uygula');
  const bolum = String(arg('bolum') || '').trim();
  const programYili = Number(arg('program')) || undefined;

  const db = await getDbSafe();
  const koleksiyon = db.collection('students');
  const suzgec = bolum ? { departmentId: bolum } : {};
  const ogrenciler = await koleksiyon.find(suzgec).toArray();

  const yilBasi = akademikYilBasi();
  console.log('');
  console.log('════════════════════════════════════════════');
  console.log(`AKADEMİK YIL : ${yilBasi}-${yilBasi + 1}`);
  console.log(`ÖĞRENCİ      : ${ogrenciler.length}${bolum ? '  (bölüm: ' + bolum + ')' : ''}`);
  console.log(`PROGRAM SÜRESİ: ${programYili || 4} yıl (--program ile değiştirilir)`);
  console.log('════════════════════════════════════════════');

  const r = sinifTaramasi(ogrenciler, programYili ? { programYili } : {});
  const ad = (o) => `${o.studentNumber || '—'}  ${o.name || o.fullName || ''}`.trim();

  // Yazılacaklar — sınıfı boş, numara çözüldü.
  const sinifDagilimi = {};
  r.yazilacak.forEach((x) => {
    sinifDagilimi[x.yeni] = (sinifDagilimi[x.yeni] || 0) + 1;
  });
  console.log(`\n▸ SINIFI BOŞ, NUMARADAN ÇÖZÜLDÜ: ${r.yazilacak.length}`);
  Object.keys(sinifDagilimi)
    .sort()
    .forEach((s) => console.log(`    ${s}. sınıf : ${sinifDagilimi[s]}`));
  r.yazilacak.slice(0, 15).forEach((x) => console.log(`    ${ad(x.ogrenci)} → ${x.yeni}. sınıf`));
  if (r.yazilacak.length > 15) console.log(`    … ve ${r.yazilacak.length - 15} kayıt daha`);

  // Çelişkiler — insan kararı gerektirir, ASLA otomatik yazılmaz.
  console.log(`\n▸ ÇELİŞKİLİ (elle girilmiş ≠ numaradan): ${r.celiskili.length}`);
  if (r.celiskili.length > 0) {
    console.log('    Bunlar OLAĞAN olabilir: sınıfta kalma, kayıt dondurma, yatay geçiş.');
    console.log('    Hiçbiri değiştirilmez; yalnız gözden geçirin.');
  }
  r.celiskili
    .slice(0, 20)
    .forEach((x) =>
      console.log(`    ${ad(x.ogrenci)}  kayıt: ${x.mevcut}  ·  numaradan: ${x.numaradan}`)
    );
  if (r.celiskili.length > 20) console.log(`    … ve ${r.celiskili.length - 20} kayıt daha`);

  // Çözülemeyenler — numara biçimi tanınmadı ya da program süresi aşılmış.
  const durumlar = {};
  r.cozulemeyen.forEach((x) => {
    durumlar[x.durum] = (durumlar[x.durum] || 0) + 1;
  });
  console.log(`\n▸ ÇÖZÜLEMEYEN: ${r.cozulemeyen.length}`);
  Object.keys(durumlar).forEach((d) => {
    const aciklama =
      d === 'uzayan'
        ? 'program süresini aşmış (uzatmalı ya da mezun)'
        : d === 'gelecek'
          ? 'numara ileri tarihli'
          : 'numara tanınmadı';
    console.log(`    ${d} : ${durumlar[d]}  — ${aciklama}`);
  });
  r.cozulemeyen.slice(0, 10).forEach((x) => console.log(`    ${ad(x.ogrenci)}  [${x.durum}]`));
  if (r.cozulemeyen.length > 10) console.log(`    … ve ${r.cozulemeyen.length - 10} kayıt daha`);

  console.log(`\n▸ DOKUNULMAYAN (zaten doğru): ${r.dokunulmayan}`);

  if (!uygula) {
    console.log('\n────────────────────────────────────────────');
    console.log('Hiçbir şey YAZILMADI (salt okunur çalışma).');
    if (r.yazilacak.length > 0) {
      console.log(
        `Yazmak için:  node server/ogrenci-sinif-tara.js${bolum ? ' --bolum ' + bolum : ''}${programYili ? ' --program ' + programYili : ''} --uygula`
      );
      console.log(`Yazılacak ${r.yazilacak.length} kayıtta sinif ya BOŞ ya da bu betiğin daha`);
      console.log('önce yazdığı eskimiş değer; elle girilmiş hiçbir sınıf değiştirilmeyecek.');
    }
    console.log('');
    process.exit(0);
  }

  if (r.yazilacak.length === 0) {
    console.log('\nYazılacak kayıt yok.\n');
    process.exit(0);
  }

  console.log(`\n▸ YAZILIYOR: ${r.yazilacak.length} kayıt…`);
  let yazilan = 0;
  let hata = 0;
  for (const x of r.yazilacak) {
    const o = x.ogrenci;
    const anahtar = o._id ? { _id: o._id } : { studentNumber: o.studentNumber };
    try {
      await koleksiyon.updateOne(anahtar, {
        $set: {
          sinif: String(x.yeni),
          // Bu sınıfın nereden geldiği kayıtta DURSUN: ileride "elle mi
          // girildi, betik mi yazdı" sorusunun cevabı olmasın diye değil,
          // OLSUN diye. Tahminle kaydı ayırt edemezsek ikinci bir tarama
          // kendi yazdığını "elle girilmiş" sanıp dokunmaz.
          sinifKaynagi: 'numara',
          sinifYazilma: new Date().toISOString(),
          sinifGirisYili: x.girisYili,
        },
      });
      yazilan++;
    } catch (e) {
      hata++;
      console.log(`    ✗ ${ad(o)} — ${e.message}`);
    }
  }
  console.log(`\n✓ ${yazilan} kayıt güncellendi${hata ? `, ${hata} hata` : ''}.`);
  console.log('  Yazılan sınıflar `sinifKaynagi: "numara"` ile işaretlendi.');
  console.log('');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e.message);
  process.exit(1);
});
