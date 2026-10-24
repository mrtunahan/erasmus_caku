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
 *   3) ŞİFRE ANAHTARI eski adla: şifre yeni ada taşınır (yeni adın şifresi
 *      yoksa) ya da kullanılmayan eski kayıt silinir.
 *   4) BÖLÜM YETKİLİSİ adı eski biçimde: ad düzeltilir, giriş şifresi de
 *      birlikte taşınır.
 * Karşılığı belirsiz (iki kişiye uyan) ya da hiç olmayan adlara dokunmaz.
 *
 * İsteğe bağlı: akademisyen kaydı OLMAYAN adların şifre kayıtları (silinmiş
 * kişiler, uydurma adlarla açılmış kayıtlar) SAHIPSIZ_SIL=1 ile silinir. Bu
 * adlarla giriş zaten kapalıdır; silinen kayıt yedek dosyasında durur.
 *
 * Kullanım (proje kökünden):
 *   node server/ad-atif-onar.js              # kuru: yalnız rapor
 *   UYGULA=1 node server/ad-atif-onar.js     # yedek al + yaz
 *   UYGULA=1 SAHIPSIZ_SIL=1 node server/ad-atif-onar.js   # + sahipsiz şifreleri sil
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
  // Akademisyen kaydı olmayan adların şifre kayıtları: yalnız açıkça istenirse silinir.
  const sahipsizSil = process.env.SAHIPSIZ_SIL === '1';
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
      const hedef = yeni ? await db.collection(kol).findOne({ _id: yeni }) : null;
      // Hedef doluysa kişi yeni adıyla zaten doğrulamış: adres aynıysa eski
      // kayıt yinelenendir (şifremi unuttum iki ileti gönderiyordu), silinir.
      const yinelenen =
        !!hedef &&
        String(hedef.eposta || '').toLowerCase() === String(d.eposta || '').toLowerCase();
      tasinacak.push({ kol, eski, yeni, dolu: !!hedef, yinelenen, belge: d });
    }
  }
  console.log(`\n1) Eski adla kalmış e-posta hesabı: ${tasinacak.length}`);
  tasinacak.forEach((t) =>
    console.log(
      `  • [${t.kol}] "${t.eski}" → ` +
        (t.yeni
          ? `"${t.yeni}"` +
            (t.yinelenen
              ? '  (yeni adla aynı adres zaten kayıtlı — eski yinelenen kayıt SİLİNECEK)'
              : t.dolu
                ? '  (yeni adla FARKLI adres kayıtlı — dokunulmaz, kişiye sorun)'
                : '  (TAŞINACAK)')
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

  // ── 3) Şifre kayıtları ──
  // Ad çevrilirken şifre anahtarı çevrilmemiş kişi eski şifresiyle giremez.
  // Karşılığı TEK kişiye çözülen eski anahtar: yeni adın şifresi yoksa
  // şifre yeni ada TAŞINIR (kişi aynı şifreyle girer); varsa eski kayıt
  // kullanılmıyordur, silinir. Karşılığı olmayan adlara dokunulmaz — giriş
  // artık akademisyen kaydı ister, bu anahtarlarla giriş yapılamaz.
  const META = new Set(['_id', '_docId', '_firestoreId', 'updatedAt', 'createdAt']);
  const sifre = (await db.collection('passwords').findOne({ _id: 'professor_passwords' })) || {};
  const sifreIslem = []; // { eski, yeni, tur: 'tasi'|'sil'|'yok' }
  Object.keys(sifre)
    .filter((k) => !META.has(k) && !adSet.has(k))
    .forEach((k) => {
      const y = yeniAdBul(k, adlar);
      sifreIslem.push({ eski: k, yeni: y, tur: !y ? 'yok' : sifre[y] ? 'sil' : 'tasi' });
    });
  console.log(`\n3) Şifre kaydı olup akademisyeni bulunmayan ad: ${sifreIslem.length}`);
  sifreIslem.forEach((x) =>
    console.log(
      `  • "${x.eski}"` +
        (x.tur === 'tasi'
          ? `  → şifre "${x.yeni}" adına TAŞINACAK`
          : x.tur === 'sil'
            ? `  → "${x.yeni}" kendi şifresini kullanıyor; eski kayıt SİLİNECEK`
            : sahipsizSil
              ? '  → akademisyen kaydı yok; şifre kaydı SİLİNECEK (SAHIPSIZ_SIL=1)'
              : '  → akademisyen kaydı yok (giriş kapalı, dokunulmaz)')
    )
  );

  // ── 4) Bölüm yetkilisi adları ──
  // Ad bölüm yetkilisi GİRİŞİNİN kimliğidir; şifresi de bu adla tutulur.
  // Ad düzeltilirken şifre anahtarı da birlikte taşınır, yoksa giriş kopar.
  const yetkiliSifre =
    (await db.collection('passwords').findOne({ _id: 'department_manager_passwords' })) || {};
  const bolumler = await db
    .collection('departments')
    .find({}, { projection: { name: 1, managerNames: 1, managerName: 1 } })
    .toArray();
  const yetkiliIslem = []; // { _id, bolum, eski, yeni, set }
  bolumler.forEach((d) => {
    const set = {};
    const cevir = (m) => {
      const t = String(m || '').trim();
      if (!t || adSet.has(t)) return m;
      const y = yeniAdBul(t, adlar);
      if (y) yetkiliIslem.push({ bolum: d.name, eski: t, yeni: y });
      return y || m;
    };
    if (Array.isArray(d.managerNames)) {
      const yeni = d.managerNames.map(cevir);
      if (yeni.some((x, i) => x !== d.managerNames[i])) set.managerNames = [...new Set(yeni)];
    }
    if (d.managerName) {
      const y = cevir(d.managerName);
      if (y !== d.managerName) set.managerName = y;
    }
    if (Object.keys(set).length) yetkiliIslem.push({ _id: d._id, set });
  });
  const yetkiliAd = yetkiliIslem.filter((x) => x.eski);
  const yetkiliBelge = yetkiliIslem.filter((x) => x._id);
  console.log(`\n4) Bölüm yetkilisi listesinde eski ad: ${yetkiliAd.length}`);
  const gorulenYetkili = new Set();
  yetkiliAd.forEach((x) => {
    const k = x.bolum + x.eski;
    if (gorulenYetkili.has(k)) return;
    gorulenYetkili.add(k);
    console.log(
      `  • ${x.bolum}: "${x.eski}" → "${x.yeni}"` +
        (yetkiliSifre[x.eski] && !yetkiliSifre[x.yeni] ? '  (giriş şifresi de taşınacak)' : '')
    );
  });

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
          sifreler: sifre,
          yetkiliSifreleri: yetkiliSifre,
          bolumler: bolumler.filter((d) =>
            yetkiliBelge.some((x) => String(x._id) === String(d._id))
          ),
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
    if (t.yinelenen) {
      await db.collection(t.kol).deleteOne({ _id: t.eski });
      await db
        .collection('sifre_sifirlama')
        .updateMany({ hesap: t.eski }, { $set: { hesap: t.yeni } });
      hesapN++;
      continue;
    }
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
  // Şifre belgeleri bütünüyle yazılır: anahtarlar noktalı ad ("Prof. Dr.")
  // olduğu için tek alan güncellemesi kullanılamıyor. Mesai dışında çalıştırın.
  let sifreN = 0;
  const yeniSifre = { ...sifre };
  sifreIslem.forEach((x) => {
    if (x.tur === 'yok' && !sahipsizSil) return;
    if (x.tur === 'tasi') yeniSifre[x.yeni] = yeniSifre[x.eski];
    delete yeniSifre[x.eski];
    sifreN++;
  });
  if (sifreN) {
    await db.collection('passwords').replaceOne({ _id: 'professor_passwords' }, yeniSifre);
  }
  const yeniYetkiliSifre = { ...yetkiliSifre };
  let yetkiliSifreN = 0;
  yetkiliAd.forEach((x) => {
    if (yeniYetkiliSifre[x.eski] && !yeniYetkiliSifre[x.yeni]) {
      yeniYetkiliSifre[x.yeni] = yeniYetkiliSifre[x.eski];
      delete yeniYetkiliSifre[x.eski];
      yetkiliSifreN++;
    }
  });
  if (yetkiliSifreN) {
    await db
      .collection('passwords')
      .replaceOne({ _id: 'department_manager_passwords' }, yeniYetkiliSifre);
  }
  for (const x of yetkiliBelge) {
    await db.collection('departments').updateOne({ _id: x._id }, { $set: x.set });
  }
  console.log(
    `\n✓ Tamamlandı. E-posta hesabı: ${hesapN}, liste belgesi: ${listeDuzelt.length}, ` +
      `imza: ${imzalar.length}, şifre kaydı: ${sifreN}, bölüm yetkilisi: ${yetkiliBelge.length} bölüm.`
  );
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
