// ══════════════════════════════════════════════════════════════
// SINAV ÇAKIŞMALARI VE ŞARTLI KABUL
//
// Çakışma denetimi bugüne kadar TEK BİR NOKTADA vardı: ders takvime
// bırakılırken, aynı bölümün aynı sınıfı için. Geri kalan her şey
// denetimsizdi ve sonucu ancak sınav günü görülüyordu:
//   • İki bölüm aynı saatte aynı salonu alabiliyordu (salonlar bölüm bölüm
//     tanımlı, kimse fakülte genelini görmüyor).
//   • Aynı gözetmen iki bölümün programında aynı saate düşebiliyordu
//     (gözetmen ataması yalnız kendi dışa aktarma çalışması içinde çakışma
//     gözetiyor).
//
// ⚠ AMA HER ÇAKIŞMA HATA DEĞİLDİR. Fakültede bir salonda iki farklı bölümün
// sınavı bilerek birlikte yapılabiliyor (kapasite yetiyorsa) ve o salonu tek
// gözetmen gözetebiliyor. Bu yüzden denetim İKİ SEVİYELİDİR:
//
//   engel  — fiziksel olarak imkânsız. Kapasite yetmiyor, gözetmen iki ayrı
//            salonda olamaz, aynı sınıf iki sınava giremez. Kabul edilemez.
//   uyari  — mümkün ama bilinçli karar ister. Yetkili SEBEBİNİ yazarak
//            "şartlı kabul" eder; kabul kayda geçer, kim ne zaman kabul etti
//            görünür.
//
// Kabul edilen çakışma yok sayılmaz — listede "şartlı kabul edildi" olarak
// sebebiyle durur. Sessizce yok saymak, denetimi hiç yapmamakla aynı şeydir.
// ══════════════════════════════════════════════════════════════

import { birlesimKimligi, grupUyeleri, oturumOzeti, kodAnahtari } from './sinav-birlesim.js';
import { kisiAnahtari } from './akademik-unvan.js';
import { egitmenleriCoz } from './ders-egitmenleri.js';
import { dersinOgrenciNolari } from './ogrenci-ders-secimi.js';

const metin = (v) => String(v == null ? '' : v).trim();
const sayi = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** "08:30" → dakika. Geçersizse -1. */
export function dakikaya(saat) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(metin(saat));
  if (!m) return -1;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Sınavın [başlangıç, bitiş) dakika aralığı. */
export function araligi(sinav) {
  const bas = dakikaya(sinav && sinav.timeSlot);
  if (bas < 0) return null;
  const sure = sayi(sinav && sinav.duration) || 60;
  return [bas, bas + sure];
}

/** İki sınav aynı gün ve örtüşen saatte mi? */
export function zamanCakisiyorMu(a, b) {
  if (!a || !b) return false;
  if (metin(a.date) !== metin(b.date) || !metin(a.date)) return false;
  const ra = araligi(a);
  const rb = araligi(b);
  if (!ra || !rb) return false;
  return ra[0] < rb[1] && rb[0] < ra[1];
}

