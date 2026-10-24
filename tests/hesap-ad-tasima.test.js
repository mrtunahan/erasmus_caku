import { describe, it, expect } from 'vitest';
import { yeniAdBul } from '../server/lib/hesap-ad-tasima.js';

describe('eski adla kalan hesap', () => {
  const adlar = ['Öğr. Gör. GÖKALP SAYLAM', 'Dr. Öğr. Üyesi ALİ VELİ', 'Prof. Dr. ALİ VELİ'];
  it('unvan ve harf farkıyla tek kişiye uyan eski ad yeni ada çözülür', () => {
    expect(yeniAdBul('Öğrt. Gör. Gökalp Saylam', adlar)).toBe('Öğr. Gör. GÖKALP SAYLAM');
  });
  it('ad değişmemişse ya da iki kişiye uyuyorsa dokunulmaz', () => {
    expect(yeniAdBul('Öğr. Gör. GÖKALP SAYLAM', adlar)).toBe('');
    expect(yeniAdBul('Ali Veli', adlar)).toBe('');
    expect(yeniAdBul('Bilinmeyen Kişi', adlar)).toBe('');
  });
});
