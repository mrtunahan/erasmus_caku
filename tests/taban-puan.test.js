// Taban puan: program eşleştirme + karşılaştırma.
//
// Bu iki işlev bir başvurunun "şartı karşılıyor mu" sorusunu cevaplıyor.
// Yanlış program eşleşmesi ya da yanlış sayı okuma, doğrudan bir öğrencinin
// haksız yere elenmesi demek — bu yüzden özellikle Türkçe harfler, kısaltmalar
// ve eksik veri yolları test altında.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { programAnahtari, tabanKaydiBul, tabanKarsilastir } from '../lib/taban-puan.js';

const require = createRequire(import.meta.url);
const cx = require('../server/services/claude-extract.js');

describe('programAnahtari', () => {
  it('Türkçe büyük harf yazımını da aynı anahtara indirir', () => {
    // JS'in toLowerCase'i "GIDA"yı "gida" yapar ama "Gıda"yı "gıda" bırakır;
    // Türkçe duyarlı olmayan bir küçültme bu ikisini AYRI sayardı.
    expect(programAnahtari('GIDA MÜHENDİSLİĞİ')).toBe(programAnahtari('Gıda Mühendisliği'));
    expect(programAnahtari('İNŞAAT MÜHENDİSLİĞİ')).toBe(programAnahtari('İnşaat Mühendisliği'));
  });

  it('"Bölümü" / "Programı" eklerini atar', () => {
    expect(programAnahtari('Gıda Mühendisliği Bölümü')).toBe(programAnahtari('Gıda Mühendisliği'));
    expect(programAnahtari('Makine Mühendisliği Programı')).toBe(
      programAnahtari('Makine Mühendisliği')
    );
  });

  it('noktalama ve boşluk farkını yok sayar', () => {
    expect(programAnahtari('Gıda  Müh.')).toBe(programAnahtari('gıda müh'));
  });

  it('boş girdide boş anahtar üretir', () => {
    expect(programAnahtari('')).toBe('');
    expect(programAnahtari(null)).toBe('');
  });
});

describe('tabanKaydiBul', () => {
  const kayitlar = [
    { id: '1', ad: 'GIDA MÜHENDİSLİĞİ', taban: '245,318' },
    { id: '2', ad: 'İNŞAAT MÜHENDİSLİĞİ', taban: '260,112' },
    { id: '3', ad: 'Bilgisayar Mühendisliği', taban: '312,004' },
  ];

  it('birebir eşleşmeyi bulur (yazım farkına rağmen)', () => {
    expect(tabanKaydiBul(kayitlar, 'Gıda Mühendisliği Bölümü').id).toBe('1');
    expect(tabanKaydiBul(kayitlar, 'inşaat mühendisliği').id).toBe('2');
  });

  it('kısaltmayı kapsama ile eşleştirir', () => {
    expect(tabanKaydiBul([{ id: '9', ad: 'Gıda Müh.', taban: '1' }], 'Gıda Mühendisliği').id).toBe(
      '9'
    );
  });

  it('kapsama BİRDEN ÇOK adaya uyuyorsa hiçbirini seçmez', () => {
    // "Makine" hem "Makine Mühendisliği" hem "Makine ve İmalat" içinde geçer.
    // Yanlış eşleşme = yanlış taban puanla değerlendirme; belirsizlikte
    // eşleştirme yapılmaz.
    const iki = [
      { id: 'a', ad: 'Makine Mühendisliği', taban: '1' },
      { id: 'b', ad: 'Makine ve İmalat Mühendisliği', taban: '2' },
    ];
    expect(tabanKaydiBul(iki, 'Makine')).toBe(null);
  });

  it('bulunamayanda null döner', () => {
    expect(tabanKaydiBul(kayitlar, 'Tarih')).toBe(null);
    expect(tabanKaydiBul(kayitlar, '')).toBe(null);
    expect(tabanKaydiBul(null, 'Gıda Mühendisliği')).toBe(null);
  });
});

