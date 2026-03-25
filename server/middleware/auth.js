const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "caku-erasmus-dev-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// JWT token oluştur
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// JWT token doğrula
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Express middleware: Authorization header'dan token doğrulama
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Yetkilendirme token'ı gerekli." });
  }

  const token = authHeader.split(" ")[1];

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

module.exports = { generateToken, verifyToken, requireAuth, JWT_SECRET };
