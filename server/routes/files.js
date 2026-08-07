const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { getDbSafe } = require('../config/database');
const { softAuth } = require('../middleware/softAuth');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const softAuthMiddleware = softAuth(getDbSafe);

// Dosya uçları kimlik doğrulaması: yüklenen belgeler (staj PDF'leri, kimlik
// taramaları vb.) hassastır — indirme/görüntüleme/yükleme/silme artık geçerli
// oturum ister. Giriş httpOnly cookie (caku_auth) ile yapıldığından <a href>
// linkleri ve <img>/<iframe> kullanımı etkilenmez (tarayıcı cookie'yi
// otomatik gönderir). Acil geri dönüş: FILES_AUTH_MODE=off
const FILES_AUTH_ENFORCED = process.env.FILES_AUTH_MODE !== 'off';
const fileAuth = FILES_AUTH_ENFORCED ? requireAuth : (req, res, next) => next();

// Modül-bazlı rate limit'ler — yükleme/silme pahalı, indirme sık.
const downloadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek.' },
});
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla yükleme isteği.' },
});
const deleteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla silme isteği.' },
});

// Upload dizini
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Dizin yoksa oluştur
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Klasör adı güvenlik allowlist'i — yalnızca alfanümerik + altçizgi + tire,
// opsiyonel olarak tek alt dizin. `../` ile UPLOAD_DIR dışına çıkmayı engeller.
const SAFE_FOLDER = /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)?$/;

function sanitizeFolder(input) {
  const folder = (input || '').toString().trim() || 'general';
  if (!SAFE_FOLDER.test(folder)) return null;
  // Çift doğrulama: resolve sonrası UPLOAD_DIR sınırını aşmamalı
  const resolved = path.resolve(path.join(UPLOAD_DIR, folder));
  if (
    !resolved.startsWith(path.resolve(UPLOAD_DIR) + path.sep) &&
    resolved !== path.resolve(UPLOAD_DIR)
  ) {
    return null;
  }
  return folder;
}

// Multer ayarları
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Alt dizin desteği (forms/, portal_files/, resources/).
    // ÖNEMLİ: req.query.folder'ı tercih ederiz — query string, multipart body
    // parse edilmeden önce hazır olduğundan, FormData içindeki 'folder' alanı
    // 'file'dan sonra gelse bile klasör doğru çözülür. req.body.folder geriye
    // dönük uyumluluk için fallback olarak kalır.
    const safe = sanitizeFolder(req.query.folder || req.body.folder);
    if (!safe) {
      return cb(new Error('Geçersiz klasör adı'));
    }
    const dir = path.join(UPLOAD_DIR, safe);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Güvenli dosya adı: timestamp + orijinal ad
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// POST /api/files/upload
router.post(
  '/upload',
  uploadLimiter,
  fileAuth,
  softAuthMiddleware,
  upload.single('file'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya gerekli.' });
    }

    const folder = sanitizeFolder(req.query.folder || req.body.folder) || 'general';

    // Staj modülü yalnızca PDF kabul eder. Hatalı dosyayı diskte bırakmamak için
    // reddedilen dosyayı sileriz.
    if (folder.startsWith('staj_belgeler')) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const isPdf = ext === '.pdf' || req.file.mimetype === 'application/pdf';
      if (!isPdf) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {
          /* ignore */
        }
        return res.status(400).json({
          error: 'Staj belgeleri yalnızca PDF formatında yüklenebilir.',
        });
      }
    }

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
  }
);

// MIME tipi haritası (inline gösterim için)
const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.txt': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.zip': 'application/zip',
};

const getMimeType = (fname) => {
  const ext = path.extname(fname).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
};

const isInlineRenderable = (fname) => {
  const ext = path.extname(fname).toLowerCase();
  return [
    '.pdf',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',
    '.bmp',
    '.txt',
    '.html',
    '.htm',
    '.csv',
    '.json',
    '.xml',
    '.mp4',
    '.webm',
    '.mp3',
    '.wav',
  ].includes(ext);
};

// Orijinal dosya adını çıkart (timestamp_ önekini kaldır)
const extractOriginalName = (fname) => {
  const base = path.basename(fname);
  const m = base.match(/^\d+_(.+)$/);
  return m ? m[1] : base;
};

