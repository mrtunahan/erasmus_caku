// ══════════════════════════════════════════════════════════════
// BASİT XLSX YAZICI (şablonsuz)
//
// Şablon motoru (TemplateEngine.produceRowsXlsx) hazır bir .xlsx dosyasını
// doldurur; buradaki iş farklı: ELDE ŞABLON YOKKEN sıfırdan çalışma kitabı
// üretmek. Ders programı çıktıları için gerekli — program bir tablodur,
// kurumun yüklediği bir forma bağlı değildir.
//
// Neden kendi yazıyoruz: tek ihtiyacımız "hücreler + biçim". Tam bir xlsx
// kütüphanesi bunun için ağır kalıyor ve dosya boyutu istemciye iniyor.
// Aşağıdaki parçalar OOXML'in asgari GEÇERLİ kümesidir.
//
// Metin hücreleri `inlineStr` yazılır: sharedStrings tablosu tutmak gerekmez,
// dosya tek geçişte üretilir. Değerler bilerek METİN kalır — "08:15-09:00" ya
// da "2. Sınıf" gibi değerler Excel'de tarihe/sayıya dönüşüp bozulmasın.
// ══════════════════════════════════════════════════════════════

// XML 1.0'da geçersiz olan denetim karakterleri atılır; sekme, satır sonu ve
// satır başı korunur (hücre içi satır sonu, çok dersli hücrelerde okunaklılığın
// kendisi). Düzenli ifade yerine kod noktası süzgeci: denetim karakterli bir
// regex hem okunmaz hem de linter'ın haklı olarak uyardığı bir kalıp.
function denetimsiz(metin) {
  let out = '';
  for (let i = 0; i < metin.length; i++) {
    const k = metin.charCodeAt(i);
    if (k === 9 || k === 10 || k === 13 || k >= 32) out += metin[i];
  }
  return out;
}

const kacis = (v) =>
  denetimsiz(String(v == null ? '' : v))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** 0 → A, 25 → Z, 26 → AA … */
export function sutunAdi(i) {
  let n = Number(i);
  if (!Number.isFinite(n) || n < 0) return 'A';
  let ad = '';
  n = Math.floor(n);
  do {
    ad = String.fromCharCode(65 + (n % 26)) + ad;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return ad;
}

/**
 * Bir satırın XML'i.
 * @param {Array} hucreler ['metin'] ya da [{ v: 'metin', stil: 1 }]
 * @param {number} satirNo 1'den başlar
 * @param {number} [varsayilanStil]
 */
export function satirXml(hucreler, satirNo, varsayilanStil) {
  const icerik = (hucreler || [])
    .map((h, i) => {
      const nesne = h && typeof h === 'object' ? h : { v: h };
      const deger = nesne.v == null ? '' : String(nesne.v);
      const stil = nesne.stil != null ? nesne.stil : varsayilanStil;
      const ref = sutunAdi(i) + satirNo;
      const s = stil != null ? ' s="' + stil + '"' : '';
      if (deger === '') return '<c r="' + ref + '"' + s + '/>';
      return (
        '<c r="' +
        ref +
        '"' +
        s +
        ' t="inlineStr"><is><t xml:space="preserve">' +
        kacis(deger) +
        '</t></is></c>'
      );
    })
    .join('');
  return '<row r="' + satirNo + '">' + icerik + '</row>';
}

/**
 * Çalışma sayfası XML'i.
 * @param {Array} satirlar satır dizisi (her satır hücre dizisi)
 * @param {Object} [secenek] { sutunGenislikleri, baslikStili, govdeStili }
 */
export function sayfaXml(satirlar, secenek) {
  const s = secenek || {};
  const genislikler = Array.isArray(s.sutunGenislikleri) ? s.sutunGenislikleri : [];
  const cols = genislikler.length
    ? '<cols>' +
      genislikler
        .map(
          (g, i) =>
            '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + g + '" customWidth="1"/>'
        )
        .join('') +
      '</cols>'
    : '';
  const govde = (satirlar || [])
    .map((satir, i) => satirXml(satir, i + 1, i === 0 ? s.baslikStili : s.govdeStili))
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    // Başlık satırı kaydırınca sabit kalsın — uzun programlarda okunaklılık.
    '<sheetViews><sheetView workbookViewId="0">' +
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
    '</sheetView></sheetViews>' +
    cols +
    '<sheetData>' +
    govde +
    '</sheetData>' +
    '</worksheet>'
  );
}

// Biçimler: 0 düz · 1 başlık (koyu zemin, beyaz kalın) · 2 gövde (kaydırmalı,
// üste hizalı) · 3 vurgu (ortalı kalın — saat sütunu).
const STILLER =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="3">' +
  '<font><sz val="10"/><name val="Calibri"/></font>' +
  '<font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="10"/><name val="Calibri"/></font>' +
  '</fonts>' +
  '<fills count="3">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF1B2A4A"/><bgColor indexed="64"/></patternFill></fill>' +
  '</fills>' +
  '<borders count="2">' +
  '<border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right>' +
  '<top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border>' +
  '</borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="4">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
  '<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
  '</cellXfs>' +
  '</styleSheet>';

export const XLSX_STIL = { duz: 0, baslik: 1, govde: 2, vurgu: 3 };

/**
 * Tek sayfalık bir çalışma kitabının TÜM parçaları (yol → içerik).
 * Çağıran bunları zip'leyip .xlsx olarak indirir; zip'leme tarayıcı işidir,
 * burası saf metin üretir ve test edilebilir kalır.
 */
export function calismaKitabiParcalari(secenek) {
  const s = secenek || {};
  // Excel sayfa adı kuralı: en çok 31 karakter, bu işaretler yasak.
  const sayfaAdi = (s.sayfaAdi || 'Sayfa1').replace(/[\\/*?:[\]]/g, ' ').slice(0, 31);
  return {
    '[Content_Types].xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '</Types>',
    '_rels/.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>',
    'xl/workbook.xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="' +
      kacis(sayfaAdi) +
      '" sheetId="1" r:id="rId1"/></sheets>' +
      '</workbook>',
    'xl/_rels/workbook.xml.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>',
    'xl/styles.xml': STILLER,
    'xl/worksheets/sheet1.xml': sayfaXml(s.satirlar, {
      sutunGenislikleri: s.sutunGenislikleri,
      baslikStili: XLSX_STIL.baslik,
      govdeStili: XLSX_STIL.govde,
    }),
  };
}

/** Dosya adını güvenli hale getirir (Türkçe karakterler sadeleşir). */
export function xlsxDosyaAdi(ad) {
  const harfler = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
    Ç: 'C',
    Ğ: 'G',
    İ: 'I',
    Ö: 'O',
    Ş: 'S',
    Ü: 'U',
  };
  const sade = String(ad || 'tablo')
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (h) => harfler[h] || h)
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (sade || 'tablo') + '.xlsx';
}
