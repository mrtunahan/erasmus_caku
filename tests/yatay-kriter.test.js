import { describe, it, expect } from 'vitest';
import {
  YKS_PUAN_TURLERI,
  puanTuruNormalize,
  gnoDogrula,
  osymEsikDurumu,
  esikAltindakiler,
  elemeNedeni,
  elenecekler,
  gecerliDegerlendirme,
} from '../lib/yatay-kriter.js';
import { asilYedekOner } from '../lib/yatay-siralama.js';

describe('puanTuruNormalize', () => {
  it('YÖS ve DGS türlerini tanır — asıl eksik olan bunlardı', () => {
    expect(puanTuruNormalize('YÖS')).toBe('YÖS');
    expect(puanTuruNormalize('yös')).toBe('YÖS');
    expect(puanTuruNormalize('YOS')).toBe('YÖS');
    expect(puanTuruNormalize('DGS')).toBe('DGS SAY');
    expect(puanTuruNormalize('DGS-SAY')).toBe('DGS SAY');
    expect(puanTuruNormalize('DGS / EA')).toBe('DGS EA');
    expect(puanTuruNormalize('dgs sözel')).toBe('DGS SÖZ');
  });

  it('klasik türleri ve yazım varyantlarını çözer', () => {
    expect(puanTuruNormalize('SAY')).toBe('SAY');
    expect(puanTuruNormalize('sayısal')).toBe('SAY');
    expect(puanTuruNormalize('MF')).toBe('SAY');
    expect(puanTuruNormalize('Eşit Ağırlık')).toBe('EA');
    expect(puanTuruNormalize('TM')).toBe('EA');
    expect(puanTuruNormalize('sözel')).toBe('SÖZ');
    expect(puanTuruNormalize('SOZ')).toBe('SÖZ');
    expect(puanTuruNormalize('TS')).toBe('SÖZ');
    expect(puanTuruNormalize('dil')).toBe('DİL');
    expect(puanTuruNormalize('YDT')).toBe('DİL');
    expect(puanTuruNormalize('TYT')).toBe('TYT');
    expect(puanTuruNormalize('özel yetenek sınavı')).toBe('ÖZEL YETENEK');
  });

  it('tanınmayan değerde BOŞ döner — uydurma tür üretmez', () => {
    // Yanlış tür, yanlış taban puan listesiyle karşılaştırma demek.
    expect(puanTuruNormalize('zzz')).toBe('');
    expect(puanTuruNormalize('')).toBe('');
    expect(puanTuruNormalize(null)).toBe('');
  });

  it('liste kanonik kimlikleri içerir', () => {
    const idler = YKS_PUAN_TURLERI.map((t) => t.id);
    ['SAY', 'EA', 'SÖZ', 'DİL', 'TYT', 'DGS SAY', 'YÖS'].forEach((id) =>
      expect(idler).toContain(id)
    );
  });
});

describe('gnoDogrula — 100’lük sistem', () => {
  it('geçerli 100’lük değeri kabul eder', () => {
    const r = gnoDogrula('78,45');
    expect(r.ok).toBe(true);
    expect(r.deger).toBeCloseTo(78.45, 2);
    expect(r.uyari).toBe('');
  });

  it('4’lük görünen değeri UYARIR ama reddetmez', () => {
    // 3,10 neredeyse kesin 4'lük AGNO'dur; sessiz geçerse sıralama puanı
    // (YKS×0,40 + AGNO×0,60) saçmalar ve aday listenin dibine düşer.
    const r = gnoDogrula('3,10');
    expect(r.ok).toBe(true);
    expect(r.uyari).toMatch(/4’lük/);
  });

  it('aralık dışını reddeder', () => {
    expect(gnoDogrula('120').ok).toBe(false);
    expect(gnoDogrula('-5').ok).toBe(false);
  });

  it('boş ve sayı olmayanı reddeder', () => {
    expect(gnoDogrula('').ok).toBe(false);
    expect(gnoDogrula('abc').ok).toBe(false);
    expect(gnoDogrula(null).ok).toBe(false);
  });

  it('nokta ve virgül ayracı aynı okunur', () => {
    expect(gnoDogrula('78.45').deger).toBeCloseTo(gnoDogrula('78,45').deger, 5);
  });
});

