import { describe, it, expect } from 'vitest';
import { aiIstekHataMetni } from '../lib/ai-istek-hatasi.js';

describe('aiIstekHataMetni', () => {
  it('sunucunun açıklaması varsa o kullanılır', () => {
    expect(aiIstekHataMetni(422, { error: 'Model sonuç üretemedi.' })).toBe(
      'Model sonuç üretemedi.'
    );
  });

  it('BİLDİRİLEN HATA: gövdesiz 504 artık ne olduğunu söyler', () => {
    // nginx'in 504'ü HTML döndürür; data boş kalır ve eski metin yalnız
    // "Satırlar okunamadı (HTTP 504)" idi.
    const m = aiIstekHataMetni(504, {}, 'Satırlar okunamadı');
    expect(m).toMatch(/zaman aşımı/i);
    expect(m).toMatch(/sayfalı|taranmış/i);
  });

  it('408 de zaman aşımı sayılır', () => {
    expect(aiIstekHataMetni(408, null, 'x')).toMatch(/zaman aşımı/i);
  });

  it('502/503 servis erişimi der', () => {
    expect(aiIstekHataMetni(502, {}, 'x')).toMatch(/ulaşılamadı/i);
    expect(aiIstekHataMetni(503, {}, 'x')).toMatch(/ulaşılamadı/i);
  });

  it('429 hız sınırı, 413 boyut, 401/403 yetki', () => {
    expect(aiIstekHataMetni(429, {}, 'x')).toMatch(/Çok fazla/i);
    expect(aiIstekHataMetni(413, {}, 'x')).toMatch(/çok büyük/i);
    expect(aiIstekHataMetni(401, {}, 'x')).toMatch(/yetkiniz yok/i);
    expect(aiIstekHataMetni(403, {}, 'x')).toMatch(/yetkiniz yok/i);
  });

  it('bilinmeyen kodda varsayılan metin + kod', () => {
    expect(aiIstekHataMetni(418, {}, 'Satırlar okunamadı')).toBe('Satırlar okunamadı (HTTP 418)');
  });

  it('kod yoksa yalnız varsayılan', () => {
    expect(aiIstekHataMetni(0, {}, 'Satırlar okunamadı')).toBe('Satırlar okunamadı');
  });

  it('boş sunucu mesajı yok sayılır', () => {
    expect(aiIstekHataMetni(504, { error: '   ' }, 'x')).toMatch(/zaman aşımı/i);
  });
});
