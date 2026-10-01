// ══════════════════════════════════════════════════════════════
// TTO TALEP FORMU — PDF ÇIKTISI
//
// Akademisyen formu PDF olarak indirir, çıktısını imzalar ve kaşeler, imzalı
// PDF'i sisteme yükleyerek TTO'ya gönderir (lib/tto-talep.js → süreç).
// Word çıktısının (ttoWordGovdesi) bölüm sırasını birebir izler; farklar:
//   • İmza/kaşe satırları elle imzalanacak kadar yüksektir.
//   • "TASLAK" notu basılmaz: form imzalanmak için GÖNDERİLMEDEN ÖNCE indirilir.
//
// PDF tarayıcıda pdf-lib ile üretilir; sunucuya ek program (LibreOffice
// vb.) gerekmez. Türkçe harfler (ğ ş ı İ) standart PDF yazı tiplerinde
// olmadığı için DejaVu Sans alt kümesi gömülür (public/yazitipi/).
//
// Bağımlılıklar parametre olarak gelir (PDFLib, fontkit, yazı tipi baytları):
// dosya hem tarayıcıda hem Node testlerinde aynı kodla çalışır.
// ══════════════════════════════════════════════════════════════

import { TTO_GENEL_ALANLAR, TTO_NITELIKLER, ttoAyarlari, ttoSablonVerisi } from './tto-talep.js';

const A4 = [595.28, 841.89];
const KENAR = 40;
const ALT_BOSLUK = 52; // altbilgi için ayrılan
const DOLGU = 4;

const metin = (v) => String(v == null ? '' : v);

/** Metni verilen genişliğe sığacak satırlara böler (çok uzun kelime de bölünür). */
export function satirlaraBol(yazi, font, boyut, genislik) {
  const sonuc = [];
  metin(yazi)
    .split('\n')
    .forEach((paragraf) => {
      const kelimeler = paragraf.split(/\s+/).filter((k) => k !== '');
      if (kelimeler.length === 0) {
        sonuc.push('');
        return;
      }
      let satir = '';
      const olc = (s) => font.widthOfTextAtSize(s, boyut);
      kelimeler.forEach((k) => {
        let kelime = k;
        // Tek başına sığmayan kelime harf harf bölünür.
        while (olc(kelime) > genislik) {
          let n = kelime.length - 1;
          while (n > 1 && olc(kelime.slice(0, n)) > genislik) n--;
          if (satir) {
            sonuc.push(satir);
            satir = '';
          }
          sonuc.push(kelime.slice(0, n));
          kelime = kelime.slice(n);
        }
        const aday = satir ? satir + ' ' + kelime : kelime;
        if (olc(aday) <= genislik) satir = aday;
        else {
          sonuc.push(satir);
          satir = kelime;
        }
      });
      sonuc.push(satir);
    });
  return sonuc;
}

/**
 * @param {object} p
 * @param {object} p.talep
 * @param {object} [p.ayarKaydi]  tto_ayarlar/genel
 * @param {object} p.PDFLib       pdf-lib modülü ({ PDFDocument, rgb })
 * @param {object} p.fontkit      @pdf-lib/fontkit
 * @param {Uint8Array|ArrayBuffer} p.fontNormal
 * @param {Uint8Array|ArrayBuffer} p.fontKalin
 * @param {Date} [p.simdi]
 * @returns {Promise<Uint8Array>}
 */
