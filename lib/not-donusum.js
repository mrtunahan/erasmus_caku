// ══════════════════════════════════════════════════════════════
// NOT DÖNÜŞÜMÜ — karşı kurumun notunu ÇAKÜ notuna çevirme
//
// Yaz okulunda alınan ders ÇAKÜ transkriptine bir HARF NOTUYLA giriyor. Karşı
// kurum 100'lük, 4'lük ya da kendi harf sistemini kullanıyor olabilir; bu
// çeviri her kurum için ayrı bir "not dönüşüm tablosu" gerektiriyor.
//
// ── ÜÇ TASARIM KARARI ──
//
// 1) ÇEVİRİYİ MODEL YAPMAZ. Model yalnız iki şeyi okur: (a) öğrencinin
//    belgesindeki notu, (b) kurumun yayımladığı dönüşüm tablosunu. Hangi notun
//    hangi harfe karşılık geldiği, bu dosyadaki DETERMİNİST kod tarafından
//    hesaplanır. Bir öğrencinin transkriptine geçecek harf, modelin o anki
//    yorumuna bırakılamaz — aynı girdi her zaman aynı çıktıyı vermeli.
//
// 2) TABLO KURUM BAŞINA SAKLANIR ve bir kez akademisyence ONAYLANIR. Aynı
//    üniversiteden gelen sonraki öğrenciler için yeniden okunmaz: hem maliyet,
//    hem de daha önemlisi TUTARLILIK. İki öğrencinin aynı notu farklı harfe
//    dönüşürse sorun sadece teknik değil, hakkaniyete dair olur.
//
// 3) EŞLEŞMEYEN NOT UYDURULMAZ. Tabloda karşılığı olmayan bir not boş döner ve
//    akademisyene "elle karar verin" diye çıkar. En yakın satıra yuvarlamak,
//    sessizce yanlış harf yazmak demektir.
// ══════════════════════════════════════════════════════════════

// ÇAKÜ harf notları (yönetmelik). Tablo doğrulaması bu listeye bakar; listede
// olmayan bir hedef harf, tablonun hatalı okunduğunun işaretidir.
export const CAKU_HARFLERI = [
  'AA',
  'BA',
  'BB',
  'CB',
  'CC',
  'DC',
  'DD',
  'FD',
  'FF',
  // Notla ölçülmeyen ama transkriptte geçen durumlar
  'S',
  'G',
  'M',
  'MU',
  'K',
  'DZ',
];

// Geçer sayılan ÇAKÜ harfleri — "bu dersi geçmiş mi" sorusu için.
// FD/FF/K/DZ geçmez; DD ve DC bazı yönetmeliklerde koşulludur, bölümün
// mezuniyet kuralındaki `gecerNotlar` listesi son sözü söyler.
export const CAKU_GECER_VARSAYILAN = [
  'AA',
  'BA',
  'BB',
  'CB',
  'CC',
  'DC',
  'DD',
  'S',
  'G',
  'M',
  'MU',
];

