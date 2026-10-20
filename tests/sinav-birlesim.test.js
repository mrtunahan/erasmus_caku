import { describe, it, expect } from 'vitest';
import {
  ciktiSatirlariniBirlestir,
  dersAdiKoku,
  kodAnahtari,
  birlesimIliskisi,
  ayniSinifMi,
  zamanOrtusur,
  oturumlar,
  grupUyeleri,
  oturumOzeti,
  oturumSalonlari,
  yerlestirmeSecenekleri,
  birlesimdenCikarYamalari,
  yeniBirlesimId,
} from '../lib/sinav-birlesim.js';
import { gozetmenAta } from '../lib/gozetmen.js';
import { cakismalariBul } from '../lib/sinav-cakisma.js';

const s = (ek) => ({
  date: '2026-06-02',
  timeSlot: '10:00',
  duration: 60,
  sinif: 1,
  studentCount: 20,
  ...ek,
});

describe('ders ilişkisi', () => {
  it('şube ekleri adın kökünden atılır', () => {
    expect(dersAdiKoku('Fizik I (Şube 2)')).toBe('fizik ı');
    expect(dersAdiKoku('Doğrusal Cebir (Şube 1-2)')).toBe('doğrusal cebir');
    expect(dersAdiKoku('Matematik I - Gr. 3')).toBe('matematik ı');
    expect(dersAdiKoku('Programlama Ş2')).toBe('programlama');
    expect(kodAnahtari(' fzk 181 ')).toBe('FZK181');
  });

  it('aynı kod → şube; aynı ad farklı kod → müfredat; diğerleri farklı', () => {
    expect(
      birlesimIliskisi(
        { code: 'FZK181', name: 'Fizik I (Şube 1)' },
        { code: 'FZK181', name: 'Fizik I (Şube 2)' }
      )
    ).toBe('sube');
    expect(
      birlesimIliskisi(
        { code: 'MAT101', name: 'Matematik I' },
        { code: 'MAT111', name: 'Matematik I' }
      )
    ).toBe('mufredat');
    expect(
      birlesimIliskisi({ code: 'BIL101', name: 'Programlama' }, { code: 'FZK181', name: 'Fizik' })
    ).toBe('farkli');
  });

  it('aynı sınıf: seçmeli (5) hariç', () => {
    expect(ayniSinifMi({ sinif: 1 }, { sinif: 1 })).toBe(true);
    expect(ayniSinifMi({ sinif: 1 }, { sinif: 2 })).toBe(false);
    expect(ayniSinifMi({ sinif: 5 }, { sinif: 5 })).toBe(false);
  });

  it('zaman örtüşmesi süreye bakar', () => {
    expect(zamanOrtusur(s({ timeSlot: '10:00', duration: 90 }), s({ timeSlot: '11:00' }))).toBe(
      true
    );
    expect(zamanOrtusur(s({ timeSlot: '10:00' }), s({ timeSlot: '11:00' }))).toBe(false);
    expect(zamanOrtusur(s(), s({ date: '2026-06-03' }))).toBe(false);
  });
});

