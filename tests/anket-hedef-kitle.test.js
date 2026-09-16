import { describe, it, expect } from 'vitest';
import {
  akademisyenKitlesi,
  kitleOzetMetni,
  mezunMu,
  ogrenciBolumleri,
  ogrenciGrubaUyarMi,
  ogrenciKapsamda,
  ogrenciKitlesi,
} from '../lib/anket-hedef-kitle.js';

const ayar = { tarih: '2026-09-16T00:00:00Z', referansYil: 2026 };
const ogr = (no, ek) => ({ studentNumber: no, departmentId: 'bilgisayar', ...(ek || {}) });

describe('ogrenciBolumleri', () => {
  it('ana bölüm ve ÇAP bölümlerini birleştirir', () => {
    expect(
      ogrenciBolumleri({ departmentId: 'bilgisayar', additionalDepartments: ['elektrik'] })
    ).toEqual(['bilgisayar', 'elektrik']);
  });

  it('boş alanlar düşer', () => {
    expect(ogrenciBolumleri({ departmentId: '', additionalDepartments: [null, ''] })).toEqual([]);
    expect(ogrenciBolumleri(null)).toEqual([]);
  });
});

describe('ogrenciKapsamda', () => {
  it('kapsam verilmezse herkes içeridedir', () => {
    expect(ogrenciKapsamda(ogr('260905001'), null)).toBe(true);
    expect(ogrenciKapsamda(ogr('260905001'), [])).toBe(true);
  });

  it('bölüm eşleşmesi aranır', () => {
    expect(ogrenciKapsamda(ogr('260905001'), ['bilgisayar'])).toBe(true);
    expect(ogrenciKapsamda(ogr('260905001'), ['kimya'])).toBe(false);
  });

  it('ÇAP öğrencisi ikinci bölümünden de yakalanır', () => {
    const o = ogr('260905001', { additionalDepartments: ['elektrik'] });
    expect(ogrenciKapsamda(o, ['elektrik'])).toBe(true);
  });
});

describe('mezunMu', () => {
  it('üç ayrı işaretin hepsini tanır', () => {
    expect(mezunMu({ isAlumni: true })).toBe(true);
    expect(mezunMu({ mezun: true })).toBe(true);
    expect(mezunMu({ status: 'mezun' })).toBe(true);
    expect(mezunMu({})).toBe(false);
  });
});

describe('ogrenciGrubaUyarMi', () => {
  it('“Tüm öğrenciler” herkesi alır', () => {
    expect(ogrenciGrubaUyarMi(ogr('bozuk'), 'Tüm öğrenciler', ayar).uyar).toBe(true);
    expect(ogrenciGrubaUyarMi(ogr('bozuk'), '', ayar).uyar).toBe(true);
  });

  it('sınıf grubu numaradan eşleşir', () => {
    expect(ogrenciGrubaUyarMi(ogr('260905001'), '1. sınıf', ayar).uyar).toBe(true);
    expect(ogrenciGrubaUyarMi(ogr('230905001'), '1. sınıf', ayar).uyar).toBe(false);
    expect(ogrenciGrubaUyarMi(ogr('230905001'), '4. sınıf', ayar).uyar).toBe(true);
  });

  it('sınıfı çözülemeyen öğrenci sınıf grubuna GİRMEZ', () => {
    const r = ogrenciGrubaUyarMi(ogr('bozuk'), '1. sınıf', ayar);
    expect(r.uyar).toBe(false);
    expect(r.sebep).toBe('sinif-bilinmiyor');
  });

  it('mezun sınıf gruplarına girmez, Mezun grubuna girer', () => {
    const m = ogr('230905001', { isAlumni: true });
    expect(ogrenciGrubaUyarMi(m, '4. sınıf', ayar).sebep).toBe('mezun-sinif-gormez');
    expect(ogrenciGrubaUyarMi(m, 'Mezun', ayar).uyar).toBe(true);
    expect(ogrenciGrubaUyarMi(ogr('230905001'), 'Mezun', ayar).uyar).toBe(false);
  });
});

