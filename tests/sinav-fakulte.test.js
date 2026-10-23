import { describe, it, expect } from 'vitest';
import * as SFTum from '../lib/sinav-fakulte.js';
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
  gonderimKaydiBul,
  programImzasi,
  gonderimDurumu,
  HOCA_ETIKETI,
  SALONSUZ_ETIKETI,
  fakulteAkademisyeniMi,
  fakulteArastirmaGorevlileri,
  gozetmenSecenekListesi,
  sinavHocalari,
  DERS_HOCASI_GRUBU,
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
    const k = gonderimKimligi('bilgisayar', 'final|2025-2026 bahar|yuksek_lisans');
    expect(k).toBe('bilgisayar__final:2025-2026_bahar:yuksek_lisans');
    // sunucunun belge kimliği kuralından geçmeli ("|" yasak)
    expect(require('../server/lib/yazma-girdisi.js').gecerliKimlik(k)).toBe(true);
    // eski "|" kimlikli kayıt da bulunur
    expect(
      gonderimKaydiBul(
        [{ id: 'bilgisayar__final|2025-2026_bahar', durum: 'gonderildi' }],
        'bilgisayar',
        'final|2025-2026 bahar'
      ).durum
    ).toBe('gonderildi');
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

describe('aktif dönem ve fakülte listesi', () => {
  it('bugünü kapsayan dönem; yoksa en yakın gelecek; yoksa son biten', async () => {
    const { donemGruplari: dg, aktifDonemGrubu } = await import('../lib/sinav-fakulte.js');
    const g = dg([
      {
        id: 'v',
        examType: 'vize',
        semester: 'Güz',
        label: 'Vize - Güz',
        startDate: '2026-11-02',
        weeks: 1,
      },
      {
        id: 'f',
        examType: 'final',
        semester: 'Güz',
        label: 'Final - Güz',
        startDate: '2027-01-04',
        weeks: 2,
      },
    ]);
    expect(g.find((x) => x.anahtar.startsWith('final')).bit).toBe('2027-01-17');
    expect(aktifDonemGrubu(g, '2026-11-04').etiket).toBe('Vize - Güz');
    expect(aktifDonemGrubu(g, '2026-12-01').etiket).toBe('Final - Güz');
    expect(aktifDonemGrubu(g, '2027-03-01').etiket).toBe('Final - Güz');
    expect(aktifDonemGrubu(g, '2026-01-01').etiket).toBe('Vize - Güz');
  });

  it('slug ve ObjectId aynı birimde birleşir, bölümsüz MYO da listelenir', async () => {
    const { fakulteListesi } = await import('../lib/sinav-fakulte.js');
    const l = fakulteListesi(
      [
        { id: '6a2ef9cb45b65d403456660c', name: 'Mühendislik Fakültesi' },
        { id: 'fen', name: 'Fen Edebiyat Fakültesi' },
        { id: '6ab18cfad3bcb88d3e185766', name: 'Teknik Bilimler Meslek Yüksekokulu' },
      ],
      [
        { id: 'bilgisayar', facultyId: 'muhendislik' },
        { id: 'x', facultyId: '6a2ef9cb45b65d403456660c' },
        { id: 'y', facultyId: 'fen' },
      ]
    );
    expect(l.map((f) => f.ad)).toEqual([
      'Fen Edebiyat Fakültesi',
      'Mühendislik Fakültesi',
      'Teknik Bilimler Meslek Yüksekokulu',
    ]);
    const muh = l.find((f) => f.ad === 'Mühendislik Fakültesi');
    expect(muh.kimlikler.sort()).toEqual(['6a2ef9cb45b65d403456660c', 'muhendislik']);
    expect(muh.bolumSayisi).toBe(2);
  });
});

