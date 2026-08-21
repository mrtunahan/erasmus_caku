// Seviyeler arası akademisyen çakışması.
//
// İstek: "Bir akademisyenin lisans ders programı belli olduktan sonra
// lisansüstü programı yapılırken (ya da tersi) iki program çakışmamalı;
// 'akademisyenin o saatte dersi var' uyarısı gerekli."
//
// Zorluk: iki seviyenin saat ayarı ayrıdır. Aynı slot indeksi iki seviyede
// iki farklı zamandır, etiketler de birebir tutmayabilir.
import { describe, it, expect } from 'vitest';
import { slotDersleri } from '../lib/ders-slot.js';
import {
  dersAraligi,
  kesisiyorMu,
  programGirdileri,
  akademisyenCakismalari,
  cakismaMetni,
} from '../lib/seviye-cakisma.js';

const dersleri = (slot) => (Array.isArray(slot) ? slot : slot ? [slot] : []);

describe('dersAraligi', () => {
  it('etiketten başlangıç ve bitiş çözülür', () => {
    expect(dersAraligi('08:15-09:00')).toEqual({ bas: 495, bit: 540 });
  });

  it('bitiş okunamazsa ders süresi kadar sayılır', () => {
    expect(dersAraligi('13:15')).toEqual({ bas: 795, bit: 840 });
  });

  it('çözülemeyen etiket null döner — tahmin edilmez', () => {
    expect(dersAraligi('')).toBeNull();
    expect(dersAraligi('öğleden sonra')).toBeNull();
  });
});

describe('kesisiyorMu', () => {
  it('uç uca gelen dersler çakışmaz', () => {
    expect(kesisiyorMu(dersAraligi('08:15-09:00'), dersAraligi('09:00-09:45'))).toBe(false);
  });

  it('KISMİ binişme çakışmadır — etiketler farklı olsa da', () => {
    // Lisans 08:15'te, lisansüstü 08:30'da başlıyor: etiket eşitliğine
    // bakan bir kural bunu kaçırırdı.
    expect(kesisiyorMu(dersAraligi('08:15-09:00'), dersAraligi('08:30-09:15'))).toBe(true);
  });
});

describe('programGirdileri', () => {
  const saatler = ['08:15-09:00', '09:15-10:00'];

  it('slotları zaman aralıklı kayıtlara çevirir', () => {
    const g = programGirdileri(
      { Pazartesi_0: [{ courseCode: 'BIL101', instructor: 'Ayşe Yılmaz' }] },
      saatler,
      { seviye: 'lisans', kaynak: 'd1' },
      dersleri
    );
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ gun: 'Pazartesi', saat: '08:15-09:00', bas: 495, bit: 540 });
    expect(g[0].seviye).toBe('lisans');
  });

  it('saati çözülemeyen slot karşılaştırmaya girmez', () => {
    const g = programGirdileri({ Pazartesi_7: [{ courseCode: 'X' }] }, saatler, {}, dersleri);
    expect(g).toEqual([]);
  });

  it('bozuk anahtarda çökmez', () => {
    expect(programGirdileri({ bozuk: [{}] }, saatler, {}, dersleri)).toEqual([]);
    expect(programGirdileri(null, null, null, dersleri)).toEqual([]);
  });
});