/** Not simgesini karşılaştırılabilir hâle getirir: "  ba " → "BA". */
export function notNormalize(s) {
  return String(s == null ? '' : s)
    .trim()
    .replace(/\s+/g, '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleUpperCase('tr-TR');
}

/**
 * Sayısal notu okur. Virgül ve nokta ondalık ayracı sayılır; "85/100" gibi
 * yazımlarda PAY alınır. Okunamıyorsa null — sıfır varsayılmaz.
 */
export function notSayiOku(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return null;
  const m = s.match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Kurum adını tablo anahtarına indirger: "Bursa Uludağ Üniv." → "bursauludag". */
export function kurumAnahtari(ad) {
  return String(ad == null ? '' : ad)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/\b(universite|universitesi|univ|uni)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Bir notu ÇAKÜ harfine çevirir.
 *
 * @param {string} kaynakNot  karşı kurumdaki not ("85", "AA", "4.0"…)
 * @param {object} tablo      { tur:'harf'|'sayisal', satirlar:[...] }
 * @returns {{cakuNot:string, kural:object|null, sebep:string}}
 *   `cakuNot` boşsa `sebep` neden çevrilemediğini söyler — akademisyen
 *   ekranında bu cümle görünür.
 */
export function notCevir(kaynakNot, tablo) {
  const bos = (sebep) => ({ cakuNot: '', kural: null, sebep });
  const ham = String(kaynakNot == null ? '' : kaynakNot).trim();
  if (!ham) return bos('Belgede not okunamadı.');
  if (!tablo || !Array.isArray(tablo.satirlar) || tablo.satirlar.length === 0) {
    return bos('Bu kurum için onaylı not dönüşüm tablosu yok.');
  }

  if (tablo.tur === 'sayisal') {
    const n = notSayiOku(ham);
    if (n == null) return bos('"' + ham + '" sayısal bir not değil; tablo sayısal tanımlı.');
    // Aralıklar KAPALI kabul edilir (min ≤ n ≤ max). Birden çok satır
    // eşleşiyorsa tablo hatalıdır — sessizce ilkini seçmek yerine söylenir.
    const uyanlar = tablo.satirlar.filter((r) => {
      const min = notSayiOku(r.min);
      const max = notSayiOku(r.max);
      if (min == null || max == null) return false;
      return n >= min && n <= max;
    });
    if (uyanlar.length === 0) return bos('"' + ham + '" tablodaki hiçbir aralığa girmiyor.');
    if (uyanlar.length > 1) return bos('"' + ham + '" tabloda birden çok aralığa giriyor.');
    return { cakuNot: notNormalize(uyanlar[0].caku), kural: uyanlar[0], sebep: '' };
  }

  const hedef = notNormalize(ham);
  const satir = tablo.satirlar.find((r) => notNormalize(r.kaynak) === hedef);
  if (!satir) return bos('"' + ham + '" tabloda tanımlı değil.');
  return { cakuNot: notNormalize(satir.caku), kural: satir, sebep: '' };
}

/**
 * Tabloyu kullanıma açmadan önce denetler.
 *
 * Bu tablo o kurumdan gelen BÜTÜN öğrencilere uygulanacak; bir kez yanlış
 * onaylanırsa hata sessizce çoğalır. O yüzden kontroller katı.
 *
 * @returns {{gecerli:boolean, sorunlar:string[]}}
 */
export function notTablosuDogrula(tablo) {
  const sorunlar = [];
  const satirlar = (tablo && Array.isArray(tablo.satirlar) && tablo.satirlar) || [];
  if (satirlar.length === 0) sorunlar.push('Tablo boş.');

  const gecerliHarfler = new Set(CAKU_HARFLERI);
  satirlar.forEach((r, i) => {
    const no = 'Satır ' + (i + 1) + ': ';
    const caku = notNormalize(r.caku);
    if (!caku) sorunlar.push(no + 'ÇAKÜ notu boş.');
    else if (!gecerliHarfler.has(caku))
      sorunlar.push(no + '"' + r.caku + '" bir ÇAKÜ harf notu değil.');

    if (tablo && tablo.tur === 'sayisal') {
      const min = notSayiOku(r.min);
      const max = notSayiOku(r.max);
      if (min == null || max == null) sorunlar.push(no + 'aralık eksik (min/max).');
      else if (min > max) sorunlar.push(no + 'alt sınır üst sınırdan büyük.');
    } else if (!notNormalize(r.kaynak)) {
      sorunlar.push(no + 'kaynak not boş.');
    }
  });

  // Sayısal tabloda ÇAKIŞAN aralık, bir notun iki harfe düşmesi demektir.
  if (tablo && tablo.tur === 'sayisal') {
    const araliklar = satirlar
      .map((r, i) => ({ i, min: notSayiOku(r.min), max: notSayiOku(r.max) }))
      .filter((a) => a.min != null && a.max != null)
      .sort((a, b) => a.min - b.min);
    for (let i = 1; i < araliklar.length; i += 1) {
      const onceki = araliklar[i - 1];
      const simdi = araliklar[i];
      if (simdi.min <= onceki.max) {
        sorunlar.push(
          'Aralıklar çakışıyor: satır ' + (onceki.i + 1) + ' ile ' + (simdi.i + 1) + '.'
        );
      } else if (simdi.min - onceki.max > 1) {
        // Tam sayı sınırlar arasında 1'den büyük atlama: 84 ile 90 gibi.
        sorunlar.push(
          'Aralıklar arasında boşluk var: ' + onceki.max + ' ile ' + simdi.min + ' arası tanımsız.'
        );
      }
    }
  } else {
    // Harf tablosunda aynı kaynak notun iki kez tanımlanması da çakışmadır.
    const gorulen = new Map();
    satirlar.forEach((r, i) => {
      const k = notNormalize(r.kaynak);
      if (!k) return;
      if (gorulen.has(k)) {
        sorunlar.push(
          '"' +
            k +
            '" birden çok satırda tanımlı (satır ' +
            (gorulen.get(k) + 1) +
            ' ve ' +
            (i + 1) +
            ').'
        );
      } else gorulen.set(k, i);
    });
  }

  return { gecerli: sorunlar.length === 0, sorunlar };
}

/** Çevrilen harf, geçer not mu? Bölümün listesi verilmezse varsayılan kullanılır. */
export function notGecerMi(cakuNot, gecerNotlar) {
  const n = notNormalize(cakuNot);
  if (!n) return null; // bilinmiyor — "kaldı" DEMEZ
  const liste = (
    Array.isArray(gecerNotlar) && gecerNotlar.length > 0 ? gecerNotlar : CAKU_GECER_VARSAYILAN
  ).map(notNormalize);
  return liste.includes(n);
}

/**
 * Bir kayıttaki tüm dersleri çevirir.
 *
 * @param {Array} dersler  [{anahtar, kaynakNot}]
 * @param {object} tablo
 * @returns {object} { [anahtar]: {kaynakNot, cakuNot, sebep} }
 */
export function notlariCevir(dersler, tablo) {
  const out = {};
  (dersler || []).forEach((d) => {
    if (!d || d.anahtar == null) return;
    const c = notCevir(d.kaynakNot, tablo);
    out[String(d.anahtar)] = {
      kaynakNot: String(d.kaynakNot == null ? '' : d.kaynakNot).trim(),
      cakuNot: c.cakuNot,
      sebep: c.sebep,
    };
  });
  return out;
}
