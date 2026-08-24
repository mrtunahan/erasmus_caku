import { describe, it, expect } from 'vitest';
import {
  addanTahmin,
  komisyonModulleri,
  uyeMi,
  erisilebilirModuller,
  modulleriTemizle,
} from '../lib/komisyon-modul.js';

const MODULLER = [
  { id: 'erasmus' },
  { id: 'staj' },
  { id: 'muafiyet' },
  { id: 'sinav' },
  { id: 'dersprogrami' },
  { id: 'yataygecis' },
  { id: 'akreditasyon' },
];

describe('addanTahmin (eski kayıt yedeği)', () => {
  it('bilinen kelimeleri tanır', () => {
    expect(addanTahmin('Erasmus Komisyonu')).toEqual(['erasmus']);
    expect(addanTahmin('Staj Komisyonu')).toEqual(['staj']);
    expect(addanTahmin('Muafiyet ve İntibak Komisyonu')).toEqual(['muafiyet']);
  });

  it('bir komisyon BİRDEN ÇOK modül açabilir', () => {
    // Eski kural ilk eşleşende duruyordu: "Ders Programı ve Sınav Komisyonu"
    // yalnız Sınav'ı açıyor, Ders Programı'nı açmıyordu.
    expect(addanTahmin('Ders Programı ve Sınav Komisyonu').sort()).toEqual([
      'dersprogrami',
      'sinav',
    ]);
  });

  it('Türkçe büyük harfte de tanır', () => {
    expect(addanTahmin('SINAV KOMİSYONU')).toEqual(['sinav']);
    expect(addanTahmin('ERASMUS KOMİSYONU')).toEqual(['erasmus']);
  });

  it('tanımadığı adda boş döner', () => {
    expect(addanTahmin('Akreditasyon Komisyonu')).toEqual([]);
    expect(addanTahmin('')).toEqual([]);
    expect(addanTahmin(null)).toEqual([]);
  });
});

describe('komisyonModulleri', () => {
  it('açık seçim varsa ad tahminini EZER', () => {
    const k = { name: 'Erasmus Komisyonu', modules: ['yataygecis'] };
    expect(komisyonModulleri(k)).toEqual(['yataygecis']);
  });

  it('boş seçim de bir karardır — ad tahminine düşmez', () => {
    // "Bu komisyon modül açmasın" demek mümkün olmalı.
    expect(komisyonModulleri({ name: 'Erasmus Komisyonu', modules: [] })).toEqual([]);
  });

  it('alan hiç yoksa (eski kayıt) ad tahmini devreye girer', () => {
    expect(komisyonModulleri({ name: 'Staj Komisyonu' })).toEqual(['staj']);
  });

  it('boş girdide çökmez', () => {
    expect(komisyonModulleri(null)).toEqual([]);
    expect(komisyonModulleri({})).toEqual([]);
  });
});

describe('uyeMi — Türkçe ad eşleşmesi', () => {
  const kom = {
    name: 'Erasmus Komisyonu',
    members: [{ name: 'A. Tunahan KORKMAZ' }, { name: 'İsmail Çınar' }],
  };

  it('birebir adı eşler', () => {
    expect(uyeMi(kom, 'A. Tunahan KORKMAZ')).toBe(true);
  });

  it('büyük/küçük harf farkını affeder — Türkçe İ ve I dahil', () => {
    // Eski kural locale'siz toLowerCase kullanıyordu: "İSMAİL" → "i̇smai̇l",
    // "İsmail" → "i̇smail"; eşleşmiyorlardı.
    expect(uyeMi(kom, 'İSMAİL ÇINAR')).toBe(true);
    expect(uyeMi(kom, 'ismail çınar')).toBe(true);
  });

  it('unvan eklenmiş adı eşler', () => {
    expect(uyeMi(kom, 'Arş. Gör. A. Tunahan KORKMAZ')).toBe(true);
    expect(uyeMi({ members: [{ name: 'Dr. Öğr. Üyesi Selim Sürücü' }] }, 'Selim SÜRÜCÜ')).toBe(
      true
    );
  });

  it('fazladan boşluğu affeder', () => {
    expect(uyeMi({ members: [{ name: 'Ayşe  Yılmaz' }] }, 'Ayşe Yılmaz')).toBe(true);
  });

  it('BAŞKA kişiyi üye saymaz', () => {
    expect(uyeMi(kom, 'Ali Veli')).toBe(false);
    expect(uyeMi(kom, 'Tunahan')).toBe(false);
  });

  it('adsız kullanıcı hiçbir komisyonun üyesi değildir', () => {
    // Boş anahtar boş üye adıyla eşleşseydi herkes her komisyona girerdi.
    expect(uyeMi({ members: [{ name: '' }] }, '')).toBe(false);
    expect(uyeMi(kom, null)).toBe(false);
  });

  it('üyesiz komisyonda false döner', () => {
    expect(uyeMi({ name: 'x' }, 'A. Tunahan KORKMAZ')).toBe(false);
  });
});

describe('erisilebilirModuller', () => {
  const komisyonlar = [
    { name: 'Erasmus Komisyonu', modules: ['erasmus'], members: [{ name: 'İsmail Çınar' }] },
    {
      name: 'Ders Programı ve Sınav Komisyonu',
      modules: ['dersprogrami', 'sinav'],
      members: [{ name: 'Arş. Gör. İsmail Çınar' }],
    },
    { name: 'Staj Komisyonu', modules: ['staj'], members: [{ name: 'Başkası' }] },
    // Eski kayıt: modules alanı yok.
    { name: 'Muafiyet Komisyonu', members: [{ name: 'İSMAİL ÇINAR' }] },
  ];

  it('üyesi olunan komisyonların modüllerini toplar', () => {
    expect(erisilebilirModuller(komisyonlar, 'İsmail Çınar').sort()).toEqual([
      'dersprogrami',
      'erasmus',
      'muafiyet',
      'sinav',
    ]);
  });

  it('üyesi olunmayan komisyonun modülünü vermez', () => {
    expect(erisilebilirModuller(komisyonlar, 'İsmail Çınar')).not.toContain('staj');
  });

  it('aynı modülü iki komisyon açsa da bir kez döner', () => {
    const ikili = [
      { modules: ['erasmus'], members: [{ name: 'Ali Veli' }] },
      { modules: ['erasmus'], members: [{ name: 'Ali Veli' }] },
    ];
    expect(erisilebilirModuller(ikili, 'Ali Veli')).toEqual(['erasmus']);
  });

  it('hiç üyelik yoksa boş döner', () => {
    expect(erisilebilirModuller(komisyonlar, 'Kimse Yok')).toEqual([]);
    expect(erisilebilirModuller([], 'İsmail Çınar')).toEqual([]);
    expect(erisilebilirModuller(null, 'İsmail Çınar')).toEqual([]);
  });
});

describe('modulleriTemizle', () => {
  it('tanımsız id eler', () => {
    expect(modulleriTemizle(['erasmus', 'yokboyle'], MODULLER)).toEqual(['erasmus']);
  });

  it('tekrarı ve boşluğu temizler', () => {
    expect(modulleriTemizle(['staj', 'staj', '', '  '], MODULLER)).toEqual(['staj']);
  });

  it('boş girdide boş dizi döner', () => {
    expect(modulleriTemizle(null, MODULLER)).toEqual([]);
    expect(modulleriTemizle(['erasmus'], null)).toEqual([]);
  });
});
