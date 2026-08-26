// ══════════════════════════════════════════════════════════════
// HAZIR NOT ÖLÇEKLERİ
//
// Karşı kurumun tablosunu her seferinde elle yazmak gereksiz: Türkiye'deki
// üniversitelerin ezici çoğunluğu YÖK'ün standart 4'lük harf sistemini
// kullanıyor. Yetkili listeden seçer, kurum adını yazar, biter; tablo yine
// düzenlenebilir kalır (kurumun kendi sapması varsa elle düzeltilir).
//
// ── SAYI DEĞİL KATSAYI ──
// Çeviri katsayı üzerinden yürüdüğü için asıl önemli sütun katsayıdır. Puan
// aralıkları kurumdan kuruma DEĞİŞİR ve bu yüzden hazır ölçeklerde
// verilmez: uydurulmuş bir aralık, yüzlük puandan harfe çeviride yanlış harf
// üretirdi. Aralık gerekiyorsa yetkili kurumun tablosuna bakıp kendisi girer.
//
// ── BU LİSTE BİR BAŞLANGIÇ, KANIT DEĞİL ──
// Seçilen ölçek kaydedilirken `kaynak: 'hazir'` işaretlenir; yetkili hangi
// tablonun elle doğrulandığını, hangisinin şablondan geldiğini görebilsin.
// ══════════════════════════════════════════════════════════════

const s = (harf, katsayi) => ({ harf, katsayi: katsayi.toFixed(2), min: '', max: '' });

export const HAZIR_OLCEKLER = [
  {
    id: 'yok4',
    ad: 'YÖK standart 4’lük (AA–FF)',
    aciklama:
      'Türkiye’deki devlet üniversitelerinin çoğunda kullanılan sistem. Kurumun tablosu farklıysa satırları düzeltin.',
    satirlar: [
      s('AA', 4.0),
      s('BA', 3.5),
      s('BB', 3.0),
      s('CB', 2.5),
      s('CC', 2.0),
      s('DC', 1.5),
      s('DD', 1.0),
      s('FD', 0.5),
      s('FF', 0.0),
    ],
  },
  {
    id: 'caku',
    ad: 'ÇAKÜ ölçeği (A–F2)',
    aciklama:
      'Çankırı Karatekin Üniversitesi’nin kendi ölçeği. Aynı ölçeği kullanan kurumlar için hazır başlangıç.',
    satirlar: [
      s('A', 4.0),
      s('B1', 3.5),
      s('B2', 3.25),
      s('B3', 3.0),
      s('C1', 2.5),
      s('C2', 2.25),
      s('C3', 2.0),
      s('F1', 1.5),
      s('F2', 0.0),
    ],
  },
  {
    id: 'abcdf',
    ad: 'Sade harf sistemi (A–F)',
    aciklama: 'Bazı vakıf üniversiteleri ve yurt dışı kurumlarında görülen beş kademeli sistem.',
    satirlar: [s('A', 4.0), s('B', 3.0), s('C', 2.0), s('D', 1.0), s('F', 0.0)],
  },
  {
    id: 'abcdf_arti',
    ad: 'Artılı harf sistemi (A–F, artı/eksi)',
    // A+ BİLEREK YOK: kurumların çoğunda A+ ile A aynı 4.00'ı taşıyor. İki
    // harfin aynı katsayıda olması ters çeviriyi (katsayı → ÇAKÜ harfi)
    // belirsiz bırakır; ölçek denetimi de bunu hata sayar.
    aciklama:
      'Yurt dışı kurumlarında yaygın olan artı/eksi kademeli sistem. A+ satırı yoktur — kurumunuzda ayrı katsayı taşıyorsa elle ekleyin.',
    satirlar: [
      s('A', 4.0),
      s('A-', 3.7),
      s('B+', 3.3),
      s('B', 3.0),
      s('B-', 2.7),
      s('C+', 2.3),
      s('C', 2.0),
      s('C-', 1.7),
      s('D+', 1.3),
      s('D', 1.0),
      s('F', 0.0),
    ],
  },
];

/** Seçim listesi için kimlik + ad + açıklama (satırlar taşınmaz). */
export function hazirOlcekSecenekleri() {
  return HAZIR_OLCEKLER.map(({ id, ad, aciklama }) => ({ id, ad, aciklama }));
}

/**
 * Bir hazır ölçeğin satırlarını döndürür — her çağrıda YENİ kopya.
 * Şablonun kendisi düzenlenirse sonraki seçimler bozulurdu.
 */
export function hazirOlcekSatirlari(id) {
  const bulunan = HAZIR_OLCEKLER.find((x) => x.id === String(id || ''));
  return bulunan ? bulunan.satirlar.map((r) => ({ ...r })) : [];
}

/** Kimliğe göre şablon (satırlar dahil, kopya). */
export function hazirOlcekBul(id) {
  const bulunan = HAZIR_OLCEKLER.find((x) => x.id === String(id || ''));
  return bulunan ? { ...bulunan, satirlar: hazirOlcekSatirlari(id) } : null;
}
