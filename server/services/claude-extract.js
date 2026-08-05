// ══════════════════════════════════════════════════════════════
// Belge işleme — TEK extraction service katmanı.
//
// Sistemdeki tüm modüller (erasmus, yatay geçiş, dikey geçiş, ders muafiyet,
// çap/yandal, benim sayfam …) buradan geçer. Modüle özel hiçbir mantık burada
// DEĞİLDİR: çağıran taraf "hangi alanlar doldurulacak" listesini verir, bu
// katman belgeleri okur ve alanları doldurup katı JSON döner.
//
// Model tektir ve sabittir: claude-haiku-4-5-20251001 (200K bağlam).
// Anahtar .env → ANTHROPIC_API_KEY. temperature: 0.
//
// ── Prompt önbelleği hakkında kritik not ──────────────────────
// Haiku 4.5'te önbelleğe alınabilir en küçük önek 4096 token'dır. Bunun
// altındaki önekler HATA VERMEZ, sessizce önbelleğe alınmaz. Bu yüzden
// sabit blok (talimat + şablon few-shot örnekleri) `cache_control` ile
// işaretlenir ve her yanıtta okunan/yazılan önbellek token'ı raporlanır —
// eşiğin altında kalıp kalmadığımız ölçülebilir olsun diye.
//
// Önbellek önek eşleşmesidir: sabit blokta zaman damgası/UUID/rastgele sıra
// OLMAMALIDIR. Bu yüzden few-shot bloğu deterministik sıralanır ve süreç
// içinde bellekte tutulur.
// ══════════════════════════════════════════════════════════════
const AnthropicPkg = require('@anthropic-ai/sdk');
const Anthropic = AnthropicPkg.Anthropic || AnthropicPkg.default || AnthropicPkg;
const { getDbSafe } = require('../config/database');
const { istekGruplari } = require('./doc-text');
const { kullanimKaydet } = require('./ai-usage');

const MODEL = 'claude-haiku-4-5-20251001';
const TEMPERATURE = 0;
// Bu modelde önbelleğe alınabilen en küçük önek. Altında sessizce önbellek yok.
const CACHE_MIN_TOKENS = 4096;
const ISTEK_TIMEOUT_MS = 120000;

let _client = null;
function client() {
  const key = process.env.ANTHROPIC_API_KEY || '';
  if (!key) throw new Error('ANTHROPIC_API_KEY tanımlı değil.');
  if (!_client) _client = new Anthropic({ apiKey: key, timeout: ISTEK_TIMEOUT_MS, maxRetries: 2 });
  return _client;
}

function yapilandirildiMi() {
  return !!process.env.ANTHROPIC_API_KEY;
}

// ── Sabit talimat bloğu ───────────────────────────────────────
// Türkçe belgelerden alan çıkarımına özgü kurallar. Değişmez — önbelleğin
// ilk parçası budur.
const TALIMAT = `Sen bir Türk üniversitesinin öğrenci işleri belge işleme asistanısın.
Görevin: sana verilen resmî belgelerden (transkript, sonuç belgesi, diploma,
onay yazısı, ders çizelgesi vb.) istenen alanları birebir okuyup çıkarmaktır.

Kurallar:
1. Yalnızca belgede AÇIKÇA yazan bilgiyi çıkar. Tahmin etme, hesaplama yapma,
   eksik bilgiyi tamamlama. Belgede yoksa değer boş string ("") olmalıdır.
2. Değerleri belgedeki YAZIMIYLA döndür. Sayıları yeniden biçimlendirme:
   belgede "3,42" yazıyorsa "3,42" döndür, "3.42" değil.
3. Kişi ve kurum adlarını belgedeki büyük/küçük harf düzeniyle döndür.
   Türkçe karakterleri koru (İ, ı, Ş, ş, Ğ, ğ, Ü, ü, Ö, ö, Ç, ç).
4. Tarihleri belgedeki biçimde bırak (gg.aa.yyyy ise öyle).
5. Bir alan için belgede birden çok aday varsa, alanın açıklamasına en uygun
   olanı seç ve "kaynak" alanında hangi bölümden aldığını kısaca yaz.
6. "guven" alanı 0 ile 1 arasında bir sayıdır:
   1.0 = değer belgede birebir ve tek anlamlı yazıyor
   0.5 = değer belgeden çıkarılabiliyor ama yorum gerektirdi
   0.0 = değer belgede bulunamadı (bu durumda "deger" boş string olmalı)
7. Asla JSON dışında metin, açıklama veya markdown kod bloğu üretme.

Bu çıktı bir insan tarafından onaylanmadan hiçbir yere kaydedilmez; şüphede
kaldığında düşük güven ver ve boş bırak — yanlış doldurmaktansa boş bırak.`;

// ── Few-shot bloğu: sistemdeki gerçek çıktı şablonları ────────
// Şablon = alan/yer tutucu listesi. Doldurulmuş örnek = personelin küratörlüğünü
// yaptığı `ai_ornekler` kayıtları (yoksa blok yalnız şablonu içerir).
const _onekCache = new Map();
const ONEK_TTL_MS = 10 * 60 * 1000;

function trSirala(a, b) {
  return String(a).localeCompare(String(b), 'tr');
}

async function fewShotBlogu(db, module_, docType) {
  const parcalar = [];

  // 1) Şablon alanları — document_templates içindeki eşlenmiş yer tutucular.
  let sablonlar = [];
  try {
    sablonlar = await db
      .collection('document_templates')
      .find({ module: module_, docType: docType || 'default', isActive: { $ne: false } })
      .limit(3)
      .toArray();
  } catch (_) {
    sablonlar = [];
  }

  const alanSatirlari = [];
  sablonlar.forEach((t) => {
    (Array.isArray(t.fields) ? t.fields : []).forEach((f) => {
      if (!f || !f.token) return;
      const degisken = f.variable ? String(f.variable) : '';
      alanSatirlari.push('- ' + String(f.token) + (degisken ? '  →  ' + degisken : ''));
    });
  });
  // Tekilleştir + deterministik sırala (önbellek bayt kararlılığı için şart).
  const tekil = Array.from(new Set(alanSatirlari)).sort(trSirala);
  if (tekil.length > 0) {
    parcalar.push(
      'Bu modülde üretilen resmî çıktı şablonunun alanları aşağıdadır. ' +
        'Çıkardığın değerler bu şablonu doldurmak için kullanılacaktır:\n\n' +
        tekil.slice(0, 120).join('\n')
    );
  }

  // 2) Doldurulmuş örnekler — personelin onayladığı 1-2 gerçek örnek.
  let ornekler = [];
  try {
    ornekler = await db
      .collection('ai_ornekler')
      .find({ module: module_, docType: docType || 'default', aktif: { $ne: false } })
      .sort({ sira: 1, _id: 1 })
      .limit(2)
      .toArray();
  } catch (_) {
    ornekler = [];
  }

  ornekler.forEach((o, i) => {
    const belge = String(o.belgeMetni || '').slice(0, 4000);
    let cikti = '';
    try {
      cikti = JSON.stringify(o.cikti || {}, Object.keys(o.cikti || {}).sort(trSirala), 2);
    } catch (_) {
      cikti = '{}';
    }
    parcalar.push(
      'ÖRNEK ' + (i + 1) + '\n--- Belge metni ---\n' + belge + '\n--- Beklenen çıktı ---\n' + cikti
    );
  });

  return parcalar.join('\n\n══════════════════════\n\n');
}

