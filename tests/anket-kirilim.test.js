import { describe, it, expect } from 'vitest';
import { anketKirilimlari, dersKataloguHaritasi, grupla } from '../lib/anket-kirilim.js';

const survey = {
  infoFields: [
    { key: 'dersAdi', label: 'Dersin Adı', source: 'course' },
    { key: 'dersKodu', label: 'Dersin Kodu', source: 'courseCode' },
    { key: 'sinif', label: 'Sınıf' },
    { key: 'adSoyad', label: 'Ad' },
  ],
  questions: [{ id: 'q1', type: 'likert', text: 'Memnun musunuz?' }],
};
const r = (kod, puan, sinif, bolum) => ({
  answers: { dersKodu: kod, dersAdi: kod === 'BLM101' ? 'Programlama' : '', q1: puan, sinif },
  yanitlayanBolumleri: [bolum],
});
const yanitlar = [
  r('BLM101', 5, '1', 'bil'),
  r('blm 101', 3, '1', 'bil'),
  r('MAT101', 1, '2', 'mak'),
];
const katalog = dersKataloguHaritasi([
  { code: 'BLM101', name: 'Programlama', professor: 'Dr. Ali, Dr. Can' },
  { code: 'MAT101', name: 'Matematik', professors: ['Dr. Can'] },
]);

describe('anket kırılımları', () => {
  const k = anketKirilimlari(survey, yanitlar, {
    dersKatalogu: katalog,
    bolumAdi: (id) => ({ bil: 'Bilgisayar', mak: 'Makine' })[id],
  });
  const bul = (id) => k.find((x) => x.id === id);
  it('ders kırılımı kodu normalleştirir, adı ve hocayı ekler', () => {
    const d = bul('ders').satirlar;
    expect(d.map((x) => [x.etiket, x.n])).toEqual([
      ['BLM101 — Programlama', 2],
      ['MAT101 — Matematik', 1],
    ]);
    expect(d[0].hocalar).toBe('Dr. Ali, Dr. Can');
    expect(d[0].ortalama).toBeGreaterThan(d[1].ortalama);
  });
  it('hoca kırılımı katalogdan; çok hocalı derste yanıt her hocada sayılır', () => {
    const h = bul('hoca').satirlar;
    expect(h.map((x) => [x.etiket, x.n, x.dersler])).toEqual([
      ['Dr. Can', 3, 'BLM101, MAT101'],
      ['Dr. Ali', 2, 'BLM101'],
    ]);
  });
  it('yanıtlayan bölüm adla; bilgi alanı yalnız az değerliyse kırılım olur', () => {
    expect(bul('bolum').satirlar.map((x) => x.etiket)).toEqual(['Bilgisayar', 'Makine']);
    expect(bul('bilgi:sinif').satirlar.map((x) => [x.etiket, x.n])).toEqual([
      ['1', 2],
      ['2', 1],
    ]);
    expect(bul('bilgi:adSoyad')).toBeUndefined();
  });
  it('katalog yoksa hoca kırılımı çıkmaz; boş grup dışarıda kalır', () => {
    expect(anketKirilimlari(survey, yanitlar).some((x) => x.id === 'hoca')).toBe(false);
    expect(grupla(survey, [{ answers: {} }], () => '')).toEqual([]);
  });
});
