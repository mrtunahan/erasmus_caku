// ══════════════════════════════════════════════════════════════
// Şablonlar (document_templates) API
//
// Bölüm yetkilisi: yalnızca KENDİ bölümünün şablonlarını yönetir.
// Fakülte yetkilisi: KENDİ fakültesindeki bölümlerin + fakülte-geneli.
// Üniversite yetkilisi: TÜM şablonlar.
//
// Endpoints:
//   GET    /api/templates                    → listele (yetkilere göre)
//   POST   /api/templates                    → upload + meta (multipart)
//   PATCH  /api/templates/:id                → meta güncelle (name/active/default)
//   DELETE /api/templates/:id                → kayıt + dosya sil
//   GET    /api/templates/:id/download       → dosyayı indir
//   GET    /api/templates/resolve            → modül için aktif şablonu çöz
//                                              ?module=erasmus&departmentId=…
// ══════════════════════════════════════════════════════════════
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { ObjectId } = require('mongodb');
const { getDbSafe } = require('../config/database');
const { softAuth } = require('../middleware/softAuth');

const router = express.Router();
const softAuthMiddleware = softAuth(getDbSafe);

// ── Rate Limit'ler ──
const readLimiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true });
const writeLimiter = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true });

// ── Sabitler ──
const TEMPLATES_DIR = path.join(__dirname, '..', 'uploads', 'templates');
if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, { recursive: true });

// Modül id'leri (frontend SB_MODULES ile aynı olmalı) — tüm bölüm modülleri
const ALLOWED_MODULES = new Set([
  'erasmus',
  'muafiyet',
  'staj',
  'sinav',
  'dersprogrami',
  'projeler',
  'formlar',
  'performans',
  'anket',
]);

// İzinli dosya uzantıları + MIME
const ALLOWED_EXT = new Set(['.docx', '.doc', '.pdf', '.xlsx', '.xls']);
const ALLOWED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/pdf', // .pdf
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
]);

// Maks. 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ── Multer (disk storage) ──
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEMPLATES_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLocaleLowerCase('tr');
    const id = crypto.randomBytes(12).toString('hex');
    cb(null, id + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLocaleLowerCase('tr');
    if (!ALLOWED_EXT.has(ext)) {
      return cb(new Error('Geçersiz dosya uzantısı (yalnızca .doc/.docx/.pdf/.xls/.xlsx).'));
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Geçersiz MIME türü.'));
    }
    cb(null, true);
  },
});

// ── Yardımcılar ──
function asPlainString(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  return null;
}

function ensureAuth(req, res) {
  if (!req.user) {
    res.status(401).json({ error: 'Bu işlem için giriş gerekli.' });
    return false;
  }
  return true;
}

// JWT'de role='professor' olsa bile profile bayraklarına bakar.
async function resolveActorScope(req) {
  const u = req.user || {};
  let isUniversityAdmin = false;
  let isFacultyManager = false;
  let isDeptManager = false;
  let facultyId = '';
  let departmentId = '';
  if (u.role === 'admin') isUniversityAdmin = true; // legacy admin
  if (u.role === 'professor' && u.identifier) {
    try {
      const db = await getDbSafe();
      const prof = await db.collection('professors').findOne({ name: u.identifier });
      if (prof) {
        isUniversityAdmin = !!prof.isUniversityAdmin;
        isFacultyManager = !!prof.isFacultyManager;
        isDeptManager = !!prof.isDeptManager;
        facultyId = prof.facultyId || '';
        departmentId = prof.departmentId || '';
      }
    } catch (_) {
      /* yok say */
    }
  }
  if (u.role === 'bolum_yetkilisi') {
    isDeptManager = true;
    departmentId = u.departmentId || '';
  }
  return { isUniversityAdmin, isFacultyManager, isDeptManager, facultyId, departmentId };
}

// Bölüm → fakülte haritası
async function getDeptToFacultyMap(db) {
  const docs = await db.collection('departments').find({}).toArray();
  const map = {};
  for (const d of docs) {
    const id = d._docId || d.id || (d._id && d._id.toString());
    if (id) map[id] = d.facultyId || '';
  }
  return map;
}

