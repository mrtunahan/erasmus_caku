// ══════════════════════════════════════════════════════════════
// PERFORMANS MODÜLÜNÜN GEZİNME YAPISI
//
// ⚠ BEŞ SEKME AYNI SATIRDA, İKİ FARKLI SORUYU BİRDEN SORUYORDU:
//
//     Verilerim | Bölüm Özeti | Fakülte Özeti |
//     Stratejik Plan İzleme | Fakülte Özeti — Stratejik Plan
//
// Burada aslında BİRBİRİNDEN BAĞIMSIZ iki boyut var:
//   • NE bakıyorum?    → gösterge raporları / stratejik plan
//   • NEREYE bakıyorum? → kendi verim / bölümüm / fakültem
//
// İkisi tek satıra düzleştirilince "Fakülte Özeti" ekranda İKİ KEZ, iki ayrı
// anlamda beliriyor; hangisinin gösterge hangisinin stratejik plan olduğunu
// ancak tıklayınca anlıyorsunuz. "Stratejik Plan İzleme"nin bölüm kapsamında
// olduğu ise adından hiç anlaşılmıyor. Akademisyenin gözünde beş ayrı,
// birbiriyle ilgisiz sekme duruyor.
//
// ── ÇÖZÜM: BOYUTLARI AYIRMAK ──
// Üst satır "ne"yi seçer (Veri Girişi · Gösterge Raporları · Stratejik Plan),
// ikinci satır "nerede"yi (Bölümüm · Fakülte). Kapsam seçeneği tek ise ikinci
// satır hiç çizilmez — kullanıcıya seçim gibi görünen tek seçenek sunulmaz.
//
// Sekme kimlikleri DEĞİŞMEDİ ('own', 'dept', 'faculty', 'strateji',
// 'strateji-fac'): yalnız nasıl gruplandıkları değişti. Böylece ekranın geri
// kalanı ve varsa dış bağlantılar olduğu gibi çalışmaya devam eder.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

/**
 * Bölümler ve içlerindeki kapsamlar.
 *
 * `yetki` alanı, o kapsamın hangi yetki bayrağına bağlı olduğunu söyler:
 *   own     → kullanıcı sistemde akademisyen olarak kayıtlı
 *   dept    → bölüm/fakülte/üniversite yetkilisi
 *   faculty → fakülte/üniversite yetkilisi
 *   deptVeyaOwn → stratejik plan bölüm görünümü (ikisinden biri yeter)
 */
export const PERFORMANS_BOLUMLERI = [
  {
    id: 'veri',
    ad: 'Veri Girişi',
    aciklama: 'Kendi gösterge değerlerinizi aylık olarak girin.',
    ikon: 'kalem',
    kapsamlar: [{ id: 'own', ad: 'Verilerim', yetki: 'own', gorunum: 'own' }],
  },
  {
    id: 'gosterge',
    ad: 'Gösterge Raporları',
    aciklama: 'Girilen değerlerin bölüm ve fakülte düzeyinde toplamı.',
    ikon: 'grafik',
    kapsamlar: [
      { id: 'bolum', ad: 'Bölümüm', yetki: 'dept', gorunum: 'dept' },
      { id: 'fakulte', ad: 'Fakülte', yetki: 'faculty', gorunum: 'faculty' },
    ],
  },
  {
    id: 'strateji',
    ad: 'Stratejik Plan',
    aciklama: 'Göstergelerin stratejik plan hedefleriyle eşleşen izlemesi.',
    ikon: 'hedef',
    kapsamlar: [
      { id: 'bolum', ad: 'Bölümüm', yetki: 'deptVeyaOwn', gorunum: 'strateji' },
      { id: 'fakulte', ad: 'Fakülte', yetki: 'faculty', gorunum: 'strateji-fac' },
    ],
  },
];

/** Bir kapsamın yetki koşulu sağlanıyor mu? */
function kapsamAcikMi(kapsam, yetkiler) {
  const y = yetkiler || {};
  switch (metin(kapsam && kapsam.yetki)) {
    case 'own':
      return !!y.own;
    case 'dept':
      return !!y.dept;
    case 'faculty':
      return !!y.faculty;
    case 'deptVeyaOwn':
      return !!y.dept || !!y.own;
    default:
      return false;
  }
}

/**
 * Kullanıcının görebildiği bölümler ve kapsamlar.
 * Hiç kapsamı kalmayan bölüm listeye girmez.
 */
export function kullanilabilirBolumler(yetkiler) {
  return PERFORMANS_BOLUMLERI.map((b) => ({
    ...b,
    kapsamlar: b.kapsamlar.filter((k) => kapsamAcikMi(k, yetkiler)),
  })).filter((b) => b.kapsamlar.length > 0);
}

/** Görünüm kimliğinden ({bolum, kapsam}) çözümü. Bilinmeyen görünümde null. */
export function gorunumCoz(gorunum) {
  const g = metin(gorunum);
  for (const b of PERFORMANS_BOLUMLERI) {
    const k = b.kapsamlar.find((x) => x.gorunum === g);
    if (k) return { bolumId: b.id, kapsamId: k.id, bolum: b, kapsam: k };
  }
  return null;
}

/** (bölüm, kapsam) → görünüm kimliği. Eşleşme yoksa ''. */
export function gorunumSec(bolumId, kapsamId) {
  const b = PERFORMANS_BOLUMLERI.find((x) => x.id === metin(bolumId));
  if (!b) return '';
  const k = b.kapsamlar.find((x) => x.id === metin(kapsamId));
  return k ? k.gorunum : '';
}

