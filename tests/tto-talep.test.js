import { describe, it, expect } from 'vitest';
import * as w from '../lib/word-belge.js';
import {
  talepHatalari,
  bosTalep,
  projeBilgisiGerekliMi,
  sahipYazmaKarari,
  sahipGecisiGecerliMi,
  ttoSablonVerisi,
  ttoAyarlari,
  ttoWordGovdesi,
  ttoDosyaAdi,
  TTO_AYAR_VARSAYILAN,
  TTO_SABLON_DEGISKENLERI,
} from '../lib/tto-talep.js';

function tamTalep(ek) {
  const t = bosTalep({ name: 'Dr. Ayşe Yılmaz', title: 'Dr. Öğr. Üyesi', email: 'ayse@x.edu.tr' });
  t.genel.gsm = '05550000000';
  t.nitelik = ['danismanlik'];
  t.ozet = 'Danışmanlık talebi.';
  t.beyan = true;
  return Object.assign(t, ek || {});
}

describe('TTO talep denetimi', () => {
  it('eksiksiz talep hatasızdır', () => {
    expect(talepHatalari(tamTalep())).toEqual([]);
  });

  it('boş talep zorunlu alanları sayar', () => {
    const h = talepHatalari(bosTalep({}));
    expect(h.some((x) => x.includes('Adı Soyadı'))).toBe(true);
    expect(h.some((x) => x.includes('niteliğinden'))).toBe(true);
    expect(h.some((x) => x.includes('özeti'))).toBe(true);
    expect(h.some((x) => x.includes('Beyan'))).toBe(true);
  });

  it('proje seçilince proje bilgileri zorunlu olur', () => {
    const t = tamTalep({ nitelik: ['projeDestegi'] });
    expect(projeBilgisiGerekliMi(t)).toBe(true);
    const h = talepHatalari(t);
    expect(h.some((x) => x.includes('Proje bilgileri 1.'))).toBe(true);
    expect(h.some((x) => x.includes('7. soru yanıtlanmalıdır'))).toBe(true);
  });

  it('benzer proje "evet" ise açıklama ister', () => {
    const t = tamTalep({
      nitelik: ['projeOrtagi'],
      proje: {
        ad: 'A',
        destekProgrami: 'TÜBİTAK',
        konu: 'K',
        butce: '1',
        sure: '12 ay',
        ortaklar: 'X',
        ticarilesme: 'evet',
        patent: 'hayir',
        benzer: 'evet',
        benzerAciklama: '',
      },
    });
    expect(talepHatalari(t)).toEqual(['Benzer proje varsa ne olduğunu yazın (9. soru).']);
  });

  it('geçersiz e-posta ve telefonsuz talep yakalanır', () => {
    const t = tamTalep();
    t.genel.email = 'bozuk';
    t.genel.gsm = '';
    const h = talepHatalari(t);
    expect(h).toContain('E-posta adresi geçerli değil.');
    expect(h.some((x) => x.includes('telefon'))).toBe(true);
  });
});

describe('TTO durum geçişleri (talep sahibi)', () => {
  it('taslak gönderilir, gönderilen geri çekilir', () => {
    expect(sahipGecisiGecerliMi('taslak', 'gonderildi')).toBe(true);
    expect(sahipGecisiGecerliMi('gonderildi', 'taslak')).toBe(true);
    expect(sahipGecisiGecerliMi('iade', 'gonderildi')).toBe(true);
  });
  it('sahip kendi talebini onaylayamaz, incelemedeki talebi geri çekemez', () => {
    expect(sahipGecisiGecerliMi('gonderildi', 'onaylandi')).toBe(false);
    expect(sahipGecisiGecerliMi('taslak', 'onaylandi')).toBe(false);
    expect(sahipGecisiGecerliMi('incelemede', 'taslak')).toBe(false);
  });
});