/**
 * Önbelleğe alınacak sabit sistem bloklarını üretir.
 * Sonuç süreç içinde memoize edilir; aynı (module, docType) için bayt bayt
 * aynı metin döner — prompt önbelleğinin ön koşulu budur.
 */
async function sistemBloklari(module_, docType) {
  const anahtar = String(module_ || '') + '|' + String(docType || 'default');
  const simdi = Date.now();
  const hit = _onekCache.get(anahtar);
  if (hit && simdi - hit.t < ONEK_TTL_MS) return hit.v;

  let fewShot = '';
  try {
    const db = await getDbSafe();
    if (db) fewShot = await fewShotBlogu(db, module_, docType || 'default');
  } catch (_) {
    fewShot = '';
  }

  const bloklar = [{ type: 'text', text: TALIMAT }];
  if (fewShot) bloklar.push({ type: 'text', text: fewShot });
  // Breakpoint SON blokta: talimat + few-shot birlikte önbelleğe alınır.
  bloklar[bloklar.length - 1].cache_control = { type: 'ephemeral' };

  _onekCache.set(anahtar, { t: simdi, v: bloklar });
  return bloklar;
}

// Sabit öneğin token sayısı — önbellek eşiğinin altında mı üstünde mi
// olduğunu göstermek için. countTokens ücretsizdir ama yine de saatte bir
// ölçülür; yönetim ekranı her açılışta API'yi meşgul etmesin.
let _onekOlcum = null;
async function onekTokenSayisi(module_, docType) {
  const simdi = Date.now();
  if (_onekOlcum && simdi - _onekOlcum.t < 60 * 60 * 1000) return _onekOlcum.v;
  try {
    const c = client();
    const sistem = await sistemBloklari(module_ || 'yataygecis', docType || 'kurumici');
    const bos = await c.messages.countTokens({
      model: MODEL,
      messages: [{ role: 'user', content: 'x' }],
    });
    const dolu = await c.messages.countTokens({
      model: MODEL,
      system: sistem,
      messages: [{ role: 'user', content: 'x' }],
    });
    const token = Math.max(0, dolu.input_tokens - bos.input_tokens);
    _onekOlcum = {
      t: simdi,
      v: { token, esik: CACHE_MIN_TOKENS, aktif: token >= CACHE_MIN_TOKENS },
    };
    return _onekOlcum.v;
  } catch (e) {
    return {
      token: 0,
      esik: CACHE_MIN_TOKENS,
      aktif: false,
      hata: (e && e.message) || 'ölçülemedi',
    };
  }
}

function onekOnbelleginiTemizle(module_, docType) {
  if (!module_) return _onekCache.clear();
  _onekCache.delete(String(module_) + '|' + String(docType || 'default'));
}

// ── Katı JSON şeması ──────────────────────────────────────────
// Yapılandırılmış çıktı (output_config.format) sayısal/uzunluk kısıtlarını
// desteklemez; guven aralığı sunucu tarafında kırpılır.
function semaUret(fields) {
  const properties = {};
  const required = [];
  fields.forEach((f) => {
    properties[f.id] = {
      type: 'object',
      properties: {
        deger: { type: 'string' },
        guven: { type: 'number' },
        kaynak: { type: 'string' },
      },
      required: ['deger', 'guven', 'kaynak'],
      additionalProperties: false,
    };
    required.push(f.id);
  });
  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  };
}

function alanListesiMetni(fields) {
  return fields
    .map((f) => {
      const ipucu = f.hint ? ' — ' + f.hint : '';
      const bicim = f.format ? ' [biçim: ' + f.format + ']' : '';
      return '- ' + f.id + ': ' + (f.label || f.id) + ipucu + bicim;
    })
    .join('\n');
}

function jsonAyikla(metin) {
  const s = String(metin || '').trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch (_) {
    /* aşağıda kod bloğu / gövde içinden dene */
  }
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      return JSON.parse(fence[1]);
    } catch (_) {
      /* devam */
    }
  }
  const ilk = s.indexOf('{');
  const son = s.lastIndexOf('}');
  if (ilk >= 0 && son > ilk) {
    try {
      return JSON.parse(s.slice(ilk, son + 1));
    } catch (_) {
      /* devam */
    }
  }
  return null;
}

function yanitMetni(resp) {
  return (resp.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text || '')
    .join('')
    .trim();
}

