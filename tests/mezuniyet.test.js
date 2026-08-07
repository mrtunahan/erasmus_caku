// Mezuniyet durumu hesabı.
//
// Bu hesap öğrenciye "mezun olabilirsin / şu kadar AKTS'in kaldı" diyor.
// Yanlış olduğunda kimse fark etmez ama öğrenci mezuniyet planını yanlış
// kurar — o yüzden sessizce iyimser davranan her yol test altında.
import { describe, it, expect } from 'vitest';
import {
  mezuniyetHesapla,
  mezNotDurumu,
  mezNorm,
  mezKuralNormalize,
  mezModelEtiketi,
  mezDersYariyili,
  mezIsyeriYariyilindaMi,
  mezPuandanHarf,
  mezHarfKatsayisi,
  mezOlcekDogrula,
  NOT_OLCEGI_VARSAYILAN,
} from '../lib/mezuniyet.js';

// Yönetmelikteki gerçek ölçek. Kodda SABİT DEĞİL — bölüm yetkilisi Mezuniyet
// Kuralları'ndan düzenliyor; buradaki liste yalnız ilk açılış tohumu.
describe('not ölçeği — puandan harfe', () => {
  it('yönetmelikteki aralıkları doğru çevirir', () => {
    const h = (p) => mezPuandanHarf(p, {}).harf;
    expect(h('95')).toBe('A');
    expect(h('90')).toBe('A');
    expect(h('89')).toBe('B1');
    expect(h('80')).toBe('B2');
    expect(h('75')).toBe('B3');
    expect(h('70')).toBe('C1');
    expect(h('65')).toBe('C2');
    expect(h('60')).toBe('C3');
    expect(h('55')).toBe('F1');
    expect(h('0')).toBe('F2');
  });

  it('katsayıyı da döndürür', () => {
    expect(mezPuandanHarf('87', {}).katsayi).toBe(3.5);
    expect(mezPuandanHarf('62', {}).katsayi).toBe(2.0);
    expect(mezPuandanHarf('30', {}).katsayi).toBe(0);
  });

  it('geçer/kalır bilgisini taşır', () => {
    expect(mezPuandanHarf('75', {}).gecer).toBe(true);
    // F1 katsayısı 1,50 ama GEÇER DEĞİL — katsayısı olması geçtiği anlamına
    // gelmiyor; bu ayrım kaybolursa öğrenci geçmediği dersten geçmiş sayılır.
    expect(mezPuandanHarf('55', {}).gecer).toBe(false);
  });

  it('aralık dışında harf UYDURMAZ', () => {
    const r = mezPuandanHarf('105', {});
    expect(r.harf).toBe('');
    expect(r.sebep).toContain('hiçbir aralığa girmiyor');
  });

  it('okunamayan puanda boş döner', () => {
    expect(mezPuandanHarf('', {}).harf).toBe('');
    expect(mezPuandanHarf('AA', {}).harf).toBe('');
  });

  it('bölümün KENDİ ölçeği geçerlidir (kodda sabit değil)', () => {
    const kendi = {
      notOlcegi: [
        { min: 60, max: 100, harf: 'GECTI', katsayi: 4, gecer: true },
        { min: 0, max: 59, harf: 'KALDI', katsayi: 0, gecer: false },
      ],
    };
    expect(mezPuandanHarf('80', kendi).harf).toBe('GECTI');
    expect(mezPuandanHarf('50', kendi).harf).toBe('KALDI');
  });
});

describe('mezHarfKatsayisi', () => {
  it('ölçekteki harfin katsayısını verir', () => {
    expect(mezHarfKatsayisi('B1', {})).toBe(3.5);
    expect(mezHarfKatsayisi('C3', {})).toBe(2.0);
  });

  it('FF1/FF2/FF3 işaret ettikleri harfin katsayısıyla işlenir', () => {
    // Yönetmelik: "FF1, FF2 ve FF3 notları ortalama hesabında F2 olarak
    // işleme alınır."
    expect(mezHarfKatsayisi('FF1', {})).toBe(0);
    expect(mezHarfKatsayisi('FF2', {})).toBe(0);
    expect(mezHarfKatsayisi('FF3', {})).toBe(0);
  });

  it('tanınmayan harfte null döner — sıfır DEMEZ', () => {
    // Sıfır demek, bilinmeyen bir notu "kaldı" saymak olurdu.
    expect(mezHarfKatsayisi('ZZ', {})).toBe(null);
    expect(mezHarfKatsayisi('', {})).toBe(null);
  });
});

