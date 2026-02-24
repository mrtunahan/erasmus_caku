// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Ders Muafiyet Modülü
// Belge yükleme, otomatik içerik eşleştirme, Word çıktısı
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useCallback } = React;

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
  { id: "ayarlar", label: "Ayarlar" },
  { id: "yeni", label: "Yeni Muafiyet" },
  { id: "gecmis", label: "Geçmiş Kayıtlar" },
];

// Türkçe stopwords - benzerlik hesabında göz ardı edilecek (genişletilmiş)
const TR_STOPWORDS = new Set([
  // Türkçe bağlaçlar ve edatlar
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
  // İngilizce stopwords
  "the", "and", "of", "in", "to", "for", "on", "with", "at", "by",
  "an", "are", "is", "as", "from", "that", "which", "or", "be",
  "it", "its", "has", "have", "this", "these", "those", "such",
  "will", "can", "may", "would", "should", "could", "been", "being",
  "was", "were", "not", "but", "also", "more", "than", "each",
  "about", "into", "through", "between", "their", "other",
  // Akademik jargon (anlam taşımayan)
  "ders", "konu", "hafta", "week", "topic", "lecture", "course",
  "saat", "hour", "lab", "laboratuvar", "uygulama", "teori",
]);

// ── Alan-Spesifik Eşanlamlılar Sözlüğü (CS/Mühendislik) ──
const DOMAIN_SYNONYMS = {
  // Programlama
  "programlama": ["programming", "kodlama", "coding", "yazılım geliştirme"],
  "programming": ["programlama", "kodlama", "coding"],
  "kodlama": ["programlama", "programming", "coding"],
  // Veri yapıları & Algoritmalar
  "algoritma": ["algorithm", "algorithms"],
  "algorithm": ["algoritma"],
  "veri yapıları": ["data structures", "veri yapısı"],
  "data structures": ["veri yapıları", "veri yapısı"],
  "veri yapısı": ["data structure", "veri yapıları"],
  // Veritabanı
  "veritabanı": ["database", "veritaban", "veri tabanı", "db"],
  "database": ["veritabanı", "veri tabanı"],
  "veri tabanı": ["veritabanı", "database"],
  // İşletim Sistemleri
  "işletim sistemi": ["operating system", "os"],
  "işletim sistemleri": ["operating systems"],
  "operating system": ["işletim sistemi", "işletim sistemleri"],
  "operating systems": ["işletim sistemleri"],
  // Ağlar
  "bilgisayar ağları": ["computer networks", "ağ", "network"],
  "computer networks": ["bilgisayar ağları"],
  "ağ": ["network", "bilgisayar ağları"],
  "network": ["ağ", "bilgisayar ağları"],
  // Yazılım Mühendisliği
  "yazılım mühendisliği": ["software engineering"],
  "software engineering": ["yazılım mühendisliği"],
  "yazılım": ["software"],
  "software": ["yazılım"],
  // Yapay Zeka & ML
  "yapay zeka": ["artificial intelligence", "ai"],
  "artificial intelligence": ["yapay zeka"],
  "makine öğrenmesi": ["machine learning", "ml"],
  "machine learning": ["makine öğrenmesi", "makine öğrenme"],
  "derin öğrenme": ["deep learning"],
  "deep learning": ["derin öğrenme"],
  "sinir ağı": ["neural network", "sinir ağları"],
  "neural network": ["sinir ağı", "sinir ağları"],
  // Matematik
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
  // Fizik & Elektronik
  "fizik": ["physics"],
  "physics": ["fizik"],
  "elektronik": ["electronics", "electronic"],
  "electronics": ["elektronik"],
  "devre": ["circuit", "devreler"],
  "circuit": ["devre", "devreler"],
  // Web & Mobil
  "web": ["internet", "web programlama", "web tasarım"],
  "mobil": ["mobile"],
  "mobile": ["mobil"],
  // Güvenlik
  "güvenlik": ["security", "siber güvenlik"],
  "security": ["güvenlik", "siber güvenlik"],
  "siber güvenlik": ["cybersecurity", "cyber security", "güvenlik"],
  // Mimari
  "bilgisayar mimarisi": ["computer architecture"],
  "computer architecture": ["bilgisayar mimarisi"],
  "mikroişlemci": ["microprocessor", "mikroişlemciler"],
  "microprocessor": ["mikroişlemci", "mikroişlemciler"],
  // Genel CS
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

// ── Türkçe Kök Bulma (Suffix Stripping) ──
const TR_SUFFIXES = [
  // Uzun ekler (önce kontrol)
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
  // En uzun eşleşen eki bul ve kaldır (minimum 2 karakter kök kalmalı)
  for (var i = 0; i < TR_SUFFIXES.length; i++) {
    var suffix = TR_SUFFIXES[i];
    if (stemmed.length > suffix.length + 2 && stemmed.endsWith(suffix)) {
      stemmed = stemmed.slice(0, stemmed.length - suffix.length);
      break; // Sadece bir ek kaldır (aggressive stemming'den kaçın)
    }
  }
  return stemmed;
}

// Varsayılan benzerlik eşiği (%70 birleşik skor gerekli — daha hassas çoklu faktör)
const SIMILARITY_THRESHOLD = 0.70;
const AKTS_CHECK_ENABLED = true;

// Ağırlık sabitleri
const W_NAME = 0.35;       // Ders adı benzerliği ağırlığı
const W_CONTENT = 0.55;    // İçerik benzerliği ağırlığı
const W_CODE = 0.10;       // Ders kodu benzerliği ağırlığı

// ══════════════════════════════════════════════════════════════
// KÜTÜPHANELERİ YÜKLEME (pdf.js, mammoth.js, SheetJS)
// ══════════════════════════════════════════════════════════════

function loadScript(url) {
  return new Promise(function (resolve, reject) {
    if (document.querySelector('script[src="' + url + '"]')) {
      resolve();
      return;
    }
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
  // pdf.js
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  // mammoth.js (DOCX parser)
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
  // SheetJS (XLSX parser) - might already be loaded from sinav module
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
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

async function extractFromFile(file) {
  await ensureLibsLoaded();
  var name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    var text = await extractTextFromPDF(file);
    return { type: "text", data: text };
  } else if (name.endsWith(".docx") || name.endsWith(".doc")) {
    var text = await extractTextFromDOCX(file);
    return { type: "text", data: text };
  } else if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
    var sheets = await extractDataFromXLSX(file);
    return { type: "table", data: sheets };
  }
  throw new Error("Desteklenmeyen dosya formatı: " + name);
}

// ══════════════════════════════════════════════════════════════
// YAPISAL VERİ PARSE ETME
// ══════════════════════════════════════════════════════════════

// Tablo verisinden ders listesi çıkar (XLSX/CSV)
function parseCoursesFromTable(sheets) {
  var courses = [];
  sheets.forEach(function (sheet) {
    var rows = sheet.rows;
    if (rows.length < 2) return;

    // Başlık satırını bul
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
          // Haftalık ders içeriği sütunu (öncelikli)
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

    // Eğer başlık bulunamadıysa, ilk satırı başlık kabul et
    if (headerIdx === -1 && rows.length > 1) {
      headerIdx = 0;
      // İlk satırdaki sütunları indexle
      if (rows[0].length >= 2) {
        colMap.code = 0;
        colMap.name = 1;
        if (rows[0].length >= 3) colMap.akts = 2;
        if (rows[0].length >= 4) colMap.grade = 3;
        if (rows[0].length >= 5) colMap.weeklyContent = 4;
      }
    }

    // Veri satırlarını oku
    for (var r = headerIdx + 1; r < rows.length; r++) {
      var row = rows[r];
      var code = colMap.code !== undefined ? String(row[colMap.code] || "").trim() : "";
      var name = colMap.name !== undefined ? String(row[colMap.name] || "").trim() : "";
      if (!code && !name) continue;
      var course = {
        code: code,
        name: name,
        akts: colMap.akts !== undefined ? String(row[colMap.akts] || "").trim() : "",
        grade: colMap.grade !== undefined ? String(row[colMap.grade] || "").trim() : "",
        content: colMap.content !== undefined ? String(row[colMap.content] || "").trim() : "",
        weeklyContent: colMap.weeklyContent !== undefined ? String(row[colMap.weeklyContent] || "").trim() : "",
        status: colMap.status !== undefined ? String(row[colMap.status] || "").trim() : "",
      };
      courses.push(course);
    }
  });
  return courses;
}

// Serbest metinden ders listesi çıkarmaya çalış (PDF/DOCX)
function parseCoursesFromText(text) {
  var courses = [];
  var lines = text.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);

  // Ders kodu: Satır başı, 2-5 harf, opsiyonel boşluk, 3-4 rakam
  // Örn: BIL101, MAT 101, ECON202
  var codePattern = /^([A-ZÇĞİÖŞÜa-zçğıöşü]{2,5}\s?\d{3,4})(.*)$/;

  var currentCourse = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    // Sayfa numarası veya ÇAKÜ başlıklarını atla (basit filtre)
    if (line.match(/^\d+$/) || line.includes("ÇANKIRI KARATEKİN")) continue;

    var match = line.match(codePattern);
    if (match) {
      // Yeni ders bulundu -> Öncekini kaydet
      if (currentCourse) {
        courses.push(currentCourse);
      }

      var code = match[1].replace(/\s/g, ""); // Kod (boşluksuz)
      var rest = match[2].trim(); // Satırın geri kalanı

      // Satırın geri kalanından AKTS ve Not bulmaya çalış
      var aktsMatch = rest.match(/(\d+)\s*(AKTS|ECTS|kredi|credit)/i);
      var akts = aktsMatch ? aktsMatch[1] : "";

      var gradeMatch = rest.match(/\b(AA|BA|BB|CB|CC|DC|DD|FF|FD|[A-F][+-]?)\b/);
      var grade = gradeMatch ? gradeMatch[1] : "";

      // İsim: AKTS ve Not kısımlarını temizle
      var name = rest
        .replace(/(\d+)\s*(AKTS|ECTS|kredi|credit)/gi, "")
        .replace(/\b(AA|BA|BB|CB|CC|DC|DD|FF|FD|[A-F][+-]?)\b/g, "")
        .replace(/[|,;]/g, " ") // Ayıraçları temizle
        .trim();

      // İsmi temizle (başındaki/sonundaki tire vs)
      name = name.replace(/^[-–:\s]+|[-–:\s]+$/g, "");

      currentCourse = {
        code: code,
        name: name,
        akts: akts,
        grade: grade,
        content: "",       // Eski alan uyumluluğu
        weeklyContent: ""  // Yeni detaylı içerik
      };
    } else if (currentCourse) {
      // Mevcut dersin devamı
      // Eğer AKTS henüz bulunamadıysa ve bu satırda varsa al
      if (!currentCourse.akts) {
        var aktsMatch = line.match(/(\d+)\s*(AKTS|ECTS|kredi|credit)/i);
        if (aktsMatch) currentCourse.akts = aktsMatch[1];
      }

      // İçeriğe ekle - Haftalık ders içeriklerini yakalamak için tüm metni biriktiriyoruz
      currentCourse.weeklyContent += (currentCourse.weeklyContent ? " " : "") + line;
    }
  }
  // Son dersi ekle
  if (currentCourse) {
    courses.push(currentCourse);
  }

  return courses;
}

