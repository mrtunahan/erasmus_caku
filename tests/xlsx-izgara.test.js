// Fakültenin elle tuttuğu ders programı tablosunu doldurma kuralları.
// Yapı, kullanıcının yüklediği gerçek şablondan birebir alınmıştır:
// sütun = derslik, satır = gün + ders saati, sarı/yeşil alanlar elle dolu.
import { describe, it, expect } from 'vitest';
import {
  atlananOzeti,
  birlesikAraliklar,
  boyaliStiller,
  derslikAdaylari,
  hucreleriYaz,
  izgaraCoz,
  kunyeDoldur,
  paylasilanMetinler,
  refCoz,
  renkliStilEkle,
  sadeAd,
  sayfaHucreleri,
  saatAnahtari,
  sutunAdi,
  sutunIndeksi,
  yerlesimPlani,
} from '../lib/xlsx-izgara.js';

// ── Gerçek şablonun küçültülmüş hâli ──
//   C7 {{Gün}} · D7 {{Ders Saati}} · E7..G7 derslikler
//   C8:C10 Pazartesi · C11:C12 Salı
const hucreler = {
  E4: { metin: '{{Akademik Yıl}} {{Dönem}} Dönemi' },
  C7: { metin: '{{Gün}}' },
  D7: { metin: '{{Ders Saati}}' },
  E7: { metin: 'M10Z04\r\n(T45 - S25)' },
  F7: { metin: 'M11101\r\n(T63 - S42)' },
  G7: { metin: 'Bilgisayar Kat1 \r\n(M111BL)' },
  C8: { metin: 'Pazartesi' },
  D8: { metin: '08:30 - 09:15' },
  D9: { metin: '09:30 - 10:15' },
  D10: { metin: '12:30 - 13:15', boyali: true }, // öğle arası (yeşil)
  C11: { metin: 'Salı' },
  D11: { metin: '08:30 - 09:15' },
  D12: { metin: '09:30 - 10:15' },
  F12: { metin: 'OZD-E-M-İ-G-K', boyali: true }, // elle yazılmış ortak ders
};
const birlesikler = ['C8:C10', 'C11:C12', 'E10:G10'];
const izgara = izgaraCoz(hucreler, birlesikler);

describe('sadeAd / saatAnahtari', () => {
  it('kasa, boşluk ve noktalama farkını siler', () => {
    expect(sadeAd('Bilgisayar Kat1 ')).toBe(sadeAd('bilgisayar kat-1'));
    expect(sadeAd('İNŞAAT')).toBe(sadeAd('inşaat'));
  });

  it('ŞABLONDAKİ boşluklu saat sistemdekiyle eşleşir', () => {
    // Şablon '08:30 - 09:15' yazıyor, sistem '08:30-09:15' üretiyor.
    expect(saatAnahtari('08:30 - 09:15')).toBe(saatAnahtari('08:30-09:15'));
  });
});

describe('derslikAdaylari', () => {
  it('ad ve parantez içi AYRI aday olur', () => {
    // 'M10Z04 (T45 - S25)' → ad M10Z04, parantezde kapasite
    expect(derslikAdaylari('M10Z04\r\n(T45 - S25)')).toContain(sadeAd('M10Z04'));
    // 'Bilgisayar Kat1 (M111BL)' → parantezde KOD var; ikisi de eşleşebilmeli
    const a = derslikAdaylari('Bilgisayar Kat1 \r\n(M111BL)');
    expect(a).toContain(sadeAd('Bilgisayar Kat1'));
    expect(a).toContain(sadeAd('M111BL'));
  });

  it('boş başlık aday üretmez', () => {
    expect(derslikAdaylari('')).toEqual([]);
    expect(derslikAdaylari(null)).toEqual([]);
  });
});

