import { describe, it, expect } from 'vitest';
import {
  yetkiAlani,
  bolumAlanda,
  fakulteAlanda,
  bolumKaydiKarari,
  ekBolumKarari,
  yapisalKarar,
  yayinKapsamKarari,
  basvurulariSuz,
} from '../server/lib/yetki-alani.js';

const KIM = '6a2efa1e00000000000000aa';
const BOLUMLER = [
  { _docId: 'bilgisayar', id: 'bilgisayar', facultyId: 'muh' },
  { _docId: 'makine', facultyId: 'muh' },
  { _docId: KIM, code: 'KIM', facultyId: 'fen', eskiKimlikler: ['kimya'] },
];
const alan = (user, flags, profil, okuma) =>
  yetkiAlani({ user, flags: flags || {}, profil: profil || {}, bolumler: BOLUMLER, okuma });

const uni = alan({ role: 'professor' }, { uniAdmin: true });
const dekMuh = alan(
  { role: 'professor' },
  { facManager: true },
  { facultyId: 'muh', departmentId: 'makine' }
);
const basKim = alan({ role: 'professor' }, { deptManager: true }, { departmentId: 'kimya' });
const secBil = alan({ role: 'bolum_yetkilisi', departmentId: 'bilgisayar' });
const hoca = alan({ role: 'professor' }, {}, { departmentId: 'bilgisayar' });
const hocaOkuma = alan({ role: 'professor' }, {}, { departmentId: 'bilgisayar' }, true);

describe('yetki alanı', () => {
  it('seviye ve bölümler', () => {
    expect(uni.tur).toBe('universite');
    expect(dekMuh.tur).toBe('fakulte');
    expect(bolumAlanda(dekMuh, 'bilgisayar')).toBe(true);
    expect(bolumAlanda(dekMuh, 'makine')).toBe(true);
    expect(bolumAlanda(dekMuh, KIM)).toBe(false);
    expect(fakulteAlanda(dekMuh, 'muh')).toBe(true);
    expect(fakulteAlanda(dekMuh, 'fen')).toBe(false);
  });
  it('bölüm kimliği varyantlarıyla eşleşir (slug ↔ ObjectId ↔ kod)', () => {
    expect(bolumAlanda(basKim, KIM)).toBe(true);
    expect(bolumAlanda(basKim, 'kimya')).toBe(true);
    expect(bolumAlanda(basKim, 'KIM')).toBe(true);
    expect(bolumAlanda(basKim, 'bilgisayar')).toBe(false);
  });
  it('sade akademisyenin yazma alanı yok, okuma alanı kendi bölümü', () => {
    expect(hoca.tur).toBe('yok');
    expect(bolumAlanda(hoca, 'bilgisayar')).toBe(false);
    expect(bolumAlanda(hocaOkuma, 'bilgisayar')).toBe(true);
    expect(bolumAlanda(hocaOkuma, 'makine')).toBe(false);
  });
  it('ayrı bölüm yetkilisi girişi yalnız kendi bölümü', () => {
    expect(secBil.tur).toBe('bolum');
    expect(bolumAlanda(secBil, 'bilgisayar')).toBe(true);
    expect(bolumAlanda(secBil, 'makine')).toBe(false);
  });
});

