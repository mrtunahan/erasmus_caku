import { describe, it, expect } from 'vitest';
import {
  bolumunMemurlari,
  memurAtamaAnahtari,
  memurAtamaKaydi,
  memurAtamasi,
  memurBolumleri,
  memurModulleri,
  memurStajYetkilisiMi,
} from '../lib/memur-atama.js';

const ATAMALAR = [
  { departmentId: 'bilgisayar', memurId: 'm1', modules: ['staj', 'erasmus'] },
  { departmentId: 'makine', memurId: 'm1', modules: ['muafiyet'] },
  { departmentId: 'bilgisayar', memurId: 'm2', modules: ['sinav'] },
  // Modülü kalmamış atama: bölüm memuru fiilen çıkarmış
  { departmentId: 'orman-muh', memurId: 'm1', modules: [] },
];

describe('memurAtamaAnahtari', () => {
  it('bölüm ve memur birlikte anahtardır', () => {
    expect(memurAtamaAnahtari('bilgisayar', 'm1')).toBe('bilgisayar::m1');
    expect(memurAtamaAnahtari('makine', 'm1')).not.toBe(memurAtamaAnahtari('bilgisayar', 'm1'));
  });
});

describe('memurModulleri', () => {
  it('her bölüm KENDİ atamasını görür', () => {
    // Bildirilen model: bir bölümün ataması diğerinde geçerli olmamalı.
    expect(memurModulleri(ATAMALAR, 'bilgisayar', 'm1')).toEqual(['staj', 'erasmus']);
    expect(memurModulleri(ATAMALAR, 'makine', 'm1')).toEqual(['muafiyet']);
  });

  it('atanmamış bölümde modül yoktur', () => {
    expect(memurModulleri(ATAMALAR, 'peyzaj', 'm1')).toEqual([]);
  });

  it('atama kaydı yoksa eski düz liste geriye dönük kullanılır', () => {
    expect(memurModulleri([], 'bilgisayar', 'm1', ['staj'])).toEqual(['staj']);
  });

  it('atama kaydı VARSA eski liste yok sayılır — bölümün kararı esastır', () => {
    expect(memurModulleri(ATAMALAR, 'makine', 'm1', ['staj', 'erasmus'])).toEqual(['muafiyet']);
  });

  it('bölüm memuru çıkardıysa (boş modül) hiçbir şey görmez', () => {
    expect(memurModulleri(ATAMALAR, 'orman-muh', 'm1', ['staj'])).toEqual([]);
  });
});

describe('memurBolumleri', () => {
  it('memur yalnız kendisini EKLEYEN bölümleri görür', () => {
    expect(memurBolumleri(ATAMALAR, 'm1')).toEqual(['bilgisayar', 'makine']);
    expect(memurBolumleri(ATAMALAR, 'm2')).toEqual(['bilgisayar']);
  });

  it('modülü kalmamış atama bölüm listesine girmez', () => {
    expect(memurBolumleri(ATAMALAR, 'm1')).not.toContain('orman-muh');
  });

  it('atanmamış memurun bölümü yoktur', () => {
    expect(memurBolumleri(ATAMALAR, 'm9')).toEqual([]);
    expect(memurBolumleri([], 'm1')).toEqual([]);
  });
});

describe('memurStajYetkilisiMi', () => {
  it('herhangi bir bölüm staj atadıysa fakülte çapında staj yetkilisidir', () => {
    // SGK onayı tek elden verilir; staj bilerek fakülte düzeyinde kalır.
    expect(memurStajYetkilisiMi(ATAMALAR, 'm1')).toBe(true);
  });

  it('hiçbir bölüm staj atamadıysa yetkili değildir', () => {
    expect(memurStajYetkilisiMi(ATAMALAR, 'm2')).toBe(false);
  });

  it('staj kaldırılınca yetki düşer', () => {
    const sonra = [{ departmentId: 'bilgisayar', memurId: 'm1', modules: ['erasmus'] }];
    expect(memurStajYetkilisiMi(sonra, 'm1')).toBe(false);
  });
});

describe('memurAtamasi / bolumunMemurlari', () => {
  it('atama kaydını bulur', () => {
    expect(memurAtamasi(ATAMALAR, 'makine', 'm1').modules).toEqual(['muafiyet']);
    expect(memurAtamasi(ATAMALAR, 'makine', 'm2')).toBe(null);
    expect(memurAtamasi(ATAMALAR, '', 'm1')).toBe(null);
  });

  it('bölümün atanmış memurlarını listeler', () => {
    expect(bolumunMemurlari(ATAMALAR, 'bilgisayar')).toEqual(['m1', 'm2']);
    expect(bolumunMemurlari(ATAMALAR, 'orman-muh')).toEqual([]);
  });
});

describe('memurAtamaKaydi', () => {
  it('kayıt kimliği bölüm+memur, ad ve fakülte kopyalanır', () => {
    const k = memurAtamaKaydi({
      bolumId: 'bilgisayar',
      memur: { id: 'm1', name: 'Ergün ÇINAR', facultyId: 'muh-fak' },
      modules: ['staj'],
      yazan: 'Bölüm Yetkilisi',
    });
    expect(k.id).toBe('bilgisayar::m1');
    expect(k.departmentId).toBe('bilgisayar');
    expect(k.memurId).toBe('m1');
    expect(k.memurName).toBe('Ergün ÇINAR');
    expect(k.facultyId).toBe('muh-fak');
    expect(k.modules).toEqual(['staj']);
    expect(k.updatedBy).toBe('Bölüm Yetkilisi');
    expect(typeof k.updatedAt).toBe('string');
  });

  it('boş modül listesi atamanın kaldırılması demektir', () => {
    const k = memurAtamaKaydi({ bolumId: 'b', memur: { id: 'm' }, modules: [] });
    expect(k.modules).toEqual([]);
    expect(memurBolumleri([{ ...k }], 'm')).toEqual([]);
  });
});
