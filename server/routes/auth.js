const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { getDb } = require("../config/database");
const { generateToken, requireAuth } = require("../middleware/auth");

const router = express.Router();

const BCRYPT_ROUNDS = 12;

// ── Eski SHA-256 hash (geriye dönük uyumluluk) ──
function sha256(message) {
  return crypto.createHash("sha256").update(message, "utf8").digest("hex");
}

function legacySha256Hash(password, salt) {
  return sha256(salt + ":" + password);
}

function isSha256Hash(password) {
  return typeof password === "string" && /^[a-f0-9]{64}$/.test(password);
}

function isBcryptHash(password) {
  return typeof password === "string" && password.startsWith("$2");
}

function constantTimeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
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

// Helper: passwords koleksiyonundan doküman oku
async function getPasswordDoc(docId) {
  const db = getDb();
  const doc = await db.collection("passwords").findOne({ _id: docId });
  return doc || {};
}

// Helper: passwords koleksiyonuna doküman yaz
async function setPasswordDoc(docId, data, merge = false) {
  const db = getDb();
  if (merge) {
    await db.collection("passwords").updateOne(
      { _id: docId },
      { $set: data },
      { upsert: true }
    );
  } else {
    await db.collection("passwords").replaceOne(
      { _id: docId },
      { ...data, _id: docId },
      { upsert: true }
    );
  }
}

// ══════════════════════════════════════════════
// 1. Öğrenci Giriş
// POST /api/auth/student
// ══════════════════════════════════════════════
router.post("/student", async (req, res) => {
  const { studentNumber, password } = req.body;
  if (!studentNumber || !password) {
    return res.status(400).json({ error: "Öğrenci numarası ve şifre gerekli." });
  }

  const trimmedId = studentNumber.trim();
  const rateLimitKey = `student:${trimmedId}`;

  if (!checkRateLimit(rateLimitKey)) {
    return res.status(429).json({ error: "Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin." });
  }

  try {
    const doc = await getPasswordDoc("student_passwords");
    const storedPassword = doc[trimmedId];

    if (!storedPassword) {
      recordAttempt(rateLimitKey);
      return res.json({ success: false, error: "Şifre bulunamadı." });
    }

    const isValid = await verifyPassword(password, storedPassword, trimmedId);

    if (isValid) {
      clearAttempts(rateLimitKey);
      // Eski hash'i bcrypt'e migrate et
      if (!isBcryptHash(storedPassword)) {
        const bcryptHash = await hashPassword(password);
        await setPasswordDoc("student_passwords", { [trimmedId]: bcryptHash }, true);
      }
      const token = generateToken({ role: "student", identifier: trimmedId });
      return res.json({ success: true, token });
    } else {
      recordAttempt(rateLimitKey);
      return res.json({ success: false, error: "Giriş bilgileri hatalı!" });
    }
  } catch (error) {
    console.error("verifyStudentLogin error:", error);
    return res.status(500).json({ error: "Sunucu hatası." });
  }
});

// ══════════════════════════════════════════════
// 2. Admin Giriş
// POST /api/auth/admin
// ══════════════════════════════════════════════
router.post("/admin", async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Şifre gerekli." });
  }

  const rateLimitKey = "admin";

  if (!checkRateLimit(rateLimitKey)) {
    return res.status(429).json({ error: "Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin." });
  }

  try {
    const doc = await getPasswordDoc("admin");
    if (!doc.password) {
      return res.json({ success: false, error: "Admin şifresi henüz belirlenmemiş." });
    }

    const isValid = await verifyPassword(password, doc.password, "admin");

    if (isValid) {
      clearAttempts(rateLimitKey);
      if (!isBcryptHash(doc.password)) {
        const bcryptHash = await hashPassword(password);
        await setPasswordDoc("admin", { password: bcryptHash, updatedAt: new Date() });
      }
      const token = generateToken({ role: "admin" });
      return res.json({ success: true, token });
    } else {
      recordAttempt(rateLimitKey);
      return res.json({ success: false, error: "Giriş bilgileri hatalı!" });
    }
  } catch (error) {
    console.error("verifyAdminLogin error:", error);
    return res.status(500).json({ error: "Sunucu hatası." });
  }
});

