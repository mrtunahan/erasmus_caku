/**
 * UÇTAN UCA: "arkadaşımın hesabına girip yoklama verdim" saldırısı.
 *
 * Buradaki `imzala`, server/routes/yoklama.js'teki /imzala ucunun karar
 * sırasını birebir tekrarlar (kod doğrulama → oturum içi tekillik → hesaba
 * bağlı cihaz) ve GERÇEK kural dosyalarını çağırır. Böylece saldırı
 * senaryoları tek tek birim testlerine değil, akışın tamamına sorulur:
 * sıralama bozulursa (ör. cihaz kontrolü kayıt yazıldıktan sonraya kayarsa)
 * birim testleri geçmeye devam eder, bu dosya düşer.
 */
import { describe, it, expect } from 'vitest';
import * as Y from '../lib/yoklama.js';
import * as C from '../lib/cihaz-kimlik.js';

const SIRR = 'oturuma-ozel-gizli';
const OTURUM = 'yk-test';
const DONEM = '2026-guz';
const T = 1_800_000_000_000;

const kod = (t = T) => Y.anlikKod(SIRR, OTURUM, t, Y.ADIM_MS);
const bosDb = () => ({ kayitlar: [], cihazlar: {} });
const TELEFON_A = { id: 'ch-A', iz: 'iz-A' };
const TELEFON_B = { id: 'ch-B', iz: 'iz-B' };

function imzala(db, { ogrNo, kod: ham, cihaz, simdi = T }) {
  const sonuc = Y.kodDogrula(ham, { sirr: SIRR, oturumId: OTURUM, simdi });
  if (!sonuc.gecerli) return { ok: false, sebep: sonuc.sebep };

  if (db.kayitlar.some((k) => k.studentNumber === ogrNo)) return { ok: true, zaten: true };

  const cakisma = C.oturumdaBaskasiKullandiMi(db.kayitlar, cihaz, ogrNo);
  if (cakisma.cakisma) return { ok: false, sebep: 'cihaz_paylasimi', kurban: cakisma.ogrenciNo };

  const kayit = db.cihazlar[ogrNo] || null;
  const karar = C.baglamaKarari(kayit, cihaz, { donem: DONEM });
  if (karar.durum === 'kilitli') return { ok: false, sebep: 'cihaz_kilitli' };
  if (karar.baglanacak) db.cihazlar[ogrNo] = C.baglamaYamasi(kayit, cihaz, karar, { donem: DONEM });

  db.kayitlar.push({
    studentNumber: ogrNo,
    cihazId: cihaz.id,
    cihazIz: cihaz.iz,
    yeniCihaz: karar.durum === 'degisti',
    durum: 'var',
  });
  return { ok: true, durum: karar.durum, kalanHak: karar.kalanHak };
}

describe("saldırı: B, A'nın hesabına girip okutur", () => {
  it('B önce kendi yoklamasını verdiyse A adına ikinci okutma engellenir', () => {
    const db = bosDb();
    expect(imzala(db, { ogrNo: 'B', kod: kod(), cihaz: TELEFON_B }).ok).toBe(true);
    const r = imzala(db, { ogrNo: 'A', kod: kod(), cihaz: TELEFON_B });
    expect(r.ok).toBe(false);
    expect(r.sebep).toBe('cihaz_paylasimi');
    expect(r.kurban).toBe('B');
    expect(db.kayitlar).toHaveLength(1);
  });

  // Kimlik tarayıcıda saklanıyor; silinebilir. Parmak izi silinemez.
  it('çerez silmek / gizli sekme açmak kontrolü atlatmaz', () => {
    const db = bosDb();
    imzala(db, { ogrNo: 'B', kod: kod(), cihaz: TELEFON_B });
    const r = imzala(db, { ogrNo: 'A', kod: kod(), cihaz: { id: 'ch-YENI', iz: 'iz-B' } });
    expect(r.sebep).toBe('cihaz_paylasimi');
  });

  // ⚠ Sıranın tersi de işe yaramaz ve ceza saldırganın kendisine döner:
  // önce arkadaşı için okutan öğrenci KENDİ yoklamasını veremez.
  it('önce A adına okutan B kendi yoklamasını veremez', () => {
    const db = bosDb();
    expect(imzala(db, { ogrNo: 'A', kod: kod(), cihaz: TELEFON_B }).ok).toBe(true);
    expect(imzala(db, { ogrNo: 'B', kod: kod(), cihaz: TELEFON_B }).sebep).toBe('cihaz_paylasimi');
  });

  it('A kendi telefonuna bağlıysa başka cihazdan gelen yoklama işaretlenir', () => {
    const db = bosDb();
    db.cihazlar.A = {
      cihazId: TELEFON_A.id,
      cihazIz: TELEFON_A.iz,
      donem: DONEM,
      degisimSayisi: 0,
    };
    const r = imzala(db, { ogrNo: 'A', kod: kod(), cihaz: TELEFON_B });
    expect(r.ok).toBe(true);
    expect(r.durum).toBe('degisti');
    expect(db.kayitlar[0].yeniCihaz).toBe(true);
    expect(db.cihazlar.A.degisimSayisi).toBe(1);
  });
});