describe('akademisyenCakismalari', () => {
  const lisans = programGirdileri(
    { Pazartesi_0: [{ courseCode: 'BIL101', instructor: 'Ayşe Yılmaz', classroom: 'D1' }] },
    ['08:15-09:00'],
    { seviye: 'lisans', seviyeAd: 'Lisans', bolumAdi: 'Bilgisayar', sinif: '1', kaynak: 'L' },
    dersleri
  );

  const ustuGirdi = (saat, kod, hoca) =>
    programGirdileri(
      { Pazartesi_0: [{ courseCode: kod, instructor: hoca }] },
      [saat],
      { seviye: 'doktora', seviyeAd: 'Doktora', bolumAdi: 'Bilgisayar', kaynak: 'D' },
      dersleri
    );

  it('ASIL İSTEK: lisansüstü ders lisans dersiyle aynı saate düşerse uyarır', () => {
    const c = akademisyenCakismalari(ustuGirdi('08:15-09:00', 'BIL501', 'Ayşe Yılmaz'), lisans);
    expect(c).toHaveLength(1);
    expect(c[0].akademisyen).toBe('Ayşe Yılmaz');
    expect(cakismaMetni(c[0])).toContain('BIL501');
    expect(cakismaMetni(c[0])).toContain('Lisans');
  });

  it('saatler kısmen binişiyorsa da uyarır', () => {
    const c = akademisyenCakismalari(ustuGirdi('08:30-09:15', 'BIL501', 'Ayşe Yılmaz'), lisans);
    expect(c).toHaveLength(1);
  });

  it('ders bitince başlayan lisansüstü dersi çakışmaz', () => {
    expect(
      akademisyenCakismalari(ustuGirdi('09:15-10:00', 'BIL501', 'Ayşe Yılmaz'), lisans)
    ).toEqual([]);
  });

  it('BAŞKA akademisyenin dersi çakışma değildir', () => {
    expect(akademisyenCakismalari(ustuGirdi('08:15-09:00', 'BIL501', 'Ali Demir'), lisans)).toEqual(
      []
    );
  });

  it('ad yazımındaki boşluk/büyük harf farkı çakışmayı gizlemez', () => {
    const c = akademisyenCakismalari(ustuGirdi('08:15-09:00', 'BIL501', ' AYŞE  YILMAZ '), lisans);
    expect(c).toHaveLength(1);
  });

  it('AYNI ders kodu iki programda görünüyorsa çakışma değildir', () => {
    // Ortak ders: aynı ders hem lisans hem lisansüstü belgesinde durabilir.
    expect(
      akademisyenCakismalari(ustuGirdi('08:15-09:00', 'BIL101', 'Ayşe Yılmaz'), lisans)
    ).toEqual([]);
  });

  it('akademisyeni yazılmamış ders taramaya girmez', () => {
    expect(akademisyenCakismalari(ustuGirdi('08:15-09:00', 'BIL501', ''), lisans)).toEqual([]);
  });

  it('tek liste verilince kendi içinde taranır ve çift sayılmaz', () => {
    const iki = [
      ...ustuGirdi('08:15-09:00', 'A1', 'Ayşe Yılmaz'),
      ...programGirdileri(
        { Pazartesi_0: [{ courseCode: 'A2', instructor: 'Ayşe Yılmaz' }] },
        ['08:15-09:00'],
        { seviye: 'doktora', kaynak: 'D2' },
        dersleri
      ),
    ];
    expect(akademisyenCakismalari(iki)).toHaveLength(1);
  });

  it('aynı hücredeki iki ders çakışma değildir — bölme kasıtlıdır', () => {
    const bolunmus = programGirdileri(
      {
        Pazartesi_0: [
          { courseCode: 'KML312', instructor: 'Ayşe Yılmaz' },
          { courseCode: 'TLK543', instructor: 'Ayşe Yılmaz' },
        ],
      },
      ['08:15-09:00'],
      { seviye: 'lisans', kaynak: 'L' },
      dersleri
    );
    expect(akademisyenCakismalari(bolunmus)).toEqual([]);
  });

  it('boş girdilerde çökmez', () => {
    expect(akademisyenCakismalari(null, null)).toEqual([]);
    expect(cakismaMetni(null)).toBe('');
  });
});

// ── GERÇEK SLOT BİÇİMİYLE ──
// Üretimde çözücü `slotDersleri`dir: slot bir NESNEDİR, ek dersler
// `ekDersler` altında durur. Kural bu biçimle de çalışmalı.
describe('programGirdileri — gerçek slot biçimi', () => {
  it('slotDersleri ile nesne biçimli slot okunur', () => {
    const g = programGirdileri(
      {
        Salı_1: {
          courseCode: 'BIL501',
          courseName: 'İleri Algoritmalar',
          instructor: 'Ayşe Yılmaz',
          classroom: 'D2',
        },
      },
      ['09:15-10:00', '10:15-11:00'],
      { seviye: 'doktora', kaynak: 'D' },
      slotDersleri
    );
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({
      gun: 'Salı',
      saat: '10:15-11:00',
      dersKodu: 'BIL501',
      akademisyen: 'Ayşe Yılmaz',
    });
  });

  it('bölünmüş hücredeki ek ders de okunur ve kendi arasında çakışmaz', () => {
    const g = programGirdileri(
      {
        Salı_0: {
          courseCode: 'BIL501',
          instructor: 'Ayşe Yılmaz',
          dersler: [{ courseCode: 'BIL601', instructor: 'Ayşe Yılmaz' }],
        },
      },
      ['09:15-10:00'],
      { seviye: 'doktora', kaynak: 'D' },
      slotDersleri
    );
    expect(g).toHaveLength(2);
    expect(akademisyenCakismalari(g)).toEqual([]);
  });
});
