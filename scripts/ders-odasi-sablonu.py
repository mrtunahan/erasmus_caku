#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ders Odaları — Ödev Not Çizelgesi ŞABLONLARINI üretir (.xlsx ve .docx).

Şablonlar modülüne (Ders Odaları kartı) yüklenmeye hazır dosyaları sıfırdan
yazar. Yer tutucu adları lib/ders-odasi.js'teki NOT_CIZELGESI_STATIC /
NOT_CIZELGESI_ROWS etiketleriyle eşleşir (parantezli açıklama atılarak);
eşleme sihirbazı bunları kendiliğinden bağlar, yetkili yalnız Kaydet'e basar.

    .xlsx → belge türü "Ödev Not Çizelgesi — Excel"
    .docx → belge türü "Ödev Not Çizelgesi — Yazdırma / PDF (Word)"
             (sunucu Word'ü PDF'e çevirir)

Tasarım kuralı — TABLODA TEK VERİ SATIRI VARDIR:
    {{No}} {{Öğrenci No}} {{Adı}} {{Soyadı}} {{1.Ödev}} … {{Toplam Puan}}
Motor bu satırı öğrenci sayısı kadar çoğaltır. Veri satırında yer tutucu
dışında kelime bulunmamalıdır. XLSX'te yer tutucular sharedStrings'te durur
(motor yalnız t="s" hücrelerine bakar).

ÖDEV SAYISI SABİT DEĞİLDİR. Varsayılan 10; komut satırından değişir. Sistem
odev1 … odev20 üretir, şablonda kaç sütun varsa o kadarı dolar.

Kullanım:  python3 scripts/ders-odasi-sablonu.py [odev_sayisi]
Çıktı:     sablonlar/ders-odalari/odev-not-cizelgesi.xlsx
           sablonlar/ders-odalari/odev-not-cizelgesi.docx
