// ══════════════════════════════════════════════════════════════
// TABAN PUAN — eşleştirme ve karşılaştırma
//
// Dikey geçişte ve merkezi yerleştirme puanına göre yatay geçişte tek bir
// şart var: adayın puanı, başvurduğu programın taban puanından KÜÇÜK OLAMAZ.
//
// Taban puanı kurumun sayfasından AI okur (sunucu: tabanPuanBul). Bu dosya
// AI'ın DIŞINDA kalan iki işi yapar:
//   1) Kayıttaki program adını, okunan tablodaki program adıyla eşleştirmek.
//   2) Karşılaştırmayı yapmak.
//
// Karşılaştırma bilerek burada — modelde değil. Bir başvurunun "uygun" olup
// olmadığı bir aritmetik karardır; modelin yorumuna bırakılmaz. Model yalnız
// "belgede yazan sayı"yı getirir.
// ══════════════════════════════════════════════════════════════

import { puanOku } from './yatay-siralama.js';

// Türkçe duyarlı küçültme — JS'in toLowerCase'i I→i yapar, İ'yi olduğu gibi
// bırakır; "GIDA" ile "Gıda" bu yüzden eşleşmez.
function trKucult(s) {
  return String(s == null ? '' : s)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase();
}

// Karşılaştırma anahtarı: küçült, Türkçe harfleri ASCII'ye indir, "bölümü" /
// "programı" gibi ekleri ve noktalama/boşluğu at.
//   "GIDA MÜHENDİSLİĞİ BÖLÜMÜ" → "gidamuhendisligi"
//   "Gıda Müh."               → "gidamuh"
const TR_ASCII = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

export function programAnahtari(ad) {
  let s = trKucult(ad);
  s = s.replace(/[çğıöşüâîû]/g, (h) => TR_ASCII[h] || h);
  s = s.replace(/\b(bolumu|bolum|programi|program|anabilim dali)\b/g, ' ');
  return s.replace(/[^a-z0-9]+/g, '');
}

/**
 * Okunan taban puan tablosunda bir program adını arar.
 *
 * Sıra: birebir anahtar → biri diğerini kapsıyor (kısaltma: "gidamuh" ⊂
 * "gidamuhendisligi"). Kapsama eşleşmesinde birden çok aday varsa HİÇBİRİ
 * seçilmez: "makine" hem "makine mühendisliği" hem "makine ve imalat"
 * içinde geçer ve yanlış eşleşme, yanlış taban puanla değerlendirme demektir.
 *
 * @param {Array<{ad:string, taban:string}>} kayitlar
 * @param {string} ad
 * @returns {object|null}
 */
export function tabanKaydiBul(kayitlar, ad) {
  const hedef = programAnahtari(ad);
  if (!hedef) return null;
  const liste = (kayitlar || []).filter((k) => k && k.ad);
  const birebir = liste.find((k) => programAnahtari(k.ad) === hedef);
  if (birebir) return birebir;

  const kapsayan = liste.filter((k) => {
    const a = programAnahtari(k.ad);
    if (!a) return false;
    return a.includes(hedef) || hedef.includes(a);
  });
  return kapsayan.length === 1 ? kapsayan[0] : null;
}

/**
 * Adayın puanını taban puanla karşılaştırır.
 *
 * "Eşit veya yüksek" → uygun. Eşitlik ŞARTI KARŞILAR — yönetmelikteki ifade
 * "taban puandan az olmamak" olduğu için sınırda kalan aday elenmez.
 *
 * Okunamayan değerde 'belirsiz' döner; asla 0 varsayılmaz. Eksik veriyi
 * "sıfır puan" saymak, başvuruyu sessizce elemek olurdu.
 *
 * @returns {{durum:'uygun'|'uygun_degil'|'belirsiz', fark:number|null,
 *   aday:number|null, taban:number|null}}
 */
export function tabanKarsilastir(adayPuan, tabanPuan) {
  const aday = puanOku(adayPuan);
  const taban = puanOku(tabanPuan);
  if (aday == null || taban == null) {
    return { durum: 'belirsiz', fark: null, aday, taban };
  }
  // Kayan nokta gürültüsü sınırda yanlış karar verdirmesin (412,338 gibi üç
  // haneli puanlarda 1e-9 mertebesinde fark çıkabiliyor).
  const fark = Math.round((aday - taban) * 1000) / 1000;
  return { durum: fark >= 0 ? 'uygun' : 'uygun_degil', fark, aday, taban };
}

export const TABAN_DURUM_ETIKET = {
  uygun: 'Taban puanı karşılıyor',
  uygun_degil: 'Taban puanının altında',
  belirsiz: 'Karşılaştırılamadı (puan eksik)',
};
