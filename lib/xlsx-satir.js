// ══════════════════════════════════════════════════════════════
// XLSX şablonlarında VERİ SATIRINI bulma
//
//   Satır çoğaltmalı xlsx üretiminde motorun ilk işi, şablondaki hangi
//   satırın "her kayıt için bir kez tekrarlanacak" satır olduğunu bulmaktır.
//   Yanlış satır seçilirse belge sessizce BOŞ çıkar: gerçek veri satırının
//   yer tutucuları boş dizeyle değiştirilir ve geriye yalnız hücredeki
//   " / " gibi ayraçlar kalır.
//
//   Bu yüzden kural ayrı bir modülde ve test altında.
// ══════════════════════════════════════════════════════════════

// Yer tutucu deseni: {{Alan Adı}} — satır sonu içermez.
// Her çağrıda yeni nesne: /g bayraklı regex'in lastIndex durumu paylaşılmasın.
export const yerTutucuDeseni = () => /\{\{[^{}\n]+\}\}/g;

// Bir <row> XML'inde kaç FARKLI satır değişkeni geçiyor?
// Yalnız paylaşılan metin (t="s") hücrelerine bakılır — xlsx'te hücre
// metinleri orada durur.
export function satirTokenSayisi(rowXml, strings, tokenHarita) {
  const idx = [...String(rowXml).matchAll(/<c\b[^>]*\st="s"[^>]*>\s*<v>(\d+)<\/v>/g)].map((x) =>
    Number(x[1])
  );
  const bulunan = new Set();
  idx.forEach((ix) => {
    const metin = strings[ix];
    if (!metin) return;
    (String(metin).match(yerTutucuDeseni()) || []).forEach((t) => {
      if (tokenHarita[t] && tokenHarita[t].tip === 'row') bulunan.add(t);
    });
  });
  return bulunan.size;
}

/**
 * Veri satırının indeksini döndürür; hiç satır değişkeni yoksa -1.
 *
 * KURAL: en çok FARKLI satır değişkeni içeren satır.
 *
 * Neden "ilk eşleşen satır" değil: gerçek şablonlarda rapor BAŞLIĞI da bir
 * satır değişkeni taşıyabiliyor — ör. "… {{başvurduğu_bölüm}} BÖLÜMÜ …
 * DEĞERLENDİRME RAPORU". Başlık, veri satırından önce geldiği için "ilk
 * eşleşen" kuralı onu seçiyor ve asıl veri satırı boşaltılıyordu.
 * Başlıkta 1, veri satırında 5-14 değişken olduğundan "en çok" kuralı
 * ikisini kesin ayırıyor.
 *
 * Eşitlikte İLK satır kazanır (kararlılık).
 */
export function veriSatiriSec(satirlar, strings, tokenHarita) {
  let sablonIdx = -1;
  let enCok = 0;
  (satirlar || []).forEach((r, i) => {
    const n = satirTokenSayisi(r, strings, tokenHarita);
    if (n > enCok) {
      enCok = n;
      sablonIdx = i;
    }
  });
  return sablonIdx;
}
