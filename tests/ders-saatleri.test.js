import { describe, it, expect } from 'vitest';
import {
  DERS_DK,
  EN_COK_SAAT,
  TENEFFUS_DK,
  VARSAYILAN_AYAR,
  ayarNormalize,
  ayarOzeti,
  birlesikEksen,
  bolumAyari,
  bolumSaatleri,
  dakikaya,
  eksenHaritasi,
  etiketBaslangici,
  saatEtiketleri,
  saatMetni,
  seviyeAnahtari,
  slotlariEksene,
} from '../lib/ders-saatleri.js';
import { PROGRAM_SAATLERI } from '../lib/akademisyen-programi.js';

describe('dakikaya / saatMetni', () => {
  it('saat metnini dakikaya çevirir', () => {
    expect(dakikaya('08:15')).toBe(495);
    expect(dakikaya('00:00')).toBe(0);
    expect(dakikaya('23:59')).toBe(1439);
  });

  it('geçersiz saatte null döner', () => {
    ['', null, '24:00', '8', '08:60', 'sekiz', '08:1'].forEach((v) =>
      expect(dakikaya(v)).toBe(null)
    );
  });

  it('tek haneli saat kabul edilir', () => {
    expect(dakikaya('8:15')).toBe(495);
  });

  it('dakikadan saate döner', () => {
    expect(saatMetni(495)).toBe('08:15');
    expect(saatMetni(0)).toBe('00:00');
    expect(saatMetni(1440)).toBe('24:00');
  });
});

describe('ayarNormalize', () => {
  it('eksik alan varsayılana düşer', () => {
    expect(ayarNormalize({}, 'lisans')).toEqual(VARSAYILAN_AYAR.lisans);
    expect(ayarNormalize(null, 'doktora')).toEqual(VARSAYILAN_AYAR.lisansustu);
  });

  it('geçerli ayar korunur', () => {
    expect(ayarNormalize({ baslangic: '08:30', bitis: '18:00' }, 'lisans')).toEqual({
      baslangic: '08:30',
      bitis: '18:00',
    });
  });

  it('BOZUK aralık (bitiş başlangıçtan önce) tamamen yok sayılır', () => {
    // Yarım kayıt programı boşaltmamalı — varsayılana dönülür.
    expect(ayarNormalize({ baslangic: '17:00', bitis: '09:00' }, 'lisans')).toEqual(
      VARSAYILAN_AYAR.lisans
    );
  });

  it('bir dersin sığmadığı aralık da yok sayılır', () => {
    expect(ayarNormalize({ baslangic: '08:15', bitis: '08:45' }, 'lisans')).toEqual(
      VARSAYILAN_AYAR.lisans
    );
  });

  it('yalnız biri bozuksa o alan varsayılandan gelir', () => {
    expect(ayarNormalize({ baslangic: 'abc', bitis: '18:00' }, 'lisans')).toEqual({
      baslangic: '08:15',
      bitis: '18:00',
    });
  });
});

describe('seviyeAnahtari / bolumAyari', () => {
  it('lisans dışındaki her seviye lisansüstüdür', () => {
    expect(seviyeAnahtari('lisans')).toBe('lisans');
    expect(seviyeAnahtari('')).toBe('lisans');
    expect(seviyeAnahtari('yukseklisans')).toBe('lisansustu');
    expect(seviyeAnahtari('doktora')).toBe('lisansustu');
  });

  it('kayıttan doğru seviyenin ayarını alır', () => {
    const kayit = { lisans: { baslangic: '09:00', bitis: '16:00' } };
    expect(bolumAyari(kayit, 'lisans').baslangic).toBe('09:00');
    expect(bolumAyari(kayit, 'doktora')).toEqual(VARSAYILAN_AYAR.lisansustu);
  });

  it('kayıt yoksa varsayılan', () => {
    expect(bolumAyari(null, 'lisans')).toEqual(VARSAYILAN_AYAR.lisans);
  });
});

describe('saatEtiketleri', () => {
  it('45 dakika ders + 15 dakika teneffüs ritmi', () => {
    expect(DERS_DK).toBe(45);
    expect(TENEFFUS_DK).toBe(15);
    expect(saatEtiketleri({ baslangic: '08:15', bitis: '11:00' })).toEqual([
      '08:15-09:00',
      '09:15-10:00',
      '10:15-11:00',
    ]);
  });

  it('BAŞLANGIÇ değişince tüm ızgara kayar', () => {
    expect(saatEtiketleri({ baslangic: '08:30', bitis: '11:15' })).toEqual([
      '08:30-09:15',
      '09:30-10:15',
      '10:30-11:15',
    ]);
  });

  it('bitişi AŞAN ders yazılmaz', () => {
    // 11:15-12:00 bitişi (11:30) aşardı; yazılmaz.
    expect(saatEtiketleri({ baslangic: '08:15', bitis: '11:30' })).toHaveLength(3);
  });

  it('VARSAYILAN lisans ayarı bugünkü ızgarayla birebir aynı', () => {
    // Kayıtlı programlar saat İNDEKSİYLE duruyor; varsayılan liste değişirse
    // ayar yapmamış bölümlerin dersleri başka saatte görünürdü.
    expect(saatEtiketleri(VARSAYILAN_AYAR.lisans)).toEqual(PROGRAM_SAATLERI.slice(0, 9));
  });

  it('VARSAYILAN lisansüstü ayarı on dört satırın tamamını verir', () => {
    expect(saatEtiketleri(VARSAYILAN_AYAR.lisansustu)).toEqual(PROGRAM_SAATLERI);
  });

  it('bozuk ayar sonsuz satır üretmez', () => {
    expect(saatEtiketleri({ baslangic: '00:00', bitis: '23:59' }).length).toBeLessThanOrEqual(
      EN_COK_SAAT
    );
  });

  it('bolumSaatleri kayıttan doğrudan etiket verir', () => {
    expect(bolumSaatleri({ lisans: { baslangic: '09:00', bitis: '11:45' } }, 'lisans')).toEqual([
      '09:00-09:45',
      '10:00-10:45',
      '11:00-11:45',
    ]);
  });
});

