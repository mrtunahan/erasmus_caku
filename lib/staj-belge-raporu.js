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
//
// ── SÜTUNLAR SEÇİLEBİLİR ──
// Her komisyon aynı sütunları istemiyor (kimi TC kimlik, kimi işveren
// bilgisi, kimi yalnız belge durumu). Sabit bir sütun listesi yerine
// SUTUN_KATALOGU var; çıktı, seçilen sütun kimliklerinden kurulur ve sıra
// SEÇİM SIRASIDIR. Seçim verilmezse VARSAYILAN_SUTUNLAR kullanılır.
//
// ── SUNUM TAKVİMİ ──
// Staj sunumları öğrenci başına bir tarih ve saat aralığıdır; başvuru
// kaydında `sunumTarihi`, `sunumBaslangic`, `sunumBitis` alanlarında durur.
// Toplu atama için slot üreteci (sunumSlotlari) burada: verilen tarihte,
// verilen saatten başlayıp verilen dakikalık dilimlerle ardışık aralıklar.
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

// ══════════════════════════════════════════════════════════════
// SUNUM TAKVİMİ
// ══════════════════════════════════════════════════════════════

/** "2026-06-15" → "15.06.2026". Ayrıştırılamayan değer olduğu gibi döner. */
export function tarihMetni(iso) {
  const t = metin(iso);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : t;
}

/** Başvurunun sunum saat aralığı — "09:00 - 09:20"; yoksa boş. */
export function sunumAraligi(basvuru) {
  const b = basvuru || {};
  const bas = metin(b.sunumBaslangic);
  const bit = metin(b.sunumBitis);
  if (bas && bit) return `${bas} - ${bit}`;
  return bas || bit || '';
}

/** "09:30" → 570 dakika. Geçersizse null. */
export function saatiDakikaya(saat) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(metin(saat));
  if (!m) return null;
  const s = Number(m[1]);
  const d = Number(m[2]);
  if (s < 0 || s > 23 || d < 0 || d > 59) return null;
  return s * 60 + d;
}

/** 570 → "09:30". */
export function dakikayiSaate(dakika) {
  const t = Math.max(0, Math.round(Number(dakika) || 0));
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}

/**
 * Ardışık sunum aralıkları üretir.
 *
 * @param {string} baslangicSaati "09:00"
 * @param {number} dilimDakika    her öğrenciye ayrılan süre
 * @param {number} adet           kaç öğrenci
 * @param {string} bitisSaati     opsiyonel üst sınır; aşan slot üretilmez
 * @returns {Array<{baslangic:string, bitis:string}>}
 */
export function sunumSlotlari(baslangicSaati, dilimDakika, adet, bitisSaati) {
  const bas = saatiDakikaya(baslangicSaati);
  const dilim = Math.round(Number(dilimDakika) || 0);
  const n = Math.max(0, Math.round(Number(adet) || 0));
  if (bas == null || dilim <= 0) return [];
  const sinir = saatiDakikaya(bitisSaati);
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = bas + i * dilim;
    const e = s + dilim;
    // Üst sınır verilmişse taşan slot ÜRETİLMEZ: kalan öğrenciler sessizce
    // gece yarısına kaymaktansa atanmamış kalsın, komisyon görüp başka güne
    // alsın.
    if (sinir != null && e > sinir) break;
    out.push({ baslangic: dakikayiSaate(s), bitis: dakikayiSaate(e) });
  }
  return out;
}

// ══════════════════════════════════════════════════════════════
// SÜTUN KATALOĞU
// ══════════════════════════════════════════════════════════════

/**
 * Çıktıda yer alabilecek TÜM sütunlar.
 *   tur: 'alan'  → başvuru kaydından okunur
 *        'kurum' → staj yeri bilgisi (ad + adres + telefon birleşik)
 *        'belge' → yüklendi mi
 *        'sunum' → sunum tarihi / saat aralığı
 *        'durum' → başvuru durumu (Türkçe etiket)
 *        'bos'   → sistem doldurmaz, elle yazılır
 */
