// ══════════════════════════════════════════════════════════════
// MEZUNİYET — öğrencinin ders eşleştirme önerileri
//
// Transkriptteki bir ders müfredatta farklı kod ya da adla yer alabilir
// (BM498 ↔ BİL494, "Ayrık Matematik" ↔ "Ayrık Yapılar"). Sistem bunu
// bulamazsa ders "silinmeli" ya da "zorunlu eksik" görünür. Öğrenci böyle
// bir satırı müfredatındaki bir dersle eşleştirip danışmana ÖNERİR:
//
//   eslesmeOnerileri  (öğrenci yazar)  [{ id, transkriptKod, transkriptAd,
//                                         mufredatKod, mufredatAd, aciklama,
//                                         tarih }]
//   eslesmeKararlari  (danışman yazar) { [id]: { karar: 'kabul'|'red',
//                                         tarih, yazan } }
//
// Hesaba YALNIZ danışmanın kabul ettiği öneriler girer: kabul edilen
// eşleşmede transkript satırı o müfredat dersinin denemesi sayılır.
// ══════════════════════════════════════════════════════════════

import { mezNorm as norm } from './mezuniyet.js';

const metin = (v) => (v == null ? '' : String(v).trim());

export const ESLESME_UST_SINIR = 40;

/** Önerinin kimliği: aynı transkript satırı için tek öneri olur. */
export function oneriKimligi(transkriptKod, transkriptAd) {
  return norm(transkriptKod) + '|' + norm(transkriptAd);
}

/** Kayıttaki öneri listesini temizler (geçersizleri atar, tekiller). */
export function onerileriNormalize(liste) {
  const gorulen = new Set();
  const out = [];
  (Array.isArray(liste) ? liste : []).forEach((o) => {
    if (!o) return;
    const transkriptKod = metin(o.transkriptKod).slice(0, 30);
    const transkriptAd = metin(o.transkriptAd).slice(0, 200);
    const mufredatKod = metin(o.mufredatKod).slice(0, 30);
    const mufredatAd = metin(o.mufredatAd).slice(0, 200);
    if (!(transkriptKod || transkriptAd) || !(mufredatKod || mufredatAd)) return;
    const id = oneriKimligi(transkriptKod, transkriptAd);
    if (gorulen.has(id)) return;
    gorulen.add(id);
    out.push({
      id,
      transkriptKod,
      transkriptAd,
      mufredatKod,
      mufredatAd,
      aciklama: metin(o.aciklama).slice(0, 500),
      tarih: metin(o.tarih),
    });
  });
  return out.slice(0, ESLESME_UST_SINIR);
}

/** Önerinin danışman kararı: 'kabul' | 'red' | 'bekliyor'. */
export function oneriKarari(basvuru, oneri) {
  const k = basvuru && basvuru.eslesmeKararlari && basvuru.eslesmeKararlari[oneri.id];
  if (!k || (k.karar !== 'kabul' && k.karar !== 'red')) return 'bekliyor';
  // Öğrenci öneriyi sonradan başka derse çevirdiyse eski karar geçmez.
  const hedef = (o) => norm(o.mufredatKod) + '|' + norm(o.mufredatAd);
  return hedef(k) === hedef(oneri) ? k.karar : 'bekliyor';
}

/** Danışmanın kabul ettiği öneriler. */
export function kabulEdilenOneriler(basvuru) {
  return onerileriNormalize(basvuru && basvuru.eslesmeOnerileri).filter(
    (o) => oneriKarari(basvuru, o) === 'kabul'
  );
}

/** Transkript satırı bu öneriye mi ait? Kod varsa kodla, yoksa adla. */
export function satirOneriyeUyar(satir, oneri) {
  const k = norm(satir && satir.kod);
  if (norm(oneri.transkriptKod)) {
    return k === norm(oneri.transkriptKod);
  }
  return norm(satir && satir.ad) === norm(oneri.transkriptAd);
}

/**
 * Kabul edilen eşleşmeleri transkript satırlarına uygular: eşleşen satıra
 * `eslestirilen` (müfredat dersinin kodu, kodu yoksa adı) yazılır; hesap bu
 * alanı satırın kendi kodundan önce dikkate alır.
 */
export function eslesmeleriUygula(dersler, kabuller) {
  const liste = Array.isArray(kabuller) ? kabuller : [];
  if (liste.length === 0) return dersler || [];
  return (dersler || []).map((d) => {
    const o = liste.find((x) => satirOneriyeUyar(d, x));
    if (!o) return d;
    return { ...d, eslestirilen: o.mufredatKod || o.mufredatAd };
  });
}
