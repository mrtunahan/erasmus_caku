import { describe, it, expect } from 'vitest';
import { zipYaz, zipAdTemizle, crc32 } from '../server/lib/zip-yaz.js';

// Arşivi geri okuyan küçük çözümleyici — testler ZIP'i yalnız kendi
// yazdığımız yapıya göre değil, spesifikasyondaki alanlara göre doğrular.
function zipOku(buf) {
  const son = buf.length - 22;
  expect(buf.readUInt32LE(son)).toBe(0x06054b50); // EOCD imzası
  const adet = buf.readUInt16LE(son + 10);
  const cdBoy = buf.readUInt32LE(son + 12);
  const cdOfs = buf.readUInt32LE(son + 16);
  expect(cdOfs + cdBoy).toBe(son);

  const kayitlar = [];
  let p = cdOfs;
  for (let i = 0; i < adet; i++) {
    expect(buf.readUInt32LE(p)).toBe(0x02014b50);
    const bayrak = buf.readUInt16LE(p + 8);
    const yontem = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const boy = buf.readUInt32LE(p + 24);
    const adBoy = buf.readUInt16LE(p + 28);
    const yerelOfs = buf.readUInt32LE(p + 42);
    const ad = buf.slice(p + 46, p + 46 + adBoy).toString('utf8');

    // Yerel başlıktan veriyi çıkar
    expect(buf.readUInt32LE(yerelOfs)).toBe(0x04034b50);
    const yAdBoy = buf.readUInt16LE(yerelOfs + 26);
    const yEkBoy = buf.readUInt16LE(yerelOfs + 28);
    const vBas = yerelOfs + 30 + yAdBoy + yEkBoy;
    kayitlar.push({ ad, crc, boy, bayrak, yontem, veri: buf.slice(vBas, vBas + boy) });
    p += 46 + adBoy + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return kayitlar;
}

describe('crc32', () => {
  it('bilinen vektörü doğru hesaplar', () => {
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });
});

describe('zipAdTemizle', () => {
  it('dizin kaçışını etkisizleştirir', () => {
    expect(zipAdTemizle('../../etc/passwd')).not.toContain('..');
    expect(zipAdTemizle('../../etc/passwd')).not.toContain('/');
    expect(zipAdTemizle('a\\b\\c.pdf')).toBe('a_b_c.pdf');
  });

  it('Türkçe harfleri korur', () => {
    expect(zipAdTemizle('Tuğçe EĞİ dilekçe.pdf')).toBe('Tuğçe EĞİ dilekçe.pdf');
  });

  it('boş/geçersiz adda yedeğe düşer', () => {
    expect(zipAdTemizle('', 'yedek.pdf')).toBe('yedek.pdf');
    expect(zipAdTemizle('   ', 'yedek.pdf')).toBe('yedek.pdf');
    expect(zipAdTemizle(null, 'yedek.pdf')).toBe('yedek.pdf');
  });

  it('çok uzun adı kırpar', () => {
    expect(zipAdTemizle('x'.repeat(400)).length).toBeLessThanOrEqual(180);
  });
});

describe('zipYaz', () => {
  it('içeriği bozmadan paketler', () => {
    const a = Buffer.from('%PDF-1.4 birinci belge');
    const b = Buffer.from([0, 1, 2, 255, 254, 128]);
    const k = zipOku(
      zipYaz([
        { ad: 'a.pdf', veri: a },
        { ad: 'b.bin', veri: b },
      ])
    );
    expect(k.map((x) => x.ad)).toEqual(['a.pdf', 'b.bin']);
    expect(k[0].veri.equals(a)).toBe(true);
    expect(k[1].veri.equals(b)).toBe(true);
  });

  it('her kayıt için doğru CRC yazar', () => {
    const veri = Buffer.from('123456789');
    const k = zipOku(zipYaz([{ ad: 'x.txt', veri }]));
    expect(k[0].crc).toBe(0xcbf43926);
  });

  it('store yöntemi ve UTF-8 bayrağı kurulur', () => {
    const k = zipOku(zipYaz([{ ad: 'ö.pdf', veri: Buffer.from('x') }]));
    expect(k[0].yontem).toBe(0); // store
    expect(k[0].bayrak & 0x0800).toBe(0x0800); // ad UTF-8
  });

  it('aynı adı numaralandırır — arşivde dosya ezilmez', () => {
    const k = zipOku(
      zipYaz([
        { ad: 'transkript.pdf', veri: Buffer.from('bir') },
        { ad: 'transkript.pdf', veri: Buffer.from('iki') },
        { ad: 'transkript.pdf', veri: Buffer.from('üç') },
      ])
    );
    expect(k.map((x) => x.ad)).toEqual([
      'transkript.pdf',
      'transkript (2).pdf',
      'transkript (3).pdf',
    ]);
    expect(new Set(k.map((x) => x.ad)).size).toBe(3);
  });

  it('uzantısız adda numarayı sona ekler', () => {
    const k = zipOku(
      zipYaz([
        { ad: 'belge', veri: Buffer.from('a') },
        { ad: 'belge', veri: Buffer.from('b') },
      ])
    );
    expect(k[1].ad).toBe('belge (2)');
  });

  it('boş arşiv geçerli EOCD üretir', () => {
    const buf = zipYaz([]);
    expect(buf.length).toBe(22);
    expect(zipOku(buf)).toEqual([]);
  });

  it('boş içerikli dosyayı kabul eder', () => {
    const k = zipOku(zipYaz([{ ad: 'bos.txt', veri: Buffer.alloc(0) }]));
    expect(k[0].boy).toBe(0);
    expect(k[0].crc).toBe(0);
  });

  it('girdi dizi değilse boş arşiv döner', () => {
    expect(zipYaz(null).length).toBe(22);
    expect(zipYaz(undefined).length).toBe(22);
  });

  it('1980 öncesi tarihte de geçerli DOS damgası yazar', () => {
    // Ham DOS tarihi 0 olamaz; yıl alanı en az 1980'e sabitlenir.
    const buf = zipYaz([{ ad: 'x', veri: Buffer.from('a'), tarih: new Date('1970-01-01') }]);
    expect(buf.readUInt16LE(12)).toBeGreaterThan(0);
  });
});
