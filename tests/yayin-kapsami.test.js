import { describe, it, expect } from 'vitest';
import {
  kullaniciBolumleri,
  yayinKapsamCoz,
  yayinKapsamYamasi,
  yayinKapsamdaMi,
  yayinYonetilebilirMi,
} from '../lib/yayin-kapsami.js';

const BOLUMLER = [
  { id: 'bilgisayar', facultyId: 'muh-fak' },
  { id: 'makine', facultyId: 'muh-fak' },
  { id: 'orman-muh', facultyId: 'orman-fak' },
  { id: 'peyzaj', facultyId: 'orman-fak' },
];

const bolumYetkilisi = { isDeptManager: true, departmentId: 'bilgisayar', facultyId: 'muh-fak' };
const fakulteYetkilisi = { isFacultyManager: true, facultyId: 'muh-fak' };
const universiteYetkilisi = { isUniversityAdmin: true, facultyId: 'muh-fak' };
const ormanOgrencisi = { role: 'student', departmentId: 'orman-muh' };
const makineHocasi = { role: 'professor', departmentId: 'makine' };

describe('yayinKapsamCoz', () => {
  it('bölüm yetkilisi yalnız kendi bölümlerini kapsar', () => {
    const k = yayinKapsamCoz(bolumYetkilisi, BOLUMLER);
    expect(k.kapsamTuru).toBe('bolum');
    expect(k.departmentIds).toEqual(['bilgisayar']);
  });

  it('çapraz bölüm ataması da kapsama girer', () => {
    const k = yayinKapsamCoz({ ...bolumYetkilisi, additionalDepartments: ['makine'] }, BOLUMLER);
    expect(k.departmentIds).toEqual(['bilgisayar', 'makine']);
  });

  it('fakülte yetkilisi kendi fakültesinin TÜM bölümlerini kapsar', () => {
    const k = yayinKapsamCoz(fakulteYetkilisi, BOLUMLER);
    expect(k.kapsamTuru).toBe('fakulte');
    expect(k.departmentIds).toEqual(['bilgisayar', 'makine']);
    expect(k.departmentIds).not.toContain('orman-muh');
  });

  it('üniversite yetkilisi tüm fakülteleri kapsar (liste tutulmaz)', () => {
    const k = yayinKapsamCoz(universiteYetkilisi, BOLUMLER);
    expect(k.kapsamTuru).toBe('universite');
    expect(k.departmentIds).toEqual([]);
  });

  it('kullanıcı yoksa en dar kapsam varsayılır', () => {
    expect(yayinKapsamCoz(null, BOLUMLER).kapsamTuru).toBe('bolum');
    expect(yayinKapsamCoz(null, BOLUMLER).departmentIds).toEqual([]);
  });
});

describe('yayinKapsamYamasi', () => {
  it('kapsamı kayda yazılacak alanlara çevirir', () => {
    const y = yayinKapsamYamasi(yayinKapsamCoz(fakulteYetkilisi, BOLUMLER));
    expect(y).toEqual({
      kapsamTuru: 'fakulte',
      kapsamFacultyId: 'muh-fak',
      kapsamDepartmentIds: ['bilgisayar', 'makine'],
    });
  });

  it('seçilen tek bölüme daraltır', () => {
    const y = yayinKapsamYamasi(yayinKapsamCoz(fakulteYetkilisi, BOLUMLER), 'makine');
    expect(y.kapsamTuru).toBe('bolum');
    expect(y.kapsamDepartmentIds).toEqual(['makine']);
  });

  it('kapsam DIŞI bölüme daraltma isteği yok sayılır', () => {
    // Daraltma aracı kapsam aşma aracı değildir.
    const y = yayinKapsamYamasi(yayinKapsamCoz(fakulteYetkilisi, BOLUMLER), 'orman-muh');
    expect(y.kapsamTuru).toBe('fakulte');
    expect(y.kapsamDepartmentIds).toEqual(['bilgisayar', 'makine']);
  });

  it('üniversite yetkilisi istediği bölüme daraltabilir', () => {
    const y = yayinKapsamYamasi(yayinKapsamCoz(universiteYetkilisi, BOLUMLER), 'orman-muh');
    expect(y.kapsamTuru).toBe('bolum');
    expect(y.kapsamDepartmentIds).toEqual(['orman-muh']);
  });
});

