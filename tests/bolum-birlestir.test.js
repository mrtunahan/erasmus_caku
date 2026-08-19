// Gömülü çekirdek bölüm listesi ile DB bölümlerinin birleşmesi.
//
// Bu birleştirme üç canlı arızanın kaynağıydı: fakülte yetkilisinin anket
// ataması kimseye ulaşmıyor, fakülte şablonu çekirdek bölüme çözülmüyor,
// akademisyen kendi bölümünde görünmüyordu. Ortak sebep, aynı bölümün slug
// ve ObjectId kimliklerinin birbirine bağlanmamasıydı.
import { describe, it, expect } from 'vitest';
import {
  bolumleriBirlestir,
  dbKimlikleri,
  gomuluyuZenginlestir,
  adAnahtari,
} from '../lib/bolum-birlestir.js';

const gomuluListe = () => [
  {
    id: 'bilgisayar',
    name: 'Bilgisayar Mühendisliği',
    color: '#111',
    icon: 'M0',
    facultyId: 'muhendislik',
  },
  {
    id: 'makine',
    name: 'Makine Mühendisliği',
    color: '#222',
    icon: 'M1',
    facultyId: 'muhendislik',
  },
];

describe('dbKimlikleri', () => {
  it('sunucunun gönderdiği kimlikler alanını kullanır', () => {
    // Okuma projeksiyonu `_id`/`_docId`'yi siler; ObjectId biçimi İSTEMCİYE
    // yalnız bu alanla ulaşır.
    expect(dbKimlikleri({ id: 'bilgisayar', kimlikler: ['bilgisayar', '64aa01', 'BLM'] })).toEqual([
      'bilgisayar',
      '64aa01',
      'BLM',
    ]);
  });

  it('kimlikler alanı yoksa alanlardan toplar (eski sunucu sürümü)', () => {
    expect(dbKimlikleri({ id: '64aa01', _docId: 'bilgisayar', code: 'BLM' })).toEqual([
      '64aa01',
      'bilgisayar',
      'BLM',
    ]);
  });

  it('tekrarları eler, boş girdide çökmez', () => {
    expect(dbKimlikleri({ id: 'x', _docId: 'x', kimlikler: ['x'] })).toEqual(['x']);
    expect(dbKimlikleri(null)).toEqual([]);
  });
});

describe('gomuluyuZenginlestir', () => {
  it('DB kimliklerini ekler, gömülü slug kimliği KORUNUR', () => {
    const g = { id: 'bilgisayar', name: 'B', facultyId: 'muhendislik' };
    gomuluyuZenginlestir(g, { id: 'bilgisayar', kimlikler: ['bilgisayar', '64aa01'] });
    expect(g.kimlikler.sort()).toEqual(['64aa01', 'bilgisayar']);
    expect(g.id).toBe('bilgisayar');
  });

  it('fakülte DB’den yazılır — gömülü değer bir VARSAYIMDI', () => {
    const g = { id: 'bilgisayar', name: 'B', facultyId: 'muhendislik' };
    gomuluyuZenginlestir(g, { id: 'bilgisayar', facultyId: '64ff90' });
    expect(g.facultyId).toBe('64ff90');
  });

  it('DB fakültesi boşsa mevcut değer silinmez', () => {
    const g = { id: 'bilgisayar', name: 'B', facultyId: 'muhendislik' };
    gomuluyuZenginlestir(g, { id: 'bilgisayar' });
    expect(g.facultyId).toBe('muhendislik');
  });
});