// ══════════════════════════════════════════════
// 3. Profesör Giriş
// POST /api/auth/professor
// ══════════════════════════════════════════════
router.post("/professor", async (req, res) => {
  const { professorName, password } = req.body;
  if (!professorName || !password) {
    return res.status(400).json({ error: "Akademisyen adı ve şifre gerekli." });
  }

  const rateLimitKey = `professor:${professorName}`;

  if (!checkRateLimit(rateLimitKey)) {
    return res.status(429).json({ error: "Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin." });
  }

  try {
    const doc = await getPasswordDoc("professor_passwords");
    const storedPassword = doc[professorName];

    if (!storedPassword) {
      const defaultDoc = await getPasswordDoc("defaults");
      const defaultPassword = defaultDoc.professorDefault || null;

      if (!defaultPassword) {
        recordAttempt(rateLimitKey);
        return res.json({ success: false, error: "Şifre henüz belirlenmemiş. Lütfen yönetici ile iletişime geçin." });
      }

      const defaultValid = await verifyPassword(password, defaultPassword, "professor_default");
      if (defaultValid) {
        clearAttempts(rateLimitKey);
        const bcryptHash = await hashPassword(password);
        await setPasswordDoc("professor_passwords", { [professorName]: bcryptHash }, true);
        const token = generateToken({ role: "professor", identifier: professorName });
        return res.json({ success: true, token });
      } else {
        recordAttempt(rateLimitKey);
        return res.json({ success: false, error: "Giriş bilgileri hatalı!" });
      }
    }

    const isValid = await verifyPassword(password, storedPassword, professorName);

    if (isValid) {
      clearAttempts(rateLimitKey);
      if (!isBcryptHash(storedPassword)) {
        const bcryptHash = await hashPassword(password);
        await setPasswordDoc("professor_passwords", { [professorName]: bcryptHash }, true);
      }
      const token = generateToken({ role: "professor", identifier: professorName });
      return res.json({ success: true, token });
    } else {
      recordAttempt(rateLimitKey);
      return res.json({ success: false, error: "Giriş bilgileri hatalı!" });
    }
  } catch (error) {
    console.error("verifyProfessorLogin error:", error);
    return res.status(500).json({ error: "Sunucu hatası." });
  }
});

// ══════════════════════════════════════════════
// 4. Bölüm Yetkilisi Giriş
// POST /api/auth/department-manager
// ══════════════════════════════════════════════
router.post("/department-manager", async (req, res) => {
  const { managerName, password } = req.body;
  if (!managerName || !password) {
    return res.status(400).json({ error: "Yetkili adı ve şifre gerekli." });
  }

  const rateLimitKey = `dept_manager:${managerName}`;

  if (!checkRateLimit(rateLimitKey)) {
    return res.status(429).json({ error: "Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin." });
  }

  try {
    const db = getDb();
    const deptDoc = await db.collection("departments").findOne({ managerName });
    if (!deptDoc) {
      recordAttempt(rateLimitKey);
      return res.json({ success: false, error: "Bu isimle kayıtlı bir bölüm yetkilisi bulunamadı." });
    }

    const doc = await getPasswordDoc("department_manager_passwords");
    const storedPassword = doc[managerName];

    if (!storedPassword) {
      const defaultDoc = await getPasswordDoc("defaults");
      const defaultPassword = defaultDoc.professorDefault || null;

      if (!defaultPassword) {
        recordAttempt(rateLimitKey);
        return res.json({ success: false, error: "Şifre henüz belirlenmemiş. Lütfen yönetici ile iletişime geçin." });
      }

      const defaultValid = await verifyPassword(password, defaultPassword, "dept_manager_default");
      if (defaultValid) {
        clearAttempts(rateLimitKey);
        const bcryptHash = await hashPassword(password);
        await setPasswordDoc("department_manager_passwords", { [managerName]: bcryptHash }, true);
        const token = generateToken({ role: "bolum_yetkilisi", identifier: managerName, departmentId: deptDoc._id, departmentName: deptDoc.name });
        return res.json({ success: true, token, departmentId: deptDoc._id, departmentName: deptDoc.name });
      } else {
        recordAttempt(rateLimitKey);
        return res.json({ success: false, error: "Giriş bilgileri hatalı!" });
      }
    }

    const isValid = await verifyPassword(password, storedPassword, managerName);

    if (isValid) {
      clearAttempts(rateLimitKey);
      if (!isBcryptHash(storedPassword)) {
        const bcryptHash = await hashPassword(password);
        await setPasswordDoc("department_manager_passwords", { [managerName]: bcryptHash }, true);
      }
      const token = generateToken({ role: "bolum_yetkilisi", identifier: managerName, departmentId: deptDoc._id, departmentName: deptDoc.name });
      return res.json({ success: true, token, departmentId: deptDoc._id, departmentName: deptDoc.name });
    } else {
      recordAttempt(rateLimitKey);
      return res.json({ success: false, error: "Giriş bilgileri hatalı!" });
    }
  } catch (error) {
    console.error("verifyDepartmentManagerLogin error:", error);
    return res.status(500).json({ error: "Sunucu hatası." });
  }
});

