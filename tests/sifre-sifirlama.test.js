// Şifremi unuttum — tek kullanımlık kod kuralları.
//
// Bu birkaç karar sıfırlama akışının güvenliğini taşıyor: kodun ne zaman
// öldüğü, adresin ne kadarının gösterildiği, sıfırlamadan sonra eski
// oturumların düşüp düşmediği. Hepsi burada sabitlenir.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const S = require('../server/lib/sifre-sifirlama.js');

describe('kodUret', () => {
  it('istenen hane sayısında kod üretir', () => {
    for (let i = 0; i < 50; i++) {
      expect(S.kodUret()).toMatch(/^\d{6}$/);
    }
  });

  it('baştaki sıfır yüzünden kısa kod ÜRETMEZ', () => {
    // '012345' gibi bir kod istemci tarafında 12345 olup doğrulamayı bozar.
    for (let i = 0; i < 50; i++) {
      expect(S.kodUret(4)).toMatch(/^[1-9]\d{3}$/);
    }
  });

  it('ardışık kodlar aynı değil', () => {
    const kume = new Set(Array.from({ length: 30 }, () => S.kodUret()));
    expect(kume.size).toBeGreaterThan(20);
  });
});

describe('kodDurumu', () => {
  const simdi = 1_000_000_000_000;
  const taze = { sonKullanma: simdi + 60_000, denemeSayisi: 0, kullanildi: false };

  it('taze kod geçerlidir', () => {
    expect(S.kodDurumu(taze, simdi)).toEqual({ ok: true });
  });

  it('SÜRESİ dolan kod ölür', () => {
    expect(S.kodDurumu({ ...taze, sonKullanma: simdi - 1 }, simdi).sebep).toBe('suresi-doldu');
    // Tam sınırda da ölü sayılır.
    expect(S.kodDurumu({ ...taze, sonKullanma: simdi }, simdi).sebep).toBe('suresi-doldu');
  });

  it('DENEME hakkı biten kod ölür — 6 hane kaba kuvvetle denenmesin', () => {
    expect(S.kodDurumu({ ...taze, denemeSayisi: S.AZAMI_DENEME }, simdi).sebep).toBe(
      'deneme-bitti'
    );
    expect(S.kodDurumu({ ...taze, denemeSayisi: S.AZAMI_DENEME - 1 }, simdi).ok).toBe(true);
  });

  it('KULLANILMIŞ kod ikinci kez çalışmaz', () => {
    expect(S.kodDurumu({ ...taze, kullanildi: true }, simdi).sebep).toBe('kullanilmis');
  });

  it('kayıt yoksa geçersiz', () => {
    expect(S.kodDurumu(null, simdi).sebep).toBe('kod-yok');
  });

  it('her sebep için kullanıcıya mesaj var', () => {
    ['kod-yok', 'kullanilmis', 'deneme-bitti', 'suresi-doldu'].forEach((s) => {
      expect(S.durumMesaji(s)).toMatch(/kod/i);
    });
  });
});

describe('sonKullanma', () => {
  it('varsayılan süre dakikadan hesaplanır', () => {
    const t = 1_000_000_000_000;
    expect(S.sonKullanma(t)).toBe(t + S.GECERLILIK_DAKIKA * 60 * 1000);
    expect(S.sonKullanma(t, 5)).toBe(t + 5 * 60 * 1000);
  });
});

describe('eposta', () => {
  it('anahtar büyük/küçük ve boşluk farkını yutar', () => {
    expect(S.epostaAnahtari('  Ayse@Karatekin.Edu.TR ')).toBe('ayse@karatekin.edu.tr');
  });

  it('biçim denetimi', () => {
    expect(S.epostaBicimiGecerli('ayse@karatekin.edu.tr')).toBe(true);
    expect(S.epostaBicimiGecerli('ayse@karatekin')).toBe(false);
    expect(S.epostaBicimiGecerli('ayse')).toBe(false);
    expect(S.epostaBicimiGecerli('')).toBe(false);
    expect(S.epostaBicimiGecerli(null)).toBe(false);
  });

  it('adres MASKELENİR — tamamı yazılmaz', () => {
    // Kullanıcı kodun nereye gittiğini görmeli, ama hesabı ele geçirmeye
    // çalışan biri kurbanın adresini öğrenmemeli.
    expect(S.epostaMaskele('ayse.yilmaz@karatekin.edu.tr')).toBe('ay*********@karatekin.edu.tr');
    expect(S.epostaMaskele('ab@x.com')).toBe('ab*@x.com');
  });

  it('tek harfli yerel kısımda da maskeleme kalır', () => {
    expect(S.epostaMaskele('a@x.com')).toBe('a*@x.com');
  });

  it('bozuk adres boş döner', () => {
    expect(S.epostaMaskele('@x.com')).toBe('');
    expect(S.epostaMaskele('')).toBe('');
  });
});

describe('jetonEskimisMi', () => {
  // Şifre sıfırlandığında eski oturumlar düşmeli; aksi halde ele geçirilmiş
  // oturum jeton süresi dolana kadar (24 saat) çalışmaya devam eder.
  it('şifre değişiminden ÖNCE verilen jeton eskimiştir', () => {
    const degisim = 1_700_000_000_000; // ms
    const eskiIat = Math.floor(degisim / 1000) - 10;
    expect(S.jetonEskimisMi(eskiIat, degisim)).toBe(true);
  });

  it('şifre değişiminden SONRA verilen jeton geçerlidir', () => {
    const degisim = 1_700_000_000_000;
    const yeniIat = Math.floor(degisim / 1000) + 10;
    expect(S.jetonEskimisMi(yeniIat, degisim)).toBe(false);
  });

  it('AYNI saniyede verilen jeton düşmez — sıfırlamanın kendi jetonu', () => {
    const degisim = 1_700_000_000_500;
    expect(S.jetonEskimisMi(Math.floor(degisim / 1000), degisim)).toBe(false);
  });

  it('damgası olmayan hesapta kimse düşmez — dağıtımda toplu çıkış OLMAZ', () => {
    expect(S.jetonEskimisMi(1_700_000_000, 0)).toBe(false);
    expect(S.jetonEskimisMi(1_700_000_000, undefined)).toBe(false);
    expect(S.jetonEskimisMi(1_700_000_000, null)).toBe(false);
  });

  it('bozuk iat jetonu düşürmez', () => {
    expect(S.jetonEskimisMi(undefined, 1_700_000_000_000)).toBe(false);
    expect(S.jetonEskimisMi('abc', 1_700_000_000_000)).toBe(false);
  });
});

describe('damgaAnahtari', () => {
  it('rol ve kimlik birlikte anahtarlanır', () => {
    expect(S.damgaAnahtari('student', '123')).toBe('student:123');
    // Aynı ada sahip farklı roller birbirini düşürmemeli.
    expect(S.damgaAnahtari('professor', 'Ali')).not.toBe(S.damgaAnahtari('bolum_yetkilisi', 'Ali'));
  });
});
