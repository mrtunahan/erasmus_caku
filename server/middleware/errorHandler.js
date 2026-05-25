// Merkezi hata yakalayıcı. Express 4'te 4-arg signature ile tanınır.
// Mevcut route'lar try/catch ile kendi cevaplarını verdiği için bu sadece
// kaçan hatalar için son güvenlik ağı görevi görür — yanıt biçimini değiştirmez.

function notFoundHandler(req, res, next) {
  if (res.headersSent) return next();
  if (!req.path.startsWith("/api/")) return next();
  return res.status(404).json({ error: "Endpoint bulunamadı.", path: req.path });
}

// Express 4-arg signature; `next` parametresi imza için zorunlu.
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";

  // Sunucu tarafında her zaman tam loglanır
  console.error("[API ERROR]", {
    method: req.method,
    path: req.path,
    status,
    message: err.message,
    stack: err.stack,
  });

  const body = { error: isProd && status >= 500 ? "Sunucu hatası." : err.message || "Hata." };
  if (!isProd && err.stack) body.stack = err.stack;
  res.status(status).json(body);
}

module.exports = { notFoundHandler, errorHandler };
