#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ders Devam (Yoklama) Listesi ŞABLONLARINI üretir (.xlsx ve .docx).

Şablonlar modülüne yüklenmeye hazır dosyaları sıfırdan yazar. Yer tutucu
adları, lib/yoklama-listesi.js'teki YOKLAMA_LISTE_STATIC / YOKLAMA_LISTE_ROWS
etiketleriyle BİREBİR aynıdır; eşleme sihirbazı etiketle eşleşen yer tutucuyu
kendiliğinden bağladığı için yetkilinin elle eşleme yapması gerekmez.

Tasarım kuralı — TABLODA TEK VERİ SATIRI VARDIR:
    {{No}} {{Öğrenci No}} {{Adı}} {{Soyadı}} {{Sınıfı}} {{1.Hafta}} …
Motor bu satırı öğrenci sayısı kadar çoğaltır. ⚠ Veri satırında yer tutucu
DIŞINDA kelime bulunmamalıdır; bulunursa motor o satırı "sütun başlığı" sanar.

⚠ XLSX'TE YER TUTUCULAR PAYLAŞILAN METİN (sharedStrings) OLMALIDIR: motor
satır şablonunu yalnız t="s" hücrelerinde arar (bkz. lib/xlsx-satir.js).
Bu yüzden dosya inlineStr ile değil, sharedStrings ile yazılır.

SİSTEMİN BİLMEDİĞİ SÜTUN ŞABLONA KONMAZ:
  • "Devam" (Var/Yok) yalnız devamsızlık sınırı girilince hesaplanabilir;
    şablonda yok. İsteyen kurum `{{Devam}}` hücresini elle ekleyebilir.
  • Cinsiyet kayıtta tutulmuyor; "Kadın/Erkek öğrenci sayısı" künyede yok.

HAFTA SAYISI SABİT DEĞİLDİR. Varsayılan 15'tir; komut satırından değişir.

Kullanım:  python3 scripts/yoklama-sablonu.py [hafta_sayisi]
Çıktı:     sablonlar/yoklama/ders-devam-listesi.xlsx
           sablonlar/yoklama/ders-devam-listesi.docx
