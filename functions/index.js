const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

admin.initializeApp();
const db = admin.firestore();

// ── Bcrypt ayarları ──
const BCRYPT_ROUNDS = 12;

// ── Eski SHA-256 hash (geriye dönük uyumluluk için) ──
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

// Sabit zamanlı karşılaştırma (timing attack önlemi - eski SHA-256 için)
function constantTimeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ── Şifre doğrulama (bcrypt + SHA-256 + düz metin desteği) ──
async function verifyPassword(inputPassword, storedPassword, salt) {
  if (isBcryptHash(storedPassword)) {
    // Bcrypt hash - doğrudan karşılaştır
    return bcrypt.compare(inputPassword, storedPassword);
  } else if (isSha256Hash(storedPassword)) {
    // Eski SHA-256 hash - geriye dönük uyumluluk
    const inputHash = legacySha256Hash(inputPassword, salt);
    return constantTimeCompare(inputHash, storedPassword);
  } else {
    // Düz metin (en eski veri)
    return storedPassword === inputPassword;
  }
}

// ── Bcrypt ile hashle ──
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// ── Rate Limiting (bellek tabanlı - basit) ──
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 dakika

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

// ══════════════════════════════════════════════
// 1. Öğrenci Giriş Doğrulama
// ══════════════════════════════════════════════
exports.verifyStudentLogin = functions.https.onCall(async (request) => {
  const { studentNumber, password } = request.data;
  if (!studentNumber || !password) {
    throw new functions.https.HttpsError("invalid-argument", "Öğrenci numarası ve şifre gerekli.");
  }

  const trimmedId = studentNumber.trim();
  const rateLimitKey = `student:${trimmedId}`;

  if (!checkRateLimit(rateLimitKey)) {
    throw new functions.https.HttpsError("resource-exhausted", "Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.");
  }

  try {
    const doc = await db.collection("passwords").doc("student_passwords").get();
    const passwords = doc.exists ? doc.data() : {};
    const storedPassword = passwords[trimmedId];

    if (!storedPassword) {
      recordAttempt(rateLimitKey);
      return { success: false, error: "Şifre bulunamadı." };
    }

    const isValid = await verifyPassword(password, storedPassword, trimmedId);

    if (isValid) {
      clearAttempts(rateLimitKey);
      // Eski hash'i bcrypt'e migrate et
      if (!isBcryptHash(storedPassword)) {
        const bcryptHash = await hashPassword(password);
        passwords[trimmedId] = bcryptHash;
        await db.collection("passwords").doc("student_passwords").set(passwords);
      }
      return { success: true };
    } else {
      recordAttempt(rateLimitKey);
      return { success: false, error: "Giriş bilgileri hatalı!" };
    }
  } catch (error) {
    console.error("verifyStudentLogin error:", error);
    throw new functions.https.HttpsError("internal", "Sunucu hatası.");
  }
});

