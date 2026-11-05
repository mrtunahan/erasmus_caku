// ══════════════════════════════════════════════════════════════
// MEZUNİYET BAŞVURUSU — SUNUCU OKUMA/YAZMA KURALLARI, UÇTAN UCA
//
// Gerçek routes/db.js bellekte bir veritabanıyla (test/sahte-db.js):
//   öğrenci formu açar → danışmana gönderir → danışman onaylar ve işaretler →
//   öğrenci imzalı dilekçeyi yükler → danışman memura iletir → memur kapatır.
// Her adımda yetkisiz tarafın reddedildiği ve zil bildiriminin düştüğü
// denetlenir.
//
// Çalıştırma (server/ içinden):  node --test test/
// ══════════════════════════════════════════════════════════════
process.env.NODE_ENV = 'test';
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
    veritabaniAdi: () => 'test',
  },
};

const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const app = express();
app.use(express.json());
app.use(require('cookie-parser')());
app.use('/api/db', require('../routes/db'));

let sunucu;
let taban;
const jeton = (veri) => jwt.sign(veri, JWT_SECRET, { expiresIn: '1h' });
const OGR = jeton({ role: 'student', identifier: '2021001', departmentId: 'bilgisayar' });
const OGR2 = jeton({ role: 'student', identifier: '2021002', departmentId: 'bilgisayar' });
const DANISMAN = jeton({
  role: 'professor',
  identifier: 'Dr. Öğr. Üyesi Mehmet KAYA',
  departmentId: 'bilgisayar',
});
const HOCA = jeton({ role: 'professor', identifier: 'Dr. Ali VELİ', departmentId: 'bilgisayar' });
const MEMUR = jeton({ role: 'professor', identifier: 'Memur Zeynep', departmentId: 'bilgisayar' });

async function yaz(token, docId, data, type) {
  const r = await fetch(taban + '/api/db/write', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: JSON.stringify({
      operations: [
        { collection: 'mezuniyet_basvurulari', type: type || 'set', docId, merge: true, data },
      ],
    }),
  });
  const j = await r.json().catch(() => null);
  return { durum: r.status, j };
}
async function oku(token) {
  const r = await fetch(taban + '/api/db/mezuniyet_basvurulari', {
    headers: { authorization: 'Bearer ' + token },
  });
  const j = await r.json().catch(() => null);
  return Array.isArray(j) ? j : (j && (j.data || j.docs)) || [];
}
const kayit = () => db.collection('mezuniyet_basvurulari').findOne({ _docId: '2021001' });
const zil = async (alici) =>
  (await db.collection('notifications').find({ module: 'mezuniyet' }).toArray()).filter(
    (n) => n.recipientId === alici
  );

test.before(async () => {
  await db.collection('students').insertMany([
    { studentNumber: '2021001', name: 'Ayşe Yılmaz', departmentId: 'bilgisayar' },
    { studentNumber: '2021002', name: 'Can Ak', departmentId: 'bilgisayar' },
  ]);
  await db.collection('professors').insertMany([
    { _docId: 'p1', id: 'p1', name: 'Dr. Öğr. Üyesi Mehmet KAYA', departmentId: 'bilgisayar' },
    { _docId: 'p2', id: 'p2', name: 'Dr. Ali VELİ', departmentId: 'bilgisayar' },
    {
      _docId: 'm1',
      id: 'm1',
      name: 'Memur Zeynep',
      departmentId: 'bilgisayar',
      isMemur: true,
    },
  ]);
  await db.collection('memur_bolum_modulleri').insertOne({
    _docId: 'bilgisayar::m1',
    departmentId: 'bilgisayar',
    memurId: 'm1',
    memurAd: 'Memur Zeynep',
    modules: ['mezuniyet'],
  });
  await new Promise((ok) => {
    sunucu = app.listen(0, '127.0.0.1', ok);
  });
  taban = 'http://127.0.0.1:' + sunucu.address().port;
});
test.after(() => sunucu && sunucu.close());

const FORM = {
  ogrenciNo: '2021001',
  ogrenciAd: 'Ayşe Yılmaz',
  departmentId: 'bilgisayar',
  durum: 'taslak',
  transkriptUrl: '/api/files/download/transkriptler/t.pdf',
  dersler: [
    { kod: 'BLM101', ad: 'Programlama', akts: '6', not: 'AA' },
    { kod: 'TAR101', ad: 'Tarih', akts: '2', not: 'CC' },
  ],
  agno: '3,10',
};

test('öğrenci yalnız kendi numarasıyla başvuru açar', async () => {
  assert.equal((await yaz(OGR2, '2021001', { ...FORM, ogrenciNo: '2021001' })).durum, 403);
  assert.equal((await yaz(OGR, '2021001', FORM)).durum, 200);
  const k = await kayit();
  assert.equal(k.ogrenciNo, '2021001');
  assert.equal(k._owner, '2021001');
});

test('taslak personele görünmez; başka öğrenci okuyamaz', async () => {
  assert.equal((await oku(DANISMAN)).length, 0);
  assert.equal((await oku(OGR2)).length, 0);
  assert.equal((await oku(OGR)).length, 1);
});

