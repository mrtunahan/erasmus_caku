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

// Türkçe stopwords - benzerlik hesabında göz ardı edilecek
const TR_STOPWORDS = new Set([
  "ve", "ile", "bir", "bu", "da", "de", "den", "dan", "için", "olan",
  "gibi", "kadar", "sonra", "önce", "üzere", "olarak", "veya", "ya",
  "hem", "ise", "nin", "nın", "nun", "nün", "dir", "dır", "dür", "dur",
  "ler", "lar", "tir", "tır", "tur", "tür", "the", "and", "of", "in",
  "to", "for", "on", "with", "at", "by", "an", "are", "is", "as",
  "from", "that", "which", "or", "be", "it", "its", "has", "have",
]);

// Varsayılan benzerlik eşiği
const SIMILARITY_THRESHOLD = 0.25;

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
          if (cell.includes("içerik") || cell.includes("icerik") || cell.includes("content") || cell.includes("açıklama") || cell.includes("aciklama")) colMap.content = idx;
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
        if (rows[0].length >= 5) colMap.content = 4;
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

  // Ders kodu pattern: 2-4 harf + 3-4 rakam (örn: BİL101, MAT221, CS101)
  var codePattern = /([A-ZÇĞİÖŞÜa-zçğıöşü]{2,5}\s?\d{3,4})/g;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var matches = line.match(codePattern);
    if (matches) {
      matches.forEach(function (code) {
        code = code.replace(/\s/g, "");
        // Kod sonrasındaki metni ders adı olarak al
        var afterCode = line.split(code)[1] || "";
        // AKTS/kredi bul
        var aktsMatch = afterCode.match(/(\d+)\s*(AKTS|ECTS|kredi|credit)/i);
        var akts = aktsMatch ? aktsMatch[1] : "";
        // Not bul
        var gradeMatch = afterCode.match(/\b(AA|BA|BB|CB|CC|DC|DD|FF|FD|[A-F][+-]?)\b/);
        var grade = gradeMatch ? gradeMatch[1] : "";
        // Ders adı: koddan sonra, sayısal verilere kadar olan kısım
        var nameText = afterCode.replace(/\d+\s*(AKTS|ECTS|kredi|credit)/gi, "")
          .replace(/\b(AA|BA|BB|CB|CC|DC|DD|FF|FD|[A-F][+-]?)\b/g, "")
          .replace(/[|,;]/g, " ").trim();

        if (nameText.length > 2) {
          courses.push({ code: code, name: nameText, akts: akts, grade: grade, content: "", status: "" });
        }
      });
    }
  }
  return courses;
}

// ══════════════════════════════════════════════════════════════
// METİN BENZERLİĞİ MOTORU
// ══════════════════════════════════════════════════════════════

function normalizeText(text) {
  if (!text) return "";
  return text.toLowerCase()
    .replace(/İ/g, "i").replace(/I/g, "ı")
    .replace(/[^a-zçğıöşüa-z0-9\s]/g, " ")
    .replace(/\s+/g, " ").trim();
}

function tokenize(text) {
  var normalized = normalizeText(text);
  return normalized.split(" ").filter(function (w) {
    return w.length > 1 && !TR_STOPWORDS.has(w);
  });
}

// Jaccard benzerlik katsayısı
function jaccardSimilarity(text1, text2) {
  var tokens1 = tokenize(text1);
  var tokens2 = tokenize(text2);
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  var set1 = new Set(tokens1);
  var set2 = new Set(tokens2);
  var intersection = 0;
  set1.forEach(function (t) { if (set2.has(t)) intersection++; });
  var union = new Set([...tokens1, ...tokens2]).size;
  return union > 0 ? intersection / union : 0;
}

// Kosinüs benzerliği (TF vektörleri ile)
function cosineSimilarity(text1, text2) {
  var tokens1 = tokenize(text1);
  var tokens2 = tokenize(text2);
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  // TF hesapla
  var tf1 = {};
  var tf2 = {};
  tokens1.forEach(function (t) { tf1[t] = (tf1[t] || 0) + 1; });
  tokens2.forEach(function (t) { tf2[t] = (tf2[t] || 0) + 1; });

  // Tüm terimler
  var allTerms = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
  var dotProduct = 0, mag1 = 0, mag2 = 0;
  allTerms.forEach(function (term) {
    var v1 = tf1[term] || 0;
    var v2 = tf2[term] || 0;
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  });
  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);
  return mag1 > 0 && mag2 > 0 ? dotProduct / (mag1 * mag2) : 0;
}

