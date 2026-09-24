import { describe, it, expect } from 'vitest';
import {
  DERS_PARCALARI,
  UYGULAMA_EKI,
  anahtarCoz,
  dersinParcalari,
  kayitParcasi,
  kayitUyarMi,
  parcaAdi,
  parcaAlanlari,
  parcaAnahtari,
  parcaCoz,
  parcaEtiketi,
  parcaKayitlari,
  parcaSaati,
  parcaliDersAdi,
  parcaliDersler,
  uygulamaliMi,
} from '../lib/ders-parcasi.js';

const TEK = { id: 'd1', code: 'MAT101', name: 'Matematik I', saat: 3 };
const IKILI = {
  id: 'd2',
  code: 'BİL111',
  name: 'Programlama I',
  uygulamaVar: true,
  teoriSaati: 2,
  uygulamaSaati: 2,
};

describe('parcaCoz', () => {
  // ⚠ VERİ KAYBININ ÖNÜNDEKİ İLK KURAL: parçası olmayan eski kayıt TEORİDİR.
  it('boş/tanınmayan değer teori sayılır', () => {
    expect(parcaCoz('')).toBe('teori');
    expect(parcaCoz(null)).toBe('teori');
    expect(parcaCoz('lab')).toBe('teori');
  });
  it('uygulama tanınır (kasa farkı dahil)', () => {
    expect(parcaCoz('uygulama')).toBe('uygulama');
    expect(parcaCoz('UYGULAMA')).toBe('uygulama');
  });
  it('parça listesi iki tanedir', () => {
    expect(DERS_PARCALARI.map((p) => p.id)).toEqual(['teori', 'uygulama']);
  });
});

describe('dersinParcalari', () => {
  it('uygulaması olmayan ders TEK parçadır', () => {
    expect(dersinParcalari(TEK)).toEqual(['teori']);
    expect(uygulamaliMi(TEK)).toBe(false);
  });
  it('uygulaması olan ders iki parçadır', () => {
    expect(dersinParcalari(IKILI)).toEqual(['teori', 'uygulama']);
  });
  it('boş ders patlamaz', () => {
    expect(dersinParcalari(null)).toEqual(['teori']);
  });
});

describe('etiketler', () => {
  it('uygulaması olmayan derste parça YAZILMAZ', () => {
    expect(parcaEtiketi(TEK, 'teori')).toBe('MAT101');
    expect(parcaliDersAdi(TEK, 'teori')).toBe('Matematik I');
  });
  it('uygulamalı derste parça yazılır', () => {
    expect(parcaEtiketi(IKILI, 'teori')).toBe('BİL111 — Teori');
    expect(parcaEtiketi(IKILI, 'uygulama')).toBe('BİL111 — Uygulama');
    expect(parcaliDersAdi(IKILI, 'uygulama')).toBe('Programlama I (Uygulama)');
  });
  it('parça adı', () => {
    expect(parcaAdi('uygulama')).toBe('Uygulama');
    expect(parcaAdi('')).toBe('Teori');
  });
});

describe('parcaAnahtari', () => {
  // ⚠ Teorinin ayar belgesi DEĞİŞMEZ: eski yoklama_ayarlari kayıtları
  // taşınmadan çalışmaya devam etmeli.
  it('teori anahtarı dersin kimliğidir', () => {
    expect(parcaAnahtari('d2', 'teori')).toBe('d2');
    expect(parcaAnahtari('d2', '')).toBe('d2');
  });
  it('uygulama için ikinci belge', () => {
    expect(parcaAnahtari('d2', 'uygulama')).toBe('d2' + UYGULAMA_EKI);
  });
  it('kimliksiz girdi boş döner', () => {
    expect(parcaAnahtari('', 'uygulama')).toBe('');
  });
  it('anahtar geri çözülür', () => {
    expect(anahtarCoz('d2__uygulama')).toEqual({ dersId: 'd2', parca: 'uygulama' });
    expect(anahtarCoz('d2')).toEqual({ dersId: 'd2', parca: 'teori' });
  });
});

describe('kayıt süzme', () => {
  const kayitlar = [
    { id: 'k1', dersId: 'd2', studentNumber: '1' }, // ESKİ kayıt: parça yok
    { id: 'k2', dersId: 'd2', parca: 'teori', studentNumber: '2' },
    { id: 'k3', dersId: 'd2', parca: 'uygulama', studentNumber: '3' },
    { id: 'k4', dersId: 'd1', parca: 'uygulama', studentNumber: '4' },
  ];

  it('parçasız eski kayıt teoriye düşer — hiçbir veri kaybolmaz', () => {
    expect(kayitParcasi(kayitlar[0])).toBe('teori');
    expect(parcaKayitlari(kayitlar, 'd2', 'teori').map((k) => k.id)).toEqual(['k1', 'k2']);
  });

  it('uygulama kayıtları ayrı listede', () => {
    expect(parcaKayitlari(kayitlar, 'd2', 'uygulama').map((k) => k.id)).toEqual(['k3']);
  });

  it('başka dersin kaydı karışmaz', () => {
    expect(kayitUyarMi(kayitlar[3], 'd2', 'uygulama')).toBe(false);
  });

  it('boş girdi patlamaz', () => {
    expect(parcaKayitlari(null, 'd2', 'teori')).toEqual([]);
    expect(kayitUyarMi(null, 'd2', 'teori')).toBe(false);
  });
});

describe('parcaSaati', () => {
  it('ayardaki değer her zaman üstündür', () => {
    expect(parcaSaati(IKILI, 'uygulama', { dersSaati: 4 })).toBe(4);
  });
  it('ayar yoksa dersin parça saati', () => {
    expect(parcaSaati(IKILI, 'teori')).toBe(2);
    expect(parcaSaati(IKILI, 'uygulama')).toBe(2);
  });
  it('parça saati yoksa dersin toplam saati', () => {
    expect(parcaSaati(TEK, 'teori')).toBe(3);
  });
  it('hiçbiri yoksa 1', () => {
    expect(parcaSaati({}, 'teori')).toBe(1);
  });
});

describe('parcaliDersler', () => {
  const liste = parcaliDersler([TEK, IKILI]);

  it('uygulamalı ders iki satır, diğeri tek satır', () => {
    expect(liste).toHaveLength(3);
    expect(liste.map((x) => x.etiket)).toEqual(['MAT101', 'BİL111 — Teori', 'BİL111 — Uygulama']);
  });

  it('anahtar ayar belgesiyle aynı', () => {
    expect(liste[1].anahtar).toBe('d2');
    expect(liste[2].anahtar).toBe('d2__uygulama');
  });

  it('boş liste patlamaz', () => {
    expect(parcaliDersler(null)).toEqual([]);
  });
});

describe('parcaAlanlari', () => {
  it('bayrak ve saatler normalize edilir', () => {
    expect(parcaAlanlari({ uygulamaVar: true, teoriSaati: '2', uygulamaSaati: '2' })).toEqual({
      uygulamaVar: true,
      teoriSaati: 2,
      uygulamaSaati: 2,
    });
  });
  it('kapalıyken saatler KORUNUR (bayrak yeniden açılabilir)', () => {
    expect(parcaAlanlari({ uygulamaVar: false, teoriSaati: 2, uygulamaSaati: 2 })).toEqual({
      uygulamaVar: false,
      teoriSaati: 2,
      uygulamaSaati: 2,
    });
  });
  it('geçersiz saat 0 olur', () => {
    expect(parcaAlanlari({ teoriSaati: 'abc' }).teoriSaati).toBe(0);
  });
});
