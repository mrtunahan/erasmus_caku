import { describe, it, expect } from 'vitest';
import {
  SAAT_DILIMLERI,
  sinavAdi,
  donemGrubu,
  donemGruplari,
  kisaltmaUret,
  kisaltmaHaritasi,
  kisaAdUret,
  bolumBilgileri,
  kodSatiri,
  fakulteOturumlari,
  kisaltmaListesi,
  gunTablosu,
  sinavGunleri,
  fakulteKitabi,
  gonderimKimligi,
  programImzasi,
  gonderimDurumu,
  HOCA_ETIKETI,
  ORTAK_RENK,
} from '../lib/sinav-fakulte.js';

const SALONLAR = [
  { name: 'M10Z04', capacity: 25 },
  { name: 'M10Z07', capacity: 80 },
  { name: 'M11101', capacity: 42 },
  { name: 'M11103', capacity: 58 },
];
const BOLUMLER = [
  { id: 'bilgisayar', name: 'Bilgisayar Mühendisliği', shortName: 'Bilgisayar' },
  { id: 'insaat', name: 'İnşaat Mühendisliği', shortName: 'İnşaat' },
  { id: 'makine', name: 'Makine Mühendisliği', shortName: 'Makine' },
];

describe('saat dilimleri ve dönem', () => {
  it('08:30–18:30 arası 20 dilim', () => {
    expect(SAAT_DILIMLERI).toHaveLength(20);
    expect(SAAT_DILIMLERI[0].etiket).toBe('08:30-09:00');
    expect(SAAT_DILIMLERI[19].etiket).toBe('18:00-18:30');
  });

  it('sınav adı ve dönem grubu', () => {
    expect(sinavAdi({ examType: 'final' })).toBe('Final');
    expect(sinavAdi({ label: 'Vize - 2025-2026 Güz' })).toBe('Vize');
    expect(donemGrubu({ examType: 'final', semester: '2025-2026 Bahar' })).toBe(
      donemGrubu({ examType: 'Final', semester: '2025-2026  bahar' })
    );
  });

  it('farklı bölümlerin aynı dönemi tek grupta', () => {
    const g = donemGruplari([
      {
        id: 'a',
        departmentId: 'bilgisayar',
        examType: 'final',
        semester: 'Bahar',
        label: 'Final - Bahar',
        startDate: '2026-06-08',
      },
      {
        id: 'b',
        departmentId: 'insaat',
        examType: 'final',
        semester: 'Bahar',
        label: 'Final - Bahar',
        startDate: '2026-06-08',
      },
      {
        id: 'c',
        departmentId: 'insaat',
        examType: 'vize',
        semester: 'Bahar',
        label: 'Vize - Bahar',
        startDate: '2026-04-06',
      },
    ]);
    expect(g).toHaveLength(2);
    expect(donemGrubu({ examType: 'final', semester: 'Bahar', seviye: 'yukseklisans' })).not.toBe(
      donemGrubu({ examType: 'final', semester: 'Bahar' })
    );
    expect(g[0].donemler.map((d) => d.id)).toEqual(['a', 'b']);
  });
});

describe('kısaltmalar', () => {
  it('unvan atılır, baş harfler alınır', () => {
    expect(kisaltmaUret('Arş. Gör. Mehmet Emin ÖZDEMİR')).toBe('MEÖ');
    expect(kisaltmaUret('Dr. Öğr. Üyesi Didar ÜÇÜNCÜOĞLU')).toBe('DÜ');
    expect(kisaltmaUret('Arş. Gör. Öznur Şifa AKÇAM')).toBe('ÖŞA');
  });

  it('çakışmada soyaddan harf eklenir, elle kısaltma esastır', () => {
    const h = kisaltmaHaritasi(
      ['Arş. Gör. Dr. Merve DURMAZ', 'Arş. Gör. Mehmet DEMİR', 'Arş. Gör. Eren YURDAKUL'],
      { 'Arş. Gör. Eren YURDAKUL': 'EYM' }
    );
    expect(h['Arş. Gör. Eren YURDAKUL']).toBe('EYM');
    expect(h['Arş. Gör. Mehmet DEMİR']).toBe('MD');
    expect(h['Arş. Gör. Dr. Merve DURMAZ']).toBe('MDU');
    expect(new Set(Object.values(h)).size).toBe(3);
  });

  it('bölüm kısa adı ve rengi', () => {
    expect(kisaAdUret('İnşaat')).toBe('İNŞ');
    const b = bolumBilgileri(BOLUMLER, { makine: { kisaAd: 'MAK', renk: '#abcdef' } });
    expect(b.insaat.kisaAd).toBe('İNŞ');
    expect(b.makine).toMatchObject({ kisaAd: 'MAK', renk: 'ABCDEF' });
    expect(b.bilgisayar.renk).toMatch(/^[0-9A-F]{6}$/);
  });
});

