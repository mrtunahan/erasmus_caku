import { describe, it, expect } from 'vitest';
import {
  KAYIT_DURUMLARI,
  bekleyenSatirSayisi,
  durumAciklamasi,
  eksikSayisi,
  intibakAsamasi,
  intibakMi,
  kayitDurumu,
  kayitlariSirala,
} from '../lib/muafiyet-kayit-durumu.js';

const satir = (ek) =>
  Object.assign(
    {
      sourceCourse: { code: 'BM437', name: 'Yapay Zeka', akts: '5' },
      localCourse: { code: 'BİL481', name: 'Yapay Zeka', akts: '4' },
    },
    ek
  );

const intibak = (ek) =>
  Object.assign({ basvuruTuru: 'intibak', studentName: 'Ali Veli', matches: [] }, ek);

describe('intibakMi / intibakAsamasi', () => {
  it('tür ve aşama okunur', () => {
    expect(intibakMi(intibak())).toBe(true);
    expect(intibakMi({ basvuruTuru: 'muafiyet' })).toBe(false);
    expect(intibakAsamasi({})).toBe('on_inceleme');
    expect(intibakAsamasi({ stage: 'belge_teslim' })).toBe('belge_teslim');
  });
});

describe('bekleyenSatirSayisi', () => {
  it('sayaç varsa onu kullanır', () => {
    expect(bekleyenSatirSayisi({ pendingReviewCount: 3 })).toBe(3);
  });

  it('sayaç yoksa kararsız satırları sayar', () => {
    const k = { matches: [satir(), satir({ adminDecision: 'confirmed' }), satir()] };
    expect(bekleyenSatirSayisi(k)).toBe(2);
  });

  it('negatif sayaç sıfırlanır, boş girdi çökmez', () => {
    expect(bekleyenSatirSayisi({ pendingReviewCount: -2 })).toBe(0);
    expect(bekleyenSatirSayisi(null)).toBe(0);
  });
});

describe('kayitDurumu', () => {
  it('karar bekleyen ders varsa en acil durum', () => {
    const k = intibak({ stage: 'tamamlandi', pendingReviewCount: 2 });
    expect(kayitDurumu(k).id).toBe('karar_bekliyor');
  });

  it('ön onay ve yaz okulu aşamasında top ÖĞRENCİDE', () => {
    expect(kayitDurumu(intibak({ stage: 'on_inceleme' })).id).toBe('belge_bekleniyor');
    expect(kayitDurumu(intibak({ stage: 'on_onay' })).id).toBe('belge_bekleniyor');
  });

  it('belge geldiğinde notu okunamayan satır varsa NOT EKSİK', () => {
    const k = intibak({ stage: 'belge_teslim', matches: [satir({ adminDecision: 'confirmed' })] });
    expect(kayitDurumu(k).id).toBe('not_eksik');
  });

  it('TAMAMLANMIŞ kayıtta da not eksikse işaretlenir', () => {
    // Belge boş sütunla üretiliyor ve kimse fark etmiyordu.
    const k = intibak({ stage: 'tamamlandi', matches: [satir({ adminDecision: 'confirmed' })] });
    expect(kayitDurumu(k).id).toBe('not_eksik');
  });

  it('notlar tamsa belge aşaması akademisyen kararı bekler', () => {
    const k = intibak({
      stage: 'belge_teslim',
      matches: [satir({ adminDecision: 'confirmed' })],
      ogrenciNotlari: { 0: { kaynakHarf: 'BA' } },
    });
    expect(kayitDurumu(k).id).toBe('karar_bekliyor');
  });

  it('her şey tamsa tamamlandı', () => {
    const k = intibak({
      stage: 'tamamlandi',
      matches: [satir({ adminDecision: 'confirmed' })],
      ogrenciNotlari: { 0: { kaynakHarf: 'BA' } },
    });
    expect(kayitDurumu(k).id).toBe('tamam');
    expect(kayitDurumu(k).eksik).toBe(false);
  });

  it('reddedilen satır not eksiği saymaz', () => {
    const k = intibak({ stage: 'tamamlandi', matches: [satir({ adminDecision: 'rejected' })] });
    expect(kayitDurumu(k).id).toBe('tamam');
  });

  it('muafiyet kaydında yalnız karar durumu vardır', () => {
    expect(kayitDurumu({ basvuruTuru: 'muafiyet', pendingReviewCount: 1 }).id).toBe(
      'karar_bekliyor'
    );
    expect(kayitDurumu({ basvuruTuru: 'muafiyet', matches: [] }).id).toBe('tamam');
  });

  it('boş girdi çökmez', () => {
    expect(kayitDurumu(null)).toBe(KAYIT_DURUMLARI.tamam);
  });
});

