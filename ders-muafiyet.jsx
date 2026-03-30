// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Ders Muafiyet Modülü (Redesigned)
// Belge yükleme, otomatik içerik eşleştirme, Word çıktısı
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ── Shared bileşenlerden import ──
const _C = window.C;
const _Card = window.Card;
const _Btn = window.Btn;
const _Input = window.Input;
const _Select = window.Select;
const _FormField = window.FormField;
const _Modal = window.Modal;
const _Badge = window.Badge;
const _convertGrade = window.convertGrade;

// ══════════════════════════════════════════════════════════════
// SABİTLER
// ══════════════════════════════════════════════════════════════

const MUAFIYET_TABS = [
  { id: "yeni", label: "Yeni Muafiyet", icon: "plus" },
  { id: "gecmis", label: "Geçmiş Kayıtlar", icon: "history" },
  { id: "ayarlar", label: "Ayarlar", icon: "settings" },
];

// Türkçe stopwords
const TR_STOPWORDS = new Set([
  "ve", "ile", "bir", "bu", "da", "de", "den", "dan", "için", "olan",
  "gibi", "kadar", "sonra", "önce", "üzere", "olarak", "veya", "ya",
  "hem", "ise", "nin", "nın", "nun", "nün", "dir", "dır", "dür", "dur",
  "ler", "lar", "tir", "tır", "tur", "tür", "ki", "mi", "mu", "mü",
  "ama", "fakat", "ancak", "yani", "çünkü", "zira", "dolayı", "daha",
  "çok", "bazı", "her", "hiç", "şu", "ne", "neden", "nasıl",
  "olan", "olma", "olur", "oldu", "olan", "oluş", "etmek", "etme",
  "yapma", "yapmak", "yapıl", "edilir", "edilecek", "edilen",
  "aynı", "diğer", "başka", "arası", "arasında", "üzerinde", "altında",
  "yanı", "sıra", "hakkında", "ilgili", "göre", "karşı", "doğru",
  "the", "and", "of", "in", "to", "for", "on", "with", "at", "by",
  "an", "are", "is", "as", "from", "that", "which", "or", "be",
  "it", "its", "has", "have", "this", "these", "those", "such",
  "will", "can", "may", "would", "should", "could", "been", "being",
  "was", "were", "not", "but", "also", "more", "than", "each",
  "about", "into", "through", "between", "their", "other",
  "ders", "konu", "hafta", "week", "topic", "lecture", "course",
  "saat", "hour", "lab", "laboratuvar", "uygulama", "teori",
]);

// Alan-Spesifik Eşanlamlılar Sözlüğü
const DOMAIN_SYNONYMS = {
  "programlama": ["programming", "kodlama", "coding", "yazılım geliştirme"],
  "programming": ["programlama", "kodlama", "coding"],
  "kodlama": ["programlama", "programming", "coding"],
  "algoritma": ["algorithm", "algorithms"],
  "algorithm": ["algoritma"],
  "veri yapıları": ["data structures", "veri yapısı"],
  "data structures": ["veri yapıları", "veri yapısı"],
  "veri yapısı": ["data structure", "veri yapıları"],
  "veritabanı": ["database", "veritaban", "veri tabanı", "db"],
  "database": ["veritabanı", "veri tabanı"],
  "veri tabanı": ["veritabanı", "database"],
  "işletim sistemi": ["operating system", "os"],
  "işletim sistemleri": ["operating systems"],
  "operating system": ["işletim sistemi", "işletim sistemleri"],
  "operating systems": ["işletim sistemleri"],
  "bilgisayar ağları": ["computer networks", "ağ", "network"],
  "computer networks": ["bilgisayar ağları"],
  "ağ": ["network", "bilgisayar ağları"],
  "network": ["ağ", "bilgisayar ağları"],
  "yazılım mühendisliği": ["software engineering"],
  "software engineering": ["yazılım mühendisliği"],
  "yazılım": ["software"],
  "software": ["yazılım"],
  "yapay zeka": ["artificial intelligence", "ai"],
  "artificial intelligence": ["yapay zeka"],
  "makine öğrenmesi": ["machine learning", "ml"],
  "machine learning": ["makine öğrenmesi", "makine öğrenme"],
  "derin öğrenme": ["deep learning"],
  "deep learning": ["derin öğrenme"],
  "sinir ağı": ["neural network", "sinir ağları"],
  "neural network": ["sinir ağı", "sinir ağları"],
  "matematik": ["mathematics", "math", "calculus"],
  "mathematics": ["matematik"],
  "doğrusal cebir": ["linear algebra", "lineer cebir"],
  "linear algebra": ["doğrusal cebir", "lineer cebir"],
  "lineer cebir": ["doğrusal cebir", "linear algebra"],
  "ayrık matematik": ["discrete mathematics", "discrete math"],
  "discrete mathematics": ["ayrık matematik"],
  "diferansiyel": ["differential", "differansiyel"],
  "differential": ["diferansiyel", "differansiyel"],
  "olasılık": ["probability"],
  "probability": ["olasılık"],
  "istatistik": ["statistics", "statistik"],
  "statistics": ["istatistik"],
  "fizik": ["physics"],
  "physics": ["fizik"],
  "elektronik": ["electronics", "electronic"],
  "electronics": ["elektronik"],
  "devre": ["circuit", "devreler"],
  "circuit": ["devre", "devreler"],
  "web": ["internet", "web programlama", "web tasarım"],
  "mobil": ["mobile"],
  "mobile": ["mobil"],
  "güvenlik": ["security", "siber güvenlik"],
  "security": ["güvenlik", "siber güvenlik"],
  "siber güvenlik": ["cybersecurity", "cyber security", "güvenlik"],
  "bilgisayar mimarisi": ["computer architecture"],
  "computer architecture": ["bilgisayar mimarisi"],
  "mikroişlemci": ["microprocessor", "mikroişlemciler"],
  "microprocessor": ["mikroişlemci", "mikroişlemciler"],
  "nesne yönelimli": ["object oriented", "oop", "nesnesel"],
  "object oriented": ["nesne yönelimli", "nesnesel"],
  "nesnesel": ["nesne yönelimli", "object oriented"],
  "otomata": ["automata", "otomat"],
  "automata": ["otomata"],
  "formal diller": ["formal languages"],
  "formal languages": ["formal diller"],
  "görüntü işleme": ["image processing"],
  "image processing": ["görüntü işleme"],
  "doğal dil işleme": ["natural language processing", "nlp"],
  "natural language processing": ["doğal dil işleme"],
  "bulut bilişim": ["cloud computing"],
  "cloud computing": ["bulut bilişim"],
  "gömülü sistem": ["embedded system", "gömülü sistemler"],
  "embedded system": ["gömülü sistem", "gömülü sistemler"],
  "veri madenciliği": ["data mining"],
  "data mining": ["veri madenciliği"],
  "blokzincir": ["blockchain"],
  "blockchain": ["blokzincir", "blok zincir"],
};

// Türkçe Kök Bulma
const TR_SUFFIXES = [
  "leyebilir", "layabilir", "leştiril", "laştırıl",
  "lıkları", "likleri", "lukları", "lükleri",
  "lerden", "lardan", "lerini", "larını",
  "leyerek", "layarak", "leştir", "laştır",
  "lerin", "ların", "lerde", "larda",
  "lığı", "liği", "luğu", "lüğü",
  "lıkl", "likl", "lukl", "lükl",
  "ında", "inde", "ünde", "unde",
  "ıyla", "iyle", "arak", "erek",
  "mesi", "ması", "mesi", "ması",
  "ler", "lar", "lik", "lık", "luk", "lük",
  "nin", "nın", "nün", "nun",
  "den", "dan", "ten", "tan",
  "ini", "ını", "ünü", "unu",
  "ine", "ına", "üne", "una",
  "ile", "yla", "yle",
  "dır", "dir", "dur", "dür",
  "tır", "tir", "tur", "tür",
  "mak", "mek",
  "yor", "miş", "mış", "muş", "müş",
  "cak", "cek",
  "ler", "lar",
  "li", "lı", "lu", "lü",
  "ci", "cı", "cu", "cü",
  "si", "sı", "su", "sü",
  "ca", "ce",
  "da", "de", "ta", "te",
  "ya", "ye",
  "im", "ım", "um", "üm",
  "ın", "in", "un", "ün",
  "ek", "ak",
  "ma", "me",
  "an", "en",
];

function turkishStem(word) {
  if (!word || word.length < 4) return word;
  var stemmed = word;
  for (var i = 0; i < TR_SUFFIXES.length; i++) {
    var suffix = TR_SUFFIXES[i];
    if (stemmed.length > suffix.length + 2 && stemmed.endsWith(suffix)) {
      stemmed = stemmed.slice(0, stemmed.length - suffix.length);
      break;
    }
  }
  return stemmed;
}

const SIMILARITY_THRESHOLD = 0.70;
const THRESHOLD_AUTO_APPROVE = 0.80;  // %80+ → Otomatik Muaf
const THRESHOLD_REVIEW      = 0.60;  // %60-79 → İnsan onayı bekliyor
// %60 altı → Otomatik Red
const AKTS_CHECK_ENABLED = true;
const W_NAME = 0.35;
const W_CONTENT = 0.55;
const W_CODE = 0.10;

// ══════════════════════════════════════════════════════════════
// KÜTÜPHANELERİ YÜKLEME
// ══════════════════════════════════════════════════════════════

function loadScript(url) {
  return new Promise(function (resolve, reject) {
    if (document.querySelector('script[src="' + url + '"]')) { resolve(); return; }
    var s = document.createElement("script");
    s.src = url;
    s.onload = resolve;
    s.onerror = function () { reject(new Error("Script yüklenemedi: " + url)); };
    document.head.appendChild(s);
  });
}

var _libsLoaded = false;
async function ensureLibsLoaded() {
  if (_libsLoaded) return;
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
  if (!window.XLSX) {
    await loadScript("https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js");
  }
  _libsLoaded = true;
}

// ══════════════════════════════════════════════════════════════
// DOSYA OKUMA & METİN ÇIKARMA
// ══════════════════════════════════════════════════════════════

async function extractTextFromPDF(file) {
  var arrayBuffer = await file.arrayBuffer();
  var pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  var allText = [];
  for (var i = 1; i <= pdf.numPages; i++) {
    var page = await pdf.getPage(i);
    var content = await page.getTextContent();
    var pageText = content.items.map(function (item) { return item.str; }).join(" ");
    allText.push(pageText);
  }
  return allText.join("\n");
}

async function extractTextFromDOCX(file) {
  var arrayBuffer = await file.arrayBuffer();
  var result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
  return result.value;
}

function extractDataFromXLSX(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var wb = window.XLSX.read(e.target.result, { type: "binary" });
        var allData = [];
        wb.SheetNames.forEach(function (name) {
          var sheet = wb.Sheets[name];
          var json = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          allData.push({ sheetName: name, rows: json });
        });
        resolve(allData);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

async function extractFromFile(file) {
  await ensureLibsLoaded();
  var name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return { type: "text", data: await extractTextFromPDF(file) };
  if (name.endsWith(".docx") || name.endsWith(".doc")) return { type: "text", data: await extractTextFromDOCX(file) };
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) return { type: "table", data: await extractDataFromXLSX(file) };
  throw new Error("Desteklenmeyen dosya formatı: " + name);
}

// ══════════════════════════════════════════════════════════════
// YAPISAL VERİ PARSE ETME
// ══════════════════════════════════════════════════════════════

