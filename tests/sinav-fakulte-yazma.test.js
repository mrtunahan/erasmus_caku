import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sinavFakulteYazmaKarari } = require('../server/lib/sinav-fakulte-yazma.js');
const { yetkiAlani } = require('../server/lib/yetki-alani.js');

const BOLUMLER = [
  { id: 'bilgisayar', name: 'Bilgisayar Mühendisliği', facultyId: 'muh' },
  { id: 'insaat', name: 'İnşaat Mühendisliği', facultyId: 'muh' },
  { id: 'tarih', name: 'Tarih', facultyId: 'fen' },
];
const bolumYetkilisi = yetkiAlani({
  user: { role: 'bolum_yetkilisi', departmentId: 'bilgisayar' },
  bolumler: BOLUMLER,
});
const fakulteYetkilisi = yetkiAlani({
  user: { role: 'professor' },
  flags: { facManager: true },
  profil: { facultyId: 'muh', departmentId: 'insaat' },
  bolumler: BOLUMLER,
});
const sade = yetkiAlani({ user: { role: 'professor' }, flags: {}, profil: {}, bolumler: BOLUMLER });
const uni = yetkiAlani({ user: { role: 'admin' }, bolumler: BOLUMLER });

const gonder = (bolumId, data) => ({
  collection: 'sinav_gonderimleri',
  type: 'set',
  docId: bolumId + '__final|bahar',
  data: { bolumId, durum: 'gonderildi', ...(data || {}) },
});

describe('sinav_gonderimleri', () => {
  it('bölüm yetkilisi kendi bölümünü gönderir, başkasınınkini gönderemez', () => {
    expect(sinavFakulteYazmaKarari(gonder('bilgisayar'), null, bolumYetkilisi).izin).toBe(true);
    expect(sinavFakulteYazmaKarari(gonder('insaat'), null, bolumYetkilisi).izin).toBe(false);
  });

  it('bölüm yetkilisi iade yazamaz', () => {
    expect(
      sinavFakulteYazmaKarari(gonder('bilgisayar', { durum: 'iade' }), null, bolumYetkilisi).izin
    ).toBe(false);
  });

  it('fakülte yetkilisi yalnız iade eder, yalnız kendi fakültesinde', () => {
    const mevcut = { bolumId: 'bilgisayar', durum: 'gonderildi' };
    const iade = {
      collection: 'sinav_gonderimleri',
      type: 'update',
      docId: 'bilgisayar__final|bahar',
      data: { durum: 'iade', iadeNotu: 'M10Z07 çakışıyor', iadeEden: 'X' },
    };
    expect(sinavFakulteYazmaKarari(iade, mevcut, fakulteYetkilisi).izin).toBe(true);
    expect(
      sinavFakulteYazmaKarari(
        { ...iade, data: { ...iade.data, imza: 'x' } },
        mevcut,
        fakulteYetkilisi
      ).izin
    ).toBe(false);
    // bölüm adına gönderebilir, ama gönderimle iade bilgisi yazamaz
    expect(sinavFakulteYazmaKarari(gonder('bilgisayar'), mevcut, fakulteYetkilisi).izin).toBe(true);
    expect(
      sinavFakulteYazmaKarari(gonder('bilgisayar', { iadeNotu: 'x' }), mevcut, fakulteYetkilisi)
        .izin
    ).toBe(false);
    expect(
      sinavFakulteYazmaKarari(iade, { bolumId: 'tarih', durum: 'gonderildi' }, fakulteYetkilisi)
        .izin
    ).toBe(false);
  });

  it('sade akademisyen yazamaz, üniversite yazar, silme yok', () => {
    expect(sinavFakulteYazmaKarari(gonder('bilgisayar'), null, sade).izin).toBe(false);
    expect(sinavFakulteYazmaKarari(gonder('tarih'), null, uni).izin).toBe(true);
    expect(
      sinavFakulteYazmaKarari(
        { collection: 'sinav_gonderimleri', type: 'delete', docId: 'x' },
        { bolumId: 'bilgisayar' },
        bolumYetkilisi
      ).izin
    ).toBe(false);
  });
});

