import { describe, it, expect } from 'vitest';
import {
  stajYetkilisiMi,
  memurBolumModulleri,
  memurYonlendirmeleri,
  memurunBelgesiMi,
  memurBelgeleriniSuz,
} from '../server/lib/memur-kapsam.js';

// Memur Niyazi: Kimya havuzunda kayıtlı ama YALNIZ Bilgisayar'a atanmış.
const NIYAZI = {
  memurId: 'm-niyazi',
  departmentId: 'kimya',
  facultyId: 'muhendislik',
  memurModules: [],
};

const ATAMALAR = [{ departmentId: 'bilgisayar', memurId: 'm-niyazi', modules: ['muafiyet'] }];

function belge(ek) {
  return Object.assign(
    {
      module: 'muafiyet',
      departmentId: 'bilgisayar',
      facultyId: 'muhendislik',
      gonderimler: [{ hedefRol: 'memur', kapsamId: 'bilgisayar' }],
    },
    ek
  );
}

describe('memurBolumModulleri', () => {
  it('atanan bölümde atamanın modülleri', () => {
    expect(memurBolumModulleri(ATAMALAR, 'bilgisayar', NIYAZI)).toEqual(['muafiyet']);
  });

  it('atanmamış bölümde yetki yok', () => {
    expect(memurBolumModulleri(ATAMALAR, 'kimya', NIYAZI)).toEqual([]);
  });

  it('eski düz liste yalnız memurun kendi bölümünde', () => {
    const eski = { ...NIYAZI, memurModules: ['erasmus'] };
    expect(memurBolumModulleri([], 'kimya', eski)).toEqual(['erasmus']);
    expect(memurBolumModulleri([], 'bilgisayar', eski)).toEqual([]);
  });

  it('boş girdi çökmez', () => {
    expect(memurBolumModulleri(null, '', null)).toEqual([]);
  });
});

describe('memurYonlendirmeleri', () => {
  it('yalnız memura yapılanları alır', () => {
    const d = belge({
      gonderimler: [
        { hedefRol: 'ogrenci', kapsamId: '123' },
        { hedefRol: 'memur', kapsamId: 'bilgisayar' },
        { hedefRol: 'akademisyen', kapsamId: 'bilgisayar' },
      ],
    });
    expect(memurYonlendirmeleri(d).length).toBe(1);
    expect(memurYonlendirmeleri(null)).toEqual([]);
  });
});

describe('memurunBelgesiMi', () => {
  it('gönderilmiş + atanmış → görür', () => {
    expect(memurunBelgesiMi(belge(), NIYAZI, ATAMALAR)).toBe(true);
  });

  it('GÖNDERİLMEMİŞ belge memurun değildir', () => {
    // recordMemurOutput anlık görüntüsü: üretilmiş, yönlendirilmemiş.
    expect(memurunBelgesiMi(belge({ gonderimler: [] }), NIYAZI, ATAMALAR)).toBe(false);
  });

  it('yalnız öğrenciye gönderilmiş belge memurun değildir', () => {
    const d = belge({ gonderimler: [{ hedefRol: 'ogrenci', kapsamId: '123' }] });
    expect(memurunBelgesiMi(d, NIYAZI, ATAMALAR)).toBe(false);
  });

  it('ATANMADIĞI bölümün belgesini görmez', () => {
    const d = belge({
      departmentId: 'kimya',
      gonderimler: [{ hedefRol: 'memur', kapsamId: 'kimya' }],
    });
    expect(memurunBelgesiMi(d, NIYAZI, ATAMALAR)).toBe(false);
  });

  it('atandığı bölümde ATANMAMIŞ modülü görmez', () => {
    expect(memurunBelgesiMi(belge({ module: 'erasmus' }), NIYAZI, ATAMALAR)).toBe(false);
  });

  it('kapsamsız yönlendirmede belgenin kendi bölümü kullanılır', () => {
    const d = belge({ gonderimler: [{ hedefRol: 'memur', kapsamId: '' }] });
    expect(memurunBelgesiMi(d, NIYAZI, ATAMALAR)).toBe(true);
    const baska = belge({
      departmentId: 'kimya',
      gonderimler: [{ hedefRol: 'memur', kapsamId: '' }],
    });
    expect(memurunBelgesiMi(baska, NIYAZI, ATAMALAR)).toBe(false);
  });

  it('bölümsüz belge: aynı fakülte + herhangi bir bölümde atama', () => {
    const d = belge({
      departmentId: '',
      facultyId: 'muhendislik',
      gonderimler: [{ hedefRol: 'memur', kapsamId: '' }],
    });
    expect(memurunBelgesiMi(d, NIYAZI, ATAMALAR)).toBe(true);
  });

  it('bölümsüz belge başka fakülteden ise görünmez', () => {
    const d = belge({
      departmentId: '',
      facultyId: 'fen',
      gonderimler: [{ hedefRol: 'memur', kapsamId: '' }],
    });
    expect(memurunBelgesiMi(d, NIYAZI, ATAMALAR)).toBe(false);
  });

  it('kapsamsız ve fakültesiz belge kimseye açık değil', () => {
    const d = belge({
      departmentId: '',
      facultyId: '',
      gonderimler: [{ hedefRol: 'memur', kapsamId: '' }],
    });
    expect(memurunBelgesiMi(d, NIYAZI, ATAMALAR)).toBe(false);
  });

  it('modülsüz kayıt görünmez', () => {
    expect(memurunBelgesiMi(belge({ module: '' }), NIYAZI, ATAMALAR)).toBe(false);
  });

  it('boş girdi çökmez', () => {
    expect(memurunBelgesiMi(null, NIYAZI, ATAMALAR)).toBe(false);
    expect(memurunBelgesiMi(belge(), null, ATAMALAR)).toBe(false);
  });
});

