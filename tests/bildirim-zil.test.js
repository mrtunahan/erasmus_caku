import { describe, it, expect } from 'vitest';
import {
  zilKimligi,
  bildirimBenimMi,
  okunduMu,
  gizliMi,
  silmeTuru,
  bildirimBaglantisi,
  kaynakHedefi,
  kaynakSilinirMi,
  zilGorunumu,
} from '../server/lib/bildirim-zil.js';
import { kopruPlani } from '../server/lib/bildirim-kopru.js';

// Unvanı atan basit sadeleştirici (gerçeği lib/akademik-unvan.js).
const sadele = (v) =>
  String(v || '')
    .replace(/^(Prof\.|Doç\.|Dr\.|Öğr\. Üyesi|\s)+/g, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim();

const ogrenci = zilKimligi({
  user: { role: 'student', identifier: '240905054', departmentId: 'bil' },
  bolumler: ['bil'],
  numaralar: ['240905054', '250905001'],
  sadele,
});
const hoca = zilKimligi({
  user: { role: 'professor', identifier: 'Dr. Ali VELİ' },
  bolumler: ['bil', 'kim'],
  sadele,
});

describe('zil: kime düşer', () => {
  it('kişiye giden bildirim numara, ÇAP numarası ya da unvansız adla eşleşir', () => {
    expect(bildirimBenimMi({ recipientType: 'user', recipientId: '240905054' }, ogrenci)).toBe(
      true
    );
    expect(bildirimBenimMi({ recipientType: 'user', recipientId: '250905001' }, ogrenci)).toBe(
      true
    );
    expect(bildirimBenimMi({ recipientType: 'user', recipientId: '111' }, ogrenci)).toBe(false);
    expect(
      bildirimBenimMi({ recipientType: 'user', recipientId: 'Prof. Dr. Ali Veli' }, hoca)
    ).toBe(true);
  });

  it('bölüm personeli yayını öğrenciye düşmez', () => {
    const n = { recipientType: 'department-staff', recipientId: 'bil' };
    expect(bildirimBenimMi(n, hoca)).toBe(true);
    expect(bildirimBenimMi(n, ogrenci)).toBe(false);
    expect(bildirimBenimMi({ recipientType: 'department', recipientId: 'bil' }, ogrenci)).toBe(
      true
    );
    expect(bildirimBenimMi({ recipientType: 'department', recipientId: 'mak' }, ogrenci)).toBe(
      false
    );
  });

  it('hedef kitleli (anket) bildirim rol ve kapsama bakar', () => {
    const n = {
      recipientType: 'hedef',
      recipientId: 'student',
      meta: { hedef: { kapsamTuru: 'bolum', kapsamDepartmentIds: ['bil'] } },
    };
    expect(bildirimBenimMi(n, ogrenci)).toBe(true);
    expect(bildirimBenimMi(n, hoca)).toBe(false); // rol tutmuyor
    const baska = { ...n, meta: { hedef: { kapsamTuru: 'bolum', kapsamDepartmentIds: ['kim'] } } };
    expect(bildirimBenimMi(baska, ogrenci)).toBe(false);
    const uni = { ...n, meta: { hedef: { kapsamTuru: 'universite' } } };
    expect(bildirimBenimMi(uni, ogrenci)).toBe(true);
    // Verilen kapsam kuralı kullanılır
    expect(bildirimBenimMi(n, ogrenci, { kapsamdaMi: () => false })).toBe(false);
  });
});

describe('zil: okundu / sil', () => {
  it('okundu kişi başınadır; eski adla yazılmış okuma da sayılır', () => {
    expect(okunduMu({ readBy: ['240905054'] }, ogrenci)).toBe(true);
    expect(okunduMu({ readBy: ['999'] }, ogrenci)).toBe(false);
    expect(okunduMu({ readBy: ['Ali Veli'] }, hoca)).toBe(true);
  });

  it('kişiye giden silinir, yayın yalnız o kişiden gizlenir', () => {
    expect(silmeTuru({ recipientType: 'user' })).toBe('sil');
    expect(silmeTuru({ recipientType: 'department' })).toBe('gizle');
    expect(silmeTuru({ recipientType: 'role' })).toBe('gizle');
    expect(silmeTuru({ recipientType: 'hedef' })).toBe('gizle');
    expect(gizliMi({ gizleyenler: ['240905054'] }, ogrenci)).toBe(true);
    expect(gizliMi({ gizleyenler: ['240905054'] }, hoca)).toBe(false);
  });

  it('kaynak yalnız tek kişilikse silinir', () => {
    const n = {
      recipientType: 'user',
      recipientId: '240905054',
      meta: { kaynak: 'internship_notifications', kaynakId: 'k1' },
    };
    expect(kaynakHedefi(n)).toEqual({
      kaynak: 'internship_notifications',
      koleksiyon: 'internship_notifications',
      id: 'k1',
    });
    expect(kaynakSilinirMi(n, { targetStudentNo: '240905054' }, ogrenci)).toBe(true);
    // Komisyona giden ortak staj kaydı: üyenin kopyası silinir, kaynak kalır.
    const uye = { ...n, recipientId: 'Dr. Ali VELİ' };
    expect(kaynakSilinirMi(uye, { departmentId: 'bil' }, hoca)).toBe(false);
    const portal = {
      recipientType: 'user',
      meta: { kaynak: 'portal_notifications', kaynakId: 'p' },
    };
    expect(kaynakHedefi(portal).koleksiyon).toBe('portal_notifications_items');
    expect(kaynakHedefi({ meta: {} })).toBeNull();
  });
});

describe('zil: bağlantı', () => {
  it('yazılı bağlantı başındaki # atılarak kullanılır', () => {
    expect(bildirimBaglantisi({ link: '#erasmus' }, 'student')).toBe('erasmus');
  });
  it('bağlantısız bildirim modülünden rota bulur', () => {
    expect(bildirimBaglantisi({ module: 'staj' }, 'student')).toBe('staj');
    expect(bildirimBaglantisi({ module: 'muafiyet' }, 'student')).toBe('muafiyet');
    expect(bildirimBaglantisi({ module: 'yoklama' }, 'student')).toBe('benim');
    expect(bildirimBaglantisi({ module: 'yoklama' }, 'professor')).toBe('benimakademik');
    expect(bildirimBaglantisi({ module: 'bilinmeyen' }, 'student')).toBe('');
  });
  it('istemci görünümü okundu bilgisini ve rotayı taşır, iç alanları taşımaz', () => {
    const g = zilGorunumu(
      {
        _id: { toString: () => 'abc' },
        module: 'staj',
        title: 'T',
        readBy: ['240905054'],
        gizleyenler: ['x'],
        createdAt: new Date('2026-10-09T10:00:00Z'),
      },
      ogrenci
    );
    expect(g).toMatchObject({ id: 'abc', link: 'staj', okundu: true });
    expect(g.createdAt).toBe('2026-10-09T10:00:00.000Z');
    expect(g.readBy).toBeUndefined();
    expect(g.gizleyenler).toBeUndefined();
  });
});

describe('köprü: portal bahsetmesi gönderiyi taşır', () => {
  it('meta.postId', () => {
    const p = kopruPlani(
      'portal_notifications',
      { message: 'Ali sizi bahsetti', postId: 'p9' },
      { id: 'i1', parentDocId: 'u42' }
    );
    expect(p[0].meta).toMatchObject({
      kaynak: 'portal_notifications',
      kaynakId: 'i1',
      postId: 'p9',
    });
  });
});
