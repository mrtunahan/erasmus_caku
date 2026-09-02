import { describe, it, expect } from 'vitest';
import {
  ogrenciNotAnahtari,
  ogrenciNotu,
  karsiBasariNotu,
  cakuBasariNotu,
  belgeNotlari,
  notsuzSatirlar,
} from '../lib/muafiyet-belge-notu.js';

function satir(ek) {
  return Object.assign(
    {
      sourceCourse: { code: 'BM437', name: 'Yapay Zeka', akts: '5' },
      localCourse: { code: 'BİL481', name: 'Yapay Zeka', akts: '4' },
    },
    ek
  );
}

describe('karsiBasariNotu', () => {
  it('talepte saklanan not önce gelir', () => {
    const m = satir({ sourceCourse: { code: 'X', grade: 'AA' } });
    expect(karsiBasariNotu(m, { kaynakNot: '80', kaynakHarf: 'BB' })).toBe('AA');
  });

  it('yüzlük puan ikinci sırada', () => {
    expect(karsiBasariNotu(satir(), { kaynakNot: '80', kaynakHarf: 'BB' })).toBe('80');
  });

  it('YALNIZ HARF okunduğunda da yazılır', () => {
    // Asıl hata buydu: belge yalnız harf taşıdığında sütun boş çıkıyordu.
    expect(karsiBasariNotu(satir(), { kaynakNot: '', kaynakHarf: 'BA' })).toBe('BA');
  });

  it('hiçbiri yoksa boş', () => {
    expect(karsiBasariNotu(satir(), {})).toBe('');
    expect(karsiBasariNotu(satir(), null)).toBe('');
  });

  it('boşluklar kırpılır', () => {
    expect(karsiBasariNotu(satir(), { kaynakHarf: '  CB  ' })).toBe('CB');
  });

  it('eski kayıt biçimi (source) da okunur', () => {
    const m = { source: { code: 'X', grade: 'DC' } };
    expect(karsiBasariNotu(m, {})).toBe('DC');
  });
});

describe('cakuBasariNotu', () => {
  it('akademisyenin dönüşümü önce gelir', () => {
    const m = satir({ convertedGrade: 'BA', localCourse: { grade: 'BB' } });
    expect(cakuBasariNotu(m, { cakuNot: 'CC' })).toBe('BA');
  });

  it('derse yazılmış not ikinci sırada', () => {
    const m = satir({ localCourse: { code: 'X', grade: 'BB' } });
    expect(cakuBasariNotu(m, { cakuNot: 'CC' })).toBe('BB');
  });

  it('öğrencinin belgesinden hesaplanan karşılık son sırada', () => {
    expect(cakuBasariNotu(satir(), { cakuNot: 'CC' })).toBe('CC');
  });

  it('hiçbiri yoksa boş', () => {
    expect(cakuBasariNotu(satir(), {})).toBe('');
  });
});

describe('ogrenciNotAnahtari', () => {
  it('id varsa id kullanılır', () => {
    const m = satir({ id: 'm7' });
    expect(ogrenciNotAnahtari([m], m)).toBe('m7');
  });

  it('id yoksa notlanabilir listedeki sıra', () => {
    const a = satir({ sourceCourse: { code: 'A' } });
    const bb = satir({ sourceCourse: { code: 'B' } });
    expect(ogrenciNotAnahtari([a, bb], bb)).toBe('1');
  });

  it('REDDEDİLEN satır sırayı kaydırmaz', () => {
    // Panel reddedilenleri listelemiyor; belge de aynı listeyi kurmalı.
    const red = satir({ sourceCourse: { code: 'A' }, adminDecision: 'rejected' });
    const b = satir({ sourceCourse: { code: 'B' } });
    const c = satir({ sourceCourse: { code: 'C' }, adminDecision: 'confirmed' });
    expect(ogrenciNotAnahtari([red, b, c], b)).toBe('0');
    expect(ogrenciNotAnahtari([red, b, c], c)).toBe('1');
  });

  it('kopyalanmış nesne ders koduyla bulunur', () => {
    const a = satir({ sourceCourse: { code: 'A' } });
    const b = satir({ sourceCourse: { code: 'B' } });
    const bKopya = JSON.parse(JSON.stringify(b));
    expect(ogrenciNotAnahtari([a, b], bKopya)).toBe('1');
  });

  it('listede olmayan satır boş anahtar', () => {
    expect(
      ogrenciNotAnahtari(
        [satir({ sourceCourse: { code: 'A' } })],
        satir({ sourceCourse: { code: 'Z' } })
      )
    ).toBe('');
  });

  it('boş girdi çökmez', () => {
    expect(ogrenciNotAnahtari(null, null)).toBe('');
  });
});

describe('ogrenciNotu', () => {
  it('anahtara karşılık gelen girdiyi getirir', () => {
    const a = satir({ sourceCourse: { code: 'A' } });
    const b = satir({ sourceCourse: { code: 'B' } });
    const kayit = {
      matches: [a, b],
      ogrenciNotlari: { 0: { kaynakHarf: 'AA' }, 1: { kaynakHarf: 'BB' } },
    };
    expect(ogrenciNotu(kayit, b).kaynakHarf).toBe('BB');
  });

  it('kayıt yoksa boş nesne', () => {
    expect(ogrenciNotu(null, satir())).toEqual({});
  });
});

describe('belgeNotlari', () => {
  it('yaz intibakında harf notu iki sütuna da ulaşır', () => {
    const m = satir();
    const kayit = {
      basvuruTuru: 'intibak',
      matches: [m],
      ogrenciNotlari: { 0: { kaynakNot: '', kaynakHarf: 'BA', cakuNot: 'BA' } },
    };
    expect(belgeNotlari(kayit, m)).toEqual({ karsi: 'BA', caku: 'BA' });
  });

  it('reddedilen satırdan sonraki dersin notu kaymaz', () => {
    const red = satir({ sourceCourse: { code: 'A' }, adminDecision: 'rejected' });
    const dogru = satir({ sourceCourse: { code: 'B' }, adminDecision: 'confirmed' });
    const kayit = {
      matches: [red, dogru],
      // Panel reddedileni listelemediği için 'B' sıfırıncı sırada yazılmıştı.
      ogrenciNotlari: { 0: { kaynakHarf: 'CB' } },
    };
    expect(belgeNotlari(kayit, dogru).karsi).toBe('CB');
  });

  it('notu olmayan satırda iki sütun da boş', () => {
    const m = satir();
    expect(belgeNotlari({ matches: [m] }, m)).toEqual({ karsi: '', caku: '' });
  });
});

describe('notsuzSatirlar', () => {
  it('notu olmayan satırları listeler', () => {
    const a = satir({ sourceCourse: { code: 'A' } });
    const b = satir({ sourceCourse: { code: 'B' } });
    const kayit = { matches: [a, b], ogrenciNotlari: { 0: { kaynakHarf: 'AA' } } };
    expect(notsuzSatirlar(kayit)).toEqual([b]);
  });

  it('reddedilen satır sayılmaz', () => {
    const red = satir({ adminDecision: 'rejected' });
    expect(notsuzSatirlar({ matches: [red] })).toEqual([]);
  });

  it('hepsi notluysa boş liste', () => {
    const a = satir({ sourceCourse: { code: 'A', grade: 'AA' } });
    expect(notsuzSatirlar({ matches: [a] })).toEqual([]);
  });

  it('boş kayıt çökmez', () => {
    expect(notsuzSatirlar(null)).toEqual([]);
  });
});
