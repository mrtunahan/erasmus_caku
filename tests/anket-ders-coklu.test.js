import { describe, it, expect } from 'vitest';
import {
  cokDersliMi,
  degerlendirilenKodlar,
  kalanDersSayisi,
  dersKoduGecerliMi,
} from '../lib/anket-ders-coklu.js';

const ALAN = [{ key: 'dersKodu', source: 'courseCode' }];
const COK = {
  infoFields: ALAN,
  linkedCourses: [
    { code: 'BM101', name: 'Programlama' },
    { code: 'BM 203', name: 'Veri Yapıları' },
    { code: 'BM305', name: 'Ağlar' },
  ],
};
const r = (kod) => ({ answers: { dersKodu: kod } });

describe('çok dersli anket', () => {
  it('ders alanı ve en az iki ders bağı gerekir', () => {
    expect(cokDersliMi(COK)).toBe(true);
    expect(cokDersliMi({ ...COK, linkedCourses: COK.linkedCourses.slice(0, 1) })).toBe(false);
    expect(cokDersliMi({ linkedCourses: COK.linkedCourses })).toBe(false);
  });

  it('değerlendirilen dersler düşülür (kod biçimi farkı önemsiz)', () => {
    const y = [r('BM101'), r('bm203')];
    expect([...degerlendirilenKodlar(COK, y)]).toEqual(['BM101', 'BM203']);
    expect(kalanDersSayisi(COK, y)).toBe(1);
    expect(kalanDersSayisi(COK, [r('BM101'), r('BM203'), r('BM305')])).toBe(0);
    expect(kalanDersSayisi({ ...COK, linkedCourses: [] }, [])).toBe(0);
  });

  it('kodsuz bağlı ders kodla denetlenemez ama sayılır', () => {
    const k = { infoFields: ALAN, linkedCourses: [{ code: 'BM101' }, { name: 'Seminer' }] };
    expect(kalanDersSayisi(k, [])).toBe(2);
    expect(kalanDersSayisi(k, [r('BM101'), r('SEM1')])).toBe(0);
    expect(dersKoduGecerliMi(k, 'UYDURMA')).toBe(true);
  });

  it('kod bağlı derslerden olmalı', () => {
    expect(dersKoduGecerliMi(COK, 'bm 305')).toBe(true);
    expect(dersKoduGecerliMi(COK, 'XX999')).toBe(false);
    expect(dersKoduGecerliMi(COK, '')).toBe(false);
    expect(dersKoduGecerliMi({ infoFields: ALAN }, 'XX999')).toBe(true);
  });
});
