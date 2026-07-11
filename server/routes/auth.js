const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { getDbSafe } = require('../config/database');
const {
  generateToken,
  requireAuth,
  verifyToken,
  setTokenCookie,
  clearTokenCookie,
} = require('../middleware/auth');

const router = express.Router();

const BCRYPT_ROUNDS = 12;

// ── Eski SHA-256 hash (geriye dönük uyumluluk) ──
function sha256(message) {
  return crypto.createHash('sha256').update(message, 'utf8').digest('hex');
}

function legacySha256Hash(password, salt) {
  return sha256(salt + ':' + password);
}

function isSha256Hash(password) {
  return typeof password === 'string' && /^[a-f0-9]{64}$/.test(password);
}

function isBcryptHash(password) {
  return typeof password === 'string' && password.startsWith('$2');
}

function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

async function verifyPassword(inputPassword, storedPassword, salt) {
  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(inputPassword, storedPassword);
  } else if (isSha256Hash(storedPassword)) {
    const inputHash = legacySha256Hash(inputPassword, salt);
    return constantTimeCompare(inputHash, storedPassword);
  } else {
    return storedPassword === inputPassword;
  }
}

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// ── Rate Limiting ──
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record) return true;
  if (now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(key);
    return true;
  }
  return record.count < MAX_ATTEMPTS;
}

function recordAttempt(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
  } else {
    record.count++;
  }
}

function clearAttempts(key) {
  loginAttempts.delete(key);
}

// ── MongoDB Helpers ──
// passwords koleksiyonu MongoDB'de { _docId: docId, ...fields } şeklinde saklanır

async function getPasswordDoc(docId) {
  const db = await getDbSafe();
  // Import edilen veriler _id: 'admin' (string) şeklinde geliyor
  const doc = await db.collection('passwords').findOne({ _id: docId });
  if (!doc) return {};
  const { _id, _docId, ...rest } = doc;
  return rest;
}

// Şifre değişikliklerini audit_logs koleksiyonuna yaz (kim, kime, ne zaman).
async function auditPasswordChange(
  authUser,
  targetRole,
  targetIdentifier,
  wasAdmin,
  isUniFlag,
  isFacFlag
) {
  try {
    const db = await getDbSafe();
    await db.collection('audit_logs').insertOne({
      kind: 'password_change',
      at: new Date(),
      actor: authUser
        ? {
            role: authUser.role,
            identifier: authUser.identifier || null,
            isUniversityAdmin: !!isUniFlag,
            isFacultyManager: !!isFacFlag,
            wasAdmin: !!wasAdmin,
          }
        : null,
      target: { role: targetRole, identifier: targetIdentifier || null },
    });
  } catch (_) {
    /* audit hatası ana akışı bozmasın */
  }
}

async function setPasswordDoc(docId, data, merge = false) {
  const db = await getDbSafe();
  const col = db.collection('passwords');
  if (merge) {
    // ÖNEMLİ: data anahtarları (akademisyen adları) nokta içerebilir.
    // MongoDB $set noktaları nested alan yolu sanar ve düz anahtarı
    // bozar. Bu yüzden dökümanı okuyup JS'te birleştirip replaceOne ile
    // geri yazıyoruz — noktalı anahtarlar literal olarak saklanır.
    const existing = (await col.findOne({ _id: docId })) || { _id: docId };
    for (const [k, v] of Object.entries(data)) {
      existing[k] = v;
    }
    existing.updatedAt = new Date();
    await col.replaceOne({ _id: docId }, existing, { upsert: true });
  } else {
    await col.replaceOne(
      { _id: docId },
      { _id: docId, ...data, updatedAt: new Date() },
      { upsert: true }
    );
  }
}