describe('refCoz / sutunIndeksi / sutunAdi', () => {
  it('hücre başvurusunu ayırır', () => {
    expect(refCoz('C17')).toEqual({ sutun: 'C', satir: 17 });
    expect(refCoz('AA3')).toEqual({ sutun: 'AA', satir: 3 });
    expect(refCoz('bozuk')).toBe(null);
  });

  it('sütun adı ↔ indeks', () => {
    expect(sutunIndeksi('A')).toBe(0);
    expect(sutunIndeksi('Q')).toBe(16);
    expect(sutunIndeksi('AA')).toBe(26);
    expect(sutunAdi(0)).toBe('A');
    expect(sutunAdi(26)).toBe('AA');
  });
});

describe('izgaraCoz', () => {
  it('başlık satırını yer tutuculardan bulur', () => {
    expect(izgara.baslikSatiri).toBe(7);
    expect(izgara.gunSutunu).toBe('C');
    expect(izgara.saatSutunu).toBe('D');
  });

  it('saat sütununun SAĞINDAKİ dolu başlıklar dersliktir', () => {
    expect(izgara.derslikler.map((d) => d.sutun)).toEqual(['E', 'F', 'G']);
  });

  it('gün birleşik hücreleri satırlara dağıtılır', () => {
    expect(izgara.satirlar).toEqual([
      { satir: 8, gun: 'Pazartesi', saat: '08:30 - 09:15' },
      { satir: 9, gun: 'Pazartesi', saat: '09:30 - 10:15' },
      { satir: 10, gun: 'Pazartesi', saat: '12:30 - 13:15' },
      { satir: 11, gun: 'Salı', saat: '08:30 - 09:15' },
      { satir: 12, gun: 'Salı', saat: '09:30 - 10:15' },
    ]);
  });

  it('yer tutucu yoksa ızgara çözülemez (çağıran gömülü çıktıya düşer)', () => {
    expect(izgaraCoz({ C7: { metin: 'Gün' }, D7: { metin: 'Ders Saati' } }, [])).toBe(null);
    expect(izgaraCoz({}, [])).toBe(null);
    expect(izgaraCoz(null, null)).toBe(null);
  });

  it('derslik sütunu yoksa ızgara çözülemez', () => {
    expect(izgaraCoz({ C7: { metin: '{{Gün}}' }, D7: { metin: '{{Ders Saati}}' } }, [])).toBe(null);
  });

  it('birleştirilmemiş tek satırlık gün bloğu da okunur', () => {
    const g = izgaraCoz(
      {
        C1: { metin: '{{Gün}}' },
        D1: { metin: '{{Ders Saati}}' },
        E1: { metin: 'D-1' },
        C2: { metin: 'Cuma' },
        D2: { metin: '08:00-08:45' },
      },
      []
    );
    expect(g.satirlar).toEqual([{ satir: 2, gun: 'Cuma', saat: '08:00-08:45' }]);
  });
});