/** Salon adı birden çok salon taşıyabilir: "M11101 - M10Z07". */
export function salonlari(sinav) {
  // Ayraç " - " (boşluklu) ya da eski virgüllü yazım; "A-101" tek salondur.
  return metin(sinav && sinav.room)
    .split(/\s+-\s+|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Gözetmen adları virgülle ayrılır. */
export function gozetmenleri(sinav) {
  return metin(sinav && sinav.supervisor)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── KİŞİ KARŞILAŞTIRMASI ──
// Adlar harfi harfine karşılaştırılıyordu: "Dr. Ali Veli" ile "Ali VELİ" iki
// ayrı kişi sayılıp çakışma kaçıyordu. Karşılaştırma unvanı ve büyük/küçük
// harfi yok sayan kişi anahtarıyla yapılır (lib/akademik-unvan.js).
// Türkçe harfler ASCII'ye katlanır: "Özgür Yılmaz" ile "Ozgur Yilmaz" aynı
// kişidir (sunucudaki kural da böyle: server/lib/sinav-programi-yazma.js).
const asciiKatla = (k) =>
  k
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u');
const kisiAnahtariGuvenli = (ad) =>
  asciiKatla(kisiAnahtari(ad) || metin(ad).toLocaleLowerCase('tr-TR'));

/** { kişiAnahtarı: ilk görülen yazım } */
function kisiHaritasi(adlar) {
  const h = new Map();
  adlar.forEach((ad) => {
    const k = kisiAnahtariGuvenli(ad);
    if (k && !h.has(k)) h.set(k, ad);
  });
  return h;
}

/** Dersi veren öğretim elemanları ("A / B" birleşik yazım da çözülür). */
export function hocalari(sinav) {
  return egitmenleriCoz(
    [].concat((sinav && sinav.professors) || [], (sinav && sinav.professor) || [])
  );
}

// Birlikte yapılan sınavlar (ortak oturum) tek kimlikle anılır: oturumun
// üç şubesi aynı salonda başka bir sınavla karşılaşınca üç ayrı uyarı değil,
// tek uyarı çıkar.
function sinavAnahtari(s) {
  const b = birlesimKimligi(s);
  if (b) return 'B:' + b;
  return metin(s && (s.id || (s.code || '') + (s.date || '') + (s.timeSlot || '')));
}

/** Çakışma kimliği — çifte sırası fark etmez, iki taraf aynı kaydı görür. */
export function cakismaAnahtari(tur, a, b, ek) {
  const ikisi = [sinavAnahtari(a), sinavAnahtari(b)].sort();
  return [tur, metin(ek), ikisi[0], ikisi[1]].filter(Boolean).join('|');
}

const ad = (s) => metin(s && s._oturumKodu) || metin(s && s.code) || metin(s && s.name) || '(ders)';
// Oturumun salondaki öğrenci sayısı: birleşik sınavlarda üyelerin toplamı.
const ogrenci = (s) =>
  s && s._oturumOgrenci != null ? s._oturumOgrenci : sayi(s && s.studentCount);
const bolum = (s) => metin(s && s.departmentId);

/**
 * Salon çakışması.
 *
 * Aynı salonda saatleri örtüşen (1 dakika bile) iki AYRI oturum olamaz —
 * kapasite yetse de engeldir. Birlikte yapılacak sınavlar ortak oturum
 * olarak birleştirilir (birleşik oturum tek oturum sayılır).
 */
function salonCakismasi(a, b, salon, kapasiteler, ayniAndaToplam) {
  const kap = sayi((kapasiteler || {})[salon]);
  const toplam = ogrenci(a) + ogrenci(b);
  // Salonda aynı anda ikiden çok oturum varsa kapasite hepsinin toplamıyla
  // ölçülür: üç 40'lık sınav 100 kişilik salona sığmaz.
  const doluluk = Math.max(toplam, sayi(ayniAndaToplam));
  const ayriBolum = bolum(a) && bolum(b) && bolum(a) !== bolum(b);
  const yeter = kap > 0 && doluluk <= kap;
  return {
    tur: 'salon',
    ek: salon,
    // Aynı salonda saatleri örtüşen iki ayrı oturum OLAMAZ (1 dakika bile):
    // kapasite yetse de engeldir. Birlikte yapılacaksa oturumlar birleştirilir.
    seviye: 'engel',
    baslik: salon + ' salonu aynı saatte iki sınava ayrılmış',
    aciklama:
      ad(a) +
      ' (' +
      ogrenci(a) +
      ' öğrenci) ve ' +
      ad(b) +
      ' (' +
      ogrenci(b) +
      ' öğrenci)' +
      (ayriBolum ? ' — farklı bölümler' : '') +
      '. Toplam ' +
      toplam +
      ' öğrenci' +
      (doluluk > toplam ? ' (salonda aynı anda ' + doluluk + ' öğrenci)' : '') +
      ', salon kapasitesi ' +
      (kap > 0 ? kap : 'tanımsız') +
      '.',
    cozum: yeter
      ? 'Aynı salonda saatleri örtüşen iki ayrı sınav olamaz. Birlikte yapılacaksa ortak oturum olarak birleştirin; değilse birini başka saate ya da salona alın.'
      : 'Kapasite de yetmiyor. Sınavlardan birini başka saate ya da salona alın.',
  };
}

/**
 * Gözetmen çakışması.
 *
 * Aynı gözetmen aynı saatte iki sınavda olabilir — YALNIZ ikisi de aynı
 * salondaysa. Farklı salonlarda fiziksel olarak imkânsızdır.
 */
function gozetmenCakismasi(a, b, kisi) {
  const ortakSalon = salonlari(a).some((s) => salonlari(b).includes(s));
  return {
    tur: 'gozetmen',
    ek: kisi,
    seviye: ortakSalon ? 'uyari' : 'engel',
    baslik: kisi + ' aynı saatte iki sınavda görevli',
    aciklama:
      ad(a) +
      ' ve ' +
      ad(b) +
      ' sınavları aynı saatte' +
      (ortakSalon ? ' ve aynı salonda.' : ' ama farklı salonlarda.'),
    cozum: ortakSalon
      ? 'Aynı salon olduğu için tek gözetmen ikisini birden gözetebilir.'
      : 'Gözetmen iki salonda birden bulunamaz; birine başka gözetmen atayın.',
  };
}

/**
 * Dersi veren öğretim elemanı çakışması.
 *
 * Hoca gözetmen olarak yazılmadıkça kendi sınavında bulunmak zorunda
 * değildir; yine de aynı saatte iki bölümde iki dersinin sınavı varsa
 * öğrencinin soru sorabileceği kimse kalmaz. Bu yüzden uyarıdır.
 */
function hocaCakismasi(a, b, kisi) {
  return {
    tur: 'hoca',
    ek: kisi,
    seviye: 'uyari',
    baslik: kisi + ' dersinin iki sınavı aynı saatte',
    aciklama:
      ad(a) +
      ' ve ' +
      ad(b) +
      ' sınavları aynı saatte' +
      (bolum(a) && bolum(b) && bolum(a) !== bolum(b) ? ' (farklı bölümler).' : '.'),
    cozum:
      'Öğretim elemanı iki sınavda birden bulunamaz. Birlikte yapılacaksa "Ortak sınav yap" ile tek oturum yapın değilse birini başka saate alın ya da bilerek kabul edin.',
  };
}

/**
 * Ortak öğrenci çakışması — farklı derslerin sınavlarında AYNI öğrenciler.
 *
 * Sınıf çakışması yalnız aynı bölümün aynı sınıfını görür; başka bölümden
 * ders alan (alttan, seçmeli, ÇAP/yandal, servis dersi) öğrenci kaçıyordu.
 * Dönem ders seçimlerinden gerçek ortak öğrenci sayılır. Öğrenci iki sınava
 * birden giremez ama mazeret sınavıyla çözülebilir; bu yüzden uyarıdır.
 */
function ogrenciCakismasi(a, b, sayisi) {
  return {
    tur: 'ogrenci',
    ek: '',
    seviye: 'uyari',
    baslik: 'Bu iki sınavda ' + sayisi + ' ortak öğrenci var',
    aciklama:
      ad(a) +
      ' ve ' +
      ad(b) +
      ' aynı gün ve saatte; ' +
      sayisi +
      ' öğrenci iki dersi birden seçmiş' +
      (bolum(a) && bolum(b) && bolum(a) !== bolum(b) ? ' (farklı bölümlerin sınavları).' : '.'),
    cozum:
      'Bu öğrenciler iki sınava birden giremez. Birini başka saate alın; kabul ederseniz (örn. mazeret sınavı) sebebini yazın.',
  };
}

/**
 * Sınıf çakışması — aynı bölümün aynı sınıfı aynı saatte iki sınavda.
 *
 * Seçmeli ders (sinif = 5) karışıyorsa öğrenci kümeleri ayrışmış olabilir;
 * bunu sistem bilemez, yetkili bilir. Bu yüzden uyarıdır.
 */
function sinifCakismasi(a, b) {
  const secmeli = sayi(a.sinif) === 5 || sayi(b.sinif) === 5;
  return {
    tur: 'sinif',
    ek: bolum(a) + ':' + sayi(a.sinif),
    seviye: secmeli ? 'uyari' : 'engel',
    baslik:
      sayi(a.sinif) === 5
        ? 'Seçmeli derslerde saat çakışması'
        : sayi(a.sinif) + '. sınıf aynı saatte iki sınavda',
    aciklama: ad(a) + ' ve ' + ad(b) + ' aynı gün ve saatte.',
    cozum: secmeli
      ? 'Seçmeli derslerde öğrenci kümeleri ayrışıyorsa sorun olmayabilir; ortak öğrenci yoksa kabul edin.'
      : 'Aynı sınıfın öğrencileri iki sınava birden giremez; birini başka saate alın.',
  };
}

/**
 * Bütün çakışmaları bulur.
 *
 * @param {Array} sinavlar  yerleştirilmiş sınavlar (fakülte geneli verilmeli)
 * @param {object} [secenekler]
 *        salonKapasiteleri: { 'M11101': 42, … }
 *        kabuller: [{ anahtar, sebep, kabulEden, tarih }]
 *        ortakOgrenci: (a, b) => number   iki sınavın ortak öğrenci sayısı
 *                      (bkz. ortakOgrenciSayaci); verilmezse denetlenmez
 */
export function cakismalariBul(sinavlar, secenekler) {
  const s = secenekler || {};
  const kapasiteler = s.salonKapasiteleri || {};
  const kabulHaritasi = new Map();
  (s.kabuller || []).forEach((k) => {
    if (k && metin(k.anahtar)) kabulHaritasi.set(metin(k.anahtar), k);
  });

  const ham = Array.isArray(sinavlar) ? sinavlar.filter(Boolean) : [];
  // Birleşik sınavlara oturum bilgisi eklenir (kodlar ve toplam öğrenci);
  // kaynak nesneler değiştirilmez.
  const liste = ham.map((x) => {
    if (!birlesimKimligi(x)) return x;
    const o = oturumOzeti(grupUyeleri(x, ham));
    return { ...x, _oturumKodu: o.kodlar.join(' + '), _oturumOgrenci: o.toplamOgrenci };
  });
  const bulunan = [];
  const eklendi = new Set();

  // digerEkler: aynı kişinin öbür yazımları — önceki sürüm anahtarı a'nın
  // yazımıyla kuruyordu; o yazımla kaydedilmiş kabul de bulunur.
  const ekle = (ham, a, b, digerEkler) => {
    const anahtar = cakismaAnahtari(ham.tur, a, b, ham.ek);
    if (eklendi.has(anahtar)) return;
    eklendi.add(anahtar);
    const kabul =
      kabulHaritasi.get(anahtar) ||
      (digerEkler || [])
        .map((e) => kabulHaritasi.get(cakismaAnahtari(ham.tur, a, b, e)))
        .find(Boolean) ||
      null;
    bulunan.push({
      ...ham,
      anahtar,
      sinavlar: [a, b],
      // Engel seviyesindeki çakışma kabul EDİLEMEZ; kayıtta kabul olsa bile
      // yok sayılır — fiziksel imkânsızlık onaylanarak ortadan kalkmaz.
      kabulEdilebilir: ham.seviye === 'uyari',
      kabul: ham.seviye === 'uyari' ? kabul : null,
      // Kural değişince (ör. aynı salonda örtüşme artık engel) eski kabul
      // sessizce kaybolmasın: ekranda "bu kabul artık geçersiz" yazılır.
      eskiKabul: ham.seviye === 'uyari' ? null : kabul,
    });
  };

  for (let i = 0; i < liste.length; i++) {
    for (let j = i + 1; j < liste.length; j++) {
      const a = liste[i];
      const b = liste[j];
      if (!zamanCakisiyorMu(a, b)) continue;
      // Aynı oturumun sınavları bilerek birlikte yapılıyor (şubeler, farklı
      // müfredatlar, ortak salon) — birbirleriyle çakışma sayılmaz.
      if (birlesimKimligi(a) && birlesimKimligi(a) === birlesimKimligi(b)) continue;

      salonlari(a).forEach((salon) => {
        if (!salonlari(b).includes(salon)) return;
        // a ve b ile aynı anda bu salonda olan bütün oturumlar (her oturum
        // bir kez: birleşik oturumun üyeleri toplamı zaten taşır).
        const gorulen = new Set();
        let ayniAnda = 0;
        liste.forEach((x) => {
          if (!salonlari(x).includes(salon)) return;
          if (!zamanCakisiyorMu(x, a) || !zamanCakisiyorMu(x, b)) return;
          const k = birlesimKimligi(x) || metin(x.id) || x;
          if (gorulen.has(k)) return;
          gorulen.add(k);
          ayniAnda += ogrenci(x);
        });
        ekle(salonCakismasi(a, b, salon, kapasiteler, ayniAnda), a, b);
      });

      // Kişinin iki yazımı farklıysa anahtardaki ad sıradan bağımsız seçilir
      // (alfabetik ilk): liste sırası değişince şartlı kabul kaybolmasın.
      // Aynı yazımda eski ad kullanılır, önceki kabullerin anahtarı değişmez.
      const sabitAd = (x, y) => (x === y ? x : [x, y].sort()[0]);
      const gozB = kisiHaritasi(gozetmenleri(b));
      kisiHaritasi(gozetmenleri(a)).forEach((adA, k) => {
        if (!gozB.has(k)) return;
        ekle(gozetmenCakismasi(a, b, sabitAd(adA, gozB.get(k))), a, b, [adA, gozB.get(k)]);
      });

      // Aynı dersin şubeleri aynı saatte farklı salonlarda yapılabilir;
      // hoca çakışması yalnız FARKLI derslerin sınavları arasında aranır
      // ("FZK 181" ile "FZK181" aynı koddur).
      if (kodAnahtari(a.code) !== kodAnahtari(b.code)) {
        const hocaB = kisiHaritasi(hocalari(b));
        kisiHaritasi(hocalari(a)).forEach((adA, k) => {
          if (hocaB.has(k))
            ekle(hocaCakismasi(a, b, sabitAd(adA, hocaB.get(k))), a, b, [adA, hocaB.get(k)]);
        });
      }

      const sinifCakisiyor =
        bolum(a) && bolum(a) === bolum(b) && sayi(a.sinif) > 0 && sayi(a.sinif) === sayi(b.sinif);
      const ortak =
        typeof s.ortakOgrenci === 'function' && kodAnahtari(a.code) !== kodAnahtari(b.code)
          ? sayi(s.ortakOgrenci(a, b))
          : 0;
      if (sinifCakisiyor) {
        const c = sinifCakismasi(a, b);
        if (ortak > 0) c.aciklama += ' ' + ortak + ' ortak öğrenci.';
        ekle(c, a, b);
      } else if (ortak > 0) {
        ekle(ogrenciCakismasi(a, b, ortak), a, b);
      }
    }
  }

  // Oturumun KENDİ kapasitesi: birleşik ya da tek sınavın toplam öğrencisi
  // salon(lar)ının toplam kapasitesini aşıyorsa fiziksel engeldir (ikili
  // karşılaştırma bunu görmez: birleşince 40 + 35 öğrenci 42 kişilik salonda).
  const oturumGoruldu = new Set();
  liste.forEach((x) => {
    const k = birlesimKimligi(x) || metin(x.id) || x;
    if (oturumGoruldu.has(k)) return;
    oturumGoruldu.add(k);
    // Oturumun salonları BÜTÜN üyelerden toplanır (bölümler arası ortak
    // oturumda salonu yalnız bir üye girmiş olabilir; yalnız ilk üyeye bakınca
    // denetim liste sırasına bağlı kalıyordu).
    const bid = birlesimKimligi(x);
    const uyeler = bid ? liste.filter((y) => birlesimKimligi(y) === bid) : [x];
    const salonlar = [...new Set(uyeler.flatMap((y) => salonlari(y)))];
    if (salonlar.length === 0) return;
    const kapasite = salonlar.map((sl) => sayi(kapasiteler[sl]));
    if (kapasite.some((c) => !(c > 0))) return; // kapasitesi bilinmeyen salon varsa denetlenmez
    const toplamKap = kapasite.reduce((t, c) => t + c, 0);
    const n = ogrenci(x);
    if (n <= toplamKap) return;
    ekle(
      {
        tur: 'kapasite',
        ek: salonlar.join(' - '),
        seviye: 'engel',
        baslik: ad(x) + ' salona sığmıyor',
        aciklama: n + ' öğrenci, ' + salonlar.join(' - ') + ' toplam kapasitesi ' + toplamKap + '.',
        cozum:
          'Oturuma salon ekleyin ya da daha büyük bir salona alın ("Salon ve gözetmen ata" ' +
          'yetmeyen salona kapasite için salon ekler).',
      },
      x,
      x
    );
  });

  // Engeller önce, sonra kabul bekleyen uyarılar, en sonda kabul edilmişler.
  const sira = (c) => (c.seviye === 'engel' ? 0 : c.kabul ? 2 : 1);
  return bulunan.sort(
    (x, y) =>
      sira(x) - sira(y) || x.tur.localeCompare(y.tur, 'tr') || x.anahtar.localeCompare(y.anahtar)
  );
}

/**
 * Ortak öğrenci sayacı — cakismalariBul'un `ortakOgrenci` seçeneği için.
 *
 * Her sınavın öğrencileri, dersinin dönem ders seçimlerinden çıkarılır
 * (Ders Odaları ve Dijital Yoklama ile AYNI kural: dersinOgrenciNolari).
 * Sınav kaydında `courseId` yoksa aynı kodlu ders kayıtlarına bakılır.
 *
 * @param {object} p
 * @param {object[]} p.dersler          sinav_dersler (id, code)
 * @param {object[]} p.donemKayitlari   student_courses
 * @param {object[]} p.ogrenciKayitlari students
 * @param {string}   p.donem            '2026-2027_guz'
 * @param {boolean}  [p.eskiListe]      eski myCourseIds sayılsın mı
 * @returns {(a, b) => number}
 */
export function ortakOgrenciSayaci(p) {
  const o = p || {};
  const kodAnahtari = (k) => metin(k).toLocaleUpperCase('tr-TR').replace(/\s+/g, '');
  const kodaGore = new Map();
  (o.dersler || []).forEach((d) => {
    const k = kodAnahtari(d && d.code);
    if (!k) return;
    if (!kodaGore.has(k)) kodaGore.set(k, []);
    kodaGore.get(k).push(metin(d.id));
  });
  const onbellek = new Map();
  const ogrencileri = (sinav) => {
    const idler = metin(sinav.courseId)
      ? [metin(sinav.courseId)]
      : kodaGore.get(kodAnahtari(sinav.code)) || [];
    const anahtar = idler.join('|');
    if (!onbellek.has(anahtar)) {
      onbellek.set(
        anahtar,
        new Set(
          dersinOgrenciNolari({
            dersIdleri: idler,
            donem: o.donem,
            donemKayitlari: o.donemKayitlari,
            ogrenciKayitlari: o.ogrenciKayitlari,
            eskiListe: !!o.eskiListe,
          })
        )
      );
    }
    return onbellek.get(anahtar);
  };
  return (a, b) => {
    const x = ogrencileri(a);
    const y = ogrencileri(b);
    if (!x.size || !y.size) return 0;
    let n = 0;
    (x.size < y.size ? x : y).forEach((no) => {
      if ((x.size < y.size ? y : x).has(no)) n++;
    });
    return n;
  };
}

/** Sayaçlar — başlıkta ve dışa aktarma kapısında kullanılır. */
export function cakismaOzeti(cakismalar) {
  const liste = Array.isArray(cakismalar) ? cakismalar : [];
  return {
    toplam: liste.length,
    engel: liste.filter((c) => c.seviye === 'engel').length,
    bekleyen: liste.filter((c) => c.seviye === 'uyari' && !c.kabul).length,
    kabul: liste.filter((c) => c.kabul).length,
  };
}

/**
 * Program resmî çıktıya hazır mı?
 *
 * Engel varsa hayır. Kabul bekleyen uyarı varsa da hayır — yetkili ya
 * düzeltir ya şartlı kabul eder; "görmezden gel" bir seçenek değildir.
 */
export function programHazirMi(cakismalar) {
  const o = cakismaOzeti(cakismalar);
  return o.engel === 0 && o.bekleyen === 0;
}

/**
 * Kabul kaydının BELGE KİMLİĞİ. Çakışma anahtarı "|" ve kişi adı taşır
 * ("kisi|celalettin kaya|…"); sunucu belge kimliğinde "|" kabul etmez ve
 * 200 karakter sınırı vardır. Anahtardan iki ayrı FNV-1a özetiyle sabit,
 * güvenli bir kimlik üretilir; anahtarın kendisi kaydın içinde durur
 * (eşleştirme o alanla yapılır).
 */
export function kabulBelgeKimligi(anahtar) {
  const m = metin(anahtar);
  const ozet = (tohum) => {
    let h = tohum >>> 0;
    for (let i = 0; i < m.length; i++) {
      h ^= m.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  };
  return 'kabul_' + ozet(2166136261) + ozet(0x811c9dc5 ^ 0x5bd1e995);
}

/** Şartlı kabul kaydı. Sebep zorunludur: kabulün gerekçesi kayda geçmeli. */
export function kabulKaydi(cakisma, sebep, kullanici) {
  const s = metin(sebep);
  if (!cakisma || !cakisma.kabulEdilebilir) {
    return { olur: false, sebep: 'Bu çakışma fiziksel bir engeldir, şartlı kabul edilemez.' };
  }
  if (s.length < 3) {
    return { olur: false, sebep: 'Kabul sebebini yazın — kayda geçecek.' };
  }
  return {
    olur: true,
    kayit: {
      anahtar: cakisma.anahtar,
      kimlik: kabulBelgeKimligi(cakisma.anahtar),
      tur: cakisma.tur,
      // Çakışmanın bölümleri: sunucu kabulü yalnız bu bölümlerden birinin
      // yetkilisine yazdırır.
      bolumler: [
        ...new Set(
          (Array.isArray(cakisma.sinavlar) ? cakisma.sinavlar : [])
            .map((x) => metin(x && x.departmentId))
            .filter(Boolean)
        ),
      ],
      sebep: s,
      kabulEden: metin(kullanici && (kullanici.name || kullanici.identifier)),
      tarih: new Date().toISOString(),
    },
  };
}

// ══════════════════════════════════════════════════════════════
// GÖZETMEN MÜSAİTLİĞİ
//
// Otomatik atama bugüne kadar gözetmenin O GÜN görevde olup olmadığını
// bilmiyordu: izinli, görevli ya da kurul günü olan hoca da listeye
// düşüyordu ve düzeltme elle yapılıyordu. Müsait olmadığı günler artık
// akademisyen kaydında tutulur (professors.gozetmenMusaitsizGunler) ve
// atama bunu atlar.
// ══════════════════════════════════════════════════════════════

/** Kişinin müsait olmadığı günler — gün listesi (YYYY-AA-GG). */
export function musaitsizGunler(kisiKaydi) {
  const ham =
    kisiKaydi && Array.isArray(kisiKaydi.gozetmenMusaitsizGunler)
      ? kisiKaydi.gozetmenMusaitsizGunler
      : [];
  const out = [];
  ham.forEach((g) => {
    const t = metin(g);
    if (t && !out.includes(t)) out.push(t);
  });
  return out.sort();
}

/** Ad → müsait olmadığı günler haritası; atamaya bu biçimde verilir. */
export function musaitsizlikHaritasi(kisiler) {
  const h = {};
  (Array.isArray(kisiler) ? kisiler : []).forEach((k) => {
    const isim = metin(k && k.name);
    if (!isim) return;
    const g = musaitsizGunler(k);
    if (g.length > 0) h[isim] = g;
  });
  return h;
}

/** Bu kişi o gün gözetmenlik yapabilir mi? */
export function gozetmenMusaitMi(kisi, tarih, harita) {
  const isim = metin(kisi);
  const gun = metin(tarih);
  if (!isim || !gun) return true;
  const liste = (harita || {})[isim];
  return !Array.isArray(liste) || liste.indexOf(gun) < 0;
}
