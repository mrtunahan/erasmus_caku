// ══════════════════════════════════════════════════════════════
// ÇAKÜ Sınav Programı Otomasyonu - Sürükle-Bırak Takvim
// Drag-and-drop haftalık takvim grid, ders havuzu, tablo görünümü
// Shared bileşenler shared-components.jsx'den window üzerinden gelir
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef: _useRef, useMemo, useCallback } = React;

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
        padding: '10px 18px',
        borderRadius: 8,
        border: '1px solid ' + (C ? C.border : '#E5E1D8'),
        background: hover ? (C ? C.blueLight : '#DBEAFE') : 'transparent',
        color: C ? C.blue : '#3B82F6',
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'Source Sans 3', sans-serif",
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'all 0.2s',
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
  1: { bg: '#B2EBF2', text: '#006064', label: '1. Sınıf' },
  2: { bg: '#C8E6C9', text: '#1B5E20', label: '2. Sınıf' },
  3: { bg: '#FFE0B2', text: '#E65100', label: '3. Sınıf' },
  4: { bg: '#F8BBD0', text: '#880E4F', label: '4. Sınıf' },
  5: { bg: '#E1BEE7', text: '#4A148C', label: 'Seçmeli Dersler' },
};

// ── Bölüm Sınıfları ve Gözetmenler ──
const DEPT_CLASSROOMS = [
  { name: 'M11101', capacity: 42 },
  { name: 'M10Z07', capacity: 49 },
  { name: 'M11103', capacity: 58 },
];

const ALL_FACULTY_CLASSROOMS = [
  { name: 'M10Z04', capacity: 25 },
  { name: 'M10Z05', capacity: 30 },
  { name: 'M10Z06', capacity: 25 },
  { name: 'M10Z07', capacity: 49 },
  { name: 'M11101', capacity: 42 },
  { name: 'M11102', capacity: 25 },
  { name: 'M11103', capacity: 58 },
  { name: 'M11108', capacity: 21 },
  { name: 'M12201', capacity: 21 },
  { name: 'M12202', capacity: 42 },
  { name: 'M12203', capacity: 42 },
  { name: 'M111BL', capacity: '' },
  { name: 'M122BL', capacity: '' },
];

// Genel salon atama fonksiyonu: tek salon → 2'li kombinasyon → 3+ salon (greedy)
function assignClassroomFromList(rooms, studentCount) {
  if (!rooms || rooms.length === 0) return 'TBD';
  if (!studentCount || studentCount <= 0) return rooms[0].name;
  // capacity değerlerini sayıya çevir (DB string döndürebilir)
  const getCap = (r) => Number(r.capacity) || 0;
  // 1) Tek salon yeterli mi? (best-fit: kapasitesi yeten en küçük salon)
  const validRooms = rooms.filter((r) => getCap(r) > 0);
  const sortedByCapAsc = [...validRooms].sort((a, b) => getCap(a) - getCap(b));
  const single = sortedByCapAsc.find((r) => getCap(r) >= studentCount);
  if (single) return single.name;
  // 2) İkili kombinasyon dene (best-fit)
  let bestCombo = null;
  let bestDiff = Infinity;
  for (let i = 0; i < validRooms.length; i++) {
    for (let j = i + 1; j < validRooms.length; j++) {
      const cap = getCap(validRooms[i]) + getCap(validRooms[j]);
      if (cap >= studentCount && cap - studentCount < bestDiff) {
        bestDiff = cap - studentCount;
        bestCombo = [validRooms[i], validRooms[j]];
      }
    }
  }
  if (bestCombo) return bestCombo.map((r) => r.name).join(' - ');
  // 3) İkili yetmezse: büyükten küçüğe salonları ekleyerek kapasiteyi doldur
  const sortedByCapDesc = [...validRooms].sort((a, b) => getCap(b) - getCap(a));
  const selected = [];
  let totalCap = 0;
  for (const room of sortedByCapDesc) {
    selected.push(room);
    totalCap += getCap(room);
    if (totalCap >= studentCount) break;
  }
  return selected.map((r) => r.name).join(' - ');
}

// ── Gözetmen ataması ──
// Kurallar (dersin hocası, kaç gözetmen) ve dağıtım lib/gozetmen.js'te,
// Bölüm Yönetimi ile ortak ve test altında. Burada yalnız çağrılır.
// Kurallar bölüm kaydından okunur: departments.gozetmenKurali (hoca) ve
// departments.gozetmenSayiKurali (salon başına gözetmen).
// Kayıt KİMLİKLE bulunur, ada göre değil: bölüm listesi burada ada göre
// eşleniyor ve aynı adlı iki kayıt varsa kuralın yazılmadığı kayıt seçilip
// çıktı varsayılan kurallarla üretiliyordu.
async function bolumGozetmenKurallari(bolumId) {
  let bolum = null;
  try {
    const liste = await window.apiRead('departments');
    bolum = window.Gozetmen ? window.Gozetmen.bolumKaydiniBul(liste, bolumId) : null;
  } catch (_) {
    bolum = null;
  }
  return {
    hocaKurali: bolum && bolum.gozetmenKurali,
    sayiKurali: bolum && bolum.gozetmenSayiKurali,
  };
}

function gozetmenleriDagit(havuz, exams, classroomFn, secenekler) {
  const G = window.Gozetmen;
  if (!G || !G.gozetmenAta) return { atamalar: {}, uyarilar: [] };
  return G.gozetmenAta(havuz || [], exams, {
    ...(secenekler || {}),
    salonBul: classroomFn,
  });
}

const TIME_SLOTS = [];
for (let h = 8; h <= 17; h++) {
  // End at 17:30 (last slot 17:00 or 17:30)
  for (let m = 0; m < 60; m += 30) {
    if (h === 8 && m === 0) continue; // Start from 08:30
    // if (h === 12) continue; // Skip 12:00 - 13:00 (Lunch) - REVERTED
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    TIME_SLOTS.push(`${hh}:${mm}`);
  }
}
// Lisans takvimi yalnız bu ilk satırları gösterir (08:30–17:30)
const LISANS_TIME_SLOT_COUNT = TIME_SLOTS.length;
// Akşam satırları — YALNIZ lisansüstü görünümünde gösterilir
['18:00', '18:30', '19:00', '19:30', '20:00'].forEach((t) => TIME_SLOTS.push(t));

const EXAM_TYPES = [
  { value: 'vize', label: 'Vize', weeks: 1 },
  { value: 'final', label: 'Final', weeks: 2 },
  { value: 'but', label: 'Bütünleme', weeks: 1 },
];

// ── Seed Data: 14 Hoca ──
const SEED_PROFESSORS = window.SEED_PROFESSORS; // Shared component'ten geliyor