describe('oturumlar', () => {
  const l = [
    s({ id: 'a', code: 'FZK181', professor: 'Dr. A', studentCount: 40, birlesimId: 'B1' }),
    s({
      id: 'b',
      code: 'FZK181',
      professor: 'Dr. B',
      studentCount: 25,
      birlesimId: 'B1',
      duration: 90,
    }),
    s({ id: 'c', code: 'BIL101', professor: 'Dr. C' }),
  ];

  it('birleşik sınavlar tek oturum, diğerleri tek başına', () => {
    const o = oturumlar(l);
    expect(o.map((x) => x.anahtar)).toEqual(['B:B1', 'c']);
    expect(grupUyeleri(l[0], l).map((x) => x.id)).toEqual(['a', 'b']);
    expect(grupUyeleri(l[2], l).map((x) => x.id)).toEqual(['c']);
  });

  it('özet: toplam öğrenci, bütün hocalar, en uzun süre', () => {
    const o = oturumOzeti(grupUyeleri(l[0], l));
    expect(o).toMatchObject({
      kodlar: ['FZK181'],
      hocalar: ['Dr. A', 'Dr. B'],
      toplamOgrenci: 65,
      sure: 90,
      timeSlot: '10:00',
    });
  });

  it('salon oturumun TOPLAM öğrencisine göre bir kez seçilir; elle salon herkese', () => {
    const bul = (n) => (n > 50 ? 'M101 - M102' : 'M101');
    expect(oturumSalonlari(l, bul)).toEqual({ a: 'M101 - M102', b: 'M101 - M102', c: 'M101' });
    const elle = l.map((x) => (x.id === 'b' ? { ...x, room: 'AMFİ' } : x));
    expect(oturumSalonlari(elle, bul)).toMatchObject({ a: 'AMFİ', b: 'AMFİ' });
  });
});

describe('salonlar aynı saatte çakışmaz', () => {
  const SALONLAR = ['M101', 'M102', 'M103'];
  const bul = (n, dolu) => SALONLAR.find((x) => !(dolu || []).includes(x)) || 'TBD';

  it('aynı saatteki iki ayrı sınav farklı salon alır; başka saatte salon yeniden kullanılır', () => {
    const l = [
      s({ id: 'a', code: 'MAT101' }),
      s({ id: 'b', code: 'MAT111', sinif: 2 }),
      s({ id: 'c', code: 'KIM101', timeSlot: '14:00' }),
    ];
    expect(oturumSalonlari(l, bul)).toEqual({ a: 'M101', b: 'M102', c: 'M101' });
  });

  it('elle salon önce yerleşir ve otomatik seçimde dolu sayılır', () => {
    const l = [s({ id: 'a', code: 'A' }), s({ id: 'b', code: 'B', sinif: 2, room: 'M101' })];
    expect(oturumSalonlari(l, bul)).toEqual({ a: 'M102', b: 'M101' });
  });

  it('boş salon kalmazsa TBD', () => {
    const l = ['a', 'b', 'c', 'd'].map((id, i) => s({ id, code: id, sinif: i + 1 }));
    expect(oturumSalonlari(l, bul).d).toBe('TBD');
  });
});

describe('yerleştirme seçenekleri', () => {
  const mevcut = [
    s({ id: 'x', courseId: 'k1', code: 'FZK181', name: 'Fizik I (Şube 1)', sinif: 1 }),
    s({ id: 'y', code: 'KIM101', name: 'Kimya', sinif: 2 }),
    s({ id: 'z', code: 'BIL999', name: 'Başka Gün', date: '2026-06-09' }),
  ];

  it('boş saatte seçenek yok, ayrı eklenebilir', () => {
    const r = yerlestirmeSecenekleri({ code: 'A', sinif: 1 }, '2026-06-02', '14:00', mevcut);
    expect(r.oturumlar).toEqual([]);
    expect(r.ayriEklenebilir).toBe(true);
  });

  it('aynı sınıfın farklı şubesi: birleştirme önerilir, ayrı eklenemez', () => {
    const r = yerlestirmeSecenekleri(
      { id: 'k2', code: 'FZK181', name: 'Fizik I (Şube 2)', sinif: 1, duration: 60 },
      '2026-06-02',
      '10:00',
      mevcut
    );
    expect(r.oturumlar.map((o) => [o.anahtar, o.iliski, o.ayniSinif])).toEqual([
      ['x', 'sube', true],
      ['y', 'farkli', false],
    ]);
    expect(r.ayriEklenebilir).toBe(false);
    expect(r.engel).toMatch(/1\. sınıfın öğrencileri/);
  });

  it('farklı sınıftan aynı ad farklı kod: müfredat; ayrı da eklenebilir', () => {
    const r = yerlestirmeSecenekleri(
      { code: 'KIM111', name: 'Kimya', sinif: 3, duration: 60 },
      '2026-06-02',
      '10:30',
      mevcut
    );
    expect(r.oturumlar[0]).toMatchObject({ anahtar: 'y', iliski: 'mufredat', ayniSinif: false });
    expect(r.ayriEklenebilir).toBe(true);
  });

  it('aynı ders kaydı oturumda zaten varsa işaretlenir', () => {
    const r = yerlestirmeSecenekleri(
      { id: 'k1', code: 'FZK181', name: 'Fizik I (Şube 1)', sinif: 1 },
      '2026-06-02',
      '10:00',
      mevcut
    );
    expect(r.oturumlar[0].zatenVar).toBe(true);
  });

  it('oturumun bir üyesi örtüşüyorsa bütün oturum listelenir', () => {
    const l = [
      s({ id: 'p', code: 'A', birlesimId: 'B9', timeSlot: '10:00' }),
      s({ id: 'q', code: 'B', birlesimId: 'B9', timeSlot: '10:00', duration: 120 }),
    ];
    const r = yerlestirmeSecenekleri({ code: 'C', sinif: 4 }, '2026-06-02', '11:30', l);
    expect(r.oturumlar).toHaveLength(1);
    expect(r.oturumlar[0].uyeler.map((u) => u.id)).toEqual(['p', 'q']);
  });
});

