// ══════════════════════════════════════════════════════════════
// MEZUNİYET DİLEKÇESİ (ders sildirme bölümüyle tek belge) — yerleşik PDF
//
// Kurum, Şablonlar → Mezuniyet altına kendi Word dilekçesini yükleyip
// alanlarını eşlediyse belge ONDAN üretilir (biçim birebir korunur). Şablon
// yoksa bu dosyadaki yerleşik biçim kullanılır: öğrenci akışı şablon
// yüklenmesini beklemeden çalışır.
//
// pdf-lib tarayıcıda çalışır; Türkçe harfler için DejaVu Sans gömülür
// (lib/tto-pdf.js ile aynı yol). Bağımlılıklar parametre olarak gelir ki
// dosya Node testlerinde de çalışsın.
// ══════════════════════════════════════════════════════════════

import { satirlaraBol } from './tto-pdf.js';
import { dilekceVerisi } from './mezuniyet-basvuru.js';

const A4 = [595.28, 841.89];
const KENAR = 44;
const DOLGU = 4;

const metin = (v) => String(v == null ? '' : v).trim();

/** Dilekçe metni. Silinecek ders varsa ders sildirme talebi de aynı metindedir. */
export function dilekceGovdesi(v, silinecekVar) {
  return (
    'Bölümünüz ' +
    (v.ogrenciNo || '……') +
    ' numaralı ' +
    (v.sinif ? v.sinif + '. sınıf ' : '') +
    'öğrencisiyim. Programımın gerektirdiği tüm dersleri ve koşulları tamamladım. ' +
    (silinecekVar
      ? 'Akademik danışmanımın belirlediği ve aşağıda listelenen derslerin transkriptimden ' +
        'silinmesini, ardından mezuniyet işlemlerimin başlatılmasını ve diplomamın ' +
        'düzenlenmesini arz ederim.'
      : 'Mezuniyet işlemlerimin başlatılması ve diplomamın düzenlenmesi için gereğini arz ederim.')
  );
}

/**
 * @param {object} p
 * @param {object} p.basvuru           mezuniyet_basvurulari kaydı
 * @param {object} p.PDFLib
 * @param {object} p.fontkit
 * @param {ArrayBuffer} p.fontNormal
 * @param {ArrayBuffer} p.fontKalin
 * @param {Date} [p.simdi]
 * @returns {Promise<Uint8Array>}
 */
