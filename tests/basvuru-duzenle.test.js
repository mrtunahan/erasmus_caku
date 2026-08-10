import { describe, it, expect } from 'vitest';
import {
  DUZENLENEBILIR_ALANLAR,
  duzenlemeYamasi,
  beyandanFarkliMi,
  beyanFarklari,
  duzenlemeFormu,
} from '../lib/basvuru-duzenle.js';

const kayit = () => ({
  adSoyad: 'AYŞE YILMAZ',
  ogrenciNo: '240905072',
  aktifUniversite: 'ODTÜ',
  aktifBolum: 'Yazılım',
  yksPuani: '380,5',
  notOrtalamasi: '3,10',
  telefon: '5551112233',
  degerlendirme: 'uygun_asil',
});

describe('duzenlemeYamasi', () => {
  it('değişen alanları yamaya alır', () => {
    const { patch, degisenler } = duzenlemeYamasi(kayit(), { yksPuani: '385,0' }, 'Dr. Ali');
    expect(patch.yksPuani).toBe('385,0');
    expect(degisenler).toEqual([
      { id: 'yksPuani', label: 'YKS puanı', eski: '380,5', yeni: '385,0' },
    ]);
  });

  it('değişiklik yoksa yama ÜRETMEZ — boşuna yazma olmaz', () => {
    const { patch, degisenler } = duzenlemeYamasi(kayit(), { yksPuani: '380,5' }, 'Dr. Ali');
    expect(patch).toBe(null);
    expect(degisenler).toEqual([]);
  });

  it('yalnız izinli alanlar geçer — değerlendirme ve kimlik yamaya girmez', () => {
    const { patch } = duzenlemeYamasi(
      kayit(),
      { yksPuani: '385,0', degerlendirme: 'uygun_degil', ogrenciNo: '999', adSoyad: 'X' },
      'Dr. Ali'
    );
    expect(patch.degerlendirme).toBeUndefined();
    expect(patch.ogrenciNo).toBeUndefined();
    expect(patch.adSoyad).toBeUndefined();
  });

  it('boşluk farkı değişiklik sayılmaz', () => {
    const { patch } = duzenlemeYamasi(kayit(), { yksPuani: '  380,5  ' }, 'Dr. Ali');
    expect(patch).toBe(null);
  });

  it('ADAYIN BEYANI ilk düzenlemede saklanır', () => {
    const { patch } = duzenlemeYamasi(kayit(), { yksPuani: '385,0' }, 'Dr. Ali');
    expect(patch.ilkBeyan.yksPuani).toBe('380,5');
    expect(patch.ilkBeyan.aktifUniversite).toBe('ODTÜ');
  });

  it('İKİNCİ düzenlemede beyan ÜZERİNE YAZILMAZ', () => {
    // Aksi hâlde ikinci düzeltmeyle birlikte "aday ne demişti" bilgisi
    // kaybolur ve belge-beyan denetimi anlamını yitirirdi.
    const k1 = kayit();
    const { patch: p1 } = duzenlemeYamasi(k1, { yksPuani: '385,0' }, 'Dr. Ali');
    const k2 = { ...k1, ...p1 };
    const { patch: p2 } = duzenlemeYamasi(k2, { yksPuani: '390,0' }, 'Dr. Veli');
    expect(p2.ilkBeyan).toBeUndefined(); // dokunulmadı
    expect(k2.ilkBeyan.yksPuani).toBe('380,5'); // özgün beyan duruyor
  });

  it('her düzenleme günlüğe yazılır (kim / ne zaman / hangi alan)', () => {
    const k1 = kayit();
    const { patch: p1 } = duzenlemeYamasi(k1, { yksPuani: '385,0' }, 'Dr. Ali');
    expect(p1.duzenlemeGecmisi).toHaveLength(1);
    expect(p1.duzenlemeGecmisi[0].kim).toBe('Dr. Ali');
    expect(p1.duzenlemeGecmisi[0].alanlar[0]).toMatchObject({ id: 'yksPuani', eski: '380,5' });
    expect(p1.duzenleyen).toBe('Dr. Ali');

    const k2 = { ...k1, ...p1 };
    const { patch: p2 } = duzenlemeYamasi(k2, { telefon: '5559998877' }, 'Dr. Veli');
    expect(p2.duzenlemeGecmisi).toHaveLength(2); // önceki kayıt korunuyor
    expect(p2.duzenlemeGecmisi[1].kim).toBe('Dr. Veli');
  });

  it('birden çok alan tek düzenlemede', () => {
    const { patch, degisenler } = duzenlemeYamasi(
      kayit(),
      { yksPuani: '385,0', notOrtalamasi: '3,40' },
      'Dr. Ali'
    );
    expect(degisenler).toHaveLength(2);
    expect(patch.duzenlemeGecmisi[0].alanlar).toHaveLength(2);
  });

  it('boş/eksik girdide çökmez', () => {
    expect(duzenlemeYamasi(null, null, '').patch).toBe(null);
    expect(duzenlemeYamasi({}, {}, '').patch).toBe(null);
  });
});

describe('beyandanFarkliMi / beyanFarklari', () => {
  it('düzenlenmemiş kayıtta fark yok', () => {
    expect(beyandanFarkliMi(kayit(), 'yksPuani')).toBe(false);
    expect(beyanFarklari(kayit())).toEqual([]);
  });

  it('düzeltilen alan işaretlenir', () => {
    const k1 = kayit();
    const { patch } = duzenlemeYamasi(k1, { yksPuani: '385,0' }, 'Dr. Ali');
    const k2 = { ...k1, ...patch };
    expect(beyandanFarkliMi(k2, 'yksPuani')).toBe(true);
    expect(beyandanFarkliMi(k2, 'telefon')).toBe(false);
    expect(beyanFarklari(k2)).toEqual([
      { id: 'yksPuani', label: 'YKS puanı', beyan: '380,5', guncel: '385,0' },
    ]);
  });

  it('eski değere geri dönülürse fark kalmaz', () => {
    const k1 = kayit();
    const { patch } = duzenlemeYamasi(k1, { yksPuani: '385,0' }, 'Dr. Ali');
    const k2 = { ...k1, ...patch };
    const { patch: p2 } = duzenlemeYamasi(k2, { yksPuani: '380,5' }, 'Dr. Ali');
    const k3 = { ...k2, ...p2 };
    expect(beyandanFarkliMi(k3, 'yksPuani')).toBe(false);
    // Geri dönüş de günlüğe yazılır — iz kaybolmaz.
    expect(k3.duzenlemeGecmisi).toHaveLength(2);
  });

  it('izinli olmayan alan sorulursa false', () => {
    const k = { ...kayit(), ilkBeyan: {}, degerlendirme: 'x' };
    expect(beyandanFarkliMi(k, 'degerlendirme')).toBe(false);
  });
});

describe('duzenlemeFormu', () => {
  it('kayıttan yalnız izinli alanları doldurur', () => {
    const f = duzenlemeFormu(kayit());
    expect(Object.keys(f).sort()).toEqual(DUZENLENEBILIR_ALANLAR.map((a) => a.id).sort());
    expect(f.aktifUniversite).toBe('ODTÜ');
    expect(f.degerlendirme).toBeUndefined();
  });

  it('boş kayıtta tüm alanlar boş string', () => {
    const f = duzenlemeFormu(null);
    expect(f.yksPuani).toBe('');
  });
});
