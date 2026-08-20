// Erasmus dönüşü: transkript, not çevirisi, ders değişikliği.
//
// Harf notu HESAPLANIR, elle girilmez — öğrencinin müdahale edebileceği tek
// şey transkriptteki ham nottur. Bu yüzden çevirinin kuralları burada
// sabitlenir: yanlış çevrilen bir not sessizce yanlış harf notu üretir.
import { describe, it, expect } from 'vitest';
import {
  NOT_SISTEMLERI,
  dersDegisikligi,
  eslesmeHarfNotu,
  eslesmeNotlariniHesapla,
  kodAnahtari,
  notCevir,
  puandanHarf,
  satirNotlari,
  sistemSez,
  transkriptEslestir,
} from '../lib/erasmus-not.js';

describe('notCevir', () => {
  it('ECTS harfleri çevrilir', () => {
    expect(notCevir('A', 'ects').harf).toBe('A');
    expect(notCevir('C', 'ects').harf).toBe('B2');
    expect(notCevir('FX', 'ects').harf).toBe('F1');
  });

  it('AYNI SAYI farklı sistemde farklı harf verir — tahmin edilemez', () => {
    // Eski 'auto' mod bunu tahmin ediyordu; '4' iki sistemde iki ayrı nottur.
    expect(notCevir('4', 'besli').harf).toBe('B2'); // 4/5 → 80 puan
    expect(notCevir('4', 'onluk').harf).toBe('F2'); // 4/10 → 40 puan
  });

  it('10 üzerinden ölçek', () => {
    expect(notCevir('10', 'onluk').harf).toBe('A');
    expect(notCevir('7', 'onluk').harf).toBe('C1');
    expect(notCevir('4', 'onluk').harf).toBe('F2');
  });

  it('100 üzerinden ölçek', () => {
    expect(notCevir('90', 'yuzluk').harf).toBe('A');
    expect(notCevir('64', 'yuzluk').harf).toBe('C3');
    expect(notCevir('49', 'yuzluk').harf).toBe('F2');
  });

  it('virgüllü ondalık kabul edilir', () => {
    expect(notCevir('4,5', 'besli').harf).toBe('A'); // 4.5/5 → 90 puan
  });

  it('harf ve sözel tablolar', () => {
    expect(notCevir('BA', 'harf').harf).toBe('B1');
    expect(notCevir('very good', 'metin').harf).toBe('A');
    expect(notCevir('Very Good', 'metin').harf).toBe('A');
  });

  it('SİSTEM VERİLMEZSE not üretilmez', () => {
    const r = notCevir('4', '');
    expect(r.ok).toBe(false);
    expect(r.harf).toBe('belirsiz');
    expect(r.sebep).toMatch(/not sistemi/);
  });

  it('aralık dışı değer belirsizdir, uydurulmaz', () => {
    expect(notCevir('12', 'onluk').ok).toBe(false);
    expect(notCevir('7', 'besli').ok).toBe(false);
    expect(notCevir('120', 'yuzluk').ok).toBe(false);
  });

  it('tabloda olmayan değer belirsizdir', () => {
    expect(notCevir('Z', 'ects').ok).toBe(false);
    expect(notCevir('passed', 'metin').ok).toBe(false);
  });

  it('boş not belirsizdir', () => {
    expect(notCevir('', 'ects').ok).toBe(false);
    expect(notCevir(null, 'ects').ok).toBe(false);
  });

  it('sistem listesi arayüze verilir', () => {
    expect(NOT_SISTEMLERI.map((x) => x.id)).toContain('ects');
    expect(NOT_SISTEMLERI.every((x) => x.id && x.ad)).toBe(true);
  });
});

describe('puandanHarf', () => {
  it('eşikler çeviri tablosuyla aynı', () => {
    expect(puandanHarf(90)).toBe('A');
    expect(puandanHarf(89.9)).toBe('B1');
    expect(puandanHarf(50)).toBe('F1');
    expect(puandanHarf(49.9)).toBe('F2');
  });

  it('sayı olmayan girdi belirsizdir', () => {
    expect(puandanHarf('abc')).toBe('belirsiz');
  });
});

describe('kodAnahtari', () => {
  it('boşluk, tire ve noktayı yok sayar', () => {
    expect(kodAnahtari('05-EMS-CN SP1')).toBe('05EMSCNSP1');
    expect(kodAnahtari('bil 101')).toBe(kodAnahtari('BIL-101'));
  });
});

