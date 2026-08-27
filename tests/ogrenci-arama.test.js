// ══════════════════════════════════════════════════════════════
// ÖĞRENCİ ADI ARAMA KAPSAMI
//
// Proje modülünde grup üyesi seçerken ada göre öneri gerekiyor; `students`
// koleksiyonu öğrenciye kapalı olduğu için sunucuda dar bir arama kapısı var.
// Bu testler kapının öğrenciye başka bölümleri taratmadığını doğrular.
// ══════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
const { aramaKapsami, desenKacir, aramaAdlari } = require('../server/lib/ogrenci-arama.js');

describe('aramaKapsami', () => {
  it('personel istediği bölümü sorabilir', () => {
    const s = aramaKapsami({ role: 'professor' }, null, 'bilgisayar');
    expect(s).toEqual({ izin: true, kapsamlar: ['bilgisayar'] });
  });

  it('personel bölüm vermezse kapsam boş kalır (tüm liste)', () => {
    expect(aramaKapsami({ role: 'admin' }, null, '')).toEqual({ izin: true, kapsamlar: [] });
  });

  it('öğrenci kaydı bulunamazsa arama açılmaz', () => {
    expect(aramaKapsami({ role: 'student' }, null, 'bilgisayar')).toEqual({
      izin: false,
      kapsamlar: [],
    });
  });

  it('bölümü çözülemeyen öğrenci tüm okulu tarayamaz', () => {
    expect(aramaKapsami({ role: 'student' }, { departmentId: '' }, 'bilgisayar')).toEqual({
      izin: false,
      kapsamlar: [],
    });
  });

  it('öğrencinin istediği bölüm kendi bölümü değilse yok sayılır', () => {
    const s = aramaKapsami({ role: 'student' }, { departmentId: 'bilgisayar' }, 'makine');
    expect(s).toEqual({ izin: true, kapsamlar: ['bilgisayar'] });
  });

  it('öğrenci kendi bölümünü isterse o bölüme daraltılır', () => {
    const ben = { departmentId: 'bilgisayar', additionalDepartments: ['matematik'] };
    const s = aramaKapsami({ role: 'student' }, ben, 'matematik');
    expect(s).toEqual({ izin: true, kapsamlar: ['matematik'] });
  });

  it('bölüm verilmezse öğrencinin tüm bölümleri taranır', () => {
    const ben = { departmentId: 'bilgisayar', additionalDepartments: ['matematik'] };
    const s = aramaKapsami({ role: 'student' }, ben, '');
    expect(s).toEqual({ izin: true, kapsamlar: ['bilgisayar', 'matematik'] });
  });

  it('yinelenen bölüm kimliği bir kez sayılır', () => {
    const ben = { departmentId: 'bilgisayar', additionalDepartments: ['bilgisayar', ' '] };
    expect(aramaKapsami({ role: 'student' }, ben, '').kapsamlar).toEqual(['bilgisayar']);
  });

  it('oturumsuz istek öğrenci gibi ele alınır', () => {
    expect(aramaKapsami(null, null, 'bilgisayar')).toEqual({ izin: false, kapsamlar: [] });
  });
});

describe('desenKacir', () => {
  it('düzenli ifade karakterlerini kaçırır', () => {
    expect(desenKacir('a.*b')).toBe('a\\.\\*b');
    expect(new RegExp(desenKacir('a.*b'), 'i').test('axxb')).toBe(false);
    expect(new RegExp(desenKacir('a.*b'), 'i').test('a.*b')).toBe(true);
  });

  it('normal metni bozmaz', () => {
    expect(desenKacir(' Ayşe ')).toBe('Ayşe');
  });
});

describe('aramaAdlari', () => {
  it('ad + soyad birleştirir, yinelenenleri eler', () => {
    const adlar = aramaAdlari([
      { firstName: 'Ayşe', lastName: 'Yılmaz' },
      { firstName: 'Ayşe', lastName: 'Yılmaz' },
      { name: 'Zeynep Kaya' },
      { firstName: '', lastName: '', name: '' },
      null,
    ]);
    expect(adlar).toEqual(['Ayşe Yılmaz', 'Zeynep Kaya']);
  });

  it('liste değilse boş döner', () => {
    expect(aramaAdlari(null)).toEqual([]);
  });
});
