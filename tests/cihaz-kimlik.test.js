import { describe, it, expect } from 'vitest';
import {
  DEGISIM_KOTASI,
  ayniCihazMi,
  baglamaKarari,
  baglamaYamasi,
  cihazKimligiUret,
  cihazMesaji,
  kalanDegisimHakki,
  kayitUyarisi,
  oturumdaBaskasiKullandiMi,
  parmakIzi,
  surumsuzAjan,
} from '../lib/cihaz-kimlik.js';

const SINYAL = {
  ajan: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Chrome/128.0.6613.88',
  platform: 'Linux armv8l',
  dil: 'tr-TR',
  saatDilimi: 'Europe/Istanbul',
  ekran: '1080x2340x24',
  pikselOrani: '3',
  cekirdek: '8',
  bellek: '8',
  dokunma: '5',
};

describe('surumsuzAjan', () => {
  // ⚠ Ham userAgent her tarayıcı güncellemesinde değişir; olduğu gibi
  // kullanılsaydı güncelleme alan her öğrenci "cihaz değiştirdi" sayılırdı.
  it('sürüm numaralarını atar', () => {
    const a = surumsuzAjan('Chrome/128.0.6613.88 Safari/537.36');
    const b = surumsuzAjan('Chrome/131.0.6778.85 Safari/537.36');
    expect(a).toBe(b);
  });

  it('cihazı anlatan kısmı korur', () => {
    expect(surumsuzAjan(SINYAL.ajan)).toContain('sm-s911b');
  });

  it('boş girdide boş', () => {
    expect(surumsuzAjan(null)).toBe('');
  });
});

describe('parmakIzi', () => {
  it('aynı sinyaller aynı izi verir', () => {
    expect(parmakIzi(SINYAL)).toBe(parmakIzi({ ...SINYAL }));
  });

  it('tarayıcı güncellemesi izi DEĞİŞTİRMEZ', () => {
    const guncel = { ...SINYAL, ajan: SINYAL.ajan.replace('128.0.6613.88', '131.0.6778.85') };
    expect(parmakIzi(guncel)).toBe(parmakIzi(SINYAL));
  });

  it('farklı ekran farklı iz verir', () => {
    expect(parmakIzi({ ...SINYAL, ekran: '1170x2532x24' })).not.toBe(parmakIzi(SINYAL));
  });

  it('farklı saat dilimi farklı iz verir', () => {
    expect(parmakIzi({ ...SINYAL, saatDilimi: 'Europe/Berlin' })).not.toBe(parmakIzi(SINYAL));
  });

  // ⚠ Hiç sinyal yoksa sabit bir özet üretip HERKESİ aynı cihaz saymak
  // bütün sınıfı birbirine kilitlerdi.
  it('sinyal yoksa BOŞ iz döner', () => {
    expect(parmakIzi({})).toBe('');
    expect(parmakIzi(null)).toBe('');
  });

  it('iz kısa ve onaltılık', () => {
    expect(parmakIzi(SINYAL)).toMatch(/^[0-9a-f]{24}$/);
  });
});

describe('cihazKimligiUret', () => {
  it('ch- ön ekiyle üretir', () => {
    expect(cihazKimligiUret('abc123')).toBe('ch-abc123');
  });

  it('değer verilmezse kendi üretir', () => {
    expect(cihazKimligiUret()).toMatch(/^ch-.+/);
    expect(cihazKimligiUret()).not.toBe(cihazKimligiUret());
  });
});

describe('ayniCihazMi', () => {
  it('kimlik tutuyorsa aynı', () => {
    expect(ayniCihazMi({ id: 'ch-1', iz: 'a' }, { id: 'ch-1', iz: 'b' })).toBe(true);
  });

  // Çerez silinse / gizli sekme açılsa bile parmak izi eşleşir.
  it('kimlik silinmiş ama iz tutuyorsa yine aynı', () => {
    expect(ayniCihazMi({ id: '', iz: 'abc' }, { id: 'ch-9', iz: 'abc' })).toBe(true);
  });

  it('ikisi de tutmuyorsa farklı', () => {
    expect(ayniCihazMi({ id: 'ch-1', iz: 'a' }, { id: 'ch-2', iz: 'b' })).toBe(false);
  });

  it('boş değerler eşleşme saymaz', () => {
    expect(ayniCihazMi({ id: '', iz: '' }, { id: '', iz: '' })).toBe(false);
  });
});

describe('oturumdaBaskasiKullandiMi', () => {
  const kayitlar = [
    { studentNumber: '111', cihazId: 'ch-a', cihazIz: 'iz-a' },
    { studentNumber: '222', cihazId: 'ch-b', cihazIz: 'iz-b' },
  ];

  // ⚠ ASIL SALDIRI: B kendi yoklamasını verir, sonra A'nın hesabına geçer.
  it('aynı cihazla ikinci öğrenci engellenir', () => {
    const r = oturumdaBaskasiKullandiMi(kayitlar, { id: 'ch-a', iz: 'iz-a' }, '333');
    expect(r.cakisma).toBe(true);
    expect(r.ogrenciNo).toBe('111');
  });

  it('çerez silinip gizli sekme açılsa da iz yakalar', () => {
    const r = oturumdaBaskasiKullandiMi(kayitlar, { id: 'ch-yeni', iz: 'iz-a' }, '333');
    expect(r.cakisma).toBe(true);
  });

  // Kendi ikinci okutması çakışma değildir.
  it('aynı öğrencinin tekrar okutması çakışma sayılmaz', () => {
    expect(oturumdaBaskasiKullandiMi(kayitlar, { id: 'ch-a', iz: 'iz-a' }, '111').cakisma).toBe(
      false
    );
  });

  it('başka cihaz serbest', () => {
    expect(oturumdaBaskasiKullandiMi(kayitlar, { id: 'ch-c', iz: 'iz-c' }, '333').cakisma).toBe(
      false
    );
  });

  it('boş listede çökmez', () => {
    expect(oturumdaBaskasiKullandiMi(null, { id: 'ch-a' }, '1').cakisma).toBe(false);
  });
});