"""

import os
import sys
import zipfile

KOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sablonlar', 'yoklama')

# Sistemdeki üst sınır (lib/yoklama-listesi.js → HAFTA_SINIRI)
HAFTA_SINIRI = 20
VARSAYILAN_HAFTA = 15

# Künye satırları: (etiket, yer tutucu)
KUNYE = [
    ('Ders Kodu ve Adı', '{{Ders Kodu ve Adı}}'),
    ('Öğretim Üyesi / Görevlisi', '{{Öğretim Üyesi / Görevlisi}}'),
    ('Fakülte Bilgisi', '{{Fakülte Bilgisi}}'),
    ('Bölüm Adı', '{{Bölüm Adı}}'),
]

# Sabit sütunlar: (başlık, yer tutucu, docx genişliği twip, xlsx genişliği karakter)
SABIT_SUTUNLAR = [
    ('No', '{{No}}', 700, 5),
    ('Öğrenci No', '{{Öğrenci No}}', 1700, 14),
    ('Adı', '{{Adı}}', 2300, 18),
    ('Soyadı', '{{Soyadı}}', 2300, 18),
    ('Sınıfı', '{{Sınıfı}}', 900, 7),
]


def kacir(m):
    return (
        str(m)
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
    )


def sutun_adi(i):
    """0 → A, 25 → Z, 26 → AA"""
    ad = ''
    i += 1
    while i > 0:
        i, k = divmod(i - 1, 26)
        ad = chr(65 + k) + ad
    return ad


def zip_yaz(yol, parcalar):
    with zipfile.ZipFile(yol, 'w', zipfile.ZIP_DEFLATED) as z:
        for ad, icerik in parcalar.items():
            z.writestr(ad, icerik.encode('utf-8'))


# ══════════════════════════════════════════════════════════════
# XLSX
#
# Stil kataloğu lib/xlsx-yaz.js'tekiyle aynı mantıkta, elle: 0 düz,
# 1 başlık, 2 künye etiketi, 3 künye değeri, 4 tarih (sağa yaslı),
# 5 tablo başlığı (lacivert), 6 hafta başlığı, 7 veri (sol), 8 veri (orta).
# ══════════════════════════════════════════════════════════════

STILLER = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    '<fonts count="6">'
    '<font><sz val="10"/><name val="Calibri"/></font>'
    '<font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Calibri"/></font>'
    '<font><b/><sz val="10"/><name val="Calibri"/></font>'
    '<font><b/><sz val="14"/><name val="Calibri"/></font>'
    '<font><sz val="9"/><name val="Calibri"/></font>'
    '<font><b/><sz val="9"/><name val="Calibri"/></font>'
    '</fonts>'
    '<fills count="4">'
    '<fill><patternFill patternType="none"/></fill>'
    '<fill><patternFill patternType="gray125"/></fill>'
    '<fill><patternFill patternType="solid"><fgColor rgb="FF1B2A4A"/><bgColor indexed="64"/></patternFill></fill>'
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE7ECF4"/><bgColor indexed="64"/></patternFill></fill>'
    '</fills>'
    '<borders count="2">'
    '<border><left/><right/><top/><bottom/><diagonal/></border>'
    '<border><left style="thin"><color rgb="FF6B7280"/></left><right style="thin"><color rgb="FF6B7280"/></right>'
    '<top style="thin"><color rgb="FF6B7280"/></top><bottom style="thin"><color rgb="FF6B7280"/></bottom><diagonal/></border>'
    '</borders>'
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    '<cellXfs count="9">'
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>'
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>'
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
    '<xf numFmtId="0" fontId="5" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>'
    '<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
    '</cellXfs>'
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    '</styleSheet>'
)


class Metinler:
    """sharedStrings tablosu — motor yer tutucuları YALNIZ burada arar."""

    def __init__(self):
        self.liste = []
        self.indeks = {}

    def ekle(self, metin):
        if metin not in self.indeks:
            self.indeks[metin] = len(self.liste)
            self.liste.append(metin)
        return self.indeks[metin]

    def xml(self):
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="%d" uniqueCount="%d">%s</sst>'
        ) % (
            len(self.liste),
            len(self.liste),
            ''.join(
                '<si><t xml:space="preserve">%s</t></si>' % kacir(m) for m in self.liste
            ),
        )


def xlsx_yaz(yol, hafta):
    ss = Metinler()
    sabit = len(SABIT_SUTUNLAR)
    son_sutun = sutun_adi(sabit + hafta - 1)

    def hucre(sutun_i, satir, metin, stil):
        return '<c r="%s%d" s="%d" t="s"><v>%d</v></c>' % (
            sutun_adi(sutun_i),
            satir,
            stil,
            ss.ekle(metin),
        )

    satirlar = []
    birlesik = []

    # 1) Başlık
    satirlar.append('<row r="1" ht="22" customHeight="1">%s</row>' % hucre(0, 1, '{{Başlık}}', 1))
    birlesik.append('A1:%s1' % son_sutun)

    # 2) Künye (3. satırdan başlar) — tarih, öğretim üyesi satırının sağ ucunda
    for i, (etiket, tutucu) in enumerate(KUNYE):
        r = 3 + i
        hucreler = hucre(0, r, etiket + ' :', 2) + hucre(1, r, tutucu, 3)
        if i == 1:
            hucreler += hucre(sabit + hafta - 1, r, '{{Tarih}}', 4)
        satirlar.append('<row r="%d">%s</row>' % (r, hucreler))
        birlesik.append('B%d:%s%d' % (r, sutun_adi(min(sabit + hafta - 2, 4)), r))

    # 3) Tablo başlığı — iki satır: sabit sütunlar dikey, HAFTALAR yatay birleşir
    ust = 8
    alt = 9
    satirlar.append(
        '<row r="%d" ht="20" customHeight="1">%s%s</row>'
        % (
            ust,
            ''.join(hucre(i, ust, b, 5) for i, (b, _t, _g, _w) in enumerate(SABIT_SUTUNLAR)),
            hucre(sabit, ust, 'HAFTALAR', 5)
            + ''.join(
                '<c r="%s%d" s="5"/>' % (sutun_adi(sabit + i), ust) for i in range(1, hafta)
            ),
        )
    )
    satirlar.append(
        '<row r="%d" ht="18" customHeight="1">%s%s</row>'
        % (
            alt,
            ''.join('<c r="%s%d" s="5"/>' % (sutun_adi(i), alt) for i in range(sabit)),
            ''.join(
                hucre(sabit + i, alt, '%d.Hafta' % (i + 1), 6) for i in range(hafta)
            ),
        )
    )
    for i in range(sabit):
        birlesik.append('%s%d:%s%d' % (sutun_adi(i), ust, sutun_adi(i), alt))
    birlesik.append('%s%d:%s%d' % (sutun_adi(sabit), ust, son_sutun, ust))

    # 4) TEK veri satırı — motor öğrenci sayısı kadar çoğaltır.
    veri_r = 10
    satirlar.append(
        '<row r="%d">%s%s</row>'
        % (
            veri_r,
            ''.join(
                hucre(i, veri_r, t, 8 if b in ('No', 'Sınıfı') else 7)
                for i, (b, t, _g, _w) in enumerate(SABIT_SUTUNLAR)
            ),
            ''.join(
                hucre(sabit + i, veri_r, '{{%d.Hafta}}' % (i + 1), 8) for i in range(hafta)
            ),
        )
    )

    cols = ''.join(
        '<col min="%d" max="%d" width="%d" customWidth="1"/>' % (i + 1, i + 1, w)
        for i, (_b, _t, _g, w) in enumerate(SABIT_SUTUNLAR)
    ) + '<col min="%d" max="%d" width="5" customWidth="1"/>' % (sabit + 1, sabit + hafta)

    sheet = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<dimension ref="A1:%s%d"/>'
        '<sheetViews><sheetView tabSelected="1" workbookViewId="0">'
        '<pane ySplit="9" topLeftCell="A10" activePane="bottomLeft" state="frozen"/>'
        '</sheetView></sheetViews>'
        '<sheetFormatPr defaultRowHeight="15"/>'
        '<cols>%s</cols>'
        '<sheetData>%s</sheetData>'
        '<mergeCells count="%d">%s</mergeCells>'
        '<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>'
        '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/>'
        '</worksheet>'
    ) % (
        son_sutun,
        veri_r,
        cols,
        ''.join(satirlar),
        len(birlesik),
        ''.join('<mergeCell ref="%s"/>' % r for r in birlesik),
    )

    parcalar = {
        '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        '</Types>',
        '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        '</Relationships>',
        'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheets><sheet name="Devam Listesi" sheetId="1" r:id="rId1"/></sheets>'
        # Her sayfada başlık satırları tekrar bassın (uzun liste birden çok sayfa).
        '<definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'
        '&apos;Devam Listesi&apos;!$8:$9</definedName></definedNames>'
        '</workbook>',
        'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>'
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        '</Relationships>',
        'xl/worksheets/sheet1.xml': sheet,
        'xl/sharedStrings.xml': ss.xml(),
        'xl/styles.xml': STILLER,
    }
    zip_yaz(yol, parcalar)
    print('yazıldı: %s (%d hafta sütunu)' % (yol, hafta))


# ══════════════════════════════════════════════════════════════
# DOCX
# ══════════════════════════════════════════════════════════════

SAYFA_EN = 16838
KENAR = 720
ICERIK = SAYFA_EN - 2 * KENAR


def p(metin, hiza='left', kalin=False, punto=20, renk=None, sonrasi=60):
    """punto: yarım-punto (20 = 10pt)"""
    rpr = '<w:rPr>'
    if kalin:
        rpr += '<w:b/>'
    rpr += '<w:sz w:val="%d"/><w:szCs w:val="%d"/>' % (punto, punto)
    if renk:
        rpr += '<w:color w:val="%s"/>' % renk
    rpr += '</w:rPr>'
    return (
        '<w:p><w:pPr><w:spacing w:after="%d"/><w:jc w:val="%s"/></w:pPr>'
        '<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r></w:p>'
    ) % (sonrasi, hiza, rpr, kacir(metin))


def tc(
    metin,
    genislik,
    kalin=False,
    zemin=None,
    beyaz=False,
    hiza='left',
    punto=18,
    birlesim=None,
    kolon=None,
):
    """
    Tablo hücresi.
      birlesim='bas' → dikey birleşmenin başı · 'sur' → devamı
      kolon=N        → N sütunu kapsar (HAFTALAR başlığı)
    """
    tcpr = '<w:tcW w:w="%d" w:type="dxa"/>' % genislik
    if kolon:
        tcpr += '<w:gridSpan w:val="%d"/>' % kolon
    if birlesim == 'bas':
        tcpr += '<w:vMerge w:val="restart"/>'
    elif birlesim == 'sur':
        tcpr += '<w:vMerge/>'
    if zemin:
        tcpr += '<w:shd w:val="clear" w:color="auto" w:fill="%s"/>' % zemin
    tcpr += '<w:vAlign w:val="center"/>'
    if birlesim == 'sur':
        return '<w:tc><w:tcPr>%s</w:tcPr><w:p/></w:tc>' % tcpr
    rpr = '<w:rPr>'
    if kalin:
        rpr += '<w:b/>'
    rpr += '<w:sz w:val="%d"/><w:szCs w:val="%d"/>' % (punto, punto)
    if beyaz:
        rpr += '<w:color w:val="FFFFFF"/>'
    rpr += '</w:rPr>'
    return (
        '<w:tc><w:tcPr>%s</w:tcPr>'
        '<w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="%s"/></w:pPr>'
        '<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r></w:p></w:tc>'
    ) % (tcpr, hiza, rpr, kacir(metin))


def kunye_tablosu():
    """Kenarlıksız künye: etiket · değer · (sağda) tarih."""
    genislikler = [3400, 9000, ICERIK - 3400 - 9000]
    grid = ''.join('<w:gridCol w:w="%d"/>' % g for g in genislikler)
    satirlar = []
    for i, (etiket, tutucu) in enumerate(KUNYE):
        sag = '{{Tarih}}' if i == 1 else ''
        satirlar.append(
            '<w:tr>%s%s%s</w:tr>'
            % (
                tc(etiket + ' :', genislikler[0], kalin=True, punto=19),
                tc(tutucu, genislikler[1], punto=19),
                tc(sag, genislikler[2], kalin=True, hiza='right', punto=19),
            )
        )
    return (
        '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>'
        '<w:tblBorders>'
        + ''.join(
            '<w:%s w:val="none" w:sz="0" w:space="0" w:color="auto"/>' % k
            for k in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV')
        )
        + '</w:tblBorders></w:tblPr>'
        '<w:tblGrid>%s</w:tblGrid>%s</w:tbl>' % (grid, ''.join(satirlar))
    )


def liste_tablosu(hafta):
    hafta_genislik = max(320, (ICERIK - sum(s[2] for s in SABIT_SUTUNLAR)) // hafta)
    genislikler = [s[2] for s in SABIT_SUTUNLAR] + [hafta_genislik] * hafta
    grid = ''.join('<w:gridCol w:w="%d"/>' % g for g in genislikler)

    ust = '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>%s%s</w:tr>' % (
        ''.join(
            tc(b, g, kalin=True, zemin='1B2A4A', beyaz=True, hiza='center', birlesim='bas')
            for b, _t, g, _w in SABIT_SUTUNLAR
        ),
        tc(
            'HAFTALAR',
            hafta_genislik * hafta,
            kalin=True,
            zemin='1B2A4A',
            beyaz=True,
            hiza='center',
            kolon=hafta,
        ),
    )
    alt = '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>%s%s</w:tr>' % (
        ''.join(tc('', g, birlesim='sur') for _b, _t, g, _w in SABIT_SUTUNLAR),
        ''.join(
            tc(
                '%d.Hafta' % (i + 1),
                hafta_genislik,
                kalin=True,
                zemin='E7ECF4',
                hiza='center',
                punto=15,
            )
            for i in range(hafta)
        ),
    )
    veri = '<w:tr>%s%s</w:tr>' % (
        ''.join(
            tc(t, g, hiza='center' if b in ('No', 'Sınıfı') else 'left')
            for b, t, g, _w in SABIT_SUTUNLAR
        ),
        ''.join(
            tc('{{%d.Hafta}}' % (i + 1), hafta_genislik, hiza='center', punto=15)
            for i in range(hafta)
        ),
    )
    kenarlik = (
        '<w:tblBorders>'
        + ''.join(
            '<w:%s w:val="single" w:sz="6" w:space="0" w:color="6B7280"/>' % k
            for k in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV')
        )
        + '</w:tblBorders>'
    )
    return (
        '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/>'
        '<w:tblW w:w="0" w:type="auto"/>%s<w:tblLayout w:type="fixed"/></w:tblPr>'
        '<w:tblGrid>%s</w:tblGrid>%s%s%s</w:tbl>'
    ) % (kenarlik, grid, ust, alt, veri)


def docx_yaz(yol, hafta):
    govde = (
        p('{{Başlık}}', 'center', True, 28, sonrasi=200)
        + kunye_tablosu()
        + p('', 'left', False, 12, sonrasi=60)
        + liste_tablosu(hafta)
        + '<w:p/>'
        + p('{{Öğretim Üyesi / Görevlisi}}', 'right', False, 19, sonrasi=0)
        + p('İmza', 'right', False, 19, '555555')
        + '<w:sectPr><w:pgSz w:w="%d" w:h="11906" w:orient="landscape"/>'
        '<w:pgMar w:top="%d" w:right="%d" w:bottom="%d" w:left="%d" '
        'w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>'
        % (SAYFA_EN, KENAR, KENAR, KENAR, KENAR)
    )
    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:body>%s</w:body></w:document>'
    ) % govde
    parcalar = {
        '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        '</Types>',
        '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        '</Relationships>',
        'word/document.xml': document,
    }
    zip_yaz(yol, parcalar)
    print('yazıldı: %s (%d hafta sütunu)' % (yol, hafta))


if __name__ == '__main__':
    hafta = int(sys.argv[1]) if len(sys.argv) > 1 else VARSAYILAN_HAFTA
    if not 1 <= hafta <= HAFTA_SINIRI:
        raise SystemExit('Hafta sayısı 1 ile %d arasında olmalı.' % HAFTA_SINIRI)
    os.makedirs(KOK, exist_ok=True)
    xlsx_yaz(os.path.join(KOK, 'ders-devam-listesi.xlsx'), hafta)
    docx_yaz(os.path.join(KOK, 'ders-devam-listesi.docx'), hafta)