describe('osymEsikDurumu', () => {
  it('eşiği karşılayan uygun, altında kalan elenir', () => {
    expect(osymEsikDurumu('320,5', '300').durum).toBe('uygun');
    expect(osymEsikDurumu('280', '300').durum).toBe('altinda');
  });

  it('EŞİT puan eşiği KARŞILAR', () => {
    // "taban puandan az olmamak" — sınırdaki aday elenmez.
    expect(osymEsikDurumu('300', '300').durum).toBe('uygun');
  });

  it('eşik tanımlı değilse kimse elenmez', () => {
    // Kriteri hiç koymamış bölümde herkesi elemek olurdu.
    expect(osymEsikDurumu('280', '').durum).toBe('kriter_yok');
    expect(osymEsikDurumu('280', null).durum).toBe('kriter_yok');
  });

  it('okunamayan aday puanında BELİRSİZ — sıfır varsayılmaz', () => {
    expect(osymEsikDurumu('', '300').durum).toBe('belirsiz');
    expect(osymEsikDurumu('abc', '300').durum).toBe('belirsiz');
  });
});

describe('esikAltindakiler', () => {
  const kayitlar = [
    { id: 'a', yksPuani: '320' },
    { id: 'b', yksPuani: '280' },
    { id: 'c', yksPuani: '' },
  ];

  it('yalnız eşiğin altındakileri döner', () => {
    const s = esikAltindakiler(kayitlar, '300');
    expect([...s]).toEqual(['b']);
  });

  it('puanı okunamayan kayıt elenmez — belirsizlik eleme sebebi değil', () => {
    expect(esikAltindakiler(kayitlar, '300').has('c')).toBe(false);
  });

  it('eşik yoksa küme boş', () => {
    expect(esikAltindakiler(kayitlar, '').size).toBe(0);
  });
});

describe('asilYedekOner — sınıf başına kontenjan', () => {
  const kayitlar = [
    { id: '2a', basvurduguSinif: '2', yksPuani: '400' },
    { id: '2b', basvurduguSinif: '2', yksPuani: '390' },
    { id: '2c', basvurduguSinif: '2', yksPuani: '380' },
    { id: '3a', basvurduguSinif: '3', yksPuani: '370' },
    { id: '3b', basvurduguSinif: '3', yksPuani: '360' },
  ];
  const bul = (o, id) => o.find((x) => x.id === id);

  it('her sınıfa KENDİ kontenjanı uygulanır', () => {
    // 2. sınıf: 1 asil + 1 yedek · 3. sınıf: 2 asil
    const o = asilYedekOner(kayitlar, 'merkezi', {
      2: { asil: 1, yedek: 1 },
      3: { asil: 2, yedek: 0 },
    });
    expect(bul(o, '2a').degerlendirme).toBe('uygun_asil');
    expect(bul(o, '2b').degerlendirme).toBe('uygun_yedek');
    expect(bul(o, '2c').degerlendirme).toBe('uygun_degil');
    expect(bul(o, '3a').degerlendirme).toBe('uygun_asil');
    expect(bul(o, '3b').degerlendirme).toBe('uygun_asil');
  });

  it('sınıf anahtarı yoksa kontenjan SIFIR sayılır — sessizce sınırsız olmaz', () => {
    const o = asilYedekOner(kayitlar, 'merkezi', { 2: { asil: 1, yedek: 0 } });
    expect(bul(o, '3a').degerlendirme).toBe('uygun_degil');
  });

  it('genel {asil,yedek} tüm sınıflara uygulanır', () => {
    const o = asilYedekOner(kayitlar, 'merkezi', { asil: 1, yedek: 0 });
    expect(bul(o, '2a').degerlendirme).toBe('uygun_asil');
    expect(bul(o, '3a').degerlendirme).toBe('uygun_asil');
    expect(bul(o, '2b').degerlendirme).toBe('uygun_degil');
  });

  it('ESKİ İMZA çalışmayı sürdürür (asilSayisi, yedekSayisi)', () => {
    const o = asilYedekOner(kayitlar, 'merkezi', 1, 1);
    expect(bul(o, '2a').degerlendirme).toBe('uygun_asil');
    expect(bul(o, '2b').degerlendirme).toBe('uygun_yedek');
    expect(bul(o, '3a').degerlendirme).toBe('uygun_asil');
  });
});

