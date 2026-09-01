import { describe, it, expect } from 'vitest';
import {
  GONDERI_TURLERI,
  turBilgisi,
  etkinlikNormalle,
  etkinlikGecerliMi,
  etkinlikBaslangici,
  etkinlikBitisi,
  etkinlikDurumu,
  yaklasanEtkinlikler,
  icsBelgesi,
  ANKET_EN_AZ,
  ANKET_EN_COK,
  anketSecenekleri,
  anketGecerliMi,
  anketKapandiMi,
  kullaniciOyu,
  oyDagilimi,
  oyVerilebilirMi,
  gonderiHazirMi,
  gonderileriSuz,
  gonderiOzeti,
} from '../lib/kulup-gonderi.js';

describe('turBilgisi', () => {
  it('üç tür tanımlı', () => {
    expect(GONDERI_TURLERI.map((t) => t.id)).toEqual(['duyuru', 'etkinlik', 'anket']);
  });

  it('bilinmeyen tür duyuruya düşer', () => {
    expect(turBilgisi('yok').id).toBe('duyuru');
    expect(turBilgisi(undefined).id).toBe('duyuru');
  });

  it('bilinen türü döner', () => {
    expect(turBilgisi('anket').ad).toBe('Anket');
  });
});

describe('etkinlikNormalle', () => {
  it('geçersiz tarih ve saat düşer', () => {
    const e = etkinlikNormalle({ tarih: '15/03/2026', baslangic: '25:00', bitis: 'öğlen' });
    expect(e).toEqual({ tarih: '', baslangic: '', bitis: '', yer: '' });
  });

  it('geçerli değerler korunur', () => {
    const e = etkinlikNormalle({
      tarih: '2026-03-15',
      baslangic: '14:00',
      bitis: '16:30',
      yer: '  Konferans Salonu  ',
    });
    expect(e).toEqual({
      tarih: '2026-03-15',
      baslangic: '14:00',
      bitis: '16:30',
      yer: 'Konferans Salonu',
    });
  });

  it('boş girdi çökmez', () => {
    expect(etkinlikNormalle(null).tarih).toBe('');
  });
});

describe('etkinlikGecerliMi', () => {
  it('tarih zorunlu', () => {
    expect(etkinlikGecerliMi({ yer: 'A' }).tamam).toBe(false);
  });

  it('saat isteğe bağlı', () => {
    expect(etkinlikGecerliMi({ tarih: '2026-03-15' }).tamam).toBe(true);
  });

  it('bitiş başlangıçtan önce olamaz', () => {
    const s = etkinlikGecerliMi({ tarih: '2026-03-15', baslangic: '16:00', bitis: '14:00' });
    expect(s.tamam).toBe(false);
    expect(s.hata).toMatch(/Bitiş/);
  });

  it('eşit saatler de reddedilir', () => {
    expect(
      etkinlikGecerliMi({ tarih: '2026-03-15', baslangic: '14:00', bitis: '14:00' }).tamam
    ).toBe(false);
  });
});

describe('etkinlik zamanı', () => {
  it('saatsiz etkinlik günün başında başlar', () => {
    const d = etkinlikBaslangici({ tarih: '2026-03-15' });
    expect(d.getHours()).toBe(0);
    expect(d.getDate()).toBe(15);
  });

  it('saatsiz etkinlik gün sonunda biter', () => {
    const d = etkinlikBitisi({ tarih: '2026-03-15' });
    expect(d.getHours()).toBe(23);
  });

  it('tarihsizde null', () => {
    expect(etkinlikBaslangici({})).toBe(null);
    expect(etkinlikBitisi({})).toBe(null);
  });
});