describe('geçer/kalır listeleri ölçekten TÜRETİLİR', () => {
  it('ölçekteki gecer bayrağından çıkar', () => {
    const k = mezKuralNormalize({});
    expect(k.gecerNotlar).toContain('B1');
    expect(k.gecerNotlar).toContain('C3');
    expect(k.kalirNotlar).toContain('F1');
    expect(k.kalirNotlar).toContain('F2');
    expect(k.kalirNotlar).toContain('FF2');
  });

  it('ölçekte geçer olan harf listede unutulamaz', () => {
    // İki ayrı liste elle tutulurken ölçekle listeler sapabiliyordu: ölçekte
    // "geçer" yazan bir harf listede yoksa öğrencinin geçtiği ders sessizce
    // "belirsiz" sayılırdı.
    const k = mezKuralNormalize({
      notOlcegi: [{ min: 0, max: 100, harf: 'X1', katsayi: 4, gecer: true }],
      gecerNotlar: [],
    });
    expect(mezNotDurumu('X1', k)).toBe('gecti');
  });

  it('elle eklenen notlar ölçeği tamamlar, ezmez', () => {
    const k = mezKuralNormalize({ gecerNotlar: ['S'] });
    expect(k.gecerNotlar).toContain('S');
    expect(k.gecerNotlar).toContain('B1');
  });
});

describe('mezOlcekDogrula', () => {
  it('varsayılan ölçek geçerlidir', () => {
    expect(mezOlcekDogrula(NOT_OLCEGI_VARSAYILAN).gecerli).toBe(true);
  });

  it('çakışan aralığı yakalar', () => {
    const r = mezOlcekDogrula([
      { min: 80, max: 90, harf: 'B', katsayi: 3 },
      { min: 85, max: 100, harf: 'A', katsayi: 4 },
    ]);
    expect(r.sorunlar.join(' ')).toContain('çakışıyor');
  });

  it('boşluğu yakalar', () => {
    const r = mezOlcekDogrula([
      { min: 0, max: 50, harf: 'F', katsayi: 0 },
      { min: 60, max: 100, harf: 'A', katsayi: 4 },
    ]);
    expect(r.sorunlar.join(' ')).toContain('boşluk');
  });

  it('eksik katsayı ve boş harfi yakalar', () => {
    const r = mezOlcekDogrula([{ min: 0, max: 100, harf: '', katsayi: '' }]);
    expect(r.sorunlar.join(' ')).toContain('harf boş');
    expect(r.sorunlar.join(' ')).toContain('katsayı eksik');
  });
});

const K = (o) => Object.assign({ toplamAkts: 60, minAgno: 2.0, stajZorunlu: false }, o || {});

const mufredat = [
  { code: 'BLM101', name: 'Algoritmalar', akts: 6, sinif: 1, donem: 'guz', statu: 'Z' },
  { code: 'BLM102', name: 'Veri Yapıları', akts: 6, sinif: 1, donem: 'bahar', statu: 'Z' },
  { code: 'BLM480', name: 'Bitirme Projesi', akts: 10, sinif: 4, donem: 'bahar', statu: 'Z' },
  { code: 'SEC201', name: 'Seçmeli Yazılım', akts: 5, sinif: 2, donem: 'guz', statu: 'S' },
];

describe('mezNorm', () => {
  it('boşluk ve noktalamayı atar, Türkçe harfleri sadeleştirir', () => {
    expect(mezNorm('BLM 101')).toBe('blm101');
    expect(mezNorm('blm-101')).toBe('blm101');
    expect(mezNorm('MÜHENDİSLİK ÇİZİMİ')).toBe('muhendislikcizimi');
  });
});

