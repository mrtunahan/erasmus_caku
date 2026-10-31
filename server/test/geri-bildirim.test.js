// ══════════════════════════════════════════════════════════════
// HATA / ÖNERİ BİLDİRİMİ — uçtan uca akış
//   öğrenci gönderir → fakülte yetkilisi görür → bölüme yönlendirir →
//   bölüm yetkilisi yanıtlar, çözüldü der → öğrenci yanıtı ve durumu görür.
// Kimse alanı dışındaki kaydı göremez / yönlendiremez.
// ══════════════════════════════════════════════════════════════
process.env.NODE_ENV = 'test';
process.env.POSTA_TEST_KUTUSU = '1';
delete process.env.RESEND_API_KEY;
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { SahteDb } = require('./sahte-db');

const db = new SahteDb();
const dbYol = require.resolve(path.join(__dirname, '..', 'config', 'database.js'));
require.cache[dbYol] = {
  id: dbYol,
  filename: dbYol,
  loaded: true,
  exports: {
    getDb: () => db,
    getDbSafe: async () => db,
    connect: async () => db,
    disconnect: async () => {},
  },
};

const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const app = express();
app.use(express.json());
app.use('/api/geri-bildirim', require('../routes/geri-bildirim'));

const jeton = (v) => jwt.sign(v, JWT_SECRET, { expiresIn: '1h' });
const OGR = jeton({ role: 'student', identifier: '2021001', departmentId: 'kimya' });
const OGR2 = jeton({ role: 'student', identifier: '2021002', departmentId: 'kimya' });
const FAK = jeton({ role: 'professor', identifier: 'Prof. Dr. FAKÜLTE YETKİLİ' });
const BOLUM = jeton({ role: 'professor', identifier: 'Dr. BÖLÜM YETKİLİ' });
const HOCA = jeton({ role: 'professor', identifier: 'Dr. SADE HOCA' });

let sunucu;
let taban;
async function istek(token, yol, govde) {
  const r = await fetch(taban + '/api/geri-bildirim' + yol, {
    method: govde ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: govde ? JSON.stringify(govde) : undefined,
  });
  return { durum: r.status, j: await r.json().catch(() => null) };
}
const zil = async (kime) =>
  (await db.collection('notifications').find({ recipientId: kime }).toArray()).length;

test.before(async () => {
  await db.collection('faculties').insertMany([
    { _docId: 'muh', id: 'muh', name: 'Mühendislik Fakültesi' },
    { _docId: 'orm', id: 'orm', name: 'Orman Fakültesi' },
  ]);
  await db.collection('departments').insertMany([
    { _docId: 'bilgisayar', id: 'bilgisayar', name: 'Bilgisayar Mühendisliği', facultyId: 'muh' },
    { _docId: 'kimya', id: 'kimya', name: 'Kimya Mühendisliği', facultyId: 'muh' },
    { _docId: 'ormanmuh', id: 'ormanmuh', name: 'Orman Mühendisliği', facultyId: 'orm' },
  ]);
  await db.collection('students').insertMany([
    { studentNumber: '2021001', firstName: 'AYŞE', lastName: 'KAYA', departmentId: 'kimya' },
    { studentNumber: '2021002', firstName: 'CAN', lastName: 'ER', departmentId: 'kimya' },
  ]);
  await db.collection('professors').insertMany([
    {
      _docId: 'p1',
      name: 'Prof. Dr. FAKÜLTE YETKİLİ',
      isFacultyManager: true,
      facultyId: 'muh',
      departmentId: 'bilgisayar',
    },
    { _docId: 'p2', name: 'Dr. BÖLÜM YETKİLİ', isDeptManager: true, departmentId: 'kimya' },
    { _docId: 'p3', name: 'Dr. SADE HOCA', departmentId: 'kimya' },
    { _docId: 'p4', name: 'Prof. Dr. ÜNİVERSİTE YETKİLİ', isUniversityAdmin: true },
  ]);
  await db
    .collection('hesap_epostalari')
    .insertOne({ _id: 'professor:Prof. Dr. ÜNİVERSİTE YETKİLİ', eposta: 'uni@example.edu.tr' });
  await new Promise((ok) => {
    sunucu = app.listen(0, '127.0.0.1', ok);
  });
  taban = 'http://127.0.0.1:' + sunucu.address().port;
});
test.after(() => sunucu && sunucu.close());