function guvenKirp(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function sonucuNormalize(ham, fields) {
  const out = {};
  fields.forEach((f) => {
    const g = ham && typeof ham === 'object' ? ham[f.id] : null;
    out[f.id] = {
      deger: g && typeof g.deger === 'string' ? g.deger.trim() : '',
      guven: g ? guvenKirp(g.guven) : 0,
      kaynak: g && typeof g.kaynak === 'string' ? g.kaynak.slice(0, 200) : '',
    };
    if (!out[f.id].deger) out[f.id].guven = 0;
  });
  return out;
}

// Parça sonuçlarını birleştir: her alan için en yüksek güvenli dolu değer.
function sonuclariBirlestir(parcalar, fields) {
  const out = {};
  fields.forEach((f) => {
    let en = { deger: '', guven: 0, kaynak: '' };
    parcalar.forEach((p) => {
      const c = p && p[f.id];
      if (c && c.deger && c.guven > en.guven) en = c;
    });
    out[f.id] = en;
  });
  return out;
}

function maxTokenHesapla(fields) {
  return Math.max(1024, Math.min(8192, fields.length * 120 + 512));
}

/**
 * Tek model çağrısı + parse hatasında 1 kez yeniden deneme.
 * Yeniden deneme, kesilme (max_tokens) ihtimaline karşı bütçeyi büyütür ve
 * yapılandırılmış çıktıyı bırakıp düz JSON ister — iki farklı başarısızlık
 * sebebini de kapsar.
 */
async function cagirVeAyristir({ sistem, icerik, sema, maxTokens }) {
  const c = client();
  const istek = {
    model: MODEL,
    max_tokens: maxTokens,
    temperature: TEMPERATURE,
    system: sistem,
    messages: [{ role: 'user', content: icerik }],
    output_config: { format: { type: 'json_schema', schema: sema } },
  };

  let resp = await c.messages.create(istek);
  let veri = jsonAyikla(yanitMetni(resp));
  const usages = [resp.usage];

  if (!veri) {
    const resp2 = await c.messages.create({
      ...istek,
      max_tokens: Math.min(16000, maxTokens * 2),
      output_config: undefined,
      messages: [
        {
          role: 'user',
          content: [
            ...icerik,
            {
              type: 'text',
              text: 'Yanıtını YALNIZCA geçerli tek bir JSON nesnesi olarak ver. Başka hiçbir metin yazma.',
            },
          ],
        },
      ],
    });
    usages.push(resp2.usage);
    veri = jsonAyikla(yanitMetni(resp2));
    resp = resp2;
  }

  return { veri, usages, stopReason: resp.stop_reason };
}

/**
 * ALAN ÇIKARIMI — ana giriş noktası.
 *
 * @param {object} opt
 * @param {string} opt.module      Modül kimliği (yataygecis, muafiyet, erasmus…)
 * @param {string} opt.docType     Alt tür (kurumici, intibak, gidis…)
 * @param {Array<{id:string,label:string,hint?:string,format?:string}>} opt.fields
 * @param {Array<{path?:string,buffer?:Buffer,name:string}>} opt.dosyalar
 * @param {object} opt.baglam      { studentNo, departmentId, actorId, actorName }
 * @returns {Promise<{ok:boolean, data?:object, hatalar:Array, onbellek:object, usage:object}>}
 */
async function alanCikar(opt) {
  const fields = (Array.isArray(opt.fields) ? opt.fields : []).filter((f) => f && f.id);
  if (fields.length === 0) return { ok: false, reason: 'no-fields', hatalar: [] };
  if (fields.length > 80) return { ok: false, reason: 'too-many-fields', hatalar: [] };

  const { gruplar, hatalar } = await istekGruplari(opt.dosyalar || []);
  if (gruplar.length === 0) {
    return { ok: false, reason: 'no-readable-document', hatalar };
  }

  const sistem = await sistemBloklari(opt.module, opt.docType);
  const sema = semaUret(fields);
  const maxTokens = maxTokenHesapla(fields);
  const alanMetni =
    'Aşağıdaki belgelerden şu alanları çıkar:\n\n' +
    alanListesiMetni(fields) +
    '\n\nHer alan için { "deger", "guven", "kaynak" } üret.';

  const toplam = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };
  const parcaSonuclari = [];
  const baglam = opt.baglam || {};

  for (const grup of gruplar) {
    const icerik = [{ type: 'text', text: alanMetni }, ...grup];
    let sonuc;
    try {
      sonuc = await cagirVeAyristir({ sistem, icerik, sema, maxTokens });
    } catch (e) {
      hatalar.push({ reason: 'api-error', message: e && e.message });
      await kullanimKaydet({
        module: opt.module,
        docType: opt.docType,
        endpoint: 'extract',
        model: MODEL,
        ...baglam,
        usage: {},
        ok: false,
        hata: e && e.message,
      });
      continue;
    }

    sonuc.usages.forEach((u) => {
      if (!u) return;
      toplam.input_tokens += u.input_tokens || 0;
      toplam.output_tokens += u.output_tokens || 0;
      toplam.cache_creation_input_tokens += u.cache_creation_input_tokens || 0;
      toplam.cache_read_input_tokens += u.cache_read_input_tokens || 0;
    });

    for (const u of sonuc.usages) {
      await kullanimKaydet({
        module: opt.module,
        docType: opt.docType,
        endpoint: 'extract',
        model: MODEL,
        ...baglam,
        usage: u,
        ok: !!sonuc.veri,
      });
    }

    if (sonuc.veri) parcaSonuclari.push(sonucuNormalize(sonuc.veri, fields));
    else hatalar.push({ reason: 'parse-failed', stopReason: sonuc.stopReason });
  }

  if (parcaSonuclari.length === 0) {
    return { ok: false, reason: 'parse-failed', hatalar, usage: toplam };
  }

  return {
    ok: true,
    data: sonuclariBirlestir(parcaSonuclari, fields),
    hatalar,
    usage: toplam,
    onbellek: {
      yazilan: toplam.cache_creation_input_tokens,
      okunan: toplam.cache_read_input_tokens,
      // Hiç yazılmadıysa ve hiç okunmadıysa sabit blok 4096 token eşiğinin
      // altında kalmış demektir. Bu bir sorun DEĞİLDİR: ölçüldüğünde önek
      // 848 token çıktı ve eşiği aşmak için prompt şişirmek başabaş
      // hesabında (5 dk penceresinde 12+ çağrı) net zarar. Ayrıntı:
      // docs/ai-belge-isleme.md → Prompt önbelleği.
      minimumAltinda:
        toplam.cache_creation_input_tokens === 0 && toplam.cache_read_input_tokens === 0,
      esik: CACHE_MIN_TOKENS,
    },
  };
}

// ══════════════════════════════════════════════════════════════
// KIYASLAMA — belgedeki değer ile formdaki/sistemdeki değeri karşılaştırır.
//
// Kullanım yeri: öğrenci beyanını yüklediği belgeyle denetlemek
// (ör. formda "AGNO 78,45" yazıyor, transkriptte kaç?).
//
// Karar iki aşamalıdır ve model son söz sahibi DEĞİLDİR:
//   1) Model belgedeki değeri okur ve bir kanaat verir.
//   2) Sunucu normalize edip kendi kararını verir; normalize eşitse
//      "ayni" ZORLANIR. Böylece "3,42" ↔ "3.42" ya da
//      "BİLGİSAYAR MÜH." ↔ "Bilgisayar Mühendisliği" gibi biçim farkları
//      sahte uyuşmazlık üretmez.
// Model yalnız normalize eşitliğin yakalayamadığı anlamsal durumlarda
// (kısaltma, farklı sözcük düzeni) belirleyici olur.
// ══════════════════════════════════════════════════════════════
const KIYAS_DURUMLARI = ['ayni', 'farkli', 'belgede_yok', 'formda_bos'];

