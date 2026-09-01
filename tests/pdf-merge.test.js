// Ders içeriklerini tek PDF'te birleştiren ucun saf yardımcıları.
//
// İki şey burada kolayca sessizce bozulur:
//   1) Kayıtta saklanan URL biçimi ('/api/files/download/klasor/dosya.pdf')
//      ile diskteki göreli yol arasındaki dönüşüm. Yanlış çözülürse dosya
//      "bulunamadı" diye atlanır ve birleşik PDF eksik çıkar.
//   2) Ayraç sayfası başlığındaki Türkçe harfler. pdf-lib'in StandardFonts'u
//      WinAnsi kodlar; ş/ğ/İ/ı gömülemez ve drawText HATA FIRLATIR — yani
//      tek bir Türkçe ders adı bütün birleştirmeyi düşürür.
//
// NOT: bu testler eskiden `server/routes/files.js`'i require ediyordu. O dosya
// bir express router'ı olduğu için yüklenmesi express/multer/mongodb'yi de
// yüklüyor; bu paketler `server/package.json`'da olduğundan kökten çalışan
// vitest suiti HİÇ toplayamıyor ve CI'da sürekli kırmızı kalıyordu. Saf
// yardımcılar artık `server/lib/dosya-adres.js`'te ve test onu okuyor.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { asciiIndirge, urlToRelPath } from '../server/lib/dosya-adres.js';

const require = createRequire(import.meta.url);
const crypto = require('crypto');

describe('urlToRelPath', () => {
  it('download URL’inden göreli yolu çıkarır', () => {
    expect(urlToRelPath('/api/files/download/muafiyet_belgeler/171_x.pdf')).toBe(
      'muafiyet_belgeler/171_x.pdf'
    );
  });

  it('view URL’ini de kabul eder', () => {
    expect(urlToRelPath('/api/files/view/muafiyet_belgeler/171_x.pdf')).toBe(
      'muafiyet_belgeler/171_x.pdf'
    );
  });

  it('query string’i atar', () => {
    expect(urlToRelPath('/api/files/download/genel/a.pdf?download=true')).toBe('genel/a.pdf');
  });

  it('zaten göreli olan yolu bozmaz', () => {
    expect(urlToRelPath('muafiyet_belgeler/171_x.pdf')).toBe('muafiyet_belgeler/171_x.pdf');
  });

  it('boş girdide boş döner', () => {
    expect(urlToRelPath('')).toBe('');
    expect(urlToRelPath(null)).toBe('');
  });
});

describe('asciiIndirge', () => {
  it('Türkçe harfleri ASCII karşılığına indirir', () => {
    expect(asciiIndirge('MÜHENDİSLİK ÇİZİMİ')).toBe('MUHENDISLIK CIZIMI');
    expect(asciiIndirge('şükrü ığdır öz')).toBe('sukru igdir oz');
  });

  it('ASCII dışında kalan her karakteri temizler (em dash dahil)', () => {
    expect(asciiIndirge('1. Karsi Kurum — Matematik I')).toBe('1. Karsi Kurum Matematik I');
  });

  it('çıktı yalnızca yazdırılabilir ASCII içerir', () => {
    const out = asciiIndirge('ÇAKÜ – Fizik II  \n\t Şube');
    expect(/^[\x20-\x7E]*$/.test(out)).toBe(true);
  });
});

// ── Aynı belgenin tekrar tekrar eklenmesi ──
// Öğrenciler bölümün TÜM ders içeriklerini taşıyan tek PDF'i her ders için
// ayrı yükleyebiliyor. Adrese göre tekilleştirme İŞE YARAMAZ (her yükleme ayrı
// ad alır); ölçüt içerik özeti olmalı. Bu test o ölçütü sabitliyor.
describe('icerik ozeti ile tekillestirme', () => {
  const ozetle = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

  it('ayni icerik ayni ozeti verir (ad farkli olsa da)', () => {
    const a = Buffer.from('%PDF-1.4 ayni icerik');
    const b = Buffer.from('%PDF-1.4 ayni icerik');
    expect(ozetle(a)).toBe(ozetle(b));
  });

  it('farkli icerik farkli ozet verir', () => {
    expect(ozetle(Buffer.from('%PDF-1.4 A'))).not.toBe(ozetle(Buffer.from('%PDF-1.4 B')));
  });

  it('tekrar eden dosyalar bir kez sayilir', () => {
    // Birlestirme dongusunun mantigi: gorulen ozet tekrar eklenmez.
    const dosyalar = ['katalog', 'katalog', 'katalog', 'baska'].map((x) => Buffer.from(x));
    const gorulen = new Set();
    const eklenen = [];
    const tekrarlar = [];
    dosyalar.forEach((buf, i) => {
      const o = ozetle(buf);
      if (gorulen.has(o)) {
        tekrarlar.push(i);
        return;
      }
      gorulen.add(o);
      eklenen.push(i);
    });
    expect(eklenen).toEqual([0, 3]);
    expect(tekrarlar).toEqual([1, 2]);
  });
});
