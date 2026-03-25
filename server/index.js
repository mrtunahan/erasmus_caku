const express = require("express");
const cors = require("cors");
const { connect, disconnect } = require("./config/database");
const healthRoutes = require("./routes/health");

const PORT = process.env.PORT || 3001;
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/health", healthRoutes);

// Sunucuyu başlat
async function start() {
  try {
    await connect();

    app.listen(PORT, () => {
      console.log(`API sunucusu çalışıyor: http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error("Sunucu başlatılamadı:", err);
    process.exit(1);
  }
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
