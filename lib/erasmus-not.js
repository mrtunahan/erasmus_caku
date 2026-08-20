// ══════════════════════════════════════════════════════════════
// ERASMUS DÖNÜŞÜ — TRANSKRİPT, NOT ÇEVİRİSİ, DERS DEĞİŞİKLİĞİ
//
// Dönüş aşamasında üç ayrı soru var ve üçü de birbirine karışıyordu:
//
//   1. Öğrenci gittiği yerde DERS DEĞİŞTİRDİ Mİ?  Gidiş anlaşmasında olmayan
//      bir ders dönüşte elle yazılmışsa akademisyen bunu bilmeli — imzalanan
//      anlaşmadan sapma demektir.
//   2. Transkriptteki not HANGİ DERSE ait?  Karşı kurumun ders kodu ile
//      eşleştirilir; eşleşmeyen satır sessizce yok sayılmaz.
//   3. O not BİZDE hangi harf notuna karşılık gelir?  Çeviri, kurumun not
//      sistemine göre yapılır.
//
// ── SİSTEM TAHMİN EDİLMEZ ──
// Eski çeviri "auto" modda sayıya bakıp tahmin ediyordu: '4' hem 4/5 hem
// 4/10 olabilir ve ikisi bambaşka harf notu verir (B2 ve C3). Yanlış tahmin
// SESSİZCE yanlış not üretir. Burada sistem AÇIKÇA verilir; verilmediğinde
// ya da tabloda karşılığı olmadığında sonuç 'belirsiz' döner ve karar
// akademisyene bırakılır.
//
// ── ÖĞRENCİ HARF NOTUNA MÜDAHALE EDEMEZ ──
// Harf notu bu modülde HESAPLANIR, hiçbir yerde elle girilmez. Öğrencinin
// yazabildiği tek şey transkriptteki HAM not ve kanıt dosyasıdır; ikisi de
// akademisyenin önüne doğrulanmak üzere gelir.
// ══════════════════════════════════════════════════════════════

/** Kurumun not sistemleri — arayüzdeki seçim kutusu bu listeden beslenir. */
export const NOT_SISTEMLERI = [
  { id: 'ects', ad: 'ECTS harf notu (A–E, FX, F)' },
  { id: 'yuzluk', ad: '100 üzerinden' },
  { id: 'onluk', ad: '10 üzerinden' },
  { id: 'besli', ad: '5 üzerinden' },
  { id: 'harf', ad: 'Harf notu (AA–FF / A+–F-)' },
  { id: 'metin', ad: 'Sözel (very good, good, sufficient…)' },
];

// Harf → 100'lük ölçekteki ALT SINIRI. Değerler mevcut çeviri tablosunun
// eşikleriyle birebir aynıdır (shared-components → GRADE_CONVERSION);
// ortalama alırken yeni bir politika uydurulmasın diye buradan okunur.
const HARF_TABANI = {
  A: 90,
  B1: 85,
  B2: 80,
  B3: 75,
  C1: 70,
  C2: 65,
  C3: 60,
  F1: 50,
  F2: 0,
};

/** 100'lük puandan harf notu — çeviri tablosunun eşikleri. */
export function puandanHarf(puan) {
  const n = Number(puan);
  if (!Number.isFinite(n)) return 'belirsiz';
  if (n >= 90) return 'A';
  if (n >= 85) return 'B1';
  if (n >= 80) return 'B2';
  if (n >= 75) return 'B3';
  if (n >= 70) return 'C1';
  if (n >= 65) return 'C2';
  if (n >= 60) return 'C3';
  if (n >= 50) return 'F1';
  return 'F2';
}

const ECTS = { A: 'A', B: 'B1', C: 'B2', D: 'C1', E: 'C3', FX: 'F1', F: 'F2' };
const HARFLER = {
  AA: 'A',
  'A+': 'A',
  A: 'A',
  BA: 'B1',
  'A-': 'B1',
  BB: 'B2',
  'B+': 'B2',
  B: 'B2',
  CB: 'B3',
  'B-': 'B3',
  CC: 'C1',
  'C+': 'C1',
  C: 'C1',
  DC: 'C2',
  'C-': 'C2',
  DD: 'C3',
  'D+': 'C3',
  D: 'C3',
  FF: 'F1',
  F: 'F1',
  FD: 'F2',
  'F-': 'F2',
};
const SOZEL = {
  'very good': 'A',
  'good +': 'B1',
  good: 'B2',
  'sufficient +': 'B3',
  sufficient: 'C1',
  'allowing +': 'C2',
  allowing: 'C3',
  insufficient: 'F1',
};

