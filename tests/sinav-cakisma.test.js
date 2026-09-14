import { describe, it, expect } from 'vitest';
import {
  araligi,
  cakismaAnahtari,
  cakismaOzeti,
  cakismalariBul,
  dakikaya,
  gozetmenleri,
  kabulKaydi,
  programHazirMi,
  salonlari,
  zamanCakisiyorMu,
  musaitsizGunler,
  musaitsizlikHaritasi,
  gozetmenMusaitMi,
} from '../lib/sinav-cakisma.js';

const sinav = (ek) =>
  Object.assign(
    {
      id: 's' + Math.random().toString(36).slice(2, 8),
      code: 'BLM101',
      date: '2026-06-01',
      timeSlot: '09:00',
      duration: 60,
      sinif: 1,
      studentCount: 30,
      departmentId: 'bilgisayar',
      room: 'M11101',
      supervisor: '',
    },
    ek
  );

const KAPASITE = { M11101: 42, M10Z07: 49, M11103: 58 };

describe('dakikaya / araligi', () => {
  it('saat dakikaya çevrilir', () => {
    expect(dakikaya('08:30')).toBe(510);
    expect(dakikaya('17:00')).toBe(1020);
  });

  it('geçersiz saat -1', () => {
    expect(dakikaya('')).toBe(-1);
    expect(dakikaya('abc')).toBe(-1);
  });

  it('aralık süreden hesaplanır, süresiz sınav 60 dk sayılır', () => {
    expect(araligi(sinav({ timeSlot: '09:00', duration: 90 }))).toEqual([540, 630]);
    expect(araligi(sinav({ timeSlot: '09:00', duration: 0 }))).toEqual([540, 600]);
  });
});

describe('zamanCakisiyorMu', () => {
  it('örtüşen saatler çakışır', () => {
    const a = sinav({ timeSlot: '09:00', duration: 90 });
    const b = sinav({ timeSlot: '10:00', duration: 60 });
    expect(zamanCakisiyorMu(a, b)).toBe(true);
  });

  it('bitişik sınavlar çakışmaz', () => {
    // 09:00–10:00 ve 10:00–11:00 peş peşedir, çakışma değildir.
    const a = sinav({ timeSlot: '09:00', duration: 60 });
    const b = sinav({ timeSlot: '10:00', duration: 60 });
    expect(zamanCakisiyorMu(a, b)).toBe(false);
  });

  it('farklı gün çakışmaz', () => {
    expect(zamanCakisiyorMu(sinav(), sinav({ date: '2026-06-02' }))).toBe(false);
  });

  it('tarihsiz/saatsiz sınav çakışmaz', () => {
    expect(zamanCakisiyorMu(sinav({ date: '' }), sinav())).toBe(false);
    expect(zamanCakisiyorMu(sinav({ timeSlot: '' }), sinav())).toBe(false);
    expect(zamanCakisiyorMu(null, sinav())).toBe(false);
  });
});

describe('salonlari / gozetmenleri', () => {
  it('çoklu salon ayrıştırılır', () => {
    expect(salonlari({ room: 'M11101 - M10Z07' })).toEqual(['M11101', 'M10Z07']);
    expect(salonlari({ room: '' })).toEqual([]);
  });

  it('gözetmenler virgülle ayrışır', () => {
    expect(gozetmenleri({ supervisor: 'A Hoca, B Hoca' })).toEqual(['A Hoca', 'B Hoca']);
  });
});

describe('cakismaAnahtari', () => {
  it('sıra fark etmez — iki taraf aynı kaydı görür', () => {
    const a = sinav({ id: 'x' });
    const b = sinav({ id: 'y' });
    expect(cakismaAnahtari('salon', a, b, 'M11101')).toBe(cakismaAnahtari('salon', b, a, 'M11101'));
  });
});

