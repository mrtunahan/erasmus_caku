#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ders Programı ÖRNEK ŞABLONLARINI üretir.

Şablonlar modülüne yüklenecek .xlsx/.docx dosyalarını sıfırdan yazar. Yer
tutucu adları, shared-components.jsx'teki DERSPROGRAMI_STATIC/ROWS etiketleriyle
BİREBİR aynıdır; Şablonlar modülü etiketle eşleşen yer tutucuyu kendiliğinden
bağladığı için yetkilinin elle eşleme yapması gerekmez.

Tasarım kuralı: TABLODA TEK VERİ SATIRI vardır ({{Saat}} … {{Cuma}}); motor onu
dolu saat sayısı kadar çoğaltır. Bir satır bir SAAT, bir sütun bir GÜNDÜR.

Kullanım:  python3 scripts/ders-programi-sablonlari.py
Çıktı:     sablonlar/ders-programi/*.xlsx, *.docx
"""

import os
import zipfile

KOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sablonlar', 'ders-programi')
GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']
VERI_SATIRI = ['{{Saat}}'] + ['{{' + g + '}}' for g in GUNLER]


def kacir(m):
    return (
        str(m)
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
    )


def sutun(i):
    """0 → A, 1 → B …"""
    ad = ''
    i += 1
    while i > 0:
        i, k = divmod(i - 1, 26)
        ad = chr(65 + k) + ad
    return ad


# ══════════════════════════════════════════════════════════════
# XLSX
# ══════════════════════════════════════════════════════════════

# Stil indeksleri (xl/styles.xml cellXfs sırası)
S_DUZ, S_BASLIK, S_ALTBASLIK, S_BILGI, S_SUTUN, S_SAAT, S_HUCRE, S_ALT = range(8)

STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="6">
<font><sz val="10"/><name val="Calibri"/></font>
<font><b/><sz val="16"/><name val="Calibri"/></font>
<font><b/><sz val="12"/><name val="Calibri"/></font>
<font><sz val="10"/><color rgb="FF555555"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><name val="Calibri"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1B2A4A"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FF9CA3AF"/></left><right style="thin"><color rgb="FF9CA3AF"/></right><top style="thin"><color rgb="FF9CA3AF"/></top><bottom style="thin"><color rgb="FF9CA3AF"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
</cellXfs>
</styleSheet>"""


def xlsx_yaz(yol, satirlar, birlestirmeler, dondur_satiri, sutun_genislikleri):
    """satirlar: [[(metin, stil) | None, …], …] — 1. satır dosyanın 1. satırıdır."""
    # Paylaşılan metin tablosu: doldurma motoru YALNIZ t="s" hücrelerini
    # doldurur (bkz. xlSatirDoldur), bu yüzden her metin buraya girmelidir.
    sozluk = {}
    sira = []

    def si(metin):
        if metin not in sozluk:
            sozluk[metin] = len(sira)
            sira.append(metin)
        return sozluk[metin]

    satir_xml = []
    for r, satir in enumerate(satirlar, start=1):
        hucreler = []
        for c, hucre in enumerate(satir):
            if hucre is None:
                continue
            metin, stil = hucre
            ref = sutun(c) + str(r)
            if metin == '':
                hucreler.append('<c r="%s" s="%d"/>' % (ref, stil))
            else:
                hucreler.append('<c r="%s" s="%d" t="s"><v>%d</v></c>' % (ref, stil, si(metin)))
        # BOŞ satır da yazılır: doldurma motoru satırları baştan sıralı
        # numaralandırır (bkz. xlSatirDoldur), atlanan satır numarası boşluğu
        # kapatır ve başlık ile veri satırı yukarı kayardı.
        if hucreler:
            satir_xml.append('<row r="%d">%s</row>' % (r, ''.join(hucreler)))
        else:
            satir_xml.append('<row r="%d"></row>' % r)

    cols = ''.join(
        '<col min="%d" max="%d" width="%d" customWidth="1"/>' % (i + 1, i + 1, w)
        for i, w in enumerate(sutun_genislikleri)
    )
    merges = ''
    if birlestirmeler:
        merges = '<mergeCells count="%d">%s</mergeCells>' % (
            len(birlestirmeler),
            ''.join('<mergeCell ref="%s"/>' % m for m in birlestirmeler),
        )
    son = sutun(len(sutun_genislikleri) - 1) + str(len(satirlar))
    sheet = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<dimension ref="A1:%s"/>'
        '<sheetViews><sheetView tabSelected="1" workbookViewId="0">'
        '<pane ySplit="%d" topLeftCell="A%d" activePane="bottomLeft" state="frozen"/>'
        '</sheetView></sheetViews>'
        '<sheetFormatPr defaultRowHeight="15"/>'
        '<cols>%s</cols>'
        '<sheetData>%s</sheetData>%s'
        '<pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>'
        '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>'
        '</worksheet>'
    ) % (son, dondur_satiri, dondur_satiri + 1, cols, ''.join(satir_xml), merges)

    shared = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="%d" uniqueCount="%d">%s</sst>'
    ) % (len(sira), len(sira), ''.join('<si><t xml:space="preserve">%s</t></si>' % kacir(m) for m in sira))

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
        '<sheets><sheet name="Ders Programı" sheetId="1" r:id="rId1"/></sheets></workbook>',
        'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>'
        '</Relationships>',
        'xl/styles.xml': STYLES,
        'xl/sharedStrings.xml': shared,
        'xl/worksheets/sheet1.xml': sheet,
    }
    with zipfile.ZipFile(yol, 'w', zipfile.ZIP_DEFLATED) as z:
        for ad, icerik in parcalar.items():
            z.writestr(ad, icerik.encode('utf-8'))
    print('yazıldı:', yol)


def bolum_xlsx():
    G = len(GUNLER) + 1
    bos = [None] * G
    satirlar = [
        [('{{Kurum Adı}}', S_BASLIK)] + [('', S_BASLIK)] * (G - 1),
        [('{{Fakülte Adı}}', S_ALTBASLIK)] + [('', S_ALTBASLIK)] * (G - 1),
        [('{{Bölüm Adı}} — HAFTALIK DERS PROGRAMI', S_ALTBASLIK)] + [('', S_ALTBASLIK)] * (G - 1),
        [
            (
                '{{Akademik Yıl}} Eğitim-Öğretim Yılı · {{Dönem}} Dönemi · '
                '{{Öğretim Seviyesi}} · {{Kapsam}}',
                S_BILGI,
            )
        ]
        + [('', S_BILGI)] * (G - 1),
        list(bos),
        [(b, S_SUTUN) for b in ['Saat'] + GUNLER],
        [(VERI_SATIRI[0], S_SAAT)] + [(v, S_HUCRE) for v in VERI_SATIRI[1:]],
        list(bos),
        [('Toplam {{Ders Sayısı}} ders · {{Ders Saati Sayısı}} ders saati', S_ALT)] + [None] * (G - 1),
        [('Belge Tarihi: {{Tarih}}', S_ALT)] + [None] * (G - 1),
        [('Hazırlayan: {{Hazırlayan}}', S_ALT)] + [None] * (G - 1),
    ]
    son = sutun(G - 1)
    xlsx_yaz(
        os.path.join(KOK, 'bolum-ders-programi.xlsx'),
        satirlar,
        ['A%d:%s%d' % (r, son, r) for r in (1, 2, 3, 4)],
        6,
        [14] + [34] * len(GUNLER),
    )


def fakulte_xlsx():
    G = len(GUNLER) + 1
    bos = [None] * G
    satirlar = [
        [('{{Kurum Adı}}', S_BASLIK)] + [('', S_BASLIK)] * (G - 1),
        [('{{Fakülte Adı}}', S_ALTBASLIK)] + [('', S_ALTBASLIK)] * (G - 1),
        [('BİRLEŞİK HAFTALIK DERS PROGRAMI', S_ALTBASLIK)] + [('', S_ALTBASLIK)] * (G - 1),
        [
            (
                '{{Akademik Yıl}} Eğitim-Öğretim Yılı · {{Dönem}} Dönemi · {{Öğretim Seviyesi}}',
                S_BILGI,
            )
        ]
        + [('', S_BILGI)] * (G - 1),
        [('Kapsanan bölümler: {{Kapsam}}', S_BILGI)] + [('', S_BILGI)] * (G - 1),
        list(bos),
        [(b, S_SUTUN) for b in ['Saat'] + GUNLER],
        [(VERI_SATIRI[0], S_SAAT)] + [(v, S_HUCRE) for v in VERI_SATIRI[1:]],
        list(bos),
        [('Toplam {{Ders Sayısı}} ders · {{Ders Saati Sayısı}} ders saati', S_ALT)] + [None] * (G - 1),
        [('Belge Tarihi: {{Tarih}}', S_ALT)] + [None] * (G - 1),
        [('Hazırlayan: {{Hazırlayan}}', S_ALT)] + [None] * (G - 1),
    ]
    son = sutun(G - 1)
    xlsx_yaz(
        os.path.join(KOK, 'fakulte-ders-programi.xlsx'),
        satirlar,
        ['A%d:%s%d' % (r, son, r) for r in (1, 2, 3, 4, 5)],
        7,
        [14] + [34] * len(GUNLER),
    )


# ══════════════════════════════════════════════════════════════
# DOCX
# ══════════════════════════════════════════════════════════════

def p(metin, hiza='left', kalin=False, punto=20, renk=None):
    """punto: yarım-punto (20 = 10pt)"""
    rpr = '<w:rPr>'
    if kalin:
        rpr += '<w:b/>'
    rpr += '<w:sz w:val="%d"/><w:szCs w:val="%d"/>' % (punto, punto)
    if renk:
        rpr += '<w:color w:val="%s"/>' % renk
    rpr += '</w:rPr>'
    return (
        '<w:p><w:pPr><w:jc w:val="%s"/><w:spacing w:after="60"/></w:pPr>'
        '<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r></w:p>'
    ) % (hiza, rpr, kacir(metin))


def tc(metin, genislik, kalin=False, zemin=None, beyaz=False, hiza='left'):
    gol = '<w:shd w:val="clear" w:color="auto" w:fill="%s"/>' % zemin if zemin else ''
    rpr = '<w:rPr>'
    if kalin:
        rpr += '<w:b/>'
    rpr += '<w:sz w:val="18"/><w:szCs w:val="18"/>'
    if beyaz:
        rpr += '<w:color w:val="FFFFFF"/>'
    rpr += '</w:rPr>'
    return (
        '<w:tc><w:tcPr><w:tcW w:w="%d" w:type="dxa"/>%s</w:tcPr>'
        '<w:p><w:pPr><w:jc w:val="%s"/></w:pPr>'
        '<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r></w:p></w:tc>'
    ) % (genislik, gol, hiza, rpr, kacir(metin))


def docx_yaz(yol, baslik_paragraflari, alt_paragraflar):
    # A4 YATAY: 5 gün yan yana sığsın (dikey sayfada sütunlar okunmaz olur).
    genislikler = [1300] + [2400] * len(GUNLER)
    grid = ''.join('<w:gridCol w:w="%d"/>' % g for g in genislikler)
    baslik = '<w:tr><w:trPr><w:tblHeader/></w:trPr>%s</w:tr>' % ''.join(
        tc(b, genislikler[i], kalin=True, zemin='1B2A4A', beyaz=True, hiza='center')
        for i, b in enumerate(['Saat'] + GUNLER)
    )
    # TEK veri satırı — motor bunu dolu saat sayısı kadar çoğaltır.
    veri = '<w:tr>%s</w:tr>' % (
        tc(VERI_SATIRI[0], genislikler[0], kalin=True, zemin='F3F4F6', hiza='center')
        + ''.join(tc(v, genislikler[i + 1]) for i, v in enumerate(VERI_SATIRI[1:]))
    )
    kenarlik = (
        '<w:tblBorders>'
        + ''.join(
            '<w:%s w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>' % k
            for k in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV')
        )
        + '</w:tblBorders>'
    )
    tablo = (
        '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/>'
        '<w:tblW w:w="0" w:type="auto"/>%s</w:tblPr>'
        '<w:tblGrid>%s</w:tblGrid>%s%s</w:tbl>'
    ) % (kenarlik, grid, baslik, veri)

    govde = (
        ''.join(baslik_paragraflari)
        + tablo
        + '<w:p/>'
        + ''.join(alt_paragraflar)
        + '<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>'
        '<w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" '
        'w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>'
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
    with zipfile.ZipFile(yol, 'w', zipfile.ZIP_DEFLATED) as z:
        for ad, icerik in parcalar.items():
            z.writestr(ad, icerik.encode('utf-8'))
    print('yazıldı:', yol)


def bolum_docx():
    docx_yaz(
        os.path.join(KOK, 'bolum-ders-programi.docx'),
        [
            p('{{Kurum Adı}}', 'center', True, 32),
            p('{{Fakülte Adı}}', 'center', True, 24),
            p('{{Bölüm Adı}} — HAFTALIK DERS PROGRAMI', 'center', True, 24),
            p(
                '{{Akademik Yıl}} Eğitim-Öğretim Yılı · {{Dönem}} Dönemi · '
                '{{Öğretim Seviyesi}} · {{Kapsam}}',
                'center',
                False,
                18,
                '555555',
            ),
        ],
        [
            p('Toplam {{Ders Sayısı}} ders · {{Ders Saati Sayısı}} ders saati', 'left', False, 16, '555555'),
            p('Belge Tarihi: {{Tarih}}', 'left', False, 16, '555555'),
            p('Hazırlayan: {{Hazırlayan}}', 'left', False, 16, '555555'),
        ],
    )


def fakulte_docx():
    docx_yaz(
        os.path.join(KOK, 'fakulte-ders-programi.docx'),
        [
            p('{{Kurum Adı}}', 'center', True, 32),
            p('{{Fakülte Adı}}', 'center', True, 24),
            p('BİRLEŞİK HAFTALIK DERS PROGRAMI', 'center', True, 24),
            p(
                '{{Akademik Yıl}} Eğitim-Öğretim Yılı · {{Dönem}} Dönemi · {{Öğretim Seviyesi}}',
                'center',
                False,
                18,
                '555555',
            ),
            p('Kapsanan bölümler: {{Kapsam}}', 'center', False, 16, '555555'),
        ],
        [
            p('Toplam {{Ders Sayısı}} ders · {{Ders Saati Sayısı}} ders saati', 'left', False, 16, '555555'),
            p('Belge Tarihi: {{Tarih}}', 'left', False, 16, '555555'),
            p('Hazırlayan: {{Hazırlayan}}', 'left', False, 16, '555555'),
        ],
    )


if __name__ == '__main__':
    os.makedirs(KOK, exist_ok=True)
    bolum_xlsx()
    fakulte_xlsx()
    bolum_docx()
    fakulte_docx()
