const express = require("express");
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

  app.listen(PORT, () => {
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
