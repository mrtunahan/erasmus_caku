// ══════════════════════════════════════════════════════════════
// YATAY GEÇİŞ LİSTESİNİN TEPE ÖZETİ
//
// Akademisyenin ekranında onlarca başvuru kartı alt alta duruyor; "kaç kişi
// değerlendirildi, kaç asil çıktı, belge üretilebilir mi" sorusunun cevabı
// hiçbir yerde YAZMIYORDU — kartlar tek tek sayılıyordu.
//
// Sayılar kayıttaki ham `degerlendirme` alanından değil GEÇERLİ sonuçtan
// çıkar (lib/yatay-kriter.js → gecerliDegerlendirme): taban sıralama şartını
// karşılamayan bir kayıt, kayıtta "2. YEDEK" yazıyor olsa bile uygun
// değildir. Ekranın üstündeki sayı ile kartların söylediği aynı olmalı.
// ══════════════════════════════════════════════════════════════

import { gecerliDegerlendirme } from './yatay-kriter.js';

/**
 * Listenin özeti.
 *
 * @param {object[]} kayitlar görünen (süzülmüş) başvurular
 * @param {string|number} esik taban yerleştirme başarı sıralaması (boş olabilir)
 * @returns {{toplam:number, degerlendirilen:number, bekleyen:number,
 *   asil:number, yedek:number, uygunDegil:number, cakisan:number,
 *   oran:number, belgeHazir:boolean}}
 */
export function listeOzeti(kayitlar, esik) {
  const liste = Array.isArray(kayitlar) ? kayitlar : [];
  let degerlendirilen = 0;
  let asil = 0;
  let yedek = 0;
  let uygunDegil = 0;
  let cakisan = 0;
  liste.forEach((r) => {
    const e = gecerliDegerlendirme(r, esik);
    if (e.cakisma) cakisan++;
    // "Değerlendirildi" ölçütü KAYITTIR: kriter yüzünden uygun değil sayılan
    // ama personelin henüz dokunmadığı başvuru bekliyor sayılır — belge
    // üretimi de bu ölçüte bakar.
    if (!r || !r.degerlendirme) return;
    degerlendirilen++;
    if (e.degerlendirme === 'uygun_asil') asil++;
    else if (e.degerlendirme === 'uygun_yedek') yedek++;
    else uygunDegil++;
  });
  const toplam = liste.length;
  return {
    toplam,
    degerlendirilen,
    bekleyen: toplam - degerlendirilen,
    asil,
    yedek,
    uygunDegil,
    cakisan,
    oran: toplam > 0 ? degerlendirilen / toplam : 0,
    belgeHazir: toplam > 0 && degerlendirilen === toplam,
  };
}

/**
 * Tepe şeridinde çizilecek kutular — ekran yalnız çizer, neyin gösterileceği
 * burada kararlaştırılır.
 *
 * `ton`: 'notr' | 'bekleyen' | 'olumlu' | 'olumsuz' — renk eşlemesi çizene ait.
 * Puan ölçütü olmayan kurum içi geçişte asil/yedek kutuları da anlamlıdır
 * (karar bölüm kurulunun), o yüzden türe göre ayrım yapılmaz.
 */
export function ozetKutulari(ozet) {
  const o = ozet || {};
  const kutular = [
    { id: 'toplam', etiket: 'Başvuru', deger: o.toplam || 0, ton: 'notr' },
    {
      id: 'bekleyen',
      etiket: 'Değerlendirilmedi',
      deger: o.bekleyen || 0,
      ton: o.bekleyen ? 'bekleyen' : 'notr',
    },
    { id: 'asil', etiket: 'Asil', deger: o.asil || 0, ton: 'olumlu' },
    { id: 'yedek', etiket: 'Yedek', deger: o.yedek || 0, ton: 'notr' },
    { id: 'uygunDegil', etiket: 'Uygun değil', deger: o.uygunDegil || 0, ton: 'olumsuz' },
  ];
  return kutular;
}

/** Belge üretimi şeridinin cümlesi — iki durumda iki ayrı cümle. */
export function belgeDurumMetni(ozet) {
  const o = ozet || {};
  if (!o.toplam) return 'Bu geçiş türünde başvuru yok.';
  if (o.belgeHazir) {
    return 'Tüm başvurular değerlendirildi — ' + o.toplam + ' başvuru için rapor üretilebilir.';
  }
  return (
    o.bekleyen +
    ' başvuru henüz değerlendirilmedi. Rapor, tüm başvurular değerlendirildiğinde üretilebilir.'
  );
}
