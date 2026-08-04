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
    // Belge işleme ayrı bir katmandır ve yalnız Anthropic anahtarıyla çalışır;
    // istemci "Belgeden Doldur" butonunu buna göre etkinleştirir.
    belgeIsleme: {
      configured: require('../services/claude-extract').yapilandirildiMi(),
      model: require('../services/claude-extract').MODEL,
    },
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

// ══════════════════════════════════════════════════════════════
// BELGE İŞLEME — tek extraction service katmanı üzerinden.
//
// Bu uçlar sağlayıcı-agnostik DEĞİLDİR: yalnız claude-haiku-4-5 ile çalışır
// (services/claude-extract.js). Yukarıdaki ÖDR taslağı ise model-agnostik
// llm.js katmanında kalır — iki farklı iş, iki farklı katman.
// ══════════════════════════════════════════════════════════════
const cx = require('../services/claude-extract');
const { kullanimRaporu } = require('../services/ai-usage');
const filesRouter = require('./files');

// Belge işleme çağrıları PAHALIDIR. Öğrenci kendi formunu doldurduğu için
// erişebilmeli, ama çok daha dar bir bantla.
const extractLimiterStaff = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Çok fazla belge işleme isteği. Lütfen biraz bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const extractLimiterStudent = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  message: { error: 'Çok fazla belge işleme isteği. Lütfen biraz bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});
function extractLimiter(req, res, next) {
  const f = req.user && req.user.role === 'student' ? extractLimiterStudent : extractLimiterStaff;
  return f(req, res, next);
}

function aiHazirMi(res) {
  if (cx.yapilandirildiMi()) return true;
  res.status(503).json({
    error: 'Belge işleme yapılandırılmamış. Sunucu .env dosyasına ANTHROPIC_API_KEY ekleyin.',
  });
  return false;
}

// İstemci yalnız daha önce /api/files/upload ile yüklediği dosyanın
// `fileName` değerini gönderir; ham dosya İKİNCİ KEZ yüklenmez.
function dosyalariCoz(liste) {
  const cozulen = [];
  const bulunamayan = [];
  (Array.isArray(liste) ? liste : []).slice(0, 8).forEach((d) => {
    const fileName = d && typeof d.fileName === 'string' ? d.fileName : '';
    const p = fileName ? filesRouter.resolveUploadPath(fileName) : null;
    if (!p) {
      bulunamayan.push({ fileName, reason: 'not-found-or-unsafe' });
      return;
    }
    cozulen.push({ path: p, name: clip(d.name, 200) || fileName });
  });
  return { cozulen, bulunamayan };
}

// Alan listesini temizle — istemciden gelen serbest metin sınırlandırılır.
function alanlariTemizle(fields) {
  return (Array.isArray(fields) ? fields : [])
    .slice(0, 80)
    .filter((f) => f && typeof f.id === 'string' && /^[A-Za-z0-9_]{1,60}$/.test(f.id))
    .map((f) => ({
      id: f.id,
      label: clip(f.label, 160) || f.id,
      hint: clip(f.hint, 240),
      format: clip(f.format, 24),
    }));
}

// Öğrenci için öğrenci numarası DAİMA token'dan alınır (gövdeden değil) —
// maliyet raporunun başka bir öğrenciye yazılması engellenir.
function baglamCoz(req, body) {
  const u = req.user || {};
  const ogrenci = u.role === 'student';
  return {
    studentNo: ogrenci ? String(u.identifier || '') : clip(body.studentNo, 40),
    departmentId: ogrenci ? String(u.departmentId || '') : clip(body.departmentId, 80),
    actorId: String(u.identifier || u.role || ''),
    actorName: String(u.identifier || ''),
  };
}

// POST /api/ai/extract — belgelerden form alanlarını doldur.
// body: { module, docType, fields:[{id,label,hint,format}], dosyalar:[{fileName,name}] }
router.post('/extract', extractLimiter, requireAuth, async (req, res) => {
  try {
    if (!aiHazirMi(res)) return undefined;
    const b = req.body || {};
    const fields = alanlariTemizle(b.fields);
    if (fields.length === 0) return res.status(400).json({ error: 'Doldurulacak alan yok.' });

    const { cozulen, bulunamayan } = dosyalariCoz(b.dosyalar);
    if (cozulen.length === 0) {
      return res.status(400).json({ error: 'Okunabilir belge bulunamadı.', bulunamayan });
    }

    const sonuc = await cx.alanCikar({
      module: clip(b.module, 40),
      docType: clip(b.docType, 40) || 'default',
      fields,
      dosyalar: cozulen,
      baglam: baglamCoz(req, b),
    });

    if (!sonuc.ok) {
      return res.status(422).json({
        error: 'Belgeden alanlar çıkarılamadı.',
        reason: sonuc.reason,
        hatalar: (sonuc.hatalar || []).concat(bulunamayan),
      });
    }
    return res.json({
      ok: true,
      model: cx.MODEL,
      data: sonuc.data,
      hatalar: (sonuc.hatalar || []).concat(bulunamayan),
      onbellek: sonuc.onbellek,
      usage: sonuc.usage,
    });
  } catch (err) {
    console.error('ai/extract error:', err.message);
    return res.status(502).json({ error: 'Belge işlenemedi: ' + err.message });
  }
});

// POST /api/ai/compare — formdaki/sistemdeki değerleri belgeyle kıyasla.
// body: { module, docType, fields[], mevcutDegerler{}, dosyalar[] }
router.post('/compare', extractLimiter, requireAuth, async (req, res) => {
  try {
    if (!aiHazirMi(res)) return undefined;
    const b = req.body || {};
    const fields = alanlariTemizle(b.fields);
    if (fields.length === 0) return res.status(400).json({ error: 'Kıyaslanacak alan yok.' });

    const { cozulen, bulunamayan } = dosyalariCoz(b.dosyalar);
    if (cozulen.length === 0) {
      return res.status(400).json({ error: 'Okunabilir belge bulunamadı.', bulunamayan });
    }

    // Yalnız istenen alanların değerleri alınır; gövdedeki fazlalık atılır.
    const mevcutDegerler = {};
    fields.forEach((f) => {
      const v = (b.mevcutDegerler || {})[f.id];
      mevcutDegerler[f.id] = clip(v == null ? '' : v, 400);
    });

    const sonuc = await cx.karsilastir({
      module: clip(b.module, 40),
      docType: clip(b.docType, 40) || 'default',
      fields,
      mevcutDegerler,
      dosyalar: cozulen,
      baglam: baglamCoz(req, b),
    });

    if (!sonuc.ok) {
      return res.status(422).json({
        error: 'Kıyaslama yapılamadı.',
        reason: sonuc.reason,
        hatalar: (sonuc.hatalar || []).concat(bulunamayan),
      });
    }
    return res.json({
      ok: true,
      model: cx.MODEL,
      data: sonuc.data,
      farkliSayisi: sonuc.farkliSayisi,
      hatalar: (sonuc.hatalar || []).concat(bulunamayan),
      onbellek: sonuc.onbellek,
      usage: sonuc.usage,
    });
  } catch (err) {
    console.error('ai/compare error:', err.message);
    return res.status(502).json({ error: 'Kıyaslama yapılamadı: ' + err.message });
  }
});

// POST /api/ai/verify — web araması ile iddia doğrulama (max 3 arama).
// body: { module, docType, iddialar:[{id,metin}], izinliAlanlar:[] }
router.post('/verify', extractLimiter, requireAuth, requireStaff, async (req, res) => {
  try {
    if (!aiHazirMi(res)) return undefined;
    const b = req.body || {};
    const iddialar = (Array.isArray(b.iddialar) ? b.iddialar : [])
      .slice(0, 10)
      .filter((i) => i && typeof i.id === 'string' && /^[A-Za-z0-9_]{1,60}$/.test(i.id))
      .map((i) => ({ id: i.id, metin: clip(i.metin, 400) }))
      .filter((i) => i.metin);
    if (iddialar.length === 0) {
      return res.status(400).json({ error: 'Doğrulanacak iddia yok.' });
    }
    const izinliAlanlar = (Array.isArray(b.izinliAlanlar) ? b.izinliAlanlar : [])
      .slice(0, 20)
      .map((d) => clip(d, 120))
      .filter(Boolean);

    const sonuc = await cx.webDogrula({
      module: clip(b.module, 40),
      docType: clip(b.docType, 40) || 'default',
      iddialar,
      izinliAlanlar,
      baglam: baglamCoz(req, b),
    });
    if (!sonuc.ok) {
      return res.status(422).json({ error: 'Doğrulama yapılamadı.', reason: sonuc.reason });
    }
    return res.json({ ok: true, model: cx.MODEL, data: sonuc.data });
  } catch (err) {
    console.error('ai/verify error:', err.message);
    return res.status(502).json({ error: 'Doğrulama yapılamadı: ' + err.message });
  }
});

// ── Batch (anlık olmayan işler, %50 indirim) — yalnız personel ──

// POST /api/ai/extract/batch  body: { module, docType, isler:[{customId, fields, dosyalar}] }
router.post('/extract/batch', aiLimiter, requireAuth, requireStaff, async (req, res) => {
  try {
    if (!aiHazirMi(res)) return undefined;
    const b = req.body || {};
    const module_ = clip(b.module, 40);
    const docType = clip(b.docType, 40) || 'default';
    const isler = (Array.isArray(b.isler) ? b.isler : [])
      .slice(0, 500)
      .filter(
        (j) => j && typeof j.customId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(j.customId)
      )
      .map((j) => ({
        customId: j.customId,
        module: module_,
        docType,
        fields: alanlariTemizle(j.fields),
        dosyalar: dosyalariCoz(j.dosyalar).cozulen,
      }));
    if (isler.length === 0) return res.status(400).json({ error: 'Geçerli iş yok.' });

    const sonuc = await cx.batchGonder(isler);
    if (!sonuc.ok) {
      return res.status(400).json({ error: 'Batch oluşturulamadı.', reason: sonuc.reason });
    }
    return res.json(sonuc);
  } catch (err) {
    console.error('ai/extract/batch error:', err.message);
    return res.status(502).json({ error: 'Batch gönderilemedi: ' + err.message });
  }
});

// GET /api/ai/extract/batch/:id — durum sorgusu
router.get('/extract/batch/:id', statusLimiter, requireAuth, requireStaff, async (req, res) => {
  try {
    if (!aiHazirMi(res)) return undefined;
    return res.json(await cx.batchDurum(req.params.id));
  } catch (err) {
    return res.status(502).json({ error: 'Batch durumu alınamadı: ' + err.message });
  }
});

// POST /api/ai/extract/batch/:id/sonuc
// Sonuçlar HERHANGİ bir sırada gelir; custom_id ile eşleştirilir. Alan listesi
// normalize için gerekli olduğundan gövdede tekrar gönderilir.
// body: { module, docType, alanlar: { <customId>: [fields] } }
router.post('/extract/batch/:id/sonuc', aiLimiter, requireAuth, requireStaff, async (req, res) => {
  try {
    if (!aiHazirMi(res)) return undefined;
    const b = req.body || {};
    const alanlar = {};
    Object.keys(b.alanlar || {})
      .slice(0, 500)
      .forEach((k) => {
        alanlar[k] = alanlariTemizle(b.alanlar[k]);
      });
    const out = await cx.batchSonuc(req.params.id, alanlar, {
      module: clip(b.module, 40),
      docType: clip(b.docType, 40) || 'default',
      studentNoByCustomId: b.ogrenciNolari || {},
      ...baglamCoz(req, b),
    });
    return res.json({ ok: true, sonuclar: out });
  } catch (err) {
    console.error('ai/extract/batch sonuc error:', err.message);
    return res.status(502).json({ error: 'Batch sonuçları alınamadı: ' + err.message });
  }
});

// GET /api/ai/usage?groupBy=student|module|department|day&since=&departmentId=
router.get('/usage', statusLimiter, requireAuth, requireStaff, async (req, res) => {
  try {
    const rapor = await kullanimRaporu({
      groupBy: clip(req.query.groupBy, 20) || 'student',
      since: clip(req.query.since, 40),
      departmentId: clip(req.query.departmentId, 80),
    });
    return res.json({ ok: true, model: cx.MODEL, rapor });
  } catch (err) {
    return res.status(500).json({ error: 'Kullanım raporu alınamadı: ' + err.message });
  }
});

module.exports = router;
