import { describe, it, expect } from 'vitest';
import { gizliAlanProjeksiyonu, gizliAlanlariCikar } from '../server/lib/gizli-alanlar.js';
import { ogrenciOkumaKurali, ogrenciOkumasiSuz } from '../server/lib/ogrenci-okuma.js';

describe('yoklama gizli anahtarı genel okumadan çıkmaz', () => {
  it('liste okumasında sirr veritabanından okunmaz', () => {
    expect(gizliAlanProjeksiyonu('yoklama_oturumlari')).toEqual({ sirr: 0 });
  });

  it('tek belge okumasında sirr düşer, diğer alanlar kalır', () => {
    const b = { id: 'yk-1', dersId: 'd1', sirr: 'gizli', acik: true };
    gizliAlanlariCikar(b, 'yoklama_oturumlari');
    expect(b).toEqual({ id: 'yk-1', dersId: 'd1', acik: true });
  });

  it('başka koleksiyonlara dokunulmaz', () => {
    expect(gizliAlanProjeksiyonu('students')).toBeNull();
    const b = { sirr: 'x' };
    gizliAlanlariCikar(b, 'students');
    expect(b.sirr).toBe('x');
  });
});

describe('yoklama kayıtları öğrencinin kendisine daralır', () => {
  it('başkasının katılım kaydı düşer', () => {
    const kural = ogrenciOkumaKurali('yoklama_kayitlari');
    const suz = ogrenciOkumasiSuz(
      [
        { studentNumber: '111111111', durum: 'var' },
        { studentNumber: '222222222', durum: 'var' },
      ],
      kural,
      { no: ['111111111'], ad: '', bolum: '' }
    );
    expect(suz).toEqual([{ studentNumber: '111111111', durum: 'var' }]);
  });
});
