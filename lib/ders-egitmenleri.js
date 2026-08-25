// ══════════════════════════════════════════════════════════════
// BİR DERSİN ÖĞRETİM ELEMANLARI
//
// Ders kaydı (`sinav_dersler`) tek bir hocayı tutuyordu: `professor` düz
// metin. Ama bazı dersler doğası gereği ÇOK HOCALIDIR:
//   • "Bitirme Projesi" — her öğrenci ayrı danışmanla yürütür
//   • Lisansüstü "Uzmanlık Alanı Dersi" — her danışmanın kendi grubu vardır
//   • Ortak yürütülen seçmeliler
// Böyle bir derse hoca sayısı SINIRSIZ atanabilmeli.
//
// ── İKİ ALAN, TEK GERÇEK ──
// Yeni alan `professors` bir ADLAR DİZİSİDİR ve kaynağın kendisidir.
// Eski `professor` alanı düşürülmez: sınav otomasyonu, ders listeleri ve
// eski kayıtlar onu okuyor. Yazarken BİRİNCİ hoca oraya da yazılır, böylece
// tek hocalı derslerin davranışı hiç değişmez ve çok hocalı derste de eski
// okuyucular boş değil, ilk adı görür.
//
// Okuma sırası: `professors` dizisi varsa o; yoksa `professor` metni. Eski
// kayıtlarda iki hoca tek metne "A / B" diye sıkıştırılmış olabilir; bu da
// listeye açılır (yeni yazma yolu böyle bir metin ÜRETMEZ).
//
// ── AD KARŞILAŞTIRMASI ──
// Kimlik ad metnidir ve aynı kişi "Dr. Öğr. Üyesi Ayşe YILMAZ" ya da "Ayşe
// Yılmaz" diye geçebilir. Karşılaştırma bu yüzden `adAnahtari` iledir:
// unvan soyulur, Türkçe kasa doğru uygulanır. Düz `===` "kendi dersim mi"
// sorusuna yanlış cevap veriyordu.
// ══════════════════════════════════════════════════════════════

import { adAnahtari } from './akademisyen-programi.js';

const metin = (v) => String(v == null ? '' : v).trim();

/**
 * Ham değeri (dizi ya da metin) ad listesine çevirir; tekrarlar düşer.
 * Metin biçiminde '/' ve ';' ayraç sayılır — eski birleşik kayıtlar için.
 * Virgül AYRAÇ DEĞİLDİR: unvanlı adlarda virgül geçebiliyor.
 */
export function egitmenleriCoz(ham) {
  const parcalar = [];
  const ekle = (v) => {
    if (Array.isArray(v)) {
      v.forEach(ekle);
      return;
    }
    metin(v)
      .split(/[/;]/)
      .forEach((p) => {
        const t = metin(p);
        if (t) parcalar.push(t);
      });
  };
  ekle(ham);
  const gorulen = new Set();
  return parcalar.filter((ad) => {
    const k = adAnahtari(ad) || ad.toLocaleLowerCase('tr-TR');
    if (gorulen.has(k)) return false;
    gorulen.add(k);
    return true;
  });
}

/**
 * Dersin öğretim elemanları — sırayla, tekrarsız.
 * `professors` dizisi kaynaktır; yoksa eski `professor` metnine düşülür.
 */
export function dersEgitmenleri(ders) {
  const d = ders || {};
  if (Array.isArray(d.professors)) return egitmenleriCoz(d.professors);
  return egitmenleriCoz(d.professor);
}

/** Görünüm metni: "A / B". Hoca yoksa boş metin. */
export function egitmenMetni(ders, ayrac) {
  return dersEgitmenleri(ders).join(ayrac == null ? ' / ' : ayrac);
}

/** Ders birden çok hocayla mı yürüyor? Slotta "hangi hoca?" sorusunu bu açar. */
export function cokEgitmenli(ders) {
  return dersEgitmenleri(ders).length > 1;
}

/** Derse hiç hoca atanmamış mı? */
export function egitmensizMi(ders) {
  return dersEgitmenleri(ders).length === 0;
}

/**
 * Bu kişi dersin hocalarından biri mi?
 * Hoca atanmamış derste `false` döner — "kısıt yok" kararı çağırana aittir.
 */
export function dersEgitmeniMi(ders, ad) {
  const hedef = adAnahtari(ad);
  if (!hedef) return false;
  return dersEgitmenleri(ders).some((x) => adAnahtari(x) === hedef);
}

/** İki ad aynı kişiyi mi gösteriyor (unvan/kasa farkı yok sayılır)? */
export function ayniEgitmen(a, b) {
  const ka = adAnahtari(a);
  const kb = adAnahtari(b);
  // İkisi de boşsa "aynı" sayılır: slotta hocası girilmemiş iki kayıt
  // birbirinin kopyasıdır.
  if (!ka && !kb) return metin(a) === metin(b) || (!metin(a) && !metin(b));
  return !!ka && ka === kb;
}

/**
 * Kayda yazılacak alanlar. `professor` BİRİNCİ hocadır (eski okuyucular
 * için), `professors` listenin tamamı. Liste boşsa iki alan da boşalır —
 * hoca silme işleminin kayda geçmesi gerekir.
 */
export function egitmenAlanlari(liste) {
  const temiz = egitmenleriCoz(liste);
  return { professor: temiz[0] || '', professors: temiz };
}

/**
 * Slota yazılacak hocayı seçer.
 *
 * Çok hocalı derste seçim ZORUNLUDUR: hangi hoca için yerleştirildiği
 * sorulmadan slota yazılamaz (yanlış hocanın programında görünürdü ve
 * çakışma taraması da yanlış kişiyi denetlerdi). Tek hocalı derste seçim
 * gerekmez, ders kaydındaki hoca kullanılır.
 *
 * @returns {{ok:boolean, egitmen:string, sebep?:string}}
 */
export function slotEgitmeniSec(ders, secilen) {
  const liste = dersEgitmenleri(ders);
  const s = metin(secilen);
  if (liste.length <= 1) return { ok: true, egitmen: s || liste[0] || '' };
  if (!s) return { ok: false, egitmen: '', sebep: 'secim-gerekli' };
  const eslesen = liste.find((x) => ayniEgitmen(x, s));
  if (!eslesen) return { ok: false, egitmen: '', sebep: 'listede-yok' };
  return { ok: true, egitmen: eslesen };
}