describe('TTO sahip yazma kararı (sunucu)', () => {
  const simdi = new Date('2026-09-29T10:00:00Z');

  it('yeni taslak: sahip damgalanır, yönetici alanları düşer', () => {
    const veri = Object.assign(tamTalep(), { talepNo: '99', karar: 'onay', sahip: 'baskasi' });
    const k = sahipYazmaKarari({ tur: 'add', mevcut: null, veri, kimlik: 'Dr. Ayşe', simdi });
    expect(k.izin).toBe(true);
    expect(veri.sahip).toBe('Dr. Ayşe');
    expect(veri.talepNo).toBeUndefined();
    expect(veri.karar).toBeUndefined();
    expect(veri.gecmis[0].olay).toBe('olusturuldu');
  });

  it('başkasının talebine yazılamaz', () => {
    const k = sahipYazmaKarari({
      tur: 'update',
      mevcut: { sahip: 'Dr. Başka', durum: 'taslak' },
      veri: { ozet: 'x' },
      kimlik: 'Dr. Ayşe',
    });
    expect(k.izin).toBe(false);
  });

  it('eksik talep gönderilemez, tam talep gönderilir ve tarih sunucudan gelir', () => {
    const eksik = sahipYazmaKarari({
      tur: 'update',
      mevcut: { sahip: 'Dr. Ayşe', durum: 'taslak' },
      veri: { durum: 'gonderildi' },
      kimlik: 'Dr. Ayşe',
    });
    expect(eksik.izin).toBe(false);

    const veri = { durum: 'gonderildi', gonderimTarihi: '2000-01-01' };
    const tam = sahipYazmaKarari({
      tur: 'update',
      mevcut: Object.assign(tamTalep(), { sahip: 'Dr. Ayşe', durum: 'taslak' }),
      veri,
      kimlik: 'Dr. Ayşe',
      simdi,
    });
    expect(tam.izin).toBe(true);
    expect(veri.gonderimTarihi).toBe(simdi.toISOString());
    expect(veri.gecmis.slice(-1)[0].olay).toBe('gonderildi');
  });

  it('gönderilmiş talebin içeriği değişmez; yalnız geri çekilebilir', () => {
    const mevcut = Object.assign(tamTalep(), { sahip: 'Dr. Ayşe', durum: 'gonderildi' });
    expect(
      sahipYazmaKarari({ tur: 'update', mevcut, veri: { ozet: 'yeni' }, kimlik: 'Dr. Ayşe' }).izin
    ).toBe(false);
    expect(
      sahipYazmaKarari({ tur: 'update', mevcut, veri: { durum: 'taslak' }, kimlik: 'Dr. Ayşe' })
        .izin
    ).toBe(true);
  });

  it('sahip onay damgası vuramaz', () => {
    const k = sahipYazmaKarari({
      tur: 'update',
      mevcut: Object.assign(tamTalep(), { sahip: 'Dr. Ayşe', durum: 'gonderildi' }),
      veri: { durum: 'onaylandi' },
      kimlik: 'Dr. Ayşe',
    });
    expect(k.izin).toBe(false);
  });

  it('yalnız taslak silinir', () => {
    expect(
      sahipYazmaKarari({
        tur: 'delete',
        mevcut: { sahip: 'Dr. Ayşe', durum: 'gonderildi' },
        kimlik: 'Dr. Ayşe',
      }).izin
    ).toBe(false);
    expect(
      sahipYazmaKarari({
        tur: 'delete',
        mevcut: { sahip: 'Dr. Ayşe', durum: 'taslak' },
        kimlik: 'Dr. Ayşe',
      }).izin
    ).toBe(true);
  });

  it('noktalı alan yolu reddedilir', () => {
    const k = sahipYazmaKarari({
      tur: 'update',
      mevcut: { sahip: 'Dr. Ayşe', durum: 'taslak' },
      veri: { 'genel.email': 'x@y.z' },
      kimlik: 'Dr. Ayşe',
    });
    expect(k.izin).toBe(false);
  });
});

describe('TTO şablon verisi ve Word çıktısı', () => {
  it('ayar kaydı boşsa formun varsayılanları kullanılır', () => {
    expect(ttoAyarlari(null).dokumanKodu).toBe('TTO-TF-001');
    expect(ttoAyarlari({ revizyonNo: '003' }).revizyonNo).toBe('003');
  });

  it('seçilen kutular ☒, diğerleri ☐', () => {
    const t = tamTalep({ nitelik: ['danismanlik', 'fikriMulkiyet'] });
    t.proje.ticarilesme = 'evet';
    const v = ttoSablonVerisi(t, null, new Date('2026-09-29T10:00:00Z'));
    expect(v.nitelik_danismanlik).toBe('☒');
    expect(v.nitelik_laboratuvar).toBe('☐');
    expect(v.nitelik_fikriMulkiyet).toBe('☒');
    expect(v.ticarilesmeEvet).toBe('☒');
    expect(v.ticarilesmeHayir).toBe('☐');
    expect(v.patentEvet).toBe('☐');
    expect(v.adSoyad).toBe('Dr. Ayşe Yılmaz');
    expect(v.belgeTarihi).toBe('29.09.2026');
  });

  it('şablon kataloğundaki her değişken veride üretilir', () => {
    const v = ttoSablonVerisi(tamTalep(), null);
    TTO_SABLON_DEGISKENLERI.forEach((d) => expect(d.id in v).toBe(true));
  });

  it('yerleşik Word gövdesi geçerli XML parçası üretir ve kaçış uygular', () => {
    const t = tamTalep({ ozet: 'A & B <test>' });
    const xml = ttoWordGovdesi(t, null, w);
    expect(xml).toContain('GENEL BİLGİLER');
    expect(xml).toContain('A &amp; B &lt;test&gt;');
    expect(xml).toContain(TTO_AYAR_VARSAYILAN.dokumanKodu);
    expect(xml).toContain('TASLAKTIR');
  });

  it('dosya adı ASCII ve güvenli karakterlerden oluşur', () => {
    expect(ttoDosyaAdi({ genel: { adSoyad: 'Dr. Ayşe / Yılmaz' } })).toBe(
      'TTO_Talep_Formu_Dr._Ayse_Yilmaz.docx'
    );
    expect(ttoDosyaAdi({ genel: { adSoyad: 'İsmail Çağrı Öztürk' } })).toBe(
      'TTO_Talep_Formu_Ismail_Cagri_Ozturk.docx'
    );
  });
});
