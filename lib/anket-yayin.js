// ══════════════════════════════════════════════════════════════
// ANKETİN YAYIN DURUMU — yayında · süresi doldu · pasif · paylaşılmadı
//
// Bitiş tarihi paylaşım (survey_assignments) kaydında `dueDate` olarak
// tutuluyordu ama hiçbir yerde uygulanmıyordu: süresi geçen anket
// katılımcıya görünmeye, zorunlu anket uygulamayı kilitlemeye devam ediyordu.
// "Pasif" kavramı da yoktu; anketi geçici olarak kapatmanın tek yolu
// silmekti (yanıtlar sonuçlardan kopuyordu).
//
//   pasif         → anket kaydında `pasif: true` (yetkili ya da sahibi kapatır)
//   paylaşılmadı  → hiç paylaşımı yok
//   yayında       → en az bir paylaşımın süresi dolmamış (ya da süresiz)
//   süresi doldu  → bütün paylaşımların son tarihi geçmiş
//
// Son tarih O GÜN DAHİL açıktır: 15.11 son tarihli anket 15.11 gece yarısına
// kadar doldurulabilir. Ekran, zorunlu anket kapısı ve sunucu aynı kuralı
// kullanır.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();
const TARIH = /^\d{4}-\d{2}-\d{2}$/;

export const YAYIN_DURUMLARI = Object.freeze({
  yayinda: 'Yayında',
  suresi_doldu: 'Süresi doldu',
  pasif: 'Pasif',
  taslak: 'Paylaşılmadı',
});

/** Yerel saatle bugünün tarihi: 'YYYY-MM-DD'. */
export function bugunTarihi(simdi) {
  const d = simdi instanceof Date ? simdi : new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/** Paylaşımın son tarihi ('YYYY-MM-DD'); süresizse ''. */
export function atamaBitisi(atama) {
  const a = atama || {};
  const t = metin(a.dueDate || a.deadline).slice(0, 10);
  return TARIH.test(t) ? t : '';
}

export function atamaSuresiDolduMu(atama, bugun) {
  const b = atamaBitisi(atama);
  return !!b && b < (bugun || bugunTarihi());
}

/** Paylaşım şu an doldurulabilir mi? (anket pasif değil, süresi dolmamış) */
export function atamaAcikMi(atama, anket, bugun) {
  if (anket && anket.pasif === true) return false;
  return !atamaSuresiDolduMu(atama, bugun);
}

/**
 * @param {object} anket
 * @param {object[]} atamalar  bu anketin paylaşımları
 * @returns {'pasif'|'taslak'|'yayinda'|'suresi_doldu'}
 */
export function anketYayinDurumu(anket, atamalar, bugun) {
  if (anket && anket.pasif === true) return 'pasif';
  const liste = Array.isArray(atamalar) ? atamalar : [];
  if (liste.length === 0) return 'taslak';
  return liste.some((a) => !atamaSuresiDolduMu(a, bugun)) ? 'yayinda' : 'suresi_doldu';
}

/** Kartta gösterilecek son tarih: en geç olanı; süresiz paylaşım varsa ''. */
export function anketSonTarihi(atamalar) {
  const liste = Array.isArray(atamalar) ? atamalar : [];
  if (liste.length === 0 || liste.some((a) => !atamaBitisi(a))) return '';
  return liste.map(atamaBitisi).sort().pop();
}

/** Süre uzatma girdisi geçerli mi? Hata metni ya da ''. */
export function sureUzatmaHatasi(yeniTarih, bugun) {
  const t = metin(yeniTarih);
  if (!TARIH.test(t)) return 'Geçerli bir tarih seçin.';
  if (t < (bugun || bugunTarihi())) return 'Yeni son tarih bugünden önce olamaz.';
  return '';
}

// ── YÜKLÜ ANKETLER LİSTESİ SÜZGECİ ──

/**
 * Süzgeç seçenekleri listenin kendisinden çıkar: birim (sahip bölüm /
 * fakülte) ve oluşturan akademisyen. Ad sırasına göre.
 * @param {object[]} anketler anketleriSuz çıktısı (_sahipBirim, _olusturan)
 */
export function suzgecSecenekleri(anketler) {
  const birim = new Set();
  const kisi = new Set();
  (anketler || []).forEach((a) => {
    if (metin(a && a._sahipBirim)) birim.add(metin(a._sahipBirim));
    if (metin(a && a._olusturan)) kisi.add(metin(a._olusturan));
  });
  const sirala = (s) => [...s].sort((x, y) => x.localeCompare(y, 'tr'));
  return { birimler: sirala(birim), akademisyenler: sirala(kisi) };
}

/**
 * @param {object[]} anketler
 * @param {{durum?:string, birim?:string, akademisyen?:string, arama?:string}} suzgec
 * @param {(anketId:string) => object[]} atamalariOf
 * @param {string} [bugun]
 */
export function anketListesiniSuz(anketler, suzgec, atamalariOf, bugun) {
  const s = suzgec || {};
  const ara = metin(s.arama).toLocaleLowerCase('tr-TR');
  const of = typeof atamalariOf === 'function' ? atamalariOf : () => [];
  return (anketler || []).filter((a) => {
    if (!a) return false;
    if (s.durum && anketYayinDurumu(a, of(a.id), bugun) !== s.durum) return false;
    if (s.birim && metin(a._sahipBirim) !== s.birim) return false;
    if (s.akademisyen && metin(a._olusturan) !== s.akademisyen) return false;
    if (ara) {
      const icerik = [a.title, a.description, a._olusturan, a._sahipBirim]
        .concat((a.linkedCourses || []).map((c) => (c && (c.code || c.name)) || ''))
        .join(' ')
        .toLocaleLowerCase('tr-TR');
      if (!icerik.includes(ara)) return false;
    }
    return true;
  });
}

/** Durum başına sayılar (süzgeç düğmelerindeki rozetler). */
export function durumSayilari(anketler, atamalariOf, bugun) {
  const out = { yayinda: 0, suresi_doldu: 0, pasif: 0, taslak: 0 };
  const of = typeof atamalariOf === 'function' ? atamalariOf : () => [];
  (anketler || []).forEach((a) => {
    if (a) out[anketYayinDurumu(a, of(a.id), bugun)]++;
  });
  return out;
}
