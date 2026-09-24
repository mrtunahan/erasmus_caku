// Randevu talepleri sınıfça okunabiliyordu: kim, hangi hocadan, hangi saate
// randevu istemiş ve KONUSU ne. Ekran süzgeci gizlilik sağlamaz — veri çoktan
// tarayıcıya iniyordu. Maske sahipliğe bakar.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { STUDENT_READ_MASKED, ogrenciMaskesiUygula } = require('../server/lib/ogrenci-maske.js');

const MASKE = STUDENT_READ_MASKED.randevu_talepleri;
const KAYIT = {
  id: 'r1',
  akademisyen: 'Ayşe İNAN',
  gun: 'Salı',
  saat: '13:15',
  tarih: '2026-03-10',
  durum: 'bekliyor',
  studentNumber: '260905001',
  ogrenciAd: 'Burak DEMİR',
  konu: 'Sınav notum hakkında',
  akademisyenNotu: 'öğrenciyle konuşuldu',
};

describe('ogrenciMaskesiUygula', () => {
  it('kendi kaydı olduğu gibi döner', () => {
    expect(ogrenciMaskesiUygula(KAYIT, MASKE, '260905001')).toEqual(KAYIT);
  });

  it('başkasının kaydından ad, numara, konu ve hoca notu ÇIKMAZ', () => {
    const m = ogrenciMaskesiUygula(KAYIT, MASKE, '260905002');
    expect(m.ogrenciAd).toBeUndefined();
    expect(m.studentNumber).toBeUndefined();
    expect(m.konu).toBeUndefined();
    expect(m.akademisyenNotu).toBeUndefined();
  });

  it('slot alanları kalır — "bu saat istenmiş mi" görünebilsin', () => {
    expect(ogrenciMaskesiUygula(KAYIT, MASKE, '260905002')).toEqual({
      id: 'r1',
      akademisyen: 'Ayşe İNAN',
      gun: 'Salı',
      saat: '13:15',
      tarih: '2026-03-10',
      durum: 'bekliyor',
    });
  });

  it('sahipsiz kayıt da maskelenir (maskenin kaçış kapısı olmasın)', () => {
    const sahipsiz = { ...KAYIT, studentNumber: '' };
    expect(ogrenciMaskesiUygula(sahipsiz, MASKE, '260905001').konu).toBeUndefined();
  });

  it('numarası olmayan istek hiçbir kaydı açamaz', () => {
    expect(ogrenciMaskesiUygula(KAYIT, MASKE, '').konu).toBeUndefined();
    expect(ogrenciMaskesiUygula(KAYIT, MASKE, null).ogrenciAd).toBeUndefined();
  });

  it('maske yoksa kayda dokunulmaz', () => {
    expect(ogrenciMaskesiUygula(KAYIT, null, '260905002')).toEqual(KAYIT);
  });

  it('boş/geçersiz kayıt patlamaz', () => {
    expect(ogrenciMaskesiUygula(null, MASKE, '1')).toBe(null);
  });
});
