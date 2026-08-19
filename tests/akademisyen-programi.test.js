import { describe, it, expect } from 'vitest';
import {
  PROGRAM_SAATLERI,
  adAnahtari,
  akademisyenKayitlari,
  akademisyenProgramHTML,
  bolumHaritasi,
  programDosyaAdi,
  programIzgarasi,
} from '../lib/akademisyen-programi.js';

const BOLUMLER = [
  { id: 'bilgisayar', _docId: 'eski-bilgisayar-id', name: 'Bilgisayar Mühendisliği' },
  { id: 'makine', name: 'Makine Mühendisliği' },
  { id: 'isletme', name: 'İşletme' },
];

// course_schedules dokümanı: bolum_donem_sinif[_seviye]
function dok(id, slots, ekstra) {
  const [departmentId, semester, year, seviye] = id.split('_');
  return { id, departmentId, semester, year, seviye: seviye || 'lisans', slots, ...(ekstra || {}) };
}

describe('adAnahtari', () => {
  it('unvanları ayıklar', () => {
    expect(adAnahtari('Prof. Dr. Ayşe Yılmaz')).toBe('ayşe yılmaz');
    expect(adAnahtari('Dr. Öğr. Üyesi Ayşe YILMAZ')).toBe('ayşe yılmaz');
    expect(adAnahtari('Arş. Gör. Ayşe Yılmaz')).toBe('ayşe yılmaz');
  });

  it('unvansız ad ile unvanlı ad aynı anahtara düşer', () => {
    expect(adAnahtari('Ayşe Yılmaz')).toBe(adAnahtari('Doç. Dr. Ayşe Yılmaz'));
  });

  it('boş girdi boş anahtar üretir', () => {
    expect(adAnahtari('')).toBe('');
    expect(adAnahtari(null)).toBe('');
  });
});

describe('bolumHaritasi', () => {
  it('her kimlik varyantını ada ve kanonik kimliğe çözer', () => {
    const { ad, kanon } = bolumHaritasi(BOLUMLER);
    expect(ad['eski-bilgisayar-id']).toBe('Bilgisayar Mühendisliği');
    expect(kanon['eski-bilgisayar-id']).toBe('bilgisayar');
    expect(kanon['makine']).toBe('makine');
  });
});

