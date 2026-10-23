import { describe, it, expect } from 'vitest';
import {
  dersProgramiOlaylari,
  dersSinavCakismalari,
  yariyilAnahtari,
} from '../lib/ders-sinav-cakisma.js';
import { slotDersleri } from '../lib/ders-slot.js';

const saatler = () => ['08:30-09:15', '09:30-10:15', '10:30-11:15'];
const dok = {
  id: 'bil_guz_1',
  slots: {
    Pazartesi_1: { courseCode: 'BLM101', instructor: 'Dr. Ali Veli', classroom: 'M1' },
    Salı_0: { courseCode: 'MAT101', instructor: 'Can D', classroom: 'M2' },
  },
};

describe('ders × sınav çakışması', () => {
  const olaylar = dersProgramiOlaylari([dok], { slotDersleri, saatler });
  it('olaylar saat etiketinden kurulur', () => {
    expect(olaylar).toHaveLength(2);
    expect(olaylar[0]).toMatchObject({ gun: 'Pazartesi', bas: 570, bit: 615, salon: 'M1' });
  });
  it('salon ve gözetmen çakışması (2026-11-09 Pazartesi)', () => {
    const s = {
      id: 's1',
      code: 'FIZ101',
      date: '2026-11-09',
      timeSlot: '09:00',
      duration: 60,
      room: 'M1',
      supervisor: 'Ali VELİ',
    };
    const c = dersSinavCakismalari([s], olaylar, {});
    expect(c.map((x) => x.tur).sort()).toEqual(['ders_gozetmen', 'ders_salon']);
  });
  it('saat örtüşmüyorsa ya da yarıyıl farklıysa yok', () => {
    const s = {
      id: 's2',
      code: 'X',
      date: '2026-11-09',
      timeSlot: '10:15',
      duration: 15,
      room: 'M1',
    };
    expect(dersSinavCakismalari([s], olaylar, {})).toEqual([]);
    const bahar = {
      id: 's3',
      code: 'Y',
      date: '2026-11-09',
      timeSlot: '09:00',
      room: 'M1',
      periodId: 'p',
    };
    expect(
      dersSinavCakismalari([bahar], olaylar, {
        donemler: [{ _docId: 'p', semester: 'Bahar 2026-2027' }],
      })
    ).toEqual([]);
    expect(yariyilAnahtari(null, '2026-04-10')).toBe('bahar');
  });
});
