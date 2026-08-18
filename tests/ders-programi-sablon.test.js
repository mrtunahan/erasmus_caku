import { describe, it, expect } from 'vitest';
import {
  GUN_DEGISKENLERI,
  akademikYilAdi,
  ciktiDosyaAdi,
  ciktiIzgarasi,
  donemAdi,
  programOzeti,
  sablonKunyesi,
  sablonSatirlari,
  seviyeAdi,
  tabloSatirlari,
} from '../lib/ders-programi-sablon.js';

const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const SAATLER = ['08:15-09:00', '09:15-10:00', '10:15-11:00'];
const ders = (kod, o) => ({ courseCode: kod, courseName: kod + ' dersi', ...(o || {}) });

const kaynaklar = [
  {
    deptName: 'Bilgisayar Mühendisliği',
    year: '1',
    slots: {
      Pazartesi_0: ders('BLM101', { instructor: 'Ayşe Yılmaz', classroom: 'D-101' }),
      Cuma_2: ders('BLM103', { instructor: 'Can Su', classroom: 'D-3' }),
    },
  },
  {
    deptName: 'Bilgisayar Mühendisliği',
    year: '2',
    slots: {
      Pazartesi_0: ders('BLM201', { instructor: 'Mehmet Demir', classroom: 'D-205' }),
    },
  },
];

describe('donemAdi / seviyeAdi', () => {
  it('dönem kodunu okunur ada çevirir', () => {
    expect(donemAdi('guz')).toBe('Güz');
    expect(donemAdi('Güz')).toBe('Güz');
    expect(donemAdi('bahar')).toBe('Bahar');
    expect(donemAdi('')).toBe('');
  });

  it('seviye lisans dışındaysa lisansüstüdür', () => {
    expect(seviyeAdi('lisans')).toBe('Lisans');
    expect(seviyeAdi('')).toBe('Lisans');
    expect(seviyeAdi('yukseklisans')).toBe('Lisansüstü');
    expect(seviyeAdi('doktora')).toBe('Lisansüstü');
  });
});

describe('akademikYilAdi', () => {
  it('Eylül ve sonrası YENİ akademik yılı başlatır', () => {
    expect(akademikYilAdi(new Date(2025, 8, 15))).toBe('2025-2026');
    expect(akademikYilAdi(new Date(2025, 11, 31))).toBe('2025-2026');
  });

  it('BAHAR dönemi (takvim yılı ilerlemiş olsa da) aynı akademik yıldadır', () => {
    expect(akademikYilAdi(new Date(2026, 2, 3))).toBe('2025-2026');
    expect(akademikYilAdi(new Date(2026, 7, 31))).toBe('2025-2026');
  });

  it('geçersiz tarihte bugüne düşer', () => {
    expect(akademikYilAdi(new Date('olmayan'))).toMatch(/^\d{4}-\d{4}$/);
    expect(akademikYilAdi(null)).toMatch(/^\d{4}-\d{4}$/);
  });
});

describe('ciktiIzgarasi', () => {
  const izgara = ciktiIzgarasi(
    kaynaklar,
    GUNLER,
    SAATLER.length,
    (slot, k) => slot.courseCode + '/' + k.year
  );

  it('slotları gün ve saate yerleştirir', () => {
    expect(izgara['Pazartesi'][0]).toEqual(['BLM101/1', 'BLM201/2']);
    expect(izgara['Cuma'][2]).toEqual(['BLM103/1']);
    expect(izgara['Salı'][0]).toEqual([]);
  });

  it('ÇOK KELİMELİ gün adı doğru ayrışır (son alt çizgi ayraçtır)', () => {
    const g = ciktiIzgarasi(
      [{ slots: { Pazartesi_0: ders('A'), 'Cumartesi Ek_1': ders('B') } }],
      ['Pazartesi', 'Cumartesi Ek'],
      3,
      (s) => s.courseCode
    );
    expect(g['Cumartesi Ek'][1]).toEqual(['B']);
  });

  it('ızgara dışı gün/saat sessizce atılır', () => {
    const g = ciktiIzgarasi(
      [{ slots: { Cumartesi_0: ders('X'), Pazartesi_99: ders('Y'), bozuk: ders('Z') } }],
      GUNLER,
      SAATLER.length,
      (s) => s.courseCode
    );
    expect(
      Object.values(g).every((saatler) => Object.values(saatler).every((h) => h.length === 0))
    ).toBe(true);
  });

  it('boş girdide çökmez', () => {
    expect(ciktiIzgarasi(null, GUNLER, 3, () => '')['Cuma'][2]).toEqual([]);
  });
});

