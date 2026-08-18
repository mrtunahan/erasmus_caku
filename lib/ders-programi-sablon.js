// ══════════════════════════════════════════════════════════════
// DERS PROGRAMI — ŞABLON VERİSİ
//
// Ders programı çıktısı bir IZGARADIR (5 gün × 14 saat), oysa şablon motoru
// SATIR çoğaltmayla çalışır. Bu dosya ikisini birbirine çevirir:
//
//     bir SATIR = bir SAAT      ·      bir SÜTUN = bir GÜN
//
//   ┌──────────────┬───────────┬────────┬──────────┬──────────┬────────┐
//   │ {{Saat}}     │{{Pazartesi}}│{{Salı}}│{{Çarşamba}}│{{Perşembe}}│{{Cuma}}│
//   └──────────────┴───────────┴────────┴──────────┴──────────┴────────┘
//
// Böylece yetkilinin Şablonlar modülüne yüklediği .docx/.xlsx tablo, satır
// klonlama motoruyla (produceFromTemplate / produceRowsXlsx) doldurulabilir:
// yer tutuculu satır kaç dolu saat varsa o kadar kopyalanır.
//
// Bir hücrede birden çok ders olabilir (bölünmüş hücre, farklı sınıflar,
// farklı bölümler); hepsi TEK metne indirgenir ve satır sonuyla ayrılır —
// Word'de de Excel'de de alt alta görünür.
//
// Künye (kurum · fakülte · bölüm · dönem · tarih) statik değişkenlerdir ve
// belgenin başlığında/altlığında bir kez geçer.
// ══════════════════════════════════════════════════════════════

import { slotDersleri } from './ders-slot.js';

const metin = (v) => String(v == null ? '' : v).trim();

/**
 * Gün adı → satır değişkeni kimliği.
 * Değişken kimlikleri ASCII'dir (şablon eşleme kayıtlarında ve JSON'da
 * sorun çıkarmasın); ekranda görünen etiket Türkçe gün adının kendisidir.
 */
export const GUN_DEGISKENLERI = {
  Pazartesi: 'pazartesi',
  Salı: 'sali',
  Çarşamba: 'carsamba',
  Perşembe: 'persembe',
  Cuma: 'cuma',
};

/** 'guz' → 'Güz', 'bahar' → 'Bahar'. Bilinmeyen değer olduğu gibi döner. */
export function donemAdi(donem) {
  const d = metin(donem).toLocaleLowerCase('tr-TR');
  if (d === 'guz' || d === 'güz') return 'Güz';
  if (d === 'bahar') return 'Bahar';
  return metin(donem);
}

/** 'lisans' → 'Lisans', diğerleri → 'Lisansüstü'. */
export function seviyeAdi(seviye) {
  const s = metin(seviye).toLocaleLowerCase('tr-TR');
  if (!s || s === 'lisans') return 'Lisans';
  return 'Lisansüstü';
}

/**
 * Tarihten akademik yıl: Eylül'de yeni yıl başlar.
 *   15.09.2025 → "2025-2026"   ·   03.03.2026 → "2025-2026"
 * Bahar dönemi takvim yılının ikinci yarısındadır ama AYNI akademik yıla
 * aittir; bu yüzden ölçüt aydır, dönem adı değil.
 */
export function akademikYilAdi(tarih) {
  const t = tarih instanceof Date && !isNaN(tarih) ? tarih : new Date();
  const yil = t.getFullYear();
  // getMonth() 0 tabanlı: 8 = Eylül.
  return t.getMonth() >= 8 ? yil + '-' + (yil + 1) : yil - 1 + '-' + yil;
}

/**
 * Kaynaklardan ızgara kurar: gün → saat indeksi → [hücre metni].
 *
 * @param {Array}    kaynaklar [{deptName, year, slots}] — slots: {'Gün_saatIndeksi': slot}
 * @param {string[]} gunler
 * @param {number}   saatSayisi
 * @param {Function} hucreYaz  (slot, kaynak) => string
 */
export function ciktiIzgarasi(kaynaklar, gunler, saatSayisi, hucreYaz) {
  const izgara = {};
  (gunler || []).forEach((gun) => {
    izgara[gun] = {};
    for (let hi = 0; hi < saatSayisi; hi++) izgara[gun][hi] = [];
  });
  (kaynaklar || []).forEach((kaynak) => {
    Object.entries((kaynak && kaynak.slots) || {}).forEach(([anahtar, slot]) => {
      const ayrac = String(anahtar).lastIndexOf('_');
      if (ayrac < 0) return;
      const gun = String(anahtar).slice(0, ayrac);
      const hi = parseInt(String(anahtar).slice(ayrac + 1), 10);
      if (!izgara[gun] || izgara[gun][hi] === undefined) return;
      izgara[gun][hi].push(hucreYaz(slot, kaynak));
    });
  });
  return izgara;
}

/** Bu saat satırında hiç ders var mı? */
function saatDoluMu(izgara, gunler, hi) {
  return (gunler || []).some((gun) => ((izgara[gun] || {})[hi] || []).length > 0);
}

