// ══════════════════════════════════════════════════════════════
// SUNUCU KURAL DOSYALARININ TESTSİZ KALANLARI
//
// Sistem kontrol raporunun 12. bulgusu: karar veren kod testsiz kalınca
// değişiklikte sessizce bozuluyor. Aşağıdakiler YETKİ ve KAPSAM kararı
// veriyor — yani bozulduklarında hata vermez, yanlış kişiye veri gösterirler.
// ══════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { kapsamNumaralari, bagliNolar, numara } from '../server/lib/ogrenci-baglanti.js';
import { duyuruyaDokunabilir, anahtar } from '../server/lib/duyuru-sahip.js';
import { asciiIndirge, urlToRelPath } from '../server/lib/dosya-adres.js';
import {
  memurBelgeleriniSuz,
  memurunBelgesiMi,
  memurBolumModulleri,
} from '../server/lib/memur-kapsam.js';
import { bolumKisaAd } from '../lib/bolum-ad.js';

describe('ÇAP bağlı numaraları (okuma kapsamı)', () => {
  const kayitlar = [
    { studentNumber: '2021001', bagliOgrenciNolar: ['2021555'] },
    { studentNumber: '2021555', bagliOgrenciNolar: ['2021001'] },
    { studentNumber: '2021002' },
  ];

  it('kendi numarası her zaman kapsamdadır', () => {
    expect(kapsamNumaralari(kayitlar, '2021002')).toEqual(['2021002']);
    expect(kapsamNumaralari([], '2021002')).toEqual(['2021002']);
  });

  it('bağlı ikinci program da kapsama girer', () => {
    expect(kapsamNumaralari(kayitlar, '2021001').sort()).toEqual(['2021001', '2021555']);
    expect(kapsamNumaralari(kayitlar, '2021555').sort()).toEqual(['2021001', '2021555']);
  });

  it('tek yönlü kalmış eski bağ da izlenir', () => {
    const tekYon = [{ studentNumber: '2021001', bagliOgrenciNolar: ['2021777'] }];
    expect(kapsamNumaralari(tekYon, '2021777').sort()).toEqual(['2021001', '2021777']);
  });

  it('numarasız istek boş kapsam döner (kimsenin verisi açılmaz)', () => {
    expect(kapsamNumaralari(kayitlar, '')).toEqual([]);
  });

  it('kendi numarası bağlı listesinde tekrarlanmaz', () => {
    expect(bagliNolar({ studentNumber: '1', bagliOgrenciNolar: ['1', '2', '2'] })).toEqual(['2']);
    expect(numara({ ogrenciNo: '2021001' })).toBe('2021001');
  });
});

describe('duyuru sahipliği', () => {
  const uniAdmin = { uniAdmin: true };
  const yok = {};

  it('yazan kendi duyurusuna dokunur', () => {
    const d = { olusturanId: 'Dr. Mehmet Demir' };
    expect(duyuruyaDokunabilir(d, { identifier: 'Dr. Mehmet Demir' }, yok)).toBe(true);
  });

  it('Türkçe harf farkı sahipliği bozmaz', () => {
    const d = { olusturanId: 'İbrahim Öztürk' };
    expect(duyuruyaDokunabilir(d, { identifier: 'İBRAHİM ÖZTÜRK' }, yok)).toBe(true);
  });

  it('başkası dokunamaz — kapsam yetkisi bile yetmez', () => {
    const d = { olusturanId: 'Dr. Mehmet Demir' };
    expect(duyuruyaDokunabilir(d, { identifier: 'Başka Hoca' }, uniAdmin)).toBe(false);
  });

  it('sahipsiz eski kaydı yalnız üniversite yetkilisi devralır', () => {
    expect(duyuruyaDokunabilir({}, { identifier: 'Bir Hoca' }, yok)).toBe(false);
    expect(duyuruyaDokunabilir({}, { identifier: 'Bir Hoca' }, uniAdmin)).toBe(true);
  });

  it('yeni kayıt serbesttir (sahiplik damgası yazılacak)', () => {
    expect(duyuruyaDokunabilir(null, { identifier: 'x' }, yok)).toBe(true);
  });

  it('anahtar Türkçe harfleri katlar', () => {
    expect(anahtar('Şükrü ÇAĞLAR')).toBe(anahtar('şükrü çağlar'));
  });
});

