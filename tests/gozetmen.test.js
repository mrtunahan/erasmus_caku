import { describe, it, expect } from 'vitest';
import {
  bolumGozetmeniMi,
  gozetmenBolumListesi,
  gozetmenlikYamasi,
  hocaKuraliOku,
  sayiKuraliOku,
  salonSayisi,
  gerekenGozetmenSayisi,
  sayiKuraliOrnekleri,
  adAnahtari,
  gozetmenAta,
  uyariMetni,
  bolumKaydiniBul,
} from '../lib/gozetmen.js';

const BOLUMLER = [
  { id: 'bilgisayar', kimlikler: ['bilgisayar', '65f0aaaaaaaaaaaaaaaaaaaa'] },
  { id: 'makine', kimlikler: ['makine'] },
];

describe('bolumGozetmeniMi', () => {
  it('açık liste: yalnız listedeki bölümde gözetmen (kimlik biçimi fark etmez)', () => {
    const p = { departmentId: 'makine', gozetmenBolumleri: ['65f0aaaaaaaaaaaaaaaaaaaa'] };
    expect(bolumGozetmeniMi(p, 'bilgisayar', BOLUMLER)).toBe(true);
    // Ana bölümü makine ama orada gözetmen yapılmadı
    expect(bolumGozetmeniMi(p, 'makine', BOLUMLER)).toBe(false);
  });

  it('boş açık liste: hiçbir bölümde gözetmen değil (roles kalıntısı sayılmaz)', () => {
    const p = { departmentId: 'makine', roles: ['gozetmen'], gozetmenBolumleri: [] };
    expect(bolumGozetmeniMi(p, 'makine', BOLUMLER)).toBe(false);
  });

  it('eski kayıt: roles gozetmen → ana ve ek bölümlerinde gözetmen', () => {
    const p = {
      departmentId: 'makine',
      additionalDepartments: ['bilgisayar'],
      roles: ['gozetmen'],
    };
    expect(bolumGozetmeniMi(p, 'makine', BOLUMLER)).toBe(true);
    expect(bolumGozetmeniMi(p, 'bilgisayar', BOLUMLER)).toBe(true);
  });

  it('eski kayıt, rol yok → gözetmen değil; memur hiç sayılmaz', () => {
    expect(bolumGozetmeniMi({ departmentId: 'makine' }, 'makine', BOLUMLER)).toBe(false);
    const memur = { departmentId: 'makine', isMemur: true, gozetmenBolumleri: ['makine'] };
    expect(bolumGozetmeniMi(memur, 'makine', BOLUMLER)).toBe(false);
  });
});

describe('gozetmenlikYamasi', () => {
  it('eski kaydı açık listeye taşır, mevcut bölümleri korur', () => {
    const p = { departmentId: 'makine', roles: ['gozetmen', 'x'] };
    const y = gozetmenlikYamasi(p, 'bilgisayar', true, BOLUMLER);
    expect(y.gozetmenBolumleri).toEqual(['makine', 'bilgisayar']);
    expect(y.roles).toEqual(['x', 'gozetmen']);
  });

  it('başka bölümden akademisyen eklenir; ana bölümüne dokunulmaz', () => {
    const p = { departmentId: 'makine' };
    const y = gozetmenlikYamasi(p, 'bilgisayar', true, BOLUMLER);
    expect(y.gozetmenBolumleri).toEqual(['bilgisayar']);
    expect(bolumGozetmeniMi({ ...p, ...y }, 'makine', BOLUMLER)).toBe(false);
  });

  it('çıkarma: kimliğin tüm biçimleri silinir, son bölümde rol de kalkar', () => {
    const p = { gozetmenBolumleri: ['65f0aaaaaaaaaaaaaaaaaaaa'], roles: ['gozetmen'] };
    const y = gozetmenlikYamasi(p, 'bilgisayar', false, BOLUMLER);
    expect(y.gozetmenBolumleri).toEqual([]);
    expect(y.roles).toEqual([]);
  });

  it('aynı bölüm iki kez eklenmez', () => {
    const p = { gozetmenBolumleri: ['bilgisayar'] };
    expect(gozetmenlikYamasi(p, 'bilgisayar', true, BOLUMLER).gozetmenBolumleri).toEqual([
      'bilgisayar',
    ]);
    expect(gozetmenBolumListesi({})).toEqual([]);
  });
});

