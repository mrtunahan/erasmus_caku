import { describe, it, expect } from 'vitest';
import {
  sayfaYazimGenisligi,
  tabloOlculeri,
  tabloyuSigdir,
  tablolariSayfayaSigdir,
} from '../lib/docx-tablo-sigdir.js';

const SECT =
  '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>';
// 12240 − 1440 − 1440 = 9360 twip yazım alanı

const grid = (ws) =>
  '<w:tblGrid>' + ws.map((w) => `<w:gridCol w:w="${w}"/>`).join('') + '</w:tblGrid>';
const hucre = (w, t) =>
  `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:tc>`;
const tablo = (ws, tblPr) =>
  `<w:tbl><w:tblPr>${tblPr || ''}<w:tblW w:w="${ws.reduce((a, b) => a + b, 0)}" w:type="dxa"/></w:tblPr>` +
  grid(ws) +
  '<w:tr>' +
  ws.map((w, i) => hucre(w, 'S' + i)).join('') +
  '</w:tr></w:tbl>';

const gridToplam = (xml) =>
  (xml.match(/<w:gridCol\b[^>]*\sw:w="(\d+)"/g) || []).reduce(
    (a, s) => a + parseInt(s.match(/w:w="(\d+)"/)[1], 10),
    0
  );

describe('sayfaYazimGenisligi', () => {
  it('sayfa genişliğinden kenar boşluklarını düşer', () => {
    expect(sayfaYazimGenisligi(SECT)).toBe(9360);
  });

  it('yatay sayfada da w:w geçerlidir', () => {
    const yatay =
      '<w:sectPr><w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/><w:pgMar w:left="1080" w:right="1080"/></w:sectPr>';
    expect(sayfaYazimGenisligi(yatay)).toBe(13680);
  });

  it('sectPr yoksa Word varsayılanı (A4 dikey) kullanılır', () => {
    expect(sayfaYazimGenisligi('<w:body></w:body>')).toBe(11906 - 2880);
  });

  it('bölüm sonu olan belgede GÖVDE bölümü (sonuncusu) esas alınır', () => {
    const ara = '<w:sectPr><w:pgSz w:w="15840"/><w:pgMar w:left="720" w:right="720"/></w:sectPr>';
    expect(sayfaYazimGenisligi(ara + SECT)).toBe(9360);
  });
});

describe('tabloOlculeri', () => {
  it('ızgara toplamını ve sol girintiyi verir', () => {
    const x = tablo([2000, 3000], '<w:tblInd w:w="600" w:type="dxa"/>');
    expect(tabloOlculeri(x)).toEqual({ izgara: 5000, girinti: 600 });
  });

  it('negatif girinti sıfır sayılır', () => {
    const x = tablo([1000], '<w:tblInd w:w="-200" w:type="dxa"/>');
    expect(tabloOlculeri(x).girinti).toBe(0);
  });
});

