// Not dönüşümü — karşı kurumun notundan ÇAKÜ harfine.
//
// Bu hesabın çıktısı öğrencinin TRANSKRİPTİNE giriyor. Sessiz bir yuvarlama ya
// da "en yakın satır" tahmini, bir öğrenciye hak etmediği (ya da hak ettiğinden
// düşük) bir harf yazar. O yüzden belirsizliğin boş dönmesi test altında.
import { describe, it, expect } from 'vitest';
import {
  notNormalize,
  notSayiOku,
  kurumAnahtari,
  notCevir,
  notTablosuDogrula,
  notGecerMi,
  notlariCevir,
} from '../lib/not-donusum.js';

const HARF_TABLO = {
  tur: 'harf',
  satirlar: [
    { kaynak: 'AA', caku: 'AA' },
    { kaynak: 'BA', caku: 'BA' },
    { kaynak: 'CC', caku: 'CC' },
    { kaynak: 'FF', caku: 'FF' },
  ],
};

const SAYISAL_TABLO = {
  tur: 'sayisal',
  satirlar: [
    { min: 90, max: 100, caku: 'AA' },
    { min: 85, max: 89, caku: 'BA' },
    { min: 80, max: 84, caku: 'BB' },
    { min: 60, max: 79, caku: 'CC' },
    { min: 0, max: 59, caku: 'FF' },
  ],
};

describe('notNormalize', () => {
  it('boşluk ve büyük/küçük harf farkını siler', () => {
    expect(notNormalize(' ba ')).toBe('BA');
    expect(notNormalize('aa')).toBe('AA');
  });
  it('boş girdide boş döner', () => {
    expect(notNormalize(null)).toBe('');
  });
});

describe('notSayiOku', () => {
  it('tam sayı, ondalık ve virgüllü yazımı okur', () => {
    expect(notSayiOku('85')).toBe(85);
    expect(notSayiOku('85,5')).toBe(85.5);
    expect(notSayiOku('3.75')).toBe(3.75);
  });
  it('"85/100" yazımında PAYI alır', () => {
    expect(notSayiOku('85/100')).toBe(85);
  });
  it('okunamayanda null döner — sıfır varsaymaz', () => {
    expect(notSayiOku('AA')).toBe(null);
    expect(notSayiOku('')).toBe(null);
    expect(notSayiOku(null)).toBe(null);
  });
});

describe('kurumAnahtari', () => {
  it('aynı kurumun farklı yazımlarını tek anahtara indirger', () => {
    expect(kurumAnahtari('Bursa Uludağ Üniversitesi')).toBe(
      kurumAnahtari('BURSA ULUDAĞ ÜNİVERSİTESİ')
    );
    expect(kurumAnahtari('Bursa Uludağ Üniv.')).toBe(kurumAnahtari('Bursa Uludağ Üniversitesi'));
  });
  it('farklı kurumları ayırır', () => {
    expect(kurumAnahtari('Ege Üniversitesi')).not.toBe(kurumAnahtari('Eğe Üniversitesi X'));
  });
});

describe('notCevir — harf tablosu', () => {
  it('birebir eşleşmeyi çevirir', () => {
    expect(notCevir('AA', HARF_TABLO).cakuNot).toBe('AA');
    expect(notCevir(' cc ', HARF_TABLO).cakuNot).toBe('CC');
  });

  it('tabloda olmayan notu UYDURMAZ', () => {
    const r = notCevir('DD', HARF_TABLO);
    expect(r.cakuNot).toBe('');
    expect(r.sebep).toContain('tanımlı değil');
  });

  it('boş notta sebep verir', () => {
    expect(notCevir('', HARF_TABLO).sebep).toContain('okunamadı');
  });

  it('tablo yoksa açıkça söyler', () => {
    expect(notCevir('AA', null).sebep).toContain('onaylı not dönüşüm tablosu yok');
    expect(notCevir('AA', { tur: 'harf', satirlar: [] }).cakuNot).toBe('');
  });
});

describe('notCevir — sayısal tablo', () => {
  it('aralığa göre çevirir (sınırlar DAHİL)', () => {
    expect(notCevir('95', SAYISAL_TABLO).cakuNot).toBe('AA');
    expect(notCevir('90', SAYISAL_TABLO).cakuNot).toBe('AA');
    expect(notCevir('89', SAYISAL_TABLO).cakuNot).toBe('BA');
    expect(notCevir('0', SAYISAL_TABLO).cakuNot).toBe('FF');
  });

  it('ondalık notu doğru aralığa koyar', () => {
    expect(notCevir('84', SAYISAL_TABLO).cakuNot).toBe('BB');
    expect(
      notCevir('79,5', { tur: 'sayisal', satirlar: [{ min: 60, max: 79.99, caku: 'CC' }] }).cakuNot
    ).toBe('CC');
  });

  it('SINIRLAR ARASI ondalık nota harf uydurmaz', () => {
    // Tablo "80-84" ve "85-89" diyorsa 84,5 gerçekten tanımsızdır. En yakına
    // yuvarlamak, öğrenciye hak etmediği harfi yazmak olurdu; boşluğun kendisi
    // tablo onaylanırken uyarı olarak çıkar (notTablosuDogrula).
    const r = notCevir('84,5', SAYISAL_TABLO);
    expect(r.cakuNot).toBe('');
    expect(r.sebep).toContain('hiçbir aralığa girmiyor');
  });

  it('aralık dışını UYDURMAZ (en yakına yuvarlamaz)', () => {
    const r = notCevir('105', SAYISAL_TABLO);
    expect(r.cakuNot).toBe('');
    expect(r.sebep).toContain('hiçbir aralığa girmiyor');
  });

  it('sayısal tabloya harf not gelirse çevirmez', () => {
    expect(notCevir('AA', SAYISAL_TABLO).cakuNot).toBe('');
  });

  it('çakışan aralıkta SESSİZCE İLKİNİ SEÇMEZ', () => {
    const bozuk = {
      tur: 'sayisal',
      satirlar: [
        { min: 80, max: 90, caku: 'BA' },
        { min: 85, max: 95, caku: 'AA' },
      ],
    };
    const r = notCevir('87', bozuk);
    expect(r.cakuNot).toBe('');
    expect(r.sebep).toContain('birden çok aralığa');
  });
});

