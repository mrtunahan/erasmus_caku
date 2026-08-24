import { describe, it, expect } from 'vitest';
import {
  duyuruKimligi,
  sahiplikDamgasi,
  sahipliMi,
  sahibiMi,
  duyuruDuzenlenebilirMi,
  duzenlemeEngeli,
} from '../lib/duyuru-sahiplik.js';

const yazan = { identifier: 'İsmail Çınar', name: 'İsmail Çınar', role: 'professor' };
const baskasi = { identifier: 'A. Tunahan KORKMAZ', name: 'A. Tunahan KORKMAZ', role: 'professor' };
const uniAdmin = {
  identifier: 'Rektörlük',
  name: 'Rektörlük',
  role: 'professor',
  isUniversityAdmin: true,
};

const duyuru = { baslik: 'x', ...sahiplikDamgasi(yazan) };
const eskiKayit = { baslik: 'eski' }; // olusturanId yok

describe('sahiplikDamgasi', () => {
  it('kimlik, ad ve rolü kayda yazar', () => {
    expect(sahiplikDamgasi(yazan)).toEqual({
      olusturanId: 'İsmail Çınar',
      olusturanAd: 'İsmail Çınar',
      olusturanRol: 'professor',
    });
  });

  it('boş kullanıcıda boş damga üretir', () => {
    expect(sahiplikDamgasi(null).olusturanId).toBe('');
  });
});

describe('duyuruKimligi', () => {
  it('identifier yoksa ada düşer', () => {
    expect(duyuruKimligi({ name: 'Ayşe Yılmaz' })).toBe('Ayşe Yılmaz');
    expect(duyuruKimligi({ identifier: 'A', name: 'B' })).toBe('A');
  });
});

describe('sahibiMi', () => {
  it('yazanı tanır', () => {
    expect(sahibiMi(duyuru, yazan)).toBe(true);
  });

  it('Türkçe büyük/küçük harf ve unvan farkına takılmaz', () => {
    expect(sahibiMi(duyuru, { identifier: 'İSMAİL ÇINAR' })).toBe(true);
    expect(sahibiMi(duyuru, { identifier: 'Dr. Öğr. Üyesi İsmail Çınar' })).toBe(true);
  });

  it('başkasını sahip saymaz', () => {
    expect(sahibiMi(duyuru, baskasi)).toBe(false);
  });

  it('sahipsiz kayıtta kimse sahip değildir', () => {
    // Boş anahtarlar eşleşseydi herkes her eski kaydın sahibi olurdu.
    expect(sahibiMi(eskiKayit, yazan)).toBe(false);
    expect(sahibiMi({ olusturanId: '' }, { identifier: '' })).toBe(false);
  });
});

describe('duyuruDuzenlenebilirMi', () => {
  it('yalnız yazan düzenleyebilir', () => {
    expect(duyuruDuzenlenebilirMi(duyuru, yazan)).toBe(true);
    expect(duyuruDuzenlenebilirMi(duyuru, baskasi)).toBe(false);
  });

  it('ÜNİVERSİTE YETKİLİSİ bile başkasının duyurusuna dokunamaz', () => {
    // Kapsam yetkisi görmeyi verir, başkasının kaydını değiştirmeyi değil.
    expect(duyuruDuzenlenebilirMi(duyuru, uniAdmin)).toBe(false);
  });

  it('sahipsiz eski kaydı yalnız üniversite yetkilisi devralır', () => {
    expect(duyuruDuzenlenebilirMi(eskiKayit, uniAdmin)).toBe(true);
    expect(duyuruDuzenlenebilirMi(eskiKayit, { role: 'admin' })).toBe(true);
    expect(duyuruDuzenlenebilirMi(eskiKayit, yazan)).toBe(false);
    expect(duyuruDuzenlenebilirMi(eskiKayit, baskasi)).toBe(false);
  });

  it('boş girdide izin vermez', () => {
    expect(duyuruDuzenlenebilirMi(null, yazan)).toBe(false);
    expect(duyuruDuzenlenebilirMi(duyuru, null)).toBe(false);
  });
});

describe('duzenlemeEngeli', () => {
  it('izin varsa boş döner', () => {
    expect(duzenlemeEngeli(duyuru, yazan)).toBe('');
  });

  it('yayınlayanın adını söyler', () => {
    expect(duzenlemeEngeli(duyuru, baskasi)).toContain('İsmail Çınar');
  });

  it('ad bilinmiyorsa genel bir sebep verir', () => {
    expect(duzenlemeEngeli({ olusturanId: 'x' }, baskasi)).toContain('başka bir yetkili');
  });
});

describe('sahipliMi', () => {
  it('damgalı ve damgasız kaydı ayırır', () => {
    expect(sahipliMi(duyuru)).toBe(true);
    expect(sahipliMi(eskiKayit)).toBe(false);
    expect(sahipliMi(null)).toBe(false);
  });
});