describe('durumAciklamasi', () => {
  it('kaç ders beklediğini söyler', () => {
    expect(durumAciklamasi(intibak({ pendingReviewCount: 3 }))).toBe('3 ders kararı bekliyor');
  });

  it('belge aşamasında karar metni sayısızdır', () => {
    const k = intibak({
      stage: 'belge_teslim',
      matches: [satir({ adminDecision: 'confirmed' })],
      ogrenciNotlari: { 0: { kaynakHarf: 'BA' } },
    });
    expect(durumAciklamasi(k)).toBe('Belge onayı bekliyor');
  });

  it('kaç derste not okunamadığını söyler', () => {
    const k = intibak({
      stage: 'belge_teslim',
      matches: [satir({ adminDecision: 'confirmed' }), satir({ adminDecision: 'confirmed' })],
    });
    expect(durumAciklamasi(k)).toBe('2 derste başarı notu okunamadı');
  });

  it('öğrenciden bekleneni söyler', () => {
    expect(durumAciklamasi(intibak({ stage: 'on_onay' }))).toMatch(/başarı belgesi/i);
  });

  it('tamamlanan kayıtta açıklama yok', () => {
    expect(durumAciklamasi(intibak({ stage: 'tamamlandi' }))).toBe('');
  });
});

describe('kayitlariSirala', () => {
  const kararBekleyen = intibak({ studentName: 'Zeynep Kaya', pendingReviewCount: 1 });
  const notEksik = intibak({
    studentName: 'Ahmet Ak',
    stage: 'belge_teslim',
    matches: [satir({ adminDecision: 'confirmed' })],
  });
  const belgeBekleyen = intibak({ studentName: 'Burak Can', stage: 'on_onay' });
  const tamamA = intibak({ studentName: 'Ayşe Demir', stage: 'tamamlandi' });
  const tamamZ = intibak({ studentName: 'Zehra Yıldız', stage: 'tamamlandi' });

  it('eksik işler önce, tamamlananlar sonra', () => {
    const s = kayitlariSirala([tamamZ, belgeBekleyen, notEksik, kararBekleyen, tamamA]);
    expect(s.map((x) => kayitDurumu(x).id)).toEqual([
      'karar_bekliyor',
      'not_eksik',
      'belge_bekleniyor',
      'tamam',
      'tamam',
    ]);
  });

  it('aynı gruptakiler Türkçe ada göre sıralanır', () => {
    const s = kayitlariSirala([tamamZ, tamamA]);
    expect(s.map((x) => x.studentName)).toEqual(['Ayşe Demir', 'Zehra Yıldız']);
  });

  it('Türkçe harf sırası doğru (I/İ)', () => {
    const a = intibak({ studentName: 'Işıl Ak', stage: 'tamamlandi' });
    const b = intibak({ studentName: 'İlker Ak', stage: 'tamamlandi' });
    expect(kayitlariSirala([b, a]).map((x) => x.studentName)).toEqual(['Işıl Ak', 'İlker Ak']);
  });

  it('adlar eşitse numaraya bakar', () => {
    const a = intibak({ studentName: 'Ali Veli', studentNo: '2', stage: 'tamamlandi' });
    const b = intibak({ studentName: 'Ali Veli', studentNo: '1', stage: 'tamamlandi' });
    expect(kayitlariSirala([a, b]).map((x) => x.studentNo)).toEqual(['1', '2']);
  });

  it('GİRDİ DİZİSİ değişmez', () => {
    // Çağıran aynı diziyi başka yerde de kullanıyor.
    const girdi = [tamamZ, kararBekleyen];
    kayitlariSirala(girdi);
    expect(girdi[0]).toBe(tamamZ);
  });

  it('boş girdi çökmez', () => {
    expect(kayitlariSirala(null)).toEqual([]);
  });
});

describe('eksikSayisi', () => {
  it('eksik işi olan kayıtları sayar', () => {
    const liste = [
      intibak({ pendingReviewCount: 1 }),
      intibak({ stage: 'on_onay' }),
      intibak({ stage: 'tamamlandi' }),
    ];
    expect(eksikSayisi(liste)).toBe(2);
  });

  it('boş girdi çökmez', () => {
    expect(eksikSayisi(null)).toBe(0);
  });
});
