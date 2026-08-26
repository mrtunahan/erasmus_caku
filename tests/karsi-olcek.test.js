import { describe, it, expect } from 'vitest';
import {
  harfAnahtari,
  olcekNormalize,
  harfKatsayisi,
  katsayidanHarf,
  karsiHarfiCevir,
  olcekSorunlari,
  kurumAnahtari,
  kurumCekirdegi,
  kurumOlcegiBul,
  olcekAdlari,
  olcekKapsami,
} from '../lib/karsi-olcek.js';

// ÇAKÜ'nün resmî tablosu (ÇAKÜ Ders Notu Tablosu).
const CAKU = [
  { min: 90, max: 100, harf: 'A', katsayi: '4.00' },
  { min: 85, max: 89, harf: 'B1', katsayi: '3,50' },
  { min: 80, max: 84, harf: 'B2', katsayi: '3,25' },
  { min: 75, max: 79, harf: 'B3', katsayi: '3,00' },
  { min: 70, max: 74, harf: 'C1', katsayi: '2,50' },
  { min: 65, max: 69, harf: 'C2', katsayi: '2,25' },
  { min: 60, max: 64, harf: 'C3', katsayi: '2,00' },
  { min: 50, max: 59, harf: 'F1', katsayi: '1,50' },
  { min: 0, max: 49, harf: 'F2', katsayi: '0,00' },
];

// Yaygın AA/BA/BB ölçeği — çoğu üniversitede bu var.
const KARSI = [
  { harf: 'AA', katsayi: 4.0 },
  { harf: 'BA', katsayi: 3.5 },
  { harf: 'BB', katsayi: 3.0 },
  { harf: 'CB', katsayi: 2.5 },
  { harf: 'CC', katsayi: 2.0 },
  { harf: 'DC', katsayi: 1.5 },
  { harf: 'DD', katsayi: 1.0 },
  { harf: 'FF', katsayi: 0.0 },
];

describe('harfAnahtari', () => {
  it('boşluğu atar, büyük harfe çevirir', () => {
    expect(harfAnahtari(' b b ')).toBe('BB');
    expect(harfAnahtari('b1')).toBe('B1');
  });

  it('boş girdide boş döner', () => {
    expect(harfAnahtari(null)).toBe('');
  });
});

describe('olcekNormalize', () => {
  it('virgüllü katsayıyı sayıya çevirir', () => {
    const o = olcekNormalize(CAKU);
    expect(o.find((r) => r.harf === 'B1').katsayi).toBe(3.5);
    expect(o.find((r) => r.harf === 'B2').katsayi).toBe(3.25);
  });

  it('katsayıya göre azalan sıralar', () => {
    expect(olcekNormalize(CAKU).map((r) => r.harf)).toEqual([
      'A',
      'B1',
      'B2',
      'B3',
      'C1',
      'C2',
      'C3',
      'F1',
      'F2',
    ]);
  });

  it('harfsiz ya da katsayısız satırı düşürür', () => {
    const o = olcekNormalize([
      { harf: '', katsayi: 3 },
      { harf: 'X', katsayi: '' },
      { harf: 'A', katsayi: 4 },
    ]);
    expect(o.map((r) => r.harf)).toEqual(['A']);
  });

  it('boş girdide boş dizi döner', () => {
    expect(olcekNormalize(null)).toEqual([]);
  });
});

describe('harfKatsayisi', () => {
  it('harfin katsayısını verir', () => {
    expect(harfKatsayisi('B3', CAKU)).toBe(3.0);
    expect(harfKatsayisi('bb', KARSI)).toBe(3.0);
  });

  it('ölçekte olmayan harfte null döner', () => {
    expect(harfKatsayisi('BB', CAKU)).toBe(null);
    expect(harfKatsayisi('', CAKU)).toBe(null);
  });
});

