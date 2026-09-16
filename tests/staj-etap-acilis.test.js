import { describe, it, expect } from 'vitest';
import {
  KAYIT_KAPANIS_GUNU,
  acikEtaplar,
  acilisHatalari,
  acilisKapsamda,
  acilisKaydi,
  acilisOzeti,
  acilisYururlukteMi,
  acilislariSirala,
  etabaBasvurabilirMi,
  etapKayitDurumu,
  etkinAcilis,
  gunEkle,
  kayitDurumMetni,
  kayitSonTarihi,
  numaraAnahtari,
  numaralariCoz,
} from '../lib/staj-etap-acilis.js';

// Etap 01.07.2026'da başlıyor → kayıt son tarihi 21.06.2026.
const etap = { id: 'e1', label: '2026 Yaz I', baslangic: '2026-07-01', bitis: '2026-08-15' };
const ACIK = { simdi: '2026-06-10' }; // süre dolmadan
const DOLMUS = { simdi: '2026-06-25' }; // süre dolduktan sonra

const acilis = (ek) => ({
  periodId: 'e1',
  kapsam: 'ogrenci',
  ogrenciNolar: ['230905046'],
  gerekce: 'İşyeri son anda değişti, kabul yazısı geç ulaştı.',
  bitis: '2026-06-30',
  iptal: false,
  acanAd: 'ERGÜN ÇINAR',
  createdAt: '2026-06-24T09:00:00Z',
  ...(ek || {}),
});

