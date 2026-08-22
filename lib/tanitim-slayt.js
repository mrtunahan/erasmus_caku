// ══════════════════════════════════════════════════════════════
// TANITIM SLAYTLARI
//
// Tanıtım sayfasındaki 3B sayfa çevirme slider'ının içeriği. Yetkili
// uygulamadan slayt ekler (başlık, metin, görsel); tanıtım sayfası bunları
// ANONİM olarak okur.
//
// ── İKİ AYRI OKUYUCU, TEK KURAL ──
// Slaytları hem tanıtım sayfası (saf HTML, React yok) hem uygulamadaki
// yönetim ekranı okur. Sıralama ve "yayında mı" kararı ikisinde ayrı ayrı
// yazılsaydı, yetkilinin yönetim ekranında gördüğü sıra ile ziyaretçinin
// gördüğü sıra ayrışırdı. Kural burada, tek yerde.
//
// ── GÖRSEL ADI DIŞARIDAN GELİR ──
// Slayt kaydındaki görsel adı kullanıcı girdisidir ve doğrudan dosya
// yoluna çevrilir. `../` ile yükleme dizininin dışına çıkma denemesi
// sunucuda da istemcide de aynı kuralla elenir.
// ══════════════════════════════════════════════════════════════

// Dizin ayracı, üst dizin çıkışı ve denetim karakteri barındıran adlar.
// eslint-disable-next-line no-control-regex
const TEHLIKELI = /[/\\]|\.\.|[\x00-\x1f\x7f]/;
const IZINLI_UZANTI = /\.(jpe?g|png|webp|gif|avif)$/i;

/** Görsel dosya adı güvenli mi? Yalnız düz ad + izinli uzantı. */
export function gorselAdiGuvenliMi(ad) {
  const a = String(ad == null ? '' : ad).trim();
  if (!a || a.length > 200) return false;
  if (TEHLIKELI.test(a)) return false;
  return IZINLI_UZANTI.test(a);
}

const metin = (v) => String(v == null ? '' : v).trim();

/**
 * Slaydın görselleri — her zaman DİZİ.
 *
 * İlk sürümde tek görsel vardı (`gorsel`), sonra sağ sayfaya birden çok
 * görsel konabilsin diye `gorseller` eklendi. Eski kayıtlar hâlâ tek alanla
 * duruyor; ikisini de kabul edip tek biçime indirgemek, veriyi taşımadan
 * ilerlemeyi sağlar. Güvensiz adlar burada elenir.
 */
export function gorselleriCoz(ham) {
  const h = ham || {};
  const liste = Array.isArray(h.gorseller) ? h.gorseller : [];
  const tekil = metin(h.gorsel || h.gorselAdi);
  const hepsi = liste.concat(tekil ? [tekil] : []);
  const gorulen = [];
  hepsi.forEach((g) => {
    const a = metin(g);
    if (gorselAdiGuvenliMi(a) && gorulen.indexOf(a) < 0) gorulen.push(a);
  });
  return gorulen;
}

/**
 * Ham kaydı slayt biçimine getirir.
 * Görsel adı güvenli değilse DÜŞÜRÜLÜR — yarım bir yol üretip kırık görsel
 * göstermek yerine slayt görselsiz gösterilir.
 */
export function slaytNormalize(ham) {
  const h = ham || {};
  const gorseller = gorselleriCoz(h);
  const sira = Number(h.sira);
  return {
    id: metin(h.id || h._docId || h._id),
    baslik: metin(h.baslik),
    metin: metin(h.metin),
    gorseller,
    // Eski okuyucular tek alanı bekliyor olabilir; ilk görsel orada da durur.
    gorsel: gorseller[0] || '',
    sira: Number.isFinite(sira) ? sira : 0,
    // Alan yoksa YAYINDA sayılır: yetkili slayt ekleyip "neden görünmüyor"
    // dememeli. Gizlemek bilinçli bir karardır (yayinda: false).
    yayinda: h.yayinda !== false,
  };
}

/** Görselin tanıtım sayfasından erişilebilir adresi. */
export function gorselUrl(gorsel) {
  return gorselAdiGuvenliMi(gorsel) ? '/api/tanitim/gorsel/' + encodeURIComponent(gorsel) : '';
}

/**
 * Ziyaretçiye gösterilecek slaytlar: yayında olanlar, sıra numarasına göre.
 * Eşit sırada kimliğe göre kararlı sıralama — aynı sırayı iki slayta veren
 * yetkili, sayfayı her yenilediğinde başka bir dizilim görmesin.
 *
 * Tamamen boş slayt (ne başlık, ne metin, ne görsel) elenir: yanlışlıkla
 * eklenmiş boş kayıt ziyaretçiye boş bir sayfa olarak dönmemeli.
 */
export function yayindakiSlaytlar(kayitlar) {
  return (kayitlar || [])
    .map(slaytNormalize)
    .filter((s) => s.yayinda && (s.baslik || s.metin || s.gorseller.length))
    .sort((a, b) => a.sira - b.sira || a.id.localeCompare(b.id, 'tr'));
}

/** Yeni slaytın alacağı sıra numarası: en büyüğün bir fazlası. */
export function sonrakiSira(kayitlar) {
  const enBuyuk = (kayitlar || [])
    .map((k) => slaytNormalize(k).sira)
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => (b > a ? b : a), 0);
  return enBuyuk + 1;
}