describe('katsayidanHarf', () => {
  it('birebir katsayıyı tam eşler', () => {
    expect(katsayidanHarf(3.0, CAKU)).toEqual({ harf: 'B3', katsayi: 3.0, tam: true });
    expect(katsayidanHarf(4.0, CAKU)).toEqual({ harf: 'A', katsayi: 4.0, tam: true });
  });

  it('birebir yoksa AŞAĞI iner — not şişirilmez', () => {
    // 1.00 ÇAKÜ ölçeğinde yok; 1.50'ye çıkmak notu yükseltirdi.
    const r = katsayidanHarf(1.0, CAKU);
    expect(r.harf).toBe('F2');
    expect(r.katsayi).toBe(0);
    expect(r.tam).toBe(false);
  });

  it('ara katsayıda bir alttaki satıra iner', () => {
    expect(katsayidanHarf(3.4, CAKU)).toMatchObject({ harf: 'B2', katsayi: 3.25, tam: false });
  });

  it('boş ölçek ya da geçersiz katsayıda boş döner', () => {
    expect(katsayidanHarf(3, []).harf).toBe('');
    expect(katsayidanHarf('abc', CAKU).harf).toBe('');
  });
});

describe('karsiHarfiCevir', () => {
  it('BB → katsayı 3.00 → B3 (ÇAKÜ) — kullanıcının bildirdiği durum', () => {
    const r = karsiHarfiCevir('BB', KARSI, CAKU);
    expect(r.harf).toBe('B3');
    expect(r.karsiKatsayi).toBe(3.0);
    expect(r.katsayi).toBe(3.0);
    expect(r.tam).toBe(true);
    expect(r.sebep).toBe('');
  });

  it('AA → A, CC → C3, FF → F2', () => {
    expect(karsiHarfiCevir('AA', KARSI, CAKU).harf).toBe('A');
    expect(karsiHarfiCevir('CC', KARSI, CAKU).harf).toBe('C3');
    expect(karsiHarfiCevir('FF', KARSI, CAKU).harf).toBe('F2');
  });

  it('birebir karşılığı olmayan katsayıyı işaretler', () => {
    const r = karsiHarfiCevir('DD', KARSI, CAKU); // 1.00 → ÇAKÜ'de yok
    expect(r.harf).toBe('F2');
    expect(r.tam).toBe(false);
    expect(r.sebep).toContain('birebir yok');
  });

  it('karşı ölçek yüklenmemişse ÇEVİRMEZ ve nedenini söyler', () => {
    const r = karsiHarfiCevir('BB', [], CAKU);
    expect(r.harf).toBe('');
    expect(r.sebep).toContain('yüklenmemiş');
  });

  it('ÇAKÜ ölçeği yoksa çevirmez', () => {
    expect(karsiHarfiCevir('BB', KARSI, []).harf).toBe('');
  });

  it('harf karşı ölçekte yoksa çevirmez ve harfi söyler', () => {
    const r = karsiHarfiCevir('ZZ', KARSI, CAKU);
    expect(r.harf).toBe('');
    expect(r.sebep).toContain('ZZ');
  });

  it('harf okunamamışsa çevirmez', () => {
    expect(karsiHarfiCevir('', KARSI, CAKU).harf).toBe('');
  });
});

describe('olcekSorunlari', () => {
  it('sağlam ölçekte sorun bulmaz', () => {
    expect(olcekSorunlari(CAKU)).toEqual([]);
    expect(olcekSorunlari(KARSI)).toEqual([]);
  });

  it('aynı katsayıyı taşıyan iki harfi bildirir — çeviri belirsizleşir', () => {
    const s = olcekSorunlari([
      { harf: 'A', katsayi: 4 },
      { harf: 'A1', katsayi: 4 },
    ]);
    expect(s.join(' ')).toContain('aynı katsayıyı');
  });

  it('tekrarlanan harfi bildirir', () => {
    const s = olcekSorunlari([
      { harf: 'A', katsayi: 4 },
      { harf: 'A', katsayi: 3 },
    ]);
    expect(s.join(' ')).toContain('birden çok satırda');
  });

  it('0-4 dışındaki katsayıyı bildirir', () => {
    expect(olcekSorunlari([{ harf: 'A', katsayi: 5 }]).join(' ')).toContain('dışında');
  });

  it('boş ölçeği bildirir', () => {
    expect(olcekSorunlari([]).join(' ')).toContain('boş');
  });
});