describe('dersDegisikligi', () => {
  const gidis = [{ hostCourses: [{ code: 'CS101' }, { code: 'CS102' }] }];

  it('dönüşte ELLE eklenen ders yakalanır — akademisyen bunu bilmeli', () => {
    const donus = [{ hostCourses: [{ code: 'CS101' }, { code: 'MATH200' }] }];
    const r = dersDegisikligi(gidis, donus);
    expect(r.degisti).toBe(true);
    expect(r.yeni).toEqual(['MATH200']);
    expect(r.dusen).toEqual(['CS102']);
  });

  it('anlaşmaya sadık dönüşte uyarı YOK', () => {
    const donus = [{ hostCourses: [{ code: 'CS101' }, { code: 'cs-102' }] }];
    expect(dersDegisikligi(gidis, donus).degisti).toBe(false);
  });

  it('kod biçimi farkı değişiklik sayılmaz', () => {
    const donus = [{ hostCourses: [{ code: 'CS 101' }, { code: 'CS.102' }] }];
    expect(dersDegisikligi(gidis, donus).degisti).toBe(false);
  });

  it('boş girdilerde çökmez', () => {
    expect(dersDegisikligi(null, null).degisti).toBe(false);
  });
});

describe('transkriptEslestir', () => {
  const donus = [{ hostCourses: [{ code: 'CS101' }, { code: 'CS102' }] }];

  it('kodla eşleşen satırın notu bağlanır', () => {
    const r = transkriptEslestir(
      [
        { kod: 'CS-101', not: 'A' },
        { kod: 'CS102', not: 'B' },
      ],
      donus
    );
    expect(r.eslesen).toEqual({ CS101: 'A', CS102: 'B' });
    expect(r.transkriptteFazla).toEqual([]);
    expect(r.notuOlmayan).toEqual([]);
  });

  it('eşleşmeyen satır SESSİZCE atılmaz', () => {
    const r = transkriptEslestir([{ kod: 'PHY900', not: 'A' }], donus);
    expect(r.transkriptteFazla).toEqual(['PHY900']);
    expect(r.notuOlmayan.sort()).toEqual(['CS101', 'CS102']);
  });

  it('notu gelmeyen ders bildirilir', () => {
    const r = transkriptEslestir([{ kod: 'CS101', not: 'A' }], donus);
    expect(r.notuOlmayan).toEqual(['CS102']);
  });

  it('boş girdilerde çökmez', () => {
    expect(transkriptEslestir(null, null)).toEqual({
      eslesen: {},
      transkriptteFazla: [],
      notuOlmayan: [],
    });
  });
});

describe('eslesmeHarfNotu', () => {
  it('tek ders: kendi notu', () => {
    const m = { hostCourses: [{ code: 'CS101', credits: 5 }] };
    expect(eslesmeHarfNotu(m, { CS101: 'A' }, 'ects')).toEqual({ harf: 'A', ok: true });
  });

  it('iki ders: AKTS AĞIRLIKLI ortalama', () => {
    // A(90) 8 AKTS + C3(60) 2 AKTS → (90*8 + 60*2)/10 = 84 → B2
    const m = {
      hostCourses: [
        { code: 'CS101', credits: 8 },
        { code: 'CS102', credits: 2 },
      ],
    };
    const r = eslesmeHarfNotu(m, { CS101: 'A', CS102: 'E' }, 'ects');
    expect(r.harf).toBe('B2');
    expect(r.ortalama).toBe(84);
  });

  it('AKTS yoksa dersler eşit ağırlıklı', () => {
    const m = { hostCourses: [{ code: 'CS101' }, { code: 'CS102' }] };
    // A(90) ve C3(60) → 75 → B3
    expect(eslesmeHarfNotu(m, { CS101: 'A', CS102: 'E' }, 'ects').harf).toBe('B3');
  });

  it('BİR ders bile çevrilemiyorsa sonuç BELİRSİZ — eksikten not üretilmez', () => {
    const m = { hostCourses: [{ code: 'CS101' }, { code: 'CS102' }] };
    const r = eslesmeHarfNotu(m, { CS101: 'A' }, 'ects');
    expect(r.ok).toBe(false);
    expect(r.harf).toBe('belirsiz');
    expect(r.sebep).toMatch(/CS102/);
  });

  it('not sistemi tanımlı değilse belirsiz', () => {
    const m = { hostCourses: [{ code: 'CS101' }] };
    expect(eslesmeHarfNotu(m, { CS101: '4' }, '').ok).toBe(false);
  });

  it('karşı kurum dersi olmayan eşleştirme belirsiz', () => {
    expect(eslesmeHarfNotu({ hostCourses: [] }, {}, 'ects').ok).toBe(false);
    expect(eslesmeHarfNotu(null, {}, 'ects').ok).toBe(false);
  });
});

