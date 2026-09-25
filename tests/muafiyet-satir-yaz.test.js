// "Onayladım ama geri onaya düştü" hatasının kuralı: karar yazarken diziyi
// değil SATIRI yaz. Diziyi geri yazmak kör yazmadır — okuma ile yazma
// arasında giren başka bir kararı siler.
import { describe, it, expect } from 'vitest';
import {
  kararSatiri,
  satirAlanYolu,
  satirYamasi,
  satirlarYamasi,
  satirYolu,
  satirYoluMu,
  sayaclar,
  yolIndeksi,
} from '../lib/muafiyet-satir-yaz.js';

describe('satır yolları', () => {
  it('indeks yola çevrilir', () => {
    expect(satirYolu(3)).toBe('matches.3');
    expect(satirYolu('0')).toBe('matches.0');
    expect(satirAlanYolu(2, 'adminDecision')).toBe('matches.2.adminDecision');
  });

  it('geçersiz indeks/alan yol üretmez', () => {
    expect(satirYolu(-1)).toBe('');
    expect(satirYolu('abc')).toBe('');
    expect(satirAlanYolu(2, '$where')).toBe('');
    expect(satirAlanYolu(2, 'a.b')).toBe('');
  });

  it('yama tek satır adresler', () => {
    expect(satirYamasi(1, { x: 1 })).toEqual({ 'matches.1': { x: 1 } });
    expect(satirYamasi(-1, {})).toBe(null);
  });
});

describe('satirYoluMu — sunucunun noktalı anahtar denetimi', () => {
  it('yalnız matches.<n> ve matches.<n>.<alan> kabul edilir', () => {
    expect(satirYoluMu('matches.0')).toBe(true);
    expect(satirYoluMu('matches.12.adminDecision')).toBe(true);
  });

  it('başka noktalı yol alan denetimini atlatamaz', () => {
    expect(satirYoluMu('status.x')).toBe(false);
    expect(satirYoluMu('matches.x')).toBe(false);
    expect(satirYoluMu('matches')).toBe(false);
    expect(satirYoluMu('matches.0.a.b')).toBe(false);
    expect(satirYoluMu('matches.0.$set')).toBe(false);
  });

  it('indeks okunur', () => {
    expect(yolIndeksi('matches.7.adminNote')).toBe(7);
    expect(yolIndeksi('status')).toBe(-1);
  });
});

describe('kararSatiri', () => {
  it('eski alanlar korunur, karar alanları yazılır', () => {
    const satir = kararSatiri(
      { localCourse: { code: 'BİL101' }, score: 0.8 },
      'confirmed',
      '',
      'Enis SERT',
      new Date('2026-09-25T10:00:00.000Z')
    );
    expect(satir.localCourse.code).toBe('BİL101');
    expect(satir.score).toBe(0.8);
    expect(satir.adminDecision).toBe('confirmed');
    expect(satir.adminDecidedBy).toBe('Enis SERT');
    expect(satir.adminUpdatedAt).toBe('2026-09-25T10:00:00.000Z');
  });
});

describe('sayaclar', () => {
  it('kararlar sayılır', () => {
    expect(
      sayaclar([
        { adminDecision: 'confirmed' },
        { adminDecision: 'rejected' },
        { tier: 'review' },
        null,
      ])
    ).toEqual({ pendingReviewCount: 1, approvedCount: 1, rejectedCount: 1 });
  });

  it('öğrencinin vazgeçtiği satır bekleyene sayılmaz', () => {
    expect(sayaclar([{ ogrenciVazgecti: true }]).pendingReviewCount).toBe(0);
  });

  it('boş girdi patlamaz', () => {
    expect(sayaclar(null)).toEqual({
      pendingReviewCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
    });
  });
});

describe('satirlarYamasi', () => {
  it('yalnız verilen satırlar yamaya girer', () => {
    expect(satirlarYamasi({ 0: { a: 1 }, 2: { a: 3 } })).toEqual({
      'matches.0': { a: 1 },
      'matches.2': { a: 3 },
    });
  });

  it('çift listesi de kabul edilir', () => {
    expect(satirlarYamasi([[1, { a: 2 }]])).toEqual({ 'matches.1': { a: 2 } });
  });

  it('değişen satır yoksa null döner (her şeyi yazma)', () => {
    expect(satirlarYamasi({})).toBeNull();
    expect(satirlarYamasi(null)).toBeNull();
  });

  it('geçersiz indeks ve boş satır atlanır', () => {
    expect(satirlarYamasi({ '-1': { a: 1 }, 0: null, 2: { a: 3 } })).toEqual({
      'matches.2': { a: 3 },
    });
  });
});

