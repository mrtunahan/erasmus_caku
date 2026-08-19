// Yatay geçiş başvurusu hangi bölümün listesinde görünür?
//
// Şikâyet: "11 ve 19 kayıt bulunan sayılar başka bölümlerde görünüyor".
// Sebebi iki katmanlıydı — kayıt açılırken bölüm FORMU DOLDURANIN bölümünden
// yazılıyordu (kurum dışı adayda ya da fakülte düzeyi personelde boş kalır),
// listeleme ise boş bölümü "herkese göster" sayıyordu.
import { describe, it, expect } from 'vitest';
import { basvuruBolumId, basvuruBolumdeMi, sahipsizBasvurular } from '../lib/yatay-kapsam.js';

const BOLUMLER = [
  { id: 'bilgisayar', name: 'Bilgisayar Mühendisliği' },
  { id: 'makine', name: 'Makine Mühendisliği' },
  { id: 'gida', name: 'Gıda Mühendisliği' },
];

describe('basvuruBolumId', () => {
  it('yeni kayıtlarda seçilen bölüm kimliğini kullanır', () => {
    expect(basvuruBolumId({ basvurduguBolumId: 'makine' }, BOLUMLER)).toBe('makine');
  });

  it('kimlik seçimi, eski departmentId alanının ÖNÜNDE gelir', () => {
    // Eski alan formu dolduranın bölümüydü; başvurulan bölüm doğru olandır.
    expect(
      basvuruBolumId({ basvurduguBolumId: 'makine', departmentId: 'bilgisayar' }, BOLUMLER)
    ).toBe('makine');
  });

  it('eski kayıtta departmentId kullanılır', () => {
    expect(basvuruBolumId({ departmentId: 'gida' }, BOLUMLER)).toBe('gida');
  });

  it('ikisi de yoksa bölüm ADINDAN çözülür', () => {
    // Ad BÜYÜK HARF saklanıyor ve "Mühendisliği" eki var; programAnahtari
    // ikisini de sadeleştirir.
    expect(basvuruBolumId({ basvurduguBolum: 'MAKİNE MÜHENDİSLİĞİ' }, BOLUMLER)).toBe('makine');
  });

  it('ad birden çok bölüme uyuyorsa HİÇBİRİ seçilmez', () => {
    // Yanlış bölüme aday düşürmek, hiç düşürmemekten kötüdür.
    const ikiz = [
      { id: 'a', name: 'Makine Mühendisliği' },
      { id: 'b', name: 'Makine Mühendisliği' },
    ];
    expect(basvuruBolumId({ basvurduguBolum: 'MAKİNE MÜHENDİSLİĞİ' }, ikiz)).toBe('');
  });

  it('kapsama (substring) eşleşmesi yapılmaz', () => {
    // "Makine" hem "Makine Mühendisliği" hem "Makine ve İmalat" içinde geçer.
    expect(basvuruBolumId({ basvurduguBolum: 'MAKİNE' }, BOLUMLER)).toBe('');
  });

  it('hiçbiri çözülemezse boş döner', () => {
    expect(basvuruBolumId({}, BOLUMLER)).toBe('');
    expect(basvuruBolumId({ basvurduguBolum: 'YOK BÖYLE BİR BÖLÜM' }, BOLUMLER)).toBe('');
    expect(basvuruBolumId(null, BOLUMLER)).toBe('');
  });
});

describe('basvuruBolumdeMi', () => {
  it('yalnız KENDİ bölümünde görünür', () => {
    const k = { basvurduguBolumId: 'makine' };
    expect(basvuruBolumdeMi(k, 'makine', BOLUMLER)).toBe(true);
    expect(basvuruBolumdeMi(k, 'bilgisayar', BOLUMLER)).toBe(false);
  });

  it('BÖLÜMSÜZ kayıt artık her bölümde görünmez — asıl arıza buydu', () => {
    const bos = { adSoyad: 'Aday', departmentId: '' };
    expect(basvuruBolumdeMi(bos, 'bilgisayar', BOLUMLER)).toBe(false);
    expect(basvuruBolumdeMi(bos, 'makine', BOLUMLER)).toBe(false);
    expect(basvuruBolumdeMi(bos, 'gida', BOLUMLER)).toBe(false);
  });

  it('bölümü boş ama ADI yazılı eski kayıt DOĞRU bölüme düşer', () => {
    const eski = { departmentId: '', basvurduguBolum: 'GIDA MÜHENDİSLİĞİ' };
    expect(basvuruBolumdeMi(eski, 'gida', BOLUMLER)).toBe(true);
    expect(basvuruBolumdeMi(eski, 'makine', BOLUMLER)).toBe(false);
  });

  it('bölüm seçili değilse (üniversite geneli) hepsi görünür', () => {
    expect(basvuruBolumdeMi({ departmentId: '' }, '', BOLUMLER)).toBe(true);
  });
});

describe('sahipsizBasvurular', () => {
  it('yalnız çözülemeyenleri verir', () => {
    const liste = [
      { adSoyad: 'A', basvurduguBolumId: 'makine' },
      { adSoyad: 'B', basvurduguBolum: 'GIDA MÜHENDİSLİĞİ' },
      { adSoyad: 'C' },
      { adSoyad: 'D', basvurduguBolum: 'TANIMSIZ' },
    ];
    expect(sahipsizBasvurular(liste, BOLUMLER).map((x) => x.adSoyad)).toEqual(['C', 'D']);
  });

  it('boş listede çökmez', () => {
    expect(sahipsizBasvurular(null, BOLUMLER)).toEqual([]);
  });
});
