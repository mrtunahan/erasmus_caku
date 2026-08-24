// ══════════════════════════════════════════════════════════════
// AI kullanım/maliyet kaydı.
//
// Her model çağrısının `usage` alanı `ai_usage_logs` koleksiyonuna yazılır.
// Amaç öğrenci başına maliyet raporlayabilmek — bu yüzden her kaydın
// `studentNo` ve `departmentId` alanı vardır (bilinmiyorsa boş).
//
// Fiyatlar 1M token başına USD. Haiku 4.5 için giriş $1, çıkış $5.
// Önbellek yazımı giriş fiyatının 1.25 katı (5 dk TTL), önbellek okuması
// 0.1 katıdır. Batch API tüm kalemlerde %50 indirimlidir.
// ══════════════════════════════════════════════════════════════
const { getDbSafe } = require('../config/database');

const COLLECTION = 'ai_usage_logs';

const FIYAT = {
  'claude-haiku-4-5': { girdi: 1.0, cikti: 5.0 },
  // Tarih ekli kimlik, önceden yazılmış kayıtlar için tabloda kalır; onların
  // maliyeti varsayılana düşüp yanlış raporlanmasın.
  'claude-haiku-4-5-20251001': { girdi: 1.0, cikti: 5.0 },
  // Haiku dışı modeller: sistem şu an hepsini kullanmıyor ama fiyatları
  // tabloda duruyor. Eksik bir model kimliği varsayılana (Haiku) düşer ve
  // maliyet raporu o çağrıyı OLDUĞUNDAN UCUZ gösterirdi.
  'claude-sonnet-4-6': { girdi: 3.0, cikti: 15.0 },
  'claude-sonnet-5': { girdi: 3.0, cikti: 15.0 },
  'claude-opus-4-8': { girdi: 5.0, cikti: 25.0 },
  'claude-opus-5': { girdi: 5.0, cikti: 25.0 },
};
// Model kimliği tabloda yoksa Haiku fiyatı varsayılır (tek modelli kurulum).
const VARSAYILAN_FIYAT = FIYAT['claude-haiku-4-5'];

const CACHE_WRITE_CARPAN = 1.25;
const CACHE_READ_CARPAN = 0.1;
const BATCH_CARPAN = 0.5;
// Web arama server-tool'u istek başına ücretlendirilir (1000 istek $10).
const WEB_ARAMA_BIRIM_USD = 0.01;

function sayi(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Bir `usage` nesnesinden USD maliyet hesaplar.
 * @param {object} usage Anthropic yanıtındaki usage alanı
 * @param {{model?:string, batch?:boolean, webAramaSayisi?:number}} opt
 */
function maliyetHesapla(usage, opt = {}) {
  const f = FIYAT[opt.model] || VARSAYILAN_FIYAT;
  const u = usage || {};
  const girdi = sayi(u.input_tokens);
  const cikti = sayi(u.output_tokens);
  const cacheWrite = sayi(u.cache_creation_input_tokens);
  const cacheRead = sayi(u.cache_read_input_tokens);

  let usd =
    (girdi * f.girdi +
      cacheWrite * f.girdi * CACHE_WRITE_CARPAN +
      cacheRead * f.girdi * CACHE_READ_CARPAN +
      cikti * f.cikti) /
    1e6;

  if (opt.batch) usd *= BATCH_CARPAN;
  usd += sayi(opt.webAramaSayisi) * WEB_ARAMA_BIRIM_USD;
  // 6 haneye yuvarla — kuruş altı toplamların kaybolmaması için.
  return Math.round(usd * 1e6) / 1e6;
}

/**
 * Kullanım kaydı yazar. Asla throw etmez — loglama başarısız diye asıl
 * işlem düşmemeli.
 */
async function kullanimKaydet(kayit) {
  try {
    const db = await getDbSafe();
    if (!db) return null;
    const u = kayit.usage || {};
    const webAramaSayisi = sayi(
      u.server_tool_use && u.server_tool_use.web_search_requests
        ? u.server_tool_use.web_search_requests
        : kayit.webAramaSayisi
    );
    const doc = {
      module: String(kayit.module || ''),
      docType: String(kayit.docType || ''),
      endpoint: String(kayit.endpoint || ''),
      model: String(kayit.model || ''),
      batch: !!kayit.batch,
      studentNo: String(kayit.studentNo || ''),
      departmentId: String(kayit.departmentId || ''),
      actorId: String(kayit.actorId || ''),
      actorName: String(kayit.actorName || ''),
      inputTokens: sayi(u.input_tokens),
      outputTokens: sayi(u.output_tokens),
      cacheWriteTokens: sayi(u.cache_creation_input_tokens),
      cacheReadTokens: sayi(u.cache_read_input_tokens),
      webAramaSayisi,
      costUsd: maliyetHesapla(u, {
        model: kayit.model,
        batch: kayit.batch,
        webAramaSayisi,
      }),
      ok: kayit.ok !== false,
      hata: kayit.hata ? String(kayit.hata).slice(0, 300) : '',
      createdAt: new Date().toISOString(),
    };
    await db.collection(COLLECTION).insertOne(doc);
    return doc;
  } catch (e) {
    // Sessizce yut ama sunucu günlüğüne düş — sessiz veri kaybı istemiyoruz.
    console.warn('[ai-usage] kayıt yazılamadı:', e && e.message);
    return null;
  }
}

/**
 * Toplam rapor.
 * `groupBy` = 'student' | 'module' | 'department' | 'day' | 'endpoint' | 'model'
 *
 * `endpoint` ve `model` kırılımları maliyet SORUSUNU cevaplamak için var:
 * "hangi özellik ne kadar tutuyor" sorusuna modül kırılımı yetmiyordu — aynı
 * modül içinde ucuz (alan çıkarımı) ve pahalı (web'den taban puan okuma)
 * çağrılar bir arada. Uç bazlı kırılım olmadan pahalı olanı ayırt etmek
 * mümkün değildi.
 */
async function kullanimRaporu({
  groupBy = 'student',
  since = '',
  departmentId = '',
  endpoint = '',
} = {}) {
  const db = await getDbSafe();
  if (!db) return [];
  const match = {};
  if (since) match.createdAt = { $gte: String(since) };
  if (departmentId) match.departmentId = String(departmentId);
  if (endpoint) match.endpoint = String(endpoint);

  const ALANLAR = {
    module: '$module',
    department: '$departmentId',
    endpoint: '$endpoint',
    model: '$model',
    day: { $substr: ['$createdAt', 0, 10] },
    student: '$studentNo',
  };
  const alan = ALANLAR[groupBy] || ALANLAR.student;

  return db
    .collection(COLLECTION)
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: alan,
          cagri: { $sum: 1 },
          costUsd: { $sum: '$costUsd' },
          inputTokens: { $sum: '$inputTokens' },
          outputTokens: { $sum: '$outputTokens' },
          cacheReadTokens: { $sum: '$cacheReadTokens' },
          cacheWriteTokens: { $sum: '$cacheWriteTokens' },
          hataliCagri: { $sum: { $cond: [{ $eq: ['$ok', false] }, 1, 0] } },
        },
      },
      { $sort: { costUsd: -1 } },
      { $limit: 500 },
    ])
    .toArray();
}

module.exports = {
  COLLECTION,
  FIYAT,
  maliyetHesapla,
  kullanimKaydet,
  kullanimRaporu,
};
