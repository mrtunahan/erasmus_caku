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

    // Şifre belirlenmemişse: Firestore'daki varsayılan şifreyi kontrol et
    if (!storedPassword) {
      const defaultDoc = await db.collection("passwords").doc("defaults").get();
      const defaultPassword = defaultDoc.exists ? defaultDoc.data().professorDefault : null;

      if (!defaultPassword) {
        recordAttempt(rateLimitKey);
        return { success: false, error: "Şifre henüz belirlenmemiş. Lütfen yönetici ile iletişime geçin." };
      }

      const defaultValid = await verifyPassword(password, defaultPassword, "professor_default");
      if (defaultValid) {
        clearAttempts(rateLimitKey);
        // Varsayılan şifreyi bcrypt ile hashle ve bu profesöre özel kaydet
        const bcryptHash = await hashPassword(password);
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

// ══════════════════════════════════════════════
// 6b. Kullanıcı Rolü Kaydet
// ══════════════════════════════════════════════
exports.saveUserRole = functions.https.onCall(async (request) => {
  const { uid, roleData } = request.data;

  if (!uid || !roleData) {
    throw new functions.https.HttpsError("invalid-argument", "uid ve roleData gerekli.");
  }

  try {
    await db.collection("users").doc(uid).set({
      ...roleData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("saveUserRole error:", error);
    throw new functions.https.HttpsError("internal", "Rol kaydedilemedi.");
  }
});

// ══════════════════════════════════════════════
// 7. Varsayılan Profesör Şifresini Ayarla (Admin)
// ══════════════════════════════════════════════
exports.setDefaultProfessorPassword = functions.https.onCall(async (request) => {
  const { adminPassword, defaultPassword } = request.data;

  if (!adminPassword || !defaultPassword) {
    throw new functions.https.HttpsError("invalid-argument", "Eksik parametreler.");
  }
  if (defaultPassword.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "Şifre en az 6 karakter olmalıdır.");
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

  const bcryptHash = await hashPassword(defaultPassword);
  await db.collection("passwords").doc("defaults").set({
    professorDefault: bcryptHash,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true };
});

// ══════════════════════════════════════════════
// 8. Genel Firestore Yazma İşlemleri (CRUD)
// ══════════════════════════════════════════════
// İzin verilen koleksiyonlar (güvenlik sınırı)
const ALLOWED_COLLECTIONS = [
  "sinav_programi",
  "sinav_dersler",
  "sinav_donemler",
  "professors",
  "users",
  "portal_posts",
  "portal_moderators",
  "portal_notifications",
  "portal_profiles",
  "portal_follows",
  "portal_reports",
  "muafiyet_settings",
  "muafiyet_records",
  "projects",
  "project_courses",
];

exports.firestoreWrite = functions.https.onCall(async (request) => {
  const { operations } = request.data;

  if (!operations || !Array.isArray(operations) || operations.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "operations dizisi gerekli.");
  }

  // Koleksiyon referansı oluştur (subcollection destekli)
  function getRef(op) {
    let ref = db.collection(op.collection);
    if (op.parentDocId && op.subCollection) {
      ref = ref.doc(op.parentDocId).collection(op.subCollection);
    }
    return ref;
  }

  // Tüm koleksiyonları doğrula
  for (const op of operations) {
    if (!ALLOWED_COLLECTIONS.includes(op.collection)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        `Koleksiyon izni yok: ${op.collection}`
      );
    }
  }

  try {
    // Tek işlem varsa batch kullanmadan yap
    if (operations.length === 1) {
      const op = operations[0];
      const ref = getRef(op);

      switch (op.type) {
        case "add": {
          const docRef = await ref.add(op.data);
          return { success: true, id: docRef.id };
        }
        case "set": {
          await ref.doc(op.docId).set(op.data, op.merge ? { merge: true } : undefined);
          return { success: true };
        }
        case "update": {
          await ref.doc(op.docId).update(op.data);
          return { success: true };
        }
        case "delete": {
          await ref.doc(op.docId).delete();
          return { success: true };
        }
        default:
          throw new functions.https.HttpsError("invalid-argument", `Geçersiz işlem tipi: ${op.type}`);
      }
    }

    // Birden fazla işlem: batch kullan
    const batch = db.batch();
    const addedIds = [];

    for (const op of operations) {
      const ref = getRef(op);
      switch (op.type) {
        case "add": {
          const newRef = ref.doc();
          batch.set(newRef, op.data);
          addedIds.push(newRef.id);
          break;
        }
        case "set":
          batch.set(ref.doc(op.docId), op.data, op.merge ? { merge: true } : undefined);
          break;
        case "update":
          batch.update(ref.doc(op.docId), op.data);
          break;
        case "delete":
          batch.delete(ref.doc(op.docId));
          break;
        default:
          throw new functions.https.HttpsError("invalid-argument", `Geçersiz işlem tipi: ${op.type}`);
      }
    }

    await batch.commit();
    return { success: true, ids: addedIds };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error("firestoreWrite error:", error);
    throw new functions.https.HttpsError("internal", "Yazma hatası: " + error.message);
  }
});
