// ══════════════════════════════════════════════════════════════
// BAŞVURU DÜZENLEME — akademisyenin gönderilmiş kayda müdahalesi
//
// Başvuru gönderildikten sonra da düzeltilebilmeli: aday alanı yanlış
// doldurmuş olabilir, sonradan zorunlu hâle gelen bir belge eksik kalmış
// olabilir, ya da kaydı akademisyen zaten aday adına açmıştır.
//
// ⚠ ASIL MESELE: BEYAN ile DÜZELTME karışmamalı.
//
// Bu modülde akademisyene "öğrencinin beyanını yüklediği belgelerle
// karşılaştır" diye bir denetim var (AIBelgeKontrol). Personel beyanı
// SESSİZCE değiştirebilseydi o denetim anlamını yitirirdi: belgeyle
// uyuşmayan bir beyan, düzeltildikten sonra uyuşuyor görünürdü ve
// tutarsızlığın izi kalmazdı.
//
// Bu yüzden ilk düzenlemede adayın ÖZGÜN BEYANI `ilkBeyan` altına bir kez
// kopyalanır ve bir daha üzerine yazılmaz. Sonraki her düzenleme yalnız
// güncel değeri değiştirir; "aday ne demişti" sorusunun cevabı kayıtta
// kalır. Her düzenleme ayrıca kim/ne zaman/hangi alan olarak günlüğe geçer.
// ══════════════════════════════════════════════════════════════

// Akademisyenin düzenleyebileceği beyan alanları. Değerlendirme alanları
// (degerlendirme, degerlendirmeSinif…) BİLEREK YOK — onların kendi akışı var.
// Kimlik alanları da yok: ad-soyad ve numara ayrı kurallara tabi
// (bkz. lib/aday-kimlik.js → numaraTanimlanabilirMi).
export const DUZENLENEBILIR_ALANLAR = [
  { id: 'aktifUniversite', label: 'Aktif üniversite' },
  { id: 'aktifFakulte', label: 'Aktif fakülte' },
  { id: 'aktifBolum', label: 'Aktif bölüm' },
  { id: 'aktifSinif', label: 'Sınıfı' },
  { id: 'basvurduguFakulte', label: 'Başvurduğu fakülte' },
  { id: 'basvurduguBolum', label: 'Başvurduğu bölüm' },
  { id: 'basvurduguSinif', label: 'Başvurduğu sınıf' },
  { id: 'yksYerlesmeYili', label: 'YKS yerleşme yılı' },
  { id: 'yksPuanTuru', label: 'Puan türü' },
  { id: 'yksPuani', label: 'YKS puanı' },
  { id: 'yksBasariSirasi', label: 'Yerleştirme başarı sıralaması' },
  { id: 'notOrtalamasi', label: 'Not ortalaması' },
  { id: 'telefon', label: 'Telefon' },
  { id: 'eposta', label: 'E-posta' },
];

const ALAN_IDLERI = new Set(DUZENLENEBILIR_ALANLAR.map((a) => a.id));

const metin = (v) => String(v == null ? '' : v).trim();

/**
 * Düzenleme yamasını üretir.
 *
 * @param {object} kayit mevcut başvuru
 * @param {object} yeni  formdan gelen değerler (yalnız izinli alanlar okunur)
 * @param {string} kim   düzenleyen personelin adı
 * @returns {{patch:object|null, degisenler:Array<{id,label,eski,yeni}>}}
 *   patch null ise değişiklik yok — boşuna yazma yapılmaz.
 */
export function duzenlemeYamasi(kayit, yeni, kim) {
  const k = kayit || {};
  const degisenler = [];
  const patch = {};

  DUZENLENEBILIR_ALANLAR.forEach((a) => {
    if (!yeni || !(a.id in yeni)) return;
    const eski = metin(k[a.id]);
    const yen = metin(yeni[a.id]);
    if (eski === yen) return;
    patch[a.id] = yen;
    degisenler.push({ id: a.id, label: a.label, eski, yeni: yen });
  });

  if (degisenler.length === 0) return { patch: null, degisenler: [] };

  // Adayın özgün beyanı YALNIZ İLK düzenlemede saklanır. Sonraki
  // düzenlemelerde üzerine yazılsaydı "aday ne demişti" bilgisi, ikinci
  // düzeltmeyle birlikte kaybolurdu.
  if (!k.ilkBeyan) {
    const ilk = {};
    DUZENLENEBILIR_ALANLAR.forEach((a) => {
      ilk[a.id] = metin(k[a.id]);
    });
    patch.ilkBeyan = ilk;
  }

  const gecmis = Array.isArray(k.duzenlemeGecmisi) ? k.duzenlemeGecmisi.slice() : [];
  gecmis.push({
    kim: metin(kim),
    at: new Date().toISOString(),
    alanlar: degisenler.map((d) => ({ id: d.id, eski: d.eski, yeni: d.yeni })),
  });
  patch.duzenlemeGecmisi = gecmis;
  patch.duzenleyen = metin(kim);
  patch.duzenlenmeZamani = new Date().toISOString();

  return { patch, degisenler };
}

/**
 * Bir alanın değeri adayın beyanından farklı mı?
 * Arayüz bunu "düzeltildi" işareti için kullanır.
 */
export function beyandanFarkliMi(kayit, alanId) {
  const k = kayit || {};
  if (!k.ilkBeyan || !ALAN_IDLERI.has(alanId)) return false;
  return metin(k.ilkBeyan[alanId]) !== metin(k[alanId]);
}

/**
 * Beyandan farklılaşan tüm alanlar — kartta özet olarak gösterilir.
 * @returns {Array<{id,label,beyan,guncel}>}
 */
export function beyanFarklari(kayit) {
  const k = kayit || {};
  if (!k.ilkBeyan) return [];
  return DUZENLENEBILIR_ALANLAR.filter((a) => beyandanFarkliMi(k, a.id)).map((a) => ({
    id: a.id,
    label: a.label,
    beyan: metin(k.ilkBeyan[a.id]),
    guncel: metin(k[a.id]),
  }));
}

/** Formu mevcut kayıttan doldurur (yalnız izinli alanlar). */
export function duzenlemeFormu(kayit) {
  const k = kayit || {};
  const f = {};
  DUZENLENEBILIR_ALANLAR.forEach((a) => {
    f[a.id] = metin(k[a.id]);
  });
  return f;
}
