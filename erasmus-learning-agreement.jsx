// ══════════════════════════════════════════════════════════════
// Erasmus Learning Agreement Modülü
// Shared bileşenler shared-components.jsx'den window üzerinden gelir
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef } = React;

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

// ── Sample Data ──
const SAMPLE_STUDENTS = [
  {
    id: 4, studentNumber: "AND43", firstName: "Ayten Nisa", lastName: "DİK",
    email: "nisadik43@icloud.com",
    hostInstitution: "Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich",
    hostCountry: "Poland", semester: "Fall 2025",
    outgoingMatches: [
      { id: "out18", homeCourses: [{ code: "BİL307", name: "Mikroişlemciler", credits: 7 }], hostCourses: [{ code: "05-EMS-APN-SP1", name: "Architecture and Programming of Microcontrollers", credits: 8 }] },
      { id: "out19", homeCourses: [{ code: "BİL401", name: "Bilgisayar Ağları", credits: 7 }], hostCourses: [{ code: "05-EMS-CN-SP1", name: "Computer Networks", credits: 4 }] },
      { id: "out20", homeCourses: [{ code: "-", name: "Elective 1", credits: 4 }], hostCourses: [{ code: "15-EMS-HW-SP1", name: "History of Design", credits: 3 }, { code: "05-EMS-RES-SP1", name: "Renewable Energy Sources", credits: 2 }] },
      { id: "out21", homeCourses: [{ code: "-", name: "Elective 2", credits: 6 }], hostCourses: [{ code: "15-EMS-BD-SP1", name: "Basics of Design", credits: 4 }, { code: "05-EMS-WSD-SP1", name: "Web Services Design", credits: 2 }] },
      { id: "out22", homeCourses: [{ code: "-", name: "Elective 3", credits: 4 }], hostCourses: [{ code: "08-EMS-FINAC-SP1", name: "Financial Accounting", credits: 6 }] },
      { id: "out23", homeCourses: [{ code: "-", name: "Elective 4", credits: 4 }], hostCourses: [{ code: "05-EMS-BOS-SP1", name: "Basics of Operating Systems", credits: 3 }] },
    ],
    returnMatches: [],
  },
  {
    id: 5, studentNumber: "EIF222", firstName: "Ece İrem", lastName: "FİLİZ",
    email: "eceirem222@gmail.com", hostInstitution: "Panevezio Kolegija",
    hostCountry: "Lithuania", semester: "Fall 2025",
    outgoingMatches: [
      { id: "out24", homeCourses: [{ code: "-", name: "Elective I", credits: 3 }, { code: "-", name: "Elective II", credits: 3 }], hostCourses: [{ code: "-", name: "Professional Foreign Language", credits: 6 }] },
      { id: "out25", homeCourses: [{ code: "BİL482", name: "Yönetim Bilişim Sistemleri", credits: 6 }], hostCourses: [{ code: "-", name: "Innovative Information Technology", credits: 6 }] },
      { id: "out26", homeCourses: [{ code: "-", name: "Elective III", credits: 3 }], hostCourses: [{ code: "-", name: "Health Nutrition", credits: 3 }] },
      { id: "out27", homeCourses: [{ code: "-", name: "Elective IV", credits: 6 }], hostCourses: [{ code: "-", name: "Computer Aided Design (CAD)", credits: 6 }] },
      { id: "out28", homeCourses: [{ code: "BİL403", name: "Yazılım Mühendisliği İlkeleri", credits: 6 }], hostCourses: [{ code: "-", name: "Software systems engineering", credits: 3 }, { code: "-", name: "Local and wide area networks", credits: 3 }] },
      { id: "out29", homeCourses: [{ code: "-", name: "Elective V", credits: 3 }], hostCourses: [{ code: "-", name: "Computer network security and control", credits: 3 }] },
    ],
    returnMatches: [],
  },
  {
    id: 10, studentNumber: "FO006", firstName: "Furkan", lastName: "ÖZEL",
    email: "ozelfurkan006@gmail.com",
    hostInstitution: "Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich",
    hostCountry: "Poland", semester: "Fall 2025",
    outgoingMatches: [
      { id: "out51", homeCourses: [{ code: "BİL305", name: "İşletim Sistemleri", credits: 6 }], hostCourses: [{ code: "05-EMS-BOS-SP1", name: "Basics of Operating Systems", credits: 3 }] },
      { id: "out52", homeCourses: [{ code: "BİL307", name: "Mikroişlemciler", credits: 7 }], hostCourses: [{ code: "05-EMS-APN-SP1", name: "Architecture and Programming of Microcontrollers", credits: 8 }] },
      { id: "out53", homeCourses: [{ code: "BİL401", name: "Bilgisayar Ağları", credits: 7 }], hostCourses: [{ code: "05-EMS-CN-SP1", name: "Computer Networks", credits: 4 }, { code: "15-EMS-HW-SP1", name: "History of Design", credits: 3 }] },
      { id: "out54", homeCourses: [{ code: "-", name: "Seçmeli 1", credits: 5 }], hostCourses: [{ code: "15-EMS-BD-SP1", name: "Basics of Design", credits: 4 }] },
      { id: "out55", homeCourses: [{ code: "-", name: "Seçmeli 2", credits: 4 }], hostCourses: [{ code: "08-EMS-MANAG-SP1", name: "Management", credits: 6 }] },
      { id: "out56", homeCourses: [{ code: "-", name: "Seçmeli 3", credits: 4 }], hostCourses: [{ code: "08-EMS-MANAC-SP1", name: "Management Accounting", credits: 5 }] },
    ],
    returnMatches: [],
  },
  {
    id: 9, studentNumber: "HTG2003", firstName: "Halil Talha", lastName: "GÜNDÜZ",
    email: "haliltalhagunduz@gmail.com", hostInstitution: "Panevezio Kolegija",
    hostCountry: "Lithuania", semester: "Fall 2025",
    outgoingMatches: [
      { id: "out45", homeCourses: [{ code: "-", name: "Elective I", credits: 3 }, { code: "-", name: "Elective II", credits: 3 }], hostCourses: [{ code: "-", name: "Professional Foreign Language", credits: 6 }] },
      { id: "out46", homeCourses: [{ code: "BİL482", name: "Yönetim Bilişim Sistemleri", credits: 6 }], hostCourses: [{ code: "-", name: "Innovative Information Technology", credits: 6 }] },
      { id: "out47", homeCourses: [{ code: "-", name: "Elective III", credits: 3 }], hostCourses: [{ code: "-", name: "Health Nutrition", credits: 3 }] },
      { id: "out48", homeCourses: [{ code: "-", name: "Elective IV", credits: 6 }], hostCourses: [{ code: "-", name: "Computer Aided Design (CAD)", credits: 6 }] },
      { id: "out49", homeCourses: [{ code: "BİL403", name: "Yazılım Mühendisliği İlkeleri", credits: 6 }], hostCourses: [{ code: "-", name: "Software systems engineering", credits: 3 }, { code: "-", name: "Local and wide area networks", credits: 3 }] },
      { id: "out50", homeCourses: [{ code: "-", name: "Elective V", credits: 3 }], hostCourses: [{ code: "-", name: "Computer network security and control", credits: 3 }] },
    ],
    returnMatches: [],
  },
  {
    id: 8, studentNumber: "ND1635", firstName: "Neslihan", lastName: "DEMİRCİ",
    email: "neslihan.nevin1635@gmail.com",
    hostInstitution: "Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich",
    hostCountry: "Poland", semester: "Fall 2025",
    outgoingMatches: [
      { id: "out40", homeCourses: [{ code: "BİL305", name: "İşletim Sistemleri", credits: 6 }], hostCourses: [{ code: "05-EMS-BOS-SP1", name: "Basics of Operating Systems", credits: 3 }] },
      { id: "out41", homeCourses: [{ code: "BİL307", name: "Mikroişlemciler", credits: 7 }], hostCourses: [{ code: "05-EMS-APN-SP1", name: "Architecture and Programming of Microcontrollers", credits: 8 }] },
      { id: "out42", homeCourses: [{ code: "BİL205", name: "Sayısal Sistem Tasarımı", credits: 7 }], hostCourses: [{ code: "05-EMS-DC-SP1", name: "Digital Circuits", credits: 4 }, { code: "05-EMS-RES-SP1", name: "Renewable Energy Sources", credits: 2 }] },
      { id: "out43", homeCourses: [{ code: "-", name: "Elective 1", credits: 4 }, { code: "-", name: "Elective 2", credits: 4 }], hostCourses: [{ code: "15-EMS-HW-SP1", name: "History of Design", credits: 3 }, { code: "15-EMS-BD-SP1", name: "Basics of Design", credits: 4 }, { code: "15-EMS-DS-SP1", name: "Specialized Design", credits: 4 }] },
      { id: "out44", homeCourses: [{ code: "-", name: "Elective 3", credits: 4 }], hostCourses: [{ code: "15-EMS-PD-SP1", name: "Packaging Design", credits: 4 }] },
    ],
    returnMatches: [],
  },
  {
    id: 7, studentNumber: "RBK2004", firstName: "Rabia Beyza", lastName: "KURUP",
    email: "kuruprabia@gmail.com", hostInstitution: "Babeș-Bolyai University",
    hostCountry: "Romania", semester: "Fall 2025",
    outgoingMatches: [
      { id: "out35", homeCourses: [{ code: "BİL301", name: "Programlama Dilleri", credits: 6 }], hostCourses: [{ code: "MLE5023", name: "Formal languages and compiler design", credits: 5 }] },
      { id: "out36", homeCourses: [{ code: "BİL303", name: "Veritabanı Sistemleri", credits: 7 }], hostCourses: [{ code: "MLE5077", name: "Parallel and distributed programming", credits: 5 }, { code: "MLE5260", name: "Database fundamentals", credits: 5 }] },
      { id: "out37", homeCourses: [{ code: "BİL401", name: "Bilgisayar Ağları", credits: 7 }], hostCourses: [{ code: "MLE5002", name: "Computer networks", credits: 6 }] },
      { id: "out38", homeCourses: [{ code: "-", name: "Elective 1", credits: 4 }, { code: "-", name: "Elective 2", credits: 3 }], hostCourses: [{ code: "MLE5258", name: "Advanced programming techniques", credits: 5 }, { code: "MLE5078", name: "Mobile application programming", credits: 4 }] },
      { id: "out39", homeCourses: [{ code: "-", name: "Elective 3", credits: 3 }], hostCourses: [{ code: "MLE5078", name: "Mobile application programming", credits: 4 }] },
    ],
    returnMatches: [],
  },
  {
    id: 6, studentNumber: "SNC128", firstName: "Sude Naz", lastName: "ÇAKMAK",
    email: "sudecakmak128@yandex.com",
    hostInstitution: "Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich",
    hostCountry: "Poland", semester: "Fall 2025",
    outgoingMatches: [
      { id: "out30", homeCourses: [{ code: "BİL307", name: "Mikroişlemciler", credits: 7 }], hostCourses: [{ code: "05-EMS-APN-SP1", name: "Architecture and Programming of Microcontrollers", credits: 8 }] },
      { id: "out31", homeCourses: [{ code: "BİL401", name: "Bilgisayar Ağları", credits: 7 }], hostCourses: [{ code: "05-EMS-CN-SP1", name: "Computer Networks", credits: 4 }] },
      { id: "out32", homeCourses: [{ code: "BİL305", name: "İşletim Sistemleri", credits: 6 }], hostCourses: [{ code: "05-EMS-BOS-SP1", name: "Basics of Operating Systems", credits: 3 }, { code: "05-EMS-WSD-SP1", name: "Web Services Design", credits: 2 }] },
      { id: "out33", homeCourses: [{ code: "BİL203", name: "Nesnesel Tasarım ve Programlama", credits: 7 }], hostCourses: [{ code: "15-EMS-VC-SP1", name: "Visual Communication", credits: 3 }, { code: "05-EMS-FP-SP1", name: "Fundamentals of Programming", credits: 5 }] },
      { id: "out34", homeCourses: [{ code: "BİL205", name: "Sayısal Sistem Tasarımı", credits: 7 }], hostCourses: [{ code: "05-EMS-DC-SP1", name: "Digital Circuits", credits: 4 }, { code: "05-EMS-RES-SP1", name: "Renewable Energy Sources", credits: 2 }, { code: "15-EMS-HW-SP1", name: "History of Design", credits: 3 }] },
    ],
    returnMatches: [],
  },
  {
    id: 1, studentNumber: "YEB2147", firstName: "Yunus Emre", lastName: "BOZAN",
    email: "ybe2147@gmail.com",
    hostInstitution: "Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich",
    hostCountry: "Poland", semester: "Fall 2025",
    outgoingMatches: [
      { id: "out1", homeCourses: [{ code: "BIL401", name: "Computer Networks", credits: 7 }], hostCourses: [{ code: "05-EMS-CN-SP1", name: "Computer Networks", credits: 4 }] },
      { id: "out2", homeCourses: [{ code: "-", name: "Elective 1", credits: 4 }], hostCourses: [{ code: "05-EMS-RES-SP1", name: "Renewable Energy Sources", credits: 2 }] },
      { id: "out3", homeCourses: [{ code: "-", name: "Elective 2", credits: 5 }], hostCourses: [{ code: "05-EMS-FP-SP1", name: "Fundamentals of Programming", credits: 5 }] },
      { id: "out4", homeCourses: [{ code: "-", name: "Elective 3", credits: 4 }], hostCourses: [{ code: "00-EMS-STAT-SP1", name: "Statistics", credits: 6 }] },
      { id: "out5", homeCourses: [{ code: "-", name: "Elective 4", credits: 4 }], hostCourses: [{ code: "05-EMS-SG-SP1", name: "Smart Grid", credits: 8 }] },
      { id: "out6", homeCourses: [{ code: "-", name: "Elective 5", credits: 6 }], hostCourses: [{ code: "05-EMS-SLP-SP1", name: "Script Languages Programming", credits: 5 }] },
    ],
    returnMatches: [],
  },
  {
    id: 3, studentNumber: "YEO101", firstName: "Yunus Emre", lastName: "ÖNEL",
    email: "ynsemronl@outlook.com", hostInstitution: "Collegium Witelona Uczelnia Panstwowa",
    hostCountry: "Poland", semester: "Fall 2025",
    outgoingMatches: [
      { id: "out12", homeCourses: [{ code: "BIL401", name: "Computer Networks", credits: 7 }], hostCourses: [{ code: "MI.4", name: "Computer Networks I", credits: 5 }] },
      { id: "out13", homeCourses: [{ code: "-", name: "Elective 1", credits: 6 }], hostCourses: [{ code: "MI.2", name: "Programming Basic I", credits: 6 }] },
      { id: "out14", homeCourses: [{ code: "-", name: "Elective 2", credits: 3 }], hostCourses: [{ code: "ME.1", name: "Basics of Economics and Finance", credits: 4 }] },
      { id: "out15", homeCourses: [{ code: "-", name: "Elective 3", credits: 4 }], hostCourses: [{ code: "BI.1", name: "Mathematics I", credits: 6 }] },
      { id: "out16", homeCourses: [{ code: "-", name: "Elective 4", credits: 5 }], hostCourses: [{ code: "ML.2", name: "Production Logistics", credits: 5 }] },
      { id: "out17", homeCourses: [{ code: "-", name: "Elective 5", credits: 5 }], hostCourses: [{ code: "MP.2", name: "Production and Service Management", credits: 5 }] },
    ],
    returnMatches: [],
  },
  {
    id: 2, studentNumber: "ZA3400", firstName: "Zeynep", lastName: "AKBULUT",
    email: "zeynepakbulut3400@gmail.com", hostInstitution: "Politechnika Krakowska",
    hostCountry: "Poland", semester: "Fall 2025",
    outgoingMatches: [
      { id: "out7", homeCourses: [{ code: "BİL401", name: "Bilgisayar Ağları", credits: 7 }], hostCourses: [{ code: "E-CN", name: "Computer Networks", credits: 6 }] },
      { id: "out8", homeCourses: [{ code: "BİL403", name: "Yazılım Mühendisliği İlkeleri", credits: 6 }], hostCourses: [{ code: "F-1.SE", name: "Software Engineering", credits: 6 }] },
      { id: "out9", homeCourses: [{ code: "-", name: "Elective 1", credits: 5 }], hostCourses: [{ code: "E-IPE", name: "Introduction to Prompt Engineering", credits: 6 }] },
      { id: "out10", homeCourses: [{ code: "-", name: "Elective 2", credits: 6 }], hostCourses: [{ code: "F-1.PS_1", name: "Problem Solving", credits: 6 }] },
      { id: "out11", homeCourses: [{ code: "-", name: "Elective 3", credits: 3 }, { code: "-", name: "Elective 4", credits: 3 }], hostCourses: [{ code: "F-1.EAI", name: "Elements of AI", credits: 6 }] },
    ],
    returnMatches: [],
  },
];

