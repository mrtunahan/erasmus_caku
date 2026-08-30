// ══════════════════════════════════════════════════════════════
// YOUTUBE BAĞLANTISI → GÖMME ADRESİ
//
// Kullanıcı bağlantıyı adres çubuğundan kopyalar; tek bir biçim değildir.
// Hepsi aynı videoyu göstermeli, tanınmayan adres SESSİZCE boş dönmeli
// (boş src ile iframe basılmasın).
// ══════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { videoKimligi, youtubeMu, gommeAdresi, kapakAdresi } from '../lib/youtube-gomme.js';

const ID = 'dQw4w9WgXcQ';

describe('videoKimligi', () => {
  it('bütün yaygın biçimleri çözer', () => {
    [
      `https://www.youtube.com/watch?v=${ID}`,
      `https://youtube.com/watch?v=${ID}&t=42s`,
      `https://m.youtube.com/watch?v=${ID}`,
      `https://youtu.be/${ID}`,
      `https://youtu.be/${ID}?t=42`,
      `https://www.youtube.com/embed/${ID}`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube.com/live/${ID}`,
      `https://www.youtube.com/v/${ID}`,
      `https://www.youtube-nocookie.com/embed/${ID}`,
    ].forEach((u) => expect(videoKimligi(u)).toBe(ID));
  });

  it('PROTOKOLSÜZ yapıştırmayı kabul eder — en sık yapılan şey', () => {
    expect(videoKimligi(`www.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(videoKimligi(`youtu.be/${ID}`)).toBe(ID);
  });

  it('baştaki/sondaki boşluğa takılmaz', () => {
    expect(videoKimligi(`   https://youtu.be/${ID}   `)).toBe(ID);
  });

  it('yalnız kimlik yapıştırılmışsa kabul eder', () => {
    expect(videoKimligi(ID)).toBe(ID);
  });

  it('YOUTUBE OLMAYAN adresi reddeder', () => {
    [
      'https://vimeo.com/123456',
      `https://kotusite.com/watch?v=${ID}`,
      `https://youtube.com.saldirgan.net/watch?v=${ID}`,
      'https://www.youtube.com/',
      'https://www.youtube.com/watch?v=kisa',
      'javascript:alert(1)',
      'not a url',
      '',
      null,
      undefined,
    ].forEach((u) => expect(videoKimligi(u)).toBe(''));
  });
});

describe('youtubeMu', () => {
  it('geçerli/geçersiz ayrımı', () => {
    expect(youtubeMu(`https://youtu.be/${ID}`)).toBe(true);
    expect(youtubeMu('https://vimeo.com/1')).toBe(false);
  });
});

describe('gommeAdresi', () => {
  it('ÇEREZSİZ alan adı kullanılır — ziyaretçiye iz bırakmadan', () => {
    expect(gommeAdresi(`https://youtu.be/${ID}`)).toBe(
      `https://www.youtube-nocookie.com/embed/${ID}?rel=0&modestbranding=1`
    );
  });
  it('çözülemeyen adreste BOŞ döner — boş src ile iframe basılmasın', () => {
    expect(gommeAdresi('https://vimeo.com/1')).toBe('');
    expect(gommeAdresi('')).toBe('');
  });
});

describe('kapakAdresi', () => {
  it('küçük resim adresi üretir', () => {
    expect(kapakAdresi(`https://youtu.be/${ID}`)).toBe(
      `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`
    );
  });
  it('geçersizde boş', () => {
    expect(kapakAdresi('yok')).toBe('');
  });
});