describe('tabloyuSigdir', () => {
  it('SIĞAN tabloya hiç dokunmaz', () => {
    const x = tablo([2000, 3000]);
    expect(tabloyuSigdir(x, 9360)).toBe(x);
  });

  it('taşan tabloyu yazım alanına indirir', () => {
    const x = tablo([1200, 3800, 900, 1100, 1200, 3800, 900, 1100]); // 14000
    const y = tabloyuSigdir(x, 9360);
    expect(gridToplam(y)).toBeLessThanOrEqual(9360);
    // Yuvarlama payı küçük olmalı — tablo sayfayı gerçekten doldursun
    expect(gridToplam(y)).toBeGreaterThan(9360 - 20);
  });

  it('sütun oranlarını KORUR', () => {
    const x = tablo([1000, 3000]); // 1:3
    const y = tabloyuSigdir(x, 2000);
    const ws = (y.match(/<w:gridCol\b[^>]*\sw:w="(\d+)"/g) || []).map((s) =>
      parseInt(s.match(/w:w="(\d+)"/)[1], 10)
    );
    expect(ws[1] / ws[0]).toBeCloseTo(3, 1);
  });

  it('hücre genişlikleri de ölçeklenir', () => {
    const x = tablo([4000, 6000]);
    const y = tabloyuSigdir(x, 5000);
    const tcw = (y.match(/<w:tcW\b[^>]*\sw:w="(\d+)"/g) || []).map((s) =>
      parseInt(s.match(/w:w="(\d+)"/)[1], 10)
    );
    expect(tcw[0] + tcw[1]).toBeLessThanOrEqual(5000);
  });

  it('yüzde genişlikli hücreye dokunulmaz', () => {
    const x =
      '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/></w:tblPr>' +
      grid([7000, 7000]) +
      '<w:tr><w:tc><w:tcPr><w:tcW w:w="2500" w:type="pct"/></w:tcPr><w:p/></w:tc></w:tr></w:tbl>';
    const y = tabloyuSigdir(x, 9360);
    expect(y).toContain('<w:tcW w:w="2500" w:type="pct"/>');
    expect(y).toContain('<w:tblW w:w="5000" w:type="pct"/>');
    expect(gridToplam(y)).toBeLessThanOrEqual(9360);
  });

  it('sol girinti sıfırlanır ve düzen sabitlenir', () => {
    const x = tablo([7000, 7000], '<w:tblInd w:w="600" w:type="dxa"/>');
    const y = tabloyuSigdir(x, 9360);
    expect(y).toContain('<w:tblInd w:w="0" w:type="dxa"/>');
    expect(y).toContain('<w:tblLayout w:type="fixed"/>');
  });

  it('mevcut tblLayout "autofit" ise sabite çevrilir', () => {
    const x = tablo([7000, 7000], '<w:tblLayout w:type="autofit"/>');
    const y = tabloyuSigdir(x, 9360);
    expect(y).toContain('<w:tblLayout w:type="fixed"/>');
    expect(y).not.toContain('autofit');
  });
});

describe('tablolariSayfayaSigdir', () => {
  it('belgedeki taşan tabloyu düzeltir, sığanı bırakır', () => {
    const dar = tablo([2000, 3000]);
    const genis = tablo([7000, 7000]);
    const xml = '<w:body><w:p/>' + dar + '<w:p/>' + genis + SECT + '</w:body>';
    const out = tablolariSayfayaSigdir(xml);
    expect(out).toContain(dar); // dokunulmadı
    expect(out).not.toContain(genis);
    // İki tablo da yerinde ve sıra korunmuş
    expect((out.match(/<w:tbl(?=[\s>])/g) || []).length).toBe(2);
    expect(out.indexOf('<w:tbl') < out.indexOf(SECT)).toBe(true);
  });

  it('İÇ İÇE tabloya ayrıca dokunmaz — dış tabloyla birlikte küçülür', () => {
    const ic = tablo([1000, 1000]);
    const dis =
      '<w:tbl><w:tblPr><w:tblW w:w="14000" w:type="dxa"/></w:tblPr>' +
      grid([7000, 7000]) +
      '<w:tr><w:tc><w:tcPr><w:tcW w:w="7000" w:type="dxa"/></w:tcPr>' +
      ic +
      '</w:tc></w:tr></w:tbl>';
    const out = tablolariSayfayaSigdir('<w:body>' + dis + SECT + '</w:body>');
    // İç tablonun 1000'lik sütunları da dış ölçekle küçüldü (ayrı ölçek YOK)
    const hepsi = (out.match(/<w:gridCol\b[^>]*\sw:w="(\d+)"/g) || []).map((s) =>
      parseInt(s.match(/w:w="(\d+)"/)[1], 10)
    );
    expect(hepsi.length).toBe(4);
    expect(hepsi[0] + hepsi[1]).toBeLessThanOrEqual(9360);
  });

  it('tablosuz belge aynen döner', () => {
    const xml = '<w:body><w:p><w:r><w:t>Merhaba</w:t></w:r></w:p>' + SECT + '</w:body>';
    expect(tablolariSayfayaSigdir(xml)).toBe(xml);
  });

  it('bozuk/eksik kapanışta belgeyi bozmaz', () => {
    const xml = '<w:body><w:tbl><w:tblPr/>' + grid([9000]) + SECT + '</w:body>';
    expect(tablolariSayfayaSigdir(xml)).toBe(xml);
  });
});