describe('özel renkler ve bölümler arası birleştirme', () => {
  it('OSD/OZD ve ortak renkleri ayardan', async () => {
    const SFm = await import('../lib/sinav-fakulte.js');
    expect(SFm.ortakDersTuru('OZD 101')).toBe('ozd');
    expect(SFm.ortakDersTuru('osd202')).toBe('osd');
    expect(SFm.ortakDersTuru('BİL101')).toBe('');
    const ayar = { ozelRenkler: { ozd: '#112233', ortak: 'abcdef' } };
    const k = SFm.fakulteKitabi({
      sinavlar: [
        {
          id: '1',
          code: 'OZD101',
          date: '2026-06-08',
          timeSlot: '10:00',
          room: 'M10Z04',
          departmentId: 'bilgisayar',
        },
        {
          id: '2',
          code: 'MAT1',
          name: 'Mat',
          date: '2026-06-08',
          timeSlot: '12:00',
          room: 'M10Z04',
          departmentId: 'insaat',
          birlesimId: 'B',
        },
        {
          id: '3',
          code: 'MAT2',
          name: 'Mat',
          date: '2026-06-08',
          timeSlot: '12:00',
          room: 'M10Z04',
          departmentId: 'makine',
          birlesimId: 'B',
        },
      ],
      salonlar: SALONLAR,
      bolumler: BOLUMLER,
      ayar,
    });
    const renkler = k.oturumlar.map((o) => o.renk);
    expect(renkler).toContain('112233');
    expect(renkler).toContain('ABCDEF');
  });

  it('aynı saatte farklı bölümlerde aynı ders/hoca önerilir ve birleştirilir', async () => {
    const SFm = await import('../lib/sinav-fakulte.js');
    const l = [
      {
        id: 'a',
        code: 'MAT162',
        name: 'Matematik II',
        professor: 'Dr. Ali KAYA',
        date: '2026-06-08',
        timeSlot: '10:00',
        departmentId: 'insaat',
        room: 'M11101',
        supervisor: 'X',
      },
      {
        id: 'b',
        code: 'MAT164',
        name: 'Matematik II',
        professor: 'Ali Kaya',
        date: '2026-06-08',
        timeSlot: '10:00',
        departmentId: 'makine',
        room: 'M11103',
        supervisor: 'Y, X',
      },
      {
        id: 'c',
        code: 'BİL101',
        name: 'Prog',
        professor: 'Z',
        date: '2026-06-08',
        timeSlot: '10:00',
        departmentId: 'bilgisayar',
      },
      {
        id: 'd',
        code: 'MAT162',
        name: 'Matematik II',
        date: '2026-06-08',
        timeSlot: '13:00',
        departmentId: 'kimya',
      },
    ];
    const o = SFm.birlestirmeOnerileri(l);
    expect(o).toHaveLength(1);
    expect(o[0].sinavlar.map((s) => s.id).sort()).toEqual(['a', 'b']);
    const y = SFm.birlestirmeYamalari(o[0].sinavlar, 'BYENI');
    expect(y[0].data).toEqual({ birlesimId: 'BYENI', room: 'M11101 - M11103', supervisor: 'X, Y' });
    const birlesik = l.map((s) =>
      s.id === 'a' || s.id === 'b' ? { ...s, birlesimId: 'BYENI' } : s
    );
    // mevcut oturumların bütün üyeleri dahil edilir, saat hedefe taşınır
    const t = [
      { id: 'x1', code: 'A', birlesimId: 'B1', room: 'M1', timeSlot: '10:00' },
      { id: 'x2', code: 'A2', birlesimId: 'B1', room: 'M2', timeSlot: '10:00' },
      { id: 'y1', code: 'C', birlesimId: 'B2', room: 'M3', timeSlot: '10:30' },
      { id: 'y2', code: 'C2', birlesimId: 'B2', timeSlot: '10:30' },
    ];
    const y2 = SFm.birlestirmeYamalari([t[0], t[2]], 'BN', {
      tumSinavlar: t,
      date: '2026-06-08',
      timeSlot: '10:00',
    });
    expect(y2.map((x) => x.id).sort()).toEqual(['x1', 'x2', 'y1', 'y2']);
    expect(new Set(y2.map((x) => x.data.birlesimId)).size).toBe(1);
    expect(y2[0].data).toMatchObject({
      room: 'M1 - M3 - M2',
      timeSlot: '10:00',
      date: '2026-06-08',
    });
    expect(SFm.birlestirmeOnerileri(birlesik)).toHaveLength(0);
  });

  it('basit docx: yatay A4, tablo ve Türkçe metin', async () => {
    const { docxParcalari } = await import('../lib/basit-docx.js');
    const p = docxParcalari({
      baslik: 'BİLGİSAYAR — FİNAL',
      sutunlar: ['Ders', 'Salon'],
      satirlar: [{ hucreler: ['Şube & <1>', 'M1'], renk: '#B2EBF2' }],
    });
    expect(Object.keys(p)).toEqual(['[Content_Types].xml', '_rels/.rels', 'word/document.xml']);
    const x = p['word/document.xml'];
    expect(x).toContain('w:orient="landscape"');
    expect(x).toContain('Şube &amp; &lt;1&gt;');
    expect(x).toContain('w:fill="B2EBF2"');
    expect(x).toContain('BİLGİSAYAR — FİNAL');
  });
});