// Sıkı path validation — yalnızca güvenli karakterler ve sınırlı uzunluk.
// CodeQL'in data-flow analizinin görebileceği şekilde explicit erken-dönüş yapar.
const SAFE_RELATIVE_PATH = /^[a-zA-Z0-9_./-]+$/;
const UPLOAD_ROOT = path.resolve(UPLOAD_DIR);

const resolveSafePath = (relativePath) => {
  // Ön doğrulama: tipi, uzunluğu, karakter setini sıkı kontrol et.
  if (typeof relativePath !== 'string') return null;
  if (relativePath.length === 0 || relativePath.length > 512) return null;
  if (!SAFE_RELATIVE_PATH.test(relativePath)) return null;
  // ".." segmentini erken yakala — path.normalize öncesi de sonrası da.
  if (relativePath.includes('..')) return null;

  const filePath = path.join(UPLOAD_DIR, relativePath);
  const resolved = path.resolve(filePath);
  // Sınır kontrolü: UPLOAD_ROOT'un altında olmalı (separator ile sıkılaştırma).
  if (!resolved.startsWith(UPLOAD_ROOT + path.sep) && resolved !== UPLOAD_ROOT) return null;
  if (fs.existsSync(filePath)) return filePath;

  // Fallback: dosya adını general/ dizininde ara (eski yüklemeler için).
  const fileName = path.basename(relativePath);
  if (!fileName || fileName.includes('..')) return null;
  const fallbackPath = path.join(UPLOAD_DIR, 'general', fileName);
  const fallbackResolved = path.resolve(fallbackPath);
  if (fallbackResolved.startsWith(UPLOAD_ROOT + path.sep) && fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }
  return null;
};

