import { describe, it, expect } from 'vitest';
import {
  IKI_SUTUN_ESIGI,
  SAYFA_PANELLERI,
  SAYFA_SUTUNLARI,
  UC_SUTUN_ESIGI,
  kartinSutunu,
  panelDugmeleri,
  panelOzeti,
  sutunSablonu,
  sutunSayisi,
} from '../lib/benim-sayfam-duzeni.js';

describe('sütun tanımı', () => {
  it('üç sütun vardır: sol · orta · sağ', () => {
    expect(SAYFA_SUTUNLARI.map((s) => s.id)).toEqual(['sol', 'orta', 'sag']);
  });

  // İstenen yerleşim: öğrenci bilgileri solda, takvim ve harita ortada,
  // etkinlik/bağlantı/danışman sağda.
  it('kartlar istenen sütunlarda', () => {
    expect(kartinSutunu('profil')).toBe('sol');
    expect(kartinSutunu('kisisel')).toBe('sol');
    expect(kartinSutunu('topluluklar')).toBe('sol');
    expect(kartinSutunu('takvim')).toBe('orta');
    expect(kartinSutunu('harita')).toBe('orta');
    expect(kartinSutunu('etkinlikler')).toBe('sag');
    expect(kartinSutunu('baglantilar')).toBe('sag');
    expect(kartinSutunu('danisman')).toBe('sag');
  });

  // Aynı kart iki sütuna yazılırsa ekranda iki kere çizilir.
  it('hiçbir kart iki sütunda değil', () => {
    const hepsi = SAYFA_SUTUNLARI.flatMap((s) => s.kartlar);
    expect(new Set(hepsi).size).toBe(hepsi.length);
  });

  // Bildirimler kartı kaldırıldı — geri sızmasın.
  it('bildirimler artık bir kart değil', () => {
    expect(kartinSutunu('bildirimler')).toBe('');
  });

  it('bilinmeyen kart boş döner', () => {
    expect(kartinSutunu('yok')).toBe('');
    expect(kartinSutunu(null)).toBe('');
  });
});

describe('panel tanımı', () => {
  it('dört panel: dersler · mezuniyet · yoklama · randevu', () => {
    expect(SAYFA_PANELLERI.map((p) => p.id)).toEqual([
      'dersler',
      'mezuniyet',
      'yoklama',
      'randevu',
    ]);
  });

  // Panel olan şey sütunda da durursa sayfada iki kere görünür.
  it('paneller hiçbir sütunda değil', () => {
    SAYFA_PANELLERI.forEach((p) => expect(kartinSutunu(p.id)).toBe(''));
  });
});

describe('sutunSayisi', () => {
  it('geniş ekranda üç, orta ekranda iki, darda tek sütun', () => {
    expect(sutunSayisi(1440)).toBe(3);
    expect(sutunSayisi(UC_SUTUN_ESIGI)).toBe(3);
    expect(sutunSayisi(UC_SUTUN_ESIGI - 1)).toBe(2);
    expect(sutunSayisi(IKI_SUTUN_ESIGI)).toBe(2);
    expect(sutunSayisi(IKI_SUTUN_ESIGI - 1)).toBe(1);
    expect(sutunSayisi(360)).toBe(1);
  });

  it('genişlik daraldıkça sütun sayısı artmaz', () => {
    let onceki = sutunSayisi(1600);
    for (let g = 1600; g >= 280; g -= 20) {
      const s = sutunSayisi(g);
      expect(s).toBeLessThanOrEqual(onceki);
      onceki = s;
    }
  });

  // Genişlik ölçülemeden ilk çizimde tek sütuna düşerse sayfa bir an
  // "telefon görünümü" verip sonra zıplar.
  it('genişlik bilinmiyorsa üç sütun varsayar', () => {
    expect(sutunSayisi(undefined)).toBe(3);
    expect(sutunSayisi(NaN)).toBe(3);
  });
});

