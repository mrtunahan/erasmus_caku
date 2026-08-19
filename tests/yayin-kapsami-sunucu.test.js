// Anket ataması / duyuru SİLME yetkisi sunucuda.
//
// Şikâyet: "Mühendislik'teki üniversite yetkilisinin oluşturduğu anketi,
// başka bir fakültedeki fakülte yetkilisi silebildi." Kural istemcide vardı
// ama yalnız orada: silme isteği sunucuda hiçbir denetimden geçmiyordu.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { aktorKapsami, yonetilebilirMi } = require('../server/lib/yayin-kapsami.js');

const BOLUMLER = [
  { id: '64aa01', _docId: 'bilgisayar', facultyId: 'F-MUH', name: 'Bilgisayar Müh.' },
  { id: '64aa02', _docId: 'makine', facultyId: 'F-MUH', name: 'Makine Müh.' },
  { id: '64aa03', _docId: 'fizik', facultyId: 'F-FEN', name: 'Fizik' },
];

const UNI = { isUniversityAdmin: true };
const MUH_YETKILISI = { isFacultyManager: true, facultyId: 'F-MUH', departmentId: 'bilgisayar' };
const FEN_YETKILISI = { isFacultyManager: true, facultyId: 'F-FEN', departmentId: 'fizik' };
const BOLUM_YETKILISI = { isDeptManager: true, departmentId: 'bilgisayar' };

describe('aktorKapsami', () => {
  it('üniversite yetkilisi tüm kuruma yayın yapar', () => {
    expect(aktorKapsami(UNI, BOLUMLER)).toEqual({
      kapsamTuru: 'universite',
      facultyId: '',
      departmentIds: [],
    });
  });

  it('fakülte yetkilisinin kapsamı fakültesinin TÜM bölümleridir', () => {
    const k = aktorKapsami(MUH_YETKILISI, BOLUMLER);
    expect(k.kapsamTuru).toBe('fakulte');
    // Her bölümün her kimlik biçimi kapsamda — kayıtların bir kısmı slug,
    // bir kısmı ObjectId taşıyor.
    expect(k.departmentIds).toContain('bilgisayar');
    expect(k.departmentIds).toContain('64aa01');
    expect(k.departmentIds).toContain('makine');
    expect(k.departmentIds).not.toContain('fizik');
  });

  it('bölüm yetkilisinin kapsamı kendi bölümünün tüm kimlik biçimleridir', () => {
    const k = aktorKapsami(BOLUM_YETKILISI, BOLUMLER);
    expect(k.kapsamTuru).toBe('bolum');
    expect(k.departmentIds.sort()).toEqual(['64aa01', 'bilgisayar'].sort());
  });

  it('çapraz bölüm ataması da kapsama girer', () => {
    const k = aktorKapsami(
      { isDeptManager: true, departmentId: 'bilgisayar', additionalDepartments: ['makine'] },
      BOLUMLER
    );
    expect(k.departmentIds).toContain('makine');
    expect(k.departmentIds).toContain('64aa02');
  });

  it('bayraksız akademisyen yalnız kendi bölümüdür', () => {
    expect(aktorKapsami({ departmentId: 'fizik' }, BOLUMLER).kapsamTuru).toBe('bolum');
  });

  it('boş girdide çökmez', () => {
    expect(aktorKapsami(null, null).kapsamTuru).toBe('bolum');
  });
});

describe('yonetilebilirMi', () => {
  const uniAnketi = { kapsamTuru: 'universite', kapsamDepartmentIds: [] };
  const muhAnketi = { kapsamTuru: 'fakulte', kapsamDepartmentIds: ['bilgisayar', 'makine'] };

  it('BAŞKA fakültenin yetkilisi üniversite anketini SİLEMEZ — asıl arıza', () => {
    expect(yonetilebilirMi(uniAnketi, aktorKapsami(FEN_YETKILISI, BOLUMLER))).toBe(false);
  });

  it('kendi fakültesinin yetkilisi de üniversite anketini silemez', () => {
    expect(yonetilebilirMi(uniAnketi, aktorKapsami(MUH_YETKILISI, BOLUMLER))).toBe(false);
  });

  it('üniversite yetkilisi her şeyi yönetir', () => {
    expect(yonetilebilirMi(uniAnketi, aktorKapsami(UNI, BOLUMLER))).toBe(true);
    expect(yonetilebilirMi(muhAnketi, aktorKapsami(UNI, BOLUMLER))).toBe(true);
  });

  it('fakülte yetkilisi BAŞKA fakültenin anketini silemez', () => {
    expect(yonetilebilirMi(muhAnketi, aktorKapsami(FEN_YETKILISI, BOLUMLER))).toBe(false);
  });

  it('fakülte yetkilisi KENDİ fakültesinin anketini siler', () => {
    expect(yonetilebilirMi(muhAnketi, aktorKapsami(MUH_YETKILISI, BOLUMLER))).toBe(true);
  });

  it('kayıt ÖTEKİ kimlik biçimiyle yazılmışsa da eşleşir', () => {
    // Ham eşitlik burada yetkiyi yanlışlıkla DARALTIRDI.
    const objectIdli = { kapsamTuru: 'bolum', kapsamDepartmentIds: ['64aa01'] };
    expect(yonetilebilirMi(objectIdli, aktorKapsami(BOLUM_YETKILISI, BOLUMLER))).toBe(true);
  });

  it('bölüm yetkilisi başka bölümün atamasını silemez', () => {
    const makineAnketi = { kapsamTuru: 'bolum', kapsamDepartmentIds: ['makine'] };
    expect(yonetilebilirMi(makineAnketi, aktorKapsami(BOLUM_YETKILISI, BOLUMLER))).toBe(false);
  });

  it('eski (kapsamsız) kayıt yazanın bölümünden çözülür', () => {
    const eski = { departmentId: 'bilgisayar' };
    expect(yonetilebilirMi(eski, aktorKapsami(BOLUM_YETKILISI, BOLUMLER))).toBe(true);
    expect(yonetilebilirMi(eski, aktorKapsami(FEN_YETKILISI, BOLUMLER))).toBe(false);
  });

  it('ne kapsam ne bölüm taşıyan kayıt alt yetkiliye bırakılmaz', () => {
    expect(yonetilebilirMi({}, aktorKapsami(MUH_YETKILISI, BOLUMLER))).toBe(false);
    expect(yonetilebilirMi({}, aktorKapsami(UNI, BOLUMLER))).toBe(true);
  });

  it('kapsam listesi BOŞALMIŞ kayıt alt yetkiliye açılmaz', () => {
    const bos = { kapsamTuru: 'fakulte', kapsamDepartmentIds: [] };
    expect(yonetilebilirMi(bos, aktorKapsami(MUH_YETKILISI, BOLUMLER))).toBe(false);
  });

  it('kayıt yoksa false', () => {
    expect(yonetilebilirMi(null, aktorKapsami(UNI, BOLUMLER))).toBe(false);
  });
});
