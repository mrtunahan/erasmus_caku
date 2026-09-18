// ══════════════════════════════════════════════════════════════
// "DERSLERİM" LİSTESİNİN ÖZETİ
//
// Öğrencinin dönem dersleri düz bir kart yığınıydı: kaç ders aldığı, kaç
// AKTS ettiği, tavana ne kadar kaldığı ekranda hiç yazmıyordu — oysa seçim
// ekranında bu sayılar var. Aynı hesap iki yerde ayrı ayrı yapılmasın diye
// kural buraya alındı.
//
// AKTS alanı kayıtlarda iki adla geçebiliyor (`akts` ya da `kredi`); tek
// okuma noktası burasıdır.
// ══════════════════════════════════════════════════════════════

/** Yönetmelik tavanı — dönem başına en çok AKTS. */
export const AKTS_TAVANI = 42;

const sayi = (v) => {
  const n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Bir dersin AKTS'si; okunamıyorsa null (0 DEĞİL — "bilinmiyor" başkadır). */
export function dersAkts(ders) {
  const d = ders || {};
  const a = sayi(d.akts);
  return a != null ? a : sayi(d.kredi);
}

/** Dersin sınıfı — 1..4, seçmeli/bilinmeyen için 5. */
export function dersSinifi(ders) {
  const n = sayi((ders || {}).sinif);
  return n != null && n >= 1 && n <= 4 ? Math.trunc(n) : 5;
}

/**
 * Dönem dersleri özeti.
 *
 * @returns {{sayi:number, toplamAkts:number, aktsBilinmeyen:number,
 *   tavan:number, kalan:number, asildi:boolean, oran:number}}
 */
export function derslerimOzeti(dersler, secenek) {
  const liste = Array.isArray(dersler) ? dersler : [];
  const tavan = (secenek && secenek.tavan) || AKTS_TAVANI;
  let toplam = 0;
  let bilinmeyen = 0;
  liste.forEach((d) => {
    const a = dersAkts(d);
    if (a == null) bilinmeyen++;
    else toplam += a;
  });
  return {
    sayi: liste.length,
    toplamAkts: Math.round(toplam * 100) / 100,
    aktsBilinmeyen: bilinmeyen,
    tavan,
    kalan: Math.max(0, tavan - toplam),
    asildi: toplam > tavan,
    oran: tavan > 0 ? Math.min(1, toplam / tavan) : 0,
  };
}

/**
 * Dersleri SINIFA göre gruplar — liste uzadıkça "hangi dersler kendi
 * sınıfımdan, hangileri alttan/üstten" sorusu ancak böyle okunur.
 * Gruplar sınıf sırasına dizilir; seçmeli/bilinmeyen en sonda.
 */
export function dersGruplari(dersler) {
  const kova = new Map();
  (Array.isArray(dersler) ? dersler : []).forEach((d) => {
    const s = dersSinifi(d);
    if (!kova.has(s)) kova.set(s, []);
    kova.get(s).push(d);
  });
  return [...kova.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([sinif, liste]) => ({
      sinif,
      etiket: sinif === 5 ? 'Seçmeli / diğer' : sinif + '. sınıf dersleri',
      dersler: liste,
      toplamAkts: derslerimOzeti(liste).toplamAkts,
    }));
}

/** Kart altındaki tek cümle: "4 ders · 23 AKTS · tavana 19 AKTS var". */
export function ozetMetni(ozet) {
  const o = ozet || {};
  if (!o.sayi) return 'Bu dönem için ders seçmediniz.';
  const parca = [o.sayi + ' ders', o.toplamAkts + ' AKTS'];
  if (o.asildi) parca.push('tavan ' + o.tavan + ' AKTS aşıldı');
  else parca.push('tavana ' + Math.round(o.kalan * 100) / 100 + ' AKTS var');
  if (o.aktsBilinmeyen) parca.push(o.aktsBilinmeyen + ' dersin AKTS bilgisi yok');
  return parca.join(' · ');
}
