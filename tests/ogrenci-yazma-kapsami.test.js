// Öğrencinin yazabileceği koleksiyonlar — İZİN listesi.
// Burada olmayan bir koleksiyona öğrenci yazamaz, güncelleyemez, SİLEMEZ.
import { describe, it, expect } from 'vitest';
import { STUDENT_WRITABLE, ogrenciYazabilir } from '../server/lib/ogrenci-yazma-kapsami.js';

describe('öğrencinin yazabildikleri', () => {
  it('kendi kayıtlarını açtığı koleksiyonlar açıktır', () => {
    ['muafiyet_records', 'internship_applications', 'student_courses', 'randevu_talepleri'].forEach(
      (k) => expect(ogrenciYazabilir(k)).toBe(true)
    );
  });

  // ── SAHİBİN KARARI ──
  // Erasmus eşleştirme geçmişi öğrenciye akademisyendeki GİBİ GÖSTERİLİYOR
  // (bkz. server/lib/ogrenci-okuma.js başlığı). Okumanın açılması SİLMEYİ
  // açmamalı: silme yetkisi akademisyen tarafında kalır.
  it('Erasmus eşleştirme geçmişini öğrenci SİLEMEZ', () => {
    expect(ogrenciYazabilir('trip_history')).toBe(false);
  });

  it('kurumun ortak kayıtları öğrenciye kapalıdır', () => {
    [
      'trip_history',
      'students',
      'professors',
      'departments',
      'faculties',
      'sinav_dersler',
      'yoklama_kayitlari',
      'yoklama_oturumlari',
      'yoklama_ayarlari',
      'muafiyet_history',
      'audit_logs',
      'erasmus_universities',
    ].forEach((k) => expect(ogrenciYazabilir(k)).toBe(false));
  });

  it('bilinmeyen/boş koleksiyon adı yazmaya açılmaz', () => {
    expect(ogrenciYazabilir('')).toBe(false);
    expect(ogrenciYazabilir(null)).toBe(false);
    expect(ogrenciYazabilir(undefined)).toBe(false);
    expect(ogrenciYazabilir('uydurma_koleksiyon')).toBe(false);
  });

  it('liste beklenmedik biçimde büyümemiş', () => {
    // Sayıyı sabitlemek, gözden kaçan bir eklemeyi gözle görülür kılar.
    expect(STUDENT_WRITABLE.size).toBe(32);
  });
});
