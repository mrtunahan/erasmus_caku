// ══════════════════════════════════════════════════════════════
// akademisyen_cache içinde kayıtlı tüm akademisyenleri yeniden kazır
// (artık ÇAKUAVİS entegre, "Mühendislik Fakültesi" fallback'leri
// silinecek; gerçek ad/unvan/bölüm/foto/email ÇAKUAVİS'ten gelir).
//
//   Önce DRY_RUN ile etkilenecek kayıt sayısını gör:
//     node server/refresh-akademisyen-cache.js
//   Tüm kayıtları yenile (kazıyıcıyı çağırır):
//     APPLY=1 node server/refresh-akademisyen-cache.js
//   Bir bölüme sınırlı:
//     APPLY=1 DEPARTMENT_ID=bilgisayar node server/refresh-akademisyen-cache.js
//
// NOT: Kazıyıcı sunucudaki Express route'unu LOCAL HTTP üzerinden çağırır;
//   server'ın çalışıyor olması gerekir (port .env'den okunur, varsayılan 3001).
// ══════════════════════════════════════════════════════════════
const http = require('http');
const { disconnect, getDbSafe } = require('./config/database');

const APPLY = process.env.APPLY === '1';
const DEPT = process.env.DEPARTMENT_ID || '';
const PORT = process.env.PORT || process.env.SERVER_PORT || 3001;
const DELAY_MS = parseInt(process.env.DELAY_MS || '500', 10);

function callRefresh(username) {
  return new Promise((resolve) => {
    const path = `/api/akademisyen/${encodeURIComponent(username)}?force=true`;
    const req = http.get({ host: '127.0.0.1', port: PORT, path: path, timeout: 30000 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          resolve({ ok: res.statusCode === 200, data: j });
        } catch (_e) {
          resolve({ ok: false, error: 'invalid JSON', status: res.statusCode });
        }
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const db = await getDbSafe();
  const filter = DEPT ? { departmentId: DEPT } : {};
  const docs = await db.collection('akademisyen_cache').find(filter).toArray();
  console.log(`\n${docs.length} kayıt bulundu${DEPT ? ` (bölüm: ${DEPT})` : ''}.\n`);

  if (!APPLY) {
    console.log('İlk 10 örnek:');
    docs.slice(0, 10).forEach((d) => {
      console.log(`  ${d._docId}  "${(d.data && d.data.fullName) || '(boş)'}"`);
    });
    console.log('\n[DRY_RUN] Hiçbir kazıma yapılmadı. Uygulamak için:');
    console.log(
      `  APPLY=1${DEPT ? ' DEPARTMENT_ID=' + DEPT : ''} node server/refresh-akademisyen-cache.js\n`
    );
    await disconnect();
    return;
  }

  console.log(`Kazıma başlıyor (her arada ${DELAY_MS}ms bekleme)…\n`);
  let ok = 0,
    fail = 0;
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    const r = await callRefresh(d._docId);
    if (r.ok && r.data && r.data.fullName) {
      ok++;
      console.log(
        `  ✓ ${(i + 1).toString().padStart(3)}/${docs.length}  ${d._docId}  →  "${r.data.fullName}"  [${r.data.department || '—'}]`
      );
    } else {
      fail++;
      console.log(
        `  ✕ ${(i + 1).toString().padStart(3)}/${docs.length}  ${d._docId}  →  ${r.error || (r.data && r.data.error) || 'fail'}`
      );
    }
    if (i + 1 < docs.length) await wait(DELAY_MS);
  }
  console.log(`\nTamamlandı. ${ok} başarılı, ${fail} hatalı.\n`);
  await disconnect();
})().catch(async (e) => {
  console.error('HATA:', e.message);
  try {
    await disconnect();
  } catch (_) {
    /* yok say */
  }
  process.exit(1);
});
