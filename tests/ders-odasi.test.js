import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  dosyaKarari,
  dosyaUzantisi,
  donemAnahtari,
  donemEtiketi,
  kisaYil,
  odaKimligi,
  etkinSonTarih,
  teslimKabulKarari,
  gecTeslimMi,
  teslimDurumu,
  puanKarari,
  puanMetni,
  adSoyadAyir,
  ogrencileriSuz,
  odevOzeti,
  notCizelgesiVerisi,
  NOT_CIZELGESI_STATIC,
  NOT_CIZELGESI_ROWS,
  ODEV_SINIRI,
  bildirimMetni,
  hatirlatmaZamaniMi,
  tarihSaat,
  dersProgramiOzeti,
  guvenliBaglanti,
  baglantilariAyir,
  akisZamani,
  notKalemleri,
  agirlikToplami,
  agirlikliOrtalama,
  harfNotu,
  notAyariDogrula,
  adMaskele,
  noMaskele,
  dersKimlikleri,
  odaDersKimlikleri,
  dersSeciliMi,
} from '../lib/ders-odasi.js';

const MB = 1024 * 1024;

describe('dosya', () => {
  it('5 MB sınırı ve izinli uzantılar', () => {
    expect(dosyaKarari({ ad: 'odev.pdf', boyut: 5 * MB }, 5).izin).toBe(true);
    expect(dosyaKarari({ ad: 'odev.pdf', boyut: 5 * MB + 1 }, 5).izin).toBe(false);
    expect(dosyaKarari({ ad: 'virus.exe', boyut: 10 }, 5).izin).toBe(false);
    expect(dosyaKarari({ ad: 'QUIZ_2.DOCX', boyut: 10 }, 5).izin).toBe(true);
    expect(dosyaKarari({ ad: 'bos.pdf', boyut: 0 }, 5).izin).toBe(false);
  });
  it('uzantı küçük harfe iner', () => {
    expect(dosyaUzantisi('Rapor.Final.PDF')).toBe('pdf');
    expect(dosyaUzantisi('uzantisiz')).toBe('');
  });
});

describe('dönem ve oda kimliği', () => {
  it('Eylül-Ocak güz, Şubat-Ağustos bahar', () => {
    expect(donemAnahtari(new Date('2026-10-14T10:00:00Z'))).toBe('2026-2027_guz');
    expect(donemAnahtari(new Date('2027-01-10T10:00:00Z'))).toBe('2026-2027_guz');
    expect(donemAnahtari(new Date('2027-03-01T10:00:00Z'))).toBe('2026-2027_bahar');
  });
  it('etiket ve kısa yıl', () => {
    expect(donemEtiketi('2026-2027_guz')).toMatch(/2026-2027.*Güz/);
    expect(kisaYil('2025-2026_guz')).toBe('25-26');
  });
  it('oda kimliği tür + kaynak + dönemden; aynı ders farklı dönemde farklı oda', () => {
    const a = odaKimligi('ders', 'bil345', '2026-2027_guz');
    expect(a).toBe('ders-bil345-2026-2027_guz');
    expect(odaKimligi('ders', 'bil345', '2026-2027_bahar')).not.toBe(a);
  });
});

describe('teslim kabulü', () => {
  const son = '2026-11-21T20:59:00.000Z';
  const once = '2026-11-21T20:00:00.000Z';
  const sonra = '2026-11-22T08:00:00.000Z';
  it('süre içinde kabul, geç değil', () => {
    expect(teslimKabulKarari({ sonTarih: son }, '1', once)).toEqual({
      izin: true,
      gec: false,
      sebep: '',
    });
  });
  it('son tarih geçince geç teslim açıksa geç kabul, kapalıysa red', () => {
    expect(teslimKabulKarari({ sonTarih: son, gecKabul: true }, '1', sonra)).toMatchObject({
      izin: true,
      gec: true,
    });
    expect(teslimKabulKarari({ sonTarih: son, gecKabul: false }, '1', sonra).izin).toBe(false);
  });
  it('gönderim kapatılınca red; ek süre verilen öğrenci yine teslim eder', () => {
    const od = { sonTarih: son, kabulAcik: false, ekSureler: { 7: '2026-11-25T20:59:00.000Z' } };
    expect(teslimKabulKarari(od, '1', once).izin).toBe(false);
    expect(teslimKabulKarari(od, '7', sonra)).toMatchObject({ izin: true, gec: false });
    expect(etkinSonTarih(od, '7')).toBe('2026-11-25T20:59:00.000Z');
  });
  it('süresiz ödev hep açık', () => {
    expect(teslimKabulKarari({}, '1', sonra).izin).toBe(true);
  });
  it('geç teslim, öğrencinin kendi son tarihine göre', () => {
    const od = { sonTarih: son, ekSureler: { 7: '2026-11-25T20:59:00.000Z' } };
    expect(gecTeslimMi(od, '1', sonra)).toBe(true);
    expect(gecTeslimMi(od, '7', sonra)).toBe(false);
  });
});

