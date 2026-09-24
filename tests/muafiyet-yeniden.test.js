import { describe, it, expect } from 'vitest';
import {
  KARAR_ALANLARI,
  duzeltilebilirIndeksler,
  guvenliSatir,
  ogrenciDuzenleyebilirMi,
  satirDurumu,
  satirDuzeltilebilirMi,
  satirOzeti,
  sayaclar,
  talepKapandiMi,
  yenidenGonderim,
  yenidenGonderimOzeti,
} from '../lib/muafiyet-yeniden.js';

const ONAYLI = {
  adminDecision: 'confirmed',
  localCourse: { code: 'BİL101', name: 'Programlama', akts: 6 },
  sourceCourse: { code: 'CS101', name: 'Programming', akts: 6, grade: 'AA' },
};
const RED = {
  adminDecision: 'rejected',
  adminNote: 'İçerik uyuşmuyor',
  adminDecidedBy: 'Enis SERT',
  adminUpdatedAt: '2026-09-01T10:00:00.000Z',
  localCourse: { code: 'MAT101', name: 'Matematik', akts: 5 },
  sourceCourse: { code: 'M1', name: 'Math', akts: 5, grade: 'BB' },
};
const BEKLEYEN = {
  tier: 'review',
  localCourse: { code: 'FİZ101', name: 'Fizik', akts: 4 },
  sourceCourse: { code: 'P1', name: 'Physics', akts: 4 },
};
const SIMDI = new Date('2026-09-24T09:00:00.000Z');

describe('satirDurumu', () => {
  it('karar alanından okunur', () => {
    expect(satirDurumu(ONAYLI)).toBe('onayli');
    expect(satirDurumu(RED)).toBe('reddedildi');
    expect(satirDurumu(BEKLEYEN)).toBe('bekliyor');
    expect(satirDurumu(null)).toBe('bekliyor');
  });
});

describe('ogrenciDuzenleyebilirMi', () => {
  it('reddedilen ders varsa düzenleyebilir', () => {
    const k = { matches: [ONAYLI, RED] };
    expect(ogrenciDuzenleyebilirMi(k)).toMatchObject({ izin: true, sayi: 1 });
    expect(duzeltilebilirIndeksler(k)).toEqual([1]);
  });

  // Asıl kural: hepsi onaylıysa talep kapanır.
  it('tüm dersler onaylıysa düzenlenemez', () => {
    const k = { matches: [ONAYLI, ONAYLI] };
    const karar = ogrenciDuzenleyebilirMi(k);
    expect(karar.izin).toBe(false);
    expect(karar.neden).toMatch(/kapandı/);
    expect(talepKapandiMi(k)).toBe(true);
  });

  it('karar bekleyen varken düzenlenemez — akademisyen üzerinde çalışıyor', () => {
    const k = { matches: [ONAYLI, BEKLEYEN] };
    expect(ogrenciDuzenleyebilirMi(k).neden).toMatch(/karar/i);
    expect(talepKapandiMi(k)).toBe(false);
  });

  it('iptal edilmiş talep düzenlenemez', () => {
    expect(ogrenciDuzenleyebilirMi({ status: 'iptal', matches: [RED] }).izin).toBe(false);
  });

  it('vazgeçilen red satırı yeniden düzeltilemez', () => {
    const k = { matches: [{ ...RED, ogrenciVazgecti: true }] };
    expect(satirDuzeltilebilirMi(k.matches[0])).toBe(false);
    expect(talepKapandiMi(k)).toBe(true);
  });
});

describe('satirOzeti', () => {
  it('vazgeçilen satır ayrı sayılır', () => {
    const k = { matches: [ONAYLI, RED, BEKLEYEN, { ...RED, ogrenciVazgecti: true }] };
    expect(satirOzeti(k)).toEqual({
      toplam: 4,
      onayli: 1,
      reddedildi: 1,
      bekliyor: 1,
      vazgecilen: 1,
    });
  });
});

