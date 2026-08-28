// ══════════════════════════════════════════════════════════════
// BAYAT PARÇA (STALE CHUNK) YENİLEMESİ
//
// Yeni sürüm yayınlanınca eski parça dosyaları siliniyor; açık sekme eski
// adı isteyip 404 alıyor ve "Modül yüklenemedi" çıkıyordu. Sayfa bir kez
// kendisi yenilenmeli — BİR KEZ, yoksa gerçek bir arızada sonsuz döngü.
// ══════════════════════════════════════════════════════════════
import { describe, it, expect, beforeEach } from 'vitest';
import {
  bayatParcaHatasiMi,
  damgaAnahtari,
  yuklemeKarari,
  damgayiSil,
  hataMetni,
} from '../lib/modul-yukleme.js';

function sahteDepo() {
  const veri = new Map();
  return {
    getItem: (k) => (veri.has(k) ? veri.get(k) : null),
    setItem: (k, v) => veri.set(k, String(v)),
    removeItem: (k) => veri.delete(k),
    _veri: veri,
  };
}

describe('bayatParcaHatasiMi', () => {
  it('tarayıcıların bayat parça metinlerini tanır', () => {
    [
      'Failed to fetch dynamically imported module: https://x/assets/a-1.js',
      'error loading dynamically imported module',
      'Importing a module script failed.',
      'Failed to load module script: MIME type',
      'Unable to load https://x/assets/yatay-gecis-modulu-WIpcbSwD.js',
    ].forEach((m) => expect(bayatParcaHatasiMi(new Error(m))).toBe(true));
  });

  it('GERÇEK KOD HATASINI bayat sanmaz — yenilemek döngü üretirdi', () => {
    [
      new Error('x is not defined'),
      new TypeError("Cannot read properties of undefined (reading 'map')"),
      new SyntaxError('Unexpected token'),
      new Error(''),
      null,
      undefined,
    ].forEach((h) => expect(bayatParcaHatasiMi(h)).toBe(false));
  });

  it('düz metin hatayı da kabul eder', () => {
    expect(bayatParcaHatasiMi('Failed to fetch dynamically imported module')).toBe(true);
  });
});

describe('yuklemeKarari', () => {
  let depo;
  beforeEach(() => {
    depo = sahteDepo();
  });
  const bayat = new Error('Failed to fetch dynamically imported module: /assets/a.js');

  it('ilk bayat hatada sayfa yenilenir', () => {
    expect(yuklemeKarari(bayat, 'yataygecis', depo)).toBe('yenile');
  });

  it('İKİNCİ KEZ YENİLEMEZ — sonsuz döngü olurdu', () => {
    expect(yuklemeKarari(bayat, 'yataygecis', depo)).toBe('yenile');
    expect(yuklemeKarari(bayat, 'yataygecis', depo)).toBe('hata');
    expect(yuklemeKarari(bayat, 'yataygecis', depo)).toBe('hata');
  });

  it('damga MODÜL BAŞINA — başka modül kendi hakkını kullanır', () => {
    expect(yuklemeKarari(bayat, 'yataygecis', depo)).toBe('yenile');
    expect(yuklemeKarari(bayat, 'staj', depo)).toBe('yenile');
  });

  it('gerçek kod hatasında yenileme yok', () => {
    expect(yuklemeKarari(new Error('x is not defined'), 'yataygecis', depo)).toBe('hata');
    expect(depo._veri.size).toBe(0);
  });

  it('depo yoksa yenilemez — damga tutulamayınca döngü riski var', () => {
    expect(yuklemeKarari(bayat, 'yataygecis', null)).toBe('hata');
  });

  it('depo yazamıyorsa (gizli sekme) yenilemez', () => {
    const kirik = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
      removeItem: () => {},
    };
    expect(yuklemeKarari(bayat, 'yataygecis', kirik)).toBe('hata');
  });
});

describe('damgayiSil', () => {
  it('başarılı yüklemeden sonra hak geri gelir', () => {
    const depo = sahteDepo();
    const bayat = new Error('Failed to fetch dynamically imported module');
    expect(yuklemeKarari(bayat, 'yataygecis', depo)).toBe('yenile');
    damgayiSil('yataygecis', depo);
    expect(yuklemeKarari(bayat, 'yataygecis', depo)).toBe('yenile');
  });
  it('deposuz çağrı patlamaz', () => {
    expect(() => damgayiSil('x', null)).not.toThrow();
  });
});

describe('damgaAnahtari', () => {
  it('modüle göre ayrışır', () => {
    expect(damgaAnahtari('staj')).not.toBe(damgaAnahtari('yataygecis'));
  });
});

describe('hataMetni', () => {
  it('bayat parçada yeni sürümden söz eder', () => {
    expect(hataMetni(new Error('Failed to fetch dynamically imported module'))).toMatch(
      /yeni bir sürümü/
    );
  });
  it('diğer hatalarda bağlantı kontrolü önerir', () => {
    expect(hataMetni(new Error('x is not defined'))).toMatch(/Bağlantınızı/);
  });
});