export async function ttoPdfOlustur(p) {
  const { PDFDocument, rgb } = p.PDFLib;
  const doc = await PDFDocument.create();
  doc.registerFontkit(p.fontkit);
  const normal = await doc.embedFont(p.fontNormal, { subset: true });
  const kalin = await doc.embedFont(p.fontKalin, { subset: true });
  const v = ttoSablonVerisi(p.talep, p.ayarKaydi, p.simdi);
  const a = ttoAyarlari(p.ayarKaydi);

  doc.setTitle(a.formAdi + ' — ' + (v.basvuruSahibi || ''));
  doc.setAuthor(v.basvuruSahibi || '');
  doc.setSubject(a.dokumanKodu);
  doc.setCreator('ÇAKÜ Offline Asistan — TTO');

  const SIYAH = rgb(0.07, 0.09, 0.15);
  const GRI = rgb(0.42, 0.45, 0.5);
  const CIZGI = rgb(0.55, 0.58, 0.62);
  const BASLIK_ZEMIN = rgb(0.93, 0.94, 0.96);
  const icGenislik = A4[0] - 2 * KENAR;

  let sayfa = null;
  let y = 0;
  const yeniSayfa = () => {
    sayfa = doc.addPage(A4);
    y = A4[1] - KENAR;
  };
  yeniSayfa();
  const yer = (h) => {
    if (y - h < ALT_BOSLUK) yeniSayfa();
  };

  const yaz = (s, x, yy, font, boyut, renk) =>
    sayfa.drawText(s, { x, y: yy, size: boyut, font, color: renk || SIYAH });

  /**
   * Tablo: başlık satırı gri zeminli ve kalın. Satırlar sayfaya sığmazsa
   * yeni sayfada başlık tekrar çizilir.
   */
  const tablo = ({ basliklar, satirlar, oranlar, hizalar, boyut = 9, minYukseklik = [] }) => {
    const n = basliklar.length;
    const o = oranlar || basliklar.map(() => 1);
    const toplam = o.reduce((x, z) => x + z, 0);
    const gen = o.map((x) => (icGenislik * x) / toplam);
    const satirYuk = boyut * 1.32;

    const satirCiz = (hucreler, font, zemin, enAz) => {
      const parcalar = hucreler.map((h, i) => satirlaraBol(h, font, boyut, gen[i] - 2 * DOLGU));
      const yuk = Math.max(
        enAz || 0,
        ...parcalar.map((ps) => ps.length * satirYuk + 2 * DOLGU + 1)
      );
      return { parcalar, yuk, font, zemin };
    };
    const ciz = (s) => {
      let x = KENAR;
      for (let i = 0; i < n; i++) {
        if (s.zemin) {
          sayfa.drawRectangle({
            x,
            y: y - s.yuk,
            width: gen[i],
            height: s.yuk,
            color: BASLIK_ZEMIN,
          });
        }
        sayfa.drawRectangle({
          x,
          y: y - s.yuk,
          width: gen[i],
          height: s.yuk,
          borderColor: CIZGI,
          borderWidth: 0.6,
        });
        s.parcalar[i].forEach((satir, k) => {
          const hiza = (hizalar && hizalar[i]) || 'left';
          const w = s.font.widthOfTextAtSize(satir, boyut);
          const sx =
            hiza === 'center'
              ? x + (gen[i] - w) / 2
              : hiza === 'right'
                ? x + gen[i] - DOLGU - w
                : x + DOLGU;
          yaz(satir, sx, y - DOLGU - boyut - k * satirYuk + 1.5, s.font, boyut);
        });
        x += gen[i];
      }
      y -= s.yuk;
    };

    const baslik = satirCiz(basliklar, kalin, true, 0);
    const govde = satirlar.map((r, i) => satirCiz(r, normal, false, minYukseklik[i] || 0));
    yer(baslik.yuk + (govde[0] ? govde[0].yuk : 0));
    ciz(baslik);
    govde.forEach((s) => {
      if (y - s.yuk < ALT_BOSLUK) {
        yeniSayfa();
        ciz(baslik);
      }
      ciz(s);
    });
    y -= 10;
  };

  const paragraf = (s, { boyut = 9.5, font = normal, renk } = {}) => {
    const satirlar = satirlaraBol(s, font, boyut, icGenislik);
    satirlar.forEach((satir) => {
      yer(boyut * 1.4);
      yaz(satir, KENAR, y - boyut, font, boyut, renk);
      y -= boyut * 1.4;
    });
    y -= 6;
  };

  // ── Üst bilgi ──
  tablo({
    basliklar: [a.kurumUst + '\n' + a.kurumAdi + '\n' + a.formAdi, 'Doküman Bilgisi'],
    satirlar: [
      ['', 'Doküman Kodu: ' + v.dokumanKodu],
      ['', 'Yayın Tarihi: ' + v.yayinTarihi],
      ['', 'Revizyon No: ' + v.revizyonNo],
      ['', 'Revizyon Tarihi: ' + v.revizyonTarihi],
    ],
    oranlar: [3, 1.4],
    boyut: 8.5,
  });
  tablo({
    basliklar: ['TTO tarafından doldurulacaktır', ''],
    satirlar: [
      ['Talep Tarihi', v.talepTarihi || '…… / …… / 20……'],
      ['Talep No', v.talepNo],
    ],
    oranlar: [1, 2],
  });
  tablo({
    basliklar: ['GENEL BİLGİLER', ''],
    satirlar: TTO_GENEL_ALANLAR.map((f) => [f.label, v[f.id]]),
    oranlar: [1, 2.4],
  });
  tablo({
    basliklar: ['TALEBİN NİTELİĞİ', ''],
    satirlar: TTO_NITELIKLER.map((x) => [x.no + '. ' + x.label, v['nitelik_' + x.id]]),
    oranlar: [5, 1],
    hizalar: ['left', 'center'],
  });
  const eh = (evet, hayir) => evet + ' Evet    ' + hayir + ' Hayır';
  tablo({
    basliklar: [
      'PROJE BİLGİLERİ (Talep proje ile ilgili ise kesinlikle doldurulması gerekmektedir)',
      '',
    ],
    satirlar: [
      ['1. Projenin adı nedir?', v.projeAd],
      [
        '2. Başvurulan / başvurulacak destek programı nedir? (TÜBİTAK, AB, KOSGEB gibi)',
        v.projeDestekProgrami,
      ],
      ['3. Proje konusu / amacı nedir?', v.projeKonu],
      ['4. Projenin planlanan bütçesi nedir?', v.projeButce],
      ['5. Projenin planlanan süresi nedir?', v.projeSure],
      ['6. Proje ortakları (sektörler / tedarikçiler)', v.projeOrtaklar],
      ['7. Projenin ticarileşme potansiyeli var mı?', eh(v.ticarilesmeEvet, v.ticarilesmeHayir)],
      ['8. Proje çıktısı ile patent vb. başvuru yapılacak mıdır?', eh(v.patentEvet, v.patentHayir)],
      [
        '9. Benzer proje/projeler var mı? Varsa nedir?',
        eh(v.benzerEvet, v.benzerHayir) + (v.benzerAciklama ? '\n' + v.benzerAciklama : ''),
      ],
    ],
    oranlar: [2, 2],
  });
  tablo({
    basliklar: ['TALEP ÖZETİ (Talebinizi kısaca açıklayınız.)'],
    satirlar: [[v.ozet || ' ']],
    minYukseklik: [60],
  });
  paragraf(a.beyanMetni);
  tablo({
    basliklar: ['BAŞVURU SAHİBİNİN', 'BAŞVURUYU ALAN KİŞİNİN'],
    satirlar: [
      ['Adı Soyadı: ' + v.basvuruSahibi, 'Adı Soyadı: ' + v.alanKisi],
      ['Kaşe ve İmza:', 'İmza:'],
      ['Tarih: ' + v.belgeTarihi, 'Tarih:'],
    ],
    // İmza ve kaşe elle atılacak: geniş alan.
    minYukseklik: [0, 80, 0],
  });

  // ── Alt bilgi ve sayfa numarası (her sayfada) ──
  const sayfalar = doc.getPages();
  const adres = a.ttoAdres;
  const iletisim = 'Tel: ' + a.ttoTelefon + '   e-posta: ' + a.ttoEposta + '   web: ' + a.ttoWeb;
  sayfalar.forEach((sf, i) => {
    const ortala = (s, yy, boyut) => {
      const w = normal.widthOfTextAtSize(s, boyut);
      sf.drawText(s, { x: (A4[0] - w) / 2, y: yy, size: boyut, font: normal, color: GRI });
    };
    sf.drawLine({
      start: { x: KENAR, y: 40 },
      end: { x: A4[0] - KENAR, y: 40 },
      thickness: 0.5,
      color: CIZGI,
    });
    ortala(satirlaraBol(adres, normal, 7, icGenislik)[0], 30, 7);
    ortala(iletisim, 21, 7);
    const no = v.dokumanKodu + ' · Sayfa ' + (i + 1) + ' / ' + sayfalar.length;
    sf.drawText(no, {
      x: A4[0] - KENAR - normal.widthOfTextAtSize(no, 7),
      y: 10,
      size: 7,
      font: normal,
      color: GRI,
    });
  });

  return doc.save();
}
