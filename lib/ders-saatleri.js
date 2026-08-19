// ══════════════════════════════════════════════════════════════
// DERS SAATLERİ — BÖLÜME ÖZEL BAŞLANGIÇ/BİTİŞ
//
// Ders 45 dakika, teneffüs 15 dakikadır ve gün içinde böyle ilerler:
//   08:15-09:00 · 09:15-10:00 · 10:15-11:00 …
// Bu ritim sabittir; DEĞİŞEN, günün nerede başlayıp nerede bittiğidir.
// Her bölüm kendi başlangıç ve bitiş saatini seçer (kimi bölüm 08:30'da
// başlar, kimi 18:00'de biter) ve ayar bölüme özeldir.
//
// ── SLOT ANAHTARI SAAT İNDEKSİDİR ──
// Program kayıtları `Pazartesi_3` gibi anahtarlarla durur: 3 = günün 4.
// dersi. Etiket bu indeksten TÜRETİLİR. Bir bölüm başlangıcını 08:15'ten
// 08:30'a alırsa tüm ızgara birlikte kayar — ders "4. saatte" kalır, saat
// 08:15 değil 08:30 diye okunur. Kayıtlı programın taşınmasına gerek yoktur.
//
// ── FARKLI BÖLÜMLER YAN YANA ──
// Fakülte birleşik programı ve akademisyenin üniversite geneli programı
// birden çok bölümü TEK ızgarada gösterir. Bölümlerin saatleri farklıysa
// ortak bir eksen gerekir: `birlesikEksen` tüm etiketleri başlangıç
// dakikasına göre sıralayıp tekilleştirir, `eksenHaritasi` de bir bölümün
// indeksini o eksendeki satıra çevirir. Böylece 08:15'te başlayan bölümle
// 08:30'da başlayan bölüm aynı tabloda doğru satırlara düşer.
// ══════════════════════════════════════════════════════════════

/** Bir dersin süresi (dakika). */
export const DERS_DK = 45;
/** İki ders arasındaki teneffüs (dakika). */
export const TENEFFUS_DK = 15;

// ── VARSAYILAN: FAKÜLTENİN KENDİ PROGRAMI ──
// Gün İKİ BLOKTAN oluşur ve blokların ritmi birbirinden bağımsızdır:
//
//   Öğleden önce   08:30-09:15 · 09:30-10:15 · 10:30-11:15 · 11:30-12:15 · 12:30-13:15
//   Öğleden sonra  13:15-14:00 · 14:15-15:00 · 15:15-16:00 · 16:15-17:00 · 17:15-18:00
//
// Sabah dersleri yarım saatte (:30), öğleden sonra çeyrek geçe (:15) başlar.
// Tek bir başlangıç saatiyle bu düzen kurulamaz — öğle arasından sonra ritim
// yeniden kurulur. Bu yüzden ayar iki bloktur ve yetkili İKİSİNİ DE ayrı ayrı
// değiştirebilir.
export const VARSAYILAN_AYAR = {
  lisans: {
    ogledenOnce: { baslangic: '08:30', bitis: '13:15' },
    ogledenSonra: { baslangic: '13:15', bitis: '18:00' },
  },
  // Lisansüstü akşam saatlerine taşar; sabah bloğu aynıdır.
  lisansustu: {
    ogledenOnce: { baslangic: '08:30', bitis: '13:15' },
    ogledenSonra: { baslangic: '13:15', bitis: '22:00' },
  },
};

// Güvenlik sınırı: bozuk bir ayar (bitiş 23:59, ders süresi 1 dk) sonsuz
// satır üretmesin. Bir günde bundan çok ders saati olması anlamlı değildir.
export const EN_COK_SAAT = 24;

