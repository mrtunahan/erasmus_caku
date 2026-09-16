import { describe, it, expect } from 'vitest';
import {
  anketOzeti,
  dagilim,
  genelOrtalama,
  gunlukKatilim,
  irakCizilebilirMi,
  kutuplasmaVarMi,
  metinYanitlari,
  olcekSiraliMi,
  sayisalOzet,
  soruKarsilastirmasi,
  soruRenkleri,
  ucOranlari,
  yanitDegerleri,
} from '../lib/anket-istatistik.js';

const likert = { id: 'q1', type: 'likert', text: 'Program yeterliydi.' };
const yanit = (v, ek) => ({ answers: { q1: v }, ...(ek || {}) });

describe('yanitDegerleri', () => {
  it('düz değeri tek elemanlı diziye çevirir', () => {
    expect(yanitDegerleri('4')).toEqual(['4']);
  });

  it('diziyi olduğu gibi temizler', () => {
    expect(yanitDegerleri(['a', '', 'b'])).toEqual(['a', 'b']);
  });

  it('boş hücre boş dizidir', () => {
    expect(yanitDegerleri(null)).toEqual([]);
    expect(yanitDegerleri('')).toEqual([]);
    expect(yanitDegerleri([])).toEqual([]);
  });
});

describe('dagilim', () => {
  it('şıkları sayar ve oranlar', () => {
    const d = dagilim([yanit('5'), yanit('5'), yanit('1')], likert);
    expect(d.yanitlayan).toBe(3);
    expect(d.secenekler.find((o) => o.deger === '5').sayi).toBe(2);
    expect(d.secenekler.find((o) => o.deger === '5').oran).toBeCloseTo(2 / 3);
    expect(d.secenekler.find((o) => o.deger === '3').sayi).toBe(0);
  });

  it('yanıtsızları ayrı sayar', () => {
    const d = dagilim([yanit('4'), yanit(''), {}], likert);
    expect(d.yanitlayan).toBe(1);
    expect(d.yanitsiz).toBe(2);
  });

  it('silinmiş şıkkın yanıtı dağılıma girmez', () => {
    const d = dagilim([yanit('9')], likert);
    expect(d.yanitlayan).toBe(0);
    expect(d.toplamIsaret).toBe(0);
  });

  it('çoklu seçimde kişi bir, işaret birden çok sayılır', () => {
    const soru = {
      id: 'q1',
      type: 'coklu',
      secenekler: [
        { deger: 'a', etiket: 'A' },
        { deger: 'b', etiket: 'B' },
      ],
    };
    const d = dagilim([{ answers: { q1: ['a', 'b'] } }, { answers: { q1: ['a'] } }], soru);
    expect(d.yanitlayan).toBe(2);
    expect(d.toplamIsaret).toBe(3);
    expect(d.secenekler[0].sayi).toBe(2);
  });

  it('yanıt yokken sıfıra bölmez', () => {
    const d = dagilim([], likert);
    expect(d.yanitlayan).toBe(0);
    d.secenekler.forEach((o) => expect(o.oran).toBe(0));
  });
});

describe('sayisalOzet', () => {
  it('ortalama, medyan, mod ve sapmayı verir', () => {
    const o = sayisalOzet([yanit('1'), yanit('3'), yanit('3'), yanit('5')], likert);
    expect(o.n).toBe(4);
    expect(o.ortalama).toBe(3);
    expect(o.medyan).toBe(3);
    expect(o.mod).toBe(3);
    expect(o.stdSapma).toBeCloseTo(Math.sqrt(2), 5);
    expect(o.enAz).toBe(1);
    expect(o.enCok).toBe(5);
    expect(o.olcekAlt).toBe(1);
    expect(o.olcekUst).toBe(5);
  });

  it('çift sayıda yanıtta medyan ortalanır', () => {
    expect(sayisalOzet([yanit('2'), yanit('5')], likert).medyan).toBe(3.5);
  });

  it('sayısal olmayan ölçekte ortalama üretilmez', () => {
    const soru = { id: 'q1', type: 'yesno' };
    expect(sayisalOzet([{ answers: { q1: 'evet' } }], soru).n).toBe(0);
  });

  it('şıkları metin olan likert sorusu da sayısal değildir', () => {
    const soru = {
      id: 'q1',
      type: 'likert',
      secenekler: [
        { deger: 'az', etiket: 'Az' },
        { deger: 'çok', etiket: 'Çok' },
      ],
    };
    expect(sayisalOzet([{ answers: { q1: 'az' } }], soru).n).toBe(0);
  });

  it('yanıt yokken ölçek sınırları yine bildirilir', () => {
    const o = sayisalOzet([], likert);
    expect(o.n).toBe(0);
    expect(o.olcekUst).toBe(5);
  });

  it('mod beraberlikte küçük değeri seçer — ekran kararlı kalsın', () => {
    expect(sayisalOzet([yanit('2'), yanit('4')], likert).mod).toBe(2);
  });
});

