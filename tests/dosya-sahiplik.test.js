// Yüklenen dosyaya erişim: öğrenci başkasının staj belgesini indiremez,
// kendi belgesini ve kişiye bağlı olmayan dosyaları indirir.
import { describe, it, expect } from 'vitest';
import { dosyaErisebilirMi, yolunOgrenciNumarasi } from '../server/lib/dosya-sahiplik.js';

const OGRENCI = { role: 'student', identifier: '2021001' };
const HOCA = { role: 'professor', identifier: 'Dr. Mehmet Demir' };

describe('yolun sahibi', () => {
  it('staj klasörü numarayı taşır', () => {
    expect(yolunOgrenciNumarasi('staj_belgeler/2021001/abc.pdf')).toBe('2021001');
    expect(yolunOgrenciNumarasi('staj_belgeler/2021001/alt/abc.pdf')).toBe('2021001');
  });

  it('kişiye bağlı olmayan klasörlerde sahip yok', () => {
    expect(yolunOgrenciNumarasi('muafiyet_belgeler/x.pdf')).toBe('');
    expect(yolunOgrenciNumarasi('forms/x.docx')).toBe('');
    expect(yolunOgrenciNumarasi('portal_files/a.png')).toBe('');
    expect(yolunOgrenciNumarasi('')).toBe('');
  });
});

describe('erişim kararı', () => {
  it('öğrenci kendi staj belgesini indirir', () => {
    expect(dosyaErisebilirMi('staj_belgeler/2021001/a.pdf', OGRENCI, ['2021001']).izin).toBe(true);
  });

  it('BAŞKASININ staj belgesini indiremez', () => {
    const k = dosyaErisebilirMi('staj_belgeler/2021002/a.pdf', OGRENCI, ['2021001']);
    expect(k.izin).toBe(false);
    expect(k.sebep).toBe('baskasinin_belgesi');
  });

  it('ÇAP öğrencisi ikinci numarasının belgesini de indirir', () => {
    expect(
      dosyaErisebilirMi('staj_belgeler/2021555/a.pdf', OGRENCI, ['2021001', '2021555']).izin
    ).toBe(true);
  });

  it('numara listesi verilmese bile kendi numarası kabul edilir', () => {
    expect(dosyaErisebilirMi('staj_belgeler/2021001/a.pdf', OGRENCI, null).izin).toBe(true);
  });

  it('personel kısıtlanmaz — belgeyi değerlendiren odur', () => {
    expect(dosyaErisebilirMi('staj_belgeler/2021002/a.pdf', HOCA, []).izin).toBe(true);
  });

  it('kişiye bağlı olmayan dosya öğrenciye açık kalır', () => {
    expect(dosyaErisebilirMi('muafiyet_belgeler/x.pdf', OGRENCI, ['2021001']).izin).toBe(true);
    expect(dosyaErisebilirMi('forms/rapor.docx', OGRENCI, ['2021001']).izin).toBe(true);
  });

  it('kullanıcı çözülemediyse denetim yapılmaz (dosya kapısı kimlik kapısı değildir)', () => {
    expect(dosyaErisebilirMi('staj_belgeler/2021002/a.pdf', null, []).izin).toBe(true);
  });
});
