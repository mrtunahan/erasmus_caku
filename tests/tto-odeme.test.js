import { describe, it, expect } from 'vitest';
import {
  tlKurusa,
  kurusTl,
  yuzdeOku,
  hesapla,
  ibanGecerliMi,
  ibanBicimle,
  adCakisiyorMu,
  firmaYazmaKarari,
  akademisyenYazmaKarari,
  oranYazmaKarari,
  isKaydiYazmaKarari,
  isKaydiHatalari,
  bosIsKaydi,
  projeYazmaKarari,
  ttoOdemeKoleksiyonuMu,
} from '../lib/tto-odeme.js';

const ORAN = { yil: 2026, kdv: 20, tevkifat: 50, ttoPayi: 15, stopaj: 20 };
// Geçerli örnek IBAN (mod-97 tutar).
const IBAN = 'TR330006100519786457841326';

function tamKayit(ek) {
  return Object.assign(
    bosIsKaydi(2026),
    {
      firmaId: 'f1',
      akademisyenId: 'a1',
      yapilanIs: 'Danışmanlık',
      faturaKurus: 1000000,
    },
    ek || {}
  );
}

describe('tutar okuma / yazma', () => {
  it('Türkçe ve noktalı yazımı kuruşa çevirir', () => {
    expect(tlKurusa('10.000,50')).toBe(1000050);
    expect(tlKurusa('10000.50')).toBe(1000050);
    expect(tlKurusa('10,000.50')).toBe(1000050);
    expect(tlKurusa('10.000')).toBe(1000000);
    expect(tlKurusa('10,5')).toBe(1050);
    expect(tlKurusa('10.5')).toBe(1050);
    expect(tlKurusa('1.234.567,89 TL')).toBe(123456789);
    expect(tlKurusa('₺ 250')).toBe(25000);
    expect(tlKurusa(12.34)).toBe(1234);
  });
  it('geçersiz yazımı reddeder', () => {
    expect(tlKurusa('')).toBe(null);
    expect(tlKurusa('abc')).toBe(null);
    expect(tlKurusa('10,555')).toBe(null);
    expect(tlKurusa('-5')).toBe(null);
    expect(tlKurusa('99999999999999')).toBe(null);
  });
  it('kuruşu Türkçe biçimde yazar', () => {
    expect(kurusTl(1000050)).toBe('10.000,50');
    expect(kurusTl(5)).toBe('0,05');
    expect(kurusTl(-150)).toBe('-1,50');
    expect(kurusTl(0)).toBe('0,00');
  });
  it('yüzde okur', () => {
    expect(yuzdeOku('%15')).toBe(15);
    expect(yuzdeOku('15,5')).toBe(15.5);
    expect(yuzdeOku(20)).toBe(20);
    expect(yuzdeOku('101')).toBe(null);
    expect(yuzdeOku('1,234')).toBe(null);
    expect(yuzdeOku('')).toBe(null);
  });
});

describe('hesaplama zinciri', () => {
  it('eski uygulamanın örneğiyle aynı sonucu verir', () => {
    // 10.000 TL fatura, %20 KDV, KDV'nin %10'u tevkifat, %15 TTO, %20 stopaj
    const h = hesapla(1000000, { kdv: 20, tevkifat: 10, ttoPayi: 15, stopaj: 20 });
    expect(h.kdvKurus).toBe(200000);
    expect(h.tevkifatKurus).toBe(20000);
    expect(h.ttoPayiKurus).toBe(150000);
    expect(h.ttoSonrasiKurus).toBe(850000);
    expect(h.stopajSonrasiKurus).toBe(680000);
    expect(h.netKurus).toBe(680000);
  });
  it('her adımda yarım kuruşu yukarı yuvarlar', () => {
    // 0,05 TL × %10 = 0,005 → 0,01
    const h = hesapla(5, { kdv: 10, tevkifat: 0, ttoPayi: 10, stopaj: 0 });
    expect(h.kdvKurus).toBe(1);
    expect(h.ttoPayiKurus).toBe(1);
  });
  it('diğer fon ve harçları netten düşer', () => {
    const h = hesapla(1000000, ORAN, 5000);
    expect(h.netKurus).toBe(h.stopajSonrasiKurus - 5000);
  });
  it('oran eksikse null döner', () => {
    expect(hesapla(1000, null)).toBe(null);
    expect(hesapla(1000, { kdv: 20 })).toBe(null);
  });
  it('büyük tutarlarda hassasiyet kaybetmez', () => {
    const h = hesapla(999999999999, { kdv: 20, tevkifat: 50, ttoPayi: 15, stopaj: 20 });
    // 9.999.999.999,99 × %20 = 1.999.999.999,998 → 2.000.000.000,00
    expect(h.kdvKurus).toBe(200000000000);
    expect(Number.isSafeInteger(h.stopajSonrasiKurus)).toBe(true);
  });
});

