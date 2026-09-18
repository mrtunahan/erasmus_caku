import { describe, it, expect } from 'vitest';
import {
  XLSX_STIL,
  calismaKitabiParcalari,
  satirXml,
  sayfaAdiDuzelt,
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

// ── SAYI HÜCRESİ ──
// Rapor sayfalarında ortalama sütunu toplanabilsin, sıralanabilsin diye JS
// sayısı Excel'e SAYI yazılır. Dizeler metin kalır: "08:15-09:00" tarihe,
// "2. Sınıf" sayıya dönüşmesin — bu, bu dosyanın eski kuralıdır.
describe('sayı hücreleri', () => {
  it('JS sayısı sayı olarak yazılır (inlineStr değil)', () => {
    const xml = satirXml([4.25], 1);
    expect(xml).toContain('<c r="A1"><v>4.25</v></c>');
    expect(xml).not.toContain('inlineStr');
  });

  it('nesne biçiminde de sayı, stil korunur', () => {
    expect(satirXml([{ v: 12, stil: 2 }], 3)).toContain('<c r="A3" s="2"><v>12</v></c>');
  });

  it('SAYI GİBİ DURAN DİZE metin kalır', () => {
    expect(satirXml(['2'], 1)).toContain('t="inlineStr"');
    expect(satirXml(['08:15-09:00'], 1)).toContain('t="inlineStr"');
  });

  it('sıfır sayı olarak yazılır — boş hücre sanılmaz', () => {
    expect(satirXml([0], 1)).toContain('<v>0</v>');
  });

  it('sonsuz/NaN metne düşer — dosyayı bozmaz', () => {
    expect(satirXml([NaN], 1)).toContain('inlineStr');
    expect(satirXml([Infinity], 1)).toContain('inlineStr');
  });
});

describe('sayfaAdiDuzelt', () => {
  it('yasak işaretler temizlenir, 31 karakterde kesilir', () => {
    expect(sayfaAdiDuzelt('Yanıt/Özet: 2026', new Set())).toBe('Yanıt Özet  2026');
    expect(sayfaAdiDuzelt('a'.repeat(50), new Set())).toHaveLength(31);
  });

  // Aynı adlı iki sayfa varsa Excel dosyayı "onarmak" ister, biri kaybolur.
  it('çakışan ad numaralanır', () => {
    const k = new Set();
    expect(sayfaAdiDuzelt('Özet', k)).toBe('Özet');
    expect(sayfaAdiDuzelt('Özet', k)).toBe('Özet (2)');
    expect(sayfaAdiDuzelt('Özet', k)).toBe('Özet (3)');
  });

  it('Türkçe büyük/küçük harf farkı da çakışma sayılır', () => {
    const k = new Set();
    sayfaAdiDuzelt('Ozet', k);
    expect(sayfaAdiDuzelt('OZET', k)).toBe('OZET (2)');
  });

  it('boş ad varsayılana düşer', () => {
    expect(sayfaAdiDuzelt('', new Set())).toBe('Sayfa1');
    expect(sayfaAdiDuzelt(null, new Set())).toBe('Sayfa1');
  });
});

describe('calismaKitabiParcalari — çok sayfa', () => {
  const p = calismaKitabiParcalari({
    sayfalar: [
      { ad: 'Rapor', satirlar: [['Bilgi', 'Değer']], sutunGenislikleri: [20, 30] },
      {
        ad: 'Yanıtlar',
        satirlar: [
          ['#', 'Tarih'],
          [1, '01.03.2026'],
        ],
      },
      { ad: 'Yanıtlar', satirlar: [['x']] },
    ],
  });

  it('her sayfa için ayrı çalışma sayfası dosyası', () => {
    expect(p['xl/worksheets/sheet1.xml']).toContain('Bilgi');
    expect(p['xl/worksheets/sheet2.xml']).toContain('Tarih');
    expect(p['xl/worksheets/sheet3.xml']).toContain('>x<');
  });

  it('çalışma kitabı üç sayfayı da tanıtır', () => {
    expect(p['xl/workbook.xml']).toContain('name="Rapor" sheetId="1" r:id="rId1"');
    expect(p['xl/workbook.xml']).toContain('name="Yanıtlar" sheetId="2" r:id="rId2"');
    expect(p['xl/workbook.xml']).toContain('name="Yanıtlar (2)" sheetId="3" r:id="rId3"');
  });

  it('içerik türleri ve ilişkiler sayfa sayısıyla uyumlu', () => {
    expect(p['[Content_Types].xml'].match(/worksheets\/sheet\d\.xml/g) || []).toHaveLength(3);
    const rels = p['xl/_rels/workbook.xml.rels'];
    expect(rels).toContain(
      'Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"'
    );
    // Stil ilişkisi sayfalarla ÇAKIŞMAMALI: aynı rId iki parçayı gösterirse
    // Excel dosyayı açmaz.
    expect(rels).toContain('Id="rId4"');
    expect(rels).toContain('Target="styles.xml"');
  });

  it('tek sayfalık eski çağrı aynen çalışır', () => {
    const t = calismaKitabiParcalari({ sayfaAdi: 'Program', satirlar: [['A']] });
    expect(Object.keys(t)).toContain('xl/worksheets/sheet1.xml');
    expect(Object.keys(t)).not.toContain('xl/worksheets/sheet2.xml');
    expect(t['xl/workbook.xml']).toContain('name="Program"');
  });

  it('stil sayfası tüm sayfaların renklerini kapsar', () => {
    const c = calismaKitabiParcalari({
      sayfalar: [
        { ad: 'a', satirlar: [[{ v: 'x', renk: '#5B9BD5' }]] },
        { ad: 'b', satirlar: [[{ v: 'y', renk: '#ED7D31' }]] },
      ],
    });
    expect(c['xl/styles.xml']).toContain('FF5B9BD5');
    expect(c['xl/styles.xml']).toContain('FFED7D31');
  });
});
