import { describe, it, expect } from 'vitest';
import { gozetmenYazmaKarari, oncekiListe } from '../server/lib/gozetmen-yazma.js';

const BOLUM_KAPSAMI = { kapsamTuru: 'bolum', departmentIds: ['bil', '65f0aaaa'] };
const FAKULTE_KAPSAMI = { kapsamTuru: 'fakulte', departmentIds: ['bil', '65f0aaaa', 'mak'] };
const op = (data, type = 'update') => ({ collection: 'professors', type, docId: 'p', data });

describe('gozetmenYazmaKarari', () => {
  it('alan yoksa karışmaz', () => {
    const o = op({ email: 'x@y' });
    expect(gozetmenYazmaKarari({ op: o, flags: {} }).izin).toBe(true);
    expect(o.data).toEqual({ email: 'x@y' });
  });

  it('roles sunucuda listeden hesaplanır, diğer roller korunur', () => {
    const o = op({ gozetmenBolumleri: ['bil', 'bil', ''], roles: ['x'] });
    const r = gozetmenYazmaKarari({ op: o, mevcut: {}, flags: { uniAdmin: true } });
    expect(r.izin).toBe(true);
    expect(o.data).toEqual({ gozetmenBolumleri: ['bil'], roles: ['x', 'gozetmen'] });
    const bos = op({ gozetmenBolumleri: [] });
    gozetmenYazmaKarari({ op: bos, mevcut: { roles: ['gozetmen', 'y'] }, flags: { admin: true } });
    expect(bos.data.roles).toEqual(['y']);
  });

  it('bölüm yetkilisi kendi bölümüne kendi akademisyenini ekler', () => {
    const r = gozetmenYazmaKarari({
      op: op({ gozetmenBolumleri: ['bil'] }),
      mevcut: { departmentId: '65f0aaaa' },
      flags: {},
      bolumYetkilisi: true,
      kapsam: BOLUM_KAPSAMI,
    });
    expect(r.izin).toBe(true);
  });

  it('bölüm yetkilisi başka bölümün akademisyenini EKLEYEMEZ', () => {
    const r = gozetmenYazmaKarari({
      op: op({ gozetmenBolumleri: ['bil'] }),
      mevcut: { departmentId: 'mak' },
      flags: { deptManager: true },
      kapsam: BOLUM_KAPSAMI,
    });
    expect(r.izin).toBe(false);
    expect(r.hata).toMatch(/fakülte yetkilisi/);
  });

  it('bölüm yetkilisi başka bölümün listesine dokunamaz', () => {
    const r = gozetmenYazmaKarari({
      op: op({ gozetmenBolumleri: [] }),
      mevcut: { departmentId: 'bil', gozetmenBolumleri: ['mak'] },
      flags: {},
      bolumYetkilisi: true,
      kapsam: BOLUM_KAPSAMI,
    });
    expect(r.izin).toBe(false);
  });

  it('bölüm yetkilisi, başkasının atadığı kişiyi kendi listesinden çıkarabilir', () => {
    const r = gozetmenYazmaKarari({
      op: op({ gozetmenBolumleri: ['mak'] }),
      mevcut: { departmentId: 'mak', gozetmenBolumleri: ['mak', 'bil'] },
      flags: {},
      bolumYetkilisi: true,
      kapsam: BOLUM_KAPSAMI,
    });
    expect(r.izin).toBe(true);
  });

  it('eski kayıt: ek bölümler korunarak kendi bölümü çıkarılır', () => {
    const mevcut = { departmentId: 'bil', additionalDepartments: ['mak'], roles: ['gozetmen'] };
    expect(oncekiListe(mevcut)).toEqual(['bil', 'mak']);
    const r = gozetmenYazmaKarari({
      op: op({ gozetmenBolumleri: ['mak'] }),
      mevcut,
      flags: {},
      bolumYetkilisi: true,
      kapsam: BOLUM_KAPSAMI,
    });
    expect(r.izin).toBe(true);
  });

  it('fakülte yetkilisi başka bölümden akademisyeni istediği bölüme verir', () => {
    const r = gozetmenYazmaKarari({
      op: op({ gozetmenBolumleri: ['bil'] }),
      mevcut: { departmentId: 'mak' },
      flags: { facManager: true },
      kapsam: FAKULTE_KAPSAMI,
    });
    expect(r.izin).toBe(true);
  });

  it('fakülte yetkilisi başka fakültenin bölümüne atayamaz', () => {
    const r = gozetmenYazmaKarari({
      op: op({ gozetmenBolumleri: ['hukuk'] }),
      mevcut: { departmentId: 'mak' },
      flags: { facManager: true },
      kapsam: FAKULTE_KAPSAMI,
    });
    expect(r.izin).toBe(false);
    expect(r.hata).toMatch(/fakültenizin/);
  });

  it('yetkisiz kullanıcı değiştiremez; değişiklik yoksa serbest', () => {
    const mevcut = { gozetmenBolumleri: ['bil'] };
    expect(
      gozetmenYazmaKarari({ op: op({ gozetmenBolumleri: [] }), mevcut, flags: {}, kapsam: {} }).izin
    ).toBe(false);
    expect(
      gozetmenYazmaKarari({ op: op({ gozetmenBolumleri: ['bil'] }), mevcut, flags: {}, kapsam: {} })
        .izin
    ).toBe(true);
  });

  it('yeni kayıt (add): bölüm yetkilisi kendi bölümüne açabilir', () => {
    const r = gozetmenYazmaKarari({
      op: op({ name: 'Yeni', departmentId: 'bil', gozetmenBolumleri: ['bil'] }, 'add'),
      mevcut: null,
      flags: {},
      bolumYetkilisi: true,
      kapsam: BOLUM_KAPSAMI,
    });
    expect(r.izin).toBe(true);
  });
});
