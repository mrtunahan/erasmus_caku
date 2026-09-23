#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ders Devam (Yoklama) Listesi ŞABLONUNU üretir.

Şablonlar modülüne yüklenmeye hazır .docx dosyasını sıfırdan yazar. Yer tutucu
adları, lib/yoklama-listesi.js'teki YOKLAMA_LISTE_STATIC / YOKLAMA_LISTE_ROWS
etiketleriyle BİREBİR aynıdır; eşleme sihirbazı etiketle eşleşen yer tutucuyu
kendiliğinden bağladığı için yetkilinin elle eşleme yapması gerekmez.

Tasarım kuralı — TABLODA TEK VERİ SATIRI VARDIR:
    {{No}} {{Öğrenci No}} {{Adı}} {{Soyadı}} {{Sınıfı}} {{Devam}} {{1.Hafta}}…
Motor bu satırı öğrenci sayısı kadar çoğaltır. ⚠ Veri satırında yer tutucu
DIŞINDA kelime bulunmamalıdır; bulunursa motor o satırı "sütun başlığı" sanır
ve altındaki satırı doldurmaya çalışır (bkz. generateDocx → İŞARETÇİ modu).

HAFTA SAYISI SABİT DEĞİLDİR. Varsayılan 15'tir (örnek belgedeki gibi) ama
komut satırından değiştirilebilir; kurum 14 haftalık dönem uyguluyorsa
şablonu 14 sütunla üretmek yeter. Sistem tarafında karşılığı hafta1…hafta20
değişkenleridir: şablonda kaç hafta sütunu varsa o kadarı dolar.

Kullanım:  python3 scripts/yoklama-sablonu.py [hafta_sayisi]
Çıktı:     sablonlar/yoklama/ders-devam-listesi.docx
"""

import os
import sys
import zipfile

KOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sablonlar', 'yoklama')

# Sistemdeki üst sınır (lib/yoklama-listesi.js → HAFTA_SINIRI)
HAFTA_SINIRI = 20
VARSAYILAN_HAFTA = 15

# A4 YATAY: 15 hafta sütunu dikey sayfaya sığmaz.
SAYFA_EN = 16838
KENAR = 720
ICERIK = SAYFA_EN - 2 * KENAR

# Künye satırları: (etiket, yer tutucu)
KUNYE = [
    ('Ders Kodu ve Adı', '{{Ders Kodu ve Adı}}'),
    ('Öğretim Üyesi / Görevlisi', '{{Öğretim Üyesi / Görevlisi}}'),
    ('Fakülte Bilgisi', '{{Fakülte Bilgisi}}'),
    ('Bölüm Adı', '{{Bölüm Adı}}'),
    ('Dersi Alan Kadın/Erkek Öğrenci Sayısı', '{{Dersi Alan Kadın/Erkek Öğrenci Sayısı}}'),
]

# Sabit sütunlar: (başlık, yer tutucu, genişlik)
SABIT_SUTUNLAR = [
    ('No', '{{No}}', 600),
    ('Öğrenci No', '{{Öğrenci No}}', 1500),
    ('Adı', '{{Adı}}', 1900),
    ('Soyadı', '{{Soyadı}}', 1900),
    ('Sınıfı', '{{Sınıfı}}', 700),
    ('Devam', '{{Devam}}', 800),
]


def kacir(m):
    return (
        str(m)
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
    )


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


def tc(metin, genislik, kalin=False, zemin=None, beyaz=False, hiza='left', punto=18, birlesim=None, kolon=None):
    """
    Tablo hücresi.
      birlesim='bas'  → dikey birleşmenin başı (iki başlık satırını kapsar)
      birlesim='sur'  → birleşmenin devamı (metin yazılmaz)
      kolon=N         → N sütunu kapsar (HAFTALAR başlığı)
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
        # Tarih, örnek belgedeki gibi öğretim üyesi satırının sağ ucunda.
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

    # 1. başlık satırı: sabit sütunlar dikey birleşir, HAFTALAR yatay birleşir.
    ust = '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>%s%s</w:tr>' % (
        ''.join(
            tc(b, g, kalin=True, zemin='1B2A4A', beyaz=True, hiza='center', birlesim='bas')
            for b, _t, g in SABIT_SUTUNLAR
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
    # 2. başlık satırı: yalnız hafta adları.
    alt = '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>%s%s</w:tr>' % (
        ''.join(tc('', g, birlesim='sur') for _b, _t, g in SABIT_SUTUNLAR),
        ''.join(
            tc('%d.Hafta' % (i + 1), hafta_genislik, kalin=True, zemin='E7ECF4', hiza='center', punto=15)
            for i in range(hafta)
        ),
    )
    # TEK veri satırı — motor bunu öğrenci sayısı kadar çoğaltır.
    # ⚠ Burada yer tutucudan başka hiçbir kelime olmamalı.
    veri = '<w:tr>%s%s</w:tr>' % (
        ''.join(
            tc(t, g, hiza='center' if b in ('No', 'Sınıfı', 'Devam') else 'left')
            for b, t, g in SABIT_SUTUNLAR
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
        'w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>' % (SAYFA_EN, KENAR, KENAR, KENAR, KENAR)
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
    print('yazıldı: %s (%d hafta sütunu)' % (yol, hafta))


if __name__ == '__main__':
    hafta = int(sys.argv[1]) if len(sys.argv) > 1 else VARSAYILAN_HAFTA
    if not 1 <= hafta <= HAFTA_SINIRI:
        raise SystemExit('Hafta sayısı 1 ile %d arasında olmalı.' % HAFTA_SINIRI)
    os.makedirs(KOK, exist_ok=True)
    docx_yaz(os.path.join(KOK, 'ders-devam-listesi.docx'), hafta)
