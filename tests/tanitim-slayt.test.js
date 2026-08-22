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
  gorselleriCoz,
  yayindakiSlaytlar,
  sonrakiSira,
  ONERILEN_MODULLER,
  modulKimligi,
  modulNormalize,
  yayindakiModuller,
  modulGecerliMi,
  modulSlaytlari,
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
      gorseller: [],
      gorsel: '',
      modul: '',
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

// ── ÇOKLU GÖRSEL ──
// Sağ sayfaya birden çok görsel konabiliyor. Eski kayıtlar tek alanla
// (`gorsel`) duruyor; ikisi de kabul edilir, veri taşınmadan ilerlenir.
describe('gorselleriCoz', () => {
  it('dizi olarak verilen görseller sırayla gelir', () => {
    expect(gorselleriCoz({ gorseller: ['a.jpg', 'b.png'] })).toEqual(['a.jpg', 'b.png']);
  });

  it('ESKİ tek alanlı kayıt hâlâ okunur', () => {
    expect(gorselleriCoz({ gorsel: 'eski.jpg' })).toEqual(['eski.jpg']);
  });

  it('ikisi bir arada: dizi önce, tekil sonra ve TEKRAR ETMEZ', () => {
    expect(gorselleriCoz({ gorseller: ['a.jpg'], gorsel: 'a.jpg' })).toEqual(['a.jpg']);
    expect(gorselleriCoz({ gorseller: ['a.jpg'], gorsel: 'b.jpg' })).toEqual(['a.jpg', 'b.jpg']);
  });

  it('güvensiz adlar dizinin içinden de elenir', () => {
    expect(gorselleriCoz({ gorseller: ['a.jpg', '../gizli.jpg', 'b.svg', 'c.png'] })).toEqual([
      'a.jpg',
      'c.png',
    ]);
  });

  it('boş girdide boş dizi', () => {
    expect(gorselleriCoz(null)).toEqual([]);
    expect(gorselleriCoz({})).toEqual([]);
  });
});

describe('slaytNormalize — çoklu görsel', () => {
  it('gorseller dizisi ve geriye uyumlu tekil alan birlikte döner', () => {
    const s = slaytNormalize({ gorseller: ['bir.jpg', 'iki.png'] });
    expect(s.gorseller).toEqual(['bir.jpg', 'iki.png']);
    expect(s.gorsel).toBe('bir.jpg');
  });

  it('yalnız çoklu görseli olan slayt gösterilir', () => {
    expect(yayindakiSlaytlar([{ id: 'g', gorseller: ['a.jpg', 'b.jpg'] }])).toHaveLength(1);
  });
});

// ══ MODÜLLER VERİDEN GELİR ══
// Sekmeler önce koda gömülüydü ve iki yerde duruyordu (lib + tanıtım
// sayfası); yeni sekme eklemek dağıtım gerektiriyor, iki liste ayrışırsa
// slayt sessizce kayboluyordu. Artık tek kaynak veritabanı.
describe('modulKimligi', () => {
  it('addan okunur bir anahtar türetir', () => {
    expect(modulKimligi('Staj')).toBe('staj');
    expect(modulKimligi('Ders Programı')).toBe('dersprogrami');
  });

  it('TÜRKÇE harfler ASCII karşılığına iner', () => {
    // Kimliği elle yazan biri 'ı' ile 'i'yi karıştırır; anahtar ayrışmasın.
    expect(modulKimligi('Yaz Okulu İntibak')).toBe('yazokuluintibak');
    expect(modulKimligi('ÇAP ve Yandal')).toBe('capveyandal');
    expect(modulKimligi('ÖĞRENCİ')).toBe('ogrenci');
  });

  it('noktalama ve boşluk düşer, uzunluk sınırlanır', () => {
    expect(modulKimligi('A-B_C (D)')).toBe('abcd');
    expect(modulKimligi('x'.repeat(60)).length).toBe(40);
  });

  it('boş girdide boş', () => {
    expect(modulKimligi('')).toBe('');
    expect(modulKimligi(null)).toBe('');
  });
});

describe('modulNormalize', () => {
  it('anahtar yoksa addan türetilir', () => {
    expect(modulNormalize({ ad: 'Staj' }).anahtar).toBe('staj');
  });

  it('kayıttaki anahtar korunur — ad değişse de slaytlar kopmasın', () => {
    // Yetkili modülün adını düzeltirse, ona bağlı slaytlar kaybolmamalı.
    const m = modulNormalize({ ad: 'Staj İşlemleri', anahtar: 'staj' });
    expect(m.anahtar).toBe('staj');
  });

  it('yayinda alanı yoksa yayında sayılır', () => {
    expect(modulNormalize({ ad: 'x' }).yayinda).toBe(true);
    expect(modulNormalize({ ad: 'x', yayinda: false }).yayinda).toBe(false);
  });
});

describe('yayindakiModuller', () => {
  const kayitlar = [
    { id: '1', ad: 'Staj', anahtar: 'staj', sira: 2 },
    { id: '2', ad: 'Anketler', anahtar: 'anket', sira: 1 },
    { id: '3', ad: 'Taslak', anahtar: 'taslak', sira: 0, yayinda: false },
    { id: '4', ad: '', anahtar: '', sira: 3 },
  ];

  it('yayında ve adı olanlar, sıraya göre', () => {
    expect(yayindakiModuller(kayitlar).map((m) => m.anahtar)).toEqual(['anket', 'staj']);
  });

  it('boş girdide çökmez', () => {
    expect(yayindakiModuller(null)).toEqual([]);
  });
});

describe('modulGecerliMi', () => {
  const moduller = [{ ad: 'Staj', anahtar: 'staj' }];

  it('tanımlı modülün anahtarı geçerli', () => {
    expect(modulGecerliMi('staj', moduller)).toBe(true);
  });

  it('tanımsız anahtar geçersiz — sabit listeye değil VERİYE bakar', () => {
    expect(modulGecerliMi('akreditasyon', moduller)).toBe(false);
    expect(modulGecerliMi('', moduller)).toBe(false);
    expect(modulGecerliMi('staj', [])).toBe(false);
  });
});

describe('modulSlaytlari', () => {
  const kayitlar = [
    { id: 'a', baslik: 'Staj 1', modul: 'staj', sira: 2 },
    { id: 'b', baslik: 'Staj 2', modul: 'staj', sira: 1 },
    { id: 'c', baslik: 'Anket', modul: 'anket', sira: 1 },
    { id: 'd', baslik: 'Gizli', modul: 'staj', sira: 3, yayinda: false },
    { id: 'e', baslik: 'Modülsüz', sira: 1 },
  ];

  it('yalnız o modülün yayındaki slaytları, sırayla', () => {
    expect(modulSlaytlari(kayitlar, 'staj').map((s) => s.id)).toEqual(['b', 'a']);
  });

  it('MODÜLSÜZ kayıt hiçbir sekmede görünmez', () => {
    expect(modulSlaytlari(kayitlar, '').map((s) => s.id)).toEqual([]);
    expect(modulSlaytlari(kayitlar, 'anket').map((s) => s.id)).toEqual(['c']);
  });
});

describe('ONERILEN_MODULLER', () => {
  it('öneri listesi tutarlı: kimlikler benzersiz ve addan türetilebilir', () => {
    const anahtarlar = ONERILEN_MODULLER.map((m) => m.id);
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length);
    ONERILEN_MODULLER.forEach((m) => {
      expect(m.ad).toBeTruthy();
      expect(m.id).toBeTruthy();
    });
  });
});
