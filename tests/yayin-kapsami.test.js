import { describe, it, expect } from 'vitest';
import {
  kullaniciBolumleri,
  kapsamBolumListesi,
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

// ══════════════════════════════════════════════════════════════
// İKİ BÖLÜM LİSTESİ, İKİ AYRI KİMLİK — ANKET ATAMASI KİMSEYE ULAŞMIYORDU
//
// Bölüm listesi iki yerden geliyor: `departments` koleksiyonunda kimlik
// ObjectId ve `facultyId` gerçek fakülte kimliği; koda gömülü çekirdek 6
// bölümde ise kimlik slug ve `facultyId` sabit 'muhendislik' metni.
// Fakülte yetkilisinin profilindeki facultyId DB'den geldiği için gömülü
// listeyle kapsam çözülünce hiçbir bölüm eşleşmiyor, kapsam BOŞ çıkıyor ve
// boş kapsam okuma tarafında "kimse" demek.
// ══════════════════════════════════════════════════════════════
describe('kapsamBolumListesi', () => {
  const DB = [
    { id: '64aa01', name: 'Bilgisayar Mühendisliği', facultyId: 'F-MUH' },
    { id: '64aa02', name: 'Makine ve Metal Teknolojileri', facultyId: 'F-MUH' },
    { id: '64aa03', name: 'Orman Mühendisliği', facultyId: 'F-ORMAN' },
  ];
  const GOMULU = [
    { id: 'bilgisayar', name: 'Bilgisayar Mühendisliği', facultyId: 'muhendislik' },
    { id: 'kimya', name: 'Kimya Mühendisliği', facultyId: 'muhendislik' },
  ];

  it('gömülü slug kimliği, DB kaydının GERÇEK fakültesine bağlanır', () => {
    const liste = kapsamBolumListesi(DB, GOMULU);
    expect(liste).toContainEqual({ id: 'bilgisayar', facultyId: 'F-MUH' });
    expect(liste).toContainEqual({ id: '64aa01', facultyId: 'F-MUH' });
  });

  it('DB’de karşılığı olmayan gömülü bölüm kendi fakültesiyle kalır', () => {
    expect(kapsamBolumListesi(DB, GOMULU)).toContainEqual({
      id: 'kimya',
      facultyId: 'muhendislik',
    });
  });

  it('aynı kimlik iki kez listelenmez', () => {
    const ids = kapsamBolumListesi(DB, GOMULU).map((x) => x.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('boş girdide çökmez', () => {
    expect(kapsamBolumListesi(null, null)).toEqual([]);
  });

  it('ARIZANIN KENDİSİ: yalnız gömülü listeyle fakülte kapsamı BOŞ çıkar', () => {
    // facultyId'si DB kimliği olan fakülte yetkilisi, gömülü listedeki
    // 'muhendislik' metniyle hiçbir zaman eşleşmez.
    const fakYetkili = { isFacultyManager: true, facultyId: 'F-MUH' };
    expect(yayinKapsamCoz(fakYetkili, GOMULU).departmentIds).toEqual([]);
    // Düzeltilmiş liste ile kapsam dolu gelir ve HER İKİ kimlik biçimini taşır.
    const k = yayinKapsamCoz(fakYetkili, kapsamBolumListesi(DB, GOMULU));
    expect(k.departmentIds).toContain('bilgisayar');
    expect(k.departmentIds).toContain('64aa01');
    expect(k.departmentIds).not.toContain('64aa03'); // başka fakülte
  });

  it('uçtan uca: fakülte yetkilisinin ataması SLUG taşıyan öğrenciye ulaşır', () => {
    const fakYetkili = { isFacultyManager: true, facultyId: 'F-MUH' };
    const kapsam = yayinKapsamCoz(fakYetkili, kapsamBolumListesi(DB, GOMULU));
    const atama = { ...yayinKapsamYamasi(kapsam), targetRole: 'student' };
    // Kimi öğrencinin departmentId'si slug, kiminki ObjectId.
    expect(yayinKapsamdaMi(atama, { departmentId: 'bilgisayar' })).toBe(true);
    expect(yayinKapsamdaMi(atama, { departmentId: '64aa02' })).toBe(true);
    // Başka fakültenin öğrencisine ULAŞMAZ — asıl kural bu.
    expect(yayinKapsamdaMi(atama, { departmentId: '64aa03' })).toBe(false);
  });
});

// ── CANLIDA GÖRÜLEN ARIZA ──
// "Mühendislik'teki üniversite yetkilisinin oluşturduğu anketi, BAŞKA bir
// fakültedeki fakülte yetkilisi silebildi; üstelik listede görüyordu."
describe('fakülte yetkilisi ÜNİVERSİTE yetkilisi sayılmaz', () => {
  // Giriş sırasında fakülte yetkilisi 'admin' rolüne yükseltiliyor
  // (attachProfile); ayırt eden şey baseRole + isUniversityAdmin bayrağı.
  const fakYetkilisi = {
    role: 'admin',
    baseRole: 'professor',
    isFacultyManager: true,
    facultyId: 'F-FEN',
    departmentId: 'fizik',
  };
  const uniYetkilisi = { role: 'admin', baseRole: 'professor', isUniversityAdmin: true };
  const BOLUMLER = [
    { id: 'bilgisayar', facultyId: 'F-MUH' },
    { id: 'makine', facultyId: 'F-MUH' },
    { id: 'fizik', facultyId: 'F-FEN' },
  ];

  it('kapsamı FAKÜLTE olur, üniversite değil', () => {
    const k = yayinKapsamCoz(fakYetkilisi, BOLUMLER);
    expect(k.kapsamTuru).toBe('fakulte');
    expect(k.departmentIds).toEqual(['fizik']);
  });

  it('attığı anket TÜM üniversiteye gitmez', () => {
    // Eskiden kapsam 'universite' yazılıyordu: Fen'in anketi Mühendislik'teki
    // herkese ulaşıyordu.
    const yama = yayinKapsamYamasi(yayinKapsamCoz(fakYetkilisi, BOLUMLER));
    expect(yama.kapsamTuru).toBe('fakulte');
    expect(yayinKapsamdaMi(yama, { departmentId: 'bilgisayar' })).toBe(false);
    expect(yayinKapsamdaMi(yama, { departmentId: 'fizik' })).toBe(true);
  });

  it('ÜNİVERSİTE genelindeki anketi yönetemez — asıl şikâyet buydu', () => {
    const uniAnket = yayinKapsamYamasi(yayinKapsamCoz(uniYetkilisi, BOLUMLER));
    const fakKapsam = yayinKapsamCoz(fakYetkilisi, BOLUMLER);
    expect(yayinYonetilebilirMi(uniAnket, fakKapsam)).toBe(false);
  });

  it('BAŞKA fakültenin atamasını yönetemez', () => {
    const muhYetkilisi = {
      role: 'admin',
      baseRole: 'professor',
      isFacultyManager: true,
      facultyId: 'F-MUH',
      departmentId: 'bilgisayar',
    };
    const muhAnket = yayinKapsamYamasi(yayinKapsamCoz(muhYetkilisi, BOLUMLER));
    expect(yayinYonetilebilirMi(muhAnket, yayinKapsamCoz(fakYetkilisi, BOLUMLER))).toBe(false);
  });

  it('KENDİ fakültesinin atamasını yönetebilir', () => {
    const kendi = yayinKapsamYamasi(yayinKapsamCoz(fakYetkilisi, BOLUMLER));
    expect(yayinYonetilebilirMi(kendi, yayinKapsamCoz(fakYetkilisi, BOLUMLER))).toBe(true);
  });

  it('gerçek üniversite yetkilisi kapsamını KAYBETMEZ', () => {
    expect(yayinKapsamCoz(uniYetkilisi, BOLUMLER).kapsamTuru).toBe('universite');
    // Bayraksız eski admin oturumu da üniversite düzeyindedir.
    expect(yayinKapsamCoz({ role: 'admin' }, BOLUMLER).kapsamTuru).toBe('universite');
  });

  it('bölüm yetkilisi de üniversite sayılmaz', () => {
    const bolumYetkilisi = {
      role: 'bolum_yetkilisi',
      baseRole: 'professor',
      isDeptManager: true,
      departmentId: 'makine',
    };
    const k = yayinKapsamCoz(bolumYetkilisi, BOLUMLER);
    expect(k.kapsamTuru).toBe('bolum');
    expect(k.departmentIds).toEqual(['makine']);
  });
});
