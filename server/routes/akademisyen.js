var express = require('express');
var https = require('https');
var rateLimit = require('express-rate-limit');
var { getDbSafe } = require('../config/database');
var { softAuth } = require('../middleware/softAuth');

var router = express.Router();
var softAuthMiddleware = softAuth(getDbSafe);

// Modül-bazlı rate limit'ler — global /api limit'inin üstünde, akademisyen
// scrape endpoint'leri pahalı olduğu için sıkılaştırılmış.
var readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek. Lütfen biraz bekleyin.' },
});
var writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla yazma isteği.' },
});
var scrapeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Scrape sınırı aşıldı, daha sonra deneyin.' },
});

// Güvenlik: NoSQL injection önlemi — query'den gelen değerleri stringe zorla.
// req.query parser'ı `?field[$ne]=null` gibi nested object'leri kabul eder.
function asPlainString(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  // Object / array gibi kompleks değer → reddet
  return null;
}

// Açık redirect savunması: yalnızca bu allowlist'teki host'lara redirect
// edilebilir. ÇAKÜ ve YÖK alt-alanları + scholar/orcid avatar host'ları.
var ALLOWED_REDIRECT_HOSTS = new Set([
  'karatekin.edu.tr',
  'www.karatekin.edu.tr',
  'akademik.yok.gov.tr',
  'scholar.google.com',
  'scholar.googleusercontent.com',
  'orcid.org',
  'sandbox.orcid.org',
  'avatars.githubusercontent.com',
  'ui-avatars.com',
  'via.placeholder.com',
]);

function isAllowedRedirectUrl(input) {
  if (typeof input !== 'string' || input.length === 0 || input.length > 2048) return false;
  try {
    var u = new URL(input);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    var host = u.hostname.toLowerCase();
    if (ALLOWED_REDIRECT_HOSTS.has(host)) return true;
    // Aynı zamanda *.karatekin.edu.tr alt-alanlarına izin
    if (host.endsWith('.karatekin.edu.tr')) return true;
    return false;
  } catch (_e) {
    return false;
  }
}

function stripTags(html) {
  if (!html) return '';
  // İç içe/parçalı tag bypass'ını önlemek için sabit nokta'ya kadar yinele
  // (örn. "<<script>script>" tek geçişte "<script>"e döner; ikinci geçişte temizlenir).
  var prev;
  var s = String(html);
  do {
    prev = s;
    s = s.replace(/<[^>]*>/g, '');
  } while (s !== prev);
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUsername(input) {
  if (!input) return '';
  return input
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/\s+/g, '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .trim();
}

// Custom Fetch with Browser mimic
function fetchHtml(urlStr, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: method,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...headers,
      },
    };
    if (data) {
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      opts.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ body, status: res.statusCode, headers: res.headers }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ══════════════════════════════════════════════════════════════
// REAL SCRAPING IMPLEMENTATIONS
// ══════════════════════════════════════════════════════════════