describe('salon çakışması', () => {
  it('KAPASİTE YETİYORSA şartlı kabul edilebilir', () => {
    // Fakültede bir salonda iki bölümün sınavı bilerek birlikte yapılabiliyor.
    const a = sinav({ id: 'a', studentCount: 20, room: 'M11101' });
    const b = sinav({
      id: 'b',
      studentCount: 20,
      room: 'M11101',
      departmentId: 'elektrik',
      sinif: 2,
    });
    const c = cakismalariBul([a, b], { salonKapasiteleri: KAPASITE });
    expect(c.length).toBe(1);
    expect(c[0].tur).toBe('salon');
    expect(c[0].seviye).toBe('uyari');
    expect(c[0].kabulEdilebilir).toBe(true);
    expect(c[0].aciklama).toMatch(/farklı bölümler/);
  });

  it('KAPASİTE YETMİYORSA engeldir, kabul edilemez', () => {
    const a = sinav({ id: 'a', studentCount: 30, room: 'M11101' });
    const b = sinav({ id: 'b', studentCount: 30, room: 'M11101', departmentId: 'elektrik' });
    const c = cakismalariBul([a, b], { salonKapasiteleri: KAPASITE });
    expect(c[0].seviye).toBe('engel');
    expect(c[0].kabulEdilebilir).toBe(false);
  });

  it('kapasitesi tanımsız salon engel sayılır', () => {
    const a = sinav({ id: 'a', room: 'M111BL' });
    const b = sinav({ id: 'b', room: 'M111BL', departmentId: 'elektrik' });
    expect(cakismalariBul([a, b], { salonKapasiteleri: KAPASITE })[0].seviye).toBe('engel');
  });

  it('çoklu salonda ORTAK salon yakalanır', () => {
    const a = sinav({ id: 'a', studentCount: 10, room: 'M11101 - M10Z07' });
    const b = sinav({ id: 'b', studentCount: 10, room: 'M10Z07', departmentId: 'elektrik' });
    const c = cakismalariBul([a, b], { salonKapasiteleri: KAPASITE });
    expect(c.length).toBe(1);
    expect(c[0].baslik).toMatch(/M10Z07/);
  });

  it('salonsuz sınavlar çakışma üretmez', () => {
    const a = sinav({ id: 'a', room: '' });
    const b = sinav({ id: 'b', room: '', departmentId: 'elektrik', sinif: 3 });
    expect(cakismalariBul([a, b], { salonKapasiteleri: KAPASITE })).toEqual([]);
  });
});

describe('gözetmen çakışması', () => {
  it('AYNI SALONDA ise tek gözetmen ikisini gözetebilir → uyarı', () => {
    const a = sinav({ id: 'a', studentCount: 10, room: 'M11101', supervisor: 'A Hoca' });
    const b = sinav({
      id: 'b',
      studentCount: 10,
      room: 'M11101',
      supervisor: 'A Hoca',
      departmentId: 'elektrik',
    });
    const c = cakismalariBul([a, b], { salonKapasiteleri: KAPASITE });
    const g = c.find((x) => x.tur === 'gozetmen');
    expect(g.seviye).toBe('uyari');
  });

  it('FARKLI SALONDA ise fiziksel engeldir', () => {
    const a = sinav({ id: 'a', room: 'M11101', supervisor: 'A Hoca' });
    const b = sinav({
      id: 'b',
      room: 'M10Z07',
      supervisor: 'A Hoca',
      departmentId: 'elektrik',
    });
    const g = cakismalariBul([a, b], { salonKapasiteleri: KAPASITE }).find(
      (x) => x.tur === 'gozetmen'
    );
    expect(g.seviye).toBe('engel');
  });

  it('gözetmeni olmayan sınavlar çakışma üretmez', () => {
    const a = sinav({ id: 'a', room: 'M11101', supervisor: '' });
    const b = sinav({ id: 'b', room: 'M10Z07', supervisor: '', departmentId: 'elektrik' });
    expect(cakismalariBul([a, b], { salonKapasiteleri: KAPASITE })).toEqual([]);
  });
});

