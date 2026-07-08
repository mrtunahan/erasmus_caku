// ══════════════════════════════════════════════════════════════
// ÇAKÜ Mühendislik Fakültesi - Ders Programı Otomasyonu
// Sınav otomasyonundaki ders/hoca/derslik verilerini kullanır
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const DP = {
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryPale: '#EDE9FE',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  green: '#059669',
  navy: '#1B2A4A',
};

const DPIcon = ({ path, size = 18, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={path} />
  </svg>
);

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const HOURS = [
  '08:30-09:15',
  '09:30-10:15',
  '10:30-11:15',
  '11:30-12:15',
  '12:30-13:15',
  '13:30-14:15',
  '14:30-15:15',
  '15:30-16:15',
  '16:15-17:00',
];

const SLOT_COLORS = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
  '#6366F1',
  '#14B8A6',
  '#84CC16',
  '#F43F5E',
];

const GRADE_COLORS = {
  1: { bg: '#B2EBF2', text: '#006064' },
  2: { bg: '#C8E6C9', text: '#1B5E20' },
  3: { bg: '#FFE0B2', text: '#E65100' },
  4: { bg: '#F8BBD0', text: '#880E4F' },
  5: { bg: '#E1BEE7', text: '#4A148C' },
};

// ── Çakışma Tespit Fonksiyonu ──
// deptAllYearsSlots: bölüm içi tüm sınıfların slotları [{year, slots}]
// allFacultySlots: fakülte geneli tüm bölüm/sınıf slotları [{deptId, deptName, year, slots}]
function detectConflicts(deptAllYearsSlots, allFacultySlots) {
  const conflicts = [];
  const seen = new Set();

  // 1) Bölüm içi: tüm sınıflar arası derslik + saat çakışması
  if (deptAllYearsSlots && deptAllYearsSlots.length > 0) {
    // day_hourIndex -> [{year, slot}]
    const timeMap = {};
    deptAllYearsSlots.forEach(({ year: yr, slots }) => {
      Object.entries(slots).forEach(([key, slot]) => {
        if (!timeMap[key]) timeMap[key] = [];
        timeMap[key].push({ year: yr, ...slot });
      });
    });
    Object.entries(timeMap).forEach(([key, entries]) => {
      if (entries.length <= 1) return;
      const [day, hiStr] = key.split('_');
      const hi = parseInt(hiStr);
      const hour = HOURS[hi] || key;
      // Aynı derslik kullanan farklı dersler
      const classroomMap = {};
      entries.forEach((e) => {
        if (!e.classroom) return;
        if (!classroomMap[e.classroom]) classroomMap[e.classroom] = [];
        classroomMap[e.classroom].push(e);
      });
      Object.entries(classroomMap).forEach(([room, roomEntries]) => {
        if (roomEntries.length <= 1) return;
        const uniqueCourses = new Set(roomEntries.map((e) => e.courseCode));
        if (uniqueCourses.size <= 1) return;
        const cKey = `dept_${day}_${hi}_${room}`;
        if (seen.has(cKey)) return;
        seen.add(cKey);
        conflicts.push({
          type: 'dept_classroom',
          day,
          hour,
          classroom: room,
          courses: roomEntries.map((e) => `${e.year}. Sınıf: ${e.courseCode} - ${e.courseName}`),
          message: `Bölüm derslik çakışması: ${room} — ${day} ${hour} — ${roomEntries.map((e) => e.courseCode + ' (' + e.year + '. Sınıf)').join(' & ')}`,
        });
      });
      // Aynı hoca aynı saatte farklı derslerde
      const profMap = {};
      entries.forEach((e) => {
        if (!e.instructor) return;
        if (!profMap[e.instructor]) profMap[e.instructor] = [];
        profMap[e.instructor].push(e);
      });
      Object.entries(profMap).forEach(([prof, profEntries]) => {
        if (profEntries.length <= 1) return;
        const uniqueCourses = new Set(profEntries.map((e) => e.courseCode));
        if (uniqueCourses.size <= 1) return;
        const cKey = `prof_${day}_${hi}_${prof}`;
        if (seen.has(cKey)) return;
        seen.add(cKey);
        conflicts.push({
          type: 'dept_professor',
          day,
          hour,
          instructor: prof,
          courses: profEntries.map((e) => `${e.year}. Sınıf: ${e.courseCode}`),
          message: `Hoca çakışması: ${prof} — ${day} ${hour} — ${profEntries.map((e) => e.courseCode + ' (' + e.year + '. Sınıf)').join(' & ')}`,
        });
      });
    });
  }

  // 2) Fakülte geneli: tüm bölümler arası derslik çakışması
  if (allFacultySlots && allFacultySlots.length > 0) {
    const globalMap = {};
    allFacultySlots.forEach(({ deptId, deptName, year: yr, slots }) => {
      Object.entries(slots).forEach(([key, slot]) => {
        if (!slot.classroom) return;
        const gKey = `${key}__${slot.classroom}`;
        if (!globalMap[gKey]) globalMap[gKey] = [];
        globalMap[gKey].push({
          deptId,
          deptName,
          year: yr,
          courseCode: slot.courseCode,
          courseName: slot.courseName,
        });
      });
    });
    Object.entries(globalMap).forEach(([gKey, entries]) => {
      if (entries.length <= 1) return;
      const deptSet = new Set(entries.map((e) => e.deptId));
      if (deptSet.size <= 1) return;
      const parts = gKey.split('__');
      const classroom = parts[1];
      const [day, hiStr] = parts[0].split('_');
      const hi = parseInt(hiStr);
      const cKey = `fac_${day}_${hi}_${classroom}`;
      if (seen.has(cKey)) return;
      seen.add(cKey);
      conflicts.push({
        type: 'cross_dept',
        day,
        hour: HOURS[hi] || '',
        classroom,
        courses: entries.map((e) => `${e.deptName} (${e.year}. Sınıf): ${e.courseCode}`),
        message: `Fakülte çakışması: ${classroom} — ${day} ${HOURS[hi] || ''} — ${entries.map((e) => e.deptName + ':' + e.courseCode).join(' & ')}`,
      });
    });
  }
  return conflicts;
}

// ── Slot ekleme öncesi anlık çakışma kontrolü ──
function checkSlotConflict(
  day,
  hourIndex,
  classroom,
  instructor,
  deptAllYearsSlots,
  allFacultySlots
) {
  const warnings = [];
  const key = `${day}_${hourIndex}`;
  const hour = HOURS[hourIndex] || '';

  // Bölüm içi: aynı saat + aynı derslik
  if (deptAllYearsSlots && classroom) {
    deptAllYearsSlots.forEach(({ year: yr, slots }) => {
      Object.entries(slots).forEach(([slotKey, slot]) => {
        if (slotKey === key && slot.classroom === classroom && slot.courseCode) {
          warnings.push(
            `Derslik çakışması: ${classroom} bu saatte ${yr}. Sınıf'ta "${slot.courseCode}" dersi için kullanılıyor.`
          );
        }
      });
    });
  }
  // Bölüm içi: aynı saat + aynı hoca
  if (deptAllYearsSlots && instructor) {
    deptAllYearsSlots.forEach(({ year: yr, slots }) => {
      Object.entries(slots).forEach(([slotKey, slot]) => {
        if (slotKey === key && slot.instructor === instructor && slot.courseCode) {
          warnings.push(
            `Hoca çakışması: ${instructor} bu saatte ${yr}. Sınıf'ta "${slot.courseCode}" dersinde.`
          );
        }
      });
    });
  }
  // Fakülte geneli: aynı saat + aynı derslik (farklı bölüm)
  if (allFacultySlots && classroom) {
    allFacultySlots.forEach(({ deptName, year: yr, slots }) => {
      Object.entries(slots).forEach(([slotKey, slot]) => {
        if (slotKey === key && slot.classroom === classroom) {
          warnings.push(
            `Fakülte çakışması: ${classroom} bu saatte ${deptName} (${yr}. Sınıf) "${slot.courseCode}" için kullanılıyor.`
          );
        }
      });
    });
  }
  return warnings;
}