describe('ogrenciKitlesi', () => {
  const liste = [
    ogr('260905001'), // 1. sınıf
    ogr('260905002'), // 1. sınıf
    ogr('250905003'), // 2. sınıf
    ogr('230905004'), // 4. sınıf
    ogr('bozuk05'), // sınıfı çözülemez
    ogr('260905006', { departmentId: 'kimya' }), // kapsam dışı
    ogr('230905007', { isAlumni: true }), // mezun
  ];

  it('kapsam ve grup birlikte süzer', () => {
    const r = ogrenciKitlesi(liste, {
      bolumler: ['bilgisayar'],
      gruplar: ['1. sınıf'],
      secenekler: ayar,
    });
    expect(r.kapsamdaki).toBe(6); // kimya hariç
    expect(r.ulasilan).toBe(2);
    expect(r.gruplar).toEqual([{ grup: '1. sınıf', sayi: 2 }]);
  });

  it('sınıfı çözülemeyenleri ayrıca sayar — sessizce kaybolmasın', () => {
    const r = ogrenciKitlesi(liste, {
      bolumler: ['bilgisayar'],
      gruplar: ['1. sınıf'],
      secenekler: ayar,
    });
    expect(r.sinifiBilinmeyen).toBe(1);
  });

  it('numaradan türetilen sınıfları tahmin olarak işaretler', () => {
    const r = ogrenciKitlesi(liste, {
      bolumler: ['bilgisayar'],
      gruplar: ['2. sınıf'],
      secenekler: ayar,
    });
    expect(r.sinifiNumaradan).toBe(4); // mezun ve çözülemeyen hariç
  });

  it('birden çok grupta kişi bir kez sayılır', () => {
    const r = ogrenciKitlesi(liste, {
      bolumler: ['bilgisayar'],
      gruplar: ['1. sınıf', 'Tüm öğrenciler'],
      secenekler: ayar,
    });
    expect(r.gruplar).toEqual([
      { grup: '1. sınıf', sayi: 2 },
      { grup: 'Tüm öğrenciler', sayi: 6 },
    ]);
    expect(r.ulasilan).toBe(6); // 2 + 6 değil
  });

  it('kapsam verilmezse tüm liste sayılır', () => {
    const r = ogrenciKitlesi(liste, { gruplar: ['Tüm öğrenciler'], secenekler: ayar });
    expect(r.kapsamdaki).toBe(7);
    expect(r.ulasilan).toBe(7);
  });

  it('kimseye ulaşmayan seçim sıfır der — sessizce “başarılı” olmaz', () => {
    const r = ogrenciKitlesi(liste, {
      bolumler: ['orman'],
      gruplar: ['1. sınıf'],
      secenekler: ayar,
    });
    expect(r.kapsamdaki).toBe(0);
    expect(r.ulasilan).toBe(0);
  });

  it('grup seçilmemişse kimseye gitmez', () => {
    const r = ogrenciKitlesi(liste, { bolumler: ['bilgisayar'], gruplar: [], secenekler: ayar });
    expect(r.ulasilan).toBe(0);
  });

  it('numarasız kayıtlar birbirine karışmaz', () => {
    const r = ogrenciKitlesi([{ departmentId: 'bilgisayar' }, { departmentId: 'bilgisayar' }], {
      gruplar: ['Tüm öğrenciler'],
      secenekler: ayar,
    });
    expect(r.ulasilan).toBe(2);
  });
});

describe('akademisyenKitlesi', () => {
  const liste = [
    { name: 'A', departmentId: 'bilgisayar' },
    { name: 'B', departmentId: 'kimya' },
    { name: 'C', departmentId: 'bilgisayar', isMemur: true },
    { name: 'D', departmentIds: ['bilgisayar', 'elektrik'] },
  ];

  it('kapsamdaki akademisyenleri sayar', () => {
    expect(akademisyenKitlesi(liste, { bolumler: ['bilgisayar'] }).ulasilan).toBe(2);
  });

  it('memur akademisyen sayılmaz', () => {
    const r = akademisyenKitlesi(liste, { bolumler: ['bilgisayar'] });
    expect(r.kapsamdaki).toBe(2);
  });

  it('grubun süzmediğini açıkça söyler', () => {
    expect(akademisyenKitlesi(liste, {}).grupSuzulmuyor).toBe(true);
  });

  it('kapsamsızda hepsi sayılır (memur hariç)', () => {
    expect(akademisyenKitlesi(liste, {}).ulasilan).toBe(3);
  });
});

describe('kitleOzetMetni', () => {
  it('öğrencide sayıyı ve eksikleri söyler', () => {
    const m = kitleOzetMetni({ ulasilan: 84, sinifiBilinmeyen: 12 }, 'student');
    expect(m).toMatch(/84 öğrenciye gidecek/);
    expect(m).toMatch(/12 kişinin sınıfı çözülemedi/);
  });

  it('eksik yoksa yalnız sayıyı söyler', () => {
    expect(kitleOzetMetni({ ulasilan: 5, sinifiBilinmeyen: 0 }, 'student')).toBe(
      '5 öğrenciye gidecek'
    );
  });

  it('akademisyende sınıf cümlesi geçmez', () => {
    expect(kitleOzetMetni({ ulasilan: 9 }, 'professor')).toBe('9 akademisyene gidecek');
  });

  it('özet yoksa boş döner', () => {
    expect(kitleOzetMetni(null, 'student')).toBe('');
  });
});