// ── Seed Data: Dersler ──
// donem: "guz" = Güz dönemi (tek dönemler: 1,3,5,7), "bahar" = Bahar dönemi (çift dönemler: 2,4,6,8)
const SEED_COURSES = [
  // ═══ 1. Sınıf ═══
  // — Güz (1. Dönem) —
  {
    code: 'FZK181',
    name: 'Fizik I (Şube 1)',
    sinif: 1,
    duration: 30,
    professor: 'Prof. Dr. Hamit ALYAR',
    donem: 'guz',
  },
  {
    code: 'FZK181',
    name: 'Fizik I (Şube 2)',
    sinif: 1,
    duration: 30,
    professor: 'Prof. Dr. Hamit ALYAR',
    donem: 'guz',
  },
  {
    code: 'MAT165',
    name: 'Matematik I (Şube 1)',
    sinif: 1,
    duration: 30,
    professor: 'Dr. Öğr. Üyesi Esma Baran ÖZKAN',
    donem: 'guz',
  },
  {
    code: 'MAT165',
    name: 'Matematik I (Şube 2)',
    sinif: 1,
    duration: 30,
    professor: 'Dr. Öğr. Üyesi Esma Baran ÖZKAN',
    donem: 'guz',
  },
  {
    code: 'BLM103',
    name: 'Programlamaya Giriş',
    sinif: 1,
    duration: 30,
    professor: 'Dr. Öğr. Üyesi Taha ETEM',
    donem: 'guz',
  },
  {
    code: 'MAT241',
    name: 'Doğrusal Cebir (Şube 1-2)',
    sinif: 1,
    duration: 30,
    professor: 'Dr. Öğr. Üyesi Celalettin KAYA',
    donem: 'guz',
  },
  {
    code: 'BLM101',
    name: 'Bilgisayar Mühendisliğine Giriş',
    sinif: 1,
    duration: 30,
    professor: 'Dr. Öğr. Üyesi Seda ŞAHİN',
    donem: 'guz',
  },
  // — Bahar (2. Dönem) —
  { code: 'MAT162', name: 'Matematik II', sinif: 1, duration: 30, professor: '', donem: 'bahar' },
  { code: 'FIZ162', name: 'Genel Fizik II', sinif: 1, duration: 30, professor: '', donem: 'bahar' },
  {
    code: 'ATA102',
    name: 'Atatürk İlkeleri ve İnkılap Tarihi II',
    sinif: 1,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  { code: 'TDI102', name: 'Türk Dili II', sinif: 1, duration: 30, professor: '', donem: 'bahar' },
  {
    code: 'BIL132',
    name: 'Bilgisayar Programlama II',
    sinif: 1,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  {
    code: 'MAT142',
    name: 'Ayrık Matematik ve Uygulamaları',
    sinif: 1,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },

  // ═══ 2. Sınıf ═══
  // — Güz (3. Dönem) —
  {
    code: 'BIL113',
    name: 'Web Programlama',
    sinif: 2,
    duration: 30,
    professor: 'Dr. Öğr. Üyesi Fatih ISSI',
    donem: 'guz',
  },
  {
    code: 'BLM205',
    name: 'İşletim Sistemleri',
    sinif: 2,
    duration: 30,
    professor: 'Doç. Dr. Selim BÜYÜKOĞLU',
    donem: 'guz',
  },
  {
    code: 'BLM209',
    name: 'Veritabanı Yönetim Sistemleri / BIL303',
    sinif: 2,
    duration: 30,
    professor: 'Dr. Öğr. Üyesi Fatih ISSI',
    donem: 'guz',
  },
  {
    code: 'BLM203',
    name: 'Veri Yapıları',
    sinif: 2,
    duration: 30,
    professor: 'Dr. Öğr. Üyesi Taha ETEM',
    donem: 'guz',
  },
  {
    code: 'MAT242',
    name: 'Diferansiyel Denklemler',
    sinif: 2,
    duration: 30,
    professor: 'Prof. Dr. İlyas İNCİ',
    donem: 'guz',
  },
  {
    code: 'BLM201',
    name: 'Nesneye Yönelik Programlama',
    sinif: 2,
    duration: 30,
    professor: 'Doç. Dr. Selim BÜYÜKOĞLU',
    donem: 'guz',
  },
  {
    code: 'IST235',
    name: 'Olasılık ve İstatistik',
    sinif: 2,
    duration: 30,
    professor: 'Dr. Uğur BİNZAT',
    donem: 'guz',
  },
  {
    code: 'BIL231',
    name: 'Bilgisayar Mühendisliğinde Mesleki İngilizce',
    sinif: 2,
    duration: 30,
    professor: 'Dr. Alime YILMAZ',
    donem: 'guz',
  },
  // — Bahar (4. Dönem) —
  {
    code: 'BIL202',
    name: 'Algoritma ve Veri Yapıları II',
    sinif: 2,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  {
    code: 'BIL206',
    name: 'Elektrik ve Elektronik Devrelerinin Temelleri',
    sinif: 2,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  {
    code: 'BIL212',
    name: 'Olasılık Teorisi ve İstatistik',
    sinif: 2,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },

  // ═══ 3. Sınıf ═══
  // — Güz (5. Dönem) —
  {
    code: 'BIL301',
    name: 'Mikroişlemciler',
    sinif: 3,
    duration: 30,
    professor: 'Dr. Selim SÜRÜCÜ',
    donem: 'guz',
  },
  {
    code: 'BIL303',
    name: 'Veritabanı Sistemleri',
    sinif: 3,
    duration: 30,
    professor: '',
    donem: 'guz',
  },
  {
    code: 'BIL305',
    name: 'Bilgisayar Ağları',
    sinif: 3,
    duration: 30,
    professor: 'Dr. Mehmet Akif ALPER',
    donem: 'guz',
  },
  {
    code: 'BIL307',
    name: 'Yazılım Mühendisliği',
    sinif: 3,
    duration: 30,
    professor: 'Dr. Öğr. Üyesi Osman GÜLER',
    donem: 'guz',
  },
  // — Bahar (6. Dönem) —
  {
    code: 'BIL308',
    name: 'Bilgisayar Mimarisi ve Organizasyonu',
    sinif: 3,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  {
    code: 'BIL312',
    name: 'Web Tasarımı ve Programlama',
    sinif: 3,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  {
    code: 'BIL314',
    name: 'Otomata Teorisi ve Formal Diller',
    sinif: 3,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },

  // ═══ 4. Sınıf ═══
  // — Güz (7. Dönem) —
  {
    code: 'BIL425',
    name: 'Derin Öğrenme',
    sinif: 4,
    duration: 30,
    professor: 'Doç. Dr. Selim BÜYÜKOĞLU',
    donem: 'guz',
  },
  {
    code: 'BIL401',
    name: 'Bilgisayar Projesi I',
    sinif: 4,
    duration: 30,
    professor: 'Dr. Öğr. Üyesi Fatih ISSI',
    donem: 'guz',
  },
  {
    code: 'BIL325',
    name: 'Mobil Programlama',
    sinif: 4,
    duration: 30,
    professor: 'Dr. Öğr. Üyesi Osman GÜLER',
    donem: 'guz',
  },
  {
    code: 'BIL403',
    name: 'Yapay Zeka',
    sinif: 4,
    duration: 30,
    professor: 'Dr. Öğr. Üyesi Taha ETEM',
    donem: 'guz',
  },
  {
    code: 'BIL473',
    name: 'Bilgi Güvenliği',
    sinif: 4,
    duration: 30,
    professor: 'Dr. Mehmet Akif ALPER',
    donem: 'guz',
  },
  {
    code: 'BIL432',
    name: 'Görüntü İşleme',
    sinif: 4,
    duration: 30,
    professor: 'Dr. Öğr. Üyesi Seda ŞAHİN',
    donem: 'guz',
  },
  {
    code: 'BIL466',
    name: 'Girişimcilik',
    sinif: 4,
    duration: 30,
    professor: 'Dr. Öğr. Üyesi Osman GÜLER',
    donem: 'guz',
  },
  // — Bahar (8. Dönem) —
  {
    code: 'BIL482',
    name: 'Yönetim Bilişim Sistemleri',
    sinif: 4,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  {
    code: 'BIL494',
    name: 'Bitirme Projesi',
    sinif: 4,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },

  // ═══ Bölüm Seçmeli Dersler (Sınıf 5 - Seçmeli) ═══
  {
    code: 'BIL432',
    name: 'Kriptografi ve Bilgi Güvenliği',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'guz',
  },
  {
    code: 'BIL325',
    name: 'Siber Güvenliğe Giriş',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'guz',
  },
  {
    code: 'BIL466',
    name: 'Biyobilişim ve Biyoteknoloji',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'guz',
  },
  {
    code: 'BIL323',
    name: 'Sayısal İşaret İşleme',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'guz',
  },
  {
    code: 'MTH401',
    name: 'Java & React JS ile Web Programlama Eğitimi',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'guz',
  },
  { code: 'BIL321', name: 'Makine Öğrenmesi', sinif: 5, duration: 30, professor: '', donem: 'guz' },
  {
    code: 'BIL411',
    name: 'Sistem Mühendisliği',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'guz',
  },
  {
    code: 'BIL412',
    name: 'İnsan Bilgisayar Etkileşimi',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'guz',
  },
  {
    code: 'BIL421',
    name: 'E-Ticaret ve Dijital Dönüşüm',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'guz',
  },
  {
    code: 'BIL425',
    name: 'Mobil Uygulama Geliştirme',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  {
    code: 'BIL427',
    name: 'Oyun Teknolojileri',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  {
    code: 'BIL434',
    name: 'Gömülü Sistemler',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  {
    code: 'BIL462',
    name: 'Bulut Çözüme Giriş',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  {
    code: 'BIL471',
    name: 'Sayısal Analiz Yöntemleri',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  {
    code: 'BIL473',
    name: 'Bilgisayarlı Görme',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  {
    code: 'BIL476',
    name: 'Veri Madenciliğine Giriş',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  { code: 'BIL477', name: 'Örüntü Tanıma', sinif: 5, duration: 30, professor: '', donem: 'bahar' },
  { code: 'BIL481', name: 'Yapay Zeka', sinif: 5, duration: 30, professor: '', donem: 'bahar' },
  {
    code: 'BIL483',
    name: 'Çoklu Ortam Sistemleri',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  { code: 'BIL486', name: 'Optimizasyon', sinif: 5, duration: 30, professor: '', donem: 'bahar' },
  {
    code: 'BIL493',
    name: 'Gerçek Zamanlı Sistemler',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  {
    code: 'BIL496',
    name: 'Sinyal İşleme Uygulamaları',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'bahar',
  },
  {
    code: 'OSD144',
    name: 'Siber Güvenlik ve Etik Hacker',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'guz',
  },
  {
    code: 'MTH404',
    name: 'Yazılım Test ve Kalitesi',
    sinif: 5,
    duration: 30,
    professor: '',
    donem: 'guz',
  },
  { code: 'BIL438', name: 'Görüntü İşleme', sinif: 5, duration: 30, professor: '', donem: 'bahar' },
  { code: 'BIL474', name: 'Tıp Bilişimi', sinif: 5, duration: 30, professor: '', donem: 'bahar' },
];

// ── Helper Functions ──
function formatDate(d) {
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatDateISO(d) {
  if (!d) return '';
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}

function parseDateISO(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getDayName(d) {
  const names = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  return names[d.getDay()];
}

function getDayNameShort(d) {
  const names = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
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
    if (d.getDay() >= 1 && d.getDay() <= 5) {
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

// ── API Read helpers (MongoDB üzerinden) ──
// apiRead kullanan yardımcılar
// Eski ref-tabanlı çağrılar için uyumluluk katmanı
function apiQueryHelper(collection) {
  return {
    _collection: collection,
    _filters: [],
    _limitVal: 0,
    where(field, op, value) {
      const clone = apiQueryHelper(this._collection);
      clone._filters = [...this._filters, { field, op, value }];
      clone._limitVal = this._limitVal;
      return clone;
    },
    limit(n) {
      const clone = apiQueryHelper(this._collection);
      clone._filters = [...this._filters];
      clone._limitVal = n;
      return clone;
    },
    async get() {
      const params = {};
      if (this._filters.length > 0) {
        params.where = this._filters.map((f) => `${f.field}:eq:${f.value}`);
      }
      if (this._limitVal > 0) params.limit = this._limitVal;
      const docs = await window.apiRead(this._collection, params);
      return {
        empty: docs.length === 0,
        docs: docs.map((d) => ({
          id: d.id,
          data: () => d,
          exists: true,
        })),
      };
    },
    doc(docId) {
      const col = this._collection;
      return {
        async get() {
          const result = await window.apiReadDoc(col, docId);
          return {
            exists: result.exists,
            id: result.id || docId,
            data: () => result.data,
          };
        },
      };
    },
  };
}

function getExamsRef() {
  return apiQueryHelper('sinav_programi');
}
function getCoursesRef() {
  return apiQueryHelper('sinav_dersler');
}
function getProfessorsRef() {
  return apiQueryHelper('professors');
}
function getPeriodsRef() {
  return apiQueryHelper('sinav_donemler');
}
function getDepartmentsRef() {
  return apiQueryHelper('departments');
}
function getDeptClassroomsRef() {
  return apiQueryHelper('department_classrooms');
}
// getDeptSupervisorsRef kaldırıldı — gözetmenler artık professors koleksiyonundan roles ile filtrelenir

// ══════════════════════════════════════════════════════════════
// Period Config Modal
// ══════════════════════════════════════════════════════════════
const PeriodConfigModal = ({ period, onSave, onClose, departmentId, seviye = 'lisans' }) => {
  const [examType, setExamType] = useState(period?.examType || 'final');
  const [startDate, setStartDate] = useState(period?.startDate || '');
  const [semester, setSemester] = useState(period?.semester || 'Güz 2024-2025');
  const [saving, setSaving] = useState(false);

  const selectedType = EXAM_TYPES.find((t) => t.value === examType);
  const endDate = useMemo(() => {
    if (!startDate || !selectedType) return '';
    const d = parseDateISO(startDate);
    d.setDate(d.getDate() + selectedType.weeks * 7 - 1);
    return formatDateISO(d);
  }, [startDate, selectedType]);

  const handleSave = async () => {
    if (!startDate) return alert('Başlangıç tarihi seçin');
    setSaving(true);
    try {
      const data = {
        examType,
        semester,
        startDate,
        endDate,
        weeks: selectedType.weeks,
        label: `${selectedType.label} - ${semester}`,
        departmentId: departmentId || null,
        seviye: period?.seviye || seviye,
      };
      if (period?.id) {
        await DBWrite.update('sinav_donemler', period.id, data);
      } else {
        await DBWrite.add('sinav_donemler', data);
      }
      onSave();
    } catch (e) {
      console.error('Period save error:', e);
      alert('Kayıt hatası: ' + e.message);
    }
    setSaving(false);
  };

  return (
    <Modal
      open={true}
      title={period?.id ? 'Dönemi Düzenle' : 'Yeni Sınav Dönemi'}
      onClose={onClose}
      width={500}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="Dönem">
          <Select value={semester} onChange={(e) => setSemester(e.target.value)}>
            {(() => {
              const semList = [];
              for (let y = 2024; y <= 2030; y++) {
                semList.push(`Güz ${y}-${y + 1}`);
                semList.push(`Bahar ${y}-${y + 1}`);
              }
              return semList;
            })().map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Sınav Türü">
          <Select value={examType} onChange={(e) => setExamType(e.target.value)}>
            {EXAM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} ({t.weeks} hafta)
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Başlangıç Tarihi">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </FormField>
        {endDate && (
          <div style={{ padding: 12, background: C.blueLight, borderRadius: 8, fontSize: 14 }}>
            Bitiş Tarihi: <strong>{formatDate(parseDateISO(endDate))}</strong> ({selectedType.weeks}{' '}
            hafta)
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <GhostBtn onClick={onClose}>İptal</GhostBtn>
          <Btn onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// Edit Exam Modal
// ══════════════════════════════════════════════════════════════
// ── Ortak oturum bilgisi (düzenleme penceresinde) ──
const OrtakOturumBilgisi = ({ exam, grup, onAyir }) => {
  const SB = window.SinavBirlesim;
  const ozet = SB.oturumOzeti(grup);
  return (
    <div
      style={{
        border: '1.5px dashed #0F766E',
        background: '#F0FDFA',
        borderRadius: 8,
        padding: '10px 12px',
        fontSize: 12.5,
        color: '#134E4A',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        Ortak sınav — {grup.length} ders, toplam {ozet.toplamOgrenci} öğrenci
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        {grup.map((u) => (
          <div key={u.id} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <b>{u.code}</b>
            <span>{u.name}</span>
            <span style={{ opacity: 0.75 }}>
              · {u.sinif === 5 ? 'Seçmeli' : u.sinif + '. sınıf'} · {u.studentCount || 0} öğr.
              {u.professor ? ' · ' + u.professor : ''}
            </span>
            {u.id !== exam.id && (
              <span style={{ fontSize: 11, color: '#0F766E', fontWeight: 600 }}>
                ({SB.ILISKILER[SB.birlesimIliskisi(exam, u)].etiket})
              </span>
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, marginTop: 8, opacity: 0.85, lineHeight: 1.5 }}>
        Salon toplam öğrenci sayısına göre bir kez seçilir; gözetmenler oturumun tamamı için atanır.
        Salon ya da gözetmen değişikliği bütün derslere uygulanır.
      </div>
      {onAyir && (
        <button
          type="button"
          onClick={onAyir}
          style={{
            marginTop: 8,
            padding: '5px 12px',
            borderRadius: 6,
            border: '1px solid #0F766E',
            background: 'white',
            color: '#0F766E',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Bu dersi ortak oturumdan ayır
        </button>
      )}
    </div>
  );
};

// ── Aynı saate ders bırakıldığında ──
// Saat doluysa ne yapılacağını kullanıcı seçer. Sistem ilişkiyi tanır
// (aynı dersin şubeleri / aynı ad farklı kod / farklı ders) ve birleştirmeyi
// önerir; aynı sınıfın öğrencileri iki ayrı sınava giremeyeceği için o
// durumda "ayrı ekle" kapalıdır.
const AyniSaatPenceresi = ({
  ders,
  tarih,
  saat,
  karar,
  birlestirebilir,
  onBirlestir,
  onAyriEkle,
  onClose,
}) => {
  const SB = window.SinavBirlesim;
  const [mesgul, setMesgul] = useState(false);
  const calistir = async (fn) => {
    setMesgul(true);
    try {
      await fn();
    } finally {
      setMesgul(false);
    }
  };
  const renk = SINIF_COLORS[ders.sinif] || SINIF_COLORS[1];
  return (
    <Modal open={true} title="Bu saatte başka sınav var" onClose={onClose} width={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            padding: 10,
            background: renk.bg,
            color: renk.text,
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <b>{ders.code}</b> — {ders.name}
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
            {ders.sinif === 5 ? 'Seçmeli' : ders.sinif + '. sınıf'} · {ders.studentCount || 0}{' '}
            öğrenci{ders.professor ? ' · ' + ders.professor : ''} · {tarih} {saat}
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: '#4B5563', lineHeight: 1.55 }}>
          Birlikte yapılacaksa (aynı dersin şubeleri, farklı sınıf ya da müfredattaki karşılığı,
          ortak salonda yapılacak dersler) <b>ortak sınav</b> olarak birleştirin: salon toplam
          öğrenci sayısına göre bir kez seçilir, gözetmenler oturumun tamamına atanır ve dersler
          birbiriyle çakışma sayılmaz.
        </div>

        {karar.oturumlar.map((o) => {
          const iliski = SB.ILISKILER[o.iliski];
          return (
            <div
              key={o.anahtar}
              data-secenek={o.anahtar}
              style={{
                border: '1px solid ' + (o.iliski === 'farkli' ? '#E5E7EB' : '#99F6E4'),
                background: o.iliski === 'farkli' ? 'white' : '#F0FDFA',
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>
                  {o.uyeler.length > 1 ? 'Ortak sınav: ' : ''}
                  {o.ozet.kodlar.join(' + ')}{' '}
                  <span style={{ fontWeight: 500, color: '#6B7280' }}>({o.ozet.timeSlot})</span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: o.iliski === 'farkli' ? '#6B7280' : '#0F766E',
                  }}
                >
                  {iliski.etiket}
                </span>
              </div>
              {o.uyeler.map((u) => (
                <div key={u.id} style={{ fontSize: 12, color: '#4B5563', marginTop: 3 }}>
                  {u.code} {u.name} · {u.sinif === 5 ? 'Seçmeli' : u.sinif + '. sınıf'} ·{' '}
                  {u.studentCount || 0} öğr.{u.professor ? ' · ' + u.professor : ''}
                </div>
              ))}
              <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 5 }}>
                {iliski.aciklama} Birleşince toplam{' '}
                <b>{o.ozet.toplamOgrenci + (Number(ders.studentCount) || 0)} öğrenci</b>.
                {o.ayniSinif ? ' Aynı sınıfın öğrencileri bu sınavda.' : ''}
              </div>
              <div style={{ marginTop: 8 }}>
                {o.zatenVar ? (
                  <span style={{ fontSize: 12, color: '#B45309', fontWeight: 600 }}>
                    Bu ders zaten bu oturumda.
                  </span>
                ) : birlestirebilir ? (
                  <Btn onClick={() => calistir(() => onBirlestir(o))} disabled={mesgul}>
                    Bununla ortak sınav yap
                  </Btn>
                ) : (
                  <span style={{ fontSize: 12, color: '#6B7280' }}>
                    Birleştirmeyi bölüm yetkilisi yapar.
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {!karar.ayriEklenebilir && (
          <div
            style={{
              fontSize: 12.5,
              color: '#991B1B',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              padding: '8px 12px',
            }}
          >
            {karar.engel}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GhostBtn onClick={onClose}>İptal</GhostBtn>
          <GhostBtn
            onClick={() => calistir(onAyriEkle)}
            disabled={!karar.ayriEklenebilir || mesgul}
          >
            Ayrı sınav olarak ekle
          </GhostBtn>
        </div>
      </div>
    </Modal>
  );
};

const EditExamModal = ({
  exam,
  grup = [],
  onAyir,
  professors,
  onSave,
  onRemove,
  onClose,
  readOnly = false,
}) => {
  const [studentCount, setStudentCount] = useState(exam?.studentCount || '');
  const [supervisor, setSupervisor] = useState(exam?.supervisor || '');
  const [room, setRoom] = useState(exam?.room || '');
  const [duration, setDuration] = useState(exam?.duration || 30);
  const [professor, setProfessor] = useState(exam?.professor || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (readOnly) return;
    if (!studentCount || parseInt(studentCount) <= 0) {
      alert('Öğrenci sayısı girilmesi zorunludur.');
      return;
    }
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
      alert('Hata: ' + e.message);
    }
    setSaving(false);
  };

  return (
    <Modal
      open={true}
      title={readOnly ? 'Sınav Detayları (Salt Okunur)' : 'Sınav Detaylarını Düzenle'}
      onClose={onClose}
      width={500}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            padding: 12,
            background: SINIF_COLORS[exam.sinif]?.bg || '#f0f0f0',
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          <strong>{exam.code}</strong> - {exam.name}
        </div>
        {grup.length > 1 && (
          <OrtakOturumBilgisi
            exam={exam}
            grup={grup}
            onAyir={
              !readOnly && onAyir
                ? async () => {
                    const ayniSinif = grup.some(
                      (u) => u.id !== exam.id && window.SinavBirlesim.ayniSinifMi(exam, u)
                    );
                    if (
                      !confirm(
                        'Bu sınav ortak oturumdan ayrılacak ve aynı saatte ayrı sınav olarak kalacak.' +
                          (ayniSinif
                            ? '\n\nOturumda aynı sınıftan başka ders var: ayrılınca çakışma olarak ' +
                              'işaretlenir; sınavı başka saate taşımanız gerekir.'
                            : '') +
                          '\n\nDevam edilsin mi?'
                      )
                    )
                      return;
                    await onAyir(exam);
                    onClose();
                  }
                : null
            }
          />
        )}
        {readOnly && (
          <div
            style={{
              padding: 8,
              background: '#FEF3C7',
              borderRadius: 6,
              fontSize: 12,
              color: '#92400E',
              textAlign: 'center',
            }}
          >
            Bu ders size ait değil. Sadece görüntüleyebilirsiniz.
          </div>
        )}
        <FormField label="Akademisyen">
          <Input
            value={professor}
            onChange={(e) => !readOnly && setProfessor(e.target.value)}
            placeholder="Akademisyen ismi"
            list="prof-list"
            readOnly={readOnly}
            style={readOnly ? { background: '#F3F4F6' } : {}}
          />
          {!readOnly && (
            <datalist id="prof-list">
              {(professors || []).map((p, i) => (
                <option key={i} value={p.name} />
              ))}
            </datalist>
          )}
        </FormField>

        {!readOnly && (
          <FormField label="Sınıf (Dersin ait olduğu sınıfı değiştirebilirsiniz)">
            <Select
              value={exam.sinif}
              onChange={(e) => onSave({ ...exam, sinif: parseInt(e.target.value) })}
            >
              {[1, 2, 3, 4].map((s) => (
                <option key={s} value={s}>
                  {s}. Sınıf
                </option>
              ))}
            </Select>
          </FormField>
        )}
        <FormField label="Sınav Süresi (dk)">
          <Select
            value={duration}
            onChange={(e) => !readOnly && setDuration(e.target.value)}
            disabled={readOnly}
            style={readOnly ? { background: '#F3F4F6' } : {}}
          >
            {[30, 45, 60, 75, 90, 105, 120, 150].map((d) => (
              <option key={d} value={d}>
                {d} dakika
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={readOnly ? 'Öğrenci Sayısı' : 'Öğrenci Sayısı *'}>
          <Input
            type="number"
            value={studentCount}
            onChange={(e) => !readOnly && setStudentCount(e.target.value)}
            placeholder="Örn: 45"
            readOnly={readOnly}
            style={
              readOnly
                ? { background: '#F3F4F6' }
                : !studentCount || parseInt(studentCount) <= 0
                  ? { borderColor: '#DC2626' }
                  : {}
            }
          />
          {!readOnly && (!studentCount || parseInt(studentCount) <= 0) && (
            <div style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>
              Öğrenci sayısı zorunludur
            </div>
          )}
        </FormField>
        <FormField label="Gözetmen">
          <Input
            value={supervisor}
            onChange={(e) => !readOnly && setSupervisor(e.target.value)}
            placeholder="Gözetmen adı"
            readOnly={readOnly}
            style={readOnly ? { background: '#F3F4F6' } : {}}
          />
        </FormField>
        <FormField label="Sınıf / Salon">
          <Input
            value={room}
            onChange={(e) => !readOnly && setRoom(e.target.value)}
            placeholder="Örn: D-201"
            readOnly={readOnly}
            style={readOnly ? { background: '#F3F4F6' } : {}}
          />
        </FormField>
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: readOnly ? 'flex-end' : 'space-between',
            marginTop: 8,
          }}
        >
          {!readOnly && (
            <GhostBtn
              onClick={() => {
                onRemove(exam);
                onClose();
              }}
              style={{ color: '#DC2626' }}
            >
              Takvimden Kaldır
            </GhostBtn>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <GhostBtn onClick={onClose}>{readOnly ? 'Kapat' : 'İptal'}</GhostBtn>
            {!readOnly && (
              <Btn
                onClick={handleSave}
                disabled={saving || !studentCount || parseInt(studentCount) <= 0}
              >
                {saving ? '...' : 'Kaydet'}
              </Btn>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// Course Management Modal
// ══════════════════════════════════════════════════════════════
const _CourseManagementModal = ({ courses, professors, onSave, onDelete, onClose }) => {
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    sinif: 1,
    duration: 30,
    professor: '',
    donem: 'guz',
  });

  const startEdit = (c) => {
    setEditingCourse(c);
    setForm({
      code: c.code,
      name: c.name,
      sinif: c.sinif,
      duration: c.duration,
      professor: c.professor,
      donem: c.donem || 'guz',
    });
  };

  const startNew = () => {
    setEditingCourse('new');
    setForm({ code: '', name: '', sinif: 1, duration: 30, professor: '', donem: 'guz' });
  };

  const handleSave = () => {
    if (!form.code || !form.name) return alert('Ders kodu ve adı gerekli');
    onSave(editingCourse === 'new' ? null : editingCourse, form);
    setEditingCourse(null);
  };

  return (
    <Modal open={true} title="Ders Yönetimi" onClose={onClose} width={800}>
      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.bg }}>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                Kod
              </th>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                Ders Adı
              </th>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                Sınıf
              </th>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                Dönem
              </th>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                Süre
              </th>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                Akademisyen
              </th>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                İşlem
              </th>
            </tr>
          </thead>
          <tbody>
            {[...courses]
              .sort((a, b) => {
                if (a.sinif !== b.sinif) return a.sinif - b.sinif;
                return a.code.localeCompare(b.code);
              })
              .map((c, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '8px 12px' }}>
                    <Badge
                      style={{
                        background: SINIF_COLORS[c.sinif]?.bg,
                        color: SINIF_COLORS[c.sinif]?.text,
                      }}
                    >
                      {c.code}
                    </Badge>
                  </td>
                  <td style={{ padding: '8px 12px' }}>{c.name}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    {c.sinif === 5 ? 'Seçmeli' : `${c.sinif}. Sınıf`}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <Badge
                      style={{
                        background: c.donem === 'bahar' ? '#C8E6C9' : '#BBDEFB',
                        color: c.donem === 'bahar' ? '#1B5E20' : '#0D47A1',
                        fontSize: 11,
                      }}
                    >
                      {c.donem === 'bahar' ? 'Bahar' : 'Güz'}
                    </Badge>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>{c.duration} dk</td>
                  <td style={{ padding: '8px 12px', fontSize: 12 }}>{c.professor || '-'}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button
                        onClick={() => startEdit(c)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: C.blue,
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => onDelete(c)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#DC2626',
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {editingCourse && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: C.bg,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {editingCourse === 'new' ? 'Yeni Ders' : 'Dersi Düzenle'}
          </div>
          <div
            className="responsive-grid-2"
            style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}
          >
            <FormField label="Ders Kodu">
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </FormField>
            <FormField label="Ders Adı">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
          </div>
          <div
            className="responsive-grid-4"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: 12 }}
          >
            <FormField label="Sınıf">
              <Select
                value={form.sinif}
                onChange={(e) => setForm({ ...form, sinif: parseInt(e.target.value) })}
              >
                {[1, 2, 3, 4, 5].map((s) => (
                  <option key={s} value={s}>
                    {s === 5 ? 'Seçmeli' : `${s}. Sınıf`}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Dönem">
              <Select
                value={form.donem}
                onChange={(e) => setForm({ ...form, donem: e.target.value })}
              >
                <option value="guz">Güz</option>
                <option value="bahar">Bahar</option>
              </Select>
            </FormField>
            <FormField label="Süre (dk)">
              <Select
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) })}
              >
                {[30, 45, 60, 75, 90, 105, 120, 150].map((d) => (
                  <option key={d} value={d}>
                    {d} dk
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Akademisyen">
              <Input
                value={form.professor}
                onChange={(e) => setForm({ ...form, professor: e.target.value })}
                placeholder="Akademisyen ismi yazın..."
                list="course-prof-list"
              />
              <datalist id="course-prof-list">
                {professors.map((p, i) => (
                  <option key={i} value={p.name} />
                ))}
              </datalist>
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <GhostBtn onClick={() => setEditingCourse(null)}>İptal</GhostBtn>
            <Btn onClick={handleSave}>Kaydet</Btn>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
        <GhostBtn onClick={startNew}>+ Yeni Ders Ekle</GhostBtn>
        <GhostBtn onClick={onClose}>Kapat</GhostBtn>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// Draggable Course Card (in pool)
// ══════════════════════════════════════════════════════════════
const DraggableCourseCard = ({ course, isPlaced: _isPlaced, placedCount = 0, canDrag = true }) => {
  const color = SINIF_COLORS[course.sinif] || SINIF_COLORS[1];

  const handleDragStart = (e) => {
    if (!canDrag) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/json', JSON.stringify(course));
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };

  return (
    <div
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        padding: '8px 10px',
        background: canDrag ? color.bg : '#F3F4F6',
        color: canDrag ? color.text : '#9CA3AF',
        borderRadius: 6,
        fontSize: 12,
        cursor: canDrag ? 'grab' : 'default',
        border: `1px solid ${canDrag ? color.text + '30' : '#E5E7EB'}`,
        transition: 'all 0.2s',
        userSelect: 'none',
        position: 'relative',
        opacity: canDrag ? 1 : 0.6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 12 }}>{course.code}</div>
        {placedCount > 0 && (
          <span
            style={{
              background: canDrag ? color.text : '#9CA3AF',
              color: 'white',
              borderRadius: 10,
              padding: '1px 6px',
              fontSize: 9,
              fontWeight: 700,
              minWidth: 16,
              textAlign: 'center',
            }}
          >
            {placedCount}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, marginTop: 2, lineHeight: 1.3 }}>{course.name}</div>
      <div style={{ fontSize: 10, marginTop: 3, opacity: 0.7 }}>
        {course.duration} dk{course.professor && !canDrag ? ` - ${course.professor}` : ''}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// Calendar Grid Cell
// ══════════════════════════════════════════════════════════════
// Bir günün sınavlarını ZAMAN BLOKLARINA ayırır: saatleri örtüşen sınavlar
// aynı bloktadır. Hücre bloğun ilk yarım saatinde çizilir ve bloğun sonuna
// kadar uzar; bloktaki bütün sınavlar (şubeler, farklı sınıflar, ortak
// oturumlar) içinde listelenir. Eskiden hücre yalnız İLK sınavı gösteriyordu:
// aynı saate konan ikinci ders takvimde hiç görünmüyordu.
function gunBloklari(gununSinavlari) {
  const l = [...gununSinavlari]
    .map((e) => {
      const bas = timeToSlotIndex(e.timeSlot);
      return { e, bas, bit: bas + Math.max(1, slotSpan(Number(e.duration) || 60)) };
    })
    .sort((a, b) => a.bas - b.bas || a.bit - b.bit);
  const bloklar = [];
  l.forEach((x) => {
    const son = bloklar[bloklar.length - 1];
    if (son && x.bas < son.bit) {
      son.bit = Math.max(son.bit, x.bit);
      son.sinavlar.push(x.e);
    } else bloklar.push({ bas: x.bas, bit: x.bit, sinavlar: [x.e] });
  });
  return bloklar;
}

const CalendarCell = ({
  day,
  timeSlot,
  slotIndex,
  placedExams,
  onDrop,
  onExamClick,
  totalSlots: _totalSlots,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const dateStr = formatDateISO(day);
  const SB = window.SinavBirlesim || {};

  const bloklar = gunBloklari(placedExams.filter((e) => e.date === dateStr));
  const blok = bloklar.find((b) => slotIndex >= b.bas && slotIndex < b.bit);
  if (blok && blok.bas !== slotIndex) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const courseData = JSON.parse(e.dataTransfer.getData('application/json'));
      // Dolu bloğa bırakılan ders bloğun başlangıç saatine gelir; birleştirme
      // ya da ayrı ekleme kararı handleDrop'taki pencerede verilir.
      onDrop(courseData, dateStr, blok ? blok.sinavlar[0].timeSlot : timeSlot);
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const cellHeight = 40;
  const span = blok ? blok.bit - blok.bas : 1;
  const oturumlar = blok && SB.oturumlar ? SB.oturumlar(blok.sinavlar) : [];
  // Birleştirilmemiş aynı sınıf örtüşmesi: aynı öğrenciler iki sınava birden
  // giremez — hücre kırmızı çerçeveyle işaretlenir.
  const sinifCakismasi =
    !!blok &&
    oturumlar.some((a, i) =>
      oturumlar
        .slice(i + 1)
        .some((b) =>
          a.uyeler.some((x) => b.uyeler.some((y) => SB.zamanOrtusur(x, y) && SB.ayniSinifMi(x, y)))
        )
    );
  const tekRenk = blok ? SINIF_COLORS[blok.sinavlar[0].sinif] || SINIF_COLORS[1] : null;
  const coklu = !!blok && blok.sinavlar.length > 1;

  return (
    <td
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={blok && !coklu ? () => onExamClick(blok.sinavlar[0]) : undefined}
      rowSpan={span}
      data-tarih={dateStr}
      data-saat={timeSlot}
      data-blok={blok ? blok.sinavlar.length : 0}
      style={{
        border: sinifCakismasi ? '2px solid #DC2626' : '1px solid #E5E7EB',
        padding: 0,
        height: cellHeight * span,
        minWidth: 100,
        maxWidth: 'none',
        verticalAlign: 'top',
        background: dragOver ? '#DBEAFE' : blok ? (coklu ? '#F8FAFC' : tekRenk.bg) : 'white',
        cursor: blok && !coklu ? 'pointer' : 'default',
        transition: 'background 0.15s',
        position: 'relative',
      }}
    >
      {blok && !coklu && (
        <div
          style={{
            padding: '3px 5px',
            fontSize: 10,
            lineHeight: 1.3,
            color: tekRenk.text,
            height: '100%',
            overflow: 'hidden',
            fontWeight: 600,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div>{blok.sinavlar[0].code}</div>
          <div style={{ fontWeight: 400, fontSize: 9 }}>{blok.sinavlar[0].name}</div>
          {blok.sinavlar[0].studentCount > 0 && (
            <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>
              {blok.sinavlar[0].studentCount} öğrenci
            </div>
          )}
        </div>
      )}
      {coklu && (
        <div style={{ padding: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {sinifCakismasi && (
            <div
              title="Aynı sınıfın öğrencileri aynı saatte iki ayrı sınavda. Birleştirin ya da birini başka saate alın."
              style={{ fontSize: 9, fontWeight: 700, color: '#DC2626', textAlign: 'center' }}
            >
              ⚠ Aynı sınıf çakışıyor
            </div>
          )}
          {oturumlar.map(({ anahtar, uyeler }) => {
            const ortak = uyeler.length > 1;
            const ozet = SB.oturumOzeti ? SB.oturumOzeti(uyeler) : null;
            return (
              <div
                key={anahtar}
                data-oturum={ortak ? 'ortak' : 'tek'}
                style={{
                  border: ortak ? '1.5px dashed #0F766E' : 'none',
                  borderRadius: 5,
                  padding: ortak ? 2 : 0,
                  background: ortak ? '#F0FDFA' : 'transparent',
                }}
              >
                {ortak && (
                  <div
                    style={{ fontSize: 8.5, fontWeight: 700, color: '#0F766E', padding: '0 2px' }}
                  >
                    Ortak sınav · {ozet ? ozet.toplamOgrenci : ''} öğr.
                  </div>
                )}
                {uyeler.map((u) => {
                  const r = SINIF_COLORS[u.sinif] || SINIF_COLORS[1];
                  return (
                    <div
                      key={u.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onExamClick(u);
                      }}
                      title={`${u.code} — ${u.name}${u.professor ? ' · ' + u.professor : ''}`}
                      style={{
                        background: r.bg,
                        color: r.text,
                        borderRadius: 4,
                        padding: '2px 4px',
                        marginTop: 2,
                        fontSize: 9.5,
                        lineHeight: 1.25,
                        cursor: 'pointer',
                        overflow: 'hidden',
                      }}
                    >
                      <b>{u.code}</b>
                      {u.timeSlot !== blok.sinavlar[0].timeSlot ? ' · ' + u.timeSlot : ''}
                      <span style={{ opacity: 0.75 }}>
                        {' '}
                        · {u.sinif === 5 ? 'Seç.' : u.sinif + '. sınıf'}
                        {u.studentCount > 0 ? ' · ' + u.studentCount : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
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
    <div
      className="responsive-table-wrap"
      style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
        <thead>
          <tr style={{ background: '#1B2A4A', color: 'white' }}>
            <th
              style={{
                padding: '10px 12px',
                textAlign: 'center',
                borderRight: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Sınıf
            </th>
            <th
              style={{
                padding: '10px 12px',
                textAlign: 'left',
                borderRight: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Ders Kodu - İsmi
            </th>
            <th
              style={{
                padding: '10px 12px',
                textAlign: 'left',
                borderRight: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              İlgili Öğretim Üyesi
            </th>
            <th
              style={{
                padding: '10px 12px',
                textAlign: 'center',
                borderRight: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Tarih - Saat - Süre
            </th>
            <th
              style={{
                padding: '10px 12px',
                textAlign: 'center',
                borderRight: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Öğrenci Sayısı
            </th>
            <th
              style={{
                padding: '10px 12px',
                textAlign: 'left',
                borderRight: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Gözetmen
            </th>
            <th style={{ padding: '10px 12px', textAlign: 'center' }}>Sınıf/Salon</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                Henüz takvime ders yerleştirilmedi. Sol panelden dersleri sürükleyip takvime
                bırakın.
              </td>
            </tr>
          )}
          {sorted.map((exam, i) => {
            const color = SINIF_COLORS[exam.sinif] || SINIF_COLORS[1];
            const dateObj = parseDateISO(exam.date);
            const dateStr = dateObj ? `${formatDate(dateObj)} ${getDayName(dateObj)}` : '';
            return (
              <tr
                key={i}
                onClick={() => onExamClick(exam)}
                style={{
                  background: i % 2 === 0 ? 'white' : '#F9FAFB',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${C.border}`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = color.bg + '60')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#F9FAFB')
                }
              >
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <Badge style={{ background: color.bg, color: color.text, fontSize: 11 }}>
                    {color.label}
                  </Badge>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <strong>{exam.code}</strong> - {exam.name}
                  {exam.birlesimId && window.SinavBirlesim && (
                    <div style={{ fontSize: 11, color: '#0F766E', fontWeight: 600, marginTop: 2 }}>
                      Ortak sınav:{' '}
                      {window.SinavBirlesim.grupUyeleri(exam, placedExams)
                        .filter((u) => u.id !== exam.id)
                        .map((u) => u.code + (u.sinif !== exam.sinif ? ` (${u.sinif}. sınıf)` : ''))
                        .join(', ')}
                    </div>
                  )}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 12 }}>{exam.professor}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12 }}>
                  {dateStr}
                  <br />
                  {exam.timeSlot} ({exam.duration} dk)
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>
                  {exam.studentCount || '-'}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 12 }}>{exam.supervisor || '-'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>{exam.room || '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// Department Management Modal (Admin Only)
// ══════════════════════════════════════════════════════════════
const _DepartmentManagementModal = ({ departments, onSave, onDelete, onClose }) => {
  const [editingDept, setEditingDept] = useState(null);
  const [form, setForm] = useState({ name: '', managerNames: '' });
  const [saving, setSaving] = useState(false);

  const startEdit = (d) => {
    setEditingDept(d);
    const existing = d.managerNames || (d.managerName ? [d.managerName] : []);
    setForm({ name: d.name, managerNames: existing.join(', ') });
  };

  const startNew = () => {
    setEditingDept('new');
    setForm({ name: '', managerNames: '' });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Bölüm adı gerekli');
    setSaving(true);
    try {
      const managerNames = form.managerNames
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const saveData = { name: form.name.trim(), managerNames, managerName: managerNames[0] || '' };
      await onSave(editingDept === 'new' ? null : editingDept, saveData);
      setEditingDept(null);
    } catch (e) {
      alert('Hata: ' + e.message);
    }
    setSaving(false);
  };

  return (
    <Modal open={true} title="Bölüm Yönetimi" onClose={onClose} width={700}>
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.bg }}>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                Bölüm Adı
              </th>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                Yetkili Kişi
              </th>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                İşlem
              </th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d, i) => (
              <tr key={d.id || i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{d.name}</td>
                <td style={{ padding: '8px 12px' }}>
                  {d.managerNames?.join(', ') || d.managerName || (
                    <span style={{ color: '#999' }}>Atanmadı</span>
                  )}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button
                      onClick={() => startEdit(d)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: C.blue,
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => onDelete(d)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#DC2626',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 30, textAlign: 'center', color: '#999' }}>
                  Henüz bölüm eklenmedi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingDept && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: C.bg,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {editingDept === 'new' ? 'Yeni Bölüm' : 'Bölümü Düzenle'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Bölüm Adı">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Örn: Kimya Mühendisliği"
              />
            </FormField>
            <FormField label="Yetkili Kişi(ler) (virgülle ayırın)">
              <Input
                value={form.managerNames}
                onChange={(e) => setForm({ ...form, managerNames: e.target.value })}
                placeholder="Örn: Dr. Ahmet YILMAZ, Dr. Ayşe KOÇ"
              />
            </FormField>
          </div>
          <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>
            Yetkili kişi, "Bölüm Yetkilisi" olarak giriş yaparak bu bölümü yönetebilir. Varsayılan
            şifre akademisyen şifresiyle aynıdır.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <GhostBtn onClick={() => setEditingDept(null)}>İptal</GhostBtn>
            <Btn onClick={handleSave} disabled={saving}>
              {saving ? '...' : 'Kaydet'}
            </Btn>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
        <GhostBtn onClick={startNew}>+ Yeni Bölüm Ekle</GhostBtn>
        <GhostBtn onClick={onClose}>Kapat</GhostBtn>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// Department Classroom Management Modal
// ══════════════════════════════════════════════════════════════
const _ClassroomManagementModal = ({ classrooms, onSave, onDelete, onClose }) => {
  const [editingRoom, setEditingRoom] = useState(null);
  const [form, setForm] = useState({ name: '', capacity: '' });
  const [saving, setSaving] = useState(false);

  const startEdit = (r) => {
    setEditingRoom(r);
    setForm({ name: r.name, capacity: r.capacity || '' });
  };

  const startNew = () => {
    setEditingRoom('new');
    setForm({ name: '', capacity: '' });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Sınıf adı gerekli');
    setSaving(true);
    try {
      await onSave(editingRoom === 'new' ? null : editingRoom, {
        name: form.name.trim(),
        capacity: parseInt(form.capacity) || 0,
      });
      setEditingRoom(null);
    } catch (e) {
      alert('Hata: ' + e.message);
    }
    setSaving(false);
  };

  return (
    <Modal open={true} title="Sınıf / Salon Yönetimi" onClose={onClose} width={600}>
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.bg }}>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                Sınıf/Salon Adı
              </th>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                Kapasite
              </th>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                İşlem
              </th>
            </tr>
          </thead>
          <tbody>
            {classrooms.map((r, i) => (
              <tr key={r.id || i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.name}</td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>{r.capacity || '-'}</td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button
                      onClick={() => startEdit(r)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: C.blue,
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => onDelete(r)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#DC2626',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {classrooms.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 30, textAlign: 'center', color: '#999' }}>
                  Henüz sınıf eklenmedi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingRoom && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: C.bg,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {editingRoom === 'new' ? 'Yeni Sınıf' : 'Sınıfı Düzenle'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <FormField label="Sınıf/Salon Adı">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Örn: M11101"
              />
            </FormField>
            <FormField label="Kapasite (kişi)">
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                placeholder="Örn: 42"
              />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <GhostBtn onClick={() => setEditingRoom(null)}>İptal</GhostBtn>
            <Btn onClick={handleSave} disabled={saving}>
              {saving ? '...' : 'Kaydet'}
            </Btn>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
        <GhostBtn onClick={startNew}>+ Yeni Sınıf Ekle</GhostBtn>
        <GhostBtn onClick={onClose}>Kapat</GhostBtn>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// Department Supervisor Management Modal
// ══════════════════════════════════════════════════════════════
const _SupervisorManagementModal = ({ supervisors, onSave, onDelete, onClose }) => {
  const [editingSup, setEditingSup] = useState(null);
  const [form, setForm] = useState({ name: '' });
  const [saving, setSaving] = useState(false);

  const startEdit = (s) => {
    setEditingSup(s);
    setForm({ name: s.name });
  };

  const startNew = () => {
    setEditingSup('new');
    setForm({ name: '' });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Gözetmen adı gerekli');
    setSaving(true);
    try {
      await onSave(editingSup === 'new' ? null : editingSup, { name: form.name.trim() });
      setEditingSup(null);
    } catch (e) {
      alert('Hata: ' + e.message);
    }
    setSaving(false);
  };

  return (
    <Modal open={true} title="Gözetmen Yönetimi" onClose={onClose} width={500}>
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {supervisors.map((s, i) => (
          <div
            key={s.id || i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <span style={{ fontWeight: 500 }}>{s.name}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => startEdit(s)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: C.blue,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Düzenle
              </button>
              <button
                onClick={() => onDelete(s)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#DC2626',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Sil
              </button>
            </div>
          </div>
        ))}
        {supervisors.length === 0 && (
          <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>
            Henüz gözetmen eklenmedi
          </div>
        )}
      </div>

      {editingSup && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: C.bg,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {editingSup === 'new' ? 'Yeni Gözetmen' : 'Gözetmeni Düzenle'}
          </div>
          <FormField label="Ad Soyad">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Örn: Arş. Gör. Ahmet YILMAZ"
            />
          </FormField>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <GhostBtn onClick={() => setEditingSup(null)}>İptal</GhostBtn>
            <Btn onClick={handleSave} disabled={saving}>
              {saving ? '...' : 'Kaydet'}
            </Btn>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
        <GhostBtn onClick={startNew}>+ Yeni Gözetmen Ekle</GhostBtn>
        <GhostBtn onClick={onClose}>Kapat</GhostBtn>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// Turkish Character Normalization for Export
// ══════════════════════════════════════════════════════════════
function normalizeToASCII(str) {
  if (!str) return '';
  return str
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 's')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'g');
}

// Build lookup maps from SEED data (Turkish) keyed by ASCII-normalized names
var TURKISH_COURSE_MAP = {};
SEED_COURSES.forEach(function (c) {
  var key = c.code + '|' + normalizeToASCII(c.name).toLowerCase();
  TURKISH_COURSE_MAP[key] = c.name;
});

var TURKISH_PROF_MAP = {};
SEED_PROFESSORS.forEach(function (p) {
  var key = normalizeToASCII(p.name).toLowerCase();
  TURKISH_PROF_MAP[key] = p.name;
});

function getTurkishCourseName(code, name) {
  if (!name) return name;
  var key = code + '|' + normalizeToASCII(name).toLowerCase();
  return TURKISH_COURSE_MAP[key] || name;
}

function getTurkishProfName(name) {
  if (!name) return name;
  var key = normalizeToASCII(name).toLowerCase();
  return TURKISH_PROF_MAP[key] || name;
}

function turkishifyExam(exam) {
  return {
    ...exam,
    name: getTurkishCourseName(exam.code, exam.name),
    professor: getTurkishProfName(exam.professor),
  };
}

function turkishifyCourse(course) {
  return {
    ...course,
    name: getTurkishCourseName(course.code, course.name),
    professor: getTurkishProfName(course.professor),
  };
}

// ══════════════════════════════════════════════════════════════
// Export Functions
// ══════════════════════════════════════════════════════════════

// ── Bölüm Bazlı Yazdırılabilir Sınav Programı Çıktısı ──
async function exportDeptPrintable(
  placedExams,
  periodLabel,
  deptName,
  customClassrooms,
  departmentId
) {
  const SINIF_BG = {
    1: '#B2EBF2',
    2: '#C8E6C9',
    3: '#FFE0B2',
    4: '#F8BBD0',
    5: '#E1BEE7',
  };

  function assignRoom(studentCount) {
    const rooms =
      customClassrooms && customClassrooms.length > 0 ? customClassrooms : DEPT_CLASSROOMS;
    return assignClassroomFromList(rooms, studentCount);
  }

  const sorted = [...placedExams].map(turkishifyExam).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.timeSlot.localeCompare(b.timeSlot);
  });

  const oturumSalonu = window.SinavBirlesim
    ? window.SinavBirlesim.oturumSalonlari(sorted, (n, dolu) => {
        const rooms =
          customClassrooms && customClassrooms.length > 0 ? customClassrooms : DEPT_CLASSROOMS;
        return assignClassroomFromList(
          rooms.filter((r) => !(dolu || []).includes(r.name)),
          n
        );
      })
    : {};
  const enriched = sorted.map((exam) => {
    // Elle atanmış salon varsa ona saygı duy; yoksa otomatik ata (Y1).
    // Ortak sınavda salon toplam öğrenciye göre bir kez seçilir (Dekanlık
    // çıktısıyla aynı kural).
    const room =
      oturumSalonu[exam.id || exam.code + exam.date + exam.timeSlot] ||
      exam.room ||
      assignRoom(exam.studentCount);
    const [sh, sm] = exam.timeSlot.split(':').map(Number);
    const totalMin = sh * 60 + sm + (exam.duration || 60);
    const eh = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const em = String(totalMin % 60).padStart(2, '0');
    const dateObj = parseDateISO(exam.date);
    return {
      ...exam,
      assignedRoom: room,
      startStr: formatDate(dateObj) + ' - ' + exam.timeSlot,
      endStr: formatDate(dateObj) + ' - ' + eh + ':' + em,
      durationStr: (exam.duration || 60) + ' dk',
    };
  });

  // Önce Şablonlar modülüne atanmış sınav programı şablonunu dene
  if (window.TemplateEngine && window.TemplateEngine.produceFromTemplate) {
    const rows = enriched.map((e) => ({
      dersAd: e.name || '',
      dersKod: e.code || '',
      baslangic: e.startStr || '',
      bitis: e.endStr || '',
      sure: e.durationStr || '',
      salon: e.assignedRoom || '',
      ogrenciSayisi: e.studentCount != null ? String(e.studentCount) : '',
      gozetmen: e.supervisor || '',
    }));
    const res = await window.TemplateEngine.produceFromTemplate({
      module: 'sinav',
      docType: 'bolum',
      departmentId: departmentId || '',
      staticData: {
        bolumAd: deptName || '',
        donemAd: periodLabel || '',
        tarih: new Date().toLocaleDateString('tr-TR'),
      },
      rows,
      stripRowBold: true,
      filename:
        'Sinav_Programi_' + (deptName || 'bolum').replace(/[^\wğüşıöçĞÜŞİÖÇ]/g, '_') + '.docx',
    });
    if (res.ok) return;
    if (res.reason === 'no-mapping') {
      alert(
        'Sınav programı şablonunun alan eşlemesi yapılmamış. Şablonlar modülünden şablonu açıp 🧩 ile alanları eşleyin. Şimdilik yerleşik yazdırma kullanılacak.'
      );
    } else if (res.reason === 'invalid-output') {
      alert(
        'Yüklü sınav programı şablonundan geçerli belge üretilemedi (şablon yapısı desteklenmiyor). Yerleşik yazdırma kullanılacak.'
      );
    }
    // no-template / diğer → sessizce yerleşik yazdırmaya düş
  }

  // Parse period label for title
  const titleDept = (deptName || '').toUpperCase();
  const periodUpper = (periodLabel || '').toUpperCase();

  const rows = enriched
    .map((e) => {
      const bg = SINIF_BG[e.sinif] || '#FFFFFF';
      return `<tr style="background:${bg}">
      <td style="padding:8px 10px;border:1px solid #999;text-align:center;font-weight:500">${e.name}</td>
      <td style="padding:8px 10px;border:1px solid #999;text-align:center;font-weight:600">${e.code}</td>
      <td style="padding:8px 10px;border:1px solid #999;text-align:center">${e.startStr}</td>
      <td style="padding:8px 10px;border:1px solid #999;text-align:center">${e.endStr}</td>
      <td style="padding:8px 10px;border:1px solid #999;text-align:center">${e.durationStr}</td>
      <td style="padding:8px 10px;border:1px solid #999;text-align:center;font-weight:600">${e.assignedRoom}</td>
    </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><title>Sınav Programı - ${deptName || ''}</title>
<style>
  @media print { body { margin: 0; } @page { size: A4 landscape; margin: 1cm; } }
  body { font-family: 'Times New Roman', serif; background: #e8e8e8; }
  .page { max-width: 1000px; margin: 20px auto; background: white; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  h1 { text-align: center; font-size: 18px; color: #1B2A4A; margin-bottom: 20px; border-bottom: 3px solid #1B2A4A; padding-bottom: 10px; }
  h2 { text-align: center; font-size: 13px; color: #C00; margin-bottom: 16px; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { padding: 10px 8px; border: 1px solid #999; background: #f5f5f5; font-weight: 700; text-align: center; font-size: 12px; }
</style>
</head>
<body>
<div class="page">
  <h1>${periodLabel || ''} Sınav Programı</h1>
  <h2>${periodUpper} ${titleDept} SINAV PROGRAMI</h2>
  <table>
    <thead>
      <tr>
        <th style="width:22%">Dersin Adı</th>
        <th style="width:10%">Dersin Kodu</th>
        <th style="width:22%">Sınavın Başlama Tarihi ve Saati</th>
        <th style="width:22%">Sınavın Bitiş Tarihi ve Saati</th>
        <th style="width:10%">Sınav Süresi</th>
        <th style="width:14%">SINIF</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}

async function exportToXLSX(
  placedExams,
  periodLabel,
  period,
  customClassrooms,
  customSupervisors,
  deptName,
  // { hocaKurali, sayiKurali } — bölüm kaydındaki gözetmen kuralları
  gozetmenKurallari,
  // Gözetmenin izinli/görevli olduğu günler — { 'Ad Soyad': ['2026-06-01'] }.
  // Dekanlık çıktısı da canlı ekranla AYNI atamayı üretmeli.
  musaitsizlik
) {
  // Load xlsx-js-style for cell styling support (colors, bold, borders)
  if (!window._XLSX_STYLE_LOADED) {
    try {
      delete window.XLSX;
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Excel kütüphanesi yüklenemedi'));
        document.head.appendChild(script);
      });
      window._XLSX_STYLE_LOADED = true;
    } catch (e) {
      alert(e.message);
      return;
    }
  }

  const XLSX = window.XLSX;
  const wb = XLSX.utils.book_new();

  // ── Style definitions ──
  const border = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  };
  const yellowFill = { patternType: 'solid', fgColor: { rgb: 'FFFF00' } };
  const _navyFill = { patternType: 'solid', fgColor: { rgb: '1B2A4A' } };

  // ── Sort and enrich exams ──
  const sorted = [...placedExams].map(turkishifyExam).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.timeSlot.localeCompare(b.timeSlot);
  });

  // Use custom supervisors/classrooms if provided, otherwise use defaults
  const exportClassrooms = customClassrooms || DEPT_CLASSROOMS;
  const exportSupervisorNames = customSupervisors || [];

  // Supervisor assignment for export (süre bazlı dengeli dağıtım)
  function exportAssignClassroom(studentCount) {
    return assignClassroomFromList(exportClassrooms, studentCount);
  }

  // Salon OTURUM başına: ortak sınavda toplam öğrenciye göre bir kez seçilir
  // ve bütün derslere yazılır; aynı saatte dolu salonlar atlanır
  // (lib/sinav-birlesim.js). Elle salon esastır.
  const oturumSalonu = window.SinavBirlesim
    ? window.SinavBirlesim.oturumSalonlari(sorted, (n, dolu) =>
        assignClassroomFromList(
          exportClassrooms.filter((r) => !(dolu || []).includes(r.name)),
          n
        )
      )
    : {};
  const salonAnahtari = (e) => e.id || e.code + e.date + e.timeSlot;
  // Gözetmen sayısı GERÇEKTE seçilen salonlara göre hesaplansın.
  const { atamalar: exportSupervisorMap, uyarilar: gozetmenUyarilari } = gozetmenleriDagit(
    exportSupervisorNames,
    sorted.map((e) => ({ ...e, room: oturumSalonu[salonAnahtari(e)] || e.room })),
    exportAssignClassroom,
    { ...(gozetmenKurallari || {}), musaitsizlik: musaitsizlik || {} }
  );
  // Eksik atama sessiz geçmesin: çıktı yine üretilebilir ama yetkili bilerek
  // üretir (gözetmen yetmedi, zorunlu hoca müsait değil, havuz boş…).
  if (gozetmenUyarilari.length > 0) {
    const devam = window.confirm(
      'Gözetmen atamasında ' +
        gozetmenUyarilari.length +
        ' uyarı var:\n\n' +
        window.Gozetmen.uyariMetni(gozetmenUyarilari) +
        '\n\nÇıktı bu hâliyle üretilsin mi?'
    );
    if (!devam) return;
  }

  const enriched = sorted.map((exam) => {
    const key = exam.id || exam.code + exam.date + exam.timeSlot;
    // Elle atanmış salon/gözetmene saygı duy; yoksa otomatik (Y1)
    const room = oturumSalonu[key] || exam.room || exportAssignClassroom(exam.studentCount);
    const supervisors = (exportSupervisorMap[key] || []).join(', ');
    const [sh, sm] = exam.timeSlot.split(':').map(Number);
    const totalMin = sh * 60 + sm + (exam.duration || 60);
    const eh = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const em = String(totalMin % 60).padStart(2, '0');
    const dateObj = parseDateISO(exam.date);
    const dateStr = formatDate(dateObj);
    return {
      ...exam,
      assignedRoom: room,
      assignedSupervisors: supervisors,
      startStr: dateStr + ' - ' + exam.timeSlot,
      endStr: dateStr + ' - ' + eh + ':' + em,
      durationStr: (exam.duration || 60) + ' dk',
    };
  });

  // ══════ Sheet 1: Liste (Tarihe göre sıralı) ══════
  const listHeader = [
    'Dersin Adı',
    'Dersin Kodu',
    'Sınava Girecek Toplam Öğrenci Sayısı',
    'Sınavın Başlama Tarihi ve Saati',
    'Sınavın Bitiş Tarihi ve Saati',
    'Sınav Süresi',
    'GÖZETMEN',
    'SINIF',
  ];
  const listData = [
    listHeader,
    ...enriched.map((e) => [
      e.name,
      e.code,
      e.studentCount || '',
      e.startStr,
      e.endStr,
      e.durationStr,
      e.assignedSupervisors,
      e.assignedRoom,
    ]),
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(listData);

  // Style Liste header row - bold, centered, borders, no background
  for (var C = 0; C < listHeader.length; C++) {
    var addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws1[addr]) {
      ws1[addr].s = {
        font: { bold: true, name: 'Times New Roman' },
        border: border,
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      };
    }
  }

  // Style Liste data rows - borders, centered, no background
  for (var R = 1; R < listData.length; R++) {
    for (var C2 = 0; C2 < listHeader.length; C2++) {
      var addr2 = XLSX.utils.encode_cell({ r: R, c: C2 });
      if (!ws1[addr2]) ws1[addr2] = { v: '', t: 's' };
      ws1[addr2].s = {
        font: { name: 'Times New Roman' },
        border: border,
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      };
    }
  }

  ws1['!cols'] = [
    { wch: 35 },
    { wch: 18 },
    { wch: 35 },
    { wch: 28 },
    { wch: 28 },
    { wch: 12 },
    { wch: 60 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Liste (Tarihe göre sıralı)');

  // ══════ Generate ALL weekdays (Mon-Fri) from period ══════
  var allWeekdays = [];
  if (period && period.startDate) {
    var pStart = parseDateISO(period.startDate);
    var pDow = pStart.getDay();
    var monOff = pDow === 0 ? -6 : 1 - pDow;
    var monday = new Date(pStart);
    monday.setDate(pStart.getDate() + monOff);
    var totalWeeks = period.weeks || 1;
    for (var w = 0; w < totalWeeks; w++) {
      for (var d = 0; d < 5; d++) {
        var day = new Date(monday);
        day.setDate(monday.getDate() + w * 7 + d);
        allWeekdays.push(day);
      }
    }
  } else {
    // Derive weekdays from exam dates
    var dates = [
      ...new Set(
        enriched.map(function (e) {
          return e.date;
        })
      ),
    ].sort();
    if (dates.length > 0) {
      var first = parseDateISO(dates[0]);
      var last = parseDateISO(dates[dates.length - 1]);
      var fDow = first.getDay();
      var mOff = fDow === 0 ? -6 : 1 - fDow;
      var mon = new Date(first);
      mon.setDate(first.getDate() + mOff);
      var lDow = last.getDay();
      var fOff = lDow === 0 ? -2 : 5 - lDow;
      var fri = new Date(last);
      fri.setDate(last.getDate() + fOff);
      var cur = new Date(mon);
      while (cur <= fri) {
        if (cur.getDay() >= 1 && cur.getDay() <= 5) {
          allWeekdays.push(new Date(cur));
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  // Group exams by date
  var examsByDate = {};
  enriched.forEach(function (e) {
    if (!examsByDate[e.date]) examsByDate[e.date] = [];
    examsByDate[e.date].push(e);
  });

  // Day time slots
  var dayTimeSlots = [];
  for (var h = 8; h <= 17; h++) {
    // End at 17:30
    for (var m = 0; m < 60; m += 30) {
      if (h === 8 && m === 0) continue;
      // if (h === 12) continue; // Skip lunch - REVERTED
      var sH = String(h).padStart(2, '0');
      var sM = String(m).padStart(2, '0');
      var eMin = h * 60 + m + 30;
      var eH2 = String(Math.floor(eMin / 60)).padStart(2, '0');
      var eM2 = String(eMin % 60).padStart(2, '0');
      dayTimeSlots.push(sH + ':' + sM + '-' + eH2 + ':' + eM2);
    }
  }

  var exportAllClassrooms = ALL_FACULTY_CLASSROOMS;
  var numCols = exportAllClassrooms.length + 1; // +1 for column A (time)

  // ══════ Create day sheet for EACH weekday ══════
  allWeekdays.forEach(function (dateObj) {
    var dayName = getDayName(dateObj);
    var dd = String(dateObj.getDate()).padStart(2, '0');
    var mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    var sheetName = dd + '.' + mm + '-' + dayName;
    var dateISO = formatDateISO(dateObj);
    var dayExams = examsByDate[dateISO] || [];

    var data = [];

    // Row 0: DERSLİKLER header
    var row0 = new Array(numCols).fill('');
    row0[1] = 'DERSLİKLER';
    data.push(row0);

    // Row 1: Kapasite
    var row1 = ['Kapasite'];
    exportAllClassrooms.forEach(function (c) {
      row1.push(c.capacity === '' ? '' : c.capacity);
    });
    data.push(row1);

    // Row 2: Saatler / Room names
    var row2 = ['Saatler'];
    exportAllClassrooms.forEach(function (c) {
      row2.push(c.name);
    });
    data.push(row2);

    // Time slot rows
    dayTimeSlots.forEach(function (slot) {
      var row = [slot];
      var slotStart = slot.split('-')[0];
      var parts = slotStart.split(':');
      var slotMin = parseInt(parts[0]) * 60 + parseInt(parts[1]);

      exportAllClassrooms.forEach(function (classroom) {
        // Salonda aynı saatte birden çok ders olabilir (ortak sınav, şubeler):
        // hepsinin kodu yazılır — eskiden yalnız ilki görünüyordu.
        var kodlar = [];
        dayExams.forEach(function (e) {
          var rooms = e.assignedRoom.split(' - ').map(function (r) {
            return r.trim();
          });
          if (rooms.indexOf(classroom.name) === -1) return;
          var eParts = e.timeSlot.split(':');
          var examStart = parseInt(eParts[0]) * 60 + parseInt(eParts[1]);
          var examEnd = examStart + (e.duration || 60);
          if (slotMin >= examStart && slotMin < examEnd && kodlar.indexOf(e.code) === -1)
            kodlar.push(e.code);
        });
        row.push(kodlar.join(' / '));
      });

      data.push(row);
    });

    var ws = XLSX.utils.aoa_to_sheet(data);

    // ── Apply cell styles ──

    // Row 0: DERSLİKLER - yellow background, bold, centered, merged
    for (var c0 = 0; c0 < numCols; c0++) {
      var a0 = XLSX.utils.encode_cell({ r: 0, c: c0 });
      if (!ws[a0]) ws[a0] = { v: '', t: 's' };
      ws[a0].s = {
        fill: yellowFill,
        font: { bold: true, sz: 12, name: 'Times New Roman' },
        border: border,
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    // Merge DERSLİKLER across classroom columns
    ws['!merges'] = [{ s: { r: 0, c: 1 }, e: { r: 0, c: exportAllClassrooms.length } }];

    // Row 1: Kapasite - bold, centered, borders
    for (var c1 = 0; c1 < numCols; c1++) {
      var a1 = XLSX.utils.encode_cell({ r: 1, c: c1 });
      if (!ws[a1]) ws[a1] = { v: '', t: 's' };
      ws[a1].s = {
        font: { bold: true, name: 'Times New Roman' },
        border: border,
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    // Row 2: Saatler - bold, centered, borders
    for (var c2 = 0; c2 < numCols; c2++) {
      var a2 = XLSX.utils.encode_cell({ r: 2, c: c2 });
      if (!ws[a2]) ws[a2] = { v: '', t: 's' };
      ws[a2].s = {
        font: { bold: true, name: 'Times New Roman' },
        border: border,
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    // Time slot rows (row 3 onwards) - borders, centered, no fill
    for (var ri = 3; ri < data.length; ri++) {
      for (var ci = 0; ci < numCols; ci++) {
        var ai = XLSX.utils.encode_cell({ r: ri, c: ci });
        if (!ws[ai]) ws[ai] = { v: '', t: 's' };
        ws[ai].s = {
          font: { name: 'Times New Roman' },
          border: border,
          alignment: { horizontal: 'center', vertical: 'center' },
        };
      }
    }

    // Column widths
    var cols = [{ wch: 14 }];
    exportAllClassrooms.forEach(function () {
      cols.push({ wch: 12 });
    });
    ws['!cols'] = cols;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // Download
  var safeName = (periodLabel || 'export').replace(/[^a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ ]/g, '_');
  XLSX.writeFile(wb, 'sinav_programi_' + safeName + '.xlsx');
}

// ══════════════════════════════════════════════════════════════
// MAIN: SinavOtomasyonuApp
// ══════════════════════════════════════════════════════════════
function SinavOtomasyonuApp({
  currentUser,
  activeDepartment,
  departmentInfo: _departmentInfo,
  seviye = 'lisans',
  // Lisansüstü gibi bir sarmalayıcı içinde gömülü: kendi büyük başlık bloğu
  // gizlenir (çifte başlık olmasın), işlevsel butonlar kalır.
  embedded = false,
}) {
  const r = window.useResponsive
    ? window.useResponsive()
    : {
        isMobile: window.innerWidth <= 480,
        isTablet: window.innerWidth <= 768,
        width: window.innerWidth,
        val: (m, t, d) =>
          window.innerWidth <= 480 ? m : window.innerWidth <= 768 ? t || m : d || t || m,
        modalWidth: (w) => Math.min(w, window.innerWidth - 32),
      };
  const isAdmin = currentUser?.role === 'admin';
  const isDeptManager = currentUser?.role === 'bolum_yetkilisi';
  const isProfessor = currentUser?.role === 'professor';
  const canManage = isAdmin || isDeptManager;

  // Department State - activeDepartment prop ile senkronize
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(
    activeDepartment || currentUser?.departmentId || null
  );
  const [_showDeptModal, _setShowDeptModal] = useState(false);
  const [_showClassroomModal, _setShowClassroomModal] = useState(false);
  const [_showSupervisorModal, _setShowSupervisorModal] = useState(false);
  const [deptClassrooms, setDeptClassrooms] = useState([]);
  const [deptSupervisors, setDeptSupervisors] = useState([]);
  // ── Fakülte geneli çakışma denetimi ──
  // Salonlar ve gözetmenler bölüm bölüm tanımlı; kimse fakültenin tamamını
  // görmediği için iki bölüm aynı saatte aynı salonu/gözetmeni alabiliyordu.
  // Denetim bu yüzden BÜTÜN bölümlerin sınavları üzerinden yapılır.
  const [tumSinavlar, setTumSinavlar] = useState([]);
  const [tumSalonlar, setTumSalonlar] = useState([]);
  const [cakismaKabulleri, setCakismaKabulleri] = useState([]);
  const [cakismaPaneli, setCakismaPaneli] = useState(false);
  // Gözetmen kuralları (hoca + salon başına gözetmen) — bölüm kaydında durur.
  const [gozetmenKuralAcik, setGozetmenKuralAcik] = useState(false);
  const [kabulEdilen, setKabulEdilen] = useState(null); // şartlı kabul modalı

  // State
  const [courses, setCourses] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [activePeriodId, setActivePeriodId] = useState(null);
  // Dönem kartları açılır kapanır; varsayılan kapalı, seçili dönem başlıkta.
  const [donemlerAcik, setDonemlerAcik] = useState(false);
  const [placedExams, setPlacedExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar');
  const [editingExam, setEditingExam] = useState(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [_showCourseModal, _setShowCourseModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [filterSinif, setFilterSinif] = useState(0);
  const [filterDonem, setFilterDonem] = useState('all');
  const [courseSearch, setCourseSearch] = useState('');

  const selectedDept = departments.find((d) => d.id === selectedDeptId);

  // Lisans takvimi gündüz satırlarıyla sınırlı; lisansüstü akşam satırları dahil
  const visibleTimeSlots =
    seviye === 'lisans' ? TIME_SLOTS.slice(0, LISANS_TIME_SLOT_COUNT) : TIME_SLOTS;
  // Lisansüstünde sınıf (1-4) kavramı yok — sınıf rozetleri/filtreleri gizlenir
  const sinifsiz = seviye !== 'lisans';

  // activeDepartment prop değiştiğinde senkronize et
  useEffect(() => {
    if (activeDepartment && activeDepartment !== selectedDeptId) {
      setSelectedDeptId(activeDepartment);
    }
  }, [activeDepartment]);

  // ── Seed data to DB ──
  const seedData = async () => {
    const cRef = getCoursesRef();
    const pRef = getProfessorsRef();
    if (!cRef || !pRef) {
      alert('Veritabanı bağlantısı yok!');
      return;
    }
    if (!selectedDeptId) {
      alert('Lütfen önce bir bölüm seçin!');
      return;
    }
    try {
      // Sadece seçili bölümün derslerini kontrol et ve sil
      const existingCourses = await cRef.where('departmentId', '==', selectedDeptId).get();
      if (!existingCourses.empty) {
        if (!confirm('Bu bölümde zaten dersler var. Üzerine yazılsın mı?')) return;
        const delOps1 = existingCourses.docs.map((doc) => ({
          collection: 'sinav_dersler',
          type: 'delete',
          docId: doc.id,
        }));
        for (let i = 0; i < delOps1.length; i += 20) {
          await DBWrite.batch(delOps1.slice(i, i + 20));
        }
      }
      // Sadece seçili bölümün profesörlerini sil
      const existingProfs = await pRef.where('departmentId', '==', selectedDeptId).get();
      const deptProfs = existingProfs.docs;
      if (deptProfs.length > 0) {
        const delOps2 = deptProfs.map((doc) => ({
          collection: 'professors',
          type: 'delete',
          docId: doc.id,
        }));
        for (let i = 0; i < delOps2.length; i += 20) {
          await DBWrite.batch(delOps2.slice(i, i + 20));
        }
      }
      for (const prof of SEED_PROFESSORS) {
        await DBWrite.add('professors', {
          ...prof,
          departmentId: selectedDeptId,
          createdAt: new Date().toISOString(),
        });
      }
      for (const course of SEED_COURSES) {
        await DBWrite.add('sinav_dersler', {
          ...course,
          studentCount: 0,
          departmentId: selectedDeptId,
          createdAt: new Date().toISOString(),
        });
      }
      alert('Veriler başarıyla yüklendi!');
      loadData();
    } catch (e) {
      console.error('Seed error:', e);
      alert('Seed hatası: ' + e.message);
    }
  };

  // ── Load departments ──
  const loadDepartments = async () => {
    try {
      const dRef = getDepartmentsRef();
      if (dRef) {
        const snap = await dRef.get();
        const HARD_DEPTS = window.DEPARTMENTS || [];
        let depts = snap.docs.map((d) => {
          const dept = { id: d.id, docId: d.id, ...d.data() };
          // Veritabanı doc ID'sini hardcoded DEPARTMENTS ID'sine eşleştir
          // Tüm veriler (dersler, sınavlar vb.) hardcoded ID ile kaydedildiği için
          // bu eşleştirme kritik önem taşır
          const matched = HARD_DEPTS.find((hd) => hd.name === dept.name);
          if (matched) {
            dept.id = matched.id; // "bilgisayar", "elektrik" vb.
          }
          return dept;
        });

        // Bölüm adlarında tekrarlanan kelime varsa düzelt (ör: "Mühendisliği Mühendisliği")
        depts.forEach((dept) => {
          if (dept.name) {
            const words = dept.name.split(/\s+/);
            const cleaned = words.filter((w, i) => i === 0 || w !== words[i - 1]);
            const fixedName = cleaned.join(' ');
            if (fixedName !== dept.name) {
              dept.name = fixedName;
              DBWrite.update('departments', dept.docId, { name: fixedName }).catch(() => {});
              // İsim düzeltildikten sonra tekrar eşleştir
              const matched = HARD_DEPTS.find((hd) => hd.name === fixedName);
              if (matched) dept.id = matched.id;
            }
          }
        });

        // Bölüm yetkilisi için: sadece kendi bölümünü göster
        if (isDeptManager && currentUser?.departmentId) {
          const userDeptId = currentUser.departmentId;
          const userDeptName = currentUser.departmentName;
          depts = depts.filter(
            (d) => d.id === userDeptId || (userDeptName && d.name === userDeptName)
          );
        }

        // Akademisyen için: derslerinin olduğu bölümleri bul
        if (isProfessor && currentUser?.name) {
          const cRef = getCoursesRef();
          if (cRef) {
            const coursesSnap = await cRef.where('professor', '==', currentUser.name).get();
            const profDeptIds = new Set();
            coursesSnap.docs.forEach((d) => {
              const deptId = d.data().departmentId;
              if (deptId) profDeptIds.add(deptId);
            });
            depts = depts.filter((d) => profDeptIds.has(d.id));
          }
        }

        setDepartments(depts);
        // Auto-select for department manager
        if (isDeptManager && currentUser?.departmentId) {
          // Eşleştirilmiş bölüm varsa onun ID'sini kullan
          const matchedDept = depts.find(
            (d) => d.id === currentUser.departmentId || d.name === currentUser.departmentName
          );
          setSelectedDeptId(matchedDept ? matchedDept.id : currentUser.departmentId);
        } else if (isProfessor && depts.length > 0 && !selectedDeptId) {
          setSelectedDeptId(depts[0].id);
        } else if (isAdmin && !selectedDeptId && depts.length > 0) {
          setSelectedDeptId(depts[0].id);
        }
        return depts;
      }
    } catch (e) {
      console.error('Load departments error:', e);
    }
    return [];
  };

  // Bölümün gözetmenleri: gözetmenlik bölüme bağlı (professors.gozetmenBolumleri);
  // eski kayıtlar (yalnız roles:['gozetmen']) kendi bölümlerinde sayılır.
  const bolumGozetmenleriniOku = async (deptId) => {
    if (!deptId) return [];
    const G = window.Gozetmen || {};
    const bolumler = window.DEPARTMENTS || [];
    const bolumAdi =
      (departments.find((d) => d.id === deptId) || bolumler.find((d) => d.id === deptId) || {})
        .name || '';
    const hepsi = (await window.apiRead('professors')) || [];
    return hepsi
      .filter((p) =>
        G.bolumGozetmeniMi
          ? G.bolumGozetmeniMi(p, deptId, bolumler, bolumAdi)
          : (p.roles || []).includes('gozetmen')
      )
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
  };

  // ── Load department-specific classrooms and supervisors ──
  const loadDeptResources = async (deptId) => {
    if (!deptId) return;
    try {
      const crRef = getDeptClassroomsRef();
      if (crRef) {
        const snap = await crRef.where('departmentId', '==', deptId).get();
        setDeptClassrooms(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.capacity || 0) - (b.capacity || 0))
        );
      }
      // Gözetmenler: bu BÖLÜMÜN gözetmen listesi (lib/gozetmen.js). Başka
      // bölümden atanmış akademisyenler de dahil; bu yüzden bölüm süzgeci
      // olmadan okunur.
      setDeptSupervisors(await bolumGozetmenleriniOku(deptId));
    } catch (e) {
      console.error('Load dept resources error:', e);
    }
  };

  // ── Fakülte geneli veri (çakışma denetimi için) ──
  // Bölüm süzgeci olmadan okunur: çakışma tanımı gereği BAŞKA bölümün
  // sınavıyla olur, kendi bölümüne bakarak görülemez. Yalnız denetim için
  // kullanılır; takvim ve listeler aktif bölümün verisiyle çizilmeye devam
  // eder.
  const loadFakulteGeneli = useCallback(async () => {
    try {
      const [sinavlar, salonlar, kabuller] = await Promise.all([
        window.apiRead('sinav_programi').catch(() => []),
        window.apiRead('department_classrooms').catch(() => []),
        window.apiRead('sinav_cakisma_kabul').catch(() => []),
      ]);
      setTumSinavlar(Array.isArray(sinavlar) ? sinavlar : []);
      setTumSalonlar(Array.isArray(salonlar) ? salonlar : []);
      setCakismaKabulleri(Array.isArray(kabuller) ? kabuller : []);
    } catch (e) {
      console.warn('Fakülte geneli veri okunamadı:', e && e.message);
    }
  }, []);

  useEffect(() => {
    loadFakulteGeneli();
  }, [loadFakulteGeneli, placedExams.length]);

  // ── Resmî çıktı kapısı ──
  // Engel varsa çıktı üretilmez: fiziksel imkânsızlık taşıyan bir program
  // dekanlığa gönderilmemeli. Karar bekleyen uyarı varsa da tutulur —
  // yetkili ya düzeltir ya şartlı kabul eder; "görmezden gel" seçeneği yok.
  const cikisIzniVar = () => {
    if (programHazir) return true;
    setCakismaPaneli(true);
    alert(
      cakismaOzet.engel > 0
        ? cakismaOzet.engel +
            ' çakışma fiziksel olarak imkânsız (kapasite yetmiyor ya da gözetmen iki ' +
            'salonda birden olamaz). Bunlar düzeltilmeden resmî çıktı alınamaz.\n\n' +
            'Çakışma panelini açtım.'
        : cakismaOzet.bekleyen +
            ' çakışma karar bekliyor. Her birini ya düzeltin ya da sebebini yazarak ' +
            'şartlı kabul edin; kabul kayda geçer.\n\nÇakışma panelini açtım.'
    );
    return false;
  };

  // Şartlı kabul — sebep zorunlu, kim/ne zaman kayda geçer.
  const cakismayiKabulEt = async (cakisma, sebep) => {
    const k = window.sinavKabulKaydi(cakisma, sebep, currentUser);
    if (!k.olur) {
      alert(k.sebep);
      return false;
    }
    try {
      await DBWrite.set('sinav_cakisma_kabul', k.kayit.anahtar, k.kayit, true);
      if (window.apiInvalidate) window.apiInvalidate('sinav_cakisma_kabul');
      await loadFakulteGeneli();
      return true;
    } catch (e) {
      alert('Kabul kaydedilemedi: ' + (e.message || ''));
      return false;
    }
  };

  const kabulGeriAl = async (cakisma) => {
    if (!confirm('Bu çakışmanın şartlı kabulü geri alınacak. Devam edilsin mi?')) return;
    try {
      await DBWrite.remove('sinav_cakisma_kabul', cakisma.anahtar);
      if (window.apiInvalidate) window.apiInvalidate('sinav_cakisma_kabul');
      await loadFakulteGeneli();
    } catch (e) {
      alert('Geri alınamadı: ' + (e.message || ''));
    }
  };

  // ── Load data from DB (department-scoped) ──
  const loadData = async () => {
    setLoading(true);
    try {
      const cRef = getCoursesRef();
      const pRef = getProfessorsRef();
      const perRef = getPeriodsRef();
      const eRef = getExamsRef();

      // Tüm sorguları paralel olarak çalıştır
      const queries = [];

      // Courses query
      if (cRef) {
        if (selectedDeptId) {
          queries.push(cRef.where('departmentId', '==', selectedDeptId).get());
        } else if (isAdmin) {
          queries.push(cRef.get());
        } else {
          queries.push(Promise.resolve(null));
        }
      } else queries.push(Promise.resolve(null));

      // Professors query
      if (pRef) {
        if (selectedDeptId) {
          queries.push(pRef.where('departmentId', '==', selectedDeptId).get());
        } else if (isAdmin) {
          queries.push(pRef.get());
        } else {
          queries.push(Promise.resolve(null));
        }
      } else queries.push(Promise.resolve(null));

      // Periods query
      if (perRef) {
        if (selectedDeptId) {
          queries.push(perRef.where('departmentId', '==', selectedDeptId).get());
        } else if (isAdmin) {
          queries.push(perRef.get());
        } else {
          queries.push(Promise.resolve(null));
        }
      } else queries.push(Promise.resolve(null));

      // Exams query
      if (eRef) {
        if (selectedDeptId) {
          queries.push(eRef.where('departmentId', '==', selectedDeptId).get());
        } else if (isAdmin) {
          queries.push(eRef.get());
        } else {
          queries.push(Promise.resolve(null));
        }
      } else queries.push(Promise.resolve(null));

      // Dept resources queries (classrooms only — supervisors come from professors)
      if (selectedDeptId) {
        const crRef = getDeptClassroomsRef();
        queries.push(
          crRef ? crRef.where('departmentId', '==', selectedDeptId).get() : Promise.resolve(null)
        );
      } else {
        queries.push(Promise.resolve(null));
      }

      const [coursesSnap, profsSnap, periodsSnap, examsSnap, classroomsSnap] =
        await Promise.all(queries);

      // Set courses (aynı code + aynı name olanları filtrele, farklı şubeler korunsun)
      // SEVİYE filtresi: bu modül örneği yalnız kendi seviyesinin derslerini
      // gösterir (lisans / yukseklisans / doktora). seviye yoksa 'lisans' say.
      const rawCourses = (
        coursesSnap ? coursesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : []
      ).filter((c) => (c.seviye || 'lisans') === seviye);
      const courseMap = {};
      rawCourses.forEach((c) => {
        const key = ((c.code || '').trim() + '||' + (c.name || '').trim()).toLowerCase();
        if (!courseMap[key]) {
          courseMap[key] = c;
          return;
        }
        // Aynı code+name: professor ataması olanı tercih et
        const existing = courseMap[key];
        const eHasProf =
          existing.professor && existing.professor !== '-' && existing.professor !== '';
        const cHasProf = c.professor && c.professor !== '-' && c.professor !== '';
        if (cHasProf && !eHasProf) courseMap[key] = c;
        else if (cHasProf === eHasProf && (c.studentCount || 0) > (existing.studentCount || 0))
          courseMap[key] = c;
      });
      setCourses(Object.values(courseMap));

      // Set professors (mükerrer kayıtları filtrele)
      const rawProfs = profsSnap ? profsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
      const profMap = {};
      rawProfs.forEach((p) => {
        const key = (p.name || '').trim();
        if (!key || profMap[key]) return;
        profMap[key] = p;
      });
      const profs = Object.values(profMap);
      setProfessors(profs.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr')));

      // Set periods — SEVİYE'ye göre filtre (dönemler seviyeye göre ayrık)
      const perList = (
        periodsSnap ? periodsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : []
      ).filter((p) => (p.seviye || 'lisans') === seviye);
      setPeriods(perList);
      // Aktif dönem seçili değilse VEYA (bölüm/seviye değişimi sonrası) yeni
      // listede yoksa ilk döneme düş — aksi halde bayat id yüzünden takvim
      // boş kalıp "dönem bulunamadı" görünüyordu (O4).
      if (perList.length > 0 && !perList.some((p) => p.id === activePeriodId)) {
        setActivePeriodId(perList[0].id);
      } else if (perList.length === 0 && activePeriodId) {
        setActivePeriodId(null);
      }

      // Set exams — SEVİYE'ye göre filtre (yerleştirilmiş sınavlar seviyeye ayrık)
      setPlacedExams(
        (examsSnap ? examsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : []).filter(
          (e) => (e.seviye || 'lisans') === seviye
        )
      );

      // Set dept resources
      setDeptClassrooms(
        classroomsSnap
          ? classroomsSnap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .sort((a, b) => (a.capacity || 0) - (b.capacity || 0))
          : []
      );
      // Gözetmenler: bu bölümün gözetmen listesi (başka bölümden atananlar dahil)
      setDeptSupervisors(await bolumGozetmenleriniOku(selectedDeptId));
    } catch (e) {
      console.error('Load error:', e);
    }
    setLoading(false);
  };

  // Initial load: departments first, then comprehensive migration, then data
  useEffect(() => {
    const init = async () => {
      const depts = await loadDepartments();

      // ── Veri-bazlı migration: departmentId normalize + mükerrer silme ──
      // Sadece bir kez çalışır (tarayıcı başına), her sayfa yüklemesinde çalışmaz
      const MIGRATION_VERSION = 'v5_donem_fix';
      const migrationDone = localStorage.getItem('sinav_migration_' + MIGRATION_VERSION);
      if (depts.length > 0 && !migrationDone) {
        try {
          const HARD_DEPTS = window.DEPARTMENTS || [];
          const _validDeptIds = new Set(HARD_DEPTS.map((d) => d.id));

          // 1. Veritabanı doc ID → hardcoded ID eşleştirmesi
          const idMap = {}; // dbDocId → hardcodedId
          const dRef = getDepartmentsRef();
          if (dRef) {
            const dSnap = await dRef.get();
            dSnap.docs.forEach((doc) => {
              const data = doc.data();
              const matched = HARD_DEPTS.find((hd) => hd.name === data.name);
              if (matched && doc.id !== matched.id) {
                idMap[doc.id] = matched.id;
              }
            });
          }

          // 2. Dersleri kontrol et (hem normalize hem mükerrer)
          // NOT: Tüm bölümlerin dersleri yüklenir çünkü departmentId normalize edilmesi gerekiyor
          const cRef = getCoursesRef();
          const updateOps = [];
          const deleteOps = [];
          let needsMigration = false;

          if (cRef) {
            const cSnap = await cRef.get();
            const allCourses = cSnap.docs.map((d) => ({ docId: d.id, ...d.data() }));

            // departmentId kontrol
            allCourses.forEach((c) => {
              const did = c.departmentId;
              if (!did || did === '') {
                updateOps.push({
                  collection: 'sinav_dersler',
                  type: 'update',
                  docId: c.docId,
                  data: { departmentId: 'bilgisayar' },
                });
              } else if (idMap[did]) {
                updateOps.push({
                  collection: 'sinav_dersler',
                  type: 'update',
                  docId: c.docId,
                  data: { departmentId: idMap[did] },
                });
              }
              // donem eksik olan derslere SEED_COURSES'tan veya sınıf bazlı varsayılan ata
              if (!c.donem || (c.donem !== 'guz' && c.donem !== 'bahar')) {
                const seedMatch = SEED_COURSES.find((s) => s.code === c.code && s.name === c.name);
                const donem = seedMatch
                  ? seedMatch.donem
                  : (c.sinif || 1) % 2 === 1
                    ? 'guz'
                    : 'bahar';
                updateOps.push({
                  collection: 'sinav_dersler',
                  type: 'update',
                  docId: c.docId,
                  data: { donem },
                });
              }
            });

            // Mükerrer kontrol (aynı bölüm + aynı kod + aynı ad = gerçek mükerrer)
            const courseGroups = {};
            allCourses.forEach((c) => {
              const code = (c.code || '').trim();
              const name = (c.name || '').trim();
              const dept = c.departmentId || '';
              if (!code) return;
              const key = `${dept}__${code}__${name}`;
              if (!courseGroups[key]) courseGroups[key] = [];
              courseGroups[key].push(c);
            });
            for (const group of Object.values(courseGroups)) {
              if (group.length <= 1) continue;
              group.sort((a, b) => {
                const aP = a.professor && a.professor !== '-' && a.professor !== '' ? 1 : 0;
                const bP = b.professor && b.professor !== '-' && b.professor !== '' ? 1 : 0;
                if (bP !== aP) return bP - aP;
                if ((b.studentCount || 0) !== (a.studentCount || 0))
                  return (b.studentCount || 0) - (a.studentCount || 0);
                return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
              });
              for (let i = 1; i < group.length; i++) {
                deleteOps.push({
                  collection: 'sinav_dersler',
                  type: 'delete',
                  docId: group[i].docId,
                });
              }
            }
          }

          // 3. Profesörleri kontrol et
          const pRef = getProfessorsRef();
          if (pRef) {
            const pSnap = await pRef.get();
            const allProfs = pSnap.docs.map((d) => ({ docId: d.id, ...d.data() }));

            allProfs.forEach((p) => {
              const did = p.departmentId;
              if (!did || did === '') {
                updateOps.push({
                  collection: 'professors',
                  type: 'update',
                  docId: p.docId,
                  data: { departmentId: 'bilgisayar' },
                });
              } else if (idMap[did]) {
                updateOps.push({
                  collection: 'professors',
                  type: 'update',
                  docId: p.docId,
                  data: { departmentId: idMap[did] },
                });
              }
            });

            const profGroups = {};
            allProfs.forEach((p) => {
              const name = (p.name || '').trim();
              const dept = p.departmentId || '';
              if (!name) return;
              const key = `${dept}__${name}`;
              if (!profGroups[key]) profGroups[key] = [];
              profGroups[key].push(p);
            });
            for (const group of Object.values(profGroups)) {
              if (group.length <= 1) continue;
              group.sort((a, b) =>
                String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
              );
              for (let i = 1; i < group.length; i++) {
                deleteOps.push({ collection: 'professors', type: 'delete', docId: group[i].docId });
              }
            }
          }

          // 4. Diğer koleksiyonların departmentId kontrolü
          const otherCollections = [
            { ref: getPeriodsRef(), col: 'sinav_donemler' },
            { ref: getExamsRef(), col: 'sinav_programi' },
            { ref: getDeptClassroomsRef(), col: 'department_classrooms' },
          ];
          for (const { ref, col } of otherCollections) {
            if (!ref) continue;
            const snap = await ref.get();
            snap.docs.forEach((d) => {
              const data = d.data();
              const did = data.departmentId;
              if (!did || did === '') {
                updateOps.push({
                  collection: col,
                  type: 'update',
                  docId: d.id,
                  data: { departmentId: 'bilgisayar' },
                });
              } else if (idMap[did]) {
                updateOps.push({
                  collection: col,
                  type: 'update',
                  docId: d.id,
                  data: { departmentId: idMap[did] },
                });
              }
            });
          }

          // Sadece düzeltme gerekiyorsa yazma işlemi yap
          // Server limiti: tek batch'te max 20 silme, güvenli chunk boyutu
          const BATCH_LIMIT = 20;

          if (updateOps.length > 0) {
            for (let i = 0; i < updateOps.length; i += BATCH_LIMIT) {
              await DBWrite.batch(updateOps.slice(i, i + BATCH_LIMIT));
            }
            console.log(`Migration: ${updateOps.length} kayıt normalize edildi.`);
            needsMigration = true;
          }

          if (deleteOps.length > 0) {
            for (let i = 0; i < deleteOps.length; i += BATCH_LIMIT) {
              await DBWrite.batch(deleteOps.slice(i, i + BATCH_LIMIT));
            }
            console.log(`Migration: ${deleteOps.length} mükerrer kayıt silindi.`);
            needsMigration = true;
          }

          // Veri değiştiyse yeniden yükle
          if (needsMigration && selectedDeptId) loadData();
          // Migration tamamlandı — bir daha çalıştırma
          localStorage.setItem('sinav_migration_' + MIGRATION_VERSION, 'done');
        } catch (e) {
          console.error('Migration error:', e);
          // Hata durumunda flag set etme — bir sonraki yüklemede tekrar denesin
        }
      }
    };
    init();
  }, []);
  // Reload data when selected department changes
  useEffect(() => {
    if (selectedDeptId) {
      loadData();
    }
  }, [selectedDeptId]);

  const activePeriod = periods.find((p) => p.id === activePeriodId);
  const periodExams = placedExams.filter((e) => e.periodId === activePeriodId);

  // ── Fakülte geneli çakışma denetimi ──
  // Denetim aktif dönemin TARİHLERİYLE kesişen bütün sınavlar üzerinden
  // yapılır: başka bölümün sınavı aynı güne düşüyorsa salon ve gözetmen
  // paylaşımı da o gün yaşanıyor demektir.
  const donemGunleri = useMemo(() => {
    const g = new Set();
    periodExams.forEach((e) => e.date && g.add(e.date));
    return g;
  }, [periodExams]);

  const salonKapasiteleri = useMemo(() => {
    const h = {};
    (tumSalonlar.length > 0 ? tumSalonlar : deptClassrooms).forEach((r) => {
      if (r && r.name) h[r.name] = Number(r.capacity) || 0;
    });
    ALL_FACULTY_CLASSROOMS.forEach((r) => {
      if (h[r.name] == null && r.capacity) h[r.name] = Number(r.capacity) || 0;
    });
    return h;
  }, [tumSalonlar, deptClassrooms]);

  const cakismalar = useMemo(() => {
    if (!window.sinavCakismalariBul) return [];
    // Fakülte geneli liste yalnız sınav SAYISI değişince yeniden okunuyor;
    // birleştirme, ayırma ya da salon/gözetmen düzenlemesi sayıyı değiştirmediği
    // için denetim bayat veriyle yapılıyordu. Bu bölümün ekrandaki güncel
    // sınavları listedeki eski kopyalarının yerine geçer.
    const yerel = new Set(placedExams.map((e) => String(e.id)));
    const guncel =
      tumSinavlar.length > 0
        ? [...tumSinavlar.filter((e) => !yerel.has(String(e.id))), ...placedExams]
        : periodExams;
    const kapsam = guncel.filter((e) => e && e.date && donemGunleri.has(e.date));
    return window.sinavCakismalariBul(kapsam, {
      salonKapasiteleri,
      kabuller: cakismaKabulleri,
    });
  }, [tumSinavlar, placedExams, periodExams, donemGunleri, salonKapasiteleri, cakismaKabulleri]);

  const cakismaOzet = window.sinavCakismaOzeti
    ? window.sinavCakismaOzeti(cakismalar)
    : { toplam: 0, engel: 0, bekleyen: 0, kabul: 0 };
  const programHazir = window.sinavProgramHazirMi ? window.sinavProgramHazirMi(cakismalar) : true;

  // ── SEÇİM YOKKEN KAPANMAZ ──
  // Panel varsayılan kapalıdır, ama hiç dönem seçilmemişken kapalı açılış
  // kullanıcıyı boş bir sayfayla baş başa bırakırdı: seçecek kart görünmez.
  // Seçim yapılana kadar açık durur.
  const donemlerGoster = donemlerAcik || !activePeriod;

  // Kapalıyken başlıkta duran özet: hangi dönem seçili, kaç dönem var.
  const donemOzeti = activePeriod
    ? `${activePeriod.label || `${activePeriod.examType} - ${activePeriod.semester}`}` +
      `${periods.length > 1 ? ` · ${periods.length} dönem` : ''}`
    : `${periods.length} dönem — seçilmedi`;

  // Create a turkishified version of exams for consistent display
  const turkishifiedPeriodExams = useMemo(() => periodExams.map(turkishifyExam), [periodExams]);

  const calendarDays = useMemo(() => {
    if (!activePeriod?.startDate) return [];
    return getWeekDays(parseDateISO(activePeriod.startDate), activePeriod.weeks || 2);
  }, [activePeriod]);

  const poolCourses = useMemo(() => {
    let filtered = courses;
    if (filterDonem !== 'all') {
      filtered = filtered.filter((c) => (c.donem || 'guz') === filterDonem);
    }
    if (filterSinif > 0) {
      filtered = filtered.filter((c) => c.sinif === filterSinif);
    }
    if (courseSearch.trim()) {
      const q = courseSearch.trim().toLocaleLowerCase('tr');
      filtered = filtered.filter(
        (c) =>
          c.code.toLocaleLowerCase('tr').includes(q) ||
          c.name.toLocaleLowerCase('tr').includes(q) ||
          (c.professor && c.professor.toLocaleLowerCase('tr').includes(q))
      );
    }
    return filtered.map((c) => ({
      ...turkishifyCourse(c),
      placedCount: periodExams.filter((e) => e.courseId === c.id).length,
    }));
  }, [courses, periodExams, filterDonem, filterSinif, courseSearch]);

  const groupedPool = useMemo(() => {
    const groups = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    poolCourses.forEach((c) => {
      // Check for Elective (Seçmeli)
      if (
        c.name.toLocaleLowerCase('tr').includes('seçmeli') ||
        c.name.toLocaleLowerCase('tr').includes('seçimlik') ||
        c.name.toLocaleLowerCase('tr').includes('secimlik') ||
        c.code.startsWith('SEÇ')
      ) {
        groups[5].push(c);
      } else {
        if (groups[c.sinif]) groups[c.sinif].push(c);
      }
    });
    return groups;
  }, [poolCourses]);

  // ── Drop handler ──
  // Bir saate birden çok ders konabilir. Saat doluysa karar kullanıcıya
  // sorulur (AyniSaatPenceresi): birlikte yapılacaksa ORTAK SINAV olarak
  // birleştirilir (şubeler, farklı müfredattaki karşılığı, ortak salon),
  // değilse ayrı sınav olarak eklenir — aynı sınıfın öğrencileri iki ayrı
  // sınava birden giremeyeceği için o durumda ayrı ekleme kapalıdır.
  const yeniSinavVerisi = (courseData, dateStr, timeSlot, ek) => ({
    courseId: courseData.id,
    code: courseData.code,
    name: courseData.name,
    sinif: courseData.sinif,
    duration: courseData.duration,
    professor: courseData.professor,
    date: dateStr,
    timeSlot: timeSlot,
    periodId: activePeriodId,
    departmentId: selectedDeptId || null,
    seviye: courseData.seviye || seviye,
    studentCount: courseData.studentCount || 0,
    supervisor: '',
    room: '',
    createdAt: new Date().toISOString(),
    ...(ek || {}),
  });

  const sinavEkle = async (examData) => {
    try {
      const result = await DBWrite.add('sinav_programi', examData);
      setPlacedExams((prev) => [...prev, { id: result.id, ...examData }]);
      return true;
    } catch (e) {
      console.error('Drop save error:', e);
      alert('Kayıt hatası: ' + e.message);
      return false;
    }
  };

  const [ayniSaat, setAyniSaat] = useState(null); // { ders, tarih, saat, karar }

  const handleDrop = async (courseData, dateStr, timeSlot) => {
    // Akademisyen sadece kendi derslerini yerleştirebilir
    if (isProfessor && courseData.professor !== currentUser?.name) {
      alert('Sadece kendi derslerinizi programa ekleyebilirsiniz.');
      return;
    }
    const SB = window.SinavBirlesim;
    const karar = SB
      ? SB.yerlestirmeSecenekleri(courseData, dateStr, timeSlot, periodExams)
      : { oturumlar: [], ayriEklenebilir: true, engel: '' };
    if (karar.oturumlar.length === 0) {
      await sinavEkle(yeniSinavVerisi(courseData, dateStr, timeSlot));
      return;
    }
    setAyniSaat({ ders: courseData, tarih: dateStr, saat: timeSlot, karar });
  };

  // Seçilen oturumla ortak sınav: oturumun bağı yoksa kurulur, yeni ders
  // oturumun saatine, salonuna ve (elle girilmişse) gözetmenine katılır.
  const ortakSinavYap = async (oturum) => {
    const SB = window.SinavBirlesim;
    if (!ayniSaat || !SB) return;
    const bid = oturum.uyeler.map((u) => u.birlesimId).find(Boolean) || SB.yeniBirlesimId();
    try {
      for (const u of oturum.uyeler) {
        if (u.birlesimId !== bid) await DBWrite.update('sinav_programi', u.id, { birlesimId: bid });
      }
      const examData = yeniSinavVerisi(ayniSaat.ders, oturum.ozet.date, oturum.ozet.timeSlot, {
        birlesimId: bid,
        room: oturum.ozet.room || '',
        supervisor: oturum.ozet.supervisor || '',
      });
      const result = await DBWrite.add('sinav_programi', examData);
      const uyeIdleri = new Set(oturum.uyeler.map((u) => u.id));
      setPlacedExams((prev) => [
        ...prev.map((e) => (uyeIdleri.has(e.id) ? { ...e, birlesimId: bid } : e)),
        { id: result.id, ...examData },
      ]);
      setAyniSaat(null);
    } catch (e) {
      alert('Birleştirilemedi: ' + e.message);
    }
  };

  const ayriEkle = async () => {
    if (!ayniSaat) return;
    if (await sinavEkle(yeniSinavVerisi(ayniSaat.ders, ayniSaat.tarih, ayniSaat.saat)))
      setAyniSaat(null);
  };

  // Ortak oturumdan ayırma: kalan tek üye olursa onun bağı da çözülür.
  const birlesimdenAyir = async (exam) => {
    const SB = window.SinavBirlesim;
    if (!SB) return;
    const yamalar = SB.birlesimdenCikarYamalari(exam, periodExams);
    try {
      for (const y of yamalar) await DBWrite.update('sinav_programi', y.id, { birlesimId: '' });
      const ayrilan = new Set(yamalar.map((y) => y.id));
      setPlacedExams((prev) => prev.map((e) => (ayrilan.has(e.id) ? { ...e, birlesimId: '' } : e)));
    } catch (e) {
      alert('Ayrılamadı: ' + e.message);
    }
  };

  const handleUpdateExam = async (updatedExam) => {
    // Akademisyen sadece kendi derslerini düzenleyebilir
    if (isProfessor && updatedExam.professor !== currentUser?.name) {
      alert('Sadece kendi derslerinizi düzenleyebilirsiniz.');
      return;
    }
    try {
      const { id, ...data } = updatedExam;
      await DBWrite.update('sinav_programi', id, data);
      // Ortak sınav tek oturumdur: salon ve gözetmen bütün üyelerde aynı olmalı.
      const SB = window.SinavBirlesim;
      const digerleri =
        SB && updatedExam.birlesimId
          ? SB.grupUyeleri(updatedExam, periodExams).filter((e) => e.id !== id)
          : [];
      const ortak = { room: updatedExam.room || '', supervisor: updatedExam.supervisor || '' };
      for (const u of digerleri) {
        if ((u.room || '') !== ortak.room || (u.supervisor || '') !== ortak.supervisor)
          await DBWrite.update('sinav_programi', u.id, ortak);
      }
      const digerIdleri = new Set(digerleri.map((u) => u.id));
      setPlacedExams((prev) =>
        prev.map((e) =>
          e.id === id ? updatedExam : digerIdleri.has(e.id) ? { ...e, ...ortak } : e
        )
      );
    } catch (e) {
      console.error('Update error:', e);
      alert('Güncelleme hatası: ' + e.message);
    }
  };

  const handleRemoveExam = async (exam) => {
    // Akademisyen sadece kendi derslerini kaldırabilir
    if (isProfessor && exam.professor !== currentUser?.name) {
      alert('Sadece kendi derslerinizi takvimden kaldırabilirsiniz.');
      return;
    }
    try {
      // Ortak oturumdan çıkan sınav: geride tek üye kalırsa onun bağı da çözülür.
      const SB = window.SinavBirlesim;
      const kalan =
        SB && exam.birlesimId
          ? SB.grupUyeleri(exam, periodExams).filter((e) => e.id !== exam.id)
          : [];
      await DBWrite.remove('sinav_programi', exam.id);
      if (kalan.length === 1)
        await DBWrite.update('sinav_programi', kalan[0].id, { birlesimId: '' });
      setPlacedExams((prev) =>
        prev
          .filter((e) => e.id !== exam.id)
          .map((e) => (kalan.length === 1 && e.id === kalan[0].id ? { ...e, birlesimId: '' } : e))
      );
    } catch (e) {
      console.error('Remove error:', e);
      alert('Silme hatası: ' + e.message);
    }
  };

  const _handleDeleteCourse = async (course) => {
    if (!confirm(`${course.code} - ${course.name} dersini silmek istediğinize emin misiniz?`))
      return;

    try {
      // Aynı code+name+departmentId olan tüm kopyaları bul (dedup gizliyor olabilir)
      const cRef = getCoursesRef();
      let duplicateIds = [course.id];
      if (cRef) {
        try {
          const dupsSnap = await cRef
            .where('code', '==', course.code)
            .where('departmentId', '==', selectedDeptId || course.departmentId || null)
            .get();
          if (dupsSnap && !dupsSnap.empty) {
            const nameNorm = (course.name || '').trim().toLowerCase();
            duplicateIds = dupsSnap.docs
              .filter((d) => (d.data().name || '').trim().toLowerCase() === nameNorm)
              .map((d) => d.id);
            if (duplicateIds.length === 0) duplicateIds = [course.id];
          }
        } catch (_) {
          /* fallback to single delete */
        }
      }

      // Check for placed exams linked to any of the duplicates
      const linkedExams = placedExams.filter((e) => duplicateIds.includes(e.courseId));
      if (linkedExams.length > 0) {
        if (
          !confirm(
            `Bu derse ait ${linkedExams.length} adet sınav planlanmış durumda. Dersi silerseniz bu sınavlar da takvimden silinecek. Devam etmek istiyor musunuz?`
          )
        )
          return;
      }

      // Batch delete: all duplicate courses + their linked exams
      const ops = linkedExams.map((e) => ({
        collection: 'sinav_programi',
        type: 'delete',
        docId: e.id,
      }));
      duplicateIds.forEach((id) =>
        ops.push({ collection: 'sinav_dersler', type: 'delete', docId: id })
      );
      for (let i = 0; i < ops.length; i += 20) {
        await DBWrite.batch(ops.slice(i, i + 20));
      }
      if (linkedExams.length > 0) {
        setPlacedExams((prev) => prev.filter((e) => !duplicateIds.includes(e.courseId)));
      }

      alert('Ders silindi.');
      loadData();
    } catch (e) {
      console.error('Delete course error:', e);
      alert('Silme hatası: ' + e.message);
    }
  };

  const _handleCourseSave = async (existingCourse, formData) => {
    try {
      if (existingCourse) {
        await DBWrite.update('sinav_dersler', existingCourse.id, formData);
      } else {
        // Aynı code+name+departmentId zaten varsa ekleme (duplicate önleme)
        const cRef = getCoursesRef();
        if (cRef) {
          const deptId = selectedDeptId || null;
          const dupCheck = await cRef
            .where('code', '==', formData.code.trim())
            .where('departmentId', '==', deptId)
            .get();
          if (dupCheck && !dupCheck.empty) {
            const nameNorm = (formData.name || '').trim().toLowerCase();
            const exists = dupCheck.docs.some(
              (d) => (d.data().name || '').trim().toLowerCase() === nameNorm
            );
            if (exists) {
              alert('Bu ders zaten mevcut! Aynı ders kodu ve adıyla tekrar eklenemez.');
              return;
            }
          }
        }
        await DBWrite.add('sinav_dersler', {
          ...formData,
          donem: formData.donem || 'guz',
          seviye: formData.seviye || seviye, // bu modül örneğinin seviyesi
          studentCount: 0,
          departmentId: selectedDeptId || null,
          createdAt: new Date().toISOString(),
        });
      }
      // Akademisyen adı girilmişse ve professors koleksiyonunda yoksa otomatik ekle
      if (formData.professor && formData.professor.trim()) {
        const profName = formData.professor.trim();
        const pRef = getProfessorsRef();
        if (pRef) {
          const existCheck = await pRef.where('name', '==', profName).limit(1).get();
          if (existCheck.empty) {
            await DBWrite.add('professors', {
              name: profName,
              department: selectedDept?.name || '',
              departmentId: selectedDeptId || null,
              isExternal: false,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
      loadData();
    } catch (e) {
      alert('Hata: ' + e.message);
    }
  };

  const handlePeriodSave = () => {
    setShowPeriodModal(false);
    setEditingPeriod(null);
    loadData();
  };

  const handleDeletePeriod = async (periodId) => {
    if (
      !confirm(
        'Bu dönemi silmek istediğinize emin misiniz? Bu döneme ait tüm sınav yerleştirmeleri de silinecek.'
      )
    )
      return;
    try {
      const ops = [{ collection: 'sinav_donemler', type: 'delete', docId: periodId }];
      // İlişkili sınavları da sil
      const exRef = getExamsRef();
      if (exRef) {
        const snap = await exRef.where('periodId', '==', periodId).get();
        snap.docs.forEach((doc) =>
          ops.push({ collection: 'sinav_programi', type: 'delete', docId: doc.id })
        );
      }
      for (let i = 0; i < ops.length; i += 20) {
        await DBWrite.batch(ops.slice(i, i + 20));
      }
      if (activePeriodId === periodId) setActivePeriodId(null);
      loadData();
    } catch (e) {
      alert('Silme hatası: ' + e.message);
    }
  };

  // ── Department CRUD handlers ──
  const _handleDeptSave = async (existingDept, formData) => {
    if (existingDept) {
      await DBWrite.update('departments', existingDept.docId || existingDept.id, formData);
    } else {
      await DBWrite.add('departments', { ...formData, createdAt: new Date().toISOString() });
    }
    await loadDepartments();
    loadData();
  };

  const _handleDeptDelete = async (dept) => {
    if (
      !confirm(
        `"${dept.name}" bölümünü silmek istediğinize emin misiniz? Bu bölüme ait tüm veriler silinmez ama bölüm bağlantısı kaldırılır.`
      )
    )
      return;
    await DBWrite.remove('departments', dept.docId || dept.id);
    if (selectedDeptId === dept.id) setSelectedDeptId(null);
    await loadDepartments();
  };

  // ── Department Classroom CRUD handlers ──
  const _handleClassroomSave = async (existingRoom, formData) => {
    if (existingRoom) {
      await DBWrite.update('department_classrooms', existingRoom.id, formData);
    } else {
      await DBWrite.add('department_classrooms', {
        ...formData,
        departmentId: selectedDeptId,
        createdAt: new Date().toISOString(),
      });
    }
    await loadDeptResources(selectedDeptId);
  };

  const _handleClassroomDelete = async (room) => {
    if (!confirm(`"${room.name}" sınıfını silmek istiyor musunuz?`)) return;
    await DBWrite.remove('department_classrooms', room.id);
    await loadDeptResources(selectedDeptId);
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <Card>
        <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>Yükleniyor...</div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 4px 40px' }}>
        {/* Başlık — ortak banner (embedded modda gizli) */}
        {!embedded &&
          React.createElement(window.CakuBanner, {
            title: 'Sınav Programı Otomasyonu',
            subtitle: selectedDept
              ? selectedDept.name + ' — Dersleri sürükleyerek takvime yerleştirin'
              : 'Dersleri sürükleyerek takvime yerleştirin',
          })}
        <div
          style={{
            display: 'flex',
            justifyContent: embedded ? 'space-between' : 'flex-end',
            alignItems: 'center',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {embedded && (
            <div style={{ fontSize: 13, color: '#666' }}>
              Dersleri sürükleyerek takvime yerleştirin
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {seviye === 'lisans' &&
              isAdmin &&
              courses.length === 0 &&
              selectedDeptId &&
              selectedDept?.name?.toLowerCase().includes('bilgisayar') && (
                <Btn onClick={seedData} style={{ background: '#059669' }}>
                  Örnek Verileri Yükle (Bilgisayar Müh.)
                </Btn>
              )}
          </div>
        </div>

        {/* Department Manager Info — gömülü modda gizli (bilgi sarmalayıcıda) */}
        {!embedded && isDeptManager && (
          <Card style={{ marginBottom: 16, background: '#EDE9FE', border: '1px solid #C4B5FD' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7C3AED"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <div>
                <span style={{ fontWeight: 600, color: '#7C3AED' }}>
                  {currentUser?.departmentName || 'Bölüm'}
                </span>
                <span style={{ color: '#6B7280', fontSize: 13, marginLeft: 8 }}>
                  Bölüm Yetkilisi: {currentUser?.name}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Professor Info — gömülü modda gizli */}
        {!embedded && isProfessor && departments.length > 0 && selectedDeptId && (
          <Card style={{ marginBottom: 16, background: '#DBEAFE', border: '1px solid #93C5FD' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2563EB"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <div>
                <span style={{ fontWeight: 600, color: '#2563EB' }}>{currentUser?.name}</span>
                <span style={{ color: '#6B7280', fontSize: 13, marginLeft: 8 }}>
                  Akademisyen - Sadece kendi derslerinizi programa ekleyebilirsiniz
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Professor no department warning */}
        {isProfessor && departments.length === 0 && (
          <Card style={{ marginBottom: 16 }}>
            <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: 16, marginBottom: 8 }}>
                Henüz hiçbir bölümde dersiniz bulunmuyor
              </div>
              <div style={{ fontSize: 13 }}>
                Bölüm yetkilisi sizi bir derse atadığında burada görebilirsiniz.
              </div>
            </div>
          </Card>
        )}

        {/* No department selected warning for admin */}
        {isAdmin && departments.length > 0 && !selectedDeptId && (
          <Card style={{ marginBottom: 16 }}>
            <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: 16, marginBottom: 8 }}>Lütfen bir bölüm seçin</div>
              <div style={{ fontSize: 13 }}>
                Sınav programını yönetmek için yukarıdan bir bölüm seçin.
              </div>
            </div>
          </Card>
        )}

        {/* Sınav Dönemleri — her dönem; türü, tarih aralığı ve sınav sayısıyla
            birlikte bir kart olarak görünür. Eskiden dar butonlar ve minik
            düzenle/sil ikonları tek satıra sıkışıyordu. */}
        {periods.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {/* ── AÇILIR KAPANIR ──
                Dönem kartları sayfanın üstünü kaplıyordu; oysa dönem bir kez
                seçilip takvimle çalışılan bir şey. Başlık açar/kapar, kapalıyken
                hangi dönemin seçili olduğu özet satırında durur. */}
            <button
              type="button"
              onClick={() => activePeriod && setDonemlerAcik((v) => !v)}
              aria-expanded={donemlerGoster}
              disabled={!activePeriod}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: 0,
                marginBottom: donemlerGoster ? 10 : 0,
                border: 'none',
                background: 'transparent',
                fontFamily: 'inherit',
                cursor: activePeriod ? 'pointer' : 'default',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: '#6B7280',
                  opacity: activePeriod ? 1 : 0.35,
                  transform: donemlerGoster ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s',
                  lineHeight: 1,
                }}
              >
                ▶
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.navy, letterSpacing: 0.2 }}>
                Sınav Dönemleri
              </span>
              <span style={{ flex: 1 }} />
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#6B7280',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {donemOzeti}
              </span>
            </button>
            <div
              style={{
                display: donemlerGoster ? 'grid' : 'none',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 10,
              }}
            >
              {periods.map((p) => {
                const aktif = p.id === activePeriodId;
                const tur = EXAM_TYPES.find((t) => t.value === p.examType);
                const sinavSayisi = placedExams.filter((e) => e.periodId === p.id).length;
                const bas = p.startDate ? formatDate(parseDateISO(p.startDate)) : null;
                return (
                  <div
                    key={p.id}
                    onClick={() => setActivePeriodId(p.id)}
                    style={{
                      background: aktif ? C.blueLight : 'white',
                      border: `2px solid ${aktif ? C.blue : C.border}`,
                      borderRadius: 12,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all .18s',
                      boxShadow: aktif ? '0 2px 10px rgba(37,99,235,0.12)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: aktif ? C.blue : C.navy,
                          lineHeight: 1.35,
                        }}
                      >
                        {p.label || `${p.examType} - ${p.semester}`}
                      </span>
                      {tur && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 10,
                            background: aktif ? 'white' : '#F1F5F9',
                            color: aktif ? C.blue : '#64748B',
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tur.label}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 6, lineHeight: 1.5 }}>
                      {bas ? `${bas} · ${p.weeks || 2} hafta` : `${p.weeks || 2} hafta`}
                      <br />
                      {sinavSayisi > 0 ? `${sinavSayisi} sınav yerleştirildi` : 'Henüz sınav yok'}
                    </div>

                    {canManage && (
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          marginTop: 10,
                          paddingTop: 8,
                          borderTop: `1px solid ${aktif ? C.blue + '30' : C.border}`,
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPeriod(p);
                            setShowPeriodModal(true);
                          }}
                          style={{
                            flex: 1,
                            background: 'white',
                            border: `1px solid ${C.border}`,
                            borderRadius: 7,
                            padding: '5px 0',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            color: C.navy,
                            fontFamily: 'inherit',
                          }}
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePeriod(p.id);
                          }}
                          style={{
                            flex: 1,
                            background: 'white',
                            border: '1px solid #FCA5A5',
                            borderRadius: 7,
                            padding: '5px 0',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#DC2626',
                            fontFamily: 'inherit',
                          }}
                        >
                          Sil
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Ekleme karosu — dönemlerin yanında, aradığınız yerde */}
              {canManage && (
                <button
                  onClick={() => {
                    setEditingPeriod(null);
                    setShowPeriodModal(true);
                  }}
                  style={{
                    background: 'white',
                    border: `2px dashed ${C.border}`,
                    borderRadius: 12,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    color: C.navy,
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    minHeight: 96,
                  }}
                >
                  <span style={{ fontSize: 20, fontWeight: 400, lineHeight: 1 }}>+</span>
                  Yeni Sınav Dönemi
                </button>
              )}
            </div>
          </div>
        )}

        {/* No period selected */}
        {!activePeriod && (
          <Card>
            <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>&#128197;</div>
              <div style={{ fontSize: 16, marginBottom: 8 }}>Sınav dönemi bulunamadı</div>
              <div style={{ fontSize: 13 }}>
                {canManage
                  ? 'Yeni bir sınav dönemi oluşturun (Final, Vize veya Bütünleme)'
                  : 'Yönetici henüz bir sınav dönemi oluşturmadı'}
              </div>
              {canManage && (
                <Btn
                  onClick={() => {
                    setEditingPeriod(null);
                    setShowPeriodModal(true);
                  }}
                  style={{ marginTop: 16 }}
                >
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setViewMode('calendar')}
                  style={{
                    padding: '6px 14px',
                    border: `1px solid ${C.border}`,
                    borderRadius: '8px 0 0 8px',
                    background: viewMode === 'calendar' ? C.navy : 'white',
                    color: viewMode === 'calendar' ? 'white' : '#666',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Takvim
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  style={{
                    padding: '6px 14px',
                    border: `1px solid ${C.border}`,
                    borderRadius: '0 8px 8px 0',
                    background: viewMode === 'table' ? C.navy : 'white',
                    color: viewMode === 'table' ? 'white' : '#666',
                    cursor: 'pointer',
                    fontSize: 13,
                    borderLeft: 'none',
                  }}
                >
                  Tablo
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#666' }}>
                  {periodExams.length}/{courses.length} ders yerleştirildi
                </span>
                {/* Çakışma rozeti — fakülte geneli denetimin özeti. Tıklayınca
                    panel açılır; engel/bekleyen sayısı renkten okunur. */}
                {periodExams.length > 0 && (
                  <button
                    onClick={() => setCakismaPaneli((v) => !v)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      border:
                        '1px solid ' +
                        (cakismaOzet.engel > 0
                          ? '#FCA5A5'
                          : cakismaOzet.bekleyen > 0
                            ? '#FCD34D'
                            : '#A7F3D0'),
                      background:
                        cakismaOzet.engel > 0
                          ? '#FEF2F2'
                          : cakismaOzet.bekleyen > 0
                            ? '#FFFBEB'
                            : '#ECFDF5',
                      color:
                        cakismaOzet.engel > 0
                          ? '#B91C1C'
                          : cakismaOzet.bekleyen > 0
                            ? '#B45309'
                            : '#047857',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Fakülte geneli çakışma denetimi"
                  >
                    {cakismaOzet.engel > 0
                      ? cakismaOzet.engel + ' engel'
                      : cakismaOzet.bekleyen > 0
                        ? cakismaOzet.bekleyen + ' çakışma kararı bekliyor'
                        : 'Çakışma yok'}
                    {cakismaOzet.kabul > 0 ? ' · ' + cakismaOzet.kabul + ' şartlı kabul' : ''}
                  </button>
                )}
                {canManage && selectedDeptId && (
                  <GhostBtn
                    onClick={() => setGozetmenKuralAcik(true)}
                    style={{ fontSize: 12, padding: '4px 10px' }}
                  >
                    Gözetmen Kuralları
                  </GhostBtn>
                )}
                {/* Dekanlık/Bölüm çıktıları yalnızca bölüm/fakülte/üniversite
                    yetkililerinde görünür; sıradan akademisyende gizli. */}
                {canManage && periodExams.length > 0 && (
                  <>
                    <GhostBtn
                      onClick={async () =>
                        cikisIzniVar() &&
                        exportToXLSX(
                          periodExams,
                          activePeriod.label,
                          activePeriod,
                          deptClassrooms.length > 0 ? deptClassrooms : null,
                          deptSupervisors.length > 0 ? deptSupervisors.map((s) => s.name) : null,
                          selectedDept?.name || null,
                          await bolumGozetmenKurallari(selectedDeptId),
                          window.gozetmenMusaitsizlikHaritasi
                            ? window.gozetmenMusaitsizlikHaritasi(deptSupervisors)
                            : {}
                        )
                      }
                      style={{
                        fontSize: 12,
                        padding: '4px 10px',
                        background: '#059669',
                        color: 'white',
                        border: 'none',
                      }}
                    >
                      Dekanlık Çıktısı
                    </GhostBtn>
                    <GhostBtn
                      onClick={() =>
                        cikisIzniVar() &&
                        exportDeptPrintable(
                          periodExams,
                          activePeriod.label,
                          selectedDept?.name,
                          deptClassrooms.length > 0 ? deptClassrooms : null,
                          selectedDept?.id || activeDepartment
                        )
                      }
                      style={{
                        fontSize: 12,
                        padding: '4px 10px',
                        background: '#7C3AED',
                        color: 'white',
                        border: 'none',
                      }}
                    >
                      Bölüm Çıktısı
                    </GhostBtn>
                  </>
                )}
                {canManage && periodExams.length === 0 && (
                  <>
                    <GhostBtn
                      onClick={() =>
                        alert(
                          'Henüz takvime yerleştirilmiş sınav yok. Önce dersleri takvime sürükleyin.'
                        )
                      }
                      style={{
                        fontSize: 12,
                        padding: '4px 10px',
                        background: '#059669',
                        color: 'white',
                        border: 'none',
                        opacity: 0.5,
                      }}
                    >
                      Dekanlık Çıktısı
                    </GhostBtn>
                  </>
                )}
              </div>
            </div>

            {/* Legend — lisansüstünde sınıf ayrımı yok */}
            {!sinifsiz && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                {Object.entries(SINIF_COLORS).map(([s, color]) => (
                  <div
                    key={s}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: color.bg,
                        border: `1px solid ${color.text}30`,
                      }}
                    />
                    <span style={{ color: color.text, fontWeight: 500 }}>{color.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Çakışma paneli ── */}
            {cakismaPaneli && (
              <Card style={{ marginBottom: 12 }}>
                <div style={{ padding: 4 }}>
                  <div style={{ fontWeight: 800, color: C.navy, fontSize: 15, marginBottom: 4 }}>
                    Fakülte geneli çakışma denetimi
                  </div>
                  <div style={{ fontSize: 12.5, color: '#555', marginBottom: 14, lineHeight: 1.6 }}>
                    Salonlar ve gözetmenler bölüm bölüm tanımlı; bu denetim{' '}
                    <strong>bütün bölümlerin</strong> sınavlarını birlikte inceler. Her çakışma hata
                    değildir — bir salonda iki bölümün sınavı kapasite yetiyorsa birlikte
                    yapılabilir. Böyle durumlarda <strong>sebebini yazarak şartlı kabul</strong>{' '}
                    edebilirsiniz; kabul kim ve ne zaman yaptıysa kayda geçer.
                  </div>
                  {cakismalar.length === 0 && (
                    <div style={{ fontSize: 13, color: '#047857', fontWeight: 600 }}>
                      Çakışma bulunamadı — program resmî çıktıya hazır.
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {cakismalar.map((c) => {
                      const engel = c.seviye === 'engel';
                      const kabulEdildi = !!c.kabul;
                      const renk = engel ? '#B91C1C' : kabulEdildi ? '#047857' : '#B45309';
                      const arka = engel ? '#FEF2F2' : kabulEdildi ? '#ECFDF5' : '#FFFBEB';
                      return (
                        <div
                          key={c.anahtar}
                          style={{
                            border: '1px solid ' + renk + '44',
                            borderLeft: '4px solid ' + renk,
                            borderRadius: 10,
                            background: arka,
                            padding: '10px 14px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 12,
                              flexWrap: 'wrap',
                              alignItems: 'center',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, color: renk, fontSize: 13.5 }}>
                                {engel ? 'ENGEL' : kabulEdildi ? 'ŞARTLI KABUL' : 'KARAR BEKLİYOR'}{' '}
                                · {c.baslik}
                              </div>
                              <div style={{ fontSize: 12.5, color: '#444', marginTop: 3 }}>
                                {c.aciklama}
                              </div>
                              <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>
                                {c.cozum}
                              </div>
                              {kabulEdildi && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: '#047857',
                                    marginTop: 5,
                                    fontWeight: 600,
                                  }}
                                >
                                  “{c.kabul.sebep}” — {c.kabul.kabulEden || 'yetkili'}
                                  {c.kabul.tarih
                                    ? ' · ' + new Date(c.kabul.tarih).toLocaleDateString('tr-TR')
                                    : ''}
                                </div>
                              )}
                            </div>
                            {canManage && c.kabulEdilebilir && (
                              <div style={{ flexShrink: 0 }}>
                                {kabulEdildi ? (
                                  <GhostBtn
                                    onClick={() => kabulGeriAl(c)}
                                    style={{ fontSize: 12, padding: '4px 10px' }}
                                  >
                                    Kabulü geri al
                                  </GhostBtn>
                                ) : (
                                  <GhostBtn
                                    onClick={() => setKabulEdilen(c)}
                                    style={{
                                      fontSize: 12,
                                      padding: '4px 10px',
                                      background: '#B45309',
                                      color: 'white',
                                      border: 'none',
                                    }}
                                  >
                                    Şartlı kabul et
                                  </GhostBtn>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}

            {viewMode === 'calendar' ? (
              <div
                style={{
                  display: 'flex',
                  gap: r.val(8, 12, 16),
                  flexDirection: r.isTablet ? 'column' : 'row',
                }}
              >
                {/* Course Pool Sidebar */}
                <div
                  style={{
                    width: r.isTablet ? '100%' : r.val(180, 200, 220),
                    minWidth: r.isTablet ? 'auto' : r.val(180, 200, 220),
                    maxHeight: r.isMobile ? 180 : r.isTablet ? 220 : 'calc(100vh - 260px)',
                    overflowY: 'auto',
                    background: 'white',
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    padding: r.val(8, 10, 12),
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.navy, marginBottom: 8 }}>
                    Ders Havuzu
                  </div>
                  <div style={{ marginBottom: 8, position: 'relative' }}>
                    <input
                      type="text"
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      placeholder="Ders ara (kod, ad, akademisyen)..."
                      style={{
                        width: '100%',
                        padding: '6px 28px 6px 8px',
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        fontSize: 12,
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#FAFAFA',
                      }}
                    />
                    {courseSearch && (
                      <button
                        onClick={() => setCourseSearch('')}
                        style={{
                          position: 'absolute',
                          right: 6,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 14,
                          color: '#999',
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <select
                      value={filterDonem}
                      onChange={(e) => setFilterDonem(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        background:
                          filterDonem === 'guz'
                            ? '#BBDEFB'
                            : filterDonem === 'bahar'
                              ? '#C8E6C9'
                              : 'white',
                      }}
                    >
                      <option value="all">Tüm Dönemler</option>
                      <option value="guz">🍂 Güz Dönemi</option>
                      <option value="bahar">🌸 Bahar Dönemi</option>
                    </select>
                  </div>
                  {!sinifsiz && (
                    <div style={{ marginBottom: 8 }}>
                      <select
                        value={filterSinif}
                        onChange={(e) => setFilterSinif(parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '4px 8px',
                          border: `1px solid ${C.border}`,
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      >
                        <option value={0}>Tüm Sınıflar</option>
                        <option value={1}>1. Sınıf</option>
                        <option value={2}>2. Sınıf</option>
                        <option value={3}>3. Sınıf</option>
                        <option value={4}>4. Sınıf</option>
                        <option value={5}>Seçmeli Dersler</option>
                      </select>
                    </div>
                  )}

                  {/* Lisansüstü: sınıf gruplaması yok — dersler düz liste */}
                  {sinifsiz && poolCourses.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {poolCourses.map((c, i) => (
                        <DraggableCourseCard
                          key={c.id || i}
                          course={c}
                          isPlaced={false}
                          placedCount={c.placedCount}
                          canDrag={canManage || (isProfessor && c.professor === currentUser?.name)}
                        />
                      ))}
                    </div>
                  )}

                  {!sinifsiz &&
                    [1, 2, 3, 4, 5].map((sinif) => {
                      if (filterSinif > 0 && filterSinif !== sinif) return null;
                      const group = groupedPool[sinif];
                      if (!group || group.length === 0) return null;
                      return (
                        <div key={sinif} style={{ marginBottom: 12 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: SINIF_COLORS[sinif].text,
                              background: SINIF_COLORS[sinif].bg,
                              padding: '4px 8px',
                              borderRadius: 4,
                              marginBottom: 6,
                            }}
                          >
                            {SINIF_COLORS[sinif].label} ({group.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {group.map((c, i) => (
                              <DraggableCourseCard
                                key={c.id || i}
                                course={c}
                                isPlaced={false}
                                placedCount={c.placedCount}
                                canDrag={
                                  canManage || (isProfessor && c.professor === currentUser?.name)
                                }
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}

                  {poolCourses.length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 12 }}>
                      Ders bulunamadı
                    </div>
                  )}
                </div>

                {/* Calendar Grid */}
                <div
                  style={{
                    flex: 1,
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    background: 'white',
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    maxWidth: '100%',
                  }}
                >
                  {calendarDays.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                      Takvim günleri bulunamadı. Dönem tarihlerini kontrol edin.
                    </div>
                  ) : (
                    <table
                      style={{
                        borderCollapse: 'collapse',
                        width: '100%',
                        tableLayout: 'fixed',
                        minWidth: Math.max(400, calendarDays.length * 100 + 52),
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              padding: '8px 4px',
                              background: '#1B2A4A',
                              color: 'white',
                              fontSize: 11,
                              fontWeight: 600,
                              width: 52,
                              position: 'sticky',
                              left: 0,
                              zIndex: 2,
                              borderRight: '2px solid rgba(255,255,255,0.2)',
                            }}
                          >
                            Saat
                          </th>
                          {calendarDays.map((day, i) => (
                            <th
                              key={i}
                              style={{
                                padding: '6px 4px',
                                background: '#1B2A4A',
                                color: 'white',
                                fontSize: 11,
                                fontWeight: 500,
                                textAlign: 'center',
                                minWidth: 100,
                                borderLeft: '1px solid rgba(255,255,255,0.15)',
                              }}
                            >
                              <div>{getDayNameShort(day)}</div>
                              <div style={{ fontSize: 10, opacity: 0.7 }}>{formatDate(day)}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleTimeSlots.map((slot, slotIdx) => (
                          <tr key={slot}>
                            <td
                              style={{
                                padding: '2px 4px',
                                fontSize: 10,
                                fontWeight: 500,
                                color: '#666',
                                textAlign: 'center',
                                background: '#F9FAFB',
                                borderRight: '2px solid #E5E7EB',
                                borderBottom: '1px solid #E5E7EB',
                                position: 'sticky',
                                left: 0,
                                zIndex: 1,
                              }}
                            >
                              {slot}
                            </td>
                            {calendarDays.map((day, dayIdx) => (
                              <CalendarCell
                                key={dayIdx}
                                day={day}
                                timeSlot={slot}
                                slotIndex={slotIdx}
                                placedExams={turkishifiedPeriodExams}
                                onDrop={handleDrop}
                                onExamClick={setEditingExam}
                                totalSlots={visibleTimeSlots.length}
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
                <ExamTableView placedExams={turkishifiedPeriodExams} onExamClick={setEditingExam} />
              </Card>
            )}
          </>
        )}

        {/* Modals */}
        {editingExam && (
          <EditExamModal
            exam={editingExam}
            grup={
              window.SinavBirlesim && editingExam.birlesimId
                ? window.SinavBirlesim.grupUyeleri(editingExam, turkishifiedPeriodExams)
                : []
            }
            onAyir={canManage ? birlesimdenAyir : null}
            professors={professors}
            onSave={handleUpdateExam}
            onRemove={handleRemoveExam}
            onClose={() => setEditingExam(null)}
            readOnly={isProfessor && editingExam?.professor !== currentUser?.name}
          />
        )}

        {showPeriodModal && (
          <PeriodConfigModal
            period={editingPeriod}
            departmentId={selectedDeptId}
            seviye={seviye}
            onSave={handlePeriodSave}
            onClose={() => {
              setShowPeriodModal(false);
              setEditingPeriod(null);
            }}
          />
        )}

        {ayniSaat && (
          <AyniSaatPenceresi
            {...ayniSaat}
            birlestirebilir={canManage}
            onBirlestir={ortakSinavYap}
            onAyriEkle={ayriEkle}
            onClose={() => setAyniSaat(null)}
          />
        )}

        {gozetmenKuralAcik && window.GozetmenKurallariPaneli && (
          <Modal
            open={true}
            title={'Gözetmen Kuralları' + (selectedDept?.name ? ' — ' + selectedDept.name : '')}
            onClose={() => setGozetmenKuralAcik(false)}
            width={720}
          >
            <div style={{ fontSize: 12.5, color: '#6B7280', marginBottom: 12, lineHeight: 1.55 }}>
              Dekanlık çıktısındaki otomatik gözetmen ataması bu kurallarla yapılır. Gözetmen
              listesi Bölüm Yönetimi → Gözetmenler ekranından yönetilir ({deptSupervisors.length}{' '}
              gözetmen tanımlı).
            </div>
            <window.GozetmenKurallariPaneli departmentId={selectedDeptId} />
          </Modal>
        )}

        {kabulEdilen && (
          <SartliKabulModal
            cakisma={kabulEdilen}
            onKabul={cakismayiKabulEt}
            onClose={() => setKabulEdilen(null)}
          />
        )}
      </div>
    </div>
  );
}

// ── Şartlı kabul penceresi ──
// Sebep ZORUNLU. Kabul bir imzadır: "kapasite yeterli, iki bölüm ortak salon
// kullanacak" diyen kişi kayda geçer ve dekanlık çıktısında bu karar
// arkasında durulur. Sebepsiz kabul, denetimi hiç yapmamakla aynı şeydir.
const SartliKabulModal = ({ cakisma, onKabul, onClose }) => {
  const [sebep, setSebep] = useState('');
  const [busy, setBusy] = useState(false);
  const HAZIR = [
    'Kapasite yeterli — iki bölüm salonu birlikte kullanacak.',
    'Aynı salon, tek gözetmen iki sınavı birden gözetecek.',
    'Seçmeli dersler — ortak öğrenci yok, kontrol edildi.',
  ];
  return (
    <Modal open={true} title="Çakışmayı şartlı kabul et" onClose={onClose} width={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: '#FFFBEB',
            border: '1px solid #FCD34D',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <strong>{cakisma.baslik}</strong>
          <div style={{ marginTop: 4, color: '#555' }}>{cakisma.aciklama}</div>
          <div style={{ marginTop: 4, color: '#B45309' }}>{cakisma.cozum}</div>
        </div>
        <FormField label="Kabul sebebi *">
          <textarea
            value={sebep}
            onChange={(e) => setSebep(e.target.value)}
            rows={3}
            placeholder="Bu çakışmayı neden kabul ediyorsunuz? Karar kayda geçecek."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid ' + (C ? C.border : '#E5E1D8'),
              fontSize: 13.5,
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </FormField>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {HAZIR.map((h) => (
            <button
              key={h}
              onClick={() => setSebep(h)}
              style={{
                padding: '4px 10px',
                borderRadius: 14,
                border: '1px solid ' + (C ? C.border : '#E5E1D8'),
                background: 'white',
                fontSize: 11.5,
                cursor: 'pointer',
                color: '#555',
              }}
            >
              {h}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <GhostBtn onClick={onClose}>Vazgeç</GhostBtn>
          <Btn
            disabled={busy || sebep.trim().length < 3}
            onClick={async () => {
              setBusy(true);
              const ok = await onKabul(cakisma, sebep);
              setBusy(false);
              if (ok) onClose();
            }}
          >
            {busy ? 'Kaydediliyor…' : 'Şartlı kabul et'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

// Export to window
window.SinavOtomasyonuApp = SinavOtomasyonuApp;
