import { describe, it, expect } from 'vitest';
import {
  HAFTA_SINIRI,
  VARSAYILAN_HAFTA,
  YOKLAMA_LISTE_ROWS,
  YOKLAMA_LISTE_STATIC,
  adSoyadAyir,
  cinsiyetSayimi,
  dersBasligi,
  devamListesiHTML,
  donemBasligi,
  durumIsareti,
  gunFarki,
  haftaAnahtari,
  haftaBasligi,
  haftaListesi,
  haftaSayisiDuzelt,
  listeKunyesi,
  listeSatirlari,
  listeVerisi,
  oturumHaftalari,
  oturumHaftasi,
} from '../lib/yoklama-listesi.js';

// ── Örnek belgeye (Java Devam Listesi) benzeyen küçük bir ders ──
const OGRENCILER = [
  { studentNumber: '260905001', firstName: 'Ayşe', lastName: 'Yılmaz', sinif: '1', cinsiyet: 'K' },
  { studentNumber: '260905002', firstName: 'Burak', lastName: 'Demir', sinif: '1', cinsiyet: 'E' },
  { studentNumber: '260905003', firstName: 'Cem', lastName: 'Kaya', sinif: '2' },
];
// Dönem 21 Eylül 2026 Pazartesi başlıyor; üç hafta yoklama alınmış (2. hafta yok).
const OTURUMLAR = [
  { id: 'o1', tarih: '2026-09-21', baslangic: '2026-09-21T09:00:00Z', acik: false },
  { id: 'o3', tarih: '2026-10-05', baslangic: '2026-10-05T09:00:00Z', acik: false },
  { id: 'o4', tarih: '2026-10-12', baslangic: '2026-10-12T09:00:00Z', acik: false },
];
const KAYITLAR = [
  { oturumId: 'o1', studentNumber: '260905001', durum: 'var' },
  { oturumId: 'o1', studentNumber: '260905002', durum: 'var' },
  { oturumId: 'o3', studentNumber: '260905001', durum: 'var' },
  { oturumId: 'o3', studentNumber: '260905003', durum: 'izinli' },
  { oturumId: 'o4', studentNumber: '260905001', durum: 'var' },
];
const GIRDI = {
  ogrenciler: OGRENCILER,
  oturumlar: OTURUMLAR,
  kayitlar: KAYITLAR,
  haftaSayisi: 15,
  donemBaslangici: '2026-09-21',
  limitSaat: 4,
  dersSaati: 2,
  akademikYil: '2026-2027',
  donem: 'guz',
  ders: { code: 'BİL111.1', name: 'Bilgisayar Programlama I', birlesikDers: 'BLM103' },
  ogretimUyesi: 'Dr. Öğr. Üyesi Esra Sivari',
  fakulteAd: 'Mühendislik Fakültesi',
  bolumAd: 'Bilgisayar Mühendisliği',
  tarih: '2026-10-13',
};

describe('haftaSayisiDuzelt', () => {
  it('boş/geçersiz değerde varsayılana düşer', () => {
    expect(haftaSayisiDuzelt('')).toBe(VARSAYILAN_HAFTA);
    expect(haftaSayisiDuzelt('abc')).toBe(VARSAYILAN_HAFTA);
    expect(haftaSayisiDuzelt(0)).toBe(VARSAYILAN_HAFTA);
    expect(haftaSayisiDuzelt(-3)).toBe(VARSAYILAN_HAFTA);
  });
  it('kendi varsayılanı verilebilir', () => {
    expect(haftaSayisiDuzelt('', 7)).toBe(7);
  });
  it('15 hafta sabit değil — 7 de 20 de kabul', () => {
    expect(haftaSayisiDuzelt(7)).toBe(7);
    expect(haftaSayisiDuzelt(20)).toBe(20);
  });
  it('sınırı aşan değer kırpılır', () => {
    expect(haftaSayisiDuzelt(99)).toBe(HAFTA_SINIRI);
  });
});

