// ══════════════════════════════════════════════════════════════
// ÇAKÜ Sınav Programı Otomasyonu - Sürükle-Bırak Takvim
// Drag-and-drop haftalık takvim grid, ders havuzu, tablo görünümü
// Shared bileşenler shared-components.jsx'den window üzerinden gelir
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ── Shared bilesenlerden import (window uzerinden) ──
const C = window.C;
const Card = window.Card;
const Btn = window.Btn;
const Input = window.Input;
const Select = window.Select;
const FormField = window.FormField;
const Modal = window.Modal;
const Badge = window.Badge;

// ── Ghost Button (Btn ghost variant yerine standalone) ──
const GhostBtn = ({ children, onClick, disabled, style: customStyle }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "10px 18px",
        borderRadius: 8,
        border: "1px solid " + (C ? C.border : "#E5E1D8"),
        background: hover ? (C ? C.blueLight : "#DBEAFE") : "transparent",
        color: C ? C.blue : "#3B82F6",
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'Source Sans 3', sans-serif",
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "all 0.2s",
        opacity: disabled ? 0.5 : 1,
        ...customStyle,
      }}
    >
      {children}
    </button>
  );
};

// ── Sabitler ──
const SINIF_COLORS = {
  1: { bg: "#B2EBF2", text: "#006064", label: "1. Sinif" },
  2: { bg: "#C8E6C9", text: "#1B5E20", label: "2. Sinif" },
  3: { bg: "#FFE0B2", text: "#E65100", label: "3. Sinif" },
  4: { bg: "#F8BBD0", text: "#880E4F", label: "4. Sinif" },
};

const TIME_SLOTS = [];
for (let h = 8; h <= 18; h++) {
  for (let m = 0; m < 60; m += 30) {
    if (h === 8 && m === 0) continue; // Start from 08:30
    if (h === 18 && m > 30) continue;
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    TIME_SLOTS.push(`${hh}:${mm}`);
  }
}
// TIME_SLOTS: ["08:30","09:00","09:30",...,"18:00","18:30"]

const EXAM_TYPES = [
  { value: "vize", label: "Vize", weeks: 1 },
  { value: "final", label: "Final", weeks: 2 },
  { value: "but", label: "Butunleme", weeks: 1 },
];

// ── Seed Data: 14 Hoca ──
const SEED_PROFESSORS = [
  { name: "Prof. Dr. Hamit ALYAR", department: "Fizik", isExternal: true },
  { name: "Prof. Dr. Cigdem YUKSEKTEPE ATAOL", department: "Kimya", isExternal: true },
  { name: "Dr. Ogr. Uyesi Celalettin KAYA", department: "Matematik", isExternal: true },
  { name: "Dr. Ogr. Uyesi Esma Baran OZKAN", department: "Matematik", isExternal: true },
  { name: "Dr. Ogr. Uyesi Taha ETEM", department: "Bilgisayar", isExternal: false },
  { name: "Dr. Ogr. Uyesi Seda SAHIN", department: "Bilgisayar", isExternal: false },
  { name: "Dr. Ogr. Uyesi Fatih ISSI", department: "Bilgisayar", isExternal: false },
  { name: "Doc. Dr. Selim BUYRUkoglu", department: "Bilgisayar", isExternal: false },
  { name: "Dr. Mehmet Akif ALPER", department: "Bilgisayar", isExternal: false },
  { name: "Prof. Dr. Ilyas INCI", department: "Matematik", isExternal: true },
  { name: "Dr. Selim SURUCU", department: "Bilgisayar", isExternal: false },
  { name: "Dr. Ugur BINZAT", department: "Istatistik", isExternal: true },
  { name: "Dr. Alime YILMAZ", department: "Yabanci Diller", isExternal: true },
  { name: "Dr. Ogr. Uyesi Osman GULER", department: "Bilgisayar", isExternal: false },
];

