import { describe, it, expect } from 'vitest';
import {
  PROFIL_ALANLARI,
  PROFIL_GRUPLARI,
  alanBul,
  alanHatasi,
  alanSuzgeci,
  belgeEksikleri,
  formaUygula,
  grubunAlanlari,
  profilBelgeDegerleri,
  profilDurumu,
  profilHatalari,
  profilNormalle,
  profilOzetMetni,
  tarihTr,
  tcGecerliMi,
} from '../lib/ogrenci-profil.js';

const TAM = {
  phone: '0555 111 22 33',
  email: 'elif@ogrenci.edu.tr',
  address: 'Cumhuriyet Mah. No:3 ÇANKIRI',
  tcKimlikNo: '10000000146',
  dogumTarihi: '2004-05-17',
  dogumYeri: 'ÇANKIRI',
  babaAdi: 'AHMET',
  anaAdi: 'AYŞE',
  nufusIl: 'ÇANKIRI',
  nufusIlce: 'MERKEZ',
  nufusMahalleKoy: 'CUMHURİYET',
  ciltNo: '12',
  aileSiraNo: '34',
  siraNo: '5',
  nufusCuzdanSeriNo: 'A12B34567',
};

describe('alan sözlüğü', () => {
  // ⚠ Eski kayıtlar phone/email/address adlarıyla yazıldı; yeniden
  // adlandırmak dolu profilleri sessizce boşaltırdı.
  it('iletişim alanlarının anahtarları DEĞİŞMEDİ', () => {
    expect(grubunAlanlari('iletisim').map((a) => a.anahtar)).toEqual(['phone', 'email', 'address']);
  });

  it('her alan tanımlı bir gruba ait', () => {
    const gruplar = new Set(PROFIL_GRUPLARI.map((g) => g.id));
    PROFIL_ALANLARI.forEach((a) => expect(gruplar.has(a.grup), a.anahtar).toBe(true));
  });

  it('anahtarlar tekil', () => {
    const k = PROFIL_ALANLARI.map((a) => a.anahtar);
    expect(new Set(k).size).toBe(k.length);
  });

  it('her alan en az bir belgeye hizmet eder — gereksiz soru sorulmaz', () => {
    PROFIL_ALANLARI.forEach((a) => expect((a.belgeler || []).length, a.anahtar).toBeGreaterThan(0));
  });

  it('alanBul bilinmeyende null', () => {
    expect(alanBul('phone').etiket).toBe('Telefon');
    expect(alanBul('yok')).toBe(null);
  });
});

describe('tcGecerliMi', () => {
  it('geçerli numarayı kabul eder', () => {
    expect(tcGecerliMi('10000000146')).toBe(true);
  });

  it('sağlama toplamı tutmayanı reddeder', () => {
    expect(tcGecerliMi('10000000147')).toBe(false);
    expect(tcGecerliMi('12345678901')).toBe(false);
  });

  it('0 ile başlayamaz, 11 hane olmalı', () => {
    expect(tcGecerliMi('01234567890')).toBe(false);
    expect(tcGecerliMi('1000000014')).toBe(false);
    expect(tcGecerliMi('abcdefghijk')).toBe(false);
  });

  // Alan zorunlu değil: boş değer hata sayılmaz.
  it('boş değer geçerli sayılır', () => {
    expect(tcGecerliMi('')).toBe(true);
    expect(tcGecerliMi(null)).toBe(true);
  });
});