describe('mezNotDurumu', () => {
  it('geçer/kalır listelerini uygular', () => {
    expect(mezNotDurumu('AA', K())).toBe('gecti');
    expect(mezNotDurumu('FF', K())).toBe('kaldi');
  });
  it('küçük harf ve boşluğu tolere eder', () => {
    expect(mezNotDurumu(' ba ', K())).toBe('gecti');
  });
  it('tanımadığı notu geçti SAYMAZ', () => {
    expect(mezNotDurumu('XX', K())).toBe('belirsiz');
    expect(mezNotDurumu('', K())).toBe('belirsiz');
  });
});

describe('mezuniyetHesapla — eşleştirme', () => {
  it('kod tutmasa da ada göre müfredatla eşleşir', () => {
    const r = mezuniyetHesapla(
      mufredat,
      [{ kod: 'CENG101', ad: 'Algoritmalar', akts: 6, not: 'AA' }],
      K(),
      {}
    );
    expect(r.kayitlar[0].mufredatta).toBe(true);
    expect(r.kayitlar[0].statu).toBe('Z');
    expect(r.kalanZorunlu.map((c) => c.code)).not.toContain('BLM101');
  });

  it('müfredat dışı dersi işaretler ama AKTS’e sayar', () => {
    const r = mezuniyetHesapla(
      mufredat,
      [{ kod: 'XXX999', ad: 'Serbest', akts: 4, not: 'BB' }],
      K(),
      {}
    );
    expect(r.kayitlar[0].mufredatta).toBe(false);
    expect(r.gecilenAkts).toBe(4);
  });

  it('tekrar edilen derste EN İYİ sonucu alır ve AKTS’i bir kez sayar', () => {
    const r = mezuniyetHesapla(
      mufredat,
      [
        { kod: 'BLM101', ad: 'Algoritmalar', akts: 6, not: 'FF' },
        { kod: 'BLM101', ad: 'Algoritmalar', akts: 6, not: 'CC' },
      ],
      K(),
      {}
    );
    expect(r.gecilenAkts).toBe(6); // 12 değil
    expect(r.kalanZorunlu.map((c) => c.code)).not.toContain('BLM101');
  });
});

