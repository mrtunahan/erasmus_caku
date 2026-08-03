// ══════════════════════════════════════════════════════════════
// Erasmus Learning Agreement Modülü
// Shared bileşenler shared-components.jsx'den window üzerinden gelir
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useCallback } = React;
const useResponsive = window.useResponsive;

// ── Shared bilesenlerden import (window uzerinden) ──
const C = window.C;
const Card = window.Card;
const Btn = window.Btn;
const Input = window.Input;
const FormField = window.FormField;
const Modal = window.Modal;
const Badge = window.Badge;
const HOME_INSTITUTION_CATALOG = window.HOME_INSTITUTION_CATALOG;
const convertGrade = window.convertGrade;
const DB = window.DB;
const UploadIcon = window.UploadIcon;
const DownloadIcon = window.DownloadIcon;
const PlusIcon = window.PlusIcon;
const EditIcon = window.EditIcon;
const TrashIcon = window.TrashIcon;
const ArrowRightIcon = window.ArrowRightIcon;
const FileTextIcon = window.FileTextIcon;
const PasswordManagementModal = window.PasswordManagementModal;
const GradeConverter = window.GradeConverter;

// ── Metin normalizasyonu (öğrencinin elle girdiği bilgiler) ──
// titleCaseTr: her kelimenin ilk harfi büyük, kalanı küçük (TR-locale;
//   boşluk/tire/eğik çizgi/nokta sonrası da büyütür). upperTr: tamamı büyük.
// NOT: Bu yalnız kişisel/serbest metinlere uygulanır; üniversite adı gibi
// KATALOG anahtarı olan değerlere DOKUNULMAZ (eşleşmeyi bozmamak için).
const titleCaseTr = (s) =>
  String(s == null ? '' : s)
    .toLocaleLowerCase('tr')
    .replace(/(^|[\s\-/.(])([\p{L}])/gu, (m, sep, ch) => sep + ch.toLocaleUpperCase('tr'));
const upperTr = (s) => String(s == null ? '' : s).toLocaleUpperCase('tr');
// Görüntüleme yardımcıları: ad → Title, soyad → BÜYÜK
const dispAd = (s) => titleCaseTr(s);
const dispSoyad = (s) => upperTr(s);

// ── Ortak buton stilleri (sade, tek ton) ──
// Tüm işlem butonları AYNI yükseklik ve asgari genişlikte — "İşlemler"
// sütununda alt alta sardıklarında kenarları hizalı bir ızgara oluştururlar.
// İşlem butonları: hepsi aynı kutu ölçüsünde. Metin sığmazsa KIRPILMAZ,
// iki satıra sarar — böylece "Düzenlemeye İzin Ver" gibi uzun etiketler de
// tam okunur ve ızgara hizası bozulmaz.
const eBtn = {
  padding: '6px 10px',
  minHeight: 34,
  width: '100%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.25,
  border: 'none',
  cursor: 'pointer',
  whiteSpace: 'normal',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};
const eBtnGhost = {
  ...eBtn,
  background: C ? C.card : '#fff',
  color: C ? C.navy : '#0B2341',
  border: `1px solid ${C ? C.border : '#E5E7EB'}`,
};

// ── Sade bölüm paneli (gradyan/ikon yok, tek ton) ──
const eSection = {
  marginBottom: 20,
  padding: 20,
  background: C ? C.card : '#fff',
  borderRadius: 12,
  border: `1px solid ${C ? C.border : '#E5E7EB'}`,
};
const eSectionTitle = {
  fontSize: 12,
  fontWeight: 700,
  color: C ? C.navy : '#0B2341',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 14,
};

// ── JSZip yükleyici (gerçek .docx üretimi için) ──
let _jszipPromise = null;
const loadJSZip = () => {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (_jszipPromise) return _jszipPromise;
  _jszipPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = () => resolve(window.JSZip);
    s.onerror = () => reject(new Error('JSZip yüklenemedi (internet bağlantısını kontrol edin).'));
    document.head.appendChild(s);
  });
  return _jszipPromise;
};

