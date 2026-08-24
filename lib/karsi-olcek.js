// ══════════════════════════════════════════════════════════════
// KARŞI KURUM NOT ÖLÇEĞİ — KATSAYI ÜZERİNDEN EŞLEME
//
// Öğrenci başka bir üniversitede ders alır (yaz okulu, muafiyet); o kurumun
// belgesi ÇAKÜ'ye gelir. Sorun: iki kurumun HARF ölçeği aynı şeyi ifade
// etmez. ÇAKÜ'nün ölçeğinde "BB" diye bir harf yoktur bile:
//
//   ÇAKÜ:  A 4.00 · B1 3.50 · B2 3.25 · B3 3.00 · C1 2.50 · C2 2.25
//          C3 2.00 · F1 1.50 · F2 0.00
//
// ── ORTAK DİL KATSAYIDIR ──
// Harf kuruma özeldir, yüzlük puan her belgede yoktur; iki kurumun ortak
// paydası KATSAYIDIR (4'lük sistem). Bu yüzden çeviri şöyle yürür:
//
//   karşı harf → (karşı kurumun ölçeği) → katsayı → (ÇAKÜ ölçeği) → ÇAKÜ harfi
//
// Karşı kurumun ölçeği sistemde tanımlı DEĞİLSE çeviri yapılmaz. Uydurulmuş
// bir eşleme öğrencinin transkriptine yanlış harf yazar ve kimse fark etmez.
//
// ── KATSAYI YUKARI YUVARLANMAZ ──
// Karşı katsayı ÇAKÜ ölçeğinde birebir yoksa, ondan KÜÇÜK ya da EŞİT en
// büyük katsayıya inilir. Yukarı çıkmak öğrencinin notunu şişirirdi; aşağı
// inmek ise en kötü ihtimalle hak edilenden düşük bir karşılık verir ve bu
// akademisyenin gözünden kaçmaz — sonuç "yaklaşık" diye işaretlenir.
// ══════════════════════════════════════════════════════════════

