import { describe, it, expect } from 'vitest';
import {
  ANKET_OLCEKLERI,
  anketSecenekHatalari,
  cokluSecimMi,
  olcekKimligi,
  olcekSecenekleri,
  secenegiTasi,
  secenekEtiketi,
  secenekHatalari,
  secenekSayisi,
  secenekliMi,
  seceneklerSayisalMi,
  soruDegerleri,
  soruSecenekleri,
  tipDegisiminde,
  yeniSecenekDegeri,
} from '../lib/anket-secenek.js';

describe('soruSecenekleri', () => {
  it('likert gömülü beşli ölçeği verir', () => {
    const ops = soruSecenekleri({ type: 'likert' });
    expect(ops).toHaveLength(5);
    expect(ops[0]).toEqual({ deger: '1', etiket: 'Kesinlikle katılmıyorum' });
    expect(ops[4].etiket).toBe('Kesinlikle katılıyorum');
  });

  it('özel şıklar gömülü ölçeğin yerine geçer', () => {
    const ops = soruSecenekleri({
      type: 'likert',
      secenekler: [
        { deger: 'a', etiket: 'Az' },
        { deger: 'ç', etiket: 'Çok' },
      ],
    });
    expect(ops.map((o) => o.etiket)).toEqual(['Az', 'Çok']);
  });

  it('düz dize listesi de şık sayılır', () => {
    const ops = soruSecenekleri({ type: 'secenek', secenekler: ['Evet', 'Hayır'] });
    expect(ops).toEqual([
      { deger: 'Evet', etiket: 'Evet' },
      { deger: 'Hayır', etiket: 'Hayır' },
    ]);
  });

  it('eski `options` alanı da okunur', () => {
    expect(soruSecenekleri({ type: 'secenek', options: ['A', 'B'] })).toHaveLength(2);
  });

  it('boş özel liste gömülü ölçeği düşürmez', () => {
    expect(soruSecenekleri({ type: 'likert', secenekler: [] })).toHaveLength(5);
  });

  it('metin sorusunda şık yoktur', () => {
    expect(soruSecenekleri({ type: 'textarea' })).toEqual([]);
    expect(soruSecenekleri({ type: 'text' })).toEqual([]);
    expect(soruSecenekleri(null)).toEqual([]);
  });

  it('aynı değerli şık tekrar sayılmaz', () => {
    const ops = soruSecenekleri({
      type: 'secenek',
      secenekler: [
        { deger: '1', etiket: 'İlk' },
        { deger: '1', etiket: 'Kopya' },
        { deger: '2', etiket: 'İkinci' },
      ],
    });
    expect(ops).toHaveLength(2);
    expect(ops[0].etiket).toBe('İlk');
  });

  it('değeri olmayan şık etiketiyle anılır', () => {
    expect(soruSecenekleri({ type: 'secenek', secenekler: [{ etiket: 'Kararsızım' }] })).toEqual([
      { deger: 'Kararsızım', etiket: 'Kararsızım' },
    ]);
  });

  it('eski yesno/saat tipleri korunur', () => {
    expect(soruDegerleri({ type: 'yesno' })).toEqual(['evet', 'hayır']);
    expect(soruDegerleri({ type: 'hours0to5' })).toEqual(['0', '1', '2', '3', '4', '5']);
    expect(soruDegerleri({ type: 'hoursExam' })).toEqual([
      '0',
      '1-4',
      '5-8',
      '9-12',
      '13-16',
      '17-20',
    ]);
  });
});

describe('secenekliMi / cokluSecimMi', () => {
  it('kapalı uçlu tipler şıklıdır', () => {
    ['likert', 'yesno', 'hours0to5', 'secenek', 'coklu'].forEach((t) =>
      expect(secenekliMi({ type: t })).toBe(true)
    );
  });

  it('metin tipleri şıklı değildir', () => {
    expect(secenekliMi({ type: 'text' })).toBe(false);
    expect(secenekliMi({ type: 'textarea' })).toBe(false);
  });

  it('yalnız coklu birden çok işaretlenir', () => {
    expect(cokluSecimMi({ type: 'coklu' })).toBe(true);
    expect(cokluSecimMi({ type: 'secenek' })).toBe(false);
    expect(cokluSecimMi({ type: 'likert' })).toBe(false);
  });
});