describe('sınıf çakışması', () => {
  it('aynı bölüm + aynı sınıf engeldir', () => {
    const a = sinav({ id: 'a', sinif: 2, room: '' });
    const b = sinav({ id: 'b', sinif: 2, room: '', code: 'BLM202' });
    const c = cakismalariBul([a, b], {});
    expect(c[0].tur).toBe('sinif');
    expect(c[0].seviye).toBe('engel');
  });

  it('SEÇMELİ derslerde uyarıdır — öğrenci kümeleri ayrışmış olabilir', () => {
    const a = sinav({ id: 'a', sinif: 5, room: '' });
    const b = sinav({ id: 'b', sinif: 5, room: '', code: 'BLM555' });
    const c = cakismalariBul([a, b], {});
    expect(c[0].seviye).toBe('uyari');
    expect(c[0].cozum).toMatch(/ortak öğrenci/i);
  });

  it('FARKLI bölümlerin aynı sınıfı çakışma değildir', () => {
    const a = sinav({ id: 'a', sinif: 2, room: '' });
    const b = sinav({ id: 'b', sinif: 2, room: '', departmentId: 'elektrik' });
    expect(cakismalariBul([a, b], {})).toEqual([]);
  });
});

describe('şartlı kabul', () => {
  const ciftBolum = () => [
    sinav({ id: 'a', studentCount: 20, room: 'M11101' }),
    sinav({ id: 'b', studentCount: 20, room: 'M11101', departmentId: 'elektrik', sinif: 2 }),
  ];

  it('kabul kaydı çakışmaya işlenir', () => {
    const [a, b] = ciftBolum();
    const ilk = cakismalariBul([a, b], { salonKapasiteleri: KAPASITE })[0];
    const k = kabulKaydi(ilk, 'Kapasite yeterli, iki bölüm ortak salon kullanıyor', {
      name: 'Bölüm Yetkilisi',
    });
    expect(k.olur).toBe(true);
    const sonra = cakismalariBul([a, b], {
      salonKapasiteleri: KAPASITE,
      kabuller: [k.kayit],
    })[0];
    expect(sonra.kabul).not.toBe(null);
    expect(sonra.kabul.sebep).toMatch(/Kapasite yeterli/);
  });

  it('SEBEPSİZ kabul edilemez', () => {
    const [a, b] = ciftBolum();
    const ilk = cakismalariBul([a, b], { salonKapasiteleri: KAPASITE })[0];
    expect(kabulKaydi(ilk, '', {}).olur).toBe(false);
    expect(kabulKaydi(ilk, 'ok', {}).olur).toBe(false);
  });

  it('ENGEL seviyesindeki çakışma kabul edilemez', () => {
    const a = sinav({ id: 'a', studentCount: 30, room: 'M11101' });
    const b = sinav({ id: 'b', studentCount: 30, room: 'M11101', departmentId: 'elektrik' });
    const ilk = cakismalariBul([a, b], { salonKapasiteleri: KAPASITE })[0];
    expect(kabulKaydi(ilk, 'olsun', {}).olur).toBe(false);
  });

  it('kayıtta kabul olsa bile ENGEL yok sayılmaz', () => {
    // Fiziksel imkânsızlık onaylanarak ortadan kalkmaz.
    const a = sinav({ id: 'a', studentCount: 30, room: 'M11101' });
    const b = sinav({ id: 'b', studentCount: 30, room: 'M11101', departmentId: 'elektrik' });
    const anahtar = cakismalariBul([a, b], { salonKapasiteleri: KAPASITE })[0].anahtar;
    const sonra = cakismalariBul([a, b], {
      salonKapasiteleri: KAPASITE,
      kabuller: [{ anahtar, sebep: 'olsun' }],
    })[0];
    expect(sonra.kabul).toBe(null);
  });
});

