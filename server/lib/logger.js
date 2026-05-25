// Yapılandırılmış logger. pino kuruluysa JSON log üretir; değilse
// console'a düşer (mevcut davranış). Hiçbir mevcut console.* çağrısı
// değiştirilmez — bu modül yeni kodun gözlemlenebilirlik kazanması için.

function tryRequire(name) {
  try {
    return require(name);
  } catch (_e) {
    return null;
  }
}

const pino = tryRequire('pino');

function buildLogger() {
  if (!pino) {
    const fallback = (level) => (obj, msg) => {
      const m = typeof obj === 'string' ? obj : msg || '';
      const ctx = typeof obj === 'object' ? obj : null;
      const line = ctx ? `${m} ${JSON.stringify(ctx)}` : m;
      const out = level === 'error' || level === 'fatal' ? console.error : console.log;
      out(`[${level}] ${line}`);
    };
    return {
      trace: fallback('trace'),
      debug: fallback('debug'),
      info: fallback('info'),
      warn: fallback('warn'),
      error: fallback('error'),
      fatal: fallback('fatal'),
      child: () => buildLogger(),
    };
  }
  return pino({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    base: { service: 'erasmus-caku-api' },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.token',
        '*.password',
        '*.token',
      ],
      remove: true,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

const logger = buildLogger();

module.exports = { logger };
