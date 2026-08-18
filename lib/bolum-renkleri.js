// ══════════════════════════════════════════════════════════════
// BÖLÜM RENKLERİ
//
// Fakülte birleşik ders programında bir hücrede yalnız DERS KODU yazar;
// dersin hangi bölüme ait olduğu RENKTEN okunur. Bu yüzden renk süs değil,
// belgenin okunabilirliğinin taşıyıcısıdır ve bölüm başına sabit olmalıdır:
// aynı bölüm her çıktıda aynı rengi almalı.
//
// ── RENK NEREDEN GELİR ──
//   1) Bölümün kendi ayarı (Bölüm Yönetimi'nden seçilir) — en önceliklisi.
//   2) Ayar yoksa bölüm adına göre BİLİNEN renk (fakültenin bugün kullandığı
//      basılı programdaki renkler; yetkili hiçbir şey ayarlamadan tanıdık
//      belgeyi görsün diye).
//   3) O da yoksa paletten SIRAYLA bir renk — bölümün listedeki yerine göre,
//      yani aynı bölüm her seferinde aynı rengi alır.
//
// Palet fakültenin kendi programından alındı (Gıda mor, İnşaat turuncu,
// Makine gri-mavi, Bilgisayar mavi, Elektrik kırmızı, Kimya yeşil) ve yeni
// bölümler için ayırt edilebilir renklerle uzatıldı.
// ══════════════════════════════════════════════════════════════

/** Yeni bölümlere sırayla dağıtılan renkler. İlk altısı fakültenin kendi programından. */
export const BOLUM_RENK_PALETI = [
  '#C39BE1',
  '#FFC000',
  '#ADB9CA',
  '#5B9BD5',
  '#FF5B5B',
  '#70AD47',
  '#F4B183',
  '#8FAADC',
  '#C5E0B4',
  '#FFD966',
  '#D5A6BD',
  '#9DC3E6',
];

/** Bölümü çözülemeyen / birden çok bölümün ortak dersi. */
export const ORTAK_DERS_RENGI = '#FFFF00';

/** Hiçbir kural tutmazsa. */
export const VARSAYILAN_BOLUM_RENGI = '#5B9BD5';

// Bölüm adının ANLAMLI kökü → renk. Ad tam eşleşmez ("Bilgisayar
// Mühendisliği" ≠ "Bilgisayar"), bu yüzden kök ADIN İÇİNDE aranır.
const BILINEN = [
  ['gıda', '#C39BE1'],
  ['inşaat', '#FFC000'],
  ['makine', '#ADB9CA'],
  ['bilgisayar', '#5B9BD5'],
  ['elektrik', '#FF5B5B'],
  ['elektronik', '#FF5B5B'],
  ['kimya', '#70AD47'],
];

const HEX_RX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

/** Geçerli bir #rrggbb / #rgb mi? */
export function renkGecerliMi(renk) {
  return HEX_RX.test(String(renk || '').trim());
}

/** '#abc' → '#aabbcc'; geçersizse null. */
export function renkNormalize(renk) {
  const r = String(renk || '').trim();
  if (!HEX_RX.test(r)) return null;
  if (r.length === 4) return ('#' + r[1] + r[1] + r[2] + r[2] + r[3] + r[3]).toUpperCase();
  return r.toUpperCase();
}

function kucult(ad) {
  return String(ad == null ? '' : ad)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR');
}

/** Paletten sıradaki renk (indeks taşarsa başa döner). */
export function paletRengi(indeks) {
  const i = Number(indeks);
  if (!Number.isFinite(i) || i < 0) return VARSAYILAN_BOLUM_RENGI;
  return BOLUM_RENK_PALETI[Math.floor(i) % BOLUM_RENK_PALETI.length];
}

/** Bölüm adına göre bilinen renk; yoksa null. */
export function bilinenRenk(bolumAdi) {
  const ad = kucult(bolumAdi);
  if (!ad) return null;
  const vurus = BILINEN.find(([kok]) => ad.includes(kok));
  return vurus ? vurus[1] : null;
}

