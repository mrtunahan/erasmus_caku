// ══════════════════════════════════════════════════════════════
// API HATASI — ARIZA MI, KURAL MI?
//
// Ortak okuma katmanı bir istek başarısız olduğunda kullanıcıya
// "Sunucudan veri alınamıyor — gösterilen bilgiler eksik olabilir."
// bandını gösteriyor.
//
// ⚠ BU DOSYA CANLIDA GÖRÜLEN BİR ARIZADAN DOĞDU. Bant HER hatada
// gösteriliyordu — yetki reddi dahil. Oysa bazı koleksiyonlar bazı rollere
// BİLEREK kapalı: öğrenci `taban_puanlar` okuyamaz (kendi başvurusunun
// değerlendirme eşiğini önceden görmesin diye). Kural gereği dönen 403,
// kullanıcıya sunucu arızası olarak gösteriliyordu; yatay geçiş modülünü
// açan her öğrenci sayfa düzgün çalışırken kırmızı uyarı görüyordu.
//
// Ayrım basit ama kritik: 401/403 SİSTEMİN ÇALIŞTIĞININ kanıtıdır — kural
// uygulanmıştır. Bant sunucu arızası (5xx), ağ kopması ve beklenmeyen
// durumlar içindir.
// ══════════════════════════════════════════════════════════════

/** Bu hata bir yetki reddi mi? (kural uygulandı, arıza yok) */
export function yetkiReddiMi(hata) {
  if (!hata) return false;
  const kod = Number(hata.status);
  return kod === 401 || kod === 403;
}

/** Kullanıcıya arıza bandı gösterilmeli mi? */
export function bantGosterilsinMi(hata) {
  return !yetkiReddiMi(hata);
}
