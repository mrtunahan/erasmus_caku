import { describe, it, expect } from 'vitest';
import {
  slotBirlestir,
  slotDersCikar,
  slotDersEkle,
  slotDersGuncelle,
  slotDersSayisi,
  slotDersVarMi,
  slotDersleri,
  slotEkDersler,
} from '../lib/ders-slot.js';

const birinci = {
  courseCode: 'KML312',
  courseName: 'Kimya',
  instructor: 'Ayşe Yılmaz',
  classroom: 'D-101',
  sinif: 3,
};
const ders = (kod, o) => ({ courseCode: kod, ...(o || {}) });

describe('slotDersleri — okuma', () => {
  it('tek dersli slotu okur', () => {
    const d = slotDersleri({ ...birinci });
    expect(d).toHaveLength(1);
    expect(d[0].courseCode).toBe('KML312');
  });

  it('boş slot boş liste verir', () => {
    expect(slotDersleri(null)).toEqual([]);
    expect(slotDersleri({})).toEqual([]);
    expect(slotDersleri({ courseCode: '' })).toEqual([]);
  });

  it('ESKİ `ikinci` biçimi okunur (veri taşımaya gerek yok)', () => {
    const d = slotDersleri({
      ...birinci,
      ikinci: { courseCode: 'TLK543', instructor: 'Mehmet Demir', classroom: 'D-205' },
    });
    expect(d.map((x) => x.courseCode)).toEqual(['KML312', 'TLK543']);
    expect(d[1].instructor).toBe('Mehmet Demir');
    expect(d[1].classroom).toBe('D-205');
  });

  it('eski biçimde boş alanlar birinciden devralınır', () => {
    const d = slotDersleri({ ...birinci, ikinci: { courseCode: 'TLK543' } });
    expect(d[1].instructor).toBe('Ayşe Yılmaz');
    expect(d[1].classroom).toBe('D-101');
    expect(d[1].sinif).toBe(3);
  });

  it('ÜÇ VE DAHA FAZLA ders okunur', () => {
    const d = slotDersleri({
      ...birinci,
      dersler: [
        ders('TLK543', { instructor: 'Mehmet Demir', classroom: 'D-205' }),
        ders('FZK101', { instructor: 'Zeynep Ak', classroom: 'F-3' }),
        ders('MAT201', { instructor: 'Can Su', classroom: 'M-1' }),
      ],
    });
    expect(d.map((x) => x.courseCode)).toEqual(['KML312', 'TLK543', 'FZK101', 'MAT201']);
    expect(d.map((x) => x.classroom)).toEqual(['D-101', 'D-205', 'F-3', 'M-1']);
    expect(slotDersSayisi({ ...birinci, dersler: [ders('A'), ders('B')] })).toBe(3);
  });

  it('kodu olmayan yarım ek kayıt yok sayılır', () => {
    const d = slotDersleri({ ...birinci, dersler: [{ instructor: 'X' }, ders('OK1')] });
    expect(d.map((x) => x.courseCode)).toEqual(['KML312', 'OK1']);
  });

  it('`dersler` varsa eski `ikinci` alanı dikkate ALINMAZ', () => {
    // İki kaynak bir arada durmaz: yeni biçim yazılmışsa o geçerlidir.
    const d = slotDersleri({ ...birinci, dersler: [ders('YENI')], ikinci: ders('ESKI') });
    expect(d.map((x) => x.courseCode)).toEqual(['KML312', 'YENI']);
  });

  it('slotEkDersler yalnız ek dersleri verir', () => {
    expect(slotEkDersler({ ...birinci })).toEqual([]);
    expect(slotEkDersler({ ...birinci, ikinci: ders('X') })).toHaveLength(1);
    expect(slotEkDersler({ ...birinci, dersler: [ders('X'), ders('Y')] })).toHaveLength(2);
  });
});

describe('slotDersVarMi', () => {
  it('slottaki her dersi tarar', () => {
    const s = { ...birinci, dersler: [ders('TLK543'), ders('FZK101')] };
    expect(slotDersVarMi(s, 'KML312')).toBe(true);
    expect(slotDersVarMi(s, 'FZK101')).toBe(true);
    expect(slotDersVarMi(s, 'YOK999')).toBe(false);
    expect(slotDersVarMi(s, '')).toBe(false);
  });
});

describe('slotDersEkle', () => {
  it('boş slota eklenen ders birinci olur', () => {
    const s = slotDersEkle(null, ders('KML312', { classroom: 'D-101' }));
    expect(s.courseCode).toBe('KML312');
    expect(s.dersler).toBeUndefined();
  });

  it('üçüncü ve dördüncü ders eklenebilir', () => {
    let s = { ...birinci };
    s = slotDersEkle(s, ders('TLK543', { classroom: 'D-205' }));
    s = slotDersEkle(s, ders('FZK101', { classroom: 'F-3' }));
    s = slotDersEkle(s, ders('MAT201', { classroom: 'M-1' }));
    expect(slotDersSayisi(s)).toBe(4);
    expect(s.dersler).toHaveLength(3);
  });

  it('eski `ikinci` kaydına ekleme yapılınca yeni biçime geçer', () => {
    const eski = { ...birinci, ikinci: ders('TLK543', { classroom: 'D-205' }) };
    const s = slotDersEkle(eski, ders('FZK101'));
    expect(s.ikinci).toBeUndefined();
    expect(s.dersler.map((d) => d.courseCode)).toEqual(['TLK543', 'FZK101']);
    expect(slotDersSayisi(s)).toBe(3);
  });

  it('girdi slotu DEĞİŞTİRİLMEZ', () => {
    const s = { ...birinci };
    slotDersEkle(s, ders('YENI'));
    expect(s.dersler).toBeUndefined();
  });

  it('kodsuz ders eklenmez', () => {
    const s = { ...birinci };
    expect(slotDersEkle(s, { instructor: 'X' })).toBe(s);
  });
});

