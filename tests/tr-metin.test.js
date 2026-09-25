// Arama kutularının ortak kuralı: Türkçe harf ve ASCII katlama
// (bkz. lib/tr-metin.js). Buradaki her örnek canlıda yaşanan bir aramadır.
import { describe, it, expect } from 'vitest';
import { trAnahtar, trEsit, trIcerir, trKucuk, trSirala } from '../lib/tr-metin.js';

describe('Türkçe küçük harf', () => {
  it('I ve İ doğru küçülür', () => {
    expect(trKucuk('IŞIK')).toBe('ışık');
    expect(trKucuk('İBRAHİM')).toBe('ibrahim');
    // Düz toLowerCase bunu yapamıyordu — hatanın kendisi:
    expect('IŞIK'.toLowerCase()).not.toBe('ışık');
  });
});

describe('arama', () => {
  it('"ışıl" yazan "IŞIL"ı bulur', () => {
    expect(trIcerir('IŞIL YILMAZ', 'ışıl')).toBe(true);
    expect(trIcerir('ışıl yılmaz', 'IŞIL')).toBe(true);
  });

  it('"istatistik" ile "İstatistik" buluşur', () => {
    expect(trIcerir('Temel İstatistik', 'istatistik')).toBe(true);
    expect(trIcerir('temel istatistik', 'İSTATİSTİK')).toBe(true);
  });

  it('Türkçe harf olmadan da aranabilir', () => {
    expect(trIcerir('Öğrenci İşleri', 'ogrenci')).toBe(true);
    expect(trIcerir('Çankırı Karatekin Üniversitesi', 'cankiri')).toBe(true);
    expect(trIcerir('Bilgisayar Mühendisliği', 'muhendis')).toBe(true);
  });

  it('boş arama listeyi kısmaz', () => {
    expect(trIcerir('herhangi bir metin', '')).toBe(true);
    expect(trIcerir('herhangi bir metin', '   ')).toBe(true);
    expect(trIcerir('herhangi bir metin', null)).toBe(true);
  });

  it('ilgisiz arama tutmaz', () => {
    expect(trIcerir('Ayşe Yılmaz', 'mehmet')).toBe(false);
    expect(trIcerir(null, 'mehmet')).toBe(false);
  });

  it('fazla boşluk aramayı bozmaz', () => {
    expect(trIcerir('Ayşe   Yılmaz', 'ayşe yılmaz')).toBe(true);
  });
});

describe('eşitlik ve sıralama', () => {
  it('büyük/küçük ve Türkçe harf farkı eşitliği bozmaz', () => {
    expect(trEsit('İbrahim Öztürk', 'İBRAHİM ÖZTÜRK')).toBe(true);
    expect(trEsit('Ayşe', 'Mehmet')).toBe(false);
    expect(trEsit('', '')).toBe(false); // boş, hiçbir şeye eşit değildir
  });

  it('sıralama Türkçe alfabeye göre', () => {
    const liste = ['Zeynep', 'Çağla', 'Işıl', 'İnci', 'Ali'].sort(trSirala);
    expect(liste[0]).toBe('Ali');
    expect(liste[1]).toBe('Çağla');
    expect(liste.indexOf('Işıl')).toBeLessThan(liste.indexOf('İnci'));
  });

  it('anahtar üretimi', () => {
    expect(trAnahtar('  Öğrenci   İşleri ')).toBe('ogrenci isleri');
  });
});
