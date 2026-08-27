import { describe, it, expect } from 'vitest';
import {
  dersSecilmisMi,
  kodAnahtari,
  secilenDersIdleri,
  secilenDersKodlari,
} from '../lib/ogrenci-ders-secimi.js';

describe('kodAnahtari', () => {
  it('kasa, boşluk ve noktalama yok sayılır', () => {
    expect(kodAnahtari('MAT 142')).toBe('mat142');
    expect(kodAnahtari('mat-142')).toBe('mat142');
    expect(kodAnahtari('MAT142')).toBe(kodAnahtari('mat142'));
  });

  it("Türkçe 'I' locale'e bırakılmaz", () => {
    // 'BIL101'.toLowerCase('tr') → 'bıl101' olurdu; iki uç farklı normalize
    // ederse aynı ders eşleşmez.
    expect(kodAnahtari('BIL101')).toBe('bil101');
    expect(kodAnahtari('bil101')).toBe('bil101');
    expect(kodAnahtari('BİL101')).toBe('bil101');
  });

  it('boş girdi boş anahtar', () => {
    expect(kodAnahtari('')).toBe('');
    expect(kodAnahtari(null)).toBe('');
    expect(kodAnahtari('---')).toBe('');
  });
});

describe('secilenDersIdleri — iki kaynağın birleşimi', () => {
  it('dönem kayıtlarındaki tüm courseIds toplanır', () => {
    const donemler = [{ courseIds: ['a', 'b'] }, { courseIds: ['c'] }];
    expect(secilenDersIdleri(donemler, null).sort()).toEqual(['a', 'b', 'c']);
  });

  it('eski myCourseIds de eklenir', () => {
    expect(secilenDersIdleri([{ courseIds: ['a'] }], { myCourseIds: ['z'] }).sort()).toEqual([
      'a',
      'z',
    ]);
  });

  it('YALNIZ student_courses varsa da bulunur — asıl hata buydu', () => {
    // Benim Sayfam artık myCourseIds yazmıyor; yalnız eski alana bakan
    // denetim "ders seçmediniz" diyordu.
    expect(secilenDersIdleri([{ courseIds: ['m1'] }], {})).toEqual(['m1']);
    expect(secilenDersIdleri([{ courseIds: ['m1'] }], null)).toEqual(['m1']);
  });

  it('tekrar eden kimlik bir kez sayılır', () => {
    expect(
      secilenDersIdleri([{ courseIds: ['a'] }, { courseIds: ['a'] }], { myCourseIds: ['a'] })
    ).toEqual(['a']);
  });

  it('boş/bozuk girdide çökmez', () => {
    expect(secilenDersIdleri(null, null)).toEqual([]);
    expect(secilenDersIdleri([{}, { courseIds: null }], {})).toEqual([]);
    expect(secilenDersIdleri([{ courseIds: ['', null, ' '] }], {})).toEqual([]);
  });
});

describe('secilenDersKodlari', () => {
  const dersler = [
    { id: 'c1', code: 'MAT142' },
    { id: 'c2', code: 'BIL101' },
    { id: 'c3', code: 'FIZ102' },
    { id: 'c4', code: '' },
  ];

  it('seçili kimliklerin kodlarını verir', () => {
    expect(secilenDersKodlari(['c1', 'c3'], dersler).sort()).toEqual(['fiz102', 'mat142']);
  });

  it('listede olmayan kimlik düşer', () => {
    expect(secilenDersKodlari(['yok'], dersler)).toEqual([]);
  });

  it('kodu olmayan ders düşer', () => {
    expect(secilenDersKodlari(['c4'], dersler)).toEqual([]);
  });

  it('sayı/metin kimlik farkı sorun değil', () => {
    expect(secilenDersKodlari([1], [{ id: 1, code: 'MAT142' }])).toEqual(['mat142']);
    expect(secilenDersKodlari(['1'], [{ id: 1, code: 'MAT142' }])).toEqual(['mat142']);
  });
});

describe('dersSecilmisMi', () => {
  const kodlar = secilenDersKodlari(
    ['c1', 'c2'],
    [
      { id: 'c1', code: 'MAT142' },
      { id: 'c2', code: 'BIL101' },
    ]
  );

  it('seçili dersi bulur (yazım farkına bakmadan)', () => {
    expect(dersSecilmisMi(kodlar, 'MAT142')).toBe(true);
    expect(dersSecilmisMi(kodlar, 'mat 142')).toBe(true);
    expect(dersSecilmisMi(kodlar, 'BIL101')).toBe(true);
  });

  it('seçilmeyen dersi bulmaz', () => {
    expect(dersSecilmisMi(kodlar, 'FIZ102')).toBe(false);
    expect(dersSecilmisMi(kodlar, '')).toBe(false);
    expect(dersSecilmisMi(null, 'MAT142')).toBe(false);
  });
});