// ── HATANIN KENDİSİ: BAYAT DİZİ, VERİLMİŞ KARARI SİLİYOR ──
// Aşağıdaki iki senaryo MongoDB'nin yaptığını taklit eder: `matches` anahtarı
// diziyi tümden değiştirir, `matches.<n>` yalnız o elemanı.
function yaz(kayit, yama) {
  const yeni = { ...kayit, matches: (kayit.matches || []).slice() };
  Object.entries(yama).forEach(([anahtar, deger]) => {
    if (!anahtar.startsWith('matches.')) {
      yeni[anahtar] = deger;
      return;
    }
    const i = yolIndeksi(anahtar);
    const alan = anahtar.split('.')[2];
    if (alan) yeni.matches[i] = { ...(yeni.matches[i] || {}), [alan]: deger };
    else yeni.matches[i] = deger;
  });
  return yeni;
}

describe('iki cihaz aynı talepte karar veriyor', () => {
  const baslangic = () => ({
    matches: [
      { id: 'a', tier: 'review' },
      { id: 'b', tier: 'review' },
    ],
  });

  it('DİZİYİ yazmak, araya giren kararı siler (eski davranış)', () => {
    const kayit = baslangic();
    const telefonOkudu = kayit.matches.slice(); // telefon kaydı okudu
    // bilgisayar 2. satırı onayladı
    const sonra = yaz(kayit, {
      matches: [telefonOkudu[0], kararSatiri(telefonOkudu[1], 'confirmed', '', 'PC', new Date())],
    });
    // telefon kendi (BAYAT) dizisiyle 1. satırı yazıyor
    const bozuk = yaz(sonra, {
      matches: [
        kararSatiri(telefonOkudu[0], 'confirmed', '', 'Telefon', new Date()),
        telefonOkudu[1],
      ],
    });
    expect(bozuk.matches[1].adminDecision).toBeUndefined(); // ← karar kayboldu
  });

  it('SATIRI yazmak iki kararı da korur (yeni davranış)', () => {
    const kayit = baslangic();
    const telefonOkudu = kayit.matches.slice();
    const sonra = yaz(
      kayit,
      satirYamasi(1, kararSatiri(telefonOkudu[1], 'confirmed', '', 'PC', new Date()))
    );
    const son = yaz(
      sonra,
      satirYamasi(0, kararSatiri(telefonOkudu[0], 'confirmed', '', 'Telefon', new Date()))
    );
    expect(son.matches[0].adminDecision).toBe('confirmed');
    expect(son.matches[1].adminDecision).toBe('confirmed');
    expect(sayaclar(son.matches)).toEqual({
      pendingReviewCount: 0,
      approvedCount: 2,
      rejectedCount: 0,
    });
  });

  it('not eşlemesi de yalnız kendi satırlarını yazar', () => {
    const kayit = { matches: [{ id: 'a' }, { id: 'b' }] };
    const onayli = yaz(
      kayit,
      satirYamasi(1, kararSatiri(kayit.matches[1], 'confirmed', '', 'PC', new Date()))
    );
    // not eşlemesi yalnız 0. satırın karşılığını değiştirdi
    const son = yaz(onayli, satirlarYamasi({ 0: { ...onayli.matches[0], convertedGrade: 'BA' } }));
    expect(son.matches[0].convertedGrade).toBe('BA');
    expect(son.matches[1].adminDecision).toBe('confirmed');
  });
});

describe('yol biçimi kötüye kullanılamaz', () => {
  it('dilin kancaları alan adı sayılmaz', () => {
    expect(satirYoluMu('matches.3.__proto__')).toBe(false);
    expect(satirYoluMu('matches.3.constructor')).toBe(false);
    expect(satirYoluMu('matches.3.prototype')).toBe(false);
    expect(satirAlanYolu(3, '__proto__')).toBe('');
  });

  it('başka bir alanın noktalı yolu geçmez', () => {
    expect(satirYoluMu('status.x')).toBe(false);
    expect(satirYoluMu('matches')).toBe(false);
    expect(satirYoluMu('matches.a')).toBe(false);
    expect(satirYoluMu('matches.3.localCourse.code')).toBe(false);
  });

  it('satırın kendisi ve tek alanı geçer', () => {
    expect(satirYoluMu('matches.0')).toBe(true);
    expect(satirYoluMu('matches.12.adminDecision')).toBe(true);
  });
});

describe('sayaclar ve tier', () => {
  it('otomatik muaf/red satır akademisyeni bekletmez', () => {
    expect(sayaclar([{ tier: 'approved' }, { tier: 'rejected' }, { tier: 'review' }])).toEqual({
      pendingReviewCount: 1,
      approvedCount: 1,
      rejectedCount: 1,
    });
  });

  it("akademisyenin kararı tier'in üstündedir", () => {
    expect(sayaclar([{ tier: 'approved', adminDecision: 'rejected' }])).toEqual({
      pendingReviewCount: 0,
      approvedCount: 0,
      rejectedCount: 1,
    });
  });

  it('tier yoksa satır bekler (öğrenci formu)', () => {
    expect(sayaclar([{}]).pendingReviewCount).toBe(1);
  });
});
