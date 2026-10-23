import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { adDegisimPlani, planOzeti } = require('../server/lib/ad-degisim.js');

describe('akademisyen ad değişimi planı', () => {
  const eski = 'Dr. Öğr. Üyesi Ali VELİ';
  const yeni = 'Doç. Dr. ALİ VELİ';
  const veri = {
    professors: [{ _id: 1, name: eski, departmentId: 'bil' }],
    professor_passwords: [{ _id: 'main', [eski]: 'hash', 'Başka Kişi': 'h2' }],
    departments: [{ _id: 3, managerNames: [eski, 'X'] }],
    sinav_dersler: [{ _id: 4, professor: 'Ali Veli', professors: ['Ali Veli', 'Can D'] }],
    sinav_programi: [{ _id: 5, supervisor: 'Can D, Dr. Ali VELİ', professor: 'Ali Veli / Can D' }],
    course_schedules: [
      { _id: 6, slots: { a: { instructor: 'Ali Veli', dersler: [{ instructor: 'Can D' }] } } },
    ],
    announcements: [{ _id: 7, metin: 'Ali Veli hocamız duyuru yaptı' }],
    students: [{ _id: 8, name: 'Ali Veli' }],
    audit_logs: [{ _id: 9, user: eski }],
  };
  const plan = adDegisimPlani(veri, eski, yeni);
  const sonra = (k) => plan.find((p) => p.koleksiyon === k)?.sonra;
  it('tam eşleşme her yerde, şifre anahtarı taşınır', () => {
    expect(sonra('professors').name).toBe(yeni);
    expect(sonra('professor_passwords')[yeni]).toBe('hash');
    expect(sonra('professor_passwords')[eski]).toBeUndefined();
    expect(sonra('departments').managerNames).toEqual([yeni, 'X']);
  });
  it('sınav/ders kayıtlarında liste ve farklı unvanlı yazım çevrilir', () => {
    expect(sonra('sinav_dersler').professors).toEqual([yeni, 'Can D']);
    expect(sonra('sinav_programi').supervisor).toBe('Can D, ' + yeni);
    expect(sonra('sinav_programi').professor).toBe(yeni + ' / Can D');
    expect(sonra('course_schedules').slots.a.instructor).toBe(yeni);
  });
  it('cümle içindeki ad, öğrenci kaydı ve denetim kaydı değişmez', () => {
    expect(planOzeti(plan)).toEqual({
      professors: 1,
      professor_passwords: 1,
      departments: 1,
      sinav_dersler: 1,
      sinav_programi: 1,
      course_schedules: 1,
    });
  });
});
