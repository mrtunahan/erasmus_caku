import { describe, it, expect } from 'vitest';
import {
  WORD_MIME,
  belgeDosyaAdi,
  wordBaslik,
  wordBelgeXml,
  wordKacis,
  wordMaddeler,
  wordPaketDosyalari,
  wordParagraf,
  wordSayfaSonu,
  wordTablo,
} from '../lib/word-belge.js';

describe('wordKacis', () => {
  it('XML karakterlerini kaçırır', () => {
    expect(wordKacis('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
  });

  it('Türkçe harfler olduğu gibi kalır', () => {
    expect(wordKacis('Öğrt. Gör. ŞÜKRÜ ıİğĞ')).toBe('Öğrt. Gör. ŞÜKRÜ ıİğĞ');
  });

  // Word denetim karakteri gören dosyayı hiç açmaz: "içerik okunamıyor" der.
  it('denetim karakterlerini atar, sekme ve satır sonunu korur', () => {
    expect(wordKacis('a' + String.fromCharCode(0) + 'b' + String.fromCharCode(7) + 'c')).toBe(
      'abc'
    );
    expect(wordKacis('a\tb\nc')).toBe('a\tb\nc');
  });

  it('boş değerlerde boş dize', () => {
    expect(wordKacis(null)).toBe('');
    expect(wordKacis(undefined)).toBe('');
    expect(wordKacis(0)).toBe('0');
  });
});

describe('wordParagraf', () => {
  it('metni w:t içine koyar', () => {
    expect(wordParagraf('Merhaba')).toContain('<w:t xml:space="preserve">Merhaba</w:t>');
  });

  it('satır sonu w:br olur — yoksa Word metni tek satıra yapıştırır', () => {
    const p = wordParagraf('bir\niki');
    expect(p).toContain('<w:br/>');
    expect(p.match(/<w:t /g)).toHaveLength(2);
  });

  it('biçim seçenekleri rPr içine yazılır', () => {
    const p = wordParagraf('x', { kalin: true, italik: true, boyut: 24, renk: 'FF0000' });
    expect(p).toContain('<w:b/>');
    expect(p).toContain('<w:i/>');
    expect(p).toContain('<w:sz w:val="24"/>');
    expect(p).toContain('<w:color w:val="FF0000"/>');
  });

  it('boş metinde koşu yok ama paragraf var (boşluk satırı)', () => {
    expect(wordParagraf('')).toBe('<w:p></w:p>');
    expect(wordParagraf('', { sonrasi: 80 })).toContain('w:after="80"');
  });

  it('hiza yalnız gerektiğinde yazılır', () => {
    expect(wordParagraf('x', { hiza: 'left' })).not.toContain('w:jc');
    expect(wordParagraf('x', { hiza: 'center' })).toContain('<w:jc w:val="center"/>');
  });
});

describe('wordBaslik', () => {
  it('seviyeye göre büyüklük', () => {
    expect(wordBaslik('A', 1)).toContain('<w:sz w:val="32"/>');
    expect(wordBaslik('A', 2)).toContain('<w:sz w:val="26"/>');
    expect(wordBaslik('A', 3)).toContain('<w:sz w:val="22"/>');
  });

  it('bilinmeyen seviye 2 sayılır', () => {
    expect(wordBaslik('A', 9)).toContain('<w:sz w:val="26"/>');
  });
});

describe('wordMaddeler', () => {
  it('her madde bir paragraf, işaretle başlar', () => {
    const x = wordMaddeler(['bir', 'iki']);
    expect(x.match(/<w:p>/g)).toHaveLength(2);
    expect(x).toContain('•  bir');
  });

  it('boş maddeler atılır', () => {
    expect(wordMaddeler(['', null, 'var'])).toBe(wordMaddeler(['var']));
    expect(wordMaddeler([])).toBe('');
  });
});

describe('wordTablo', () => {
  const t = {
    basliklar: ['Şık', 'Kişi'],
    satirlar: [
      ['Katılıyorum', 12],
      ['Kararsızım', 3],
    ],
  };

  it('başlık satırı + veri satırları', () => {
    const x = wordTablo(t);
    expect(x.match(/<w:tr>|<w:tr><w:trPr>/g)).toHaveLength(3);
    expect(x).toContain('Katılıyorum');
    expect(x).toContain('>12<');
  });

  // Uzun tablo ikinci sayfaya taşınca sütunların ne olduğu orada da yazmalı.
  it('başlık satırı her sayfada tekrarlanır', () => {
    expect(wordTablo(t)).toContain('<w:tblHeader/>');
  });

  it('sütun oranları yüzdeye çevrilir, toplam 5000', () => {
    const x = wordTablo({ ...t, oranlar: [3, 1] });
    const paylar = [...x.matchAll(/<w:tcW w:w="(\d+)" w:type="pct"\/>/g)].map((m) => +m[1]);
    // başlık satırı + iki veri satırı = 3 kez [3750, 1250]
    expect(paylar.slice(0, 2)).toEqual([3750, 1250]);
    expect(paylar[0] + paylar[1]).toBe(5000);
  });

  it('oran verilmezse sütunlar eşit', () => {
    const x = wordTablo(t);
    const paylar = [...x.matchAll(/<w:tcW w:w="(\d+)" w:type="pct"\/>/g)].map((m) => +m[1]);
    expect(paylar[0]).toBe(paylar[1]);
  });

  it('eksik hücre boş yazılır — satır kaymaz', () => {
    const x = wordTablo({ basliklar: ['a', 'b', 'c'], satirlar: [['x']] });
    const sonSatir = x.slice(x.lastIndexOf('<w:tr>'));
    expect(sonSatir.match(/<w:tc>/g)).toHaveLength(3);
  });

  it('başlıksız tablo hiç çizilmez', () => {
    expect(wordTablo({ basliklar: [], satirlar: [[1]] })).toBe('');
    expect(wordTablo(null)).toBe('');
  });

  // İki tablo arka arkaya gelirse Word ikisini TEK tablo sayar.
  it('tablodan sonra ayırıcı paragraf var', () => {
    expect(wordTablo(t).endsWith('</w:p>')).toBe(true);
  });

  it('hücre metni kaçırılır', () => {
    expect(wordTablo({ basliklar: ['a'], satirlar: [['<script>']] })).toContain('&lt;script&gt;');
  });
});

describe('wordSayfaSonu', () => {
  it('sayfa sonu bir kırılma koşusudur', () => {
    expect(wordSayfaSonu()).toBe('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
  });
});

describe('wordBelgeXml', () => {
  it('gövdeyi belge iskeletine sarar', () => {
    const x = wordBelgeXml(wordParagraf('selam'));
    expect(x.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')).toBe(true);
    expect(x).toContain('<w:body>');
    expect(x).toContain('selam');
    expect(x.endsWith('</w:body></w:document>')).toBe(true);
  });

  it('A4 dikey varsayılan, istenirse yatay', () => {
    expect(wordBelgeXml('')).toContain('<w:pgSz w:w="11906" w:h="16838"/>');
    const y = wordBelgeXml('', { yatay: true });
    expect(y).toContain('w:w="16838"');
    expect(y).toContain('w:orient="landscape"');
  });

  it('boş gövdede bile geçerli belge', () => {
    expect(wordBelgeXml(null)).toContain('<w:body><w:sectPr>');
  });
});

describe('wordPaketDosyalari', () => {
  const p = wordPaketDosyalari(wordParagraf('x'));

  it('zip içine giren üç dosya', () => {
    expect(Object.keys(p).sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'word/document.xml',
    ]);
  });

  it('ilişki dosyası document.xml’i gösterir', () => {
    expect(p['_rels/.rels']).toContain('Target="word/document.xml"');
  });

  it('içerik türü Word belgesi', () => {
    expect(p['[Content_Types].xml']).toContain('wordprocessingml.document.main+xml');
    expect(WORD_MIME).toContain('wordprocessingml.document');
  });

  it('sayfa yönü paketin içine de geçer', () => {
    expect(wordPaketDosyalari('', { yatay: true })['word/document.xml']).toContain('landscape');
  });
});

describe('belgeDosyaAdi', () => {
  it('başlık + ek + uzantı', () => {
    expect(belgeDosyaAdi('Ders Değerlendirme', 'sonuc-raporu', 'docx')).toBe(
      'Ders Değerlendirme_sonuc-raporu.docx'
    );
  });

  it('dosya adında yasak karakterler temizlenir', () => {
    expect(belgeDosyaAdi('2025/2026: Anket?', '', 'xlsx')).toBe('2025 2026 Anket.xlsx');
  });

  it('Türkçe harfler korunur — dosya adı okunur kalsın', () => {
    expect(belgeDosyaAdi('Öğrenci Görüşü', '', 'docx')).toBe('Öğrenci Görüşü.docx');
  });

  it('boş başlıkta bile ad üretir', () => {
    expect(belgeDosyaAdi('', '', 'docx')).toBe('anket.docx');
    expect(belgeDosyaAdi('///', '', 'docx')).toBe('anket.docx');
  });

  it('çok uzun başlık kırpılır', () => {
    expect(belgeDosyaAdi('a'.repeat(200), '', 'docx').length).toBe(85);
  });
});
