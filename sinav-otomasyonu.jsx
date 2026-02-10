// ══════════════════════════════════════════════════════════════
// ÇAKÜ Sınav Programı Otomasyonu - Sürükle-Bırak Takvim
// Drag-and-drop haftalık takvim grid, ders havuzu, tablo görünümü
// Shared bileşenler shared-components.jsx'den window üzerinden gelir
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ── Shared bileşenlerden import (window üzerinden) ──
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
  1: { bg: "#B2EBF2", text: "#006064", label: "1. Sınıf" },
  2: { bg: "#C8E6C9", text: "#1B5E20", label: "2. Sınıf" },
  3: { bg: "#FFE0B2", text: "#E65100", label: "3. Sınıf" },
  4: { bg: "#F8BBD0", text: "#880E4F", label: "4. Sınıf" },
};

// ── Bölüm Sınıfları ve Gözetmenler ──
const DEPT_CLASSROOMS = [
  { name: "M11101", capacity: 42 },
  { name: "M10Z07", capacity: 49 },
  { name: "M11103", capacity: 58 },
];

const DEPT_SUPERVISORS = [
  "Arş. Gör. A. Tunahan KORKMAZ",
  "Arş. Gör. Öznur Şifa AKÇAM",
  "Arş. Gör. İrem Nur ECEMİŞ ÖZDEMİR",
];

const ALL_FACULTY_CLASSROOMS = [
  { name: "M10Z04", capacity: 25 },
  { name: "M10Z05", capacity: 30 },
  { name: "M10Z06", capacity: 25 },
  { name: "M10Z07", capacity: 49 },
  { name: "M11101", capacity: 42 },
  { name: "M11102", capacity: 25 },
  { name: "M11103", capacity: 58 },
  { name: "M11108", capacity: 21 },
  { name: "M12201", capacity: 21 },
  { name: "M12202", capacity: 42 },
  { name: "M12203", capacity: 42 },
  { name: "M111BL", capacity: "" },
  { name: "M122BL", capacity: "" },
];

function assignClassroom(studentCount) {
  if (!studentCount || studentCount <= 0) return "M10Z07";
  const sorted = [...DEPT_CLASSROOMS].sort((a, b) => a.capacity - b.capacity);
  for (const room of sorted) {
    if (studentCount <= room.capacity) return room.name;
  }
  return "M10Z07 - M11103";
}

function assignSupervisorsToExams(exams) {
  const counts = {};
  DEPT_SUPERVISORS.forEach(s => counts[s] = 0);
  const assignments = {};
  const shuffled = [...exams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  shuffled.forEach(exam => {
    const room = assignClassroom(exam.studentCount);
    const isMultiRoom = room.includes(" - ");
    const numSupervisors = isMultiRoom ? 3 : 2;
    const sortedSups = [...DEPT_SUPERVISORS].sort((a, b) => counts[a] - counts[b]);
    const assigned = sortedSups.slice(0, numSupervisors);
    assigned.forEach(s => counts[s]++);
    assignments[exam.id || (exam.code + exam.date + exam.timeSlot)] = assigned;
  });
  return assignments;
}

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
  { value: "but", label: "Bütünleme", weeks: 1 },
];

// ── Seed Data: 14 Hoca ──
const SEED_PROFESSORS = [
  { name: "Prof. Dr. Hamit ALYAR", department: "Fizik", isExternal: true },
  { name: "Prof. Dr. Çiğdem YÜKSEKTEPE ATAOL", department: "Kimya", isExternal: true },
  { name: "Dr. Öğr. Üyesi Celalettin KAYA", department: "Matematik", isExternal: true },
  { name: "Dr. Öğr. Üyesi Esma Baran ÖZKAN", department: "Matematik", isExternal: true },
  { name: "Dr. Öğr. Üyesi Taha ETEM", department: "Bilgisayar", isExternal: false },
  { name: "Dr. Öğr. Üyesi Seda ŞAHİN", department: "Bilgisayar", isExternal: false },
  { name: "Dr. Öğr. Üyesi Fatih ISSI", department: "Bilgisayar", isExternal: false },
  { name: "Doç. Dr. Selim BÜYÜKOĞLU", department: "Bilgisayar", isExternal: false },
  { name: "Dr. Mehmet Akif ALPER", department: "Bilgisayar", isExternal: false },
  { name: "Prof. Dr. İlyas İNCİ", department: "Matematik", isExternal: true },
  { name: "Dr. Selim SÜRÜCÜ", department: "Bilgisayar", isExternal: false },
  { name: "Dr. Uğur BİNZAT", department: "İstatistik", isExternal: true },
  { name: "Dr. Alime YILMAZ", department: "Yabancı Diller", isExternal: true },
  { name: "Dr. Öğr. Üyesi Osman GÜLER", department: "Bilgisayar", isExternal: false },
];

