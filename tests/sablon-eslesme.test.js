import { describe, it, expect } from 'vitest';
import { eslesmeHaritasi, tokenCoz, ilkGecisIndeksi } from '../lib/sablon-eslesme.js';

// Gerçek şablondan: aynı yer tutucu hem rapor başlığında hem veri sütununda
// geçiyor ve iki yerde FARKLI değer isteniyor.
const ALANLAR = [
  { token: '{{başvurduğu_bölüm}}', tokenOccurrence: 1, variable: 'static:basvurulanBolumKisa' },
  { token: '{{başvurduğu_bölüm}}', tokenOccurrence: 2, variable: 'row:basvurduguBolum' },
  { token: '{{başvurduğu_SINIF}}', tokenOccurrence: 1, variable: 'row:basvurduguSinif' },
  { token: '{{eğitim_yılı}}', tokenOccurrence: 1, variable: 'static:egitimYili' },
];

describe('eslesmeHaritasi', () => {
  it('her geçişi ayrı tutar', () => {
    const h = eslesmeHaritasi(ALANLAR);
    expect(h.tam['{{başvurduğu_bölüm}}#1']).toMatchObject({ tip: 'static' });
    expect(h.tam['{{başvurduğu_bölüm}}#2']).toMatchObject({ tip: 'row' });
    expect(h.tokenlar['{{başvurduğu_bölüm}}']).toHaveLength(2);
  });

  it('özet haritada satır değişkeni kazanır', () => {
    // Veri satırı seçimi "kaç FARKLI satır değişkeni var" diye sorar; başlıkta
    // static'e eşlenmiş bir geçiş yüzünden token static sayılsaydı asıl veri
    // satırı bulunamaz ve belge boş çıkardı.
    const h = eslesmeHaritasi(ALANLAR);
    expect(h.ozet['{{başvurduğu_bölüm}}']).toEqual({ tip: 'row', id: 'basvurduguBolum' });
  });

  it('değişkeni olmayan / bozuk kayıtları atar', () => {
    const h = eslesmeHaritasi([{ token: '{{x}}', variable: '' }, null, { variable: 'row:a' }]);
    expect(Object.keys(h.tam)).toHaveLength(0);
  });

  it('geçiş numarası yoksa 1 kabul edilir', () => {
    const h = eslesmeHaritasi([{ token: '{{x}}', variable: 'static:a' }]);
    expect(h.tam['{{x}}#1']).toMatchObject({ id: 'a' });
  });
});

describe('tokenCoz', () => {
  const h = eslesmeHaritasi(ALANLAR);

  it('BAŞLIKTAKİ geçiş kısa adı, SÜTUNDAKİ geçiş tam adı alır', () => {
    // Bozukluk buydu: eşleme yalnız token metnine göre indekslendiği için
    // sütunda da başlığın kısa adı ("Bilgisayar") yazılıyordu.
    expect(tokenCoz(h, '{{başvurduğu_bölüm}}', 1, false)).toEqual({
      tip: 'static',
      id: 'basvurulanBolumKisa',
    });
    expect(tokenCoz(h, '{{başvurduğu_bölüm}}', 2, true)).toEqual({
      tip: 'row',
      id: 'basvurduguBolum',
    });
  });

  it('eşlenmemiş geçişte KONUM karar verir', () => {
    // #3 hiç eşlenmemiş: veri satırındaysa satır değişkeni, dışındaysa künye.
    expect(tokenCoz(h, '{{başvurduğu_bölüm}}', 3, true).tip).toBe('row');
    expect(tokenCoz(h, '{{başvurduğu_bölüm}}', 3, false).tip).toBe('static');
  });

  it('tek eşlemesi olan token her geçişte aynı değeri taşır', () => {
    expect(tokenCoz(h, '{{eğitim_yılı}}', 1, false).id).toBe('egitimYili');
    expect(tokenCoz(h, '{{eğitim_yılı}}', 7, true).id).toBe('egitimYili');
  });

  it('hiç eşlemesi olmayan token null döner — yer tutucu olduğu gibi kalır', () => {
    expect(tokenCoz(h, '{{yok}}', 1, true)).toBe(null);
  });

  it('boş harita çökmez', () => {
    expect(tokenCoz(null, '{{x}}', 1, false)).toBe(null);
  });
});

describe('ilkGecisIndeksi', () => {
  it('geçiş numaralarını arayüzdeki sırayla üretir', () => {
    // detectPlaceholdersXlsx ile AYNI sıra: <si> girdileri dosya sırasıyla,
    // her <si> içinde soldan sağa. Sıra kayarsa arayüzde "#2" görünen alan
    // üretimde başka bir geçişe denk gelir.
    const strings = [
      'ÇANKIRI … {{başvurduğu_bölüm}} MÜHENDİSLİĞİ BÖLÜMÜ {{eğitim_yılı}}',
      'BAŞVURDUĞU BÖLÜM / SINIF',
      '{{başvurduğu_bölüm}} / {{başvurduğu_SINIF}}',
    ];
    const ix = ilkGecisIndeksi(strings);
    expect(ix[0]['{{başvurduğu_bölüm}}']).toBe(1);
    expect(ix[0]['{{eğitim_yılı}}']).toBe(1);
    expect(ix[1]).toEqual({});
    expect(ix[2]['{{başvurduğu_bölüm}}']).toBe(2);
    expect(ix[2]['{{başvurduğu_SINIF}}']).toBe(1);
  });

  it('aynı hücrede iki kez geçen token için ilk numarayı verir', () => {
    const ix = ilkGecisIndeksi(['{{a}} ve {{a}}', '{{a}}']);
    expect(ix[0]['{{a}}']).toBe(1); // ikincisi 2 → doldurucu +1 ile bulur
    expect(ix[1]['{{a}}']).toBe(3);
  });

  it('boş girdide çökmez', () => {
    expect(ilkGecisIndeksi(null)).toEqual([]);
    expect(ilkGecisIndeksi([null, ''])).toEqual([{}, {}]);
  });
});
