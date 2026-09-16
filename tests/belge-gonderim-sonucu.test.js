import { describe, it, expect } from 'vitest';
import {
  gizlemeleriTemizlemeKarari,
  gonderimBasarili,
  gonderimBilgiMetni,
  gonderimHataMetni,
  yenidenGonderimKarari,
} from '../lib/belge-gonderim-sonucu.js';

describe('gonderimBasarili', () => {
  it('ok:true başarılıdır', () => {
    expect(gonderimBasarili({ ok: true })).toBe(true);
  });

  it('zatenVar da başarılıdır', () => {
    expect(gonderimBasarili({ ok: true, zatenVar: true })).toBe(true);
  });

  it('ok:false başarısızdır', () => {
    expect(gonderimBasarili({ ok: false, reason: 'kapsam-yok' })).toBe(false);
  });

  it('sonuç dönmeyen eski çağrılar başarılı sayılır', () => {
    // Bütün çağrı yerleri sonucu döndürmüyor; sessizce hata gösterilmesin.
    expect(gonderimBasarili(undefined)).toBe(true);
    expect(gonderimBasarili(null)).toBe(true);
  });
});

describe('gonderimHataMetni', () => {
  it('BİLDİRİLEN HATA: kapsamsız gönderim ne yapılacağını söyler', () => {
    const m = gonderimHataMetni({ ok: false, reason: 'kapsam-yok' });
    expect(m).toMatch(/bölüme bağlanamadı/i);
    expect(m).toMatch(/bölümünü girin|bölümü seçip/i);
  });

  it('kural yoksa söylenir', () => {
    expect(gonderimHataMetni({ ok: false, reason: 'kural-yok' })).toMatch(/kural/i);
  });

  it('eksik parametre', () => {
    expect(gonderimHataMetni({ ok: false, reason: 'eksik-parametre' })).toMatch(/eksik/i);
  });

  it('bilinmeyen sebep de metne döner', () => {
    expect(gonderimHataMetni({ ok: false, reason: 'x-y-z' })).toBe('Belge gönderilemedi (x-y-z).');
  });

  it('sebepsiz başarısızlık', () => {
    expect(gonderimHataMetni({ ok: false })).toBe('Belge gönderilemedi.');
  });

  it('başarılı sonuçta metin yok', () => {
    expect(gonderimHataMetni({ ok: true })).toBe('');
    expect(gonderimHataMetni(null)).toBe('');
  });
});

describe('yenidenGonderimKarari', () => {
  it('BİLDİRİLEN HATA: TAMAMLANMIŞ yönlendirme yeniden gönderilince açılır', () => {
    // Belge "gönderildi" diyordu ama memurun ekranında yoktu: yönlendirme
    // kapanmıştı ve ikinci gönderim sessizce hiçbir şey yapmıyordu.
    const k = yenidenGonderimKarari(
      { durum: 'tamamlandi', durumBy: 'Memur', durumTarihi: '2026-09-01T10:00:00Z' },
      'Akademisyen'
    );
    expect(k.islem).toBe('yeniden-ac');
    expect(k.yama.durum).toBe('bekliyor');
    expect(k.yama.yenidenGonderimSayisi).toBe(1);
    expect(k.yama.yenidenGonderen).toBe('Akademisyen');
  });

  it('önceki kapanışın izi korunur', () => {
    const k = yenidenGonderimKarari(
      { durum: 'tamamlandi', durumBy: 'Memur', durumTarihi: '2026-09-01T10:00:00Z' },
      'X'
    );
    expect(k.yama.oncekiDurumBy).toBe('Memur');
    expect(k.yama.oncekiDurumTarihi).toBe('2026-09-01T10:00:00Z');
  });

  it('sayaç birikir', () => {
    const k = yenidenGonderimKarari({ durum: 'tamamlandi', yenidenGonderimSayisi: 2 }, 'X');
    expect(k.yama.yenidenGonderimSayisi).toBe(3);
  });

  it('AÇIK yönlendirme çoğaltılmaz', () => {
    expect(yenidenGonderimKarari({ durum: 'bekliyor' }, 'X').islem).toBe('zaten-var');
    expect(yenidenGonderimKarari({ durum: 'goruldu' }, 'X').islem).toBe('zaten-var');
    expect(yenidenGonderimKarari({ durum: 'islemde' }, 'X').islem).toBe('zaten-var');
  });

  it('durumsuz kayıt açık sayılır', () => {
    expect(yenidenGonderimKarari({}, 'X').islem).toBe('zaten-var');
    expect(yenidenGonderimKarari(null, 'X').islem).toBe('zaten-var');
  });
});