describe('kurum eşleme', () => {
  const kayitlar = [
    { kurum: 'Düzce Üniversitesi', satirlar: KARSI },
    { kurum: 'Hacettepe Üniversitesi', satirlar: [] },
  ];
  const bul = (ad) => {
    const r = kurumOlcegiBul(ad, kayitlar);
    return r ? r.kurum : null;
  };

  it('yazım farkına takılmaz', () => {
    expect(kurumAnahtari('Düzce Üniversitesi')).toBe(kurumAnahtari('DÜZCE ÜNIVERSITESI'));
    expect(bul('düzce üniversitesi')).toBe('Düzce Üniversitesi');
  });

  it('genel sözcükler çekirdeği değiştirmez', () => {
    expect(kurumCekirdegi('T.C. Düzce Üniversitesi Rektörlüğü')).toBe('duzce');
    expect(kurumCekirdegi('DÜZCE ÜNİV.')).toBe('duzce');
  });

  it('ek sözcük taşıyan adları eşler', () => {
    // Kurum adı başvuruya elle ya da transkriptten geliyor; her seferinde
    // aynı biçimde yazılmıyor.
    expect(bul('T.C. Düzce Üniversitesi')).toBe('Düzce Üniversitesi');
    expect(bul('Düzce Üniversitesi Rektörlüğü')).toBe('Düzce Üniversitesi');
    expect(bul('Düzce Üniv.')).toBe('Düzce Üniversitesi');
  });

  it('tek harflik yazım hatasını affeder — bildirilen durum', () => {
    // Başvuruda "Düce Üniversitesi" yazıyordu; tablo yüklü olmasına rağmen
    // "yüklenmemiş" deniyordu.
    expect(bul('Düce Üniversitesi')).toBe('Düzce Üniversitesi');
  });

  it('benzeşen ama başka kurumları eşlemez', () => {
    expect(bul('Dicle Üniversitesi')).toBe(null);
    expect(bul('Ege Üniversitesi')).toBe(null);
    expect(bul('Boğaziçi')).toBe(null);
    expect(bul('')).toBe(null);
  });

  it('iki aday varsa TAHMİN ETMEZ', () => {
    // Yanlış ölçekle çevirmek öğrencinin transkriptine yanlış harf yazar.
    const ikiz = [{ kurum: 'Aydın Üniversitesi' }, { kurum: 'Aydin Üniversitesi' }];
    expect(kurumOlcegiBul('Aydın Üniv.', ikiz)).toBe(null);
  });

  it('benzer adlı iki kurumu ayırır', () => {
    const ist = [{ kurum: 'İstanbul Üniversitesi' }, { kurum: 'İstanbul Teknik Üniversitesi' }];
    expect(kurumOlcegiBul('İstanbul Teknik Üniversitesi', ist).kurum).toBe(
      'İstanbul Teknik Üniversitesi'
    );
    expect(kurumOlcegiBul('İstanbul Üniversitesi', ist).kurum).toBe('İstanbul Üniversitesi');
  });

  it('boş listede null döner', () => {
    expect(kurumOlcegiBul('Düzce Üniversitesi', [])).toBe(null);
    expect(kurumOlcegiBul('Düzce Üniversitesi', null)).toBe(null);
  });
});

// ══════════════════════════════════════════════════════════════
// ORTAK HAVUZ · TAKMA AD · BÖLÜM TERCİHİ
//
// Ölçek havuzu üniversite genelidir: bir bölümün eklediği tablodan hepsi
// yararlanır. Bölümün aynı kurum için KENDİ tablosu varsa o kazanır.
// ══════════════════════════════════════════════════════════════
describe('olcekAdlari / olcekKapsami', () => {
  it('kurum adı ve takma adların tamamını verir', () => {
    expect(
      olcekAdlari({ kurum: 'Bursa Uludağ Üniversitesi', takmaAdlar: ['Uludağ Üniversitesi', ''] })
    ).toEqual(['Bursa Uludağ Üniversitesi', 'Uludağ Üniversitesi']);
  });

  it('takma ad yoksa yalnız kurum adı', () => {
    expect(olcekAdlari({ kurum: 'Düzce Üniversitesi' })).toEqual(['Düzce Üniversitesi']);
    expect(olcekAdlari(null)).toEqual([]);
  });

  it('departmentId dolu ise bölüme özel, boşsa ortak', () => {
    expect(olcekKapsami({ departmentId: 'bilgisayar' })).toBe('bolum');
    expect(olcekKapsami({ departmentId: '' })).toBe('ortak');
    expect(olcekKapsami({})).toBe('ortak');
  });
});

