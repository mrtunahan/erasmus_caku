// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Proje Modülü
// Ders bazlı proje grupları oluşturma, listeleme, XLSX/Word export
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

// ── Renkler ──
const PRJ = {
  primary: "#6366f1",
  primaryLight: "#818cf8",
  primaryPale: "#eef2ff",
  gold: "#d4af37",
  green: "#059669",
  greenLight: "#d1fae5",
  red: "#dc2626",
  redLight: "#fee2e2",
  orange: "#ea580c",
  orangeLight: "#ffedd5",
  bg: "#f0f4ff",
  card: "#ffffff",
  text: "#1f2937",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  navy: "#1B2A4A",
};

// ── SVG Icon Helper ──
const PrjIcon = ({ path, size, color }) => (
  <svg width={size || 18} height={size || 18} viewBox="0 0 24 24" fill="none"
    stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const PRJ_ICONS = {
  folder: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
  plus: "M12 5v14M5 12h14",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  x: "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  clock: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
  userPlus: "M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6",
  info: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 16v-4M12 8h.01",
  book: "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 004 17V5a2 2 0 012-2h14v14H6.5a2.5 2.5 0 00-2.5 2.5z",
  back: "M19 12H5M12 19l-7-7 7-7",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  calendar: "M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  checkCircle: "M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3",
  xCircle: "M12 2a10 10 0 100 20 10 10 0 000-20zM15 9l-6 6M9 9l6 6",
  alertTriangle: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
};

// ── Akademisyen Adı Eşleme (Ders Yönetimi entegrasyonu için) ──
// Ders Yönetimi'nde professor alanı "Prof. Dr. Tunahan Korkmaz" gibi unvanlı
// girilebilir; oturumdaki currentUser.name ise sade olabilir. Unvan/boşluk/
// büyük-küçük harf farklarını tolere eden bir karşılaştırma yapıyoruz.
var PRJ_TITLES = ["Prof. Dr.", "Prof.Dr.", "Doç. Dr.", "Doç.Dr.", "Dr. Öğr. Üyesi",
  "Dr.Öğr.Üyesi", "Öğr. Gör. Dr.", "Öğr.Gör.Dr.", "Arş. Gör. Dr.", "Arş.Gör.Dr.",
  "Öğr. Gör.", "Öğr.Gör.", "Arş. Gör.", "Arş.Gör.", "Dr.", "Prof."];
function prjStripTitle(name) {
  if (!name) return "";
  var n = String(name).trim();
  for (var i = 0; i < PRJ_TITLES.length; i++) {
    var t = PRJ_TITLES[i];
    if (n.toLocaleLowerCase("tr").indexOf(t.toLocaleLowerCase("tr")) === 0) {
      n = n.slice(t.length).trim();
      break;
    }
  }
  return n;
}
function prjNormalizeName(s) {
  if (!s) return "";
  return prjStripTitle(s).replace(/\s+/g, " ").trim().toLocaleLowerCase("tr");
}
function prjMatchesProfessor(courseProfessor, currentUserName) {
  if (!courseProfessor || !currentUserName) return false;
  var a = prjNormalizeName(courseProfessor);
  var b = prjNormalizeName(currentUserName);
  if (!a || !b) return false;
  if (a === b) return true;
  // Birinin diğerini içermesi (kısmi eşleme — soyadı benzerliği vs.)
  if (a.indexOf(b) !== -1 || b.indexOf(a) !== -1) return true;
  // Soyadı + ad baş harfi eşlemesi
  var aParts = a.split(/\s+/);
  var bParts = b.split(/\s+/);
  if (aParts.length >= 2 && bParts.length >= 2) {
    var aSur = aParts[aParts.length - 1];
    var bSur = bParts[bParts.length - 1];
    if (aSur === bSur && aParts[0].charAt(0) === bParts[0].charAt(0)) return true;
  }
  return false;
}

// ── Tarih Formatlama ──
function prjFormatDate(ts) {
  if (!ts) return "—";
  try {
    var d;
    if (ts.toDate) {
      d = ts.toDate();
    } else if (ts.seconds) {
      d = new Date(ts.seconds * 1000);
    } else if (typeof ts === "string" || typeof ts === "number") {
      d = new Date(ts);
    } else {
      return "—";
    }
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  } catch (e) {
    return "—";
  }
}

// ── DB Helpers ──
var ProjDB = {
  // Kategori bazlı collection adı
  _col: function (category) {
    var cat = PROJECT_CATEGORIES.find(function (c) { return c.id === category; });
    return (cat && cat.collection) || "project_courses";
  },

  // Ders listesi (kategori ve bölüm bazlı)
  async fetchCourses(category, departmentId) {
    try {
      var col = this._col(category);
      var docs = await window.apiRead(col);
      // Bölüm bazlı filtreleme: departmentId olmayan veriler bilgisayar bölümüne ait
      if (departmentId) {
        docs = docs.filter(function (d) {
          var deptId = d.departmentId || "bilgisayar";
          return deptId === departmentId;
        });
      }
      docs.sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
      return docs;
    } catch (e) {
      console.error("Ders listesi yüklenemedi:", e);
      throw e;
    }
  },
  async addCourse(data, category) {
    try {
      var col = this._col(category);
      var result = await window.DBWrite.add(col, Object.assign({}, data, {
        createdAt: new Date().toISOString(),
      }));
      return result;
    } catch (e) {
      console.error("Ders eklenemedi:", e);
      throw e;
    }
  },
  async updateCourse(id, data, category) {
    var col = this._col(category);
    await window.DBWrite.update(col, String(id), data);
  },
  async deleteCourse(id, category) {
    try {
      var col = this._col(category);
      await window.DBWrite.remove(col, id);
    } catch (e) {
      console.error("Ders silinemedi:", e);
      throw e;
    }
  },

  // Kategori bazlı proje collection adı
  _projCol: function (category) {
    if (category === "unides") return "unides_projects";
    if (category === "tubitak2209") return "tubitak2209_projects";
    return "projects";
  },

  // Projeler
  async fetchProjects(courseId, category) {
    try {
      var col = this._projCol(category);
      var params = {};
      if (courseId) params.where = "courseId:eq:s:" + courseId;
      var docs = await window.apiRead(col, params);
      docs.sort(function (a, b) {
        var ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
        var tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });
      return docs;
    } catch (e) {
      console.error("Projeler yüklenemedi:", e);
      throw e;
    }
  },
  // Tüm projeleri getir (üyelik kontrolü için)
  async fetchAllProjects(category) {
    var col = this._projCol(category);
    return await window.apiRead(col);
  },
  async createProject(data, category) {
    try {
      var col = this._projCol(category);
      var result = await window.DBWrite.add(col, Object.assign({}, data, {
        createdAt: new Date().toISOString(),
      }));
      return result;
    } catch (e) {
      console.error("Proje oluşturulamadı:", e);
      throw e;
    }
  },
  async updateProject(id, data, category) {
    var col = this._projCol(category);
    await window.DBWrite.update(col, String(id), data);
  },
  async deleteProject(id, category) {
    try {
      var col = this._projCol(category);
      await window.DBWrite.remove(col, id);
    } catch (e) {
      console.error("Proje silinemedi:", e);
      throw e;
    }
  },
};

// ══════════════════════════════════════════════════════════════
// XLSX EXPORT
// ══════════════════════════════════════════════════════════════
function exportProjectsXLSX(projects, courseName) {
  // Basit XML-based XLSX (Office Open XML SpreadsheetML)
  var statusLabels = { pending: "Onay Bekliyor", approved: "Onaylandı", rejected: "Reddedildi" };
  // Dinamik üye sayısı: tüm projeler arasındaki max üye sayısını bul
  var maxMembers = 3;
  projects.forEach(function (p) { if (p.members && p.members.length > maxMembers) maxMembers = p.members.length; });
  var header = ["#", "Proje Adı", "Proje Özeti"];
  for (var mi = 0; mi < maxMembers; mi++) header.push("Üye " + (mi + 1));
  header.push("Planlanan Tarih");
  var rows = [header];
  projects.forEach(function (p, i) {
    var members = p.members || [];
    var row = [i + 1, p.name || "", p.summary || ""];
    for (var mj = 0; mj < maxMembers; mj++) row.push(members[mj] || "");
    var sched = p.scheduleDate ? (p.scheduleDate + " " + (p.scheduleTime || "")) : "Planlanmadı";
    row.push(sched);
    rows.push(row);
  });

  var sheetData = "";
  rows.forEach(function (row, ri) {
    sheetData += "<row r=\"" + (ri + 1) + "\">";
    row.forEach(function (cell, ci) {
      var col = String.fromCharCode(65 + ci);
      var ref = col + (ri + 1);
      if (typeof cell === "number") {
        sheetData += "<c r=\"" + ref + "\"><v>" + cell + "</v></c>";
      } else {
        sheetData += "<c r=\"" + ref + "\" t=\"inlineStr\"><is><t>" + String(cell).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</t></is></c>";
      }
    });
    sheetData += "</row>";
  });

  var worksheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetData>' + sheetData + '</sheetData></worksheet>';
  var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
  var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  var wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';
  var workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Proje Grupları" sheetId="1" r:id="rId1"/></sheets></workbook>';

  // ZIP oluştur (minimal, uncompressed)
  function crc32(str) {
    var table = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); table[n] = c; }
    var crc = 0 ^ (-1); var buf = new TextEncoder().encode(str);
    for (var i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    return (crc ^ (-1)) >>> 0;
  }
  function strToBytes(s) { return new TextEncoder().encode(s); }
  function intToLE(v, n) { var a = []; for (var i = 0; i < n; i++) { a.push(v & 0xff); v >>= 8; } return new Uint8Array(a); }

  var files = [
    { path: "[Content_Types].xml", data: contentTypes },
    { path: "_rels/.rels", data: rels },
    { path: "xl/_rels/workbook.xml.rels", data: wbRels },
    { path: "xl/workbook.xml", data: workbook },
    { path: "xl/worksheets/sheet1.xml", data: worksheet },
  ];

  var parts = []; var centralDir = []; var offset = 0;
  files.forEach(function (f) {
    var nameBytes = strToBytes(f.path);
    var dataBytes = strToBytes(f.data);
    var crc = crc32(f.data);
    var localHeader = new Uint8Array([
      0x50,0x4B,0x03,0x04, 0x14,0x00, 0x00,0x00, 0x00,0x00, 0x00,0x00, 0x00,0x00,
      ...intToLE(crc, 4), ...intToLE(dataBytes.length, 4), ...intToLE(dataBytes.length, 4),
      ...intToLE(nameBytes.length, 2), 0x00, 0x00,
    ]);
    parts.push(localHeader, nameBytes, dataBytes);
    var cdEntry = new Uint8Array([
      0x50,0x4B,0x01,0x02, 0x14,0x00, 0x14,0x00, 0x00,0x00, 0x00,0x00, 0x00,0x00, 0x00,0x00,
      ...intToLE(crc, 4), ...intToLE(dataBytes.length, 4), ...intToLE(dataBytes.length, 4),
      ...intToLE(nameBytes.length, 2), 0x00,0x00, 0x00,0x00, 0x00,0x00, 0x00,0x00, 0x00,0x00,0x00,0x00,
      ...intToLE(offset, 4),
    ]);
    centralDir.push(cdEntry, nameBytes);
    offset += localHeader.length + nameBytes.length + dataBytes.length;
  });

  var cdSize = centralDir.reduce(function (s, a) { return s + a.length; }, 0);
  var eocd = new Uint8Array([
    0x50,0x4B,0x05,0x06, 0x00,0x00, 0x00,0x00,
    ...intToLE(files.length, 2), ...intToLE(files.length, 2),
    ...intToLE(cdSize, 4), ...intToLE(offset, 4), 0x00,0x00,
  ]);

  var blob = new Blob([].concat(parts, centralDir, [eocd]), { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (courseName || "Proje_Gruplari") + ".xlsx";
  a.click();
  URL.revokeObjectURL(a.href);
}

// ══════════════════════════════════════════════════════════════
// WORD EXPORT
// ══════════════════════════════════════════════════════════════
function exportProjectsWord(projects, courseName) {
  var wordStatusLabels = { pending: "Onay Bekliyor", approved: "Onaylandı", rejected: "Reddedildi" };
  var tableRows = "";
  projects.forEach(function (p, i) {
    var members = (p.members || []).join(", ");
    var sched = p.scheduleDate ? (p.scheduleDate + " " + (p.scheduleTime || "")) : "Planlanmadı";
    tableRows += "<tr><td>" + (i + 1) + "</td><td>" + (p.name || "") + "</td><td>" + (p.summary || "") +
      "</td><td>" + members + "</td><td>" + sched + "</td></tr>";
  });

  var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">' +
    '<head><meta charset="UTF-8"><style>body{font-family:Calibri,sans-serif;font-size:11pt}' +
    'h1{text-align:center;font-size:16pt;color:#1B2A4A;margin-bottom:4pt}' +
    'h2{font-size:12pt;color:#2563eb;margin-top:12pt;margin-bottom:6pt}' +
    'table{border-collapse:collapse;width:100%;margin-top:8pt}' +
    'th{background:#1B2A4A;color:white;padding:8pt 6pt;font-size:10pt;text-align:left;border:1px solid #999}' +
    'td{padding:6pt;border:1px solid #ccc;font-size:10pt;vertical-align:top}' +
    'tr:nth-child(even){background:#f5f7ff}' +
    '.info{background:#dbeafe;border:1px solid #93c5fd;border-radius:4pt;padding:8pt;margin-bottom:12pt;font-size:10pt}' +
    '</style></head><body>' +
    '<h1>Proje Grupları Raporu</h1>' +
    '<div class="info"><b>Ders:</b> ' + (courseName || "Tüm Dersler") + ' &nbsp;&nbsp;|&nbsp;&nbsp; <b>Toplam Grup:</b> ' + projects.length +
    ' &nbsp;&nbsp;|&nbsp;&nbsp; <b>Toplam Katılımcı:</b> ' + projects.reduce(function (s, p) { return s + (p.members ? p.members.length : 0); }, 0) +
    ' &nbsp;&nbsp;|&nbsp;&nbsp; <b>Tarih:</b> ' + new Date().toLocaleDateString("tr-TR") + '</div>' +
    '<table><thead><tr><th>#</th><th>Proje Adı</th><th>Proje Özeti</th><th>Üyeler</th><th>Planlanan Tarih</th></tr></thead><tbody>' +
    tableRows + '</tbody></table></body></html>';

  var blob = new Blob([html], { type: "application/msword" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (courseName || "Proje_Gruplari") + ".doc";
  a.click();
  URL.revokeObjectURL(a.href);
}

// ══════════════════════════════════════════════════════════════
// PROJE KARTI
// ══════════════════════════════════════════════════════════════
function ProjectCard({ project, userId, userName, isAdmin, onDelete, onApprove, onReject, onRespondInvite }) {
  var isOwner = project.createdBy === userId;
  var memberCount = project.members ? project.members.length : 0;
  var memberColors = ["#6366f1", "#059669", "#ea580c", "#7c3aed"];
  var expandedState = useState(false);
  var expanded = expandedState[0];
  var setExpanded = expandedState[1];
  var hoverState = useState(false);
  var hovered = hoverState[0];
  var setHovered = hoverState[1];
  var status = project.status || "approved";
  var memberStatuses = project.memberStatus || [];

  var myMemberIdx = -1;
  (project.members || []).forEach(function (m, idx) {
    if (m.trim().toLowerCase() === userName.trim().toLowerCase()) myMemberIdx = idx;
  });
  var myInviteStatus = myMemberIdx >= 0 && memberStatuses[myMemberIdx] ? memberStatuses[myMemberIdx] : null;

  var statusConfig = {
    pending: { bg: "linear-gradient(135deg, #fef3c7, #fde68a)", text: "#92400e", label: "Onay Bekliyor", dot: "#f59e0b" },
    approved: { bg: "linear-gradient(135deg, #d1fae5, #a7f3d0)", text: "#065f46", label: "Onaylandi", dot: "#059669" },
    rejected: { bg: "linear-gradient(135deg, #fee2e2, #fecaca)", text: "#991b1b", label: "Reddedildi", dot: "#dc2626" },
  };
  var statusInfo = statusConfig[status] || statusConfig.pending;

  var accentGradient = status === "pending"
    ? "linear-gradient(135deg, #f59e0b, #fbbf24)"
    : status === "rejected"
      ? "linear-gradient(135deg, #ef4444, #f87171)"
      : "linear-gradient(135deg, #6366f1, #818cf8)";

  var toggleExpand = function (e) {
    e.stopPropagation();
    setExpanded(function (prev) { return !prev; });
  };

  return (
    <div style={{
      background: "white",
      borderRadius: 20,
      overflow: "hidden",
      border: "1px solid " + (expanded || hovered ? "rgba(99,102,241,0.25)" : "rgba(0,0,0,0.06)"),
      boxShadow: expanded
        ? "0 20px 40px rgba(99,102,241,0.15), 0 0 0 1px rgba(99,102,241,0.08)"
        : hovered
          ? "0 12px 28px rgba(99,102,241,0.1), 0 0 0 1px rgba(99,102,241,0.06)"
          : "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      display: "flex", flexDirection: "column",
      alignSelf: "start",
      opacity: status === "rejected" ? 0.65 : 1,
      transform: hovered && !expanded ? "translateY(-4px)" : "translateY(0)",
      position: "relative",
    }}
      onMouseEnter={function () { setHovered(true); }}
      onMouseLeave={function () { setHovered(false); }}
    >
      {/* Accent gradient bar */}
      <div style={{ height: 3, background: accentGradient }} />

      {/* Header */}
      <div style={{
        padding: window.innerWidth <= 480 ? "14px 16px" : "18px 22px",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
      }} onClick={toggleExpand}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Status badge */}
          <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 11, fontWeight: 600,
              background: statusInfo.bg,
              color: statusInfo.text,
              padding: "3px 10px",
              borderRadius: 20,
              display: "inline-flex", alignItems: "center", gap: 5,
              letterSpacing: "0.01em",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusInfo.dot, display: "inline-block", flexShrink: 0 }} />
              {statusInfo.label}
            </span>
          </div>

          {/* Project name */}
          <h3 style={{
            fontSize: window.innerWidth <= 480 ? 15 : 16,
            fontWeight: 700,
            color: PRJ.text,
            margin: 0,
            lineHeight: 1.4,
            letterSpacing: "-0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}>
            {project.name}
          </h3>

          {/* Meta row: date + member avatars */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 12,
            flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: PRJ.textMuted }}>
              <PrjIcon path={PRJ_ICONS.clock} size={13} color="#9ca3af" />
              {prjFormatDate(project.createdAt)}
            </div>

            {project.scheduleDate && project.scheduleTime && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: PRJ.primary, fontWeight: 600, background: PRJ.primaryPale, padding: "3px 10px", borderRadius: 8, border: "1px solid " + PRJ.primary + "30" }}>
                <PrjIcon path={PRJ_ICONS.calendar} size={13} color={PRJ.primary} />
                Sunum: {new Date(project.scheduleDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} - {project.scheduleTime}
              </div>
            )}

            {/* Member avatar stack */}
            <div style={{ display: "flex", alignItems: "center" }}>
              {(project.members || []).slice(0, 3).map(function (member, idx) {
                return (
                  <div key={idx} style={{
                    width: 28, height: 28,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, " + memberColors[idx % memberColors.length] + ", " + memberColors[idx % memberColors.length] + "bb)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: 11, fontWeight: 700,
                    border: "2px solid white",
                    marginLeft: idx > 0 ? -8 : 0,
                    position: "relative",
                    zIndex: 3 - idx,
                    flexShrink: 0,
                  }} title={member}>
                    {member.charAt(0).toUpperCase()}
                  </div>
                );
              })}
              <span style={{ fontSize: 12, color: PRJ.textMuted, marginLeft: 8, fontWeight: 500 }}>
                {memberCount} kisi
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginTop: 2 }}>
          {isAdmin && status === "pending" && (
            <>
              <button onClick={function (e) { e.stopPropagation(); onApprove(project.id); }} title="Onayla"
                style={{
                  background: "linear-gradient(135deg, #059669, #10b981)",
                  border: "none", cursor: "pointer", color: "white",
                  padding: "6px 12px", borderRadius: 8,
                  transition: "all 0.2s",
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 11, fontWeight: 600,
                  boxShadow: "0 2px 6px rgba(5,150,105,0.3)",
                }}>
                <PrjIcon path={PRJ_ICONS.check} size={13} color="white" /> Onayla
              </button>
              <button onClick={function (e) { e.stopPropagation(); onReject(project.id); }} title="Reddet"
                style={{
                  background: "linear-gradient(135deg, #dc2626, #ef4444)",
                  border: "none", cursor: "pointer", color: "white",
                  padding: "6px 12px", borderRadius: 8,
                  transition: "all 0.2s",
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 11, fontWeight: 600,
                  boxShadow: "0 2px 6px rgba(220,38,38,0.3)",
                }}>
                <PrjIcon path={PRJ_ICONS.x} size={13} color="white" /> Reddet
              </button>
            </>
          )}
          {(isAdmin || isOwner) && (
            <button onClick={function (e) { e.stopPropagation(); onDelete(project.id); }} title="Projeyi sil"
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: PRJ.textMuted, padding: 6, borderRadius: 8,
                transition: "all 0.2s", display: "flex", alignItems: "center",
              }}
              onMouseEnter={function (e) { e.currentTarget.style.color = PRJ.red; e.currentTarget.style.background = "rgba(220,38,38,0.08)"; }}
              onMouseLeave={function (e) { e.currentTarget.style.color = PRJ.textMuted; e.currentTarget.style.background = "transparent"; }}
            >
              <PrjIcon path={PRJ_ICONS.trash} size={15} />
            </button>
          )}
          <div style={{
            width: 28, height: 28,
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: expanded ? "rgba(99,102,241,0.08)" : "transparent",
            transition: "all 0.2s",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={expanded ? "#6366f1" : PRJ.textMuted}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{
          padding: window.innerWidth <= 480 ? "0 16px 16px" : "0 22px 20px",
          borderTop: "1px solid rgba(0,0,0,0.05)",
        }}>
          <div style={{
            fontSize: 12, color: PRJ.textMuted, marginTop: 14, marginBottom: 14,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <PrjIcon path={PRJ_ICONS.user} size={13} color="#9ca3af" />
            Olusturan: <span style={{ fontWeight: 600, color: PRJ.text }}>{project.createdByName}</span>
          </div>

          {/* Invite response */}
          {myInviteStatus === "pending" && !isOwner && (
            <div style={{
              background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
              borderRadius: 14, padding: "14px 18px", marginBottom: 16,
              border: "1px solid rgba(245,158,11,0.2)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 10, flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PrjIcon path={PRJ_ICONS.mail} size={16} color="#92400e" />
                <span style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>Bu gruba davet edildiniz</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={function () { onRespondInvite(project.id, myMemberIdx, "accepted"); }}
                  style={{
                    background: "linear-gradient(135deg, #059669, #10b981)",
                    color: "white", border: "none", borderRadius: 8,
                    padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 4,
                    boxShadow: "0 2px 6px rgba(5,150,105,0.3)",
                  }}>
                  <PrjIcon path={PRJ_ICONS.check} size={12} color="white" /> Kabul Et
                </button>
                <button onClick={function () { onRespondInvite(project.id, myMemberIdx, "rejected"); }}
                  style={{
                    background: "linear-gradient(135deg, #dc2626, #ef4444)",
                    color: "white", border: "none", borderRadius: 8,
                    padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 4,
                    boxShadow: "0 2px 6px rgba(220,38,38,0.3)",
                  }}>
                  <PrjIcon path={PRJ_ICONS.x} size={12} color="white" /> Reddet
                </button>
              </div>
            </div>
          )}

          {/* Summary */}
          {project.summary && (
            <div style={{
              background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
              borderRadius: 14, padding: "14px 18px", marginBottom: 16,
              border: "1px solid rgba(0,0,0,0.04)",
            }}>
              <p style={{ fontSize: 13.5, color: PRJ.text, lineHeight: 1.65, margin: 0 }}>{project.summary}</p>
            </div>
          )}

          {/* Members */}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: PRJ.textMuted, marginBottom: 10,
              textTransform: "uppercase", letterSpacing: "0.05em",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <PrjIcon path={PRJ_ICONS.users} size={13} />
              Grup Uyeleri ({memberCount})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(project.members || []).map(function (member, idx) {
                var inviteStatus = memberStatuses[idx] || (idx === 0 ? "accepted" : "accepted");
                var inviteLabel = inviteStatus === "pending" ? "Davet Bekliyor" : inviteStatus === "rejected" ? "Reddetti" : null;
                var inviteBg = inviteStatus === "pending" ? "linear-gradient(135deg, #fef3c7, #fde68a)" : inviteStatus === "rejected" ? "linear-gradient(135deg, #fee2e2, #fecaca)" : null;
                var inviteColor = inviteStatus === "pending" ? "#92400e" : inviteStatus === "rejected" ? "#991b1b" : null;
                return (
                  <div key={idx} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 12,
                    background: "rgba(" + (idx === 0 ? "99,102,241" : idx === 1 ? "5,150,105" : "234,88,12") + ",0.04)",
                    border: "1px solid rgba(" + (idx === 0 ? "99,102,241" : idx === 1 ? "5,150,105" : "234,88,12") + ",0.1)",
                    transition: "all 0.2s",
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: "linear-gradient(135deg, " + memberColors[idx % memberColors.length] + ", " + memberColors[idx % memberColors.length] + "bb)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontSize: 14, fontWeight: 700, flexShrink: 0,
                      boxShadow: "0 2px 8px " + memberColors[idx % memberColors.length] + "40",
                    }}>
                      {member.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: PRJ.text }}>{member}</span>
                    {idx === 0 && (
                      <span style={{
                        marginLeft: "auto", fontSize: 10, fontWeight: 700,
                        background: "linear-gradient(135deg, #6366f1, #818cf8)",
                        color: "white",
                        padding: "3px 10px", borderRadius: 6,
                        letterSpacing: "0.02em",
                      }}>
                        Lider
                      </span>
                    )}
                    {idx > 0 && inviteLabel && (
                      <span style={{
                        marginLeft: "auto", fontSize: 10, fontWeight: 600,
                        background: inviteBg, color: inviteColor,
                        padding: "3px 10px", borderRadius: 6,
                      }}>
                        {inviteLabel}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PROJE OLUŞTURMA MODALI
// ══════════════════════════════════════════════════════════════
function CreateProjectModal({ onClose, onCreate, currentUserName, minGroupSize, maxGroupSize }) {
  var _s = useState, _e = React.useEffect;
  var minSize = minGroupSize || 2;
  var maxSize = maxGroupSize || 3;
  var ns = _s(""), name = ns[0], setName = ns[1];
  var ss = _s(""), summary = ss[0], setSummary = ss[1];
  // Başlangıçta minSize kadar üye slotu oluştur (ilki currentUser)
  var initialMembers = [currentUserName];
  for (var _i = 1; _i < minSize; _i++) initialMembers.push("");
  var ms = _s(initialMembers), members = ms[0], setMembers = ms[1];

  var addMember = function () { if (members.length >= maxSize) return; setMembers(function (p) { return p.concat([""]); }); };
  var removeMember = function (idx) { if (members.length <= minSize || idx === 0) return; setMembers(function (p) { return p.filter(function (_, i) { return i !== idx; }); }); };
  var updateMember = function (idx, v) { setMembers(function (p) { return p.map(function (m, i) { return i === idx ? v : m; }); }); };

  var handleSubmit = function () {
    if (!name.trim()) { alert("Proje adı zorunludur!"); return; }
    if (!summary.trim()) { alert("Proje özeti zorunludur!"); return; }
    var valid = members.filter(function (m) { return m.trim(); });
    if (valid.length < minSize) { alert("En az " + minSize + " kişi olmalıdır!"); return; }
    if (valid.length > maxSize) { alert("En fazla " + maxSize + " kişi olabilir!"); return; }
    var unique = []; valid.forEach(function (m) { if (unique.indexOf(m.trim().toLowerCase()) < 0) unique.push(m.trim().toLowerCase()); });
    if (unique.length !== valid.length) { alert("Aynı isimde birden fazla üye ekleyemezsiniz!"); return; }
    onCreate({ name: name.trim(), summary: summary.trim(), members: valid.map(function (m) { return m.trim(); }) });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 16, padding: window.innerWidth <= 480 ? 16 : 32, width: "min(520px, calc(100vw - 32px))", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }} onClick={function (e) { e.stopPropagation(); }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: PRJ.text, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <PrjIcon path={PRJ_ICONS.userPlus} size={22} color={PRJ.primary} /> Yeni Proje Grubu
        </h3>
        <div style={{ background: PRJ.primaryPale, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 10, border: "1px solid " + PRJ.primary + "30" }}>
          <PrjIcon path={PRJ_ICONS.info} size={18} color={PRJ.primary} />
          <p style={{ fontSize: 13, color: PRJ.primary, margin: 0, lineHeight: 1.5 }}>Proje grupları {minSize === maxSize ? minSize + " kişiden" : minSize + " ile " + maxSize + " kişi arasından"} oluşabilir. İlk üye olarak siz otomatik eklenirsiniz.</p>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>Proje Adı *</label>
          <input type="text" value={name} onChange={function (e) { setName(e.target.value); }} placeholder="Proje adını yazın..."
            style={{ width: "100%", padding: "10px 14px", border: "1px solid " + PRJ.border, borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "'Source Sans 3', sans-serif" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>Proje Özeti *</label>
          <textarea value={summary} onChange={function (e) { setSummary(e.target.value); }} placeholder="Projenizin kısa bir özetini yazın..." rows={3}
            style={{ width: "100%", padding: "10px 14px", border: "1px solid " + PRJ.border, borderRadius: 8, fontSize: 14, resize: "vertical", outline: "none", fontFamily: "'Source Sans 3', sans-serif" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>Grup Üyeleri * ({minSize === maxSize ? minSize + " kişi" : minSize + "-" + maxSize + " kişi"})</label>
          {members.map(function (member, idx) {
            return (
              <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: idx === 0 ? PRJ.primary : PRJ.border, display: "flex", alignItems: "center", justifyContent: "center", color: idx === 0 ? "white" : PRJ.textMuted, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</div>
                <input type="text" value={member} onChange={function (e) { updateMember(idx, e.target.value); }} placeholder={idx === 0 ? "Sizin adınız" : (idx + 1) + ". üye adı"} disabled={idx === 0}
                  style={{ flex: 1, padding: "8px 12px", border: "1px solid " + PRJ.border, borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "'Source Sans 3', sans-serif", background: idx === 0 ? "#f9fafb" : "white", color: idx === 0 ? PRJ.textMuted : PRJ.text }} />
                {idx === 0 && <span style={{ fontSize: 10, color: PRJ.primary, fontWeight: 600, whiteSpace: "nowrap" }}>(Siz)</span>}
                {idx > 0 && members.length > minSize && (
                  <button onClick={function () { removeMember(idx); }} style={{ background: PRJ.redLight, color: PRJ.red, border: "none", borderRadius: 6, padding: "0 10px", cursor: "pointer", height: 34, display: "flex", alignItems: "center" }}>
                    <PrjIcon path={PRJ_ICONS.x} size={14} />
                  </button>
                )}
              </div>
            );
          })}
          {members.length < maxSize && (
            <button onClick={addMember} style={{ background: PRJ.primaryPale, color: PRJ.primary, border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <PrjIcon path={PRJ_ICONS.plus} size={14} /> Üye Ekle
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid " + PRJ.border, background: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, color: PRJ.textMuted }}>İptal</button>
          <button onClick={handleSubmit} style={{ padding: "10px 24px", border: "none", background: "linear-gradient(135deg, #1e40af, #2563eb)", color: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <PrjIcon path={PRJ_ICONS.check} size={16} color="white" /> Proje Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DERS EKLEME MODALI (Admin / Akademisyen)
// availableCourses: sinav_dersler'den yüklenmiş bölüm dersleri
// isProfessor: true ise sadece kendi dersleri listelenir
// currentUserName: akademisyen filtresi için
// ══════════════════════════════════════════════════════════════
function AddCourseModal({ onClose, onAdd, editCourse, categoryLabel, availableCourses, isProfessor, currentUserName }) {
  var cs = useState(editCourse ? editCourse.code : ""), code = cs[0], setCode = cs[1];
  var ns = useState(editCourse ? editCourse.name : ""), name = ns[0], setName = ns[1];
  var ps = useState(editCourse ? (editCourse.professor || "") : ""), prof = ps[0], setProf = ps[1];
  var ds = useState(editCourse ? (editCourse.deadline || "") : ""), deadline = ds[0], setDeadline = ds[1];
  var pds = useState(editCourse ? (editCourse.projectPeriod || "") : ""), projectPeriod = pds[0], setProjectPeriod = pds[1];
  var mns = useState(editCourse ? (editCourse.minGroupSize || 2) : 2), minGroupSize = mns[0], setMinGroupSize = mns[1];
  var mxs = useState(editCourse ? (editCourse.maxGroupSize || 3) : 3), maxGroupSize = mxs[0], setMaxGroupSize = mxs[1];
  var scs = useState(""), selectedCourseId = scs[0], setSelectedCourseId = scs[1];

  // Akademisyense sadece kendisine ait dersleri filtrele, admin/bölüm yetkilisiyse hepsini göster
  // Ders Yönetimi'ndeki professor alanı unvanlı/farklı yazılmış olabilir → toleranslı eşleme
  var myCourses = (availableCourses || []).filter(function (c) {
    if (!isProfessor) return true;
    return prjMatchesProfessor(c.professor, currentUserName);
  });
  // Aynı ders kodu birden fazla kayıtta varsa tekilleştir
  var seen = {};
  var uniqueCourses = [];
  myCourses.forEach(function (c) {
    var key = (c.code || "") + "|" + (c.professor || "");
    if (!seen[key]) { seen[key] = true; uniqueCourses.push(c); }
  });

  var onCourseSelect = function (e) {
    var id = e.target.value;
    setSelectedCourseId(id);
    if (!id) return;
    var c = uniqueCourses.find(function (x) { return x.id === id; });
    if (c) {
      setCode(c.code || "");
      setName(c.name || "");
      setProf(c.professor || "");
    }
  };

  var handleSubmit = function () {
    if (!code.trim() || !name.trim()) { alert("Ders kodu ve adı zorunludur!"); return; }
    var minG = parseInt(minGroupSize) || 2;
    var maxG = parseInt(maxGroupSize) || 3;
    if (minG < 1) { alert("Minimum grup boyutu en az 1 olmalıdır!"); return; }
    if (maxG < minG) { alert("Maksimum grup boyutu, minimum grup boyutundan küçük olamaz!"); return; }
    if (maxG > 10) { alert("Maksimum grup boyutu 10'u geçemez!"); return; }
    onAdd({ code: code.trim(), name: name.trim(), professor: prof.trim(), deadline: deadline || null, projectPeriod: projectPeriod.trim() || null, minGroupSize: minG, maxGroupSize: maxG });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 16, padding: window.innerWidth <= 480 ? 16 : 28, width: "min(440px, calc(100vw - 32px))", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }} onClick={function (e) { e.stopPropagation(); }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: PRJ.text, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <PrjIcon path={PRJ_ICONS.book} size={20} color={PRJ.primary} /> {editCourse ? "Düzenle" : (categoryLabel ? categoryLabel + " - Yeni Proje Alanı Ekle" : "Yeni Ders Ekle")}
        </h3>

        {/* Ders Seçimi (Ders Yönetimi'nden) — yalnızca yeni eklerken ve dersler yüklüyse */}
        {!editCourse && uniqueCourses.length > 0 && (
          <div style={{ marginBottom: 16, padding: 14, background: "#F0F7FF", border: "1px solid #BFDBFE", borderRadius: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8, color: PRJ.primary }}>
              {isProfessor ? "Derslerinizden Seçin" : "Ders Yönetimi'nden Seç"}
            </label>
            <select value={selectedCourseId} onChange={onCourseSelect}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid " + PRJ.border, borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "'Source Sans 3', sans-serif", background: "white", cursor: "pointer" }}>
              <option value="">— Ders seçin —</option>
              {uniqueCourses.map(function (c) {
                var label = (c.code || "") + " — " + (c.name || "");
                if (c.professor) label += " (" + c.professor + ")";
                return <option key={c.id} value={c.id}>{label}</option>;
              })}
            </select>
            <p style={{ fontSize: 11, color: PRJ.textMuted, margin: "8px 0 0 0" }}>
              {isProfessor
                ? "Sadece size tanımlanmış dersler listelenir. Bir ders seçtiğinizde kod, ad ve hoca bilgisi otomatik doldurulur."
                : "Bölümünüze tanımlı dersleri seçip alanları otomatik doldurabilirsiniz."}
            </p>
          </div>
        )}
        {!editCourse && isProfessor && uniqueCourses.length === 0 && (
          <div style={{ marginBottom: 16, padding: 12, background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 10, fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>
            <b>Size tanımlı ders bulunamadı.</b><br />
            Bölüm yetkilisinin <b>Ders Yönetimi</b> sayfasından dersi size atamış olması gerekir.
            {availableCourses && availableCourses.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: "#78350F" }}>
                (Bölümünüzde {availableCourses.length} ders var ama hiçbiri "{currentUserName}" adıyla eşleşmiyor.
                Ders Yönetimi'ndeki "Akademisyen" alanı tam adınızla aynı olmalı.)
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>Ders Kodu *</label>
          <input type="text" value={code} onChange={function (e) { setCode(e.target.value); }} placeholder="BIL401"
            readOnly={isProfessor && !!selectedCourseId}
            style={{ width: "100%", padding: "10px 14px", border: "1px solid " + PRJ.border, borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "'Source Sans 3', sans-serif", background: (isProfessor && !!selectedCourseId) ? "#F3F4F6" : "white" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>Ders Adı *</label>
          <input type="text" value={name} onChange={function (e) { setName(e.target.value); }} placeholder="Bilgisayar Projesi I"
            readOnly={isProfessor && !!selectedCourseId}
            style={{ width: "100%", padding: "10px 14px", border: "1px solid " + PRJ.border, borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "'Source Sans 3', sans-serif", background: (isProfessor && !!selectedCourseId) ? "#F3F4F6" : "white" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>Dersin Hocası</label>
          <input type="text" value={prof} onChange={function (e) { setProf(e.target.value); }} placeholder="Dr. Öğr. Üyesi ..."
            readOnly={isProfessor && !!selectedCourseId}
            style={{ width: "100%", padding: "10px 14px", border: "1px solid " + PRJ.border, borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "'Source Sans 3', sans-serif", background: (isProfessor && !!selectedCourseId) ? "#F3F4F6" : "white" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>Proje Dönemi</label>
          <input type="text" value={projectPeriod} onChange={function (e) { setProjectPeriod(e.target.value); }} placeholder="2025-2026 Güz / 2025-2026 Bahar"
            style={{ width: "100%", padding: "10px 14px", border: "1px solid " + PRJ.border, borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "'Source Sans 3', sans-serif" }} />
        </div>
        <div style={{ marginBottom: 14, display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <PrjIcon path={PRJ_ICONS.users} size={14} color={PRJ.primary} /> Min Grup Boyutu
              </span>
            </label>
            <input type="number" min="1" max="10" value={minGroupSize} onChange={function (e) { setMinGroupSize(e.target.value); }}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid " + PRJ.border, borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "'Source Sans 3', sans-serif" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <PrjIcon path={PRJ_ICONS.users} size={14} color={PRJ.primary} /> Max Grup Boyutu
              </span>
            </label>
            <input type="number" min="1" max="10" value={maxGroupSize} onChange={function (e) { setMaxGroupSize(e.target.value); }}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid " + PRJ.border, borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "'Source Sans 3', sans-serif" }} />
          </div>
        </div>
        <p style={{ fontSize: 11, color: PRJ.textMuted, marginTop: -8, marginBottom: 14 }}>Öğrenciler bu aralıkta grup oluşturabilir. (Varsayılan: 2-3 kişi)</p>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PrjIcon path={PRJ_ICONS.calendar} size={14} color={PRJ.primary} /> Proje Son Tarihi (Deadline)
            </span>
          </label>
          <input type="date" value={deadline} onChange={function (e) { setDeadline(e.target.value); }}
            style={{ width: "100%", padding: "10px 14px", border: "1px solid " + PRJ.border, borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "'Source Sans 3', sans-serif" }} />
          <p style={{ fontSize: 11, color: PRJ.textMuted, marginTop: 4, marginBottom: 0 }}>Bu tarihten sonra yeni proje grubu oluşturulamaz. Boş bırakılırsa sınır yoktur.</p>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid " + PRJ.border, background: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, color: PRJ.textMuted }}>İptal</button>
          <button onClick={handleSubmit} style={{ padding: "10px 24px", border: "none", background: "linear-gradient(135deg, #1e40af, #2563eb)", color: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>{editCourse ? "Kaydet" : "Ders Ekle"}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TOPLU PROJE PLANLAMA MODALI
// ══════════════════════════════════════════════════════════════
function BulkScheduleModal({ onClose, onDistribute, projectCount }) {
  var _s = useState;
  var ss = _s([{ date: "", time: "14:00 - 15:00", capacity: 5 }]), sessions = ss[0], setSessions = ss[1];

  var addSession = function () { setSessions(function(p){ return p.concat([{ date: "", time: "14:00 - 15:00", capacity: 5 }]); }); };
  var updateSession = function (idx, field, val) {
    setSessions(function(p){
      var n = p.slice();
      n[idx] = Object.assign({}, n[idx], { [field]: val });
      return n;
    });
  };
  var removeSession = function (idx) {
    setSessions(function(p){ return p.filter(function(_, i){ return i !== idx; }); });
  };

  var totalCapacity = sessions.reduce(function(acc, s){ return acc + (parseInt(s.capacity)||0); }, 0);

  var handleSubmit = function () {
    var valid = sessions.filter(function(s){ return s.date && s.time && s.capacity > 0; });
    if (valid.length === 0) { alert("Lütfen en az bir geçerli oturum ekleyin."); return; }
    if (totalCapacity < projectCount) {
      if (!confirm("Oturum toplam kapasitesi ("+totalCapacity+") onaylı/bekleyen proje sayısından ("+projectCount+") az. Yine de devam edilsin mi? (Açıkta kalan projeler planlanmayacak.)")) {
        return;
      }
    }
    onDistribute(valid);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 16, padding: window.innerWidth <= 480 ? 16 : 28, width: "min(600px, calc(100vw - 32px))", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }} onClick={function (e) { e.stopPropagation(); }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: PRJ.navy, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <PrjIcon path={PRJ_ICONS.calendar} size={22} color={PRJ.primary} /> Toplu Proje Planlama
        </h3>
        <p style={{ fontSize: 13, color: PRJ.textMuted, marginBottom: 20, lineHeight: 1.5 }}>
          Bekleyen/Onaylanmış <b>{projectCount} adet proje</b> için sunum ve değerlendirme tarihleri atayın. Oturumları açtıktan sonra "Dağıt ve Kaydet" butonuna bastığınızda seçili projeler belirtilen oturumlara dağıtılacaktır. (Not: Tamamen rastgele değil, sırayla atanır.)
        </p>

        <div style={{ marginBottom: 16 }}>
          {sessions.map(function(s, idx){
            return (
              <div key={idx} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-end", padding: "12px", background: PRJ.bg, borderRadius: 12, border: "1px solid " + PRJ.border, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 120px" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: PRJ.textMuted, display: "block", marginBottom: 4 }}>Tarih</label>
                  <input type="date" value={s.date} onChange={function(e){ updateSession(idx, "date", e.target.value); }} 
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid " + PRJ.border, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                </div>
                <div style={{ flex: "1 1 120px" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: PRJ.textMuted, display: "block", marginBottom: 4 }}>Saat Aralığı</label>
                  <input type="text" placeholder="Örn: 14:00 - 15:00" value={s.time} onChange={function(e){ updateSession(idx, "time", e.target.value); }} 
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid " + PRJ.border, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                </div>
                <div style={{ flex: "1 1 70px" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: PRJ.textMuted, display: "block", marginBottom: 4 }}>Kapasite</label>
                  <input type="number" min="1" value={s.capacity} onChange={function(e){ updateSession(idx, "capacity", parseInt(e.target.value)); }} 
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid " + PRJ.border, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                </div>
                {sessions.length > 1 && (
                  <button onClick={function(){ removeSession(idx); }} style={{ background: "transparent", color: PRJ.red, border: "none", cursor: "pointer", padding: 8, marginBottom: 2, flexShrink: 0 }}>
                    <PrjIcon path={PRJ_ICONS.trash} size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <button onClick={addSession} style={{ background: PRJ.primaryPale, color: PRJ.primary, border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <PrjIcon path={PRJ_ICONS.plus} size={14} /> Yeni Oturum Ekle
          </button>
          <div style={{ fontSize: 13, fontWeight: 600, color: totalCapacity < projectCount ? PRJ.orange : PRJ.green, background: totalCapacity < projectCount ? PRJ.orangeLight : PRJ.greenLight, padding: "6px 12px", borderRadius: 8 }}>
            Toplam Kapasite: {totalCapacity} / {projectCount}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid " + PRJ.border, background: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, color: PRJ.textMuted }}>İptal</button>
          <button onClick={handleSubmit} style={{ padding: "10px 24px", border: "none", background: "linear-gradient(135deg, #059669, #10b981)", color: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <PrjIcon path={PRJ_ICONS.check} size={16} color="white" /> Dağıt ve Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ANA MODÜL
// ══════════════════════════════════════════════════════════════
// ── Proje Kategorileri ──
const PROJECT_CATEGORIES = [
  { id: "bolum", label: "Bölüm", icon: PRJ_ICONS.users, color: "#3B82F6", description: "Bölüm içi ders bazlı proje grupları", collection: "project_courses" },
  { id: "unides", label: "ÜNİDES", icon: PRJ_ICONS.book, color: "#8B5CF6", description: "ÜNİDES destekli projeler", collection: "unides_courses" },
  { id: "tubitak2209", label: "TÜBİTAK 2209", icon: PRJ_ICONS.shield, color: "#059669", description: "TÜBİTAK 2209 destekli araştırma projeleri", collection: "tubitak2209_courses" },
];

function ProjeModuluApp({ currentUser, activeDepartment, departmentInfo }) {
  var _s = useState;
  var cs = _s([]), courses = cs[0], setCourses = cs[1];
  var ps = _s([]), projects = ps[0], setProjects = ps[1];
  var ls = _s(true), loading = ls[0], setLoading = ls[1];
  var vs = _s(null), selectedCourse = vs[0], setSelectedCourse = vs[1]; // null = ders listesi, object = ders detayı
  var sms = _s(false), showCreateModal = sms[0], setShowCreateModal = sms[1];
  var scm = _s(false), showCourseModal = scm[0], setShowCourseModal = scm[1];
  var sbms = _s(false), showBulkScheduleModal = sbms[0], setShowBulkScheduleModal = sbms[1];
  var sq = _s(""), searchQuery = sq[0], setSearchQuery = sq[1];
  var ecv = _s(null), editingCourse = ecv[0], setEditingCourse = ecv[1]; // ders düzenleme
  var dcs = _s([]), deptCourses = dcs[0], setDeptCourses = dcs[1]; // sinav_dersler'den yüklenen bölüm dersleri
  var [activeCategory, setActiveCategory] = useState("bolum"); // bolum, universite, tubitak

  var aps = _s([]), allProjects = aps[0], setAllProjects = aps[1];

  var userId = currentUser && (currentUser.studentNumber || currentUser.name) || "anonymous";
  var userName = currentUser && currentUser.name || "Anonim";
  var isAdmin = currentUser && currentUser.role === "admin";
  var isDeptManager = currentUser && currentUser.role === "bolum_yetkilisi";
  var isProfessor = currentUser && currentUser.role === "professor";
  var canManage = isAdmin || isDeptManager || isProfessor;

  // ── Bölüm derslerini yükle (sinav_dersler koleksiyonundan — Ders Yönetimi) ──
  useEffect(function () {
    if (!activeDepartment || !window.apiRead) return;
    var where = "departmentId:eq:" + activeDepartment;
    window.apiRead("sinav_dersler", { where: where }).then(function (all) {
      // apiRead bazen tüm bölümleri dönebildiğinden güvenlik için tekrar filtrele
      var filtered = (all || []).filter(function (c) { return c.departmentId === activeDepartment; });
      setDeptCourses(filtered);
    }).catch(function (err) { console.error("Bölüm dersleri yüklenemedi:", err); });
  }, [activeDepartment]);

  // ── Tüm projeleri yükle (üyelik kontrolü için) ──
  var loadAllProjects = useCallback(function () {
    ProjDB.fetchAllProjects(activeCategory).then(function (data) {
      setAllProjects(data);
    }).catch(function () {});
  }, [activeCategory]);

  // ── Dersleri Yükle (kategori ve bölüm bazlı) ──
  useEffect(function () {
    setLoading(true);
    setSelectedCourse(null);
    setProjects([]);
    loadAllProjects();
    ProjDB.fetchCourses(activeCategory, activeDepartment).then(function (data) {
      var filtered = isProfessor && userName
        ? data.filter(function (c) { return prjMatchesProfessor(c.professor, userName); })
        : data;
      setCourses(filtered);
      setLoading(false);
    }).catch(function (err) {
      console.error("Ders listesi yüklenemedi:", err);
      setLoading(false);
    });
  }, [activeCategory, activeDepartment]);

  // ── Seçili ders değiştiğinde projeleri yükle ──
  useEffect(function () {
    if (!selectedCourse) { setProjects([]); return; }
    setLoading(true);
    ProjDB.fetchProjects(selectedCourse.id, activeCategory).then(function (data) {
      setProjects(data);
      setLoading(false);
    }).catch(function (err) {
      console.error("Projeler yüklenemedi:", err);
      setLoading(false);
    });
  }, [selectedCourse, activeCategory]);

  // ── Ders Ekle / Düzenle ──
  var handleAddCourse = async function (data) {
    // departmentId ekle
    var courseData = Object.assign({}, data, { departmentId: activeDepartment });
    try {
      if (editingCourse) {
        await ProjDB.updateCourse(editingCourse.id, courseData, activeCategory);
        setCourses(function (prev) {
          return prev.map(function (c) { return c.id === editingCourse.id ? Object.assign({}, c, courseData) : c; });
        });
        if (selectedCourse && selectedCourse.id === editingCourse.id) {
          setSelectedCourse(function (prev) { return Object.assign({}, prev, courseData); });
        }
        setEditingCourse(null);
      } else {
        var ref = await ProjDB.addCourse(courseData, activeCategory);
        setCourses(function (prev) { return prev.concat([Object.assign({}, courseData, { id: ref.id })]); });
        // Bu dersi almış öğrencilere bildirim yolla (yalnızca yeni proje grubu oluştururken)
        try {
          if (window.StudentNotifier) {
            var catLabel = activeCat && activeCat.label ? activeCat.label : "Proje";
            window.StudentNotifier.notifyCourseStudents(activeDepartment, data.code, {
              type: "project_group",
              title: catLabel + " grubu açıldı",
              message: (data.code || "") + " - " + (data.name || "") +
                " dersine " + (data.professor ? ("(" + data.professor + ") ") : "") +
                "yeni bir proje grubu oluşturuldu.",
              link: "projeler",
              courseCode: data.code || null,
            });
          }
        } catch (ne) { console.warn("Bildirim gönderilemedi:", ne); }
      }
      setShowCourseModal(false);
    } catch (e) {
      alert("Ders " + (editingCourse ? "güncellenemedi" : "eklenemedi") + ": " + e.message);
    }
  };

  // ── Ders Sil ──
  var handleDeleteCourse = async function (courseId) {
    if (!confirm("Bu dersi ve tüm proje gruplarını silmek istediğinize emin misiniz?")) return;
    try {
      await ProjDB.deleteCourse(courseId, activeCategory);
      var courseProjects = await ProjDB.fetchProjects(courseId, activeCategory);
      for (var i = 0; i < courseProjects.length; i++) {
        await ProjDB.deleteProject(courseProjects[i].id, activeCategory);
      }
      setCourses(function (prev) { return prev.filter(function (c) { return c.id !== courseId; }); });
      if (selectedCourse && selectedCourse.id === courseId) setSelectedCourse(null);
    } catch (e) {
      alert("Ders silinemedi: " + e.message);
    }
  };

  // ── Üyelik kontrolü: Bir kişi aynı derste zaten bir projede mi? ──
  var findMemberExistingProjectInCourse = function (memberName) {
    if (!memberName || !memberName.trim() || !selectedCourse) return null;
    var nameLower = memberName.trim().toLowerCase();
    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];
      if (p.members && p.members.some(function (m) { return m.trim().toLowerCase() === nameLower; })) {
        return p;
      }
    }
    return null;
  };

  // ── Kullanıcı seçili derste zaten bir proje grubunda mı? ──
  var userExistingProject = useMemo(function () {
    return findMemberExistingProjectInCourse(userName);
  }, [projects, userName, selectedCourse]);

  // ── Proje Onayla / Reddet ──
  var handleApproveProject = async function (projectId) {
    try {
      await ProjDB.updateProject(projectId, { status: "approved" }, activeCategory);
      setProjects(function (prev) { return prev.map(function (p) { return p.id === projectId ? Object.assign({}, p, { status: "approved" }) : p; }); });
      setAllProjects(function (prev) { return prev.map(function (p) { return p.id === projectId ? Object.assign({}, p, { status: "approved" }) : p; }); });
    } catch (e) {
      alert("Proje onaylanamadı: " + e.message);
    }
  };

  var handleRejectProject = async function (projectId) {
    if (!confirm("Bu projeyi reddetmek istediğinize emin misiniz?")) return;
    try {
      await ProjDB.updateProject(projectId, { status: "rejected" }, activeCategory);
      setProjects(function (prev) { return prev.map(function (p) { return p.id === projectId ? Object.assign({}, p, { status: "rejected" }) : p; }); });
      setAllProjects(function (prev) { return prev.map(function (p) { return p.id === projectId ? Object.assign({}, p, { status: "rejected" }) : p; }); });
    } catch (e) {
      alert("Proje reddedilemedi: " + e.message);
    }
  };

  // ── Toplu Proje Planlama Dağıtımı ──
  var handleDistributeSchedule = async function (sessions) {
    var targets = projects.filter(function(p) { return !p.status || p.status === "approved" || p.status === "pending"; });
    if(targets.length === 0) { alert("Dağıtım yapılacak onaylı veya bekleyen proje yok."); return; }

    try {
      setLoading(true);
      var assignedCount = 0;
      var sessionIndex = 0;
      var currentSessionCount = 0;
      
      var parseMinutes = function(t) { var a = t.split(":"); return parseInt(a[0]) * 60 + parseInt(a[1]); };
      var fmt = function(m) { var h = Math.floor(m/60), mn = m%60; return (h<10?"0"+h:""+h)+":"+(mn<10?"0"+mn:""+mn); };

      for(var i=0; i<targets.length; i++) {
        var p = targets[i];
        if (sessionIndex >= sessions.length) break;
        var s = sessions[sessionIndex];

        // Oturum süresini kapasiteye bölerek bireysel slot hesapla
        var slotTime = s.time;
        var timeParts = s.time.replace(/\s/g, "").split("-");
        if (timeParts.length === 2 && timeParts[0].indexOf(":") !== -1 && timeParts[1].indexOf(":") !== -1) {
          var sesStart = parseMinutes(timeParts[0]);
          var sesEnd   = parseMinutes(timeParts[1]);
          var cap      = Math.max(parseInt(s.capacity) || 1, 1);
          var slotMins = Math.floor((sesEnd - sesStart) / cap);
          var slotS    = sesStart + currentSessionCount * slotMins;
          slotTime     = fmt(slotS) + " - " + fmt(slotS + slotMins);
        }

        await ProjDB.updateProject(p.id, { scheduleDate: s.date, scheduleTime: slotTime }, activeCategory);
        
        assignedCount++;
        currentSessionCount++;
        if (currentSessionCount >= s.capacity) {
          sessionIndex++;
          currentSessionCount = 0;
        }
      }
      
      if(selectedCourse) {
        var data = await ProjDB.fetchProjects(selectedCourse.id, activeCategory);
        setProjects(data);
        setAllProjects(data);
      }
      setShowBulkScheduleModal(false);
      setLoading(false);
      alert(assignedCount + " proje başarıyla planlandı. " + (targets.length - assignedCount > 0 ? (targets.length - assignedCount) + " proje kapasite yetersizliğinden açıkta kaldı." : "Tüm onaylı/bekleyen projeler kapandı."));
    } catch(e) {
      setLoading(false);
      alert("Planlama sırasında hata oluştu: " + e.message);
    }
  };

  // ── Öğrenci ders kaydı kontrolü (yardımcı fonksiyon) ──
  var validateStudentCourseEnrollment = async function (courseId, courseInfo) {
    // Öğrenci değilse kontrol gerekli değil
    if (!currentUser || currentUser.role !== "student" || !currentUser.studentNumber) {
      return true;
    }
    
    // courseId zorunlu
    if (!courseId) {
      console.error("validateStudentCourseEnrollment: courseId is required");
      alert("Ders bilgisi eksik. Lütfen tekrar deneyin.");
      return false;
    }
    
    try {
      var students = await window.DB.fetchStudents();
      var studentRecord = students.find(function (s) { return s.studentNumber === currentUser.studentNumber; });
      
      if (!studentRecord) {
        alert("Öğrenci kaydınız bulunamadı. Lütfen önce 'Benim Sayfam' bölümünden derslerinizi seçin.");
        return false;
      }
      
      var myCourseIds = Array.isArray(studentRecord.myCourseIds) ? studentRecord.myCourseIds : [];
      
      if (myCourseIds.indexOf(courseId) === -1) {
        alert(
          "Bu işlemi gerçekleştiremezsiniz!\n\n" +
          "Sebep: İlk sisteme girdiğinizde bu dersi seçmediniz. " +
          "Bir proje grubuna katılabilmek veya oluşturabilmek için, dersin sizin seçtiğiniz dersler arasında olması gerekir.\n\n" +
          (courseInfo || "")
        );
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("Öğrenci ders kontrolü yapılırken hata:", err);
      alert("Ders kontrolü yapılırken bir hata oluştu. Lütfen tekrar deneyin.");
      return false;
    }
  };

  // ── Üye davet yanıtı ──
  var handleRespondInvite = async function (projectId, memberIdx, response) {
    try {
      var project = projects.find(function (p) { return p.id === projectId; }) || allProjects.find(function (p) { return p.id === projectId; });
      if (!project) return;
      
      // ── Kabul etmeden önce öğrencinin bu dersi seçip seçmediğini kontrol et ──
      if (response === "accepted") {
        var courseInfo = "Proje: " + (project.name || "İsimsiz Proje") + "\nDers: " + (project.courseName || "Bilinmeyen Ders");
        var isEnrolled = await validateStudentCourseEnrollment(project.courseId, courseInfo);
        if (!isEnrolled) return;
      }
      
      var newStatuses = (project.memberStatus || []).slice();
      newStatuses[memberIdx] = response;
      await ProjDB.updateProject(projectId, { memberStatus: newStatuses }, activeCategory);
      var updater = function (prev) { return prev.map(function (p) { return p.id === projectId ? Object.assign({}, p, { memberStatus: newStatuses }) : p; }); };
      setProjects(updater);
      setAllProjects(updater);
    } catch (e) {
      alert("Yanıt gönderilemedi: " + e.message);
    }
  };

  // ── Deadline kontrolü ──
  var isDeadlinePassed = useMemo(function () {
    if (!selectedCourse || !selectedCourse.deadline) return false;
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var dl = new Date(selectedCourse.deadline + "T23:59:59");
    return now > dl;
  }, [selectedCourse]);

  // ── Proje Oluştur ──
  var handleCreateProject = async function (data) {
    if (!selectedCourse) return;
    // Her öğrenci aynı derste yalnız 1 proje grubunda yer alabilir
    var newMembers = (data.members || []).map(function (m) { return m.trim().toLowerCase(); });
    for (var i = 0; i < projects.length; i++) {
      var existingMembers = (projects[i].members || []).map(function (m) { return m.trim().toLowerCase(); });
      for (var j = 0; j < newMembers.length; j++) {
        if (newMembers[j] && existingMembers.indexOf(newMembers[j]) >= 0) {
          alert('"' + data.members[j] + '" bu derste zaten "' + projects[i].name + '" projesinde yer alıyor. Aynı derste birden fazla proje grubunda yer alamazsınız!');
          return;
        }
      }
    }
    try {
      // Kontrol: Deadline geçmiş mi?
      if (selectedCourse.deadline) {
        var now = new Date();
        now.setHours(0, 0, 0, 0);
        var dl = new Date(selectedCourse.deadline + "T23:59:59");
        if (now > dl) {
          alert("Bu ders için proje grubu oluşturma süresi dolmuştur! (Son tarih: " + selectedCourse.deadline + ")");
          return;
        }
      }

      // Kontrol: Öğrenci ise bu dersi seçmiş mi?
      var courseInfo = "Ders: " + (selectedCourse.code || "") + " - " + (selectedCourse.name || "");
      var isEnrolled = await validateStudentCourseEnrollment(selectedCourse.id, courseInfo);
      if (!isEnrolled) return;

      // Kontrol: Oluşturan kişi aynı derste zaten bir projede mi?
      var freshCourseProjects = await ProjDB.fetchProjects(selectedCourse.id);
      var creatorNameLower = userName.trim().toLowerCase();
      var creatorExisting = null;
      for (var i = 0; i < freshCourseProjects.length; i++) {
        var p = freshCourseProjects[i];
        if (p.members && p.members.some(function (m) { return m.trim().toLowerCase() === creatorNameLower; })) {
          creatorExisting = p;
          break;
        }
      }
      if (creatorExisting) {
        alert("Bu derste zaten bir proje grubundasınız: \"" + creatorExisting.name + "\". Aynı derste birden fazla proje grubunda yer alamazsınız.");
        return;
      }

      // Kontrol: Eklenen diğer üyeler aynı derste zaten bir projede mi?
      for (var j = 0; j < data.members.length; j++) {
        var mName = data.members[j];
        if (mName.trim().toLowerCase() === creatorNameLower) continue;
        var memberExisting = null;
        var mNameLower = mName.trim().toLowerCase();
        for (var k = 0; k < freshCourseProjects.length; k++) {
          var pp = freshCourseProjects[k];
          if (pp.members && pp.members.some(function (m) { return m.trim().toLowerCase() === mNameLower; })) {
            memberExisting = pp;
            break;
          }
        }
        if (memberExisting) {
          alert("\"" + mName + "\" adlı kişi bu derste zaten \"" + memberExisting.name + "\" projesinde yer alıyor. Aynı derste birden fazla proje grubunda yer alamazsınız.");
          return;
        }
      }

      // memberStatus: ilk üye (oluşturan) otomatik "accepted", diğerleri "pending"
      var mStatuses = data.members.map(function (m, idx) { return idx === 0 ? "accepted" : "pending"; });

      var docData = Object.assign({}, data, {
        courseId: selectedCourse.id,
        courseName: selectedCourse.code + " - " + selectedCourse.name,
        createdBy: userId,
        createdByName: userName,
        status: "pending",
        memberStatus: mStatuses,
      });
      docData.departmentId = activeDepartment;
      var ref = await ProjDB.createProject(docData, activeCategory);
      var newProject = Object.assign({}, docData, { id: ref.id });
      setProjects(function (prev) { return [newProject].concat(prev); });
      setAllProjects(function (prev) { return [newProject].concat(prev); });
      setShowCreateModal(false);
    } catch (e) {
      alert("Proje oluşturulamadı: " + e.message);
    }
  };

  // ── Proje Sil ──
  var handleDeleteProject = async function (projectId) {
    if (!confirm("Bu projeyi silmek istediğinize emin misiniz?")) return;
    try {
      await ProjDB.deleteProject(projectId, activeCategory);
      setProjects(function (prev) { return prev.filter(function (p) { return p.id !== projectId; }); });
      setAllProjects(function (prev) { return prev.filter(function (p) { return p.id !== projectId; }); });
    } catch (e) {
      alert("Proje silinemedi: " + e.message);
    }
  };

  // ── Filtreleme ──
  var filteredProjects = useMemo(function () {
    if (!searchQuery.trim()) return projects;
    var q = searchQuery.toLowerCase();
    return projects.filter(function (p) {
      return (p.name && p.name.toLowerCase().indexOf(q) >= 0) ||
             (p.summary && p.summary.toLowerCase().indexOf(q) >= 0) ||
             (p.members && p.members.some(function (m) { return m.toLowerCase().indexOf(q) >= 0; }));
    });
  }, [projects, searchQuery]);

  var filteredCourses = useMemo(function () {
    if (!searchQuery.trim()) return courses;
    var q = searchQuery.toLowerCase();
    return courses.filter(function (c) {
      return (c.code && c.code.toLowerCase().indexOf(q) >= 0) ||
             (c.name && c.name.toLowerCase().indexOf(q) >= 0) ||
             (c.professor && c.professor.toLowerCase().indexOf(q) >= 0);
    });
  }, [courses, searchQuery]);

  // ══════════════════════════════════════════════════════════════
  // DERS LİSTESİ GÖRÜNÜMÜ
  // ══════════════════════════════════════════════════════════════
  if (!selectedCourse) {
    var activeCat = PROJECT_CATEGORIES.find(function (c) { return c.id === activeCategory; }) || PROJECT_CATEGORIES[0];
    return (
      <div style={{ background: PRJ.bg, minHeight: "100vh", padding: "0 0 40px" }}>
        <div style={{
          background: "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #60a5fa 100%)",
          padding: "32px 0 24px", marginBottom: 0,
        }}>
          <div style={{ maxWidth: 1000, margin: "0 auto", padding: window.innerWidth <= 480 ? "0 10px" : "0 24px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1 style={{ color: "white", fontSize: 28, fontWeight: 700, fontFamily: "'Playfair Display', serif", display: "flex", alignItems: "center", gap: 10 }}>
                  <PrjIcon path={PRJ_ICONS.folder} size={28} color="rgba(255,255,255,0.8)" /> Proje Grupları
                </h1>
                <p style={{ color: "rgba(255,255,255,0.7)", marginTop: 4, fontSize: 14 }}>
                  {departmentInfo ? departmentInfo.name + " - " : ""}Ders seçerek proje gruplarını görüntüleyin
                </p>
              </div>
              {canManage && (
                <button onClick={function () { setShowCourseModal(true); }}
                  style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(8px)" }}>
                  <PrjIcon path={PRJ_ICONS.plus} size={18} color="white" /> Yeni Alan Ekle
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Kategori Tabları */}
        <div style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
          padding: "0", marginBottom: 24,
        }}>
          <div style={{ maxWidth: 1000, margin: "0 auto", padding: window.innerWidth <= 480 ? "0 10px" : "0 24px", display: "flex", gap: 0, overflowX: "auto" }}>
            {PROJECT_CATEGORIES.map(function (cat) {
              var isActive = activeCategory === cat.id;
              return (
                <button key={cat.id} onClick={function () { setActiveCategory(cat.id); setSearchQuery(""); }}
                  style={{
                    padding: "14px 20px", border: "none", cursor: "pointer",
                    background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                    color: isActive ? "white" : "rgba(255,255,255,0.6)",
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    fontFamily: "'Source Sans 3', sans-serif",
                    display: "flex", alignItems: "center", gap: 8,
                    borderBottom: isActive ? "3px solid " + cat.color : "3px solid transparent",
                    transition: "all 0.2s", whiteSpace: "nowrap",
                  }}>
                  <PrjIcon path={cat.icon} size={16} color={isActive ? cat.color : "rgba(255,255,255,0.5)"} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ maxWidth: 1000, margin: "0 auto", padding: window.innerWidth <= 480 ? "0 10px" : "0 24px", boxSizing: "border-box" }}>
          {/* Arama */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 280px", display: "flex", alignItems: "center", gap: 8, background: "white", borderRadius: 10, padding: "8px 14px", border: "1px solid " + PRJ.border }}>
              <PrjIcon path={PRJ_ICONS.search} size={16} color={PRJ.textMuted} />
              <input type="text" value={searchQuery} onChange={function (e) { setSearchQuery(e.target.value); }}
                placeholder="Ders kodu veya adı ara..." style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontFamily: "'Source Sans 3', sans-serif", background: "transparent" }} />
            </div>
            <div style={{ background: "white", borderRadius: 10, padding: "10px 16px", border: "1px solid " + PRJ.border, fontSize: 13, color: PRJ.textMuted, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
              <PrjIcon path={PRJ_ICONS.book} size={14} color={PRJ.primary} /> {courses.length} ders
            </div>
          </div>

          {/* Ders Kartları */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: PRJ.textMuted }}>Yükleniyor...</div>
          ) : filteredCourses.length === 0 ? (
            <div style={{ background: "white", borderRadius: 16, padding: 60, textAlign: "center", border: "1px solid " + PRJ.border }}>
              <PrjIcon path={PRJ_ICONS.book} size={48} color="#d1d5db" />
              <h3 style={{ color: PRJ.textMuted, marginTop: 16 }}>
                {searchQuery ? "Arama sonucu bulunamadı" : "Henüz ders eklenmemiş"}
              </h3>
              {!searchQuery && isAdmin && (
                <p style={{ color: PRJ.textMuted, fontSize: 14, marginTop: 8 }}>
                  "Yeni Ders Ekle" butonuna tıklayarak ders ekleyin.
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {filteredCourses.map(function (course) {
                return (
                  <div key={course.id} onClick={function () { setSelectedCourse(course); setSearchQuery(""); }}
                    style={{
                      background: "white", borderRadius: 14, padding: "20px 24px", cursor: "pointer",
                      border: "1px solid " + PRJ.border, transition: "all 0.2s", position: "relative",
                    }}
                    onMouseEnter={function (e) { e.currentTarget.style.boxShadow = "0 8px 24px rgba(37,99,235,0.12)"; e.currentTarget.style.borderColor = PRJ.primary; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={function (e) { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = PRJ.border; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, " + PRJ.primary + ", " + PRJ.primaryLight + ")", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <PrjIcon path={PRJ_ICONS.book} size={22} color="white" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: PRJ.primary, fontFamily: "'JetBrains Mono', monospace" }}>{course.code}</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: PRJ.text }}>{course.name}</div>
                      </div>
                      {isAdmin && (
                        <button onClick={function (e) { e.stopPropagation(); handleDeleteCourse(course.id); }} title="Dersi sil"
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: PRJ.textMuted, padding: 4, borderRadius: 6 }}
                          onMouseEnter={function (e) { e.currentTarget.style.color = PRJ.red; }}
                          onMouseLeave={function (e) { e.currentTarget.style.color = PRJ.textMuted; }}
                        >
                          <PrjIcon path={PRJ_ICONS.trash} size={16} />
                        </button>
                      )}
                    </div>
                    {course.professor && (
                      <div style={{ fontSize: 13, color: PRJ.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
                        <PrjIcon path={PRJ_ICONS.user} size={13} /> {course.professor}
                      </div>
                    )}
                    {(course.minGroupSize || course.maxGroupSize) && (
                      <div style={{ fontSize: 12, color: PRJ.primary, display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <PrjIcon path={PRJ_ICONS.users} size={12} color={PRJ.primary} />
                        Grup: {course.minGroupSize || 2}-{course.maxGroupSize || 3} kişi
                      </div>
                    )}
                    {course.deadline && (function () {
                      var now = new Date(); now.setHours(0,0,0,0);
                      var dl = new Date(course.deadline + "T23:59:59");
                      var passed = now > dl;
                      return (
                        <div style={{ fontSize: 12, color: passed ? PRJ.red : PRJ.orange, display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                          <PrjIcon path={PRJ_ICONS.calendar} size={12} color={passed ? PRJ.red : PRJ.orange} />
                          {passed ? "Süre doldu" : "Son: " + course.deadline}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {showCourseModal && <AddCourseModal onClose={function () { setShowCourseModal(false); setEditingCourse(null); }} onAdd={handleAddCourse} editCourse={editingCourse} categoryLabel={activeCat.label} availableCourses={deptCourses} isProfessor={isProfessor} currentUserName={userName} />}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // DERS DETAY GÖRÜNÜMÜ (Proje listesi)
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ background: PRJ.bg, minHeight: "100vh", padding: "0 0 40px" }}>
      <div style={{
        background: "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #60a5fa 100%)",
        padding: "32px 0 24px", marginBottom: 24,
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: window.innerWidth <= 480 ? "0 10px" : "0 24px", boxSizing: "border-box" }}>
          <button onClick={function () { setSelectedCourse(null); setSearchQuery(""); }}
            style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <PrjIcon path={PRJ_ICONS.back} size={16} color="white" /> Derslere Dön
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>{selectedCourse.code}</div>
              <h1 style={{ color: "white", fontSize: 26, fontWeight: 700, fontFamily: "'Playfair Display', serif", display: "flex", alignItems: "center", gap: 10 }}>
                {selectedCourse.name}
              </h1>
              {selectedCourse.professor && (
                <p style={{ color: "rgba(255,255,255,0.7)", marginTop: 4, fontSize: 14 }}>{selectedCourse.professor}</p>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "white", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <PrjIcon path={PRJ_ICONS.users} size={12} color="rgba(255,255,255,0.7)" />
                  Grup: {selectedCourse.minGroupSize || 2}-{selectedCourse.maxGroupSize || 3} kişi
                </span>
                {selectedCourse.deadline && (
                  <span style={{
                    background: isDeadlinePassed ? "rgba(220,38,38,0.3)" : "rgba(255,255,255,0.15)",
                    color: "white", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <PrjIcon path={PRJ_ICONS.calendar} size={12} color={isDeadlinePassed ? "#fca5a5" : "rgba(255,255,255,0.7)"} />
                    Son tarih: {selectedCourse.deadline}{isDeadlinePassed ? " (Süre doldu)" : ""}
                  </span>
                )}
                {isAdmin && (
                  <button onClick={function () { setEditingCourse(selectedCourse); setShowCourseModal(true); }}
                    style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "none", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                    <PrjIcon path={PRJ_ICONS.edit} size={12} color="white" /> Düzenle
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {canManage && projects.length > 0 && (
                <>
                  {isDeadlinePassed && (
                    <button onClick={function () { setShowBulkScheduleModal(true); }}
                      style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)", color: "white", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 10px rgba(124, 58, 237, 0.3)" }}>
                      <PrjIcon path={PRJ_ICONS.calendar} size={16} color="white" /> Projeleri Planla
                    </button>
                  )}
                  <button onClick={function () { exportProjectsXLSX(projects, selectedCourse.code + "_" + selectedCourse.name); }}
                    style={{ background: "#059669", color: "white", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <PrjIcon path={PRJ_ICONS.download} size={16} color="white" /> XLSX
                  </button>
                  <button onClick={function () { exportProjectsWord(projects, selectedCourse.code + " - " + selectedCourse.name); }}
                    style={{ background: "#2563eb", color: "white", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <PrjIcon path={PRJ_ICONS.download} size={16} color="white" /> Word
                  </button>
                </>
              )}
              {isDeadlinePassed && !canManage ? (
                <div style={{ background: "rgba(220,38,38,0.2)", color: "white", border: "1px solid rgba(220,38,38,0.4)", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                  <PrjIcon path={PRJ_ICONS.calendar} size={16} color="#fca5a5" />
                  <span>Proje grubu oluşturma süresi doldu ({selectedCourse.deadline})</span>
                </div>
              ) : !canManage && userExistingProject ? (
                <div style={{ background: "rgba(234,88,12,0.2)", color: "white", border: "1px solid rgba(234,88,12,0.4)", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                  <PrjIcon path={PRJ_ICONS.info} size={16} color="#fbbf24" />
                  <span>Bu derste zaten bir proje grubundasınız: <strong>{userExistingProject.name}</strong></span>
                </div>
              ) : (
                <button onClick={function () { setShowCreateModal(true); }}
                  style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(8px)" }}>
                  <PrjIcon path={PRJ_ICONS.plus} size={18} color="white" /> Yeni Proje Grubu
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: window.innerWidth <= 480 ? "0 10px" : "0 24px", boxSizing: "border-box" }}>
        {/* Arama & İstatistik */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{
            flex: "1 1 280px", display: "flex", alignItems: "center", gap: 10,
            background: "white", borderRadius: 14, padding: "10px 16px",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            transition: "all 0.2s",
          }}>
            <PrjIcon path={PRJ_ICONS.search} size={16} color="#9ca3af" />
            <input type="text" value={searchQuery} onChange={function (e) { setSearchQuery(e.target.value); }}
              placeholder="Proje veya kisi ara..." style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontFamily: "'Source Sans 3', sans-serif", background: "transparent", color: PRJ.text }} />
          </div>
          <div style={{
            background: "white", borderRadius: 12, padding: "10px 16px",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            fontSize: 13, color: PRJ.text, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <span style={{ width: 24, height: 24, borderRadius: 8, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PrjIcon path={PRJ_ICONS.folder} size={13} color="#6366f1" />
            </span>
            {projects.length} proje
          </div>
          <div style={{
            background: "white", borderRadius: 12, padding: "10px 16px",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            fontSize: 13, color: PRJ.text, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <span style={{ width: 24, height: 24, borderRadius: 8, background: "rgba(5,150,105,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PrjIcon path={PRJ_ICONS.users} size={13} color="#059669" />
            </span>
            {projects.reduce(function (s, p) { return s + (p.members ? p.members.length : 0); }, 0)} katilimci
          </div>
          {isAdmin && (function () {
            var pendingCount = projects.filter(function (p) { return p.status === "pending"; }).length;
            if (pendingCount === 0) return null;
            return (
              <div style={{
                background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
                borderRadius: 12, padding: "10px 16px",
                border: "1px solid rgba(245,158,11,0.2)",
                fontSize: 13, color: "#92400e", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 7,
              }}>
                <span style={{ width: 24, height: 24, borderRadius: 8, background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PrjIcon path={PRJ_ICONS.clock} size={13} color="#f59e0b" />
                </span>
                {pendingCount} onay bekliyor
              </div>
            );
          })()}
        </div>

        {/* Admin: Birden fazla projede yer alan üyeler uyarısı */}
        {isAdmin && (function () {
          var memberMap = {};
          allProjects.forEach(function (p) {
            (p.members || []).forEach(function (m) {
              var key = m.trim().toLowerCase();
              if (!memberMap[key]) memberMap[key] = [];
              memberMap[key].push(p.name + " (" + (p.courseName || "—") + ")");
            });
          });
          var duplicates = [];
          Object.keys(memberMap).forEach(function (key) {
            if (memberMap[key].length > 1) duplicates.push({ name: key, projects: memberMap[key] });
          });
          if (duplicates.length === 0) return null;
          return (
            <div style={{ background: PRJ.redLight, border: "1px solid " + PRJ.red + "30", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <PrjIcon path={PRJ_ICONS.info} size={18} color={PRJ.red} />
                <strong style={{ fontSize: 14, color: PRJ.red }}>Birden fazla projede yer alan öğrenciler ({duplicates.length} kişi)</strong>
              </div>
              {duplicates.map(function (d, i) {
                return (
                  <div key={i} style={{ fontSize: 13, color: "#991b1b", marginBottom: 4, paddingLeft: 26 }}>
                    <strong>{d.name}</strong>: {d.projects.join(" • ")}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Proje Listesi */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: PRJ.textMuted }}>Yükleniyor...</div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ background: "white", borderRadius: 20, padding: "60px 32px", textAlign: "center", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(99,102,241,0.08)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <PrjIcon path={PRJ_ICONS.folder} size={32} color="#a5b4fc" />
            </div>
            <h3 style={{ color: PRJ.text, marginTop: 8, fontSize: 16, fontWeight: 600 }}>
              {searchQuery ? "Arama sonucu bulunamadi" : "Henuz proje grubu olusturulmamis"}
            </h3>
            {!searchQuery && (
              <p style={{ color: PRJ.textMuted, fontSize: 14, marginTop: 8, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
                Ilk proje grubunu olusturmak icin "Yeni Proje Grubu" butonuna tiklayin.
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: window.innerWidth <= 560 ? "1fr" : window.innerWidth <= 900 ? "repeat(2, 1fr)" : "repeat(2, 1fr)", gap: 16, alignItems: "start" }}>
            {filteredProjects.map(function (project) {
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  userId={userId}
                  userName={userName}
                  isAdmin={canManage}
                  onDelete={handleDeleteProject}
                  onApprove={handleApproveProject}
                  onReject={handleRejectProject}
                  onRespondInvite={handleRespondInvite}
                />
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={function () { setShowCreateModal(false); }}
          onCreate={handleCreateProject}
          currentUserName={userName}
          minGroupSize={selectedCourse ? selectedCourse.minGroupSize : undefined}
          maxGroupSize={selectedCourse ? selectedCourse.maxGroupSize : undefined}
        />
      )}

      {showBulkScheduleModal && (
        <BulkScheduleModal 
          onClose={function() { setShowBulkScheduleModal(false); }}
          onDistribute={handleDistributeSchedule}
          projectCount={projects.filter(function(p){ return !p.status || p.status === "approved" || p.status === "pending"; }).length}
        />
      )}
    </div>
  );
}

// Export
window.ProjeModuluApp = ProjeModuluApp;
