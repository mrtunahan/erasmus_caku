import { describe, it, expect } from 'vitest';
import {
  baglamaGecerliMi,
  baglamaYamalari,
  baglantiliMi,
  bagliNolar,
  cakisanKayit,
  etkinNumara,
  kapsamNumaralari,
  kayitNumarasi,
  kisininKayitlari,
  kisininProgramlari,
  koparmaYamalari,
} from '../lib/cap-numara-baglama.js';

// Ayşe: Bilgisayar'da 2021001, Kimya'da 2021777 — çift numaralı ÇAP.
const AYSE_BIL = {
  studentNumber: '2021001',
  firstName: 'Ayşe',
  lastName: 'Demir',
  departmentId: 'bilgisayar',
  bagliOgrenciNolar: ['2021777'],
};
const AYSE_KIM = {
  studentNumber: '2021777',
  firstName: 'Ayşe',
  lastName: 'Demir',
  departmentId: 'kimya',
  bagliOgrenciNolar: ['2021001'],
};
// Mehmet: tek numarayla ÇAP — ikinci program additionalDepartments'ta.
const MEHMET = {
  studentNumber: '2022050',
  firstName: 'Mehmet',
  lastName: 'Yılmaz',
  departmentId: 'bilgisayar',
  additionalDepartments: ['makine'],
};
const HEPSI = [AYSE_BIL, AYSE_KIM, MEHMET];
const ekler = (k) => (k && Array.isArray(k.additionalDepartments) ? k.additionalDepartments : []);

describe('kayitNumarasi / bagliNolar', () => {
  it('numarayı iki alandan da okur', () => {
    expect(kayitNumarasi({ studentNumber: '1' })).toBe('1');
    expect(kayitNumarasi({ ogrenciNo: '2' })).toBe('2');
    expect(kayitNumarasi(null)).toBe('');
  });

  it('bağlı numaraları tekilleştirir, kendini dışlar', () => {
    const k = { studentNumber: '1', bagliOgrenciNolar: ['2', '2', '1', '', '3'] };
    expect(bagliNolar(k)).toEqual(['2', '3']);
    expect(bagliNolar({})).toEqual([]);
  });

  it('baglantiliMi', () => {
    expect(baglantiliMi(AYSE_BIL, '2021777')).toBe(true);
    expect(baglantiliMi(AYSE_BIL, '9999')).toBe(false);
  });
});

describe('baglamaGecerliMi', () => {
  it('farklı bölümlerdeki iki numara bağlanabilir', () => {
    const a = { ...AYSE_BIL, bagliOgrenciNolar: [] };
    const b = { ...AYSE_KIM, bagliOgrenciNolar: [] };
    expect(baglamaGecerliMi(a, b).olur).toBe(true);
  });

  it('AYNI BÖLÜMDE iki numara bağlanamaz — bu mükerrer kayıttır', () => {
    const a = { studentNumber: '1', departmentId: 'bilgisayar' };
    const b = { studentNumber: '2', departmentId: 'bilgisayar' };
    const s = baglamaGecerliMi(a, b);
    expect(s.olur).toBe(false);
    expect(s.sebep).toMatch(/mükerrer/i);
  });

  it('kendine bağlanamaz', () => {
    expect(baglamaGecerliMi(AYSE_BIL, AYSE_BIL).olur).toBe(false);
  });

  it('zaten bağlıysa tekrar bağlanmaz', () => {
    expect(baglamaGecerliMi(AYSE_BIL, AYSE_KIM).olur).toBe(false);
  });

  it('numarasız kayıt bağlanamaz', () => {
    expect(baglamaGecerliMi({ departmentId: 'x' }, AYSE_KIM).olur).toBe(false);
  });
});

describe('baglamaYamalari / koparmaYamalari', () => {
  it('bağ KARŞILIKLI yazılır', () => {
    const a = { studentNumber: '1', departmentId: 'bilgisayar' };
    const b = { studentNumber: '2', departmentId: 'kimya' };
    expect(baglamaYamalari(a, b)).toEqual([
      { no: '1', bagliOgrenciNolar: ['2'] },
      { no: '2', bagliOgrenciNolar: ['1'] },
    ]);
  });

  it('mevcut bağlar korunur', () => {
    const a = { studentNumber: '1', bagliOgrenciNolar: ['3'], departmentId: 'bilgisayar' };
    const b = { studentNumber: '2', departmentId: 'kimya' };
    expect(baglamaYamalari(a, b)[0].bagliOgrenciNolar).toEqual(['3', '2']);
  });

  it('koparma da karşılıklıdır', () => {
    expect(koparmaYamalari(AYSE_BIL, AYSE_KIM)).toEqual([
      { no: '2021001', bagliOgrenciNolar: [] },
      { no: '2021777', bagliOgrenciNolar: [] },
    ]);
  });
});

