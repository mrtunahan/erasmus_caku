// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Proje Modülü
// Ders bazlı proje grupları oluşturma, listeleme, XLSX/Word export
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

// ── Renkler ──
const PRJ = {
  primary: "#2563eb",
  primaryLight: "#60a5fa",
  primaryPale: "#dbeafe",
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
};

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
  db: function () { return window.firebase && window.firebase.firestore(); },

  // Ders listesi
  async fetchCourses() {
    var db = this.db(); if (!db) return [];
    var snap = await db.collection("project_courses").orderBy("name").get();
    return snap.docs.map(function (d) { return Object.assign({}, d.data(), { id: d.id }); });
  },
  async addCourse(data) {
    var db = this.db(); if (!db) return;
    return db.collection("project_courses").add(Object.assign({}, data, {
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    }));
  },
  async deleteCourse(id) {
    var db = this.db(); if (!db) return;
    await db.collection("project_courses").doc(id).delete();
  },

  // Projeler
  async fetchProjects(courseId) {
    var db = this.db(); if (!db) return [];
    var query = db.collection("projects").orderBy("createdAt", "desc");
    if (courseId) query = query.where("courseId", "==", courseId);
    var snap = await query.get();
    return snap.docs.map(function (d) { return Object.assign({}, d.data(), { id: d.id }); });
  },
  async createProject(data) {
    var db = this.db(); if (!db) return;
    return db.collection("projects").add(Object.assign({}, data, {
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    }));
  },
  async deleteProject(id) {
    var db = this.db(); if (!db) return;
    await db.collection("projects").doc(id).delete();
  },
};

