/**
 * ERASMUS ÜNİVERSİTELERİNİ KODDAN VERİTABANINA TAŞI + BÖLÜME BAĞLA.
 *
 * ── SORUN ──
 * Beş Erasmus ortağı ders kataloglarıyla birlikte KODA GÖMÜLÜYDÜ
 * (erasmus-learning-agreement.jsx içinde UNIVERSITY_CATALOGS). Bu katalog tek
 * bir bölümün ortaklarıyla doldurulmuştu ama koddan geldiği için HER bölüme
 * gösteriliyordu: bir bölüm, hiç öğrenci göndermediği üniversiteleri kendi
 * eşleştirme geçmişinde görüyordu. Ayrıca `erasmus_universities`
 * koleksiyonundaki kayıtlar bölümsüzdü, yani onlar da herkese açıktı.
 *
 * ── SAHİPLİK TAHMİN EDİLMEZ, VERİDEN TÜRETİLİR ──
 * Bir üniversitenin hangi bölüme ait olduğu `trip_history`den okunur: o kuruma
 * GERÇEKTEN öğrenci gönderen bölüm(ler). Ders adlarına bakıp "bu bilgisayar
 * dersi" diye karar vermek tahmin olurdu; yanlış bölüme bağlanan bir kayıt
 * hiç bağlanmamış olandan kötüdür.
 *
 * Bir kuruma birden çok bölüm öğrenci gönderdiyse her bölüm için AYRI kayıt
 * açılır: bölümler ders listelerini birbirinden bağımsız düzenleyebilsin.
 *
 * Geçmişte hiç görünmeyen kurumun sahibi veriden bilinemez. Bunlar atlanır ve
 * listelenir; hepsini tek bir bölüme vermek isterseniz:
 *   VARSAYILAN_BOLUM=<bölüm kimliği> node server/erasmus-katalog-tasi.js
 *
 * Idempotent: aynı (ad, bölüm) çifti için ikinci kayıt açmaz.
 *
 * Kullanım:
 *   DRY_RUN=1 node server/erasmus-katalog-tasi.js   # hiçbir şey yazmaz (ÖNCE BUNU)
 *   node server/erasmus-katalog-tasi.js             # yedek alır, sonra yazar
 */
const fs = require('fs');
const path = require('path');
const { bolumKimlikHaritasi, kimlikler } = require('./lib/bolum-kimlik');

const TOHUM = path.join(__dirname, 'data', 'erasmus-katalog-tohum.json');

