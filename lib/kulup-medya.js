// ══════════════════════════════════════════════════════════════
// TOPLULUK AKIŞI — EK DOSYA TÜRLERİ
//
// Öğrenci topluluklarının akışına eklenen dosyaların nasıl gösterileceğini
// belirler: görsel ve video yerinde önizlenir, geri kalanı bağlantı olarak
// listelenir.
//
// ── TÜR NEDEN ADDAN ÇÖZÜLÜYOR ──
// Sunucu yükleme yanıtında `mimetype` döner, ama kayıtta saklanan alanlar
// ad + adres; eski gönderilerde mime hiç yok. Ad her kayıtta var, o yüzden
// karar UZANTIYA dayanır; mime varsa yalnızca destek olarak kullanılır.
//
// ── SVG BİLEREK GÖRSEL SAYILIYOR ──
// Sunucu SVG'yi indirmeye zorlar (Content-Disposition: attachment), çünkü
// doğrudan gezinilen bir SVG kendi kaynağında betik çalıştırabilir. Ama
// <img src> disposition'ı yok sayar ve SVG'yi betiksiz, güvenle çizer —
// önizleme <img> ile yapıldığı sürece bu güvenlidir.
// ══════════════════════════════════════════════════════════════

const GORSEL = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg'];
// Tarayıcıda <video> ile oynatılabilenler. Sunucu mp4/webm için doğru
// Content-Type döndürüyor; .mov ve .ogg da yaygın olduğu için kabul edilir.
const VIDEO = ['mp4', 'webm', 'ogg', 'ogv', 'mov', 'm4v'];

/** Dosya adının uzantısı, noktasız ve küçük harf. */
export function uzanti(ad) {
  const a = String(ad == null ? '' : ad).trim();
  const nokta = a.lastIndexOf('.');
  if (nokta < 0 || nokta === a.length - 1) return '';
  return a.slice(nokta + 1).toLowerCase();
}

/**
 * Dosyanın gösterim türü: 'gorsel' | 'video' | 'belge'.
 * @param dosya { name, fileName, url, mimetype }
 */
export function medyaTuru(dosya) {
  const d = dosya || {};
  const mime = String(d.mimetype || d.mime || '').toLowerCase();
  if (mime.startsWith('image/')) return 'gorsel';
  if (mime.startsWith('video/')) return 'video';
  // Ad yoksa adresin son parçası da bir uzantı taşıyabilir.
  const ad = String(d.name || d.fileName || d.url || '');
  const u = uzanti(ad.split('?')[0]);
  if (GORSEL.indexOf(u) >= 0) return 'gorsel';
  if (VIDEO.indexOf(u) >= 0) return 'video';
  return 'belge';
}

/** Yerinde önizlenebilir mi (görsel ya da video)? */
export function onizlenebilirMi(dosya) {
  const t = medyaTuru(dosya);
  return t === 'gorsel' || t === 'video';
}

/** Bir gönderinin önizlenecek ekleri — sıra korunur. */
export function medyaEkleri(dosyalar) {
  return (dosyalar || []).filter(onizlenebilirMi);
}

/** Bir gönderinin bağlantı olarak listelenecek ekleri. */
export function belgeEkleri(dosyalar) {
  return (dosyalar || []).filter((f) => !onizlenebilirMi(f));
}

/** Dosya seçicinin kabul ettiği türler. */
export const FEED_KABUL = []
  .concat(
    ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].map((u) => '.' + u),
    GORSEL.map((u) => '.' + u),
    VIDEO.map((u) => '.' + u)
  )
  .join(',');

/** Sunucunun kabul ettiği azami boyut (server/routes/files.js: 50 MB). */
export const EN_BUYUK_MB = 50;

/**
 * Dosya boyutunu okunur biçime çevirir.
 * Video eklenebildiği için boyut artık gerçekten önemli: 40 MB'lık bir
 * dosyayı yüklemeye başlamadan önce görmek gerekiyor.
 */
export function boyutMetni(bayt) {
  const b = Number(bayt);
  if (!Number.isFinite(b) || b <= 0) return '';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return Math.round(b / 1024) + ' KB';
  return (b / (1024 * 1024)).toFixed(b < 10 * 1024 * 1024 ? 1 : 0) + ' MB';
}
