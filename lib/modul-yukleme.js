// ══════════════════════════════════════════════════════════════
// MODÜL YÜKLEME HATASI — BAYAT PARÇA (STALE CHUNK)
//
// Uygulama modülleri tembel (lazy) yüklenir: giriş dosyası, adında içerik
// özeti taşıyan bir parçayı `import()` ile ister
// (ör. yatay-gecis-modulu-WIpcbSwD.js).
//
// ⚠ BU DOSYA CANLIDA GÖRÜLEN BİR ARIZADAN DOĞDU. Sunucuya yeni sürüm
// yüklenince eski parçalar diskten SİLİNİYOR, ama açık duran sekme hâlâ eski
// giriş dosyasını çalıştırıyor ve eski parça adını istiyor. nginx o adı
// bulamayıp 404 dönüyor; `import()` reddediliyor ve kullanıcı
// "Modül yüklenemedi" duvarına çarpıyor. Kullanıcının o ana kadar açmadığı
// modüller (ör. yatay geçiş) her dağıtımdan sonra bu duruma düşüyordu —
// "sürekli hata alıyorum" tarifi tam olarak budur.
//
// Ctrl+Shift+R gerçekten çözüyor; ama çözümü kullanıcıya yaptırmak yanlış:
// sayfa BİR KEZ kendisi yenilenmeli. "Bir kez" şart — yenileme hatayı
// çözmezse (gerçekten bozuk bir parça, ağ kesintisi) sonsuz yenileme
// döngüsüne girer. Bu yüzden karar oturum başına ve modül başına bir kez
// verilir, damga oturum deposunda tutulur.
// ══════════════════════════════════════════════════════════════

const DAMGA_ONEKI = 'caku_modul_yenileme:';

/**
 * Hata, eksik/bayat parça hatası mı?
 *
 * Tarayıcılar aynı durumu farklı metinlerle anlatıyor; hepsi de
 * "istenen modül dosyası getirilemedi" demek. Sözdizimi/çalışma zamanı
 * hataları (gerçek kod hataları) buraya GİRMEZ — onlarda yenilemek işe
 * yaramaz, yalnız döngü üretir.
 */
export function bayatParcaHatasiMi(hata) {
  const m = String((hata && (hata.message || hata)) || '').toLowerCase();
  if (!m) return false;
  return (
    m.includes('failed to fetch dynamically imported module') ||
    m.includes('error loading dynamically imported module') ||
    m.includes('importing a module script failed') ||
    m.includes('failed to load module script') ||
    m.includes('dynamically imported module') ||
    // Safari: "Unable to load ..." / bazı sürümlerde düz ağ hatası
    (m.includes('unable to load') && m.includes('.js'))
  );
}

/** Bu modül için yenileme damgası anahtarı. */
export function damgaAnahtari(modulAdi) {
  return DAMGA_ONEKI + String(modulAdi == null ? '' : modulAdi);
}

/**
 * Ne yapmalı?
 *   'yenile' → sayfa bir kez yeniden yüklenmeli (yeni giriş dosyası gelsin)
 *   'hata'   → yenileme denendi ya da hata bayat parça hatası değil; mesaj göster
 *
 * @param {Error}  hata
 * @param {string} modulAdi
 * @param {Storage} depo sessionStorage benzeri (yoksa yenileme yapılmaz)
 */
export function yuklemeKarari(hata, modulAdi, depo) {
  if (!bayatParcaHatasiMi(hata)) return 'hata';
  if (!depo) return 'hata';
  const anahtar = damgaAnahtari(modulAdi);
  try {
    if (depo.getItem(anahtar)) return 'hata';
    depo.setItem(anahtar, String(Date.now()));
    return 'yenile';
  } catch {
    // Depo yoksa/yazılamıyorsa (gizli sekme) yenilemeyi göze alamayız:
    // damga tutulamayınca döngü riski var.
    return 'hata';
  }
}

/** Modül yüklenince damga silinir; sonraki dağıtımda yeniden hakkı olsun. */
export function damgayiSil(modulAdi, depo) {
  if (!depo) return;
  try {
    depo.removeItem(damgaAnahtari(modulAdi));
  } catch {
    /* yoksay */
  }
}

/** Kullanıcıya gösterilecek metin. */
export function hataMetni(hata) {
  return bayatParcaHatasiMi(hata)
    ? 'Uygulamanın yeni bir sürümü yayınlanmış ve bu bölümün dosyası ' +
        'değişmiş olabilir. Sayfayı yenilemeyi deneyin (Ctrl+Shift+R).'
    : 'Bu bölüm yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.';
}