describe('yazma kararları', () => {
  it('bölüm kayıtları: yalnız alandaki bölüm', () => {
    const op = {
      collection: 'mezuniyet_kurallari',
      type: 'set',
      docId: KIM,
      data: { departmentId: KIM },
    };
    expect(bolumKaydiKarari('mezuniyet_kurallari', op, null, basKim).izin).toBe(true);
    expect(bolumKaydiKarari('mezuniyet_kurallari', op, null, secBil).izin).toBe(false);
    expect(bolumKaydiKarari('mezuniyet_kurallari', op, null, dekMuh).izin).toBe(false);
    expect(bolumKaydiKarari('mezuniyet_kurallari', op, null, uni).izin).toBe(true);
  });
  it('mevcut kaydın bölümü de denetlenir (başka bölümün kaydını kendi bölümüne çekemez)', () => {
    const op = {
      collection: 'yol_haritalari',
      type: 'update',
      docId: 'y1',
      data: { departmentId: 'bilgisayar' },
    };
    expect(bolumKaydiKarari('yol_haritalari', op, { departmentId: KIM }, secBil).izin).toBe(false);
  });
  it('bölümsüz kayıt yalnız üniversite düzeyinde', () => {
    const op = { collection: 'yol_haritalari', type: 'update', docId: 'y1', data: { baslik: 'x' } };
    expect(bolumKaydiKarari('yol_haritalari', op, {}, secBil).izin).toBe(false);
    expect(bolumKaydiKarari('yol_haritalari', op, {}, uni).izin).toBe(true);
  });
  it('yapısal: fakülte yetkilisi yalnız kendi fakültesi; üniversite kaydı ve kurum ayarı yalnız üniversite', () => {
    const fenBolum = { _docId: KIM, facultyId: 'fen' };
    expect(
      yapisalKarar('departments', { type: 'update', docId: KIM, data: {} }, fenBolum, dekMuh).izin
    ).toBe(false);
    expect(
      yapisalKarar('departments', { type: 'add', data: { facultyId: 'fen' } }, null, dekMuh).izin
    ).toBe(false);
    expect(
      yapisalKarar('departments', { type: 'add', data: { facultyId: 'muh' } }, null, dekMuh).izin
    ).toBe(true);
    expect(
      yapisalKarar(
        'departments',
        { type: 'update', docId: 'makine', data: { facultyId: 'fen' } },
        { facultyId: 'muh' },
        dekMuh
      ).izin
    ).toBe(false);
    expect(
      yapisalKarar(
        'faculties',
        { type: 'update', docId: 'fen', data: {} },
        { _docId: 'fen' },
        dekMuh
      ).izin
    ).toBe(false);
    expect(
      yapisalKarar(
        'faculties',
        { type: 'update', docId: 'muh', data: {} },
        { _docId: 'muh' },
        dekMuh
      ).izin
    ).toBe(true);
    expect(yapisalKarar('faculties', { type: 'add', data: {} }, null, dekMuh).izin).toBe(false);
    expect(
      yapisalKarar('universities', { type: 'update', docId: 'caku', data: {} }, {}, dekMuh).izin
    ).toBe(false);
    expect(
      yapisalKarar('tenant_config', { type: 'set', docId: 'genel', data: {} }, {}, dekMuh).izin
    ).toBe(false);
    expect(
      yapisalKarar('tenant_config', { type: 'set', docId: 'genel', data: {} }, {}, uni).izin
    ).toBe(true);
  });
  it('yayın kapsamı yayımlayanın alanını aşamaz', () => {
    expect(yayinKapsamKarari({ kapsamTuru: 'universite' }, dekMuh).izin).toBe(false);
    expect(yayinKapsamKarari({ kapsamTuru: 'universite' }, uni).izin).toBe(true);
    expect(
      yayinKapsamKarari(
        { kapsamTuru: 'fakulte', facultyId: 'muh', kapsamDepartmentIds: ['bilgisayar', 'makine'] },
        dekMuh
      ).izin
    ).toBe(true);
    expect(
      yayinKapsamKarari(
        { kapsamTuru: 'fakulte', facultyId: 'muh', kapsamDepartmentIds: ['bilgisayar'] },
        secBil
      ).izin
    ).toBe(false);
    expect(
      yayinKapsamKarari({ kapsamTuru: 'bolum', kapsamDepartmentIds: ['bilgisayar'] }, secBil).izin
    ).toBe(true);
    expect(
      yayinKapsamKarari({ kapsamTuru: 'bolum', kapsamDepartmentIds: ['bilgisayar', KIM] }, secBil)
        .izin
    ).toBe(false);
    expect(yayinKapsamKarari({ kapsamTuru: 'bolum', kapsamDepartmentIds: [] }, secBil).izin).toBe(
      false
    );
    expect(yayinKapsamKarari({ baslik: 'yalnız metin' }, secBil).izin).toBe(true);
  });
});

