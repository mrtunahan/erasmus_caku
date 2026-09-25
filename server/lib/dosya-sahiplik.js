// ══════════════════════════════════════════════════════════════
// YÜKLENEN DOSYAYA KİM ERİŞEBİLİR
//
// ⚠ SORUN: /api/files/download/* yalnız "giriş yapmış mı" diye soruyordu.
// Staj belgeleri `staj_belgeler/<öğrenciNo>/...` altında duruyor ve dosya
// yolları `internship_uploads` kayıtlarında yazılı. O koleksiyon da öğrenci
// okumasına açıktı: bir öğrenci bütün başvuruların yollarını alıp nüfus
// cüzdanı fotokopisi, SGK belgesi gibi dosyaları indirebiliyordu.
//
// Koleksiyon tarafı kapatıldı (server/lib/ogrenci-okuma.js); bu dosya İKİNCİ
// kapıyı kapatır: adresi bir şekilde ele geçse bile dosyanın kendisi
// sahibinden başkasına verilmez.
//
// ── NİÇİN YALNIZ STAJ KLASÖRÜ ──
// Sahiplik ancak yoldan OKUNABİLDİĞİ yerde denetlenebilir; `staj_belgeler`
// öğrenci numarasını klasör adında taşıyor. Öteki klasörlerde (muafiyet
// belgeleri, formlar, portal dosyaları) yol bir kişiye bağlı değil; oralarda
// erişim, dosyanın adresini taşıyan KAYDIN okunabilirliğine dayanır ve o
// kayıtlar zaten sahibine daraltılmıştır. Buraya "her dosyayı kilitle" gibi
// bir kural koymak, meşru indirmeleri (akademisyenin öğrenci dilekçesini
// açması, memurun belgeyi görmesi) kırardı.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

/** Öğrenci numarasını klasör adında taşıyan kök klasörler. */
const NUMARALI_KLASORLER = ['staj_belgeler'];

/**
 * Yolun işaret ettiği öğrenci numarası ('' ise yol kişiye bağlı değil).
 * `staj_belgeler/2021001/dosya.pdf` → '2021001'
 */
function yolunOgrenciNumarasi(yol) {
  const parcalar = metin(yol).replace(/\\/g, '/').split('/').filter(Boolean);
  if (parcalar.length < 2) return '';
  if (NUMARALI_KLASORLER.indexOf(parcalar[0]) < 0) return '';
  // Numara benzeri değilse (eski kayıtlarda ad olabilir) sahiplik çözülemez.
  return /^[A-Za-z0-9._-]{3,40}$/.test(parcalar[1]) ? parcalar[1] : '';
}

/**
 * Bu kullanıcı bu dosyayı indirebilir mi?
 *
 * @param {string} yol        UPLOAD kökenine göre göreli yol
 * @param {object} kullanici  { role, identifier } (yoksa denetim yapılmaz)
 * @param {string[]} numaralar Öğrencinin kendi numaraları (ÇAP'ta iki tane)
 */
function dosyaErisebilirMi(yol, kullanici, numaralar) {
  // Personel (akademisyen, bölüm yetkilisi, memur, admin) kısıtlanmaz: staj
  // belgesini değerlendiren, imzalayan, arşivleyen onlar.
  if (!kullanici || metin(kullanici.role) !== 'student') return { izin: true, sebep: '' };

  const sahip = yolunOgrenciNumarasi(yol);
  if (!sahip) return { izin: true, sebep: '' }; // kişiye bağlı olmayan klasör

  const benim = (Array.isArray(numaralar) ? numaralar : [numaralar])
    .map(metin)
    .filter(Boolean)
    .concat(metin(kullanici.identifier) ? [metin(kullanici.identifier)] : []);

  if (benim.indexOf(sahip) >= 0) return { izin: true, sebep: '' };
  return { izin: false, sebep: 'baskasinin_belgesi' };
}

module.exports = { NUMARALI_KLASORLER, yolunOgrenciNumarasi, dosyaErisebilirMi };
