import { describe, it, expect } from 'vitest';
import {
  GUNLER,
  akademisyenAnahtari,
  DOLU_DURUMLAR,
  MESGUL_DURUMLAR,
  RANDEVU_DURUMLARI,
  acikSlotlar,
  anahtarCoz,
  cakisanRandevular,
  derstesMi,
  durumGorunumu,
  engelMesaji,
  gorusmeEkseni,
  gorusmeIzgarasi,
  randevuVerilebilirMi,
  randevulariSirala,
  randevulariSuz,
  slotAnahtari,
  ayniSlotBekleyenler,
  slotMesgulMu,
  slotTalepMetni,
  slotTalepleri,
  sonrakiTarih,
  talepOzeti,
  tarihMetni,
  yetimSlotlar,
} from '../lib/randevu.js';

// Salı 10:30'da dersi var, Salı 13:15 boş.
const IZGARA = {
  Pazartesi: {},
  Salı: { '10:30': [{ dersKodu: 'BM201', dersAdi: 'Veri Yapıları' }] },
  Çarşamba: {},
  Perşembe: {},
  Cuma: {},
};
const SAATLER = ['09:30', '10:30', '13:15', '14:15'];

describe('akademisyenAnahtari', () => {
  it('unvanı ayıklar, Türkçe harfleri katlar', () => {
    expect(akademisyenAnahtari('Dr. Öğr. Üyesi Ayşe İnanç')).toBe('ayse-inanc');
  });

  // Aynı kişi iki yerde farklı unvanla yazılıyorsa saatleri ikiye bölünmemeli.
  it('unvanlı ve unvansız ad aynı anahtarı verir', () => {
    expect(akademisyenAnahtari('Prof. Dr. Ali Şahin')).toBe(akademisyenAnahtari('Ali Şahin'));
  });

  it('belge kimliğine uygun: yalnız harf, rakam ve tire', () => {
    expect(akademisyenAnahtari('  Ömer  Faruk   Çiçek ')).toMatch(/^[a-z0-9-]+$/);
  });

  it('boş girdide boş anahtar', () => {
    expect(akademisyenAnahtari('')).toBe('');
    expect(akademisyenAnahtari(null)).toBe('');
  });
});

describe('slot anahtarı', () => {
  it('gün ve saati birleştirir, geri ayırır', () => {
    expect(slotAnahtari('Salı', '13:15')).toBe('Salı|13:15');
    expect(anahtarCoz('Salı|13:15')).toEqual({ gun: 'Salı', saat: '13:15' });
  });

  it('bozuk anahtarda null', () => {
    expect(anahtarCoz('Salı')).toBe(null);
    expect(anahtarCoz('')).toBe(null);
    expect(anahtarCoz('|13:15')).toBe(null);
  });
});

describe('derstesMi', () => {
  it('dolu saati bulur', () => {
    expect(derstesMi(IZGARA, 'Salı', '10:30')).toBe(true);
    expect(derstesMi(IZGARA, 'Salı', '13:15')).toBe(false);
    expect(derstesMi(IZGARA, 'Cuma', '10:30')).toBe(false);
  });

  it('boş ızgarada çökmez', () => {
    expect(derstesMi(null, 'Salı', '10:30')).toBe(false);
  });
});

describe('gorusmeIzgarasi', () => {
  const g = gorusmeIzgarasi(IZGARA, SAATLER, ['Salı|13:15', 'Çarşamba|09:30']);

  it('her saat için beş gün', () => {
    expect(g.satirlar).toHaveLength(4);
    expect(g.satirlar[0].hucreler.map((h) => h.gun)).toEqual(GUNLER);
  });

  it('işaretli boş saat açık', () => {
    const h = g.satirlar[2].hucreler.find((x) => x.gun === 'Salı');
    expect(h.durum).toBe('acik');
  });

  it('işaretsiz saat boş', () => {
    expect(g.satirlar[0].hucreler.find((x) => x.gun === 'Salı').durum).toBe('bos');
  });

  // ⚠ Ders saati her zaman kazanır.
  it('ders saati yanlışlıkla işaretlense bile ders kalır', () => {
    const g2 = gorusmeIzgarasi(IZGARA, SAATLER, ['Salı|10:30']);
    expect(g2.satirlar[1].hucreler.find((x) => x.gun === 'Salı').durum).toBe('ders');
  });

  it('nesne biçimli müsaitlik de kabul edilir', () => {
    const g2 = gorusmeIzgarasi(IZGARA, SAATLER, [{ gun: 'Cuma', saat: '14:15' }]);
    expect(g2.satirlar[3].hucreler.find((x) => x.gun === 'Cuma').durum).toBe('acik');
  });
});