describe('guvenliSatir', () => {
  it('ONAYLI satır gelen veriyle DEĞİŞMEZ', () => {
    const sonuc = guvenliSatir(ONAYLI, { localCourse: { code: 'XXX' } }, SIMDI);
    expect(sonuc.degisti).toBe(false);
    expect(sonuc.satir).toBe(ONAYLI);
  });

  it('BEKLEYEN satır da değişmez', () => {
    expect(guvenliSatir(BEKLEYEN, { localCourse: { code: 'XXX' } }, SIMDI).satir).toBe(BEKLEYEN);
  });

  it('reddedilen satırın dersi değişir, karar alanları temizlenir', () => {
    const sonuc = guvenliSatir(
      RED,
      { localCourse: { code: 'MAT102', name: 'Matematik II' } },
      SIMDI
    );
    expect(sonuc.degisti).toBe(true);
    expect(sonuc.satir.localCourse.code).toBe('MAT102');
    KARAR_ALANLARI.forEach((a) => expect(sonuc.satir[a]).toBeUndefined());
    expect(sonuc.satir.tier).toBe('review');
  });

  it('NOT ALANLARINA DOKUNULAMAZ — öğrenci kendi notunu yazamaz', () => {
    const sonuc = guvenliSatir(
      RED,
      {
        localCourse: { code: 'MAT102' },
        sourceCourse: { code: 'M2', grade: 'AA', gradeHarf: 'AA' },
        convertedGrade: 'AA',
      },
      SIMDI
    );
    expect(sonuc.satir.sourceCourse.grade).toBe('BB');
    expect(sonuc.satir.sourceCourse.gradeHarf).toBeUndefined();
    expect(sonuc.satir.convertedGrade).toBeUndefined();
  });

  it('eski hâl ve reddin gerekçesi KAYITTA KALIR', () => {
    const sonuc = guvenliSatir(RED, { localCourse: { code: 'MAT102' } }, SIMDI);
    const iz = sonuc.satir.oncekiHaller[0];
    expect(iz.red.gerekce).toBe('İçerik uyuşmuyor');
    expect(iz.localCourse.code).toBe('MAT101');
    expect(iz.zaman).toBe(SIMDI.toISOString());
  });

  it('vazgeçme satırı SİLMEZ, işaretler', () => {
    const sonuc = guvenliSatir(RED, { ogrenciVazgecti: true }, SIMDI);
    expect(sonuc.degisti).toBe(true);
    expect(sonuc.satir.ogrenciVazgecti).toBe(true);
    expect(sonuc.satir.adminDecision).toBe('rejected');
    expect(sonuc.satir.adminNote).toBe('İçerik uyuşmuyor');
  });

  it('değişiklik yoksa satır aynı kalır', () => {
    expect(guvenliSatir(RED, { localCourse: { code: 'MAT101' } }, SIMDI).degisti).toBe(false);
  });
});

describe('yenidenGonderim', () => {
  const mevcut = [ONAYLI, RED, BEKLEYEN];

  it('yalnız reddedilen satır değişir', () => {
    const sonuc = yenidenGonderim(mevcut, [
      { localCourse: { code: 'HACK' } },
      { localCourse: { code: 'MAT102' } },
      { localCourse: { code: 'HACK2' } },
    ]);
    expect(sonuc.degisen).toBe(1);
    expect(sonuc.matches[0].localCourse.code).toBe('BİL101');
    expect(sonuc.matches[1].localCourse.code).toBe('MAT102');
    expect(sonuc.matches[2].localCourse.code).toBe('FİZ101');
  });

  it('SATIR EKLENEMEZ / SİLİNEMEZ — uzunluk mevcut kayıttan gelir', () => {
    const sonuc = yenidenGonderim(mevcut, [
      {},
      { localCourse: { code: 'MAT102' } },
      {},
      { localCourse: { code: 'YENİ' } },
    ]);
    expect(sonuc.matches).toHaveLength(3);
    const eksik = yenidenGonderim(mevcut, [{ localCourse: { code: 'MAT102' } }]);
    expect(eksik.matches).toHaveLength(3);
  });

  it('hiç değişiklik yoksa hata döner', () => {
    const sonuc = yenidenGonderim(mevcut, [{}, {}, {}]);
    expect(sonuc.hata).toMatch(/Değişiklik yok/);
    expect(sonuc.degisen).toBe(0);
  });

  it('boş girdi patlamaz', () => {
    expect(yenidenGonderim(null, null).matches).toEqual([]);
  });

  it('özet cümlesi', () => {
    expect(yenidenGonderimOzeti({ degisen: 2 })).toMatch(/2 ders/);
    expect(yenidenGonderimOzeti({ degisen: 0 })).toBe('');
  });
});

describe('sayaclar', () => {
  it('düzeltilen satır yeniden karar bekler', () => {
    const sonuc = yenidenGonderim([ONAYLI, RED], [{}, { localCourse: { code: 'MAT102' } }]);
    expect(sayaclar(sonuc.matches)).toEqual({
      pendingReviewCount: 1,
      approvedCount: 1,
      rejectedCount: 0,
      status: 'pending',
    });
  });

  it('vazgeçilen satır bekleyene sayılmaz', () => {
    const sonuc = yenidenGonderim([ONAYLI, RED], [{}, { ogrenciVazgecti: true }]);
    expect(sayaclar(sonuc.matches)).toMatchObject({
      pendingReviewCount: 0,
      approvedCount: 1,
      rejectedCount: 1,
      status: 'reviewed',
    });
  });
});
