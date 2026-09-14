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
  return metin(sinav && sinav.room)
    .split(/\s*-\s*/)
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

function sinavAnahtari(s) {
  return metin(s && (s.id || (s.code || '') + (s.date || '') + (s.timeSlot || '')));
}

/** Çakışma kimliği — çifte sırası fark etmez, iki taraf aynı kaydı görür. */
export function cakismaAnahtari(tur, a, b, ek) {
  const ikisi = [sinavAnahtari(a), sinavAnahtari(b)].sort();
  return [tur, metin(ek), ikisi[0], ikisi[1]].filter(Boolean).join('|');
}

const ad = (s) => metin(s && s.code) || metin(s && s.name) || '(ders)';
const bolum = (s) => metin(s && s.departmentId);

/**
 * Salon çakışması.
 *
 * Aynı salonda aynı saatte iki sınav OLABİLİR — kapasite yetiyorsa fakültede
 * bilerek yapılıyor. Kapasite yetmiyorsa fiziksel engeldir.
 */
function salonCakismasi(a, b, salon, kapasiteler) {
  const kap = sayi((kapasiteler || {})[salon]);
  const toplam = sayi(a.studentCount) + sayi(b.studentCount);
  const ayriBolum = bolum(a) && bolum(b) && bolum(a) !== bolum(b);
  const yeter = kap > 0 && toplam <= kap;
  return {
    tur: 'salon',
    ek: salon,
    seviye: yeter ? 'uyari' : 'engel',
    baslik: salon + ' salonu aynı saatte iki sınava ayrılmış',
    aciklama:
      ad(a) +
      ' (' +
      sayi(a.studentCount) +
      ' öğrenci) ve ' +
      ad(b) +
      ' (' +
      sayi(b.studentCount) +
      ' öğrenci)' +
      (ayriBolum ? ' — farklı bölümler' : '') +
      '. Toplam ' +
      toplam +
      ' öğrenci, salon kapasitesi ' +
      (kap > 0 ? kap : 'tanımsız') +
      '.',
    cozum: yeter
      ? 'Kapasite yetiyor: iki sınav aynı salonda birlikte yapılabilir. Kabul ederseniz sebebini yazın.'
      : 'Kapasite yetmiyor. Sınavlardan birini başka saate ya da salona alın.',
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
 */
export function cakismalariBul(sinavlar, secenekler) {
  const s = secenekler || {};
  const kapasiteler = s.salonKapasiteleri || {};
  const kabulHaritasi = new Map();
  (s.kabuller || []).forEach((k) => {
    if (k && metin(k.anahtar)) kabulHaritasi.set(metin(k.anahtar), k);
  });

  const liste = Array.isArray(sinavlar) ? sinavlar.filter(Boolean) : [];
  const bulunan = [];
  const eklendi = new Set();

  const ekle = (ham, a, b) => {
    const anahtar = cakismaAnahtari(ham.tur, a, b, ham.ek);
    if (eklendi.has(anahtar)) return;
    eklendi.add(anahtar);
    const kabul = kabulHaritasi.get(anahtar) || null;
    bulunan.push({
      ...ham,
      anahtar,
      sinavlar: [a, b],
      // Engel seviyesindeki çakışma kabul EDİLEMEZ; kayıtta kabul olsa bile
      // yok sayılır — fiziksel imkânsızlık onaylanarak ortadan kalkmaz.
      kabulEdilebilir: ham.seviye === 'uyari',
      kabul: ham.seviye === 'uyari' ? kabul : null,
    });
  };

  for (let i = 0; i < liste.length; i++) {
    for (let j = i + 1; j < liste.length; j++) {
      const a = liste[i];
      const b = liste[j];
      if (!zamanCakisiyorMu(a, b)) continue;

      salonlari(a).forEach((salon) => {
        if (salonlari(b).includes(salon)) ekle(salonCakismasi(a, b, salon, kapasiteler), a, b);
      });

      gozetmenleri(a).forEach((kisi) => {
        if (gozetmenleri(b).includes(kisi)) ekle(gozetmenCakismasi(a, b, kisi), a, b);
      });

      if (
        bolum(a) &&
        bolum(a) === bolum(b) &&
        sayi(a.sinif) > 0 &&
        sayi(a.sinif) === sayi(b.sinif)
      ) {
        ekle(sinifCakismasi(a, b), a, b);
      }
    }
  }

  // Engeller önce, sonra kabul bekleyen uyarılar, en sonda kabul edilmişler.
  const sira = (c) => (c.seviye === 'engel' ? 0 : c.kabul ? 2 : 1);
  return bulunan.sort(
    (x, y) =>
      sira(x) - sira(y) || x.tur.localeCompare(y.tur, 'tr') || x.anahtar.localeCompare(y.anahtar)
  );
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
      tur: cakisma.tur,
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
