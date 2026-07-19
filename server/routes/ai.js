// ══════════════════════════════════════════════════════════════
// AI yardımcı rotaları — şimdilik akreditasyon ÖDR taslak yazımı.
//
// Mimari: model-agnostik. Bu route sağlayıcıyı BİLMEZ; yalnız
// services/llm.js üzerinden generateText çağırır. Sağlayıcı .env ile seçilir.
//
// İnsan-onaylı akış: burası yalnız TASLAK üretir; kullanıcı düzenleyip
// onaylayana kadar hiçbir şey rapora girmez (istemci tarafı yönetir).
// ══════════════════════════════════════════════════════════════
const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const { generateText, activeProvider, aiConfigured, modelFor } = require('../services/llm');

const router = express.Router();

// AI çağrıları maliyetli — dakikada düşük limit (kötüye kullanım/kaza koruması).
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Çok fazla AI isteği. Lütfen biraz bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Durum sorgusu ucuz ama yine de sınırlı (istemci açılışta bir kez çağırır).
const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Çok fazla istek. Lütfen biraz bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Öğrenci AI üretimini kullanamaz (personel aracı).
function requireStaff(req, res, next) {
  if (req.user && req.user.role && req.user.role !== 'student') return next();
  return res.status(403).json({ error: 'Bu işlem için personel yetkisi gerekli.' });
}

const clip = (s, n) => String(s == null ? '' : s).slice(0, n);

// GET /api/ai/status — istemci butonu buna göre etkinleşir.
router.get('/status', statusLimiter, requireAuth, (req, res) => {
  const provider = activeProvider();
  res.json({
    configured: aiConfigured(),
    provider: provider || null,
    model: provider ? modelFor(provider) : null,
  });
});

// POST /api/ai/accreditation-draft
// body: { frameworkName, criterionNo, criterionTitle, programName, evidence:[{type,title,content}] }
router.post('/accreditation-draft', aiLimiter, requireAuth, requireStaff, async (req, res) => {
  try {
    if (!aiConfigured()) {
      return res.status(503).json({
        error:
          'AI yapılandırılmamış. Sunucu .env dosyasına bir sağlayıcı anahtarı ekleyin (ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY).',
      });
    }
    const b = req.body || {};
    const frameworkName = clip(b.frameworkName, 120) || 'MÜDEK';
    const criterionNo = Number(b.criterionNo) || 0;
    const criterionTitle = clip(b.criterionTitle, 200);
    const programName = clip(b.programName, 200) || 'ilgili program';
    const evidence = Array.isArray(b.evidence) ? b.evidence.slice(0, 60) : [];

    // Kanıtları düz metne çevir (girdi boyutu sınırlı — maliyet/uzunluk).
    const evidenceText =
      evidence
        .map((e, i) => {
          const t = clip(e && e.title, 200) || 'Kanıt ' + (i + 1);
          const c = clip(e && e.content, 4000);
          const tip = clip(e && e.type, 20);
          return '### ' + t + ' [' + tip + ']\n' + c;
        })
        .join('\n\n')
        .slice(0, 24000) || '(Bu ölçüt için henüz kanıt girilmemiştir.)';

    const system =
      'Sen bir mühendislik programı akreditasyonu (MÜDEK/FEDEK) Öz Değerlendirme Raporu (ÖDR) ' +
      'yazım asistanısın. Görevin, verilen KANITLARA dayanarak ilgili ölçüt için resmi, akademik ' +
      've nesnel Türkçe ile bir DEĞERLENDİRME ANLATISI yazmaktır.\n\n' +
      'KESİN KURALLAR:\n' +
      '1) YALNIZCA sana verilen kanıtları kullan. Kanıtta olmayan sayı, tarih, oran, isim UYDURMA.\n' +
      '2) Bir bilgi eksikse cümleyi tamamlamak için "[EKSİK: ne gerekiyor]" biçiminde açık bir ' +
      'yer tutucu bırak.\n' +
      '3) Kurumsal, üçüncü tekil şahıs, akıcı paragraflar yaz (madde listesi değil). Gerekirse kısa ' +
      'alt başlıklar kullanabilirsin.\n' +
      '4) Abartı/pazarlama dili kullanma; kanıta dayalı ve ölçülü ol.\n' +
      '5) Çıktı yalnızca ÖDR metni olsun; "işte metin" gibi giriş cümlesi yazma.';

    const prompt =
      'Çerçeve: ' +
      frameworkName +
      '\n' +
      'Program: ' +
      programName +
      '\n' +
      'Ölçüt ' +
      criterionNo +
      ': ' +
      criterionTitle +
      '\n\n' +
      'KANITLAR:\n' +
      evidenceText +
      '\n\n' +
      'Yukarıdaki kanıtlara dayanarak bu ölçüt için ÖDR değerlendirme metnini yaz.';

    const out = await generateText({ system, prompt, maxTokens: 1600, temperature: 0.3 });
    return res.json({ text: out.text, provider: out.provider, model: out.model });
  } catch (err) {
    console.error('ai/accreditation-draft error:', err.message);
    return res.status(502).json({ error: 'AI taslağı üretilemedi: ' + err.message });
  }
});

module.exports = router;
