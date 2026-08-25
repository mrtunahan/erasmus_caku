import { describe, it, expect } from 'vitest';
import {
  ayniEgitmen,
  cokEgitmenli,
  dersEgitmeniMi,
  dersEgitmenleri,
  egitmenAlanlari,
  egitmenMetni,
  egitmenleriCoz,
  egitmensizMi,
  slotEgitmeniSec,
} from '../lib/ders-egitmenleri.js';

describe('egitmenleriCoz', () => {
  it('diziyi olduğu gibi, metni tek elemanlı liste yapar', () => {
    expect(egitmenleriCoz(['A', 'B'])).toEqual(['A', 'B']);
    expect(egitmenleriCoz('Dr. Öğr. Üyesi Taha ETEM')).toEqual(['Dr. Öğr. Üyesi Taha ETEM']);
  });

  it('boş değerleri düşürür', () => {
    expect(egitmenleriCoz(null)).toEqual([]);
    expect(egitmenleriCoz('')).toEqual([]);
    expect(egitmenleriCoz(['', '  ', null])).toEqual([]);
  });

  it("eski birleşik metni ('A / B') listeye açar", () => {
    expect(egitmenleriCoz('Ayşe Yılmaz / Mehmet Demir')).toEqual(['Ayşe Yılmaz', 'Mehmet Demir']);
    expect(egitmenleriCoz('A;B')).toEqual(['A', 'B']);
  });

  it('virgülü AYRAÇ SAYMAZ — unvanlı adlarda virgül geçebilir', () => {
    expect(egitmenleriCoz('Yılmaz, Ayşe')).toEqual(['Yılmaz, Ayşe']);
  });

  it('aynı kişiyi unvanı farklı olsa da bir kez sayar', () => {
    expect(egitmenleriCoz(['Prof. Dr. Ayşe YILMAZ', 'Ayşe Yılmaz'])).toEqual([
      'Prof. Dr. Ayşe YILMAZ',
    ]);
  });
});

describe('dersEgitmenleri — iki alan, tek gerçek', () => {
  it('professors dizisi kaynaktır', () => {
    expect(dersEgitmenleri({ professors: ['A', 'B'], professor: 'A' })).toEqual(['A', 'B']);
  });

  it('dizi yoksa eski professor metnine düşer', () => {
    expect(dersEgitmenleri({ professor: 'Tek Hoca' })).toEqual(['Tek Hoca']);
  });

  it('boş dizi "hoca yok" demektir — eski metne DÖNÜLMEZ', () => {
    // Hoca silindiğinde dizi boşalır; eski alana düşmek silmeyi geri alırdı.
    expect(dersEgitmenleri({ professors: [], professor: 'Silinen Hoca' })).toEqual([]);
  });

  it('kayıt yoksa boş liste', () => {
    expect(dersEgitmenleri(null)).toEqual([]);
    expect(dersEgitmenleri({})).toEqual([]);
  });
});

describe('egitmenMetni / cokEgitmenli / egitmensizMi', () => {
  it('görünüm metni A / B', () => {
    expect(egitmenMetni({ professors: ['A', 'B'] })).toBe('A / B');
    expect(egitmenMetni({ professors: ['A', 'B'] }, ', ')).toBe('A, B');
    expect(egitmenMetni({})).toBe('');
  });

  it('çok hocalı ders yalnız 1den fazlasında', () => {
    expect(cokEgitmenli({ professors: ['A', 'B'] })).toBe(true);
    expect(cokEgitmenli({ professors: ['A'] })).toBe(false);
    expect(cokEgitmenli({ professor: 'A' })).toBe(false);
    expect(cokEgitmenli({})).toBe(false);
  });

  it('hocasız ders', () => {
    expect(egitmensizMi({})).toBe(true);
    expect(egitmensizMi({ professors: ['A'] })).toBe(false);
  });
});

