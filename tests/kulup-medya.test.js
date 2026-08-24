import { describe, it, expect } from 'vitest';
import {
  uzanti,
  medyaTuru,
  onizlenebilirMi,
  medyaEkleri,
  belgeEkleri,
  FEED_KABUL,
  boyutMetni,
} from '../lib/kulup-medya.js';

describe('uzanti', () => {
  it('son noktadan sonrasını küçük harfle verir', () => {
    expect(uzanti('afis.JPG')).toBe('jpg');
    expect(uzanti('rapor.son.surum.pdf')).toBe('pdf');
  });

  it('uzantısız, boş ve nokta ile biten adlarda boş döner', () => {
    expect(uzanti('LICENSE')).toBe('');
    expect(uzanti('')).toBe('');
    expect(uzanti('dosya.')).toBe('');
    expect(uzanti(null)).toBe('');
  });
});

describe('medyaTuru', () => {
  it('görselleri tanır', () => {
    ['a.jpg', 'a.jpeg', 'a.png', 'a.gif', 'a.webp', 'a.avif', 'a.bmp'].forEach((n) => {
      expect(medyaTuru({ name: n })).toBe('gorsel');
    });
  });

  it('videoları tanır', () => {
    ['t.mp4', 't.webm', 't.mov', 't.m4v', 't.ogv'].forEach((n) => {
      expect(medyaTuru({ name: n })).toBe('video');
    });
  });

  it('belgeleri medya saymaz', () => {
    ['r.pdf', 'r.docx', 'r.xlsx', 'r.zip', 'r'].forEach((n) => {
      expect(medyaTuru({ name: n })).toBe('belge');
    });
  });

  it('SVG görseldir — <img> ile güvenle çizilir', () => {
    expect(medyaTuru({ name: 'logo.svg' })).toBe('gorsel');
  });

  it('mime varsa uzantıya bakmadan karar verir', () => {
    expect(medyaTuru({ name: 'ek', mimetype: 'image/png' })).toBe('gorsel');
    expect(medyaTuru({ name: 'ek', mimetype: 'video/mp4' })).toBe('video');
    expect(medyaTuru({ name: 'ek', mimetype: 'application/pdf' })).toBe('belge');
  });

  it('ad yoksa adresten çözer, sorgu dizesi türü bozmaz', () => {
    expect(medyaTuru({ url: '/api/files/download/club_posts/1_afis.png' })).toBe('gorsel');
    expect(medyaTuru({ url: '/api/files/download/club_posts/1_tanitim.mp4?v=2' })).toBe('video');
  });

  it('boş girdide belge döner — çökmez', () => {
    expect(medyaTuru(null)).toBe('belge');
    expect(medyaTuru({})).toBe('belge');
  });
});

describe('ekler ayrışması', () => {
  const ekler = [
    { name: 'afis.png' },
    { name: 'program.pdf' },
    { name: 'tanitim.mp4' },
    { name: 'liste.xlsx' },
  ];

  it('medya ve belge ayrılır, sıra korunur', () => {
    expect(medyaEkleri(ekler).map((f) => f.name)).toEqual(['afis.png', 'tanitim.mp4']);
    expect(belgeEkleri(ekler).map((f) => f.name)).toEqual(['program.pdf', 'liste.xlsx']);
  });

  it('ikisi birlikte bütün ekleri kapsar', () => {
    expect(medyaEkleri(ekler).length + belgeEkleri(ekler).length).toBe(ekler.length);
  });

  it('boş listede boş dizi döner', () => {
    expect(medyaEkleri(null)).toEqual([]);
    expect(belgeEkleri(undefined)).toEqual([]);
  });

  it('onizlenebilirMi medyaTuru ile tutarlıdır', () => {
    ekler.forEach((f) => {
      expect(onizlenebilirMi(f)).toBe(medyaTuru(f) !== 'belge');
    });
  });
});

describe('FEED_KABUL', () => {
  it('video ve görsel uzantılarını içerir', () => {
    ['.mp4', '.webm', '.jpg', '.png', '.pdf', '.docx'].forEach((u) => {
      expect(FEED_KABUL).toContain(u);
    });
  });
});

describe('boyutMetni', () => {
  it('bayt, KB ve MB eşiklerini ayırır', () => {
    expect(boyutMetni(512)).toBe('512 B');
    expect(boyutMetni(2048)).toBe('2 KB');
    expect(boyutMetni(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(boyutMetni(42 * 1024 * 1024)).toBe('42 MB');
  });

  it('geçersiz değerde boş döner', () => {
    expect(boyutMetni(0)).toBe('');
    expect(boyutMetni(null)).toBe('');
    expect(boyutMetni('abc')).toBe('');
  });
});
