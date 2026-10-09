import { describe, it, expect } from 'vitest';
import {
  subeCoz,
  ayirtEdiciEtiketler,
  birlikteAlinabilecekler,
  yalinDersAdi,
} from '../lib/ders-ayirt.js';
import { parcaliDersler } from '../lib/ders-parcasi.js';

// İki müfredat × iki şube: dört kayıt.
const D = [
  { id: 'a1', code: 'FZK181', name: 'Fizik I (Şube 1)', mufredat: '2019' },
  { id: 'a2', code: 'FZK181', name: 'Fizik I (Şube 2)', mufredat: '2019' },
  { id: 'b1', code: 'FZK101', name: 'Fizik I', sube: '1', mufredat: '2024' },
  { id: 'b2', code: 'FZK101', name: 'Fizik I', sube: '2', mufredat: '2024' },
  { id: 'c', code: 'MAT101', name: 'Matematik I' },
];

describe('aynı dersin şube ve müfredatları', () => {
  it('şube alandan ya da addan çözülür; yalın ad şubesizdir', () => {
    expect(subeCoz(D[1])).toBe('2');
    expect(subeCoz(D[2])).toBe('1');
    expect(subeCoz({ name: 'Fizik I Şb:3' })).toBe('3');
    expect(subeCoz(D[4])).toBe('');
    expect(yalinDersAdi(D[0])).toBe('fizik ı');
    expect(yalinDersAdi(D[2])).toBe('fizik ı');
  });

  it('aynı kodlu kayıtlar ayırt edici etiket alır, tek kayıtlı kod değişmez', () => {
    const e = ayirtEdiciEtiketler(D);
    expect(e.get('a1')).toBe('FZK181 (Şb 1)');
    expect(e.get('a2')).toBe('FZK181 (Şb 2)');
    expect(e.get('c')).toBe('MAT101');
    const ayniHer = ayirtEdiciEtiketler([
      { id: 'x', code: 'K1', name: 'A' },
      { id: 'y', code: 'K1', name: 'A' },
    ]);
    expect(ayniHer.get('x')).not.toBe(ayniHer.get('y'));
  });

  it('yoklama düğmeleri ayırt edici etiketle gelir', () => {
    const l = parcaliDersler([D[0], D[1]]);
    expect(l.map((x) => x.etiket)).toEqual(['FZK181 (Şb 1)', 'FZK181 (Şb 2)']);
  });

  it('birlikte yoklama adayı: aynı kod ya da aynı yalın ad (öteki müfredat)', () => {
    expect(birlikteAlinabilecekler(D[0], D).map((d) => d.id)).toEqual(['a2', 'b1', 'b2']);
    expect(birlikteAlinabilecekler(D[4], D)).toEqual([]);
  });
});
