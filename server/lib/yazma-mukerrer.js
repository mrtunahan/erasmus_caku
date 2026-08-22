// ══════════════════════════════════════════════════════════════
// MÜKERRER KAYIT: HATA MI, İNDEKSİN AMACI MI?
//
// `trip_history` ve `muafiyet_history` koleksiyonlarında `sigKey` alanı
// üzerinde BENZERSİZ indeks var. sigKey, kaydın deterministik imzasıdır
// (öğrenci | kurum | eşleştirme); indeksin varlık sebebi aynı imzayla
// ikinci kaydın yazılmasını ENGELLEMEKTİR. Yani 11000 duplicate hatası
// burada bir arıza değil, indeksin işini yapmasıdır.
//
// ── SESSİZ VERİ KAYBI ──
// Toplu yazmada (batch) op'lar sırayla işleniyor ve biri fırlatınca döngü
// kırılıyordu: istek 500 dönüyor, KALAN op'lar hiç yazılmıyordu. Canlıda
// görüldü — bir öğrencinin eşleştirmelerinden biri geçmişte zaten olduğu
// için ötekiler de geçmişe girmiyordu. Kullanıcı "kaydedildi" sanıyor,
// geçmiş eksik kalıyordu.
//
// ── NEDEN "sigKey VARSA" ──
// Her benzersizlik ihlali yutulamaz. `students.studentNumber` de
// benzersizdir ama oradaki ihlal GERÇEK bir hatadır ve kullanıcıya
// söylenmelidir ("bu numarayla kayıt var"). Ayrımı yapan şey kaydın
// sigKey taşıyıp taşımadığıdır: sigKey, "bu kayıt yeniden yazılabilir,
// ikincisi gereksizdir" demenin açık yoludur.
// ══════════════════════════════════════════════════════════════

/** MongoDB benzersizlik ihlali mi? */
function mukerrerHataMi(hata) {
  if (!hata) return false;
  if (hata.code === 11000) return true;
  // Bazı sürücü/sürüm birleşimlerinde kod yalnız errorResponse altında olur.
  if (hata.errorResponse && hata.errorResponse.code === 11000) return true;
  return false;
}

/**
 * Bu mükerrer kayıt sessizce atlanabilir mi?
 * @param {Error} hata insertOne'ın fırlattığı hata
 * @param {object} veri yazılmaya çalışılan doküman
 */
function mukerrerAtlanabilirMi(hata, veri) {
  if (!mukerrerHataMi(hata)) return false;
  const d = veri || {};
  return typeof d.sigKey === 'string' && d.sigKey.trim() !== '';
}

module.exports = { mukerrerHataMi, mukerrerAtlanabilirMi };
