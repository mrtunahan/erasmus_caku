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

// MIME tipi haritası (inline gösterim için)
const MIME_TYPES = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".txt": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".zip": "application/zip",
};

const getMimeType = (fname) => {
  const ext = path.extname(fname).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
};

const isInlineRenderable = (fname) => {
  const ext = path.extname(fname).toLowerCase();
  return [
    ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp",
    ".txt", ".html", ".htm", ".csv", ".json", ".xml",
    ".mp4", ".webm", ".mp3", ".wav",
  ].includes(ext);
};

// Orijinal dosya adını çıkart (timestamp_ önekini kaldır)
const extractOriginalName = (fname) => {
  const base = path.basename(fname);
  const m = base.match(/^\d+_(.+)$/);
  return m ? m[1] : base;
};

const resolveSafePath = (relativePath) => {
  const filePath = path.join(UPLOAD_DIR, relativePath);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) return null;
  if (fs.existsSync(filePath)) return filePath;
  // Fallback: dosya adını general/ dizininde ara (eski yüklemeler için)
  const fileName = path.basename(relativePath);
  const fallbackPath = path.join(UPLOAD_DIR, "general", fileName);
  const fallbackResolved = path.resolve(fallbackPath);
  if (fallbackResolved.startsWith(path.resolve(UPLOAD_DIR)) && fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }
  return null;
};

// GET /api/files/download/* - Dosya indirme/görüntüleme (nested folder desteği)
router.get("/download/*", (req, res) => {
  const relativePath = req.params[0];
  const filePath = resolveSafePath(relativePath);
  if (!filePath) {
    if (path.resolve(path.join(UPLOAD_DIR, relativePath)).startsWith(path.resolve(UPLOAD_DIR))) {
      return res.status(404).json({ error: "Dosya bulunamadı." });
    }
    return res.status(403).json({ error: "Geçersiz dosya yolu." });
  }

  const originalName = extractOriginalName(filePath);
  const mimeType = getMimeType(filePath);
  const asciiName = originalName.replace(/[^\x20-\x7E]/g, "_");
  const encodedName = encodeURIComponent(originalName);

  // ?download=true ise indirmeye zorla, aksi halde inline göster
  const disposition = req.query.download === "true" ? "attachment" : "inline";

  res.setHeader("Content-Type", mimeType);
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodedName}`
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");

  fs.createReadStream(filePath).pipe(res);
});

// GET /api/files/view/* - Tarayıcı içi görüntüleyici sayfası
// Office belgeleri (docx/xlsx/pptx) tarayıcılar tarafından inline render
// edilemez; bu sayfa türe göre uygun viewer'ı yükler veya indirme/dış viewer
// seçenekleri sunar.
router.get("/view/*", (req, res) => {
  const relativePath = req.params[0];
  const filePath = resolveSafePath(relativePath);
  if (!filePath) {
    return res.status(404).type("html").send(`<!doctype html><meta charset="utf-8"><title>Bulunamadı</title><body style="font-family:sans-serif;padding:40px;color:#374151"><h2>Dosya bulunamadı</h2><p>İstediğiniz dosya sunucuda bulunamadı.</p></body>`);
  }

  const originalName = extractOriginalName(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const fileUrl = `/api/files/download/${encodeURI(relativePath)}`;
  const downloadUrl = fileUrl + (fileUrl.includes("?") ? "&" : "?") + "download=true";

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
  const safeName = escapeHtml(originalName);

  let viewerHtml;
  if (ext === ".pdf") {
    viewerHtml = `<iframe src="${escapeHtml(fileUrl)}#view=FitH" style="border:0;width:100%;height:100%"></iframe>`;
  } else if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"].includes(ext)) {
    viewerHtml = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#0f172a;overflow:auto"><img src="${escapeHtml(fileUrl)}" alt="${safeName}" style="max-width:100%;max-height:100%;object-fit:contain"></div>`;
  } else if ([".txt", ".csv", ".json", ".xml", ".html", ".htm"].includes(ext)) {
    viewerHtml = `<iframe src="${escapeHtml(fileUrl)}" style="border:0;width:100%;height:100%;background:#fff"></iframe>`;
  } else if ([".mp4", ".webm"].includes(ext)) {
    viewerHtml = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#000"><video src="${escapeHtml(fileUrl)}" controls autoplay style="max-width:100%;max-height:100%"></video></div>`;
  } else if ([".mp3", ".wav"].includes(ext)) {
    viewerHtml = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#0f172a"><audio src="${escapeHtml(fileUrl)}" controls autoplay></audio></div>`;
  } else if ([".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"].includes(ext)) {
    // Office dosyaları tarayıcıda inline render edilemez. Office Online Viewer
    // sadece dosya internetten erişilebilirse çalışır; bu yüzden hem viewer
    // hem de indirme bağlantısı sunuyoruz.
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "";
    const absoluteUrl = `${proto}://${host}${fileUrl}`;
    const officeViewer = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;
    viewerHtml = `
      <div style="display:flex;flex-direction:column;width:100%;height:100%;background:#fff">
        <div style="padding:12px 16px;background:#f3f4f6;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151">
          Office belgeleri tarayıcıda doğrudan görüntülenemez. Aşağıda Microsoft Office Online ile önizleme deneniyor; çalışmazsa <a href="${escapeHtml(downloadUrl)}" download style="color:#0ea5e9;font-weight:600;text-decoration:none">indirip</a> bilgisayarınızdan açabilirsiniz.
        </div>
        <iframe src="${escapeHtml(officeViewer)}" style="border:0;flex:1;width:100%" referrerpolicy="no-referrer"></iframe>
      </div>`;
  } else {
    viewerHtml = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:#f9fafb;color:#374151;font-family:system-ui,sans-serif;text-align:center;padding:40px">
        <div style="font-size:48px;margin-bottom:12px">📄</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">${safeName}</div>
        <div style="font-size:13px;color:#6b7280;margin-bottom:20px">Bu dosya türü tarayıcıda doğrudan görüntülenemez.</div>
        <a href="${escapeHtml(downloadUrl)}" download style="display:inline-block;padding:10px 18px;background:#0ea5e9;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">İndir</a>
      </div>`;
  }

  res.type("html").send(`<!doctype html>
<html lang="tr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeName}</title>
<style>html,body{margin:0;padding:0;height:100%;background:#0f172a;font-family:system-ui,-apple-system,sans-serif}</style>
</head><body>${viewerHtml}</body></html>`);
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
