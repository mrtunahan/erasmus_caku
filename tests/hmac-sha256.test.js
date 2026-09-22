import { describe, it, expect } from 'vitest';
import { createHash, createHmac } from 'node:crypto';
import { baytlar, esitMi, hmacHex, hmacSha256, onaltilik, sha256 } from '../lib/hmac-sha256.js';

const hex = (x) => onaltilik(sha256(x));

describe('sha256 — bilinen vektörler', () => {
  it('boş girdi', () => {
    expect(hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('"abc"', () => {
    expect(hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  // 56 bayt: dolgu tam sınırda — blok sayısını yanlış hesaplayan uygulama
  // burada patlar.
  it('448 bitlik girdi (dolgu sınırı)', () => {
    const g = 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq';
    expect(g.length).toBe(56);
    expect(hex(g)).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  });

  it('tek blok taşması (64 bayt)', () => {
    const g = 'a'.repeat(64);
    expect(hex(g)).toBe(createHash('sha256').update(g).digest('hex'));
  });
});

describe('sha256 — node:crypto ile birebir', () => {
  // ⚠ Aynı kod sunucuda da çalışıyor; sapma ders ortasında yoklamayı durdurur.
  it('çeşitli uzunluklarda aynı sonucu verir', () => {
    for (const n of [0, 1, 3, 55, 56, 63, 64, 65, 119, 120, 127, 128, 1000]) {
      const g = 'x'.repeat(n);
      expect(hex(g), 'uzunluk ' + n).toBe(createHash('sha256').update(g).digest('hex'));
    }
  });

  it('Türkçe harflerde de aynı — UTF-8 çok baytlıdır', () => {
    const g = 'Şık İğne Ğ ÇÖÜ ıöçşğü';
    expect(hex(g)).toBe(createHash('sha256').update(g, 'utf8').digest('hex'));
  });
});

describe('hmacSha256', () => {
  // RFC 4231 Test Case 2
  it('RFC 4231 — kısa anahtar', () => {
    expect(hmacHex('Jefe', 'what do ya want for nothing?')).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843'
    );
  });

  // RFC 4231 Test Case 1 — 20 baytlık 0x0b anahtarı
  it('RFC 4231 — bayt dizisi anahtar', () => {
    const anahtar = new Uint8Array(20).fill(0x0b);
    expect(hmacHex(anahtar, 'Hi There')).toBe(
      'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7'
    );
  });

  // 64 bayttan uzun anahtar önce özetlenir — atlanırsa sunucu ile istemci
  // farklı imza üretir.
  it('64 bayttan uzun anahtar özetlenir', () => {
    const uzun = 'k'.repeat(200);
    expect(hmacHex(uzun, 'mesaj')).toBe(
      createHmac('sha256', uzun).update('mesaj', 'utf8').digest('hex')
    );
  });

  it('node:crypto ile birebir', () => {
    const ornekler = [
      ['sirr', ''],
      ['', 'mesaj'],
      ['a'.repeat(64), 'tam blok anahtar'],
      ['gizli-anahtar-123', 'oturum.4711.2938471'],
      ['şifre', 'Türkçe mesaj İĞÜ'],
    ];
    ornekler.forEach(([k, m]) => {
      expect(hmacHex(k, m), k + '|' + m).toBe(
        createHmac('sha256', k).update(m, 'utf8').digest('hex')
      );
    });
  });

  it('özet 32 bayttır', () => {
    expect(hmacSha256('a', 'b')).toHaveLength(32);
  });

  it('anahtar değişince imza değişir', () => {
    expect(hmacHex('a', 'mesaj')).not.toBe(hmacHex('b', 'mesaj'));
  });
});

describe('baytlar', () => {
  it('Uint8Array olduğu gibi döner', () => {
    const u = new Uint8Array([1, 2, 3]);
    expect(baytlar(u)).toBe(u);
  });

  it('null boş diziye düşer — çökmez', () => {
    expect(baytlar(null)).toHaveLength(0);
  });
});

describe('esitMi', () => {
  it('aynı dizeler eşit', () => {
    expect(esitMi('abc123', 'abc123')).toBe(true);
  });

  it('farklı dizeler eşit değil', () => {
    expect(esitMi('abc123', 'abc124')).toBe(false);
    expect(esitMi('abc', 'abcd')).toBe(false);
  });

  it('null güvenli', () => {
    expect(esitMi(null, '')).toBe(true);
    expect(esitMi(null, 'a')).toBe(false);
  });
});

describe('baytlar — elle yazılmış UTF-8', () => {
  // Kodlama TextEncoder yerine elle yazıldı; sapması imzayı bozar.
  it('çok baytlı karakterleri doğru kodlar', () => {
    const ornekler = ['', 'abc', 'şğüöçıİŞĞÜÖÇ', 'Ω≈ç√∫', '𝄞 müzik', 'a𝄞b', '\u0000\u007f'];
    ornekler.forEach((g) => {
      expect(Array.from(baytlar(g)), JSON.stringify(g)).toEqual(Array.from(Buffer.from(g, 'utf8')));
    });
  });

  it('vekil çift tek kod noktası sayılır', () => {
    expect(baytlar('𝄞')).toHaveLength(4);
  });
});
