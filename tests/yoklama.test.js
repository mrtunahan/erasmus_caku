import { describe, it, expect } from 'vitest';
import {
  ADIM_MS,
  birimdeDeger,
  hakMetni,
  limitBirimi,
  limitSaate,
  TOLERANS_MS,
  anlikKod,
  devamsizlikDurumu,
  devamsizlikMetni,
  devamsizlikRengi,
  dogrulamaMesaji,
  duzeltilmisZaman,
  kalanOran,
  kodCoz,
  kodDogrula,
  oturumKayitlari,
  satirlariSirala,
  yoklamaKodu,
  yoklamaOzeti,
  yoklamaSatirlari,
  zamanDilimi,
} from '../lib/yoklama.js';

const SIRR = 'oturuma-ozel-gizli-anahtar';
const OTURUM = 'yk-2026-abc';
const T0 = 1_800_000_000_000; // ADIM_MS'in tam katı

describe('zamanDilimi', () => {
  it('adım boyunca aynı dilim', () => {
    expect(zamanDilimi(T0, ADIM_MS)).toBe(zamanDilimi(T0 + ADIM_MS - 1, ADIM_MS));
  });

  it('adım dolunca dilim ilerler', () => {
    expect(zamanDilimi(T0 + ADIM_MS, ADIM_MS)).toBe(zamanDilimi(T0, ADIM_MS) + 1);
  });

  it('geçersiz girdide çökmez', () => {
    expect(Number.isFinite(zamanDilimi(NaN, ADIM_MS))).toBe(true);
  });
});

describe('yoklamaKodu', () => {
  it('biçim: oturum.dilim.imza', () => {
    const k = yoklamaKodu(SIRR, OTURUM, 1234);
    expect(k.split('.')).toHaveLength(3);
    expect(k.startsWith(OTURUM + '.1234.')).toBe(true);
  });

  // Kodun DÖNMESİ bu modülün varlık sebebi: aynı kod iki dilimde
  // çıkıyorsa fotoğrafı çekilen kod sonsuza dek geçerli olurdu.
  it('dilim değişince kod değişir', () => {
    expect(yoklamaKodu(SIRR, OTURUM, 1)).not.toBe(yoklamaKodu(SIRR, OTURUM, 2));
  });

  it('gizli anahtar değişince kod değişir', () => {
    expect(yoklamaKodu(SIRR, OTURUM, 1)).not.toBe(yoklamaKodu('baska', OTURUM, 1));
  });

  it('aynı girdi aynı kodu verir — sunucu ve ekran aynı sonucu bulmalı', () => {
    expect(yoklamaKodu(SIRR, OTURUM, 99)).toBe(yoklamaKodu(SIRR, OTURUM, 99));
  });

  it('anlikKod o anın dilimini kullanır', () => {
    expect(anlikKod(SIRR, OTURUM, T0, ADIM_MS)).toBe(
      yoklamaKodu(SIRR, OTURUM, zamanDilimi(T0, ADIM_MS))
    );
  });
});

describe('kodCoz', () => {
  it('geçerli kodu ayırır', () => {
    expect(kodCoz('abc.42.deadbeef')).toEqual({ oturumId: 'abc', dilim: 42, imza: 'deadbeef' });
  });

  // Kamera tarayıcısı sınıftaki başka bir karekodu (menü, afiş) okuyabilir.
  it('yabancı karekodu eler', () => {
    expect(kodCoz('https://ornek.com')).toBe(null);
    expect(kodCoz('a.b.c')).toBe(null);
    expect(kodCoz('abc.42')).toBe(null);
    expect(kodCoz('abc.42.zzz!')).toBe(null);
    expect(kodCoz('')).toBe(null);
    expect(kodCoz(null)).toBe(null);
  });
});