describe('secenekEtiketi', () => {
  const soru = { type: 'likert' };

  it('değerin etiketini verir', () => {
    expect(secenekEtiketi(soru, '3')).toBe('Kararsızım');
  });

  it('silinmiş şıkta değer kaybolmaz', () => {
    expect(
      secenekEtiketi({ type: 'secenek', secenekler: [{ deger: 'a', etiket: 'A' }] }, 'z')
    ).toBe('z');
  });

  it('boş değer boş döner', () => {
    expect(secenekEtiketi(soru, '')).toBe('');
    expect(secenekEtiketi(soru, null)).toBe('');
  });
});

describe('seceneklerSayisalMi', () => {
  it('1..5 ölçeği sayısaldır', () => {
    expect(seceneklerSayisalMi({ type: 'likert' })).toBe(true);
  });

  it('metin şıkları sayısal değildir', () => {
    expect(seceneklerSayisalMi({ type: 'yesno' })).toBe(false);
    expect(seceneklerSayisalMi({ type: 'hoursRange' })).toBe(false);
  });

  it('tipe değil şıklara bakar', () => {
    // likert tipi ama şıkları metin → ortalama alınamaz
    expect(
      seceneklerSayisalMi({
        type: 'likert',
        secenekler: [
          { deger: 'evet', etiket: 'Evet' },
          { deger: 'hayır', etiket: 'Hayır' },
        ],
      })
    ).toBe(false);
    // secenek tipi ama şıkları sayı → ortalama alınır
    expect(
      seceneklerSayisalMi({
        type: 'secenek',
        secenekler: [
          { deger: '1', etiket: 'Az' },
          { deger: '2', etiket: 'Çok' },
        ],
      })
    ).toBe(true);
  });

  it('şıksız soru sayısal değildir', () => {
    expect(seceneklerSayisalMi({ type: 'secenek' })).toBe(false);
  });
});

describe('secenekSayisi', () => {
  it('sayıyı çözer, virgülü kabul eder', () => {
    expect(secenekSayisi('4')).toBe(4);
    expect(secenekSayisi('3,5')).toBe(3.5);
    expect(secenekSayisi('-1')).toBe(-1);
  });

  it('sayı olmayan null döner', () => {
    expect(secenekSayisi('evet')).toBe(null);
    expect(secenekSayisi('1-2')).toBe(null);
    expect(secenekSayisi('')).toBe(null);
  });
});