/**
 * Ham notu bizim harf notumuza çevirir.
 *
 * @param {string|number} ham   transkriptte YAZAN değer
 * @param {string} sistem       NOT_SISTEMLERI kimliği
 * @returns {{harf:string, ok:boolean, sebep?:string}}
 *   ok=false → 'belirsiz'; karar akademisyene kalır, sessizce not üretilmez.
 */
export function notCevir(ham, sistem) {
  const metin = String(ham == null ? '' : ham).trim();
  if (!metin) return { harf: 'belirsiz', ok: false, sebep: 'not girilmemiş' };
  if (!sistem) {
    return { harf: 'belirsiz', ok: false, sebep: 'kurumun not sistemi tanımlı değil' };
  }
  const buyuk = metin.toLocaleUpperCase('en-US');
  const sayi = Number(metin.replace(',', '.'));
  const sayiMi = Number.isFinite(sayi);

  switch (sistem) {
    case 'ects':
      return ECTS[buyuk]
        ? { harf: ECTS[buyuk], ok: true }
        : { harf: 'belirsiz', ok: false, sebep: `'${metin}' ECTS harfi değil` };
    case 'harf':
      return HARFLER[buyuk]
        ? { harf: HARFLER[buyuk], ok: true }
        : { harf: 'belirsiz', ok: false, sebep: `'${metin}' bilinen bir harf notu değil` };
    case 'metin': {
      const k = SOZEL[metin.toLocaleLowerCase('en-US')];
      return k
        ? { harf: k, ok: true }
        : { harf: 'belirsiz', ok: false, sebep: `'${metin}' sözel tabloda yok` };
    }
    case 'yuzluk':
      if (!sayiMi || sayi < 0 || sayi > 100) {
        return { harf: 'belirsiz', ok: false, sebep: `'${metin}' 0–100 aralığında değil` };
      }
      return { harf: puandanHarf(sayi), ok: true };
    case 'onluk':
      if (!sayiMi || sayi < 0 || sayi > 10) {
        return { harf: 'belirsiz', ok: false, sebep: `'${metin}' 0–10 aralığında değil` };
      }
      return { harf: puandanHarf(sayi * 10), ok: true };
    case 'besli':
      if (!sayiMi || sayi < 0 || sayi > 5) {
        return { harf: 'belirsiz', ok: false, sebep: `'${metin}' 0–5 aralığında değil` };
      }
      return { harf: puandanHarf(sayi * 20), ok: true };
    default:
      return { harf: 'belirsiz', ok: false, sebep: `tanımsız not sistemi: ${sistem}` };
  }
}

/** Ders kodu karşılaştırma anahtarı — boşluk, tire ve nokta yok sayılır. */
export function kodAnahtari(kod) {
  return String(kod == null ? '' : kod)
    .toLocaleUpperCase('en-US')
    .replace(/[^A-Z0-9]/g, '');
}

const dersler = (m) => (m && Array.isArray(m.hostCourses) ? m.hostCourses : []);

/**
 * Öğrenci dönüşte GİDİŞ ANLAŞMASINDA OLMAYAN bir ders yazmış mı?
 *
 * İmzalanan anlaşmadan sapma akademisyenin bilmesi gereken bir şeydir; kayıt
 * içinde kaybolmamalı. Yalnız KARŞI KURUM dersleri karşılaştırılır — bizdeki
 * karşılık zaten akademisyenin işidir.
 *
 * @returns {{degisti:boolean, yeni:string[], dusen:string[]}}
 *   yeni  → dönüşte var, gidişte yok (öğrencinin elle eklediği)
 *   dusen → gidişte var, dönüşte yok (alınmayan ders)
 */
export function dersDegisikligi(gidisEslesmeleri, donusEslesmeleri) {
  const gidis = new Set();
  (gidisEslesmeleri || []).forEach((m) =>
    dersler(m).forEach((c) => {
      const k = kodAnahtari(c && c.code);
      if (k) gidis.add(k);
    })
  );
  const donus = new Map();
  (donusEslesmeleri || []).forEach((m) =>
    dersler(m).forEach((c) => {
      const k = kodAnahtari(c && c.code);
      if (k) donus.set(k, (c && c.code) || k);
    })
  );

  const yeni = [...donus.entries()].filter(([k]) => !gidis.has(k)).map(([, ad]) => ad);
  const dusen = [...gidis].filter((k) => !donus.has(k));
  return { degisti: yeni.length > 0 || dusen.length > 0, yeni, dusen };
}