describe('yerlesimPlani', () => {
  const kayit = (gun, saat, derslik, kod, renk) => ({ gun, saat, derslik, kod, renk });

  it('dersi doğru hücreye yazar', () => {
    const { yazimlar, atlanan } = yerlesimPlani(izgara, hucreler, [
      kayit('Pazartesi', '08:30-09:15', 'M11101', 'FZK181', '#5B9BD5'),
    ]);
    expect(atlanan).toEqual([]);
    expect(yazimlar).toEqual([{ ref: 'F8', deger: 'FZK181', renk: '#5B9BD5' }]);
  });

  it('derslik PARANTEZ İÇİ koduyla da bulunur', () => {
    const { yazimlar } = yerlesimPlani(izgara, hucreler, [
      kayit('Salı', '08:30-09:15', 'M111BL', 'BLM101'),
    ]);
    expect(yazimlar[0].ref).toBe('G11');
  });

  it('BOYALI hücreye yazılmaz — kurumun elle doldurduğu alan korunur', () => {
    const { yazimlar, atlanan } = yerlesimPlani(izgara, hucreler, [
      kayit('Salı', '09:30-10:15', 'M11101', 'YENI101'),
    ]);
    expect(yazimlar).toEqual([]);
    expect(atlanan[0].sebep).toBe('dolu-hucre');
  });

  it('şablonda olmayan saat atlanır ve SEBEBİ bildirilir', () => {
    const { yazimlar, atlanan } = yerlesimPlani(izgara, hucreler, [
      kayit('Pazartesi', '19:00-19:45', 'M10Z04', 'GEC101'),
    ]);
    expect(yazimlar).toEqual([]);
    expect(atlanan[0].sebep).toBe('saat-yok');
  });

  it('şablonda olmayan derslik atlanır', () => {
    const { atlanan } = yerlesimPlani(izgara, hucreler, [
      kayit('Pazartesi', '08:30-09:15', 'YOKSALON', 'X101'),
    ]);
    expect(atlanan[0].sebep).toBe('derslik-yok');
  });

  it('dersliği atanmamış ders ayrı sebeple atlanır', () => {
    const { atlanan } = yerlesimPlani(izgara, hucreler, [
      kayit('Pazartesi', '08:30-09:15', '', 'X101'),
    ]);
    expect(atlanan[0].sebep).toBe('derslik-bos');
  });

  it('aynı hücreye ikinci ders yazılmaz (sessiz veri kaybı olmasın)', () => {
    const { yazimlar, atlanan } = yerlesimPlani(izgara, hucreler, [
      kayit('Pazartesi', '08:30-09:15', 'M10Z04', 'BIR'),
      kayit('Pazartesi', '08:30-09:15', 'M10Z04', 'IKI'),
    ]);
    expect(yazimlar).toHaveLength(1);
    expect(yazimlar[0].deger).toBe('BIR');
    expect(atlanan[0].sebep).toBe('hucre-kullanildi');
  });

  it('ızgara çözülemediyse tüm kayıtlar atlanır', () => {
    const { yazimlar, atlanan } = yerlesimPlani(null, hucreler, [kayit('a', 'b', 'c', 'd')]);
    expect(yazimlar).toEqual([]);
    expect(atlanan[0].sebep).toBe('izgara-yok');
  });

  it('boş kayıt listesinde çökmez', () => {
    expect(yerlesimPlani(izgara, hucreler, null)).toEqual({ yazimlar: [], atlanan: [] });
  });

  it('DÖRT ŞUBE dört ayrı dersliğe dağılır', () => {
    const { yazimlar, atlanan } = yerlesimPlani(izgara, hucreler, [
      kayit('Pazartesi', '08:30-09:15', 'M10Z04', 'FZK181 (Şb:1)'),
      kayit('Pazartesi', '08:30-09:15', 'M11101', 'FZK181 (Şb:2)'),
      kayit('Pazartesi', '09:30-10:15', 'M10Z04', 'FİZ161 (Şb:1)'),
      kayit('Pazartesi', '09:30-10:15', 'M11101', 'FİZ161 (Şb:2)'),
    ]);
    expect(atlanan).toEqual([]);
    expect(yazimlar.map((y) => y.ref)).toEqual(['E8', 'F8', 'E9', 'F9']);
  });
});