"""

import importlib.util
import os
import sys

BURASI = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.join(BURASI, '..', 'sablonlar', 'ders-odalari')

# Ortak yazım yardımcıları (stil kataloğu, sharedStrings, docx hücreleri)
# devam listesi şablonundan alınır — iki şablon aynı görünümde kalsın.
_spec = importlib.util.spec_from_file_location('yoklama_sablonu', os.path.join(BURASI, 'yoklama-sablonu.py'))
Y = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(Y)

ODEV_SINIRI = 20  # lib/ders-odasi.js → ODEV_SINIRI
VARSAYILAN_ODEV = 10

ANTET = ['{{Üniversite Adı}}', '{{Fakülte Bilgisi}}', '{{Bölüm Adı}}']

KUNYE = [
    ('Ders Kodu ve Adı', '{{Ders Kodu ve Adı}}'),
    ('Öğretim Üyesi / Görevlisi', '{{Öğretim Üyesi / Görevlisi}}'),
    ('Öğrenci Sayısı', '{{Öğrenci Sayısı}}'),
    ('Ödevler', '{{Ödevler}}'),
]

# (başlık, yer tutucu, docx genişliği twip, xlsx genişliği karakter)
BAS_SUTUNLAR = [
    ('No', '{{No}}', 600, 5),
    ('Öğrenci No', '{{Öğrenci No}}', 1400, 14),
    ('Adı', '{{Adı}}', 1700, 18),
    ('Soyadı', '{{Soyadı}}', 1700, 18),
]
SON_SUTUNLAR = [
    ('Teslim', '{{Teslim Ettiği Ödev Sayısı}}', 800, 8),
    ('Toplam', '{{Toplam Puan}}', 900, 9),
    ('Ortalama (100)', '{{Ortalama}}', 1100, 11),
]


def sutunlar(odev):
    orta = [('%d.Ödev' % (i + 1), '{{%d.Ödev}}' % (i + 1), 0, 8) for i in range(odev)]
    return BAS_SUTUNLAR + orta + SON_SUTUNLAR


# ══════════════════════════════════════════════════════════════
# XLSX — stil indeksleri yoklama şablonundakiyle aynı:
# 1 başlık · 2 künye etiketi · 3 künye değeri · 4 tarih · 5 tablo başlığı ·
# 6 ödev başlığı · 7 veri (sol) · 8 veri (orta)
# ══════════════════════════════════════════════════════════════
def xlsx_yaz(yol, odev):
    ss = Y.Metinler()
    sut = sutunlar(odev)
    n = len(sut)
    son = Y.sutun_adi(n - 1)
    sa = Y.sutun_adi

    def hucre(i, r, m, stil):
        return '<c r="%s%d" s="%d" t="s"><v>%d</v></c>' % (sa(i), r, stil, ss.ekle(m))

    satirlar = []
    birlesik = []
    r = 1
    for m in ANTET:
        satirlar.append('<row r="%d" ht="18" customHeight="1">%s</row>' % (r, hucre(0, r, m, 1 if r == 1 else 2)))
        birlesik.append('A%d:%s%d' % (r, son, r))
        r += 1
    satirlar.append('<row r="%d" ht="22" customHeight="1">%s</row>' % (r, hucre(0, r, '{{Başlık}}', 1)))
    birlesik.append('A%d:%s%d' % (r, son, r))
    r += 2
    for i, (etiket, tutucu) in enumerate(KUNYE):
        h = hucre(0, r, etiket + ' :', 2) + hucre(2, r, tutucu, 3)
        if i == 1:
            h += hucre(n - 1, r, '{{Tarih}}', 4)
        satirlar.append('<row r="%d">%s</row>' % (r, h))
        birlesik.append('A%d:B%d' % (r, r))
        birlesik.append('C%d:%s%d' % (r, sa(max(2, n - 3)), r))
        r += 1
    r += 1
    bas_r = r
    satirlar.append(
        '<row r="%d" ht="30" customHeight="1">%s</row>'
        % (r, ''.join(hucre(i, r, b, 6 if b.endswith('.Ödev') else 5) for i, (b, _t, _g, _w) in enumerate(sut)))
    )
    r += 1
    veri_r = r
    satirlar.append(
        '<row r="%d">%s</row>'
        % (r, ''.join(hucre(i, r, t, 7 if b in ('Adı', 'Soyadı') else 8) for i, (b, t, _g, _w) in enumerate(sut)))
    )
    r += 2
    satirlar.append('<row r="%d">%s</row>' % (r, hucre(n - 1, r, '{{Öğretim Üyesi / Görevlisi}}', 4)))
    satirlar.append('<row r="%d">%s</row>' % (r + 1, hucre(n - 1, r + 1, 'İmza', 4)))

    cols = ''.join(
        '<col min="%d" max="%d" width="%d" customWidth="1"/>' % (i + 1, i + 1, w) for i, (_b, _t, _g, w) in enumerate(sut)
    )
    sheet = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<dimension ref="A1:%s%d"/>'
        '<sheetViews><sheetView tabSelected="1" workbookViewId="0">'
        '<pane ySplit="%d" topLeftCell="A%d" activePane="bottomLeft" state="frozen"/>'
        '</sheetView></sheetViews>'
        '<sheetFormatPr defaultRowHeight="15"/>'
        '<cols>%s</cols><sheetData>%s</sheetData>'
        '<mergeCells count="%d">%s</mergeCells>'
        '<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>'
        '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/>'
        '</worksheet>'
    ) % (
        son,
        r + 1,
        bas_r,
        veri_r,
        cols,
        ''.join(satirlar),
        len(birlesik),
        ''.join('<mergeCell ref="%s"/>' % x for x in birlesik),
    )
    sayfa = 'Not Çizelgesi'
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
        '<sheets><sheet name="%s" sheetId="1" r:id="rId1"/></sheets>'
        '<definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'
        '&apos;%s&apos;!$%d:$%d</definedName></definedNames>'
        '</workbook>' % (sayfa, sayfa, bas_r, bas_r),
        'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>'
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        '</Relationships>',
        'xl/worksheets/sheet1.xml': sheet,
        'xl/sharedStrings.xml': ss.xml(),
        'xl/styles.xml': Y.STILLER,
    }
    Y.zip_yaz(yol, parcalar)
    print('yazıldı: %s (%d ödev sütunu)' % (yol, odev))


# ══════════════════════════════════════════════════════════════
# DOCX (yatay A4)
# ══════════════════════════════════════════════════════════════
def kunye_tablosu():
    g = [3000, 9000, Y.ICERIK - 12000]
    satirlar = []
    for i, (etiket, tutucu) in enumerate(KUNYE):
        satirlar.append(
            '<w:tr>%s%s%s</w:tr>'
            % (
                Y.tc(etiket + ' :', g[0], kalin=True, punto=19),
                Y.tc(tutucu, g[1], punto=19),
                Y.tc('{{Tarih}}' if i == 1 else '', g[2], kalin=True, hiza='right', punto=19),
            )
        )
    return (
        '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>'
        + ''.join(
            '<w:%s w:val="none" w:sz="0" w:space="0" w:color="auto"/>' % k
            for k in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV')
        )
        + '</w:tblBorders></w:tblPr><w:tblGrid>%s</w:tblGrid>%s</w:tbl>'
        % (''.join('<w:gridCol w:w="%d"/>' % x for x in g), ''.join(satirlar))
    )


def not_tablosu(odev):
    sabit = sum(s[2] for s in BAS_SUTUNLAR + SON_SUTUNLAR)
    og = max(420, (Y.ICERIK - sabit) // odev)
    sut = [(b, t, g or og, w) for b, t, g, w in sutunlar(odev)]
    grid = ''.join('<w:gridCol w:w="%d"/>' % g for _b, _t, g, _w in sut)
    bas = '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>%s</w:tr>' % ''.join(
        Y.tc(b, g, kalin=True, zemin='1B2A4A', beyaz=True, hiza='center', punto=14 if b.endswith('.Ödev') else 16)
        for b, _t, g, _w in sut
    )
    veri = '<w:tr>%s</w:tr>' % ''.join(
        Y.tc(t, g, hiza='left' if b in ('Adı', 'Soyadı') else 'center', punto=17) for b, t, g, _w in sut
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
        '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/>%s'
        '<w:tblLayout w:type="fixed"/>'
        '<w:tblCellMar><w:left w:w="50" w:type="dxa"/><w:right w:w="50" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>%s</w:tblGrid>%s%s</w:tbl>'
    ) % (kenarlik, grid, bas, veri)


def docx_yaz(yol, odev):
    govde = (
        Y.p('{{Üniversite Adı}}', 'center', True, 24, sonrasi=0)
        + Y.p('{{Fakülte Bilgisi}}', 'center', True, 20, sonrasi=0)
        + Y.p('{{Bölüm Adı}}', 'center', True, 20, sonrasi=80)
        + Y.p('{{Başlık}}', 'center', True, 26, sonrasi=160)
        + kunye_tablosu()
        + Y.p('', 'left', False, 12, sonrasi=60)
        + not_tablosu(odev)
        + '<w:p/>'
        + Y.p('{{Öğretim Üyesi / Görevlisi}}', 'right', False, 19, sonrasi=0)
        + Y.p('İmza', 'right', False, 19, '555555')
        + '<w:sectPr><w:pgSz w:w="%d" w:h="11906" w:orient="landscape"/>'
        '<w:pgMar w:top="%d" w:right="%d" w:bottom="%d" w:left="%d" '
        'w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>' % (Y.SAYFA_EN, Y.KENAR, Y.KENAR, Y.KENAR, Y.KENAR)
    )
    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:body>%s</w:body></w:document>'
    ) % govde
    Y.zip_yaz(
        yol,
        {
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
        },
    )
    print('yazıldı: %s (%d ödev sütunu)' % (yol, odev))


if __name__ == '__main__':
    odev = int(sys.argv[1]) if len(sys.argv) > 1 else VARSAYILAN_ODEV
    if not 1 <= odev <= ODEV_SINIRI:
        raise SystemExit('Ödev sayısı 1 ile %d arasında olmalı.' % ODEV_SINIRI)
    os.makedirs(KOK, exist_ok=True)
    xlsx_yaz(os.path.join(KOK, 'odev-not-cizelgesi.xlsx'), odev)
    docx_yaz(os.path.join(KOK, 'odev-not-cizelgesi.docx'), odev)
