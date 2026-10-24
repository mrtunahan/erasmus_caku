/**
 * AD STANDARDI SONRASI ONARIM — kuru çalışma varsayılan, yedekli.
 *
 * Akademisyen adları büyük harf + standart unvan biçimine çevrildikten sonra
 * (server/ad-standart-gecis.js) kalan iki tür kalıntıyı bulur ve onarır:
 *
 *   1) E-POSTA HESAPLARI eski adla: `hesap_epostalari` / `eposta_dogrulama`
 *      kayıtlarının kimliği "professor:<eski ad>" kaldı. "Şifremi unuttum"
 *      yeni şifreyi eski adın kaydına yazıyordu. (Uygulama da artık ilk
 *      e-posta işleminde kendiliğinden taşıyor; bu betik hepsini bir kerede
 *      yapar.)
 *   2) LİSTEDEKİ ESKİ AD BİÇİMLERİ: sınav gözetmen listesi, ortak ders hocası
 *      ("A / B"), ders programı slotları. Çıktılarda aynı kişi iki biçimde
 *      görünüyordu. Gönderim imzası gözetmen metnini kapsadığı için
 *      fakülteye gönderilmiş programların imzası da tazelenir; aksi hâlde
 *      bu biçim düzeltmesi onları "gönderimden sonra değişti" gösterirdi.
 *
 * Ayrıca YALNIZ RAPOR eder (dokunmaz):
 *   • şifre kaydı olup akademisyeni bulunmayan adlar (girişi olmayan kişi)
 *   • bölüm yetkilisi listesinde akademisyeni bulunmayan adlar
 *
 * Kullanım (proje kökünden):
 *   node server/ad-atif-onar.js              # kuru: yalnız rapor
 *   UYGULA=1 node server/ad-atif-onar.js     # yedek al + yaz
 */
require('dotenv').config();
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { anahtarHaritasi, listeAdlariniStandartla } = require('./lib/ad-degisim');
const { yeniAdBul } = require('./lib/hesap-ad-tasima');

const LISTELI = ['sinav_programi', 'sinav_dersler', 'course_schedules'];
const HESAP_KOL = ['hesap_epostalari', 'eposta_dogrulama'];
const ONEK = 'professor:';

