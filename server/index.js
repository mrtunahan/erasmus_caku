const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { connect, disconnect } = require("./config/database");
const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const dbRoutes = require("./routes/db");
const fileRoutes = require("./routes/files");
const akademisyenRoutes = require("./routes/akademisyen");

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
  const { Server } = require("socket.io");
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
    path: "/socket.io",
  });
  app.set("io", io);
  io.on("connection", (socket) => {
    // bağlanmış istemci sayısını izlemek istersek burada loglarız
    socket.on("subscribe", (rooms) => {
      if (Array.isArray(rooms)) rooms.forEach(r => typeof r === "string" && socket.join(r));
    });
  });
  console.log("[Socket.IO] hazır (/socket.io)");
} catch (e) {
  console.warn("[Socket.IO] yüklenemedi — gerçek zamanlı devre dışı:", e.message);
}

// Reverse proxy (nginx) arkasında çalıştığı için gerçek client IP'yi al
// express-rate-limit'in X-Forwarded-For header'ını doğru okuması için şart
app.set("trust proxy", 1);

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/db", dbRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/akademisyen", akademisyenRoutes);

// Yakalanmamış hataları logla ve sunucunun çökmesini engelle
process.on("unhandledRejection", (reason, promise) => {
  console.error("[UNHANDLED REJECTION]", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT EXCEPTION]", err);
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
      console.error(
        `Sunucu başlatılamadı (deneme ${retries}/${MAX_RETRIES}):`,
        err.message
      );

      if (retries >= MAX_RETRIES) {
        console.error("Maksimum deneme sayısına ulaşıldı. Çıkılıyor.");
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
process.on("SIGINT", async () => {
  console.log("\nSunucu kapatılıyor...");
  await disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnect();
  process.exit(0);
});

start();
