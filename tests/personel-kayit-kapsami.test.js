import { describe, it, expect } from 'vitest';
import { yetkiAlani, bolumAlanda } from '../server/lib/yetki-alani.js';
import {
  ogrenciKaydiKarari,
  anketYanitiKarari,
  bagliNoFarki,
  degisenAlanlar,
} from '../server/lib/personel-kayit-kapsami.js';

const BOLUMLER = [
  { _docId: 'bilgisayar', facultyId: 'muh' },
  { _docId: 'makine', facultyId: 'muh' },
  { _docId: 'kimya', facultyId: 'fen' },
];
const alanOf = (user, flags, profil, okuma) =>
  yetkiAlani({ user, flags: flags || {}, profil: profil || {}, bolumler: BOLUMLER, okuma });

// Makine bölüm yetkilisi (ek bölümü kimya)
const MAK = { role: 'professor', identifier: 'Dr. A' };
const MAK_F = { deptManager: true };
const MAK_P = { departmentId: 'makine', additionalDepartments: ['kimya'] };
const yonetici = {
  yonetici: true,
  yazmaAlani: alanOf(MAK, MAK_F, MAK_P, false),
  okumaAlani: alanOf(MAK, MAK_F, MAK_P, true),
  alanda: bolumAlanda,
};
// Sade akademisyen (kimya)
const sade = {
  yonetici: false,
  yazmaAlani: alanOf({ role: 'professor' }, {}, { departmentId: 'kimya' }, false),
  okumaAlani: alanOf({ role: 'professor' }, {}, { departmentId: 'kimya' }, true),
  alanda: bolumAlanda,
};

const ogr = (o) => ({
  _docId: 's1',
  studentNumber: '2021001',
  firstName: 'ALİ',
  lastName: 'VELİ',
  departmentId: 'bilgisayar',
  createdAt: new Date('2025-01-01'),
  ...o,
});
const tamKayit = (m, ek) => {
  const gov = { ...m };
  delete gov._docId;
  return { ...gov, createdAt: '2025-01-01T00:00:00.000Z', ...ek };
};

describe('degisenAlanlar', () => {
  it('kaydın tamamı geri gönderildiğinde yalnız değişen alan sayılır', () => {
    const m = ogr({ additionalDepartments: [] });
    expect(degisenAlanlar(tamKayit(m, { erasmusAccess: true }), m)).toEqual(['erasmusAccess']);
  });
  it('boş dizi / tanımsız ve harf farkı değişiklik değildir', () => {
    const m = ogr({ firstName: 'ali' });
    expect(degisenAlanlar({ firstName: 'ALİ', additionalDepartments: [] }, m)).toEqual([]);
  });
});

describe('ogrenciKaydiKarari — bölüm yetkilisi', () => {
  it('kendi bölümüne öğrenci ekler, başka bölüme ekleyemez', () => {
    expect(
      ogrenciKaydiKarari({ ...yonetici, op: { type: 'add', data: { departmentId: 'makine' } } })
        .izin
    ).toBe(true);
    expect(
      ogrenciKaydiKarari({
        ...yonetici,
        op: { type: 'add', data: { departmentId: 'bilgisayar' } },
      }).izin
    ).toBe(false);
  });
  it('var olmayan kimliğe güncelleme (upsert) ekleme sayılır', () => {
    const k = ogrenciKaydiKarari({
      ...yonetici,
      mevcut: null,
      op: { type: 'update', docId: 'x', data: { departmentId: 'bilgisayar' } },
    });
    expect(k.izin).toBe(false);
  });
  it('başka bölümün öğrencisini silemez, kendisininkini siler', () => {
    expect(ogrenciKaydiKarari({ ...yonetici, mevcut: ogr(), op: { type: 'delete' } }).izin).toBe(
      false
    );
    expect(
      ogrenciKaydiKarari({
        ...yonetici,
        mevcut: ogr({ departmentId: 'makine' }),
        op: { type: 'delete' },
      }).izin
    ).toBe(true);
  });
  it('kendi öğrencisinde her alanı düzenler; başka bölüme taşıyamaz', () => {
    const m = ogr({ departmentId: 'makine' });
    expect(
      ogrenciKaydiKarari({
        ...yonetici,
        mevcut: m,
        op: { type: 'update', data: tamKayit(m, { firstName: 'AHMET' }) },
      }).izin
    ).toBe(true);
    expect(
      ogrenciKaydiKarari({
        ...yonetici,
        mevcut: m,
        op: { type: 'update', data: tamKayit(m, { departmentId: 'bilgisayar' }) },
      }).izin
    ).toBe(false);
  });
  it('taşıma: başka bölümden kendi bölümüne alır (mevcut özellik korunur)', () => {
    const m = ogr();
    expect(
      ogrenciKaydiKarari({
        ...yonetici,
        mevcut: m,
        op: { type: 'update', data: tamKayit(m, { departmentId: 'makine' }) },
      }).izin
    ).toBe(true);
  });
  it('başka bölümün öğrencisinin adını değiştiremez', () => {
    const m = ogr();
    const k = ogrenciKaydiKarari({
      ...yonetici,
      mevcut: m,
      op: { type: 'update', data: tamKayit(m, { firstName: 'AHMET' }) },
    });
    expect(k.izin).toBe(false);
    expect(k.hata).toMatch(/firstName/);
  });
  it('ÇAP: başka bölümün öğrencisine kendi bölümünü ekler/çıkarır, başkasını ekleyemez', () => {
    const m = ogr();
    const ekle = (liste) =>
      ogrenciKaydiKarari({
        ...yonetici,
        mevcut: m,
        op: { type: 'update', data: tamKayit(m, { additionalDepartments: liste }) },
      }).izin;
    expect(ekle(['makine'])).toBe(true);
    expect(ekle(['kimya'])).toBe(false); // ek bölüm yazma alanında değil
    const capli = ogr({ additionalDepartments: ['makine'] });
    expect(
      ogrenciKaydiKarari({
        ...yonetici,
        mevcut: capli,
        op: { type: 'update', data: tamKayit(capli, { additionalDepartments: [] }) },
      }).izin
    ).toBe(true);
  });
  it('ÇAP öğrencisinde Erasmus erişimi değişir; ÇAP değilse değişmez', () => {
    const capli = ogr({ additionalDepartments: ['makine'] });
    expect(
      ogrenciKaydiKarari({
        ...yonetici,
        mevcut: capli,
        op: { type: 'update', data: tamKayit(capli, { erasmusAccess: true }) },
      }).izin
    ).toBe(true);
    const m = ogr();
    expect(
      ogrenciKaydiKarari({
        ...yonetici,
        mevcut: m,
        op: { type: 'update', data: tamKayit(m, { erasmusAccess: true }) },
      }).izin
    ).toBe(false);
  });
  it('bağlı numara: yalnız kendi bölümündeki numarayı bağlar', () => {
    const m = ogr();
    const op = (no) => ({
      type: 'update',
      data: tamKayit(m, { bagliOgrenciNolar: [no] }),
    });
    expect(bagliNoFarki(op('2022009'), m)).toEqual(['2022009']);
    expect(
      ogrenciKaydiKarari({
        ...yonetici,
        mevcut: m,
        op: op('2022009'),
        bagliBolumleri: { 2022009: 'makine' },
      }).izin
    ).toBe(true);
    expect(
      ogrenciKaydiKarari({
        ...yonetici,
        mevcut: m,
        op: op('2022010'),
        bagliBolumleri: { 2022010: 'kimya' },
      }).izin
    ).toBe(false);
  });
  it('düzenleme izni ek bölümde de açılır (komisyon işi)', () => {
    const m = ogr({ departmentId: 'kimya' });
    expect(
      ogrenciKaydiKarari({
        ...yonetici,
        mevcut: m,
        op: { type: 'set', merge: true, data: { duzenlemeAcik: true } },
      }).izin
    ).toBe(true);
  });
  it('değişiklik yoksa (kaydın aynısı) izin verilir', () => {
    const m = ogr();
    expect(
      ogrenciKaydiKarari({ ...yonetici, mevcut: m, op: { type: 'update', data: tamKayit(m) } }).izin
    ).toBe(true);
  });
});

