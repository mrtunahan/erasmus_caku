// Öğrencinin okuyabileceği kayıt kuralı: başkasının kaydı sunucudan HİÇ
// çıkmamalı, kendi kaydı ise eksiksiz çıkmalı (bkz. server/lib/ogrenci-okuma.js).
import { describe, it, expect } from 'vitest';
import {
  ogrenciKaydi,
  ogrenciOkumaKurali,
  ogrenciOkumasiSuz,
  basvuruGerekli,
} from '../server/lib/ogrenci-okuma.js';

const BEN = { no: '2021001', ad: 'Ayşe Yılmaz', bolum: 'bilgisayar' };

describe('kural tablosu', () => {
  it('korunan koleksiyonların kuralı var', () => {
    [
      'muafiyet_history',
      'student_notifications',
      'internship_notifications',
      'survey_responses',
      'notifications',
      'internship_uploads',
      'internship_roadmap',
    ].forEach((k) => expect(ogrenciOkumaKurali(k)).toBeTruthy());
  });

  it('kuralı olmayan koleksiyon dokunulmadan geçer', () => {
    expect(ogrenciOkumaKurali('departments')).toBeNull();
    expect(ogrenciKaydi({ a: 1 }, null, BEN)).toEqual({ a: 1 });
  });
});

describe('sahiplik (muafiyet geçmişi, bildirimler)', () => {
  const kural = ogrenciOkumaKurali('muafiyet_history');

  it('kendi kaydı olduğu gibi döner', () => {
    const k = { studentNo: '2021001', studentName: 'Ayşe Yılmaz', sourceCourse: { grade: 'AA' } };
    expect(ogrenciKaydi(k, kural, BEN)).toBe(k);
  });

  it('başkasının kaydı hiç dönmez', () => {
    expect(ogrenciKaydi({ studentNo: '2021002' }, kural, BEN)).toBeNull();
  });

  it('sahipsiz kayıt da dönmez (boş alan kaçış kapısı olmamalı)', () => {
    expect(ogrenciKaydi({ studentNo: '' }, kural, BEN)).toBeNull();
    expect(ogrenciKaydi({}, kural, BEN)).toBeNull();
  });

  it('staj bildirimi hedef öğrenciye bakar', () => {
    const k = ogrenciOkumaKurali('internship_notifications');
    expect(ogrenciKaydi({ targetStudentNo: '2021001' }, k, BEN)).toBeTruthy();
    // Komisyona giden bildirimin hedefi yok → öğrenci görmez
    expect(ogrenciKaydi({ departmentId: 'bilgisayar' }, k, BEN)).toBeNull();
  });
});

describe('anket yanıtı — eski kayıtlar adla yazılmış', () => {
  const kural = ogrenciOkumaKurali('survey_responses');

  it('numarayla yazılmış yanıt görünür', () => {
    expect(ogrenciKaydi({ userId: '2021001', answers: {} }, kural, BEN)).toBeTruthy();
  });

  it('ADLA yazılmış eski yanıt da görünür (yoksa öğrenci ikinci kez yanıtlar)', () => {
    expect(ogrenciKaydi({ userId: 'Ayşe Yılmaz', answers: {} }, kural, BEN)).toBeTruthy();
  });

  it('başkasının yanıtı görünmez', () => {
    expect(
      ogrenciKaydi({ userId: 'Mehmet Demir', answers: { q1: 'kötü' } }, kural, BEN)
    ).toBeNull();
    expect(ogrenciKaydi({ userId: '2021002' }, kural, BEN)).toBeNull();
  });
});

describe('merkezî bildirim alıcı kuralı', () => {
  const kural = ogrenciOkumaKurali('notifications');

  it('kişiye gelen bildirim', () => {
    expect(
      ogrenciKaydi({ recipientType: 'user', recipientId: '2021001' }, kural, BEN)
    ).toBeTruthy();
    expect(ogrenciKaydi({ recipientType: 'user', recipientId: '2021002' }, kural, BEN)).toBeNull();
  });

  it('bölüm ve rol yayınları', () => {
    expect(
      ogrenciKaydi({ recipientType: 'department', recipientId: 'bilgisayar' }, kural, BEN)
    ).toBeTruthy();
    expect(
      ogrenciKaydi({ recipientType: 'department', recipientId: 'orman' }, kural, BEN)
    ).toBeNull();
    expect(
      ogrenciKaydi({ recipientType: 'role', recipientId: 'student' }, kural, BEN)
    ).toBeTruthy();
    // Akademisyenlere giden duyuru öğrenciye düşmez
    expect(
      ogrenciKaydi({ recipientType: 'role', recipientId: 'professor' }, kural, BEN)
    ).toBeNull();
  });

  it('tür yazılmamışsa kişisel sayılır', () => {
    expect(ogrenciKaydi({ recipientId: '2021001' }, kural, BEN)).toBeTruthy();
  });
});

