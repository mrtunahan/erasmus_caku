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

async function oku(token, yol) {
  const r = await fetch(taban + '/api/db/' + yol, {
    headers: { authorization: 'Bearer ' + token },
  });
  return { durum: r.status, j: await r.json().catch(() => null) };
}

test('randevu talepleri: akademisyen başkasının talebinin konusunu/öğrencisini görmez', async () => {
  await db.collection('randevu_talepleri').insertMany([
    {
      _docId: 'r1',
      akademisyen: 'Dr. Ali VELİ',
      studentNumber: '2021001',
      konu: 'not itirazı',
      gun: 'Pazartesi',
      saat: '10:00',
      durum: 'bekliyor',
    },
    {
      _docId: 'r2',
      akademisyen: 'Prof. Dr. Can DEMİR',
      studentNumber: '2021002',
      konu: 'devamsızlık sorunum',
      gun: 'Salı',
      saat: '11:00',
      durum: 'bekliyor',
    },
  ]);
  const { durum, j } = await oku(HOCA, 'randevu_talepleri');
  assert.equal(durum, 200);
  const liste = Array.isArray(j) ? j : j.data || j.docs || [];
  const kendi = liste.find((x) => x.saat === '10:00');
  const baskasi = liste.find((x) => x.saat === '11:00');
  assert.equal(kendi.konu, 'not itirazı', 'kendi talebi açık');
  assert.ok(baskasi, 'başkasının slotu görünür');
  assert.equal(baskasi.konu, undefined);
  assert.equal(baskasi.studentNumber, undefined);
});

test('proje grubu daveti: davetli yalnız kendi satırını yanıtlar', async () => {
  await db.collection('students').insertOne({
    _docId: 's3',
    studentNumber: '2021003',
    firstName: 'CEYDA',
    lastName: 'GELMEZ',
    departmentId: 'bilgisayar',
  });
  await db.collection('projects').insertOne({
    _docId: 'prj1',
    name: 'ELİF NUR - CEYDA',
    createdBy: '2021001',
    members: ['Ayşe Yılmaz', 'Ceyda Gelmez', 'Mehmet Demir'],
    memberStatus: ['accepted', 'pending', 'pending'],
    status: 'pending',
  });
  const CEYDA = jeton({ role: 'student', identifier: '2021003', departmentId: 'bilgisayar' });
  const yanit = (token, durumlar) =>
    yaz(token, {
      collection: 'projects',
      type: 'update',
      docId: 'prj1',
      data: { memberStatus: durumlar },
    });

  // Başkasının satırını değiştiremez; başka alan yazamaz.
  assert.equal((await yanit(CEYDA, ['accepted', 'accepted', 'accepted'])).durum, 403);
  const alan = await yaz(CEYDA, {
    collection: 'projects',
    type: 'update',
    docId: 'prj1',
    data: { memberStatus: ['accepted', 'accepted', 'pending'], status: 'approved' },
  });
  assert.equal(alan.durum, 403);
  // Davetli olmayan öğrenci yanıt veremez.
  assert.equal((await yanit(OGR2, ['accepted', 'pending', 'accepted'])).durum, 403);

  const kabul = await yanit(CEYDA, ['accepted', 'accepted', 'pending']);
  assert.equal(kabul.durum, 200, JSON.stringify(kabul.j));
  const k = await bul('projects', { _docId: 'prj1' });
  assert.deepEqual(k.memberStatus, ['accepted', 'accepted', 'pending']);
  assert.equal(k.status, 'pending');
  // Verilmiş yanıt tekrar değiştirilemez.
  assert.equal((await yanit(CEYDA, ['accepted', 'rejected', 'pending'])).durum, 403);
});

test('yardım kılavuzu: herkes okur, yalnız üniversite yetkilisi yazar', async () => {
  const YONETICI = jeton({ role: 'admin', identifier: 'admin' });
  const veri = { icerik: '# Kılavuz\n\nDeneme', updatedBy: 'Yönetici' };
  for (const t of [OGR, HOCA]) {
    const r = await yaz(t, {
      collection: 'yardim_kilavuzlari',
      type: 'set',
      docId: 'ogrenci',
      data: veri,
    });
    assert.equal(r.durum, 403, JSON.stringify(r.j));
  }
  assert.equal(await bul('yardim_kilavuzlari', { _docId: 'ogrenci' }), null);

  const ok = await yaz(YONETICI, {
    collection: 'yardim_kilavuzlari',
    type: 'set',
    docId: 'ogrenci',
    data: veri,
  });
  assert.equal(ok.durum, 200, JSON.stringify(ok.j));

  // Giriş ekranı oturumsuz okur.
  const r = await fetch(taban + '/api/db/yardim_kilavuzlari/ogrenci');
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.match(JSON.stringify(j), /Kılavuz/);
});

