import { describe, it, expect } from 'vitest';
import {
  aktifBolumKarari,
  aktifFakulteId,
  bolumKapsami,
  fakulteBasligi,
  fakulteKapsamli,
} from '../lib/bolum-kapsam.js';

const ORMAN = [
  { id: 'orman-muh', name: 'Orman Mühendisliği', facultyId: 'orman-fak' },
  { id: 'peyzaj', name: 'Peyzaj Mimarlığı', facultyId: 'orman-fak' },
];

describe('fakulteKapsamli', () => {
  it('fakülte yetkilisi kendi fakültesine bağlıdır', () => {
    expect(fakulteKapsamli({ isFacultyManager: true, facultyId: 'orman-fak' })).toBe(true);
  });

  it('memur kendi fakültesine bağlıdır', () => {
    expect(fakulteKapsamli({ role: 'memur', facultyId: 'orman-fak' })).toBe(true);
  });

  it('üniversite yetkilisi yalnız fakülte kapsamındayken bağlıdır', () => {
    const u = { isUniversityAdmin: true, isFacultyManager: true, facultyId: 'orman-fak' };
    expect(fakulteKapsamli(u, 'university')).toBe(false);
    expect(fakulteKapsamli(u, 'faculty')).toBe(true);
  });

  it('fakülte geneli staj koordinatörü kapsam dışıdır (tüm bölümleri görür)', () => {
    expect(
      fakulteKapsamli({ isFacultyManager: true, isStajCoordinator: true, facultyId: 'orman-fak' })
    ).toBe(false);
  });

  it('akademisyen ve öğrenci fakülte kapsamlı değildir', () => {
    expect(fakulteKapsamli({ role: 'professor', facultyId: 'orman-fak' })).toBe(false);
    expect(fakulteKapsamli({ role: 'student', departmentId: 'makine' })).toBe(false);
  });

  it('fakültesi olmayan kullanıcı kapsamlı değildir', () => {
    expect(fakulteKapsamli({ isFacultyManager: true })).toBe(false);
    expect(fakulteKapsamli(null)).toBe(false);
  });
});

describe('aktifFakulteId / fakulteBasligi', () => {
  const BOLUMLER = [
    ...ORMAN,
    // Koda gömülü eski kayıtlar facultyId taşımaz
    { id: 'makine', name: 'Makine Mühendisliği' },
    { id: 'fizik', name: 'Fizik', facultyId: 'fen-fak' },
  ];
  const ADLAR = { 'orman-fak': 'Orman Fakültesi', 'fen-fak': 'Fen Fakültesi' };
  const VARSAYILAN = 'Mühendislik Fakültesi';

  it('bant, aktif bölümün fakültesini gösterir', () => {
    const ad = fakulteBasligi({
      aktifBolum: 'peyzaj',
      bolumler: BOLUMLER,
      kullanici: { isFacultyManager: true, facultyId: 'orman-fak' },
      fakulteAdlari: ADLAR,
      varsayilan: VARSAYILAN,
    });
    expect(ad).toBe('Orman Fakültesi');
  });

  it('üniversite yetkilisi başka fakültenin bölümüne geçince bant onu gösterir', () => {
    const ad = fakulteBasligi({
      aktifBolum: 'fizik',
      bolumler: BOLUMLER,
      kullanici: { isUniversityAdmin: true, facultyId: 'orman-fak' },
      fakulteAdlari: ADLAR,
      varsayilan: VARSAYILAN,
    });
    expect(ad).toBe('Fen Fakültesi');
  });

  it('bölümün fakültesi bilinmiyorsa kullanıcının fakültesine düşer', () => {
    // makine kaydı facultyId taşımıyor
    expect(
      aktifFakulteId({
        aktifBolum: 'makine',
        bolumler: BOLUMLER,
        kullanici: { facultyId: 'orman-fak' },
      })
    ).toBe('orman-fak');
  });

  it('hiçbir fakülte çözülemezse kurum varsayılanı yazılır', () => {
    expect(
      fakulteBasligi({
        aktifBolum: 'makine',
        bolumler: BOLUMLER,
        kullanici: { role: 'professor' },
        fakulteAdlari: ADLAR,
        varsayilan: VARSAYILAN,
      })
    ).toBe(VARSAYILAN);
  });

  it('fakülte adı henüz yüklenmediyse ham kimlik basılmaz', () => {
    // faculties okuması gecikirse bantta "orman-fak" gibi bir dize durmamalı
    expect(
      fakulteBasligi({
        aktifBolum: 'peyzaj',
        bolumler: BOLUMLER,
        kullanici: {},
        fakulteAdlari: {},
        varsayilan: VARSAYILAN,
      })
    ).toBe(VARSAYILAN);
  });

  it('bozuk girdide çökmez', () => {
    expect(aktifFakulteId()).toBe('');
    expect(fakulteBasligi()).toBe('');
  });
});