describe('hafta sütunları', () => {
  it('anahtar ve başlık örnek belgedeki yazımla', () => {
    expect(haftaAnahtari(3)).toBe('hafta3');
    expect(haftaBasligi(3)).toBe('3.Hafta');
  });
  it('liste istenen uzunlukta', () => {
    expect(haftaListesi(15)).toHaveLength(15);
    expect(haftaListesi(7)).toHaveLength(7);
    expect(haftaListesi(15)[14]).toEqual({ no: 15, anahtar: 'hafta15', baslik: '15.Hafta' });
  });
  it('sözlükte HAFTA_SINIRI kadar hafta değişkeni var', () => {
    const haftalar = YOKLAMA_LISTE_ROWS.filter((r) => /^hafta\d+$/.test(r.id));
    expect(haftalar).toHaveLength(HAFTA_SINIRI);
  });
});

describe('gunFarki / oturumHaftasi', () => {
  it('gün farkı ISO damgasında da çalışır', () => {
    expect(gunFarki('2026-09-21', '2026-09-28T13:00:00Z')).toBe(7);
    expect(gunFarki('2026-09-21', '2026-09-21')).toBe(0);
  });
  it('geçersiz tarihte null', () => {
    expect(gunFarki('', '2026-09-21')).toBe(null);
    expect(gunFarki('2026-09-21', 'yarın')).toBe(null);
  });
  it('hafta numarası 1 tabanlı', () => {
    expect(oturumHaftasi('2026-09-21', '2026-09-21', 15)).toBe(1);
    expect(oturumHaftasi('2026-09-27', '2026-09-21', 15)).toBe(1); // aynı hafta
    expect(oturumHaftasi('2026-09-28', '2026-09-21', 15)).toBe(2);
  });
  it('dönem dışındaki tarih sütun bulamaz', () => {
    expect(oturumHaftasi('2026-09-14', '2026-09-21', 15)).toBe(0); // başlangıçtan önce
    expect(oturumHaftasi('2027-03-01', '2026-09-21', 15)).toBe(0); // 15. haftadan sonra
  });
});

describe('oturumHaftalari', () => {
  it('başlangıç verilince takvim yolu — boş hafta atlanır', () => {
    const h = oturumHaftalari(OTURUMLAR, { donemBaslangici: '2026-09-21', haftaSayisi: 15 });
    expect(h.kaynak).toBe('tarih');
    expect(h.harita).toEqual({ o1: 1, o3: 3, o4: 4 });
    expect(h.disarida).toBe(0);
  });
  it('başlangıç yoksa sıra yolu — 1,2,3 diye numaralanır', () => {
    const h = oturumHaftalari(OTURUMLAR, { haftaSayisi: 15 });
    expect(h.kaynak).toBe('sira');
    expect(h.harita).toEqual({ o1: 1, o3: 2, o4: 3 });
  });
  it('sıra yolunda aynı gündeki iki oturum tek haftaya sayılır', () => {
    const h = oturumHaftalari(
      [
        { id: 'a', tarih: '2026-09-21', baslangic: '2026-09-21T09:00:00Z' },
        { id: 'b', tarih: '2026-09-21', baslangic: '2026-09-21T10:00:00Z' },
        { id: 'c', tarih: '2026-09-28', baslangic: '2026-09-28T09:00:00Z' },
      ],
      { haftaSayisi: 15 }
    );
    expect(h.harita).toEqual({ a: 1, b: 1, c: 2 });
  });
  it('sütuna sığmayan oturum sayılır, sessizce düşmez', () => {
    const h = oturumHaftalari(OTURUMLAR, { donemBaslangici: '2026-09-21', haftaSayisi: 2 });
    expect(h.disarida).toBe(2);
    expect(h.harita).toEqual({ o1: 1 });
  });
  it('kimliksiz kayıt yok sayılır', () => {
    expect(oturumHaftalari([null, {}, { tarih: '2026-09-21' }], {}).harita).toEqual({});
  });
});

describe('durumIsareti', () => {
  it('varsayılan işaretler', () => {
    expect(durumIsareti('var')).toBe('+');
    expect(durumIsareti('yok')).toBe('-');
    expect(durumIsareti('izinli')).toBe('İ');
    expect(durumIsareti('')).toBe('');
  });
  it('işaretler değiştirilebilir', () => {
    expect(durumIsareti('var', { var: '✓' })).toBe('✓');
  });
});

