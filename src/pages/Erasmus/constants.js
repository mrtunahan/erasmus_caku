
// ── University Course Catalogs ──
export const UNIVERSITY_CATALOGS = {
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

// ── Shared Constants ──
export const HOME_INSTITUTION_CATALOG = {
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
export const GRADE_CONVERSION = {
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

// ── Sample Data ──
export const SAMPLE_STUDENTS = [
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
