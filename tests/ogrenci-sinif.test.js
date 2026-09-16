import { describe, it, expect } from 'vitest';
import {
  akademikYilBasi,
  girisYili,
  grupSinifi,
  nominalSinif,
  numaraRakamlari,
  ogrenciSinifi,
  sinifEtiketi,
  sinifGrubunaUyarMi,
  sinifSayisi,
  sinifTaramasi,
} from '../lib/ogrenci-sinif.js';

// 2026-2027 akademik yılı içindeyiz (eylül başlangıçlı).
const EYLUL26 = '2026-09-16T00:00:00Z';
const ayar = { tarih: EYLUL26, referansYil: 2026 };

describe('numaraRakamlari', () => {
  it('boşluk ve tireyi ayıklar', () => {
    expect(numaraRakamlari(' 2609 05037 ')).toBe('260905037');
    expect(numaraRakamlari('260905037-1')).toBe('2609050371');
  });

  it('boş girdide boş döner', () => {
    expect(numaraRakamlari(null)).toBe('');
  });
});

describe('girisYili', () => {
  it('ilk iki hane giriş yılıdır', () => {
    expect(girisYili('260905037', ayar)).toBe(2026);
    expect(girisYili('250905012', ayar)).toBe(2025);
    expect(girisYili('200905037', ayar)).toBe(2020);
  });

  it('gelecekteki bir yıl önceki yüzyıla düşer', () => {
    // 2026'da "99" 2099 olamaz → 1999
    expect(girisYili('990905001', ayar)).toBe(1999);
    expect(girisYili('270905001', ayar)).toBe(1927);
  });

  it('kısa numara çözülmez', () => {
    expect(girisYili('2609', ayar)).toBe(null);
    expect(girisYili('', ayar)).toBe(null);
    expect(girisYili(null, ayar)).toBe(null);
  });

  it('en az hane sayısı ayarlanabilir', () => {
    expect(girisYili('260905', { ...ayar, enAzHane: 6 })).toBe(2026);
  });

  it('sayı olarak verilen numara da çözülür', () => {
    expect(girisYili(260905037, ayar)).toBe(2026);
  });
});

describe('akademikYilBasi', () => {
  it('eylülden sonra o yıl, öncesinde bir önceki yıl', () => {
    expect(akademikYilBasi('2026-09-16T00:00:00Z')).toBe(2026);
    expect(akademikYilBasi('2026-03-05T00:00:00Z')).toBe(2025);
    expect(akademikYilBasi('2026-08-31T00:00:00Z')).toBe(2025);
  });
});

describe('nominalSinif', () => {
  it('kullanıcının verdiği örnek: 260 → 1. sınıf, 250 → 2. sınıf', () => {
    expect(nominalSinif('260905037', ayar).sinif).toBe(1);
    expect(nominalSinif('250905037', ayar).sinif).toBe(2);
    expect(nominalSinif('240905037', ayar).sinif).toBe(3);
    expect(nominalSinif('230905037', ayar).sinif).toBe(4);
  });

  it('program süresini aşan numara sınıfa değil "uzayan"a düşer', () => {
    const r = nominalSinif('200905037', ayar);
    expect(r.sinif).toBe(null);
    expect(r.durum).toBe('uzayan');
    expect(r.girisYili).toBe(2020);
  });

  it('program süresi verilince sınır değişir — tıp 6 yıl', () => {
    expect(nominalSinif('210905037', { ...ayar, programYili: 6 }).sinif).toBe(6);
    expect(nominalSinif('210905037', ayar).durum).toBe('uzayan');
  });

  it('ön lisans 2 yıllıktır', () => {
    expect(nominalSinif('250905037', { ...ayar, programYili: 2 }).sinif).toBe(2);
    expect(nominalSinif('240905037', { ...ayar, programYili: 2 }).durum).toBe('uzayan');
  });

  it('bahar döneminde sınıf değişmez — akademik yıl eylülde döner', () => {
    const bahar = { tarih: '2027-03-01T00:00:00Z', referansYil: 2027 };
    expect(nominalSinif('260905037', bahar).sinif).toBe(1);
  });

  it('eylülde sınıf bir artar', () => {
    const sonraki = { tarih: '2027-09-20T00:00:00Z', referansYil: 2027 };
    expect(nominalSinif('260905037', sonraki).sinif).toBe(2);
  });

  it('çözülemeyen numara sessizce sınıf uydurmaz', () => {
    const r = nominalSinif('abc', ayar);
    expect(r.sinif).toBe(null);
    expect(r.durum).toBe('cozulemedi');
  });
});

