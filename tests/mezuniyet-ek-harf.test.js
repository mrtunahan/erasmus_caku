import { describe, it, expect } from 'vitest';
import {
  mezNotDurumu,
  mezKuralNormalize,
  mezHarfKatsayisi,
  cakuTablosuSatirlari,
  cakuTablosuSorunlari,
  cakuTablosuKaydi,
} from '../lib/mezuniyet.js';

// Ders Muafiyet → Not Ölçekleri kartının yazdığı biçim: gecer bayrağı yok,
// ek harfler yok (kart yalnız harf/katsayı/aralık yazar).
const muafiyettenKayit = {
  notOlcegi: [
    ['A', 4, 90, 100],
    ['B1', 3.5, 85, 89],
    ['B2', 3.25, 80, 84],
    ['B3', 3, 75, 79],
    ['C1', 2.5, 70, 74],
    ['C2', 2.25, 65, 69],
    ['C3', 2, 60, 64],
    ['F1', 1.5, 50, 59],
    ['F2', 0, 0, 49],
  ].map(([harf, katsayi, min, max]) => ({ harf, katsayi, min, max })),
  ekHarfler: [],
};

describe('ÇAKÜ ölçeği: FF1/FF2/FF3 ve bayraksız satırlar', () => {
  it('bayraksız ölçekte geçer harfler geçer, F1/F2 kalır', () => {
    expect(mezNotDurumu('A', muafiyettenKayit)).toBe('gecti');
    expect(mezNotDurumu('C3', muafiyettenKayit)).toBe('gecti');
    expect(mezNotDurumu('F1', muafiyettenKayit)).toBe('kaldi');
    expect(mezNotDurumu('F2', muafiyettenKayit)).toBe('kaldi');
  });
  it('FF1, FF2, FF3 kayıtta olmasa da kalır sayılır ve F2 katsayısıyla girer', () => {
    ['FF1', 'FF2', 'FF3'].forEach((h) => {
      expect(mezNotDurumu(h, muafiyettenKayit)).toBe('kaldi');
      expect(mezHarfKatsayisi(h, muafiyettenKayit)).toBe(0);
    });
  });
  it('aralıksız yazılan FF1 satırı ek harfe taşınır (F2 sayılır)', () => {
    const k = mezKuralNormalize({
      ...muafiyettenKayit,
      notOlcegi: muafiyettenKayit.notOlcegi.concat([{ harf: 'FF1', katsayi: 0, min: '', max: '' }]),
    });
    expect(k.notOlcegi.some((r) => r.harf === 'FF1')).toBe(false);
    const ff1 = k.ekHarfler.find((r) => r.harf === 'FF1');
    expect(ff1.sayilanHarf).toBe('F2');
    expect(ff1.gecer).toBe(false);
  });
  it('kayıtlı bayrak ve bölümün kendi ek harfi korunur', () => {
    const k = mezKuralNormalize({
      notOlcegi: [{ harf: 'C3', katsayi: 2, min: 60, max: 64, gecer: false }],
      ekHarfler: [{ harf: 'FF1', aciklama: 'özel', sayilanHarf: 'C3', gecer: false }],
    });
    expect(k.notOlcegi[0].gecer).toBe(false);
    expect(k.ekHarfler.filter((r) => r.harf === 'FF1')).toHaveLength(1);
    expect(k.ekHarfler.find((r) => r.harf === 'FF1').aciklama).toBe('özel');
  });
});

describe('Not Ölçekleri kartı: ÇAKÜ tablosu', () => {
  it('FF1 aralıksız satırı ek harf olarak kaydedilir, sorun çıkmaz', () => {
    const satirlar = muafiyettenKayit.notOlcegi.concat([
      { harf: 'FF1', katsayi: '0', min: '', max: '' },
    ]);
    expect(cakuTablosuSorunlari(satirlar)).toEqual([]);
    const kayit = cakuTablosuKaydi(satirlar, muafiyettenKayit);
    expect(kayit.notOlcegi.find((r) => r.harf === 'A').gecer).toBe(true);
    expect(kayit.notOlcegi.find((r) => r.harf === 'F1').gecer).toBe(false);
    expect(kayit.ekHarfler.find((r) => r.harf === 'FF1')).toMatchObject({
      sayilanHarf: 'F2',
      gecer: false,
    });
    expect(mezNotDurumu('FF1', kayit)).toBe('kaldi');
  });
  it('katsayısı tabloda olmayan aralıksız satır sorun verir', () => {
    expect(
      cakuTablosuSorunlari([
        { harf: 'F2', katsayi: 0, min: 0, max: 49 },
        { harf: 'FF1', katsayi: 0.7, min: '', max: '' },
      ])
    ).toHaveLength(1);
  });
  it('kart satırları FF1/FF2/FF3 ile gösterilir', () => {
    const harfler = cakuTablosuSatirlari(muafiyettenKayit).map((r) => r.harf);
    expect(harfler).toEqual(expect.arrayContaining(['A', 'F2', 'FF1', 'FF2', 'FF3']));
    expect(harfler).not.toContain('M');
  });
});
