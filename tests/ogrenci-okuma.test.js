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
      'trip_history',
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

describe('Erasmus geçmişi — satır kalır, kimlik düşer', () => {
  const kural = ogrenciOkumaKurali('trip_history');
  const baskasi = {
    id: 'h1',
    studentNumber: '2021002',
    studentName: 'Mehmet Demir',
    hostInstitution: 'TU Berlin',
    departmentId: 'bilgisayar',
    semester: '2024-Güz',
    homeCourses: [{ code: 'BLM101', grade: 'AA' }],
  };

  it('kurum listesi çalışmaya devam eder', () => {
    const m = ogrenciKaydi(baskasi, kural, BEN);
    expect(m.hostInstitution).toBe('TU Berlin');
    expect(m.departmentId).toBe('bilgisayar');
    expect(m.id).toBe('h1');
  });

  it('ad, numara ve dersler/notlar düşer', () => {
    const m = ogrenciKaydi(baskasi, kural, BEN);
    expect(m.studentName).toBeUndefined();
    expect(m.studentNumber).toBeUndefined();
    expect(m.homeCourses).toBeUndefined();
  });

  it('kendi kaydı olduğu gibi kalır', () => {
    const benim = { ...baskasi, studentNumber: '2021001' };
    expect(ogrenciKaydi(benim, kural, BEN)).toBe(benim);
  });
});

describe('liste süzme', () => {
  it('görünmeyen kayıtlar listeden düşer', () => {
    const kural = ogrenciOkumaKurali('student_notifications');
    const liste = [
      { studentNumber: '2021001', title: 'Muafiyet reddedildi' },
      { studentNumber: '2021002', title: 'Başkasının bildirimi' },
      null,
    ];
    const sonuc = ogrenciOkumasiSuz(liste, kural, BEN);
    expect(sonuc).toHaveLength(1);
    expect(sonuc[0].title).toBe('Muafiyet reddedildi');
  });

  it('kural yoksa liste dokunulmaz', () => {
    const liste = [{ a: 1 }];
    expect(ogrenciOkumasiSuz(liste, null, BEN)).toBe(liste);
  });
});

describe('çift numaralı ÇAP öğrencisi', () => {
  // İkinci programın kayıtları AYRI numaranın altındadır; ikisi de kendisidir.
  const capBen = { no: ['2021001', '2021555'], ad: 'Ayşe Yılmaz', bolum: 'bilgisayar' };

  it('her iki numaranın kaydı da görünür', () => {
    const kural = ogrenciOkumaKurali('muafiyet_history');
    expect(ogrenciKaydi({ studentNo: '2021001' }, kural, capBen)).toBeTruthy();
    expect(ogrenciKaydi({ studentNo: '2021555' }, kural, capBen)).toBeTruthy();
    expect(ogrenciKaydi({ studentNo: '2021002' }, kural, capBen)).toBeNull();
  });

  it('bildirimlerde de aynı kapsam geçerli', () => {
    const kural = ogrenciOkumaKurali('notifications');
    expect(
      ogrenciKaydi({ recipientType: 'user', recipientId: '2021555' }, kural, capBen)
    ).toBeTruthy();
  });
});