test('hatalı girdi reddedilir', async () => {
  const r = await istek(OGR, '', { tur: 'hata', modul: 'staj', konu: 'x', metin: 'kısa' });
  assert.equal(r.durum, 400);
});

test('öğrenci → fakülte yetkilisi → bölüm yetkilisi akışı', async () => {
  const yeni = await istek(OGR, '', {
    tur: 'hata',
    modul: 'staj',
    modulAd: 'Staj',
    konu: 'Belge yüklenmiyor',
    metin: 'Staj defterini yüklerken sayfa donuyor, iki kez denedim.',
    sayfa: 'staj',
    // İstemcinin yazdığı bölüme güvenilmez:
    bolumId: 'ormanmuh',
  });
  assert.equal(yeni.durum, 200, JSON.stringify(yeni.j));
  const id = yeni.j.kayit.id;
  assert.equal(yeni.j.kayit.bolumId, 'kimya');
  assert.equal(yeni.j.kayit.hedef, 'fakulte');
  assert.equal(await zil('Prof. Dr. FAKÜLTE YETKİLİ'), 1, 'fakülte yetkilisine zil');

  // Sade hoca ve henüz yönlendirilmemiş bölüm yetkilisi göremez.
  assert.equal((await istek(HOCA, '')).j.gelen.length, 0);
  assert.equal((await istek(BOLUM, '')).j.gelen.length, 0);
  assert.equal((await istek(HOCA, '/' + id + '/mesaj', { metin: 'bakarım' })).durum, 403);
  // Başka öğrenci göremez.
  assert.equal((await istek(OGR2, '')).j.benim.length, 0);
  assert.equal((await istek(OGR2, '/' + id + '/mesaj', { metin: 'merhaba' })).durum, 403);

  // Fakülte yetkilisi görür; fakülte dışına yönlendiremez.
  const fakListe = await istek(FAK, '');
  assert.equal(fakListe.j.gelen.length, 1);
  assert.ok(fakListe.j.bolumler.some((b) => b.id === 'kimya'));
  assert.ok(!fakListe.j.bolumler.some((b) => b.id === 'ormanmuh'));
  assert.equal((await istek(FAK, '/' + id + '/yonlendir', { bolumId: 'ormanmuh' })).durum, 403);
  const yon = await istek(FAK, '/' + id + '/yonlendir', {
    bolumId: 'kimya',
    not: 'Lütfen staj komisyonuyla bakın.',
  });
  assert.equal(yon.durum, 200, JSON.stringify(yon.j));
  assert.equal(yon.j.kayit.durum, 'yonlendirildi');
  assert.equal(await zil('Dr. BÖLÜM YETKİLİ'), 1, 'bölüm yetkilisine zil');

  // Bölüm yetkilisi artık görür, yanıtlar; kendisi yönlendiremez.
  assert.equal((await istek(BOLUM, '')).j.gelen.length, 1);
  assert.equal((await istek(BOLUM, '/' + id + '/yonlendir', { bolumId: 'bilgisayar' })).durum, 403);
  const yanit = await istek(BOLUM, '/' + id + '/mesaj', {
    metin: 'Dosya boyutu sınırı düzeltildi, tekrar dener misiniz?',
  });
  assert.equal(yanit.durum, 200);
  assert.equal((await istek(BOLUM, '/' + id + '/durum', { durum: 'cozuldu' })).durum, 200);
  assert.equal((await istek(BOLUM, '/' + id + '/durum', { durum: 'yeni' })).durum, 403);

  // Öğrenci yanıtı ve durumu görür; yetkililer arası not ve iç bilgiler görünmez.
  const ogr = await istek(OGR, '');
  const k = ogr.j.benim[0];
  assert.equal(k.durum, 'cozuldu');
  assert.deepEqual(
    k.mesajlar.map((m) => m.rol),
    ['yetkili']
  );
  assert.equal(k.gecmis, undefined);
  assert.equal(k.sayfa, undefined);
  assert.ok((await zil('2021001')) >= 2, 'öğrenciye yanıt ve durum zili');
});

