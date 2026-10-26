import { describe, it, expect } from 'vitest';
import {
  dersProgramiOlaylari,
  dersSinavCakismalari,
  yariyilAnahtari,
  cakismaOzeti,
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

describe('ders × sınav: kendi dersi ve tekrar', () => {
  const olaylar = dersProgramiOlaylari([dok], { slotDersleri, saatler });
  const s = (o) => ({
    code: 'BLM101',
    date: '2026-11-09',
    timeSlot: '09:00',
    duration: 60,
    room: 'M1',
    supervisor: 'Ali VELİ',
    ...o,
  });
  it('sınavın kendi dersi (harf ve boşluk farkıyla da) çakışma sayılmaz', () => {
    expect(dersSinavCakismalari([s({ id: 'a' })], olaylar, {})).toEqual([]);
    expect(dersSinavCakismalari([s({ id: 'b', code: 'blm 101 / FİZ101' })], olaylar, {})).toEqual(
      []
    );
  });
  it('birleşik oturumun üyeleri aynı satırı bir kez üretir; liste tarih sırasında', () => {
    const uye1 = s({ id: 'u1', code: 'FIZ101/FZK101' });
    const uye2 = s({ id: 'u2', code: 'FIZ101/FZK101' });
    const c = dersSinavCakismalari([uye1, uye2], olaylar, {});
    expect(c.map((x) => x.tur).sort()).toEqual(['ders_gozetmen', 'ders_salon']);
    const once = s({ id: 'o', code: 'X1', date: '2026-11-02' });
    const sirali = dersSinavCakismalari([uye1, once], olaylar, {});
    expect(sirali[0].sinav.date).toBe('2026-11-02');
  });
});

describe('tekrar eden uyarılar ve sınav başına özet', () => {
  // İki saatlik ders (iki slot) + aynı servis dersi iki bölümün programında.
  const iki = (bolum) => ({
    id: bolum + '_guz_1',
    slots: {
      Pazartesi_0: { courseCode: 'FZK181', instructor: 'Dr. A', classroom: 'M1' },
      Pazartesi_1: { courseCode: 'FZK181', instructor: 'Dr. A', classroom: 'M1' },
    },
  });
  const olaylar = dersProgramiOlaylari([iki('bil'), iki('mak')], { slotDersleri, saatler });
  const s = {
    id: 's1',
    code: 'MAT165',
    date: '2026-11-09',
    timeSlot: '08:30',
    duration: 90,
    room: 'M1',
    supervisor: 'Dr. A',
  };
  it('aynı salon/ders ve aynı gözetmen/ders bir kez yazılır', () => {
    const c = dersSinavCakismalari([s], olaylar, {});
    expect(c.map((x) => x.tur).sort()).toEqual(['ders_gozetmen', 'ders_salon']);
  });
  it('özet sınav başına tek blok', () => {
    const o = cakismaOzeti(dersSinavCakismalari([s], olaylar, {}));
    expect(o).toEqual([
      {
        tarih: '2026-11-09',
        saat: '08:30',
        kod: 'MAT165',
        salonlar: [{ salon: 'M1', dersler: ['FZK181'] }],
        gozetmenler: [{ kisi: 'Dr. A', dersler: ['FZK181 (M1)'] }],
      },
    ]);
  });
});
