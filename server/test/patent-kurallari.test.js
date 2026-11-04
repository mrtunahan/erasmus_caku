// ══════════════════════════════════════════════════════════════
// PATENT & FSMH — SUNUCU OKUMA/YAZMA KURALLARI, UÇTAN UCA
//
// Gerçek routes/db.js bellekte bir veritabanıyla (test/sahte-db.js) çalışır:
//   • yönetici bayrağını (isPatentYoneticisi) yalnız üniversite yetkilisi verir
//   • portföy koleksiyonlarını yalnız Patent & FSMH yöneticisi okur/yazar
//   • buluş bildirimi: akademisyen yalnız kendininkini görür ve yazar;
//     yönetici karar verir, kararda sahibine zil bildirimi düşer
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
const HOCA = jeton({ role: 'professor', identifier: 'Dr. Ali VELİ', departmentId: 'bilgisayar' });
const HOCA2 = jeton({ role: 'professor', identifier: 'Dr. Can DEMİR', departmentId: 'kimya' });
const YONETICI = jeton({ role: 'professor', identifier: 'Dr. Patent YÖNETİCİ' });
const REKTOR = jeton({ role: 'professor', identifier: 'Prof. Dr. Üni YETKİLİ' });
const OGR = jeton({ role: 'student', identifier: '2021001', departmentId: 'bilgisayar' });

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
async function oku(token, yol) {
  const r = await fetch(taban + '/api/db/' + yol, {
    headers: { authorization: 'Bearer ' + token },
  });
  const j = await r.json().catch(() => null);
  return { durum: r.status, liste: Array.isArray(j) ? j : (j && (j.data || j.docs)) || [] };
}

const bildirim = (sahip, ek) => ({
  sahip,
  durum: 'bekliyor',
  adSoyad: sahip,
  baslik: 'Akıllı sulama',
  tur: 'Patent',
  ozet: 'Toprak nemine göre sulama.',
  ortaklar: [],
  ...(ek || {}),
});

test.before(async () => {
  await db.collection('professors').insertMany([
    { _docId: 'p1', id: 'p1', name: 'Dr. Ali VELİ', departmentId: 'bilgisayar' },
    { _docId: 'p2', id: 'p2', name: 'Dr. Can DEMİR', departmentId: 'kimya' },
    { _docId: 'p3', id: 'p3', name: 'Dr. Patent YÖNETİCİ', isPatentYoneticisi: true },
    { _docId: 'p4', id: 'p4', name: 'Prof. Dr. Üni YETKİLİ', isUniversityAdmin: true },
  ]);
  await new Promise((ok) => {
    sunucu = app.listen(0, '127.0.0.1', ok);
  });
  taban = 'http://127.0.0.1:' + sunucu.address().port;
});
test.after(() => sunucu && sunucu.close());

test('Patent & FSMH yöneticisini yalnız üniversite yetkilisi atar', async () => {
  const hoca = await yaz(HOCA, {
    collection: 'professors',
    type: 'set',
    docId: 'p1',
    merge: true,
    data: { isPatentYoneticisi: true },
  });
  // Yetkisiz yazmada bayrak ya reddedilir ya da sessizce düşürülür (kendi
  // kaydının alan süzgeci) — iki durumda da bayrak YAZILMAZ.
  assert.ok([200, 403].includes(hoca.durum));
  assert.ok(!(await db.collection('professors').findOne({ _docId: 'p1' })).isPatentYoneticisi);

  const rektor = await yaz(REKTOR, {
    collection: 'professors',
    type: 'set',
    docId: 'p2',
    merge: true,
    data: { isPatentYoneticisi: true },
  });
  assert.equal(rektor.durum, 200);
  assert.equal(
    (await db.collection('professors').findOne({ _docId: 'p2' })).isPatentYoneticisi,
    true
  );
  // geri al (sonraki testler p2'yi sade akademisyen sayar; bayrak önbelleği
  // p2 için henüz dolmadı)
  await db
    .collection('professors')
    .updateOne({ _docId: 'p2' }, { $set: { isPatentYoneticisi: false } });
});

test('portföyü yalnız Patent & FSMH yöneticisi okur ve yazar', async () => {
  const kayit = {
    collection: 'patent_kayitlari',
    type: 'add',
    data: { no: 1, baslik: 'X', basvuruSahibiNo: 1, fsmhTuruNo: 1, ortaklar: [] },
  };
  assert.equal((await yaz(HOCA, kayit)).durum, 403, 'sade akademisyen yazamaz');
  assert.equal((await yaz(REKTOR, kayit)).durum, 403, 'üniversite yetkilisi de yazamaz');
  assert.equal((await oku(HOCA, 'patent_kayitlari')).durum, 403);
  assert.equal((await oku(REKTOR, 'patent_kayitlari')).durum, 403);
  assert.equal((await oku(OGR, 'patent_kayitlari')).durum, 403);

  assert.equal((await yaz(YONETICI, kayit)).durum, 200);
  const r = await oku(YONETICI, 'patent_kayitlari');
  assert.equal(r.durum, 200);
  assert.equal(r.liste.length, 1);

  assert.equal((await yaz(YONETICI, kayit)).durum, 409, 'aynı kayıt numarası ikinci kez açılmaz');
  const eksik = await yaz(YONETICI, {
    collection: 'patent_kayitlari',
    type: 'add',
    data: { no: 2, baslik: '', basvuruSahibiNo: 1, fsmhTuruNo: 1 },
  });
  assert.equal(eksik.durum, 400, 'zorunlu alan sunucuda da aranır');
  const numarasiz = await yaz(YONETICI, {
    collection: 'patent_kayitlari',
    type: 'add',
    data: { baslik: 'Y', basvuruSahibiNo: 1, fsmhTuruNo: 1 },
  });
  assert.equal(numarasiz.durum, 400, 'eklenen kayıt numara taşımalı');
});

