import { describe, it, expect } from 'vitest';
import { akademikYilBul, donemEtiketi } from '../lib/akademik-donem.js';
import { bolumKisaAd } from '../lib/bolum-ad.js';

describe('akademikYilBul', () => {
  it('yaz dönemi bir ÖNCEKİ eylülde başlayan yıla aittir', () => {
    // Dilekçenin çıktığı gerçek durum: 08.08.2026 → 2025-2026
    expect(akademikYilBul('2026-08-08')).toBe('2025-2026');
    expect(akademikYilBul('2026-06-01')).toBe('2025-2026');
  });

  it('eylül ve sonrası yeni akademik yıldır', () => {
    expect(akademikYilBul('2026-09-01')).toBe('2026-2027');
    expect(akademikYilBul('2026-12-31')).toBe('2026-2027');
  });

  it('ocak–ağustos önceki yıla düşer', () => {
    expect(akademikYilBul('2027-01-05')).toBe('2026-2027');
    expect(akademikYilBul('2027-08-31')).toBe('2026-2027');
  });

  it('başlangıç ayı değiştirilebilir (ekim başlangıçlı kurum)', () => {
    expect(akademikYilBul('2026-09-15', 10)).toBe('2025-2026');
    expect(akademikYilBul('2026-10-01', 10)).toBe('2026-2027');
  });

  it('geçersiz başlangıç ayı varsayılana düşer', () => {
    expect(akademikYilBul('2026-09-15', 0)).toBe('2026-2027');
    expect(akademikYilBul('2026-09-15', 99)).toBe('2026-2027');
  });

  it('Date, epoch-saniye ve Firestore damgası kabul eder', () => {
    expect(akademikYilBul(new Date('2026-08-08'))).toBe('2025-2026');
    expect(akademikYilBul({ _seconds: Date.UTC(2026, 7, 8) / 1000 })).toBe('2025-2026');
    expect(akademikYilBul({ seconds: Date.UTC(2026, 9, 8) / 1000 })).toBe('2026-2027');
  });

  it('tarih yoksa/bozuksa bugüne düşer — belge asla boş kalmaz', () => {
    const bugun = akademikYilBul(new Date());
    expect(akademikYilBul(null)).toBe(bugun);
    expect(akademikYilBul('')).toBe(bugun);
    expect(akademikYilBul('lorem')).toBe(bugun);
    expect(akademikYilBul({})).toBe(bugun);
    expect(akademikYilBul(undefined)).toMatch(/^\d{4}-\d{4}$/);
  });
});

describe('donemEtiketi', () => {
  it('haziran–ağustos yazdır', () => {
    expect(donemEtiketi('2026-06-10')).toBe('Yaz');
    expect(donemEtiketi('2026-08-08')).toBe('Yaz');
  });
  it('eylül–ocak güz, şubat–mayıs bahardır', () => {
    expect(donemEtiketi('2026-09-20')).toBe('Güz');
    expect(donemEtiketi('2026-12-01')).toBe('Güz');
    expect(donemEtiketi('2027-01-10')).toBe('Güz');
    expect(donemEtiketi('2027-03-01')).toBe('Bahar');
    expect(donemEtiketi('2027-05-31')).toBe('Bahar');
  });
});

describe('bolumKisaAd', () => {
  it('"Mühendisliği" ekini atar', () => {
    expect(bolumKisaAd('Bilgisayar Mühendisliği')).toBe('Bilgisayar');
    expect(bolumKisaAd('Gıda Mühendisliği')).toBe('Gıda');
  });

  it('"… Mühendisliği Bölümü" yazımını tek geçişte sadeleştirir', () => {
    expect(bolumKisaAd('Bilgisayar Mühendisliği Bölümü')).toBe('Bilgisayar');
  });

  it('tümü büyük yazımda da çalışır (Türkçe İ/I duyarlı)', () => {
    expect(bolumKisaAd('GIDA MÜHENDİSLİĞİ')).toBe('GIDA');
    expect(bolumKisaAd('BİLGİSAYAR MÜHENDİSLİĞİ BÖLÜMÜ')).toBe('BİLGİSAYAR');
  });

  it('ek taşımayan adları olduğu gibi bırakır', () => {
    expect(bolumKisaAd('Moleküler Biyoloji ve Genetik')).toBe('Moleküler Biyoloji ve Genetik');
    expect(bolumKisaAd('Matematik')).toBe('Matematik');
  });

  it('her şey kırpılırsa orijinali korur', () => {
    expect(bolumKisaAd('Mühendisliği')).toBe('Mühendisliği');
    expect(bolumKisaAd('Bölümü')).toBe('Bölümü');
  });

  it('boş/geçersiz girdide boş döner', () => {
    expect(bolumKisaAd('')).toBe('');
    expect(bolumKisaAd(null)).toBe('');
    expect(bolumKisaAd(undefined)).toBe('');
  });
});
