import { describe, it, expect } from 'vitest';
import {
  adayNoMu,
  gercekOgrenciNoMu,
  adayNoUret,
  kimlikEtiketi,
  vekaletenMi,
  numaraTanimlanabilirMi,
} from '../lib/aday-kimlik.js';

describe('adayNoMu / gercekOgrenciNoMu', () => {
  it('geçici numarayı tanır', () => {
    expect(adayNoMu('ADAY-2026-0001')).toBe(true);
    expect(adayNoMu('aday-2026-0001')).toBe(true); // kasa duyarsız
  });

  it('gerçek öğrenci numarasını geçici sanmaz', () => {
    expect(adayNoMu('240905072')).toBe(false);
    expect(adayNoMu('')).toBe(false);
    expect(adayNoMu(null)).toBe(false);
  });

  it('gerçek numara yalnız rakamdır', () => {
    expect(gercekOgrenciNoMu('240905072')).toBe(true);
    expect(gercekOgrenciNoMu('ADAY-2026-0001')).toBe(false);
    expect(gercekOgrenciNoMu('12a4')).toBe(false);
    expect(gercekOgrenciNoMu('123')).toBe(false); // çok kısa
    expect(gercekOgrenciNoMu('')).toBe(false);
  });

  it('ÇAKIŞMA İMKÂNSIZ: geçici numara hiçbir gerçek numaraya eşit olamaz', () => {
    // Öğrenci listeleri kaydı ogrenciNo eşitliğiyle süzüyor; iki küme
    // kesişseydi vekâleten açılan kayıt yabancı bir öğrenciye görünürdü.
    const uretilen = adayNoUret([], 2026);
    expect(gercekOgrenciNoMu(uretilen)).toBe(false);
    expect(adayNoMu(uretilen)).toBe(true);
  });
});

describe('adayNoUret', () => {
  it('boş kütükte ilk numarayı verir', () => {
    expect(adayNoUret([], 2026)).toBe('ADAY-2026-0001');
  });

  it('mevcut en büyüğün bir fazlasını verir', () => {
    const mevcut = ['ADAY-2026-0001', 'ADAY-2026-0007', 'ADAY-2026-0003'];
    expect(adayNoUret(mevcut, 2026)).toBe('ADAY-2026-0008');
  });

  it('sayaç YIL BAŞINA ayrıdır', () => {
    const mevcut = ['ADAY-2025-0042'];
    expect(adayNoUret(mevcut, 2026)).toBe('ADAY-2026-0001');
    expect(adayNoUret(mevcut, 2025)).toBe('ADAY-2025-0043');
  });

  it('kayıt nesnelerini de okur (ogrenciNo / studentNo)', () => {
    expect(adayNoUret([{ ogrenciNo: 'ADAY-2026-0005' }], 2026)).toBe('ADAY-2026-0006');
    expect(adayNoUret([{ studentNo: 'ADAY-2026-0009' }], 2026)).toBe('ADAY-2026-0010');
  });

  it('gerçek öğrenci numaraları sayacı etkilemez', () => {
    expect(adayNoUret(['240905072', { ogrenciNo: '190901234' }], 2026)).toBe('ADAY-2026-0001');
  });

  it('bozuk girdide çökmez', () => {
    expect(adayNoUret(null, 2026)).toBe('ADAY-2026-0001');
    expect(adayNoUret([null, undefined, {}, ''], 2026)).toBe('ADAY-2026-0001');
  });

  it('yıl verilmezse bu yılı kullanır', () => {
    const y = String(new Date().getFullYear());
    expect(adayNoUret([])).toBe('ADAY-' + y + '-0001');
  });
});

describe('vekaletenMi', () => {
  it('açık bayrağı tanır', () => {
    expect(vekaletenMi({ vekaleten: true, ogrenciNo: '240905072' })).toBe(true);
  });

  it('bayrak yoksa numara biçiminden anlar (eski kayıtlar)', () => {
    expect(vekaletenMi({ ogrenciNo: 'ADAY-2026-0001' })).toBe(true);
    expect(vekaletenMi({ studentNo: 'ADAY-2026-0001' })).toBe(true);
  });

  it('normal öğrenci kaydı vekâleten sayılmaz', () => {
    expect(vekaletenMi({ ogrenciNo: '240905072' })).toBe(false);
    expect(vekaletenMi(null)).toBe(false);
    expect(vekaletenMi({})).toBe(false);
  });
});

describe('numaraTanimlanabilirMi', () => {
  const aday = { vekaleten: true, ogrenciNo: 'ADAY-2026-0001' };

  it('geçerli gerçek numara kabul edilir', () => {
    expect(numaraTanimlanabilirMi(aday, '240905072').ok).toBe(true);
  });

  it('boş numara reddedilir', () => {
    expect(numaraTanimlanabilirMi(aday, '').ok).toBe(false);
    expect(numaraTanimlanabilirMi(aday, '   ').ok).toBe(false);
  });

  it('geçici numara kalıcı olarak tanımlanamaz', () => {
    const r = numaraTanimlanabilirMi(aday, 'ADAY-2026-0002');
    expect(r.ok).toBe(false);
    expect(r.sebep).toMatch(/[Gg]eçici/);
  });

  it('rakam dışı numara reddedilir', () => {
    expect(numaraTanimlanabilirMi(aday, '24090507x').ok).toBe(false);
  });

  it('zaten numarası olan kaydın sahibi DEĞİŞTİRİLEMEZ', () => {
    // Aksi hâlde başvuru sessizce başka bir öğrenciye devredilirdi.
    const gercek = { ogrenciNo: '240905072' };
    const r = numaraTanimlanabilirMi(gercek, '190901234');
    expect(r.ok).toBe(false);
    expect(r.sebep).toMatch(/zaten/i);
  });
});

describe('kimlikEtiketi', () => {
  it('numaranın türünü söyler', () => {
    expect(kimlikEtiketi('ADAY-2026-0001')).toBe('geçici aday no');
    expect(kimlikEtiketi('240905072')).toBe('öğrenci no');
    expect(kimlikEtiketi('')).toBe('');
  });
});
