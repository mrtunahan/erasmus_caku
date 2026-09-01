import { describe, it, expect } from 'vitest';
import {
  DUZENLENEBILIR_ALANLAR,
  YASAK_ALANLAR,
  alanEtiketi,
  duzenleyebilirMi,
  satirCikarilabilirMi,
  degisiklikleriCoz,
  degisiklikGecerliMi,
  eslesmeYamasi,
  duzenlemeOzeti,
  duzenlendiMi,
} from '../lib/muafiyet-duzenleme.js';

const UNI = { isUniversityAdmin: true, name: 'Üni Yetkilisi', identifier: 'uni' };
const HOCA = { role: 'professor', name: 'Ayşe Yılmaz', identifier: 'ayse' };
const OGRENCI = { role: 'student', studentNumber: '220905033' };

function eslesme(ek) {
  return Object.assign(
    {
      tier: 'review',
      localCourse: { code: 'BM201', name: 'Veri Yapıları', akts: '6' },
      sourceCourse: { code: 'CS201', name: 'Data Structures', akts: '5', grade: 'BA' },
    },
    ek
  );
}

describe('duzenleyebilirMi', () => {
  it('üniversite yetkilisi bekleyen satırı düzeltebilir', () => {
    expect(duzenleyebilirMi(UNI, {}, eslesme()).izin).toBe(true);
  });

  it('akademisyen düzeltemez', () => {
    const k = duzenleyebilirMi(HOCA, {}, eslesme());
    expect(k.izin).toBe(false);
    expect(k.neden).toMatch(/üniversite yetkilisi/i);
  });

  it('öğrenci düzeltemez', () => {
    expect(duzenleyebilirMi(OGRENCI, {}, eslesme()).izin).toBe(false);
  });

  it('kullanıcı yoksa düzeltemez', () => {
    expect(duzenleyebilirMi(null, {}, eslesme()).izin).toBe(false);
  });

  it('karar verilmiş satır değiştirilemez', () => {
    const k = duzenleyebilirMi(UNI, {}, eslesme({ adminDecision: 'confirmed' }));
    expect(k.izin).toBe(false);
    expect(k.neden).toMatch(/Karar verilmiş/);
  });

  it('reddedilmiş satır da değiştirilemez', () => {
    expect(duzenleyebilirMi(UNI, {}, eslesme({ adminDecision: 'rejected' })).izin).toBe(false);
  });

  it('iptal edilmiş talep düzeltilemez', () => {
    expect(duzenleyebilirMi(UNI, { status: 'iptal' }, eslesme()).izin).toBe(false);
  });
});

describe('satirCikarilabilirMi', () => {
  it('birden çok satır varsa çıkarılabilir', () => {
    expect(satirCikarilabilirMi(UNI, {}, eslesme(), 3).izin).toBe(true);
  });

  it('tek satırlı talepte çıkarılamaz', () => {
    const k = satirCikarilabilirMi(UNI, {}, eslesme(), 1);
    expect(k.izin).toBe(false);
    expect(k.neden).toMatch(/tek satırı/);
  });

  it('yetkisiz kullanıcı çıkaramaz', () => {
    expect(satirCikarilabilirMi(HOCA, {}, eslesme(), 3).izin).toBe(false);
  });
});