describe('memurBelgeleriniSuz', () => {
  it('yalnız memurun belgeleri kalır', () => {
    const liste = [
      belge({ id: 'a' }),
      belge({
        id: 'b',
        departmentId: 'kimya',
        gonderimler: [{ hedefRol: 'memur', kapsamId: 'kimya' }],
      }),
      belge({ id: 'c', gonderimler: [] }),
    ];
    expect(memurBelgeleriniSuz(liste, NIYAZI, ATAMALAR).map((x) => x.id)).toEqual(['a']);
  });

  it('atamasız memura hiçbir belge kalmaz', () => {
    expect(memurBelgeleriniSuz([belge()], NIYAZI, []).length).toBe(0);
  });

  it('boş liste çökmez', () => {
    expect(memurBelgeleriniSuz(null, NIYAZI, ATAMALAR)).toEqual([]);
  });
});

describe('staj istisnası (fakülte çapında)', () => {
  const ERGUN = {
    memurId: 'm-ergun',
    departmentId: '',
    facultyId: 'muhendislik',
    memurModules: [],
    isStajCoordinator: true,
  };

  const stajBelgesi = {
    module: 'staj',
    departmentId: 'kimya',
    facultyId: 'muhendislik',
    gonderimler: [{ hedefRol: 'memur', kapsamId: 'kimya' }],
  };

  it('bayrak fakülte çapında yetki verir', () => {
    expect(stajYetkilisiMi(ERGUN, [])).toBe(true);
    expect(memurunBelgesiMi(stajBelgesi, ERGUN, [])).toBe(true);
  });

  it('herhangi bir bölümdeki staj ataması da yeter', () => {
    const memur = { ...ERGUN, isStajCoordinator: false };
    const atamalar = [{ departmentId: 'bilgisayar', memurId: 'm-ergun', modules: ['staj'] }];
    expect(stajYetkilisiMi(memur, atamalar)).toBe(true);
    expect(memurunBelgesiMi(stajBelgesi, memur, atamalar)).toBe(true);
  });

  it('başka fakültenin staj belgesi görünmez', () => {
    expect(memurunBelgesiMi({ ...stajBelgesi, facultyId: 'fen' }, ERGUN, [])).toBe(false);
  });

  it('GÖNDERİM şartı staj istisnasında da sürer', () => {
    expect(memurunBelgesiMi({ ...stajBelgesi, gonderimler: [] }, ERGUN, [])).toBe(false);
  });

  it('istisna yalnız staja özeldir', () => {
    expect(memurunBelgesiMi({ ...stajBelgesi, module: 'muafiyet' }, ERGUN, [])).toBe(false);
  });
});
