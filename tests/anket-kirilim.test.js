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
    anonimEsik: 1,
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

describe('anonimlik eşiği', () => {
  const r = (bolum, cins, puan) => ({
    yanitlayanBolumleri: [bolum],
    answers: { cins, q1: puan },
  });
  const s = {
    questions: [{ id: 'q1', type: 'likert5' }],
    infoFields: [{ key: 'cins', label: 'Cinsiyet' }],
  };
  it('iki yanıtlı ankette bölüm ve cinsiyet kırılımı hiç çıkmaz', () => {
    const k = anketKirilimlari(s, [r('bil', 'Kadın', 3), r('ins', 'Erkek', 5)]);
    expect(k.find((x) => x.id === 'bolum')).toBeUndefined();
    expect(k.find((x) => x.id === 'bilgi:cins')).toBeUndefined();
  });
  it('küçük gruplar eşiği aşan tek "Diğer" satırında birleşir', () => {
    const l = [1, 2, 3, 4]
      .map(() => r('bil', 'Kadın', 4))
      .concat([r('ins', 'Erkek', 2), r('mak', 'Erkek', 2), r('kim', 'Erkek', 2)]);
    const b = anketKirilimlari(s, l).find((x) => x.id === 'bolum');
    expect(b.satirlar.map((x) => [x.etiket, x.n])).toEqual([
      ['bil', 4],
      ['Diğer (az yanıtlı 3 grup)', 3],
    ]);
    expect(b.aciklama).toMatch(/kimlik açmasın/);
  });
});

describe('ÇAP / yandal öğrencisi', () => {
  it('paylaşılan bölüm ikinci bölümüyse o bölümde ÇAP olarak sayılır', () => {
    const s = { questions: [{ id: 'q1', type: 'likert5' }] };
    const y = (l) => ({ yanitlayanBolumleri: l, answers: { q1: 4 } });
    const k = anketKirilimlari(
      s,
      [y(['insaat', 'elektrik']), y(['bilgisayar', 'elektrik']), y(['elektrik'])],
      {
        hedefBolumler: ['elektrik'],
        bolumAdi: (id) => ({ elektrik: 'Elektrik' })[id],
        anonimEsik: 1,
      }
    );
    expect(k.find((x) => x.id === 'bolum').satirlar.map((x) => [x.etiket, x.n])).toEqual([
      ['Elektrik (ÇAP/yandal öğrencisi)', 2],
      ['Elektrik', 1],
    ]);
  });
});
