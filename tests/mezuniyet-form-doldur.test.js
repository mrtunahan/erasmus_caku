import { describe, it, expect } from 'vitest';
import {
  mezuniyetFormunuDoldur,
  gorunenMetin,
  bolumBasligi,
  anahtar,
} from '../lib/mezuniyet-form-doldur.js';

const r = (t) => '<w:r><w:rPr><w:b/></w:rPr><w:t>' + t + '</w:t></w:r>';
const p = (ic) => '<w:p><w:pPr><w:rPr><w:sz w:val="22"/></w:rPr></w:pPr>' + (ic || '') + '</w:p>';
const tc = (ic) => '<w:tc><w:tcPr><w:tcW w:w="100"/></w:tcPr>' + p(ic) + '</w:tc>';
const tr = (...h) => '<w:tr><w:trPr/>' + h.join('') + '</w:tr>';
const tbl = (...s) => '<w:tbl><w:tblPr/><w:tblGrid/>' + s.join('') + '</w:tbl>';

// Kurumun formunun iskeleti (ekran görüntülerindeki yapı).
const FORM =
  '<w:document><w:body>' +
  p(r('ÇANKIRI KARATEKİN ÜNİVERSİTESİ')) +
  p(r('………………… ') + r('MÜHENDİSLİĞİ BÖLÜM BAŞKANLIĞINA')) +
  tbl(
    tr(tc(r('KİMLİK BİLGİLERİ'))),
    tr(tc(r('Adı ve Soyadı')), tc()),
    tr(tc(r('Öğrenci No')), tc()),
    tr(tc(r('Bölümü')), tc()),
    tr(tc(r('Telefon')), tc()),
    tr(tc(r('Adres')), tc()),
    tr(tc('<w:r><w:t>e</w:t></w:r>' + r('-posta')), tc())
  ) +
  p(
    r(
      '☐ Mezuniyet için transkriptimden silinmesi gereken seçmeli başarısız dersim bulunmamaktadır.'
    )
  ) +
  p(
    r(
      '☐ Mezuniyet için aşağıda bildirdiğim seçmeli derslerin transkriptimden silinmesini istiyorum.'
    )
  ) +
  tbl(
    tr(
      tc(r('DERSİN KODU VE ADI')),
      tc(r('EĞİTİM- ÖĞRETİM YILI')),
      tc(r('YARIYIL')),
      tc(r("DERSİN AKTS'si")),
      tc(r('STATÜSÜ'))
    ),
    tr(tc(), tc(), tc(), tc(), tc()),
    tr(tc(), tc(), tc(), tc(), tc())
  ) +
  '</w:body></w:document>';

const VERI = {
  adSoyad: 'Ayşe Yılmaz',
  ogrenciNo: '2021001',
  bolum: 'Bilgisayar Mühendisliği',
  telefon: '0555 000 00 00',
  adres: 'Çankırı & Merkez',
  eposta: 'a@b.c',
  bolumBaslik: 'BİLGİSAYAR',
  silmeBeyani: 'var',
  dersler: [
    {
      kod: 'MAT166',
      ad: 'Matematik-II',
      yil: '2022-2023',
      yariyil: 'Bahar',
      akts: '5',
      statu: 'Seçmeli',
    },
    {
      kod: 'BLM201',
      ad: 'Veri Yapıları',
      yil: '2023-2024',
      yariyil: 'Güz',
      akts: '6',
      statu: 'Seçmeli',
    },
  ],
};