test('performans: akademisyen yalnız kendi verisini okur, yetkili kendi bölümünü', async () => {
  await db.collection('professors').insertMany([
    {
      _docId: 'p2',
      id: 'p2',
      name: 'Prof. Dr. Ayşe YETKİLİ',
      departmentId: 'bilgisayar',
      isDeptManager: true,
    },
    { _docId: 'p3', id: 'p3', name: 'Dr. Can KİMYA', departmentId: 'kimya' },
  ]);
  await db.collection('performance_data').insertMany([
    {
      _docId: 'Dr. Ali VELİ_2026_g1_Ocak',
      akademisyenId: 'Dr. Ali VELİ',
      departmentId: 'bilgisayar',
      gostergeId: 'g1',
      yil: '2026',
      ay: 'Ocak',
      value: '3',
    },
    {
      _docId: 'Dr. Başka HOCA_2026_g1_Ocak',
      akademisyenId: 'Dr. Başka HOCA',
      departmentId: 'bilgisayar',
      gostergeId: 'g1',
      yil: '2026',
      ay: 'Ocak',
      value: '5',
    },
    {
      _docId: 'Dr. Can KİMYA_2026_g1_Ocak',
      akademisyenId: 'Dr. Can KİMYA',
      departmentId: 'kimya',
      gostergeId: 'g1',
      yil: '2026',
      ay: 'Ocak',
      value: '7',
    },
  ]);
  const oku = async (t, yol) => {
    const r = await fetch(taban + '/api/db/' + yol, { headers: { authorization: 'Bearer ' + t } });
    return { durum: r.status, j: await r.json() };
  };
  const hoca = await oku(HOCA, 'performance_data');
  assert.deepEqual(
    hoca.j.map((x) => x.akademisyenId),
    ['Dr. Ali VELİ']
  );

  const YETKILI = jeton({ role: 'professor', identifier: 'Prof. Dr. Ayşe YETKİLİ' });
  const yet = await oku(YETKILI, 'performance_data');
  assert.deepEqual(yet.j.map((x) => x.akademisyenId).sort(), ['Dr. Ali VELİ', 'Dr. Başka HOCA']);

  const tek = await oku(
    HOCA,
    'performance_data/' + encodeURIComponent('Dr. Başka HOCA_2026_g1_Ocak')
  );
  assert.equal(tek.durum, 403);
});

test('performans: akademisyen gönderimi kayda yazılır, bölüm yetkilisine bildirim gider', async () => {
  const baskasi = await yaz(HOCA, {
    collection: 'performance_akademisyen_gonderimleri',
    type: 'set',
    docId: 'Dr. Başka HOCA_2026',
    data: { akademisyenId: 'Dr. Başka HOCA', departmentId: 'bilgisayar', yil: '2026' },
  });
  assert.equal(baskasi.durum, 403);

  const kendi = await yaz(HOCA, {
    collection: 'performance_akademisyen_gonderimleri',
    type: 'set',
    docId: 'Dr. Ali VELİ_2026',
    data: {
      akademisyenId: 'Dr. Ali VELİ',
      departmentId: 'bilgisayar',
      yil: '2026',
      gonderimZamani: '2000-01-01',
    },
  });
  assert.equal(kendi.durum, 200, JSON.stringify(kendi.j));
  const k = await bul('performance_akademisyen_gonderimleri', { _docId: 'Dr. Ali VELİ_2026' });
  assert.notEqual(k.gonderimZamani, '2000-01-01', 'zaman sunucuda damgalanır');
  const bildirim = await bul('notifications', {
    recipientId: 'Prof. Dr. Ayşe YETKİLİ',
    module: 'performans',
  });
  assert.ok(bildirim, 'bölüm yetkilisine bildirim');
  assert.match(bildirim.body, /Dr\. Ali VELİ/);

  const esleme = await yaz(HOCA, {
    collection: 'performance_uc_aylik_esleme',
    type: 'set',
    docId: 'satir',
    data: { gostergeId: 'g1' },
  });
  assert.equal(esleme.durum, 403, 'eşlemeyi sade akademisyen yazamaz');
});

