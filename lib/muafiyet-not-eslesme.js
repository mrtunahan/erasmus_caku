// ══════════════════════════════════════════════════════════════
// DERS MUAFİYETİNDE NOT EŞLEMESİ
//
// Muafiyet belgesinde iki not sütunu var: karşı kurumdaki not ve onun ÇAKÜ
// karşılığı. Karşılık bugüne kadar hiç hesaplanmıyordu — akademisyen belgeyi
// üretiyor, ÇAKÜ sütunu boş çıkıyor ve memur tabloyu elle dolduruyordu.
//
// ── ÇEVİRİ SIRASI ──
//   1) YÜZLÜK PUAN varsa doğrudan ÇAKÜ ölçeğine oturur. Sayı iki kurumun
//      ortak dilidir; karşı kurumun tablosuna hiç ihtiyaç yoktur.
//   2) Yalnız HARF varsa karşı kurumun tablosundan KATSAYIYA, oradan ÇAKÜ
//      harfine gidilir. Harf doğrudan taşınamaz: "BB" bir kurumda 3.00,
//      başka bir kurumda başka bir şeydir; ÇAKÜ ölçeğinde ise hiç yoktur.
//   3) İkisi de yoksa ya da tablo eksikse çeviri YAPILMAZ ve sebep yazılır.
//      Uydurulmuş bir harf öğrencinin transkriptine geçerdi.
//
// ── SONUÇ BİR TASLAKTIR ──
// Hesaplanan değer akademisyene ÖNERİ olarak gösterilir; kaydedilen değer
// onun onayladığıdır. Bu dosya karar vermez, hesaplar.
// ══════════════════════════════════════════════════════════════

import { karsiHarfiCevir } from './karsi-olcek.js';
import { mezPuandanHarf } from './mezuniyet.js';

const metin = (v) => String(v == null ? '' : v).trim();

/**
 * Bir dersin karşı-kurum notunu ÇAKÜ harfine çevirir.
 *
 * @param {{grade?:string, gradeHarf?:string, gradePuan?:string}} ders karşı kurum dersi
 * @param {Array} karsiOlcek karşı kurumun harf–katsayı tablosu (satırlar)
 * @param {object} cakuKural bölümün mezuniyet kuralları (notOlcegi içerir)
 * @returns {{harf:string, kaynak:'puan'|'harf'|'', karsiKatsayi:(number|null), sebep:string}}
 */
export function dersNotunuCevir(ders, karsiOlcek, cakuKural) {
  const d = ders || {};
  const puan = metin(d.gradePuan);
  // Eski kayıtlarda yalnız `grade` var ve içinde puan da olabilir, harf de.
  const harf = metin(d.gradeHarf) || (/^\d/.test(metin(d.grade)) ? '' : metin(d.grade));
  const puanAdayi = puan || (/^\d/.test(metin(d.grade)) ? metin(d.grade) : '');

  if (puanAdayi) {
    const c = mezPuandanHarf(puanAdayi, cakuKural);
    if (c.harf) {
      return {
        harf: c.harf,
        kaynak: 'puan',
        karsiKatsayi: null,
        sebep: 'Yüzlük puan ' + puanAdayi + ' ÇAKÜ ölçeğinden çevrildi.',
      };
    }
    // Puan çevrilemedi ama harf varsa ikinci yol denenir — tek bir okunamayan
    // sayı yüzünden çeviriden vazgeçmek gereksiz.
    if (!harf) return { harf: '', kaynak: '', karsiKatsayi: null, sebep: c.sebep };
  }

  if (harf) {
    const c = karsiHarfiCevir(harf, karsiOlcek, (cakuKural || {}).notOlcegi);
    if (c.harf) {
      return {
        harf: c.harf,
        kaynak: 'harf',
        karsiKatsayi: c.karsiKatsayi,
        sebep:
          c.sebep ||
          'Karşı kurumdaki "' + harf + '" notu katsayı ' + c.karsiKatsayi + ' üzerinden çevrildi.',
      };
    }
    return { harf: '', kaynak: '', karsiKatsayi: c.karsiKatsayi, sebep: c.sebep };
  }

  return {
    harf: '',
    kaynak: '',
    karsiKatsayi: null,
    sebep: 'Bu derste karşı kurum notu okunmamış.',
  };
}

/**
 * Kayıttaki eşleştirmeler için not eşleme taslağı üretir.
 *
 * Yalnız ONAYLANAN dersler alınır; hiç onay yoksa tüm talepler (belgeye
 * yazılan küme ile aynı kural — iki yerin farklı liste üretmesi, akademisyenin
 * onayladığı satırla belgedeki satırın tutmaması demekti).
 *
 * Akademisyen daha önce bir karşılık kaydettiyse (`convertedGrade`) o KORUNUR:
 * taslak, verilmiş kararı geri almaz.
 */
export function notEslemeTaslagi(matches, karsiOlcek, cakuKural) {
  const hepsi = Array.isArray(matches) ? matches : [];
  const onayli = hepsi.filter((m) => m && m.adminDecision === 'confirmed');
  const liste = onayli.length > 0 ? onayli : hepsi;
  return liste.map((m, i) => {
    const src = (m && (m.sourceCourse || m.source)) || {};
    const cak = (m && (m.localCourse || m.target)) || {};
    const cevrim = dersNotunuCevir(src, karsiOlcek, cakuKural);
    const kayitli = metin(m && m.convertedGrade);
    return {
      anahtar: String(m && m.id != null ? m.id : i),
      karsiKod: metin(src.code),
      karsiAd: metin(src.name),
      karsiNot: metin(src.grade) || metin(src.gradeHarf) || metin(src.gradePuan),
      cakuKod: metin(cak.code),
      cakuAd: metin(cak.name),
      // Kaydedilmiş karar > hesaplanan öneri.
      cakuNot: kayitli || cevrim.harf,
      onerilen: cevrim.harf,
      elleGirilmis: !!kayitli && kayitli !== cevrim.harf,
      kaynak: cevrim.kaynak,
      sebep: kayitli ? 'Daha önce onaylanan karşılık korundu.' : cevrim.sebep,
    };
  });
}

/** Taslakta ÇAKÜ karşılığı boş kalan ders sayısı. */
export function eksikEslesmeSayisi(taslak) {
  return (Array.isArray(taslak) ? taslak : []).filter((r) => !metin(r.cakuNot)).length;
}