// Türkçe duyarlı normalize: küçük harf, noktalama/boşluk at, ondalık
// ayıracını birleştir, yaygın kısaltmaları aç.
const KISALTMALAR = [
  [/\bmuh\b/g, 'muhendisligi'],
  [/\bmuhendislik\b/g, 'muhendisligi'],
  [/\bfak\b/g, 'fakultesi'],
  [/\bfakulte\b/g, 'fakultesi'],
  [/\buniv\b/g, 'universitesi'],
  [/\buniversite\b/g, 'universitesi'],
  [/\bbol\b/g, 'bolumu'],
  [/\bbolum\b/g, 'bolumu'],
];

function kiyasNormalize(v) {
  let s = String(v == null ? '' : v).toLocaleLowerCase('tr-TR');
  // Türkçe harfleri ASCII'ye indir — kısaltma kuralları tek biçim üzerinde çalışsın.
  s = s
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
  // Sayısal değerler: "3,42" ile "3.42" aynı sayıdır. Türkçe belgelerde
  // ondalık ayıracı virgül, ama sistemde/formda nokta da girilebiliyor.
  // Kural:
  //   • iki ayıraç da varsa → SONUNCUSU ondalık, diğeri binlik
  //   • tek ayıraç bir kez geçiyorsa → ondalık kabul edilir
  //     (not/puan değerlerinde binlik ayıraç pratikte yok)
  //   • tek ayıraç birden çok geçiyorsa → binlik, hepsi atılır
  if (/^[\s\d.,]+$/.test(s) && /\d/.test(s)) {
    let t = s.replace(/\s/g, '');
    const nokta = (t.match(/\./g) || []).length;
    const virgul = (t.match(/,/g) || []).length;
    if (nokta && virgul) {
      const ondalik = t.lastIndexOf('.') > t.lastIndexOf(',') ? '.' : ',';
      const binlik = ondalik === '.' ? ',' : '.';
      t = t.split(binlik).join('').replace(ondalik, '.');
    } else if (nokta + virgul === 1) {
      t = t.replace(',', '.');
    } else {
      t = t.replace(/[.,]/g, '');
    }
    const n = Number(t);
    if (Number.isFinite(n)) return String(n);
  }
  s = s.replace(/[^a-z0-9]+/g, ' ').trim();
  KISALTMALAR.forEach(([re, ile]) => {
    s = s.replace(re, ile);
  });
  return s.replace(/\s+/g, ' ').trim();
}

function kiyasSemasi(fields) {
  const properties = {};
  const required = [];
  fields.forEach((f) => {
    properties[f.id] = {
      type: 'object',
      properties: {
        belgeDeger: { type: 'string' },
        durum: { type: 'string', enum: KIYAS_DURUMLARI },
        aciklama: { type: 'string' },
        guven: { type: 'number' },
      },
      required: ['belgeDeger', 'durum', 'aciklama', 'guven'],
      additionalProperties: false,
    };
    required.push(f.id);
  });
  return { type: 'object', properties, required, additionalProperties: false };
}

const KIYAS_TALIMATI = `Şimdi ÇIKARIM DEĞİL KIYASLAMA yapacaksın.

Her alan için aşağıda hem alanın açıklaması hem de FORMDA GİRİLMİŞ değer var.
Görevin, belgede o alana karşılık gelen değeri bulmak ve formdaki değerle
karşılaştırmaktır.

"durum" değerleri:
- "ayni"        : belgedeki değer ile formdaki değer aynı bilgiyi gösteriyor
                  (yazım/biçim farkı — noktalama, kısaltma, büyük-küçük harf,
                  ondalık ayıracı — FARK SAYILMAZ)
- "farkli"      : belgedeki değer formdakinden gerçekten farklı bir bilgi
- "belgede_yok" : bu alana karşılık gelen bilgi belgede bulunamadı
- "formda_bos"  : formda değer girilmemiş

"aciklama" tek cümle, Türkçe, farkın ne olduğunu söyler. Aynıysa boş bırak.
Emin değilsen "farkli" deme; düşük güvenle "belgede_yok" de.`;

/**
 * @param {object} opt
 * @param {string} opt.module
 * @param {string} opt.docType
 * @param {Array<{id,label,hint?,format?}>} opt.fields
 * @param {Object<string,string>} opt.mevcutDegerler  formdaki değerler
 * @param {Array} opt.dosyalar
 */