describe('başvuru okuma süzgeci', () => {
  const kayitlar = [
    { id: 1, basvurduguBolumId: 'bilgisayar' },
    { id: 2, departmentId: KIM },
    { id: 3 }, // bölümü çözülemeyen (ekranda "sahipsiz" diye bildiriliyor)
  ];
  it('personel yalnız alanındaki başvuruları görür', () => {
    expect(basvurulariSuz('yatay_gecis_basvurular', kayitlar, hocaOkuma).map((r) => r.id)).toEqual([
      1, 3,
    ]);
    expect(basvurulariSuz('yatay_gecis_basvurular', kayitlar, uni)).toHaveLength(3);
    expect(basvurulariSuz('yatay_gecis_basvurular', kayitlar, basKim).map((r) => r.id)).toEqual([
      2, 3,
    ]);
  });
  it('bölümsüz eski muafiyet kaydı Bilgisayar sayılır (ekranla aynı kural)', () => {
    const m = [{ id: 'a' }, { id: 'b', departmentId: 'makine' }];
    expect(basvurulariSuz('muafiyet_records', m, hocaOkuma).map((r) => r.id)).toEqual(['a']);
    expect(basvurulariSuz('muafiyet_records', m, dekMuh).map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('ÇAP ve staj başvuruları da bölüme daralır', () => {
  it('başka bölümün başvurusu düşer, bölümsüz eski kayıt kalır', () => {
    const k = [{ id: 1, departmentId: 'bilgisayar' }, { id: 2, departmentId: 'makine' }, { id: 3 }];
    expect(basvurulariSuz('cap_yandal_basvurular', k, hocaOkuma).map((r) => r.id)).toEqual([1, 3]);
    expect(basvurulariSuz('internship_applications', k, hocaOkuma).map((r) => r.id)).toEqual([
      1, 3,
    ]);
    expect(basvurulariSuz('internship_applications', k, dekMuh).map((r) => r.id)).toEqual([
      1, 2, 3,
    ]);
  });
});

describe('ad üzerinden eşleşen kimlikler (gömülü slug ↔ veritabanı ObjectId)', () => {
  const DB = [
    { _docId: '6a00000000000000000000b1', name: 'Bilgisayar Mühendisliği', facultyId: 'muh' },
    { _docId: 'bil', name: 'Bilgisayar Mühendisliği', facultyId: 'muh' },
    { _docId: '6a00000000000000000000b2', name: 'Bilgisayar Mühendisliği', facultyId: 'tek' },
  ];
  const a = yetkiAlani({
    user: { role: 'bolum_yetkilisi', departmentId: 'bilgisayar' },
    bolumler: DB,
  });
  it('profilinde slug yazan yetkili kendi bölümünün ObjectId kaydını tanır', () => {
    const tek = yetkiAlani({
      user: { role: 'bolum_yetkilisi', departmentId: 'bilgisayar' },
      bolumler: DB.slice(0, 2),
    });
    expect(bolumAlanda(tek, '6a00000000000000000000b1')).toBe(true);
    expect(bolumAlanda(tek, 'bil')).toBe(true);
  });
  it('ad iki fakültede varsa slug belirsizdir, hiçbirine bağlanmaz', () => {
    expect(bolumAlanda(a, '6a00000000000000000000b1')).toBe(false);
    expect(bolumAlanda(a, 'bilgisayar')).toBe(true);
  });
  it('aynı adlı bölüm BAŞKA fakültedeyse eşleşmez', () => {
    const m = yetkiAlani({
      user: { role: 'bolum_yetkilisi', departmentId: '6a00000000000000000000b1' },
      bolumler: DB,
    });
    expect(bolumAlanda(m, 'bil')).toBe(true);
    expect(bolumAlanda(m, '6a00000000000000000000b2')).toBe(false);
  });
});

describe('başka bölümün akademisyenini kendi bölümüne ek bölüm olarak bağlama', () => {
  const mevcut = { departmentId: 'makine', name: 'Prof. Dr. X', additionalDepartments: [KIM] };
  const op = (liste, ek) => ({
    collection: 'professors',
    type: 'set',
    merge: true,
    docId: 'p1',
    data: { additionalDepartments: liste, updatedAt: 'x', ...(ek || {}) },
  });
  it('bölüm yetkilisi kendi bölümünü ekleyip çıkarabilir', () => {
    expect(ekBolumKarari(op([KIM, 'bilgisayar']), mevcut, secBil).izin).toBe(true);
    expect(
      ekBolumKarari(op([KIM]), { ...mevcut, additionalDepartments: [KIM, 'bilgisayar'] }, secBil)
        .izin
    ).toBe(true);
  });
  it('başka bölümün bağına ya da kaydın diğer alanlarına dokunamaz', () => {
    expect(ekBolumKarari(op(['bilgisayar']), mevcut, secBil).izin).toBe(false); // KIM silindi
    expect(ekBolumKarari(op([KIM, 'bilgisayar', 'makine']), mevcut, secBil).izin).toBe(false);
    expect(ekBolumKarari(op([KIM, 'bilgisayar'], { name: 'Y' }), mevcut, secBil).izin).toBe(false);
    expect(ekBolumKarari({ ...op([KIM, 'bilgisayar']), merge: false }, mevcut, secBil).izin).toBe(
      false
    );
    expect(ekBolumKarari(op([KIM, 'bilgisayar']), null, secBil).izin).toBe(false);
  });
  it('fakülte yetkilisi kendi fakültesinin bölümünü bağlayabilir', () => {
    expect(ekBolumKarari(op([KIM, 'bilgisayar']), mevcut, dekMuh).izin).toBe(true);
    expect(ekBolumKarari(op([]), mevcut, dekMuh).izin).toBe(false); // KIM fen fakültesinde
  });
});
