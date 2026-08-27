// ══════════════════════════════════════════════════════════════
// ÖĞRENCİ EKLEME — BÖLÜMSÜZ KAYIT VE MÜKERRER NUMARA
//
// İki gerçek arıza: (1) bölüm yazılmayan öğrenci hiçbir listede görünmüyor,
// "eklendi sonra silindi" sanılıyordu; (2) aynı numarayla ikinci deneme
// benzersiz indekse takılıp anlaşılmaz bir hata veriyordu.
// ══════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { numaraAnahtari, ayniNumarali, kayitBirlestir, kayitKarari } from '../lib/ogrenci-kayit.js';

const kayitlar = [
  { id: 'a', studentNumber: '111111111', firstName: 'Ali', departmentId: 'bilgisayar' },
  // Bölümsüz "kayıp" kayıt — hiçbir bölüm listesinde görünmez.
  { id: 'b', studentNumber: '222222222', firstName: 'Ece İrem', lastName: 'Filiz' },
];

describe('ayniNumarali', () => {
  it('bölümsüz kaydı da bulur', () => {
    expect(ayniNumarali(kayitlar, '222222222').id).toBe('b');
  });
  it('baştaki/sondaki boşluğa takılmaz', () => {
    expect(ayniNumarali(kayitlar, ' 111111111 ').id).toBe('a');
  });
  it('yoksa null', () => {
    expect(ayniNumarali(kayitlar, '999999999')).toBe(null);
  });
  it('boş numarada null', () => {
    expect(ayniNumarali(kayitlar, '')).toBe(null);
    expect(ayniNumarali(kayitlar, null)).toBe(null);
  });
});

describe('kayitKarari', () => {
  it('numara yoksa kayıt yapılmaz', () => {
    expect(kayitKarari(kayitlar, { departmentId: 'bilgisayar' }).durum).toBe('eksik_no');
  });
  it('BÖLÜM YOKSA KAYIT YAPILMAZ — kayıt hiçbir listede görünmezdi', () => {
    expect(kayitKarari(kayitlar, { studentNumber: '333333333' }).durum).toBe('eksik_bolum');
    expect(kayitKarari(kayitlar, { studentNumber: '333333333', departmentId: '  ' }).durum).toBe(
      'eksik_bolum'
    );
  });
  it('numara zaten varsa taşıma önerilir, yeni kayıt açılmaz', () => {
    const k = kayitKarari(kayitlar, { studentNumber: '222222222', departmentId: 'bilgisayar' });
    expect(k.durum).toBe('tasima');
    expect(k.mevcut.id).toBe('b');
  });
  it('yeni numara doğrudan eklenir', () => {
    expect(
      kayitKarari(kayitlar, { studentNumber: '333333333', departmentId: 'bilgisayar' }).durum
    ).toBe('yeni');
  });
});

describe('kayitBirlestir', () => {
  it('formdaki alanlar üzerine yazar', () => {
    const sonuc = kayitBirlestir(
      { id: 'b', studentNumber: '222222222', firstName: 'Ece İrem' },
      { studentNumber: '222222222', firstName: 'Ece İrem', departmentId: 'bilgisayar' }
    );
    expect(sonuc.departmentId).toBe('bilgisayar');
  });
  it('formda olmayan alanları KORUR (ÇAP, eşleştirmeler, Erasmus)', () => {
    const mevcut = {
      id: 'b',
      studentNumber: '222222222',
      additionalDepartments: ['elektrik'],
      outgoingMatches: [{ ders: 'x' }],
      erasmusAccess: true,
    };
    const sonuc = kayitBirlestir(mevcut, {
      studentNumber: '222222222',
      departmentId: 'bilgisayar',
    });
    expect(sonuc.additionalDepartments).toEqual(['elektrik']);
    expect(sonuc.outgoingMatches).toEqual([{ ders: 'x' }]);
    expect(sonuc.erasmusAccess).toBe(true);
  });
  it('formdaki boş değerler var olanı silmez', () => {
    const sonuc = kayitBirlestir(
      { id: 'b', firstName: 'Ece İrem', hostInstitution: 'Uludağ' },
      { firstName: '', hostInstitution: '  ', outgoingMatches: [] }
    );
    expect(sonuc.firstName).toBe('Ece İrem');
    expect(sonuc.hostInstitution).toBe('Uludağ');
  });
  it('kayıt kimliğini korur', () => {
    expect(kayitBirlestir({ _docId: 'b2' }, { id: 'yeni' }).id).toBe('b2');
  });
});

describe('numaraAnahtari', () => {
  it('metne çevirir ve kırpar', () => {
    expect(numaraAnahtari(123)).toBe('123');
    expect(numaraAnahtari(' 456 ')).toBe('456');
    expect(numaraAnahtari(null)).toBe('');
  });
});
