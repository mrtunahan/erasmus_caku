import { describe, it, expect } from 'vitest';
import {
  yanitlariSuz,
  eskiYanitBolumCozucu,
  kendiYanitiMi,
  yanitSuzgeci,
} from '../server/lib/anket-yanit-okuma.js';

const UNI = { kapsamTuru: 'universite', departmentIds: [] };
const MUH = { kapsamTuru: 'fakulte', departmentIds: ['bil', 'kim'] };
const BIL = { kapsamTuru: 'bolum', departmentIds: ['bil'] };
const KIM = { kapsamTuru: 'bolum', departmentIds: ['kim'] };
const AKAD = { kapsamTuru: 'akademisyen', departmentIds: ['bil'] };

const y = (id, bolum, ek) => ({
  id,
  surveyId: 's1',
  userId: 'Öğrenci ' + id,
  studentNumber: '24090' + id,
  yanitlayanBolumleri: [bolum],
  role: 'student',
  answers: { q1: 5 },
  ...ek,
});
const HEPSI = [y('1', 'bil'), y('2', 'kim'), y('3', 'orm')];
const idler = (l) => l.map((x) => x.id);

describe('anket yanıtı okuma (personel)', () => {
  it('üniversite yetkilisi hepsini görür, kimliksiz', () => {
    const l = yanitlariSuz(HEPSI, { kapsam: UNI, ben: 'Rektör' });
    expect(idler(l)).toEqual(['1', '2', '3']);
    l.forEach((x) => {
      expect(x.userId).toBeUndefined();
      expect(x.studentNumber).toBeUndefined();
      expect(x.answers).toEqual({ q1: 5 });
    });
  });

  it('bölüm yetkilisi yalnız kendi bölümünün yanıtlarını görür', () => {
    expect(idler(yanitlariSuz(HEPSI, { kapsam: BIL, ben: 'X' }))).toEqual(['1']);
    expect(idler(yanitlariSuz(HEPSI, { kapsam: KIM, ben: 'X' }))).toEqual(['2']);
  });

  it('fakülte yetkilisi fakültesinin bölümlerini görür', () => {
    expect(idler(yanitlariSuz(HEPSI, { kapsam: MUH, ben: 'X' }))).toEqual(['1', '2']);
  });

  it('akademisyen yalnız kendi anketinin, kendi bölümündeki yanıtlarını görür', () => {
    expect(yanitlariSuz(HEPSI, { kapsam: AKAD, ben: 'Dr. Ali' })).toEqual([]);
    const l = yanitlariSuz(HEPSI, {
      kapsam: AKAD,
      ben: 'Dr. Ali',
      benimAnketlerim: new Set(['s1']),
    });
    expect(idler(l)).toEqual(['1']);
    expect(l[0].userId).toBeUndefined();
  });

  it('herkes kendi yanıtını kimliğiyle görür', () => {
    const benim = y('9', 'orm', {
      userId: 'Dr. Ali Veli',
      role: 'professor',
      studentNumber: undefined,
    });
    const l = yanitlariSuz([benim], { kapsam: BIL, ben: 'dr. ali  veli' });
    expect(l).toHaveLength(1);
    expect(l[0].userId).toBe('Dr. Ali Veli');
    expect(kendiYanitiMi(benim, '')).toBe(false);
  });

  it('bölümü bilinmeyen yanıt alt yetkiliye gösterilmez', () => {
    const b = { id: 'x', surveyId: 's1', userId: 'Bilinmeyen', answers: {} };
    expect(yanitlariSuz([b], { kapsam: BIL, ben: 'X' })).toEqual([]);
    expect(yanitlariSuz([b], { kapsam: UNI, ben: 'X' })).toHaveLength(1);
  });

  it('eski yanıtın bölümü numaradan ya da addan çözülür', () => {
    const coz = eskiYanitBolumCozucu(
      [
        { studentNumber: '240901', firstName: 'Ayşe', lastName: 'Kaya', departmentId: 'bil' },
        {
          studentNumber: '240902',
          firstName: 'Can',
          lastName: 'Er',
          departmentId: 'kim',
          additionalDepartments: ['bil'],
        },
      ],
      [{ name: 'Dr. Ali Veli', departmentId: 'kim' }]
    );
    expect(coz({ userId: '240901' }).yanitlayanBolumleri).toEqual(['bil']);
    expect(coz({ userId: 'AYŞE KAYA' }).yanitlayanBolumleri).toEqual(['bil']);
    expect(coz({ studentNumber: '240902' }).yanitlayanBolumleri).toEqual(['kim', 'bil']);
    expect(coz({ userId: 'Dr. Ali Veli' }).yanitlayanBolumleri).toEqual(['kim']);
    expect(coz({ userId: 'Kimse' }).yanitlayanBolumleri).toBeUndefined();
    const damgali = { userId: 'x', yanitlayanBolumleri: ['orm'] };
    expect(coz(damgali)).toBe(damgali);
  });
});

describe('akademisyen: başkasının ders anketi', () => {
  it('yalnız kendi ders kodunun yanıtlarını görür', () => {
    const l = [
      y('1', 'bil', { answers: { dersKodu: 'BLM445', q1: 4 } }),
      y('2', 'bil', { answers: { dersKodu: 'BLM101', q1: 2 } }),
      y('3', 'bil', { answers: { q1: 3 } }),
    ];
    const dersAnketlerim = new Map([['s1', { alan: 'dersKodu', kodlar: new Set(['BLM445']) }]]);
    expect(idler(yanitlariSuz(l, { kapsam: AKAD, ben: 'Dr. Ali', dersAnketlerim }))).toEqual(['1']);
    // Kendi oluşturduğu ankette hepsi görünür.
    const benimAnketlerim = new Set(['s1']);
    expect(idler(yanitlariSuz(l, { kapsam: AKAD, ben: 'Dr. Ali', benimAnketlerim }))).toEqual([
      '1',
      '2',
      '3',
    ]);
  });
});

describe('akademisyenin kendi yanıtı', () => {
  it('profil id ya da sunucu damgasıyla kendi yanıtı kimlikli görünür', () => {
    const suz = yanitSuzgeci({
      kapsam: { kapsamTuru: 'akademisyen', departmentIds: [] },
      ben: 'Dr. A',
      benKimlikleri: ['p-12'],
    });
    expect(suz({ surveyId: 's', userId: 'p-12' })).toEqual({ surveyId: 's', userId: 'p-12' });
    expect(suz({ surveyId: 's', userId: 'p-12', yanitlayanKimlik: 'Dr. A' }).userId).toBe('p-12');
    expect(suz({ surveyId: 's', userId: 'p-99' })).toBeNull();
  });
});
