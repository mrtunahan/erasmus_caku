// Yatay geçişte istenen ekler geçiş TÜRÜNE göre değişir.
//
// Öğrenci Belgesi yalnız BAŞKA kurumdan gelenlerden istenir; kurum içi
// geçişte öğrenci zaten bizim kaydımızda olduğu için anlamsızdır. Kural
// yanlış kurulursa ya kurum içi başvuru sahibi bulamayacağı bir belgeyi
// yüklemek zorunda kalır ya da dışarıdan gelenin kaydı belgesiz geçer.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

let YG_EKLER;
let ygEkler;

beforeAll(() => {
  // Modül React global'lerine bağlı olduğu için tümünü yükleyemeyiz; kural
  // kaynağı olan iki tanım dosyadan okunup değerlendirilir.
  const src = fs.readFileSync(path.resolve('yatay-gecis-modulu.jsx'), 'utf8');
  const bas = src.indexOf('const YG_EKLER = [');
  const son = src.indexOf('}', src.indexOf('function ygEkler(turId) {')) + 1;
  const fn = new Function(src.slice(bas, son) + '\nreturn { YG_EKLER, ygEkler };');
  ({ YG_EKLER, ygEkler } = fn());
});

describe('ygEkler — türe göre ek listesi', () => {
  it('Öğrenci Belgesi kurumlararası ve merkezi yerleştirmede istenir', () => {
    ['kurumlararasi', 'merkezi'].forEach((t) => {
      const ids = ygEkler(t).map((e) => e.id);
      expect(ids).toContain('ogrenci_belgesi');
    });
  });

  it('kurum içi geçişte Öğrenci Belgesi İSTENMEZ', () => {
    const ids = ygEkler('kurumici').map((e) => e.id);
    expect(ids).not.toContain('ogrenci_belgesi');
  });

  it('türü olmayan ekler her türde durur', () => {
    ['kurumici', 'kurumlararasi', 'merkezi'].forEach((t) => {
      const ids = ygEkler(t).map((e) => e.id);
      expect(ids).toContain('transkript');
      expect(ids).toContain('yks_sonuc');
      expect(ids).toContain('ozel_yetenek');
    });
  });

  it('Öğrenci Belgesi zorunludur — açıldığı türlerde eksikse başvuru gitmez', () => {
    const ek = YG_EKLER.find((e) => e.id === 'ogrenci_belgesi');
    expect(ek.zorunlu).toBe(true);
    expect(
      ygEkler('kurumlararasi')
        .filter((e) => e.zorunlu)
        .map((e) => e.id)
    ).toContain('ogrenci_belgesi');
  });

  it('tür bilinmiyorsa (eski kayıt) tüm ekler döner — mevcut dosyalar gizlenmez', () => {
    expect(ygEkler('').length).toBe(YG_EKLER.length);
    expect(ygEkler(null).length).toBe(YG_EKLER.length);
    expect(ygEkler(undefined).length).toBe(YG_EKLER.length);
  });

  it('bilinmeyen tür yalnız türsüz ekleri verir', () => {
    const ids = ygEkler('bilinmeyen').map((e) => e.id);
    expect(ids).not.toContain('ogrenci_belgesi');
    expect(ids).toContain('transkript');
  });
});