describe('kota ve kurtarma', () => {
  it('kota tükenince kilitlenir', () => {
    const db = bosDb();
    db.cihazlar.A = {
      cihazId: 'ch-X',
      cihazIz: 'iz-X',
      donem: DONEM,
      degisimSayisi: C.DEGISIM_KOTASI,
    };
    expect(imzala(db, { ogrNo: 'A', kod: kod(), cihaz: TELEFON_B }).sebep).toBe('cihaz_kilitli');
  });

  // ⚠ Bir kez tükenen hak öğrenciyi mezun olana kadar kilitleyemez.
  it('yeni dönemde hak tazelenir', () => {
    const db = bosDb();
    db.cihazlar.A = { cihazId: 'ch-X', cihazIz: 'iz-X', donem: '2025-bahar', degisimSayisi: 9 };
    expect(imzala(db, { ogrNo: 'A', kod: kod(), cihaz: TELEFON_B }).ok).toBe(true);
  });

  // Akademisyenin sıfırlaması (POST /api/yoklama/cihaz-sifirla) kaydı boşaltır.
  it('sıfırlanan kayıttan sonra yeni cihaz temiz bağlanır', () => {
    const db = bosDb();
    db.cihazlar.A = { cihazId: '', cihazIz: '', donem: DONEM, degisimSayisi: 0 };
    const r = imzala(db, { ogrNo: 'A', kod: kod(), cihaz: TELEFON_B });
    expect(r.durum).toBe('yeni');
    expect(db.kayitlar[0].yeniCihaz).toBe(false);
  });
});

describe('meşru akış bozulmuyor', () => {
  it('iki öğrenci kendi telefonlarından sorunsuz verir', () => {
    const db = bosDb();
    expect(imzala(db, { ogrNo: 'A', kod: kod(), cihaz: TELEFON_A }).ok).toBe(true);
    expect(imzala(db, { ogrNo: 'B', kod: kod(), cihaz: TELEFON_B }).ok).toBe(true);
    expect(db.kayitlar.every((k) => !k.yeniCihaz)).toBe(true);
  });

  it('aynı öğrencinin ikinci okutması "zaten alındı" der', () => {
    const db = bosDb();
    imzala(db, { ogrNo: 'A', kod: kod(), cihaz: TELEFON_A });
    expect(imzala(db, { ogrNo: 'A', kod: kod(), cihaz: TELEFON_A }).zaten).toBe(true);
  });

  // ⚠ Sinyal toplanamayan tarayıcıda öğrenci yoklamasız kalmamalı.
  it('cihaz sinyali yoksa yoklama yine alınır', () => {
    const db = bosDb();
    const r = imzala(db, { ogrNo: 'A', kod: kod(), cihaz: { id: '', iz: '' } });
    expect(r.ok).toBe(true);
    expect(r.durum).toBe('bilinmiyor');
  });

  // Cihaz kontrolü kodun kendisini GEÇERSİZ kılmaz: sıralama korunmalı.
  it('eskimiş kod cihaz kontrolüne hiç gelmeden reddedilir', () => {
    const db = bosDb();
    const r = imzala(db, { ogrNo: 'A', kod: kod(), cihaz: TELEFON_A, simdi: T + 60_000 });
    expect(r.sebep).toBe('eskimis');
    expect(db.cihazlar.A).toBeUndefined();
  });
});
