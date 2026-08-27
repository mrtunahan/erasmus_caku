// ══════════════════════════════════════════════════════════════
// ÇAP ÖĞRENCİSİNİN İKİNCİ BÖLÜMÜ
//
// Kayıt tarafı doğruydu (additionalDepartments yazılıyordu) ama öğrenci
// oturumu bu alanı hiç taşımıyordu; ÇAP öğrencisi ikinci bölümüne ait hiçbir
// şeyi göremiyordu. Bu testler kuralı sabitler — ve ikinci bölümün öğrenciye
// AKADEMİSYEN yetkisi vermediğini de.
// ══════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import {
  ogrenciMi,
  ekBolumler,
  capOgrencisiMi,
  ogrenciBolumleri,
  ekBolumdeMi,
  caprazKisitli,
} from '../lib/cap-ogrenci.js';

const cap = {
  role: 'student',
  studentNumber: '123456789',
  departmentId: 'bilgisayar',
  additionalDepartments: ['elektrik'],
};
const duz = { role: 'student', departmentId: 'bilgisayar' };
const hoca = { role: 'professor', departmentId: 'bilgisayar', additionalDepartments: ['elektrik'] };

describe('ekBolumler', () => {
  it('boş/yinelenen kimlikleri temizler', () => {
    expect(ekBolumler({ additionalDepartments: ['elektrik', ' ', 'elektrik', 'makine'] })).toEqual([
      'elektrik',
      'makine',
    ]);
  });
  it('alan yoksa boş dizi', () => {
    expect(ekBolumler(duz)).toEqual([]);
    expect(ekBolumler(null)).toEqual([]);
  });
});

describe('capOgrencisiMi', () => {
  it('ek bölümü olan öğrenci ÇAP öğrencisidir', () => {
    expect(capOgrencisiMi(cap)).toBe(true);
  });
  it('tek bölümlü öğrenci değildir', () => {
    expect(capOgrencisiMi(duz)).toBe(false);
  });
  it('çapraz görevli akademisyen ÇAP öğrencisi değildir', () => {
    expect(capOgrencisiMi(hoca)).toBe(false);
  });
});

describe('ogrenciBolumleri', () => {
  it('ana bölüm başta, ek bölümler peşinde', () => {
    expect(ogrenciBolumleri(cap)).toEqual(['bilgisayar', 'elektrik']);
  });
  it('tek bölümlü öğrencide yalnız ana bölüm', () => {
    expect(ogrenciBolumleri(duz)).toEqual(['bilgisayar']);
  });
  it('ek bölüm ana bölümle aynıysa iki kez sayılmaz', () => {
    expect(
      ogrenciBolumleri({ departmentId: 'bilgisayar', additionalDepartments: ['bilgisayar'] })
    ).toEqual(['bilgisayar']);
  });
  it('ana bölümü olmayan kullanıcıda yalnız ek bölümler', () => {
    expect(ogrenciBolumleri({ additionalDepartments: ['elektrik'] })).toEqual(['elektrik']);
  });
});

describe('ekBolumdeMi', () => {
  it('ana bölümde false', () => {
    expect(ekBolumdeMi(cap, 'bilgisayar')).toBe(false);
  });
  it('ek bölümde true', () => {
    expect(ekBolumdeMi(cap, 'elektrik')).toBe(true);
  });
  it('hiç bağlı olmadığı bölümde false', () => {
    expect(ekBolumdeMi(cap, 'makine')).toBe(false);
  });
  it('aktif bölüm boşsa false', () => {
    expect(ekBolumdeMi(cap, '')).toBe(false);
  });
});

describe('caprazKisitli', () => {
  it('ÇAP ÖĞRENCİSİNE UYGULANMAZ — ikinci bölümde akademisyen olmaz', () => {
    expect(caprazKisitli(cap, 'elektrik')).toBe(false);
  });
  it('çapraz görevli akademisyende uygulanır', () => {
    expect(caprazKisitli(hoca, 'elektrik')).toBe(true);
  });
  it('akademisyen kendi ana bölümündeyken uygulanmaz', () => {
    expect(caprazKisitli(hoca, 'bilgisayar')).toBe(false);
  });
  it('bölüm yetkilisi ek bölümde kısıtlıdır', () => {
    const yetkili = {
      role: 'bolum_yetkilisi',
      departmentId: 'bilgisayar',
      additionalDepartments: ['elektrik'],
    };
    expect(caprazKisitli(yetkili, 'elektrik')).toBe(true);
  });
});

describe('ogrenciMi', () => {
  it('rolü ayırt eder', () => {
    expect(ogrenciMi(cap)).toBe(true);
    expect(ogrenciMi(hoca)).toBe(false);
    expect(ogrenciMi(null)).toBe(false);
  });
});
