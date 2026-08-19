// "Üniversite yetkilisi mi?" sorusunun tek tanımı.
//
// Bu ayrım üç yerde yetki kapısı: Taban Puanlar'da SİLME, Audit Log'un
// görünürlüğü ve Akreditasyon modülünün içeriği. Yanlış cevap yetkiyi
// sessizce genişletir, o yüzden kural testle sabitlenmiştir.
import { describe, it, expect } from 'vitest';
import { universiteYetkilisiMi } from '../lib/yetki.js';

describe('universiteYetkilisiMi', () => {
  it('bayraklı üniversite yetkilisi → true', () => {
    expect(
      universiteYetkilisiMi({ role: 'admin', baseRole: 'professor', isUniversityAdmin: true })
    ).toBe(true);
  });

  it('FAKÜLTE yetkilisi → false (asıl tuzak)', () => {
    // Fakülte yetkilisi girişte 'admin' rolüne yükseltiliyor; `role` ile
    // ayırmaya çalışmak onu üniversite yetkilisi sayardı.
    expect(
      universiteYetkilisiMi({
        role: 'admin',
        baseRole: 'professor',
        isFacultyManager: true,
        isUniversityAdmin: false,
      })
    ).toBe(false);
  });

  it('bölüm yetkilisi ve sade akademisyen → false', () => {
    expect(universiteYetkilisiMi({ role: 'bolum_yetkilisi', isDeptManager: true })).toBe(false);
    expect(universiteYetkilisiMi({ role: 'professor', baseRole: 'professor' })).toBe(false);
  });

  it('öğrenci → false', () => {
    expect(universiteYetkilisiMi({ role: 'student' })).toBe(false);
  });

  it('eski (bayraksız) admin girişi → true — kilitlenmesin', () => {
    // O oturum profil bayrağı taşımaz; ayıran işaret baseRole'ün YOKLUĞU.
    expect(universiteYetkilisiMi({ role: 'admin' })).toBe(true);
  });

  it('boş / tanımsız kullanıcı → false', () => {
    expect(universiteYetkilisiMi(null)).toBe(false);
    expect(universiteYetkilisiMi(undefined)).toBe(false);
    expect(universiteYetkilisiMi({})).toBe(false);
  });

  it('çapraz-bölümde bayraklar düşürülmüş kullanıcı → false', () => {
    // app-shell çapraz bölümde effectiveUser’ın bayraklarını sıfırlıyor;
    // o kullanıcı orada üniversite yetkilisi değildir.
    expect(
      universiteYetkilisiMi({
        role: 'professor',
        baseRole: 'professor',
        isUniversityAdmin: false,
        isFacultyManager: false,
      })
    ).toBe(false);
  });
});