describe('IBAN', () => {
  it('geçerli TR IBAN’ı kabul eder', () => {
    expect(ibanGecerliMi(IBAN)).toBe(true);
    expect(ibanGecerliMi('tr33 0006 1005 1978 6457 8413 26')).toBe(true);
  });
  it('hatalı IBAN’ı reddeder', () => {
    expect(ibanGecerliMi('TR330006100519786457841327')).toBe(false);
    expect(ibanGecerliMi('DE89370400440532013000')).toBe(false);
    expect(ibanGecerliMi('')).toBe(false);
  });
  it('dörtlü gruplar hâlinde yazar', () => {
    expect(ibanBicimle(IBAN)).toBe('TR33 0006 1005 1978 6457 8413 26');
  });
});

describe('firma / akademisyen yazma kararı', () => {
  it('ad çakışmasını Türkçe harf ve büyük/küçük farkı gözetmeden bulur', () => {
    expect(adCakisiyorMu([{ id: '1', ad: 'IŞIK A.Ş.' }], 'ışık a.ş.')).toBe(true);
    expect(adCakisiyorMu([{ id: '1', ad: 'Aydos' }], 'AYDOS', '1')).toBe(false);
  });
  it('aynı adlı ikinci firmayı reddeder', () => {
    const r = firmaYazmaKarari({
      tur: 'add',
      veri: { ad: 'aydos' },
      digerleri: [{ id: 'x', ad: 'AYDOS' }],
    });
    expect(r.izin).toBe(false);
  });
  it('bilinmeyen alanları düşürür, metni kırpar', () => {
    const veri = { ad: '  Aydos  ', isUniversityAdmin: true, vergiNo: '1234567890' };
    const r = firmaYazmaKarari({ tur: 'add', veri, digerleri: [] });
    expect(r.izin).toBe(true);
    expect(veri).toEqual({ ad: 'Aydos', vergiNo: '1234567890' });
  });
  it('noktalı / $ anahtarları reddeder', () => {
    expect(firmaYazmaKarari({ tur: 'add', veri: { 'a.b': 1, ad: 'x' } }).izin).toBe(false);
    expect(firmaYazmaKarari({ tur: 'add', veri: { $set: {}, ad: 'x' } }).izin).toBe(false);
  });
  it('kullanımdaki firma silinemez', () => {
    expect(firmaYazmaKarari({ tur: 'delete', mevcut: { ad: 'x' }, kullanimSayisi: 2 }).izin).toBe(
      false
    );
    expect(firmaYazmaKarari({ tur: 'delete', mevcut: { ad: 'x' }, kullanimSayisi: 0 }).izin).toBe(
      true
    );
  });
  it('proje adını zorunlu tutar, aynı adlı projeyi reddeder', () => {
    expect(projeYazmaKarari({ tur: 'add', veri: { ad: ' ' } }).izin).toBe(false);
    const r = projeYazmaKarari({
      tur: 'add',
      veri: { ad: 'P-1', aciklama: 'x' },
      digerleri: [{ id: '1', ad: 'p-1' }],
    });
    expect(r.izin).toBe(false);
  });
  it('akademisyenin IBAN’ını doğrular ve sadeleştirir', () => {
    expect(akademisyenYazmaKarari({ tur: 'add', veri: { ad: 'A', iban: 'TR12' } }).izin).toBe(
      false
    );
    const veri = { ad: 'A', iban: 'tr33 0006 1005 1978 6457 8413 26' };
    expect(akademisyenYazmaKarari({ tur: 'add', veri }).izin).toBe(true);
    expect(veri.iban).toBe(IBAN);
  });
  it('güncellemede mevcut kaydın adıyla birleşik denetler', () => {
    const r = akademisyenYazmaKarari({
      tur: 'update',
      mevcut: { ad: 'A' },
      veri: { bolum: 'Fizik' },
    });
    expect(r.izin).toBe(true);
  });
});

