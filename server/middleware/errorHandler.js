// Merkezi hata yakalayıcı. Express 4'te 4-arg signature ile tanınır.
// Mevcut route'lar try/catch ile kendi cevaplarını verdiği için bu sadece
// kaçan hatalar için son güvenlik ağı görevi görür — yanıt biçimini değiştirmez.

function notFoundHandler(req, res, next) {
  if (res.headersSent) return next();
  if (!req.path.startsWith('/api/')) return next();
  return res.status(404).json({ error: 'Endpoint bulunamadı.', path: req.path });
}

// Express 4-arg signature; `next` parametresi imza için zorunlu.
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // ⚠ Eskiden HER hata tam yığın iziyle loglanıyordu. Ham IP'den gelen her
  // tarama CORS'a takılıyor ve loglar 15 satırlık Express yığın izleriyle
  // doluyordu — oysa o istek bir arıza değil, doğru çalışan bir reddir.
  // Beklenen 4xx'ler tek satır; yığın izi yalnız gerçek sunucu hatalarında.
  const beklenen = err.beklenen === true || status < 500;
  if (beklenen) {
    console.warn(`[API ${status}] ${req.method} ${req.path} — ${err.message}`);
  } else {
    console.error('[API ERROR]', {
      method: req.method,
      path: req.path,
      status,
      message: err.message,
      stack: err.stack,
    });
  }

  const body = { error: isProd && status >= 500 ? 'Sunucu hatası.' : err.message || 'Hata.' };
  if (!isProd && err.stack) body.stack = err.stack;
  res.status(status).json(body);
}

module.exports = { notFoundHandler, errorHandler };
