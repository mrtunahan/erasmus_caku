import { describe, it, expect } from 'vitest';
import {
  mezuniyetHesapla,
  mezKuralNormalize,
  mezProgramlar,
  mezDersProgramda,
  mezProgramKurali,
} from '../lib/mezuniyet.js';

const kural = {
  toplamYariyil: 8,
  isyeriYariyilSayisi: 1,
  toplamAkts: 240,
  programlar: ['lis-8-0', 'lis-7-1'],
};
// 8. yarıyıl dersi yalnız 8+0'da; işyeri eğitimi dersi yalnız 7+1'de.
const mufredat = [
  { code: 'BİL101', name: 'Giriş', akts: 5, statu: 'Z', sinif: 1, donem: 'Fall' },
  {
    code: 'BİL402',
    name: 'Dağıtık Sistemler',
    akts: 5,
    statu: 'Z',
    sinif: 4,
    donem: 'Spring',
    mufredatlar: ['lis-8-0'],
  },
  {
    code: 'BİL499',
    name: 'İşyeri Eğitimi',
    akts: 30,
    statu: 'Z',
    sinif: 4,
    donem: 'Fall',
    mufredatlar: ['lis-7-1'],
  },
];
const alinan = [
  { kod: 'BİL101', ad: 'Giriş', akts: 5, not: 'AA' },
  { kod: 'BİL402', ad: 'Dağıtık Sistemler', akts: 5, not: 'BB' },
];

describe('müfredat seçimi', () => {
  it('kayıtta liste yoksa program yapısına uyan kalıp tek müfredattır', () => {
    expect(mezKuralNormalize({ toplamYariyil: 8, isyeriYariyilSayisi: 1 }).programlar).toEqual([
      'lis-7-1',
    ]);
    expect(mezProgramlar(kural).map((p) => p.ad)).toEqual(['Lisans — 8+0', 'Lisans — 7+1']);
  });

  it('bilinmeyen müfredat kimliği atılır', () => {
    expect(mezKuralNormalize({ programlar: ['lis-8-0', 'uydurma'] }).programlar).toEqual([
      'lis-8-0',
    ]);
  });

  it('işaretsiz ders bütün müfredatlarda sayılır', () => {
    expect(mezDersProgramda({ code: 'X' }, 'lis-7-1')).toBe(true);
    expect(mezDersProgramda({ mufredatlar: ['lis-8-0'] }, 'lis-7-1')).toBe(false);
    expect(mezDersProgramda({ mufredatlar: ['lis-8-0'] }, '')).toBe(true);
  });

  it('seçilen müfredatın yapısı kullanılır', () => {
    expect(mezProgramKurali(kural, 'lis-8-0').isyeriYariyilSayisi).toBe(0);
    expect(mezProgramKurali(kural, 'lis-7-1').isyeriYariyilSayisi).toBe(1);
    // Bölümün listesinde olmayan müfredat yapıyı değiştirmez.
    expect(mezProgramKurali(kural, 'yil5').toplamYariyil).toBe(8);
  });

  it('8+0 öğrencisi 7+1 dersini almadı diye eksik görünmez', () => {
    const s80 = mezuniyetHesapla(mufredat, alinan, kural, { program: 'lis-8-0' });
    expect(s80.kalanZorunlu).toEqual([]);
    expect(s80.program).toBe('lis-8-0');
    expect(s80.kayitlar.every((r) => r.mufredatta)).toBe(true);
  });

  it('7+1 öğrencisinde 8+0 dersi müfredat dışıdır, işyeri eğitimi kalan dersi değildir', () => {
    const s71 = mezuniyetHesapla(mufredat, alinan, kural, { program: 'lis-7-1' });
    // BİL499 7. yarıyılda (4. sınıf güz) ve 7+1'de işyeri yarıyılı 8. yarıyıl → kalan ders.
    expect(s71.kalanZorunlu.map((c) => c.code)).toEqual(['BİL499']);
    expect(s71.kayitlar.find((r) => r.kod === 'BİL402').mufredatta).toBe(false);
  });
});
