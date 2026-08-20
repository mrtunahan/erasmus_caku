// Erasmus dönüşü: transkript, not çevirisi, ders değişikliği.
//
// Harf notu HESAPLANIR, elle girilmez — öğrencinin müdahale edebileceği tek
// şey transkriptteki ham nottur. Bu yüzden çevirinin kuralları burada
// sabitlenir: yanlış çevrilen bir not sessizce yanlış harf notu üretir.
import { describe, it, expect } from 'vitest';
import {
  NOT_SISTEMLERI,
  notCevir,
  puandanHarf,
  kodAnahtari,
  dersDegisikligi,
  transkriptEslestir,
  eslesmeHarfNotu,
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
