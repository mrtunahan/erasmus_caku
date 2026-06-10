const jwt = require("jsonwebtoken");

// Üretimde JWT_SECRET zorunlu — dev'de fallback (mevcut davranışla uyumlu).
const DEV_FALLBACK_SECRET = "caku-erasmus-dev-secret-key";
if (
  process.env.NODE_ENV === "production" &&
  (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_FALLBACK_SECRET)
) {
  // Fail-fast: secret tanımsızsa VEYA bilinen zayıf dev-fallback değerine
  // eşitse prod açılması engellenir (token sahteciliği önlemi).
  throw new Error(
    "JWT_SECRET ortam değişkeni production'da zorunludur ve dev-fallback değeri kullanılamaz. .env dosyanızı kontrol edin."
  );
}
const JWT_SECRET = process.env.JWT_SECRET || DEV_FALLBACK_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

if (JWT_SECRET === DEV_FALLBACK_SECRET) {
  console.warn(
    "[auth] DİKKAT: JWT_SECRET ayarlanmamış — geliştirme fallback kullanılıyor. Üretimde mutlaka değiştirin."
  );
}

// JWT token oluştur
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// JWT token doğrula
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// httpOnly cookie ayarları
function getTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 saat
    path: "/",
  };
}

// Token'ı httpOnly cookie olarak set et
function setTokenCookie(res, token) {
  res.cookie("caku_auth", token, getTokenCookieOptions());
}

// Token cookie'sini temizle
function clearTokenCookie(res) {
  res.clearCookie("caku_auth", { path: "/" });
}

// Express middleware: önce httpOnly cookie, yoksa Authorization header
function requireAuth(req, res, next) {
  let token = null;

  // 1. httpOnly cookie'den oku (güvenli yol)
  if (req.cookies && req.cookies.caku_auth) {
    token = req.cookies.caku_auth;
  }

  // 2. Fallback: Authorization header (geriye dönük uyumluluk)
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Yetkilendirme token'ı gerekli." });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token süresi dolmuş." });
    }
    return res.status(401).json({ error: "Geçersiz token." });
  }
}

module.exports = { generateToken, verifyToken, requireAuth, setTokenCookie, clearTokenCookie, JWT_SECRET };
