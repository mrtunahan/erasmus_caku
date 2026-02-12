
import { TR_STOPWORDS, SIMILARITY_THRESHOLD } from './constants';

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
export async function ensureLibsLoaded() {
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

// ── DOSYA OKUMA & METİN ÇIKARMA ──

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

export async function extractFromFile(file) {
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

// ── Word Çıktısı ──

export function exportMuafiyetWord(record) {
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

// ── OTOMATİK DERS EŞLEŞTİRME ──

export function autoMatchCourses(sourceCourses, targetCourses, threshold) {
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


// ── Metin İşleme ve Benzerlik ──

export function normalizeText(text) {
    if (!text) return "";
    return text.toLowerCase()
        .replace(/İ/g, "i").replace(/I/g, "ı")
        .replace(/[^a-zçğıöşüa-z0-9\s]/g, " ")
        .replace(/\s+/g, " ").trim();
}

export function tokenize(text) {
    var normalized = normalizeText(text);
    return normalized.split(" ").filter(function (w) {
        return w.length > 1 && !TR_STOPWORDS.has(w);
    });
}

// Jaccard benzerlik katsayısı
export function jaccardSimilarity(text1, text2) {
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
export function cosineSimilarity(text1, text2) {
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
export function combinedSimilarity(text1, text2) {
    var j = jaccardSimilarity(text1, text2);
    var c = cosineSimilarity(text1, text2);
    return j * 0.4 + c * 0.6;
}

// ── Tablo/Metin Ayrıştırma (Parsing) ──

export function parseCoursesFromTable(sheets) {
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

export function parseCoursesFromText(text) {
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