test('buluş bildirimi: akademisyen yalnız kendininkini görür ve yazar', async () => {
  const baskasiAdina = await yaz(HOCA, {
    collection: 'patent_bildirimleri',
    type: 'add',
    data: bildirim('Dr. Can DEMİR'),
  });
  assert.equal(baskasiAdina.durum, 403, 'başkası adına bildirim açılmaz');
  const kabulle = await yaz(HOCA, {
    collection: 'patent_bildirimleri',
    type: 'add',
    data: bildirim('Dr. Ali VELİ', { durum: 'kabul' }),
  });
  assert.equal(kabulle.durum, 403, 'bildirim kendi kendini kabul edemez');

  const ali = await yaz(HOCA, {
    collection: 'patent_bildirimleri',
    type: 'add',
    data: bildirim('Dr. Ali VELİ'),
  });
  assert.equal(ali.durum, 200);
  const can = await yaz(HOCA2, {
    collection: 'patent_bildirimleri',
    type: 'add',
    data: bildirim('Dr. Can DEMİR', { baslik: 'Biyobozunur ambalaj' }),
  });
  assert.equal(can.durum, 200);

  const aliGorur = await oku(HOCA, 'patent_bildirimleri');
  assert.deepEqual(
    aliGorur.liste.map((b) => b.sahip),
    ['Dr. Ali VELİ'],
    'akademisyen yalnız kendi bildirimini görür'
  );
  assert.equal(
    (await oku(YONETICI, 'patent_bildirimleri')).liste.length,
    2,
    'yönetici hepsini görür'
  );
  // Tek belge ucu kaydı _docId ya da ObjectId ile bulur; sahte veritabanının
  // ürettiği kimlik ObjectId olmadığı için kayda bulunabilir bir _docId verilir.
  await db
    .collection('patent_bildirimleri')
    .updateOne({ sahip: 'Dr. Can DEMİR' }, { $set: { _docId: 'pb-can' } });
  assert.equal(
    (await oku(HOCA, 'patent_bildirimleri/pb-can')).durum,
    403,
    'başkasının bildirimi tek belge olarak da okunamaz'
  );
  assert.equal((await oku(HOCA2, 'patent_bildirimleri/pb-can')).durum, 200, 'sahibi okur');
  assert.equal((await oku(YONETICI, 'patent_bildirimleri/pb-can')).durum, 200, 'yönetici okur');

  const yonetimeYazma = await yaz(HOCA, {
    collection: 'patent_bildirimleri',
    type: 'update',
    docId: can.j.id,
    data: { baslik: 'değiştirildi' },
  });
  assert.equal(yonetimeYazma.durum, 403, 'başkasının bildirimi değiştirilemez');
  assert.equal(
    (
      await yaz(HOCA, {
        collection: 'patent_bildirimleri',
        type: 'update',
        docId: ali.j.id,
        data: { durum: 'kabul' },
      })
    ).durum,
    403,
    'sahip durumu kabule çeviremez'
  );

  // Gönderimde yöneticiye zil bildirimi gitti.
  const zil = await db.collection('notifications').find({ module: 'patent' }).toArray();
  assert.ok(
    zil.some((n) => n.recipientId === 'Dr. Patent YÖNETİCİ' && n.type === 'patent-bildirim')
  );
});

test('yönetici yalnız karar alanlarını yazar; kararda sahibine bildirim düşer', async () => {
  const b = await db.collection('patent_bildirimleri').findOne({ sahip: 'Dr. Ali VELİ' });
  const id = String(b._id);
  const icerik = await yaz(YONETICI, {
    collection: 'patent_bildirimleri',
    type: 'update',
    docId: id,
    data: { baslik: 'yönetici değiştirdi' },
  });
  assert.equal(icerik.durum, 403, 'yönetici bildirimin içeriğini değiştiremez');
  const notsuzRet = await yaz(YONETICI, {
    collection: 'patent_bildirimleri',
    type: 'update',
    docId: id,
    data: { durum: 'ret' },
  });
  assert.equal(notsuzRet.durum, 403, 'ret gerekçesiz olmaz');
  const sadeKarar = await yaz(HOCA2, {
    collection: 'patent_bildirimleri',
    type: 'update',
    docId: id,
    data: { durum: 'kabul' },
  });
  assert.equal(sadeKarar.durum, 403, 'sade akademisyen karar veremez');

  const kabul = await yaz(YONETICI, {
    collection: 'patent_bildirimleri',
    type: 'update',
    docId: id,
    data: { durum: 'kabul', patentNo: 1, yoneticiNotu: '' },
  });
  assert.equal(kabul.durum, 200);
  const son = await db.collection('patent_bildirimleri').findOne({ sahip: 'Dr. Ali VELİ' });
  assert.equal(son.durum, 'kabul');
  assert.equal(son.baslik, 'Akıllı sulama', 'içerik korunur');
  const zil = await db
    .collection('notifications')
    .find({ module: 'patent', recipientId: 'Dr. Ali VELİ' })
    .toArray();
  assert.ok(zil.some((n) => n.type === 'patent-karar'));

  const sil = await yaz(HOCA, { collection: 'patent_bildirimleri', type: 'delete', docId: id });
  assert.equal(sil.durum, 403, 'karara bağlanmış bildirim silinemez');
});