function parseCoursesFromTable(sheets) {
  var courses = [];
  sheets.forEach(function (sheet) {
    var rows = sheet.rows;
    if (rows.length < 2) return;
    var headerIdx = -1;
    var colMap = {};
    for (var r = 0; r < Math.min(rows.length, 10); r++) {
      var row = rows[r].map(function (c) { return String(c).toLowerCase().trim(); });
      var hasCode = row.some(function (c) { return c.includes("kod") || c.includes("code"); });
      var hasName = row.some(function (c) { return c.includes("adı") || c.includes("adi") || c.includes("ad") || c.includes("name") || c.includes("ders"); });
      if (hasCode || hasName) {
        headerIdx = r;
        row.forEach(function (cell, idx) {
          if (cell.includes("kod") || cell.includes("code")) colMap.code = idx;
          if (cell.includes("adı") || cell.includes("adi") || (cell.includes("ders") && !cell.includes("kod"))) colMap.name = idx;
          if (cell.includes("akts") || cell.includes("ects") || cell.includes("kredi") || cell.includes("credit")) colMap.akts = idx;
          if (cell.includes("not") || cell.includes("grade") || cell.includes("başarı") || cell.includes("basari") || cell.includes("harf")) colMap.grade = idx;
          if (cell.includes("haftalık") || cell.includes("haftalik") || cell.includes("weekly")) {
            colMap.weeklyContent = idx;
          } else if (cell.includes("içerik") || cell.includes("icerik") || cell.includes("content") || cell.includes("açıklama") || cell.includes("aciklama")) {
            colMap.content = idx;
          }
          if (cell.includes("statü") || cell.includes("statu") || cell.includes("tür") || cell.includes("tur") || cell.includes("type")) colMap.status = idx;
        });
        break;
      }
    }
    if (headerIdx === -1 && rows.length > 1) {
      headerIdx = 0;
      if (rows[0].length >= 2) {
        colMap.code = 0; colMap.name = 1;
        if (rows[0].length >= 3) colMap.akts = 2;
        if (rows[0].length >= 4) colMap.grade = 3;
        if (rows[0].length >= 5) colMap.weeklyContent = 4;
      }
    }
    for (var r = headerIdx + 1; r < rows.length; r++) {
      var row = rows[r];
      var code = colMap.code !== undefined ? String(row[colMap.code] || "").trim() : "";
      var name = colMap.name !== undefined ? String(row[colMap.name] || "").trim() : "";
      if (!code && !name) continue;
      courses.push({
        code: code, name: name,
        akts: colMap.akts !== undefined ? String(row[colMap.akts] || "").trim() : "",
        grade: colMap.grade !== undefined ? String(row[colMap.grade] || "").trim() : "",
        content: colMap.content !== undefined ? String(row[colMap.content] || "").trim() : "",
        weeklyContent: colMap.weeklyContent !== undefined ? String(row[colMap.weeklyContent] || "").trim() : "",
        status: colMap.status !== undefined ? String(row[colMap.status] || "").trim() : "",
      });
    }
  });
  return courses;
}

function parseCoursesFromText(text) {
  var courses = [];
  var lines = text.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
  var codePattern = /^([A-ZÇĞİÖŞÜa-zçğıöşü]{2,5}\s?\d{3,4})(.*)$/;
  var currentCourse = null;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.match(/^\d+$/) || line.includes("ÇANKIRI KARATEKİN")) continue;
    var match = line.match(codePattern);
    if (match) {
      if (currentCourse) courses.push(currentCourse);
      var code = match[1].replace(/\s/g, "");
      var rest = match[2].trim();
      var aktsMatch = rest.match(/(\d+)\s*(AKTS|ECTS|kredi|credit)/i);
      var akts = aktsMatch ? aktsMatch[1] : "";
      var gradeMatch = rest.match(/\b(AA|BA|BB|CB|CC|DC|DD|FF|FD|[A-F][+-]?)\b/);
      var grade = gradeMatch ? gradeMatch[1] : "";
      var name = rest.replace(/(\d+)\s*(AKTS|ECTS|kredi|credit)/gi, "").replace(/\b(AA|BA|BB|CB|CC|DC|DD|FF|FD|[A-F][+-]?)\b/g, "").replace(/[|,;]/g, " ").trim().replace(/^[-–:\s]+|[-–:\s]+$/g, "");
      currentCourse = { code: code, name: name, akts: akts, grade: grade, content: "", weeklyContent: "" };
    } else if (currentCourse) {
      if (!currentCourse.akts) {
        var aktsMatch = line.match(/(\d+)\s*(AKTS|ECTS|kredi|credit)/i);
        if (aktsMatch) currentCourse.akts = aktsMatch[1];
      }
      currentCourse.weeklyContent += (currentCourse.weeklyContent ? " " : "") + line;
    }
  }
  if (currentCourse) courses.push(currentCourse);
  return courses;
}

// Dilekçeden ÇAKÜ ders kodlarını çıkarır ve targetCourses ile eşleştirir
function parsePetitionDocument(text, targetCourses) {
  // ÇAKÜ ders kodu formatları: BM*301, BM301, CSE 301 vb.
  var cakuPattern = /([A-ZÇĞİÖŞÜ]{2,5})\*?(\d{3,4})/g;
  var found = [];
  var seen = new Set();
  var match;
  while ((match = cakuPattern.exec(text)) !== null) {
    var code = match[1] + match[2];
    if (!seen.has(code)) {
      seen.add(code);
      found.push(code);
    }
  }
  // Her bulunan kodu targetCourses'ta ara
  var results = [];
  found.forEach(function (code) {
    var upper = code.toUpperCase();
    var target = targetCourses.find(function (c) {
      return c.code && c.code.replace(/\s|\*/g, "").toUpperCase() === upper;
    });
    if (target) {
      results.push({ cakuCode: code, target: target });
    }
  });
  return results;
}

// Dilekçedeki satırlardan karşı kurum kodu → ÇAKÜ kodu çiftlerini çıkarır
function parsePetitionRows(text, targetCourses) {
  var lines = text.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
  var rows = [];
  // Her satırda iki ders kodu varsa (sol = karşı kurum, sağ = ÇAKÜ)
  var pairPattern = /([A-ZÇĞİÖŞÜa-zçğıöşü]{2,5}\s?\d{3,4})[^\n]*?([A-ZÇĞİÖŞÜ]{2,5}\*?\s?\d{3,4})/;
  var cakuColPattern = /([A-ZÇĞİÖŞÜ]{2,5})\*?(\d{3,4})/g;
  lines.forEach(function (line) {
    var m = line.match(pairPattern);
    if (m) {
      var sourceCode = m[1].replace(/\s/g, "");
      var cakuCode = m[2].replace(/[\s*]/g, "");
      var target = targetCourses.find(function (c) {
        return c.code && c.code.replace(/\s|\*/g, "").toUpperCase() === cakuCode.toUpperCase();
      });
      rows.push({ sourceCode: sourceCode, cakuCode: cakuCode, target: target || null });
    }
  });
  return rows;
}

// ══════════════════════════════════════════════════════════════
// NLP MOTORU
// ══════════════════════════════════════════════════════════════

function normalizeText(text) {
  if (!text) return "";
  return text.toLowerCase()
    .replace(/İ/g, "i").replace(/I/g, "ı")
    .replace(/Ğ/g, "ğ").replace(/Ü/g, "ü").replace(/Ş/g, "ş")
    .replace(/Ö/g, "ö").replace(/Ç/g, "ç")
    .replace(/[^a-zçğıöşü0-9\s]/g, " ")
    .replace(/\s+/g, " ").trim();
}

function tokenize(text) {
  return normalizeText(text).split(" ").filter(function (w) { return w.length > 1 && !TR_STOPWORDS.has(w); });
}

function tokenizeStemmed(text) {
  return tokenize(text).map(function (w) { return turkishStem(w); });
}

function expandWithSynonyms(tokens) {
  var expanded = new Set(tokens);
  tokens.forEach(function (token) {
    if (DOMAIN_SYNONYMS[token]) {
      DOMAIN_SYNONYMS[token].forEach(function (syn) {
        normalizeText(syn).split(" ").forEach(function (w) { if (w.length > 1) expanded.add(w); });
      });
    }
  });
  var fullText = tokens.join(" ");
  Object.keys(DOMAIN_SYNONYMS).forEach(function (key) {
    if (key.includes(" ") && fullText.includes(key)) {
      DOMAIN_SYNONYMS[key].forEach(function (syn) {
        normalizeText(syn).split(" ").forEach(function (w) { if (w.length > 1) expanded.add(w); });
      });
    }
  });
  return Array.from(expanded);
}

function charNgrams(text, n) {
  if (!n) n = 2;
  var normalized = normalizeText(text);
  var grams = new Set();
  for (var i = 0; i <= normalized.length - n; i++) grams.add(normalized.substring(i, i + n));
  return grams;
}

function wordBigrams(tokens) {
  var bigrams = new Set();
  for (var i = 0; i < tokens.length - 1; i++) bigrams.add(tokens[i] + " " + tokens[i + 1]);
  return bigrams;
}

function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  var matrix = [];
  for (var i = 0; i <= b.length; i++) matrix[i] = [i];
  for (var j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (var i = 1; i <= b.length; i++) {
    for (var j = 1; j <= a.length; j++) {
      var cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[b.length][a.length];
}

function wordSimilarity(word1, word2) {
  if (!word1 || !word2) return 0;
  var maxLen = Math.max(word1.length, word2.length);
  return maxLen === 0 ? 1 : 1 - levenshteinDistance(word1, word2) / maxLen;
}

function jaccardSimilarity(text1, text2) {
  var tokens1 = tokenizeStemmed(text1), tokens2 = tokenizeStemmed(text2);
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  var exp1 = expandWithSynonyms(tokens1), exp2 = expandWithSynonyms(tokens2);
  var set1 = new Set(exp1), set2 = new Set(exp2);
  var intersection = 0;
  set1.forEach(function (t) { if (set2.has(t)) intersection++; });
  var union = new Set([...exp1, ...exp2]).size;
  return union > 0 ? intersection / union : 0;
}

function ngramSimilarity(text1, text2) {
  var grams1 = charNgrams(text1, 2), grams2 = charNgrams(text2, 2);
  if (grams1.size === 0 || grams2.size === 0) return 0;
  var intersection = 0;
  grams1.forEach(function (g) { if (grams2.has(g)) intersection++; });
  var union = new Set([...grams1, ...grams2]).size;
  return union > 0 ? intersection / union : 0;
}

function tfidfCosineSimilarity(text1, text2) {
  var tokens1 = expandWithSynonyms(tokenizeStemmed(text1));
  var tokens2 = expandWithSynonyms(tokenizeStemmed(text2));
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  var tf1 = {}, tf2 = {};
  tokens1.forEach(function (t) { tf1[t] = (tf1[t] || 0) + 1; });
  tokens2.forEach(function (t) { tf2[t] = (tf2[t] || 0) + 1; });
  var max1 = Math.max.apply(null, Object.values(tf1));
  var max2 = Math.max.apply(null, Object.values(tf2));
  var ntf1 = {}, ntf2 = {};
  Object.keys(tf1).forEach(function (t) { ntf1[t] = 0.5 + 0.5 * tf1[t] / max1; });
  Object.keys(tf2).forEach(function (t) { ntf2[t] = 0.5 + 0.5 * tf2[t] / max2; });
  var allTerms = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
  var idf = {};
  allTerms.forEach(function (term) {
    var df = (tf1[term] ? 1 : 0) + (tf2[term] ? 1 : 0);
    idf[term] = Math.log(2 / df) + 1;
  });
  var dotProduct = 0, mag1 = 0, mag2 = 0;
  allTerms.forEach(function (term) {
    var v1 = (ntf1[term] || 0) * idf[term], v2 = (ntf2[term] || 0) * idf[term];
    dotProduct += v1 * v2; mag1 += v1 * v1; mag2 += v2 * v2;
  });
  mag1 = Math.sqrt(mag1); mag2 = Math.sqrt(mag2);
  return mag1 > 0 && mag2 > 0 ? dotProduct / (mag1 * mag2) : 0;
}

function softJaccardSimilarity(text1, text2) {
  var tokens1 = tokenizeStemmed(text1), tokens2 = tokenizeStemmed(text2);
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  var matched = 0, used = new Set();
  tokens1.forEach(function (t1) {
    var bestScore = 0, bestIdx = -1;
    tokens2.forEach(function (t2, idx) {
      if (used.has(idx)) return;
      var sim = wordSimilarity(t1, t2);
      if (sim > bestScore) { bestScore = sim; bestIdx = idx; }
    });
    if (bestScore >= 0.85) { matched += bestScore; if (bestIdx >= 0) used.add(bestIdx); }
  });
  var total = Math.max(tokens1.length, tokens2.length);
  return total > 0 ? matched / total : 0;
}

function courseNameSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  var n1 = normalizeText(name1), n2 = normalizeText(name2);
  if (n1 === n2) return 1.0;
  if (n1.includes(n2) || n2.includes(n1)) return 0.90;
  return ngramSimilarity(name1, name2) * 0.25 + softJaccardSimilarity(name1, name2) * 0.35 + jaccardSimilarity(name1, name2) * 0.40;
}

function courseCodeSimilarity(code1, code2) {
  if (!code1 || !code2) return 0;
  var c1 = normalizeText(code1).replace(/\s/g, ""), c2 = normalizeText(code2).replace(/\s/g, "");
  if (c1 === c2) return 1.0;
  var num1 = c1.replace(/[^0-9]/g, ""), num2 = c2.replace(/[^0-9]/g, "");
  var prefix1 = c1.replace(/[0-9]/g, ""), prefix2 = c2.replace(/[0-9]/g, "");
  var score = 0;
  if (num1 && num2 && num1 === num2) score += 0.3;
  if (num1.length >= 1 && num2.length >= 1 && num1[0] === num2[0]) score += 0.2;
  score += wordSimilarity(prefix1, prefix2) * 0.5;
  return Math.min(score, 1.0);
}

function contentSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  return tfidfCosineSimilarity(text1, text2) * 0.50 + jaccardSimilarity(text1, text2) * 0.35 + ngramSimilarity(text1, text2) * 0.15;
}