// ── Seed Data: 25 Ders ──
const SEED_COURSES = [
  // 1. Sinif
  { code: "FZK181", name: "Fizik I (Sube 1)", sinif: 1, duration: 60, professor: "Prof. Dr. Hamit ALYAR" },
  { code: "FZK181", name: "Fizik I (Sube 2)", sinif: 1, duration: 60, professor: "Prof. Dr. Hamit ALYAR" },
  { code: "MAT165", name: "Matematik I (Sube 1)", sinif: 1, duration: 90, professor: "Dr. Ogr. Uyesi Esma Baran OZKAN" },
  { code: "MAT165", name: "Matematik I (Sube 2)", sinif: 1, duration: 90, professor: "Dr. Ogr. Uyesi Esma Baran OZKAN" },
  { code: "BLM103", name: "Programlamaya Giris", sinif: 1, duration: 60, professor: "Dr. Ogr. Uyesi Taha ETEM" },
  { code: "MAT241", name: "Dogrusal Cebir (Sube 1-2)", sinif: 1, duration: 90, professor: "Dr. Ogr. Uyesi Celalettin KAYA" },
  { code: "BLM101", name: "Bilgisayar Muhendisligine Giris", sinif: 1, duration: 60, professor: "Dr. Ogr. Uyesi Seda SAHIN" },
  // 2. Sinif
  { code: "BIL113", name: "Web Programlama", sinif: 2, duration: 60, professor: "Dr. Ogr. Uyesi Fatih ISSI" },
  { code: "BLM205", name: "Isletim Sistemleri", sinif: 2, duration: 60, professor: "Doc. Dr. Selim BUYRUkoglu" },
  { code: "BLM209", name: "Veritabani Yonetim Sistemleri / BIL303", sinif: 2, duration: 60, professor: "Dr. Ogr. Uyesi Fatih ISSI" },
  { code: "BLM203", name: "Veri Yapilari", sinif: 2, duration: 60, professor: "Dr. Ogr. Uyesi Taha ETEM" },
  { code: "MAT242", name: "Diferansiyel Denklemler", sinif: 2, duration: 90, professor: "Prof. Dr. Ilyas INCI" },
  { code: "BLM201", name: "Nesneye Yonelik Programlama", sinif: 2, duration: 60, professor: "Doc. Dr. Selim BUYRUKOGLI" },
  { code: "IST235", name: "Olasilik ve Istatistik", sinif: 2, duration: 90, professor: "Dr. Ugur BINZAT" },
  { code: "BIL231", name: "Ingilizce I", sinif: 2, duration: 60, professor: "Dr. Alime YILMAZ" },
  // 3. Sinif
  { code: "BIL305", name: "Bilgisayar Aglari", sinif: 3, duration: 60, professor: "Dr. Mehmet Akif ALPER" },
  { code: "BIL307", name: "Yazilim Muhendisligi", sinif: 3, duration: 60, professor: "Dr. Ogr. Uyesi Osman GULER" },
  { code: "BIL301", name: "Mikroislemciler", sinif: 3, duration: 60, professor: "Dr. Selim SURUCU" },
  // 4. Sinif
  { code: "BIL425", name: "Derin Ogrenme", sinif: 4, duration: 60, professor: "Doc. Dr. Selim BUYRUKOGLI" },
  { code: "BIL401", name: "Bilgisayar Projesi I", sinif: 4, duration: 60, professor: "Dr. Ogr. Uyesi Fatih ISSI" },
  { code: "BIL325", name: "Mobil Programlama", sinif: 4, duration: 60, professor: "Dr. Ogr. Uyesi Osman GULER" },
  { code: "BIL403", name: "Yapay Zeka", sinif: 4, duration: 60, professor: "Dr. Ogr. Uyesi Taha ETEM" },
  { code: "BIL473", name: "Bilgi Guvenligi", sinif: 4, duration: 60, professor: "Dr. Mehmet Akif ALPER" },
  { code: "BIL432", name: "Goruntu Isleme", sinif: 4, duration: 60, professor: "Dr. Ogr. Uyesi Seda SAHIN" },
  { code: "BIL466", name: "Giri$imcilik", sinif: 4, duration: 60, professor: "Dr. Ogr. Uyesi Osman GULER" },
];

// ── Helper Functions ──
function formatDate(d) {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatDateISO(d) {
  if (!d) return "";
  return d.toISOString().split("T")[0];
}

function parseDateISO(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getDayName(d) {
  const names = ["Pazar", "Pazartesi", "Sali", "Carsamba", "Persembe", "Cuma", "Cumartesi"];
  return names[d.getDay()];
}

function getDayNameShort(d) {
  const names = ["Paz", "Pzt", "Sal", "Car", "Per", "Cum", "Cmt"];
  return names[d.getDay()];
}

function getWeekDays(startDate, weeks) {
  const days = [];
  const start = new Date(startDate);
  // Find Monday of the start week
  const dayOfWeek = start.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + diff);

  const totalDays = weeks * 7;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    // Only weekdays (Mon-Sat for Turkish universities)
    if (d.getDay() >= 1 && d.getDay() <= 6) {
      days.push(new Date(d));
    }
  }
  return days;
}

function timeToSlotIndex(timeStr) {
  const idx = TIME_SLOTS.indexOf(timeStr);
  return idx >= 0 ? idx : 0;
}

function slotSpan(durationMinutes) {
  return Math.ceil(durationMinutes / 30);
}

// ── Firebase helpers for exams module ──
function getExamsRef() {
  if (!window.firebase || !window.firebase.firestore) return null;
  return window.firebase.firestore().collection("sinav_programi");
}

function getCoursesRef() {
  if (!window.firebase || !window.firebase.firestore) return null;
  return window.firebase.firestore().collection("sinav_dersler");
}

function getProfessorsRef() {
  if (!window.firebase || !window.firebase.firestore) return null;
  return window.firebase.firestore().collection("sinav_hocalar");
}

function getPeriodsRef() {
  if (!window.firebase || !window.firebase.firestore) return null;
  return window.firebase.firestore().collection("sinav_donemler");
}

