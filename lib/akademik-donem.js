// ══════════════════════════════════════════════════════════════
// AKADEMİK YIL / DÖNEM
//
// Yaz okulu dilekçesinde "20..-20.. Eğitim-Öğretim Yılı Yaz Döneminde"
// cümlesi var; bu bilgi hiçbir formda sorulmuyor çünkü tarihten kesin olarak
// çıkarılabiliyor: akademik yıl EYLÜL'de başlar. Yani Ocak–Ağustos arasındaki
// bir başvuru bir ÖNCEKİ eylülde başlayan yıla aittir.
//   08.08.2026 → "2025-2026"   (yaz dönemi, geçen eylülde başlayan yıl)
//   15.10.2026 → "2026-2027"
//
// Sınır ay (eylül) sabit değil, parametre: bazı kurumlar ekim başlangıçlı.
// ══════════════════════════════════════════════════════════════

const BASLANGIC_AYI_VARSAYILAN = 9; // Eylül (1-12)

/** Tarihi güvenle Date'e çevirir; çözülemezse null. */
function tarihCoz(t) {
  if (t == null || t === '') return null;
  if (t instanceof Date) return isNaN(t.getTime()) ? null : t;
  // Firestore/Mongo zaman damgası biçimleri
  if (typeof t === 'object') {
    const sn = t._seconds != null ? t._seconds : t.seconds;
    if (typeof sn === 'number') return new Date(sn * 1000);
    return null;
  }
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Verilen tarihin ait olduğu akademik yıl. Tarih verilmezse/çözülemezse
 * bugünün tarihi kullanılır — belge üretimi bu yüzden hiç boş kalmaz.
 * @param {Date|string|number|null} tarih
 * @param {number} baslangicAyi akademik yılın başladığı ay (1-12)
 * @returns {string} "2025-2026"
 */
export function akademikYilBul(tarih, baslangicAyi) {
  const d = tarihCoz(tarih) || new Date();
  const ay0 = Number(baslangicAyi);
  const bas = ay0 >= 1 && ay0 <= 12 ? ay0 : BASLANGIC_AYI_VARSAYILAN;
  const yil = d.getFullYear();
  const ay = d.getMonth() + 1; // 1-12
  const ilk = ay >= bas ? yil : yil - 1;
  return ilk + '-' + (ilk + 1);
}

/**
 * Tarihin düştüğü yarıyıl etiketi. Yaz okulu haziran–ağustos arasındadır;
 * eylül–ocak Güz, şubat–mayıs Bahar sayılır.
 * @returns {'Güz'|'Bahar'|'Yaz'}
 */
export function donemEtiketi(tarih) {
  const d = tarihCoz(tarih) || new Date();
  const ay = d.getMonth() + 1;
  if (ay >= 6 && ay <= 8) return 'Yaz';
  if (ay >= 9 || ay === 1) return 'Güz';
  return 'Bahar';
}
