import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { standartAd } from '../lib/akademik-unvan.js';

const require = createRequire(import.meta.url);
const {
  adBuyukHarf,
  ogrenciAdlariniBuyut,
  cevir,
  adHaritasiPlanla,
} = require('../server/lib/ad-bicim.js');

describe('öğrenci adı büyük harf', () => {
  it('Türkçe kural', () => {
    expect(adBuyukHarf(' ılgın  işık ')).toBe('ILGIN İŞIK');
  });
  it('yalnız ad alanları, değişmeyince aynı nesne', () => {
    const v = { firstName: 'ali', lastName: 'veli', studentNumber: '1' };
    expect(ogrenciAdlariniBuyut(v)).toEqual({
      firstName: 'ALİ',
      lastName: 'VELİ',
      studentNumber: '1',
    });
    const b = { firstName: 'ALİ' };
    expect(ogrenciAdlariniBuyut(b)).toBe(b);
  });
});

describe('akademisyen adı dönüşüm planı', () => {
  it('çakışan ve birleşmesi gereken adlar atlanır', () => {
    const p = adHaritasiPlanla(
      [
        'Öğrt. Gör. Gökalp Saylam',
        'Dr. Öğr. Üyesi Esra Sivari',
        'Ali Veli',
        'ALİ VELİ',
        'Dr. Öğr. Üyesi AYŞE KAYA',
      ],
      standartAd
    );
    expect([...p.harita]).toEqual([
      ['Öğrt. Gör. Gökalp Saylam', 'Öğr. Gör. GÖKALP SAYLAM'],
      ['Dr. Öğr. Üyesi Esra Sivari', 'Dr. Öğr. Üyesi ESRA SİVARİ'],
    ]);
    expect(p.atlanan).toHaveLength(1);
    expect(p.atlanan[0]).toContain('zaten bir kayıt var');
  });
  it('atıflar: metin, dizi ve şifre anahtarı çevrilir; cümle içi ad değişmez', () => {
    const h = new Map([['Dr. Ali Veli', 'Dr. ALİ VELİ']]);
    const s = cevir(
      {
        professor: 'Dr. Ali Veli',
        managerNames: ['Dr. Ali Veli', 'X'],
        sifreler: { 'Dr. Ali Veli': 'hash' },
        not: 'Danışman Dr. Ali Veli olacak',
        tarih: new Date(0),
      },
      h
    );
    expect(s.degisti).toBe(true);
    expect(s.deger.professor).toBe('Dr. ALİ VELİ');
    expect(s.deger.managerNames).toEqual(['Dr. ALİ VELİ', 'X']);
    expect(s.deger.sifreler).toEqual({ 'Dr. ALİ VELİ': 'hash' });
    expect(s.deger.not).toBe('Danışman Dr. Ali Veli olacak');
    expect(s.deger.tarih).toBeInstanceOf(Date);
  });
});
