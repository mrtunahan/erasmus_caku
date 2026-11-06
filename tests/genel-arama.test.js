import { describe, it, expect } from 'vitest';
import {
  eslesmePuani,
  modulSonuclari,
  islemSonuclari,
  ogrenciAramasiAcikMi,
} from '../lib/genel-arama.js';

const gorunur = [
  { id: 'benim', ad: 'Benim Sayfam' },
  { id: 'mezuniyet', ad: 'Mezuniyet' },
  { id: 'muafiyet', ad: 'Ders Muafiyet' },
];

describe('genel arama', () => {
  it('Türkçe harf ve büyük-küçük harf duyarsız eşleşir', () => {
    expect(eslesmePuani('Ders Muafiyet', 'muaf')).toBeGreaterThan(0);
    expect(eslesmePuani('Öğrenci Portalı', 'ogrenci')).toBeGreaterThan(0);
    expect(eslesmePuani('Mezuniyet', 'xyz')).toBe(0);
  });

  it('baştan eşleşme içinde geçmeden önce gelir', () => {
    expect(eslesmePuani('Mezuniyet', 'mez')).toBeGreaterThan(eslesmePuani('Ders Muafiyet', 'afi'));
  });

  it('anahtar kelime yalnız görünen modülü bulur', () => {
    const r = modulSonuclari(gorunur, 'transkript');
    expect(r.map((x) => x.id)).toEqual(['mezuniyet']);
    expect(r[0].ipucu).toBe('transkript');
  });

  it('menüde olmayan modül anahtar kelimeyle de çıkmaz (yetki taşımaz)', () => {
    // "kullanıcı ekle" Kullanıcı Yönetimi'nin anahtarı; kullanıcı modülü görünmüyor.
    expect(modulSonuclari(gorunur, 'kullanıcı ekle')).toEqual([]);
    expect(modulSonuclari(gorunur, 'staj defteri')).toEqual([]);
  });

  it('boş aramada görünen modüllerin tamamı döner', () => {
    expect(modulSonuclari(gorunur, '').map((x) => x.id)).toEqual([
      'benim',
      'mezuniyet',
      'muafiyet',
    ]);
  });

  it('işlemler ad ve anahtar kelimeyle bulunur', () => {
    const islemler = [
      { id: 'sifre', ad: 'Şifre değiştir', anahtarlar: ['parola'] },
      { id: 'cikis', ad: 'Çıkış yap' },
    ];
    expect(islemSonuclari(islemler, 'parola').map((i) => i.id)).toEqual(['sifre']);
    expect(islemSonuclari(islemler, 'cik').map((i) => i.id)).toEqual(['cikis']);
  });

  it('öğrenci ve aday öğrenci araması yapamaz', () => {
    expect(ogrenciAramasiAcikMi({ role: 'student' })).toBe(false);
    expect(ogrenciAramasiAcikMi({ role: 'student', aday: true })).toBe(false);
    expect(ogrenciAramasiAcikMi({ role: 'professor' })).toBe(true);
    expect(ogrenciAramasiAcikMi({ role: 'memur' })).toBe(true);
    expect(ogrenciAramasiAcikMi(null)).toBe(false);
  });
});
