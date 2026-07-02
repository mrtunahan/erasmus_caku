// ══════════════════════════════════════════════════════════════
// Semantik benzerlik proxy'si — Ders Muafiyet modülü için.
//
// Embedding hesabı ayrı bir Python mikroservisinde yapılır
// (server/embedding-service/ — LaBSE, sentence-transformers).
// Bu route yalnızca proxy'dir: servis ayakta değilse 503 döner ve
// istemci sözcüksel (TF-IDF/Jaccard) skora geri düşer — muafiyet
// akışı embedding servisi olmadan da tam çalışır.
//
// Yapılandırma: EMBEDDING_SERVICE_URL (varsayılan http://127.0.0.1:5005)
// ══════════════════════════════════════════════════════════════
const express = require('express');

const router = express.Router();

const SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://127.0.0.1:5005';
// Uzun ders içerikleri + ilk istekte model ısınması için geniş tutuldu
const TIMEOUT_MS = 20000;
const MAX_PAIRS = 50;
const MAX_TEXT_CHARS = 20000;

async function callService(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(SERVICE_URL + path, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// GET /api/semantic/health — servis ayakta mı? (istemci fallback kararı için)
router.get('/health', async (_req, res) => {
  try {
    const r = await callService('/health');
    const data = await r.json().catch(() => ({}));
    return res.json({ available: r.ok, ...data });
  } catch (_e) {
    return res.json({ available: false });
  }
});

// POST /api/semantic/similarity { pairs: [{a, b}, ...] } → { available, scores: [0..1] }
router.post('/similarity', async (req, res) => {
  const { pairs } = req.body || {};
  if (!Array.isArray(pairs) || pairs.length === 0 || pairs.length > MAX_PAIRS) {
    return res.status(400).json({ error: `pairs dizisi gerekli (1-${MAX_PAIRS})` });
  }
  for (const p of pairs) {
    if (!p || typeof p.a !== 'string' || typeof p.b !== 'string') {
      return res.status(400).json({ error: 'Her pair { a, b } metin alanları içermeli' });
    }
  }

  const trimmed = pairs.map((p) => ({
    a: p.a.slice(0, MAX_TEXT_CHARS),
    b: p.b.slice(0, MAX_TEXT_CHARS),
  }));

  try {
    const r = await callService('/similarity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairs: trimmed }),
    });
    if (!r.ok) throw new Error('embedding servisi HTTP ' + r.status);
    const data = await r.json();
    if (!Array.isArray(data.scores) || data.scores.length !== pairs.length) {
      throw new Error('embedding servisi geçersiz yanıt döndü');
    }
    return res.json({ available: true, scores: data.scores });
  } catch (e) {
    // Servis kapalı/aşırı yüklü → istemci sözcüksel skora düşer
    return res.status(503).json({
      available: false,
      error: 'Embedding servisi kullanılamıyor: ' + e.message,
    });
  }
});

module.exports = router;
