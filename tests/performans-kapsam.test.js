import { describe, it, expect } from 'vitest';
import {
  bolumKapsamiCozuldu,
  fakulteKapsamiCozuldu,
  fakulteyeGirenAkademisyenler,
  gonderimAnahtari,
  gonderimDurumu,
  gonderimKaydi,
  gonderimOzetMetni,
  gonderimVarMi,
  gorunurAkademisyenler,
  kapsamBolumleri,
  kapsamOzetMetni,
  veriKapsami,
} from '../lib/performans-kapsam.js';

const AKAD = [
  { id: 'a1', ad: 'Ayşe', departmentId: 'bm', bolum: 'Bilgisayar Müh.', fakulte: 'Mühendislik' },
  { id: 'a2', ad: 'Bora', departmentId: 'bm', bolum: 'Bilgisayar Müh.', fakulte: 'Mühendislik' },
  { id: 'a3', ad: 'Cem', departmentId: 'mak', bolum: 'Makine Müh.', fakulte: 'Mühendislik' },
  { id: 'a4', ad: 'Derya', departmentId: 'fiz', bolum: 'Fizik', fakulte: 'Fen' },
];

// ⚠ ORG YAPISI: İstatistik bölümünün HİÇ akademisyen kaydı yok. Bölüm
// listesi akademisyenlerden türetilirse bu bölüm hiç görünmezdi.
const BOLUMLER = [
  { id: 'bm', ad: 'Bilgisayar Müh.', fakulteId: 'muh', fakulteAdi: 'Mühendislik' },
  { id: 'mak', ad: 'Makine Müh.', fakulteId: 'muh', fakulteAdi: 'Mühendislik' },
  { id: 'ist', ad: 'İstatistik', fakulteId: 'muh', fakulteAdi: 'Mühendislik' },
  { id: 'fiz', ad: 'Fizik', fakulteId: 'fen', fakulteAdi: 'Fen' },
];

const AKADEMISYEN = veriKapsami({ profil: AKAD[0], dept: false, faculty: false, uni: false });
const BOLUM_Y = veriKapsami({ profil: AKAD[0], dept: true, faculty: false, uni: false });
const FAKULTE_Y = veriKapsami({ profil: AKAD[0], dept: true, faculty: true, uni: false });
const UNI = veriKapsami({ profil: AKAD[0], dept: true, faculty: true, uni: true });
// Sistemde akademisyen kaydı OLMAYAN fakülte yetkilisi
const KAYITSIZ_FAK = veriKapsami({ profil: null, dept: true, faculty: true, uni: false });

describe('veriKapsami', () => {
  it('profilden bölüm ve fakülteyi alır', () => {
    expect(BOLUM_Y).toMatchObject({ kendi: 'a1', departmentId: 'bm', fakulte: 'Mühendislik' });
  });

  // ⚠ Kenar çubuğunda başka bölüme geçmek o bölümün verisini görme yetkisi
  // vermez; kapsam kendi kaydından gelir.
  it('gezinilen bölüm kapsamı GENİŞLETMEZ', () => {
    const k = veriKapsami({ profil: AKAD[0], departmentId: 'mak', dept: true });
    expect(k.departmentId).toBe('bm');
  });

  it('profil yoksa oturumdaki bölüm kullanılır', () => {
    expect(veriKapsami({ profil: null, departmentId: 'mak', dept: true }).departmentId).toBe('mak');
  });

  it('boş girdide çökmez', () => {
    expect(veriKapsami(null).kendi).toBe('');
  });
});

describe('kapsam çözüldü mü', () => {
  it('bölüm ve fakülte ayrı ayrı', () => {
    expect(bolumKapsamiCozuldu(BOLUM_Y)).toBe(true);
    expect(fakulteKapsamiCozuldu(FAKULTE_Y)).toBe(true);
  });

  // Kayıtsız fakülte yetkilisinin fakültesi bilinmiyor.
  it('kayıt yoksa fakülte kapsamı çözülmez', () => {
    expect(fakulteKapsamiCozuldu(KAYITSIZ_FAK)).toBe(false);
  });

  it('üniversite yetkilisinde her ikisi de çözülü sayılır', () => {
    expect(fakulteKapsamiCozuldu(UNI)).toBe(true);
    expect(bolumKapsamiCozuldu(UNI)).toBe(true);
  });
});