// ══════════════════════════════════════════════
// 2. Admin Giriş Doğrulama
// ══════════════════════════════════════════════
exports.verifyAdminLogin = functions.https.onCall(async (request) => {
  const { password } = request.data;
  if (!password) {
    throw new functions.https.HttpsError("invalid-argument", "Şifre gerekli.");
  }

  const rateLimitKey = "admin";

  if (!checkRateLimit(rateLimitKey)) {
    throw new functions.https.HttpsError("resource-exhausted", "Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.");
  }

  try {
    const doc = await db.collection("passwords").doc("admin").get();
    if (!doc.exists || !doc.data().password) {
      return { success: false, error: "Admin şifresi henüz belirlenmemiş." };
    }

    const storedPassword = doc.data().password;
    const isValid = await verifyPassword(password, storedPassword, "admin");

    if (isValid) {
      clearAttempts(rateLimitKey);
      // Eski hash'i bcrypt'e migrate et
      if (!isBcryptHash(storedPassword)) {
        const bcryptHash = await hashPassword(password);
        await db.collection("passwords").doc("admin").set({
          password: bcryptHash,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      return { success: true };
    } else {
      recordAttempt(rateLimitKey);
      return { success: false, error: "Giriş bilgileri hatalı!" };
    }
  } catch (error) {
    console.error("verifyAdminLogin error:", error);
    throw new functions.https.HttpsError("internal", "Sunucu hatası.");
  }
});

// ══════════════════════════════════════════════
// 3. Profesör Giriş Doğrulama
// ══════════════════════════════════════════════
exports.verifyProfessorLogin = functions.https.onCall(async (request) => {
  const { professorName, password } = request.data;
  if (!professorName || !password) {
    throw new functions.https.HttpsError("invalid-argument", "Akademisyen adı ve şifre gerekli.");
  }

  const rateLimitKey = `professor:${professorName}`;

  if (!checkRateLimit(rateLimitKey)) {
    throw new functions.https.HttpsError("resource-exhausted", "Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.");
  }

  try {
    const doc = await db.collection("passwords").doc("professor_passwords").get();
    const passwords = doc.exists ? doc.data() : {};
    const storedPassword = passwords[professorName];

    // Şifre belirlenmemişse: ilk giriş, varsayılan şifre "1888"
    if (!storedPassword) {
      if (password === "1888") {
        clearAttempts(rateLimitKey);
        // Varsayılan şifreyi bcrypt ile hashle ve kaydet
        const bcryptHash = await hashPassword("1888");
        passwords[professorName] = bcryptHash;
        await db.collection("passwords").doc("professor_passwords").set(passwords, { merge: true });
        return { success: true };
      } else {
        recordAttempt(rateLimitKey);
        return { success: false, error: "Giriş bilgileri hatalı!" };
      }
    }

    const isValid = await verifyPassword(password, storedPassword, professorName);

    if (isValid) {
      clearAttempts(rateLimitKey);
      // Eski hash'i bcrypt'e migrate et
      if (!isBcryptHash(storedPassword)) {
        const bcryptHash = await hashPassword(password);
        passwords[professorName] = bcryptHash;
        await db.collection("passwords").doc("professor_passwords").set(passwords, { merge: true });
      }
      return { success: true };
    } else {
      recordAttempt(rateLimitKey);
      return { success: false, error: "Giriş bilgileri hatalı!" };
    }
  } catch (error) {
    console.error("verifyProfessorLogin error:", error);
    throw new functions.https.HttpsError("internal", "Sunucu hatası.");
  }
});

// ══════════════════════════════════════════════
// 4. Şifre Değiştirme (tüm roller)
// ══════════════════════════════════════════════
exports.changePassword = functions.https.onCall(async (request) => {
  const { role, identifier, newPassword, currentPassword } = request.data;

  if (!role || !newPassword) {
    throw new functions.https.HttpsError("invalid-argument", "Eksik parametreler.");
  }
  if (newPassword.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "Şifre en az 6 karakter olmalıdır.");
  }

  try {
    if (role === "student") {
      if (!identifier) throw new functions.https.HttpsError("invalid-argument", "Öğrenci numarası gerekli.");
      const doc = await db.collection("passwords").doc("student_passwords").get();
      const passwords = doc.exists ? doc.data() : {};

      // Mevcut şifre doğrulama (varsa)
      if (currentPassword && passwords[identifier]) {
        const valid = await verifyPassword(currentPassword, passwords[identifier], identifier);
        if (!valid) {
          return { success: false, error: "Mevcut şifre hatalı." };
        }
      }

      const bcryptHash = await hashPassword(newPassword);
      passwords[identifier] = bcryptHash;
      await db.collection("passwords").doc("student_passwords").set(passwords);
      return { success: true };

    } else if (role === "admin") {
      const bcryptHash = await hashPassword(newPassword);
      await db.collection("passwords").doc("admin").set({
        password: bcryptHash,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { success: true };

    } else if (role === "professor") {
      if (!identifier) throw new functions.https.HttpsError("invalid-argument", "Akademisyen adı gerekli.");
      const doc = await db.collection("passwords").doc("professor_passwords").get();
      const passwords = doc.exists ? doc.data() : {};
      const bcryptHash = await hashPassword(newPassword);
      passwords[identifier] = bcryptHash;
      await db.collection("passwords").doc("professor_passwords").set(passwords, { merge: true });
      return { success: true };

    } else {
      throw new functions.https.HttpsError("invalid-argument", "Geçersiz rol.");
    }
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error("changePassword error:", error);
    throw new functions.https.HttpsError("internal", "Sunucu hatası.");
  }
});

// ══════════════════════════════════════════════
// 5. Öğrenci şifre var mı kontrol (kayıt akışı)
// ══════════════════════════════════════════════
exports.checkStudentHasPassword = functions.https.onCall(async (request) => {
  const { studentNumber } = request.data;
  if (!studentNumber) {
    throw new functions.https.HttpsError("invalid-argument", "Öğrenci numarası gerekli.");
  }

  try {
    const doc = await db.collection("passwords").doc("student_passwords").get();
    const passwords = doc.exists ? doc.data() : {};
    return { hasPassword: !!passwords[studentNumber.trim()] };
  } catch (error) {
    console.error("checkStudentHasPassword error:", error);
    throw new functions.https.HttpsError("internal", "Sunucu hatası.");
  }
});

// ══════════════════════════════════════════════
// 6. Admin şifre yönetimi (toplu şifre sıfırlama)
// ══════════════════════════════════════════════
exports.adminResetPassword = functions.https.onCall(async (request) => {
  const { adminPassword, targetRole, targetIdentifier, newPassword } = request.data;

  if (!adminPassword || !targetRole || !newPassword) {
    throw new functions.https.HttpsError("invalid-argument", "Eksik parametreler.");
  }

  // Admin şifresini doğrula
  const adminDoc = await db.collection("passwords").doc("admin").get();
  if (!adminDoc.exists || !adminDoc.data().password) {
    throw new functions.https.HttpsError("permission-denied", "Admin şifresi belirlenmemiş.");
  }

  const storedAdmin = adminDoc.data().password;
  const adminValid = await verifyPassword(adminPassword, storedAdmin, "admin");

  if (!adminValid) {
    throw new functions.https.HttpsError("permission-denied", "Admin şifresi hatalı.");
  }

  // Hedef şifreyi değiştir
  if (targetRole === "student" && targetIdentifier) {
    const doc = await db.collection("passwords").doc("student_passwords").get();
    const passwords = doc.exists ? doc.data() : {};
    passwords[targetIdentifier] = await hashPassword(newPassword);
    await db.collection("passwords").doc("student_passwords").set(passwords);
    return { success: true };
  } else if (targetRole === "professor" && targetIdentifier) {
    const doc = await db.collection("passwords").doc("professor_passwords").get();
    const passwords = doc.exists ? doc.data() : {};
    passwords[targetIdentifier] = await hashPassword(newPassword);
    await db.collection("passwords").doc("professor_passwords").set(passwords, { merge: true });
    return { success: true };
  }

  throw new functions.https.HttpsError("invalid-argument", "Geçersiz hedef.");
});