async function karsilastir(opt) {
  const fields = (Array.isArray(opt.fields) ? opt.fields : []).filter((f) => f && f.id);
  if (fields.length === 0) return { ok: false, reason: 'no-fields', hatalar: [] };
  if (fields.length > 80) return { ok: false, reason: 'too-many-fields', hatalar: [] };

  const { gruplar, hatalar } = await istekGruplari(opt.dosyalar || []);
  if (gruplar.length === 0) return { ok: false, reason: 'no-readable-document', hatalar };

  const mevcut = opt.mevcutDegerler || {};
  // Sistem blokları alanCikar ile AYNI — önbellek öneki paylaşılır, kıyaslama
  // talimatı kullanıcı mesajına konur ki önek bozulmasın.
  const sistem = await sistemBloklari(opt.module, opt.docType);
  const sema = kiyasSemasi(fields);
  const maxTokens = Math.max(1024, Math.min(8192, fields.length * 160 + 512));

  const alanMetni =
    KIYAS_TALIMATI +
    '\n\nKarşılaştırılacak alanlar:\n\n' +
    fields
      .map((f) => {
        const v = String(mevcut[f.id] == null ? '' : mevcut[f.id]).trim();
        return (
          '- ' +
          f.id +
          ': ' +
          (f.label || f.id) +
          (f.hint ? ' — ' + f.hint : '') +
          '\n  FORMDAKİ DEĞER: ' +
          (v ? '"' + v + '"' : '(boş)')
        );
      })
      .join('\n');

  const toplam = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };
  const parcalar = [];
  const baglam = opt.baglam || {};

  for (const grup of gruplar) {
    const icerik = [{ type: 'text', text: alanMetni }, ...grup];
    let sonuc;
    try {
      sonuc = await cagirVeAyristir({ sistem, icerik, sema, maxTokens });
    } catch (e) {
      hatalar.push({ reason: 'api-error', message: e && e.message });
      await kullanimKaydet({
        module: opt.module,
        docType: opt.docType,
        endpoint: 'compare',
        model: MODEL,
        ...baglam,
        usage: {},
        ok: false,
        hata: e && e.message,
      });
      continue;
    }
    sonuc.usages.forEach((u) => {
      if (!u) return;
      toplam.input_tokens += u.input_tokens || 0;
      toplam.output_tokens += u.output_tokens || 0;
      toplam.cache_creation_input_tokens += u.cache_creation_input_tokens || 0;
      toplam.cache_read_input_tokens += u.cache_read_input_tokens || 0;
    });
    for (const u of sonuc.usages) {
      await kullanimKaydet({
        module: opt.module,
        docType: opt.docType,
        endpoint: 'compare',
        model: MODEL,
        ...baglam,
        usage: u,
        ok: !!sonuc.veri,
      });
    }
    if (sonuc.veri) parcalar.push(sonuc.veri);
    else hatalar.push({ reason: 'parse-failed', stopReason: sonuc.stopReason });
  }

  if (parcalar.length === 0) return { ok: false, reason: 'parse-failed', hatalar, usage: toplam };

  // Parça birleştirme + sunucu kararı.
  const out = {};
  let farkliSayisi = 0;
  fields.forEach((f) => {
    // Belge değeri: parçalar arasında en yüksek güvenli dolu olan.
    let belgeDeger = '';
    let guven = 0;
    let modelDurum = 'belgede_yok';
    let aciklama = '';
    parcalar.forEach((p) => {
      const c = p && p[f.id];
      if (!c) return;
      const g = guvenKirp(c.guven);
      const d = String(c.belgeDeger || '').trim();
      if (d && g >= guven) {
        belgeDeger = d;
        guven = g;
        modelDurum = KIYAS_DURUMLARI.includes(c.durum) ? c.durum : 'farkli';
        aciklama = String(c.aciklama || '').slice(0, 300);
      }
    });

    const formDeger = String(mevcut[f.id] == null ? '' : mevcut[f.id]).trim();

    // ── Sunucu kararı (model bunu ezemez) ──
    let durum;
    if (!formDeger) durum = 'formda_bos';
    else if (!belgeDeger) durum = 'belgede_yok';
    else if (kiyasNormalize(belgeDeger) === kiyasNormalize(formDeger)) durum = 'ayni';
    else durum = modelDurum === 'ayni' ? 'ayni' : 'farkli';

    if (durum === 'ayni') aciklama = '';
    if (durum === 'farkli') farkliSayisi += 1;

    out[f.id] = { belgeDeger, formDeger, durum, aciklama, guven };
  });

  return {
    ok: true,
    data: out,
    farkliSayisi,
    hatalar,
    usage: toplam,
    onbellek: {
      yazilan: toplam.cache_creation_input_tokens,
      okunan: toplam.cache_read_input_tokens,
      minimumAltinda:
        toplam.cache_creation_input_tokens === 0 && toplam.cache_read_input_tokens === 0,
      esik: CACHE_MIN_TOKENS,
    },
  };
}

// ══════════════════════════════════════════════════════════════
// SATIR ÇIKARIMI — tablo/liste belgeleri için.
//
// alanCikar tekil alan içindir ("AGNO kaç?"). Transkript, ders çizelgesi,
// Learning Agreement gibi belgelerde asıl iş SATIR listesidir: belgede kaç
// ders varsa o kadar satır. Öğrencinin en çok elle veri girdiği yer burası.
//
// Güven satır düzeyindedir, hücre düzeyinde değil: bir transkript satırı ya
// doğru okunur ya okunmaz; hücre başına güven hem gereksiz hem de çıktı
// token'ını (dolayısıyla maliyeti) katlar.
// ══════════════════════════════════════════════════════════════
const MAX_SATIR = 100;

function satirSemasi(satirAlanlari) {
  const properties = {};
  const required = [];
  satirAlanlari.forEach((f) => {
    properties[f.id] = { type: 'string' };
    required.push(f.id);
  });
  properties.guven = { type: 'number' };
  required.push('guven');
  return {
    type: 'object',
    properties: {
      satirlar: {
        type: 'array',
        items: { type: 'object', properties, required, additionalProperties: false },
      },
    },
    required: ['satirlar'],
    additionalProperties: false,
  };
}

const SATIR_TALIMATI = `Şimdi TEK ALAN değil SATIR LİSTESİ çıkaracaksın.

Belgedeki tabloyu/listeyi satır satır oku. Belgede kaç satır varsa o kadar
nesne üret — eksik bırakma, fazladan uydurma.

Ek kurallar:
- Başlık satırlarını, ara toplamları ve dipnotları ATLA; yalnız veri satırları.
- Bir satırda bir sütun boşsa o alanı boş string ("") bırak, satırı atlama.
- Satırların belgedeki SIRASINI koru.
- "guven" satırın tamamı içindir: 1.0 = satır net okundu, 0.5 = bazı hücreler
  yorum gerektirdi, 0.3 ve altı = satır şüpheli.
- Bir satır birden çok mantıksal kaydı içeriyorsa (birleşik hücre) bölme;
  belgede nasıl duruyorsa öyle ver.`;

/**
 * @param {object} opt
 * @param {Array<{id,label,hint?}>} opt.satirAlanlari  bir satırın sütunları
 * @param {string} [opt.satirTanimi]  "her ders" / "her hareketlilik" gibi
 * @param {Array} opt.dosyalar
 */