describe('başlıklar', () => {
  it('dönem başlığı örnek belgedeki cümle', () => {
    expect(donemBasligi('2026-2027', 'guz')).toBe('2026-2027 Yıl Güz Dönemi Ders Öğrenci Listesi');
    expect(donemBasligi('2026-2027', 'bahar')).toBe(
      '2026-2027 Yıl Bahar Dönemi Ders Öğrenci Listesi'
    );
  });
  it('ders başlığı birleştirilmiş dersi parantezle yazar', () => {
    expect(dersBasligi({ code: 'BİL111.1', name: 'Programlama', birlesikDers: 'BLM103' })).toBe(
      'BİL111.1 - Programlama (Birleştirilmiş Ders:BLM103)'
    );
    expect(dersBasligi({ code: 'BİL111.1', name: 'Programlama' })).toBe('BİL111.1 - Programlama');
  });
});

describe('cinsiyetSayimi', () => {
  it('bilinmeyenler ayrı sayılır, uydurulmaz', () => {
    const s = cinsiyetSayimi(OGRENCILER);
    expect(s).toMatchObject({ kadin: 1, erkek: 1, bilinmeyen: 1, metin: '1 / 1' });
  });
  it('farklı yazımlar tanınır', () => {
    const s = cinsiyetSayimi([{ cinsiyet: 'Kadın' }, { gender: 'female' }, { cinsiyet: 'erkek' }]);
    expect(s.kadin).toBe(2);
    expect(s.erkek).toBe(1);
  });
});

describe('bilinmeyen bilgi sütuna dönüşmez', () => {
  const cinsiyetsiz = OGRENCILER.map((o) => ({ ...o, cinsiyet: '' }));

  it('hiç cinsiyet bilinmiyorsa künye "0 / 0" YAZMAZ', () => {
    expect(cinsiyetSayimi(cinsiyetsiz).biliniyor).toBe(false);
    const k = listeKunyesi({ ...GIRDI, ogrenciler: cinsiyetsiz });
    expect(k.kadinErkek).toBe('');
    expect(k.kadinSayisi).toBe('');
    expect(k.erkekSayisi).toBe('');
  });

  it('yerleşik çıktıda kadın/erkek satırı hiç basılmaz', () => {
    const html = devamListesiHTML(listeVerisi({ ...GIRDI, ogrenciler: cinsiyetsiz }));
    expect(html).not.toContain('Kadın/Erkek');
    expect(html).not.toContain('0 / 0');
  });

  it('sınır yoksa "Devam" sütunu hiç çıkmaz', () => {
    const v = listeVerisi({ ...GIRDI, limitSaat: 0 });
    expect(v.devamSutunu).toBe(false);
    const html = devamListesiHTML(v);
    expect(html).not.toContain('>Devam<');
    // Sabit sütunlar 5'e düşer; hafta sütunları değişmez.
    expect(html).toContain('<th colspan="15">HAFTALAR</th>');
  });

  it('sınır varsa "Devam" sütunu geri gelir', () => {
    const v = listeVerisi(GIRDI);
    expect(v.devamSutunu).toBe(true);
    expect(devamListesiHTML(v)).toContain('>Devam<');
  });

  it('öğrencisiz listede sütun sayısı başlıklarla tutarlı', () => {
    const html = devamListesiHTML(listeVerisi({ ...GIRDI, ogrenciler: [], limitSaat: 0 }));
    expect(html).toContain('colspan="20"'); // 5 sabit + 15 hafta
  });
});

describe('adSoyadAyir', () => {
  it('ayrı alanlar korunur', () => {
    expect(adSoyadAyir({ firstName: 'Ayşe', lastName: 'Yılmaz' })).toEqual({
      ad: 'Ayşe',
      soyad: 'Yılmaz',
    });
  });
  it('tek alandan son kelime soyad sayılır', () => {
    expect(adSoyadAyir({ adSoyad: 'Ali Can Öz' })).toEqual({ ad: 'Ali Can', soyad: 'Öz' });
  });
  it('boş kayıt patlamaz', () => {
    expect(adSoyadAyir(null)).toEqual({ ad: '', soyad: '' });
  });
});