function canManageTemplate(scope, tpl, deptFacMap) {
  if (scope.isUniversityAdmin) return true;
  if (scope.isFacultyManager) {
    if (tpl.scope === 'faculty' && tpl.facultyId === scope.facultyId) return true;
    if (tpl.scope === 'department') {
      const facOfDept = deptFacMap[tpl.departmentId];
      return facOfDept === scope.facultyId;
    }
    return false;
  }
  if (scope.isDeptManager) {
    return tpl.scope === 'department' && tpl.departmentId === scope.departmentId;
  }
  return false;
}

function canViewTemplate(scope, tpl, deptFacMap) {
  if (canManageTemplate(scope, tpl, deptFacMap)) return true;
  // Üniversite geneli herkes okur
  if (tpl.scope === 'university') return true;
  // OKUMA erişimi: kullanıcı, şablonun kapsamına giriyorsa (yönetici olmasa
  // da) indirebilir — örn. akademisyen kendi bölümüne/fakültesine ait şablonu
  // görüp belge üretebilir. (canManage yalnız DÜZENLEME içindir.)
  if (tpl.scope === 'department' && tpl.departmentId && tpl.departmentId === scope.departmentId) {
    return true;
  }
  if (tpl.scope === 'faculty' && tpl.facultyId && tpl.facultyId === scope.facultyId) {
    return true;
  }
  return false;
}

// Alan eşleme kayıtlarını doğrula/temizle — yer tutucu → değişken eşlemesi.
// Şema: { token, tokenOccurrence, context, variable, value }
function sanitizeFields(input) {
  if (!Array.isArray(input)) return null;
  return input.slice(0, 300).map((f) => ({
    token: String(f && f.token ? f.token : '').slice(0, 60),
    tokenOccurrence: Math.max(1, parseInt(f && f.tokenOccurrence, 10) || 1),
    context: String(f && f.context ? f.context : '').slice(0, 200),
    variable: String(f && f.variable ? f.variable : '').slice(0, 60),
    value: String(f && f.value ? f.value : '').slice(0, 500),
  }));
}

function publicTemplate(tpl) {
  return {
    _id: tpl._id,
    name: tpl.name,
    description: tpl.description || '',
    module: tpl.module,
    docType: tpl.docType || 'default',
    scope: tpl.scope,
    departmentId: tpl.departmentId || '',
    facultyId: tpl.facultyId || '',
    fields: Array.isArray(tpl.fields) ? tpl.fields : [],
    isDefault: !!tpl.isDefault,
    isActive: tpl.isActive !== false,
    file: tpl.file
      ? {
          originalName: tpl.file.originalName,
          size: tpl.file.size,
          extension: tpl.file.extension,
        }
      : null,
    createdByName: tpl.createdByName || '',
    createdAt: tpl.createdAt,
    updatedAt: tpl.updatedAt,
  };
}

