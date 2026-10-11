import { describe, it, expect } from 'vitest';
import {
  adayKayitHatalari,
  adayKaydiSadele,
  adayModulleri,
  adayYatayTurleri,
  tcMaskele,
  telefonSadele,
} from '../lib/aday-hesap.js';
import { adayNoMu as istemciAdayNoMu, adayNoUret } from '../lib/aday-kimlik.js';
import {
  adayNoMu,
  jetonKullanicisi,
  adayOkuyabilirMi,
  adayYazmaKarari,
} from '../server/lib/aday-yetki.js';

const GECERLI_TC = '10000000146';
const form = (ek) => ({
  ad: 'Ayşe',
  soyad: 'Yılmaz',
  tc: GECERLI_TC,
  eposta: 'ayse@ornek.com',
  telefon: '0532 123 45 67',
  turler: ['kurumlararasi'],
  departmentId: 'bilgisayar',
  sifre: 'gizli1234',
  sifre2: 'gizli1234',
  kvkk: true,
  ...ek,
});

describe('aday kayıt formu', () => {
  it('geçerli form hatasız', () => {
    expect(adayKayitHatalari(form())).toEqual({});
  });
  it('T.C. kimlik no algoritmayla denetlenir', () => {
    expect(adayKayitHatalari(form({ tc: '12345678901' })).tc).toBeTruthy();
    expect(adayKayitHatalari(form({ tc: '1000000014' })).tc).toBeTruthy();
  });
  it('kurum içi yatay geçiş aday türü değildir', () => {
    expect(adayKayitHatalari(form({ turler: ['kurumici'] })).turler).toBeTruthy();
    expect(adayKayitHatalari(form({ turler: [] })).turler).toBeTruthy();
  });
  it('şifre en az 8 karakter, harf ve rakam', () => {
    expect(adayKayitHatalari(form({ sifre: 'abc12', sifre2: 'abc12' })).sifre).toBeTruthy();
    expect(adayKayitHatalari(form({ sifre: 'abcdefgh', sifre2: 'abcdefgh' })).sifre).toBeTruthy();
    expect(adayKayitHatalari(form({ sifre2: 'baska1234' })).sifre2).toBeTruthy();
  });
  it('aydınlatma onayı zorunlu, telefon 5 ile başlayan 10 hane', () => {
    expect(adayKayitHatalari(form({ kvkk: false })).kvkk).toBeTruthy();
    expect(adayKayitHatalari(form({ telefon: '312 123 45 67' })).telefon).toBeTruthy();
    expect(telefonSadele('+90 532 123 45 67')).toBe('5321234567');
  });
  it('sadeleştirme fazla alanı ve geçersiz türü atar', () => {
    const v = adayKaydiSadele({
      ...form({ turler: ['dikey', 'dikey', 'kurumici'] }),
      rol: 'admin',
    });
    expect(v.turler).toEqual(['dikey']);
    expect(v.rol).toBeUndefined();
    expect(v.eposta).toBe('ayse@ornek.com');
  });
  it('T.C. maskeli gösterilir', () => {
    expect(tcMaskele(GECERLI_TC)).toBe('100******46');
  });
  it('türden modül ve yatay tür listesi', () => {
    expect(adayModulleri(['merkezi', 'dikey', 'kurumlararasi'])).toEqual([
      'dikeygecis',
      'yataygecis',
    ]);
    expect(adayYatayTurleri(['dikey', 'merkezi'])).toEqual(['merkezi']);
  });
});

