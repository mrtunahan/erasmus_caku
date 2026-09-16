// ══════════════════════════════════════════════════════════════
// İSTEMCİ VE SUNUCU AYNI SINIFI SÖYLEMELİ
//
// Sınıf kuralı iki dosyada duruyor — istemci ESM (lib/ogrenci-sinif.js),
// sunucu CJS (server/lib/ogrenci-sinif.js). Projenin ESM/CJS ayrımı bunu
// gerektiriyor, ama ikisi ayrışırsa ortaya SESSİZ bir hata çıkar: tarama
// betiği bir sınıf yazar, öğrencinin ekranı başka sınıf gösterir.
//
// Bu test ikisini birbirine bağlar: aynı girdi kümesinde aynı sonucu
// vermek zorundalar. Birini değiştiren ötekini de değiştirmek zorunda.
// ══════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as istemci from '../lib/ogrenci-sinif.js';

const require = createRequire(import.meta.url);
const sunucu = require('../server/lib/ogrenci-sinif.js');

const NUMARALAR = [
  '260905037',
  '250905012',
  '240905003',
  '230905046',
  '200905037',
  '990905001',
  '270905001',
  ' 2609 05037 ',
  '2609',
  'bozuk',
  '',
  null,
  260905037,
];

const AYARLAR = [
  { tarih: '2026-09-16T00:00:00Z', referansYil: 2026 },
  { tarih: '2026-03-05T00:00:00Z', referansYil: 2026 },
  { tarih: '2027-09-20T00:00:00Z', referansYil: 2027 },
  { tarih: '2026-09-16T00:00:00Z', referansYil: 2026, programYili: 2 },
  { tarih: '2026-09-16T00:00:00Z', referansYil: 2026, programYili: 6 },
];

describe('istemci ↔ sunucu eşitliği', () => {
  it('girisYili aynı sonucu verir', () => {
    AYARLAR.forEach((a) =>
      NUMARALAR.forEach((no) =>
        expect(sunucu.girisYili(no, a), `no=${no}`).toBe(istemci.girisYili(no, a))
      )
    );
  });

  it('nominalSinif aynı sonucu verir', () => {
    AYARLAR.forEach((a) =>
      NUMARALAR.forEach((no) =>
        expect(sunucu.nominalSinif(no, a), `no=${no}`).toEqual(istemci.nominalSinif(no, a))
      )
    );
  });

  it('akademikYilBasi aynı sonucu verir', () => {
    ['2026-09-16T00:00:00Z', '2026-03-05T00:00:00Z', '2026-08-31T00:00:00Z'].forEach((t) =>
      expect(sunucu.akademikYilBasi(t)).toBe(istemci.akademikYilBasi(t))
    );
  });

  it('sinifSayisi aynı sonucu verir', () => {
    [3, '3', '3. sınıf', '2023', 0, 9, '', null, 'bilmiyorum'].forEach((v) =>
      expect(sunucu.sinifSayisi(v), `v=${v}`).toBe(istemci.sinifSayisi(v))
    );
  });

  it('ogrenciSinifi aynı sonucu verir', () => {
    const ogrenciler = [
      { studentNumber: '260905037' },
      { studentNumber: '260905037', sinif: '3' },
      { studentNumber: '210905037', programYili: 6 },
      { studentNo: '240905003' },
      { girisNumarasi: '250905002' },
      { studentNumber: 'bozuk' },
      {},
    ];
    AYARLAR.forEach((a) =>
      ogrenciler.forEach((o) =>
        expect(sunucu.ogrenciSinifi(o, a), JSON.stringify(o)).toEqual(istemci.ogrenciSinifi(o, a))
      )
    );
  });

  it('sinifTaramasi aynı raporu verir', () => {
    const ogrenciler = [
      { studentNumber: '260905001' },
      { studentNumber: '250905002' },
      { studentNumber: '240905003', sinif: '3' },
      { studentNumber: '240905004', sinif: '1' },
      { studentNumber: 'bozuk' },
      { studentNumber: '200905005' },
    ];
    AYARLAR.forEach((a) =>
      expect(sunucu.sinifTaramasi(ogrenciler, a)).toEqual(istemci.sinifTaramasi(ogrenciler, a))
    );
  });

  it('varsayılan program süresi iki tarafta aynı', () => {
    expect(sunucu.VARSAYILAN_PROGRAM_YILI).toBe(istemci.VARSAYILAN_PROGRAM_YILI);
  });
});