describe('degisiklikleriCoz', () => {
  it('yalnız gerçekten değişen alanları döner', () => {
    const d = degisiklikleriCoz(eslesme(), {
      'localCourse.code': 'BM201',
      'localCourse.name': 'Veri Yapıları ve Algoritmalar',
    });
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({
      yol: 'localCourse.name',
      eski: 'Veri Yapıları',
      yeni: 'Veri Yapıları ve Algoritmalar',
    });
  });

  it('hiçbir şey değişmediyse boş liste', () => {
    expect(degisiklikleriCoz(eslesme(), { 'localCourse.code': 'BM201' })).toEqual([]);
  });

  it('baştaki/sondaki boşluk değişiklik sayılmaz', () => {
    expect(degisiklikleriCoz(eslesme(), { 'localCourse.code': '  BM201  ' })).toEqual([]);
  });

  it('başarı notu değiştirilemez — istek düşer', () => {
    expect(degisiklikleriCoz(eslesme(), { 'sourceCourse.grade': 'AA' })).toEqual([]);
  });

  it('karar alanları değiştirilemez — istek düşer', () => {
    const d = degisiklikleriCoz(eslesme(), { adminDecision: 'confirmed', tier: 'approved' });
    expect(d).toEqual([]);
  });

  it('yasak alan listesi notu ve kararı kapsar', () => {
    expect(YASAK_ALANLAR).toContain('sourceCourse.grade');
    expect(YASAK_ALANLAR).toContain('adminDecision');
  });

  it('bilinmeyen alan yok sayılır', () => {
    expect(degisiklikleriCoz(eslesme(), { uydurmaAlan: 'x' })).toEqual([]);
  });

  it('boşaltma da bir değişikliktir', () => {
    const d = degisiklikleriCoz(eslesme(), { 'sourceCourse.akts': '' });
    expect(d).toHaveLength(1);
    expect(d[0].yeni).toBe('');
  });
});

describe('degisiklikGecerliMi', () => {
  it('değişiklik yoksa geçersiz', () => {
    expect(degisiklikGecerliMi([]).gecerli).toBe(false);
  });

  it('ders adı boşaltılamaz', () => {
    const s = degisiklikGecerliMi([
      { yol: 'localCourse.name', etiket: 'ÇAKÜ ders adı', eski: 'A', yeni: '' },
    ]);
    expect(s.gecerli).toBe(false);
    expect(s.hata).toMatch(/boş bırakılamaz/);
  });

  it('AKTS sayı olmalı', () => {
    const s = degisiklikGecerliMi([
      { yol: 'localCourse.akts', etiket: 'ÇAKÜ AKTS', eski: '6', yeni: 'altı' },
    ]);
    expect(s.gecerli).toBe(false);
    expect(s.hata).toMatch(/sayı olmalı/);
  });

  it('virgüllü AKTS kabul edilir', () => {
    expect(
      degisiklikGecerliMi([{ yol: 'localCourse.akts', etiket: 'x', eski: '6', yeni: '7,5' }])
        .gecerli
    ).toBe(true);
  });

  it('mantıksız AKTS reddedilir', () => {
    expect(
      degisiklikGecerliMi([{ yol: 'localCourse.akts', etiket: 'x', eski: '6', yeni: '99' }]).gecerli
    ).toBe(false);
  });

  it('geçerli değişiklik kabul edilir', () => {
    expect(
      degisiklikGecerliMi([{ yol: 'localCourse.code', etiket: 'x', eski: 'BM201', yeni: 'BM203' }])
        .gecerli
    ).toBe(true);
  });
});

