const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Upload dizini
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

// Dizin yoksa oluştur
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer ayarları
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Alt dizin desteği (forms/, portal_files/, resources/)
    const subDir = req.body.folder || "general";
    const dir = path.join(UPLOAD_DIR, subDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Güvenli dosya adı: timestamp + orijinal ad
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// POST /api/files/upload
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Dosya gerekli." });
  }

  const folder = req.body.folder || "general";
  const fileName = `${folder}/${req.file.filename}`;
  const downloadURL = `/api/files/download/${fileName}`;

  res.json({
    success: true,
    downloadURL,
    fileName,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

// GET /api/files/download/* - Dosya indirme/görüntüleme (nested folder desteği)
router.get("/download/*", (req, res) => {
  const relativePath = req.params[0];
  const filePath = path.join(UPLOAD_DIR, relativePath);

  // Path traversal koruması
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) {
    return res.status(403).json({ error: "Geçersiz dosya yolu." });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Dosya bulunamadı." });
  }

  // ?download=true ise indirmeye zorla
  if (req.query.download === "true") {
    return res.download(filePath);
  }

  // Varsayılan: tarayıcıda inline göster
  res.sendFile(filePath);
});

// DELETE /api/files/:folder/:filename
router.delete("/:folder/:filename", (req, res) => {
  const { folder, filename } = req.params;
  const filePath = path.join(UPLOAD_DIR, folder, filename);

  // Path traversal koruması
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) {
    return res.status(403).json({ error: "Geçersiz dosya yolu." });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Dosya bulunamadı." });
  }

  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error("File delete error:", error);
    res.status(500).json({ error: "Dosya silinemedi: " + error.message });
  }
});

module.exports = router;
