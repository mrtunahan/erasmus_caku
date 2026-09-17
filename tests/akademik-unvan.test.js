import { describe, it, expect } from 'vitest';
import {
  UNVANLAR,
  ayniKisiMi,
  girisListesi,
  kisiAnahtari,
  mukerrerGruplar,
  unvaniAyir,
  unvanKidemi,
  unvansizAd,
} from '../lib/akademik-unvan.js';

describe('unvaniAyir', () => {
  it('ASIL ARIZA: "Öğrt. Gör." tanınıyor', () => {
    expect(unvaniAyir('Öğrt. Gör. Gökalp SAYLAM')).toEqual({
      unvan: 'Öğrt. Gör.',
      ad: 'Gökalp SAYLAM',
    });
  });

  it('ASIL ARIZA: tek başına "Öğr. Üyesi" tanınıyor', () => {
    expect(unvaniAyir('Öğr. Üyesi Gökalp SAYLAM')).toEqual({
      unvan: 'Öğr. Üyesi',
      ad: 'Gökalp SAYLAM',
    });
  });

  it('uzun unvan kısadan önce denenir', () => {
    // "Dr." ile eşleşip geriye "Öğr. Üyesi Nurettin…" bırakmamalı
    expect(unvaniAyir('Dr. Öğr. Üyesi Nurettin GÖKŞENLİ')).toEqual({
      unvan: 'Dr. Öğr. Üyesi',
      ad: 'Nurettin GÖKŞENLİ',
    });
    expect(unvaniAyir('Öğr. Gör. Dr. Ayşe YILMAZ')).toEqual({
      unvan: 'Öğr. Gör. Dr.',
      ad: 'Ayşe YILMAZ',
    });
  });

  it('yaygın unvanlar', () => {
    expect(unvaniAyir('Prof. Dr. Gökhan ŞENGÜL').ad).toBe('Gökhan ŞENGÜL');
    expect(unvaniAyir('Doç. Dr. Mehmet KAYA').ad).toBe('Mehmet KAYA');
    expect(unvaniAyir('Arş. Gör. Zeynep AK').ad).toBe('Zeynep AK');
    expect(unvaniAyir('Okutman Ali VELİ').ad).toBe('Ali VELİ');
  });

  it('nokta ve boşluk yazımı önemsiz', () => {
    expect(unvaniAyir('Prof.Dr. Gökhan ŞENGÜL').ad).toBe('Gökhan ŞENGÜL');
    expect(unvaniAyir('Prof Dr Gökhan ŞENGÜL').ad).toBe('Gökhan ŞENGÜL');
    expect(unvaniAyir('Öğrt.Gör. Gökalp SAYLAM').ad).toBe('Gökalp SAYLAM');
  });

  it('açık yazılmış unvanlar da tanınır', () => {
    expect(unvaniAyir('Öğretim Görevlisi Gökalp SAYLAM').ad).toBe('Gökalp SAYLAM');
    expect(unvaniAyir('Doktor Öğretim Üyesi Nurettin GÖKŞENLİ').ad).toBe('Nurettin GÖKŞENLİ');
  });

  it('unvansız ad olduğu gibi kalır — uydurma yapılmaz', () => {
    expect(unvaniAyir('Gökalp SAYLAM')).toEqual({ unvan: '', ad: 'Gökalp SAYLAM' });
  });

  it('unvana benzeyen ad başı yenmez', () => {
    // "Dr." unvanı "Drahşan"ın başını kesmemeli
    expect(unvaniAyir('Drahşan ÖZKAN')).toEqual({ unvan: '', ad: 'Drahşan ÖZKAN' });
    expect(unvaniAyir('Doğan UZMAN')).toEqual({ unvan: '', ad: 'Doğan UZMAN' });
  });

  it('boş girdi güvenli', () => {
    expect(unvaniAyir('')).toEqual({ unvan: '', ad: '' });
    expect(unvaniAyir(null)).toEqual({ unvan: '', ad: '' });
    expect(unvaniAyir('   ')).toEqual({ unvan: '', ad: '' });
  });

  it('yalnız unvan yazılmışsa ad boş kalır', () => {
    expect(unvaniAyir('Prof. Dr.')).toEqual({ unvan: 'Prof. Dr.', ad: '' });
  });
});

