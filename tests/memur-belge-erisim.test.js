import { describe, it, expect } from 'vitest';
import {
  belgeBolumu,
  memuraGonderildiMi,
  memurYonlendirmeleri,
  belgeGizliMi,
  gelenKutusu,
  memurBelgeModulleri,
  memurBelgeyiGorurMu,
  memurEskiModulleri,
  memurMu,
  yonlendirmeBanaMi,
} from '../lib/memur-belge-erisim.js';

// Memur Niyazi: fakültede havuzda, YALNIZ Bilgisayar'a atanmış.
const NIYAZI = {
  id: 'm-niyazi',
  name: 'Niyazi METE',
  identifier: 'niyazi',
  role: 'memur',
  facultyId: 'muhendislik',
  departmentId: '',
};

const ATAMALAR = [
  { departmentId: 'bilgisayar', memurId: 'm-niyazi', modules: ['muafiyet'] },
  { departmentId: 'kimya', memurId: 'm-baska', modules: ['muafiyet'] },
];

function belge(ek) {
  return Object.assign(
    {
      id: 'muafiyet__1',
      module: 'muafiyet',
      departmentId: 'kimya',
      facultyId: 'muhendislik',
      gonderimler: [{ hedefRol: 'memur', kapsamTip: 'bolum', kapsamId: 'kimya' }],
    },
    ek
  );
}

describe('memurMu', () => {
  it('rol ya da bayrak yeter', () => {
    expect(memurMu({ role: 'memur' })).toBe(true);
    expect(memurMu({ isMemur: true })).toBe(true);
    expect(memurMu({ role: 'professor' })).toBe(false);
    expect(memurMu(null)).toBe(false);
  });
});

describe('belgeBolumu', () => {
  it('yönlendirmenin kapsamı önce gelir', () => {
    expect(belgeBolumu({ departmentId: 'kimya' }, { kapsamId: 'bilgisayar' })).toBe('bilgisayar');
  });

  it('kapsam yoksa belgenin bölümü', () => {
    expect(belgeBolumu({ departmentId: 'kimya' }, { kapsamId: '' })).toBe('kimya');
    expect(belgeBolumu({ departmentId: 'kimya' }, null)).toBe('kimya');
  });

  it('ikisi de yoksa boş', () => {
    expect(belgeBolumu({}, {})).toBe('');
  });
});

describe('memurEskiModulleri', () => {
  it('havuz listesi varsa o okunur', () => {
    // app-shell `memurModules` üzerine aktif bölümün listesini yazar; geriye
    // dönük kural özgün listeye bakmalı.
    expect(memurEskiModulleri({ memurModulesHavuz: ['staj'], memurModules: ['muafiyet'] })).toEqual(
      ['staj']
    );
  });

  it('havuz yoksa mevcut liste', () => {
    expect(memurEskiModulleri({ memurModules: ['muafiyet'] })).toEqual(['muafiyet']);
    expect(memurEskiModulleri({})).toEqual([]);
  });
});

describe('memurBelgeModulleri', () => {
  it('atanan bölümde atamanın modülleri', () => {
    expect(memurBelgeModulleri(ATAMALAR, 'bilgisayar', NIYAZI)).toEqual(['muafiyet']);
  });

  it('ATANMAMIŞ bölümde yetki yok', () => {
    expect(memurBelgeModulleri(ATAMALAR, 'kimya', NIYAZI)).toEqual([]);
  });

  it('eski düz liste yalnız memurun KENDİ bölümünde geçerli', () => {
    const eski = { ...NIYAZI, departmentId: 'bilgisayar', memurModules: ['erasmus'] };
    expect(memurBelgeModulleri([], 'bilgisayar', eski)).toEqual(['erasmus']);
    expect(memurBelgeModulleri([], 'kimya', eski)).toEqual([]);
  });

  it('atama kaydı varsa eski liste yok sayılır', () => {
    const eski = { ...NIYAZI, departmentId: 'bilgisayar', memurModules: ['erasmus'] };
    expect(memurBelgeModulleri(ATAMALAR, 'bilgisayar', eski)).toEqual(['muafiyet']);
  });

  it('memur olmayan hiçbir şey görmez', () => {
    expect(memurBelgeModulleri(ATAMALAR, 'bilgisayar', { role: 'professor' })).toEqual([]);
  });
});

