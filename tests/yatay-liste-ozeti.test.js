import { describe, it, expect } from 'vitest';
import { belgeDurumMetni, listeOzeti, ozetKutulari } from '../lib/yatay-liste-ozeti.js';

const kayit = (d, ek) => ({
  degerlendirme: d,
  degerlendirmeSinif: '2',
  degerlendirmeSira: '1',
  ...(ek || {}),
});

describe('listeOzeti', () => {
  const liste = [
    kayit('uygun_asil'),
    kayit('uygun_asil'),
    kayit('uygun_yedek'),
    kayit('uygun_degil'),
    kayit(''),
  ];

  it('sonuçlara göre sayar', () => {
    const o = listeOzeti(liste, '');
    expect(o).toMatchObject({
      toplam: 5,
      degerlendirilen: 4,
      bekleyen: 1,
      asil: 2,
      yedek: 1,
      uygunDegil: 1,
    });
  });

  it('hepsi değerlendirilince belge hazır', () => {
    expect(listeOzeti(liste, '').belgeHazir).toBe(false);
    expect(listeOzeti(liste.slice(0, 4), '').belgeHazir).toBe(true);
  });

  // ⚠ Kayıtta "asil" yazması yetmez: taban başarı sıralaması şartını
  // karşılamayan aday, eski bir sıralamadan kalmış olsa da uygun değildir.
  // Tepe sayısı ile kartın söylediği aynı olmalı.
  it('taban sıralama şartını karşılamayan kayıt ASİL sayılmaz', () => {
    const geride = [kayit('uygun_asil', { yksBasariSirasi: '350.000' })];
    const o = listeOzeti(geride, '300.000');
    expect(o.asil).toBe(0);
    expect(o.uygunDegil).toBe(1);
    expect(o.cakisan).toBe(1);
  });

  it('eşik boşsa kriter uygulanmaz', () => {
    const o = listeOzeti([kayit('uygun_asil', { yksBasariSirasi: '350.000' })], '');
    expect(o.asil).toBe(1);
    expect(o.cakisan).toBe(0);
  });

  it('değerlendirme oranı ilerleme çubuğunu besler', () => {
    expect(listeOzeti(liste, '').oran).toBe(0.8);
  });

  it('boş listede çökmez ve belge hazır DEĞİL', () => {
    const o = listeOzeti([], '');
    expect(o.toplam).toBe(0);
    expect(o.oran).toBe(0);
    expect(o.belgeHazir).toBe(false);
    expect(listeOzeti(null, '').toplam).toBe(0);
  });
});

describe('ozetKutulari', () => {
  it('beş kutu, sırası sabit', () => {
    const k = ozetKutulari(listeOzeti([kayit('uygun_asil')], ''));
    expect(k.map((x) => x.id)).toEqual(['toplam', 'bekleyen', 'asil', 'yedek', 'uygunDegil']);
    expect(k[0].deger).toBe(1);
  });

  it('bekleyen varsa kutusu vurgulanır', () => {
    expect(ozetKutulari(listeOzeti([kayit('')], '')).find((x) => x.id === 'bekleyen').ton).toBe(
      'bekleyen'
    );
    expect(
      ozetKutulari(listeOzeti([kayit('uygun_asil')], '')).find((x) => x.id === 'bekleyen').ton
    ).toBe('notr');
  });

  it('özet yoksa sıfırlarla çizilir', () => {
    expect(ozetKutulari(null).every((k) => k.deger === 0)).toBe(true);
  });
});

describe('belgeDurumMetni', () => {
  it('hazırsa kaç başvuru olduğunu söyler', () => {
    expect(belgeDurumMetni(listeOzeti([kayit('uygun_asil')], ''))).toMatch(
      /Tüm başvurular değerlendirildi — 1 başvuru/
    );
  });

  it('hazır değilse kaç tanesinin beklediğini söyler', () => {
    expect(belgeDurumMetni(listeOzeti([kayit(''), kayit('uygun_asil')], ''))).toMatch(
      /^1 başvuru henüz değerlendirilmedi/
    );
  });

  it('başvuru yoksa ayrı cümle', () => {
    expect(belgeDurumMetni(listeOzeti([], ''))).toBe('Bu geçiş türünde başvuru yok.');
  });
});
