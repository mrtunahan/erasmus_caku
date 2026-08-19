// ══════════════════════════════════════════════════════════════
// AKADEMİSYEN BU BÖLÜMDE Mİ?
//
// Bölüm bazlı her ekran (proje, sınav otomasyonu, ders programı, anketler,
// komisyonlar, kullanıcı ve fakülte yönetimi) bu tek kuralı kullanır.
//
// ── KURALIN İKİ ZOR NOKTASI ──
// 1. KİMLİK BİÇİMİ. Aynı bölüm slug ('bilgisayar') ve ObjectId ile
//    anılabiliyor; akademisyenin kaydında hangisinin durduğu kaydın ne zaman
//    açıldığına bağlı. Ham eşitlik kişiyi kendi bölümünde göstermiyordu.
//    Bölümün TÜM kimlikleri denenir.
//
// 2. BÖLÜM ADI YALNIZ SON ÇARE. Eski ham kayıtlarda `departmentId` boş, yalnız
//    `department` metni var; onları kaybetmemek için ad da denenir. Ama ad
//    KOŞULSUZ denenirse kimliği Makine'yi gösteren, eski `department` metni
//    Bilgisayar'da kalmış kişi İKİ bölümde birden görünür ("hayalet
//    akademisyen" şikâyeti). Bu yüzden ad yalnızca `departmentId` BOŞKEN
//    devreye girer: kimlik varsa kimlik ESASTIR.
// ══════════════════════════════════════════════════════════════

import { bolumKimlikleri } from './bolum-kimlik.js';

/** Ad karşılaştırma anahtarı — Türkçe küçük harf, boşluklar atılır. */
function adAnahtari(s) {
  return (s || '').toString().toLocaleLowerCase('tr-TR').replace(/\s+/g, '');
}

/**
 * @param {Object} akademisyen  { departmentId, additionalDepartments, department }
 * @param {string} bolumId      herhangi bir kimlik biçimi
 * @param {Array}  bolumler     window.DEPARTMENTS biçimi (kimlik varyantları için)
 * @param {string} [bolumAdi]   yalnız kimliksiz ham kayıtlar için
 */
export function akademisyenBolumdeMi(akademisyen, bolumId, bolumler, bolumAdi) {
  if (!akademisyen || !bolumId) return false;
  const kimlikler = bolumKimlikleri(bolumler, bolumId);

  if (kimlikler.includes(String(akademisyen.departmentId || ''))) return true;

  // Çapraz-bölüm ataması: ek bölüm listesi de kimlik varyantlarıyla aranır.
  const ekler = Array.isArray(akademisyen.additionalDepartments)
    ? akademisyen.additionalDepartments
    : [];
  if (ekler.some((x) => kimlikler.includes(String(x)))) return true;

  // Ham veri son çaresi — YALNIZ kimlik yokken (bkz. başlık, 2. nokta).
  if (!akademisyen.departmentId && bolumAdi && akademisyen.department) {
    if (adAnahtari(akademisyen.department) === adAnahtari(bolumAdi)) return true;
  }
  return false;
}
