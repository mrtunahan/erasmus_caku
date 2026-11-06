import { describe, it, expect } from 'vitest';
import { mezuniyetHesapla, mezSilinmeSiniflandir } from '../lib/mezuniyet.js';

// 190905060 numaralı öğrencinin transkriptinden ilgili satırlar (sadeleştirilmiş).
const kural = { toplamYariyil: 8, isyeriYariyilSayisi: 0, toplamAkts: 240 };
const Z = (code, name, sinif) => ({ code, name, akts: 6, statu: 'Z', sinif, donem: 'guz' });
const S = (code, name) => ({ code, name, akts: 4, statu: 'S', sinif: 4, donem: 'bahar' });
const mufredat = [
  Z('BİL122', 'Ayrık Matematik', 1),
  Z('BİL307', 'Mikroişlemciler', 3),
  Z('BİL494', 'Bitirme Projesi', 4),
  S('BİL466', 'Biyobilişim ve Biyoteknoloji'),
  S('BİL321', 'Makine Öğrenmesi'),
  S('BİL471', 'Sayısal Analiz Yöntemleri'),
];
const r = (kod, ad, not, yil, yariyil, esdeger, statu) => ({
  kod,
  ad,
  akts: '6',
  not,
  yil,
  yariyil,
  esdeger: esdeger || '',
  statu: statu || '',
});
const alinan = [
  r('BİL122', 'Ayrık Matematik', 'F2', '2019', 'Bahar'),
  r('BİL142', 'Ayrık Matematik', 'FF1', '2020', 'Bahar', 'BİL122'),
  r('BİL142', 'Ayrık Matematik', 'F1', '2021', 'Bahar', 'BİL142'),
  r('MAT142', 'Ayrık Matematik ve Uygulamaları', 'C3', '2022', 'Bahar', 'BİL142'),
  r('BİL307', 'Mikroişlemciler', 'F2', '2024', 'Güz'),
  r('BİL307', 'Mikroişlemciler', 'FF1', '2025', 'Güz', 'BİL307'),
  r('BM304', 'Mikroişlemciler', 'B3', '2025', 'Yaz', 'BİL307'),
  r('BİL494', 'Bitirme projesi', 'FF1', '2022', 'Bahar'),
  r('BİL494', 'Bitirme projesi', 'FF1', '2025', 'Bahar', 'BİL494'),
  r('BM498', 'Bitirme Tezi', 'B3', '2025', 'Yaz', 'BİL494'),
  r('BİL466', 'Biyobilişim ve Biyoteknoloji', 'F1', '2023', 'Güz', '', 'Seçmeli'),
  r('BİL321', 'Makine Öğrenmesi', 'F2', '2025', 'Bahar', 'BİL321', 'Seçmeli'),
  r('BİL471', 'Sayısal Analiz Yöntemleri', 'FF1', '2025', 'Bahar', 'BİL471', 'Seçmeli'),
];

describe('eşdeğer zinciri ve kodu değişen dersler', () => {
  const sonuc = mezuniyetHesapla(mufredat, alinan, kural);
  const sinif = mezSilinmeSiniflandir(sonuc);

  it('MAT142 → BİL142 → BİL122 zinciri müfredattaki Ayrık Matematik sayılır', () => {
    const mat = sonuc.kayitlar.find((x) => x.kod === 'MAT142');
    expect(mat.mufredatta).toBe(true);
    expect(sonuc.kalanZorunlu.map((c) => c.code)).not.toContain('BİL122');
  });

  it('yaz okulunda yeni kodla geçilen dersler (BM304, BM498) zorunlu eksik değildir', () => {
    expect(sonuc.kalanZorunlu).toEqual([]);
    expect(sinif.engel).toEqual([]);
  });

  it('silinmesi gerekenler yalnız geçilmemiş seçmeliler', () => {
    expect(sinif.silinmeli.map((x) => x.r.kod).sort()).toEqual(['BİL321', 'BİL466', 'BİL471']);
  });
});