describe('teslim durumu', () => {
  const od = { sonTarih: '2026-11-21T20:59:00.000Z' };
  it('atandı → eksik (süre geçti)', () => {
    expect(teslimDurumu(od, null, '1', '2026-11-20T00:00:00Z')).toBe('atandi');
    expect(teslimDurumu(od, null, '1', '2026-11-23T00:00:00Z')).toBe('eksik');
  });
  it('teslim / geç / not geri verildi', () => {
    expect(
      teslimDurumu(od, { teslimEdildi: true, teslimZamani: '2026-11-21T10:00:00Z' }, '1')
    ).toBe('teslim');
    expect(
      teslimDurumu(od, { teslimEdildi: true, teslimZamani: '2026-11-22T10:00:00Z' }, '1')
    ).toBe('gec');
    expect(teslimDurumu(od, { teslimEdildi: true, puan: 15, geriVerildi: true }, '1')).toBe(
      'notlandi'
    );
  });
  it('geri verilmemiş taslak not durumu değiştirmez', () => {
    expect(
      teslimDurumu(od, { teslimEdildi: true, teslimZamani: '2026-11-21T10:00:00Z', puan: 15 }, '1')
    ).toBe('teslim');
  });
});

describe('not', () => {
  it('0..maks arası, virgüllü ondalık kabul, iki basamağa yuvarlanır', () => {
    expect(puanKarari('15,5', 20)).toEqual({ gecerli: true, deger: 15.5 });
    expect(puanKarari('12.345', 20).deger).toBe(12.35);
    expect(puanKarari('21', 20).gecerli).toBe(false);
    expect(puanKarari('-1', 20).gecerli).toBe(false);
    expect(puanKarari('abc', 20).gecerli).toBe(false);
    expect(puanKarari('', 20)).toEqual({ gecerli: true, deger: '' });
  });
  it('puan metni virgüllü', () => {
    expect(puanMetni(15.5)).toBe('15,5');
    expect(puanMetni('')).toBe('');
  });
});

describe('öğrenci süzme ve sıralama', () => {
  const liste = [
    { no: '240905010', ad: 'Zeynep', soyad: 'Arslan' },
    { no: '240905002', ad: 'Ahmet', soyad: 'Yılmaz' },
    { no: '240905040', ad: 'Çağrı', soyad: 'Demir' },
  ];
  const notlar = { 240905010: 18, 240905002: '' };
  const durumlar = { 240905010: 'notlandi', 240905002: 'gec', 240905040: 'eksik' };
  const o = { durumBul: (n) => durumlar[n], notBul: (n) => (notlar[n] == null ? '' : notlar[n]) };
  it('soyada, ada, numaraya göre', () => {
    expect(ogrencileriSuz(liste, { ...o, sira: 'soyad' }).map((s) => s.soyad)).toEqual([
      'Arslan',
      'Demir',
      'Yılmaz',
    ]);
    expect(ogrencileriSuz(liste, { ...o, sira: 'ad' }).map((s) => s.ad)).toEqual([
      'Ahmet',
      'Çağrı',
      'Zeynep',
    ]);
    expect(ogrencileriSuz(liste, { ...o, sira: 'no' }).map((s) => s.no)).toEqual([
      '240905002',
      '240905010',
      '240905040',
    ]);
  });
  it('not verilmiş / verilmemiş / geç / teslimsiz', () => {
    expect(ogrencileriSuz(liste, { ...o, durum: 'notlu' }).map((s) => s.no)).toEqual(['240905010']);
    expect(ogrencileriSuz(liste, { ...o, durum: 'notsuz' })).toHaveLength(2);
    expect(ogrencileriSuz(liste, { ...o, durum: 'gec' }).map((s) => s.no)).toEqual(['240905002']);
    expect(ogrencileriSuz(liste, { ...o, durum: 'teslimsiz' }).map((s) => s.no)).toEqual([
      '240905040',
    ]);
  });
  it('arama Türkçe büyük/küçük harf duyarsız; ad, soyad, numara', () => {
    expect(ogrencileriSuz(liste, { arama: 'çağ' })).toHaveLength(1);
    expect(ogrencileriSuz(liste, { arama: 'YILMAZ' })).toHaveLength(1);
    expect(ogrencileriSuz(liste, { arama: '0905040' })).toHaveLength(1);
  });
  it('adSoyadAyir: ayrı alan yoksa son kelime soyad', () => {
    expect(adSoyadAyir({ name: 'Ayşe Nur Kaya' })).toEqual({ ad: 'Ayşe Nur', soyad: 'Kaya' });
    expect(adSoyadAyir({ firstName: 'Ali', lastName: 'Veli' })).toEqual({
      ad: 'Ali',
      soyad: 'Veli',
    });
  });
});