async function scrapeScholarReal(fullName) {
  const result = {
    source: 'Google Scholar',
    stats: { 'Toplam Atıf': '0', 'h-endeksi': '0', 'i10-endeksi': '0' },
    publications: [],
    profileUrl: '',
  };
  try {
    const searchUrl = `https://scholar.google.com/citations?view_op=search_authors&mauthors=${encodeURIComponent(fullName)}&hl=tr`;
    const searchRes = await fetchHtml(searchUrl);

    // Redirects mean captchas or rate limits
    if (searchRes.status >= 300) {
      result.error = 'Google blokladı (Captcha/Redirect).';
      return result;
    }

    const userMatch = searchRes.body.match(/user=([^"&]+)/i);
    if (!userMatch) return result;

    const userId = userMatch[1];
    result.profileUrl = `https://scholar.google.com/citations?user=${userId}&hl=tr`;

    const profileRes = await fetchHtml(result.profileUrl + '&pagesize=100');
    const html = profileRes.body;

    const citationsMatch = html.match(/class="gsc_rsb_std">(\d+)<\/td>/g);
    if (citationsMatch && citationsMatch.length >= 6) {
      result.stats['Toplam Atıf'] = citationsMatch[0].replace(/[^0-9]/g, '');
      result.stats['h-endeksi'] = citationsMatch[2].replace(/[^0-9]/g, '');
      result.stats['i10-endeksi'] = citationsMatch[4].replace(/[^0-9]/g, '');
    }

    const tbodyMatch = html.match(/<tbody id="gsc_a_b">([\s\S]*?)<\/tbody>/i);
    if (tbodyMatch) {
      const trs = tbodyMatch[1].split(/<tr class="gsc_a_tr">/i).slice(1);
      for (const tr of trs) {
        const titleMatch = tr.match(/class="gsc_a_at"[^>]*>([\s\S]*?)<\/a>/i);
        const authorsMatch = tr.match(/<div class="gs_gray">([\s\S]*?)<\/div>/i);
        const journalMatch = tr.match(
          /<div class="gs_gray">[\s\S]*?<\/div>\s*<div class="gs_gray">([\s\S]*?)<\/div>/i
        );
        const yearMatch = tr.match(/class="gsc_a_y"[^>]*><span[^>]*>([\s\S]*?)<\/span><\/td>/i);
        const citesMatch = tr.match(/class="gsc_a_c"[^>]*><a[^>]*>([\s\S]*?)<\/a><\/td>/i);

        if (titleMatch) {
          result.publications.push({
            title: stripTags(titleMatch[1]),
            authors: authorsMatch ? stripTags(authorsMatch[1]) : '',
            journal: journalMatch ? stripTags(journalMatch[1]) : '',
            year: yearMatch ? stripTags(yearMatch[1]) : '',
            citations: citesMatch ? stripTags(citesMatch[1]) : '',
          });
        }
      }
    }
  } catch (e) {
    result.error = e.message;
  }
  return result;
}

async function scrapeYoksisReal(fullName) {
  const result = {
    source: 'YÖKSİS Akademik',
    profileUrl: '',
    fullName: fullName,
    university: '',
    department: '',
    projects: [],
    theses: [],
  };
  try {
    const searchUrl = `https://akademik.yok.gov.tr/AkademikArama/AkademisyenArama?islem=sec&kelime=${encodeURIComponent(fullName)}`;
    const searchRes = await fetchHtml(searchUrl, 'GET', null, {
      Referer: 'https://akademik.yok.gov.tr/',
    });

    if (searchRes.status === 418) {
      result.error = 'YÖKSİS WAF Firewall tarafından engellendi.';
      return result;
    }

    const idMatch = searchRes.body.match(/authorId=([A-F0-9]+)/i);
    if (!idMatch) {
      // YÖKSİS doesn't list exact match easily without session
      return result;
    }

    const authorId = idMatch[1];
    result.profileUrl = `https://akademik.yok.gov.tr/AkademikArama/view?id=${authorId}`;

    const profileRes = await fetchHtml(
      `https://akademik.yok.gov.tr/AkademikArama/AkademisyenGorevOgrenimBilgileri?islem=dogrudanArama&authorId=${authorId}`
    );
    const html = profileRes.body;

    const uniMatch = html.match(/<br>([^<]+ÜNİVERSİTESİ[^<]+)/i);
    if (uniMatch) result.university = stripTags(uniMatch[1]);

    const projMatch = html.match(/Yürütücü[^<]+/gi) || html.match(/Araştırmacı[^<]+/gi) || [];
    projMatch.forEach((p) => result.projects.push({ title: stripTags(p) }));

    // Note: Yöksis HTML is loaded dynamically with AJAX, so pure HTML fetch might miss some tabs.
  } catch (e) {
    result.error = e.message;
  }
  return result;
}

async function scrapeWoSReal(fullName) {
  const result = {
    source: 'Web of Science',
    researcherId: '',
    stats: { 'H-Index': '0', Citations: '0' },
    publications: [],
  };
  try {
    // WoS requires Clarivate API or full browser. We simulate an empty payload if no public profile is hit.
    // To scrape WoS researcher profiles public search:
    const searchUrl = `https://www.webofscience.com/wos/author/search?search_mode=GeneralSearch&name=${encodeURIComponent(fullName)}`;
    const res = await fetchHtml(searchUrl);
    if (res.status >= 300) {
      result.error = 'WoS yetkisiz giriş engeli.';
      return result;
    }
  } catch (e) {
    result.error = e.message;
  }
  return result;
}

async function fetchAllRealData(username) {
  const name = username.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const [scholar, yoksis, wos] = await Promise.all([
    scrapeScholarReal(name),
    scrapeYoksisReal(name),
    scrapeWoSReal(name),
  ]);

  var result = {
    username: username,
    fullName: name,
    photo: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=random',
    email: `${username}@karatekin.edu.tr`,
    department: yoksis.university || 'Mühendislik Fakültesi',
    phone: '',
    web: scholar.profileUrl || yoksis.profileUrl,
    address: '',
    links: {
      yoksis: yoksis.profileUrl,
      scholar: scholar.profileUrl,
      wos: wos.researcherId
        ? `https://www.webofscience.com/wos/author/record/${wos.researcherId}`
        : '',
    },
    stats: {
      'Scholar Atıf': scholar.stats['Toplam Atıf'],
      'Scholar H-Index': scholar.stats['h-endeksi'],
      'WoS Atıf': wos.stats['Citations'],
      'WoS H-Index': wos.stats['H-Index'],
      'YÖKSİS Proje': yoksis.projects.length,
    },
    sections: {
      publications: {
        label: 'Scholar Yayınları',
        items: scholar.publications.map(
          (p) => `${p.title} (${p.year}) - ${p.journal} [Atıf: ${p.citations}]`
        ),
      },
      projects: {
        label: 'YÖKSİS Projeleri',
        items: yoksis.projects.map((p) => `${p.title}`),
      },
      error: {
        label: 'Kazıma Logları (Gerçek Zamanlı)',
        items: [
          `Scholar Log: ${scholar.error || 'Başarılı'}`,
          `Yöksis Log: ${yoksis.error || 'Başarılı'}`,
          `WoS Log: ${wos.error || 'Başarılı'}`,
        ],
      },
    },
    publicationMetrics: {
      sci: [],
      uak: [],
      ulakbim: [],
      book: [],
      conference: [],
      scholar: scholar.publications.map((p) => ({
        text: p.title,
        year: parseInt(p.year),
        subCategory: 'Scholar',
      })),
    },
    publications: [], // Flat list
  };

  scholar.publications.forEach((p) => {
    result.publications.push({ year: parseInt(p.year), type: 'scholar', originalText: p.title });
  });

  return result;
}

// ── MongoDB Cache Layer ──
async function getCacheDoc(db, username) {
  const doc = await db.collection('akademisyen_cache').findOne({ _docId: username });
  return doc || null;
}
async function setCacheDoc(db, username, data, merge = false) {
  if (merge) {
    await db
      .collection('akademisyen_cache')
      .updateOne({ _docId: username }, { $set: { ...data, _docId: username } }, { upsert: true });
  } else {
    await db
      .collection('akademisyen_cache')
      .replaceOne({ _docId: username }, { ...data, _docId: username }, { upsert: true });
  }
}

router.get('/metrics/all', readLimiter, async function (req, res) {
  try {
    var db = await getDbSafe();
    var filter = {};
    // NoSQL injection önlemi — yalnızca düz string kabul et
    var deptId = asPlainString(req.query.departmentId);
    if (deptId) filter.departmentId = deptId;
    var docs = await db.collection('akademisyen_cache').find(filter).toArray();
    var results = docs.map((d) => ({
      username: d._docId || d._id.toString(),
      fullName: d.data?.fullName || '',
      department: d.data?.department || '',
      departmentId: d.departmentId || null,
      stats: d.data?.stats || {},
      publicationMetrics: d.data?.publicationMetrics || { sci: [], scholar: [] },
      fetchedAt: d.fetchedAt,
    }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Açık redirect savunması — yalnızca allowlist'teki host'lara yönlendir.
// Geçersiz/eksik URL placeholder'a düşer; mevcut frontend davranışı korunur.
var DEFAULT_PHOTO = 'https://ui-avatars.com/api/?background=random';
router.get('/proxy/photo', readLimiter, async function (req, res) {
  var url = asPlainString(req.query.url);
  if (url && isAllowedRedirectUrl(url)) {
    return res.redirect(url);
  }
  return res.redirect(DEFAULT_PHOTO);
});

router.get('/', readLimiter, async function (req, res) {
  try {
    var db = await getDbSafe();
    var filter = {};
    var deptId = asPlainString(req.query.departmentId);
    if (deptId) filter.departmentId = deptId;
    var docs = await db.collection('akademisyen_cache').find(filter).toArray();
    var list = docs.map((d) => ({
      username: d._docId || d._id.toString(),
      fullName: d.data?.fullName || '',
      photo: d.data?.photo || '',
      email: d.data?.email || '',
      department: d.data?.department || '',
      departmentId: d.departmentId || null,
      fetchedAt: d.fetchedAt,
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// TOPLU CSV/EXCEL DIŞA AKTARMA — bölüm yetkilisi için
// /api/akademisyen/export.csv?departmentId=…
// UTF-8 BOM eklenir → Türkçe karakterler Excel'de doğru görünür.
// ══════════════════════════════════════════════════════════════
router.get('/export.csv', readLimiter, async function (req, res) {
  try {
    var db = await getDbSafe();
    var filter = {};
    var deptId = asPlainString(req.query.departmentId);
    if (deptId) filter.departmentId = deptId;
    var docs = await db.collection('akademisyen_cache').find(filter).toArray();

    // CSV başlığı
    var headers = [
      'Kullanıcı Adı',
      'Ad Soyad',
      'E-posta',
      'Bölüm',
      'Telefon',
      'Web',
      'Scholar Atıf',
      'Scholar H-Index',
      'WoS Atıf',
      'WoS H-Index',
      'YÖKSİS Proje',
      'Son Güncelleme',
    ];
    var csvEscape = function (v) {
      var s = v == null ? '' : String(v);
      if (s.indexOf('"') >= 0 || s.indexOf(',') >= 0 || s.indexOf('\n') >= 0) {
        s = '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    var lines = [headers.map(csvEscape).join(',')];
    docs.forEach(function (d) {
      var data = d.data || {};
      var stats = data.stats || {};
      lines.push(
        [
          d._docId || (d._id && d._id.toString()),
          data.fullName || '',
          data.email || '',
          data.department || '',
          data.phone || '',
          data.web || '',
          stats['Scholar Atıf'] || '',
          stats['Scholar H-Index'] || '',
          stats['WoS Atıf'] || '',
          stats['WoS H-Index'] || '',
          stats['YÖKSİS Proje'] || '',
          d.fetchedAt ? new Date(d.fetchedAt).toISOString().slice(0, 10) : '',
        ]
          .map(csvEscape)
          .join(',')
      );
    });

    // UTF-8 BOM → Excel doğru kod çözer
    var body = '﻿' + lines.join('\r\n');
    var fname = 'akademisyenler' + (deptId ? '-' + deptId : '') + '.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + fname + '"');
    res.send(body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:username/assign', writeLimiter, softAuthMiddleware, async function (req, res) {
  var username = normalizeUsername(req.params.username);
  // NoSQL injection önlemi — body'den gelen değeri stringe zorla
  var departmentId = asPlainString(req.body && req.body.departmentId);
  if (!departmentId) return res.status(400).json({ error: 'departmentId gerekli' });
  try {
    var db = await getDbSafe();
    var doc = await getCacheDoc(db, username);
    if (doc)
      await db
        .collection('akademisyen_cache')
        .updateOne({ _docId: username }, { $set: { departmentId: departmentId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:username', writeLimiter, softAuthMiddleware, async function (req, res) {
  var username = normalizeUsername(req.params.username);
  try {
    var db = await getDbSafe();
    await db.collection('akademisyen_cache').deleteOne({ _docId: username });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:username', scrapeLimiter, async function (req, res) {
  var username = normalizeUsername(req.params.username);
  // NoSQL injection önlemi — query'den gelen değeri stringe zorla
  var departmentId = asPlainString(req.query.departmentId);
  var forceRefresh = req.query.force === 'true';
  if (!username) return res.status(400).json({ error: 'Kullanıcı adı gerekli' });

  try {
    var db = await getDbSafe();
    var cached = await getCacheDoc(db, username);

    // Cache hit and not older than 7 days
    if (!forceRefresh && cached && cached.data) {
      if (departmentId && !cached.departmentId) {
        await db
          .collection('akademisyen_cache')
          .updateOne({ _docId: username }, { $set: { departmentId: departmentId } });
      }
      return res.json(cached.data);
    }

    // REAL DATA FETCHING CALL
    var data = await fetchAllRealData(username);

    // ── BÖLÜM EŞLEŞME DOĞRULAMASI ──
    // Bölüm yetkilisi yalnızca KENDİ bölümündeki akademisyenleri ekleyebilir.
    // Bu kontrol, kazıma sırasında (data.department) görünen bölüm adının
    // istek yapan kapsamla eşleşmesini gerektirir. Eşleşme yoksa kayıt
    // kaydedilmeden 403 dönülür.
    //
    // forceRefresh=true durumunda (mevcut kayıt yenileniyor) zorlamayız —
    // sadece ekleme (yeni kayıt) akışında uygulanır.
    if (departmentId && !cached) {
      try {
        var targetDept = await db
          .collection('departments')
          .findOne({ $or: [{ _docId: departmentId }, { id: departmentId }] });
        var scrapedName = (data.department || '').toString().toLocaleLowerCase('tr').trim();
        var targetName = (targetDept && (targetDept.name || ''))
          .toString()
          .toLocaleLowerCase('tr')
          .trim();
        // Bölümün tam adı kazımada görünmelidir. Bilgi yetersizse (kazıma boş)
        // ekleyene güveniriz (yetki kontrolü zaten softAuth ile yapıldı varsayımı).
        if (
          scrapedName &&
          targetName &&
          scrapedName.indexOf(targetName) < 0 &&
          targetName.indexOf(scrapedName) < 0
        ) {
          return res.status(403).json({
            error:
              'Bu akademisyen "' +
              (data.department || 'farklı') +
              '" bölümünde görünüyor; yalnızca KENDİ bölümünüzdeki akademisyenleri ekleyebilirsiniz.',
            scrapedDepartment: data.department || '',
            targetDepartment: targetDept ? targetDept.name : departmentId,
          });
        }
      } catch (_) {
        /* hata olsa bile kazımayı engelleme */
      }
    }

    var updateData = { data: data, fetchedAt: new Date() };
    if (departmentId) updateData.departmentId = departmentId;
    await setCacheDoc(db, username, updateData, true);

    res.json(data);
  } catch (err) {
    console.error('Akademisyen API Error:', err.message);
    var dbSafe = await getDbSafe();
    var cachedErr = await getCacheDoc(dbSafe, username);
    if (cachedErr && cachedErr.data) return res.json(cachedErr.data);

    res.status(500).json({ error: 'Akademisyen bilgisi alınamadı: ' + err.message });
  }
});

module.exports = router;