/**
 * Bir bölümün rengini çözer.
 *
 * @param {object} secenek
 *   - ayarRengi  Bölümün kayıtlı rengi (Bölüm Yönetimi'nden seçilen)
 *   - bolumAdi   Ad — bilinen renk eşleşmesi için
 *   - sira       Bölümün listedeki yeri — palet dağıtımı için
 */
export function bolumRengiCoz(secenek) {
  const s = secenek || {};
  const ayar = renkNormalize(s.ayarRengi);
  if (ayar) return ayar;
  const bilinen = bilinenRenk(s.bolumAdi);
  if (bilinen) return bilinen;
  if (s.sira != null) return paletRengi(s.sira);
  return VARSAYILAN_BOLUM_RENGI;
}

/**
 * Bölüm adı → renk haritası. Sıra listedeki sıradır, yani harita bir kez
 * kurulduğunda aynı bölüm her çıktıda aynı rengi alır.
 *
 * @param {Array} bolumler [{ad, renk}] ya da düz ad dizisi
 */
export function bolumRenkHaritasi(bolumler) {
  const harita = {};
  (bolumler || []).forEach((b, i) => {
    const ad = typeof b === 'string' ? b : (b && b.ad) || '';
    if (!ad || harita[ad]) return;
    harita[ad] = bolumRengiCoz({
      ayarRengi: typeof b === 'string' ? null : b && b.renk,
      bolumAdi: ad,
      sira: i,
    });
  });
  return harita;
}

/**
 * Zemin rengine göre okunur yazı rengi (siyah ya da beyaz).
 * Ölçüt algılanan parlaklıktır; koyu zeminde siyah yazı okunmuyordu.
 */
export function metinRengi(zemin) {
  const r = renkNormalize(zemin);
  if (!r) return '#111111';
  const [kr, kg, kb] = [1, 3, 5].map((i) => parseInt(r.slice(i, i + 2), 16));
  // ITU-R BT.601 algılanan parlaklık; eşik 128 (yarı ton). Paletteki açık
  // kırmızı (#FF5B5B ≈ 140) bu eşikte siyah yazı alır — basılı programda da
  // öyle okunuyor.
  const parlaklik = (kr * 299 + kg * 587 + kb * 114) / 1000;
  return parlaklik > 128 ? '#111111' : '#FFFFFF';
}

/**
 * Rengi BEYAZ ZEMİNDE okunacak kadar koyultur.
 *
 * Fakülte programında bir hücrede birden çok bölümün dersi olabilir; zemin
 * tek renk olamayacağı için her ders kodu KENDİ renginde yazılır. Ama palet
 * zemin için seçilmiş açık tonlardan oluşuyor (#FFC000, #C39BE1 …) ve bu
 * tonlar beyaz üstünde yazı olarak okunmuyor. Renk, okunur parlaklığa
 * inene kadar adım adım koyultulur — tonu (mavi mavi, yeşil yeşil) korunur.
 */
export function koyuMetinRengi(renk) {
  const r = renkNormalize(renk);
  if (!r) return '#111111';
  let [kr, kg, kb] = [1, 3, 5].map((i) => parseInt(r.slice(i, i + 2), 16));
  // Beyaz zeminde rahat okunan üst sınır; paletteki en koyu ton (#5B9BD5 ≈ 148)
  // bile bunun üstünde kaldığı için hepsi bir tık koyulaşır.
  const HEDEF = 120;
  for (let adim = 0; adim < 12; adim++) {
    if ((kr * 299 + kg * 587 + kb * 114) / 1000 <= HEDEF) break;
    kr = Math.round(kr * 0.85);
    kg = Math.round(kg * 0.85);
    kb = Math.round(kb * 0.85);
  }
  return (
    '#' +
    [kr, kg, kb]
      .map((k) => Math.max(0, Math.min(255, k)).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}
