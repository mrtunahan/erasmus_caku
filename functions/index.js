const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// ── SHA-256 hash (client ile aynı algoritma) ──
function sha256(message) {
  return crypto.createHash("sha256").update(message, "utf8").digest("hex");
}

function hashPassword(password, salt) {
  return sha256(salt + ":" + password);
}

function isHashed(password) {
  return typeof password === "string" && /^[a-f0-9]{64}$/.test(password);
}

// Sabit zamanlı karşılaştırma (timing attack önlemi)
function constantTimeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ── Rate Limiting (bellek tabanlı - basit) ──
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 dakika

function checkRateLimit(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record) return true;
  // Pencere dışındaki girişimleri temizle
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

    let isValid = false;
    if (isHashed(storedPassword)) {
      const inputHash = hashPassword(password, trimmedId);
      isValid = constantTimeCompare(inputHash, storedPassword);
    } else {
      // Düz metin (eski veri) - eşleşirse otomatik migrate et
      isValid = storedPassword === password;
      if (isValid) {
        const hashed = hashPassword(password, trimmedId);
        passwords[trimmedId] = hashed;
        await db.collection("passwords").doc("student_passwords").set(passwords);
      }
    }

    if (isValid) {
      clearAttempts(rateLimitKey);
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
    let isValid = false;

    if (isHashed(storedPassword)) {
      const inputHash = hashPassword(password, "admin");
      isValid = constantTimeCompare(inputHash, storedPassword);
    } else {
      isValid = storedPassword === password;
      if (isValid) {
        const hashed = hashPassword(password, "admin");
        await db.collection("passwords").doc("admin").set({
          password: hashed,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    if (isValid) {
      clearAttempts(rateLimitKey);
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

    // Şifre belirlenmemişse: ilk giriş
    if (!storedPassword) {
      return { success: false, needsSetup: true };
    }

    let isValid = false;
    if (isHashed(storedPassword)) {
      const inputHash = hashPassword(password, professorName);
      isValid = constantTimeCompare(inputHash, storedPassword);
    } else {
      isValid = storedPassword === password;
      if (isValid) {
        const hashed = hashPassword(password, professorName);
        passwords[professorName] = hashed;
        await db.collection("passwords").doc("professor_passwords").set(passwords, { merge: true });
      }
    }

    if (isValid) {
      clearAttempts(rateLimitKey);
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
        const stored = passwords[identifier];
        let valid = false;
        if (isHashed(stored)) {
          valid = constantTimeCompare(hashPassword(currentPassword, identifier), stored);
        } else {
          valid = stored === currentPassword;
        }
        if (!valid) {
          return { success: false, error: "Mevcut şifre hatalı." };
        }
      }

      const hashed = hashPassword(newPassword, identifier);
      passwords[identifier] = hashed;
      await db.collection("passwords").doc("student_passwords").set(passwords);
      return { success: true };

    } else if (role === "admin") {
      const hashed = hashPassword(newPassword, "admin");
      await db.collection("passwords").doc("admin").set({
        password: hashed,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { success: true };

    } else if (role === "professor") {
      if (!identifier) throw new functions.https.HttpsError("invalid-argument", "Akademisyen adı gerekli.");
      const doc = await db.collection("passwords").doc("professor_passwords").get();
      const passwords = doc.exists ? doc.data() : {};
      const hashed = hashPassword(newPassword, identifier);
      passwords[identifier] = hashed;
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
  let adminValid = false;
  if (isHashed(storedAdmin)) {
    adminValid = constantTimeCompare(hashPassword(adminPassword, "admin"), storedAdmin);
  } else {
    adminValid = storedAdmin === adminPassword;
  }

  if (!adminValid) {
    throw new functions.https.HttpsError("permission-denied", "Admin şifresi hatalı.");
  }

  // Hedef şifreyi değiştir
  if (targetRole === "student" && targetIdentifier) {
    const doc = await db.collection("passwords").doc("student_passwords").get();
    const passwords = doc.exists ? doc.data() : {};
    passwords[targetIdentifier] = hashPassword(newPassword, targetIdentifier);
    await db.collection("passwords").doc("student_passwords").set(passwords);
    return { success: true };
  } else if (targetRole === "professor" && targetIdentifier) {
    const doc = await db.collection("passwords").doc("professor_passwords").get();
    const passwords = doc.exists ? doc.data() : {};
    passwords[targetIdentifier] = hashPassword(newPassword, targetIdentifier);
    await db.collection("passwords").doc("professor_passwords").set(passwords, { merge: true });
    return { success: true };
  }

  throw new functions.https.HttpsError("invalid-argument", "Geçersiz hedef.");
});