describe('oturum hücresi', () => {
  it('karşılıklar " / ", farklı dersler " - ", kısa derse süre notu', () => {
    const satir = kodSatiri(
      [
        { code: 'İNŞ222', name: 'Yapı Statiği', duration: 90 },
        { code: 'INS232', name: 'Yapı Statiği', duration: 90 },
        { code: 'İNŞ402', name: 'Zemin', duration: 30 },
        { code: 'GMÜ306', name: 'Fotogrametri', duration: 90 },
      ],
      90
    );
    expect(satir).toBe('İNŞ222 / INS232 - İNŞ402 (30dk) - GMÜ306');
  });

  it('ortak sınav: bölüm etiketi, sarı, hoca gözetmense etiket', () => {
    const [o] = fakulteOturumlari(
      [
        {
          id: '1',
          code: 'MAT162',
          name: 'Matematik II',
          date: '2026-06-08',
          timeSlot: '10:00',
          duration: 90,
          departmentId: 'insaat',
          birlesimId: 'B1',
          room: 'M11101 - M11103',
          supervisor: 'Arş. Gör. Mehmet Emin ÖZDEMİR, Prof. Dr. Ali VELİ',
          professor: 'Prof. Dr. Ali VELİ',
        },
        {
          id: '2',
          code: 'MAT164',
          name: 'Matematik II',
          date: '2026-06-08',
          timeSlot: '10:00',
          duration: 90,
          departmentId: 'makine',
          birlesimId: 'B1',
        },
      ],
      { bolumBilgisi: bolumBilgileri(BOLUMLER) }
    );
    expect(o.kodSatiri).toBe('MAT162 / MAT164');
    expect(o.bolumEtiketi).toBe('(İNŞ-MAK Ortak)');
    expect(o.renk).toBe(ORTAK_RENK);
    expect(o.salonlar).toEqual(['M11101', 'M11103']);
    expect(o.gozetmenSatiri).toBe('MEÖ - ' + HOCA_ETIKETI);
    expect(o.metin).toBe('MAT162 / MAT164\n(İNŞ-MAK Ortak)\nMEÖ - ' + HOCA_ETIKETI);
  });

  it('kısaltma listesi oturum başına sayar, hocayı saymaz', () => {
    const ot = fakulteOturumlari([
      {
        id: '1',
        code: 'A',
        date: '2026-06-08',
        timeSlot: '10:00',
        supervisor: 'X Y, Hoca Bir',
        professor: 'Hoca Bir',
        room: 'M10Z04 - M10Z07',
      },
      {
        id: '2',
        code: 'B',
        date: '2026-06-09',
        timeSlot: '10:00',
        supervisor: 'X Y',
        room: 'M10Z04',
      },
    ]);
    const l = kisaltmaListesi(ot, {});
    expect(l[0]).toEqual({ kisaltma: 'XY', ad: 'X Y', sayi: 2 });
    expect(l[l.length - 1].kisaltma).toBe('-');
    expect(l.find((x) => x.ad === 'Hoca Bir')).toBeUndefined();
  });
});

