#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ders Programı ŞABLONLARINI üretir.

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
import re
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
# XLSX — KURUMUN KENDİ TABLOSUNDAN TÜRETİLİR
#
# Excel şablonu sıfırdan çizilmez: fakültenin elle tuttuğu tablo (sütun =
# derslik, satır = gün + ders saati, sarı/yeşil alanlar elle dolu) olduğu gibi
# korunur, üzerine yalnız {{ }} yer tutucuları işlenir. Böylece kenarlıklar,
# birleşik hücreler, sütun genişlikleri ve baskı ayarları kurumun bıraktığı
# gibi kalır.
#
# İşaretlenen üç şey:
#   'Gün'        → {{Gün}}          ızgaranın gün sütununu bulur
#   'Ders Saati' → {{Ders Saati}}   saat sütununu bulur; sağı derslik sütunları
#   üst başlık   → künye alanları   (fakülte/bölüm adı, akademik yıl, dönem)
# ══════════════════════════════════════════════════════════════

HAM = os.path.join(KOK, 'kaynak', 'fakulte-cikti-ham.xlsx')


def yer_tutucu_isle(shared, ust_baslik):
    """Paylaşılan metin tablosuna yer tutucuları yazar."""
    out = shared
    # Izgara işaretçileri: motor tabloyu bunlardan bulur (lib/xlsx-izgara.js).
    out = out.replace('<t>Gün</t>', '<t>{{Gün}}</t>')
    out = out.replace('<t>Ders Saati</t>', '<t>{{Ders Saati}}</t>')
    # Üst başlık: dosyadaki dönem yazısı künye alanlarıyla değiştirilir.
    out = re.sub(
        r'<t[^>]*>\s*20\d\d-\d\d[^<]*Dönemi\s*</t>',
        '<t xml:space="preserve">' + ust_baslik + '</t>',
        out,
        count=1,
    )
    return out


def xlsx_sablonu(hedef, ust_baslik):
    if not os.path.exists(HAM):
        print('ATLANDI (kaynak yok):', HAM)
        return
    with zipfile.ZipFile(HAM) as zin:
        parcalar = [(i, zin.read(i.filename)) for i in zin.infolist()]
    with zipfile.ZipFile(hedef, 'w', zipfile.ZIP_DEFLATED) as zo:
        for bilgi, veri in parcalar:
            if bilgi.filename == 'xl/sharedStrings.xml':
                veri = yer_tutucu_isle(veri.decode('utf-8'), ust_baslik).encode('utf-8')
            zo.writestr(bilgi.filename, veri)
    print('yazıldı:', hedef)


def bolum_xlsx():
    xlsx_sablonu(
        os.path.join(KOK, 'bolum-programi-xlsx.xlsx'),
        '{{Bölüm Adı}} — {{Akademik Yıl}} {{Dönem}} Dönemi',
    )


def fakulte_xlsx():
    xlsx_sablonu(
        os.path.join(KOK, 'fakulte-programi-xlsx.xlsx'),
        '{{Fakülte Adı}} — {{Akademik Yıl}} {{Dönem}} Dönemi',
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
        os.path.join(KOK, 'bolum-programi-pdf.docx'),
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
        os.path.join(KOK, 'fakulte-programi-pdf.docx'),
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
