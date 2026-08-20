/**
 * KAYDA GEÇMİŞ SAHTE ERASMUS NOTLARINI TEMİZLE.
 *
 * ── SORUN ──
 * "Gidiş Eşleştirmelerinden Hızlı Doldur" düğmesi, dönüş eşleştirmesi
 * açarken her ders için hostGrades[i]='A' ve homeGrades[i]='Muaf'
 * yazıyordu; addMatch('return') de homeGrade:'Muaf' ile açıyordu. Yani
 * ekranda görünen "A → Muaf" bir gösterim hatası DEĞİL, kayıtta duran
 * veriydi: transkript hiç okunmadan öğrenciye tam not ve muafiyet
 * veriliyordu. Tohumlama koddan kaldırıldı, ama ÖNCEDEN kaydedilmiş
 * kayıtlar bu değerleri taşımaya devam eder.
 *
 * ── HANGİ NOT SAHTE, HANGİSİ GERÇEK ──
 * Gerçek not tek bir yerde yazılır: akademisyen onayı (notlariOnayla).
 * O an kayda `erasmusNotOnayi: true` damgası da vurulur. Dolayısıyla
 * ayrım tahmine değil bu damgaya dayanır:
 *
 *   erasmusNotOnayi === true  → notlar transkriptten hesaplanmış, DOKUNULMAZ
 *   damga yok                 → not hiç hesaplanmadı, alanlar boşaltılır
 *
 * Boşaltılan ders yeniden not almaz; transkript yüklenip akademisyen
 * onayladığında hesaplanmış hâliyle dolar.
 *
 * Idempotent: ikinci çalıştırmada temizlenecek kayıt bulmaz.
 *
 * Kullanım:
 *   DRY_RUN=1 node server/erasmus-sahte-not-temizle.js   # hiçbir şey yazmaz (ÖNCE BUNU)
 *   node server/erasmus-sahte-not-temizle.js             # yedek alır, sonra yazar
 */
const fs = require('fs');
const path = require('path');

const NOT_ALANLARI = ['hostGrade', 'homeGrade', 'hostGrades', 'homeGrades'];

const doluMu = (v) => {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.some(doluMu);
  if (typeof v === 'object') return Object.values(v).some(doluMu);
  return true;
};

/** Eşleştirmedeki not alanlarını boşaltır; değişiklik olduysa yeni nesne döner. */
function eslesmeTemizle(m) {
  if (!m || typeof m !== 'object') return null;
  const dolular = NOT_ALANLARI.filter((a) => doluMu(m[a]));
  if (!dolular.length) return null;
  const temiz = { ...m };
  dolular.forEach((a) => delete temiz[a]);
  return { temiz, dolular };
}

(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';

  const ogrenciler = await db.collection('students').find({}).toArray();
  const yapilacak = [];
  let korunan = 0;

  ogrenciler.forEach((o) => {
    if (!o) return;
    if (o.erasmusNotOnayi === true) {
      // Akademisyen onaylamış: notlar transkriptten geldi, elleme.
      if ((o.returnMatches || []).some((m) => eslesmeTemizle(m))) korunan++;
      return;
    }
    const yeni = [];
    const detay = [];
    (Array.isArray(o.returnMatches) ? o.returnMatches : []).forEach((m) => {
      const s = eslesmeTemizle(m);
      if (!s) {
        yeni.push(m);
        return;
      }
      yeni.push(s.temiz);
      detay.push(`${m.id || '?'}: ${s.dolular.join(', ')}`);
    });
    if (detay.length) yapilacak.push({ ogrenci: o, returnMatches: yeni, detay });
  });

  console.log('-- Durum --');
  console.log(`Öğrenci kaydı: ${ogrenciler.length}`);
  console.log(`Onaylı (dokunulmayacak): ${korunan}`);
  console.log(`Sahte not taşıyan: ${yapilacak.length}`);
  yapilacak.forEach((x) => {
    const ad = `${x.ogrenci.firstName || ''} ${x.ogrenci.lastName || ''}`.trim();
    console.log(
      `  ~ ${ad || x.ogrenci.id} (${x.ogrenci.studentNumber || '-'}) — ${x.detay.length} eşleştirme`
    );
    x.detay.forEach((d) => console.log(`      ${d}`));
  });

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
        yapilacak.map((x) => ({ _id: x.ogrenci._id, returnMatches: x.ogrenci.returnMatches })),
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
    console.log(
      `~ ${x.ogrenci.studentNumber || x.ogrenci.id}: ${x.detay.length} eslestirme temizlendi`
    );
  }
  console.log('\nBitti.');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