describe('bolumKapsami', () => {
  it('fakülte yetkilisi fakülte kapsamlıdır', () => {
    expect(bolumKapsami({ isFacultyManager: true, facultyId: 'orman-fak' })).toBe('fakulte');
  });

  it('bölümü olan akademisyen bölüm kapsamlıdır', () => {
    expect(bolumKapsami({ role: 'professor', departmentId: 'orman-muh' })).toBe('bolum');
  });

  it('yalnız ek bölümü olan akademisyen de bölüm kapsamlıdır', () => {
    expect(bolumKapsami({ role: 'professor', additionalDepartments: ['peyzaj'] })).toBe('bolum');
  });

  it('üniversite yetkilisinin (üniversite kapsamında) kapsamı yoktur', () => {
    expect(bolumKapsami({ isUniversityAdmin: true, facultyId: 'orman-fak' }, 'university')).toBe(
      'yok'
    );
  });
});

describe('aktifBolumKarari', () => {
  it('aktif bölüm izinliyse dokunulmaz', () => {
    const k = aktifBolumKarari({
      izinliler: ORMAN,
      aktif: 'peyzaj',
      kapsam: 'fakulte',
      bolumlerYuklendi: true,
    });
    expect(k).toEqual({ durum: 'gecerli', bolumId: 'peyzaj', sebep: '' });
  });

  it('aktif bölüm kapsam dışıysa ilk izinli bölüme geçilir', () => {
    // Bildirilen hata: Orman Fakültesi yetkilisi Makine Mühendisliği'nde kalıyordu.
    const k = aktifBolumKarari({
      izinliler: ORMAN,
      aktif: 'makine',
      kapsam: 'fakulte',
      bolumlerYuklendi: true,
    });
    expect(k.durum).toBe('degistir');
    expect(k.bolumId).toBe('orman-muh');
    expect(k.sebep).toBe('kapsam_disi');
  });

  it('BÖLÜMLER YÜKLENMEDEN boş liste "kısıt yok" sayılmaz — beklenir', () => {
    // Hatanın kökü: açılışta DB bölümleri (facultyId taşıyan tek kaynak) henüz
    // yokken liste boş kalıyor, boş liste kısıtsızlık sanılıyordu.
    const k = aktifBolumKarari({
      izinliler: [],
      aktif: 'makine',
      kapsam: 'fakulte',
      bolumlerYuklendi: false,
    });
    expect(k.durum).toBe('bekle');
    expect(k.sebep).toBe('bolumler_yuklenmedi');
    expect(k.bolumId).toBe('');
  });

  it('yüklendiği hâlde liste boşsa fakültede bölüm yoktur — yine beklenir', () => {
    const k = aktifBolumKarari({
      izinliler: [],
      aktif: 'makine',
      kapsam: 'fakulte',
      bolumlerYuklendi: true,
    });
    expect(k.durum).toBe('bekle');
    expect(k.sebep).toBe('fakultede_bolum_yok');
  });

  it('kapsamı olmayan kullanıcıda boş liste eskisi gibi serbesttir', () => {
    const k = aktifBolumKarari({
      izinliler: [],
      aktif: 'bilgisayar',
      kapsam: 'yok',
      bolumlerYuklendi: false,
    });
    expect(k.durum).toBe('gecerli');
    expect(k.bolumId).toBe('bilgisayar');
  });

  it('bölümü DB’den gelen akademisyen de liste yüklenene kadar bekler', () => {
    // Aynı kusurun bölüm kapsamlı hâli: bölümü sabit listede olmayan bir
    // akademisyen, açılışta varsayılan (yabancı) bölümde kalıyordu.
    const bekleyen = aktifBolumKarari({
      izinliler: [],
      aktif: 'makine',
      kapsam: 'bolum',
      bolumlerYuklendi: false,
    });
    expect(bekleyen.durum).toBe('bekle');
    expect(bekleyen.sebep).toBe('bolumler_yuklenmedi');

    const yuklendi = aktifBolumKarari({
      izinliler: [],
      aktif: 'makine',
      kapsam: 'bolum',
      bolumlerYuklendi: true,
    });
    expect(yuklendi.durum).toBe('bekle');
    expect(yuklendi.sebep).toBe('bolum_bulunamadi');
  });

  it('aktif bölüm boşken ilk izinli bölüm seçilir', () => {
    const k = aktifBolumKarari({
      izinliler: ORMAN,
      aktif: '',
      kapsam: 'fakulte',
      bolumlerYuklendi: true,
    });
    expect(k.durum).toBe('degistir');
    expect(k.bolumId).toBe('orman-muh');
    expect(k.sebep).toBe('bos');
  });

  it('bozuk girdide çökmez', () => {
    expect(aktifBolumKarari().durum).toBe('gecerli');
    expect(aktifBolumKarari({ izinliler: null, aktif: null }).durum).toBe('gecerli');
  });
});
