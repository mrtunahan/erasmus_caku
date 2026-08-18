import { describe, it, expect } from 'vitest';
import {
  XLSX_STIL,
  calismaKitabiParcalari,
  satirXml,
  sayfaXml,
  sutunAdi,
  xlsxDosyaAdi,
} from '../lib/xlsx-yaz.js';

describe('sutunAdi', () => {
  it('sütun harflerini üretir', () => {
    expect(sutunAdi(0)).toBe('A');
    expect(sutunAdi(5)).toBe('F');
    expect(sutunAdi(25)).toBe('Z');
    expect(sutunAdi(26)).toBe('AA');
    expect(sutunAdi(27)).toBe('AB');
  });

  it('bozuk girdide A döner', () => {
    expect(sutunAdi(-1)).toBe('A');
    expect(sutunAdi(NaN)).toBe('A');
  });
});

describe('satirXml', () => {
  it('metin hücrelerini inlineStr yazar', () => {
    const xml = satirXml(['Saat', 'Pazartesi'], 1);
    expect(xml).toContain('<row r="1">');
    expect(xml).toContain('r="A1"');
    expect(xml).toContain('t="inlineStr"');
    expect(xml).toContain('Pazartesi');
  });

  it('boş hücre kendini kapatır (gereksiz metin düğümü yok)', () => {
    expect(satirXml(['', 'X'], 2)).toContain('<c r="A2"/>');
  });

  it('XML kaçışı yapar — ders adındaki & işareti dosyayı bozmaz', () => {
    const xml = satirXml(['Ölçme & Değerlendirme'], 1);
    expect(xml).toContain('&amp;');
    expect(xml).not.toContain('& D');
  });

  it('hücre içi satır sonu KORUNUR (çok dersli hücre)', () => {
    const xml = satirXml(['BIL201' + String.fromCharCode(10) + 'D-101'], 1);
    expect(xml).toContain(String.fromCharCode(10));
    expect(xml).toContain('xml:space="preserve"');
  });

  it('geçersiz denetim karakteri atılır', () => {
    const xml = satirXml(['A' + String.fromCharCode(7) + 'B'], 1);
    expect(xml).toContain('AB');
  });

  it('hücre başına stil verilebilir', () => {
    expect(satirXml([{ v: 'x', stil: XLSX_STIL.vurgu }], 1)).toContain('s="3"');
  });
});

describe('sayfaXml', () => {
  it('ilk satır başlık stilini, gövde satırları gövde stilini alır', () => {
    const xml = sayfaXml([['Saat'], ['08:15-09:00']], {
      baslikStili: XLSX_STIL.baslik,
      govdeStili: XLSX_STIL.govde,
    });
    expect(xml).toContain('<c r="A1" s="1"');
    expect(xml).toContain('<c r="A2" s="2"');
  });

  it('sütun genişlikleri ve donmuş başlık satırı yazılır', () => {
    const xml = sayfaXml([['a', 'b']], { sutunGenislikleri: [12, 30] });
    expect(xml).toContain('<col min="1" max="1" width="12"');
    expect(xml).toContain('<col min="2" max="2" width="30"');
    expect(xml).toContain('state="frozen"');
  });

  it('boş sayfada çökmez', () => {
    expect(sayfaXml([]).includes('<sheetData></sheetData>')).toBe(true);
  });
});

describe('calismaKitabiParcalari', () => {
  const p = calismaKitabiParcalari({ sayfaAdi: 'Program', satirlar: [['Saat']] });

  it('geçerli bir xlsx için gereken tüm parçaları üretir', () => {
    expect(Object.keys(p).sort()).toEqual(
      [
        '[Content_Types].xml',
        '_rels/.rels',
        'xl/_rels/workbook.xml.rels',
        'xl/styles.xml',
        'xl/workbook.xml',
        'xl/worksheets/sheet1.xml',
      ].sort()
    );
  });

  it('her parça XML bildirimiyle başlar', () => {
    Object.values(p).forEach((icerik) => expect(icerik.startsWith('<?xml')).toBe(true));
  });

  it('sayfa adı Excel kurallarına uydurulur', () => {
    const uzun = calismaKitabiParcalari({ sayfaAdi: 'a/b*c?d:e[f]g' + 'x'.repeat(40) });
    const ad = uzun['xl/workbook.xml'].match(/name="([^"]*)"/)[1];
    expect(ad.length).toBeLessThanOrEqual(31);
    expect(ad).not.toMatch(/[\\/*?:[\]]/);
  });
});

describe('xlsxDosyaAdi', () => {
  it('Türkçe karakterleri sadeleştirir ve uzantı ekler', () => {
    expect(xlsxDosyaAdi('Bilgisayar Mühendisliği — Güz')).toBe('Bilgisayar-Muhendisligi-Guz.xlsx');
    expect(xlsxDosyaAdi('')).toBe('tablo.xlsx');
  });
});
