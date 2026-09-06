// ══════════════════════════════════════════════════════════════
// BELGE OKUMA İSTEĞİNİN HATA METNİ
//
// ⚠ BU DOSYA BİR HATADAN DOĞDU. Transkript okutan kullanıcı yalnız şunu
// görüyordu: "Satırlar okunamadı (HTTP 504)". Bu metin ne olduğunu da ne
// yapılacağını da söylemiyor — 504'ü uygulama değil, isteği 30 saniyede
// kesen nginx üretiyordu (bkz. ssl-setup/nginx-domain.conf).
//
// Ara katmanın (nginx) ürettiği yanıt HTML'dir; gövdesi JSON olarak
// ayrıştırılamaz ve `data.error` boş kalır. Bu yüzden metin DURUM KODUNDAN
// da üretilebilmelidir.
// ══════════════════════════════════════════════════════════════

/** Sunucunun anlamlı bir açıklaması varsa o kullanılır; yoksa duruma göre. */
export function aiIstekHataMetni(status, data, varsayilan) {
  const sunucu = data && typeof data.error === 'string' ? data.error.trim() : '';
  if (sunucu) return sunucu;
  const kod = Number(status) || 0;
  if (kod === 504 || kod === 408) {
    return (
      'Belge zaman aşımına uğradı. Genellikle belge çok uzun ya da taranmış ' +
      '(görüntü) olduğunda olur. Daha az sayfalı ya da metin katmanı olan bir ' +
      'PDF yükleyip yeniden deneyin.'
    );
  }
  if (kod === 502 || kod === 503) {
    return 'Belge işleme servisine ulaşılamadı. Birkaç dakika sonra yeniden deneyin.';
  }
  if (kod === 429) return 'Çok fazla belge işleme isteği gönderildi. Biraz bekleyip deneyin.';
  if (kod === 413) return 'Belge çok büyük. Daha küçük bir dosya yükleyin.';
  if (kod === 401 || kod === 403) return 'Bu işlem için yetkiniz yok ya da oturumunuz düşmüş.';
  const taban = String(varsayilan || 'Belge okunamadı');
  return kod ? taban + ' (HTTP ' + kod + ')' : taban;
}
