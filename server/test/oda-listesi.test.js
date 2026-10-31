// ══════════════════════════════════════════════════════════════
// /api/oda/odalar — LİSTE DOĞRU VE TEK OKUMAYLA
//
// Oda listesi her oda için bütün ders programını (course_schedules) ayrı
// ayrı okuyordu; 50 odalı bir bölümde liste saniyelerce bekliyordu. Bu test
// listenin aynı odaları döndürdüğünü ve programın istek başına BİR kez
// okunduğunu sabitler.
// ══════════════════════════════════════════════════════════════
process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { SahteDb } = require('./sahte-db');

const db = new SahteDb();
let programOkuma = 0;
const asil = db.collection.bind(db);
db.collection = (ad) => {
  const c = asil(ad);
  if (ad === 'course_schedules' && !c.sayacli) {
    const bul = c.find.bind(c);
    c.find = (...a) => {
      programOkuma++;
      return bul(...a);
    };
    c.sayacli = true;
  }
  return c;
};
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
app.use('/api/oda', require('../routes/ders-odasi'));

test('oda listesi: hoca ve öğrenci doğru odaları alır, program bir kez okunur', async () => {
  await db.collection('sinav_dersler').insertMany(
    Array.from({ length: 20 }, (_, i) => ({
      _docId: 'd' + i,
      id: 'd' + i,
      code: 'BLM' + (100 + i),
      name: 'Ders ' + i,
      departmentId: 'bilgisayar',
      professor: i < 12 ? 'Dr. Ali VELİ' : 'Dr. Can DEMİR',
    }))
  );
  await db.collection('course_schedules').insertOne({ _docId: 'bilgisayar_guz_1', slots: {} });
  const { donemAnahtari } = await import('../../lib/ders-odasi.js');
  await db.collection('student_courses').insertOne({
    _docId: '2021001__' + donemAnahtari(),
    studentNumber: '2021001',
    termKey: donemAnahtari(),
    courseIds: ['d1', 'd2', 'd15'],
  });
  const sunucu = app.listen(0);
  const taban = 'http://127.0.0.1:' + sunucu.address().port;
  const al = async (veri) =>
    (
      await fetch(taban + '/api/oda/odalar', {
        headers: { authorization: 'Bearer ' + jwt.sign(veri, JWT_SECRET) },
      })
    ).json();
  try {
    programOkuma = 0;
    const hoca = await al({ role: 'professor', identifier: 'Dr. Ali VELİ' });
    assert.equal(hoca.odalar.length, 12);
    assert.ok(hoca.odalar.every((o) => o.rol === 'hoca'));
    assert.equal(programOkuma, 1, 'ders programı istek başına bir kez okunur');

    programOkuma = 0;
    const ogr = await al({ role: 'student', identifier: '2021001' });
    assert.deepEqual(
      ogr.odalar.map((o) => o.dersKod),
      ['BLM101', 'BLM102', 'BLM115']
    );
    assert.equal(programOkuma, 1);
  } finally {
    sunucu.close();
  }
});
