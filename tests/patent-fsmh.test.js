import { describe, it, expect } from 'vitest';
import {
  normalizeTr,
  patentYoneticisiMi,
  bildirimHatalari,
  sahipBildirimYazmaKarari,
  yoneticiBildirimYazmaKarari,
  bildirimdenPortfoy,
  bildirimZilPlani,
  bosBildirim,
} from '../lib/patent-fsmh.js';

const gecerli = () => ({
  ...bosBildirim({ name: 'Ayşe Demir' }),
  baslik: 'Akıllı sulama',
  ozet: 'Toprak nemine göre sulama.',
});

describe('normalizeTr', () => {
  it('Türkçe büyük harfleri ve boşlukları katlar, aksanı korur', () => {
    expect(normalizeTr('  IŞIK   İzmir ')).toBe('ışık izmir');
    expect(normalizeTr('Şeker')).not.toBe(normalizeTr('Seker'));
  });
});

describe('patentYoneticisiMi', () => {
  it('bayrak ya da sistem yöneticisi', () => {
    expect(patentYoneticisiMi({ isPatentYoneticisi: true })).toBe(true);
    expect(patentYoneticisiMi({ role: 'admin' })).toBe(true);
  });
  it('üniversite/fakülte yetkilisi admin rolüyle açılsa da yönetici değildir', () => {
    expect(
      patentYoneticisiMi({ role: 'admin', isUniversityAdmin: true, baseRole: 'professor' })
    ).toBe(false);
    expect(
      patentYoneticisiMi({ role: 'admin', isFacultyManager: true, baseRole: 'professor' })
    ).toBe(false);
    expect(patentYoneticisiMi({ role: 'professor' })).toBe(false);
  });
});

describe('bildirim — sahip kuralı', () => {
  it('yeni bildirim yalnız kendi adına ve beklemede açılır', () => {
    const v = { ...gecerli(), sahip: 'Ayşe Demir', durum: 'bekliyor' };
    expect(
      sahipBildirimYazmaKarari({ tur: 'add', mevcut: null, veri: v, kimlik: 'Ayşe Demir' }).izin
    ).toBe(true);
    expect(
      sahipBildirimYazmaKarari({ tur: 'add', mevcut: null, veri: v, kimlik: 'Başkası' }).izin
    ).toBe(false);
    expect(
      sahipBildirimYazmaKarari({
        tur: 'add',
        mevcut: null,
        veri: { ...v, durum: 'kabul' },
        kimlik: 'Ayşe Demir',
      }).izin
    ).toBe(false);
    expect(
      sahipBildirimYazmaKarari({
        tur: 'add',
        mevcut: null,
        veri: { ...v, patentNo: 3 },
        kimlik: 'Ayşe Demir',
      }).izin
    ).toBe(false);
  });
  it('zorunlu alan eksikse reddedilir', () => {
    expect(bildirimHatalari({ ...gecerli(), ozet: '' }).ozet).toBeTruthy();
    const v = { ...gecerli(), baslik: '', sahip: 'A', durum: 'bekliyor' };
    expect(sahipBildirimYazmaKarari({ tur: 'add', mevcut: null, veri: v, kimlik: 'A' }).izin).toBe(
      false
    );
  });
  it('karara bağlanmış bildirim değişmez, iade edilen düzeltilip gönderilir', () => {
    const mevcut = { ...gecerli(), sahip: 'A', durum: 'kabul' };
    expect(
      sahipBildirimYazmaKarari({ tur: 'update', mevcut, veri: { baslik: 'Y' }, kimlik: 'A' }).izin
    ).toBe(false);
    expect(sahipBildirimYazmaKarari({ tur: 'delete', mevcut, kimlik: 'A' }).izin).toBe(false);
    const iade = { ...mevcut, durum: 'iade' };
    expect(
      sahipBildirimYazmaKarari({
        tur: 'update',
        mevcut: iade,
        veri: { baslik: 'Y', durum: 'bekliyor' },
        kimlik: 'A',
      }).izin
    ).toBe(true);
    expect(
      sahipBildirimYazmaKarari({
        tur: 'update',
        mevcut: iade,
        veri: { durum: 'kabul' },
        kimlik: 'A',
      }).izin
    ).toBe(false);
  });
  it('başkasının bildirimine yazılamaz', () => {
    const mevcut = { ...gecerli(), sahip: 'A', durum: 'bekliyor' };
    expect(
      sahipBildirimYazmaKarari({ tur: 'update', mevcut, veri: { baslik: 'Y' }, kimlik: 'B' }).izin
    ).toBe(false);
  });
});