describe('kurumOlcegiBul — takma adlar', () => {
  const kayitlar = [
    { id: 'a', kurum: 'Bursa Uludağ Üniversitesi', takmaAdlar: ['Uludağ Üniversitesi', 'B.U.Ü.'] },
    { id: 'b', kurum: 'Dicle Üniversitesi' },
  ];

  it('takma adla da bulunur', () => {
    expect(kurumOlcegiBul('Uludağ Üniversitesi', kayitlar).id).toBe('a');
    expect(kurumOlcegiBul('B.U.Ü.', kayitlar).id).toBe('a');
  });

  it('asıl ad hâlâ çalışır', () => {
    expect(kurumOlcegiBul('BURSA ULUDAĞ ÜNİVERSİTESİ', kayitlar).id).toBe('a');
  });

  it('ilgisiz kurum yine bulunmaz', () => {
    expect(kurumOlcegiBul('Boğaziçi Üniversitesi', kayitlar)).toBe(null);
  });
});

describe('kurumOlcegiBul — bölüm tercihi', () => {
  const ortak = { id: 'ortak', kurum: 'Düzce Üniversitesi', departmentId: '' };
  const bilgisayar = { id: 'bil', kurum: 'Düzce Üniversitesi', departmentId: 'bilgisayar' };
  const makine = { id: 'mak', kurum: 'Düzce Üniversitesi', departmentId: 'makine' };

  it('bölümün kendi tablosu ortak tablodan üstündür', () => {
    expect(
      kurumOlcegiBul('Düzce Üniversitesi', [ortak, bilgisayar], {
        departmentId: 'bilgisayar',
      }).id
    ).toBe('bil');
  });

  it('bölümün kendi tablosu yoksa ortak tablo kullanılır', () => {
    expect(
      kurumOlcegiBul('Düzce Üniversitesi', [ortak, makine], { departmentId: 'bilgisayar' }).id
    ).toBe('ortak');
  });

  it('bölüm verilmezse ortak tablo seçilir', () => {
    expect(kurumOlcegiBul('Düzce Üniversitesi', [ortak, bilgisayar]).id).toBe('ortak');
  });

  it('tek aday başka bölümün tablosu olsa da kullanılır — havuz ortaktır', () => {
    // Havuzun amacı bu: Makine bir kez ekler, Bilgisayar da yararlanır.
    // Kendi tablosu olmayan bölüme "tablo yüklenmemiş" demek, tabloyu ikinci
    // kez yazdırmaktan başka işe yaramazdı.
    expect(kurumOlcegiBul('Düzce Üniversitesi', [makine], { departmentId: 'bilgisayar' }).id).toBe(
      'mak'
    );
  });

  it('BAŞKA iki bölümün farklı tablosu varsa seçim yapılmaz', () => {
    // İki bölüm aynı kurum için farklı ölçek girmişse hangisinin geçerli
    // olduğu bilinmiyor; yanlış ölçekle çevirmektense çevirmemek gerekir.
    const fizik = { id: 'fiz', kurum: 'Düzce Üniversitesi', departmentId: 'fizik' };
    expect(
      kurumOlcegiBul('Düzce Üniversitesi', [makine, fizik], { departmentId: 'bilgisayar' })
    ).toBe(null);
  });

  it('aynı bölümde aynı kurum için iki kayıt varsa eşleşme yapılmaz', () => {
    const ikiz = { id: 'bil2', kurum: 'Düzce Üniversitesi', departmentId: 'bilgisayar' };
    expect(
      kurumOlcegiBul('Düzce Üniversitesi', [bilgisayar, ikiz], { departmentId: 'bilgisayar' })
    ).toBe(null);
  });

  it('iki ortak kayıt da belirsizdir', () => {
    const ortak2 = { id: 'ortak2', kurum: 'Düzce Üniversitesi', departmentId: '' };
    expect(kurumOlcegiBul('Düzce Üniversitesi', [ortak, ortak2])).toBe(null);
  });

  it('bölüm tercihi bulanık katmanlarda da geçerli', () => {
    // "T.C. Düzce Üniversitesi Rektörlüğü" iki kayda da içerme ile uyar;
    // karar yine bölümün kendi tablosudur.
    expect(
      kurumOlcegiBul('T.C. Düzce Üniversitesi Rektörlüğü', [ortak, bilgisayar], {
        departmentId: 'bilgisayar',
      }).id
    ).toBe('bil');
  });

  it('kurumsuz kayıt listeyi bozmaz', () => {
    expect(kurumOlcegiBul('Düzce Üniversitesi', [{ id: 'x' }, ortak]).id).toBe('ortak');
  });
});
