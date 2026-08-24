// Duyuru kapsamı — kim kime duyuru yapabilir.
//
// Bu testler somut bir sızıntıdan doğdu: Bilgisayar Mühendisliği bölüm
// yetkilisinin duyurusu Fen Fakültesi'nde görünüyordu. Sebep, hedef listesi
// boş bırakılan duyurunun "herkese göster" diye yorumlanmasıydı — kaydın
// üzerinde yazanın yetki alanı hiç durmuyordu.
import { describe, it, expect } from 'vitest';
import {
  duyuruErisimEtiketi,
  duyuruKapsamCoz,
  duyuruKapsamdaMi,
  duyuruKullaniciBolumleri,
} from '../lib/duyuru-kapsam.js';

const BOLUMLER = [
  { id: 'bilgisayar', facultyId: 'muhendislik' },
  { id: 'makine', facultyId: 'muhendislik' },
  { id: 'fizik', facultyId: 'fen' },
  { id: 'kimya', facultyId: 'fen' },
];

const ogr = (dept, ek) => ({
  role: 'student',
  departmentId: dept,
  additionalDepartments: ek || [],
});

describe('duyuruKapsamCoz', () => {
  it('bölüm yetkilisi yalnız kendi bölümlerini kapsar', () => {
    const k = duyuruKapsamCoz(
      { isDeptManager: true, departmentId: 'bilgisayar', facultyId: 'muhendislik' },
      BOLUMLER
    );
    expect(k.kapsamTuru).toBe('bolum');
    expect(k.departmentIds).toEqual(['bilgisayar']);
  });

  it('çapraz bölümleri de kapsama alır', () => {
    const k = duyuruKapsamCoz(
      { departmentId: 'bilgisayar', additionalDepartments: ['makine'] },
      BOLUMLER
    );
    expect(k.departmentIds).toEqual(['bilgisayar', 'makine']);
  });

  it('fakülte yetkilisi kendi fakültesinin bölümlerini kapsar', () => {
    const k = duyuruKapsamCoz({ isFacultyManager: true, facultyId: 'fen' }, BOLUMLER);
    expect(k.kapsamTuru).toBe('fakulte');
    expect(k.departmentIds).toEqual(['fizik', 'kimya']);
    expect(k.departmentIds).not.toContain('bilgisayar');
  });

  it('üniversite yetkilisinde liste tutulmaz (yeni bölüm de kapsama girer)', () => {
    const k = duyuruKapsamCoz({ isUniversityAdmin: true }, BOLUMLER);
    expect(k.kapsamTuru).toBe('universite');
    expect(k.departmentIds).toEqual([]);
  });

  it('kullanıcı yoksa boş kapsam döner (varsayılan geniş DEĞİL)', () => {
    expect(duyuruKapsamCoz(null, BOLUMLER).departmentIds).toEqual([]);
  });
});

describe('duyuruKapsamdaMi', () => {
  it('ASIL REGRESYON: bölüm duyurusu başka fakülteye sızmaz', () => {
    const d = {
      kapsamTuru: 'bolum',
      kapsamDepartmentIds: ['bilgisayar'],
      hedefDepartmentIds: [],
      departmentId: 'bilgisayar',
    };
    expect(duyuruKapsamdaMi(d, ogr('bilgisayar'))).toBe(true);
    expect(duyuruKapsamdaMi(d, ogr('fizik'))).toBe(false);
    expect(duyuruKapsamdaMi(d, ogr('makine'))).toBe(false);
  });

  it('fakülte duyurusu kendi fakültesinde kalır', () => {
    const d = { kapsamTuru: 'fakulte', kapsamDepartmentIds: ['fizik', 'kimya'] };
    expect(duyuruKapsamdaMi(d, ogr('kimya'))).toBe(true);
    expect(duyuruKapsamdaMi(d, ogr('bilgisayar'))).toBe(false);
  });

  it('üniversite duyurusu herkese açıktır', () => {
    const d = { kapsamTuru: 'universite', kapsamDepartmentIds: [] };
    expect(duyuruKapsamdaMi(d, ogr('fizik'))).toBe(true);
    expect(duyuruKapsamdaMi(d, ogr('bilgisayar'))).toBe(true);
  });

  it('çapraz bölümlü kullanıcı kapsamdaki bölümünden görür', () => {
    const d = { kapsamTuru: 'bolum', kapsamDepartmentIds: ['makine'] };
    expect(duyuruKapsamdaMi(d, ogr('bilgisayar', ['makine']))).toBe(true);
  });

  it('kapsam listesi boş kalmış kayıt KİMSEYE açılmaz', () => {
    // "boş liste = herkes" yorumu bu hatanın ta kendisiydi.
    const d = { kapsamTuru: 'bolum', kapsamDepartmentIds: [] };
    expect(duyuruKapsamdaMi(d, ogr('bilgisayar'))).toBe(false);
  });

  it('ESKİ kayıt: hedefi varsa hedefe göre davranır', () => {
    const d = { hedefDepartmentIds: ['fizik'], departmentId: 'bilgisayar' };
    expect(duyuruKapsamdaMi(d, ogr('fizik'))).toBe(true);
    expect(duyuruKapsamdaMi(d, ogr('kimya'))).toBe(false);
  });

  it('ESKİ kayıt: hedefi boşsa YAZANIN bölümüne düşer (dar taraf)', () => {
    // Eskiden bu kayıt herkese görünüyordu; düzeltmenin amacı buydu.
    const d = { hedefDepartmentIds: [], departmentId: 'bilgisayar' };
    expect(duyuruKapsamdaMi(d, ogr('bilgisayar'))).toBe(true);
    expect(duyuruKapsamdaMi(d, ogr('fizik'))).toBe(false);
  });

  it('ESKİ kayıt: yazanın bölümü de yoksa gerçekten geneldir', () => {
    const d = { hedefDepartmentIds: [], departmentId: '' };
    expect(duyuruKapsamdaMi(d, ogr('fizik'))).toBe(true);
  });

  it('kayıt yoksa false döner', () => {
    expect(duyuruKapsamdaMi(null, ogr('fizik'))).toBe(false);
  });
});

