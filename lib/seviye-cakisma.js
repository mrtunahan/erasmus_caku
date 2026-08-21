// ══════════════════════════════════════════════════════════════
// SEVİYELER ARASI ÇAKIŞMA — AKADEMİSYEN İKİ YERDE OLAMAZ
//
// Lisans ve lisansüstü programları AYRI belgelerde tutulur ve ayrı ayrı
// hazırlanır. Çakışma taraması ise her belgeyi yalnız kendi seviyesiyle
// karşılaştırıyordu: lisansüstü programı yapılırken akademisyenin aynı
// saatte lisans dersi olması hiçbir uyarı üretmiyordu. Kişi tek, takvim
// tek — çakışma seviyeden bağımsızdır.
//
// ── SLOT İNDEKSİ SEVİYELER ARASINDA KARŞILAŞTIRILAMAZ ──
// Her seviyenin kendi saat ayarı vardır (lisansüstü akşama taşar). Aynı
// "3. saat" iki seviyede iki farklı zamandır; indeksleri karşılaştırmak
// hem olmayan çakışma uydurur hem gerçeğini kaçırır.
//
// Etiket eşitliği de yetmez: bir seviye 08:15'te, öteki 08:30'da başlıyorsa
// etiketler farklıdır ama dersler ZAMAN OLARAK üst üste biner. Bu yüzden
// karşılaştırma etikete değil, etiketten çözülen ZAMAN ARALIĞINA yapılır.
// ══════════════════════════════════════════════════════════════

import { DERS_DK, dakikaya, etiketBaslangici } from './ders-saatleri.js';

/**
 * '08:15-09:00' → { bas: 495, bit: 540 } (gün başından dakika).
 * Bitiş okunamazsa ders süresi kadar sayılır; hiç çözülemezse null.
 */
export function dersAraligi(etiket) {
  const bas = etiketBaslangici(etiket);
  if (!Number.isFinite(bas)) return null;
  const m = /(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/.exec(String(etiket || ''));
  const bit = m ? dakikaya(m[2]) : null;
  return { bas, bit: bit != null && bit > bas ? bit : bas + DERS_DK };
}

/** İki ders aralığı zaman olarak üst üste biniyor mu? */
export function kesisiyorMu(a, b) {
  if (!a || !b) return false;
  return a.bas < b.bit && b.bas < a.bit;
}

/**
 * Bir programın slotlarını düz kayıt listesine çevirir.
 *
 * @param {object} slotlar  { 'Gün_saatIndeksi': slot }
 * @param {string[]} saatler o programın KENDİ saat etiketleri
 * @param {object} ek       her kayda eklenecek künye (seviye, bolum, sinif…)
 * @param {function} dersleriCoz slot → ders listesi (window.slotDersleri)
 */
export function programGirdileri(slotlar, saatler, ek, dersleriCoz) {
  const coz = typeof dersleriCoz === 'function' ? dersleriCoz : (s) => (s ? [s] : []);
  const out = [];
  Object.entries(slotlar || {}).forEach(([anahtar, slot]) => {
    const ayrac = String(anahtar).lastIndexOf('_');
    if (ayrac < 0) return;
    const gun = String(anahtar).slice(0, ayrac);
    const i = parseInt(String(anahtar).slice(ayrac + 1), 10);
    if (!Number.isInteger(i) || i < 0) return;
    const saat = (saatler || [])[i] || '';
    const aralik = dersAraligi(saat);
    if (!aralik) return; // saati çözülemeyen kayıt karşılaştırmaya girmez
    coz(slot).forEach((ders) => {
      if (!ders) return;
      out.push({
        gun,
        saatIndeksi: i,
        saat,
        ...aralik,
        // Aynı hücreden gelen dersler birbiriyle çakışmaz: bölme kasıtlıdır.
        hucre: [ek && ek.kaynak, gun, i].join('|'),
        dersKodu: ders.courseCode || '',
        dersAdi: ders.courseName || '',
        derslik: ders.classroom || '',
        akademisyen: ders.instructor || '',
        ...(ek || {}),
      });
    });
  });
  return out;
}

const anahtarla = (ad) =>
  String(ad || '')
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/\s+/g, ' ');

/**
 * Aynı akademisyenin zaman olarak kesişen dersleri.
 *
 * `yeniler` denetlenen taraf (örn. düzenlenen lisansüstü programı),
 * `mevcutlar` karşılaştırılacak taraf (örn. kayıtlı lisans programı).
 * Tek liste verilirse kendi içinde taranır.
 *
 * Çakışma SAYILMAZ:
 *   • aynı hücredeki dersler (kasıtlı bölme),
 *   • aynı ders kodu (ortak ders iki programda birden görünür).
 */
export function akademisyenCakismalari(yeniler, mevcutlar) {
  const a = yeniler || [];
  const b = mevcutlar === undefined ? a : mevcutlar || [];
  const kendiIcinde = mevcutlar === undefined;
  const out = [];
  const gorulen = new Set();
  a.forEach((x, xi) => {
    const ad = anahtarla(x.akademisyen);
    if (!ad) return;
    b.forEach((y, yi) => {
      if (kendiIcinde && yi <= xi) return;
      if (!y || anahtarla(y.akademisyen) !== ad) return;
      if (x.gun !== y.gun) return;
      if (x.hucre && x.hucre === y.hucre) return;
      if (x.dersKodu && x.dersKodu === y.dersKodu) return;
      if (!kesisiyorMu(x, y)) return;
      const imza = [ad, x.gun, x.bas, y.bas, x.dersKodu, y.dersKodu].sort().join('|');
      if (gorulen.has(imza)) return;
      gorulen.add(imza);
      out.push({ akademisyen: x.akademisyen, gun: x.gun, yeni: x, mevcut: y });
    });
  });
  return out;
}

/** Kullanıcıya gösterilecek tek satırlık uyarı. */
export function cakismaMetni(c) {
  if (!c) return '';
  const y = c.yeni || {};
  const m = c.mevcut || {};
  const nerede = (k) =>
    [k.seviyeAd, k.bolumAdi, k.sinif ? k.sinif + '. Sınıf' : ''].filter(Boolean).join(' · ');
  return (
    `${c.akademisyen}: ${c.gun} ${y.saat} — ` +
    `${y.dersKodu || 'ders'} (${nerede(y)}) ile ` +
    `${m.dersKodu || 'ders'} (${nerede(m)}, ${m.saat}) aynı saate düşüyor`
  );
}