describe('memurBelgeyiGorurMu', () => {
  const cagir = (ek) =>
    memurBelgeyiGorurMu({
      doc: belge(),
      gonderim: belge().gonderimler[0],
      kullanici: NIYAZI,
      atamalar: ATAMALAR,
      aktifBolum: 'bilgisayar',
      ...ek,
    });

  it('BİLDİRİLEN HATA: atanmadığı bölümün belgesini görmez', () => {
    // Kimya'da hiçbir modüle atanmamışken Kimya'nın belgesi görünüyordu.
    expect(cagir()).toBe(false);
  });

  it('BİLDİRİLEN HATA: seçili bölüm başkayken o bölümün belgesi listelenmez', () => {
    // Kimya'ya atansa bile, sağda Bilgisayar seçiliyken Kimya belgesi çıkmaz.
    const atamalar = ATAMALAR.concat([
      { departmentId: 'kimya', memurId: 'm-niyazi', modules: ['muafiyet'] },
    ]);
    expect(cagir({ atamalar })).toBe(false);
    expect(cagir({ atamalar, aktifBolum: 'kimya' })).toBe(true);
  });

  it('ATAMASIZ memur hiçbir belge görmez', () => {
    // Eski kural: boş modül listesi "hepsini gör" demekti.
    const doc = belge({ departmentId: 'bilgisayar' });
    expect(
      memurBelgeyiGorurMu({
        doc,
        gonderim: { hedefRol: 'memur', kapsamId: 'bilgisayar' },
        kullanici: { ...NIYAZI, id: 'm-atamasiz' },
        atamalar: ATAMALAR,
        aktifBolum: 'bilgisayar',
      })
    ).toBe(false);
  });

  it('atandığı bölümde atandığı modülü görür', () => {
    const doc = belge({ departmentId: 'bilgisayar' });
    expect(cagir({ doc, gonderim: { hedefRol: 'memur', kapsamId: 'bilgisayar' } })).toBe(true);
  });

  it('atandığı bölümde ATANMAMIŞ modülü görmez', () => {
    const doc = belge({ departmentId: 'bilgisayar', module: 'erasmus' });
    expect(cagir({ doc, gonderim: { hedefRol: 'memur', kapsamId: 'bilgisayar' } })).toBe(false);
  });

  it('bölümsüz belge: aynı fakülte + seçili bölümde atama gerekir', () => {
    const doc = belge({ departmentId: '', facultyId: 'muhendislik' });
    expect(cagir({ doc, gonderim: { hedefRol: 'memur', kapsamId: '' } })).toBe(true);
  });

  it('bölümsüz belge BAŞKA fakülteden ise görünmez', () => {
    const doc = belge({ departmentId: '', facultyId: 'fen' });
    expect(cagir({ doc, gonderim: { hedefRol: 'memur', kapsamId: '' } })).toBe(false);
  });

  it('kapsamsız belge artık herkese açık değil', () => {
    // Eski kural: `!g.kapsamId` → koşulsuz görünür.
    const doc = belge({ departmentId: '', facultyId: '' });
    expect(cagir({ doc, gonderim: { hedefRol: 'memur', kapsamId: '' } })).toBe(false);
  });

  it('modül adı olmayan kayıt görünmez', () => {
    expect(cagir({ doc: belge({ module: '', departmentId: 'bilgisayar' }) })).toBe(false);
  });

  it('modul parametresi kaydın module alanının yerine geçer', () => {
    // muafiyet_records kayıtlarında `module` alanı yok; ekran rotayı verir.
    const kayit = { departmentId: 'bilgisayar', facultyId: 'muhendislik' };
    expect(
      memurBelgeyiGorurMu({
        doc: kayit,
        kullanici: NIYAZI,
        atamalar: ATAMALAR,
        aktifBolum: 'bilgisayar',
        modul: 'muafiyet',
      })
    ).toBe(true);
  });

  it('memur olmayan bu daldan geçemez', () => {
    expect(cagir({ kullanici: { role: 'professor', departmentId: 'kimya' } })).toBe(false);
  });
});

describe('belgeGizliMi', () => {
  it('kendi listesinden kaldıran görmez', () => {
    expect(belgeGizliMi({ gizleyenler: ['niyazi'] }, NIYAZI)).toBe(true);
    expect(belgeGizliMi({ gizleyenler: ['baskasi'] }, NIYAZI)).toBe(false);
    expect(belgeGizliMi({}, NIYAZI)).toBe(false);
  });
});

