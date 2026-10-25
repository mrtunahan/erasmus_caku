import { describe, it, expect } from 'vitest';
import {
  katilimciRolu,
  yoneticiKatilimciMi,
  katilimciKimligi,
  yanitBenimMi,
} from '../lib/anket-katilimci.js';

describe('katılımcı rolü', () => {
  it('akademisyen kökenli yetkili ve memur akademisyen sayılır', () => {
    expect(katilimciRolu({ role: 'admin', baseRole: 'professor' })).toBe('professor');
    expect(katilimciRolu({ role: 'bolum_yetkilisi', baseRole: 'professor' })).toBe('professor');
    expect(katilimciRolu({ role: 'memur', baseRole: 'professor' })).toBe('professor');
    expect(katilimciRolu({ role: 'student' })).toBe('student');
    // Sistem yöneticisi ve bölüm yetkilisi girişi akademisyen değildir.
    expect(katilimciRolu({ role: 'admin' })).toBe('admin');
    expect(katilimciRolu({ role: 'bolum_yetkilisi' })).toBe('bolum_yetkilisi');
  });

  it('"Bana gelen anketler" sekmesi yalnız akademisyen kökenli yetkilide', () => {
    expect(yoneticiKatilimciMi({ role: 'admin', baseRole: 'professor' })).toBe(true);
    expect(yoneticiKatilimciMi({ role: 'professor', baseRole: 'professor' })).toBe(false);
    expect(yoneticiKatilimciMi({ role: 'admin' })).toBe(false);
  });
});

describe('bu yanıt benim mi', () => {
  const ayse = { role: 'student', name: 'Ayşe Yılmaz', studentNumber: '2021001' };
  it('aynı adlı başka öğrencinin yanıtı benim sayılmaz', () => {
    expect(yanitBenimMi({ userId: 'Ayşe Yılmaz', studentNumber: '2021009' }, ayse)).toBe(false);
    expect(yanitBenimMi({ userId: 'Ayşe Yılmaz', studentNumber: '2021001' }, ayse)).toBe(true);
  });
  it('numarasız eski yanıt adla eşleşir; ÇAP bağlı numarası da benimdir', () => {
    expect(yanitBenimMi({ userId: 'Ayşe Yılmaz' }, ayse)).toBe(true);
    expect(
      yanitBenimMi({ studentNumber: '2023005' }, { ...ayse, bagliOgrenciNolar: ['2023005'] })
    ).toBe(true);
  });
  it('akademisyende profil id ya da sunucu damgası', () => {
    const hoca = { role: 'admin', baseRole: 'professor', id: 'p7', name: 'DR. ALİ' };
    expect(katilimciKimligi(hoca)).toBe('p7');
    expect(yanitBenimMi({ userId: 'p7' }, hoca)).toBe(true);
    expect(yanitBenimMi({ userId: 'x', yanitlayanKimlik: 'DR. ALİ' }, hoca)).toBe(true);
    expect(yanitBenimMi({ userId: 'x', yanitlayanKimlik: 'DR. VELİ' }, hoca)).toBe(false);
  });
});
