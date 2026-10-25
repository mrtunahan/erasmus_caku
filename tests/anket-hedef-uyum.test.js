import { describe, it, expect } from 'vitest';
import { atamaKisiyeUyarMi, yanitHedefKarari } from '../lib/anket-hedef-uyum.js';

const BUGUN = '2026-10-25';
const bil = (ek) => ({
  targetRole: 'student',
  targetGroup: 'Tüm öğrenciler',
  kapsamTuru: 'bolum',
  kapsamDepartmentIds: ['bilgisayar'],
  ...ek,
});
const OGR = { rol: 'student', departmentId: 'bilgisayar', studentNumber: '2021001', sinif: 3 };
const HOCA = { rol: 'professor', departmentId: 'bilgisayar', title: 'Arş. Gör.' };

describe('paylaşım kişiye uyuyor mu', () => {
  it('rol ve bölüm kapsamı', () => {
    expect(atamaKisiyeUyarMi(bil(), OGR)).toBe(true);
    expect(atamaKisiyeUyarMi(bil({ kapsamDepartmentIds: ['kimya'] }), OGR)).toBe(false);
    expect(atamaKisiyeUyarMi(bil({ targetRole: 'professor' }), OGR)).toBe(false);
    expect(atamaKisiyeUyarMi(bil({ kapsamTuru: 'universite' }), OGR)).toBe(true);
  });

  it('sınıf grubu: kayıttan ya da ek kaynaktan biri uyarsa yeter', () => {
    expect(atamaKisiyeUyarMi(bil({ targetGroup: '3. sınıf' }), OGR)).toBe(true);
    expect(atamaKisiyeUyarMi(bil({ targetGroup: '1. sınıf' }), OGR)).toBe(false);
    expect(
      atamaKisiyeUyarMi(bil({ targetGroup: '1. sınıf' }), OGR, { kisiler: [{ sinif: 1 }] })
    ).toBe(true);
  });

  it('mezun grubu ve eski "alumni" rolü', () => {
    const mezun = { ...OGR, status: 'mezun' };
    expect(atamaKisiyeUyarMi(bil({ targetGroup: 'Mezun' }), mezun)).toBe(true);
    expect(atamaKisiyeUyarMi(bil({ targetGroup: 'Mezun' }), OGR)).toBe(false);
    expect(atamaKisiyeUyarMi(bil({ targetRole: 'alumni', targetGroup: '' }), mezun)).toBe(true);
    expect(atamaKisiyeUyarMi(bil({ targetGroup: '3. sınıf' }), mezun)).toBe(false);
  });

  it('akademisyen unvan grubu', () => {
    const a = bil({ targetRole: 'professor', targetGroup: 'Araştırma görevlileri' });
    expect(atamaKisiyeUyarMi(a, HOCA)).toBe(true);
    expect(atamaKisiyeUyarMi({ ...a, targetGroup: 'Öğretim üyeleri' }, HOCA)).toBe(false);
  });
});

describe('yanıt kararı', () => {
  const anket = { id: 's1' };
  it('paylaşılmamış ya da kişiye paylaşılmamış anket yanıt almaz', () => {
    expect(yanitHedefKarari(anket, [], OGR, { bugun: BUGUN }).izin).toBe(false);
    const r = yanitHedefKarari(anket, [bil({ kapsamDepartmentIds: ['kimya'] })], OGR, {
      bugun: BUGUN,
    });
    expect(r).toEqual({ izin: false, hata: 'Bu anket size paylaşılmadı.' });
  });

  it('süre KİŞİNİN paylaşımına göre: başka grubun açık paylaşımı kapıyı açmaz', () => {
    const atamalar = [
      bil({ targetGroup: '3. sınıf', dueDate: '2026-10-01' }),
      bil({ targetGroup: '1. sınıf', dueDate: '2026-12-01' }),
    ];
    expect(yanitHedefKarari(anket, atamalar, OGR, { bugun: BUGUN })).toEqual({
      izin: false,
      hata: 'Bu anketin süresi doldu.',
    });
    atamalar[0].dueDate = '2026-10-25'; // son gün dahil
    expect(yanitHedefKarari(anket, atamalar, OGR, { bugun: BUGUN }).izin).toBe(true);
  });

  it('pasif anket', () => {
    expect(yanitHedefKarari({ pasif: true }, [bil()], OGR, { bugun: BUGUN }).izin).toBe(false);
  });
});
