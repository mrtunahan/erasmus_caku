// Eşleştirme onay damgası.
//
// Şikâyet: "öğrenci dersleri onaya gönderdikten sonra gidiş tarafını tekrar
// onaya gönderdi, oysa buna gerek yok." Sebep, `status` alanının yokluğunun
// iki yerde iki farklı okunmasıydı.
import { describe, it, expect } from 'vitest';
import {
  onayDamgasi,
  mevcutEslesmeIdleri,
  onayaTabiMi,
  onayBekleyenler,
} from '../lib/erasmus-onay.js';

describe('onayDamgasi', () => {
  it('ÖNCEDEN VAR OLAN durumsuz eşleştirme onaya DÜŞMEZ — asıl arıza', () => {
    const onceki = new Set(['g1']);
    const sonuc = onayDamgasi([{ id: 'g1' }], onceki, true);
    expect(sonuc[0].status).toBe('approved');
  });

  it('öğrencinin YENİ eklediği eşleştirme onaya düşer', () => {
    const sonuc = onayDamgasi([{ id: 'yeni' }], new Set(['g1']), true);
    expect(sonuc[0].status).toBe('pending');
  });

  it('akademisyenin eklediği doğrudan onaylıdır', () => {
    expect(onayDamgasi([{ id: 'yeni' }], new Set(), false)[0].status).toBe('approved');
  });

  it('mevcut durum KORUNUR — onay/red ezilmez', () => {
    const sonuc = onayDamgasi(
      [
        { id: 'a', status: 'rejected' },
        { id: 'b', status: 'pending' },
      ],
      new Set(['a', 'b']),
      true
    );
    expect(sonuc[0].status).toBe('rejected');
    expect(sonuc[1].status).toBe('pending');
  });

  it('dönüş notu gönderirken GİDİŞ tarafı olduğu gibi kalır', () => {
    // Canlıdaki tam senaryo: 5 gidiş + 5 dönüş, hiçbirinde status yok,
    // hepsi kayıtta zaten var. Öğrenci kaydettiğinde hiçbiri onaya düşmemeli.
    const gidis = [1, 2, 3, 4, 5].map((i) => ({ id: 'g' + i }));
    const donus = [1, 2, 3, 4, 5].map((i) => ({ id: 'd' + i }));
    const onceki = mevcutEslesmeIdleri({ outgoingMatches: gidis, returnMatches: donus });
    const hepsi = onayDamgasi([...gidis, ...donus], onceki, true);
    expect(hepsi.filter((m) => m.status === 'pending')).toHaveLength(0);
  });

  it('kimliksiz kayıt YENİ sayılır', () => {
    expect(onayDamgasi([{}], new Set(['g1']), true)[0].status).toBe('pending');
  });

  it('boş girdilerde çökmez', () => {
    expect(onayDamgasi(null, null, true)).toEqual([]);
    expect(onayDamgasi([null], new Set(), true)).toEqual([null]);
  });
});

describe('mevcutEslesmeIdleri', () => {
  it('gidiş ve dönüşün kimliklerini toplar', () => {
    const s = mevcutEslesmeIdleri({
      outgoingMatches: [{ id: 'g1' }],
      returnMatches: [{ id: 'd1' }, {}],
    });
    expect([...s].sort()).toEqual(['d1', 'g1']);
  });

  it('boş kayıtta boş küme', () => {
    expect(mevcutEslesmeIdleri(null).size).toBe(0);
  });
});

// ── İKİ TARAF DA ONAYA GİRER ──
// Gidiş eşleştirmesini öğrenci kurar: hangi ÇAKÜ dersinin karşılığında hangi
// dersi alacağını öneren odur. Bu öneri ders ders akademisyen onayından
// geçer; reddedilende sebep yazılır.
describe('onayaTabiMi', () => {
  it('gidiş ve dönüş tarafı onaydan geçer', () => {
    expect(onayaTabiMi('return')).toBe(true);
    expect(onayaTabiMi('outgoing')).toBe(true);
  });

  it('tanımsız tür onaya girmez', () => {
    expect(onayaTabiMi('')).toBe(false);
    expect(onayaTabiMi(undefined)).toBe(false);
    expect(onayaTabiMi('baska')).toBe(false);
  });
});

describe('onayDamgasi — onaySart', () => {
  it('öğrencinin eklediği YENİ gidiş eşleştirmesi onaya düşer', () => {
    const [m] = onayDamgasi([{ id: 'g9' }], new Set(), true, onayaTabiMi('outgoing'));
    expect(m.status).toBe('pending');
  });

  it('öğrencinin eklediği YENİ dönüş eşleştirmesi onaya düşer', () => {
    const [m] = onayDamgasi([{ id: 'd9' }], new Set(), true, onayaTabiMi('return'));
    expect(m.status).toBe('pending');
  });

  it('KAYITTA ZATEN VAR OLAN eşleştirme onaya DÜŞMEZ — eski işler geri gelmesin', () => {
    // Gidiş tarafını onaya açmanın eski hatayı geri getirmediğinin kanıtı:
    // durumu hiç yazılmamış ama kayıtta var olan eşleştirme onaylı sayılır.
    const [m] = onayDamgasi([{ id: 'g1' }], new Set(['g1']), true, onayaTabiMi('outgoing'));
    expect(m.status).toBe('approved');
  });

  it('akademisyenin eklediği eşleştirme doğrudan onaylıdır', () => {
    const [m] = onayDamgasi([{ id: 'g9' }], new Set(), false, onayaTabiMi('outgoing'));
    expect(m.status).toBe('approved');
  });

  it('akademisyenin verdiği karar her iki türde de korunur', () => {
    const [m] = onayDamgasi([{ id: 'd1', status: 'rejected' }], new Set(), true, true);
    expect(m.status).toBe('rejected');
  });
});

describe('onayBekleyenler', () => {
  it('kuyruğa iki taraftan da bekleyenler girer', () => {
    const kayit = {
      outgoingMatches: [{ id: 'g1', status: 'pending' }, { id: 'g2' }],
      returnMatches: [
        { id: 'd1', status: 'pending' },
        { id: 'd2', status: 'approved' },
        { id: 'd3' },
      ],
    };
    // Durumu yazılmamışlar (g2, d3) onaylı sayılır — kuyruğa girmez.
    expect(onayBekleyenler(kayit).map((m) => m.id)).toEqual(['g1', 'd1']);
  });

  it('boş kayıtta çökmez', () => {
    expect(onayBekleyenler(null)).toEqual([]);
    expect(onayBekleyenler({})).toEqual([]);
  });
});
