import { describe, it, expect } from 'vitest';
import {
  BILGI_ALANLARI,
  alanBul,
  alanHatasi,
  alanSuzgeci,
  bilgiDegisti,
  bilgiHatalari,
  bilgiNormalle,
  bilgiOzetMetni,
} from '../lib/akademisyen-bilgi.js';

describe('BILGI_ALANLARI', () => {
  // ⚠ Bölüm Yönetimi → Akademisyenler ekranı da AYNI alan adlarını yazıyor.
  // Ad değişirse iki ekran iki ayrı değer tutmaya başlar.
  it('professors dokümanındaki alan adlarıyla birebir', () => {
    expect(BILGI_ALANLARI.map((a) => a.anahtar)).toEqual(['email', 'dahili', 'photoURL']);
  });

  // Kendi kaydını düzenlemek kendini yetkili yapmak olamaz.
  it('yetki alanı taşımaz', () => {
    const anahtarlar = BILGI_ALANLARI.map((a) => a.anahtar);
    ['isUniversityAdmin', 'isFacultyManager', 'isDeptManager', 'role', 'name'].forEach((y) =>
      expect(anahtarlar).not.toContain(y)
    );
  });

  it('alanBul bilinmeyende null', () => {
    expect(alanBul('email').etiket).toBe('E-posta');
    expect(alanBul('yok')).toBe(null);
  });
});

describe('alanHatasi', () => {
  it('boş alan hata vermez', () => {
    BILGI_ALANLARI.forEach((a) => expect(alanHatasi(a, '')).toBe(''));
  });

  it('e-posta biçimi denetlenir', () => {
    expect(alanHatasi('email', 'enis.sert@karatekin.edu.tr')).toBe('');
    expect(alanHatasi('email', 'enis(at)karatekin')).toMatch(/e-posta/i);
  });

  it('dahili yalnız rakam ve 3–6 hane', () => {
    expect(alanHatasi('dahili', '1234')).toBe('');
    expect(alanHatasi('dahili', '12 34')).toBe('');
    expect(alanHatasi('dahili', '12')).toMatch(/3–6/);
    expect(alanHatasi('dahili', '1234567')).toMatch(/3–6/);
    expect(alanHatasi('dahili', '12A4')).toMatch(/rakam/);
  });

  it('bilinmeyen alanda hata üretmez', () => {
    expect(alanHatasi('yok', 'x')).toBe('');
  });
});

describe('alanSuzgeci', () => {
  it('dahiliye harf yazılmaz', () => {
    expect(alanSuzgeci('dahili', '12a3b4')).toBe('1234');
  });

  it('e-posta süzülmez', () => {
    expect(alanSuzgeci('email', 'a.b@c.dd')).toBe('a.b@c.dd');
  });
});

describe('bilgiNormalle', () => {
  it('kırpar, boşları ve bilinmeyenleri atar', () => {
    expect(bilgiNormalle({ email: '  a@b.cd ', dahili: '   ', isDeptManager: true })).toEqual({
      email: 'a@b.cd',
    });
  });

  it('boş girdide boş kayıt', () => {
    expect(bilgiNormalle(null)).toEqual({});
  });
});

describe('bilgiHatalari', () => {
  it('yalnız bozuk alanı işaretler', () => {
    const h = bilgiHatalari({ email: 'bozuk', dahili: '1234' });
    expect(Object.keys(h)).toEqual(['email']);
  });

  it('tam kayıtta hata yok', () => {
    expect(bilgiHatalari({ email: 'a@b.cd', dahili: '1234', photoURL: 'x' })).toEqual({});
  });
});

describe('bilgiDegisti', () => {
  const kayit = { email: 'a@b.cd', dahili: '1234' };

  it('aynıysa false', () => {
    expect(bilgiDegisti({ ...kayit }, kayit)).toBe(false);
  });

  // Yalnız boşluk farkı kaydetmeye değmez.
  it('boşluk farkı değişiklik sayılmaz', () => {
    expect(bilgiDegisti({ email: ' a@b.cd ', dahili: '1234' }, kayit)).toBe(false);
  });

  it('gerçek değişiklik true', () => {
    expect(bilgiDegisti({ ...kayit, dahili: '5678' }, kayit)).toBe(true);
  });

  it('alan silinmesi de değişikliktir', () => {
    expect(bilgiDegisti({ email: 'a@b.cd' }, kayit)).toBe(true);
  });
});

describe('bilgiOzetMetni', () => {
  it('hiçbiri yoksa sonucunu söyler', () => {
    expect(bilgiOzetMetni({})).toMatch(/ulaşamaz/);
  });

  it('eksikleri adıyla sayar', () => {
    expect(bilgiOzetMetni({ email: 'a@b.cd' })).toBe('Eksik: Dahili · Fotoğraf');
  });

  it('tamsa tek cümle', () => {
    expect(bilgiOzetMetni({ email: 'a@b.cd', dahili: '1234', photoURL: 'x' })).toBe(
      'Bilgileriniz tam.'
    );
  });
});
