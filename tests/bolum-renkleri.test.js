import { describe, it, expect } from 'vitest';
import {
  BOLUM_RENK_PALETI,
  ORTAK_DERS_RENGI,
  VARSAYILAN_BOLUM_RENGI,
  bilinenRenk,
  bolumRengiCoz,
  bolumRenkHaritasi,
  koyuMetinRengi,
  metinRengi,
  paletRengi,
  renkGecerliMi,
  renkNormalize,
} from '../lib/bolum-renkleri.js';

describe('renkGecerliMi / renkNormalize', () => {
  it('altı ve üç haneli hex kabul edilir', () => {
    expect(renkGecerliMi('#5B9BD5')).toBe(true);
    expect(renkGecerliMi('#abc')).toBe(true);
  });

  it('geçersiz değerler elenir', () => {
    ['', null, 'mavi', '5B9BD5', '#12345', '#gggggg'].forEach((v) =>
      expect(renkGecerliMi(v)).toBe(false)
    );
  });

  it('kısa biçim açılır ve büyük harfe geçer', () => {
    expect(renkNormalize('#abc')).toBe('#AABBCC');
    expect(renkNormalize('#5b9bd5')).toBe('#5B9BD5');
    expect(renkNormalize('bozuk')).toBe(null);
  });
});

describe('bilinenRenk', () => {
  it('fakültenin basılı programındaki renkleri tanır', () => {
    expect(bilinenRenk('Bilgisayar Mühendisliği')).toBe('#5B9BD5');
    expect(bilinenRenk('Gıda Mühendisliği')).toBe('#C39BE1');
    expect(bilinenRenk('İnşaat Mühendisliği')).toBe('#FFC000');
    expect(bilinenRenk('Makine Mühendisliği')).toBe('#ADB9CA');
    expect(bilinenRenk('Kimya Mühendisliği')).toBe('#70AD47');
  });

  it('Elektrik-Elektronik iki kökle de bulunur', () => {
    expect(bilinenRenk('Elektrik-Elektronik Mühendisliği')).toBe('#FF5B5B');
    expect(bilinenRenk('Elektronik Mühendisliği')).toBe('#FF5B5B');
  });

  it('büyük/küçük ve Türkçe İ farkı sorun değil', () => {
    expect(bilinenRenk('BİLGİSAYAR MÜHENDİSLİĞİ')).toBe('#5B9BD5');
    expect(bilinenRenk('İNŞAAT MÜHENDİSLİĞİ')).toBe('#FFC000');
  });

  it('tanınmayan bölümde null', () => {
    expect(bilinenRenk('Orman Mühendisliği')).toBe(null);
    expect(bilinenRenk('')).toBe(null);
  });
});

describe('bolumRengiCoz — öncelik sırası', () => {
  it('1) bölümün kendi AYARI her şeyin önündedir', () => {
    expect(
      bolumRengiCoz({ ayarRengi: '#123456', bolumAdi: 'Bilgisayar Mühendisliği', sira: 0 })
    ).toBe('#123456');
  });

  it('2) ayar yoksa bilinen renk', () => {
    expect(bolumRengiCoz({ bolumAdi: 'Bilgisayar Mühendisliği', sira: 0 })).toBe('#5B9BD5');
  });

  it('3) o da yoksa paletten sıradaki', () => {
    expect(bolumRengiCoz({ bolumAdi: 'Orman Mühendisliği', sira: 1 })).toBe(BOLUM_RENK_PALETI[1]);
  });

  it('hiçbir bilgi yoksa varsayılan', () => {
    expect(bolumRengiCoz({})).toBe(VARSAYILAN_BOLUM_RENGI);
    expect(bolumRengiCoz(null)).toBe(VARSAYILAN_BOLUM_RENGI);
  });

  it('BOZUK ayar rengi yok sayılır, sıradaki kurala düşülür', () => {
    expect(bolumRengiCoz({ ayarRengi: 'mavi', bolumAdi: 'Kimya Mühendisliği' })).toBe('#70AD47');
  });

  it('palet taşarsa başa döner', () => {
    expect(paletRengi(BOLUM_RENK_PALETI.length)).toBe(BOLUM_RENK_PALETI[0]);
    expect(paletRengi(-1)).toBe(VARSAYILAN_BOLUM_RENGI);
  });
});

describe('bolumRenkHaritasi', () => {
  it('aynı bölüm her çıktıda AYNI rengi alır', () => {
    const liste = ['Bilgisayar Mühendisliği', 'Orman Mühendisliği', 'Su Ürünleri'];
    expect(bolumRenkHaritasi(liste)).toEqual(bolumRenkHaritasi(liste));
  });

  it('ayarlı ve ayarsız bölümler bir arada çalışır', () => {
    const harita = bolumRenkHaritasi([
      { ad: 'Orman Mühendisliği', renk: '#00FF00' },
      { ad: 'Bilgisayar Mühendisliği' },
      { ad: 'Su Ürünleri' },
    ]);
    expect(harita['Orman Mühendisliği']).toBe('#00FF00');
    expect(harita['Bilgisayar Mühendisliği']).toBe('#5B9BD5');
    expect(harita['Su Ürünleri']).toBe(BOLUM_RENK_PALETI[2]);
  });

  it('tekrar eden ad iki kez yazılmaz', () => {
    const harita = bolumRenkHaritasi(['A', 'A', 'B']);
    expect(Object.keys(harita)).toEqual(['A', 'B']);
  });

  it('adsız kayıt atlanır', () => {
    expect(bolumRenkHaritasi([{ ad: '' }, null, 'X'])).toEqual({
      X: bolumRengiCoz({ bolumAdi: 'X', sira: 2 }),
    });
  });
});

describe('metinRengi', () => {
  it('açık zeminde koyu, koyu zeminde beyaz yazı', () => {
    expect(metinRengi('#FFFF00')).toBe('#111111');
    expect(metinRengi('#ADB9CA')).toBe('#111111');
    expect(metinRengi('#1B2A4A')).toBe('#FFFFFF');
    expect(metinRengi('#FF5B5B')).toBe('#111111');
  });

  it('geçersiz zeminde koyu yazı', () => {
    expect(metinRengi('bozuk')).toBe('#111111');
  });

  it('ortak ders rengi tanımlı', () => {
    expect(ORTAK_DERS_RENGI).toBe('#FFFF00');
  });
});

describe('koyuMetinRengi', () => {
  const parlaklik = (h) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    return (r * 299 + g * 587 + b * 114) / 1000;
  };

  it('paletteki HER renk beyaz zeminde okunur hale gelir', () => {
    BOLUM_RENK_PALETI.forEach((renk) => {
      expect(parlaklik(koyuMetinRengi(renk))).toBeLessThanOrEqual(120);
    });
  });

  it('ton korunur — mavi mavi, yeşil yeşil kalır', () => {
    const mavi = koyuMetinRengi('#5B9BD5');
    const [r, , b] = [1, 3, 5].map((i) => parseInt(mavi.slice(i, i + 2), 16));
    expect(b).toBeGreaterThan(r);
    const yesil = koyuMetinRengi('#70AD47');
    const [yr, yg] = [1, 3].map((i) => parseInt(yesil.slice(i, i + 2), 16));
    expect(yg).toBeGreaterThan(yr);
  });

  it('zaten koyu renk daha fazla koyulaşmaz', () => {
    expect(koyuMetinRengi('#111111')).toBe('#111111');
  });

  it('geçersiz renkte koyu varsayılan', () => {
    expect(koyuMetinRengi('bozuk')).toBe('#111111');
  });
});