describe('alanHatasi', () => {
  it('boş alan hata vermez — hiçbir alan zorunlu değil', () => {
    PROFIL_ALANLARI.forEach((a) => expect(alanHatasi(a, '')).toBe(''));
  });

  it('e-posta biçimi denetlenir', () => {
    expect(alanHatasi('email', 'elif@ornek.edu.tr')).toBe('');
    expect(alanHatasi('email', 'elif(at)ornek')).toMatch(/e-posta/i);
  });

  it('telefon en az 10 hane', () => {
    expect(alanHatasi('phone', '0555 111 22 33')).toBe('');
    expect(alanHatasi('phone', '555 11')).toMatch(/10 haneli/);
    expect(alanHatasi('phone', '0555abc')).toMatch(/rakam/);
  });

  it('T.C. kimlik hatası neden geçersiz olduğunu söyler', () => {
    expect(alanHatasi('tcKimlikNo', '10000000146')).toBe('');
    expect(alanHatasi('tcKimlikNo', '10000000147')).toMatch(/doğrulanamadı/);
    expect(alanHatasi('tcKimlikNo', '123')).toMatch(/11 haneli/);
  });

  it('tarih ve sayı alanları', () => {
    expect(alanHatasi('dogumTarihi', '2004-05-17')).toBe('');
    expect(alanHatasi('dogumTarihi', '17/05/2004')).toMatch(/gg.aa.yyyy/);
    expect(alanHatasi('ciltNo', '12')).toBe('');
    expect(alanHatasi('ciltNo', '12-A')).toMatch(/rakam/);
  });

  it('bilinmeyen alanda hata üretmez', () => {
    expect(alanHatasi('yok', 'x')).toBe('');
  });
});

describe('alanSuzgeci', () => {
  it('T.C. kimlik yalnız rakam ve 11 hane', () => {
    expect(alanSuzgeci('tcKimlikNo', '100a0000 0146999')).toBe('10000000146');
  });

  it('telefonda + - ( ) korunur', () => {
    expect(alanSuzgeci('phone', '+90 (555) 111-22-33')).toBe('+90 (555) 111-22-33');
    expect(alanSuzgeci('phone', '0555abc111')).toBe('0555111');
  });

  // "Doğum Yeri: 06 Ankara" belgeye olduğu gibi geçiyordu.
  it('ad/yer alanlarına rakam yazılmaz', () => {
    expect(alanSuzgeci('dogumYeri', '06 Ankara')).toBe(' Ankara');
    expect(alanSuzgeci('babaAdi', 'Ahmet2')).toBe('Ahmet');
  });

  it('adres serbest metin — süzülmez', () => {
    expect(alanSuzgeci('address', 'Cumhuriyet Mah. No:3 D:5')).toBe('Cumhuriyet Mah. No:3 D:5');
  });
});

describe('profilNormalle', () => {
  it('kırpar ve boşları atar', () => {
    expect(profilNormalle({ phone: '  0555 111 22 33 ', email: '   ', bilinmeyen: 'x' })).toEqual({
      phone: '0555 111 22 33',
    });
  });

  it('boş girdide boş kayıt', () => {
    expect(profilNormalle(null)).toEqual({});
  });
});

describe('profilHatalari', () => {
  it('tam profilde hata yok', () => {
    expect(profilHatalari(TAM)).toEqual({});
  });

  it('yalnız bozuk alanı işaretler', () => {
    const h = profilHatalari({ ...TAM, email: 'bozuk' });
    expect(Object.keys(h)).toEqual(['email']);
  });
});

describe('belgeEksikleri', () => {
  it('dilekçe telefon · e-posta · adres ister', () => {
    expect(belgeEksikleri({}, 'dilekce').map((a) => a.anahtar)).toEqual([
      'phone',
      'email',
      'address',
    ]);
  });

  it('staj kimlik ve nüfus bilgilerini de ister', () => {
    const e = belgeEksikleri({}, 'staj').map((a) => a.anahtar);
    expect(e).toContain('tcKimlikNo');
    expect(e).toContain('ciltNo');
    expect(e).not.toContain('address');
  });

  it('dolu profilde eksik yok', () => {
    expect(belgeEksikleri(TAM, 'dilekce')).toEqual([]);
    expect(belgeEksikleri(TAM, 'staj')).toEqual([]);
  });
});

