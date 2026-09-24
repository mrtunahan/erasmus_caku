// Sunucunun (server/routes/db.js) uyguladığı SIRA burada sabitlenir:
//   1) izin  → reddedilen satır var mı
//   2) yeniden kur → gelen dizi doğrudan yazılmaz, mevcut kayıttan kurulur
//   3) sayaçlar → istemciden ALINMAZ, hesaplanır
// Sıra bozulursa (ör. önce yazıp sonra izne bakmak) birim testler geçse bile
// öğrenci onaylanmış satırı değiştirebilir hâle gelirdi.
import { describe, it, expect } from 'vitest';
import { ogrenciDuzenleyebilirMi, sayaclar, yenidenGonderim } from '../lib/muafiyet-yeniden.js';

/** db.js'teki karar akışının birebir kopyası. */
function sunucuIsle(mevcutKayit, gelenVeri) {
  const karar = ogrenciDuzenleyebilirMi(mevcutKayit);
  if (!karar.izin) return { durum: 403, hata: karar.neden };
  const sonuc = yenidenGonderim(mevcutKayit.matches, gelenVeri.matches, new Date());
  if (sonuc.hata) return { durum: 400, hata: sonuc.hata };
  return { durum: 200, veri: Object.assign({ matches: sonuc.matches }, sayaclar(sonuc.matches)) };
}

const ONAYLI = {
  adminDecision: 'confirmed',
  localCourse: { code: 'BİL101' },
  sourceCourse: { code: 'CS101', grade: 'AA' },
};
const RED = {
  adminDecision: 'rejected',
  adminNote: 'uyuşmuyor',
  localCourse: { code: 'MAT101' },
  sourceCourse: { code: 'M1', grade: 'BB' },
};

describe('sunucu: öğrenci yeniden gönderimi', () => {
  it('tüm dersler onaylıysa istek 403 ile döner', () => {
    const cevap = sunucuIsle({ matches: [ONAYLI] }, { matches: [{ localCourse: { code: 'X' } }] });
    expect(cevap.durum).toBe(403);
    expect(cevap.hata).toMatch(/kapandı/);
  });

  it('karar bekleyen varken 403', () => {
    const cevap = sunucuIsle({ matches: [{ tier: 'review' }] }, { matches: [{}] });
    expect(cevap.durum).toBe(403);
  });

  it('onaylanmış satıra yapılan müdahale SESSİZCE DÜŞER, istek reddedilmez', () => {
    const cevap = sunucuIsle(
      { matches: [ONAYLI, RED] },
      {
        matches: [
          { localCourse: { code: 'SAHTE' }, adminDecision: 'confirmed' },
          { localCourse: { code: 'MAT102' } },
        ],
      }
    );
    expect(cevap.durum).toBe(200);
    expect(cevap.veri.matches[0].localCourse.code).toBe('BİL101');
    expect(cevap.veri.matches[1].localCourse.code).toBe('MAT102');
  });

  it('öğrenci kendi satırını ONAYLAYAMAZ — karar alanları temizlenir', () => {
    const cevap = sunucuIsle(
      { matches: [RED] },
      { matches: [{ localCourse: { code: 'MAT102' }, adminDecision: 'confirmed' }] }
    );
    expect(cevap.veri.matches[0].adminDecision).toBeUndefined();
    expect(cevap.veri.approvedCount).toBe(0);
    expect(cevap.veri.pendingReviewCount).toBe(1);
  });

  it('sayaçlar istemciden ALINMAZ', () => {
    const cevap = sunucuIsle(
      { matches: [ONAYLI, RED] },
      {
        matches: [{}, { localCourse: { code: 'MAT102' } }],
        approvedCount: 99,
        pendingReviewCount: 0,
      }
    );
    expect(cevap.veri.approvedCount).toBe(1);
    expect(cevap.veri.pendingReviewCount).toBe(1);
  });

  it('değişiklik olmayan istek 400', () => {
    expect(sunucuIsle({ matches: [ONAYLI, RED] }, { matches: [{}, {}] }).durum).toBe(400);
  });

  it('yaz intibakı da aynı yoldan geçer (tür ayrımı yok)', () => {
    const cevap = sunucuIsle(
      { basvuruTuru: 'intibak', stage: 'on_inceleme', matches: [RED] },
      { matches: [{ localCourse: { code: 'MAT102' } }] }
    );
    expect(cevap.durum).toBe(200);
  });
});
