import { describe, it, expect } from 'vitest';
import { bagliNolar, kapsamNumaralari, numara } from '../server/lib/ogrenci-baglanti.js';

const AYSE_BIL = {
  studentNumber: '2021001',
  departmentId: 'bilgisayar',
  bagliOgrenciNolar: ['2021777'],
};
const AYSE_KIM = {
  studentNumber: '2021777',
  departmentId: 'kimya',
  bagliOgrenciNolar: ['2021001'],
};
const BAGSIZ = { studentNumber: '2022050', departmentId: 'bilgisayar' };
const HEPSI = [AYSE_BIL, AYSE_KIM, BAGSIZ];

describe('numara / bagliNolar', () => {
  it('numarayı iki alandan okur', () => {
    expect(numara({ studentNumber: '1' })).toBe('1');
    expect(numara({ ogrenciNo: '2' })).toBe('2');
    expect(numara(null)).toBe('');
  });

  it('bağlıları tekilleştirir, kendini dışlar', () => {
    expect(bagliNolar({ studentNumber: '1', bagliOgrenciNolar: ['2', '2', '1'] })).toEqual(['2']);
    expect(bagliNolar({})).toEqual([]);
  });
});

describe('kapsamNumaralari', () => {
  it('bağlı iki numarayı da kapsar', () => {
    expect(kapsamNumaralari(HEPSI, '2021001').sort()).toEqual(['2021001', '2021777']);
    expect(kapsamNumaralari(HEPSI, '2021777').sort()).toEqual(['2021001', '2021777']);
  });

  it('bağsız öğrencide yalnız kendi numarası', () => {
    expect(kapsamNumaralari(HEPSI, '2022050')).toEqual(['2022050']);
  });

  it('BAŞKASININ numarası kapsama girmez', () => {
    // Kapsamın genişlemesi bir güvenlik sınırıdır: yalnız bağ verilmiş
    // numaralar eklenir.
    expect(kapsamNumaralari(HEPSI, '2021001')).not.toContain('2022050');
  });

  it('tek yönlü kalmış bağ da izlenir', () => {
    const a = { studentNumber: 'A', bagliOgrenciNolar: ['B'] };
    const b = { studentNumber: 'B' };
    expect(kapsamNumaralari([a, b], 'B').sort()).toEqual(['A', 'B']);
  });

  it('geçişli bağ izlenir', () => {
    const a = { studentNumber: 'A', bagliOgrenciNolar: ['B'] };
    const b = { studentNumber: 'B', bagliOgrenciNolar: ['A', 'C'] };
    const c = { studentNumber: 'C', bagliOgrenciNolar: ['B'] };
    expect(kapsamNumaralari([a, b, c], 'A').sort()).toEqual(['A', 'B', 'C']);
  });

  it('kayıt listesi boşsa bile kendi numarası döner', () => {
    expect(kapsamNumaralari([], '2021001')).toEqual(['2021001']);
    expect(kapsamNumaralari(null, '2021001')).toEqual(['2021001']);
  });

  it('numarasız istekte boş kapsam', () => {
    expect(kapsamNumaralari(HEPSI, '')).toEqual([]);
  });
});
