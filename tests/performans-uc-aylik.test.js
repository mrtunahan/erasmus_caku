import { describe, it, expect } from 'vitest';
import {
  satirAnahtari,
  satirDegerleri,
  yeniEslemeler,
  eslemeHaritasi,
  eslemeKimligi,
} from '../lib/performans-uc-aylik.js';

const gostergeler = [
  { id: 'g1', ad: 'Yayın Sayısı (SCI)' },
  { id: 'g2', ad: 'Proje Sayısı' },
];
const degerler = (g) => (g.id === 'g1' ? [1, 2, 3] : [4, 5, 6]);

describe('üç aylık şablon eşlemesi', () => {
  it('ad anahtarı şablon motoruyla aynı biçimde normalleşir', () => {
    expect(satirAnahtari('Yayın  Sayısı (SCI)')).toBe('yayın sayısı scı');
    expect(satirAnahtari('Ar&amp;Ge Projesi')).toBe('arge projesi');
  });

  it('kalıcı eşleme yeniden adlandırılmış göstergeyi de bulur', () => {
    const esleme = { 'sci yayın adedi': 'g1' };
    const v = satirDegerleri(gostergeler, esleme, degerler);
    expect(v['sci yayın adedi']).toEqual([1, 2, 3]);
    expect(v['proje sayısı']).toEqual([4, 5, 6]);
  });

  it('eşleme ad eşleşmesini ezer', () => {
    const v = satirDegerleri(gostergeler, { 'proje sayısı': 'g1' }, degerler);
    expect(v['proje sayısı']).toEqual([1, 2, 3]);
  });

  it('ad ile eşleşen satırlar ilk çıktıda eşlemeye yazılır, mevcutlar tekrar yazılmaz', () => {
    const yeni = yeniEslemeler(['Yayın Sayısı (SCI)', 'Proje Sayısı'], gostergeler, {
      'proje sayısı': 'g2',
    });
    expect(yeni).toEqual([
      { anahtar: 'yayın sayısı scı', satir: 'Yayın Sayısı (SCI)', gostergeId: 'g1' },
    ]);
  });

  it('kayıt listesi haritaya, anahtar belge kimliğine çevrilir', () => {
    expect(eslemeHaritasi([{ anahtar: 'a b', gostergeId: 'g1' }, { anahtar: '' }])).toEqual({
      'a b': 'g1',
    });
    expect(eslemeKimligi('yayın sayısı scı')).toBe('m_yayın_sayısı_scı');
  });
});