describe('akademisyenKayitlari', () => {
  it('farklı bölümlerdeki dersleri tek listede toplar', () => {
    const dokumanlar = [
      dok('bilgisayar_guz_2', {
        Pazartesi_0: {
          courseCode: 'BIL201',
          courseName: 'Veri Yapıları',
          instructor: 'Ayşe Yılmaz',
          classroom: 'D-101',
          sinif: 2,
        },
      }),
      dok('makine_guz_1', {
        Salı_3: {
          courseCode: 'MAK101',
          courseName: 'Statik',
          instructor: 'Prof. Dr. Ayşe Yılmaz',
          classroom: 'M-2',
        },
      }),
      dok('isletme_guz_1', {
        Salı_3: { courseCode: 'ISL101', instructor: 'Başka Hoca', classroom: 'İ-1' },
      }),
    ];
    const kayitlar = akademisyenKayitlari(dokumanlar, {
      ad: 'Ayşe Yılmaz',
      donem: 'guz',
      bolumler: BOLUMLER,
    });
    expect(kayitlar.map((k) => k.dersKodu)).toEqual(['BIL201', 'MAK101']);
    expect(kayitlar[0].bolumAdi).toBe('Bilgisayar Mühendisliği');
    expect(kayitlar[1].bolumAdi).toBe('Makine Mühendisliği');
    // Sabah bloğu :30 başlar (indeks 3 → 11:30-12:15).
    expect(kayitlar[1].saat).toBe('11:30-12:15');
  });

  it('bölünmüş hücrenin ikinci dersini de sayar ve dersliği devralır', () => {
    const dokumanlar = [
      dok('bilgisayar_guz_3', {
        Çarşamba_1: {
          courseCode: 'BIL301',
          instructor: 'Ayşe Yılmaz',
          classroom: 'D-205',
          ikinci: { courseCode: 'BIL305', instructor: 'Ayşe Yılmaz' },
        },
      }),
    ];
    const kayitlar = akademisyenKayitlari(dokumanlar, { ad: 'Ayşe Yılmaz', donem: 'guz' });
    expect(kayitlar).toHaveLength(2);
    expect(kayitlar[1].dersKodu).toBe('BIL305');
    expect(kayitlar[1].derslik).toBe('D-205');
    // Aynı slottan geldikleri için çakışma üretmezler
    expect(kayitlar[0].slotKimligi).toBe(kayitlar[1].slotKimligi);
    expect(programIzgarasi(kayitlar).cakismalar).toEqual([]);
  });

  it('ikinci dersin hocası farklıysa yalnız ona ait olan alınır', () => {
    const dokumanlar = [
      dok('bilgisayar_guz_3', {
        Çarşamba_1: {
          courseCode: 'BIL301',
          instructor: 'Mehmet Demir',
          classroom: 'D-205',
          ikinci: { courseCode: 'BIL305', instructor: 'Ayşe Yılmaz' },
        },
      }),
    ];
    const kayitlar = akademisyenKayitlari(dokumanlar, { ad: 'Ayşe Yılmaz', donem: 'guz' });
    expect(kayitlar.map((k) => k.dersKodu)).toEqual(['BIL305']);
  });

  it('bölümün eski kimliğiyle kaydedilmiş bayat kopya dersi iki kez göstermez', () => {
    const slot = {
      Pazartesi_0: { courseCode: 'BIL201', instructor: 'Ayşe Yılmaz', classroom: 'D-101' },
    };
    const dokumanlar = [
      dok('bilgisayar_guz_2', slot),
      dok('eski-bilgisayar-id_guz_2', slot), // aynı bölümün eski kimlikli kopyası
    ];
    const kayitlar = akademisyenKayitlari(dokumanlar, {
      ad: 'Ayşe Yılmaz',
      donem: 'guz',
      bolumler: BOLUMLER,
    });
    expect(kayitlar).toHaveLength(1);
  });

  it('dönem filtresi uygulanır, lisansüstü programlar da kapsanır', () => {
    const dokumanlar = [
      dok('bilgisayar_guz_1', {
        Pazartesi_0: { courseCode: 'BIL101', instructor: 'Ayşe Yılmaz' },
      }),
      dok('bilgisayar_bahar_1', {
        Pazartesi_0: { courseCode: 'BIL102', instructor: 'Ayşe Yılmaz' },
      }),
      dok('bilgisayar_guz_1_yuksek_lisans', {
        Pazartesi_10: { courseCode: 'BIL501', instructor: 'Ayşe Yılmaz' },
      }),
    ];
    const guz = akademisyenKayitlari(dokumanlar, { ad: 'Ayşe Yılmaz', donem: 'guz' });
    expect(guz.map((k) => k.dersKodu)).toEqual(['BIL101', 'BIL501']);
    expect(guz[1].seviye).toBe('yuksek');
    expect(guz[1].saat).toBe('18:15-19:00');

    const bahar = akademisyenKayitlari(dokumanlar, { ad: 'Ayşe Yılmaz', donem: 'bahar' });
    expect(bahar.map((k) => k.dersKodu)).toEqual(['BIL102']);
  });

  it('ad boşsa hiçbir kayıt dönmez (tüm program sızmaz)', () => {
    const dokumanlar = [
      dok('bilgisayar_guz_1', { Pazartesi_0: { courseCode: 'BIL101', instructor: 'Ayşe Yılmaz' } }),
    ];
    expect(akademisyenKayitlari(dokumanlar, { ad: '', donem: 'guz' })).toEqual([]);
  });

  it('gün ve saate göre sıralanır', () => {
    const dokumanlar = [
      dok('bilgisayar_guz_1', {
        Cuma_2: { courseCode: 'C', instructor: 'Ayşe Yılmaz' },
        Pazartesi_5: { courseCode: 'B', instructor: 'Ayşe Yılmaz' },
        Pazartesi_1: { courseCode: 'A', instructor: 'Ayşe Yılmaz' },
      }),
    ];
    const kayitlar = akademisyenKayitlari(dokumanlar, { ad: 'Ayşe Yılmaz', donem: 'guz' });
    expect(kayitlar.map((k) => k.dersKodu)).toEqual(['A', 'B', 'C']);
  });
});

