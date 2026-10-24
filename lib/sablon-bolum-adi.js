// ══════════════════════════════════════════════════════════════
// ŞABLONDA SABİT YAZILMIŞ BÖLÜM ADI
//
// Bir bölüm sınav programı şablonunu hazırlarken başlığa kendi adını sabit
// metin olarak yazıyor ("… BİLGİSAYAR MÜHENDİSLİĞİ SINAV PROGRAMI") ve şablon
// fakülte/üniversite düzeyinde paylaşılınca her bölümün çıktısında o ad
// çıkıyordu. Bölüm adı alanı (🧩) eşlenmemişse bile doğru ad yazılsın diye:
// belgede BAŞKA bir bölümün adı geçiyorsa o metin çıktıyı alan bölümün
// adıyla değiştirilir (büyük harf yazılmışsa büyük harfle).
//
// Güvenlik: belgede birden fazla farklı bölüm adı geçiyorsa (birden çok
// bölümü listeleyen belge) HİÇBİRİNE dokunulmaz.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();
const buyuk = (v) => metin(v).toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ');

/**
 * @param {string} duzMetin  belgenin görünür metni (etiketler atılmış)
 * @param {string} yeniAd    çıktıyı alan bölümün adı
 * @param {string[]} bolumAdlari  bilinen bütün bölüm adları
 * @returns {{token:string, tokenOccurrence:number, variable:'const', value:string}[]}
 *          şablon motorunun alan kaydı biçiminde (sabit değer)
 */
export function yabanciBolumAdiAlanlari(duzMetin, yeniAd, bolumAdlari) {
  const metinU = String(duzMetin || '');
  const yeni = metin(yeniAd);
  if (!metinU || !yeni) return [];
  const yeniU = buyuk(yeni);
  // Uzun ad önce: "Gıda Mühendisliği" bulunduysa içindeki kısa ad ayrıca sayılmaz.
  const adlar = [...new Set((bolumAdlari || []).map(metin).filter((a) => a.length >= 5))].sort(
    (a, b) => b.length - a.length
  );
  let calisma = metinU;
  const bulunan = new Map(); // normal ad → [{varyant, sayi}]
  adlar.forEach((ad) => {
    const norm = buyuk(ad);
    if (norm === yeniU || yeniU.includes(norm)) return;
    [ad, ad.toLocaleUpperCase('tr-TR')].forEach((varyant) => {
      if (!calisma.includes(varyant)) return;
      const sayi = calisma.split(varyant).length - 1;
      calisma = calisma.split(varyant).join(' '.repeat(varyant.length));
      if (!bulunan.has(norm)) bulunan.set(norm, []);
      bulunan.get(norm).push({ varyant, sayi });
    });
  });
  if (bulunan.size !== 1) return [];
  const [varyantlar] = [...bulunan.values()];
  const alanlar = [];
  varyantlar.forEach(({ varyant, sayi }) => {
    const ustHarf = varyant === varyant.toLocaleUpperCase('tr-TR');
    for (let i = 1; i <= sayi; i++) {
      alanlar.push({
        token: varyant,
        tokenOccurrence: i,
        variable: 'const',
        value: ustHarf ? yeni.toLocaleUpperCase('tr-TR') : yeni,
      });
    }
  });
  return alanlar;
}