describe('ucOranlari', () => {
  it('5’li ölçekte ilk iki / son iki şık kanatlardır', () => {
    const u = ucOranlari([yanit('1'), yanit('2'), yanit('3'), yanit('4'), yanit('5')], likert);
    expect(u.olumsuz).toBeCloseTo(0.4);
    expect(u.notr).toBeCloseTo(0.2);
    expect(u.olumlu).toBeCloseTo(0.4);
  });

  it('3’lü ölçekte kanat tek şıktır', () => {
    const soru = {
      id: 'q1',
      type: 'secenek',
      secenekler: [
        { deger: '1', etiket: 'A' },
        { deger: '2', etiket: 'B' },
        { deger: '3', etiket: 'C' },
      ],
    };
    const u = ucOranlari([{ answers: { q1: '1' } }, { answers: { q1: '3' } }], soru);
    expect(u.olumsuz).toBeCloseTo(0.5);
    expect(u.olumlu).toBeCloseTo(0.5);
    expect(u.notr).toBe(0);
  });

  it('çift şıkta nötr yoktur', () => {
    const soru = {
      id: 'q1',
      type: 'secenek',
      secenekler: ['1', '2', '3', '4'].map((d) => ({ deger: d, etiket: d })),
    };
    const u = ucOranlari([{ answers: { q1: '1' } }, { answers: { q1: '4' } }], soru);
    expect(u.notr).toBe(0);
  });

  it('yanıt yokken sıfır döner', () => {
    expect(ucOranlari([], likert).olumlu).toBe(0);
  });
});

describe('kutuplasmaVarMi', () => {
  it('uçlara yığılmış yanıtı işaretler', () => {
    const y = [...Array(5).fill(yanit('1')), ...Array(5).fill(yanit('5')), yanit('3')];
    expect(kutuplasmaVarMi(y, likert)).toBe(true);
  });

  it('ortada toplanmış yanıt kutuplaşma değildir', () => {
    expect(kutuplasmaVarMi(Array(10).fill(yanit('3')), likert)).toBe(false);
  });

  it('tek yöne yığılmış yanıt kutuplaşma değildir', () => {
    expect(kutuplasmaVarMi(Array(10).fill(yanit('5')), likert)).toBe(false);
  });

  it('az yanıtta gürültü kutuplaşma sayılmaz', () => {
    expect(kutuplasmaVarMi([yanit('1'), yanit('5')], likert)).toBe(false);
  });
});

describe('soruKarsilastirmasi', () => {
  const sorular = [
    { id: 'a', type: 'likert', text: 'A' },
    { id: 'b', type: 'likert', text: 'B' },
    { id: 'c', type: 'textarea', text: 'C' },
  ];
  const yanitlar = [{ answers: { a: '5', b: '2', c: 'yorum' } }, { answers: { a: '5', b: '1' } }];

  it('ortalamaya göre yüksekten düşüğe sıralar', () => {
    const r = soruKarsilastirmasi(sorular, yanitlar);
    expect(r.map((x) => x.id)).toEqual(['a', 'b']);
    expect(r[0].ortalama).toBe(5);
    expect(r[1].ortalama).toBe(1.5);
  });

  it('metin soruları listeye girmez', () => {
    expect(soruKarsilastirmasi(sorular, yanitlar).some((x) => x.id === 'c')).toBe(false);
  });

  it('oran, sorunun kendi ölçeğine göre 0..1 verir', () => {
    const r = soruKarsilastirmasi(sorular, yanitlar);
    expect(r[0].oran).toBe(1); // 5/5
    expect(r[1].oran).toBeCloseTo(0.125); // (1.5-1)/4
  });

  it('yanıtsız soru listeye girmez', () => {
    expect(soruKarsilastirmasi(sorular, [])).toEqual([]);
  });
});

