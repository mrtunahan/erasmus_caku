// ══════════════════════════════════════════════════════════════
// ÇAP / YANDAL — İMZALI DİLEKÇE KİLİDİ
//
// 4. adımdan sonra öğrenci dosyayı değiştiremez: akademisyenin gördüğü belge
// ile sekretere teslim edilen ıslak imzalı kâğıt aynı olmalı. Değişiklik
// yalnız akademisyenin TEK SEFERLİK izniyle olur.
// ══════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import {
  onaylandiMi,
  imzaliVarMi,
  duzenlemeAcikMi,
  talepDurumu,
  yuklemeIzniVar,
  kilitliMi,
  talepEdebilirMi,
  yuklemeDugmesi,
  kilitAciklamasi,
  talepKaydi,
  kararYamasi,
  adimDurumlari,
  tamamlananAdim,
} from '../lib/cap-dilekce-kilit.js';

const bekleyen = { status: 'pending' };
const onayli = { status: 'approved', dilekceUrl: 'a/dilekce.docx' };
const imzali = { ...onayli, imzaliDilekceUrl: 'a/imzali.pdf', imzaliDilekceAd: 'imzali.pdf' };
const izinli = { ...imzali, duzenlemeAcik: true };
const reddedilen = { status: 'rejected', redNedeni: 'AGNO yetersiz' };

describe('temel durumlar', () => {
  it('onay ve imza durumunu okur', () => {
    expect(onaylandiMi(onayli)).toBe(true);
    expect(onaylandiMi(bekleyen)).toBe(false);
    expect(imzaliVarMi(imzali)).toBe(true);
    expect(imzaliVarMi(onayli)).toBe(false);
    expect(imzaliVarMi({ imzaliDilekceUrl: '   ' })).toBe(false);
    expect(duzenlemeAcikMi(izinli)).toBe(true);
    expect(duzenlemeAcikMi(imzali)).toBe(false);
  });
});

describe('yuklemeIzniVar', () => {
  it('onaydan önce yükleme yok', () => {
    expect(yuklemeIzniVar(bekleyen)).toBe(false);
    expect(yuklemeIzniVar(reddedilen)).toBe(false);
  });
  it('ilk yükleme serbest', () => {
    expect(yuklemeIzniVar(onayli)).toBe(true);
  });
  it('YÜKLENDİKTEN SONRA KAPALI — asıl kural', () => {
    expect(yuklemeIzniVar(imzali)).toBe(false);
  });
  it('izin açıkken yeniden yüklenebilir', () => {
    expect(yuklemeIzniVar(izinli)).toBe(true);
  });
});

describe('kilitliMi / talepEdebilirMi', () => {
  it('yüklenmiş ve izinsizse kilitli', () => {
    expect(kilitliMi(imzali)).toBe(true);
    expect(kilitliMi(izinli)).toBe(false);
    expect(kilitliMi(onayli)).toBe(false);
  });
  it('kilitliyken izin istenebilir', () => {
    expect(talepEdebilirMi(imzali)).toBe(true);
  });
  it('bekleyen talep varken tekrar istenemez', () => {
    expect(talepEdebilirMi({ ...imzali, degisiklikTalebi: { durum: 'bekliyor' } })).toBe(false);
  });
  it('reddedilen talepten sonra yeniden istenebilir', () => {
    expect(talepEdebilirMi({ ...imzali, degisiklikTalebi: { durum: 'reddedildi' } })).toBe(true);
  });
});

describe('talepDurumu', () => {
  it('talep yoksa yok', () => {
    expect(talepDurumu(imzali)).toBe('yok');
  });
  it('bekleyen ve reddedilen taleplerı ayırt eder', () => {
    expect(talepDurumu({ ...imzali, degisiklikTalebi: { durum: 'bekliyor' } })).toBe('bekliyor');
    expect(talepDurumu({ ...imzali, degisiklikTalebi: { durum: 'reddedildi' } })).toBe(
      'reddedildi'
    );
  });
  it('izin açıksa talebin eski durumu değil, AÇIK görünür', () => {
    expect(talepDurumu({ ...izinli, degisiklikTalebi: { durum: 'bekliyor' } })).toBe('acik');
  });
});

