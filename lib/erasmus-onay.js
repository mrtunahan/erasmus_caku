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
 * @param {Array} eslesmeler   kaydedilecek eşleştirmeler
 * @param {Set|Array} oncekiIdler kayıtta ZATEN VAR OLAN eşleştirme kimlikleri
 * @param {boolean} ogrenciMi  kaydeden öğrenci mi
 */
export function onayDamgasi(eslesmeler, oncekiIdler, ogrenciMi) {
  const onceki = oncekiIdler instanceof Set ? oncekiIdler : new Set(oncekiIdler || []);
  return (eslesmeler || []).map((m) => {
    if (!m) return m;
    if (m.status) return m; // akademisyen onay/red vermiş — dokunulmaz
    if (onceki.has(m.id)) return { ...m, status: 'approved' };
    return { ...m, status: ogrenciMi ? 'pending' : 'approved' };
  });
}

/** Kayıttaki tüm eşleştirme kimlikleri (gidiş + dönüş). */
export function mevcutEslesmeIdleri(kayit) {
  const k = kayit || {};
  return new Set(
    [...(k.outgoingMatches || []), ...(k.returnMatches || [])].map((m) => m && m.id).filter(Boolean)
  );
}