describe('profilDurumu', () => {
  it('grup grup doluluk', () => {
    const d = profilDurumu({ phone: '0555 111 22 33', email: 'a@b.cd' });
    const iletisim = d.gruplar.find((g) => g.id === 'iletisim');
    expect(iletisim.dolu).toBe(2);
    expect(iletisim.toplam).toBe(3);
    expect(iletisim.tamam).toBe(false);
    expect(iletisim.eksikler).toEqual(['Adres']);
  });

  it('belge hazırlığı ayrı ayrı', () => {
    const d = profilDurumu({ phone: '0555 111 22 33', email: 'a@b.cd', address: 'x' });
    expect(d.belgeler.find((b) => b.id === 'dilekce').hazir).toBe(true);
    expect(d.belgeler.find((b) => b.id === 'staj').hazir).toBe(false);
  });

  it('tam profilde oran 1', () => {
    const d = profilDurumu(TAM);
    expect(d.oran).toBe(1);
    expect(d.belgeler.every((b) => b.hazir)).toBe(true);
  });

  it('boş profilde çökmez', () => {
    const d = profilDurumu(null);
    expect(d.dolu).toBe(0);
    expect(d.oran).toBe(0);
  });
});

describe('profilOzetMetni', () => {
  it('hiç bilgi yoksa sonucunu söyler', () => {
    expect(profilOzetMetni(profilDurumu({}))).toMatch(/dilekçeleriniz eksik çıkar/);
  });

  it('eksik belgeyi ve sayısını yazar', () => {
    const m = profilOzetMetni(profilDurumu({ phone: '0555 111 22 33' }));
    expect(m).toMatch(/Dilekçeler .* için 2 bilgi eksik/);
    expect(m).toMatch(/Staj/);
  });

  it('tamamsa tek cümle', () => {
    expect(profilOzetMetni(profilDurumu(TAM))).toBe('Belgeleriniz için gereken bilgiler tamam.');
  });
});

describe('profilBelgeDegerleri', () => {
  it('şablon değişkenlerini üretir', () => {
    const v = profilBelgeDegerleri(TAM);
    expect(v.ogrenciTelefon).toBe('0555 111 22 33');
    expect(v.ogrenciTcKimlik).toBe('10000000146');
    expect(v.ogrenciDogumTarihi).toBe('17.05.2004');
  });

  it('boş profilde değişkenler boş dize — şablonda "undefined" yazmaz', () => {
    const v = profilBelgeDegerleri(null);
    expect(Object.values(v).every((x) => x === '')).toBe(true);
  });
});

describe('tarihTr', () => {
  it('ISO tarihi gün.ay.yıl yapar', () => {
    expect(tarihTr('2004-05-17')).toBe('17.05.2004');
  });

  it('tanınmayanı olduğu gibi bırakır', () => {
    expect(tarihTr('17.05.2004')).toBe('17.05.2004');
    expect(tarihTr('')).toBe('');
  });
});

describe('formaUygula', () => {
  const eslesme = { tcKimlikNo: 'tcKimlikNo', telefonNo: 'phone', dogumYeri: 'dogumYeri' };

  it('boş form alanlarını profilden doldurur', () => {
    const f = formaUygula({ tcKimlikNo: '', telefonNo: '', dogumYeri: '' }, TAM, eslesme);
    expect(f.tcKimlikNo).toBe('10000000146');
    expect(f.telefonNo).toBe('0555 111 22 33');
  });

  // Öğrencinin o formda yazdığı değer profildeki eskiyle ezilmemeli.
  it('DOLU form alanına dokunmaz', () => {
    const f = formaUygula({ telefonNo: '0532 000 00 00' }, TAM, eslesme);
    expect(f.telefonNo).toBe('0532 000 00 00');
  });

  it('profilde olmayan alan boş kalır', () => {
    const f = formaUygula({ telefonNo: '' }, {}, eslesme);
    expect(f.telefonNo).toBe('');
  });

  it('eşleşme yoksa form aynen döner', () => {
    expect(formaUygula({ a: '1' }, TAM, null)).toEqual({ a: '1' });
  });
});