(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';
  const varsayilan = String(process.env.VARSAYILAN_BOLUM || '');

  const bolumler = await db.collection('departments').find({}).toArray();
  const harita = bolumKimlikHaritasi(bolumler);
  const bolumAdi = {};
  bolumler.forEach((d) => kimlikler(d).forEach((k) => (bolumAdi[k] = d.name || k)));
  const ad = (k) => bolumAdi[k] || k;

  if (varsayilan && !harita.kanonik[varsayilan]) {
    console.error(`VARSAYILAN_BOLUM='${varsayilan}' hicbir bolume uymuyor. Cikiliyor.`);
    process.exit(1);
  }

  // Kurum -> o kuruma ogrenci gondermis bolumler
  const gecmis = await db.collection('trip_history').find({}).toArray();
  const sahipler = new Map();
  gecmis.forEach((h) => {
    const kurum = h && h.hostInstitution;
    const bol = h && h.departmentId;
    if (!kurum || !bol) return;
    const kanonik = harita.kanonik[String(bol)];
    if (!kanonik) return; // silinmis bolum - sahiplik kurulamaz
    if (!sahipler.has(kurum)) sahipler.set(kurum, new Set());
    sahipler.get(kurum).add(kanonik);
  });

  const tohum = JSON.parse(fs.readFileSync(TOHUM, 'utf8'));
  const mevcut = await db.collection('erasmus_universities').find({}).toArray();
  const anahtar = (isim, bol) => `${isim}||${bol}`;
  const varOlan = new Set(
    mevcut
      .filter((u) => u.departmentId)
      .map((u) => anahtar(u.name, harita.kanonik[String(u.departmentId)] || String(u.departmentId)))
  );

  const eklenecek = [];
  const damgalanacak = [];
  const sahipsiz = [];

  const sahipCoz = (isim) => {
    const s = sahipler.get(isim);
    if (s && s.size) return [...s];
    if (varsayilan) return [harita.kanonik[varsayilan]];
    return [];
  };

  // 1) Koda gomulu katalog -> koleksiyona
  tohum.forEach((u) => {
    const sahip = sahipCoz(u.name);
    if (!sahip.length) {
      sahipsiz.push({ isim: u.name, kaynak: 'gomulu katalog' });
      return;
    }
    sahip.forEach((bol) => {
      if (varOlan.has(anahtar(u.name, bol))) return;
      eklenecek.push({ ...u, departmentId: bol });
      varOlan.add(anahtar(u.name, bol));
    });
  });

  // 2) Koleksiyondaki bolumsuz kayitlar -> damgala
  mevcut.forEach((u) => {
    if (u.departmentId) return;
    const sahip = sahipCoz(u.name);
    if (!sahip.length) {
      sahipsiz.push({ isim: u.name, kaynak: 'erasmus_universities' });
      return;
    }
    // Ilk sahip mevcut kayda yazilir; varsa digerleri icin kopya acilir.
    damgalanacak.push({ kayit: u, departmentId: sahip[0] });
    sahip.slice(1).forEach((bol) => {
      if (varOlan.has(anahtar(u.name, bol))) return;
      eklenecek.push({
        name: u.name,
        country: u.country || '',
        courses: u.courses || [],
        departmentId: bol,
      });
      varOlan.add(anahtar(u.name, bol));
    });
  });

  console.log('-- Yapilacak --');
  console.log(`\nYeni kayit: ${eklenecek.length}`);
  eklenecek.forEach((u) =>
    console.log(`  + ${u.name} -> ${ad(u.departmentId)} (${(u.courses || []).length} ders)`)
  );
  console.log(`\nBolum damgasi eklenecek: ${damgalanacak.length}`);
  damgalanacak.forEach((x) => console.log(`  ~ ${x.kayit.name} -> ${ad(x.departmentId)}`));
  console.log(`\nSahibi VERIDEN BILINEMEYEN: ${sahipsiz.length}`);
  sahipsiz.forEach((x) => console.log(`  ? ${x.isim}  (${x.kaynak})`));
  if (sahipsiz.length && !varsayilan) {
    console.log('\n  Bu kurumlara hicbir bolum ogrenci gondermemis; sahiplik veriden');
    console.log('  cikarilamiyor. Hepsini tek bir bolume vermek icin:');
    console.log('    VARSAYILAN_BOLUM=<bolum kimligi> node server/erasmus-katalog-tasi.js');
  }

  if (!eklenecek.length && !damgalanacak.length) {
    console.log('\nYazilacak bir sey yok.');
    process.exit(0);
  }
  if (dry) {
    console.log('\nDRY_RUN=1 - hicbir sey yazilmadi.');
    process.exit(0);
  }

  // YAZMADAN ONCE YEDEK
  const dizin = process.env.YEDEK_DIZIN || path.join(__dirname, '..', 'yedek');
  const dosya = path.join(dizin, `erasmus-universities-${Date.now()}.json`);
  try {
    fs.mkdirSync(dizin, { recursive: true });
    fs.writeFileSync(dosya, JSON.stringify(mevcut, null, 2), 'utf8');
    console.log(`\nYedek yazildi: ${dosya}`);
  } catch (e) {
    console.error(`\nYedek YAZILAMADI (${e.message}) - hicbir sey degistirilmedi.`);
    console.error('  YEDEK_DIZIN ile yazilabilir bir dizin verip yeniden deneyin.');
    process.exit(1);
  }

  const col = db.collection('erasmus_universities');
  for (const x of damgalanacak) {
    await col.updateOne({ _id: x.kayit._id }, { $set: { departmentId: x.departmentId } });
    console.log(`~ ${x.kayit.name} -> ${ad(x.departmentId)}`);
  }
  for (const u of eklenecek) {
    await col.insertOne({ ...u, createdAt: new Date().toISOString() });
    console.log(`+ ${u.name} -> ${ad(u.departmentId)}`);
  }
  console.log('\nBitti.');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