describe('ogrenciKaydiKarari — sade akademisyen', () => {
  it('yalnız kendi bölümündeki öğrencinin düzenleme iznini açar', () => {
    const op = { type: 'set', merge: true, data: { duzenlemeAcik: true, duzenlemeAcanKisi: 'B' } };
    expect(ogrenciKaydiKarari({ ...sade, mevcut: ogr({ departmentId: 'kimya' }), op }).izin).toBe(
      true
    );
    expect(ogrenciKaydiKarari({ ...sade, mevcut: ogr(), op }).izin).toBe(false);
  });
  it('başka alan yazamaz, öğrenci ekleyip silemez', () => {
    const m = ogr({ departmentId: 'kimya' });
    expect(
      ogrenciKaydiKarari({
        ...sade,
        mevcut: m,
        op: { type: 'update', data: tamKayit(m, { erasmusAccess: true }) },
      }).izin
    ).toBe(false);
    expect(
      ogrenciKaydiKarari({ ...sade, op: { type: 'add', data: { departmentId: 'kimya' } } }).izin
    ).toBe(false);
    expect(ogrenciKaydiKarari({ ...sade, mevcut: m, op: { type: 'delete' } }).izin).toBe(false);
  });
});

describe('anketYanitiKarari', () => {
  it('ekleme yazanın adına damgalanır; profil id kabul, yabancı kimlik değiştirilir', () => {
    const op = { type: 'add', data: { userId: 'p-12', studentNumber: '2021001', role: 'student' } };
    expect(anketYanitiKarari({ op, ident: 'Dr. A', kimlikler: ['p-12'] }).izin).toBe(true);
    expect(op.data.userId).toBe('p-12');
    expect(op.data.studentNumber).toBeUndefined();
    expect(op.data.role).toBe('professor');
    expect(op.data.yanitlayanKimlik).toBe('Dr. A');
    const op2 = { type: 'add', data: { userId: 'Başka Kişi' } };
    anketYanitiKarari({ op: op2, ident: 'Dr. A', kimlikler: ['p-12'] });
    expect(op2.data.userId).toBe('Dr. A');
  });
  it('var olan yanıtı değiştirmek/silmek yalnız üst yetkide', () => {
    const mevcut = { userId: 'x' };
    expect(anketYanitiKarari({ op: { type: 'delete' }, mevcut, ident: 'Dr. A' }).izin).toBe(false);
    expect(
      anketYanitiKarari({ op: { type: 'update', data: {} }, mevcut, ident: 'Dr. A' }).izin
    ).toBe(false);
    expect(
      anketYanitiKarari({ op: { type: 'delete' }, mevcut, ident: 'Dr. A', ustYetki: true }).izin
    ).toBe(true);
  });
});
