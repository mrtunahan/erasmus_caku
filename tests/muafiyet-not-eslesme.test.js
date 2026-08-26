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

describe('dersNotunuCevir — puan önceliklidir', () => {
  it('yüzlük puan doğrudan ÇAKÜ ölçeğinden çevrilir (karşı tabloya gerek yok)', () => {
    const r = dersNotunuCevir({ gradePuan: '78', gradeHarf: 'BB' }, [], CAKU);
    expect(r.harf).toBe('B3');
    expect(r.kaynak).toBe('puan');
  });

  it('puan aralık dışındaysa ve harf varsa harf yolu denenir', () => {
    const r = dersNotunuCevir({ gradePuan: '55', gradeHarf: 'BB' }, KARSI, CAKU);
    // 55 hiçbir aralığa girmiyor (49–60 arası boşluk) → harften çevrildi
    expect(r.harf).toBe('B3');
    expect(r.kaynak).toBe('harf');
  });

  it('puan yoksa harf katsayı üzerinden çevrilir', () => {
    const r = dersNotunuCevir({ gradeHarf: 'BB' }, KARSI, CAKU);
    expect(r.harf).toBe('B3');
    expect(r.kaynak).toBe('harf');
    expect(r.karsiKatsayi).toBe(3);
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
    const r = dersNotunuCevir(
      { gradeHarf: 'BA' },
      KARSI.concat([{ harf: 'BA', katsayi: '3.50' }]),
      CAKU
    );
    expect(r.harf).toBe('B1'); // 3.50 birebir var
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

  it('kayıt yoksa boş liste', () => {
    expect(notEslemeTaslagi(null, KARSI, CAKU)).toEqual([]);
  });
});