describe('ödev özeti', () => {
  it('teslim eden, teslim etmeyen, not verilen', () => {
    const od = { id: 'o1', sonTarih: '' };
    const ogr = [{ no: '1' }, { no: '2' }, { no: '3' }];
    const t = [
      { ogrenciNo: '1', teslimEdildi: true, puan: 10 },
      { ogrenciNo: '2', teslimEdildi: false, puan: 0 },
    ];
    expect(odevOzeti(od, ogr, t)).toEqual({ teslim: 1, notlu: 2, atanan: 2 });
  });
});

describe('not çizelgesi', () => {
  const oda = {
    dersKod: 'BLM103',
    dersAd: 'Bilgisayar Mühendisliğine Giriş',
    donem: '2025-2026_guz',
    hocalar: ['Dr. Ali Veli'],
  };
  const odevler = [
    { id: 'a', baslik: 'ÖDEV-1', puan: 20 },
    { id: 'b', baslik: 'ÖDEV-2', puan: 20 },
  ];
  const ogrenciler = [
    { no: '1', ad: 'Ahmet', soyad: 'Yılmaz' },
    { no: '2', ad: 'Zeynep', soyad: 'Arslan' },
  ];
  const teslimler = [
    { icerikId: 'a', ogrenciNo: '1', puan: 18, teslimEdildi: true },
    { icerikId: 'b', ogrenciNo: '1', puan: 15.5, teslimEdildi: true },
    { icerikId: 'a', ogrenciNo: '2', puan: '', teslimEdildi: true },
  ];
  const v = notCizelgesiVerisi({
    oda,
    odevler,
    ogrenciler,
    teslimler,
    kunye: { bolumAd: 'Bilgisayar Mühendisliği' },
    simdi: '2026-10-14T09:00:00Z',
  });
  it('satırlar: ödev notları, toplam, 100 üzerinden ortalama', () => {
    expect(v.rows[0]).toMatchObject({
      sira: '1',
      ogrenciNo: '1',
      odev1: '18',
      odev2: '15,5',
      toplam: '33,5',
      ortalama: '83,75',
      teslimSayisi: '2',
    });
    expect(v.rows[1]).toMatchObject({ odev1: '', toplam: '', ortalama: '', teslimSayisi: '1' });
    expect(v.rows[0].odev20).toBe('');
  });
  it('künye', () => {
    expect(v.staticData).toMatchObject({
      baslik: '2025-2026 Güz Dönemi Ödev Not Çizelgesi',
      dersKodAd: 'BLM103 - Bilgisayar Mühendisliğine Giriş',
      ogretimUyesi: 'Dr. Ali Veli',
      bolumAd: 'Bilgisayar Mühendisliği',
      ogrenciSayisi: '2',
      odevSayisi: '2',
      tarih: '14 Ekim 2026 Çarşamba',
    });
    expect(v.staticData.odevListesi).toBe('1.Ödev: ÖDEV-1 / 20 puan; 2.Ödev: ÖDEV-2 / 20 puan');
  });
  it('sınırdan fazla ödevde uyarı', () => {
    const cok = Array.from({ length: ODEV_SINIRI + 2 }, (_, i) => ({
      id: 'x' + i,
      baslik: 'Ö' + i,
      puan: 10,
    }));
    const r = notCizelgesiVerisi({ oda, odevler: cok, ogrenciler, teslimler: [] });
    expect(r.odevler).toHaveLength(ODEV_SINIRI);
    expect(r.uyari).toMatch(/ilk 20/);
  });
  it('her satır alanı değişken listesinde tanımlı', () => {
    const ids = new Set(NOT_CIZELGESI_ROWS.map((f) => f.id));
    Object.keys(v.rows[0]).forEach((k) => expect(ids.has(k), k).toBe(true));
    const sids = new Set(NOT_CIZELGESI_STATIC.map((f) => f.id));
    NOT_CIZELGESI_STATIC.forEach((f) => expect(v.staticData[f.id], f.id).toBeDefined());
    expect(sids.size).toBe(NOT_CIZELGESI_STATIC.length);
  });
});

