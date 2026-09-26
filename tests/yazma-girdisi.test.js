// Yazma isteğinin girdi doğrulaması: kimlik alanları METİN olmalı.
// Nesne gönderilirse Mongo onu operatör sayar ve rastgele belge silinir
// (bkz. server/lib/yazma-girdisi.js).
import { describe, it, expect } from 'vitest';
import {
  docIdSahibiMi,
  gecerliKimlik,
  yazmaGirdisiGecerliMi,
} from '../server/lib/yazma-girdisi.js';

const ok = (op) => yazmaGirdisiGecerliMi(op).gecerli;

describe('kimlik biçimi', () => {
  it('gerçek kimlik biçimleri kabul edilir', () => {
    expect(gecerliKimlik('507f1f77bcf86cd799439011')).toBe(true); // ObjectId
    expect(gecerliKimlik('AbCdEf0123456789xyzQ')).toBe(true); // uygulama kimliği
    expect(gecerliKimlik('2021001__2026-guz')).toBe(true); // bileşik anahtar
    expect(gecerliKimlik('yk-1a2b3c4d5e6f7a8b9c')).toBe(true);
    expect(gecerliKimlik('bilgisayar')).toBe(true);
  });

  it('metin olmayan hiçbir şey kimlik değildir', () => {
    expect(gecerliKimlik({ $ne: null })).toBe(false);
    expect(gecerliKimlik({ $gt: '' })).toBe(false);
    expect(gecerliKimlik(['a'])).toBe(false);
    expect(gecerliKimlik(123)).toBe(false);
    expect(gecerliKimlik(true)).toBe(false);
    expect(gecerliKimlik(null)).toBe(false);
  });

  it('boş dize ve tehlikeli karakterler reddedilir', () => {
    expect(gecerliKimlik('')).toBe(false);
    expect(gecerliKimlik('../../etc')).toBe(false);
    expect(gecerliKimlik('a b')).toBe(false);
    expect(gecerliKimlik('$where')).toBe(false);
    expect(gecerliKimlik('x'.repeat(129))).toBe(false);
  });
});

describe('yazma işlemi gövdesi', () => {
  it('kimliksiz ekleme geçerlidir', () => {
    expect(ok({ collection: 'portal_posts', type: 'add', data: { a: 1 } })).toBe(true);
  });

  it('metin kimlikli güncelleme geçerlidir', () => {
    expect(ok({ collection: 'forms', type: 'update', docId: 'abc123', data: {} })).toBe(true);
  });

  // ── HATANIN KENDİSİ ──
  it('operatör enjeksiyonu reddedilir', () => {
    const s = yazmaGirdisiGecerliMi({
      collection: 'forms',
      type: 'delete',
      docId: { $ne: null },
    });
    expect(s.gecerli).toBe(false);
    expect(s.hata).toMatch(/docId/);
  });

  it('parentDocId de denetlenir', () => {
    expect(ok({ collection: 'portal_posts', type: 'add', parentDocId: { $ne: null } })).toBe(false);
  });

  it('alt koleksiyon adı uydurulamaz', () => {
    expect(ok({ collection: 'portal_posts', type: 'add', subCollection: 'comments' })).toBe(true);
    expect(ok({ collection: 'portal_posts', type: 'add', subCollection: '../students' })).toBe(
      false
    );
    expect(ok({ collection: 'portal_posts', type: 'add', subCollection: 'Comments' })).toBe(false);
    expect(ok({ collection: 'portal_posts', type: 'add', subCollection: { $ne: 1 } })).toBe(false);
  });

  it('veri gövdesi nesne olmalı', () => {
    expect(ok({ collection: 'forms', type: 'update', docId: 'a', data: ['x'] })).toBe(false);
    expect(ok({ collection: 'forms', type: 'update', docId: 'a', data: 'metin' })).toBe(false);
    expect(ok({ collection: 'forms', type: 'delete', docId: 'a' })).toBe(true); // data yok
  });

  it('koleksiyon adı metin olmalı', () => {
    expect(ok({ collection: { $ne: null }, type: 'update', docId: 'a' })).toBe(false);
    expect(ok({ type: 'update', docId: 'a' })).toBe(false);
    expect(ok(null)).toBe(false);
  });
});

describe('belge kimliğinin kendisi sahipliği söylüyorsa', () => {
  const BEN = ['2021001'];

  it('kimlik doğrudan numaraysa sahiptir', () => {
    expect(docIdSahibiMi('2021001', BEN)).toBe(true);
  });

  it('bileşik anahtarın herhangi bir parçası numaraysa sahiptir', () => {
    expect(docIdSahibiMi('2021001__2026-guz', BEN)).toBe(true); // ders seçimi
    expect(docIdSahibiMi('kulup-7__2021001', BEN)).toBe(true); // kulüp takibi
  });

  it('başkasının kaydı sahiplik vermez', () => {
    expect(docIdSahibiMi('2021002__2026-guz', BEN)).toBe(false);
    expect(docIdSahibiMi('kulup-7__2021002', BEN)).toBe(false);
  });

  it('numara parçanın İÇİNDE geçiyorsa yetmez', () => {
    expect(docIdSahibiMi('12021001', BEN)).toBe(false);
    expect(docIdSahibiMi('2021001x', BEN)).toBe(false);
  });

  it('ÇAP öğrencisinin ikinci numarası da sayılır', () => {
    expect(docIdSahibiMi('kulup-7__2021555', ['2021001', '2021555'])).toBe(true);
  });

  it('boş girdi sahiplik vermez', () => {
    expect(docIdSahibiMi('', BEN)).toBe(false);
    expect(docIdSahibiMi('2021001', [])).toBe(false);
    expect(docIdSahibiMi(null, BEN)).toBe(false);
  });
});