// ══════════════════════════════════════════════════════════════
// GELİŞMİŞ NLP METİN BENZERLİĞİ MOTORU
// Türkçe kök bulma, N-gram, TF-IDF, eşanlamlı genişletme,
// Levenshtein mesafesi, çok faktörlü skor
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

// Temel tokenize (stopword çıkarma + min uzunluk filtresi)
function tokenize(text) {
  var normalized = normalizeText(text);
  return normalized.split(" ").filter(function (w) {
    return w.length > 1 && !TR_STOPWORDS.has(w);
  });
}

// Stemmed tokenize (Türkçe kök bulma uygulanmış)
function tokenizeStemmed(text) {
  return tokenize(text).map(function (w) { return turkishStem(w); });
}

// ── Eşanlamlı Genişletme ──
// Bir metni tokenize edip eşanlamlılarını da dahil eder
function expandWithSynonyms(tokens) {
  var expanded = new Set(tokens);
  tokens.forEach(function (token) {
    // Tek kelime eşanlamlıları
    if (DOMAIN_SYNONYMS[token]) {
      DOMAIN_SYNONYMS[token].forEach(function (syn) {
        normalizeText(syn).split(" ").forEach(function (w) {
          if (w.length > 1) expanded.add(w);
        });
      });
    }
  });
  // İki kelimelik terimleri de kontrol et
  var fullText = tokens.join(" ");
  Object.keys(DOMAIN_SYNONYMS).forEach(function (key) {
    if (key.includes(" ") && fullText.includes(key)) {
      DOMAIN_SYNONYMS[key].forEach(function (syn) {
        normalizeText(syn).split(" ").forEach(function (w) {
          if (w.length > 1) expanded.add(w);
        });
      });
    }
  });
  return Array.from(expanded);
}

// ── N-gram Üretici ──
// Karakter seviyesinde n-gram üretir (fuzzy matching için)
function charNgrams(text, n) {
  if (!n) n = 2;
  var normalized = normalizeText(text);
  var grams = new Set();
  for (var i = 0; i <= normalized.length - n; i++) {
    grams.add(normalized.substring(i, i + n));
  }
  return grams;
}

// Kelime seviyesinde bigram üretir
function wordBigrams(tokens) {
  var bigrams = new Set();
  for (var i = 0; i < tokens.length - 1; i++) {
    bigrams.add(tokens[i] + " " + tokens[i + 1]);
  }
  return bigrams;
}

