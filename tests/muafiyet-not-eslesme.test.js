import { describe, it, expect } from 'vitest';
import {
  dersNotunuCevir,
  eksikEslesmeSayisi,
  notEslemeTaslagi,
} from '../lib/muafiyet-not-eslesme.js';

// ÇAKÜ ölçeği (gerçek tablo): A 4.00 · B1 3.50 · B3 3.00 · C3 2.00 · F2 0.00
const CAKU = {
  notOlcegi: [
    { harf: 'A', katsayi: '4.00', min: '90', max: '100' },
    { harf: 'B1', katsayi: '3.50', min: '85', max: '89' },
    { harf: 'B3', katsayi: '3.00', min: '75', max: '84' },
    { harf: 'C3', katsayi: '2.00', min: '60', max: '74' },
    { harf: 'F2', katsayi: '0.00', min: '0', max: '49' },
  ],
};
// Karşı kurum: YÖK standardı
const KARSI = [
  { harf: 'AA', katsayi: '4.00' },
  { harf: 'BB', katsayi: '3.00' },
  { harf: 'CC', katsayi: '2.00' },
  { harf: 'FF', katsayi: '0.00' },
];

describe('dersNotunuCevir — zincir: harf → katsayı → harf', () => {
  it('harf, KARŞI KURUMUN katsayısı üzerinden çevrilir', () => {
    // Uludağ'da BB = 3.00; ÇAKÜ'de 3.00 = B3.
    const r = dersNotunuCevir({ gradeHarf: 'BB' }, KARSI, CAKU, 'Bursa Uludağ Üniversitesi');
    expect(r.harf).toBe('B3');
    expect(r.kaynak).toBe('harf');
    expect(r.karsiKatsayi).toBe(3);
    expect(r.sebep).toContain('Bursa Uludağ Üniversitesi ölçeğinde "BB" = katsayı 3');
  });

  it('HARF VARKEN yüzlük puana BAKILMAZ', () => {
    // Transkriptten okunan "puan" güvenilir değil: kredi/AKTS sütunu puan
    // sanılabiliyor ve o sayı ÇAKÜ'nün 0-49 aralığına düşüp her dersi F
    // yapıyordu. Harf varsa karar harfindir.
    const r = dersNotunuCevir({ gradeHarf: 'BB', gradePuan: '6' }, KARSI, CAKU);
    expect(r.harf).toBe('B3');
    expect(r.kaynak).toBe('harf');
  });

  it('gerçek yüzlük puan da harfi ezmez', () => {
    // 78 tek başına ÇAKÜ'de B3'e denk gelir; sonuç aynı olsa da yol harftir.
    const r = dersNotunuCevir({ gradeHarf: 'AA', gradePuan: '78' }, KARSI, CAKU);
    expect(r.harf).toBe('A');
    expect(r.kaynak).toBe('harf');
  });

  it('belgede harf yoksa yüzlük puan kullanılır', () => {
    const r = dersNotunuCevir({ gradePuan: '92' }, KARSI, CAKU);
    expect(r.harf).toBe('A');
    expect(r.kaynak).toBe('puan');
    expect(r.sebep).toMatch(/harf notu yok/);
  });

  it('harf çevrilemezse puan SON ÇARE olarak denenir ve uyarı verilir', () => {
    // Karşı kurumun tablosunda olmayan bir harf
    const r = dersNotunuCevir({ gradeHarf: 'XX', gradePuan: '92' }, KARSI, CAKU);
    expect(r.harf).toBe('A');
    expect(r.kaynak).toBe('puan');
    expect(r.sebep).toMatch(/kontrol edin/);
  });

  it('karşı kurumun tablosu yoksa çeviri YAPILMAZ ve sebep söylenir', () => {
    const r = dersNotunuCevir({ gradeHarf: 'BB' }, [], CAKU);
    expect(r.harf).toBe('');
    expect(r.sebep).toMatch(/ölçeği sisteme yüklenmemiş/);
  });

  it('hiç not yoksa uydurulmaz', () => {
    const r = dersNotunuCevir({}, KARSI, CAKU);
    expect(r.harf).toBe('');
    expect(r.sebep).toMatch(/okunmamış/);
  });

  it('eski kayıtta yalnız `grade` varsa: sayı ise puan, değilse harf sayılır', () => {
    expect(dersNotunuCevir({ grade: '92' }, [], CAKU).harf).toBe('A');
    expect(dersNotunuCevir({ grade: 'AA' }, KARSI, CAKU).harf).toBe('A');
  });

  it('katsayı ÇAKÜ ölçeğinde birebir yoksa AŞAĞIYA inilir, sebep yazılır', () => {
    const r2 = dersNotunuCevir(
      { gradeHarf: 'DC' },
      KARSI.concat([{ harf: 'DC', katsayi: '1.50' }]),
      CAKU
    );
    // 1.50 ÇAKÜ'de yok → aşağıdaki en yakın 0.00 (F2); asla YUKARI çıkılmaz
    expect(r2.harf).toBe('F2');
    expect(r2.sebep).toMatch(/en yakın/);
  });
});

