import { describe, it, expect } from 'vitest';
import { adAnahtari, adaylariBul } from '../server/lib/cap-aday-eslestirme.js';

const ogr = (no, ad, soyad, bolum, ek) =>
  Object.assign({ studentNumber: no, firstName: ad, lastName: soyad, departmentId: bolum }, ek);

describe('adAnahtari', () => {
  it('Türkçe büyütmeyle ad anahtarı üretir', () => {
    expect(adAnahtari({ firstName: 'Ayşe', lastName: 'Demir' })).toBe('AYŞE DEMİR');
    expect(adAnahtari({ firstName: 'ilker', lastName: 'ışık' })).toBe('İLKER IŞIK');
  });

  it('fazla boşluk temizlenir', () => {
    expect(adAnahtari({ firstName: '  Ali  ', lastName: ' Veli ' })).toBe('ALİ VELİ');
  });

  it('adsız kayıt anahtarsızdır', () => {
    expect(adAnahtari({})).toBe('');
    expect(adAnahtari(null)).toBe('');
  });
});

describe('adaylariBul', () => {
  it('farklı bölümlerdeki aynı adlı iki kaydı KESİN aday sayar', () => {
    const kayitlar = [
      ogr('2021001', 'Ayşe', 'Demir', 'bilgisayar'),
      ogr('2021777', 'Ayşe', 'Demir', 'kimya'),
    ];
    const { kesin, supheli } = adaylariBul(kayitlar);
    expect(kesin.length).toBe(1);
    expect(kesin[0].ad).toBe('AYŞE DEMİR');
    expect([kesin[0].a.studentNumber, kesin[0].b.studentNumber].sort()).toEqual([
      '2021001',
      '2021777',
    ]);
    expect(supheli).toEqual([]);
  });

  it('ADI İKİDEN ÇOK GEÇEN kayıtlar şüphelidir, bağlanmaz', () => {
    // Ad kimlik değildir: üç "Mehmet Yılmaz"ın hangi ikisinin aynı kişi
    // olduğunu ad söylemez. Yanlış bağ, birinin kayıtlarını ötekine açar.
    const kayitlar = [
      ogr('1', 'Mehmet', 'Yılmaz', 'bilgisayar'),
      ogr('2', 'Mehmet', 'Yılmaz', 'kimya'),
      ogr('3', 'Mehmet', 'Yılmaz', 'makine'),
    ];
    const { kesin, supheli } = adaylariBul(kayitlar);
    expect(kesin).toEqual([]);
    expect(supheli.length).toBe(1);
    expect(supheli[0].sebep).toMatch(/3 kayıt/);
  });

  it('AYNI BÖLÜMDEKİ iki kayıt ÇAP değil, mükerrerdir', () => {
    const kayitlar = [ogr('1', 'Ali', 'Veli', 'bilgisayar'), ogr('2', 'Ali', 'Veli', 'bilgisayar')];
    const { kesin, supheli } = adaylariBul(kayitlar);
    expect(kesin).toEqual([]);
    expect(supheli[0].sebep).toMatch(/mükerrer/i);
  });

  it('zaten bağlı çift ayrı raporlanır, tekrar bağlanmaz', () => {
    const kayitlar = [
      ogr('2021001', 'Ayşe', 'Demir', 'bilgisayar', { bagliOgrenciNolar: ['2021777'] }),
      ogr('2021777', 'Ayşe', 'Demir', 'kimya', { bagliOgrenciNolar: ['2021001'] }),
    ];
    const { kesin, zatenBagli } = adaylariBul(kayitlar);
    expect(kesin).toEqual([]);
    expect(zatenBagli.length).toBe(1);
  });

  it('TEK YÖNLÜ bağ da "zaten bağlı" sayılır', () => {
    const kayitlar = [
      ogr('2021001', 'Ayşe', 'Demir', 'bilgisayar', { bagliOgrenciNolar: ['2021777'] }),
      ogr('2021777', 'Ayşe', 'Demir', 'kimya'),
    ];
    expect(adaylariBul(kayitlar).zatenBagli.length).toBe(1);
  });

  it('bölümü boş kayıt şüphelidir', () => {
    const kayitlar = [ogr('1', 'Ali', 'Veli', 'bilgisayar'), ogr('2', 'Ali', 'Veli', '')];
    expect(adaylariBul(kayitlar).supheli[0].sebep).toMatch(/bölümü boş/i);
  });

  it('numarasız kayıt eşleştirmeye hiç girmez', () => {
    const kayitlar = [ogr('', 'Ali', 'Veli', 'bilgisayar'), ogr('2', 'Ali', 'Veli', 'kimya')];
    const { kesin, supheli } = adaylariBul(kayitlar);
    expect(kesin).toEqual([]);
    expect(supheli).toEqual([]);
  });

  it('adsız kayıt eşleştirmeye girmez', () => {
    const kayitlar = [ogr('1', '', '', 'bilgisayar'), ogr('2', '', '', 'kimya')];
    expect(adaylariBul(kayitlar).kesin).toEqual([]);
  });

  it('tek başına duran öğrenci aday değildir', () => {
    expect(adaylariBul([ogr('1', 'Ali', 'Veli', 'bilgisayar')]).kesin).toEqual([]);
  });

  it('birden çok aday alfabetik sıralanır', () => {
    const kayitlar = [
      ogr('1', 'Zeynep', 'Kaya', 'bilgisayar'),
      ogr('2', 'Zeynep', 'Kaya', 'kimya'),
      ogr('3', 'Ahmet', 'Ak', 'bilgisayar'),
      ogr('4', 'Ahmet', 'Ak', 'makine'),
    ];
    expect(adaylariBul(kayitlar).kesin.map((x) => x.ad)).toEqual(['AHMET AK', 'ZEYNEP KAYA']);
  });

  it('boş girdi çökmez', () => {
    expect(adaylariBul(null)).toEqual({ kesin: [], supheli: [], zatenBagli: [] });
  });
});
