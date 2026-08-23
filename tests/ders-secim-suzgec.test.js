import { describe, it, expect } from 'vitest';
import {
  BU_DONEM,
  TUM_DONEMLER,
  DONEMSIZ,
  dersDonemi,
  donemUyuyorMu,
  donemSecenekleri,
  donemDisiSayisi,
} from '../lib/ders-secim-suzgec.js';

const guz = { code: 'BIL101', donem: 'guz' };
const bahar = { code: 'BIL102', donem: 'bahar' };
const yaz = { code: 'BIL190', donem: 'yaz' };
const bos = { code: 'BIL103' };

describe('dersDonemi', () => {
  it('tanınan dönemleri döndürür', () => {
    expect(dersDonemi(guz)).toBe('guz');
    expect(dersDonemi(bahar)).toBe('bahar');
    expect(dersDonemi(yaz)).toBe('yaz');
  });

  it('boş, tanınmayan ve eksik değerleri boş dönem sayar', () => {
    expect(dersDonemi(bos)).toBe('');
    expect(dersDonemi({ donem: '' })).toBe('');
    expect(dersDonemi({ donem: 'genel' })).toBe('');
    expect(dersDonemi(null)).toBe('');
  });

  it('büyük harf ve boşluk toleranslıdır', () => {
    expect(dersDonemi({ donem: ' Guz ' })).toBe('guz');
    expect(dersDonemi({ donem: 'BAHAR' })).toBe('bahar');
  });
});

describe('donemUyuyorMu', () => {
  it('bu yarıyıl: o dönemin dersleri ve dönemsizler', () => {
    expect(donemUyuyorMu(bahar, BU_DONEM, 'bahar')).toBe(true);
    expect(donemUyuyorMu(bos, BU_DONEM, 'bahar')).toBe(true);
    expect(donemUyuyorMu(guz, BU_DONEM, 'bahar')).toBe(false);
  });

  it('tüm dönemler GERÇEKTEN hepsini geçirir', () => {
    // Eski ekranın hatası buradaydı: "Tüm Dönemler" seçiliyken bile
    // görünmez yarıyıl süzgeci başka dönemin derslerini eliyordu.
    [guz, bahar, yaz, bos].forEach((c) => {
      expect(donemUyuyorMu(c, TUM_DONEMLER, 'bahar')).toBe(true);
    });
  });

  it('tek bir dönem seçilince yalnız o dönem gelir', () => {
    expect(donemUyuyorMu(guz, 'guz', 'bahar')).toBe(true);
    expect(donemUyuyorMu(bahar, 'guz', 'bahar')).toBe(false);
    expect(donemUyuyorMu(bos, 'guz', 'bahar')).toBe(false);
  });

  it('yaz dersi seçilebilir — eski ekranda hiç görünemiyordu', () => {
    expect(donemUyuyorMu(yaz, 'yaz', 'bahar')).toBe(true);
    expect(donemUyuyorMu(yaz, 'yaz', 'guz')).toBe(true);
  });

  it('dönemi belirtilmemişler ayrıca listelenebilir', () => {
    expect(donemUyuyorMu(bos, DONEMSIZ, 'guz')).toBe(true);
    expect(donemUyuyorMu(guz, DONEMSIZ, 'guz')).toBe(false);
  });

  it('seçim boşsa bu yarıyıl gibi davranır', () => {
    expect(donemUyuyorMu(guz, '', 'guz')).toBe(true);
    expect(donemUyuyorMu(bahar, '', 'guz')).toBe(false);
  });
});

describe('donemSecenekleri', () => {
  it('bulunulan yarıyılı etiketinde yazar', () => {
    expect(donemSecenekleri('bahar')[0].etiket).toContain('Bahar');
    expect(donemSecenekleri('guz')[0].etiket).toContain('Güz');
  });

  it('her seçenek benzersizdir', () => {
    const d = donemSecenekleri('guz').map((o) => o.deger);
    expect(new Set(d).size).toBe(d.length);
  });
});

describe('donemDisiSayisi', () => {
  const hepsi = [guz, bahar, yaz, bos];

  it('yalnız dönem yüzünden gizlenenleri sayar', () => {
    expect(donemDisiSayisi(hepsi, BU_DONEM, 'bahar')).toBe(2); // guz + yaz
    expect(donemDisiSayisi(hepsi, TUM_DONEMLER, 'bahar')).toBe(0);
  });

  it('öteki süzgeçlerden düşenleri saymaz', () => {
    // Arama 'BIL10' → yaz dersi zaten listede değil, gizlenen sayısına girmez.
    const arama = (c) => c.code.startsWith('BIL10');
    expect(donemDisiSayisi(hepsi, BU_DONEM, 'bahar', arama)).toBe(1); // yalnız guz
  });

  it('boş liste sıfır döner', () => {
    expect(donemDisiSayisi([], BU_DONEM, 'guz')).toBe(0);
    expect(donemDisiSayisi(null, BU_DONEM, 'guz')).toBe(0);
  });
});