describe('bolumleriBirlestir', () => {
  it('KİMLİĞİ AYNI OLAN çekirdek bölüm de zenginleşir — asıl arıza buydu', () => {
    // DB'nin `_docId`'si slug olduğu için gelen `id` gömülü kimlikle aynı
    // çıkar. Eskiden döngü burada çıkıyor, ObjectId biçimi hiç eklenmiyordu.
    const liste = gomuluListe();
    const { eklenen, zenginlesen } = bolumleriBirlestir(liste, [
      {
        id: 'bilgisayar',
        name: 'Bilgisayar Mühendisliği',
        facultyId: '64ff90',
        kimlikler: ['bilgisayar', '6a2d523a21e2b85be1c7a004'],
      },
    ]);
    expect(eklenen).toBe(0);
    expect(zenginlesen).toBe(1);
    expect(liste[0].kimlikler).toContain('6a2d523a21e2b85be1c7a004');
    expect(liste[0].facultyId).toBe('64ff90');
    expect(liste).toHaveLength(2);
  });

  it('aynı adlı DB kaydı MÜKERRER satır açmaz, gömülüyü zenginleştirir', () => {
    const liste = gomuluListe();
    bolumleriBirlestir(liste, [{ id: '64aa02', name: 'Makine Mühendisliği', facultyId: '64ff90' }]);
    expect(liste).toHaveLength(2);
    expect(liste[1].kimlikler).toContain('64aa02');
    expect(liste[1].kimlikler).toContain('makine');
  });

  it('gömülüde olmayan bölüm listeye EKLENİR', () => {
    const liste = gomuluListe();
    const { eklenen } = bolumleriBirlestir(liste, [
      { id: '64aa03', name: 'Gıda Mühendisliği', facultyId: '64ff90', code: 'GDA' },
    ]);
    expect(eklenen).toBe(1);
    expect(liste).toHaveLength(3);
    expect(liste[2].kimlikler.sort()).toEqual(['64aa03', 'GDA'].sort());
    expect(liste[2].color).toBeTruthy(); // renk/ikon varsayılanı verilir
    expect(liste[2].icon).toBeTruthy();
  });

  it('İDEMPOTENT: iki kez çağırmak listeyi büyütmez, kimlikleri çoğaltmaz', () => {
    const liste = gomuluListe();
    const db = [
      { id: 'bilgisayar', name: 'Bilgisayar Mühendisliği', kimlikler: ['bilgisayar', '64aa01'] },
      { id: '64aa03', name: 'Gıda Mühendisliği' },
    ];
    bolumleriBirlestir(liste, db);
    bolumleriBirlestir(liste, db);
    expect(liste).toHaveLength(3);
    expect(liste[0].kimlikler.sort()).toEqual(['64aa01', 'bilgisayar']);
  });

  it('ikinci turda ObjectId ile gelen kayıt KİMLİKLERDEN bulunur', () => {
    // Gömülü kaydın id'si slug; DB ikinci okumada ObjectId'yi id olarak
    // gönderirse ad eşleşmesine güvenmeden kimlik üzerinden bulunmalı.
    const liste = gomuluListe();
    bolumleriBirlestir(liste, [
      { id: 'bilgisayar', name: 'Bilgisayar Mühendisliği', kimlikler: ['bilgisayar', '64aa01'] },
    ]);
    bolumleriBirlestir(liste, [{ id: '64aa01', name: 'BİLGİSAYAR MÜH. (yeniden adlandırıldı)' }]);
    expect(liste).toHaveLength(2);
  });

  it('kimliksiz ve boş girdiler yok sayılır', () => {
    const liste = gomuluListe();
    expect(bolumleriBirlestir(liste, [null, {}, { name: 'Kimliksiz' }])).toEqual({
      eklenen: 0,
      zenginlesen: 0,
    });
    expect(liste).toHaveLength(2);
    expect(bolumleriBirlestir(null, null)).toEqual({ eklenen: 0, zenginlesen: 0 });
  });
});

describe('adAnahtari', () => {
  it('Türkçe büyük/küçük harf ve boşluk farkını yutar', () => {
    expect(adAnahtari('GIDA  MÜHENDİSLİĞİ')).toBe(adAnahtari('Gıda Mühendisliği'));
  });
});