describe('listeSatirlari', () => {
  const satirlar = listeSatirlari(GIRDI);

  it('her öğrenci bir satır, sıra 1 tabanlı', () => {
    expect(satirlar).toHaveLength(3);
    expect(satirlar.map((s) => s.sira)).toEqual([1, 2, 3]);
  });

  it('hafta hücreleri oturum tarihine denk gelir', () => {
    const ayse = satirlar[0];
    expect(ayse.hafta1).toBe('+');
    expect(ayse.hafta2).toBe(''); // o hafta yoklama alınmadı → boş
    expect(ayse.hafta3).toBe('+');
    expect(ayse.hafta4).toBe('+');
  });

  it('yoklama alınan haftada katılmayan öğrenci "-" alır', () => {
    const burak = satirlar[1];
    expect(burak.hafta1).toBe('+');
    expect(burak.hafta3).toBe('-');
    expect(burak.hafta4).toBe('-');
  });

  it('izinli ayrı işaretlenir ama devamsızlığa yazılmaz', () => {
    const cem = satirlar[2];
    expect(cem.hafta3).toBe('İ');
    expect(cem.katildigiHafta).toBe(1);
  });

  it('devamsızlık saati ders saatiyle çarpılır', () => {
    // 3 yoklama açıldı; Burak 1'ine katıldı → 2 × 2 saat
    expect(satirlar[1].devamsizlikSaati).toBe(4);
    expect(satirlar[1].kalanHak).toBe(0);
    // Hak TAM dolduğunda henüz aşılmış sayılmaz (lib/yoklama.js kuralı).
    expect(satirlar[1].devam).toBe('Var');
    expect(satirlar[0].devam).toBe('Var');
  });

  it('hak aşılınca Devam sütunu "Yok" olur', () => {
    const s = listeSatirlari({ ...GIRDI, limitSaat: 3 });
    expect(s[1].devam).toBe('Yok'); // 4 saat devamsızlık > 3 saat hak
    expect(s[0].devam).toBe('Var');
  });

  it('sınır girilmemişse Devam kararı VERİLMEZ', () => {
    const s = listeSatirlari({ ...GIRDI, limitSaat: 0 });
    expect(s.every((x) => x.devam === '')).toBe(true);
    expect(s.every((x) => x.kalanHak === '')).toBe(true);
  });

  it('hafta sayısı değişince sütun sayısı da değişir', () => {
    const s7 = listeSatirlari({ ...GIRDI, haftaSayisi: 7 })[0];
    expect(s7.hafta7).toBeDefined();
    expect(s7.hafta8).toBeUndefined();
  });

  it('açık oturum devamsızlığa sayılmaz', () => {
    const acikli = listeSatirlari({
      ...GIRDI,
      oturumlar: [...OTURUMLAR, { id: 'o5', tarih: '2026-10-19', acik: true }],
    });
    expect(acikli[1].devamsizlikSaati).toBe(4); // değişmedi
  });

  it('bir haftada iki oturum varsa birine katılmak yeter', () => {
    const s = listeSatirlari({
      ...GIRDI,
      oturumlar: [
        { id: 'o1', tarih: '2026-09-21', acik: false },
        { id: 'o2', tarih: '2026-09-22', acik: false },
      ],
      kayitlar: [{ oturumId: 'o2', studentNumber: '260905002', durum: 'var' }],
    });
    expect(s[1].hafta1).toBe('+');
  });

  it('boş girdi patlamaz', () => {
    expect(listeSatirlari({})).toEqual([]);
    expect(listeSatirlari(null)).toEqual([]);
  });
});