// Birleşik benzerlik skoru
function combinedSimilarity(text1, text2) {
  var j = jaccardSimilarity(text1, text2);
  var c = cosineSimilarity(text1, text2);
  return j * 0.4 + c * 0.6;
}

// ══════════════════════════════════════════════════════════════
// OTOMATİK DERS EŞLEŞTİRME
// ══════════════════════════════════════════════════════════════

function autoMatchCourses(sourceCourses, targetCourses, threshold) {
  if (!threshold) threshold = SIMILARITY_THRESHOLD;
  var matches = [];

  sourceCourses.forEach(function (src) {
    var bestMatch = null;
    var bestScore = 0;

    targetCourses.forEach(function (tgt) {
      // Ders adı benzerliği
      var nameScore = combinedSimilarity(src.name, tgt.name);
      // İçerik benzerliği (varsa)
      var contentScore = 0;
      if (src.content && tgt.content) {
        contentScore = combinedSimilarity(src.content, tgt.content);
      }
      // Ders kodu benzerliği (basit karşılaştırma)
      var codeScore = 0;
      if (src.code && tgt.code) {
        // Aynı harf öneki varsa bonus
        var srcLetters = src.code.replace(/[0-9]/g, "").toLowerCase();
        var tgtLetters = tgt.code.replace(/[0-9]/g, "").toLowerCase();
        if (srcLetters === tgtLetters) codeScore = 0.3;
      }

      // Toplam skor: ad ağırlıklı, içerik varsa o da eklenir
      var totalScore;
      if (contentScore > 0) {
        totalScore = nameScore * 0.3 + contentScore * 0.5 + codeScore * 0.2;
      } else {
        totalScore = nameScore * 0.7 + codeScore * 0.3;
      }

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMatch = tgt;
      }
    });

    matches.push({
      source: src,
      target: bestScore >= threshold ? bestMatch : null,
      score: bestScore,
      matched: bestScore >= threshold,
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
    var m = matches[i];
    var srcCode = m ? (m.source.code || "") : "";
    var srcName = m ? (m.source.name || "") : "";
    var srcAkts = m ? (m.source.akts || "") : "";
    var srcGrade = m ? (m.source.grade || "") : "";
    var tgtCode = m && m.target ? (m.target.code || "") : "";
    var tgtName = m && m.target ? (m.target.name || "") : "";
    var tgtAkts = m && m.target ? (m.target.akts || "") : "";
    var tgtGrade = m ? (m.convertedGrade || "") : "";
    var tgtStatus = m && m.target ? (m.target.status || m.target.type || "") : "";

    if (srcAkts) totalAktsSource += parseInt(srcAkts) || 0;
    if (tgtAkts) totalAktsTarget += parseInt(tgtAkts) || 0;

    dataRows += '<tr>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;font-family:Times New Roman;">' + srcCode + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;font-family:Times New Roman;">' + srcName + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;font-family:Times New Roman;">' + srcAkts + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;font-family:Times New Roman;">' + srcGrade + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;font-family:Times New Roman;">' + tgtCode + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;font-family:Times New Roman;">' + tgtName + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;font-family:Times New Roman;">' + tgtAkts + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;font-family:Times New Roman;">' + tgtGrade + '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;font-family:Times New Roman;">' + tgtStatus + '</td>' +
      '</tr>';
  }

  var html = '\uFEFF' +
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><style>' +
    'body { font-family: "Times New Roman", Times, serif; font-size: 12pt; }' +
    'table { border-collapse: collapse; width: 100%; }' +
    'td, th { border: 1px solid black; padding: 4px 6px; text-align: center; font-size: 11pt; font-family: "Times New Roman", Times, serif; }' +
    '</style></head><body>' +
    '<p style="font-family:Times New Roman;font-size:14pt;font-weight:bold;margin-bottom:12pt;">' +
    '<span style="background-color:yellow;">DERS MUAFİYET İSTEĞİ ŞABLONU</span></p>' +
    '<p style="font-family:Times New Roman;font-size:12pt;text-align:justify;line-height:1.5;margin-bottom:16pt;">' +
    '<b>3-</b> Bölümümüz <b>' + studentNo + '</b> numaralı öğrencisi <b>' + studentName + '\'nun</b>, ' +
    'ders muafiyet talebi hakkında vermiş olduğu dilekçesi incelenmiş olup, ' +
    '<b>Çankırı Karatekin Üniversitesi Önlisans ve Lisans Eğitim Öğretim Yönetmeliğinin 12. maddesi</b> ' +
    'uyarınca aşağıda tabloda verildiği gibi uygun olduğuna ve gereği için Fakültemiz ilgili kurullarında ' +
    'görüşülmek üzere Dekanlık Makamına sunulmasına,</p>' +
    '<table>' +
    // Üst başlık satırı
    '<tr>' +
    '<td colspan="4" style="border:1px solid black;padding:6px;text-align:center;font-weight:bold;font-size:11pt;font-family:Times New Roman;">' +
    '<u>' + otherUni + ' ' + otherFaculty + ' ' + otherDept + '<br/>Bölümünden Aldığı Dersin</u></td>' +
    '<td colspan="5" style="border:1px solid black;padding:6px;text-align:center;font-weight:bold;font-size:11pt;font-family:Times New Roman;">' +
    '<u>Çankırı Karatekin Üniversitesi Mühendislik Fakültesi xxxxx<br/>Mühendisliği Bölümünde Muaf Olacağı Dersin</u></td>' +
    '</tr>' +
    // Alt başlık satırı
    '<tr>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-weight:bold;font-size:11pt;font-family:Times New Roman;"><u>Kodu</u></td>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-weight:bold;font-size:11pt;font-family:Times New Roman;"><u>Adı</u></td>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-weight:bold;font-size:11pt;font-family:Times New Roman;">AKTS</td>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-weight:bold;font-size:11pt;font-family:Times New Roman;">Başarı<br/>Notu</td>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-weight:bold;font-size:11pt;font-family:Times New Roman;">Kodu</td>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-weight:bold;font-size:11pt;font-family:Times New Roman;"><u>Adı</u></td>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-weight:bold;font-size:11pt;font-family:Times New Roman;">AKTS</td>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-weight:bold;font-size:11pt;font-family:Times New Roman;">Başarı<br/>Notu</td>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-weight:bold;font-size:11pt;font-family:Times New Roman;"><u>Statüsü</u></td>' +
    '</tr>' +
    // Veri satırları
    dataRows +
    // Toplam satırı
    '<tr>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;font-family:Times New Roman;"></td>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-weight:bold;font-size:11pt;font-family:Times New Roman;"><u>Toplam</u></td>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-weight:bold;font-size:11pt;font-family:Times New Roman;">' + (totalAktsSource || "X") + '</td>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;font-family:Times New Roman;"></td>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;font-family:Times New Roman;"></td>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-weight:bold;font-size:11pt;font-family:Times New Roman;"><u>Toplam</u></td>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-weight:bold;font-size:11pt;font-family:Times New Roman;">' + (totalAktsTarget || "X") + '</td>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;font-family:Times New Roman;"></td>' +
    '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;font-family:Times New Roman;"></td>' +
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
            ÇAKÜ Bilgisayar Mühendisliği ders bilgilerini (kod, ad, AKTS, içerik) yükleyin.
            Excel formatında: Kodu | Adı | AKTS | İçerik sütunları olmalı.
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
                    <th style={{ padding: 8, textAlign: "left", borderBottom: "2px solid " + _C.border }}>İçerik</th>
                  </tr>
                </thead>
                <tbody>
                  {courseContents.map(function (c, i) {
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid " + _C.borderLight }}>
                        <td style={{ padding: 6, fontWeight: 600 }}>{c.code}</td>
                        <td style={{ padding: 6 }}>{c.name}</td>
                        <td style={{ padding: 6, textAlign: "center" }}>{c.akts}</td>
                        <td style={{ padding: 6, fontSize: 11, color: _C.textMuted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.content || "-"}</td>
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

  // Dosya yükleme
  const [transcriptFile, setTranscriptFile] = useState("");
  const [matchTableFile, setMatchTableFile] = useState("");
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [loadingMatchTable, setLoadingMatchTable] = useState(false);

  // Parse edilen veriler
  const [transcriptCourses, setTranscriptCourses] = useState([]);
  const [matchTableCourses, setMatchTableCourses] = useState([]);

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

  // Transkript yükle
  const handleTranscript = async function (file) {
    setLoadingTranscript(true);
    try {
      var result = await extractFromFile(file);
      var courses = [];
      if (result.type === "table") {
        courses = parseCoursesFromTable(result.data);
      } else {
        courses = parseCoursesFromText(result.data);
      }
      setTranscriptCourses(courses);
      setTranscriptFile(file.name);
      setMsg(courses.length + " ders transkriptten okundu.");
    } catch (err) {
      setMsg("Transkript okunamadı: " + err.message);
    }
    setLoadingTranscript(false);
  };

  // Ders eşleştirme tablosu yükle
  const handleMatchTable = async function (file) {
    setLoadingMatchTable(true);
    try {
      var result = await extractFromFile(file);
      var courses = [];
      if (result.type === "table") {
        courses = parseCoursesFromTable(result.data);
      } else {
        courses = parseCoursesFromText(result.data);
      }
      setMatchTableCourses(courses);
      setMatchTableFile(file.name);
      setMsg(courses.length + " ders eşleştirme tablosundan okundu.");
    } catch (err) {
      setMsg("Eşleştirme tablosu okunamadı: " + err.message);
    }
    setLoadingMatchTable(false);
  };

  // Otomatik eşleştir
  const runAutoMatch = function () {
    var sourceCourses = transcriptCourses.length > 0 ? transcriptCourses :
      (matchTableCourses.length > 0 ? matchTableCourses : []);

    if (sourceCourses.length === 0) {
      setMsg("Eşleştirme için önce transkript veya eşleştirme tablosu yükleyin.");
      return;
    }
    if (targetCourses.length === 0) {
      setMsg("ÇAKÜ ders bilgileri bulunamadı. Ayarlar'dan yükleyin.");
      return;
    }

    var autoMatches = autoMatchCourses(sourceCourses, targetCourses);

    // Not dönüşümü uygula
    var enrichedMatches = autoMatches.map(function (m) {
      return Object.assign({}, m, {
        convertedGrade: m.source.grade ? convertGradeLocal(m.source.grade) : "",
      });
    });

    setMatches(enrichedMatches);
    setShowResults(true);
    setMsg("Otomatik eşleştirme tamamlandı. " +
      enrichedMatches.filter(function (m) { return m.matched; }).length + "/" +
      enrichedMatches.length + " ders eşleştirildi.");
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
      otherUniversity: otherUni,
      otherFaculty: otherFaculty,
      otherDepartment: otherDept,
      matches: matches.filter(function (m) { return m.matched; }).map(function (m) {
        return {
          source: { code: m.source.code, name: m.source.name, akts: m.source.akts, grade: m.source.grade },
          target: m.target ? { code: m.target.code, name: m.target.name, akts: m.target.akts, status: m.target.status || m.target.type || "" } : null,
          convertedGrade: m.convertedGrade,
          score: m.score,
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
        </div>
      </_Card>

      {/* Belge Yükleme */}
      <_Card title="Belge Yükleme">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: _C.navy, marginBottom: 8 }}>Transkript</div>
            <FileDropZone
              label="Transkript Yükle"
              onFile={handleTranscript}
              fileName={transcriptFile}
              loading={loadingTranscript}
            />
            {transcriptCourses.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: _C.green, fontWeight: 600 }}>
                {transcriptCourses.length} ders okundu
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: _C.navy, marginBottom: 8 }}>Ders Eşleştirme Tablosu</div>
            <FileDropZone
              label="Eşleştirme Tablosu Yükle"
              onFile={handleMatchTable}
              fileName={matchTableFile}
              loading={loadingMatchTable}
            />
            {matchTableCourses.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: _C.green, fontWeight: 600 }}>
                {matchTableCourses.length} ders okundu
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <_Btn onClick={runAutoMatch} disabled={transcriptCourses.length === 0 && matchTableCourses.length === 0}>
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
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: _C.bg }}>
                  <th colSpan="4" style={{ padding: 10, textAlign: "center", borderBottom: "2px solid " + _C.border, color: _C.navy, fontWeight: 700 }}>Karşı Kurum</th>
                  <th style={{ borderBottom: "2px solid " + _C.border, width: 40 }}></th>
                  <th colSpan="4" style={{ padding: 10, textAlign: "center", borderBottom: "2px solid " + _C.border, color: _C.green, fontWeight: 700 }}>ÇAKÜ Eşleşme</th>
                  <th style={{ padding: 10, textAlign: "center", borderBottom: "2px solid " + _C.border }}>Skor</th>
                </tr>
                <tr style={{ background: _C.bg }}>
                  <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid " + _C.border }}>Kod</th>
                  <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid " + _C.border }}>Ders Adı</th>
                  <th style={{ padding: 8, textAlign: "center", borderBottom: "1px solid " + _C.border }}>AKTS</th>
                  <th style={{ padding: 8, textAlign: "center", borderBottom: "1px solid " + _C.border }}>Not</th>
                  <th style={{ borderBottom: "1px solid " + _C.border }}></th>
                  <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid " + _C.border }}>Kod</th>
                  <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid " + _C.border }}>Ders Adı</th>
                  <th style={{ padding: 8, textAlign: "center", borderBottom: "1px solid " + _C.border }}>AKTS</th>
                  <th style={{ padding: 8, textAlign: "center", borderBottom: "1px solid " + _C.border }}>Dönüşen Not</th>
                  <th style={{ padding: 8, textAlign: "center", borderBottom: "1px solid " + _C.border }}>%</th>
                </tr>
              </thead>
              <tbody>
                {matches.map(function (m, idx) {
                  var scoreColor = m.score >= 0.5 ? _C.green : (m.score >= SIMILARITY_THRESHOLD ? "#D97706" : _C.accent);
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid " + _C.borderLight, background: m.matched ? "white" : "#FFF7ED" }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>{m.source.code}</td>
                      <td style={{ padding: 8 }}>{m.source.name}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>{m.source.akts}</td>
                      <td style={{ padding: 8, textAlign: "center", fontWeight: 600 }}>{m.source.grade}</td>
                      <td style={{ padding: 4, textAlign: "center" }}>
                        <span style={{ color: m.matched ? _C.green : _C.textMuted, fontSize: 18 }}>{m.matched ? "\u2192" : "\u2717"}</span>
                      </td>
                      <td style={{ padding: 8 }}>
                        <select
                          value={m.target ? m.target.code : ""}
                          onChange={function (e) { updateMatch(idx, "targetCode", e.target.value); }}
                          style={{
                            padding: "4px 8px", fontSize: 12, borderRadius: 6,
                            border: "1px solid " + _C.border, background: "white", cursor: "pointer",
                            width: "100%",
                          }}
                        >
                          <option value="">-- Seçiniz --</option>
                          {targetCourses.map(function (c) {
                            return <option key={c.code} value={c.code}>{c.code} - {c.name}</option>;
                          })}
                        </select>
                      </td>
                      <td style={{ padding: 8, fontSize: 12 }}>{m.target ? m.target.name : ""}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>{m.target ? m.target.akts : ""}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>
                        <input
                          type="text"
                          value={m.convertedGrade}
                          onChange={function (e) { updateMatch(idx, "convertedGrade", e.target.value); }}
                          style={{
                            width: 60, padding: "4px 8px", fontSize: 12,
                            border: "1px solid " + _C.border, borderRadius: 6, textAlign: "center",
                          }}
                        />
                      </td>
                      <td style={{ padding: 8, textAlign: "center" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: scoreColor,
                          background: m.matched ? _C.greenLight : "#FEE2E2",
                          padding: "2px 8px", borderRadius: 4,
                        }}>
                          {Math.round(m.score * 100)}%
                        </span>
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
    <div>
      {/* Başlık */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: _C.navy,
          fontFamily: "'Playfair Display', serif", marginBottom: 4,
        }}>Ders Muafiyet Modülü</h1>
        <p style={{ color: _C.textMuted, fontSize: 14 }}>
          Belge yükleyin, otomatik ders eşleştirme ve Word çıktısı alın.
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
  );
}

// ── Window'a export ──
window.DersMuafiyetApp = DersMuafiyetApp;
