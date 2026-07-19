// ══════════════════════════════════════════════════════════════
// Model-agnostik LLM çağrı katmanı (soyutlama).
//
// Sağlayıcı .env ile seçilir:
//   AI_PROVIDER = anthropic | openai | gemini   (verilmezse: hangi anahtar
//                 tanımlıysa o otomatik seçilir)
//   ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY (veya GOOGLE_API_KEY)
//   AI_MODEL     (opsiyonel — sağlayıcıya göre makul bir varsayılan vardır)
//
// Yalnızca global fetch kullanır; EK BAĞIMLILIK YOKTUR. Yeni bir sağlayıcı
// eklemek = aşağıya yeni bir `case` yazmak. Çağıran taraf (route) sağlayıcıyı
// bilmez; yalnız generateText({system, prompt}) çağırır.
// ══════════════════════════════════════════════════════════════

const TIMEOUT_MS = 45000;

const DEFAULT_MODELS = {
  anthropic: 'claude-3-5-haiku-latest',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-flash',
};

function keyFor(provider) {
  if (provider === 'anthropic') return process.env.ANTHROPIC_API_KEY || '';
  if (provider === 'openai') return process.env.OPENAI_API_KEY || '';
  if (provider === 'gemini') return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  return '';
}

// Etkin sağlayıcı: açık AI_PROVIDER, yoksa tanımlı ilk anahtar.
function activeProvider() {
  const explicit = (process.env.AI_PROVIDER || '').toLowerCase().trim();
  if (explicit) return explicit;
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return 'gemini';
  return null;
}

function aiConfigured() {
  const p = activeProvider();
  return !!(p && keyFor(p));
}

function modelFor(provider) {
  return process.env.AI_MODEL || DEFAULT_MODELS[provider] || '';
}

async function withTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Sağlayıcı çağrıları — hepsi { system, prompt, maxTokens, temperature }
// alır ve düz metin döner. İstek/yanıt biçimi sağlayıcıya özeldir. ──

async function callAnthropic({ system, prompt, maxTokens, temperature }) {
  const res = await withTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': keyFor('anthropic'),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelFor('anthropic'),
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || 'Anthropic HTTP ' + res.status);
  return (data.content || [])
    .map((c) => c.text || '')
    .join('')
    .trim();
}

async function callOpenAI({ system, prompt, maxTokens, temperature }) {
  const res = await withTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + keyFor('openai'),
    },
    body: JSON.stringify({
      model: modelFor('openai'),
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || 'OpenAI HTTP ' + res.status);
  return (data.choices?.[0]?.message?.content || '').trim();
}

async function callGemini({ system, prompt, maxTokens, temperature }) {
  const model = modelFor('gemini');
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) +
    ':generateContent?key=' +
    encodeURIComponent(keyFor('gemini'));
  const res = await withTimeout(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || 'Gemini HTTP ' + res.status);
  return (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
    .trim();
}

// Tek giriş noktası — sağlayıcıdan bağımsız.
async function generateText({ system, prompt, maxTokens = 1600, temperature = 0.3 }) {
  const provider = activeProvider();
  if (!provider)
    throw new Error('AI sağlayıcı yapılandırılmamış (AI_PROVIDER / API anahtarı yok).');
  if (!keyFor(provider)) throw new Error(provider + ' için API anahtarı tanımlı değil.');
  const args = { system, prompt, maxTokens, temperature };
  let text;
  if (provider === 'anthropic') text = await callAnthropic(args);
  else if (provider === 'openai') text = await callOpenAI(args);
  else if (provider === 'gemini') text = await callGemini(args);
  else throw new Error('Bilinmeyen AI sağlayıcı: ' + provider);
  if (!text) throw new Error('Model boş yanıt döndürdü.');
  return { text, provider, model: modelFor(provider) };
}

module.exports = { generateText, activeProvider, aiConfigured, modelFor };
