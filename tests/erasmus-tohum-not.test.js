// Kayda geçmiş sahte notu gerçeğinden ayırmak.
//
// Canlı veri şunu gösterdi: ikisi AYNI eşleştirmenin içinde yan yana durur.
// Eski tekil alanlarda hızlı doldurmanın bıraktığı 'A'/'Muaf' çifti,
// ders bazlı alanlarda akademisyenin girdiği gerçek notlar. Karar bu yüzden
// eşleştirme düzeyinde değil, ders indeksi düzeyinde verilir.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  notCiftleri,
  tohumCiftiMi,
  tohumlariBosalt,
  notlariBosalt,
  tekilSizintisiVarMi,
} = require('../server/lib/erasmus-tohum-not.js');

describe('notCiftleri', () => {
  it('tekil alanları ve ders bazlı alanları indeksleyerek toplar', () => {
    const c = notCiftleri({
      hostGrade: 'A',
      homeGrade: 'Muaf',
      hostGrades: { 0: '5', 1: '4.5' },
      homeGrades: { 0: 'A' },
    });
    expect(c.map((x) => x.indeks)).toEqual(['*', '0', '1']);
    expect(c[1]).toMatchObject({ host: '5', home: 'A' });
    expect(c[2]).toMatchObject({ host: '4.5', home: undefined });
  });

  it('boş dizge ve yokluk sayılmaz', () => {
    expect(notCiftleri({ hostGrade: '', homeGrade: '   ', hostGrades: {} })).toEqual([]);
    expect(notCiftleri(null)).toEqual([]);
  });
});

describe('tohumCiftiMi', () => {
  it("'A' + 'Muaf' çifti tohumdur", () => {
    expect(tohumCiftiMi({ host: 'A', home: 'Muaf' })).toBe(true);
    expect(tohumCiftiMi({ host: ' a ', home: 'MUAF' })).toBe(true);
  });

  it('tek başına bir değer tohum sayılmaz — imza ÇİFTTİR', () => {
    // 'A' harf ölçeğinde geçerli bir nottur, 'Muaf' geçerli bir karardır.
    expect(tohumCiftiMi({ host: 'A', home: '' })).toBe(false);
    expect(tohumCiftiMi({ host: '', home: 'Muaf' })).toBe(false);
  });

  it('bir tarafı gerçek değerle değiştirilmiş çifte dokunulmaz', () => {
    expect(tohumCiftiMi({ host: '10', home: 'Muaf' })).toBe(false);
    expect(tohumCiftiMi({ host: 'A', home: 'BA' })).toBe(false);
  });
});

describe('tohumlariBosalt', () => {
  it('saf tohum eşleştirmesini boşaltır', () => {
    const { temiz, silinen } = tohumlariBosalt({ id: 'r1', hostGrade: 'A', homeGrade: 'Muaf' });
    expect(temiz).toEqual({ id: 'r1' });
    expect(silinen).toHaveLength(1);
  });

  it('tekil tohumu siler, ders bazlı GERÇEK notu korur — canlı kalıp', () => {
    // Ayten Nisa DİK / Zeynep AKBULUT kayıtlarındaki biçim.
    const { temiz, silinen, kalan } = tohumlariBosalt({
      id: 'r1',
      hostGrade: 'A',
      homeGrade: 'Muaf',
      hostGrades: { 0: '5' },
      homeGrades: { 0: 'A' },
    });
    expect(temiz.hostGrade).toBeUndefined();
    expect(temiz.homeGrade).toBeUndefined();
    expect(temiz.hostGrades).toEqual({ 0: '5' });
    expect(temiz.homeGrades).toEqual({ 0: 'A' });
    expect(silinen).toHaveLength(1);
    expect(kalan).toHaveLength(1);
  });

  it('ders bazlı alanların İÇİNDEKİ tohumu da ayıklar', () => {
    // Neslihan DEMİRCİ: 0. ders gerçek, 1. ve 2. ders tohum.
    const { temiz, silinen } = tohumlariBosalt({
      id: 'r1',
      hostGrade: 'A',
      homeGrade: 'Muaf',
      hostGrades: { 0: '5', 1: 'A', 2: 'A' },
      homeGrades: { 0: 'A', 1: 'Muaf', 2: 'Muaf' },
    });
    expect(temiz.hostGrades).toEqual({ 0: '5' });
    expect(temiz.homeGrades).toEqual({ 0: 'A' });
    expect(silinen).toHaveLength(3); // tekil + ders1 + ders2
  });

  it('gerçek notlara hiç dokunmaz', () => {
    // Yunus Emre ÖNEL: onluk/beşli ham not → harf karşılığı.
    const m = { id: 'r1', hostGrade: '4.5', homeGrade: 'B1' };
    const { temiz, silinen, kalan } = tohumlariBosalt(m);
    expect(temiz).toEqual(m);
    expect(silinen).toEqual([]);
    expect(kalan).toHaveLength(1);
  });

  it("gerçek ham not + 'Muaf' çifti KORUNUR", () => {
    // Halil Talha GÜNDÜZ: host='10'. Kararı insan vermiş; tahmin edilmez.
    const m = { id: 'r1', hostGrade: '10', homeGrade: 'Muaf' };
    expect(tohumlariBosalt(m).temiz).toEqual(m);
  });

  it('özgün eşleştirmeyi değiştirmez', () => {
    const m = {
      id: 'r1',
      hostGrade: 'A',
      homeGrade: 'Muaf',
      hostGrades: { 0: 'A' },
      homeGrades: { 0: 'Muaf' },
    };
    tohumlariBosalt(m);
    expect(m.hostGrade).toBe('A');
    expect(m.hostGrades).toEqual({ 0: 'A' });
  });

  it('boşalan not haritaları kayıtta çöp bırakmaz', () => {
    const { temiz } = tohumlariBosalt({
      id: 'r1',
      hostGrades: { 0: 'A' },
      homeGrades: { 0: 'Muaf' },
    });
    expect(temiz).toEqual({ id: 'r1' });
  });
});

describe('tekilSizintisiVarMi', () => {
  // Gösterim `homeGrades[i] ?? homeGrade` okur: tek bir 'Muaf', notu hiç
  // girilmemiş dersleri de "Muaf" gösterir.
  it('ders bazlı karşılığı olmayan ders varsa sızıntı vardır', () => {
    expect(tekilSizintisiVarMi({ homeGrade: 'Muaf', hostGrades: { 0: 'F2' } }, 1)).toBe(true);
  });

  it('her ders kendi notunu taşıyorsa sızıntı yok', () => {
    const m = { homeGrade: 'Muaf', hostGrades: { 0: '5' }, homeGrades: { 0: 'A' } };
    expect(tekilSizintisiVarMi(m, 1)).toBe(false);
  });

  it('tekil alan boşsa sızıntı yok', () => {
    expect(tekilSizintisiVarMi({ hostGrades: { 0: '5' } }, 2)).toBe(false);
  });
});

describe('notlariBosalt', () => {
  it('yalnız not alanlarını düşürür', () => {
    const m = { id: 'r1', hostCourses: [{ name: 'Fizik' }], hostGrade: 'A', status: 'approved' };
    expect(notlariBosalt(m)).toEqual({
      id: 'r1',
      hostCourses: [{ name: 'Fizik' }],
      status: 'approved',
    });
  });
});