// ══════════════════════════════════════════════════════════════
// Period Config Modal
// ══════════════════════════════════════════════════════════════
const PeriodConfigModal = ({ period, onSave, onClose }) => {
  const [examType, setExamType] = useState(period?.examType || "final");
  const [startDate, setStartDate] = useState(period?.startDate || "");
  const [semester, setSemester] = useState(period?.semester || "Guz 2024-2025");
  const [saving, setSaving] = useState(false);

  const selectedType = EXAM_TYPES.find(t => t.value === examType);
  const endDate = useMemo(() => {
    if (!startDate || !selectedType) return "";
    const d = parseDateISO(startDate);
    d.setDate(d.getDate() + selectedType.weeks * 7 - 1);
    return formatDateISO(d);
  }, [startDate, selectedType]);

  const handleSave = async () => {
    if (!startDate) return alert("Baslangic tarihi secin");
    setSaving(true);
    try {
      const data = {
        examType,
        semester,
        startDate,
        endDate,
        weeks: selectedType.weeks,
        label: `${selectedType.label} - ${semester}`,
      };
      const ref = getPeriodsRef();
      if (!ref) throw new Error("Firebase hazir degil");
      if (period?.id) {
        await ref.doc(period.id).update(data);
      } else {
        await ref.add(data);
      }
      onSave();
    } catch (e) {
      console.error("Period save error:", e);
      alert("Kayit hatasi: " + e.message);
    }
    setSaving(false);
  };

  return (
    <Modal open={true} title={period?.id ? "Donemi Duzenle" : "Yeni Sinav Donemi"} onClose={onClose} width={500}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FormField label="Donem">
          <Select value={semester} onChange={e => setSemester(e.target.value)}>
            {["Guz 2024-2025", "Bahar 2024-2025", "Guz 2025-2026", "Bahar 2025-2026"].map(s =>
              <option key={s} value={s}>{s}</option>
            )}
          </Select>
        </FormField>
        <FormField label="Sinav Turu">
          <Select value={examType} onChange={e => setExamType(e.target.value)}>
            {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} ({t.weeks} hafta)</option>)}
          </Select>
        </FormField>
        <FormField label="Baslangic Tarihi">
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </FormField>
        {endDate && (
          <div style={{ padding: 12, background: C.blueLight, borderRadius: 8, fontSize: 14 }}>
            Bitis Tarihi: <strong>{formatDate(parseDateISO(endDate))}</strong> ({selectedType.weeks} hafta)
          </div>
        )}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <GhostBtn onClick={onClose}>Iptal</GhostBtn>
          <Btn onClick={handleSave} disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Btn>
        </div>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// Edit Exam Modal - for editing placed exam details
// ══════════════════════════════════════════════════════════════
const EditExamModal = ({ exam, onSave, onRemove, onClose }) => {
  const [studentCount, setStudentCount] = useState(exam?.studentCount || "");
  const [supervisor, setSupervisor] = useState(exam?.supervisor || "");
  const [room, setRoom] = useState(exam?.room || "");
  const [duration, setDuration] = useState(exam?.duration || 60);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...exam,
        studentCount: parseInt(studentCount) || 0,
        supervisor,
        room,
        duration: parseInt(duration) || 60,
      });
      onClose();
    } catch (e) {
      alert("Hata: " + e.message);
    }
    setSaving(false);
  };

  return (
    <Modal open={true} title="Sinav Detaylarini Duzenle" onClose={onClose} width={500}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ padding: 12, background: SINIF_COLORS[exam.sinif]?.bg || "#f0f0f0", borderRadius: 8, fontSize: 14 }}>
          <strong>{exam.code}</strong> - {exam.name}<br />
          <span style={{ fontSize: 13, opacity: 0.8 }}>{exam.professor}</span>
        </div>
        <FormField label="Sinav Suresi (dk)">
          <Select value={duration} onChange={e => setDuration(e.target.value)}>
            {[30, 45, 60, 75, 90, 105, 120].map(d => <option key={d} value={d}>{d} dakika</option>)}
          </Select>
        </FormField>
        <FormField label="Ogrenci Sayisi">
          <Input type="number" value={studentCount} onChange={e => setStudentCount(e.target.value)} placeholder="Orn: 45" />
        </FormField>
        <FormField label="Gozetmen">
          <Input value={supervisor} onChange={e => setSupervisor(e.target.value)} placeholder="Gozetmen adi" />
        </FormField>
        <FormField label="Sinif / Salon">
          <Input value={room} onChange={e => setRoom(e.target.value)} placeholder="Orn: D-201" />
        </FormField>
        <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 8 }}>
          <GhostBtn onClick={() => { onRemove(exam); onClose(); }} style={{ color: "#DC2626" }}>
            Takvimden Kaldir
          </GhostBtn>
          <div style={{ display: "flex", gap: 12 }}>
            <GhostBtn onClick={onClose}>Iptal</GhostBtn>
            <Btn onClick={handleSave} disabled={saving}>{saving ? "..." : "Kaydet"}</Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// Course Management Modal
// ══════════════════════════════════════════════════════════════
const CourseManagementModal = ({ courses, professors, onSave, onClose }) => {
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState({ code: "", name: "", sinif: 1, duration: 60, professor: "" });

  const startEdit = (c) => {
    setEditingCourse(c);
    setForm({ code: c.code, name: c.name, sinif: c.sinif, duration: c.duration, professor: c.professor });
  };

  const startNew = () => {
    setEditingCourse("new");
    setForm({ code: "", name: "", sinif: 1, duration: 60, professor: "" });
  };

  const handleSave = () => {
    if (!form.code || !form.name) return alert("Ders kodu ve adi gerekli");
    onSave(editingCourse === "new" ? null : editingCourse, form);
    setEditingCourse(null);
  };

  return (
    <Modal open={true} title="Ders Yonetimi" onClose={onClose} width={800}>
      <div style={{ maxHeight: 500, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.bg }}>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: `2px solid ${C.border}` }}>Kod</th>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: `2px solid ${C.border}` }}>Ders Adi</th>
              <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: `2px solid ${C.border}` }}>Sinif</th>
              <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: `2px solid ${C.border}` }}>Sure</th>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: `2px solid ${C.border}` }}>Hoca</th>
              <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: `2px solid ${C.border}` }}>Islem</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "8px 12px" }}>
                  <Badge style={{ background: SINIF_COLORS[c.sinif]?.bg, color: SINIF_COLORS[c.sinif]?.text }}>{c.code}</Badge>
                </td>
                <td style={{ padding: "8px 12px" }}>{c.name}</td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>{c.sinif}. Sinif</td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>{c.duration} dk</td>
                <td style={{ padding: "8px 12px", fontSize: 12 }}>{c.professor}</td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  <button onClick={() => startEdit(c)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: 13 }}>Duzenle</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingCourse && (
        <div style={{ marginTop: 16, padding: 16, background: C.bg, borderRadius: 8, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{editingCourse === "new" ? "Yeni Ders" : "Dersi Duzenle"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
            <FormField label="Ders Kodu">
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            </FormField>
            <FormField label="Ders Adi">
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </FormField>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12 }}>
            <FormField label="Sinif">
              <Select value={form.sinif} onChange={e => setForm({ ...form, sinif: parseInt(e.target.value) })}>
                {[1, 2, 3, 4].map(s => <option key={s} value={s}>{s}. Sinif</option>)}
              </Select>
            </FormField>
            <FormField label="Sure (dk)">
              <Select value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })}>
                {[30, 45, 60, 75, 90, 105, 120].map(d => <option key={d} value={d}>{d} dk</option>)}
              </Select>
            </FormField>
            <FormField label="Hoca">
              <Select value={form.professor} onChange={e => setForm({ ...form, professor: e.target.value })}>
                <option value="">Sec...</option>
                {professors.map((p, i) => <option key={i} value={p.name}>{p.name}</option>)}
              </Select>
            </FormField>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <GhostBtn onClick={() => setEditingCourse(null)}>Iptal</GhostBtn>
            <Btn onClick={handleSave}>Kaydet</Btn>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
        <GhostBtn onClick={startNew}>+ Yeni Ders Ekle</GhostBtn>
        <GhostBtn onClick={onClose}>Kapat</GhostBtn>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// Draggable Course Card (in pool)