// ── Seed Data: Dersler ──
const SEED_COURSES = [
  // ═══ 1. Sınıf (1. ve 2. Dönem) ═══
  { code: "FZK181", name: "Fizik I (Şube 1)", sinif: 1, duration: 30, professor: "Prof. Dr. Hamit ALYAR" },
  { code: "FZK181", name: "Fizik I (Şube 2)", sinif: 1, duration: 30, professor: "Prof. Dr. Hamit ALYAR" },
  { code: "MAT165", name: "Matematik I (Şube 1)", sinif: 1, duration: 30, professor: "Dr. Öğr. Üyesi Esma Baran ÖZKAN" },
  { code: "MAT165", name: "Matematik I (Şube 2)", sinif: 1, duration: 30, professor: "Dr. Öğr. Üyesi Esma Baran ÖZKAN" },
  { code: "BLM103", name: "Programlamaya Giriş", sinif: 1, duration: 30, professor: "Dr. Öğr. Üyesi Taha ETEM" },
  { code: "MAT241", name: "Doğrusal Cebir (Şube 1-2)", sinif: 1, duration: 30, professor: "Dr. Öğr. Üyesi Celalettin KAYA" },
  { code: "BLM101", name: "Bilgisayar Mühendisliğine Giriş", sinif: 1, duration: 30, professor: "Dr. Öğr. Üyesi Seda ŞAHİN" },
  // 2. Dönem
  { code: "MAT162", name: "Matematik II", sinif: 1, duration: 30, professor: "" },
  { code: "FIZ162", name: "Genel Fizik II", sinif: 1, duration: 30, professor: "" },
  { code: "ATA102", name: "Atatürk İlkeleri ve İnkılap Tarihi II", sinif: 1, duration: 30, professor: "" },
  { code: "TDI102", name: "Türk Dili II", sinif: 1, duration: 30, professor: "" },
  { code: "BIL132", name: "Bilgisayar Programlama II", sinif: 1, duration: 30, professor: "" },
  { code: "MAT142", name: "Ayrık Matematik ve Uygulamaları", sinif: 1, duration: 30, professor: "" },

  // ═══ 2. Sınıf (3. ve 4. Dönem) ═══
  { code: "BIL113", name: "Web Programlama", sinif: 2, duration: 30, professor: "Dr. Öğr. Üyesi Fatih ISSI" },
  { code: "BLM205", name: "İşletim Sistemleri", sinif: 2, duration: 30, professor: "Doç. Dr. Selim BÜYÜKOĞLU" },
  { code: "BLM209", name: "Veritabanı Yönetim Sistemleri / BIL303", sinif: 2, duration: 30, professor: "Dr. Öğr. Üyesi Fatih ISSI" },
  { code: "BLM203", name: "Veri Yapıları", sinif: 2, duration: 30, professor: "Dr. Öğr. Üyesi Taha ETEM" },
  { code: "MAT242", name: "Diferansiyel Denklemler", sinif: 2, duration: 30, professor: "Prof. Dr. İlyas İNCİ" },
  { code: "BLM201", name: "Nesneye Yönelik Programlama", sinif: 2, duration: 30, professor: "Doç. Dr. Selim BÜYÜKOĞLU" },
  { code: "IST235", name: "Olasılık ve İstatistik", sinif: 2, duration: 30, professor: "Dr. Uğur BİNZAT" },
  { code: "BIL231", name: "İngilizce I", sinif: 2, duration: 30, professor: "Dr. Alime YILMAZ" },
  // 3. Dönem
  { code: "BIL201", name: "Algoritma ve Veri Yapıları I", sinif: 2, duration: 30, professor: "" },
  { code: "BIL203", name: "Nesnesel Tasarım ve Programlama", sinif: 2, duration: 30, professor: "" },
  { code: "BIL205", name: "Sayısal Sistem Tasarımı", sinif: 2, duration: 30, professor: "" },
  { code: "BIL231", name: "Bilgisayar Mühendisliğinde Mesleki İngilizce", sinif: 2, duration: 30, professor: "" },
  { code: "MAT221", name: "Doğrusal Cebir", sinif: 2, duration: 30, professor: "" },
  // 4. Dönem
  { code: "BIL222", name: "Diferansiyel Denklemler", sinif: 2, duration: 30, professor: "" },
  { code: "BIL232", name: "Mühendislik Ekonomisi", sinif: 2, duration: 30, professor: "" },
  { code: "BIL202", name: "Algoritma ve Veri Yapıları II", sinif: 2, duration: 30, professor: "" },
  { code: "BIL206", name: "Elektrik ve Elektronik Devrelerinin Temelleri", sinif: 2, duration: 30, professor: "" },
  { code: "BIL212", name: "Olasılık Teorisi ve İstatistik", sinif: 2, duration: 30, professor: "" },

  // ═══ 3. Sınıf (5. ve 6. Dönem) ═══
  { code: "BIL305", name: "Bilgisayar Ağları", sinif: 3, duration: 30, professor: "Dr. Mehmet Akif ALPER" },
  { code: "BIL307", name: "Yazılım Mühendisliği", sinif: 3, duration: 30, professor: "Dr. Öğr. Üyesi Osman GÜLER" },
  { code: "BIL301", name: "Mikroişlemciler", sinif: 3, duration: 30, professor: "Dr. Selim SÜRÜCÜ" },
  // 5. Dönem
  { code: "BIL301", name: "Programlama Dilleri", sinif: 3, duration: 30, professor: "" },
  { code: "BIL303", name: "Veritabanı Sistemleri", sinif: 3, duration: 30, professor: "" },
  { code: "BIL305", name: "İşletim Sistemleri", sinif: 3, duration: 30, professor: "" },
  { code: "BIL307", name: "Mikroişlemciler", sinif: 3, duration: 30, professor: "" },
  // 6. Dönem
  { code: "BIL308", name: "Bilgisayar Mimarisi ve Organizasyonu", sinif: 3, duration: 30, professor: "" },
  { code: "BIL312", name: "Web Tasarımı ve Programlama", sinif: 3, duration: 30, professor: "" },
  { code: "BIL314", name: "Otomata Teorisi ve Formal Diller", sinif: 3, duration: 30, professor: "" },

  // ═══ 4. Sınıf (7. ve 8. Dönem) ═══
  { code: "BIL425", name: "Derin Öğrenme", sinif: 4, duration: 30, professor: "Doç. Dr. Selim BÜYÜKOĞLU" },
  { code: "BIL401", name: "Bilgisayar Projesi I", sinif: 4, duration: 30, professor: "Dr. Öğr. Üyesi Fatih ISSI" },
  { code: "BIL325", name: "Mobil Programlama", sinif: 4, duration: 30, professor: "Dr. Öğr. Üyesi Osman GÜLER" },
  { code: "BIL403", name: "Yapay Zeka", sinif: 4, duration: 30, professor: "Dr. Öğr. Üyesi Taha ETEM" },
  { code: "BIL473", name: "Bilgi Güvenliği", sinif: 4, duration: 30, professor: "Dr. Mehmet Akif ALPER" },
  { code: "BIL432", name: "Görüntü İşleme", sinif: 4, duration: 30, professor: "Dr. Öğr. Üyesi Seda ŞAHİN" },
  { code: "BIL466", name: "Girişimcilik", sinif: 4, duration: 30, professor: "Dr. Öğr. Üyesi Osman GÜLER" },
  // 7. Dönem
  { code: "BIL401", name: "Bilgisayar Ağları", sinif: 4, duration: 30, professor: "" },
  { code: "BIL403", name: "Yazılım Mühendisliği İlkeleri", sinif: 4, duration: 30, professor: "" },
  // 8. Dönem
  { code: "BIL482", name: "Yönetim Bilişim Sistemleri", sinif: 4, duration: 30, professor: "" },
  { code: "BIL494", name: "Bitirme Projesi", sinif: 4, duration: 30, professor: "" },

  // ═══ Bölüm Seçmeli Dersler ═══
  { code: "BIL432", name: "Kriptografi ve Bilgi Güvenliği", sinif: 4, duration: 30, professor: "" },
  { code: "BIL325", name: "Siber Güvenliğe Giriş", sinif: 4, duration: 30, professor: "" },
  { code: "BIL466", name: "Biyobilişim ve Biyoteknoloji", sinif: 4, duration: 30, professor: "" },
  { code: "BIL323", name: "Sayısal İşaret İşleme", sinif: 4, duration: 30, professor: "" },
  { code: "MTH401", name: "Java & React JS ile Web Programlama Eğitimi", sinif: 4, duration: 30, professor: "" },
  { code: "BIL321", name: "Makine Öğrenmesi", sinif: 4, duration: 30, professor: "" },
  { code: "BIL411", name: "Sistem Mühendisliği", sinif: 4, duration: 30, professor: "" },
  { code: "BIL412", name: "İnsan Bilgisayar Etkileşimi", sinif: 4, duration: 30, professor: "" },
  { code: "BIL421", name: "E-Ticaret ve Dijital Dönüşüm", sinif: 4, duration: 30, professor: "" },
  { code: "BIL425", name: "Mobil Uygulama Geliştirme", sinif: 4, duration: 30, professor: "" },
  { code: "BIL427", name: "Oyun Teknolojileri", sinif: 4, duration: 30, professor: "" },
  { code: "BIL434", name: "Gömülü Sistemler", sinif: 4, duration: 30, professor: "" },
  { code: "BIL462", name: "Bulut Çözüme Giriş", sinif: 4, duration: 30, professor: "" },
  { code: "BIL471", name: "Sayısal Analiz Yöntemleri", sinif: 4, duration: 30, professor: "" },
  { code: "BIL473", name: "Bilgisayarlı Görme", sinif: 4, duration: 30, professor: "" },
  { code: "BIL476", name: "Veri Madenciliğine Giriş", sinif: 4, duration: 30, professor: "" },
  { code: "BIL477", name: "Örüntü Tanıma", sinif: 4, duration: 30, professor: "" },
  { code: "BIL481", name: "Yapay Zeka", sinif: 4, duration: 30, professor: "" },
  { code: "BIL483", name: "Çoklu Ortam Sistemleri", sinif: 4, duration: 30, professor: "" },
  { code: "BIL486", name: "Optimizasyon", sinif: 4, duration: 30, professor: "" },
  { code: "BIL493", name: "Gerçek Zamanlı Sistemler", sinif: 4, duration: 30, professor: "" },
  { code: "BIL496", name: "Sinyal İşleme Uygulamaları", sinif: 4, duration: 30, professor: "" },
  { code: "OSD144", name: "Siber Güvenlik ve Etik Hacker", sinif: 4, duration: 30, professor: "" },
  { code: "MTH404", name: "Yazılım Test ve Kalitesi", sinif: 4, duration: 30, professor: "" },
  { code: "BIL438", name: "Görüntü İşleme", sinif: 4, duration: 30, professor: "" },
  { code: "BIL474", name: "Tıp Bilişimi", sinif: 4, duration: 30, professor: "" },
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
  const names = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  return names[d.getDay()];
}