// ══════════════════════════════════════════════════════════════
// XLSX EXPORT
// ══════════════════════════════════════════════════════════════
function exportProjectsXLSX(projects, courseName) {
  // Basit XML-based XLSX (Office Open XML SpreadsheetML)
  var rows = [["#", "Proje Adı", "Proje Özeti", "Üye 1", "Üye 2", "Üye 3", "Oluşturan", "Tarih"]];
  projects.forEach(function (p, i) {
    var members = p.members || [];
    rows.push([
      i + 1, p.name || "", p.summary || "",
      members[0] || "", members[1] || "", members[2] || "",
      p.createdByName || "", prjFormatDate(p.createdAt),
    ]);
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
  var tableRows = "";
  projects.forEach(function (p, i) {
    var members = (p.members || []).join(", ");
    tableRows += "<tr><td>" + (i + 1) + "</td><td>" + (p.name || "") + "</td><td>" + (p.summary || "") +
      "</td><td>" + members + "</td><td>" + (p.createdByName || "") + "</td><td>" + prjFormatDate(p.createdAt) + "</td></tr>";
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
    '<table><thead><tr><th>#</th><th>Proje Adı</th><th>Proje Özeti</th><th>Üyeler</th><th>Oluşturan</th><th>Tarih</th></tr></thead><tbody>' +
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
function ProjectCard({ project, userId, userName, isAdmin, onDelete }) {
  var isOwner = project.createdBy === userId;
  var memberCount = project.members ? project.members.length : 0;
  var memberColors = ["#2563eb", "#059669", "#ea580c", "#7c3aed"];

  return (
    <div style={{
      background: "white", borderRadius: 16, overflow: "hidden",
      border: "1px solid " + PRJ.border,
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      transition: "all 0.2s",
      display: "flex", flexDirection: "column",
    }}
      onMouseEnter={function (e) { e.currentTarget.style.boxShadow = "0 8px 24px rgba(37,99,235,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={function (e) { e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ height: 4, background: "linear-gradient(90deg, " + PRJ.primary + ", " + PRJ.primaryLight + ")" }} />
      <div style={{ padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: PRJ.text, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <PrjIcon path={PRJ_ICONS.folder} size={18} color={PRJ.primary} />
              {project.name}
            </h3>
            <div style={{ fontSize: 12, color: PRJ.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
              <PrjIcon path={PRJ_ICONS.clock} size={12} />
              {prjFormatDate(project.createdAt)}
              <span style={{ margin: "0 4px" }}>·</span>
              Oluşturan: {project.createdByName}
            </div>
          </div>
          {(isAdmin || isOwner) && (
            <button onClick={function () { onDelete(project.id); }} title="Projeyi sil"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: PRJ.textMuted, padding: 4, borderRadius: 6, transition: "all 0.2s" }}
              onMouseEnter={function (e) { e.currentTarget.style.color = PRJ.red; e.currentTarget.style.background = PRJ.redLight; }}
              onMouseLeave={function (e) { e.currentTarget.style.color = PRJ.textMuted; e.currentTarget.style.background = "transparent"; }}
            >
              <PrjIcon path={PRJ_ICONS.trash} size={16} />
            </button>
          )}
        </div>

        {project.summary && (
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px", marginBottom: 16, border: "1px solid " + PRJ.border }}>
            <p style={{ fontSize: 14, color: PRJ.text, lineHeight: 1.6, margin: 0 }}>{project.summary}</p>
          </div>
        )}

        <div style={{ marginTop: "auto" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: PRJ.textMuted, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <PrjIcon path={PRJ_ICONS.users} size={14} />
            Grup Üyeleri ({memberCount} kişi)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(project.members || []).map(function (member, idx) {
              return (
                <div key={idx} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 8,
                  background: memberColors[idx % memberColors.length] + "08",
                  border: "1px solid " + memberColors[idx % memberColors.length] + "20",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "linear-gradient(135deg, " + memberColors[idx % memberColors.length] + ", " + memberColors[idx % memberColors.length] + "cc)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}>
                    {member.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: PRJ.text }}>{member}</span>
                  {idx === 0 && (
                    <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, background: PRJ.primaryPale, color: PRJ.primary, padding: "2px 8px", borderRadius: 4 }}>
                      Grup Lideri
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PROJE OLUŞTURMA MODALI
// ══════════════════════════════════════════════════════════════
function CreateProjectModal({ onClose, onCreate, currentUserName }) {
  var _s = useState, _e = React.useEffect;
  var ns = _s(""), name = ns[0], setName = ns[1];
  var ss = _s(""), summary = ss[0], setSummary = ss[1];
  var ms = _s([currentUserName, ""]), members = ms[0], setMembers = ms[1];

  var addMember = function () { if (members.length >= 3) return; setMembers(function (p) { return p.concat([""]); }); };
  var removeMember = function (idx) { if (members.length <= 2 || idx === 0) return; setMembers(function (p) { return p.filter(function (_, i) { return i !== idx; }); }); };
  var updateMember = function (idx, v) { setMembers(function (p) { return p.map(function (m, i) { return i === idx ? v : m; }); }); };

  var handleSubmit = function () {
    if (!name.trim()) { alert("Proje adı zorunludur!"); return; }
    if (!summary.trim()) { alert("Proje özeti zorunludur!"); return; }
    var valid = members.filter(function (m) { return m.trim(); });
    if (valid.length < 2) { alert("En az 2 kişi olmalıdır!"); return; }
    if (valid.length > 3) { alert("En fazla 3 kişi olabilir!"); return; }
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
          <p style={{ fontSize: 13, color: PRJ.primary, margin: 0, lineHeight: 1.5 }}>Proje grupları 2 veya 3 kişiden oluşabilir. İlk üye olarak siz otomatik eklenirsiniz.</p>
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
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>Grup Üyeleri * (2-3 kişi)</label>
          {members.map(function (member, idx) {
            return (
              <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: idx === 0 ? PRJ.primary : PRJ.border, display: "flex", alignItems: "center", justifyContent: "center", color: idx === 0 ? "white" : PRJ.textMuted, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</div>
                <input type="text" value={member} onChange={function (e) { updateMember(idx, e.target.value); }} placeholder={idx === 0 ? "Sizin adınız" : (idx + 1) + ". üye adı"} disabled={idx === 0}
                  style={{ flex: 1, padding: "8px 12px", border: "1px solid " + PRJ.border, borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "'Source Sans 3', sans-serif", background: idx === 0 ? "#f9fafb" : "white", color: idx === 0 ? PRJ.textMuted : PRJ.text }} />
                {idx === 0 && <span style={{ fontSize: 10, color: PRJ.primary, fontWeight: 600, whiteSpace: "nowrap" }}>(Siz)</span>}
                {idx > 0 && members.length > 2 && (
                  <button onClick={function () { removeMember(idx); }} style={{ background: PRJ.redLight, color: PRJ.red, border: "none", borderRadius: 6, padding: "0 10px", cursor: "pointer", height: 34, display: "flex", alignItems: "center" }}>
                    <PrjIcon path={PRJ_ICONS.x} size={14} />
                  </button>
                )}
              </div>
            );
          })}
          {members.length < 3 && (
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
// DERS EKLEME MODALI (Admin)
// ══════════════════════════════════════════════════════════════
function AddCourseModal({ onClose, onAdd }) {
  var cs = useState(""), code = cs[0], setCode = cs[1];
  var ns = useState(""), name = ns[0], setName = ns[1];
  var ps = useState(""), prof = ps[0], setProf = ps[1];

  var handleSubmit = function () {
    if (!code.trim() || !name.trim()) { alert("Ders kodu ve adı zorunludur!"); return; }
    onAdd({ code: code.trim(), name: name.trim(), professor: prof.trim() });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 16, padding: window.innerWidth <= 480 ? 16 : 28, width: "min(440px, calc(100vw - 32px))", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }} onClick={function (e) { e.stopPropagation(); }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: PRJ.text, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <PrjIcon path={PRJ_ICONS.book} size={20} color={PRJ.primary} /> Yeni Ders Ekle
        </h3>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>Ders Kodu *</label>
          <input type="text" value={code} onChange={function (e) { setCode(e.target.value); }} placeholder="BIL401"
            style={{ width: "100%", padding: "10px 14px", border: "1px solid " + PRJ.border, borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "'Source Sans 3', sans-serif" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>Ders Adı *</label>
          <input type="text" value={name} onChange={function (e) { setName(e.target.value); }} placeholder="Bilgisayar Projesi I"
            style={{ width: "100%", padding: "10px 14px", border: "1px solid " + PRJ.border, borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "'Source Sans 3', sans-serif" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>Dersin Hocası</label>
          <input type="text" value={prof} onChange={function (e) { setProf(e.target.value); }} placeholder="Dr. Öğr. Üyesi ..."
            style={{ width: "100%", padding: "10px 14px", border: "1px solid " + PRJ.border, borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "'Source Sans 3', sans-serif" }} />
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid " + PRJ.border, background: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, color: PRJ.textMuted }}>İptal</button>
          <button onClick={handleSubmit} style={{ padding: "10px 24px", border: "none", background: "linear-gradient(135deg, #1e40af, #2563eb)", color: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Ders Ekle</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ANA MODÜL
// ══════════════════════════════════════════════════════════════
function ProjeModuluApp({ currentUser }) {
  var _s = useState;
  var cs = _s([]), courses = cs[0], setCourses = cs[1];
  var ps = _s([]), projects = ps[0], setProjects = ps[1];
  var ls = _s(true), loading = ls[0], setLoading = ls[1];
  var vs = _s(null), selectedCourse = vs[0], setSelectedCourse = vs[1]; // null = ders listesi, object = ders detayı
  var sms = _s(false), showCreateModal = sms[0], setShowCreateModal = sms[1];
  var scm = _s(false), showCourseModal = scm[0], setShowCourseModal = scm[1];
  var sq = _s(""), searchQuery = sq[0], setSearchQuery = sq[1];

  var userId = currentUser && (currentUser.studentNumber || currentUser.name) || "anonymous";
  var userName = currentUser && currentUser.name || "Anonim";
  var isAdmin = currentUser && currentUser.role === "admin";

  // ── Dersleri Yükle ──
  useEffect(function () {
    setLoading(true);
    ProjDB.fetchCourses().then(function (data) {
      setCourses(data);
      setLoading(false);
    }).catch(function () { setLoading(false); });
  }, []);

  // ── Seçili ders değiştiğinde projeleri yükle ──
  useEffect(function () {
    if (!selectedCourse) { setProjects([]); return; }
    setLoading(true);
    ProjDB.fetchProjects(selectedCourse.id).then(function (data) {
      setProjects(data);
      setLoading(false);
    }).catch(function () { setLoading(false); });
  }, [selectedCourse]);

  // ── Ders Ekle ──
  var handleAddCourse = async function (data) {
    try {
      var ref = await ProjDB.addCourse(data);
      setCourses(function (prev) { return prev.concat([Object.assign({}, data, { id: ref.id })]); });
      setShowCourseModal(false);
    } catch (e) {
      alert("Ders eklenemedi: " + e.message);
    }
  };

  // ── Ders Sil ──
  var handleDeleteCourse = async function (courseId) {
    if (!confirm("Bu dersi ve tüm proje gruplarını silmek istediğinize emin misiniz?")) return;
    try {
      await ProjDB.deleteCourse(courseId);
      // O derse ait projeleri de sil
      var courseProjects = await ProjDB.fetchProjects(courseId);
      for (var i = 0; i < courseProjects.length; i++) {
        await ProjDB.deleteProject(courseProjects[i].id);
      }
      setCourses(function (prev) { return prev.filter(function (c) { return c.id !== courseId; }); });
      if (selectedCourse && selectedCourse.id === courseId) setSelectedCourse(null);
    } catch (e) {
      alert("Ders silinemedi: " + e.message);
    }
  };

  // ── Proje Oluştur ──
  var handleCreateProject = async function (data) {
    if (!selectedCourse) return;
    try {
      var docData = Object.assign({}, data, {
        courseId: selectedCourse.id,
        courseName: selectedCourse.code + " - " + selectedCourse.name,
        createdBy: userId,
        createdByName: userName,
      });
      var ref = await ProjDB.createProject(docData);
      setProjects(function (prev) { return [Object.assign({}, docData, { id: ref.id })].concat(prev); });
      setShowCreateModal(false);
    } catch (e) {
      alert("Proje oluşturulamadı: " + e.message);
    }
  };

  // ── Proje Sil ──
  var handleDeleteProject = async function (projectId) {
    if (!confirm("Bu projeyi silmek istediğinize emin misiniz?")) return;
    try {
      await ProjDB.deleteProject(projectId);
      setProjects(function (prev) { return prev.filter(function (p) { return p.id !== projectId; }); });
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
    return (
      <div style={{ background: PRJ.bg, minHeight: "100vh", padding: "0 0 40px" }}>
        <div style={{
          background: "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #60a5fa 100%)",
          padding: "32px 0 24px", marginBottom: 24,
        }}>
          <div style={{ maxWidth: 1000, margin: "0 auto", padding: window.innerWidth <= 480 ? "0 10px" : "0 24px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1 style={{ color: "white", fontSize: 28, fontWeight: 700, fontFamily: "'Playfair Display', serif", display: "flex", alignItems: "center", gap: 10 }}>
                  <PrjIcon path={PRJ_ICONS.folder} size={28} color="rgba(255,255,255,0.8)" /> Proje Grupları
                </h1>
                <p style={{ color: "rgba(255,255,255,0.7)", marginTop: 4, fontSize: 14 }}>Ders seçerek proje gruplarını görüntüleyin</p>
              </div>
              {isAdmin && (
                <button onClick={function () { setShowCourseModal(true); }}
                  style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(8px)" }}>
                  <PrjIcon path={PRJ_ICONS.plus} size={18} color="white" /> Yeni Ders Ekle
                </button>
              )}
            </div>
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {showCourseModal && <AddCourseModal onClose={function () { setShowCourseModal(false); }} onAdd={handleAddCourse} />}
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
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {isAdmin && projects.length > 0 && (
                <>
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
              <button onClick={function () { setShowCreateModal(true); }}
                style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(8px)" }}>
                <PrjIcon path={PRJ_ICONS.plus} size={18} color="white" /> Yeni Proje Grubu
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: window.innerWidth <= 480 ? "0 10px" : "0 24px", boxSizing: "border-box" }}>
        {/* Arama & İstatistik */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 280px", display: "flex", alignItems: "center", gap: 8, background: "white", borderRadius: 10, padding: "8px 14px", border: "1px solid " + PRJ.border }}>
            <PrjIcon path={PRJ_ICONS.search} size={16} color={PRJ.textMuted} />
            <input type="text" value={searchQuery} onChange={function (e) { setSearchQuery(e.target.value); }}
              placeholder="Proje veya kişi ara..." style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontFamily: "'Source Sans 3', sans-serif", background: "transparent" }} />
          </div>
          <div style={{ background: "white", borderRadius: 10, padding: "10px 16px", border: "1px solid " + PRJ.border, fontSize: 13, color: PRJ.textMuted, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            <PrjIcon path={PRJ_ICONS.folder} size={14} color={PRJ.primary} /> {projects.length} proje
          </div>
          <div style={{ background: "white", borderRadius: 10, padding: "10px 16px", border: "1px solid " + PRJ.border, fontSize: 13, color: PRJ.textMuted, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            <PrjIcon path={PRJ_ICONS.users} size={14} color={PRJ.green} /> {projects.reduce(function (s, p) { return s + (p.members ? p.members.length : 0); }, 0)} katılımcı
          </div>
        </div>

        {/* Proje Listesi */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: PRJ.textMuted }}>Yükleniyor...</div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ background: "white", borderRadius: 16, padding: 60, textAlign: "center", border: "1px solid " + PRJ.border }}>
            <PrjIcon path={PRJ_ICONS.folder} size={48} color="#d1d5db" />
            <h3 style={{ color: PRJ.textMuted, marginTop: 16 }}>
              {searchQuery ? "Arama sonucu bulunamadı" : "Bu ders için henüz proje grubu oluşturulmamış"}
            </h3>
            {!searchQuery && (
              <p style={{ color: PRJ.textMuted, fontSize: 14, marginTop: 8 }}>
                İlk proje grubunu oluşturmak için "Yeni Proje Grubu" butonuna tıklayın.
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
            {filteredProjects.map(function (project) {
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  userId={userId}
                  userName={userName}
                  isAdmin={isAdmin}
                  onDelete={handleDeleteProject}
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
        />
      )}
    </div>
  );
}

// Export
window.ProjeModuluApp = ProjeModuluApp;
