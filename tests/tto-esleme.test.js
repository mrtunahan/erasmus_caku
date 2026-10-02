import { describe, it, expect } from 'vitest';
import { talepEslemePlani, anahtarKimlikleri, kisiAnahtari } from '../lib/tto-esleme.js';

const IBAN = 'TR330006100519786457841326';
const talep = (ek) => ({
  id: 't1',
  sahip: 'Dr. Ali Veli',
  durum: 'gorevlendirildi',
  talepNo: '2026/30',
  talepTarihi: '2026-09-20',
  yonetimKarariTarihi: '2026-10-01',
  gonderimTarihi: '2026-09-18T10:00:00Z',
  proje: { ad: 'Akıllı sulama' },
  firma: { ad: 'Örnek Makine A.Ş.', vergiNo: '1234567890', vergiDairesi: 'Çankırı', eposta: '' },
  proformaKurus: 2500000,
  odemeBilgileri: { iban: IBAN },
  ...ek,
});
const PERSONEL = [{ ad: 'Dr. Ali Veli', bolum: 'Bilgisayar Mühendisliği', fakulte: 'Mühendislik' }];

describe('TTO talebi → otomasyon eşlemesi', () => {
  it('unvan ve Türkçe harf duyarsız ad anahtarı', () => {
    expect(kisiAnahtari('Prof. Dr. Ali VELİ')).toBe(kisiAnahtari('Ali Veli'));
  });

  it('yeni akademisyen, firma ve iş kaydı planlar', () => {
    const p = talepEslemePlani({
      talepler: [talep()],
      akademisyenler: [],
      firmalar: [],
      kayitlar: [],
      personel: PERSONEL,
      oranYillari: [2026],
    });
    expect(p.akademisyenEkle).toEqual([
      { ad: 'Dr. Ali Veli', bolum: 'Bilgisayar Mühendisliği', fakulte: 'Mühendislik', iban: IBAN },
    ]);
    expect(p.firmaEkle).toEqual([
      { ad: 'Örnek Makine A.Ş.', vergiNo: '1234567890', vergiDairesi: 'Çankırı' },
    ]);
    expect(p.kayitEkle).toHaveLength(1);
    expect(p.kayitEkle[0].veri).toMatchObject({
      yil: 2026,
      yapilanIs: 'Akıllı sulama',
      talepTarihi: '2026-09-20',
      faturaKurus: 2500000,
      tahsilat: 'edilmedi',
      odeme: 'odenmedi',
      ibanAnlik: IBAN,
      talepId: 't1',
    });
    const kim = anahtarKimlikleri(
      [{ id: 'a9', ad: 'Ali VELİ' }],
      [{ id: 'f9', ad: 'örnek makine a.ş.' }]
    );
    expect(kim.akademisyen.get(p.kayitEkle[0].akademisyenAnahtari)).toBe('a9');
    expect(kim.firma.get(p.kayitEkle[0].firmaAnahtari)).toBe('f9');
  });

  it('var olanı ezmez, yalnız boş alanı doldurur; kayıt bir kez açılır', () => {
    const p = talepEslemePlani({
      talepler: [talep(), talep({ id: 't2', durum: 'onaylandi', firma: null })],
      akademisyenler: [{ id: 'a1', ad: 'Prof. Dr. Ali Veli', iban: '', bolum: 'Elle yazılmış' }],
      firmalar: [{ id: 'f1', ad: 'ÖRNEK MAKİNE A.Ş.', vergiNo: '999' }],
      kayitlar: [{ talepId: 't1' }],
      personel: PERSONEL,
      oranYillari: [2026],
    });
    expect(p.akademisyenEkle).toEqual([]);
    expect(p.akademisyenGuncelle).toEqual([
      { id: 'a1', veri: { fakulte: 'Mühendislik', iban: IBAN } },
    ]);
    expect(p.firmaEkle).toEqual([]);
    expect(p.firmaGuncelle).toEqual([{ id: 'f1', veri: { vergiDairesi: 'Çankırı' } }]);
    expect(p.kayitEkle).toEqual([]);
  });

  it('onay öncesi ve reddedilen talepler aktarılmaz; eksikte sebep bildirilir', () => {
    const p = talepEslemePlani({
      talepler: [
        talep({ id: 'g', durum: 'gonderildi' }),
        talep({ id: 'r', durum: 'reddedildi' }),
        talep({ id: 'o', talepNo: '2026/31', yonetimKarariTarihi: '2027-01-05' }),
        talep({ id: 'z', talepNo: '2026/32', proformaKurus: 0 }),
      ],
      akademisyenler: [],
      firmalar: [],
      kayitlar: [],
      oranYillari: [2026],
    });
    expect(p.akademisyenEkle).toHaveLength(1);
    expect(p.kayitEkle).toEqual([]);
    expect(p.atlanan).toEqual([
      { talepId: 'o', talepNo: '2026/31', sebep: '2027 yılı için oran tanımlı değil (Ayarlar).' },
      { talepId: 'z', talepNo: '2026/32', sebep: 'Proforma tutarı girilmemiş.' },
    ]);
  });

  it('bir kez aktarılan parça (silinmiş olsa da) yeniden aktarılmaz', () => {
    const ilk = talepEslemePlani({
      talepler: [talep({ durum: 'onaylandi', odemeBilgileri: null, firma: null })],
      akademisyenler: [],
      firmalar: [],
      kayitlar: [],
      oranYillari: [2026],
    });
    expect(ilk.isaretler).toEqual({ t1: { akademisyen: true } });
    // Yönetici akademisyeni sildi; talep ilerledi (IBAN, firma, karar).
    const sonra = talepEslemePlani({
      talepler: [talep()],
      akademisyenler: [],
      firmalar: [],
      kayitlar: [],
      oranYillari: [2026],
      yapilanlar: { t1: { akademisyen: true, firma: true, kayit: true } },
    });
    expect(sonra.akademisyenEkle).toEqual([]);
    expect(sonra.firmaEkle).toEqual([]);
    expect(sonra.kayitEkle).toEqual([]);
    expect(sonra.isaretler).toEqual({});
  });
});