describe('genelOrtalama', () => {
  it('yanıt sayısına göre ağırlıklandırır', () => {
    const sorular = [
      { id: 'a', type: 'likert' },
      { id: 'b', type: 'likert' },
    ];
    // a: 3 yanıt hep 5 · b: 1 yanıt 1 → ağırlıksız ortalama 3, ağırlıklı 4
    const yanitlar = [
      { answers: { a: '5', b: '1' } },
      { answers: { a: '5' } },
      { answers: { a: '5' } },
    ];
    const g = genelOrtalama(sorular, yanitlar);
    expect(g.n).toBe(4);
    expect(g.besUzerinden).toBeCloseTo(4);
  });

  it('sayısal soru yoksa sıfır döner', () => {
    expect(genelOrtalama([{ id: 'a', type: 'textarea' }], []).soruSayisi).toBe(0);
  });
});

describe('gunlukKatilim', () => {
  it('günleri sayar ve tarih sırasına koyar', () => {
    const r = gunlukKatilim([
      { submittedAt: '2026-09-02T10:00:00Z' },
      { submittedAt: '2026-09-01T09:00:00Z' },
      { submittedAt: '2026-09-02T12:00:00Z' },
    ]);
    expect(r).toEqual([
      { gun: '2026-09-01', sayi: 1 },
      { gun: '2026-09-02', sayi: 2 },
    ]);
  });

  it('aradaki boş günleri doldurur — zaman yalan söylemesin', () => {
    const r = gunlukKatilim([
      { submittedAt: '2026-09-01T00:00:00Z' },
      { submittedAt: '2026-09-04T00:00:00Z' },
    ]);
    expect(r.map((x) => x.gun)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']);
    expect(r[1].sayi).toBe(0);
  });

  it('tarihsiz yanıt atlanır', () => {
    expect(gunlukKatilim([{}, { submittedAt: 'bozuk' }])).toEqual([]);
  });
});

describe('metinYanitlari', () => {
  it('boş olanları atar', () => {
    const soru = { id: 'q1', type: 'textarea' };
    expect(
      metinYanitlari([{ answers: { q1: 'iyi' } }, { answers: { q1: '  ' } }, {}], soru)
    ).toEqual(['iyi']);
  });
});

describe('anketOzeti', () => {
  const survey = {
    questions: [
      { id: 'a', type: 'likert', text: 'A' },
      { id: 'b', type: 'likert', text: 'B' },
      { id: 'c', type: 'textarea', text: 'C' },
    ],
  };
  const yanitlar = [
    { submittedAt: '2026-09-01T10:00:00Z', answers: { a: '5', b: '1', c: 'yorum' } },
    { submittedAt: '2026-09-03T10:00:00Z', answers: { a: '4', b: '2' } },
  ];

  it('tepe sayılarını verir', () => {
    const o = anketOzeti(survey, yanitlar);
    expect(o.yanitSayisi).toBe(2);
    expect(o.sonTarih).toBe('2026-09-03');
    expect(o.yorumSayisi).toBe(1);
    expect(o.enYuksek.id).toBe('a');
    expect(o.enDusuk.id).toBe('b');
  });

  it('sayısal soru yoksa ortalama null’dur — “—” yazılsın', () => {
    expect(anketOzeti({ questions: [{ id: 'c', type: 'textarea' }] }, []).genelOrtalama).toBe(null);
  });
});

describe('grafik biçimi ve renkleri', () => {
  it('2–5 şıklı sayısal ölçek ırak çubukla çizilir', () => {
    expect(irakCizilebilirMi({ type: 'likert' })).toBe(true);
    expect(
      irakCizilebilirMi({
        type: 'secenek',
        secenekler: ['1', '2', '3'].map((d) => ({ deger: d, etiket: d })),
      })
    ).toBe(true);
  });

  it('sırasız ölçek ırak çizilmez', () => {
    expect(irakCizilebilirMi({ type: 'yesno' })).toBe(false);
    expect(irakCizilebilirMi({ type: 'hoursRange' })).toBe(false);
  });

  it('altı ve üstü şıkta renk kanalı taşımaz — tek hue’ya düşer', () => {
    const soru = {
      type: 'secenek',
      secenekler: ['1', '2', '3', '4', '5', '6'].map((d) => ({ deger: d, etiket: d })),
    };
    expect(irakCizilebilirMi(soru)).toBe(false);
    expect(new Set(soruRenkleri(soru)).size).toBe(1);
  });

  it('ırak rampa şık sayısı kadar renk verir', () => {
    expect(soruRenkleri({ type: 'likert' })).toHaveLength(5);
    expect(soruRenkleri({ type: 'likert' })[0]).toBe('#8f2525');
    expect(soruRenkleri({ type: 'likert' })[4]).toBe('#184f95');
  });

  it('renkler kopya döner — çağıran rampayı bozamaz', () => {
    const a = soruRenkleri({ type: 'likert' });
    a[0] = '#000000';
    expect(soruRenkleri({ type: 'likert' })[0]).toBe('#8f2525');
  });
});

// ── Sıralı / sırasız ayrımı ──
// ⚠ İlk sürümde bu denetim yoktu: "yarısı web sitesi, yarısı sosyal medya
// dedi" sırasız bir dağılımdır ama ekran "yanıtlar iki uca ayrışmış" diye
// kutuplaşma uyarısı basıyordu.
describe('olcekSiraliMi', () => {
  const sirasiz = {
    id: 'q1',
    type: 'secenek',
    secenekler: [
      { deger: 'web', etiket: 'Web sitesi' },
      { deger: 'sosyal', etiket: 'Sosyal medya' },
      { deger: 'arkadas', etiket: 'Arkadaşım' },
      { deger: 'hoca', etiket: 'Hocam' },
    ],
  };

  it('sayısal değerli ölçek sıralıdır', () => {
    expect(olcekSiraliMi({ type: 'likert' })).toBe(true);
  });

  it('metin değerli şık listesi sırasızdır', () => {
    expect(olcekSiraliMi(sirasiz)).toBe(false);
  });

  it('açık `sirali` bayrağı sezgiyi ezer', () => {
    expect(olcekSiraliMi({ ...sirasiz, sirali: true })).toBe(true);
    expect(olcekSiraliMi({ type: 'likert', sirali: false })).toBe(false);
  });

  it('sırasız soruda kutuplaşma uyarısı çıkmaz', () => {
    const y = [
      ...Array(6).fill({ answers: { q1: 'web' } }),
      ...Array(6).fill({ answers: { q1: 'hoca' } }),
    ];
    expect(kutuplasmaVarMi(y, sirasiz)).toBe(false);
  });

  it('sırasız soruda üst uç / alt uç hesaplanmaz', () => {
    const u = ucOranlari([{ answers: { q1: 'web' } }], sirasiz);
    expect(u.olumlu).toBe(0);
    expect(u.olumsuz).toBe(0);
  });

  it('sırasız soru ırak çubukla çizilmez', () => {
    expect(irakCizilebilirMi(sirasiz)).toBe(false);
  });

  it('sıralı işaretlenmiş metin ölçeği ırak çubukla çizilir', () => {
    const soru = {
      type: 'secenek',
      sirali: true,
      secenekler: [
        { deger: 'az', etiket: 'Az' },
        { deger: 'orta', etiket: 'Orta' },
        { deger: 'cok', etiket: 'Çok' },
      ],
    };
    expect(irakCizilebilirMi(soru)).toBe(true);
    expect(soruRenkleri(soru)).toHaveLength(3);
  });
});