describe('birlesikEksen / eksenHaritasi', () => {
  const a = saatEtiketleri({ baslangic: '08:15', bitis: '11:00' }); // 3 satır
  const b = saatEtiketleri({ baslangic: '08:30', bitis: '11:15' }); // 3 satır

  it('farklı başlangıçlı bölümler SAATE göre sıralanır', () => {
    expect(birlesikEksen([a, b])).toEqual([
      '08:15-09:00',
      '08:30-09:15',
      '09:15-10:00',
      '09:30-10:15',
      '10:15-11:00',
      '10:30-11:15',
    ]);
  });

  it('aynı saatler tekrarlanmaz', () => {
    expect(birlesikEksen([a, a, a])).toEqual(a);
  });

  it('bölümün indeksi eksendeki doğru satıra düşer', () => {
    const eksen = birlesikEksen([a, b]);
    expect(eksenHaritasi(a, eksen)).toEqual([0, 2, 4]);
    expect(eksenHaritasi(b, eksen)).toEqual([1, 3, 5]);
  });

  it('eksende olmayan etiket -1 verir', () => {
    expect(eksenHaritasi(['23:00-23:45'], a)).toEqual([-1]);
  });

  it('boş girdide çökmez', () => {
    expect(birlesikEksen(null)).toEqual([]);
    expect(birlesikEksen([null, []])).toEqual([]);
    expect(eksenHaritasi(null, a)).toEqual([]);
  });

  it('çözülemeyen etiket sona düşer ama KAYBOLMAZ', () => {
    expect(birlesikEksen([['bilinmeyen'], a])).toEqual([...a, 'bilinmeyen']);
  });
});

describe('etiketBaslangici', () => {
  it('etiketin başlangıç dakikasını verir', () => {
    expect(etiketBaslangici('08:15-09:00')).toBe(495);
    expect(etiketBaslangici(' 8:15 - 9:00')).toBe(495);
  });

  it('çözülemeyen etiket sonsuzdur', () => {
    expect(etiketBaslangici('öğle arası')).toBe(Infinity);
    expect(etiketBaslangici(null)).toBe(Infinity);
  });
});

describe('ayarOzeti', () => {
  it('okunur özet verir', () => {
    expect(ayarOzeti({ baslangic: '08:15', bitis: '17:00' })).toBe('08:15 – 17:00 · 9 ders saati');
  });
});

describe('slotlariEksene', () => {
  const slotlar = { Pazartesi_0: { courseCode: 'A' }, Cuma_2: { courseCode: 'B' } };

  it('saat indeksini yeni eksene taşır', () => {
    expect(slotlariEksene(slotlar, [1, 3, 5])).toEqual({
      Pazartesi_1: { courseCode: 'A' },
      Cuma_5: { courseCode: 'B' },
    });
  });

  it('eksende yeri olmayan saat DÜŞÜRÜLÜR', () => {
    expect(slotlariEksene(slotlar, [0, 1, -1])).toEqual({ Pazartesi_0: { courseCode: 'A' } });
  });

  it('haritada olmayan indeks düşürülür', () => {
    expect(slotlariEksene(slotlar, [0])).toEqual({ Pazartesi_0: { courseCode: 'A' } });
  });

  it('çok kelimeli gün adı bozulmaz', () => {
    expect(slotlariEksene({ 'Cumartesi Ek_0': { x: 1 } }, [4])).toEqual({
      'Cumartesi Ek_4': { x: 1 },
    });
  });

  it('bozuk anahtar atlanır, boş girdide çökmez', () => {
    expect(slotlariEksene({ bozuk: {} }, [0])).toEqual({});
    expect(slotlariEksene(null, null)).toEqual({});
  });

  it('birleşik eksende iki bölüm doğru satırlara düşer', () => {
    const a = saatEtiketleri({ baslangic: '08:15', bitis: '11:00' });
    const b = saatEtiketleri({ baslangic: '08:30', bitis: '11:15' });
    const eksen = birlesikEksen([a, b]);
    const aSlot = slotlariEksene({ Pazartesi_0: { courseCode: 'ERKEN' } }, eksenHaritasi(a, eksen));
    const bSlot = slotlariEksene({ Pazartesi_0: { courseCode: 'GEC' } }, eksenHaritasi(b, eksen));
    // İkisi de "günün ilk dersi" ama farklı saatte — ayrı satırlara düşmeli.
    expect(Object.keys(aSlot)).toEqual(['Pazartesi_0']);
    expect(Object.keys(bSlot)).toEqual(['Pazartesi_1']);
  });
});
