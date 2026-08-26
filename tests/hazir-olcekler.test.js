import { describe, it, expect } from 'vitest';
import {
  HAZIR_OLCEKLER,
  hazirOlcekBul,
  hazirOlcekSatirlari,
  hazirOlcekSecenekleri,
} from '../lib/hazir-olcekler.js';
import { olcekNormalize, olcekSorunlari } from '../lib/karsi-olcek.js';

describe('hazır ölçekler', () => {
  it('her şablon geçerli bir ölçektir', () => {
    HAZIR_OLCEKLER.forEach((o) => {
      expect(olcekSorunlari(o.satirlar), o.id).toEqual([]);
      expect(olcekNormalize(o.satirlar).length).toBeGreaterThan(0);
    });
  });

  it('YÖK standardı bilinen katsayıları taşır', () => {
    const olcek = olcekNormalize(hazirOlcekSatirlari('yok4'));
    const kats = Object.fromEntries(olcek.map((r) => [r.harf, r.katsayi]));
    expect(kats.AA).toBe(4);
    expect(kats.BB).toBe(3);
    expect(kats.CC).toBe(2);
    expect(kats.FF).toBe(0);
  });

  it('ÇAKÜ şablonunda BB yoktur (harf kuruma özeldir)', () => {
    const harfler = hazirOlcekSatirlari('caku').map((r) => r.harf);
    expect(harfler).toContain('B1');
    expect(harfler).not.toContain('BB');
  });

  it('puan aralıkları BOŞ bırakılır — uydurulmuş aralık yanlış harf üretir', () => {
    HAZIR_OLCEKLER.forEach((o) => {
      o.satirlar.forEach((r) => {
        expect(r.min).toBe('');
        expect(r.max).toBe('');
      });
    });
  });

  it('satırlar her çağrıda KOPYA döner — şablon kirlenmez', () => {
    const a = hazirOlcekSatirlari('yok4');
    a[0].katsayi = '9.99';
    expect(hazirOlcekSatirlari('yok4')[0].katsayi).toBe('4.00');
  });

  it('bilinmeyen kimlik boş döner', () => {
    expect(hazirOlcekSatirlari('yok-boyle-bir-sey')).toEqual([]);
    expect(hazirOlcekBul('')).toBe(null);
  });

  it('seçenek listesi satır taşımaz', () => {
    const sec = hazirOlcekSecenekleri();
    expect(sec.length).toBe(HAZIR_OLCEKLER.length);
    sec.forEach((x) => {
      expect(x.satirlar).toBeUndefined();
      expect(x.ad).toBeTruthy();
    });
  });
});