function getDayNameShort(d) {
  const names = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  return names[d.getDay()];
}

function getWeekDays(startDate, weeks) {
  const days = [];
  const start = new Date(startDate);
  const dayOfWeek = start.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + diff);

  const totalDays = weeks * 7;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
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

// ── Firebase helpers ──
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
  const [semester, setSemester] = useState(period?.semester || "Güz 2024-2025");
  const [saving, setSaving] = useState(false);

  const selectedType = EXAM_TYPES.find(t => t.value === examType);
  const endDate = useMemo(() => {
    if (!startDate || !selectedType) return "";
    const d = parseDateISO(startDate);
    d.setDate(d.getDate() + selectedType.weeks * 7 - 1);
    return formatDateISO(d);
  }, [startDate, selectedType]);

  const handleSave = async () => {
    if (!startDate) return alert("Başlangıç tarihi seçin");
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
      if (!ref) throw new Error("Firebase hazır değil");
      if (period?.id) {
        await ref.doc(period.id).update(data);
      } else {
        await ref.add(data);
      }
      onSave();
    } catch (e) {
      console.error("Period save error:", e);
      alert("Kayıt hatası: " + e.message);
    }
    setSaving(false);
  };

  return (
    <Modal open={true} title={period?.id ? "Dönemi Düzenle" : "Yeni Sınav Dönemi"} onClose={onClose} width={500}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FormField label="Dönem">
          <Select value={semester} onChange={e => setSemester(e.target.value)}>
            {["Güz 2024-2025", "Bahar 2024-2025", "Güz 2025-2026", "Bahar 2025-2026"].map(s =>
              <option key={s} value={s}>{s}</option>
            )}
          </Select>
        </FormField>
        <FormField label="Sınav Türü">
          <Select value={examType} onChange={e => setExamType(e.target.value)}>
            {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} ({t.weeks} hafta)</option>)}
          </Select>
        </FormField>
        <FormField label="Başlangıç Tarihi">
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </FormField>
        {endDate && (
          <div style={{ padding: 12, background: C.blueLight, borderRadius: 8, fontSize: 14 }}>
            Bitiş Tarihi: <strong>{formatDate(parseDateISO(endDate))}</strong> ({selectedType.weeks} hafta)
          </div>
        )}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <GhostBtn onClick={onClose}>İptal</GhostBtn>
          <Btn onClick={handleSave} disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Btn>
        </div>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// Edit Exam Modal
