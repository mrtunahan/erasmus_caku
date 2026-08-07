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

// 422 yanıtı istemcide "Belgeden alanlar çıkarılamadı." diye görünüyordu —
// kullanıcıya hiçbir şey söylemeyen bir mesaj. Sebep artık metne dökülüyor.
function aciklamaliSebep(sonuc) {
  const ilkHata = (sonuc.hatalar || []).map((h) => h && h.message).find(Boolean) || '';
  if (/credit balance is too low|insufficient_quota/i.test(ilkHata)) {
    return 'Anthropic hesabında kredi kalmamış.';
  }
  if (/authentication_error|invalid x-api-key/i.test(ilkHata)) return 'API anahtarı geçersiz.';
  if (/rate_limit/i.test(ilkHata)) return 'Model hız sınırına takıldı, birazdan tekrar deneyin.';
  const harita = {
    'no-fields': 'Doldurulacak alan tanımlı değil (şablon eşlemesi yapılmamış olabilir).',
    'too-many-fields': 'Çok fazla alan istendi.',
    'no-readable-document': 'Belge okunamadı (bozuk ya da desteklenmeyen biçim).',
    'parse-failed': 'Model geçerli bir sonuç üretemedi.',
  };
  let metin = harita[sonuc.reason] || ilkHata || sonuc.reason || 'bilinmeyen sebep';
  // Dosya bazlı sebepleri de ekle — "okunamadı" tek başına tanı koydurmuyor.
  const dosyaSebepleri = (sonuc.hatalar || [])
    .filter((h) => h && h.reason && h.reason !== 'api-error')
    .map((h) => (h.name ? h.name + ': ' : '') + h.reason)
    .slice(0, 3);
  if (dosyaSebepleri.length > 0) metin += ' [' + dosyaSebepleri.join(' · ') + ']';
  return metin;
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
        error: 'Belgeden alanlar çıkarılamadı: ' + aciklamaliSebep(sonuc),
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

// POST /api/ai/extract-rows — tablo/liste belgelerinden satır listesi.
// body: { module, docType, satirAlanlari:[{id,label,hint}], satirTanimi, dosyalar[] }
router.post('/extract-rows', extractLimiter, requireAuth, async (req, res) => {
  try {
    if (!aiHazirMi(res)) return undefined;
    const b = req.body || {};
    // Sütun sayısı dar tutulur: her sütun her satırda tekrar ettiği için
    // çıktı token'ını doğrudan çarpar.
    const satirAlanlari = alanlariTemizle(b.satirAlanlari).slice(0, 20);
    if (satirAlanlari.length === 0) {
      return res.status(400).json({ error: 'Sütun tanımı yok.' });
    }

    const { cozulen, bulunamayan } = dosyalariCoz(b.dosyalar);
    if (cozulen.length === 0) {
      return res.status(400).json({ error: 'Okunabilir belge bulunamadı.', bulunamayan });
    }

    const sonuc = await cx.satirCikar({
      module: clip(b.module, 40),
      docType: clip(b.docType, 40) || 'default',
      satirAlanlari,
      satirTanimi: clip(b.satirTanimi, 200),
      dosyalar: cozulen,
      baglam: baglamCoz(req, b),
    });

    if (!sonuc.ok) {
      return res.status(422).json({
        error: 'Belgeden satırlar çıkarılamadı: ' + aciklamaliSebep(sonuc),
        reason: sonuc.reason,
        hatalar: (sonuc.hatalar || []).concat(bulunamayan),
      });
    }
    return res.json({
      ok: true,
      model: cx.MODEL,
      satirlar: sonuc.satirlar,
      hatalar: (sonuc.hatalar || []).concat(bulunamayan),
      onbellek: sonuc.onbellek,
      usage: sonuc.usage,
    });
  } catch (err) {
    console.error('ai/extract-rows error:', err.message);
    return res.status(502).json({ error: 'Satırlar çıkarılamadı: ' + err.message });
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
        error: 'Kıyaslama yapılamadı: ' + aciklamaliSebep(sonuc),
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

// POST /api/ai/ders-eslestir — muafiyet için içerik kapsam değerlendirmesi.
// body: { ciftler: [{ id, alinan:{ad,kod,akts,icerik}, hedef:{...} }] }
router.post('/ders-eslestir', extractLimiter, requireAuth, async (req, res) => {
  try {
    if (!aiHazirMi(res)) return undefined;
    const b = req.body || {};
    const temizDers = (d) => ({
      ad: clip(d && d.ad, 300),
      kod: clip(d && d.kod, 40),
      akts: clip(d && d.akts, 10),
      icerik: clip(d && d.icerik, 8000),
    });
    const ciftler = (Array.isArray(b.ciftler) ? b.ciftler : [])
      .slice(0, 30)
      .filter((c) => c && typeof c.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(c.id))
      .map((c) => ({ id: c.id, alinan: temizDers(c.alinan), hedef: temizDers(c.hedef) }));
    if (ciftler.length === 0)
      return res.status(400).json({ error: 'Kıyaslanacak ders çifti yok.' });

    const sonuc = await cx.icerikKarsilastir({ ciftler, baglam: baglamCoz(req, b) });
    if (!sonuc.ok) {
      return res
        .status(422)
        .json({ error: 'Ders içerikleri kıyaslanamadı.', reason: sonuc.reason });
    }
    return res.json({ ok: true, model: cx.MODEL, data: sonuc.data });
  } catch (err) {
    console.error('ai/ders-eslestir error:', err.message);
    return res.status(502).json({ error: 'Kıyaslanamadı: ' + err.message });
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

// Sunucu aracı hata kodlarının Türkçe karşılığı. Kodun kendisi ("url_not_
// accessible") kullanıcıya hiçbir şey söylemiyor; ne yapması gerektiğini
// anlatan bir cümleye çevrilir.
const TABAN_HATA_METNI = {
  url_not_accessible: 'adres açılamadı (site isteği reddetti ya da sayfa yok)',
  url_not_allowed: 'adrese erişim izni yok (robots.txt ya da alan adı kısıtı)',
  url_not_in_prior_context: 'bu bağlantı sayfada/aramada geçmediği için getirilemedi',
  url_too_long: 'adres çok uzun',
  invalid_tool_input: 'adres biçimi geçersiz',
  unsupported_content_type: 'içerik türü desteklenmiyor (yalnız HTML ve PDF okunabilir)',
  max_uses_exceeded: 'sayfa getirme sınırı aşıldı',
  too_many_requests: 'kaynak site hız sınırı uyguladı',
  unavailable: 'geçici bir hata oluştu',
};

// İstemcide listelenecek deneme dökümü.
function tabanDenemeleri(getirmeler) {
  return (Array.isArray(getirmeler) ? getirmeler : []).slice(0, 12).map((g) => ({
    arac: g.arac,
    url: g.url,
    ok: !!g.ok,
    hata: g.hata ? TABAN_HATA_METNI[g.hata] || g.hata : '',
  }));
}

// Tek satırlık özet — hata mesajının sonuna eklenir.
function tabanDenemeOzeti(getirmeler) {
  const liste = Array.isArray(getirmeler) ? getirmeler : [];
  if (liste.length === 0) return 'hiçbir sayfa getirilemedi';
  const hatalar = Array.from(new Set(liste.filter((g) => !g.ok).map((g) => g.hata)));
  if (hatalar.length === 0) return '';
  return hatalar
    .map((k) => TABAN_HATA_METNI[k] || k)
    .slice(0, 3)
    .join(' · ');
}

// ══════════════════════════════════════════════════════════════
// TABAN PUAN — ARKA PLAN İŞİ
//
// ⚠ NEDEN SENKRON DEĞİL: bu çağrı bir web sayfası + yüz sayfalık bir PDF
// okuyor; dakikalarca sürebiliyor. nginx'in /api/ bloğunda proxy_read_timeout
// tanımlı değil, yani 60 saniyelik varsayılan geçerli — istek 504 ile
// kopuyordu. Üstelik iş arkada tamamlanıp sonucu HİÇBİR YERE yazılmadığı için
// harcanan model çağrısı da çöpe gidiyordu.
//
// Timeout'u büyütmek yanlış çözüm olurdu: bir HTTP bağlantısını dakikalarca
// açık tutmak, sekme kapanınca ya da ağ düşünce işi yine kaybettirir. Doğru
// çözüm işi kayda bağlamak: uç işi başlatıp 202 döner, sonuç `taban_puanlar`
// kaydına yazılır, istemci kaydı yoklar. Sekme kapansa bile sonuç durur.
// ══════════════════════════════════════════════════════════════
const { getDbSafe } = require('../config/database');
const TABAN_KOLEKSIYON = 'taban_puanlar';

// Kapsam anahtarı — istemcideki tabanKapsamAnahtari ile AYNI olmak zorunda.
function tabanDocId(departmentId, modul) {
  return String(departmentId || 'genel') + ':' + String(modul || 'genel');
}

// Kaydı generic yazma API'siyle aynı biçimde günceller (_docId ile upsert).
async function tabanKaydiYaz(docId, patch) {
  const db = await getDbSafe();
  if (!db) return;
  await db
    .collection(TABAN_KOLEKSIYON)
    .updateOne(
      { _docId: docId },
      { $set: { _docId: docId, ...patch, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
}

function tabanHataMesaji(sonuc) {
  const harita = {
    'bad-url': sonuc.mesaj || 'Adres geçersiz.',
    'no-programs': 'Taban puanı aranacak program yok.',
    'parse-failed': 'Sayfa okundu ama taban puan tablosu çıkarılamadı.',
  };
  let mesaj = harita[sonuc.reason] || sonuc.reason || 'bilinmeyen sebep';
  const ek = tabanDenemeOzeti(sonuc.getirmeler);
  if (ek) mesaj += ' [' + ek + ']';
  return mesaj;
}

// POST /api/ai/taban-puan — işi BAŞLATIR (202) ve hemen döner.
//
// Yalnız personel: adres serbest metindir ve sunucu bu adrese (dolaylı olarak,
// model üzerinden) gider. Öğrenciye açık olsaydı, sisteme rastgele adres
// getirten bir uç açılmış olurdu.
//
// body: { url, programlar:[{id,ad,puanTuru}], yil, puanTuru, module, docType }
router.post('/taban-puan', extractLimiter, requireAuth, requireStaff, async (req, res) => {
  try {
    if (!aiHazirMi(res)) return undefined;
    const b = req.body || {};
    const programlar = (Array.isArray(b.programlar) ? b.programlar : [])
      .slice(0, 25)
      .filter((p) => p && typeof p.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(p.id))
      .map((p) => ({
        id: p.id,
        ad: clip(p.ad, 200),
        puanTuru: clip(p.puanTuru, 40),
      }))
      .filter((p) => p.ad);
    if (programlar.length === 0) {
      return res.status(400).json({ error: 'Taban puanı aranacak program yok.' });
    }

    const baglam = baglamCoz(req, b);
    const modul = clip(b.module, 40);
    const url = clip(b.url, 300);
    const yil = clip(b.yil, 20);
    const docId = tabanDocId(baglam.departmentId, modul);

    // İşi kayda "çalışıyor" diye yaz — istemci bunu yoklayacak.
    await tabanKaydiYaz(docId, {
      durum: 'calisiyor',
      url,
      yil,
      modul,
      departmentId: baglam.departmentId || '',
      baslangicZamani: new Date().toISOString(),
      okuyan: String(b.okuyan || baglam.actorName || ''),
      hataMesaji: '',
      denemeler: [],
    });

    // Cevap ÖNCE gider; iş arkada sürer.
    res.status(202).json({ ok: true, durum: 'calisiyor', docId });

    // Arka plan — buradan sonrası isteğe bağlı değil, kayda yazılır.
    // Reddedilen promise süreci düşürmesin diye tümü sarılı.
    (async () => {
      try {
        const sonuc = await cx.tabanPuanBul({
          url,
          programlar,
          yil,
          puanTuru: clip(b.puanTuru, 60),
          module: modul,
          docType: clip(b.docType, 40) || 'default',
          baglam,
        });

        if (!sonuc.ok) {
          await tabanKaydiYaz(docId, {
            durum: 'hata',
            hataMesaji: tabanHataMesaji(sonuc),
            denemeler: tabanDenemeleri(sonuc.getirmeler),
            // Başarısız çalıştırma da para harcar; gizlemek maliyeti
            // olduğundan düşük gösterirdi.
            maliyetUsd: sonuc.maliyetUsd || 0,
            bitisZamani: new Date().toISOString(),
          });
          return;
        }

        const okunan = programlar.map((p) => {
          const g = (sonuc.data || {})[p.id] || {};
          return {
            id: p.id,
            ad: p.ad,
            taban: g.taban || '',
            puanTuru: g.puanTuru || '',
            yil: g.yil || '',
            kaynak: g.kaynak || '',
            guven: g.guven || 0,
            aciklama: g.aciklama || '',
          };
        });
        await tabanKaydiYaz(docId, {
          durum: 'bitti',
          programlar: okunan,
          denemeler: tabanDenemeleri(sonuc.getirmeler),
          kullanilanModel: sonuc.model || '',
          maliyetUsd: sonuc.maliyetUsd || 0,
          tokenOzeti: sonuc.tokenOzeti || null,
          url: sonuc.url || url,
          hataMesaji: '',
          okunmaZamani: new Date().toISOString(),
          bitisZamani: new Date().toISOString(),
        });
      } catch (err) {
        console.error('ai/taban-puan arka plan hatası:', err.message);
        await tabanKaydiYaz(docId, {
          durum: 'hata',
          hataMesaji: 'Taban puanlar okunamadı: ' + err.message,
          bitisZamani: new Date().toISOString(),
        }).catch(() => {});
      }
    })().catch(() => {});
    return undefined;
  } catch (err) {
    console.error('ai/taban-puan error:', err.message);
    return res.status(502).json({ error: 'Taban puan işi başlatılamadı: ' + err.message });
  }
});

// GET /api/ai/taban-puan/:docId — iş durumu (istemci bunu yoklar).
// Yoklama ucuz olmalı; statusLimiter yeterli.
router.get('/taban-puan/:docId', statusLimiter, requireAuth, requireStaff, async (req, res) => {
  try {
    const db = await getDbSafe();
    if (!db) return res.status(503).json({ error: 'Veritabanına ulaşılamıyor.' });
    const d = await db
      .collection(TABAN_KOLEKSIYON)
      .findOne({ _docId: String(req.params.docId || '').slice(0, 200) });
    if (!d) return res.json({ ok: true, durum: 'yok' });
    return res.json({
      ok: true,
      durum: d.durum || 'bitti',
      programlar: Array.isArray(d.programlar) ? d.programlar : [],
      denemeler: Array.isArray(d.denemeler) ? d.denemeler : [],
      hataMesaji: d.hataMesaji || '',
      url: d.url || '',
      yil: d.yil || '',
      okunmaZamani: d.okunmaZamani || '',
      baslangicZamani: d.baslangicZamani || '',
      okuyan: d.okuyan || '',
      kullanilanModel: d.kullanilanModel || '',
      maliyetUsd: d.maliyetUsd || 0,
      tokenOzeti: d.tokenOzeti || null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Durum alınamadı: ' + err.message });
  }
});

// POST /api/ai/not-tablosu — kurumun sayfasından not dönüşüm tablosunu oku.
//
// Yalnız personel: tablo o kurumdan gelen BÜTÜN öğrencilere uygulanacak.
// Sonuç doğrudan kaydedilmez — akademisyen görüp onaylar (istemci yönetir).
// body: { url, kurumAdi }
router.post('/not-tablosu', extractLimiter, requireAuth, requireStaff, async (req, res) => {
  try {
    if (!aiHazirMi(res)) return undefined;
    const b = req.body || {};
    const sonuc = await cx.notTablosuBul({
      url: clip(b.url, 300),
      kurumAdi: clip(b.kurumAdi, 200),
      module: 'muafiyet',
      docType: 'intibak',
      baglam: baglamCoz(req, b),
    });

    if (!sonuc.ok) {
      const harita = {
        'bad-url': sonuc.mesaj || 'Adres geçersiz.',
        'parse-failed': 'Sayfa okundu ama not dönüşüm tablosu çıkarılamadı.',
      };
      let mesaj = harita[sonuc.reason] || sonuc.reason || 'bilinmeyen sebep';
      const ek = tabanDenemeOzeti(sonuc.getirmeler);
      if (ek) mesaj += ' [' + ek + ']';
      return res.status(422).json({
        error: mesaj,
        reason: sonuc.reason,
        denemeler: tabanDenemeleri(sonuc.getirmeler),
      });
    }

    return res.json({
      ok: true,
      model: sonuc.model,
      url: sonuc.url,
      tablo: sonuc.tablo,
      denemeler: tabanDenemeleri(sonuc.getirmeler),
      maliyetUsd: sonuc.maliyetUsd || 0,
    });
  } catch (err) {
    console.error('ai/not-tablosu error:', err.message);
    return res.status(502).json({ error: 'Not dönüşüm tablosu okunamadı: ' + err.message });
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

// GET /api/ai/ozet — yönetim paneli için tek çağrılık durum + maliyet özeti.
router.get('/ozet', statusLimiter, requireAuth, requireStaff, async (req, res) => {
  try {
    const [onek, gunluk, modulBazli] = await Promise.all([
      cx.yapilandirildiMi() ? cx.onekTokenSayisi() : Promise.resolve(null),
      kullanimRaporu({ groupBy: 'day' }),
      kullanimRaporu({ groupBy: 'module' }),
    ]);
    const toplam = gunluk.reduce(
      (a, g) => ({
        cagri: a.cagri + (g.cagri || 0),
        costUsd: a.costUsd + (g.costUsd || 0),
        hataliCagri: a.hataliCagri + (g.hataliCagri || 0),
      }),
      { cagri: 0, costUsd: 0, hataliCagri: 0 }
    );
    return res.json({
      ok: true,
      model: cx.MODEL,
      configured: cx.yapilandirildiMi(),
      onek,
      toplam,
      gunluk: gunluk.slice(0, 30),
      modulBazli,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Özet alınamadı: ' + err.message });
  }
});

// GET /api/ai/usage?groupBy=student|module|department|day&since=&departmentId=
router.get('/usage', statusLimiter, requireAuth, requireStaff, async (req, res) => {
  try {
    const rapor = await kullanimRaporu({
      groupBy: clip(req.query.groupBy, 20) || 'student',
      since: clip(req.query.since, 40),
      departmentId: clip(req.query.departmentId, 80),
      endpoint: clip(req.query.endpoint, 40),
    });
    return res.json({ ok: true, model: cx.MODEL, rapor });
  } catch (err) {
    return res.status(500).json({ error: 'Kullanım raporu alınamadı: ' + err.message });
  }
});

module.exports = router;
