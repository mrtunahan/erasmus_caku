import { describe, it, expect } from 'vitest';
import { slotBirlestir, slotDersEkle, slotDersGuncelle, slotDersleri } from '../lib/ders-slot.js';
import { akademisyenKayitlari, programIzgarasi } from '../lib/akademisyen-programi.js';

// Bir hücreye üç ders koymanın uçtan uca sonucu: kayıt biçimi → akademisyen
// programı → çıktı kartı. Parçalar tek tek doğruyken zincir kopabildiği için
// (ikinci hocanın adı çıktıda kaybolmuştu) bütün olarak bağlanır.
describe('bir hücrede üç ders — uçtan uca', () => {
  // Akademisyen üç dersi sırayla ekliyor, her birine ayrı derslik veriyor.
  let slot = null;
  slot = slotDersEkle(slot, {
    courseCode: 'KML312',
    courseName: 'Kimya',
    instructor: 'Ayşe Yılmaz',
    classroom: 'D-101',
    sinif: 3,
  });
  slot = slotDersEkle(slot, {
    courseCode: 'TLK543',
    courseName: 'Türk Dili',
    instructor: 'Mehmet Demir',
    classroom: 'D-205',
  });
  slot = slotDersEkle(slot, {
    courseCode: 'FZK101',
    courseName: 'Fizik',
    instructor: 'Ayşe Yılmaz',
    classroom: 'F-3',
  });

  it('üç ders de kayda giriyor, her biri kendi dersliğiyle', () => {
    const d = slotDersleri(slot);
    expect(d).toHaveLength(3);
    expect(d.map((x) => x.classroom)).toEqual(['D-101', 'D-205', 'F-3']);
    expect(d.map((x) => x.instructor)).toEqual(['Ayşe Yılmaz', 'Mehmet Demir', 'Ayşe Yılmaz']);
  });

  it('çıktı kartında üçü de yazılıyor, tekrar etmeden', () => {
    const k = slotBirlestir(slot, { year: '3' });
    expect(k.courseCode).toBe('KML312 / TLK543 / FZK101');
    expect(k.classroom).toBe('D-101 / D-205 / F-3');
    // Ayşe Yılmaz iki derste var ama bir kez yazılır
    expect(k.instructor).toBe('Ayşe Yılmaz / Mehmet Demir');
  });

  it('akademisyenin programında ÜÇÜNCÜ ders de görünüyor', () => {
    const dokumanlar = [
      {
        id: 'bilgisayar_guz_3',
        departmentId: 'bilgisayar',
        semester: 'guz',
        year: '3',
        slots: { Pazartesi_2: slot },
      },
    ];
    const kayitlar = akademisyenKayitlari(dokumanlar, { ad: 'Ayşe Yılmaz', donem: 'guz' });
    // Aynı gün+saatteki kayıtlar ders koduna göre sıralanır (FZK < KML).
    expect(kayitlar.map((k) => k.dersKodu)).toEqual(['FZK101', 'KML312']);
    expect(kayitlar.map((k) => k.derslik)).toEqual(['F-3', 'D-101']);
    // Mehmet Demir'in dersi bu hocanın programına GİRMEZ
    expect(kayitlar.map((k) => k.dersKodu)).not.toContain('TLK543');
  });

  it('aynı hücredeki dersler hocanın çakışması SAYILMAZ', () => {
    const dokumanlar = [
      {
        id: 'bilgisayar_guz_3',
        departmentId: 'bilgisayar',
        semester: 'guz',
        year: '3',
        slots: { Pazartesi_2: slot },
      },
    ];
    const kayitlar = akademisyenKayitlari(dokumanlar, { ad: 'Ayşe Yılmaz', donem: 'guz' });
    // İki dersi de aynı hücrede: hoca tek yerde, çakışma yok
    expect(programIzgarasi(kayitlar).cakismalar).toEqual([]);
    // Ders saati de bir kez sayılır
    expect(programIzgarasi(kayitlar).ozet.dersSaati).toBe(1);
  });

  it('ortadaki dersin dersliği değişince diğerleri etkilenmiyor', () => {
    const s = slotDersGuncelle(slot, 1, { classroom: 'Z-9' });
    expect(slotDersleri(s).map((x) => x.classroom)).toEqual(['D-101', 'Z-9', 'F-3']);
  });

  it('eski iki dersli kayda üçüncü eklenince biçim kendiliğinden yenilenir', () => {
    const eski = {
      courseCode: 'KML312',
      instructor: 'Ayşe Yılmaz',
      classroom: 'D-101',
      ikinci: { courseCode: 'TLK543', instructor: 'Mehmet Demir', classroom: 'D-205' },
    };
    const s = slotDersEkle(eski, { courseCode: 'FZK101', classroom: 'F-3' });
    expect(s.ikinci).toBeUndefined();
    expect(slotDersleri(s).map((x) => x.courseCode)).toEqual(['KML312', 'TLK543', 'FZK101']);
    expect(slotDersleri(s).map((x) => x.classroom)).toEqual(['D-101', 'D-205', 'F-3']);
  });
});
