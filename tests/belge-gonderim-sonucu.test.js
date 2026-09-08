import { describe, it, expect } from 'vitest';
import { gonderimBasarili, gonderimHataMetni } from '../lib/belge-gonderim-sonucu.js';

describe('gonderimBasarili', () => {
  it('ok:true başarılıdır', () => {
    expect(gonderimBasarili({ ok: true })).toBe(true);
  });

  it('zatenVar da başarılıdır', () => {
    expect(gonderimBasarili({ ok: true, zatenVar: true })).toBe(true);
  });

  it('ok:false başarısızdır', () => {
    expect(gonderimBasarili({ ok: false, reason: 'kapsam-yok' })).toBe(false);
  });

  it('sonuç dönmeyen eski çağrılar başarılı sayılır', () => {
    // Bütün çağrı yerleri sonucu döndürmüyor; sessizce hata gösterilmesin.
    expect(gonderimBasarili(undefined)).toBe(true);
    expect(gonderimBasarili(null)).toBe(true);
  });
});

describe('gonderimHataMetni', () => {
  it('BİLDİRİLEN HATA: kapsamsız gönderim ne yapılacağını söyler', () => {
    const m = gonderimHataMetni({ ok: false, reason: 'kapsam-yok' });
    expect(m).toMatch(/bölüme bağlanamadı/i);
    expect(m).toMatch(/bölümünü girin|bölümü seçip/i);
  });

  it('kural yoksa söylenir', () => {
    expect(gonderimHataMetni({ ok: false, reason: 'kural-yok' })).toMatch(/kural/i);
  });

  it('eksik parametre', () => {
    expect(gonderimHataMetni({ ok: false, reason: 'eksik-parametre' })).toMatch(/eksik/i);
  });

  it('bilinmeyen sebep de metne döner', () => {
    expect(gonderimHataMetni({ ok: false, reason: 'x-y-z' })).toBe('Belge gönderilemedi (x-y-z).');
  });

  it('sebepsiz başarısızlık', () => {
    expect(gonderimHataMetni({ ok: false })).toBe('Belge gönderilemedi.');
  });

  it('başarılı sonuçta metin yok', () => {
    expect(gonderimHataMetni({ ok: true })).toBe('');
    expect(gonderimHataMetni(null)).toBe('');
  });
});
