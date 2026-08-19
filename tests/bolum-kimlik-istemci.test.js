// İstemci tarafındaki bölüm kimliği çözümü.
//
// Çekirdek 6 bölüm koda slug ile gömülü ('bilgisayar'); DB'deki aynı bölümün
// kimliği ObjectId. app-shell açılışta gömülü kaydı DB'yle zenginleştirip
// `kimlikler` dizisini dolduruyor. Ham eşitlik bu iki biçimi farklı bölüm
// sanıyordu — anket ataması, şablon çözümü ve akademisyen eşleşmesi bu
// yüzden bozulmuştu.
import { describe, it, expect } from 'vitest';
import { bolumKimlikleri, ayniBolum } from '../lib/bolum-kimlik.js';

const BOLUMLER = [
  // Zenginleştirilmiş gömülü kayıt: slug kimliğini korur, DB kimliklerini de taşır.
  { id: 'bilgisayar', name: 'Bilgisayar Mühendisliği', kimlikler: ['bilgisayar', '64aa01', 'BLM'] },
  // Yalnız DB'den gelen bölüm.
  { id: '64aa02', name: 'Makine ve Metal Tek.', kimlikler: ['64aa02', 'makine-metal'] },
  // Henüz zenginleşmemiş (DB okunmadan önceki hâl).
  { id: 'kimya', name: 'Kimya Mühendisliği' },
];

describe('bolumKimlikleri', () => {
  it('slug’dan TÜM kimlikleri verir', () => {
    expect(bolumKimlikleri(BOLUMLER, 'bilgisayar').sort()).toEqual(
      ['64aa01', 'BLM', 'bilgisayar'].sort()
    );
  });

  it('DB kimliğinden de aynı kümeyi verir — yön fark etmez', () => {
    expect(bolumKimlikleri(BOLUMLER, '64aa01').sort()).toEqual(
      ['64aa01', 'BLM', 'bilgisayar'].sort()
    );
  });

  it('kimlikler dizisi yoksa kaydın kendi kimliği döner', () => {
    expect(bolumKimlikleri(BOLUMLER, 'kimya')).toEqual(['kimya']);
  });

  it('listede olmayan kimlik KENDİSİYLE döner — süzgeç boşa düşmesin', () => {
    expect(bolumKimlikleri(BOLUMLER, 'tanimsiz')).toEqual(['tanimsiz']);
  });

  it('boş girdide boş liste', () => {
    expect(bolumKimlikleri(BOLUMLER, '')).toEqual([]);
    expect(bolumKimlikleri(null, 'bilgisayar')).toEqual(['bilgisayar']);
  });
});

describe('ayniBolum', () => {
  it('slug ile DB kimliği AYNI bölümdür', () => {
    expect(ayniBolum('bilgisayar', '64aa01', BOLUMLER)).toBe(true);
    expect(ayniBolum('64aa01', 'bilgisayar', BOLUMLER)).toBe(true);
    expect(ayniBolum('BLM', '64aa01', BOLUMLER)).toBe(true);
  });

  it('farklı bölümleri ayırır', () => {
    expect(ayniBolum('bilgisayar', '64aa02', BOLUMLER)).toBe(false);
    expect(ayniBolum('bilgisayar', 'kimya', BOLUMLER)).toBe(false);
  });

  it('birebir aynı metin her zaman aynıdır', () => {
    expect(ayniBolum('tanimsiz', 'tanimsiz', BOLUMLER)).toBe(true);
  });

  it('boş kimlik hiçbir şeye eşit değildir', () => {
    expect(ayniBolum('', '', BOLUMLER)).toBe(false);
    expect(ayniBolum('bilgisayar', '', BOLUMLER)).toBe(false);
  });
});
