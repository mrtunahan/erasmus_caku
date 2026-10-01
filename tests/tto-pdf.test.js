import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as PDFLib from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { ttoPdfOlustur, satirlaraBol } from '../lib/tto-pdf.js';

const yazitipi = (ad) => fs.readFileSync(path.join(__dirname, '..', 'public', 'yazitipi', ad));
const FONT_N = yazitipi('DejaVuSans-tr.ttf');
const FONT_K = yazitipi('DejaVuSans-Bold-tr.ttf');

const talep = {
  durum: 'taslak',
  genel: { adSoyad: 'Ahmet Haşim Kayabaşı', unvan: 'Doç. Dr.', kurum: 'ÇAKÜ', email: 'a@b.c' },
  nitelik: ['laboratuvar'],
  proje: {},
  ozet: 'Özet ğüşıöç İĞÜŞÖÇ '.repeat(200),
  beyan: true,
};

describe('ttoPdfOlustur', () => {
  it('Türkçe harflerle geçerli, çok sayfalı bir PDF üretir', async () => {
    const bayt = await ttoPdfOlustur({
      talep,
      PDFLib,
      fontkit,
      fontNormal: FONT_N,
      fontKalin: FONT_K,
    });
    expect(Buffer.from(bayt.slice(0, 5)).toString()).toBe('%PDF-');
    const geri = await PDFLib.PDFDocument.load(bayt);
    expect(geri.getPageCount()).toBeGreaterThanOrEqual(2);
    expect(geri.getTitle()).toMatch(/İŞBİRLİĞİ TALEP FORMU — Ahmet Haşim Kayabaşı/);
    expect(geri.getSubject()).toBe('TTO-TF-001');
  });
});

describe('satirlaraBol', () => {
  // Genişlik = karakter sayısı gibi davranan sahte yazı tipi.
  const font = { widthOfTextAtSize: (s) => s.length };
  it('kelimeleri genişliğe göre sarar, satır sonlarını korur', () => {
    expect(satirlaraBol('bir iki üç dört', font, 1, 7)).toEqual(['bir iki', 'üç dört']);
    expect(satirlaraBol('a\n\nb', font, 1, 10)).toEqual(['a', '', 'b']);
  });
  it('sığmayan uzun kelimeyi böler', () => {
    expect(satirlaraBol('abcdefghij', font, 1, 4)).toEqual(['abcd', 'efgh', 'ij']);
  });
});
