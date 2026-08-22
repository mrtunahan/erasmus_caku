// Tanıtım sayfası slaytları.
//
// Slaytları iki ayrı okuyucu kullanır: tanıtım sayfası (saf HTML, anonim)
// ve uygulamadaki yönetim ekranı. Sıralama ve görünürlük kuralı ikisinde
// ayrı yazılsaydı yetkilinin gördüğü sıra ile ziyaretçininki ayrışırdı.
import { describe, it, expect } from 'vitest';
import {
  gorselAdiGuvenliMi,
  gorselUrl,
  slaytNormalize,
  yayindakiSlaytlar,
  sonrakiSira,
} from '../lib/tanitim-slayt.js';

describe('gorselAdiGuvenliMi', () => {
  it('düz resim adı geçerlidir', () => {
    expect(gorselAdiGuvenliMi('kampus.jpg')).toBe(true);
    expect(gorselAdiGuvenliMi('1771509368492-foto.webp')).toBe(true);
  });

  it('DİZİN ÇIKIŞI denemesi reddedilir', () => {
    // Ad kullanıcı girdisidir ve dosya yoluna çevrilir.
    expect(gorselAdiGuvenliMi('../../etc/passwd')).toBe(false);
    expect(gorselAdiGuvenliMi('alt/dizin.jpg')).toBe(false);
    expect(gorselAdiGuvenliMi('alt\\dizin.jpg')).toBe(false);
    expect(gorselAdiGuvenliMi('..jpg.png')).toBe(false);
  });

  it('izinsiz uzantı reddedilir', () => {
    expect(gorselAdiGuvenliMi('betik.svg')).toBe(false); // SVG script taşıyabilir
    expect(gorselAdiGuvenliMi('belge.pdf')).toBe(false);
    expect(gorselAdiGuvenliMi('kabuk.sh')).toBe(false);
    expect(gorselAdiGuvenliMi('uzantisiz')).toBe(false);
  });

  it('boş, çok uzun ve bozuk girdi reddedilir', () => {
    expect(gorselAdiGuvenliMi('')).toBe(false);
    expect(gorselAdiGuvenliMi('   ')).toBe(false);
    expect(gorselAdiGuvenliMi(null)).toBe(false);
    expect(gorselAdiGuvenliMi('a'.repeat(200) + '.jpg')).toBe(false);
  });
});

describe('gorselUrl', () => {
  it('güvenli ad için anonim uç adresi üretir', () => {
    expect(gorselUrl('kampus.jpg')).toBe('/api/tanitim/gorsel/kampus.jpg');
  });

  it('boşluklu ad kodlanır', () => {
    expect(gorselUrl('yaz okulu.png')).toBe('/api/tanitim/gorsel/yaz%20okulu.png');
  });

  it('güvensiz ad için BOŞ döner — yarım yol üretilmez', () => {
    expect(gorselUrl('../gizli.jpg')).toBe('');
    expect(gorselUrl('')).toBe('');
  });
});

describe('slaytNormalize', () => {
  it('alanları düzenler', () => {
    expect(
      slaytNormalize({ id: 's1', baslik: '  Erasmus  ', metin: 'Açıklama', sira: '3' })
    ).toEqual({
      id: 's1',
      baslik: 'Erasmus',
      metin: 'Açıklama',
      gorsel: '',
      sira: 3,
      yayinda: true,
    });
  });

  it('yayinda alanı YOKSA yayında sayılır', () => {
    // Yetkili slayt ekleyip "neden görünmüyor" dememeli.
    expect(slaytNormalize({ baslik: 'x' }).yayinda).toBe(true);
    expect(slaytNormalize({ baslik: 'x', yayinda: false }).yayinda).toBe(false);
  });

  it('güvensiz görsel adı düşürülür, slayt kalır', () => {
    const s = slaytNormalize({ baslik: 'x', gorsel: '../../gizli.jpg' });
    expect(s.gorsel).toBe('');
    expect(s.baslik).toBe('x');
  });

  it('sayı olmayan sıra sıfırdır', () => {
    expect(slaytNormalize({ sira: 'abc' }).sira).toBe(0);
    expect(slaytNormalize(null).sira).toBe(0);
  });
});

describe('yayindakiSlaytlar', () => {
  const kayitlar = [
    { id: 'c', baslik: 'Üçüncü', sira: 3 },
    { id: 'a', baslik: 'Birinci', sira: 1 },
    { id: 'gizli', baslik: 'Taslak', sira: 2, yayinda: false },
    { id: 'b', baslik: 'İkinci', sira: 2 },
  ];

  it('yayında olanlar sıraya göre gelir', () => {
    expect(yayindakiSlaytlar(kayitlar).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('yayında olmayan gizlenir', () => {
    expect(yayindakiSlaytlar(kayitlar).some((s) => s.id === 'gizli')).toBe(false);
  });

  it('AYNI sırada kararlı dizilim — her yenilemede değişmez', () => {
    const esit = [
      { id: 'z', baslik: 'Z', sira: 1 },
      { id: 'a', baslik: 'A', sira: 1 },
    ];
    expect(yayindakiSlaytlar(esit).map((s) => s.id)).toEqual(['a', 'z']);
    expect(yayindakiSlaytlar([...esit].reverse()).map((s) => s.id)).toEqual(['a', 'z']);
  });

  it('tamamen boş slayt elenir', () => {
    expect(yayindakiSlaytlar([{ id: 'bos', sira: 1 }])).toEqual([]);
  });

  it('yalnız görseli olan slayt gösterilir', () => {
    expect(yayindakiSlaytlar([{ id: 'g', gorsel: 'a.jpg' }])).toHaveLength(1);
  });

  it('boş girdide çökmez', () => {
    expect(yayindakiSlaytlar(null)).toEqual([]);
  });
});

describe('sonrakiSira', () => {
  it('en büyüğün bir fazlası', () => {
    expect(sonrakiSira([{ sira: 1 }, { sira: 7 }, { sira: 3 }])).toBe(8);
  });

  it('yayında olmayan slayt da sırayı ilerletir', () => {
    // Gizli slaytın sırasını yeniden vermek, gizli açıldığında çakışırdı.
    expect(sonrakiSira([{ sira: 5, yayinda: false }])).toBe(6);
  });

  it('boş listede 1', () => {
    expect(sonrakiSira([])).toBe(1);
    expect(sonrakiSira(null)).toBe(1);
  });
});
