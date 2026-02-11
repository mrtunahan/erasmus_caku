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

// ── Daisy Theme Colors ──
const DY = {
  bg: "#fffdf5", // Creamy background
  card: "#ffffff",
  gold: "#d4af37",
  goldLight: "#f3e5ab",
  goldDark: "#b4941f",
  navy: "#1e3a8a",
  navyLight: "#3b82f6",
  green: "#059669",
  greenLight: "#d1fae5",
  text: "#1f2937",
  textLight: "#4b5563",
  border: "#e5e7eb",
  shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  hover: "#fffbe6",
};

// ── Daisy Theme Icons ──
const ICONS = {
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  book: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  filter: "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z",
  plus: "M12 4v16m8-8H4",
  dots: "M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z",
  heart: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  message: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  share: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z",
  bookmark: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z",
  check: "M5 13l4 4L19 7",
  x: "M6 18L18 6M6 6l12 12",
  chevronDown: "M19 9l-7 7-7-7"
};

// ── Inject Daisy Theme Styles Global ──
(function () {
  const style = document.createElement("style");
  style.id = "portal-daisy-style";
  style.innerHTML = `
    .portal-bg {
      background-color: ${DY.bg};
      background-image: 
        radial-gradient(at 10% 10%, ${DY.goldLight} 0px, transparent 50%),
        radial-gradient(at 90% 10%, ${DY.greenLight} 0px, transparent 50%),
        radial-gradient(at 90% 90%, ${DY.blueLight} 0px, transparent 50%),
        radial-gradient(at 10% 90%, ${DY.goldLight} 0px, transparent 50%);
      background-attachment: fixed;
      min-height: 100vh;
      font-family: 'Inter', sans-serif;
      padding-bottom: 40px;
    }
    .portal-wrap {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px 40px;
    }
    .daisy-card {
      background: ${DY.card};
      border: 1px solid ${DY.border};
      border-radius: 12px;
      box-shadow: ${DY.shadow};
      transition: all 0.2s ease;
      overflow: hidden;
      margin-bottom: 24px;
    }
    .daisy-card:hover { 
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border-color: ${DY.gold};
    }
    .daisy-btn {
      background: linear-gradient(135deg, ${DY.navy}, ${DY.navyLight});
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .daisy-btn:hover {
      box-shadow: 0 4px 6px rgba(0,0,0,0.15);
      transform: translateY(-1px);
    }
    .daisy-btn-secondary {
      background: white;
      color: ${DY.text};
      border: 1px solid ${DY.border};
    }
    .daisy-btn-ghost {
      background: transparent;
      color: ${DY.textLight};
      box-shadow: none;
    }
    .daisy-btn-ghost:hover {
      background: ${DY.hover};
      color: ${DY.navy};
      transform: none;
    }
  `;
  document.head.appendChild(style);
})();

// Export to window for other modules
window.DY = DY;
window.ICONS = ICONS;

// ── Utility Functions ──
const generateColorFromString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#EF4444", "#F97316", "#EAB308", "#22C55E", "#10B981",
    "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7",
    "#EC4899", "#F43F5E"
  ];
  return colors[Math.abs(hash) % colors.length];
};

// ── Shared Constants ──
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