const sayi = (v) => {
  const n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Harf notunu tek biçime getirir: büyük harf, boşluksuz. */
export function harfAnahtari(harf) {
  return String(harf == null ? '' : harf)
    .replace(/\s+/g, '')
    .toLocaleUpperCase('tr-TR');
}

/**
 * Ham ölçek satırlarını düzenler.
 * Beklenen satır: {min, max, harf, katsayi}. Harfsiz ya da katsayısız satır
 * düşer — ikisi olmadan satırın çeviride bir işlevi yok.
 */
export function olcekNormalize(satirlar) {
  return (Array.isArray(satirlar) ? satirlar : [])
    .map((r) => {
      const h = harfAnahtari(r && r.harf);
      const k = sayi(r && r.katsayi);
      return {
        harf: h,
        katsayi: k,
        min: sayi(r && r.min),
        max: sayi(r && r.max),
        // Geçer bilgisi kayıtta varsa korunur; yoksa katsayıdan tahmin
        // EDİLMEZ — hangi katsayının geçer olduğu kurumun kararıdır.
        gecer: r && typeof r.gecer === 'boolean' ? r.gecer : undefined,
      };
    })
    .filter((r) => r.harf && r.katsayi !== null)
    .sort((a, b) => b.katsayi - a.katsayi);
}

/** Harfin katsayısı; bulunamazsa null. */
export function harfKatsayisi(harf, olcek) {
  const h = harfAnahtari(harf);
  if (!h) return null;
  const satir = olcekNormalize(olcek).find((r) => r.harf === h);
  return satir ? satir.katsayi : null;
}

/**
 * Katsayıyı hedef ölçekteki harfe çevirir.
 * Birebir katsayı yoksa ondan küçük/eşit en büyüğüne inilir (yukarı
 * yuvarlanmaz) ve `tam: false` işaretlenir.
 */
export function katsayidanHarf(katsayi, hedefOlcek) {
  const k = sayi(katsayi);
  if (k === null) return { harf: '', katsayi: null, tam: false };
  const satirlar = olcekNormalize(hedefOlcek);
  if (!satirlar.length) return { harf: '', katsayi: null, tam: false };

  const birebir = satirlar.find((r) => r.katsayi === k);
  if (birebir) return { harf: birebir.harf, katsayi: birebir.katsayi, tam: true };

  // Sıralı liste azalan; ilk küçük/eşit olan aranan satırdır.
  const asagi = satirlar.find((r) => r.katsayi <= k);
  if (asagi) return { harf: asagi.harf, katsayi: asagi.katsayi, tam: false };

  // Katsayı hedef ölçeğin en düşüğünün de altında: en düşük satır.
  const enDusuk = satirlar[satirlar.length - 1];
  return { harf: enDusuk.harf, katsayi: enDusuk.katsayi, tam: false };
}

/**
 * Karşı kurumun harf notunu ÇAKÜ harfine çevirir.
 *
 * @returns {harf, katsayi, karsiKatsayi, tam, sebep}
 *          `harf` boşsa `sebep` NEDEN çevrilemediğini söyler — akademisyen
 *          "neden boş" diye tahmin yürütmesin.
 */
export function karsiHarfiCevir(harf, karsiOlcek, cakuOlcek) {
  const h = harfAnahtari(harf);
  const bos = { harf: '', katsayi: null, karsiKatsayi: null, tam: false };
  if (!h) return { ...bos, sebep: 'Harf notu okunamadı.' };

  const karsi = olcekNormalize(karsiOlcek);
  if (!karsi.length) {
    return { ...bos, sebep: 'Karşı kurumun not ölçeği sisteme yüklenmemiş.' };
  }
  const caku = olcekNormalize(cakuOlcek);
  if (!caku.length) {
    return { ...bos, sebep: 'ÇAKÜ not ölçeği tanımlı değil.' };
  }

  const karsiKatsayi = harfKatsayisi(h, karsi);
  if (karsiKatsayi === null) {
    return {
      ...bos,
      sebep: '"' + h + '" karşı kurumun yüklü ölçeğinde yok.',
    };
  }

  const hedef = katsayidanHarf(karsiKatsayi, caku);
  if (!hedef.harf) {
    return { ...bos, karsiKatsayi, sebep: 'Katsayı ÇAKÜ ölçeğinde karşılık bulamadı.' };
  }
  return {
    harf: hedef.harf,
    katsayi: hedef.katsayi,
    karsiKatsayi,
    tam: hedef.tam,
    sebep: hedef.tam
      ? ''
      : 'Katsayı ' +
        karsiKatsayi +
        ' ÇAKÜ ölçeğinde birebir yok; aşağıdaki en yakın katsayıya (' +
        hedef.katsayi +
        ') inildi.',
  };
}

/**
 * Ölçeğin çeviriye elverişli olup olmadığını denetler.
 * Aynı katsayıyı iki harfe vermek çeviriyi belirsizleştirir: hangi harfe
 * çevrileceği sıralamaya kalır ve sonuç sessizce değişebilir.
 */
export function olcekSorunlari(satirlar) {
  const olcek = olcekNormalize(satirlar);
  const sorunlar = [];
  if (!olcek.length) {
    sorunlar.push('Ölçek boş: en az bir harf ve katsayı gerekli.');
    return sorunlar;
  }
  const harfler = new Set();
  const katsayilar = new Map();
  olcek.forEach((r) => {
    if (harfler.has(r.harf)) sorunlar.push('"' + r.harf + '" birden çok satırda.');
    harfler.add(r.harf);
    const ayni = katsayilar.get(r.katsayi);
    if (ayni)
      sorunlar.push(
        '"' + ayni + '" ile "' + r.harf + '" aynı katsayıyı (' + r.katsayi + ') taşıyor.'
      );
    else katsayilar.set(r.katsayi, r.harf);
    if (r.katsayi < 0 || r.katsayi > 4) {
      sorunlar.push('"' + r.harf + '" katsayısı 0-4 aralığının dışında (' + r.katsayi + ').');
    }
  });
  return sorunlar;
}

/** Kurum adını eşleme anahtarına indirger (büyük/küçük harf, boşluk farkı). */
export function kurumAnahtari(ad) {
  const tr = {
    ı: 'i',
    İ: 'i',
    I: 'i',
    ş: 's',
    Ş: 's',
    ğ: 'g',
    Ğ: 'g',
    ü: 'u',
    Ü: 'u',
    ö: 'o',
    Ö: 'o',
    ç: 'c',
    Ç: 'c',
  };
  let s = '';
  for (const h of String(ad == null ? '' : ad)) s += tr[h] || h;
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Kayıtlı ölçekler içinden kuruma ait olanı bulur. */
export function kurumOlcegiBul(kurum, kayitlar) {
  const a = kurumAnahtari(kurum);
  if (!a) return null;
  return (
    (Array.isArray(kayitlar) ? kayitlar : []).find((k) => kurumAnahtari(k && k.kurum) === a) || null
  );
}
