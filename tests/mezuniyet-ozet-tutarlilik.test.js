import { describe, it, expect } from 'vitest';
import { mezuniyetHesapla, mezSilinmeSiniflandir } from '../lib/mezuniyet.js';

const kural = {
  toplamYariyil: 8,
  isyeriYariyilSayisi: 0,
  toplamAkts: 240,
  stajDersleri: [
    { ad: 'Staj I', kod: 'BİL200' },
    { ad: 'Staj II', kod: 'BİL300' },
  ],
};
const Z = (code, name) => ({ code, name, akts: 6, statu: 'Z', sinif: 2, donem: 'guz' });
const mufredat = [
  Z('BİL122', 'Ayrık Matematik'),
  Z('BİL142', 'Ayrık Matematik'),
  Z('BİL314', 'Otomata Teorisi ve Formal Diller'),
  Z('BİL401', 'Bilgisayar Ağları'),
  Z('BİL301', 'Programlama Dilleri'),
];
const alinan = [
  { kod: 'MAT142', ad: 'Ayrık Matematik ve Uygulamaları', akts: '5', not: 'C3', statu: 'Zorunlu' },
  { kod: 'BİL301', ad: 'Programlama Dilleri', akts: '6', not: 'B2', statu: 'Zorunlu' },
  { kod: 'BİL314', ad: 'Otomata Teorisi ve Formal Diller', akts: '5', not: 'F2', statu: 'Zorunlu' },
  { kod: 'BİL200', ad: 'Staj I', akts: '4', not: 'BŞ' },
  { kod: 'BİL300', ad: 'Staj II', akts: '4', not: 'BŞZ' },
];

describe('mezuniyet özeti tutarlılığı', () => {
  const s = mezuniyetHesapla(mufredat, alinan, kural, { transkriptAkts: '10' });

  it('üst özetteki eksik sayısı "mezuniyete engel" listesiyle aynı', () => {
    const engel = mezSilinmeSiniflandir(s).engel;
    expect(s.kalanZorunlu.map((c) => c.code).sort()).toEqual(['BİL314', 'BİL401']);
    expect(engel).toHaveLength(s.kalanZorunlu.length);
    const k = s.kosullar.find((x) => x.id === 'zorunlu');
    expect(k.mevcut).toBe('2 ders eksik');
  });

  it('aynı adlı iki müfredat dersi tek gereksinim, benzer adla geçilen gösterilir', () => {
    expect(s.benzerleSaglanan).toEqual([
      {
        code: 'BİL142',
        name: 'Ayrık Matematik',
        ileKod: 'MAT142',
        ileAd: 'Ayrık Matematik ve Uygulamaları',
      },
    ]);
  });

  it('aynı adlı iki ders hiç geçilmediyse bir kez sayılır', () => {
    const t = mezuniyetHesapla(mufredat, alinan.slice(1), kural);
    const ayrik = t.kalanZorunlu.filter((c) => c.name === 'Ayrık Matematik');
    expect(ayrik).toHaveLength(1);
    expect(ayrik[0].digerKodlar).toHaveLength(1);
  });

  it('transkriptten okunan toplam derslerden küçükse okuma hatası sayılır', () => {
    expect(s.aktsKaynagi).toBe('hesap-okuma-hatasi');
    expect(s.okunanTranskriptAkts).toBe(10);
    expect(s.gecilenAkts).toBeGreaterThan(10);
    const dogru = mezuniyetHesapla(mufredat, alinan, kural, { transkriptAkts: '200' });
    expect(dogru.aktsKaynagi).toBe('transkript');
    expect(dogru.gecilenAkts).toBe(200);
  });

  it('staj durumu her staj için açık yazılır', () => {
    expect(s.stajDurumlari.map((x) => [x.kod, x.durumMetni])).toEqual([
      ['BİL200', 'tamamlandı'],
      ['BİL300', 'notu BŞZ (geçmek için BŞ)'],
    ]);
    expect(s.kosullar.find((x) => x.id === 'staj')).toMatchObject({
      label: 'Stajlar',
      mevcut: '1 / 2 tamam',
    });
  });
});