function combinedSimilarity(text1, text2) { return contentSimilarity(text1, text2); }

function multiFactorScore(srcCourse, tgtCourse) {
  var nameScore = courseNameSimilarity(srcCourse.name, tgtCourse.name);
  var codeScore = courseCodeSimilarity(srcCourse.code, tgtCourse.code);
  var srcText = srcCourse.weeklyContent || srcCourse.content || "";
  var tgtText = tgtCourse.weeklyContent || tgtCourse.content || "";
  var contScore = (srcText && tgtText) ? contentSimilarity(srcText, tgtText) : 0;
  var wName = W_NAME, wContent = W_CONTENT, wCode = W_CODE;
  if (!srcText || !tgtText) { wName = 0.75; wContent = 0; wCode = 0.25; }
  return {
    total: wName * nameScore + wContent * contScore + wCode * codeScore,
    nameScore: nameScore, contentScore: contScore, codeScore: codeScore,
  };
}

function autoMatchCourses(sourceCourses, targetCourses, threshold) {
  if (!threshold) threshold = SIMILARITY_THRESHOLD;
  var matches = [];
  sourceCourses.forEach(function (src) {
    var bestMatch = null, bestTotalScore = 0;
    var bestScoreDetails = { total: 0, nameScore: 0, contentScore: 0, codeScore: 0 };
    var bestAktsPass = false, bestRejectReason = "";
    targetCourses.forEach(function (tgt) {
      var srcAkts = parseInt(src.akts) || 0, tgtAkts = parseInt(tgt.akts) || 0;
      var aktsPass = !AKTS_CHECK_ENABLED || srcAkts >= tgtAkts;
      var scores = multiFactorScore(src, tgt);
      var isBetter = (aktsPass && !bestAktsPass) || (aktsPass === bestAktsPass && scores.total > bestTotalScore);
      if (isBetter) {
        bestTotalScore = scores.total; bestScoreDetails = scores;
        bestAktsPass = aktsPass; bestMatch = tgt;
      }
    });

    // ── 3-Katmanlı Karar Mekanizması ──
    // AKTS yetersizse direk red; değilse skora göre tier belirlenir
    var tier, isMatched;
    if (!bestAktsPass) {
      tier = "rejected";
      isMatched = false;
      bestRejectReason = "AKTS yetersiz";
    } else if (bestTotalScore >= THRESHOLD_AUTO_APPROVE) {
      tier = "approved";   // %80+ → otomatik muaf
      isMatched = true;
    } else if (bestTotalScore >= THRESHOLD_REVIEW) {
      tier = "review";     // %60-79 → insan onayı bekliyor
      isMatched = false;
      bestRejectReason = "İnceleme gerekiyor (%" + Math.round(bestTotalScore * 100) + ")";
    } else {
      tier = "rejected";   // %60 altı → otomatik red
      isMatched = false;
      bestRejectReason = "Benzerlik düşük (%" + Math.round(bestTotalScore * 100) + ")";
    }

    matches.push({
      source: src, target: bestMatch, aktsPass: bestAktsPass,
      contentScore: bestTotalScore, nameScore: bestScoreDetails.nameScore,
      detailContentScore: bestScoreDetails.contentScore, codeScore: bestScoreDetails.codeScore,
      matched: isMatched, tier: tier, rejectReason: bestRejectReason,
    });
  });
  return matches;
}

// ══════════════════════════════════════════════════════════════
// FIREBASE CRUD
// ══════════════════════════════════════════════════════════════

var MuafiyetDB = {
  settingsRef: function () {
    return window.apiFirestore.collection("muafiyet_settings");
  },
  recordsRef: function () {
    return window.apiFirestore.collection("muafiyet_records");
  },
  async saveCourseContents(contents) {
    await window.FirestoreWrite.set("muafiyet_settings", "course_contents", { courses: contents, updatedAt: new Date().toISOString() });
  },
  async fetchCourseContents() {
    var ref = this.settingsRef(); if (!ref) return [];
    var doc = await ref.doc("course_contents").get();
    return doc.exists ? (doc.data().courses || []) : [];
  },
  async saveGradingSystem(system) {
    await window.FirestoreWrite.set("muafiyet_settings", "grading_system", { grades: system, updatedAt: new Date().toISOString() });
  },
  async fetchGradingSystem() {
    var ref = this.settingsRef(); if (!ref) return null;
    var doc = await ref.doc("grading_system").get();
    return doc.exists ? (doc.data().grades || null) : null;
  },
  async saveRecord(record) {
    var id = record.id; var data = Object.assign({}, record); delete data.id;
    if (id) { await window.FirestoreWrite.update("muafiyet_records", String(id), Object.assign({}, data, { updatedAt: new Date().toISOString() })); return record; }
    else { var result = await window.FirestoreWrite.add("muafiyet_records", Object.assign({}, data, { createdAt: new Date().toISOString() })); return Object.assign({}, record, { id: result.id }); }
  },
  async fetchRecords() {
    var ref = this.recordsRef(); if (!ref) return [];
    var snapshot = await ref.orderBy("createdAt", "desc").get();
    return snapshot.docs.map(function (doc) { return Object.assign({}, doc.data(), { id: doc.id }); });
  },
  async deleteRecord(id) {
    await window.FirestoreWrite.remove("muafiyet_records", String(id));
  },

  // Admin insan onayı: tek bir match'in kararını günceller
  // decision: "confirmed" (muaf) | "rejected" (red)
  async updateMatchDecision(recordId, matchIndex, decision, adminNote) {
    var ref = this.recordsRef();
    if (!ref) throw new Error("Firestore bağlantısı yok");
    var doc = await ref.doc(String(recordId)).get();
    if (!doc.exists) throw new Error("Kayıt bulunamadı");
    var data = doc.data();
    var matches = (data.matches || []).slice();
    if (!matches[matchIndex]) throw new Error("Eşleşme bulunamadı");
    matches[matchIndex] = Object.assign({}, matches[matchIndex], {
      adminDecision: decision,
      adminNote: adminNote || "",
      adminUpdatedAt: new Date().toISOString(),
    });
    var pendingLeft = matches.filter(function(m) {
      return m.tier === "review" && !m.adminDecision;
    }).length;
    await window.FirestoreWrite.update("muafiyet_records", String(recordId), {
      matches: matches,
      pendingReviewCount: pendingLeft,
      updatedAt: new Date().toISOString(),
    });
    return matches;
  },
};

// ══════════════════════════════════════════════════════════════
// WORD ÇIKTISI
// ══════════════════════════════════════════════════════════════

function exportMuafiyetWord(record) {
  var studentName = record.studentName || "xxxxx XXXXX";
  var studentNo = record.studentNo || "xxxxx";
  var otherUni = record.otherUniversity || "xxxxx Üniversitesi";
  var otherFaculty = record.otherFaculty || "xxxxx Fakültesi";
  var otherDept = record.otherDepartment || "xxxxx Mühendisliği";
  var matches = record.matches || [];
  var dataRows = ""; var totalAktsSource = 0; var totalAktsTarget = 0;
  var rowCount = Math.max(matches.length, 8);
  for (var i = 0; i < rowCount; i++) {
    var m = matches[i] || {}; var src = m.source || {}; var tgt = m.target || {};
    if (src.akts) totalAktsSource += parseInt(src.akts) || 0;
    if (tgt.akts) totalAktsTarget += parseInt(tgt.akts) || 0;
    dataRows += '<tr>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + (src.code||"") + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + (src.name||"") + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + (src.akts||"") + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + (src.grade||"") + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + (tgt.code||"") + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + (tgt.name||"") + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + (tgt.akts||"") + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + (m.convertedGrade||"") + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + (tgt.status||tgt.type||"") + '</td>' +
      '</tr>';
  }
  var localDept = record.localDepartment || "Bilgisayar";
  var html = '\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>body{font-family:"Times New Roman",Times,serif;font-size:12pt;}table{border-collapse:collapse;width:100%;table-layout:fixed;}td,th{border:1px solid black;padding:4px;font-family:"Times New Roman",Times,serif;}</style></head><body>' +
    '<p style="font-family:Times New Roman;font-size:12pt;text-align:justify;line-height:1.5;margin-bottom:12pt;">Bölümümüz <b>' + studentNo + '</b> numaralı öğrencisi <b>' + studentName + '\'nun</b>, ders muafiyet talebi hakkında vermiş olduğu dilekçesi incelenmiş olup, <b>Çankırı Karatekin Üniversitesi Önlisans ve Lisans Eğitim Öğretim Yönetmeliğinin 12. maddesi</b> uyarınca aşağıda tabloda verildiği gibi uygun olduğuna ve gereği için Fakültemiz ilgili kurullarında görüşülmek üzere Dekanlık Makamına sunulmasına,</p>' +
    '<table><tr><td colspan="4" style="border:1px solid black;padding:6px;text-align:center;font-weight:bold;font-size:11pt;"><u>' + otherUni + ' ' + otherFaculty + ' ' + otherDept + '<br/>Bölümünden Aldığı Dersin</u></td><td colspan="5" style="border:1px solid black;padding:6px;text-align:center;font-weight:bold;font-size:11pt;"><u>Çankırı Karatekin Üniversitesi Mühendislik Fakültesi ' + localDept + '<br/>Mühendisliği Bölümünde Muaf Olacağı Dersin</u></td></tr>' +
    '<tr><td style="width:10%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Kodu</td><td style="width:25%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Adı</td><td style="width:6%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">AKTS</td><td style="width:7%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Başarı<br/>Notu</td><td style="width:10%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Kodu</td><td style="width:25%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Adı</td><td style="width:6%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">AKTS</td><td style="width:7%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Başarı<br/>Notu</td><td style="width:10%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Statüsü</td></tr>' +
    dataRows +
    '<tr><td style="border:1px solid black;"></td><td style="border:1px solid black;text-align:center;font-weight:bold;"><u>Toplam</u></td><td style="border:1px solid black;text-align:center;font-weight:bold;">' + (totalAktsSource || "X") + '</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td><td style="border:1px solid black;text-align:center;font-weight:bold;"><u>Toplam</u></td><td style="border:1px solid black;text-align:center;font-weight:bold;">' + (totalAktsTarget || "X") + '</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td></tr></table></body></html>';
  var blob = new Blob([html], { type: "application/msword;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a"); a.href = url;
  a.download = "Ders_Muafiyet_" + studentNo + ".doc";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════
// TASARIM SİSTEMİ
// ══════════════════════════════════════════════════════════════

const DS = {
  // Renkler
  navy: "#1B2A4A",
  navyLight: "#2D4272",
  accent: "#3B82F6",
  accentLight: "#DBEAFE",
  green: "#059669",
  greenLight: "#D1FAE5",
  greenBg: "#ECFDF5",
  amber: "#D97706",
  amberLight: "#FEF3C7",
  red: "#DC2626",
  redLight: "#FEE2E2",
  text: "#1E293B",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  bg: "#F8FAFC",
  bgCard: "#FFFFFF",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  shadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
  shadowMd: "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)",
  shadowLg: "0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)",
  radius: 12,
  radiusSm: 8,
};

// ══════════════════════════════════════════════════════════════
// UI BİLEŞENLERİ
// ══════════════════════════════════════════════════════════════

// ── SVG İkonlar ──
const Icons = {
  upload: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  check: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  file: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  trash: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  download: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  arrow: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  sparkle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
    </svg>
  ),
  info: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  user: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  settings: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
};

// ── Skor Badge ──
const ScoreBadge = ({ value, size, label }) => {
  var pct = Math.round(value * 100);
  var color = pct >= 80 ? DS.green : pct >= 60 ? DS.amber : DS.red;
  var bgColor = pct >= 80 ? DS.greenLight : pct >= 60 ? DS.amberLight : DS.redLight;
  var sz = size === "lg" ? 42 : size === "sm" ? 26 : 34;
  var fs = size === "lg" ? 13 : size === "sm" ? 9 : 11;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{
        width: sz, height: sz, borderRadius: "50%",
        background: bgColor, border: "2px solid " + color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: fs, fontWeight: 700, color: color,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {pct}
      </div>
      {label && <span style={{ fontSize: 9, color: DS.textMuted, fontWeight: 500 }}>{label}</span>}
    </div>
  );
};

// ── Status Pill ──
// tier: "approved" | "review" | "rejected"  (yoksa matched boolean'a düşer)
const StatusPill = ({ matched, reason, tier }) => {
  var resolvedTier = tier || (matched ? "approved" : "rejected");

  if (resolvedTier === "approved") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "4px 12px", borderRadius: 20,
        background: "linear-gradient(135deg, #059669, #10B981)",
        color: "white", fontSize: 11, fontWeight: 700,
        letterSpacing: "0.5px",
      }}>
        <Icons.check /> MUAF
      </span>
    );
  }

  if (resolvedTier === "review") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "4px 10px", borderRadius: 20,
          background: DS.amberLight, color: DS.amber,
          fontSize: 11, fontWeight: 700, letterSpacing: "0.5px",
          border: "1px solid #FCD34D",
        }}>
          ⏳ İNCELEME
        </span>
        {reason && <span style={{ fontSize: 9, color: DS.amber, maxWidth: 110, textAlign: "center" }}>{reason}</span>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "4px 10px", borderRadius: 20,
        background: DS.redLight, color: DS.red,
        fontSize: 11, fontWeight: 700, letterSpacing: "0.5px",
      }}>
        RED
      </span>
      {reason && <span style={{ fontSize: 9, color: DS.red, maxWidth: 100, textAlign: "center" }}>{reason}</span>}
    </div>
  );
};

