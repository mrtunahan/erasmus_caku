// "Akademisyen bu bölümde mi?" — bölüm bazlı tüm ekranların ortak kuralı.
//
// İki canlı şikâyet bu kuralın etrafında dönüyordu: akademisyen kendi
// bölümünde GÖRÜNMÜYOR (kimlik biçimi farklı), ve akademisyen başka bölümde
// HAYALET olarak görünüyor (eski `department` metni koşulsuz deneniyordu).
import { describe, it, expect } from 'vitest';
import { akademisyenBolumdeMi } from '../lib/akademisyen-bolum.js';

const BOLUMLER = [
  {
    id: 'bilgisayar',
    name: 'Bilgisayar Mühendisliği',
    kimlikler: ['bilgisayar', '6a2d523a21e2b85be1c7a004'],
  },
  { id: 'makine', name: 'Makine Mühendisliği', kimlikler: ['makine', '64aa02'] },
];

describe('kimlik eşleşmesi', () => {
  it('slug ile kayıtlı akademisyen slug bölümde görünür', () => {
    expect(akademisyenBolumdeMi({ departmentId: 'bilgisayar' }, 'bilgisayar', BOLUMLER)).toBe(true);
  });

  it('ObjectId ile kayıtlı akademisyen SLUG bölümde de görünür', () => {
    // Asıl arıza: ham eşitlik bu kişiyi hiçbir bölüme bağlayamıyordu.
    expect(
      akademisyenBolumdeMi({ departmentId: '6a2d523a21e2b85be1c7a004' }, 'bilgisayar', BOLUMLER)
    ).toBe(true);
  });

  it('slug ile kayıtlı akademisyen ObjectId sorgusunda da görünür', () => {
    expect(
      akademisyenBolumdeMi({ departmentId: 'bilgisayar' }, '6a2d523a21e2b85be1c7a004', BOLUMLER)
    ).toBe(true);
  });

  it('başka bölümün akademisyeni görünmez', () => {
    expect(akademisyenBolumdeMi({ departmentId: 'makine' }, 'bilgisayar', BOLUMLER)).toBe(false);
    expect(akademisyenBolumdeMi({ departmentId: '64aa02' }, 'bilgisayar', BOLUMLER)).toBe(false);
  });
});

describe('çapraz-bölüm (additionalDepartments)', () => {
  it('ek bölüm listesindeki akademisyen o bölümde görünür', () => {
    const p = { departmentId: 'makine', additionalDepartments: ['bilgisayar'] };
    expect(akademisyenBolumdeMi(p, 'bilgisayar', BOLUMLER)).toBe(true);
    expect(akademisyenBolumdeMi(p, 'makine', BOLUMLER)).toBe(true);
  });

  it('ek bölüm ÖTEKİ kimlik biçimiyle yazılmışsa da bulunur', () => {
    const p = { departmentId: 'makine', additionalDepartments: ['6a2d523a21e2b85be1c7a004'] };
    expect(akademisyenBolumdeMi(p, 'bilgisayar', BOLUMLER)).toBe(true);
  });
});

describe('bölüm adı — yalnız SON ÇARE', () => {
  it('kimliksiz ham kayıt ADINDAN bulunur', () => {
    const p = { department: 'Bilgisayar Mühendisliği' };
    expect(akademisyenBolumdeMi(p, 'bilgisayar', BOLUMLER, 'Bilgisayar Mühendisliği')).toBe(true);
  });

  it('Türkçe büyük/küçük harf ve boşluk farkı yutulur', () => {
    const p = { department: 'BİLGİSAYAR  MÜHENDİSLİĞİ' };
    expect(akademisyenBolumdeMi(p, 'bilgisayar', BOLUMLER, 'Bilgisayar Mühendisliği')).toBe(true);
  });

  it('HAYALET: kimlik varken eski ad metni ARTIK dikkate alınmaz', () => {
    // Kişi Makine'ye taşındı ama eski `department` metni Bilgisayar'da kaldı.
    // Eskiden her iki bölümde birden görünüyordu.
    const p = { departmentId: 'makine', department: 'Bilgisayar Mühendisliği' };
    expect(akademisyenBolumdeMi(p, 'bilgisayar', BOLUMLER, 'Bilgisayar Mühendisliği')).toBe(false);
    expect(akademisyenBolumdeMi(p, 'makine', BOLUMLER, 'Makine Mühendisliği')).toBe(true);
  });

  it('kısmi ad eşleşmesi kabul edilmez', () => {
    // "Kimya" "Kimya Mühendisliği" içinde geçer; kapsama eşleşmesi yanlış
    // pozitif üretiyordu.
    const p = { department: 'Kimya' };
    expect(akademisyenBolumdeMi(p, 'bilgisayar', BOLUMLER, 'Kimya Mühendisliği')).toBe(false);
  });
});

describe('sınır durumları', () => {
  it('boş girdilerde false döner', () => {
    expect(akademisyenBolumdeMi(null, 'bilgisayar', BOLUMLER)).toBe(false);
    expect(akademisyenBolumdeMi({ departmentId: 'bilgisayar' }, '', BOLUMLER)).toBe(false);
    expect(akademisyenBolumdeMi({}, 'bilgisayar', BOLUMLER)).toBe(false);
  });

  it('bölüm listesi yoksa HAM EŞİTLİĞE düşer — süzgeç boşa düşmesin', () => {
    expect(akademisyenBolumdeMi({ departmentId: 'bilgisayar' }, 'bilgisayar', [])).toBe(true);
    expect(
      akademisyenBolumdeMi({ departmentId: '6a2d523a21e2b85be1c7a004' }, 'bilgisayar', [])
    ).toBe(false);
  });
});
