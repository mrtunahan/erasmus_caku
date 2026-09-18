// ══════════════════════════════════════════════════════════════
// WORD (.docx) BELGE PARÇALARI — saf metin üretimi
//
// Bir .docx, içinde birkaç XML dosyası olan sıradan bir zip'tir. Zip'lemek
// tarayıcının işi (JSZip); XML'i kurmak ise SAF bir iş: girdi veri, çıktı
// metin. Bu yüzden burada duruyor ve testi var — "Word dosyası bozuk açıldı"
// hatası ancak burada yakalanır, kullanıcının bilgisayarında değil.
//
// ── NEDEN HAZIR KÜTÜPHANE DEĞİL ──
// Akreditasyon modülü aynı işi zaten el ile kurulmuş WordprocessingML ile
// yapıyor (CDN'den yalnız JSZip çekiyor). İkinci bir docx kütüphanesi eklemek
// hem paketi büyütür hem de iki ayrı belge dili doğurur. Aynı yol izlendi,
// yalnız bu kez kurallar saf bir dosyaya alındı ki test edilebilsin.
//
// ── KAPSAM ──
// Rapor için gereken kadarı: başlık, paragraf, madde, tablo (başlık satırı
// her sayfada tekrarlar), sayfa sonu. Resim, üstbilgi, numaralandırma yok —
// gerekmedikçe eklenmez.
// ══════════════════════════════════════════════════════════════

// XML 1.0'ın kabul etmediği denetim karakterleri atılır; sekme, satır sonu ve
// satır başı korunur. Düzenli ifade yerine kod noktası süzgeci: denetim
// karakteri içeren bir regex hem okunmaz hem de linter'ın haklı olarak
// uyardığı bir kalıptır (aynı yol lib/xlsx-yaz.js'te de izlenir).
function denetimsiz(metin) {
  let out = '';
  for (let i = 0; i < metin.length; i++) {
    const k = metin.charCodeAt(i);
    if (k === 9 || k === 10 || k === 13 || k >= 32) out += metin[i];
  }
  return out;
}

/**
 * XML'de anlam taşıyan karakterleri kaçırır; XML'in kabul etmediği denetim
 * karakterlerini (kullanıcı metninden gelebilir) atar — biri kalırsa Word
 * dosyayı "bozuk" diye hiç açmaz.
 */
