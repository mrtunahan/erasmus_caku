import { describe, it, expect } from 'vitest';
import { slotBirlestir } from '../lib/ders-slot.js';

const slot = (o) => ({
  courseCode: 'KML312',
  courseName: 'Kimya',
  instructor: 'Ayşe Yılmaz',
  classroom: 'D-101',
  sinif: 3,
  ...o,
});

describe('slotBirlestir', () => {
  it('bölünmemiş hücreyi olduğu gibi verir', () => {
    const k = slotBirlestir(slot({}));
    expect(k.courseCode).toBe('KML312');
    expect(k.instructor).toBe('Ayşe Yılmaz');
    expect(k.classroom).toBe('D-101');
    expect(k.sinif).toBe(3);
  });

  it('İKİ FARKLI HOCANIN dersi bölündüğünde ikinci hoca da yazılır', () => {
    // Bildirilen hata: ikinci eklenen hocanın adı çıktıda hiç görünmüyordu.
    const k = slotBirlestir(
      slot({
        ikinci: {
          courseCode: 'TLK543',
          courseName: 'Türk Dili',
          instructor: 'Mehmet Demir',
          classroom: 'D-101',
        },
      })
    );
    expect(k.courseCode).toBe('KML312 / TLK543');
    expect(k.instructor).toBe('Ayşe Yılmaz / Mehmet Demir');
    expect(k.courseName).toBe('Kimya / Türk Dili');
  });

  it('aynı hoca iki dersi veriyorsa adı bir kez yazılır', () => {
    const k = slotBirlestir(
      slot({ ikinci: { courseCode: 'TLK543', instructor: 'Ayşe Yılmaz', classroom: 'D-101' } })
    );
    expect(k.instructor).toBe('Ayşe Yılmaz');
    expect(k.classroom).toBe('D-101');
  });

  it('ikinci dersin hocası boşsa birincininki tek başına kalır', () => {
    const k = slotBirlestir(slot({ ikinci: { courseCode: 'TLK543' } }));
    expect(k.instructor).toBe('Ayşe Yılmaz');
    expect(k.classroom).toBe('D-101');
    expect(k.courseCode).toBe('KML312 / TLK543');
  });

  it('ders adları aynıysa tek kez yazılır', () => {
    const k = slotBirlestir(
      slot({ ikinci: { courseCode: 'TLK543', courseName: 'Kimya', instructor: 'Ayşe Yılmaz' } })
    );
    expect(k.courseName).toBe('Kimya');
  });

  it('derslikler farklıysa ikisi de yazılır', () => {
    const k = slotBirlestir(
      slot({ ikinci: { courseCode: 'TLK543', instructor: 'Mehmet Demir', classroom: 'D-205' } })
    );
    expect(k.classroom).toBe('D-101 / D-205');
  });

  it('kodu olmayan ikinci ders (yarım kayıt) birleştirmeye girmez', () => {
    const k = slotBirlestir(slot({ ikinci: { instructor: 'Mehmet Demir' } }));
    expect(k.courseCode).toBe('KML312');
    expect(k.instructor).toBe('Ayşe Yılmaz');
  });

  it('ek bağlam alanları karta eklenir', () => {
    const k = slotBirlestir(slot({}), { deptName: 'Kimya Mühendisliği', year: '3' });
    expect(k.deptName).toBe('Kimya Mühendisliği');
    expect(k.year).toBe('3');
  });

  it('boş slotta çökmez', () => {
    const k = slotBirlestir(null);
    expect(k.courseCode).toBe('');
    expect(k.instructor).toBe('');
  });
});
