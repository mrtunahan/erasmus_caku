import { describe, it, expect } from 'vitest';
import {
  ekMadde1Otomatik,
  ekMadde1Uygula,
  otomatikOzet,
  otomatikYazim,
  otomatikYazimlar,
} from '../lib/yatay-otomatik.js';
import { basvuruTabani, tabanUygula } from '../lib/taban-kutuphane.js';
import { elemeNedeni, elenecekler } from '../lib/yatay-kriter.js';
import { asilYedekOner } from '../lib/yatay-siralama.js';

const basvuru = (o) => ({
  id: 'b1',
  turu: 'merkezi',
  ogrenciNo: '2100123',
  createdAt: '2026-08-01T10:00:00.000Z',
  ...o,
});

describe('ekMadde1Otomatik', () => {
  it('sistemde asil sonuçlanmış önceki merkezi başvuru varsa "var" der', () => {
    const gecmis = [
      basvuru({
        id: 'eski',
        degerlendirme: 'uygun_asil',
        createdAt: '2025-08-01T10:00:00.000Z',
      }),
    ];
    const oto = ekMadde1Otomatik(basvuru({ oncekiEkMadde1Gecisi: 'hayir' }), gecmis);
    expect(oto.deger).toBe('var');
    expect(oto.kaynak).toBe('sistem_kaydi');
    // Sistem kaydı adayın beyanını yener
    expect(oto.gerekce).toContain('2025-08-01');
  });

  it('sonraki tarihli başvuru önceki geçişin kanıtı sayılmaz', () => {
    const gecmis = [
      basvuru({
        id: 'yeni',
        degerlendirme: 'uygun_asil',
        createdAt: '2027-08-01T10:00:00.000Z',
      }),
    ];
    expect(ekMadde1Otomatik(basvuru({}), gecmis).deger).toBe('');
  });

  it('yedek/uygun değil sonuçlanmış kayıt geçiş kanıtı değildir', () => {
    const gecmis = [
      basvuru({ id: 'e1', degerlendirme: 'uygun_yedek', createdAt: '2025-01-01' }),
      basvuru({ id: 'e2', degerlendirme: 'uygun_degil', createdAt: '2025-01-01' }),
    ];
    expect(ekMadde1Otomatik(basvuru({}), gecmis).deger).toBe('');
  });

  it('başka öğrencinin ya da başka türün kaydı sayılmaz', () => {
    const gecmis = [
      basvuru({
        id: 'e1',
        ogrenciNo: '9999999',
        degerlendirme: 'uygun_asil',
        createdAt: '2025-01-01',
      }),
      basvuru({
        id: 'e2',
        turu: 'kurumlararasi',
        degerlendirme: 'uygun_asil',
        createdAt: '2025-01-01',
      }),
    ];
    expect(ekMadde1Otomatik(basvuru({}), gecmis).deger).toBe('');
  });

  it('kayıt yoksa beyana düşer', () => {
    expect(ekMadde1Otomatik(basvuru({ oncekiEkMadde1Gecisi: 'hayir' }), []).deger).toBe('yok');
    expect(ekMadde1Otomatik(basvuru({ oncekiEkMadde1Gecisi: 'hayir' }), []).kaynak).toBe('beyan');
    expect(ekMadde1Otomatik(basvuru({ oncekiEkMadde1Gecisi: 'evet' }), []).deger).toBe('var');
  });

  it('beyan da yoksa boş kalır — belirsizlik uydurulmaz', () => {
    expect(ekMadde1Otomatik(basvuru({}), []).deger).toBe('');
  });

  it('öğrenci numarası olmayan (vekâleten) kayıtta geçmiş taranmaz', () => {
    const gecmis = [basvuru({ id: 'eski', degerlendirme: 'uygun_asil', createdAt: '2025-01-01' })];
    const oto = ekMadde1Otomatik(basvuru({ ogrenciNo: '', oncekiEkMadde1Gecisi: 'hayir' }), gecmis);
    expect(oto.deger).toBe('yok');
    expect(oto.kaynak).toBe('beyan');
  });
});

describe('ekMadde1Uygula', () => {
  it('boş alana otomatik değeri yansıtır', () => {
    const k = ekMadde1Uygula(basvuru({}), { deger: 'var' });
    expect(k.ekMadde1Dogrulama).toBe('var');
  });

  it('personelin kararına dokunmaz', () => {
    const k = ekMadde1Uygula(basvuru({ ekMadde1Dogrulama: 'yok' }), { deger: 'var' });
    expect(k.ekMadde1Dogrulama).toBe('yok');
  });
});