describe('sayı kuralı', () => {
  it('bilinmeyen hoca kuralı varsayılana düşer', () => {
    expect(hocaKuraliOku('zorunlu')).toBe('zorunlu');
    expect(hocaKuraliOku('saçma')).toBe('tercihli');
  });

  it('eksik/bozuk alanlar varsayılan, sınırlar kırpılır', () => {
    expect(sayiKuraliOku(null)).toEqual({
      salonBasina: 1,
      kalabalikEsik: 30,
      kalabalikEk: 1,
      enAz: 1,
      enCok: 0,
    });
    expect(sayiKuraliOku({ salonBasina: 0, enAz: 3, enCok: 2 })).toMatchObject({
      salonBasina: 1,
      enAz: 3,
      enCok: 3,
    });
  });

  it('salon sayısı: ayraçlı metin, boş ve TBD', () => {
    expect(salonSayisi('M101 - M102 - M103')).toBe(3);
    expect(salonSayisi('')).toBe(1);
    expect(salonSayisi('TBD')).toBe(1);
  });

  it('varsayılan: tek salonda eşik altı 1, eşikte 2', () => {
    expect(gerekenGozetmenSayisi(1, 29)).toBe(1);
    expect(gerekenGozetmenSayisi(1, 30)).toBe(2);
  });

  it('salon başına hesaplanır: 2 salon 3, 3 salon 3 gibi tutarsızlık yok', () => {
    expect(gerekenGozetmenSayisi(2, 40)).toBe(2); // salon başı 20 öğrenci
    expect(gerekenGozetmenSayisi(2, 60)).toBe(4); // salon başı 30 → kalabalık
    expect(gerekenGozetmenSayisi(3, 60)).toBe(3);
  });

  it('en az / en çok sınırı ve kalabalık eki kapalı', () => {
    expect(gerekenGozetmenSayisi(1, 5, { enAz: 2 })).toBe(2);
    expect(gerekenGozetmenSayisi(4, 200, { enCok: 5 })).toBe(5);
    expect(gerekenGozetmenSayisi(1, 500, { kalabalikEsik: 0 })).toBe(1);
  });

  it('örnek tablo kuralı yansıtır', () => {
    const o = sayiKuraliOrnekleri({ salonBasina: 2, kalabalikEk: 0 });
    expect(o.every((x) => x.gozetmen === x.salon * 2)).toBe(true);
  });
});

describe('adAnahtari', () => {
  it('unvanlar atılır, Türkçe küçük harf', () => {
    expect(adAnahtari('Dr. Öğr. Üyesi Esma Baran ÖZKAN')).toBe('esma baran özkan');
    expect(adAnahtari('Prof.Dr. Hamit ALYAR')).toBe('hamit alyar');
    expect(adAnahtari('Doç. Dr.  Ali  Veli')).toBe('ali veli');
    expect(adAnahtari('Öğr. Gör. Ayşe Kaya')).toBe('ayşe kaya');
  });
});

const sinav = (ek) => ({
  id: 'S' + Math.random().toString(36).slice(2, 7),
  code: 'BIL101',
  date: '2026-06-01',
  timeSlot: '09:00',
  duration: 60,
  studentCount: 20,
  professor: 'Dr. Ali Veli',
  ...ek,
});
const tekSalon = () => 'M101';