describe('listeKunyesi', () => {
  const k = listeKunyesi(GIRDI);
  it('örnek belgedeki künye alanlarını doldurur', () => {
    expect(k.baslik).toBe('2026-2027 Yıl Güz Dönemi Ders Öğrenci Listesi');
    expect(k.dersKodAd).toBe('BİL111.1 - Bilgisayar Programlama I (Birleştirilmiş Ders:BLM103)');
    expect(k.fakulteAd).toBe('Mühendislik Fakültesi');
    expect(k.kadinErkek).toBe('1 / 1');
    expect(k.ogrenciSayisi).toBe(3);
    expect(k.haftaSayisi).toBe(15);
    expect(k.alinanYoklama).toBe(3);
  });
  it('tarih uzun Türkçe biçimde', () => {
    expect(k.tarih).toBe('13 Ekim 2026 Salı');
  });
  it('kurum adı varsayılanı var', () => {
    expect(k.kurumAd).toBe('Çankırı Karatekin Üniversitesi');
    expect(listeKunyesi({ kurumAd: 'X Üniversitesi' }).kurumAd).toBe('X Üniversitesi');
  });
});

describe('listeVerisi', () => {
  it('künye, satır ve sütunları birlikte verir', () => {
    const v = listeVerisi(GIRDI);
    expect(v.rows).toHaveLength(3);
    expect(v.haftalar).toHaveLength(15);
    expect(v.haftaKaynagi).toBe('tarih');
    expect(v.uyarilar).toEqual([]);
  });
  it('dönem başlangıcı yoksa uyarır (sessizce yaklaşık yapmaz)', () => {
    const v = listeVerisi({ ...GIRDI, donemBaslangici: '' });
    expect(v.haftaKaynagi).toBe('sira');
    expect(v.uyarilar.join(' ')).toMatch(/Dönem başlangıç tarihi girilmedi/);
  });
  it('sütuna sığmayan yoklamayı söyler', () => {
    const v = listeVerisi({ ...GIRDI, haftaSayisi: 2 });
    expect(v.uyarilar.join(' ')).toMatch(/hafta sütunlarının dışında/);
  });
  it('sınır yoksa Devam sütununun boş kaldığını söyler', () => {
    const v = listeVerisi({ ...GIRDI, limitSaat: 0 });
    expect(v.uyarilar.join(' ')).toMatch(/Devamsızlık sınırı girilmedi/);
  });
});

describe('devamListesiHTML', () => {
  const html = devamListesiHTML(listeVerisi(GIRDI));
  it('başlık ve künye yer alır', () => {
    expect(html).toContain('2026-2027 Yıl Güz Dönemi Ders Öğrenci Listesi');
    expect(html).toContain('Ders Kodu ve Adı');
    expect(html).toContain('Mühendislik Fakültesi');
  });
  it('HAFTALAR başlığı sütunları kapsar', () => {
    expect(html).toContain('<th colspan="15">HAFTALAR</th>');
    expect(html).toContain('15.Hafta');
  });
  it('öğrenci satırları basılır', () => {
    expect(html).toContain('260905001');
    expect(html).toContain('Yılmaz');
  });
  it('kaçış yapılır — ders adındaki < > etiket olmaz', () => {
    const kotu = devamListesiHTML(listeVerisi({ ...GIRDI, ders: { code: '<script>', name: 'x' } }));
    expect(kotu).not.toContain('<script>');
    expect(kotu).toContain('&lt;script&gt;');
  });
  it('öğrencisiz ders için bile geçerli belge üretir', () => {
    const bos = devamListesiHTML(listeVerisi({ ...GIRDI, ogrenciler: [] }));
    expect(bos).toContain('kayıtlı öğrenci bulunamadı');
  });
});

describe('değişken sözlüğü', () => {
  it('künye ve satır değişkenleri gerçekten üretiliyor', () => {
    const v = listeVerisi(GIRDI);
    YOKLAMA_LISTE_STATIC.forEach((d) => {
      expect(Object.prototype.hasOwnProperty.call(v.staticData, d.id)).toBe(true);
    });
    const satir = v.rows[0];
    YOKLAMA_LISTE_ROWS.filter((d) => !/^hafta\d+$/.test(d.id)).forEach((d) => {
      expect(Object.prototype.hasOwnProperty.call(satir, d.id)).toBe(true);
    });
  });
  it('her değişkenin etiketi var ve id benzersiz', () => {
    const hepsi = [...YOKLAMA_LISTE_STATIC, ...YOKLAMA_LISTE_ROWS];
    hepsi.forEach((d) => expect(d.label.length).toBeGreaterThan(0));
    expect(new Set(hepsi.map((d) => d.id)).size).toBe(hepsi.length);
  });
});
