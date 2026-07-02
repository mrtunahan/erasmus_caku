require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connect, disconnect, getDbSafe } = require('./config/database');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const dbRoutes = require('./routes/db');
const fileRoutes = require('./routes/files');
const templateRoutes = require('./routes/templates');
const semanticRoutes = require('./routes/semantic');
const {
  helmetMiddleware,
  authRateLimiter,
  apiRateLimiter,
  corsOrigin,
} = require('./middleware/security');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { requestId } = require('./middleware/requestId');
const { csrfOriginCheck } = require('./middleware/csrf');
const { logger } = require('./lib/logger');
const {
  initSentry,
  sentryRequestHandler,
  sentryErrorHandler,
  captureException,
} = require('./lib/sentry');

// NODE_ENV ayarlanmamışsa uyar (Express otomatik dev moduna düşer; stack
// sızıntısı riski). Üretimde mutlaka set edin.
if (!process.env.NODE_ENV) {
  logger.warn("[startup] NODE_ENV ayarlı değil — 'development' varsayılacak");
}

initSentry();

const PORT = process.env.PORT || 3001;
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 5000;

const app = express();
const httpServer = http.createServer(app);

// ── Socket.IO (gerçek zamanlı bildirim/güncelleme) ──
// Yazma işlemlerinden sonra etkilenen koleksiyon için "db:write" yayınlanır;
// istemci tarafı cache'i geçersiz kılar ve modüller dinleyebilir.
let io = null;
try {
  const { Server } = require('socket.io');
  io = new Server(httpServer, {
    cors: { origin: corsOrigin(), credentials: true },
    path: '/socket.io',
  });
  app.set('io', io);
  io.on('connection', (socket) => {
    // bağlanmış istemci sayısını izlemek istersek burada loglarız
    socket.on('subscribe', (rooms) => {
      if (Array.isArray(rooms)) rooms.forEach((r) => typeof r === 'string' && socket.join(r));
    });
  });
  console.log('[Socket.IO] hazır (/socket.io)');
} catch (e) {
  console.warn('[Socket.IO] yüklenemedi — gerçek zamanlı devre dışı:', e.message);
}

// Reverse proxy (nginx) arkasında çalıştığı için gerçek client IP'yi al
// express-rate-limit'in X-Forwarded-For header'ını doğru okuması için şart
app.set('trust proxy', 1);

// Middleware
app.use(sentryRequestHandler());
app.use(requestId);

// Opsiyonel: compression — yanıtları gzip'le (nginx zaten yapıyorsa idempotent)
try {
  const compression = require('compression');
  app.use(compression());
} catch (_e) {
  logger.warn('[startup] compression bulunamadı — gzip devre dışı (nginx yapıyorsa sorun değil)');
}

// Opsiyonel: pino-http — yapılandırılmış istek log'u
try {
  const pinoHttp = require('pino-http');
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      // Liveness probe'larını sessizleştir
      autoLogging: { ignore: (req) => req.url === '/api/health/live' },
      serializers: {
        req: (req) => ({ method: req.method, url: req.url, id: req.id }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    })
  );
} catch (_e) {
  logger.warn("[startup] pino-http bulunamadı — istek log'u devre dışı");
}

app.use(helmetMiddleware());
app.use(cors({ origin: corsOrigin(), credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
// CSRF defense-in-depth (SameSite=Strict cookie + Origin/Referer kontrolü).
// Varsayılan SOFT log; CSRF_PROTECTION=enforce ile bloklar.
app.use('/api', csrfOriginCheck(getDbSafe));
app.use('/api', apiRateLimiter());

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRateLimiter(), authRoutes);
app.use('/api/db', dbRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/semantic', semanticRoutes);

// 404 + merkezi hata yakalayıcı (route'lardan sonra mount edilmeli)
app.use(notFoundHandler);
app.use(sentryErrorHandler());
app.use(errorHandler);

// Yakalanmamış hataları logla ve sunucunun çökmesini engelle
process.on('unhandledRejection', (reason) => {
  logger.error(
    { reason: reason && (reason.stack || reason.message || String(reason)) },
    'UNHANDLED REJECTION'
  );
  captureException(reason instanceof Error ? reason : new Error(String(reason)));
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err: err.stack || err.message }, 'UNCAUGHT EXCEPTION');
  captureException(err);
  process.exit(1);
});

// Sunucuyu başlat (MongoDB bağlantısı için retry mantığı ile)
async function start() {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await connect();
      break; // Bağlantı başarılı — döngüden çık
    } catch (err) {
      retries++;
      console.error(`Sunucu başlatılamadı (deneme ${retries}/${MAX_RETRIES}):`, err.message);

      if (retries >= MAX_RETRIES) {
        console.error('Maksimum deneme sayısına ulaşıldı. Çıkılıyor.');
        process.exit(1);
      }

      console.log(`${RETRY_DELAY_MS / 1000} saniye sonra tekrar denenecek...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  httpServer.listen(PORT, () => {
    console.log(`API sunucusu çalışıyor: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nSunucu kapatılıyor...');
  await disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnect();
  process.exit(0);
});

start();
