import { describe, it, expect } from 'vitest';
import { yeniKayitSahipligi } from '../server/lib/ogrenci-sahiplik-damga.js';

describe('öğrencinin açtığı yeni kaydın sahipliği', () => {
  it('başkası adına muafiyet başvurusu reddedilir', () => {
    const data = { studentNo: '222222222' };
    const r = yeniKayitSahipligi('muafiyet_records', data, '111111111', ['111111111']);
    expect(r.izin).toBe(false);
  });

  it('kendi numarasıyla başvuru geçer ve _owner damgalanır', () => {
    const data = { studentNo: '111111111', _owner: '222222222' };
    const r = yeniKayitSahipligi('muafiyet_records', data, '111111111', ['111111111']);
    expect(r.izin).toBe(true);
    expect(data._owner).toBe('111111111');
  });

  it('ÇAP öğrencisi ikinci numarasıyla kayıt açabilir', () => {
    const data = { ogrenciNo: '333333333' };
    const r = yeniKayitSahipligi('internship_applications', data, '111111111', [
      '111111111',
      '333333333',
    ]);
    expect(r.izin).toBe(true);
  });

  it('başkasına sahte bildirim gönderilemez', () => {
    const r = yeniKayitSahipligi(
      'student_notifications',
      { studentNumber: '999999999' },
      '111111111',
      ['111111111']
    );
    expect(r.izin).toBe(false);
  });

  it('alan boşsa veri biçimine dokunulmaz (anket userId adı korunur)', () => {
    const data = { userId: 'Ayşe Yılmaz', surveyId: 's1' };
    const r = yeniKayitSahipligi('survey_responses', data, '111111111', ['111111111']);
    expect(r.izin).toBe(true);
    expect(data.userId).toBe('Ayşe Yılmaz');
    expect(data.studentNumber).toBeUndefined();
  });

  it('listede olmayan koleksiyonda yalnız _owner damgalanır', () => {
    const data = { authorId: 'x', _owner: 'baskasi' };
    const r = yeniKayitSahipligi('portal_posts', data, '111111111', []);
    expect(r.izin).toBe(true);
    expect(data._owner).toBe('111111111');
    expect(data.authorId).toBe('x');
  });
});