it('basit docx: şema sırası, oransız ızgara, yasak karakter', async () => {
  const { belgeXml } = await import('../lib/basit-docx.js');
  const x = belgeXml({ sutunlar: ['A', 'B'], satirlar: [{ hucreler: ['a\u0001b', 'c'] }] });
  expect(x.indexOf('<w:spacing')).toBeLessThan(x.indexOf('<w:jc w:val="center"/></w:pPr>'));
  expect(x).toContain('<w:tblGrid><w:gridCol w:w="7699"/><w:gridCol w:w="7699"/></w:tblGrid>');
  expect(x).toContain('>ab<');
});

describe('saat çizelgesi, hafta ve renk açıklaması', () => {
  it('serbest dilim süresi ve öğle arası', async () => {
    const SFm = await import('../lib/sinav-fakulte.js');
    const d = SFm.saatDilimleri({
      baslangic: '08:30',
      bitis: '13:00',
      dilim: 45,
      ogleBaslangic: '11:45',
      ogleBitis: '12:15',
    });
    expect(d.map((x) => x.etiket)).toEqual([
      '08:30-09:15',
      '09:15-10:00',
      '10:00-10:45',
      '10:45-11:30',
      '11:30-11:45',
      '11:45-12:15',
      '12:15-13:00',
    ]);
    expect(d[5].ara).toBe(true);
    expect(SFm.cizelgeOku({ dilim: 2, bitis: '07:00' })).toMatchObject({
      dilim: 30,
      bitis: '18:30',
    });
  });

  it('50 dakikalık dilimde 90 dakikalık sınav doğru satırlara yayılır', async () => {
    const SFm = await import('../lib/sinav-fakulte.js');
    const dilimler = SFm.saatDilimleri({ baslangic: '08:30', bitis: '12:30', dilim: 50 });
    const o = SFm.fakulteOturumlari([
      { id: '1', code: 'A', date: '2026-06-08', timeSlot: '09:00', duration: 90, room: 'M1' },
    ]);
    const t = SFm.gunTablosu(o, [{ name: 'M1' }], { dilimler });
    // 09:00–10:30 → 08:30-09:20, 09:20-10:10, 10:10-11:00
    expect(t.satirlar[0].hucreler[0].satirSayisi).toBe(3);
  });

  it('haftalara bölme, taslak işareti ve renk açıklaması', async () => {
    const SFm = await import('../lib/sinav-fakulte.js');
    const k = SFm.fakulteKitabi({
      sinavlar: [
        {
          id: '1',
          code: 'OZD101',
          date: '2026-06-12',
          timeSlot: '10:00',
          room: 'M10Z04',
          departmentId: 'insaat',
        },
        {
          id: '2',
          code: 'B',
          date: '2026-06-15',
          timeSlot: '10:00',
          room: 'M10Z04',
          departmentId: 'bilgisayar',
        },
      ],
      salonlar: SALONLAR,
      bolumler: BOLUMLER,
      taslakBolumler: ['insaat'],
    });
    expect(k.haftalar.map((h) => h.etiket)).toEqual(['1. Hafta (12.06)', '2. Hafta (15.06)']);
    const t = k.gunler[0].tablo.satirlar.flatMap((r) => r.hucreler).find((h) => h && !h.gizli);
    expect(t.taslak).toBe(true);
    expect(k.renkAciklamasi.map((x) => x.etiket)).toContain('OZD (ortak zorunlu)');
    expect(k.renkAciklamasi.map((x) => x.etiket)).not.toContain('OSD (ortak seçmeli)');
  });
});

