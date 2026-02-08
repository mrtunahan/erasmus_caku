// React hooks will be available globally from CDN
const { useState, useEffect, useRef } = React;

const FONTS_LINK = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

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

// ── University Course Catalogs ──
const UNIVERSITY_CATALOGS = {
  "Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich": {
    country: "Poland",
    courses: [
      { code: "05-EMS-APN-SP1", name: "Architecture and Programming of Microcontrollers", credits: 8 },
      { code: "05-EMS-CN-SP1", name: "Computer Networks", credits: 4 },
      { code: "05-EMS-BOS-SP1", name: "Basics of Operating Systems", credits: 3 },
      { code: "05-EMS-WSD-SP1", name: "Web Services Design", credits: 2 },
      { code: "05-EMS-FP-SP1", name: "Fundamentals of Programming", credits: 5 },
      { code: "05-EMS-RES-SP1", name: "Renewable Energy Sources", credits: 2 },
      { code: "05-EMS-DC-SP1", name: "Digital Circuits", credits: 4 },
      { code: "05-EMS-SG-SP1", name: "Smart Grid", credits: 8 },
      { code: "05-EMS-SLP-SP1", name: "Script Languages Programming", credits: 5 },
      { code: "15-EMS-HW-SP1", name: "History of Design", credits: 3 },
      { code: "15-EMS-BD-SP1", name: "Basics of Design", credits: 4 },
      { code: "15-EMS-VC-SP1", name: "Visual Communication", credits: 3 },
      { code: "15-EMS-DS-SP1", name: "Specialized Design", credits: 4 },
      { code: "15-EMS-PD-SP1", name: "Packaging Design", credits: 4 },
      { code: "08-EMS-FINAC-SP1", name: "Financial Accounting", credits: 6 },
      { code: "08-EMS-MANAG-SP1", name: "Management", credits: 6 },
      { code: "08-EMS-MANAC-SP1", name: "Management Accounting", credits: 5 },
      { code: "00-EMS-STAT-SP1", name: "Statistics", credits: 6 },
    ]
  },
  "Politechnika Krakowska": {
    country: "Poland",
    courses: [
      { code: "E-CN", name: "Computer Networks", credits: 6 },
      { code: "F-1.SE", name: "Software Engineering", credits: 6 },
      { code: "E-IPE", name: "Introduction to Prompt Engineering", credits: 6 },
      { code: "F-1.PS_1", name: "Problem Solving", credits: 6 },
      { code: "F-1.EAI", name: "Elements of AI", credits: 6 },
    ]
  },
  "Collegium Witelona Uczelnia Panstwowa": {
    country: "Poland",
    courses: [
      { code: "MI.4", name: "Computer Networks I", credits: 5 },
      { code: "MI.2", name: "Programming Basic I", credits: 6 },
      { code: "ME.1", name: "Basics of Economics and Finance", credits: 4 },
      { code: "BI.1", name: "Mathematics I", credits: 6 },
      { code: "ML.2", name: "Production Logistics", credits: 5 },
      { code: "MP.2", name: "Production and Service Management", credits: 5 },
    ]
  },
  "Panevezio Kolegija": {
    country: "Lithuania",
    courses: [
      { code: "PFL", name: "Professional Foreign Language", credits: 6 },
      { code: "IIT", name: "Innovative Information Technology", credits: 6 },
      { code: "HN", name: "Health Nutrition", credits: 3 },
      { code: "CAD", name: "Computer Aided Design (CAD)", credits: 6 },
      { code: "SSE", name: "Software systems engineering", credits: 3 },
      { code: "LWN", name: "Local and wide area networks", credits: 3 },
      { code: "CNS", name: "Computer network security and control", credits: 3 },
    ]
  },
  "Babeș-Bolyai University": {
    country: "Romania",
    courses: [
      { code: "MLE5023", name: "Formal languages and compiler design", credits: 5 },
      { code: "MLE5077", name: "Parallel and distributed programming", credits: 5 },
      { code: "MLE5260", name: "Database fundamentals", credits: 5 },
      { code: "MLE5002", name: "Computer networks", credits: 6 },
      { code: "MLE5258", name: "Advanced programming techniques", credits: 5 },
      { code: "MLE5078", name: "Mobile application programming", credits: 4 },
    ]
  },
};

