const express = require('express');
const { getDbSafe } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Ayrıntılı sağlık bilgisi (koleksiyon adları + kayıt sayıları, 'passwords'
// dahil) yalnız admin'e verilir. Anonim istek yine 200 + status:ok alır
// (dış uptime izleyicileri bozulmasın), ama envanter dökümü almaz.
function isAdminReq(req) {
  const tok =
    (req.cookies && req.cookies.caku_auth) ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);
  if (!tok) return false;
  try {
    return verifyToken(tok).role === 'admin';
  } catch (_) {
    return false;
  }
}

// Tüm bilinen koleksiyonlar
const COLLECTIONS = [
  'students',
  'professors',
  'passwords',
  'departments',
  'department_classrooms',
  'sinav_programi',
  'sinav_dersler',
  'sinav_donemler',
  'exams',
  'exam_results',
  'exam_periods',
  'course_groups',
  'course_group_posts',
  'course_schedules',
  'trip_history',
  'portal_posts',
  'portal_moderators',
  'portal_notifications',
  'portal_profiles',
  'portal_follows',
  'portal_reports',
  'muafiyet_settings',
  'muafiyet_records',
  'projects',
  'project_courses',
  'events',
  'resources',
  'forms',
  'internships',
];

// GET /api/health — eski sözleşme korunur, yeni alanlar additif
router.get('/', async (req, res) => {
  try {
    const db = await getDbSafe();
    // Anonim/normal kullanıcı: yalnız canlılık — envanter sızdırılmaz
    if (!isAdminReq(req)) {
      await db.command({ ping: 1 });
      return res.json({ status: 'ok', database: 'mongodb' });
    }

    const counts = {};
    let totalDocuments = 0;
    await Promise.all(
      COLLECTIONS.map(async (name) => {
        const count = await db.collection(name).countDocuments();
        counts[name] = count;
        totalDocuments += count;
      })
    );

    res.json({
      status: 'ok',
      database: 'mongodb',
      totalCollections: COLLECTIONS.length,
      totalDocuments,
      collections: counts,
    });
  } catch (err) {
    console.error('health error:', err);
    res.status(500).json({ status: 'error' });
  }
});

// GET /api/health/live — hafif liveness probe (Kubernetes/Docker için)
// DB sorgulamadan sadece sunucunun cevap verdiğini doğrular.
router.get('/live', (req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
});

// GET /api/health/ready — readiness: DB ping + uptime + memory
router.get('/ready', async (req, res) => {
  const started = Date.now();
  try {
    const db = await getDbSafe();
    const pingStarted = Date.now();
    await db.command({ ping: 1 });
    const pingMs = Date.now() - pingStarted;
    const mem = process.memoryUsage();
    res.json({
      status: 'ok',
      uptimeSec: Math.round(process.uptime()),
      nodeVersion: process.version,
      env: process.env.NODE_ENV || 'development',
      mongo: { reachable: true, pingMs },
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      },
      latencyMs: Date.now() - started,
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      mongo: { reachable: false, error: err.message },
      uptimeSec: Math.round(process.uptime()),
      latencyMs: Date.now() - started,
    });
  }
});

module.exports = router;