describe('yayinKapsamdaMi', () => {
  const yayin = (yayimlayan, sadece) => ({
    ...yayinKapsamYamasi(yayinKapsamCoz(yayimlayan, BOLUMLER), sadece),
  });

  it('bölüm yayını yalnız o bölüme ulaşır', () => {
    // Bildirilen hata: Bilgisayar'a atanan anket Orman'da görünüyordu.
    const a = yayin(bolumYetkilisi);
    expect(yayinKapsamdaMi(a, { role: 'student', departmentId: 'bilgisayar' })).toBe(true);
    expect(yayinKapsamdaMi(a, ormanOgrencisi)).toBe(false);
  });

  it('fakülte yayını fakültenin tüm bölümlerine ulaşır, başka fakülteye ulaşmaz', () => {
    const a = yayin(fakulteYetkilisi);
    expect(yayinKapsamdaMi(a, makineHocasi)).toBe(true);
    expect(yayinKapsamdaMi(a, { role: 'student', departmentId: 'bilgisayar' })).toBe(true);
    expect(yayinKapsamdaMi(a, ormanOgrencisi)).toBe(false);
  });

  it('üniversite yayını herkese ulaşır', () => {
    const a = yayin(universiteYetkilisi);
    expect(yayinKapsamdaMi(a, ormanOgrencisi)).toBe(true);
    expect(yayinKapsamdaMi(a, makineHocasi)).toBe(true);
  });

  it('boş kapsam listesi "herkes" DEĞİL, kimse demektir', () => {
    const a = { kapsamTuru: 'bolum', kapsamDepartmentIds: [] };
    expect(yayinKapsamdaMi(a, makineHocasi)).toBe(false);
  });

  it('eski kayıt: yazanın bölümüne düşülür (dar taraf)', () => {
    const eski = { departmentId: 'bilgisayar', targetRole: 'student' };
    expect(yayinKapsamdaMi(eski, { role: 'student', departmentId: 'bilgisayar' })).toBe(true);
    expect(yayinKapsamdaMi(eski, ormanOgrencisi)).toBe(false);
  });

  it('eski kayıt: hedef listesi varsa o uygulanır', () => {
    const eski = { hedefDepartmentIds: ['makine'], departmentId: 'bilgisayar' };
    expect(yayinKapsamdaMi(eski, makineHocasi, { hedefAlan: 'hedefDepartmentIds' })).toBe(true);
    expect(
      yayinKapsamdaMi(
        eski,
        { role: 'student', departmentId: 'bilgisayar' },
        {
          hedefAlan: 'hedefDepartmentIds',
        }
      )
    ).toBe(false);
  });

  it('eski kayıtta hiçbir kapsam izi yoksa genel sayılır', () => {
    expect(yayinKapsamdaMi({ targetRole: 'student' }, ormanOgrencisi)).toBe(true);
  });

  it('kayıt yoksa false', () => {
    expect(yayinKapsamdaMi(null, ormanOgrencisi)).toBe(false);
  });
});

describe('yayinYonetilebilirMi', () => {
  const bolumKapsam = yayinKapsamCoz(bolumYetkilisi, BOLUMLER);
  const fakulteKapsam = yayinKapsamCoz(fakulteYetkilisi, BOLUMLER);
  const univKapsam = yayinKapsamCoz(universiteYetkilisi, BOLUMLER);

  it('bölüm yetkilisi başka bölümün atamasını yönetemez', () => {
    const ormanAtama = { kapsamTuru: 'bolum', kapsamDepartmentIds: ['orman-muh'] };
    expect(yayinYonetilebilirMi(ormanAtama, bolumKapsam)).toBe(false);
  });

  it('bölüm yetkilisi kendi bölümünün atamasını yönetir', () => {
    const kendi = { kapsamTuru: 'bolum', kapsamDepartmentIds: ['bilgisayar'] };
    expect(yayinYonetilebilirMi(kendi, bolumKapsam)).toBe(true);
  });

  it('fakülte yetkilisi fakültesindeki her atamayı yönetir', () => {
    const makineAtama = { kapsamTuru: 'bolum', kapsamDepartmentIds: ['makine'] };
    expect(yayinYonetilebilirMi(makineAtama, fakulteKapsam)).toBe(true);
    const ormanAtama = { kapsamTuru: 'bolum', kapsamDepartmentIds: ['peyzaj'] };
    expect(yayinYonetilebilirMi(ormanAtama, fakulteKapsam)).toBe(false);
  });

  it('üniversite geneli yayın alt yetkiliye görünür ama onun eseri değildir', () => {
    const genel = { kapsamTuru: 'universite', kapsamDepartmentIds: [] };
    expect(yayinYonetilebilirMi(genel, bolumKapsam)).toBe(false);
    expect(yayinYonetilebilirMi(genel, fakulteKapsam)).toBe(false);
    expect(yayinYonetilebilirMi(genel, univKapsam)).toBe(true);
  });

  it('eski kayıt yazanın bölümünden yönetilir', () => {
    expect(yayinYonetilebilirMi({ departmentId: 'bilgisayar' }, bolumKapsam)).toBe(true);
    expect(yayinYonetilebilirMi({ departmentId: 'orman-muh' }, bolumKapsam)).toBe(false);
    expect(yayinYonetilebilirMi({}, bolumKapsam)).toBe(false);
  });
});

describe('kullaniciBolumleri', () => {
  it('ana ve çapraz bölümleri birleştirir', () => {
    expect(kullaniciBolumleri({ departmentId: 'a', additionalDepartments: ['b', 'c'] })).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(kullaniciBolumleri(null)).toEqual([]);
  });
});