// ══════════════════════════════════════════════
// 1. Öğrenci Giriş
// POST /api/auth/student
// ══════════════════════════════════════════════
router.post('/student', async (req, res) => {
  const { studentNumber, password } = req.body;
  if (!studentNumber || !password) {
    return res.status(400).json({ error: 'Öğrenci numarası ve şifre gerekli.' });
  }

  const trimmedId = studentNumber.trim();
  const rateLimitKey = `student:${trimmedId}`;

  if (!checkRateLimit(rateLimitKey)) {
    return res
      .status(429)
      .json({ error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' });
  }

  try {
    const doc = await getPasswordDoc('student_passwords');
    const storedPassword = doc[trimmedId];

    if (!storedPassword) {
      recordAttempt(rateLimitKey);
      return res.json({ success: false, error: 'Şifre bulunamadı.' });
    }

    const isValid = await verifyPassword(password, storedPassword, trimmedId);

    if (isValid) {
      clearAttempts(rateLimitKey);
      if (!isBcryptHash(storedPassword)) {
        const bcryptHash = await hashPassword(password);
        await setPasswordDoc('student_passwords', { [trimmedId]: bcryptHash }, true);
      }
      let departmentId = 'bilgisayar';
      try {
        const db = await getDbSafe();
        const studentDoc = await db.collection('students').findOne({ studentNumber: trimmedId });
        if (studentDoc && studentDoc.departmentId) departmentId = studentDoc.departmentId;
      } catch (e) {
        console.warn('Student departmentId lookup error:', e.message);
      }
      const token = generateToken({ role: 'student', identifier: trimmedId, departmentId });
      setTokenCookie(res, token);
      return res.json({ success: true, token, departmentId });
    } else {
      recordAttempt(rateLimitKey);
      return res.json({ success: false, error: 'Giriş bilgileri hatalı!' });
    }
  } catch (error) {
    console.error('verifyStudentLogin error:', error);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ══════════════════════════════════════════════
// 2. Admin Giriş
// POST /api/auth/admin
// ══════════════════════════════════════════════
router.post('/admin', async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Şifre gerekli.' });
  }

  const rateLimitKey = 'admin';

  if (!checkRateLimit(rateLimitKey)) {
    return res
      .status(429)
      .json({ error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' });
  }

  try {
    const doc = await getPasswordDoc('admin');
    if (!doc.password) {
      return res.json({ success: false, error: 'Admin şifresi henüz belirlenmemiş.' });
    }

    const isValid = await verifyPassword(password, doc.password, 'admin');

    if (isValid) {
      clearAttempts(rateLimitKey);
      if (!isBcryptHash(doc.password)) {
        const bcryptHash = await hashPassword(password);
        await setPasswordDoc('admin', { password: bcryptHash, updatedAt: new Date() });
      }
      const token = generateToken({ role: 'admin' });
      setTokenCookie(res, token);
      return res.json({ success: true, token });
    } else {
      recordAttempt(rateLimitKey);
      return res.json({ success: false, error: 'Giriş bilgileri hatalı!' });
    }
  } catch (error) {
    console.error('verifyAdminLogin error:', error);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ══════════════════════════════════════════════
// 3. Profesör Giriş
// POST /api/auth/professor
// ══════════════════════════════════════════════
router.post('/professor', async (req, res) => {
  const { professorName, password } = req.body;
  if (!professorName || !password) {
    return res.status(400).json({ error: 'Akademisyen adı ve şifre gerekli.' });
  }

  const rateLimitKey = `professor:${professorName}`;

  if (!checkRateLimit(rateLimitKey)) {
    return res
      .status(429)
      .json({ error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' });
  }

  try {
    const doc = await getPasswordDoc('professor_passwords');
    const storedPassword = doc[professorName];

    if (!storedPassword) {
      const defaultDoc = await getPasswordDoc('defaults');
      const defaultPassword = defaultDoc.professorDefault || null;

      if (!defaultPassword) {
        recordAttempt(rateLimitKey);
        return res.json({
          success: false,
          error: 'Şifre henüz belirlenmemiş. Lütfen yönetici ile iletişime geçin.',
        });
      }

      const defaultValid = await verifyPassword(password, defaultPassword, 'professor_default');
      if (defaultValid) {
        clearAttempts(rateLimitKey);
        const bcryptHash = await hashPassword(password);
        await setPasswordDoc('professor_passwords', { [professorName]: bcryptHash }, true);
        const token = generateToken({ role: 'professor', identifier: professorName });
        setTokenCookie(res, token);
        const profile = await fetchProfessorProfile(professorName);
        return res.json({ success: true, token, profile });
      } else {
        recordAttempt(rateLimitKey);
        return res.json({ success: false, error: 'Giriş bilgileri hatalı!' });
      }
    }

    const isValid = await verifyPassword(password, storedPassword, professorName);

    if (isValid) {
      clearAttempts(rateLimitKey);
      if (!isBcryptHash(storedPassword)) {
        const bcryptHash = await hashPassword(password);
        await setPasswordDoc('professor_passwords', { [professorName]: bcryptHash }, true);
      }
      const token = generateToken({ role: 'professor', identifier: professorName });
      setTokenCookie(res, token);
      const profile = await fetchProfessorProfile(professorName);
      return res.json({ success: true, token, profile });
    } else {
      recordAttempt(rateLimitKey);
      return res.json({ success: false, error: 'Giriş bilgileri hatalı!' });
    }
  } catch (error) {
    console.error('verifyProfessorLogin error:', error);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// Akademisyenin DB profilini çek — flag'leri ve hiyerarşi alanlarını döndürür.
// LoginModal client'a verir; istemci buna göre effectiveRole hesaplar.
async function fetchProfessorProfile(professorName) {
  try {
    const db = await getDbSafe();
    const doc = await db.collection('professors').findOne({ name: professorName });
    if (!doc) return null;
    return {
      name: doc.name,
      department: doc.department || '',
      departmentId: doc.departmentId || '',
      facultyId: doc.facultyId || '',
      universityId: doc.universityId || '',
      isUniversityAdmin: !!doc.isUniversityAdmin,
      isFacultyManager: !!doc.isFacultyManager,
      isDeptManager: !!doc.isDeptManager,
      isStajCoordinator: !!doc.isStajCoordinator,
      additionalDepartments: Array.isArray(doc.additionalDepartments)
        ? doc.additionalDepartments
        : [],
    };
  } catch (e) {
    console.error('fetchProfessorProfile error:', e.message);
    return null;
  }
}

// ══════════════════════════════════════════════
// 4. Bölüm Yetkilisi Giriş
// POST /api/auth/department-manager
// ══════════════════════════════════════════════
router.post('/department-manager', async (req, res) => {
  const { managerName, password } = req.body;
  if (!managerName || !password) {
    return res.status(400).json({ error: 'Yetkili adı ve şifre gerekli.' });
  }

  const rateLimitKey = `dept_manager:${managerName}`;

  if (!checkRateLimit(rateLimitKey)) {
    return res
      .status(429)
      .json({ error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' });
  }

  try {
    const db = await getDbSafe();
    // managerNames array (yeni) veya managerName string (eski) her ikisini de destekle
    const deptDoc = await db.collection('departments').findOne({
      $or: [{ managerNames: managerName }, { managerName }],
    });
    if (!deptDoc) {
      recordAttempt(rateLimitKey);
      return res.json({
        success: false,
        error: 'Bu isimle kayıtlı bir bölüm yetkilisi bulunamadı.',
      });
    }

    const departmentId = deptDoc._docId || deptDoc._id.toString();
    const departmentName = deptDoc.name;

    const doc = await getPasswordDoc('department_manager_passwords');
    const storedPassword = doc[managerName];

    if (!storedPassword) {
      const defaultDoc = await getPasswordDoc('defaults');
      const defaultPassword = defaultDoc.professorDefault || null;

      if (!defaultPassword) {
        recordAttempt(rateLimitKey);
        return res.json({
          success: false,
          error: 'Şifre henüz belirlenmemiş. Lütfen yönetici ile iletişime geçin.',
        });
      }

      const defaultValid = await verifyPassword(password, defaultPassword, 'dept_manager_default');
      if (defaultValid) {
        clearAttempts(rateLimitKey);
        const bcryptHash = await hashPassword(password);
        await setPasswordDoc('department_manager_passwords', { [managerName]: bcryptHash }, true);
        const token = generateToken({
          role: 'bolum_yetkilisi',
          identifier: managerName,
          departmentId,
          departmentName,
        });
        setTokenCookie(res, token);
        return res.json({ success: true, token, departmentId, departmentName });
      } else {
        recordAttempt(rateLimitKey);
        return res.json({ success: false, error: 'Giriş bilgileri hatalı!' });
      }
    }

    const isValid = await verifyPassword(password, storedPassword, managerName);

    if (isValid) {
      clearAttempts(rateLimitKey);
      if (!isBcryptHash(storedPassword)) {
        const bcryptHash = await hashPassword(password);
        await setPasswordDoc('department_manager_passwords', { [managerName]: bcryptHash }, true);
      }
      const token = generateToken({
        role: 'bolum_yetkilisi',
        identifier: managerName,
        departmentId,
        departmentName,
      });
      setTokenCookie(res, token);
      return res.json({ success: true, token, departmentId, departmentName });
    } else {
      recordAttempt(rateLimitKey);
      return res.json({ success: false, error: 'Giriş bilgileri hatalı!' });
    }
  } catch (error) {
    console.error('verifyDepartmentManagerLogin error:', error);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ══════════════════════════════════════════════
// 5. Logout (httpOnly cookie temizleme)
// POST /api/auth/logout
// ══════════════════════════════════════════════
router.post('/logout', (req, res) => {
  clearTokenCookie(res);
  return res.json({ success: true });
});

// ══════════════════════════════════════════════
// 6. Şifre Değiştirme
// POST /api/auth/change-password
// ══════════════════════════════════════════════
router.post('/change-password', async (req, res) => {
  const { role, identifier, newPassword, currentPassword } = req.body;

  if (!role || !newPassword) {
    return res.status(400).json({ error: 'Eksik parametreler.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
  }

  // Hız sınırı: hedef hesap başına. Özellikle anonim ilk-kurulum yolunun
  // (şifresi henüz atanmamış öğrenci) toplu hesap ele geçirme amacıyla
  // taranmasını yavaşlatır; başarısız denemeler kaydedilir.
  const chpassKey = `chpass:${role}:${String(identifier || 'self').trim()}`;
  if (!checkRateLimit(chpassKey)) {
    return res.status(429).json({ error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' });
  }

  // Çağıranı kimlik doğrula (cookie veya Bearer). Anonim ilk-kurulum akışını
  // bozmamak için zorunlu değil; yetkilendirme kararları için kullanılır.
  let authUser = null;
  const tok =
    (req.cookies && req.cookies.caku_auth) ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);
  if (tok) {
    try {
      authUser = verifyToken(tok);
    } catch (_) {
      /* geçersiz/expired token — anonim muamelesi */
    }
  }
  // JWT'de role='professor' olsa bile profile bayrakları (isUniversityAdmin,
  // isFacultyManager) "admin yetkisi" verir — hierarchy yöneticilerinin
  // öğrenci/akademisyen şifresi reset edebilmesi için.
  let isAdmin = !!(authUser && authUser.role === 'admin');
  let isUniAdminFlag = false;
  let isFacultyMgrFlag = false;
  if (authUser && authUser.role === 'professor' && authUser.identifier) {
    try {
      const db = await getDbSafe();
      const prof = await db.collection('professors').findOne({ name: authUser.identifier });
      if (prof) {
        isUniAdminFlag = !!prof.isUniversityAdmin;
        isFacultyMgrFlag = !!prof.isFacultyManager;
        if (isUniAdminFlag) isAdmin = true; // üniversite yetkilisi = tam admin
      }
    } catch (_) {
      /* profil okunamasa engelleme — fallback varsayılan akış */
    }
  }

  try {
    const bcryptHash = await hashPassword(newPassword);

    if (role === 'student') {
      if (!identifier) return res.status(400).json({ error: 'Öğrenci numarası gerekli.' });
      const doc = await getPasswordDoc('student_passwords');

      // Şifre zaten belirlenmişse: admin reset hariç, mevcut şifre doğrulaması
      // ZORUNLU. Bu, currentPassword göndermeden hesap ele geçirmeyi engeller.
      // İlk kurulum (henüz şifre yok) anonim olarak izinli kalır.
      if (doc[identifier] && !isAdmin) {
        if (!currentPassword) {
          recordAttempt(chpassKey);
          return res.json({ success: false, error: 'Mevcut şifre gerekli.' });
        }
        const valid = await verifyPassword(currentPassword, doc[identifier], identifier);
        if (!valid) {
          recordAttempt(chpassKey);
          return res.json({ success: false, error: 'Mevcut şifre hatalı.' });
        }
      }

      // Anonim ilk-kurulum da denemedir — aynı hesaba art arda kurulum
      // denemeleri (yarış) hız sınırına takılsın.
      if (!authUser) recordAttempt(chpassKey);

      await setPasswordDoc('student_passwords', { [identifier]: bcryptHash }, true);
      await auditPasswordChange(
        authUser,
        'student',
        identifier,
        isAdmin,
        isUniAdminFlag,
        isFacultyMgrFlag
      );
      return res.json({ success: true });
    } else if (role === 'admin') {
      // Admin şifresi yalnızca authenticated admin tarafından değiştirilebilir.
      if (!isAdmin) {
        return res.status(403).json({ error: 'Bu işlem için admin yetkisi gerekli.' });
      }
      await setPasswordDoc('admin', { password: bcryptHash, updatedAt: new Date() });
      await auditPasswordChange(
        authUser,
        'admin',
        'admin',
        isAdmin,
        isUniAdminFlag,
        isFacultyMgrFlag
      );
      return res.json({ success: true });
    } else if (role === 'professor') {
      if (!identifier) return res.status(400).json({ error: 'Akademisyen adı gerekli.' });
      // Yalnızca authenticated kullanıcı (admin reset veya akademisyenin kendisi).
      if (!authUser) {
        return res.status(401).json({ error: 'Bu işlem için giriş gerekli.' });
      }
      if (!isAdmin && !(authUser.role === 'professor' && authUser.identifier === identifier)) {
        return res.status(403).json({ error: 'Bu hesabın şifresini değiştirme yetkiniz yok.' });
      }
      await setPasswordDoc('professor_passwords', { [identifier]: bcryptHash }, true);
      await auditPasswordChange(
        authUser,
        'professor',
        identifier,
        isAdmin,
        isUniAdminFlag,
        isFacultyMgrFlag
      );
      return res.json({ success: true });
    } else if (role === 'bolum_yetkilisi') {
      if (!identifier) return res.status(400).json({ error: 'Yetkili adı gerekli.' });
      if (!authUser) {
        return res.status(401).json({ error: 'Bu işlem için giriş gerekli.' });
      }
      if (
        !isAdmin &&
        !(authUser.role === 'bolum_yetkilisi' && authUser.identifier === identifier)
      ) {
        return res.status(403).json({ error: 'Bu hesabın şifresini değiştirme yetkiniz yok.' });
      }
      await setPasswordDoc('department_manager_passwords', { [identifier]: bcryptHash }, true);
      await auditPasswordChange(
        authUser,
        'bolum_yetkilisi',
        identifier,
        isAdmin,
        isUniAdminFlag,
        isFacultyMgrFlag
      );
      return res.json({ success: true });
    } else {
      return res.status(400).json({ error: 'Geçersiz rol.' });
    }
  } catch (error) {
    console.error('changePassword error:', error);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ══════════════════════════════════════════════
// 5.5 Öğrenci ön-kontrol (giriş öncesi TEK öğrenci sorgusu)
// POST /api/auth/student-lookup { studentNumber }
//
// Eski akış istemcide TÜM students koleksiyonunu çekiyordu (PII sızıntısı).
// Bu endpoint yalnızca ilgili numaranın var olup olmadığını, şifresinin
// belirlenip belirlenmediğini ve karşılama için gereken asgari alanları döner.
// ══════════════════════════════════════════════
router.post('/student-lookup', async (req, res) => {
  const { studentNumber } = req.body;
  if (!studentNumber || !/^\d{9}$/.test(String(studentNumber).trim())) {
    return res.status(400).json({ error: 'Geçerli 9 haneli öğrenci numarası gerekli.' });
  }
  const trimmedId = String(studentNumber).trim();
  const rateLimitKey = `lookup:${trimmedId}`;
  if (!checkRateLimit(rateLimitKey)) {
    return res.status(429).json({ error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' });
  }
  try {
    const db = await getDbSafe();
    const student = await db.collection('students').findOne({ studentNumber: trimmedId });
    if (!student) {
      recordAttempt(rateLimitKey);
      return res.json({ exists: false });
    }
    const doc = await getPasswordDoc('student_passwords');
    return res.json({
      exists: true,
      hasPassword: !!doc[trimmedId],
      student: {
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        departmentId: student.departmentId || 'bilgisayar',
        departmentName: student.departmentName || '',
        erasmusAccess: student.erasmusAccess === true,
      },
    });
  } catch (error) {
    console.error('studentLookup error:', error);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ══════════════════════════════════════════════
// 5.6 Öğrenci kayıt (sunucu tarafı — token gerektirmez, kendisi token üretir)
// POST /api/auth/student-register
//   { studentNumber, firstName, lastName, departmentId, departmentName, password }
//
// Eski akış kayıt sırasında istemciden generic /api/db/write ile students
// koleksiyonuna yazıyordu; bu, yazma API'sinin anonim kalmasını zorunlu
// kılıyordu. Kayıt artık burada atomik yapılır: mükerrer kontrolü + öğrenci
// kaydı + şifre hash'i + oturum token'ı.
// ══════════════════════════════════════════════
router.post('/student-register', async (req, res) => {
  const { studentNumber, firstName, lastName, departmentId, departmentName, password } =
    req.body || {};
  const trimmedId = String(studentNumber || '').trim();
  if (!/^\d{9}$/.test(trimmedId)) {
    return res.status(400).json({ error: 'Geçerli 9 haneli öğrenci numarası gerekli.' });
  }
  if (!firstName || !String(firstName).trim() || !lastName || !String(lastName).trim()) {
    return res.status(400).json({ error: 'Ad ve soyad zorunludur.' });
  }
  if (!departmentId || typeof departmentId !== 'string') {
    return res.status(400).json({ error: 'Bölüm seçimi zorunludur.' });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
  }
  const rateLimitKey = `register:${trimmedId}`;
  if (!checkRateLimit(rateLimitKey)) {
    return res.status(429).json({ error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' });
  }
  try {
    const db = await getDbSafe();
    const students = db.collection('students');
    const existing = await students.findOne({ studentNumber: trimmedId });
    if (existing) {
      recordAttempt(rateLimitKey);
      return res.json({
        success: false,
        error: 'Bu öğrenci numarası ile daha önce kayıt olunmuş!',
      });
    }
    const now = new Date();
    await students.insertOne({
      studentNumber: trimmedId,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      departmentId: departmentId,
      departmentName: String(departmentName || '').trim(),
      erasmusAccess: false,
      createdAt: now,
      updatedAt: now,
      registeredVia: 'self-service',
    });
    const bcryptHash = await hashPassword(String(password));
    await setPasswordDoc('student_passwords', { [trimmedId]: bcryptHash }, true);
    clearAttempts(rateLimitKey);
    const token = generateToken({ role: 'student', identifier: trimmedId, departmentId });
    setTokenCookie(res, token);
    return res.json({ success: true, token, departmentId });
  } catch (error) {
    console.error('studentRegister error:', error);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ══════════════════════════════════════════════
// 6. Öğrenci şifre var mı kontrol
// ══════════════════════════════════════════════
router.post('/student-has-password-check', async (req, res) => {
  const { studentNumber } = req.body;
  if (!studentNumber) {
    return res.status(400).json({ error: 'Öğrenci numarası gerekli.' });
  }
  try {
    const doc = await getPasswordDoc('student_passwords');
    return res.json({ hasPassword: !!doc[studentNumber.trim()] });
  } catch (error) {
    console.error('checkStudentHasPassword error:', error);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.get('/student-has-password/:studentNumber', async (req, res) => {
  const { studentNumber } = req.params;
  if (!studentNumber) {
    return res.status(400).json({ error: 'Öğrenci numarası gerekli.' });
  }
  try {
    const doc = await getPasswordDoc('student_passwords');
    return res.json({ hasPassword: !!doc[studentNumber.trim()] });
  } catch (error) {
    console.error('checkStudentHasPassword error:', error);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ══════════════════════════════════════════════
// 7. Admin şifre sıfırlama
// POST /api/auth/admin-reset
// ══════════════════════════════════════════════
router.post('/admin-reset', async (req, res) => {
  const { adminPassword, targetRole, targetIdentifier, newPassword } = req.body;

  if (!adminPassword || !targetRole || !newPassword) {
    return res.status(400).json({ error: 'Eksik parametreler.' });
  }

  try {
    const adminDoc = await getPasswordDoc('admin');
    if (!adminDoc.password) {
      return res.status(403).json({ error: 'Admin şifresi belirlenmemiş.' });
    }

    const adminValid = await verifyPassword(adminPassword, adminDoc.password, 'admin');
    if (!adminValid) {
      return res.status(403).json({ error: 'Admin şifresi hatalı.' });
    }

    const bcryptHash = await hashPassword(newPassword);

    if (targetRole === 'student' && targetIdentifier) {
      await setPasswordDoc('student_passwords', { [targetIdentifier]: bcryptHash }, true);
      return res.json({ success: true });
    } else if (targetRole === 'professor' && targetIdentifier) {
      await setPasswordDoc('professor_passwords', { [targetIdentifier]: bcryptHash }, true);
      return res.json({ success: true });
    }

    return res.status(400).json({ error: 'Geçersiz hedef.' });
  } catch (error) {
    console.error('adminResetPassword error:', error);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ══════════════════════════════════════════════
// 9. Varsayılan Profesör Şifresi Ayarla
// POST /api/auth/default-professor-password
// ══════════════════════════════════════════════
router.post('/default-professor-password', async (req, res) => {
  const { adminPassword, defaultPassword } = req.body;

  if (!adminPassword || !defaultPassword) {
    return res.status(400).json({ error: 'Eksik parametreler.' });
  }
  if (defaultPassword.length < 6) {
    return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
  }

  try {
    const adminDoc = await getPasswordDoc('admin');
    if (!adminDoc.password) {
      return res.status(403).json({ error: 'Admin şifresi belirlenmemiş.' });
    }

    const adminValid = await verifyPassword(adminPassword, adminDoc.password, 'admin');
    if (!adminValid) {
      return res.status(403).json({ error: 'Admin şifresi hatalı.' });
    }

    const bcryptHash = await hashPassword(defaultPassword);
    await setPasswordDoc('defaults', { professorDefault: bcryptHash, updatedAt: new Date() }, true);

    return res.json({ success: true });
  } catch (error) {
    console.error('setDefaultProfessorPassword error:', error);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