describe('aday yetkisi (sunucu)', () => {
  const aday = jetonKullanicisi({
    role: 'aday',
    identifier: 'ADAY-2026-0007',
    departmentId: 'bilgisayar',
    turler: ['kurumlararasi', 'admin'],
  });

  it('aday numarası kalıbı istemci kuralıyla aynı', () => {
    ['ADAY-2026-0001', 'aday-2026-12', '240905054', '', 'ADAY-26-1', adayNoUret([], 2026)].forEach(
      (no) => expect(adayNoMu(no)).toBe(istemciAdayNoMu(no))
    );
  });

  it('aday jetonu öğrenci + aday bayrağına çözülür (asla personel sayılmaz)', () => {
    expect(aday.role).toBe('student');
    expect(aday.aday).toBe(true);
    expect(aday.turler).toEqual(['kurumlararasi']);
    const ogr = { role: 'student', identifier: '240905054' };
    expect(jetonKullanicisi(ogr)).toBe(ogr);
  });

  it('okuma izin listesi', () => {
    expect(adayOkuyabilirMi('yatay_gecis_basvurular', aday)).toBe(true);
    expect(adayOkuyabilirMi('departments', aday)).toBe(true);
    ['portal_posts', 'students', 'internship_applications', 'surveys', 'student_courses'].forEach(
      (k) => expect(adayOkuyabilirMi(k, aday)).toBe(false)
    );
    // Öğrenci ve personel etkilenmez
    expect(adayOkuyabilirMi('portal_posts', { role: 'student' })).toBe(true);
  });

  it('yalnız kendi türünde başvuru açar', () => {
    const ekle = (collection, data) => adayYazmaKarari({ collection, type: 'add', data }, aday);
    expect(ekle('yatay_gecis_basvurular', { turu: 'kurumlararasi', degerlendirme: '' }).izin).toBe(
      true
    );
    expect(ekle('yatay_gecis_basvurular', { turu: 'merkezi' }).izin).toBe(false);
    expect(ekle('yatay_gecis_basvurular', { turu: 'kurumici' }).izin).toBe(false);
    expect(ekle('yatay_gecis_basvurular', {}).izin).toBe(false);
    expect(ekle('muafiyet_records', { basvuruTuru: 'dikey' }).izin).toBe(false);
    expect(ekle('portal_posts', {}).izin).toBe(false);
    expect(ekle('students', {}).izin).toBe(false);
  });

  it('değerlendirme alanlarına dokunamaz', () => {
    expect(
      adayYazmaKarari(
        {
          collection: 'yatay_gecis_basvurular',
          type: 'add',
          data: { turu: 'kurumlararasi', degerlendirme: 'asil' },
        },
        aday
      ).izin
    ).toBe(false);
    expect(
      adayYazmaKarari(
        {
          collection: 'yatay_gecis_basvurular',
          type: 'update',
          docId: 'x',
          data: { degerlendirme: 'asil' },
        },
        aday
      ).izin
    ).toBe(false);
    expect(
      adayYazmaKarari(
        {
          collection: 'yatay_gecis_basvurular',
          type: 'update',
          docId: 'x',
          data: { telefon: '5' },
        },
        aday
      ).izin
    ).toBe(true);
  });

  it('dikey aday muafiyet talebini yalnız dikey türünde açar', () => {
    const dikey = jetonKullanicisi({
      role: 'aday',
      identifier: 'ADAY-2026-0008',
      turler: ['dikey'],
    });
    const k = (basvuruTuru) =>
      adayYazmaKarari({ collection: 'muafiyet_records', type: 'add', data: { basvuruTuru } }, dikey)
        .izin;
    expect(k('dikey')).toBe(true);
    expect(k('muafiyet')).toBe(false);
    expect(k('intibak')).toBe(false);
  });
});

import {
  donemDurumu,
  donemUyarilari,
  donemHatalari,
  donemleriSadele,
  adaySilmeTarihi,
  adaySilinmeliMi,
  ADAY_SAKLAMA_GUN,
} from '../lib/aday-hesap.js';

describe('başvuru dönemleri', () => {
  const d = { baslangic: '2026-07-01', bitis: '2026-07-15' };
  it('durum: önce / açık / bitti / tanımsız', () => {
    expect(donemDurumu(d, '2026-06-30')).toBe('once');
    expect(donemDurumu(d, '2026-07-01')).toBe('acik');
    expect(donemDurumu(d, '2026-07-15')).toBe('acik');
    expect(donemDurumu(d, '2026-07-16')).toBe('bitti');
    expect(donemDurumu({}, '2026-07-16')).toBe('tanimsiz');
  });
  it('dönem dışında uyarı verir, tanımsız türde vermez', () => {
    const u = donemUyarilari(['kurumlararasi', 'dikey'], { kurumlararasi: d }, '2026-08-01');
    expect(u).toHaveLength(1);
    expect(u[0].mesaj).toMatch(/başvuru tarihleri uygun değildir/);
    expect(u[0].mesaj).toMatch(/15\.07\.2026/);
    expect(donemUyarilari(['kurumlararasi'], { kurumlararasi: d }, '2026-07-05')).toEqual([]);
  });
  it('fakülte yetkilisinin girişi denetlenir', () => {
    expect(
      donemHatalari({ dikey: { baslangic: '2026-07-10', bitis: '2026-07-01' } }).dikey
    ).toBeTruthy();
    expect(donemHatalari({ dikey: { baslangic: '2026-07-10' } }).dikey).toBeTruthy();
    expect(donemHatalari({ kurumici: d }).kurumici).toBeTruthy();
    expect(donemHatalari({ dikey: { baslangic: '', bitis: '' } })).toEqual({});
    expect(donemleriSadele({ dikey: d, merkezi: { baslangic: '' }, x: d })).toEqual({ dikey: d });
  });
});