test('öğrenci danışmana gönderir; danışmana zil düşer', async () => {
  const r = await yaz(OGR, '2021001', {
    danisman: 'Mehmet Kaya',
    danismanAnahtar: 'sahte-anahtar',
    durum: 'danismanda',
  });
  assert.equal(r.durum, 200, JSON.stringify(r.j));
  const k = await kayit();
  // Anahtar istemciden alınmaz, addan türetilir.
  assert.equal(k.danismanAnahtar, 'mehmet-kaya');
  assert.equal((await zil('Mehmet Kaya')).length, 1);
  // Danışman görür (unvanlı/büyük harfli kimlikle), başka hoca görmez.
  assert.equal((await oku(DANISMAN)).length, 1);
  assert.equal((await oku(HOCA)).length, 0);
});

test('öğrenci danışmandayken formu değiştiremez, kendini onaylayamaz', async () => {
  assert.equal(
    (await yaz(OGR, '2021001', { dersler: [{ kod: 'X', ad: 'Y', akts: '240', not: 'AA' }] })).durum,
    403
  );
  assert.equal((await yaz(OGR, '2021001', { durum: 'dilekce' })).durum, 403);
});

test('başka hoca karar veremez; danışman formu değiştiremez', async () => {
  assert.equal((await yaz(HOCA, '2021001', { durum: 'dilekce' })).durum, 403);
  assert.equal((await yaz(DANISMAN, '2021001', { agno: '4,00' })).durum, 403);
});

test('danışman onaylar ve ders sildirme işaretler; öğrenciye zil', async () => {
  const r = await yaz(DANISMAN, '2021001', {
    durum: 'dilekce',
    silinecekDersler: [{ kod: 'TAR101', ad: 'Tarih', akts: '2', not: 'CC' }],
    eksikStajlar: ['Staj II (Mühendislik Stajı)'],
    danismanNotu: 'Tarih dersini sildirin.',
  });
  assert.equal(r.durum, 200, JSON.stringify(r.j));
  assert.equal((await kayit()).durum, 'dilekce');
  assert.ok((await zil('2021001')).some((n) => n.type === 'mezuniyet_dilekce'));
});

test('öğrenci işaretleri silemez; imzasız gönderemez', async () => {
  assert.equal((await yaz(OGR, '2021001', { silinecekDersler: [] })).durum, 403);
  assert.equal((await yaz(OGR, '2021001', { durum: 'imzali' })).durum, 403);
  // Tek dilekçe: silinecek dersler mezuniyet dilekçesinin içinde.
  await yaz(OGR, '2021001', { imzaliDilekce: { url: '/api/files/download/mezuniyet/d.pdf' } });
  // Beyan kutusu işaretlenmeden gönderilemez.
  assert.equal((await yaz(OGR, '2021001', { durum: 'imzali' })).durum, 403);
  assert.equal((await yaz(OGR, '2021001', { silmeBeyani: 'var' })).durum, 200);
  assert.equal((await yaz(OGR, '2021001', { durum: 'imzali' })).durum, 200);
});

test('memur iletilmeden göremez; danışman iletince görür ve kapatır', async () => {
  assert.equal((await oku(MEMUR)).length, 0);
  assert.equal((await yaz(MEMUR, '2021001', { durum: 'tamamlandi' })).durum, 403);
  const r = await yaz(DANISMAN, '2021001', {
    durum: 'memurda',
    memuraIletim: { tarih: new Date().toISOString(), yapan: 'Mehmet Kaya' },
  });
  assert.equal(r.durum, 200, JSON.stringify(r.j));
  assert.equal((await oku(MEMUR)).length, 1);
  assert.equal(
    (await yaz(MEMUR, '2021001', { durum: 'tamamlandi', memurNotu: 'İşlendi' })).durum,
    200
  );
  assert.equal((await kayit()).durum, 'tamamlandi');
  assert.ok((await zil('2021001')).some((n) => n.type === 'mezuniyet_tamam'));
});

test('gönderilmiş başvuruyu öğrenci silemez', async () => {
  assert.equal((await yaz(OGR, '2021001', null, 'delete')).durum, 403);
});

test('danışman başvuruyu silebilir; başka hoca silemez; öğrenciye zil düşer', async () => {
  await db.collection('mezuniyet_basvurulari').insertOne({
    _docId: '2021002',
    ogrenciNo: '2021002',
    ogrenciAd: 'Can Ak',
    departmentId: 'bilgisayar',
    durum: 'dilekce',
    danisman: 'Mehmet Kaya',
    danismanAnahtar: 'mehmet-kaya',
  });
  assert.equal((await yaz(HOCA, '2021002', null, 'delete')).durum, 403);
  const r = await yaz(DANISMAN, '2021002', null, 'delete');
  assert.equal(r.durum, 200, JSON.stringify(r.j));
  assert.equal(await db.collection('mezuniyet_basvurulari').findOne({ _docId: '2021002' }), null);
  assert.ok((await zil('2021002')).some((n) => n.type === 'mezuniyet_silindi'));
  // Memura iletilmiş başvuru (2021001, tamamlandı) silinemez.
  assert.equal((await yaz(DANISMAN, '2021001', null, 'delete')).durum, 403);
});