test('portal bildirimi: alıcıya bağlanır, başkası okuyamaz ve değiştiremez', async () => {
  const ekle = await fetch(taban + '/api/db/write', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + OGR },
    body: JSON.stringify({
      operations: [
        {
          collection: 'portal_notifications',
          type: 'add',
          parentDocId: '2021002',
          subCollection: 'items',
          data: { type: 'mention', message: 'bahsetti', read: false },
        },
      ],
    }),
  });
  assert.equal(ekle.status, 200);
  const kayit = await bul('portal_notifications_items', { message: 'bahsetti' });
  assert.equal(kayit._parentDocId, '2021002', 'alıcı kayda yazılır');

  const oku = async (t) => {
    const r = await fetch(taban + '/api/db/portal_notifications_items', {
      headers: { authorization: 'Bearer ' + t },
    });
    return r.json();
  };
  assert.equal((await oku(OGR)).length, 0, 'gönderen alıcının bildirimini okuyamaz');
  assert.equal((await oku(OGR2)).length, 1, 'alıcı kendi bildirimini okur');

  const r = await fetch(taban + '/api/db/write', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + OGR },
    body: JSON.stringify({
      operations: [
        {
          collection: 'portal_notifications',
          type: 'update',
          docId: String(kayit._id),
          parentDocId: '2021002',
          subCollection: 'items',
          data: { read: true },
        },
      ],
    }),
  });
  assert.equal(r.status, 403, 'başkasının bildirimi okundu yapılamaz');
});

test('toplu bildirim: bölüm öğrencilerine sunucuda tek seferde, öğrenci gönderemez', async () => {
  const app2 = require('express')();
  app2.use(require('express').json());
  app2.use(require('cookie-parser')());
  app2.use('/api/bildirim', require('../routes/bildirim'));
  const s2 = await new Promise((ok) => {
    const s = app2.listen(0, '127.0.0.1', () => ok(s));
  });
  const t2 = 'http://127.0.0.1:' + s2.address().port;
  const gonder = (t, govde) =>
    fetch(t2 + '/api/bildirim/toplu', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t },
      body: JSON.stringify(govde),
    });
  try {
    const ogr = await gonder(OGR, { hedef: 'bolum', departmentId: 'bilgisayar', title: 'x' });
    assert.equal(ogr.status, 403);
    const r = await gonder(HOCA, {
      hedef: 'bolum',
      departmentId: 'bilgisayar',
      title: 'Duyuru',
      message: 'Portalda yeni duyuru',
      haric: '2021002',
    });
    const j = await r.json();
    assert.equal(r.status, 200, JSON.stringify(j));
    assert.ok(j.gonderilen >= 1);
    assert.ok(await bul('student_notifications', { studentNumber: '2021001', title: 'Duyuru' }));
    assert.equal(
      await bul('student_notifications', { studentNumber: '2021002', title: 'Duyuru' }),
      null
    );
    assert.ok(
      await bul('notifications', { recipientId: '2021001', title: 'Duyuru' }),
      'zile de düşer'
    );
  } finally {
    s2.close();
  }
});

test('denetim kaydı: istemci yalnız ekler, kim/rol sunucuda damgalanır', async () => {
  const ekle = await yaz(HOCA, {
    collection: 'audit_logs',
    type: 'add',
    data: { action: 'course_update', target: 'sinav_dersler', targetId: 'c1', actor: 'Sahte KİŞİ' },
  });
  assert.equal(ekle.durum, 200, JSON.stringify(ekle.j));
  const k = await bul('audit_logs', { action: 'course_update', targetId: 'c1' });
  assert.equal(k.actor, 'Dr. Ali VELİ', 'aktör oturumdan damgalanır');
  assert.equal(k.kaynak, 'istemci');
  const degistir = await yaz(HOCA, {
    collection: 'audit_logs',
    type: 'set',
    docId: String(k._id),
    data: { action: 'silindi' },
  });
  assert.equal(degistir.durum, 403, 'denetim kaydı değiştirilemez');
});