// ══════════════════════════════════════════════
// 5. Şifre Değiştirme
// POST /api/auth/change-password
// ══════════════════════════════════════════════
router.post("/change-password", async (req, res) => {
  const { role, identifier, newPassword, currentPassword } = req.body;

  if (!role || !newPassword) {
    return res.status(400).json({ error: "Eksik parametreler." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Şifre en az 6 karakter olmalıdır." });
  }

  try {
    const bcryptHash = await hashPassword(newPassword);

    if (role === "student") {
      if (!identifier) return res.status(400).json({ error: "Öğrenci numarası gerekli." });
      const doc = await getPasswordDoc("student_passwords");

      if (currentPassword && doc[identifier]) {
        const valid = await verifyPassword(currentPassword, doc[identifier], identifier);
        if (!valid) {
          return res.json({ success: false, error: "Mevcut şifre hatalı." });
        }
      }

      await setPasswordDoc("student_passwords", { [identifier]: bcryptHash }, true);
      return res.json({ success: true });

    } else if (role === "admin") {
      await setPasswordDoc("admin", { password: bcryptHash, updatedAt: new Date() });
      return res.json({ success: true });

    } else if (role === "professor") {
      if (!identifier) return res.status(400).json({ error: "Akademisyen adı gerekli." });
      await setPasswordDoc("professor_passwords", { [identifier]: bcryptHash }, true);
      return res.json({ success: true });

    } else if (role === "bolum_yetkilisi") {
      if (!identifier) return res.status(400).json({ error: "Yetkili adı gerekli." });
      await setPasswordDoc("department_manager_passwords", { [identifier]: bcryptHash }, true);
      return res.json({ success: true });

    } else {
      return res.status(400).json({ error: "Geçersiz rol." });
    }
  } catch (error) {
    console.error("changePassword error:", error);
    return res.status(500).json({ error: "Sunucu hatası." });
  }
});

// ══════════════════════════════════════════════
// 6. Öğrenci şifre var mı kontrol
// POST /api/auth/student-has-password-check (CloudFunctions uyumlu)
// GET  /api/auth/student-has-password/:studentNumber
// ══════════════════════════════════════════════
router.post("/student-has-password-check", async (req, res) => {
  const { studentNumber } = req.body;
  if (!studentNumber) {
    return res.status(400).json({ error: "Öğrenci numarası gerekli." });
  }
  try {
    const doc = await getPasswordDoc("student_passwords");
    return res.json({ hasPassword: !!doc[studentNumber.trim()] });
  } catch (error) {
    console.error("checkStudentHasPassword error:", error);
    return res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.get("/student-has-password/:studentNumber", async (req, res) => {
  const { studentNumber } = req.params;
  if (!studentNumber) {
    return res.status(400).json({ error: "Öğrenci numarası gerekli." });
  }

  try {
    const doc = await getPasswordDoc("student_passwords");
    return res.json({ hasPassword: !!doc[studentNumber.trim()] });
  } catch (error) {
    console.error("checkStudentHasPassword error:", error);
    return res.status(500).json({ error: "Sunucu hatası." });
  }
});

// ══════════════════════════════════════════════
// 7. Admin şifre sıfırlama
// POST /api/auth/admin-reset
// ══════════════════════════════════════════════
router.post("/admin-reset", async (req, res) => {
  const { adminPassword, targetRole, targetIdentifier, newPassword } = req.body;

  if (!adminPassword || !targetRole || !newPassword) {
    return res.status(400).json({ error: "Eksik parametreler." });
  }

  try {
    const adminDoc = await getPasswordDoc("admin");
    if (!adminDoc.password) {
      return res.status(403).json({ error: "Admin şifresi belirlenmemiş." });
    }

    const adminValid = await verifyPassword(adminPassword, adminDoc.password, "admin");
    if (!adminValid) {
      return res.status(403).json({ error: "Admin şifresi hatalı." });
    }

    const bcryptHash = await hashPassword(newPassword);

    if (targetRole === "student" && targetIdentifier) {
      await setPasswordDoc("student_passwords", { [targetIdentifier]: bcryptHash }, true);
      return res.json({ success: true });
    } else if (targetRole === "professor" && targetIdentifier) {
      await setPasswordDoc("professor_passwords", { [targetIdentifier]: bcryptHash }, true);
      return res.json({ success: true });
    }

    return res.status(400).json({ error: "Geçersiz hedef." });
  } catch (error) {
    console.error("adminResetPassword error:", error);
    return res.status(500).json({ error: "Sunucu hatası." });
  }
});

// ══════════════════════════════════════════════
// 8. Kullanıcı Rolü Kaydet
// POST /api/auth/save-role
// ══════════════════════════════════════════════
router.post("/save-role", async (req, res) => {
  const { uid, roleData } = req.body;

  if (!uid || !roleData) {
    return res.status(400).json({ error: "uid ve roleData gerekli." });
  }

  try {
    const db = getDb();
    await db.collection("users").updateOne(
      { _id: uid },
      { $set: { ...roleData, updatedAt: new Date() } },
      { upsert: true }
    );
    return res.json({ success: true });
  } catch (error) {
    console.error("saveUserRole error:", error);
    return res.status(500).json({ error: "Rol kaydedilemedi." });
  }
});

// ══════════════════════════════════════════════
// 9. Varsayılan Profesör Şifresi Ayarla
// POST /api/auth/default-professor-password
// ══════════════════════════════════════════════
router.post("/default-professor-password", async (req, res) => {
  const { adminPassword, defaultPassword } = req.body;

  if (!adminPassword || !defaultPassword) {
    return res.status(400).json({ error: "Eksik parametreler." });
  }
  if (defaultPassword.length < 6) {
    return res.status(400).json({ error: "Şifre en az 6 karakter olmalıdır." });
  }

  try {
    const adminDoc = await getPasswordDoc("admin");
    if (!adminDoc.password) {
      return res.status(403).json({ error: "Admin şifresi belirlenmemiş." });
    }

    const adminValid = await verifyPassword(adminPassword, adminDoc.password, "admin");
    if (!adminValid) {
      return res.status(403).json({ error: "Admin şifresi hatalı." });
    }

    const bcryptHash = await hashPassword(defaultPassword);
    await setPasswordDoc("defaults", { professorDefault: bcryptHash, updatedAt: new Date() }, true);

    return res.json({ success: true });
  } catch (error) {
    console.error("setDefaultProfessorPassword error:", error);
    return res.status(500).json({ error: "Sunucu hatası." });
  }
});

module.exports = router;