describe('kisininKayitlari', () => {
  it('iki numaralı kişinin iki kaydını da bulur', () => {
    const bulunan = kisininKayitlari(HEPSI, '2021001').map(kayitNumarasi);
    expect(bulunan.sort()).toEqual(['2021001', '2021777']);
  });

  it('ters yönden de bulur', () => {
    expect(kisininKayitlari(HEPSI, '2021777').map(kayitNumarasi).sort()).toEqual([
      '2021001',
      '2021777',
    ]);
  });

  it('TEK YÖNLÜ kalmış eski bağ da izlenir', () => {
    // Bağ yalnız bir tarafa yazılmışsa öğrenci bir numarayla girince
    // programını görüp öbürüyle göremezdi.
    const a = { studentNumber: 'A', departmentId: 'bilgisayar', bagliOgrenciNolar: ['B'] };
    const b = { studentNumber: 'B', departmentId: 'kimya' };
    expect(kisininKayitlari([a, b], 'B').map(kayitNumarasi).sort()).toEqual(['A', 'B']);
  });

  it('geçişli bağ (A-B, B-C) izlenir', () => {
    const a = { studentNumber: 'A', departmentId: 'd1', bagliOgrenciNolar: ['B'] };
    const b = { studentNumber: 'B', departmentId: 'd2', bagliOgrenciNolar: ['A', 'C'] };
    const c = { studentNumber: 'C', departmentId: 'd3', bagliOgrenciNolar: ['B'] };
    expect(kisininKayitlari([a, b, c], 'A').map(kayitNumarasi).sort()).toEqual(['A', 'B', 'C']);
  });

  it('bağsız öğrenci yalnız kendini bulur', () => {
    expect(kisininKayitlari(HEPSI, '2022050').map(kayitNumarasi)).toEqual(['2022050']);
  });

  it('boş girdi çökmez', () => {
    expect(kisininKayitlari(null, '')).toEqual([]);
    expect(kisininKayitlari(HEPSI, 'yok')).toEqual([]);
  });
});

describe('kapsamNumaralari', () => {
  it('kendi + bağlı numaralar', () => {
    expect(kapsamNumaralari(HEPSI, '2021001').sort()).toEqual(['2021001', '2021777']);
  });

  it('bağsız öğrencide yalnız kendi numarası', () => {
    expect(kapsamNumaralari(HEPSI, '2022050')).toEqual(['2022050']);
  });

  it('kaydı olmayan numarada bile kendi numarası döner', () => {
    // Sunucu kapsamı bundan kurulur; boş dönerse öğrenci kendi verisini
    // de göremezdi.
    expect(kapsamNumaralari([], '2021001')).toEqual(['2021001']);
  });
});

describe('kisininProgramlari', () => {
  it('giriş yapılan program BAŞTA durur', () => {
    const p = kisininProgramlari(HEPSI, '2021777', ekler);
    expect(p[0]).toEqual({ departmentId: 'kimya', no: '2021777', ana: true });
    expect(p[1]).toEqual({ departmentId: 'bilgisayar', no: '2021001', ana: false });
  });

  it('her programın KENDİ numarası taşınır', () => {
    const p = kisininProgramlari(HEPSI, '2021001', ekler);
    expect(p.map((x) => x.no)).toEqual(['2021001', '2021777']);
  });

  it('aynı numaralı ÇAP da kapsanır', () => {
    const p = kisininProgramlari(HEPSI, '2022050', ekler);
    expect(p).toEqual([
      { departmentId: 'bilgisayar', no: '2022050', ana: true },
      { departmentId: 'makine', no: '2022050', ana: false },
    ]);
  });

  it('aynı bölüm iki kez listelenmez', () => {
    const a = { studentNumber: 'A', departmentId: 'd1', bagliOgrenciNolar: ['B'] };
    const b = { studentNumber: 'B', departmentId: 'd1', bagliOgrenciNolar: ['A'] };
    expect(kisininProgramlari([a, b], 'A', ekler).length).toBe(1);
  });

  it('kaydı olmayan numarada boş liste', () => {
    expect(kisininProgramlari(HEPSI, 'yok', ekler)).toEqual([]);
  });
});

describe('etkinNumara', () => {
  const programlar = kisininProgramlari(HEPSI, '2021001', ekler);

  it('aktif bölümün numarasını verir', () => {
    expect(etkinNumara(programlar, 'kimya', '2021001')).toBe('2021777');
    expect(etkinNumara(programlar, 'bilgisayar', '2021001')).toBe('2021001');
  });

  it('bilinmeyen bölümde giriş numarasına düşer', () => {
    expect(etkinNumara(programlar, 'makine', '2021001')).toBe('2021001');
    expect(etkinNumara([], '', '2021001')).toBe('2021001');
  });
});

describe('cakisanKayit', () => {
  it('ÇAP eklenecek bölümde kişinin BAŞKA kaydı varsa yakalar', () => {
    // additionalDepartments yazılsaydı Ayşe Kimya listesinde iki kez çıkardı.
    expect(kayitNumarasi(cakisanKayit(HEPSI, AYSE_BIL, 'kimya'))).toBe('2021777');
  });

  it('bağ kurulmamış ama aynı adlı kaydı da yakalar', () => {
    const bagsizBil = { ...AYSE_BIL, bagliOgrenciNolar: [] };
    const bagsizKim = { ...AYSE_KIM, bagliOgrenciNolar: [] };
    expect(kayitNumarasi(cakisanKayit([bagsizBil, bagsizKim], bagsizBil, 'kimya'))).toBe('2021777');
  });

  it('çakışma yoksa null', () => {
    expect(cakisanKayit(HEPSI, AYSE_BIL, 'makine')).toBe(null);
    expect(cakisanKayit(HEPSI, MEHMET, 'makine')).toBe(null);
  });

  it('boş girdi çökmez', () => {
    expect(cakisanKayit(null, AYSE_BIL, '')).toBe(null);
  });
});