describe('yonlendirmeBanaMi', () => {
  const ogrenci = { role: 'student', studentNumber: '123', departmentId: 'bilgisayar' };

  it('öğrenci yalnız kendi belgesini görür', () => {
    const d = belge({ gonderimler: [] });
    expect(yonlendirmeBanaMi(d, { hedefRol: 'ogrenci', kapsamId: '123' }, ogrenci)).toBe(true);
    expect(yonlendirmeBanaMi(d, { hedefRol: 'ogrenci', kapsamId: '999' }, ogrenci)).toBe(false);
  });

  it('öğrenci personel yönlendirmelerini görmez', () => {
    const d = belge();
    expect(yonlendirmeBanaMi(d, { hedefRol: 'memur', kapsamId: 'bilgisayar' }, ogrenci)).toBe(
      false
    );
  });

  it('bölüm yetkilisi kendi bölümünü görür', () => {
    const y = { isDeptManager: true, departmentId: 'kimya', facultyId: 'muhendislik' };
    expect(yonlendirmeBanaMi(belge(), { hedefRol: 'bolum_yetkilisi', kapsamId: 'kimya' }, y)).toBe(
      true
    );
    expect(
      yonlendirmeBanaMi(belge(), { hedefRol: 'bolum_yetkilisi', kapsamId: 'bilgisayar' }, y)
    ).toBe(false);
  });

  it('kapsamsız yönlendirme yalnız aynı fakültede görünür', () => {
    const d = belge({ departmentId: '', facultyId: 'muhendislik' });
    const ayni = { isDeptManager: true, departmentId: 'kimya', facultyId: 'muhendislik' };
    const baska = { isDeptManager: true, departmentId: 'kimya', facultyId: 'fen' };
    expect(yonlendirmeBanaMi(d, { hedefRol: 'bolum_yetkilisi', kapsamId: '' }, ayni)).toBe(true);
    expect(yonlendirmeBanaMi(d, { hedefRol: 'bolum_yetkilisi', kapsamId: '' }, baska)).toBe(false);
  });

  it('akademisyen kendi bölümünü görür, memur bu daldan geçemez', () => {
    const akd = { role: 'professor', departmentId: 'kimya', facultyId: 'muhendislik' };
    expect(yonlendirmeBanaMi(belge(), { hedefRol: 'akademisyen', kapsamId: 'kimya' }, akd)).toBe(
      true
    );
    expect(yonlendirmeBanaMi(belge(), { hedefRol: 'akademisyen', kapsamId: 'kimya' }, NIYAZI)).toBe(
      false
    );
  });
});

describe('gelenKutusu', () => {
  it('BİLDİRİLEN HATA: Kimya belgesi Bilgisayar seçiliyken listelenmez', () => {
    const list = [belge()];
    const gelen = gelenKutusu(list, NIYAZI, { atamalar: ATAMALAR, aktifBolum: 'bilgisayar' });
    expect(gelen).toEqual([]);
  });

  it('atandığı bölümün belgesi listelenir', () => {
    const list = [
      belge({
        id: 'muafiyet__2',
        departmentId: 'bilgisayar',
        gonderimler: [{ hedefRol: 'memur', kapsamId: 'bilgisayar' }],
      }),
    ];
    const gelen = gelenKutusu(list, NIYAZI, { atamalar: ATAMALAR, aktifBolum: 'bilgisayar' });
    expect(gelen.length).toBe(1);
    expect(gelen[0].index).toBe(0);
  });

  it('gizlenen belge listelenmez', () => {
    const list = [
      belge({
        departmentId: 'bilgisayar',
        gizleyenler: ['niyazi'],
        gonderimler: [{ hedefRol: 'memur', kapsamId: 'bilgisayar' }],
      }),
    ];
    expect(gelenKutusu(list, NIYAZI, { atamalar: ATAMALAR, aktifBolum: 'bilgisayar' })).toEqual([]);
  });

  it('en yeni yönlendirme başta', () => {
    const list = [
      belge({
        departmentId: 'bilgisayar',
        gonderimler: [
          { hedefRol: 'memur', kapsamId: 'bilgisayar', gonderilmeTarihi: '2026-01-01T00:00:00Z' },
          { hedefRol: 'memur', kapsamId: 'bilgisayar', gonderilmeTarihi: '2026-03-01T00:00:00Z' },
        ],
      }),
    ];
    const gelen = gelenKutusu(list, NIYAZI, { atamalar: ATAMALAR, aktifBolum: 'bilgisayar' });
    expect(gelen.map((g) => g.index)).toEqual([1, 0]);
  });

  it('boş girdi çökmez', () => {
    expect(gelenKutusu(null, null, null)).toEqual([]);
  });
});

