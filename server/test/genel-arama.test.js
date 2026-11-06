// Genel arama — öğrenci sonuçları yetki kapsamını AŞMAMALI.
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
const HOCA = jeton({ role: 'professor', identifier: 'Dr. Ali VELİ', departmentId: 'bilgisayar' });

async function ara(token, q) {
  const r = await fetch(taban + '/api/db/genel-arama/ogrenci?q=' + encodeURIComponent(q), {
    headers: token ? { authorization: 'Bearer ' + token } : {},
  });
  const j = await r.json().catch(() => ({}));
  return { durum: r.status, liste: j.ogrenciler || [] };
}

test.before(async () => {
  await db.collection('students').insertMany([
    { studentNumber: '2021001', firstName: 'Ayşe', lastName: 'Yılmaz', departmentId: 'bilgisayar' },
    { studentNumber: '2021002', firstName: 'Ayten', lastName: 'Kaya', departmentId: 'bilgisayar' },
    { studentNumber: '2021901', firstName: 'Ayla', lastName: 'Demir', departmentId: 'orman' },
  ]);
  await db
    .collection('professors')
    .insertMany([{ _docId: 'p2', id: 'p2', name: 'Dr. Ali VELİ', departmentId: 'bilgisayar' }]);
  await db.collection('departments').insertMany([
    { _docId: 'bilgisayar', id: 'bilgisayar', name: 'Bilgisayar Mühendisliği' },
    { _docId: 'orman', id: 'orman', name: 'Orman Mühendisliği' },
  ]);
  await new Promise((ok) => {
    sunucu = app.listen(0, '127.0.0.1', ok);
  });
  taban = 'http://127.0.0.1:' + sunucu.address().port;
});
test.after(() => sunucu && sunucu.close());

test('girişsiz arama reddedilir', async () => {
  assert.equal((await ara(null, 'ay')).durum, 401);
});

test('öğrenci başka öğrenci bulamaz', async () => {
  const r = await ara(OGR, 'ay');
  assert.equal(r.durum, 200);
  assert.deepEqual(r.liste, []);
});

test('akademisyen yalnız yetki alanındaki öğrenciyi bulur', async () => {
  const r = await ara(HOCA, 'ay');
  assert.equal(r.durum, 200);
  const nolar = r.liste.map((o) => o.no).sort();
  assert.deepEqual(nolar, ['2021001', '2021002']);
  // Başka bölümün öğrencisi numarasıyla da çıkmaz.
  assert.deepEqual((await ara(HOCA, '2021901')).liste, []);
});

test('numara ile arama ve kısa sorgu', async () => {
  assert.deepEqual((await ara(HOCA, '202100')).liste.map((o) => o.no).sort(), [
    '2021001',
    '2021002',
  ]);
  assert.deepEqual((await ara(HOCA, 'a')).liste, []);
});

test('yalnız numara, ad, bölüm ve sınıf döner', async () => {
  const [o] = (await ara(HOCA, 'ayşe')).liste;
  assert.deepEqual(Object.keys(o).sort(), ['ad', 'bolum', 'no', 'sinif']);
  assert.equal(o.ad, 'AYŞE YILMAZ');
});
