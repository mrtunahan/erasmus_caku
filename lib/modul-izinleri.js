// ══════════════════════════════════════════════════════════════
// BÖLÜM MODÜLLERİ — HANGİ ROL HANGİ MODÜLÜ GÖRÜR?
//
// ⚠ AYNI LİSTE İKİ YERDEYDİ: sol menü (app-shell → Sidebar.getVisibleModules)
// ve adres satırı koruması (app-shell → rota etkisi). Birine eklenen modül
// ötekine eklenmezse ya menüde görünüp tıklanınca portala atıyor ya da
// menüde yokken adresle açılıyordu. Liste artık buradan okunur.
//
// Komisyon modülleri, memur, aday ve öğrencinin ders seçimi kapısı burada
// DEĞİL: onlar çağıranın kendi dalında kalır (davranış birebir korunur).
// ══════════════════════════════════════════════════════════════

/** Çapraz bölümde (ek bölümde ders veren) kullanıcının yedek listesi. */
export const CAPRAZ_YEDEK = ['dersprogrami', 'sinav', 'projeler', 'dersodalari'];

/** Yönetici bayrağı olmayan akademisyen. */
export const AKADEMISYEN_MODULLERI = [
  'benimakademik',
  'sinav',
  'formlar',
  'dersprogrami',
  'lisansustu',
  'dersodalari',
  'projeler',
  'staj',
  'performans',
];

/** Öğrenci (ders seçimi kapısı açıkken). */
export function ogrenciModulleri(dikeyKaydi) {
  return [
    'benim',
    'erasmus',
    'dersodalari',
    'projeler',
    'formlar',
    'staj',
    'muafiyet',
    'capyandal',
    'yataygecis',
    // Dikey geçiş aday hesabının işidir; numaralı öğrencide yalnız
    // numarasına aktarılmış kaydı varsa (salt görüntüleme) görünür.
    ...(dikeyKaydi ? ['dikeygecis'] : []),
    'gelenbelgeler',
  ];
}

/**
 * Rolün bölüm modülleri (kimlik listesi).
 *
 * @param {object} o
 * @param {boolean} o.capraz       aktif bölüm kullanıcının EK bölümü mü
 * @param {string[]} [o.caprazListe] çapraz bölümde izinli liste (caprazModulleri)
 * @param {boolean} o.yonetici     sistem/bölüm/fakülte/üniversite yetkilisi
 * @param {boolean} o.akademisyen  yönetici olmayan akademisyen
 * @param {boolean} [o.dikeyKaydi] öğrencinin aktarılmış dikey geçiş kaydı var mı
 * @param {string[]} o.tumIdler    bütün bölüm modüllerinin kimlikleri
 */
export function bolumModulIzinleri(o) {
  const p = o || {};
  if (p.capraz) return Array.isArray(p.caprazListe) ? p.caprazListe : CAPRAZ_YEDEK.slice();
  if (p.yonetici) return (p.tumIdler || []).filter((id) => id !== 'benim');
  if (p.akademisyen) return AKADEMISYEN_MODULLERI.slice();
  return ogrenciModulleri(!!p.dikeyKaydi);
}