describe('birleşimden çıkarma', () => {
  it('iki kişilik oturumda ikisinin de bağı kopar; üç kişilikte yalnız çıkanın', () => {
    const iki = [s({ id: 'a', birlesimId: 'B' }), s({ id: 'b', birlesimId: 'B' })];
    expect(birlesimdenCikarYamalari(iki[0], iki)).toEqual([
      { id: 'a', birlesimId: '' },
      { id: 'b', birlesimId: '' },
    ]);
    const uc = [...iki, s({ id: 'c', birlesimId: 'B' })];
    expect(birlesimdenCikarYamalari(uc[0], uc)).toEqual([{ id: 'a', birlesimId: '' }]);
    expect(birlesimdenCikarYamalari(s({ id: 'x' }), [])).toEqual([]);
  });

  it('kimlik üretimi benzersiz', () => {
    expect(yeniBirlesimId()).not.toBe(yeniBirlesimId());
  });
});

describe('ortak oturumda gözetmen ataması', () => {
  const tekSalon = (n) => (n > 40 ? 'M101 - M102' : 'M101');

  it('oturum tek birim: toplam öğrenciye göre sayı, herkese aynı liste', () => {
    const l = [
      s({ id: 'a', code: 'FZK181', professor: 'Dr. X', studentCount: 30, birlesimId: 'B1' }),
      s({ id: 'b', code: 'FZK181', professor: 'Dr. Y', studentCount: 30, birlesimId: 'B1' }),
    ];
    const { atamalar, uyarilar } = gozetmenAta(['G1', 'G2', 'G3', 'G4'], l, { salonBul: tekSalon });
    // 60 öğrenci, 2 salon (salon başı 30 → kalabalık): 2 × 2 = 4
    expect(atamalar.a).toHaveLength(4);
    expect(atamalar.b).toEqual(atamalar.a);
    expect(uyarilar).toEqual([]);
  });

  it('zorunlu kural: iki şubenin iki hocası da oturuma yazılır', () => {
    const l = [
      s({ id: 'a', code: 'FZK181', professor: 'Dr. X', studentCount: 10, birlesimId: 'B1' }),
      s({ id: 'b', code: 'FZK181', professor: 'Dr. Y', studentCount: 10, birlesimId: 'B1' }),
    ];
    const { atamalar } = gozetmenAta(['G1'], l, { salonBul: tekSalon, hocaKurali: 'zorunlu' });
    expect(atamalar.a).toEqual(['Dr. X', 'Dr. Y']);
  });

  it('tercihli: hocalar kontenjanı aşmaz', () => {
    const l = [
      s({ id: 'a', professor: 'X', studentCount: 5, birlesimId: 'B1' }),
      s({ id: 'b', professor: 'Y', studentCount: 5, birlesimId: 'B1' }),
    ];
    const { atamalar } = gozetmenAta(['X', 'Y'], l, { salonBul: tekSalon });
    expect(atamalar.a).toEqual(['X']);
  });

  it('uzun sınavdaki gözetmen örtüşen başka saate atanmaz', () => {
    const l = [
      s({ id: 'a', timeSlot: '10:00', duration: 90, professor: '' }),
      s({ id: 'b', timeSlot: '10:30', professor: '', sinif: 2 }),
    ];
    const { atamalar, uyarilar } = gozetmenAta(['G1'], l, { salonBul: tekSalon });
    expect(atamalar.a).toEqual(['G1']);
    expect(atamalar.b).toEqual([]);
    expect(uyarilar.map((u) => u.tur)).toEqual(['eksik']);
  });
});

