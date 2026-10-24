import { describe, it, expect } from 'vitest';
import { satirZeminiUygula } from '../lib/word-belge.js';

describe('satirZeminiUygula', () => {
  it('tcPr yoksa ekler, varsa şema sırasına (vAlign öncesi) yerleştirir', () => {
    const tr =
      '<w:tr><w:tc><w:p/></w:tc><w:tc><w:tcPr><w:tcW w:w="1"/><w:vAlign w:val="center"/></w:tcPr><w:p/></w:tc></w:tr>';
    const r = satirZeminiUygula(tr, '#b2ebf2');
    expect(r).toBe(
      '<w:tr><w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="B2EBF2"/></w:tcPr><w:p/></w:tc>' +
        '<w:tc><w:tcPr><w:tcW w:w="1"/><w:shd w:val="clear" w:color="auto" w:fill="B2EBF2"/><w:vAlign w:val="center"/></w:tcPr><w:p/></w:tc></w:tr>'
    );
  });
  it('şablondaki eski zemini değiştirir; boş tcPr ve geçersiz renk', () => {
    const tr =
      '<w:tr><w:tc><w:tcPr><w:shd w:fill="FFFFFF"/></w:tcPr></w:tc><w:tc><w:tcPr/></w:tc></w:tr>';
    const r = satirZeminiUygula(tr, 'C8E6C9');
    expect(r.match(/w:fill="C8E6C9"/g)).toHaveLength(2);
    expect(r).not.toContain('FFFFFF');
    expect(satirZeminiUygula(tr, '')).toBe(tr);
    expect(satirZeminiUygula(tr, 'kırmızı')).toBe(tr);
  });
  it('<w:tcBorders> gibi benzer adlı etiketleri hücre sanmaz', () => {
    const tr = '<w:tr><w:tc><w:tcPr><w:tcBorders/></w:tcPr></w:tc></w:tr>';
    expect(satirZeminiUygula(tr, '#000000')).toBe(
      '<w:tr><w:tc><w:tcPr><w:tcBorders/><w:shd w:val="clear" w:color="auto" w:fill="000000"/></w:tcPr></w:tc></w:tr>'
    );
  });
});