describe('otomatik silme takvimi', () => {
  const donemler = [{ kurumlararasi: { baslangic: '2026-07-01', bitis: '2026-07-15' } }];
  const aday = { durum: 'aktif', turler: ['kurumlararasi'] };
  it(`dönem bitişinden ${ADAY_SAKLAMA_GUN} gün sonra (kazanamayan)`, () => {
    const b = { donemler, yatay: [{ degerlendirme: 'uygun_degil' }] };
    expect(adaySilmeTarihi(aday, b).tarih).toBe('2026-08-14');
    expect(adaySilinmeliMi(aday, b, '2026-08-13')).toBe(false);
    expect(adaySilinmeliMi(aday, b, '2026-08-14')).toBe(true);
  });
  it('başvurusu olmayan aday da dönem bitince silinir', () => {
    expect(adaySilmeTarihi(aday, { donemler }).tarih).toBe('2026-08-14');
  });
  it('kazanan, değerlendirmesi süren, aktarılan ve dönemi tanımsız silinmez', () => {
    expect(
      adaySilmeTarihi(aday, { donemler, yatay: [{ degerlendirme: 'uygun_asil' }] }).tarih
    ).toBeNull();
    expect(
      adaySilmeTarihi(aday, { donemler, yatay: [{ degerlendirme: 'uygun_yedek' }] }).tarih
    ).toBeNull();
    expect(adaySilmeTarihi(aday, { donemler, yatay: [{ degerlendirme: '' }] }).tarih).toBeNull();
    expect(
      adaySilmeTarihi(
        { ...aday, turler: ['dikey'] },
        { donemler, dikey: [{ pendingReviewCount: 2 }] }
      ).tarih
    ).toBeNull();
    expect(adaySilmeTarihi({ ...aday, durum: 'aktarildi' }, { donemler }).tarih).toBeNull();
    const dk = [{ dikey: { baslangic: '2026-07-01', bitis: '2026-07-15' } }];
    expect(
      adaySilmeTarihi(
        { ...aday, turler: ['dikey'] },
        { donemler: dk, dikey: [{ approvedCount: 3 }] }
      ).tarih
    ).toBeNull();
    expect(
      adaySilmeTarihi(
        { ...aday, turler: ['dikey'] },
        { donemler: dk, dikey: [{ approvedCount: 0, rejectedCount: 2 }] }
      ).tarih
    ).toBe('2026-08-14');
    expect(adaySilmeTarihi({ ...aday, turler: ['dikey'] }, { donemler }).tarih).toBeNull();
  });
  it('kapatılan hesap kapatmadan 30 gün sonra (kazanmış olsa bile)', () => {
    const k = { durum: 'kapali', turler: ['dikey'], kapatmaZamani: '2026-09-01T10:00:00Z' };
    expect(adaySilmeTarihi(k, { yatay: [{ degerlendirme: 'uygun_asil' }] }).tarih).toBe(
      '2026-10-01'
    );
  });
});

describe('aday sahiplik alanı', () => {
  const ad = jetonKullanicisi({
    role: 'aday',
    identifier: 'ADAY-2026-0009',
    turler: ['kurumlararasi'],
  });
  it('başvurusunu başka numaraya devredemez', () => {
    const k = (data) =>
      adayYazmaKarari(
        { collection: 'yatay_gecis_basvurular', type: 'update', docId: 'x', data },
        ad
      ).izin;
    expect(k({ ogrenciNo: '240905054' })).toBe(false);
    expect(k({ _owner: 'ADAY-2026-0001' })).toBe(false);
    expect(k({ ogrenciNo: 'ADAY-2026-0009' })).toBe(true);
  });
});