/** Bu görünüm kullanıcıya açık mı? */
export function gorunumAcikMi(gorunum, yetkiler) {
  const c = gorunumCoz(gorunum);
  return !!c && kapsamAcikMi(c.kapsam, yetkiler);
}

/**
 * Kullanıcının açılışta göreceği görünüm.
 *
 * ⚠ SIRA ÖNEMLİ. Akademisyen açılışta KENDİ veri giriş ekranını görmeli;
 * eskiden akademisyen listesi henüz yüklenmemişken `capOwn` false olduğu için
 * kullanıcı "Fakülte Genel Toplam"da takılı kalabiliyordu. Liste gelince
 * görünüm yeniden hesaplanır (bkz. gorunumDuzelt).
 */
export function varsayilanGorunum(yetkiler) {
  const bolumler = kullanilabilirBolumler(yetkiler);
  if (bolumler.length === 0) return 'own';
  return bolumler[0].kapsamlar[0].gorunum;
}

/**
 * Yetkiler değişince görünümü düzelt.
 *
 * Aynı bölümde kalmaya çalışır: fakülte yetkisi düşen kullanıcı "Stratejik
 * Plan / Fakülte"den "Stratejik Plan / Bölümüm"e iner, bambaşka bir ekrana
 * fırlamaz. O da yoksa varsayılana döner.
 *
 * @returns {string} kullanılacak görünüm (değişiklik yoksa gelen değer)
 */
export function gorunumDuzelt(gorunum, yetkiler) {
  if (gorunumAcikMi(gorunum, yetkiler)) return metin(gorunum);
  const c = gorunumCoz(gorunum);
  if (c) {
    const ayniBolum = kullanilabilirBolumler(yetkiler).find((b) => b.id === c.bolumId);
    if (ayniBolum) return ayniBolum.kapsamlar[0].gorunum;
  }
  return varsayilanGorunum(yetkiler);
}

/**
 * Ekranın çizeceği gezinme durumu — JSX yalnız bunu okur.
 *
 * @returns {{
 *   bolumler: object[],       // üst satır
 *   aktifBolum: object|null,
 *   kapsamlar: object[],      // ikinci satır (tek kapsamda BOŞ döner)
 *   aktifKapsam: object|null,
 *   tekBolum: boolean         // tek bölüm varsa üst satır da gereksizdir
 * }}
 */
export function gezinmeDurumu(gorunum, yetkiler) {
  const bolumler = kullanilabilirBolumler(yetkiler);
  const hedef = gorunumDuzelt(gorunum, yetkiler);
  const c = gorunumCoz(hedef);
  const aktifBolum = c ? bolumler.find((b) => b.id === c.bolumId) || null : null;
  const aktifKapsam =
    aktifBolum && c ? aktifBolum.kapsamlar.find((k) => k.id === c.kapsamId) || null : null;
  return {
    bolumler,
    aktifBolum,
    // Tek kapsamlı bölümde ikinci satır çizilmez: kullanıcıya seçim gibi
    // görünen ama tek seçeneği olan bir şerit göstermek gürültüdür.
    kapsamlar: aktifBolum && aktifBolum.kapsamlar.length > 1 ? aktifBolum.kapsamlar : [],
    aktifKapsam,
    tekBolum: bolumler.length <= 1,
  };
}

/**
 * Bölüm değiştirilirken hangi kapsam seçilmeli?
 *
 * Kullanıcı "Gösterge / Fakülte"den "Stratejik Plan"a geçerken fakültede
 * KALMALI — her geçişte bölüme düşüp yeniden fakülteyi seçmek zorunda
 * kalmasın. Aynı adlı kapsam yoksa bölümün ilk kapsamına düşülür.
 */
export function bolumeGecerken(hedefBolumId, mevcutGorunum, yetkiler) {
  const bolumler = kullanilabilirBolumler(yetkiler);
  const hedef = bolumler.find((b) => b.id === metin(hedefBolumId));
  if (!hedef) return varsayilanGorunum(yetkiler);
  const c = gorunumCoz(mevcutGorunum);
  if (c) {
    const ayni = hedef.kapsamlar.find((k) => k.id === c.kapsamId);
    if (ayni) return ayni.gorunum;
  }
  return hedef.kapsamlar[0].gorunum;
}

/** Ekran başlığı: "Gösterge Raporları · Bölümüm" */
export function gorunumBasligi(gorunum) {
  const c = gorunumCoz(gorunum);
  if (!c) return '';
  if (c.bolum.kapsamlar.length <= 1) return c.bolum.ad;
  return c.bolum.ad + ' · ' + c.kapsam.ad;
}

/**
 * Kullanıcının rolüne göre kısa açıklama — modülün üstünde tek satır.
 * Yetkisiz kullanıcıya ne yapması gerektiğini söyler.
 */
export function rolAciklamasi(yetkiler) {
  const y = yetkiler || {};
  if (y.faculty) {
    return 'Fakülte yetkilisi: kendi verilerinizi girer, bölüm ve fakülte raporlarını görürsünüz.';
  }
  if (y.dept) {
    return 'Bölüm yetkilisi: kendi verilerinizi girer, bölümünüzün raporlarını görürsünüz.';
  }
  if (y.own) {
    return 'Akademisyen: aylık gösterge verilerinizi girer, stratejik plan izlemesini görürsünüz.';
  }
  return 'Bu modülü kullanmak için sistemde akademisyen olarak kayıtlı olmanız ya da bölüm/fakülte yetkilisi olmanız gerekir.';
}
