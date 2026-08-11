import { describe, it, expect } from 'vitest';
import {
  tabloAnahtari,
  tabloEtiketi,
  tablolariSirala,
  programuTablolardaBul,
  varsayilanEslesme,
  tabloNormalize,
  listeTuruEtiketi,
  basvuruTabani,
  tabanUygula,
} from '../lib/taban-kutuphane.js';

const tablo = (yil, tur, satirlar, puansizlar) => ({
  id: tabloAnahtari(yil, tur),
  yil,
  tur,
  satirlar: satirlar || [],
  puansizlar: puansizlar || [],
});

const KUTUPHANE = [
  tablo('2023', 'dgs', [{ ad: 'Bilgisayar Mühendisliği', taban: '280,10' }]),
  tablo(
    '2025',
    'dgs',
    [{ ad: 'Mühendislik Fakültesi Bilgisayar Mühendisliği', taban: '307,84423' }],
    [{ ad: 'Fen Fakültesi Fizik' }]
  ),
  tablo('2024', 'dgs', [{ ad: 'Bilgisayar Mühendisliği', taban: '295,50' }]),
  tablo('2025', 'lisans', [{ ad: 'Bilgisayar Mühendisliği', taban: '412,338' }]),
];

describe('tabloAnahtari / etiket', () => {
  it('yıl+tür başına tek anahtar', () => {
    expect(tabloAnahtari('2025', 'dgs')).toBe('2025__dgs');
    expect(tabloAnahtari('2025', 'dgs')).toBe(tabloAnahtari('2025', 'dgs'));
    expect(tabloAnahtari('2025', 'lisans')).not.toBe(tabloAnahtari('2025', 'dgs'));
  });

  it('eksik alanlarda da anahtar üretir', () => {
    expect(tabloAnahtari('', '')).toBe('yilsiz__diger');
    expect(tabloAnahtari(null, null)).toBe('yilsiz__diger');
  });

  it('etiket yıl ve türden kurulur, elle ad varsa o kazanır', () => {
    expect(tabloEtiketi({ yil: '2025', tur: 'dgs' })).toBe('2025 · DGS (Dikey Geçiş)');
    expect(tabloEtiketi({ yil: '2025', tur: 'dgs', ad: 'ÇAKÜ 2025 DGS' })).toBe('ÇAKÜ 2025 DGS');
    expect(tabloEtiketi(null)).toBe('');
  });

  it('bilinmeyen tür id olduğu gibi gösterilir', () => {
    expect(listeTuruEtiketi('dgs')).toBe('DGS (Dikey Geçiş)');
    expect(listeTuruEtiketi('bilinmeyen')).toBe('bilinmeyen');
  });
});

describe('tablolariSirala', () => {
  it('yeniden eskiye sıralar', () => {
    const s = tablolariSirala(KUTUPHANE);
    expect(s.map((t) => t.yil)).toEqual(['2025', '2025', '2024', '2023']);
  });

  it('yılı olmayan kayıt sona düşer, silinmez', () => {
    const s = tablolariSirala([tablo('', 'dgs'), tablo('2024', 'dgs')]);
    expect(s.map((t) => t.yil)).toEqual(['2024', '']);
  });

  it('boş girdide çökmez', () => {
    expect(tablolariSirala(null)).toEqual([]);
    expect(tablolariSirala([])).toEqual([]);
  });
});