describe('eslesmeYamasi', () => {
  const simdi = new Date('2026-03-15T10:00:00Z');

  it('alanı yamalar', () => {
    const d = degisiklikleriCoz(eslesme(), { 'localCourse.code': 'BM203' });
    const y = eslesmeYamasi(eslesme(), d, UNI, simdi);
    expect(y.localCourse.code).toBe('BM203');
    expect(y.localCourse.name).toBe('Veri Yapıları');
  });

  it('özgün satırı değiştirmez', () => {
    const e = eslesme();
    const d = degisiklikleriCoz(e, { 'localCourse.code': 'BM203' });
    eslesmeYamasi(e, d, UNI, simdi);
    expect(e.localCourse.code).toBe('BM201');
  });

  it('düzenleme izi bırakır', () => {
    const d = degisiklikleriCoz(eslesme(), { 'localCourse.code': 'BM203' });
    const y = eslesmeYamasi(eslesme(), d, UNI, simdi);
    expect(y.duzenlemeler).toHaveLength(1);
    expect(y.duzenlemeler[0]).toMatchObject({ alan: 'localCourse.code', kim: 'Üni Yetkilisi' });
    expect(y.duzenleyen).toBe('Üni Yetkilisi');
  });

  it('ikinci düzeltme izin üstüne eklenir', () => {
    const ilk = eslesmeYamasi(
      eslesme(),
      degisiklikleriCoz(eslesme(), { 'localCourse.code': 'BM203' }),
      UNI,
      simdi
    );
    const ikinci = eslesmeYamasi(
      ilk,
      degisiklikleriCoz(ilk, { 'sourceCourse.akts': '6' }),
      UNI,
      simdi
    );
    expect(ikinci.duzenlemeler).toHaveLength(2);
  });

  it('ders değişince içerik puanı bayat işaretlenir', () => {
    const d = degisiklikleriCoz(eslesme(), { 'localCourse.name': 'Algoritmalar' });
    expect(eslesmeYamasi(eslesme(), d, UNI, simdi).puanBayat).toBe(true);
  });

  it('yalnız AKTS düzeltilirse puan bayat sayılmaz', () => {
    const d = degisiklikleriCoz(eslesme(), { 'localCourse.akts': '7' });
    expect(eslesmeYamasi(eslesme(), d, UNI, simdi).puanBayat).toBeUndefined();
  });

  it('karar alanlarına dokunmaz', () => {
    const e = eslesme({ tier: 'review', recommendation: 'incele' });
    const y = eslesmeYamasi(e, degisiklikleriCoz(e, { 'localCourse.akts': '7' }), UNI, simdi);
    expect(y.tier).toBe('review');
    expect(y.recommendation).toBe('incele');
    expect(y.adminDecision).toBeUndefined();
  });

  it('başarı notu yamada da korunur', () => {
    const e = eslesme();
    const y = eslesmeYamasi(e, degisiklikleriCoz(e, { 'sourceCourse.code': 'CS999' }), UNI, simdi);
    expect(y.sourceCourse.grade).toBe('BA');
  });
});

describe('duzenlemeOzeti', () => {
  it('değişiklikleri okunur yazar', () => {
    const o = duzenlemeOzeti([
      { yol: 'localCourse.code', etiket: 'ÇAKÜ ders kodu', eski: 'BM201', yeni: 'BM203' },
    ]);
    expect(o).toBe('ÇAKÜ ders kodu: BM201 → BM203');
  });

  it('boş değeri tire ile gösterir', () => {
    expect(duzenlemeOzeti([{ etiket: 'AKTS', eski: '', yeni: '6' }])).toBe('AKTS: — → 6');
  });

  it('değişiklik yoksa boş metin', () => {
    expect(duzenlemeOzeti([])).toBe('');
  });
});

describe('duzenlendiMi', () => {
  it('izi olmayan satır için null', () => {
    expect(duzenlendiMi(eslesme())).toBe(null);
  });

  it('son düzenlemeyi bildirir', () => {
    const e = eslesme({
      duzenlemeler: [
        { alan: 'a', kim: 'Ali', tarih: '2026-01-01T00:00:00Z' },
        { alan: 'b', kim: 'Veli', tarih: '2026-02-01T00:00:00Z' },
      ],
    });
    const d = duzenlendiMi(e);
    expect(d.adet).toBe(2);
    expect(d.kim).toBe('Veli');
  });
});

describe('alan listesi', () => {
  it('etiketler çözülür', () => {
    expect(alanEtiketi('localCourse.code')).toBe('ÇAKÜ ders kodu');
    expect(alanEtiketi('bilinmeyen')).toBe('bilinmeyen');
  });

  it('düzenlenebilir alanlar notu içermez', () => {
    const yollar = DUZENLENEBILIR_ALANLAR.map((a) => a.yol);
    expect(yollar).not.toContain('sourceCourse.grade');
    expect(yollar).toContain('localCourse.code');
  });
});