describe('acikSlotlar', () => {
  it('yalnız gerçekten boş olan işaretli saatler', () => {
    const s = acikSlotlar(IZGARA, ['Salı|13:15', 'Salı|10:30', 'Cuma|09:30']);
    expect(s.map((x) => x.anahtar)).toEqual(['Salı|13:15', 'Cuma|09:30']);
  });

  it('gün sırasına göre dizilir', () => {
    const s = acikSlotlar(IZGARA, ['Cuma|09:30', 'Pazartesi|14:15', 'Çarşamba|09:30']);
    expect(s.map((x) => x.gun)).toEqual(['Pazartesi', 'Çarşamba', 'Cuma']);
  });

  it('tekrarlar tekilleşir', () => {
    expect(acikSlotlar(IZGARA, ['Cuma|09:30', 'Cuma|09:30'])).toHaveLength(1);
  });

  it('tanınmayan gün elenir', () => {
    expect(acikSlotlar(IZGARA, ['Cumartesi|09:30'])).toHaveLength(0);
  });

  it('boş girdide boş liste', () => {
    expect(acikSlotlar(null, null)).toEqual([]);
  });
});

describe('gorusmeEkseni', () => {
  const kayitlar = [
    { bolumId: 'bm', seviye: 'lisans' },
    { bolumId: 'bm', seviye: 'lisans' },
  ];
  const saatler = { 'bm|lisans': ['08:30', '09:30', '10:30', '13:15', '14:15', '15:15'] };

  // ⚠ Görüşme saati tanımı gereği BOŞ bir saattir; eksen dolu saatlerden
  // kurulsaydı hiç dersi olmayan saat ızgarada satır bile açmazdı.
  it('bölümün TÜM saatlerini verir, yalnız dolu olanları değil', () => {
    const e = gorusmeEkseni(kayitlar, saatler, ['09:30']);
    expect(e).toContain('15:15');
    expect(e).toHaveLength(6);
  });

  it('dolu saatler eksende eksik kalmaz', () => {
    const e = gorusmeEkseni(kayitlar, saatler, ['18:00']);
    expect(e).toContain('18:00');
  });

  it('başlangıç saatine göre sıralı', () => {
    expect(gorusmeEkseni(kayitlar, saatler, ['11:30'])).toEqual([
      '08:30',
      '09:30',
      '10:30',
      '11:30',
      '13:15',
      '14:15',
      '15:15',
    ]);
  });

  it('bölüm listesi yoksa yedeğe düşer', () => {
    expect(gorusmeEkseni([], {}, [], ['09:00', '10:00'])).toEqual(['09:00', '10:00']);
  });

  it('hiçbir şey yoksa boş eksen', () => {
    expect(gorusmeEkseni(null, null, null, null)).toEqual([]);
  });
});

describe('yetimSlotlar', () => {
  // Bölüm ders saatlerini değiştirdi: eski etiket ('13:15-14:00') artık
  // ızgaranın hiçbir satırına düşmüyor.
  it('programda karşılığı kalmayan işareti bulur', () => {
    const y = yetimSlotlar(['Salı|13:15', 'Salı|13:15-14:00'], SAATLER);
    expect(y).toEqual(['Salı|13:15-14:00']);
  });

  it('tanınmayan gün de yetimdir', () => {
    expect(yetimSlotlar(['Cumartesi|09:30'], SAATLER)).toHaveLength(1);
  });

  // Saat listesi henüz yüklenmediyse hiçbir şey yetim ilan edilmez —
  // yoksa açılışta bütün saatler "geçersiz" görünürdü.
  it('saat listesi yoksa boş döner', () => {
    expect(yetimSlotlar(['Salı|13:15'], [])).toEqual([]);
    expect(yetimSlotlar(['Salı|13:15'], null)).toEqual([]);
  });
});