describe('gonderimBilgiMetni', () => {
  it('yeniden açılan gönderim anlatılır', () => {
    const m = gonderimBilgiMetni({ ok: true, yenidenAcildi: true });
    expect(m).toMatch(/tamamlandı olarak işaretlemişti/i);
    expect(m).toMatch(/bekleyen listesine döndü/i);
  });

  it('zaten bekleyen gönderim anlatılır', () => {
    expect(gonderimBilgiMetni({ ok: true, zatenVar: true })).toMatch(/hâlâ bekliyor/i);
  });

  it('yeni gönderimde bilgi metni yok', () => {
    expect(gonderimBilgiMetni({ ok: true })).toBe('');
    expect(gonderimBilgiMetni(null)).toBe('');
  });

  it('başarısız sonuçta bilgi metni yok — hata metni ayrı', () => {
    expect(gonderimBilgiMetni({ ok: false, reason: 'kapsam-yok' })).toBe('');
  });
});

// ── "Sil"den sonra yeniden gönderim ──
// Memurun "Sil"i belgeyi öldürmüyordu ama gizleme de hiç kalkmıyordu: belge
// yeniden gönderilse bile o memurda bir daha görünmüyordu.
describe('gizlemeleriTemizlemeKarari', () => {
  it('gizleyen varsa liste temizlenir', () => {
    const k = gizlemeleriTemizlemeKarari(['NİYAZİ METE GÜRGAN']);
    expect(k.temizle).toBe(true);
    expect(k.kaldirilan).toEqual(['NİYAZİ METE GÜRGAN']);
  });

  it('gizleyen yoksa yazma yapılmaz', () => {
    expect(gizlemeleriTemizlemeKarari([]).temizle).toBe(false);
    expect(gizlemeleriTemizlemeKarari(undefined).temizle).toBe(false);
    expect(gizlemeleriTemizlemeKarari(null).temizle).toBe(false);
    expect(gizlemeleriTemizlemeKarari('NİYAZİ').temizle).toBe(false);
  });

  it('boş ve boşluklu girdiler sayılmaz', () => {
    expect(gizlemeleriTemizlemeKarari(['', '   ', null]).temizle).toBe(false);
  });

  it('boşluklar kırpılır', () => {
    expect(gizlemeleriTemizlemeKarari([' AYŞE ', 'VELİ']).kaldirilan).toEqual(['AYŞE', 'VELİ']);
  });
});

describe('gonderimBilgiMetni · gizleme kaldırıldığında', () => {
  it('zaten bekleyen gönderimde gizlemenin kalktığı söylenir', () => {
    const m = gonderimBilgiMetni({ ok: true, zatenVar: true, gizlemeKaldirildi: true });
    expect(m).toMatch(/hâlâ bekliyor/i);
    expect(m).toMatch(/kendi listesinden kaldırmıştı/i);
  });

  it('yeniden açılan gönderimde de söylenir', () => {
    const m = gonderimBilgiMetni({ ok: true, yenidenAcildi: true, gizlemeKaldirildi: true });
    expect(m).toMatch(/listesinden kaldırmış olanlara da geri kondu/i);
  });

  it('yeni gönderimde tek başına da söylenir', () => {
    expect(gonderimBilgiMetni({ ok: true, gizlemeKaldirildi: true })).toMatch(/geri kondu/i);
  });

  it('gizleme yoksa metin eskisi gibi kalır', () => {
    expect(gonderimBilgiMetni({ ok: true, gizlemeKaldirildi: false })).toBe('');
    expect(gonderimBilgiMetni({ ok: true, zatenVar: true, gizlemeKaldirildi: false })).not.toMatch(
      /geri kondu/i
    );
  });
});