// ── Toast / Bildirim ──
const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  var isError = type === "error";
  var bg = isError ? "linear-gradient(135deg, #FEE2E2, #FECACA)" : "linear-gradient(135deg, #D1FAE5, #A7F3D0)";
  var color = isError ? "#991B1B" : "#065F46";
  var borderColor = isError ? "#FECACA" : "#6EE7B7";
  return (
    <div style={{
      padding: "12px 20px", borderRadius: DS.radiusSm, marginBottom: 16,
      background: bg, color: color, fontSize: 13, fontWeight: 500,
      border: "1px solid " + borderColor,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      animation: "fadeInUp 0.3s ease-out",
    }}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{
          background: "none", border: "none", color: color,
          cursor: "pointer", fontSize: 16, fontWeight: 700, padding: "0 0 0 12px",
        }}>&times;</button>
      )}
    </div>
  );
};

// ── Dosya Sürükle-Bırak Alanı (Yeniden Tasarlanmış) ──
const FileDropZone = ({ label, description, accept, onFile, fileName, loading, compact }) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback(function (e) {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length > 0) onFile(e.dataTransfer.files[0]);
  }, [onFile]);

  var isLoaded = !!fileName;
  var height = compact ? 80 : 120;

  return (
    <div
      onDrop={handleDrop}
      onDragOver={function(e) { e.preventDefault(); setDragOver(true); }}
      onDragLeave={function() { setDragOver(false); }}
      onClick={function () { inputRef.current && inputRef.current.click(); }}
      style={{
        border: "2px dashed " + (dragOver ? DS.accent : (isLoaded ? DS.green : DS.border)),
        borderRadius: DS.radius,
        padding: compact ? "12px 16px" : "20px 24px",
        textAlign: "center",
        cursor: "pointer",
        background: dragOver ? DS.accentLight : (isLoaded ? DS.greenBg : "white"),
        transition: "all 0.25s ease",
        minHeight: height,
        display: "flex",
        flexDirection: compact ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 12 : 8,
        position: "relative",
      }}
    >
      <input
        ref={inputRef} type="file"
        accept={accept || ".pdf,.docx,.doc,.xlsx,.xls,.csv"}
        style={{ display: "none" }}
        onChange={function (e) { if (e.target.files[0]) onFile(e.target.files[0]); }}
      />
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            border: "2px solid " + DS.accentLight, borderTopColor: DS.accent,
            animation: "spin 0.8s linear infinite",
          }} />
          <span style={{ color: DS.accent, fontWeight: 600, fontSize: 13 }}>Dosya okunuyor...</span>
        </div>
      ) : isLoaded ? (
        <>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: DS.green, display: "flex",
            alignItems: "center", justifyContent: "center",
            color: "white", flexShrink: 0,
          }}>
            <Icons.check />
          </div>
          <div style={{ textAlign: compact ? "left" : "center" }}>
            <div style={{ fontWeight: 600, color: DS.green, fontSize: 13 }}>{fileName}</div>
            <div style={{ fontSize: 11, color: DS.textMuted, marginTop: 2 }}>Değiştirmek için tıklayın</div>
          </div>
        </>
      ) : (
        <>
          <div style={{ color: DS.textMuted }}><Icons.upload /></div>
          <div>
            <div style={{ fontWeight: 600, color: DS.text, fontSize: 14 }}>{label}</div>
            {description && <div style={{ fontSize: 11, color: DS.textMuted, marginTop: 4, lineHeight: 1.4 }}>{description}</div>}
          </div>
        </>
      )}
    </div>
  );
};

