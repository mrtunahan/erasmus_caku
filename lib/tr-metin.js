// ══════════════════════════════════════════════════════════════
// TÜRKÇE METİN KARŞILAŞTIRMASI — ARAMA KUTULARININ ORTAK KURALI
//
// ⚠ SORUN: `"IŞIK".toLowerCase()` → "ışık" DEĞİL, "iŞik"in Türkçesiz hâli
// olan "ışık"tan farklı bir dizedir; JavaScript'in varsayılan kuralı İngilizce
// harflere göredir:
//
//     'IŞIK'.toLowerCase()              → 'işik'   ← I → i (noktalı)
//     'IŞIK'.toLocaleLowerCase('tr')    → 'ışık'   ← I → ı (noktasız)
//     'İBRAHİM'.toLowerCase()           → 'i̇brahi̇m' (i + birleşen nokta)
//     'İBRAHİM'.toLocaleLowerCase('tr') → 'ibrahim'
//
// Sonuç: öğrenci "ışıl" yazınca "IŞIL" adlı kayıt bulunamıyor, "İstatistik"
// ile "istatistik" aynı listede buluşmuyordu. Aramalar bu dosyadan geçer.
//
// ── ASCII KATLAMA DA VAR ──
// Klavyesinde Türkçe harf olmayan (ya da acelesi olan) kullanıcı "ogrenci"
// yazıyor; kayıt "öğrenci". Karşılaştırma her iki tarafı da ASCII'ye
// katlayarak yapılır: "ogrenci" → "öğrenci"yi bulur, tersi de doğrudur.
// ⚠ KATLAMA YALNIZ ARAMADA kullanılır; veriye yazılmaz, sıralama kararını
// da değiştirmez (sıralama için localeCompare(..., 'tr') doğrudur).
// ══════════════════════════════════════════════════════════════

const TR_ASCII = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  I: 'i',
  İ: 'i',
  i: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
  â: 'a',
  Â: 'a',
  î: 'i',
  Î: 'i',
  û: 'u',
  Û: 'u',
};

/** Türkçe kurallarına göre küçük harf (veri değişmez, yalnız karşılaştırma). */
export function trKucuk(deger) {
  return String(deger == null ? '' : deger).toLocaleLowerCase('tr');
}

/** Arama anahtarı: Türkçe küçük harf + ASCII katlama + fazla boşluk temizliği. */
export function trAnahtar(deger) {
  const ham = String(deger == null ? '' : deger);
  let cikti = '';
  for (const harf of ham) cikti += TR_ASCII[harf] || harf;
  return cikti.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
}

/**
 * `metin` içinde `aranan` geçiyor mu? (Türkçe-duyarlı, ASCII-katlamalı)
 * Boş arama her şeye uyar — arama kutusu boşken liste kısılmamalı.
 */
export function trIcerir(metin, aranan) {
  const q = trAnahtar(aranan);
  if (!q) return true;
  return trAnahtar(metin).indexOf(q) >= 0;
}

/** İki metin AYNI mı? (unvan/ad eşleştirmede değil, düz karşılaştırmada) */
export function trEsit(a, b) {
  return trAnahtar(a) === trAnahtar(b) && trAnahtar(a) !== '';
}

/** Türkçe sıralama — 'ç' 'c'den sonra, 'ı' 'i'den önce gelir. */
export function trSirala(a, b) {
  return String(a == null ? '' : a).localeCompare(String(b == null ? '' : b), 'tr');
}