export function wordKacis(deger) {
  return denetimsiz(String(deger == null ? '' : deger))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Bir metin koşusu (run). Satır sonları w:br olur — \n Word'de kaybolur. */
function kosu(metin, opts) {
  const o = opts || {};
  let rpr = '';
  if (o.kalin) rpr += '<w:b/>';
  if (o.italik) rpr += '<w:i/>';
  if (o.renk) rpr += '<w:color w:val="' + wordKacis(o.renk) + '"/>';
  if (o.boyut) rpr += '<w:sz w:val="' + o.boyut + '"/><w:szCs w:val="' + o.boyut + '"/>';
  const govde = String(metin == null ? '' : metin)
    .split('\n')
    .map(
      (satir, i) =>
        (i > 0 ? '<w:br/>' : '') + '<w:t xml:space="preserve">' + wordKacis(satir) + '</w:t>'
    )
    .join('');
  return '<w:r><w:rPr>' + rpr + '</w:rPr>' + govde + '</w:r>';
}

/**
 * Paragraf.
 * @param {string} metin
 * @param {{kalin?:boolean, italik?:boolean, boyut?:number, renk?:string,
 *          hiza?:'left'|'center'|'right', oncesi?:number, sonrasi?:number}} [opts]
 *          boyut YARIM punto (Word böyle ölçer): 20 = 10 punto.
 */
export function wordParagraf(metin, opts) {
  const o = opts || {};
  const hiza = o.hiza && o.hiza !== 'left' ? '<w:jc w:val="' + o.hiza + '"/>' : '';
  const aralik =
    o.oncesi != null || o.sonrasi != null
      ? '<w:spacing' +
        (o.oncesi != null ? ' w:before="' + o.oncesi + '"' : '') +
        (o.sonrasi != null ? ' w:after="' + o.sonrasi + '"' : '') +
        '/>'
      : '';
  const ppr = hiza || aralik ? '<w:pPr>' + aralik + hiza + '</w:pPr>' : '';
  if (metin == null || metin === '') return '<w:p>' + ppr + '</w:p>';
  return '<w:p>' + ppr + kosu(metin, o) + '</w:p>';
}

/** Başlık. Seviye 1 belge adı, 2 bölüm, 3 soru başlığı. */
export function wordBaslik(metin, seviye) {
  const s = seviye === 1 ? 1 : seviye === 3 ? 3 : 2;
  const boyut = s === 1 ? 32 : s === 2 ? 26 : 22;
  return wordParagraf(metin, {
    kalin: true,
    boyut,
    renk: s === 1 ? '1F3864' : '2F5496',
    oncesi: s === 1 ? 0 : 200,
    sonrasi: 100,
  });
}

/** Madde listesi — numbering.xml gerektirmesin diye işaret metnin içinde. */
export function wordMaddeler(maddeler, opts) {
  return (maddeler || [])
    .filter((m) => m != null && m !== '')
    .map((m) => wordParagraf('•  ' + m, { boyut: 20, sonrasi: 40, ...(opts || {}) }))
    .join('');
}

function hucre(metin, o) {
  const opt = o || {};
  const zemin = opt.zemin
    ? '<w:shd w:val="clear" w:color="auto" w:fill="' + wordKacis(opt.zemin) + '"/>'
    : '';
  const genislik = opt.genislik
    ? '<w:tcW w:w="' + opt.genislik + '" w:type="pct"/>'
    : '<w:tcW w:w="0" w:type="auto"/>';
  return (
    '<w:tc><w:tcPr>' +
    genislik +
    zemin +
    '<w:vAlign w:val="center"/></w:tcPr>' +
    wordParagraf(metin, {
      kalin: !!opt.kalin,
      boyut: opt.boyut || 18,
      hiza: opt.hiza,
      sonrasi: 0,
    }) +
    '</w:tc>'
  );
}

/**
 * Tablo.
 *
 * ⚠ Başlık satırına `w:tblHeader` konur: uzun tablo ikinci sayfaya taştığında
 * sütunların ne olduğu orada da yazar. Bu olmadan raporun ikinci sayfası
 * başlıksız sayı yığınına dönüyor.
 *
 * `oranlar` sütun genişlik payıdır (ör. [3,1,1]); toplamı 100'e ölçeklenip
 * yüzde olarak yazılır — böylece tablo kâğıt boyutundan bağımsız sığar.
 *
 * @param {{basliklar:string[], satirlar:Array<Array<string|number>>,
 *          oranlar?:number[], hizalar?:string[]}} tablo
 */
export function wordTablo(tablo) {
  const t = tablo || {};
  const basliklar = t.basliklar || [];
  if (basliklar.length === 0) return '';
  const n = basliklar.length;
  const oranlar = (t.oranlar || []).length === n ? t.oranlar : basliklar.map(() => 1);
  const toplam = oranlar.reduce((a, b) => a + (Number(b) || 0), 0) || n;
  // Word yüzdeyi ellide bir birimle ister: %100 = 5000.
  const paylar = oranlar.map((o) => Math.max(1, Math.round(((Number(o) || 0) / toplam) * 5000)));
  const hizalar = t.hizalar || [];
  const kenarlar =
    '<w:tblBorders>' +
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
      .map((k) => '<w:' + k + ' w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>')
      .join('') +
    '</w:tblBorders>';
  const izgara = '<w:tblGrid>' + paylar.map(() => '<w:gridCol/>').join('') + '</w:tblGrid>';
  const baslikSatiri =
    '<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>' +
    basliklar
      .map((h, i) => hucre(h, { kalin: true, zemin: 'E7ECF4', genislik: paylar[i] }))
      .join('') +
    '</w:tr>';
  const govde = (t.satirlar || [])
    .map(
      (satir) =>
        '<w:tr>' +
        basliklar
          .map((_h, i) =>
            hucre(satir && satir[i] != null ? satir[i] : '', {
              genislik: paylar[i],
              hiza: hizalar[i],
            })
          )
          .join('') +
        '</w:tr>'
    )
    .join('');
  return (
    '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblLayout w:type="fixed"/>' +
    kenarlar +
    '</w:tblPr>' +
    izgara +
    baslikSatiri +
    govde +
    '</w:tbl>' +
    // Word iki tabloyu arka arkaya görürse TEK tablo sayar; araya boş
    // paragraf konmazsa ayrı tablolar birbirine yapışır.
    wordParagraf('', { sonrasi: 80 })
  );
}

/** Sayfa sonu. */
export function wordSayfaSonu() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

/** A4 sayfa ayarı (twip): dikey ya da yatay. */
function sectPr(yatay) {
  const en = yatay ? 16838 : 11906;
  const boy = yatay ? 11906 : 16838;
  return (
    '<w:sectPr><w:pgSz w:w="' +
    en +
    '" w:h="' +
    boy +
    '"' +
    (yatay ? ' w:orient="landscape"' : '') +
    '/>' +
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" ' +
    'w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>'
  );
}

/** Gövde parçalarından tam document.xml. */
export function wordBelgeXml(govde, opts) {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body>' +
    String(govde || '') +
    sectPr(!!(opts && opts.yatay)) +
    '</w:body></w:document>'
  );
}

/**
 * Zip'e konacak dosyalar: `{yol: içerik}`.
 * Çağıran yalnız bunları JSZip'e verir; başka bir şey bilmesi gerekmez.
 */
export function wordPaketDosyalari(govde, opts) {
  return {
    '[Content_Types].xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>',
    '_rels/.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>',
    'word/document.xml': wordBelgeXml(govde, opts),
  };
}

/** Word'ün MIME türü — blob üretirken kullanılır. */
export const WORD_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Dosya adı: işletim sistemlerinin kabul etmediği karakterler temizlenir. */
export function belgeDosyaAdi(baslik, ek, uzanti) {
  const temiz = String(baslik || 'anket')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return (temiz || 'anket') + (ek ? '_' + ek : '') + '.' + String(uzanti || '').replace(/^\./, '');
}