(async () => {
  const { getDbSafe } = require('./config/database');
  const uygula = process.env.UYGULA === '1';
  const db = await getDbSafe();
  console.log(
    uygula ? '▶ UYGULA: yedek alınıp yazılacak.' : '▶ KURU ÇALIŞMA: hiçbir şey yazılmaz.'
  );

  const adlar = (
    await db
      .collection('professors')
      .find({}, { projection: { name: 1 } })
      .toArray()
  )
    .map((p) => String(p.name || '').trim())
    .filter(Boolean);
  const adSet = new Set(adlar);

  // ── 1) E-posta hesapları ──
  const tasinacak = []; // { kol, eski, yeni, dolu }
  for (const kol of HESAP_KOL) {
    const liste = await db
      .collection(kol)
      .find({ _id: { $regex: '^' + ONEK } })
      .toArray();
    for (const d of liste) {
      const eski = String(d._id);
      const ad = eski.slice(ONEK.length);
      if (adSet.has(ad)) continue;
      const yeniAd = yeniAdBul(ad, adlar);
      const yeni = yeniAd ? ONEK + yeniAd : '';
      const dolu = yeni ? !!(await db.collection(kol).findOne({ _id: yeni })) : false;
      tasinacak.push({ kol, eski, yeni, dolu, belge: d });
    }
  }
  console.log(`\n1) Eski adla kalmış e-posta hesabı: ${tasinacak.length}`);
  tasinacak.forEach((t) =>
    console.log(
      `  • [${t.kol}] "${t.eski}" → ` +
        (t.yeni
          ? `"${t.yeni}"` + (t.dolu ? '  (hedef DOLU — atlanır)' : '')
          : 'karşılığı yok/belirsiz — atlanır')
    )
  );

  // ── 2) Listelerdeki eski ad biçimleri ──
  const harita = anahtarHaritasi(adlar);
  const listeDuzelt = []; // { kol, _id, oncesi, sonrasi }
  const ornekler = new Map();
  for (const kol of LISTELI) {
    const belgeler = await db.collection(kol).find({}).toArray();
    let n = 0;
    for (const b of belgeler) {
      const { _id, ...govde } = b;
      const { deger, degisimler } = listeAdlariniStandartla(govde, harita);
      if (!degisimler.length) continue;
      n++;
      listeDuzelt.push({ kol, _id, oncesi: b, sonrasi: deger });
      degisimler.forEach(([e, y]) =>
        ornekler.set(e + ' → ' + y, (ornekler.get(e + ' → ' + y) || 0) + 1)
      );
    }
    console.log(`\n2) ${kol}: düzelecek belge ${n}`);
  }
  // Gönderilmiş programların imzası (lib/sinav-kural-raporu.js → imzaTazelemeleri)
  let imzalar = [];
  const sinavDuzelt = listeDuzelt.filter((l) => l.kol === 'sinav_programi');
  if (sinavDuzelt.length) {
    const { imzaTazelemeleri } = await import('../lib/sinav-kural-raporu.js');
    const { kimlikler } = require('./lib/bolum-kimlik');
    const [once, donemler, gonderimler, depts] = await Promise.all([
      db.collection('sinav_programi').find({}).toArray(),
      db.collection('sinav_donemler').find({}).toArray(),
      db.collection('sinav_gonderimleri').find({}).toArray(),
      db.collection('departments').find({}).toArray(),
    ]);
    const yeniHal = new Map(sinavDuzelt.map((l) => [String(l._id), l.sonrasi]));
    const sonra = once.map((e) =>
      yeniHal.has(String(e._id)) ? { ...e, ...yeniHal.get(String(e._id)) } : e
    );
    const bolumler = depts.map((d) => {
      const k = kimlikler(d);
      return {
        id: String(d._docId || d.id || (d._id && d._id.toString()) || k[0] || ''),
        kimlikler: k,
      };
    });
    imzalar = imzaTazelemeleri({ once, sonra, donemler, gonderimler, bolumler });
  }
  console.log(`\n   Gönderilmiş program imzası tazelenecek: ${imzalar.length}`);

  [...ornekler.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .forEach(([k, n]) => console.log(`  • ${k}  (${n} yer)`));
  if (ornekler.size > 25) console.log(`  … ve ${ornekler.size - 25} farklı ad daha`);

  // ── 3) Yalnız rapor ──
  const sifre = await db.collection('passwords').findOne({ _id: 'professor_passwords' });
  const sahipsiz = Object.keys(sifre || {}).filter(
    (k) => k !== '_id' && k !== '_docId' && !adSet.has(k)
  );
  console.log(`\n3) Şifre kaydı olup akademisyeni bulunmayan ad: ${sahipsiz.length}`);
  sahipsiz.slice(0, 30).forEach((k) => {
    const y = yeniAdBul(k, adlar);
    console.log(
      `  • "${k}"` + (y ? `  (bugünkü adı muhtemelen "${y}" — şifresini yönetici sıfırlamalı)` : '')
    );
  });
  const bolumler = await db
    .collection('departments')
    .find({}, { projection: { name: 1, managerNames: 1, managerName: 1 } })
    .toArray();
  const yetkiliEksik = [];
  bolumler.forEach((d) => {
    []
      .concat(d.managerNames || [])
      .concat(d.managerName ? [d.managerName] : [])
      .forEach((m) => {
        if (m && !adSet.has(String(m).trim())) yetkiliEksik.push(`${d.name}: "${m}"`);
      });
  });
  console.log(`\n4) Bölüm yetkilisi listesinde akademisyeni bulunmayan ad: ${yetkiliEksik.length}`);
  yetkiliEksik.slice(0, 30).forEach((x) => console.log('  • ' + x));

  if (!uygula) {
    console.log('\n[KURU ÇALIŞMA] Yazılmadı. Uygulamak için: UYGULA=1 node server/ad-atif-onar.js');
    process.exit(0);
  }

  // ── YEDEK ──
  const tarih = new Date().toISOString();
  const dizin = process.env.YEDEK_DIZIN || path.join(__dirname, '..', 'yedek');
  const dosya = path.join(dizin, `ad-atif-onar-${tarih.replace(/[:.]/g, '-')}.json`);
  try {
    fs.mkdirSync(dizin, { recursive: true });
    fs.writeFileSync(
      dosya,
      JSON.stringify(
        {
          tarih,
          hesaplar: tasinacak.map((t) => ({ kol: t.kol, belge: t.belge })),
          listeler: listeDuzelt.map((l) => ({ kol: l.kol, _id: l._id, oncesi: l.oncesi })),
          imzalar: imzalar.map((x) => ({ _id: x.kayit._id, eskiImza: x.eskiImza })),
        },
        null,
        2
      ),
      'utf8'
    );
    console.log(`\n💾 Yedek: ${dosya}`);
  } catch (e) {
    console.error(`\n✗ YEDEK YAZILAMADI (${e.message}) — hiçbir şey değiştirilmedi.`);
    process.exit(1);
  }

  // ── YAZ ──
  let hesapN = 0;
  for (const t of tasinacak) {
    if (!t.yeni || t.dolu) continue;
    const { _id, ...govde } = t.belge;
    await db.collection(t.kol).insertOne({ _id: t.yeni, ...govde });
    await db.collection(t.kol).deleteOne({ _id: t.eski });
    await db
      .collection('sifre_sifirlama')
      .updateMany({ hesap: t.eski }, { $set: { hesap: t.yeni } });
    hesapN++;
  }
  for (const l of listeDuzelt) {
    await db.collection(l.kol).replaceOne({ _id: l._id }, l.sonrasi);
  }
  for (const x of imzalar) {
    await db
      .collection('sinav_gonderimleri')
      .updateOne({ _id: x.kayit._id }, { $set: { imza: x.yeniImza } });
  }
  console.log(
    `\n✓ Tamamlandı. Taşınan hesap: ${hesapN}, düzeltilen liste belgesi: ${listeDuzelt.length}, tazelenen imza: ${imzalar.length}.`
  );
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
