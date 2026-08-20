/**
 * KAYDA GEÇMİŞ SAHTE ERASMUS NOTLARINI TEMİZLE.
 *
 * ── SORUN ──
 * "Gidiş Eşleştirmelerinden Hızlı Doldur" düğmesi, dönüş eşleştirmesi
 * açarken her ders için karşı kurum notunu 'A', denkliği 'Muaf' yazıyordu.
 * Yani ekranda görünen "A → Muaf" bir gösterim hatası DEĞİL, kayıtta duran
 * veriydi: transkript hiç okunmadan öğrenciye tam not ve muafiyet
 * veriliyordu. Tohumlama koddan kaldırıldı, ama ÖNCEDEN kaydedilmiş
 * kayıtlar bu değerleri taşımaya devam eder.
 *
 * ── HANGİ NOT SAHTE, HANGİSİ GERÇEK ──
 * Canlı veri gösterdi ki ikisi AYNI eşleştirmenin içinde yan yana durur:
 * eski tekil alanlarda tohum, ders bazlı alanlarda akademisyenin girdiği
 * gerçek not. Bu yüzden karar eşleştirme düzeyinde değil, DERS İNDEKSİ
 * düzeyinde verilir ve imza tek bir değer değil, ÇİFTTİR: aynı indekste
 * karşı kurum 'A' VE denklik 'Muaf'. Biri gerçek bir değerle değişmişse
 * (host='10' → 'Muaf') o çifte insan eli değmiştir, dokunulmaz.
 * Kural ve testleri: server/lib/erasmus-tohum-not.js.
 *
 * `erasmusNotOnayi` damgasına güvenilmez: alan yeni eklendi, mevcut
 * kayıtların hiçbirinde yok. Damgalı kayıt yine de baştan atlanır.
 *
 * Boşaltılan ders yeniden not almaz; transkript yüklenip akademisyen
 * onayladığında hesaplanmış hâliyle dolar.
 *
 * Idempotent: ikinci çalıştırmada temizlenecek kayıt bulmaz.
 *
 * Kullanım:
 *   DRY_RUN=1 node server/erasmus-sahte-not-temizle.js   # hiçbir şey yazmaz (ÖNCE BUNU)
 *   node server/erasmus-sahte-not-temizle.js             # yedek alır, sonra yazar
 *
 * İnsan eli değmiş notları da silmek isterseniz (listeyi GÖRDÜKTEN sonra):
 *   ELLE_GIRILENLERI_DE_SIL=1 node server/erasmus-sahte-not-temizle.js
 */
const fs = require('fs');
const path = require('path');
const {
  tohumlariBosalt,
  notlariBosalt,
  notCiftleri,
  tekilSizintisiVarMi,
} = require('./lib/erasmus-tohum-not');

