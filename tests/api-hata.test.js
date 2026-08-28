// ══════════════════════════════════════════════════════════════
// "Sunucudan veri alınamıyor" bandı ne zaman çıkmalı?
//
// Yetki reddi arıza değildir: bazı koleksiyonlar bazı rollere bilerek
// kapalı. Öğrenci yatay geçişi açtığında sayfa düzgün çalışırken kırmızı
// uyarı görüyordu.
// ══════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { yetkiReddiMi, bantGosterilsinMi } from '../lib/api-hata.js';

const hata = (status, mesaj) => Object.assign(new Error(mesaj || 'x'), { status });

describe('yetkiReddiMi', () => {
  it('401 ve 403 yetki reddidir', () => {
    expect(yetkiReddiMi(hata(401))).toBe(true);
    expect(yetkiReddiMi(hata(403))).toBe(true);
  });
  it('sunucu ve ağ hataları yetki reddi değildir', () => {
    [500, 502, 504, 404, 429].forEach((k) => expect(yetkiReddiMi(hata(k))).toBe(false));
  });
  it('durum kodu olmayan hata (ağ kopması) yetki reddi değildir', () => {
    expect(yetkiReddiMi(new Error('Failed to fetch'))).toBe(false);
    expect(yetkiReddiMi(null)).toBe(false);
  });
});

describe('bantGosterilsinMi', () => {
  it('YETKİ REDDİNDE BANT ÇIKMAZ — kural uygulandı, arıza yok', () => {
    expect(bantGosterilsinMi(hata(403))).toBe(false);
    expect(bantGosterilsinMi(hata(401))).toBe(false);
  });
  it('sunucu arızasında bant çıkar', () => {
    expect(bantGosterilsinMi(hata(500))).toBe(true);
    expect(bantGosterilsinMi(hata(502))).toBe(true);
  });
  it('ağ kopmasında bant çıkar', () => {
    expect(bantGosterilsinMi(new Error('Failed to fetch'))).toBe(true);
  });
});