test('ders öğrencileri: hoca yalnız kendi dersinin güncel dönem listesini alır', async () => {
  const { donemAnahtari } = await import('../../lib/ders-odasi.js');
  const donem = donemAnahtari();
  await db.collection('sinav_dersler').insertMany([
    {
      _docId: 'dersA',
      id: 'dersA',
      code: 'BİL101',
      professor: 'Dr. Ali VELİ',
      departmentId: 'bilgisayar',
    },
    {
      _docId: 'dersB',
      id: 'dersB',
      code: 'BİL102',
      professor: 'Dr. Başka HOCA',
      departmentId: 'bilgisayar',
    },
  ]);
  await db.collection('student_courses').insertMany([
    {
      _docId: '2021001__' + donem,
      studentNumber: '2021001',
      termKey: donem,
      courseIds: ['dersA', 'dersB'],
    },
    {
      _docId: '2021002__2000-2001_guz',
      studentNumber: '2021002',
      termKey: '2000-2001_guz',
      courseIds: ['dersA'],
    },
  ]);
  const app3 = require('express')();
  app3.use(require('express').json());
  app3.use(require('cookie-parser')());
  app3.use('/api/yoklama', require('../routes/yoklama'));
  const s3 = await new Promise((ok) => {
    const s = app3.listen(0, '127.0.0.1', () => ok(s));
  });
  try {
    const r = await fetch(
      'http://127.0.0.1:' + s3.address().port + '/api/yoklama/ders-ogrencileri?dersler=dersA,dersB',
      { headers: { authorization: 'Bearer ' + HOCA } }
    );
    const j = await r.json();
    assert.equal(r.status, 200, JSON.stringify(j));
    assert.deepEqual(j.dersler, { dersA: ['2021001'] }, 'başkasının dersi ve eski dönem dışarıda');
    assert.equal(j.ogrenciler['2021001'].firstName, 'AYŞE');
  } finally {
    s3.close();
  }
});

test('ders seçimleri: öğrenci yalnız kendi seçimlerini okur (eski kimlik biçimi dahil)', async () => {
  await db.collection('student_courses').insertOne({
    _docId: '2021001__1999-2000_guz',
    courseIds: ['eski'],
  });
  const r = await fetch(taban + '/api/db/student_courses', {
    headers: { authorization: 'Bearer ' + OGR },
  });
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.ok(j.length >= 2, 'kendi kayıtları (studentNumber ve eski kimlik)');
  assert.ok(
    j.every((x) => String(x.studentNumber || x.id).startsWith('2021001')),
    'başkasının seçimi gelmez: ' + JSON.stringify(j.map((x) => x.id))
  );
});

test('portal etkileşimi: öğrenci başkasının gönderisine tepki/oy verir, yalnız kendi adına', async () => {
  await db.collection('portal_posts').insertOne({
    _docId: 'post1',
    authorId: '2021002',
    _owner: '2021002',
    studentNumber: '2021002',
    title: 'Gönderi',
    reactions: { like: [] },
    upvotes: ['diger'],
    downvotes: [],
  });
  const guncelle = (t, data, ek) =>
    fetch(taban + '/api/db/write', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t },
      body: JSON.stringify({
        operations: [{ collection: 'portal_posts', type: 'update', docId: 'post1', data, ...ek }],
      }),
    });
  const tepki = await guncelle(OGR, { 'reactions.like': ['2021001'] });
  assert.equal(tepki.status, 200, await tepki.text());
  let p = await bul('portal_posts', { _docId: 'post1' });
  assert.deepEqual(p.reactions.like, ['2021001']);

  const sahte = await guncelle(OGR, { upvotes: ['diger', '2021001', 'baskasi'] });
  assert.equal(sahte.status, 403, 'başkası adına oy verilemez');

  const oy = await guncelle(OGR, { upvotes: ['diger', '2021001'], voteScore: 999 });
  assert.equal(oy.status, 200);
  p = await bul('portal_posts', { _docId: 'post1' });
  assert.equal(p.voteScore, 2, 'oy puanı sunucuda hesaplanır');

  const icerik = await guncelle(OGR, { title: 'Değişti' });
  assert.equal(icerik.status, 403, 'içerik değiştirilemez');

  // Yorum: gönderisine bağlanır, sayaç sunucuda
  const yorum = await fetch(taban + '/api/db/write', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + OGR },
    body: JSON.stringify({
      operations: [
        {
          collection: 'portal_posts',
          type: 'add',
          parentDocId: 'post1',
          subCollection: 'comments',
          data: { text: 'yorum', authorId: '2021001', likes: [] },
        },
      ],
    }),
  });
  assert.equal(yorum.status, 200, await yorum.text());
  p = await bul('portal_posts', { _docId: 'post1' });
  assert.equal(p.commentCount, 1);
  const y = await bul('portal_posts_comments', { text: 'yorum' });
  assert.equal(y._parentDocId, 'post1');

  // Başkasının yorumunu beğenme
  const begen = await fetch(taban + '/api/db/write', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + OGR2 },
    body: JSON.stringify({
      operations: [
        {
          collection: 'portal_posts',
          type: 'update',
          docId: String(y._id),
          parentDocId: 'post1',
          subCollection: 'comments',
          data: { likes: ['2021002'] },
        },
      ],
    }),
  });
  assert.equal(begen.status, 200, await begen.text());
});