describe('otomatikYazim', () => {
  const oneri = {
    id: 'b1',
    degerlendirme: 'uygun_asil',
    degerlendirmeSinif: '3',
    degerlendirmeSira: '1',
  };

  it('değerlendirilmemiş kayda sıralamayı yazar', () => {
    const { patch, notlar } = otomatikYazim(basvuru({}), oneri, { siralama: true });
    expect(patch.degerlendirme).toBe('uygun_asil');
    expect(patch.degerlendirmeSinif).toBe('3');
    expect(patch.degerlendirmeSira).toBe('1');
    expect(patch.degerlendirmeKaynak).toBe('otomatik');
    expect(notlar).toContain('siralama');
  });

  it('personelin verdiği sonucu EZMEZ', () => {
    const { patch } = otomatikYazim(basvuru({ degerlendirme: 'eksik_belge' }), oneri, {
      siralama: true,
    });
    expect(patch.degerlendirme).toBeUndefined();
  });

  it('öneri boşsa (puansız kayıt) yazmaz', () => {
    const { patch } = otomatikYazim(
      basvuru({}),
      { id: 'b1', degerlendirme: '' },
      { siralama: true }
    );
    expect(Object.keys(patch)).toHaveLength(0);
  });

  it('kontenjan dışı önerisini de yazar, gerekçesiyle', () => {
    const { patch } = otomatikYazim(
      basvuru({}),
      { id: 'b1', degerlendirme: 'uygun_degil', degerlendirmeSinif: '2', sebep: 'kontenjan' },
      { siralama: true }
    );
    expect(patch.degerlendirme).toBe('uygun_degil');
    expect(patch.degerlendirmeSebebi).toBe('kontenjan');
  });

  it('Ek Madde-1 tespitini kaynağıyla birlikte yazar', () => {
    const { patch, notlar } = otomatikYazim(basvuru({}), null, {
      ekMadde1: true,
      ekMadde1Oto: { deger: 'yok', kaynak: 'beyan', gerekce: 'beyan' },
    });
    expect(patch.ekMadde1Dogrulama).toBe('yok');
    expect(patch.ekMadde1Kaynak).toBe('beyan');
    expect(notlar).toContain('ekMadde1');
  });

  it('personelin işaretlediği Ek Madde-1 alanına dokunmaz', () => {
    const { patch } = otomatikYazim(
      basvuru({ ekMadde1Dogrulama: 'yok', ekMadde1Kaynak: 'personel' }),
      null,
      { ekMadde1: true, ekMadde1Oto: { deger: 'var', kaynak: 'sistem_kaydi' } }
    );
    expect(patch.ekMadde1Dogrulama).toBeUndefined();
  });

  it('personel alanı temizlemişse (kaynak personel) yeniden doldurmaz', () => {
    const { patch } = otomatikYazim(
      basvuru({ ekMadde1Dogrulama: '', ekMadde1Kaynak: 'personel' }),
      null,
      { ekMadde1: true, ekMadde1Oto: { deger: 'yok', kaynak: 'beyan' } }
    );
    expect(Object.keys(patch)).toHaveLength(0);
  });

  it('ek madde kapalıysa (kurumlararası geçiş) yazmaz', () => {
    const { patch } = otomatikYazim(basvuru({}), null, {
      ekMadde1: false,
      ekMadde1Oto: { deger: 'yok', kaynak: 'beyan' },
    });
    expect(Object.keys(patch)).toHaveLength(0);
  });
});

describe('otomatikYazimlar', () => {
  it('yalnız yazılacak alanı olan kayıtları döndürür ve özetler', () => {
    const kayitlar = [
      basvuru({ id: 'a', oncekiEkMadde1Gecisi: 'hayir' }),
      basvuru({ id: 'b', degerlendirme: 'uygun_asil', ekMadde1Dogrulama: 'yok' }),
      basvuru({ id: 'c' }),
    ];
    const harita = new Map([
      ['a', { degerlendirme: 'uygun_asil', degerlendirmeSinif: '2', degerlendirmeSira: '1' }],
      ['c', { degerlendirme: '' }],
    ]);
    const yazimlar = otomatikYazimlar(kayitlar, harita, {
      gecmis: kayitlar,
      siralama: true,
      ekMadde1: true,
    });
    expect(yazimlar.map((y) => y.id)).toEqual(['a']);
    expect(otomatikOzet(yazimlar)).toEqual({ siralama: 1, ekMadde1: 1, toplam: 1 });
  });

  it('sıralama kapalıyken yalnız Ek Madde-1 yazılır', () => {
    const kayitlar = [basvuru({ id: 'a', oncekiEkMadde1Gecisi: 'hayir' })];
    const yazimlar = otomatikYazimlar(kayitlar, new Map(), {
      gecmis: kayitlar,
      siralama: false,
      ekMadde1: true,
    });
    expect(yazimlar[0].patch.degerlendirme).toBeUndefined();
    expect(yazimlar[0].patch.ekMadde1Dogrulama).toBe('yok');
  });

  it('boş listede çökmez', () => {
    expect(otomatikYazimlar([], new Map(), {})).toEqual([]);
    expect(otomatikOzet([])).toEqual({ siralama: 0, ekMadde1: 0, toplam: 0 });
  });
});

