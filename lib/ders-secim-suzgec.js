// ══════════════════════════════════════════════════════════════
// ÖĞRENCİ DERS SEÇİMİ — DÖNEM SÜZGECİ
//
// "Benim Sayfam"daki ilk ders seçimi ekranında hangi derslerin listeleneceğini
// belirler.
//
// ── NEDEN AYRI BİR KURAL ──
// Ekranda iki ayrı dönem süzgeci vardı: biri görünmez (bulunulan yarıyıl),
// biri açılır kutu. Görünmez olan önce çalıştığı için açılır kutudan "Güz"
// seçen bir öğrenci Bahar yarıyılında HİÇBİR ders göremiyordu; kutu "Tüm
// Dönemler" derken bile başka yarıyılın dersleri gizli kalıyordu. Öğrenci
// eksik listeyi görüyor ama nedenini göremiyordu.
//
// Artık tek süzgeç var ve seçim öğrencide: varsayılan yine bulunulan yarıyıl,
// ama gizlenen ders sayısı ekranda yazıyor ve "Tümü" gerçekten tümünü açıyor.
// ══════════════════════════════════════════════════════════════

/** Süzgeç değerleri. 'guz' | 'bahar' | 'yaz' doğrudan ders dönemidir. */
export const BU_DONEM = 'bu';
export const TUM_DONEMLER = 'all';
export const DONEMSIZ = 'yok';

/**
 * Dersin dönemi. Tanımsız/boş dönem, dersin HER yarıyılda alınabileceği
 * anlamına gelir: içe aktarmada dönem belgede yer almadığı için boş kalabilir
 * ve bu dersleri gizlemek müfredatın yarısını yok ederdi.
 */
export function dersDonemi(ders) {
  const d = String((ders && ders.donem) || '')
    .trim()
    .toLowerCase();
  return d === 'guz' || d === 'bahar' || d === 'yaz' ? d : '';
}

/**
 * Ders bu süzgece uyuyor mu?
 * @param secim   BU_DONEM | TUM_DONEMLER | DONEMSIZ | 'guz' | 'bahar' | 'yaz'
 * @param buDonem bulunulan yarıyıl ('guz' | 'bahar')
 */
export function donemUyuyorMu(ders, secim, buDonem) {
  const d = dersDonemi(ders);
  if (secim === TUM_DONEMLER) return true;
  if (secim === DONEMSIZ) return d === '';
  // Bulunulan yarıyıl: o yarıyılın dersleri + dönemi belirtilmemiş olanlar.
  if (secim === BU_DONEM || !secim) return d === '' || d === buDonem;
  return d === secim;
}

/** Açılır kutunun seçenekleri; etiketler bulunulan yarıyıla göre yazılır. */
export function donemSecenekleri(buDonem) {
  return [
    { deger: BU_DONEM, etiket: 'Bu yarıyıl (' + (buDonem === 'bahar' ? 'Bahar' : 'Güz') + ')' },
    { deger: TUM_DONEMLER, etiket: 'Tüm dönemler' },
    { deger: 'guz', etiket: 'Güz' },
    { deger: 'bahar', etiket: 'Bahar' },
    { deger: 'yaz', etiket: 'Yaz' },
    { deger: DONEMSIZ, etiket: 'Dönemi belirtilmemiş' },
  ];
}

/**
 * Yalnızca dönem yüzünden gizlenen ders sayısı.
 *
 * `digerleriGecti` dersin ÖTEKİ süzgeçlerden (bölüm, sınıf, arama) geçip
 * geçmediğini söyler; sayı yalnız onların içinden hesaplanır, yoksa öğrenciye
 * "aramanla ilgisi olmayan 400 ders gizli" denmiş olurdu.
 */
export function donemDisiSayisi(dersler, secim, buDonem, digerleriGecti) {
  const gecer = typeof digerleriGecti === 'function' ? digerleriGecti : () => true;
  return (dersler || []).filter((c) => gecer(c) && !donemUyuyorMu(c, secim, buDonem)).length;
}