describe('memuraGonderildiMi', () => {
  const gonderilmis = {
    id: 'muafiyet__3',
    module: 'muafiyet',
    departmentId: 'bilgisayar',
    facultyId: 'muhendislik',
    gonderimler: [{ hedefRol: 'memur', kapsamId: 'bilgisayar', durum: 'bekliyor' }],
  };

  it('yönlendirmeleri ayıklar', () => {
    const d = {
      gonderimler: [
        { hedefRol: 'ogrenci', kapsamId: '123' },
        { hedefRol: 'memur', kapsamId: 'bilgisayar' },
      ],
    };
    expect(memurYonlendirmeleri(d).length).toBe(1);
    expect(memurYonlendirmeleri({}).length).toBe(0);
    expect(memurYonlendirmeleri(null).length).toBe(0);
  });

  it('BİLDİRİLEN HATA: gönderilmemiş belge memura görünmez', () => {
    // recordMemurOutput anlık görüntüsü: üretilmiş ama yönlendirilmemiş.
    const uretilmis = { ...gonderilmis, gonderimler: [] };
    expect(
      memuraGonderildiMi(uretilmis, {
        kullanici: NIYAZI,
        atamalar: ATAMALAR,
        aktifBolum: 'bilgisayar',
      })
    ).toBe(false);
  });

  it('gönderilmiş belge görünür', () => {
    expect(
      memuraGonderildiMi(gonderilmis, {
        kullanici: NIYAZI,
        atamalar: ATAMALAR,
        aktifBolum: 'bilgisayar',
      })
    ).toBe(true);
  });

  it('yalnız öğrenciye gönderilmiş belge memura düşmez', () => {
    const ogrenciye = { ...gonderilmis, gonderimler: [{ hedefRol: 'ogrenci', kapsamId: '123' }] };
    expect(
      memuraGonderildiMi(ogrenciye, {
        kullanici: NIYAZI,
        atamalar: ATAMALAR,
        aktifBolum: 'bilgisayar',
      })
    ).toBe(false);
  });

  it('gönderilmiş olsa da atanmadığı bölümde görünmez', () => {
    const kimyaya = {
      ...gonderilmis,
      departmentId: 'kimya',
      gonderimler: [{ hedefRol: 'memur', kapsamId: 'kimya' }],
    };
    expect(
      memuraGonderildiMi(kimyaya, { kullanici: NIYAZI, atamalar: ATAMALAR, aktifBolum: 'kimya' })
    ).toBe(false);
  });

  it('modul parametresi module alanının yerine geçer', () => {
    const modulsuz = { ...gonderilmis, module: '' };
    expect(
      memuraGonderildiMi(modulsuz, {
        kullanici: NIYAZI,
        atamalar: ATAMALAR,
        aktifBolum: 'bilgisayar',
        modul: 'muafiyet',
      })
    ).toBe(true);
  });
});

