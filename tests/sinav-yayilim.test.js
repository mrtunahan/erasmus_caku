import { describe, it, expect } from 'vitest';
import {
  sinavKilitliMi,
  dersYayilimYamalari,
  dersSilmePlani,
  salonAdiYamalari,
  salonuKullananlar,
  programSalonCevir,
  gozetmenCikarmaPlani,
} from '../lib/sinav-yayilim.js';

const donemler = [{ _docId: 'p1', departmentId: 'bil', examType: 'vize', semester: 'Güz 2026' }];
const e = (id, ek) => ({ id, periodId: 'p1', departmentId: 'bil', date: '2026-11-09', ...ek });

describe('sınava yayılım', () => {
  it('kilit: gönderilmiş grubun sınavı, kimlik biçimleriyle', () => {
    const g = [{ _docId: 'bilgisayar__vize:güz_2026', durum: 'gonderildi' }];
    const varyant = (b) => (b === 'bil' ? ['bil', 'bilgisayar'] : [b]);
    expect(sinavKilitliMi(e('a'), { donemler, gonderimler: g, varyant })).toBe(true);
    expect(
      sinavKilitliMi(e('a'), { donemler, gonderimler: [{ ...g[0], durum: 'iade' }], varyant })
    ).toBe(false);
  });
  it('ders değişikliği yalnız dersin eski değerini taşıyan alana yazılır', () => {
    const eski = { code: 'MAT101', professor: 'Dr. A', duration: 60 };
    const yeni = { code: 'MAT101', professor: 'Dr. B', duration: 90 };
    const l = dersYayilimYamalari(eski, yeni, [
      e('1', { code: 'MAT101', professor: 'Dr. A', duration: 60 }),
      e('2', { code: 'MAT101', professor: 'Dr. Özel', duration: 60 }),
    ]);
    expect(l.map((x) => [x.id, x.data])).toEqual([
      ['1', { professor: 'Dr. B', duration: 90 }],
      ['2', { duration: 90 }],
    ]);
    expect(dersYayilimYamalari(eski, eski, [e('1')])).toEqual([]);
  });
  it('ders silme: ortak oturumda tek kalan üyenin bağı çözülür', () => {
    const tum = [
      e('1', { birlesimId: 'B1' }),
      e('2', { birlesimId: 'B1' }),
      e('3', { birlesimId: 'B2' }),
      e('4', { birlesimId: 'B2' }),
      e('5', { birlesimId: 'B2' }),
    ];
    const p = dersSilmePlani([tum[0], tum[2]], tum);
    expect(p.silinecek).toEqual(['1', '3']);
    expect(p.bagCoz).toEqual([{ id: '2', data: { birlesimId: '' } }]);
  });
  it('salon adı: oda metni, ek salon ve salon dağılımı çevrilir', () => {
    const l = salonAdiYamalari('M101', 'M-101', [
      e('1', {
        room: 'M101 - M102',
        otomatikEkSalon: 'M101',
        salonGozetmenleri: [{ salon: 'M101', gozetmenler: ['X'] }],
      }),
      e('2', { room: 'M1010' }),
    ]);
    expect(l).toHaveLength(1);
    expect(l[0].data.room).toBe('M-101 - M102');
    expect(l[0].data.otomatikEkSalon).toBe('M-101');
    expect(l[0].data.salonGozetmenleri[0].salon).toBe('M-101');
    expect(
      salonuKullananlar(
        'M102',
        [e('1', { room: 'M101, M102' }), e('2', { room: 'M102', date: '2020-01-01' })],
        '2026-01-01'
      ).map((x) => x.id)
    ).toEqual(['1']);
    const p = programSalonCevir(
      { a: [{ classroom: 'M101' }, { classroom: 'X' }], b: { classroom: 'M101' } },
      'M101',
      'Y'
    );
    expect(p.degisen).toBe(2);
  });
  it('gözetmen çıkarma: yalnız otomatik atamadan; elle girilen listelenir; gün süzgeci', () => {
    const p = gozetmenCikarmaPlani(
      'Özgür Yılmaz',
      [
        e('1', { supervisor: 'Ozgur Yilmaz, Can', otomatikGozetmen: true }),
        e('2', { supervisor: 'Özgür Yılmaz', otomatikGozetmen: false }),
        e('3', { supervisor: 'Özgür Yılmaz', otomatikGozetmen: true, date: '2026-11-10' }),
      ],
      { gunler: ['2026-11-09'] }
    );
    expect(p.yamalar.map((x) => [x.id, x.data.supervisor])).toEqual([['1', 'Can']]);
    expect(p.elle.map((x) => x.id)).toEqual(['2']);
  });
});

describe('ders programı salon çevirisi ek dersleri kapsar', () => {
  it('dersler ve ikinci', () => {
    const p = programSalonCevir(
      {
        a: {
          classroom: 'M1',
          dersler: [{ classroom: 'M1' }, { classroom: 'M2' }],
          ikinci: { classroom: 'M1' },
        },
      },
      'M1',
      'Z'
    );
    expect(p.degisen).toBe(3);
    expect(p.slots.a.dersler[1].classroom).toBe('M2');
  });
});
