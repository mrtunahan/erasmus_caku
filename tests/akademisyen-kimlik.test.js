// Aynı adlı `professors` kayıtlarının birleştirilmesi.
//
// Vaka: üniversite yetkilisi bir fakülteye akademisyen ekliyor, kişi
// oluşuyor ama VERİLEN ROLDE görünmüyordu. Sebep, yetki denetiminin
// `findOne({ name })` ile aynı adlı kayıtlardan RASTGELE birini seçmesiydi:
// yetkisiz kopya seçildiğinde yeni akademisyenin `isFacultyManager` alanı
// sessizce düşürülüyor, istek yine "başarılı" dönüyordu.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { profilBirlestir } = require('../server/lib/akademisyen-kimlik.js');

describe('profilBirlestir', () => {
  it('tek kayıtta kaydın kendisini verir', () => {
    const p = profilBirlestir([{ name: 'A', isFacultyManager: true }]);
    expect(p).toEqual({ name: 'A', isFacultyManager: true });
    // Tek kayıtta mükerrer damgası basılmaz.
    expect(p._mukerrerSayisi).toBeUndefined();
  });

  it('boş / geçersiz girdide null', () => {
    expect(profilBirlestir([])).toBe(null);
    expect(profilBirlestir(null)).toBe(null);
    expect(profilBirlestir([null, undefined])).toBe(null);
  });

  it('YETKİ BAYRAKLARI OR’lanır — rastgele kopya yetkiyi gizleyemez', () => {
    // Asıl arıza buydu: yetkisiz kopya seçilince yönetici yetkisiz sayılıyordu.
    const p = profilBirlestir([
      { name: 'Tunahan', isDeptManager: true },
      { name: 'Tunahan', isUniversityAdmin: true },
      { name: 'Tunahan', isStajCoordinator: true },
    ]);
    expect(p.isUniversityAdmin).toBe(true);
    expect(p.isDeptManager).toBe(true);
    expect(p.isStajCoordinator).toBe(true);
    expect(p._mukerrerSayisi).toBe(3);
  });

  it('canonical EN YETKİLİ kayıttır — dedupe-professors.js ile aynı sıra', () => {
    const p = profilBirlestir([
      { name: 'X', departmentId: 'makine', createdAt: '2020-01-01' },
      { name: 'X', isUniversityAdmin: true, departmentId: 'bilgisayar' },
    ]);
    expect(p.departmentId).toBe('bilgisayar');
  });

  it('eşit yetkide BÖLÜMÜ DOLU olan, sonra en ESKİ kayıt kazanır', () => {
    expect(
      profilBirlestir([
        { name: 'X', createdAt: '2020-01-01' },
        { name: 'X', departmentId: 'gida', createdAt: '2024-01-01' },
      ]).departmentId
    ).toBe('gida');

    expect(
      profilBirlestir([
        { name: 'X', departmentId: 'a', createdAt: '2024-01-01' },
        { name: 'X', departmentId: 'b', createdAt: '2020-01-01' },
      ]).departmentId
    ).toBe('b');
  });

  it('boş alanlar mükerrerlerden doldurulur', () => {
    // Üniversite yetkilisi fakülte düzeyinde eklerken departmentId yazmıyor;
    // aynı kişinin bölüm kaydı varsa bölüm bilgisi kaybolmamalı.
    const p = profilBirlestir([
      { name: 'X', isUniversityAdmin: true, facultyId: 'muh' },
      { name: 'X', departmentId: 'makine', department: 'Makine Mühendisliği', email: 'x@y.z' },
    ]);
    expect(p).toMatchObject({
      facultyId: 'muh',
      departmentId: 'makine',
      department: 'Makine Mühendisliği',
      email: 'x@y.z',
    });
  });

  it('dolu alanın üstüne YAZMAZ — canonical’ın değeri korunur', () => {
    const p = profilBirlestir([
      { name: 'X', isUniversityAdmin: true, departmentId: 'dogru' },
      { name: 'X', departmentId: 'eski' },
    ]);
    expect(p.departmentId).toBe('dogru');
  });

  it('liste alanları BİRLEŞTİRİLİR, seçilmez', () => {
    // Bir kayıtta gözetmenlik, ötekinde ek bölüm varsa ikisi de geçerlidir.
    const p = profilBirlestir([
      { name: 'X', roles: ['gozetmen'], additionalDepartments: ['makine'] },
      { name: 'X', roles: ['komisyon'], additionalDepartments: ['makine', 'gida'] },
    ]);
    expect(p.roles.sort()).toEqual(['gozetmen', 'komisyon']);
    expect(p.additionalDepartments.sort()).toEqual(['gida', 'makine']);
  });

  it('memur ve harici bayrakları da taşınır', () => {
    const p = profilBirlestir([
      { name: 'X' },
      { name: 'X', isMemur: true, memurModules: ['staj'] },
      { name: 'X', external: true },
    ]);
    expect(p.isMemur).toBe(true);
    expect(p.external).toBe(true);
    expect(p.memurModules).toEqual(['staj']);
  });
});
