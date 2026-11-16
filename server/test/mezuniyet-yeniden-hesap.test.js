// Mezuniyet geçmiş başvuru tazelemesi (server/lib/mezuniyet-yeniden-hesap.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const { SahteDb } = require('./sahte-db');
const { mezuniyetYenidenHesapla } = require('../lib/mezuniyet-yeniden-hesap');

const olcek = [
  ['A', 4, 90, 100],
  ['C3', 2, 60, 64],
  ['F2', 0, 0, 49],
].map(([harf, katsayi, min, max]) => ({ harf, katsayi, min, max }));

async function kur() {
  const db = new SahteDb();
  await db.collection('departments').insertMany([{ _docId: 'bil', name: 'Bilgisayar' }]);
  await db
    .collection('mezuniyet_kurallari')
    .insertMany([{ _docId: 'bil', notOlcegi: olcek, ekHarfler: [] }]);
  await db.collection('sinav_dersler').insertMany([
    {
      departmentId: 'bil',
      code: 'BİL101',
      name: 'Programlama',
      akts: 6,
      yariyil: 1,
      zorunlu: true,
    },
  ]);
  await db.collection('mezuniyet_basvurulari').insertMany([
    {
      _docId: '2021001',
      ogrenciNo: '2021001',
      ogrenciAd: 'Ayşe',
      departmentId: 'bil',
      durum: 'dilekce',
      danisman: 'Dr. X',
      dersler: [
        { kod: 'BİL101', ad: 'Programlama', akts: '6', not: 'A' },
        { kod: 'BİL471', ad: 'Sayısal Analiz', akts: '4', not: 'FF1' },
      ],
      ozet: {
        gecilenAkts: 0,
        toplamAkts: 240,
        ihlalSayisi: 9,
        kalanZorunlu: 1,
        mezunOlabilir: false,
      },
    },
  ]);
  return db;
}

test('kuru çalışma yazmaz; uygula kuralı onarır, özeti yeniler, kararlı başvuruyu listeler', async () => {
  const db = await kur();
  const kuru = await mezuniyetYenidenHesapla(db, {});
  assert.deepEqual(kuru.kuralOnarildi, ['bil']);
  assert.equal(kuru.ozetGuncellendi, 1);
  assert.equal(kuru.ekHarfliBasvuru, 1);
  assert.equal(kuru.incelenmeli[0].no, '2021001');
  const k0 = await db.collection('mezuniyet_kurallari').findOne({ _docId: 'bil' });
  assert.equal(k0.ekHarfler.length, 0);

  const yedekler = [];
  await mezuniyetYenidenHesapla(db, { uygula: true, yedek: (k, b) => yedekler.push(k) });
  const k1 = await db.collection('mezuniyet_kurallari').findOne({ _docId: 'bil' });
  assert.equal(k1.notOlcegi.find((r) => r.harf === 'A').gecer, true);
  assert.ok(k1.ekHarfler.some((r) => r.harf === 'FF1' && r.sayilanHarf === 'F2'));
  const b1 = await db.collection('mezuniyet_basvurulari').findOne({ _docId: '2021001' });
  assert.equal(b1.ozet.gecilenAkts > 0, true);
  assert.deepEqual(yedekler.sort(), ['mezuniyet_basvurulari', 'mezuniyet_kurallari']);

  // İkinci çalıştırma: değişecek bir şey kalmaz.
  const ikinci = await mezuniyetYenidenHesapla(db, {});
  assert.equal(ikinci.kuralOnarildi.length, 0);
  assert.equal(ikinci.ozetGuncellendi, 0);
});
