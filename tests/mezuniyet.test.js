// Mezuniyet durumu hesabı.
//
// Bu hesap öğrenciye "mezun olabilirsin / şu kadar AKTS'in kaldı" diyor.
// Yanlış olduğunda kimse fark etmez ama öğrenci mezuniyet planını yanlış
// kurar — o yüzden sessizce iyimser davranan her yol test altında.
import { describe, it, expect } from 'vitest';
import { mezuniyetHesapla, mezNotDurumu, mezNorm } from '../lib/mezuniyet.js';

const K = (o) => Object.assign({ toplamAkts: 60, minAgno: 2.0, stajZorunlu: false }, o || {});

const mufredat = [
  { code: 'BLM101', name: 'Algoritmalar', akts: 6, sinif: 1, donem: 'guz', statu: 'Z' },
  { code: 'BLM102', name: 'Veri Yapıları', akts: 6, sinif: 1, donem: 'bahar', statu: 'Z' },
  { code: 'BLM480', name: 'Bitirme Projesi', akts: 10, sinif: 4, donem: 'bahar', statu: 'Z' },
  { code: 'SEC201', name: 'Seçmeli Yazılım', akts: 5, sinif: 2, donem: 'guz', statu: 'S' },
];

describe('mezNorm', () => {
  it('boşluk ve noktalamayı atar, Türkçe harfleri sadeleştirir', () => {
    expect(mezNorm('BLM 101')).toBe('blm101');
    expect(mezNorm('blm-101')).toBe('blm101');
    expect(mezNorm('MÜHENDİSLİK ÇİZİMİ')).toBe('muhendislikcizimi');
  });
});

describe('mezNotDurumu', () => {
  it('geçer/kalır listelerini uygular', () => {
    expect(mezNotDurumu('AA', K())).toBe('gecti');
    expect(mezNotDurumu('FF', K())).toBe('kaldi');
  });
  it('küçük harf ve boşluğu tolere eder', () => {
    expect(mezNotDurumu(' ba ', K())).toBe('gecti');
  });
  it('tanımadığı notu geçti SAYMAZ', () => {
    expect(mezNotDurumu('XX', K())).toBe('belirsiz');
    expect(mezNotDurumu('', K())).toBe('belirsiz');
  });
});

describe('mezuniyetHesapla — eşleştirme', () => {
  it('kod tutmasa da ada göre müfredatla eşleşir', () => {
    const r = mezuniyetHesapla(
      mufredat,
      [{ kod: 'CENG101', ad: 'Algoritmalar', akts: 6, not: 'AA' }],
      K(),
      {}
    );
    expect(r.kayitlar[0].mufredatta).toBe(true);
    expect(r.kayitlar[0].statu).toBe('Z');
    expect(r.kalanZorunlu.map((c) => c.code)).not.toContain('BLM101');
  });

  it('müfredat dışı dersi işaretler ama AKTS’e sayar', () => {
    const r = mezuniyetHesapla(
      mufredat,
      [{ kod: 'XXX999', ad: 'Serbest', akts: 4, not: 'BB' }],
      K(),
      {}
    );
    expect(r.kayitlar[0].mufredatta).toBe(false);
    expect(r.gecilenAkts).toBe(4);
  });

  it('tekrar edilen derste EN İYİ sonucu alır ve AKTS’i bir kez sayar', () => {
    const r = mezuniyetHesapla(
      mufredat,
      [
        { kod: 'BLM101', ad: 'Algoritmalar', akts: 6, not: 'FF' },
        { kod: 'BLM101', ad: 'Algoritmalar', akts: 6, not: 'CC' },
      ],
      K(),
      {}
    );
    expect(r.gecilenAkts).toBe(6); // 12 değil
    expect(r.kalanZorunlu.map((c) => c.code)).not.toContain('BLM101');
  });
});

describe('mezuniyetHesapla — 7+1 müfredatı', () => {
  it('normal müfredatta 4. sınıf bahar dersi kalan zorunluda görünür', () => {
    const r = mezuniyetHesapla(mufredat, [], K(), {});
    expect(r.kalanZorunlu.map((c) => c.code)).toContain('BLM480');
  });

  it('7+1’de 4. sınıf bahar dersleri kalan zorunludan düşer', () => {
    const r = mezuniyetHesapla(mufredat, [], K({ mufredatTipi: '7+1' }), {});
    expect(r.kalanZorunlu.map((c) => c.code)).not.toContain('BLM480');
  });

  it('7+1’de işyeri eğitimi koşulu eklenir ve "bilinmiyor" kalır', () => {
    const r = mezuniyetHesapla(mufredat, [], K({ mufredatTipi: '7+1' }), {});
    const k = r.kosullar.find((x) => x.id === 'isyeri');
    expect(k).toBeTruthy();
    expect(k.saglandi).toBe(null);
  });
});

describe('mezuniyetHesapla — mezunOlabilir kararı', () => {
  const hepsi = [
    { kod: 'BLM101', ad: 'Algoritmalar', akts: 6, not: 'AA' },
    { kod: 'BLM102', ad: 'Veri Yapıları', akts: 6, not: 'BB' },
    { kod: 'BLM480', ad: 'Bitirme Projesi', akts: 10, not: 'CC' },
    { kod: 'SEC201', ad: 'Seçmeli Yazılım', akts: 5, not: 'CB' },
    { kod: 'EK100', ad: 'Ek Ders', akts: 33, not: 'AA' },
  ];

  it('tüm koşullar sağlandığında mezun olabilir', () => {
    const r = mezuniyetHesapla(mufredat, hepsi, K(), { agno: '3,10' });
    expect(r.gecilenAkts).toBe(60);
    expect(r.kalanZorunlu).toHaveLength(0);
    expect(r.mezunOlabilir).toBe(true);
  });

  it('AGNO bilinmiyorsa mezun olabilir DEMEZ', () => {
    const r = mezuniyetHesapla(mufredat, hepsi, K(), {});
    expect(r.kosullar.find((k) => k.id === 'agno').saglandi).toBe(null);
    expect(r.mezunOlabilir).toBe(false);
  });

  it('staj zorunluyken durumu bilinmiyorsa mezun olabilir DEMEZ', () => {
    const r = mezuniyetHesapla(mufredat, hepsi, K({ stajZorunlu: true }), { agno: '3,10' });
    expect(r.mezunOlabilir).toBe(false);
  });

  it('AGNO virgüllü yazılsa da okunur', () => {
    const r = mezuniyetHesapla(mufredat, hepsi, K(), { agno: '1,95' });
    expect(r.kosullar.find((k) => k.id === 'agno').saglandi).toBe(false);
  });

  it('müfredat boşsa "zorunlular tamam" DEMEZ', () => {
    const r = mezuniyetHesapla([], hepsi, K(), { agno: '3,10' });
    expect(r.mufredatBos).toBe(true);
    expect(r.kosullar.find((k) => k.id === 'zorunlu').saglandi).toBe(null);
    expect(r.mezunOlabilir).toBe(false);
  });

  it('tanınmayan notu geçti saymaz ve bayrak kaldırır', () => {
    const r = mezuniyetHesapla(
      mufredat,
      [{ kod: 'BLM101', ad: 'Algoritmalar', akts: 6, not: '??' }],
      K(),
      {}
    );
    expect(r.gecilenAkts).toBe(0);
    expect(r.belirsizVar).toBe(true);
    expect(r.kalanZorunlu.map((c) => c.code)).toContain('BLM101');
  });
});