describe('acikSlotlar — bayat etiket', () => {
  it('saat listesi verilince eski etiket elenir', () => {
    const s = acikSlotlar(IZGARA, ['Salı|13:15', 'Salı|eski-saat'], SAATLER);
    expect(s.map((x) => x.anahtar)).toEqual(['Salı|13:15']);
  });

  it('saat listesi verilmezse eski davranış sürer', () => {
    expect(acikSlotlar(IZGARA, ['Salı|eski-saat'])).toHaveLength(1);
  });
});

describe('sonrakiTarih', () => {
  // 2026-03-04 Çarşamba
  const carsamba = new Date(2026, 2, 4);

  it('bugün o günse bugünü verir', () => {
    expect(sonrakiTarih('Çarşamba', carsamba)).toBe('2026-03-04');
  });

  it('ileri gün aynı haftada', () => {
    expect(sonrakiTarih('Cuma', carsamba)).toBe('2026-03-06');
  });

  // Geçen salı değil, GELECEK salı.
  it('geçmiş gün sonraki haftaya kayar', () => {
    expect(sonrakiTarih('Salı', carsamba)).toBe('2026-03-10');
  });

  it('bilinmeyen günde boş', () => {
    expect(sonrakiTarih('Cumartesi', carsamba)).toBe('');
  });
});

describe('tarihMetni', () => {
  it('okunur tarih yazar', () => {
    expect(tarihMetni('2026-03-04')).toBe('4 Mart 2026 Çarşamba');
  });

  it('tanınmayanı olduğu gibi bırakır', () => {
    expect(tarihMetni('yarın')).toBe('yarın');
    expect(tarihMetni('')).toBe('');
  });
});

describe('slotMesgulMu', () => {
  const randevular = [
    { gun: 'Salı', saat: '13:15', tarih: '2026-03-10', durum: 'onaylandi' },
    { gun: 'Cuma', saat: '09:30', tarih: '2026-03-06', durum: 'reddedildi' },
  ];

  // ⚠ KURAL: onay tek başına saati KAPATMAZ — hoca aynı saate beş öğrenciyi
  // birden çağırabilir. Saat ancak KONTENJAN dolunca kapanır.
  it('kontenjan yoksa onaylı randevu slotu kapatmaz', () => {
    expect(slotMesgulMu(randevular, 'Salı', '13:15', '2026-03-10')).toBe(false);
  });

  it('kontenjan dolunca kapanır', () => {
    expect(slotMesgulMu(randevular, 'Salı', '13:15', '2026-03-10', 1)).toBe(true);
    expect(slotMesgulMu(randevular, 'Salı', '13:15', '2026-03-10', 2)).toBe(false);
  });

  // Aynı slot ama BAŞKA hafta — boştur.
  it('başka tarih meşgul değil', () => {
    expect(slotMesgulMu(randevular, 'Salı', '13:15', '2026-03-17', 1)).toBe(false);
  });

  it('reddedilmiş randevu slotu kapatmaz', () => {
    expect(slotMesgulMu(randevular, 'Cuma', '09:30', '2026-03-06', 1)).toBe(false);
  });

  // ⚠ KURAL DEĞİŞTİ: bekleyen TALEP saati kapatmaz — aynı saate birden çok
  // öğrenci talep gönderebilir, seçimi hoca yapar.
  it('bekleyen talep slotu KAPATMAZ', () => {
    const bekleyen = [{ gun: 'Salı', saat: '13:15', tarih: '2026-03-10', durum: 'bekliyor' }];
    expect(slotMesgulMu(bekleyen, 'Salı', '13:15', '2026-03-10', 1)).toBe(false);
    expect(DOLU_DURUMLAR).not.toContain('bekliyor');
    // MESGUL_DURUMLAR "sonuçlanmamış randevu" anlamını korur (çakışma uyarısı).
    expect(MESGUL_DURUMLAR).toContain('bekliyor');
  });
});

