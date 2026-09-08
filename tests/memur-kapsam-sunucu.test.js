import { describe, it, expect } from 'vitest';
import {
  stajYetkilisiMi,
  memurMuafiyetKaydiniGorurMu,
  memurMuafiyetKayitlariniSuz,
  memuraGonderilenMuafiyetKayitlari,
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

// ══════════════════════════════════════════════════════════════
// MUAFİYET KAYITLARI — memur_outputs kapatıldı ama başvuru kayıtları
// personelin tamamına açıktı: memur, arayüzde göremediği bir başvurunun
// dilekçesine /api/db üzerinden ulaşabiliyordu.
// ══════════════════════════════════════════════════════════════
describe('memurMuafiyetKaydiniGorurMu', () => {
  const kayit = (ek) => Object.assign({ _docId: 'r1', departmentId: 'bilgisayar' }, ek);

  it('atandığı bölümün kaydını görür', () => {
    expect(memurMuafiyetKaydiniGorurMu(kayit(), NIYAZI, ATAMALAR, new Set())).toBe(true);
  });

  it('ATANMADIĞI bölümün kaydını görmez', () => {
    expect(
      memurMuafiyetKaydiniGorurMu(kayit({ departmentId: 'kimya' }), NIYAZI, ATAMALAR, new Set())
    ).toBe(false);
  });

  it('atandığı bölümde muafiyet modülü yoksa görmez', () => {
    const baskaModul = [{ departmentId: 'bilgisayar', memurId: 'm-niyazi', modules: ['staj'] }];
    expect(memurMuafiyetKaydiniGorurMu(kayit(), NIYAZI, baskaModul, new Set())).toBe(false);
  });

  it('GÖNDERİLMİŞ belgenin kaynağıysa bölümü olmasa da görür', () => {
    // Yönlendirmenin kapsamı gönderenin bölümünden gelebiliyor; bu dal
    // olmadan gönderilmiş belgenin transkript/ders içerikleri kaybolurdu.
    const bolumsuz = kayit({ departmentId: '', _docId: 'r9' });
    expect(memurMuafiyetKaydiniGorurMu(bolumsuz, NIYAZI, ATAMALAR, new Set(['r9']))).toBe(true);
  });

  it('gönderilmemiş ve kapsam dışı kayıt görünmez', () => {
    const yabanci = kayit({ departmentId: 'kimya', _docId: 'r9' });
    expect(memurMuafiyetKaydiniGorurMu(yabanci, NIYAZI, ATAMALAR, new Set(['baska']))).toBe(false);
  });

  it('kimliği çözülemeyen kayıt görünmez', () => {
    expect(
      memurMuafiyetKaydiniGorurMu({ departmentId: 'kimya' }, NIYAZI, ATAMALAR, new Set(['r1']))
    ).toBe(false);
  });

  it('id alanı da okunur', () => {
    const r = { id: 'r5', departmentId: 'kimya' };
    expect(memurMuafiyetKaydiniGorurMu(r, NIYAZI, ATAMALAR, new Set(['r5']))).toBe(true);
  });

  it('boş girdi çökmez', () => {
    expect(memurMuafiyetKaydiniGorurMu(null, NIYAZI, ATAMALAR, new Set())).toBe(false);
    expect(memurMuafiyetKaydiniGorurMu(kayit(), null, ATAMALAR, new Set())).toBe(false);
    expect(memurMuafiyetKaydiniGorurMu(kayit({ departmentId: 'kimya' }), NIYAZI, ATAMALAR)).toBe(
      false
    );
  });
});

describe('memuraGonderilenMuafiyetKayitlari', () => {
  it('yalnız memura GÖNDERİLMİŞ muafiyet belgelerinin kaynaklarını alır', () => {
    const belgeler = [
      {
        module: 'muafiyet',
        sourceId: 'r1',
        departmentId: 'bilgisayar',
        facultyId: 'muhendislik',
        gonderimler: [{ hedefRol: 'memur', kapsamId: 'bilgisayar' }],
      },
      // gönderilmemiş
      { module: 'muafiyet', sourceId: 'r2', departmentId: 'bilgisayar', gonderimler: [] },
      // başka bölüme gönderilmiş
      {
        module: 'muafiyet',
        sourceId: 'r3',
        departmentId: 'kimya',
        gonderimler: [{ hedefRol: 'memur', kapsamId: 'kimya' }],
      },
      // başka modül
      {
        module: 'staj',
        sourceId: 'r4',
        departmentId: 'bilgisayar',
        gonderimler: [{ hedefRol: 'memur', kapsamId: 'bilgisayar' }],
      },
    ];
    const kume = memuraGonderilenMuafiyetKayitlari(belgeler, NIYAZI, ATAMALAR);
    expect([...kume]).toEqual(['r1']);
  });

  it('boş girdi çökmez', () => {
    expect([...memuraGonderilenMuafiyetKayitlari(null, NIYAZI, ATAMALAR)]).toEqual([]);
  });
});

describe('memurMuafiyetKayitlariniSuz', () => {
  it('kapsam dışı kayıtlar düşer', () => {
    const kayitlar = [
      { _docId: 'a', departmentId: 'bilgisayar' },
      { _docId: 'b', departmentId: 'kimya' },
      { _docId: 'c', departmentId: '' },
    ];
    const kalan = memurMuafiyetKayitlariniSuz(kayitlar, NIYAZI, ATAMALAR, new Set(['c']));
    expect(kalan.map((x) => x._docId)).toEqual(['a', 'c']);
  });

  it('boş liste çökmez', () => {
    expect(memurMuafiyetKayitlariniSuz(null, NIYAZI, ATAMALAR, new Set())).toEqual([]);
  });
});

describe('sunucuda kimliksiz/ad eşleşmesi', () => {
  const ATAMA_ADLI = [
    {
      departmentId: 'bilgisayar',
      memurId: 'm-niyazi',
      memurName: 'Niyazi METE',
      modules: ['muafiyet'],
    },
  ];
  const belgeBil = {
    module: 'muafiyet',
    departmentId: 'bilgisayar',
    facultyId: 'muhendislik',
    gonderimler: [{ hedefRol: 'memur', kapsamId: 'bilgisayar' }],
  };

  it('kimliği çözülemeyen memur adıyla eşleşir', () => {
    const memur = { memurId: '', name: 'Niyazi METE', facultyId: 'muhendislik' };
    expect(memurunBelgesiMi(belgeBil, memur, ATAMA_ADLI)).toBe(true);
  });

  it('kimlik VARSA ve tutmuyorsa ad yedeği devreye girmez', () => {
    const memur = { memurId: 'm-baskasi', name: 'Niyazi METE', facultyId: 'muhendislik' };
    expect(memurunBelgesiMi(belgeBil, memur, ATAMA_ADLI)).toBe(false);
  });

  it('ad da tutmuyorsa kapalı', () => {
    const memur = { memurId: '', name: 'Başka Kişi', facultyId: 'muhendislik' };
    expect(memurunBelgesiMi(belgeBil, memur, ATAMA_ADLI)).toBe(false);
  });

  it('staj yetkisi de adla çözülebilir', () => {
    const stajAtama = [
      { departmentId: 'kimya', memurId: 'm-ergun', memurName: 'Ergün ÇINAR', modules: ['staj'] },
    ];
    expect(stajYetkilisiMi({ memurId: '', name: 'Ergün ÇINAR' }, stajAtama)).toBe(true);
    expect(stajYetkilisiMi({ memurId: '', name: 'Biri' }, stajAtama)).toBe(false);
  });
});