describe('programIzgarasi', () => {
  // slotKimligi: aynı slottan (bölünmüş hücre) gelen kayıtlar paylaşır;
  // farklı bölüm/sınıf farklı slot demektir.
  const kayit = (gun, saatIndeksi, dersKodu, bolumAdi, slotKimligi) => ({
    gun,
    saatIndeksi,
    saat: '',
    dersKodu,
    dersAdi: '',
    derslik: '',
    bolumId: bolumAdi,
    bolumAdi,
    sinif: '1',
    seviye: 'lisans',
    slotKimligi: slotKimligi || [bolumAdi, '1', 'lisans', gun, saatIndeksi].join('|'),
  });

  it('aynı saatte farklı bölümlerdeki iki ders çakışma sayılır', () => {
    const { cakismalar } = programIzgarasi([
      kayit('Pazartesi', 0, 'BIL201', 'Bilgisayar Mühendisliği'),
      kayit('Pazartesi', 0, 'MAK101', 'Makine Mühendisliği'),
    ]);
    expect(cakismalar).toHaveLength(1);
    expect(cakismalar[0].mesaj).toContain('BIL201');
    expect(cakismalar[0].mesaj).toContain('MAK101');
  });

  it('aynı kodlu ortak ders iki bölümde görünse de çakışma değildir', () => {
    const { cakismalar } = programIzgarasi([
      kayit('Salı', 2, 'ORT101', 'Bilgisayar Mühendisliği'),
      kayit('Salı', 2, 'ORT101', 'Makine Mühendisliği'),
    ]);
    expect(cakismalar).toEqual([]);
  });

  it('bölünmüş hücre (aynı slotta iki ders) çakışma değildir', () => {
    const ortakSlot = 'bilgisayar|2|lisans|Çarşamba|2';
    const { cakismalar, ozet } = programIzgarasi([
      kayit('Çarşamba', 2, 'BIL203', 'Bilgisayar Mühendisliği', ortakSlot),
      kayit('Çarşamba', 2, 'BIL207', 'Bilgisayar Mühendisliği', ortakSlot),
    ]);
    expect(cakismalar).toEqual([]);
    // İki ders, tek ders saati: hoca o saatte bir kez derstedir.
    expect(ozet.dersSayisi).toBe(2);
    expect(ozet.dersSaati).toBe(1);
  });

  it('yalnız dolu saat satırları döner ve özet sayılır', () => {
    const { doluSaatler, ozet } = programIzgarasi([
      kayit('Pazartesi', 0, 'A', 'Bilgisayar Mühendisliği'),
      kayit('Cuma', 7, 'B', 'Makine Mühendisliği'),
      kayit('Cuma', 8, 'B', 'Makine Mühendisliği'),
    ]);
    // Satır anahtarı SAAT etiketidir: bu belge birden çok bölümü birleştirir
    // ve bölümlerin slot indeksleri aynı saati göstermeyebilir.
    // Sabah bloğu :30, öğleden sonraki :15 başlar (fakültenin kendi tablosu).
    expect(doluSaatler).toEqual(['08:30-09:15', '15:15-16:00', '16:15-17:00']);
    expect(ozet.dersSaati).toBe(3);
    expect(ozet.dersSayisi).toBe(2);
    expect(ozet.bolumSayisi).toBe(2);
  });

  it('FARKLI SAATTE BAŞLAYAN iki bölüm ayrı satırlara düşer', () => {
    // Bilgisayar 08:15'te, Makine 08:30'da başlıyor. İkisinin de "günün ilk
    // dersi" (indeks 0) ama aynı zaman değil — indeksle anahtarlansaydı tek
    // satıra yığılır ve hocaya olmayan bir çakışma gösterilirdi.
    const erken = {
      ...kayit('Pazartesi', 0, 'BIL101', 'Bilgisayar Mühendisliği'),
      saat: '08:15-09:00',
    };
    const gec = { ...kayit('Pazartesi', 0, 'MAK101', 'Makine Mühendisliği'), saat: '08:30-09:15' };
    const { doluSaatler, izgara, cakismalar } = programIzgarasi([erken, gec]);
    expect(doluSaatler).toEqual(['08:15-09:00', '08:30-09:15']);
    expect(izgara['Pazartesi']['08:15-09:00']).toHaveLength(1);
    expect(izgara['Pazartesi']['08:30-09:15']).toHaveLength(1);
    expect(cakismalar).toEqual([]);
  });

  it('boş kayıt listesinde çökmez', () => {
    const { doluSaatler, cakismalar, ozet } = programIzgarasi([]);
    expect(doluSaatler).toEqual([]);
    expect(cakismalar).toEqual([]);
    expect(ozet.dersSaati).toBe(0);
  });
});

