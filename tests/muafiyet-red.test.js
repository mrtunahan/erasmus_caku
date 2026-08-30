// ══════════════════════════════════════════════════════════════
// MUAFİYET REDDİ — GEREKÇE ZORUNLU
//
// Red tek tıklamayla veriliyordu ve `adminNote` boş kalıyordu; öğrenci
// yalnız "Reddedildi" görüyor, nedenini öğrenemiyordu.
// ══════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import {
  EN_AZ_GEREKCE,
  gerekceGecerliMi,
  redKarariMi,
  kararGecerliMi,
  dersEtiketi,
  redBildirimi,
} from '../lib/muafiyet-red.js';

describe('gerekceGecerliMi', () => {
  it('BOŞ GEREKÇE KABUL EDİLMEZ', () => {
    ['', '   ', null, undefined].forEach((g) => {
      const s = gerekceGecerliMi(g);
      expect(s.gecerli).toBe(false);
      expect(s.hata).toMatch(/zorunlu/i);
    });
  });
  it('anlamsız kısa cevap kabul edilmez', () => {
    ['x', 'yok', 'olmaz', 'hayır'].forEach((g) => {
      expect(gerekceGecerliMi(g).gecerli).toBe(false);
    });
  });
  it('gerçek bir gerekçe kabul edilir', () => {
    const s = gerekceGecerliMi('AKTS uyumu yetersiz, en az 5 AKTS gerekiyor.');
    expect(s).toEqual({ gecerli: true, hata: '' });
  });
  it('eşik sınırında', () => {
    expect(gerekceGecerliMi('a'.repeat(EN_AZ_GEREKCE - 1)).gecerli).toBe(false);
    expect(gerekceGecerliMi('a'.repeat(EN_AZ_GEREKCE)).gecerli).toBe(true);
  });
  it('baştaki/sondaki boşluk uzunluğa sayılmaz', () => {
    expect(gerekceGecerliMi('   kısa   ').gecerli).toBe(false);
  });
});

describe('redKarariMi', () => {
  it('red sözcüklerini tanır', () => {
    ['rejected', 'red', 'on_red', 'REJECTED'].forEach((k) => expect(redKarariMi(k)).toBe(true));
  });
  it('onay kararlarını red sanmaz', () => {
    ['confirmed', 'approved', 'on_onay', '', null].forEach((k) =>
      expect(redKarariMi(k)).toBe(false)
    );
  });
});

describe('kararGecerliMi', () => {
  it('ONAYDA gerekçe aranmaz', () => {
    expect(kararGecerliMi('confirmed', '')).toEqual({ gecerli: true, hata: '' });
  });
  it('REDDE gerekçe aranır', () => {
    expect(kararGecerliMi('rejected', '').gecerli).toBe(false);
    expect(kararGecerliMi('rejected', 'İçerik uyumu yetersiz görüldü.').gecerli).toBe(true);
  });
});

describe('dersEtiketi', () => {
  it('kod ve adı birleştirir', () => {
    expect(dersEtiketi({ code: 'BIL101', name: 'Algoritmalar' })).toBe('BIL101 — Algoritmalar');
  });
  it('yalnız biri varsa onu yazar', () => {
    expect(dersEtiketi({ code: 'BIL101' })).toBe('BIL101');
    expect(dersEtiketi({ name: 'Algoritmalar' })).toBe('Algoritmalar');
  });
  it('boş kayıtta genel etiket', () => {
    expect(dersEtiketi({})).toBe('Ders');
    expect(dersEtiketi(null)).toBe('Ders');
  });
});

describe('redBildirimi', () => {
  const b = redBildirimi({
    ogrenciNo: '240905072',
    ders: { code: 'BIL101', name: 'Algoritmalar' },
    gerekce: 'AKTS uyumu yetersiz, en az 5 AKTS gerekiyor.',
    karariVeren: 'Dr. Öğr. Üyesi Ayşe YILMAZ',
    kayitId: 'r1',
    eslesmeIndeksi: 2,
    turEtiketi: 'Ders muafiyet',
  });

  it('öğrenciye ve muafiyet modülüne gider', () => {
    expect(b.studentNumber).toBe('240905072');
    expect(b.module).toBe('muafiyet');
    expect(b.type).toBe('red');
  });
  it('GEREKÇE GÖVDEDE — öğrenci nedenini bildirimde görür', () => {
    expect(b.body).toContain('AKTS uyumu yetersiz');
    expect(b.body).toContain('BIL101 — Algoritmalar');
  });
  it('kararı veren de yazılır', () => {
    expect(b.body).toContain('Ayşe YILMAZ');
  });
  it('kararı veren yoksa o satır düşer', () => {
    const y = redBildirimi({ ogrenciNo: '1', gerekce: 'yeterli gerekçe metni' });
    expect(y.body).not.toContain('Kararı veren');
  });
  it('meta kaydı geriye iz bırakır', () => {
    expect(b.meta.recordId).toBe('r1');
    expect(b.meta.matchIndex).toBe(2);
    expect(b.meta.gerekce).toContain('AKTS');
  });
  it('indeks verilmezse null kalır (0 geçerli bir indekstir)', () => {
    expect(redBildirimi({ eslesmeIndeksi: 0 }).meta.matchIndex).toBe(0);
    expect(redBildirimi({}).meta.matchIndex).toBe(null);
  });
});