describe('sistemSez', () => {
  const t = (...notlar) => notlar.map((not, i) => ({ kod: 'C' + i, not }));

  it('sözel notlar tanınır', () => {
    const r = sistemSez(t('very good', 'sufficient'));
    expect(r.sistem).toBe('metin');
    expect(r.kesin).toBe(true);
  });

  it('İKİ HARFLİ kod bizim harf tablomuzu kesinleştirir', () => {
    expect(sistemSez(t('AA', 'BB', 'CC')).sistem).toBe('harf');
    expect(sistemSez(t('A', 'B+', 'C')).sistem).toBe('harf');
  });

  it('tek harfli notlar ECTS sayılır — Erasmus standardı', () => {
    // 'C' iki tabloda da var ama farklı karşılık veriyor; karşı kurum
    // yabancı olduğu için ECTS varsayılır ve sebebi yazılır.
    const r = sistemSez(t('A', 'B', 'C', 'E'));
    expect(r.sistem).toBe('ects');
    expect(r.sebep).toMatch(/ECTS/);
  });

  it('sayısal ölçek EN BÜYÜK nottan çıkarılır', () => {
    expect(sistemSez(t('85', '90', '72')).sistem).toBe('yuzluk');
    expect(sistemSez(t('8', '9', '6')).sistem).toBe('onluk');
    expect(sistemSez(t('5', '4', '3')).sistem).toBe('besli');
  });

  it('hepsi 5 ve altındaysa KESİN DEĞİL — 10lük olabilir', () => {
    const r = sistemSez(t('4', '3'));
    expect(r.sistem).toBe('besli');
    expect(r.kesin).toBe(false);
    expect(r.sebep).toMatch(/doğrulayın/);
  });

  it('virgüllü ondalık okunur', () => {
    expect(sistemSez(t('4,5', '3,5')).sistem).toBe('besli');
  });

  it('KARIŞIK transkriptte sistem uydurulmaz', () => {
    const r = sistemSez(t('85', 'very good'));
    expect(r.sistem).toBe('');
    expect(r.kesin).toBe(false);
  });

  it('boş transkriptte sistem yok', () => {
    expect(sistemSez([]).sistem).toBe('');
    expect(sistemSez(null).sistem).toBe('');
  });
});

describe('eslesmeNotlariniHesapla', () => {
  const donus = [
    { id: 'm1', hostCourses: [{ code: 'CS101' }, { code: 'CS102' }] },
    { id: 'm2', hostCourses: [{ code: 'PHY200' }] },
  ];

  it('her ders için HAM not ve HARF karşılığı yazılır', () => {
    const r = eslesmeNotlariniHesapla(
      donus,
      [
        { kod: 'CS101', not: 'A' },
        { kod: 'CS102', not: 'C' },
        { kod: 'PHY200', not: 'E' },
      ],
      'ects'
    );
    expect(r[0].hostGrades).toEqual({ 0: 'A', 1: 'C' });
    expect(r[0].homeGrades).toEqual({ 0: 'A', 1: 'B2' });
    expect(r[1].homeGrades).toEqual({ 0: 'C3' });
    expect(r[0].eksik).toEqual([]);
  });

  it('notu OLMAYAN ders için değer YAZILMAZ, eksik olarak bildirilir', () => {
    // Uydurulmuş bir 'A' yazmak yerine boş bırakılır.
    const r = eslesmeNotlariniHesapla(donus, [{ kod: 'CS101', not: 'A' }], 'ects');
    expect(r[0].hostGrades).toEqual({ 0: 'A' });
    expect(r[0].homeGrades).toEqual({ 0: 'A' });
    expect(r[0].eksik).toEqual(['CS102']);
    expect(r[1].eksik).toEqual(['PHY200']);
  });

  it('çevrilemeyen not HAM haliyle durur ama HARF yazılmaz', () => {
    const r = eslesmeNotlariniHesapla(donus, [{ kod: 'CS101', not: 'Z' }], 'ects');
    expect(r[0].hostGrades).toEqual({ 0: 'Z' });
    expect(r[0].homeGrades).toEqual({});
    expect(r[0].eksik[0]).toMatch(/CS101/);
  });

  it('boş girdilerde çökmez', () => {
    expect(eslesmeNotlariniHesapla(null, null, 'ects')).toEqual([]);
  });
});

