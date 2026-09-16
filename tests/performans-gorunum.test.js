import { describe, it, expect } from 'vitest';
import {
  PERFORMANS_BOLUMLERI,
  bolumeGecerken,
  gezinmeDurumu,
  gorunumAcikMi,
  gorunumBasligi,
  gorunumCoz,
  gorunumDuzelt,
  gorunumSec,
  kullanilabilirBolumler,
  rolAciklamasi,
  varsayilanGorunum,
} from '../lib/performans-gorunum.js';

// Roller
const AKADEMISYEN = { own: true, dept: false, faculty: false };
const BOLUM_YETKILISI = { own: true, dept: true, faculty: false };
const FAKULTE_YETKILISI = { own: true, dept: true, faculty: true };
const YETKISIZ = { own: false, dept: false, faculty: false };
// Sistemde akademisyen kaydı olmayan fakülte yetkilisi
const SADECE_FAKULTE = { own: false, dept: true, faculty: true };

describe('PERFORMANS_BOLUMLERI', () => {
  it('eski beş görünümün hepsi hâlâ karşılanıyor', () => {
    const hepsi = PERFORMANS_BOLUMLERI.flatMap((b) => b.kapsamlar.map((k) => k.gorunum));
    expect(hepsi.sort()).toEqual(['dept', 'faculty', 'own', 'strateji', 'strateji-fac']);
  });

  it('her görünüm tekil', () => {
    const hepsi = PERFORMANS_BOLUMLERI.flatMap((b) => b.kapsamlar.map((k) => k.gorunum));
    expect(new Set(hepsi).size).toBe(hepsi.length);
  });
});

describe('kullanilabilirBolumler', () => {
  it('akademisyen: veri girişi + stratejik plan (bölüm), gösterge raporu yok', () => {
    const b = kullanilabilirBolumler(AKADEMISYEN);
    expect(b.map((x) => x.id)).toEqual(['veri', 'strateji']);
    expect(b[1].kapsamlar.map((k) => k.id)).toEqual(['bolum']);
  });

  it('bölüm yetkilisi: üçü de var, ama fakülte kapsamı yok', () => {
    const b = kullanilabilirBolumler(BOLUM_YETKILISI);
    expect(b.map((x) => x.id)).toEqual(['veri', 'gosterge', 'strateji']);
    expect(b[1].kapsamlar.map((k) => k.id)).toEqual(['bolum']);
    expect(b[2].kapsamlar.map((k) => k.id)).toEqual(['bolum']);
  });

  it('fakülte yetkilisi: her bölümde iki kapsam', () => {
    const b = kullanilabilirBolumler(FAKULTE_YETKILISI);
    expect(b[1].kapsamlar.map((k) => k.id)).toEqual(['bolum', 'fakulte']);
    expect(b[2].kapsamlar.map((k) => k.id)).toEqual(['bolum', 'fakulte']);
  });

  it('akademisyen kaydı olmayan yetkilide veri girişi çıkmaz', () => {
    expect(kullanilabilirBolumler(SADECE_FAKULTE).map((x) => x.id)).toEqual([
      'gosterge',
      'strateji',
    ]);
  });

  it('yetkisiz kullanıcıda hiçbir bölüm yok', () => {
    expect(kullanilabilirBolumler(YETKISIZ)).toEqual([]);
  });
});

describe('gorunumCoz / gorunumSec', () => {
  it('görünümü bölüm ve kapsama çözer', () => {
    expect(gorunumCoz('strateji-fac')).toMatchObject({ bolumId: 'strateji', kapsamId: 'fakulte' });
    expect(gorunumCoz('dept')).toMatchObject({ bolumId: 'gosterge', kapsamId: 'bolum' });
    expect(gorunumCoz('own')).toMatchObject({ bolumId: 'veri', kapsamId: 'own' });
  });

  it('bilinmeyen görünüm null', () => {
    expect(gorunumCoz('yok')).toBe(null);
    expect(gorunumCoz('')).toBe(null);
  });

  it('bölüm+kapsamdan görünüm üretir — çözümün tersi', () => {
    expect(gorunumSec('gosterge', 'fakulte')).toBe('faculty');
    expect(gorunumSec('strateji', 'bolum')).toBe('strateji');
    expect(gorunumSec('veri', 'own')).toBe('own');
  });

  it('olmayan eşleşmede boş döner', () => {
    expect(gorunumSec('veri', 'fakulte')).toBe('');
    expect(gorunumSec('yok', 'bolum')).toBe('');
  });
});

