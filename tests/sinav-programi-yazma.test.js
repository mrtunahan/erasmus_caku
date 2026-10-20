import { describe, it, expect } from 'vitest';
import { sinavProgramiYazmaKarari, kisiAnahtari } from '../server/lib/sinav-programi-yazma.js';
import { yetkiAlani } from '../server/lib/yetki-alani.js';

const BOLUMLER = [
  { _docId: 'bilgisayar', id: 'bilgisayar', facultyId: 'muh' },
  { _docId: 'makine', facultyId: 'muh' },
  { _docId: 'matematik', facultyId: 'fen' },
];
const alan = (user, flags, profil) =>
  yetkiAlani({ user, flags: flags || {}, profil: profil || {}, bolumler: BOLUMLER });
const hoca = alan({ role: 'professor' }, {}, { departmentId: 'matematik' });
const bolumYet = alan({ role: 'bolum_yetkilisi', departmentId: 'bilgisayar' });
const dekan = alan(
  { role: 'professor' },
  { facManager: true },
  { facultyId: 'muh', departmentId: 'makine' }
);

const K = 'Dr. Öğr. Üyesi Celalettin KAYA';
const sinav = { departmentId: 'bilgisayar', code: 'MAT161', professor: K };
const up = (data, coll) => ({
  collection: coll || 'sinav_programi',
  type: 'update',
  docId: 'e1',
  data,
});

describe('sınav programı yazma kuralı (sunucu)', () => {
  it('ad anahtarı unvan ve harf farkını önemsemez', () => {
    expect(kisiAnahtari('Dr. Öğr. Üyesi CELALETTİN KAYA')).toBe(kisiAnahtari(K));
    expect(kisiAnahtari('Yrd. Doç. Dr. Ali Veli')).toBe('ali veli');
  });
  it('akademisyen yalnız kendi dersinin sınavını yazar', () => {
    const benim = 'Dr. Öğr. Üyesi CELALETTİN KAYA';
    expect(sinavProgramiYazmaKarari(up({ timeSlot: '09:00' }), sinav, hoca, benim).izin).toBe(true);
    expect(
      sinavProgramiYazmaKarari(up({ timeSlot: '09:00' }), sinav, hoca, 'Dr. Başka HOCA').izin
    ).toBe(false);
    // ekleme
    const ekle = { collection: 'sinav_programi', type: 'add', data: sinav };
    expect(sinavProgramiYazmaKarari(ekle, null, hoca, benim).izin).toBe(true);
    // hocayı başkasına çevirip devralamaz, bölüm değiştiremez
    expect(sinavProgramiYazmaKarari(up({ professor: 'X' }), sinav, hoca, benim).izin).toBe(false);
    expect(sinavProgramiYazmaKarari(up({ departmentId: 'makine' }), sinav, hoca, benim).izin).toBe(
      false
    );
    // çok hocalı ders
    const ortak = {
      ...sinav,
      professor: 'Prof. Dr. İlyas İNCİ',
      professors: ['Prof. Dr. İlyas İNCİ', K],
    };
    expect(sinavProgramiYazmaKarari(up({ room: 'M1' }), ortak, hoca, benim).izin).toBe(true);
  });
  it('bölüm/fakülte yetkilisi alanındaki bölümün kayıtlarını yazar', () => {
    expect(sinavProgramiYazmaKarari(up({ room: 'M1' }), sinav, bolumYet, 'X').izin).toBe(true);
    expect(
      sinavProgramiYazmaKarari(
        up({ room: 'M1' }),
        { ...sinav, departmentId: 'makine' },
        bolumYet,
        'X'
      ).izin
    ).toBe(false);
    expect(
      sinavProgramiYazmaKarari(up({ room: 'M1' }), { ...sinav, departmentId: 'makine' }, dekan, 'X')
        .izin
    ).toBe(true);
  });
  it('dönem, ders ve salon kayıtları yalnız yetkilide', () => {
    const donem = { departmentId: 'bilgisayar' };
    const sil = { collection: 'sinav_donemler', type: 'delete', docId: 'p1' };
    expect(sinavProgramiYazmaKarari(sil, donem, hoca, K).izin).toBe(false);
    expect(sinavProgramiYazmaKarari(sil, donem, bolumYet, 'X').izin).toBe(true);
    const salon = {
      collection: 'department_classrooms',
      type: 'add',
      data: { departmentId: 'makine', name: 'M' },
    };
    expect(sinavProgramiYazmaKarari(salon, null, bolumYet, 'X').izin).toBe(false);
    expect(sinavProgramiYazmaKarari(salon, null, dekan, 'X').izin).toBe(true);
  });
});