// ══════════════════════════════════════════════════════════════
const EditExamModal = ({ exam, professors, onSave, onRemove, onClose }) => {
  const [studentCount, setStudentCount] = useState(exam?.studentCount || "");
  const [supervisor, setSupervisor] = useState(exam?.supervisor || "");
  const [room, setRoom] = useState(exam?.room || "");
  const [duration, setDuration] = useState(exam?.duration || 30);
  const [professor, setProfessor] = useState(exam?.professor || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...exam,
        studentCount: parseInt(studentCount) || 0,
        supervisor,
        room,
        duration: parseInt(duration) || 30,
        professor,
      });
      onClose();
    } catch (e) {
      alert("Hata: " + e.message);
    }
    setSaving(false);
  };

  return (
    <Modal open={true} title="Sınav Detaylarını Düzenle" onClose={onClose} width={500}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ padding: 12, background: SINIF_COLORS[exam.sinif]?.bg || "#f0f0f0", borderRadius: 8, fontSize: 14 }}>
          <strong>{exam.code}</strong> - {exam.name}
        </div>
        <FormField label="Öğretim Üyesi">
          <Input value={professor} onChange={e => setProfessor(e.target.value)} placeholder="Hoca adı" list="prof-list" />
          <datalist id="prof-list">
            {(professors || []).map((p, i) => <option key={i} value={p.name} />)}
          </datalist>
        </FormField>
        <FormField label="Sınav Süresi (dk)">
          <Select value={duration} onChange={e => setDuration(e.target.value)}>
            {[30, 45, 60, 75, 90, 105, 120].map(d => <option key={d} value={d}>{d} dakika</option>)}
          </Select>
        </FormField>
        <FormField label="Öğrenci Sayısı">
          <Input type="number" value={studentCount} onChange={e => setStudentCount(e.target.value)} placeholder="Örn: 45" />
        </FormField>
        <FormField label="Gözetmen">
          <Input value={supervisor} onChange={e => setSupervisor(e.target.value)} placeholder="Gözetmen adı" />
        </FormField>
        <FormField label="Sınıf / Salon">
          <Input value={room} onChange={e => setRoom(e.target.value)} placeholder="Örn: D-201" />
        </FormField>
        <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 8 }}>
          <GhostBtn onClick={() => { onRemove(exam); onClose(); }} style={{ color: "#DC2626" }}>
            Takvimden Kaldır
          </GhostBtn>
          <div style={{ display: "flex", gap: 12 }}>
            <GhostBtn onClick={onClose}>İptal</GhostBtn>
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
  const [form, setForm] = useState({ code: "", name: "", sinif: 1, duration: 30, professor: "" });

  const startEdit = (c) => {
    setEditingCourse(c);
    setForm({ code: c.code, name: c.name, sinif: c.sinif, duration: c.duration, professor: c.professor });
  };

  const startNew = () => {
    setEditingCourse("new");
    setForm({ code: "", name: "", sinif: 1, duration: 30, professor: "" });
  };

  const handleSave = () => {
    if (!form.code || !form.name) return alert("Ders kodu ve adı gerekli");
    onSave(editingCourse === "new" ? null : editingCourse, form);
    setEditingCourse(null);
  };

  return (
    <Modal open={true} title="Ders Yönetimi" onClose={onClose} width={800}>
      <div style={{ maxHeight: 500, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.bg }}>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: `2px solid ${C.border}` }}>Kod</th>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: `2px solid ${C.border}` }}>Ders Adı</th>
              <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: `2px solid ${C.border}` }}>Sınıf</th>
              <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: `2px solid ${C.border}` }}>Süre</th>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: `2px solid ${C.border}` }}>Hoca</th>
              <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: `2px solid ${C.border}` }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "8px 12px" }}>
                  <Badge style={{ background: SINIF_COLORS[c.sinif]?.bg, color: SINIF_COLORS[c.sinif]?.text }}>{c.code}</Badge>
                </td>
                <td style={{ padding: "8px 12px" }}>{c.name}</td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>{c.sinif}. Sınıf</td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>{c.duration} dk</td>
                <td style={{ padding: "8px 12px", fontSize: 12 }}>{c.professor || "-"}</td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  <button onClick={() => startEdit(c)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: 13 }}>Düzenle</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingCourse && (
        <div style={{ marginTop: 16, padding: 16, background: C.bg, borderRadius: 8, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{editingCourse === "new" ? "Yeni Ders" : "Dersi Düzenle"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
            <FormField label="Ders Kodu">
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            </FormField>
            <FormField label="Ders Adı">
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </FormField>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12 }}>
            <FormField label="Sınıf">
              <Select value={form.sinif} onChange={e => setForm({ ...form, sinif: parseInt(e.target.value) })}>
                {[1, 2, 3, 4].map(s => <option key={s} value={s}>{s}. Sınıf</option>)}
              </Select>
            </FormField>
            <FormField label="Süre (dk)">
              <Select value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })}>
                {[30, 45, 60, 75, 90, 105, 120].map(d => <option key={d} value={d}>{d} dk</option>)}
              </Select>
            </FormField>
            <FormField label="Hoca">
              <Input
                value={form.professor}
                onChange={e => setForm({ ...form, professor: e.target.value })}
                placeholder="Hoca adı yazın..."
                list="course-prof-list"
              />
              <datalist id="course-prof-list">
                {professors.map((p, i) => <option key={i} value={p.name} />)}
              </datalist>
            </FormField>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <GhostBtn onClick={() => setEditingCourse(null)}>İptal</GhostBtn>
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
const DraggableCourseCard = ({ course, isPlaced, placedCount = 0 }) => {
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
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        padding: "8px 10px",
        background: color.bg,
        color: color.text,
        borderRadius: 6,
        fontSize: 12,
        cursor: "grab",
        border: `1px solid ${color.text}30`,
        transition: "all 0.2s",
        userSelect: "none",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600, fontSize: 12 }}>{course.code}</div>
        {placedCount > 0 && (
          <span style={{
            background: color.text, color: "white", borderRadius: 10,
            padding: "1px 6px", fontSize: 9, fontWeight: 700, minWidth: 16, textAlign: "center",
          }}>{placedCount}</span>
        )}
      </div>
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

  const examHere = placedExams.find(e => e.date === dateStr && e.timeSlot === timeSlot);

  const coveredBy = placedExams.find(e => {
    if (e.date !== dateStr) return false;
    const startIdx = timeToSlotIndex(e.timeSlot);
    const span = slotSpan(e.duration);
    return slotIndex > startIdx && slotIndex < startIdx + span;
  });

  if (coveredBy) return null;

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
            <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{examHere.studentCount} öğrenci</div>
          )}
        </div>
      )}
    </td>
  );
};