describe('gorunurAkademisyenler', () => {
  it('akademisyen yalnız kendini görür', () => {
    expect(gorunurAkademisyenler(AKAD, AKADEMISYEN, 'own').map((a) => a.id)).toEqual(['a1']);
  });

  it('bölüm yetkilisi yalnız kendi bölümünü görür', () => {
    expect(gorunurAkademisyenler(AKAD, BOLUM_Y, 'dept').map((a) => a.id)).toEqual(['a1', 'a2']);
  });

  it('fakülte yetkilisi yalnız kendi fakültesini görür', () => {
    expect(gorunurAkademisyenler(AKAD, FAKULTE_Y, 'faculty').map((a) => a.id)).toEqual([
      'a1',
      'a2',
      'a3',
    ]);
  });

  it('üniversite yetkilisi hepsini görür', () => {
    expect(gorunurAkademisyenler(AKAD, UNI, 'faculty')).toHaveLength(4);
  });

  // ⚠ ESKİ DAVRANIŞ: fakülte çözülemeyince listedeki İLK fakülteye düşülüyor
  // ve başka fakültenin verisi gösteriliyordu.
  it('kapsam çözülemezse BOŞ liste döner, hepsi değil', () => {
    expect(gorunurAkademisyenler(AKAD, KAYITSIZ_FAK, 'faculty')).toEqual([]);
  });

  it('akademisyen kaydı yoksa kendi görünümü de boştur', () => {
    expect(gorunurAkademisyenler(AKAD, KAYITSIZ_FAK, 'own')).toEqual([]);
  });

  it('bilinmeyen görünümde boş', () => {
    expect(gorunurAkademisyenler(AKAD, UNI, 'saçma')).toEqual([]);
  });

  it('boş listede çökmez', () => {
    expect(gorunurAkademisyenler(null, BOLUM_Y, 'dept')).toEqual([]);
  });
});

describe('kapsamBolumleri', () => {
  // ⚠ ASIL HATA: akademisyen kaydı olmayan bölüm listede hiç görünmüyordu;
  // "bölüm yok" ile "bölümde veri yok" birbirine karışıyordu.
  it('akademisyeni olmayan bölüm de listede durur', () => {
    const b = kapsamBolumleri(BOLUMLER, FAKULTE_Y);
    expect(b.map((x) => x.id)).toEqual(['bm', 'ist', 'mak']);
    // Akademisyen listesinden türetilseydi 'ist' hiç çıkmazdı.
    expect([...new Set(AKAD.map((a) => a.departmentId))]).not.toContain('ist');
  });

  it('bölüm yetkilisi yalnız kendi bölümünü görür', () => {
    expect(kapsamBolumleri(BOLUMLER, BOLUM_Y).map((x) => x.id)).toEqual(['bm']);
  });

  it('üniversite yetkilisi hepsini görür', () => {
    expect(kapsamBolumleri(BOLUMLER, UNI)).toHaveLength(4);
  });

  it('fakülte kimliği yoksa ada göre eşleşir', () => {
    const adla = BOLUMLER.map((b) => ({ ...b, fakulteId: '' }));
    expect(kapsamBolumleri(adla, FAKULTE_Y).map((x) => x.id)).toEqual(['bm', 'ist', 'mak']);
  });

  it('kapsam çözülemezse boş', () => {
    expect(kapsamBolumleri(BOLUMLER, KAYITSIZ_FAK)).toEqual([]);
  });

  it('Türkçe ada göre sıralı', () => {
    expect(kapsamBolumleri(BOLUMLER, UNI).map((x) => x.ad)).toEqual([
      'Bilgisayar Müh.',
      'Fizik',
      'İstatistik',
      'Makine Müh.',
    ]);
  });

  it('boş girdide çökmez', () => {
    expect(kapsamBolumleri(null, UNI)).toEqual([]);
  });
});

