# -*- coding: utf-8 -*-
"""public/odr-sablon.docx üretir — paketli ÖDR iskelet şablonu.

Akreditasyon modülündeki "Hazır Şablonu Kur" butonu bu dosyayı sunucudan
çekip Şablonlar sistemine OTOMATIK EŞLENMİŞ olarak yükler; kullanıcı Word
düzenlemeden ve sihirbazda eşleme yapmadan "Rapor Oluştur (ÖDR)" kullanabilir.

Yer tutucu adları akreditasyon-modulu.jsx'teki ODR_TOKEN_MAP ile birebir
aynıdır — burada bir token değişirse orada da güncellenmelidir.

Çalıştırma:  python3 scripts/build-odr-sablon.py
"""
import zipfile
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'odr-sablon.docx')

CRITERIA = [
    'Öğrenciler',
    'Program Eğitim Amaçları',
    'Program Çıktıları',
    'Sürekli İyileştirme',
    'Eğitim Planı',
    'Öğretim Kadrosu',
    'Altyapı',
    'Kurum Desteği ve Parasal Kaynaklar',
    'Organizasyon ve Karar Alma Süreçleri',
    'Programa Özgü Ölçütler',
]


def esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def p(text='', bold=False, size=None, center=False, italic=False):
    rpr = ''
    if bold:
        rpr += '<w:b/>'
    if italic:
        rpr += '<w:i/>'
    if size:
        rpr += '<w:sz w:val="%d"/><w:szCs w:val="%d"/>' % (size, size)
    ppr = '<w:pPr>%s</w:pPr>' % ('<w:jc w:val="center"/>' if center else '')
    if not text:
        return '<w:p>%s</w:p>' % ppr
    return (
        '<w:p>%s<w:r><w:rPr>%s</w:rPr>'
        '<w:t xml:space="preserve">%s</w:t></w:r></w:p>' % (ppr, rpr, esc(text))
    )


body = []
body.append(p('ÖZ DEĞERLENDİRME RAPORU', bold=True, size=40, center=True))
body.append(p())
body.append(p('{{Üniversite Adı}}', bold=True, size=30, center=True))
body.append(p('{{Fakülte Adı}}', size=26, center=True))
body.append(p('{{Program (Bölüm) Adı}}', bold=True, size=28, center=True))
body.append(p())
body.append(p('Çerçeve: {{Çerçeve}}'))
body.append(p('Rapor Tarihi: {{Rapor Tarihi}}'))
body.append(p('Hazırlayan: {{Hazırlayan}}'))
body.append(p('Genel Hazırlık Durumu: {{İlerleme Özeti}}'))
body.append(p())
body.append(
    p(
        'Not: Bu belge sistem tarafından üretilen bir İSKELETTİR — her ölçüt bölümünde '
        'sistemdeki değerlendirme (durum, notlar, kanıtlar) hazır gelir; metinleri MÜDEK '
        'ÖDR yönergesine göre genişletin.',
        italic=True,
    )
)
for i, title in enumerate(CRITERIA, start=1):
    body.append(p())
    body.append(p('ÖLÇÜT %d. %s' % (i, title.upper()), bold=True, size=26))
    body.append(p('Durum: {{Ölçüt %d — Durum Özeti}}' % i))
    body.append(p('Değerlendirme Notları:', bold=True))
    body.append(p('{{Ölçüt %d — Notlar}}' % i))
    body.append(p('Kanıtlar:', bold=True))
    body.append(p('{{Ölçüt %d — Kanıt Listesi}}' % i))

document = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    '<w:body>' + ''.join(body) + '<w:sectPr/></w:body></w:document>'
)

CONTENT_TYPES = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    '</Types>'
)
RELS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    '</Relationships>'
)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', CONTENT_TYPES)
    z.writestr('_rels/.rels', RELS)
    z.writestr('word/document.xml', document)

print('Yazıldı: %s (%d bayt)' % (os.path.abspath(OUT), os.path.getsize(OUT)))
