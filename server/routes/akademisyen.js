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
  'cakuavis.karatekin.edu.tr',
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

// Foto gelmediği durumda harici istek YAPMADAN data-URL avatar üret.
// CSP (img-src) kısıtlamasına takılmaz, ui-avatars.com'a bağımlılık kalkar.
function generateAvatarDataUrl(name) {
  const initials = (name || 'A')
    .split(/\s+/)
    .map((s) => (s ? s.charAt(0) : ''))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('tr');
  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4',
    '#ec4899',
    '#14b8a6',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = (hash + name.charCodeAt(i)) | 0;
  const bg = colors[Math.abs(hash) % colors.length];
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
    '<rect width="200" height="200" fill="' +
    bg +
    '"/>' +
    '<text x="100" y="100" font-family="sans-serif" font-size="78" font-weight="700" ' +
    'fill="white" text-anchor="middle" dominant-baseline="central">' +
    initials.replace(/[<>&"']/g, '') +
    '</text></svg>';
  return 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf-8').toString('base64');
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

// Custom Fetch with Browser mimic + zaman aşımı.
// Tek bir scraper'ın yavaşlığı tüm akademisyen detay isteğini bloklamasın.
function fetchHtml(urlStr, method = 'GET', data = null, headers = {}, timeoutMs = 8000) {
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
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('timeout (' + timeoutMs + 'ms)'));
    });
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

// ══════════════════════════════════════════════════════════════
// ÇAKUAVİS scraping — gerçek profil verisi
// SPA (Next.js) JSON API'den çekiyor: /api/proxy?path=/api/Staff/...
// Bu fonksiyon o JSON'ları doğrudan çağırır.
// ══════════════════════════════════════════════════════════════
const CAKUAVIS_HOST = 'cakuavis.karatekin.edu.tr';
function cakuavisUrl(apiPath) {
  // Onlar URL-encoded path bekliyor (örn. %2Fapi%2FStaff%2F...)
  return `https://${CAKUAVIS_HOST}/api/proxy?path=${encodeURIComponent(apiPath)}`;
}
async function cakuavisGet(apiPath) {
  const res = await fetchHtml(cakuavisUrl(apiPath), 'GET', null, {
    Accept: 'application/json',
    Referer: `https://${CAKUAVIS_HOST}/`,
  });
  if (res.status !== 200) return null;
  try {
    const j = JSON.parse(res.body);
    if (j && j.IsSuccessful === true) return j.Data;
    return null;
  } catch (_e) {
    return null;
  }
}

// Bölüm/fakülte/üniversite zincirinden anlamlı seviyeleri ayıkla.
// Institutions[0].Institution = en alt seviye (Ana Bilim Dalı veya Bölüm)
// .BaseInstitution = bir üst seviye … ta üniversiteye kadar.
function extractInstitutionChain(rootInst) {
  const chain = [];
  let cur = rootInst;
  let safety = 10;
  while (cur && safety-- > 0) {
    chain.push((cur.Name || '').trim());
    cur = cur.BaseInstitution;
  }
  // chain[0] = en alt (ABD veya Bölüm), chain[son] = Üniversite
  // Bölüm: ".... Bölümü" ile biten ad; yoksa en alttaki "Bölümü"sü olmayan ilk parent
  let bolum = '';
  let fakulte = '';
  let universite = '';
  for (const name of chain) {
    if (!bolum && /\bBölüm/i.test(name) && !/Ana\s*Bilim\s*Dal/i.test(name)) {
      bolum = name;
    } else if (
      !fakulte &&
      /Fakülte|Yüksekokul|Enstitü|Konservatuvar|Meslek\s*Yüksekokul/i.test(name)
    ) {
      fakulte = name;
    } else if (!universite && /Üniversitesi$/i.test(name)) {
      universite = name;
    }
  }
  // ABD seviyesi en alttaysa: anaBolum'u en altın hemen bir üstüsü kabul et
  if (!bolum && chain.length >= 2 && /Ana\s*Bilim\s*Dal/i.test(chain[0])) {
    bolum = chain[1];
  }
  if (!bolum && chain.length >= 1) bolum = chain[0]; // son çare
  return {
    chain,
    abd: chain[0] || '',
    bolum,
    fakulte,
    universite,
  };
}

async function scrapeCakuavisReal(username) {
  const result = {
    source: 'ÇAKUAVİS',
    found: false,
    firstName: '',
    lastName: '',
    title: '',
    fullName: '',
    photo: '',
    email: '',
    gender: '',
    department: '',
    departmentChain: { abd: '', bolum: '', fakulte: '', universite: '' },
    contact: { phone: '', mobile: '', fax: '', web: '', address: '' },
    links: { yoksis: '', orcid: '', researcherId: '' },
    stats: {},
    researchFields: [],
    error: '',
  };
  try {
    // Sırayla 4 API çağrısı (paralel)
    const [info, stats, links, fields] = await Promise.all([
      cakuavisGet(`/api/Staff/GetStaffInfoByEmail?email=${encodeURIComponent(username)}`),
      cakuavisGet(
        `/api/StaffStatistic/GetStaffStatisticsByEmail?email=${encodeURIComponent(username)}`
      ),
      cakuavisGet(`/api/StaffData/GetStaffLinksByEmail?email=${encodeURIComponent(username)}`),
      cakuavisGet(
        `/api/StaffData/GetStaffResearchFieldsByEmail?email=${encodeURIComponent(username)}`
      ),
    ]);

    if (!info) {
      result.error = 'ÇAKUAVİS profili bulunamadı (' + username + ').';
      return result;
    }

    result.found = true;
    result.firstName = info.Name || '';
    result.lastName = info.Surname || '';
    result.title = info.Title || '';
    result.gender = info.Gender || '';
    result.email = (info.Email || username) + '@karatekin.edu.tr';
    result.photo = info.PhotoURL
      ? info.PhotoURL.startsWith('http')
        ? info.PhotoURL
        : `https://${CAKUAVIS_HOST}${info.PhotoURL}`
      : '';
    // "Arş. Gör. Gamze ECİK ERDEM" gibi BÜYÜK harfli ve unvanlı tam ad
    const surnameUp = result.lastName ? result.lastName.toLocaleUpperCase('tr') : '';
    const nameCap = result.firstName ? result.firstName : '';
    result.fullName = [result.title, nameCap, surnameUp].filter(Boolean).join(' ').trim();

    // Bölüm zinciri (Institutions[0].Institution.BaseInstitution …)
    const inst = (Array.isArray(info.Institutions) && info.Institutions[0]) || null;
    if (inst && inst.Institution) {
      const chain = extractInstitutionChain(inst.Institution);
      result.departmentChain = {
        abd: chain.abd,
        bolum: chain.bolum,
        fakulte: chain.fakulte,
        universite: chain.universite,
      };
      // 'department' = BÖLÜM (sistemimiz bölüm bazlı). Yoksa fakülte.
      result.department = chain.bolum || chain.fakulte || chain.abd || '';
    }

    if (info.Contact) {
      result.contact = {
        phone: info.Contact.InstitutionPhone === '-' ? '' : info.Contact.InstitutionPhone || '',
        mobile: info.Contact.MobilePhone === '-' ? '' : info.Contact.MobilePhone || '',
        fax: info.Contact.FaxPhone === '-' ? '' : info.Contact.FaxPhone || '',
        web: info.Contact.WebPageUrl === '-' ? '' : info.Contact.WebPageUrl || '',
        address:
          info.Contact.InstitutionAddress === '-' ? '' : info.Contact.InstitutionAddress || '',
      };
    }

    if (Array.isArray(links)) {
      const yoksisL = links.find((l) => l && l.DataSource === 'YOKSIS');
      if (yoksisL && yoksisL.StaffLink) {
        result.links.yoksis = yoksisL.StaffLink.YOKAKADEMIK_LINK || '';
        if (yoksisL.StaffLink.ORCID) {
          result.links.orcid = 'https://orcid.org/' + yoksisL.StaffLink.ORCID;
        }
        if (yoksisL.StaffLink.RESEARCHER_ID) {
          result.links.researcherId = yoksisL.StaffLink.RESEARCHER_ID;
        }
      }
    }

    if (stats) {
      const numOrDash = (v) => (v === '-' || v == null ? '' : String(v));
      result.stats = {
        'YÖKSİS Makale': numOrDash(stats.ArticleYOKSIS),
        'Scholar Makale': numOrDash(stats.ArticleGOOGLESCHOLAR),
        'WoS Makale': numOrDash(stats.ArticleWos),
        Bildiri: numOrDash(stats.Paper),
        Kitap: numOrDash(stats.Book),
        Proje: numOrDash(stats.Project),
        Patent: numOrDash(stats.Patent),
        Tasarım: numOrDash(stats.Design),
        Tez: numOrDash(stats.Theses),
        'Scholar Atıf': numOrDash(stats.CitationsGScholar),
        'Scholar H-Index': numOrDash(stats.hIndexGScholar),
        'Scholar i10-Index': numOrDash(stats.i10IndexGScholar),
        'WoS Atıf': numOrDash(stats.CitationsWos),
        'WoS H-Index': numOrDash(stats.hIndexWos),
      };
    }

    if (Array.isArray(fields)) {
      result.researchFields = fields
        .map((f) => f && f.researchField)
        .filter(Boolean)
        .map((rf) => ({
          temelAlan: rf.TEMEL_ALAN_AD || '',
          bilimAlan: rf.BILIM_ALAN_AD || '',
          anahtarKelimeler: [
            rf.ANAHTARKELIME1_AD,
            rf.ANAHTARKELIME2_AD,
            rf.ANAHTARKELIME3_AD,
          ].filter(Boolean),
        }));
    }
  } catch (e) {
    result.error = e.message;
  }
  return result;
}

async function fetchAllRealData(username) {
  const name = username.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  // ÇAKUAVİS önce → kimlik bilgisi (ad, unvan, bölüm, foto, e-posta).
  // YÖKSİS/Scholar/WoS → ek metrikler. Promise.allSettled ile: BİRİ ÇÖKSE
  // diğerleri akışı durdurmaz; reverse-proxy 504 olasılığını azaltır.
  const settled = await Promise.allSettled([
    scrapeCakuavisReal(username),
    scrapeScholarReal(name),
    scrapeYoksisReal(name),
    scrapeWoSReal(name),
  ]);
  const fallback = (def) => (r) => (r.status === 'fulfilled' ? r.value : def);
  const cakuavis = fallback({
    source: 'ÇAKUAVİS',
    found: false,
    fullName: '',
    title: '',
    firstName: '',
    lastName: '',
    photo: '',
    email: '',
    department: '',
    departmentChain: { abd: '', bolum: '', fakulte: '', universite: '' },
    contact: { phone: '', mobile: '', fax: '', web: '', address: '' },
    links: { yoksis: '', orcid: '', researcherId: '' },
    stats: {},
    researchFields: [],
    error: settled[0].reason ? String(settled[0].reason.message || settled[0].reason) : '',
  })(settled[0]);
  const scholar = fallback({
    source: 'Google Scholar',
    stats: { 'Toplam Atıf': '0', 'h-endeksi': '0', 'i10-endeksi': '0' },
    publications: [],
    profileUrl: '',
    error: settled[1].reason ? String(settled[1].reason.message || settled[1].reason) : '',
  })(settled[1]);
  const yoksis = fallback({
    source: 'YÖKSİS Akademik',
    profileUrl: '',
    fullName: name,
    university: '',
    department: '',
    projects: [],
    theses: [],
    error: settled[2].reason ? String(settled[2].reason.message || settled[2].reason) : '',
  })(settled[2]);
  const wos = fallback({
    source: 'Web of Science',
    stats: { Citations: '0', 'H-Index': '0' },
    researcherId: '',
    error: settled[3].reason ? String(settled[3].reason.message || settled[3].reason) : '',
  })(settled[3]);

  // ÇAKUAVİS başarılıysa onu kimlik kaynağı kabul et; metrikleri diğer
  // kaynaklarla birleştir. Aksi halde eski mantığa düş.
  var caBolum = cakuavis.found ? cakuavis.department : '';
  var result = {
    username: username,
    fullName: cakuavis.found && cakuavis.fullName ? cakuavis.fullName : name,
    title: cakuavis.title || '',
    firstName: cakuavis.firstName || '',
    lastName: cakuavis.lastName || '',
    photo: cakuavis.photo || generateAvatarDataUrl(name),
    email: cakuavis.email || `${username}@karatekin.edu.tr`,
    department: caBolum || yoksis.university || '',
    departmentChain: cakuavis.departmentChain || {
      abd: '',
      bolum: '',
      fakulte: '',
      universite: '',
    },
    phone: (cakuavis.contact && (cakuavis.contact.phone || cakuavis.contact.mobile)) || '',
    web: (cakuavis.contact && cakuavis.contact.web) || scholar.profileUrl || yoksis.profileUrl,
    address: (cakuavis.contact && cakuavis.contact.address) || '',
    links: {
      yoksis: (cakuavis.links && cakuavis.links.yoksis) || yoksis.profileUrl,
      scholar: scholar.profileUrl,
      orcid: (cakuavis.links && cakuavis.links.orcid) || '',
      wos: wos.researcherId
        ? `https://www.webofscience.com/wos/author/record/${wos.researcherId}`
        : '',
    },
    researchFields: cakuavis.researchFields || [],
    stats: Object.assign(
      {
        'Scholar Atıf': scholar.stats['Toplam Atıf'],
        'Scholar H-Index': scholar.stats['h-endeksi'],
        'WoS Atıf': wos.stats['Citations'],
        'WoS H-Index': wos.stats['H-Index'],
        'YÖKSİS Proje': yoksis.projects.length,
      },
      // ÇAKUAVİS istatistikleri ÜZERİNE yazar — onlar daha güvenilir.
      cakuavis.stats && Object.keys(cakuavis.stats).length ? cakuavis.stats : {}
    ),
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
          `ÇAKUAVİS Log: ${cakuavis.error || (cakuavis.found ? 'Başarılı' : 'Profil bulunamadı')}`,
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

    // ── ÇAKUAVİS DOĞRULAMASI (yeni kayıt ekleme akışı) ──
    // departmentId verildiyse + cache'de yoksa = bu bir EKLEME isteği.
    // ÇAKUAVİS'te bulunamayan kullanıcıyı (data.departmentChain boşsa)
    // REDDET — aksi halde "Sedasahin" gibi stub kart oluşur.
    if (departmentId && !cached) {
      var chainCheck = data.departmentChain || {};
      var hasAnyChain = !!(
        chainCheck.bolum ||
        chainCheck.abd ||
        chainCheck.fakulte ||
        data.department
      );
      if (!hasAnyChain) {
        return res.status(404).json({
          error:
            '"' +
            username +
            '" ÇAKUAVİS\'te bulunamadı. Lütfen ÇAKUAVİS kullanıcı adını doğru girdiğinizden emin olun.',
        });
      }
    }

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
        var targetName = (targetDept && (targetDept.name || ''))
          .toString()
          .toLocaleLowerCase('tr')
          .replace(/\s+/g, ' ')
          .trim();
        // "Bilgisayar Mühendisliği Bölümü" → "bilgisayar mühendisliği"
        var hedef = targetName.replace(/\s*bölümü\s*$/i, '').trim();
        // ÇAKUAVİS bölüm zinciri: bolum + abd + fakulte hepsi denenir.
        var chain = data.departmentChain || {};
        var cands = [chain.bolum, chain.abd, chain.fakulte, data.department]
          .filter(Boolean)
          .map(function (s) {
            return s.toString().toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
          });
        var matched =
          !hedef ||
          cands.length === 0 ||
          cands.some(function (c) {
            return c.indexOf(hedef) >= 0 || hedef.indexOf(c) >= 0;
          });
        if (!matched) {
          return res.status(403).json({
            error:
              'Bu akademisyen "' +
              (chain.bolum || data.department || 'farklı') +
              '" bölümünde görünüyor; yalnızca KENDİ bölümünüzdeki akademisyenleri ekleyebilirsiniz.',
            scrapedDepartment: chain.bolum || data.department || '',
            scrapedFaculty: chain.fakulte || '',
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