describe('dersEgitmeniMi — "kendi dersim mi"', () => {
  const bitirme = { professors: ['Prof. Dr. Ayşe YILMAZ', 'Dr. Öğr. Üyesi Taha ETEM'] };

  it('listedeki her hoca dersin sahibidir', () => {
    expect(dersEgitmeniMi(bitirme, 'Prof. Dr. Ayşe YILMAZ')).toBe(true);
    expect(dersEgitmeniMi(bitirme, 'Dr. Öğr. Üyesi Taha ETEM')).toBe(true);
  });

  it('unvan farkı kişiyi değiştirmez', () => {
    expect(dersEgitmeniMi(bitirme, 'Ayşe Yılmaz')).toBe(true);
    expect(dersEgitmeniMi({ professor: 'Taha ETEM' }, 'Dr. Öğr. Üyesi Taha Etem')).toBe(true);
  });

  it('başkası sahibi değildir', () => {
    expect(dersEgitmeniMi(bitirme, 'Mehmet Demir')).toBe(false);
  });

  it('hocasız derste false — "kısıt yok" kararı çağırana ait', () => {
    expect(dersEgitmeniMi({}, 'Ayşe Yılmaz')).toBe(false);
    expect(dersEgitmeniMi(bitirme, '')).toBe(false);
  });
});

describe('ayniEgitmen', () => {
  it('unvan ve kasa yok sayılır', () => {
    expect(ayniEgitmen('Prof. Dr. AYŞE YILMAZ', 'ayşe yılmaz')).toBe(true);
    // Türkçe kasa: I/İ düz toLowerCase ile bozulur, burada bozulmamalı
    expect(ayniEgitmen('IŞIK DEMİR', 'Işık Demir')).toBe(true);
  });

  it('farklı kişiler ayrılır', () => {
    expect(ayniEgitmen('Ayşe Yılmaz', 'Ayşe Yılmazer')).toBe(false);
  });

  it('iki boş ad aynı sayılır (hocası girilmemiş iki kayıt)', () => {
    expect(ayniEgitmen('', '')).toBe(true);
    expect(ayniEgitmen('A', '')).toBe(false);
  });
});

describe('egitmenAlanlari — kayda yazılan biçim', () => {
  it('birinci hoca eski alana da yazılır', () => {
    expect(egitmenAlanlari(['A', 'B'])).toEqual({ professor: 'A', professors: ['A', 'B'] });
  });

  it('tek hocada eski davranış aynen korunur', () => {
    expect(egitmenAlanlari(['Tek'])).toEqual({ professor: 'Tek', professors: ['Tek'] });
  });

  it('liste boşalınca iki alan da boşalır', () => {
    expect(egitmenAlanlari([])).toEqual({ professor: '', professors: [] });
  });
});

describe('slotEgitmeniSec — slota koyarken "hangi hoca?"', () => {
  const bitirme = { professors: ['Ayşe Yılmaz', 'Taha Etem', 'Mehmet Demir'] };

  it('çok hocalı derste seçim ZORUNLUDUR', () => {
    expect(slotEgitmeniSec(bitirme, '')).toEqual({
      ok: false,
      egitmen: '',
      sebep: 'secim-gerekli',
    });
  });

  it('seçilen hoca kayıttaki yazımıyla döner', () => {
    expect(slotEgitmeniSec(bitirme, 'ayşe yılmaz')).toEqual({ ok: true, egitmen: 'Ayşe Yılmaz' });
  });

  it('listede olmayan hoca kabul edilmez', () => {
    expect(slotEgitmeniSec(bitirme, 'Başka Biri').ok).toBe(false);
    expect(slotEgitmeniSec(bitirme, 'Başka Biri').sebep).toBe('listede-yok');
  });

  it('tek hocalı derste soru sorulmaz', () => {
    expect(slotEgitmeniSec({ professor: 'Tek Hoca' }, '')).toEqual({
      ok: true,
      egitmen: 'Tek Hoca',
    });
  });

  it('hocasız derste boş geçer — eski davranış', () => {
    expect(slotEgitmeniSec({}, '')).toEqual({ ok: true, egitmen: '' });
  });
});