// ── Çoklu Dosya Yükleme Alanı (PDF, maks 25) ──
const MultiFileDropZone = ({ label, description, accept, onFiles, files, loading, maxFiles }) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  var max = maxFiles || 25;

  const handleDrop = useCallback(function (e) {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      var arr = Array.from(e.dataTransfer.files).slice(0, max);
      onFiles(arr);
    }
  }, [onFiles, max]);

  const handleChange = function (e) {
    if (e.target.files.length > 0) {
      var arr = Array.from(e.target.files).slice(0, max);
      onFiles(arr);
    }
  };

  var isLoaded = files && files.length > 0;

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={function(e) { e.preventDefault(); setDragOver(true); }}
        onDragLeave={function() { setDragOver(false); }}
        onClick={function () { inputRef.current && inputRef.current.click(); }}
        style={{
          border: "2px dashed " + (dragOver ? DS.accent : (isLoaded ? DS.green : DS.border)),
          borderRadius: DS.radius,
          padding: "20px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? DS.accentLight : (isLoaded ? DS.greenBg : "white"),
          transition: "all 0.25s ease",
          minHeight: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <input
          ref={inputRef} type="file"
          accept={accept || ".pdf"}
          multiple
          style={{ display: "none" }}
          onChange={handleChange}
        />
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              border: "2px solid " + DS.accentLight, borderTopColor: DS.accent,
              animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ color: DS.accent, fontWeight: 600, fontSize: 13 }}>Dosyalar okunuyor...</span>
          </div>
        ) : isLoaded ? (
          <>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: DS.green, display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "white", flexShrink: 0,
            }}>
              <Icons.check />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: DS.green, fontSize: 13 }}>{files.length} dosya yüklendi</div>
              <div style={{ fontSize: 11, color: DS.textMuted, marginTop: 2 }}>Değiştirmek için tıklayın veya sürükleyin</div>
            </div>
          </>
        ) : (
          <>
            <div style={{ color: DS.textMuted }}><Icons.upload /></div>
            <div>
              <div style={{ fontWeight: 600, color: DS.text, fontSize: 14 }}>{label}</div>
              {description && <div style={{ fontSize: 11, color: DS.textMuted, marginTop: 4, lineHeight: 1.4 }}>{description}</div>}
              <div style={{ fontSize: 11, color: DS.accent, marginTop: 4 }}>Maks. {max} dosya</div>
            </div>
          </>
        )}
      </div>
      {/* Yüklenen dosya listesi */}
      {isLoaded && (
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {files.map(function (f, i) {
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 20,
                background: DS.bg, border: "1px solid " + DS.border,
                fontSize: 11, color: DS.text,
              }}>
                <span style={{ color: DS.accent, fontWeight: 700, fontSize: 10 }}>PDF</span>
                <span>{f.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Adım Göstergesi ──
const StepIndicator = ({ steps, currentStep }) => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
      {steps.map(function(step, i) {
        var isActive = i === currentStep;
        var isCompleted = i < currentStep;
        var isLast = i === steps.length - 1;
        return (
          <React.Fragment key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: isCompleted ? DS.green : (isActive ? DS.accent : DS.borderLight),
                color: isCompleted || isActive ? "white" : DS.textMuted,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700,
                transition: "all 0.3s ease",
                boxShadow: isActive ? "0 0 0 4px " + DS.accentLight : "none",
              }}>
                {isCompleted ? <Icons.check /> : i + 1}
              </div>
              <span style={{
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                color: isActive ? DS.text : (isCompleted ? DS.green : DS.textMuted),
                transition: "all 0.3s",
                whiteSpace: "nowrap",
              }}>{step}</span>
            </div>
            {!isLast && (
              <div style={{
                flex: 1, height: 2, margin: "0 12px",
                background: isCompleted ? DS.green : DS.borderLight,
                borderRadius: 1, minWidth: 32,
                transition: "background 0.3s",
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Section Card ──
const SectionCard = ({ title, subtitle, icon, children, actions, collapsed, onToggle, headerRight }) => {
  return (
    <div style={{
      background: DS.bgCard, borderRadius: DS.radius,
      border: "1px solid " + DS.border,
      boxShadow: DS.shadow, marginBottom: 20,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "16px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: collapsed ? "none" : "1px solid " + DS.borderLight,
        cursor: onToggle ? "pointer" : "default",
      }} onClick={onToggle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {icon && <span style={{ color: DS.accent }}>{icon}</span>}
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: DS.navy }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: DS.textSecondary, marginTop: 2 }}>{subtitle}</div>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {headerRight}
          {actions}
        </div>
      </div>
      {!collapsed && (
        <div style={{ padding: 20 }}>
          {children}
        </div>
      )}
    </div>
  );
};

// ── Buton ──
const Button = ({ children, onClick, variant, disabled, small, icon, style: customStyle }) => {
  var base = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: small ? "6px 14px" : "10px 20px",
    borderRadius: DS.radiusSm, fontSize: small ? 12 : 13,
    fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    border: "none", transition: "all 0.2s ease",
    opacity: disabled ? 0.5 : 1,
    fontFamily: "'Source Sans 3', sans-serif",
  };
  var variants = {
    primary: { background: DS.accent, color: "white" },
    success: { background: DS.green, color: "white" },
    danger: { background: "transparent", color: DS.red, border: "1px solid " + DS.redLight },
    ghost: { background: DS.borderLight, color: DS.textSecondary },
    navy: { background: DS.navy, color: "white" },
  };
  var vStyle = variants[variant || "primary"] || variants.primary;
  return (
    <button onClick={disabled ? undefined : onClick} style={Object.assign({}, base, vStyle, customStyle || {})}>
      {icon}{children}
    </button>
  );
};

// ══════════════════════════════════════════════════════════════
// AYARLAR PANELİ
// ══════════════════════════════════════════════════════════════

const SettingsPanel = ({ courseContents, setCourseContents, gradingSystem, setGradingSystem }) => {
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [loadingGrade, setLoadingGrade] = useState(false);
  const [courseFileName, setCourseFileName] = useState("");
  const [gradeFileName, setGradeFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleCourseFile = async function (file) {
    setLoadingCourse(true); setMsg(null);
    try {
      var result = await extractFromFile(file);
      var courses = result.type === "table" ? parseCoursesFromTable(result.data) : parseCoursesFromText(result.data);
      if (courses.length === 0) { setMsg({ text: "Ders bilgisi bulunamadı. Dosya formatını kontrol edin.", type: "error" }); }
      else { setCourseContents(courses); setCourseFileName(file.name); setMsg({ text: courses.length + " ders içeriği başarıyla yüklendi.", type: "success" }); }
    } catch (err) { setMsg({ text: "Dosya okunurken hata: " + err.message, type: "error" }); }
    setLoadingCourse(false);
  };

  const handleGradeFile = async function (file) {
    setLoadingGrade(true); setMsg(null);
    try {
      var result = await extractFromFile(file);
      var grades = [];
      if (result.type === "table") {
        var sheet = result.data[0];
        if (sheet && sheet.rows.length > 1) {
          for (var r = 1; r < sheet.rows.length; r++) {
            var row = sheet.rows[r];
            if (row[0] && row[1]) grades.push({ input: String(row[0]).trim(), output: String(row[1]).trim() });
          }
        }
      }
      if (grades.length === 0) { setMsg({ text: "Not tablosu bulunamadı. İlk sütun: giriş, ikinci sütun: ÇAKÜ notu olmalı.", type: "error" }); }
      else { setGradingSystem(grades); setGradeFileName(file.name); setMsg({ text: grades.length + " not dönüşüm kuralı yüklendi.", type: "success" }); }
    } catch (err) { setMsg({ text: "Dosya okunurken hata: " + err.message, type: "error" }); }
    setLoadingGrade(false);
  };

  const handleSave = async function () {
    setSaving(true); setMsg(null);
    try {
      if (courseContents.length > 0) await MuafiyetDB.saveCourseContents(courseContents);
      if (gradingSystem && gradingSystem.length > 0) await MuafiyetDB.saveGradingSystem(gradingSystem);
      setMsg({ text: "Ayarlar Firebase'e kaydedildi.", type: "success" });
    } catch (err) { setMsg({ text: "Kaydetme hatası: " + err.message, type: "error" }); }
    setSaving(false);
  };

  return (
    <div>
      {msg && <Toast message={msg.text} type={msg.type} onClose={function() { setMsg(null); }} />}

      <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* ÇAKÜ Ders İçerikleri */}
        <SectionCard title="ÇAKÜ Ders İçerikleri" subtitle="Ders bilgilerini yükleyin (kod, ad, AKTS, haftalık içerik)" icon={<Icons.file />}
          headerRight={courseContents.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: DS.green,
              background: DS.greenLight, padding: "3px 10px", borderRadius: 20,
            }}>{courseContents.length} ders</span>
          )}>
          <FileDropZone label="ÇAKÜ Ders İçerikleri" description="Excel veya PDF/Word formatı" onFile={handleCourseFile} fileName={courseFileName} loading={loadingCourse} />
          {courseContents.length > 0 && (
            <div className="responsive-table-wrap" style={{ marginTop: 16, maxHeight: 280, overflowY: "auto", border: "1px solid " + DS.border, borderRadius: DS.radiusSm }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 500 }}>
                <thead>
                  <tr style={{ background: DS.bg, position: "sticky", top: 0 }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid " + DS.border, fontWeight: 700, color: DS.navy }}>Kod</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid " + DS.border, fontWeight: 700, color: DS.navy }}>Ad</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", borderBottom: "2px solid " + DS.border, fontWeight: 700, color: DS.navy }}>AKTS</th>
                  </tr>
                </thead>
                <tbody>
                  {courseContents.map(function (c, i) {
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid " + DS.borderLight }}>
                        <td style={{ padding: "6px 10px", fontWeight: 600, color: DS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{c.code}</td>
                        <td style={{ padding: "6px 10px", color: DS.text }}>{c.name}</td>
                        <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 600 }}>{c.akts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Not Sistemi */}
        <SectionCard title="Not Dönüşüm Tablosu" subtitle="Özel not sistemi (opsiyonel)" icon={<Icons.sparkle />}
          headerRight={gradingSystem && gradingSystem.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: DS.green,
              background: DS.greenLight, padding: "3px 10px", borderRadius: 20,
            }}>{gradingSystem.length} kural</span>
          )}>
          <FileDropZone label="Not Tablosu Yükle" description="Excel: Sütun 1 = giriş, Sütun 2 = ÇAKÜ notu" onFile={handleGradeFile} fileName={gradeFileName} loading={loadingGrade} />
          {gradingSystem && gradingSystem.length > 0 && (
            <div className="responsive-table-wrap" style={{ marginTop: 16, maxHeight: 200, overflowY: "auto", border: "1px solid " + DS.border, borderRadius: DS.radiusSm }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 400 }}>
                <thead>
                  <tr style={{ background: DS.bg, position: "sticky", top: 0 }}>
                    <th style={{ padding: "8px 10px", textAlign: "center", borderBottom: "2px solid " + DS.border, fontWeight: 700 }}>Giriş</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", borderBottom: "2px solid " + DS.border, fontWeight: 700 }}>ÇAKÜ</th>
                  </tr>
                </thead>
                <tbody>
                  {gradingSystem.map(function (g, i) {
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid " + DS.borderLight }}>
                        <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 600 }}>{g.input}</td>
                        <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 600, color: DS.green }}>{g.output}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: 14, padding: "10px 14px", background: DS.bg, borderRadius: DS.radiusSm, fontSize: 12, color: DS.textSecondary, display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ color: DS.amber, marginTop: 1 }}><Icons.info /></span>
            <span><strong>Varsayılan:</strong> AA→A, BA→B1, BB→B2, CB→B3, CC→C1, DC→C2, DD→C3, FF→F1</span>
          </div>
        </SectionCard>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <Button onClick={handleSave} disabled={saving} variant="success" icon={saving ? null : <Icons.check />}>
          {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
        </Button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// YENİ MUAFİYET (Wizard Akışı)
// ══════════════════════════════════════════════════════════════

const NewExemption = ({ courseContents, gradingSystem, onSave }) => {
  const [step, setStep] = useState(0);
  // Öğrenci bilgileri
  const [studentName, setStudentName] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [otherUni, setOtherUni] = useState("");
  const [otherFaculty, setOtherFaculty] = useState("");
  const [otherDept, setOtherDept] = useState("");
  const [localDept, setLocalDept] = useState("Bilgisayar");
  // Dosya — Alan 1: Ders İçerikleri (çoklu PDF)
  const [contentFiles, setContentFiles] = useState([]);
  const [loadingContentFiles, setLoadingContentFiles] = useState(false);
  const [contentFilesStatus, setContentFilesStatus] = useState([]); // [{name, codeWarning, courses}]
  // Dosya — Alan 2: Dilekçe (tek PDF/Word)
  const [petitionFile, setPetitionFile] = useState("");
  const [loadingPetition, setLoadingPetition] = useState(false);
  const [petitionRows, setPetitionRows] = useState([]); // [{sourceCode, cakuCode, target}]
  // Dosya — Alan 3: Not Karşılıkları (tek PDF)
  const [gradeEquivFile, setGradeEquivFile] = useState("");
  const [loadingGradeEquiv, setLoadingGradeEquiv] = useState(false);
  const [gradeEquivText, setGradeEquivText] = useState("");
  // Birleşik öğrenci dersleri (dilekçe + içerik dosyaları)
  const [studentCoursesFile, setStudentCoursesFile] = useState("");
  const [loadingStudentCourses, setLoadingStudentCourses] = useState(false);
  const [studentCourses, setStudentCourses] = useState([]);
  // Eşleştirme
  const [matches, setMatches] = useState([]);
  const [matching, setMatching] = useState(false);
  const [msg, setMsg] = useState(null);
  // Detay modal
  const [detailMatch, setDetailMatch] = useState(null);

  var targetCourses = courseContents.length > 0 ? courseContents :
    (window.HOME_INSTITUTION_CATALOG ? window.HOME_INSTITUTION_CATALOG.courses.map(function (c) {
      return { code: c.code, name: c.name, akts: String(c.credits), content: "", status: c.type };
    }) : []);

  function convertGradeLocal(inputGrade) {
    if (!inputGrade) return "";
    if (gradingSystem && gradingSystem.length > 0) {
      var found = gradingSystem.find(function (g) { return g.input.toUpperCase() === inputGrade.toString().toUpperCase(); });
      if (found) return found.output;
    }
    return _convertGrade(inputGrade);
  }

  const handleStudentCourses = async function (file) {
    setLoadingStudentCourses(true); setMsg(null);
    try {
      var result = await extractFromFile(file);
      var courses = result.type === "table" ? parseCoursesFromTable(result.data) : parseCoursesFromText(result.data);
      setStudentCourses(courses);
      setStudentCoursesFile(file.name);
      if (courses.length > 0) setMsg({ text: courses.length + " öğrenci dersi başarıyla okundu.", type: "success" });
      else setMsg({ text: "Dosyadan ders bilgisi çıkarılamadı.", type: "error" });
    } catch (err) { setMsg({ text: "Dosya okunamadı: " + err.message, type: "error" }); }
    setLoadingStudentCourses(false);
  };

  // Alan 1: Ders İçerikleri (çoklu PDF) — dosya adı = ders kodu
  const handleContentFiles = async function (files) {
    setLoadingContentFiles(true); setMsg(null);
    setContentFiles(files);
    var statuses = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      // Dosya adından ders kodu çıkar (uzantıyı kaldır)
      var codeFromName = f.name.replace(/\.[^.]+$/, "").trim().toUpperCase().replace(/\s/g, "");
      var codePattern = /^([A-ZÇĞIŞÖÜ]{2,5}\*?\d{3,4})$/;
      var codeWarning = !codePattern.test(codeFromName);
      try {
        var result = await extractFromFile(f);
        var text = result.type === "table"
          ? result.data.map(function(s) { return s.rows.map(function(r) { return r.join(" "); }).join("\n"); }).join("\n")
          : result.data;
        statuses.push({ name: f.name, code: codeFromName, codeWarning: codeWarning, text: text, ok: true });
      } catch (err) {
        statuses.push({ name: f.name, code: codeFromName, codeWarning: codeWarning, text: "", ok: false, error: err.message });
      }
    }
    setContentFilesStatus(statuses);
    // Mevcut studentCourses'u içerik metinleriyle zenginleştir
    setStudentCourses(function (prev) {
      if (prev.length === 0) return prev;
      return prev.map(function (c) {
        var upper = c.code.replace(/\s|\*/g, "").toUpperCase();
        var found = statuses.find(function (s) { return s.code === upper && s.ok; });
        if (found) return Object.assign({}, c, { weeklyContent: found.text });
        return c;
      });
    });
    setLoadingContentFiles(false);
  };

  // Alan 2: Dilekçe (tek PDF/Word) — ÇAKÜ kodlarını çıkar + satır eşleştirme
  const handlePetitionFile = async function (file) {
    setLoadingPetition(true); setMsg(null);
    try {
      var result = await extractFromFile(file);
      var text = result.type === "table"
        ? result.data.map(function(s) { return s.rows.map(function(r) { return r.join(" "); }).join("\n"); }).join("\n")
        : result.data;
      // Satır bazlı eşleştirme (karşı kurum kodu ↔ ÇAKÜ kodu)
      var rows = parsePetitionRows(text, targetCourses);
      // Eğer satır eşleştirmesi bulamadıysa sadece ÇAKÜ kodu araması yap
      if (rows.length === 0) {
        var cakuMatches = parsePetitionDocument(text, targetCourses);
        rows = cakuMatches.map(function (m) {
          return { sourceCode: "", cakuCode: m.cakuCode, target: m.target };
        });
      }
      setPetitionRows(rows);
      setPetitionFile(file.name);
      // Dilekçedeki ÇAKÜ derslerini targetCourses'tan çekerek öğrenci kurs listesini oluştur
      if (rows.length > 0) {
        var courses = rows.map(function (r) {
          return {
            code: r.sourceCode || r.cakuCode,
            name: r.target ? r.target.name : r.cakuCode,
            akts: r.target ? r.target.akts : "",
            grade: "",
            content: r.target ? r.target.content : "",
            weeklyContent: r.target ? r.target.content : "",
            _cakuCode: r.cakuCode,
            _target: r.target,
          };
        });
        setStudentCourses(courses);
        setMsg({ text: rows.length + " ders eşleştirmesi dilekçeden okundu.", type: "success" });
      } else {
        setMsg({ text: "Dilekçeden ders kodu çıkarılamadı.", type: "error" });
      }
    } catch (err) { setMsg({ text: "Dilekçe okunamadı: " + err.message, type: "error" }); }
    setLoadingPetition(false);
  };

  // Alan 3: Not Karşılıkları (tek PDF)
  const handleGradeEquivFile = async function (file) {
    setLoadingGradeEquiv(true); setMsg(null);
    try {
      var result = await extractFromFile(file);
      var text = result.type === "table"
        ? result.data.map(function(s) { return s.rows.map(function(r) { return r.join(" | "); }).join("\n"); }).join("\n")
        : result.data;
      setGradeEquivText(text);
      setGradeEquivFile(file.name);
      setMsg({ text: "Not karşılıkları belgesi yüklendi.", type: "success" });
    } catch (err) { setMsg({ text: "Not karşılıkları okunamadı: " + err.message, type: "error" }); }
    setLoadingGradeEquiv(false);
  };

  const runAutoMatch = function () {
    if (studentCourses.length === 0 || targetCourses.length === 0) return;
    setMatching(true);
    // Eşleştirmeyi setTimeout ile sarmalayarak UI'ın güncellenmesini sağla
    setTimeout(function() {
      var autoMatches = autoMatchCourses(studentCourses, targetCourses);
      var enriched = autoMatches.map(function (m) {
        return Object.assign({}, m, { convertedGrade: m.source.grade ? convertGradeLocal(m.source.grade) : "" });
      });
      setMatches(enriched);
      setMatching(false);
      setStep(2);
      var matchedCount = enriched.filter(function (m) { return m.matched; }).length;
      setMsg({
        text: matchedCount + "/" + enriched.length + " ders eşleştirildi (Eşik: %" + Math.round(SIMILARITY_THRESHOLD * 100) + ")",
        type: "success"
      });
    }, 100);
  };

  const updateMatch = function (index, field, value) {
    setMatches(function (prev) {
      var updated = [...prev];
      if (field === "targetCode") {
        var newTarget = targetCourses.find(function (c) { return c.code === value; });
        updated[index] = Object.assign({}, updated[index], { target: newTarget || null, matched: !!newTarget });
      } else if (field === "convertedGrade") {
        updated[index] = Object.assign({}, updated[index], { convertedGrade: value });
      }
      return updated;
    });
  };

  const handleSave = async function () {
    // Tüm eşleşmeleri kaydet (approved + review); rejected olanları da saklayalım ki
    // admin geçmişe bakabilsin. Word çıktısında sadece approved + admin-confirmed kullanılır.
    var allMatchesForRecord = matches.map(function (m) {
      return {
        source: { code: m.source.code, name: m.source.name, akts: m.source.akts, grade: m.source.grade },
        target: m.target ? { code: m.target.code, name: m.target.name, akts: m.target.akts, status: m.target.status || "" } : null,
        convertedGrade: m.convertedGrade, score: m.contentScore,
        aktsPass: m.aktsPass, tier: m.tier || (m.matched ? "approved" : "rejected"),
        adminDecision: null, adminNote: "",
      };
    });
    var record = {
      studentName: studentName, studentNo: studentNo,
      otherUniversity: otherUni, otherFaculty: otherFaculty,
      otherDepartment: otherDept, localDepartment: localDept,
      matches: allMatchesForRecord,
      pendingReviewCount: allMatchesForRecord.filter(function(m) { return m.tier === "review"; }).length,
      approvedCount:      allMatchesForRecord.filter(function(m) { return m.tier === "approved"; }).length,
    };
    try {
      var saved = await MuafiyetDB.saveRecord(record);
      setMsg({ text: "Muafiyet kaydı başarıyla kaydedildi!", type: "success" });
      if (onSave) onSave(saved);
    } catch (err) { setMsg({ text: "Kaydetme hatası: " + err.message, type: "error" }); }
  };

  const handleExportWord = function () {
    // Word'e sadece onaylanmış (approved) ve admin tarafından kabul edilmiş (review→confirmed) dersler gider
    var exportMatches = matches.filter(function (m) {
      return m.tier === "approved" || m.adminDecision === "confirmed";
    }).map(function (m) {
      return { source: m.source, target: m.target, convertedGrade: m.convertedGrade };
    });
    exportMuafiyetWord({
      studentName: studentName || "xxxxx XXXXX", studentNo: studentNo || "xxxxx",
      otherUniversity: otherUni || "xxxxx Üniversitesi", otherFaculty: otherFaculty || "xxxxx Fakültesi",
      otherDepartment: otherDept || "xxxxx Mühendisliği", localDepartment: localDept || "Bilgisayar",
      matches: exportMatches,
    });
  };

  // Adım geçerlilik kontrolleri
  var step1Valid = studentName.trim().length > 0 && studentNo.trim().length > 0;
  // Dilekçe yüklenmişse (ana belge) adım 2 geçerli
  var step2Valid = petitionFile.length > 0 || studentCourses.length > 0;
  var matchedCount = matches.filter(function(m) { return m.matched; }).length;

  const STEPS = ["Öğrenci Bilgileri", "Belge Yükleme", "Sonuçlar"];

  return (
    <div>
      <StepIndicator steps={STEPS} currentStep={step} />

      {msg && <Toast message={msg.text} type={msg.type} onClose={function() { setMsg(null); }} />}

      {/* ═══ ADIM 1: Öğrenci Bilgileri ═══ */}
      {step === 0 && (
        <SectionCard title="Öğrenci ve Kurum Bilgileri" subtitle="Muafiyet talebinde bulunan öğrencinin bilgilerini girin" icon={<Icons.user />}>
          <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DS.text, marginBottom: 6 }}>
                Öğrenci Adı Soyadı <span style={{ color: DS.red }}>*</span>
              </label>
              <input value={studentName} onChange={function(e) { setStudentName(e.target.value); }}
                placeholder="Örn: Ahmet YILMAZ"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: DS.radiusSm,
                  border: "1px solid " + DS.border, fontSize: 14, fontFamily: "inherit",
                  outline: "none", transition: "border-color 0.2s",
                }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DS.text, marginBottom: 6 }}>
                Öğrenci Numarası <span style={{ color: DS.red }}>*</span>
              </label>
              <input value={studentNo} onChange={function(e) { setStudentNo(e.target.value); }}
                placeholder="Örn: 2024001"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: DS.radiusSm,
                  border: "1px solid " + DS.border, fontSize: 14, fontFamily: "inherit",
                  outline: "none",
                }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DS.text, marginBottom: 6 }}>Karşı Üniversite</label>
              <input value={otherUni} onChange={function(e) { setOtherUni(e.target.value); }}
                placeholder="Örn: Ankara Üniversitesi"
                style={{ width: "100%", padding: "10px 14px", borderRadius: DS.radiusSm, border: "1px solid " + DS.border, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DS.text, marginBottom: 6 }}>Karşı Fakülte</label>
              <input value={otherFaculty} onChange={function(e) { setOtherFaculty(e.target.value); }}
                placeholder="Örn: Mühendislik Fakültesi"
                style={{ width: "100%", padding: "10px 14px", borderRadius: DS.radiusSm, border: "1px solid " + DS.border, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DS.text, marginBottom: 6 }}>Karşı Bölüm</label>
              <input value={otherDept} onChange={function(e) { setOtherDept(e.target.value); }}
                placeholder="Örn: Bilgisayar Mühendisliği"
                style={{ width: "100%", padding: "10px 14px", borderRadius: DS.radiusSm, border: "1px solid " + DS.border, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DS.text, marginBottom: 6 }}>ÇAKÜ Bölümü</label>
              <input value={localDept} onChange={function(e) { setLocalDept(e.target.value); }}
                placeholder="Örn: Bilgisayar"
                style={{ width: "100%", padding: "10px 14px", borderRadius: DS.radiusSm, border: "1px solid " + DS.border, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            </div>
          </div>

          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={function() { setStep(1); }} disabled={!step1Valid} variant="primary">
              Devam Et →
            </Button>
          </div>
        </SectionCard>
      )}

      {/* ═══ ADIM 2: Belge Yükleme ═══ */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* ── Alan 1: Dilekçe ── */}
          <SectionCard
            title="Dilekçe"
            subtitle="Muaf olunmak istenen derslerin listelendiği belge (PDF veya Word)"
            icon={<Icons.file />}
          >
            <FileDropZone
              label="Dilekçeyi Buraya Sürükleyin veya Tıklayın"
              description="PDF veya Word formatında dilekçe. Belgeden ÇAKÜ ders kodları otomatik çıkarılır."
              accept=".pdf,.docx,.doc"
              onFile={handlePetitionFile}
              fileName={petitionFile}
              loading={loadingPetition}
            />

            {/* Ders Eşleştirme Tablosu */}
            {petitionRows.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: DS.navy,
                  marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <Icons.check />
                  Ders Eşleştirme Tablosu — {petitionRows.length} kayıt
                </div>
                <div className="responsive-table-wrap" style={{ maxHeight: 240, overflowY: "auto", border: "1px solid " + DS.border, borderRadius: DS.radiusSm }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 520 }}>
                    <thead>
                      <tr style={{ background: DS.bg, position: "sticky", top: 0 }}>
                        <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid " + DS.border, fontWeight: 700, color: DS.navy }}>Karşı Kurum Kodu</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid " + DS.border, fontWeight: 700, color: DS.navy }}>ÇAKÜ Kodu</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid " + DS.border, fontWeight: 700, color: DS.navy }}>ÇAKÜ Ders Adı</th>
                        <th style={{ padding: "8px 10px", textAlign: "center", borderBottom: "2px solid " + DS.border, fontWeight: 700, color: DS.navy }}>AKTS</th>
                        <th style={{ padding: "8px 10px", textAlign: "center", borderBottom: "2px solid " + DS.border, fontWeight: 700, color: DS.navy }}>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {petitionRows.map(function (r, i) {
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid " + DS.borderLight }}>
                            <td style={{ padding: "6px 10px", fontWeight: 600, color: DS.textSecondary, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{r.sourceCode || "—"}</td>
                            <td style={{ padding: "6px 10px", fontWeight: 600, color: DS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{r.cakuCode}</td>
                            <td style={{ padding: "6px 10px", color: DS.text }}>{r.target ? r.target.name : <span style={{ color: DS.textMuted, fontStyle: "italic" }}>Bulunamadı</span>}</td>
                            <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 600 }}>{r.target ? r.target.akts : "—"}</td>
                            <td style={{ padding: "6px 10px", textAlign: "center" }}>
                              {r.target
                                ? <span style={{ color: DS.green, fontSize: 11, fontWeight: 700 }}>✓ Eşleşti</span>
                                : <span style={{ color: DS.amber, fontSize: 11, fontWeight: 700 }}>? Bulunamadı</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── Alan 2: Ders İçerikleri ── */}
          <SectionCard
            title="Ders İçerikleri"
            subtitle="Muaf olunmak istenen derslerin haftalık içeriklerini gösteren PDF dosyaları"
            icon={<Icons.file />}
          >
            <div style={{
              padding: "10px 14px", borderRadius: DS.radiusSm,
              background: DS.amberLight, border: "1px solid " + DS.amber + "44",
              display: "flex", alignItems: "flex-start", gap: 8,
              marginBottom: 14, fontSize: 12, color: DS.amber, lineHeight: 1.5,
            }}>
              <Icons.info />
              <span>Her PDF dosyasının adı, ilgili ders kodunu içermelidir. Örn: <strong>CSE301.pdf</strong>, <strong>BM401.pdf</strong></span>
            </div>
            <MultiFileDropZone
              label="Ders İçerik PDF Dosyalarını Sürükleyin veya Seçin"
              description="Birden fazla PDF dosyası seçebilirsiniz. Her dosya adı ders koduna karşılık gelmelidir."
              accept=".pdf,.docx,.doc"
              onFiles={handleContentFiles}
              files={contentFiles}
              loading={loadingContentFiles}
              maxFiles={25}
            />

            {/* İçerik durumu */}
            {contentFilesStatus.length > 0 && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                {contentFilesStatus.map(function (s, i) {
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 12px", borderRadius: DS.radiusSm,
                      background: s.ok ? DS.greenBg : DS.redLight,
                      border: "1px solid " + (s.ok ? DS.green + "44" : DS.red + "44"),
                      fontSize: 12,
                    }}>
                      <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: s.ok ? DS.green : DS.red, minWidth: 80 }}>{s.code}</span>
                      <span style={{ color: DS.textSecondary, flex: 1 }}>{s.name}</span>
                      {s.codeWarning && (
                        <span style={{ color: DS.amber, fontSize: 11 }}>⚠ Kod formatı kontrol edilsin</span>
                      )}
                      {!s.ok && <span style={{ color: DS.red, fontSize: 11 }}>✕ {s.error}</span>}
                      {s.ok && <span style={{ color: DS.green, fontSize: 11 }}>✓ Okundu</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* ── Alan 3: Not Karşılıkları ── */}
          <SectionCard
            title="Not Karşılıkları"
            subtitle="Karşı kurumun not sistemini ÇAKÜ notlarına dönüştürmek için not karşılıkları belgesi"
            icon={<Icons.file />}
          >
            <FileDropZone
              label="Not Karşılıkları Belgesini Yükleyin"
              description="Karşı kurumun harf notlarını veya puan aralıklarını içeren PDF. NLP eşleştirme aşamasında kullanılır."
              accept=".pdf,.docx,.doc"
              onFile={handleGradeEquivFile}
              fileName={gradeEquivFile}
              loading={loadingGradeEquiv}
            />
            {gradeEquivText && (
              <div style={{
                marginTop: 12, padding: "8px 12px", borderRadius: DS.radiusSm,
                background: DS.bg, border: "1px solid " + DS.border,
                fontSize: 11, color: DS.textSecondary, maxHeight: 100,
                overflowY: "auto", whiteSpace: "pre-wrap", lineHeight: 1.6,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {gradeEquivText.substring(0, 500)}{gradeEquivText.length > 500 ? "..." : ""}
              </div>
            )}
          </SectionCard>

          {/* ── Devam Butonları ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8 }}>
            <Button onClick={function() { setStep(0); }} variant="ghost">← Geri</Button>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {targetCourses.length === 0 && (
                <div style={{ display: "flex", alignItems: "center", fontSize: 12, color: DS.amber, gap: 4 }}>
                  <Icons.info /> Ayarlar'dan ÇAKÜ derslerini yükleyin
                </div>
              )}
              <Button
                onClick={runAutoMatch}
                disabled={!step2Valid || targetCourses.length === 0 || matching}
                variant="navy"
                icon={matching ? null : <Icons.sparkle />}
              >
                {matching ? "Analiz yapılıyor..." : "NLP Eşleştirme Başlat"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ADIM 3: Sonuçlar ═══ */}
      {step === 2 && matches.length > 0 && (
        <div>
          {/* Özet Kartları */}
          {(() => {
            var reviewCount   = matches.filter(function(m) { return m.tier === "review"; }).length;
            var rejectedCount = matches.filter(function(m) { return m.tier === "rejected"; }).length;
            return null; // sadece değişkenleri tanımlamak için IIFE
          })()}
          <div className="responsive-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Toplam Ders", value: matches.length, color: DS.navy, bg: DS.bg },
              { label: "Otomatik Muaf", value: matchedCount, color: DS.green, bg: DS.greenBg,
                sub: "≥%80 eşleşme" },
              { label: "İnceleme Bekliyor", value: matches.filter(function(m) { return m.tier === "review"; }).length,
                color: DS.amber, bg: DS.amberLight, sub: "%60–79 eşleşme" },
              { label: "Red", value: matches.filter(function(m) { return m.tier === "rejected"; }).length,
                color: DS.red, bg: DS.redLight, sub: "<%60 eşleşme" },
            ].map(function(stat, i) {
              return (
                <div key={i} style={{
                  padding: "16px 20px", borderRadius: DS.radius,
                  background: stat.bg, border: "1px solid " + DS.border,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: stat.color, fontFamily: "'JetBrains Mono', monospace" }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: DS.textSecondary, marginTop: 4, fontWeight: 500 }}>{stat.label}</div>
                  {stat.sub && <div style={{ fontSize: 10, color: stat.color, marginTop: 2, opacity: 0.75 }}>{stat.sub}</div>}
                </div>
              );
            })}
          </div>

          {/* Eşleştirme Tablosu */}
          <SectionCard title="Eşleştirme Sonuçları" subtitle={"Her satırı inceleyip gerekirse düzeltebilirsiniz"}
            icon={<Icons.search />}
            headerRight={
              <span style={{ fontSize: 11, color: DS.textMuted }}>
                Ad:{Math.round(W_NAME*100)}% + İçerik:{Math.round(W_CONTENT*100)}% + Kod:{Math.round(W_CODE*100)}%
              </span>
            }
          >
            <div style={{ overflowX: "auto" }}>
              {matches.map(function (m, idx) {
                return (
                  <div key={idx} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 16px",
                    borderRadius: DS.radiusSm,
                    background: m.tier === "approved" ? "white" : m.tier === "review" ? "#FFFBEB" : "#FFF5F5",
                    border: "1px solid " + (m.tier === "approved" ? DS.border : m.tier === "review" ? "#FCD34D" : "#FECACA"),
                    marginBottom: 10,
                    transition: "all 0.2s",
                    flexWrap: "wrap",
                  }}>
                    {/* Kaynak Ders */}
                    <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: DS.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Kaynak Ders</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                          fontWeight: 600, color: DS.accent,
                          background: DS.accentLight, padding: "2px 8px", borderRadius: 4,
                        }}>{m.source.code}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: DS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.source.name}</span>
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11, color: DS.textSecondary }}>
                        <span>AKTS: <strong>{m.source.akts || "—"}</strong></span>
                        <span>Not: <strong>{m.source.grade || "—"}</strong></span>
                      </div>
                    </div>

                    {/* Ok */}
                    <div style={{ flex: "0 0 28px", display: "flex", justifyContent: "center" }}>
                      <Icons.arrow />
                    </div>

                    {/* Hedef Ders (Düzenlenebilir) */}
                    <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: DS.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>ÇAKÜ Eşleşme</div>
                      <select
                        value={m.target ? m.target.code : ""}
                        onChange={function (e) { updateMatch(idx, "targetCode", e.target.value); }}
                        style={{
                          width: "100%", padding: "7px 10px", fontSize: 12, borderRadius: 6,
                          border: "1px solid " + DS.border, background: "white", cursor: "pointer",
                          fontFamily: "inherit", color: m.target ? DS.text : DS.textMuted,
                        }}
                      >
                        <option value="">— Ders seçin —</option>
                        {targetCourses.map(function (c) {
                          return <option key={c.code} value={c.code}>{c.code} — {c.name}</option>;
                        })}
                      </select>
                      {m.target && (
                        <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11, color: DS.textSecondary, alignItems: "center" }}>
                          <span>AKTS: <strong>{m.target.akts || "—"}</strong></span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            Dönüşen Not:
                            <input
                              type="text" value={m.convertedGrade}
                              onChange={function (e) { updateMatch(idx, "convertedGrade", e.target.value); }}
                              style={{
                                width: 40, padding: "2px 4px", fontSize: 11, fontWeight: 600,
                                border: "1px solid " + DS.border, borderRadius: 4, textAlign: "center",
                                color: DS.green, fontFamily: "'JetBrains Mono', monospace",
                              }}
                            />
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Skor Göstergeleri */}
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      {/* AKTS */}
                      <div style={{ textAlign: "center" }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: "50%",
                          background: m.aktsPass ? DS.greenLight : DS.redLight,
                          color: m.aktsPass ? DS.green : DS.red,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700,
                        }}>
                          {m.aktsPass ? "✓" : "✗"}
                        </div>
                        <span style={{ fontSize: 9, color: DS.textMuted }}>AKTS</span>
                      </div>
                      <ScoreBadge value={m.nameScore || 0} size="sm" label="Ad" />
                      <ScoreBadge value={m.detailContentScore || 0} size="sm" label="İçerik" />
                      <ScoreBadge value={m.contentScore} size="lg" label="Toplam" />
                    </div>

                    {/* Sonuç */}
                    <div style={{ flex: "0 0 100px", display: "flex", justifyContent: "center" }}>
                      <StatusPill matched={m.matched} tier={m.tier} reason={m.rejectReason} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Aksiyon Butonları */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <Button onClick={function() { setStep(1); }} variant="ghost">← Geri</Button>
            <div style={{ display: "flex", gap: 10 }}>
              <Button onClick={handleSave} variant="success" icon={<Icons.check />}>
                Kaydet
              </Button>
              <Button onClick={handleExportWord} variant="primary" icon={<Icons.download />}>
                Word İndir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Eşleştirme Animasyonu */}
      {matching && (
        <div style={{
          padding: 60, textAlign: "center",
          background: DS.bgCard, borderRadius: DS.radius,
          border: "1px solid " + DS.border, boxShadow: DS.shadow,
        }}>
          <div style={{
            width: 48, height: 48, margin: "0 auto 16px",
            borderRadius: "50%", border: "3px solid " + DS.accentLight,
            borderTopColor: DS.accent, animation: "spin 0.8s linear infinite",
          }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: DS.navy, marginBottom: 8 }}>NLP Analizi Yapılıyor</div>
          <div style={{ fontSize: 13, color: DS.textSecondary }}>
            TF-IDF, N-gram, Jaccard benzerlik hesaplanıyor...
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// GEÇMİŞ KAYITLAR
// ══════════════════════════════════════════════════════════════

// ── İnceleme Paneli ── (admin insan onayı)
const ReviewPanel = ({ record, onDecision }) => {
  const [reviewing, setReviewing] = useState(false);
  const pendingMatches = (record.matches || []).filter(function(m) {
    return m.tier === "review" && !m.adminDecision;
  });
  if (pendingMatches.length === 0) return null;

  return (
    <div style={{
      marginTop: 12, padding: "14px 16px", borderRadius: DS.radiusSm,
      background: "#FFFBEB", border: "1px solid #FCD34D",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: DS.amber, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <span>⏳</span> {pendingMatches.length} ders insan onayı bekliyor
      </div>
      {(record.matches || []).map(function(m, idx) {
        if (m.tier !== "review") return null;
        var decided = m.adminDecision;
        return (
          <div key={idx} style={{
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            padding: "8px 10px", marginBottom: 6, borderRadius: DS.radiusSm,
            background: decided ? (decided === "confirmed" ? DS.greenBg : DS.redLight) : "white",
            border: "1px solid " + (decided ? (decided === "confirmed" ? DS.greenLight : DS.redLight) : DS.border),
            fontSize: 12,
          }}>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <span style={{ fontWeight: 700, color: DS.navy }}>{m.source.code}</span>
              <span style={{ color: DS.textSecondary, marginLeft: 6 }}>{m.source.name}</span>
              <span style={{
                marginLeft: 8, fontSize: 10, fontWeight: 600,
                color: DS.amber, background: DS.amberLight,
                padding: "1px 6px", borderRadius: 10,
              }}>%{Math.round((m.score || 0) * 100)} eşleşme</span>
            </div>
            <div style={{ fontSize: 11, color: DS.textMuted, flex: "1 1 150px", minWidth: 0 }}>
              {m.target ? ("→ " + m.target.code + " " + m.target.name) : "→ Eşleşme yok"}
            </div>
            {decided ? (
              <span style={{
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: decided === "confirmed" ? DS.greenLight : DS.redLight,
                color: decided === "confirmed" ? DS.green : DS.red,
              }}>
                {decided === "confirmed" ? "✓ Onaylandı" : "✗ Reddedildi"}
              </span>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  disabled={reviewing}
                  onClick={async function() {
                    setReviewing(true);
                    await onDecision(record.id, idx, "confirmed");
                    setReviewing(false);
                  }}
                  style={{
                    padding: "4px 12px", borderRadius: 20, border: "none",
                    background: DS.green, color: "white",
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>Onayla</button>
                <button
                  disabled={reviewing}
                  onClick={async function() {
                    setReviewing(true);
                    await onDecision(record.id, idx, "rejected");
                    setReviewing(false);
                  }}
                  style={{
                    padding: "4px 12px", borderRadius: 20, border: "none",
                    background: DS.red, color: "white",
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>Reddet</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const ExemptionHistory = ({ records, loading, onDelete, onExportWord, onUpdateDecision }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedReview, setExpandedReview] = useState(null);

  var filtered = records.filter(function(r) {
    if (!searchTerm) return true;
    var term = searchTerm.toLowerCase();
    return (r.studentName || "").toLowerCase().includes(term) ||
           (r.studentNo || "").toLowerCase().includes(term) ||
           (r.otherUniversity || "").toLowerCase().includes(term);
  });

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, margin: "0 auto 16px",
          borderRadius: "50%", border: "3px solid " + DS.accentLight,
          borderTopColor: DS.accent, animation: "spin 0.8s linear infinite",
        }} />
        <div style={{ color: DS.textSecondary, fontSize: 14 }}>Kayıtlar yükleniyor...</div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div style={{
        padding: 60, textAlign: "center",
        background: DS.bgCard, borderRadius: DS.radius,
        border: "1px solid " + DS.border,
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: DS.navy, marginBottom: 8 }}>Henüz kayıt yok</div>
        <div style={{ fontSize: 13, color: DS.textSecondary }}>Yeni muafiyet işlemi yaparak ilk kaydınızı oluşturun.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Arama */}
      <div style={{ marginBottom: 20, position: "relative" }}>
        <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: DS.textMuted }}>
          <Icons.search />
        </div>
        <input
          value={searchTerm}
          onChange={function(e) { setSearchTerm(e.target.value); }}
          placeholder="İsim, numara veya üniversite ile arayın..."
          style={{
            width: "100%", padding: "12px 14px 12px 40px",
            borderRadius: DS.radiusSm, border: "1px solid " + DS.border,
            fontSize: 14, fontFamily: "inherit", outline: "none",
            background: "white",
          }}
        />
      </div>

      {/* Kayıt Kartları */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(function (rec) {
          var matchCount = (rec.matches || []).length;
          var dateStr = rec.createdAt ? (rec.createdAt._seconds ? new Date(rec.createdAt._seconds * 1000) : new Date(rec.createdAt)).toLocaleDateString("tr-TR") : "";
          var isExpanded = expandedReview === rec.id;
          return (
            <div key={rec.id} style={{
              borderRadius: DS.radius,
              background: DS.bgCard, border: "1px solid " + (rec.pendingReviewCount > 0 ? "#FCD34D" : DS.border),
              boxShadow: DS.shadow,
              overflow: "hidden",
              transition: "box-shadow 0.2s",
            }}>
              {/* Kart Başlığı */}
              <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: "50%",
                    background: "linear-gradient(135deg, " + DS.navy + ", " + DS.navyLight + ")",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: 15, fontWeight: 700,
                  }}>
                    {(rec.studentName || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: DS.navy, fontSize: 15 }}>
                      {rec.studentName || "İsimsiz"}
                      <span style={{ fontWeight: 400, color: DS.textMuted, marginLeft: 8, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>
                        #{rec.studentNo || "-"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: DS.textSecondary, marginTop: 3, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <span>{rec.otherUniversity || "—"}</span>
                      <span style={{
                        background: DS.greenLight, color: DS.green,
                        padding: "1px 8px", borderRadius: 12, fontWeight: 600, fontSize: 11,
                      }}>{matchCount} ders</span>
                      {(rec.pendingReviewCount > 0) && (
                        <span style={{
                          background: DS.amberLight, color: DS.amber,
                          padding: "1px 8px", borderRadius: 12, fontWeight: 600, fontSize: 11,
                          cursor: "pointer", border: "1px solid #FCD34D",
                        }} onClick={function(e) { e.stopPropagation(); setExpandedReview(isExpanded ? null : rec.id); }}>
                          ⏳ {rec.pendingReviewCount} inceleme {isExpanded ? "▲" : "▼"}
                        </span>
                      )}
                      {dateStr && <span style={{ color: DS.textMuted }}>{dateStr}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button small variant="ghost" onClick={function () { onExportWord(rec); }} icon={<Icons.download />}>
                    Word
                  </Button>
                  <Button small variant="danger" onClick={function () {
                    if (confirm("Bu kaydı silmek istediğinizden emin misiniz?")) onDelete(rec.id);
                  }} icon={<Icons.trash />}>
                    Sil
                  </Button>
                </div>
              </div>

              {/* İnceleme Paneli (genişletilebilir) */}
              {isExpanded && onUpdateDecision && (
                <div style={{ padding: "0 20px 16px" }}>
                  <ReviewPanel
                    record={rec}
                    onDecision={async function(recId, matchIdx, decision) {
                      await onUpdateDecision(recId, matchIdx, decision);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && searchTerm && (
        <div style={{ padding: 40, textAlign: "center", color: DS.textMuted, fontSize: 14 }}>
          "{searchTerm}" ile eşleşen kayıt bulunamadı.
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// ANA MODÜL
// ══════════════════════════════════════════════════════════════

function DersMuafiyetApp({ currentUser, activeDepartment, departmentInfo }) {
  const [activeTab, setActiveTab] = useState("yeni");
  const [courseContents, setCourseContents] = useState([]);
  const [gradingSystem, setGradingSystem] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  useEffect(function () {
    async function loadData() {
      try {
        var contents = await MuafiyetDB.fetchCourseContents();
        if (contents.length > 0) setCourseContents(contents);
        var grading = await MuafiyetDB.fetchGradingSystem();
        if (grading) setGradingSystem(grading);
        var allRecs = await MuafiyetDB.fetchRecords();
        // Bölüm bazlı filtreleme: departmentId'si olmayan veriler bilgisayar bölümüne ait
        var recs = allRecs.filter(function (r) {
          var deptId = r.departmentId || "bilgisayar";
          return deptId === activeDepartment;
        });
        setRecords(recs);
      } catch (err) { console.error("Muafiyet verileri yüklenirken hata:", err); }
      setRecordsLoading(false);
    }
    loadData();
  }, [activeDepartment]);

  const handleDeleteRecord = async function (id) {
    try {
      await MuafiyetDB.deleteRecord(id);
      setRecords(function (prev) { return prev.filter(function (r) { return r.id !== id; }); });
    } catch (err) { alert("Silme hatası: " + err.message); }
  };

  const handleUpdateDecision = async function (recordId, matchIndex, decision) {
    try {
      var updatedMatches = await MuafiyetDB.updateMatchDecision(recordId, matchIndex, decision, "");
      // Kayıtları güncelle
      setRecords(function (prev) {
        return prev.map(function (r) {
          if (r.id !== recordId) return r;
          var pendingLeft = updatedMatches.filter(function(m) {
            return m.tier === "review" && !m.adminDecision;
          }).length;
          return Object.assign({}, r, { matches: updatedMatches, pendingReviewCount: pendingLeft });
        });
      });
    } catch (err) { alert("Karar güncellenemedi: " + err.message); }
  };

  return (
    <div className="portal-bg">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .muafiyet-tab-btn { position: relative; }
        .muafiyet-tab-btn::after {
          content: ''; position: absolute; bottom: -2px; left: 50%; width: 0; height: 3px;
          background: ${DS.accent}; border-radius: 2px; transition: all 0.25s ease;
          transform: translateX(-50%);
        }
        .muafiyet-tab-btn.active::after { width: 100%; }
        .muafiyet-tab-btn:hover { background: ${DS.bg}; }
        input:focus, select:focus { border-color: ${DS.accent} !important; box-shadow: 0 0 0 3px ${DS.accentLight}; }
      `}</style>

      <div className="portal-wrap">
        {/* Başlık */}
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{
              fontSize: 26, fontWeight: 800, color: DS.navy,
              fontFamily: "'Playfair Display', serif", marginBottom: 4,
              letterSpacing: "-0.5px",
            }}>Ders Muafiyet</h1>
            <p style={{ color: DS.textSecondary, fontSize: 13 }}>
              NLP tabanlı otomatik ders eşleştirme ve muafiyet belgesi oluşturma
            </p>
          </div>
          {courseContents.length > 0 && (
            <div style={{
              fontSize: 12, color: DS.green, background: DS.greenBg,
              padding: "6px 14px", borderRadius: 20, fontWeight: 600,
              border: "1px solid " + DS.greenLight,
            }}>
              {courseContents.length} ÇAKÜ dersi yüklü
            </div>
          )}
        </div>

        {/* Tab Bar */}
        <div style={{
          display: "flex", gap: 2, marginBottom: 28,
          borderBottom: "2px solid " + DS.borderLight,
        }}>
          {MUAFIYET_TABS.map(function (tab) {
            var isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={"muafiyet-tab-btn" + (isActive ? " active" : "")}
                onClick={function () { setActiveTab(tab.id); }}
                style={{
                  padding: "12px 20px",
                  border: "none",
                  background: "transparent",
                  color: isActive ? DS.navy : DS.textMuted,
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  borderRadius: "8px 8px 0 0",
                  fontFamily: "'Source Sans 3', sans-serif",
                  transition: "all 0.2s",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {tab.id === "yeni" && <span style={{ fontSize: 15 }}>＋</span>}
                {tab.id === "gecmis" && <span style={{ fontSize: 14 }}>📋</span>}
                {tab.id === "ayarlar" && <span style={{ color: isActive ? DS.navy : DS.textMuted }}><Icons.settings /></span>}
                {tab.label}
                {tab.id === "gecmis" && records.length > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: isActive ? DS.accent : DS.borderLight,
                    color: isActive ? "white" : DS.textMuted,
                    padding: "1px 7px", borderRadius: 10,
                  }}>{records.length}</span>
                )}
                {tab.id === "gecmis" && records.some(function(r) { return r.pendingReviewCount > 0; }) && (
                  <span style={{
                    fontSize: 9, fontWeight: 700,
                    background: DS.amberLight, color: DS.amber,
                    padding: "1px 5px", borderRadius: 10,
                    border: "1px solid #FCD34D",
                  }}>⏳</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab İçeriği */}
        {activeTab === "ayarlar" && (
          <SettingsPanel courseContents={courseContents} setCourseContents={setCourseContents}
            gradingSystem={gradingSystem} setGradingSystem={setGradingSystem} />
        )}
        {activeTab === "yeni" && (
          <NewExemption courseContents={courseContents} gradingSystem={gradingSystem}
            onSave={function(saved) { setRecords(function(prev) { return [saved, ...prev]; }); }} />
        )}
        {activeTab === "gecmis" && (
          <ExemptionHistory records={records} loading={recordsLoading}
            onDelete={handleDeleteRecord}
            onExportWord={function (rec) { exportMuafiyetWord(rec); }}
            onUpdateDecision={handleUpdateDecision} />
        )}
      </div>
    </div>
  );
}

// ── Window'a export ──
window.DersMuafiyetApp = DersMuafiyetApp;

// NLP motoru paylaşımı
window.MuafiyetUtils = {
  normalizeText, tokenize, tokenizeStemmed, turkishStem, expandWithSynonyms,
  jaccardSimilarity, softJaccardSimilarity, ngramSimilarity, tfidfCosineSimilarity,
  contentSimilarity, combinedSimilarity, courseNameSimilarity, courseCodeSimilarity,
  multiFactorScore, levenshteinDistance, wordSimilarity,
  charNgrams, wordBigrams, autoMatchCourses,
  extractFromFile, parseCoursesFromTable, parseCoursesFromText, ensureLibsLoaded,
  FileDropZone,
  TR_STOPWORDS, DOMAIN_SYNONYMS,
  SIMILARITY_THRESHOLD, THRESHOLD_AUTO_APPROVE, THRESHOLD_REVIEW,
  W_NAME, W_CONTENT, W_CODE,
};