describe('unvansizAd', () => {
  it('unvanı atar', () => {
    expect(unvansizAd('Öğrt. Gör. Gökalp SAYLAM')).toBe('Gökalp SAYLAM');
    expect(unvansizAd('Dr. Öğr. Üyesi Nurettin GÖKŞENLİ')).toBe('Nurettin GÖKŞENLİ');
  });

  it('unvan yoksa ad aynen döner', () => {
    expect(unvansizAd('Gökalp SAYLAM')).toBe('Gökalp SAYLAM');
    expect(unvansizAd('')).toBe('');
  });
});

describe('kisiAnahtari / ayniKisiMi', () => {
  it('ASIL SORU: iki Gökalp SAYLAM aynı kişidir', () => {
    expect(ayniKisiMi('Öğrt. Gör. Gökalp SAYLAM', 'Öğr. Üyesi Gökalp SAYLAM')).toBe(true);
  });

  it('büyük/küçük harf farkı kişiyi ayırmaz', () => {
    expect(ayniKisiMi('Öğr. Gör. Gökalp Saylam', 'Prof. Dr. GÖKALP SAYLAM')).toBe(true);
  });

  it('Türkçe küçültme doğru yapılır', () => {
    // İngilizce küçültmede 'İ' bozulur; anahtar tutmazdı
    expect(ayniKisiMi('Dr. Öğr. Üyesi Nurettin GÖKŞENLİ', 'Prof. Dr. Nurettin Gökşenli')).toBe(
      true
    );
    expect(kisiAnahtari('Prof. Dr. IŞIL ADA')).toBe('ışıl ada');
  });

  it('farklı kişiler karışmaz', () => {
    expect(ayniKisiMi('Öğr. Gör. Gökalp SAYLAM', 'Prof. Dr. Gökhan ŞENGÜL')).toBe(false);
    // Aynı ilk ad, farklı soyad — eski anahtar bunları karıştırıyordu
    expect(ayniKisiMi('Dr. Ahmet Tunahan Korkmaz', 'Dr. Ahmet Yılmaz')).toBe(false);
  });

  it('boş ad hiçbir şeye eşit değildir', () => {
    expect(ayniKisiMi('', '')).toBe(false);
    expect(ayniKisiMi(null, 'Gökalp SAYLAM')).toBe(false);
  });
});

describe('mukerrerGruplar', () => {
  const kayitlar = [
    { name: 'Öğrt. Gör. Gökalp SAYLAM', _id: 'a' },
    { name: 'Öğr. Üyesi Gökalp SAYLAM', _id: 'b' },
    { name: 'Prof. Dr. Gökhan ŞENGÜL', _id: 'c' },
    { name: 'Dr. Öğr. Üyesi Nurettin GÖKŞENLİ', _id: 'd' },
    { name: 'Dr. Öğr. Üyesi Nurettin GÖKŞENLİ', _id: 'e' },
  ];

  it('yalnız çakışan kişileri döndürür', () => {
    const g = mukerrerGruplar(kayitlar);
    expect(g.map((x) => x.ad)).toEqual(['Gökalp SAYLAM', 'Nurettin GÖKŞENLİ']);
  });

  it('unvanı farklı olanları işaretler (birleştirme gerekir)', () => {
    const g = mukerrerGruplar(kayitlar).find((x) => x.ad === 'Gökalp SAYLAM');
    expect(g.farkliYazim).toBe(true);
    expect(g.adlar).toHaveLength(2);
  });

  it('metni birebir aynı olanlar farkliYazim değildir (dedupe yeter)', () => {
    const g = mukerrerGruplar(kayitlar).find((x) => x.ad === 'Nurettin GÖKŞENLİ');
    expect(g.farkliYazim).toBe(false);
    expect(g.kayitlar).toHaveLength(2);
  });

  it('tek kayıtlı kişi listeye girmez', () => {
    expect(mukerrerGruplar([{ name: 'Prof. Dr. Tek KİŞİ' }])).toEqual([]);
  });

  it('düz dize listesi de kabul edilir', () => {
    const g = mukerrerGruplar(['Öğr. Gör. A B', 'Prof. Dr. A B']);
    expect(g).toHaveLength(1);
    expect(g[0].farkliYazim).toBe(true);
  });

  it('adsız kayıtlar atlanır', () => {
    expect(mukerrerGruplar([{ name: '' }, { name: null }, {}])).toEqual([]);
  });

  it('boş liste boş sonuç', () => {
    expect(mukerrerGruplar([])).toEqual([]);
    expect(mukerrerGruplar(null)).toEqual([]);
  });
});