describe('salonu girilmemiş oturumlar', () => {
  const sinav = (id, saat, room) => ({
    id,
    code: 'K' + id,
    name: 'Ders ' + id,
    date: '2026-06-15',
    timeSlot: saat,
    duration: 60,
    room,
    departmentId: 'bilgisayar',
  });

  it('fakülte kitabında en sağdaki sanal sütunda görünür, çakışma sayılmaz', () => {
    const k = fakulteKitabi({
      sinavlar: [sinav('1', '09:00', 'M10Z04'), sinav('2', '09:00', ''), sinav('3', '09:00', '')],
      salonlar: SALONLAR,
      bolumler: BOLUMLER,
    });
    const g = k.gunler[0];
    expect(g.salonsuz).toHaveLength(2);
    const son = g.tablo.salonlar[g.tablo.salonlar.length - 1];
    expect(son).toMatchObject({ name: SALONSUZ_ETIKETI, sanal: true });
    const ci = g.tablo.salonlar.length - 1;
    const h = g.tablo.satirlar.map((r) => r.hucreler[ci]).find((x) => x && !x.gizli);
    expect(h.salonsuz).toBe(true);
    expect(h.cakisma).toBe(false);
    expect(h.oturumlar).toHaveLength(2);
  });

  it('salonsuz oturum yoksa sanal sütun açılmaz', () => {
    const k = fakulteKitabi({
      sinavlar: [sinav('1', '09:00', 'M10Z04')],
      salonlar: SALONLAR,
      bolumler: BOLUMLER,
    });
    expect(k.gunler[0].tablo.salonlar.some((x) => x.sanal)).toBe(false);
  });
});

describe('fakülte görünümü: gözetmen, günler, otomatik yerleşim', () => {
  const fakBolum = [{ id: 'bilgisayar', kimlikler: ['6a1'] }, { id: 'makine' }];
  const tum = [...fakBolum, { id: 'matematik', kimlikler: ['6b9'] }];

  it('ana bölümü başka fakültede olan hoca fakültenin gözetmeni sayılmaz', () => {
    expect(fakulteAkademisyeniMi({ departmentId: 'matematik' }, fakBolum, tum)).toBe(false);
    expect(fakulteAkademisyeniMi({ departmentId: '6b9' }, fakBolum, tum)).toBe(false);
    expect(fakulteAkademisyeniMi({ departmentId: '6a1' }, fakBolum, tum)).toBe(true);
    expect(fakulteAkademisyeniMi({ departmentId: 'makine' }, fakBolum, tum)).toBe(true);
    // ana bölümü bilinmeyen kayıt dışarıda bırakılmaz
    expect(fakulteAkademisyeniMi({ departmentId: '' }, fakBolum, tum)).toBe(true);
    expect(fakulteAkademisyeniMi({ departmentId: 'bilinmeyen' }, fakBolum, tum)).toBe(true);
  });

  it('dönem sınırı verilince sınavı olmayan Cuma da gün listesinde', () => {
    const g = sinavGunleri(
      [{ date: '2026-11-09' }, { date: '2026-11-12' }],
      ['2026-11-09', '2026-11-15']
    );
    expect(g.map((x) => x.kisaGun)).toEqual(['Pzt', 'Sal', 'Çar', 'Per', 'Cum']);
  });

  it('otomatik yerleşen sınavın oturumu ve hücresi işaretlenir', () => {
    const k = fakulteKitabi({
      sinavlar: [
        {
          id: '1',
          code: 'A',
          date: '2026-06-15',
          timeSlot: '09:00',
          room: 'M10Z04',
          oneriSalon: true,
          departmentId: 'bilgisayar',
        },
      ],
      salonlar: SALONLAR,
      bolumler: BOLUMLER,
    });
    const h = k.gunler[0].tablo.satirlar.flatMap((r) => r.hucreler).find((x) => x && !x.gizli);
    expect(h.otomatik).toBe(true);
  });
});

