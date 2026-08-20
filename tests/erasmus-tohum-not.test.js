// Kayda geçmiş sahte notu gerçeğinden ayırmak.
//
// Canlıda 10 öğrencinin dönüş eşleştirmelerinde not duruyor. Bir kısmı
// "Hızlı Doldur"un yazdığı sabitler ('A' / 'Muaf'), bir kısmı akademisyenin
// elle girdiği gerçek notlar olabilir. İkisi de AYNI alanlarda durur;
// yalnız değerler ayırır.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { notDegerleri, tohumKokusu, notlariBosalt } = require('../server/lib/erasmus-tohum-not.js');

describe('notDegerleri', () => {
  it('hem tekil hem ders bazlı alanları toplar', () => {
    const d = notDegerleri({
      hostGrade: 'A',
      homeGrade: 'Muaf',
      hostGrades: { 0: 'B1', 1: '' },
      homeGrades: { 0: 'CC' },
    });
    expect(d.map((x) => x.alan)).toEqual([
      'hostGrade',
      'homeGrade',
      'hostGrades[0]',
      'homeGrades[0]',
    ]);
    expect(d.find((x) => x.alan === 'hostGrades[0]').taraf).toBe('host');
    expect(d.find((x) => x.alan === 'homeGrades[0]').taraf).toBe('home');
  });

  it('boş dizge ve yokluk sayılmaz', () => {
    expect(notDegerleri({ hostGrade: '', homeGrade: '   ', hostGrades: {} })).toEqual([]);
    expect(notDegerleri(null)).toEqual([]);
  });
});

describe('tohumKokusu', () => {
  it('notsuz eşleştirme boştur', () => {
    expect(tohumKokusu({ id: 'r1' })).toBe('bos');
    expect(tohumKokusu({ hostGrade: '', homeGrades: {} })).toBe('bos');
  });

  it("saf 'A'/'Muaf' tohumdur", () => {
    expect(tohumKokusu({ hostGrade: 'A', homeGrade: 'Muaf' })).toBe('tohum');
    expect(tohumKokusu({ hostGrades: { 0: 'A', 1: 'A' }, homeGrades: { 0: 'Muaf' } })).toBe(
      'tohum'
    );
    // Yalnız bir taraf yazılmış olabilir (addMatch eskiden homeGrade koyuyordu).
    expect(tohumKokusu({ homeGrade: 'Muaf' })).toBe('tohum');
  });

  it('boşluk ve büyük/küçük harf farkı tohumu gizlemez', () => {
    expect(tohumKokusu({ hostGrade: ' a ', homeGrade: 'MUAF' })).toBe('tohum');
    expect(tohumKokusu({ homeGrade: 'muaf' })).toBe('tohum');
  });

  it('gerçek harf notu insan elidir — KORUNUR', () => {
    expect(tohumKokusu({ hostGrade: 'B1', homeGrade: 'Muaf' })).toBe('insan');
    expect(tohumKokusu({ hostGrade: 'A', homeGrade: 'BA' })).toBe('insan');
    expect(tohumKokusu({ hostGrades: { 0: 'A', 1: 'C2' }, homeGrades: { 0: 'Muaf' } })).toBe(
      'insan'
    );
  });

  it('tek bir farklı değer bütün eşleştirmeyi korur', () => {
    // Kararsızsa dokunma: yanlış silinen gerçek not geri gelmez.
    const m = { hostGrades: { 0: 'A', 1: 'A', 2: 'A', 3: 'BB' }, homeGrades: { 0: 'Muaf' } };
    expect(tohumKokusu(m)).toBe('insan');
  });

  it("tarafı karışmış 'Muaf' tohum sayılmaz", () => {
    // Karşı kurumdan 'Muaf' gelmez; bu insan girdisidir.
    expect(tohumKokusu({ hostGrade: 'Muaf' })).toBe('insan');
  });
});

describe('notlariBosalt', () => {
  it('yalnız not alanlarını düşürür', () => {
    const m = {
      id: 'r1',
      hostCourses: [{ name: 'Fizik' }],
      hostGrade: 'A',
      homeGrade: 'Muaf',
      hostGrades: { 0: 'A' },
      homeGrades: { 0: 'Muaf' },
      status: 'approved',
    };
    expect(notlariBosalt(m)).toEqual({
      id: 'r1',
      hostCourses: [{ name: 'Fizik' }],
      status: 'approved',
    });
  });

  it('özgün nesneyi değiştirmez', () => {
    const m = { id: 'r1', hostGrade: 'A' };
    notlariBosalt(m);
    expect(m.hostGrade).toBe('A');
  });
});