describe('bildirim — yönetici kuralı', () => {
  const mevcut = { ...gecerli(), sahip: 'A', durum: 'bekliyor' };
  it('yalnız karar alanlarını yazar', () => {
    expect(
      yoneticiBildirimYazmaKarari({
        tur: 'update',
        mevcut,
        veri: { durum: 'kabul', patentNo: 4 },
        kimlik: 'Y',
      })
    ).toEqual({
      izin: true,
      sahipKurali: false,
    });
    expect(
      yoneticiBildirimYazmaKarari({ tur: 'update', mevcut, veri: { baslik: 'Z' }, kimlik: 'Y' })
        .izin
    ).toBe(false);
  });
  it('ret ve düzeltme notsuz olmaz', () => {
    expect(
      yoneticiBildirimYazmaKarari({ tur: 'update', mevcut, veri: { durum: 'ret' }, kimlik: 'Y' })
        .izin
    ).toBe(false);
    expect(
      yoneticiBildirimYazmaKarari({
        tur: 'update',
        mevcut,
        veri: { durum: 'iade', yoneticiNotu: 'Özeti genişletin' },
        kimlik: 'Y',
      }).izin
    ).toBe(true);
  });
  it('portföye alınmış bildirim silinmez', () => {
    expect(
      yoneticiBildirimYazmaKarari({
        tur: 'delete',
        mevcut: { ...mevcut, durum: 'kabul' },
        kimlik: 'Y',
      }).izin
    ).toBe(false);
  });
  it('kendi bildiriminde içerik yazarsa sahip kuralı, yalnız karar yazarsa yönetici kuralı', () => {
    const kendi = { ...mevcut, sahip: 'Y' };
    expect(
      yoneticiBildirimYazmaKarari({
        tur: 'update',
        mevcut: kendi,
        veri: { baslik: 'Z' },
        kimlik: 'Y',
      }).sahipKurali
    ).toBe(true);
    expect(
      yoneticiBildirimYazmaKarari({
        tur: 'update',
        mevcut: kendi,
        veri: { durum: 'kabul', patentNo: 1 },
        kimlik: 'Y',
      }).sahipKurali
    ).toBe(false);
  });
});

describe('bildirimdenPortfoy ve zil planı', () => {
  it('portföy adayı', () => {
    const a = bildirimdenPortfoy({
      ...gecerli(),
      bolum: 'Bilgisayar',
      ortaklar: [' ODTÜ ', ''],
      basvuruYapildi: 'evet',
      basvuruTarihi: '2026-02-03',
    });
    expect(a).toMatchObject({
      baslik: 'Akıllı sulama',
      basvuruSahibiAd: 'Ayşe Demir',
      bolumAd: 'Bilgisayar',
      ortaklar: ['ODTÜ'],
      basvuruTarihi: '2026-02-03',
      durum: 'Süreç Devam Ediyor',
    });
  });
  it('gönderimde yöneticilere (kendisi hariç), kararda sahibine', () => {
    const g = bildirimZilPlani({
      eski: {},
      yeni: { ...gecerli(), sahip: 'A', durum: 'bekliyor' },
      yapan: 'A',
      yoneticiler: ['Y', 'A'],
    });
    expect(g.map((x) => x.recipientId)).toEqual(['Y']);
    const k = bildirimZilPlani({
      eski: { sahip: 'A', durum: 'bekliyor' },
      yeni: { durum: 'kabul' },
      yapan: 'Y',
      yoneticiler: [],
    });
    expect(k).toHaveLength(1);
    expect(k[0]).toMatchObject({ recipientId: 'A', type: 'patent-karar' });
  });
});