describe('atlananOzeti', () => {
  it('sebebe göre gruplar ve okunur metin verir', () => {
    const ozet = atlananOzeti([
      { kod: 'A', sebep: 'derslik-bos' },
      { kod: 'B', sebep: 'derslik-bos' },
      { kod: 'C', sebep: 'saat-yok' },
    ]);
    expect(ozet).toHaveLength(2);
    expect(ozet[0].metin).toContain('2 ders yazılamadı');
    expect(ozet[0].metin).toContain('derslik atanmamış');
  });

  it('boş listede boş özet', () => {
    expect(atlananOzeti([])).toEqual([]);
    expect(atlananOzeti(null)).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════
// ŞABLON XML'İ — şablon yerinde düzenlenir, yeniden üretilmez.
// ══════════════════════════════════════════════════════════════
describe('paylasilanMetinler', () => {
  it('paylaşılan metinleri sırayla okur ve entity çözer', () => {
    const xml =
      '<sst><si><t>Gün</t></si><si><t>A &amp; B</t></si><si><r><t>Bil</t></r><r><t>gisayar</t></r></si></sst>';
    expect(paylasilanMetinler(xml)).toEqual(['Gün', 'A & B', 'Bilgisayar']);
  });

  it('boş girdide boş dizi', () => {
    expect(paylasilanMetinler('')).toEqual([]);
    expect(paylasilanMetinler(null)).toEqual([]);
  });
});

describe('boyaliStiller', () => {
  const styles = `<styleSheet>
    <fills count="4">
      <fill><patternFill patternType="none"/></fill>
      <fill><patternFill patternType="gray125"/></fill>
      <fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/></patternFill></fill>
      <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill>
    </fills>
    <cellXfs count="4">
      <xf fillId="0"/><xf fillId="2"/><xf fillId="3"/><xf fillId="1"/>
    </cellXfs></styleSheet>`;

  it('yalnız SOLID ve beyaz olmayan dolgular boyalı sayılır', () => {
    const b = boyaliStiller(styles);
    expect(b.has(1)).toBe(true); // sarı
    expect(b.has(0)).toBe(false); // dolgusuz
    expect(b.has(2)).toBe(false); // beyaz — tablo geneli boyalı sayılmamalı
    expect(b.has(3)).toBe(false); // gray125 desen
  });

  it('bozuk/boş stil sayfasında çökmez', () => {
    expect(boyaliStiller('').size).toBe(0);
    expect(boyaliStiller(null).size).toBe(0);
  });
});

describe('sayfaHucreleri / birlesikAraliklar', () => {
  const sheet =
    '<worksheet><mergeCells><mergeCell ref="C8:C17"/><mergeCell ref="E6:Q6"/></mergeCells>' +
    '<sheetData><row r="7"><c r="C7" s="1" t="s"><v>0</v></c><c r="D7" s="1" t="s"><v>1</v></c>' +
    '<c r="E7" s="2" t="inlineStr"><is><t>M10Z04</t></is></c><c r="F7" s="3"/></row>' +
    '<row r="8"><c r="D8" s="0"><v>42</v></c></row></sheetData></worksheet>';

  it('paylaşılan, satır içi ve düz değerleri okur', () => {
    const h = sayfaHucreleri(sheet, ['{{Gün}}', '{{Ders Saati}}'], new Set([3]));
    expect(h.C7.metin).toBe('{{Gün}}');
    expect(h.E7.metin).toBe('M10Z04');
    expect(h.D8.metin).toBe('42');
    expect(h.F7.metin).toBe('');
  });

  it('boyalı biçim hücreye işlenir', () => {
    const h = sayfaHucreleri(sheet, ['{{Gün}}', '{{Ders Saati}}'], new Set([3]));
    expect(h.F7.boyali).toBe(true);
    expect(h.E7.boyali).toBe(false);
  });

  it('birleşik aralıklar okunur', () => {
    expect(birlesikAraliklar(sheet)).toEqual(['C8:C17', 'E6:Q6']);
  });
});

describe('renkliStilEkle', () => {
  const styles =
    '<styleSheet><fills count="2"><fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill></fills>' +
    '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="1"/>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="2"/></cellXfs></styleSheet>';

  it('hücrenin KENDİ biçimini korur, yalnız dolgusunu değiştirir', () => {
    const { xml, harita } = renkliStilEkle(styles, [{ temelStil: 1, renk: '#5B9BD5' }]);
    const yeni = harita.get('1|FF5B9BD5');
    expect(yeni).toBe(2);
    // Kenarlık temel biçimden (borderId="2") devralınmalı.
    const xfler = xml.match(/<xf\b[^>]*\/>/g);
    expect(xfler[yeni]).toContain('borderId="2"');
    expect(xfler[yeni]).toContain('fillId="2"');
    expect(xml).toContain('count="3"');
  });

  it('aynı renk iki kez fill açmaz', () => {
    const { xml, harita } = renkliStilEkle(styles, [
      { temelStil: 0, renk: '#5B9BD5' },
      { temelStil: 1, renk: '#5B9BD5' },
    ]);
    expect(harita.size).toBe(2);
    expect((xml.match(/FF5B9BD5/g) || []).length).toBe(1);
  });

  it('geçersiz renk yok sayılır', () => {
    const { xml, harita } = renkliStilEkle(styles, [{ temelStil: 0, renk: 'mavi' }]);
    expect(harita.size).toBe(0);
    expect(xml).toBe(styles);
  });
});

describe('hucreleriYaz', () => {
  const sheet =
    '<sheetData><row r="9"><c r="D9" s="1" t="s"><v>0</v></c><c r="H9" s="2"/>' +
    '<c r="K9" s="2"/></row><row r="10"><c r="D10" s="1"/></row></sheetData>';

  it('var olan hücreyi değiştirir', () => {
    const out = hucreleriYaz(sheet, [{ ref: 'H9', deger: 'MAT242', stil: 5 }]);
    expect(out).toContain(
      '<c r="H9" s="5" t="inlineStr"><is><t xml:space="preserve">MAT242</t></is></c>'
    );
    expect(out).toContain('<c r="D9" s="1" t="s">'); // dokunulmadı
  });

  it('olmayan hücreyi SÜTUN SIRASINDA araya sokar', () => {
    const out = hucreleriYaz(sheet, [{ ref: 'F9', deger: 'X', stil: 5 }]);
    const sira = [...out.matchAll(/<c r="([A-Z]+)9"/g)].map((m) => m[1]);
    expect(sira).toEqual(['D', 'F', 'H', 'K']);
  });

  it('son sütuna eklenen hücre satırın sonuna gider', () => {
    const out = hucreleriYaz(sheet, [{ ref: 'Q9', deger: 'Z' }]);
    const sira = [...out.matchAll(/<c r="([A-Z]+)9"/g)].map((m) => m[1]);
    expect(sira).toEqual(['D', 'H', 'K', 'Q']);
  });

  it('XML kaçışı yapılır', () => {
    expect(hucreleriYaz(sheet, [{ ref: 'H9', deger: 'A & B <x>' }])).toContain(
      'A &amp; B &lt;x&gt;'
    );
  });

  it('olmayan satır sessizce atlanır', () => {
    expect(hucreleriYaz(sheet, [{ ref: 'H99', deger: 'X' }])).toBe(sheet);
  });
});

describe('kunyeDoldur', () => {
  const shared =
    '<sst><si><t>{{Gün}}</t></si><si><t>{{Ders Saati}}</t></si>' +
    '<si><t xml:space="preserve">{{Akademik Yıl}} {{Dönem}} Dönemi</t></si>' +
    '<si><t>{{Hazırlayan}}</t></si><si><t>Pazartesi</t></si></sst>';

  it('IZGARA İŞARETÇİLERİ başlık metnine döner (boş kalmaz)', () => {
    const out = kunyeDoldur(shared, {});
    expect(out).toContain('>Gün<');
    expect(out).toContain('>Ders Saati<');
  });

  it('künye değerleri yazılır; kasa ve boşluk farkı sorun değil', () => {
    const out = kunyeDoldur(shared, { 'akademik  yıl': '2026-27', DÖNEM: 'Güz' });
    expect(out).toContain('2026-27 Güz Dönemi');
  });

  it('Türkçe İ/I ayrımı korunur — "yil" ile "yıl" AYNI alan değildir', () => {
    // Sadeleştirme kasayı siler ama harfi değiştirmez; yoksa birbirine
    // benzeyen iki ayrı alan sessizce karışırdı.
    const out = kunyeDoldur(shared, { 'akademik yil': '2026-27' });
    expect(out).not.toContain('2026-27');
  });

  it('karşılığı olmayan yer tutucu SİLİNİR', () => {
    expect(kunyeDoldur(shared, {})).not.toContain('{{Hazırlayan}}');
  });

  it('yer tutucusuz metne dokunulmaz', () => {
    expect(kunyeDoldur(shared, {})).toContain('<t>Pazartesi</t>');
  });
});
