// ══════════════════════════════════════════════════════════════
// PATENT & FSMH TAKİBİ — YETKİ KAPISI
//
// Patent & FSMH Takibi ayrı bir uygulamadır (mrtunahan/patent — FastAPI +
// kendi SQLite veritabanı). Kendi girişi YOKTUR; şartnamesine göre kimlik ve
// yetki ana sistemin (Offline Asistan) sorumluluğundadır. Uygulama nginx
// arkasında /patent/ altında yayınlanır ve nginx oraya giden HER isteği
// (sayfa, varlık, API) önce buraya sorar (auth_request,
// ssl-setup/nginx-domain.conf):
//
//   GET /api/patent/yetki   (oturum çerezi caku_auth ya da Bearer jeton)
//     204 → Patent & FSMH yöneticisi (ya da sistem yöneticisi): geçir
//     401 → oturum yok / süresi dolmuş
//     403 → oturum var ama yönetici değil
//
// Yönetici = üniversite yetkilisinin atadığı akademisyen
// (professors.isPatentYoneticisi — Üniversite Yönetimi → Patent & FSMH
// Yöneticileri). Karar kısa süre önbelleklenir: bir sayfa açılışı nginx'te
// onlarca alt istek üretir.
// ══════════════════════════════════════════════════════════════
const express = require('express');
const { getDbSafe } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { profilBul } = require('../lib/akademisyen-kimlik');

const router = express.Router();

const ONBELLEK_MS = 30 * 1000;
const onbellek = new Map(); // ad → { yonetici, ts }

function jeton(req) {
  if (req.cookies && req.cookies.caku_auth) return req.cookies.caku_auth;
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  return null;
}

function kullanici(req) {
  const t = jeton(req);
  if (!t) return null;
  try {
    // verifyToken iptal edilmiş oturumu da reddeder (lib/oturum-iptal.js).
    return verifyToken(t);
  } catch (_) {
    return null;
  }
}

async function patentYoneticisiMi(user) {
  if (!user) return false;
  // Sistem yöneticisi (eski admin girişi) her zaman geçer. Üniversite/fakülte
  // yetkilisi jetonu 'professor' rolüyle taşır; onlar bayrakla geçer.
  if (user.role === 'admin') return true;
  if (user.role !== 'professor' || !user.identifier) return false;
  const ad = String(user.identifier);
  const hit = onbellek.get(ad);
  if (hit && Date.now() - hit.ts < ONBELLEK_MS) return hit.yonetici;
  let yonetici = false;
  try {
    const prof = await profilBul(await getDbSafe(), ad);
    yonetici = !!(prof && prof.isPatentYoneticisi);
  } catch (_) {
    yonetici = false; // profil okunamazsa geçirilmez
  }
  onbellek.set(ad, { yonetici, ts: Date.now() });
  return yonetici;
}

router.get('/yetki', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const user = kullanici(req);
  if (!user) return res.status(401).end();
  if (!(await patentYoneticisiMi(user))) return res.status(403).end();
  // nginx bu başlığı (auth_request_set) uygulamaya iletebilir — bilgi amaçlı.
  res.set('X-Patent-Kullanici', encodeURIComponent(String(user.identifier || user.name || '')));
  return res.status(204).end();
});

module.exports = router;
module.exports._onbellekTemizle = () => onbellek.clear();
