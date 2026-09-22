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
  tasinmisMi,
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

describe('taşınmış bölüm', () => {
  // Veri Girişi artık akademisyenin "Benim Sayfam" modülünde bir sekme.
  it('veri girişi taşınmış işaretli', () => {
    expect(tasinmisMi(PERFORMANS_BOLUMLERI.find((b) => b.id === 'veri'))).toBe(true);
  });

  it('taşınmayan bölümler işaretsiz', () => {
    ['gosterge', 'strateji'].forEach((id) =>
      expect(tasinmisMi(PERFORMANS_BOLUMLERI.find((b) => b.id === id))).toBe(false)
    );
  });

  it('boş girdide çökmez', () => {
    expect(tasinmisMi(null)).toBe(false);
  });
});

describe('kullanilabilirBolumler', () => {
  // Veri girişi taşındı: bu modülün gezinmesinde artık çıkmaz.
  it('akademisyen: yalnız stratejik plan (bölüm)', () => {
    const b = kullanilabilirBolumler(AKADEMISYEN);
    expect(b.map((x) => x.id)).toEqual(['strateji']);
    expect(b[0].kapsamlar.map((k) => k.id)).toEqual(['bolum']);
  });

  it('bölüm yetkilisi: gösterge + strateji, fakülte kapsamı yok', () => {
    const b = kullanilabilirBolumler(BOLUM_YETKILISI);
    expect(b.map((x) => x.id)).toEqual(['gosterge', 'strateji']);
    expect(b[0].kapsamlar.map((k) => k.id)).toEqual(['bolum']);
    expect(b[1].kapsamlar.map((k) => k.id)).toEqual(['bolum']);
  });

  it('fakülte yetkilisi: her bölümde iki kapsam', () => {
    const b = kullanilabilirBolumler(FAKULTE_YETKILISI);
    expect(b[0].kapsamlar.map((k) => k.id)).toEqual(['bolum', 'fakulte']);
    expect(b[1].kapsamlar.map((k) => k.id)).toEqual(['bolum', 'fakulte']);
  });

  it('veri girişi hiçbir yetkide listelenmez', () => {
    [AKADEMISYEN, BOLUM_YETKILISI, FAKULTE_YETKILISI, SADECE_FAKULTE].forEach((y) =>
      expect(kullanilabilirBolumler(y).map((x) => x.id)).not.toContain('veri')
    );
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

  // Taşınmış görünüm bu modülde artık açık değil — yetkisi olsa bile.
  it('veri girişi bu modülde açık değil', () => {
    expect(gorunumAcikMi('own', AKADEMISYEN)).toBe(false);
    expect(gorunumAcikMi('own', FAKULTE_YETKILISI)).toBe(false);
  });

  it('bölüm yetkilisi bölüm raporunu görür', () => {
    expect(gorunumAcikMi('dept', BOLUM_YETKILISI)).toBe(true);
    expect(gorunumAcikMi('faculty', BOLUM_YETKILISI)).toBe(false);
  });
});

describe('varsayilanGorunum', () => {
  it('sade akademisyen stratejik planda açılır', () => {
    expect(varsayilanGorunum(AKADEMISYEN)).toBe('strateji');
  });

  it('yetkili gösterge raporunda açılır', () => {
    expect(varsayilanGorunum(BOLUM_YETKILISI)).toBe('dept');
    expect(varsayilanGorunum(SADECE_FAKULTE)).toBe('dept');
  });

  // Eskiden burada 'own' dönülüyordu; o ekran artık bu modülde olmadığı
  // için çizilemeyen bir görünüm döndürmek olurdu.
  it('hiç açık bölüm yoksa boş döner', () => {
    expect(varsayilanGorunum(YETKISIZ)).toBe('');
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
    expect(gorunumDuzelt('faculty', AKADEMISYEN)).toBe('strateji');
  });

  it('bilinmeyen görünüm varsayılana düşer', () => {
    expect(gorunumDuzelt('saçma', BOLUM_YETKILISI)).toBe('dept');
  });

  // Taşınmış ekranda kalınmaz: 'own' kayıtlı kalan kullanıcı bu modülde
  // karşılığı olmayan bir görünümde takılırdı.
  it('taşınmış görünümden çıkılır', () => {
    expect(gorunumDuzelt('own', AKADEMISYEN)).toBe('strateji');
    expect(gorunumDuzelt('own', BOLUM_YETKILISI)).toBe('dept');
  });

  it('yetkisiz kullanıcıda da çöker değil', () => {
    expect(gorunumDuzelt('dept', YETKISIZ)).toBe('');
  });
});

describe('gezinmeDurumu', () => {
  it('fakülte yetkilisinde iki satır da çizilir', () => {
    const d = gezinmeDurumu('faculty', FAKULTE_YETKILISI);
    expect(d.bolumler.map((b) => b.id)).toEqual(['gosterge', 'strateji']);
    expect(d.aktifBolum.id).toBe('gosterge');
    expect(d.kapsamlar.map((k) => k.id)).toEqual(['bolum', 'fakulte']);
    expect(d.aktifKapsam.id).toBe('fakulte');
    expect(d.tekBolum).toBe(false);
  });

  it('tek kapsamlı bölümde ikinci satır ÇİZİLMEZ', () => {
    // Bölüm yetkilisinde gösterge raporunun tek kapsamı var
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
    expect(d.aktifBolum.id).toBe('strateji');
    expect(d.aktifKapsam.id).toBe('bolum');
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
    // Bölüm yetkilisinde fakülte kapsamı hiç açık değil
    expect(bolumeGecerken('strateji', 'dept', BOLUM_YETKILISI)).toBe('strateji');
  });

  it('taşınmış bölüme geçilemez — varsayılana döner', () => {
    expect(bolumeGecerken('veri', 'faculty', FAKULTE_YETKILISI)).toBe('dept');
  });

  it('kapalı bölüme geçilmek istenirse varsayılana döner', () => {
    expect(bolumeGecerken('gosterge', 'strateji', AKADEMISYEN)).toBe('strateji');
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
