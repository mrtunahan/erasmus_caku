// Mezuniyet başvurusu süreç kuralları (lib/mezuniyet-basvuru.js) ve ders
// satırı kuralları (lib/mezuniyet.js → mezSatirIhlalleri).
import { describe, it, expect } from 'vitest';
import {
  ogrenciYazmaKarari,
  danismanYazmaKarari,
  memurYazmaKarari,
  mezuniyetZilPlani,
  danismaniMi,
  danismanAnahtari,
  personelGorurMu,
  dilekceVerisi,
  imzaEksikleri,
  adimSirasi,
  sonaEklenenler,
} from '../lib/mezuniyet-basvuru.js';
import { mezuniyetHesapla, mezKuralNormalize } from '../lib/mezuniyet.js';

const NO = '2021001';
const form = {
  ogrenciNo: NO,
  ogrenciAd: 'Ayşe Yılmaz',
  departmentId: 'bilgisayar',
  transkriptUrl: '/api/files/download/transkriptler/x.pdf',
  dersler: [{ kod: 'BLM101', ad: 'Programlama', akts: '6', not: 'AA' }],
  danisman: 'Dr. Öğr. Üyesi Mehmet Kaya',
};

describe('öğrenci yazma kararı', () => {
  it('kendi numarasıyla taslak açar', () => {
    const k = ogrenciYazmaKarari({ tur: 'set', mevcut: null, veri: form, numaralar: [NO] });
    expect(k.izin).toBe(true);
  });

  it('başkasının numarasıyla açamaz', () => {
    const k = ogrenciYazmaKarari({
      tur: 'set',
      mevcut: null,
      veri: { ...form, ogrenciNo: '999' },
      numaralar: [NO],
    });
    expect(k.izin).toBe(false);
  });

  it('danışmana gönderir — danışman ve transkript şart', () => {
    const mevcut = { ...form, durum: 'taslak' };
    expect(
      ogrenciYazmaKarari({ tur: 'set', mevcut, veri: { durum: 'danismanda' }, numaralar: [NO] })
        .izin
    ).toBe(true);
    const danismansiz = { ...mevcut, danisman: '' };
    expect(
      ogrenciYazmaKarari({
        tur: 'set',
        mevcut: danismansiz,
        veri: { durum: 'danismanda' },
        numaralar: [NO],
      }).izin
    ).toBe(false);
  });

  it('danışmandayken formu (dersleri) değiştiremez', () => {
    const mevcut = { ...form, durum: 'danismanda' };
    const k = ogrenciYazmaKarari({
      tur: 'set',
      mevcut,
      veri: { dersler: [{ kod: 'X', ad: 'Y', akts: '30', not: 'AA' }] },
      numaralar: [NO],
    });
    expect(k.izin).toBe(false);
  });

  it('kendi kendini onaylayamaz (dilekçe aşamasına geçemez)', () => {
    const mevcut = { ...form, durum: 'danismanda' };
    expect(
      ogrenciYazmaKarari({ tur: 'set', mevcut, veri: { durum: 'dilekce' }, numaralar: [NO] }).izin
    ).toBe(false);
    const taslak = { ...form, durum: 'taslak' };
    expect(
      ogrenciYazmaKarari({
        tur: 'set',
        mevcut: taslak,
        veri: { durum: 'dilekce' },
        numaralar: [NO],
      }).izin
    ).toBe(false);
  });

  it('danışmanın işaretlerine dokunamaz', () => {
    const mevcut = { ...form, durum: 'dilekce', silinecekDersler: [{ kod: 'BLM101' }] };
    const k = ogrenciYazmaKarari({
      tur: 'set',
      mevcut,
      veri: { silinecekDersler: [] },
      numaralar: [NO],
    });
    expect(k.izin).toBe(false);
  });

  it('dilekçe aşamasında imzalı dilekçeyi yükleyip gönderir', () => {
    const mevcut = { ...form, durum: 'dilekce' };
    const imza = { url: '/api/files/download/mezuniyet/i.pdf', ad: 'i.pdf' };
    expect(
      ogrenciYazmaKarari({ tur: 'set', mevcut, veri: { imzaliDilekce: imza }, numaralar: [NO] })
        .izin
    ).toBe(true);
    // İmzasız gönderemez.
    expect(
      ogrenciYazmaKarari({ tur: 'set', mevcut, veri: { durum: 'imzali' }, numaralar: [NO] }).izin
    ).toBe(false);
    expect(
      ogrenciYazmaKarari({
        tur: 'set',
        mevcut: { ...mevcut, imzaliDilekce: imza, silmeBeyani: 'var' },
        veri: { durum: 'imzali' },
        numaralar: [NO],
      }).izin
    ).toBe(true);
  });

  it('tek dilekçe: silinecek ders olsa da yalnız mezuniyet dilekçesi istenir', () => {
    const b = {
      ...form,
      imzaliDilekce: { url: 'u' },
      silmeBeyani: 'var',
      silinecekDersler: [{ kod: 'BLM101', ad: 'Programlama' }],
    };
    expect(imzaEksikleri(b)).toHaveLength(0);
    expect(imzaEksikleri({ ...b, imzaliDilekce: null })).toHaveLength(1);
    // Beyan kutularından biri işaretlenmeden gönderilemez.
    expect(imzaEksikleri({ ...b, silmeBeyani: '' })).toHaveLength(1);
  });

  it('gönderilmiş başvuruyu silemez; taslağı silebilir', () => {
    expect(
      ogrenciYazmaKarari({
        tur: 'delete',
        mevcut: { ...form, durum: 'danismanda' },
        numaralar: [NO],
      }).izin
    ).toBe(false);
    expect(
      ogrenciYazmaKarari({ tur: 'delete', mevcut: { ...form, durum: 'taslak' }, numaralar: [NO] })
        .izin
    ).toBe(true);
  });

  it('geçmiş yalnız sonuna eklenerek büyür', () => {
    const mevcut = { ...form, durum: 'taslak', gecmis: [{ olay: 'a' }] };
    expect(
      ogrenciYazmaKarari({
        tur: 'set',
        mevcut,
        veri: { gecmis: [{ olay: 'a' }, { olay: 'b' }] },
        numaralar: [NO],
      }).izin
    ).toBe(true);
    expect(
      ogrenciYazmaKarari({ tur: 'set', mevcut, veri: { gecmis: [] }, numaralar: [NO] }).izin
    ).toBe(false);
  });

  it('danışman adına not yazamaz', () => {
    const mevcut = { ...form, durum: 'dilekce', mesajlar: [] };
    const k = ogrenciYazmaKarari({
      tur: 'set',
      mevcut,
      veri: { mesajlar: [{ rol: 'danisman', metin: 'onaylıyorum' }] },
      numaralar: [NO],
    });
    expect(k.izin).toBe(false);
  });
});