// Hazır şablonun yer tutucuları, değişken etiketleriyle (sablonlar-modulu.jsx
// otomatik eşleme kuralı) eşleşmeli; yoksa yüklenen şablonun alanları boş çıkar.
describe('hazır şablon yer tutucuları', () => {
  const normTr = (s) =>
    (s || '')
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLocaleLowerCase('tr-TR')
      .replace(/[^0-9a-zçğıöşü]/g, '');
  const eslesir = new Set();
  NOT_CIZELGESI_STATIC.concat(NOT_CIZELGESI_ROWS).forEach((f) => {
    eslesir.add(normTr(f.label));
    eslesir.add(normTr(f.label.replace(/\(.*?\)/g, '')));
  });
  const betik = readFileSync(new URL('../scripts/ders-odasi-sablonu.py', import.meta.url), 'utf8');
  const tokenlar = new Set();
  [...betik.matchAll(/\{\{([^}]+)\}\}/g)].forEach((m) => {
    const t = m[1];
    if (t.includes('%d'))
      for (let i = 1; i <= ODEV_SINIRI; i++) tokenlar.add(t.replace('%d', String(i)));
    else tokenlar.add(t);
  });
  it('betikte yer tutucu var', () => {
    expect(tokenlar.size).toBeGreaterThan(15);
  });
  it.each([...tokenlar])('%s bir değişken etiketiyle eşleşir', (t) => {
    expect(eslesir.has(normTr(t))).toBe(true);
  });
});

describe('bildirim ve hatırlatma', () => {
  it('Türkiye saatiyle son tarih', () => {
    expect(tarihSaat('2026-11-21T20:59:00.000Z')).toMatch(/21 Kas 2026 23:59/);
    const m = bildirimMetni('odev', {
      dersKod: 'BLM103',
      baslik: 'ÖDEV-2',
      sonTarih: '2026-11-21T20:59:00.000Z',
    });
    expect(m.title).toBe('Yeni ödev: ÖDEV-2');
    expect(m.body).toMatch(/BLM103/);
    expect(bildirimMetni('not', { baslik: 'ÖDEV-2', puan: 15.5, maks: 20 }).body).toMatch(
      /15,5 \/ 20/
    );
  });
  it('son 24 saatte bir kez, kapalı gönderimde hiç', () => {
    const son = '2026-11-21T20:59:00.000Z';
    expect(hatirlatmaZamaniMi({ sonTarih: son }, '2026-11-21T00:00:00Z')).toBe(true);
    expect(hatirlatmaZamaniMi({ sonTarih: son }, '2026-11-19T00:00:00Z')).toBe(false);
    expect(hatirlatmaZamaniMi({ sonTarih: son, hatirlatildi: true }, '2026-11-21T00:00:00Z')).toBe(
      false
    );
    expect(hatirlatmaZamaniMi({ sonTarih: son, kabulAcik: false }, '2026-11-21T00:00:00Z')).toBe(
      false
    );
    expect(hatirlatmaZamaniMi({ sonTarih: son }, '2026-11-22T00:00:00Z')).toBe(false);
  });
});