describe('duyuruKullaniciBolumleri', () => {
  it('ana ve çapraz bölümleri birleştirir, boşları atar', () => {
    expect(
      duyuruKullaniciBolumleri({ departmentId: 'a', additionalDepartments: ['b', ''] })
    ).toEqual(['a', 'b']);
    expect(duyuruKullaniciBolumleri({})).toEqual([]);
    expect(duyuruKullaniciBolumleri(null)).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════
// ERİŞİM ETİKETİ
//
// Rozet `kapsamTuru`yu okuyordu; o alan YAZANIN yetki alanı. Üniversite
// yetkilisi tek bölüme duyuru yazdığında o bölümün öğrencisi duyuruyu
// "Üniversite geneli" diye görüyordu.
// ══════════════════════════════════════════════════════════════
describe('duyuruErisimEtiketi', () => {
  const bolumler = [
    { id: 'bilgisayar', name: 'Bilgisayar Mühendisliği' },
    { id: 'makine', name: 'Makine Mühendisliği' },
  ];

  it('tek bölüme yazılan duyuru, YAZAN üniversite yetkilisi olsa bile bölüm duyurusudur', () => {
    const d = { kapsamTuru: 'universite', hedefDepartmentIds: ['bilgisayar'] };
    expect(duyuruErisimEtiketi(d, bolumler)).toEqual({
      etiket: 'Bilgisayar Mühendisliği',
      hedefli: true,
    });
  });

  it('birden çok hedefte sayı yazar', () => {
    const d = { kapsamTuru: 'universite', hedefDepartmentIds: ['bilgisayar', 'makine'] };
    expect(duyuruErisimEtiketi(d, bolumler).etiket).toBe('2 bölüme özel');
  });

  it('hedef boşsa yazanın kapsamını söyler', () => {
    expect(
      duyuruErisimEtiketi({ kapsamTuru: 'universite', hedefDepartmentIds: [] }, bolumler)
    ).toEqual({ etiket: 'Üniversite geneli', hedefli: false });
    expect(duyuruErisimEtiketi({ kapsamTuru: 'fakulte' }, bolumler).etiket).toBe('Fakülte geneli');
    expect(duyuruErisimEtiketi({ kapsamTuru: 'bolum' }, bolumler).etiket).toBe('Bölüm duyurusu');
  });

  it('bilinmeyen bölüm kimliğinde genel bir etikete düşer', () => {
    expect(duyuruErisimEtiketi({ hedefDepartmentIds: ['yokboyle'] }, bolumler).etiket).toBe(
      'Bölüm duyurusu'
    );
  });

  it('kapsamsız eski kayıtta en DAR etikete düşer', () => {
    // Eski kayıtları "üniversite geneli" saymak, duyurunun gerçekte
    // ulaştığından geniş bir izlenim verirdi.
    expect(duyuruErisimEtiketi({}, bolumler).etiket).toBe('Bölüm duyurusu');
    expect(duyuruErisimEtiketi(null, bolumler).etiket).toBe('Bölüm duyurusu');
  });
});