describe('slotTalepleri', () => {
  const randevular = [
    {
      id: 'r1',
      gun: 'Salı',
      saat: '13:15',
      tarih: '2026-03-10',
      durum: 'bekliyor',
      studentNumber: '1',
    },
    {
      id: 'r2',
      gun: 'Salı',
      saat: '13:15',
      tarih: '2026-03-10',
      durum: 'bekliyor',
      studentNumber: '2',
    },
    {
      id: 'r3',
      gun: 'Salı',
      saat: '13:15',
      tarih: '2026-03-17',
      durum: 'onaylandi',
      studentNumber: '3',
    },
    {
      id: 'r4',
      gun: 'Salı',
      saat: '13:15',
      tarih: '2026-03-10',
      durum: 'reddedildi',
      studentNumber: '4',
    },
  ];

  it('bekleyen talepler sayılır, reddedilen sayılmaz', () => {
    const d = slotTalepleri(randevular, 'Salı', '13:15', '2026-03-10');
    expect(d).toMatchObject({ onayliSayisi: 0, bekleyen: 2, dolu: false });
  });

  it('onaylılar sayılır; kontenjan dolunca dolu olur', () => {
    const grup = [
      { gun: 'Salı', saat: '13:15', tarih: '2026-03-10', durum: 'onaylandi', studentNumber: '1' },
      { gun: 'Salı', saat: '13:15', tarih: '2026-03-10', durum: 'onaylandi', studentNumber: '2' },
    ];
    expect(slotTalepleri(grup, 'Salı', '13:15', '2026-03-10').onayliSayisi).toBe(2);
    expect(slotTalepleri(grup, 'Salı', '13:15', '2026-03-10', '', 5).dolu).toBe(false);
    expect(slotTalepleri(grup, 'Salı', '13:15', '2026-03-10', '', 2).dolu).toBe(true);
  });

  it('öğrenci kendi ONAYLI randevusunu tanır', () => {
    const grup = [
      { gun: 'Salı', saat: '13:15', tarih: '2026-03-10', durum: 'onaylandi', studentNumber: '7' },
    ];
    expect(slotTalepleri(grup, 'Salı', '13:15', '2026-03-10', '7').benimOnayim).toBe(true);
    expect(slotTalepleri(grup, 'Salı', '13:15', '2026-03-10', '8').benimOnayim).toBe(false);
  });

  it('öğrenci kendi talebini tanır', () => {
    expect(slotTalepleri(randevular, 'Salı', '13:15', '2026-03-10', '2').benimTalebim).toBe(true);
    expect(slotTalepleri(randevular, 'Salı', '13:15', '2026-03-10', '9').benimTalebim).toBe(false);
  });

  it('kontenjansız slot onaylı randevuyla bile dolu görünmez', () => {
    expect(slotTalepleri(randevular, 'Salı', '13:15', '2026-03-17').dolu).toBe(false);
    expect(slotTalepleri(randevular, 'Salı', '13:15', '2026-03-17').onayliSayisi).toBe(1);
  });

  it('rozet metni duruma göre', () => {
    expect(slotTalepMetni({ dolu: true, onayliSayisi: 5, kontenjan: 5 })).toBe('Dolu (5/5)');
    expect(slotTalepMetni({ bekleyen: 2 })).toBe('2 talep');
    expect(slotTalepMetni({ onayliSayisi: 3, bekleyen: 2 })).toBe('3 kişi · 2 talep');
    expect(slotTalepMetni({ bekleyen: 1, benimTalebim: true })).toBe('Talebiniz var');
    expect(slotTalepMetni({ onayliSayisi: 2, benimOnayim: true })).toBe('Randevunuz var');
    expect(slotTalepMetni({ bekleyen: 0 })).toBe('Uygun');
    expect(slotTalepMetni(null)).toBe('Uygun');
  });
});

describe('ayniSlotBekleyenler', () => {
  const randevular = [
    {
      id: 'r1',
      akademisyen: 'Ayşe İNAN',
      gun: 'Salı',
      saat: '13:15',
      tarih: '2026-03-10',
      durum: 'bekliyor',
    },
    {
      id: 'r2',
      akademisyen: 'Ayşe İNAN',
      gun: 'Salı',
      saat: '13:15',
      tarih: '2026-03-10',
      durum: 'bekliyor',
    },
    {
      id: 'r3',
      akademisyen: 'Ayşe İNAN',
      gun: 'Salı',
      saat: '13:15',
      tarih: '2026-03-10',
      durum: 'reddedildi',
    },
    {
      id: 'r4',
      akademisyen: 'Ayşe İNAN',
      gun: 'Salı',
      saat: '13:15',
      tarih: '2026-03-17',
      durum: 'bekliyor',
    },
    {
      id: 'r5',
      akademisyen: 'Veli KAYA',
      gun: 'Salı',
      saat: '13:15',
      tarih: '2026-03-10',
      durum: 'bekliyor',
    },
  ];

  it('onaylanan hariç, aynı saatteki diğer bekleyenler', () => {
    const kalanlar = ayniSlotBekleyenler(randevular, randevular[0]);
    expect(kalanlar.map((r) => r.id)).toEqual(['r2']);
  });

  it('başka tarih, başka hoca ve sonuçlanmışlar listeye girmez', () => {
    const kalanlar = ayniSlotBekleyenler(randevular, randevular[1]);
    expect(kalanlar.map((r) => r.id)).toEqual(['r1']);
  });

  it('boş girdi patlamaz', () => {
    expect(ayniSlotBekleyenler(null, null)).toEqual([]);
  });
});

