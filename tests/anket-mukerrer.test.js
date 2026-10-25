import { describe, it, expect } from 'vitest';
import { mukerrerSorgusu, dersKoduAlani } from '../server/lib/anket-mukerrer.js';

describe('mükerrer anket yanıtı sorgusu', () => {
  it('öğrenci numarasıyla eşleşir', () => {
    const q = mukerrerSorgusu({
      user: { role: 'student', identifier: '2021001' },
      data: { surveyId: 's1', studentNumber: '2021001', userId: 'Ayşe Yılmaz' },
    });
    expect(q).toEqual({
      surveyId: 's1',
      $or: [{ studentNumber: '2021001' }, { _owner: '2021001' }],
    });
  });

  it('personel jeton kimliği ve profil id ile eşleşir, öğrenci yanıtları hariç', () => {
    const q = mukerrerSorgusu({
      user: { role: 'professor', identifier: 'DR. ALİ' },
      data: { surveyId: 's1' },
      kimlikler: ['p7'],
    });
    expect(q.$or).toEqual([
      { yanitlayanKimlik: 'DR. ALİ' },
      { userId: { $in: ['DR. ALİ', 'p7'] }, role: { $ne: 'student' } },
    ]);
  });

  it('çok dersli ankette eşleşme ders başınadır', () => {
    const anket = { infoFields: [{ key: 'dk', source: 'courseCode' }] };
    expect(dersKoduAlani(anket)).toBe('dk');
    const q = mukerrerSorgusu({
      user: { role: 'student', identifier: '1' },
      data: { surveyId: 's1', answers: { dk: 'BM101' } },
      anket,
      dersBasina: true,
    });
    expect(q['answers.dk']).toBe('BM101');
    // Tek dersli / ders bağsız ankette eski kural: anket başına tek yanıt.
    const tek = mukerrerSorgusu({
      user: { role: 'student', identifier: '1' },
      data: { surveyId: 's1', answers: { dk: 'BM101' } },
      anket,
    });
    expect(tek['answers.dk']).toBeUndefined();
  });

  it('kimlik ya da anket yoksa sorgu yok', () => {
    expect(mukerrerSorgusu({ user: { role: 'student' }, data: { surveyId: 's1' } })).toBeNull();
    expect(mukerrerSorgusu({ user: { role: 'student', identifier: '1' }, data: {} })).toBeNull();
  });
});
