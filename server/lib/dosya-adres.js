// ══════════════════════════════════════════════════════════════
// DOSYA ADI VE ADRES DÖNÜŞÜMLERİ
//
// İki küçük yardımcı, `routes/files.js` içinde tanımlıydı ve testleri o
// dosyayı require ediyordu. Ama o dosya bir express router'ı: yüklenmesi
// express, multer, mongodb ve rate-limit paketlerini de yüklüyor. Bu
// paketler `server/package.json`'da, kökte değil — kökten çalışan vitest
// (ve CI'daki "Frontend build & test" işi) suiti "Cannot find module
// 'express'" diye HİÇ TOPLAYAMIYORDU. Yani iki saf fonksiyonun testi,
// ilgisiz bir bağımlılık zinciri yüzünden hep kırmızıydı.
//
// Saf olan saf yerde durur: burada hiçbir dış paket yok.
// ══════════════════════════════════════════════════════════════

// Content-Disposition başlığı ASCII olmak zorunda; dosya adındaki Türkçe
// harfler burada indirgenir. Belgelerin kendi içeriği etkilenmez.
const TR_ASCII = {
  ç: 'c',
  Ç: 'C',
  ğ: 'g',
  Ğ: 'G',
  ı: 'i',
  İ: 'I',
  ö: 'o',
  Ö: 'O',
  ş: 's',
  Ş: 'S',
  ü: 'u',
  Ü: 'U',
};

/**
 * Türkçe harfleri ASCII karşılığına indirger.
 *
 * Ayraç sayfası başlığında da kullanılır: pdf-lib'in StandardFonts'u WinAnsi
 * kodlar, ş/ğ/İ/ı gömülemez ve drawText HATA FIRLATIR — yani tek bir Türkçe
 * ders adı bütün birleştirmeyi düşürürdü.
 */
const asciiIndirge = (s) =>
  String(s || '')
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => TR_ASCII[c])

    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// '/api/files/download/muafiyet_belgeler/123_x.pdf' → 'muafiyet_belgeler/123_x.pdf'
const urlToRelPath = (u) => {
  const s = String(u || '').trim();
  if (!s) return '';
  const m = s.match(/\/api\/files\/(?:download|view)\/(.+)$/);
  const rel = m ? m[1] : s.replace(/^\/+/, '');
  try {
    return decodeURIComponent(rel.split('?')[0]);
  } catch (_e) {
    return rel.split('?')[0];
  }
};

module.exports = { TR_ASCII, asciiIndirge, urlToRelPath };
