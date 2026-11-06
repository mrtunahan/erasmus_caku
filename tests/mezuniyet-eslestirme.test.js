import { describe, it, expect } from 'vitest';
import {
  onerileriNormalize,
  oneriKarari,
  kabulEdilenOneriler,
  eslesmeleriUygula,
  oneriKimligi,
} from '../lib/mezuniyet-eslestirme.js';
import { mezuniyetHesapla, mezSilinmeSiniflandir } from '../lib/mezuniyet.js';

const kural = { toplamYariyil: 8, isyeriYariyilSayisi: 0, toplamAkts: 240 };
const mufredat = [
  { code: 'BİL101', name: 'Programlamaya Giriş', akts: 5, statu: 'Z', sinif: 1, donem: 'Fall' },
  { code: 'BİL205', name: 'Ayrık Yapılar', akts: 5, statu: 'Z', sinif: 2, donem: 'Fall' },
];
const alinan = [
  { kod: 'BİL101', ad: 'Programlamaya Giriş', akts: 5, not: 'AA' },
  // Eski kodlu, farklı adlı ders — sistem müfredatla eşleyemez.
  { kod: 'BM211', ad: 'Kesikli Matematik', akts: 5, not: 'BB', statu: 'Z' },
];
const oneri = {
  transkriptKod: 'BM211',
  transkriptAd: 'Kesikli Matematik',
  mufredatKod: 'BİL205',
  mufredatAd: 'Ayrık Yapılar',
};

describe('ders eşleştirme önerileri', () => {
  it('geçersiz ve yinelenen öneriler atılır', () => {
    const l = onerileriNormalize([oneri, { ...oneri }, { transkriptKod: 'X' }, null]);
    expect(l).toHaveLength(1);
    expect(l[0].id).toBe(oneriKimligi('BM211', 'Kesikli Matematik'));
  });

  it('karar yoksa bekliyor; öneri değişince eski karar geçmez', () => {
    const [o] = onerileriNormalize([oneri]);
    expect(oneriKarari({}, o)).toBe('bekliyor');
    const b = {
      eslesmeOnerileri: [oneri],
      eslesmeKararlari: {
        [o.id]: { karar: 'kabul', mufredatKod: 'BİL205', mufredatAd: 'Ayrık Yapılar' },
      },
    };
    expect(oneriKarari(b, o)).toBe('kabul');
    const degisti = { ...o, mufredatKod: 'BİL101', mufredatAd: 'Programlamaya Giriş' };
    expect(oneriKarari(b, degisti)).toBe('bekliyor');
  });

  it('yalnız kabul edilen öneri hesaba girer', () => {
    const once = mezuniyetHesapla(mufredat, alinan, kural);
    expect(once.kalanZorunlu.map((c) => c.code)).toEqual(['BİL205']);

    const bekleyen = { eslesmeOnerileri: [oneri] };
    expect(kabulEdilenOneriler(bekleyen)).toEqual([]);

    const [o] = onerileriNormalize([oneri]);
    const kabul = {
      eslesmeOnerileri: [oneri],
      eslesmeKararlari: {
        [o.id]: { karar: 'kabul', mufredatKod: 'BİL205', mufredatAd: 'Ayrık Yapılar' },
      },
    };
    const dersler = eslesmeleriUygula(alinan, kabulEdilenOneriler(kabul));
    expect(dersler[1].eslestirilen).toBe('BİL205');
    const sonra = mezuniyetHesapla(mufredat, dersler, kural);
    expect(sonra.kalanZorunlu).toEqual([]);
    expect(sonra.kayitlar[1].mufredatta).toBe(true);
    expect(mezSilinmeSiniflandir(sonra).engel).toEqual([]);
  });

  it('başarısız eski kodlu ders eşleşince sonradan geçilen dersin denemesi olur', () => {
    const l = [
      {
        kod: 'BİL205',
        ad: 'Ayrık Yapılar',
        akts: 5,
        not: 'CC',
        statu: 'Z',
        yil: '2024',
        yariyil: 'Güz',
      },
      {
        kod: 'BM211',
        ad: 'Kesikli Matematik',
        akts: 5,
        not: 'FF',
        statu: 'S',
        yil: '2023',
        yariyil: 'Güz',
      },
    ];
    const once = mezSilinmeSiniflandir(mezuniyetHesapla(mufredat, l, kural));
    expect(once.silinmeli.map((x) => x.r.kod)).toEqual(['BM211']);
    const d = eslesmeleriUygula(l, onerileriNormalize([oneri]));
    const sonra = mezSilinmeSiniflandir(mezuniyetHesapla(mufredat, d, kural));
    expect(sonra.silinmeli).toEqual([]);
  });
});
