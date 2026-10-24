import { describe, it, expect } from 'vitest';
import { yabanciBolumAdiAlanlari } from '../lib/sablon-bolum-adi.js';
import { renkLejantiXml, govdeSonunaEkle } from '../lib/word-belge.js';

const ADLAR = ['Bilgisayar Mühendisliği', 'Makine Mühendisliği', 'Gıda Mühendisliği'];

describe('şablonda sabit bölüm adı', () => {
  it('büyük harfle yazılmış başka bölüm adı çıktıyı alan bölümle değişir', () => {
    const a = yabanciBolumAdiAlanlari(
      'Vize - Güz 2026-2027 BİLGİSAYAR MÜHENDİSLİĞİ SINAV PROGRAMI',
      'Makine Mühendisliği',
      ADLAR
    );
    expect(a).toEqual([
      {
        token: 'BİLGİSAYAR MÜHENDİSLİĞİ',
        tokenOccurrence: 1,
        variable: 'const',
        value: 'MAKİNE MÜHENDİSLİĞİ',
      },
    ]);
  });
  it('kendi adı ya da hiç ad yoksa dokunulmaz; iki farklı bölüm adı varsa da', () => {
    expect(
      yabanciBolumAdiAlanlari('BİLGİSAYAR MÜHENDİSLİĞİ', 'Bilgisayar Mühendisliği', ADLAR)
    ).toEqual([]);
    expect(yabanciBolumAdiAlanlari('SINAV PROGRAMI', 'Makine Mühendisliği', ADLAR)).toEqual([]);
    expect(
      yabanciBolumAdiAlanlari(
        'Bilgisayar Mühendisliği ve Gıda Mühendisliği',
        'Makine Mühendisliği',
        ADLAR
      )
    ).toEqual([]);
  });
  it('aynı ad iki kez geçerse iki alan; olduğu gibi yazılmışsa olduğu gibi', () => {
    const a = yabanciBolumAdiAlanlari(
      'Bilgisayar Mühendisliği … Bilgisayar Mühendisliği Bölüm Başkanı',
      'Makine Mühendisliği',
      ADLAR
    );
    expect(a.map((x) => [x.tokenOccurrence, x.value])).toEqual([
      [1, 'Makine Mühendisliği'],
      [2, 'Makine Mühendisliği'],
    ]);
  });
});

describe('renk açıklaması', () => {
  it('her öğe kendi renginde hücre; geçersiz öğe atlanır', () => {
    const x = renkLejantiXml([
      { renk: '#B2EBF2', etiket: '1. Sınıf' },
      { renk: 'yok', etiket: 'x' },
    ]);
    expect(x).toContain('w:fill="B2EBF2"');
    expect(x).toContain('1. Sınıf');
    expect(x).not.toContain('>x<');
    expect(renkLejantiXml([])).toBe('');
  });
  it('gövde sonuna, bölüm ayarlarından önce eklenir', () => {
    const d = '<w:document><w:body><w:p/><w:sectPr><w:pgSz/></w:sectPr></w:body></w:document>';
    expect(govdeSonunaEkle(d, '<EK/>')).toBe(
      '<w:document><w:body><w:p/><EK/><w:sectPr><w:pgSz/></w:sectPr></w:body></w:document>'
    );
    const sectsiz = '<w:document><w:body><w:p/></w:body></w:document>';
    expect(govdeSonunaEkle(sectsiz, '<EK/>')).toBe(
      '<w:document><w:body><w:p/><EK/></w:body></w:document>'
    );
  });
});

describe('şablonsuz Word sınav programı', () => {
  it('renk açıklaması tablodan sonra, bölüm ayarlarından önce yer alır', async () => {
    const { belgeXml } = await import('../lib/basit-docx.js');
    const x = belgeXml({
      baslik: 'MAKİNE MÜHENDİSLİĞİ — SINAV PROGRAMI',
      sutunlar: ['Ders'],
      satirlar: [{ hucreler: ['MAK101'], renk: 'B2EBF2' }],
      lejant: [{ renk: '#B2EBF2', etiket: '1. Sınıf' }],
    });
    const lejant = x.indexOf('Renk açıklaması');
    expect(lejant).toBeGreaterThan(x.indexOf('MAK101'));
    expect(lejant).toBeLessThan(x.indexOf('<w:sectPr'));
  });
});
