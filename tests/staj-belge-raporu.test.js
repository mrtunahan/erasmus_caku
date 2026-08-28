// ══════════════════════════════════════════════════════════════
// STAJ BELGE DURUM RAPORU
//
// Komisyonun elindeki soru: bu etaptaki kim hangi belgeyi yüklemiş?
// Raporun "Belge yüklü" derken emin olması gerekiyor — boş kabuk yükleme
// kayıtları (silinmiş/url'siz) yüklü sayılmamalı.
// ══════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import {
  BELGE_SUTUNLARI,
  BOS_SUTUNLAR,
  YUKLU,
  YUKSUZ,
  belgeYuklendiMi,
  belgeDurumMetni,
  kurumBilgisi,
  raporBasliklari,
  raporSatiri,
  raporTablosu,
  raporDosyaAdi,
} from '../lib/staj-belge-raporu.js';

const basvuru = {
  id: 'a1',
  stajEtapLabel: '2025 Yaz Stajı',
  ogrenciNo: '222222222',
  adSoyad: 'Ece İrem Filiz',
  stajYeriAdi: 'ASELSAN',
  stajYeriAdresi: 'Ankara',
  stajYeriTelefon: '0312 000 00 00',
};

// Gerçek şema: { fileName, fileSize, fileType, uploadedAt, status,
// serverPath, downloadURL } — üzerine `changeRequest` eklenebiliyor.
const yuklemeler = {
  zorunlu_staj_formu: {
    fileName: 'zorunlu.pdf',
    status: 'yuklendi',
    downloadURL: 'https://x/1.pdf',
  },
  staj_basvuru_formu_ek1: { fileName: 'ek1.pdf', status: 'yuklendi' },
  // Yalnızca değişiklik talebi bırakılmış, dosya atıfı yok → yüklü sayılmaz.
  kimlik_fotokopisi: { changeRequest: { status: 'pending' } },
  staj_defteri: { fileName: 'defter.pdf', deleted: true }, // silinmiş
};

describe('belgeYuklendiMi', () => {
  it('url varsa yüklüdür', () => {
    expect(belgeYuklendiMi(yuklemeler, 'zorunlu_staj_formu')).toBe(true);
  });
  it('sunucuya gidememiş ama dosya adı kayıtlıysa yüklüdür', () => {
    expect(belgeYuklendiMi(yuklemeler, 'staj_basvuru_formu_ek1')).toBe(true);
  });
  it('DOSYA ATIFI OLMAYAN KABUK yüklü sayılmaz (yalnız değişiklik talebi)', () => {
    expect(belgeYuklendiMi(yuklemeler, 'kimlik_fotokopisi')).toBe(false);
  });
  it('SİLİNMİŞ yükleme yüklü sayılmaz', () => {
    expect(belgeYuklendiMi(yuklemeler, 'staj_defteri')).toBe(false);
  });
  it('kayıt yoksa yüklü değildir', () => {
    expect(belgeYuklendiMi(yuklemeler, 'turnitin_raporu')).toBe(false);
    expect(belgeYuklendiMi(null, 'turnitin_raporu')).toBe(false);
  });
  it('doğrudan url metni de kabul edilir (eski kayıtlar)', () => {
    expect(belgeYuklendiMi({ x: 'https://x/a.pdf' }, 'x')).toBe(true);
    expect(belgeYuklendiMi({ x: '  ' }, 'x')).toBe(false);
  });
});

describe('belgeDurumMetni', () => {
  it('iki durumdan birini yazar', () => {
    expect(belgeDurumMetni(yuklemeler, 'zorunlu_staj_formu')).toBe(YUKLU);
    expect(belgeDurumMetni(yuklemeler, 'turnitin_raporu')).toBe(YUKSUZ);
  });
});

describe('kurumBilgisi', () => {
  it('ad, adres ve telefonu birleştirir', () => {
    expect(kurumBilgisi(basvuru)).toBe('ASELSAN — Ankara — 0312 000 00 00');
  });
  it('boş alanları atlar', () => {
    expect(kurumBilgisi({ stajYeriAdi: 'ASELSAN' })).toBe('ASELSAN');
    expect(kurumBilgisi({})).toBe('');
  });
});

