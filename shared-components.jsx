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
  db: () => {
    if (!window.firebase) {
      console.warn('Firebase SDK yuklenmemis!');
      return null;
    }
    return window.firebase.firestore();
  },

  isReady: () => !!window.firebase,

  // Erasmus collections
  studentsRef: () => FirebaseDB.db()?.collection('students'),
  usersRef: () => FirebaseDB.db()?.collection('users'),
  passwordsRef: () => FirebaseDB.db()?.collection('passwords'),

  // Exam collections
  examsRef: () => FirebaseDB.db()?.collection('exams'),
  examResultsRef: () => FirebaseDB.db()?.collection('exam_results'),
  examPeriodsRef: () => FirebaseDB.db()?.collection('exam_periods'),
  professorsRef: () => FirebaseDB.db()?.collection('professors'),

  // ── Erasmus Student CRUD ──
  async fetchStudents() {
    try {
      const ref = FirebaseDB.studentsRef();
      if (!ref) return [];
      const snapshot = await ref.get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  },
  async addStudent(student) {
    try {
      const ref = FirebaseDB.studentsRef();
      if (!ref) throw new Error('Firebase baglantisi yok');
      const { id: _id, ...data } = student;
      const docRef = await ref.add({
        ...data,
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
      const ref = FirebaseDB.studentsRef();
      if (!ref) throw new Error('Firebase baglantisi yok');
      const { id: _id, ...data } = student;
      await ref.doc(String(id)).update({
        ...data,
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
      const ref = FirebaseDB.studentsRef();
      if (!ref) throw new Error('Firebase baglantisi yok');
      await ref.doc(String(id)).delete();
      return true;
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  },
  async fetchPasswords() {
    try {
      const ref = FirebaseDB.passwordsRef();
      if (!ref) return {};
      const doc = await ref.doc('student_passwords').get();
      return doc.exists ? doc.data() : {};
    } catch (error) {
      console.error('Error fetching passwords:', error);
      return {};
    }
  },
  async updatePassword(studentNumber, newPassword) {
    try {
      const ref = FirebaseDB.passwordsRef();
      if (!ref) throw new Error('Firebase baglantisi yok');
      const passwords = await FirebaseDB.fetchPasswords();
      passwords[studentNumber] = newPassword;
      await ref.doc('student_passwords').set(passwords);
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
      if (!query) return [];
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
      const ref = FirebaseDB.examsRef();
      if (!ref) throw new Error('Firebase baglantisi yok');
      const { id: _id, ...data } = exam;
      const docRef = await ref.add({
        ...data,
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
      const ref = FirebaseDB.examsRef();
      if (!ref) throw new Error('Firebase baglantisi yok');
      const { id: _id, ...data } = exam;
      await ref.doc(String(id)).update({
        ...data,
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
      const ref = FirebaseDB.examsRef();
      if (!ref) throw new Error('Firebase baglantisi yok');
      await ref.doc(String(id)).delete();
      return true;
    } catch (error) {
      console.error('Error deleting exam:', error);
      throw error;
    }
  },
  async fetchExamResults(examId) {
    try {
      const ref = FirebaseDB.examResultsRef();
      if (!ref) return [];
      const snapshot = await ref.where('examId', '==', examId).get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } catch (error) {
      console.error('Error fetching exam results:', error);
      return [];
    }
  },
  async addExamResult(result) {
    try {
      const ref = FirebaseDB.examResultsRef();
      if (!ref) throw new Error('Firebase baglantisi yok');
      const { id: _id, ...data } = result;
      const docRef = await ref.add({
        ...data,
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
      const ref = FirebaseDB.examResultsRef();
      if (!ref) throw new Error('Firebase baglantisi yok');
      const { id: _id, ...data } = result;
      await ref.doc(String(id)).update({
        ...data,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      });
      return result;
    } catch (error) {
      console.error('Error updating exam result:', error);
      throw error;
    }
  },
  async deleteExamResult(id) {
    try {
      const ref = FirebaseDB.examResultsRef();
      if (!ref) throw new Error('Firebase baglantisi yok');
      await ref.doc(String(id)).delete();
      return true;
    } catch (error) {
      console.error('Error deleting exam result:', error);
      throw error;
    }
  },

  // ── Exam Periods CRUD ──
  async fetchExamPeriods() {
    try {
      const ref = FirebaseDB.examPeriodsRef();
      if (!ref) return [];
      const snapshot = await ref.get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } catch (error) {
      console.error('Error fetching exam periods:', error);
      return [];
    }
  },
  async saveExamPeriod(period) {
    try {
      const ref = FirebaseDB.examPeriodsRef();
      if (!ref) throw new Error('Firebase baglantisi yok');
      const { id: _id, ...data } = period;
      if (_id) {
        await ref.doc(String(_id)).update({ ...data, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() });
        return period;
      } else {
        const docRef = await ref.add({ ...data, createdAt: window.firebase.firestore.FieldValue.serverTimestamp() });
        return { ...period, id: docRef.id };
      }
    } catch (error) {
      console.error('Error saving exam period:', error);
      throw error;
    }
  },
  async deleteExamPeriod(id) {
    try {
      const ref = FirebaseDB.examPeriodsRef();
      if (!ref) throw new Error('Firebase baglantisi yok');
      await ref.doc(String(id)).delete();
      return true;
    } catch (error) {
      console.error('Error deleting exam period:', error);
      throw error;
    }
  },

  // ── Professors CRUD ──
  async fetchProfessors() {
    try {
      const ref = FirebaseDB.professorsRef();
      if (!ref) return [];
      const snapshot = await ref.get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } catch (error) {
      console.error('Error fetching professors:', error);
      return [];
    }
  },
  async saveProfessor(prof) {
    try {
      const ref = FirebaseDB.professorsRef();
      if (!ref) throw new Error('Firebase baglantisi yok');
      const { id: _id, ...data } = prof;
      if (_id) {
        await ref.doc(String(_id)).update({ ...data, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() });
        return prof;
      } else {
        const docRef = await ref.add({ ...data, createdAt: window.firebase.firestore.FieldValue.serverTimestamp() });
        return { ...prof, id: docRef.id };
      }
    } catch (error) {
      console.error('Error saving professor:', error);
      throw error;
    }
  },
  async deleteProfessor(id) {
    try {
      const ref = FirebaseDB.professorsRef();
      if (!ref) throw new Error('Firebase baglantisi yok');
      await ref.doc(String(id)).delete();
      return true;
    } catch (error) {
      console.error('Error deleting professor:', error);
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

const Btn = ({ children, onClick, variant = "primary", icon, small, disabled, style: customStyle }) => {
  const btnStyles = {
    primary: { bg: C.navy, color: "#fff", hoverBg: C.navyLight },
    secondary: { bg: C.border, color: C.text, hoverBg: C.borderLight },
    success: { bg: C.green, color: "#fff", hoverBg: "#247d4d" },
    danger: { bg: C.accent, color: "#fff", hoverBg: "#6d1d29" },
    ghost: { bg: "transparent", color: C.blue, hoverBg: C.blueLight },
  };
  const s = btnStyles[variant] || btnStyles.primary;
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
        border: variant === "ghost" ? `1px solid ${C.border}` : "none",
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
        ...customStyle,
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

const Select = ({ value, onChange, options, placeholder, children }) => (
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
    {children ? children : (options || []).map((opt, i) => (
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
  const [showPassword, setShowPassword] = useState(false);
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
          setError("Admin şifresi yanlış!");
        }
      } else {
        if (!studentNumber.trim()) { setError("Öğrenci numarası gerekli!"); setLoading(false); return; }
        const passwords = await FirebaseDB.fetchPasswords();
        if (passwords[studentNumber] === password) {
          const students = await FirebaseDB.fetchStudents();
          const student = students.find(s => s.studentNumber === studentNumber);
          if (student) {
            onLogin({ role: 'student', name: `${student.firstName} ${student.lastName}`, studentNumber });
          } else {
            setError("Öğrenci bulunamadı!");
          }
        } else {
          setError("Öğrenci numarası veya şifre yanlış!");
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError("Giriş sırasında hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const loginStyles = `
    @keyframes loginFadeIn {
      from { opacity: 0; transform: translateY(20px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes loginSpin {
      to { transform: rotate(360deg); }
    }
    @keyframes loginShake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }
    @keyframes ringGlow {
      0%, 100% { filter: drop-shadow(0 0 15px rgba(196,151,59,0.4)) drop-shadow(0 0 40px rgba(196,151,59,0.15)); }
      50% { filter: drop-shadow(0 0 25px rgba(196,151,59,0.7)) drop-shadow(0 0 60px rgba(196,151,59,0.3)); }
    }
    @keyframes ringRotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes ember {
      0% { transform: translateY(0) scale(1); opacity: 1; }
      100% { transform: translateY(-120px) scale(0); opacity: 0; }
    }
    @keyframes starTwinkle {
      0%, 100% { opacity: 0.2; }
      50% { opacity: 0.8; }
    }
    @keyframes mountainFog {
      0%, 100% { opacity: 0.03; transform: translateX(0); }
      50% { opacity: 0.06; transform: translateX(20px); }
    }
  `;

  // Yıldız pozisyonları (sabit)
  const stars = Array.from({ length: 40 }, (_, i) => ({
    left: `${(i * 17 + 7) % 100}%`,
    top: `${(i * 13 + 3) % 55}%`,
    size: 1 + (i % 3),
    delay: `${(i * 0.7) % 5}s`,
    duration: `${2 + (i % 4)}s`,
  }));

  // Kıvılcım/ateş parçacıkları
  const embers = Array.from({ length: 12 }, (_, i) => ({
    left: `${10 + (i * 7) % 80}%`,
    bottom: `${2 + (i * 3) % 10}%`,
    size: 2 + (i % 3),
    delay: `${(i * 0.8) % 4}s`,
    duration: `${3 + (i % 3)}s`,
    color: i % 3 === 0 ? '#C4973B' : i % 3 === 1 ? '#e8833a' : '#d4582a',
  }));

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "linear-gradient(180deg, #0a0e1a 0%, #111827 30%, #1a1208 70%, #2d1a0a 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 10000, padding: 20, overflow: "hidden",
      fontFamily: "'Source Sans 3', sans-serif",
    }}>
      <style dangerouslySetInnerHTML={{ __html: loginStyles }} />

      {/* Yıldızlı gökyüzü */}
      {stars.map((s, i) => (
        <div key={`star-${i}`} style={{
          position: "absolute", left: s.left, top: s.top,
          width: s.size, height: s.size, borderRadius: "50%",
          background: "#fff",
          animation: `starTwinkle ${s.duration} ease-in-out ${s.delay} infinite`,
          pointerEvents: "none",
        }} />
      ))}

      {/* Dağ silüetleri - Misty Mountains */}
      <svg viewBox="0 0 1440 400" style={{
        position: "absolute", bottom: 0, left: 0, width: "100%", height: "45%",
        pointerEvents: "none",
      }} preserveAspectRatio="none">
        {/* Uzak dağlar (koyu) */}
        <path d="M0,400 L0,280 Q80,180 160,220 Q200,140 280,200 Q340,100 420,180 Q480,80 560,160 Q620,60 700,150 Q760,50 840,140 Q900,70 980,160 Q1040,90 1120,170 Q1180,100 1260,190 Q1320,130 1400,210 L1440,200 L1440,400 Z" fill="#0d0d0d" opacity="0.9" />
        {/* Yakın dağlar (biraz açık) */}
        <path d="M0,400 L0,310 Q100,240 180,280 Q240,200 340,260 Q400,170 500,240 Q580,140 680,220 Q740,150 840,210 Q920,160 1020,230 Q1100,180 1200,250 Q1280,200 1360,270 L1440,260 L1440,400 Z" fill="#1a1208" opacity="0.95" />
        {/* Mordor kırmızı ışıltı */}
        <path d="M0,400 L0,350 Q200,320 400,340 Q600,310 800,330 Q1000,315 1200,335 Q1350,325 1440,340 L1440,400 Z" fill="url(#mordorGlow)" opacity="0.6" />
        <defs>
          <linearGradient id="mordorGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1a0500" />
            <stop offset="30%" stopColor="#3d1200" />
            <stop offset="50%" stopColor="#5c1a00" />
            <stop offset="70%" stopColor="#3d1200" />
            <stop offset="100%" stopColor="#1a0500" />
          </linearGradient>
        </defs>
      </svg>

      {/* Sis efekti */}
      <div style={{
        position: "absolute", bottom: "20%", left: 0, right: 0, height: "15%",
        background: "linear-gradient(180deg, transparent, rgba(26,18,8,0.4), transparent)",
        animation: "mountainFog 12s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* Kıvılcımlar / Ateş parçacıkları */}
      {embers.map((e, i) => (
        <div key={`ember-${i}`} style={{
          position: "absolute", left: e.left, bottom: e.bottom,
          width: e.size, height: e.size, borderRadius: "50%",
          background: e.color,
          boxShadow: `0 0 ${e.size * 2}px ${e.color}`,
          animation: `ember ${e.duration} ease-out ${e.delay} infinite`,
          pointerEvents: "none",
        }} />
      ))}

      <div style={{
        maxWidth: 440, width: "100%", position: "relative", zIndex: 2,
        animation: "loginFadeIn 0.5s ease-out",
      }}>
        {/* Tek Yüzük + Başlık */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {/* The One Ring SVG */}
          <div style={{
            width: 90, height: 90, margin: "0 auto 20px", position: "relative",
            animation: "ringGlow 3s ease-in-out infinite",
          }}>
            <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", animation: "ringRotate 20s linear infinite" }}>
              {/* Dış halka */}
              <circle cx="50" cy="50" r="42" fill="none" stroke="url(#ringGold)" strokeWidth="5" />
              {/* İç halka */}
              <circle cx="50" cy="50" r="34" fill="none" stroke="url(#ringGold2)" strokeWidth="2.5" />
              {/* Elvish yazılar (stilize) */}
              <path d="M50,12 A38,38 0 0,1 88,50" fill="none" stroke="#C4973B" strokeWidth="1" opacity="0.5" strokeDasharray="3,4" />
              <path d="M88,50 A38,38 0 0,1 50,88" fill="none" stroke="#C4973B" strokeWidth="1" opacity="0.5" strokeDasharray="4,3" />
              <path d="M50,88 A38,38 0 0,1 12,50" fill="none" stroke="#C4973B" strokeWidth="1" opacity="0.5" strokeDasharray="3,5" />
              <path d="M12,50 A38,38 0 0,1 50,12" fill="none" stroke="#C4973B" strokeWidth="1" opacity="0.5" strokeDasharray="5,3" />
              <defs>
                <linearGradient id="ringGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E8D5A8" />
                  <stop offset="30%" stopColor="#C4973B" />
                  <stop offset="60%" stopColor="#d4a94e" />
                  <stop offset="100%" stopColor="#E8D5A8" />
                </linearGradient>
                <linearGradient id="ringGold2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#C4973B" />
                  <stop offset="50%" stopColor="#E8D5A8" />
                  <stop offset="100%" stopColor="#C4973B" />
                </linearGradient>
              </defs>
            </svg>
            {/* Ortadaki "Ç" harfi */}
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              fontSize: 28, fontWeight: 800, color: "#C4973B",
              fontFamily: "'Playfair Display', serif",
              textShadow: "0 0 20px rgba(196,151,59,0.6)",
            }}>Ç</div>
          </div>

          <h1 style={{
            margin: 0, fontSize: 28, fontWeight: 700, color: "#E8D5A8",
            fontFamily: "'Playfair Display', serif", letterSpacing: "0.04em",
            textShadow: "0 2px 20px rgba(196,151,59,0.3)",
          }}>ÇAKÜ Yönetim Sistemi</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "rgba(232,213,168,0.4)", fontStyle: "italic", letterSpacing: "0.1em" }}>
            Çankırı Karatekin Üniversitesi
          </p>
          {/* Elvish stil dekoratif çizgi */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16 }}>
            <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, transparent, #C4973B)" }} />
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C4973B", opacity: 0.6 }} />
            <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, #C4973B, transparent)" }} />
          </div>
        </div>

        {/* Kart */}
        <div style={{
          background: "rgba(10,14,26,0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(196,151,59,0.15)",
          borderRadius: 20, overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(196,151,59,0.1)",
        }}>
          {/* Sekmeler */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(196,151,59,0.1)" }}>
            {[
              { key: false, label: "Öğrenci Girişi", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
              { key: true, label: "Admin Girişi", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
            ].map(tab => {
              const active = isAdminMode === tab.key;
              return (
                <button key={String(tab.key)} onClick={() => { setIsAdminMode(tab.key); setError(""); }} style={{
                  flex: 1, padding: "16px 20px", border: "none", cursor: "pointer",
                  background: active ? "rgba(196,151,59,0.08)" : "transparent",
                  color: active ? "#E8D5A8" : "rgba(232,213,168,0.35)",
                  fontSize: 14, fontWeight: 600,
                  borderBottom: active ? "2px solid #C4973B" : "2px solid transparent",
                  transition: "all 0.25s ease",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontFamily: "'Source Sans 3', sans-serif",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={tab.icon}/></svg>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: 28 }}>
            {!isAdminMode && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(196,151,59,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  Öğrenci Numarası
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(196,151,59,0.35)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  </div>
                  <input value={studentNumber} onChange={e => setStudentNumber(e.target.value)} placeholder="Örn: AND43" autoFocus
                    style={{
                      width: "100%", padding: "14px 16px 14px 44px", borderRadius: 12,
                      border: "1px solid rgba(196,151,59,0.15)", background: "rgba(196,151,59,0.04)",
                      color: "#E8D5A8", fontSize: 15, outline: "none",
                      fontFamily: "'Source Sans 3', sans-serif",
                      transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={e => { e.target.style.borderColor = "rgba(196,151,59,0.4)"; e.target.style.background = "rgba(196,151,59,0.06)"; e.target.style.boxShadow = "0 0 20px rgba(196,151,59,0.08)"; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(196,151,59,0.15)"; e.target.style.background = "rgba(196,151,59,0.04)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(196,151,59,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Şifre
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(196,151,59,0.35)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                </div>
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={isAdminMode ? "Admin şifresi" : "Öğrenci şifresi"} autoFocus={isAdminMode}
                  style={{
                    width: "100%", padding: "14px 48px 14px 44px", borderRadius: 12,
                    border: "1px solid rgba(196,151,59,0.15)", background: "rgba(196,151,59,0.04)",
                    color: "#E8D5A8", fontSize: 15, outline: "none",
                    fontFamily: "'Source Sans 3', sans-serif",
                    transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={e => { e.target.style.borderColor = "rgba(196,151,59,0.4)"; e.target.style.background = "rgba(196,151,59,0.06)"; e.target.style.boxShadow = "0 0 20px rgba(196,151,59,0.08)"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(196,151,59,0.15)"; e.target.style.background = "rgba(196,151,59,0.04)"; e.target.style.boxShadow = "none"; }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "rgba(196,151,59,0.35)",
                  padding: 4, display: "flex", alignItems: "center",
                }}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Hata mesajı */}
            {error && (
              <div style={{
                padding: "12px 16px", marginBottom: 20, borderRadius: 12,
                background: "rgba(180,50,20,0.15)", border: "1px solid rgba(180,50,20,0.3)",
                color: "#e8833a", fontSize: 13, display: "flex", alignItems: "center", gap: 10,
                animation: "loginShake 0.4s ease",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                {error}
              </div>
            )}

            {/* Giriş butonu */}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "15px 20px", borderRadius: 12,
              border: loading ? "1px solid rgba(196,151,59,0.1)" : "1px solid rgba(196,151,59,0.3)",
              background: loading ? "rgba(196,151,59,0.05)" : "linear-gradient(135deg, #C4973B 0%, #d4a94e 50%, #C4973B 100%)",
              color: loading ? "rgba(196,151,59,0.4)" : "#0a0e1a",
              fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Source Sans 3', sans-serif",
              transition: "all 0.25s ease",
              boxShadow: loading ? "none" : "0 4px 24px rgba(196,151,59,0.25), inset 0 1px 0 rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              letterSpacing: "0.02em",
            }}>
              {loading ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "loginSpin 1s linear infinite" }}><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93"/></svg>
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                  {isAdminMode ? "Admin Olarak Giriş Yap" : "Öğrenci Olarak Giriş Yap"}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </>
              )}
            </button>

            {/* Bilgi kutusu */}
            <div style={{
              marginTop: 20, padding: "12px 16px", borderRadius: 12,
              background: "rgba(196,151,59,0.04)", border: "1px solid rgba(196,151,59,0.1)",
              fontSize: 12, color: "rgba(232,213,168,0.4)",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(196,151,59,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span>
                {isAdminMode
                  ? "Admin girişi için yetkili şifrenizi kullanın."
                  : <>Varsayılan öğrenci şifresi: <code style={{ background: "rgba(196,151,59,0.1)", padding: "2px 8px", borderRadius: 4, color: "#C4973B", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>1234</code></>
                }
              </span>
            </div>
          </form>
        </div>

        {/* Alt bilgi - Elvish stil */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, transparent, rgba(196,151,59,0.2))" }} />
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(196,151,59,0.3)" }} />
            <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, rgba(196,151,59,0.2), transparent)" }} />
          </div>
          <p style={{ fontSize: 11, color: "rgba(232,213,168,0.2)", fontStyle: "italic", letterSpacing: "0.05em" }}>
            "Tek Yüzük hepsine hükmedecek" — © 2025 ÇAKÜ
          </p>
        </div>
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