describe('unvanKidemi', () => {
  it('kıdem sırası artar', () => {
    expect(unvanKidemi('Arş. Gör.')).toBeLessThan(unvanKidemi('Öğr. Gör.'));
    expect(unvanKidemi('Öğrt. Gör.')).toBeLessThan(unvanKidemi('Dr. Öğr. Üyesi'));
    expect(unvanKidemi('Dr. Öğr. Üyesi')).toBeLessThan(unvanKidemi('Doç. Dr.'));
    expect(unvanKidemi('Doç. Dr.')).toBeLessThan(unvanKidemi('Prof. Dr.'));
  });

  it('yazım varyantları aynı kıdemi verir', () => {
    expect(unvanKidemi('Prof.Dr.')).toBe(unvanKidemi('Prof. Dr.'));
  });

  it('tanınmayan unvan -1', () => {
    expect(unvanKidemi('Kral')).toBe(-1);
    expect(unvanKidemi('')).toBe(-1);
  });
});

describe('UNVANLAR listesi', () => {
  it('her unvan tekil', () => {
    expect(new Set(UNVANLAR).size).toBe(UNVANLAR.length);
  });

  it('ekrandaki dört unvanın hepsi tanınıyor', () => {
    // Giriş listesindeki gerçek örnekler
    [
      'Dr. Öğr. Üyesi Nurettin GÖKŞENLİ',
      'Öğrt. Gör. Gökalp SAYLAM',
      'Öğr. Üyesi Gökalp SAYLAM',
      'Prof. Dr. Gökhan ŞENGÜL',
    ].forEach((tam) => {
      expect(unvaniAyir(tam).unvan, tam).not.toBe('');
    });
  });
});

// ⚠ Giriş listesi mükerrerleri GİZLEMEZ: gizlenen ad ayrı bir kimliktir ve
// bu ekrandan ulaşılamaz (ad elle yazılamıyor) — şifresi ona bağlı kişi
// giriş yapamaz hâle gelirdi.
describe('girisListesi', () => {
  const profiller = [
    { name: 'Prof. Dr. Gökhan ŞENGÜL' },
    { name: 'Öğr. Üyesi Gökalp SAYLAM' },
    { name: 'Dr. Öğr. Üyesi Nurettin GÖKŞENLİ' },
    { name: 'Öğrt. Gör. Gökalp SAYLAM' },
    { name: 'Dr. Öğr. Üyesi Nurettin GÖKŞENLİ' }, // birebir kopya
  ];

  it('unvanı farklı kayıtlar GİZLENMEZ', () => {
    const adlar = girisListesi(profiller).map((p) => p.name);
    expect(adlar).toContain('Öğrt. Gör. Gökalp SAYLAM');
    expect(adlar).toContain('Öğr. Üyesi Gökalp SAYLAM');
  });

  it('birebir aynı ad tek satıra iner', () => {
    const adlar = girisListesi(profiller).map((p) => p.name);
    expect(adlar.filter((a) => a === 'Dr. Öğr. Üyesi Nurettin GÖKŞENLİ')).toHaveLength(1);
    expect(adlar).toHaveLength(4);
  });

  it('aynı kişinin varyantları yan yana gelir', () => {
    const adlar = girisListesi(profiller).map((p) => p.name);
    const i = adlar.indexOf('Öğr. Üyesi Gökalp SAYLAM');
    const j = adlar.indexOf('Öğrt. Gör. Gökalp SAYLAM');
    expect(Math.abs(i - j)).toBe(1);
  });

  it('kişiye göre Türkçe sıralanır', () => {
    expect(girisListesi(profiller).map((p) => p.name)[0]).toBe('Öğr. Üyesi Gökalp SAYLAM');
  });

  it('adsız kayıtlar düşer, boş liste güvenli', () => {
    expect(girisListesi([{ name: '' }, {}, null])).toEqual([]);
    expect(girisListesi(null)).toEqual([]);
  });

  it('özgün dizi değiştirilmez', () => {
    const kopya = profiller.map((p) => ({ ...p }));
    girisListesi(profiller);
    expect(profiller).toEqual(kopya);
  });
});