// ── GET: listele ──
router.get('/', readLimiter, softAuthMiddleware, async (req, res) => {
  try {
    const scope = await resolveActorScope(req);
    const db = await getDbSafe();
    const deptFacMap = await getDeptToFacultyMap(db);
    const all = await db.collection('document_templates').find({}).toArray();
    const visible = all.filter((t) => canViewTemplate(scope, t, deptFacMap));
    // Modüle göre sırala
    visible.sort((a, b) => {
      if (a.module !== b.module) return a.module.localeCompare(b.module);
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
    res.json(visible.map(publicTemplate));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST: yükle (multipart/form-data) ──
router.post('/', writeLimiter, softAuthMiddleware, upload.single('file'), async (req, res) => {
  if (!ensureAuth(req, res)) return;
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya gerekli.' });

    const name = asPlainString(req.body.name);
    const module_ = asPlainString(req.body.module);
    const description = asPlainString(req.body.description) || '';
    if (!name || name.length < 2) {
      cleanupFile(req.file);
      return res.status(400).json({ error: 'Şablon adı en az 2 karakter olmalı.' });
    }
    if (!module_ || !ALLOWED_MODULES.has(module_)) {
      cleanupFile(req.file);
      return res.status(400).json({ error: 'Geçersiz modül.' });
    }

    const scope = await resolveActorScope(req);
    if (!scope.isUniversityAdmin && !scope.isFacultyManager && !scope.isDeptManager) {
      cleanupFile(req.file);
      return res.status(403).json({ error: 'Şablon yükleme yetkiniz yok.' });
    }

    // Kapsamı kullanıcı rolünden çıkar — bölüm yetkilisi sadece KENDİ
    // bölümüne, fakülte yetkilisi KENDİ fakültesine yükler.
    let templateScope = 'department';
    let departmentId = '';
    let facultyId = '';
    if (scope.isUniversityAdmin) {
      // Üni yetkilisi alanı seçebilir; varsayılan 'university'
      templateScope = asPlainString(req.body.scope) || 'university';
      if (templateScope === 'department') {
        departmentId = asPlainString(req.body.departmentId) || '';
        if (!departmentId) {
          cleanupFile(req.file);
          return res.status(400).json({ error: 'Bölüm seçilmedi.' });
        }
      } else if (templateScope === 'faculty') {
        facultyId = asPlainString(req.body.facultyId) || '';
        if (!facultyId) {
          cleanupFile(req.file);
          return res.status(400).json({ error: 'Fakülte seçilmedi.' });
        }
      }
    } else if (scope.isFacultyManager) {
      // İsterse fakülte-geneli ya da kendi fakültesindeki bir bölüm
      templateScope = asPlainString(req.body.scope) === 'faculty' ? 'faculty' : 'department';
      if (templateScope === 'faculty') {
        facultyId = scope.facultyId;
      } else {
        departmentId = asPlainString(req.body.departmentId) || '';
        if (!departmentId) {
          cleanupFile(req.file);
          return res.status(400).json({ error: 'Bölüm seçilmedi.' });
        }
        // Bölüm gerçekten bu fakültenin altında mı?
        const db = await getDbSafe();
        const dmap = await getDeptToFacultyMap(db);
        if (dmap[departmentId] !== scope.facultyId) {
          cleanupFile(req.file);
          return res.status(403).json({ error: 'Kendi fakültenizdeki bir bölüm seçin.' });
        }
      }
    } else if (scope.isDeptManager) {
      templateScope = 'department';
      departmentId = scope.departmentId;
      if (!departmentId) {
        cleanupFile(req.file);
        return res.status(403).json({ error: 'Bölüm bilgisi yok.' });
      }
    }

    const isDefault = req.body.isDefault === 'true' || req.body.isDefault === true;
    const isActive = !(req.body.isActive === 'false' || req.body.isActive === false);

    // Belge türü — aynı modüle birden çok belge (Erasmus gidiş/dönüş gibi).
    // Serbest kısa slug; boşsa 'default'.
    const docType = (asPlainString(req.body.docType) || 'default')
      .trim()
      .slice(0, 40)
      .replace(/[^a-zA-Z0-9_-]/g, '');

    const ext = path.extname(req.file.filename).toLocaleLowerCase('tr').slice(1);
    // Multer originalname'i latin1 olarak çözer — Türkçe karakterler bozulur
    // (İ→Ä°, Ş→Å ...). UTF-8'e geri çevir. Zaten geçerli UTF-8 ise değişmez.
    let safeOriginal = req.file.originalname;
    try {
      const reencoded = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      // Ã / Å gibi mojibake işaretleri varsa düzeltilmiş sürümü kullan
      if (/[Ã-]/.test(req.file.originalname)) safeOriginal = reencoded;
    } catch (_) {
      /* orijinali koru */
    }
    const doc = {
      name: name.trim(),
      description,
      module: module_,
      docType: docType || 'default',
      scope: templateScope,
      departmentId,
      facultyId,
      isDefault,
      isActive,
      file: {
        originalName: safeOriginal,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        extension: ext,
      },
      createdByName: req.user && req.user.identifier ? req.user.identifier : '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = await getDbSafe();
    // Eğer yeni şablon varsayılan ise, aynı (module, scope, dept/fac) içindeki
    // diğer varsayılanları temizle.
    if (doc.isDefault) {
      await clearOtherDefaults(db, doc);
    }
    const result = await db.collection('document_templates').insertOne(doc);
    res.json(publicTemplate({ ...doc, _id: result.insertedId }));
  } catch (err) {
    cleanupFile(req.file);
    res.status(500).json({ error: err.message });
  }
});

// ── Meta güncelle (name/description/isActive/isDefault/fields) ──
// Hem PATCH /:id hem POST /:id/update olarak sunulur — bazı nginx
// yapılandırmaları PATCH/DELETE metodlarına 405 döndürdüğü için POST
// takma rotaları güvenli yoldur (istemci POST kullanır).
async function updateTemplateHandler(req, res) {
  if (!ensureAuth(req, res)) return;
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Geçersiz id.' });

    const db = await getDbSafe();
    const tpl = await db.collection('document_templates').findOne({ _id: new ObjectId(id) });
    if (!tpl) return res.status(404).json({ error: 'Şablon bulunamadı.' });

    const scope = await resolveActorScope(req);
    const dmap = await getDeptToFacultyMap(db);
    if (!canManageTemplate(scope, tpl, dmap)) {
      return res.status(403).json({ error: 'Bu şablonu yönetme yetkiniz yok.' });
    }

    const update = {};
    if (typeof req.body.name === 'string') update.name = req.body.name.trim();
    if (typeof req.body.description === 'string') update.description = req.body.description;
    if (typeof req.body.isActive === 'boolean') update.isActive = req.body.isActive;
    if (typeof req.body.isDefault === 'boolean') update.isDefault = req.body.isDefault;
    // Alan eşlemesi (yer tutucu → değişken) — Şablonlar modülü eşleme arayüzü
    const fields = sanitizeFields(req.body.fields);
    if (fields) update.fields = fields;

    // ── Modül / belge türü değişimi ──
    // Modül veya belge türü değişince değişken sözlüğü de değişir, eski
    // alan eşlemesi geçersiz kalır — bu yüzden fields sıfırlanır.
    let clearedMapping = false;
    if (typeof req.body.module === 'string' && req.body.module !== tpl.module) {
      if (!ALLOWED_MODULES.has(req.body.module)) {
        return res.status(400).json({ error: 'Geçersiz modül.' });
      }
      update.module = req.body.module;
      update.fields = [];
      clearedMapping = true;
    }
    if (typeof req.body.docType === 'string') {
      const dt =
        req.body.docType
          .trim()
          .slice(0, 40)
          .replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
      if (dt !== (tpl.docType || 'default')) {
        update.docType = dt;
        update.fields = [];
        clearedMapping = true;
      }
    }

    // ── Kapsam değişimi ── (yalnızca yetki dahilinde)
    if (typeof req.body.scope === 'string' && req.body.scope !== tpl.scope) {
      const newScope = req.body.scope;
      if (!['department', 'faculty', 'university'].includes(newScope)) {
        return res.status(400).json({ error: 'Geçersiz kapsam.' });
      }
      const candidate = { scope: newScope, departmentId: '', facultyId: '' };
      if (newScope === 'department') {
        candidate.departmentId = asPlainString(req.body.departmentId) || tpl.departmentId || '';
        if (!candidate.departmentId) return res.status(400).json({ error: 'Bölüm seçilmedi.' });
      } else if (newScope === 'faculty') {
        candidate.facultyId = asPlainString(req.body.facultyId) || scope.facultyId || '';
        if (!candidate.facultyId) return res.status(400).json({ error: 'Fakülte seçilmedi.' });
      } else if (newScope === 'university' && !scope.isUniversityAdmin) {
        return res.status(403).json({ error: 'Üniversite geneli kapsam için yetkiniz yok.' });
      }
      // Yeni kapsam da bu kullanıcının yönetebileceği bir yer olmalı
      if (!canManageTemplate(scope, candidate, dmap)) {
        return res.status(403).json({ error: 'Seçtiğiniz kapsama şablon taşıma yetkiniz yok.' });
      }
      update.scope = candidate.scope;
      update.departmentId = candidate.departmentId;
      update.facultyId = candidate.facultyId;
    } else if (tpl.scope === 'department' && typeof req.body.departmentId === 'string') {
      // Aynı kapsam ama bölüm değiştirme
      const newDept = asPlainString(req.body.departmentId);
      if (newDept && newDept !== tpl.departmentId) {
        if (!canManageTemplate(scope, { scope: 'department', departmentId: newDept }, dmap)) {
          return res.status(403).json({ error: 'Bu bölüme şablon taşıma yetkiniz yok.' });
        }
        update.departmentId = newDept;
      }
    }

    update.updatedAt = new Date();

    if (update.isDefault === true) {
      await clearOtherDefaults(db, { ...tpl, ...update }, tpl._id);
    }

    await db.collection('document_templates').updateOne({ _id: tpl._id }, { $set: update });
    const updated = await db.collection('document_templates').findOne({ _id: tpl._id });
    res.json({ ...publicTemplate(updated), clearedMapping });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
router.patch('/:id', writeLimiter, softAuthMiddleware, updateTemplateHandler);
router.post('/:id/update', writeLimiter, softAuthMiddleware, updateTemplateHandler);

// ── Dosya değiştir (yeni .docx yükle, aynı kaydı güncelle) ──
// Yer tutucular değişeceği için eski alan eşlemesi (fields) sıfırlanır.
router.post(
  '/:id/replace-file',
  writeLimiter,
  softAuthMiddleware,
  upload.single('file'),
  async (req, res) => {
    if (!req.user) {
      cleanupFile(req.file);
      return res.status(401).json({ error: 'Bu işlem için giriş gerekli.' });
    }
    try {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) {
        cleanupFile(req.file);
        return res.status(400).json({ error: 'Geçersiz id.' });
      }
      if (!req.file) return res.status(400).json({ error: 'Dosya gerekli.' });

      const db = await getDbSafe();
      const tpl = await db.collection('document_templates').findOne({ _id: new ObjectId(id) });
      if (!tpl) {
        cleanupFile(req.file);
        return res.status(404).json({ error: 'Şablon bulunamadı.' });
      }
      const scope = await resolveActorScope(req);
      const dmap = await getDeptToFacultyMap(db);
      if (!canManageTemplate(scope, tpl, dmap)) {
        cleanupFile(req.file);
        return res.status(403).json({ error: 'Bu şablonu düzenleme yetkiniz yok.' });
      }

      // Eski dosyayı sil
      if (tpl.file && tpl.file.storedName) {
        const oldP = path.join(TEMPLATES_DIR, tpl.file.storedName);
        if (oldP.startsWith(TEMPLATES_DIR + path.sep)) fs.unlink(oldP, () => {});
      }

      let safeOriginal = req.file.originalname;
      try {
        const reencoded = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        if (/[Ã-]/.test(req.file.originalname)) safeOriginal = reencoded;
      } catch (_) {
        /* orijinali koru */
      }
      const ext = path.extname(req.file.filename).toLocaleLowerCase('tr').slice(1);

      await db.collection('document_templates').updateOne(
        { _id: tpl._id },
        {
          $set: {
            file: {
              originalName: safeOriginal,
              storedName: req.file.filename,
              mimeType: req.file.mimetype,
              size: req.file.size,
              extension: ext,
            },
            fields: [], // yer tutucular değişti — eşleme sıfırlanır
            updatedAt: new Date(),
          },
        }
      );
      const updated = await db.collection('document_templates').findOne({ _id: tpl._id });
      res.json(publicTemplate(updated));
    } catch (err) {
      cleanupFile(req.file);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── Sil (DELETE /:id ve nginx-uyumlu POST /:id/delete) ──
async function deleteTemplateHandler(req, res) {
  if (!ensureAuth(req, res)) return;
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Geçersiz id.' });

    const db = await getDbSafe();
    const tpl = await db.collection('document_templates').findOne({ _id: new ObjectId(id) });
    if (!tpl) return res.status(404).json({ error: 'Şablon bulunamadı.' });

    const scope = await resolveActorScope(req);
    const dmap = await getDeptToFacultyMap(db);
    if (!canManageTemplate(scope, tpl, dmap)) {
      return res.status(403).json({ error: 'Bu şablonu silme yetkiniz yok.' });
    }

    if (tpl.file && tpl.file.storedName) {
      const p = path.join(TEMPLATES_DIR, tpl.file.storedName);
      // Path traversal güvenliği
      if (p.startsWith(TEMPLATES_DIR + path.sep)) {
        fs.unlink(p, () => {});
      }
    }
    await db.collection('document_templates').deleteOne({ _id: tpl._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
router.delete('/:id', writeLimiter, softAuthMiddleware, deleteTemplateHandler);
router.post('/:id/delete', writeLimiter, softAuthMiddleware, deleteTemplateHandler);

// ── İndir ──
router.get('/:id/download', readLimiter, softAuthMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Geçersiz id.' });

    const db = await getDbSafe();
    const tpl = await db.collection('document_templates').findOne({ _id: new ObjectId(id) });
    if (!tpl || !tpl.file) return res.status(404).json({ error: 'Şablon bulunamadı.' });

    // Görme yetkisi (yönetebiliyorsa veya scope='university' ise erişim)
    const scope = await resolveActorScope(req);
    const dmap = await getDeptToFacultyMap(db);
    if (!canViewTemplate(scope, tpl, dmap)) {
      return res.status(403).json({ error: 'Erişim yetkiniz yok.' });
    }

    const p = path.join(TEMPLATES_DIR, tpl.file.storedName);
    if (!p.startsWith(TEMPLATES_DIR + path.sep) || !fs.existsSync(p)) {
      return res.status(404).json({ error: 'Dosya bulunamadı.' });
    }
    res.setHeader('Content-Type', tpl.file.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="' + encodeURIComponent(tpl.file.originalName) + '"'
    );
    fs.createReadStream(p).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Resolver: modül için aktif şablonu çöz ──
//   Öncelik: scope='department' (default) → 'department' (en yeni) →
//            scope='faculty' (default) → 'faculty' (en yeni) →
//            scope='university' (default) → 'university' (en yeni)
router.get('/resolve', readLimiter, async (req, res) => {
  try {
    const module_ = asPlainString(req.query.module);
    const departmentId = asPlainString(req.query.departmentId);
    const docType = (asPlainString(req.query.docType) || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!module_ || !ALLOWED_MODULES.has(module_)) {
      return res.status(400).json({ error: 'Geçersiz modül.' });
    }
    const db = await getDbSafe();
    const dmap = await getDeptToFacultyMap(db);
    const facultyId = departmentId ? dmap[departmentId] || '' : '';

    // docType eşleşmesi: kayıtta docType yoksa (eski) 'default' say
    const base = {
      module: module_,
      isActive: { $ne: false },
      $or: [{ docType }, ...(docType === 'default' ? [{ docType: { $exists: false } }] : [])],
    };
    const find = (q) =>
      db
        .collection('document_templates')
        .find({ ...base, ...q })
        .sort({ isDefault: -1, updatedAt: -1 })
        .limit(1)
        .toArray();

    let arr = departmentId ? await find({ scope: 'department', departmentId }) : [];
    if (!arr.length && facultyId) arr = await find({ scope: 'faculty', facultyId });
    if (!arr.length) arr = await find({ scope: 'university' });

    if (!arr.length) return res.json({ template: null });
    res.json({ template: publicTemplate(arr[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helpers ──
async function clearOtherDefaults(db, tpl, exceptId) {
  // Varsayılan yalnızca aynı (module, docType, scope) kümesinde tekildir —
  // böylece Erasmus gidiş ve dönüş belgeleri ayrı ayrı varsayılan olabilir.
  const filter = {
    module: tpl.module,
    docType: tpl.docType || 'default',
    scope: tpl.scope,
    isDefault: true,
  };
  if (tpl.scope === 'department') filter.departmentId = tpl.departmentId;
  if (tpl.scope === 'faculty') filter.facultyId = tpl.facultyId;
  if (exceptId) filter._id = { $ne: exceptId };
  await db.collection('document_templates').updateMany(filter, { $set: { isDefault: false } });
}

function cleanupFile(file) {
  if (!file || !file.path) return;
  try {
    if (fs.existsSync(file.path)) fs.unlink(file.path, () => {});
  } catch (_) {
    /* yok say */
  }
}

module.exports = router;
