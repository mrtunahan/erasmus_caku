import { describe, it, expect } from 'vitest';
import { sinavKuralRaporu, raporMetni } from '../lib/sinav-kural-raporu.js';
import { programImzasi } from '../lib/sinav-fakulte.js';

const bolumler = [
  { id: 'bil', name: 'Bilgisayar', facultyId: 'muh', kimlikler: ['bil', 'bilgisayar'] },
  { id: 'mak', name: 'Makine', facultyId: 'muh', kimlikler: ['mak'] },
  { id: 'tar', name: 'Tarih', facultyId: 'fen', kimlikler: ['tar'] },
];
const donemler = [
  {
    _docId: 'p1',
    departmentId: 'bil',
    examType: 'final',
    semester: 'Güz 2026',
    label: 'Final - Güz 2026',
  },
  {
    _docId: 'p2',
    departmentId: 'mak',
    examType: 'final',
    semester: 'Güz 2026',
    label: 'Final - Güz 2026',
  },
];
const e = (id, ek) => ({
  _docId: id,
  code: id.toUpperCase(),
  date: '2026-11-09',
  timeSlot: '10:00',
  duration: 60,
  room: 'M1',
  periodId: 'p1',
  departmentId: 'bil',
  ...ek,
});

describe('sınav kural raporu', () => {
  const sinavlar = [
    e('a'),
    e('b', { timeSlot: '10:30', periodId: 'p2', departmentId: 'mak', supervisor: 'Ali Tarih' }),
    e('c', { timeSlot: '11:30', room: 'M2' }),
    e('eski', { date: '2025-01-01' }),
  ];
  const gonderimler = [
    { _docId: 'bilgisayar__final:güz_2026', durum: 'gonderildi', imza: 'farkli' },
  ];
  const r = sinavKuralRaporu({
    sinavlar,
    donemler,
    gonderimler,
    kabuller: [{ anahtar: 'salon|M1|a|b', sebep: 'ortak', kabulEden: 'X', bolumler: ['bil'] }],
    bolumler,
    fakulteler: [],
    akademisyenler: [
      { name: 'Ali Tarih', departmentId: 'tar', gozetmenBolumleri: ['mak'] },
      { name: 'Can Bil', departmentId: 'bil', gozetmenBolumleri: ['mak'] },
    ],
    bugun: '2026-10-01',
  });
  it('aynı salonda örtüşeni bulur, geçmişi almaz', () => {
    expect(r.sinavSayisi).toBe(3);
    expect(r.salonOrtusmeleri).toHaveLength(1);
    expect(r.salonOrtusmeleri[0].salonlar).toEqual(['M1']);
  });
  it('salon kabulünü geçersiz listeler', () => {
    expect(r.gecersizKabuller[0].bolumler).toEqual(['Bilgisayar']);
  });
  it('gönderim durumunu bölüm kimliği biçimlerinden bulur', () => {
    expect(r.gonderilmemisler.map((x) => x.bolum)).toEqual(['Makine']);
    expect(r.degisenler.map((x) => x.bolum)).toEqual(['Bilgisayar']);
  });
  it('imza tutuyorsa değişmiş sayılmaz', () => {
    const bil = sinavlar.filter((x) => x.departmentId === 'bil' && x.date >= '2026');
    const r2 = sinavKuralRaporu({
      sinavlar,
      donemler,
      gonderimler: [
        {
          _docId: 'bil__final:güz_2026',
          durum: 'gonderildi',
          imza: programImzasi(bil.map((x) => ({ ...x, id: x._docId }))),
        },
      ],
      bolumler,
      bugun: '2026-10-01',
    });
    expect(r2.degisenler).toEqual([]);
  });
  it('başka fakülteden gözetmeni listeler', () => {
    expect(r.digerFakulteGozetmenleri).toEqual([
      { bolum: 'Makine', kisiler: [{ ad: 'Ali Tarih', anaBolum: 'Tarih', kayitliGorev: 1 }] },
    ]);
    expect(raporMetni(r)).toMatch(/AYNI SALONDA/);
  });
});

describe('biçimsel düzeltme sonrası gönderim imzası', () => {
  it('imzası tutan gönderim yeni imzayı alır, zaten değişmiş olana dokunulmaz', async () => {
    const { imzaTazelemeleri } = await import('../lib/sinav-kural-raporu.js');
    const { programImzasi, donemGrubu, gonderimKimlikleri } =
      await import('../lib/sinav-fakulte.js');
    const donem = {
      _docId: 'p1',
      departmentId: 'bil',
      label: 'Vize - Güz',
      tur: 'vize',
      semester: 'Güz 2026-2027',
    };
    const once = [
      {
        id: 'e1',
        periodId: 'p1',
        departmentId: 'bil',
        code: 'BLM101',
        date: '2026-11-09',
        timeSlot: '09:00',
        supervisor: 'Öğrt. Gör. Gökalp Saylam',
      },
    ];
    const sonra = [{ ...once[0], supervisor: 'Öğr. Gör. GÖKALP SAYLAM' }];
    const id = gonderimKimlikleri('bil', donemGrubu(donem))[0];
    const tutan = { _docId: id, durum: 'gonderildi', imza: programImzasi(once) };
    const r = imzaTazelemeleri({
      once,
      sonra,
      donemler: [donem],
      gonderimler: [tutan],
      bolumler: [{ id: 'bil', kimlikler: [] }],
    });
    expect(r).toHaveLength(1);
    expect(r[0].yeniImza).toBe(programImzasi(sonra));
    const degismis = { ...tutan, imza: 'baska' };
    expect(
      imzaTazelemeleri({
        once,
        sonra,
        donemler: [donem],
        gonderimler: [degismis],
        bolumler: [{ id: 'bil' }],
      })
    ).toEqual([]);
  });
});