describe('gönderim', () => {
  const GONDERIMLER = [
    { id: gonderimAnahtari('bm', 2026), bolumId: 'bm', yil: '2026', gonderenAd: 'Ayşe' },
  ];

  it('anahtar bölüm ve yıldan üretilir', () => {
    expect(gonderimAnahtari('bm', 2026)).toBe('bolum_bm_2026');
  });

  it('gönderim varlığı sorgulanır', () => {
    expect(gonderimVarMi(GONDERIMLER, 'bm', 2026)).toBe(true);
    expect(gonderimVarMi(GONDERIMLER, 'mak', 2026)).toBe(false);
  });

  // Başka YILIN gönderimi bu yılı kapsamaz.
  it('yıl farklıysa gönderim sayılmaz', () => {
    expect(gonderimVarMi(GONDERIMLER, 'bm', 2025)).toBe(false);
  });

  it('kayıt geri okunabilir', () => {
    expect(gonderimKaydi(GONDERIMLER, 'bm', 2026).gonderenAd).toBe('Ayşe');
    expect(gonderimKaydi(GONDERIMLER, 'mak', 2026)).toBe(null);
  });

  // ⚠ ASIL KURAL: göndermemiş bölüm fakülte toplamına GİRMEZ.
  it('fakülte toplamına yalnız gönderen bölümler girer', () => {
    expect(
      fakulteyeGirenAkademisyenler(AKAD, FAKULTE_Y, GONDERIMLER, 2026).map((a) => a.id)
    ).toEqual(['a1', 'a2']);
  });

  it('hiç gönderim yoksa toplam boştur', () => {
    expect(fakulteyeGirenAkademisyenler(AKAD, FAKULTE_Y, [], 2026)).toEqual([]);
  });

  // Akademisyeni olmayan bölüm de "bekleyen" sayılır: fakülte yetkilisi o
  // bölümün eksik olduğunu görmeli.
  it('durum gönderen ve bekleyeni ayırır', () => {
    const d = gonderimDurumu(BOLUMLER, FAKULTE_Y, GONDERIMLER, 2026);
    expect(d.toplam).toBe(3);
    expect(d.gonderen.map((b) => b.id)).toEqual(['bm']);
    expect(d.bekleyen.map((b) => b.id)).toEqual(['ist', 'mak']);
  });

  it('özet metni eksikleri adıyla sayar', () => {
    const d = gonderimDurumu(BOLUMLER, FAKULTE_Y, GONDERIMLER, 2026);
    expect(gonderimOzetMetni(d)).toMatch(/1 \/ 3 bölüm gönderdi/);
    expect(gonderimOzetMetni(d)).toMatch(/Makine Müh\./);
    expect(gonderimOzetMetni(d)).toMatch(/İstatistik/);
  });

  it('tamamı gönderdiyse ayrı cümle', () => {
    const hepsi = ['bm', 'mak', 'ist'].map((b) => ({ bolumId: b, yil: '2026' }));
    const d = gonderimDurumu(BOLUMLER, FAKULTE_Y, hepsi, 2026);
    expect(gonderimOzetMetni(d)).toMatch(/tamamı/);
  });

  it('hiçbiri göndermediyse uyarır', () => {
    const d = gonderimDurumu(BOLUMLER, FAKULTE_Y, [], 2026);
    expect(gonderimOzetMetni(d)).toMatch(/Hiçbir bölüm/);
  });
});

describe('kapsamOzetMetni', () => {
  it('her görünüm için kapsamı yazar', () => {
    expect(kapsamOzetMetni(AKADEMISYEN, 'own')).toMatch(/kendi/);
    expect(kapsamOzetMetni(BOLUM_Y, 'dept')).toMatch(/Bilgisayar Müh\./);
    expect(kapsamOzetMetni(FAKULTE_Y, 'faculty')).toMatch(/GÖNDERDİĞİ/);
  });

  it('çözülemeyen kapsamda sebebini söyler', () => {
    expect(kapsamOzetMetni(KAYITSIZ_FAK, 'faculty')).toMatch(/çözülemedi/);
    expect(kapsamOzetMetni(veriKapsami({ profil: null, dept: true }), 'dept')).toMatch(
      /çözülemedi/
    );
  });

  it('bilinmeyen görünümde boş', () => {
    expect(kapsamOzetMetni(UNI, 'yok')).toBe('');
  });
});
