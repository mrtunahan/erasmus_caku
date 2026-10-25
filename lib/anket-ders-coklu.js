// ══════════════════════════════════════════════════════════════
// ÇOK DERSLİ ANKET — HER DERS AYRI DEĞERLENDİRİLİR
//
// ⚠ ESKİ DURUM: öğrenci bir anketi yalnız BİR KEZ yanıtlayabiliyordu. Ankete
// birden fazla ders bağlıysa (ör. "Ders Değerlendirme" bütün bölüm derslerine
// bağlı) öğrenci yalnız birini değerlendirebiliyordu.
//
// Kural: "Ders" bilgi alanı (source:'courseCode') olan ve EN AZ İKİ derse
// bağlı ankette yanıt DERS başınadır:
//   • aynı ders bir kez değerlendirilir, başka ders yeniden değerlendirilebilir;
//   • seçilebilen dersler ankete bağlı derslerdir (kod bilinenlerde sunucu da
//     bunu denetler — uydurma kodla sınırsız yanıt yazılamasın);
//   • bir ders değerlendirilince anket "tamamlandı" sayılır (zorunlu anket
//     kapısı açılır). Öğrencinin hangi dersleri aldığı bilinmediği için
//     bütün dersler beklenmez; kalan dersler "Başka ders değerlendir" ile açılır.
// Tek derse bağlı ya da ders bağı olmayan ankette eski kural sürer: tek yanıt.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();
/** Ders kodu karşılaştırma anahtarı (büyük harf, boşluksuz). */
export const kodAnahtari = (v) => metin(v).toLocaleUpperCase('tr-TR').replace(/\s+/g, '');

/** Ankette ders kodunun yazıldığı bilgi alanının anahtarı (yoksa ''). */
export function dersKoduAlani(anket) {
  const alanlar = (anket && Array.isArray(anket.infoFields) && anket.infoFields) || [];
  const f = alanlar.find((x) => x && x.source === 'courseCode');
  return f ? metin(f.key) || 'dersKodu' : '';
}

/** Ankete bağlı dersler. */
function bagliDersler(anket) {
  return (anket && Array.isArray(anket.linkedCourses) && anket.linkedCourses.filter(Boolean)) || [];
}

/** Bu ankette yanıt ders başına mı? */
export function cokDersliMi(anket) {
  return !!dersKoduAlani(anket) && bagliDersler(anket).length >= 2;
}

/** Yanıtların değerlendirdiği ders kodları (anahtar biçiminde). */
export function degerlendirilenKodlar(anket, yanitlar) {
  const alan = dersKoduAlani(anket);
  const out = new Set();
  if (!alan) return out;
  (yanitlar || []).forEach((r) => {
    const k = kodAnahtari(r && r.answers && r.answers[alan]);
    if (k) out.add(k);
  });
  return out;
}

/** Değerlendirilmemiş bağlı ders sayısı (çok dersli değilse 0). */
export function kalanDersSayisi(anket, yanitlar) {
  if (!cokDersliMi(anket)) return 0;
  const yapilan = degerlendirilenKodlar(anket, yanitlar);
  const dersler = bagliDersler(anket);
  const kodlu = dersler.filter((d) => kodAnahtari(d.code));
  const kalanKodlu = kodlu.filter((d) => !yapilan.has(kodAnahtari(d.code))).length;
  // Kodsuz (yalnız adla) bağlı derslerin değerlendirilip değerlendirilmediği
  // koddan anlaşılamaz: kodlu olmayan yanıt sayısı kadar düşülür.
  const kodsuz = dersler.length - kodlu.length;
  const kodluKumesi = new Set(kodlu.map((d) => kodAnahtari(d.code)));
  const kodsuzYapilan = [...yapilan].filter((k) => !kodluKumesi.has(k)).length;
  return kalanKodlu + Math.max(0, kodsuz - kodsuzYapilan);
}

/**
 * Çok dersli ankette yazılan ders kodu geçerli mi? Bağlı derslerin hepsinin
 * kodu biliniyorsa kod onlardan biri olmalı; kodsuz bağ varsa denetlenemez.
 */
export function dersKoduGecerliMi(anket, kod) {
  if (!cokDersliMi(anket)) return true;
  const k = kodAnahtari(kod);
  if (!k) return false;
  const dersler = bagliDersler(anket);
  if (dersler.some((d) => !kodAnahtari(d.code))) return true;
  return dersler.some((d) => kodAnahtari(d.code) === k);
}