describe('programuTablolardaBul', () => {
  const dgs = KUTUPHANE.filter((t) => t.tur === 'dgs');

  it('her seçili tabloda ayrı ayrı arar ve YILI korur', () => {
    const r = programuTablolardaBul(dgs, 'Bilgisayar Mühendisliği');
    expect(r.map((x) => x.yil)).toEqual(['2025', '2024', '2023']);
    expect(r.map((x) => x.taban)).toEqual(['307,84423', '295,50', '280,10']);
  });

  it('kod ve fakülte adı içeren satırı da eşleştirir', () => {
    const r = programuTablolardaBul([KUTUPHANE[1]], 'Bilgisayar Mühendisliği');
    expect(r[0].bulunanAd).toBe('Mühendislik Fakültesi Bilgisayar Mühendisliği');
  });

  it('puanı yayımlanmamış program "puansiz" olarak döner — bulunamadı değil', () => {
    const r = programuTablolardaBul([KUTUPHANE[1]], 'Fizik');
    expect(r).toHaveLength(1);
    expect(r[0].puansiz).toBe(true);
    expect(r[0].taban).toBe('');
  });

  it('hiç eşleşme yoksa boş döner', () => {
    expect(programuTablolardaBul(dgs, 'Tarih')).toEqual([]);
    expect(programuTablolardaBul([], 'Bilgisayar Mühendisliği')).toEqual([]);
    expect(programuTablolardaBul(null, 'x')).toEqual([]);
  });
});

describe('varsayilanEslesme', () => {
  const eslesmeler = programuTablolardaBul(
    KUTUPHANE.filter((t) => t.tur === 'dgs'),
    'Bilgisayar Mühendisliği'
  );

  it('adayın yılı biliniyorsa O YILIN tablosu seçilir', () => {
    // 2023'te yerleşen adayı 2025 tablosuyla ölçmek yanlış sonuç verirdi.
    expect(varsayilanEslesme(eslesmeler, '2023').taban).toBe('280,10');
    expect(varsayilanEslesme(eslesmeler, '2024').taban).toBe('295,50');
  });

  it('adayın yılı yoksa en yeni tablo', () => {
    expect(varsayilanEslesme(eslesmeler).yil).toBe('2025');
    expect(varsayilanEslesme(eslesmeler, '').yil).toBe('2025');
  });

  it('aday yılı kütüphanede yoksa en yeniye düşer', () => {
    expect(varsayilanEslesme(eslesmeler, '2019').yil).toBe('2025');
  });

  it('puansız eşleşme asla varsayılan seçilmez', () => {
    // Boş taban, karşılaştırmayı sessizce "belirsiz" yapardı.
    const yalnizPuansiz = programuTablolardaBul([KUTUPHANE[1]], 'Fizik');
    expect(varsayilanEslesme(yalnizPuansiz)).toBe(null);
  });

  it('boş listede null', () => {
    expect(varsayilanEslesme([])).toBe(null);
    expect(varsayilanEslesme(null)).toBe(null);
  });
});

describe('tabloNormalize', () => {
  it('eksik alanlı eski kaydı okunur hâle getirir', () => {
    const t = tabloNormalize({ _docId: 'x', satirlar: [{ ad: 'A', taban: '1' }] });
    expect(t.id).toBe('x');
    expect(t.tur).toBe('diger');
    expect(t.puansizlar).toEqual([]);
    // Sıra alanları eski kayıtlarda yok; boş doldurulur — o şart uygulanmaz.
    expect(t.satirlar[0]).toEqual({
      ad: 'A',
      taban: '1',
      kod: '',
      puanlar: [],
      tabanSira: '',
      sayilar: [],
      puanTuru: '',
    });
  });

  it('boş girdide çökmez', () => {
    const t = tabloNormalize(null);
    expect(t.satirlar).toEqual([]);
    expect(t.yil).toBe('');
  });
});