describe('ortak oturumda çakışma denetimi', () => {
  it('aynı oturumun şubeleri birbiriyle çakışmaz', () => {
    const l = [
      s({
        id: 'a',
        code: 'FZK181',
        room: 'M101',
        supervisor: 'G1',
        departmentId: 'bil',
        birlesimId: 'B1',
      }),
      s({
        id: 'b',
        code: 'FZK181',
        room: 'M101',
        supervisor: 'G1',
        departmentId: 'bil',
        birlesimId: 'B1',
      }),
    ];
    expect(cakismalariBul(l)).toEqual([]);
  });

  it('birleştirilmemiş aynı sınıf hâlâ engel', () => {
    const l = [
      s({ id: 'a', code: 'FZK181', departmentId: 'bil' }),
      s({ id: 'b', code: 'MAT101', departmentId: 'bil' }),
    ];
    expect(cakismalariBul(l).map((c) => [c.tur, c.seviye])).toEqual([['sinif', 'engel']]);
  });

  it('oturum başka sınavla aynı salonda: tek uyarı, oturumun toplam öğrencisiyle', () => {
    const l = [
      s({
        id: 'a',
        code: 'FZK181',
        room: 'M101',
        studentCount: 20,
        departmentId: 'bil',
        birlesimId: 'B1',
      }),
      s({
        id: 'b',
        code: 'FZK181',
        room: 'M101',
        studentCount: 20,
        departmentId: 'bil',
        birlesimId: 'B1',
      }),
      s({ id: 'c', code: 'KIM101', room: 'M101', studentCount: 5, sinif: 2, departmentId: 'mak' }),
    ];
    const c = cakismalariBul(l, { salonKapasiteleri: { M101: 42 } });
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ tur: 'salon', seviye: 'engel' }); // 40 + 5 > 42
    expect(c[0].aciklama).toMatch(/FZK181 \(40 öğrenci\)/);
  });
});

// ── Çıktı: aynı dersin müfredat karşılıkları tek satır ──

