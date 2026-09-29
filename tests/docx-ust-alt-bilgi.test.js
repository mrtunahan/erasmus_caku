import { describe, it, expect } from 'vitest';
import {
  ustAltAnahtar,
  ustAltSozluk,
  ustAltBilgiDoldur,
  UST_ALT_PARCA_RX,
} from '../lib/docx-ust-alt-bilgi.js';
import { ttoEtiketDegerleri, ttoSablonVerisi, bosTalep } from '../lib/tto-talep.js';

describe('docx üst/alt bilgi doldurma', () => {
  it('anahtar büyük/küçük harf, boşluk ve noktalamadan bağımsızdır', () => {
    expect(ustAltAnahtar('TTO E-posta')).toBe(ustAltAnahtar('tto eposta'));
    expect(ustAltAnahtar('İŞ')).toBe('iş');
  });

  it('eşleşen yer tutucuyu doldurur, XML kaçışı yapar, bilinmeyene dokunmaz', () => {
    const s = ustAltSozluk({ 'Doküman Kodu': 'A&B<1>' });
    const xml = '<w:r><w:t>{{Doküman Kodu}}</w:t></w:r><w:r><w:t>{{Bilinmeyen}}</w:t></w:r>';
    const out = ustAltBilgiDoldur(xml, s);
    expect(out).toContain('<w:t xml:space="preserve">A&amp;B&lt;1&gt;</w:t>');
    expect(out).toContain('<w:t>{{Bilinmeyen}}</w:t>');
  });

  it('metin içindeki birden çok yer tutucuyu doldurur', () => {
    const s = ustAltSozluk({ 'TTO Telefon': '123', 'TTO Web': 'w' });
    const out = ustAltBilgiDoldur(
      '<w:t xml:space="preserve">Tel: {{TTO Telefon}} web: {{TTO Web}}</w:t>',
      s
    );
    expect(out).toBe('<w:t xml:space="preserve">Tel: 123 web: w</w:t>');
  });

  it('yalnız header/footer parçalarını seçer', () => {
    expect(UST_ALT_PARCA_RX.test('word/header2.xml')).toBe(true);
    expect(UST_ALT_PARCA_RX.test('word/footer1.xml')).toBe(true);
    expect(UST_ALT_PARCA_RX.test('word/document.xml')).toBe(false);
  });

  it('TTO etiket sözlüğü parantezli ve parantezsiz adları içerir', () => {
    const veri = ttoSablonVerisi(bosTalep({ name: 'Ayşe Yılmaz' }), null, new Date('2026-01-02'));
    const d = ttoEtiketDegerleri(veri);
    expect(d['Doküman Kodu']).toBe('TTO-TF-001');
    expect(d['Talep No']).toBe(d['Talep No (TTO doldurur)']);
    const s = ustAltSozluk(d);
    expect(ustAltBilgiDoldur('<w:t>{{Revizyon No}}</w:t>', s)).toContain('>002<');
  });
});