describe('özet ve hazırlık', () => {
  it('sayaçlar doğru', () => {
    const engel = sinav({ id: 'a', sinif: 2, room: '' });
    const engel2 = sinav({ id: 'b', sinif: 2, room: '', code: 'X' });
    const c = cakismalariBul([engel, engel2], {});
    expect(cakismaOzeti(c)).toEqual({ toplam: 1, engel: 1, bekleyen: 0, kabul: 0 });
  });

  it('engel varken program hazır değil', () => {
    const c = cakismalariBul(
      [sinav({ id: 'a', sinif: 2, room: '' }), sinav({ id: 'b', sinif: 2, room: '', code: 'X' })],
      {}
    );
    expect(programHazirMi(c)).toBe(false);
  });

  it('kabul BEKLEYEN uyarı varken de hazır değil', () => {
    // "Görmezden gel" bir seçenek değil: ya düzelt ya şartlı kabul et.
    const a = sinav({ id: 'a', studentCount: 20, room: 'M11101' });
    const b = sinav({
      id: 'b',
      studentCount: 20,
      room: 'M11101',
      departmentId: 'elektrik',
      sinif: 2,
    });
    expect(programHazirMi(cakismalariBul([a, b], { salonKapasiteleri: KAPASITE }))).toBe(false);
  });

  it('hepsi kabul edilmişse hazır', () => {
    const a = sinav({ id: 'a', studentCount: 20, room: 'M11101' });
    const b = sinav({
      id: 'b',
      studentCount: 20,
      room: 'M11101',
      departmentId: 'elektrik',
      sinif: 2,
    });
    const ilk = cakismalariBul([a, b], { salonKapasiteleri: KAPASITE })[0];
    const k = kabulKaydi(ilk, 'Ortak salon kullanımı planlandı', { name: 'Yetkili' });
    const c = cakismalariBul([a, b], { salonKapasiteleri: KAPASITE, kabuller: [k.kayit] });
    expect(programHazirMi(c)).toBe(true);
  });

  it('çakışma yoksa hazır', () => {
    expect(programHazirMi([])).toBe(true);
    expect(cakismalariBul(null, null)).toEqual([]);
  });

  it('engeller listede önce gelir', () => {
    const a = sinav({ id: 'a', sinif: 2, room: 'M11101', studentCount: 30 });
    const b = sinav({ id: 'b', sinif: 2, room: 'M11101', studentCount: 30, code: 'X' });
    const c = cakismalariBul([a, b], { salonKapasiteleri: KAPASITE });
    expect(c[0].seviye).toBe('engel');
  });
});

describe('gözetmen müsaitliği', () => {
  const kisiler = [
    { name: 'A Hoca', gozetmenMusaitsizGunler: ['2026-06-02', '2026-06-02', '2026-06-01'] },
    { name: 'B Hoca' },
    { name: '', gozetmenMusaitsizGunler: ['2026-06-01'] },
  ];

  it('günler tekilleşir ve sıralanır', () => {
    expect(musaitsizGunler(kisiler[0])).toEqual(['2026-06-01', '2026-06-02']);
    expect(musaitsizGunler({})).toEqual([]);
    expect(musaitsizGunler(null)).toEqual([]);
  });

  it('harita yalnız günü olanları taşır, adsız kayıt atlanır', () => {
    expect(musaitsizlikHaritasi(kisiler)).toEqual({
      'A Hoca': ['2026-06-01', '2026-06-02'],
    });
  });

  it('müsait olmadığı günde atanamaz', () => {
    const h = musaitsizlikHaritasi(kisiler);
    expect(gozetmenMusaitMi('A Hoca', '2026-06-01', h)).toBe(false);
    expect(gozetmenMusaitMi('A Hoca', '2026-06-03', h)).toBe(true);
    expect(gozetmenMusaitMi('B Hoca', '2026-06-01', h)).toBe(true);
  });

  it('eksik girdide engellemez — kural yoksa müsait sayılır', () => {
    expect(gozetmenMusaitMi('', '2026-06-01', {})).toBe(true);
    expect(gozetmenMusaitMi('A Hoca', '', {})).toBe(true);
    expect(gozetmenMusaitMi('A Hoca', '2026-06-01', null)).toBe(true);
  });
});
