// ══════════════════════════════════════════════════════════════
// BASİT WORD (.docx) TABLO BELGESİ
//
// Şablonlar modülünde şablon tanımlı değilken de "Bölüm Çıktısı (.docx)"
// gerçek bir Word dosyası olmalı (eskiden tarayıcı yazdırma penceresine
// düşüyordu). Bu dosya yalnız XML parçalarını üretir; paketleme (zip)
// istemcide JSZip ile yapılır. Saf ve test altında.
//
// Belge: A4 yatay, Times New Roman, başlık + alt başlık + kenarlıklı tablo;
// başlık satırı gri, satırlar isteğe bağlı renkli.
// ══════════════════════════════════════════════════════════════

// XML 1.0'da yasak kontrol karakterleri (sekme/satır sonu hariç) atılır: tek
// bir başıboş karakter bütün belgeyi açılamaz yapar.
// eslint-disable-next-line no-control-regex
const YASAK = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const xmlKacir = (v) =>
  String(v == null ? '' : v)
    .replace(YASAK, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const renk = (v) => {
  const r = String(v || '')
    .replace(/^#/, '')
    .toUpperCase();
  return /^[0-9A-F]{6}$/.test(r) ? r : '';
};

/** Satır sonlu metni Word çalışmalarına (run) çevirir. */
function calisma(metin, ozellik) {
  const satirlar = String(metin == null ? '' : metin).split('\n');
  const rpr =
    '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>' +
    (ozellik && ozellik.kalin ? '<w:b/>' : '') +
    '<w:sz w:val="' +
    ((ozellik && ozellik.boyut) || 20) +
    '"/></w:rPr>';
  return satirlar
    .map(
      (s, i) =>
        (i > 0 ? '<w:r>' + rpr + '<w:br/></w:r>' : '') +
        '<w:r>' +
        rpr +
        '<w:t xml:space="preserve">' +
        xmlKacir(s) +
        '</w:t></w:r>'
    )
    .join('');
}

function paragraf(metin, ozellik) {
  const o = ozellik || {};
  return (
    // Şema sırası: spacing, sonra jc (ters sıra Word'de "okunamayan içerik" verir).
    '<w:p><w:pPr><w:spacing w:after="' +
    (o.sonra != null ? o.sonra : 120) +
    '"/><w:jc w:val="' +
    (o.hiza || 'center') +
    '"/></w:pPr>' +
    calisma(metin, o) +
    '</w:p>'
  );
}

function hucre(metin, o) {
  const dolgu = renk(o && o.renk);
  const gen = o && o.genislik ? '<w:tcW w:w="' + o.genislik + '" w:type="dxa"/>' : '';
  return (
    '<w:tc><w:tcPr>' +
    gen +
    (dolgu ? '<w:shd w:val="clear" w:color="auto" w:fill="' + dolgu + '"/>' : '') +
    '<w:vAlign w:val="center"/></w:tcPr>' +
    paragraf(metin, { kalin: o && o.kalin, boyut: 18, sonra: 0 }) +
    '</w:tc>'
  );
}

/**
 * @param {object} p
 *   baslik, altBaslik: metin
 *   sutunlar: string[]
 *   satirlar: { hucreler: string[], renk?: 'RRGGBB' }[]
 *   oranlar?: number[]  sütun genişlik oranları (toplamı ne olursa olsun
 *             sayfa genişliğine ölçeklenir)
 * @returns {string} word/document.xml
 */
export function belgeXml(p) {
  const o = p || {};
  // Oran verilmezse sütunlar eşit; tblGrid şemada zorunlu olduğu için hep yazılır.
  const sutunSayisi = Math.max(
    (o.sutunlar || []).length,
    ...(o.satirlar || []).map((r) => (r.hucreler || []).length),
    1
  );
  const verilen = Array.isArray(o.oranlar) ? o.oranlar.map((x) => Number(x) || 0) : [];
  const oranlar = Array.from(
    { length: sutunSayisi },
    (_, i) => verilen[i] || (verilen.length ? 0 : 1)
  );
  const toplam = oranlar.reduce((t, x) => t + x, 0);
  // Yatay A4 yazı alanı: 16838 - 2×720 kenar boşluğu = 15398 twip.
  const ALAN = 15398;
  const gen = (i) => (toplam > 0 && oranlar[i] ? Math.round((oranlar[i] / toplam) * ALAN) : 0);
  const izgara =
    '<w:tblGrid>' +
    oranlar.map((_, i) => '<w:gridCol w:w="' + (gen(i) || 1) + '"/>').join('') +
    '</w:tblGrid>';
  const kenar = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map((k) => '<w:' + k + ' w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>')
    .join('');
  const baslikSatiri =
    '<w:tr><w:trPr><w:tblHeader/></w:trPr>' +
    (o.sutunlar || [])
      .map((s, i) => hucre(s, { kalin: true, renk: 'F1F5F9', genislik: gen(i) }))
      .join('') +
    '</w:tr>';
  const satirlar = (o.satirlar || [])
    .map(
      (r) =>
        '<w:tr><w:trPr><w:cantSplit/></w:trPr>' +
        (r.hucreler || []).map((h, i) => hucre(h, { renk: r.renk, genislik: gen(i) })).join('') +
        '</w:tr>'
    )
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    (o.baslik ? paragraf(o.baslik, { kalin: true, boyut: 28 }) : '') +
    (o.altBaslik ? paragraf(o.altBaslik, { kalin: true, boyut: 22, sonra: 240 }) : '') +
    '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:jc w:val="center"/><w:tblBorders>' +
    kenar +
    '</w:tblBorders>' +
    (izgara ? '<w:tblLayout w:type="fixed"/>' : '') +
    '<w:tblCellMar><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
    izgara +
    baslikSatiri +
    satirlar +
    '</w:tbl>' +
    paragraf('', { sonra: 0 }) +
    '<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>' +
    '<w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>' +
    '</w:body></w:document>'
  );
}

/** Paketlenecek dosyalar: yol → içerik. */
export function docxParcalari(p) {
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
    'word/document.xml': belgeXml(p),
  };
}