describe('etkinlikDurumu', () => {
  const an = new Date(2026, 2, 15, 12, 0, 0); // 15 Mart 2026, 12:00

  it('aynı gün bugündür', () => {
    expect(etkinlikDurumu({ tarih: '2026-03-15', baslangic: '18:00' }, an)).toBe('bugun');
  });

  it('saatsiz bugünkü etkinlik gün bitmeden geçmişe düşmez', () => {
    expect(etkinlikDurumu({ tarih: '2026-03-15' }, an)).toBe('bugun');
  });

  it('sabahki etkinlik akşam geçmiştir', () => {
    expect(etkinlikDurumu({ tarih: '2026-03-15', baslangic: '08:00', bitis: '09:00' }, an)).toBe(
      'gecmis'
    );
  });

  it('ileri tarih yaklaşandır', () => {
    expect(etkinlikDurumu({ tarih: '2026-04-01' }, an)).toBe('yaklasan');
  });

  it('tarihsiz ayrı bir durumdur', () => {
    expect(etkinlikDurumu({}, an)).toBe('tarihsiz');
  });
});

describe('yaklasanEtkinlikler', () => {
  const an = new Date(2026, 2, 15, 12, 0, 0);
  const gonderiler = [
    { id: 'a', type: 'etkinlik', etkinlik: { tarih: '2026-05-01' } },
    { id: 'b', type: 'etkinlik', etkinlik: { tarih: '2026-03-16' } },
    { id: 'c', type: 'etkinlik', etkinlik: { tarih: '2026-01-01' } },
    { id: 'd', type: 'duyuru' },
    { id: 'e', type: 'etkinlik', etkinlik: {} },
  ];

  it('en yakın tarih başta', () => {
    expect(yaklasanEtkinlikler(gonderiler, an).map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('geçmiş ve tarihsiz elenir', () => {
    const idler = yaklasanEtkinlikler(gonderiler, an).map((p) => p.id);
    expect(idler).not.toContain('c');
    expect(idler).not.toContain('e');
  });

  it('duyurular listeye girmez', () => {
    expect(yaklasanEtkinlikler(gonderiler, an).map((p) => p.id)).not.toContain('d');
  });

  it('adet sınırı uygulanır', () => {
    expect(yaklasanEtkinlikler(gonderiler, an, 1).map((p) => p.id)).toEqual(['b']);
  });

  it('boş girdi boş liste', () => {
    expect(yaklasanEtkinlikler(null, an)).toEqual([]);
  });
});

describe('icsBelgesi', () => {
  const gonderi = {
    id: 'p1',
    type: 'etkinlik',
    etkinlik: { tarih: '2026-03-15', baslangic: '14:00', bitis: '16:00', yer: 'A Salonu' },
  };

  it('takvim dosyası üretir', () => {
    const ics = icsBelgesi(gonderi, 'Robotik Topluluğu', 'Tanışma Çayı');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART:20260315T140000');
    expect(ics).toContain('DTEND:20260315T160000');
    expect(ics).toContain('SUMMARY:Tanışma Çayı');
    expect(ics).toContain('LOCATION:A Salonu');
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('satır sonları CRLF', () => {
    expect(icsBelgesi(gonderi, 'K', 'B')).toContain('\r\n');
  });

  it('noktalı virgül ve virgül kaçırılır', () => {
    const ics = icsBelgesi({ ...gonderi, etkinlik: { ...gonderi.etkinlik, yer: 'A; B, C' } }, 'K');
    expect(ics).toContain('LOCATION:A\\; B\\, C');
  });

  it('tarihsiz etkinlikte boş döner', () => {
    expect(icsBelgesi({ type: 'etkinlik', etkinlik: {} }, 'K')).toBe('');
  });

  it('başlık yoksa kulüp adından türetir', () => {
    expect(icsBelgesi(gonderi, 'Robotik')).toContain('SUMMARY:Robotik etkinliği');
  });
});

describe('anketSecenekleri', () => {
  it('düz metin dizisini kimliklendirir', () => {
    expect(anketSecenekleri(['Evet', 'Hayır'])).toEqual([
      { id: 's1', metin: 'Evet' },
      { id: 's2', metin: 'Hayır' },
    ]);
  });

  it('mevcut kimlikler korunur', () => {
    const s = anketSecenekleri([{ id: 's7', metin: 'Evet' }]);
    expect(s[0].id).toBe('s7');
  });

  it('boş seçenekler elenir', () => {
    expect(anketSecenekleri(['A', '   ', ''])).toHaveLength(1);
  });

  it('üst sınır uygulanır', () => {
    const cok = Array.from({ length: 10 }, (_, i) => 'S' + i);
    expect(anketSecenekleri(cok)).toHaveLength(ANKET_EN_COK);
  });

  it('dizi olmayan girdi boş liste', () => {
    expect(anketSecenekleri('abc')).toEqual([]);
  });
});

describe('anketGecerliMi', () => {
  it('iki seçenekten az reddedilir', () => {
    expect(anketGecerliMi({ secenekler: ['Evet'] }).tamam).toBe(false);
    expect(ANKET_EN_AZ).toBe(2);
  });

  it('iki seçenek yeterli', () => {
    expect(anketGecerliMi({ secenekler: ['Evet', 'Hayır'] }).tamam).toBe(true);
  });

  it('aynı seçenek iki kez yazılamaz', () => {
    const s = anketGecerliMi({ secenekler: ['Evet', 'evet'] });
    expect(s.tamam).toBe(false);
    expect(s.hata).toMatch(/iki kez/);
  });

  it('bozuk bitiş tarihi reddedilir', () => {
    expect(anketGecerliMi({ secenekler: ['A', 'B'], bitis: '15.03.2026' }).tamam).toBe(false);
  });
});

describe('anketKapandiMi', () => {
  it('bitiş günü boyunca açık kalır', () => {
    const gun = new Date(2026, 2, 26, 23, 0, 0);
    expect(anketKapandiMi({ bitis: '2026-03-26' }, gun)).toBe(false);
  });

  it('ertesi gün kapanmıştır', () => {
    const gun = new Date(2026, 2, 27, 0, 1, 0);
    expect(anketKapandiMi({ bitis: '2026-03-26' }, gun)).toBe(true);
  });

  it('bitişi olmayan anket kapanmaz', () => {
    expect(anketKapandiMi({}, new Date())).toBe(false);
  });
});

describe('oy sayımı', () => {
  const anket = { secenekler: ['Cumartesi', 'Pazar'] };

  it('oyları seçeneklere dağıtır', () => {
    const d = oyDagilimi(anket, [
      { voter: '1', optionId: 's1' },
      { voter: '2', optionId: 's1' },
      { voter: '3', optionId: 's2' },
    ]);
    expect(d.toplam).toBe(3);
    expect(d.satirlar[0]).toMatchObject({ metin: 'Cumartesi', sayi: 2, yuzde: 67 });
    expect(d.satirlar[1]).toMatchObject({ metin: 'Pazar', sayi: 1, yuzde: 33 });
  });

  it('oyunu değiştiren kişi bir kez sayılır', () => {
    const d = oyDagilimi(anket, [
      { voter: '1', optionId: 's1', createdAt: '2026-03-01T10:00:00Z' },
      { voter: '1', optionId: 's2', createdAt: '2026-03-02T10:00:00Z' },
    ]);
    expect(d.toplam).toBe(1);
    expect(d.satirlar[1].sayi).toBe(1);
  });

  it('oy yokken yüzdeler sıfır', () => {
    const d = oyDagilimi(anket, []);
    expect(d.toplam).toBe(0);
    expect(d.satirlar.every((s) => s.yuzde === 0)).toBe(true);
  });

  it('eksik alanlı oy sayılmaz', () => {
    const d = oyDagilimi(anket, [{ voter: '', optionId: 's1' }, { voter: '2' }]);
    expect(d.toplam).toBe(0);
  });

  it('kullanıcının oyu bulunur', () => {
    const oy = kullaniciOyu([{ voter: '220905033', optionId: 's2' }], '220905033');
    expect(oy.optionId).toBe('s2');
  });

  it('kimliksiz kullanıcının oyu yoktur', () => {
    expect(kullaniciOyu([{ voter: '1', optionId: 's1' }], '')).toBe(null);
  });
});

describe('oyVerilebilirMi', () => {
  const anket = { secenekler: ['A', 'B'] };

  it('kimlikli kullanıcı oy verebilir', () => {
    expect(oyVerilebilirMi(anket, '220905033', new Date())).toBe(true);
  });

  it('kimliksiz veremez', () => {
    expect(oyVerilebilirMi(anket, '', new Date())).toBe(false);
  });

  it('kapanmış ankete oy verilemez', () => {
    const gun = new Date(2026, 2, 27);
    expect(oyVerilebilirMi({ ...anket, bitis: '2026-03-26' }, '1', gun)).toBe(false);
  });

  it('seçeneksiz ankete oy verilemez', () => {
    expect(oyVerilebilirMi({ secenekler: [] }, '1', new Date())).toBe(false);
  });
});

describe('gonderiHazirMi', () => {
  it('boş duyuru reddedilir', () => {
    expect(gonderiHazirMi('duyuru', { metinBos: true, dosyaSayisi: 0 }).tamam).toBe(false);
  });

  it('dosyalı duyuru metin istemez', () => {
    expect(gonderiHazirMi('duyuru', { metinBos: true, dosyaSayisi: 1 }).tamam).toBe(true);
  });

  it('tarihsiz etkinlik reddedilir', () => {
    const s = gonderiHazirMi('etkinlik', { metinBos: false, etkinlik: {} });
    expect(s.tamam).toBe(false);
    expect(s.hata).toMatch(/tarihi/);
  });

  it('tarihli etkinlik metin olmadan da geçer', () => {
    expect(
      gonderiHazirMi('etkinlik', {
        metinBos: true,
        dosyaSayisi: 1,
        etkinlik: { tarih: '2026-03-15' },
      }).tamam
    ).toBe(true);
  });

  it('seçeneksiz anket reddedilir', () => {
    expect(gonderiHazirMi('anket', { metinBos: false, anket: { secenekler: ['A'] } }).tamam).toBe(
      false
    );
  });

  it('anket metinsiz de geçerlidir', () => {
    expect(
      gonderiHazirMi('anket', { metinBos: true, dosyaSayisi: 0, anket: { secenekler: ['A', 'B'] } })
        .tamam
    ).toBe(true);
  });
});

describe('gonderileriSuz', () => {
  const liste = [{ type: 'duyuru' }, { type: 'etkinlik' }, { type: 'anket' }, {}];

  it('tümü hepsini döner', () => {
    expect(gonderileriSuz(liste, 'tumu')).toHaveLength(4);
  });

  it('türe göre süzer', () => {
    expect(gonderileriSuz(liste, 'etkinlik')).toHaveLength(1);
  });

  it('türsüz kayıt duyuru sayılır', () => {
    expect(gonderileriSuz(liste, 'duyuru')).toHaveLength(2);
  });
});

describe('gonderiOzeti', () => {
  it('etkinlikte tarih ve yer yazar', () => {
    const o = gonderiOzeti(
      { type: 'etkinlik', etkinlik: { tarih: '2026-03-15', baslangic: '14:00', yer: 'A Salonu' } },
      'Tanışma çayı'
    );
    expect(o).toContain('15.03.2026 14:00');
    expect(o).toContain('A Salonu');
    expect(o).toContain('Tanışma çayı');
  });

  it('ankette seçenek sayısı yazar', () => {
    const o = gonderiOzeti({ type: 'anket', anket: { secenekler: ['A', 'B', 'C'] } }, 'Hangi gün?');
    expect(o).toContain('3 seçenekli anket');
  });

  it('uzun metin kısaltılır', () => {
    const o = gonderiOzeti({ type: 'duyuru' }, 'x'.repeat(200));
    expect(o.length).toBeLessThanOrEqual(91);
    expect(o.endsWith('…')).toBe(true);
  });

  it('metinsiz duyuruda dosya sayısı yazar', () => {
    expect(gonderiOzeti({ type: 'duyuru', files: [1, 2] }, '')).toBe('2 dosya paylaşıldı');
  });

  it('hiçbir şey yoksa genel metin', () => {
    expect(gonderiOzeti({ type: 'duyuru' }, '')).toBe('Yeni paylaşım');
  });
});
