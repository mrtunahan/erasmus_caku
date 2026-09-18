import { describe, it, expect } from 'vitest';
import {
  AKTS_TAVANI,
  dersAkts,
  dersGruplari,
  dersSinifi,
  derslerimOzeti,
  ozetMetni,
} from '../lib/derslerim-ozeti.js';

const DERSLER = [
  { code: 'BLM201', sinif: 2, akts: 6 },
  { code: 'BLM203', sinif: 2, akts: 5 },
  { code: 'BLM301', sinif: '3', kredi: '4' },
  { code: 'BLM451', sinif: null, akts: 5 },
];

describe('dersAkts', () => {
  it('akts yoksa kredi okunur', () => {
    expect(dersAkts({ akts: 6 })).toBe(6);
    expect(dersAkts({ kredi: '4' })).toBe(4);
    expect(dersAkts({ akts: '5,5' })).toBe(5.5);
  });

  // 0 ile "bilinmiyor" aynı şey değil: bilinmeyeni 0 saymak toplamı sessizce
  // küçültür ve tavan denetimi yanlış çalışır.
  it('okunamayan AKTS null döner', () => {
    expect(dersAkts({})).toBe(null);
    expect(dersAkts({ akts: '—' })).toBe(null);
    expect(dersAkts(null)).toBe(null);
  });
});

describe('dersSinifi', () => {
  it('1-4 arası sınıf korunur', () => {
    expect(dersSinifi({ sinif: 3 })).toBe(3);
    expect(dersSinifi({ sinif: '2' })).toBe(2);
  });

  it('sınıfsız/seçmeli ders 5. kovaya düşer', () => {
    expect(dersSinifi({})).toBe(5);
    expect(dersSinifi({ sinif: 7 })).toBe(5);
  });
});

describe('derslerimOzeti', () => {
  it('ders sayısı ve toplam AKTS', () => {
    const o = derslerimOzeti(DERSLER);
    expect(o.sayi).toBe(4);
    expect(o.toplamAkts).toBe(20);
    expect(o.tavan).toBe(AKTS_TAVANI);
    expect(o.kalan).toBe(22);
    expect(o.asildi).toBe(false);
  });

  it('AKTS bilgisi olmayan dersler ayrıca sayılır', () => {
    const o = derslerimOzeti([...DERSLER, { code: 'X', akts: '' }]);
    expect(o.aktsBilinmeyen).toBe(1);
    expect(o.toplamAkts).toBe(20);
  });

  it('tavan aşılınca işaretlenir', () => {
    const cok = Array.from({ length: 8 }, () => ({ akts: 6 }));
    const o = derslerimOzeti(cok);
    expect(o.toplamAkts).toBe(48);
    expect(o.asildi).toBe(true);
    expect(o.kalan).toBe(0);
    expect(o.oran).toBe(1);
  });

  it('tavan dışarıdan verilebilir', () => {
    expect(derslerimOzeti(DERSLER, { tavan: 30 }).kalan).toBe(10);
  });

  it('boş listede çökmez', () => {
    const o = derslerimOzeti(null);
    expect(o).toMatchObject({ sayi: 0, toplamAkts: 0, asildi: false, oran: 0 });
  });
});

describe('dersGruplari', () => {
  it('sınıfa göre gruplar, seçmeli en sonda', () => {
    const g = dersGruplari(DERSLER);
    expect(g.map((x) => x.sinif)).toEqual([2, 3, 5]);
    expect(g[0].dersler).toHaveLength(2);
    expect(g[0].toplamAkts).toBe(11);
    expect(g[2].etiket).toBe('Seçmeli / diğer');
  });

  it('grup etiketleri okunur', () => {
    expect(dersGruplari([{ sinif: 1 }])[0].etiket).toBe('1. sınıf dersleri');
  });

  it('boş listede boş dizi', () => {
    expect(dersGruplari([])).toEqual([]);
  });
});

describe('ozetMetni', () => {
  it('ders varken sayı, AKTS ve tavan payı', () => {
    expect(ozetMetni(derslerimOzeti(DERSLER))).toBe('4 ders · 20 AKTS · tavana 22 AKTS var');
  });

  it('tavan aşıldıysa bunu söyler', () => {
    expect(ozetMetni(derslerimOzeti([{ akts: 50 }]))).toMatch(/tavan 42 AKTS aşıldı/);
  });

  it('AKTS bilinmeyen ders varsa eklenir', () => {
    expect(ozetMetni(derslerimOzeti([{ akts: 6 }, {}]))).toMatch(/1 dersin AKTS bilgisi yok/);
  });

  it('ders yoksa ayrı cümle', () => {
    expect(ozetMetni(derslerimOzeti([]))).toBe('Bu dönem için ders seçmediniz.');
  });
});