describe('gözetmen seçenekleri: dersin hocası + fakültenin araştırma görevlileri', () => {
  const fak = [
    { id: 'bilgisayar', name: 'Bilgisayar Mühendisliği', kimlikler: ['6a1'] },
    { id: 'makine', name: 'Makine Mühendisliği' },
  ];
  const kisiler = [
    { name: 'Arş. Gör. Ali VELİ', departmentId: 'bilgisayar' },
    { name: 'Arş. Gör. Dr. Ayşe KAYA', departmentId: '6a1' },
    { name: 'Arş. Gör. Can DEMİR', departmentId: 'makine' },
    { name: 'Arş. Gör. Eski KAYIT', department: 'Makine Mühendisliği' },
    { name: 'Dr. Öğr. Üyesi Hoca BİR', departmentId: 'bilgisayar' },
    { name: 'Prof. Dr. Profesör İKİ', departmentId: 'makine' },
    {
      name: 'Arş. Gör. Başka FAKÜLTE',
      departmentId: 'matematik',
      additionalDepartments: ['bilgisayar'],
    },
    { name: 'Arş. Gör. Memur', departmentId: 'bilgisayar', isMemur: true },
  ];

  it('yalnız fakültede kadrolu Arş. Gör. ve Arş. Gör. Dr.; bölümlerine göre gruplu', () => {
    const l = fakulteArastirmaGorevlileri(kisiler, fak);
    expect(l.map((x) => x.deger)).toEqual([
      'Arş. Gör. Ali VELİ',
      'Arş. Gör. Dr. Ayşe KAYA',
      'Arş. Gör. Can DEMİR',
      'Arş. Gör. Eski KAYIT',
    ]);
    expect(l[0].grup).toBe('Bilgisayar Mühendisliği');
    expect(l[2].grup).toBe('Makine Mühendisliği');
  });

  it('dersin hocası en başta; araştırma görevlisi de hocaysa tekrar yazılmaz', () => {
    const arGor = fakulteArastirmaGorevlileri(kisiler, fak);
    const hocalar = sinavHocalari([
      { professor: 'Dr. Öğr. Üyesi Hoca BİR' },
      { professors: ['Arş. Gör. Dr. AYŞE KAYA', 'Dr. Öğr. Üyesi Hoca BİR'] },
    ]);
    const l = gozetmenSecenekListesi(hocalar, arGor);
    expect(l.slice(0, 2).map((x) => [x.deger, x.grup])).toEqual([
      ['Dr. Öğr. Üyesi Hoca BİR', DERS_HOCASI_GRUBU],
      ['Arş. Gör. Dr. AYŞE KAYA', DERS_HOCASI_GRUBU],
    ]);
    expect(l.filter((x) => /kaya/i.test(x.deger))).toHaveLength(1);
    expect(l).toHaveLength(5);
  });
});

describe('denetim düzeltmeleri — fakülte tablosu', () => {
  it('aynı satıra düşen ama saatte örtüşmeyen sınavlar çakışma sayılmaz', () => {
    const o = fakulteOturumlari(
      [
        {
          id: '1',
          code: 'A',
          date: '2026-06-15',
          timeSlot: '09:00',
          duration: 45,
          room: 'M10Z04',
          departmentId: 'bilgisayar',
        },
        {
          id: '2',
          code: 'B',
          date: '2026-06-15',
          timeSlot: '09:45',
          duration: 45,
          room: 'M10Z04',
          departmentId: 'bilgisayar',
        },
      ],
      { bolumler: BOLUMLER }
    );
    const t = gunTablosu(o, SALONLAR);
    const h = t.satirlar.flatMap((r) => r.hucreler).find((x) => x && !x.gizli);
    expect(h.cakisma).toBe(false);
    expect(h.metin).not.toMatch(/ÇAKIŞMA/);
  });
});