describe('gönderim kaydının sahipliği', () => {
  it('başka bölümün kimliğine kendi bölümüyle yazılamaz', () => {
    const op = { ...gonder('bilgisayar'), docId: 'insaat__final|bahar' };
    expect(sinavFakulteYazmaKarari(op, null, bolumYetkilisi).izin).toBe(false);
  });
  it('birleştirmesiz set bölümü taşımalı', () => {
    const op = {
      collection: 'sinav_gonderimleri',
      type: 'set',
      docId: 'bilgisayar__x',
      data: { durum: 'gonderildi' },
    };
    expect(sinavFakulteYazmaKarari(op, { bolumId: 'bilgisayar' }, bolumYetkilisi).izin).toBe(false);
  });
  it('iade belgeyi baştan yazamaz', () => {
    const op = {
      collection: 'sinav_gonderimleri',
      type: 'set',
      docId: 'bilgisayar__x',
      data: { durum: 'iade', iadeNotu: 'n' },
    };
    expect(
      sinavFakulteYazmaKarari(op, { bolumId: 'bilgisayar', durum: 'gonderildi' }, fakulteYetkilisi)
        .izin
    ).toBe(false);
  });
});

describe('sinav_fakulte_ayarlari', () => {
  const ayar = (docId) => ({
    collection: 'sinav_fakulte_ayarlari',
    type: 'set',
    docId,
    data: { salonlar: [] },
  });
  it('yalnız kendi fakültesinin yetkilisi', () => {
    expect(sinavFakulteYazmaKarari(ayar('muh'), null, fakulteYetkilisi).izin).toBe(true);
    expect(sinavFakulteYazmaKarari(ayar('fen'), null, fakulteYetkilisi).izin).toBe(false);
    expect(sinavFakulteYazmaKarari(ayar('muh'), null, bolumYetkilisi).izin).toBe(false);
    expect(sinavFakulteYazmaKarari(ayar('muh'), null, sade).izin).toBe(false);
    expect(sinavFakulteYazmaKarari(ayar('fen'), null, uni).izin).toBe(true);
  });
});

it('diğer koleksiyonlara karışmaz', () => {
  expect(sinavFakulteYazmaKarari({ collection: 'students', type: 'add' }, null, sade).izin).toBe(
    true
  );
});

it('fakülte düzenlemesinden sonra gönderim parmak izini tazeleyebilir (merge)', () => {
  const op = {
    collection: 'sinav_gonderimleri',
    type: 'set',
    merge: true,
    docId: 'bilgisayar__final|bahar',
    data: { durum: 'gonderildi', imza: 'yeni', fakulteDuzenleyen: 'X' },
  };
  expect(
    sinavFakulteYazmaKarari(op, { bolumId: 'bilgisayar', durum: 'gonderildi' }, fakulteYetkilisi)
      .izin
  ).toBe(true);
});

describe('gönderilmiş program kilidi', () => {
  it('bölüm gönderilmiş programı kendisi geri çekemez; iade edilmişse yeniden gönderir', () => {
    const mevcut = { bolumId: 'bilgisayar', durum: 'gonderildi' };
    const geriCek = { ...gonder('bilgisayar', { durum: 'geri_cekildi' }), type: 'update' };
    expect(sinavFakulteYazmaKarari(geriCek, mevcut, bolumYetkilisi).izin).toBe(false);
    const iadeli = { bolumId: 'bilgisayar', durum: 'iade' };
    expect(sinavFakulteYazmaKarari(gonder('bilgisayar'), iadeli, bolumYetkilisi).izin).toBe(true);
  });
});

describe('gönderim kilidi: durum silinemez', () => {
  it('bölüm gönderilmiş kaydı durumsuz baştan yazamaz, birleştirmeli yazımda durum korunur', () => {
    const mevcut = { bolumId: 'bilgisayar', durum: 'gonderildi' };
    const sil = {
      collection: 'sinav_gonderimleri',
      type: 'set',
      docId: 'bilgisayar__final|bahar',
      data: { bolumId: 'bilgisayar' },
    };
    expect(sinavFakulteYazmaKarari(sil, mevcut, bolumYetkilisi).izin).toBe(false);
    const birlestir = { ...sil, merge: true, data: { bolumId: 'bilgisayar', imza: 'x' } };
    expect(sinavFakulteYazmaKarari(birlestir, mevcut, bolumYetkilisi).izin).toBe(true);
    const yeniden = { ...sil, data: { bolumId: 'bilgisayar', durum: 'gonderildi' } };
    expect(sinavFakulteYazmaKarari(yeniden, mevcut, bolumYetkilisi).izin).toBe(true);
  });
});
