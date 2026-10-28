import { describe, it, expect } from 'vitest';
import { bolumModulIzinleri, AKADEMISYEN_MODULLERI, CAPRAZ_YEDEK } from '../lib/modul-izinleri.js';

const TUM = ['benim', 'benimakademik', 'sinav', 'staj', 'erasmus', 'projeler', 'akademisyenler'];

describe('rol → bölüm modülleri', () => {
  it('çapraz bölüm: verilen liste, yoksa derse bağlı yedek', () => {
    expect(bolumModulIzinleri({ capraz: true, caprazListe: ['sinav'], yonetici: true })).toEqual([
      'sinav',
    ]);
    expect(bolumModulIzinleri({ capraz: true })).toEqual(CAPRAZ_YEDEK);
  });
  it('yönetici: Benim Sayfam hariç hepsi', () => {
    expect(bolumModulIzinleri({ yonetici: true, akademisyen: true, tumIdler: TUM })).toEqual(
      TUM.filter((x) => x !== 'benim')
    );
  });
  it('akademisyen ve öğrenci', () => {
    expect(bolumModulIzinleri({ akademisyen: true })).toEqual(AKADEMISYEN_MODULLERI);
    const ogr = bolumModulIzinleri({});
    expect(ogr).toContain('projeler');
    expect(ogr).not.toContain('dikeygecis');
    expect(bolumModulIzinleri({ dikeyKaydi: true })).toContain('dikeygecis');
  });
});
