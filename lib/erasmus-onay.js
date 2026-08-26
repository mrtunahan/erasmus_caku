// ══════════════════════════════════════════════════════════════
// EŞLEŞTİRME ONAY DURUMU DAMGASI
//
// Bir eşleştirmenin `status` alanı yoksa bu İKİ farklı şey anlamına
// geliyordu ve kod iki yerde iki farklı okuma yapıyordu:
//
//   gösterim  → `m.status || 'approved'`  (durumu yoksa onaylı say)
//   kaydetme  → durumu yoksa 'pending'    (yeni sayıp onaya düşür)
//
// Sonucu canlıda görüldü: öğrenci DÖNÜŞ notlarını gönderip kaydettiğinde,
// durumu hiç yazılmamış eski GİDİŞ eşleştirmeleri de onaya düşüyor,
// akademisyene çoktan onayladığı işler yeniden geliyordu.
//
// Ayrım artık kaydın kendisinden okunur: eşleştirme ÖNCEDEN VAR MIYDI?
// Varsa durumu değişmez; yalnız bu kayıtta ilk kez görülen eşleştirme
// öğrenci tarafından ekleniyorsa onaya düşer.
// ══════════════════════════════════════════════════════════════

/**
 * Bu eşleştirme türü akademisyen onayından geçer mi?
 *
 * İKİ TARAF DA GEÇER. Gidiş eşleştirmesi öğrenim anlaşmasının kendisidir ve
 * öğrenci onu kendi kurar: hangi ÇAKÜ dersinin karşılığında hangi dersi
 * alacağını öneren odur. Bu öneri akademisyen onayından geçmeden anlaşma
 * imzalanamaz — ders ders onaylanır, reddedilende sebep yazılır.
 *
 * ── ESKİ SORUN VE NEDEN GERİ GELMEYECEĞİ ──
 * Gidiş tarafı bir dönem onay dışında tutulmuştu, çünkü durumu hiç yazılmamış
 * ESKİ eşleştirmeler her kayıtta yeniden onaya düşüyor ve akademisyene
 * çoktan bitirdiği iş geri geliyordu. O sorunun kaynağı onayın kendisi değil,
 * damgalamaydı: `onayDamgasi` artık kayıtta ZATEN VAR OLAN eşleştirmeyi
 * 'approved' sayıyor, yalnız o kayıtta İLK KEZ görülen eşleştirme onaya
 * düşüyor. Bu yüzden gidiş tarafını onaya açmak eski davranışı geri
 * getirmez.
 */
export function onayaTabiMi(tur) {
  const t = String(tur || '');
  return t === 'return' || t === 'outgoing';
}

/**
 * @param {Array} eslesmeler   kaydedilecek eşleştirmeler
 * @param {Set|Array} oncekiIdler kayıtta ZATEN VAR OLAN eşleştirme kimlikleri
 * @param {boolean} ogrenciMi  kaydeden öğrenci mi
 * @param {boolean} onaySart   bu tür onaydan geçer mi (bkz. onayaTabiMi)
 */
export function onayDamgasi(eslesmeler, oncekiIdler, ogrenciMi, onaySart = true) {
  const onceki = oncekiIdler instanceof Set ? oncekiIdler : new Set(oncekiIdler || []);
  return (eslesmeler || []).map((m) => {
    if (!m) return m;
    if (m.status) return m; // akademisyen onay/red vermiş — dokunulmaz
    if (onceki.has(m.id)) return { ...m, status: 'approved' };
    return { ...m, status: ogrenciMi && onaySart ? 'pending' : 'approved' };
  });
}

/**
 * Onay kuyruğuna giren eşleştirmeler: iki taraftan da 'pending' olanlar.
 * Durumu YAZILMAMIŞ eşleştirme onaylı sayılır — eski kayıtlar kuyruğa
 * dolmasın (bkz. onayaTabiMi'deki gerekçe).
 */
export function onayBekleyenler(kayit) {
  const k = kayit || {};
  const bekleyen = (m) => m && (m.status || 'approved') === 'pending';
  return [...(k.outgoingMatches || []), ...(k.returnMatches || [])].filter(bekleyen);
}

/** Kayıttaki tüm eşleştirme kimlikleri (gidiş + dönüş). */
export function mevcutEslesmeIdleri(kayit) {
  const k = kayit || {};
  return new Set(
    [...(k.outgoingMatches || []), ...(k.returnMatches || [])].map((m) => m && m.id).filter(Boolean)
  );
}
