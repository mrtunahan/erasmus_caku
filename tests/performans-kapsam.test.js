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
  kapsamOzetMetni,
  secilebilirBolumler,
  veriKapsami,
} from '../lib/performans-kapsam.js';

const AKAD = [
  { id: 'a1', ad: 'Ayşe', departmentId: 'bm', bolum: 'Bilgisayar Müh.', fakulte: 'Mühendislik' },
  { id: 'a2', ad: 'Bora', departmentId: 'bm', bolum: 'Bilgisayar Müh.', fakulte: 'Mühendislik' },
  { id: 'a3', ad: 'Cem', departmentId: 'mak', bolum: 'Makine Müh.', fakulte: 'Mühendislik' },
  { id: 'a4', ad: 'Derya', departmentId: 'fiz', bolum: 'Fizik', fakulte: 'Fen' },
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

describe('secilebilirBolumler', () => {
  it('fakülte yetkilisi kendi fakültesinin bölümlerini seçebilir', () => {
    expect(secilebilirBolumler(AKAD, FAKULTE_Y).map((b) => b.id)).toEqual(['bm', 'mak']);
  });

  it('bölüm yetkilisi yalnız kendi bölümünü', () => {
    expect(secilebilirBolumler(AKAD, BOLUM_Y).map((b) => b.id)).toEqual(['bm']);
  });

  it('üniversite yetkilisi hepsini', () => {
    expect(secilebilirBolumler(AKAD, UNI).map((b) => b.id)).toEqual(['bm', 'fiz', 'mak']);
  });

  it('kapsamsızda boş', () => {
    expect(secilebilirBolumler(AKAD, KAYITSIZ_FAK)).toEqual([]);
  });

  // Türkçe sıralama: Fizik < Makine
  it('Türkçe ada göre sıralı', () => {
    expect(secilebilirBolumler(AKAD, UNI).map((b) => b.ad)).toEqual([
      'Bilgisayar Müh.',
      'Fizik',
      'Makine Müh.',
    ]);
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

  it('durum gönderen ve bekleyeni ayırır', () => {
    const d = gonderimDurumu(AKAD, FAKULTE_Y, GONDERIMLER, 2026);
    expect(d.toplam).toBe(2);
    expect(d.gonderen.map((b) => b.id)).toEqual(['bm']);
    expect(d.bekleyen.map((b) => b.id)).toEqual(['mak']);
  });

  it('özet metni eksikleri adıyla sayar', () => {
    const d = gonderimDurumu(AKAD, FAKULTE_Y, GONDERIMLER, 2026);
    expect(gonderimOzetMetni(d)).toMatch(/1 \/ 2 bölüm gönderdi/);
    expect(gonderimOzetMetni(d)).toMatch(/Makine Müh\./);
  });

  it('tamamı gönderdiyse ayrı cümle', () => {
    const hepsi = [
      { bolumId: 'bm', yil: '2026' },
      { bolumId: 'mak', yil: '2026' },
    ];
    const d = gonderimDurumu(AKAD, FAKULTE_Y, hepsi, 2026);
    expect(gonderimOzetMetni(d)).toMatch(/tamamı/);
  });

  it('hiçbiri göndermediyse uyarır', () => {
    const d = gonderimDurumu(AKAD, FAKULTE_Y, [], 2026);
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