// ══════════════════════════════════════════════════════════════
const DraggableCourseCard = ({ course, isPlaced }) => {
  const color = SINIF_COLORS[course.sinif] || SINIF_COLORS[1];

  const handleDragStart = (e) => {
    e.dataTransfer.setData("application/json", JSON.stringify(course));
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.style.opacity = "0.5";
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = "1";
  };

  return (
    <div
      draggable={!isPlaced}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        padding: "8px 10px",
        background: isPlaced ? "#f0f0f0" : color.bg,
        color: isPlaced ? "#999" : color.text,
        borderRadius: 6,
        fontSize: 12,
        cursor: isPlaced ? "default" : "grab",
        border: `1px solid ${isPlaced ? "#ddd" : color.text + "30"}`,
        opacity: isPlaced ? 0.5 : 1,
        transition: "all 0.2s",
        textDecoration: isPlaced ? "line-through" : "none",
        userSelect: "none",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 12 }}>{course.code}</div>
      <div style={{ fontSize: 11, marginTop: 2, lineHeight: 1.3 }}>{course.name}</div>
      <div style={{ fontSize: 10, marginTop: 3, opacity: 0.7 }}>{course.duration} dk</div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// Calendar Grid Cell
// ══════════════════════════════════════════════════════════════
const CalendarCell = ({ day, timeSlot, slotIndex, placedExams, onDrop, onExamClick, totalSlots }) => {
  const [dragOver, setDragOver] = useState(false);
  const dateStr = formatDateISO(day);

  // Check if this cell has an exam starting here
  const examHere = placedExams.find(e => e.date === dateStr && e.timeSlot === timeSlot);

  // Check if this cell is covered by an exam from above
  const coveredBy = placedExams.find(e => {
    if (e.date !== dateStr) return false;
    const startIdx = timeToSlotIndex(e.timeSlot);
    const span = slotSpan(e.duration);
    return slotIndex > startIdx && slotIndex < startIdx + span;
  });

  if (coveredBy) return null; // Don't render - spanned by exam above

  const examSpan = examHere ? slotSpan(examHere.duration) : 1;
  const color = examHere ? SINIF_COLORS[examHere.sinif] || SINIF_COLORS[1] : null;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const courseData = JSON.parse(e.dataTransfer.getData("application/json"));
      onDrop(courseData, dateStr, timeSlot);
    } catch (err) {
      console.error("Drop error:", err);
    }
  };

  const cellHeight = 28;

  return (
    <td
      onDragOver={!examHere ? handleDragOver : undefined}
      onDragLeave={!examHere ? handleDragLeave : undefined}
      onDrop={!examHere ? handleDrop : undefined}
      onClick={examHere ? () => onExamClick(examHere) : undefined}
      rowSpan={examHere ? examSpan : 1}
      style={{
        border: "1px solid #E5E7EB",
        padding: 0,
        height: examHere ? cellHeight * examSpan : cellHeight,
        minWidth: 100,
        maxWidth: 140,
        verticalAlign: "top",
        background: examHere
          ? color.bg
          : dragOver
            ? "#DBEAFE"
            : "white",
        cursor: examHere ? "pointer" : "default",
        transition: "background 0.15s",
        position: "relative",
      }}
    >
      {examHere && (
        <div style={{
          padding: "3px 5px",
          fontSize: 10,
          lineHeight: 1.3,
          color: color.text,
          height: "100%",
          overflow: "hidden",
          fontWeight: 600,
        }}>
          <div>{examHere.code}</div>
          <div style={{ fontWeight: 400, fontSize: 9 }}>{examHere.name}</div>
          {examHere.studentCount > 0 && (
            <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{examHere.studentCount} ogrenci</div>
          )}
        </div>
      )}
    </td>
  );
};

