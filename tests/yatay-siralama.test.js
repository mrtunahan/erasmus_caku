// Yatay geçiş sıralaması ve asil/yedek önerisi.
//
// Bu hesap kimin yerleşip kimin yerleşemeyeceğini SIRALIYOR. Sessiz bir hata
// burada bir öğrencinin hakkını yer — o yüzden özellikle "eksik veri" ve
// "eşit puan" yolları test altında.
import { describe, it, expect } from 'vitest';
import { puanOku, siralamaPuani, puanaGoreSirala, asilYedekOner } from '../lib/yatay-siralama.js';

const b = (id, yks, not, sinif) => ({
  id,
  yksPuani: yks,
  notOrtalamasi: not,
  basvurduguSinif: sinif || '2',
});

describe('puanOku', () => {
  it('virgüllü ve noktalı yazımı okur', () => {
    expect(puanOku('412,338')).toBeCloseTo(412.338);
    expect(puanOku('412.338')).toBeCloseTo(412.338);
  });
  it('boş ve okunamayan değerde null döner', () => {
    expect(puanOku('')).toBe(null);
    expect(puanOku(null)).toBe(null);
    expect(puanOku('abc')).toBe(null);
  });
});

describe('siralamaPuani', () => {
  it('kurumlararasında YKS %40 + AGNO %60 hesaplar', () => {
    // Kullanıcının gerçek çıktısındaki değerler: 105,69 + 35,64 = 141,33
    expect(siralamaPuani(b('a', '264,22893', '59,4'), 'kurumlararasi')).toBeCloseTo(141.33, 2);
  });

  it('belgeye yazılan hesapla aynı yuvarlamayı kullanır', () => {
    // Önce bileşenler ayrı yuvarlanır, sonra toplanır.
    const p = siralamaPuani(b('a', '317,63493', '59,4'), 'kurumlararasi');
    expect(p).toBeCloseTo(127.05 + 35.64, 2);
  });

  it('merkezi türde YKS puanını kullanır', () => {
    expect(siralamaPuani(b('a', '412,338', ''), 'merkezi')).toBeCloseTo(412.338);
  });

  it('kurum içinde puan yoktur', () => {
    expect(siralamaPuani(b('a', '412', '80'), 'kurumici')).toBe(null);
  });

  it('kurumlararasında bileşenlerden biri eksikse null döner', () => {
    expect(siralamaPuani(b('a', '412', ''), 'kurumlararasi')).toBe(null);
    expect(siralamaPuani(b('a', '', '80'), 'kurumlararasi')).toBe(null);
  });
});

describe('puanaGoreSirala', () => {
  it('yüksekten düşüğe sıralar', () => {
    const liste = [b('düşük', '300', '60'), b('yüksek', '400', '80'), b('orta', '350', '70')];
    expect(puanaGoreSirala(liste, 'kurumlararasi').map((x) => x.id)).toEqual([
      'yüksek',
      'orta',
      'düşük',
    ]);
  });

  it('puansız kayıtları EN SONA atar (sıfır saymaz)', () => {
    const liste = [b('puansız', '', ''), b('düşük', '10', '10'), b('yüksek', '400', '80')];
    expect(puanaGoreSirala(liste, 'kurumlararasi').map((x) => x.id)).toEqual([
      'yüksek',
      'düşük',
      'puansız',
    ]);
  });

  it('eşit puanda giriş sırasını korur (kararlı)', () => {
    const liste = [b('ilk', '400', '80'), b('ikinci', '400', '80')];
    expect(puanaGoreSirala(liste, 'kurumlararasi').map((x) => x.id)).toEqual(['ilk', 'ikinci']);
  });

  it('boş listede boş döner', () => {
    expect(puanaGoreSirala([], 'kurumlararasi')).toEqual([]);
    expect(puanaGoreSirala(null, 'kurumlararasi')).toEqual([]);
  });
});

describe('asilYedekOner', () => {
  const liste = [
    b('a1', '400', '90'), // en yüksek
    b('a2', '390', '85'),
    b('y1', '380', '80'),
    b('d1', '370', '75'), // kontenjan dışı
  ];

  it('ilk N asil, sonraki M yedek, kalanı kontenjan dışı', () => {
    const o = asilYedekOner(liste, 'kurumlararasi', 2, 1);
    const bul = (id) => o.find((x) => x.id === id);
    expect(bul('a1')).toMatchObject({ degerlendirme: 'uygun_asil', degerlendirmeSira: '1' });
    expect(bul('a2')).toMatchObject({ degerlendirme: 'uygun_asil', degerlendirmeSira: '2' });
    expect(bul('y1')).toMatchObject({ degerlendirme: 'uygun_yedek', degerlendirmeSira: '1' });
    expect(bul('d1')).toMatchObject({ degerlendirme: 'uygun_degil', degerlendirmeSira: '' });
  });

  it('sınıfı değerlendirmeye yazar', () => {
    const o = asilYedekOner(liste, 'kurumlararasi', 1, 0);
    expect(o.find((x) => x.id === 'a1').degerlendirmeSinif).toBe('2');
  });

  it('kontenjan sınıf BAŞINA uygulanır', () => {
    const karisik = [
      b('s2-1', '400', '90', '2'),
      b('s2-2', '390', '85', '2'),
      b('s3-1', '300', '60', '3'),
      b('s3-2', '290', '55', '3'),
    ];
    const o = asilYedekOner(karisik, 'kurumlararasi', 1, 1);
    const bul = (id) => o.find((x) => x.id === id);
    // Her sınıfta 1 asil + 1 yedek — 3. sınıfın puanı düşük olsa da kendi
    // grubunda birinci olduğu için asil.
    expect(bul('s2-1').degerlendirme).toBe('uygun_asil');
    expect(bul('s2-2').degerlendirme).toBe('uygun_yedek');
    expect(bul('s3-1').degerlendirme).toBe('uygun_asil');
    expect(bul('s3-2').degerlendirme).toBe('uygun_yedek');
  });

  it('puansız başvuruya ÖNERİ ÜRETMEZ (dokunulmaz)', () => {
    const o = asilYedekOner([b('puansız', '', ''), b('a1', '400', '90')], 'kurumlararasi', 5, 5);
    expect(o.find((x) => x.id === 'puansız').degerlendirme).toBe('');
    expect(o.find((x) => x.id === 'a1').degerlendirme).toBe('uygun_asil');
  });

  it('kontenjan 0 ise herkes kontenjan dışı olur', () => {
    const o = asilYedekOner(liste, 'kurumlararasi', 0, 0);
    expect(o.every((x) => x.degerlendirme === 'uygun_degil')).toBe(true);
  });

  it('kontenjan başvurudan fazlaysa taşma olmaz', () => {
    const o = asilYedekOner(liste, 'kurumlararasi', 10, 10);
    expect(o.filter((x) => x.degerlendirme === 'uygun_asil')).toHaveLength(4);
    expect(o.filter((x) => x.degerlendirme === 'uygun_yedek')).toHaveLength(0);
  });

  it('geçersiz kontenjan girdisini 0 sayar', () => {
    const o = asilYedekOner(liste, 'kurumlararasi', 'abc', -3);
    expect(o.every((x) => x.degerlendirme === 'uygun_degil')).toBe(true);
  });
});