describe('asilYedekOner — taban ÖSYM eşiği', () => {
  const kayitlar = [
    { id: 'a', basvurduguSinif: '2', yksPuani: '400' },
    { id: 'b', basvurduguSinif: '2', yksPuani: '280' },
    { id: 'c', basvurduguSinif: '2', yksPuani: '390' },
  ];
  const bul = (o, id) => o.find((x) => x.id === id);

  it('eşik altındaki aday kontenjanı İŞGAL ETMEDEN elenir', () => {
    // b elenmezse a ve c'den birinin yerini kapatırdı.
    const esikDisi = esikAltindakiler(kayitlar, '300');
    const o = asilYedekOner(kayitlar, 'merkezi', { 2: { asil: 2, yedek: 0 } }, null, { esikDisi });
    expect(bul(o, 'b').degerlendirme).toBe('uygun_degil');
    expect(bul(o, 'b').sebep).toBe('taban_osym');
    expect(bul(o, 'a').degerlendirme).toBe('uygun_asil');
    expect(bul(o, 'c').degerlendirme).toBe('uygun_asil');
  });

  it('eşik verilmezse davranış değişmez', () => {
    const o = asilYedekOner(kayitlar, 'merkezi', { 2: { asil: 2, yedek: 0 } });
    expect(bul(o, 'a').degerlendirme).toBe('uygun_asil');
    expect(bul(o, 'c').degerlendirme).toBe('uygun_asil');
    expect(bul(o, 'b').degerlendirme).toBe('uygun_degil'); // kontenjan doldu
    expect(bul(o, 'b').sebep).toBeUndefined();
  });
});

// ── Programın KENDİ taban puanı ──
// Merkezi yerleştirmeyle geçişte aday, gitmek istediği programın ÖSYM taban
// puanını da karşılamak zorunda. Bu şart kartta gösteriliyordu ama sıralamaya
// hiç girmiyordu: taban puanın altındaki aday yine sıraya alınıp YEDEK
// yazılıyordu. Şart karşılanmadığı için yedek bile olamaz.
describe('elemeNedeni / elenecekler', () => {
  it('programın taban puanının altındaki aday elenir', () => {
    const k = { id: 'a', yksPuani: '280', basvurduguBolumOsysPuani: '300' };
    expect(elemeNedeni(k, '')).toBe('program_taban');
  });

  it('kurum eşiği programın taban puanından ÖNCE gelir', () => {
    // İkisini de karşılamıyorsa daha genel olan neden yazılır.
    const k = { id: 'a', yksPuani: '200', basvurduguBolumOsysPuani: '300' };
    expect(elemeNedeni(k, '250')).toBe('taban_osym');
  });

  it('her iki şartı da karşılayan elenmez', () => {
    const k = { id: 'a', yksPuani: '320', basvurduguBolumOsysPuani: '300' };
    expect(elemeNedeni(k, '250')).toBe('');
  });

  it('program taban puanı girilmemişse o şart uygulanmaz', () => {
    const k = { id: 'a', yksPuani: '280', basvurduguBolumOsysPuani: '' };
    expect(elemeNedeni(k, '')).toBe('');
  });

  it('elenecekler id → neden haritası döner', () => {
    const m = elenecekler(
      [
        { id: 'a', yksPuani: '320', basvurduguBolumOsysPuani: '300' },
        { id: 'b', yksPuani: '280', basvurduguBolumOsysPuani: '300' },
        { id: 'c', yksPuani: '100', basvurduguBolumOsysPuani: '300' },
      ],
      '150'
    );
    expect(m.get('a')).toBeUndefined();
    expect(m.get('b')).toBe('program_taban');
    expect(m.get('c')).toBe('taban_osym');
  });
});

describe('asilYedekOner — program taban puanı yedek yapmaz', () => {
  const kayitlar = [
    { id: 'a', basvurduguSinif: '2', yksPuani: '400', basvurduguBolumOsysPuani: '300' },
    { id: 'b', basvurduguSinif: '2', yksPuani: '280', basvurduguBolumOsysPuani: '300' },
    { id: 'c', basvurduguSinif: '2', yksPuani: '350', basvurduguBolumOsysPuani: '300' },
  ];
  const bul = (o, id) => o.find((x) => x.id === id);

  it('taban puanın altındaki aday YEDEK DEĞİL, uygun değil olur', () => {
    // Asıl bildirilen hata: b, 1 asil + 2 yedek kontenjanında yedek yazılıyordu.
    const esikDisi = elenecekler(kayitlar, '');
    const o = asilYedekOner(kayitlar, 'merkezi', { 2: { asil: 1, yedek: 2 } }, null, { esikDisi });
    expect(bul(o, 'b').degerlendirme).toBe('uygun_degil');
    expect(bul(o, 'b').sebep).toBe('program_taban');
    // Şartı taşıyanlar yerlerini korur.
    expect(bul(o, 'a').degerlendirme).toBe('uygun_asil');
    expect(bul(o, 'c').degerlendirme).toBe('uygun_yedek');
  });

  it('Set de kabul edilir (eski çağrı biçimi)', () => {
    const o = asilYedekOner(kayitlar, 'merkezi', { 2: { asil: 3, yedek: 0 } }, null, {
      esikDisi: new Set(['b']),
    });
    expect(bul(o, 'b').degerlendirme).toBe('uygun_degil');
    expect(bul(o, 'b').sebep).toBe('taban_osym');
  });
});