describe('memur belge kapsamı', () => {
  const memur = { memurId: 'm1', name: 'Ayşe Memur', facultyId: 'muhendislik' };
  const atamalar = [{ memurId: 'm1', departmentId: 'bilgisayar', modules: ['muafiyet'] }];

  it('atandığı bölümün ve modülün belgesini görür', () => {
    const belge = {
      module: 'muafiyet',
      departmentId: 'bilgisayar',
      facultyId: 'muhendislik',
      gonderimler: [{ hedefRol: 'memur', kapsamId: 'bilgisayar' }],
    };
    expect(memurunBelgesiMi(belge, memur, atamalar)).toBe(true);
  });

  it('başka bölümün belgesini görmez', () => {
    const belge = {
      module: 'muafiyet',
      departmentId: 'orman',
      facultyId: 'muhendislik',
      gonderimler: [{ hedefRol: 'memur', kapsamId: 'orman' }],
    };
    expect(memurunBelgesiMi(belge, memur, atamalar)).toBe(false);
  });

  it('atanmadığı modülü görmez', () => {
    const belge = {
      module: 'staj',
      departmentId: 'bilgisayar',
      facultyId: 'muhendislik',
      gonderimler: [{ hedefRol: 'memur', kapsamId: 'bilgisayar' }],
    };
    expect(memurunBelgesiMi(belge, memur, atamalar)).toBe(false);
  });

  it('gönderilmemiş belge görünmez', () => {
    const belge = { module: 'muafiyet', departmentId: 'bilgisayar', facultyId: 'muhendislik' };
    expect(memurunBelgesiMi(belge, memur, atamalar)).toBe(false);
  });

  it('liste süzgeci aynı kararı uygular', () => {
    const belgeler = [
      {
        module: 'muafiyet',
        departmentId: 'bilgisayar',
        gonderimler: [{ hedefRol: 'memur', kapsamId: 'bilgisayar' }],
      },
      {
        module: 'muafiyet',
        departmentId: 'orman',
        gonderimler: [{ hedefRol: 'memur', kapsamId: 'orman' }],
      },
    ];
    expect(memurBelgeleriniSuz(belgeler, memur, atamalar)).toHaveLength(1);
  });

  it('bölüm modülleri atamadan çözülür', () => {
    expect(memurBolumModulleri(atamalar, 'bilgisayar', memur)).toEqual(['muafiyet']);
    expect(memurBolumModulleri(atamalar, 'orman', memur)).toEqual([]);
  });
});

describe('dosya adresi dönüşümleri', () => {
  it('Türkçe harfler dosya adında ASCII olur', () => {
    expect(asciiIndirge('Öğrenci Belgesi.pdf')).toBe('Ogrenci Belgesi.pdf');
    expect(asciiIndirge('ŞIĞIT.docx')).toBe('SIGIT.docx');
  });

  it('indirme adresi göreli yola çevrilir', () => {
    expect(urlToRelPath('/api/files/download/staj_belgeler/2021001/a.pdf')).toBe(
      'staj_belgeler/2021001/a.pdf'
    );
  });

  it('adres değilse dokunulmaz', () => {
    expect(urlToRelPath('')).toBe('');
  });
});

describe('bölüm adı eki', () => {
  it('şablondaki tekrar önlenir', () => {
    expect(bolumKisaAd('Bilgisayar Mühendisliği Bölümü')).toBe('Bilgisayar');
    expect(bolumKisaAd('Gıda MÜHENDİSLİĞİ')).toBe('Gıda');
  });

  it('eki olmayan ad aynen kalır', () => {
    expect(bolumKisaAd('Moleküler Biyoloji ve Genetik')).toBe('Moleküler Biyoloji ve Genetik');
  });

  it('boş girdi patlamaz', () => {
    expect(bolumKisaAd('')).toBe('');
    expect(bolumKisaAd(null)).toBe('');
  });
});