describe('notTablosuDogrula', () => {
  it('doğru tabloyu geçerli sayar', () => {
    expect(notTablosuDogrula(HARF_TABLO).gecerli).toBe(true);
    expect(notTablosuDogrula(SAYISAL_TABLO).gecerli).toBe(true);
  });

  it('boş tabloyu reddeder', () => {
    expect(notTablosuDogrula({ tur: 'harf', satirlar: [] }).gecerli).toBe(false);
  });

  it('ÇAKÜ harfi olmayan hedefi yakalar', () => {
    const r = notTablosuDogrula({ tur: 'harf', satirlar: [{ kaynak: 'A', caku: 'A+' }] });
    expect(r.gecerli).toBe(false);
    expect(r.sorunlar.join(' ')).toContain('ÇAKÜ harf notu değil');
  });

  it('çakışan sayısal aralığı yakalar', () => {
    const r = notTablosuDogrula({
      tur: 'sayisal',
      satirlar: [
        { min: 80, max: 90, caku: 'BA' },
        { min: 85, max: 95, caku: 'AA' },
      ],
    });
    expect(r.gecerli).toBe(false);
    expect(r.sorunlar.join(' ')).toContain('çakışıyor');
  });

  it('aralıklar arasındaki BOŞLUĞU yakalar', () => {
    // "84 ile 90 arası tanımsız" — 85 gibi bir not çalışma anında sessizce
    // çevrilemez hâle gelirdi; bunu onay anında söylemek gerekiyor.
    const r = notTablosuDogrula({
      tur: 'sayisal',
      satirlar: [
        { min: 60, max: 84, caku: 'CC' },
        { min: 90, max: 100, caku: 'AA' },
      ],
    });
    expect(r.gecerli).toBe(false);
    expect(r.sorunlar.join(' ')).toContain('boşluk');
  });

  it('bitişik aralıkları boşluk saymaz', () => {
    expect(notTablosuDogrula(SAYISAL_TABLO).gecerli).toBe(true);
  });

  it('ters aralığı yakalar', () => {
    const r = notTablosuDogrula({ tur: 'sayisal', satirlar: [{ min: 90, max: 80, caku: 'AA' }] });
    expect(r.sorunlar.join(' ')).toContain('alt sınır üst sınırdan büyük');
  });

  it('harf tablosunda tekrarlanan kaynağı yakalar', () => {
    const r = notTablosuDogrula({
      tur: 'harf',
      satirlar: [
        { kaynak: 'AA', caku: 'AA' },
        { kaynak: 'aa', caku: 'BA' },
      ],
    });
    expect(r.gecerli).toBe(false);
    expect(r.sorunlar.join(' ')).toContain('birden çok satırda');
  });
});

describe('notGecerMi', () => {
  it('geçer ve kalır harfleri ayırır', () => {
    expect(notGecerMi('AA')).toBe(true);
    expect(notGecerMi('FF')).toBe(false);
    expect(notGecerMi('FD')).toBe(false);
  });

  it('bölümün kendi listesi geçerlidir', () => {
    // DD'yi geçer saymayan bir bölüm.
    expect(notGecerMi('DD', ['AA', 'BA', 'BB', 'CB', 'CC'])).toBe(false);
  });

  it('bilinmeyen notta null döner — "kaldı" DEMEZ', () => {
    expect(notGecerMi('')).toBe(null);
  });
});

describe('notlariCevir', () => {
  it('ders listesini toplu çevirir ve çevrilemeyeni işaretler', () => {
    const r = notlariCevir(
      [
        { anahtar: '0', kaynakNot: '95' },
        { anahtar: '1', kaynakNot: '105' },
      ],
      SAYISAL_TABLO
    );
    expect(r['0'].cakuNot).toBe('AA');
    expect(r['1'].cakuNot).toBe('');
    expect(r['1'].sebep).toBeTruthy();
  });

  it('boş listede boş döner', () => {
    expect(notlariCevir([], SAYISAL_TABLO)).toEqual({});
    expect(notlariCevir(null, SAYISAL_TABLO)).toEqual({});
  });
});
