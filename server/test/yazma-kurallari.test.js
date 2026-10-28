// ══════════════════════════════════════════════════════════════
// /api/db/write — SUNUCU YAZMA KURALLARI, UÇTAN UCA
//
// Kuralların çoğu yardımcı dosyalarda birim testli; ama onları SIRAYLA
// çağıran routes/db.js (4.800 satır) hiç sınanmıyordu. Bir kuralın yanlış
// yere taşınması ya da erken bir `allow` dönüşü, birim testler yeşilken
// açığı geri getirebilirdi. Bu testler gerçek route kodunu bellekte bir
// veritabanıyla (test/sahte-db.js) çalıştırır.
//
// Çalıştırma (server/ içinden):  node --test test/
// ══════════════════════════════════════════════════════════════
process.env.NODE_ENV = 'test';
process.env.TZ = 'Europe/Istanbul';
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
const HOCA = jeton({ role: 'professor', identifier: 'Dr. Ali VELİ', departmentId: 'bilgisayar' });

async function yaz(token, op) {
  const r = await fetch(taban + '/api/db/write', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: JSON.stringify({ operations: [op] }),
  });
  let j = null;
  try {
    j = await r.json();
  } catch (_) {
    /* gövdesiz yanıt */
  }
  return { durum: r.status, j };
}
const bul = (kol, q) => db.collection(kol).findOne(q);
const ileriTarih = (gun) => new Date(Date.now() + gun * 864e5).toISOString().slice(0, 10);

test.before(async () => {
  await db.collection('departments').insertMany([
    { _docId: 'bilgisayar', id: 'bilgisayar', name: 'Bilgisayar Mühendisliği', facultyId: 'muh' },
    { _docId: 'kimya', id: 'kimya', name: 'Kimya Mühendisliği', facultyId: 'muh' },
  ]);
  await db.collection('students').insertMany([
    {
      _docId: 's1',
      studentNumber: '2021001',
      firstName: 'AYŞE',
      lastName: 'YILMAZ',
      departmentId: 'bilgisayar',
      sinif: 3,
    },
    {
      _docId: 's2',
      studentNumber: '2021002',
      firstName: 'AYŞE',
      lastName: 'YILMAZ',
      departmentId: 'bilgisayar',
      sinif: 3,
    },
  ]);
  await db
    .collection('professors')
    .insertOne({ _docId: 'p1', id: 'p1', name: 'Dr. Ali VELİ', departmentId: 'bilgisayar' });
  await new Promise((ok) => {
    sunucu = app.listen(0, '127.0.0.1', ok);
  });
  taban = 'http://127.0.0.1:' + sunucu.address().port;
});
test.after(() => sunucu && sunucu.close());

test('kimliksiz istek yazamaz', async () => {
  const r = await fetch(taban + '/api/db/write', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      operations: [
        { collection: 'student_courses', type: 'set', docId: '2021001__2026-2027_guz', data: {} },
      ],
    }),
  });
  assert.notEqual(r.status, 200);
});

test('ders seçimi: kendi numarası yazılır, başkasının kimliğine yazılamaz, kilitli kayıt değişmez', async () => {
  const baskasi = await yaz(OGR, {
    collection: 'student_courses',
    type: 'set',
    docId: '2021002__2026-2027_guz',
    data: { courseIds: [], locked: true },
    merge: true,
  });
  assert.equal(baskasi.durum, 403);
  assert.equal(await bul('student_courses', { _docId: '2021002__2026-2027_guz' }), null);

  const kendi = await yaz(OGR, {
    collection: 'student_courses',
    type: 'set',
    docId: '2021001__2026-2027_guz',
    data: { courseIds: ['c1'], locked: true, studentNumber: '9999' },
    merge: true,
  });
  assert.equal(kendi.durum, 200, JSON.stringify(kendi.j));
  const k = await bul('student_courses', { _docId: '2021001__2026-2027_guz' });
  assert.equal(k.studentNumber, '2021001', 'sahiplik jetondan damgalanır');

  const degistir = await yaz(OGR, {
    collection: 'student_courses',
    type: 'set',
    docId: '2021001__2026-2027_guz',
    data: { courseIds: ['c1', 'c2'] },
    merge: true,
  });
  assert.equal(degistir.durum, 403);
});