// ── HTML içeriğini Word'ün açabileceği bir belge olarak indir ──
// ÖNCE: OOXML altChunk (.docx) paketi kullanılıyordu ama bazı Word
// sürümlerinde "dosya bozuk" hatası veriyordu (altChunk kırılgan).
// ŞİMDİ: Word'ün onlarca yıldır sorunsuz açtığı klasik "HTML-as-Word"
// yöntemi — HTML gövdesi Word namespace'leriyle sarılıp .doc olarak
// verilir. Her Word/LibreOffice sürümünde güvenle açılır.
const downloadAsDocx = async (html, filename) => {
  // Gelen html tam bir <html>…</html> ise gövdeyi al, değilse olduğu gibi kullan.
  let inner = html;
  const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  if (bodyMatch) inner = bodyMatch[1];

  const doc =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
    'xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8">' +
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View>' +
    '<w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
    '<style>@page { size: A4 landscape; margin: 2cm; } ' +
    'body { font-family: Arial, sans-serif; font-size: 11pt; }</style></head>' +
    '<body>' +
    inner +
    '</body></html>';

  // ﻿ (BOM) + application/msword → Word doğru kodlama ve türle açar
  const blob = new Blob(['﻿', doc], {
    type: 'application/msword;charset=utf-8',
  });
  const docName = String(filename || 'belge.docx').replace(/\.docx?$/i, '') + '.doc';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = docName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ── University Course Catalogs ──
const UNIVERSITY_CATALOGS = {
  'Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich': {
    country: 'Poland',
    courses: [
      {
        code: '05-EMS-APN-SP1',
        name: 'Architecture and Programming of Microcontrollers',
        credits: 8,
      },
      { code: '05-EMS-CN-SP1', name: 'Computer Networks', credits: 4 },
      { code: '05-EMS-BOS-SP1', name: 'Basics of Operating Systems', credits: 3 },
      { code: '05-EMS-WSD-SP1', name: 'Web Services Design', credits: 2 },
      { code: '05-EMS-FP-SP1', name: 'Fundamentals of Programming', credits: 5 },
      { code: '05-EMS-RES-SP1', name: 'Renewable Energy Sources', credits: 2 },
      { code: '05-EMS-DC-SP1', name: 'Digital Circuits', credits: 4 },
      { code: '05-EMS-SG-SP1', name: 'Smart Grid', credits: 8 },
      { code: '05-EMS-SLP-SP1', name: 'Script Languages Programming', credits: 5 },
      { code: '15-EMS-HW-SP1', name: 'History of Design', credits: 3 },
      { code: '15-EMS-BD-SP1', name: 'Basics of Design', credits: 4 },
      { code: '15-EMS-VC-SP1', name: 'Visual Communication', credits: 3 },
      { code: '15-EMS-DS-SP1', name: 'Specialized Design', credits: 4 },
      { code: '15-EMS-PD-SP1', name: 'Packaging Design', credits: 4 },
      { code: '08-EMS-FINAC-SP1', name: 'Financial Accounting', credits: 6 },
      { code: '08-EMS-MANAG-SP1', name: 'Management', credits: 6 },
      { code: '08-EMS-MANAC-SP1', name: 'Management Accounting', credits: 5 },
      { code: '00-EMS-STAT-SP1', name: 'Statistics', credits: 6 },
    ],
  },
  'Politechnika Krakowska': {
    country: 'Poland',
    courses: [
      { code: 'E-CN', name: 'Computer Networks', credits: 6 },
      { code: 'F-1.SE', name: 'Software Engineering', credits: 6 },
      { code: 'E-IPE', name: 'Introduction to Prompt Engineering', credits: 6 },
      { code: 'F-1.PS_1', name: 'Problem Solving', credits: 6 },
      { code: 'F-1.EAI', name: 'Elements of AI', credits: 6 },
    ],
  },
  'Collegium Witelona Uczelnia Panstwowa': {
    country: 'Poland',
    courses: [
      { code: 'MI.4', name: 'Computer Networks I', credits: 5 },
      { code: 'MI.2', name: 'Programming Basic I', credits: 6 },
      { code: 'ME.1', name: 'Basics of Economics and Finance', credits: 4 },
      { code: 'BI.1', name: 'Mathematics I', credits: 6 },
      { code: 'ML.2', name: 'Production Logistics', credits: 5 },
      { code: 'MP.2', name: 'Production and Service Management', credits: 5 },
    ],
  },
  'Panevezio Kolegija': {
    country: 'Lithuania',
    courses: [
      { code: 'PFL', name: 'Professional Foreign Language', credits: 6 },
      { code: 'IIT', name: 'Innovative Information Technology', credits: 6 },
      { code: 'HN', name: 'Health Nutrition', credits: 3 },
      { code: 'CAD', name: 'Computer Aided Design (CAD)', credits: 6 },
      { code: 'SSE', name: 'Software systems engineering', credits: 3 },
      { code: 'LWN', name: 'Local and wide area networks', credits: 3 },
      { code: 'CNS', name: 'Computer network security and control', credits: 3 },
    ],
  },
  'Babeș-Bolyai University': {
    country: 'Romania',
    courses: [
      { code: 'MLE5023', name: 'Formal languages and compiler design', credits: 5 },
      { code: 'MLE5077', name: 'Parallel and distributed programming', credits: 5 },
      { code: 'MLE5260', name: 'Database fundamentals', credits: 5 },
      { code: 'MLE5002', name: 'Computer networks', credits: 6 },
      { code: 'MLE5258', name: 'Advanced programming techniques', credits: 5 },
      { code: 'MLE5078', name: 'Mobile application programming', credits: 4 },
    ],
  },
};

// ── Sample Data ──
const SAMPLE_STUDENTS = [
  {
    id: 4,
    studentNumber: 'AND43',
    firstName: 'Ayten Nisa',
    lastName: 'DİK',
    email: 'nisadik43@icloud.com',
    hostInstitution: 'Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich',
    hostCountry: 'Poland',
    semester: 'Fall 2025',
    outgoingMatches: [
      {
        id: 'out18',
        homeCourses: [{ code: 'BİL307', name: 'Mikroişlemciler', credits: 7 }],
        hostCourses: [
          {
            code: '05-EMS-APN-SP1',
            name: 'Architecture and Programming of Microcontrollers',
            credits: 8,
          },
        ],
      },
      {
        id: 'out19',
        homeCourses: [{ code: 'BİL401', name: 'Bilgisayar Ağları', credits: 7 }],
        hostCourses: [{ code: '05-EMS-CN-SP1', name: 'Computer Networks', credits: 4 }],
      },
      {
        id: 'out20',
        homeCourses: [{ code: '-', name: 'Elective 1', credits: 4 }],
        hostCourses: [
          { code: '15-EMS-HW-SP1', name: 'History of Design', credits: 3 },
          { code: '05-EMS-RES-SP1', name: 'Renewable Energy Sources', credits: 2 },
        ],
      },
      {
        id: 'out21',
        homeCourses: [{ code: '-', name: 'Elective 2', credits: 6 }],
        hostCourses: [
          { code: '15-EMS-BD-SP1', name: 'Basics of Design', credits: 4 },
          { code: '05-EMS-WSD-SP1', name: 'Web Services Design', credits: 2 },
        ],
      },
      {
        id: 'out22',
        homeCourses: [{ code: '-', name: 'Elective 3', credits: 4 }],
        hostCourses: [{ code: '08-EMS-FINAC-SP1', name: 'Financial Accounting', credits: 6 }],
      },
      {
        id: 'out23',
        homeCourses: [{ code: '-', name: 'Elective 4', credits: 4 }],
        hostCourses: [{ code: '05-EMS-BOS-SP1', name: 'Basics of Operating Systems', credits: 3 }],
      },
    ],
    returnMatches: [],
  },
  {
    id: 5,
    studentNumber: 'EIF222',
    firstName: 'Ece İrem',
    lastName: 'FİLİZ',
    email: 'eceirem222@gmail.com',
    hostInstitution: 'Panevezio Kolegija',
    hostCountry: 'Lithuania',
    semester: 'Fall 2025',
    outgoingMatches: [
      {
        id: 'out24',
        homeCourses: [
          { code: '-', name: 'Elective I', credits: 3 },
          { code: '-', name: 'Elective II', credits: 3 },
        ],
        hostCourses: [{ code: '-', name: 'Professional Foreign Language', credits: 6 }],
      },
      {
        id: 'out25',
        homeCourses: [{ code: 'BİL482', name: 'Yönetim Bilişim Sistemleri', credits: 6 }],
        hostCourses: [{ code: '-', name: 'Innovative Information Technology', credits: 6 }],
      },
      {
        id: 'out26',
        homeCourses: [{ code: '-', name: 'Elective III', credits: 3 }],
        hostCourses: [{ code: '-', name: 'Health Nutrition', credits: 3 }],
      },
      {
        id: 'out27',
        homeCourses: [{ code: '-', name: 'Elective IV', credits: 6 }],
        hostCourses: [{ code: '-', name: 'Computer Aided Design (CAD)', credits: 6 }],
      },
      {
        id: 'out28',
        homeCourses: [{ code: 'BİL403', name: 'Yazılım Mühendisliği İlkeleri', credits: 6 }],
        hostCourses: [
          { code: '-', name: 'Software systems engineering', credits: 3 },
          { code: '-', name: 'Local and wide area networks', credits: 3 },
        ],
      },
      {
        id: 'out29',
        homeCourses: [{ code: '-', name: 'Elective V', credits: 3 }],
        hostCourses: [{ code: '-', name: 'Computer network security and control', credits: 3 }],
      },
    ],
    returnMatches: [],
  },
  {
    id: 10,
    studentNumber: 'FO006',
    firstName: 'Furkan',
    lastName: 'ÖZEL',
    email: 'ozelfurkan006@gmail.com',
    hostInstitution: 'Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich',
    hostCountry: 'Poland',
    semester: 'Fall 2025',
    outgoingMatches: [
      {
        id: 'out51',
        homeCourses: [{ code: 'BİL305', name: 'İşletim Sistemleri', credits: 6 }],
        hostCourses: [{ code: '05-EMS-BOS-SP1', name: 'Basics of Operating Systems', credits: 3 }],
      },
      {
        id: 'out52',
        homeCourses: [{ code: 'BİL307', name: 'Mikroişlemciler', credits: 7 }],
        hostCourses: [
          {
            code: '05-EMS-APN-SP1',
            name: 'Architecture and Programming of Microcontrollers',
            credits: 8,
          },
        ],
      },
      {
        id: 'out53',
        homeCourses: [{ code: 'BİL401', name: 'Bilgisayar Ağları', credits: 7 }],
        hostCourses: [
          { code: '05-EMS-CN-SP1', name: 'Computer Networks', credits: 4 },
          { code: '15-EMS-HW-SP1', name: 'History of Design', credits: 3 },
        ],
      },
      {
        id: 'out54',
        homeCourses: [{ code: '-', name: 'Seçmeli 1', credits: 5 }],
        hostCourses: [{ code: '15-EMS-BD-SP1', name: 'Basics of Design', credits: 4 }],
      },
      {
        id: 'out55',
        homeCourses: [{ code: '-', name: 'Seçmeli 2', credits: 4 }],
        hostCourses: [{ code: '08-EMS-MANAG-SP1', name: 'Management', credits: 6 }],
      },
      {
        id: 'out56',
        homeCourses: [{ code: '-', name: 'Seçmeli 3', credits: 4 }],
        hostCourses: [{ code: '08-EMS-MANAC-SP1', name: 'Management Accounting', credits: 5 }],
      },
    ],
    returnMatches: [],
  },
  {
    id: 9,
    studentNumber: 'HTG2003',
    firstName: 'Halil Talha',
    lastName: 'GÜNDÜZ',
    email: 'haliltalhagunduz@gmail.com',
    hostInstitution: 'Panevezio Kolegija',
    hostCountry: 'Lithuania',
    semester: 'Fall 2025',
    outgoingMatches: [
      {
        id: 'out45',
        homeCourses: [
          { code: '-', name: 'Elective I', credits: 3 },
          { code: '-', name: 'Elective II', credits: 3 },
        ],
        hostCourses: [{ code: '-', name: 'Professional Foreign Language', credits: 6 }],
      },
      {
        id: 'out46',
        homeCourses: [{ code: 'BİL482', name: 'Yönetim Bilişim Sistemleri', credits: 6 }],
        hostCourses: [{ code: '-', name: 'Innovative Information Technology', credits: 6 }],
      },
      {
        id: 'out47',
        homeCourses: [{ code: '-', name: 'Elective III', credits: 3 }],
        hostCourses: [{ code: '-', name: 'Health Nutrition', credits: 3 }],
      },
      {
        id: 'out48',
        homeCourses: [{ code: '-', name: 'Elective IV', credits: 6 }],
        hostCourses: [{ code: '-', name: 'Computer Aided Design (CAD)', credits: 6 }],
      },
      {
        id: 'out49',
        homeCourses: [{ code: 'BİL403', name: 'Yazılım Mühendisliği İlkeleri', credits: 6 }],
        hostCourses: [
          { code: '-', name: 'Software systems engineering', credits: 3 },
          { code: '-', name: 'Local and wide area networks', credits: 3 },
        ],
      },
      {
        id: 'out50',
        homeCourses: [{ code: '-', name: 'Elective V', credits: 3 }],
        hostCourses: [{ code: '-', name: 'Computer network security and control', credits: 3 }],
      },
    ],
    returnMatches: [],
  },
  {
    id: 8,
    studentNumber: 'ND1635',
    firstName: 'Neslihan',
    lastName: 'DEMİRCİ',
    email: 'neslihan.nevin1635@gmail.com',
    hostInstitution: 'Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich',
    hostCountry: 'Poland',
    semester: 'Fall 2025',
    outgoingMatches: [
      {
        id: 'out40',
        homeCourses: [{ code: 'BİL305', name: 'İşletim Sistemleri', credits: 6 }],
        hostCourses: [{ code: '05-EMS-BOS-SP1', name: 'Basics of Operating Systems', credits: 3 }],
      },
      {
        id: 'out41',
        homeCourses: [{ code: 'BİL307', name: 'Mikroişlemciler', credits: 7 }],
        hostCourses: [
          {
            code: '05-EMS-APN-SP1',
            name: 'Architecture and Programming of Microcontrollers',
            credits: 8,
          },
        ],
      },
      {
        id: 'out42',
        homeCourses: [{ code: 'BİL205', name: 'Sayısal Sistem Tasarımı', credits: 7 }],
        hostCourses: [
          { code: '05-EMS-DC-SP1', name: 'Digital Circuits', credits: 4 },
          { code: '05-EMS-RES-SP1', name: 'Renewable Energy Sources', credits: 2 },
        ],
      },
      {
        id: 'out43',
        homeCourses: [
          { code: '-', name: 'Elective 1', credits: 4 },
          { code: '-', name: 'Elective 2', credits: 4 },
        ],
        hostCourses: [
          { code: '15-EMS-HW-SP1', name: 'History of Design', credits: 3 },
          { code: '15-EMS-BD-SP1', name: 'Basics of Design', credits: 4 },
          { code: '15-EMS-DS-SP1', name: 'Specialized Design', credits: 4 },
        ],
      },
      {
        id: 'out44',
        homeCourses: [{ code: '-', name: 'Elective 3', credits: 4 }],
        hostCourses: [{ code: '15-EMS-PD-SP1', name: 'Packaging Design', credits: 4 }],
      },
    ],
    returnMatches: [],
  },
  {
    id: 7,
    studentNumber: 'RBK2004',
    firstName: 'Rabia Beyza',
    lastName: 'KURUP',
    email: 'kuruprabia@gmail.com',
    hostInstitution: 'Babeș-Bolyai University',
    hostCountry: 'Romania',
    semester: 'Fall 2025',
    outgoingMatches: [
      {
        id: 'out35',
        homeCourses: [{ code: 'BİL301', name: 'Programlama Dilleri', credits: 6 }],
        hostCourses: [
          { code: 'MLE5023', name: 'Formal languages and compiler design', credits: 5 },
        ],
      },
      {
        id: 'out36',
        homeCourses: [{ code: 'BİL303', name: 'Veritabanı Sistemleri', credits: 7 }],
        hostCourses: [
          { code: 'MLE5077', name: 'Parallel and distributed programming', credits: 5 },
          { code: 'MLE5260', name: 'Database fundamentals', credits: 5 },
        ],
      },
      {
        id: 'out37',
        homeCourses: [{ code: 'BİL401', name: 'Bilgisayar Ağları', credits: 7 }],
        hostCourses: [{ code: 'MLE5002', name: 'Computer networks', credits: 6 }],
      },
      {
        id: 'out38',
        homeCourses: [
          { code: '-', name: 'Elective 1', credits: 4 },
          { code: '-', name: 'Elective 2', credits: 3 },
        ],
        hostCourses: [
          { code: 'MLE5258', name: 'Advanced programming techniques', credits: 5 },
          { code: 'MLE5078', name: 'Mobile application programming', credits: 4 },
        ],
      },
      {
        id: 'out39',
        homeCourses: [{ code: '-', name: 'Elective 3', credits: 3 }],
        hostCourses: [{ code: 'MLE5078', name: 'Mobile application programming', credits: 4 }],
      },
    ],
    returnMatches: [],
  },
  {
    id: 6,
    studentNumber: 'SNC128',
    firstName: 'Sude Naz',
    lastName: 'ÇAKMAK',
    email: 'sudecakmak128@yandex.com',
    hostInstitution: 'Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich',
    hostCountry: 'Poland',
    semester: 'Fall 2025',
    outgoingMatches: [
      {
        id: 'out30',
        homeCourses: [{ code: 'BİL307', name: 'Mikroişlemciler', credits: 7 }],
        hostCourses: [
          {
            code: '05-EMS-APN-SP1',
            name: 'Architecture and Programming of Microcontrollers',
            credits: 8,
          },
        ],
      },
      {
        id: 'out31',
        homeCourses: [{ code: 'BİL401', name: 'Bilgisayar Ağları', credits: 7 }],
        hostCourses: [{ code: '05-EMS-CN-SP1', name: 'Computer Networks', credits: 4 }],
      },
      {
        id: 'out32',
        homeCourses: [{ code: 'BİL305', name: 'İşletim Sistemleri', credits: 6 }],
        hostCourses: [
          { code: '05-EMS-BOS-SP1', name: 'Basics of Operating Systems', credits: 3 },
          { code: '05-EMS-WSD-SP1', name: 'Web Services Design', credits: 2 },
        ],
      },
      {
        id: 'out33',
        homeCourses: [{ code: 'BİL203', name: 'Nesnesel Tasarım ve Programlama', credits: 7 }],
        hostCourses: [
          { code: '15-EMS-VC-SP1', name: 'Visual Communication', credits: 3 },
          { code: '05-EMS-FP-SP1', name: 'Fundamentals of Programming', credits: 5 },
        ],
      },
      {
        id: 'out34',
        homeCourses: [{ code: 'BİL205', name: 'Sayısal Sistem Tasarımı', credits: 7 }],
        hostCourses: [
          { code: '05-EMS-DC-SP1', name: 'Digital Circuits', credits: 4 },
          { code: '05-EMS-RES-SP1', name: 'Renewable Energy Sources', credits: 2 },
          { code: '15-EMS-HW-SP1', name: 'History of Design', credits: 3 },
        ],
      },
    ],
    returnMatches: [],
  },
  {
    id: 1,
    studentNumber: 'YEB2147',
    firstName: 'Yunus Emre',
    lastName: 'BOZAN',
    email: 'ybe2147@gmail.com',
    hostInstitution: 'Politechnika Bydgoska im Jana i Jedrzeja Sniadeckich',
    hostCountry: 'Poland',
    semester: 'Fall 2025',
    outgoingMatches: [
      {
        id: 'out1',
        homeCourses: [{ code: 'BIL401', name: 'Computer Networks', credits: 7 }],
        hostCourses: [{ code: '05-EMS-CN-SP1', name: 'Computer Networks', credits: 4 }],
      },
      {
        id: 'out2',
        homeCourses: [{ code: '-', name: 'Elective 1', credits: 4 }],
        hostCourses: [{ code: '05-EMS-RES-SP1', name: 'Renewable Energy Sources', credits: 2 }],
      },
      {
        id: 'out3',
        homeCourses: [{ code: '-', name: 'Elective 2', credits: 5 }],
        hostCourses: [{ code: '05-EMS-FP-SP1', name: 'Fundamentals of Programming', credits: 5 }],
      },
      {
        id: 'out4',
        homeCourses: [{ code: '-', name: 'Elective 3', credits: 4 }],
        hostCourses: [{ code: '00-EMS-STAT-SP1', name: 'Statistics', credits: 6 }],
      },
      {
        id: 'out5',
        homeCourses: [{ code: '-', name: 'Elective 4', credits: 4 }],
        hostCourses: [{ code: '05-EMS-SG-SP1', name: 'Smart Grid', credits: 8 }],
      },
      {
        id: 'out6',
        homeCourses: [{ code: '-', name: 'Elective 5', credits: 6 }],
        hostCourses: [{ code: '05-EMS-SLP-SP1', name: 'Script Languages Programming', credits: 5 }],
      },
    ],
    returnMatches: [],
  },
  {
    id: 3,
    studentNumber: 'YEO101',
    firstName: 'Yunus Emre',
    lastName: 'ÖNEL',
    email: 'ynsemronl@outlook.com',
    hostInstitution: 'Collegium Witelona Uczelnia Panstwowa',
    hostCountry: 'Poland',
    semester: 'Fall 2025',
    outgoingMatches: [
      {
        id: 'out12',
        homeCourses: [{ code: 'BIL401', name: 'Computer Networks', credits: 7 }],
        hostCourses: [{ code: 'MI.4', name: 'Computer Networks I', credits: 5 }],
      },
      {
        id: 'out13',
        homeCourses: [{ code: '-', name: 'Elective 1', credits: 6 }],
        hostCourses: [{ code: 'MI.2', name: 'Programming Basic I', credits: 6 }],
      },
      {
        id: 'out14',
        homeCourses: [{ code: '-', name: 'Elective 2', credits: 3 }],
        hostCourses: [{ code: 'ME.1', name: 'Basics of Economics and Finance', credits: 4 }],
      },
      {
        id: 'out15',
        homeCourses: [{ code: '-', name: 'Elective 3', credits: 4 }],
        hostCourses: [{ code: 'BI.1', name: 'Mathematics I', credits: 6 }],
      },
      {
        id: 'out16',
        homeCourses: [{ code: '-', name: 'Elective 4', credits: 5 }],
        hostCourses: [{ code: 'ML.2', name: 'Production Logistics', credits: 5 }],
      },
      {
        id: 'out17',
        homeCourses: [{ code: '-', name: 'Elective 5', credits: 5 }],
        hostCourses: [{ code: 'MP.2', name: 'Production and Service Management', credits: 5 }],
      },
    ],
    returnMatches: [],
  },
  {
    id: 2,
    studentNumber: 'ZA3400',
    firstName: 'Zeynep',
    lastName: 'AKBULUT',
    email: 'zeynepakbulut3400@gmail.com',
    hostInstitution: 'Politechnika Krakowska',
    hostCountry: 'Poland',
    semester: 'Fall 2025',
    outgoingMatches: [
      {
        id: 'out7',
        homeCourses: [{ code: 'BİL401', name: 'Bilgisayar Ağları', credits: 7 }],
        hostCourses: [{ code: 'E-CN', name: 'Computer Networks', credits: 6 }],
      },
      {
        id: 'out8',
        homeCourses: [{ code: 'BİL403', name: 'Yazılım Mühendisliği İlkeleri', credits: 6 }],
        hostCourses: [{ code: 'F-1.SE', name: 'Software Engineering', credits: 6 }],
      },
      {
        id: 'out9',
        homeCourses: [{ code: '-', name: 'Elective 1', credits: 5 }],
        hostCourses: [{ code: 'E-IPE', name: 'Introduction to Prompt Engineering', credits: 6 }],
      },
      {
        id: 'out10',
        homeCourses: [{ code: '-', name: 'Elective 2', credits: 6 }],
        hostCourses: [{ code: 'F-1.PS_1', name: 'Problem Solving', credits: 6 }],
      },
      {
        id: 'out11',
        homeCourses: [
          { code: '-', name: 'Elective 3', credits: 3 },
          { code: '-', name: 'Elective 4', credits: 3 },
        ],
        hostCourses: [{ code: 'F-1.EAI', name: 'Elements of AI', credits: 6 }],
      },
    ],
    returnMatches: [],
  },
];

// ── Course Matching Card ──
const CourseMatchCard = ({
  match,
  onDelete,
  onEdit,
  showGrade,
  type,
  readOnly = false,
  canApprove = false,
  onApprove,
  onReject,
}) => {
  const r = useResponsive();
  const homeTotal = match.homeCourses.reduce((sum, c) => sum + c.credits, 0);
  const hostTotal = match.hostCourses.reduce((sum, c) => sum + c.credits, 0);
  // Onay durumu: pending=sarı, approved=yeşil, rejected=kırmızı.
  // Eski kayıtlarda status yok → onaylı sayılır (yeşil), düzeni bozmaz.
  const status = match.status || 'approved';
  const statusMeta = {
    pending: { label: 'Onay Bekliyor', color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
    approved: { label: 'Onaylandı', color: '#065F46', bg: '#D1FAE5', dot: '#10B981' },
    rejected: { label: 'Reddedildi', color: '#991B1B', bg: '#FEE2E2', dot: '#EF4444' },
  }[status] || { label: status, color: C.textMuted, bg: '#F3F4F6', dot: '#9CA3AF' };
  const borderColor =
    { pending: '#FCD34D', approved: '#6EE7B7', rejected: '#FCA5A5' }[status] || C.border;
  return (
    <div
      style={{
        background: C.bg,
        borderRadius: 10,
        padding: r.val(12, 16, 20),
        marginBottom: 16,
        border: `1.5px solid ${borderColor}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 20,
            background: statusMeta.bg,
            color: statusMeta.color,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusMeta.dot }} />
          {statusMeta.label}
        </span>
        {match.reviewedBy && status !== 'pending' && (
          <span style={{ fontSize: 11, color: C.textMuted }}>
            {status === 'approved' ? 'Onaylayan' : 'Reddeden'}: {match.reviewedBy}
          </span>
        )}
        {canApprove && (
          <span style={{ display: 'flex', gap: 6 }}>
            {status !== 'approved' && (
              <button
                onClick={() => onApprove && onApprove(match.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 7,
                  border: 'none',
                  background: '#10B981',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {status === 'rejected' ? 'Yeniden Onayla' : 'Onayla'}
              </button>
            )}
            {status !== 'rejected' && (
              <button
                onClick={() => onReject && onReject(match.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 7,
                  border: 'none',
                  background: '#EF4444',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {status === 'approved' ? 'Onayı Geri Al' : 'Reddet'}
              </button>
            )}
          </span>
        )}
      </div>
      {status === 'rejected' && match.rejectReason && (
        <div
          style={{
            fontSize: 12,
            color: '#991B1B',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            padding: '8px 10px',
            marginBottom: 12,
          }}
        >
          <strong>Red sebebi:</strong> {match.rejectReason}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: r.isMobile ? 'column' : 'row',
          gap: r.val(12, 16, 20),
          alignItems: r.isMobile ? 'stretch' : 'center',
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.navy,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 10,
              background: '#EEF0F5',
              padding: '6px 10px',
              borderRadius: 6,
              display: 'inline-block',
            }}
          >
            Kendi Kurumumuz
          </div>
          {match.homeCourses.map((course, i) => (
            <div
              key={i}
              style={{
                background: C.card,
                padding: '10px 12px',
                borderRadius: 8,
                marginBottom: 6,
                border: `1px solid ${C.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    color: C.textMuted,
                    fontWeight: 600,
                  }}
                >
                  {course.code}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{course.name}</span>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                {course.credits} AKTS
              </div>
            </div>
          ))}
          <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginTop: 8 }}>
            Toplam: {homeTotal} AKTS
          </div>
        </div>
        <div style={{ color: C.gold, flexShrink: 0 }}>
          <ArrowRightIcon />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.green,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 10,
              background: C.greenLight,
              padding: '6px 10px',
              borderRadius: 6,
              display: 'inline-block',
            }}
          >
            Karşı Kurum
          </div>
          {match.hostCourses.map((course, i) => (
            <div
              key={i}
              style={{
                background: C.card,
                padding: '10px 12px',
                borderRadius: 8,
                marginBottom: 6,
                border: `1px solid ${C.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    color: C.textMuted,
                    fontWeight: 600,
                  }}
                >
                  {course.code}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{course.name}</span>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                {course.credits} AKTS
              </div>
            </div>
          ))}
          <div style={{ fontSize: 13, fontWeight: 600, color: C.green, marginTop: 8 }}>
            Toplam: {hostTotal} AKTS
          </div>
        </div>
        {showGrade && (
          <div
            style={{
              background: C.card,
              padding: '12px 16px',
              borderRadius: 8,
              border: `2px solid ${C.navy}`,
              textAlign: 'center',
              minWidth: 140,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.textMuted,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Notlar
            </div>
            {match.hostGrades && Object.keys(match.hostGrades).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {match.hostCourses.map((hc, idx) => {
                  const hGrade = match.hostGrades?.[idx] || match.hostGrade || 'A';
                  const hmGrade = match.homeGrades?.[idx] || match.homeGrade || 'Muaf';
                  return (
                    <div key={idx}>
                      <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>
                        {hc.code}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.navy,
                          fontFamily: "'Playfair Display', serif",
                        }}
                      >
                        {hGrade} → {hmGrade}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: C.navy,
                  fontFamily: "'Playfair Display', serif",
                }}
              >
                {match.hostGrade || 'A'} → {match.homeGrade || 'Muaf'}
              </div>
            )}
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>Karşı → Kendi</div>
          </div>
        )}
        {!readOnly && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={() => onEdit(match)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: C.card,
                color: C.navy,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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

// ── Course Match Edit Modal ──
const CourseMatchEditModal = ({ match, type, onClose, onSave, activeDepartment }) => {
  const r = useResponsive();
  const [editedMatch, setEditedMatch] = useState(JSON.parse(JSON.stringify(match)));
  const [showHomeCatalog, setShowHomeCatalog] = useState(false);

  const addCourse = (side) => {
    setEditedMatch((prev) => ({
      ...prev,
      [`${side}Courses`]: [...prev[`${side}Courses`], { code: '', name: '', credits: 0 }],
    }));
  };
  const addCoursesFromCatalog = (side, courses) => {
    setEditedMatch((prev) => ({
      ...prev,
      [`${side}Courses`]: [...prev[`${side}Courses`], ...courses],
    }));
  };
  const updateCourse = (side, index, field, value) => {
    setEditedMatch((prev) => ({
      ...prev,
      [`${side}Courses`]: prev[`${side}Courses`].map((c, i) =>
        i === index ? { ...c, [field]: field === 'credits' ? parseFloat(value) || 0 : value } : c
      ),
    }));
  };
  const removeCourse = (side, index) => {
    setEditedMatch((prev) => ({
      ...prev,
      [`${side}Courses`]: prev[`${side}Courses`].filter((_, i) => i !== index),
    }));
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Ders Eşleştirmesini Düzenle"
      width="min(900px, 100vw - 32px)"
    >
      {type === 'return' && (
        <div
          style={{
            padding: 16,
            background: '#E3F2FD',
            border: '2px solid #2196F3',
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#1565C0',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Düzenleme İpucu
          </div>
          <div style={{ fontSize: 13, color: '#424242' }}>
            Bu eşleştirme gidiş verileriyle dolduruldu. Öğrenci farklı bir ders aldıysa aşağıdaki
            alanlardan düzenleyebilirsiniz.
          </div>
        </div>
      )}
      <div
        className="responsive-grid-2"
        style={{
          display: 'grid',
          gridTemplateColumns: r.isMobile ? '1fr' : '1fr auto 1fr',
          gap: r.val(16, 20, 24),
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: C.navy,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 12,
              background: '#EEF0F5',
              padding: '8px 12px',
              borderRadius: 8,
            }}
          >
            Kendi Kurumumuz
          </div>
          {editedMatch.homeCourses.map((course, i) => (
            <div
              key={i}
              style={{
                padding: 16,
                background: C.bg,
                borderRadius: 8,
                marginBottom: 12,
                border: `1px solid ${C.border}`,
              }}
            >
              <FormField label="Ders Kodu">
                <Input
                  value={course.code}
                  onChange={(e) => updateCourse('home', i, 'code', e.target.value)}
                  placeholder="BİL201"
                />
              </FormField>
              <FormField label="Ders Adı">
                <Input
                  value={course.name}
                  onChange={(e) => updateCourse('home', i, 'name', e.target.value)}
                  placeholder="Veri Yapıları"
                />
              </FormField>
              <FormField label="AKTS">
                <Input
                  type="number"
                  value={course.credits}
                  onChange={(e) => updateCourse('home', i, 'credits', e.target.value)}
                />
              </FormField>
              <Btn onClick={() => removeCourse('home', i)} variant="danger" small>
                <TrashIcon /> Sil
              </Btn>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn
              onClick={() => setShowHomeCatalog(true)}
              variant="secondary"
              small
              icon={<PlusIcon />}
            >
              Katalogdan Seç
            </Btn>
            <Btn onClick={() => addCourse('home')} variant="secondary" small icon={<PlusIcon />}>
              Manuel Ekle
            </Btn>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.gold,
            paddingTop: 40,
          }}
        >
          <ArrowRightIcon />
        </div>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: C.green,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 12,
              background: C.greenLight,
              padding: '8px 12px',
              borderRadius: 8,
            }}
          >
            Karşı Kurum
          </div>
          {editedMatch.hostCourses.map((course, i) => (
            <div
              key={i}
              style={{
                padding: 16,
                background: C.bg,
                borderRadius: 8,
                marginBottom: 12,
                border: `1px solid ${C.border}`,
              }}
            >
              <FormField label="Ders Kodu">
                <Input
                  value={course.code}
                  onChange={(e) => updateCourse('host', i, 'code', e.target.value)}
                  placeholder="CS201"
                />
              </FormField>
              <FormField label="Ders Adı">
                <Input
                  value={course.name}
                  onChange={(e) => updateCourse('host', i, 'name', e.target.value)}
                  placeholder="Data Structures"
                />
              </FormField>
              <FormField label="AKTS">
                <Input
                  type="number"
                  value={course.credits}
                  onChange={(e) => updateCourse('host', i, 'credits', e.target.value)}
                />
              </FormField>
              <Btn onClick={() => removeCourse('host', i)} variant="danger" small>
                <TrashIcon /> Sil
              </Btn>
            </div>
          ))}
          <Btn onClick={() => addCourse('host')} variant="secondary" small icon={<PlusIcon />}>
            Manuel Ders Ekle
          </Btn>
        </div>
      </div>
      {type === 'return' && (
        <div
          style={{
            marginTop: 24,
            padding: 20,
            background: C.goldPale,
            borderRadius: 10,
            border: `1px solid ${C.goldLight}`,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: C.navy,
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Not Bilgileri
          </div>
          {editedMatch.hostCourses.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {editedMatch.hostCourses.map((course, idx) => {
                const gradeKey = `hostGrade_${idx}`;
                const gradeVal = editedMatch.hostGrades?.[idx] ?? editedMatch.hostGrade ?? '';
                return (
                  <div
                    key={idx}
                    style={{
                      padding: 14,
                      background: 'rgba(255,255,255,0.7)',
                      borderRadius: 8,
                      border: `1px solid ${C.goldLight}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: C.navy,
                        marginBottom: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          background: C.greenLight,
                          color: C.green,
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {course.code}
                      </span>
                      <span>{course.name}</span>
                      <span style={{ color: C.textMuted, fontSize: 11 }}>
                        ({course.credits} AKTS)
                      </span>
                    </div>
                    <div
                      className="responsive-grid-2"
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
                    >
                      <FormField label={`Karşı Kurumdan Alınan Not`}>
                        <Input
                          value={gradeVal}
                          onChange={(e) => {
                            const newGrades = { ...(editedMatch.hostGrades || {}) };
                            newGrades[idx] = e.target.value;
                            setEditedMatch((prev) => ({ ...prev, hostGrades: newGrades }));
                          }}
                          placeholder="A, B+, 85, vb."
                        />
                        {gradeVal && (
                          <div
                            style={{
                              marginTop: 6,
                              padding: 6,
                              background: '#fffacd',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              color: C.navy,
                              border: '2px solid #ffd700',
                            }}
                          >
                            Dönüşüm: <strong>{convertGrade(gradeVal)}</strong>
                          </div>
                        )}
                      </FormField>
                      <FormField label={`Kendi Kurumumuzdaki Karşılık`}>
                        <Input
                          value={editedMatch.homeGrades?.[idx] ?? editedMatch.homeGrade ?? 'Muaf'}
                          onChange={(e) => {
                            const newGrades = { ...(editedMatch.homeGrades || {}) };
                            newGrades[idx] = e.target.value;
                            setEditedMatch((prev) => ({ ...prev, homeGrades: newGrades }));
                          }}
                          placeholder="Muaf, AA, BB, vb."
                        />
                      </FormField>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="responsive-grid-2"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
            >
              <FormField label="Karşı Kurumdan Alınan Not">
                <Input
                  value={editedMatch.hostGrade || ''}
                  onChange={(e) =>
                    setEditedMatch((prev) => ({ ...prev, hostGrade: e.target.value }))
                  }
                  placeholder="A, B+, 85, vb."
                />
                {editedMatch.hostGrade && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 8,
                      background: '#fffacd',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.navy,
                      border: '2px solid #ffd700',
                    }}
                  >
                    Dönüşüm: <strong>{convertGrade(editedMatch.hostGrade)}</strong>
                  </div>
                )}
              </FormField>
              <FormField label="Kendi Kurumumuzdaki Karşılık">
                <Input
                  value={editedMatch.homeGrade || 'Muaf'}
                  onChange={(e) =>
                    setEditedMatch((prev) => ({ ...prev, homeGrade: e.target.value }))
                  }
                  placeholder="Muaf, AA, BB, vb."
                />
              </FormField>
            </div>
          )}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          marginTop: 24,
          paddingTop: 20,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <Btn onClick={onClose} variant="secondary">
          İptal
        </Btn>
        <Btn onClick={() => onSave(editedMatch)}>Kaydet</Btn>
      </div>
      {showHomeCatalog && (
        <HomeInstitutionCatalogModal
          activeDepartment={activeDepartment}
          onClose={() => setShowHomeCatalog(false)}
          onSelect={(courses) => {
            addCoursesFromCatalog('home', courses);
            setShowHomeCatalog(false);
          }}
        />
      )}
    </Modal>
  );
};

