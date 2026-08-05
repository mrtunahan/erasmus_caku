// Ders içeriklerini tek PDF'te birleştiren ucun saf yardımcıları.
//
// İki şey burada kolayca sessizce bozulur:
//   1) Kayıtta saklanan URL biçimi ('/api/files/download/klasor/dosya.pdf')
//      ile diskteki göreli yol arasındaki dönüşüm. Yanlış çözülürse dosya
//      "bulunamadı" diye atlanır ve birleşik PDF eksik çıkar.
//   2) Ayraç sayfası başlığındaki Türkçe harfler. pdf-lib'in StandardFonts'u
//      WinAnsi kodlar; ş/ğ/İ/ı gömülemez ve drawText HATA FIRLATIR — yani
//      tek bir Türkçe ders adı bütün birleştirmeyi düşürür.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const filesRouter = require('../server/routes/files.js');
const urlToRelPath = filesRouter._urlToRelPath;
const asciiIndirge = filesRouter._asciiIndirge;

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