/**
 * Transkript satırlarını dönüş eşleştirmelerindeki karşı kurum dersleriyle
 * eşler.
 *
 * Eşleşmeyen satır SESSİZCE atılmaz: iki liste de döner ki akademisyen
 * eksiği görsün (öğrenci yanlış kod yazmış ya da transkriptte fazladan ders
 * var olabilir).
 *
 * @param {Array<{kod:string, not:string|number}>} transkript
 * @param {Array} donusEslesmeleri
 * @returns {{eslesen:Object, transkriptteFazla:Array, notuOlmayan:Array}}
 *   eslesen → { kodAnahtarı: hamNot }
 */
export function transkriptEslestir(transkript, donusEslesmeleri) {
  const satirlar = Array.isArray(transkript) ? transkript : [];
  const dersKodlari = new Map();
  (donusEslesmeleri || []).forEach((m) =>
    dersler(m).forEach((c) => {
      const k = kodAnahtari(c && c.code);
      if (k) dersKodlari.set(k, (c && c.code) || k);
    })
  );

  const eslesen = {};
  const transkriptteFazla = [];
  satirlar.forEach((r) => {
    const k = kodAnahtari(r && r.kod);
    if (!k) return;
    if (dersKodlari.has(k)) eslesen[k] = r.not;
    else transkriptteFazla.push((r && r.kod) || k);
  });

  const notuOlmayan = [...dersKodlari.entries()]
    .filter(([k]) => !(k in eslesen))
    .map(([, ad]) => ad);
  return { eslesen, transkriptteFazla, notuOlmayan };
}

/**
 * Bir dönüş eşleştirmesinin harf notu.
 *
 * Eşleştirmede tek karşı kurum dersi varsa notu odur. Birden çok ders varsa
 * (iki dersin birleşip bir dersimize karşılık gelmesi) AKTS ağırlıklı
 * ortalama alınır; ortalama, harflerin 100'lük ölçekteki alt sınırları
 * üzerinden yürür — çeviri tablosunun kendi eşikleri, yeni politika değil.
 *
 * Derslerden BİRİ bile çevrilemiyorsa sonuç 'belirsiz'dir: eksik veriden
 * not üretmek, yanlış not vermektir.
 */
export function eslesmeHarfNotu(eslesme, notlar, sistem) {
  const liste = dersler(eslesme);
  if (liste.length === 0) return { harf: 'belirsiz', ok: false, sebep: 'karşı kurum dersi yok' };

  const parcalar = [];
  for (const c of liste) {
    const k = kodAnahtari(c && c.code);
    const ham = notlar && k in notlar ? notlar[k] : '';
    const sonuc = notCevir(ham, sistem);
    if (!sonuc.ok) {
      return {
        harf: 'belirsiz',
        ok: false,
        sebep: `${(c && c.code) || '(kodsuz ders)'}: ${sonuc.sebep}`,
      };
    }
    const akts = Number(c && c.credits);
    parcalar.push({
      taban: HARF_TABANI[sonuc.harf],
      agirlik: Number.isFinite(akts) && akts > 0 ? akts : 1,
    });
  }

  if (parcalar.length === 1) return { harf: puandanHarf(parcalar[0].taban), ok: true };
  const toplamAgirlik = parcalar.reduce((t, p) => t + p.agirlik, 0);
  const ortalama = parcalar.reduce((t, p) => t + p.taban * p.agirlik, 0) / toplamAgirlik;
  return { harf: puandanHarf(ortalama), ok: true, ortalama: Math.round(ortalama * 100) / 100 };
}

// ══════════════════════════════════════════════════════════════
// NOT SİSTEMİNİ TRANSKRİPTTEN SEZ
//
// Sistem elle de seçilebilir ama transkript çoğu zaman kendini ele verir:
// harflerden mi sayılardan mı oluştuğu, sayıların en büyüğünün kaç olduğu.
// Sezgi ÖNERİDİR — `kesin` alanı, kararın gözle doğrulanması gerekip
// gerekmediğini söyler. Belirsiz kaldığında sistem uydurulmaz.
//
// ── AYIRT EDİLEMEYEN İKİ DURUM ──
//   • Tek harfli notlar (A, B, C…) hem ECTS'te hem bizim harf tablomuzda
//     var ama FARKLI karşılıklar veriyor (ECTS 'C' → B2, bizim 'C' → C1).
//     Karşı kurum yabancı olduğu için ECTS varsayılır; iki harfli kod (AA,
//     BA…) ya da +/- görülürse bizim tablomuz kesinleşir.
//   • Hepsi 5 ve altındaki sayılar 5'lik de olabilir, 10'luğun düşük notları
//     da. Bu durumda `kesin` false döner.
// ══════════════════════════════════════════════════════════════

