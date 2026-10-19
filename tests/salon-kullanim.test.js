import { describe, it, expect } from 'vitest';
import {
  salonKullanimi,
  sinavSalonuMu,
  dersSalonuMu,
  salonKullanimEtiketi,
} from '../lib/salon-kullanim.js';

describe('salon kullanımı', () => {
  it('alanı olmayan eski kayıt hem sınavda hem derste kullanılır', () => {
    expect(salonKullanimi({ name: 'M1' })).toBe('her_ikisi');
    expect(sinavSalonuMu({ name: 'M1' })).toBe(true);
    expect(dersSalonuMu({ name: 'M1' })).toBe(true);
    expect(salonKullanimi({ kullanim: 'saçma' })).toBe('her_ikisi');
  });

  it('yalnız sınav / yalnız ders ayrımı', () => {
    expect(sinavSalonuMu({ kullanim: 'sinav' })).toBe(true);
    expect(dersSalonuMu({ kullanim: 'sinav' })).toBe(false);
    expect(sinavSalonuMu({ kullanim: 'ders' })).toBe(false);
    expect(dersSalonuMu({ kullanim: 'ders' })).toBe(true);
    expect(salonKullanimEtiketi({ kullanim: 'ders' })).toBe('Yalnız ders programı');
  });
});