// ── DENKLİK NOTU EŞLEŞTİRMENİN BÜTÜNÜNE AİTTİR ──
// Belge, kendi kurumumuzdaki dersin satırına tek bir not basar. İki karşı
// kurum dersi tek dersimize sayıldığında o not ilk dersin notu değil, AKTS
// ağırlıklı ortalamadır.
describe('eslesmeNotlariniHesapla — toplu denklik notu', () => {
  it('N karşı ders → 1 kendi dersimiz: AKTS ağırlıklı ortalama', () => {
    const m = {
      id: 'm1',
      hostCourses: [
        { code: 'CS101', credits: 5 },
        { code: 'CS102', credits: 2 },
      ],
      homeCourses: [{ code: 'BIL203', credits: 7 }],
    };
    const [r] = eslesmeNotlariniHesapla(
      [m],
      [
        { kod: 'CS101', not: 'A' },
        { kod: 'CS102', not: 'C' },
      ],
      'ects'
    );
    // Ders bazlı ayrıntı korunur...
    expect(r.homeGrades).toEqual({ 0: 'A', 1: 'B2' });
    // ...ama dersimize yazılacak tek not ağırlıklı ortalamadır.
    const beklenen = eslesmeHarfNotu(
      m,
      { [kodAnahtari('CS101')]: 'A', [kodAnahtari('CS102')]: 'C' },
      'ects'
    );
    expect(beklenen.ok).toBe(true);
    expect(r.homeGrade).toBe(beklenen.harf);
    // Ağırlıklı ortalama, iki dersin harflerinin arasında kalır.
    expect(['A', 'B2']).not.toContain(r.homeGrade);
  });

  it('1:1 eşleştirmede toplu not ders notuyla aynıdır', () => {
    const m = { id: 'm2', hostCourses: [{ code: 'PHY200' }], homeCourses: [{ code: 'FIZ101' }] };
    const [r] = eslesmeNotlariniHesapla([m], [{ kod: 'PHY200', not: 'B' }], 'ects');
    expect(r.homeGrade).toBe(r.homeGrades[0]);
  });

  it('eksik not varken toplu not YAZILMAZ — yarım belge basılmaz', () => {
    const m = {
      id: 'm3',
      hostCourses: [{ code: 'CS101' }, { code: 'CS102' }],
      homeCourses: [{ code: 'BIL203' }],
    };
    const [r] = eslesmeNotlariniHesapla([m], [{ kod: 'CS101', not: 'A' }], 'ects');
    expect(r.homeGrade).toBe('');
    expect(r.eksik).toEqual(['CS102']);
  });
});

describe('satirNotlari', () => {
  it('ham not ders bazlıdır, harf notu eşleştirmenin bütününe aittir', () => {
    const m = { hostGrades: { 0: '5', 1: '4' }, homeGrades: { 0: 'A', 1: 'B2' }, homeGrade: 'B1' };
    expect(satirNotlari(m, 0)).toEqual({ ham: '5', harf: 'B1' });
    expect(satirNotlari(m, 1)).toEqual({ ham: '4', harf: 'B1' });
  });

  it('toplu not yoksa ders bazlı harfe düşülür', () => {
    const m = { hostGrades: { 0: '5' }, homeGrades: { 0: 'A' } };
    expect(satirNotlari(m, 0)).toEqual({ ham: '5', harf: 'A' });
  });

  it('eski tekil alanlar hâlâ okunur', () => {
    expect(satirNotlari({ hostGrade: '85', homeGrade: 'BA' }, 0)).toEqual({
      ham: '85',
      harf: 'BA',
    });
  });

  it('not yoksa boş döner — belgeye uydurulmuş not basılmaz', () => {
    expect(satirNotlari({}, 0)).toEqual({ ham: '', harf: '' });
    expect(satirNotlari(null, 3)).toEqual({ ham: '', harf: '' });
  });
});
