import { describe, it, expect } from 'vitest';
import { AI_SURE_SINIRI_MS, sureAsimiMesaji, sureSinirli } from '../server/lib/ai-sure.js';

describe('AI_SURE_SINIRI_MS', () => {
  it('nginx sınırının (300 sn) altında kalır', () => {
    // Üstünde olursa bağlantıyı yine nginx keser ve kullanıcı açıklamasız
    // 504 görür — düzeltmenin bütün amacı bu.
    expect(AI_SURE_SINIRI_MS).toBeLessThan(300000);
  });

  it('kısa bir belge için bol bol yeterlidir', () => {
    expect(AI_SURE_SINIRI_MS).toBeGreaterThanOrEqual(120000);
  });
});

describe('sureAsimiMesaji', () => {
  it('süreyi saniye olarak söyler', () => {
    expect(sureAsimiMesaji(240000)).toContain('240 saniyede');
  });

  it('ne yapılacağını da söyler', () => {
    // "Okunamadı" tek başına kullanıcıya hiçbir şey söylemiyordu.
    const m = sureAsimiMesaji(AI_SURE_SINIRI_MS);
    expect(m).toMatch(/taranmış|sayfa/i);
  });

  it('geçersiz girdide çökmez', () => {
    expect(sureAsimiMesaji(null)).toContain('0 saniyede');
  });
});

describe('sureSinirli', () => {
  it('süresinde biten iş normal döner', async () => {
    await expect(sureSinirli(Promise.resolve('bitti'), 1000)).resolves.toBe('bitti');
  });

  it('işin kendi hatası olduğu gibi geçer', async () => {
    await expect(sureSinirli(Promise.reject(new Error('model hatası')), 1000)).rejects.toThrow(
      'model hatası'
    );
  });

  it('süre dolarsa sureAsti işaretli hata fırlatır', async () => {
    const bitmeyen = new Promise(() => {});
    await expect(sureSinirli(bitmeyen, 20)).rejects.toMatchObject({ sureAsti: true });
  });

  it('süre aşımı hatası açıklamalıdır', async () => {
    const bitmeyen = new Promise(() => {});
    await expect(sureSinirli(bitmeyen, 20)).rejects.toThrow(/saniyede okunamadı/);
  });
});
