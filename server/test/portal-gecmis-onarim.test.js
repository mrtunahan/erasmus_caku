// Portal geçmiş onarımı (server/lib/portal-gecmis-onarim.js) — sahte veritabanıyla.
const test = require('node:test');
const assert = require('node:assert/strict');
const { SahteDb } = require('./sahte-db');
const { portalGecmisiOnar } = require('../lib/portal-gecmis-onarim');

const oid = (ms, son) =>
  Math.floor(ms / 1000)
    .toString(16)
    .padStart(8, '0') + son.padStart(16, '0');
const T = Date.UTC(2026, 10, 8, 12, 0, 0);
const kayit = (ms, actor, status, ops) => ({ at: new Date(ms), actor, status, operations: ops });

test('yorumlar gönderisine bağlanır, tek sayıda reddedilen tepki eklenir, oy uydurulmaz', async () => {
  const db = new SahteDb();
  await db.collection('students').insertMany([
    { studentNumber: '2021001', firstName: 'AYŞE', lastName: 'YILMAZ' },
    { studentNumber: '2021002', firstName: 'CAN', lastName: 'DEMİR' },
  ]);
  await db.collection('portal_posts').insertMany([
    { _docId: 'p1', authorId: 'CAN DEMİR', reactions: { like: [] }, commentCount: 0 },
    { _docId: 'p2', authorId: 'CAN DEMİR', reactions: {}, commentCount: 5 },
  ]);
  await db.collection('portal_posts_comments').insertMany([
    { _id: oid(T, '1'), authorId: 'AYŞE YILMAZ', text: 'p1 yorumu', likes: [] },
    { _id: oid(T + 60000, '2'), authorId: 'CAN DEMİR', text: 'p2 yorumu' },
    { _id: oid(T + 3600000, '3'), authorId: 'X', text: 'eşi yok' },
  ]);
  await db.collection('audit_logs').insertMany([
    kayit(T + 400, '2021001', 200, [
      { type: 'add', collection: 'portal_posts', subCollection: 'comments', parentDocId: 'p1' },
    ]),
    kayit(T + 60300, '2021002', 200, [
      { type: 'add', collection: 'portal_posts', subCollection: 'comments', parentDocId: 'p2' },
    ]),
    // Tepki: 3 deneme (tek) → ekle; 2 deneme (çift) → dokunma
    ...[1, 2, 3].map((i) =>
      kayit(T + i * 1000, '2021001', 403, [
        { type: 'update', collection: 'portal_posts', docId: 'p1', fields: ['reactions.like'] },
      ])
    ),
    ...[1, 2].map((i) =>
      kayit(T + i * 1000, '2021001', 403, [
        { type: 'update', collection: 'portal_posts', docId: 'p2', fields: ['reactions.love'] },
      ])
    ),
    kayit(T + 5000, '2021001', 403, [
      {
        type: 'update',
        collection: 'portal_posts',
        docId: 'p1',
        fields: ['upvotes', 'downvotes', 'voteScore'],
      },
    ]),
  ]);

  const kuru = await portalGecmisiOnar(db, { uygula: false });
  assert.equal(kuru.yorumBaglandi, 2);
  assert.equal(kuru.yorumBaglanamadi, 1);
  assert.equal(kuru.tepkiEklendi, 1);
  assert.equal(kuru.oyDenemesiKurtarilamadi, 1);
  assert.equal(
    (await db.collection('portal_posts').findOne({ _docId: 'p1' })).reactions.like.length,
    0,
    'kuru çalışma yazmaz'
  );

  const r = await portalGecmisiOnar(db, { uygula: true });
  assert.equal(r.yorumBaglandi, 2);
  const y1 = await db.collection('portal_posts_comments').findOne({ text: 'p1 yorumu' });
  assert.equal(y1._parentDocId, 'p1');
  const p1 = await db.collection('portal_posts').findOne({ _docId: 'p1' });
  assert.deepEqual(p1.reactions.like, ['AYŞE YILMAZ']);
  assert.equal(p1.commentCount, 1);
  const p2 = await db.collection('portal_posts').findOne({ _docId: 'p2' });
  assert.equal(p2.commentCount, 1, 'yorum sayısı yeniden sayıldı');
  assert.ok(!p2.reactions.love, 'çift sayıda deneme değişiklik değildir');

  // İkinci çalıştırma bir şey değiştirmez (idempotent)
  const r2 = await portalGecmisiOnar(db, { uygula: true });
  assert.equal(r2.yorumBaglandi, 0);
  assert.equal(r2.tepkiEklendi, 0);
  assert.equal(r2.yorumSayaciGuncellendi, 0);
});