describe('kurumun mezuniyet formunu doldurma', () => {
  const s = mezuniyetFormunuDoldur(FORM, VERI);
  const yazi = gorunenMetin(s.xml);

  it('kimlik tablosunu etiketlerin yanına doldurur', () => {
    ['Ayşe Yılmaz', '2021001', 'Bilgisayar Mühendisliği', '0555 000 00 00', 'a@b.c'].forEach((x) =>
      expect(yazi).toContain(x)
    );
    expect(s.xml).toContain('Çankırı &amp; Merkez');
    expect(s.bulunamayan).toEqual([]);
  });

  it('bölüm başlığındaki noktaları bölüm adıyla değiştirir', () => {
    expect(yazi).toContain('BİLGİSAYAR MÜHENDİSLİĞİ BÖLÜM BAŞKANLIĞINA');
    expect(yazi).not.toContain('………');
  });

  it('yalnız seçilen beyanın kutusunu işaretler', () => {
    expect(yazi).toContain('☐ Mezuniyet için transkriptimden');
    expect(yazi).toContain('☒ Mezuniyet için aşağıda bildirdiğim');
  });

  it('ders tablosunun BOŞ satırlarını doldurur, satır eklemez', () => {
    expect(yazi).toContain('MAT166 Matematik-II');
    expect(yazi).toContain('2023-2024');
    expect(yazi).toContain('Bahar');
    expect((s.xml.match(/<w:tr>/g) || []).length).toBe((FORM.match(/<w:tr>/g) || []).length);
    expect(s.sigmayan).toEqual([]);
  });

  it('boş satırdan fazla ders sığmayan olarak döner', () => {
    const fazla = mezuniyetFormunuDoldur(FORM, {
      ...VERI,
      dersler: VERI.dersler.concat([{ kod: 'X1', ad: 'Fazla' }]),
    });
    expect(fazla.sigmayan.map((d) => d.kod)).toEqual(['X1']);
  });

  it('"bulunmamaktadır" seçilince ilk kutu işaretlenir', () => {
    const y = gorunenMetin(
      mezuniyetFormunuDoldur(FORM, { ...VERI, silmeBeyani: 'yok', dersler: [] }).xml
    );
    expect(y).toContain('☒ Mezuniyet için transkriptimden');
    expect(y).toContain('☐ Mezuniyet için aşağıda');
  });

  it('Word onay kutusu denetimini de işaretler', () => {
    const denetim =
      '<w:p><w:sdt><w:sdtPr><w14:checkbox><w14:checked w14:val="0"/></w14:checkbox></w:sdtPr>' +
      '<w:sdtContent><w:r><w:t>☐</w:t></w:r></w:sdtContent></w:sdt>' +
      r(
        ' Mezuniyet için aşağıda bildirdiğim seçmeli derslerin transkriptimden silinmesini istiyorum.'
      ) +
      '</w:p>';
    const s2 = mezuniyetFormunuDoldur(denetim, { silmeBeyani: 'var' });
    expect(s2.xml).toContain('w14:val="1"');
    expect(gorunenMetin(s2.xml)).toContain('☒');
  });

  it('yardımcılar', () => {
    expect(bolumBasligi('Bilgisayar Mühendisliği')).toBe('BİLGİSAYAR');
    expect(anahtar('Adı ve Soyadı')).toBe('adivesoyadi');
  });

  it('Word’ün kısa yazdığı boş hücre ve paragrafları (<w:p/>) da doldurur', () => {
    const bos = '<w:tc><w:tcPr><w:tcW w:w="100"/></w:tcPr><w:p w:rsidR="00A1"/></w:tc>';
    const xml =
      '<w:body><w:p/>' +
      tbl(tr(tc(r('Adı ve Soyadı')), bos)) +
      '<w:p/>' +
      p(
        r(
          '☐ Mezuniyet için aşağıda bildirdiğim seçmeli derslerin transkriptimden silinmesini istiyorum.'
        )
      ) +
      tbl(tr(tc(r('DERSİN KODU VE ADI')), tc(r('YARIYIL'))), tr(bos, bos)) +
      '</w:body>';
    const s2 = mezuniyetFormunuDoldur(xml, { ...VERI, dersler: VERI.dersler.slice(0, 1) });
    const y = gorunenMetin(s2.xml);
    expect(y).toContain('Ayşe Yılmaz');
    expect(y).toContain('☒ Mezuniyet için aşağıda');
    expect(y).toContain('MAT166 Matematik-II');
    expect(y).toContain('Bahar');
  });
});