async function satirCikar(opt) {
  const alanlar = (Array.isArray(opt.satirAlanlari) ? opt.satirAlanlari : []).filter(
    (f) => f && f.id
  );
  if (alanlar.length === 0) return { ok: false, reason: 'no-fields', hatalar: [] };
  if (alanlar.length > 20) return { ok: false, reason: 'too-many-columns', hatalar: [] };

  const { gruplar, hatalar } = await istekGruplari(opt.dosyalar || []);
  if (gruplar.length === 0) return { ok: false, reason: 'no-readable-document', hatalar };

  const sistem = await sistemBloklari(opt.module, opt.docType);
  const sema = satirSemasi(alanlar);
  // Satır başına ~20 token × sütun sayısı, üstüne tavan.
  const maxTokens = Math.max(2048, Math.min(8192, MAX_SATIR * alanlar.length * 20));

  const alanMetni =
    SATIR_TALIMATI +
    '\n\nÇıkarılacak liste: ' +
    (opt.satirTanimi || 'belgedeki her veri satırı') +
    '\n\nHer satırın sütunları:\n' +
    alanlar
      .map((f) => '- ' + f.id + ': ' + (f.label || f.id) + (f.hint ? ' — ' + f.hint : ''))
      .join('\n');

  const toplam = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };
  const hepsi = [];
  const baglam = opt.baglam || {};

  for (const grup of gruplar) {
    const icerik = [{ type: 'text', text: alanMetni }, ...grup];
    let sonuc;
    try {
      sonuc = await cagirVeAyristir({ sistem, icerik, sema, maxTokens });
    } catch (e) {
      hatalar.push({ reason: 'api-error', message: e && e.message });
      await kullanimKaydet({
        module: opt.module,
        docType: opt.docType,
        endpoint: 'extract-rows',
        model: MODEL,
        ...baglam,
        usage: {},
        ok: false,
        hata: e && e.message,
      });
      continue;
    }
    sonuc.usages.forEach((u) => {
      if (!u) return;
      toplam.input_tokens += u.input_tokens || 0;
      toplam.output_tokens += u.output_tokens || 0;
      toplam.cache_creation_input_tokens += u.cache_creation_input_tokens || 0;
      toplam.cache_read_input_tokens += u.cache_read_input_tokens || 0;
    });
    for (const u of sonuc.usages) {
      await kullanimKaydet({
        module: opt.module,
        docType: opt.docType,
        endpoint: 'extract-rows',
        model: MODEL,
        ...baglam,
        usage: u,
        ok: !!sonuc.veri,
      });
    }
    if (sonuc.veri && Array.isArray(sonuc.veri.satirlar)) hepsi.push(...sonuc.veri.satirlar);
    else hatalar.push({ reason: 'parse-failed', stopReason: sonuc.stopReason });
  }

  if (hepsi.length === 0 && hatalar.some((h) => h.reason)) {
    return { ok: false, reason: 'parse-failed', hatalar, usage: toplam };
  }

  // Normalize + tekilleştir. Parçalar bindirmeli olduğu için (doc-text
  // CHUNK_OVERLAP) aynı satır iki parçada birden görünebilir; tüm sütunların
  // normalize birleşimi anahtar olarak kullanılır.
  const gorulen = new Set();
  const satirlar = [];
  hepsi.forEach((ham) => {
    if (!ham || typeof ham !== 'object') return;
    const satir = {};
    let doluHucre = 0;
    alanlar.forEach((f) => {
      const v = typeof ham[f.id] === 'string' ? ham[f.id].trim() : '';
      satir[f.id] = v;
      if (v) doluHucre += 1;
    });
    if (doluHucre === 0) return; // tamamen boş satır
    satir.guven = guvenKirp(ham.guven);
    const anahtar = alanlar.map((f) => kiyasNormalize(satir[f.id])).join('|');
    if (gorulen.has(anahtar)) return;
    gorulen.add(anahtar);
    if (satirlar.length < MAX_SATIR) satirlar.push(satir);
  });

  return {
    ok: true,
    satirlar,
    hatalar,
    usage: toplam,
    onbellek: {
      yazilan: toplam.cache_creation_input_tokens,
      okunan: toplam.cache_read_input_tokens,
      minimumAltinda:
        toplam.cache_creation_input_tokens === 0 && toplam.cache_read_input_tokens === 0,
      esik: CACHE_MIN_TOKENS,
    },
  };
}

// ══════════════════════════════════════════════════════════════
// DERS İÇERİĞİ KIYASLAMA — muafiyet kararına ÖNERİ
//
// Mevcut sözcüksel skor (tf-idf + jaccard + n-gram) simetrik bir BENZERLİK
// ölçüyor: "iki metin birbirine ne kadar benziyor". Oysa muafiyetin sorusu
// asimetriktir: "öğrencinin ALDIĞI ders, ÇAKÜ dersinin öğrenme çıktılarını
// KARŞILIYOR MU". Farklı sözcüklerle yazılmış aynı müfredat sözcüksel olarak
// uzak düşer (ör. "türev-integral" ↔ "diferansiyel ve integral hesap"),
// yabancı dildeki içerikler ise hiç eşleşmez.
//
// Bu yüzden karşılaştırma modele asimetrik sorulur. Çıktı bir ÖNERİDİR;
// kararı akademisyen verir.
//
// Tüm çiftler TEK çağrıda gider — ders başına ayrı çağrı hem pahalı hem yavaş.
// ══════════════════════════════════════════════════════════════
const DERS_KARARLARI = ['muaf', 'incele', 'red'];
const MAX_DERS_CIFTI = 30;

const DERS_TALIMATI = `Sen bir üniversitenin ders muafiyet komisyonuna yardımcı olan
bir değerlendirme asistanısın. Sana ders ÇİFTLERİ verilecek:

  ALINAN  = öğrencinin başka bir kurumda tamamladığı ders
  HEDEF   = ÇAKÜ'de muaf olmak istediği ders

Her çift için tek soruyu yanıtla: ALINAN ders, HEDEF dersin öğrenme
çıktılarını ve konu kapsamını KARŞILIYOR MU?

Bu soru ASİMETRİKTİR. "İki metin benziyor mu" değil, "alınan ders hedefin
gerektirdiklerini kapsıyor mu" diye bak. Alınan ders daha geniş olabilir —
bu sorun değil; hedefin konularını içeriyorsa yeterlidir. Tersi sorundur:
hedefin temel konuları alınan derste yoksa kapsam eksiktir.

Kurallar:
1. Farklı terimlerle yazılmış aynı konuyu AYNI say. Örnek: "türev ve integral"
   ile "diferansiyel ve integral hesap" aynı konudur. Yabancı dildeki içeriği
   Türkçe karşılığıyla eşleştir.
2. Ders ADI aynı olsa bile içerikler farklı konulardaysa kapsam yoktur.
   Adların benzerliği tek başına gerekçe değildir.
3. İçerik metni yoksa ya da anlamsız kısaysa "incele" de ve gerekçede belirt —
   bu durumda tahmin yürütme.
4. "oran" 0-100 arası bir sayıdır: hedef dersin konularının yüzde kaçının
   alınan derste karşılandığı.
5. "karar":
   muaf   = kapsam açıkça yeterli (tipik olarak oran 75 ve üzeri)
   incele = kısmi kapsam ya da belirsizlik — komisyon bakmalı
   red    = kapsam açıkça yetersiz veya konular farklı
6. "gerekce" tek cümle, Türkçe, SOMUT olsun: hangi konunun karşılandığını ya
   da eksik kaldığını söyle. "Benzerlik düşük" gibi boş ifade kullanma.

Bu bir ÖNERİDİR; nihai kararı akademisyen verir. Şüphede kaldığında "muaf"
değil "incele" de.`;