const SAAT_RX = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** 'HH:MM' → gün başından beri geçen dakika; geçersizse null. */
export function dakikaya(saat) {
  const m = SAAT_RX.exec(String(saat == null ? '' : saat).trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Dakika → 'HH:MM' (gün taşarsa 24 saate kırpılır). */
export function saatMetni(dakika) {
  const d = Math.max(0, Math.min(24 * 60, Math.round(Number(dakika) || 0)));
  return String(Math.floor(d / 60)).padStart(2, '0') + ':' + String(d % 60).padStart(2, '0');
}

/** Seviye anahtarı: 'lisans' dışındaki her şey lisansüstüdür. */
export function seviyeAnahtari(seviye) {
  return String(seviye || 'lisans') === 'lisans' ? 'lisans' : 'lisansustu';
}

/**
 * Tek bir bloğu ({baslangic, bitis}) geçerli hâle getirir.
 * Bozuk/eksik alan varsayılana düşer; bir ders sığmıyorsa blok tamamen yok
 * sayılır (yarım kayıt programı boşaltmasın).
 */
export function blokNormalize(ham, varsayilan) {
  const v = varsayilan || { baslangic: '08:30', bitis: '13:15' };
  const h = ham || {};
  const bas = dakikaya(h.baslangic) != null ? String(h.baslangic).trim() : v.baslangic;
  const bit = dakikaya(h.bitis) != null ? String(h.bitis).trim() : v.bitis;
  if (dakikaya(bit) < dakikaya(bas) + DERS_DK) return { ...v };
  return { baslangic: bas, bitis: bit };
}

/**
 * Ham ayarı iki bloklu biçime indirger.
 *
 * ── ESKİ BİÇİM ──
 * Ayar önce tek bloktu: { baslangic, bitis }. Böyle bir kayıt öğleden ÖNCE
 * bloğu sayılır ve öğleden sonrası olmaz — yani eskiden kaydedilmiş ayar
 * aynen çalışmaya devam eder, kimsenin programı kaymaz.
 */
export function ayarNormalize(ham, seviye) {
  const anahtar = seviyeAnahtari(seviye);
  const varsayilan = VARSAYILAN_AYAR[anahtar];
  const h = ham || {};
  // Eski tek bloklu kayıt
  if (!h.ogledenOnce && !h.ogledenSonra && (h.baslangic || h.bitis)) {
    return { ogledenOnce: blokNormalize(h, varsayilan.ogledenOnce), ogledenSonra: null };
  }
  return {
    ogledenOnce: blokNormalize(h.ogledenOnce, varsayilan.ogledenOnce),
    // Öğleden sonrası açıkça kapatılabilir (null): yalnız sabah ders yapan
    // bölümlerin programı gereksiz boş satırla uzamasın.
    ogledenSonra:
      h.ogledenSonra === null ? null : blokNormalize(h.ogledenSonra, varsayilan.ogledenSonra),
  };
}

/**
 * Bölümün ayar kaydından (bir doküman, iki seviye) o seviyenin ayarını çözer.
 * @param {object} kayit  { lisans: {…}, lisansustu: {…} } — yoksa varsayılan
 */
export function bolumAyari(kayit, seviye) {
  const anahtar = seviyeAnahtari(seviye);
  return ayarNormalize((kayit || {})[anahtar], anahtar);
}

/**
 * Tek bir bloğun saat etiketleri: '08:30-09:15', '09:30-10:15', …
 * Son ders BİTİŞ saatini aşmaz; tam oturmuyorsa son satır yazılmaz.
 */
export function blokEtiketleri(blok, enCok) {
  const b = blokNormalize(blok, blok);
  const bas = dakikaya(b.baslangic);
  const bit = dakikaya(b.bitis);
  if (bas == null || bit == null) return [];
  const adim = DERS_DK + TENEFFUS_DK;
  const sinir = enCok == null ? EN_COK_SAAT : enCok;
  const liste = [];
  for (let t = bas; t + DERS_DK <= bit && liste.length < sinir; t += adim) {
    liste.push(saatMetni(t) + '-' + saatMetni(t + DERS_DK));
  }
  return liste;
}

/**
 * Günün TÜM saat etiketleri: öğleden önce + öğleden sonra, sırayla.
 *
 * Girdi iki bloklu ayar olabileceği gibi eski tek bloklu {baslangic, bitis}
 * de olabilir — ayarNormalize ikisini de kabul eder.
 */
export function saatEtiketleri(ayar) {
  const a = ayarNormalize(ayar, 'lisans');
  const once = blokEtiketleri(a.ogledenOnce);
  if (!a.ogledenSonra) return once.slice(0, EN_COK_SAAT);
  const sonra = blokEtiketleri(a.ogledenSonra, EN_COK_SAAT - once.length);
  return once.concat(sonra);
}

/** Bölüm + seviye için saat etiketleri (kısayol). */
export function bolumSaatleri(kayit, seviye) {
  return saatEtiketleri(bolumAyari(kayit, seviye));
}

/**
 * Etiketin başlangıç dakikası — sıralama için. '08:15-09:00' → 495.
 * Çözülemezse Infinity (bilinmeyen etiket sona düşsün, kaybolmasın).
 */
export function etiketBaslangici(etiket) {
  const m = /^\s*(\d{1,2}:\d{2})/.exec(String(etiket || ''));
  const d = m ? dakikaya(m[1]) : null;
  return d == null ? Infinity : d;
}

/**
 * Birden çok bölümün saat listelerini TEK eksende birleştirir.
 * Başlangıç dakikasına göre sıralı, tekrarsız etiket listesi döner.
 */
export function birlesikEksen(listeler) {
  const gorulen = new Map();
  (listeler || []).forEach((liste) => {
    (liste || []).forEach((etiket) => {
      const e = String(etiket || '').trim();
      if (e && !gorulen.has(e)) gorulen.set(e, etiketBaslangici(e));
    });
  });
  return [...gorulen.keys()].sort(
    (a, b) => gorulen.get(a) - gorulen.get(b) || a.localeCompare(b, 'tr')
  );
}

/**
 * Bir bölümün saat indeksini ortak eksendeki satır indeksine çeviren harita.
 * Eksende bulunmayan etiket -1 verir (çağıran satırı atlar).
 * @returns {number[]} bolumIndeksi → eksenIndeksi
 */
export function eksenHaritasi(bolumSaatListesi, eksen) {
  const yer = new Map((eksen || []).map((e, i) => [e, i]));
  return (bolumSaatListesi || []).map((e) => (yer.has(e) ? yer.get(e) : -1));
}

/**
 * Ayarın insan tarafından okunur özeti: "08:15 – 17:00 · 9 ders saati".
 */
export function ayarOzeti(ayar) {
  const a = ayarNormalize(ayar, 'lisans');
  const parcalar = [a.ogledenOnce.baslangic + ' – ' + a.ogledenOnce.bitis];
  if (a.ogledenSonra) parcalar.push(a.ogledenSonra.baslangic + ' – ' + a.ogledenSonra.bitis);
  return parcalar.join(' · ') + ' · ' + saatEtiketleri(a).length + ' ders saati';
}

/**
 * Slot anahtarlarındaki saat indeksini BAŞKA bir eksene taşır.
 *
 * Fakülte birleşik görünümü bölümleri tek ızgarada gösterir; bölümlerin
 * başlangıç saatleri farklıysa aynı indeks farklı saat demektir. Bu yüzden
 * her bölümün slotları ortak eksene çevrilir — çevrilmeden karşılaştırılırsa
 * 08:15'teki ders 08:30'daki derse "çakışıyor" diye işaretlenirdi.
 *
 * Eksende karşılığı olmayan saat (harita -1) DÜŞÜRÜLÜR: ortak eksende yeri
 * olmayan bir satırı rastgele bir yere koymak sessizce yanlış program üretir.
 *
 * @param {object}   slotlar  { 'Gün_saatIndeksi': slot }
 * @param {number[]} harita   bolumIndeksi → eksenIndeksi (bkz. eksenHaritasi)
 */
export function slotlariEksene(slotlar, harita) {
  const out = {};
  Object.entries(slotlar || {}).forEach(([anahtar, slot]) => {
    const ayrac = String(anahtar).lastIndexOf('_');
    if (ayrac < 0) return;
    const gun = String(anahtar).slice(0, ayrac);
    const i = parseInt(String(anahtar).slice(ayrac + 1), 10);
    const yeni = (harita || [])[i];
    if (!Number.isInteger(yeni) || yeni < 0) return;
    out[gun + '_' + yeni] = slot;
  });
  return out;
}