// ── Levenshtein Mesafesi ──
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  var matrix = [];
  for (var i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (var j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (var i = 1; i <= b.length; i++) {
    for (var j = 1; j <= a.length; j++) {
      var cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

// Levenshtein tabanlı kelime benzerliği (0-1 arası)
function wordSimilarity(word1, word2) {
  if (!word1 || !word2) return 0;
  var maxLen = Math.max(word1.length, word2.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(word1, word2) / maxLen;
}

// ── Jaccard Benzerlik Katsayısı (Stemmed + Synonym) ──
function jaccardSimilarity(text1, text2) {
  var tokens1 = tokenizeStemmed(text1);
  var tokens2 = tokenizeStemmed(text2);
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  // Eşanlamlı genişletme
  var exp1 = expandWithSynonyms(tokens1);
  var exp2 = expandWithSynonyms(tokens2);

  var set1 = new Set(exp1);
  var set2 = new Set(exp2);
  var intersection = 0;
  set1.forEach(function (t) { if (set2.has(t)) intersection++; });
  var union = new Set([...exp1, ...exp2]).size;
  return union > 0 ? intersection / union : 0;
}

// ── N-gram Benzerliği ──
// Karakter bigram Jaccard benzerliği (yazım hatalarına dayanıklı)
function ngramSimilarity(text1, text2) {
  var grams1 = charNgrams(text1, 2);
  var grams2 = charNgrams(text2, 2);
  if (grams1.size === 0 || grams2.size === 0) return 0;

  var intersection = 0;
  grams1.forEach(function (g) { if (grams2.has(g)) intersection++; });
  var union = new Set([...grams1, ...grams2]).size;
  return union > 0 ? intersection / union : 0;
}

// ── TF-IDF Kosinüs Benzerliği ──
// Corpus olarak her iki metin kullanılır (IDF hesabı için)
function tfidfCosineSimilarity(text1, text2) {
  var tokens1 = tokenizeStemmed(text1);
  var tokens2 = tokenizeStemmed(text2);
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  // Eşanlamlı genişletme
  tokens1 = expandWithSynonyms(tokens1);
  tokens2 = expandWithSynonyms(tokens2);

  // TF hesapla
  var tf1 = {}, tf2 = {};
  tokens1.forEach(function (t) { tf1[t] = (tf1[t] || 0) + 1; });
  tokens2.forEach(function (t) { tf2[t] = (tf2[t] || 0) + 1; });

  // Normalize TF (frekans / max frekans)
  var max1 = Math.max.apply(null, Object.values(tf1));
  var max2 = Math.max.apply(null, Object.values(tf2));
  var ntf1 = {}, ntf2 = {};
  Object.keys(tf1).forEach(function (t) { ntf1[t] = 0.5 + 0.5 * tf1[t] / max1; });
  Object.keys(tf2).forEach(function (t) { ntf2[t] = 0.5 + 0.5 * tf2[t] / max2; });

  // IDF hesapla (2 doküman: text1 ve text2)
  var allTerms = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
  var idf = {};
  var N = 2; // 2 doküman
  allTerms.forEach(function (term) {
    var df = 0;
    if (tf1[term]) df++;
    if (tf2[term]) df++;
    idf[term] = Math.log(N / df) + 1; // Smoothed IDF
  });

  // TF-IDF vektörleri ile kosinüs
  var dotProduct = 0, mag1 = 0, mag2 = 0;
  allTerms.forEach(function (term) {
    var v1 = (ntf1[term] || 0) * idf[term];
    var v2 = (ntf2[term] || 0) * idf[term];
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  });
  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);
  return mag1 > 0 && mag2 > 0 ? dotProduct / (mag1 * mag2) : 0;
}

// ── Soft Jaccard (Levenshtein tabanlı fuzzy eşleşme) ──
// Tam eşleşme yerine %85+ benzer kelimeleri de sayar
function softJaccardSimilarity(text1, text2) {
  var tokens1 = tokenizeStemmed(text1);
  var tokens2 = tokenizeStemmed(text2);
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  var matched = 0;
  var used = new Set();
  tokens1.forEach(function (t1) {
    var bestScore = 0;
    var bestIdx = -1;
    tokens2.forEach(function (t2, idx) {
      if (used.has(idx)) return;
      var sim = wordSimilarity(t1, t2);
      if (sim > bestScore) { bestScore = sim; bestIdx = idx; }
    });
    if (bestScore >= 0.85) {
      matched += bestScore;
      if (bestIdx >= 0) used.add(bestIdx);
    }
  });
  var total = Math.max(tokens1.length, tokens2.length);
  return total > 0 ? matched / total : 0;
}

// ── Ders Adı Benzerliği ──
// Ders adları kısa olduğu için özel işlem: n-gram + soft Jaccard + eşanlamlı
function courseNameSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  var n1 = normalizeText(name1);
  var n2 = normalizeText(name2);

  // Tam eşleşme
  if (n1 === n2) return 1.0;

  // Birinin diğerini içermesi
  if (n1.includes(n2) || n2.includes(n1)) return 0.90;

  // N-gram benzerliği (karakter seviyesi — yazım farklarına dayanıklı)
  var ngSim = ngramSimilarity(name1, name2);

  // Soft Jaccard (kelime seviyesi — fuzzy)
  var sjSim = softJaccardSimilarity(name1, name2);

  // Stemmed Jaccard (eşanlamlı genişletme ile)
  var jSim = jaccardSimilarity(name1, name2);

  // Ağırlıklı birleşim
  return ngSim * 0.25 + sjSim * 0.35 + jSim * 0.40;
}

// ── Ders Kodu Benzerliği ──
// Ders kodlarını karşılaştır (BIL101 vs CS101, MTH vs MAT)
function courseCodeSimilarity(code1, code2) {
  if (!code1 || !code2) return 0;
  var c1 = normalizeText(code1).replace(/\s/g, "");
  var c2 = normalizeText(code2).replace(/\s/g, "");
  if (c1 === c2) return 1.0;

  // Sayısal kısmı ayır
  var num1 = c1.replace(/[^0-9]/g, "");
  var num2 = c2.replace(/[^0-9]/g, "");
  var prefix1 = c1.replace(/[0-9]/g, "");
  var prefix2 = c2.replace(/[0-9]/g, "");

  var score = 0;
  // Aynı numara ise bazı benzerlik
  if (num1 && num2 && num1 === num2) score += 0.3;
  // Aynı yüzler basamağı (ders seviyesi)
  if (num1.length >= 1 && num2.length >= 1 && num1[0] === num2[0]) score += 0.2;
  // Prefix benzerliği
  score += wordSimilarity(prefix1, prefix2) * 0.5;

  return Math.min(score, 1.0);
}

// ── Birleşik İçerik Benzerliği ──
// TF-IDF Cosine + Jaccard + N-gram karması
function contentSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;

  var tfidf = tfidfCosineSimilarity(text1, text2);
  var jaccard = jaccardSimilarity(text1, text2);
  var ngram = ngramSimilarity(text1, text2);

  // Ağırlıklı birleşim: TF-IDF en güvenilir, n-gram en kaba
  return tfidf * 0.50 + jaccard * 0.35 + ngram * 0.15;
}

// ── Çok Faktörlü Birleşik Skor ──
// Ders adı + İçerik + Kod birleşik skoru
function combinedSimilarity(text1, text2) {
  // Basit kullanım için geriye uyumlu (sadece içerik)
  return contentSimilarity(text1, text2);
}

// Çok faktörlü tam karşılaştırma
function multiFactorScore(srcCourse, tgtCourse) {
  var nameScore = courseNameSimilarity(srcCourse.name, tgtCourse.name);
  var codeScore = courseCodeSimilarity(srcCourse.code, tgtCourse.code);

  var srcText = srcCourse.weeklyContent || srcCourse.content || "";
  var tgtText = tgtCourse.weeklyContent || tgtCourse.content || "";
  var contScore = 0;
  if (srcText && tgtText) {
    contScore = contentSimilarity(srcText, tgtText);
  }

  // Eğer içerik yoksa ağırlıkları yeniden dağıt
  var wName = W_NAME;
  var wContent = W_CONTENT;
  var wCode = W_CODE;
  if (!srcText || !tgtText) {
    // İçerik yoksa: isim %75, kod %25
    wName = 0.75;
    wContent = 0;
    wCode = 0.25;
  }

  var total = wName * nameScore + wContent * contScore + wCode * codeScore;

  return {
    total: total,
    nameScore: nameScore,
    contentScore: contScore,
    codeScore: codeScore,
  };
}

// ══════════════════════════════════════════════════════════════
// OTOMATİK DERS EŞLEŞTİRME (Çok Faktörlü NLP)
// ══════════════════════════════════════════════════════════════

function autoMatchCourses(sourceCourses, targetCourses, threshold) {
  if (!threshold) threshold = SIMILARITY_THRESHOLD;
  var matches = [];

  sourceCourses.forEach(function (src) {
    var bestMatch = null;
    var bestTotalScore = 0;
    var bestScoreDetails = { total: 0, nameScore: 0, contentScore: 0, codeScore: 0 };
    var bestAktsPass = false;
    var bestRejectReason = "";

    targetCourses.forEach(function (tgt) {
      // ═══ Adım 1: AKTS Kontrolü ═══
      var srcAkts = parseInt(src.akts) || 0;
      var tgtAkts = parseInt(tgt.akts) || 0;
      var aktsPass = !AKTS_CHECK_ENABLED || srcAkts >= tgtAkts;

      // ═══ Adım 2: Çok Faktörlü NLP Skoru ═══
      var scores = multiFactorScore(src, tgt);

      // En iyi eşleşmeyi seç (önce AKTS geçen, sonra en yüksek toplam skor)
      var isBetter = false;
      if (aktsPass && !bestAktsPass) {
        isBetter = true;
      } else if (aktsPass === bestAktsPass && scores.total > bestTotalScore) {
        isBetter = true;
      }

      if (isBetter) {
        bestTotalScore = scores.total;
        bestScoreDetails = scores;
        bestAktsPass = aktsPass;
        bestMatch = tgt;
      }
    });

    // Sonuç değerlendirme
    var isMatched = bestAktsPass && bestTotalScore >= threshold;
    if (!bestAktsPass) {
      bestRejectReason = "AKTS yetersiz";
    } else if (bestTotalScore < threshold) {
      bestRejectReason = "Benzerlik düşük (" + Math.round(bestTotalScore * 100) + "%)";
    }

    matches.push({
      source: src,
      target: bestMatch,
      aktsPass: bestAktsPass,
      contentScore: bestTotalScore,        // Geriye uyumlu (toplam skor)
      nameScore: bestScoreDetails.nameScore,
      detailContentScore: bestScoreDetails.contentScore,
      codeScore: bestScoreDetails.codeScore,
      matched: isMatched,
      rejectReason: bestRejectReason,
    });
  });

  return matches;
}

// ══════════════════════════════════════════════════════════════
// FIREBASE CRUD
// ══════════════════════════════════════════════════════════════

var MuafiyetDB = {
  settingsRef: function () {
    return window.FirebaseDB.db() ? window.FirebaseDB.db().collection("muafiyet_settings") : null;
  },
  recordsRef: function () {
    return window.FirebaseDB.db() ? window.FirebaseDB.db().collection("muafiyet_records") : null;
  },

  // ÇAKÜ ders içerikleri kaydet
  async saveCourseContents(contents) {
    var ref = this.settingsRef();
    if (!ref) throw new Error("Firebase bağlantısı yok");
    await ref.doc("course_contents").set({
      courses: contents,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    });
  },
  async fetchCourseContents() {
    var ref = this.settingsRef();
    if (!ref) return [];
    var doc = await ref.doc("course_contents").get();
    return doc.exists ? (doc.data().courses || []) : [];
  },

  // Not sistemi kaydet
  async saveGradingSystem(system) {
    var ref = this.settingsRef();
    if (!ref) throw new Error("Firebase bağlantısı yok");
    await ref.doc("grading_system").set({
      grades: system,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    });
  },
  async fetchGradingSystem() {
    var ref = this.settingsRef();
    if (!ref) return null;
    var doc = await ref.doc("grading_system").get();
    return doc.exists ? (doc.data().grades || null) : null;
  },

  // Muafiyet kaydı CRUD
  async saveRecord(record) {
    var ref = this.recordsRef();
    if (!ref) throw new Error("Firebase bağlantısı yok");
    var id = record.id;
    var data = Object.assign({}, record);
    delete data.id;
    if (id) {
      await ref.doc(String(id)).update(Object.assign({}, data, {
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      }));
      return record;
    } else {
      var docRef = await ref.add(Object.assign({}, data, {
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      }));
      return Object.assign({}, record, { id: docRef.id });
    }
  },
  async fetchRecords() {
    var ref = this.recordsRef();
    if (!ref) return [];
    var snapshot = await ref.orderBy("createdAt", "desc").get();
    return snapshot.docs.map(function (doc) { return Object.assign({}, doc.data(), { id: doc.id }); });
  },
  async deleteRecord(id) {
    var ref = this.recordsRef();
    if (!ref) throw new Error("Firebase bağlantısı yok");
    await ref.doc(String(id)).delete();
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

  // Tablo satırları oluştur
  var dataRows = "";
  var totalAktsSource = 0;
  var totalAktsTarget = 0;

  // En az 8 satır göster
  var rowCount = Math.max(matches.length, 8);
  for (var i = 0; i < rowCount; i++) {
    var m = matches[i] || {};
    var src = m.source || {};
    var tgt = m.target || {};

    var srcCode = src.code || "";
    var srcName = src.name || "";
    var srcAkts = src.akts || "";
    var srcGrade = src.grade || "";

    var tgtCode = tgt.code || "";
    var tgtName = tgt.name || "";
    var tgtAkts = tgt.akts || "";
    var tgtGrade = m.convertedGrade || "";
    var tgtStatus = tgt.status || tgt.type || "";

    if (srcAkts) totalAktsSource += parseInt(srcAkts) || 0;
    if (tgtAkts) totalAktsTarget += parseInt(tgtAkts) || 0;

    dataRows += '<tr>' +
      // Source Side (4 cols)
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + srcCode + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + srcName + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + srcAkts + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + srcGrade + '</td>' +
      // Target Side (5 cols)
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + tgtCode + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + tgtName + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + tgtAkts + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + tgtGrade + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' + tgtStatus + '</td>' +
      '</tr>';
  }

  var localDept = record.localDepartment || "Bilgisayar";

  var html = '\uFEFF' +
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><style>' +
    'body { font-family: "Times New Roman", Times, serif; font-size: 12pt; }' +
    'table { border-collapse: collapse; width: 100%; table-layout: fixed; }' +
    'td, th { border: 1px solid black; padding: 4px; font-family: "Times New Roman", Times, serif; }' +
    '</style></head><body>' +

    // Header Info
    '<p style="font-family:Times New Roman;font-size:12pt;text-align:justify;line-height:1.5;margin-bottom:12pt;">' +
    'Bölümümüz <b>' + studentNo + '</b> numaralı öğrencisi <b>' + studentName + '\'nun</b>, ' +
    'ders muafiyet talebi hakkında vermiş olduğu dilekçesi incelenmiş olup, ' +
    '<b>Çankırı Karatekin Üniversitesi Önlisans ve Lisans Eğitim Öğretim Yönetmeliğinin 12. maddesi</b> ' +
    'uyarınca aşağıda tabloda verildiği gibi uygun olduğuna ve gereği için Fakültemiz ilgili kurullarında ' +
    'görüşülmek üzere Dekanlık Makamına sunulmasına,</p>' +

    // Table
    '<table>' +
    // HEADERS
    '<tr>' +
    // Source Header (4 cols)
    '<td colspan="4" style="border:1px solid black;padding:6px;text-align:center;font-weight:bold;font-size:11pt;">' +
    '<u>' + otherUni + ' ' + otherFaculty + ' ' + otherDept + '<br/>Bölümünden Aldığı Dersin</u></td>' +
    // Target Header (5 cols)
    '<td colspan="5" style="border:1px solid black;padding:6px;text-align:center;font-weight:bold;font-size:11pt;">' +
    '<u>Çankırı Karatekin Üniversitesi Mühendislik Fakültesi ' + localDept + '<br/>Mühendisliği Bölümünde Muaf Olacağı Dersin</u></td>' +
    '</tr>' +
    '<tr>' +
    // Source Cols
    '<td style="width:10%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Kodu</td>' +
    '<td style="width:25%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Adı</td>' +
    '<td style="width:6%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">AKTS</td>' +
    '<td style="width:7%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Başarı<br/>Notu</td>' +
    // Target Cols
    '<td style="width:10%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Kodu</td>' +
    '<td style="width:25%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Adı</td>' +
    '<td style="width:6%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">AKTS</td>' +
    '<td style="width:7%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Başarı<br/>Notu</td>' +
    '<td style="width:10%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Statüsü</td>' +
    '</tr>' +

    // DATA
    dataRows +

    // FOOTER (Totals)
    '<tr>' +
    '<td style="border:1px solid black;"></td>' +
    '<td style="border:1px solid black;text-align:center;font-weight:bold;"><u>Toplam</u></td>' +
    '<td style="border:1px solid black;text-align:center;font-weight:bold;">' + (totalAktsSource || "X") + '</td>' +
    '<td style="border:1px solid black;"></td>' +

    '<td style="border:1px solid black;"></td>' +
    '<td style="border:1px solid black;text-align:center;font-weight:bold;"><u>Toplam</u></td>' +
    '<td style="border:1px solid black;text-align:center;font-weight:bold;">' + (totalAktsTarget || "X") + '</td>' +
    '<td style="border:1px solid black;"></td>' +
    '<td style="border:1px solid black;"></td>' +
    '</tr>' +

    '</table>' +
    '</body></html>';

  var blob = new Blob([html], { type: "application/msword;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "Ders_Muafiyet_" + studentNo + ".doc";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════
// UI BİLEŞENLERİ
// ══════════════════════════════════════════════════════════════

// Dosya Sürükle-Bırak Alanı
const FileDropZone = ({ label, accept, onFile, fileName, loading }) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback(function (e) {
    e.preventDefault();
    setDragOver(false);
    var files = e.dataTransfer.files;
    if (files.length > 0) onFile(files[0]);
  }, [onFile]);

  const handleDragOver = useCallback(function (e) {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(function () {
    setDragOver(false);
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={function () { inputRef.current && inputRef.current.click(); }}
      style={{
        border: "2px dashed " + (dragOver ? _C.navy : (fileName ? _C.green : _C.border)),
        borderRadius: 12,
        padding: 24,
        textAlign: "center",
        cursor: "pointer",
        background: dragOver ? _C.blueLight : (fileName ? _C.greenLight : _C.bg),
        transition: "all 0.2s",
        minHeight: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept || ".pdf,.docx,.doc,.xlsx,.xls,.csv"}
        style={{ display: "none" }}
        onChange={function (e) { if (e.target.files[0]) onFile(e.target.files[0]); }}
      />
      {loading ? (
        <div style={{ color: _C.navy, fontWeight: 600 }}>Dosya okunuyor...</div>
      ) : fileName ? (
        <>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={_C.green} strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <div style={{ fontWeight: 600, color: _C.green }}>{fileName}</div>
          <div style={{ fontSize: 12, color: _C.textMuted }}>Tekrar yüklemek için tıklayın</div>
        </>
      ) : (
        <>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={_C.textMuted} strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div style={{ fontWeight: 600, color: _C.navy }}>{label}</div>
          <div style={{ fontSize: 12, color: _C.textMuted }}>PDF, Word veya Excel dosyası sürükleyin veya tıklayın</div>
        </>
      )}
    </div>
  );
};

// ── Ayarlar Paneli ──
const SettingsPanel = ({ courseContents, setCourseContents, gradingSystem, setGradingSystem }) => {
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [loadingGrade, setLoadingGrade] = useState(false);
  const [courseFileName, setCourseFileName] = useState("");
  const [gradeFileName, setGradeFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const handleCourseFile = async function (file) {
    setLoadingCourse(true);
    try {
      var result = await extractFromFile(file);
      var courses = [];
      if (result.type === "table") {
        courses = parseCoursesFromTable(result.data);
      } else {
        courses = parseCoursesFromText(result.data);
      }
      if (courses.length === 0) {
        setMsg("Ders bilgisi bulunamadı. Dosya formatını kontrol edin.");
      } else {
        setCourseContents(courses);
        setCourseFileName(file.name);
        setMsg(courses.length + " ders içeriği yüklendi.");
      }
    } catch (err) {
      console.error(err);
      setMsg("Dosya okunurken hata: " + err.message);
    }
    setLoadingCourse(false);
  };

  const handleGradeFile = async function (file) {
    setLoadingGrade(true);
    try {
      var result = await extractFromFile(file);
      var grades = [];
      if (result.type === "table") {
        // İlk sheet'ten not tablosu oku
        var sheet = result.data[0];
        if (sheet && sheet.rows.length > 1) {
          for (var r = 1; r < sheet.rows.length; r++) {
            var row = sheet.rows[r];
            if (row[0] && row[1]) {
              grades.push({ input: String(row[0]).trim(), output: String(row[1]).trim() });
            }
          }
        }
      }
      if (grades.length === 0) {
        setMsg("Not tablosu bulunamadı. İlk sütun: giriş notu, ikinci sütun: ÇAKÜ notu olmalı.");
      } else {
        setGradingSystem(grades);
        setGradeFileName(file.name);
        setMsg(grades.length + " not dönüşüm kuralı yüklendi.");
      }
    } catch (err) {
      console.error(err);
      setMsg("Dosya okunurken hata: " + err.message);
    }
    setLoadingGrade(false);
  };

  const handleSaveSettings = async function () {
    setSaving(true);
    try {
      if (courseContents.length > 0) {
        await MuafiyetDB.saveCourseContents(courseContents);
      }
      if (gradingSystem && gradingSystem.length > 0) {
        await MuafiyetDB.saveGradingSystem(gradingSystem);
      }
      setMsg("Ayarlar Firebase'e kaydedildi.");
    } catch (err) {
      setMsg("Kaydetme hatası: " + err.message);
    }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* ÇAKÜ Ders İçerikleri */}
        <_Card title="ÇAKÜ Ders İçerikleri">
          <p style={{ fontSize: 13, color: _C.textMuted, marginBottom: 16 }}>
            ÇAKÜ Bilgisayar Mühendisliği ders bilgilerini (kod, ad, AKTS, haftalık içerik) yükleyin.
            Excel veya PDF/Word formatında yükleyebilirsiniz. (PDF için ders kodu ile başlayan bloklar aranır)
          </p>
          <FileDropZone
            label="ÇAKÜ Ders İçerikleri Yükle"
            onFile={handleCourseFile}
            fileName={courseFileName}
            loading={loadingCourse}
          />
          {courseContents.length > 0 && (
            <div style={{ marginTop: 16, maxHeight: 300, overflowY: "auto", border: "1px solid " + _C.border, borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: _C.bg }}>
                    <th style={{ padding: 8, textAlign: "left", borderBottom: "2px solid " + _C.border }}>Kod</th>
                    <th style={{ padding: 8, textAlign: "left", borderBottom: "2px solid " + _C.border }}>Ad</th>
                    <th style={{ padding: 8, textAlign: "center", borderBottom: "2px solid " + _C.border }}>AKTS</th>
                    <th style={{ padding: 8, textAlign: "left", borderBottom: "2px solid " + _C.border }}>Haftalık İçerik</th>
                  </tr>
                </thead>
                <tbody>
                  {courseContents.map(function (c, i) {
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid " + _C.borderLight }}>
                        <td style={{ padding: 6, fontWeight: 600 }}>{c.code}</td>
                        <td style={{ padding: 6 }}>{c.name}</td>
                        <td style={{ padding: 6, textAlign: "center" }}>{c.akts}</td>
                        <td style={{ padding: 6, fontSize: 11, color: _C.textMuted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.weeklyContent || c.content || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </_Card>

        {/* Not Sistemi */}
        <_Card title="Not Dönüşüm Sistemi">
          <p style={{ fontSize: 13, color: _C.textMuted, marginBottom: 16 }}>
            Sabit not dönüşüm tablosunu yükleyin. Excel formatında: 1. sütun giriş notu, 2. sütun ÇAKÜ notu.
            Yüklenmezse varsayılan sistem (AA→A, BA→B1, BB→B2...) kullanılır.
          </p>
          <FileDropZone
            label="Not Sistemi Yükle"
            onFile={handleGradeFile}
            fileName={gradeFileName}
            loading={loadingGrade}
          />
          {gradingSystem && gradingSystem.length > 0 && (
            <div style={{ marginTop: 16, maxHeight: 300, overflowY: "auto", border: "1px solid " + _C.border, borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: _C.bg }}>
                    <th style={{ padding: 8, textAlign: "center", borderBottom: "2px solid " + _C.border }}>Giriş Notu</th>
                    <th style={{ padding: 8, textAlign: "center", borderBottom: "2px solid " + _C.border }}>ÇAKÜ Notu</th>
                  </tr>
                </thead>
                <tbody>
                  {gradingSystem.map(function (g, i) {
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid " + _C.borderLight }}>
                        <td style={{ padding: 6, textAlign: "center", fontWeight: 600 }}>{g.input}</td>
                        <td style={{ padding: 6, textAlign: "center", color: _C.green, fontWeight: 600 }}>{g.output}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 16, padding: 12, background: _C.bg, borderRadius: 8, fontSize: 12, color: _C.textMuted }}>
            <strong>Varsayılan sistem:</strong> AA→A, BA→B1, BB→B2, CB→B3, CC→C1, DC→C2, DD→C3, FF→F1
          </div>
        </_Card>
      </div>

      {msg && (
        <div style={{
          padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13,
          background: msg.includes("hata") || msg.includes("bulunamadı") ? "#FEE2E2" : _C.greenLight,
          color: msg.includes("hata") || msg.includes("bulunamadı") ? "#991B1B" : "#166534",
        }}>{msg}</div>
      )}

      <_Btn onClick={handleSaveSettings} disabled={saving} variant="success">
        {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
      </_Btn>
    </div>
  );
};

// ── Yeni Muafiyet İşlemi ──
const NewExemption = ({ courseContents, gradingSystem, onSave }) => {
  // Öğrenci bilgileri
  const [studentName, setStudentName] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [otherUni, setOtherUni] = useState("");
  const [otherFaculty, setOtherFaculty] = useState("");
  const [otherDept, setOtherDept] = useState("");
  const [localDept, setLocalDept] = useState("Bilgisayar");

  // Dosya yükleme
  const [studentCoursesFile, setStudentCoursesFile] = useState("");
  const [loadingStudentCourses, setLoadingStudentCourses] = useState(false);

  // Parse edilen veriler
  const [studentCourses, setStudentCourses] = useState([]);

  // Eşleştirme sonuçları
  const [matches, setMatches] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // Mesajlar
  const [msg, setMsg] = useState("");

  // ÇAKÜ müfredatı (yüklenen ders içerikleri veya varsayılan katalog)
  var targetCourses = courseContents.length > 0 ? courseContents :
    (window.HOME_INSTITUTION_CATALOG ? window.HOME_INSTITUTION_CATALOG.courses.map(function (c) {
      return { code: c.code, name: c.name, akts: String(c.credits), content: "", status: c.type };
    }) : []);

  // Not dönüştürme
  function convertGradeLocal(inputGrade) {
    if (!inputGrade) return "";
    // Önce yüklenmiş sisteme bak
    if (gradingSystem && gradingSystem.length > 0) {
      var found = gradingSystem.find(function (g) {
        return g.input.toUpperCase() === inputGrade.toString().toUpperCase();
      });
      if (found) return found.output;
    }
    // Yoksa varsayılan convertGrade kullan
    return _convertGrade(inputGrade);
  }

  // Öğrenci ders bilgileri dosyasını yükle
  const handleStudentCourses = async function (file) {
    setLoadingStudentCourses(true);
    try {
      var result = await extractFromFile(file);
      var courses = [];
      if (result.type === "table") {
        courses = parseCoursesFromTable(result.data);
      } else {
        courses = parseCoursesFromText(result.data);
      }
      setStudentCourses(courses);
      setStudentCoursesFile(file.name);
      setMsg(courses.length + " öğrenci dersi okundu.");
    } catch (err) {
      setMsg("Dosya okunamadı: " + err.message);
    }
    setLoadingStudentCourses(false);
  };

  // Otomatik eşleştir
  const runAutoMatch = function () {
    if (studentCourses.length === 0) {
      setMsg("Eşleştirme için önce 'Öğrenci Ders Bilgileri' dosyasını yükleyin.");
      return;
    }
    if (targetCourses.length === 0) {
      setMsg("ÇAKÜ ders bilgileri bulunamadı. Ayarlar'dan yükleyin.");
      return;
    }

    var autoMatches = autoMatchCourses(studentCourses, targetCourses);

    // Not dönüşümü uygula
    var enrichedMatches = autoMatches.map(function (m) {
      return Object.assign({}, m, {
        convertedGrade: m.source.grade ? convertGradeLocal(m.source.grade) : "",
      });
    });

    setMatches(enrichedMatches);
    setShowResults(true);
    var matchedCount = enrichedMatches.filter(function (m) { return m.matched; }).length;
    setMsg("NLP analizi tamamlandi. " + matchedCount + "/" +
      enrichedMatches.length + " ders eslesti. " +
      "(Esik: %" + Math.round(SIMILARITY_THRESHOLD * 100) + " | " +
      "Ad:" + Math.round(W_NAME * 100) + "% + Icerik:" + Math.round(W_CONTENT * 100) + "% + Kod:" + Math.round(W_CODE * 100) + "%)");
  };

  // Eşleştirme düzenle
  const updateMatch = function (index, field, value) {
    setMatches(function (prev) {
      var updated = [...prev];
      if (field === "targetCode") {
        // Yeni hedef ders seç
        var newTarget = targetCourses.find(function (c) { return c.code === value; });
        updated[index] = Object.assign({}, updated[index], {
          target: newTarget || null,
          matched: !!newTarget,
        });
      } else if (field === "convertedGrade") {
        updated[index] = Object.assign({}, updated[index], { convertedGrade: value });
      }
      return updated;
    });
  };

  // Kaydet
  const handleSave = async function () {
    var record = {
      studentName: studentName,
      studentNo: studentNo,
      studentNo: studentNo,
      otherUniversity: otherUni,
      otherFaculty: otherFaculty,
      otherDepartment: otherDept,
      localDepartment: localDept,
      matches: matches.filter(function (m) { return m.matched; }).map(function (m) {
        return {
          source: { code: m.source.code, name: m.source.name, akts: m.source.akts, grade: m.source.grade },
          target: m.target ? { code: m.target.code, name: m.target.name, akts: m.target.akts, status: m.target.status || m.target.type || "" } : null,
          convertedGrade: m.convertedGrade,
          score: m.contentScore,
          aktsPass: m.aktsPass,
        };
      }),
    };
    try {
      var saved = await MuafiyetDB.saveRecord(record);
      setMsg("Muafiyet kaydı başarıyla kaydedildi.");
      if (onSave) onSave(saved);
    } catch (err) {
      setMsg("Kaydetme hatası: " + err.message);
    }
  };

  // Word çıktısı
  const handleExportWord = function () {
    var record = {
      studentName: studentName || "xxxxx XXXXX",
      studentNo: studentNo || "xxxxx",
      otherUniversity: otherUni || "xxxxx Üniversitesi",
      otherFaculty: otherFaculty || "xxxxx Fakültesi",
      otherDepartment: otherDept || "xxxxx Mühendisliği",
      localDepartment: localDept || "Bilgisayar",
      matches: matches.filter(function (m) { return m.matched; }).map(function (m) {
        return {
          source: m.source,
          target: m.target,
          convertedGrade: m.convertedGrade,
        };
      }),
    };
    exportMuafiyetWord(record);
  };

  return (
    <div>
      {/* Öğrenci Bilgileri */}
      <_Card title="Öğrenci Bilgileri">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <_FormField label="Öğrenci Adı Soyadı">
            <_Input value={studentName} onChange={function (e) { setStudentName(e.target.value); }} placeholder="Örn: Ahmet YILMAZ" />
          </_FormField>
          <_FormField label="Öğrenci Numarası">
            <_Input value={studentNo} onChange={function (e) { setStudentNo(e.target.value); }} placeholder="Örn: 2024001" />
          </_FormField>
          <_FormField label="Karşı Üniversite">
            <_Input value={otherUni} onChange={function (e) { setOtherUni(e.target.value); }} placeholder="Örn: Ankara Üniversitesi" />
          </_FormField>
          <_FormField label="Karşı Fakülte">
            <_Input value={otherFaculty} onChange={function (e) { setOtherFaculty(e.target.value); }} placeholder="Örn: Mühendislik Fakültesi" />
          </_FormField>
          <_FormField label="Karşı Bölüm">
            <_Input value={otherDept} onChange={function (e) { setOtherDept(e.target.value); }} placeholder="Örn: Bilgisayar Mühendisliği" />
          </_FormField>
          <_FormField label="ÇAKÜ Bölümünüz (Sadece Mühendislik)">
            <_Input value={localDept} onChange={function (e) { setLocalDept(e.target.value); }} placeholder="Örn: Bilgisayar" />
          </_FormField>
        </div>
      </_Card>

      {/* Belge Yükleme */}
      <_Card title="Belge Yükleme">
        <p style={{ fontSize: 13, color: _C.textMuted, marginBottom: 16 }}>
          Muafiyet talep edilen derslerin listesini içeren Excel veya PDF/Word dosyasını yükleyin.<br />
          Excel Formatı: <strong>Kodu | Adı | AKTS | Başarı Notu | Haftalık Ders İçeriği</strong><br />
          PDF Formatı: Ders kodu (örn: CS101) ile başlayan satırlar ve altındaki içerikler okunur.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
          <div>
            <FileDropZone
              label="Öğrenci Ders Bilgileri (Excel)"
              onFile={handleStudentCourses}
              fileName={studentCoursesFile}
              loading={loadingStudentCourses}
            />
            {studentCourses.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: _C.green, fontWeight: 600 }}>
                {studentCourses.length} ders okundu
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <_Btn onClick={runAutoMatch} disabled={studentCourses.length === 0}>
            Otomatik Eşleştir
          </_Btn>
        </div>
      </_Card>

      {/* Mesaj */}
      {msg && (
        <div style={{
          padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13,
          background: msg.includes("hata") || msg.includes("bulunamadı") ? "#FEE2E2" : _C.greenLight,
          color: msg.includes("hata") || msg.includes("bulunamadı") ? "#991B1B" : "#166534",
        }}>{msg}</div>
      )}

      {/* Eşleştirme Sonuçları */}
      {showResults && matches.length > 0 && (
        <_Card title="Eşleştirme Sonuçları">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: _C.bg }}>
                  <th colSpan="4" style={{ padding: 8, textAlign: "center", borderBottom: "2px solid " + _C.border, color: _C.navy, fontWeight: 700 }}>Karşı Kurum</th>
                  <th style={{ borderBottom: "2px solid " + _C.border, width: 30 }}></th>
                  <th colSpan="4" style={{ padding: 8, textAlign: "center", borderBottom: "2px solid " + _C.border, color: _C.green, fontWeight: 700 }}>ÇAKÜ Eşleşme</th>
                  <th colSpan="5" style={{ padding: 8, textAlign: "center", borderBottom: "2px solid " + _C.border, background: "#F0F9FF" }}>NLP Analiz</th>
                </tr>
                <tr style={{ background: _C.bg }}>
                  <th style={{ padding: 6, textAlign: "left", borderBottom: "1px solid " + _C.border }}>Kod</th>
                  <th style={{ padding: 6, textAlign: "left", borderBottom: "1px solid " + _C.border }}>Ders Adı</th>
                  <th style={{ padding: 6, textAlign: "center", borderBottom: "1px solid " + _C.border }}>AKTS</th>
                  <th style={{ padding: 6, textAlign: "center", borderBottom: "1px solid " + _C.border }}>Not</th>
                  <th style={{ borderBottom: "1px solid " + _C.border }}></th>
                  <th style={{ padding: 6, textAlign: "left", borderBottom: "1px solid " + _C.border }}>Kod</th>
                  <th style={{ padding: 6, textAlign: "left", borderBottom: "1px solid " + _C.border }}>Ders Adı</th>
                  <th style={{ padding: 6, textAlign: "center", borderBottom: "1px solid " + _C.border }}>AKTS</th>
                  <th style={{ padding: 6, textAlign: "center", borderBottom: "1px solid " + _C.border }}>Dönüşen</th>
                  <th style={{ padding: 6, textAlign: "center", borderBottom: "1px solid " + _C.border, background: "#F0F9FF", fontSize: 10 }} title="AKTS Kontrolü">AKTS</th>
                  <th style={{ padding: 6, textAlign: "center", borderBottom: "1px solid " + _C.border, background: "#F0F9FF", fontSize: 10 }} title="Ders Adı Benzerliği (NLP)">Ad</th>
                  <th style={{ padding: 6, textAlign: "center", borderBottom: "1px solid " + _C.border, background: "#F0F9FF", fontSize: 10 }} title="İçerik Benzerliği (TF-IDF + Jaccard + N-gram)">İçerik</th>
                  <th style={{ padding: 6, textAlign: "center", borderBottom: "1px solid " + _C.border, background: "#F0F9FF", fontSize: 10 }} title="Toplam Birleşik Skor">Toplam</th>
                  <th style={{ padding: 6, textAlign: "center", borderBottom: "1px solid " + _C.border }}>Sonuç</th>
                </tr>
              </thead>
              <tbody>
                {matches.map(function (m, idx) {
                  var aktsColor = m.aktsPass ? _C.green : "#DC2626";
                  var totalColor = m.contentScore >= 0.70 ? _C.green : (m.contentScore >= 0.40 ? "#D97706" : "#DC2626");
                  var nameColor = (m.nameScore || 0) >= 0.60 ? _C.green : (m.nameScore >= 0.30 ? "#D97706" : "#DC2626");
                  var detailColor = (m.detailContentScore || 0) >= 0.60 ? _C.green : (m.detailContentScore >= 0.30 ? "#D97706" : "#DC2626");
                  var resultBg = m.matched ? _C.greenLight : "#FEE2E2";
                  var resultColor = m.matched ? "#166534" : "#991B1B";

                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid " + _C.borderLight, background: m.matched ? "white" : "#FFF7ED" }}>
                      <td style={{ padding: 6, fontWeight: 600 }}>{m.source.code}</td>
                      <td style={{ padding: 6 }}>{m.source.name}</td>
                      <td style={{ padding: 6, textAlign: "center" }}>{m.source.akts}</td>
                      <td style={{ padding: 6, textAlign: "center", fontWeight: 600 }}>{m.source.grade}</td>
                      <td style={{ padding: 4, textAlign: "center" }}>
                        <span style={{ color: _C.textMuted, fontSize: 16 }}>{"\u2192"}</span>
                      </td>
                      <td style={{ padding: 6 }}>
                        <select
                          value={m.target ? m.target.code : ""}
                          onChange={function (e) { updateMatch(idx, "targetCode", e.target.value); }}
                          style={{
                            padding: "4px", fontSize: 11, borderRadius: 4,
                            border: "1px solid " + _C.border, background: "white", cursor: "pointer",
                            width: "100%", maxWidth: 120
                          }}
                        >
                          <option value="">-- Seçiniz --</option>
                          {targetCourses.map(function (c) {
                            return <option key={c.code} value={c.code}>{c.code} - {c.name}</option>;
                          })}
                        </select>
                      </td>
                      <td style={{ padding: 6, fontSize: 11 }}>{m.target ? m.target.name : ""}</td>
                      <td style={{ padding: 6, textAlign: "center" }}>{m.target ? m.target.akts : ""}</td>
                      <td style={{ padding: 6, textAlign: "center" }}>
                        <input
                          type="text"
                          value={m.convertedGrade}
                          onChange={function (e) { updateMatch(idx, "convertedGrade", e.target.value); }}
                          style={{
                            width: 40, padding: "2px", fontSize: 11,
                            border: "1px solid " + _C.border, borderRadius: 4, textAlign: "center",
                          }}
                        />
                      </td>
                      {/* NLP Analiz Sütunları */}
                      <td style={{ padding: 6, textAlign: "center" }}>
                        <span style={{ color: aktsColor, fontSize: 14, fontWeight: 700 }} title={m.aktsPass ? "AKTS Yeterli" : "AKTS Yetersiz"}>
                          {m.aktsPass ? "\u2713" : "\u2717"}
                        </span>
                      </td>
                      <td style={{ padding: 4, textAlign: "center" }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: nameColor,
                          padding: "1px 3px", borderRadius: 3, border: "1px solid " + nameColor,
                          display: "inline-block"
                        }} title={"Ders Adı: %" + Math.round((m.nameScore || 0) * 100)}>
                          %{Math.round((m.nameScore || 0) * 100)}
                        </span>
                      </td>
                      <td style={{ padding: 4, textAlign: "center" }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: detailColor,
                          padding: "1px 3px", borderRadius: 3, border: "1px solid " + detailColor,
                          display: "inline-block"
                        }} title={"İçerik (TF-IDF+Jaccard+N-gram): %" + Math.round((m.detailContentScore || 0) * 100)}>
                          %{Math.round((m.detailContentScore || 0) * 100)}
                        </span>
                      </td>
                      <td style={{ padding: 4, textAlign: "center" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: totalColor,
                          padding: "2px 4px", borderRadius: 4, border: "1px solid " + totalColor,
                          background: m.contentScore >= 0.70 ? "#F0FDF4" : (m.contentScore >= 0.40 ? "#FFFBEB" : "#FEF2F2"),
                          display: "inline-block"
                        }} title={"Toplam: Ad×" + Math.round(W_NAME*100) + "% + İçerik×" + Math.round(W_CONTENT*100) + "% + Kod×" + Math.round(W_CODE*100) + "%"}>
                          %{Math.round(m.contentScore * 100)}
                        </span>
                      </td>
                      <td style={{ padding: 6, textAlign: "center" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: resultColor,
                          background: resultBg,
                          padding: "2px 6px", borderRadius: 4,
                          display: "inline-block", minWidth: 40
                        }}>
                          {m.matched ? "MUAF" : "RED"}
                        </span>
                        {!m.matched && m.rejectReason && (
                          <div style={{ fontSize: 9, color: "#DC2626", marginTop: 2 }}>{m.rejectReason}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <_Btn onClick={handleSave} variant="success">
              Kaydet
            </_Btn>
            <_Btn onClick={handleExportWord} style={{ background: "#2563EB", border: "none" }}>
              Word Çıktısı Al
            </_Btn>
          </div>
        </_Card>
      )}
    </div>
  );
};

// ── Geçmiş Kayıtlar ──
const ExemptionHistory = ({ records, loading, onDelete, onExportWord }) => {
  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: _C.textMuted }}>Yükleniyor...</div>;
  }
  if (records.length === 0) {
    return (
      <_Card title="Geçmiş Kayıtlar">
        <div style={{ padding: 40, textAlign: "center", color: _C.textMuted }}>
          <p style={{ fontSize: 16, marginBottom: 8 }}>Henüz muafiyet kaydı yok</p>
          <p style={{ fontSize: 13 }}>Yeni muafiyet işlemi yaparak kayıt oluşturabilirsiniz.</p>
        </div>
      </_Card>
    );
  }

  return (
    <_Card title={"Geçmiş Kayıtlar (" + records.length + ")"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {records.map(function (rec) {
          var matchCount = (rec.matches || []).length;
          return (
            <div key={rec.id} style={{
              padding: 16, border: "1px solid " + _C.border, borderRadius: 10,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "white",
            }}>
              <div>
                <div style={{ fontWeight: 700, color: _C.navy, fontSize: 15 }}>
                  {rec.studentName || "İsimsiz"} <span style={{ fontWeight: 400, color: _C.textMuted }}>({rec.studentNo || "-"})</span>
                </div>
                <div style={{ fontSize: 12, color: _C.textMuted, marginTop: 4 }}>
                  {rec.otherUniversity || "-"} | {matchCount} ders eşleştirildi
                </div>
                {rec.createdAt && (
                  <div style={{ fontSize: 11, color: _C.textMuted, marginTop: 2 }}>
                    {rec.createdAt.toDate ? rec.createdAt.toDate().toLocaleDateString("tr-TR") : ""}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <_Btn small variant="ghost" onClick={function () { onExportWord(rec); }}>
                  Word
                </_Btn>
                <_Btn small variant="danger" onClick={function () {
                  if (confirm("Bu kaydı silmek istediğinizden emin misiniz?")) onDelete(rec.id);
                }}>
                  Sil
                </_Btn>
              </div>
            </div>
          );
        })}
      </div>
    </_Card>
  );
};

// ══════════════════════════════════════════════════════════════
// ANA MODÜL BİLEŞENİ
// ══════════════════════════════════════════════════════════════

function DersMuafiyetApp({ currentUser }) {
  const [activeTab, setActiveTab] = useState("yeni");
  const [courseContents, setCourseContents] = useState([]);
  const [gradingSystem, setGradingSystem] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  // Firebase'den ayarları ve kayıtları yükle
  useEffect(function () {
    async function loadData() {
      try {
        var contents = await MuafiyetDB.fetchCourseContents();
        if (contents.length > 0) setCourseContents(contents);
        var grading = await MuafiyetDB.fetchGradingSystem();
        if (grading) setGradingSystem(grading);
        var recs = await MuafiyetDB.fetchRecords();
        setRecords(recs);
      } catch (err) {
        console.error("Muafiyet verileri yüklenirken hata:", err);
      }
      setRecordsLoading(false);
    }
    loadData();
  }, []);

  const handleDeleteRecord = async function (id) {
    try {
      await MuafiyetDB.deleteRecord(id);
      setRecords(function (prev) { return prev.filter(function (r) { return r.id !== id; }); });
    } catch (err) {
      alert("Silme hatası: " + err.message);
    }
  };

  const handleSaveRecord = function (saved) {
    setRecords(function (prev) { return [saved, ...prev]; });
  };

  return (
    <div className="portal-bg">
      <div className="portal-wrap">
        {/* Başlık */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontSize: 28, fontWeight: 700, color: _C.navy,
            fontFamily: "'Playfair Display', serif", marginBottom: 4,
          }}>Ders Muafiyet Modülü</h1>
          <p style={{ color: _C.textMuted, fontSize: 14 }}>
            NLP tabanli ders eslestirme: Turkce kok bulma, TF-IDF, N-gram, esanlamli sozluk ve cok faktorlu skor analizi.
          </p>
        </div>

        {/* Tab Bar */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 24,
          borderBottom: "2px solid " + _C.border, paddingBottom: 0,
        }}>
          {MUAFIYET_TABS.map(function (tab) {
            var isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={function () { setActiveTab(tab.id); }}
                style={{
                  padding: "12px 24px",
                  border: "none",
                  background: isActive ? _C.navy : "transparent",
                  color: isActive ? "white" : _C.textMuted,
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  borderRadius: "8px 8px 0 0",
                  fontFamily: "'Source Sans 3', sans-serif",
                  transition: "all 0.2s",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab İçeriği */}
        {activeTab === "ayarlar" && (
          <SettingsPanel
            courseContents={courseContents}
            setCourseContents={setCourseContents}
            gradingSystem={gradingSystem}
            setGradingSystem={setGradingSystem}
          />
        )}
        {activeTab === "yeni" && (
          <NewExemption
            courseContents={courseContents}
            gradingSystem={gradingSystem}
            onSave={handleSaveRecord}
          />
        )}
        {activeTab === "gecmis" && (
          <ExemptionHistory
            records={records}
            loading={recordsLoading}
            onDelete={handleDeleteRecord}
            onExportWord={function (rec) { exportMuafiyetWord(rec); }}
          />
        )}
      </div>
    </div>
  );
}

// ── Window'a export ──
window.DersMuafiyetApp = DersMuafiyetApp;

// NLP motoru ve yardımcı fonksiyonları diğer modüllere paylaş
window.MuafiyetUtils = {
  // Temel NLP
  normalizeText,
  tokenize,
  tokenizeStemmed,
  turkishStem,
  expandWithSynonyms,
  // Benzerlik fonksiyonları
  jaccardSimilarity,
  softJaccardSimilarity,
  ngramSimilarity,
  tfidfCosineSimilarity,
  contentSimilarity,
  combinedSimilarity,
  courseNameSimilarity,
  courseCodeSimilarity,
  multiFactorScore,
  levenshteinDistance,
  wordSimilarity,
  // N-gram
  charNgrams,
  wordBigrams,
  // Eşleştirme
  autoMatchCourses,
  // Dosya işleme
  extractFromFile,
  parseCoursesFromTable,
  parseCoursesFromText,
  ensureLibsLoaded,
  // Bileşenler
  FileDropZone,
  // Sabitler
  TR_STOPWORDS,
  DOMAIN_SYNONYMS,
  SIMILARITY_THRESHOLD,
  W_NAME,
  W_CONTENT,
  W_CODE,
};