function dersSemasi(ciftler) {
  const properties = {};
  const required = [];
  ciftler.forEach((c) => {
    properties[c.id] = {
      type: 'object',
      properties: {
        oran: { type: 'number' },
        karar: { type: 'string', enum: DERS_KARARLARI },
        gerekce: { type: 'string' },
      },
      required: ['oran', 'karar', 'gerekce'],
      additionalProperties: false,
    };
    required.push(c.id);
  });
  return { type: 'object', properties, required, additionalProperties: false };
}

function dersMetni(d, etiket) {
  const p = [];
  if (d.ad) p.push(etiket + ' ders adı: ' + d.ad);
  if (d.kod) p.push(etiket + ' kod: ' + d.kod);
  if (d.akts) p.push(etiket + ' AKTS: ' + d.akts);
  const icerik = String(d.icerik || '').trim();
  p.push(etiket + ' içerik: ' + (icerik ? icerik.slice(0, 6000) : '(içerik girilmemiş)'));
  return p.join('\n');
}

/**
 * @param {object} opt
 * @param {Array<{id, alinan:{ad,kod,akts,icerik}, hedef:{ad,kod,akts,icerik}}>} opt.ciftler
 */
async function icerikKarsilastir(opt) {
  const ciftler = (Array.isArray(opt.ciftler) ? opt.ciftler : [])
    .filter((c) => c && c.id && c.alinan && c.hedef)
    .slice(0, MAX_DERS_CIFTI);
  if (ciftler.length === 0) return { ok: false, reason: 'no-pairs' };

  const sistem = [{ type: 'text', text: DERS_TALIMATI, cache_control: { type: 'ephemeral' } }];
  const sema = dersSemasi(ciftler);
  const maxTokens = Math.max(1024, Math.min(8192, ciftler.length * 220 + 512));

  const govde = ciftler
    .map(
      (c) =>
        '### ÇİFT ' +
        c.id +
        '\n' +
        dersMetni(c.alinan, 'ALINAN') +
        '\n' +
        dersMetni(c.hedef, 'HEDEF')
    )
    .join('\n\n');

  let sonuc;
  try {
    sonuc = await cagirVeAyristir({
      sistem,
      icerik: [{ type: 'text', text: govde }],
      sema,
      maxTokens,
    });
  } catch (e) {
    await kullanimKaydet({
      module: 'muafiyet',
      docType: 'ders-eslestirme',
      endpoint: 'course-match',
      model: MODEL,
      ...(opt.baglam || {}),
      usage: {},
      ok: false,
      hata: e && e.message,
    });
    return { ok: false, reason: 'api-error', message: e && e.message };
  }

  for (const u of sonuc.usages) {
    await kullanimKaydet({
      module: 'muafiyet',
      docType: 'ders-eslestirme',
      endpoint: 'course-match',
      model: MODEL,
      ...(opt.baglam || {}),
      usage: u,
      ok: !!sonuc.veri,
    });
  }
  if (!sonuc.veri) return { ok: false, reason: 'parse-failed' };

  const out = {};
  ciftler.forEach((c) => {
    const g = sonuc.veri[c.id] || {};
    let oran = Number(g.oran);
    if (!Number.isFinite(oran)) oran = 0;
    oran = Math.max(0, Math.min(100, Math.round(oran)));
    const karar = DERS_KARARLARI.includes(g.karar) ? g.karar : 'incele';
    out[c.id] = {
      oran,
      karar,
      gerekce: String(g.gerekce || '').slice(0, 400),
    };
  });
  return { ok: true, data: out };
}

// ── Web ile doğrulama ─────────────────────────────────────────
// Haiku 4.5 temel web arama aracını kullanır (dinamik filtrelemeli
// _20260209 sürümü yalnız Opus/Sonnet 4.6+ modellerde vardır).
const WEB_ARAMA_ARACI = 'web_search_20250305';
const WEB_MAX_USES = 3;

const DOGRULAMA_TALIMATI = `Sana bir öğrenci başvurusundan çıkarılmış iddialar verilecek.
Görevin bunları web araması ile doğrulamaktır (ör. bir üniversitenin/bölümün
gerçekten var olup olmadığı, bir programın adı, resmî bir kurumun bilgisi).

Kurallar:
- En fazla 3 arama yap. Bulamazsan "bilinmiyor" de; uydurma.
- Her iddia için: durum ("dogrulandi" | "celisiyor" | "bilinmiyor"),
  aciklama (tek cümle, Türkçe) ve kaynak (bulduğun sayfanın URL'si veya "").
- Resmî kaynakları tercih et (üniversite siteleri, YÖK, ÖSYM).
- Yanıtın YALNIZCA tek bir JSON nesnesi olsun; başka metin yazma.
- Biçim: {"iddiaKimligi": {"durum": "...", "aciklama": "...", "kaynak": "..."}}`;

/**
 * @param {object} opt
 * @param {Array<{id:string, metin:string}>} opt.iddialar
 * @param {string[]} [opt.izinliAlanlar] allowed_domains (ör. ['yok.gov.tr'])
 */
