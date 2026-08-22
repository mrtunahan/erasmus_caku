// Mükerrer kayıt: hata mı, indeksin amacı mı?
//
// Canlı log: trip_history'ye aynı Erasmus eşleştirmesi ikinci kez
// yazılmaya çalışılınca E11000 fırlıyordu. Toplu yazmada bu, döngüyü
// kırıp KALAN eşleştirmelerin de yazılmamasına yol açıyordu.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { mukerrerHataMi, mukerrerAtlanabilirMi } = require('../server/lib/yazma-mukerrer.js');

const e11000 = () => Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
const sigli = { sigKey: '230905016|Bydgoszcz|{"type":"outgoing"}', type: 'outgoing' };

describe('mukerrerHataMi', () => {
  it('11000 benzersizlik ihlalidir', () => {
    expect(mukerrerHataMi(e11000())).toBe(true);
  });

  it('kod yalnız errorResponse altındaysa da yakalanır', () => {
    expect(mukerrerHataMi({ errorResponse: { code: 11000 } })).toBe(true);
  });

  it('başka hata değildir', () => {
    expect(mukerrerHataMi(new Error('bağlantı koptu'))).toBe(false);
    expect(mukerrerHataMi({ code: 121 })).toBe(false);
    expect(mukerrerHataMi(null)).toBe(false);
  });
});

describe('mukerrerAtlanabilirMi', () => {
  it('ASIL DURUM: sigKey taşıyan kaydın mükerreri sessizce atlanır', () => {
    expect(mukerrerAtlanabilirMi(e11000(), sigli)).toBe(true);
  });

  it('sigKey TAŞIMAYAN kaydın mükerreri atlanmaz — gerçek hatadır', () => {
    // students.studentNumber de benzersizdir; oradaki ihlal kullanıcıya
    // söylenmeli ("bu numarayla kayıt var"), yutulmamalı.
    expect(mukerrerAtlanabilirMi(e11000(), { studentNumber: '230905016' })).toBe(false);
  });

  it('boş ya da bozuk sigKey atlanmaya yetmez', () => {
    expect(mukerrerAtlanabilirMi(e11000(), { sigKey: '' })).toBe(false);
    expect(mukerrerAtlanabilirMi(e11000(), { sigKey: '   ' })).toBe(false);
    expect(mukerrerAtlanabilirMi(e11000(), { sigKey: 42 })).toBe(false);
  });

  it('mükerrer OLMAYAN hata sigKey olsa da atlanmaz', () => {
    expect(mukerrerAtlanabilirMi(new Error('disk dolu'), sigli)).toBe(false);
  });

  it('boş girdilerde çökmez', () => {
    expect(mukerrerAtlanabilirMi(null, null)).toBe(false);
    expect(mukerrerAtlanabilirMi(e11000(), null)).toBe(false);
  });
});