// GET /api/files/download/* - Dosya indirme/görüntüleme (nested folder desteği)
router.get('/download/*', downloadLimiter, fileAuth, (req, res) => {
  const relativePath = req.params[0];
  const filePath = resolveSafePath(relativePath);
  if (!filePath) {
    if (path.resolve(path.join(UPLOAD_DIR, relativePath)).startsWith(path.resolve(UPLOAD_DIR))) {
      return res.status(404).json({ error: 'Dosya bulunamadı.' });
    }
    return res.status(403).json({ error: 'Geçersiz dosya yolu.' });
  }

  const originalName = extractOriginalName(filePath);
  const mimeType = getMimeType(filePath);
  const asciiName = originalName.replace(/[^\x20-\x7E]/g, '_');
  const encodedName = encodeURIComponent(originalName);

  // ?download=true ise indirmeye zorla, aksi halde inline göster
  let disposition = req.query.download === 'true' ? 'attachment' : 'inline';

  // Aktif içerik zararsızlaştırma: yüklenen HTML/XML/SVG app origin'inde
  // inline servis edilirse stored-XSS'e yol açar. HTML/XML'i text/plain
  // olarak veririz (script çalışmaz, /view önizlemesi düz metin gösterir);
  // SVG'yi indirmeye zorlarız (<img> kullanımı disposition'ı yok sayıp
  // güvenle render eder, doğrudan gezinme ise script çalıştıramaz).
  const ext = path.extname(filePath).toLowerCase();
  let contentType = mimeType;
  if (['.html', '.htm', '.xhtml', '.xml', '.svg'].includes(ext)) {
    if (ext === '.svg') {
      disposition = 'attachment';
    } else {
      contentType = 'text/plain; charset=utf-8';
    }
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodedName}`
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');

  fs.createReadStream(filePath).pipe(res);
});

// GET /api/files/view/* - Tarayıcı içi görüntüleyici sayfası
// Office belgeleri (docx/xlsx/pptx) tarayıcılar tarafından inline render
// edilemez; bu sayfa türe göre uygun viewer'ı yükler veya indirme/dış viewer
// seçenekleri sunar.
router.get('/view/*', downloadLimiter, fileAuth, (req, res) => {
  const relativePath = req.params[0];
  const filePath = resolveSafePath(relativePath);
  if (!filePath) {
    return res
      .status(404)
      .type('html')
      .send(
        `<!doctype html><meta charset="utf-8"><title>Bulunamadı</title><body style="font-family:sans-serif;padding:40px;color:#374151"><h2>Dosya bulunamadı</h2><p>İstediğiniz dosya sunucuda bulunamadı.</p></body>`
      );
  }

  const originalName = extractOriginalName(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const fileUrl = `/api/files/download/${encodeURI(relativePath)}`;
  const downloadUrl = fileUrl + (fileUrl.includes('?') ? '&' : '?') + 'download=true';

  const escapeHtml = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  const safeName = escapeHtml(originalName);

  let viewerHtml;
  if (ext === '.pdf') {
    viewerHtml = `<iframe src="${escapeHtml(fileUrl)}#view=FitH" style="border:0;width:100%;height:100%"></iframe>`;
  } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'].includes(ext)) {
    viewerHtml = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#0f172a;overflow:auto"><img src="${escapeHtml(fileUrl)}" alt="${safeName}" style="max-width:100%;max-height:100%;object-fit:contain"></div>`;
  } else if (['.txt', '.csv', '.json', '.xml', '.html', '.htm'].includes(ext)) {
    viewerHtml = `<iframe src="${escapeHtml(fileUrl)}" style="border:0;width:100%;height:100%;background:#fff"></iframe>`;
  } else if (['.mp4', '.webm'].includes(ext)) {
    viewerHtml = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#000"><video src="${escapeHtml(fileUrl)}" controls autoplay style="max-width:100%;max-height:100%"></video></div>`;
  } else if (['.mp3', '.wav'].includes(ext)) {
    viewerHtml = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#0f172a"><audio src="${escapeHtml(fileUrl)}" controls autoplay></audio></div>`;
  } else if (['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext)) {
    // Office dosyaları tarayıcıda inline render edilemez. Office Online Viewer
    // sadece dosya internetten erişilebilirse çalışır; bu yüzden hem viewer
    // hem de indirme bağlantısı sunuyoruz.
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
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

  res.type('html').send(`<!doctype html>
<html lang="tr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeName}</title>
<style>html,body{margin:0;padding:0;height:100%;background:#0f172a;font-family:system-ui,-apple-system,sans-serif}</style>
</head><body>${viewerHtml}</body></html>`);
});

// DELETE /api/files/:folder/:filename
const SAFE_FILENAME = /^[a-zA-Z0-9._-]+$/;
router.delete('/:folder/:filename', deleteLimiter, fileAuth, softAuthMiddleware, (req, res) => {
  const { folder, filename } = req.params;

  // Sıkı format kontrolü — yalnızca güvenli karakterler
  if (!SAFE_FOLDER.test(folder) || !SAFE_FILENAME.test(filename)) {
    return res.status(400).json({ error: 'Geçersiz klasör veya dosya adı.' });
  }

  const filePath = path.join(UPLOAD_DIR, folder, filename);

  // Path traversal koruması — trailing separator ile sınır kontrolü sıkılaştırıldı
  const resolved = path.resolve(filePath);
  const uploadRoot = path.resolve(UPLOAD_DIR);
  if (!resolved.startsWith(uploadRoot + path.sep)) {
    return res.status(403).json({ error: 'Geçersiz dosya yolu.' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Dosya bulunamadı.' });
  }

  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({ error: 'Dosya silinemedi: ' + error.message });
  }
});

// ── PDF birleştirme ──────────────────────────────────────────────
// Bir öğrencinin muafiyet talebinde ders başına iki ayrı içerik dosyası
// vardır (karşı kurum + ÇAKÜ). Akademisyen bunları tek tek açmak yerine
// tek bir PDF olarak okuyabilsin diye sunucuda birleştirilir.
//
// Çıktı, yüklenen belgelerin BİREBİR birleşimidir: kapak/ayraç sayfası
// eklenmez, sayfa numarası basılmaz, içerik değiştirilmez.
//
// pdf-lib saf JS'tir; harici bir ikili (ghostscript/qpdf) gerekmez.

const MERGE_MAX_DOSYA = 60;
const MERGE_MAX_BAYT = 80 * 1024 * 1024; // toplam ham girdi tavanı

// Content-Disposition başlığı ASCII olmak zorunda; dosya adındaki Türkçe
// harfler burada indirgenir. Belgelerin kendi içeriği etkilenmez.
const TR_ASCII = {
  ç: 'c',
  Ç: 'C',
  ğ: 'g',
  Ğ: 'G',
  ı: 'i',
  İ: 'I',
  ö: 'o',
  Ö: 'O',
  ş: 's',
  Ş: 'S',
  ü: 'u',
  Ü: 'U',
};
const asciiIndirge = (s) =>
  String(s || '')
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => TR_ASCII[c])

    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// '/api/files/download/muafiyet_belgeler/123_x.pdf' → 'muafiyet_belgeler/123_x.pdf'
const urlToRelPath = (u) => {
  const s = String(u || '').trim();
  if (!s) return '';
  const m = s.match(/\/api\/files\/(?:download|view)\/(.+)$/);
  const rel = m ? m[1] : s.replace(/^\/+/, '');
  try {
    return decodeURIComponent(rel.split('?')[0]);
  } catch (_e) {
    return rel.split('?')[0];
  }
};

// Birleştirme birden çok dosyayı tek yanıtta toplar; öğrenciye kapalıdır
// (kendi belgelerini zaten tek tek görüyor, personel ise değerlendirme
// yaparken toplu okumaya ihtiyaç duyuyor).
function mergeRequireStaff(req, res, next) {
  if (!FILES_AUTH_ENFORCED) return next();
  if (req.user && req.user.role && req.user.role !== 'student') return next();
  return res.status(403).json({ error: 'Bu işlem için personel yetkisi gerekli.' });
}

// POST /api/files/merge-pdf  body: { dosyalar:[{url, baslik}], filename }
// Yanıt: birleştirilmiş PDF (application/pdf).
router.post('/merge-pdf', uploadLimiter, fileAuth, mergeRequireStaff, async (req, res) => {
  let PDFDocument;
  try {
    ({ PDFDocument } = require('pdf-lib'));
  } catch (_e) {
    return res.status(503).json({
      error:
        'PDF birleştirme kütüphanesi kurulu değil (pdf-lib). ' +
        'Sunucuda "cd server && npm install" çalıştırıp servisi yeniden başlatın.',
    });
  }

  const istenen = Array.isArray(req.body && req.body.dosyalar) ? req.body.dosyalar : [];
  if (istenen.length === 0) return res.status(400).json({ error: 'Birleştirilecek dosya yok.' });
  if (istenen.length > MERGE_MAX_DOSYA) {
    return res.status(400).json({ error: `En çok ${MERGE_MAX_DOSYA} dosya birleştirilebilir.` });
  }

  const atlananlar = [];
  let toplamBayt = 0;

  // ── AYNI BELGE BİR KEZ EKLENİR ──
  //
  // Öğrenciler çoğu zaman aynı PDF'i (ör. bölümün tüm Bologna ders içerikleri
  // tek dosyada) her ders için ayrı ayrı yüklüyor. Bu dosyaların her biri ayrı
  // adla kaydedildiği için adrese göre tekilleştirme İŞE YARAMAZ; içerik
  // özetine bakmak gerekiyor. Aksi hâlde 8 derslik bir başvuruda aynı 200
  // sayfalık katalog 8 kez ekleniyor ve çıktı hem okunmaz hem devasa oluyor.
  //
  // Maliyeti yok denecek kadar az: dosya zaten belleğe okunuyor, üzerine bir
  // SHA-256 geçmek birkaç milisaniye.
  const gorulenOzetler = new Set();
  const tekrarlar = [];

  try {
    const hedef = await PDFDocument.create();
    let eklenen = 0;

    for (const d of istenen) {
      const baslik = String((d && d.baslik) || '').slice(0, 200);
      const rel = urlToRelPath(d && d.url);
      const diskYolu = rel ? resolveSafePath(rel) : null;
      if (!diskYolu) {
        atlananlar.push({ baslik, sebep: 'dosya bulunamadı' });
        continue;
      }
      if (path.extname(diskYolu).toLowerCase() !== '.pdf') {
        atlananlar.push({ baslik, sebep: 'PDF değil (' + path.extname(diskYolu) + ')' });
        continue;
      }
      let buf;
      try {
        buf = fs.readFileSync(diskYolu);
      } catch (_e) {
        atlananlar.push({ baslik, sebep: 'okunamadı' });
        continue;
      }
      // Tekrar eden içerik: bir kez eklenir, kalanı sayılıp bildirilir.
      const ozet = crypto.createHash('sha256').update(buf).digest('hex');
      if (gorulenOzetler.has(ozet)) {
        tekrarlar.push(baslik);
        continue;
      }
      gorulenOzetler.add(ozet);

      toplamBayt += buf.length;
      if (toplamBayt > MERGE_MAX_BAYT) {
        atlananlar.push({ baslik, sebep: 'toplam boyut sınırı aşıldı' });
        break;
      }

      let kaynak;
      try {
        // Şifreli PDF'leri de kabul et; okunamıyorsa aşağıda atlanır.
        kaynak = await PDFDocument.load(buf, { ignoreEncryption: true });
      } catch (_e) {
        atlananlar.push({ baslik, sebep: 'bozuk ya da açılamayan PDF' });
        continue;
      }

      // Ayraç/kapak sayfası ÜRETİLMEZ: çıktı, öğrencinin yüklediği
      // belgelerin birebir birleşimidir. `baslik` yalnızca atlanan dosyaları
      // kullanıcıya adıyla bildirmek için taşınır, PDF'e yazılmaz.
      try {
        const sayfalar = await hedef.copyPages(kaynak, kaynak.getPageIndices());
        sayfalar.forEach((p) => hedef.addPage(p));
        eklenen += 1;
      } catch (_e) {
        atlananlar.push({ baslik, sebep: 'sayfalar kopyalanamadı' });
      }
    }

    if (eklenen === 0) {
      return res.status(422).json({
        error: 'Birleştirilebilir PDF bulunamadı.',
        atlananlar,
      });
    }

    const cikti = Buffer.from(await hedef.save());
    const adAscii =
      asciiIndirge((req.body && req.body.filename) || 'birlesik.pdf') || 'birlesik.pdf';
    const ad = /\.pdf$/i.test(adAscii) ? adAscii : adAscii + '.pdf';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${ad.replace(/[^\x20-\x7E]/g, '_')}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    // Atlananlar gövdeye sığmaz (yanıt ikili) — başlıkla bildirilir.
    res.setHeader('X-Merge-Eklenen', String(eklenen));
    res.setHeader('X-Merge-Atlanan', String(atlananlar.length));
    // Tekrar eden belge sayısı ayrı bildirilir: "atlandı" değil, "bir kez
    // eklendi" demek — kullanıcı eksik çıktı sanmasın.
    res.setHeader('X-Merge-Tekrar', String(tekrarlar.length));
    if (tekrarlar.length > 0) {
      res.setHeader(
        'X-Merge-Tekrar-Detay',
        encodeURIComponent(JSON.stringify(tekrarlar.slice(0, 20)).slice(0, 1200))
      );
    }
    if (atlananlar.length > 0) {
      res.setHeader(
        'X-Merge-Atlanan-Detay',
        encodeURIComponent(JSON.stringify(atlananlar).slice(0, 1800))
      );
    }
    return res.send(cikti);
  } catch (error) {
    console.error('PDF merge error:', error.message);
    return res.status(500).json({ error: 'PDF birleştirilemedi: ' + error.message });
  }
});

// Yüklenmiş bir dosyanın güvenli disk yolunu çözer. Belge işleme katmanı
// (routes/ai.js) aynı sınır kontrolünü tekrar yazmasın diye dışa verilir —
// `../` kaçışı ve UPLOAD_ROOT sınırı tek yerde denetlenir.
router.resolveUploadPath = resolveSafePath;

// Testler için: birleştirme yardımcıları saf fonksiyonlardır, uç noktayı
// ayağa kaldırmadan doğrulanabilsinler.
router._urlToRelPath = urlToRelPath;
router._asciiIndirge = asciiIndirge;

module.exports = router;