test('günlük sınır', async () => {
  let son;
  for (let i = 0; i < 11; i++) {
    son = await istek(OGR2, '', {
      tur: 'oneri',
      modul: 'genel',
      konu: 'Öneri ' + i,
      metin: 'Ana sayfaya bir arama kutusu eklenebilir.',
    });
  }
  assert.equal(son.durum, 429);
});

test('modül yetkisi: öğrenci yönetim / personel modülü için gönderemez', async () => {
  const govde = (modul) => ({
    tur: 'hata',
    modul,
    konu: 'Deneme konusu',
    metin: 'Bu bir deneme açıklamasıdır, yeterince uzun.',
  });
  assert.equal((await istek(OGR, '', govde('kullanici'))).durum, 403);
  assert.equal((await istek(OGR, '', govde('sinav'))).durum, 403);
  // Sade akademisyen yönetim modülü için gönderemez, sınav için gönderir.
  assert.equal((await istek(HOCA, '', govde('bolumyonetimi'))).durum, 403);
  assert.equal((await istek(HOCA, '', govde('sinav'))).durum, 200);
  // Fakülte yetkilisi yönetim modülü için gönderebilir (hedef: üniversite).
  const f = await istek(FAK, '', govde('bolumyonetimi'));
  assert.equal(f.durum, 200);
  assert.equal(f.j.kayit.hedef, 'universite');
});

test('giriş ekranı destek talebi: oturumsuz, üniversite yetkilisine e-posta + gelen kutusu', async () => {
  const posta = require('../lib/posta');
  const once = posta.testKutusu.length;
  const destek = (govde) =>
    fetch(taban + '/api/geri-bildirim/destek', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.9.9.9' },
      body: JSON.stringify(govde),
    }).then(async (r) => ({ durum: r.status, j: await r.json().catch(() => null) }));
  const temel = {
    ad: 'Zeynep Yılmaz',
    eposta: 'zeynep@example.com',
    rol: 'ogrenci',
    numara: '2023001',
    konu: 'Giriş yapamıyorum',
    metin: 'Şifremi unuttum ve e-posta adresim kayıtlı değil.',
  };
  assert.equal((await destek({ ...temel, eposta: 'gecersiz' })).durum, 400);
  // Bot tuzağı doluysa sessizce yok sayılır.
  assert.equal((await destek({ ...temel, web: 'http://spam' })).durum, 200);
  assert.equal((await destek(temel)).durum, 200);

  const iletiler = posta.testKutusu.slice(once);
  assert.equal(iletiler.length, 1, 'yalnız gerçek talep e-posta üretir');
  assert.equal(iletiler[0].kime, 'uni@example.edu.tr');
  assert.match(iletiler[0].metin, /Zeynep Yılmaz/);

  const UNI = jeton({ role: 'professor', identifier: 'Prof. Dr. ÜNİVERSİTE YETKİLİ' });
  const gelen = (await istek(UNI, '')).j.gelen;
  const k = gelen.find((x) => x.konu === 'Giriş yapamıyorum');
  assert.ok(k, 'üniversite yetkilisinin gelen kutusunda');
  // Fakülte yetkilisi görmez (hedef üniversite).
  assert.ok(!(await istek(FAK, '')).j.gelen.some((x) => x.konu === 'Giriş yapamıyorum'));

  // Yetkilinin yanıtı gönderenin e-postasına gider.
  const y = await istek(UNI, '/' + k.id + '/mesaj', {
    metin: 'Şifreniz sıfırlandı, giriş yapabilirsiniz.',
  });
  assert.equal(y.durum, 200);
  const yanitIleti = posta.testKutusu.slice(once).find((m) => m.kime === 'zeynep@example.com');
  assert.ok(yanitIleti, 'yanıt e-postası');
  assert.match(yanitIleti.metin, /sıfırlandı/);
});

test('öğrenci modül listesi istemcinin listesiyle aynı (lib/modul-izinleri.js)', async () => {
  const K = require('../lib/geri-bildirim');
  const { ogrenciModulleri } = await import('../../lib/modul-izinleri.js');
  assert.deepEqual([...K.OGRENCI_MODULLERI].sort(), [...ogrenciModulleri(true)].sort());
});