describe('slotDersCikar', () => {
  const uclu = { ...birinci, dersler: [ders('TLK543'), ders('FZK101')] };

  it('ortadaki dersi çıkarır', () => {
    const s = slotDersCikar(uclu, 1);
    expect(slotDersleri(s).map((d) => d.courseCode)).toEqual(['KML312', 'FZK101']);
  });

  it('BİRİNCİ ders çıkarılınca sıradaki birinciliğe geçer', () => {
    const s = slotDersCikar(uclu, 0);
    expect(s.courseCode).toBe('TLK543');
    expect(slotDersleri(s).map((d) => d.courseCode)).toEqual(['TLK543', 'FZK101']);
  });

  it('son ders de çıkarılınca slot null olur (hücre boşalır)', () => {
    expect(slotDersCikar({ ...birinci }, 0)).toBe(null);
  });

  it('geçersiz indekste slot değişmez', () => {
    expect(slotDersCikar(uclu, 9)).toBe(uclu);
    expect(slotDersCikar(uclu, -1)).toBe(uclu);
  });

  it('iki dersten biri çıkınca `dersler` alanı temizlenir', () => {
    const iki = { ...birinci, dersler: [ders('TLK543')] };
    const s = slotDersCikar(iki, 1);
    expect(s.dersler).toBeUndefined();
    expect(slotDersSayisi(s)).toBe(1);
  });
});

describe('slotDersGuncelle', () => {
  it('yalnız hedef dersin dersliğini değiştirir', () => {
    const s0 = { ...birinci, dersler: [ders('TLK543', { classroom: 'D-205' })] };
    const s = slotDersGuncelle(s0, 1, { classroom: 'Z-9' });
    const d = slotDersleri(s);
    expect(d[0].classroom).toBe('D-101');
    expect(d[1].classroom).toBe('Z-9');
  });

  it('birinci dersin dersliği ek dersi etkilemez', () => {
    const s0 = { ...birinci, dersler: [ders('TLK543', { classroom: 'D-205' })] };
    const s = slotDersGuncelle(s0, 0, { classroom: 'A-1' });
    const d = slotDersleri(s);
    expect(d[0].classroom).toBe('A-1');
    expect(d[1].classroom).toBe('D-205');
  });

  it('geçersiz indekste slot değişmez', () => {
    const s = { ...birinci };
    expect(slotDersGuncelle(s, 5, { classroom: 'X' })).toBe(s);
  });
});

describe('slotBirlestir — çıktı', () => {
  it('tek ders olduğu gibi kalır', () => {
    const k = slotBirlestir({ ...birinci });
    expect(k.courseCode).toBe('KML312');
    expect(k.instructor).toBe('Ayşe Yılmaz');
    expect(k.classroom).toBe('D-101');
    expect(k.sinif).toBe(3);
  });

  it('ÜÇ dersin kodu, hocası ve dersliği sırayla yazılır', () => {
    const k = slotBirlestir({
      ...birinci,
      dersler: [
        ders('TLK543', { courseName: 'Türk Dili', instructor: 'Mehmet Demir', classroom: 'D-205' }),
        ders('FZK101', { courseName: 'Fizik', instructor: 'Zeynep Ak', classroom: 'F-3' }),
      ],
    });
    expect(k.courseCode).toBe('KML312 / TLK543 / FZK101');
    expect(k.instructor).toBe('Ayşe Yılmaz / Mehmet Demir / Zeynep Ak');
    expect(k.classroom).toBe('D-101 / D-205 / F-3');
    expect(k.courseName).toBe('Kimya / Türk Dili / Fizik');
  });

  it('aynı hoca/derslik tekrar yazılmaz', () => {
    const k = slotBirlestir({
      ...birinci,
      dersler: [ders('TLK543', { instructor: 'Ayşe Yılmaz', classroom: 'D-101' })],
    });
    expect(k.instructor).toBe('Ayşe Yılmaz');
    expect(k.classroom).toBe('D-101');
  });

  it('ek bağlam alanları karta eklenir', () => {
    const k = slotBirlestir({ ...birinci }, { deptName: 'Kimya', year: '3' });
    expect(k.deptName).toBe('Kimya');
    expect(k.year).toBe('3');
  });

  it('boş slotta çökmez', () => {
    expect(slotBirlestir(null).courseCode).toBe('');
  });
});