async function webDogrula(opt) {
  const iddialar = (Array.isArray(opt.iddialar) ? opt.iddialar : [])
    .filter((i) => i && i.id && i.metin)
    .slice(0, 10);
  if (iddialar.length === 0) return { ok: false, reason: 'no-claims' };

  const c = client();
  const arac = {
    type: WEB_ARAMA_ARACI,
    name: 'web_search',
    max_uses: WEB_MAX_USES,
  };
  if (Array.isArray(opt.izinliAlanlar) && opt.izinliAlanlar.length > 0) {
    arac.allowed_domains = opt.izinliAlanlar.slice(0, 20);
  }

  const soru =
    'Doğrulanacak iddialar:\n\n' +
    iddialar.map((i) => '- ' + i.id + ': ' + String(i.metin).slice(0, 400)).join('\n');

  const messages = [{ role: 'user', content: [{ type: 'text', text: soru }] }];
  const usages = [];
  let resp = null;

  // Server-tool döngüsü sınıra takılırsa `pause_turn` gelir; sınırlı sayıda
  // devam ettiriyoruz (sonsuz döngü koruması).
  for (let tur = 0; tur < 4; tur += 1) {
    resp = await c.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: TEMPERATURE,
      system: [{ type: 'text', text: DOGRULAMA_TALIMATI }],
      tools: [arac],
      messages,
    });
    usages.push(resp.usage);
    if (resp.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: resp.content });
  }

  let veri = jsonAyikla(yanitMetni(resp));
  if (!veri) {
    // Tek yeniden deneme — araçsız, yalnız JSON biçimlendirme için.
    const tekrar = await c.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: TEMPERATURE,
      system: [{ type: 'text', text: DOGRULAMA_TALIMATI }],
      messages: [
        ...messages,
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Bulgularını YALNIZCA geçerli tek bir JSON nesnesi olarak yaz.',
            },
          ],
        },
      ],
    });
    usages.push(tekrar.usage);
    veri = jsonAyikla(yanitMetni(tekrar));
  }

  const baglam = opt.baglam || {};
  for (const u of usages) {
    await kullanimKaydet({
      module: opt.module,
      docType: opt.docType,
      endpoint: 'verify',
      model: MODEL,
      ...baglam,
      usage: u,
      ok: !!veri,
    });
  }

  if (!veri) return { ok: false, reason: 'parse-failed' };

  const out = {};
  iddialar.forEach((i) => {
    const g = veri[i.id] || {};
    const durum = ['dogrulandi', 'celisiyor', 'bilinmiyor'].includes(g.durum)
      ? g.durum
      : 'bilinmiyor';
    out[i.id] = {
      durum,
      aciklama: String(g.aciklama || '').slice(0, 400),
      kaynak: String(g.kaynak || '').slice(0, 500),
    };
  });
  return { ok: true, data: out };
}

// ── Batch API — anlık olmayan işler (%50 indirim) ─────────────

/**
 * @param {Array<{customId:string, module:string, docType:string,
 *   fields:Array, dosyalar:Array}>} isler
 */
async function batchGonder(isler) {
  const c = client();
  const requests = [];
  const atlanan = [];

  for (const is of isler) {
    const fields = (Array.isArray(is.fields) ? is.fields : []).filter((f) => f && f.id);
    if (fields.length === 0) {
      atlanan.push({ customId: is.customId, reason: 'no-fields' });
      continue;
    }
    const { gruplar, hatalar } = await istekGruplari(is.dosyalar || []);
    if (gruplar.length === 0) {
      atlanan.push({ customId: is.customId, reason: 'no-readable-document', hatalar });
      continue;
    }
    // Batch'te parça birleştirme yapılamaz (her istek bağımsız sonuç döner);
    // bu yüzden yalnız ilk grup gönderilir ve çok parçalı belgeler senkron
    // uca yönlendirilir.
    if (gruplar.length > 1) {
      atlanan.push({ customId: is.customId, reason: 'too-long-for-batch' });
      continue;
    }
    const sistem = await sistemBloklari(is.module, is.docType);
    requests.push({
      custom_id: String(is.customId),
      params: {
        model: MODEL,
        max_tokens: maxTokenHesapla(fields),
        temperature: TEMPERATURE,
        system: sistem,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Aşağıdaki belgelerden şu alanları çıkar:\n\n' +
                  alanListesiMetni(fields) +
                  '\n\nHer alan için { "deger", "guven", "kaynak" } üret.',
              },
              ...gruplar[0],
            ],
          },
        ],
        output_config: { format: { type: 'json_schema', schema: semaUret(fields) } },
      },
    });
  }

  if (requests.length === 0) return { ok: false, reason: 'no-valid-jobs', atlanan };
  const batch = await c.messages.batches.create({ requests });
  return { ok: true, batchId: batch.id, durum: batch.processing_status, atlanan };
}

async function batchDurum(batchId) {
  const b = await client().messages.batches.retrieve(String(batchId));
  return {
    ok: true,
    batchId: b.id,
    durum: b.processing_status,
    sayilar: b.request_counts,
    bittiMi: b.processing_status === 'ended',
  };
}

/**
 * Sonuçlar HERHANGİ bir sırada gelir — daima custom_id ile eşleştirilir.
 * `fieldsByCustomId` normalize + guven kırpma için gereklidir.
 */
async function batchSonuc(batchId, fieldsByCustomId = {}, baglam = {}) {
  const c = client();
  const out = {};
  for await (const r of await c.messages.batches.results(String(batchId))) {
    const id = r.custom_id;
    const fields = fieldsByCustomId[id] || [];
    if (r.result.type !== 'succeeded') {
      out[id] = { ok: false, reason: r.result.type, hata: r.result.error || null };
      continue;
    }
    const msg = r.result.message;
    await kullanimKaydet({
      module: baglam.module,
      docType: baglam.docType,
      endpoint: 'batch',
      model: MODEL,
      batch: true,
      studentNo: (baglam.studentNoByCustomId || {})[id] || '',
      departmentId: baglam.departmentId || '',
      actorId: baglam.actorId || '',
      usage: msg.usage,
      ok: true,
    });
    const veri = jsonAyikla(yanitMetni(msg));
    out[id] = veri
      ? { ok: true, data: sonucuNormalize(veri, fields) }
      : { ok: false, reason: 'parse-failed' };
  }
  return out;
}

module.exports = {
  MODEL,
  CACHE_MIN_TOKENS,
  WEB_ARAMA_ARACI,
  yapilandirildiMi,
  onekTokenSayisi,
  alanCikar,
  satirCikar,
  karsilastir,
  icerikKarsilastir,
  kiyasNormalize,
  webDogrula,
  batchGonder,
  batchDurum,
  batchSonuc,
  onekOnbelleginiTemizle,
  sistemBloklari,
};