// Değerlendirme ekranının tamamı: kütüphaneden taban çözümü → eleme →
// sıralama → kayda yazılacak yamalar. Parçalar tek tek doğru olup zincir
// kopabildiği için (taban tabloları modüle hiç ulaşmıyordu) uçtan uca bağlanır.
describe('değerlendirmenin uçtan uca otomatik doldurulması', () => {
  const tablolar = [
    {
      id: '2024__lisans',
      yil: '2024',
      tur: 'lisans',
      satirlar: [{ ad: 'Bilgisayar Mühendisliği', taban: '412,338', tabanSira: '180000' }],
    },
    {
      id: '2025__lisans',
      yil: '2025',
      tur: 'lisans',
      satirlar: [{ ad: 'Bilgisayar Mühendisliği', taban: '431,900', tabanSira: '150000' }],
    },
  ];
  const aday = (o) => ({
    turu: 'merkezi',
    basvurduguBolum: 'Bilgisayar Mühendisliği',
    basvurduguSinif: '2',
    yksYerlesmeYili: '2024',
    oncekiEkMadde1Gecisi: 'hayir',
    ...o,
  });
  const basvurular = [
    aday({
      id: 'a',
      ogrenciNo: '111',
      yksPuani: '425,10',
      yksBasariSirasi: '150000',
      createdAt: '2026-08-01',
    }),
    aday({
      id: 'b',
      ogrenciNo: '222',
      yksPuani: '418,00',
      yksBasariSirasi: '170000',
      createdAt: '2026-08-02',
    }),
    aday({
      id: 'c',
      ogrenciNo: '333',
      yksPuani: '400,00',
      yksBasariSirasi: '260000',
      createdAt: '2026-08-03',
    }),
  ];
  // Kurumun kendi kaydı: 333 numaralı aday daha önce Ek Madde-1 ile geçmiş.
  const gecmis = [
    ...basvurular,
    {
      id: 'eski',
      turu: 'merkezi',
      ogrenciNo: '333',
      degerlendirme: 'uygun_asil',
      createdAt: '2025-08-01',
    },
  ];

  const kriter = basvurular.map((r) =>
    ekMadde1Uygula(tabanUygula(r, basvuruTabani(r, tablolar)), ekMadde1Otomatik(r, gecmis))
  );

  it('taban puanı adayın YERLEŞTİĞİ yılın tablosundan çözülür', () => {
    const c = basvuruTabani(basvurular[0], tablolar);
    expect(c.taban).toBe('412,338'); // 2025 tablosu da seçili ama aday 2024'lü
    expect(c.tabanSira).toBe('180000');
    expect(c.yil).toBe('2024');
    expect(c.yilUyuyor).toBe(true);
    expect(c.kaynak).toBe('tablo');
  });

  it('taban sırasının gerisindeki aday sıralamaya girmeden elenir', () => {
    expect(elemeNedeni(kriter[0], '')).toBe('');
    expect(elemeNedeni(kriter[2], '')).toBe('program_sira');
  });

  it('sınıf kontenjanına göre asil/yedek sırası üretilir ve kayda yazılır', () => {
    const oneri = asilYedekOner(kriter, 'merkezi', { 2: { asil: '1', yedek: '1' } }, null, {
      esikDisi: elenecekler(kriter, ''),
    });
    const harita = new Map(oneri.map((o) => [String(o.id), o]));
    const yazimlar = otomatikYazimlar(basvurular, harita, {
      gecmis,
      siralama: true,
      ekMadde1: true,
    });
    const yama = (id) => yazimlar.find((y) => y.id === id).patch;

    expect(yama('a').degerlendirme).toBe('uygun_asil');
    expect(yama('a').degerlendirmeSira).toBe('1');
    expect(yama('b').degerlendirme).toBe('uygun_yedek');
    expect(yama('c').degerlendirme).toBe('uygun_degil');
    expect(yama('c').degerlendirmeSebebi).toBe('program_sira');
    // Ek Madde-1: beyan vs kurumun kendi kaydı
    expect(yama('a').ekMadde1Dogrulama).toBe('yok');
    expect(yama('a').ekMadde1Kaynak).toBe('beyan');
    expect(yama('c').ekMadde1Dogrulama).toBe('var');
    expect(yama('c').ekMadde1Kaynak).toBe('sistem_kaydi');
  });

  it('kontenjan girilmemişken sıralama yazılmaz, Ek Madde-1 yazılır', () => {
    const yazimlar = otomatikYazimlar(basvurular, new Map(), {
      gecmis,
      siralama: false,
      ekMadde1: true,
    });
    expect(yazimlar).toHaveLength(3);
    yazimlar.forEach((y) => expect(y.patch.degerlendirme).toBeUndefined());
    expect(otomatikOzet(yazimlar).siralama).toBe(0);
  });
});
