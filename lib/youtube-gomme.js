// ══════════════════════════════════════════════════════════════
// YOUTUBE BAĞLANTISI → GÖMME ADRESİ
//
// Tanıtım sayfasındaki modül anlatımlarında sağ panel görsel yüklemesi
// istiyordu. Ekran görüntüsü çekip yüklemek yerine, zaten YouTube'a konmuş
// tanıtım videolarının bağlantısı yapıştırılabilsin diye bu dönüştürücü var.
//
// Kullanıcı bağlantıyı adres çubuğundan kopyalar; bu da tek bir biçim
// değildir: youtu.be kısa hâli, /watch?v=, /embed/, /shorts/, /live/ ve
// başında protokol olmayan yapıştırmalar. Hepsi aynı videoyu gösterir.
//
// ── GİZLİLİK ──
// Gömme adresi `youtube-nocookie.com` üzerinden verilir: ziyaretçi videoyu
// OYNATMADIKÇA reklam/izleme çerezi yazılmaz. Tanıtım sayfası kurumun
// kamuya açık yüzü; ziyaretçiye çerez bırakmadan bilgi vermek esas olmalı.
// ══════════════════════════════════════════════════════════════

/* global URL */
// `URL` hem tarayıcıda hem Node'da var; lib dosyaları için tanımlı
// ortam listesinde bulunmadığından burada bildiriliyor.

const KIMLIK = /^[A-Za-z0-9_-]{11}$/;

function metin(d) {
  return String(d == null ? '' : d).trim();
}

/**
 * Bağlantıdan video kimliğini çıkarır.
 * @returns {string} 11 karakterli kimlik, çözülemezse ''
 */
export function videoKimligi(baglanti) {
  const ham = metin(baglanti);
  if (!ham) return '';
  // Yalnız kimlik yapıştırılmışsa doğrudan kabul.
  if (KIMLIK.test(ham)) return ham;

  let u;
  try {
    // Protokolsüz yapıştırma yaygın: "www.youtube.com/watch?v=..."
    u = new URL(/^https?:\/\//i.test(ham) ? ham : 'https://' + ham);
  } catch {
    return '';
  }

  const host = u.hostname.replace(/^www\./i, '').toLowerCase();
  const yol = u.pathname.replace(/\/+$/, '');

  if (host === 'youtu.be') {
    const k = yol.split('/')[1] || '';
    return KIMLIK.test(k) ? k : '';
  }
  if (host !== 'youtube.com' && host !== 'm.youtube.com' && host !== 'youtube-nocookie.com') {
    return '';
  }
  const v = u.searchParams.get('v');
  if (v && KIMLIK.test(v)) return v;

  const parcalar = yol.split('/').filter(Boolean);
  // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
  if (['embed', 'shorts', 'live', 'v'].indexOf(parcalar[0]) >= 0) {
    const k = parcalar[1] || '';
    return KIMLIK.test(k) ? k : '';
  }
  return '';
}

/** Bağlantı geçerli bir YouTube videosu mu? */
export function youtubeMu(baglanti) {
  return videoKimligi(baglanti) !== '';
}

/**
 * Gömme (iframe src) adresi. Çözülemezse '' döner — çağıran boş adresle
 * iframe basmamalı.
 */
export function gommeAdresi(baglanti) {
  const k = videoKimligi(baglanti);
  if (!k) return '';
  return 'https://www.youtube-nocookie.com/embed/' + k + '?rel=0&modestbranding=1';
}

/** Kapak görseli — video oynatılmadan önce gösterilecek küçük resim. */
export function kapakAdresi(baglanti) {
  const k = videoKimligi(baglanti);
  return k ? 'https://i.ytimg.com/vi/' + k + '/hqdefault.jpg' : '';
}