describe('gorunumAcikMi', () => {
  it('akademisyen fakülte raporunu göremez', () => {
    expect(gorunumAcikMi('faculty', AKADEMISYEN)).toBe(false);
    expect(gorunumAcikMi('strateji-fac', AKADEMISYEN)).toBe(false);
  });

  it('akademisyen stratejik plan bölüm görünümünü görebilir', () => {
    expect(gorunumAcikMi('strateji', AKADEMISYEN)).toBe(true);
  });

  it('bölüm yetkilisi bölüm raporunu görür', () => {
    expect(gorunumAcikMi('dept', BOLUM_YETKILISI)).toBe(true);
    expect(gorunumAcikMi('faculty', BOLUM_YETKILISI)).toBe(false);
  });
});

describe('varsayilanGorunum', () => {
  it('akademisyen kendi veri giriş ekranında açılır', () => {
    expect(varsayilanGorunum(AKADEMISYEN)).toBe('own');
    expect(varsayilanGorunum(BOLUM_YETKILISI)).toBe('own');
  });

  it('akademisyen kaydı yoksa gösterge raporunda açılır', () => {
    expect(varsayilanGorunum(SADECE_FAKULTE)).toBe('dept');
  });

  it('yetkisizde de bir değer döner — ekran boşa düşmez', () => {
    expect(varsayilanGorunum(YETKISIZ)).toBe('own');
  });
});

// ⚠ Akademisyen listesi geç yüklendiğinde `own` yetkisi sonradan açılıyor;
// kullanıcı o ana kadar başka bir sekmede takılı kalmamalı.
describe('gorunumDuzelt', () => {
  it('açık görünüme dokunmaz', () => {
    expect(gorunumDuzelt('dept', BOLUM_YETKILISI)).toBe('dept');
  });

  it('kapalı görünümde AYNI bölümde kalmaya çalışır', () => {
    // fakülte yetkisi yok → Stratejik Plan/Fakülte yerine Stratejik Plan/Bölüm
    expect(gorunumDuzelt('strateji-fac', BOLUM_YETKILISI)).toBe('strateji');
    // Gösterge/Fakülte yerine Gösterge/Bölüm
    expect(gorunumDuzelt('faculty', BOLUM_YETKILISI)).toBe('dept');
  });

  it('bölüm de kapalıysa varsayılana döner', () => {
    // akademisyende gösterge bölümü hiç yok
    expect(gorunumDuzelt('faculty', AKADEMISYEN)).toBe('own');
  });

  it('bilinmeyen görünüm varsayılana düşer', () => {
    expect(gorunumDuzelt('saçma', BOLUM_YETKILISI)).toBe('own');
  });

  it('yetkisiz kullanıcıda da çöker değil', () => {
    expect(gorunumDuzelt('dept', YETKISIZ)).toBe('own');
  });
});