describe('akademisyenProgramHTML', () => {
  const kayitlar = [
    {
      gun: 'Pazartesi',
      saatIndeksi: 0,
      saat: '08:15-09:00',
      dersKodu: 'BIL201',
      dersAdi: 'Veri Yapıları',
      derslik: 'D-101',
      bolumId: 'bilgisayar',
      bolumAdi: 'Bilgisayar Mühendisliği',
      sinif: '2',
      seviye: 'lisans',
    },
  ];

  it('ders, derslik ve bölüm bilgisini çıktıya yazar', () => {
    const html = akademisyenProgramHTML(kayitlar, {
      ad: 'Ayşe Yılmaz',
      unvan: 'Dr.',
      donem: 'guz',
    });
    expect(html).toContain('BIL201');
    expect(html).toContain('Veri Yapıları');
    expect(html).toContain('D-101');
    expect(html).toContain('Bilgisayar Mühendisliği');
    expect(html).toContain('GÜZ DÖNEMİ');
    expect(html).toContain('AYŞE YILMAZ');
  });

  it('ders yoksa boş program uyarısı verir', () => {
    const html = akademisyenProgramHTML([], { ad: 'Ayşe Yılmaz', donem: 'bahar' });
    expect(html).toContain('kayıtlı ders bulunamadı');
    expect(html).toContain('BAHAR DÖNEMİ');
  });

  it('ders adındaki HTML kaçırılır (çıktı bozulmaz)', () => {
    const html = akademisyenProgramHTML(
      [{ ...kayitlar[0], dersAdi: '<script>alert(1)</script>' }],
      { ad: 'Ayşe Yılmaz', donem: 'guz' }
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('programDosyaAdi', () => {
  it('Türkçe karakterleri sadeleştirir', () => {
    expect(programDosyaAdi('Ayşe Yılmaz', 'guz')).toBe('Ayse-Yilmaz-guz-ders-programi.html');
    expect(programDosyaAdi('Çağrı Öz', 'bahar')).toBe('Cagri-Oz-bahar-ders-programi.html');
  });
});

describe('akademisyenKayitlari — bölüme özel saatler', () => {
  const dok = (bolum, sinif, slots) => ({
    id: `${bolum}_guz_${sinif}`,
    departmentId: bolum,
    semester: 'guz',
    year: sinif,
    slots,
  });
  const bolumler = [
    { id: 'bilgisayar', name: 'Bilgisayar Mühendisliği' },
    { id: 'makine', name: 'Makine Mühendisliği' },
  ];

  it('etiket bölümün KENDİ saat listesinden gelir', () => {
    const kayitlar = akademisyenKayitlari(
      [
        dok('bilgisayar', '1', {
          Pazartesi_0: { courseCode: 'BIL101', instructor: 'Ayşe Yılmaz' },
        }),
        dok('makine', '2', { Pazartesi_0: { courseCode: 'MAK201', instructor: 'Ayşe Yılmaz' } }),
      ],
      {
        ad: 'Ayşe Yılmaz',
        donem: 'guz',
        bolumler,
        bolumSaatleri: {
          bilgisayar: ['08:15-09:00', '09:15-10:00'],
          makine: ['08:30-09:15', '09:30-10:15'],
        },
      }
    );
    expect(kayitlar.map((k) => [k.dersKodu, k.saat])).toEqual([
      ['BIL101', '08:15-09:00'],
      ['MAK201', '08:30-09:15'],
    ]);
  });

  it('ayarı olmayan bölüm GENEL ızgarayı kullanır (davranış değişmez)', () => {
    const kayitlar = akademisyenKayitlari(
      [dok('bilgisayar', '1', { Salı_2: { courseCode: 'BIL203', instructor: 'Ayşe Yılmaz' } })],
      { ad: 'Ayşe Yılmaz', donem: 'guz', bolumler }
    );
    expect(kayitlar[0].saat).toBe(PROGRAM_SAATLERI[2]);
  });

  it('kayıtlar İNDEKSE değil SAATE göre sıralanır', () => {
    const kayitlar = akademisyenKayitlari(
      [
        dok('bilgisayar', '1', { Pazartesi_1: { courseCode: 'GEC', instructor: 'Ayşe Yılmaz' } }),
        dok('makine', '1', { Pazartesi_0: { courseCode: 'ERKEN', instructor: 'Ayşe Yılmaz' } }),
      ],
      {
        ad: 'Ayşe Yılmaz',
        donem: 'guz',
        bolumler,
        // Makine'nin 0. saati (13:15), Bilgisayar'ın 1. saatinden (09:15) SONRA.
        bolumSaatleri: {
          bilgisayar: ['08:15-09:00', '09:15-10:00'],
          makine: ['13:15-14:00'],
        },
      }
    );
    expect(kayitlar.map((k) => k.dersKodu)).toEqual(['GEC', 'ERKEN']);
  });
});
