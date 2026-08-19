import { describe, it, expect } from 'vitest';
import {
  canManageTemplate,
  canViewTemplate,
  STUDENT_TEMPLATE_DOCTYPES,
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

// Öğrenciye açık olan tek belge: muafiyet / intibak_dilekce
const sablon = (o) => ({ module: 'muafiyet', docType: 'intibak_dilekce', ...o });

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
        {
          module: 'performans',
          docType: 'default',
          scope: 'department',
          departmentId: 'bilgisayar',
        },
        MAP
      )
    ).toBe(false);
  });

  it('AYNI modülün akademisyen belgesini (intibak) indiremez', () => {
    expect(
      canViewTemplate(
        ogrenci('bilgisayar'),
        { module: 'muafiyet', docType: 'intibak', scope: 'department', departmentId: 'bilgisayar' },
        MAP
      )
    ).toBe(false);
  });

  it('belge türü belirtilmemiş muafiyet şablonunu indiremez', () => {
    expect(
      canViewTemplate(
        ogrenci('bilgisayar'),
        { module: 'muafiyet', scope: 'department', departmentId: 'bilgisayar' },
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
      canViewTemplate(
        ogrenci('bilgisayar'),
        { module: 'performans', docType: 'default', scope: 'university' },
        MAP
      )
    ).toBe(true);
  });

  it('öğrenciye açık belge listesi yalnız dilekçeyi içerir', () => {
    expect(STUDENT_TEMPLATE_DOCTYPES.muafiyet.has('intibak_dilekce')).toBe(true);
    expect(STUDENT_TEMPLATE_DOCTYPES.muafiyet.has('intibak')).toBe(false);
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
      canViewTemplate(
        s,
        { module: 'performans', docType: 'default', scope: 'department', departmentId: 'makine' },
        MAP
      )
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

// ── CANLIDA GÖRÜLEN ARIZA ──
// "Şablonu fakülte için yüklüyorum fakat şablon her bölümde yüklü
// görünmüyor." Sebep: personel dalı fakülteyi kullanıcının PROFİLİNDEN
// okuyordu; o alan yalnız fakülte yetkililerinde dolu.
describe('fakülte şablonu, fakültedeki BÖLÜM akademisyenine görünür', () => {
  const HARITA = { bilgisayar: 'F-MUH', makine: 'F-MUH', fizik: 'F-FEN' };
  const fakSablonu = { scope: 'faculty', facultyId: 'F-MUH', module: 'staj' };

  it('facultyId taşımayan akademisyen fakültesini BÖLÜMÜNDEN alır', () => {
    const akademisyen = { departmentId: 'bilgisayar' }; // facultyId YOK
    expect(canViewTemplate(akademisyen, fakSablonu, HARITA)).toBe(true);
  });

  it('aynı fakültenin diğer bölümü de görür', () => {
    expect(canViewTemplate({ departmentId: 'makine' }, fakSablonu, HARITA)).toBe(true);
  });

  it('BAŞKA fakültenin akademisyeni görmez', () => {
    expect(canViewTemplate({ departmentId: 'fizik' }, fakSablonu, HARITA)).toBe(false);
  });

  it('bölümü de fakültesi de olmayan kullanıcı görmez', () => {
    expect(canViewTemplate({}, fakSablonu, HARITA)).toBe(false);
  });

  it('profilinde facultyId olan yetkili DAVRANIŞINI KORUR', () => {
    const fakYetkilisi = { isFacultyManager: true, facultyId: 'F-MUH' };
    expect(canViewTemplate(fakYetkilisi, fakSablonu, HARITA)).toBe(true);
    expect(
      canViewTemplate({ isFacultyManager: true, facultyId: 'F-FEN' }, fakSablonu, HARITA)
    ).toBe(false);
  });

  it('GÖRME yetkisi YÖNETME yetkisi vermez', () => {
    // Bölümdeki akademisyen fakülte şablonunu indirebilir ama silemez.
    expect(canManageTemplate({ departmentId: 'bilgisayar' }, fakSablonu, HARITA)).toBe(false);
  });
});