describe('sinifSayisi', () => {
  it('çeşitli yazımları çözer', () => {
    expect(sinifSayisi(3)).toBe(3);
    expect(sinifSayisi('3')).toBe(3);
    expect(sinifSayisi('3. sınıf')).toBe(3);
    expect(sinifSayisi('3.Sınıf')).toBe(3);
  });

  it('yıl yazılmışsa sınıf sayılmaz', () => {
    expect(sinifSayisi('2023')).toBe(null);
    expect(sinifSayisi(0)).toBe(null);
    expect(sinifSayisi(9)).toBe(null);
  });

  it('boş değer null döner', () => {
    expect(sinifSayisi('')).toBe(null);
    expect(sinifSayisi(null)).toBe(null);
    expect(sinifSayisi('bilmiyorum')).toBe(null);
  });
});

describe('ogrenciSinifi', () => {
  it('elle girilmiş sınıf numaradan üstündür', () => {
    // numara 1. sınıf der, kayıt 3 diyor → kayıt kazanır (sınıf tekrarı vb.)
    const r = ogrenciSinifi({ studentNumber: '260905037', sinif: '3' }, ayar);
    expect(r.sinif).toBe(3);
    expect(r.kaynak).toBe('kayit');
  });

  it('kayıt boşsa numaradan çözer ve bunu söyler', () => {
    const r = ogrenciSinifi({ studentNumber: '250905037' }, ayar);
    expect(r.sinif).toBe(2);
    expect(r.kaynak).toBe('numara');
    expect(r.girisYili).toBe(2025);
  });

  it('ikisi de yoksa bilinmiyor — "herkes" demez', () => {
    const r = ogrenciSinifi({ studentNumber: 'xx' }, ayar);
    expect(r.sinif).toBe(null);
    expect(r.kaynak).toBe('yok');
  });

  it('öğrencinin kendi program süresi kullanılır', () => {
    const r = ogrenciSinifi({ studentNumber: '210905037', programYili: 6 }, ayar);
    expect(r.sinif).toBe(6);
  });

  it('studentNo ve girisNumarasi alanları da okunur', () => {
    expect(ogrenciSinifi({ studentNo: '260905037' }, ayar).sinif).toBe(1);
    expect(ogrenciSinifi({ girisNumarasi: '240905037' }, ayar).sinif).toBe(3);
  });
});

describe('grupSinifi', () => {
  it('anket grubu etiketini çözer', () => {
    expect(grupSinifi('1. sınıf')).toBe(1);
    expect(grupSinifi('4. sınıf')).toBe(4);
  });

  it('sınıf hedefi olmayan gruplar null', () => {
    expect(grupSinifi('Tüm öğrenciler')).toBe(null);
    expect(grupSinifi('Mezun')).toBe(null);
    expect(grupSinifi('')).toBe(null);
  });
});

// ⚠ ASIL ARIZA BURADAYDI: sınıfı bilinmeyen öğrenciye HER sınıf anketi
// gösteriliyordu (`if (!myClass) return true`).
describe('sinifGrubunaUyarMi', () => {
  it('doğru sınıfa uyar', () => {
    const r = sinifGrubunaUyarMi({ studentNumber: '260905037' }, '1. sınıf', ayar);
    expect(r.uyar).toBe(true);
    expect(r.kaynak).toBe('numara');
  });

  it('başka sınıfa uymaz — 4. sınıf artık 1. sınıf anketini görmez', () => {
    const r = sinifGrubunaUyarMi({ studentNumber: '230905037' }, '1. sınıf', ayar);
    expect(r.uyar).toBe(false);
    expect(r.sebep).toBe('baska-sinif');
  });

  it('sınıf bilinmiyorsa GÖSTERİLMEZ ama sebebi söylenir', () => {
    const r = sinifGrubunaUyarMi({ studentNumber: 'yok' }, '2. sınıf', ayar);
    expect(r.uyar).toBe(false);
    expect(r.sebep).toBe('sinif-bilinmiyor');
  });

  it('sınıf hedefi olmayan grupta herkes geçer', () => {
    const r = sinifGrubunaUyarMi({ studentNumber: 'yok' }, 'Tüm öğrenciler', ayar);
    expect(r.uyar).toBe(true);
    expect(r.sebep).toBe('sinif-hedefi-degil');
  });

  it('elle girilmiş sınıf numarayı ezer', () => {
    const o = { studentNumber: '260905037', sinif: '2' };
    expect(sinifGrubunaUyarMi(o, '2. sınıf', ayar).uyar).toBe(true);
    expect(sinifGrubunaUyarMi(o, '1. sınıf', ayar).uyar).toBe(false);
  });
});

