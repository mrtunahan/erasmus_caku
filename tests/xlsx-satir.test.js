// XLSX şablonlarında veri satırını bulma kuralı.
//
// Bu testler somut bir üretim hatasından doğdu: Yatay Geçiş modülünün üç
// sekmesinde de belge BOŞ çıkıyordu. Sebep, motorun "yer tutucu içeren İLK
// satır" kuralıyla rapor BAŞLIĞINI veri satırı sanmasıydı — başlıkta da bir
// satır değişkeni geçiyordu ({{başvurduğu_bölüm}}). Asıl veri satırının
// değişkenleri boş dizeyle değiştiriliyor, hücrede yalnız " / " ayraçları
// kalıyordu.
//
// Aşağıdaki yapı, kullanıcının gerçek şablonlarından birebir alınmıştır.
import { describe, it, expect } from 'vitest';
import { veriSatiriSec, satirTokenSayisi } from '../lib/xlsx-satir.js';

// Paylaşılan metin tablosu (xl/sharedStrings.xml karşılığı)
const strings = [
  // 0 — rapor başlığı: İÇİNDE BİR SATIR DEĞİŞKENİ VAR
  'ÇANKIRI KARATEKİN ÜNİVERSİTESİ MÜHENDİSLİK FAKÜLTESİ {{başvurduğu_bölüm}} ' +
    'MÜHENDİSLİĞİ BÖLÜMÜ {{eğitim_yılı}} EĞİTİM-ÖĞRETİM YILI {{dönem}} DÖNEMİ',
  // 1..3 — sütun başlıkları (yer tutucu yok)
  'SIRA\r\nNO',
  'ADI SOYADI',
  'DEĞERLENDİRME SONUCU',
  // 4..7 — veri satırı hücreleri
  '{{ad_soyad}}',
  '{{HALEN_ÖĞRENİM GÖRDÜĞÜ_ÜNİ}}\r\n{{HALEN_ÖĞRENİM GÖRDÜĞÜ_FAKÜLTE}}\r\n{{HALEN_ÖĞRENİM GÖRDÜĞÜ_BÖLÜM}}',
  '{{başvurduğu_bölüm}} / {{başvurduğu_SINIF}}',
  '{{DEĞERLENDİRME_UYGUN 1. SINIF (1. ASIL)}}',
];

const tokenHarita = {
  '{{eğitim_yılı}}': { tip: 'static', id: 'egitimYili' },
  '{{dönem}}': { tip: 'static', id: 'donem' },
  '{{başvurduğu_bölüm}}': { tip: 'row', id: 'basvurduguBolum' },
  '{{ad_soyad}}': { tip: 'row', id: 'adSoyad' },
  '{{HALEN_ÖĞRENİM GÖRDÜĞÜ_ÜNİ}}': { tip: 'row', id: 'aktifUniversite' },
  '{{HALEN_ÖĞRENİM GÖRDÜĞÜ_FAKÜLTE}}': { tip: 'row', id: 'aktifFakulte' },
  '{{HALEN_ÖĞRENİM GÖRDÜĞÜ_BÖLÜM}}': { tip: 'row', id: 'aktifBolum' },
  '{{başvurduğu_SINIF}}': { tip: 'row', id: 'basvurduguSinif' },
  '{{DEĞERLENDİRME_UYGUN 1. SINIF (1. ASIL)}}': { tip: 'row', id: 'degerlendirme' },
};

const c = (ref, ssIdx) => `<c r="${ref}" s="4" t="s"><v>${ssIdx}</v></c>`;
const satirlar = [
  // r1 — başlık (tek satır değişkeni: {{başvurduğu_bölüm}})
  `<row r="1" spans="1:4">${c('A1', 0)}</row>`,
  // r2 — sütun başlıkları (hiç yer tutucu yok)
  `<row r="2" spans="1:4">${c('A2', 1)}${c('B2', 2)}${c('D2', 3)}</row>`,
  // r3 — VERİ satırı (6 farklı satır değişkeni)
  `<row r="3" spans="1:4"><c r="A3" s="4"><v>1</v></c>${c('B3', 4)}${c('C3', 5)}${c('D3', 6)}${c('E3', 7)}</row>`,
  // r4 — şablonun boş numaralı doldurma satırı
  `<row r="4" spans="1:4"><c r="A4" s="4"><v>2</v></c></row>`,
];

describe('satirTokenSayisi', () => {
  it('başlık satırında yalnız 1 satır değişkeni sayar', () => {
    expect(satirTokenSayisi(satirlar[0], strings, tokenHarita)).toBe(1);
  });

  it('statik değişkenleri saymaz', () => {
    // Başlıkta {{eğitim_yılı}} ve {{dönem}} de var ama ikisi de static.
    expect(satirTokenSayisi(satirlar[0], strings, tokenHarita)).toBe(1);
  });

  it('veri satırındaki tüm farklı satır değişkenlerini sayar', () => {
    // ad_soyad, ÜNİ, FAKÜLTE, BÖLÜM, başvurduğu_bölüm, başvurduğu_SINIF,
    // DEĞERLENDİRME → 7. Başlıkta 1 olduğuna göre aradaki fark belirgin.
    expect(satirTokenSayisi(satirlar[2], strings, tokenHarita)).toBe(7);
  });

  it('yer tutucusuz satırda 0 döner', () => {
    expect(satirTokenSayisi(satirlar[1], strings, tokenHarita)).toBe(0);
    expect(satirTokenSayisi(satirlar[3], strings, tokenHarita)).toBe(0);
  });

  it('eşlenmemiş yer tutucuyu saymaz', () => {
    const eksikHarita = { '{{ad_soyad}}': { tip: 'row', id: 'adSoyad' } };
    expect(satirTokenSayisi(satirlar[2], strings, eksikHarita)).toBe(1);
  });
});

describe('veriSatiriSec', () => {
  it('BAŞLIĞI değil VERİ satırını seçer (asıl regresyon)', () => {
    // "ilk eşleşen satır" kuralı 0'ı (başlığı) verirdi ve belge boş çıkardı.
    expect(veriSatiriSec(satirlar, strings, tokenHarita)).toBe(2);
  });

  it('hiç satır değişkeni eşlenmemişse -1 döner', () => {
    expect(veriSatiriSec(satirlar, strings, {})).toBe(-1);
  });

  it('yalnız statik değişken varsa -1 döner', () => {
    const yalnizStatik = {
      '{{eğitim_yılı}}': { tip: 'static', id: 'egitimYili' },
      '{{dönem}}': { tip: 'static', id: 'donem' },
    };
    expect(veriSatiriSec(satirlar, strings, yalnizStatik)).toBe(-1);
  });

  it('eşitlikte ilk satırı seçer (kararlı davranış)', () => {
    const iki = [satirlar[0], satirlar[0]];
    expect(veriSatiriSec(iki, strings, tokenHarita)).toBe(0);
  });

  it('boş listede -1 döner', () => {
    expect(veriSatiriSec([], strings, tokenHarita)).toBe(-1);
    expect(veriSatiriSec(null, strings, tokenHarita)).toBe(-1);
  });

  it('veri satırı başlıktan ÖNCE gelse de doğru satırı bulur', () => {
    const tersSira = [satirlar[2], satirlar[0], satirlar[1]];
    expect(veriSatiriSec(tersSira, strings, tokenHarita)).toBe(0);
  });
});
