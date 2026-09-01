import { describe, it, expect } from 'vitest';
import { kodAnahtari, cakuDersSecenekleri, secenekBul } from '../lib/muafiyet-ders-secenek.js';

const BOLUM = [
  { code: 'BM 201', name: 'Veri Yapıları', akts: '6', bolognaLink: 'https://b/1', donem: 'Güz' },
  { code: 'BM301', name: 'Yapay Zekâ', sinif: 5 },
];
const KATALOG = [
  {
    code: 'bm201',
    name: 'Veri Yapıları',
    akts: '5',
    status: 'Z',
    weeklyContent: 'Diziler, ağaçlar',
  },
  { code: 'BM401', name: 'Bitirme Projesi', akts: '8', status: 'Z', content: 'Proje' },
];

describe('kodAnahtari', () => {
  it('boşluk ve büyük/küçük harf duyarsız', () => {
    expect(kodAnahtari('bm 201')).toBe('BM201');
    expect(kodAnahtari(null)).toBe('');
  });
});

describe('cakuDersSecenekleri', () => {
  it('iki kaynağı kod bazında birleştirir', () => {
    const s = cakuDersSecenekleri(BOLUM, KATALOG);
    expect(s.map((x) => x.code)).toEqual(['BM 201', 'BM301', 'BM401']);
  });

  it('dersin kendi AKTS bilgisi katalogdan önce gelir', () => {
    const s = cakuDersSecenekleri(BOLUM, KATALOG);
    expect(s.find((x) => x.name === 'Veri Yapıları').akts).toBe('6');
  });

  it('eksik alan katalogdan tamamlanır', () => {
    const s = cakuDersSecenekleri([{ code: 'BM201', name: 'Veri Yapıları' }], KATALOG);
    expect(s[0].akts).toBe('5');
    expect(s[0].statu).toBe('Z');
    expect(s[0].content).toBe('Diziler, ağaçlar');
  });

  it('sinif 5 seçmeli sayılır', () => {
    const s = cakuDersSecenekleri(BOLUM, KATALOG);
    expect(s.find((x) => x.code === 'BM301').statu).toBe('S');
  });

  it('katalogda olmayan bölüm dersi listede kalır', () => {
    const s = cakuDersSecenekleri(BOLUM, KATALOG);
    expect(s.some((x) => x.code === 'BM301')).toBe(true);
  });

  it('yalnız katalogda olan ders de listeye girer', () => {
    const s = cakuDersSecenekleri(BOLUM, KATALOG);
    expect(s.some((x) => x.code === 'BM401')).toBe(true);
  });

  it('adsız kayıt listeye girmez', () => {
    const s = cakuDersSecenekleri([{ code: 'X1' }], []);
    expect(s).toEqual([]);
  });

  it('kodsuz ders adıyla ayrışır', () => {
    const s = cakuDersSecenekleri([{ name: 'Seçmeli A' }, { name: 'Seçmeli B' }], []);
    expect(s).toHaveLength(2);
  });

  it('koda göre Türkçe sıralanır', () => {
    const s = cakuDersSecenekleri(
      [
        { code: 'ÇM101', name: 'Çevre' },
        { code: 'AB101', name: 'Alan' },
      ],
      []
    );
    expect(s.map((x) => x.code)).toEqual(['AB101', 'ÇM101']);
  });

  it('her seçeneğin anahtarı vardır', () => {
    const s = cakuDersSecenekleri(BOLUM, KATALOG);
    expect(s[0].key).toBe('BM 201::Veri Yapıları');
  });

  it('boş girdiler çökmez', () => {
    expect(cakuDersSecenekleri(null, null)).toEqual([]);
  });
});

describe('secenekBul', () => {
  it('anahtarla seçenek bulur', () => {
    const s = cakuDersSecenekleri(BOLUM, KATALOG);
    expect(secenekBul(s, 'BM301::Yapay Zekâ').code).toBe('BM301');
  });

  it('bulunamayınca null', () => {
    expect(secenekBul([], 'yok')).toBe(null);
    expect(secenekBul(null, '')).toBe(null);
  });
});