describe('ciktiSatirlariniBirlestir', () => {
  const ad = 'İnovasyon, Patent ve Teknoloji Ticarileşme';
  const ortak = { date: '2026-06-02', timeSlot: '10:00', duration: 60, durationStr: '60 dk' };

  it('aynı oturumdaki iki müfredat kodu tek satır olur', () => {
    const satirlar = [
      {
        ...ortak,
        id: 'a',
        name: ad,
        code: 'BIL345',
        birlesimId: 'B1',
        studentCount: 20,
        assignedRoom: 'D1',
        assignedSupervisors: 'Dr. A',
        sinif: 3,
        endStr: 'x',
      },
      {
        ...ortak,
        id: 'b',
        name: ad,
        code: 'BLM445',
        birlesimId: 'B1',
        studentCount: 15,
        assignedRoom: 'D1',
        assignedSupervisors: 'Dr. A, Dr. B',
        sinif: 4,
        endStr: 'x',
      },
    ];
    const out = ciktiSatirlariniBirlestir(satirlar);
    expect(out).toHaveLength(1);
    expect(out[0].code).toBe('BIL345 / BLM445');
    expect(out[0].studentCount).toBe(35);
    expect(out[0].assignedRoom).toBe('D1');
    expect(out[0].assignedSupervisors).toBe('Dr. A, Dr. B');
    expect(out[0].siniflar).toEqual([3, 4]);
  });

  it('birleştirilmemiş ama aynı salondaysa da tek satır', () => {
    const out = ciktiSatirlariniBirlestir([
      { ...ortak, name: ad, code: 'BIL345', assignedRoom: 'D1' },
      { ...ortak, name: ad, code: 'BLM445', assignedRoom: 'D1' },
    ]);
    expect(out).toHaveLength(1);
  });

  it('farklı salondaki aynı adlı sınavlar ayrı kalır', () => {
    const out = ciktiSatirlariniBirlestir([
      { ...ortak, name: ad, code: 'BIL345', assignedRoom: 'D1' },
      { ...ortak, name: ad, code: 'BLM445', assignedRoom: 'D2' },
    ]);
    expect(out).toHaveLength(2);
  });

  it('aynı kodlu şubeler ayrı satır kalır, sıra bozulmaz', () => {
    const out = ciktiSatirlariniBirlestir([
      { ...ortak, name: 'Fizik I (Şube 1)', code: 'FZK181', birlesimId: 'B2' },
      { ...ortak, name: 'Kimya', code: 'KIM101', timeSlot: '13:00' },
      { ...ortak, name: 'Fizik I (Şube 2)', code: 'FZK181', birlesimId: 'B2' },
    ]);
    expect(out.map((s) => s.code)).toEqual(['FZK181', 'KIM101', 'FZK181']);
  });

  it('farklı saatteki aynı ders birleşmez; uzun süren sınavın bitişi alınır', () => {
    const out = ciktiSatirlariniBirlestir([
      { ...ortak, name: ad, code: 'BIL345', birlesimId: 'B3', duration: 60, endStr: '11:00' },
      {
        ...ortak,
        name: ad,
        code: 'BLM445',
        birlesimId: 'B3',
        duration: 90,
        endStr: '11:30',
        durationStr: '90 dk',
      },
      { ...ortak, name: ad, code: 'BIL345', timeSlot: '15:00' },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].endStr).toBe('11:30');
    expect(out[0].durationStr).toBe('90 dk');
  });
});

describe('aynı öğretim elemanı: ayrı eklenemez, birleştirilir', () => {
  const K = 'Dr. Öğr. Üyesi Celalettin KAYA';
  const mevcut = [
    {
      id: 'e1',
      code: 'MAT221',
      name: 'Lineer Cebir',
      sinif: 2,
      professor: K,
      date: '2026-11-10',
      timeSlot: '08:30',
      duration: 60,
    },
  ];
  it('farklı sınıf, farklı ders ama aynı hoca → ayrı eklenemez', () => {
    const k = yerlestirmeSecenekleri(
      {
        id: 'c2',
        code: 'MAT241',
        name: 'Diferansiyel',
        sinif: 1,
        professor: 'DR. ÖĞR. ÜYESİ CELALETTİN KAYA',
      },
      '2026-11-10',
      '08:30',
      mevcut
    );
    expect(k.ayriEklenebilir).toBe(false);
    expect(k.oturumlar[0].ayniHoca).toBe('DR. ÖĞR. ÜYESİ CELALETTİN KAYA');
    expect(k.engel).toMatch(/öğretim elemanı iki sınavda birden bulunamaz/);
  });
  it('başka hoca ve başka sınıf → ayrı eklenebilir', () => {
    const k = yerlestirmeSecenekleri(
      { id: 'c3', code: 'FIZ101', name: 'Fizik', sinif: 1, professor: 'Dr. Başka HOCA' },
      '2026-11-10',
      '08:30',
      mevcut
    );
    expect(k.ayriEklenebilir).toBe(true);
    expect(k.oturumlar[0].ayniHoca).toBe('');
  });
});
