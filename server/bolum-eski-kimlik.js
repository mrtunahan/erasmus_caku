/**
 * SAHİPSİZ SLUG'LARI BÖLÜM DOKÜMANINA BAĞLA.
 *
 * ── SORUN ──
 * Bazı kayıtlar bir bölümü artık üretilmeyen bir slug ile anıyor ('gida'),
 * o bölümün DB dokümanının kimliği ise ObjectId. İkisini bağlayan hiçbir şey
 * olmadığı için bölüm veritabanında DURDUĞU HÂLDE o kayıtlar hiçbir bölüme
 * çözülemiyor: akademisyen bölümünde görünmüyor, bölüm ayarı okunmuyor.
 *
 * ── NEDEN ATIFLARI YENİDEN YAZMIYORUZ ──
 * Alternatif, slug taşıyan tüm kayıtları bulup `departmentId`'lerini ObjectId
 * ile değiştirmekti: çok sayıda koleksiyonda çok sayıda yazma, her biri geri
 * alınması zor. Bunun yerine bölüm dokümanına eski kimliği NOT EDİYORUZ:
 * TEK doküman, TEK alan. `kimlikler()` (server/lib/bolum-kimlik.js) ve okuma
 * projeksiyonu bu alanı okuyor, yani slug ile ObjectId her yerde aynı bölümü
 * gösteriyor. Geri almak da alanı silmek kadar basit.
 *
 * Idempotent: alan zaten doğruysa yazmaz.
 *
 * ── EŞLEŞTİRME ADA GÖRE, TEK ADAY ŞARTIYLA ──
 * Slug'ın hangi bölüme ait olduğu, koda gömülü çekirdek listedeki ADINDAN
 * bulunur. Ada birden çok bölüm uyuyorsa hiçbiri seçilmez — yanlış bölüme
 * bağlamak, hiç bağlamamaktan kötüdür.
 *
 * Kullanım:
 *   DRY_RUN=1 node server/bolum-eski-kimlik.js   # hiçbir şey yazmaz (ÖNCE BUNU)
 *   node server/bolum-eski-kimlik.js             # yedek alır, sonra yazar
 *   YEDEK_DIZIN=/root/yedek node server/bolum-eski-kimlik.js
 */
const fs = require('fs');
const path = require('path');
const { kimlikler } = require('./lib/bolum-kimlik');

// shared-components.jsx içindeki gömülü çekirdek liste: slug → bölüm adı.
const GOMULU = {
  bilgisayar: 'Bilgisayar Mühendisliği',
  elektrik: 'Elektrik ve Elektronik Mühendisliği',
  makine: 'Makine Mühendisliği',
  insaat: 'İnşaat Mühendisliği',
  gida: 'Gıda Mühendisliği',
  kimya: 'Kimya Mühendisliği',
};

const adAnahtari = (s) =>
  String(s == null ? '' : s)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^0-9a-zçğıöşü]/g, '');

(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';

  const bolumler = await db.collection('departments').find({}).toArray();
  console.log(`departments: ${bolumler.length} kayıt\n`);

  const bilinenKimlikler = new Set();
  bolumler.forEach((d) => kimlikler(d).forEach((k) => bilinenKimlikler.add(k)));

  const isler = [];
  for (const [slug, ad] of Object.entries(GOMULU)) {
    if (bilinenKimlikler.has(slug)) {
      console.log(`• '${slug}' → zaten bir bölüme bağlı, dokunulmadı`);
      continue;
    }
    const adaylar = bolumler.filter((d) => adAnahtari(d.name) === adAnahtari(ad));
    if (adaylar.length === 0) {
      console.log(`• '${slug}' → '${ad}' adıyla DB'de bölüm yok, atlandı`);
      continue;
    }
    if (adaylar.length > 1) {
      console.log(`• '${slug}' → '${ad}' adına ${adaylar.length} bölüm uyuyor, ATLANDI (belirsiz)`);
      continue;
    }
    isler.push({ slug, bolum: adaylar[0] });
  }

  if (isler.length === 0) {
    console.log('\nYapılacak iş yok.');
    process.exit(0);
  }

  console.log('\n── Yapılacak ──');
  isler.forEach(({ slug, bolum }) => {
    console.log(`• ${bolum.name} (${kimlikler(bolum).join(' · ')})`);
    console.log(`    eskiKimlikler += '${slug}'`);
  });

  if (dry) {
    console.log('\nDRY_RUN=1 — hiçbir şey yazılmadı.');
    process.exit(0);
  }

  // ── YAZMADAN ÖNCE YEDEK ──
  // Alan eklemek geri alınabilir bir işlem ama dokümanın yazma öncesi hâlini
  // saklamak bedava; yedek yazılamıyorsa hiçbir şey yazılmaz.
  // Yedek proje kökü yerine `yedek/` altına yazılır: kök dizin web sunucusu
  // tarafından servis ediliyor olabilir ve `yedek/` zaten .gitignore'da.
  const dizin = process.env.YEDEK_DIZIN || path.join(__dirname, '..', 'yedek');
  const dosya = path.join(dizin, `yedek-bolum-eski-kimlik-${Date.now()}.json`);
  try {
    fs.mkdirSync(dizin, { recursive: true });
    fs.writeFileSync(
      dosya,
      JSON.stringify(
        isler.map((x) => x.bolum),
        null,
        2
      ),
      'utf8'
    );
    console.log(`\nYedek yazıldı: ${dosya}`);
  } catch (e) {
    console.error(`\nYedek YAZILAMADI (${e.message}) — hiçbir şey değiştirilmedi.`);
    console.error('  YEDEK_DIZIN ile yazılabilir bir dizin verip yeniden deneyin.');
    process.exit(1);
  }

  for (const { slug, bolum } of isler) {
    const mevcut = Array.isArray(bolum.eskiKimlikler) ? bolum.eskiKimlikler : [];
    const yeni = [...new Set([...mevcut.map(String), slug])];
    await db
      .collection('departments')
      .updateOne({ _id: bolum._id }, { $set: { eskiKimlikler: yeni } });
    console.log(`✓ ${bolum.name}: eskiKimlikler = [${yeni.join(', ')}]`);
  }

  console.log('\nBitti.');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