describe('ders saati özeti (Akış → Ders bilgisi)', () => {
  const slotDersleri = (s) => (s && s.courseCode ? [s].concat(s.dersler || []) : []);
  const etiket = ['08:30-09:15', '09:30-10:15', '10:30-11:15', '11:30-12:15', '13:15-14:00'];
  const dok = (id, slots) => ({ id, slots });
  it('art arda saatler tek aralık, derslikler birleşir, dönem süzülür', () => {
    const d = [
      dok('bilgisayar_guz_1', {
        Pazartesi_1: { courseCode: 'BLM 103', classroom: 'D-204' },
        Pazartesi_2: { courseCode: 'BLM103', classroom: 'D-204' },
        Pazartesi_3: { courseCode: 'BLM103', classroom: 'Lab-2' },
        Çarşamba_4: { courseCode: 'FİZ101', dersler: [{ courseCode: 'blm103', classroom: 'A-1' }] },
        Salı_0: { courseCode: 'MAT101' },
      }),
      dok('bilgisayar_bahar_1', { Cuma_0: { courseCode: 'BLM103' } }),
    ];
    const r = dersProgramiOzeti(d, {
      dersKod: 'BLM103',
      yari: 'guz',
      slotDersleri,
      saatler: () => etiket,
    });
    expect(r).toEqual([
      { gun: 'Pazartesi', baslangic: '09:30', bitis: '12:15', derslikler: ['D-204', 'Lab-2'] },
      { gun: 'Çarşamba', baslangic: '13:15', bitis: '14:00', derslikler: ['A-1'] },
    ]);
  });
  it('arada boşluk varsa iki aralık; program yoksa boş', () => {
    const d = [dok('b_guz_1', { Salı_0: { courseCode: 'X1' }, Salı_2: { courseCode: 'X1' } })];
    expect(
      dersProgramiOzeti(d, { dersKod: 'X1', slotDersleri, saatler: () => etiket })
    ).toHaveLength(2);
    expect(dersProgramiOzeti([], { dersKod: 'X1', slotDersleri })).toEqual([]);
  });
});

describe('bağlantılar ve akış zamanı', () => {
  it('yalnız http(s) bağlantı kabul', () => {
    expect(guvenliBaglanti('https://meet.google.com/abc')).toBe('https://meet.google.com/abc');
    expect(guvenliBaglanti('javascript:alert(1)')).toBe('');
    expect(guvenliBaglanti('meet.google.com')).toBe('');
  });
  it('metindeki bağlantılar ayrılır, cümle sonu noktası dışarıda', () => {
    expect(baglantilariAyir('Kayıt: https://ornek.edu.tr/a?b=1. Teşekkürler')).toEqual([
      { t: 'Kayıt: ' },
      { url: 'https://ornek.edu.tr/a?b=1' },
      { t: '. Teşekkürler' },
    ]);
    expect(baglantilariAyir('düz metin')).toEqual([{ t: 'düz metin' }]);
  });
  it('bugün / dün / tarih (Türkiye saati)', () => {
    const simdi = '2026-10-14T12:00:00Z';
    expect(akisZamani('2026-10-14T06:15:00Z', simdi)).toBe('Bugün, 09:15');
    expect(akisZamani('2026-10-13T15:40:00Z', simdi)).toBe('Dün, 18:40');
    expect(akisZamani('2026-10-01T11:00:00Z', simdi)).toMatch(/1 Eki 2026 14:00/);
  });
});

