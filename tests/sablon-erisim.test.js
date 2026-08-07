import { describe, it, expect } from 'vitest';
import {
  canManageTemplate,
  canViewTemplate,
  STUDENT_TEMPLATE_MODULES,
} from '../server/lib/sablon-erisim.js';

// bölüm → fakülte
const MAP = {
  bilgisayar: 'muhendislik',
  makine: 'muhendislik',
  fizik: 'fen',
};

const ogrenci = (departmentId) => ({ isStudent: true, departmentId });
const bolumYetkilisi = (departmentId) => ({ isDeptManager: true, departmentId });
const fakYetkilisi = (facultyId) => ({ isFacultyManager: true, facultyId });
const uniYetkilisi = () => ({ isUniversityAdmin: true });
const akademisyen = (departmentId, facultyId) => ({ departmentId, facultyId });

const sablon = (o) => ({ module: 'muafiyet', ...o });

describe('canManageTemplate', () => {
  it('üniversite yetkilisi her şablonu yönetir', () => {
    expect(
      canManageTemplate(uniYetkilisi(), sablon({ scope: 'department', departmentId: 'fizik' }), MAP)
    ).toBe(true);
  });

  it('fakülte yetkilisi kendi fakültesindeki bölümün şablonunu yönetir', () => {
    const s = fakYetkilisi('muhendislik');
    expect(canManageTemplate(s, sablon({ scope: 'department', departmentId: 'makine' }), MAP)).toBe(
      true
    );
    expect(canManageTemplate(s, sablon({ scope: 'department', departmentId: 'fizik' }), MAP)).toBe(
      false
    );
  });

  it('bölüm yetkilisi yalnız kendi bölümünün şablonunu yönetir', () => {
    const s = bolumYetkilisi('bilgisayar');
    expect(
      canManageTemplate(s, sablon({ scope: 'department', departmentId: 'bilgisayar' }), MAP)
    ).toBe(true);
    expect(canManageTemplate(s, sablon({ scope: 'department', departmentId: 'makine' }), MAP)).toBe(
      false
    );
    expect(canManageTemplate(s, sablon({ scope: 'university' }), MAP)).toBe(false);
  });

  it('boş kimlikler eşleşme saymaz (bölümsüz yetkili ↔ bölümsüz şablon)', () => {
    expect(
      canManageTemplate(bolumYetkilisi(''), sablon({ scope: 'department', departmentId: '' }), MAP)
    ).toBe(false);
    expect(
      canManageTemplate(fakYetkilisi(''), sablon({ scope: 'department', departmentId: 'yok' }), MAP)
    ).toBe(false);
  });

  it('öğrenci hiçbir şablonu yönetemez', () => {
    expect(
      canManageTemplate(
        ogrenci('bilgisayar'),
        sablon({ scope: 'department', departmentId: 'bilgisayar' }),
        MAP
      )
    ).toBe(false);
  });
});

describe('canViewTemplate — öğrenci', () => {
  it('kendi bölümünün muafiyet şablonunu indirir', () => {
    expect(
      canViewTemplate(
        ogrenci('bilgisayar'),
        sablon({ scope: 'department', departmentId: 'bilgisayar' }),
        MAP
      )
    ).toBe(true);
  });

  it('kendi fakültesinin muafiyet şablonunu indirir', () => {
    expect(
      canViewTemplate(
        ogrenci('bilgisayar'),
        sablon({ scope: 'faculty', facultyId: 'muhendislik' }),
        MAP
      )
    ).toBe(true);
  });

  it('BAŞKA bölümün şablonunu indiremez', () => {
    expect(
      canViewTemplate(
        ogrenci('bilgisayar'),
        sablon({ scope: 'department', departmentId: 'fizik' }),
        MAP
      )
    ).toBe(false);
  });

  it('BAŞKA fakültenin şablonunu indiremez', () => {
    expect(
      canViewTemplate(ogrenci('bilgisayar'), sablon({ scope: 'faculty', facultyId: 'fen' }), MAP)
    ).toBe(false);
  });

  it('izin verilmeyen modülün şablonunu kendi bölümünde bile indiremez', () => {
    expect(
      canViewTemplate(
        ogrenci('bilgisayar'),
        { module: 'performans', scope: 'department', departmentId: 'bilgisayar' },
        MAP
      )
    ).toBe(false);
  });

  it('bölümü çözülemeyen öğrenci bölüm/fakülte şablonu indiremez', () => {
    expect(
      canViewTemplate(ogrenci(''), sablon({ scope: 'department', departmentId: 'bilgisayar' }), MAP)
    ).toBe(false);
    expect(
      canViewTemplate(ogrenci(''), sablon({ scope: 'faculty', facultyId: 'muhendislik' }), MAP)
    ).toBe(false);
  });

  it('üniversite geneli şablon öğrenciye de açıktır (mevcut davranış)', () => {
    expect(canViewTemplate(ogrenci('bilgisayar'), sablon({ scope: 'university' }), MAP)).toBe(true);
    expect(
      canViewTemplate(ogrenci('bilgisayar'), { module: 'performans', scope: 'university' }, MAP)
    ).toBe(true);
  });

  it('muafiyet öğrenci modülleri arasındadır', () => {
    expect(STUDENT_TEMPLATE_MODULES.has('muafiyet')).toBe(true);
  });
});

describe('canViewTemplate — personel', () => {
  it('akademisyen kendi bölümünün şablonunu indirir, başkasınınkini indiremez', () => {
    const s = akademisyen('makine', 'muhendislik');
    expect(canViewTemplate(s, sablon({ scope: 'department', departmentId: 'makine' }), MAP)).toBe(
      true
    );
    expect(canViewTemplate(s, sablon({ scope: 'department', departmentId: 'fizik' }), MAP)).toBe(
      false
    );
  });

  it('akademisyen kendi fakültesinin şablonunu indirir', () => {
    const s = akademisyen('makine', 'muhendislik');
    expect(canViewTemplate(s, sablon({ scope: 'faculty', facultyId: 'muhendislik' }), MAP)).toBe(
      true
    );
    expect(canViewTemplate(s, sablon({ scope: 'faculty', facultyId: 'fen' }), MAP)).toBe(false);
  });

  it('personel için modül kısıtı yoktur (öğrenci kısıtı personele sızmaz)', () => {
    const s = akademisyen('makine', 'muhendislik');
    expect(
      canViewTemplate(s, { module: 'performans', scope: 'department', departmentId: 'makine' }, MAP)
    ).toBe(true);
  });

  it('kimliksiz kullanıcı yalnız üniversite genelini görür', () => {
    expect(canViewTemplate({}, sablon({ scope: 'university' }), MAP)).toBe(true);
    expect(canViewTemplate({}, sablon({ scope: 'department', departmentId: 'makine' }), MAP)).toBe(
      false
    );
    expect(canViewTemplate({}, sablon({ scope: 'faculty', facultyId: 'fen' }), MAP)).toBe(false);
  });
});