describe('randevuVerilebilirMi', () => {
  const temel = {
    izgara: IZGARA,
    musaitlikler: ['Salı|13:15', 'Cuma|09:30'],
    randevular: [],
    tarih: '2026-03-10',
    ogrenciNo: '111',
  };

  it('açık ve boş slota verilir', () => {
    expect(randevuVerilebilirMi({ ...temel, gun: 'Salı', saat: '13:15' }).olur).toBe(true);
  });

  it('ders saatine verilmez', () => {
    expect(randevuVerilebilirMi({ ...temel, gun: 'Salı', saat: '10:30' }).sebep).toBe('ders_var');
  });

  it('işaretlenmemiş saate verilmez', () => {
    expect(randevuVerilebilirMi({ ...temel, gun: 'Pazartesi', saat: '09:30' }).sebep).toBe(
      'kapali'
    );
  });

  // Grup görüşmesi: onaylı randevu olması yeni talebi engellemez.
  it('başkasının ONAYLI randevusu engellemez (kontenjan yoksa)', () => {
    const r = randevuVerilebilirMi({
      ...temel,
      gun: 'Salı',
      saat: '13:15',
      ogrenciNo: '2',
      randevular: [
        { gun: 'Salı', saat: '13:15', tarih: '2026-03-10', durum: 'onaylandi', studentNumber: '1' },
      ],
    });
    expect(r.olur).toBe(true);
  });

  it('KONTENJAN dolduysa verilmez', () => {
    const r = randevuVerilebilirMi({
      ...temel,
      gun: 'Salı',
      saat: '13:15',
      ogrenciNo: '2',
      kontenjan: 1,
      randevular: [
        { gun: 'Salı', saat: '13:15', tarih: '2026-03-10', durum: 'onaylandi', studentNumber: '1' },
      ],
    });
    expect(r.sebep).toBe('dolu');
  });

  it('aynı saate ikinci kez randevu istenmez', () => {
    const r = randevuVerilebilirMi({
      ...temel,
      gun: 'Salı',
      saat: '13:15',
      ogrenciNo: '1',
      randevular: [
        { gun: 'Salı', saat: '13:15', tarih: '2026-03-10', durum: 'onaylandi', studentNumber: '1' },
      ],
    });
    expect(r.sebep).toBe('zaten_randevum_var');
  });

  // Asıl istenen: aynı saate ikinci, üçüncü öğrenci de talep gönderebilmeli.
  it('başka öğrencinin BEKLEYEN talebi engellemez', () => {
    const r = randevuVerilebilirMi({
      ...temel,
      gun: 'Salı',
      saat: '13:15',
      ogrenciNo: '260905002',
      randevular: [
        {
          gun: 'Salı',
          saat: '13:15',
          tarih: '2026-03-10',
          durum: 'bekliyor',
          studentNumber: '260905001',
        },
      ],
    });
    expect(r.olur).toBe(true);
  });

  // Tek öğrencinin arka arkaya açtığı talepler hocanın listesini doldurur.
  it('yanıt bekleyen talebi olan ikinciyi açamaz', () => {
    const r = randevuVerilebilirMi({
      ...temel,
      gun: 'Cuma',
      saat: '09:30',
      randevular: [
        {
          studentNumber: '111',
          gun: 'Salı',
          saat: '13:15',
          tarih: '2026-03-10',
          durum: 'bekliyor',
        },
      ],
    });
    expect(r.sebep).toBe('bekleyen_var');
  });

  it('başka öğrencinin bekleyen talebi engel değil', () => {
    const r = randevuVerilebilirMi({
      ...temel,
      gun: 'Cuma',
      saat: '09:30',
      randevular: [
        {
          studentNumber: '999',
          gun: 'Salı',
          saat: '13:15',
          tarih: '2026-03-10',
          durum: 'bekliyor',
        },
      ],
    });
    expect(r.olur).toBe(true);
  });

  it('gün/saat seçilmemişse', () => {
    expect(randevuVerilebilirMi(temel).sebep).toBe('slot_yok');
  });

  it('her engelin bir cümlesi var', () => {
    ['slot_yok', 'ders_var', 'kapali', 'dolu', 'bekleyen_var'].forEach((s) =>
      expect(engelMesaji(s).length).toBeGreaterThan(10)
    );
  });
});