describe('not defteri: kalemler, ağırlık, harf, maske', () => {
  const odevler = [
    { id: 'a', baslik: 'Ödev 1', puan: 20 },
    { id: 'b', baslik: 'Ödev 2', puan: '' },
  ];
  it('ağırlık girilmemişse kalemler eşit ağırlıklı', () => {
    const ks = notKalemleri(odevler, {});
    expect(ks.map((k) => k.agirlik)).toEqual([50, 50]);
    expect(ks[1].maks).toBe(100);
    expect(ks.map((k) => k.kisa)).toEqual(['Ö1', 'Ö2']);
  });
  it('ödev + vize + final ağırlıklı ortalaması', () => {
    const ks = notKalemleri(odevler, {
      agirliklar: { 'odev:a': 20, 'ek:v': 30, 'ek:f': 50 },
      ekKalemler: [
        { id: 'ek:v', ad: 'Vize Sınavı', maks: 100, yayinlandi: true },
        { id: 'ek:f', ad: 'Final', maks: 100 },
      ],
    });
    expect(agirlikToplami(ks)).toBe(100);
    expect(ks.find((k) => k.id === 'ek:v').kisa).toBe('VS');
    const p = { 'odev:a': 18, 'ek:v': 70, 'ek:f': 80 };
    expect(agirlikliOrtalama(ks, (k) => (k.id in p ? p[k.id] : ''))).toEqual({ ort: 79, eksik: 0 });
    // Final girilmemiş: 0 sayılır, eksik bildirilir.
    const q = { 'odev:a': 18, 'ek:v': 70 };
    expect(agirlikliOrtalama(ks, (k) => (k.id in q ? q[k.id] : ''))).toEqual({ ort: 39, eksik: 1 });
    expect(agirlikliOrtalama(ks, () => '')).toEqual({ ort: '', eksik: 3 });
  });
  it('ağırlık toplamı 100 değilse ölçeklenir', () => {
    const ks = notKalemleri(odevler, { agirliklar: { 'odev:a': 10, 'odev:b': 10 } });
    expect(agirlikliOrtalama(ks, (k) => (k.id === 'odev:a' ? 20 : 50)).ort).toBe(75);
  });
  it('harf notu', () => {
    expect([95, 87, 80, 76, 70, 65, 62, 55, 10].map(harfNotu)).toEqual([
      'AA',
      'BA',
      'BB',
      'CB',
      'CC',
      'DC',
      'DD',
      'FD',
      'FF',
    ]);
    expect(harfNotu('')).toBe('');
  });
  it('not ayarı doğrulama', () => {
    const r = notAyariDogrula(
      {
        agirliklar: { 'odev:a': '40', 'odev:zz': 10, 'ek:v': 60 },
        ekKalemler: [{ id: 'ek:v', ad: 'Vize', maks: '' }, { ad: 'Final' }],
      },
      ['a'],
      () => 'yeni1'
    );
    expect(r.hata).toBeUndefined();
    expect(r.ayar.ekKalemler.map((k) => [k.id, k.maks])).toEqual([
      ['ek:v', 100],
      ['ek:yeni1', 100],
    ]);
    expect(r.ayar.agirliklar).toEqual({ 'odev:a': 40, 'ek:v': 60 });
    expect(notAyariDogrula({ ekKalemler: [{ ad: '' }] }, [], () => 'x').hata).toBeTruthy();
    expect(notAyariDogrula({ agirliklar: { 'odev:a': 150 } }, ['a'], () => 'x').hata).toBeTruthy();
  });
  it('öğrenci kimliği maskelenir', () => {
    expect(adMaskele('Ayşe Nur Yılmaz')).toBe('A*** N** Y*****');
    expect(noMaskele('260905044')).toBe('*********');
  });
});

describe('oda üyeliği: ders kimliği biçimleri', () => {
  const oid = { toString: () => '65f0c0ffee0000000000abcd' };
  it('bütün kimlik biçimleri toplanır', () => {
    expect(dersKimlikleri({ _id: oid })).toEqual(['65f0c0ffee0000000000abcd']);
    expect(dersKimlikleri({ _docId: 'blm103', _id: oid, id: 'eski-1' })).toEqual([
      'blm103',
      '65f0c0ffee0000000000abcd',
      'eski-1',
    ]);
  });
  it('yalnız _id taşıyan dersi seçen öğrenci odaya girer', () => {
    // Benim Sayfam courseIds'e `_docId || _id` yazar; oda eskiden `id`yi anahtar alıyordu.
    const oda = {
      kaynakId: 'eski-1',
      kaynakIdleri: ['blm103', '65f0c0ffee0000000000abcd', 'eski-1'],
    };
    expect(dersSeciliMi(oda, ['65f0c0ffee0000000000abcd'])).toBe(true);
    expect(dersSeciliMi(oda, ['blm103'])).toBe(true);
    expect(dersSeciliMi(oda, ['baska'])).toBe(false);
  });
  it('kaynakIdleri olmayan eski oda kaynakId ile çalışır', () => {
    expect(odaDersKimlikleri({ kaynakId: 'x' })).toEqual(['x']);
    expect(dersSeciliMi({ kaynakId: 'x' }, ['x'])).toBe(true);
  });
});
