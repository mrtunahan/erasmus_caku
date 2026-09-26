// Tam ekran yoklamanın yerleşimi. Testlerin tamamı yaşanmış bir hatayı
// kilitler: kalabalık sınıfta karekod ekranın altına düşüp görünmez oluyordu
// (bkz. lib/yoklama-ekran-duzeni.js başlığı).
import { describe, it, expect } from 'vitest';
import {
  DAR_ESIK,
  darMi,
  karekodBoyutu,
  karekodSutunuStili,
  listeSutunuStili,
  satirStili,
} from '../lib/yoklama-ekran-duzeni.js';

describe('dar ekran eşiği', () => {
  it('geniş ekran dar değildir', () => {
    expect(darMi(1920)).toBe(false);
    expect(darMi(DAR_ESIK)).toBe(false);
  });

  it('eşiğin altı dardır', () => {
    expect(darMi(DAR_ESIK - 1)).toBe(true);
    expect(darMi(390)).toBe(true);
  });

  it('ölçülemeyen genişlik dar sayılır (alt alta dizmek güvenli taraftır)', () => {
    expect(darMi(undefined)).toBe(true);
    expect(darMi(NaN)).toBe(true);
    expect(darMi('abc')).toBe(true);
  });
});

describe('orta satır boyunu içerikten ALMAZ', () => {
  // ── HATANIN KENDİSİ ──
  // `flex-wrap: wrap` iken satırın yüksekliği en uzun öğeden (54 kişilik
  // liste → 2941px) hesaplanıyor, karekod sütunu ona eşitleniyor ve karekod
  // ekranın dışına düşüyordu.
  it('asla sarmaz', () => {
    expect(satirStili(false).flexWrap).toBe('nowrap');
    expect(satirStili(true).flexWrap).toBe('nowrap');
  });

  it('esneme tabanı sıfırdır — yükseklik ekrandan gelir', () => {
    expect(satirStili(false).flexBasis).toBe(0);
    expect(satirStili(true).flexBasis).toBe(0);
  });

  it('küçülmesini engelleyen örtük alt sınır kaldırılmıştır', () => {
    expect(satirStili(false).minHeight).toBe(0);
    expect(satirStili(true).minHeight).toBe(0);
  });

  it('geniş ekranda yan yana, dar ekranda alt alta', () => {
    expect(satirStili(false).flexDirection).toBe('row');
    expect(satirStili(true).flexDirection).toBe('column');
  });

  it('geniş ekranda satır taşmaz; dar ekranda kaydırılır', () => {
    expect(satirStili(false).overflowY).toBe('hidden');
    expect(satirStili(true).overflowY).toBe('auto');
  });
});

describe('karekod sütunu', () => {
  it('geniş ekranda sabit taban, dar ekranda kendi boyu', () => {
    expect(karekodSutunuStili(false).flexBasis).toBe(480);
    expect(karekodSutunuStili(true).flexBasis).toBe('auto');
  });

  // ── HATANIN KENDİSİ ──
  // Dar ekranda dikey ortalama, karekodu görünür alanın ÜSTÜNE taşıyordu.
  it('dar ekranda dikey ortalanmaz', () => {
    expect(karekodSutunuStili(true).justifyContent).toBe('flex-start');
    expect(karekodSutunuStili(false).justifyContent).toBe('center');
  });

  it('içerik uzunsa kaybolmaz, kaydırılır', () => {
    expect(karekodSutunuStili(false).overflowY).toBe('auto');
    expect(karekodSutunuStili(false).minHeight).toBe(0);
  });
});

describe('liste sütunu', () => {
  it('geniş ekranda büyümez, dar ekranda kalan yeri alır', () => {
    expect(listeSutunuStili(false).flexGrow).toBe(0);
    expect(listeSutunuStili(true).flexGrow).toBe(1);
  });

  it('kendi içinde kaydırılabilmesi için alt sınırı sıfırdır', () => {
    expect(listeSutunuStili(false).minHeight).toBe(0);
    expect(listeSutunuStili(true).minHeight).toBe(0);
  });

  it('geniş ekranda okunur bir genişliğin altına inmez', () => {
    expect(listeSutunuStili(false).minWidth).toBe(300);
    expect(listeSutunuStili(true).minWidth).toBe(0);
  });
});

describe('karekod boyutu', () => {
  it('geniş ekranda üst sınırda kalır', () => {
    expect(karekodBoyutu(1920, 1080)).toBe(440);
  });

  // ── HATANIN KENDİSİ ──
  // Yalnız yüksekliğe bakılınca dar telefonda karekod ekrandan taşıyordu.
  it('dar telefonda ekran genişliğine sığar', () => {
    expect(karekodBoyutu(420, 880)).toBe(324);
    expect(karekodBoyutu(390, 844)).toBeLessThanOrEqual(390 - 96);
  });

  it('alçak ekranda yüksekliğe sığar', () => {
    expect(karekodBoyutu(1920, 700)).toBe(320);
  });

  it('çok küçük ekranda bile okunur bir alt sınırı vardır', () => {
    expect(karekodBoyutu(200, 300)).toBe(200);
  });

  it('ölçülemeyen değerlerde makul bir boyut döner', () => {
    expect(karekodBoyutu(undefined, undefined)).toBe(420);
  });
});