const TR_IKILI = /^(AA|BA|BB|CB|CC|DC|DD|FF|FD)$/;

/**
 * @param {Array<{not:string|number}>} transkript
 * @returns {{sistem:string, kesin:boolean, sebep:string}}
 */
export function sistemSez(transkript) {
  const degerler = (Array.isArray(transkript) ? transkript : [])
    .map((r) => String((r && r.not) == null ? '' : r.not).trim())
    .filter(Boolean);
  if (degerler.length === 0) {
    return { sistem: '', kesin: false, sebep: 'transkriptte not yok' };
  }

  const hepsi = (kosul) => degerler.every(kosul);
  const bazi = (kosul) => degerler.some(kosul);

  if (hepsi((d) => SOZEL[d.toLocaleLowerCase('en-US')])) {
    return { sistem: 'metin', kesin: true, sebep: 'notlar sözel tabloda' };
  }

  const buyukler = degerler.map((d) => d.toLocaleUpperCase('en-US'));
  if (
    buyukler.every((d) => HARFLER[d]) &&
    buyukler.some((d) => TR_IKILI.test(d) || /[+-]$/.test(d))
  ) {
    return { sistem: 'harf', kesin: true, sebep: 'iki harfli / işaretli harf notu' };
  }
  if (buyukler.every((d) => ECTS[d])) {
    return {
      sistem: 'ects',
      kesin: true,
      sebep: 'tek harfli notlar — Erasmus standardı ECTS varsayıldı',
    };
  }

  const sayilar = degerler.map((d) => Number(d.replace(',', '.')));
  if (sayilar.every((n) => Number.isFinite(n))) {
    const enBuyuk = Math.max(...sayilar);
    if (enBuyuk > 10) return { sistem: 'yuzluk', kesin: true, sebep: `en yüksek not ${enBuyuk}` };
    if (enBuyuk > 5) return { sistem: 'onluk', kesin: true, sebep: `en yüksek not ${enBuyuk}` };
    return {
      sistem: 'besli',
      kesin: false,
      sebep: `en yüksek not ${enBuyuk} — 10'luk ölçeğin düşük notları da olabilir, doğrulayın`,
    };
  }

  return {
    sistem: '',
    kesin: false,
    sebep: bazi((d) => Number.isFinite(Number(d)))
      ? 'transkriptte hem sayı hem metin var'
      : 'notlar hiçbir tabloya uymuyor',
  };
}

/**
 * Dönüş eşleştirmelerinin DERS BAZINDA notlarını hesaplar.
 *
 * Kart üzerinde eşleştirme başına tek bir not değil, her karşı kurum dersinin
 * kendi notu görünmeli: `hostGrades` transkriptteki HAM not, `homeGrades` o
 * notun bizdeki HARF karşılığı. Çevrilemeyen ders için değer YAZILMAZ —
 * boş bırakmak, uydurulmuş bir 'A' yazmaktan iyidir.
 *
 * @returns {Array<{id:*, hostGrades:Object, homeGrades:Object, eksik:string[]}>}
 */
export function eslesmeNotlariniHesapla(donusEslesmeleri, transkript, sistem) {
  const { eslesen } = transkriptEslestir(transkript, donusEslesmeleri);
  return (donusEslesmeleri || []).map((m) => {
    const hostGrades = {};
    const homeGrades = {};
    const eksik = [];
    dersler(m).forEach((c, i) => {
      const k = kodAnahtari(c && c.code);
      const ham = k && k in eslesen ? eslesen[k] : '';
      if (!ham) {
        eksik.push((c && c.code) || `#${i + 1}`);
        return;
      }
      const sonuc = notCevir(ham, sistem);
      hostGrades[i] = String(ham);
      if (sonuc.ok) homeGrades[i] = sonuc.harf;
      else eksik.push(`${(c && c.code) || `#${i + 1}`}: ${sonuc.sebep}`);
    });
    return { id: m && m.id, hostGrades, homeGrades, eksik };
  });
}
