// Taban puan: program eşleştirme + karşılaştırma.
//
// Bu iki işlev bir başvurunun "şartı karşılıyor mu" sorusunu cevaplıyor.
// Yanlış program eşleşmesi ya da yanlış sayı okuma, doğrudan bir öğrencinin
// haksız yere elenmesi demek — bu yüzden özellikle Türkçe harfler, kısaltmalar
// ve eksik veri yolları test altında.
import { describe, it, expect } from 'vitest';
import { programAnahtari, tabanKaydiBul, tabanKarsilastir } from '../lib/taban-puan.js';

describe('programAnahtari', () => {
  it('Türkçe büyük harf yazımını da aynı anahtara indirir', () => {
    // JS'in toLowerCase'i "GIDA"yı "gida" yapar ama "Gıda"yı "gıda" bırakır;
    // Türkçe duyarlı olmayan bir küçültme bu ikisini AYRI sayardı.
    expect(programAnahtari('GIDA MÜHENDİSLİĞİ')).toBe(programAnahtari('Gıda Mühendisliği'));
    expect(programAnahtari('İNŞAAT MÜHENDİSLİĞİ')).toBe(programAnahtari('İnşaat Mühendisliği'));
  });

  it('"Bölümü" / "Programı" eklerini atar', () => {
    expect(programAnahtari('Gıda Mühendisliği Bölümü')).toBe(programAnahtari('Gıda Mühendisliği'));
    expect(programAnahtari('Makine Mühendisliği Programı')).toBe(
      programAnahtari('Makine Mühendisliği')
    );
  });

  it('noktalama ve boşluk farkını yok sayar', () => {
    expect(programAnahtari('Gıda  Müh.')).toBe(programAnahtari('gıda müh'));
  });

  it('boş girdide boş anahtar üretir', () => {
    expect(programAnahtari('')).toBe('');
    expect(programAnahtari(null)).toBe('');
  });
});

describe('tabanKaydiBul', () => {
  const kayitlar = [
    { id: '1', ad: 'GIDA MÜHENDİSLİĞİ', taban: '245,318' },
    { id: '2', ad: 'İNŞAAT MÜHENDİSLİĞİ', taban: '260,112' },
    { id: '3', ad: 'Bilgisayar Mühendisliği', taban: '312,004' },
  ];

  it('birebir eşleşmeyi bulur (yazım farkına rağmen)', () => {
    expect(tabanKaydiBul(kayitlar, 'Gıda Mühendisliği Bölümü').id).toBe('1');
    expect(tabanKaydiBul(kayitlar, 'inşaat mühendisliği').id).toBe('2');
  });

  it('kısaltmayı kapsama ile eşleştirir', () => {
    expect(tabanKaydiBul([{ id: '9', ad: 'Gıda Müh.', taban: '1' }], 'Gıda Mühendisliği').id).toBe(
      '9'
    );
  });

  it('kapsama BİRDEN ÇOK adaya uyuyorsa hiçbirini seçmez', () => {
    // "Makine" hem "Makine Mühendisliği" hem "Makine ve İmalat" içinde geçer.
    // Yanlış eşleşme = yanlış taban puanla değerlendirme; belirsizlikte
    // eşleştirme yapılmaz.
    const iki = [
      { id: 'a', ad: 'Makine Mühendisliği', taban: '1' },
      { id: 'b', ad: 'Makine ve İmalat Mühendisliği', taban: '2' },
    ];
    expect(tabanKaydiBul(iki, 'Makine')).toBe(null);
  });

  it('bulunamayanda null döner', () => {
    expect(tabanKaydiBul(kayitlar, 'Tarih')).toBe(null);
    expect(tabanKaydiBul(kayitlar, '')).toBe(null);
    expect(tabanKaydiBul(null, 'Gıda Mühendisliği')).toBe(null);
  });
});

describe('tabanKarsilastir', () => {
  it('yüksek puanı uygun sayar', () => {
    expect(tabanKarsilastir('260,5', '245,318').durum).toBe('uygun');
  });

  it('EŞİT puan şartı KARŞILAR', () => {
    // Yönetmelikteki ifade "taban puandan az olmamak" — sınırdaki aday elenmez.
    expect(tabanKarsilastir('245,318', '245,318').durum).toBe('uygun');
    expect(tabanKarsilastir('245.318', '245,318').durum).toBe('uygun');
  });

  it('düşük puanı uygun saymaz', () => {
    const k = tabanKarsilastir('240', '245,318');
    expect(k.durum).toBe('uygun_degil');
    expect(k.fark).toBeCloseTo(-5.318, 3);
  });

  it('eksik veride BELİRSİZ döner — sıfır varsaymaz', () => {
    // Puanı okunamayan adayı "0 puanlı" saymak, başvuruyu sessizce elemek olurdu.
    expect(tabanKarsilastir('', '245').durum).toBe('belirsiz');
    expect(tabanKarsilastir('245', '').durum).toBe('belirsiz');
    expect(tabanKarsilastir('abc', '245').durum).toBe('belirsiz');
    expect(tabanKarsilastir(null, null).durum).toBe('belirsiz');
  });

  it('kayan nokta gürültüsü sınırda karar değiştirmez', () => {
    // 0,1 + 0,2 aritmetiği üç haneli puanlarda 1e-13 mertebesinde artık bırakır.
    expect(tabanKarsilastir('412,3', '412,30000000000005').durum).toBe('uygun');
  });
});
