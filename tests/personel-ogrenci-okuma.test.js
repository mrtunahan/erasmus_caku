import { describe, it, expect } from 'vitest';
import { yetkiAlani, bolumAlanda } from '../server/lib/yetki-alani.js';
import { kapsamKarari, temelAlanlar } from '../server/lib/personel-ogrenci-okuma.js';

const BOLUMLER = [
  { _docId: 'bilgisayar', facultyId: 'muh' },
  { _docId: 'makine', facultyId: 'muh' },
  { _docId: 'kimya', facultyId: 'fen' },
];
const alan = (profil, flags) =>
  yetkiAlani({
    user: { role: 'professor' },
    flags: flags || {},
    profil,
    bolumler: BOLUMLER,
    okuma: true,
  });

describe('personelin öğrenci verisi okuması', () => {
  const makineci = kapsamKarari({ alan: alan({ departmentId: 'makine' }), alanda: bolumAlanda });
  it('yalnız kendi bölümünün (ve ÇAP bölümünün) öğrencisi kapsamda', () => {
    expect(makineci({ departmentId: 'makine' })).toBe(true);
    expect(makineci({ departmentId: 'kimya', additionalDepartments: ['makine'] })).toBe(true);
    expect(makineci({ departmentId: 'kimya' })).toBe(false);
  });
  it('fakülte yetkilisi fakültesini, tam erişim herkesi görür', () => {
    const fy = kapsamKarari({
      alan: alan({ departmentId: 'bilgisayar', facultyId: 'muh' }, { facManager: true }),
      alanda: bolumAlanda,
    });
    expect(fy({ departmentId: 'makine' })).toBe(true);
    expect(fy({ departmentId: 'kimya' })).toBe(false);
    expect(kapsamKarari({ tamErisim: true })({ departmentId: 'kimya' })).toBe(true);
  });
  it('memurun atandığı bölüm de kapsamda; bölümsüz eski kayıt Bilgisayar sayılır', () => {
    const memur = kapsamKarari({
      alan: alan({ departmentId: 'makine' }),
      alanda: bolumAlanda,
      ekBolumler: ['kimya'],
    });
    expect(memur({ departmentId: 'kimya' })).toBe(true);
    expect(makineci({ departmentId: '' })).toBe(false);
    const bilgisayarci = kapsamKarari({
      alan: alan({ departmentId: 'bilgisayar' }),
      alanda: bolumAlanda,
    });
    expect(bilgisayarci({})).toBe(true);
  });
  it('kapsam dışı kayıt temel alanlara iner (kişisel veri düşer)', () => {
    const t = temelAlanlar({
      studentNumber: '1',
      firstName: 'A',
      departmentId: 'kimya',
      tcKimlikNo: '123',
      email: 'x@y',
      phone: '5',
      outgoingMatches: [{}],
      bagliOgrenciNolar: ['2'],
    });
    expect(t).toEqual({
      studentNumber: '1',
      firstName: 'A',
      departmentId: 'kimya',
      bagliOgrenciNolar: ['2'],
    });
  });
});