describe('gün tablosu', () => {
  const ot = (id, saat, sure, salon, ek) => ({
    id,
    code: id,
    date: '2026-06-08',
    timeSlot: saat,
    duration: sure,
    room: salon,
    departmentId: 'bilgisayar',
    ...(ek || {}),
  });

  it('süre boyunca dikey birleşir, çok salonlu sınav her sütunda', () => {
    const o = fakulteOturumlari([ot('BİL308', '13:30', 60, 'M10Z07 - M11103')]);
    const t = gunTablosu(o, SALONLAR);
    const satir = t.satirlar.findIndex((s) => s.etiket === '13:30-14:00');
    expect(t.satirlar[satir].hucreler[1]).toMatchObject({ metin: 'BİL308', satirSayisi: 2 });
    expect(t.satirlar[satir].hucreler[3]).toMatchObject({ metin: 'BİL308', satirSayisi: 2 });
    expect(t.satirlar[satir + 1].hucreler[1]).toEqual({ gizli: true });
    expect(t.satirlar[satir].hucreler[0]).toBeNull();
  });

  it('listede olmayan salon sona eklenir', () => {
    const t = gunTablosu(fakulteOturumlari([ot('X', '09:00', 30, 'LAB-9')]), SALONLAR);
    expect(t.salonlar[t.salonlar.length - 1].name).toBe('LAB-9');
  });

  it('aynı salonda örtüşen oturumlar tek hücre + çakışma', () => {
    const o = fakulteOturumlari([ot('A', '10:00', 60, 'M10Z04'), ot('B', '10:30', 60, 'M10Z04')]);
    const t = gunTablosu(o, SALONLAR);
    const i = t.satirlar.findIndex((s) => s.etiket === '10:00-10:30');
    expect(t.satirlar[i].hucreler[0].cakisma).toBe(true);
    expect(t.satirlar[i].hucreler[0].satirSayisi).toBe(3);
    expect(t.satirlar[i].hucreler[0].metin).toContain('ÇAKIŞMA');
  });

  it('günler: aradaki boş hafta içi günler dahil, hafta sonu hariç', () => {
    const g = sinavGunleri([{ date: '2026-06-12' }, { date: '2026-06-16' }]);
    expect(g.map((x) => x.kisa)).toEqual(['12.06', '15.06', '16.06']);
    expect(g[1].gun).toBe('Pazartesi');
  });

  it('kitap modeli', () => {
    const k = fakulteKitabi({
      sinavlar: [
        ot('A', '10:00', 60, 'M10Z04', { supervisor: 'Ayşe KARA' }),
        ot('B', '10:00', 60, ''),
      ],
      salonlar: SALONLAR,
      bolumler: BOLUMLER,
    });
    expect(k.gunler).toHaveLength(1);
    expect(k.gunler[0].salonsuz.map((x) => x.kodSatiri)).toEqual(['B']);
    expect(k.kisaltmalar['Ayşe KARA']).toBe('AK');
    const h = fakulteKitabi({
      sinavlar: [
        ot('C', '11:00', 60, 'M10Z04', {
          professor: 'Prof. Dr. Can SU',
          supervisor: 'Prof. Dr. Can SU',
        }),
      ],
      salonlar: SALONLAR,
    });
    expect(h.kisaltmalar).toEqual({});
    expect(h.gunler[0].kisaGun).toBe('Pzt');
  });
});

describe('gönderim', () => {
  it('kimlik ve durum', () => {
    expect(gonderimKimligi('bilgisayar', 'final|2025-2026 bahar')).toBe(
      'bilgisayar__final|2025-2026_bahar'
    );
    const s = [{ code: 'A', date: '2026-06-08', timeSlot: '10:00', room: 'M1' }];
    const imza = programImzasi(s);
    expect(gonderimDurumu(null, imza)).toBe('bekliyor');
    expect(gonderimDurumu({ durum: 'gonderildi', imza }, imza)).toBe('gonderildi');
    expect(
      gonderimDurumu({ durum: 'gonderildi', imza }, programImzasi([{ ...s[0], room: 'M2' }]))
    ).toBe('degisti');
    expect(gonderimDurumu({ durum: 'iade' }, imza)).toBe('iade');
  });
});

describe('fakülte geneli doluluk', () => {
  it('başka bölümün salonu o saatte dolu sayılır', async () => {
    const { oturumSalonlari } = await import('../lib/sinav-birlesim.js');
    const h = oturumSalonlari(
      [
        {
          id: 'k',
          code: 'K',
          date: '2026-06-08',
          timeSlot: '10:00',
          duration: 60,
          studentCount: 20,
        },
      ],
      (n, dolu) => ['M1', 'M2'].find((s) => !dolu.includes(s)),
      [{ id: 'd', date: '2026-06-08', timeSlot: '10:30', duration: 60, room: 'M1' }]
    );
    expect(h.k).toBe('M2');
  });

  it('başka bölümde görevli gözetmen o saate atanmaz', async () => {
    const { gozetmenAta } = await import('../lib/gozetmen.js');
    const { atamalar } = gozetmenAta(
      ['Ali KAYA', 'Veli SARI'],
      [
        {
          id: 'k',
          code: 'K',
          date: '2026-06-08',
          timeSlot: '10:00',
          duration: 60,
          studentCount: 10,
          room: 'M1',
        },
      ],
      {
        hocaKurali: 'haric',
        digerGorevler: [
          { date: '2026-06-08', timeSlot: '10:00', duration: 60, supervisor: 'Arş. Gör. Ali KAYA' },
        ],
      }
    );
    expect(atamalar.k).toEqual(['Veli SARI']);
  });
});
