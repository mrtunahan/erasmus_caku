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
  capSatiriMi,
  capBolumundenCikar,
  capSilinebilirMi,
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

// ══════════════════════════════════════════════════════════════
// ÇAP SATIRI VE SİLME KORUMASI
//
// Veri kaybı buradan geldi: ÇAP öğrencisi ikinci bölümün öğrenci listesinde
// görünüyor ve satırdaki tek işlem "Sil" idi — o düğme öğrencinin TÜM kaydını
// siliyordu, yani ana bölümünden de. Silme yalnız ana bölümde yapılabilir.
// ══════════════════════════════════════════════════════════════
describe('capSatiriMi', () => {
  it('ek bölümün listesinde ÇAP satırıdır', () => {
    expect(capSatiriMi(cap, 'elektrik')).toBe(true);
  });
  it('ana bölümün listesinde ÇAP satırı değildir', () => {
    expect(capSatiriMi(cap, 'bilgisayar')).toBe(false);
  });
  it('tek bölümlü öğrenci hiçbir yerde ÇAP satırı değildir', () => {
    expect(capSatiriMi(duz, 'bilgisayar')).toBe(false);
    expect(capSatiriMi(duz, 'elektrik')).toBe(false);
  });
});

describe('capBolumundenCikar', () => {
  it('yalnız o bölümü listeden çıkarır', () => {
    const cok = {
      departmentId: 'bilgisayar',
      additionalDepartments: ['elektrik', 'makine'],
    };
    expect(capBolumundenCikar(cok, 'elektrik')).toEqual(['makine']);
  });
  it('tek ÇAP bölümü çıkınca liste boşalır', () => {
    expect(capBolumundenCikar(cap, 'elektrik')).toEqual([]);
  });
  it('ana bölüm listeden zaten yok, dokunmaz', () => {
    expect(capBolumundenCikar(cap, 'bilgisayar')).toEqual(['elektrik']);
  });
});

describe('capSilinebilirMi', () => {
  it('ÇAP BÖLÜMÜNDEN SİLİNEMEZ — kayıt ana bölümde de yok olurdu', () => {
    expect(capSilinebilirMi(cap, 'elektrik')).toBe(false);
  });
  it('ana bölümünden silinebilir', () => {
    expect(capSilinebilirMi(cap, 'bilgisayar')).toBe(true);
  });
  it('tek bölümlü öğrenci kendi bölümünden silinebilir', () => {
    expect(capSilinebilirMi(duz, 'bilgisayar')).toBe(true);
  });
});