describe('notEslemeTaslagi', () => {
  const m = (id, kod, src, cakKod) => ({
    id,
    adminDecision: 'confirmed',
    sourceCourse: { code: kod, name: kod + ' Dersi', ...src },
    localCourse: { code: cakKod, name: 'ÇAKÜ ' + cakKod },
  });

  it('onaylanan dersler için satır üretir', () => {
    const t = notEslemeTaslagi(
      [
        m(0, 'BIL201', { gradeHarf: 'BB' }, 'BLM203'),
        m(1, 'MAT112', { gradePuan: '92' }, 'MAT166'),
      ],
      KARSI,
      CAKU
    );
    expect(t.map((r) => r.cakuNot)).toEqual(['B3', 'A']);
    expect(t[0].karsiNot).toBe('BB');
    expect(t[0].kaynak).toBe('harf');
    // İkinci derste harf yok, yalnız puan var → puan yolu
    expect(t[1].kaynak).toBe('puan');
  });

  it('hiç onay yoksa TÜM talepler alınır — belgeye yazılan kümeyle aynı kural', () => {
    const t = notEslemeTaslagi(
      [{ id: 0, sourceCourse: { code: 'X', gradeHarf: 'AA' }, localCourse: { code: 'Y' } }],
      KARSI,
      CAKU
    );
    expect(t.length).toBe(1);
    expect(t[0].cakuNot).toBe('A');
  });

  it('akademisyenin kaydettiği karşılık KORUNUR, öneri onu ezmez', () => {
    const kayit = m(0, 'BIL201', { gradeHarf: 'BB' }, 'BLM203');
    kayit.convertedGrade = 'B1';
    const t = notEslemeTaslagi([kayit], KARSI, CAKU);
    expect(t[0].cakuNot).toBe('B1');
    expect(t[0].onerilen).toBe('B3');
    expect(t[0].elleGirilmis).toBe(true);
  });

  it('çevrilemeyen ders boş kalır ve sayılır', () => {
    const t = notEslemeTaslagi([m(0, 'BIL201', {}, 'BLM203')], KARSI, CAKU);
    expect(t[0].cakuNot).toBe('');
    expect(eksikEslesmeSayisi(t)).toBe(1);
    expect(eksikEslesmeSayisi([])).toBe(0);
  });

  it('ANAHTAR tam dizideki konumdur — kısmi onayda numara kaymaz', () => {
    // Muafiyet eşleştirmelerinin id'si yok; kimlik dizideki sıradır.
    // 0. ders onaysız, 1. ve 2. onaylı: onaylıların anahtarı 1 ve 2 olmalı,
    // 0 ve 1 DEĞİL — yoksa onaylanan karşılık yanlış derse yazılır.
    const ders = (kod, harf, onay) => ({
      ...(onay ? { adminDecision: 'confirmed' } : {}),
      sourceCourse: { code: kod, gradeHarf: harf },
      localCourse: { code: 'C' + kod },
    });
    const t = notEslemeTaslagi(
      [ders('X0', 'AA', false), ders('X1', 'BB', true), ders('X2', 'CC', true)],
      KARSI,
      CAKU
    );
    expect(t.map((r) => r.anahtar)).toEqual(['1', '2']);
    expect(t.map((r) => r.karsiKod)).toEqual(['X1', 'X2']);
  });

  it('hiç onay yoksa anahtarlar 0dan başlar', () => {
    const ders = (kod) => ({ sourceCourse: { code: kod, gradeHarf: 'AA' }, localCourse: {} });
    const t = notEslemeTaslagi([ders('A'), ders('B')], KARSI, CAKU);
    expect(t.map((r) => r.anahtar)).toEqual(['0', '1']);
  });

  it('id varsa anahtar id olur', () => {
    const t = notEslemeTaslagi(
      [{ id: 'm7', sourceCourse: { code: 'A', gradeHarf: 'AA' }, localCourse: {} }],
      KARSI,
      CAKU
    );
    expect(t[0].anahtar).toBe('m7');
  });

  it('kayıt yoksa boş liste', () => {
    expect(notEslemeTaslagi(null, KARSI, CAKU)).toEqual([]);
  });
});