test('profil: başka öğrencinin numarasıyla profil açılamaz', async () => {
  const r = await yaz(OGR, {
    collection: 'student_profiles',
    type: 'set',
    docId: '2021002',
    data: { tcKimlik: '11111111111' },
    merge: true,
  });
  assert.equal(r.durum, 403);
  const k = await yaz(OGR, {
    collection: 'student_profiles',
    type: 'set',
    docId: '2021001',
    data: { telefon: '5550000000' },
    merge: true,
  });
  assert.equal(k.durum, 200, JSON.stringify(k.j));
});

test('staj başvurusu öğrencide "beklemede" açılır', async () => {
  const r = await yaz(OGR, {
    collection: 'internship_applications',
    type: 'add',
    data: { ogrenciNo: '2021001', status: 'tamamlandi', adSoyad: 'A' },
  });
  assert.equal(r.durum, 200, JSON.stringify(r.j));
  const k = await bul('internship_applications', { ogrenciNo: '2021001' });
  assert.equal(k.status, 'beklemede');
});

test('anket yanıtı: hedef kitle, süre ve mükerrer denetimi', async () => {
  await db.collection('surveys').insertMany([
    { _docId: 'anket1', title: 'Bölüm anketi', questions: [] },
    { _docId: 'anket2', title: 'Kimya anketi', questions: [] },
    { _docId: 'anket3', title: 'Süresi dolmuş', questions: [] },
  ]);
  const atama = (sid, ek) => ({
    surveyId: sid,
    targetRole: 'student',
    targetGroup: 'Tüm öğrenciler',
    kapsamTuru: 'bolum',
    kapsamDepartmentIds: ['bilgisayar'],
    ...ek,
  });
  await db
    .collection('survey_assignments')
    .insertMany([
      atama('anket1', { dueDate: ileriTarih(10) }),
      atama('anket2', { kapsamDepartmentIds: ['kimya'] }),
      atama('anket3', { dueDate: ileriTarih(-2) }),
    ]);
  const yanit = (token, sid) =>
    yaz(token, {
      collection: 'survey_responses',
      type: 'add',
      data: { surveyId: sid, userId: 'AYŞE YILMAZ', role: 'student', answers: { q1: 5 } },
    });

  assert.equal((await yanit(OGR, 'anket2')).durum, 403, 'başka bölüme paylaşılan anket');
  assert.equal((await yanit(OGR, 'anket3')).durum, 403, 'süresi dolan paylaşım');

  const ilk = await yanit(OGR, 'anket1');
  assert.equal(ilk.durum, 200, JSON.stringify(ilk.j));
  const kayit = await bul('survey_responses', { surveyId: 'anket1' });
  assert.equal(kayit.studentNumber, '2021001', 'numara sunucuda damgalanır');

  assert.equal((await yanit(OGR, 'anket1')).durum, 409, 'ikinci yanıt');
  // Aynı adlı başka öğrenci kendi yanıtını verebilir.
  assert.equal((await yanit(OGR2, 'anket1')).durum, 200);
});

test('akademisyen anketi başka bölüme paylaşamaz', async () => {
  await db.collection('surveys').insertOne({
    _docId: 'anket4',
    title: 'Ders anketi',
    createdBy: 'Dr. Ali VELİ',
    kapsamTuru: 'bolum',
    kapsamDepartmentIds: ['bilgisayar'],
    linkedCourses: [{ code: 'BLM101' }],
  });
  await db.collection('sinav_dersler').insertOne({
    _docId: 'd1',
    code: 'BLM101',
    professor: 'Dr. Ali VELİ',
    departmentId: 'bilgisayar',
  });
  const r = await yaz(HOCA, {
    collection: 'survey_assignments',
    type: 'add',
    data: {
      surveyId: 'anket4',
      targetRole: 'student',
      kapsamTuru: 'bolum',
      kapsamDepartmentIds: ['kimya'],
    },
  });
  if (r.durum === 200) {
    // Kabul edildiyse kapsam yazanın alanına daraltılmış olmalı.
    const k = await bul('survey_assignments', { surveyId: 'anket4' });
    assert.ok(!(k.kapsamDepartmentIds || []).includes('kimya'), JSON.stringify(k));
  } else {
    assert.equal(r.durum, 403);
  }
});