describe('kodDogrula', () => {
  const kod = anlikKod(SIRR, OTURUM, T0, ADIM_MS);
  const temel = { sirr: SIRR, oturumId: OTURUM, adim: ADIM_MS, tolerans: TOLERANS_MS };

  it('taze kod geçerli', () => {
    expect(kodDogrula(kod, { ...temel, simdi: T0 }).gecerli).toBe(true);
  });

  it('tolerans içinde hâlâ geçerli', () => {
    expect(kodDogrula(kod, { ...temel, simdi: T0 + TOLERANS_MS - 1 }).gecerli).toBe(true);
  });

  // ⚠ ASIL SENARYO: kodun fotoğrafı WhatsApp'tan gönderiliyor. Sekiz saniye
  // sonra okutulan kod geçersizdir.
  it('tolerans dolunca reddedilir', () => {
    const r = kodDogrula(kod, { ...temel, simdi: T0 + TOLERANS_MS });
    expect(r.gecerli).toBe(false);
    expect(r.sebep).toBe('eskimis');
  });

  it('bir dakika sonra kesinlikle reddedilir', () => {
    expect(kodDogrula(kod, { ...temel, simdi: T0 + 60_000 }).sebep).toBe('eskimis');
  });

  it('imzası kurcalanmış kod reddedilir', () => {
    const bozuk = kod.slice(0, -1) + (kod.endsWith('a') ? 'b' : 'a');
    expect(kodDogrula(bozuk, { ...temel, simdi: T0 }).sebep).toBe('imza');
  });

  // Öğrenci kendi oturum numarasını yazıp imzayı taklit edemez.
  it('başka gizli anahtarla üretilen kod reddedilir', () => {
    const sahte = anlikKod('tahmin-edilen-sirr', OTURUM, T0, ADIM_MS);
    expect(kodDogrula(sahte, { ...temel, simdi: T0 }).sebep).toBe('imza');
  });

  it('başka dersin kodu reddedilir', () => {
    const baska = anlikKod(SIRR, 'yk-baska-ders', T0, ADIM_MS);
    expect(kodDogrula(baska, { ...temel, simdi: T0 }).sebep).toBe('baska_oturum');
  });

  it('saati geride olan telefon ayrı sebeple ayrılır', () => {
    const ileri = anlikKod(SIRR, OTURUM, T0 + 60_000, ADIM_MS);
    expect(kodDogrula(ileri, { ...temel, simdi: T0 }).sebep).toBe('gelecek');
  });

  it('bozuk biçim reddedilir', () => {
    expect(kodDogrula('merhaba', { ...temel, simdi: T0 }).sebep).toBe('bicim');
  });

  it('her sebebin öğrenciye yazılacak bir karşılığı var', () => {
    [
      'bicim',
      'baska_oturum',
      'eskimis',
      'gelecek',
      'imza',
      'kapali',
      'kayitli_degil',
      'zaten',
    ].forEach((s) => expect(dogrulamaMesaji(s).length).toBeGreaterThan(10));
    expect(dogrulamaMesaji('bilinmeyen')).toBe('Yoklama alınamadı.');
  });
});

describe('duzeltilmisZaman', () => {
  // Hocanın bilgisayarı 20 saniye ileriyse düzeltme olmadan sınıftaki hiç
  // kimse yoklama veremez.
  it('sunucu ile arasındaki farkı ekler', () => {
    expect(duzeltilmisZaman(T0, -20_000)).toBe(T0 - 20_000);
  });

  it('fark bilinmiyorsa yerel zaman', () => {
    expect(duzeltilmisZaman(T0, undefined)).toBe(T0);
  });

  it('düzeltilmiş saatle üretilen kod sunucuda geçerlidir', () => {
    const hocaninSaati = T0 + 25_000; // 25 saniye ileri
    const fark = -25_000;
    const kod = anlikKod(SIRR, OTURUM, duzeltilmisZaman(hocaninSaati, fark), ADIM_MS);
    expect(kodDogrula(kod, { sirr: SIRR, oturumId: OTURUM, simdi: T0 }).gecerli).toBe(true);
  });
});

describe('kalanOran', () => {
  it('dilim başında 1, sonunda 0a yaklaşır', () => {
    expect(kalanOran(T0, ADIM_MS)).toBe(1);
    expect(kalanOran(T0 + ADIM_MS / 2, ADIM_MS)).toBeCloseTo(0.5, 5);
  });

  it('0 ile 1 arasında kalır', () => {
    for (let i = 0; i < 20; i++) {
      const o = kalanOran(T0 + i * 731, ADIM_MS);
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThanOrEqual(1);
    }
  });
});