export async function mezuniyetPdfOlustur(p) {
  const { PDFDocument, rgb } = p.PDFLib;
  const doc = await PDFDocument.create();
  doc.registerFontkit(p.fontkit);
  const normal = await doc.embedFont(p.fontNormal, { subset: true });
  const kalin = await doc.embedFont(p.fontKalin, { subset: true });
  const b = p.basvuru || {};
  const v = dilekceVerisi(b, p.simdi);
  const sil = Array.isArray(b.silinecekDersler) ? b.silinecekDersler : [];
  const baslik = 'MEZUNİYET DİLEKÇESİ';

  doc.setTitle(baslik + ' — ' + v.ogrenciAd);
  doc.setAuthor(v.ogrenciAd);
  doc.setCreator('ÇAKÜ Offline Asistan — Mezuniyet');

  const SIYAH = rgb(0.07, 0.09, 0.15);
  const GRI = rgb(0.42, 0.45, 0.5);
  const CIZGI = rgb(0.55, 0.58, 0.62);
  const ZEMIN = rgb(0.93, 0.94, 0.96);
  const icGenislik = A4[0] - 2 * KENAR;

  let sayfa = doc.addPage(A4);
  let y = A4[1] - KENAR;
  const yer = (h) => {
    if (y - h < KENAR) {
      sayfa = doc.addPage(A4);
      y = A4[1] - KENAR;
    }
  };
  const yaz = (s, x, yy, font, boyut, renk) =>
    sayfa.drawText(s, { x, y: yy, size: boyut, font, color: renk || SIYAH });
  const ortala = (s, font, boyut) => {
    satirlaraBol(s, font, boyut, icGenislik).forEach((satir) => {
      yer(boyut * 1.5);
      const w = font.widthOfTextAtSize(satir, boyut);
      yaz(satir, (A4[0] - w) / 2, y - boyut, font, boyut);
      y -= boyut * 1.5;
    });
  };
  const paragraf = (s, { boyut = 11, font = normal, girinti = 0 } = {}) => {
    satirlaraBol(s, font, boyut, icGenislik - girinti).forEach((satir) => {
      yer(boyut * 1.55);
      yaz(satir, KENAR + girinti, y - boyut, font, boyut);
      y -= boyut * 1.55;
    });
  };
  const sagaYasla = (s, font, boyut) => {
    yer(boyut * 1.6);
    const w = font.widthOfTextAtSize(s, boyut);
    yaz(s, A4[0] - KENAR - w, y - boyut, font, boyut);
    y -= boyut * 1.6;
  };
  const tablo = (basliklar, satirlar, oranlar, boyut = 9.5) => {
    const toplam = oranlar.reduce((a, c) => a + c, 0);
    const gen = oranlar.map((o) => (icGenislik * o) / toplam);
    const satirYuk = boyut * 1.32;
    const ciz = (hucreler, font, zemin) => {
      const parcalar = hucreler.map((h, i) => satirlaraBol(h, font, boyut, gen[i] - 2 * DOLGU));
      const yuk = Math.max(...parcalar.map((ps) => ps.length * satirYuk + 2 * DOLGU + 1));
      yer(yuk);
      let x = KENAR;
      parcalar.forEach((ps, i) => {
        if (zemin) sayfa.drawRectangle({ x, y: y - yuk, width: gen[i], height: yuk, color: ZEMIN });
        sayfa.drawRectangle({
          x,
          y: y - yuk,
          width: gen[i],
          height: yuk,
          borderColor: CIZGI,
          borderWidth: 0.6,
        });
        ps.forEach((satir, k) =>
          yaz(satir, x + DOLGU, y - DOLGU - boyut - k * satirYuk + 1.5, font, boyut)
        );
        x += gen[i];
      });
      y -= yuk;
    };
    ciz(basliklar, kalin, true);
    satirlar.forEach((r) => ciz(r, normal, false));
    y -= 8;
  };

  // ── Başlık ──
  ortala('T.C.', kalin, 12);
  ortala('ÇANKIRI KARATEKİN ÜNİVERSİTESİ', kalin, 12);
  if (v.fakulteAdi) ortala(v.fakulteAdi.toLocaleUpperCase('tr-TR'), kalin, 11.5);
  ortala(
    ((v.bolumAdi ? v.bolumAdi + ' ' : '') + 'Bölüm Başkanlığına').toLocaleUpperCase('tr-TR'),
    kalin,
    11.5
  );
  y -= 8;
  ortala(baslik, kalin, 11);
  y -= 14;

  paragraf(dilekceGovdesi(v, sil.length > 0), { girinti: 0 });
  y -= 8;
  sagaYasla(v.tarih, normal, 11);
  sagaYasla(v.ogrenciAd || '……………………………', kalin, 11);
  sagaYasla('İmza: ……………………', normal, 11);
  y -= 6;

  tablo(
    ['Öğrenci Bilgileri', ''],
    [
      ['Adı Soyadı', v.ogrenciAd],
      ['Öğrenci No', v.ogrenciNo],
      ['Bölüm', v.bolumAdi],
      ['Sınıf', v.sinif],
      ['AGNO', v.agno],
      ['Geçilen toplam AKTS', v.toplamAkts],
      ['Danışman', v.danisman],
    ],
    [1.4, 3]
  );
  tablo(
    ['İletişim Bilgileri', ''],
    [
      ['Telefon', v.telefon],
      ['E-posta', v.eposta],
      ['Adres', v.adres],
    ],
    [1.4, 3]
  );
  // Beyan: kurumun formundaki iki kutu (öğrenci arayüzde seçer).
  const beyan = String(b.silmeBeyani || '');
  paragraf(
    (beyan === 'yok' ? '[X] ' : '[  ] ') +
      'Mezuniyet için transkriptimden silinmesi gereken seçmeli başarısız dersim bulunmamaktadır.',
    { boyut: 9.5 }
  );
  paragraf(
    (beyan === 'var' ? '[X] ' : '[  ] ') +
      'Mezuniyet için aşağıda bildirdiğim seçmeli derslerin transkriptimden silinmesini istiyorum.',
    { boyut: 9.5 }
  );
  // Ders sildirme bölümü — danışmanın işaretlediği dersler (aynı dilekçe).
  if (sil.length && beyan !== 'yok') {
    paragraf('Silinmesi istenen dersler', { boyut: 10, font: kalin });
    tablo(
      ['Dersin Kodu ve Adı', 'Eğitim-Öğretim Yılı', 'Yarıyıl', 'AKTS', 'Statüsü'],
      sil.map((d) => [
        [metin(d.kod), metin(d.ad)].filter(Boolean).join(' '),
        metin(d.yil),
        metin(d.yariyil),
        metin(d.akts),
        metin(d.statu),
      ]),
      [3.2, 1.6, 1.2, 0.8, 1.1]
    );
  }
  if (v.eksikStajMetni) {
    paragraf('Eksik stajlar: ' + v.eksikStajMetni, { boyut: 9.5 });
  }

  tablo(
    ['Akademik Danışman', ''],
    [
      ['Adı Soyadı', v.danisman],
      ['İmza', ' \n \n '],
    ],
    [1.4, 3]
  );

  doc.getPages().forEach((sf, i, hepsi) => {
    const s = baslik + ' · ' + (v.ogrenciNo || '') + ' · Sayfa ' + (i + 1) + ' / ' + hepsi.length;
    sf.drawText(s, {
      x: A4[0] - KENAR - normal.widthOfTextAtSize(s, 7),
      y: 24,
      size: 7,
      font: normal,
      color: GRI,
    });
  });
  return doc.save();
}
