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

// ── GİDİŞ ONAYA GİRMEZ ──
// Öğrenim anlaşması gitmeden önce imzalanır; dönüşte yeniden onaya
// düşürmek akademisyene çoktan bitmiş işi geri getiriyordu.
describe('onayaTabiMi', () => {
  it('yalnız dönüş tarafı onaydan geçer', () => {
    expect(onayaTabiMi('return')).toBe(true);
    expect(onayaTabiMi('outgoing')).toBe(false);
    expect(onayaTabiMi('')).toBe(false);
    expect(onayaTabiMi(undefined)).toBe(false);
  });
});

describe('onayDamgasi — onaySart', () => {
  it('öğrencinin eklediği YENİ gidiş eşleştirmesi onaya düşmez', () => {
    const [m] = onayDamgasi([{ id: 'g9' }], new Set(), true, onayaTabiMi('outgoing'));
    expect(m.status).toBe('approved');
  });

  it('öğrencinin eklediği YENİ dönüş eşleştirmesi onaya düşer', () => {
    const [m] = onayDamgasi([{ id: 'd9' }], new Set(), true, onayaTabiMi('return'));
    expect(m.status).toBe('pending');
  });

  it('akademisyenin verdiği karar her iki türde de korunur', () => {
    const [m] = onayDamgasi([{ id: 'd1', status: 'rejected' }], new Set(), true, true);
    expect(m.status).toBe('rejected');
  });
});

describe('onayBekleyenler', () => {
  it('kuyruğa yalnız bekleyen DÖNÜŞ eşleştirmeleri girer', () => {
    const kayit = {
      outgoingMatches: [{ id: 'g1', status: 'pending' }, { id: 'g2' }],
      returnMatches: [
        { id: 'd1', status: 'pending' },
        { id: 'd2', status: 'approved' },
        { id: 'd3' },
      ],
    };
    // g1 eski hatalı damgayı taşıyor olsa bile kuyruğa girmez.
    expect(onayBekleyenler(kayit).map((m) => m.id)).toEqual(['d1']);
  });

  it('boş kayıtta çökmez', () => {
    expect(onayBekleyenler(null)).toEqual([]);
    expect(onayBekleyenler({})).toEqual([]);
  });
});