describe('staj istisnası (fakülte çapında)', () => {
  // SGK onayı tek elden verilir: staj yetkilisi, bölüm ataması olmayan
  // bölümlerin staj belgelerini de görür (bkz. lib/memur-atama.js).
  const ERGUN = {
    id: 'm-ergun',
    identifier: 'ergun',
    role: 'memur',
    facultyId: 'muhendislik',
    departmentId: '',
    isStajCoordinator: true,
  };

  const stajBelgesi = {
    module: 'staj',
    departmentId: 'kimya',
    facultyId: 'muhendislik',
    gonderimler: [{ hedefRol: 'memur', kapsamId: 'kimya' }],
  };

  it('bayrakla: atamasız bölümün staj belgesini görür', () => {
    expect(
      memurBelgeyiGorurMu({
        doc: stajBelgesi,
        gonderim: stajBelgesi.gonderimler[0],
        kullanici: ERGUN,
        atamalar: [],
        aktifBolum: 'bilgisayar',
      })
    ).toBe(true);
  });

  it('atama ile: herhangi bir bölümde staj ataması yeter', () => {
    const memur = { ...ERGUN, isStajCoordinator: false };
    const atamalar = [{ departmentId: 'bilgisayar', memurId: 'm-ergun', modules: ['staj'] }];
    expect(
      memurBelgeyiGorurMu({
        doc: stajBelgesi,
        gonderim: stajBelgesi.gonderimler[0],
        kullanici: memur,
        atamalar,
        aktifBolum: 'bilgisayar',
      })
    ).toBe(true);
  });

  it('BAŞKA fakültenin staj belgesini görmez', () => {
    const d = { ...stajBelgesi, facultyId: 'fen' };
    expect(
      memurBelgeyiGorurMu({
        doc: d,
        gonderim: d.gonderimler[0],
        kullanici: ERGUN,
        atamalar: [],
        aktifBolum: 'bilgisayar',
      })
    ).toBe(false);
  });

  it('istisna yalnız staja özeldir — muafiyette geçmez', () => {
    const d = { ...stajBelgesi, module: 'muafiyet' };
    expect(
      memurBelgeyiGorurMu({
        doc: d,
        gonderim: d.gonderimler[0],
        kullanici: ERGUN,
        atamalar: [],
        aktifBolum: 'kimya',
      })
    ).toBe(false);
  });

  it('staj yetkilisi olmayan memur için istisna yok', () => {
    expect(
      memurBelgeyiGorurMu({
        doc: stajBelgesi,
        gonderim: stajBelgesi.gonderimler[0],
        kullanici: NIYAZI,
        atamalar: ATAMALAR,
        aktifBolum: 'kimya',
      })
    ).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// OTURUMDA KAYIT KİMLİĞİ YOKKEN — BİLDİRİLEN HATA
//
// Giriş yanıtı memurun kayıt kimliğini (`id`) hiç döndürmüyordu. Atamalar
// (bölüm, memur) kimliğe bağlı olduğu için hiçbir atama eşleşmiyor ve memur,
// kendisine GÖNDERİLEN belgeleri bile göremiyordu. Kimlik artık taşınıyor;
// açık oturumlar için ad ikinci anahtar.
// ══════════════════════════════════════════════════════════════
describe('kimliksiz oturum — ad ile eşleşme', () => {
  const KIMLIKSIZ = {
    name: 'Niyazi METE',
    identifier: 'niyazi',
    role: 'memur',
    facultyId: 'muhendislik',
    departmentId: '',
    memurModules: [],
  };
  const ATAMA_ADLI = [
    {
      departmentId: 'bilgisayar',
      memurId: 'm-niyazi',
      memurName: 'Niyazi METE',
      modules: ['muafiyet'],
    },
  ];
  const belgeBil = {
    module: 'muafiyet',
    departmentId: 'bilgisayar',
    facultyId: 'muhendislik',
    gonderimler: [{ hedefRol: 'memur', kapsamId: 'bilgisayar' }],
  };

  it('kimlik yokken ad eşleşmesiyle belge görünür', () => {
    expect(
      memuraGonderildiMi(belgeBil, {
        kullanici: KIMLIKSIZ,
        atamalar: ATAMA_ADLI,
        aktifBolum: 'bilgisayar',
      })
    ).toBe(true);
  });

  it('kimlik VARSA ve tutmuyorsa ad yedeği devreye girmez', () => {
    // Başkasının ataması ada benzese de kimlik açıkça farklıysa reddedilir.
    const baskaKimlik = { ...KIMLIKSIZ, id: 'm-baskasi' };
    expect(
      memuraGonderildiMi(belgeBil, {
        kullanici: baskaKimlik,
        atamalar: ATAMA_ADLI,
        aktifBolum: 'bilgisayar',
      })
    ).toBe(false);
  });

  it('ad da tutmuyorsa görünmez', () => {
    const yabanci = { ...KIMLIKSIZ, name: 'Başka Kişi' };
    expect(memurBelgeModulleri(ATAMA_ADLI, 'bilgisayar', yabanci)).toEqual([]);
  });

  it('adı olmayan atamada yedek çalışmaz', () => {
    const adsizAtama = [{ departmentId: 'bilgisayar', memurId: 'm-x', modules: ['muafiyet'] }];
    expect(memurBelgeModulleri(adsizAtama, 'bilgisayar', KIMLIKSIZ)).toEqual([]);
  });

  it('Türkçe büyük/küçük harf farkı eşleşmeyi bozmaz', () => {
    const kucuk = { ...KIMLIKSIZ, name: 'niyazi mete' };
    expect(memurBelgeModulleri(ATAMA_ADLI, 'bilgisayar', kucuk)).toEqual(['muafiyet']);
  });

  it('atanmadığı bölüm yine kapalı', () => {
    expect(memurBelgeModulleri(ATAMA_ADLI, 'kimya', KIMLIKSIZ)).toEqual([]);
  });
});