// ── Home Institution Course Catalog ──
const HOME_INSTITUTION_CATALOG = {
  name: "Çankırı Karatekin Üniversitesi",
  department: "Bilgisayar Mühendisliği",
  courses: [
    // 1. Dönem - 1. Sınıf Güz
    { code: "TDİ101", name: "Türk Dili I", credits: 2, year: 1, semester: "Fall", type: "Zorunlu" },
    { code: "BİL111", name: "Bilgisayar Programlama I", credits: 5, year: 1, semester: "Fall", type: "Zorunlu" },
    { code: "BİL113", name: "Bilgisayar Mühendisliği Etiği", credits: 4, year: 1, semester: "Fall", type: "Zorunlu" },
    { code: "ATA101", name: "Atatürk İlkeleri ve İnkılâp Tarihi I", credits: 2, year: 1, semester: "Fall", type: "Zorunlu" },
    { code: "FİZ161", name: "Genel Fizik I", credits: 5, year: 1, semester: "Fall", type: "Zorunlu" },
    { code: "BİL101", name: "Bilgisayar Mühendisliğine Giriş", credits: 5, year: 1, semester: "Fall", type: "Zorunlu" },
    { code: "OZD101", name: "Kariyer Planlama", credits: 1, year: 1, semester: "Fall", type: "Zorunlu" },
    { code: "MAT161", name: "Matematik I", credits: 5, year: 1, semester: "Fall", type: "Zorunlu" },
    
    // 2. Dönem - 1. Sınıf Bahar
    { code: "ATA102", name: "Atatürk İlkeleri ve İnkılâp Tarihi II", credits: 2, year: 1, semester: "Spring", type: "Zorunlu" },
    { code: "TDİ102", name: "Türk Dili II", credits: 2, year: 1, semester: "Spring", type: "Zorunlu" },
    { code: "BİL132", name: "Bilgisayar Programlama II", credits: 7, year: 1, semester: "Spring", type: "Zorunlu" },
    { code: "MAT162", name: "Matematik II", credits: 5, year: 1, semester: "Spring", type: "Zorunlu" },
    { code: "FİZ162", name: "Genel Fizik II", credits: 5, year: 1, semester: "Spring", type: "Zorunlu" },
    { code: "MAT142", name: "Ayrık Matematik ve Uygulamaları", credits: 5, year: 1, semester: "Spring", type: "Zorunlu" },
    
    // 3. Dönem - 2. Sınıf Güz
    { code: "BİL231", name: "Bilgisayar Mühendisliğinde Mesleki İngilizce", credits: 4, year: 2, semester: "Fall", type: "Zorunlu" },
    { code: "BİL201", name: "Algoritma ve Veri Yapıları I", credits: 6, year: 2, semester: "Fall", type: "Zorunlu" },
    { code: "BİL203", name: "Nesnesel Tasarım ve Programlama", credits: 7, year: 2, semester: "Fall", type: "Zorunlu" },
    { code: "BİL205", name: "Sayısal Sistem Tasarımı", credits: 7, year: 2, semester: "Fall", type: "Zorunlu" },
    { code: "MAT221", name: "Doğrusal Cebir", credits: 6, year: 2, semester: "Fall", type: "Zorunlu" },
    
    // 4. Dönem - 2. Sınıf Bahar
    { code: "BİL222", name: "Differansiyel Denklemler", credits: 5, year: 2, semester: "Spring", type: "Zorunlu" },
    { code: "BİL232", name: "Mühendislik Ekonomisi", credits: 5, year: 2, semester: "Spring", type: "Zorunlu" },
    { code: "BİL202", name: "Algoritma ve Veri Yapıları II", credits: 6, year: 2, semester: "Spring", type: "Zorunlu" },
    { code: "BİL206", name: "Elektrik ve Elektronik Devrelerinin Temelleri", credits: 5, year: 2, semester: "Spring", type: "Zorunlu" },
    { code: "BİL212", name: "Olasılık Teorisi ve İstatistik", credits: 5, year: 2, semester: "Spring", type: "Zorunlu" },
    { code: "BİL200", name: "Staj I", credits: 4, year: 2, semester: "Spring", type: "Zorunlu" },
    
    // 5. Dönem - 3. Sınıf Güz
    { code: "BİL305", name: "İşletim Sistemleri", credits: 6, year: 3, semester: "Fall", type: "Zorunlu" },
    { code: "BİL307", name: "Mikroişlemciler", credits: 7, year: 3, semester: "Fall", type: "Zorunlu" },
    { code: "BİL301", name: "Programlama Dilleri", credits: 6, year: 3, semester: "Fall", type: "Zorunlu" },
    { code: "BİL303", name: "Veritabanı Sistemleri", credits: 7, year: 3, semester: "Fall", type: "Zorunlu" },
    
    // 6. Dönem - 3. Sınıf Bahar
    { code: "BİL308", name: "Bilgisayar Mimarisi ve Organizasyonu", credits: 6, year: 3, semester: "Spring", type: "Zorunlu" },
    { code: "BİL312", name: "Web Tasarımı ve Programlama", credits: 5, year: 3, semester: "Spring", type: "Zorunlu" },
    { code: "BİL314", name: "Otomata Teorisi ve Formal Diller", credits: 5, year: 3, semester: "Spring", type: "Zorunlu" },
    { code: "BİL300", name: "Staj II", credits: 4, year: 3, semester: "Spring", type: "Zorunlu" },
    
    // 7. Dönem - 4. Sınıf Güz
    { code: "BİL401", name: "Bilgisayar Ağları", credits: 7, year: 4, semester: "Fall", type: "Zorunlu" },
    { code: "BİL403", name: "Yazılım Mühendisliği İlkeleri", credits: 6, year: 4, semester: "Fall", type: "Zorunlu" },
    
    // 8. Dönem - 4. Sınıf Bahar
    { code: "BİL482", name: "Yönetim Bilişim Sistemleri", credits: 6, year: 4, semester: "Spring", type: "Zorunlu" },
    { code: "BİL494", name: "Bitirme Projesi", credits: 6, year: 4, semester: "Spring", type: "Zorunlu" },
    
    // Seçmeli Dersler - Teknik Seçmeliler
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
    
    // Genel Seçmeliler
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
  // Tablo 1: English/Word Based Grades
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
  
  // Tablo 2 & 3: Numeric Grades (0-100 and 0-4 scale)
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
  
  // Tablo 3: Letter Grades from Other Universities
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
  
  // Tablo 4: ECTS Grades
  ectsGrades: {
    "A": "A",
    "B": "B1",
    "C": "B2",
    "D": "C1",
    "E": "C3",
    "FX": "F1",
    "F": "F2",
  },
  
  // 10'luk Sistem
  scale10: {
    "10": "A",
    "9": "B1",
    "8": "B2",
    "7": "B3",
    "6": "C1",
    "5": "C2",
    "4": "C3",
    "3": "F2", "2": "F2", "1": "F2", "0": "F2",
  },
  
  // 5'lik Sistem (A) - Genel
  scale5a: {
    "5": "A", "5.0": "A",
    "4.5": "B1",
    "4": "B2", "4.0": "B2",
    "3.5": "B3",
    "3": "C1", "3.0": "C1",
    "2.5": "C2",
    "2": "C3", "2.0": "C3",
    "1.5": "F2", "1": "F2", "1.0": "F2", "0.5": "F2", "0": "F2", "0.0": "F2",
  },
  
  // 5'lik Sistem (B) - Alternatif
  scale5b: {
    "5": "A", "5.0": "A",
    "4.5": "B1",
    "4": "B2", "4.0": "B2",
    "3.5": "C1",
    "3": "C2", "3.0": "C2",
    "2.5": "C3",
    "2": "F2", "2.0": "F2",
  },
  
  // 5'lik Sistem (C)
  scale5c: {
    "5": "A", "5.0": "A",
    "4": "B2", "4.0": "B2",
    "3": "C1", "3.0": "C1",
    "2": "C3", "2.0": "C3",
    "1": "F1", "1.0": "F1",
    "0": "F2", "0.0": "F2",
  },
  
  // 5'lik Sistem (D)
  scale5d: {
    "5": "A", "5.0": "A",
    "4.5": "B1",
    "4": "B2", "4.0": "B2",
    "3.5": "C1",
    "3": "C2", "3.0": "C2",
    "2.5": "C3",
    "2": "F2", "2.0": "F2",
  },
};

// Not dönüşüm fonksiyonu
const convertGrade = (inputGrade, system = "auto") => {
  if (!inputGrade) return "Muaf";
  
  const grade = inputGrade.toString().trim().toUpperCase();
  
  // Otomatik sistem algılama
  if (system === "auto") {
    // ECTS (A-F)
    if (/^[A-F]X?$/.test(grade)) {
      return GRADE_CONVERSION.ectsGrades[grade] || grade;
    }
    
    // Letter grades (AA, BA, BB, etc.)
    if (GRADE_CONVERSION.letterGrades[grade]) {
      return GRADE_CONVERSION.letterGrades[grade];
    }
    
    // Numeric (0-100 or 0-4 or 0-5 or 0-10)
    const num = parseFloat(grade);
    if (!isNaN(num)) {
      if (num <= 4) {
        // 4.0 scale
        return GRADE_CONVERSION.numericToGrade(num * 25);
      } else if (num <= 5) {
        // 5.0 scale - default to scale A
        return GRADE_CONVERSION.scale5a[grade] || GRADE_CONVERSION.numericToGrade(num * 20);
      } else if (num <= 10) {
        // 10 scale
        return GRADE_CONVERSION.scale10[Math.floor(num).toString()] || GRADE_CONVERSION.numericToGrade(num * 10);
      } else {
        // 0-100 scale
        return GRADE_CONVERSION.numericToGrade(num);
      }
    }
    
    // Word based
    const lowerGrade = inputGrade.toLowerCase();
    if (GRADE_CONVERSION.table1[lowerGrade]) {
      return GRADE_CONVERSION.table1[lowerGrade];
    }
  }
  
  // Dönüştürülemedi, orijinal notu döndür
  return inputGrade;
};

// ── Sample Data ──
const SAMPLE_STUDENTS = [
  {
    id: 4,
    studentNumber: "AND43",
    firstName: "Ayten Nisa",
    lastName: "DİK",
    email: "nisadik43@icloud.com",
    hostInstitution: "Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich",
    hostCountry: "Poland",
    semester: "Fall 2025",
    outgoingMatches: [
      {
        id: "out18",
        homeCourses: [{ code: "BİL307", name: "Mikroişlemciler", credits: 7 }],
        hostCourses: [{ code: "05-EMS-APN-SP1", name: "Architecture and Programming of Micricontrollers", credits: 8 }],
      },
      {
        id: "out19",
        homeCourses: [{ code: "BİL401", name: "Bilgisayar Ağları", credits: 7 }],
        hostCourses: [{ code: "05-EMS-CN-SP1", name: "Computer Networks", credits: 4 }],
      },
      {
        id: "out20",
        homeCourses: [{ code: "-", name: "Elective 1", credits: 4 }],
        hostCourses: [
          { code: "15-EMS-HW-SP1", name: "History of Design", credits: 3 },
          { code: "05-EMS-RES-SP1", name: "Renewable Energy Sources", credits: 2 },
        ],
      },
      {
        id: "out21",
        homeCourses: [{ code: "-", name: "Elective 2", credits: 6 }],
        hostCourses: [
          { code: "15-EMS-BD-SP1", name: "Basics of Design", credits: 4 },
          { code: "05-EMS-WSD-SP1", name: "Web Services Design", credits: 2 },
        ],
      },
      {
        id: "out22",
        homeCourses: [{ code: "-", name: "Elective 3", credits: 4 }],
        hostCourses: [{ code: "08-EMS-FINAC-SP1", name: "Financial Accounting", credits: 6 }],
      },
      {
        id: "out23",
        homeCourses: [{ code: "-", name: "Elective 4", credits: 4 }],
        hostCourses: [{ code: "05-EMS-BOS-SP1", name: "Basics of Operating Systems", credits: 3 }],
      },
    ],
    returnMatches: [],
  },
  {
    id: 5,
    studentNumber: "EIF222",
    firstName: "Ece İrem",
    lastName: "FİLİZ",
    email: "eceirem222@gmail.com",
    hostInstitution: "Panevezio Kolegija",
    hostCountry: "Lithuania",
    semester: "Fall 2025",
    outgoingMatches: [
      {
        id: "out24",
        homeCourses: [
          { code: "-", name: "Elective I", credits: 3 },
          { code: "-", name: "Elective II", credits: 3 },
        ],
        hostCourses: [{ code: "-", name: "Professional Foreign Language", credits: 6 }],
      },
      {
        id: "out25",
        homeCourses: [{ code: "BİL482", name: "Yönetim Bilişim Sistemleri", credits: 6 }],
        hostCourses: [{ code: "-", name: "Innovative Information Technology", credits: 6 }],
      },
      {
        id: "out26",
        homeCourses: [{ code: "-", name: "Elective III", credits: 3 }],
        hostCourses: [{ code: "-", name: "Health Nutrition", credits: 3 }],
      },
      {
        id: "out27",
        homeCourses: [{ code: "-", name: "Elective IV", credits: 6 }],
        hostCourses: [{ code: "-", name: "Computer Aided Design (CAD)", credits: 6 }],
      },
      {
        id: "out28",
        homeCourses: [{ code: "BİL403", name: "Yazılım Mühendisliği İlkeleri", credits: 6 }],
        hostCourses: [
          { code: "-", name: "Software systems engineering", credits: 3 },
          { code: "-", name: "Local and wide area networks", credits: 3 },
        ],
      },
      {
        id: "out29",
        homeCourses: [{ code: "-", name: "Elective V", credits: 3 }],
        hostCourses: [{ code: "-", name: "Computer network security and control", credits: 3 }],
      },
    ],
    returnMatches: [],
  },
  {
    id: 10,
    studentNumber: "FO006",
    firstName: "Furkan",
    lastName: "ÖZEL",
    email: "ozelfurkan006@gmail.com",
    hostInstitution: "Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich",
    hostCountry: "Poland",
    semester: "Fall 2025",
    outgoingMatches: [
      {
        id: "out51",
        homeCourses: [{ code: "BİL305", name: "İşletim Sistemleri", credits: 6 }],
        hostCourses: [{ code: "05-EMS-BOS-SP1", name: "Basics of Operating Systems", credits: 3 }],
      },
      {
        id: "out52",
        homeCourses: [{ code: "BİL307", name: "Mikroişlemciler", credits: 7 }],
        hostCourses: [{ code: "05-EMS-APN-SP1", name: "Architecture and Programming of Microcontrollers", credits: 8 }],
      },
      {
        id: "out53",
        homeCourses: [{ code: "BİL401", name: "Bilgisayar Ağları", credits: 7 }],
        hostCourses: [
          { code: "05-EMS-CN-SP1", name: "Computer Networks", credits: 4 },
          { code: "15-EMS-HW-SP1", name: "History of Design", credits: 3 },
        ],
      },
      {
        id: "out54",
        homeCourses: [{ code: "-", name: "Seçmeli 1", credits: 5 }],
        hostCourses: [
          { code: "15-EMS-BD-SP1", name: "Basics of Design", credits: 4 },
        ],
      },
      {
        id: "out55",
        homeCourses: [{ code: "-", name: "Seçmeli 2", credits: 4 }],
        hostCourses: [{ code: "08-EMS-MANAG-SP1", name: "Management", credits: 6 }],
      },
      {
        id: "out56",
        homeCourses: [{ code: "-", name: "Seçmeli 3", credits: 4 }],
        hostCourses: [{ code: "08-EMS-MANAC-SP1", name: "Management Accounting", credits: 5 }],
      },
    ],
    returnMatches: [],
  },
  {
    id: 9,
    studentNumber: "HTG2003",
    firstName: "Halil Talha",
    lastName: "GÜNDÜZ",
    email: "haliltalhagunduz@gmail.com",
    hostInstitution: "Panevezio Kolegija",
    hostCountry: "Lithuania",
    semester: "Fall 2025",
    outgoingMatches: [
      {
        id: "out45",
        homeCourses: [
          { code: "-", name: "Elective I", credits: 3 },
          { code: "-", name: "Elective II", credits: 3 },
        ],
        hostCourses: [{ code: "-", name: "Professional Foreign Language", credits: 6 }],
      },
      {
        id: "out46",
        homeCourses: [{ code: "BİL482", name: "Yönetim Bilişim Sistemleri", credits: 6 }],
        hostCourses: [{ code: "-", name: "Innovative Information Technology", credits: 6 }],
      },
      {
        id: "out47",
        homeCourses: [{ code: "-", name: "Elective III", credits: 3 }],
        hostCourses: [{ code: "-", name: "Health Nutrition", credits: 3 }],
      },
      {
        id: "out48",
        homeCourses: [{ code: "-", name: "Elective IV", credits: 6 }],
        hostCourses: [{ code: "-", name: "Computer Aided Design (CAD)", credits: 6 }],
      },
      {
        id: "out49",
        homeCourses: [{ code: "BİL403", name: "Yazılım Mühendisliği İlkeleri", credits: 6 }],
        hostCourses: [
          { code: "-", name: "Software systems engineering", credits: 3 },
          { code: "-", name: "Local and wide area networks", credits: 3 },
        ],
      },
      {
        id: "out50",
        homeCourses: [{ code: "-", name: "Elective V", credits: 3 }],
        hostCourses: [{ code: "-", name: "Computer network security and control", credits: 3 }],
      },
    ],
    returnMatches: [],
  },
  {
    id: 8,
    studentNumber: "ND1635",
    firstName: "Neslihan",
    lastName: "DEMİRCİ",
    email: "neslihan.nevin1635@gmail.com",
    hostInstitution: "Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich",
    hostCountry: "Poland",
    semester: "Fall 2025",
    outgoingMatches: [
      {
        id: "out40",
        homeCourses: [{ code: "BİL305", name: "İşletim Sistemleri", credits: 6 }],
        hostCourses: [{ code: "05-EMS-BOS-SP1", name: "Basics of Operating Systems", credits: 3 }],
      },
      {
        id: "out41",
        homeCourses: [{ code: "BİL307", name: "Mikroişlemciler", credits: 7 }],
        hostCourses: [{ code: "05-EMS-APN-SP1", name: "Architecture and Programming of Microcontrollers", credits: 8 }],
      },
      {
        id: "out42",
        homeCourses: [{ code: "BİL205", name: "Sayısal Sistem Tasarımı", credits: 7 }],
        hostCourses: [
          { code: "05-EMS-DC-SP1", name: "Digital Circuits", credits: 4 },
          { code: "05-EMS-RES-SP1", name: "Renewable Energy Sources", credits: 2 },
        ],
      },
      {
        id: "out43",
        homeCourses: [
          { code: "-", name: "Elective 1", credits: 4 },
          { code: "-", name: "Elective 2", credits: 4 },
        ],
        hostCourses: [
          { code: "15-EMS-HW-SP1", name: "History of Design", credits: 3 },
          { code: "15-EMS-BD-SP1", name: "Basics of Design", credits: 4 },
          { code: "15-EMS-DS-SP1", name: "Specialized Design", credits: 4 },
        ],
      },
      {
        id: "out44",
        homeCourses: [{ code: "-", name: "Elective 3", credits: 4 }],
        hostCourses: [{ code: "15-EMS-PD-SP1", name: "Packaging Design", credits: 4 }],
      },
    ],
    returnMatches: [],
  },
  {
    id: 7,
    studentNumber: "RBK2004",
    firstName: "Rabia Beyza",
    lastName: "KURUP",
    email: "kuruprabia@gmail.com",
    hostInstitution: "Babeș-Bolyai University",
    hostCountry: "Romania",
    semester: "Fall 2025",
    outgoingMatches: [
      {
        id: "out35",
        homeCourses: [{ code: "BİL301", name: "Programlama Dilleri", credits: 6 }],
        hostCourses: [{ code: "MLE5023", name: "Formal languages and compiler design", credits: 5 }],
      },
      {
        id: "out36",
        homeCourses: [{ code: "BİL303", name: "Veritabanı Sistemleri", credits: 7 }],
        hostCourses: [
          { code: "MLE5077", name: "Parallel and distributed programming", credits: 5 },
          { code: "MLE5260", name: "Database fundamentals", credits: 5 },
        ],
      },
      {
        id: "out37",
        homeCourses: [{ code: "BİL401", name: "Bilgisayar Ağları", credits: 7 }],
        hostCourses: [{ code: "MLE5002", name: "Computer networks", credits: 6 }],
      },
      {
        id: "out38",
        homeCourses: [
          { code: "-", name: "Elective 1", credits: 4 },
          { code: "-", name: "Elective 2", credits: 3 },
        ],
        hostCourses: [
          { code: "MLE5258", name: "Advanced programming techniques", credits: 5 },
          { code: "MLE5078", name: "Mobile application programming", credits: 4 },
        ],
      },
      {
        id: "out39",
        homeCourses: [{ code: "-", name: "Elective 3", credits: 3 }],
        hostCourses: [{ code: "MLE5078", name: "Mobile application programming", credits: 4 }],
      },
    ],
    returnMatches: [],
  },
  {
    id: 6,
    studentNumber: "SNC128",
    firstName: "Sude Naz",
    lastName: "ÇAKMAK",
    email: "sudecakmak128@yandex.com",
    hostInstitution: "Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich",
    hostCountry: "Poland",
    semester: "Fall 2025",
    outgoingMatches: [
      {
        id: "out30",
        homeCourses: [{ code: "BİL307", name: "Mikroişlemciler", credits: 7 }],
        hostCourses: [{ code: "05-EMS-APN-SP1", name: "Architecture and Programming of Microcontrollers", credits: 8 }],
      },
      {
        id: "out31",
        homeCourses: [{ code: "BİL401", name: "Bilgisayar Ağları", credits: 7 }],
        hostCourses: [{ code: "05-EMS-CN-SP1", name: "Computer Networks", credits: 4 }],
      },
      {
        id: "out32",
        homeCourses: [{ code: "BİL305", name: "İşletim Sistemleri", credits: 6 }],
        hostCourses: [
          { code: "05-EMS-BOS-SP1", name: "Basics of Operating Systems", credits: 3 },
          { code: "05-EMS-WSD-SP1", name: "Web Services Design", credits: 2 },
        ],
      },
      {
        id: "out33",
        homeCourses: [{ code: "BİL203", name: "Nesnesel Tasarım ve Programlama", credits: 7 }],
        hostCourses: [
          { code: "15-EMS-VC-SP1", name: "Visual Communication", credits: 3 },
          { code: "05-EMS-FP-SP1", name: "Fundamentals of Programming", credits: 5 },
        ],
      },
      {
        id: "out34",
        homeCourses: [{ code: "BİL205", name: "Sayısal Sistem Tasarımı", credits: 7 }],
        hostCourses: [
          { code: "05-EMS-DC-SP1", name: "Digital Circuits", credits: 4 },
          { code: "05-EMS-RES-SP1", name: "Renewable Energy Sources", credits: 2 },
          { code: "15-EMS-HW-SP1", name: "History of Design", credits: 3 },
        ],
      },
    ],
    returnMatches: [],
  },
  {
    id: 1,
    studentNumber: "YEB2147",
    firstName: "Yunus Emre",
    lastName: "BOZAN",
    email: "ybe2147@gmail.com",
    hostInstitution: "Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich",
    hostCountry: "Poland",
    semester: "Fall 2025",
    outgoingMatches: [
      {
        id: "out1",
        homeCourses: [{ code: "BIL401", name: "Computer Networks", credits: 7 }],
        hostCourses: [{ code: "05-EMS-CN-SP1", name: "Computer Networks", credits: 4 }],
      },
      {
        id: "out2",
        homeCourses: [{ code: "-", name: "Elective 1", credits: 4 }],
        hostCourses: [{ code: "05-EMS-RES-SP1", name: "Renewable Energy Sources", credits: 2 }],
      },
      {
        id: "out3",
        homeCourses: [{ code: "-", name: "Elective 2", credits: 5 }],
        hostCourses: [{ code: "05-EMS-FP-SP1", name: "Fundamentals of Programming", credits: 5 }],
      },
      {
        id: "out4",
        homeCourses: [{ code: "-", name: "Elective 3", credits: 4 }],
        hostCourses: [{ code: "00-EMS-STAT-SP1", name: "Statistics", credits: 6 }],
      },
      {
        id: "out5",
        homeCourses: [{ code: "-", name: "Elective 4", credits: 4 }],
        hostCourses: [{ code: "05-EMS-SG-SP1", name: "Smart Grid", credits: 8 }],
      },
      {
        id: "out6",
        homeCourses: [{ code: "-", name: "Elective 5", credits: 6 }],
        hostCourses: [{ code: "05-EMS-SLP-SP1", name: "Script Languages Programming", credits: 5 }],
      },
    ],
    returnMatches: [],
  },
  {
    id: 3,
    studentNumber: "YEO101",
    firstName: "Yunus Emre",
    lastName: "ÖNEL",
    email: "ynsemronl@outlook.com",
    hostInstitution: "Collegium Witelona Uczelnia Panstwowa",
    hostCountry: "Poland",
    semester: "Fall 2025",
    outgoingMatches: [
      {
        id: "out12",
        homeCourses: [{ code: "BIL401", name: "Computer Networks", credits: 7 }],
        hostCourses: [{ code: "MI.4", name: "Computer Networks I", credits: 5 }],
      },
      {
        id: "out13",
        homeCourses: [{ code: "-", name: "Elective 1", credits: 6 }],
        hostCourses: [{ code: "MI.2", name: "Programming Basic I", credits: 6 }],
      },
      {
        id: "out14",
        homeCourses: [{ code: "-", name: "Elective 2", credits: 3 }],
        hostCourses: [{ code: "ME.1", name: "Basics of Economics and Finance", credits: 4 }],
      },
      {
        id: "out15",
        homeCourses: [{ code: "-", name: "Elective 3", credits: 4 }],
        hostCourses: [{ code: "BI.1", name: "Mathematics I", credits: 6 }],
      },
      {
        id: "out16",
        homeCourses: [{ code: "-", name: "Elective 4", credits: 5 }],
        hostCourses: [{ code: "ML.2", name: "Production Logistics", credits: 5 }],
      },
      {
        id: "out17",
        homeCourses: [{ code: "-", name: "Elective 5", credits: 5 }],
        hostCourses: [{ code: "MP.2", name: "Production and Service Management", credits: 5 }],
      },
    ],
    returnMatches: [],
  },
  {
    id: 2,
    studentNumber: "ZA3400",
    firstName: "Zeynep",
    lastName: "AKBULUT",
    email: "zeynepakbulut3400@gmail.com",
    hostInstitution: "Politechnika Krakowska",
    hostCountry: "Poland",
    semester: "Fall 2025",
    outgoingMatches: [
      {
        id: "out7",
        homeCourses: [{ code: "BİL401", name: "Bilgisayar Ağları", credits: 7 }],
        hostCourses: [{ code: "E-CN", name: "Computer Networks", credits: 6 }],
      },
      {
        id: "out8",
        homeCourses: [{ code: "BİL403", name: "Yazılım Mühendisliği İlkeleri", credits: 6 }],
        hostCourses: [{ code: "F-1.SE", name: "Software Engineering", credits: 6 }],
      },
      {
        id: "out9",
        homeCourses: [{ code: "-", name: "Elective 1", credits: 5 }],
        hostCourses: [{ code: "E-IPE", name: "Introduction to Prompt Engineering", credits: 6 }],
      },
      {
        id: "out10",
        homeCourses: [{ code: "-", name: "Elective 2", credits: 6 }],
        hostCourses: [{ code: "F-1.PS_1", name: "Problem Solving", credits: 6 }],
      },
      {
        id: "out11",
        homeCourses: [
          { code: "-", name: "Elective 3", credits: 3 },
          { code: "-", name: "Elective 4", credits: 3 },
        ],
        hostCourses: [{ code: "F-1.EAI", name: "Elements of AI", credits: 6 }],
      },
    ],
    returnMatches: [],
  },
];

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
const GripIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
  </svg>
);
const FileTextIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);

