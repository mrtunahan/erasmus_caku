import { describe, it, expect } from 'vitest';
import {
  YKS_PUAN_TURLERI,
  puanTuruNormalize,
  gnoDogrula,
  siraOku,
  siraYaz,
  siraEsikDurumu,
  esikAltindakiler,
  elemeNedeni,
  elenecekler,
  gecerliDegerlendirme,
  tabanPuanDurumu,
  ekMadde1Durumu,
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

describe('siraOku — başarı sırası okuma', () => {
  it('Türkçe binlik ayracını DOĞRU okur', () => {
    // ⚠ Asıl tehlike bu: puanOku('300.000') → 300 verir. 300.000'lik bir eşik
    // 300'e dönerse hiçbir aday elenmez, kriter sessizce kalkar.
    expect(siraOku('300.000')).toBe(300000);
    expect(siraOku('300000')).toBe(300000);
    expect(siraOku('1.234.567')).toBe(1234567);
    expect(siraOku('245 678')).toBe(245678);
  });

  it('sıralama TAM SAYIdır — virgül de binlik ayracı sayılır', () => {
    expect(siraOku('300,000')).toBe(300000);
  });

  it('sayı olmayanda null — 0 varsayılmaz', () => {
    // 0 dönseydi aday "1. sıra" gibi görünür, elenmesi gerekirken geçerdi.
    expect(siraOku('')).toBe(null);
    expect(siraOku('300 bin')).toBe(null);
    expect(siraOku('abc')).toBe(null);
    expect(siraOku(null)).toBe(null);
    expect(siraOku('0')).toBe(null);
  });

  it('sayı tipini de kabul eder', () => {
    expect(siraOku(245678)).toBe(245678);
  });
});

describe('siraYaz', () => {
  it('okunabilir yazar', () => {
    expect(siraYaz('300000')).toBe('300.000');
    expect(siraYaz('245.678')).toBe('245.678');
  });

  it('okunamayanda boş — uydurma değer göstermez', () => {
    expect(siraYaz('')).toBe('');
    expect(siraYaz('abc')).toBe('');
  });
});

describe('siraEsikDurumu — KÜÇÜK sıra daha iyidir', () => {
  it('eşiğin önündeki uygun, gerisindeki elenir', () => {
    // 300.000 eşiğinde: 245.678 geçer, 350.000 elenir. Puandaki
    // karşılaştırmanın TAM TERSİ yön — karıştırılırsa yanlış adaylar elenir.
    expect(siraEsikDurumu('245.678', '300.000').durum).toBe('uygun');
    expect(siraEsikDurumu('350.000', '300.000').durum).toBe('altinda');
  });

  it('EŞİT sıra eşiği KARŞILAR', () => {
    // "300.000'inci başarı sırası" şartında 300.000'inci aday şartı sağlar.
    expect(siraEsikDurumu('300.000', '300.000').durum).toBe('uygun');
  });

  it('fark = eşik - aday (pozitifse aday önde)', () => {
    expect(siraEsikDurumu('245.000', '300.000').fark).toBe(55000);
    expect(siraEsikDurumu('350.000', '300.000').fark).toBe(-50000);
  });

  it('eşik tanımlı değilse kimse elenmez', () => {
    // Kriteri hiç koymamış bölümde herkesi elemek olurdu.
    expect(siraEsikDurumu('350.000', '').durum).toBe('kriter_yok');
    expect(siraEsikDurumu('350.000', null).durum).toBe('kriter_yok');
  });

  it('okunamayan aday sırasında BELİRSİZ — sıfır varsayılmaz', () => {
    expect(siraEsikDurumu('', '300.000').durum).toBe('belirsiz');
    expect(siraEsikDurumu('abc', '300.000').durum).toBe('belirsiz');
  });
});

describe('esikAltindakiler', () => {
  const kayitlar = [
    { id: 'a', yksBasariSirasi: '245.678' },
    { id: 'b', yksBasariSirasi: '350.000' },
    { id: 'c', yksBasariSirasi: '' },
  ];

  it('yalnız eşiğin gerisindekileri döner', () => {
    const s = esikAltindakiler(kayitlar, '300.000');
    expect([...s]).toEqual(['b']);
  });

  it('sırası okunamayan kayıt elenmez — belirsizlik eleme sebebi değil', () => {
    expect(esikAltindakiler(kayitlar, '300.000').has('c')).toBe(false);
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

describe('asilYedekOner — taban başarı sıralaması eşiği', () => {
  const kayitlar = [
    { id: 'a', basvurduguSinif: '2', yksPuani: '400', yksBasariSirasi: '120.000' },
    { id: 'b', basvurduguSinif: '2', yksPuani: '280', yksBasariSirasi: '420.000' },
    { id: 'c', basvurduguSinif: '2', yksPuani: '390', yksBasariSirasi: '150.000' },
  ];
  const bul = (o, id) => o.find((x) => x.id === id);

  it('eşiğin gerisindeki aday kontenjanı İŞGAL ETMEDEN elenir', () => {
    // b elenmezse a ve c'den birinin yerini kapatırdı.
    const esikDisi = esikAltindakiler(kayitlar, '300.000');
    const o = asilYedekOner(kayitlar, 'merkezi', { 2: { asil: 2, yedek: 0 } }, null, { esikDisi });
    expect(bul(o, 'b').degerlendirme).toBe('uygun_degil');
    expect(bul(o, 'b').sebep).toBe('taban_sira');
    expect(bul(o, 'a').degerlendirme).toBe('uygun_asil');
    expect(bul(o, 'c').degerlendirme).toBe('uygun_asil');
  });

  it('eşik verilmezse davranış değişmez', () => {
    const o = asilYedekOner(kayitlar, 'merkezi', { 2: { asil: 2, yedek: 0 } });
    expect(bul(o, 'a').degerlendirme).toBe('uygun_asil');
    expect(bul(o, 'c').degerlendirme).toBe('uygun_asil');
    expect(bul(o, 'b').degerlendirme).toBe('uygun_degil'); // kontenjan doldu
    // Gerekçe her zaman yazılır: belgede asil olmayan her satırın NEDEN öyle
    // olduğu görünmeli. Burada şart ihlali değil, yer yokluğu.
    expect(bul(o, 'b').sebep).toBe('kontenjan');
  });
});

// ── Programın KENDİ taban başarı sırası ──
// Merkezi yerleştirmeyle geçişte aday, gitmek istediği programın taban başarı
// sıralamasını da karşılamak zorunda. Şart karşılanmadığı için bu kayıt yedek
// bile olamaz.
describe('elemeNedeni / elenecekler', () => {
  it('programın taban sıralamasının gerisindeki aday elenir', () => {
    const k = { id: 'a', yksBasariSirasi: '250.000', basvurduguBolumTabanSirasi: '180.000' };
    expect(elemeNedeni(k, '')).toBe('program_sira');
  });

  it('kurum eşiği programın taban sıralamasından ÖNCE gelir', () => {
    // İkisini de karşılamıyorsa daha genel olan neden yazılır.
    const k = { id: 'a', yksBasariSirasi: '500.000', basvurduguBolumTabanSirasi: '180.000' };
    expect(elemeNedeni(k, '300.000')).toBe('taban_sira');
  });

  it('her iki şartı da karşılayan elenmez', () => {
    const k = { id: 'a', yksBasariSirasi: '120.000', basvurduguBolumTabanSirasi: '180.000' };
    expect(elemeNedeni(k, '300.000')).toBe('');
  });

  it('program taban sıralaması girilmemişse o şart uygulanmaz', () => {
    const k = { id: 'a', yksBasariSirasi: '250.000', basvurduguBolumTabanSirasi: '' };
    expect(elemeNedeni(k, '')).toBe('');
  });

  it('kurumun genel eşiği SIRALAMA üzerinden işler, puan üzerinden değil', () => {
    // Elle girilen eşik bir başarı sıralamasıdır; adayın puanı ne olursa
    // olsun ona uygulanmaz. (Programın taban PUANI ayrı bir şart — merkezi
    // yerleştirmede geçerli, aşağıda ayrıca sınanıyor.)
    const k = { id: 'a', yksPuani: '200', yksBasariSirasi: '120.000' };
    expect(elemeNedeni(k, '300.000')).toBe('');
  });

  it('elenecekler id → neden haritası döner', () => {
    const m = elenecekler(
      [
        { id: 'a', yksBasariSirasi: '120.000', basvurduguBolumTabanSirasi: '180.000' },
        { id: 'b', yksBasariSirasi: '250.000', basvurduguBolumTabanSirasi: '180.000' },
        { id: 'c', yksBasariSirasi: '900.000', basvurduguBolumTabanSirasi: '180.000' },
      ],
      '400.000'
    );
    expect(m.get('a')).toBeUndefined();
    expect(m.get('b')).toBe('program_sira');
    expect(m.get('c')).toBe('taban_sira');
  });
});

describe('asilYedekOner — taban sıralaması yedek yapmaz', () => {
  const kayitlar = [
    {
      id: 'a',
      basvurduguSinif: '2',
      yksPuani: '400',
      yksBasariSirasi: '120.000',
      basvurduguBolumTabanSirasi: '180.000',
    },
    {
      id: 'b',
      basvurduguSinif: '2',
      yksPuani: '280',
      yksBasariSirasi: '250.000',
      basvurduguBolumTabanSirasi: '180.000',
    },
    {
      id: 'c',
      basvurduguSinif: '2',
      yksPuani: '350',
      yksBasariSirasi: '150.000',
      basvurduguBolumTabanSirasi: '180.000',
    },
  ];
  const bul = (o, id) => o.find((x) => x.id === id);

  it('taban sıralamasının gerisindeki aday YEDEK DEĞİL, uygun değil olur', () => {
    // Asıl bildirilen hata: b, 1 asil + 2 yedek kontenjanında yedek yazılıyordu.
    const esikDisi = elenecekler(kayitlar, '');
    const o = asilYedekOner(kayitlar, 'merkezi', { 2: { asil: 1, yedek: 2 } }, null, { esikDisi });
    expect(bul(o, 'b').degerlendirme).toBe('uygun_degil');
    expect(bul(o, 'b').sebep).toBe('program_sira');
    // Şartı taşıyanlar yerlerini korur.
    expect(bul(o, 'a').degerlendirme).toBe('uygun_asil');
    expect(bul(o, 'c').degerlendirme).toBe('uygun_yedek');
  });

  it('Set de kabul edilir (eski çağrı biçimi)', () => {
    const o = asilYedekOner(kayitlar, 'merkezi', { 2: { asil: 3, yedek: 0 } }, null, {
      esikDisi: new Set(['b']),
    });
    expect(bul(o, 'b').degerlendirme).toBe('uygun_degil');
    expect(bul(o, 'b').sebep).toBe('taban_sira');
  });
});

describe('gecerliDegerlendirme', () => {
  // Sıralamayı düzeltmek tek başına yetmiyordu: değerlendirme kayıtta saklı
  // durduğu için, daha önceki bir sıralamadan kalan "3. YEDEK" hem kartta hem
  // resmî raporda görünmeye devam ediyordu.
  const aday = (sira, ek) => ({ id: 'a', yksBasariSirasi: sira, ...(ek || {}) });

  it('taban sıralamasının gerisindeki adayın KAYITLI yedek sonucu geçersizdir', () => {
    const g = gecerliDegerlendirme(
      aday('420.000', {
        degerlendirme: 'uygun_yedek',
        degerlendirmeSinif: '2',
        degerlendirmeSira: '3',
      }),
      '300.000'
    );
    expect(g.degerlendirme).toBe('uygun_degil');
    expect(g.sebep).toBe('taban_sira');
    expect(g.cakisma).toBe(true);
  });

  it('elenen kayıtta sınıf/sıra taşınmaz', () => {
    // Aksi hâlde belgeye "UYGUN DEĞİL (3. YEDEK)" gibi bir metin düşerdi.
    const g = gecerliDegerlendirme(
      aday('420.000', {
        degerlendirme: 'uygun_asil',
        degerlendirmeSinif: '2',
        degerlendirmeSira: '1',
      }),
      '300.000'
    );
    expect(g.degerlendirmeSinif).toBe('');
    expect(g.degerlendirmeSira).toBe('');
  });

  it('programın kendi taban sıralaması da aynı sonucu doğurur', () => {
    const g = gecerliDegerlendirme(
      aday('250.000', { basvurduguBolumTabanSirasi: '180.000', degerlendirme: 'uygun_yedek' }),
      ''
    );
    expect(g.degerlendirme).toBe('uygun_degil');
    expect(g.sebep).toBe('program_sira');
  });

  it('şartı karşılayan adayın kayıtlı sonucuna DOKUNULMAZ', () => {
    const g = gecerliDegerlendirme(
      aday('120.000', {
        degerlendirme: 'uygun_asil',
        degerlendirmeSinif: '2',
        degerlendirmeSira: '1',
      }),
      '300.000'
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
    const g = gecerliDegerlendirme(aday('900.000', { degerlendirme: 'uygun_yedek' }), '');
    expect(g.degerlendirme).toBe('uygun_yedek');
  });

  it('sıra okunamıyorsa aday elenmez — 0 varsayılmaz', () => {
    // 0 varsayılsaydı aday "1. sıra" sayılıp şartı sağlar görünürdü.
    const g = gecerliDegerlendirme(aday('', { degerlendirme: 'uygun_asil' }), '300.000');
    expect(g.degerlendirme).toBe('uygun_asil');
  });

  it('zaten uygun değil yazan kayıtta çakışma bildirilmez', () => {
    const g = gecerliDegerlendirme(aday('420.000', { degerlendirme: 'uygun_degil' }), '300.000');
    expect(g.cakisma).toBe(false);
  });

  it('hiç değerlendirilmemiş kayıt şartı karşılamıyorsa uygun değildir', () => {
    const g = gecerliDegerlendirme(aday('420.000'), '300.000');
    expect(g.degerlendirme).toBe('uygun_degil');
    expect(g.cakisma).toBe(false);
  });

  it('kayıtlı gerekçe korunur — belgeye "UYGUN DEĞİL (Kontenjan dışı)" yazılsın', () => {
    // Şart ihlali yok (sıra eşiği karşılıyor) ama sıralama turunda kontenjan
    // dolmuş. Asil olmayan her satırın NEDEN öyle olduğu çıktıda görünmeli.
    const g = gecerliDegerlendirme(
      aday('120.000', { degerlendirme: 'uygun_degil', degerlendirmeSebebi: 'kontenjan' }),
      '300.000'
    );
    expect(g.degerlendirme).toBe('uygun_degil');
    expect(g.sebep).toBe('kontenjan');
  });

  it('şart ihlali kayıtlı gerekçenin ÖNÜNE geçer', () => {
    // Kayıtta "kontenjan" yazsa bile gerçek sebep şartın karşılanmamasıdır.
    const g = gecerliDegerlendirme(
      aday('420.000', { degerlendirme: 'uygun_degil', degerlendirmeSebebi: 'kontenjan' }),
      '300.000'
    );
    expect(g.sebep).toBe('taban_sira');
  });

  it('uygun sonuçta kayıtlı gerekçe taşınmaz', () => {
    const g = gecerliDegerlendirme(
      aday('120.000', { degerlendirme: 'uygun_asil', degerlendirmeSebebi: 'kontenjan' }),
      '300.000'
    );
    expect(g.sebep).toBe('');
  });

  it('boş girdide çökmez', () => {
    expect(gecerliDegerlendirme(null, '300.000').degerlendirme).toBe('');
  });
});

// ══════════════════════════════════════════════════════════════
// MERKEZİ YERLEŞTİRME (Ek Madde-1) — iki ek şart
// ══════════════════════════════════════════════════════════════

describe('tabanPuanDurumu — yıl eşlemeli program taban puanı', () => {
  it('taban puandan YÜKSEK olan uygun', () => {
    expect(tabanPuanDurumu('420,50', '412,338').durum).toBe('uygun');
  });

  it('taban puandan düşük olan elenir', () => {
    expect(tabanPuanDurumu('400', '412,338').durum).toBe('altinda');
  });

  it('TAM EŞİTLİK şartı SAĞLAMAZ', () => {
    // Kural "taban puanından yüksek olmalıdır" biçiminde konuldu; sıralama
    // şartındaki (siraEsikDurumu) eşitlik davranışından bilerek farklı.
    expect(tabanPuanDurumu('412,338', '412,338').durum).toBe('altinda');
  });

  it('taban puan girilmemişse şart uygulanmaz', () => {
    expect(tabanPuanDurumu('400', '').durum).toBe('kriter_yok');
    expect(tabanPuanDurumu('400', null).durum).toBe('kriter_yok');
  });

  it('aday puanı okunamıyorsa BELİRSİZ — 0 varsayılmaz', () => {
    expect(tabanPuanDurumu('', '412,338').durum).toBe('belirsiz');
    expect(tabanPuanDurumu('abc', '412,338').durum).toBe('belirsiz');
  });

  it('virgül ve nokta ayracı aynı okunur', () => {
    expect(tabanPuanDurumu('420.50', '412.338').durum).toBe(
      tabanPuanDurumu('420,50', '412,338').durum
    );
  });
});

describe('ekMadde1Durumu — hak bir kez kullanılır', () => {
  it('personel tespiti beyanın ÖNÜNE geçer', () => {
    // Aday "yapmadım" dese de belge aksini söylüyorsa belge kazanır.
    expect(ekMadde1Durumu({ oncekiEkMadde1Gecisi: 'hayir', ekMadde1Dogrulama: 'var' })).toBe(
      'onceki_gecis_var'
    );
    expect(ekMadde1Durumu({ oncekiEkMadde1Gecisi: 'evet', ekMadde1Dogrulama: 'yok' })).toBe(
      'temiz'
    );
  });

  it('tespit yoksa beyan okunur', () => {
    expect(ekMadde1Durumu({ oncekiEkMadde1Gecisi: 'evet' })).toBe('onceki_gecis_var');
    expect(ekMadde1Durumu({ oncekiEkMadde1Gecisi: 'hayir' })).toBe('beyan_var');
  });

  it('hiçbir bilgi yoksa BİLİNMİYOR — "temiz" varsayılmaz', () => {
    expect(ekMadde1Durumu({})).toBe('bilinmiyor');
    expect(ekMadde1Durumu(null)).toBe('bilinmiyor');
  });
});

describe('elemeNedeni — Ek Madde-1 şartları', () => {
  it('programın o yıla ait taban puanının altındaki aday elenir', () => {
    const k = { id: 'a', yksPuani: '400', basvurduguBolumOsysPuani: '412,338' };
    expect(elemeNedeni(k, '')).toBe('program_taban_puan');
  });

  it('daha önce Ek Madde-1 geçişi yapmış aday elenir', () => {
    expect(elemeNedeni({ id: 'a', ekMadde1Dogrulama: 'var' }, '')).toBe('onceki_gecis');
    expect(elemeNedeni({ id: 'a', oncekiEkMadde1Gecisi: 'evet' }, '')).toBe('onceki_gecis');
  });

  it('BELİRSİZLİK eleme sebebi değildir', () => {
    // Belge okunmadı diye adayı elemek, doğrulanmamış bir gerekçeyle karar
    // vermek olurdu. Arayüz bunu "tespit yapılmadı" diye uyarır.
    expect(elemeNedeni({ id: 'a' }, '')).toBe('');
    expect(elemeNedeni({ id: 'a', oncekiEkMadde1Gecisi: 'hayir' }, '')).toBe('');
  });

  it('şartların tümünü karşılayan elenmez', () => {
    const k = {
      id: 'a',
      yksBasariSirasi: '120.000',
      yksPuani: '450',
      basvurduguBolumOsysPuani: '412,338',
      basvurduguBolumTabanSirasi: '180.000',
      ekMadde1Dogrulama: 'yok',
    };
    expect(elemeNedeni(k, '300.000')).toBe('');
  });

  it('sıralama şartı taban puan şartının ÖNÜNE geçer', () => {
    const k = {
      id: 'a',
      yksBasariSirasi: '420.000',
      yksPuani: '400',
      basvurduguBolumOsysPuani: '412,338',
    };
    expect(elemeNedeni(k, '300.000')).toBe('taban_sira');
  });

  it('taban puan şartı Ek Madde-1 geçmişinin ÖNÜNE geçer', () => {
    const k = {
      id: 'a',
      yksPuani: '400',
      basvurduguBolumOsysPuani: '412,338',
      ekMadde1Dogrulama: 'var',
    };
    expect(elemeNedeni(k, '')).toBe('program_taban_puan');
  });

  it('elenen kayıt kontenjanı işgal etmeden uygun değil olur', () => {
    const kayitlar = [
      { id: 'a', basvurduguSinif: '2', yksPuani: '450', basvurduguBolumOsysPuani: '412,338' },
      { id: 'b', basvurduguSinif: '2', yksPuani: '400', basvurduguBolumOsysPuani: '412,338' },
      { id: 'c', basvurduguSinif: '2', yksPuani: '430', basvurduguBolumOsysPuani: '412,338' },
    ];
    const o = asilYedekOner(kayitlar, 'merkezi', { 2: { asil: 2, yedek: 0 } }, null, {
      esikDisi: elenecekler(kayitlar, ''),
    });
    const bul = (id) => o.find((x) => x.id === id);
    expect(bul('b').degerlendirme).toBe('uygun_degil');
    expect(bul('b').sebep).toBe('program_taban_puan');
    expect(bul('a').degerlendirme).toBe('uygun_asil');
    expect(bul('c').degerlendirme).toBe('uygun_asil');
  });
});