describe('devamsizlikDurumu', () => {
  // Dönem başında hiç yoklama yokken "12 saat devamsızlık" yazmak öğrenciyi
  // boş yere korkutur.
  it('henüz yoklama yoksa devamsızlık yok', () => {
    const d = devamsizlikDurumu({ acilanYoklama: 0, katildigi: 0, limitSaat: 12, dersSaati: 3 });
    expect(d.kacirilanSaat).toBe(0);
    expect(d.kalanHak).toBe(12);
    expect(d.durum).toBe('guvenli');
    expect(devamsizlikMetni(d)).toMatch(/henüz yoklama alınmadı/i);
  });

  it('kaçırılan ders saatle çarpılır', () => {
    const d = devamsizlikDurumu({ acilanYoklama: 5, katildigi: 3, limitSaat: 12, dersSaati: 3 });
    expect(d.kacirilan).toBe(2);
    expect(d.kacirilanSaat).toBe(6);
    expect(d.kalanHak).toBe(6);
  });

  it('sınır aşılınca kaldı', () => {
    const d = devamsizlikDurumu({ acilanYoklama: 6, katildigi: 1, limitSaat: 12, dersSaati: 3 });
    expect(d.asildi).toBe(true);
    expect(d.durum).toBe('kaldi');
    expect(d.kalanHak).toBe(0);
    expect(devamsizlikMetni(d)).toMatch(/aşıldı/);
  });

  it('hakkın dörtte biri kalınca riskli', () => {
    const d = devamsizlikDurumu({ acilanYoklama: 4, katildigi: 1, limitSaat: 12, dersSaati: 3 });
    expect(d.kalanHak).toBe(3);
    expect(d.durum).toBe('riskli');
  });

  it('sınır belirlenmemişse kalma kararı verilmez', () => {
    const d = devamsizlikDurumu({ acilanYoklama: 10, katildigi: 0, limitSaat: 0, dersSaati: 2 });
    expect(d.asildi).toBe(false);
    expect(d.durum).toBe('guvenli');
    expect(devamsizlikMetni(d)).toMatch(/sınır belirlenmemiş/);
  });

  // Bozuk veri (katıldığı > açılan) devamsızlığı NEGATİF gösterirdi.
  it('katıldığı açılandan fazla olamaz', () => {
    const d = devamsizlikDurumu({ acilanYoklama: 3, katildigi: 9, limitSaat: 6, dersSaati: 1 });
    expect(d.kacirilan).toBe(0);
    expect(d.kalanHak).toBe(6);
  });

  it('boş girdide çökmez', () => {
    expect(devamsizlikDurumu(null).durum).toBe('guvenli');
  });

  it('renkler duruma göre', () => {
    expect(devamsizlikRengi('kaldi')).toBe('#DC2626');
    expect(devamsizlikRengi('riskli')).toBe('#D97706');
    expect(devamsizlikRengi('guvenli')).toBe('#059669');
  });
});

describe('yoklamaSatirlari', () => {
  const ogrenciler = [
    { studentNumber: '111', firstName: 'Zeynep', lastName: 'Ak' },
    { studentNumber: '222', firstName: 'Ali', lastName: 'Can' },
    { studentNumber: '333', firstName: 'Çağla', lastName: 'Bal' },
  ];

  it('okutan var, okutmayan yok', () => {
    const s = yoklamaSatirlari(ogrenciler, [{ studentNumber: '222' }]);
    expect(s.map((x) => x.durum)).toEqual(['yok', 'var', 'yok']);
    expect(s[1].okuttu).toBe(true);
  });

  // Telefonu bozuk öğrenci yüzünden yoklama tutulamaz olmamalı.
  it('akademisyenin elle işareti sistemin üstündedir', () => {
    const s = yoklamaSatirlari(ogrenciler, [{ studentNumber: '222' }], { 111: 'var', 222: 'yok' });
    expect(s[0].durum).toBe('var');
    expect(s[0].elle).toBe(true);
    expect(s[1].durum).toBe('yok');
  });

  // Akademisyen, kayıtlı olmayan bir cihazdan gelen yoklamayı listede
  // görmeli: "arkadaşımın telefonundan verdim" tam olarak böyle görünür.
  it('yeni cihaz işareti satıra taşınır', () => {
    const s = yoklamaSatirlari(ogrenciler, [{ studentNumber: '222', yeniCihaz: true }]);
    expect(s[1].yeniCihaz).toBe(true);
    expect(s[0].yeniCihaz).toBe(false);
  });

  it('adı olmayan satır numarayla görünür', () => {
    expect(yoklamaSatirlari([{ studentNumber: '999' }], [])[0].ad).toBe('999');
  });

  it('boş girdide boş liste', () => {
    expect(yoklamaSatirlari(null, null)).toEqual([]);
  });

  it('özet sayar', () => {
    const s = yoklamaSatirlari(ogrenciler, [{ studentNumber: '222' }]);
    expect(yoklamaOzeti(s)).toMatchObject({ toplam: 3, var: 1, yok: 2 });
  });

  // "Ç" harfi ASCII sıralamada en sona düşer.
  it('Türkçe sıralama', () => {
    const s = satirlariSirala(yoklamaSatirlari(ogrenciler, []));
    expect(s.map((x) => x.ad)).toEqual(['Ali Can', 'Çağla Bal', 'Zeynep Ak']);
  });

  it('yok olanlar üste alınabilir', () => {
    const s = satirlariSirala(yoklamaSatirlari(ogrenciler, [{ studentNumber: '111' }]), true);
    expect(s[0].durum).toBe('yok');
    expect(s[s.length - 1].durum).toBe('var');
  });
});