describe('salon başına gözetmen, çakışma, yük sayacı', () => {
  const SFm = SFTum;
  const uye = (ek) => ({
    id: 'e' + Math.random().toString(36).slice(2, 7),
    code: 'MAT101',
    name: 'Matematik',
    date: '2026-11-09',
    timeSlot: '10:00',
    duration: 60,
    studentCount: 80,
    professor: 'Dr. Ali Veli',
    departmentId: 'bil',
    ...ek,
  });
  it('kayıtlı dağılım yoksa hoca ilk salona, kalanlar eşit dağılır', () => {
    const u = [uye({ room: 'M1 - M2', supervisor: 'Dr. Ali Veli, Ayşe K, Can D, Ece F' })];
    const { dagilim, kayitli } = SFm.salonGozetmenDagilimi(
      u,
      ['M1', 'M2'],
      ['Ayşe K', 'Dr. Ali Veli', 'Can D', 'Ece F']
    );
    expect(kayitli).toBe(false);
    expect(dagilim[0]).toEqual({ salon: 'M1', gozetmenler: ['Dr. Ali Veli', 'Ayşe K'] });
    expect(dagilim[1]).toEqual({ salon: 'M2', gozetmenler: ['Can D', 'Ece F'] });
  });
  it('geçerli kayıtlı dağılım kullanılır, kişiler değiştiyse yeniden türetilir', () => {
    const kayit = [
      { salon: 'M1', gozetmenler: ['Can D'] },
      { salon: 'M2', gozetmenler: ['Ayşe K', 'Dr. Ali Veli'] },
    ];
    const u = [uye({ salonGozetmenleri: kayit })];
    const g = ['Dr. Ali Veli', 'Ayşe K', 'Can D'];
    expect(SFm.salonGozetmenDagilimi(u, ['M1', 'M2'], g).dagilim).toEqual(kayit);
    expect(SFm.salonGozetmenDagilimi(u, ['M1', 'M2'], [...g, 'Yeni K']).kayitli).toBe(false);
  });
  it('tabloda her salon hücresi kendi gözetmenlerini yazar', () => {
    const u = [
      uye({
        room: 'M1 - M2',
        supervisor: 'Ayşe K, Can D',
        salonGozetmenleri: [
          { salon: 'M1', gozetmenler: ['Ayşe K'] },
          { salon: 'M2', gozetmenler: ['Can D'] },
        ],
      }),
    ];
    const ot = SFm.fakulteOturumlari(u, { kisaltmalar: { 'Ayşe K': 'AK', 'Can D': 'CD' } });
    expect(ot[0].salonMetinleri.M1).toMatch(/AK/);
    expect(ot[0].salonMetinleri.M1).not.toMatch(/CD/);
    const t = SFm.gunTablosu(ot, [{ name: 'M1' }, { name: 'M2' }]);
    const hucreler = t.satirlar.flatMap((r) => r.hucreler).filter((h) => h && h.metin);
    expect(hucreler.map((h) => h.metin.includes('CD'))).toEqual([false, true]);
  });
  it('aynı saatte iki oturumda ve iki salonda görevli kişi çakışma sayılır', () => {
    const a = uye({ code: 'A1', room: 'M1', supervisor: 'Can D' });
    const b = uye({ code: 'B1', timeSlot: '10:30', room: 'M3', supervisor: 'Can D, Ece F' });
    const c = uye({ code: 'C1', timeSlot: '13:00', room: 'M3', supervisor: 'Ece F' });
    const ot = SFm.fakulteOturumlari([a, b, c]);
    const { liste } = SFm.gozetmenCakismalari(ot);
    expect(liste.filter((x) => x.tur === 'saat').map((x) => x.ad)).toEqual(['Can D']);
    const iki = SFm.fakulteOturumlari([
      uye({
        room: 'M1 - M2',
        supervisor: 'Can D',
        salonGozetmenleri: [
          { salon: 'M1', gozetmenler: ['Can D'] },
          { salon: 'M2', gozetmenler: ['Can D'] },
        ],
      }),
    ]);
    expect(SFm.gozetmenCakismalari(iki).liste.map((x) => x.tur)).toEqual(['iki_salon']);
  });
  it('yük sayacı hocanın kendi sınavını ayrı sayar, dengesizliği bulur, öneri boş ve az yüklüyü seçer', () => {
    const l = [
      uye({ code: 'A1', supervisor: 'Dr. Ali Veli, Can D' }),
      uye({ code: 'A2', timeSlot: '13:00', supervisor: 'Can D' }),
      uye({ code: 'A3', date: '2026-11-10', supervisor: 'Can D' }),
      uye({ code: 'A4', date: '2026-11-10', timeSlot: '14:00', supervisor: 'Ece F' }),
    ];
    const ot = SFm.fakulteOturumlari(l);
    const y = SFm.gozetmenYukleri(ot, ['Can D', 'Ece F', 'Gül H']);
    const can = y.find((x) => x.ad === 'Can D');
    expect(can.gorev).toBe(3);
    expect(can.dakika).toBe(180);
    expect(y.find((x) => x.ad === 'Dr. Ali Veli').kendiSinavi).toBe(1);
    const d = SFm.yukDengesi(y);
    expect(d.durum['Can D']).toBe('fazla');
    expect(d.durum['Gül H']).toBe('az');
    const hedef = ot.find((o) => o.kodSatiri === 'A1');
    const oneri = SFm.gozetmenOnerileri({
      oturum: hedef,
      oturumlar: ot,
      adaylar: ['Can D', 'Ece F', 'Gül H'],
      yukler: y,
      musaitsizlik: { 'Ece F': ['2026-11-09'] },
    });
    expect(oneri.map((x) => x.ad)).toEqual(['Gül H']);
  });
});

