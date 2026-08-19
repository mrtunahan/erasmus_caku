// Bölüm seçme listeleri 57 bölümü düz sıralıyordu; fakülte başlığı altında
// gruplanınca hem kısalıyor hem de benzer adlı bölümler ayırt edilebiliyor.
import { describe, it, expect } from 'vitest';
import { bolumleriFakulteyeGrupla, baslikGosterilsinMi } from '../lib/bolum-gruplama.js';

const BOLUMLER = [
  { id: 'makine', name: 'Makine Mühendisliği', facultyId: 'muhendislik' },
  { id: 'bilgisayar', name: 'Bilgisayar Mühendisliği', facultyId: 'muhendislik' },
  { id: 'f1', name: 'Fizik Bölümü', facultyId: 'fen' },
  { id: 'm1', name: 'İnşaat', facultyId: 'myo' },
  { id: 'y1', name: 'Yönetim ve Organizasyon', facultyId: 'myo' },
];
const ADLAR = {
  muhendislik: 'Mühendislik Fakültesi',
  fen: 'Fen Fakültesi',
  myo: 'Meslek Yüksekokulu',
};

describe('bolumleriFakulteyeGrupla', () => {
  it('bölümleri fakülte başlığı altında toplar', () => {
    const g = bolumleriFakulteyeGrupla(BOLUMLER, ADLAR);
    expect(g.map((x) => x.ad)).toEqual([
      'Fen Fakültesi',
      'Meslek Yüksekokulu',
      'Mühendislik Fakültesi',
    ]);
    expect(g[2].bolumler.map((d) => d.id)).toEqual(['bilgisayar', 'makine']);
  });

  it('fakülteler ve bölümler Türkçe sıralanır', () => {
    // 'İ' ASCII sıralamada 'Z'den sonra gelir; tr-TR ile 'I'dan hemen sonra.
    const g = bolumleriFakulteyeGrupla(
      [
        { id: 'a', name: 'Zooloji', facultyId: 'fen' },
        { id: 'b', name: 'İstatistik', facultyId: 'fen' },
        { id: 'c', name: 'Coğrafya', facultyId: 'fen' },
      ],
      ADLAR
    );
    expect(g[0].bolumler.map((d) => d.name)).toEqual(['Coğrafya', 'İstatistik', 'Zooloji']);
  });

  it('haric verilen bölüm listede yer almaz', () => {
    // Çapraz-bölüm ataması: akademisyeni kendi bölümünden çekmek anlamsız.
    const g = bolumleriFakulteyeGrupla(BOLUMLER, ADLAR, { haric: 'makine' });
    const hepsi = g.flatMap((x) => x.bolumler.map((d) => d.id));
    expect(hepsi).not.toContain('makine');
    expect(hepsi).toContain('bilgisayar');
  });

  it('haric birden çok kimlik alabilir', () => {
    const g = bolumleriFakulteyeGrupla(BOLUMLER, ADLAR, { haric: ['makine', 'f1'] });
    const hepsi = g.flatMap((x) => x.bolumler.map((d) => d.id));
    expect(hepsi.sort()).toEqual(['bilgisayar', 'm1', 'y1']);
  });

  it('fakültesi çözülemeyen bölüm EN SONDA "Diğer" altında', () => {
    const g = bolumleriFakulteyeGrupla(
      [...BOLUMLER, { id: 'x', name: 'Sahipsiz Bölüm', facultyId: 'silinmis' }],
      ADLAR
    );
    expect(g[g.length - 1].ad).toBe('Diğer');
    expect(g[g.length - 1].bolumler.map((d) => d.id)).toEqual(['x']);
  });

  it('fakültesiz bölüm de "Diğer" altına düşer', () => {
    const g = bolumleriFakulteyeGrupla([{ id: 'x', name: 'Bölüm' }], ADLAR);
    expect(g).toHaveLength(1);
    expect(g[0].ad).toBe('Diğer');
  });

  it('kimliksiz kayıtlar atlanır, boş girdide çökmez', () => {
    expect(bolumleriFakulteyeGrupla([null, {}, { name: 'Kimliksiz' }], ADLAR)).toEqual([]);
    expect(bolumleriFakulteyeGrupla(null, null)).toEqual([]);
  });
});

describe('baslikGosterilsinMi', () => {
  it('fakülte adları HENÜZ YÜKLENMEDİYSE başlık yazılmaz', () => {
    // Aksi halde yükleme sırasında 57 bölüm "Diğer" altında görünürdü.
    const g = bolumleriFakulteyeGrupla(BOLUMLER, {});
    expect(g).toHaveLength(1);
    expect(baslikGosterilsinMi(g)).toBe(false);
  });

  it('gerçek fakülte grubu varsa başlık yazılır', () => {
    expect(baslikGosterilsinMi(bolumleriFakulteyeGrupla(BOLUMLER, ADLAR))).toBe(true);
  });

  it('boş listede başlık yok', () => {
    expect(baslikGosterilsinMi([])).toBe(false);
    expect(baslikGosterilsinMi(null)).toBe(false);
  });
});
