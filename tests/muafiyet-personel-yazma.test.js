import { describe, it, expect } from 'vitest';
import { personelMuafiyetSatirKarari } from '../server/lib/muafiyet-personel-yazma.js';

const satir = {
  localCourse: { code: 'BLM101', name: 'Prog', akts: 5 },
  sourceCourse: { code: 'CS101', name: 'Programming', grade: 'BB', gradeHarf: 'BB' },
  tier: 'review',
};
const mevcut = { matches: [satir, { ...satir, localCourse: { code: 'MAT101' } }] };

describe('muafiyet satırı: personel kararı serbest, düzeltme/çıkarma değil', () => {
  it('ders kararı ve not eşlemesi serbest', () => {
    const karar = {
      ...satir,
      adminDecision: 'confirmed',
      adminNote: 'ok',
      adminDecidedBy: 'A',
      adminUpdatedAt: 't',
    };
    expect(personelMuafiyetSatirKarari({ 'matches.0': karar, updatedAt: 'x' }, mevcut).izin).toBe(
      true
    );
    const not = {
      ...satir,
      convertedGrade: 'AA',
      sourceCourse: { ...satir.sourceCourse, grade: '85', gradePuan: '85' },
    };
    expect(personelMuafiyetSatirKarari({ 'matches.0': not, notEslemeOnayi: {} }, mevcut).izin).toBe(
      true
    );
    expect(
      personelMuafiyetSatirKarari({ 'matches.1.adminDecision': 'rejected' }, mevcut).izin
    ).toBe(true);
  });
  it('ders bilgisini düzeltmek, satır eklemek/çıkarmak reddedilir', () => {
    const duz = {
      ...satir,
      localCourse: { ...satir.localCourse, code: 'BLM102' },
      duzenlemeler: [{}],
    };
    expect(personelMuafiyetSatirKarari({ 'matches.0': duz }, mevcut).izin).toBe(false);
    expect(
      personelMuafiyetSatirKarari({ matches: [satir], cikarilanEslesmeler: [{}] }, mevcut).izin
    ).toBe(false);
    expect(personelMuafiyetSatirKarari({ 'matches.5': satir }, mevcut).izin).toBe(false);
    expect(personelMuafiyetSatirKarari({ 'matches.0.localCourse': {} }, mevcut).izin).toBe(false);
  });
  it('dizinin tamamı yazılırsa satır satır aynı kural (eski istemci yolu)', () => {
    const k = mevcut.matches.map((m) => ({ ...m, adminDecision: 'confirmed' }));
    expect(personelMuafiyetSatirKarari({ matches: k }, mevcut).izin).toBe(true);
  });
});

describe('eski kayıtta source alanı', () => {
  it('not eşlemesi source → sourceCourse yazınca ders değişikliği sayılmaz', () => {
    const eski = { localCourse: { code: 'X' }, source: { code: 'CS1', name: 'P' } };
    const yeni = {
      ...eski,
      convertedGrade: 'AA',
      sourceCourse: { code: 'CS1', name: 'P', grade: '90', gradePuan: '90' },
    };
    expect(personelMuafiyetSatirKarari({ 'matches.0': yeni }, { matches: [eski] }).izin).toBe(true);
  });
});