/**
 * Izgarayı ŞABLON SATIRLARINA çevirir — her dolu saat bir kayıt:
 *   { saat: '08:15-09:00', pazartesi: '…', sali: '…', … }
 *
 * BOŞ saatler atlanır: programda kimsenin dersi olmayan saati belgeye basmak
 * sayfayı gereksiz uzatır ve okunurluğu düşürür (yerleşik çıktı da atlar).
 * `bosSaatler: true` verilirse tüm saatler yazılır — sabit yükseklikli,
 * "resmî görünümlü" şablonlar için.
 */
export function sablonSatirlari(izgara, gunler, saatler, secenek) {
  const { bosSaatler } = secenek || {};
  const satirlar = [];
  (saatler || []).forEach((saat, hi) => {
    if (!bosSaatler && !saatDoluMu(izgara, gunler, hi)) return;
    const satir = { saat: saat };
    (gunler || []).forEach((gun) => {
      const id = GUN_DEGISKENLERI[gun];
      if (id) satir[id] = ((izgara[gun] || {})[hi] || []).join('\n\n');
    });
    satirlar.push(satir);
  });
  return satirlar;
}

/**
 * Izgarayı xlsx-yaz satır dizisine çevirir (şablonsuz yerleşik .xlsx çıktısı).
 * Şablon satırlarıyla AYNI ızgaradan üretilir ki iki çıktı ayrışmasın.
 */
export function tabloSatirlari(izgara, gunler, saatler, vurguStil) {
  const satirlar = [['Saat'].concat(gunler || [])];
  (saatler || []).forEach((saat, hi) => {
    if (!saatDoluMu(izgara, gunler, hi)) return;
    satirlar.push(
      [{ v: saat, stil: vurguStil }].concat(
        (gunler || []).map((gun) => ((izgara[gun] || {})[hi] || []).join('\n\n'))
      )
    );
  });
  return satirlar;
}

/**
 * Program künyesi: kaç ayrı ders, kaç ders saati, hangi bölümler.
 * Ders saati = DOLU HÜCRE sayısıdır; bir hücrede iki ders varsa (bölünmüş
 * hücre) bu bir saattir, iki değil.
 */
export function programOzeti(kaynaklar) {
  const kodlar = new Set();
  const bolumler = [];
  let dersSaati = 0;
  (kaynaklar || []).forEach((kaynak) => {
    const ad = metin(kaynak && kaynak.deptName);
    if (ad && !bolumler.includes(ad)) bolumler.push(ad);
    Object.values((kaynak && kaynak.slots) || {}).forEach((slot) => {
      const dersler = slotDersleri(slot);
      if (dersler.length === 0) return;
      dersSaati++;
      dersler.forEach((d) => kodlar.add(d.courseCode));
    });
  });
  return { dersSayisi: kodlar.size, dersSaati, bolumler };
}

/**
 * Belgenin statik künyesi — şablondaki başlık/altlık yer tutucuları.
 * Değerler METİN olarak döner; sayılar da dizeye çevrilir (şablon motoru
 * hücreye olduğu gibi yazar, `0` yerine boş görünmesin).
 */
export function sablonKunyesi(bilgi) {
  const b = bilgi || {};
  const tarih = b.tarih instanceof Date && !isNaN(b.tarih) ? b.tarih : new Date();
  const ozet = b.ozet || {};
  return {
    kurumAd: metin(b.kurumAd),
    fakulteAd: metin(b.fakulteAd),
    bolumAd: metin(b.bolumAd),
    donem: donemAdi(b.donem),
    akademikYil: metin(b.akademikYil) || akademikYilAdi(tarih),
    seviyeAd: seviyeAdi(b.seviye),
    // Bölüm çıktısında "1-4. Sınıf (birleşik)", fakülte çıktısında bölüm
    // listesi durur; çağıran ne yazacağını bilir, burada yalnız metinleşir.
    kapsamAd: metin(b.kapsamAd),
    tarih: tarih.toLocaleDateString('tr-TR'),
    hazirlayan: metin(b.hazirlayan),
    dersSayisi: String(ozet.dersSayisi == null ? '' : ozet.dersSayisi),
    dersSaati: String(ozet.dersSaati == null ? '' : ozet.dersSaati),
  };
}

/**
 * Çıktı dosya adı: "Bilgisayar Muhendisligi Guz 2025-2026 ders programi.xlsx"
 * Türkçe harfler ASCII'ye indirgenir — indirilen dosya her sistemde açılsın.
 */
export function ciktiDosyaAdi(parcalar, uzanti) {
  const harita = {
    ç: 'c',
    Ç: 'C',
    ğ: 'g',
    Ğ: 'G',
    ı: 'i',
    İ: 'I',
    ö: 'o',
    Ö: 'O',
    ş: 's',
    Ş: 'S',
    ü: 'u',
    Ü: 'U',
  };
  const ad = (parcalar || [])
    .map(metin)
    .filter(Boolean)
    .join(' ')
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (h) => harita[h] || h)
    .replace(/[^0-9A-Za-z\-_ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (ad || 'ders programi') + (uzanti ? '.' + uzanti : '');
}