// ── Course Catalog Modal ──
const CourseCatalogModal = ({ university, onClose, onSelect }) => {
  const r = useResponsive();
  const [selectedCourses, setSelectedCourses] = useState([]);
  const catalog = UNIVERSITY_CATALOGS[university];
  if (!catalog) return null;

  const toggleCourse = (course) => {
    setSelectedCourses((prev) =>
      prev.find((c) => c.code === course.code)
        ? prev.filter((c) => c.code !== course.code)
        : [...prev, { ...course }]
    );
  };
  const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: r.val(8, 16, 20),
      }}
    >
      <div
        style={{
          background: C.card,
          borderRadius: 16,
          maxWidth: 'min(900px, 100vw - 32px)',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ padding: r.val(16, 20, 24), borderBottom: `2px solid ${C.border}` }}>
          <h3
            style={{
              margin: 0,
              fontSize: r.val(18, 21, 24),
              fontWeight: 700,
              color: C.navy,
              fontFamily: "'Playfair Display', serif",
              marginBottom: 8,
            }}
          >
            Ders Katalogu
          </h3>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>{university}</p>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            {catalog.courses.map((course, idx) => {
              const isSelected = selectedCourses.find((c) => c.code === course.code);
              return (
                <div
                  key={idx}
                  onClick={() => toggleCourse(course)}
                  style={{
                    padding: 16,
                    border: `2px solid ${isSelected ? C.green : C.border}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                    background: isSelected ? C.greenLight : 'white',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        border: `2px solid ${isSelected ? C.green : C.border}`,
                        background: isSelected ? C.green : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {isSelected && (
                        <div style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>✓</div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{ fontSize: 15, fontWeight: 600, color: C.navy, marginBottom: 4 }}
                      >
                        {course.name}
                      </div>
                      <div style={{ fontSize: 13, color: C.textMuted, display: 'flex', gap: 16 }}>
                        <span>
                          Kod: <strong>{course.code}</strong>
                        </span>
                        <span>
                          AKTS: <strong>{course.credits}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ padding: 24, borderTop: `2px solid ${C.border}`, background: C.bg }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 14, color: C.textMuted }}>
              Secili: <strong>{selectedCourses.length}</strong> ders
            </div>
            <div style={{ fontSize: 14, color: C.navy, fontWeight: 600 }}>
              Toplam: <strong>{totalCredits}</strong> AKTS
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn onClick={onClose} variant="secondary">
              İptal
            </Btn>
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

// ── Institution Matches Modal (Önceki Eşleştirmelerden Seç) ──
const InstitutionMatchesModal = ({
  hostInstitution,
  allStudents,
  currentStudentId,
  onClose,
  onSelect,
  matchType = 'outgoing',
}) => {
  const r = useResponsive();
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [tripHistory, setTripHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load trip history from DB on mount
  useEffect(() => {
    DB.fetchTripHistory(hostInstitution)
      .then((entries) => {
        setTripHistory(entries);
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
  }, [hostInstitution]);

  // Collect unique matches from all students at the same institution + trip history
  const institutionMatches = [];
  const seen = new Set();

  // First from current students
  allStudents.forEach((s) => {
    if (s.id === currentStudentId) return;
    if (s.hostInstitution !== hostInstitution) return;
    const matches = matchType === 'outgoing' ? s.outgoingMatches || [] : s.returnMatches || [];
    matches.forEach((m) => {
      const key = JSON.stringify({
        home: m.homeCourses.map((c) => c.code).sort(),
        host: m.hostCourses.map((c) => c.code).sort(),
      });
      if (!seen.has(key) && m.homeCourses.length > 0 && m.hostCourses.length > 0) {
        seen.add(key);
        institutionMatches.push({
          ...m,
          fromStudent: `${s.firstName} ${s.lastName}`,
          fromSemester: s.semester,
        });
      }
    });
  });

  // Then from trip history (adds entries not already present from current students)
  tripHistory
    .filter((e) => e.type === matchType)
    .forEach((entry) => {
      const key = JSON.stringify({
        home: (entry.homeCourses || []).map((c) => c.code).sort(),
        host: (entry.hostCourses || []).map((c) => c.code).sort(),
      });
      if (
        !seen.has(key) &&
        (entry.homeCourses || []).length > 0 &&
        (entry.hostCourses || []).length > 0
      ) {
        seen.add(key);
        institutionMatches.push({
          ...entry,
          homeCourses: entry.homeCourses,
          hostCourses: entry.hostCourses,
          hostGrade: entry.hostGrade,
          homeGrade: entry.homeGrade,
          hostGrades: entry.hostGrades,
          homeGrades: entry.homeGrades,
          fromStudent: `${entry.studentName || 'Geçmiş Kayıt'}`,
          fromSemester: entry.semester,
          fromHistory: true,
        });
      }
    });

  const toggleMatch = (match) => {
    const key = JSON.stringify({
      home: match.homeCourses.map((c) => c.code).sort(),
      host: match.hostCourses.map((c) => c.code).sort(),
    });
    setSelectedMatches((prev) => {
      const exists = prev.find(
        (p) =>
          JSON.stringify({
            home: p.homeCourses.map((c) => c.code).sort(),
            host: p.hostCourses.map((c) => c.code).sort(),
          }) === key
      );
      return exists
        ? prev.filter(
            (p) =>
              JSON.stringify({
                home: p.homeCourses.map((c) => c.code).sort(),
                host: p.hostCourses.map((c) => c.code).sort(),
              }) !== key
          )
        : [...prev, match];
    });
  };

  const isSelected = (match) => {
    const key = JSON.stringify({
      home: match.homeCourses.map((c) => c.code).sort(),
      host: match.hostCourses.map((c) => c.code).sort(),
    });
    return selectedMatches.some(
      (p) =>
        JSON.stringify({
          home: p.homeCourses.map((c) => c.code).sort(),
          host: p.hostCourses.map((c) => c.code).sort(),
        }) === key
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        padding: r.val(8, 16, 20),
      }}
    >
      <div
        style={{
          background: C.card,
          borderRadius: 16,
          maxWidth: 'min(950px, 100vw - 32px)',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ padding: r.val(16, 20, 24), borderBottom: `2px solid ${C.border}` }}>
          <h3
            style={{
              margin: 0,
              fontSize: r.val(18, 20, 22),
              fontWeight: 700,
              color: C.navy,
              fontFamily: "'Playfair Display', serif",
              marginBottom: 6,
            }}
          >
            Önceki Eşleştirmelerden Seç
          </h3>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>
            {hostInstitution} için daha önce yapılmış {matchType === 'outgoing' ? 'gidiş' : 'dönüş'}{' '}
            eşleştirmeleri
          </p>
          {institutionMatches.length === 0 && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                background: '#FFF9E6',
                border: '2px dashed #FDB022',
                borderRadius: 10,
                color: C.navy,
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              Bu kurum için daha önce yapılmış eşleştirme bulunamadı.
            </div>
          )}
        </div>
        {institutionMatches.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {institutionMatches.map((match, idx) => {
                const selected = isSelected(match);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleMatch(match)}
                    style={{
                      padding: 16,
                      border: `2px solid ${selected ? C.green : C.border}`,
                      borderRadius: 12,
                      cursor: 'pointer',
                      background: selected ? C.greenLight : 'white',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          border: `2px solid ${selected ? C.green : C.border}`,
                          background: selected ? C.green : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        {selected && (
                          <div style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>✓</div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{ display: 'flex', gap: 16, alignItems: 'start', marginBottom: 8 }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: C.navy,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                marginBottom: 6,
                              }}
                            >
                              Kendi Kurumumuz
                            </div>
                            {match.homeCourses.map((c, ci) => (
                              <div key={ci} style={{ fontSize: 13, marginBottom: 2 }}>
                                <span
                                  style={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: 11,
                                    color: C.textMuted,
                                    fontWeight: 600,
                                  }}
                                >
                                  {c.code}
                                </span>{' '}
                                <span style={{ fontWeight: 500 }}>{c.name}</span>
                                <span style={{ color: C.textMuted, fontSize: 11 }}>
                                  {' '}
                                  ({c.credits} AKTS)
                                </span>
                              </div>
                            ))}
                          </div>
                          <div style={{ color: C.gold, flexShrink: 0, paddingTop: 16 }}>
                            <ArrowRightIcon />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: C.green,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                marginBottom: 6,
                              }}
                            >
                              Karsi Kurum
                            </div>
                            {match.hostCourses.map((c, ci) => (
                              <div key={ci} style={{ fontSize: 13, marginBottom: 2 }}>
                                <span
                                  style={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: 11,
                                    color: C.textMuted,
                                    fontWeight: 600,
                                  }}
                                >
                                  {c.code}
                                </span>{' '}
                                <span style={{ fontWeight: 500 }}>{c.name}</span>
                                <span style={{ color: C.textMuted, fontSize: 11 }}>
                                  {' '}
                                  ({c.credits} AKTS)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: C.textMuted,
                            fontStyle: 'italic',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          Kaynak: {match.fromStudent}
                          {match.fromSemester ? ` (${match.fromSemester})` : ''}
                          {match.fromHistory && (
                            <span
                              style={{
                                padding: '1px 6px',
                                background: '#E3F2FD',
                                color: '#1565C0',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 600,
                                fontStyle: 'normal',
                              }}
                            >
                              Geçmiş Kayıt
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ padding: 24, borderTop: `2px solid ${C.border}`, background: C.bg }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 14, color: C.textMuted }}>
              Seçili: <strong>{selectedMatches.length}</strong> eşleştirme
            </div>
            <div style={{ fontSize: 14, color: C.navy, fontWeight: 600 }}>
              Toplam: <strong>{institutionMatches.length}</strong> mevcut eşleştirme
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn onClick={onClose} variant="secondary">
              İptal
            </Btn>
            <Btn
              onClick={() => selectedMatches.length > 0 && onSelect(selectedMatches)}
              disabled={selectedMatches.length === 0}
            >
              {selectedMatches.length} Eşleştirme Ekle
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Home Institution Catalog Modal (Bölüm derslerinden yükler) ──
const HomeInstitutionCatalogModal = ({ onClose, onSelect, activeDepartment }) => {
  const r = useResponsive();
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [filterYear, setFilterYear] = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');
  const [dbCourses, setDbCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [searchText, setSearchText] = useState('');

  // Bölüm yönetiminden ders listesini yükle (MongoDB API)
  useEffect(() => {
    const loadDeptCourses = async () => {
      setLoadingCourses(true);
      try {
        // Ders kataloğu Ders Yönetimi (sinav_dersler) modülünden gelir.
        // Bölümün tüm kimlik varyantlarıyla çek (eski kimlikli dersler de gelsin).
        let variants = activeDepartment ? [activeDepartment] : [];
        if (activeDepartment && window.deptIdVariants) {
          try {
            variants = await window.deptIdVariants(activeDepartment);
          } catch (_) {
            variants = [activeDepartment];
          }
        }
        const chunks = await Promise.all(
          (variants.length ? variants : [null]).map((v) =>
            window
              .apiRead('sinav_dersler', v ? { where: `departmentId:eq:${v}` } : {})
              .catch(() => [])
          )
        );
        const seen = new Set();
        const deptCourses = [];
        chunks.flat().forEach((c) => {
          const id = c && (c.id || c._docId);
          if (!c || (id && seen.has(id))) return;
          if (id) seen.add(id);
          deptCourses.push(c);
        });

        // Hardcoded katalogdan fallback AKTS (eski veriler için)
        const catalogMap = {};
        HOME_INSTITUTION_CATALOG.courses.forEach((c) => {
          catalogMap[c.code] = c;
        });

        const mapped = deptCourses.map((c) => ({
          code: c.code || '',
          name: c.name || '',
          credits: c.akts || catalogMap[c.code]?.credits || 6,
          year: c.sinif || 0,
          semester: c.donem === 'guz' ? 'Fall' : c.donem === 'bahar' ? 'Spring' : 'Any',
          type: c.sinif === 5 || c.sinif === 0 ? 'Seçmeli' : 'Zorunlu',
        }));
        setDbCourses(mapped);
      } catch (e) {
        console.error('Bölüm dersleri yüklenemedi:', e);
      }
      setLoadingCourses(false);
    };
    loadDeptCourses();
  }, [activeDepartment]);

  const toggleCourse = (course) => {
    setSelectedCourses((prev) =>
      prev.find((c) => c.code === course.code)
        ? prev.filter((c) => c.code !== course.code)
        : [...prev, { code: course.code, name: course.name, credits: course.credits }]
    );
  };

  const filteredCourses = dbCourses.filter((c) => {
    if (filterYear !== 'all' && c.year !== parseInt(filterYear) && c.year !== 0) return false;
    if (filterSemester !== 'all' && c.semester !== filterSemester && c.semester !== 'Any')
      return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      if (!c.code.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);
  const filterStyle = {
    padding: '8px 12px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'inherit',
    backgroundColor: 'white',
    cursor: 'pointer',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        padding: r.val(8, 16, 20),
      }}
    >
      <div
        style={{
          background: C.card,
          borderRadius: 16,
          maxWidth: 'min(900px, 100vw - 32px)',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ padding: r.val(16, 20, 24), borderBottom: '1.5px solid #e2e8f0' }}>
          <h3
            style={{
              margin: 0,
              fontSize: r.val(18, 21, 24),
              fontWeight: 700,
              color: C.navy,
              fontFamily: "'Playfair Display', serif",
              marginBottom: 4,
            }}
          >
            Bölüm Ders Kataloğu
          </h3>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>
            Ders Yönetimi modülünden eklenen dersler
          </p>
          <div
            style={{
              display: 'flex',
              gap: 10,
              marginTop: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
              <svg
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Ders kodu veya adı ara..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              style={filterStyle}
            >
              <option value="all">Tüm Sınıflar</option>
              <option value="1">1. Sınıf</option>
              <option value="2">2. Sınıf</option>
              <option value="3">3. Sınıf</option>
              <option value="4">4. Sınıf</option>
              <option value="5">Seçmeli</option>
            </select>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              style={filterStyle}
            >
              <option value="all">Tüm Dönemler</option>
              <option value="Fall">Güz</option>
              <option value="Spring">Bahar</option>
            </select>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: r.val(16, 20, 24) }}>
          {loadingCourses ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: '3px solid #e2e8f0',
                  borderTopColor: '#2563eb',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 12px',
                }}
              />
              Dersler yükleniyor...
            </div>
          ) : filteredCourses.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                {dbCourses.length === 0 ? 'Bölüm dersi bulunamadı' : 'Filtreyle eşleşen ders yok'}
              </div>
              <div style={{ fontSize: 13 }}>
                {dbCourses.length === 0
                  ? 'Ders Yönetimi modülünden ders ekleyebilirsiniz.'
                  : 'Filtre kriterlerinizi değiştirin.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {filteredCourses.map((course, idx) => {
                const isSelected = selectedCourses.find((c) => c.code === course.code);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleCourse(course)}
                    style={{
                      padding: 14,
                      border: `2px solid ${isSelected ? '#1e3a5f' : '#e2e8f0'}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      background: isSelected ? '#f0f4ff' : 'white',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: `2px solid ${isSelected ? '#1e3a5f' : '#d1d5db'}`,
                          background: isSelected ? '#1e3a5f' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && (
                          <div style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>✓</div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#475569',
                            }}
                          >
                            {course.code}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>
                            {course.name}
                          </span>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 600,
                              background: course.type === 'Zorunlu' ? '#DBEAFE' : '#FEF3C7',
                              color: course.type === 'Zorunlu' ? '#1E40AF' : '#92400E',
                            }}
                          >
                            {course.type}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#94a3b8',
                            marginTop: 3,
                            display: 'flex',
                            gap: 12,
                          }}
                        >
                          <span>{course.credits} AKTS</span>
                          {course.year > 0 && course.year < 5 && <span>{course.year}. Sınıf</span>}
                          {course.semester !== 'Any' && (
                            <span>{course.semester === 'Fall' ? 'Güz' : 'Bahar'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div
          style={{
            padding: r.val(16, 20, 24),
            borderTop: '1.5px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 14, color: C.textMuted }}>
              Seçili: <strong>{selectedCourses.length}</strong> ders
            </div>
            <div style={{ fontSize: 14, color: C.navy, fontWeight: 600 }}>
              Toplam: <strong>{totalCredits}</strong> AKTS
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn onClick={onClose} variant="secondary">
              İptal
            </Btn>
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

// ── Trip History Modal (Eşleştirme Geçmişi) ──
const TripHistoryModal = ({
  onClose,
  universities,
  isReadOnly = false,
  activeDepartment,
  currentUser,
}) => {
  const r = useResponsive();
  const [selectedUni, setSelectedUni] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [uniSearch, setUniSearch] = useState('');
  const [extraUnis, setExtraUnis] = useState([]);

  // BÖLÜM BAZLI ERİŞİM: Erasmus eşleştirme geçmişi BÖLÜME özeldir. Her bölüm
  // yalnızca KENDİ kayıtlarını görür — aynı fakültedeki başka bölüm (ör.
  // Bilgisayar Müh. ile Elektrik-Elektronik) birbirinin geçmişini GÖREMEZ.
  // (Admin dahil herkes aktif bölüm bağlamıyla sınırlıdır.)
  // Aktif bölümün tüm kimlik varyantları (eski kimlikli kayıtlar da eşleşsin)
  const [deptVariants, setDeptVariants] = useState(() =>
    activeDepartment ? [String(activeDepartment)] : []
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let vs = activeDepartment ? [String(activeDepartment)] : [];
      if (activeDepartment && window.deptIdVariants) {
        try {
          vs = (await window.deptIdVariants(activeDepartment)).map(String);
        } catch (_) {
          vs = [String(activeDepartment)];
        }
      }
      if (!cancelled) setDeptVariants(vs);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeDepartment]);
  const deptVariantSet = React.useMemo(() => new Set(deptVariants.map(String)), [deptVariants]);

  // Üniversite listesi BÖLÜMÜN eşleştirme geçmişinden (trip_history) beslenir.
  // Böylece hem öğrenci hem akademisyen AYNI listeyi görür (öğrenci artık tüm
  // öğrenci kayıtlarını okuyamadığından 'students'a dayalı liste onda eksik
  // çıkıyordu) hem de her bölüm KENDİ geçmişini görür (bölüme göre süzülür).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const th = await window.apiRead(
          'trip_history',
          activeDepartment ? { where: `departmentId:eq:${activeDepartment}` } : {}
        );
        if (cancelled) return;
        const set = new Set();
        (th || []).forEach((h) => {
          if (h.hostInstitution) set.add(h.hostInstitution);
        });
        setExtraUnis(Array.from(set));
      } catch (e) {
        console.warn('Trip history kurum listesi yüklenemedi:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeDepartment]);

  const uniList = Array.from(
    new Set([...Object.keys(universities || UNIVERSITY_CATALOGS), ...extraUnis])
  ).sort((a, b) => a.localeCompare(b, 'tr'));
  const filteredUniList = uniSearch
    ? uniList.filter((u) => u.toLowerCase().includes(uniSearch.toLowerCase()))
    : uniList;

  const loadHistory = async (uni) => {
    if (selectedUni === uni) return;
    setSelectedUni(uni);
    setExpandedIdx(null);
    setFilterType('all');
    setSearchText('');
    if (!uni) {
      setHistory([]);
      return;
    }
    setLoading(true);
    try {
      // Kurumun TÜM kayıtları çekilir; FAKÜLTE bazlı süzme istemci tarafında
      // (filteredHistory içinde) yapılır. Böylece çekirdek bölümlerde eksik
      // olan facultyId, bölüm→fakülte haritası ile telafi edilir.
      const entries = await DB.fetchTripHistory(uni);
      setHistory(entries);
    } catch (e) {
      console.error('Trip history load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((h) => {
    // BÖLÜM BAZLI İZOLASYON: eşleştirme geçmişi HANGİ BÖLÜM bağlamında
    // açıldıysa yalnız o bölümün (tüm kimlik varyantları) kayıtları görünür.
    // Üniversite yetkilisi de dahil HERKES için geçerli — Elektrik bağlamında
    // Bilgisayar kaydı görünmez (admin bölüm değiştirerek diğerine bakar).
    // Bölümü çözülemeyen (departmentId'siz) kayıt hiçbir bölüme gösterilmez.
    if (activeDepartment) {
      if (!(h.departmentId && deptVariantSet.has(String(h.departmentId)))) return false;
    }
    if (filterType !== 'all' && h.type !== filterType) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      const homeCodes = (h.homeCourses || [])
        .map((c) => (c.code + ' ' + c.name).toLowerCase())
        .join(' ');
      const hostCodes = (h.hostCourses || [])
        .map((c) => (c.code + ' ' + c.name).toLowerCase())
        .join(' ');
      if (
        !homeCodes.includes(q) &&
        !hostCodes.includes(q) &&
        !(h.studentName || '').toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const grouped = [];
  const seen = new Set();
  filteredHistory.forEach((entry) => {
    const key = JSON.stringify({
      type: entry.type,
      home: (entry.homeCourses || []).map((c) => c.code).sort(),
      host: (entry.hostCourses || []).map((c) => c.code).sort(),
    });
    if (!seen.has(key)) {
      seen.add(key);
      const students = filteredHistory
        .filter(
          (e) =>
            JSON.stringify({
              type: e.type,
              home: (e.homeCourses || []).map((c) => c.code).sort(),
              host: (e.hostCourses || []).map((c) => c.code).sort(),
            }) === key
        )
        .map((e) => ({ name: e.studentName, semester: e.semester, number: e.studentNumber }));
      const uniqueStudents = [];
      const seenStudents = new Set();
      students.forEach((s) => {
        if (!seenStudents.has(s.number)) {
          seenStudents.add(s.number);
          uniqueStudents.push(s);
        }
      });
      grouped.push({ ...entry, usedBy: uniqueStudents });
    }
  });

  const handleDelete = async (entryId) => {
    if (!confirm('Bu geçmiş kaydını silmek istediğinizden emin misiniz?')) return;
    try {
      await DB.deleteTripHistoryEntry(entryId);
      setHistory((prev) => prev.filter((h) => h.id !== entryId));
    } catch (e) {
      alert('Silme sırasında hata oluştu.');
    }
  };

  const outgoingCount = grouped.filter((e) => e.type === 'outgoing').length;
  const returnCount = grouped.filter((e) => e.type === 'return').length;
  const totalAkts = grouped.reduce(
    (sum, e) => sum + (e.homeCourses || []).reduce((s, c) => s + (c.credits || 0), 0),
    0
  );

  // Full-screen overlay instead of Modal
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'flex-end',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 'min(1100px, 100vw)',
          height: '100vh',
          background: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
          animation: 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <style>{`
          @keyframes slideInRight { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes spin { to { transform: rotate(360deg); } }
          .th-uni-item:hover { background: #EFF6FF !important; }
          .th-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important; }
        `}</style>

        {/* ── Top Header ── */}
        <div
          style={{
            padding: '0 28px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'white',
            borderBottom: '1px solid #E2E8F0',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.navy }}>Eşleştirme Geçmişi</div>
            <div style={{ fontSize: 11.5, color: C.textMuted }}>
              Bu bölümde geçmiş dönemlerdeki ders eşleştirmeleri
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F1F5F9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* ── LEFT: University Sidebar ── */}
          <div
            style={{
              width: r.isMobile ? '100%' : 260,
              flexShrink: 0,
              display: r.isMobile && selectedUni ? 'none' : 'flex',
              flexDirection: 'column',
              background: 'white',
              borderRight: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '14px 14px 8px' }}>
              <div style={{ position: 'relative' }}>
                <svg
                  style={{
                    position: 'absolute',
                    left: 9,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  value={uniSearch}
                  onChange={(e) => setUniSearch(e.target.value)}
                  placeholder="Üniversite ara..."
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 28px',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#F8FAFC',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#94A3B8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginTop: 12,
                  marginBottom: 4,
                  paddingLeft: 2,
                }}
              >
                {filteredUniList.length} üniversite
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredUniList.map((uni) => {
                const isActive = selectedUni === uni;
                return (
                  <div
                    key={uni}
                    className="th-uni-item"
                    onClick={() => loadHistory(uni)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      background: isActive ? '#EFF6FF' : 'transparent',
                      borderLeft: `3px solid ${isActive ? '#2563EB' : 'transparent'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#1D4ED8' : '#374151',
                        lineHeight: 1.4,
                      }}
                    >
                      {uni}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: Content ── */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            {/* No selection */}
            {!selectedUni && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  color: '#94A3B8',
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: '#F1F5F9',
                    border: '2px dashed #CBD5E1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#CBD5E1"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#475569' }}>
                  Soldaki listeden bir üniversite seçin
                </div>
                <div style={{ fontSize: 13 }}>Geçmiş eşleştirmeler burada görünecek</div>
              </div>
            )}

            {/* Loading */}
            {selectedUni && loading && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  color: '#94A3B8',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    border: '3px solid #E2E8F0',
                    borderTopColor: '#2563EB',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <div style={{ fontSize: 13, fontWeight: 500 }}>Kayıtlar yükleniyor...</div>
              </div>
            )}

            {/* Content */}
            {selectedUni && !loading && (
              <div
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                {/* Sub-header: stats + filters */}
                <div
                  style={{
                    padding: '14px 20px 0',
                    flexShrink: 0,
                    background: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                  }}
                >
                  {/* University name */}
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#0F172A',
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    {selectedUni}
                  </div>

                  {grouped.length > 0 && (
                    <>
                      {/* Stats strip */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        {[
                          {
                            v: grouped.length,
                            label: 'Benzersiz Eşleştirme',
                            color: '#1D4ED8',
                            bg: '#EFF6FF',
                          },
                          { v: outgoingCount, label: 'Gidiş', color: '#059669', bg: '#ECFDF5' },
                          { v: returnCount, label: 'Dönüş', color: '#D97706', bg: '#FFFBEB' },
                          { v: totalAkts, label: 'AKTS', color: '#7C3AED', bg: '#F5F3FF' },
                        ].map((s, i) => (
                          <div
                            key={i}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 8,
                              background: s.bg,
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: 5,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 18,
                                fontWeight: 800,
                                color: s.color,
                                lineHeight: 1,
                              }}
                            >
                              {s.v}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: s.color,
                                opacity: 0.7,
                              }}
                            >
                              {s.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Search + filter chips */}
                      <div
                        style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 12 }}
                      >
                        <div style={{ flex: 1, position: 'relative' }}>
                          <svg
                            style={{
                              position: 'absolute',
                              left: 9,
                              top: '50%',
                              transform: 'translateY(-50%)',
                            }}
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#94A3B8"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          <input
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Ders kodu veya isim ara..."
                            style={{
                              width: '100%',
                              padding: '7px 10px 7px 27px',
                              border: '1.5px solid #E2E8F0',
                              borderRadius: 8,
                              fontSize: 12,
                              fontFamily: 'inherit',
                              outline: 'none',
                              boxSizing: 'border-box',
                              background: 'white',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[
                            { id: 'all', label: 'Tümü' },
                            { id: 'outgoing', label: '🛫 Gidiş' },
                            { id: 'return', label: '🛬 Dönüş' },
                          ].map((f) => (
                            <button
                              key={f.id}
                              onClick={() => setFilterType(f.id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 7,
                                border: `1.5px solid ${filterType === f.id ? '#2563EB' : '#E2E8F0'}`,
                                background: filterType === f.id ? '#2563EB' : 'white',
                                color: filterType === f.id ? 'white' : '#64748B',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                transition: 'all 0.15s',
                              }}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Match list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
                  {grouped.length === 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        gap: 10,
                        color: '#94A3B8',
                      }}
                    >
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          background: '#FEF9C3',
                          border: '2px solid #FDE68A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#D97706"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>
                        {searchText ? `"${searchText}" bulunamadı` : 'Bu üniversite için kayıt yok'}
                      </div>
                      <div style={{ fontSize: 12 }}>
                        Eşleştirmeler kaydedildikçe buraya eklenecek
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {grouped.map((entry, idx) => {
                        const isExpanded = expandedIdx === idx;
                        const isOut = entry.type === 'outgoing';
                        const accent = isOut
                          ? { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', light: '#D1FAE5' }
                          : {
                              color: '#D97706',
                              bg: '#FFFBEB',
                              border: '#FCD34D',
                              light: '#FEF3C7',
                            };
                        const homeTotalAkts = (entry.homeCourses || []).reduce(
                          (s, c) => s + (c.credits || 0),
                          0
                        );
                        return (
                          <div
                            key={idx}
                            className="th-card"
                            style={{
                              background: 'white',
                              border: `1.5px solid ${isExpanded ? accent.border : '#E2E8F0'}`,
                              borderRadius: 12,
                              overflow: 'hidden',
                              transition: 'all 0.18s',
                              boxShadow: isExpanded
                                ? `0 4px 24px ${accent.color}14`
                                : '0 1px 3px rgba(0,0,0,0.04)',
                            }}
                          >
                            {/* Row header */}
                            <div
                              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                              style={{
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                cursor: 'pointer',
                                background: isExpanded ? accent.bg : 'white',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={(e) => {
                                if (!isExpanded) e.currentTarget.style.background = '#F8FAFC';
                              }}
                              onMouseLeave={(e) => {
                                if (!isExpanded) e.currentTarget.style.background = 'white';
                              }}
                            >
                              {/* Left accent bar */}
                              <div
                                style={{
                                  width: 3,
                                  height: 32,
                                  borderRadius: 2,
                                  background: accent.color,
                                  flexShrink: 0,
                                }}
                              />

                              {/* Type + courses preview */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    marginBottom: 3,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      letterSpacing: '0.06em',
                                      textTransform: 'uppercase',
                                      color: accent.color,
                                      background: accent.bg,
                                      padding: '2px 8px',
                                      borderRadius: 4,
                                      border: `1px solid ${accent.border}40`,
                                    }}
                                  >
                                    {isOut ? '🛫 Gidiş' : '🛬 Dönüş'}
                                  </span>
                                  <span style={{ fontSize: 11, color: '#6B7280' }}>
                                    {(entry.homeCourses || []).length} →{' '}
                                    {(entry.hostCourses || []).length} ders
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {(entry.homeCourses || []).map((c, ci) => (
                                    <span
                                      key={ci}
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: '#1E40AF',
                                        background: '#EFF6FF',
                                        padding: '1px 7px',
                                        borderRadius: 4,
                                        border: '1px solid #DBEAFE',
                                      }}
                                    >
                                      {c.code || c.name?.substring(0, 12)}
                                    </span>
                                  ))}
                                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>→</span>
                                  {(entry.hostCourses || []).map((c, ci) => (
                                    <span
                                      key={ci}
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: accent.color,
                                        background: accent.bg,
                                        padding: '1px 7px',
                                        borderRadius: 4,
                                        border: `1px solid ${accent.border}60`,
                                      }}
                                    >
                                      {c.code || c.name?.substring(0, 12)}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Right info */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  flexShrink: 0,
                                }}
                              >
                                <div style={{ textAlign: 'right' }}>
                                  <div
                                    style={{ fontSize: 13, fontWeight: 700, color: accent.color }}
                                  >
                                    {homeTotalAkts} AKTS
                                  </div>
                                  <div style={{ fontSize: 10, color: '#9CA3AF' }}>
                                    {(entry.usedBy || []).length} öğrenci
                                  </div>
                                </div>
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#CBD5E1"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{
                                    transition: 'transform 0.2s',
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  }}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </div>
                            </div>

                            {/* Expanded body */}
                            {isExpanded && (
                              <div
                                style={{
                                  padding: '0 16px 16px',
                                  borderTop: `1px solid ${accent.border}40`,
                                }}
                              >
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: r.isMobile ? '1fr' : '1fr 36px 1fr',
                                    gap: 10,
                                    paddingTop: 14,
                                  }}
                                >
                                  {/* ÇAKÜ */}
                                  <div>
                                    <div
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: '#475569',
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        marginBottom: 7,
                                      }}
                                    >
                                      ÇAKÜ Dersleri
                                    </div>
                                    {(entry.homeCourses || []).map((c, ci) => (
                                      <div
                                        key={ci}
                                        style={{
                                          marginBottom: 4,
                                          padding: '8px 10px',
                                          background: '#F0F9FF',
                                          borderRadius: 8,
                                          borderLeft: '3px solid #2563EB',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <div>
                                          <span
                                            style={{
                                              fontFamily: 'monospace',
                                              fontSize: 10,
                                              fontWeight: 700,
                                              color: '#1D4ED8',
                                              marginRight: 6,
                                            }}
                                          >
                                            {c.code}
                                          </span>
                                          <span style={{ fontSize: 11, color: '#1E40AF' }}>
                                            {c.name}
                                          </span>
                                        </div>
                                        <span
                                          style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            color: '#2563EB',
                                            background: 'white',
                                            padding: '1px 6px',
                                            borderRadius: 4,
                                            border: '1px solid #DBEAFE',
                                            marginLeft: 8,
                                            flexShrink: 0,
                                          }}
                                        >
                                          {c.credits} AKTS
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Arrow */}
                                  {!r.isMobile && (
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingTop: 24,
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: 30,
                                          height: 30,
                                          borderRadius: '50%',
                                          background: accent.bg,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          border: '1px solid #E2E8F0',
                                        }}
                                      >
                                        <svg
                                          width="12"
                                          height="12"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="#6B7280"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <line x1="5" y1="12" x2="19" y2="12" />
                                          <polyline points="12 5 19 12 12 19" />
                                        </svg>
                                      </div>
                                    </div>
                                  )}

                                  {/* Host */}
                                  <div>
                                    <div
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: accent.color,
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        marginBottom: 7,
                                      }}
                                    >
                                      Karşı Kurum Dersleri
                                    </div>
                                    {(entry.hostCourses || []).map((c, ci) => (
                                      <div
                                        key={ci}
                                        style={{
                                          marginBottom: 4,
                                          padding: '8px 10px',
                                          background: accent.bg,
                                          borderRadius: 8,
                                          borderLeft: `3px solid ${accent.color}`,
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                          }}
                                        >
                                          <div>
                                            <span
                                              style={{
                                                fontFamily: 'monospace',
                                                fontSize: 10,
                                                fontWeight: 700,
                                                color: accent.color,
                                                marginRight: 6,
                                              }}
                                            >
                                              {c.code}
                                            </span>
                                            <span style={{ fontSize: 11, color: accent.color }}>
                                              {c.name}
                                            </span>
                                          </div>
                                          <span
                                            style={{
                                              fontSize: 10,
                                              fontWeight: 700,
                                              color: accent.color,
                                              background: 'rgba(255,255,255,0.7)',
                                              padding: '1px 6px',
                                              borderRadius: 4,
                                              border: `1px solid ${accent.border}`,
                                              marginLeft: 8,
                                              flexShrink: 0,
                                            }}
                                          >
                                            {c.credits} AKTS
                                          </span>
                                        </div>
                                        {entry.type === 'return' &&
                                          (entry.hostGrades?.[ci] || entry.hostGrade) && (
                                            <div
                                              style={{
                                                marginTop: 4,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                              }}
                                            >
                                              <span
                                                style={{
                                                  fontSize: 10,
                                                  color: accent.color,
                                                  opacity: 0.7,
                                                }}
                                              >
                                                Not:
                                              </span>
                                              <span
                                                style={{
                                                  fontSize: 11,
                                                  fontWeight: 700,
                                                  color: accent.color,
                                                  background: 'rgba(255,255,255,0.8)',
                                                  padding: '0 5px',
                                                  borderRadius: 3,
                                                }}
                                              >
                                                {entry.hostGrades?.[ci] || entry.hostGrade}
                                              </span>
                                              <svg
                                                width="10"
                                                height="10"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke={accent.color}
                                                strokeWidth="2.5"
                                              >
                                                <line x1="5" y1="12" x2="19" y2="12" />
                                                <polyline points="12 5 19 12 12 19" />
                                              </svg>
                                              <span
                                                style={{
                                                  fontSize: 11,
                                                  fontWeight: 700,
                                                  color: '#1E40AF',
                                                  background: 'rgba(255,255,255,0.8)',
                                                  padding: '0 5px',
                                                  borderRadius: 3,
                                                }}
                                              >
                                                {entry.homeGrades?.[ci] ||
                                                  entry.homeGrade ||
                                                  'Muaf'}
                                              </span>
                                            </div>
                                          )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Students */}
                                {(entry.usedBy || []).length > 0 && (
                                  <div
                                    style={{
                                      marginTop: 10,
                                      padding: '10px 12px',
                                      background: '#F8FAFC',
                                      borderRadius: 8,
                                      border: '1px solid #E2E8F0',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: '#94A3B8',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        marginBottom: 6,
                                      }}
                                    >
                                      Kullanan öğrenciler
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                      {(entry.usedBy || []).map((s, si) => (
                                        <span
                                          key={si}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 5,
                                            padding: '3px 10px 3px 4px',
                                            background: 'white',
                                            borderRadius: 16,
                                            border: '1px solid #E2E8F0',
                                            fontSize: 11,
                                            color: '#374151',
                                            fontWeight: 500,
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: 18,
                                              height: 18,
                                              borderRadius: '50%',
                                              background: C.navy,
                                              color: 'white',
                                              fontSize: 9,
                                              fontWeight: 700,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                            }}
                                          >
                                            {(s.name || '?')[0]}
                                          </div>
                                          {s.name}
                                          {s.semester && (
                                            <span style={{ color: '#9CA3AF', fontSize: 10 }}>
                                              · {s.semester}
                                            </span>
                                          )}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {!isReadOnly && (
                                  <div
                                    style={{
                                      marginTop: 10,
                                      display: 'flex',
                                      justifyContent: 'flex-end',
                                    }}
                                  >
                                    <button
                                      onClick={() => handleDelete(entry.id)}
                                      style={{
                                        padding: '5px 12px',
                                        borderRadius: 7,
                                        border: '1px solid #FCA5A5',
                                        background: '#FEF2F2',
                                        cursor: 'pointer',
                                        color: '#DC2626',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        transition: 'all 0.15s',
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#FEE2E2';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#FEF2F2';
                                      }}
                                    >
                                      <TrashIcon /> Kaydı Sil
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Student Detail Modal ──
const StudentDetailModal = ({
  student,
  onClose,
  onSave,
  readOnly = false,
  allStudents = [],
  allUniversities = {},
  onAddUniversity,
  activeDepartment,
  currentUser,
}) => {
  const r = useResponsive();
  const [editedStudent, setEditedStudent] = useState({
    ...student,
    outgoingMatches: student.outgoingMatches || [],
    returnMatches: student.returnMatches || [],
  });
  // Akademisyen (öğrenci olmayan) eşleştirmeyi onaylayabilir/reddedebilir.
  const canApprove = !!currentUser && currentUser.role !== 'student';
  const reviewMatch = (matchType, matchId, decision, reason) => {
    const key = matchType === 'outgoing' ? 'outgoingMatches' : 'returnMatches';
    setEditedStudent((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((m) =>
        m.id === matchId
          ? {
              ...m,
              status: decision,
              rejectReason: decision === 'rejected' ? reason || '' : '',
              reviewedBy: currentUser?.name || '',
              reviewedAt: new Date().toISOString(),
            }
          : m
      ),
    }));
  };
  // Toplu onay/red: tüm 'pending' eşleştirmelere uygular.
  const bulkReview = (decision, reason) => {
    const apply = (arr) =>
      (arr || []).map((m) =>
        (m.status || 'approved') === 'pending'
          ? {
              ...m,
              status: decision,
              rejectReason: decision === 'rejected' ? reason || '' : '',
              reviewedBy: currentUser?.name || '',
              reviewedAt: new Date().toISOString(),
            }
          : m
      );
    setEditedStudent((prev) => ({
      ...prev,
      outgoingMatches: apply(prev.outgoingMatches),
      returnMatches: apply(prev.returnMatches),
    }));
  };
  // Red sebebi modalı: { scope:'single'|'all', matchType, matchId }
  const [rejectCtx, setRejectCtx] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const openReject = (scope, matchType, matchId) => {
    setRejectReason('');
    setRejectCtx({ scope, matchType, matchId });
  };
  const confirmReject = () => {
    if (!rejectCtx) return;
    if (rejectCtx.scope === 'all') bulkReview('rejected', rejectReason.trim());
    else reviewMatch(rejectCtx.matchType, rejectCtx.matchId, 'rejected', rejectReason.trim());
    setRejectCtx(null);
    setRejectReason('');
  };
  // Bekleyen eşleştirme sayısı (toolbar için)
  const pendingCount = [
    ...(editedStudent.outgoingMatches || []),
    ...(editedStudent.returnMatches || []),
  ].filter((m) => (m.status || 'approved') === 'pending').length;
  const [activeTab, setActiveTab] = useState('outgoing');
  const [editingMatch, setEditingMatch] = useState(null);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showInstitutionMatches, setShowInstitutionMatches] = useState(false);
  const [showNewUniForm, setShowNewUniForm] = useState(false);
  const [newUniName, setNewUniName] = useState('');
  const [newUniCountry, setNewUniCountry] = useState('');
  const [uniSearchTerm, setUniSearchTerm] = useState('');
  const [showUniDropdown, setShowUniDropdown] = useState(false);

  const uniList = Object.keys(allUniversities);
  const filteredUniList = uniSearchTerm
    ? uniList.filter((u) => u.toLowerCase().includes(uniSearchTerm.toLowerCase()))
    : uniList;

  const handleSelectUniversity = (uni) => {
    updateStudent('hostInstitution', uni);
    if (allUniversities[uni]) updateStudent('hostCountry', allUniversities[uni].country);
    setUniSearchTerm('');
    setShowUniDropdown(false);
  };

  const handleSaveNewUniversity = () => {
    if (!newUniName.trim() || !newUniCountry.trim()) return;
    if (onAddUniversity) onAddUniversity(newUniName.trim(), newUniCountry.trim());
    updateStudent('hostInstitution', newUniName.trim());
    updateStudent('hostCountry', newUniCountry.trim());
    setShowNewUniForm(false);
    setNewUniName('');
    setNewUniCountry('');
  };

  const generateSemesters = () => {
    const semesters = [];
    for (let year = 2024; year <= 2030; year++) {
      semesters.push(`Spring ${year}`);
      semesters.push(`Fall ${year}`);
    }
    return semesters;
  };
  const semesters = generateSemesters();

  const updateStudent = (field, value) => setEditedStudent((prev) => ({ ...prev, [field]: value }));

  const addMatch = (type) => {
    const newMatch = {
      id: `${type}${Date.now()}`,
      homeCourses: [],
      hostCourses: [],
      ...(type === 'return'
        ? { hostGrade: '', homeGrade: 'Muaf', hostGrades: {}, homeGrades: {} }
        : {}),
    };
    setEditedStudent((prev) => ({
      ...prev,
      [`${type}Matches`]: [...prev[`${type}Matches`], newMatch],
    }));
    setEditingMatch({ type, match: newMatch });
  };

  const copyFromOutgoing = (outgoingMatch) => {
    const hostGrades = {};
    const homeGrades = {};
    outgoingMatch.hostCourses.forEach((_, idx) => {
      hostGrades[idx] = 'A';
      homeGrades[idx] = 'Muaf';
    });
    const newReturnMatch = {
      id: `return${Date.now()}`,
      homeCourses: JSON.parse(JSON.stringify(outgoingMatch.homeCourses)),
      hostCourses: JSON.parse(JSON.stringify(outgoingMatch.hostCourses)),
      hostGrade: 'A',
      homeGrade: 'Muaf',
      hostGrades,
      homeGrades,
    };
    setEditedStudent((prev) => ({
      ...prev,
      returnMatches: [...prev.returnMatches, newReturnMatch],
    }));
  };

  const deleteMatch = (type, id) =>
    setEditedStudent((prev) => ({
      ...prev,
      [`${type}Matches`]: prev[`${type}Matches`].filter((m) => m.id !== id),
    }));

  const exportStudentData = () => {
    const data = {
      'Öğrenci Bilgileri': {
        'Öğrenci Numarası': editedStudent.studentNumber,
        Ad: editedStudent.firstName,
        Soyad: editedStudent.lastName,
        'Karşı Kurum': editedStudent.hostInstitution,
        Fakülte: editedStudent.hostFaculty || '',
        Bölüm: editedStudent.hostDepartment || '',
        Ülke: editedStudent.hostCountry,
      },
      'Gidiş Eşleştirmeleri': editedStudent.outgoingMatches.map((m) => ({
        'Kendi Derslerimiz': m.homeCourses
          .map((c) => `${c.code} - ${c.name} (${c.credits} AKTS)`)
          .join(' | '),
        'Karşı Kurum Dersleri': m.hostCourses
          .map((c) => `${c.code} - ${c.name} (${c.credits} AKTS)`)
          .join(' | '),
      })),
      'Dönüş Eşleştirmeleri': editedStudent.returnMatches.map((m) => ({
        'Kendi Derslerimiz': m.homeCourses
          .map((c) => `${c.code} - ${c.name} (${c.credits} AKTS)`)
          .join(' | '),
        'Karşı Kurum Dersleri': m.hostCourses
          .map(
            (c, idx) =>
              `${c.code} - ${c.name} (${c.credits} AKTS) [Not: ${m.hostGrades?.[idx] || m.hostGrade || ''}]`
          )
          .join(' | '),
        Notlar: m.hostGrades || { 0: m.hostGrade || '' },
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editedStudent.studentNumber}_${editedStudent.lastName}_Learning_Agreement.json`;
    a.click();
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`${dispAd(student.firstName)} ${dispSoyad(student.lastName)} - Öğrenim Anlaşması`}
      width="min(1000px, 100vw - 32px)"
    >
      {readOnly && (
        <div
          style={{
            padding: 16,
            background: '#FFF3CD',
            border: '2px solid #FFC107',
            borderRadius: 12,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 24 }}>🔒</div>
          <div>
            <div style={{ fontWeight: 600, color: '#856404', marginBottom: 4 }}>
              Sadece Görüntüleme Modu
            </div>
            <div style={{ fontSize: 13, color: '#856404' }}>
              Bu öğrencinin bilgilerini sadece görüntüleyebilirsiniz.
            </div>
          </div>
        </div>
      )}
      {/* ── Öğrenci Bilgileri ── */}
      <div style={eSection}>
        <div style={eSectionTitle}>Öğrenci Bilgileri</div>
        <div
          className="responsive-grid-4"
          style={{
            display: 'grid',
            gridTemplateColumns: r.val('1fr', 'repeat(2, 1fr)', 'repeat(3, 1fr)'),
            gap: r.val(12, 14, 16),
          }}
        >
          <FormField label="Öğrenci Numarası">
            <Input
              value={editedStudent.studentNumber}
              onChange={(e) => updateStudent('studentNumber', e.target.value)}
              disabled={readOnly}
            />
          </FormField>
          <FormField label="Ad">
            <Input
              value={readOnly ? dispAd(editedStudent.firstName) : editedStudent.firstName}
              onChange={(e) => updateStudent('firstName', e.target.value)}
              onBlur={(e) => updateStudent('firstName', titleCaseTr(e.target.value))}
              disabled={readOnly}
            />
          </FormField>
          <FormField label="Soyad">
            <Input
              value={readOnly ? dispSoyad(editedStudent.lastName) : editedStudent.lastName}
              onChange={(e) => updateStudent('lastName', e.target.value)}
              onBlur={(e) => updateStudent('lastName', upperTr(e.target.value))}
              disabled={readOnly}
            />
          </FormField>
        </div>
      </div>

      {/* ── Karşı Kurum Bilgileri ── */}
      <div style={eSection}>
        <div style={eSectionTitle}>Karşı Kurum Bilgileri</div>
        <div
          className="responsive-grid-4"
          style={{
            display: 'grid',
            gridTemplateColumns: r.val('1fr', 'repeat(2, 1fr)', 'repeat(3, 1fr)'),
            gap: r.val(12, 14, 16),
          }}
        >
          {/* Üniversite Seçimi - Aranabilir Dropdown */}
          <div style={{ gridColumn: r.isMobile ? '1' : '1 / -1' }}>
            <FormField label="Karşı Kurum (Üniversite)">
              {readOnly ? (
                <Input value={editedStudent.hostInstitution || ''} disabled />
              ) : showNewUniForm ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 2, minWidth: 200 }}>
                      <input
                        value={newUniName}
                        onChange={(e) => setNewUniName(e.target.value)}
                        placeholder="Üniversite adı"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          border: '2px solid #3b82f6',
                          borderRadius: 8,
                          fontSize: 14,
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <input
                        value={newUniCountry}
                        onChange={(e) => setNewUniCountry(e.target.value)}
                        placeholder="Ülke"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          border: '2px solid #3b82f6',
                          borderRadius: 8,
                          fontSize: 14,
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleSaveNewUniversity}
                      disabled={!newUniName.trim() || !newUniCountry.trim()}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background:
                          newUniName.trim() && newUniCountry.trim() ? '#2563eb' : '#94a3b8',
                        color: 'white',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor:
                          newUniName.trim() && newUniCountry.trim() ? 'pointer' : 'not-allowed',
                        fontFamily: 'inherit',
                      }}
                    >
                      Kaydet ve Seç
                    </button>
                    <button
                      onClick={() => setShowNewUniForm(false)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        background: 'white',
                        color: '#6b7280',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        value={
                          showUniDropdown ? uniSearchTerm : editedStudent.hostInstitution || ''
                        }
                        onChange={(e) => {
                          setUniSearchTerm(e.target.value);
                          setShowUniDropdown(true);
                        }}
                        onFocus={() => setShowUniDropdown(true)}
                        placeholder="Üniversite arayın veya seçin..."
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 36px',
                          border: `1.5px solid ${showUniDropdown ? '#3b82f6' : '#d1d5db'}`,
                          borderRadius: 8,
                          fontSize: 14,
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'border-color 0.15s',
                        }}
                      />
                      <svg
                        style={{
                          position: 'absolute',
                          left: 11,
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                    <button
                      onClick={() => setShowNewUniForm(true)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1.5px solid #d1d5db',
                        background: 'white',
                        color: '#374151',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.color = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#d1d5db';
                        e.currentTarget.style.color = '#374151';
                      }}
                    >
                      <PlusIcon /> Yeni Ekle
                    </button>
                  </div>
                  {showUniDropdown && (
                    <>
                      <div
                        style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                        onClick={() => {
                          setShowUniDropdown(false);
                          setUniSearchTerm('');
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          right: 0,
                          maxHeight: 240,
                          overflowY: 'auto',
                          background: 'white',
                          border: '1.5px solid #d1d5db',
                          borderRadius: 10,
                          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                          zIndex: 1000,
                        }}
                      >
                        {filteredUniList.length === 0 ? (
                          <div
                            style={{
                              padding: '16px 14px',
                              color: '#94a3b8',
                              fontSize: 13,
                              textAlign: 'center',
                            }}
                          >
                            Sonuç bulunamadı.
                            <button
                              onClick={() => {
                                setShowNewUniForm(true);
                                setNewUniName(uniSearchTerm);
                                setShowUniDropdown(false);
                              }}
                              style={{
                                display: 'block',
                                margin: '8px auto 0',
                                padding: '6px 14px',
                                borderRadius: 6,
                                border: '1px solid #3b82f6',
                                background: '#eff6ff',
                                color: '#2563eb',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                              }}
                            >
                              "{uniSearchTerm}" olarak yeni ekle
                            </button>
                          </div>
                        ) : (
                          filteredUniList.map((uni) => (
                            <div
                              key={uni}
                              onClick={() => handleSelectUniversity(uni)}
                              style={{
                                padding: '10px 14px',
                                cursor: 'pointer',
                                fontSize: 13,
                                color:
                                  editedStudent.hostInstitution === uni ? '#2563eb' : '#374151',
                                fontWeight: editedStudent.hostInstitution === uni ? 600 : 400,
                                background:
                                  editedStudent.hostInstitution === uni ? '#eff6ff' : 'white',
                                borderBottom: '1px solid #f1f5f9',
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={(e) => {
                                if (editedStudent.hostInstitution !== uni)
                                  e.currentTarget.style.background = '#f8fafc';
                              }}
                              onMouseLeave={(e) => {
                                if (editedStudent.hostInstitution !== uni)
                                  e.currentTarget.style.background = 'white';
                              }}
                            >
                              <div>{uni}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                {allUniversities[uni]?.country || ''}
                                {allUniversities[uni]?.custom ? ' · Elle eklendi' : ''}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </FormField>
          </div>
          <FormField label="Ülke">
            <Input
              value={editedStudent.hostCountry || ''}
              onChange={(e) => updateStudent('hostCountry', e.target.value)}
              disabled={readOnly}
            />
          </FormField>
          <FormField label="Dönem">
            <select
              value={editedStudent.semester || 'Fall 2025'}
              onChange={(e) => updateStudent('semester', e.target.value)}
              disabled={readOnly}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: `1.5px solid #d1d5db`,
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'inherit',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
            >
              {semesters.map((sem) => (
                <option key={sem} value={sem}>
                  {sem.startsWith('Spring')
                    ? sem.replace('Spring', 'Bahar')
                    : sem.replace('Fall', 'Güz')}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Karşı Kurum Fakülte Adı">
            <Input
              value={editedStudent.hostFaculty || ''}
              onChange={(e) => updateStudent('hostFaculty', e.target.value)}
              disabled={readOnly}
              placeholder="Örn: Faculty of Engineering"
            />
          </FormField>
          <FormField label="Karşı Kurum Bölüm Adı">
            <Input
              value={editedStudent.hostDepartment || ''}
              onChange={(e) => updateStudent('hostDepartment', e.target.value)}
              disabled={readOnly}
              placeholder="Örn: Computer Engineering"
            />
          </FormField>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          borderBottom: `2px solid ${C.border}`,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {['outgoing', 'return'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: r.val('10px 14px', '12px 20px', '12px 24px'),
              border: 'none',
              background: 'transparent',
              whiteSpace: 'nowrap',
              color: activeTab === tab ? C.navy : C.textMuted,
              fontWeight: 600,
              fontSize: r.val(13, 14, 14),
              cursor: 'pointer',
              borderBottom: activeTab === tab ? `3px solid ${C.navy}` : '3px solid transparent',
              fontFamily: "'Source Sans 3', sans-serif",
            }}
          >
            {tab === 'outgoing'
              ? `Gidiş Eşleştirmeleri (${editedStudent.outgoingMatches.length})`
              : `Dönüş Eşleştirmeleri (${editedStudent.returnMatches.length})`}
          </button>
        ))}
      </div>

      {/* Toplu onay/red toolbar (akademisyen, bekleyen eşleştirme varsa) */}
      {canApprove && pendingCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            padding: '12px 14px',
            marginBottom: 16,
            background: '#FFFBEB',
            border: '1.5px solid #FCD34D',
            borderRadius: 10,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#92400E', flex: 1 }}>
            {pendingCount} eşleştirme onay bekliyor
          </span>
          <button
            onClick={() => bulkReview('approved')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#10B981',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tümünü Onayla
          </button>
          <button
            onClick={() => openReject('all')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#EF4444',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tümünü Reddet
          </button>
        </div>
      )}

      {/* Matches */}
      <div style={{ minHeight: 300, maxHeight: 400, overflowY: 'auto', marginBottom: 20 }}>
        {activeTab === 'outgoing' && (
          <>
            {editedStudent.hostInstitution && (
              <div
                style={{
                  padding: 16,
                  background: '#EFF6FF',
                  border: '1.5px solid #93C5FD',
                  borderRadius: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1e40af',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1e40af"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  {editedStudent.hostInstitution}
                </div>
                {!readOnly && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {allUniversities[editedStudent.hostInstitution]?.courses?.length > 0 && (
                      <Btn
                        onClick={() => setShowCatalogModal(true)}
                        variant="secondary"
                        icon={<PlusIcon />}
                      >
                        Karşı Kurum Katalogdan Seç
                      </Btn>
                    )}
                    <Btn
                      onClick={() => setShowInstitutionMatches('outgoing')}
                      variant="secondary"
                      icon={<FileTextIcon />}
                    >
                      Önceki Eşleştirmelerden Seç
                    </Btn>
                  </div>
                )}
              </div>
            )}
            {editedStudent.outgoingMatches.map((match) => (
              <CourseMatchCard
                key={match.id}
                match={match}
                onDelete={(id) => deleteMatch('outgoing', id)}
                onEdit={(m) => setEditingMatch({ type: 'outgoing', match: m })}
                showGrade={false}
                type="outgoing"
                readOnly={readOnly}
                canApprove={canApprove}
                onApprove={(id) => reviewMatch('outgoing', id, 'approved')}
                onReject={(id) => openReject('single', 'outgoing', id)}
              />
            ))}
            {!readOnly && (
              <Btn onClick={() => addMatch('outgoing')} variant="secondary" icon={<PlusIcon />}>
                Manuel Eşleştirme Ekle
              </Btn>
            )}
          </>
        )}
        {activeTab === 'return' && (
          <>
            {!readOnly && editedStudent.hostInstitution && (
              <div
                style={{
                  padding: 16,
                  background: '#E8F5E9',
                  border: '2px solid #4CAF50',
                  borderRadius: 12,
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: '#2E7D32', marginBottom: 12 }}>
                  Önceki Dönüş Eşleştirmeleri
                </div>
                <Btn
                  onClick={() => setShowInstitutionMatches('return')}
                  variant="secondary"
                  icon={<FileTextIcon />}
                >
                  Önceki Eşleştirmelerden Seç
                </Btn>
              </div>
            )}
            {!readOnly && editedStudent.outgoingMatches.length > 0 && (
              <div
                style={{
                  padding: 20,
                  background: '#FFF9E6',
                  border: '2px dashed #FDB022',
                  borderRadius: 12,
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: C.navy, marginBottom: 12 }}>
                  Gidiş Eşleştirmelerinden Hızlı Doldur
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {editedStudent.outgoingMatches.map((outMatch, idx) => {
                    const alreadyExists = editedStudent.returnMatches.some(
                      (retMatch) =>
                        JSON.stringify(retMatch.homeCourses) ===
                          JSON.stringify(outMatch.homeCourses) &&
                        JSON.stringify(retMatch.hostCourses) ===
                          JSON.stringify(outMatch.hostCourses)
                    );
                    return (
                      <button
                        key={idx}
                        onClick={() => copyFromOutgoing(outMatch)}
                        disabled={alreadyExists}
                        style={{
                          padding: '10px 16px',
                          background: alreadyExists ? '#f5f5f5' : 'white',
                          border: `2px solid ${alreadyExists ? '#e0e0e0' : C.gold}`,
                          borderRadius: 8,
                          cursor: alreadyExists ? 'not-allowed' : 'pointer',
                          fontSize: 13,
                          color: alreadyExists ? C.textMuted : C.navy,
                          opacity: alreadyExists ? 0.5 : 1,
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          {alreadyExists ? '✓ ' : '+ '}Eşleştirme {idx + 1}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>
                          {outMatch.homeCourses
                            .map((c) => c.code || c.name)
                            .join(', ')
                            .substring(0, 30)}
                          ...
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {editedStudent.returnMatches.map((match) => (
              <CourseMatchCard
                key={match.id}
                match={match}
                onDelete={(id) => deleteMatch('return', id)}
                onEdit={(m) => setEditingMatch({ type: 'return', match: m })}
                showGrade={true}
                type="return"
                readOnly={readOnly}
                canApprove={canApprove}
                onApprove={(id) => reviewMatch('return', id, 'approved')}
                onReject={(id) => openReject('single', 'return', id)}
              />
            ))}
            {!readOnly && (
              <Btn onClick={() => addMatch('return')} variant="secondary" icon={<PlusIcon />}>
                Manuel Dönüş Eşleştirmesi Ekle
              </Btn>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          flexDirection: r.isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          gap: r.isMobile ? 10 : 0,
          paddingTop: 20,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <Btn onClick={exportStudentData} variant="secondary" icon={<DownloadIcon />}>
          Dışa Aktar (JSON)
        </Btn>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={onClose} variant="secondary">
            {readOnly ? 'Kapat' : 'İptal'}
          </Btn>
          {!readOnly && <Btn onClick={() => onSave(editedStudent)}>Kaydet</Btn>}
        </div>
      </div>

      {rejectCtx && (
        <div
          onClick={() => setRejectCtx(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 14,
              padding: 24,
              width: '100%',
              maxWidth: 460,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: '0 0 6px' }}>
              {rejectCtx.scope === 'all'
                ? 'Tüm bekleyen eşleştirmeleri reddet'
                : 'Eşleştirmeyi reddet'}
            </h3>
            <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 14px' }}>
              Red sebebi öğrenciye bildirim olarak iletilecektir.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Red sebebini yazın (örn. AKTS toplamı uyuşmuyor, ders içeriği yetersiz…)"
              rows={4}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                fontSize: 13,
                outline: 'none',
                fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setRejectCtx(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: 'white',
                  color: C.navy,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Vazgeç
              </button>
              <button
                onClick={confirmReject}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#EF4444',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reddet
              </button>
            </div>
          </div>
        </div>
      )}

      {editingMatch && (
        <CourseMatchEditModal
          match={editingMatch.match}
          type={editingMatch.type}
          activeDepartment={activeDepartment}
          onClose={() => setEditingMatch(null)}
          onSave={(updatedMatch) => {
            setEditedStudent((prev) => ({
              ...prev,
              [`${editingMatch.type}Matches`]: prev[`${editingMatch.type}Matches`].map((m) =>
                m.id === updatedMatch.id ? updatedMatch : m
              ),
            }));
            setEditingMatch(null);
          }}
        />
      )}
      {showCatalogModal && (
        <CourseCatalogModal
          university={editedStudent.hostInstitution}
          onClose={() => setShowCatalogModal(false)}
          onSelect={(hostCourses) => {
            const newMatch = { id: `outgoing${Date.now()}`, homeCourses: [], hostCourses };
            setEditedStudent((prev) => ({
              ...prev,
              outgoingMatches: [...prev.outgoingMatches, newMatch],
            }));
            setShowCatalogModal(false);
            setEditingMatch({ type: 'outgoing', match: newMatch });
          }}
        />
      )}
      {showInstitutionMatches && (
        <InstitutionMatchesModal
          hostInstitution={editedStudent.hostInstitution}
          allStudents={allStudents}
          currentStudentId={editedStudent.id}
          matchType={showInstitutionMatches}
          onClose={() => setShowInstitutionMatches(false)}
          onSelect={(matches) => {
            const type = showInstitutionMatches;
            const newMatches = matches.map((m) => {
              const base = {
                id: `${type}${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
                homeCourses: JSON.parse(JSON.stringify(m.homeCourses)),
                hostCourses: JSON.parse(JSON.stringify(m.hostCourses)),
              };
              if (type === 'return') {
                const hostGrades = {};
                const homeGrades = {};
                m.hostCourses.forEach((_, idx) => {
                  hostGrades[idx] = m.hostGrades?.[idx] || m.hostGrade || '';
                  homeGrades[idx] = m.homeGrades?.[idx] || m.homeGrade || 'Muaf';
                });
                return {
                  ...base,
                  hostGrade: m.hostGrade || '',
                  homeGrade: m.homeGrade || 'Muaf',
                  hostGrades,
                  homeGrades,
                };
              }
              return base;
            });
            setEditedStudent((prev) => ({
              ...prev,
              [`${type}Matches`]: [...prev[`${type}Matches`], ...newMatches],
            }));
            setShowInstitutionMatches(false);
          }}
        />
      )}
    </Modal>
  );
};

// ── Word Document Generators (same logic as before) ──
// ── Erasmus ders eşleştirmelerini şablon motoru satır verisine çevir ──
// match'ler çok-a-çok olabilir; her (host, home) çiftini ayrı satıra açar.
// Öğrenci soyadını BÜYÜK harfe çevir (yerel karakterler dahil), ad-soyadı birleştir
function erasmusUpperSurname(s) {
  return String(s || '').toLocaleUpperCase('tr-TR');
}
function erasmusAdSoyad(student) {
  const ad = student.firstName || '';
  const soyad = erasmusUpperSurname(student.lastName || '');
  return `${ad} ${soyad}`.trim();
}
// Öğrencinin seçtiği dönem (Güz/Bahar) + akademik yıl
function erasmusSemesterInfo(student) {
  const semester = student.semester || 'Fall 2025';
  const [season, year] = semester.split(' ');
  const seasonTR = season === 'Fall' ? 'Güz' : 'Bahar';
  const academicYear =
    season === 'Fall' ? `${year}-${parseInt(year) + 1}` : `${parseInt(year) - 1}-${year}`;
  return { seasonTR, academicYear };
}
// Bir ders için dönem değeri: dersin kendi dönemi metin (Güz/Bahar) ise onu,
// aksi halde (boş ya da sayısal "11" gibi) öğrencinin seçtiği dönemi kullan.
function erasmusCourseDonem(course, fallbackDonem) {
  const raw = course && course.semester != null ? String(course.semester).trim() : '';
  if (/güz|bahar|fall|spring/i.test(raw)) {
    return /güz|fall/i.test(raw) ? 'Güz' : 'Bahar';
  }
  return fallbackDonem;
}

// Bir eşleşme tek-tarafı çok-tarafla eşliyorsa (2'ye 1 / 1'e 2), tek olan
// tarafın hücreleri karşı derslerin satırları boyunca dikey birleştirilir.
const ERASMUS_HOST_COLS = ['kDersKod', 'kDersAd', 'kDersAkts', 'kDersDonem', 'kDersNot'];
const ERASMUS_HOME_COLS = [
  'cDersKod',
  'cDersAd',
  'cDersAkts',
  'cDersDonem',
  'cDersNot',
  'cDersStatu',
];

// "Elective I / II / III" gibi seçmeli ders adlarındaki ROMEN rakamlarını
// normal sayıya çevir (I→1, II→2 …). Yalnız seçmeli derslerde ve tek başına
// duran romen tokenlarında uygulanır ("Vision" gibi kelimeler bozulmaz).
const ERASMUS_ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
function erasmusFixCourseName(name) {
  let s = String(name || '');
  if (/elective|seçmeli/i.test(s)) {
    s = s.replace(/\b([ivx]+)\b/gi, (m) => {
      const n = ERASMUS_ROMAN[m.toLowerCase()];
      return n ? String(n) : m;
    });
  }
  return s;
}
// Boş ders kodu → "-" (öğrenci boş bıraktığında çıktıda tire görünsün).
function erasmusCode(course) {
  const c = course ? String(course.code || '').trim() : '';
  return c || '-';
}

function erasmusRowsFromMatches(matches, gradeMode, donem) {
  const rows = [];
  (matches || []).forEach((match) => {
    const hostL = match.hostCourses || [];
    const homeL = match.homeCourses || [];
    // Tamamen boş eşleşmeyi atla (çıktıda "ilk satır boş" sorununun kaynağı).
    if (hostL.length === 0 && homeL.length === 0) return;
    const maxLen = Math.max(hostL.length, homeL.length, 1);
    // Hangi taraf birleşecek? (tek karşı çok)
    const hostMerges = hostL.length === 1 && homeL.length > 1;
    const homeMerges = homeL.length === 1 && hostL.length > 1;
    for (let i = 0; i < maxLen; i++) {
      const hc = hostL[i];
      const mc = homeL[i];
      const statu = mc ? ((mc.name || '').toLowerCase().match(/elective|seçmeli/) ? 'S' : 'Z') : '';
      let kNot = '';
      let cNot = '';
      if (gradeMode) {
        const hg = match.hostGrades?.[i] || match.hostGrade || '';
        kNot = hg;
        cNot = hg && window.convertGrade ? window.convertGrade(hg) : '';
      }
      // Birleşen tarafın hücreleri için: ilk satır 'restart', altları 'continue'
      let _merge = null;
      if (hostMerges || homeMerges) {
        _merge = {};
        const cols = hostMerges ? ERASMUS_HOST_COLS : ERASMUS_HOME_COLS;
        const st = i === 0 ? 'restart' : 'continue';
        cols.forEach((c) => {
          _merge[c] = st;
        });
      }
      rows.push({
        kDersKod: hc ? erasmusCode(hc) : '',
        kDersAd: hc ? erasmusFixCourseName(hc.name || '') : '',
        kDersAkts: hc ? String(hc.credits ?? '') : '',
        kDersDonem: hc ? erasmusCourseDonem(hc, donem) : '',
        kDersNot: kNot,
        cDersKod: mc ? erasmusCode(mc) : '',
        cDersAd: mc ? erasmusFixCourseName(mc.name || '') : '',
        cDersAkts: mc ? String(mc.credits ?? '') : '',
        cDersDonem: mc ? erasmusCourseDonem(mc, donem) : '',
        cDersNot: cNot,
        cDersStatu: statu,
        _merge,
        _kA: hc ? Number(hc.credits) || 0 : 0,
        _cA: mc ? Number(mc.credits) || 0 : 0,
      });
    }
  });
  // Her iki tarafı da tamamen boş olan satırları ele (çıktıda boş satır kalmasın).
  return rows.filter(
    (r) =>
      (r.kDersKod && r.kDersKod !== '-') ||
      r.kDersAd ||
      (r.cDersKod && r.cDersKod !== '-') ||
      r.cDersAd
  );
}

// "Faculty of Engineering..." gibi değerlerin başındaki İngilizce etiket
// önekini (şablonda zaten var) at ki çıktıda "Faculty of Faculty of..."
// şeklinde tekrar etmesin.
function erasmusStripLabel(value, label) {
  let v = String(value || '').trim();
  const rx = new RegExp('^(?:' + label + '\\s+)+', 'i');
  return v.replace(rx, '').trim();
}

// Öğrenci + dönem bilgisinden şablon statik verisi üret
function erasmusStaticData(student, rows) {
  const { seasonTR, academicYear } = erasmusSemesterInfo(student);
  return {
    ogrenciNo: student.studentNumber || '',
    ogrenciAdSoyad: erasmusAdSoyad(student),
    ogrenciAdSoyadTamlanan: window.trGenitive
      ? window.trGenitive(erasmusAdSoyad(student))
      : erasmusAdSoyad(student),
    kaynakUniversite: student.hostInstitution || '',
    kaynakFakulte: erasmusStripLabel(student.hostFaculty, 'Faculty of'),
    kaynakBolum: erasmusStripLabel(student.hostDepartment, 'Department of'),
    cakuBolum: student.departmentName || '',
    hostUlke: student.hostCountry || '',
    hostKurum: student.hostInstitution || '',
    akademikYil: academicYear,
    donem: seasonTR,
    kaynakToplamAkts: String(rows.reduce((a, r) => a + (r._kA || 0), 0)),
    cakuToplamAkts: String(rows.reduce((a, r) => a + (r._cA || 0), 0)),
    tarih: new Date().toLocaleDateString('tr-TR'),
  };
}

// Üretilen Erasmus belgesini memur çıktı görünümü için kalıcı sakla (snapshot).
// produceFromTemplate blob'u döndürür; /api/files'e yüklenip memur_outputs'a yazılır.
// onPreview verilirse: belge indirilmez/otomatik gönderilmez; önce önizleme
// açılır, kullanıcı modalden "İndir" veya "Gönder" der.
const _snapshotErasmusDoc = async (res, student, docLabel, onPreview) => {
  try {
    if (!res || !res.blob || !window.uploadGeneratedDoc || !window.recordMemurOutput) return;
    const url = await window.uploadGeneratedDoc(
      res.blob,
      res.filename || 'erasmus.docx',
      'erasmus_ciktilari'
    );
    if (!url) return;
    const ad = ((student.firstName || '') + ' ' + (student.lastName || '')).trim();
    const sid = student.id || student.studentNo || student.studentNumber || '';
    await window.recordMemurOutput({
      module: 'erasmus',
      sourceId: sid + ':' + docLabel,
      title:
        (window.formatCaseTr ? window.formatCaseTr(ad, 'name') : ad) +
        (student.studentNo || student.studentNumber
          ? '  ·  ' + (student.studentNo || student.studentNumber)
          : ''),
      subtitle: [docLabel, student.hostInstitution].filter(Boolean).join('  ·  '),
      url,
      departmentId: student.departmentId || '',
    });
    const belgeKimligi = {
      module: 'erasmus',
      docType: docLabel && /dönüş|donus/i.test(docLabel) ? 'donus' : 'gidis',
      sourceId: sid + ':' + docLabel,
      title:
        (window.formatCaseTr ? window.formatCaseTr(ad, 'name') : ad) +
        (student.studentNo || student.studentNumber
          ? '  ·  ' + (student.studentNo || student.studentNumber)
          : ''),
      subtitle: [docLabel, student.hostInstitution].filter(Boolean).join('  ·  '),
      url,
      ogrenciNo: student.studentNo || student.studentNumber || '',
      departmentId: student.departmentId || '',
    };

    if (onPreview) {
      // Önizlemeli akış: kullanıcı belgeyi görür, sonra indirir veya gönderir.
      onPreview({
        blob: res.blob,
        filename: res.filename || 'erasmus.docx',
        baslik: docLabel + ' — ' + ad,
        belge: belgeKimligi,
      });
    } else if (window.belgeOtoYonlendir) {
      await window.belgeOtoYonlendir(belgeKimligi);
    }
  } catch (e) {
    console.warn('Erasmus snapshot kaydedilemedi:', e && e.message);
  }
};

const generateOutgoingWordDoc = async (student, onPreview) => {
  if (!student.outgoingMatches || student.outgoingMatches.length === 0) {
    alert('Bu öğrencinin henüz gidiş eşleştirmesi bulunmamaktadır.');
    return;
  }
  // Önce Şablonlar modülüne atanmış "gidiş" şablonunu dene
  if (window.TemplateEngine && window.TemplateEngine.produceFromTemplate) {
    const rows = erasmusRowsFromMatches(
      student.outgoingMatches,
      false,
      erasmusSemesterInfo(student).seasonTR
    );
    const res = await window.TemplateEngine.produceFromTemplate({
      module: 'erasmus',
      docType: 'gidis',
      departmentId: student.departmentId || '',
      staticData: erasmusStaticData(student, rows),
      rows,
      stripRowBold: true,
      filename: `${erasmusUpperSurname(student.lastName)}_${student.firstName}_Gidis_Degerlendirme.docx`,
      // Önizlemeli akışta dosya doğrudan inmez; modalden indirilir.
      noDownload: !!onPreview,
    });
    if (res.ok) {
      await _snapshotErasmusDoc(res, student, 'Gidiş Değerlendirme', onPreview);
      return;
    }
    if (res.reason === 'no-mapping') {
      alert(
        'Erasmus GİDİŞ şablonunun alan eşlemesi yapılmamış. Şablonlar modülünden şablonu açıp 🧩 ile alanları eşleyin. Şimdilik yerleşik biçim kullanılacak.'
      );
    } else if (res.reason === 'invalid-output') {
      alert(
        'Yüklü Erasmus GİDİŞ şablonundan geçerli belge üretilemedi. Yerleşik biçim kullanılacak.\n\nSebep: ' +
          (res.message || 'bilinmiyor') +
          '\n(Ayrıntı için tarayıcı konsoluna bakın — F12.)'
      );
    }
    // no-template / diğer → sessizce yerleşik biçme düş
  }

  const totalHomeCredits = student.outgoingMatches.reduce(
    (sum, m) => sum + m.homeCourses.reduce((s, c) => s + c.credits, 0),
    0
  );
  const totalHostCredits = student.outgoingMatches.reduce(
    (sum, m) => sum + m.hostCourses.reduce((s, c) => s + c.credits, 0),
    0
  );
  const semester = student.semester || 'Fall 2025';
  const [season, year] = semester.split(' ');
  const seasonTR = season === 'Fall' ? 'Güz' : 'Bahar';
  const academicYear =
    season === 'Fall' ? `${year}-${parseInt(year) + 1}` : `${parseInt(year) - 1}-${year}`;
  const donemText = seasonTR;

  // Determine Statüsü: S for elective, Z for others
  const getStatus = (course) => {
    if (!course) return '';
    const name = (course.name || '').toLowerCase();
    return name.includes('elective') || name.includes('seçmeli') ? 'S' : 'Z';
  };

  // Host institution header with Faculty of / Department of format
  const hostHeader = `${student.hostInstitution}${student.hostFaculty ? ' Faculty of ' + student.hostFaculty : ''}${student.hostDepartment ? ' Department of ' + student.hostDepartment : ''} Bölümünden Alacağı Dersin`;

  // Build rows: use rowspan when one course matches multiple on the other side
  const rows = [];
  student.outgoingMatches.forEach((match) => {
    const hostLen = match.hostCourses.length;
    const homeLen = match.homeCourses.length;
    const maxLen = Math.max(hostLen, homeLen);
    const bd = 'border: 1px solid black;';
    for (let i = 0; i < maxLen; i++) {
      let hostCells = '';
      let homeCells = '';
      // Host side (4 cols: Kodu, Adı, AKTS, Dönem)
      if (hostLen === 1 && homeLen > 1) {
        if (i === 0) {
          const hc = match.hostCourses[0];
          hostCells = `<td rowspan='${homeLen}' style='${bd} vertical-align: middle;'>${hc.code || '-'}</td><td rowspan='${homeLen}' style='${bd} vertical-align: middle;'>${hc.name}</td><td rowspan='${homeLen}' style='${bd} text-align: center; vertical-align: middle;'>${hc.credits}</td><td rowspan='${homeLen}' style='${bd} text-align: center; vertical-align: middle;'>${hc.semester || donemText}</td>`;
        }
      } else {
        const hc = match.hostCourses[i];
        hostCells = `<td style='${bd}'>${hc ? hc.code || '-' : ''}</td><td style='${bd}'>${hc ? hc.name : ''}</td><td style='${bd} text-align: center;'>${hc ? hc.credits : ''}</td><td style='${bd} text-align: center;'>${hc ? hc.semester || donemText : ''}</td>`;
      }
      // Home side (5 cols: Kodu, Adı, AKTS, Dönem, Statüsü)
      if (homeLen === 1 && hostLen > 1) {
        if (i === 0) {
          const mc = match.homeCourses[0];
          homeCells = `<td rowspan='${hostLen}' style='${bd} vertical-align: middle;'>${mc.code || '-'}</td><td rowspan='${hostLen}' style='${bd} vertical-align: middle;'>${mc.name}</td><td rowspan='${hostLen}' style='${bd} text-align: center; vertical-align: middle;'>${mc.credits}</td><td rowspan='${hostLen}' style='${bd} text-align: center; vertical-align: middle;'>${mc.semester || donemText}</td><td rowspan='${hostLen}' style='${bd} text-align: center; vertical-align: middle;'>${getStatus(mc)}</td>`;
        }
      } else {
        const mc = match.homeCourses[i];
        homeCells = `<td style='${bd}'>${mc ? mc.code || '-' : ''}</td><td style='${bd}'>${mc ? mc.name : ''}</td><td style='${bd} text-align: center;'>${mc ? mc.credits : ''}</td><td style='${bd} text-align: center;'>${mc ? mc.semester || donemText : ''}</td><td style='${bd} text-align: center;'>${getStatus(mc)}</td>`;
      }
      rows.push(`<tr>${hostCells}${homeCells}</tr>`);
    }
  });

  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Erasmus Gidiş Değerlendirmesi</title><style>@page { size: A4 landscape; margin: 2cm; }</style></head>
<body style='font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5;'>
<h3 style='text-align: center; margin-bottom: 30px;'>ERASMUS+ GİDİŞ ÖNCESİ DERS EŞLEŞTİRME DEĞERLENDİRMESİ</h3>
<p style='text-align: justify; margin: 20px 0;'>Bölümümüz <b>${student.studentNumber}</b> numaralı öğrencisi <b>${student.firstName} ${erasmusUpperSurname(student.lastName)}</b>'nın, <b>${academicYear} Eğitim-Öğretim Yılı ${seasonTR} Dönemi</b>'ni ERASMUS+ Öğrenim Hareketliliği programı kapsamında <b>${student.hostCountry}</b>'da bulunan "<b>${student.hostInstitution}</b>"${student.hostFaculty ? ' ' + student.hostFaculty : ''}${student.hostDepartment ? ' ' + student.hostDepartment : ''} Bölümünde alacağı derslerin karşılıklarının uygun olduğuna ve gereği için Fakültemiz ilgili kurullarında görüşülmek üzere Dekanlık Makamına sunulmasına,</p>
<table border='1' cellpadding='4' cellspacing='0' style='width: 100%; border-collapse: collapse; margin: 5px 0; font-size: 9pt;'>
<thead><tr style='background-color: #e8e8e8; font-weight: bold; font-size: 8pt;'>
<td colspan='4' style='border: 1px solid black; text-align: center;'><b>${hostHeader}</b></td>
<td colspan='5' style='border: 1px solid black; text-align: center;'><b>Çankırı Karatekin Üniversitesi Mühendislik Fakültesi Bilgisayar Mühendisliği Bölümünde Muaf Olacağı Dersin</b></td>
</tr>
<tr style='background-color: #e0e0e0; font-weight: bold;'>
<th style='border: 1px solid black;'>Kodu</th><th style='border: 1px solid black;'>Adı</th><th style='border: 1px solid black;'>AKTS</th><th style='border: 1px solid black;'>Dönem</th>
<th style='border: 1px solid black;'>Kodu</th><th style='border: 1px solid black;'>Adı</th><th style='border: 1px solid black;'>AKTS</th><th style='border: 1px solid black;'>Dönem</th><th style='border: 1px solid black;'>Statüsü</th>
</tr></thead><tbody>
${rows.join('')}
<tr style='font-weight: bold; background-color: #f0f0f0;'>
<td colspan='2' style='border: 1px solid black; text-align: right;'>Toplam</td><td style='border: 1px solid black; text-align: center;'>${totalHostCredits}</td><td style='border: 1px solid black;'></td>
<td colspan='2' style='border: 1px solid black; text-align: right;'>Toplam</td><td style='border: 1px solid black; text-align: center;'>${totalHomeCredits}</td><td style='border: 1px solid black;'></td><td style='border: 1px solid black;'></td>
</tr></tbody></table>
<p style='margin: 15px 0;'><strong>Öğrenci:</strong> ${student.firstName} ${erasmusUpperSurname(student.lastName)} (${student.studentNumber})</p>
</body></html>`;

  try {
    await downloadAsDocx(html, `${student.lastName}_${student.firstName}_Gidis_Degerlendirme.docx`);
  } catch (e) {
    alert('Belge olu\u015fturulamad\u0131: ' + e.message);
  }
};

const generateReturnWordDoc = async (student, onPreview) => {
  if (student.returnMatches.length === 0) {
    alert('Bu öğrencinin henüz dönüş eşleştirmesi bulunmamaktadır.');
    return;
  }
  // Önce Şablonlar modülüne atanmış "dönüş" şablonunu dene
  if (window.TemplateEngine && window.TemplateEngine.produceFromTemplate) {
    const rows = erasmusRowsFromMatches(
      student.returnMatches,
      true,
      erasmusSemesterInfo(student).seasonTR
    );
    const res = await window.TemplateEngine.produceFromTemplate({
      module: 'erasmus',
      docType: 'donus',
      departmentId: student.departmentId || '',
      staticData: erasmusStaticData(student, rows),
      rows,
      stripRowBold: true,
      filename: `${erasmusUpperSurname(student.lastName)}_${student.firstName}_Donus_Muafiyet.docx`,
      // Önizlemeli akışta dosya doğrudan inmez; modalden indirilir.
      noDownload: !!onPreview,
    });
    if (res.ok) {
      await _snapshotErasmusDoc(res, student, 'Dönüş Muafiyet', onPreview);
      return;
    }
    if (res.reason === 'no-mapping') {
      alert(
        'Erasmus DÖNÜŞ şablonunun alan eşlemesi yapılmamış. Şablonlar modülünden şablonu açıp 🧩 ile alanları eşleyin. Şimdilik yerleşik biçim kullanılacak.'
      );
    } else if (res.reason === 'invalid-output') {
      alert(
        'Yüklü Erasmus DÖNÜŞ şablonundan geçerli belge üretilemedi. Yerleşik biçim kullanılacak.\n\nSebep: ' +
          (res.message || 'bilinmiyor') +
          '\n(Ayrıntı için tarayıcı konsoluna bakın — F12.)'
      );
    }
  }

  const totalHomeCredits = student.returnMatches.reduce(
    (sum, m) => sum + m.homeCourses.reduce((s, c) => s + c.credits, 0),
    0
  );
  const totalHostCredits = student.returnMatches.reduce(
    (sum, m) => sum + m.hostCourses.reduce((s, c) => s + c.credits, 0),
    0
  );
  const semester = student.semester || 'Fall 2025';
  const [season, year] = semester.split(' ');
  const seasonTR = season === 'Fall' ? 'Güz' : 'Bahar';
  const academicYear =
    season === 'Fall' ? `${year}-${parseInt(year) + 1}` : `${parseInt(year) - 1}-${year}`;

  // Determine Statüsü: S for elective, Z for others
  const getStatus = (course) => {
    if (!course) return '';
    const name = (course.name || '').toLowerCase();
    return name.includes('elective') || name.includes('seçmeli') ? 'S' : 'Z';
  };

  // Host institution header with Faculty of / Department of format
  const hostHeader = `${student.hostInstitution}${student.hostFaculty ? ' Faculty of ' + student.hostFaculty : ''}${student.hostDepartment ? ' Department of ' + student.hostDepartment : ''} Bölümünden Aldığı Dersin`;

  // Build rows: use rowspan when one course matches multiple on the other side
  const rows = [];
  student.returnMatches.forEach((match) => {
    // Per-course grades: use hostGrades/homeGrades objects if available, else fall back to single hostGrade/homeGrade
    const getHostGrade = (idx) => match.hostGrades?.[idx] || match.hostGrade || 'A';
    const getHomeGrade = (idx) => {
      const hg = match.homeGrades?.[idx] || match.homeGrade || 'Muaf';
      // If homeGrade looks like a conversion target, use it; otherwise convert from host
      return hg;
    };
    const getConvertedGrade = (idx) => convertGrade(getHostGrade(idx));

    const hostLen = match.hostCourses.length;
    const homeLen = match.homeCourses.length;
    const maxLen = Math.max(hostLen, homeLen);
    const bd = 'border: 1px solid black;';
    for (let i = 0; i < maxLen; i++) {
      let hostCells = '';
      let homeCells = '';
      const hostGradeForRow = getHostGrade(i);
      const convertedForRow = getConvertedGrade(i);
      // Host side (4 cols: Kodu, Adı, AKTS, Başarı Notu)
      if (hostLen === 1 && homeLen > 1) {
        if (i === 0) {
          const hc = match.hostCourses[0];
          hostCells = `<td rowspan='${homeLen}' style='${bd} vertical-align: middle;'>${hc.code || '-'}</td><td rowspan='${homeLen}' style='${bd} vertical-align: middle;'>${hc.name}</td><td rowspan='${homeLen}' style='${bd} text-align: center; vertical-align: middle;'>${hc.credits}</td><td rowspan='${homeLen}' style='${bd} text-align: center; vertical-align: middle;'>${hostGradeForRow}</td>`;
        }
      } else {
        const hc = match.hostCourses[i];
        hostCells = `<td style='${bd}'>${hc ? hc.code || '-' : ''}</td><td style='${bd}'>${hc ? hc.name : ''}</td><td style='${bd} text-align: center;'>${hc ? hc.credits : ''}</td><td style='${bd} text-align: center;'>${hc ? hostGradeForRow : ''}</td>`;
      }
      // Home side (5 cols: Kodu, Adı, AKTS, Başarı Notu, Statüsü)
      if (homeLen === 1 && hostLen > 1) {
        if (i === 0) {
          const mc = match.homeCourses[0];
          homeCells = `<td rowspan='${hostLen}' style='${bd} vertical-align: middle;'>${mc.code || '-'}</td><td rowspan='${hostLen}' style='${bd} vertical-align: middle;'>${mc.name}</td><td rowspan='${hostLen}' style='${bd} text-align: center; vertical-align: middle;'>${mc.credits}</td><td rowspan='${hostLen}' style='${bd} text-align: center; vertical-align: middle;'>${convertedForRow}</td><td rowspan='${hostLen}' style='${bd} text-align: center; vertical-align: middle;'>${getStatus(mc)}</td>`;
        }
      } else {
        const mc = match.homeCourses[i];
        homeCells = `<td style='${bd}'>${mc ? mc.code || '-' : ''}</td><td style='${bd}'>${mc ? mc.name : ''}</td><td style='${bd} text-align: center;'>${mc ? mc.credits : ''}</td><td style='${bd} text-align: center;'>${mc ? convertedForRow : ''}</td><td style='${bd} text-align: center;'>${getStatus(mc)}</td>`;
      }
      rows.push(`<tr>${hostCells}${homeCells}</tr>`);
    }
  });

  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Erasmus Dönüş Muafiyeti</title><style>@page { size: A4 landscape; margin: 2cm; }</style></head>
<body style='font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5;'>
<h3 style='text-align: center; margin-bottom: 30px;'>ERASMUS+ DÖNÜŞÜ MUAFİYET İSTEĞİ</h3>
<p style='text-align: justify; margin: 20px 0;'>Bölümümüz <b>${student.studentNumber}</b> numaralı öğrencisi <b>${student.firstName} ${erasmusUpperSurname(student.lastName)}</b>'nın, <b>${academicYear} Akademik Yılı ${seasonTR} Dönemi</b>'nde ERASMUS+ programı kapsamında yurtdışında almış olduğu derslerin, Bilgisayar Mühendisliği Bölümü lisans programında hangi derslere karşılık geldiği, hangi derslere sayılacağının belirlenmesi talebi hakkında vermiş olduğu dilekçesi incelenmiş olup, aşağıda tabloda verildiği şekliyle uygun olduğuna ve gereği için Fakültemiz ilgili kurullarında görüşülmek üzere Dekanlık Makamına sunulmasına,</p>
<table border='1' cellpadding='4' cellspacing='0' style='width: 100%; border-collapse: collapse; margin: 5px 0; font-size: 9pt;'>
<thead><tr style='background-color: #e8e8e8; font-weight: bold; font-size: 8pt;'>
<td colspan='4' style='border: 1px solid black; text-align: center;'><b>${hostHeader}</b></td>
<td colspan='5' style='border: 1px solid black; text-align: center;'><b>Çankırı Karatekin Üniversitesi Mühendislik Fakültesi Bilgisayar Mühendisliği Bölümünde Muaf Olacağı Dersin</b></td>
</tr>
<tr style='background-color: #e0e0e0; font-weight: bold;'>
<th style='border: 1px solid black;'>Kodu</th><th style='border: 1px solid black;'>Adı</th><th style='border: 1px solid black;'>AKTS</th><th style='border: 1px solid black;'>Başarı Notu</th>
<th style='border: 1px solid black;'>Kodu</th><th style='border: 1px solid black;'>Adı</th><th style='border: 1px solid black;'>AKTS</th><th style='border: 1px solid black;'>Başarı Notu</th><th style='border: 1px solid black;'>Statüsü</th>
</tr></thead><tbody>
${rows.join('')}
<tr style='font-weight: bold; background-color: #f0f0f0;'>
<td colspan='2' style='border: 1px solid black; text-align: right;'>Toplam</td><td style='border: 1px solid black; text-align: center;'>${totalHostCredits}</td><td style='border: 1px solid black;'></td>
<td colspan='2' style='border: 1px solid black; text-align: right;'>Toplam</td><td style='border: 1px solid black; text-align: center;'>${totalHomeCredits}</td><td style='border: 1px solid black;'></td><td style='border: 1px solid black;'></td>
</tr></tbody></table>
<p style='margin: 15px 0;'><strong>Öğrenci:</strong> ${student.firstName} ${erasmusUpperSurname(student.lastName)} (${student.studentNumber})</p>
</body></html>`;

  try {
    await downloadAsDocx(html, `${student.lastName}_${student.firstName}_Donus_Muafiyet.docx`);
  } catch (e) {
    alert('Belge olu\u015fturulamad\u0131: ' + e.message);
  }
};

// ── Main Erasmus Module (receives currentUser as prop) ──
function ErasmusLearningAgreementApp({ currentUser, activeDepartment, departmentInfo }) {
  const r = useResponsive();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showTripHistory, setShowTripHistory] = useState(false);
  const [customUniversities, setCustomUniversities] = useState({});
  const fileInputRef = useRef(null);

  // Özel üniversiteleri yükle
  useEffect(() => {
    const loadCustomUnis = async () => {
      try {
        const docs = await window.apiRead('erasmus_universities');
        const unis = {};
        docs.forEach((doc) => {
          if (doc.name) {
            unis[doc.name] = {
              country: doc.country || '',
              courses: doc.courses || [],
              custom: true,
            };
          }
        });
        setCustomUniversities(unis);
      } catch (e) {
        console.error('Özel üniversiteler yüklenemedi:', e);
      }
    };
    loadCustomUnis();
  }, []);

  // Tüm üniversiteler = sabit katalog + özel eklenenler
  const allUniversities = { ...UNIVERSITY_CATALOGS, ...customUniversities };

  const handleAddUniversity = async (name, country) => {
    try {
      await window.DBWrite.add('erasmus_universities', {
        name,
        country,
        courses: [],
        createdAt: new Date().toISOString(),
      });
      setCustomUniversities((prev) => ({
        ...prev,
        [name]: { country, courses: [], custom: true },
      }));
    } catch (e) {
      console.error('Üniversite eklenemedi:', e);
    }
  };

  useEffect(() => {
    const loadStudents = async () => {
      if (!DB.isReady()) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        let allStudents = await DB.fetchStudents();
        // Koleksiyon boşsa örnek veri seed et (ilk kurulum için)
        if (!allStudents || allStudents.length === 0) {
          for (const student of SAMPLE_STUDENTS) {
            await DB.addStudent({ ...student, erasmusAccess: true });
          }
          allStudents = await DB.fetchStudents();
        }
        // Bölüm bazlı filtreleme — bölümün TÜM kimlik varyantları (id/_id/
        // _docId/code) ile eşleştir ki eski kimlikle kaydedilmiş öğrenci
        // kayıtları da doğru bölümde görünsün. Eklemeli: boş departmentId →
        // "bilgisayar" eski davranışı korunur (görünen öğrenci kaybolmaz).
        let deptVariants = [activeDepartment];
        try {
          if (window.deptIdVariants) deptVariants = await window.deptIdVariants(activeDepartment);
        } catch (_) {
          deptVariants = [activeDepartment];
        }
        const variantSet = new Set((deptVariants || [activeDepartment]).map(String));
        const fetchedStudents = allStudents.filter((s) => {
          const deptId = s.departmentId ? String(s.departmentId) : 'bilgisayar';
          return variantSet.has(deptId) || deptId === activeDepartment;
        });
        setStudents(fetchedStudents);
      } catch (error) {
        console.error('Error loading students:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStudents();
  }, [activeDepartment]);

  // Öğrenci BAŞVURUSUNU YAPTIKTAN sonra (ders eşleştirmesi girilmişse) düzenleme
  // kapanır; yeniden açmak modülden sorumlu akademisyenin/bölüm yetkilisinin
  // onayına bağlıdır (duzenlemeAcik bayrağı).
  const basvuruKilitli = (student) =>
    (student?.outgoingMatches || []).length > 0 && student?.duzenlemeAcik !== true;

  const canEdit = (student) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    // Bölüm yetkilisi kendi bölümündeki öğrencileri düzenleyebilir
    if (currentUser.role === 'bolum_yetkilisi') return true;
    // Erasmus yetkisi olmayan öğrenciler hiçbir değişiklik yapamaz
    if (currentUser.role === 'student' && currentUser.erasmusAccess !== true) return false;
    if (currentUser.role === 'student' && basvuruKilitli(student)) return false;
    return currentUser.role === 'student' && student.studentNumber === currentUser.studentNumber;
  };

  // ── Düzenleme izni istekleri ──
  // Öğrenci `students` koleksiyonuna YAZAMAZ (sunucu politikası), bu yüzden
  // istek öğrenci-yazılabilir `student_notifications` üzerinden iletilir.
  // Yetkili isteği listede görür; izni açınca istek çözülmüş sayılır.
  const [duzenlemeTalepleri, setDuzenlemeTalepleri] = useState([]);
  // Üretilen belgenin önizlemesi: { blob, filename, baslik, belge }
  const [onizleme, setOnizleme] = useState(null);

  const talepleriYukle = useCallback(async () => {
    try {
      const read = window.apiRead.fresh || window.apiRead;
      const list = (await read('student_notifications')) || [];
      setDuzenlemeTalepleri(
        list.filter((n) => n && n.kind === 'erasmus_duzenleme_talep' && n.cozuldu !== true)
      );
    } catch (_e) {
      /* istek listesi kritik değil */
    }
  }, []);

  useEffect(() => {
    talepleriYukle();
  }, [talepleriYukle]);

  const talepVar = (student) =>
    duzenlemeTalepleri.some((t) => String(t.studentNumber) === String(student?.studentNumber));

  // Öğrenci: yetkiliden yeniden düzenleme izni ister.
  const izinIste = async (student) => {
    if (!confirm('Başvurunuzu yeniden düzenlemek için izin isteğiniz gönderilsin mi?')) return;
    try {
      await window.DBWrite.add('student_notifications', {
        studentNumber: String(student.studentNumber || ''),
        kind: 'erasmus_duzenleme_talep',
        module: 'erasmus',
        departmentId: student.departmentId || activeDepartment || '',
        title: 'Erasmus düzenleme izni isteği',
        message:
          ((student.firstName || '') + ' ' + (student.lastName || '')).trim() +
          ' başvurusunu yeniden düzenlemek için izin istiyor.',
        read: false,
        cozuldu: false,
        createdAt: new Date().toISOString(),
      });
      await talepleriYukle();
      alert('İsteğiniz iletildi. Yetkili izin verdiğinde düzenleme yeniden açılacaktır.');
    } catch (e) {
      alert('İstek gönderilemedi: ' + e.message);
    }
  };

  // Yetkili, öğrencinin düzenleme iznini açar/kapatır.
  const toggleDuzenleme = async (student) => {
    const ac = student?.duzenlemeAcik !== true;
    if (
      !confirm(
        ac
          ? 'Öğrencinin başvurusunu yeniden düzenlemesine izin verilsin mi?'
          : 'Öğrencinin düzenleme izni kapatılsın mı?'
      )
    )
      return;
    try {
      await window.DBWrite.set(
        'students',
        String(student.id),
        {
          duzenlemeAcik: ac,
          duzenlemeAcanKisi: currentUser?.name || currentUser?.identifier || '',
          duzenlemeAcilmaTarihi: new Date().toISOString(),
        },
        true
      );
      if (window.apiInvalidate) window.apiInvalidate('students');
      setStudents((prev) =>
        (prev || []).map((s) => (s.id === student.id ? { ...s, duzenlemeAcik: ac } : s))
      );
      // İzin açıldıysa bekleyen istek karşılanmış olur — listeden düşsün.
      if (ac) {
        const bekleyen = duzenlemeTalepleri.filter(
          (t) => String(t.studentNumber) === String(student.studentNumber)
        );
        for (const t of bekleyen) {
          try {
            await window.DBWrite.set(
              'student_notifications',
              String(t.id || t._docId),
              { cozuldu: true, read: true, cozulmeTarihi: new Date().toISOString() },
              true
            );
          } catch (_e) {
            /* isteğin kapanmaması ana akışı bozmasın */
          }
        }
        await talepleriYukle();
      }
      alert(ac ? 'Düzenleme izni açıldı.' : 'Düzenleme izni kapatıldı.');
    } catch (e) {
      alert('Güncellenemedi: ' + e.message);
    }
  };

  const isStudentWithoutErasmus =
    currentUser?.role === 'student' && currentUser?.erasmusAccess !== true;

  // Öğrenci kaydını silme yalnızca yetkililerde olur; öğrenci (erasmus yetkili
  // olsa bile) kendi kaydını silemez — "İşlemler" sütununda Sil butonu görmez.
  const canDeleteStudent = currentUser?.role === 'admin' || currentUser?.role === 'bolum_yetkilisi';

  const generateSemesters = () => {
    const semesters = ['all'];
    for (let year = 2024; year <= 2030; year++) {
      semesters.push(`Spring ${year}`);
      semesters.push(`Fall ${year}`);
    }
    return semesters;
  };
  const semesters = generateSemesters();

  // Bir öğrencinin yalnızca kendi kaydına erişebilmesi için kontrol.
  // Admin ve bölüm yetkilisi tüm öğrencileri görür; öğrenci rolündeki
  // kullanıcı (erasmus yetkili olsa bile) yalnızca kendi numarasını görür.
  const isStudentRole = currentUser?.role === 'student';
  const isOwnRecord = (s) => !isStudentRole || s.studentNumber === currentUser?.studentNumber;

  // Erasmus modülünde yalnızca erasmus yetkili öğrenciler gösterilir;
  // öğrenci rolü ise sadece kendi kaydı listelenir.
  const erasmusStudents = students.filter((s) => s.erasmusAccess === true && isOwnRecord(s));

  const filteredStudents = erasmusStudents
    .filter((s) => selectedSemester === 'all' || s.semester === selectedSemester)
    .filter((s) =>
      `${s.firstName} ${s.lastName} ${s.studentNumber} ${s.hostInstitution}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

  const handleSaveStudent = async (updatedStudent) => {
    try {
      const originalStudent = students.find((s) => s.id === updatedStudent.id);
      const studentNumberChanged =
        originalStudent && originalStudent.studentNumber !== updatedStudent.studentNumber;

      // ── Onay durumu damgalama ──
      // Öğrenci yeni eşleştirme eklediyse status yok → 'pending' (onaya
      // düşer). Akademisyen eklerse doğrudan 'approved'. Mevcut status
      // (akademisyen onay/red ile değişmiş) korunur.
      const savingAsStudent = currentUser?.role === 'student';
      const stamp = (arr) =>
        (arr || []).map((m) =>
          m.status ? m : { ...m, status: savingAsStudent ? 'pending' : 'approved' }
        );
      // Elle girilen metinleri normalize et: ad → Title, soyad → BÜYÜK,
      // ders adları → Title. Ders KODLARI ve KURUM ADI (katalog anahtarı)
      // dokunulmadan bırakılır.
      const normCourses = (arr) =>
        (arr || []).map((c) => (c && c.name ? { ...c, name: titleCaseTr(c.name) } : c));
      const normMatch = (m) => ({
        ...m,
        homeCourses: normCourses(m.homeCourses),
        hostCourses: normCourses(m.hostCourses),
      });
      updatedStudent = {
        ...updatedStudent,
        firstName: titleCaseTr(updatedStudent.firstName),
        lastName: upperTr(updatedStudent.lastName),
        outgoingMatches: stamp(updatedStudent.outgoingMatches).map(normMatch),
        returnMatches: stamp(updatedStudent.returnMatches).map(normMatch),
      };

      await DB.updateStudent(updatedStudent.id, updatedStudent);
      if (studentNumberChanged) {
        console.log(
          'Öğrenci numarası değişti:',
          originalStudent.studentNumber,
          '->',
          updatedStudent.studentNumber
        );
      }
      // Otomatik olarak eşleştirme geçmişine kaydet
      DB.syncStudentToTripHistory(updatedStudent).catch((err) =>
        console.error('Trip history sync error:', err)
      );

      // ── Bildirimler ── (orijinal ile karşılaştır)
      try {
        sendMatchNotifications(originalStudent, updatedStudent, savingAsStudent);
      } catch (e) {
        console.warn('Bildirim gönderilemedi:', e);
      }

      setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
      setSelectedStudent(null);
      alert('Değişiklikler kaydedildi!');
    } catch (error) {
      console.error('Save error:', error);
      // Sunucunun gerçek sebebini göster: yetki reddi, kilit uyarısı vb.
      // Genel "hata oluştu" mesajı sorunu teşhis edilemez kılıyordu.
      alert('Kayıt sırasında hata oluştu.\n\n' + (error?.message || 'Bilinmeyen hata.'));
    }
  };

  // Eşleştirme bildirimi: öğrenci yeni eşleştirme → komisyon/bölüm
  // akademisyenlerine (notifications); akademisyen onay/red → öğrenciye
  // (student_notifications). Orijinal ile diff alarak yalnızca değişenleri
  // bildirir.
  const sendMatchNotifications = (original, updated, savingAsStudent) => {
    const origAll = [
      ...((original && original.outgoingMatches) || []),
      ...((original && original.returnMatches) || []),
    ];
    const origById = {};
    origAll.forEach((m) => {
      if (m && m.id != null) origById[m.id] = m;
    });
    const updAll = [
      ...(updated.outgoingMatches || []).map((m) => ({ ...m, _t: 'gidiş' })),
      ...(updated.returnMatches || []).map((m) => ({ ...m, _t: 'dönüş' })),
    ];
    const studentName = `${updated.firstName || ''} ${updated.lastName || ''}`.trim();

    if (savingAsStudent) {
      // Öğrenci yeni 'pending' eşleştirme eklediyse → akademisyenlere bildirim
      const newPending = updAll.filter((m) => m.status === 'pending' && !origById[m.id]);
      if (newPending.length > 0 && window.Notify) {
        // Bildirim, bölümün KANONİK kimliğine gönderilir — eski kimlikli
        // öğrencide onaycılar (kanonik id'ye abone) aksi halde haber almıyordu.
        const rawDept = updated.departmentId || activeDepartment || '';
        const canonDept = (() => {
          const list = window.DEPARTMENTS || [];
          const rec = list.find(
            (d) =>
              d && [d.id, d._id, d._docId, d.code].some((k) => k && String(k) === String(rawDept))
          );
          return rec ? String(rec.id || rec._docId || rec._id || rawDept) : rawDept;
        })();
        window.Notify.send({
          recipientType: 'department',
          recipientId: canonDept,
          module: 'erasmus',
          type: 'erasmus_match_pending',
          title: 'Yeni Erasmus eşleştirmesi onay bekliyor',
          body: `${studentName} (${updated.studentNumber}) ${newPending.length} ders eşleştirmesi gönderdi. Onayınız bekleniyor.`,
          link: '#erasmus',
          meta: { studentNumber: updated.studentNumber },
        }).catch(() => {});
      }
    } else {
      // Akademisyen onay/red verdiyse → öğrenciye bildirim
      const decided = updAll.filter((m) => {
        const o = origById[m.id];
        const prevStatus = o ? o.status || 'approved' : null;
        return (m.status === 'approved' || m.status === 'rejected') && prevStatus !== m.status;
      });
      if (decided.length > 0 && window.StudentNotifier && updated.studentNumber) {
        decided.forEach((m) => {
          const ok = m.status === 'approved';
          window.StudentNotifier._addNotification(updated.studentNumber, {
            module: 'erasmus',
            type: ok ? 'erasmus_match_approved' : 'erasmus_match_rejected',
            title: ok ? 'Erasmus eşleştirmen onaylandı' : 'Erasmus eşleştirmen reddedildi',
            body: ok
              ? `${m._t} ders eşleştirmen ${m.reviewedBy || 'koordinatör'} tarafından onaylandı.`
              : `${m._t} ders eşleştirmen ${m.reviewedBy || 'koordinatör'} tarafından reddedildi.` +
                (m.rejectReason
                  ? ` Sebep: ${m.rejectReason}`
                  : ' Lütfen koordinatörünüzle görüşün.'),
            link: '#erasmus',
          });
        });
      }
    }
  };

  const handleAddStudent = async () => {
    const newStudent = {
      id: String(Date.now()),
      studentNumber: '',
      firstName: '',
      lastName: '',
      hostInstitution: '',
      hostCountry: '',
      semester: 'Fall 2025',
      outgoingMatches: [],
      returnMatches: [],
      erasmusAccess: true,
    };
    setStudents((prev) => [...prev, newStudent]);
    setSelectedStudent(newStudent);
  };

  const handleToggleErasmusAccess = async (student) => {
    try {
      const newAccess = !student.erasmusAccess;
      await DB.updateStudent(student.id, { ...student, erasmusAccess: newAccess });
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, erasmusAccess: newAccess } : s))
      );
    } catch (error) {
      console.error('Erasmus erişim güncelleme hatası:', error);
      alert('Erişim güncellenirken hata oluştu.');
    }
  };

  const handleDeleteStudent = async (id) => {
    if (confirm('Bu öğrenciyi silmek istediğinizden emin misiniz?')) {
      try {
        const st = students.find((s) => s.id === id);
        await DB.deleteStudent(id);
        if (window.audit)
          window.audit('erasmus_student_delete', 'students', id, {
            meta: {
              studentNumber: st?.studentNumber,
              name: `${st?.firstName || ''} ${st?.lastName || ''}`.trim(),
            },
          });
        setStudents((prev) => prev.filter((s) => s.id !== id));
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const exportAllData = () => {
    const data = students.map((s) => ({
      'Öğrenci Numarası': s.studentNumber,
      Ad: s.firstName,
      Soyad: s.lastName,
      'Karşı Kurum': s.hostInstitution,
      Ülke: s.hostCountry,
      Gidiş: (s.outgoingMatches || []).length,
      Dönüş: (s.returnMatches || []).length,
    }));
    if (data.length === 0) {
      alert('Dışa aktarılacak öğrenci bulunamadı.');
      return;
    }
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map((row) => Object.values(row).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
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
          setStudents((prev) => [...prev, ...importedData]);
          alert(`${importedData.length} öğrenci içeye aktarıldı!`);
        }
      } catch (error) {
        alert('Dosya formati hatali!');
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: C.textMuted }}>
        Veriler yükleniyor...
      </div>
    );
  }

  return (
    <div>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 4px 40px' }}>
        {/* Sayfa başlığı — ortak banner */}
        {React.createElement(window.CakuBanner, {
          title: 'Erasmus Öğrenim Anlaşması',
          subtitle: 'Ders eşleştirmeleri ve öğrenim anlaşması yönetimi',
        })}

        {/* Salt-okunur bilgi (Erasmus yetkisi olmayan öğrenci) — sade */}
        {isStudentWithoutErasmus && (
          <div
            style={{
              marginBottom: 16,
              padding: '14px 18px',
              background: C.card,
              border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${C.navy}`,
              borderRadius: 10,
            }}
          >
            <div style={{ fontWeight: 600, color: C.navy, fontSize: 14, marginBottom: 3 }}>
              Salt okunur mod — Erasmus yetkisi gerekli
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
              Geçmiş ders eşleştirmelerini görüntüleyebilirsiniz; değişiklik yapmak için bölüm
              koordinatörünüzden Erasmus yetkisi talep edin.
            </div>
          </div>
        )}

        {/* Eşleştirme Geçmişi — sade kart, gradyan/ikon kutusu yok */}
        <div
          onClick={() => setShowTripHistory(true)}
          role="button"
          tabIndex={0}
          style={{
            marginBottom: 16,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>Eşleştirme Geçmişi</div>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 2 }}>
              Bu bölümde geçmiş dönemlere ait ders eşleştirmelerini görüntüle
            </div>
          </div>
          <span
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: `1px solid ${C.navy}`,
              color: C.navy,
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            Görüntüle →
          </span>
        </div>

        {/* Not Dönüşüm Hesaplayıcı */}
        <Card title="Not Dönüşüm Hesaplayıcı">
          <GradeConverter />
        </Card>

        {/* Students Table */}
        <Card title="Öğrenciler" noPadding>
          <div
            className="responsive-table-wrap"
            style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: r.isMobile ? 700 : 'auto',
              }}
            >
              <thead>
                <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                  {['Öğrenci No', 'Ad Soyad', 'Karşı Kurum', 'Gidiş', 'Dönüş', 'İşlemler'].map(
                    (h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: '16px 24px',
                          textAlign: i === 3 || i === 4 ? 'center' : i === 5 ? 'right' : 'left',
                          fontSize: 11,
                          fontWeight: 700,
                          color: C.navy,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => (
                  <tr
                    key={student.id}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      transition: 'background 0.15s',
                      // Zebra: uzun listede satır takibi kolaylaşsın
                      background: idx % 2 === 1 ? C.bg + '80' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = C.bg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        idx % 2 === 1 ? C.bg + '80' : 'transparent';
                    }}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.navy,
                        }}
                      >
                        {student.studentNumber}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {dispAd(student.firstName)} {dispSoyad(student.lastName)}
                        {student.erasmusAccess && (
                          <span
                            style={{
                              fontSize: 9,
                              background: '#E6F4EA',
                              color: '#1E7E34',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontWeight: 600,
                            }}
                          >
                            Erasmus
                          </span>
                        )}
                      </div>
                      {student.semester && (
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                          {student.semester}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{student.hostInstitution}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{student.hostCountry}</div>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <Badge color={C.green} bg={C.greenLight}>
                        {(student.outgoingMatches || []).length} eşleştirme
                      </Badge>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <Badge color={C.gold} bg={C.goldPale}>
                        {(student.returnMatches || []).length} eşleştirme
                      </Badge>
                    </td>
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      {/* Sabit üç sütunlu ızgara: buton sayısı satırdan satıra
                          değişse de kutular aynı boyutta ve hizalı kalır. */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 104px)',
                          gap: 6,
                          justifyContent: 'end',
                          marginLeft: 'auto',
                          width: 'fit-content',
                        }}
                      >
                        <button
                          onClick={
                            isStudentWithoutErasmus ? undefined : () => setSelectedStudent(student)
                          }
                          disabled={isStudentWithoutErasmus}
                          style={{
                            ...eBtn,
                            background: C.navy,
                            color: '#fff',
                            border: `1px solid ${C.navy}`,
                            opacity: isStudentWithoutErasmus ? 0.45 : 1,
                            cursor: isStudentWithoutErasmus ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {canEdit(student) ? 'Detay & Düzenle' : 'Detay (salt okunur)'}
                        </button>
                        <button
                          onClick={
                            isStudentWithoutErasmus
                              ? undefined
                              : () => generateOutgoingWordDoc(student, setOnizleme)
                          }
                          disabled={isStudentWithoutErasmus}
                          style={{
                            ...eBtnGhost,
                            opacity: isStudentWithoutErasmus ? 0.45 : 1,
                            cursor: isStudentWithoutErasmus ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Gidiş belgesi
                        </button>
                        {((student.returnMatches || []).length > 0 || isStudentWithoutErasmus) && (
                          <button
                            onClick={
                              isStudentWithoutErasmus
                                ? undefined
                                : () => generateReturnWordDoc(student, setOnizleme)
                            }
                            disabled={isStudentWithoutErasmus}
                            style={{
                              ...eBtnGhost,
                              opacity: isStudentWithoutErasmus ? 0.45 : 1,
                              cursor: isStudentWithoutErasmus ? 'not-allowed' : 'pointer',
                            }}
                          >
                            Dönüş belgesi
                          </button>
                        )}
                        {/* Belge Akışı: üretilmiş Erasmus belgesini bir göreve yönlendir */}
                        {/* Yetkili: öğrencinin düzenleme iznini aç/kapat */}
                        {!isStudentRole && (student.outgoingMatches || []).length > 0 && (
                          <button
                            onClick={() => toggleDuzenleme(student)}
                            title={
                              student.duzenlemeAcik === true
                                ? 'Öğrenci şu an düzenleyebiliyor — kapatmak için tıklayın'
                                : 'Öğrencinin yeniden düzenlemesine izin ver'
                            }
                            style={{
                              ...eBtnGhost,
                              color:
                                student.duzenlemeAcik === true
                                  ? '#B45309'
                                  : talepVar(student)
                                    ? '#B45309'
                                    : C.navy,
                              borderColor:
                                student.duzenlemeAcik === true || talepVar(student)
                                  ? '#B45309'
                                  : undefined,
                              background: talepVar(student) ? '#FEF3C7' : undefined,
                            }}
                          >
                            {student.duzenlemeAcik === true
                              ? 'Düzenlemeyi Kapat'
                              : talepVar(student)
                                ? 'İzin İstendi'
                                : 'Düzenlemeye İzin Ver'}
                          </button>
                        )}
                        {/* Öğrenci: yetkili düzenlemeye izin vermişse durum açıkça belirtilir.
                            (Başvurusu gönderilmiş olmasına rağmen alanların açık
                            görünmesinin sebebi budur.) */}
                        {isStudentRole &&
                          (student.outgoingMatches || []).length > 0 &&
                          student.duzenlemeAcik === true && (
                            <span
                              style={{
                                ...eBtnGhost,
                                cursor: 'default',
                                color: '#047857',
                                borderColor: '#04785755',
                                background: '#D1FAE5',
                              }}
                              title="Yetkili düzenlemenize izin verdi. Değişikliklerinizi kaydedebilirsiniz."
                            >
                              Düzenleme açık
                            </span>
                          )}
                        {/* Öğrenci: başvuru kilitli — izin isteyebilir */}
                        {isStudentRole &&
                          basvuruKilitli(student) &&
                          (talepVar(student) ? (
                            <span
                              style={{
                                ...eBtnGhost,
                                cursor: 'default',
                                color: '#1D4ED8',
                                borderColor: '#1D4ED855',
                                background: '#DBEAFE',
                              }}
                              title="İzin isteğiniz iletildi, yetkilinin onayı bekleniyor."
                            >
                              İzin isteği gönderildi
                            </span>
                          ) : (
                            <button
                              onClick={() => izinIste(student)}
                              style={{
                                ...eBtnGhost,
                                color: '#B45309',
                                borderColor: '#B4530955',
                                background: '#FEF3C7',
                              }}
                              title="Başvurunuz gönderildiği için düzenleme kapalı. Yeniden düzenlemek için yetkiliden izin isteyin."
                            >
                              Düzenleme kapalı — İzin İste
                            </button>
                          ))}
                        {/* Üretilmiş son belge: önce ÖNİZLE, sonra indir/gönder. */}
                        {!isStudentRole && (
                          <button
                            onClick={async () => {
                              const sid =
                                student.id || student.studentNo || student.studentNumber || '';
                              const list = await window.apiRead('memur_outputs').catch(() => []);
                              const mine = (list || [])
                                .filter(
                                  (o) =>
                                    o.module === 'erasmus' &&
                                    String(o.sourceId || '').indexOf(String(sid)) === 0
                                )
                                .sort((a2, b2) =>
                                  String(b2.updatedAt || '').localeCompare(
                                    String(a2.updatedAt || '')
                                  )
                                );
                              const son = mine[0];
                              if (!son || !son.url) {
                                alert(
                                  'Önizlenecek belge yok. Önce "Gidiş belgesi" veya "Dönüş belgesi" ile belgeyi üretin.'
                                );
                                return;
                              }
                              setOnizleme({
                                url: son.url,
                                filename: 'Erasmus_Belge.docx',
                                baslik: son.title || 'Erasmus Belgesi',
                                belge: {
                                  module: 'erasmus',
                                  docType: /dönüş|donus/i.test(String(son.sourceId))
                                    ? 'donus'
                                    : 'gidis',
                                  sourceId: son.sourceId,
                                  title: son.title || '',
                                  subtitle: son.subtitle || '',
                                  url: son.url,
                                  ogrenciNo: student.studentNo || student.studentNumber || '',
                                  departmentId: student.departmentId || '',
                                },
                              });
                            }}
                            style={eBtnGhost}
                          >
                            Belgeyi Önizle
                          </button>
                        )}
                        {canDeleteStudent && (
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            style={{ ...eBtnGhost, color: C.accent, borderColor: C.accent + '55' }}
                          >
                            Sil
                          </button>
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
          <StudentDetailModal
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
            onSave={handleSaveStudent}
            readOnly={
              !canEdit(selectedStudent) || (isStudentRole && basvuruKilitli(selectedStudent))
            }
            allStudents={students}
            allUniversities={allUniversities}
            onAddUniversity={handleAddUniversity}
            activeDepartment={activeDepartment}
            currentUser={currentUser}
          />
        )}
        {/* Belge önizleme — üretilen belge önce görüntülenir, sonra indirilir
            veya bir göreve gönderilir. */}
        {onizleme &&
          window.BelgeOnizlemeModal &&
          React.createElement(window.BelgeOnizlemeModal, {
            blob: onizleme.blob,
            url: onizleme.url,
            filename: onizleme.filename,
            baslik: onizleme.baslik,
            onClose: () => setOnizleme(null),
            onSend: onizleme.belge
              ? async () => {
                  if (window.belgeOtoYonlendir) await window.belgeOtoYonlendir(onizleme.belge);
                }
              : null,
          })}
        {showTripHistory && (
          <TripHistoryModal
            onClose={() => setShowTripHistory(false)}
            universities={allUniversities}
            isReadOnly={currentUser?.role !== 'admin'}
            activeDepartment={activeDepartment}
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.ErasmusLearningAgreementApp = ErasmusLearningAgreementApp;
}