describe('gozetmenAta', () => {
  it('tercihli: hoca havuzdaysa ilk sırada (unvan farkına rağmen)', () => {
    const e = sinav({ studentCount: 35 });
    const { atamalar, uyarilar } = gozetmenAta(['Ali Veli', 'Can Demir'], [e], {
      salonBul: tekSalon,
    });
    expect(atamalar[e.id]).toEqual(['Ali Veli', 'Can Demir']);
    expect(uyarilar).toEqual([]);
  });

  it('zorunlu: hoca havuzda değilse de kendi adıyla atanır', () => {
    const e = sinav();
    const { atamalar } = gozetmenAta(['Can Demir'], [e], {
      salonBul: tekSalon,
      hocaKurali: 'zorunlu',
    });
    expect(atamalar[e.id]).toEqual(['Dr. Ali Veli']);
  });

  it('zorunlu: hoca o gün müsait değilse başkası atanır ve UYARI verilir', () => {
    const e = sinav();
    const { atamalar, uyarilar } = gozetmenAta(['Ali Veli', 'Can Demir'], [e], {
      salonBul: tekSalon,
      hocaKurali: 'zorunlu',
      musaitsizlik: { 'Ali Veli': ['2026-06-01'] },
    });
    expect(atamalar[e.id]).toEqual(['Can Demir']);
    expect(uyarilar.map((u) => u.tur)).toEqual(['hoca_musait_degil']);
  });

  it('tercihli: hoca müsait değilse sessizce başkası', () => {
    const e = sinav();
    const { atamalar, uyarilar } = gozetmenAta(['Ali Veli', 'Can Demir'], [e], {
      salonBul: tekSalon,
      musaitsizlik: { 'Ali Veli': ['2026-06-01'] },
    });
    expect(atamalar[e.id]).toEqual(['Can Demir']);
    expect(uyarilar).toEqual([]);
  });

  it('hariç: hoca kendi sınavına atanmaz', () => {
    const e = sinav();
    const { atamalar } = gozetmenAta(['Ali Veli', 'Can Demir'], [e], {
      salonBul: tekSalon,
      hocaKurali: 'haric',
    });
    expect(atamalar[e.id]).toEqual(['Can Demir']);
  });

  it('aynı saatte iki sınav: kişi ikisine atanmaz; yetmezse uyarı', () => {
    const a = sinav({ code: 'A', professor: '' });
    const b = sinav({ code: 'B', professor: '' });
    const { atamalar, uyarilar } = gozetmenAta(['Can Demir'], [a, b], { salonBul: tekSalon });
    expect(atamalar[a.id]).toEqual(['Can Demir']);
    expect(atamalar[b.id]).toEqual([]);
    expect(uyarilar.map((u) => u.tur)).toEqual(['eksik']);
  });

  it('elle salon esas alınır (gözetmen sayısı ona göre)', () => {
    const e = sinav({ room: 'M101 - M102', professor: '', studentCount: 20 });
    const { atamalar } = gozetmenAta(['A', 'B', 'C'], [e], { salonBul: tekSalon });
    expect(atamalar[e.id]).toHaveLength(2);
  });

  it('elle gözetmen korunur ve yüke/saate işlenir', () => {
    const a = sinav({ code: 'A', supervisor: 'B, C', professor: '' });
    const b = sinav({ code: 'B', professor: '' });
    const { atamalar } = gozetmenAta(['B', 'C', 'D'], [a, b], { salonBul: tekSalon });
    expect(atamalar[a.id]).toEqual(['B', 'C']);
    expect(atamalar[b.id]).toEqual(['D']);
  });

  it('yük dengesi: en az dakikası olan seçilir, sonuç tekrar üretilebilir', () => {
    const l = [
      sinav({ id: 'x1', timeSlot: '09:00', duration: 120, professor: '' }),
      sinav({ id: 'x2', timeSlot: '13:00', professor: '' }),
    ];
    const r1 = gozetmenAta(['A', 'B'], l, { salonBul: tekSalon });
    const r2 = gozetmenAta(['A', 'B'], l, { salonBul: tekSalon });
    expect(r1.atamalar).toEqual({ x1: ['A'], x2: ['B'] });
    expect(r2.atamalar).toEqual(r1.atamalar);
  });

  it('havuz boşsa tek genel uyarı', () => {
    const { uyarilar } = gozetmenAta([], [sinav(), sinav()], { salonBul: tekSalon });
    expect(uyarilar.map((u) => u.tur)).toEqual(['havuz_bos']);
    expect(uyariMetni(uyarilar)).toMatch(/tanımlı gözetmen yok/);
  });
});

describe('bolumKaydiniBul', () => {
  const l = [
    {
      id: '65f0bbbbbbbbbbbbbbbbbbbb',
      name: 'Bilgisayar',
      kimlikler: ['65f0bbbbbbbbbbbbbbbbbbbb', 'bil'],
    },
    { id: 'bilgisayar', name: 'Bilgisayar', kimlikler: ['bilgisayar'], gozetmenKurali: 'zorunlu' },
  ];
  it('aynı adlı kayıtlar arasında KİMLİĞİ tutanı seçer', () => {
    expect(bolumKaydiniBul(l, 'bilgisayar').gozetmenKurali).toBe('zorunlu');
  });
  it('eski kimlik biçimiyle de bulur; yoksa null', () => {
    expect(bolumKaydiniBul(l, 'bil').id).toBe('65f0bbbbbbbbbbbbbbbbbbbb');
    expect(bolumKaydiniBul(l, 'yok')).toBe(null);
    expect(bolumKaydiniBul(null, 'x')).toBe(null);
  });
});
