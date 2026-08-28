// ══════════════════════════════════════════════════════════════
// STAJ BELGE DURUM RAPORU (XLSX)
//
// Akademisyenin/komisyonun elindeki asıl soru şudur: "bu etaptaki
// öğrencilerden kim hangi belgeyi yüklemiş?" Modüldeki mevcut dışa aktarım
// başvuru FORM ALANLARINI döküyordu (nüfus bilgileri, adres, işveren…);
// belge yüklenip yüklenmediği hiçbir çıktıda yoktu, komisyon tek tek
// başvuru açıp bakmak zorundaydı.
//
// Bu rapor onun için: etap + öğrenci kimliği + staj yeri + her belge için
// "Belge yüklü / Belge yüklenmemiş", artı elle doldurulacak iki boş sütun
// (EK-2 ve Not). Boş sütunlar kasıtlıdır — komisyon çıktının üzerinde
// çalışıyor, sistem o iki alanı doldurmuyor.
// ══════════════════════════════════════════════════════════════

/** Rapordaki belge sütunları — kimlik ve başlık. Sıra çıktıdaki sıradır. */
export const BELGE_SUTUNLARI = [
  ['zorunlu_staj_formu', 'Zorunlu Staj Formu'],
  ['staj_basvuru_formu_ek1', 'Staj Başvuru Formu (Ek-1)'],
  ['kimlik_fotokopisi', 'Kimlik Fotokopisi'],
  ['staj_defteri', 'Staj Defteri'],
  ['staj_teslim_belgesi', 'Staj Teslim Belgesi'],
  ['turnitin_raporu', 'Turnitin Raporu'],
];

export const YUKLU = 'Belge yüklü';
export const YUKSUZ = 'Belge yüklenmemiş';

/** Sistemin doldurmadığı, çıktıda boş kalan sütunlar. */
export const BOS_SUTUNLAR = ['EK-2 Belgesi', 'Not'];

function metin(d) {
  return String(d == null ? '' : d).trim();
}

/**
 * Bir belge yüklenmiş mi?
 *
 * Yükleme kaydının VARLIĞI yetmez. Kayıt şeması
 * `{ fileName, fileSize, fileType, uploadedAt, status, serverPath, downloadURL }`;
 * ayrıca belge üzerinde `changeRequest` (değişiklik talebi) alanı da tutuluyor.
 * Silinen ya da yalnızca talep bırakan kayıtlar dosya atıfı olmayan bir kabuk
 * bırakabiliyor. Rapor "Belge yüklü" derken emin olmalı: DOSYA ATIFI şart.
 */
export function belgeYuklendiMi(yuklemeler, belgeId) {
  const y = (yuklemeler || {})[belgeId];
  if (!y) return false;
  // Eski kayıtlarda alan doğrudan dosya yolu metni olabiliyor.
  if (typeof y === 'string') return metin(y) !== '';
  if (typeof y !== 'object') return false;
  if (y.deleted === true) return false;
  return !!(
    metin(y.fileName) ||
    metin(y.downloadURL) ||
    metin(y.serverPath) ||
    metin(y.url) ||
    metin(y.fileUrl)
  );
}

/** Belge durumunun çıktıdaki metni. */
export function belgeDurumMetni(yuklemeler, belgeId) {
  return belgeYuklendiMi(yuklemeler, belgeId) ? YUKLU : YUKSUZ;
}

/** Staj yeri bilgisi — ad + adres + telefon, dolu olanlar birleştirilir. */
export function kurumBilgisi(basvuru) {
  const b = basvuru || {};
  const parcalar = [b.stajYeriAdi, b.stajYeriAdresi, b.stajYeriTelefon].map(metin).filter(Boolean);
  return parcalar.join(' — ');
}

/** Rapor başlık satırı. */
export function raporBasliklari() {
  return ['Staj Etabı', 'Öğrenci Numarası', 'Adı Soyadı', 'Staj Yeri']
    .concat(BELGE_SUTUNLARI.map(([, ad]) => ad))
    .concat(BOS_SUTUNLAR);
}

/** Tek başvurunun rapor satırı. */
export function raporSatiri(basvuru, yuklemeler) {
  const b = basvuru || {};
  return [metin(b.stajEtapLabel), metin(b.ogrenciNo), metin(b.adSoyad), kurumBilgisi(b)]
    .concat(BELGE_SUTUNLARI.map(([id]) => belgeDurumMetni(yuklemeler, id)))
    .concat(BOS_SUTUNLAR.map(() => ''));
}

/**
 * Rapor tablosu: [başlık, ...satırlar].
 *
 * @param {Array}  basvurular seçilen başvurular
 * @param {Object} yuklemeHaritasi { [başvuruId]: { [belgeId]: yükleme } }
 */
export function raporTablosu(basvurular, yuklemeHaritasi) {
  const liste = Array.isArray(basvurular) ? basvurular : [];
  const harita = yuklemeHaritasi || {};
  const satirlar = liste
    .slice()
    .sort((a, b) => {
      const e = metin(a && a.stajEtapLabel).localeCompare(metin(b && b.stajEtapLabel), 'tr');
      if (e !== 0) return e;
      return metin(a && a.ogrenciNo).localeCompare(metin(b && b.ogrenciNo), 'tr');
    })
    .map((b) => raporSatiri(b, harita[b && b.id]));
  return [raporBasliklari()].concat(satirlar);
}

/** Dosya adı — etap seçiliyse onun etiketiyle. */
export function raporDosyaAdi(etiket) {
  const e = metin(etiket) || 'Secilen-Ogrenciler';
  return 'staj-belge-durumu-' + e.replace(/\s+/g, '_') + '.xlsx';
}