// ── Fakülte Birleşik Program Çıktısı (tüm bölümler, tüm sınıflar) ──
function exportFacultySchedule(allFacultySlots, semester) {
  const semesterLabel = semester === 'guz' ? 'GÜZ' : 'BAHAR';

  const grid = {};
  DAYS.forEach((day) => {
    grid[day] = {};
    HOURS.forEach((_, hi) => {
      grid[day][hi] = [];
    });
  });

  allFacultySlots.forEach(({ deptName, year: yr, slots }) => {
    Object.entries(slots).forEach(([key, slot]) => {
      const [day, hiStr] = key.split('_');
      const hi = parseInt(hiStr);
      if (grid[day] && grid[day][hi] !== undefined) {
        grid[day][hi].push({ deptName, year: yr, ...slot });
        // Bölünmüş hücrenin ikinci dersi ayrı bir satır olarak eklenir
        if (slot.ikinci) grid[day][hi].push({ deptName, year: yr, ...slot.ikinci });
      }
    });
  });

  let tableRows = '';
  HOURS.forEach((hour, hi) => {
    let hasAny = false;
    DAYS.forEach((day) => {
      if (grid[day][hi].length > 0) hasAny = true;
    });
    if (!hasAny) return;

    let row = `<tr><td style="padding:6px 8px;border:1px solid #999;font-weight:600;text-align:center;background:#F9FAFB;white-space:nowrap">${hour}</td>`;
    DAYS.forEach((day) => {
      const entries = grid[day][hi];
      if (entries.length === 0) {
        row += `<td style="padding:4px;border:1px solid #ddd"></td>`;
      } else {
        const cells = entries
          .map((e) => {
            const bg = GRADE_COLORS[e.sinif]?.bg || '#F3F4F6';
            return `<div style="padding:3px 6px;margin:2px 0;border-radius:4px;background:${bg};font-size:9px;line-height:1.3">
            <strong>${e.courseCode}</strong>
            <span style="color:#555;margin-left:3px">${e.deptName} ${e.year}.Sınıf</span>
            ${e.classroom ? `<br/><span style="color:#7C3AED;font-weight:600">${e.classroom}</span>` : ''}
          </div>`;
          })
          .join('');
        row += `<td style="padding:2px;border:1px solid #ddd;vertical-align:top">${cells}</td>`;
      }
    });
    row += '</tr>';
    tableRows += row;
  });

  const deptNames = [...new Set(allFacultySlots.map((s) => s.deptName))];

  const html = `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><title>Fakülte Ders Programı</title>
<style>
  @media print { body { margin: 0; } @page { size: A4 landscape; margin: 0.8cm; } }
  body { font-family: 'Times New Roman', serif; background: #e8e8e8; }
  .page { max-width: 1100px; margin: 20px auto; background: white; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  h1 { text-align: center; font-size: 16px; color: #1B2A4A; margin-bottom: 4px; border-bottom: 3px solid #1B2A4A; padding-bottom: 8px; }
  h2 { text-align: center; font-size: 12px; color: #C00; margin-bottom: 12px; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { padding: 8px 6px; border: 1px solid #999; background: #1B2A4A; color: white; font-weight: 700; text-align: center; font-size: 11px; }
  .legend { display: flex; gap: 12px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
  .legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; }
  .legend-box { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #ccc; }
  .footer { text-align: center; font-size: 9px; color: #999; margin-top: 14px; }
</style>
</head>
<body>
<div class="page">
  <h1>ÇAKÜ MÜHENDİSLİK FAKÜLTESİ - BİRLEŞİK DERS PROGRAMI</h1>
  <h2>${semesterLabel} DÖNEMİ — ${deptNames.join(', ')}</h2>
  <table>
    <thead><tr>
      <th style="width:80px">Saat</th>
      ${DAYS.map((d) => `<th>${d}</th>`).join('')}
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="legend">
    <div class="legend-item"><div class="legend-box" style="background:#B2EBF2"></div>1. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#C8E6C9"></div>2. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#FFE0B2"></div>3. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#F8BBD0"></div>4. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#E1BEE7"></div>Seçmeli</div>
  </div>
  <div class="footer">Oluşturulma: ${new Date().toLocaleDateString('tr-TR')} — ÇAKÜ Ders Programı Otomasyonu</div>
</div>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}

// ── Bölüm Bazlı Ders Programı Çıktısı (tüm sınıflar birleşik) ──
function exportDeptSchedule(deptAllYearsSlots, deptName, semester) {
  const semesterLabel = semester === 'guz' ? 'GÜZ' : 'BAHAR';

  // Grid: day -> hour -> [{year, slot}]
  const grid = {};
  DAYS.forEach((day) => {
    grid[day] = {};
    HOURS.forEach((_, hi) => {
      grid[day][hi] = [];
    });
  });

  deptAllYearsSlots.forEach(({ year: yr, slots }) => {
    Object.entries(slots).forEach(([key, slot]) => {
      const [day, hiStr] = key.split('_');
      const hi = parseInt(hiStr);
      if (grid[day] && grid[day][hi] !== undefined) {
        grid[day][hi].push({ year: yr, ...slot });
        if (slot.ikinci) grid[day][hi].push({ year: yr, ...slot.ikinci });
      }
    });
  });

  let tableRows = '';
  HOURS.forEach((hour, hi) => {
    let hasAny = false;
    DAYS.forEach((day) => {
      if (grid[day][hi].length > 0) hasAny = true;
    });
    if (!hasAny) return;

    let row = `<tr><td style="padding:8px 10px;border:1px solid #999;font-weight:600;text-align:center;background:#F9FAFB;white-space:nowrap">${hour}</td>`;
    DAYS.forEach((day) => {
      const entries = grid[day][hi];
      if (entries.length === 0) {
        row += `<td style="padding:4px;border:1px solid #ddd"></td>`;
      } else {
        const cells = entries
          .map((e) => {
            const bg = GRADE_COLORS[e.sinif]?.bg || '#F3F4F6';
            return `<div style="padding:4px 6px;margin:1px 0;border-radius:4px;background:${bg}">
            <div style="font-weight:700;font-size:11px">${e.courseCode} <span style="font-weight:400;color:#666">(${e.year}. Sınıf)</span></div>
            <div style="font-size:10px;color:#444">${e.courseName}</div>
            ${e.instructor ? `<div style="font-size:9px;color:#666">${e.instructor}</div>` : ''}
            ${e.classroom ? `<div style="font-size:9px;color:#7C3AED;font-weight:600">${e.classroom}</div>` : ''}
          </div>`;
          })
          .join('');
        row += `<td style="padding:2px;border:1px solid #ddd;vertical-align:top">${cells}</td>`;
      }
    });
    row += '</tr>';
    tableRows += row;
  });

  let totalSlots = 0;
  const allCodes = new Set();
  deptAllYearsSlots.forEach(({ slots }) => {
    const keys = Object.keys(slots);
    totalSlots += keys.length;
    Object.values(slots).forEach((s) => {
      if (s.courseCode) allCodes.add(s.courseCode);
      if (s.ikinci?.courseCode) allCodes.add(s.ikinci.courseCode);
    });
  });

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
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
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
  <h2>${(deptName || '').toUpperCase()} — ${semesterLabel} DÖNEMİ — TÜM SINIFLAR</h2>
  <div class="info">${allCodes.size} ders, ${totalSlots} ders saati, 1-4. Sınıf birleşik</div>
  <table>
    <thead><tr>
      <th style="width:90px">Saat</th>
      ${DAYS.map((d) => `<th>${d}</th>`).join('')}
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="legend">
    <div class="legend-item"><div class="legend-box" style="background:#B2EBF2"></div>1. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#C8E6C9"></div>2. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#FFE0B2"></div>3. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#F8BBD0"></div>4. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#E1BEE7"></div>Seçmeli</div>
  </div>
  <div class="footer">Oluşturulma: ${new Date().toLocaleDateString('tr-TR')} — ÇAKÜ Ders Programı Otomasyonu</div>
</div>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}

// ── Sürüklenebilir Ders Kartı (havuzdan tabloya bırakma) ──
const CourseChip = ({ course, color }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        id: course.id,
        code: course.code,
        name: course.name,
        professor: course.professor || '',
        sinif: course.sinif || 0,
      })
    );
    e.dataTransfer.effectAllowed = 'copy';
    e.currentTarget.style.opacity = '0.45';
  };
  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };
  const c = color || '#6B7280';
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={`${course.code} - ${course.name}${course.professor ? ' (' + course.professor + ')' : ''}`}
      style={{
        padding: '7px 9px',
        borderRadius: 7,
        cursor: 'grab',
        userSelect: 'none',
        background: `${c}12`,
        borderLeft: `3px solid ${c}`,
        border: `1px solid ${c}30`,
        marginBottom: 6,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: c }}>{course.code}</div>
      <div style={{ fontSize: 10, color: '#374151', lineHeight: 1.3, marginTop: 1 }}>
        {course.name}
      </div>
      {course.professor && (
        <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>{course.professor}</div>
      )}
    </div>
  );
};

function DersProgramiApp({ currentUser, activeDepartment, departmentInfo, seviye = 'lisans' }) {
  // Seviye eki: lisans geriye-uyumlu (eksiz), lisansüstü ayrı belge uzayı.
  const seviyeSuffix = seviye && seviye !== 'lisans' ? '_' + seviye : '';
  const [scheduleData, setScheduleData] = useState({});
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState('guz');
  const [year, setYear] = useState('1');
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const responsive = window.useResponsive();

  // Sınav otomasyonundan paylaşılan veriler
  const [courses, setCourses] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  // Modal form state
  const [modalCourseId, setModalCourseId] = useState('');
  const [modalClassroom, setModalClassroom] = useState('');

  // Fakülte birleşik görünüm & çakışma state
  const [showFacultyView, setShowFacultyView] = useState(false);
  const [allSchedules, setAllSchedules] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [loadingFaculty, setLoadingFaculty] = useState(false);

  // Bölüm içi tüm sınıfların programlarını yükle (çakışma kontrolü için)
  const [deptAllYearsSlots, setDeptAllYearsSlots] = useState([]);
  // Fakülte geneli tüm bölüm/sınıf slotları
  const [allFacultySlots, setAllFacultySlots] = useState([]);
  // Slot ekleme esnasında çakışma uyarıları
  const [addSlotWarnings, setAddSlotWarnings] = useState([]);

  const isAdmin = currentUser?.role === 'admin';
  const isDeptManager = currentUser?.role === 'bolum_yetkilisi';
  const isProfessor = currentUser?.role === 'professor';
  const canManage = isAdmin || isDeptManager || isProfessor;

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
        // Dersler (sinav_dersler) - sadece aktif bölüm + bu modülün SEVİYESİ
        const rawCourses = await window.apiRead('sinav_dersler', {
          where: `departmentId:eq:${activeDepartment}`,
        });
        const courseList = (rawCourses || [])
          .filter((c) => (c.seviye || 'lisans') === seviye)
          .slice();
        courseList.sort(
          (a, b) => (a.sinif || 0) - (b.sinif || 0) || (a.code || '').localeCompare(b.code || '')
        );
        setCourses(courseList);

        // Akademisyenler (professors) — aktif bölümün ana akademisyenleri +
        // çapraz-bölüm (additionalDepartments) ile eklenenler. window.profMatchesDept
        // her iki durumu da kontrol eder; veri küçük olduğu için tüm liste çekilip
        // client-side filtrelenir.
        const allProfs = await window.apiRead('professors');
        const deptInfoForFilter = (window.DEPARTMENTS || []).find((x) => x.id === activeDepartment);
        const rawProfs = (allProfs || []).filter((p) =>
          window.profMatchesDept
            ? window.profMatchesDept(p, activeDepartment, deptInfoForFilter?.name)
            : p.departmentId === activeDepartment
        );
        const profMap = {};
        rawProfs.forEach((p) => {
          const key = (p.name || '').trim();
          if (!key || profMap[key]) return;
          profMap[key] = p;
        });
        const profList = Object.values(profMap);
        profList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
        setProfessors(profList);

        // Derslikler (department_classrooms) - sadece aktif bölüm
        const roomList = await window.apiRead('department_classrooms', {
          where: `departmentId:eq:${activeDepartment}`,
        });
        roomList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setClassrooms(roomList);
      } catch (e) {
        console.error('Paylaşılan veriler yüklenirken hata:', e);
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
        if (activeDepartment) {
          const docId = `${activeDepartment}_${semester}_${year}${seviyeSuffix}`;
          const result = await window.apiReadDoc('course_schedules', docId);
          setScheduleData(result.exists ? result.data?.slots || {} : {});
        } else {
          setScheduleData({});
        }
      } catch (e) {
        console.error('Ders programı yüklenirken hata:', e);
        setScheduleData({});
      } finally {
        setLoading(false);
      }
    };
    loadSchedule();
  }, [activeDepartment, semester, year]);

  // Slot bazlı kaydet (oku-değiştir-yaz): tüm slots haritasını körlemesine
  // ezmek yerine en güncel dokümanı okuyup yalnızca ilgili slotu değiştirir.
  // Böylece eşzamanlı düzenlemede veri kaybı en aza iner.
  const commitSlots = useCallback(
    async (mutator) => {
      if (!activeDepartment) {
        alert('Lütfen önce bir bölüm seçin.');
        return null;
      }
      const docId = `${activeDepartment}_${semester}_${year}${seviyeSuffix}`;
      try {
        let base = {};
        try {
          const res = await window.apiReadDoc('course_schedules', docId);
          base = res.exists && res.data?.slots ? res.data.slots : {};
        } catch (_) {
          base = scheduleData;
        }
        // Yeniden-okuma cache/yarış nedeniyle bayat gelirse mevcut yerel
        // slotları KAYBETME: taze okuma önceliklidir, eksik anahtarlar yerel
        // scheduleData'dan tamamlanır. (Hücre bölmede birinci dersin silinmesi
        // bu birleştirmeyle engellenir.)
        const next = { ...scheduleData, ...base };
        mutator(next);
        await window.DBWrite.set(
          'course_schedules',
          docId,
          {
            slots: next,
            departmentId: activeDepartment,
            semester,
            year,
            seviye,
            updatedAt: new Date().toISOString(),
          },
          true
        );
        setScheduleData(next);
        return next;
      } catch (e) {
        console.error('Program kaydedilirken hata:', e);
        alert('Program kaydedilirken hata: ' + e.message);
        return null;
      }
    },
    [activeDepartment, semester, year, scheduleData]
  );

  // Sürükle-bırak / modal ortak yerleştirme mantığı
  const placeCourse = useCallback(
    ({ course, day, hi, classroom = '', forceAdd = false }) => {
      if (!course) return false;
      if (
        isProfessor &&
        currentUser?.name &&
        course.professor &&
        course.professor !== currentUser.name
      ) {
        alert('Sadece kendi derslerinizi programa ekleyebilirsiniz.');
        return false;
      }
      const key = `${day}_${hi}`;
      const existing = scheduleData[key];
      // Hücre BÖLME: dolu hücreye FARKLI bir ders bırakılırsa, aynı saat/sınıf/
      // hocada ikinci ders olarak eklenir (KML312 & TLK543 gibi eşdeğer dersler).
      const splitting = !!(existing && existing.courseCode && !existing.ikinci);
      if (!forceAdd) {
        const otherYearsSlots = deptAllYearsSlots.filter((s) => s.year !== year);
        const warnings = checkSlotConflict(
          day,
          hi,
          classroom || existing?.classroom || '',
          course.professor || '',
          otherYearsSlots,
          allFacultySlots
        );
        if (existing && existing.courseCode === course.code) {
          alert('Bu ders bu saatte zaten var.');
          return false;
        }
        if (existing && existing.ikinci) {
          alert('Bu hücre dolu (2 ders). Bölmek için önce birini kaldırın.');
          return false;
        }
        // splitting durumunda "zaten ders var" uyarısı VERİLMEZ — bölme kasıtlıdır.
        if (warnings.length > 0) {
          if (isAdmin) {
            if (
              !window.confirm(
                (splitting ? 'Hücre bölünüyor. ' : '') +
                  'Çakışma tespit edildi:\n\n• ' +
                  warnings.join('\n• ') +
                  '\n\nYine de yerleştirilsin mi?'
              )
            )
              return false;
          } else {
            alert('Çakışma nedeniyle yerleştirilemedi:\n\n• ' + warnings.join('\n• '));
            return false;
          }
        }
      }
      commitSlots((s) => {
        const cur = s[key];
        const yeni = {
          courseCode: course.code || '',
          courseName: course.name || '',
          instructor: course.professor || '',
          // ikinci ders varsayılan olarak birincinin dersliğini paylaşır
          classroom: classroom || (cur && cur.classroom) || '',
          courseId: course.id,
          sinif: course.sinif || 0,
        };
        if (cur && cur.courseCode) {
          // Bölme: mevcut birinci ders korunur, ikinci eklenir
          s[key] = { ...cur, ikinci: yeni };
        } else {
          s[key] = yeni;
        }
      });
      return true;
    },
    [
      deptAllYearsSlots,
      allFacultySlots,
      scheduleData,
      year,
      isProfessor,
      isAdmin,
      currentUser,
      commitSlots,
    ]
  );

  // Tablodaki boş hücreye ders bırakıldığında
  const handleDropCourse = useCallback(
    (course, day, hi) => {
      placeCourse({ course, day, hi, classroom: '' });
    },
    [placeCourse]
  );

  // Yerleştirilmiş slotun dersliğini satır içi değiştir
  const handleSlotClassroom = useCallback(
    (key, classroom) => {
      commitSlots((s) => {
        if (s[key]) s[key] = { ...s[key], classroom };
      });
    },
    [commitSlots]
  );

  // Slot ekle — otomatik çakışma önleme (admin hariç herkes engellenir)
  const handleAddSlot = useCallback(
    (forceAdd) => {
      if (!selectedSlot || !modalCourseId) return;
      const course = courses.find((c) => c.id === modalCourseId);
      if (!course) return;

      // Akademisyen kontrolü: sadece kendi derslerini ekleyebilir
      if (isProfessor && currentUser?.name && course.professor !== currentUser.name) {
        alert('Sadece kendi derslerinizi programa ekleyebilirsiniz.');
        return;
      }

      const day = selectedSlot.day;
      const hi = selectedSlot.hourIndex;
      const key = `${day}_${hi}`;
      const existing = scheduleData[key];
      const instructor = course.professor || '';
      // ikinci ders (bölme) birincinin dersliğini paylaşır
      const classroom = modalClassroom || (existing && existing.classroom) || '';

      // Aynı ders / hücre dolu kontrolü
      if (existing && existing.courseCode === course.code) {
        alert('Bu ders bu saatte zaten var.');
        return;
      }
      if (existing && existing.ikinci) {
        alert('Bu hücre dolu (2 ders). Bölmek için önce birini kaldırın.');
        return;
      }

      // Çakışma kontrolü (farklı yıl/fakülte) — hücre bölme "zaten var" saymaz
      if (!forceAdd) {
        const otherYearsSlots = deptAllYearsSlots.filter((s) => s.year !== year);
        const warnings = checkSlotConflict(
          day,
          hi,
          classroom,
          instructor,
          otherYearsSlots,
          allFacultySlots
        );
        if (warnings.length > 0) {
          setAddSlotWarnings(warnings);
          return; // Çakışma var — admin ise "Geçersiz Kıl" gösterilecek, diğerleri engellenecek
        }
      }

      commitSlots((s) => {
        const cur = s[key];
        const yeni = {
          courseCode: course.code || '',
          courseName: course.name || '',
          instructor: course.professor || '',
          classroom,
          courseId: course.id,
          sinif: course.sinif || 0,
        };
        if (cur && cur.courseCode) {
          s[key] = { ...cur, ikinci: yeni }; // bölme
        } else {
          s[key] = yeni;
        }
      });
      setShowAddModal(false);
      setModalCourseId('');
      setModalClassroom('');
      setAddSlotWarnings([]);
    },
    [
      selectedSlot,
      modalCourseId,
      modalClassroom,
      scheduleData,
      courses,
      commitSlots,
      deptAllYearsSlots,
      allFacultySlots,
      year,
      isProfessor,
      currentUser,
    ]
  );

  // Slot sil — birinci ders silinince ikinci varsa o birinciye TERFİ eder,
  // yoksa hücre tamamen boşalır.
  const handleRemoveSlot = useCallback(
    (key) => {
      commitSlots((s) => {
        if (s[key] && s[key].ikinci) {
          s[key] = { ...s[key].ikinci };
        } else {
          delete s[key];
        }
      });
    },
    [commitSlots]
  );

  // Bölünmüş hücrenin İKİNCİ dersini kaldır (birinci kalır)
  const handleRemoveSecond = useCallback(
    (key) => {
      commitSlots((s) => {
        if (s[key] && s[key].ikinci) {
          const { ikinci, ...rest } = s[key];
          void ikinci;
          s[key] = rest;
        }
      });
    },
    [commitSlots]
  );

  // Tüm ders programlarını TEK bir koleksiyon okumasıyla yükle
  // (önceki N+1 okuma: bölüm×4 + diğer bölümler×4 ayrı istek yerine 1 istek).
  // Aktif bölüm = deptAllYearsSlots, diğer bölümler = allFacultySlots.
  const loadAllSchedules = useCallback(async () => {
    if (!activeDepartment) {
      setDeptAllYearsSlots([]);
      setAllFacultySlots([]);
      return { deptYears: [], faculty: [] };
    }
    setLoadingFaculty(true);
    try {
      const [allDocs, depts] = await Promise.all([
        window.apiRead('course_schedules'),
        window.apiRead('departments'),
      ]);
      // Bölüm adı haritası — bölüm TÜM kimlik varyantlarıyla (id, _id, _docId,
      // code) anahtarlanır ki şablon belgesindeki departmentId hangi biçimde
      // olursa olsun ada çözülsün (aksi halde ham "7gwPii..." id'si basılıyordu).
      const deptNameMap = {};
      const validDeptIds = new Set();
      const allDeptSources = Array.isArray(depts) ? depts : [];
      (window.DEPARTMENTS || []).forEach((d) => allDeptSources.push(d));
      allDeptSources.forEach((d) => {
        const nm = d && d.name;
        if (!nm) return;
        [d.id, d._id, d._docId, d.code].forEach((k) => {
          if (k) {
            deptNameMap[String(k)] = nm;
            validDeptIds.add(String(k));
          }
        });
      });
      const deptYears = [];
      const faculty = [];
      const orphans = [];
      (allDocs || []).forEach((d) => {
        const parts = String(d.id || '').split('_');
        const deptId = d.departmentId || parts[0] || '';
        const sem = d.semester || parts[1] || '';
        const yr = String(d.year || parts[2] || '');
        // docId: dept_sem_year (lisans) veya dept_sem_year_seviye (lisansüstü)
        const docSeviye = d.seviye || (parts.length >= 4 ? parts[3] : 'lisans');
        const slots = d.slots || {};
        if (sem !== semester || !slots || Object.keys(slots).length === 0) return;
        // Yalnız bu modülün seviyesindeki programlar (çakışma kendi seviyesi içinde)
        if ((docSeviye || 'lisans') !== seviye) return;
        if (deptId === activeDepartment) {
          deptYears.push({ year: yr, slots });
        } else if (validDeptIds.has(String(deptId))) {
          // Yalnız CANLI bir bölüme çözülebilen kayıtları fakülte programına ekle.
          faculty.push({ deptId, deptName: deptNameMap[String(deptId)], year: yr, slots });
        } else {
          // Yetim/eski kayıt: hiçbir canlı bölüme bağlanamıyor. Fakülte
          // programına eklenmez (aksi halde "BIL421Bölüm" gibi hayalet dersler
          // ve boş bölümde ders görünürdü). Temizlik için konsola raporla.
          orphans.push({ docId: d.id, deptId, codes: Object.keys(slots).length });
        }
      });
      if (orphans.length) {
        console.warn(
          '[ders-programi] Fakülte programına eklenmeyen yetim kayıtlar ' +
            '(hiçbir bölüme bağlanamıyor):',
          orphans
        );
      }
      setDeptAllYearsSlots(deptYears);
      setAllFacultySlots(faculty);
      return { deptYears, faculty };
    } catch (e) {
      console.error('Programlar yüklenirken hata:', e);
      return { deptYears: [], faculty: [] };
    } finally {
      setLoadingFaculty(false);
    }
  }, [activeDepartment, semester]);

  // Yalnızca bölüm/dönem değişince yeniden yükle (scheduleData YOK → döngü
  // ve her düzenlemede N+1 yeniden okuma sorunu giderildi).
  useEffect(() => {
    loadAllSchedules();
  }, [activeDepartment, semester]);

  // Çakışma tespiti — kalıcı veriye ek olarak DÜZENLENEN sınıfın canlı
  // scheduleData'sı yansıtılır (yeniden ağ okuması yapmadan).
  useEffect(() => {
    const merged = deptAllYearsSlots.filter((s) => String(s.year) !== String(year));
    merged.push({ year: String(year), slots: scheduleData });
    const c = detectConflicts(merged, allFacultySlots);
    setConflicts(c);
  }, [deptAllYearsSlots, allFacultySlots, scheduleData, year]);

  // Seçili döneme ait tüm dersler — akademisyen sadece kendi derslerini görebilir
  const yearCourses = useMemo(() => {
    let filtered = courses.filter((c) => c.donem === semester);
    if (isProfessor && currentUser?.name) {
      filtered = filtered.filter((c) => c.professor === currentUser.name);
    }
    // Sınıfa göre sırala, sonra ders koduna göre
    filtered.sort((a, b) => {
      if ((a.sinif || 0) !== (b.sinif || 0)) return (a.sinif || 0) - (b.sinif || 0);
      return (a.code || '').localeCompare(b.code || '');
    });
    return filtered;
  }, [courses, semester, isProfessor, currentUser]);

  // Renk ataması
  const courseColors = useMemo(() => {
    const map = {};
    let idx = 0;
    const addCode = (code) => {
      if (code && !map[code]) {
        map[code] = SLOT_COLORS[idx % SLOT_COLORS.length];
        idx++;
      }
    };
    Object.values(scheduleData).forEach((slot) => {
      addCode(slot?.courseCode);
      addCode(slot?.ikinci?.courseCode); // bölünmüş hücrenin ikinci dersi
    });
    return map;
  }, [scheduleData]);

  // İstatistikler
  const stats = useMemo(() => {
    const slotCount = Object.keys(scheduleData).length;
    const uniqueCourses = new Set(Object.values(scheduleData).map((s) => s.courseCode)).size;
    const uniqueProfs = new Set(
      Object.values(scheduleData)
        .map((s) => s.instructor)
        .filter(Boolean)
    ).size;
    return { slotCount, uniqueCourses, uniqueProfs };
  }, [scheduleData]);

  // Bugünün günü (sütun vurgulama)
  const todayName = useMemo(() => {
    const dayMap = { 1: 'Pazartesi', 2: 'Salı', 3: 'Çarşamba', 4: 'Perşembe', 5: 'Cuma' };
    return dayMap[new Date().getDay()] || '';
  }, []);

  // Renk efsanesi
  const courseColorList = useMemo(() => {
    return Object.entries(courseColors).map(([code, color]) => {
      const slot = Object.values(scheduleData).find((s) => s.courseCode === code);
      return { code, color, name: slot?.courseName || code };
    });
  }, [courseColors, scheduleData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: '3px solid #E5E1D8',
              borderTopColor: DP.primary,
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: '#666', fontSize: 14 }}>Ders programı yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Edit mode banner */}
      {editMode && (
        <div
          style={{
            background: 'linear-gradient(135deg, #059669, #10B981)',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white' }}>
            <DPIcon
              path="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
              size={16}
              color="white"
            />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Düzenleme Modu</span>
            <span style={{ fontSize: 12, opacity: 0.85 }}>
              —{' '}
              {responsive.isMobile
                ? 'Boş hücreye tıklayarak ders ekleyin'
                : 'Soldaki dersleri tabloya sürükleyip bırakın'}
              , X ile silin
            </span>
          </div>
          <button
            onClick={() => setEditMode(false)}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Kapat
          </button>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DPIcon
              path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              size={20}
              color="white"
            />
          </div>
          <div>
            <h1
              style={{
                fontSize: responsive.val(18, 22, 26),
                fontWeight: 700,
                color: DP.navy,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Ders Programı
            </h1>
            <p style={{ fontSize: 12, color: DP.textMuted, margin: 0 }}>
              {departmentInfo?.name || 'Bölüm'} — {semester === 'guz' ? 'Güz' : 'Bahar'} — {year}.
              Sınıf
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {conflicts.length > 0 && (
            <button
              onClick={() => setShowConflicts(!showConflicts)}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #FCA5A5',
                background: '#FEF2F2',
                color: '#DC2626',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <DPIcon
                path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                size={13}
                color="#DC2626"
              />
              {conflicts.length} Çakışma
            </button>
          )}
          <button
            onClick={async () => {
              const { deptYears, faculty } = await loadAllSchedules();
              const ownDeptSlots = (deptYears || []).map((s) => ({
                deptId: activeDepartment,
                deptName: departmentInfo?.name || 'Bölüm',
                year: s.year,
                slots: s.slots,
              }));
              const combined = [...ownDeptSlots, ...(faculty || [])];
              if (combined.length > 0) {
                setAllSchedules(combined);
                setShowFacultyView(true);
              } else {
                alert('Fakülte genelinde bu dönem için ders programı bulunamadı.');
              }
            }}
            disabled={loadingFaculty}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid #C4B5FD',
              background: '#EDE9FE',
              color: DP.primary,
              fontSize: 12,
              fontWeight: 600,
              cursor: loadingFaculty ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              opacity: loadingFaculty ? 0.6 : 1,
            }}
          >
            <DPIcon
              path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              size={13}
              color={DP.primary}
            />
            {loadingFaculty ? 'Yükleniyor...' : 'Fakülte Programı'}
          </button>
          {(isAdmin || isDeptManager) && deptAllYearsSlots.length > 0 && (
            <button
              onClick={() =>
                exportDeptSchedule(deptAllYearsSlots, departmentInfo?.name || 'Bölüm', semester)
              }
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #6EE7B7',
                background: '#ECFDF5',
                color: '#059669',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <DPIcon
                path="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                size={13}
                color="#059669"
              />
              Bölüm Çıktısı
            </button>
          )}
          {canManage && activeDepartment && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                background: 'white',
                color: DP.textMuted,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <DPIcon
                path="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                size={13}
              />
              Düzenle
            </button>
          )}
        </div>
      </div>

      {/* Controls strip: Semester + Year + Stats */}
      <div
        style={{
          background: 'white',
          borderRadius: 10,
          border: '1px solid #E5E7EB',
          padding: responsive.val(10, 12, 14),
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: responsive.val(10, 16, 20),
          alignItems: 'center',
        }}
      >
        {/* Semester toggle */}
        <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 2 }}>
          {[
            { id: 'guz', label: 'Güz' },
            { id: 'bahar', label: 'Bahar' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSemester(s.id)}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: semester === s.id ? DP.primary : 'transparent',
                color: semester === s.id ? 'white' : DP.textMuted,
                boxShadow: semester === s.id ? '0 1px 3px rgba(124,58,237,0.3)' : 'none',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Year pills */}
        <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 2 }}>
          {['1', '2', '3', '4'].map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: year === y ? DP.navy : 'transparent',
                color: year === y ? 'white' : DP.textMuted,
                boxShadow: year === y ? '0 1px 3px rgba(27,42,74,0.3)' : 'none',
              }}
            >
              {y}. Sınıf
            </button>
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 24,
            background: '#E5E7EB',
            display: responsive.val('none', 'block', 'block'),
          }}
        />

        {/* Inline stats */}
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: DP.textMuted }}>
          <span>
            <strong style={{ color: DP.primary, fontSize: 15 }}>{stats.slotCount}</strong> saat
          </span>
          <span>
            <strong style={{ color: '#3B82F6', fontSize: 15 }}>{stats.uniqueCourses}</strong> ders
          </span>
          <span>
            <strong style={{ color: '#059669', fontSize: 15 }}>{stats.uniqueProfs}</strong> hoca
          </span>
        </div>

        {courses.length > 0 && (
          <div style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>
            Havuz: {courses.length} ders, {professors.length} hoca, {classrooms.length} derslik
          </div>
        )}
      </div>

      {/* Professor bilgilendirme */}
      {isProfessor && editMode && (
        <div
          style={{
            background: '#DBEAFE',
            border: '1px solid #93C5FD',
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            fontSize: 12,
            color: '#1E40AF',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <DPIcon
            path="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            size={16}
            color="#1E40AF"
          />
          Akademisyen olarak sadece kendi derslerinizi programa ekleyebilirsiniz.
        </div>
      )}

      {!activeDepartment && (
        <div
          style={{
            background: '#EDE9FE',
            border: '1px solid #C4B5FD',
            borderRadius: 10,
            padding: 16,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <DPIcon
            path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            size={20}
            color={DP.primary}
          />
          <div style={{ fontSize: 13, color: '#5B21B6' }}>
            Lütfen bir bölüm seçin. Ders programı bölüm bazlı çalışmaktadır.
          </div>
        </div>
      )}

      {activeDepartment && courses.length === 0 && (
        <div
          style={{
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: 10,
            padding: 16,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <DPIcon
            path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            size={20}
            color="#F59E0B"
          />
          <div style={{ fontSize: 13, color: '#92400E' }}>
            Bu bölüm için henüz ders tanımlanmamış. Önce <strong>Sınav Otomasyonu</strong>{' '}
            modülünden ders ve akademisyen ekleyin.
          </div>
        </div>
      )}

      {/* Schedule Grid + Sürüklenebilir Ders Havuzu */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {editMode && !responsive.isMobile && (
          <div
            style={{
              width: 220,
              flexShrink: 0,
              background: 'white',
              borderRadius: 12,
              border: '1px solid #E5E7EB',
              padding: 12,
              maxHeight: 620,
              overflowY: 'auto',
              position: 'sticky',
              top: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: DP.navy, marginBottom: 4 }}>
              Dersler
            </div>
            <div style={{ fontSize: 10, color: DP.textMuted, marginBottom: 10 }}>
              Tabloya sürükleyip bırakın
            </div>
            {yearCourses.length === 0 ? (
              <div
                style={{
                  fontSize: 11,
                  color: DP.textMuted,
                  padding: '12px 0',
                  textAlign: 'center',
                }}
              >
                Bu dönem için ders yok.
              </div>
            ) : (
              (() => {
                const groups = {};
                yearCourses.forEach((c) => {
                  const k = c.sinif || 0;
                  (groups[k] = groups[k] || []).push(c);
                });
                return Object.keys(groups)
                  .sort((a, b) => a - b)
                  .map((sinif) => {
                    const gc = GRADE_COLORS[sinif] || GRADE_COLORS[1];
                    return (
                      <div key={sinif} style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: gc.text,
                            background: gc.bg,
                            padding: '3px 8px',
                            borderRadius: 5,
                            marginBottom: 6,
                            display: 'inline-block',
                          }}
                        >
                          {sinif === '5' || sinif === 5 ? 'Seçmeli' : `${sinif}. Sınıf`}
                        </div>
                        {groups[sinif].map((c) => (
                          <CourseChip
                            key={c.id}
                            course={c}
                            color={courseColors[c.code] || gc.text}
                          />
                        ))}
                      </div>
                    );
                  });
              })()
            )}
          </div>
        )}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: 'white',
            borderRadius: 12,
            border: '1px solid #E5E7EB',
            overflow: 'auto',
          }}
        >
          {responsive.isMobile ? (
            // Mobile: Card-based view
            <div style={{ padding: 12 }}>
              {DAYS.map((day) => {
                const daySlots = HOURS.map((hour, hi) => {
                  const key = `${day}_${hi}`;
                  return scheduleData[key]
                    ? { ...scheduleData[key], hour, hourIndex: hi, key }
                    : null;
                }).filter(Boolean);

                if (daySlots.length === 0 && !editMode) return null;
                const isToday = day === todayName;

                return (
                  <div key={day} style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: isToday ? DP.primary : DP.navy,
                        padding: '8px 0',
                        borderBottom: `2px solid ${isToday ? DP.primary : '#E5E7EB'}`,
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {day}
                      {isToday && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            background: DP.primaryPale,
                            color: DP.primary,
                            padding: '2px 8px',
                            borderRadius: 10,
                          }}
                        >
                          Bugün
                        </span>
                      )}
                    </div>
                    {daySlots.map((slot, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '10px 12px',
                          marginBottom: 6,
                          borderRadius: 10,
                          background: `${courseColors[slot.courseCode] || '#6B7280'}10`,
                          borderLeft: `4px solid ${courseColors[slot.courseCode] || '#6B7280'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 2,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: 'white',
                                background: courseColors[slot.courseCode] || '#6B7280',
                                padding: '1px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {slot.hour}
                            </span>
                            {slot.classroom && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: DP.primary,
                                  background: DP.primaryPale,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                {slot.classroom}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: DP.text }}>
                            {slot.courseCode} — {slot.courseName}
                          </div>
                          {slot.instructor && (
                            <div style={{ fontSize: 11, color: DP.textMuted, marginTop: 1 }}>
                              {slot.instructor}
                            </div>
                          )}
                          {slot.ikinci && (
                            <div
                              style={{
                                marginTop: 4,
                                paddingTop: 4,
                                borderTop: '1px dashed #E5E7EB',
                              }}
                            >
                              <div style={{ fontSize: 13, fontWeight: 600, color: DP.text }}>
                                {slot.ikinci.courseCode} — {slot.ikinci.courseName}
                              </div>
                              {slot.ikinci.instructor && (
                                <div style={{ fontSize: 11, color: DP.textMuted, marginTop: 1 }}>
                                  {slot.ikinci.instructor}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {editMode && (
                          <button
                            onClick={() => handleRemoveSlot(slot.key)}
                            style={{
                              background: '#FEF2F2',
                              border: '1px solid #FECACA',
                              borderRadius: 6,
                              cursor: 'pointer',
                              padding: '4px 6px',
                              marginLeft: 8,
                            }}
                          >
                            <DPIcon path="M18 6L6 18M6 6l12 12" size={14} color="#EF4444" />
                          </button>
                        )}
                      </div>
                    ))}
                    {editMode && (
                      <button
                        onClick={() => {
                          setSelectedSlot({ day, hourIndex: 0, hour: HOURS[0] });
                          setAddSlotWarnings([]);
                          setShowAddModal(true);
                        }}
                        style={{
                          width: '100%',
                          padding: 10,
                          border: '2px dashed #C4B5FD',
                          borderRadius: 10,
                          background: DP.primaryPale + '60',
                          cursor: 'pointer',
                          fontSize: 12,
                          color: DP.primary,
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          marginTop: 4,
                        }}
                      >
                        <DPIcon path="M12 5v14M5 12h14" size={14} color={DP.primary} /> Ders Ekle
                      </button>
                    )}
                  </div>
                );
              })}
              {Object.keys(scheduleData).length === 0 && !editMode && (
                <div style={{ textAlign: 'center', padding: 48, color: DP.textMuted }}>
                  <DPIcon
                    path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    size={48}
                    color="#D1D5DB"
                  />
                  <p style={{ marginTop: 12, fontSize: 14, fontWeight: 500 }}>
                    Bu dönem için ders programı henüz oluşturulmamış.
                  </p>
                  {canManage && (
                    <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                      Düzenle butonuna tıklayarak program oluşturmaya başlayın.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Desktop: Table grid
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  <th
                    style={{
                      padding: '10px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'white',
                      textAlign: 'center',
                      background: DP.navy,
                      borderBottom: '2px solid #E5E7EB',
                      width: 85,
                    }}
                  >
                    Saat
                  </th>
                  {DAYS.map((day) => {
                    const isToday = day === todayName;
                    return (
                      <th
                        key={day}
                        style={{
                          padding: '10px 8px',
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'white',
                          textAlign: 'center',
                          background: isToday ? DP.primary : DP.navy,
                          borderBottom: '2px solid #E5E7EB',
                          position: 'relative',
                        }}
                      >
                        {day}
                        {isToday && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: '20%',
                              right: '20%',
                              height: 3,
                              background: '#F59E0B',
                              borderRadius: '3px 3px 0 0',
                            }}
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour, hi) => (
                  <tr key={hi}>
                    <td
                      style={{
                        padding: '6px 6px',
                        fontSize: 10,
                        fontWeight: 600,
                        color: DP.textMuted,
                        textAlign: 'center',
                        borderBottom: '1px solid #F3F4F6',
                        background: '#FAFAFA',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {hour}
                    </td>
                    {DAYS.map((day) => {
                      const key = `${day}_${hi}`;
                      const slot = scheduleData[key];
                      const isToday = day === todayName;
                      // Boş hücreye ya da BİRİNCİSİ dolu-İKİNCİSİ boş hücreye
                      // (bölme için) ders bırakılabilir.
                      const canDrop = editMode && (!slot || !slot.ikinci);
                      return (
                        <td
                          key={day}
                          onDragOver={
                            canDrop
                              ? (e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'copy';
                                }
                              : undefined
                          }
                          onDragEnter={
                            canDrop
                              ? (e) => {
                                  e.currentTarget.style.outline = '2px dashed #7C3AED';
                                }
                              : undefined
                          }
                          onDragLeave={
                            canDrop
                              ? (e) => {
                                  e.currentTarget.style.outline = 'none';
                                }
                              : undefined
                          }
                          onDrop={
                            canDrop
                              ? (e) => {
                                  e.preventDefault();
                                  e.currentTarget.style.outline = 'none';
                                  try {
                                    const c = JSON.parse(
                                      e.dataTransfer.getData('application/json')
                                    );
                                    handleDropCourse(c, day, hi);
                                  } catch (err) {
                                    console.error('Bırakma hatası:', err);
                                  }
                                }
                              : undefined
                          }
                          style={{
                            padding: 3,
                            borderBottom: '1px solid #F3F4F6',
                            background:
                              editMode && !slot
                                ? isToday
                                  ? '#EDE9FE'
                                  : '#F5F3FF'
                                : isToday
                                  ? '#FAFAFE'
                                  : hi % 2 === 0
                                    ? 'transparent'
                                    : '#FCFCFD',
                            transition: 'background 0.15s',
                            borderLeft: isToday ? '1px solid #EDE9FE' : 'none',
                            borderRight: isToday ? '1px solid #EDE9FE' : 'none',
                          }}
                        >
                          {slot ? (
                            <div
                              style={{
                                padding: '5px 7px',
                                borderRadius: 6,
                                background: `${courseColors[slot.courseCode] || '#6B7280'}12`,
                                borderLeft: `3px solid ${courseColors[slot.courseCode] || '#6B7280'}`,
                                minHeight: 44,
                                position: 'relative',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: courseColors[slot.courseCode] || DP.text,
                                  letterSpacing: 0.3,
                                }}
                              >
                                {slot.courseCode}
                              </div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: DP.text,
                                  lineHeight: 1.3,
                                  marginTop: 1,
                                }}
                              >
                                {slot.courseName}
                              </div>
                              {slot.instructor && (
                                <div style={{ fontSize: 9, color: DP.textMuted, marginTop: 2 }}>
                                  {slot.instructor}
                                </div>
                              )}
                              {editMode ? (
                                <select
                                  value={slot.classroom || ''}
                                  onChange={(e) => handleSlotClassroom(key, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    marginTop: 3,
                                    width: '100%',
                                    fontSize: 9,
                                    padding: '2px 4px',
                                    borderRadius: 4,
                                    border: '1px solid #E5E7EB',
                                    outline: 'none',
                                    background: 'white',
                                    color: DP.primary,
                                    fontWeight: 600,
                                  }}
                                >
                                  <option value="">Derslik seç...</option>
                                  {classrooms.map((r) => (
                                    <option key={r.id} value={r.name}>
                                      {r.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                slot.classroom && (
                                  <div
                                    style={{
                                      fontSize: 9,
                                      color: DP.primary,
                                      fontWeight: 600,
                                      marginTop: 1,
                                    }}
                                  >
                                    {slot.classroom}
                                  </div>
                                )
                              )}
                              {editMode && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveSlot(key);
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: 2,
                                    right: 2,
                                    background: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    padding: '1px 3px',
                                    opacity: 0.8,
                                  }}
                                >
                                  <DPIcon path="M18 6L6 18M6 6l12 12" size={10} color="#EF4444" />
                                </button>
                              )}
                              {/* İKİNCİ DERS (bölünmüş hücre) */}
                              {slot.ikinci && (
                                <div
                                  style={{
                                    marginTop: 5,
                                    paddingTop: 5,
                                    borderTop: '1px dashed #D1D5DB',
                                    position: 'relative',
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: courseColors[slot.ikinci.courseCode] || DP.text,
                                      letterSpacing: 0.3,
                                    }}
                                  >
                                    {slot.ikinci.courseCode}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: DP.text,
                                      lineHeight: 1.3,
                                      marginTop: 1,
                                    }}
                                  >
                                    {slot.ikinci.courseName}
                                  </div>
                                  {slot.ikinci.instructor && (
                                    <div style={{ fontSize: 9, color: DP.textMuted, marginTop: 2 }}>
                                      {slot.ikinci.instructor}
                                    </div>
                                  )}
                                  {editMode && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveSecond(key);
                                      }}
                                      style={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 2,
                                        background: '#FEF2F2',
                                        border: '1px solid #FECACA',
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                        padding: '1px 3px',
                                        opacity: 0.8,
                                      }}
                                    >
                                      <DPIcon
                                        path="M18 6L6 18M6 6l12 12"
                                        size={10}
                                        color="#EF4444"
                                      />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : editMode ? (
                            <div
                              style={{
                                minHeight: 44,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 6,
                                border: '2px dashed #C4B5FD',
                                background: 'rgba(255,255,255,0.5)',
                                transition: 'border-color 0.15s, background 0.15s',
                                pointerEvents: 'none',
                              }}
                            >
                              <DPIcon path="M12 5v14M5 12h14" size={14} color="#C4B5FD" />
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
      </div>

      {/* Color legend */}
      {courseColorList.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 10,
            padding: '8px 12px',
            background: '#F9FAFB',
            borderRadius: 8,
            border: '1px solid #F3F4F6',
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: '#9CA3AF',
              fontWeight: 600,
              marginRight: 4,
              lineHeight: '20px',
            }}
          >
            DERSLER:
          </span>
          {courseColorList.map((c) => (
            <span
              key={c.code}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                color: DP.text,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: c.color,
                  display: 'inline-block',
                }}
              />
              {c.code}
            </span>
          ))}
        </div>
      )}

      {/* Add Slot Modal */}
      {showAddModal && selectedSlot && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15,23,42,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 20,
              width: '100%',
              maxWidth: 520,
              boxShadow: '0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px 16px',
                background: `linear-gradient(135deg, ${DP.primary}, #6D28D9)`,
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DPIcon
                    path="M12 6v6l4 2M12 2a10 10 0 100 20 10 10 0 000-20z"
                    size={20}
                    color="white"
                  />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: 'white',
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    Ders Programına Ekle
                  </h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '3px 0 0' }}>
                    {selectedSlot.day} &middot; {selectedSlot.hour}
                  </p>
                </div>
              </div>
              {/* Close button */}
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddSlotWarnings([]);
                }}
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: 'none',
                  background: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  lineHeight: 1,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: responsive.val(16, 20, 24) }}>
              {/* Saat seçimi (mobilde) */}
              {responsive.isMobile && (
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      color: DP.text,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <DPIcon
                        path="M12 6v6l4 2M12 2a10 10 0 100 20 10 10 0 000-20z"
                        size={14}
                        color={DP.primary}
                      />
                      Saat
                    </span>
                  </label>
                  <select
                    value={selectedSlot.hourIndex}
                    onChange={(e) =>
                      setSelectedSlot({
                        ...selectedSlot,
                        hourIndex: parseInt(e.target.value),
                        hour: HOURS[parseInt(e.target.value)],
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: `1.5px solid ${DP.border}`,
                      fontSize: 13,
                      outline: 'none',
                      background: 'white',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = DP.primary)}
                    onBlur={(e) => (e.target.style.borderColor = DP.border)}
                  >
                    {HOURS.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ders seçimi */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: DP.text,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <DPIcon
                      path="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      size={14}
                      color={DP.primary}
                    />
                    Ders Seçimi
                  </span>
                  <span style={{ fontWeight: 400, color: '#9CA3AF', fontSize: 11, marginLeft: 6 }}>
                    ({yearCourses.length} ders)
                  </span>
                </label>
                {yearCourses.length > 0 ? (
                  <select
                    value={modalCourseId}
                    onChange={(e) => setModalCourseId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: `1.5px solid ${modalCourseId ? DP.primary : DP.border}`,
                      fontSize: 13,
                      outline: 'none',
                      background: 'white',
                      transition: 'border-color 0.2s',
                      boxShadow: modalCourseId ? `0 0 0 3px ${DP.primary}15` : 'none',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = DP.primary;
                      e.target.style.boxShadow = `0 0 0 3px ${DP.primary}15`;
                    }}
                    onBlur={(e) => {
                      if (!modalCourseId) {
                        e.target.style.borderColor = DP.border;
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <option value="">Ders seçin...</option>
                    {(() => {
                      let lastSinif = null;
                      const options = [];
                      yearCourses.forEach((c) => {
                        if (c.sinif !== lastSinif) {
                          lastSinif = c.sinif;
                          options.push(
                            <optgroup
                              key={`g-${c.sinif}`}
                              label={c.sinif === 5 ? 'Seçmeli Dersler' : `${c.sinif}. Sınıf`}
                            />
                          );
                        }
                        options.push(
                          <option key={c.id} value={c.id}>
                            {c.code} - {c.name} {c.professor ? `(${c.professor})` : ''}
                          </option>
                        );
                      });
                      return options;
                    })()}
                  </select>
                ) : (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid #FCD34D',
                      background: '#FFFBEB',
                      fontSize: 12,
                      color: '#92400E',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <DPIcon
                      path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                      size={16}
                      color="#D97706"
                    />
                    Bu dönem için ders bulunamadı. Ders Yönetimi'nden ders ekleyin.
                  </div>
                )}
              </div>

              {/* Derslik seçimi */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: DP.text,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <DPIcon
                      path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      size={14}
                      color={DP.primary}
                    />
                    Derslik
                  </span>
                  <span style={{ fontWeight: 400, color: '#9CA3AF', fontSize: 11, marginLeft: 6 }}>
                    (opsiyonel)
                  </span>
                </label>
                {classrooms.length > 0 ? (
                  <select
                    value={modalClassroom}
                    onChange={(e) => setModalClassroom(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: `1.5px solid ${DP.border}`,
                      fontSize: 13,
                      outline: 'none',
                      background: 'white',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = DP.primary)}
                    onBlur={(e) => (e.target.style.borderColor = DP.border)}
                  >
                    <option value="">Derslik seçin...</option>
                    {classrooms.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name} ({r.capacity} kişi)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={modalClassroom}
                    onChange={(e) => setModalClassroom(e.target.value)}
                    placeholder="Derslik adı (ör: D-201)"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: `1.5px solid ${DP.border}`,
                      fontSize: 13,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = DP.primary)}
                    onBlur={(e) => (e.target.style.borderColor = DP.border)}
                  />
                )}
              </div>

              {/* Seçili ders önizleme */}
              {modalCourseId &&
                (() => {
                  const c = courses.find((x) => x.id === modalCourseId);
                  if (!c) return null;
                  return (
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${DP.primaryPale}, #F5F3FF)`,
                        border: `1px solid ${DP.primaryLight}30`,
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}
                      >
                        <div
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: DP.primary,
                            color: 'white',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {c.code}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: DP.text }}>
                          {c.name}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 12,
                          fontSize: 12,
                          color: DP.textMuted,
                        }}
                      >
                        {c.professor && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <DPIcon
                              path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              size={12}
                              color={DP.textMuted}
                            />
                            {c.professor}
                          </span>
                        )}
                        {c.sinif && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <DPIcon
                              path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"
                              size={12}
                              color={DP.textMuted}
                            />
                            {c.sinif === 5 ? 'Seçmeli' : c.sinif + '. Sınıf'}
                          </span>
                        )}
                        {c.studentCount > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <DPIcon
                              path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                              size={12}
                              color={DP.textMuted}
                            />
                            {c.studentCount} kişi
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

              {/* Çakışma uyarıları */}
              {addSlotWarnings.length > 0 && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#991B1B',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <DPIcon
                      path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                      size={16}
                      color="#DC2626"
                    />
                    Çakışma Tespit Edildi
                  </div>
                  {addSlotWarnings.map((w, i) => (
                    <div
                      key={i}
                      style={{ fontSize: 12, color: '#7F1D1D', marginBottom: 3, paddingLeft: 22 }}
                    >
                      • {w}
                    </div>
                  ))}
                  <div
                    style={{
                      fontSize: 11,
                      color: '#991B1B',
                      marginTop: 8,
                      fontStyle: 'italic',
                      paddingLeft: 22,
                    }}
                  >
                    {isAdmin
                      ? 'Fakülte yöneticisi olarak çakışmayı geçersiz kılabilirsiniz.'
                      : 'Lütfen farklı bir saat veya derslik seçin.'}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px 18px',
                borderTop: `1px solid ${DP.border}`,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                background: '#FAFAFA',
              }}
            >
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddSlotWarnings([]);
                }}
                style={{
                  padding: '10px 22px',
                  borderRadius: 10,
                  border: `1.5px solid ${DP.border}`,
                  background: 'white',
                  color: DP.textMuted,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                İptal
              </button>
              {addSlotWarnings.length > 0 ? (
                isAdmin ? (
                  <button
                    onClick={() => handleAddSlot(true)}
                    style={{
                      padding: '10px 22px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#DC2626',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.boxShadow = '0 4px 12px rgba(220,38,38,0.4)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.boxShadow = '0 2px 8px rgba(220,38,38,0.3)')
                    }
                  >
                    Çakışmayı Geçersiz Kıl
                  </button>
                ) : null
              ) : (
                <button
                  onClick={() => handleAddSlot(false)}
                  disabled={!modalCourseId}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 10,
                    border: 'none',
                    background: modalCourseId
                      ? `linear-gradient(135deg, ${DP.primary}, #6D28D9)`
                      : '#D1D5DB',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: modalCourseId ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                    boxShadow: modalCourseId ? `0 2px 8px ${DP.primary}40` : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (modalCourseId)
                      e.currentTarget.style.boxShadow = `0 4px 14px ${DP.primary}50`;
                  }}
                  onMouseLeave={(e) => {
                    if (modalCourseId)
                      e.currentTarget.style.boxShadow = `0 2px 8px ${DP.primary}40`;
                  }}
                >
                  Programa Ekle
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Çakışma Paneli */}
      {showConflicts && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowConflicts(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 560,
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, color: DP.navy, margin: 0 }}>
                Çakışma Kontrolü
              </h3>
              <button
                onClick={() => setShowConflicts(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <DPIcon path="M18 6L6 18M6 6l12 12" size={18} color="#9CA3AF" />
              </button>
            </div>

            {conflicts.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: 32,
                  color: DP.green,
                }}
              >
                <DPIcon
                  path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  size={48}
                  color={DP.green}
                />
                <p style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>Çakışma bulunamadı!</p>
                <p style={{ fontSize: 12, color: DP.textMuted, marginTop: 4 }}>
                  Tüm derslikler ve saatler uyumlu görünüyor.
                </p>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                    fontSize: 13,
                    color: '#991B1B',
                  }}
                >
                  <strong>{conflicts.length}</strong> adet çakışma tespit edildi.
                </div>
                {conflicts.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 12,
                      marginBottom: 8,
                      borderRadius: 8,
                      border: '1px solid ' + (c.type === 'cross_dept' ? '#FDE68A' : '#FECACA'),
                      background: c.type === 'cross_dept' ? '#FFFBEB' : '#FFF5F5',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <DPIcon
                        path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                        size={14}
                        color={c.type === 'cross_dept' ? '#D97706' : '#DC2626'}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          color: c.type === 'cross_dept' ? '#D97706' : '#DC2626',
                        }}
                      >
                        {c.type === 'cross_dept'
                          ? 'Fakülte Çakışması'
                          : c.type === 'dept_professor'
                            ? 'Hoca Çakışması'
                            : 'Derslik Çakışması'}
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
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowFacultyView(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 1100,
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: DP.navy, margin: 0 }}>
                  Fakülte Birleşik Ders Programı
                </h3>
                <p style={{ fontSize: 12, color: DP.textMuted, marginTop: 4 }}>
                  {semester === 'guz' ? 'Güz' : 'Bahar'} Dönemi — Tüm Sınıflar —{' '}
                  {[...new Set(allSchedules.map((s) => s.deptName))].length} bölüm
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => exportFacultySchedule(allSchedules, semester)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: DP.primary,
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <DPIcon
                    path="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    size={14}
                    color="white"
                  />
                  Yazdır / PDF
                </button>
                <button
                  onClick={() => setShowFacultyView(false)}
                  style={{
                    background: 'none',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  <DPIcon path="M18 6L6 18M6 6l12 12" size={14} color="#9CA3AF" />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              {[...new Set(allSchedules.map((s) => s.deptName))].map((name, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: '#F3F4F6',
                    color: DP.text,
                    fontWeight: 500,
                  }}
                >
                  {name}
                </span>
              ))}
            </div>

            {/* Combined Grid */}
            <div style={{ overflow: 'auto' }}>
              <table
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 800 }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: '10px 6px',
                        background: DP.navy,
                        color: 'white',
                        fontWeight: 700,
                        textAlign: 'center',
                        border: '1px solid #334155',
                        width: 80,
                      }}
                    >
                      Saat
                    </th>
                    {DAYS.map((day) => (
                      <th
                        key={day}
                        style={{
                          padding: '10px 6px',
                          background: DP.navy,
                          color: 'white',
                          fontWeight: 700,
                          textAlign: 'center',
                          border: '1px solid #334155',
                        }}
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map((hour, hi) => {
                    // Check if this hour has any slots
                    let hasAny = false;
                    DAYS.forEach((day) => {
                      allSchedules.forEach((s) => {
                        if (s.slots[`${day}_${hi}`]) hasAny = true;
                      });
                    });
                    if (!hasAny) return null;

                    return (
                      <tr key={hi}>
                        <td
                          style={{
                            padding: '6px',
                            fontWeight: 600,
                            textAlign: 'center',
                            background: '#F9FAFB',
                            border: '1px solid #E5E7EB',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {hour}
                        </td>
                        {DAYS.map((day) => {
                          const entries = allSchedules
                            .filter((s) => s.slots[`${day}_${hi}`])
                            .map((s) => ({
                              deptName: s.deptName,
                              year: s.year,
                              ...s.slots[`${day}_${hi}`],
                            }));
                          return (
                            <td
                              key={day}
                              style={{
                                padding: 2,
                                border: '1px solid #E5E7EB',
                                verticalAlign: 'top',
                              }}
                            >
                              {entries.map((e, ei) => {
                                const bg = GRADE_COLORS[e.sinif]?.bg || '#F3F4F6';
                                return (
                                  <div
                                    key={ei}
                                    style={{
                                      padding: '3px 6px',
                                      margin: '2px 0',
                                      borderRadius: 4,
                                      background: bg,
                                      fontSize: 10,
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    <strong>{e.courseCode}</strong>
                                    <span style={{ color: '#555', marginLeft: 3 }}>
                                      {e.deptName} {e.year}.Sınıf
                                    </span>
                                    {e.instructor && (
                                      <div style={{ color: '#777', fontSize: 9 }}>
                                        {e.instructor}
                                      </div>
                                    )}
                                    {e.classroom && (
                                      <div style={{ color: DP.primary, fontWeight: 500 }}>
                                        {e.classroom}
                                      </div>
                                    )}
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
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#991B1B', marginBottom: 8 }}>
                  ⚠ {conflicts.length} çakışma tespit edildi:
                </div>
                {conflicts.slice(0, 5).map((c, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#7F1D1D', marginBottom: 4 }}>
                    • {c.message}
                  </div>
                ))}
                {conflicts.length > 5 && (
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
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