// ── Course Matching Card ──
const CourseMatchCard = ({ match, onDelete, onEdit, showGrade, type, readOnly = false }) => {
  const homeTotal = match.homeCourses.reduce((sum, c) => sum + c.credits, 0);
  const hostTotal = match.hostCourses.reduce((sum, c) => sum + c.credits, 0);
  return (
    <div style={{ background: C.bg, borderRadius: 10, padding: 20, marginBottom: 16, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, background: "#EEF0F5", padding: "6px 10px", borderRadius: 6, display: "inline-block" }}>Kendi Kurumumuz</div>
          {match.homeCourses.map((course, i) => (
            <div key={i} style={{ background: C.card, padding: "10px 12px", borderRadius: 8, marginBottom: 6, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{course.code}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{course.name}</span>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{course.credits} AKTS</div>
            </div>
          ))}
          <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginTop: 8 }}>Toplam: {homeTotal} AKTS</div>
        </div>
        <div style={{ color: C.gold, flexShrink: 0 }}><ArrowRightIcon /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, background: C.greenLight, padding: "6px 10px", borderRadius: 6, display: "inline-block" }}>Karşı Kurum</div>
          {match.hostCourses.map((course, i) => (
            <div key={i} style={{ background: C.card, padding: "10px 12px", borderRadius: 8, marginBottom: 6, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{course.code}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{course.name}</span>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{course.credits} AKTS</div>
            </div>
          ))}
          <div style={{ fontSize: 13, fontWeight: 600, color: C.green, marginTop: 8 }}>Toplam: {hostTotal} AKTS</div>
        </div>
        {showGrade && (
          <div style={{ background: C.card, padding: "12px 16px", borderRadius: 8, border: `2px solid ${C.navy}`, textAlign: "center", minWidth: 120 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Notlar</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, fontFamily: "'Playfair Display', serif" }}>
              {match.hostGrade || "A"} → {match.homeGrade || "Muaf"}
            </div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>Karşı → Kendi</div>
          </div>
        )}
        {!readOnly && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button onClick={() => onEdit(match)} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.navy, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><EditIcon /></button>
            <button onClick={() => onDelete(match.id)} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.accent, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><TrashIcon /></button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Course Match Edit Modal ──
const CourseMatchEditModal = ({ match, type, onClose, onSave }) => {
  const [editedMatch, setEditedMatch] = useState(JSON.parse(JSON.stringify(match)));
  const [showHomeCatalog, setShowHomeCatalog] = useState(false);

  const addCourse = (side) => {
    setEditedMatch(prev => ({ ...prev, [`${side}Courses`]: [...prev[`${side}Courses`], { code: "", name: "", credits: 0 }] }));
  };
  const addCoursesFromCatalog = (side, courses) => {
    setEditedMatch(prev => ({ ...prev, [`${side}Courses`]: [...prev[`${side}Courses`], ...courses] }));
  };
  const updateCourse = (side, index, field, value) => {
    setEditedMatch(prev => ({ ...prev, [`${side}Courses`]: prev[`${side}Courses`].map((c, i) => i === index ? { ...c, [field]: field === "credits" ? parseFloat(value) || 0 : value } : c) }));
  };
  const removeCourse = (side, index) => {
    setEditedMatch(prev => ({ ...prev, [`${side}Courses`]: prev[`${side}Courses`].filter((_, i) => i !== index) }));
  };

  return (
    <Modal open={true} onClose={onClose} title="Ders Eşleştirmesini Düzenle" width={900}>
      {type === "return" && (
        <div style={{ padding: 16, background: "#E3F2FD", border: "2px solid #2196F3", borderRadius: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1565C0", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>Duzenleme Ipucu</div>
          <div style={{ fontSize: 13, color: "#424242" }}>Bu eslestirme gidis verileriyle dolduruldu. Ogrenci farkli bir ders aldiysa asagidaki alanlardan duzenleyebilirsiniz.</div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 24 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, background: "#EEF0F5", padding: "8px 12px", borderRadius: 8 }}>Kendi Kurumumuz</div>
          {editedMatch.homeCourses.map((course, i) => (
            <div key={i} style={{ padding: 16, background: C.bg, borderRadius: 8, marginBottom: 12, border: `1px solid ${C.border}` }}>
              <FormField label="Ders Kodu"><Input value={course.code} onChange={e => updateCourse("home", i, "code", e.target.value)} placeholder="BIL201" /></FormField>
              <FormField label="Ders Adi"><Input value={course.name} onChange={e => updateCourse("home", i, "name", e.target.value)} placeholder="Veri Yapilari" /></FormField>
              <FormField label="AKTS"><Input type="number" value={course.credits} onChange={e => updateCourse("home", i, "credits", e.target.value)} /></FormField>
              <Btn onClick={() => removeCourse("home", i)} variant="danger" small><TrashIcon /> Sil</Btn>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => setShowHomeCatalog(true)} variant="secondary" small icon={<PlusIcon />}>Katalogdan Sec</Btn>
            <Btn onClick={() => addCourse("home")} variant="secondary" small icon={<PlusIcon />}>Manuel Ekle</Btn>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: C.gold, paddingTop: 40 }}><ArrowRightIcon /></div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.green, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, background: C.greenLight, padding: "8px 12px", borderRadius: 8 }}>Karşı Kurum</div>
          {editedMatch.hostCourses.map((course, i) => (
            <div key={i} style={{ padding: 16, background: C.bg, borderRadius: 8, marginBottom: 12, border: `1px solid ${C.border}` }}>
              <FormField label="Ders Kodu"><Input value={course.code} onChange={e => updateCourse("host", i, "code", e.target.value)} placeholder="CS201" /></FormField>
              <FormField label="Ders Adi"><Input value={course.name} onChange={e => updateCourse("host", i, "name", e.target.value)} placeholder="Data Structures" /></FormField>
              <FormField label="AKTS"><Input type="number" value={course.credits} onChange={e => updateCourse("host", i, "credits", e.target.value)} /></FormField>
              <Btn onClick={() => removeCourse("host", i)} variant="danger" small><TrashIcon /> Sil</Btn>
            </div>
          ))}
          <Btn onClick={() => addCourse("host")} variant="secondary" small icon={<PlusIcon />}>Manuel Ders Ekle</Btn>
        </div>
      </div>
      {type === "return" && (
        <div style={{ marginTop: 24, padding: 20, background: C.goldPale, borderRadius: 10, border: `1px solid ${C.goldLight}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>Not Bilgileri</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Karşı Kurumdan Alinan Not">
              <Input value={editedMatch.hostGrade || ""} onChange={e => setEditedMatch(prev => ({ ...prev, hostGrade: e.target.value }))} placeholder="A, B+, 85, vb." />
              {editedMatch.hostGrade && (
                <div style={{ marginTop: 8, padding: 8, background: '#fffacd', borderRadius: 6, fontSize: 12, fontWeight: 600, color: C.navy, border: '2px solid #ffd700' }}>
                  Donusum: <strong>{convertGrade(editedMatch.hostGrade)}</strong>
                </div>
              )}
            </FormField>
            <FormField label="Kendi Kurumumuzdaki Karsilik">
              <Input value={editedMatch.homeGrade || "Muaf"} onChange={e => setEditedMatch(prev => ({ ...prev, homeGrade: e.target.value }))} placeholder="Muaf, AA, BB, vb." />
            </FormField>
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
        <Btn onClick={onClose} variant="secondary">Iptal</Btn>
        <Btn onClick={() => onSave(editedMatch)}>Kaydet</Btn>
      </div>
      {showHomeCatalog && (
        <HomeInstitutionCatalogModal onClose={() => setShowHomeCatalog(false)} onSelect={(courses) => { addCoursesFromCatalog("home", courses); setShowHomeCatalog(false); }} />
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
    setSelectedCourses(prev => prev.find(c => c.code === course.code) ? prev.filter(c => c.code !== course.code) : [...prev, { ...course }]);
  };
  const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 20 }}>
      <div style={{ background: C.card, borderRadius: 16, maxWidth: 900, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: 24, borderBottom: `2px solid ${C.border}` }}>
          <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.navy, fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>Ders Katalogu</h3>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>{university}</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          <div style={{ display: "grid", gap: 12 }}>
            {catalog.courses.map((course, idx) => {
              const isSelected = selectedCourses.find(c => c.code === course.code);
              return (
                <div key={idx} onClick={() => toggleCourse(course)} style={{ padding: 16, border: `2px solid ${isSelected ? C.green : C.border}`, borderRadius: 12, cursor: "pointer", background: isSelected ? C.greenLight : "white", transition: "all 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "start", gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${isSelected ? C.green : C.border}`, background: isSelected ? C.green : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      {isSelected && <div style={{ color: "white", fontSize: 14, fontWeight: 700 }}>✓</div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.navy, marginBottom: 4 }}>{course.name}</div>
                      <div style={{ fontSize: 13, color: C.textMuted, display: "flex", gap: 16 }}>
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
        <div style={{ padding: 24, borderTop: `2px solid ${C.border}`, background: C.bg }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: C.textMuted }}>Secili: <strong>{selectedCourses.length}</strong> ders</div>
            <div style={{ fontSize: 14, color: C.navy, fontWeight: 600 }}>Toplam: <strong>{totalCredits}</strong> AKTS</div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={onClose} variant="secondary">Iptal</Btn>
            <Btn onClick={() => selectedCourses.length > 0 && onSelect(selectedCourses)} disabled={selectedCourses.length === 0}>{selectedCourses.length} Ders Ekle</Btn>
          </div>
        </div>
      </div>
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
    setSelectedCourses(prev => prev.find(c => c.code === course.code) ? prev.filter(c => c.code !== course.code) : [...prev, { code: course.code, name: course.name, credits: course.credits }]);
  };
  const filteredCourses = HOME_INSTITUTION_CATALOG.courses.filter(c => {
    if (filterYear !== "all" && c.year !== parseInt(filterYear) && c.year !== 0) return false;
    if (filterSemester !== "all" && c.semester !== filterSemester && c.semester !== "Any") return false;
    if (filterType !== "all" && c.type !== filterType) return false;
    return true;
  });
  const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);

  const filterStyle = { padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", backgroundColor: "white", cursor: "pointer" };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10001, padding: 20 }}>
      <div style={{ background: C.card, borderRadius: 16, maxWidth: 900, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: 24, borderBottom: `2px solid ${C.border}` }}>
          <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.navy, fontFamily: "'Playfair Display', serif", marginBottom: 4 }}>{HOME_INSTITUTION_CATALOG.name}</h3>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>{HOME_INSTITUTION_CATALOG.department} - Ders Katalogu</p>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={filterStyle}>
              <option value="all">Tum Siniflar</option><option value="1">1. Sinif</option><option value="2">2. Sinif</option><option value="3">3. Sinif</option><option value="4">4. Sinif</option><option value="0">Secmeli</option>
            </select>
            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} style={filterStyle}>
              <option value="all">Tum Donemler</option><option value="Fall">Guz</option><option value="Spring">Bahar</option>
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={filterStyle}>
              <option value="all">Tumu</option><option value="Zorunlu">Zorunlu</option><option value="Seçmeli">Secmeli</option>
            </select>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          <div style={{ display: "grid", gap: 12 }}>
            {filteredCourses.map((course, idx) => {
              const isSelected = selectedCourses.find(c => c.code === course.code);
              return (
                <div key={idx} onClick={() => toggleCourse(course)} style={{ padding: 16, border: `2px solid ${isSelected ? C.navy : C.border}`, borderRadius: 12, cursor: "pointer", background: isSelected ? "#EEF0F5" : "white", transition: "all 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "start", gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${isSelected ? C.navy : C.border}`, background: isSelected ? C.navy : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      {isSelected && <div style={{ color: "white", fontSize: 14, fontWeight: 700 }}>✓</div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: C.navy }}>{course.name}</div>
                        <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: course.type === "Zorunlu" ? "#DBEAFE" : "#FEF3C7", color: course.type === "Zorunlu" ? "#1E40AF" : "#92400E" }}>{course.type}</span>
                      </div>
                      <div style={{ fontSize: 13, color: C.textMuted, display: "flex", gap: 16, flexWrap: "wrap" }}>
                        <span>Kod: <strong>{course.code}</strong></span>
                        <span>AKTS: <strong>{course.credits}</strong></span>
                        {course.year > 0 && <span>Sinif: <strong>{course.year}</strong></span>}
                        {course.semester !== "Any" && <span>Donem: <strong>{course.semester === "Fall" ? "Guz" : "Bahar"}</strong></span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ padding: 24, borderTop: `2px solid ${C.border}`, background: C.bg }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: C.textMuted }}>Secili: <strong>{selectedCourses.length}</strong> ders</div>
            <div style={{ fontSize: 14, color: C.navy, fontWeight: 600 }}>Toplam: <strong>{totalCredits}</strong> AKTS</div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={onClose} variant="secondary">Iptal</Btn>
            <Btn onClick={() => selectedCourses.length > 0 && onSelect(selectedCourses)} disabled={selectedCourses.length === 0}>{selectedCourses.length} Ders Ekle</Btn>
          </div>
        </div>
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

  const generateSemesters = () => {
    const semesters = [];
    for (let year = 2024; year <= 2030; year++) { semesters.push(`Spring ${year}`); semesters.push(`Fall ${year}`); }
    return semesters;
  };
  const semesters = generateSemesters();

  const updateStudent = (field, value) => setEditedStudent(prev => ({ ...prev, [field]: value }));

  const addMatch = (type) => {
    const newMatch = { id: `${type}${Date.now()}`, homeCourses: [], hostCourses: [], ...(type === "return" ? { hostGrade: "", homeGrade: "Muaf" } : {}) };
    setEditedStudent(prev => ({ ...prev, [`${type}Matches`]: [...prev[`${type}Matches`], newMatch] }));
    setEditingMatch({ type, match: newMatch });
  };

  const copyFromOutgoing = (outgoingMatch) => {
    const newReturnMatch = { id: `return${Date.now()}`, homeCourses: JSON.parse(JSON.stringify(outgoingMatch.homeCourses)), hostCourses: JSON.parse(JSON.stringify(outgoingMatch.hostCourses)), hostGrade: "A", homeGrade: "Muaf" };
    setEditedStudent(prev => ({ ...prev, returnMatches: [...prev.returnMatches, newReturnMatch] }));
  };

  const deleteMatch = (type, id) => setEditedStudent(prev => ({ ...prev, [`${type}Matches`]: prev[`${type}Matches`].filter(m => m.id !== id) }));

  const exportStudentData = () => {
    const data = {
      "Ogrenci Bilgileri": { "Ogrenci Numarasi": editedStudent.studentNumber, "Ad": editedStudent.firstName, "Soyad": editedStudent.lastName, "Karsi Kurum": editedStudent.hostInstitution, "Ulke": editedStudent.hostCountry },
      "Gidis Eslestirmeleri": editedStudent.outgoingMatches.map(m => ({
        "Kendi Derslerimiz": m.homeCourses.map(c => `${c.code} - ${c.name} (${c.credits} AKTS)`).join(" | "),
        "Karsi Kurum Dersleri": m.hostCourses.map(c => `${c.code} - ${c.name} (${c.credits} AKTS)`).join(" | "),
      })),
      "Donus Eslestirmeleri": editedStudent.returnMatches.map(m => ({
        "Kendi Derslerimiz": m.homeCourses.map(c => `${c.code} - ${c.name} (${c.credits} AKTS)`).join(" | "),
        "Karsi Kurum Dersleri": m.hostCourses.map(c => `${c.code} - ${c.name} (${c.credits} AKTS)`).join(" | "),
        "Not": m.grade, "Puan": m.gradePoints,
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
      {readOnly && (
        <div style={{ padding: 16, background: "#FFF3CD", border: "2px solid #FFC107", borderRadius: 12, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 24 }}>🔒</div>
          <div>
            <div style={{ fontWeight: 600, color: "#856404", marginBottom: 4 }}>Sadece Goruntuleme Modu</div>
            <div style={{ fontSize: 13, color: "#856404" }}>Bu ogrencinin bilgilerini sadece goruntuleyebilirsiniz.</div>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24, padding: 20, background: C.goldPale, borderRadius: 10, border: `1px solid ${C.goldLight}` }}>
        <FormField label="Ogrenci Numarasi"><Input value={editedStudent.studentNumber} onChange={e => updateStudent("studentNumber", e.target.value)} disabled={readOnly} /></FormField>
        <FormField label="Ad"><Input value={editedStudent.firstName} onChange={e => updateStudent("firstName", e.target.value)} disabled={readOnly} /></FormField>
        <FormField label="Soyad"><Input value={editedStudent.lastName} onChange={e => updateStudent("lastName", e.target.value)} disabled={readOnly} /></FormField>
        <FormField label="Karsi Kurum">
          <select value={editedStudent.hostInstitution} onChange={e => { updateStudent("hostInstitution", e.target.value); if (UNIVERSITY_CATALOGS[e.target.value]) updateStudent("hostCountry", UNIVERSITY_CATALOGS[e.target.value].country); }} disabled={readOnly}
            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", backgroundColor: readOnly ? "#f5f5f5" : "white", cursor: readOnly ? "not-allowed" : "pointer" }}>
            <option value="">Universite Secin</option>
            {Object.keys(UNIVERSITY_CATALOGS).map(uni => <option key={uni} value={uni}>{uni}</option>)}
          </select>
        </FormField>
        <FormField label="Ulke"><Input value={editedStudent.hostCountry} onChange={e => updateStudent("hostCountry", e.target.value)} disabled /></FormField>
        <FormField label="Donem">
          <select value={editedStudent.semester || "Fall 2025"} onChange={e => updateStudent("semester", e.target.value)} disabled={readOnly}
            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", backgroundColor: "white", cursor: "pointer" }}>
            {semesters.map(sem => <option key={sem} value={sem}>{sem.startsWith("Spring") ? sem.replace("Spring", "Bahar") : sem.replace("Fall", "Guz")}</option>)}
          </select>
        </FormField>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: `2px solid ${C.border}` }}>
        {["outgoing", "return"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "12px 24px", border: "none", background: "transparent",
            color: activeTab === tab ? C.navy : C.textMuted, fontWeight: 600, fontSize: 14,
            cursor: "pointer", borderBottom: activeTab === tab ? `3px solid ${C.navy}` : "3px solid transparent",
            fontFamily: "'Source Sans 3', sans-serif",
          }}>
            {tab === "outgoing" ? `Gidis Eslestirmeleri (${editedStudent.outgoingMatches.length})` : `Donus Eslestirmeleri (${editedStudent.returnMatches.length})`}
          </button>
        ))}
      </div>

      {/* Matches */}
      <div style={{ minHeight: 300, maxHeight: 400, overflowY: "auto", marginBottom: 20 }}>
        {activeTab === "outgoing" && (
          <>
            {editedStudent.hostInstitution && UNIVERSITY_CATALOGS[editedStudent.hostInstitution] && (
              <div style={{ padding: 16, background: "#E3F2FD", border: "2px solid #2196F3", borderRadius: 12, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1565C0", marginBottom: 12 }}>{editedStudent.hostInstitution} Ders Katalogu</div>
                {!readOnly && <Btn onClick={() => setShowCatalogModal(true)} variant="secondary" icon={<PlusIcon />}>Katalogdan Ders Sec ve Ekle</Btn>}
              </div>
            )}
            {editedStudent.outgoingMatches.map(match => (
              <CourseMatchCard key={match.id} match={match} onDelete={id => deleteMatch("outgoing", id)} onEdit={m => setEditingMatch({ type: "outgoing", match: m })} showGrade={false} type="outgoing" readOnly={readOnly} />
            ))}
            {!readOnly && <Btn onClick={() => addMatch("outgoing")} variant="secondary" icon={<PlusIcon />}>Manuel Eslestirme Ekle</Btn>}
          </>
        )}
        {activeTab === "return" && (
          <>
            {!readOnly && editedStudent.outgoingMatches.length > 0 && (
              <div style={{ padding: 20, background: "#FFF9E6", border: "2px dashed #FDB022", borderRadius: 12, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.navy, marginBottom: 12 }}>Gidis Eslestirmelerinden Hizli Doldur</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {editedStudent.outgoingMatches.map((outMatch, idx) => {
                    const alreadyExists = editedStudent.returnMatches.some(retMatch => JSON.stringify(retMatch.homeCourses) === JSON.stringify(outMatch.homeCourses) && JSON.stringify(retMatch.hostCourses) === JSON.stringify(outMatch.hostCourses));
                    return (
                      <button key={idx} onClick={() => copyFromOutgoing(outMatch)} disabled={alreadyExists} style={{ padding: "10px 16px", background: alreadyExists ? "#f5f5f5" : "white", border: `2px solid ${alreadyExists ? "#e0e0e0" : C.gold}`, borderRadius: 8, cursor: alreadyExists ? "not-allowed" : "pointer", fontSize: 13, color: alreadyExists ? C.textMuted : C.navy, opacity: alreadyExists ? 0.5 : 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{alreadyExists ? "✓ " : "+ "}Eslestirme {idx + 1}</div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>{outMatch.homeCourses.map(c => c.code || c.name).join(", ").substring(0, 30)}...</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {editedStudent.returnMatches.map(match => (
              <CourseMatchCard key={match.id} match={match} onDelete={id => deleteMatch("return", id)} onEdit={m => setEditingMatch({ type: "return", match: m })} showGrade={true} type="return" readOnly={readOnly} />
            ))}
            {!readOnly && <Btn onClick={() => addMatch("return")} variant="secondary" icon={<PlusIcon />}>Manuel Donus Eslestirmesi Ekle</Btn>}
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
        <Btn onClick={exportStudentData} variant="secondary" icon={<DownloadIcon />}>Disa Aktar (JSON)</Btn>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={onClose} variant="secondary">{readOnly ? 'Kapat' : 'Iptal'}</Btn>
          {!readOnly && <Btn onClick={() => onSave(editedStudent)}>Kaydet</Btn>}
        </div>
      </div>

      {editingMatch && (
        <CourseMatchEditModal match={editingMatch.match} type={editingMatch.type} onClose={() => setEditingMatch(null)}
          onSave={updatedMatch => { setEditedStudent(prev => ({ ...prev, [`${editingMatch.type}Matches`]: prev[`${editingMatch.type}Matches`].map(m => m.id === updatedMatch.id ? updatedMatch : m) })); setEditingMatch(null); }} />
      )}
      {showCatalogModal && (
        <CourseCatalogModal university={editedStudent.hostInstitution} onClose={() => setShowCatalogModal(false)}
          onSelect={hostCourses => { const newMatch = { id: `outgoing${Date.now()}`, homeCourses: [], hostCourses }; setEditedStudent(prev => ({ ...prev, outgoingMatches: [...prev.outgoingMatches, newMatch] })); setShowCatalogModal(false); setEditingMatch({ type: "outgoing", match: newMatch }); }} />
      )}
    </Modal>
  );
};

// ── Word Document Generators (same logic as before) ──
const generateOutgoingWordDoc = (student) => {
  if (!student.outgoingMatches || student.outgoingMatches.length === 0) { alert('Bu ogrencinin henuz gidis eslestirmesi bulunmamaktadir.'); return; }
  const totalHomeCredits = student.outgoingMatches.reduce((sum, m) => sum + m.homeCourses.reduce((s, c) => s + c.credits, 0), 0);
  const totalHostCredits = student.outgoingMatches.reduce((sum, m) => sum + m.hostCourses.reduce((s, c) => s + c.credits, 0), 0);
  const semester = student.semester || "Fall 2025";
  const [season, year] = semester.split(" ");
  const seasonTR = season === "Fall" ? "Guz" : "Bahar";
  const academicYear = season === "Fall" ? `${year}-${parseInt(year)+1}` : `${parseInt(year)-1}-${year}`;

  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Erasmus Gidis Degerlendirmesi</title></head>
<body style='font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5;'>
<h3 style='text-align: center; margin-bottom: 30px;'>ERASMUS+ GIDIS ONCESI DERS ESLESTIRME DEGERLENDIRMESI</h3>
<p style='text-align: justify; margin: 20px 0;'>5- Bolumumuz <b>${student.studentNumber}</b> numarali ogrencisi <b>${student.firstName} ${student.lastName}</b>'nun, <b>${academicYear} Egitim-Ogretim Yili ${seasonTR} Donemi</b>ni ERASMUS+ Ogrenim Hareketliligi programi kapsaminda <b>${student.hostCountry}</b>'da bulunan "<b>${student.hostInstitution}</b>" Universitesi, Bilgisayar Muhendisligi Bolumunde alacagi derslerin karsiliklarin uygun olduguna ve geregi icin Fakultemiz ilgili kurullarinda gorusulmek uzere Dekanlik Makamina sunulmasina,</p>
<table border='1' cellpadding='8' cellspacing='0' style='width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt;'>
<thead><tr style='background-color: #f0f0f0; font-weight: bold;'>
<th colspan='3' style='text-align: center; border: 1px solid black;'>${student.hostInstitution}</th>
<th colspan='3' style='text-align: center; border: 1px solid black;'>CAKU Bilgisayar Muhendisligi</th>
<th style='text-align: center; border: 1px solid black;'>Statusu</th>
</tr><tr style='background-color: #f8f8f8; font-weight: bold;'>
<th style='border: 1px solid black;'>Kodu</th><th style='border: 1px solid black;'>Adi</th><th style='border: 1px solid black;'>AKTS</th>
<th style='border: 1px solid black;'>Kodu</th><th style='border: 1px solid black;'>Adi</th><th style='border: 1px solid black;'>AKTS</th>
<th style='border: 1px solid black;'>Statusu</th>
</tr></thead><tbody>
${student.outgoingMatches.map(match => {
  const hoCodes = match.hostCourses.map(c => c.code || '-').join('<br/>');
  const hoNames = match.hostCourses.map(c => c.name).join('<br/>');
  const hoCredits = match.hostCourses.reduce((s, c) => s + c.credits, 0);
  const hmCodes = match.homeCourses.map(c => c.code || '-').join('<br/>');
  const hmNames = match.homeCourses.map(c => c.name).join('<br/>');
  const hmCredits = match.homeCourses.reduce((s, c) => s + c.credits, 0);
  return `<tr>
    <td style='border: 1px solid black;'>${hoCodes}</td><td style='border: 1px solid black;'>${hoNames}</td><td style='border: 1px solid black; text-align: center;'>${hoCredits}</td>
    <td style='border: 1px solid black;'>${hmCodes}</td><td style='border: 1px solid black;'>${hmNames}</td><td style='border: 1px solid black; text-align: center;'>${hmCredits}</td>
    <td style='border: 1px solid black; text-align: center;'>Eslesti</td>
  </tr>`;
}).join('')}
<tr style='font-weight: bold; background-color: #f0f0f0;'>
<td colspan='2' style='border: 1px solid black; text-align: right;'>Toplam</td><td style='border: 1px solid black; text-align: center;'>${totalHostCredits}</td>
<td colspan='2' style='border: 1px solid black; text-align: right;'>Toplam</td><td style='border: 1px solid black; text-align: center;'>${totalHomeCredits}</td>
<td style='border: 1px solid black;'></td>
</tr></tbody></table>
<p style='margin-top: 40px;'>Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
</body></html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${student.lastName}_${student.firstName}_Gidis_Degerlendirme.doc`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};

const generateReturnWordDoc = (student) => {
  if (student.returnMatches.length === 0) { alert('Bu ogrencinin henuz donus eslestirmesi bulunmamaktadir.'); return; }
  const totalHomeCredits = student.returnMatches.reduce((sum, m) => sum + m.homeCourses.reduce((s, c) => s + c.credits, 0), 0);
  const totalHostCredits = student.returnMatches.reduce((sum, m) => sum + m.hostCourses.reduce((s, c) => s + c.credits, 0), 0);
  const semester = student.semester || "Fall 2025";
  const [season, year] = semester.split(" ");
  const seasonTR = season === "Fall" ? "Guz" : "Bahar";
  const academicYear = season === "Fall" ? `${year}-${parseInt(year)+1}` : `${parseInt(year)-1}-${year}`;

  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Erasmus Donus Muafiyeti</title><style>@page { size: A4 landscape; margin: 2cm; }</style></head>
<body style='font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5;'>
<h3 style='text-align: center; margin-bottom: 30px;'>ERASMUS+ DONUSU MUAFIYET ISTEGI</h3>
<p style='text-align: justify; margin: 20px 0;'>Bolumumuz <b>${student.studentNumber}</b> numarali ogrencisi <b>${student.firstName} ${student.lastName}</b>'nun, <b>${academicYear} Akademik Yili ${seasonTR} Donemi</b>nde ERASMUS+ programi kapsaminda yurtdisinda almis oldugu derslerin, Bilgisayar Muhendisligi Bolumu lisans programinda hangi derslere karsilik geldigi, hangi derslere sayilacaginin belirlenmesi talebi hakkinda vermis oldugu dilekcesi incelenmis olup, asagida tabloda verildigi sekliyle uygun olduguna ve geregi icin Fakultemiz ilgili kurullarinda gorusulmek uzere Dekanlik Makamina sunulmasina,</p>
<table border='1' cellpadding='4' cellspacing='0' style='width: 100%; border-collapse: collapse; margin: 5px 0; font-size: 9pt;'>
<thead><tr style='background-color: #d0d0d0; font-weight: bold;'>
<th colspan='4' style='border: 1px solid black; text-align: center;'>${student.hostInstitution}</th>
<th colspan='4' style='border: 1px solid black; text-align: center;'>CAKU Bilgisayar Muhendisligi</th>
<th style='border: 1px solid black;'>Statusu</th>
</tr><tr style='background-color: #e0e0e0; font-weight: bold;'>
<th style='border: 1px solid black;'>Kodu</th><th style='border: 1px solid black;'>Adi</th><th style='border: 1px solid black;'>AKTS</th><th style='border: 1px solid black;'>Basari Notu</th>
<th style='border: 1px solid black;'>Kodu</th><th style='border: 1px solid black;'>Adi</th><th style='border: 1px solid black;'>AKTS</th><th style='border: 1px solid black;'>Basari Notu</th>
<th style='border: 1px solid black;'>Statusu</th>
</tr></thead><tbody>
${student.returnMatches.map(match => {
  const originalHostGrade = match.hostGrade || 'A';
  const converted = convertGrade(originalHostGrade);
  const isElective = match.homeCourses.some(c => c.code && (c.code.startsWith('SEC') || c.name.toLowerCase().includes('elective'))) || match.hostCourses.some(c => c.name.toLowerCase().includes('elective'));
  const matchStatus = isElective ? 'S' : 'Z';
  const hoCodes = match.hostCourses.map(c => c.code || '-').join('<br/>');
  const hoNames = match.hostCourses.map(c => c.name).join('<br/>');
  const hoCredits = match.hostCourses.reduce((s, c) => s + c.credits, 0);
  const hmCodes = match.homeCourses.map(c => c.code || '-').join('<br/>');
  const hmNames = match.homeCourses.map(c => c.name).join('<br/>');
  const hmCredits = match.homeCourses.reduce((s, c) => s + c.credits, 0);
  return `<tr>
    <td style='border: 1px solid black;'>${hoCodes}</td><td style='border: 1px solid black;'>${hoNames}</td><td style='border: 1px solid black; text-align: center;'>${hoCredits}</td><td style='border: 1px solid black; text-align: center;'>${originalHostGrade}</td>
    <td style='border: 1px solid black;'>${hmCodes}</td><td style='border: 1px solid black;'>${hmNames}</td><td style='border: 1px solid black; text-align: center;'>${hmCredits}</td><td style='border: 1px solid black; text-align: center;'>${converted}</td>
    <td style='border: 1px solid black; text-align: center;'>${matchStatus}</td>
  </tr>`;
}).join('')}
<tr style='font-weight: bold; background-color: #f0f0f0;'>
<td colspan='2' style='border: 1px solid black; text-align: right;'>Toplam</td><td style='border: 1px solid black; text-align: center;'>${totalHostCredits}</td><td style='border: 1px solid black;'></td>
<td colspan='2' style='border: 1px solid black; text-align: right;'>Toplam</td><td style='border: 1px solid black; text-align: center;'>${totalHomeCredits}</td><td colspan='2' style='border: 1px solid black;'></td>
</tr></tbody></table>
<p style='margin-top: 10px; font-size: 9pt;'><strong>Ogrenci:</strong> ${student.firstName} ${student.lastName} (${student.studentNumber})</p>
</body></html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${student.lastName}_${student.firstName}_Donus_Muafiyet.doc`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};

// ── Main Erasmus Module (receives currentUser as prop) ──
function ErasmusLearningAgreementApp({ currentUser }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadStudents = async () => {
      if (!FirebaseDB.isReady()) { setLoading(false); return; }
      try {
        setLoading(true);
        // Initialize database if needed
        const ref = FirebaseDB.studentsRef();
        if (!ref) { setLoading(false); return; }
        const snapshot = await ref.limit(1).get();
        if (snapshot.empty) {
          for (const student of SAMPLE_STUDENTS) await FirebaseDB.addStudent(student);
          const defaultPasswords = {};
          SAMPLE_STUDENTS.forEach(s => { defaultPasswords[s.studentNumber] = '1234'; });
          const pwRef = FirebaseDB.passwordsRef();
          if (pwRef) await pwRef.doc('student_passwords').set(defaultPasswords);
        }
        const fetchedStudents = await FirebaseDB.fetchStudents();
        setStudents(fetchedStudents);
      } catch (error) {
        console.error('Error loading students:', error);
      } finally {
        setLoading(false);
      }
    };
    setTimeout(loadStudents, 500);
  }, []);

  const canEdit = (student) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return currentUser.role === 'student' && student.studentNumber === currentUser.studentNumber;
  };

  const generateSemesters = () => {
    const semesters = ["all"];
    for (let year = 2024; year <= 2030; year++) { semesters.push(`Spring ${year}`); semesters.push(`Fall ${year}`); }
    return semesters;
  };
  const semesters = generateSemesters();

  const filteredStudents = students
    .filter(s => selectedSemester === "all" || s.semester === selectedSemester)
    .filter(s => `${s.firstName} ${s.lastName} ${s.studentNumber} ${s.hostInstitution}`.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSaveStudent = async (updatedStudent) => {
    try {
      const originalStudent = students.find(s => s.id === updatedStudent.id);
      const studentNumberChanged = originalStudent && originalStudent.studentNumber !== updatedStudent.studentNumber;
      await FirebaseDB.updateStudent(updatedStudent.id, updatedStudent);
      if (studentNumberChanged) {
        const passwords = await FirebaseDB.fetchPasswords();
        const oldPassword = passwords[originalStudent.studentNumber] || '1234';
        delete passwords[originalStudent.studentNumber];
        passwords[updatedStudent.studentNumber] = oldPassword;
        await FirebaseDB.passwordsRef().doc('student_passwords').set(passwords);
      }
      setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
      setSelectedStudent(null);
      alert('Degisiklikler kaydedildi!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Kayit sirasinda hata olustu.');
    }
  };

  const handleAddStudent = async () => {
    const newStudent = { id: String(Date.now()), studentNumber: "", firstName: "", lastName: "", hostInstitution: "", hostCountry: "", semester: "Fall 2025", outgoingMatches: [], returnMatches: [] };
    setStudents(prev => [...prev, newStudent]);
    setSelectedStudent(newStudent);
  };

  const handleDeleteStudent = async (id) => {
    if (confirm("Bu ogrenciyi silmek istediginizden emin misiniz?")) {
      try {
        await FirebaseDB.deleteStudent(id);
        setStudents(prev => prev.filter(s => s.id !== id));
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const exportAllData = () => {
    const data = students.map(s => ({ "Ogrenci Numarasi": s.studentNumber, "Ad": s.firstName, "Soyad": s.lastName, "Karsi Kurum": s.hostInstitution, "Ulke": s.hostCountry, "Gidis": s.outgoingMatches.length, "Donus": s.returnMatches.length }));
    if (data.length === 0) { alert('Disa aktarilacak ogrenci bulunamadi.'); return; }
    const csv = [Object.keys(data[0]).join(","), ...data.map(row => Object.values(row).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `Erasmus_Learning_Agreements_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) { setStudents(prev => [...prev, ...importedData]); alert(`${importedData.length} ogrenci iceye aktarildi!`); }
      } catch (error) { alert("Dosya formati hatali!"); }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: C.textMuted }}>Veriler yukleniyor...</div>;
  }

  return (
    <div>
      {/* Actions Bar */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 300 }}>
            <div style={{ flex: 1, maxWidth: 350 }}>
              <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Ogrenci ara (ad, numara, kurum)..." />
            </div>
            <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}
              style={{ padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", backgroundColor: "white", cursor: "pointer", minWidth: 150 }}>
              {semesters.map(sem => {
                let displayText = sem === "all" ? "Tum Donemler" : sem.startsWith("Spring") ? sem.replace("Spring", "Bahar") : sem.replace("Fall", "Guz");
                return <option key={sem} value={sem}>{displayText}</option>;
              })}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {currentUser?.role === 'admin' && (
              <>
                <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
                <Btn onClick={() => fileInputRef.current?.click()} variant="secondary" icon={<UploadIcon />}>Ice Aktar</Btn>
                <Btn onClick={exportAllData} variant="secondary" icon={<DownloadIcon />}>Tumunu Disa Aktar</Btn>
                <Btn onClick={handleAddStudent} icon={<PlusIcon />}>Yeni Ogrenci Ekle</Btn>
                <Btn onClick={() => setShowPasswordModal(true)} variant="secondary">Sifre Yonetimi</Btn>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 24 }}>
        {[
          { label: "Toplam Ogrenci", value: students.length, color: C.navy },
          { label: "Gidis Eslestirmeleri", value: students.reduce((sum, s) => sum + s.outgoingMatches.length, 0), color: C.green },
          { label: "Donus Eslestirmeleri", value: students.reduce((sum, s) => sum + s.returnMatches.length, 0), color: C.gold },
          { label: "Ortalama Eslestirme", value: students.length > 0 ? ((students.reduce((sum, s) => sum + s.outgoingMatches.length + s.returnMatches.length, 0)) / students.length).toFixed(1) : 0, color: C.accent },
        ].map((stat, i) => (
          <Card key={i} noPadding>
            <div style={{ padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 8 }}>{stat.label}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: stat.color, fontFamily: "'Playfair Display', serif" }}>{stat.value}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Grade Conversion */}
      <Card title="Not Donusum Hesaplayici"><GradeConverter /></Card>

      {/* Students Table */}
      <Card title="Ogrenciler" noPadding>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                {["Ogrenci No", "Ad Soyad", "Karsi Kurum", "Gidis", "Donus", "Islemler"].map((h, i) => (
                  <th key={i} style={{ padding: "16px 24px", textAlign: i === 3 || i === 4 ? "center" : i === 5 ? "right" : "left", fontSize: 11, fontWeight: 700, color: C.navy, letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.id} style={{ borderBottom: `1px solid ${C.border}`, transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.bg; }} onMouseLeave={e => { e.currentTarget.style.background = ""; }}>
                  <td style={{ padding: "16px 24px" }}><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: C.navy }}>{student.studentNumber}</span></td>
                  <td style={{ padding: "16px 24px", fontWeight: 500 }}>
                    {student.firstName} {student.lastName}
                    {student.semester && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{student.semester}</div>}
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{student.hostInstitution}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{student.hostCountry}</div>
                  </td>
                  <td style={{ padding: "16px 24px", textAlign: "center" }}><Badge color={C.green} bg={C.greenLight}>{student.outgoingMatches.length} eslestirme</Badge></td>
                  <td style={{ padding: "16px 24px", textAlign: "center" }}><Badge color={C.gold} bg={C.goldPale}>{student.returnMatches.length} eslestirme</Badge></td>
                  <td style={{ padding: "16px 24px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <Btn onClick={() => setSelectedStudent(student)} variant="secondary" small icon={<FileTextIcon />}>{canEdit(student) ? 'Detay & Duzenle' : 'Detay'}</Btn>
                      <button onClick={() => generateOutgoingWordDoc(student)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#E6F4EA", color: "#1E7E34", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Gidis</button>
                      {student.returnMatches.length > 0 && (
                        <button onClick={() => generateReturnWordDoc(student)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#FFF3E0", color: "#E65100", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Donus</button>
                      )}
                      {canEdit(student) && (
                        <button onClick={() => handleDeleteStudent(student.id)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#FAEBED", color: C.accent, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><TrashIcon /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedStudent && (
        <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} onSave={handleSaveStudent} readOnly={!canEdit(selectedStudent)} />
      )}
      {showPasswordModal && currentUser?.role === 'admin' && (
        <PasswordManagementModal students={students} onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.ErasmusLearningAgreementApp = ErasmusLearningAgreementApp;
}