describe('tabanKarsilastir', () => {
  it('yüksek puanı uygun sayar', () => {
    expect(tabanKarsilastir('260,5', '245,318').durum).toBe('uygun');
  });

  it('EŞİT puan şartı KARŞILAR', () => {
    // Yönetmelikteki ifade "taban puandan az olmamak" — sınırdaki aday elenmez.
    expect(tabanKarsilastir('245,318', '245,318').durum).toBe('uygun');
    expect(tabanKarsilastir('245.318', '245,318').durum).toBe('uygun');
  });

  it('düşük puanı uygun saymaz', () => {
    const k = tabanKarsilastir('240', '245,318');
    expect(k.durum).toBe('uygun_degil');
    expect(k.fark).toBeCloseTo(-5.318, 3);
  });

  it('eksik veride BELİRSİZ döner — sıfır varsaymaz', () => {
    // Puanı okunamayan adayı "0 puanlı" saymak, başvuruyu sessizce elemek olurdu.
    expect(tabanKarsilastir('', '245').durum).toBe('belirsiz');
    expect(tabanKarsilastir('245', '').durum).toBe('belirsiz');
    expect(tabanKarsilastir('abc', '245').durum).toBe('belirsiz');
    expect(tabanKarsilastir(null, null).durum).toBe('belirsiz');
  });

  it('kayan nokta gürültüsü sınırda karar değiştirmez', () => {
    // 0,1 + 0,2 aritmetiği üç haneli puanlarda 1e-13 mertebesinde artık bırakır.
    expect(tabanKarsilastir('412,3', '412,30000000000005').durum).toBe('uygun');
  });
});

// ── Sunucu tarafı: adres doğrulama ve alan adı kısıtı ──
// Getirilen sayfanın içeriği GÜVENİLMEZ metindir. allowed_domains kısıtı,
// sayfadaki "şu adrese git" yönlendirmesinin modeli kurum dışına
// çıkarmasını engelleyen tek koruma — kökü yanlış hesaplarsak ya çok geniş
// izin veririz ya da meşru PDF bağlantısı engellenir.
describe('alanAdiKoku', () => {
  it('iki etiketli kamu sonekinde 3 etiket bırakır', () => {
    expect(cx.alanAdiKoku('oidb.karatekin.edu.tr')).toBe('karatekin.edu.tr');
    expect(cx.alanAdiKoku('www.dosya.oidb.karatekin.edu.tr')).toBe('karatekin.edu.tr');
    expect(cx.alanAdiKoku('x.osym.gov.tr')).toBe('osym.gov.tr');
  });

  it('sıradan sonekte 2 etikete iner', () => {
    expect(cx.alanAdiKoku('docs.example.com')).toBe('example.com');
    expect(cx.alanAdiKoku('example.com')).toBe('example.com');
  });

  it('www önekini atar', () => {
    expect(cx.alanAdiKoku('www.example.com')).toBe('example.com');
  });

  it('IP adresini olduğu gibi bırakır', () => {
    expect(cx.alanAdiKoku('192.168.1.10')).toBe('192.168.1.10');
  });

  it('büyük harfli yazımı normalleştirir', () => {
    expect(cx.alanAdiKoku('OIDB.KARATEKIN.EDU.TR')).toBe('karatekin.edu.tr');
  });
});

describe('tabanUrlCoz', () => {
  it('geçerli adresi çözer ve kökünü verir', () => {
    const r = cx.tabanUrlCoz(
      'https://oidb.karatekin.edu.tr/tabantavan-puanlar-2907-sayfasi.karatekin'
    );
    expect(r.hata).toBeUndefined();
    expect(r.koku).toBe('karatekin.edu.tr');
  });

  it('http/https dışındaki şemayı reddeder', () => {
    // file:// ve javascript: gibi şemalar sunucuya hiç gitmemeli.
    expect(cx.tabanUrlCoz('file:///etc/passwd').hata).toBeTruthy();
    expect(cx.tabanUrlCoz('javascript:alert(1)').hata).toBeTruthy();
  });

  it('boş ve bozuk adresi reddeder', () => {
    expect(cx.tabanUrlCoz('').hata).toBeTruthy();
    expect(cx.tabanUrlCoz('şu sayfaya bak').hata).toBeTruthy();
  });

  it('250 karakteri aşan adresi reddeder (API sınırı)', () => {
    const uzun = 'https://example.com/' + 'a'.repeat(260);
    expect(cx.tabanUrlCoz(uzun).hata).toMatch(/uzun/i);
  });
});
