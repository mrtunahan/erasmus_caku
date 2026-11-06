import { describe, it, expect } from 'vitest';
import { mezuniyetHesapla, mezSilinmeSiniflandir, mezAdBenzerMi } from '../lib/mezuniyet.js';

const mufredat = [
  {
    code: 'MAT142',
    name: 'Ayrık Matematik ve Uygulamaları',
    akts: 5,
    statu: 'Z',
    sinif: 1,
    donem: 'Spring',
  },
  {
    code: 'BİL101',
    name: 'Bilgisayar Mühendisliğine Giriş',
    akts: 5,
    statu: 'Z',
    sinif: 1,
    donem: 'Fall',
  },
  {
    code: 'BİL201',
    name: 'Algoritma ve Veri Yapıları I',
    akts: 6,
    statu: 'Z',
    sinif: 2,
    donem: 'Fall',
  },
  { code: 'BİL471', name: 'Görüntü İşleme', akts: 5, statu: 'S', sinif: 4, donem: 'Fall' },
];
const sinifla = (dersler) => mezSilinmeSiniflandir(mezuniyetHesapla(mufredat, dersler, {}, {}));

describe('ad benzerliği', () => {
  it('ad sonuna "ve Uygulamaları" eklenmiş ders benzerdir', () => {
    expect(mezAdBenzerMi('Ayrık Matematik', 'Ayrık Matematik ve Uygulamaları')).toBe(true);
    expect(mezAdBenzerMi('AYRIK MATEMATİK', 'ayrik matematik ve uygulamalari')).toBe(true);
  });
  it('sıra numarası farklıysa benzer değildir', () => {
    expect(mezAdBenzerMi('Matematik I', 'Matematik II')).toBe(false);
    expect(mezAdBenzerMi('Fizik 1', 'Fizik 2')).toBe(false);
  });
  it('tek kelimelik adla ilgisiz uzantı benzer sayılmaz', () => {
    expect(mezAdBenzerMi('Fizik', 'Fizik Laboratuvarı')).toBe(false);
    expect(mezAdBenzerMi('Fizik', 'Mühendislik Ekonomisi')).toBe(false);
  });
});

describe('silinme sınıflandırması', () => {
  it('seçmeli, başarısız ve sonradan geçilmemiş ders silinmeli', () => {
    const s = sinifla([
      {
        kod: 'BİL471',
        ad: 'Görüntü İşleme',
        akts: 5,
        not: 'FF',
        statu: 'S',
        yil: '2024-2025',
        yariyil: 'Güz',
      },
    ]);
    expect(s.silinmeli.map((x) => x.r.kod)).toEqual(['BİL471']);
    expect(s.silinmeli[0].neden).toMatch(/Seçmeli/);
  });

  it('sonradan geçilen seçmeli ders listeye girmez', () => {
    const s = sinifla([
      {
        kod: 'BİL471',
        ad: 'Görüntü İşleme',
        akts: 5,
        not: 'FF',
        statu: 'S',
        yil: '2023-2024',
        yariyil: 'Güz',
      },
      {
        kod: 'BİL471',
        ad: 'Görüntü İşleme',
        akts: 5,
        not: 'BB',
        statu: 'S',
        yil: '2024-2025',
        yariyil: 'Güz',
      },
    ]);
    expect(s.silinmeli).toEqual([]);
  });

  it('kodu ve adı değişmiş benzer ders geçilmişse kalınan eski ders silinmeli (zorunlu da olsa)', () => {
    const s = sinifla([
      {
        kod: 'MAT112',
        ad: 'Ayrık Matematik',
        akts: 4,
        not: 'FF',
        statu: 'Z',
        yil: '2021-2022',
        yariyil: 'Bahar',
      },
      {
        kod: 'MAT142',
        ad: 'Ayrık Matematik ve Uygulamaları',
        akts: 5,
        not: 'CC',
        statu: 'Z',
        yil: '2022-2023',
        yariyil: 'Bahar',
      },
    ]);
    expect(s.silinmeli.map((x) => x.r.kod)).toEqual(['MAT112']);
    expect(s.silinmeli[0].neden).toMatch(/Benzer ders geçilmiş: MAT142/);
    expect(s.engel.map((x) => x.kod)).not.toContain('MAT142');
  });

  it('aynı ders birkaç kez kalındıysa bir kez, en son dönemiyle', () => {
    const s = sinifla([
      {
        kod: 'BİL471',
        ad: 'Görüntü İşleme',
        akts: 5,
        not: 'FF',
        statu: 'S',
        yil: '2022-2023',
        yariyil: 'Güz',
      },
      {
        kod: 'BİL471',
        ad: 'Görüntü İşleme',
        akts: 5,
        not: 'DZ',
        statu: 'S',
        yil: '2024-2025',
        yariyil: 'Güz',
      },
      {
        kod: 'BİL471',
        ad: 'Görüntü İşleme',
        akts: 5,
        not: 'FD',
        statu: 'S',
        yil: '2023-2024',
        yariyil: 'Güz',
      },
    ]);
    expect(s.silinmeli).toHaveLength(1);
    expect(s.silinmeli[0].r.yil).toBe('2024-2025');
  });

  it('kalınan zorunlu ders silinmez, engel olarak çıkar', () => {
    const s = sinifla([
      {
        kod: 'BİL201',
        ad: 'Algoritma ve Veri Yapıları I',
        akts: 6,
        not: 'FF',
        statu: 'Z',
        yil: '2023-2024',
        yariyil: 'Güz',
      },
    ]);
    expect(s.silinmeli).toEqual([]);
    expect(s.engel.map((x) => x.kod)).toContain('BİL201');
    expect(s.engel.map((x) => x.kod)).toContain('BİL101'); // hiç alınmamış
  });

  it('notu tanınmayan ya da statüsü bilinmeyen başarısız ders kontrole düşer', () => {
    const s = sinifla([
      {
        kod: 'XYZ100',
        ad: 'Bilinmeyen Ders',
        akts: 3,
        not: 'FF',
        yil: '2023-2024',
        yariyil: 'Güz',
      },
      {
        kod: 'ABC200',
        ad: 'Okunamayan Not',
        akts: 3,
        not: '??',
        statu: 'S',
        yil: '2023-2024',
        yariyil: 'Güz',
      },
    ]);
    expect(s.kontrol.map((x) => x.r.kod).sort()).toEqual(['ABC200', 'XYZ100']);
    expect(s.silinmeli).toEqual([]);
  });
});