describe('aynı salonda örtüşme engeli ve gözetmen görev listesi', () => {
  const S = SFTum;
  const e = (id, ek) => ({
    id,
    code: id.toUpperCase(),
    name: 'Ders ' + id,
    date: '2026-11-09',
    timeSlot: '10:00',
    duration: 60,
    studentCount: 20,
    departmentId: 'bil',
    room: 'M1',
    ...ek,
  });
  it('1 dakikalık örtüşme bile engeldir; bitişik saatler serbest', () => {
    const l = [e('a'), e('b', { timeSlot: '11:00', room: 'M2' })];
    expect(
      S.degisiklikSalonCakismalari(l, [{ id: 'b', data: { room: 'M1', timeSlot: '10:59' } }])
    ).toHaveLength(1);
    expect(
      S.degisiklikSalonCakismalari(l, [{ id: 'b', data: { room: 'M1', timeSlot: '11:00' } }])
    ).toHaveLength(0);
    // Farklı salon serbest
    expect(
      S.degisiklikSalonCakismalari(l, [{ id: 'b', data: { timeSlot: '10:00' } }])
    ).toHaveLength(0);
  });
  it('birleşik oturum tek oturumdur; önceden var olan örtüşme ilgisiz değişikliği engellemez', () => {
    const l = [e('a', { birlesimId: 'B1' }), e('b', { birlesimId: 'B1' }), e('c', { room: 'M1' })];
    // c zaten a/b ile aynı salonda: gözetmen değişikliği engellenmez
    expect(S.degisiklikSalonCakismalari(l, [{ id: 'c', data: { supervisor: 'X' } }])).toHaveLength(
      0
    );
    // c birleşik oturuma katılırsa çakışma kalmaz
    expect(S.degisiklikSalonCakismalari(l, [{ id: 'c', data: { birlesimId: 'B1' } }])).toHaveLength(
      0
    );
  });
  it('gözetmen listesi kişinin kendi salonunu yazar', () => {
    const ot = S.fakulteOturumlari([
      e('a', {
        room: 'M1 - M2',
        supervisor: 'Ayşe K, Can D',
        salonGozetmenleri: [
          { salon: 'M1', gozetmenler: ['Ayşe K'] },
          { salon: 'M2', gozetmenler: ['Can D'] },
        ],
      }),
    ]);
    expect(S.gozetmenGorevListesi(ot)).toEqual([
      { ad: 'Ayşe K', tarih: '2026-11-09', bas: '10:00', bit: '11:00', salon: 'M1', hoca: false },
      { ad: 'Can D', tarih: '2026-11-09', bas: '10:00', bit: '11:00', salon: 'M2', hoca: false },
    ]);
  });
});

describe('gözetmen görev listesi: yazım birleştirme ve hoca işareti', () => {
  it('aynı kişinin iki yazımı tek kişi; hocanın kendi sınavı işaretli', () => {
    const ot = SFTum.fakulteOturumlari([
      {
        id: 'x1',
        code: 'A',
        date: '2026-11-09',
        timeSlot: '09:00',
        duration: 60,
        room: 'M1',
        supervisor: 'Dr. Ali Veli',
        professor: 'Dr. Ali Veli',
      },
      {
        id: 'x2',
        code: 'B',
        date: '2026-11-10',
        timeSlot: '09:00',
        duration: 60,
        room: 'M2',
        supervisor: 'Ali VELİ',
        professor: 'Can D',
      },
    ]);
    const l = SFTum.gozetmenGorevListesi(ot);
    expect(l.map((x) => x.ad)).toEqual(['Dr. Ali Veli', 'Dr. Ali Veli']);
    expect(l.map((x) => x.hoca)).toEqual([true, false]);
  });
});