describe('baglamaKarari', () => {
  const cihaz = { id: 'ch-a', iz: 'iz-a' };

  it('kayıtlı cihaz yoksa bağlanır', () => {
    const k = baglamaKarari(null, cihaz, { donem: '2026-guz' });
    expect(k.durum).toBe('yeni');
    expect(k.baglanacak).toBe(true);
  });

  it('aynı cihazda kota harcanmaz', () => {
    const kayit = { cihazId: 'ch-a', cihazIz: 'iz-a', donem: '2026-guz', degisimSayisi: 1 };
    const k = baglamaKarari(kayit, cihaz, { donem: '2026-guz' });
    expect(k.durum).toBe('ayni');
    expect(k.kalanHak).toBe(DEGISIM_KOTASI - 1);
  });

  it('farklı cihazda kota düşer', () => {
    const kayit = { cihazId: 'ch-z', cihazIz: 'iz-z', donem: '2026-guz', degisimSayisi: 0 };
    const k = baglamaKarari(kayit, cihaz, { donem: '2026-guz' });
    expect(k.durum).toBe('degisti');
    expect(k.kalanHak).toBe(DEGISIM_KOTASI - 1);
    expect(k.baglanacak).toBe(true);
  });

  it('kota bitince kilitlenir', () => {
    const kayit = {
      cihazId: 'ch-z',
      cihazIz: 'iz-z',
      donem: '2026-guz',
      degisimSayisi: DEGISIM_KOTASI,
    };
    expect(baglamaKarari(kayit, cihaz, { donem: '2026-guz' }).durum).toBe('kilitli');
  });

  // ⚠ Bir kere tükenen hak öğrenciyi mezun olana kadar kilitleyemez.
  it('yeni dönemde hak tazelenir', () => {
    const kayit = {
      cihazId: 'ch-z',
      cihazIz: 'iz-z',
      donem: '2025-bahar',
      degisimSayisi: DEGISIM_KOTASI,
    };
    expect(baglamaKarari(kayit, cihaz, { donem: '2026-guz' }).durum).toBe('degisti');
  });

  // Sinyal toplanamayan tarayıcıda öğrenci kilitlenmemeli.
  it('cihaz sinyali yoksa karar verilmez', () => {
    expect(baglamaKarari(null, { id: '', iz: '' }, {}).durum).toBe('bilinmiyor');
  });

  it('kota dışarıdan ayarlanabilir', () => {
    const kayit = { cihazId: 'ch-z', cihazIz: 'iz-z', donem: 'g', degisimSayisi: 0 };
    expect(baglamaKarari(kayit, cihaz, { donem: 'g', kota: 1 }).kalanHak).toBe(0);
  });
});

describe('kalanDegisimHakki', () => {
  it('kullanılan kadar düşer', () => {
    expect(kalanDegisimHakki({ degisimSayisi: 1, donem: 'g' }, 2, 'g')).toBe(1);
  });

  it('dönem değişince tazelenir', () => {
    expect(kalanDegisimHakki({ degisimSayisi: 5, donem: 'eski' }, 2, 'yeni')).toBe(2);
  });

  it('negatife düşmez', () => {
    expect(kalanDegisimHakki({ degisimSayisi: 9, donem: 'g' }, 2, 'g')).toBe(0);
  });
});

describe('baglamaYamasi', () => {
  it('yeni bağlamada sayaç artmaz', () => {
    const y = baglamaYamasi(null, { id: 'ch-a', iz: 'iz-a' }, { durum: 'yeni' }, { donem: 'g' });
    expect(y).toMatchObject({ cihazId: 'ch-a', cihazIz: 'iz-a', donem: 'g', degisimSayisi: 0 });
  });

  it('değişimde sayaç artar', () => {
    const kayit = { donem: 'g', degisimSayisi: 1 };
    const y = baglamaYamasi(kayit, { id: 'ch-b' }, { durum: 'degisti' }, { donem: 'g' });
    expect(y.degisimSayisi).toBe(2);
  });

  it('yeni dönemde sayaç sıfırdan başlar', () => {
    const kayit = { donem: 'eski', degisimSayisi: 5 };
    const y = baglamaYamasi(kayit, { id: 'ch-b' }, { durum: 'degisti' }, { donem: 'yeni' });
    expect(y.degisimSayisi).toBe(1);
  });
});

describe('mesajlar', () => {
  it('her sebebin bir cümlesi var', () => {
    ['cihaz_paylasimi', 'cihaz_kilitli', 'cihaz_degisti'].forEach((s) =>
      expect(cihazMesaji(s, { kalanHak: 1 }).length).toBeGreaterThan(20)
    );
  });

  it('bilinmeyen sebepte boş', () => {
    expect(cihazMesaji('yok')).toBe('');
  });

  it('kalan hak mesajda yazar', () => {
    expect(cihazMesaji('cihaz_degisti', { kalanHak: 1 })).toMatch(
      /kalan cihaz değiştirme hakkınız: 1/
    );
  });

  it('akademisyene satır uyarısı', () => {
    expect(kayitUyarisi({ cihazPaylasildi: true })).toMatch(/başka bir öğrenci/);
    expect(kayitUyarisi({ yeniCihaz: true })).toMatch(/yeni bir cihaz/);
    expect(kayitUyarisi({})).toBe('');
  });
});