describe('yuklemeDugmesi', () => {
  it('onaysızken pasif', () => {
    expect(yuklemeDugmesi(bekleyen)).toEqual({
      etkin: false,
      etiket: 'Onay sonrası yüklenebilir',
    });
  });
  it('ilk yüklemede etkin', () => {
    expect(yuklemeDugmesi(onayli).etkin).toBe(true);
  });
  it('KİLİTLİYKEN PASİF ve "Değiştirilemez" yazar', () => {
    expect(yuklemeDugmesi(imzali)).toEqual({ etkin: false, etiket: 'Değiştirilemez' });
  });
  it('izin açıkken etkin', () => {
    expect(yuklemeDugmesi(izinli).etkin).toBe(true);
  });
});

describe('kilitAciklamasi', () => {
  it('yükleme yokken açıklama da yok', () => {
    expect(kilitAciklamasi(onayli)).toBe('');
  });
  it('her durum için ayrı metin', () => {
    expect(kilitAciklamasi(imzali)).toMatch(/izin isteyin/);
    expect(kilitAciklamasi({ ...imzali, degisiklikTalebi: { durum: 'bekliyor' } })).toMatch(
      /akademisyene iletildi/
    );
    expect(kilitAciklamasi(izinli)).toMatch(/izni verdi/);
  });
  it('red gerekçesini gösterir', () => {
    const r = { ...imzali, degisiklikTalebi: { durum: 'reddedildi', redNedeni: 'Belge okunaklı' } };
    expect(kilitAciklamasi(r)).toMatch(/Belge okunaklı/);
  });
});

describe('talepKaydi', () => {
  it('her zaman bekliyor durumuyla açılır — öğrenci kendi iznini veremez', () => {
    const t = talepKaydi('Yanlış sayfayı yükledim', { name: 'Tuğçe EĞİ' });
    expect(t.durum).toBe('bekliyor');
    expect(t.gerekce).toBe('Yanlış sayfayı yükledim');
    expect(t.isteyen).toBe('Tuğçe EĞİ');
    expect(typeof t.istekAt).toBe('string');
  });
});

describe('kararYamasi', () => {
  it('onayda izin açılır', () => {
    const y = kararYamasi('onayla', { name: 'Dr. X' });
    expect(y.duzenlemeAcik).toBe(true);
    expect(y.duzenlemeAcanKisi).toBe('Dr. X');
    expect(y.degisiklikTalebi.durum).toBe('onaylandi');
  });
  it('redde izin AÇILMAZ ve gerekçe yazılır', () => {
    const y = kararYamasi('reddet', { name: 'Dr. X' }, 'Mevcut belge yeterli');
    expect(y.duzenlemeAcik).toBe(false);
    expect(y.degisiklikTalebi.durum).toBe('reddedildi');
    expect(y.degisiklikTalebi.redNedeni).toBe('Mevcut belge yeterli');
  });
});

describe('adimDurumlari', () => {
  it('yeni başvuruda 2. adım sırada', () => {
    expect(adimDurumlari(bekleyen)).toEqual(['ok', 'now', 'wait', 'wait', 'wait']);
  });
  it('ONAY VERİLDİ AMA DİLEKÇE HAZIR DEĞİLSE tek bir adım "şimdi" olur', () => {
    // Eski kod burada 3. ve 4. adımı aynı anda "şimdi" gösteriyordu.
    expect(adimDurumlari({ status: 'approved' })).toEqual(['ok', 'ok', 'now', 'wait', 'wait']);
  });
  it('dilekçe hazırken imza adımı', () => {
    expect(adimDurumlari(onayli)).toEqual(['ok', 'ok', 'ok', 'now', 'wait']);
  });
  it('imza yüklenince teslim adımı', () => {
    expect(adimDurumlari(imzali)).toEqual(['ok', 'ok', 'ok', 'ok', 'now']);
  });
  it('REDDEDİLEN başvuruda süreç 2. adımda durur', () => {
    expect(adimDurumlari(reddedilen)).toEqual(['ok', 'stop', 'wait', 'wait', 'wait']);
  });
});

describe('tamamlananAdim', () => {
  it('ilerlemeyi sayar', () => {
    expect(tamamlananAdim(bekleyen)).toBe(1);
    expect(tamamlananAdim(onayli)).toBe(3);
    expect(tamamlananAdim(imzali)).toBe(4);
  });
});