describe('danışman yazma kararı', () => {
  const mevcut = { ...form, durum: 'danismanda' };

  it('onaylar ve işaretler', () => {
    const k = danismanYazmaKarari({
      tur: 'set',
      mevcut,
      veri: {
        durum: 'dilekce',
        silinecekDersler: [{ kod: 'BLM101' }],
        eksikStajlar: ['Staj I'],
        danismanNotu: 'Staj I eksik',
      },
    });
    expect(k.izin).toBe(true);
  });

  it('öğrencinin formunu değiştiremez', () => {
    const k = danismanYazmaKarari({ tur: 'set', mevcut, veri: { agno: '4.00' } });
    expect(k.izin).toBe(false);
  });

  it('kayıt açamaz, silemez', () => {
    expect(danismanYazmaKarari({ tur: 'set', mevcut: null, veri: form }).izin).toBe(false);
    expect(danismanYazmaKarari({ tur: 'delete', mevcut }).izin).toBe(false);
  });

  it('imzalı dilekçe gelmeden memura iletemez', () => {
    const d = { ...form, durum: 'dilekce' };
    expect(danismanYazmaKarari({ tur: 'set', mevcut: d, veri: { durum: 'memurda' } }).izin).toBe(
      false
    );
    const i = { ...form, durum: 'imzali', imzaliDilekce: { url: 'u' }, silmeBeyani: 'yok' };
    expect(danismanYazmaKarari({ tur: 'set', mevcut: i, veri: { durum: 'memurda' } }).izin).toBe(
      true
    );
  });

  it('imzalıdan sonra işaretleri değiştiremez', () => {
    const i = { ...form, durum: 'imzali', imzaliDilekce: { url: 'u' }, silinecekDersler: [] };
    expect(
      danismanYazmaKarari({ tur: 'set', mevcut: i, veri: { silinecekDersler: [{ kod: 'X' }] } })
        .izin
    ).toBe(false);
  });
});

