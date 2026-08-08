// ══════════════════════════════════════════════════════════════
// BÖLÜM ADI — "çıplak" hâl
//
// Şablon başlıkları çoğu zaman eki kendisi yazıyor:
//   "… {{bölüm}} Mühendisliği Bölümü …"
// Yer tutucuya tam ad konunca "Gıda Mühendisliği Mühendisliği Bölümü" gibi
// tekrar oluşuyor. Bu yardımcı sondaki "Bölümü"/"Mühendisliği" eklerini atar;
// eki taşımayan adlar (ör. "Moleküler Biyoloji ve Genetik") aynen kalır.
//
// Eşleştirme Türkçe-duyarlı küçük harf üzerinden yapılır: JS'in /i bayrağı
// İ (U+0130) ile i'yi eşleştirmediği için "Gıda MÜHENDİSLİĞİ" gibi tümü büyük
// yazılmış adlarda düz regex sessizce çalışmıyordu. Kırpma orijinal metin
// üzerinde yapılır ki harf düzeni bozulmasın.
// ══════════════════════════════════════════════════════════════

const kucult = (x) => String(x).replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr-TR');

// Sondan başlayarak bu sırayla kırpılır ki "… Mühendisliği Bölümü" yazımı da
// tek geçişte sadeleşsin.
const EKLER = [/\s+bölüm[üu]?$/, /\s+mühendisli[ğg]i$/];

/**
 * @param {string} ad tam bölüm adı
 * @returns {string} ek atılmış ad; her şey kırpılırsa orijinal ad
 */
export function bolumKisaAd(ad) {
  let s = String(ad || '').trim();
  for (const ek of EKLER) {
    const m = kucult(s).match(ek);
    if (m) s = s.slice(0, s.length - m[0].length).trim();
  }
  return s.trim() || String(ad || '').trim();
}
