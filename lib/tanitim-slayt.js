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
    // Slaydın bağlı olduğu modül sekmesi. Eski kayıtlarda yok — boş kalır.
    modul: metin(h.modul),
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

// ══════════════════════════════════════════════════════════════
// MODÜLLER
//
// Tanıtım sayfasındaki sekmeler. Her slayt bir modüle bağlıdır; sekme
// değişince o modülün slaytları gösterilir.
//
// ── LİSTE KODDA DEĞİL, VERİTABANINDA ──
// Modüller önce koda gömülüydü ve iki yerde (lib + tanıtım sayfası)
// duruyordu; yeni bir sekme eklemek dağıtım gerektiriyordu ve iki liste
// ayrışırsa slayt sessizce kayboluyordu. Artık tek kaynak
// `tanitim_modulleri` koleksiyonu: yetkili sekme ekler, siler, sıralar.
//
// Aşağıdaki liste yalnızca ÖNERİ: yönetim ekranındaki "önerilen modülleri
// ekle" düğmesi bunları bir kerede yazar. Çalışma anında hiçbir yerde
// varsayılan olarak kullanılmaz — kullanılsaydı silinen bir sekme geri
// gelirdi.
// ══════════════════════════════════════════════════════════════
export const ONERILEN_MODULLER = [
  { id: 'dersprogrami', ad: 'Ders Programı' },
  { id: 'sinav', ad: 'Sınav Otomasyonu' },
  { id: 'muafiyet', ad: 'Ders Muafiyeti' },
  { id: 'yazokulu', ad: 'Yaz Okulu İntibak' },
  { id: 'gecis', ad: 'Yatay ve Dikey Geçiş' },
  { id: 'staj', ad: 'Staj' },
  { id: 'capyandal', ad: 'ÇAP ve Yandal' },
  { id: 'stratejik', ad: 'Stratejik Plan' },
  { id: 'anket', ad: 'Anketler' },
  { id: 'kulup', ad: 'Öğrenci Kulüpleri' },
  { id: 'akreditasyon', ad: 'Akreditasyon' },
];

/**
 * Modül adından kimlik türetir: 'Yaz Okulu İntibak' → 'yazokuluintibak'.
 *
 * Kimlik slaytlarla modülü bağlayan anahtardır ve URL'ye girmez; okunur
 * olması yeter. Türkçe harfler ASCII karşılığına indirilir, çünkü kimliği
 * elle yazan biri 'ı' ile 'i'yi karıştırır.
 */
export function modulKimligi(ad) {
  const tr = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  return String(ad == null ? '' : ad)
    .toLocaleLowerCase('tr')
    .split('')
    .map((h) => tr[h] || h)
    .join('')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 40);
}

/** Ham modül kaydını düzenler. */
export function modulNormalize(ham) {
  const h = ham || {};
  const sira = Number(h.sira);
  const ad = metin(h.ad);
  return {
    id: metin(h.id || h._docId || h._id),
    ad,
    // Slaytların bağlandığı anahtar. Kayıtta yoksa addan türetilir.
    anahtar: metin(h.anahtar) || modulKimligi(ad),
    ozet: metin(h.ozet),
    sira: Number.isFinite(sira) ? sira : 0,
    yayinda: h.yayinda !== false,
  };
}

/** Ziyaretçiye gösterilecek sekmeler: yayında olanlar, sırayla. */
export function yayindakiModuller(kayitlar) {
  return (kayitlar || [])
    .map(modulNormalize)
    .filter((m) => m.yayinda && m.ad && m.anahtar)
    .sort((a, b) => a.sira - b.sira || a.ad.localeCompare(b.ad, 'tr'));
}

/**
 * Bu anahtar tanımlı modüllerden birine mi ait?
 * Modül listesi artık veriden geldiği için karşılaştırma da veriye bakar.
 */
export function modulGecerliMi(anahtar, moduller) {
  const a = metin(anahtar);
  if (!a) return false;
  return (moduller || []).some((m) => modulNormalize(m).anahtar === a);
}

/**
 * Bir modülün yayındaki slaytları.
 *
 * Modülü YAZILMAMIŞ eski kayıtlar hiçbir sekmede gösterilmez: bir slaydı
 * bütün sekmelere birden koymak, sekmenin anlamını ortadan kaldırırdı.
 */
export function modulSlaytlari(kayitlar, anahtar) {
  const hedef = metin(anahtar);
  if (!hedef) return [];
  return yayindakiSlaytlar(kayitlar).filter((s) => s.modul === hedef);
}
