// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Ortak Bileşenler
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef } = React;

// ── Color Palette ──
const C = {
  bg: "#F7F5F0",
  card: "#FFFFFF",
  navy: "#1B2A4A",
  navyLight: "#2D4A7A",
  gold: "#C4973B",
  goldLight: "#E8D5A8",
  goldPale: "#FBF6EC",
  accent: "#8B2635",
  accentLight: "#D4A0A7",
  green: "#2E7D52",
  greenLight: "#D4EDDA",
  text: "#2C2C2C",
  textMuted: "#6B7280",
  border: "#E5E1D8",
  borderLight: "#F0EDE6",
  blue: "#3B82F6",
  blueLight: "#DBEAFE",
};

const FONTS_LINK = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

// ── Styles ──
const sharedStyles = {
  global: `
    @import url('${FONTS_LINK}');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Source Sans 3', sans-serif; -webkit-font-smoothing: antialiased; }
  `,
};

// ── Home Institution Course Catalog ──
const HOME_INSTITUTION_CATALOG = {
  name: "Çankırı Karatekin Üniversitesi",
  department: "Bilgisayar Mühendisliği",
  courses: [
    { code: "TDİ101", name: "Türk Dili I", credits: 2, year: 1, semester: "Fall", type: "Zorunlu" },
    { code: "BİL111", name: "Bilgisayar Programlama I", credits: 5, year: 1, semester: "Fall", type: "Zorunlu" },
    { code: "BİL113", name: "Bilgisayar Mühendisliği Etiği", credits: 4, year: 1, semester: "Fall", type: "Zorunlu" },
    { code: "ATA101", name: "Atatürk İlkeleri ve İnkılâp Tarihi I", credits: 2, year: 1, semester: "Fall", type: "Zorunlu" },
    { code: "FİZ161", name: "Genel Fizik I", credits: 5, year: 1, semester: "Fall", type: "Zorunlu" },
    { code: "BİL101", name: "Bilgisayar Mühendisliğine Giriş", credits: 5, year: 1, semester: "Fall", type: "Zorunlu" },
    { code: "OZD101", name: "Kariyer Planlama", credits: 1, year: 1, semester: "Fall", type: "Zorunlu" },
    { code: "MAT161", name: "Matematik I", credits: 5, year: 1, semester: "Fall", type: "Zorunlu" },
    { code: "ATA102", name: "Atatürk İlkeleri ve İnkılâp Tarihi II", credits: 2, year: 1, semester: "Spring", type: "Zorunlu" },
    { code: "TDİ102", name: "Türk Dili II", credits: 2, year: 1, semester: "Spring", type: "Zorunlu" },
    { code: "BİL132", name: "Bilgisayar Programlama II", credits: 7, year: 1, semester: "Spring", type: "Zorunlu" },
    { code: "MAT162", name: "Matematik II", credits: 5, year: 1, semester: "Spring", type: "Zorunlu" },
    { code: "FİZ162", name: "Genel Fizik II", credits: 5, year: 1, semester: "Spring", type: "Zorunlu" },
    { code: "MAT142", name: "Ayrık Matematik ve Uygulamaları", credits: 5, year: 1, semester: "Spring", type: "Zorunlu" },
    { code: "BİL231", name: "Bilgisayar Mühendisliğinde Mesleki İngilizce", credits: 4, year: 2, semester: "Fall", type: "Zorunlu" },
    { code: "BİL201", name: "Algoritma ve Veri Yapıları I", credits: 6, year: 2, semester: "Fall", type: "Zorunlu" },
    { code: "BİL203", name: "Nesnesel Tasarım ve Programlama", credits: 7, year: 2, semester: "Fall", type: "Zorunlu" },
    { code: "BİL205", name: "Sayısal Sistem Tasarımı", credits: 7, year: 2, semester: "Fall", type: "Zorunlu" },
    { code: "MAT221", name: "Doğrusal Cebir", credits: 6, year: 2, semester: "Fall", type: "Zorunlu" },
    { code: "BİL222", name: "Differansiyel Denklemler", credits: 5, year: 2, semester: "Spring", type: "Zorunlu" },
    { code: "BİL232", name: "Mühendislik Ekonomisi", credits: 5, year: 2, semester: "Spring", type: "Zorunlu" },
    { code: "BİL202", name: "Algoritma ve Veri Yapıları II", credits: 6, year: 2, semester: "Spring", type: "Zorunlu" },
    { code: "BİL206", name: "Elektrik ve Elektronik Devrelerinin Temelleri", credits: 5, year: 2, semester: "Spring", type: "Zorunlu" },
    { code: "BİL212", name: "Olasılık Teorisi ve İstatistik", credits: 5, year: 2, semester: "Spring", type: "Zorunlu" },
    { code: "BİL200", name: "Staj I", credits: 4, year: 2, semester: "Spring", type: "Zorunlu" },
    { code: "BİL305", name: "İşletim Sistemleri", credits: 6, year: 3, semester: "Fall", type: "Zorunlu" },
    { code: "BİL307", name: "Mikroişlemciler", credits: 7, year: 3, semester: "Fall", type: "Zorunlu" },
    { code: "BİL301", name: "Programlama Dilleri", credits: 6, year: 3, semester: "Fall", type: "Zorunlu" },
    { code: "BİL303", name: "Veritabanı Sistemleri", credits: 7, year: 3, semester: "Fall", type: "Zorunlu" },
    { code: "BİL308", name: "Bilgisayar Mimarisi ve Organizasyonu", credits: 6, year: 3, semester: "Spring", type: "Zorunlu" },
    { code: "BİL312", name: "Web Tasarımı ve Programlama", credits: 5, year: 3, semester: "Spring", type: "Zorunlu" },
    { code: "BİL314", name: "Otomata Teorisi ve Formal Diller", credits: 5, year: 3, semester: "Spring", type: "Zorunlu" },
    { code: "BİL300", name: "Staj II", credits: 4, year: 3, semester: "Spring", type: "Zorunlu" },
    { code: "BİL401", name: "Bilgisayar Ağları", credits: 7, year: 4, semester: "Fall", type: "Zorunlu" },
    { code: "BİL403", name: "Yazılım Mühendisliği İlkeleri", credits: 6, year: 4, semester: "Fall", type: "Zorunlu" },
    { code: "BİL482", name: "Yönetim Bilişim Sistemleri", credits: 6, year: 4, semester: "Spring", type: "Zorunlu" },
    { code: "BİL494", name: "Bitirme Projesi", credits: 6, year: 4, semester: "Spring", type: "Zorunlu" },
    { code: "SEÇ301", name: "Bilgisayar Grafiği", credits: 5, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ302", name: "Yapay Zeka", credits: 6, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ303", name: "Mobil Programlama", credits: 5, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ304", name: "Görüntü İşleme", credits: 6, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ305", name: "Makine Öğrenmesi", credits: 6, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ306", name: "Bulut Bilişim", credits: 5, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ307", name: "Siber Güvenlik", credits: 5, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ308", name: "Veri Madenciliği", credits: 6, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ309", name: "Derin Öğrenme", credits: 6, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ310", name: "Gömülü Sistemler", credits: 5, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ311", name: "IoT ve Uygulamaları", credits: 5, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ312", name: "Blockchain Teknolojileri", credits: 5, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ313", name: "Oyun Programlama", credits: 6, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ314", name: "Doğal Dil İşleme", credits: 6, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ315", name: "Bilgisayar Güvenliği", credits: 5, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ401", name: "Girişimcilik", credits: 3, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ402", name: "Proje Yönetimi", credits: 4, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ403", name: "İnovasyon Yönetimi", credits: 3, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ404", name: "Teknik İletişim", credits: 3, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ405", name: "Mesleki İngilizce", credits: 4, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ406", name: "Patent ve Fikri Mülkiyet Hakları", credits: 3, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ407", name: "Takım Çalışması ve Liderlik", credits: 3, year: 0, semester: "Any", type: "Seçmeli" },
    { code: "SEÇ408", name: "Araştırma Yöntemleri", credits: 4, year: 0, semester: "Any", type: "Seçmeli" },
  ]
};

// ── Grade Conversion System ──
const GRADE_CONVERSION = {
  table1: {
    "very good": "A",
    "good +": "B1",
    "good": "B2",
    "sufficient +": "B3",
    "sufficient": "C1",
    "allowing +": "C2",
    "allowing": "C3",
    "insufficient": "F1",
  },
  numericToGrade: (score) => {
    const num = parseFloat(score);
    if (num >= 90) return "A";
    if (num >= 85) return "B1";
    if (num >= 80) return "B2";
    if (num >= 75) return "B3";
    if (num >= 70) return "C1";
    if (num >= 65) return "C2";
    if (num >= 60) return "C3";
    if (num >= 50) return "F1";
    return "F2";
  },
  letterGrades: {
    "AA": "A", "A+": "A", "A": "A",
    "BA": "B1", "A-": "B1",
    "BB": "B2", "B+": "B2", "B": "B2",
    "CB": "B3", "B-": "B3",
    "CC": "C1", "C+": "C1", "C": "C1",
    "DC": "C2", "C-": "C2",
    "DD": "C3", "D+": "C3", "D": "C3",
    "FF": "F1", "F": "F1",
    "FD": "F2", "F-": "F2",
  },
  ectsGrades: {
    "A": "A", "B": "B1", "C": "B2", "D": "C1", "E": "C3", "FX": "F1", "F": "F2",
  },
  scale10: {
    "10": "A", "9": "B1", "8": "B2", "7": "B3", "6": "C1", "5": "C2", "4": "C3",
    "3": "F2", "2": "F2", "1": "F2", "0": "F2",
  },
  scale5a: {
    "5": "A", "5.0": "A", "4.5": "B1", "4": "B2", "4.0": "B2", "3.5": "B3",
    "3": "C1", "3.0": "C1", "2.5": "C2", "2": "C3", "2.0": "C3",
    "1.5": "F2", "1": "F2", "1.0": "F2", "0.5": "F2", "0": "F2", "0.0": "F2",
  },
  scale5b: {
    "5": "A", "5.0": "A", "4.5": "B1", "4": "B2", "4.0": "B2", "3.5": "C1",
    "3": "C2", "3.0": "C2", "2.5": "C3", "2": "F2", "2.0": "F2",
  },
  scale5c: {
    "5": "A", "5.0": "A", "4": "B2", "4.0": "B2", "3": "C1", "3.0": "C1",
    "2": "C3", "2.0": "C3", "1": "F1", "1.0": "F1", "0": "F2", "0.0": "F2",
  },
  scale5d: {
    "5": "A", "5.0": "A", "4.5": "B1", "4": "B2", "4.0": "B2", "3.5": "C1",
    "3": "C2", "3.0": "C2", "2.5": "C3", "2": "F2", "2.0": "F2",
  },
};

const convertGrade = (inputGrade, system = "auto") => {
  if (!inputGrade) return "Muaf";
  const grade = inputGrade.toString().trim().toUpperCase();
  if (system === "auto") {
    if (/^[A-F]X?$/.test(grade)) return GRADE_CONVERSION.ectsGrades[grade] || grade;
    if (GRADE_CONVERSION.letterGrades[grade]) return GRADE_CONVERSION.letterGrades[grade];
    const num = parseFloat(grade);
    if (!isNaN(num)) {
      if (num <= 4) return GRADE_CONVERSION.numericToGrade(num * 25);
      if (num <= 5) return GRADE_CONVERSION.scale5a[grade] || GRADE_CONVERSION.numericToGrade(num * 20);
      if (num <= 10) return GRADE_CONVERSION.scale10[Math.floor(num).toString()] || GRADE_CONVERSION.numericToGrade(num * 10);
      return GRADE_CONVERSION.numericToGrade(num);
    }
    const lowerGrade = inputGrade.toLowerCase();
    if (GRADE_CONVERSION.table1[lowerGrade]) return GRADE_CONVERSION.table1[lowerGrade];
  }
  return inputGrade;
};

// ── Firebase Database Functions ──
const FirebaseDB = {
  db: () => window.firebase?.firestore(),

  // Erasmus collections
  studentsRef: () => FirebaseDB.db()?.collection('students'),
  usersRef: () => FirebaseDB.db()?.collection('users'),
  passwordsRef: () => FirebaseDB.db()?.collection('passwords'),

  // Exam collections
  examsRef: () => FirebaseDB.db()?.collection('exams'),
  examResultsRef: () => FirebaseDB.db()?.collection('exam_results'),

  // ── Erasmus Student CRUD ──
  async fetchStudents() {
    try {
      const snapshot = await FirebaseDB.studentsRef().get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  },
  async addStudent(student) {
    try {
      const docRef = await FirebaseDB.studentsRef().add({
        ...student,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      });
      return { ...student, id: docRef.id };
    } catch (error) {
      console.error('Error adding student:', error);
      throw error;
    }
  },
  async updateStudent(id, student) {
    try {
      const docId = String(id);
      await FirebaseDB.studentsRef().doc(docId).update({
        ...student,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      });
      return student;
    } catch (error) {
      console.error('Error updating student:', error);
      throw error;
    }
  },
  async deleteStudent(id) {
    try {
      const docId = String(id);
      await FirebaseDB.studentsRef().doc(docId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  },
  async fetchPasswords() {
    try {
      const doc = await FirebaseDB.passwordsRef().doc('student_passwords').get();
      return doc.exists ? doc.data() : {};
    } catch (error) {
      console.error('Error fetching passwords:', error);
      return {};
    }
  },
  async updatePassword(studentNumber, newPassword) {
    try {
      const passwords = await FirebaseDB.fetchPasswords();
      passwords[studentNumber] = newPassword;
      await FirebaseDB.passwordsRef().doc('student_passwords').set(passwords);
      return true;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  },

  // ── Exam CRUD ──
  async fetchExams(semester) {
    try {
      let query = FirebaseDB.examsRef();
      if (semester && semester !== 'all') {
        query = query.where('semester', '==', semester);
      }
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } catch (error) {
      console.error('Error fetching exams:', error);
      return [];
    }
  },
  async addExam(exam) {
    try {
      const docRef = await FirebaseDB.examsRef().add({
        ...exam,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      });
      return { ...exam, id: docRef.id };
    } catch (error) {
      console.error('Error adding exam:', error);
      throw error;
    }
  },
  async updateExam(id, exam) {
    try {
      await FirebaseDB.examsRef().doc(String(id)).update({
        ...exam,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      });
      return exam;
    } catch (error) {
      console.error('Error updating exam:', error);
      throw error;
    }
  },
  async deleteExam(id) {
    try {
      await FirebaseDB.examsRef().doc(String(id)).delete();
      return true;
    } catch (error) {
      console.error('Error deleting exam:', error);
      throw error;
    }
  },
  async fetchExamResults(examId) {
    try {
      const snapshot = await FirebaseDB.examResultsRef().where('examId', '==', examId).get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } catch (error) {
      console.error('Error fetching exam results:', error);
      return [];
    }
  },
  async addExamResult(result) {
    try {
      const docRef = await FirebaseDB.examResultsRef().add({
        ...result,
        enteredAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      });
      return { ...result, id: docRef.id };
    } catch (error) {
      console.error('Error adding exam result:', error);
      throw error;
    }
  },
  async updateExamResult(id, result) {
    try {
      await FirebaseDB.examResultsRef().doc(String(id)).update(result);
      return result;
    } catch (error) {
      console.error('Error updating exam result:', error);
      throw error;
    }
  },
  async deleteExamResult(id) {
    try {
      await FirebaseDB.examResultsRef().doc(String(id)).delete();
      return true;
    } catch (error) {
      console.error('Error deleting exam result:', error);
      throw error;
    }
  },
};

// ── Icons ──
const UploadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2h4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const FileTextIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);

// ── UI Components ──
const Card = ({ children, title, actions, noPadding }) => (
  <div style={{
    background: C.card,
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    border: `1px solid ${C.border}`,
    marginBottom: 24,
  }}>
    {title && (
      <div style={{
        padding: "20px 24px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <h2 style={{
          fontSize: 18,
          fontWeight: 600,
          color: C.navy,
          fontFamily: "'Playfair Display', serif",
        }}>{title}</h2>
        {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
      </div>
    )}
    <div style={{ padding: noPadding ? 0 : 24 }}>{children}</div>
  </div>
);

const Btn = ({ children, onClick, variant = "primary", icon, small, disabled }) => {
  const btnStyles = {
    primary: { bg: C.navy, color: "#fff", hoverBg: C.navyLight },
    secondary: { bg: C.border, color: C.text, hoverBg: C.borderLight },
    success: { bg: C.green, color: "#fff", hoverBg: "#247d4d" },
    danger: { bg: C.accent, color: "#fff", hoverBg: "#6d1d29" },
  };
  const s = btnStyles[variant];
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: small ? "8px 14px" : "10px 18px",
        borderRadius: 8,
        border: "none",
        background: disabled ? C.border : (hover ? s.hoverBg : s.bg),
        color: disabled ? C.textMuted : s.color,
        fontSize: small ? 13 : 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'Source Sans 3', sans-serif",
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "all 0.2s",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {children}
    </button>
  );
};

const Input = ({ value, onChange, placeholder, type = "text", disabled, ...rest }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    {...rest}
    style={{
      width: "100%",
      padding: "10px 14px",
      borderRadius: 8,
      border: `1px solid ${C.border}`,
      fontSize: 14,
      fontFamily: "'Source Sans 3', sans-serif",
      outline: "none",
      transition: "all 0.2s",
      background: disabled ? C.bg : C.card,
      ...(rest.style || {}),
    }}
    onFocus={e => e.target.style.borderColor = C.navy}
    onBlur={e => e.target.style.borderColor = C.border}
  />
);

const Select = ({ value, onChange, options, placeholder }) => (
  <select
    value={value}
    onChange={onChange}
    style={{
      width: "100%",
      padding: "10px 14px",
      borderRadius: 8,
      border: `1px solid ${C.border}`,
      fontSize: 14,
      fontFamily: "'Source Sans 3', sans-serif",
      outline: "none",
      background: C.card,
      cursor: "pointer",
    }}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((opt, i) => (
      <option key={i} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

const FormField = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{
      display: "block",
      fontSize: 11,
      fontWeight: 700,
      color: C.navy,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      marginBottom: 8,
    }}>{label}</label>
    {children}
  </div>
);

const Modal = ({ open, onClose, title, children, width = 700 }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.card, borderRadius: 12, width: "100%", maxWidth: width,
          maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div style={{
            padding: "20px 24px", borderBottom: `1px solid ${C.border}`,
            position: "sticky", top: 0, background: C.card, zIndex: 1,
          }}>
            <h2 style={{
              fontSize: 20, fontWeight: 600, color: C.navy,
              fontFamily: "'Playfair Display', serif",
            }}>{title}</h2>
          </div>
        )}
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
};

const Badge = ({ children, color = C.green, bg = C.greenLight }) => (
  <span style={{
    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
    color, background: bg, display: "inline-flex", alignItems: "center", gap: 6,
  }}>{children}</span>
);

// ── Login Modal ──
const LoginModal = ({ onLogin }) => {
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const ADMIN_PASSWORD = "\x31\x36\x30\x35";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isAdminMode) {
        if (password === ADMIN_PASSWORD) {
          onLogin({ role: 'admin', name: 'Admin', studentNumber: null });
        } else {
          setError("Admin sifresi yanlis!");
        }
      } else {
        if (!studentNumber.trim()) { setError("Ogrenci numarasi gerekli!"); return; }
        const passwords = await FirebaseDB.fetchPasswords();
        if (passwords[studentNumber] === password) {
          const students = await FirebaseDB.fetchStudents();
          const student = students.find(s => s.studentNumber === studentNumber);
          if (student) {
            onLogin({ role: 'student', name: `${student.firstName} ${student.lastName}`, studentNumber });
          } else {
            setError("Ogrenci bulunamadi!");
          }
        } else {
          setError("Ogrenci numarasi veya sifre yanlis!");
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError("Giris sirasinda hata olustu. Lutfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 10000, padding: 20,
    }}>
      <div style={{
        background: C.card, borderRadius: 16, maxWidth: 450, width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden",
      }}>
        <div style={{
          padding: 32, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white", textAlign: "center",
        }}>
          <h2 style={{
            margin: 0, fontSize: 28, fontWeight: 700,
            fontFamily: "'Playfair Display', serif", marginBottom: 8,
          }}>CAKU Yonetim Sistemi</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>Cankiri Karatekin Universitesi</p>
        </div>
        <div style={{ display: "flex", padding: 24, paddingBottom: 0 }}>
          <button onClick={() => setIsAdminMode(false)} style={{
            flex: 1, padding: "12px 24px", border: "none",
            background: !isAdminMode ? C.navy : "transparent",
            color: !isAdminMode ? "white" : C.textMuted,
            borderRadius: "8px 8px 0 0", cursor: "pointer", fontWeight: 600, fontSize: 14,
          }}>Ogrenci Girisi</button>
          <button onClick={() => setIsAdminMode(true)} style={{
            flex: 1, padding: "12px 24px", border: "none",
            background: isAdminMode ? C.navy : "transparent",
            color: isAdminMode ? "white" : C.textMuted,
            borderRadius: "8px 8px 0 0", cursor: "pointer", fontWeight: 600, fontSize: 14,
          }}>Admin Girisi</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {!isAdminMode && (
            <FormField label="Ogrenci Numarasi">
              <Input value={studentNumber} onChange={e => setStudentNumber(e.target.value)} placeholder="Orn: AND43" autoFocus />
            </FormField>
          )}
          <FormField label="Sifre">
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={isAdminMode ? "Admin sifresi" : "Ogrenci sifresi"} autoFocus={isAdminMode} />
          </FormField>
          {error && (
            <div style={{ padding: 12, background: "#FEE2E2", color: "#991B1B", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}
          <Btn onClick={handleSubmit}>{isAdminMode ? "Admin Olarak Giris Yap" : "Ogrenci Olarak Giris Yap"}</Btn>
          <div style={{ marginTop: 16, padding: 12, background: C.bg, borderRadius: 8, fontSize: 12, color: C.textMuted }}>
            <strong>Bilgi:</strong><br />
            {isAdminMode ? (
              <>Admin girisi icin yetkili sifrenizi kullanin.</>
            ) : (
              <>Varsayilan ogrenci sifresi: <code style={{background: "white", padding: "2px 6px", borderRadius: 4}}>1234</code></>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Password Management Modal ──
const PasswordManagementModal = ({ students, onClose }) => {
  const [passwords, setPasswords] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPasswords(); }, []);

  const loadPasswords = async () => {
    try {
      const fetched = await FirebaseDB.fetchPasswords();
      setPasswords(fetched);
    } catch (error) {
      console.error('Error loading passwords:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await FirebaseDB.passwordsRef().doc('student_passwords').set(passwords);
      alert('Sifreler kaydedildi!');
      onClose();
    } catch (error) {
      console.error('Error saving passwords:', error);
      alert('Sifreler kaydedilirken hata olustu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Sifre Yonetimi" width={800}>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>Yukleniyor...</div>
      ) : (
        <div>
          <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Ogrenci No</th>
                  <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Ad Soyad</th>
                  <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Sifre</th>
                  <th style={{ padding: 12, textAlign: 'center', borderBottom: `2px solid ${C.border}` }}>Islem</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.studentNumber} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: 12, fontWeight: 600, color: C.navy }}>{student.studentNumber}</td>
                    <td style={{ padding: 12 }}>{student.firstName} {student.lastName}</td>
                    <td style={{ padding: 12 }}>
                      <Input type="text" value={passwords[student.studentNumber] || '1234'}
                        onChange={e => setPasswords(p => ({ ...p, [student.studentNumber]: e.target.value }))} />
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <button onClick={() => {
                        if (confirm('Sifreyi sifirlamak istediginizden emin misiniz?')) {
                          setPasswords(p => ({ ...p, [student.studentNumber]: '1234' }));
                        }
                      }} style={{
                        padding: "6px 12px", fontSize: 12, border: `1px solid ${C.border}`,
                        borderRadius: 6, background: "white", cursor: "pointer", color: C.accent,
                      }}>Sifirla</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <Btn onClick={onClose} variant="secondary">Iptal</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Tumunu Kaydet'}</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── Grade Converter Widget ──
const GradeConverter = () => {
  const [inputGrade, setInputGrade] = useState("");
  const [convertedResult, setConvertedResult] = useState(null);
  const handleConvert = () => {
    if (inputGrade.trim()) setConvertedResult(convertGrade(inputGrade));
  };
  const examples = [
    { input: "A", system: "ECTS" }, { input: "BA", system: "Harf" },
    { input: "85", system: "100'luk" }, { input: "8", system: "10'luk" }, { input: "4.5", system: "5'lik" },
  ];
  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <Input value={inputGrade} onChange={e => setInputGrade(e.target.value)}
          placeholder="Notu girin (orn: A, BA, 85, 8.5, 4.0)"
          onKeyPress={e => e.key === 'Enter' && handleConvert()} style={{ flex: 1 }} />
        <Btn onClick={handleConvert}>Donustur</Btn>
      </div>
      {convertedResult && (
        <div style={{
          padding: 20, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 12, textAlign: 'center', color: 'white', marginBottom: 12,
        }}>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>{inputGrade} → CAKU Not Sistemi</div>
          <div style={{ fontSize: 48, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{convertedResult}</div>
        </div>
      )}
      <div style={{ padding: 16, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 12 }}>Ornek Notlar:</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {examples.map((ex, idx) => (
            <button key={idx} onClick={() => { setInputGrade(ex.input); setConvertedResult(convertGrade(ex.input)); }}
              style={{
                padding: "6px 12px", background: "white", border: `1px solid ${C.border}`,
                borderRadius: 6, fontSize: 12, cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.navy; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = C.text; }}
            >
              {ex.input} <span style={{ opacity: 0.6 }}>({ex.system})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Export to window ──
window.C = C;
window.FONTS_LINK = FONTS_LINK;
window.sharedStyles = sharedStyles;
window.HOME_INSTITUTION_CATALOG = HOME_INSTITUTION_CATALOG;
window.GRADE_CONVERSION = GRADE_CONVERSION;
window.convertGrade = convertGrade;
window.FirebaseDB = FirebaseDB;
window.UploadIcon = UploadIcon;
window.DownloadIcon = DownloadIcon;
window.PlusIcon = PlusIcon;
window.EditIcon = EditIcon;
window.TrashIcon = TrashIcon;
window.ArrowRightIcon = ArrowRightIcon;
window.FileTextIcon = FileTextIcon;
window.Card = Card;
window.Btn = Btn;
window.Input = Input;
window.Select = Select;
window.FormField = FormField;
window.Modal = Modal;
window.Badge = Badge;
window.LoginModal = LoginModal;
window.PasswordManagementModal = PasswordManagementModal;
window.GradeConverter = GradeConverter;