// Öğretim modeli iki sayıyla tanımlanıyor (toplam yarıyıl + işyeri yarıyılı).
// Buradaki her yol bir bölümün müfredatını yanlış yorumlayıp öğrenciye eksik
// ya da fazla ders göstermeye aday.
describe('öğretim modeli — yarıyıl hesabı', () => {
  it('sınıf ve dönemden yarıyıl çıkarır', () => {
    expect(mezDersYariyili({ sinif: 1, donem: 'guz' })).toBe(1);
    expect(mezDersYariyili({ sinif: 1, donem: 'bahar' })).toBe(2);
    expect(mezDersYariyili({ sinif: 4, donem: 'bahar' })).toBe(8);
    expect(mezDersYariyili({ sinif: 6, donem: 'guz' })).toBe(11);
  });

  it('sınıf ya da dönem eksikse yarıyıl UYDURMAZ', () => {
    expect(mezDersYariyili({ sinif: 0, donem: 'guz' })).toBe(null);
    expect(mezDersYariyili({ sinif: 2, donem: '' })).toBe(null);
    expect(mezDersYariyili({})).toBe(null);
  });

  it('etiketi iki sayıdan türetir', () => {
    expect(mezModelEtiketi({ toplamYariyil: 8, isyeriYariyilSayisi: 1 })).toBe('7+1');
    expect(mezModelEtiketi({ toplamYariyil: 4, isyeriYariyilSayisi: 1 })).toBe('3+1');
    expect(mezModelEtiketi({ toplamYariyil: 4, isyeriYariyilSayisi: 0 })).toBe('4+0');
    expect(mezModelEtiketi({ toplamYariyil: 12, isyeriYariyilSayisi: 0 })).toBe('12+0');
    expect(mezModelEtiketi({ toplamYariyil: 8, isyeriYariyilSayisi: 2 })).toBe('6+2');
  });

  it('ESKİ kayıtları çevirir — 7+1 uygulayan bölüm sessizce 8+0’a dönmez', () => {
    const eski = mezKuralNormalize({ mufredatTipi: '7+1' });
    expect(eski.toplamYariyil).toBe(8);
    expect(eski.isyeriYariyilSayisi).toBe(1);
    expect(mezKuralNormalize({ mufredatTipi: 'normal' }).isyeriYariyilSayisi).toBe(0);
  });

  it('yeni alanlar varsa eski alan görmezden gelinir', () => {
    const k = mezKuralNormalize({
      mufredatTipi: 'normal',
      toplamYariyil: 4,
      isyeriYariyilSayisi: 1,
    });
    expect(mezModelEtiketi(k)).toBe('3+1');
  });

  it('işyeri yarıyılı toplamı AŞAMAZ', () => {
    // Aşsaydı müfredatın tamamı "ders değil" sayılır, kalan ders listesi
    // boşalır ve öğrenci mezun olduğunu sanırdı.
    const k = mezKuralNormalize({ toplamYariyil: 4, isyeriYariyilSayisi: 9 });
    expect(k.isyeriYariyilSayisi).toBe(4);
  });

  it('işyeri yarıyılları programın SONUNDADIR', () => {
    const s8b = { sinif: 4, donem: 'bahar' }; // 8. yarıyıl
    const s8g = { sinif: 4, donem: 'guz' }; // 7. yarıyıl
    const yediArti = { toplamYariyil: 8, isyeriYariyilSayisi: 1 };
    expect(mezIsyeriYariyilindaMi(s8b, yediArti)).toBe(true);
    expect(mezIsyeriYariyilindaMi(s8g, yediArti)).toBe(false);
    // 6+2'de son İKİ yarıyıl
    const altiArtiIki = { toplamYariyil: 8, isyeriYariyilSayisi: 2 };
    expect(mezIsyeriYariyilindaMi(s8g, altiArtiIki)).toBe(true);
  });

  it('MYO 3+1’de 2. sınıf bahar işyeri eğitimidir', () => {
    const myo = { toplamYariyil: 4, isyeriYariyilSayisi: 1 };
    expect(mezIsyeriYariyilindaMi({ sinif: 2, donem: 'bahar' }, myo)).toBe(true);
    expect(mezIsyeriYariyilindaMi({ sinif: 2, donem: 'guz' }, myo)).toBe(false);
  });

  it('yarıyılı çözülemeyen ders DERS SAYILIR', () => {
    // Belirsizliği "bu ders zaten yok" diye yorumlamak, eksik dersi listeden
    // düşürüp öğrenciyi yanıltırdı.
    expect(
      mezIsyeriYariyilindaMi({ code: 'X', sinif: '', donem: '' }, { isyeriYariyilSayisi: 1 })
    ).toBe(false);
  });
});