describe('memur yazma kararı', () => {
  it('yalnız memura iletilmişi tamamlar', () => {
    expect(
      memurYazmaKarari({
        tur: 'set',
        mevcut: { ...form, durum: 'memurda' },
        veri: { durum: 'tamamlandi', memurNotu: 'tamam' },
      }).izin
    ).toBe(true);
    expect(
      memurYazmaKarari({
        tur: 'set',
        mevcut: { ...form, durum: 'imzali' },
        veri: { durum: 'tamamlandi' },
      }).izin
    ).toBe(false);
  });
});

describe('danışman eşleşmesi', () => {
  it('unvan ve Türkçe harf farkına bakmaz', () => {
    expect(danismanAnahtari('Dr. Öğr. Üyesi Mehmet Kaya')).toBe(danismanAnahtari('mehmet kaya'));
    expect(danismaniMi(form, 'Mehmet Kaya')).toBe(true);
    expect(danismaniMi(form, 'Ali Veli')).toBe(false);
  });
});

describe('personel görünürlüğü', () => {
  it('taslak hiçbir personele görünmez (tam erişim hariç)', () => {
    const b = { ...form, durum: 'taslak' };
    expect(personelGorurMu(b, { kimlik: 'Mehmet Kaya' })).toBe(false);
    expect(personelGorurMu(b, { tamErisim: true })).toBe(true);
  });
  it('danışman, alan yetkilisi ve iletilen memur görür', () => {
    const b = { ...form, durum: 'danismanda' };
    expect(personelGorurMu(b, { kimlik: 'Mehmet Kaya' })).toBe(true);
    expect(personelGorurMu(b, { kimlik: 'Ali', bolumAlaninda: (x) => x === 'bilgisayar' })).toBe(
      true
    );
    expect(personelGorurMu(b, { kimlik: 'Ali', memurBolumunde: () => true })).toBe(false);
    expect(
      personelGorurMu({ ...b, durum: 'memurda' }, { kimlik: 'Ali', memurBolumunde: () => true })
    ).toBe(true);
  });
});

describe('bildirim planı', () => {
  it('gönderimde danışmana, onayda öğrenciye gider', () => {
    const g = mezuniyetZilPlani({
      eski: { ...form, durum: 'taslak' },
      yeni: { ...form, durum: 'danismanda' },
      yapanRol: 'ogrenci',
    });
    expect(g).toHaveLength(1);
    expect(g[0].recipientId).toBe(form.danisman);
    expect(g[0].link).toBe('benimakademik');
    const o = mezuniyetZilPlani({
      eski: { ...form, durum: 'danismanda' },
      yeni: { ...form, durum: 'dilekce' },
      yapanRol: 'danisman',
    });
    expect(o[0].recipientId).toBe(NO);
    expect(o[0].link).toBe('mezuniyet');
  });

  it('dilekçe aşamasındaki işaret değişikliği öğrenciye bildirilir', () => {
    const p = mezuniyetZilPlani({
      eski: { ...form, durum: 'dilekce', silinecekDersler: [] },
      yeni: { ...form, durum: 'dilekce', silinecekDersler: [{ kod: 'BLM101' }] },
      yapanRol: 'danisman',
    });
    expect(p).toHaveLength(1);
    expect(p[0].type).toBe('mezuniyet_isaret');
  });

  it('yeni not karşı tarafa gider', () => {
    const p = mezuniyetZilPlani({
      eski: { ...form, durum: 'dilekce', mesajlar: [] },
      yeni: { ...form, durum: 'dilekce', mesajlar: [{ rol: 'danisman', metin: 'merhaba' }] },
      yapanRol: 'danisman',
    });
    expect(p[0].recipientId).toBe(NO);
  });
});

