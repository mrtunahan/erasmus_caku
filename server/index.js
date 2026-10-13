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
const tanitimRoutes = require('./routes/tanitim');
const templateRoutes = require('./routes/templates');
const semanticRoutes = require('./routes/semantic');
const aiRoutes = require('./routes/ai');
const yoklamaRoutes = require('./routes/yoklama');
const bildirimRoutes = require('./routes/bildirim');
const adayRoutes = require('./routes/aday');
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
// Tanıtım sayfası görselleri: anonim, salt okunur, yalnız uploads/tanitim.
app.use('/api/tanitim', tanitimRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/semantic', semanticRoutes);
app.use('/api/ai', aiRoutes);
// Dijital yoklama: kayıt YALNIZ buradan yazılır (bkz. routes/yoklama.js).
app.use('/api/yoklama', yoklamaRoutes);
// Navbar bildirim zili: kişiye özel liste, okundu, sil (bkz. routes/bildirim.js).
app.use('/api/bildirim', bildirimRoutes);
// Numarasız aday (dikey / kurumlararası / merkezi yerleştirme) hesabı.
// Hız sınırı yalnız kimliksiz uçlarda; personel listesi ve /ben bunu tüketmesin.
app.use('/api/aday/kayit', authRateLimiter());
app.use('/api/aday/giris', authRateLimiter());
app.use('/api/aday', adayRoutes);
// Hesap e-postası (kodla doğrulama) ve "Şifremi unuttum" (bkz. routes/eposta.js).
// Kimliksiz uçlar giriş uçlarıyla aynı IP sınırına bağlı.
app.use('/api/eposta/sifremi-unuttum', authRateLimiter());
app.use('/api/eposta/sifre-yenile', authRateLimiter());
app.use('/api/eposta', require('./routes/eposta'));

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

  // Şifresi e-postayla sıfırlanan hesapların iptal edilmiş oturumları
  // (lib/oturum-iptal.js) — dinlemeye başlamadan önce yüklenir.
  try {
    await require('./lib/oturum-iptal').yukle(await getDbSafe());
  } catch (e) {
    console.warn('[oturum-iptal] yüklenemedi:', e && e.message);
  }
  // E-posta koleksiyonları: adres araması için dizin; süresi geçen kod ve
  // bağlantılar bir gün sonra MongoDB tarafından kendiliğinden silinir (TTL).
  try {
    const dbE = await getDbSafe();
    await dbE.collection('hesap_epostalari').createIndex({ eposta: 1 });
    await dbE.collection('sifre_sifirlama').createIndex({ son: 1 }, { expireAfterSeconds: 86400 });
    await dbE.collection('eposta_dogrulama').createIndex({ son: 1 }, { expireAfterSeconds: 86400 });
  } catch (e) {
    console.warn('[eposta] dizinler oluşturulamadı:', e && e.message);
  }
  console.log(
    require('./lib/posta').postaHazirMi()
      ? '[posta] Resend etkin — e-posta doğrulaması girişte zorunlu.'
      : '[posta] RESEND_API_KEY tanımlı değil — e-postalar gönderilmez (konsola yazılır)' +
          (process.env.EPOSTA_ZORUNLU === '1'
            ? '; EPOSTA_ZORUNLU=1 (test).'
            : '; girişte e-posta zorunlu değil.')
  );

  httpServer.listen(PORT, () => {
    console.log(`API sunucusu çalışıyor: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });

  // ── Aday verisi saklama süresi ──
  // Kazanamayan / kayıt yaptırmayan adayın verisi dönem bitişinden (ya da
  // hesabın kapatılmasından) 30 gün sonra silinir (lib/aday-hesap.js).
  // Açılıştan bir dakika sonra ve her 6 saatte bir bakılır.
  const adayTemizle = () =>
    adayRoutes
      .adayTemizligi()
      .catch((e) => console.warn('[aday] temizlik çalışmadı:', e && e.message));
  setTimeout(adayTemizle, 60 * 1000).unref();
  setInterval(adayTemizle, 6 * 60 * 60 * 1000).unref();
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