export const SUTUN_KATALOGU = [
  { id: 'stajEtapLabel', baslik: 'Staj Etabı', tur: 'alan' },
  { id: 'ogrenciNo', baslik: 'Öğrenci Numarası', tur: 'alan' },
  { id: 'adSoyad', baslik: 'Adı Soyadı', tur: 'alan' },
  { id: 'stajYeri', baslik: 'Staj Yeri', tur: 'kurum' },
  { id: 'sunumTarihi', baslik: 'Sunum Tarihi', tur: 'sunum' },
  { id: 'sunumSaati', baslik: 'Sunum Saati', tur: 'sunum' },
]
  .concat(BELGE_SUTUNLARI.map(([id, baslik]) => ({ id: 'belge:' + id, baslik, tur: 'belge' })))
  .concat([
    { id: 'bos:EK-2 Belgesi', baslik: 'EK-2 Belgesi', tur: 'bos' },
    { id: 'bos:Not', baslik: 'Not', tur: 'bos' },
    // ── Başvuru formundan gelen ek alanlar (isteyen çıktıya ekler) ──
    { id: 'bolumProgrami', baslik: 'Bölüm/Program', tur: 'alan' },
    { id: 'eposta', baslik: 'E-posta', tur: 'alan' },
    { id: 'telefonNo', baslik: 'Telefon No', tur: 'alan' },
    { id: 'egitimDonemi', baslik: 'Eğitim Dönemi', tur: 'alan' },
    { id: 'tcKimlikNo', baslik: 'T.C. Kimlik No', tur: 'alan' },
    { id: 'stajYeriAdi', baslik: 'Staj Yeri Adı', tur: 'alan' },
    { id: 'stajYeriAdresi', baslik: 'Staj Yeri Adresi', tur: 'alan' },
    { id: 'stajYeriTelefon', baslik: 'Staj Yeri Telefon', tur: 'alan' },
    { id: 'stajYeriEposta', baslik: 'Staj Yeri E-posta', tur: 'alan' },
    { id: 'isverenAdSoyad', baslik: 'İşveren Ad Soyad', tur: 'alan' },
    { id: 'isverenGorevUnvan', baslik: 'İşveren Görev/Ünvan', tur: 'alan' },
    { id: 'isverenEposta', baslik: 'İşveren E-posta', tur: 'alan' },
    { id: 'stajBaslamaTarihi', baslik: 'Staj Başlama Tarihi', tur: 'alan' },
    { id: 'stajBitisTarihi', baslik: 'Staj Bitiş Tarihi', tur: 'alan' },
    { id: 'stajSuresiGun', baslik: 'Staj Süresi (Gün)', tur: 'alan' },
    { id: 'ikametgahAdresi', baslik: 'İkametgah Adresi', tur: 'alan' },
    { id: 'saglikGuvencesi', baslik: 'Sağlık Güvencesi', tur: 'alan' },
    { id: 'status', baslik: 'Başvuru Durumu', tur: 'durum' },
  ]);

/** Açılışta işaretli gelen sütunlar — eski rapor düzeninin aynısı. */
export const VARSAYILAN_SUTUNLAR = ['stajEtapLabel', 'ogrenciNo', 'adSoyad', 'stajYeri']
  .concat(BELGE_SUTUNLARI.map(([id]) => 'belge:' + id))
  .concat(['bos:EK-2 Belgesi', 'bos:Not']);

const DURUM_ETIKET = {
  beklemede: 'Beklemede',
  devam: 'Devam Ediyor',
  tamamlandi: 'Tamamlandı',
  reddedildi: 'Reddedildi',
};

export function sutunBul(id) {
  return SUTUN_KATALOGU.find((s) => s.id === id) || null;
}

