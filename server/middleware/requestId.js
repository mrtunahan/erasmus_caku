// Her isteğe correlation ID ekler. İstemci X-Request-Id gönderirse onurlandırılır;
// aksi halde rastgele üretilir. Yanıt header'ında ve req.id'de mevcut olur,
// böylece log'lar arası izleme yapılabilir.

const crypto = require('crypto');

function newId() {
  // Kısa, çakışmaya karşı güvenli (122 bit entropi)
  return crypto.randomBytes(16).toString('hex');
}

function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  // Güvenlik: müşteriden geleni sadece basit alfanümerik ise kabul et
  const valid = typeof incoming === 'string' && /^[a-zA-Z0-9_-]{8,128}$/.test(incoming);
  req.id = valid ? incoming : newId();
  res.setHeader('X-Request-Id', req.id);
  next();
}

module.exports = { requestId };
