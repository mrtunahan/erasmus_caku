import { describe, it, expect } from 'vitest';
import {
  DERS_DK,
  EN_COK_SAAT,
  TENEFFUS_DK,
  VARSAYILAN_AYAR,
  ayarNormalize,
  ayarOzeti,
  blokEtiketleri,
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

describe('ayarNormalize — iki blok', () => {
  const iki = (ob, os) => ({ ogledenOnce: ob, ogledenSonra: os });

  it('eksik alan varsayılana düşer', () => {
    expect(ayarNormalize({}, 'lisans')).toEqual(VARSAYILAN_AYAR.lisans);
    expect(ayarNormalize(null, 'doktora')).toEqual(VARSAYILAN_AYAR.lisansustu);
  });

  it('geçerli iki bloklu ayar korunur', () => {
    const a = iki({ baslangic: '09:00', bitis: '12:00' }, { baslangic: '13:00', bitis: '17:00' });
    expect(ayarNormalize(a, 'lisans')).toEqual(a);
  });

  it('ESKİ tek bloklu kayıt öğleden ÖNCE bloğu sayılır', () => {
    // Ayar önce tek bloktu; eskiden kaydedilmiş bölümün programı kaymamalı.
    expect(ayarNormalize({ baslangic: '08:15', bitis: '17:00' }, 'lisans')).toEqual(
      iki({ baslangic: '08:15', bitis: '17:00' }, null)
    );
  });

  it('BOZUK blok (bitiş başlangıçtan önce) varsayılana döner', () => {
    const a = ayarNormalize(iki({ baslangic: '17:00', bitis: '09:00' }, null), 'lisans');
    expect(a.ogledenOnce).toEqual(VARSAYILAN_AYAR.lisans.ogledenOnce);
  });

  it('bir dersin sığmadığı blok da yok sayılır', () => {
    const a = ayarNormalize(iki({ baslangic: '08:30', bitis: '09:00' }, null), 'lisans');
    expect(a.ogledenOnce).toEqual(VARSAYILAN_AYAR.lisans.ogledenOnce);
  });

  it('yalnız biri bozuksa o alan varsayılandan gelir', () => {
    const a = ayarNormalize(iki({ baslangic: 'abc', bitis: '12:00' }, null), 'lisans');
    expect(a.ogledenOnce).toEqual({ baslangic: '08:30', bitis: '12:00' });
  });

  it('öğleden sonrası açıkça KAPATILABİLİR', () => {
    // Yalnız sabah ders yapan bölümün programı boş satırla uzamasın.
    const a = ayarNormalize(iki({ baslangic: '08:30', bitis: '13:15' }, null), 'lisans');
    expect(a.ogledenSonra).toBe(null);
    expect(saatEtiketleri(a)).toHaveLength(5);
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
    const kayit = { lisans: { ogledenOnce: { baslangic: '09:00', bitis: '16:00' } } };
    expect(bolumAyari(kayit, 'lisans').ogledenOnce.baslangic).toBe('09:00');
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
    // Tek bloklu (eski biçim) girdi de kabul edilir.
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

  it('VARSAYILAN lisans ayarı FAKÜLTENİN kendi tablosudur', () => {
    // Sabah :30'da, öğleden sonra :15'te başlar — tek ritimle kurulamaz.
    expect(saatEtiketleri(VARSAYILAN_AYAR.lisans)).toEqual([
      '08:30-09:15',
      '09:30-10:15',
      '10:30-11:15',
      '11:30-12:15',
      '12:30-13:15',
      '13:15-14:00',
      '14:15-15:00',
      '15:15-16:00',
      '16:15-17:00',
      '17:15-18:00',
    ]);
  });

  it('lisans ızgarası GENEL ızgaranın başlangıcıdır', () => {
    // Kayıtlı programlar saat İNDEKSİYLE duruyor; iki liste ayrışırsa
    // akademisyen programında dersler başka satırda görünürdü.
    expect(saatEtiketleri(VARSAYILAN_AYAR.lisans)).toEqual(PROGRAM_SAATLERI.slice(0, 10));
  });

  it('öğleden sonra bloğu KENDİ ritmini kurar (öğle arasından sonra kayma)', () => {
    const etiketler = saatEtiketleri(VARSAYILAN_AYAR.lisans);
    expect(etiketler[4]).toBe('12:30-13:15'); // sabahın sonu
    expect(etiketler[5]).toBe('13:15-14:00'); // öğleden sonra yeniden başlar
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

describe('blokEtiketleri — bloklar birbirinden bağımsız', () => {
  it('sabah bloğu :30, öğleden sonra :15 başlayabilir', () => {
    expect(blokEtiketleri({ baslangic: '08:30', bitis: '13:15' })).toEqual([
      '08:30-09:15',
      '09:30-10:15',
      '10:30-11:15',
      '11:30-12:15',
      '12:30-13:15',
    ]);
    expect(blokEtiketleri({ baslangic: '13:15', bitis: '18:00' })).toEqual([
      '13:15-14:00',
      '14:15-15:00',
      '15:15-16:00',
      '16:15-17:00',
      '17:15-18:00',
    ]);
  });

  it('bitişi aşan ders yazılmaz', () => {
    expect(blokEtiketleri({ baslangic: '08:30', bitis: '10:00' })).toEqual(['08:30-09:15']);
  });

  it('üst sınır uygulanır', () => {
    expect(blokEtiketleri({ baslangic: '00:00', bitis: '23:59' }, 3)).toHaveLength(3);
  });
});

describe('iki bloklu ayar — bölüme özel değişiklik', () => {
  it('yetkili İKİ bloğu da ayrı ayrı değiştirebilir', () => {
    const ayar = {
      ogledenOnce: { baslangic: '09:00', bitis: '12:00' },
      ogledenSonra: { baslangic: '14:00', bitis: '17:00' },
    };
    expect(saatEtiketleri(ayar)).toEqual([
      '09:00-09:45',
      '10:00-10:45',
      '11:00-11:45',
      '14:00-14:45',
      '15:00-15:45',
      '16:00-16:45',
    ]);
  });

  it('bloklar arası boşluk programda satır üretmez', () => {
    // 12:00 ile 14:00 arası öğle arasıdır; ızgarada satırı yoktur.
    const ayar = {
      ogledenOnce: { baslangic: '09:00', bitis: '12:00' },
      ogledenSonra: { baslangic: '14:00', bitis: '17:00' },
    };
    expect(saatEtiketleri(ayar).some((h) => h.startsWith('12:') || h.startsWith('13:'))).toBe(
      false
    );
  });

  it('toplam satır sayısı üst sınırı aşmaz', () => {
    const ayar = {
      ogledenOnce: { baslangic: '00:00', bitis: '12:00' },
      ogledenSonra: { baslangic: '12:00', bitis: '23:59' },
    };
    expect(saatEtiketleri(ayar).length).toBeLessThanOrEqual(EN_COK_SAAT);
  });

  it('özet iki bloğu da anlatır', () => {
    expect(ayarOzeti(VARSAYILAN_AYAR.lisans)).toBe('08:30 – 13:15 · 13:15 – 18:00 · 10 ders saati');
  });
});
