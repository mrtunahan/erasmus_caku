// ══════════════════════════════════════════════════════════════
// ÇAKÜ Mühendislik Fakültesi - Ders Programı Otomasyonu
// Sınav otomasyonundaki ders/hoca/derslik verilerini kullanır
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const DP = {
  primary: "#7C3AED",
  primaryLight: "#A78BFA",
  primaryPale: "#EDE9FE",
  text: "#1F2937",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  green: "#059669",
  navy: "#1B2A4A",
};

const DPIcon = ({ path, size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
const HOURS = [
  "08:00-08:50", "09:00-09:50", "10:00-10:50", "11:00-11:50",
  "12:00-12:50", "13:00-13:50", "14:00-14:50", "15:00-15:50",
  "16:00-16:50", "17:00-17:50",
];

const SLOT_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
  "#84CC16", "#F43F5E",
];

const GRADE_COLORS = {
  1: { bg: "#B2EBF2", text: "#006064" },
  2: { bg: "#C8E6C9", text: "#1B5E20" },
  3: { bg: "#FFE0B2", text: "#E65100" },
  4: { bg: "#F8BBD0", text: "#880E4F" },
  5: { bg: "#E1BEE7", text: "#4A148C" },
};

// ── Çakışma Tespit Fonksiyonu ──
function detectConflicts(scheduleData, allSchedules, activeDepartment, semester) {
  const conflicts = [];
  // 1) Aynı bölüm içinde derslik çakışması: aynı saat + aynı derslik, farklı ders
  const slotEntries = Object.entries(scheduleData);
  for (let i = 0; i < slotEntries.length; i++) {
    for (let j = i + 1; j < slotEntries.length; j++) {
      const [keyA, a] = slotEntries[i];
      const [keyB, b] = slotEntries[j];
      const [dayA, hiA] = keyA.split("_");
      const [dayB, hiB] = keyB.split("_");
      if (dayA === dayB && hiA === hiB && a.classroom && b.classroom && a.classroom === b.classroom && a.courseCode !== b.courseCode) {
        conflicts.push({
          type: "classroom",
          day: dayA,
          hour: HOURS[parseInt(hiA)],
          classroom: a.classroom,
          courses: [a.courseCode + " - " + a.courseName, b.courseCode + " - " + b.courseName],
          message: `Derslik çakışması: ${a.classroom} — ${dayA} ${HOURS[parseInt(hiA)]} — ${a.courseCode} & ${b.courseCode}`,
        });
      }
    }
  }
  // 2) Fakülte genelinde çapraz bölüm derslik çakışması
  if (allSchedules && allSchedules.length > 0) {
    // Build map: day_hour_classroom -> [{dept, courseCode, courseName}]
    const globalMap = {};
    allSchedules.forEach(({ deptId, deptName, slots }) => {
      Object.entries(slots).forEach(([key, slot]) => {
        if (!slot.classroom) return;
        const gKey = `${key}_${slot.classroom}`;
        if (!globalMap[gKey]) globalMap[gKey] = [];
        globalMap[gKey].push({ deptId, deptName, courseCode: slot.courseCode, courseName: slot.courseName });
      });
    });
    Object.entries(globalMap).forEach(([gKey, entries]) => {
      if (entries.length <= 1) return;
      // Check if multiple departments use same classroom at same time
      const deptSet = new Set(entries.map(e => e.deptId));
      if (deptSet.size > 1) {
        const parts = gKey.split("_");
        const classroom = parts.slice(2).join("_");
        const day = parts[0];
        const hi = parseInt(parts[1]);
        conflicts.push({
          type: "cross_dept",
          day,
          hour: HOURS[hi],
          classroom,
          courses: entries.map(e => `${e.deptName}: ${e.courseCode}`),
          message: `Fakülte çakışması: ${classroom} — ${day} ${HOURS[hi]} — ${entries.map(e => e.deptName + ":" + e.courseCode).join(" & ")}`,
        });
      }
    });
  }
  return conflicts;
}

// ── Fakülte Birleşik Program Çıktısı ──
function exportFacultySchedule(allSchedules, semester, year) {
  const semesterLabel = semester === "guz" ? "GÜZ" : "BAHAR";
  const yearLabel = year ? `${year}. Sınıf` : "Tüm Sınıflar";

  // Build combined grid: day -> hour -> [{dept, courseCode, courseName, instructor, classroom, sinif}]
  const grid = {};
  DAYS.forEach(day => {
    grid[day] = {};
    HOURS.forEach((_, hi) => { grid[day][hi] = []; });
  });

  allSchedules.forEach(({ deptName, slots }) => {
    Object.entries(slots).forEach(([key, slot]) => {
      const [day, hiStr] = key.split("_");
      const hi = parseInt(hiStr);
      if (grid[day] && grid[day][hi] !== undefined) {
        grid[day][hi].push({ deptName, ...slot });
      }
    });
  });

  let tableRows = "";
  HOURS.forEach((hour, hi) => {
    let hasAny = false;
    DAYS.forEach(day => { if (grid[day][hi].length > 0) hasAny = true; });
    if (!hasAny) return;

    let row = `<tr><td style="padding:6px 8px;border:1px solid #999;font-weight:600;text-align:center;background:#F9FAFB;white-space:nowrap">${hour}</td>`;
    DAYS.forEach(day => {
      const entries = grid[day][hi];
      if (entries.length === 0) {
        row += `<td style="padding:4px;border:1px solid #ddd"></td>`;
      } else {
        const cells = entries.map(e => {
          const bg = GRADE_COLORS[e.sinif]?.bg || "#F3F4F6";
          return `<div style="padding:3px 6px;margin:2px 0;border-radius:4px;background:${bg};font-size:10px;line-height:1.3">
            <strong>${e.courseCode}</strong><br/>
            <span style="color:#555">${e.deptName}</span><br/>
            ${e.classroom ? `<span style="color:#7C3AED">${e.classroom}</span>` : ""}
          </div>`;
        }).join("");
        row += `<td style="padding:2px;border:1px solid #ddd;vertical-align:top">${cells}</td>`;
      }
    });
    row += "</tr>";
    tableRows += row;
  });

  const deptList = allSchedules.map(s => s.deptName).join(", ");

  const html = `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><title>Fakülte Ders Programı</title>
<style>
  @media print { body { margin: 0; } @page { size: A4 landscape; margin: 0.8cm; } }
  body { font-family: 'Times New Roman', serif; background: #e8e8e8; }
  .page { max-width: 1100px; margin: 20px auto; background: white; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  h1 { text-align: center; font-size: 16px; color: #1B2A4A; margin-bottom: 6px; }
  h2 { text-align: center; font-size: 12px; color: #C00; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { padding: 8px 6px; border: 1px solid #999; background: #1B2A4A; color: white; font-weight: 700; text-align: center; font-size: 11px; }
  .legend { display: flex; gap: 12px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
  .legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; }
  .legend-box { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #ccc; }
</style>
</head>
<body>
<div class="page">
  <h1>ÇAKÜ MÜHENDİSLİK FAKÜLTESİ - DERS PROGRAMI</h1>
  <h2>${semesterLabel} DÖNEMİ ${yearLabel.toUpperCase()} — ${deptList}</h2>
  <table>
    <thead>
      <tr>
        <th style="width:80px">Saat</th>
        ${DAYS.map(d => `<th>${d}</th>`).join("")}
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="legend">
    <div class="legend-item"><div class="legend-box" style="background:#B2EBF2"></div>1. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#C8E6C9"></div>2. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#FFE0B2"></div>3. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#F8BBD0"></div>4. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#E1BEE7"></div>Seçmeli</div>
  </div>
</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}

// ── Bölüm Bazlı Ders Programı Çıktısı ──
function exportDeptSchedule(scheduleData, deptName, semester, year) {
  const semesterLabel = semester === "guz" ? "GÜZ" : "BAHAR";
  const yearLabel = `${year}. Sınıf`;

  let tableRows = "";
  HOURS.forEach((hour, hi) => {
    let hasAny = false;
    DAYS.forEach(day => { if (scheduleData[`${day}_${hi}`]) hasAny = true; });
    if (!hasAny) return;

    let row = `<tr><td style="padding:8px 10px;border:1px solid #999;font-weight:600;text-align:center;background:#F9FAFB;white-space:nowrap">${hour}</td>`;
    DAYS.forEach(day => {
      const slot = scheduleData[`${day}_${hi}`];
      if (!slot) {
        row += `<td style="padding:4px;border:1px solid #ddd"></td>`;
      } else {
        const bg = GRADE_COLORS[slot.sinif]?.bg || "#F3F4F6";
        row += `<td style="padding:6px 8px;border:1px solid #ddd;background:${bg};vertical-align:top">
          <div style="font-weight:700;font-size:12px">${slot.courseCode}</div>
          <div style="font-size:11px;color:#444">${slot.courseName}</div>
          ${slot.instructor ? `<div style="font-size:10px;color:#666;margin-top:2px">${slot.instructor}</div>` : ""}
          ${slot.classroom ? `<div style="font-size:10px;color:#7C3AED;font-weight:600;margin-top:1px">${slot.classroom}</div>` : ""}
        </td>`;
      }
    });
    row += "</tr>";
    tableRows += row;
  });

  const slotCount = Object.keys(scheduleData).length;
  const uniqueCourses = new Set(Object.values(scheduleData).map(s => s.courseCode)).size;

  const html = `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><title>Ders Programı - ${deptName}</title>
<style>
  @media print { body { margin: 0; } @page { size: A4 landscape; margin: 1cm; } }
  body { font-family: 'Times New Roman', serif; background: #e8e8e8; }
  .page { max-width: 1050px; margin: 20px auto; background: white; padding: 35px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  h1 { text-align: center; font-size: 17px; color: #1B2A4A; margin-bottom: 4px; border-bottom: 3px solid #1B2A4A; padding-bottom: 8px; }
  h2 { text-align: center; font-size: 13px; color: #C00; margin-bottom: 14px; letter-spacing: 0.5px; }
  .info { text-align: center; font-size: 11px; color: #666; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { padding: 10px 8px; border: 1px solid #999; background: #1B2A4A; color: white; font-weight: 700; text-align: center; font-size: 12px; }
  .legend { display: flex; gap: 12px; justify-content: center; margin-top: 14px; flex-wrap: wrap; }
  .legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; }
  .legend-box { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #ccc; }
  .footer { text-align: center; font-size: 9px; color: #999; margin-top: 16px; }
</style>
</head>
<body>
<div class="page">
  <h1>ÇAKÜ MÜHENDİSLİK FAKÜLTESİ - HAFTALIK DERS PROGRAMI</h1>
  <h2>${(deptName || "").toUpperCase()} — ${semesterLabel} DÖNEMİ ${yearLabel.toUpperCase()}</h2>
  <div class="info">${uniqueCourses} ders, ${slotCount} ders saati</div>
  <table>
    <thead>
      <tr>
        <th style="width:90px">Saat</th>
        ${DAYS.map(d => `<th>${d}</th>`).join("")}
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="legend">
    <div class="legend-item"><div class="legend-box" style="background:#B2EBF2"></div>1. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#C8E6C9"></div>2. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#FFE0B2"></div>3. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#F8BBD0"></div>4. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#E1BEE7"></div>Seçmeli</div>
  </div>
  <div class="footer">Oluşturulma: ${new Date().toLocaleDateString("tr-TR")} — ÇAKÜ Ders Programı Otomasyonu</div>
</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}

function DersProgramiApp({ currentUser, activeDepartment, departmentInfo }) {
  const [scheduleData, setScheduleData] = useState({});
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState("guz");
  const [year, setYear] = useState("1");
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const responsive = window.useResponsive();

  // Sınav otomasyonundan paylaşılan veriler
  const [courses, setCourses] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  // Modal form state
  const [modalCourseId, setModalCourseId] = useState("");
  const [modalClassroom, setModalClassroom] = useState("");

  // Fakülte birleşik görünüm & çakışma state
  const [showFacultyView, setShowFacultyView] = useState(false);
  const [allSchedules, setAllSchedules] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [loadingFaculty, setLoadingFaculty] = useState(false);

  const isAdmin = currentUser?.role === "admin";
  const isDeptManager = currentUser?.role === "bolum_yetkilisi";
  const canManage = isAdmin || isDeptManager;

  // Sınav otomasyonundaki dersleri, hocaları ve derslikleri yükle (bölüm bazlı)
  useEffect(() => {
    const loadSharedData = async () => {
      if (!activeDepartment) {
        setCourses([]);
        setProfessors([]);
        setClassrooms([]);
        return;
      }
      try {
        const db = window.firebase?.firestore();
        if (!db) return;

        // Dersler (sinav_dersler) - sadece aktif bölüm
        const coursesSnap = await db.collection("sinav_dersler").where("departmentId", "==", activeDepartment).get();
        const courseList = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        courseList.sort((a, b) => (a.sinif || 0) - (b.sinif || 0) || (a.code || "").localeCompare(b.code || ""));
        setCourses(courseList);

        // Akademisyenler (professors) - sadece aktif bölüm
        const profsSnap = await db.collection("professors").where("departmentId", "==", activeDepartment).get();
        const profList = profsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        profList.sort((a, b) => (a.name || "").localeCompare(b.name || "", "tr"));
        setProfessors(profList);

        // Derslikler (department_classrooms) - sadece aktif bölüm
        const roomsSnap = await db.collection("department_classrooms").where("departmentId", "==", activeDepartment).get();
        const roomList = roomsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        roomList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setClassrooms(roomList);
      } catch (e) {
        console.error("Paylaşılan veriler yüklenirken hata:", e);
      }
    };
    loadSharedData();
  }, [activeDepartment]);

  // Ders programını yükle
  // Bölüm değiştiğinde mevcut verileri ve düzenleme modunu sıfırla
  useEffect(() => {
    setScheduleData({});
    setEditMode(false);
    setAllSchedules([]);
    setConflicts([]);
  }, [activeDepartment]);

  useEffect(() => {
    const loadSchedule = async () => {
      setLoading(true);
      try {
        const db = window.firebase?.firestore();
        if (db && activeDepartment) {
          const docId = `${activeDepartment}_${semester}_${year}`;
          const doc = await db.collection("course_schedules").doc(docId).get();
          if (doc.exists) {
            setScheduleData(doc.data().slots || {});
          } else {
            setScheduleData({});
          }
        } else {
          setScheduleData({});
        }
      } catch (e) {
        console.error("Ders programı yüklenirken hata:", e);
        setScheduleData({});
      } finally {
        setLoading(false);
      }
    };
    loadSchedule();
  }, [activeDepartment, semester, year]);

  // Program kaydet
  const saveSchedule = useCallback(async (newData) => {
    if (!activeDepartment) {
      alert("Lütfen önce bir bölüm seçin.");
      return;
    }
    try {
      const docId = `${activeDepartment}_${semester}_${year}`;
      await window.FirestoreWrite.set("course_schedules", docId, {
        slots: newData,
        departmentId: activeDepartment,
        semester,
        year,
        updatedAt: new Date().toISOString(),
      }, true);
    } catch (e) {
      console.error("Program kaydedilirken hata:", e);
      alert("Program kaydedilirken hata: " + e.message);
    }
  }, [activeDepartment, semester, year]);

  // Slot ekle
  const handleAddSlot = useCallback(() => {
    if (!selectedSlot || !modalCourseId) return;
    const course = courses.find(c => c.id === modalCourseId);
    if (!course) return;

    const key = `${selectedSlot.day}_${selectedSlot.hourIndex}`;
    const newData = {
      ...scheduleData,
      [key]: {
        courseCode: course.code || "",
        courseName: course.name || "",
        instructor: course.professor || "",
        classroom: modalClassroom || "",
        courseId: course.id,
        sinif: course.sinif || 0,
      },
    };
    setScheduleData(newData);
    saveSchedule(newData);
    setShowAddModal(false);
    setModalCourseId("");
    setModalClassroom("");
  }, [selectedSlot, modalCourseId, modalClassroom, scheduleData, courses, saveSchedule]);

  // Slot sil
  const handleRemoveSlot = useCallback((key) => {
    const newData = { ...scheduleData };
    delete newData[key];
    setScheduleData(newData);
    saveSchedule(newData);
  }, [scheduleData, saveSchedule]);

  // Fakülte geneli tüm bölüm programlarını yükle
  const loadAllFacultySchedules = useCallback(async () => {
    setLoadingFaculty(true);
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      // Tüm bölümleri al
      const deptsSnap = await db.collection("departments").get();
      const depts = deptsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Her bölüm + dönem + sınıf kombinasyonu için programı yükle
      const schedules = [];
      for (const dept of depts) {
        const docId = `${dept.id}_${semester}_${year}`;
        const doc = await db.collection("course_schedules").doc(docId).get();
        if (doc.exists && doc.data().slots && Object.keys(doc.data().slots).length > 0) {
          schedules.push({
            deptId: dept.id,
            deptName: dept.name || dept.id,
            slots: doc.data().slots,
          });
        }
      }
      setAllSchedules(schedules);
      // Çakışma tespiti
      const c = detectConflicts(scheduleData, schedules, activeDepartment, semester);
      setConflicts(c);
      return schedules;
    } catch (e) {
      console.error("Fakülte programları yüklenirken hata:", e);
      return [];
    } finally {
      setLoadingFaculty(false);
    }
  }, [semester, year, scheduleData, activeDepartment]);

  // scheduleData değiştiğinde mevcut bölüm içi çakışmaları kontrol et
  useEffect(() => {
    const c = detectConflicts(scheduleData, allSchedules, activeDepartment, semester);
    setConflicts(c);
  }, [scheduleData, allSchedules, activeDepartment, semester]);

  // Seçili sınıfa ait dersler
  const yearCourses = useMemo(() => {
    const y = parseInt(year);
    return courses.filter(c => c.sinif === y || c.sinif === 5);
  }, [courses, year]);

  // Renk ataması
  const courseColors = useMemo(() => {
    const map = {};
    let idx = 0;
    Object.values(scheduleData).forEach(slot => {
      if (slot?.courseCode && !map[slot.courseCode]) {
        map[slot.courseCode] = SLOT_COLORS[idx % SLOT_COLORS.length];
        idx++;
      }
    });
    return map;
  }, [scheduleData]);

  // İstatistikler
  const stats = useMemo(() => {
    const slotCount = Object.keys(scheduleData).length;
    const uniqueCourses = new Set(Object.values(scheduleData).map(s => s.courseCode)).size;
    const uniqueProfs = new Set(Object.values(scheduleData).map(s => s.instructor).filter(Boolean)).size;
    return { slotCount, uniqueCourses, uniqueProfs };
  }, [scheduleData]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, border: "3px solid #E5E1D8", borderTopColor: DP.primary, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#666", fontSize: 14 }}>Ders programı yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center",
        justifyContent: "space-between", gap: 12, marginBottom: 20,
      }}>
        <div>
          <h1 style={{ fontSize: responsive.val(20, 24, 28), fontWeight: 700, color: DP.navy, margin: 0 }}>
            Ders Programı
          </h1>
          <p style={{ fontSize: 13, color: DP.textMuted, marginTop: 4 }}>
            {departmentInfo?.name || "Bölüm"} - Haftalık ders programı
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {/* Çakışma uyarı butonu */}
          {conflicts.length > 0 && (
            <button onClick={() => setShowConflicts(!showConflicts)} style={{
              padding: "8px 14px", borderRadius: 8, border: "1px solid #FCA5A5",
              background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}>
              <DPIcon path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" size={14} color="#DC2626" />
              {conflicts.length} Çakışma
            </button>
          )}
          {/* Fakülte birleşik görünüm */}
          {isAdmin && (
            <button onClick={async () => {
              const schedules = await loadAllFacultySchedules();
              if (schedules && schedules.length > 0) {
                setShowFacultyView(true);
              } else {
                alert("Fakülte genelinde bu dönem/sınıf için ders programı bulunamadı.");
              }
            }} disabled={loadingFaculty} style={{
              padding: "8px 14px", borderRadius: 8, border: "1px solid #C4B5FD",
              background: "#EDE9FE", color: DP.primary, fontSize: 12, fontWeight: 600,
              cursor: loadingFaculty ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6,
              opacity: loadingFaculty ? 0.6 : 1,
            }}>
              <DPIcon path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" size={14} color={DP.primary} />
              {loadingFaculty ? "Yükleniyor..." : "Fakülte Programı"}
            </button>
          )}
          {/* Bölüm bazlı dışa aktarma */}
          {Object.keys(scheduleData).length > 0 && (
            <button onClick={() => exportDeptSchedule(scheduleData, departmentInfo?.name || "Bölüm", semester, year)} style={{
              padding: "8px 14px", borderRadius: 8, border: "1px solid #6EE7B7",
              background: "#ECFDF5", color: "#059669", fontSize: 12, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}>
              <DPIcon path="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" size={14} color="#059669" />
              Bölüm Çıktısı
            </button>
          )}
          {/* Çakışma kontrolü tetikle */}
          <button onClick={async () => {
            await loadAllFacultySchedules();
            setShowConflicts(true);
          }} disabled={loadingFaculty} style={{
            padding: "8px 14px", borderRadius: 8, border: "1px solid #D1D5DB",
            background: "white", color: DP.textMuted, fontSize: 12, fontWeight: 500,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
            <DPIcon path="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" size={14} />
            Çakışma Kontrolü
          </button>
          {canManage && (
            <button onClick={() => setEditMode(!editMode)} style={{
              padding: "8px 16px", borderRadius: 8,
              border: editMode ? "none" : "1px solid #D1D5DB",
              background: editMode ? DP.green : "white",
              color: editMode ? "white" : DP.textMuted,
              fontSize: 13, fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <DPIcon path={editMode ? "M5 13l4 4L19 7" : "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"} size={14} />
              {editMode ? "Düzenleme Modu Aktif" : "Düzenle"}
            </button>
          )}
        </div>
      </div>

      {/* Stats + Filters */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20,
        alignItems: "stretch",
      }}>
        {/* Stats */}
        <div style={{
          display: "flex", gap: 8, flex: "0 0 auto",
        }}>
          {[
            { label: "Ders Saati", value: stats.slotCount, color: DP.primary },
            { label: "Ders", value: stats.uniqueCourses, color: "#3B82F6" },
            { label: "Hoca", value: stats.uniqueProfs, color: "#059669" },
          ].map((s, i) => (
            <div key={i} style={{
              background: "white", borderRadius: 8, padding: "8px 16px",
              border: "1px solid #E5E7EB", textAlign: "center", minWidth: 70,
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: DP.textMuted }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 12, flex: 1,
          background: "white", padding: responsive.val(10, 12, 12),
          borderRadius: 8, border: "1px solid #E5E7EB", alignItems: "center",
        }}>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: DP.textMuted, marginBottom: 2 }}>Dönem</label>
            <div style={{ display: "flex", gap: 2 }}>
              {[{ id: "guz", label: "Güz" }, { id: "bahar", label: "Bahar" }].map(s => (
                <button key={s.id} onClick={() => setSemester(s.id)} style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                  border: "1px solid #D1D5DB", cursor: "pointer",
                  background: semester === s.id ? DP.primary : "white",
                  color: semester === s.id ? "white" : DP.text,
                }}>{s.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: DP.textMuted, marginBottom: 2 }}>Sınıf</label>
            <div style={{ display: "flex", gap: 2 }}>
              {["1", "2", "3", "4"].map(y => (
                <button key={y} onClick={() => setYear(y)} style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                  border: "1px solid #D1D5DB", cursor: "pointer",
                  background: year === y ? DP.primary : "white",
                  color: year === y ? "white" : DP.text,
                }}>{y}. Sınıf</button>
              ))}
            </div>
          </div>
          {courses.length > 0 && (
            <div style={{ fontSize: 11, color: DP.textMuted, marginLeft: "auto" }}>
              Sınav Otomasyonundan: <strong>{courses.length}</strong> ders, <strong>{professors.length}</strong> hoca, <strong>{classrooms.length}</strong> derslik
            </div>
          )}
        </div>
      </div>

      {/* Info banner when no department selected */}
      {!activeDepartment && (
        <div style={{
          background: "#EDE9FE", border: "1px solid #C4B5FD", borderRadius: 10,
          padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
        }}>
          <DPIcon path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" size={20} color={DP.primary} />
          <div style={{ fontSize: 13, color: "#5B21B6" }}>
            Lütfen bir bölüm seçin. Ders programı bölüm bazlı çalışmaktadır.
          </div>
        </div>
      )}

      {/* Info banner when no courses */}
      {activeDepartment && courses.length === 0 && (
        <div style={{
          background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 10,
          padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
        }}>
          <DPIcon path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" size={20} color="#F59E0B" />
          <div style={{ fontSize: 13, color: "#92400E" }}>
            Bu bölüm için henüz ders tanımlanmamış. Önce <strong>Sınav Otomasyonu</strong> modülünden ders ve akademisyen ekleyin.
          </div>
        </div>
      )}

      {/* Schedule Grid */}
      <div style={{
        background: "white", borderRadius: 12, border: "1px solid #E5E7EB",
        overflow: "auto",
      }}>
        {responsive.isMobile ? (
          // Mobile: Card-based view
          <div style={{ padding: 12 }}>
            {DAYS.map(day => {
              const daySlots = HOURS.map((hour, hi) => {
                const key = `${day}_${hi}`;
                return scheduleData[key] ? { ...scheduleData[key], hour, hourIndex: hi, key } : null;
              }).filter(Boolean);

              if (daySlots.length === 0 && !editMode) return null;

              return (
                <div key={day} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: DP.navy,
                    padding: "8px 0", borderBottom: "2px solid " + DP.primary,
                    marginBottom: 8,
                  }}>{day}</div>
                  {daySlots.map((slot, i) => (
                    <div key={i} style={{
                      padding: "8px 12px", marginBottom: 4, borderRadius: 8,
                      background: `${courseColors[slot.courseCode] || "#6B7280"}15`,
                      borderLeft: `3px solid ${courseColors[slot.courseCode] || "#6B7280"}`,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <div>
                        <div style={{ fontSize: 11, color: DP.textMuted }}>{slot.hour}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: DP.text }}>{slot.courseCode} - {slot.courseName}</div>
                        {slot.instructor && <div style={{ fontSize: 11, color: DP.textMuted }}>{slot.instructor}</div>}
                        {slot.classroom && <div style={{ fontSize: 11, color: DP.textMuted }}>Derslik: {slot.classroom}</div>}
                      </div>
                      {editMode && (
                        <button onClick={() => handleRemoveSlot(slot.key)} style={{
                          background: "none", border: "none", cursor: "pointer", padding: 4, color: "#EF4444",
                        }}>
                          <DPIcon path="M18 6L6 18M6 6l12 12" size={16} color="#EF4444" />
                        </button>
                      )}
                    </div>
                  ))}
                  {editMode && (
                    <button onClick={() => { setSelectedSlot({ day, hourIndex: 0, hour: HOURS[0] }); setShowAddModal(true); }} style={{
                      width: "100%", padding: 8, border: "1px dashed #D1D5DB", borderRadius: 8,
                      background: "transparent", cursor: "pointer", fontSize: 12, color: DP.textMuted,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 4,
                    }}>
                      <DPIcon path="M12 5v14M5 12h14" size={14} color="#D1D5DB" /> Ders Ekle
                    </button>
                  )}
                </div>
              );
            })}
            {Object.keys(scheduleData).length === 0 && !editMode && (
              <div style={{ textAlign: "center", padding: 40, color: DP.textMuted }}>
                <DPIcon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" size={48} color="#D1D5DB" />
                <p style={{ marginTop: 12 }}>Bu dönem için ders programı henüz oluşturulmamış.</p>
              </div>
            )}
          </div>
        ) : (
          // Desktop: Table grid
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{
                  padding: "12px 8px", fontSize: 12, fontWeight: 700,
                  color: DP.textMuted, textAlign: "center", background: "#F9FAFB",
                  borderBottom: "2px solid #E5E7EB", width: 90,
                }}>Saat</th>
                {DAYS.map(day => (
                  <th key={day} style={{
                    padding: "12px 8px", fontSize: 13, fontWeight: 700,
                    color: DP.navy, textAlign: "center", background: "#F9FAFB",
                    borderBottom: "2px solid #E5E7EB",
                  }}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour, hi) => (
                <tr key={hi}>
                  <td style={{
                    padding: "8px 6px", fontSize: 11, fontWeight: 500,
                    color: DP.textMuted, textAlign: "center",
                    borderBottom: "1px solid #F3F4F6", background: "#FAFAFA",
                  }}>{hour}</td>
                  {DAYS.map(day => {
                    const key = `${day}_${hi}`;
                    const slot = scheduleData[key];
                    return (
                      <td
                        key={day}
                        onClick={() => {
                          if (editMode && !slot) {
                            setSelectedSlot({ day, hourIndex: hi, hour });
                            setModalCourseId("");
                            setModalClassroom("");
                            setShowAddModal(true);
                          }
                        }}
                        style={{
                          padding: 4, borderBottom: "1px solid #F3F4F6",
                          cursor: editMode && !slot ? "pointer" : "default",
                          background: editMode && !slot ? "#FAFBFF" : "transparent",
                          transition: "background 0.15s",
                        }}
                      >
                        {slot ? (
                          <div style={{
                            padding: "6px 8px", borderRadius: 6,
                            background: `${courseColors[slot.courseCode] || "#6B7280"}15`,
                            borderLeft: `3px solid ${courseColors[slot.courseCode] || "#6B7280"}`,
                            minHeight: 40, position: "relative",
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: DP.text }}>{slot.courseCode}</div>
                            <div style={{ fontSize: 11, color: DP.textMuted, lineHeight: 1.2 }}>{slot.courseName}</div>
                            {slot.instructor && <div style={{ fontSize: 10, color: DP.textMuted, marginTop: 2 }}>{slot.instructor}</div>}
                            {slot.classroom && <div style={{ fontSize: 10, color: DP.primary, fontWeight: 500 }}>{slot.classroom}</div>}
                            {editMode && (
                              <button onClick={(e) => { e.stopPropagation(); handleRemoveSlot(key); }} style={{
                                position: "absolute", top: 2, right: 2,
                                background: "none", border: "none", cursor: "pointer", padding: 2,
                              }}>
                                <DPIcon path="M18 6L6 18M6 6l12 12" size={12} color="#EF4444" />
                              </button>
                            )}
                          </div>
                        ) : editMode ? (
                          <div style={{
                            minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center",
                            borderRadius: 6, border: "1px dashed #D1D5DB",
                          }}>
                            <DPIcon path="M12 5v14M5 12h14" size={14} color="#D1D5DB" />
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Slot Modal */}
      {showAddModal && selectedSlot && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.4)", zIndex: 2000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            background: "white", borderRadius: 16,
            padding: responsive.val(20, 24, 28),
            width: "100%", maxWidth: 480,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: DP.navy, marginBottom: 4 }}>
              Ders Programına Ekle
            </h3>
            <p style={{ fontSize: 13, color: DP.textMuted, marginBottom: 20 }}>
              {selectedSlot.day} - {selectedSlot.hour}
            </p>

            {/* Saat seçimi (mobilde) */}
            {responsive.isMobile && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DP.textMuted, marginBottom: 4 }}>Saat</label>
                <select
                  value={selectedSlot.hourIndex}
                  onChange={e => setSelectedSlot({ ...selectedSlot, hourIndex: parseInt(e.target.value), hour: HOURS[parseInt(e.target.value)] })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none", background: "white" }}
                >
                  {HOURS.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </div>
            )}

            {/* Ders seçimi (sınav otomasyonundaki derslerden) */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DP.textMuted, marginBottom: 4 }}>
                Ders Seçimi <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(Sınav Otomasyonundan)</span>
              </label>
              {yearCourses.length > 0 ? (
                <select
                  value={modalCourseId}
                  onChange={e => setModalCourseId(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none", background: "white" }}
                >
                  <option value="">Ders seçin...</option>
                  {yearCourses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name} {c.professor ? `(${c.professor})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{
                  padding: "10px 12px", borderRadius: 8, border: "1px solid #FCD34D",
                  background: "#FFFBEB", fontSize: 12, color: "#92400E",
                }}>
                  Bu sınıf için ders bulunamadı. Sınav Otomasyonundan ders ekleyin.
                </div>
              )}
            </div>

            {/* Derslik seçimi */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DP.textMuted, marginBottom: 4 }}>
                Derslik <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(Sınav Otomasyonundan)</span>
              </label>
              {classrooms.length > 0 ? (
                <select
                  value={modalClassroom}
                  onChange={e => setModalClassroom(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none", background: "white" }}
                >
                  <option value="">Derslik seçin (opsiyonel)...</option>
                  {classrooms.map(r => (
                    <option key={r.id} value={r.name}>{r.name} ({r.capacity} kişi)</option>
                  ))}
                </select>
              ) : (
                <input
                  value={modalClassroom}
                  onChange={e => setModalClassroom(e.target.value)}
                  placeholder="Derslik adı (ör: D-201)"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none" }}
                />
              )}
            </div>

            {/* Seçili ders önizleme */}
            {modalCourseId && (() => {
              const c = courses.find(x => x.id === modalCourseId);
              if (!c) return null;
              return (
                <div style={{
                  padding: 12, borderRadius: 8, background: "#F3F4F6",
                  marginBottom: 14, fontSize: 12,
                }}>
                  <div style={{ fontWeight: 600, color: DP.text }}>{c.code} - {c.name}</div>
                  {c.professor && <div style={{ color: DP.textMuted, marginTop: 2 }}>Hoca: {c.professor}</div>}
                  {c.sinif && <div style={{ color: DP.textMuted }}>Sınıf: {c.sinif === 5 ? "Seçmeli" : c.sinif + ". Sınıf"}</div>}
                  {c.studentCount > 0 && <div style={{ color: DP.textMuted }}>Öğrenci: {c.studentCount}</div>}
                </div>
              );
            })()}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowAddModal(false)} style={{
                padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D5DB",
                background: "white", color: DP.textMuted, fontSize: 13, cursor: "pointer",
              }}>İptal</button>
              <button onClick={handleAddSlot} disabled={!modalCourseId} style={{
                padding: "10px 20px", borderRadius: 8, border: "none",
                background: modalCourseId ? DP.primary : "#D1D5DB",
                color: "white", fontSize: 13, fontWeight: 600,
                cursor: modalCourseId ? "pointer" : "default",
              }}>Ekle</button>
            </div>
          </div>
        </div>
      )}

      {/* Çakışma Paneli */}
      {showConflicts && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.4)", zIndex: 2000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={() => setShowConflicts(false)}>
          <div style={{
            background: "white", borderRadius: 16, padding: 24,
            width: "100%", maxWidth: 560, maxHeight: "80vh", overflow: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: DP.navy, margin: 0 }}>
                Çakışma Kontrolü
              </h3>
              <button onClick={() => setShowConflicts(false)} style={{
                background: "none", border: "none", cursor: "pointer", padding: 4,
              }}>
                <DPIcon path="M18 6L6 18M6 6l12 12" size={18} color="#9CA3AF" />
              </button>
            </div>

            {conflicts.length === 0 ? (
              <div style={{
                textAlign: "center", padding: 32, color: DP.green,
              }}>
                <DPIcon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={48} color={DP.green} />
                <p style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>Çakışma bulunamadı!</p>
                <p style={{ fontSize: 12, color: DP.textMuted, marginTop: 4 }}>
                  Tüm derslikler ve saatler uyumlu görünüyor.
                </p>
              </div>
            ) : (
              <div>
                <div style={{
                  background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
                  padding: 12, marginBottom: 16, fontSize: 13, color: "#991B1B",
                }}>
                  <strong>{conflicts.length}</strong> adet çakışma tespit edildi.
                </div>
                {conflicts.map((c, i) => (
                  <div key={i} style={{
                    padding: 12, marginBottom: 8, borderRadius: 8,
                    border: "1px solid " + (c.type === "cross_dept" ? "#FDE68A" : "#FECACA"),
                    background: c.type === "cross_dept" ? "#FFFBEB" : "#FFF5F5",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <DPIcon path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" size={14} color={c.type === "cross_dept" ? "#D97706" : "#DC2626"} />
                      <span style={{
                        fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                        color: c.type === "cross_dept" ? "#D97706" : "#DC2626",
                      }}>
                        {c.type === "cross_dept" ? "Fakülte Çakışması" : "Derslik Çakışması"}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DP.text }}>{c.message}</div>
                    <div style={{ fontSize: 11, color: DP.textMuted, marginTop: 4 }}>
                      {c.courses.map((course, ci) => (
                        <div key={ci}>• {course}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fakülte Birleşik Görünüm Modal */}
      {showFacultyView && allSchedules.length > 0 && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 2000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={() => setShowFacultyView(false)}>
          <div style={{
            background: "white", borderRadius: 16, padding: 24,
            width: "100%", maxWidth: 1100, maxHeight: "90vh", overflow: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: DP.navy, margin: 0 }}>
                  Fakülte Birleşik Ders Programı
                </h3>
                <p style={{ fontSize: 12, color: DP.textMuted, marginTop: 4 }}>
                  {semester === "guz" ? "Güz" : "Bahar"} Dönemi — {year}. Sınıf — {allSchedules.length} bölüm
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => exportFacultySchedule(allSchedules, semester, year)} style={{
                  padding: "8px 16px", borderRadius: 8, border: "none",
                  background: DP.primary, color: "white", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                }}>
                  <DPIcon path="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" size={14} color="white" />
                  Yazdır / PDF
                </button>
                <button onClick={() => setShowFacultyView(false)} style={{
                  background: "none", border: "1px solid #D1D5DB", borderRadius: 8,
                  padding: "8px 12px", cursor: "pointer",
                }}>
                  <DPIcon path="M18 6L6 18M6 6l12 12" size={14} color="#9CA3AF" />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              {allSchedules.map((s, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 4,
                  background: "#F3F4F6", color: DP.text, fontWeight: 500,
                }}>
                  {s.deptName}
                </span>
              ))}
            </div>

            {/* Combined Grid */}
            <div style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 800 }}>
                <thead>
                  <tr>
                    <th style={{
                      padding: "10px 6px", background: DP.navy, color: "white",
                      fontWeight: 700, textAlign: "center", border: "1px solid #334155", width: 80,
                    }}>Saat</th>
                    {DAYS.map(day => (
                      <th key={day} style={{
                        padding: "10px 6px", background: DP.navy, color: "white",
                        fontWeight: 700, textAlign: "center", border: "1px solid #334155",
                      }}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map((hour, hi) => {
                    // Check if this hour has any slots
                    let hasAny = false;
                    DAYS.forEach(day => {
                      allSchedules.forEach(s => {
                        if (s.slots[`${day}_${hi}`]) hasAny = true;
                      });
                    });
                    if (!hasAny) return null;

                    return (
                      <tr key={hi}>
                        <td style={{
                          padding: "6px", fontWeight: 600, textAlign: "center",
                          background: "#F9FAFB", border: "1px solid #E5E7EB", whiteSpace: "nowrap",
                        }}>{hour}</td>
                        {DAYS.map(day => {
                          const entries = allSchedules
                            .filter(s => s.slots[`${day}_${hi}`])
                            .map(s => ({ deptName: s.deptName, ...s.slots[`${day}_${hi}`] }));
                          return (
                            <td key={day} style={{
                              padding: 2, border: "1px solid #E5E7EB", verticalAlign: "top",
                            }}>
                              {entries.map((e, ei) => {
                                const bg = GRADE_COLORS[e.sinif]?.bg || "#F3F4F6";
                                return (
                                  <div key={ei} style={{
                                    padding: "3px 6px", margin: "2px 0", borderRadius: 4,
                                    background: bg, fontSize: 10, lineHeight: 1.3,
                                  }}>
                                    <strong>{e.courseCode}</strong>
                                    <div style={{ color: "#555" }}>{e.deptName}</div>
                                    {e.instructor && <div style={{ color: "#777", fontSize: 9 }}>{e.instructor}</div>}
                                    {e.classroom && <div style={{ color: DP.primary, fontWeight: 500 }}>{e.classroom}</div>}
                                  </div>
                                );
                              })}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Conflict summary in faculty view */}
            {conflicts.length > 0 && (
              <div style={{
                marginTop: 16, padding: 12, background: "#FEF2F2",
                border: "1px solid #FECACA", borderRadius: 8,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#991B1B", marginBottom: 8 }}>
                  ⚠ {conflicts.length} çakışma tespit edildi:
                </div>
                {conflicts.slice(0, 5).map((c, i) => (
                  <div key={i} style={{ fontSize: 11, color: "#7F1D1D", marginBottom: 4 }}>
                    • {c.message}
                  </div>
                ))}
                {conflicts.length > 5 && (
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                    ... ve {conflicts.length - 5} daha fazla
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

window.DersProgramiApp = DersProgramiApp;