(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';
  const elleDeSil = process.env.ELLE_GIRILENLERI_DE_SIL === '1';

  const ogrenciler = await db.collection('students').find({}).toArray();
  const yapilacak = [];
  const korunanlar = [];
  const sizintililar = [];
  let damgali = 0;

  ogrenciler.forEach((o) => {
    if (!o) return;
    if (o.erasmusNotOnayi === true) {
      damgali++;
      return; // akademisyen onaylamış: notlar transkriptten geldi
    }
    const ad = `${o.firstName || ''} ${o.lastName || ''}`.trim() || String(o.id || o._id);
    const kim = `${ad} (${o.studentNumber || '-'})`;
    const yeni = [];
    const silinecek = [];
    const elle = [];
    const sizinti = [];
    (Array.isArray(o.returnMatches) ? o.returnMatches : []).forEach((m) => {
      if (!m || typeof m !== 'object' || !notCiftleri(m).length) {
        yeni.push(m);
        return;
      }
      if (elleDeSil) {
        yeni.push(notlariBosalt(m));
        silinecek.push(`${m.id || '?'}: tüm notlar`);
        return;
      }
      const { temiz, silinen, kalan } = tohumlariBosalt(m);
      yeni.push(temiz);
      silinen.forEach((d) => silinecek.push(`${m.id || '?'} ${d}`));
      kalan.forEach((d) => elle.push(`${m.id || '?'} ${d}`));
      if (tekilSizintisiVarMi(temiz, (m.hostCourses || []).length)) {
        sizinti.push(`${m.id || '?'}: tekil not ${(m.hostCourses || []).length} derse yayılıyor`);
      }
    });
    if (sizinti.length) sizintililar.push({ kim, sizinti });
    if (elle.length) korunanlar.push({ kim, elle });
    if (silinecek.length) yapilacak.push({ ogrenci: o, kim, returnMatches: yeni, silinecek });
  });

  console.log('-- Durum --');
  console.log(`Öğrenci kaydı: ${ogrenciler.length}`);
  console.log(`Not onayı damgalı (atlanan): ${damgali}`);

  console.log(`\n== TOHUM: 'A' → 'Muaf' çifti — BOŞALTILACAK (${yapilacak.length} öğrenci) ==`);
  yapilacak.forEach((x) => {
    console.log(`  ~ ${x.kim} — ${x.silinecek.length} eşleştirme`);
    x.silinecek.forEach((d) => console.log(`      ${d}`));
  });

  console.log(`\n== GERÇEK NOT — KORUNACAK (${korunanlar.length} öğrenci) ==`);
  korunanlar.forEach((x) => {
    console.log(`  = ${x.kim} — ${x.elle.length} eşleştirme`);
    x.elle.forEach((d) => console.log(`      ${d}`));
  });
  if (sizintililar.length && !elleDeSil) {
    console.log(`\n== GÖZDEN GEÇİRİN: tekil not birden çok derse yayılıyor ==`);
    console.log('  Gösterim ders bazlı not yoksa tekil alana düşer; tek bir');
    console.log('  değer, notu hiç girilmemiş dersleri de dolu gösterir.');
    sizintililar.forEach((x) => {
      console.log(`  ! ${x.kim}`);
      x.sizinti.forEach((d) => console.log(`      ${d}`));
    });
  }

  if (korunanlar.length && !elleDeSil) {
    console.log('\n  Korunan notlar elle girilmiş görünüyor; betik onlara DOKUNMAZ.');
    console.log('  Listeye bakıp bunların da sahte olduğuna karar verirseniz:');
    console.log('    ELLE_GIRILENLERI_DE_SIL=1 node server/erasmus-sahte-not-temizle.js');
  }

  if (!yapilacak.length) {
    console.log('\nTemizlenecek bir sey yok.');
    process.exit(0);
  }
  if (dry) {
    console.log('\nDRY_RUN=1 - hicbir sey yazilmadi.');
    process.exit(0);
  }

  // YAZMADAN ONCE YEDEK
  const dizin = process.env.YEDEK_DIZIN || path.join(__dirname, '..', 'yedek');
  const dosya = path.join(dizin, `erasmus-sahte-not-${Date.now()}.json`);
  try {
    fs.mkdirSync(dizin, { recursive: true });
    fs.writeFileSync(
      dosya,
      JSON.stringify(
        yapilacak.map((x) => ({
          _id: x.ogrenci._id,
          studentNumber: x.ogrenci.studentNumber,
          returnMatches: x.ogrenci.returnMatches,
        })),
        null,
        2
      ),
      'utf8'
    );
    console.log(`\nYedek yazildi: ${dosya}`);
  } catch (e) {
    console.error(`\nYedek YAZILAMADI (${e.message}) - hicbir sey degistirilmedi.`);
    console.error('  YEDEK_DIZIN ile yazilabilir bir dizin verip yeniden deneyin.');
    process.exit(1);
  }

  const col = db.collection('students');
  for (const x of yapilacak) {
    await col.updateOne({ _id: x.ogrenci._id }, { $set: { returnMatches: x.returnMatches } });
    console.log(`~ ${x.kim}: ${x.silinecek.length} eslestirme temizlendi`);
  }
  console.log('\nBitti.');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
