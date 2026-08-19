// Aynı bölümün birden çok kimliği — şablon çözümünü bozan kök neden.
//
// Bölüm DB'de `id`/`_id`/`_docId`/`code` ile anılabiliyor; istemcideki gömülü
// çekirdek listede ise slug ('bilgisayar'). Ham eşitlik denetimleri aynı
// bölümü farklı bölüm sanıyordu.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  bolumKimlikHaritasi,
  bolumVaryantlari,
  ayniBolum,
  kimlikler,
} = require('../server/lib/bolum-kimlik.js');

const DOKUMANLAR = [
  { id: '64aa01', _docId: 'bilgisayar', code: 'BLM', facultyId: 'F-MUH', name: 'Bilgisayar Müh.' },
  { _id: { toString: () => '64aa02' }, _docId: 'makine', facultyId: 'F-MUH', name: 'Makine Müh.' },
  { id: 'orman', facultyId: 'F-ORMAN', name: 'Orman Müh.' },
];

describe('kimlikler', () => {
  it('dokümanın tüm kimlik biçimlerini tekilleştirerek verir', () => {
    expect(kimlikler(DOKUMANLAR[0])).toEqual(['64aa01', 'bilgisayar', 'BLM']);
    expect(kimlikler(DOKUMANLAR[1])).toEqual(['makine', '64aa02']);
    expect(kimlikler(null)).toEqual([]);
  });
});

describe('bolumKimlikHaritasi', () => {
  const h = bolumKimlikHaritasi(DOKUMANLAR);

  it('HER kimlik biçimi için fakülte anahtarı taşır', () => {
    // Eski harita bölüm başına TEK anahtar yazıyordu; gelen kimlik o değilse
    // facultyId boş çıkıyor ve fakülte şablonu adımı tamamen atlanıyordu.
    expect(h.fakulte['64aa01']).toBe('F-MUH');
    expect(h.fakulte['bilgisayar']).toBe('F-MUH');
    expect(h.fakulte['BLM']).toBe('F-MUH');
    expect(h.fakulte['orman']).toBe('F-ORMAN');
  });

  it('_id yalnızca toString ile geldiğinde de okunur', () => {
    expect(h.fakulte['64aa02']).toBe('F-MUH');
    expect(h.fakulte['makine']).toBe('F-MUH');
  });

  it('tüm kimlikler aynı kanonik değere bağlanır', () => {
    expect(h.kanonik['bilgisayar']).toBe(h.kanonik['64aa01']);
    expect(h.kanonik['BLM']).toBe(h.kanonik['64aa01']);
  });

  it('boş girdide çökmez', () => {
    expect(bolumKimlikHaritasi(null)).toEqual({ fakulte: {}, kanonik: {}, varyantlar: {} });
  });
});

describe('bolumVaryantlari', () => {
  const h = bolumKimlikHaritasi(DOKUMANLAR);

  it('bir kimlikten TÜM eşdeğerleri verir — şablon sorgusu bunları arar', () => {
    expect(bolumVaryantlari(h, 'bilgisayar').sort()).toEqual(
      ['64aa01', 'BLM', 'bilgisayar'].sort()
    );
  });

  it('bilinmeyen kimlik KENDİSİYLE döner — sorgu boşa düşmesin', () => {
    expect(bolumVaryantlari(h, 'tanimsiz')).toEqual(['tanimsiz']);
  });

  it('boş kimlikte boş liste', () => {
    expect(bolumVaryantlari(h, '')).toEqual([]);
  });
});

describe('ayniBolum', () => {
  const h = bolumKimlikHaritasi(DOKUMANLAR);

  it('farklı kimlik biçimleri aynı bölümü gösterir', () => {
    expect(ayniBolum('bilgisayar', '64aa01', h)).toBe(true);
    expect(ayniBolum('BLM', 'bilgisayar', h)).toBe(true);
  });

  it('farklı bölümleri ayırır', () => {
    expect(ayniBolum('bilgisayar', 'makine', h)).toBe(false);
    expect(ayniBolum('bilgisayar', 'orman', h)).toBe(false);
  });

  it('harita verilmezse HAM EŞİTLİK — eski çağrılar bozulmaz', () => {
    expect(ayniBolum('bilgisayar', 'bilgisayar')).toBe(true);
    expect(ayniBolum('bilgisayar', '64aa01')).toBe(false);
  });

  it('boş kimlik hiçbir şeye eşit değildir', () => {
    expect(ayniBolum('', '', h)).toBe(false);
    expect(ayniBolum('bilgisayar', '', h)).toBe(false);
  });
});