describe('oturumKayitlari', () => {
  it('her satır için dersin bilgisiyle kayıt üretir', () => {
    const k = oturumKayitlari(
      { id: 'o1', dersId: 'c1', dersAdi: 'Veri Yapıları', tarih: '2026-03-04', dersSaati: 3 },
      [
        { ogrenciNo: '111', durum: 'var' },
        { ogrenciNo: '222', durum: 'yok', elle: true },
      ]
    );
    expect(k).toHaveLength(2);
    expect(k[0]).toMatchObject({
      oturumId: 'o1',
      dersId: 'c1',
      studentNumber: '111',
      durum: 'var',
    });
    expect(k[1].elle).toBe(true);
  });

  it('ders saati verilmezse 1', () => {
    expect(oturumKayitlari({ id: 'o' }, [{ ogrenciNo: '1', durum: 'var' }])[0].dersSaati).toBe(1);
  });
});

// ── SINIR: SAAT Mİ, HAFTA MI? ──
// Hocaların çoğu hafta sayar ("üç hafta gelmeyen kalır"); çeviriyi onlara
// bırakmak sessiz hata üretiyordu (2 saatlik derse "3" yazan hoca üç HAFTA
// sandığı hakkı üç SAATE indiriyordu).
describe('devamsızlık sınırının birimi', () => {
  it('hafta, ders saatiyle çarpılarak saate çevrilir', () => {
    expect(limitSaate(3, 'hafta', 2)).toBe(6);
    expect(limitSaate(3, 'hafta', 1)).toBe(3);
  });

  it('saat olduğu gibi kalır', () => {
    expect(limitSaate(6, 'saat', 2)).toBe(6);
  });

  it('tanınmayan birim saat sayılır (eski kayıtlar)', () => {
    expect(limitBirimi('')).toBe('saat');
    expect(limitBirimi('gün')).toBe('saat');
    expect(limitBirimi('hafta')).toBe('hafta');
    expect(limitSaate(6, undefined, 2)).toBe(6);
  });

  it('boş sınır 0 kalır — "sınır yok" demektir', () => {
    expect(limitSaate('', 'hafta', 2)).toBe(0);
    expect(limitSaate(0, 'saat', 2)).toBe(0);
  });

  it('saat değeri seçilen birimde geri yazılır', () => {
    expect(birimdeDeger(6, 'hafta', 2)).toBe(3);
    expect(birimdeDeger(6, 'saat', 2)).toBe(6);
    // Blok derste tek saat kaçırmak yarım haftadır; yuvarlanmaz, yazılır.
    expect(birimdeDeger(3, 'hafta', 2)).toBe(1.5);
  });

  it('ekran cümlesi hocanın birimiyle kurulur', () => {
    const d = devamsizlikDurumu({ acilanYoklama: 3, katildigi: 1, limitSaat: 6, dersSaati: 2 });
    expect(hakMetni(d, 'hafta', 2)).toBe('2 / 3 hafta');
    expect(hakMetni(d, 'saat', 2)).toBe('4 / 6 saat');
  });

  it('sınır yoksa yalnız devamsızlık yazılır', () => {
    const d = devamsizlikDurumu({ acilanYoklama: 2, katildigi: 0, limitSaat: 0, dersSaati: 2 });
    expect(hakMetni(d, 'hafta', 2)).toBe('2 hafta devamsızlık');
  });
});