const FONTS_LINK = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Source+Sans+3:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

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

  // ── Admin Password ──
  async fetchAdminPassword() {
    try {
      const ref = FirebaseDB.passwordsRef();
      if (!ref) return null;
      const doc = await ref.doc('admin').get();
      return doc.exists ? doc.data().password : null;
    } catch (error) {
      console.error('Error fetching admin password:', error);
      return null;
    }
  },
  async saveAdminPassword(password) {
    try {
      const ref = FirebaseDB.passwordsRef();
      if (!ref) throw new Error('Firebase baglantisi yok');
      await ref.doc('admin').set({ password, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() });
      return true;
    } catch (error) {
      console.error('Error saving admin password:', error);
      throw error;
    }
  },

  // ── Professor Passwords ──
  async fetchProfessorPasswords() {
    try {
      const ref = FirebaseDB.passwordsRef();
      if (!ref) return {};
      const doc = await ref.doc('professor_passwords').get();
      return doc.exists ? doc.data() : {};
    } catch (error) {
      console.error('Error fetching professor passwords:', error);
      return {};
    }
  },
  async saveProfessorPasswords(passwords) {
    try {
      const ref = FirebaseDB.passwordsRef();
      if (!ref) throw new Error('Firebase baglantisi yok');
      await ref.doc('professor_passwords').set(passwords, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving professor passwords:', error);
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
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const DownloadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2h4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const FileTextIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
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
  const [activeTab, setActiveTab] = useState("student"); // student, professor, admin
  const [identifier, setIdentifier] = useState(""); // studentNo or professorName
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (activeTab === "admin") {
        const storedAdminPassword = await FirebaseDB.fetchAdminPassword();
        const validPassword = storedAdminPassword || "1605"; // Default fallback if not set
        if (password === validPassword) {
          onLogin({ role: "admin", name: "Admin", studentNumber: null });
        } else {
          setError("Admin şifresi yanlış!");
        }
      } else if (activeTab === "professor") {
        if (!identifier.trim()) { setError("Akademisyen seçimi gerekli!"); setLoading(false); return; }
        const passwords = await FirebaseDB.fetchProfessorPasswords();
        const validPassword = passwords[identifier] || "1234"; // Default
        if (password === validPassword) {
          onLogin({ role: "professor", name: identifier, studentNumber: null });
        } else {
          setError("Şifre yanlış!");
        }
      } else { // student
        if (!identifier.trim()) { setError("Öğrenci numarası gerekli!"); setLoading(false); return; }
        const passwords = await FirebaseDB.fetchPasswords();
        const validPassword = passwords[identifier] || "1234"; // Default
        if (password === validPassword) {
          const students = await FirebaseDB.fetchStudents();
          const student = students.find(s => s.studentNumber === identifier);
          if (student) {
            onLogin({ role: "student", name: `${student.firstName} ${student.lastName}`, studentNumber: identifier });
          } else {
            setError("Öğrenci bulunamadı!");
          }
        } else {
          setError("Öğrenci numarası veya şifre yanlış!");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Giriş hatası: " + err.message);
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
    @keyframes auroraSway1 {
      0%, 100% { d: path("M0,120 C200,60 400,140 600,80 C800,30 1000,110 1200,60 C1350,30 1440,70 1440,70 L1440,0 L0,0 Z"); opacity: 0.25; }
      33% { d: path("M0,100 C180,140 380,50 580,110 C780,60 980,130 1180,50 C1340,80 1440,40 1440,40 L1440,0 L0,0 Z"); opacity: 0.35; }
      66% { d: path("M0,130 C220,40 420,120 620,70 C820,120 1020,40 1220,90 C1360,50 1440,80 1440,80 L1440,0 L0,0 Z"); opacity: 0.2; }
    }
    @keyframes auroraSway2 {
      0%, 100% { d: path("M0,160 C180,100 360,180 540,120 C720,70 900,160 1080,100 C1260,60 1440,110 1440,110 L1440,0 L0,0 Z"); opacity: 0.18; }
      50% { d: path("M0,140 C200,180 400,90 600,150 C800,100 1000,170 1200,90 C1340,120 1440,80 1440,80 L1440,0 L0,0 Z"); opacity: 0.28; }
    }
    @keyframes auroraSway3 {
      0%, 100% { d: path("M0,100 C240,150 480,60 720,130 C960,70 1200,140 1440,90 L1440,0 L0,0 Z"); opacity: 0.12; }
      50% { d: path("M0,130 C240,70 480,150 720,80 C960,140 1200,60 1440,120 L1440,0 L0,0 Z"); opacity: 0.22; }
    }
    @keyframes starTwinkle {
      0%, 100% { opacity: 0.15; }
      50% { opacity: 0.85; }
    }
    @keyframes shootingStar {
      0% { transform: translateX(0) translateY(0); opacity: 1; }
      100% { transform: translateX(200px) translateY(120px); opacity: 0; }
    }
    @keyframes snowFall {
      0% { transform: translateY(-10px) translateX(0); opacity: 0; }
      10% { opacity: 0.6; }
      90% { opacity: 0.6; }
      100% { transform: translateY(100vh) translateX(30px); opacity: 0; }
    }
  `;

  const stars = Array.from({ length: 50 }, (_, i) => ({
    left: `${(i * 19 + 5) % 100}%`,
    top: `${(i * 13 + 2) % 50}%`,
    size: 1 + (i % 3),
    delay: `${(i * 0.6) % 5}s`,
    duration: `${2 + (i % 4)}s`,
  }));

  const snowflakes = Array.from({ length: 20 }, (_, i) => ({
    left: `${(i * 5 + 1) % 100}%`,
    size: 1.5 + (i % 3),
    delay: `${(i * 1.2) % 8}s`,
    duration: `${8 + (i % 6)}s`,
  }));

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "linear-gradient(180deg, #020b18 0%, #0a1628 25%, #0f1f3a 50%, #132844 70%, #1a3352 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 10000, padding: 20, overflow: "hidden",
      fontFamily: "'Source Sans 3', sans-serif",
    }}>
      <style dangerouslySetInnerHTML={{ __html: loginStyles }} />

      {/* Yıldızlar */}
      {stars.map((s, i) => (
        <div key={`s-${i}`} style={{
          position: "absolute", left: s.left, top: s.top,
          width: s.size, height: s.size, borderRadius: "50%",
          background: "#fff",
          animation: `starTwinkle ${s.duration} ease-in-out ${s.delay} infinite`,
          pointerEvents: "none",
        }} />
      ))}

      {/* Aurora Borealis katmanları */}
      <svg viewBox="0 0 1440 200" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "40%", pointerEvents: "none" }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="aurora1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00ff87" stopOpacity="0" />
            <stop offset="20%" stopColor="#00ff87" stopOpacity="0.5" />
            <stop offset="40%" stopColor="#60efff" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.4" />
            <stop offset="80%" stopColor="#00ff87" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#60efff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="aurora2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60efff" stopOpacity="0" />
            <stop offset="25%" stopColor="#60efff" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#00ff87" stopOpacity="0.5" />
            <stop offset="75%" stopColor="#a855f7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00ff87" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="aurora3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
            <stop offset="30%" stopColor="#7c3aed" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#60efff" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#00ff87" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
          <filter id="auroraBlur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
          </filter>
          <filter id="auroraBlur2">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" />
          </filter>
        </defs>
        <path d="M0,120 C200,60 400,140 600,80 C800,30 1000,110 1200,60 C1350,30 1440,70 1440,70 L1440,0 L0,0 Z" fill="url(#aurora1)" filter="url(#auroraBlur)" style={{ animation: "auroraSway1 8s ease-in-out infinite" }} />
        <path d="M0,160 C180,100 360,180 540,120 C720,70 900,160 1080,100 C1260,60 1440,110 1440,110 L1440,0 L0,0 Z" fill="url(#aurora2)" filter="url(#auroraBlur2)" style={{ animation: "auroraSway2 10s ease-in-out infinite" }} />
        <path d="M0,100 C240,150 480,60 720,130 C960,70 1200,140 1440,90 L1440,0 L0,0 Z" fill="url(#aurora3)" filter="url(#auroraBlur)" style={{ animation: "auroraSway3 12s ease-in-out infinite" }} />
      </svg>

      {/* Aurora yansıma ışığı */}
      <div style={{ position: "absolute", top: "5%", left: "20%", width: "60%", height: "30%", background: "radial-gradient(ellipse at center, rgba(0,255,135,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Dağ silüetleri (kar) */}
      <svg viewBox="0 0 1440 320" style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "35%", pointerEvents: "none" }} preserveAspectRatio="none">
        <path d="M0,320 L0,260 L80,250 L150,190 L200,220 L280,140 L340,180 L400,100 L450,160 L520,80 L580,130 L640,60 L700,110 L760,50 L820,100 L880,70 L940,130 L1000,90 L1060,150 L1120,110 L1180,170 L1240,130 L1300,180 L1360,150 L1440,190 L1440,320 Z" fill="#0a1628" />
        <path d="M0,320 L0,280 L100,270 L180,230 L250,260 L340,200 L420,240 L500,180 L580,220 L660,170 L740,210 L820,160 L900,200 L980,170 L1060,210 L1140,180 L1220,220 L1300,200 L1380,230 L1440,220 L1440,320 Z" fill="#0f1a2e" />
        {/* Kar tepeleri */}
        <path d="M270,144 L280,140 L290,147" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
        <path d="M390,104 L400,100 L410,107" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
        <path d="M510,84 L520,80 L530,87" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
        <path d="M630,64 L640,60 L650,67" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
        <path d="M750,54 L760,50 L770,57" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
        <path d="M870,74 L880,70 L890,77" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
      </svg>

      {/* Kar taneleri */}
      {snowflakes.map((sf, i) => (
        <div key={`sf-${i}`} style={{
          position: "absolute", left: sf.left, top: "-5px",
          width: sf.size, height: sf.size, borderRadius: "50%",
          background: "rgba(255,255,255,0.5)",
          animation: `snowFall ${sf.duration} linear ${sf.delay} infinite`,
          pointerEvents: "none",
        }} />
      ))}

      <div style={{
        maxWidth: 440, width: "100%", position: "relative", zIndex: 2,
        animation: "loginFadeIn 0.5s ease-out",
      }}>
        {/* Logo & Başlık */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 76, height: 76, borderRadius: 22, margin: "0 auto 20px",
            background: "linear-gradient(135deg, rgba(0,255,135,0.15) 0%, rgba(96,239,255,0.15) 100%)",
            border: "1px solid rgba(0,255,135,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, fontWeight: 800, color: "#00ff87",
            fontFamily: "'Playfair Display', serif",
            boxShadow: "0 8px 40px rgba(0,255,135,0.15), inset 0 0 30px rgba(0,255,135,0.05)",
          }}>Ç</div>
          <h1 style={{
            margin: 0, fontSize: 28, fontWeight: 700, color: "white",
            fontFamily: "'Playfair Display', serif", letterSpacing: "0.02em",
            textShadow: "0 0 30px rgba(0,255,135,0.15)",
          }}>ÇAKÜ Yönetim Sistemi</h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "rgba(96,239,255,0.5)" }}>
            Çankırı Karatekin Üniversitesi
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 14 }}>
            <div style={{ width: 50, height: 1, background: "linear-gradient(90deg, transparent, rgba(0,255,135,0.3))" }} />
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00ff87", opacity: 0.4, boxShadow: "0 0 8px rgba(0,255,135,0.4)" }} />
            <div style={{ width: 50, height: 1, background: "linear-gradient(90deg, rgba(0,255,135,0.3), transparent)" }} />
          </div>
        </div>

        {/* Kart */}
        <div style={{
          background: "rgba(10,22,40,0.7)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(0,255,135,0.08)",
          borderRadius: 20, overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(0,255,135,0.05)",
        }}>
          {/* Sekmeler */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(0,255,135,0.06)" }}>
            {[
              { key: "student", label: "Öğrenci", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
              { key: "professor", label: "Akademisyen", icon: "M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" },
              { key: "admin", label: "Admin", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
            ].map(tab => {
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => { setActiveTab(tab.key); setError(""); setIdentifier(""); setPassword(""); }} type="button" style={{
                  flex: 1, padding: "16px 10px", border: "none", cursor: "pointer",
                  background: active ? "rgba(0,255,135,0.06)" : "transparent",
                  color: active ? "#00ff87" : "rgba(255,255,255,0.35)",
                  fontSize: 13, fontWeight: 600,
                  borderBottom: active ? "2px solid #00ff87" : "2px solid transparent",
                  transition: "all 0.25s ease",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  fontFamily: "'Source Sans 3', sans-serif",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={tab.icon} /></svg>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: 28 }}>

            {activeTab === "student" && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(96,239,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  Öğrenci Numarası
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(0,255,135,0.3)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="Örn: AND43" autoFocus
                    style={{
                      width: "100%", padding: "14px 16px 14px 44px", borderRadius: 12,
                      border: "1px solid rgba(0,255,135,0.1)", background: "rgba(0,255,135,0.03)",
                      color: "white", fontSize: 15, outline: "none",
                      fontFamily: "'Source Sans 3', sans-serif",
                      transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={e => { e.target.style.borderColor = "rgba(0,255,135,0.3)"; e.target.style.background = "rgba(0,255,135,0.05)"; e.target.style.boxShadow = "0 0 20px rgba(0,255,135,0.06)"; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(0,255,135,0.1)"; e.target.style.background = "rgba(0,255,135,0.03)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              </div>
            )}

            {activeTab === "professor" && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(96,239,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  Akademisyen Seçimi
                </label>
                <select value={identifier} onChange={e => setIdentifier(e.target.value)}
                  style={{
                    width: "100%", padding: "14px 16px", borderRadius: 12,
                    border: "1px solid rgba(0,255,135,0.1)", background: "rgba(0,255,135,0.03)",
                    color: "white", fontSize: 15, outline: "none",
                    fontFamily: "'Source Sans 3', sans-serif", cursor: "pointer",
                  }}
                >
                  <option value="" style={{ color: "black" }}>İsim Seçiniz...</option>
                  {SEED_PROFESSORS.map(p => (
                    <option key={p.name} value={p.name} style={{ color: "black" }}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(96,239,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Şifre
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(0,255,135,0.3)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                </div>
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={activeTab === "admin" ? "Admin şifresi" : "Şifreniz"} autoFocus={activeTab === "admin"}
                  style={{
                    width: "100%", padding: "14px 48px 14px 44px", borderRadius: 12,
                    border: "1px solid rgba(0,255,135,0.1)", background: "rgba(0,255,135,0.03)",
                    color: "white", fontSize: 15, outline: "none",
                    fontFamily: "'Source Sans 3', sans-serif",
                    transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={e => { e.target.style.borderColor = "rgba(0,255,135,0.3)"; e.target.style.background = "rgba(0,255,135,0.05)"; e.target.style.boxShadow = "0 0 20px rgba(0,255,135,0.06)"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(0,255,135,0.1)"; e.target.style.background = "rgba(0,255,135,0.03)"; e.target.style.boxShadow = "none"; }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "rgba(0,255,135,0.3)",
                  padding: 4, display: "flex", alignItems: "center",
                }}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Hata mesajı */}
            {error && (
              <div style={{
                padding: "12px 16px", marginBottom: 20, borderRadius: 12,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                color: "#fca5a5", fontSize: 13, display: "flex", alignItems: "center", gap: 10,
                animation: "loginShake 0.4s ease",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                {error}
              </div>
            )}

            {/* Giriş butonu */}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "15px 20px", borderRadius: 12,
              border: loading ? "1px solid rgba(0,255,135,0.1)" : "none",
              background: loading ? "rgba(0,255,135,0.05)" : "linear-gradient(135deg, #00ff87 0%, #60efff 100%)",
              color: loading ? "rgba(96,239,255,0.4)" : "#020b18",
              fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Source Sans 3', sans-serif",
              transition: "all 0.25s ease",
              boxShadow: loading ? "none" : "0 4px 24px rgba(0,255,135,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
              {loading ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "loginSpin 1s linear infinite" }}><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" /></svg>
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                  Giriş Yap
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </>
              )}
            </button>

            {/* Bilgi kutusu */}
            <div style={{
              marginTop: 20, padding: "12px 16px", borderRadius: 12,
              background: "rgba(0,255,135,0.03)", border: "1px solid rgba(0,255,135,0.08)",
              fontSize: 12, color: "rgba(96,239,255,0.4)",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,255,135,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
              <span>
                Varsayılan Şifre: <code style={{ background: "rgba(0,255,135,0.08)", padding: "2px 8px", borderRadius: 4, color: "#00ff87", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>1234</code>. Admin için: <code style={{ background: "rgba(0,255,135,0.08)", padding: "2px 8px", borderRadius: 4, color: "#00ff87", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>1605</code>
              </span>
            </div>
          </form>
        </div>

        {/* Alt bilgi */}
        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "rgba(96,239,255,0.2)" }}>
          © 2025 ÇAKÜ Bilgisayar Mühendisliği
        </p>
      </div>
    </div>
  );
};

// ── Password Management Modal ──
const PasswordManagementModal = ({ students, onClose }) => {
  const [activeTab, setActiveTab] = useState("student"); // student, professor, admin
  const [studentPasses, setStudentPasses] = useState({});
  const [professorPasses, setProfessorPasses] = useState({});
  const [adminPass, setAdminPass] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAllPasswords(); }, []);

  const loadAllPasswords = async () => {
    try {
      const [sPass, pPass, aPass] = await Promise.all([
        FirebaseDB.fetchPasswords(),
        FirebaseDB.fetchProfessorPasswords(),
        FirebaseDB.fetchAdminPassword(),
      ]);
      setStudentPasses(sPass || {});
      setProfessorPasses(pPass || {});
      setAdminPass(aPass || "1605");
    } catch (error) {
      console.error('Error loading passwords:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === "student") {
        await FirebaseDB.passwordsRef().doc('student_passwords').set(studentPasses);
      } else if (activeTab === "professor") {
        await FirebaseDB.saveProfessorPasswords(professorPasses);
      } else if (activeTab === "admin") {
        await FirebaseDB.saveAdminPassword(adminPass);
      }
      alert('Şifreler kaydedildi!');
    } catch (error) {
      console.error('Error saving passwords:', error);
      alert('Hata: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Şifre Yönetimi" width={800}>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {["student", "professor", "admin"].map(tab => (
          <Btn key={tab}
            variant={activeTab === tab ? "primary" : "secondary"}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "student" ? "Öğrenciler" : tab === "professor" ? "Akademisyenler" : "Admin"}
          </Btn>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>Yükleniyor...</div>
      ) : (
        <div>
          <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 24, paddingRight: 8 }}>

            {activeTab === "student" && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Öğrenci No</th>
                    <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Ad Soyad</th>
                    <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Şifre</th>
                    <th style={{ padding: 12, textAlign: 'center', borderBottom: `2px solid ${C.border}` }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.studentNumber} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: 12, fontWeight: 600, color: C.navy }}>{student.studentNumber}</td>
                      <td style={{ padding: 12 }}>{student.firstName} {student.lastName}</td>
                      <td style={{ padding: 12 }}>
                        <Input type="text" value={studentPasses[student.studentNumber] || '1234'}
                          onChange={e => setStudentPasses(p => ({ ...p, [student.studentNumber]: e.target.value }))} />
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <button onClick={() => {
                          if (confirm('Şifreyi sıfırlamak istediğinizden emin misiniz?')) {
                            setStudentPasses(p => ({ ...p, [student.studentNumber]: '1234' }));
                          }
                        }} style={{
                          padding: "6px 12px", fontSize: 12, border: `1px solid ${C.border}`,
                          borderRadius: 6, background: "white", cursor: "pointer", color: C.accent,
                        }}>Sıfırla</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "professor" && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Unvan & İsim</th>
                    <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Bölüm</th>
                    <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Şifre</th>
                    <th style={{ padding: 12, textAlign: 'center', borderBottom: `2px solid ${C.border}` }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {SEED_PROFESSORS.map((prof, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: 12, fontWeight: 600, color: C.navy }}>{prof.name}</td>
                      <td style={{ padding: 12 }}>{prof.department}</td>
                      <td style={{ padding: 12 }}>
                        <Input type="text" value={professorPasses[prof.name] || '1234'}
                          onChange={e => setProfessorPasses(p => ({ ...p, [prof.name]: e.target.value }))} />
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <button onClick={() => {
                          if (confirm('Şifreyi sıfırlamak istediğinizden emin misiniz?')) {
                            setProfessorPasses(p => ({ ...p, [prof.name]: '1234' }));
                          }
                        }} style={{
                          padding: "6px 12px", fontSize: 12, border: `1px solid ${C.border}`,
                          borderRadius: 6, background: "white", cursor: "pointer", color: C.accent,
                        }}>Sıfırla</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "admin" && (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ marginBottom: 16, fontWeight: 600, color: C.navy }}>Admin Giriş Şifresi</div>
                <div style={{ maxWidth: 300, margin: '0 auto' }}>
                  <Input type="text" value={adminPass} onChange={e => setAdminPass(e.target.value)} style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2 }} />
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: C.textMuted }}>
                  Bu şifre ile Admin paneline erişim sağlanır.
                </div>
              </div>
            )}

          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <Btn onClick={onClose} variant="secondary">Kapat</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Btn>
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
window.SEED_PROFESSORS = SEED_PROFESSORS;
window.LoginModal = LoginModal;
window.PasswordManagementModal = PasswordManagementModal;
window.GradeConverter = GradeConverter;