describe('raporBasliklari', () => {
  it('sıra: kimlik → kurum → belgeler → boş sütunlar', () => {
    const b = raporBasliklari();
    expect(b.slice(0, 4)).toEqual(['Staj Etabı', 'Öğrenci Numarası', 'Adı Soyadı', 'Staj Yeri']);
    expect(b.slice(4, 4 + BELGE_SUTUNLARI.length)).toEqual(BELGE_SUTUNLARI.map(([, ad]) => ad));
    expect(b.slice(-2)).toEqual(BOS_SUTUNLAR);
    expect(b).toHaveLength(4 + BELGE_SUTUNLARI.length + BOS_SUTUNLAR.length);
  });
});

describe('raporSatiri', () => {
  it('kimlik ve belge durumlarını yazar', () => {
    const s = raporSatiri(basvuru, yuklemeler);
    expect(s.slice(0, 4)).toEqual([
      '2025 Yaz Stajı',
      '222222222',
      'Ece İrem Filiz',
      'ASELSAN — Ankara — 0312 000 00 00',
    ]);
    expect(s[4]).toBe(YUKLU); // zorunlu staj formu
    expect(s[6]).toBe(YUKSUZ); // kimlik fotokopisi (boş kabuk)
    expect(s[7]).toBe(YUKSUZ); // staj defteri (silinmiş)
  });
  it('EK-2 VE NOT SÜTUNLARI BOŞ GELİR', () => {
    const s = raporSatiri(basvuru, yuklemeler);
    expect(s.slice(-2)).toEqual(['', '']);
  });
  it('hiç yükleme yoksa tüm belgeler yüklenmemiş', () => {
    const s = raporSatiri(basvuru, undefined);
    expect(s.slice(4, 4 + BELGE_SUTUNLARI.length).every((x) => x === YUKSUZ)).toBe(true);
  });
});

describe('raporTablosu', () => {
  const b2 = { ...basvuru, id: 'a2', ogrenciNo: '111111111', adSoyad: 'Ali Veli' };
  const b3 = { ...basvuru, id: 'a3', ogrenciNo: '333333333', stajEtapLabel: '2024 Yaz Stajı' };

  it('başlık + satır döndürür', () => {
    const t = raporTablosu([basvuru], { a1: yuklemeler });
    expect(t).toHaveLength(2);
    expect(t[0]).toEqual(raporBasliklari());
  });
  it('etaba, sonra öğrenci numarasına göre sıralar', () => {
    const t = raporTablosu([basvuru, b2, b3], {});
    expect(t.slice(1).map((r) => [r[0], r[1]])).toEqual([
      ['2024 Yaz Stajı', '333333333'],
      ['2025 Yaz Stajı', '111111111'],
      ['2025 Yaz Stajı', '222222222'],
    ]);
  });
  it('her başvurunun yüklemesi kendi kimliğinden okunur', () => {
    const t = raporTablosu([basvuru, b2], { a1: yuklemeler });
    const satirA1 = t.find((r) => r[1] === '222222222');
    const satirA2 = t.find((r) => r[1] === '111111111');
    expect(satirA1[4]).toBe(YUKLU);
    expect(satirA2[4]).toBe(YUKSUZ);
  });
  it('boş listede yalnız başlık kalır', () => {
    expect(raporTablosu([], {})).toHaveLength(1);
    expect(raporTablosu(null, null)).toHaveLength(1);
  });
});

describe('raporDosyaAdi', () => {
  it('etap etiketinden dosya adı üretir', () => {
    expect(raporDosyaAdi('2025 Yaz Stajı')).toBe('staj-belge-durumu-2025_Yaz_Stajı.xlsx');
  });
  it('etiket yoksa seçilen öğrenciler adını kullanır', () => {
    expect(raporDosyaAdi('')).toBe('staj-belge-durumu-Secilen-Ogrenciler.xlsx');
  });
});