/** Bir sütunun tek başvuru için değeri. */
export function hucreDegeri(sutun, basvuru, yuklemeler) {
  const s = typeof sutun === 'string' ? sutunBul(sutun) : sutun;
  if (!s) return '';
  const b = basvuru || {};
  if (s.tur === 'bos') return '';
  if (s.tur === 'kurum') return kurumBilgisi(b);
  if (s.tur === 'belge') return belgeDurumMetni(yuklemeler, s.id.slice('belge:'.length));
  if (s.tur === 'durum') return DURUM_ETIKET[metin(b.status)] || metin(b.status);
  if (s.tur === 'sunum') {
    return s.id === 'sunumTarihi' ? tarihMetni(b.sunumTarihi) : sunumAraligi(b);
  }
  return metin(b[s.id]);
}

/** Seçilen sütunları kataloğa göre çözer; tanınmayanlar atılır. */
export function sutunlariCoz(sutunIdleri) {
  const idler =
    Array.isArray(sutunIdleri) && sutunIdleri.length ? sutunIdleri : VARSAYILAN_SUTUNLAR;
  const out = [];
  idler.forEach((id) => {
    const s = sutunBul(id);
    if (s && !out.some((x) => x.id === s.id)) out.push(s);
  });
  // Hiçbiri çözülemediyse boş tabloya düşmek yerine varsayılana dönülür.
  return out.length ? out : VARSAYILAN_SUTUNLAR.map(sutunBul).filter(Boolean);
}

/** Rapor başlık satırı. */
export function raporBasliklari(sutunIdleri) {
  return sutunlariCoz(sutunIdleri).map((s) => s.baslik);
}

/** Tek başvurunun rapor satırı. */
export function raporSatiri(basvuru, yuklemeler, sutunIdleri) {
  return sutunlariCoz(sutunIdleri).map((s) => hucreDegeri(s, basvuru, yuklemeler));
}

/**
 * Satır sırası: sunum tarihi/saati atanmışsa ÖNCE ona göre — çıktı bir
 * program cetveli olarak okunmalı. Atanmamışlar sona düşer; oralarda etap ve
 * öğrenci numarası sırası geçerlidir.
 */
export function raporSiralamasi(basvurular) {
  return (Array.isArray(basvurular) ? basvurular : []).slice().sort((a, b) => {
    const at = metin(a && a.sunumTarihi);
    const bt = metin(b && b.sunumTarihi);
    if (at && bt && at !== bt) return at.localeCompare(bt);
    if (at && !bt) return -1;
    if (!at && bt) return 1;
    const as = saatiDakikaya(a && a.sunumBaslangic);
    const bs = saatiDakikaya(b && b.sunumBaslangic);
    if (as != null && bs != null && as !== bs) return as - bs;
    const e = metin(a && a.stajEtapLabel).localeCompare(metin(b && b.stajEtapLabel), 'tr');
    if (e !== 0) return e;
    return metin(a && a.ogrenciNo).localeCompare(metin(b && b.ogrenciNo), 'tr');
  });
}

/**
 * Rapor tablosu: [başlık, ...satırlar].
 *
 * @param {Array}  basvurular      seçilen başvurular
 * @param {Object} yuklemeHaritasi { [başvuruId]: { [belgeId]: yükleme } }
 * @param {Array}  sutunIdleri     seçilen sütunlar (boşsa varsayılan)
 */
export function raporTablosu(basvurular, yuklemeHaritasi, sutunIdleri) {
  const harita = yuklemeHaritasi || {};
  const sutunlar = sutunlariCoz(sutunIdleri);
  const satirlar = raporSiralamasi(basvurular).map((b) =>
    sutunlar.map((s) => hucreDegeri(s, b, harita[b && b.id]))
  );
  return [sutunlar.map((s) => s.baslik)].concat(satirlar);
}

/** Dosya adı — etap seçiliyse onun etiketiyle. */
export function raporDosyaAdi(etiket) {
  const e = metin(etiket) || 'Secilen-Ogrenciler';
  return 'staj-belge-durumu-' + e.replace(/\s+/g, '_') + '.xlsx';
}