// ── Başvuru başına otomatik taban çözümü ──
// Program taban puanı/sırası önceden her başvuruda ELLE giriliyordu. Artık
// kütüphaneden çözülüyor; ama iki şey bozulmamalı: yıl eşlemesi ve insanın
// elle girdiği değerin üstünlüğü.
describe('basvuruTabani', () => {
  const tablolar = [
    {
      id: '2023__lisans',
      yil: '2023',
      tur: 'lisans',
      satirlar: [{ ad: 'Bilgisayar Mühendisliği', taban: '380,111', tabanSira: '210.000' }],
    },
    {
      id: '2025__lisans',
      yil: '2025',
      tur: 'lisans',
      satirlar: [{ ad: 'Bilgisayar Mühendisliği', taban: '412,338', tabanSira: '180.000' }],
    },
  ];
  const aday = (yil, ek) => ({
    id: 'a',
    basvurduguBolum: 'BİLGİSAYAR MÜHENDİSLİĞİ',
    yksYerlesmeYili: yil,
    ...(ek || {}),
  });

  it('adayın YERLEŞTİĞİ yılın tablosunu seçer', () => {
    // Asıl mesele bu: 2023'te yerleşeni 2025 tablosuyla ölçmek yanlış sonuç
    // verir; program başına tek değer bu ayrımı taşıyamaz.
    expect(basvuruTabani(aday('2023'), tablolar).taban).toBe('380,111');
    expect(basvuruTabani(aday('2025'), tablolar).taban).toBe('412,338');
  });

  it('sıra da aynı yıldan gelir', () => {
    expect(basvuruTabani(aday('2023'), tablolar).tabanSira).toBe('210.000');
  });

  it('ELLE girilen değer kütüphaneyi EZER', () => {
    // Kütüphaneden gelen bir okumadır, personelin yazdığı bir karardır.
    const c = basvuruTabani(
      aday('2025', { basvurduguBolumOsysPuani: '400,000', basvurduguBolumTabanSirasi: '150.000' }),
      tablolar
    );
    expect(c.taban).toBe('400,000');
    expect(c.tabanSira).toBe('150.000');
    expect(c.kaynak).toBe('elle');
  });

  it('yalnız biri elle girilmişse ÖTEKİ tablodan dolar', () => {
    const c = basvuruTabani(aday('2025', { basvurduguBolumOsysPuani: '400,000' }), tablolar);
    expect(c.taban).toBe('400,000');
    expect(c.tabanSira).toBe('180.000');
  });

  it('adayın yılına ait tablo seçili değilse UYARIR', () => {
    // Değer yine de üretilir (en yeni tablo), ama yıl tutmadığı işaretlenir —
    // yanlış yılın puanı yanlış karar demek.
    const c = basvuruTabani(aday('2019'), tablolar);
    expect(c.yilUyuyor).toBe(false);
    expect(c.yil).toBe('2025');
  });

  it('yıl bilinmiyorsa en yeni tablo kullanılır ve uyarı verilmez', () => {
    const c = basvuruTabani(aday(''), tablolar);
    expect(c.yil).toBe('2025');
    expect(c.yilUyuyor).toBe(true);
  });

  it('program bulunamazsa boş döner — şart uygulanmaz', () => {
    const c = basvuruTabani({ id: 'a', basvurduguBolum: 'Tarih' }, tablolar);
    expect(c.taban).toBe('');
    expect(c.kaynak).toBe('yok');
  });

  it('tablo yoksa çökmez', () => {
    expect(basvuruTabani(aday('2025'), []).taban).toBe('');
    expect(basvuruTabani(null, null).taban).toBe('');
  });
});

describe('tabanUygula', () => {
  it('kaydın KOPYASINA yazar — özgün kayıt değişmez', () => {
    // Çözüm bir okumadır; kayda yazmak ayrı bir karardır.
    const kayit = { id: 'a', basvurduguBolumOsysPuani: '' };
    const yeni = tabanUygula(kayit, { taban: '412,338', tabanSira: '180.000' });
    expect(yeni.basvurduguBolumOsysPuani).toBe('412,338');
    expect(yeni.basvurduguBolumTabanSirasi).toBe('180.000');
    expect(kayit.basvurduguBolumOsysPuani).toBe('');
  });

  it('boş çözümde kayıt olduğu gibi döner', () => {
    const kayit = { id: 'a' };
    expect(tabanUygula(kayit, null)).toBe(kayit);
  });
});