// ── Styles ──
const styles = {
  global: `
    @import url('${FONTS_LINK}');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Source Sans 3', sans-serif; -webkit-font-smoothing: antialiased; }
  `,
};

// ── Components ──
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
  const styles = {
    primary: { bg: C.navy, color: "#fff", hoverBg: C.navyLight },
    secondary: { bg: C.border, color: C.text, hoverBg: C.borderLight },
    success: { bg: C.green, color: "#fff", hoverBg: "#247d4d" },
    danger: { bg: C.accent, color: "#fff", hoverBg: "#6d1d29" },
  };
  const s = styles[variant];
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

const Input = ({ value, onChange, placeholder, type = "text", disabled }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
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
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.card,
          borderRadius: 12,
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: "20px 24px",
          borderBottom: `1px solid ${C.border}`,
          position: "sticky",
          top: 0,
          background: C.card,
          zIndex: 1,
        }}>
          <h2 style={{
            fontSize: 20,
            fontWeight: 600,
            color: C.navy,
            fontFamily: "'Playfair Display', serif",
          }}>{title}</h2>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
};

const Badge = ({ children, color = C.green, bg = C.greenLight }) => (
  <span style={{
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    color,
    background: bg,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  }}>{children}</span>
);

// ── Course Matching Card with Drag & Drop ──
const CourseMatchCard = ({ match, onDelete, onEdit, showGrade, type, readOnly = false }) => {
  const homeTotal = match.homeCourses.reduce((sum, c) => sum + c.credits, 0);
  const hostTotal = match.hostCourses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <div style={{
      background: C.bg,
      borderRadius: 10,
      padding: 20,
      marginBottom: 16,
      border: `1px solid ${C.border}`,
    }}>
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {/* Home Courses */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.navy,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 10,
            background: "#EEF0F5",
            padding: "6px 10px",
            borderRadius: 6,
            display: "inline-block",
          }}>Kendi Kurumumuz</div>
          {match.homeCourses.map((course, i) => (
            <div key={i} style={{
              background: C.card,
              padding: "10px 12px",
              borderRadius: 8,
              marginBottom: 6,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: C.textMuted,
                  fontWeight: 600,
                }}>{course.code}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{course.name}</span>
              </div>
              <div style={{
                fontSize: 12,
                color: C.textMuted,
                marginTop: 4,
              }}>{course.credits} AKTS</div>
            </div>
          ))}
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: C.navy,
            marginTop: 8,
          }}>Toplam: {homeTotal} AKTS</div>
        </div>

        {/* Arrow */}
        <div style={{ color: C.gold, flexShrink: 0 }}>
          <ArrowRightIcon />
        </div>

        {/* Host Courses */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.green,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 10,
            background: C.greenLight,
            padding: "6px 10px",
            borderRadius: 6,
            display: "inline-block",
          }}>Karşı Kurum</div>
          {match.hostCourses.map((course, i) => (
            <div key={i} style={{
              background: C.card,
              padding: "10px 12px",
              borderRadius: 8,
              marginBottom: 6,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: C.textMuted,
                  fontWeight: 600,
                }}>{course.code}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{course.name}</span>
              </div>
              <div style={{
                fontSize: 12,
                color: C.textMuted,
                marginTop: 4,
              }}>{course.credits} AKTS</div>
            </div>
          ))}
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: C.green,
            marginTop: 8,
          }}>Toplam: {hostTotal} AKTS</div>
        </div>

        {/* Grade (for return matches) */}
        {showGrade && (
          <div style={{
            background: C.card,
            padding: "12px 16px",
            borderRadius: 8,
            border: `2px solid ${C.navy}`,
            textAlign: "center",
            minWidth: 120,
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.textMuted,
              textTransform: "uppercase",
              marginBottom: 4,
            }}>Notlar</div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: C.navy,
              fontFamily: "'Playfair Display', serif",
            }}>
              {match.hostGrade || "A"} → {match.homeGrade || "Muaf"}
            </div>
            <div style={{
              fontSize: 10,
              color: C.textMuted,
              marginTop: 4,
            }}>Karşı → Kendi</div>
          </div>
        )}

        {/* Actions */}
        {!readOnly && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              onClick={() => onEdit(match)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: C.card,
                color: C.navy,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <EditIcon />
            </button>
            <button
              onClick={() => onDelete(match.id)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: C.card,
                color: C.accent,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Student Detail Modal ──
const StudentDetailModal = ({ student, onClose, onSave, readOnly = false }) => {
  const [editedStudent, setEditedStudent] = useState(student);
  const [activeTab, setActiveTab] = useState("outgoing");
  const [editingMatch, setEditingMatch] = useState(null);
  const [showCatalogModal, setShowCatalogModal] = useState(false);

  // Generate semesters list
  const generateSemesters = () => {
    const semesters = [];
    for (let year = 2024; year <= 2030; year++) {
      semesters.push(`Spring ${year}`);
      semesters.push(`Fall ${year}`);
    }
    return semesters;
  };
  const semesters = generateSemesters();

  const updateStudent = (field, value) => {
    setEditedStudent(prev => ({ ...prev, [field]: value }));
  };

  const addMatch = (type) => {
    const newMatch = {
      id: `${type}${Date.now()}`,
      homeCourses: [],
      hostCourses: [],
      ...(type === "return" ? { hostGrade: "", homeGrade: "Muaf" } : {}),
    };
    setEditedStudent(prev => ({
      ...prev,
      [`${type}Matches`]: [...prev[`${type}Matches`], newMatch],
    }));
    setEditingMatch({ type, match: newMatch });
  };

  const copyFromOutgoing = (outgoingMatch) => {
    // Gidiş eşleştirmesini dönüş eşleştirmesine kopyala
    const newReturnMatch = {
      id: `return${Date.now()}`,
      homeCourses: JSON.parse(JSON.stringify(outgoingMatch.homeCourses)),
      hostCourses: JSON.parse(JSON.stringify(outgoingMatch.hostCourses)),
      hostGrade: "A", // Varsayılan not
      homeGrade: "Muaf",
    };
    setEditedStudent(prev => ({
      ...prev,
      returnMatches: [...prev.returnMatches, newReturnMatch],
    }));
  };

  const deleteMatch = (type, id) => {
    setEditedStudent(prev => ({
      ...prev,
      [`${type}Matches`]: prev[`${type}Matches`].filter(m => m.id !== id),
    }));
  };

  const exportStudentData = () => {
    const data = {
      "Öğrenci Bilgileri": {
        "Öğrenci Numarası": editedStudent.studentNumber,
        "Ad": editedStudent.firstName,
        "Soyad": editedStudent.lastName,
        "Karşı Kurum": editedStudent.hostInstitution,
        "Ülke": editedStudent.hostCountry,
      },
      "Gidiş Eşleştirmeleri": editedStudent.outgoingMatches.map(m => ({
        "Kendi Derslerimiz": m.homeCourses.map(c => `${c.code} - ${c.name} (${c.credits} AKTS)`).join(" | "),
        "Karşı Kurum Dersleri": m.hostCourses.map(c => `${c.code} - ${c.name} (${c.credits} AKTS)`).join(" | "),
      })),
      "Dönüş Eşleştirmeleri": editedStudent.returnMatches.map(m => ({
        "Kendi Derslerimiz": m.homeCourses.map(c => `${c.code} - ${c.name} (${c.credits} AKTS)`).join(" | "),
        "Karşı Kurum Dersleri": m.hostCourses.map(c => `${c.code} - ${c.name} (${c.credits} AKTS)`).join(" | "),
        "Not": m.grade,
        "Puan": m.gradePoints,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${editedStudent.studentNumber}_${editedStudent.lastName}_Learning_Agreement.json`;
    a.click();
  };

  return (
    <Modal open={true} onClose={onClose} title={`${student.firstName} ${student.lastName} - Learning Agreement`} width={1000}>
      {/* Student Info */}
      {/* ReadOnly Warning */}
      {readOnly && (
        <div style={{
          padding: 16,
          background: "#FFF3CD",
          border: "2px solid #FFC107",
          borderRadius: 12,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{ fontSize: 24 }}>🔒</div>
          <div>
            <div style={{ fontWeight: 600, color: "#856404", marginBottom: 4 }}>
              Sadece Görüntüleme Modu
            </div>
            <div style={{ fontSize: 13, color: "#856404" }}>
              Bu öğrencinin bilgilerini sadece görüntüleyebilirsiniz. Düzenleme yapabilmek için admin yetkisi gereklidir.
            </div>
          </div>
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
        marginBottom: 24,
        padding: 20,
        background: C.goldPale,
        borderRadius: 10,
        border: `1px solid ${C.goldLight}`,
      }}>
        <FormField label="Öğrenci Numarası">
          <Input
            value={editedStudent.studentNumber}
            onChange={e => updateStudent("studentNumber", e.target.value)}
            disabled={readOnly}
          />
        </FormField>
        <FormField label="Ad">
          <Input
            value={editedStudent.firstName}
            onChange={e => updateStudent("firstName", e.target.value)}
            disabled={readOnly}
          />
        </FormField>
        <FormField label="Soyad">
          <Input
            value={editedStudent.lastName}
            onChange={e => updateStudent("lastName", e.target.value)}
            disabled={readOnly}
          />
        </FormField>
        <FormField label="Karşı Kurum">
          <select
            value={editedStudent.hostInstitution}
            onChange={e => {
              const selectedUni = e.target.value;
              updateStudent("hostInstitution", selectedUni);
              // Ülkeyi otomatik doldur
              if (UNIVERSITY_CATALOGS[selectedUni]) {
                updateStudent("hostCountry", UNIVERSITY_CATALOGS[selectedUni].country);
              }
            }}
            disabled={readOnly}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "inherit",
              backgroundColor: readOnly ? "#f5f5f5" : "white",
              cursor: readOnly ? "not-allowed" : "pointer",
            }}
          >
            <option value="">Üniversite Seçin</option>
            {Object.keys(UNIVERSITY_CATALOGS).map(uni => (
              <option key={uni} value={uni}>{uni}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Ülke">
          <Input
            value={editedStudent.hostCountry}
            onChange={e => updateStudent("hostCountry", e.target.value)}
            disabled
            style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
          />
        </FormField>
        <FormField label="Dönem">
          <select
            value={editedStudent.semester || "Fall 2025"}
            onChange={e => updateStudent("semester", e.target.value)}
            disabled={readOnly}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "inherit",
              backgroundColor: "white",
              cursor: "pointer",
            }}
          >
            {semesters.map(sem => {
              let displayText = sem;
              if (sem.startsWith("Spring")) {
                displayText = sem.replace("Spring", "Bahar");
              } else if (sem.startsWith("Fall")) {
                displayText = sem.replace("Fall", "Güz");
              }
              return (
                <option key={sem} value={sem}>
                  {displayText}
                </option>
              );
            })}
          </select>
        </FormField>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: `2px solid ${C.border}` }}>
        <button
          onClick={() => setActiveTab("outgoing")}
          style={{
            padding: "12px 24px",
            border: "none",
            background: "transparent",
            color: activeTab === "outgoing" ? C.navy : C.textMuted,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            borderBottom: activeTab === "outgoing" ? `3px solid ${C.navy}` : "3px solid transparent",
            fontFamily: "'Source Sans 3', sans-serif",
          }}
        >
          Gidiş Eşleştirmeleri ({editedStudent.outgoingMatches.length})
        </button>
        <button
          onClick={() => setActiveTab("return")}
          style={{
            padding: "12px 24px",
            border: "none",
            background: "transparent",
            color: activeTab === "return" ? C.navy : C.textMuted,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            borderBottom: activeTab === "return" ? `3px solid ${C.navy}` : "3px solid transparent",
            fontFamily: "'Source Sans 3', sans-serif",
          }}
        >
          Dönüş Eşleştirmeleri ({editedStudent.returnMatches.length})
        </button>
      </div>

      {/* Matches */}
      <div style={{ minHeight: 300, maxHeight: 400, overflowY: "auto", marginBottom: 20 }}>
        {activeTab === "outgoing" && (
          <>
            {/* Ders Kataloğu Butonu */}
            {editedStudent.hostInstitution && UNIVERSITY_CATALOGS[editedStudent.hostInstitution] && (
              <div style={{
                padding: 16,
                background: "#E3F2FD",
                border: "2px solid #2196F3",
                borderRadius: 12,
                marginBottom: 20,
              }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1565C0",
                  marginBottom: 12,
                }}>
                  📚 {editedStudent.hostInstitution} Ders Kataloğu
                </div>
                {!readOnly && (
                  <Btn onClick={() => setShowCatalogModal(true)} variant="secondary" icon={<PlusIcon />}>
                    Katalogdan Ders Seç ve Ekle
                  </Btn>
                )}
              </div>
            )}
            
            {editedStudent.outgoingMatches.map(match => (
              <CourseMatchCard
                key={match.id}
                match={match}
                onDelete={(id) => deleteMatch("outgoing", id)}
                onEdit={(m) => setEditingMatch({ type: "outgoing", match: m })}
                showGrade={false}
                type="outgoing"
                readOnly={readOnly}
              />
            ))}
            {!readOnly && (
              <Btn onClick={() => addMatch("outgoing")} variant="secondary" icon={<PlusIcon />}>
                Manuel Eşleştirme Ekle
              </Btn>
            )}
          </>
        )}

        {activeTab === "return" && (
          <>
            {/* Gidiş verilerinden doldurma yardımcısı */}
            {!readOnly && editedStudent.outgoingMatches.length > 0 && (
              <div style={{
                padding: 20,
                background: "#FFF9E6",
                border: "2px dashed #FDB022",
                borderRadius: 12,
                marginBottom: 20,
              }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.navy,
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  💡 Gidiş Eşleştirmelerinden Hızlı Doldur
                </div>
                <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
                  Öğrenci giderken planlanan eşleştirmelerden birini seçerek dönüş kaydını hızlıca oluşturabilirsiniz. 
                  Gerekirse notları ve dersleri düzenleyebilirsiniz.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {editedStudent.outgoingMatches.map((outMatch, idx) => {
                    const homeCoursesText = outMatch.homeCourses.map(c => c.code || c.name).join(", ");
                    const hostCoursesText = outMatch.hostCourses.map(c => c.code || c.name).join(", ");
                    const alreadyExists = editedStudent.returnMatches.some(retMatch => 
                      JSON.stringify(retMatch.homeCourses) === JSON.stringify(outMatch.homeCourses) &&
                      JSON.stringify(retMatch.hostCourses) === JSON.stringify(outMatch.hostCourses)
                    );
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => copyFromOutgoing(outMatch)}
                        disabled={alreadyExists}
                        style={{
                          padding: "10px 16px",
                          background: alreadyExists ? "#f5f5f5" : "white",
                          border: `2px solid ${alreadyExists ? "#e0e0e0" : C.gold}`,
                          borderRadius: 8,
                          cursor: alreadyExists ? "not-allowed" : "pointer",
                          fontSize: 13,
                          color: alreadyExists ? C.textMuted : C.navy,
                          opacity: alreadyExists ? 0.5 : 1,
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={e => {
                          if (!alreadyExists) {
                            e.currentTarget.style.background = C.goldPale;
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (!alreadyExists) {
                            e.currentTarget.style.background = "white";
                            e.currentTarget.style.transform = "translateY(0)";
                          }
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          {alreadyExists ? "✓ " : "+ "}Eşleştirme {idx + 1}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>
                          {homeCoursesText.substring(0, 30)}... ↔ {hostCoursesText.substring(0, 30)}...
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {editedStudent.returnMatches.map(match => (
              <CourseMatchCard
                key={match.id}
                match={match}
                onDelete={(id) => deleteMatch("return", id)}
                onEdit={(m) => setEditingMatch({ type: "return", match: m })}
                showGrade={true}
                type="return"
                readOnly={readOnly}
              />
            ))}
            {!readOnly && (
              <Btn onClick={() => addMatch("return")} variant="secondary" icon={<PlusIcon />}>
                Manuel Dönüş Eşleştirmesi Ekle
              </Btn>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        paddingTop: 20,
        borderTop: `1px solid ${C.border}`,
      }}>
        <Btn onClick={exportStudentData} variant="secondary" icon={<DownloadIcon />}>
          Dışa Aktar (JSON)
        </Btn>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={onClose} variant="secondary">{readOnly ? 'Kapat' : 'İptal'}</Btn>
          {!readOnly && <Btn onClick={() => onSave(editedStudent)}>Kaydet</Btn>}
        </div>
      </div>

      {/* Course Edit Modal */}
      {editingMatch && (
        <CourseMatchEditModal
          match={editingMatch.match}
          type={editingMatch.type}
          onClose={() => setEditingMatch(null)}
          onSave={(updatedMatch) => {
            setEditedStudent(prev => ({
              ...prev,
              [`${editingMatch.type}Matches`]: prev[`${editingMatch.type}Matches`].map(m =>
                m.id === updatedMatch.id ? updatedMatch : m
              ),
            }));
            setEditingMatch(null);
          }}
        />
      )}

      {/* Course Catalog Modal */}
      {showCatalogModal && (
        <CourseCatalogModal
          university={editedStudent.hostInstitution}
          onClose={() => setShowCatalogModal(false)}
          onSelect={(hostCourses) => {
            // Seçilen dersleri eşleştirme olarak ekle
            const newMatch = {
              id: `outgoing${Date.now()}`,
              homeCourses: [], // Kullanıcı sonra eşleştirecek
              hostCourses: hostCourses,
            };
            setEditedStudent(prev => ({
              ...prev,
              outgoingMatches: [...prev.outgoingMatches, newMatch],
            }));
            setShowCatalogModal(false);
            // Düzenleme modunda aç
            setEditingMatch({ type: "outgoing", match: newMatch });
          }}
        />
      )}
    </Modal>
  );
};

// ── Course Catalog Modal ──
const CourseCatalogModal = ({ university, onClose, onSelect }) => {
  const [selectedCourses, setSelectedCourses] = useState([]);
  const catalog = UNIVERSITY_CATALOGS[university];

  if (!catalog) return null;

  const toggleCourse = (course) => {
    setSelectedCourses(prev => {
      const exists = prev.find(c => c.code === course.code);
      if (exists) {
        return prev.filter(c => c.code !== course.code);
      } else {
        return [...prev, { ...course }];
      }
    });
  };

  const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
      padding: 20,
    }}>
      <div style={{
        background: C.card,
        borderRadius: 16,
        maxWidth: 900,
        width: "100%",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {/* Header */}
        <div style={{
          padding: 24,
          borderBottom: `2px solid ${C.border}`,
        }}>
          <h3 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: C.navy,
            fontFamily: "'Playfair Display', serif",
            marginBottom: 8,
          }}>
            📚 Ders Kataloğu
          </h3>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>
            {university}
          </p>
        </div>

        {/* Course List */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: 24,
        }}>
          <div style={{
            display: "grid",
            gap: 12,
          }}>
            {catalog.courses.map((course, idx) => {
              const isSelected = selectedCourses.find(c => c.code === course.code);
              return (
                <div
                  key={idx}
                  onClick={() => toggleCourse(course)}
                  style={{
                    padding: 16,
                    border: `2px solid ${isSelected ? C.green : C.border}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    background: isSelected ? C.greenLight : "white",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = C.navy;
                      e.currentTarget.style.background = C.bg;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = C.border;
                      e.currentTarget.style.background = "white";
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "start", gap: 12 }}>
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      border: `2px solid ${isSelected ? C.green : C.border}`,
                      background: isSelected ? C.green : "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}>
                      {isSelected && (
                        <div style={{ color: "white", fontSize: 14, fontWeight: 700 }}>✓</div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: C.navy,
                        marginBottom: 4,
                      }}>
                        {course.name}
                      </div>
                      <div style={{
                        fontSize: 13,
                        color: C.textMuted,
                        display: "flex",
                        gap: 16,
                      }}>
                        <span>Kod: <strong>{course.code}</strong></span>
                        <span>AKTS: <strong>{course.credits}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: 24,
          borderTop: `2px solid ${C.border}`,
          background: C.bg,
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 14, color: C.textMuted }}>
              Seçili: <strong>{selectedCourses.length}</strong> ders
            </div>
            <div style={{ fontSize: 14, color: C.navy, fontWeight: 600 }}>
              Toplam: <strong>{totalCredits}</strong> AKTS
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={onClose} variant="secondary">İptal</Btn>
            <Btn 
              onClick={() => selectedCourses.length > 0 && onSelect(selectedCourses)}
              disabled={selectedCourses.length === 0}
            >
              {selectedCourses.length} Ders Ekle
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Course Match Edit Modal ──
const CourseMatchEditModal = ({ match, type, onClose, onSave }) => {
  const [editedMatch, setEditedMatch] = useState(JSON.parse(JSON.stringify(match)));
  const [showHomeCatalog, setShowHomeCatalog] = useState(false);
  const [showHostCatalog, setShowHostCatalog] = useState(false);

  const addCourse = (side) => {
    const newCourse = { code: "", name: "", credits: 0 };
    setEditedMatch(prev => ({
      ...prev,
      [`${side}Courses`]: [...prev[`${side}Courses`], newCourse],
    }));
  };

  const addCoursesFromCatalog = (side, courses) => {
    setEditedMatch(prev => ({
      ...prev,
      [`${side}Courses`]: [...prev[`${side}Courses`], ...courses],
    }));
  };

  const updateCourse = (side, index, field, value) => {
    setEditedMatch(prev => ({
      ...prev,
      [`${side}Courses`]: prev[`${side}Courses`].map((c, i) =>
        i === index ? { ...c, [field]: field === "credits" ? parseFloat(value) || 0 : value } : c
      ),
    }));
  };

  const removeCourse = (side, index) => {
    setEditedMatch(prev => ({
      ...prev,
      [`${side}Courses`]: prev[`${side}Courses`].filter((_, i) => i !== index),
    }));
  };

  return (
    <Modal open={true} onClose={onClose} title="Ders Eşleştirmesini Düzenle" width={900}>
      {/* Info message for return matches */}
      {type === "return" && (
        <div style={{
          padding: 16,
          background: "#E3F2FD",
          border: "2px solid #2196F3",
          borderRadius: 12,
          marginBottom: 20,
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#1565C0",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            ℹ️ Düzenleme İpucu
          </div>
          <div style={{ fontSize: 13, color: "#424242" }}>
            Bu eşleştirme gidiş verileriyle dolduruldu. Öğrenci Erasmus'ta farklı bir ders aldıysa veya 
            ders değiştirdiyse aşağıdaki alanlardan düzenleyebilirsiniz. Ders ekleyip çıkarabilir, 
            kodları ve kredileri güncelleyebilirsiniz.
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 24 }}>
        {/* Home Courses */}
        <div>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: C.navy,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 12,
            background: "#EEF0F5",
            padding: "8px 12px",
            borderRadius: 8,
          }}>Kendi Kurumumuz</div>

          {editedMatch.homeCourses.map((course, i) => (
            <div key={i} style={{
              padding: 16,
              background: C.bg,
              borderRadius: 8,
              marginBottom: 12,
              border: `1px solid ${C.border}`,
            }}>
              <FormField label="Ders Kodu">
                <Input
                  value={course.code}
                  onChange={e => updateCourse("home", i, "code", e.target.value)}
                  placeholder="BIL201"
                />
              </FormField>
              <FormField label="Ders Adı">
                <Input
                  value={course.name}
                  onChange={e => updateCourse("home", i, "name", e.target.value)}
                  placeholder="Veri Yapıları"
                />
              </FormField>
              <FormField label="AKTS">
                <Input
                  type="number"
                  value={course.credits}
                  onChange={e => updateCourse("home", i, "credits", e.target.value)}
                  placeholder="6"
                />
              </FormField>
              <Btn onClick={() => removeCourse("home", i)} variant="danger" small>
                <TrashIcon /> Sil
              </Btn>
            </div>
          ))}

          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => setShowHomeCatalog(true)} variant="secondary" small icon={<PlusIcon />}>
              Katalogdan Seç
            </Btn>
            <Btn onClick={() => addCourse("home")} variant="secondary" small icon={<PlusIcon />}>
              Manuel Ekle
            </Btn>
          </div>
        </div>

        {/* Arrow */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.gold,
          paddingTop: 40,
        }}>
          <ArrowRightIcon />
        </div>

        {/* Host Courses */}
        <div>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: C.green,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 12,
            background: C.greenLight,
            padding: "8px 12px",
            borderRadius: 8,
          }}>Karşı Kurum</div>

          {editedMatch.hostCourses.map((course, i) => (
            <div key={i} style={{
              padding: 16,
              background: C.bg,
              borderRadius: 8,
              marginBottom: 12,
              border: `1px solid ${C.border}`,
            }}>
              <FormField label="Ders Kodu">
                <Input
                  value={course.code}
                  onChange={e => updateCourse("host", i, "code", e.target.value)}
                  placeholder="CS201"
                />
              </FormField>
              <FormField label="Ders Adı">
                <Input
                  value={course.name}
                  onChange={e => updateCourse("host", i, "name", e.target.value)}
                  placeholder="Data Structures"
                />
              </FormField>
              <FormField label="AKTS">
                <Input
                  type="number"
                  value={course.credits}
                  onChange={e => updateCourse("host", i, "credits", e.target.value)}
                  placeholder="5"
                />
              </FormField>
              <Btn onClick={() => removeCourse("host", i)} variant="danger" small>
                <TrashIcon /> Sil
              </Btn>
            </div>
          ))}

          <Btn onClick={() => addCourse("host")} variant="secondary" small icon={<PlusIcon />}>
            Manuel Ders Ekle
          </Btn>
        </div>
      </div>

      {/* Grade (for return matches) */}
      {type === "return" && (
        <div style={{
          marginTop: 24,
          padding: 20,
          background: C.goldPale,
          borderRadius: 10,
          border: `1px solid ${C.goldLight}`,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: C.navy,
            marginBottom: 16,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>📝 Not Bilgileri</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Karşı Kurumdan Alınan Not">
              <Input
                value={editedMatch.hostGrade || ""}
                onChange={e => setEditedMatch(prev => ({ ...prev, hostGrade: e.target.value }))}
                placeholder="A, B+, 85, vb."
              />
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                Öğrencinin karşı kurumdan aldığı not
              </div>
              {editedMatch.hostGrade && (
                <div style={{ 
                  marginTop: 8, 
                  padding: 8, 
                  background: '#fffacd', 
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.navy,
                  border: '2px solid #ffd700'
                }}>
                  🔄 Dönüşüm: <strong>{convertGrade(editedMatch.hostGrade)}</strong>
                </div>
              )}
            </FormField>
            <FormField label="Kendi Kurumumuzdaki Karşılık">
              <Input
                value={editedMatch.homeGrade || "Muaf"}
                onChange={e => setEditedMatch(prev => ({ ...prev, homeGrade: e.target.value }))}
                placeholder="Muaf, AA, BB, vb."
              />
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                Genellikle "Muaf" olarak işlenir
              </div>
            </FormField>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 24,
        paddingTop: 20,
        borderTop: `1px solid ${C.border}`,
      }}>
        <Btn onClick={onClose} variant="secondary">İptal</Btn>
        <Btn onClick={() => onSave(editedMatch)}>Kaydet</Btn>
      </div>

      {/* Home Institution Catalog Modal */}
      {showHomeCatalog && (
        <HomeInstitutionCatalogModal
          onClose={() => setShowHomeCatalog(false)}
          onSelect={(courses) => {
            addCoursesFromCatalog("home", courses);
            setShowHomeCatalog(false);
          }}
        />
      )}
    </Modal>
  );
};

// ── Login Modal ──
const LoginModal = ({ onLogin }) => {
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Varsayılan admin şifresi
  const ADMIN_PASSWORD = "admin123";

  // Öğrenci şifreleri (localStorage'da saklanabilir)
  const getStudentPasswords = () => {
    const saved = localStorage.getItem('student_passwords');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {};
      }
    }
    // Varsayılan şifreler - her öğrenci için "1234"
    return {
      "AND43": "1234",
      "YEB47": "1234",
      "SNC23": "1234",
      "ND53": "1234",
      "YEO110": "1234",
      "EIF018": "1234",
      "HTG2003": "1234",
      "RBK061": "1234",
      "ZA001": "1234",
      "FO006": "1234",
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (isAdminMode) {
      // Admin girişi
      if (password === ADMIN_PASSWORD) {
        onLogin({
          role: 'admin',
          name: 'Admin',
          studentNumber: null,
        });
      } else {
        setError("Admin şifresi yanlış!");
      }
    } else {
      // Öğrenci girişi
      const passwords = getStudentPasswords();
      
      if (!studentNumber.trim()) {
        setError("Öğrenci numarası gerekli!");
        return;
      }

      if (passwords[studentNumber] === password) {
        // Öğrenci bilgilerini bul
        const savedStudents = localStorage.getItem('erasmus_students');
        let students = SAMPLE_STUDENTS;
        if (savedStudents) {
          try {
            students = JSON.parse(savedStudents);
          } catch (e) {}
        }
        
        const student = students.find(s => s.studentNumber === studentNumber);
        
        if (student) {
          onLogin({
            role: 'student',
            name: `${student.firstName} ${student.lastName}`,
            studentNumber: studentNumber,
          });
        } else {
          setError("Öğrenci bulunamadı!");
        }
      } else {
        setError("Öğrenci numarası veya şifre yanlış!");
      }
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
      padding: 20,
    }}>
      <div style={{
        background: C.card,
        borderRadius: 16,
        maxWidth: 450,
        width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: 32,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          textAlign: "center",
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            fontFamily: "'Playfair Display', serif",
            marginBottom: 8,
          }}>
            Erasmus Öğrenim Anlaşması
          </h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>
            Çankırı Karatekin Üniversitesi
          </p>
        </div>

        {/* Toggle */}
        <div style={{
          display: "flex",
          padding: 24,
          paddingBottom: 0,
        }}>
          <button
            onClick={() => setIsAdminMode(false)}
            style={{
              flex: 1,
              padding: "12px 24px",
              border: "none",
              background: !isAdminMode ? C.navy : "transparent",
              color: !isAdminMode ? "white" : C.textMuted,
              borderRadius: "8px 8px 0 0",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              transition: "all 0.3s",
            }}
          >
            👨‍🎓 Öğrenci Girişi
          </button>
          <button
            onClick={() => setIsAdminMode(true)}
            style={{
              flex: 1,
              padding: "12px 24px",
              border: "none",
              background: isAdminMode ? C.navy : "transparent",
              color: isAdminMode ? "white" : C.textMuted,
              borderRadius: "8px 8px 0 0",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              transition: "all 0.3s",
            }}
          >
            🔐 Admin Girişi
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {!isAdminMode && (
            <FormField label="Öğrenci Numarası">
              <Input
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="Örn: AND43"
                autoFocus
              />
            </FormField>
          )}
          
          <FormField label="Şifre">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isAdminMode ? "Admin şifresi" : "Öğrenci şifresi"}
              autoFocus={isAdminMode}
            />
          </FormField>

          {error && (
            <div style={{
              padding: 12,
              background: "#FEE2E2",
              color: "#991B1B",
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 16,
            }}>
              ⚠️ {error}
            </div>
          )}

          <Btn type="submit" style={{ width: "100%" }}>
            {isAdminMode ? "Admin Olarak Giriş Yap" : "Öğrenci Olarak Giriş Yap"}
          </Btn>

          <div style={{
            marginTop: 16,
            padding: 12,
            background: C.bg,
            borderRadius: 8,
            fontSize: 12,
            color: C.textMuted,
          }}>
            <strong>ℹ️ Bilgi:</strong>
            <br />
            {isAdminMode ? (
              <>Varsayılan admin şifresi: <code style={{background: "white", padding: "2px 6px", borderRadius: 4}}>admin123</code></>
            ) : (
              <>Varsayılan öğrenci şifresi: <code style={{background: "white", padding: "2px 6px", borderRadius: 4}}>1234</code></>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Grade Converter Widget ──
const GradeConverter = () => {
  const [inputGrade, setInputGrade] = useState("");
  const [convertedGrade, setConvertedGrade] = useState(null);

  const handleConvert = () => {
    if (inputGrade.trim()) {
      const result = convertGrade(inputGrade);
      setConvertedGrade(result);
    }
  };

  const examples = [
    { input: "A", system: "ECTS" },
    { input: "BA", system: "Harf" },
    { input: "85", system: "100'lük" },
    { input: "8", system: "10'luk" },
    { input: "4.5", system: "5'lik" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <Input
            value={inputGrade}
            onChange={(e) => setInputGrade(e.target.value)}
            placeholder="Notu girin (örn: A, BA, 85, 8.5, 4.0)"
            onKeyPress={(e) => e.key === 'Enter' && handleConvert()}
            style={{ flex: 1 }}
          />
          <Btn onClick={handleConvert}>Dönüştür</Btn>
        </div>
        
        {convertedGrade && (
          <div style={{
            padding: 20,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 12,
            textAlign: 'center',
            color: 'white',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
              {inputGrade} → ÇAKÜ Not Sistemi
            </div>
            <div style={{
              fontSize: 48,
              fontWeight: 700,
              fontFamily: "'Playfair Display', serif",
            }}>
              {convertedGrade}
            </div>
          </div>
        )}
      </div>

      <div style={{
        padding: 16,
        background: C.bg,
        borderRadius: 8,
        border: `1px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 12 }}>
          💡 Örnek Notlar:
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {examples.map((ex, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputGrade(ex.input);
                setConvertedGrade(convertGrade(ex.input));
              }}
              style={{
                padding: "6px 12px",
                background: "white",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.navy;
                e.currentTarget.style.color = "white";
                e.currentTarget.style.borderColor = C.navy;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.color = C.text;
                e.currentTarget.style.borderColor = C.border;
              }}
            >
              {ex.input} <span style={{ opacity: 0.6 }}>({ex.system})</span>
            </button>
          ))}
        </div>
      </div>

      <details style={{ marginTop: 16 }}>
        <summary style={{
          cursor: "pointer",
          padding: 12,
          background: C.bg,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          color: C.navy,
        }}>
          📚 Desteklenen Not Sistemleri
        </summary>
        <div style={{
          marginTop: 12,
          padding: 16,
          background: "white",
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          fontSize: 12,
          color: C.text,
          lineHeight: 1.8,
        }}>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li><strong>ECTS:</strong> A, B, C, D, E, FX, F</li>
            <li><strong>Harf Notları:</strong> AA, BA, BB, CB, CC, DC, DD, FF, FD</li>
            <li><strong>100'lük Sistem:</strong> 0-100 arası sayılar</li>
            <li><strong>10'luk Sistem:</strong> 0-10 arası sayılar</li>
            <li><strong>5'lik Sistem:</strong> 0-5 arası sayılar (4 farklı varyasyon)</li>
            <li><strong>Kelime Bazlı:</strong> very good, good, sufficient, vb.</li>
          </ul>
        </div>
      </details>
    </div>
  );
};

// ── Home Institution Catalog Modal ──
const HomeInstitutionCatalogModal = ({ onClose, onSelect }) => {
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [filterYear, setFilterYear] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const toggleCourse = (course) => {
    setSelectedCourses(prev => {
      const exists = prev.find(c => c.code === course.code);
      if (exists) {
        return prev.filter(c => c.code !== course.code);
      } else {
        return [...prev, { code: course.code, name: course.name, credits: course.credits }];
      }
    });
  };

  const filteredCourses = HOME_INSTITUTION_CATALOG.courses.filter(c => {
    if (filterYear !== "all" && c.year !== parseInt(filterYear) && c.year !== 0) return false;
    if (filterSemester !== "all" && c.semester !== filterSemester && c.semester !== "Any") return false;
    if (filterType !== "all" && c.type !== filterType) return false;
    return true;
  });

  const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10001,
      padding: 20,
    }}>
      <div style={{
        background: C.card,
        borderRadius: 16,
        maxWidth: 900,
        width: "100%",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {/* Header */}
        <div style={{
          padding: 24,
          borderBottom: `2px solid ${C.border}`,
        }}>
          <h3 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: C.navy,
            fontFamily: "'Playfair Display', serif",
            marginBottom: 4,
          }}>
            📚 {HOME_INSTITUTION_CATALOG.name}
          </h3>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>
            {HOME_INSTITUTION_CATALOG.department} - Ders Kataloğu
          </p>
          
          {/* Filters */}
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              style={{
                padding: "8px 12px",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "inherit",
                backgroundColor: "white",
                cursor: "pointer",
              }}
            >
              <option value="all">Tüm Sınıflar</option>
              <option value="1">1. Sınıf</option>
              <option value="2">2. Sınıf</option>
              <option value="3">3. Sınıf</option>
              <option value="4">4. Sınıf</option>
              <option value="0">Seçmeli</option>
            </select>
            <select
              value={filterSemester}
              onChange={e => setFilterSemester(e.target.value)}
              style={{
                padding: "8px 12px",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "inherit",
                backgroundColor: "white",
                cursor: "pointer",
              }}
            >
              <option value="all">Tüm Dönemler</option>
              <option value="Fall">Güz</option>
              <option value="Spring">Bahar</option>
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              style={{
                padding: "8px 12px",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "inherit",
                backgroundColor: "white",
                cursor: "pointer",
              }}
            >
              <option value="all">Tümü</option>
              <option value="Zorunlu">Zorunlu</option>
              <option value="Seçmeli">Seçmeli</option>
            </select>
          </div>
        </div>

        {/* Course List */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: 24,
        }}>
          <div style={{ display: "grid", gap: 12 }}>
            {filteredCourses.map((course, idx) => {
              const isSelected = selectedCourses.find(c => c.code === course.code);
              return (
                <div
                  key={idx}
                  onClick={() => toggleCourse(course)}
                  style={{
                    padding: 16,
                    border: `2px solid ${isSelected ? C.navy : C.border}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    background: isSelected ? "#EEF0F5" : "white",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = C.navy;
                      e.currentTarget.style.background = C.bg;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = C.border;
                      e.currentTarget.style.background = "white";
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "start", gap: 12 }}>
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      border: `2px solid ${isSelected ? C.navy : C.border}`,
                      background: isSelected ? C.navy : "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}>
                      {isSelected && (
                        <div style={{ color: "white", fontSize: 14, fontWeight: 700 }}>✓</div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}>
                        <div style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: C.navy,
                        }}>
                          {course.name}
                        </div>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          background: course.type === "Zorunlu" ? "#DBEAFE" : "#FEF3C7",
                          color: course.type === "Zorunlu" ? "#1E40AF" : "#92400E",
                        }}>
                          {course.type}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 13,
                        color: C.textMuted,
                        display: "flex",
                        gap: 16,
                        flexWrap: "wrap",
                      }}>
                        <span>Kod: <strong>{course.code}</strong></span>
                        <span>AKTS: <strong>{course.credits}</strong></span>
                        {course.year > 0 && <span>Sınıf: <strong>{course.year}</strong></span>}
                        {course.semester !== "Any" && (
                          <span>Dönem: <strong>{course.semester === "Fall" ? "Güz" : "Bahar"}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: 24,
          borderTop: `2px solid ${C.border}`,
          background: C.bg,
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 14, color: C.textMuted }}>
              Seçili: <strong>{selectedCourses.length}</strong> ders
            </div>
            <div style={{ fontSize: 14, color: C.navy, fontWeight: 600 }}>
              Toplam: <strong>{totalCredits}</strong> AKTS
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={onClose} variant="secondary">İptal</Btn>
            <Btn 
              onClick={() => selectedCourses.length > 0 && onSelect(selectedCourses)}
              disabled={selectedCourses.length === 0}
            >
              {selectedCourses.length} Ders Ekle
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main App ──
export default function ErasmusLearningAgreementApp() {
  const [students, setStudents] = useState(SAMPLE_STUDENTS);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const fileInputRef = useRef(null);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(true);

  // Load authentication from localStorage on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('erasmus_auth');
    if (savedAuth) {
      try {
        const auth = JSON.parse(savedAuth);
        setCurrentUser(auth);
        setIsAuthenticated(true);
        setShowLoginModal(false);
      } catch (e) {
        console.error('Auth load error:', e);
      }
    }
  }, []);

  // Save/Load students from localStorage
  useEffect(() => {
    const savedStudents = localStorage.getItem('erasmus_students');
    if (savedStudents) {
      try {
        setStudents(JSON.parse(savedStudents));
      } catch (e) {
        console.error('Students load error:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      localStorage.setItem('erasmus_students', JSON.stringify(students));
    }
  }, [students]);

  // Check if current user can edit this student
  const canEdit = (student) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'student') {
      return student.studentNumber === currentUser.studentNumber;
    }
    return false;
  };

  // Check if current user can view this student
  const canView = (student) => {
    if (!currentUser) return false;
    return true; // Tüm kullanıcılar diğer öğrencileri görebilir
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setShowLoginModal(false);
    localStorage.setItem('erasmus_auth', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setShowLoginModal(true);
    setSelectedStudent(null);
    localStorage.removeItem('erasmus_auth');
  };

  // Generate semesters from 2024 to 2030
  const generateSemesters = () => {
    const semesters = ["all"];
    for (let year = 2024; year <= 2030; year++) {
      semesters.push(`Spring ${year}`);
      semesters.push(`Fall ${year}`);
    }
    return semesters;
  };

  const semesters = generateSemesters();

  // Institution colors
  const institutionColors = {
    "Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich": "bg-blue-50 border-blue-200",
    "Politechnika Krakowska": "bg-purple-50 border-purple-200",
    "Collegium Witelona Uczelnia Panstwowa": "bg-green-50 border-green-200",
    "Panevezio Kolegija": "bg-amber-50 border-amber-200",
    "Babeș-Bolyai University": "bg-rose-50 border-rose-200",
  };

  const filteredStudents = students
    .filter(s => selectedSemester === "all" || s.semester === selectedSemester)
    .filter(s =>
      `${s.firstName} ${s.lastName} ${s.studentNumber} ${s.hostInstitution}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

  const handleSaveStudent = (updatedStudent) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    setSelectedStudent(null);
  };

  const handleAddStudent = () => {
    const newStudent = {
      id: Date.now(),
      studentNumber: "",
      firstName: "",
      lastName: "",
      hostInstitution: "",
      hostCountry: "",
      semester: "Fall 2025", // Varsayılan dönem
      outgoingMatches: [],
      returnMatches: [],
    };
    setStudents(prev => [...prev, newStudent]);
    setSelectedStudent(newStudent);
  };

  const handleDeleteStudent = (id) => {
    if (confirm("Bu öğrenciyi silmek istediğinizden emin misiniz?")) {
      setStudents(prev => prev.filter(s => s.id !== id));
    }
  };

  // Word belgesi oluştur - Gidiş Değerlendirmesi
  const generateOutgoingWordDoc = (student) => {
    if (!student.outgoingMatches || student.outgoingMatches.length === 0) {
      alert('Bu öğrencinin henüz gidiş eşleştirmesi bulunmamaktadır.');
      return;
    }

    const totalHomeCredits = student.outgoingMatches.reduce((sum, m) => 
      sum + m.homeCourses.reduce((s, c) => s + c.credits, 0), 0);
    const totalHostCredits = student.outgoingMatches.reduce((sum, m) => 
      sum + m.hostCourses.reduce((s, c) => s + c.credits, 0), 0);

    // Dönem bilgisini Türkçeye çevir
    const semester = student.semester || "Fall 2025";
    const [season, year] = semester.split(" ");
    const seasonTR = season === "Fall" ? "Güz" : "Bahar";
    const academicYear = season === "Fall" ? `${year}-${parseInt(year)+1}` : `${parseInt(year)-1}-${year}`;

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Erasmus Gidiş Değerlendirmesi</title></head>
      <body style='font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5;'>
        <h3 style='text-align: center; margin-bottom: 30px;'>ERASMUS+ GİDİŞ ÖNCESİ DERS EŞLEŞTİRME DEĞERLENDİRMESİ</h3>
        
        <p style='text-align: justify; margin: 20px 0;'>
          5- Bölümümüz <b>${student.studentNumber}</b> numaralı öğrencisi <b>${student.firstName} ${student.lastName}</b>'nun, 
          <b>${academicYear} Eğitim-Öğretim Yılı ${seasonTR} Dönemi</b>ni ERASMUS+ Öğrenim Hareketliliği programı kapsamında 
          <b>${student.hostCountry}</b>'da bulunan "<b>${student.hostInstitution}</b>" Üniversitesi, 
          Bilgisayar Mühendisliği Bölümünde alacağı derslerin karşılıklarının uygun olduğuna ve gereği için 
          Fakültemiz ilgili kurullarında görüşülmek üzere Dekanlık Makamına sunulmasına,
        </p>

        <table border='1' cellpadding='8' cellspacing='0' style='width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt;'>
          <thead>
            <tr style='background-color: #f0f0f0; font-weight: bold;'>
              <th colspan='4' style='text-align: center; border: 1px solid black;'>
                ${student.hostInstitution} Bölümünden Alacağı Dersin
              </th>
              <th colspan='4' style='text-align: center; border: 1px solid black;'>
                Çankırı Karatekin Üniversitesi Mühendislik Fakültesi<br/>Bilgisayar Mühendisliği Bölümünde Muaf Olacağı Dersin
              </th>
              <th style='text-align: center; border: 1px solid black;'>Statüsü</th>
            </tr>
            <tr style='background-color: #f8f8f8; font-weight: bold;'>
              <th style='border: 1px solid black;'>Kodu</th>
              <th style='border: 1px solid black;'>Adı</th>
              <th style='border: 1px solid black;'>AKTS</th>
              <th style='border: 1px solid black;'>Dönem</th>
              <th style='border: 1px solid black;'>Kodu</th>
              <th style='border: 1px solid black;'>Adı</th>
              <th style='border: 1px solid black;'>AKTS</th>
              <th style='border: 1px solid black;'>Dönem</th>
              <th style='border: 1px solid black;'>Statüsü</th>
            </tr>
          </thead>
          <tbody>
            ${student.outgoingMatches.map(match => {
              const hostCourses = match.hostCourses;
              const homeCourses = match.homeCourses;
              const maxRows = Math.max(hostCourses.length, homeCourses.length);
              
              let rows = '';
              for (let i = 0; i < maxRows; i++) {
                const hostCourse = hostCourses[i];
                const homeCourse = homeCourses[i];
                
                rows += '<tr>';
                
                // Karşı Kurum sütunları (Host)
                if (i === 0 && hostCourses.length > 1) {
                  // İlk satır - rowspan kullan
                  const totalHostCredits = hostCourses.reduce((s, c) => s + c.credits, 0);
                  rows += `
                    <td style='border: 1px solid black; vertical-align: middle;' rowspan='${hostCourses.length}'>${hostCourses.map(c => c.code || '-').join('<br/>')}</td>
                    <td style='border: 1px solid black; vertical-align: middle;' rowspan='${hostCourses.length}'>${hostCourses.map(c => c.name).join('<br/>')}</td>
                    <td style='border: 1px solid black; text-align: center; vertical-align: middle;' rowspan='${hostCourses.length}'>${totalHostCredits}</td>
                    <td style='border: 1px solid black; text-align: center; vertical-align: middle;' rowspan='${hostCourses.length}'>Güz</td>
                  `;
                } else if (hostCourses.length === 1) {
                  // Tek ders - normal göster
                  if (i === 0) {
                    rows += `
                      <td style='border: 1px solid black;'>${hostCourse ? (hostCourse.code || '-') : '-'}</td>
                      <td style='border: 1px solid black;'>${hostCourse ? hostCourse.name : '-'}</td>
                      <td style='border: 1px solid black; text-align: center;'>${hostCourse ? hostCourse.credits : '-'}</td>
                      <td style='border: 1px solid black; text-align: center;'>Güz</td>
                    `;
                  }
                }
                
                // Kendi Kurumumuz sütunları (Home)
                if (i === 0 && homeCourses.length > 1) {
                  // İlk satır - rowspan kullan
                  const totalHomeCredits = homeCourses.reduce((s, c) => s + c.credits, 0);
                  rows += `
                    <td style='border: 1px solid black; vertical-align: middle;' rowspan='${homeCourses.length}'>${homeCourses.map(c => c.code || '-').join('<br/>')}</td>
                    <td style='border: 1px solid black; vertical-align: middle;' rowspan='${homeCourses.length}'>${homeCourses.map(c => c.name).join('<br/>')}</td>
                    <td style='border: 1px solid black; text-align: center; vertical-align: middle;' rowspan='${homeCourses.length}'>${totalHomeCredits}</td>
                    <td style='border: 1px solid black; text-align: center; vertical-align: middle;' rowspan='${homeCourses.length}'>Güz</td>
                  `;
                } else if (homeCourses.length === 1) {
                  // Tek ders - normal göster
                  if (i === 0) {
                    rows += `
                      <td style='border: 1px solid black;'>${homeCourse ? (homeCourse.code || '-') : '-'}</td>
                      <td style='border: 1px solid black;'>${homeCourse ? homeCourse.name : '-'}</td>
                      <td style='border: 1px solid black; text-align: center;'>${homeCourse ? homeCourse.credits : '-'}</td>
                      <td style='border: 1px solid black; text-align: center;'>Güz</td>
                    `;
                  }
                }
                
                // Statü sütunu - sadece ilk satırda
                if (i === 0) {
                  rows += `<td style='border: 1px solid black; text-align: center; vertical-align: middle;' rowspan='${maxRows}'>Eşleşti</td>`;
                }
                
                rows += '</tr>';
              }
              
              return rows;
            }).join('')}
            <tr style='font-weight: bold; background-color: #f0f0f0;'>
              <td colspan='2' style='border: 1px solid black; text-align: right;'>Toplam</td>
              <td style='border: 1px solid black; text-align: center;'>${totalHostCredits}</td>
              <td style='border: 1px solid black;'></td>
              <td colspan='2' style='border: 1px solid black; text-align: right;'>Toplam</td>
              <td style='border: 1px solid black; text-align: center;'>${totalHomeCredits}</td>
              <td colspan='2' style='border: 1px solid black;'></td>
            </tr>
          </tbody>
        </table>

        <p style='margin-top: 40px;'>Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.lastName}_${student.firstName}_Gidiş_Değerlendirme.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Word belgesi oluştur - Dönüş Muafiyeti
  const generateReturnWordDoc = (student) => {
    if (student.returnMatches.length === 0) {
      alert('Bu öğrencinin henüz dönüş eşleştirmesi bulunmamaktadır.');
      return;
    }

    const totalHomeCredits = student.returnMatches.reduce((sum, m) => 
      sum + m.homeCourses.reduce((s, c) => s + c.credits, 0), 0);
    const totalHostCredits = student.returnMatches.reduce((sum, m) => 
      sum + m.hostCourses.reduce((s, c) => s + c.credits, 0), 0);

    // Dönem bilgisini Türkçeye çevir
    const semester = student.semester || "Fall 2025";
    const [season, year] = semester.split(" ");
    const seasonTR = season === "Fall" ? "Güz" : "Bahar";
    const academicYear = season === "Fall" ? `${year}-${parseInt(year)+1}` : `${parseInt(year)-1}-${year}`;

    // Ders statüsünü belirle (Zorunlu/Seçmeli)
    const getCourseStatus = (homeCourses) => {
      // Kendi kurumumuzdaki derslerin kodlarını kontrol et
      const hasElective = homeCourses.some(c => 
        c.code && (c.code.startsWith('SEÇ') || c.code.includes('Elective') || c.name.toLowerCase().includes('seçmeli'))
      );
      return hasElective ? 'Seçmeli' : 'Zorunlu';
    };

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Erasmus Dönüş Muafiyeti</title>
        <style>
          @page { size: A4 landscape; margin: 2cm; }
        </style>
      </head>
      <body style='font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5;'>
        <h3 style='text-align: center; margin-bottom: 30px;'>ERASMUS+ DÖNÜŞÜ MUAFİYET İSTEĞİ</h3>
        
        <p style='text-align: justify; margin: 20px 0;'>
          6- Bölümümüz <b>${student.studentNumber}</b> numaralı öğrencisi <b>${student.firstName} ${student.lastName}</b>'nun, 
          <b>${academicYear} Akademik Yılı ${seasonTR} Dönemi</b>nde ERASMUS+ programı kapsamında yurtdışında almış olduğu derslerin, 
          Bilgisayar Mühendisliği Bölümü lisans programında hangi derslere karşılık geldiği, hangi derslere sayılacağının 
          belirlenmesi talebi hakkında vermiş olduğu dilekçesi incelenmiş olup, aşağıda tabloda verildiği şekliyle uygun 
          olduğuna ve gereği için Fakültemiz ilgili kurullarında görüşülmek üzere Dekanlık Makamına sunulmasına,
        </p>

        <table border='1' cellpadding='8' cellspacing='0' style='width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt;'>
          <thead>
            <tr style='background-color: #f0f0f0; font-weight: bold;'>
              <th colspan='4' style='text-align: center; border: 1px solid black;'>
                Çankırı Karatekin Üniversitesi Mühendislik Fakültesi<br/>Bilgisayar Mühendisliği Bölümünde Muaf Olacağı Dersin
              </th>
              <th colspan='4' style='text-align: center; border: 1px solid black;'>
                ${student.hostInstitution}<br/>Bölümünden Aldığı Dersin
              </th>
              <th style='text-align: center; border: 1px solid black;'>Statüsü</th>
            </tr>
            <tr style='background-color: #f8f8f8; font-weight: bold;'>
              <th style='border: 1px solid black;'>Kodu</th>
              <th style='border: 1px solid black;'>Adı</th>
              <th style='border: 1px solid black;'>AKTS</th>
              <th style='border: 1px solid black;'>Başarı Notu</th>
              <th style='border: 1px solid black;'>Kodu</th>
              <th style='border: 1px solid black;'>Adı</th>
              <th style='border: 1px solid black;'>AKTS</th>
              <th style='border: 1px solid black;'>Alınan Not</th>
              <th style='border: 1px solid black;'>Dönüştürülen Not</th>
              <th style='border: 1px solid black;'>Statüsü</th>
            </tr>
          </thead>
          <tbody>
            ${student.returnMatches.map(match => {
              const hostCourses = match.hostCourses;
              const homeCourses = match.homeCourses;
              const maxRows = Math.max(hostCourses.length, homeCourses.length);
              
              // Not dönüşümü yap
              const originalHostGrade = match.hostGrade || 'A';
              const convertedGrade = convertGrade(originalHostGrade);
              
              let rows = '';
              for (let i = 0; i < maxRows; i++) {
                const homeCourse = homeCourses[i];
                const hostCourse = hostCourses[i];
                const status = homeCourse ? (
                  homeCourse.code && (homeCourse.code.startsWith('SEÇ') || 
                  homeCourse.code.includes('Elective') || 
                  homeCourse.name.toLowerCase().includes('seçmeli'))
                ) ? 'Seçmeli' : 'Zorunlu' : '';
                
                rows += '<tr>';
                
                // Kendi Kurumumuz sütunları
                if (i === 0 && homeCourses.length > 1) {
                  // İlk satır - rowspan kullan
                  const totalHomeCredits = homeCourses.reduce((s, c) => s + c.credits, 0);
                  rows += `
                    <td style='border: 1px solid black; vertical-align: middle;' rowspan='${homeCourses.length}'>${homeCourses.map(c => c.code || '-').join('<br/>')}</td>
                    <td style='border: 1px solid black; vertical-align: middle;' rowspan='${homeCourses.length}'>${homeCourses.map(c => c.name).join('<br/>')}</td>
                    <td style='border: 1px solid black; text-align: center; vertical-align: middle;' rowspan='${homeCourses.length}'>${totalHomeCredits}</td>
                    <td style='border: 1px solid black; text-align: center; vertical-align: middle;' rowspan='${homeCourses.length}'>${match.homeGrade || 'Muaf'}</td>
                  `;
                } else if (homeCourses.length === 1) {
                  // Tek ders - normal göster
                  if (i === 0) {
                    rows += `
                      <td style='border: 1px solid black;'>${homeCourse ? (homeCourse.code || '-') : '-'}</td>
                      <td style='border: 1px solid black;'>${homeCourse ? homeCourse.name : '-'}</td>
                      <td style='border: 1px solid black; text-align: center;'>${homeCourse ? homeCourse.credits : '-'}</td>
                      <td style='border: 1px solid black; text-align: center;'>${match.homeGrade || 'Muaf'}</td>
                    `;
                  }
                }
                
                // Karşı Kurum sütunları
                if (i === 0 && hostCourses.length > 1) {
                  // İlk satır - rowspan kullan
                  const totalHostCredits = hostCourses.reduce((s, c) => s + c.credits, 0);
                  rows += `
                    <td style='border: 1px solid black; vertical-align: middle;' rowspan='${hostCourses.length}'>${hostCourses.map(c => c.code || '-').join('<br/>')}</td>
                    <td style='border: 1px solid black; vertical-align: middle;' rowspan='${hostCourses.length}'>${hostCourses.map(c => c.name).join('<br/>')}</td>
                    <td style='border: 1px solid black; text-align: center; vertical-align: middle;' rowspan='${hostCourses.length}'>${totalHostCredits}</td>
                    <td style='border: 1px solid black; text-align: center; vertical-align: middle;' rowspan='${hostCourses.length}'>${originalHostGrade}</td>
                    <td style='border: 1px solid black; text-align: center; vertical-align: middle; background-color: #fffacd;' rowspan='${hostCourses.length}'><b>${convertedGrade}</b></td>
                  `;
                } else if (hostCourses.length === 1) {
                  // Tek ders - normal göster
                  if (i === 0) {
                    rows += `
                      <td style='border: 1px solid black;'>${hostCourse ? (hostCourse.code || '-') : '-'}</td>
                      <td style='border: 1px solid black;'>${hostCourse ? hostCourse.name : '-'}</td>
                      <td style='border: 1px solid black; text-align: center;'>${hostCourse ? hostCourse.credits : '-'}</td>
                      <td style='border: 1px solid black; text-align: center;'>${originalHostGrade}</td>
                      <td style='border: 1px solid black; text-align: center; background-color: #fffacd;'><b>${convertedGrade}</b></td>
                    `;
                  }
                }
                
                // Statü sütunu - sadece ilk satırda
                if (i === 0) {
                  const matchStatus = homeCourses.some(c => 
                    c.code && (c.code.startsWith('SEÇ') || c.code.includes('Elective') || c.name.toLowerCase().includes('seçmeli'))
                  ) ? 'Seçmeli' : 'Zorunlu';
                  rows += `<td style='border: 1px solid black; text-align: center; vertical-align: middle;' rowspan='${maxRows}'>${matchStatus}</td>`;
                }
                
                rows += '</tr>';
              }
              
              return rows;
            }).join('')}
            <tr style='font-weight: bold; background-color: #f0f0f0;'>
              <td colspan='2' style='border: 1px solid black; text-align: right;'>Toplam</td>
              <td style='border: 1px solid black; text-align: center;'>${totalHomeCredits}</td>
              <td style='border: 1px solid black;'></td>
              <td colspan='2' style='border: 1px solid black; text-align: right;'>Toplam</td>
              <td style='border: 1px solid black; text-align: center;'>${totalHostCredits}</td>
              <td colspan='3' style='border: 1px solid black;'></td>
            </tr>
          </tbody>
        </table>

        <div style='margin-top: 30px; padding: 15px; background-color: #f0f8ff; border: 2px solid #4682b4; border-radius: 8px;'>
          <p style='margin: 0; font-size: 10pt;'><b>Not:</b> "Dönüştürülen Not" sütunu, karşı kurumdan alınan notların Çankırı Karatekin Üniversitesi not sistemine dönüştürülmüş halidir (Üniversitemiz Ön Lisans ve Lisans Eğitim Yönetmeliği'ne göre).</p>
        </div>

        <p style='margin-top: 30px;'>
          <b>Öğrenci:</b> ${student.firstName} ${student.lastName} (${student.studentNumber})
        </p>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.lastName}_${student.firstName}_Dönüş_Muafiyet.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAllData = () => {
    const data = students.map(s => ({
      "Öğrenci Numarası": s.studentNumber,
      "Ad": s.firstName,
      "Soyad": s.lastName,
      "Karşı Kurum": s.hostInstitution,
      "Ülke": s.hostCountry,
      "Gidiş Eşleştirme Sayısı": s.outgoingMatches.length,
      "Dönüş Eşleştirme Sayısı": s.returnMatches.length,
    }));

    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map(row => Object.values(row).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Erasmus_Learning_Agreements_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) {
          setStudents(prev => [...prev, ...importedData]);
          alert(`${importedData.length} öğrenci başarıyla içe aktarıldı!`);
        }
      } catch (error) {
        alert("Dosya formatı hatalı! JSON formatında dosya yükleyin.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "40px 60px" }}>
      <style>{styles.global}</style>

      {/* Login Modal */}
      {showLoginModal && <LoginModal onLogin={handleLogin} />}

      {/* Header */}
      <div style={{
        marginBottom: 40,
        paddingBottom: 24,
        borderBottom: `2px solid ${C.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <h1 style={{
            fontSize: 36,
            fontWeight: 700,
            color: C.navy,
            fontFamily: "'Playfair Display', serif",
            marginBottom: 8,
          }}>Erasmus Learning Agreement Yönetimi</h1>
          <p style={{ fontSize: 16, color: C.textMuted }}>
            Öğrenci ders eşleştirmelerini görüntüleyin, düzenleyin ve dışa aktarın
          </p>
        </div>
        {currentUser && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}>
            <div style={{
              padding: "12px 20px",
              background: currentUser.role === 'admin' ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              borderRadius: 12,
              color: "white",
            }}>
              <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 2 }}>
                {currentUser.role === 'admin' ? '🔐 Admin' : '👨‍🎓 Öğrenci'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {currentUser.name}
              </div>
            </div>
            <Btn onClick={handleLogout} variant="secondary">
              Çıkış Yap
            </Btn>
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 300 }}>
            <div style={{ flex: 1, maxWidth: 350 }}>
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Öğrenci ara (ad, numara, kurum)..."
              />
            </div>
            <select
              value={selectedSemester}
              onChange={e => setSelectedSemester(e.target.value)}
              style={{
                padding: "10px 14px",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 14,
                fontFamily: "inherit",
                backgroundColor: "white",
                cursor: "pointer",
                minWidth: 150,
              }}
            >
              {semesters.map(sem => {
                let displayText = sem;
                if (sem === "all") {
                  displayText = "Tüm Dönemler";
                } else if (sem.startsWith("Spring")) {
                  displayText = sem.replace("Spring", "Bahar");
                } else if (sem.startsWith("Fall")) {
                  displayText = sem.replace("Fall", "Güz");
                }
                return (
                  <option key={sem} value={sem}>
                    {displayText}
                  </option>
                );
              })}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {currentUser?.role === 'admin' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: "none" }}
                />
                <Btn onClick={() => fileInputRef.current?.click()} variant="secondary" icon={<UploadIcon />}>
                  İçe Aktar
                </Btn>
                <Btn onClick={exportAllData} variant="secondary" icon={<DownloadIcon />}>
                  Tümünü Dışa Aktar
                </Btn>
                <Btn onClick={handleAddStudent} icon={<PlusIcon />}>
                  Yeni Öğrenci Ekle
                </Btn>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 24 }}>
        <Card noPadding>
          <div style={{ padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 8 }}>Toplam Öğrenci</div>
            <div style={{
              fontSize: 36,
              fontWeight: 700,
              color: C.navy,
              fontFamily: "'Playfair Display', serif",
            }}>{students.length}</div>
          </div>
        </Card>
        <Card noPadding>
          <div style={{ padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 8 }}>Gidiş Eşleştirmeleri</div>
            <div style={{
              fontSize: 36,
              fontWeight: 700,
              color: C.green,
              fontFamily: "'Playfair Display', serif",
            }}>{students.reduce((sum, s) => sum + s.outgoingMatches.length, 0)}</div>
          </div>
        </Card>
        <Card noPadding>
          <div style={{ padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 8 }}>Dönüş Eşleştirmeleri</div>
            <div style={{
              fontSize: 36,
              fontWeight: 700,
              color: C.gold,
              fontFamily: "'Playfair Display', serif",
            }}>{students.reduce((sum, s) => sum + s.returnMatches.length, 0)}</div>
          </div>
        </Card>
        <Card noPadding>
          <div style={{ padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 8 }}>Ortalama Eşleştirme</div>
            <div style={{
              fontSize: 36,
              fontWeight: 700,
              color: C.accent,
              fontFamily: "'Playfair Display', serif",
            }}>
              {students.length > 0
                ? ((students.reduce((sum, s) => sum + s.outgoingMatches.length + s.returnMatches.length, 0)) / students.length).toFixed(1)
                : 0}
            </div>
          </div>
        </Card>
      </div>

      {/* Grade Conversion Calculator */}
      <Card title="🔄 Not Dönüşüm Hesaplayıcı">
        <GradeConverter />
      </Card>

      {/* Institution Color Legend */}
      <Card title="Kurum Renk Göstergesi">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {Object.entries(institutionColors).map(([institution, colorClass]) => {
            const studentCount = students.filter(s => s.hostInstitution === institution).length;
            if (studentCount === 0) return null;
            
            const bgColor = colorClass.includes("blue") ? "#eff6ff" :
                           colorClass.includes("purple") ? "#faf5ff" :
                           colorClass.includes("green") ? "#f0fdf4" :
                           colorClass.includes("amber") ? "#fffbeb" :
                           colorClass.includes("rose") ? "#fff1f2" : "#f9fafb";
            
            return (
              <div key={institution} style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                background: bgColor,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
              }}>
                <div style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: bgColor,
                  border: `2px solid ${colorClass.includes("blue") ? "#3b82f6" :
                         colorClass.includes("purple") ? "#a855f7" :
                         colorClass.includes("green") ? "#22c55e" :
                         colorClass.includes("amber") ? "#f59e0b" :
                         colorClass.includes("rose") ? "#f43f5e" : "#6b7280"}`,
                }} />
                <span style={{ fontSize: 13, color: C.text }}>
                  {institution.split(" ")[0]} ({studentCount})
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Students Table */}
      <Card title="Öğrenciler" noPadding>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                <th style={{
                  padding: "16px 24px",
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.navy,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}>Öğrenci No</th>
                <th style={{
                  padding: "16px 24px",
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.navy,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}>Ad Soyad</th>
                <th style={{
                  padding: "16px 24px",
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.navy,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}>Karşı Kurum</th>
                <th style={{
                  padding: "16px 24px",
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.navy,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}>Gidiş</th>
                <th style={{
                  padding: "16px 24px",
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.navy,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}>Dönüş</th>
                <th style={{
                  padding: "16px 24px",
                  textAlign: "right",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.navy,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const institutionColor = institutionColors[student.hostInstitution] || "bg-gray-50 border-gray-200";
                return (
                <tr
                  key={student.id}
                  style={{
                    borderBottom: `1px solid ${C.border}`,
                    borderLeft: `4px solid transparent`,
                    transition: "all 0.15s",
                  }}
                  className={institutionColor}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = C.bg;
                    e.currentTarget.style.borderLeftColor = C.navy;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "";
                    e.currentTarget.style.borderLeftColor = "transparent";
                  }}
                >
                  <td style={{ padding: "16px 24px" }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.navy,
                    }}>{student.studentNumber}</span>
                  </td>
                  <td style={{ padding: "16px 24px", fontWeight: 500 }}>
                    {student.firstName} {student.lastName}
                    {student.semester && (
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                        {student.semester}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{student.hostInstitution}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{student.hostCountry}</div>
                  </td>
                  <td style={{ padding: "16px 24px", textAlign: "center" }}>
                    <Badge color={C.green} bg={C.greenLight}>
                      {student.outgoingMatches.length} eşleştirme
                    </Badge>
                  </td>
                  <td style={{ padding: "16px 24px", textAlign: "center" }}>
                    <Badge color={C.gold} bg={C.goldPale}>
                      {student.returnMatches.length} eşleştirme
                    </Badge>
                  </td>
                  <td style={{ padding: "16px 24px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <Btn 
                        onClick={() => canView(student) && setSelectedStudent(student)} 
                        variant="secondary" 
                        small 
                        icon={<FileTextIcon />}
                        disabled={!canView(student)}
                      >
                        {canEdit(student) ? 'Detay & Düzenle' : 'Detay'}
                      </Btn>
                      <button
                        onClick={() => generateOutgoingWordDoc(student)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "none",
                          background: "#E6F4EA",
                          color: "#1E7E34",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                        title="Gidiş değerlendirme belgesi indir"
                      >
                        📄 Gidiş
                      </button>
                      {student.returnMatches.length > 0 && (
                        <button
                          onClick={() => generateReturnWordDoc(student)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "none",
                            background: "#FFF3E0",
                            color: "#E65100",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                          title="Dönüş muafiyet belgesi indir"
                        >
                          📄 Dönüş
                        </button>
                      )}
                      {canEdit(student) && (
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "none",
                            background: "#FAEBED",
                          color: C.accent,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <TrashIcon />
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onSave={handleSaveStudent}
          readOnly={!canEdit(selectedStudent)}
        />
      )}
    </div>
  );
}

// Make it available globally for browser
if (typeof window !== 'undefined') {
  window.ErasmusLearningAgreementApp = ErasmusLearningAgreementApp;
}
