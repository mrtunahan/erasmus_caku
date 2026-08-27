// ══════════════════════════════════════════════════════════════
// DERS MUAFİYETİNDE NOT EŞLEMESİ
//
// Muafiyet belgesinde iki not sütunu var: karşı kurumdaki not ve onun ÇAKÜ
// karşılığı. Karşılık bugüne kadar hiç hesaplanmıyordu — akademisyen belgeyi
// üretiyor, ÇAKÜ sütunu boş çıkıyor ve memur tabloyu elle dolduruyordu.
//
// ── ÇEVİRİ ZİNCİRİ: HARF → KATSAYI → HARF ──
//   1) Öğrenci karşı kurumda hangi HARFLE geçtiyse o harfin O KURUMDAKİ
//      katsayısına bakılır; aynı katsayının ÇAKÜ ölçeğindeki karşılığı
//      yazılır. Katsayı iki kurumun ortak dilidir — harfin kendisi değil
//      ("BB" bir kurumda 3.00, ÇAKÜ ölçeğinde ise hiç yok).
//   2) Belgede harf YOKSA son çare yüzlük puandır: doğrudan ÇAKÜ ölçeğine
//      oturtulur. Harf varken puana BAKILMAZ — aynı sayı iki kurumda farklı
//      harfe düşer ve transkriptten okunan "puan" güvenilir değildir (model
//      kredi/AKTS/katsayı sütununu puan sanabiliyor).
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
 * @param {string} [kurumAdi] gerekçe metninde geçen kurum adı
 * @returns {{harf:string, kaynak:'puan'|'harf'|'', karsiKatsayi:(number|null), sebep:string}}
 */
export function dersNotunuCevir(ders, karsiOlcek, cakuKural, kurumAdi) {
  const d = ders || {};
  const kurum = metin(kurumAdi) || 'karşı kurum';
  // Eski kayıtlarda yalnız `grade` var ve içinde puan da olabilir, harf de.
  const harf = metin(d.gradeHarf) || (/^\d/.test(metin(d.grade)) ? '' : metin(d.grade));
  const puanAdayi = metin(d.gradePuan) || (/^\d/.test(metin(d.grade)) ? metin(d.grade) : '');

  // ── HARF ÖNCE, PUAN SONRA ──
  // Kural kurumun kendi yönergesidir: öğrenci karşı kurumda hangi HARFLE
  // geçtiyse o harfin O KURUMDAKİ katsayısına bakılır, aynı katsayının ÇAKÜ
  // ölçeğindeki karşılığı yazılır. Katsayı iki kurumun ortak dilidir.
  //
  // Yüzlük puan bu zincirin yerine geçmez ve önce denenirse yanlış sonuç
  // üretir: (1) aynı sayı iki kurumda farklı harfe düşer, ÇAKÜ aralığına
  // oturması tesadüftür; (2) transkriptten okunan "puan" güvenilir değildir —
  // model kredi/AKTS/katsayı sütununu puan sanabiliyor ve o sayı ÇAKÜ'nün
  // 0–49 aralığına düşüp her dersi F yapıyordu. Harf varken puana bakılmaz.
  if (harf) {
    const c = karsiHarfiCevir(harf, karsiOlcek, (cakuKural || {}).notOlcegi);
    if (c.harf) {
      const zincir =
        kurum + ' ölçeğinde "' + harf + '" = katsayı ' + c.karsiKatsayi + ' → ÇAKÜ: ' + c.harf;
      return {
        harf: c.harf,
        kaynak: 'harf',
        karsiKatsayi: c.karsiKatsayi,
        sebep: c.sebep ? zincir + '. ' + c.sebep : zincir + '.',
      };
    }
    // Harf çevrilemedi (tablo eksik ya da harf tabloda yok). Yüzlük puan
    // varsa son çare olarak o denenir; yoksa sebep söylenir.
    if (!puanAdayi) return { harf: '', kaynak: '', karsiKatsayi: c.karsiKatsayi, sebep: c.sebep };
    const p = mezPuandanHarf(puanAdayi, cakuKural);
    if (p.harf) {
      return {
        harf: p.harf,
        kaynak: 'puan',
        karsiKatsayi: c.karsiKatsayi,
        sebep:
          c.sebep +
          ' Harf çevrilemediği için yüzlük puan (' +
          puanAdayi +
          ') ÇAKÜ ölçeğinden çevrildi — kontrol edin.',
      };
    }
    return { harf: '', kaynak: '', karsiKatsayi: c.karsiKatsayi, sebep: c.sebep };
  }

  if (puanAdayi) {
    const p = mezPuandanHarf(puanAdayi, cakuKural);
    if (p.harf) {
      return {
        harf: p.harf,
        kaynak: 'puan',
        karsiKatsayi: null,
        sebep: 'Belgede harf notu yok; yüzlük puan ' + puanAdayi + ' ÇAKÜ ölçeğinden çevrildi.',
      };
    }
    return { harf: '', kaynak: '', karsiKatsayi: null, sebep: p.sebep };
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
export function notEslemeTaslagi(matches, karsiOlcek, cakuKural, kurumAdi) {
  const hepsi = Array.isArray(matches) ? matches : [];
  // ── ANAHTAR TAM DİZİDEKİ KONUMDUR ──
  // Muafiyet eşleştirmelerinin `id`si yok; kimlik dizideki sıradır
  // (akademisyen kararı da `matchIndex` ile yazılıyor). Anahtar SÜZÜLMÜŞ
  // listenin sırasından üretilirse, dersin bir kısmı onaylıyken numaralar
  // kayar ve onaylanan karşılık YANLIŞ derse yazılırdı. Konum önce
  // işaretlenir, süzme sonra yapılır.
  const isaretli = hepsi.map((m, i) => ({ m, anahtar: String(m && m.id != null ? m.id : i) }));
  const onayli = isaretli.filter((x) => x.m && x.m.adminDecision === 'confirmed');
  const liste = onayli.length > 0 ? onayli : isaretli;
  return liste.map(({ m, anahtar }) => {
    const src = (m && (m.sourceCourse || m.source)) || {};
    const cak = (m && (m.localCourse || m.target)) || {};
    const cevrim = dersNotunuCevir(src, karsiOlcek, cakuKural, kurumAdi);
    const kayitli = metin(m && m.convertedGrade);
    return {
      anahtar,
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