describe('sutunSablonu', () => {
  it('sütun sayısına karşılık gelen şablon', () => {
    expect(sutunSablonu(1440)).toBe('300px minmax(0, 1fr) 300px');
    expect(sutunSablonu(900)).toBe('300px minmax(0, 1fr)');
    expect(sutunSablonu(500)).toBe('1fr');
  });

  it('şablondaki sütun sayısı sutunSayisi ile aynı', () => {
    [1440, 900, 500].forEach((g) => {
      const parcalar = sutunSablonu(g).split(/\s(?![^(]*\))/).length;
      expect(parcalar).toBe(sutunSayisi(g));
    });
  });
});

describe('panelOzeti', () => {
  it('ders seçilmemişse bunu söyler', () => {
    expect(panelOzeti('dersler', { dersOzet: { sayi: 0 } })).toBe('Henüz ders seçilmedi');
    expect(panelOzeti('dersler', {})).toBe('Henüz ders seçilmedi');
  });

  it('ders sayısı ve AKTS tavanı ile birlikte yazılır', () => {
    expect(panelOzeti('dersler', { dersOzet: { sayi: 6, toplamAkts: 30, tavan: 42 } })).toBe(
      '6 ders · 30/42 AKTS'
    );
  });

  it('tavan yoksa yalnız toplam AKTS', () => {
    expect(panelOzeti('dersler', { dersOzet: { sayi: 2, toplamAkts: 10, tavan: 0 } })).toBe(
      '2 ders · 10 AKTS'
    );
  });

  it('mezuniyet paneli ne olduğunu anlatır', () => {
    expect(panelOzeti('mezuniyet', {})).toMatch(/Transkript/);
  });

  it('bilinmeyen panelde boş dize', () => {
    expect(panelOzeti('yok', {})).toBe('');
  });
});

describe('panelDugmeleri', () => {
  it('her panel başlık ve özetiyle döner', () => {
    const d = panelDugmeleri({ dersOzet: { sayi: 5, toplamAkts: 28, tavan: 42 } });
    expect(d).toHaveLength(4);
    expect(d[0]).toMatchObject({ id: 'dersler', baslik: 'Derslerim', ozet: '5 ders · 28/42 AKTS' });
    expect(d[1].baslik).toBe('Mezuniyet Durumum');
  });

  it('veri olmadan da çöker değil', () => {
    expect(panelDugmeleri().every((p) => typeof p.ozet === 'string')).toBe(true);
  });

  it('dört düğme döner', () => {
    expect(panelDugmeleri({})).toHaveLength(4);
  });
});

describe('panelOzeti — yoklama', () => {
  // Öğrenci devamsızlıktan kaldığını paneli açmadan görmeli.
  it('sınırı aşılan ders sayısını yazar', () => {
    expect(panelOzeti('yoklama', { yoklama: { asan: 2, riskli: 1, dersSayisi: 5 } })).toBe(
      '2 derste sınır aşıldı'
    );
  });

  it('aşan yoksa riskli olanı yazar', () => {
    expect(panelOzeti('yoklama', { yoklama: { asan: 0, riskli: 3, dersSayisi: 5 } })).toBe(
      '3 derste hak azaldı'
    );
  });

  it('her şey yolundaysa bunu söyler', () => {
    expect(panelOzeti('yoklama', { yoklama: { dersSayisi: 4 } })).toMatch(/iyi/);
  });

  it('hiç ders yoksa çağrı metni', () => {
    expect(panelOzeti('yoklama', {})).toBe('Karekodu okutun');
  });
});

describe('panelOzeti — randevu', () => {
  it('bekleyen talep sayısı önceliklidir', () => {
    expect(panelOzeti('randevu', { randevu: { bekleyen: 1, onayli: 2 } })).toBe(
      '1 talebiniz yanıt bekliyor'
    );
  });

  it('bekleyen yoksa onaylı sayılır', () => {
    expect(panelOzeti('randevu', { randevu: { onayli: 2 } })).toBe('2 onaylı randevunuz var');
  });

  it('hiçbiri yoksa çağrı metni', () => {
    expect(panelOzeti('randevu', {})).toMatch(/Görüşme saatlerine/);
  });
});