describe('gecerliDegerlendirme', () => {
  // Sıralamayı düzeltmek tek başına yetmiyordu: değerlendirme kayıtta saklı
  // durduğu için, daha önceki bir sıralamadan kalan "3. YEDEK" hem kartta hem
  // resmî raporda görünmeye devam ediyordu.
  const aday = (p, ek) => ({ id: 'a', yksPuani: p, ...(ek || {}) });

  it('taban puanın altındaki adayın KAYITLI yedek sonucu geçersizdir', () => {
    const g = gecerliDegerlendirme(
      aday('290,22', {
        degerlendirme: 'uygun_yedek',
        degerlendirmeSinif: '2',
        degerlendirmeSira: '3',
      }),
      '308,50'
    );
    expect(g.degerlendirme).toBe('uygun_degil');
    expect(g.sebep).toBe('taban_osym');
    expect(g.cakisma).toBe(true);
  });

  it('elenen kayıtta sınıf/sıra taşınmaz', () => {
    // Aksi hâlde belgeye "UYGUN DEĞİL (3. YEDEK)" gibi bir metin düşerdi.
    const g = gecerliDegerlendirme(
      aday('290', { degerlendirme: 'uygun_asil', degerlendirmeSinif: '2', degerlendirmeSira: '1' }),
      '300'
    );
    expect(g.degerlendirmeSinif).toBe('');
    expect(g.degerlendirmeSira).toBe('');
  });

  it('programın kendi taban puanı da aynı sonucu doğurur', () => {
    const g = gecerliDegerlendirme(
      aday('380', { basvurduguBolumOsysPuani: '412,338', degerlendirme: 'uygun_yedek' }),
      ''
    );
    expect(g.degerlendirme).toBe('uygun_degil');
    expect(g.sebep).toBe('program_taban');
  });

  it('şartı karşılayan adayın kayıtlı sonucuna DOKUNULMAZ', () => {
    const g = gecerliDegerlendirme(
      aday('325,17', {
        degerlendirme: 'uygun_asil',
        degerlendirmeSinif: '2',
        degerlendirmeSira: '1',
      }),
      '308,50'
    );
    expect(g).toMatchObject({
      degerlendirme: 'uygun_asil',
      degerlendirmeSinif: '2',
      degerlendirmeSira: '1',
      sebep: '',
      cakisma: false,
    });
  });

  it('kriter tanımlı değilse hiçbir şey değişmez', () => {
    const g = gecerliDegerlendirme(aday('100', { degerlendirme: 'uygun_yedek' }), '');
    expect(g.degerlendirme).toBe('uygun_yedek');
  });

  it('puan okunamıyorsa aday elenmez — 0 varsayılmaz', () => {
    const g = gecerliDegerlendirme(aday('', { degerlendirme: 'uygun_asil' }), '300');
    expect(g.degerlendirme).toBe('uygun_asil');
  });

  it('zaten uygun değil yazan kayıtta çakışma bildirilmez', () => {
    const g = gecerliDegerlendirme(aday('290', { degerlendirme: 'uygun_degil' }), '300');
    expect(g.cakisma).toBe(false);
  });

  it('hiç değerlendirilmemiş kayıt şartı karşılamıyorsa uygun değildir', () => {
    const g = gecerliDegerlendirme(aday('290'), '300');
    expect(g.degerlendirme).toBe('uygun_degil');
    expect(g.cakisma).toBe(false);
  });

  it('boş girdide çökmez', () => {
    expect(gecerliDegerlendirme(null, '300').degerlendirme).toBe('');
  });
});