describe('sinifEtiketi', () => {
  it('numaradan geleni işaretler', () => {
    expect(sinifEtiketi({ sinif: 2, kaynak: 'numara' })).toBe('2. sınıf (numaradan)');
    expect(sinifEtiketi({ sinif: 2, kaynak: 'kayit' })).toBe('2. sınıf');
  });

  it('bilinmeyen durumları ayırt eder', () => {
    expect(sinifEtiketi({ sinif: null, durum: 'uzayan' })).toMatch(/aşmış/i);
    expect(sinifEtiketi({ sinif: null, durum: 'gelecek' })).toMatch(/ileri tarihli/i);
    expect(sinifEtiketi({ sinif: null, durum: 'cozulemedi' })).toMatch(/bilinmiyor/i);
  });
});

describe('sinifTaramasi', () => {
  const ogrenciler = [
    { studentNumber: '260905001' }, // boş → 1 yazılacak
    { studentNumber: '250905002' }, // boş → 2 yazılacak
    { studentNumber: '240905003', sinif: '3' }, // uyuyor → dokunulmaz
    { studentNumber: '240905004', sinif: '1' }, // çelişki
    { studentNumber: 'bozuk' }, // çözülemez
    { studentNumber: '200905005' }, // uzayan
  ];

  it('yazılacakları, çelişkileri ve çözülemeyenleri ayırır', () => {
    const r = sinifTaramasi(ogrenciler, ayar);
    expect(r.yazilacak.map((x) => x.yeni)).toEqual([1, 2]);
    expect(r.celiskili).toHaveLength(1);
    expect(r.celiskili[0]).toMatchObject({ mevcut: 1, numaradan: 3 });
    expect(r.dokunulmayan).toBe(1);
    expect(r.cozulemeyen.map((x) => x.durum)).toEqual(['cozulemedi', 'uzayan']);
  });

  it('hiçbir kaydı değiştirmez — yalnız rapor üretir', () => {
    const kopya = JSON.parse(JSON.stringify(ogrenciler));
    sinifTaramasi(ogrenciler, ayar);
    expect(ogrenciler).toEqual(kopya);
  });

  it('boş liste boş rapor verir', () => {
    const r = sinifTaramasi([], ayar);
    expect(r.yazilacak).toEqual([]);
    expect(r.dokunulmayan).toBe(0);
  });
});

// ⚠ YAZILAN SINIF BİR KİLİT DEĞİL, ÖNBELLEKTİR.
// Tarama betiği boş sınıfları numaradan doldurup `sinifKaynagi: 'numara'`
// işaretler. Bu işaret olmasaydı yazılan değer kalıcı bir KAYDA dönüşür,
// gelecek eylülde sınıf artmaz, herkes sonsuza dek aynı sınıfta kalırdı.
describe('betiğin yazdığı sınıf (sinifKaynagi: numara)', () => {
  const ogrenci = { studentNumber: '260905037', sinif: '1', sinifKaynagi: 'numara' };

  it('kayıt sayılmaz — numaradan yeniden hesaplanır', () => {
    const r = ogrenciSinifi(ogrenci, ayar);
    expect(r.kaynak).toBe('numara');
    expect(r.sinif).toBe(1);
  });

  it('gelecek yıl kendiliğinden artar', () => {
    const sonraki = { tarih: '2027-09-20T00:00:00Z', referansYil: 2027 };
    expect(ogrenciSinifi(ogrenci, sonraki).sinif).toBe(2);
  });

  it('elle girilmiş sınıf bu işareti taşımaz ve ezilmez', () => {
    const elle = { studentNumber: '260905037', sinif: '3' };
    const sonraki = { tarih: '2027-09-20T00:00:00Z', referansYil: 2027 };
    expect(ogrenciSinifi(elle, sonraki)).toMatchObject({ sinif: 3, kaynak: 'kayit' });
  });

  it('tarama: eskimiş önbellek tazelenir, güncel olana dokunulmaz', () => {
    const sonraki = { tarih: '2027-09-20T00:00:00Z', referansYil: 2027 };
    const liste = [
      { studentNumber: '260905001', sinif: '1', sinifKaynagi: 'numara' }, // eskimiş → 2
      { studentNumber: '260905002', sinif: '2', sinifKaynagi: 'numara' }, // güncel
    ];
    const r = sinifTaramasi(liste, sonraki);
    expect(r.yazilacak).toHaveLength(1);
    expect(r.yazilacak[0]).toMatchObject({ mevcut: 1, yeni: 2 });
    expect(r.dokunulmayan).toBe(1);
  });

  it('tarama ikinci kez çalışınca yazacak kayıt kalmaz', () => {
    const liste = [{ studentNumber: '260905001' }];
    const ilk = sinifTaramasi(liste, ayar);
    expect(ilk.yazilacak).toHaveLength(1);
    const yazilmis = [
      { studentNumber: '260905001', sinif: String(ilk.yazilacak[0].yeni), sinifKaynagi: 'numara' },
    ];
    expect(sinifTaramasi(yazilmis, ayar).yazilacak).toHaveLength(0);
  });
});