// ══════════════════════════════════════════════════════════════
// Table View (Image 1 format)
// ══════════════════════════════════════════════════════════════
const ExamTableView = ({ placedExams, onExamClick }) => {
  const sorted = [...placedExams].sort((a, b) => {
    if (a.sinif !== b.sinif) return a.sinif - b.sinif;
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.timeSlot.localeCompare(b.timeSlot);
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#1B2A4A", color: "white" }}>
            <th style={{ padding: "10px 12px", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.2)" }}>Sinif</th>
            <th style={{ padding: "10px 12px", textAlign: "left", borderRight: "1px solid rgba(255,255,255,0.2)" }}>Ders Kodu - Ismi</th>
            <th style={{ padding: "10px 12px", textAlign: "left", borderRight: "1px solid rgba(255,255,255,0.2)" }}>Ilgili Ogretim Uyesi</th>
            <th style={{ padding: "10px 12px", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.2)" }}>Tarih - Saat - Sure</th>
            <th style={{ padding: "10px 12px", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.2)" }}>Ogrenci Sayisi</th>
            <th style={{ padding: "10px 12px", textAlign: "left", borderRight: "1px solid rgba(255,255,255,0.2)" }}>Gozetmen</th>
            <th style={{ padding: "10px 12px", textAlign: "center" }}>Sinif/Salon</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#999" }}>
              Henuz takvime ders yerlestirilmedi. Sol panelden dersleri surukleyip takvime birakin.
            </td></tr>
          )}
          {sorted.map((exam, i) => {
            const color = SINIF_COLORS[exam.sinif] || SINIF_COLORS[1];
            const dateObj = parseDateISO(exam.date);
            const dateStr = dateObj ? `${formatDate(dateObj)} ${getDayName(dateObj)}` : "";
            return (
              <tr
                key={i}
                onClick={() => onExamClick(exam)}
                style={{
                  background: i % 2 === 0 ? "white" : "#F9FAFB",
                  cursor: "pointer",
                  borderBottom: `1px solid ${C.border}`,
                }}
                onMouseEnter={e => e.currentTarget.style.background = color.bg + "60"}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "white" : "#F9FAFB"}
              >
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <Badge style={{ background: color.bg, color: color.text, fontSize: 11 }}>{color.label}</Badge>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <strong>{exam.code}</strong> - {exam.name}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 12 }}>{exam.professor}</td>
                <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 12 }}>
                  {dateStr}<br />{exam.timeSlot} ({exam.duration} dk)
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>
                  {exam.studentCount || "-"}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 12 }}>{exam.supervisor || "-"}</td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>{exam.room || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// Export Functions
// ══════════════════════════════════════════════════════════════
function exportToCSV(placedExams, periodLabel) {
  const sorted = [...placedExams].sort((a, b) => {
    if (a.sinif !== b.sinif) return a.sinif - b.sinif;
    return a.date.localeCompare(b.date) || a.timeSlot.localeCompare(b.timeSlot);
  });

  const header = "Sinif;Ders Kodu;Ders Adi;Ogretim Uyesi;Tarih;Gun;Saat;Sure (dk);Ogrenci Sayisi;Gozetmen;Salon";
  const rows = sorted.map(e => {
    const d = parseDateISO(e.date);
    return [
      `${e.sinif}. Sinif`,
      e.code,
      e.name,
      e.professor,
      formatDate(d),
      getDayName(d),
      e.timeSlot,
      e.duration,
      e.studentCount || "",
      e.supervisor || "",
      e.room || "",
    ].join(";");
  });

  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sinav_programi_${periodLabel || "export"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToWord(placedExams, periodLabel) {
  const sorted = [...placedExams].sort((a, b) => {
    if (a.sinif !== b.sinif) return a.sinif - b.sinif;
    return a.date.localeCompare(b.date) || a.timeSlot.localeCompare(b.timeSlot);
  });

  let tableRows = sorted.map(e => {
    const d = parseDateISO(e.date);
    const color = SINIF_COLORS[e.sinif];
    return `<tr>
      <td style="background:${color.bg};color:${color.text};text-align:center;padding:6px">${color.label}</td>
      <td style="padding:6px"><b>${e.code}</b> - ${e.name}</td>
      <td style="padding:6px;font-size:12px">${e.professor}</td>
      <td style="padding:6px;text-align:center">${formatDate(d)} ${getDayName(d)}<br/>${e.timeSlot} (${e.duration} dk)</td>
      <td style="padding:6px;text-align:center;font-weight:bold">${e.studentCount || "-"}</td>
      <td style="padding:6px">${e.supervisor || "-"}</td>
      <td style="padding:6px;text-align:center">${e.room || "-"}</td>
    </tr>`;
  }).join("");

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head><meta charset="utf-8"><title>Sinav Programi</title></head>
    <body style="font-family:Calibri,sans-serif;font-size:11pt">
      <h2 style="text-align:center;color:#1B2A4A">CAKU Bilgisayar Muhendisligi - Sinav Programi</h2>
      <p style="text-align:center;color:#666">${periodLabel || ""}</p>
      <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:10pt">
        <tr style="background:#1B2A4A;color:white">
          <th style="padding:8px">Sinif</th>
          <th style="padding:8px">Ders Kodu - Ismi</th>
          <th style="padding:8px">Ogretim Uyesi</th>
          <th style="padding:8px">Tarih - Saat - Sure</th>
          <th style="padding:8px">Ogrenci Sayisi</th>
          <th style="padding:8px">Gozetmen</th>
          <th style="padding:8px">Salon</th>
        </tr>
        ${tableRows}
      </table>
    </body></html>`;

  const blob = new Blob(["\uFEFF" + html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sinav_programi_${periodLabel || "export"}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════
// MAIN: SinavOtomasyonuApp
// ══════════════════════════════════════════════════════════════
function SinavOtomasyonuApp({ currentUser }) {
  const isAdmin = currentUser?.role === "admin";

  // State
  const [courses, setCourses] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [activePeriodId, setActivePeriodId] = useState(null);
  const [placedExams, setPlacedExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("calendar"); // "calendar" | "table"
  const [editingExam, setEditingExam] = useState(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [filterSinif, setFilterSinif] = useState(0); // 0 = all

  // ── Seed data to Firebase ──
  const seedData = async () => {
    const cRef = getCoursesRef();
    const pRef = getProfessorsRef();
    if (!cRef || !pRef) return;

    try {
      // Check if already seeded
      const existingCourses = await cRef.get();
      if (!existingCourses.empty) {
        if (!confirm("Veritabaninda zaten dersler var. Uzerine yazilsin mi?")) return;
        // Delete existing
        const batch1 = window.firebase.firestore().batch();
        existingCourses.docs.forEach(doc => batch1.delete(doc.ref));
        await batch1.commit();
      }

      const existingProfs = await pRef.get();
      if (!existingProfs.empty) {
        const batch2 = window.firebase.firestore().batch();
        existingProfs.docs.forEach(doc => batch2.delete(doc.ref));
        await batch2.commit();
      }

      // Seed professors
      for (const prof of SEED_PROFESSORS) {
        await pRef.add({ ...prof, createdAt: new Date().toISOString() });
      }

      // Seed courses
      for (const course of SEED_COURSES) {
        await cRef.add({ ...course, studentCount: 0, createdAt: new Date().toISOString() });
      }

      alert("Veriler basariyla yuklendi! " + SEED_COURSES.length + " ders, " + SEED_PROFESSORS.length + " hoca eklendi.");
      loadData();
    } catch (e) {
      console.error("Seed error:", e);
      alert("Seed hatasi: " + e.message);
    }
  };

  // ── Load data from Firebase ──
  const loadData = async () => {
    setLoading(true);
    try {
      const cRef = getCoursesRef();
      const pRef = getProfessorsRef();
      const perRef = getPeriodsRef();
      const eRef = getExamsRef();

      if (cRef) {
        const snap = await cRef.get();
        setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      if (pRef) {
        const snap = await pRef.get();
        setProfessors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      if (perRef) {
        const snap = await perRef.get();
        const perList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPeriods(perList);
        if (perList.length > 0 && !activePeriodId) {
          setActivePeriodId(perList[0].id);
        }
      }
      if (eRef) {
        const snap = await eRef.get();
        setPlacedExams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (e) {
      console.error("Load error:", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // ── Active period ──
  const activePeriod = periods.find(p => p.id === activePeriodId);
  const periodExams = placedExams.filter(e => e.periodId === activePeriodId);

  // ── Calendar days ──
  const calendarDays = useMemo(() => {
    if (!activePeriod?.startDate) return [];
    return getWeekDays(parseDateISO(activePeriod.startDate), activePeriod.weeks || 2);
  }, [activePeriod]);

  // ── Unplaced courses ──
  const unplacedCourses = useMemo(() => {
    const placedIds = new Set(periodExams.map(e => e.courseId));
    let filtered = courses.filter(c => !placedIds.has(c.id));
    if (filterSinif > 0) {
      filtered = filtered.filter(c => c.sinif === filterSinif);
    }
    return filtered;
  }, [courses, periodExams, filterSinif]);

  const groupedUnplaced = useMemo(() => {
    const groups = { 1: [], 2: [], 3: [], 4: [] };
    unplacedCourses.forEach(c => {
      if (groups[c.sinif]) groups[c.sinif].push(c);
    });
    return groups;
  }, [unplacedCourses]);

  // ── Drop handler ──
  const handleDrop = async (courseData, dateStr, timeSlot) => {
    // Check for conflicts (same class same time)
    const span = slotSpan(courseData.duration);
    const dropSlotIdx = timeToSlotIndex(timeSlot);

    const conflict = periodExams.find(e => {
      if (e.date !== dateStr) return false;
      if (e.sinif !== courseData.sinif) return false;
      const eStart = timeToSlotIndex(e.timeSlot);
      const eSpan = slotSpan(e.duration);
      return !(dropSlotIdx + span <= eStart || dropSlotIdx >= eStart + eSpan);
    });

    if (conflict) {
      alert(`Cakisma! ${conflict.code} ayni sinif (${courseData.sinif}. Sinif) icin ayni zaman diliminde zaten var.`);
      return;
    }

    const examData = {
      courseId: courseData.id,
      code: courseData.code,
      name: courseData.name,
      sinif: courseData.sinif,
      duration: courseData.duration,
      professor: courseData.professor,
      date: dateStr,
      timeSlot: timeSlot,
      periodId: activePeriodId,
      studentCount: courseData.studentCount || 0,
      supervisor: "",
      room: "",
      createdAt: new Date().toISOString(),
    };

    try {
      const ref = getExamsRef();
      if (!ref) throw new Error("Firebase hazir degil");
      const docRef = await ref.add(examData);
      setPlacedExams(prev => [...prev, { id: docRef.id, ...examData }]);
    } catch (e) {
      console.error("Drop save error:", e);
      alert("Kayit hatasi: " + e.message);
    }
  };

  // ── Update exam ──
  const handleUpdateExam = async (updatedExam) => {
    try {
      const ref = getExamsRef();
      if (!ref) throw new Error("Firebase hazir degil");
      const { id, ...data } = updatedExam;
      await ref.doc(id).update(data);
      setPlacedExams(prev => prev.map(e => e.id === id ? updatedExam : e));
    } catch (e) {
      console.error("Update error:", e);
      throw e;
    }
  };

  // ── Remove exam from calendar ──
  const handleRemoveExam = async (exam) => {
    try {
      const ref = getExamsRef();
      if (!ref) throw new Error("Firebase hazir degil");
      await ref.doc(exam.id).delete();
      setPlacedExams(prev => prev.filter(e => e.id !== exam.id));
    } catch (e) {
      console.error("Remove error:", e);
      alert("Silme hatasi: " + e.message);
    }
  };

  // ── Course management save ──
  const handleCourseSave = async (existingCourse, formData) => {
    try {
      const ref = getCoursesRef();
      if (!ref) throw new Error("Firebase hazir degil");
      if (existingCourse) {
        await ref.doc(existingCourse.id).update(formData);
      } else {
        await ref.add({ ...formData, studentCount: 0, createdAt: new Date().toISOString() });
      }
      loadData();
    } catch (e) {
      alert("Hata: " + e.message);
    }
  };

  // ── Period save callback ──
  const handlePeriodSave = () => {
    setShowPeriodModal(false);
    setEditingPeriod(null);
    loadData();
  };

  // ── Delete period ──
  const handleDeletePeriod = async (periodId) => {
    if (!confirm("Bu donemi silmek istediginize emin misiniz? Bu doneme ait tum sinav yerleştirmeleri de silinecek.")) return;
    try {
      const perRef = getPeriodsRef();
      const exRef = getExamsRef();
      if (perRef) await perRef.doc(periodId).delete();
      // Delete associated exams
      if (exRef) {
        const snap = await exRef.where("periodId", "==", periodId).get();
        const batch = window.firebase.firestore().batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
      if (activePeriodId === periodId) setActivePeriodId(null);
      loadData();
    } catch (e) {
      alert("Silme hatasi: " + e.message);
    }
  };

  // ── Reset all placements for active period ──
  const handleResetPlacements = async () => {
    if (!activePeriodId) return;
    if (!confirm("Bu donemdeki tum sinav yerlesimlerini sifirlamak istediginize emin misiniz?")) return;
    try {
      const ref = getExamsRef();
      if (!ref) return;
      const snap = await ref.where("periodId", "==", activePeriodId).get();
      const batch = window.firebase.firestore().batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      setPlacedExams(prev => prev.filter(e => e.periodId !== activePeriodId));
    } catch (e) {
      alert("Sifirlama hatasi: " + e.message);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <Card>
        <div style={{ padding: 60, textAlign: "center", color: "#999" }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>Yukleniyor...</div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.navy, fontFamily: "'Playfair Display', serif" }}>
            Sinav Programi Otomasyonu
          </h2>
          <p style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
            Dersleri surukleyerek takvime yerlestirin
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isAdmin && courses.length === 0 && (
            <Btn onClick={seedData} style={{ background: "#059669" }}>
              Ornek Verileri Yukle
            </Btn>
          )}
          {isAdmin && (
            <GhostBtn onClick={() => setShowCourseModal(true)}>Ders Yonetimi</GhostBtn>
          )}
          {isAdmin && (
            <GhostBtn onClick={() => { setEditingPeriod(null); setShowPeriodModal(true); }}>
              + Yeni Donem
            </GhostBtn>
          )}
        </div>
      </div>

      {/* Period Selector */}
      {periods.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>Sinav Donemi:</span>
            {periods.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  onClick={() => setActivePeriodId(p.id)}
                  style={{
                    padding: "6px 16px",
                    border: `2px solid ${p.id === activePeriodId ? C.blue : C.border}`,
                    background: p.id === activePeriodId ? C.blueLight : "white",
                    color: p.id === activePeriodId ? C.blue : "#666",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: p.id === activePeriodId ? 600 : 400,
                  }}
                >
                  {p.label || `${p.examType} - ${p.semester}`}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => { setEditingPeriod(p); setShowPeriodModal(true); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 14, padding: "4px" }}
                    title="Duzenle"
                  >&#9998;</button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => handleDeletePeriod(p.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", fontSize: 14, padding: "4px" }}
                    title="Sil"
                  >&times;</button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* No period selected */}
      {!activePeriod && (
        <Card>
          <div style={{ padding: 60, textAlign: "center", color: "#999" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>&#128197;</div>
            <div style={{ fontSize: 16, marginBottom: 8 }}>Sinav donemi bulunamadi</div>
            <div style={{ fontSize: 13 }}>
              {isAdmin
                ? "Yeni bir sinav donemi olusturun (Final, Vize veya But)"
                : "Yonetici henuz bir sinav donemi olusturmadi"}
            </div>
            {isAdmin && (
              <Btn onClick={() => { setEditingPeriod(null); setShowPeriodModal(true); }} style={{ marginTop: 16 }}>
                + Yeni Donem Olustur
              </Btn>
            )}
          </div>
        </Card>
      )}

      {/* Active period content */}
      {activePeriod && (
        <>
          {/* Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setViewMode("calendar")}
                style={{
                  padding: "6px 14px", border: `1px solid ${C.border}`, borderRadius: "8px 0 0 8px",
                  background: viewMode === "calendar" ? C.navy : "white",
                  color: viewMode === "calendar" ? "white" : "#666",
                  cursor: "pointer", fontSize: 13,
                }}
              >Takvim</button>
              <button
                onClick={() => setViewMode("table")}
                style={{
                  padding: "6px 14px", border: `1px solid ${C.border}`, borderRadius: "0 8px 8px 0",
                  background: viewMode === "table" ? C.navy : "white",
                  color: viewMode === "table" ? "white" : "#666",
                  cursor: "pointer", fontSize: 13, borderLeft: "none",
                }}
              >Tablo</button>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#666" }}>
                {periodExams.length}/{courses.length} ders yerlestirildi
              </span>
              {periodExams.length > 0 && (
                <>
                  <GhostBtn onClick={() => exportToCSV(periodExams, activePeriod.label)} style={{ fontSize: 12, padding: "4px 10px" }}>
                    CSV
                  </GhostBtn>
                  <GhostBtn onClick={() => exportToWord(periodExams, activePeriod.label)} style={{ fontSize: 12, padding: "4px 10px" }}>
                    Word
                  </GhostBtn>
                  {isAdmin && (
                    <GhostBtn onClick={handleResetPlacements} style={{ fontSize: 12, padding: "4px 10px", color: "#DC2626" }}>
                      Sifirla
                    </GhostBtn>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
            {Object.entries(SINIF_COLORS).map(([s, color]) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: color.bg, border: `1px solid ${color.text}30` }} />
                <span style={{ color: color.text, fontWeight: 500 }}>{color.label}</span>
              </div>
            ))}
          </div>

          {viewMode === "calendar" ? (
            <div style={{ display: "flex", gap: 16 }}>
              {/* Course Pool Sidebar */}
              <div style={{
                width: 220, minWidth: 220, maxHeight: "calc(100vh - 260px)",
                overflowY: "auto", background: "white", borderRadius: 10,
                border: `1px solid ${C.border}`, padding: 12,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.navy, marginBottom: 8 }}>
                  Ders Havuzu
                </div>
                <div style={{ marginBottom: 8 }}>
                  <select
                    value={filterSinif}
                    onChange={e => setFilterSinif(parseInt(e.target.value))}
                    style={{ width: "100%", padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }}
                  >
                    <option value={0}>Tum Siniflar</option>
                    {[1, 2, 3, 4].map(s => <option key={s} value={s}>{s}. Sinif</option>)}
                  </select>
                </div>

                {[1, 2, 3, 4].map(sinif => {
                  if (filterSinif > 0 && filterSinif !== sinif) return null;
                  const group = groupedUnplaced[sinif];
                  if (!group || group.length === 0) return null;
                  return (
                    <div key={sinif} style={{ marginBottom: 12 }}>
                      <div style={{
                        fontSize: 11, fontWeight: 600, color: SINIF_COLORS[sinif].text,
                        background: SINIF_COLORS[sinif].bg, padding: "4px 8px", borderRadius: 4, marginBottom: 6,
                      }}>
                        {SINIF_COLORS[sinif].label} ({group.length})
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {group.map((c, i) => {
                          const isPlaced = periodExams.some(e => e.courseId === c.id);
                          return <DraggableCourseCard key={c.id || i} course={c} isPlaced={isPlaced} />;
                        })}
                      </div>
                    </div>
                  );
                })}

                {unplacedCourses.length === 0 && (
                  <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 12 }}>
                    Tum dersler yerlestirildi!
                  </div>
                )}
              </div>

              {/* Calendar Grid */}
              <div style={{
                flex: 1, overflowX: "auto", background: "white", borderRadius: 10,
                border: `1px solid ${C.border}`,
              }}>
                {calendarDays.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "#999" }}>
                    Takvim gunleri bulunamadi. Donem tarihlerini kontrol edin.
                  </div>
                ) : (
                  <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
                    <thead>
                      <tr>
                        <th style={{
                          padding: "8px 4px", background: "#1B2A4A", color: "white",
                          fontSize: 11, fontWeight: 600, width: 52, position: "sticky", left: 0, zIndex: 2,
                          borderRight: "2px solid rgba(255,255,255,0.2)",
                        }}>
                          Saat
                        </th>
                        {calendarDays.map((day, i) => (
                          <th key={i} style={{
                            padding: "6px 4px", background: "#1B2A4A", color: "white",
                            fontSize: 11, fontWeight: 500, textAlign: "center", minWidth: 100,
                            borderLeft: "1px solid rgba(255,255,255,0.15)",
                          }}>
                            <div>{getDayNameShort(day)}</div>
                            <div style={{ fontSize: 10, opacity: 0.7 }}>{formatDate(day)}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TIME_SLOTS.map((slot, slotIdx) => (
                        <tr key={slot}>
                          <td style={{
                            padding: "2px 4px", fontSize: 10, fontWeight: 500, color: "#666",
                            textAlign: "center", background: "#F9FAFB",
                            borderRight: "2px solid #E5E7EB", borderBottom: "1px solid #E5E7EB",
                            position: "sticky", left: 0, zIndex: 1,
                          }}>
                            {slot}
                          </td>
                          {calendarDays.map((day, dayIdx) => (
                            <CalendarCell
                              key={dayIdx}
                              day={day}
                              timeSlot={slot}
                              slotIndex={slotIdx}
                              placedExams={periodExams}
                              onDrop={handleDrop}
                              onExamClick={setEditingExam}
                              totalSlots={TIME_SLOTS.length}
                            />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <Card>
              <ExamTableView placedExams={periodExams} onExamClick={setEditingExam} />
            </Card>
          )}
        </>
      )}

      {/* Modals */}
      {editingExam && (
        <EditExamModal
          exam={editingExam}
          onSave={handleUpdateExam}
          onRemove={handleRemoveExam}
          onClose={() => setEditingExam(null)}
        />
      )}

      {showPeriodModal && (
        <PeriodConfigModal
          period={editingPeriod}
          onSave={handlePeriodSave}
          onClose={() => { setShowPeriodModal(false); setEditingPeriod(null); }}
        />
      )}

      {showCourseModal && (
        <CourseManagementModal
          courses={courses}
          professors={professors}
          onSave={handleCourseSave}
          onClose={() => setShowCourseModal(false)}
        />
      )}
    </div>
  );
}

// Export to window
window.SinavOtomasyonuApp = SinavOtomasyonuApp;
