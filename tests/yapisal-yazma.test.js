import { describe, it, expect } from 'vitest';
import { bolumYetkilisiYapisalYazim, akademisyenAdDegisimi } from '../server/lib/yapisal-yazma.js';

const YETKILI = { role: 'bolum_yetkilisi', identifier: 'Ali Veli', departmentId: 'bilgisayar' };
const BOLUM = { _docId: 'bilgisayar', name: 'Bilgisayar', facultyId: 'muhendislik' };

describe('bölüm yetkilisi rolü ve yapısal koleksiyonlar', () => {
  it('kendi bölümünü günceller, hiyerarşi alanları düşer', () => {
    const op = {
      collection: 'departments',
      type: 'set',
      docId: 'bilgisayar',
      data: { gozetmenKurali: { x: 1 }, managerNames: ['Saldırgan'], facultyId: 'baska' },
    };
    const r = bolumYetkilisiYapisalYazim(op, YETKILI, BOLUM);
    expect(r.izin).toBe(true);
    expect(op.data).toEqual({ gozetmenKurali: { x: 1 } });
    expect(op.merge).toBe(true);
  });

  it('başka bölümün kaydına yazamaz', () => {
    const op = { collection: 'departments', type: 'update', docId: 'kimya', data: {} };
    const r = bolumYetkilisiYapisalYazim(op, YETKILI, { _docId: 'kimya' });
    expect(r.izin).toBe(false);
  });

  it('bölüm ekleyemez/silemez, fakülteye yazamaz', () => {
    expect(
      bolumYetkilisiYapisalYazim(
        { collection: 'departments', type: 'add', data: {} },
        YETKILI,
        null
      ).izin
    ).toBe(false);
    expect(
      bolumYetkilisiYapisalYazim(
        { collection: 'faculties', type: 'update', docId: 'f', data: {} },
        YETKILI,
        {}
      ).izin
    ).toBe(false);
  });

  it('diğer roller etkilenmez', () => {
    const op = { collection: 'departments', type: 'add', data: {} };
    expect(bolumYetkilisiYapisalYazim(op, { role: 'admin' }, null).izin).toBe(true);
  });
});

describe('akademisyen adı değişimi', () => {
  it('fakülte yetkilisi kaydının adını bölüm yetkilisi değiştiremez', () => {
    const r = akademisyenAdDegisimi({
      mevcut: { name: 'Dekan', isFacultyManager: true },
      yeniAd: 'Başka',
      adBaskasinda: false,
      flags: { deptManager: true },
    });
    expect(r.izin).toBe(false);
  });

  it('kullanılan bir ada çevrilemez (bayrak birleşmesi)', () => {
    const r = akademisyenAdDegisimi({
      mevcut: { name: 'Hoca A' },
      yeniAd: 'Hoca B',
      adBaskasinda: true,
      flags: { facManager: true },
    });
    expect(r.izin).toBe(false);
  });

  it('sıradan düzeltme serbest; üniversite yetkilisi her şeyi yapabilir', () => {
    expect(
      akademisyenAdDegisimi({
        mevcut: { name: 'Dr. Ayse' },
        yeniAd: 'Doç. Dr. Ayşe',
        adBaskasinda: false,
        flags: { deptManager: true },
      }).izin
    ).toBe(true);
    expect(
      akademisyenAdDegisimi({
        mevcut: { name: 'Rektör', isUniversityAdmin: true },
        yeniAd: 'X',
        adBaskasinda: true,
        flags: { uniAdmin: true },
      }).izin
    ).toBe(true);
  });
});
