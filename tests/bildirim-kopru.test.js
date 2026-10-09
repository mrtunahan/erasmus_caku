import { describe, it, expect } from 'vitest';
import { kopruPlani } from '../server/lib/bildirim-kopru.js';

const SIMDI = new Date('2026-10-09T10:00:00Z');

describe('bildirim köprüsü (modül → zil)', () => {
  it('staj: öğrenciye giden bildirim kişiye düşer', () => {
    const p = kopruPlani(
      'internship_notifications',
      {
        type: 'step_approved',
        targetStudentNo: '240905054',
        departmentId: 'bil',
        stepTitle: 'Staj defteri',
        appId: 'a1',
      },
      { id: 'n1', simdi: SIMDI }
    );
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({
      recipientType: 'user',
      recipientId: '240905054',
      module: 'staj',
      title: 'Staj · adımınız onaylandı',
      link: 'staj',
      meta: { kaynak: 'internship_notifications', kaynakId: 'n1', appId: 'a1' },
    });
    expect(p[0].body).toMatch(/Staj defteri/);
  });

  it('staj: komisyona giden bildirim komisyon olarak işaretlenir (çağıran çözer)', () => {
    const p = kopruPlani('internship_notifications', {
      type: 'step_submitted',
      departmentId: 'bil',
      studentName: 'Talha Atik',
      stepTitle: 'Rapor',
      readBy: [],
    });
    expect(p[0].recipientType).toBe('staj-komisyonu');
    expect(p[0].recipientId).toBe('bil');
    expect(p[0].body).toMatch(/Talha Atik “Rapor”/);
  });

  it('staj: yeni dönem bütün bölüme gider; onaylayan okumuş sayılır', () => {
    const p = kopruPlani('internship_notifications', {
      type: 'new_period',
      target: 'department',
      departmentId: 'bil',
      periodLabel: '2027 Yaz',
    });
    expect(p[0]).toMatchObject({ recipientType: 'department', recipientId: 'bil' });
    const q = kopruPlani('internship_notifications', {
      type: 'step_approved_commission',
      departmentId: 'bil',
      approvedBy: 'Dr. Ali',
      readBy: ['Dr. Ali'],
    });
    expect(q[0].readBy).toEqual(['Dr. Ali']);
  });

  it('öğrenci bildirimi ve portal bahsetmesi kişiye düşer', () => {
    const s = kopruPlani('student_notifications', {
      studentNumber: '240905002',
      module: 'muafiyet',
      title: 'Muafiyet sonucu',
      body: 'Onaylandı',
    });
    expect(s[0]).toMatchObject({
      recipientType: 'user',
      recipientId: '240905002',
      module: 'muafiyet',
    });
    const p = kopruPlani(
      'portal_notifications',
      { type: 'mention', message: 'Ali sizi bahsetti' },
      { parentDocId: 'u42' }
    );
    expect(p[0]).toMatchObject({ recipientId: 'u42', body: 'Ali sizi bahsetti', module: 'portal' });
  });

  it('köprü dışı koleksiyon ya da alıcısız kayıt bildirim üretmez', () => {
    expect(kopruPlani('notifications', { title: 'x' })).toEqual([]);
    expect(kopruPlani('student_notifications', { title: 'x' })).toEqual([]);
    expect(kopruPlani('portal_notifications', { message: 'x' }, {})).toEqual([]);
    expect(kopruPlani('internship_notifications', { type: 'step_submitted' })).toEqual([]);
  });
});
