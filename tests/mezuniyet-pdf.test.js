import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as PDFLib from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { mezuniyetPdfOlustur, dilekceGovdesi } from '../lib/mezuniyet-pdf.js';

const yazitipi = (ad) => fs.readFileSync(path.join(__dirname, '..', 'public', 'yazitipi', ad));

const basvuru = {
  ogrenciNo: '2021001',
  ogrenciAd: 'Ayşe Işık Çağlar',
  bolumAdi: 'Bilgisayar Mühendisliği',
  fakulteAdi: 'Mühendislik Fakültesi',
  sinif: '4',
  agno: '3,12',
  danisman: 'Dr. Öğr. Üyesi Mehmet Kaya',
  iletisim: { telefon: '0555 000 00 00', eposta: 'a@b.c', adres: 'Çankırı' },
  silinecekDersler: [{ kod: 'TAR101', ad: 'Türk Dili ve Tarih', akts: '2', not: 'CC' }],
  eksikStajlar: ['Staj II (Mühendislik Stajı)'],
};

async function uret(tur) {
  const bayt = await mezuniyetPdfOlustur({
    tur,
    basvuru,
    PDFLib,
    fontkit,
    fontNormal: yazitipi('DejaVuSans-tr.ttf'),
    fontKalin: yazitipi('DejaVuSans-Bold-tr.ttf'),
    simdi: new Date('2026-06-01'),
  });
  return PDFLib.PDFDocument.load(bayt);
}

describe('mezuniyet dilekçesi PDF', () => {
  it('mezuniyet dilekçesi Türkçe harflerle üretilir', async () => {
    const doc = await uret('dilekce');
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(doc.getTitle()).toContain('MEZUNİYET DİLEKÇESİ');
  });

  it('silinecek ders yoksa da üretilir', async () => {
    const bayt = await mezuniyetPdfOlustur({
      basvuru: { ...basvuru, silinecekDersler: [], eksikStajlar: [] },
      PDFLib,
      fontkit,
      fontNormal: yazitipi('DejaVuSans-tr.ttf'),
      fontKalin: yazitipi('DejaVuSans-Bold-tr.ttf'),
    });
    expect((await PDFLib.PDFDocument.load(bayt)).getPageCount()).toBe(1);
  });

  it('silinecek ders varsa ders sildirme talebi aynı metinde', () => {
    expect(dilekceGovdesi({ ogrenciNo: '1' }, false)).not.toMatch(/silinmesini/);
    expect(dilekceGovdesi({ ogrenciNo: '1' }, true)).toMatch(/silinmesini/);
  });
});
