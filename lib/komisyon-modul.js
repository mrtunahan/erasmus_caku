// ══════════════════════════════════════════════════════════════
// KOMİSYON → MODÜL ERİŞİMİ
//
// Bir komisyonun üyesi, o komisyonun ilgilendiği modülü menüsünde görür.
// (Erasmus komisyonu üyesi akademisyen → Erasmus modülü.)
//
// ── ERİŞİM ARTIK KOMİSYONUN ADINDAN TAHMİN EDİLMİYOR ──
// Eskiden modül, komisyon adının içinde geçen kelimeden çıkarılıyordu:
// 'erasmus' geçiyorsa Erasmus, 'staj' geçiyorsa Staj… Bunun üç kusuru vardı:
//   • Yedi kelime tanınıyordu. "Yatay Geçiş Komisyonu", "Akreditasyon
//     Komisyonu" hiçbir şey açmıyordu ve neden açmadığı da görünmüyordu.
//   • Bir komisyon EN FAZLA BİR modül açabiliyordu: "Ders Programı ve Sınav
//     Komisyonu" yalnız Sınav'ı açıyor, Ders Programı'nı açmıyordu (sıra
//     hangisini önce yakalarsa).
//   • Komisyonun adını değiştirmek, kimsenin haberi olmadan erişimi
//     kesebiliyordu.
// Artık modüller komisyon kaydında AÇIKÇA seçiliyor (`modules` dizisi).
// Ad tahmini yalnızca ESKİ kayıtlar için yedek olarak duruyor — yoksa
// güncelleme anında herkesin erişimi bir anda kesilirdi.
//
// ── ÜYE EŞLEŞMESİ TÜRKÇE BİLİR ──
// Eski kural `m.name.toLowerCase() === kullanici.toLowerCase()` idi.
// JavaScript'in locale'siz `toLowerCase()`'i Türkçe'de bozar: "IŞIK" → "işik",
// "İSMAİL" → "i̇smail" (birleşik noktalı i). Ad iki tarafta farklı yazılmışsa
// (unvan eklenmiş, büyük harfle girilmiş) üye erişimi SESSİZCE kayboluyordu.
// Karşılaştırma artık unvanı soyup Türkçe-duyarlı anahtar üreten
// `adAnahtari` ile yapılır — sistemin başka yerlerinde de kullanılan kural.
// ══════════════════════════════════════════════════════════════

import { adAnahtari } from './ders-listesi-ice-aktar.js';

/**
 * Eski kayıtlar için ad tahmini. Yeni komisyonlarda modüller açıkça
 * seçildiği için buraya düşülmez.
 *
 * Sıra önemli değil: artık TÜM eşleşenler döner, ilk eşleşen değil.
 * "Ders Programı ve Sınav Komisyonu" ikisini birden açar.
 */
export const AD_TAHMINI = [
  { ara: ['erasmus'], modul: 'erasmus' },
  { ara: ['staj'], modul: 'staj' },
  { ara: ['muafiyet'], modul: 'muafiyet' },
  { ara: ['proje'], modul: 'projeler' },
  { ara: ['sınav', 'sinav'], modul: 'sinav' },
  { ara: ['ders program'], modul: 'dersprogrami' },
  { ara: ['performans'], modul: 'performans' },
];

const metin = (v) =>
  String(v == null ? '' : v)
    .toLocaleLowerCase('tr')
    .trim();

/** Komisyon adından tahmin edilen modül id'leri (eski kayıt yedeği). */
export function addanTahmin(ad) {
  const n = metin(ad);
  if (!n) return [];
  const bulunan = [];
  AD_TAHMINI.forEach((k) => {
    if (k.ara.some((x) => n.indexOf(x) >= 0) && bulunan.indexOf(k.modul) < 0) {
      bulunan.push(k.modul);
    }
  });
  return bulunan;
}

/**
 * Komisyonun açtığı modüller.
 * Kayıtta açık seçim varsa O geçerlidir — boş bir seçim de bir karardır
 * ("bu komisyon modül açmasın") ve ad tahminiyle ezilmez.
 */
export function komisyonModulleri(komisyon) {
  const k = komisyon || {};
  if (Array.isArray(k.modules)) {
    return k.modules.map((m) => String(m || '').trim()).filter(Boolean);
  }
  return addanTahmin(k.name);
}

/** Kullanıcı bu komisyonun üyesi mi? Unvan ve büyük/küçük harf farkı engel değil. */
export function uyeMi(komisyon, kullaniciAdi) {
  const anahtar = adAnahtari(kullaniciAdi);
  if (!anahtar) return false;
  const uyeler = (komisyon && Array.isArray(komisyon.members) && komisyon.members) || [];
  return uyeler.some((m) => m && adAnahtari(m.name) === anahtar);
}

/**
 * Kullanıcının komisyon üyelikleri üzerinden eriştiği modül id'leri.
 * Aynı modülü açan iki komisyon varsa id bir kez döner.
 */
export function erisilebilirModuller(komisyonlar, kullaniciAdi) {
  const anahtar = adAnahtari(kullaniciAdi);
  if (!anahtar) return [];
  const idler = [];
  (Array.isArray(komisyonlar) ? komisyonlar : []).forEach((k) => {
    if (!uyeMi(k, kullaniciAdi)) return;
    komisyonModulleri(k).forEach((m) => {
      if (idler.indexOf(m) < 0) idler.push(m);
    });
  });
  return idler;
}

/**
 * Komisyon kaydına yazılacak modül listesi.
 * Bilinmeyen id'ler elenir: menüde karşılığı olmayan bir id, kimsenin
 * göremeyeceği bir erişim kaydı bırakırdı.
 */
export function modulleriTemizle(secilenler, tanimliModuller) {
  const tanimli = new Set(
    (Array.isArray(tanimliModuller) ? tanimliModuller : []).map((m) => String((m && m.id) || m))
  );
  const cikti = [];
  (Array.isArray(secilenler) ? secilenler : []).forEach((s) => {
    const id = String(s || '').trim();
    if (id && tanimli.has(id) && cikti.indexOf(id) < 0) cikti.push(id);
  });
  return cikti;
}