describe('mezuniyetHesapla — işyeri eğitimli müfredat', () => {
  it('işyeri eğitimi yokken 4. sınıf bahar dersi kalan zorunluda görünür', () => {
    const r = mezuniyetHesapla(mufredat, [], K(), {});
    expect(r.kalanZorunlu.map((c) => c.code)).toContain('BLM480');
  });

  it('7+1’de 8. yarıyıl dersleri kalan zorunludan düşer', () => {
    const r = mezuniyetHesapla(mufredat, [], K({ toplamYariyil: 8, isyeriYariyilSayisi: 1 }), {});
    expect(r.kalanZorunlu.map((c) => c.code)).not.toContain('BLM480');
  });

  it('ESKİ mufredatTipi kaydı da aynı sonucu verir', () => {
    const r = mezuniyetHesapla(mufredat, [], K({ mufredatTipi: '7+1' }), {});
    expect(r.kalanZorunlu.map((c) => c.code)).not.toContain('BLM480');
    expect(r.modelEtiketi).toBe('7+1');
  });

  it('işyeri eğitimi koşulu eklenir ve "bilinmiyor" kalır', () => {
    const r = mezuniyetHesapla(mufredat, [], K({ toplamYariyil: 8, isyeriYariyilSayisi: 1 }), {});
    const k = r.kosullar.find((x) => x.id === 'isyeri');
    expect(k).toBeTruthy();
    expect(k.saglandi).toBe(null);
    expect(k.label).toContain('8. yarıyıl');
  });

  it('iki yarıyıllık işyeri eğitiminde koşul aralık yazar', () => {
    const r = mezuniyetHesapla(mufredat, [], K({ toplamYariyil: 8, isyeriYariyilSayisi: 2 }), {});
    expect(r.kosullar.find((x) => x.id === 'isyeri').label).toContain('7–8. yarıyıllar');
  });

  it('MYO 3+1’de 2. sınıf bahar dersleri düşer', () => {
    const myoMufredat = [
      { code: 'MYO101', name: 'Temel', akts: 6, sinif: 1, donem: 'guz', statu: 'Z' },
      { code: 'MYO204', name: 'İşyeri Uygulaması', akts: 30, sinif: 2, donem: 'bahar', statu: 'Z' },
    ];
    const r = mezuniyetHesapla(
      myoMufredat,
      [],
      K({ toplamYariyil: 4, isyeriYariyilSayisi: 1, toplamAkts: 120 }),
      {}
    );
    expect(r.kalanZorunlu.map((c) => c.code)).toEqual(['MYO101']);
  });
});

describe('mezuniyetHesapla — mezunOlabilir kararı', () => {
  const hepsi = [
    { kod: 'BLM101', ad: 'Algoritmalar', akts: 6, not: 'AA' },
    { kod: 'BLM102', ad: 'Veri Yapıları', akts: 6, not: 'BB' },
    { kod: 'BLM480', ad: 'Bitirme Projesi', akts: 10, not: 'CC' },
    { kod: 'SEC201', ad: 'Seçmeli Yazılım', akts: 5, not: 'CB' },
    { kod: 'EK100', ad: 'Ek Ders', akts: 33, not: 'AA' },
  ];

  it('tüm koşullar sağlandığında mezun olabilir', () => {
    const r = mezuniyetHesapla(mufredat, hepsi, K(), { agno: '3,10' });
    expect(r.gecilenAkts).toBe(60);
    expect(r.kalanZorunlu).toHaveLength(0);
    expect(r.mezunOlabilir).toBe(true);
  });

  it('AGNO bilinmiyorsa mezun olabilir DEMEZ', () => {
    const r = mezuniyetHesapla(mufredat, hepsi, K(), {});
    expect(r.kosullar.find((k) => k.id === 'agno').saglandi).toBe(null);
    expect(r.mezunOlabilir).toBe(false);
  });

  it('staj zorunluyken durumu bilinmiyorsa mezun olabilir DEMEZ', () => {
    const r = mezuniyetHesapla(mufredat, hepsi, K({ stajZorunlu: true }), { agno: '3,10' });
    expect(r.mezunOlabilir).toBe(false);
  });

  it('AGNO virgüllü yazılsa da okunur', () => {
    const r = mezuniyetHesapla(mufredat, hepsi, K(), { agno: '1,95' });
    expect(r.kosullar.find((k) => k.id === 'agno').saglandi).toBe(false);
  });

  it('müfredat boşsa "zorunlular tamam" DEMEZ', () => {
    const r = mezuniyetHesapla([], hepsi, K(), { agno: '3,10' });
    expect(r.mufredatBos).toBe(true);
    expect(r.kosullar.find((k) => k.id === 'zorunlu').saglandi).toBe(null);
    expect(r.mezunOlabilir).toBe(false);
  });

  it('tanınmayan notu geçti saymaz ve bayrak kaldırır', () => {
    const r = mezuniyetHesapla(
      mufredat,
      [{ kod: 'BLM101', ad: 'Algoritmalar', akts: 6, not: '??' }],
      K(),
      {}
    );
    expect(r.gecilenAkts).toBe(0);
    expect(r.belirsizVar).toBe(true);
    expect(r.kalanZorunlu.map((c) => c.code)).toContain('BLM101');
  });
});