describe('sablonSatirlari', () => {
  const izgara = ciktiIzgarasi(kaynaklar, GUNLER, SAATLER.length, (slot) => slot.courseCode);

  it('bir satır = bir SAAT, bir alan = bir GÜN', () => {
    const satirlar = sablonSatirlari(izgara, GUNLER, SAATLER);
    expect(satirlar[0].saat).toBe('08:15-09:00');
    expect(satirlar[0].pazartesi).toBe('BLM101\n\nBLM201');
    expect(satirlar[0].cuma).toBe('');
  });

  it('BOŞ saat satırı atlanır', () => {
    const satirlar = sablonSatirlari(izgara, GUNLER, SAATLER);
    expect(satirlar.map((s) => s.saat)).toEqual(['08:15-09:00', '10:15-11:00']);
  });

  it('bosSaatler seçeneğiyle tüm saatler yazılır', () => {
    const satirlar = sablonSatirlari(izgara, GUNLER, SAATLER, { bosSaatler: true });
    expect(satirlar).toHaveLength(3);
    expect(satirlar[1].pazartesi).toBe('');
  });

  it('alan adları gün değişkenleriyle birebir', () => {
    const satir = sablonSatirlari(izgara, GUNLER, SAATLER)[0];
    Object.values(GUN_DEGISKENLERI).forEach((id) => expect(satir).toHaveProperty(id));
  });
});

describe('tabloSatirlari', () => {
  it('başlık satırı + yalnız dolu saatler', () => {
    const izgara = ciktiIzgarasi(kaynaklar, GUNLER, SAATLER.length, (slot) => slot.courseCode);
    const satirlar = tabloSatirlari(izgara, GUNLER, SAATLER, 3);
    expect(satirlar[0]).toEqual(['Saat', ...GUNLER]);
    expect(satirlar).toHaveLength(3);
    expect(satirlar[1][0]).toEqual({ v: '08:15-09:00', stil: 3 });
    expect(satirlar[1][1]).toBe('BLM101\n\nBLM201');
  });
});

describe('programOzeti', () => {
  it('ders kodu tekrarsız, ders saati DOLU HÜCRE sayısıdır', () => {
    const o = programOzeti(kaynaklar);
    expect(o.dersSayisi).toBe(3);
    expect(o.dersSaati).toBe(3);
    expect(o.bolumler).toEqual(['Bilgisayar Mühendisliği']);
  });

  it('bölünmüş hücre TEK ders saatidir ama iki ders sayar', () => {
    const o = programOzeti([{ slots: { Pazartesi_0: { ...ders('A'), dersler: [ders('B')] } } }]);
    expect(o.dersSaati).toBe(1);
    expect(o.dersSayisi).toBe(2);
  });

  it('boş slot ders saati saymaz', () => {
    expect(programOzeti([{ slots: { Pazartesi_0: {} } }]).dersSaati).toBe(0);
  });
});

describe('sablonKunyesi', () => {
  it('kurum · fakülte · bölüm · dönem · tarih künyeye girer', () => {
    const k = sablonKunyesi({
      kurumAd: 'Çankırı Karatekin Üniversitesi',
      fakulteAd: 'Mühendislik Fakültesi',
      bolumAd: 'Bilgisayar Mühendisliği',
      donem: 'guz',
      tarih: new Date(2025, 9, 6),
      ozet: programOzeti(kaynaklar),
    });
    expect(k.kurumAd).toBe('Çankırı Karatekin Üniversitesi');
    expect(k.fakulteAd).toBe('Mühendislik Fakültesi');
    expect(k.bolumAd).toBe('Bilgisayar Mühendisliği');
    expect(k.donem).toBe('Güz');
    expect(k.akademikYil).toBe('2025-2026');
    expect(k.tarih).toBe(new Date(2025, 9, 6).toLocaleDateString('tr-TR'));
    expect(k.dersSayisi).toBe('3');
    expect(k.dersSaati).toBe('3');
  });

  it('verilen akademik yıl hesaplananın önüne geçer', () => {
    expect(sablonKunyesi({ akademikYil: '2030-2031' }).akademikYil).toBe('2030-2031');
  });

  it('eksik alanlar boş dize olur (belgede "undefined" yazmaz)', () => {
    const k = sablonKunyesi({});
    expect(k.kurumAd).toBe('');
    expect(k.fakulteAd).toBe('');
    expect(k.hazirlayan).toBe('');
    expect(k.seviyeAd).toBe('Lisans');
  });
});

describe('ciktiDosyaAdi', () => {
  it('Türkçe harfleri ASCII yapar ve uzantı ekler', () => {
    expect(ciktiDosyaAdi(['Bilgisayar Mühendisliği', 'Güz', '2025-2026'], 'xlsx')).toBe(
      'Bilgisayar Muhendisligi Guz 2025-2026.xlsx'
    );
  });

  it('dosya adında geçersiz karakter bırakmaz', () => {
    expect(ciktiDosyaAdi(['A/B:C*D'], 'docx')).toBe('A B C D.docx');
  });

  it('hepsi boşsa yine geçerli bir ad döner', () => {
    expect(ciktiDosyaAdi([], 'xlsx')).toBe('ders programi.xlsx');
  });
});