describe('oran yazma kararı', () => {
  it('yılı belge kimliğinden alır, yüzdeleri sayıya çevirir', () => {
    const veri = { yil: 1999, kdv: '20', tevkifat: '%50', ttoPayi: '15', stopaj: '20,5', x: 1 };
    const r = oranYazmaKarari({ tur: 'set', docId: '2026', veri });
    expect(r.izin).toBe(true);
    expect(veri).toEqual({ yil: 2026, kdv: 20, tevkifat: 50, ttoPayi: 15, stopaj: 20.5 });
  });
  it('eksik oranı reddeder', () => {
    expect(oranYazmaKarari({ tur: 'set', docId: '2026', veri: { kdv: 20 } }).izin).toBe(false);
  });
  it('kimliksiz eklemeyi ve kullanımdaki yılın silinmesini reddeder', () => {
    expect(oranYazmaKarari({ tur: 'add', veri: ORAN }).izin).toBe(false);
    expect(oranYazmaKarari({ tur: 'delete', kullanimSayisi: 3 }).izin).toBe(false);
  });
});

describe('iş kaydı yazma kararı', () => {
  it('istemcinin hesap alanlarına güvenmez, yeniden hesaplar', () => {
    const veri = tamKayit({ kdvKurus: 1, stopajSonrasiKurus: 999999999, siraNo: 7, sahte: 1 });
    const r = isKaydiYazmaKarari({ tur: 'add', veri, oranKaydi: ORAN });
    expect(r.izin).toBe(true);
    expect(veri.kdvKurus).toBe(200000);
    expect(veri.stopajSonrasiKurus).toBe(680000);
    expect('siraNo' in veri).toBe(false);
    expect('sahte' in veri).toBe(false);
  });
  it('manuel düzeltmede girilen tutarları korur', () => {
    const veri = tamKayit({ manuelDuzeltme: true, kdvKurus: 123, stopajSonrasiKurus: 500 });
    const r = isKaydiYazmaKarari({ tur: 'add', veri, oranKaydi: null });
    expect(r.izin).toBe(true);
    expect(veri.kdvKurus).toBe(123);
  });
  it('yılın oranı yoksa ve manuel değilse reddeder', () => {
    const r = isKaydiYazmaKarari({ tur: 'add', veri: tamKayit(), oranKaydi: null });
    expect(r.izin).toBe(false);
    expect(r.hata).toMatch(/oran tanımlı değil/);
  });
  it('kısmi güncellemede mevcut kayıtla birleşik hesaplar', () => {
    const mevcut = tamKayit();
    const veri = { faturaKurus: 2000000 };
    const r = isKaydiYazmaKarari({ tur: 'update', mevcut, veri, oranKaydi: ORAN });
    expect(r.izin).toBe(true);
    expect(veri.ttoPayiKurus).toBe(300000);
  });
  it('ödendi işaretlemek için tarih şart değil: bugün yazılır', () => {
    const veri = tamKayit({ tahsilat: 'edildi', odeme: 'odendi' });
    const simdi = new Date('2026-10-02T22:30:00Z'); // İstanbul'da 3 Ekim
    expect(isKaydiYazmaKarari({ tur: 'add', veri, oranKaydi: ORAN, simdi }).izin).toBe(true);
    expect(veri.odemeTarihi).toBe('2026-10-03');
    expect(veri.tahsilTarihi).toBe('2026-10-03');
  });
  it('iki aşamalı akış: tahsilat olmadan ödeme işaretlenmez, geri alınca tarih silinir', () => {
    const simdi = new Date('2026-10-02T09:00:00Z');
    const mevcut = tamKayit(hesapla(1000000, ORAN));
    const k = (veri, m = mevcut) =>
      isKaydiYazmaKarari({ tur: 'update', mevcut: m, veri, oranKaydi: ORAN, simdi });
    expect(k({ odeme: 'odendi' }).hata).toMatch(/tahsilat yapıldıktan sonra/);

    const v1 = { tahsilat: 'edildi', tahsilTarihi: '2026-09-15' };
    expect(k(v1).izin).toBe(true);
    expect(v1.tahsilTarihi).toBe('2026-09-15');
    const m1 = { ...mevcut, ...v1 };

    expect(k({ odeme: 'odendi', odemeTarihi: '2026-11-01' }, m1).hata).toMatch(/ileri/);
    const v2 = { odeme: 'odendi' };
    expect(k(v2, m1).izin).toBe(true);
    expect(v2.odemeTarihi).toBe('2026-10-02');

    const v3 = { odeme: 'odenmedi' };
    expect(k(v3, { ...m1, ...v2 }).izin).toBe(true);
    expect(v3.odemeTarihi).toBe('');
    // Eski kayıt (ödendi ama tahsilat yok) yalnız not değişince kilitlenmez.
    const eski = { ...mevcut, odeme: 'odendi', tahsilat: '' };
    expect(k({ notlar: 'x' }, eski).izin).toBe(true);
  });
  it('yalnız ödeme durumu değişince tutarlara dokunmaz (oran sonradan değişmiş olsa bile)', () => {
    const mevcut = tamKayit(hesapla(1000000, ORAN));
    const yeniOran = { ...ORAN, ttoPayi: 30 };
    const veri = { tahsilat: 'edildi', odeme: 'odendi', kdvKurus: 5, ttoPayiKurus: 5 };
    const r = isKaydiYazmaKarari({ tur: 'update', mevcut, veri, oranKaydi: yeniOran });
    expect(r.izin).toBe(true);
    expect('kdvKurus' in veri).toBe(false);
    expect('ttoPayiKurus' in veri).toBe(false);
  });
  it('manuel düzeltme kapatılınca yeniden hesaplar', () => {
    const mevcut = tamKayit({ manuelDuzeltme: true, kdvKurus: 1, stopajSonrasiKurus: 1 });
    const veri = { manuelDuzeltme: false };
    expect(isKaydiYazmaKarari({ tur: 'update', mevcut, veri, oranKaydi: ORAN }).izin).toBe(true);
    expect(veri.kdvKurus).toBe(200000);
  });
  it('olmayan kaydın güncellenmesini reddeder', () => {
    expect(isKaydiYazmaKarari({ tur: 'update', mevcut: null, veri: {} }).izin).toBe(false);
  });
  it('geçersiz tarihi ve netin eksiye düşmesini yakalar', () => {
    const h = isKaydiHatalari(
      tamKayit({ talepTarihi: '2026-02-30', stopajSonrasiKurus: 100, digerFonKurus: 200 })
    );
    expect(h.join(' ')).toMatch(/Talep tarihi/);
    expect(h.join(' ')).toMatch(/aşamaz/);
  });
});

describe('koleksiyonlar', () => {
  it('yönetici koleksiyonlarını tanır', () => {
    expect(ttoOdemeKoleksiyonuMu('tto_is_kayitlari')).toBe(true);
    expect(ttoOdemeKoleksiyonuMu('tto_projeler')).toBe(true);
    expect(ttoOdemeKoleksiyonuMu('tto_talepleri')).toBe(false);
  });
});
