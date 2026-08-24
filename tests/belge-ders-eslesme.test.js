import { describe, it, expect } from 'vitest';
import {
  metinAnahtari,
  kodCekirdegi,
  adAnahtari,
  dersEslestir,
  okunanlarOzeti,
} from '../lib/belge-ders-eslesme.js';

describe('metinAnahtari', () => {
  it('Türkçe I ve İ aynı anahtara iner — eski kuralın kırıldığı yer', () => {
    // Eski normalize `I` → `ı` yapıp ardından `ı`yı siliyordu: "BIL101"
    // "bl101" oluyor, belgedeki "BİL101" ise "bil101"; kod hiç tutmuyordu.
    expect(metinAnahtari('BIL101')).toBe('bil101');
    expect(metinAnahtari('BİL101')).toBe('bil101');
    expect(metinAnahtari('bil101')).toBe('bil101');
    expect(metinAnahtari('bıl101')).toBe('bil101');
  });

  it('bütün Türkçe harfleri ASCII karşılığına indirir', () => {
    expect(metinAnahtari('İŞLETME')).toBe('isletme');
    expect(metinAnahtari('işletme')).toBe('isletme');
    expect(metinAnahtari('Öğrenci Çağrı')).toBe('ogrencicagri');
  });

  it('harf ve rakam dışındaki her şeyi atar', () => {
    expect(metinAnahtari('MAT 101')).toBe('mat101');
    expect(metinAnahtari('MAT-101')).toBe('mat101');
    expect(metinAnahtari('  MAT.101  ')).toBe('mat101');
  });

  it('boş girdide boş döner', () => {
    expect(metinAnahtari(null)).toBe('');
    expect(metinAnahtari('')).toBe('');
  });
});

describe('kodCekirdegi', () => {
  it('şube ve dönem ekini atar', () => {
    expect(kodCekirdegi('BIL101/A')).toBe('bil101');
    expect(kodCekirdegi('BİL 101 (Yaz)')).toBe('bil101');
    expect(kodCekirdegi('BIL-101-2')).toBe('bil101');
  });

  it('kod harf+rakam biçiminde değilse anahtarı olduğu gibi verir', () => {
    expect(kodCekirdegi('101')).toBe('101');
    expect(kodCekirdegi('SEÇMELİ')).toBe('secmeli');
  });
});

describe('adAnahtari', () => {
  it('sondaki roma rakamını sayıya çevirir', () => {
    expect(adAnahtari('Matematik I')).toBe(adAnahtari('Matematik 1'));
    expect(adAnahtari('Matematik II')).toBe(adAnahtari('Matematik-2'));
    expect(adAnahtari('Fizik IV')).toBe(adAnahtari('Fizik 4'));
  });

  it('ad içindeki I harfine dokunmaz', () => {
    // "İstatistik" sondaki bir roma rakamı değil.
    expect(adAnahtari('İstatistik')).toBe('istatistik');
    expect(adAnahtari('Istatistik')).toBe('istatistik');
  });

  it('Matematik I ile Matematik II ayrı derstir', () => {
    expect(adAnahtari('Matematik I')).not.toBe(adAnahtari('Matematik II'));
  });
});

describe('dersEslestir', () => {
  const satirlar = [
    { kod: 'BİL101', ad: 'Bilgisayar Programlama I', not: '87' },
    { kod: 'MAT-201/A', ad: 'Matematik II', not: '65' },
    { kod: '', ad: 'Genel Fizik Laboratuvarı', not: '78' },
  ];

  it('kodu birebir eşler — I/İ farkı engel değil', () => {
    const r = dersEslestir(satirlar, { code: 'BIL101', name: 'Bilgisayar Prog.' });
    expect(r.yontem).toBe('kod');
    expect(r.satir.not).toBe('87');
  });

  it('şube eki taşıyan kodu çekirdekten eşler', () => {
    const r = dersEslestir(satirlar, { code: 'MAT201', name: '' });
    expect(r.yontem).toBe('kod-cekirdek');
    expect(r.satir.not).toBe('65');
  });

  it('kod yoksa addan eşler, roma rakamı denkleşir', () => {
    const r = dersEslestir(satirlar, { code: '', name: 'Bilgisayar Programlama 1' });
    expect(r.yontem).toBe('ad');
    expect(r.satir.not).toBe('87');
  });

  it('belgedeki ad daha uzunsa içermeyle eşler', () => {
    const r = dersEslestir(satirlar, { code: '', name: 'Fizik Laboratuvarı' });
    expect(r.yontem).toBe('ad-icerme');
    expect(r.satir.not).toBe('78');
  });

  it('kod eşleşmesi ad eşleşmesinden önce gelir', () => {
    // Kod BİL101'i, ad Matematik II'yi gösteriyor: kod kazanır.
    const r = dersEslestir(satirlar, { code: 'BIL101', name: 'Matematik II' });
    expect(r.yontem).toBe('kod');
    expect(r.satir.not).toBe('87');
  });

  it('birden çok aday varsa ada göre EŞLEŞMEZ — yanlış not yazmaktansa boş kalır', () => {
    const ikili = [
      { kod: '', ad: 'Genel Kimya Laboratuvarı', not: '70' },
      { kod: '', ad: 'Organik Kimya Laboratuvarı', not: '90' },
    ];
    expect(dersEslestir(ikili, { code: '', name: 'Kimya Laboratuvarı' }).satir).toBe(null);
  });

  it('kısa adlarda içerme denenmez', () => {
    const kisa = [{ kod: '', ad: 'Fizik Mühendisliğine Giriş', not: '55' }];
    expect(dersEslestir(kisa, { code: '', name: 'Fizik' }).satir).toBe(null);
  });

  it('eşleşme yoksa boş sonuç döner', () => {
    expect(dersEslestir(satirlar, { code: 'TAR101', name: 'Tarih' }).satir).toBe(null);
    expect(dersEslestir([], { code: 'BIL101', name: 'x' }).satir).toBe(null);
    expect(dersEslestir(null, { code: 'BIL101', name: 'x' }).satir).toBe(null);
  });

  it('kodu ve adı olmayan ders hiçbir satıra bağlanmaz', () => {
    expect(dersEslestir(satirlar, {}).satir).toBe(null);
    expect(dersEslestir(satirlar, { code: '', name: '' }).satir).toBe(null);
  });
});

describe('okunanlarOzeti', () => {
  it('kod varsa kodu, yoksa adı listeler', () => {
    expect(okunanlarOzeti([{ kod: 'BIL101' }, { kod: '', ad: 'Fizik' }])).toBe('BIL101, Fizik');
  });

  it('uzun listeyi kısaltıp kalanı sayar', () => {
    const cok = Array.from({ length: 9 }, (_, i) => ({ kod: 'D' + i }));
    expect(okunanlarOzeti(cok, 3)).toBe('D0, D1, D2 (+6)');
  });

  it('boş listede boş döner', () => {
    expect(okunanlarOzeti([])).toBe('');
    expect(okunanlarOzeti(null)).toBe('');
    expect(okunanlarOzeti([{ kod: '', ad: '' }])).toBe('');
  });
});