describe('dilekçe verisi', () => {
  it('silinecek dersleri ve stajları metne döker', () => {
    const v = dilekceVerisi(
      {
        ...form,
        silinecekDersler: [{ kod: 'BLM101', ad: 'Programlama', akts: '6' }],
        eksikStajlar: ['Staj I', 'Staj II'],
        iletisim: { telefon: '555' },
      },
      new Date('2026-06-01')
    );
    expect(v.silinecekDersMetni).toContain('BLM101');
    expect(v.eksikStajMetni).toBe('Staj I, Staj II');
    expect(v.telefon).toBe('555');
    expect(v.tarih).toBe('01.06.2026');
  });
});

describe('yardımcılar', () => {
  it('adım sırası', () => {
    expect(adimSirasi('taslak')).toBe(0);
    expect(adimSirasi('iade')).toBe(0);
    expect(adimSirasi('dilekce')).toBe(2);
    expect(adimSirasi('tamamlandi')).toBe(4);
  });
  it('sonaEklenenler', () => {
    expect(sonaEklenenler([1], [1, 2])).toEqual([2]);
    expect(sonaEklenenler([1, 2], [2])).toBe(null);
  });
});

describe('ders satırı kuralları (sarı satırlar)', () => {
  const mufredat = [
    { code: 'BLM101', name: 'Programlama', akts: 6, statu: 'Z', sinif: 1, donem: 'guz' },
    { code: 'BLM102', name: 'Veri Yapıları', akts: 5, statu: 'Z', sinif: 1, donem: 'bahar' },
  ];

  it('başarısız, müfredat dışı, AKTS farkı ve tekrar işaretlenir', () => {
    const s = mezuniyetHesapla(
      mufredat,
      [
        { kod: 'BLM101', ad: 'Programlama', akts: 6, not: 'AA' },
        { kod: 'BLM102', ad: 'Veri Yapıları', akts: 4, not: 'FF' },
        { kod: 'BLM102', ad: 'Veri Yapıları', akts: 5, not: 'BB' },
        { kod: 'TAR101', ad: 'Tarih', akts: 2, not: 'CC' },
      ],
      {}
    );
    const ids = s.kayitlar.map((r) => r.ihlaller.map((x) => x.id));
    expect(ids[0]).toEqual([]);
    expect(ids[1]).toEqual(expect.arrayContaining(['kalanNot', 'aktsFarki', 'tekrar']));
    expect(ids[2]).toEqual(['tekrar']);
    expect(ids[3]).toEqual(['mufredatDisi']);
    expect(s.ihlalSayisi).toBe(3);
  });

  it('kapatılan kural işaretlemez; ek notlar işaretlenir', () => {
    const s = mezuniyetHesapla(
      mufredat,
      [
        { kod: 'TAR101', ad: 'Tarih', akts: 2, not: 'CC' },
        { kod: 'BLM101', ad: 'Programlama', akts: 6, not: 'DD' },
      ],
      { satirKurallari: { mufredatDisi: false, uyariNotlari: 'DD, DC' } }
    );
    expect(s.kayitlar[0].ihlaller).toEqual([]);
    expect(s.kayitlar[1].ihlaller.map((x) => x.id)).toEqual(['uyariNotlari']);
  });

  it('müfredat tanımsızsa her satırı müfredat dışı diye boyamaz', () => {
    const s = mezuniyetHesapla([], [{ kod: 'X1', ad: 'X', akts: 3, not: 'AA' }], {});
    expect(s.kayitlar[0].ihlaller).toEqual([]);
  });

  it('kısmi kayıtta varsayılan kurallar ve staj listesi gelir', () => {
    const k = mezKuralNormalize({ toplamAkts: 240 });
    expect(k.satirKurallari.kalanNot).toBe(true);
    expect(k.stajlar.length).toBeGreaterThan(0);
  });
});