describe('hazır ölçekler', () => {
  it('katilim5 kullanıcının istediği ölçektir', () => {
    const ops = olcekSecenekleri('katilim5');
    expect(ops.map((o) => o.etiket)).toEqual([
      'Kesinlikle katılmıyorum',
      'Katılmıyorum',
      'Kararsızım',
      'Katılıyorum',
      'Kesinlikle katılıyorum',
    ]);
    expect(ops.map((o) => o.deger)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('kopya döner — düzenleme ölçeği bozmaz', () => {
    const a = olcekSecenekleri('katilim5');
    a[0].etiket = 'DEĞİŞTİ';
    expect(olcekSecenekleri('katilim5')[0].etiket).toBe('Kesinlikle katılmıyorum');
  });

  it('bilinmeyen ölçek boş döner', () => {
    expect(olcekSecenekleri('yok')).toEqual([]);
  });

  it('her ölçeğin en az iki şıkkı ve tekil kimliği var', () => {
    const idler = ANKET_OLCEKLERI.map((o) => o.id);
    expect(new Set(idler).size).toBe(idler.length);
    ANKET_OLCEKLERI.forEach((o) => expect(o.secenekler.length).toBeGreaterThan(1));
  });

  it('olcekKimligi birebir eşleşmeyi tanır', () => {
    expect(olcekKimligi({ type: 'likert' })).toBe('katilim5');
    expect(olcekKimligi({ type: 'secenek', secenekler: olcekSecenekleri('siklik5') })).toBe(
      'siklik5'
    );
  });

  it('bir etiketi değişirse artık hazır ölçek değildir', () => {
    const ops = olcekSecenekleri('katilim5');
    ops[2].etiket = 'Fikrim yok';
    expect(olcekKimligi({ type: 'secenek', secenekler: ops })).toBe('');
  });
});

describe('yeniSecenekDegeri', () => {
  it('sayısal listeyi sürdürür', () => {
    expect(yeniSecenekDegeri([{ deger: '1' }, { deger: '2' }, { deger: '3' }])).toBe('4');
  });

  it('boş listede 1 ile başlar', () => {
    expect(yeniSecenekDegeri([])).toBe('secenek1');
  });

  it('karışık listede çakışmayan ad üretir', () => {
    const d = yeniSecenekDegeri([{ deger: 'evet' }, { deger: 'hayır' }]);
    expect(['evet', 'hayır']).not.toContain(d);
  });

  it('boşluk açılmışsa üstten devam eder', () => {
    expect(yeniSecenekDegeri([{ deger: '1' }, { deger: '5' }])).toBe('6');
  });
});

describe('secenegiTasi', () => {
  const liste = [{ deger: 'a' }, { deger: 'b' }, { deger: 'c' }];

  it('yukarı taşır', () => {
    expect(secenegiTasi(liste, 1, -1).map((o) => o.deger)).toEqual(['b', 'a', 'c']);
  });

  it('aşağı taşır', () => {
    expect(secenegiTasi(liste, 0, +1).map((o) => o.deger)).toEqual(['b', 'a', 'c']);
  });

  it('sınır dışında liste değişmez', () => {
    expect(secenegiTasi(liste, 0, -1).map((o) => o.deger)).toEqual(['a', 'b', 'c']);
    expect(secenegiTasi(liste, 2, +1).map((o) => o.deger)).toEqual(['a', 'b', 'c']);
  });

  it('özgün liste değiştirilmez', () => {
    secenegiTasi(liste, 1, -1);
    expect(liste.map((o) => o.deger)).toEqual(['a', 'b', 'c']);
  });
});

describe('secenekHatalari', () => {
  it('sağlam soruda hata yok', () => {
    expect(secenekHatalari({ type: 'likert' })).toEqual([]);
  });

  it('şıksız kapalı uçlu soru yakalanır', () => {
    expect(secenekHatalari({ type: 'secenek' })[0]).toMatch(/hiç şık yok/i);
  });

  it('tek şık yakalanır', () => {
    expect(
      secenekHatalari({ type: 'secenek', secenekler: [{ deger: '1', etiket: 'Tek' }] })[0]
    ).toMatch(/en az iki şık/i);
  });

  it('boş etiket yakalanır', () => {
    const h = secenekHatalari({
      type: 'secenek',
      secenekler: [
        { deger: '1', etiket: 'Var' },
        { deger: '2', etiket: '  ' },
      ],
    });
    expect(h.join(' ')).toMatch(/etiketi boş/i);
  });

  it('yinelenen değer yakalanır', () => {
    const h = secenekHatalari({
      type: 'secenek',
      secenekler: [
        { deger: '1', etiket: 'A' },
        { deger: '1', etiket: 'B' },
      ],
    });
    expect(h.join(' ')).toMatch(/aynı değere/i);
  });

  it('metin sorusunda şık denetimi yapılmaz', () => {
    expect(secenekHatalari({ type: 'textarea' })).toEqual([]);
  });

  it('anketSecenekHatalari sorunlu soruların sırasını verir', () => {
    const r = anketSecenekHatalari([{ type: 'likert' }, { type: 'secenek' }, { type: 'text' }]);
    expect(r).toHaveLength(1);
    expect(r[0].index).toBe(1);
  });
});

describe('tipDegisiminde', () => {
  it('metin tipine geçişte şıklar düşer', () => {
    const s = tipDegisiminde(
      { type: 'secenek', secenekler: [{ deger: '1', etiket: 'A' }] },
      'textarea'
    );
    expect(s.type).toBe('textarea');
    expect(s.secenekler).toBeUndefined();
  });

  it('şıklı tipler arasında özel şıklar korunur', () => {
    const s = tipDegisiminde(
      { type: 'likert', secenekler: [{ deger: '1', etiket: 'A' }] },
      'coklu'
    );
    expect(s.secenekler).toHaveLength(1);
  });

  it('gömülü ölçekle çalışan soru yeni tipin varsayılanına geçer', () => {
    const s = tipDegisiminde({ type: 'likert' }, 'yesno');
    expect(s.secenekler).toBeUndefined();
    expect(soruDegerleri(s)).toEqual(['evet', 'hayır']);
  });

  it('özgün soru değiştirilmez', () => {
    const soru = { type: 'likert', secenekler: [{ deger: '1', etiket: 'A' }] };
    tipDegisiminde(soru, 'text');
    expect(soru.type).toBe('likert');
    expect(soru.secenekler).toHaveLength(1);
  });
});
