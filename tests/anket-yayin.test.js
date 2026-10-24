import { describe, it, expect } from 'vitest';
import {
  bugunTarihi,
  atamaBitisi,
  atamaSuresiDolduMu,
  atamaAcikMi,
  anketYayinDurumu,
  anketSonTarihi,
  sureUzatmaHatasi,
  suzgecSecenekleri,
  anketListesiniSuz,
  durumSayilari,
} from '../lib/anket-yayin.js';

const BUGUN = '2026-11-15';

describe('anket yayın durumu', () => {
  it('son tarih o gün dahil açık; süresiz paylaşım hiç dolmaz', () => {
    expect(atamaSuresiDolduMu({ dueDate: '2026-11-15' }, BUGUN)).toBe(false);
    expect(atamaSuresiDolduMu({ dueDate: '2026-11-14' }, BUGUN)).toBe(true);
    expect(atamaSuresiDolduMu({ dueDate: '—' }, BUGUN)).toBe(false);
    expect(atamaBitisi({ deadline: '2026-12-01T10:00' })).toBe('2026-12-01');
  });
  it('pasif > paylaşılmadı > yayında > süresi doldu', () => {
    expect(anketYayinDurumu({ pasif: true }, [{ dueDate: '2027-01-01' }], BUGUN)).toBe('pasif');
    expect(anketYayinDurumu({}, [], BUGUN)).toBe('taslak');
    expect(anketYayinDurumu({}, [{ dueDate: '2026-11-01' }, { dueDate: '—' }], BUGUN)).toBe(
      'yayinda'
    );
    expect(anketYayinDurumu({}, [{ dueDate: '2026-11-01' }], BUGUN)).toBe('suresi_doldu');
  });
  it('paylaşım açık mı: pasif anket ve süresi dolan paylaşım kapalı', () => {
    expect(atamaAcikMi({ dueDate: '2026-12-01' }, {}, BUGUN)).toBe(true);
    expect(atamaAcikMi({ dueDate: '2026-12-01' }, { pasif: true }, BUGUN)).toBe(false);
    expect(atamaAcikMi({ dueDate: '2026-11-01' }, {}, BUGUN)).toBe(false);
  });
  it('kartın son tarihi en geç olanı; süresiz varsa boş', () => {
    expect(anketSonTarihi([{ dueDate: '2026-11-01' }, { dueDate: '2026-12-01' }])).toBe(
      '2026-12-01'
    );
    expect(anketSonTarihi([{ dueDate: '2026-11-01' }, { dueDate: '—' }])).toBe('');
  });
  it('süre uzatma: geçmiş tarih ve geçersiz girdi reddedilir', () => {
    expect(sureUzatmaHatasi('2026-11-15', BUGUN)).toBe('');
    expect(sureUzatmaHatasi('2026-11-14', BUGUN)).toMatch(/bugünden önce/);
    expect(sureUzatmaHatasi('', BUGUN)).toMatch(/tarih/);
  });
  it('bugunTarihi yerel tarih verir', () => {
    expect(bugunTarihi(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('yüklü anketler süzgeci', () => {
  const anketler = [
    {
      id: 'a',
      title: 'Ders Değerlendirme',
      _sahipBirim: 'Bilgisayar Mühendisliği',
      _olusturan: 'Dr. Ali',
      linkedCourses: [{ code: 'BLM101' }],
    },
    { id: 'b', title: 'Memnuniyet', _sahipBirim: 'Makine Mühendisliği', _olusturan: 'Dr. Can' },
    { id: 'c', title: 'Kapalı', _sahipBirim: 'Bilgisayar Mühendisliği', pasif: true },
  ];
  const atamalar = { a: [{ dueDate: '2026-12-01' }], b: [{ dueDate: '2026-10-01' }] };
  const of = (id) => atamalar[id] || [];
  it('seçenekler listeden çıkar', () => {
    expect(suzgecSecenekleri(anketler)).toEqual({
      birimler: ['Bilgisayar Mühendisliği', 'Makine Mühendisliği'],
      akademisyenler: ['Dr. Ali', 'Dr. Can'],
    });
  });
  it('durum, birim, akademisyen ve arama birlikte süzer', () => {
    const ids = (s) => anketListesiniSuz(anketler, s, of, BUGUN).map((a) => a.id);
    expect(ids({ durum: 'suresi_doldu' })).toEqual(['b']);
    expect(ids({ durum: 'pasif' })).toEqual(['c']);
    expect(ids({ birim: 'Bilgisayar Mühendisliği' })).toEqual(['a', 'c']);
    expect(ids({ akademisyen: 'Dr. Ali' })).toEqual(['a']);
    expect(ids({ arama: 'blm101' })).toEqual(['a']);
    expect(durumSayilari(anketler, of, BUGUN)).toEqual({
      yayinda: 1,
      suresi_doldu: 1,
      pasif: 1,
      taslak: 0,
    });
  });
});