describe('staj belgeleri — sahiplik başvurudan çözülür', () => {
  const kural = ogrenciOkumaKurali('internship_uploads');
  const kimlik = { ...BEN, basvuruIdleri: new Set(['app-1', 'app-2']) };

  it('kendi başvurusunun belgeleri görünür', () => {
    expect(ogrenciKaydi({ _docId: 'app-1', kimlik_fotokopisi: {} }, kural, kimlik)).toBeTruthy();
    expect(ogrenciKaydi({ id: 'app-2' }, kural, kimlik)).toBeTruthy();
  });

  it('başkasının başvurusu görünmez', () => {
    expect(ogrenciKaydi({ _docId: 'app-9' }, kural, kimlik)).toBeNull();
  });

  it('başvuru listesi çözülemediyse hiçbir şey dönmez', () => {
    expect(ogrenciKaydi({ _docId: 'app-1' }, kural, BEN)).toBeNull();
  });

  it('kural başvuru çözümü istiyor mu', () => {
    expect(basvuruGerekli(kural)).toBe(true);
    expect(basvuruGerekli(ogrenciOkumaKurali('notifications'))).toBe(false);
  });
});

describe('Erasmus eşleştirme geçmişi öğrenciye AYNEN görünür', () => {
  // ── SAHİBİN KARARI ──
  // Geçmiş bir süre maskeleniyordu: öğrenciye yalnız kurum/bölüm/dönem
  // dönüyor, ders eşleştirmelerinin kendisi düşüyordu. Ekran akademisyendeki
  // gibi görünüp içi boş geliyordu. Sistem sahibi bunu tersine çevirdi:
  // öğrenci gideceği üniversitede hangi dersin neye sayıldığını görmeden
  // eşleştirme yapamıyor. Silme yetkisi akademisyende kalır — o, yazma
  // kapsamıyla korunuyor (tests/ogrenci-yazma-kapsami.test.js).
  const baskasi = {
    id: 'h1',
    _docId: 'h1',
    studentNumber: '2021002',
    studentName: 'Mehmet Demir',
    hostInstitution: 'TU Berlin',
    departmentId: 'bilgisayar',
    semester: '2024-Güz',
    homeCourses: [{ code: 'BLM101', grade: 'AA' }],
    hostCourses: [{ code: 'CS101', grade: 'A' }],
    usedBy: [{ name: 'Ali Veli', semester: '2025-Bahar' }],
  };

  it('artık daraltan bir okuma kuralı yok', () => {
    expect(ogrenciOkumaKurali('trip_history')).toBeNull();
  });

  it('başkasının kaydı ders eşleştirmeleriyle birlikte görünür', () => {
    const kural = ogrenciOkumaKurali('trip_history');
    const g = ogrenciKaydi(baskasi, kural, BEN);
    expect(g).toBe(baskasi);
    expect(g.homeCourses).toHaveLength(1);
    expect(g.hostCourses).toHaveLength(1);
    expect(g.usedBy).toHaveLength(1);
  });

  it('kendi kaydı da olduğu gibi kalır', () => {
    const kural = ogrenciOkumaKurali('trip_history');
    const benim = { ...baskasi, studentNumber: '2021001' };
    expect(ogrenciKaydi(benim, kural, BEN)).toBe(benim);
  });

  it('liste süzgecinden de olduğu gibi geçer (rotanın çağırdığı yol)', () => {
    const kural = ogrenciOkumaKurali('trip_history');
    const liste = [baskasi, { ...baskasi, id: 'h2', studentNumber: '2021001' }];
    // Rota kuralı yoksa süzgeci hiç çağırmıyor; çağrılsa bile hiçbir satır
    // düşmemeli — ikisini birden kilitliyoruz.
    expect(kural).toBeNull();
    expect(ogrenciOkumasiSuz(liste, kural, { no: BEN.no, ad: BEN.ad })).toHaveLength(2);
  });

  it('kimlik alanları düşmediği için rotanın id üretimi sağlam', () => {
    const kural = ogrenciOkumaKurali('trip_history');
    const g = ogrenciKaydi(baskasi, kural, BEN);
    const { _id, _docId, ...rest } = g;
    expect(_docId || (_id && _id.toString()) || '').toBe('h1');
    expect(rest.hostInstitution).toBe('TU Berlin');
  });
});