describe('gunEkle / kayitSonTarihi', () => {
  it('gün ekler ve çıkarır', () => {
    expect(gunEkle('2026-07-01', -10)).toBe('2026-06-21');
    expect(gunEkle('2026-06-25', 5)).toBe('2026-06-30');
  });

  it('ay ve yıl sınırını geçer', () => {
    expect(gunEkle('2026-01-05', -10)).toBe('2025-12-26');
    expect(gunEkle('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('kayıt son tarihi başlangıçtan 10 gün öncedir', () => {
    expect(KAYIT_KAPANIS_GUNU).toBe(10);
    expect(kayitSonTarihi(etap)).toBe('2026-06-21');
  });

  it('kapanış günü ayarlanabilir', () => {
    expect(kayitSonTarihi(etap, 3)).toBe('2026-06-28');
  });

  it('tarihsiz etapta son tarih yoktur', () => {
    expect(kayitSonTarihi({ id: 'x' })).toBe('');
    expect(gunEkle('', -10)).toBe('');
  });
});

describe('numaralariCoz', () => {
  it('virgül, boşluk ve satır sonuyla ayrılmış listeyi çözer', () => {
    expect(numaralariCoz('230905046, 250905012\n260905003 240905007')).toEqual([
      '230905046',
      '250905012',
      '260905003',
      '240905007',
    ]);
  });

  it('yinelenenleri düşürür', () => {
    expect(numaralariCoz('230905046 230905046')).toEqual(['230905046']);
  });

  it('boş girdide boş liste', () => {
    expect(numaralariCoz('')).toEqual([]);
    expect(numaralariCoz(null)).toEqual([]);
    expect(numaralariCoz('   ,, ;; ')).toEqual([]);
  });

  it('numara anahtarı boşluğa duyarsızdır', () => {
    expect(numaraAnahtari(' 2309 05046 ')).toBe('230905046');
  });
});

// ⚠ Açılış bir İMZAdır: gerekçesiz, kapsamsız ya da süresiz açılış olmaz.
describe('acilisHatalari', () => {
  const saglam = {
    periodId: 'e1',
    kapsam: 'ogrenci',
    ogrenciNolar: '230905046',
    gerekce: 'Öğrencinin işyeri değişti, belgeler geç ulaştı.',
    bitis: '2026-06-30',
  };

  it('sağlam formda hata yok', () => {
    expect(acilisHatalari(saglam, DOLMUS)).toEqual([]);
  });

  it('gerekçe zorunludur', () => {
    expect(acilisHatalari({ ...saglam, gerekce: '' }, DOLMUS).join(' ')).toMatch(/gerekçe/i);
    expect(acilisHatalari({ ...saglam, gerekce: 'acil' }, DOLMUS).join(' ')).toMatch(/gerekçe/i);
  });

  it('öğrenci kapsamında en az bir numara gerekir', () => {
    expect(acilisHatalari({ ...saglam, ogrenciNolar: '' }, DOLMUS).join(' ')).toMatch(
      /en az bir öğrenci/i
    );
  });

  it('herkes kapsamında numara istenmez', () => {
    expect(acilisHatalari({ ...saglam, kapsam: 'herkes', ogrenciNolar: '' }, DOLMUS)).toEqual([]);
  });

  it('bitiş tarihi zorunlu ve geçmişte olamaz', () => {
    expect(acilisHatalari({ ...saglam, bitis: '' }, DOLMUS).join(' ')).toMatch(/bitiş/i);
    expect(acilisHatalari({ ...saglam, bitis: '2026-06-01' }, DOLMUS).join(' ')).toMatch(
      /geçmişte/i
    );
  });

  it('bitiş bugünse kabul edilir', () => {
    expect(acilisHatalari({ ...saglam, bitis: '2026-06-25' }, DOLMUS)).toEqual([]);
  });

  it('etap seçilmeden açılış olmaz', () => {
    expect(acilisHatalari({ ...saglam, periodId: '' }, DOLMUS).join(' ')).toMatch(/etap/i);
  });
});

describe('acilisKaydi', () => {
  it('kaydı kurar ve numaraları çözer', () => {
    const k = acilisKaydi(
      {
        periodId: 'e1',
        periodLabel: '2026 Yaz I',
        departmentId: 'bilgisayar',
        kapsam: 'ogrenci',
        ogrenciNolar: '230905046, 250905012',
        gerekce: 'Sağlık raporu nedeniyle süresinde başvuramadı.',
        bitis: '2026-06-30',
      },
      { simdi: '2026-06-25T10:00:00Z', acanAd: 'ERGÜN ÇINAR', acanRol: 'staj_yetkilisi' }
    );
    expect(k.ogrenciNolar).toEqual(['230905046', '250905012']);
    expect(k.iptal).toBe(false);
    expect(k.acanAd).toBe('ERGÜN ÇINAR');
    expect(k.createdAt).toBe('2026-06-25T10:00:00Z');
  });

  it('herkes kapsamında numara listesi boşalır', () => {
    const k = acilisKaydi(
      {
        periodId: 'e1',
        kapsam: 'herkes',
        ogrenciNolar: '230905046',
        gerekce: 'Sistem hatası nedeniyle etap listede görünmedi.',
        bitis: '2026-06-30',
      },
      DOLMUS
    );
    expect(k.kapsam).toBe('herkes');
    expect(k.ogrenciNolar).toEqual([]);
  });

  it('hatalı formda kayıt üretilmez', () => {
    expect(acilisKaydi({ periodId: 'e1', gerekce: '', bitis: '' }, DOLMUS)).toBe(null);
  });
});

describe('acilisKapsamda / acilisYururlukteMi', () => {
  it('numarası listede olan öğrenciyi kapsar', () => {
    expect(acilisKapsamda(acilis(), '230905046')).toBe(true);
    expect(acilisKapsamda(acilis(), '250905099')).toBe(false);
  });

  it('herkes kapsamı numara sormaz', () => {
    expect(acilisKapsamda(acilis({ kapsam: 'herkes' }), 'her ne olursa')).toBe(true);
    expect(acilisKapsamda(acilis({ kapsam: 'herkes' }), '')).toBe(true);
  });

  it('boşluklu numara da eşleşir', () => {
    expect(acilisKapsamda(acilis(), ' 2309 05046 ')).toBe(true);
  });

  it('iptal edilen açılış yürürlükte değildir', () => {
    expect(acilisYururlukteMi(acilis({ iptal: true }), DOLMUS)).toBe(false);
  });

  it('bitiş tarihi geçince yürürlükten kalkar', () => {
    expect(acilisYururlukteMi(acilis(), { simdi: '2026-06-30' })).toBe(true);
    expect(acilisYururlukteMi(acilis(), { simdi: '2026-07-01' })).toBe(false);
  });

  it('bitişsiz kayıt geçersizdir — süresiz kapı olmaz', () => {
    expect(acilisYururlukteMi(acilis({ bitis: '' }), DOLMUS)).toBe(false);
  });
});

describe('etkinAcilis', () => {
  it('en uzun süre tanıyan açılışı seçer', () => {
    const liste = [acilis({ bitis: '2026-06-27' }), acilis({ bitis: '2026-06-30' })];
    expect(etkinAcilis(liste, 'e1', '230905046', DOLMUS).bitis).toBe('2026-06-30');
  });

  it('başka etabın açılışı sayılmaz', () => {
    expect(etkinAcilis([acilis({ periodId: 'e2' })], 'e1', '230905046', DOLMUS)).toBe(null);
  });

  it('kapsam dışı öğrenciye açılış yok', () => {
    expect(etkinAcilis([acilis()], 'e1', '999999999', DOLMUS)).toBe(null);
  });
});

// ── ASIL KURAL ──
describe('etapKayitDurumu', () => {
  it('süre dolmadan kapı açıktır', () => {
    const d = etapKayitDurumu(etap, ACIK);
    expect(d.acik).toBe(true);
    expect(d.sebep).toBe('acik');
    expect(d.sonTarih).toBe('2026-06-21');
  });

  it('son tarih GÜNÜ kapalıdır — 10 günlük pencere komisyon içindir', () => {
    expect(etapKayitDurumu(etap, { simdi: '2026-06-20' }).acik).toBe(true);
    expect(etapKayitDurumu(etap, { simdi: '2026-06-21' }).acik).toBe(false);
  });

  it('süre dolunca kapanır', () => {
    const d = etapKayitDurumu(etap, DOLMUS);
    expect(d.acik).toBe(false);
    expect(d.sebep).toBe('suresi-doldu');
  });

  it('acil durum açılışı kapıyı yalnız kapsamdaki öğrenciye açar', () => {
    const s = { ...DOLMUS, acilislar: [acilis()] };
    const kapsamda = etapKayitDurumu(etap, { ...s, ogrenciNo: '230905046' });
    expect(kapsamda.acik).toBe(true);
    expect(kapsamda.sebep).toBe('acil-acilis');
    expect(kapsamda.acilis.gerekce).toMatch(/şyeri son anda değişti/);

    const disarda = etapKayitDurumu(etap, { ...s, ogrenciNo: '250905099' });
    expect(disarda.acik).toBe(false);
  });

  it('herkes kapsamlı açılış etabı tüm öğrencilere açar', () => {
    const s = { ...DOLMUS, acilislar: [acilis({ kapsam: 'herkes' })], ogrenciNo: '250905099' };
    expect(etapKayitDurumu(etap, s).acik).toBe(true);
  });

  it('açılış etabın tarihlerini DEĞİŞTİRMEZ', () => {
    const s = { ...DOLMUS, acilislar: [acilis()], ogrenciNo: '230905046' };
    const d = etapKayitDurumu(etap, s);
    expect(d.sonTarih).toBe('2026-06-21'); // olağan son tarih yerinde
    expect(etap.baslangic).toBe('2026-07-01');
  });

  it('açılışın süresi dolunca kapı yeniden kapanır', () => {
    const s = { simdi: '2026-07-02', acilislar: [acilis()], ogrenciNo: '230905046' };
    expect(etapKayitDurumu(etap, s).acik).toBe(false);
  });

  it('iptal edilen açılış kapıyı açmaz', () => {
    const s = { ...DOLMUS, acilislar: [acilis({ iptal: true })], ogrenciNo: '230905046' };
    expect(etapKayitDurumu(etap, s).acik).toBe(false);
  });

  it('öğrencinin mevcut başvurusunun etabı her zaman açıktır', () => {
    const d = etapKayitDurumu(etap, { ...DOLMUS, mevcutBasvuruEtapId: 'e1' });
    expect(d.acik).toBe(true);
    expect(d.sebep).toBe('mevcut-basvuru');
  });

  it('tarihsiz etap açık sayılır — eski kayıtlar kilitlenmesin', () => {
    const d = etapKayitDurumu({ id: 'x', label: 'Eski' }, DOLMUS);
    expect(d.acik).toBe(true);
    expect(d.sebep).toBe('tarihsiz');
  });
});

describe('etabaBasvurabilirMi', () => {
  it('açık etaba başvurulur', () => {
    expect(etabaBasvurabilirMi(etap, ACIK).olur).toBe(true);
  });

  it('aynı etaba ikinci başvuru olmaz', () => {
    const r = etabaBasvurabilirMi(etap, {
      ...ACIK,
      mevcutBasvurular: [{ stajEtapId: 'e1' }],
    });
    expect(r.olur).toBe(false);
    expect(r.sebep).toBe('zaten-basvurdu');
  });

  it('süresi dolmuş etaba başvurulmaz', () => {
    expect(etabaBasvurabilirMi(etap, DOLMUS).olur).toBe(false);
  });

  it('açılış varsa süresi dolmuş etaba başvurulur', () => {
    const r = etabaBasvurabilirMi(etap, {
      ...DOLMUS,
      acilislar: [acilis()],
      ogrenciNo: '230905046',
    });
    expect(r.olur).toBe(true);
    expect(r.sebep).toBe('acil-acilis');
  });
});

describe('acikEtaplar', () => {
  const etaplar = [
    etap,
    { id: 'e2', label: 'Uzak', baslangic: '2026-09-01', bitis: '2026-10-01' },
    { id: 'e3', label: 'Geçmiş', baslangic: '2026-01-01', bitis: '2026-02-01' },
  ];

  it('yalnız kapısı açık etapları verir', () => {
    expect(acikEtaplar(etaplar, DOLMUS).map((e) => e.id)).toEqual(['e2']);
  });

  it('açılış yapılan etap listeye geri gelir', () => {
    const ids = acikEtaplar(etaplar, {
      ...DOLMUS,
      acilislar: [acilis()],
      ogrenciNo: '230905046',
    }).map((e) => e.id);
    expect(ids).toEqual(['e1', 'e2']);
  });
});

describe('metinler', () => {
  it('kapalı kapı ne yapılacağını söyler', () => {
    const m = kayitDurumMetni(etapKayitDurumu(etap, DOLMUS));
    expect(m).toMatch(/2026-06-21/);
    expect(m).toMatch(/staj yetkilisiyle görüşün/i);
  });

  it('açılan kapı kimin açtığını ve süresini söyler', () => {
    const d = etapKayitDurumu(etap, {
      ...DOLMUS,
      acilislar: [acilis()],
      ogrenciNo: '230905046',
    });
    const m = kayitDurumMetni(d);
    expect(m).toMatch(/ERGÜN ÇINAR/);
    expect(m).toMatch(/2026-06-30/);
  });

  it('açılış özeti kapsamı ve süreyi yazar', () => {
    expect(acilisOzeti(acilis())).toMatch(/1 öğrenciye/);
    expect(acilisOzeti(acilis({ kapsam: 'herkes' }))).toMatch(/herkese/);
  });
});

describe('acilislariSirala', () => {
  it('yürürlükte olanlar önce gelir', () => {
    const liste = [
      acilis({ bitis: '2026-06-22', createdAt: '2026-06-21T00:00:00Z' }), // süresi dolmuş
      acilis({ bitis: '2026-06-30', createdAt: '2026-06-24T00:00:00Z' }), // yürürlükte
    ];
    const s = acilislariSirala(liste, DOLMUS);
    expect(s[0].yururlukte).toBe(true);
    expect(s[1].yururlukte).toBe(false);
  });

  it('iptal edilen kayıt listede kalır — iz silinmez', () => {
    const s = acilislariSirala([acilis({ iptal: true })], DOLMUS);
    expect(s).toHaveLength(1);
    expect(s[0].yururlukte).toBe(false);
  });
});