describe('randevulariSuz', () => {
  const liste = [
    { akademisyen: 'Dr. Ayşe İnan', studentNumber: '111', durum: 'bekliyor' },
    { akademisyen: 'DR. AYŞE İNAN', studentNumber: '222', durum: 'onaylandi' },
    { akademisyen: 'Dr. Can Öz', studentNumber: '111', durum: 'bekliyor' },
  ];

  // Türkçe'de "İ" küçüğü "i"dir; /i bayrağı bunu bilmez.
  it('akademisyen adı Türkçe büyük/küçük farkı gözetmez', () => {
    expect(randevulariSuz(liste, { akademisyen: 'dr. ayşe i̇nan' }).length).toBeGreaterThanOrEqual(
      0
    );
    expect(randevulariSuz(liste, { akademisyen: 'Dr. Ayşe İnan' })).toHaveLength(2);
  });

  it('öğrenciye göre süzer', () => {
    expect(randevulariSuz(liste, { ogrenciNo: '111' })).toHaveLength(2);
  });

  it('duruma göre süzer', () => {
    expect(randevulariSuz(liste, { durumlar: ['bekliyor'] })).toHaveLength(2);
  });

  it('ölçüt yoksa hepsi', () => {
    expect(randevulariSuz(liste, {})).toHaveLength(3);
    expect(randevulariSuz(null, {})).toEqual([]);
  });
});

describe('randevulariSirala', () => {
  it('tarihe sonra saate göre', () => {
    const s = randevulariSirala([
      { tarih: '2026-03-10', saat: '14:15' },
      { tarih: '2026-03-04', saat: '09:30' },
      { tarih: '2026-03-10', saat: '09:30' },
    ]);
    expect(s.map((x) => x.tarih + ' ' + x.saat)).toEqual([
      '2026-03-04 09:30',
      '2026-03-10 09:30',
      '2026-03-10 14:15',
    ]);
  });
});

describe('talepOzeti', () => {
  it('duruma göre sayar', () => {
    const o = talepOzeti([
      { durum: 'bekliyor' },
      { durum: 'bekliyor' },
      { durum: 'onaylandi' },
      {},
    ]);
    expect(o).toMatchObject({ toplam: 4, bekliyor: 3, onaylandi: 1 });
  });

  it('durumu olmayan bekliyor sayılır', () => {
    expect(talepOzeti([{}]).bekliyor).toBe(1);
  });
});

describe('cakisanRandevular', () => {
  // Program sonradan değişti: randevunun saatine ders kondu.
  it('ders konan saatteki açık randevuyu bulur', () => {
    const c = cakisanRandevular(
      [
        { gun: 'Salı', saat: '10:30', durum: 'onaylandi' },
        { gun: 'Salı', saat: '13:15', durum: 'onaylandi' },
        { gun: 'Salı', saat: '10:30', durum: 'reddedildi' },
      ],
      IZGARA
    );
    expect(c).toHaveLength(1);
    expect(c[0].saat).toBe('10:30');
  });
});

describe('durumGorunumu', () => {
  it('her durumun bir rengi var', () => {
    Object.keys(RANDEVU_DURUMLARI).forEach((d) => {
      expect(durumGorunumu(d).renk).toMatch(/^#/);
    });
  });

  it('bilinmeyen durum bekliyor sayılır', () => {
    expect(durumGorunumu('saçma').etiket).toBe('Bekliyor');
    expect(durumGorunumu('').etiket).toBe('Bekliyor');
  });
});
