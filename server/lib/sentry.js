// Sentry başlatma (opsiyonel). SENTRY_DSN tanımlı değilse no-op kalır.
// @sentry/node kurulu değilse de uygulama çalışmaya devam eder.

const { logger } = require('./logger');

function tryRequire(name) {
  try {
    return require(name);
  } catch (_e) {
    return null;
  }
}

let initialized = false;
let Sentry = null;

function initSentry() {
  if (initialized) return Sentry;
  initialized = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return null;
  Sentry = tryRequire('@sentry/node');
  if (!Sentry) {
    logger.warn('[sentry] SENTRY_DSN tanımlı ancak @sentry/node kurulu değil — devre dışı');
    return null;
  }
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || undefined,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
  });
  logger.info('[sentry] başlatıldı');
  return Sentry;
}

function captureException(err, context) {
  if (Sentry) {
    try {
      Sentry.captureException(err, context ? { extra: context } : undefined);
    } catch (_e) {
      /* yut */
    }
  }
}

function sentryRequestHandler() {
  if (Sentry && Sentry.Handlers && Sentry.Handlers.requestHandler) {
    return Sentry.Handlers.requestHandler();
  }
  return (req, res, next) => next();
}

function sentryErrorHandler() {
  if (Sentry && Sentry.Handlers && Sentry.Handlers.errorHandler) {
    return Sentry.Handlers.errorHandler();
  }
  return (err, _req, _res, next) => next(err);
}

module.exports = { initSentry, captureException, sentryRequestHandler, sentryErrorHandler };