describe('gezinmeDurumu', () => {
  it('fakülte yetkilisinde iki satır da çizilir', () => {
    const d = gezinmeDurumu('faculty', FAKULTE_YETKILISI);
    expect(d.bolumler.map((b) => b.id)).toEqual(['veri', 'gosterge', 'strateji']);
    expect(d.aktifBolum.id).toBe('gosterge');
    expect(d.kapsamlar.map((k) => k.id)).toEqual(['bolum', 'fakulte']);
    expect(d.aktifKapsam.id).toBe('fakulte');
    expect(d.tekBolum).toBe(false);
  });

  it('tek kapsamlı bölümde ikinci satır ÇİZİLMEZ', () => {
    // Veri girişinin tek kapsamı var
    expect(gezinmeDurumu('own', FAKULTE_YETKILISI).kapsamlar).toEqual([]);
    // Bölüm yetkilisinde gösterge raporunun da tek kapsamı var
    expect(gezinmeDurumu('dept', BOLUM_YETKILISI).kapsamlar).toEqual([]);
  });

  it('kapalı görünümle çağrılsa bile AYNI bölümde kalır', () => {
    // Akademisyende Stratejik Plan/Fakülte kapalı, ama Stratejik Plan/Bölüm
    // açık: kullanıcı bambaşka bir ekrana fırlatılmaz.
    const d = gezinmeDurumu('strateji-fac', AKADEMISYEN);
    expect(d.aktifBolum.id).toBe('strateji');
    expect(d.aktifKapsam.id).toBe('bolum');
  });

  it('bölümün tamamı kapalıysa varsayılana döner', () => {
    const d = gezinmeDurumu('faculty', AKADEMISYEN);
    expect(d.aktifBolum.id).toBe('veri');
    expect(d.aktifKapsam.id).toBe('own');
  });

  it('yetkisiz kullanıcıda boş ama çökmeyen durum', () => {
    const d = gezinmeDurumu('own', YETKISIZ);
    expect(d.bolumler).toEqual([]);
    expect(d.aktifBolum).toBe(null);
    expect(d.kapsamlar).toEqual([]);
    expect(d.tekBolum).toBe(true);
  });
});

// Bölüm değiştirirken kapsamın korunması: fakültede çalışan yetkili her
// geçişte yeniden "Fakülte"yi tıklamak zorunda kalmasın.
describe('bolumeGecerken', () => {
  it('aynı kapsam varsa korunur', () => {
    expect(bolumeGecerken('strateji', 'faculty', FAKULTE_YETKILISI)).toBe('strateji-fac');
    expect(bolumeGecerken('gosterge', 'strateji-fac', FAKULTE_YETKILISI)).toBe('faculty');
  });

  it('aynı kapsam yoksa bölümün ilk kapsamına düşer', () => {
    // Veri girişinde 'fakulte' kapsamı yok
    expect(bolumeGecerken('veri', 'faculty', FAKULTE_YETKILISI)).toBe('own');
    // Bölüm yetkilisinde fakülte kapsamı hiç açık değil
    expect(bolumeGecerken('strateji', 'dept', BOLUM_YETKILISI)).toBe('strateji');
  });

  it('kapalı bölüme geçilmek istenirse varsayılana döner', () => {
    expect(bolumeGecerken('gosterge', 'own', AKADEMISYEN)).toBe('own');
  });
});

describe('gorunumBasligi', () => {
  it('çok kapsamlı bölümde kapsamı da yazar', () => {
    expect(gorunumBasligi('faculty')).toBe('Gösterge Raporları · Fakülte');
    expect(gorunumBasligi('strateji')).toBe('Stratejik Plan · Bölümüm');
  });

  it('tek kapsamlı bölümde yalnız bölüm adı', () => {
    expect(gorunumBasligi('own')).toBe('Veri Girişi');
  });

  it('bilinmeyen görünümde boş', () => {
    expect(gorunumBasligi('yok')).toBe('');
  });
});

describe('rolAciklamasi', () => {
  it('her rol için ayrı cümle', () => {
    expect(rolAciklamasi(FAKULTE_YETKILISI)).toMatch(/Fakülte yetkilisi/);
    expect(rolAciklamasi(BOLUM_YETKILISI)).toMatch(/Bölüm yetkilisi/);
    expect(rolAciklamasi(AKADEMISYEN)).toMatch(/Akademisyen/);
  });

  it('yetkisize ne yapması gerektiği söylenir', () => {
    expect(rolAciklamasi(YETKISIZ)).toMatch(/kayıtlı olmanız/);
  });
});