// ══════════════════════════════════════════════════════════════
// Table View
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
            <th style={{ padding: "10px 12px", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.2)" }}>Sınıf</th>
            <th style={{ padding: "10px 12px", textAlign: "left", borderRight: "1px solid rgba(255,255,255,0.2)" }}>Ders Kodu - İsmi</th>
            <th style={{ padding: "10px 12px", textAlign: "left", borderRight: "1px solid rgba(255,255,255,0.2)" }}>İlgili Öğretim Üyesi</th>
            <th style={{ padding: "10px 12px", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.2)" }}>Tarih - Saat - Süre</th>
            <th style={{ padding: "10px 12px", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.2)" }}>Öğrenci Sayısı</th>
            <th style={{ padding: "10px 12px", textAlign: "left", borderRight: "1px solid rgba(255,255,255,0.2)" }}>Gözetmen</th>
            <th style={{ padding: "10px 12px", textAlign: "center" }}>Sınıf/Salon</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#999" }}>
              Henüz takvime ders yerleştirilmedi. Sol panelden dersleri sürükleyip takvime bırakın.
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

  const header = "Sınıf;Ders Kodu;Ders Adı;Öğretim Üyesi;Tarih;Gün;Saat;Süre (dk);Öğrenci Sayısı;Gözetmen;Salon";
  const rows = sorted.map(e => {
    const d = parseDateISO(e.date);
    return [
      `${e.sinif}. Sınıf`,
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
    return `<tr>
      <td style="padding:6px;text-align:center">${e.sinif}. Sınıf</td>
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
    <head><meta charset="utf-8"><title>Sınav Programı</title></head>
    <body style="font-family:Calibri,sans-serif;font-size:11pt;background:white">
      <h2 style="text-align:center;color:#000">ÇAKÜ Bilgisayar Mühendisliği - Sınav Programı</h2>
      <p style="text-align:center;color:#333">${periodLabel || ""}</p>
      <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:10pt;background:white">
        <tr style="background:white;font-weight:bold">
          <th style="padding:8px;border:1px solid #000">Sınıf</th>
          <th style="padding:8px;border:1px solid #000">Ders Kodu - İsmi</th>
          <th style="padding:8px;border:1px solid #000">Öğretim Üyesi</th>
          <th style="padding:8px;border:1px solid #000">Tarih - Saat - Süre</th>
          <th style="padding:8px;border:1px solid #000">Öğrenci Sayısı</th>
          <th style="padding:8px;border:1px solid #000">Gözetmen</th>
          <th style="padding:8px;border:1px solid #000">Salon</th>
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

async function exportToXLSX(placedExams, periodLabel) {
  // Load SheetJS if not already loaded
  if (!window.XLSX) {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        script.onload = resolve;
        script.onerror = () => reject(new Error("SheetJS yüklenemedi"));
        document.head.appendChild(script);
      });
    } catch (e) {
      alert("Excel kütüphanesi yüklenemedi: " + e.message);
      return;
    }
  }

  const XLSX = window.XLSX;
  const wb = XLSX.utils.book_new();

  // Sort exams by date then time
  const sorted = [...placedExams].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.timeSlot.localeCompare(b.timeSlot);
  });

  // Auto-assign classrooms and supervisors
  const supervisorMap = assignSupervisorsToExams(sorted);

  const enriched = sorted.map(exam => {
    const key = exam.id || (exam.code + exam.date + exam.timeSlot);
    const room = assignClassroom(exam.studentCount);
    const supervisors = (supervisorMap[key] || []).join(", ");

    // Calculate end time
    const [sh, sm] = exam.timeSlot.split(":").map(Number);
    const totalMin = sh * 60 + sm + (exam.duration || 60);
    const eh = String(Math.floor(totalMin / 60)).padStart(2, "0");
    const em = String(totalMin % 60).padStart(2, "0");

    const dateObj = parseDateISO(exam.date);
    const dateStr = formatDate(dateObj);

    return {
      ...exam,
      assignedRoom: room,
      assignedSupervisors: supervisors,
      startStr: dateStr + " - " + exam.timeSlot,
      endStr: dateStr + " - " + eh + ":" + em,
      durationStr: (exam.duration || 60) + " dk",
    };
  });

  // ── Sheet 1: Liste (Tarihe göre sıralı) ──
  const listHeader = [
    "Dersin Adı", "Dersin Kodu", "Sınavın Başlama Tarihi ve Saati",
    "Sınavın Bitiş Tarihi ve Saati", "Sınav Süresi", "GÖZETMEN", "SINIF",
  ];
  const listRows = enriched.map(e => [
    e.name, e.code, e.startStr, e.endStr, e.durationStr, e.assignedSupervisors, e.assignedRoom,
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet([listHeader, ...listRows]);
  ws1["!cols"] = [
    { wch: 35 }, { wch: 18 }, { wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 60 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Liste (Tarihe göre sıralı)");

  // ── Group exams by date ──
  const examsByDate = {};
  enriched.forEach(e => {
    if (!examsByDate[e.date]) examsByDate[e.date] = [];
    examsByDate[e.date].push(e);
  });

  // ── Day time slots for grid ──
  const dayTimeSlots = [];
  for (let h = 8; h <= 18; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 8 && m === 0) continue;
      if (h === 18 && m > 30) continue;
      const startHH = String(h).padStart(2, "0");
      const startMM = String(m).padStart(2, "0");
      const endMin = h * 60 + m + 30;
      const endHH = String(Math.floor(endMin / 60)).padStart(2, "0");
      const endMM = String(endMin % 60).padStart(2, "0");
      dayTimeSlots.push(startHH + ":" + startMM + "-" + endHH + ":" + endMM);
    }
  }

  // ── Create a day sheet for each date ──
  Object.keys(examsByDate).sort().forEach(dateStr => {
    const dateObj = parseDateISO(dateStr);
    const dayName = getDayName(dateObj);
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const sheetName = dd + "." + mm + "-" + dayName;

    const data = [];

    // Row 1: DERSLİKLER header
    const row1 = new Array(ALL_FACULTY_CLASSROOMS.length + 1).fill("");
    row1[Math.floor(ALL_FACULTY_CLASSROOMS.length / 2)] = "DERSLİKLER";
    data.push(row1);

    // Row 2: Kapasite
    const row2 = ["Kapasite"];
    ALL_FACULTY_CLASSROOMS.forEach(c => row2.push(c.capacity));
    data.push(row2);

    // Row 3: Saatler / Room names
    const row3 = ["Saatler"];
    ALL_FACULTY_CLASSROOMS.forEach(c => row3.push(c.name));
    data.push(row3);

    // Time slot rows
    const dayExams = examsByDate[dateStr];

    dayTimeSlots.forEach(slot => {
      const row = [slot];
      const slotStart = slot.split("-")[0];
      const [slotH, slotM] = slotStart.split(":").map(Number);
      const slotMin = slotH * 60 + slotM;

      ALL_FACULTY_CLASSROOMS.forEach(classroom => {
        const exam = dayExams.find(e => {
          const rooms = e.assignedRoom.split(" - ").map(r => r.trim());
          if (!rooms.includes(classroom.name)) return false;
          const [eH, eM] = e.timeSlot.split(":").map(Number);
          const examStart = eH * 60 + eM;
          const examEnd = examStart + (e.duration || 60);
          return slotMin >= examStart && slotMin < examEnd;
        });
        row.push(exam ? exam.code : "");
      });

      data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const cols = [{ wch: 14 }];
    ALL_FACULTY_CLASSROOMS.forEach(() => cols.push({ wch: 14 }));
    ws["!cols"] = cols;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // Download
  const safeName = (periodLabel || "export").replace(/[^a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ ]/g, "_");
  XLSX.writeFile(wb, "sinav_programi_" + safeName + ".xlsx");
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
  const [viewMode, setViewMode] = useState("calendar");
  const [editingExam, setEditingExam] = useState(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [filterSinif, setFilterSinif] = useState(0);

  // ── Seed data to Firebase ──
  const seedData = async () => {
    const cRef = getCoursesRef();
    const pRef = getProfessorsRef();
    if (!cRef || !pRef) return;

    try {
      const existingCourses = await cRef.get();
      if (!existingCourses.empty) {
        if (!confirm("Veritabanında zaten dersler var. Üzerine yazılsın mı?")) return;
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

      for (const prof of SEED_PROFESSORS) {
        await pRef.add({ ...prof, createdAt: new Date().toISOString() });
      }

      for (const course of SEED_COURSES) {
        await cRef.add({ ...course, studentCount: 0, createdAt: new Date().toISOString() });
      }

      alert("Veriler başarıyla yüklendi! " + SEED_COURSES.length + " ders, " + SEED_PROFESSORS.length + " hoca eklendi.");
      loadData();
    } catch (e) {
      console.error("Seed error:", e);
      alert("Seed hatası: " + e.message);
    }
  };

  // ── Sync: add missing courses from SEED_COURSES to Firebase ──
  const syncCourses = async () => {
    const cRef = getCoursesRef();
    if (!cRef) return;

    try {
      const existingSnap = await cRef.get();
      const existingCourses = existingSnap.docs.map(d => d.data());

      const missing = SEED_COURSES.filter(seed => {
        return !existingCourses.some(ex => ex.code === seed.code && ex.name === seed.name);
      });

      if (missing.length === 0) {
        alert("Tüm dersler zaten mevcut, eklenecek yeni ders yok.");
        return;
      }

      if (!confirm(missing.length + " yeni ders eklenecek. Devam edilsin mi?")) return;

      for (const course of missing) {
        await cRef.add({ ...course, studentCount: 0, createdAt: new Date().toISOString() });
      }

      alert(missing.length + " ders başarıyla eklendi!");
      loadData();
    } catch (e) {
      console.error("Sync error:", e);
      alert("Senkronizasyon hatası: " + e.message);
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

  const activePeriod = periods.find(p => p.id === activePeriodId);
  const periodExams = placedExams.filter(e => e.periodId === activePeriodId);

  const calendarDays = useMemo(() => {
    if (!activePeriod?.startDate) return [];
    return getWeekDays(parseDateISO(activePeriod.startDate), activePeriod.weeks || 2);
  }, [activePeriod]);

  const poolCourses = useMemo(() => {
    let filtered = courses;
    if (filterSinif > 0) {
      filtered = filtered.filter(c => c.sinif === filterSinif);
    }
    return filtered.map(c => ({
      ...c,
      placedCount: periodExams.filter(e => e.courseId === c.id).length,
    }));
  }, [courses, periodExams, filterSinif]);

  const groupedPool = useMemo(() => {
    const groups = { 1: [], 2: [], 3: [], 4: [] };
    poolCourses.forEach(c => {
      if (groups[c.sinif]) groups[c.sinif].push(c);
    });
    return groups;
  }, [poolCourses]);

  // ── Drop handler ──
  const handleDrop = async (courseData, dateStr, timeSlot) => {
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
      alert(`Çakışma! ${conflict.code} aynı sınıf (${courseData.sinif}. Sınıf) için aynı zaman diliminde zaten var.`);
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
      if (!ref) throw new Error("Firebase hazır değil");
      const docRef = await ref.add(examData);
      setPlacedExams(prev => [...prev, { id: docRef.id, ...examData }]);
    } catch (e) {
      console.error("Drop save error:", e);
      alert("Kayıt hatası: " + e.message);
    }
  };

  const handleUpdateExam = async (updatedExam) => {
    try {
      const ref = getExamsRef();
      if (!ref) throw new Error("Firebase hazır değil");
      const { id, ...data } = updatedExam;
      await ref.doc(id).update(data);
      setPlacedExams(prev => prev.map(e => e.id === id ? updatedExam : e));
    } catch (e) {
      console.error("Update error:", e);
      throw e;
    }
  };

  const handleRemoveExam = async (exam) => {
    try {
      const ref = getExamsRef();
      if (!ref) throw new Error("Firebase hazır değil");
      await ref.doc(exam.id).delete();
      setPlacedExams(prev => prev.filter(e => e.id !== exam.id));
    } catch (e) {
      console.error("Remove error:", e);
      alert("Silme hatası: " + e.message);
    }
  };

  const handleCourseSave = async (existingCourse, formData) => {
    try {
      const ref = getCoursesRef();
      if (!ref) throw new Error("Firebase hazır değil");
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

  const handlePeriodSave = () => {
    setShowPeriodModal(false);
    setEditingPeriod(null);
    loadData();
  };

  const handleDeletePeriod = async (periodId) => {
    if (!confirm("Bu dönemi silmek istediğinize emin misiniz? Bu döneme ait tüm sınav yerleştirmeleri de silinecek.")) return;
    try {
      const perRef = getPeriodsRef();
      const exRef = getExamsRef();
      if (perRef) await perRef.doc(periodId).delete();
      if (exRef) {
        const snap = await exRef.where("periodId", "==", periodId).get();
        const batch = window.firebase.firestore().batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
      if (activePeriodId === periodId) setActivePeriodId(null);
      loadData();
    } catch (e) {
      alert("Silme hatası: " + e.message);
    }
  };

  const handleResetPlacements = async () => {
    if (!activePeriodId) return;
    if (!confirm("Bu dönemdeki tüm sınav yerleşimlerini sıfırlamak istediğinize emin misiniz?")) return;
    try {
      const ref = getExamsRef();
      if (!ref) return;
      const snap = await ref.where("periodId", "==", activePeriodId).get();
      const batch = window.firebase.firestore().batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      setPlacedExams(prev => prev.filter(e => e.periodId !== activePeriodId));
    } catch (e) {
      alert("Sıfırlama hatası: " + e.message);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <Card>
        <div style={{ padding: 60, textAlign: "center", color: "#999" }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>Yükleniyor...</div>
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
            Sınav Programı Otomasyonu
          </h2>
          <p style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
            Dersleri sürükleyerek takvime yerleştirin
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isAdmin && courses.length === 0 && (
            <Btn onClick={seedData} style={{ background: "#059669" }}>
              Örnek Verileri Yükle
            </Btn>
          )}
          {isAdmin && courses.length > 0 && (
            <GhostBtn onClick={syncCourses} style={{ fontSize: 12 }}>
              Eksik Dersleri Ekle
            </GhostBtn>
          )}
          {isAdmin && (
            <GhostBtn onClick={() => setShowCourseModal(true)}>Ders Yönetimi</GhostBtn>
          )}
          {isAdmin && (
            <GhostBtn onClick={() => { setEditingPeriod(null); setShowPeriodModal(true); }}>
              + Yeni Dönem
            </GhostBtn>
          )}
        </div>
      </div>

      {/* Period Selector */}
      {periods.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>Sınav Dönemi:</span>
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
                    title="Düzenle"
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
            <div style={{ fontSize: 16, marginBottom: 8 }}>Sınav dönemi bulunamadı</div>
            <div style={{ fontSize: 13 }}>
              {isAdmin
                ? "Yeni bir sınav dönemi oluşturun (Final, Vize veya Bütünleme)"
                : "Yönetici henüz bir sınav dönemi oluşturmadı"}
            </div>
            {isAdmin && (
              <Btn onClick={() => { setEditingPeriod(null); setShowPeriodModal(true); }} style={{ marginTop: 16 }}>
                + Yeni Dönem Oluştur
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
                {periodExams.length}/{courses.length} ders yerleştirildi
              </span>
              {periodExams.length > 0 && (
                <>
                  <GhostBtn onClick={() => exportToCSV(periodExams, activePeriod.label)} style={{ fontSize: 12, padding: "4px 10px" }}>
                    CSV
                  </GhostBtn>
                  <GhostBtn onClick={() => exportToWord(periodExams, activePeriod.label)} style={{ fontSize: 12, padding: "4px 10px" }}>
                    Word
                  </GhostBtn>
                  <GhostBtn onClick={() => exportToXLSX(periodExams, activePeriod.label)} style={{ fontSize: 12, padding: "4px 10px", background: "#059669", color: "white", border: "none" }}>
                    XLSX
                  </GhostBtn>
                  {isAdmin && (
                    <GhostBtn onClick={handleResetPlacements} style={{ fontSize: 12, padding: "4px 10px", color: "#DC2626" }}>
                      Sıfırla
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
                    <option value={0}>Tüm Sınıflar</option>
                    {[1, 2, 3, 4].map(s => <option key={s} value={s}>{s}. Sınıf</option>)}
                  </select>
                </div>

                {[1, 2, 3, 4].map(sinif => {
                  if (filterSinif > 0 && filterSinif !== sinif) return null;
                  const group = groupedPool[sinif];
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
                        {group.map((c, i) => (
                          <DraggableCourseCard key={c.id || i} course={c} isPlaced={false} placedCount={c.placedCount} />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {poolCourses.length === 0 && (
                  <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 12 }}>
                    Ders bulunamadı
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
                    Takvim günleri bulunamadı. Dönem tarihlerini kontrol edin.
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
          professors={professors}
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
