// ══════════════════════════════════════════════════════════════
// ÇAKÜ Sınav Programı Otomasyonu - Sürükle-Bırak Takvim
// Drag-and-drop haftalık takvim grid, ders havuzu, tablo görünümü
// Shared bileşenler shared-components.jsx'den window üzerinden gelir
// ══════════════════════════════════════════════════════════════

import { docxParcalari } from './lib/basit-docx.js';

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
        border: '1px solid ' + (C ? C.border : '#E2E8F0'),
        background: hover ? (C ? C.blueLight : '#CCFBF1') : 'transparent',
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
// Bölüm kaydından yalnız departments.gozetmenSayiKurali (salon başına
// gözetmen) okunur. Dersin hocası kuralı bölüm seçimi değil, fakülte
// kuralıdır: hoca her sınavında ilk gözetmen (otomatikAtamaHesapla).
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
  return { sayiKurali: bolum && bolum.gozetmenSayiKurali };
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

// Saat, takvimdeki 30 dakikalık satırlardan hangisine düşer? Başlangıç
// serbest girilebildiği için (ör. 09:15) tam eşleşme aranmaz: içine düştüğü
// satır döner. Takvim 08:30'dan başlar ve satırlar kesintisiz 30 dakikadır.
function timeToSlotIndex(timeStr) {
  const idx = TIME_SLOTS.indexOf(timeStr);
  if (idx >= 0) return idx;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(timeStr || ''));
  if (!m) return 0;
  const dk = Number(m[1]) * 60 + Number(m[2]);
  return Math.max(0, Math.min(TIME_SLOTS.length - 1, Math.floor((dk - (8 * 60 + 30)) / 30)));
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
const PeriodConfigModal = ({
  period,
  onSave,
  onClose,
  departmentId,
  seviye = 'lisans',
  kilitKontrol,
}) => {
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
    // Fakülteye gönderilmiş dönem grubu (mevcut ya da hedef) değiştirilemez.
    if (
      kilitKontrol &&
      ((period && kilitKontrol(period)) ||
        kilitKontrol({ examType, semester, seviye: period?.seviye || seviye }))
    )
      return;
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
  // birlestirebilir: true/false ya da oturuma göre karar veren fonksiyon
  // (akademisyen yalnız iki tarafın da hocası kendisiyse birleştirir).
  const birlesimIzni = (o) =>
    typeof birlestirebilir === 'function' ? birlestirebilir(o) : !!birlestirebilir;
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

        <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.55 }}>
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
                border: '1px solid ' + (o.iliski === 'farkli' ? '#E2E8F0' : '#99F6E4'),
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
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                  {o.uyeler.length > 1 ? 'Ortak sınav: ' : ''}
                  {o.ozet.kodlar.join(' + ')}{' '}
                  <span style={{ fontWeight: 500, color: '#64748B' }}>({o.ozet.timeSlot})</span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: o.iliski === 'farkli' ? '#64748B' : '#0F766E',
                  }}
                >
                  {iliski.etiket}
                </span>
              </div>
              {o.uyeler.map((u) => (
                <div key={u.id} style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                  {u.code} {u.name} · {u.sinif === 5 ? 'Seçmeli' : u.sinif + '. sınıf'} ·{' '}
                  {u.studentCount || 0} öğr.{u.professor ? ' · ' + u.professor : ''}
                </div>
              ))}
              <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 5 }}>
                {iliski.aciklama} Birleşince toplam{' '}
                <b>{o.ozet.toplamOgrenci + (Number(ders.studentCount) || 0)} öğrenci</b>.
                {o.ayniSinif ? ' Aynı sınıfın öğrencileri bu sınavda.' : ''}
                {o.ayniHoca ? ' Aynı öğretim elemanının sınavı (' + o.ayniHoca + ').' : ''}
              </div>
              <div style={{ marginTop: 8 }}>
                {o.zatenVar ? (
                  <span style={{ fontSize: 12, color: '#B45309', fontWeight: 600 }}>
                    Bu ders zaten bu oturumda.
                  </span>
                ) : birlesimIzni(o) ? (
                  <Btn onClick={() => calistir(() => onBirlestir(o))} disabled={mesgul}>
                    Bununla ortak sınav yap
                  </Btn>
                ) : (
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    Birleştirmeyi bölüm yetkilisi yapar (iki dersin de hocası sizseniz kendiniz
                    birleştirebilirsiniz).
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

// ── ÇOKLU SEÇİM (salon / gözetmen) ──
// Değer düz metin olarak saklanır ("M101 - M102", "Ali KAYA, Ayşe SU") —
// mevcut kayıtlar ve çıktılar bu biçimi kullanıyor. Seçenekler açılır
// listeden eklenir; listede olmayan mevcut değer de kaybolmaz (etiket kalır).
// secenekler: [{ deger, etiket, grup? }]
const CokluSecim = ({
  deger,
  ayrac,
  secenekler = [],
  onChange,
  readOnly = false,
  bosMetin = 'Seçilmedi',
  ekleMetni = '+ Ekle',
}) => {
  // Salonlar " - " ya da (eski kayıtlarda) virgülle ayrılır — çıktı ve
  // fakülte tablosu da aynı kuralla böler (lib/sinav-fakulte.js).
  const bol = (v) => [
    ...new Set(
      String(v || '')
        .split(ayrac.trim() === '-' ? /\s+-\s+|,/ : /\s*,\s*/)
        .map((x) => x.trim())
        .filter(Boolean)
    ),
  ];
  const secili = bol(deger);
  const yaz = (l) => onChange([...new Set(l)].join(ayrac));
  const kalan = secenekler.filter((o) => !secili.includes(o.deger));
  const ELLE = '__elle__';
  const elleEkle = () => {
    const v = window.prompt('Listede olmayan değeri yazın:');
    if (v && v.trim()) yaz([...secili, ...bol(v)]);
  };
  const gruplar = [...new Set(kalan.map((o) => o.grup || ''))];
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        alignItems: 'center',
        padding: 6,
        minHeight: 38,
        border: '1px solid #CBD5E1',
        borderRadius: 8,
        background: readOnly ? '#F1F5F9' : '#fff',
      }}
    >
      {secili.length === 0 && (
        <span style={{ fontSize: 12.5, color: '#94A3B8', padding: '0 4px' }}>{bosMetin}</span>
      )}
      {secili.map((x) => (
        <span
          key={x}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 999,
            background: '#F0FDFA',
            border: '1px solid #99F6E4',
            fontSize: 12.5,
            color: '#115E59',
          }}
        >
          {(secenekler.find((o) => o.deger === x) || {}).etiket || x}
          {!readOnly && (
            <button
              type="button"
              aria-label={x + ' kaldır'}
              onClick={() => yaz(secili.filter((y) => y !== x))}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#0F766E',
                fontSize: 14,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        <select
          value=""
          aria-label={ekleMetni}
          onChange={(e) => {
            const v = e.target.value;
            if (v === ELLE) elleEkle();
            else if (v) yaz([...secili, v]);
          }}
          style={{
            border: '1px dashed #5EEAD4',
            borderRadius: 999,
            padding: '3px 8px',
            fontSize: 12.5,
            color: '#0F766E',
            background: '#fff',
            cursor: 'pointer',
            maxWidth: 220,
          }}
        >
          <option value="">{ekleMetni}</option>
          <option value={ELLE}>Listede yok — elle yaz…</option>
          {gruplar.map((g) =>
            g ? (
              <optgroup key={g} label={g}>
                {kalan
                  .filter((o) => (o.grup || '') === g)
                  .map((o) => (
                    <option key={o.deger} value={o.deger}>
                      {o.etiket || o.deger}
                    </option>
                  ))}
              </optgroup>
            ) : (
              kalan
                .filter((o) => !o.grup)
                .map((o) => (
                  <option key={o.deger} value={o.deger}>
                    {o.etiket || o.deger}
                  </option>
                ))
            )
          )}
        </select>
      )}
    </div>
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
  salonSecenekleri = [],
  gozetmenSecenekleri = [],
}) => {
  const [studentCount, setStudentCount] = useState(exam?.studentCount || '');
  const [supervisor, setSupervisor] = useState(exam?.supervisor || '');
  const [room, setRoom] = useState(exam?.room || '');
  const [duration, setDuration] = useState(exam?.duration || 30);
  const [professor, setProfessor] = useState(exam?.professor || '');
  // Sınıf da diğer alanlarla birlikte kaydedilir: ayrı ve anında kaydedilip
  // pencere açık kalınca "Kaydet" eski değeri geri yazıyordu.
  const [sinif, setSinif] = useState(Number(exam?.sinif) || 1);
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
        duration: Math.min(480, Math.max(5, parseInt(duration) || 30)),
        professor,
        sinif,
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
            background: SINIF_COLORS[exam.sinif]?.bg || '#f1f5f9',
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
            style={readOnly ? { background: '#F1F5F9' } : {}}
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
            <Select value={sinif} onChange={(e) => setSinif(parseInt(e.target.value) || 1)}>
              {[1, 2, 3, 4, 5].map((s) => (
                <option key={s} value={s}>
                  {s === 5 ? 'Seçmeli' : s + '. Sınıf'}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        <FormField label="Sınav Süresi (dk)">
          {/* Süre serbest girilir (ör. 40, 50, 70); liste yalnız öneridir. */}
          <Input
            type="number"
            min="5"
            max="480"
            list="sinav-sure-onerileri"
            value={duration}
            onChange={(e) => !readOnly && setDuration(e.target.value)}
            readOnly={readOnly}
            placeholder="Örn: 50"
            style={readOnly ? { background: '#F1F5F9' } : {}}
          />
          <datalist id="sinav-sure-onerileri">
            {[30, 40, 45, 50, 60, 75, 90, 120].map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
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
                ? { background: '#F1F5F9' }
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
          <CokluSecim
            deger={supervisor}
            ayrac=", "
            secenekler={
              window.SinavFakulte
                ? window.SinavFakulte.gozetmenSecenekListesi(
                    // Ortak oturumda gözetmen bütün oturuma yazılır: oturumdaki
                    // bütün derslerin hocaları seçenektedir.
                    window.SinavFakulte.sinavHocalari(
                      grup.length > 1
                        ? grup.map((u) => (u.id === exam.id ? { ...u, professor } : u))
                        : { ...exam, professor }
                    ),
                    gozetmenSecenekleri
                  )
                : gozetmenSecenekleri
            }
            onChange={setSupervisor}
            readOnly={readOnly}
            bosMetin="Gözetmen seçilmedi"
            ekleMetni="+ Gözetmen ekle"
          />
        </FormField>
        <FormField label="Sınıf / Salon">
          <CokluSecim
            deger={room}
            ayrac=" - "
            secenekler={salonSecenekleri}
            onChange={setRoom}
            readOnly={readOnly}
            bosMetin="Salon seçilmedi"
            ekleMetni="+ Salon ekle"
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
                if (
                  !window.confirm(
                    (exam.code || 'Sınav') +
                      ' takvimden kaldırılacak' +
                      (grup.length > 1 ? ' (ortak oturumdan da çıkar)' : '') +
                      '. Emin misiniz?'
                  )
                )
                  return;
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
        background: canDrag ? color.bg : '#F1F5F9',
        color: canDrag ? color.text : '#94A3B8',
        borderRadius: 6,
        fontSize: 12,
        cursor: canDrag ? 'grab' : 'default',
        border: `1px solid ${canDrag ? color.text + '30' : '#E2E8F0'}`,
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
              background: canDrag ? color.text : '#94A3B8',
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
      // Bitiş: başlangıç dilimin içinde kaydıysa (09:15) süre bir dilim daha taşabilir.
      const m = /^(\d{1,2}):(\d{2})/.exec(String(e.timeSlot || ''));
      const kayma = m ? (Number(m[1]) * 60 + Number(m[2]) - (8 * 60 + 30)) % 30 : 0;
      const sure = (Number(e.duration) || 60) + (kayma > 0 ? kayma : 0);
      return { e, bas, bit: bas + Math.max(1, slotSpan(sure)) };
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
        border: sinifCakismasi ? '2px solid #DC2626' : '1px solid #E2E8F0',
        padding: 0,
        height: cellHeight * span,
        minWidth: 100,
        maxWidth: 'none',
        verticalAlign: 'top',
        background: dragOver ? '#CCFBF1' : blok ? (coklu ? '#F8FAFC' : tekRenk.bg) : 'white',
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
    return String(a.timeSlot || '').localeCompare(String(b.timeSlot || ''));
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
              <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
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
                  background: i % 2 === 0 ? 'white' : '#F8FAFC',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${C.border}`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = color.bg + '60')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#F8FAFC')
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
                    <span style={{ color: '#94A3B8' }}>Atanmadı</span>
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
                <td colSpan={3} style={{ padding: 30, textAlign: 'center', color: '#94A3B8' }}>
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
          <div style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
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
                <td colSpan={3} style={{ padding: 30, textAlign: 'center', color: '#94A3B8' }}>
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
          <div style={{ padding: 30, textAlign: 'center', color: '#94A3B8' }}>
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
  departmentId,
  // { gozetmenAdlari, kurallar, musaitsizlik, digerSinavlar } — salon ve
  // gözetmen Dekanlık çıktısıyla AYNI hesapla (otomatikAtamaHesapla) bulunur.
  atamaSecenek
) {
  const SINIF_BG = {
    1: '#B2EBF2',
    2: '#C8E6C9',
    3: '#FFE0B2',
    4: '#F8BBD0',
    5: '#E1BEE7',
  };

  const sorted = [...placedExams].map(turkishifyExam).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return String(a.timeSlot || '').localeCompare(String(b.timeSlot || ''));
  });

  // Resmî çıktı yalnız KAYITLI salon ve gözetmeni basar: kaydedilmemiş
  // otomatik öneri belgede kesinmiş gibi görünüyordu (fakülte tablosuyla da
  // farklı kişi çıkabiliyordu). Boş alan çıktı öncesinde uyarılır.
  void atamaSecenek;
  const enriched = sorted.map((exam) => {
    const room = exam.room && exam.room !== 'TBD' ? exam.room : '';
    const supervisors = (exam.supervisor || '').trim();
    const [sh, sm] = exam.timeSlot.split(':').map(Number);
    const totalMin = sh * 60 + sm + (exam.duration || 60);
    const eh = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const em = String(totalMin % 60).padStart(2, '0');
    const dateObj = parseDateISO(exam.date);
    return {
      ...exam,
      assignedRoom: room,
      assignedSupervisors: supervisors,
      startStr: formatDate(dateObj) + ' - ' + exam.timeSlot,
      endStr: formatDate(dateObj) + ' - ' + eh + ':' + em,
      durationStr: (exam.duration || 60) + ' dk',
    };
  });

  // Aynı dersin müfredat karşılıkları (ör. BIL345 / BLM445) aynı oturumdaysa
  // tek satırda yazılır (bkz. lib/sinav-birlesim.js → ciktiSatirlariniBirlestir).
  const satirlar =
    window.SinavBirlesim && window.SinavBirlesim.ciktiSatirlariniBirlestir
      ? window.SinavBirlesim.ciktiSatirlariniBirlestir(enriched)
      : enriched;

  // Renklerin hangi sınıfa ait olduğu belgenin altında yazar (yalnız
  // belgede geçen sınıflar). Kâğıtta ekrandaki açıklama yoktur.
  const lejant = [...new Set(satirlar.map((e) => Number(e.sinif)).filter((n) => SINIF_BG[n]))]
    .sort((a, b) => a - b)
    .map((n) => ({ renk: SINIF_BG[n], etiket: (SINIF_COLORS[n] || {}).label || n + '. Sınıf' }));

  // Önce Şablonlar modülüne atanmış sınav programı şablonunu dene
  if (window.TemplateEngine && window.TemplateEngine.produceFromTemplate) {
    const rows = satirlar.map((e) => ({
      dersAd: e.name || '',
      dersKod: e.code || '',
      baslangic: e.startStr || '',
      bitis: e.endStr || '',
      sure: e.durationStr || '',
      salon: e.assignedRoom || '',
      ogrenciSayisi: e.studentCount != null ? String(e.studentCount) : '',
      gozetmen: e.assignedSupervisors || e.supervisor || '',
      // Sınıf rengi şablonlu çıktıda da satır zemini olur (şablonsuz Word ile aynı).
      _zemin: SINIF_BG[e.sinif] || '',
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
      // Şablona sabit yazılmış başka bölüm adı bu bölümün adıyla değişir
      // (paylaşılan şablonda her bölüm kendi adını görür).
      otomatikBolumAdi: {
        yeni: deptName || '',
        adlar: (window.DEPARTMENTS || []).map((d) => d && d.name).filter(Boolean),
      },
      sonaEkle: window.renkLejantiXml ? window.renkLejantiXml(lejant) : '',
      filename:
        'Sinav_Programi_' + (deptName || 'bolum').replace(/[^\wğüşıöçĞÜŞİÖÇ]/g, '_') + '.docx',
    });
    if (res.ok) return;
    if (res.reason === 'no-mapping') {
      alert(
        'Sınav programı şablonunun alan eşlemesi yapılmamış. Şablonlar modülünden şablonu açıp 🧩 ile alanları eşleyin. Şimdilik standart Word tablosu üretilecek.'
      );
    } else if (res.reason === 'invalid-output') {
      alert(
        'Yüklü sınav programı şablonundan geçerli belge üretilemedi (şablon yapısı desteklenmiyor). Standart Word tablosu üretilecek.'
      );
    }
    // no-template / diğer → sessizce standart Word tablosuna düş
  }

  // ── Şablon yoksa: standart Word (.docx) tablosu ──
  // Eskiden tarayıcının yazdırma penceresi açılıyordu; artık her durumda
  // indirilebilir bir Word belgesi üretilir (lib/basit-docx.js).
  try {
    const JSZip = await jszipYukle();
    const parcalar = docxParcalari({
      baslik: [String(deptName || '').toLocaleUpperCase('tr-TR'), 'SINAV PROGRAMI']
        .filter(Boolean)
        .join(' — '),
      altBaslik: String(periodLabel || '').toLocaleUpperCase('tr-TR'),
      oranlar: [19, 9, 12, 12, 6, 7, 13, 22],
      sutunlar: [
        'Dersin Adı',
        'Dersin Kodu',
        'Başlangıç',
        'Bitiş',
        'Süre',
        'Öğrenci',
        'Salon',
        'Gözetmen',
      ],
      lejant,
      satirlar: satirlar.map((e) => ({
        renk: (SINIF_BG[e.sinif] || '').replace('#', ''),
        hucreler: [
          e.name || '',
          e.code || '',
          e.startStr || '',
          e.endStr || '',
          e.durationStr || '',
          e.studentCount != null ? String(e.studentCount) : '',
          e.assignedRoom || '',
          e.assignedSupervisors || e.supervisor || '',
        ],
      })),
    });
    const zip = new JSZip();
    Object.entries(parcalar).forEach(([yol, icerik]) => zip.file(yol, icerik));
    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download =
      'Sinav_Programi_' + (deptName || 'bolum').replace(/[^\wğüşıöçĞÜŞİÖÇ]/g, '_') + '.docx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch (e) {
    alert('Word belgesi üretilemedi: ' + e.message);
  }
}

async function jszipYukle() {
  if (window.JSZip) return window.JSZip;
  await new Promise((res, rej) => {
    const el = document.createElement('script');
    el.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    el.onload = res;
    el.onerror = () => rej(new Error('JSZip yüklenemedi'));
    document.head.appendChild(el);
  });
  return window.JSZip;
}

// xlsx-js-style (hücre rengi, kalın, kenarlık, birleştirme) bir kez yüklenir.
async function xlsxYukle() {
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
      return null;
    }
  }
  return window.XLSX;
}

// Fakültenin ortak salonları: fakülte ayarında tanımlıysa o, yoksa yerleşik liste.
// Salon metni parçaları (" - " ya da eski virgüllü yazım).
const salonParcalari = (v) =>
  String(v || '')
    .split(/\s+-\s+|,/)
    .map((x) => x.trim())
    .filter(Boolean);
// Önerilen salonun kayda yazılacak hâli: boş salona öneri "otomatik salon";
// girilmiş salonun KAPASİTE için genişletilmesi ise yalnız eklenen kısmı
// "otomatik ek salon" olarak işaretler (temizlemede bölümün salonu kalır).
function salonOnerisiVerisi(e) {
  if (!e || !e.oneriSalon) return {};
  if (e.oneriEkSalon) return { room: e.room, otomatikEkSalon: e.oneriEkSalon };
  return { room: e.room, otomatikSalon: true };
}

// Aynı bölüm mü? Bölüm slug ('bilgisayar') ya da veritabanı kimliğiyle
// anılabiliyor; ham eşitlik aynı bölümün sınavını "başka bölüm" sayıyordu.
function ayniBolumMu(a, b) {
  if (!a || !b) return false;
  if (String(a) === String(b)) return true;
  const k = window.bolumKimlikleri ? window.bolumKimlikleri(String(a)) : [String(a)];
  return k.includes(String(b));
}

// Bölümün salonlarından yalnız SINAVDA kullanılanlar (Bölüm Yönetimi →
// Sınıf / Salon → Kullanım). Otomatik atama ve bölümün salon listesi bunlar.
function sinavSalonlari(liste) {
  const SK = window.SalonKullanim;
  const l = Array.isArray(liste) ? liste : [];
  return SK ? l.filter(SK.sinavSalonuMu) : l;
}

function fakulteSalonListesi(ayar) {
  const l = ayar && Array.isArray(ayar.salonlar) ? ayar.salonlar.filter((s) => s && s.name) : [];
  return l.length > 0 ? l : ALL_FACULTY_CLASSROOMS;
}

// ── OTOMATİK SALON + GÖZETMEN ATAMASI ──
// Dekanlık çıktısı ile "Salon ve gözetmen ata" düğmesi AYNI hesabı kullanır.
// Elle girilmiş salon/gözetmen esastır. Fakülte geneli: başka bölümlerin o
// saatte kullandığı salon ve görevlendirdiği gözetmen dolu sayılır.
// Dönüş: { oneri: { sinavAnahtari: { room, supervisor } }, uyarilar }
function otomatikAtamaHesapla({
  sinavlar,
  salonlar,
  gozetmenAdlari,
  // İkinci kademe gözetmenler ("dışarıdan"): bölümün havuzu yetmezse
  // (fakültenin diğer araştırma görevlileri).
  ekGozetmenAdlari,
  kurallar,
  musaitsizlik,
  digerSinavlar,
  // { salonAdi: kapasite } — bilinen bütün salonlar (fakülte geneli).
  kapasiteler,
  // Bölümler arası ortak oturumların BAŞKA bölümdeki üyeleri: oturum bütün
  // olarak hesaplanır (salon toplam öğrenciye göre, gözetmen oturuma bir kez).
  ortakUyeler,
}) {
  const rooms = salonlar && salonlar.length > 0 ? salonlar : DEPT_CLASSROOMS;
  const ortakListe = (Array.isArray(ortakUyeler) ? ortakUyeler : []).filter(
    (x) => x && !sinavlar.some((e) => e.id === x.id)
  );
  const ortakIdleri = new Set(ortakListe.map((x) => x.id));
  const diger = (Array.isArray(digerSinavlar) ? digerSinavlar : []).filter(
    (x) => !ortakIdleri.has(x.id)
  );
  sinavlar = [...sinavlar, ...ortakListe];
  const salonBul = (n) => assignClassroomFromList(rooms, n);
  const anahtar = (e) => e.id || e.code + e.date + e.timeSlot;
  // Salon kapasitesi: verilen harita, salon listesi ve fakültenin bilinen
  // salonları. Girilen salon(lar) öğrenciye yetmiyorsa boş salon eklenir.
  const kapMap = {};
  [...ALL_FACULTY_CLASSROOMS, ...rooms].forEach((r) => {
    if (r && r.name && Number(r.capacity) > 0) kapMap[r.name] = Number(r.capacity);
  });
  Object.entries(kapasiteler || {}).forEach(([k, v]) => {
    if (Number(v) > 0) kapMap[k] = Number(v);
  });
  const oturumSalonu = window.SinavBirlesim
    ? window.SinavBirlesim.oturumSalonlari(
        sinavlar,
        (n, dolu) =>
          assignClassroomFromList(
            rooms.filter((r) => !(dolu || []).includes(r.name)),
            n
          ),
        diger,
        (ad) => kapMap[ad] || 0
      )
    : {};
  const { atamalar, uyarilar } = gozetmenleriDagit(
    gozetmenAdlari || [],
    sinavlar.map((e) => ({ ...e, room: oturumSalonu[anahtar(e)] || e.room })),
    salonBul,
    {
      ...(kurallar || {}),
      // Fakülte kuralı: dersin hocası her sınavında ilk gözetmen (bölüm bazlı
      // hoca kuralı seçimi kaldırıldı; eski kayıttaki seçim yok sayılır).
      hocaKurali: 'zorunlu',
      ekHavuz: ekGozetmenAdlari || [],
      musaitsizlik: musaitsizlik || {},
      digerGorevler: diger,
    }
  );
  const oneri = {};
  sinavlar.forEach((e) => {
    const k = anahtar(e);
    oneri[k] = {
      room: oturumSalonu[k] || e.room || salonBul(e.studentCount),
      supervisor: (atamalar[k] || []).join(', '),
    };
  });
  // Salon yetmedi: boş salon kalmadı ("TBD") ya da salonlar öğrenciye yetmiyor.
  // Sessiz geçmesin — yetkili bölüm salonu ekler ya da fakülteye bildirir.
  const salonUyarilari = [];
  const gorulenOturum = new Set();
  sinavlar
    .filter((e) => !ortakIdleri.has(e.id))
    .forEach((e) => {
      const ok = e.birlesimId || anahtar(e);
      if (gorulenOturum.has(ok)) return;
      gorulenOturum.add(ok);
      const uyeler = e.birlesimId ? sinavlar.filter((x) => x.birlesimId === e.birlesimId) : [e];
      const toplam = uyeler.reduce((t, x) => t + (Number(x.studentCount) || 0), 0);
      const oda = String(oneri[anahtar(e)].room || '');
      const parca = salonParcalari(oda).filter((x) => x !== 'TBD');
      const kap = parca.map((x) => kapMap[x] || 0);
      const kod = [...new Set(uyeler.map((x) => x.code))].join(' + ');
      if (parca.length === 0) {
        salonUyarilari.push({
          sinav: anahtar(e),
          kod,
          tarih: e.date || '',
          tur: 'salon_yok',
          mesaj: toplam + ' öğrenci için bölümün sınav salonlarında boş salon kalmadı.',
        });
      } else if (kap.every((c) => c > 0) && kap.reduce((t, c) => t + c, 0) < toplam) {
        salonUyarilari.push({
          sinav: anahtar(e),
          kod,
          tarih: e.date || '',
          tur: 'salon_yetmedi',
          mesaj:
            toplam +
            ' öğrenci, ' +
            parca.join(' - ') +
            ' toplam kapasitesi ' +
            kap.reduce((t, c) => t + c, 0) +
            ' (bölümün boş sınav salonu yetmedi).',
        });
      }
    });
  return { oneri, uyarilar: [...salonUyarilari, ...uyarilar] };
}

// FAKÜLTE GÖRÜNÜMÜ — salonu ya da gözetmeni girilmemiş sınavlar, bölümün
// "Salon ve gözetmen ata" düğmesiyle AYNI kuralla (otomatikAtamaHesapla)
// fakültenin salon listesine yerleştirilir. Bölümler sırayla işlenir: önce
// yerleşenin salonu ve gözetmeni sonrakiler için dolu sayılır. Bölümler arası
// birleşik oturumun (birlesimId) salonu olan üyesi varsa diğer üyeler o
// salona oturur. Elle girilen değişmez; sonuç kaydedilmez, öneridir —
// yerleşen sınav `oneriSalon` / `oneriGozetmen` ile işaretlenir.
// Her bölüm YALNIZ kendi sınav salonlarına yerleşir (b.salonlar); bölümün
// sınav salonu tanımlı değilse fakültenin salon listesi (salonlar) kullanılır.
// Fakülte yetkilisi elle her salonu seçebilir.
//   bolumler: [{ bolumId, salonlar, sinavlar, gozetmenAdlari, kurallar, musaitsizlik }]
function fakulteOtomatikYerlesim(bolumler, salonlar) {
  const metinOf = (v) => String(v == null ? '' : v).trim();
  const guncel = new Map();
  bolumler.forEach((b) => b.sinavlar.forEach((e) => e && e.id && guncel.set(e.id, e)));
  bolumler.forEach((b) => {
    // Bölümler arası ortak oturum BÜTÜN olarak yerleşir: diğer bölümdeki
    // üyeler de hesaba katılır (salon toplam öğrenciye göre seçilir, salon ve
    // gözetmen bütün üyelere aynı yazılır). Diğer bölüm sırası gelince
    // üyelerinin salonu/gözetmeni dolu olduğundan oturuma dokunulmaz.
    const kendi = b.sinavlar.map((e0) => guncel.get(e0.id) || e0);
    const kendiOturumlari = new Set(kendi.map((e) => metinOf(e.birlesimId)).filter(Boolean));
    const ortak = [...guncel.values()].filter(
      (x) => !ayniBolumMu(x.departmentId, b.bolumId) && kendiOturumlari.has(metinOf(x.birlesimId))
    );
    const ortakIdleri = new Set(ortak.map((x) => x.id));
    const diger = [...guncel.values()].filter(
      (x) => !ayniBolumMu(x.departmentId, b.bolumId) && !ortakIdleri.has(x.id)
    );
    const { oneri } = otomatikAtamaHesapla({
      sinavlar: [...kendi, ...ortak],
      salonlar: b.salonlar || salonlar,
      gozetmenAdlari: b.gozetmenAdlari,
      ekGozetmenAdlari: b.ekGozetmenAdlari,
      kurallar: b.kurallar,
      musaitsizlik: b.musaitsizlik,
      digerSinavlar: diger,
      kapasiteler: b.kapasiteler,
    });
    [...kendi, ...ortak].forEach((e) => {
      const o = oneri[e.id] || {};
      const y = { ...e };
      // Boş salon doldurulur; girilmiş salon kapasiteye yetmiyorsa genişletilmiş
      // hâli (girilen + eklenen salonlar) öneri olur.
      if (o.room && o.room !== 'TBD' && metinOf(o.room) !== metinOf(e.room)) {
        y.room = o.room;
        y.oneriSalon = true;
        // Girilmiş salon genişletildiyse eklenen kısım ayrıca tutulur.
        if (metinOf(e.room)) {
          const once = salonParcalari(e.room);
          y.oneriEkSalon = salonParcalari(o.room)
            .filter((x) => !once.includes(x))
            .join(' - ');
        }
      }
      if (!metinOf(e.supervisor) && o.supervisor) {
        y.supervisor = o.supervisor;
        y.oneriGozetmen = true;
      }
      guncel.set(e.id, y);
    });
  });
  return guncel;
}

// Gün sayfası (dekanlık şablonu): 1. satır DERSLİKLER, 2. kapasite, 3. salon
// adları, sonra saat dilimleri; sınav hücresi süresince birleşir. İsteğe bağlı
// olarak altta renk açıklaması. Ekrandaki tabloyla aynı model
// (SinavFakulte.gunTablosu).
function programSayfasi(XLSX, tablo, secenek) {
  const o = secenek || {};
  const renkli = o.renkli !== false;
  const ince = { style: 'thin', color: { rgb: '000000' } };
  const kesik = { style: 'dashed', color: { rgb: '475569' } };
  const nokta = { style: 'dotted', color: { rgb: '0F766E' } };
  const kenar = { top: ince, bottom: ince, left: ince, right: ince };
  const salonlar = tablo.salonlar;
  const n = salonlar.length + 1;
  const bos = (k) => new Array(Math.max(0, k)).fill('');
  const kapasite = (x) =>
    x.capacity === '' || x.capacity == null ? '' : Number(x.capacity) || x.capacity;
  const veri = [
    ['', 'DERSLİKLER', ...bos(salonlar.length - 1)],
    ['Kapasite', ...salonlar.map(kapasite)],
    ['Saatler', ...salonlar.map((x) => x.name)],
  ];
  const stiller = []; // [r, c, stil]
  const birlesim = [{ s: { r: 0, c: 1 }, e: { r: 0, c: Math.max(1, n - 1) } }];
  const satirYukseklik = [{ hpt: 18 }, { hpt: 18 }, { hpt: 18 }];
  tablo.satirlar.forEach((r) => {
    const satir = [r.ara ? 'Öğle arası ' + r.etiket : r.etiket];
    r.hucreler.forEach((h, ci) => {
      const sutun = salonlar[ci];
      satir.push(h && !h.gizli ? h.metin || '' : '');
      const rr = veri.length;
      const cc = ci + 1;
      stiller.push([
        rr,
        cc,
        {
          font: {
            name: 'Times New Roman',
            sz: 9,
            bold: !!(h && !h.gizli && h.metin),
            italic: !!(h && h.taslak),
            color:
              h && h.cakisma ? { rgb: 'C00000' } : h && h.taslak ? { rgb: '475569' } : undefined,
          },
          fill:
            renkli && h && !h.gizli && h.renk
              ? { patternType: 'solid', fgColor: { rgb: h.renk } }
              : r.ara
                ? { patternType: 'solid', fgColor: { rgb: 'E2EFDA' } }
                : sutun.sanal && !h
                  ? { patternType: 'solid', fgColor: { rgb: 'FFF2CC' } }
                  : undefined,
          border:
            h && (h.taslak || h.degisti)
              ? { top: kesik, bottom: kesik, left: kesik, right: kesik }
              : h && h.otomatik
                ? { top: nokta, bottom: nokta, left: nokta, right: nokta }
                : kenar,
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        },
      ]);
      if (h && !h.gizli && h.satirSayisi > 1) {
        birlesim.push({ s: { r: rr, c: cc }, e: { r: rr + h.satirSayisi - 1, c: cc } });
      }
    });
    stiller.push([
      veri.length,
      0,
      {
        font: { name: 'Times New Roman', bold: true, sz: 9 },
        fill: r.ara ? { patternType: 'solid', fgColor: { rgb: 'E2EFDA' } } : undefined,
        border: kenar,
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      },
    ]);
    veri.push(satir);
    satirYukseklik.push({ hpt: r.ara ? 15 : 30 });
  });
  // Renk açıklaması: tablonun altında renkli kutu + açıklama.
  const aciklama = Array.isArray(o.aciklama) ? o.aciklama : [];
  if (aciklama.length) {
    // Sütun sayısı açıklamadan azsa açıklama alt satırlara sarılır (dar
    // sayfada bölüm renkleri sessizce düşüyordu).
    const satirBasina = Math.max(1, n - 1);
    veri.push(bos(n));
    satirYukseklik.push({ hpt: 10 });
    for (let bas = 0; bas < aciklama.length; bas += satirBasina) {
      const r1 = veri.length;
      veri.push(bos(n));
      veri.push(bos(n));
      satirYukseklik.push({ hpt: 14 }, { hpt: 28 });
      aciklama.slice(bas, bas + satirBasina).forEach((x, k) => {
        const c = 1 + k;
        stiller.push([
          r1,
          c,
          x.cerceve
            ? { border: { top: nokta, bottom: nokta, left: nokta, right: nokta } }
            : { fill: { patternType: 'solid', fgColor: { rgb: x.renk } }, border: kenar },
        ]);
        veri[r1 + 1][c] = x.etiket;
        stiller.push([
          r1 + 1,
          c,
          {
            font: { name: 'Times New Roman', sz: 9 },
            alignment: { horizontal: 'center', vertical: 'top', wrapText: true },
          },
        ]);
      });
    }
  }
  const ws = XLSX.utils.aoa_to_sheet(veri);
  const stilVer = (r, c, st) => {
    const a = XLSX.utils.encode_cell({ r, c });
    if (!ws[a]) ws[a] = { v: '', t: 's' };
    ws[a].s = st;
  };
  for (let c = 0; c < n; c++) {
    stilVer(0, c, {
      fill: c >= 1 ? { patternType: 'solid', fgColor: { rgb: 'FFFF00' } } : undefined,
      font: { bold: true, sz: 12, name: 'Times New Roman' },
      border: c >= 1 ? kenar : undefined,
      alignment: { horizontal: 'center', vertical: 'center' },
    });
    [1, 2].forEach((r) =>
      stilVer(r, c, {
        font: { bold: true, name: 'Times New Roman' },
        fill:
          c >= 1 && salonlar[c - 1].sanal
            ? { patternType: 'solid', fgColor: { rgb: 'FFE699' } }
            : undefined,
        border: kenar,
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      })
    );
  }
  stiller.forEach(([r, c, st]) => stilVer(r, c, st));
  ws['!merges'] = birlesim;
  ws['!cols'] = [{ wch: 13 }, ...salonlar.map(() => ({ wch: 18 }))];
  ws['!rows'] = satirYukseklik;
  return ws;
}

// FAKÜLTE ÇIKTISI — fakülte yetkilisinin Excel'i: "Kısaltmalar" + gün başına
// bir sayfa ("08.06"). Model lib/sinav-fakulte.js → fakulteKitabi.
// Gözetmen görev listesi: yalnız gözetmen, tarih, gün, saat ve atandığı salon.
async function exportGozetmenXLSX(satirlar, baslik, dosyaAdi) {
  const XLSX = await xlsxYukle();
  if (!XLSX) return;
  const ince = { style: 'thin', color: { rgb: '000000' } };
  const kenar = { top: ince, bottom: ince, left: ince, right: ince };
  const gunAdi = (t) => new Date(t + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long' });
  const tarihYaz = (t) => new Date(t + 'T00:00:00').toLocaleDateString('tr-TR');
  const veri = [[baslik], ['Gözetmen', 'Tarih', 'Gün', 'Saat', 'Salon', 'Not']];
  const ilkSatirlar = [];
  let onceki = '';
  satirlar.forEach((x) => {
    const yeni = x.ad !== onceki;
    if (yeni) ilkSatirlar.push(veri.length);
    veri.push([
      yeni ? x.ad : '',
      tarihYaz(x.tarih),
      gunAdi(x.tarih),
      x.bas + ' - ' + x.bit,
      x.salon,
      x.hoca ? 'Dersin hocası (kendi sınavı)' : '',
    ]);
    onceki = x.ad;
  });
  const ws = XLSX.utils.aoa_to_sheet(veri);
  for (let r = 1; r < veri.length; r++) {
    for (let c = 0; c < 6; c++) {
      const a = XLSX.utils.encode_cell({ r, c });
      if (!ws[a]) ws[a] = { v: '', t: 's' };
      ws[a].s = {
        font: { name: 'Times New Roman', bold: r === 1 || c === 0 },
        fill: r === 1 ? { fgColor: { rgb: 'E2E8F0' } } : undefined,
        border: {
          ...kenar,
          // Kişi değişince üstte kalın çizgi: kişiler birbirinden ayrılsın.
          ...(ilkSatirlar.includes(r)
            ? { top: { style: 'medium', color: { rgb: '000000' } } }
            : {}),
        },
        alignment: { horizontal: c === 0 ? 'left' : 'center', vertical: 'center' },
      };
    }
  }
  const a0 = XLSX.utils.encode_cell({ r: 0, c: 0 });
  ws[a0].s = { font: { name: 'Times New Roman', bold: true, sz: 13 } };
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  ws['!cols'] = [{ wch: 38 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 22 }, { wch: 28 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Gözetmenler');
  XLSX.writeFile(wb, dosyaAdi + '.xlsx');
}

async function exportFakulteXLSX(kitap, dosyaAdi) {
  const XLSX = await xlsxYukle();
  if (!XLSX) return;
  const wb = XLSX.utils.book_new();
  const ince = { style: 'thin', color: { rgb: '000000' } };
  const kenar = { top: ince, bottom: ince, left: ince, right: ince };
  const k = [
    ['', '', '', 'Sınav Sayısı'],
    ...kitap.kisaltmaSatirlari.map((x, i) => [i + 1, x.kisaltma, x.ad, x.sayi]),
  ];
  const wk = XLSX.utils.aoa_to_sheet(k);
  for (let r = 0; r < k.length; r++) {
    for (let c = 0; c < 4; c++) {
      const a = XLSX.utils.encode_cell({ r, c });
      if (!wk[a]) wk[a] = { v: '', t: 's' };
      wk[a].s = {
        font: { name: 'Times New Roman', bold: r === 0 || c === 1 },
        border: r === 0 && c < 3 ? undefined : kenar,
        alignment: { horizontal: c === 2 ? 'left' : 'center', vertical: 'center' },
      };
    }
  }
  wk['!cols'] = [{ wch: 5 }, { wch: 10 }, { wch: 40 }, { wch: 13 }];
  XLSX.utils.book_append_sheet(wb, wk, 'Kısaltmalar');
  const adlar = new Set();
  const benzersiz = (ad, yedek) => {
    // Gün.ay iki farklı yılda tekrar ederse sayfa adı çakışmasın.
    const sonuc = adlar.has(ad) ? yedek : ad;
    adlar.add(sonuc);
    return sonuc.slice(0, 31);
  };
  // Kaydedilmemiş otomatik yerleşim varsa çıktıda ayırt edilir.
  const otoVar = kitap.gunler.some((g) =>
    g.tablo.satirlar.some((r) => r.hucreler.some((h) => h && h.otomatik))
  );
  const aciklama = [
    ...(kitap.renkAciklamasi || []),
    ...(otoVar
      ? [{ renk: 'FFFFFF', cerceve: true, etiket: 'Otomatik yerleşim (henüz kaydedilmedi)' }]
      : []),
  ];
  kitap.gunler.forEach((g) => {
    XLSX.utils.book_append_sheet(
      wb,
      programSayfasi(XLSX, g.tablo, { renkli: true, aciklama }),
      benzersiz(g.kisa, g.kisa + '.' + g.tarih.slice(2, 4))
    );
  });
  XLSX.writeFile(wb, (dosyaAdi || 'Fakulte_Sinav_Programi') + '.xlsx');
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
  musaitsizlik,
  // { digerSinavlar, salonListesi, sinavAdi } — fakülte geneli doluluk,
  // gün sayfalarının salon sütunları, Liste'deki "Sınavın Adı".
  ekSecenek
) {
  const ek = ekSecenek || {};
  const XLSX = await xlsxYukle();
  if (!XLSX) return;
  const wb = XLSX.utils.book_new();

  // ── Style definitions ──
  const border = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  };

  // ── Sort and enrich exams ──
  const sorted = [...placedExams].map(turkishifyExam).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return String(a.timeSlot || '').localeCompare(String(b.timeSlot || ''));
  });

  // Resmî çıktı yalnız KAYITLI salon ve gözetmeni basar (bkz. bölüm çıktısı).
  void customSupervisors;
  void gozetmenKurallari;
  void musaitsizlik;
  const enriched = sorted.map((exam) => {
    const room = exam.room && exam.room !== 'TBD' ? exam.room : '';
    const supervisors = (exam.supervisor || '').trim();
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
  // Şablondaki düzen: 1. satır başlık (bölüm — dönem), sütun başlıkları 2. satırda.
  const listHeader = [
    'Dersin Adı',
    'Dersin Kodu',
    'Sınavın Adı',
    'Sınava Girecek Toplam Öğrenci Sayısı',
    'Sınavın Başlama Tarihi ve Saati',
    'Sınavın Bitiş Tarihi ve Saati',
    'Sınav Süresi',
    'GÖZETMEN',
    'SINIF',
  ];
  // Liste sayfası: aynı dersin müfredat karşılıkları tek satır. Gün
  // sayfaları zaten aynı salondaki kodları "A / B" diye tek hücreye yazıyor.
  const listeSatirlari =
    window.SinavBirlesim && window.SinavBirlesim.ciktiSatirlariniBirlestir
      ? window.SinavBirlesim.ciktiSatirlariniBirlestir(enriched)
      : enriched;
  const sinavAdiMetni = ek.sinavAdi || '';
  const listData = [
    [[deptName, periodLabel].filter(Boolean).join(' — ')],
    listHeader,
    ...listeSatirlari.map((e) => [
      e.name,
      e.code,
      sinavAdiMetni,
      e.studentCount || '',
      e.startStr,
      e.endStr,
      e.durationStr,
      e.assignedSupervisors,
      e.assignedRoom,
    ]),
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(listData);

  if (ws1.A1) ws1.A1.s = { font: { bold: true, sz: 12, name: 'Times New Roman' } };
  ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: listHeader.length - 1 } }];
  // Style Liste header row - bold, centered, borders, no background
  for (var C = 0; C < listHeader.length; C++) {
    var addr = XLSX.utils.encode_cell({ r: 1, c: C });
    if (ws1[addr]) {
      ws1[addr].s = {
        font: { bold: true, name: 'Times New Roman' },
        border: border,
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      };
    }
  }

  // Style Liste data rows - borders, centered, no background
  for (var R = 2; R < listData.length; R++) {
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
    { wch: 12 },
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

  // ══════ Gün sayfaları ══════
  // Fakülte çıktısıyla aynı tablo modeli (lib/sinav-fakulte.js → gunTablosu):
  // sütunlar fakültenin ortak salonları, 08:30–18:30, sınav süresince
  // birleşen hücre. Bölüm sayfasında hücrede yalnız ders kodları yazar.
  var SF = window.SinavFakulte;
  var salonListesi = ek.salonListesi || ALL_FACULTY_CLASSROOMS;
  var oturumlarListesi = SF
    ? SF.fakulteOturumlari(
        enriched.map(function (e) {
          return { ...e, room: e.assignedRoom, supervisor: e.assignedSupervisors };
        })
      )
    : [];
  allWeekdays.forEach(function (dateObj) {
    var dateISO = formatDateISO(dateObj);
    var sheetName =
      dateObj.getDate() +
      '.' +
      String(dateObj.getMonth() + 1).padStart(2, '0') +
      '-' +
      getDayName(dateObj);
    var tablo = SF
      ? SF.gunTablosu(
          oturumlarListesi.filter(function (o) {
            return o.date === dateISO;
          }),
          salonListesi,
          { metinAlani: 'kodSatiri', dilimler: ek.dilimler }
        )
      : { salonlar: salonListesi, satirlar: [] };
    XLSX.utils.book_append_sheet(wb, programSayfasi(XLSX, tablo, { renkli: false }), sheetName);
  });

  // Download
  var safeName = (periodLabel || 'export').replace(/[^a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ ]/g, '_');
  XLSX.writeFile(wb, 'sinav_programi_' + safeName + '.xlsx');
}

// ══════════════════════════════════════════════════════════════
// İŞLEM MENÜSÜ — bölüm araç çubuğundaki bütün işlemler tek açılır menüde.
// Düğmenin üstünde çakışma ve gönderim durumu küçük bir işaretle görünür;
// menü açılınca ikisi de üstte yazılı olarak durur.
// ══════════════════════════════════════════════════════════════
const MENU_DURUM_RENGI = {
  bekliyor: '#64748B',
  gonderildi: '#16A34A',
  degisti: '#D97706',
  iade: '#DC2626',
};
const IslemMenusu = ({ ogeler, cakismaOzet, gonderim }) => {
  const [acik, setAcik] = useState(false);
  const kutu = _useRef(null);
  useEffect(() => {
    if (!acik) return undefined;
    const disari = (e) => kutu.current && !kutu.current.contains(e.target) && setAcik(false);
    const esc = (e) => e.key === 'Escape' && setAcik(false);
    document.addEventListener('mousedown', disari);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', disari);
      document.removeEventListener('keydown', esc);
    };
  }, [acik]);
  if (!ogeler || ogeler.length === 0) return null;
  const cakismaRengi = !cakismaOzet
    ? null
    : cakismaOzet.engel > 0
      ? '#DC2626'
      : cakismaOzet.bekleyen > 0
        ? '#D97706'
        : '#16A34A';
  const cakismaMetni = !cakismaOzet
    ? ''
    : cakismaOzet.engel > 0
      ? cakismaOzet.engel + ' engel'
      : cakismaOzet.bekleyen > 0
        ? cakismaOzet.bekleyen + ' çakışma kararı bekliyor'
        : 'Çakışma yok' +
          (cakismaOzet.kabul > 0 ? ' · ' + cakismaOzet.kabul + ' şartlı kabul' : '');
  const nokta = (renk) => (
    <span style={{ width: 8, height: 8, borderRadius: 999, background: renk, flex: '0 0 auto' }} />
  );
  return (
    <div ref={kutu} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={acik}
        onClick={() => setAcik((v) => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          height: 32,
          padding: '0 12px',
          borderRadius: 8,
          border: 'none',
          background: '#0F766E',
          color: '#fff',
          fontSize: 12.5,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {cakismaRengi && nokta(cakismaRengi)}
        İşlemler ve Çıktılar
        {gonderim && nokta(MENU_DURUM_RENGI[gonderim.durum] || '#64748B')}
        <span style={{ fontSize: 10, opacity: 0.85 }}>{acik ? '▲' : '▼'}</span>
      </button>
      {acik && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            zIndex: 50,
            width: 300,
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(15,23,42,.18)',
            padding: 6,
          }}
        >
          {(cakismaOzet || gonderim) && (
            <div
              style={{
                padding: '8px 10px 10px',
                borderBottom: '1px solid #F1F5F9',
                marginBottom: 4,
                display: 'grid',
                gap: 6,
                fontSize: 12.5,
              }}
            >
              {cakismaOzet && (
                <span
                  style={{ display: 'flex', alignItems: 'center', gap: 8, color: cakismaRengi }}
                >
                  {nokta(cakismaRengi)}
                  <b>{cakismaMetni}</b>
                </span>
              )}
              {gonderim && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: MENU_DURUM_RENGI[gonderim.durum],
                  }}
                >
                  {nokta(MENU_DURUM_RENGI[gonderim.durum])}
                  <b>Fakülte: {gonderim.etiket}</b>
                </span>
              )}
              {gonderim && gonderim.durum === 'iade' && gonderim.not && (
                <span
                  style={{
                    color: '#991B1B',
                    background: '#FEF2F2',
                    borderRadius: 6,
                    padding: '4px 8px',
                  }}
                >
                  İade notu: {gonderim.not}
                </span>
              )}
              {gonderim && gonderim.fakulteDuzenleme && (
                <span
                  style={{
                    color: '#1E40AF',
                    background: '#EFF6FF',
                    borderRadius: 6,
                    padding: '4px 8px',
                  }}
                >
                  Fakülte yetkilisi programda değişiklik yaptı: {gonderim.fakulteDuzenleme}
                </span>
              )}
            </div>
          )}
          {ogeler.map((o, i) =>
            o.ayirac ? (
              <div key={'a' + i} style={{ height: 1, background: '#F1F5F9', margin: '4px 6px' }} />
            ) : (
              <button
                key={o.etiket}
                type="button"
                role="menuitem"
                disabled={o.devreDisi}
                onClick={() => {
                  setAcik(false);
                  o.onClick && o.onClick();
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  border: 'none',
                  borderRadius: 8,
                  background: o.vurgu ? '#F5F3FF' : 'transparent',
                  color: o.devreDisi ? '#94A3B8' : o.vurgu ? '#6D28D9' : '#0F172A',
                  cursor: o.devreDisi ? 'default' : 'pointer',
                }}
                onMouseEnter={(e) =>
                  !o.devreDisi &&
                  (e.currentTarget.style.background = o.vurgu ? '#EDE9FE' : '#F8FAFC')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = o.vurgu ? '#F5F3FF' : 'transparent')
                }
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{o.etiket}</div>
                {o.aciklama && (
                  <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
                    {o.devreDisi ? 'Önce dersleri takvime yerleştirin' : o.aciklama}
                  </div>
                )}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// FAKÜLTE PROGRAMI — TAM EKRAN GÖRÜNÜM (fakülte yetkilisi)
// Fakültenin bütün bölümlerinin sınavları, Excel'deki düzenle: alt kısımda
// gün sekmeleri (sayfa sayfa), "Kısaltmalar" sayfası, bölüm gönderim
// durumu ve fakülte ayarları. Ekran ile indirilen Excel aynı modelden
// çizilir (lib/sinav-fakulte.js → fakulteKitabi).
// ══════════════════════════════════════════════════════════════
const ayarHaritasi = (liste, anahtar, deger) => {
  const h = {};
  (Array.isArray(liste) ? liste : []).forEach((x) => {
    if (x && x[anahtar]) h[x[anahtar]] = deger ? deger(x) : x;
  });
  return h;
};
const FAKULTE_DURUM_RENGI = {
  bekliyor: { bg: '#F1F5F9', fg: '#475569' },
  gonderildi: { bg: '#DCFCE7', fg: '#166534' },
  degisti: { bg: '#FEF3C7', fg: '#92400E' },
  iade: { bg: '#FEE2E2', fg: '#991B1B' },
};

// Fakülte penceresinde bir oturumun ayrıntısı ve düzenlemesi: tarih, saat,
// salon, gözetmen; bölümler arası birleştirme ve birleşimden ayırma.
const OturumDuzenle = ({
  oturum,
  yetkili,
  bolumBilgisi,
  salonSecenekleri,
  gozetmenSecenekleri,
  gunSecenekleri,
  saatSecenekleri,
  ayniSaattekiler,
  onKaydet,
  onAyir,
  onBirlestir,
  kisiUyarisi,
  oneriBul,
  salonKontrol,
}) => {
  const SFk = window.SinavFakulte;
  const parca = (v) =>
    String(v || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  const anahtarOf = (a) =>
    window.Gozetmen && window.Gozetmen.adAnahtari ? window.Gozetmen.adAnahtari(a) : a;
  const [tarih, setTarih] = useState(oturum.date);
  const [saat, setSaat] = useState(oturum.timeSlot);
  const [salon, setSalon] = useState(oturum.salonlar.join(' - '));
  const [gozetmen, setGozetmen] = useState(oturum.gozetmenler.join(', '));
  // ── SALON BAŞINA GÖZETMEN ──
  // Çok salonlu (ortak) oturumda her salonun gözetmeni ayrı seçilir; tek
  // liste halinde birleştirilmez. Başlangıç: kayıtlı dağılım ya da
  // (yoksa) hoca ilk salona, kalanlar sırayla.
  const odalar = salon
    .split(/\s+-\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const odaAnahtari = odalar.join('|');
  const cokSalon = odalar.length > 1;
  const ilkDagilim = () => {
    const o = {};
    (oturum.salonGozetmenleri || []).forEach((x) => {
      o[x.salon] = (x.gozetmenler || []).join(', ');
    });
    return o;
  };
  const [salonGoz, setSalonGoz] = useState(ilkDagilim);
  const birlesikListe = (h) => {
    const out = [];
    odalar.forEach((o) =>
      parca(h[o]).forEach((g) => {
        if (!out.some((x) => anahtarOf(x) === anahtarOf(g))) out.push(g);
      })
    );
    return out;
  };
  // Salon eklenince/çıkarılınca: kalan salonların gözetmenleri korunur;
  // çıkarılan salonun (ya da tek salondan çoka geçişte tek listenin) kişileri
  // boş salonlara dağıtılır.
  useEffect(() => {
    if (!cokSalon) return;
    setSalonGoz((prev) => {
      const yeni = {};
      odalar.forEach((o) => {
        if (prev[o] != null) yeni[o] = prev[o];
      });
      const mevcut = new Set(Object.values(yeni).flatMap(parca).map(anahtarOf));
      const artan = [
        ...parca(gozetmen),
        ...Object.entries(prev)
          .filter(([k]) => !odalar.includes(k))
          .flatMap(([, v]) => parca(v)),
      ].filter(
        (g, i, l) =>
          !mevcut.has(anahtarOf(g)) && l.findIndex((x) => anahtarOf(x) === anahtarOf(g)) === i
      );
      const bos = odalar.filter((o) => yeni[o] == null);
      const hedef = bos.length > 0 ? bos : [odalar[0]];
      const d = SFk ? SFk.salonGozetmenDagilimi(oturum.uyeler, hedef, artan).dagilim : [];
      d.forEach((x) => {
        yeni[x.salon] = [...parca(yeni[x.salon]), ...x.gozetmenler].join(', ');
      });
      odalar.forEach((o) => {
        if (yeni[o] == null) yeni[o] = '';
      });
      return yeni;
    });
  }, [odaAnahtari]);
  const salonGozDegis = (oda, v) => {
    const yeni = { ...salonGoz, [oda]: v };
    setSalonGoz(yeni);
    setGozetmen(birlesikListe(yeni).join(', '));
  };
  const etkinGozetmenler = cokSalon ? birlesikListe(salonGoz) : parca(gozetmen);
  const dagilimMetni = (l) => JSON.stringify(l.map((x) => [x.salon, x.gozetmenler]));
  const yeniDagilim = cokSalon
    ? odalar.map((o) => ({ salon: o, gozetmenler: parca(salonGoz[o]) }))
    : null;
  const [kaydediliyor, setKaydediliyor] = useState(false);
  // Otomatik yerleşen (kayıtsız) oturum değişiklik yapılmadan da kaydedilebilir.
  const degisti =
    !!oturum.otomatik ||
    tarih !== oturum.date ||
    saat !== oturum.timeSlot ||
    salon !== oturum.salonlar.join(' - ') ||
    etkinGozetmenler.join(', ') !== oturum.gozetmenler.join(', ') ||
    (!!yeniDagilim && dagilimMetni(yeniDagilim) !== dagilimMetni(oturum.salonGozetmenleri || []));
  // Seçilen saat için kişi uyarıları ve öneriler.
  const hedef = {
    anahtar: oturum.anahtar,
    date: tarih,
    timeSlot: saat,
    sure: oturum.sure,
    gozetmenler: etkinGozetmenler,
  };
  const uyarilar = [];
  etkinGozetmenler.forEach((g) => {
    const u = kisiUyarisi ? kisiUyarisi(g, hedef) : null;
    if (u) uyarilar.push(g + ' ' + u + '.');
  });
  if (cokSalon) {
    const gorulen = {};
    odalar.forEach((o) =>
      parca(salonGoz[o]).forEach((g) => {
        const k = anahtarOf(g);
        if (gorulen[k] && gorulen[k] !== o) {
          uyarilar.push(g + ' iki salona birden yazılmış (' + gorulen[k] + ', ' + o + ').');
        } else gorulen[k] = o;
      })
    );
    odalar.forEach((o) => {
      if (parca(salonGoz[o]).length === 0) uyarilar.push(o + ' salonuna gözetmen yazılmamış.');
    });
  }
  const oneriler = oneriBul ? oneriBul(hedef) : [];
  // Seçilen saat/salonda başka bir oturum var mı? (kaydı engeller)
  const salonEngelListesi =
    salonKontrol &&
    (tarih !== oturum.date || saat !== oturum.timeSlot || salon !== oturum.salonlar.join(' - '))
      ? salonKontrol(oturum, { date: tarih, timeSlot: saat, room: salon })
      : [];
  const oneriEkle = (ad) => {
    if (cokSalon) {
      // En az gözetmenli salona.
      const oda = odalar
        .slice()
        .sort((a, b) => parca(salonGoz[a]).length - parca(salonGoz[b]).length)[0];
      salonGozDegis(oda, [...parca(salonGoz[oda]), ad].join(', '));
    } else setGozetmen([...parca(gozetmen), ad].join(', '));
  };
  const etiket = { fontSize: 11.5, fontWeight: 600, color: '#64748B', marginBottom: 4 };
  const secim = {
    height: 34,
    padding: '0 8px',
    border: '1px solid #CBD5E1',
    borderRadius: 8,
    fontSize: 13,
    background: '#fff',
    width: '100%',
  };
  const bolumAdi = (id) => (bolumBilgisi[id] && bolumBilgisi[id].ad) || id;
  const birlesik = oturum.uyeler.length > 1;
  return (
    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 12, marginTop: 12 }}>
      <div style={{ fontSize: 13, color: '#334155', marginBottom: 8 }}>
        {oturum.sure} dk · <b>{oturum.ogrenci}</b> öğrenci
        {oturum.bolumIdleri.length > 1 && (
          <span
            style={{
              marginLeft: 8,
              padding: '1px 8px',
              borderRadius: 999,
              background: '#FEF9C3',
              color: '#854D0E',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {oturum.bolumIdleri.length} bölüm ortak
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
        {oturum.uyeler.map((u) => (
          <div
            key={u.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              padding: '6px 8px',
              background: '#F8FAFC',
              borderRadius: 8,
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <b>{u.code}</b> {u.name}
              <span style={{ color: '#64748B' }}>
                {' '}
                — {bolumAdi(u.departmentId)} · {u.studentCount || 0} öğr.
                {u.professor ? ' · ' + u.professor : ''}
              </span>
            </span>
            {yetkili && birlesik && (
              <button
                type="button"
                onClick={() => onAyir(u)}
                title="Bu sınavı ortak oturumdan ayır"
                style={{
                  border: '1px solid #CBD5E1',
                  background: '#fff',
                  borderRadius: 6,
                  fontSize: 12,
                  padding: '2px 8px',
                  cursor: 'pointer',
                }}
              >
                Ayır
              </button>
            )}
          </div>
        ))}
      </div>
      {yetkili ? (
        <>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}
          >
            <div>
              <div style={etiket}>Tarih</div>
              <select value={tarih} onChange={(e) => setTarih(e.target.value)} style={secim}>
                {gunSecenekleri.map((g) => (
                  <option key={g.tarih} value={g.tarih}>
                    {g.kisa} {g.gun}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={etiket}>Başlangıç saati</div>
              {/* Saat serbest girilir (ör. 09:15, 13:50); liste yalnız öneridir. */}
              <input
                type="time"
                value={saat}
                list="fakulte-saat-onerileri"
                onChange={(e) => e.target.value && setSaat(e.target.value)}
                style={secim}
              />
              <datalist id="fakulte-saat-onerileri">
                {saatSecenekleri.map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={etiket}>Salonlar (fakültenin bütün salonları)</div>
            <CokluSecim
              deger={salon}
              ayrac=" - "
              secenekler={salonSecenekleri}
              onChange={setSalon}
              ekleMetni="+ Salon ekle"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={etiket}>
              Gözetmenler (dersin öğretim elemanı ve fakültenin araştırma görevlileri)
              {cokSalon ? ' — her salonun gözetmeni ayrı' : ''}
            </div>
            {cokSalon ? (
              <div style={{ display: 'grid', gap: 8 }} data-salon-gozetmenleri>
                {odalar.map((oda) => (
                  <div
                    key={oda}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '92px 1fr',
                      gap: 8,
                      alignItems: 'start',
                      padding: '6px 8px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                    }}
                  >
                    <div
                      style={{ fontSize: 12.5, fontWeight: 700, color: '#0F766E', paddingTop: 7 }}
                    >
                      {oda}
                    </div>
                    <CokluSecim
                      deger={salonGoz[oda] || ''}
                      ayrac=", "
                      secenekler={
                        SFk
                          ? SFk.gozetmenSecenekListesi(
                              SFk.sinavHocalari(oturum.uyeler),
                              gozetmenSecenekleri
                            )
                          : gozetmenSecenekleri
                      }
                      onChange={(v) => salonGozDegis(oda, v)}
                      ekleMetni="+ Gözetmen"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <CokluSecim
                deger={gozetmen}
                ayrac=", "
                secenekler={
                  SFk
                    ? SFk.gozetmenSecenekListesi(
                        SFk.sinavHocalari(oturum.uyeler),
                        gozetmenSecenekleri
                      )
                    : gozetmenSecenekleri
                }
                onChange={setGozetmen}
                ekleMetni="+ Gözetmen ekle"
              />
            )}
            {uyarilar.length > 0 && (
              <div
                data-gozetmen-uyari
                style={{
                  marginTop: 8,
                  padding: '6px 10px',
                  background: '#FFF7ED',
                  border: '1px solid #FED7AA',
                  borderRadius: 8,
                  fontSize: 12.5,
                  color: '#9A3412',
                  display: 'grid',
                  gap: 2,
                }}
              >
                {uyarilar.map((x) => (
                  <div key={x}>⚠ {x}</div>
                ))}
              </div>
            )}
            {oneriler.length > 0 && (
              <div
                data-gozetmen-oneri
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginTop: 8,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 12, color: '#64748B' }}>
                  Öneri (bu saatte boş, yükü en az):
                </span>
                {oneriler.map((x) => (
                  <button
                    key={x.ad}
                    type="button"
                    onClick={() => oneriEkle(x.ad)}
                    title={x.gorev + ' görev · ' + x.dakika + ' dk — eklemek için tıklayın'}
                    style={{
                      border: '1px solid #99F6E4',
                      background: '#F0FDFA',
                      color: '#0F766E',
                      borderRadius: 999,
                      padding: '2px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + {x.ad} · {x.gorev}
                  </button>
                ))}
              </div>
            )}
          </div>
          {salonEngelListesi.length > 0 && (
            <div
              data-salon-engeli
              style={{
                marginBottom: 10,
                padding: '8px 10px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                fontSize: 12.5,
                color: '#991B1B',
                whiteSpace: 'pre-line',
              }}
            >
              <b>Bu saatte seçilen salonda başka bir sınav var</b> — aynı salonda saatleri örtüşen
              iki ayrı sınav olamaz (1 dakika bile).
              {'\n' +
                (window.SinavFakulte
                  ? window.SinavFakulte.salonCakismaMetni(salonEngelListesi)
                  : '')}
              {'\n'}Birlikte yapılacaksa aşağıdan birleştirin; değilse başka saat ya da salon seçin.
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              disabled={!degisti || kaydediliyor || salonEngelListesi.length > 0}
              onClick={async () => {
                setKaydediliyor(true);
                await onKaydet(oturum, {
                  date: tarih,
                  timeSlot: saat,
                  room: salon,
                  supervisor: etkinGozetmenler.join(', '),
                  ...(yeniDagilim ? { salonGozetmenleri: yeniDagilim } : {}),
                });
                setKaydediliyor(false);
              }}
              style={{
                height: 34,
                padding: '0 16px',
                border: 'none',
                borderRadius: 8,
                background: degisti && salonEngelListesi.length === 0 ? '#0F766E' : '#CBD5E1',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                cursor: degisti && salonEngelListesi.length === 0 ? 'pointer' : 'default',
              }}
            >
              {kaydediliyor ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
            </button>
          </div>
          {ayniSaattekiler.length > 0 && (
            <div
              style={{
                marginTop: 14,
                padding: 10,
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#92400E', marginBottom: 6 }}>
                Aynı saatteki diğer oturumlarla birleştir
              </div>
              {ayniSaattekiler.map((d) => (
                <div
                  key={d.anahtar}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12.5,
                    padding: '3px 0',
                  }}
                >
                  <span style={{ flex: 1 }}>
                    <b>{d.kodSatiri}</b> — {d.bolumIdleri.map(bolumAdi).join(', ')} · {d.timeSlot} ·{' '}
                    {d.ogrenci} öğr.
                  </span>
                  <button
                    type="button"
                    onClick={() => onBirlestir(oturum, d)}
                    style={{
                      border: 'none',
                      background: '#D97706',
                      color: '#fff',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '3px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    Birleştir
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 13 }}>
          {(oturum.salonGozetmenleri || []).length > 1 ? (
            oturum.salonGozetmenleri.map((x) => (
              <div key={x.salon}>
                <b>{x.salon}:</b> {x.gozetmenler.join(', ') || '—'}
              </div>
            ))
          ) : (
            <>
              <b>Salon:</b> {oturum.salonlar.join(', ') || '—'} · <b>Gözetmen:</b>{' '}
              {oturum.gozetmenler.join(', ') || '—'}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Girişte fakülte/üniversite yetkilisinin istemci rolü 'admin', bölüm
// yetkilisi işaretli akademisyeninki 'bolum_yetkilisi' olur (baseRole
// 'professor' kalır; shared-components → attachProfile). Bu modülde
// 'admin' bütün üniversite demektir: fakülte yetkilisi (üniversite yetkilisi
// değilse) yalnız fakültesinde yetkilidir.
const tamYonetici = (u) =>
  !!u && ((u.role === 'admin' && !u.isFacultyManager) || !!u.isUniversityAdmin);
// Ders veren kişi mi (sade akademisyen ya da akademisyen girişli yetkili)?
const akademisyenMi = (u) => !!u && (u.role === 'professor' || u.baseRole === 'professor');

const FakulteProgramPenceresi = ({ currentUser, onClose, varsayilanBolum }) => {
  const SF = window.SinavFakulte;
  const [veri, setVeri] = useState(null);
  // Açılışta kullanıcının fakültesi; yoksa (ör. admin) üzerinde çalışılan
  // bölümün fakültesi.
  const [fakulteId, setFakulteId] = useState(
    currentUser?.facultyId ||
      ((window.DEPARTMENTS || []).find((d) => d.id === varsayilanBolum) || {}).facultyId ||
      (varsayilanBolum ? 'muhendislik' : '')
  );
  // Gün sekmesi TARİHLE tutulur ('gun:2026-11-09'); 'gun:' = ilk gün. Sıra
  // numarasıyla tutulunca taslak göster/gizle ya da canlı yenileme gün
  // listesini kaydırıp açık sekmeyi sessizce başka güne çeviriyordu.
  const [sekme, setSekme] = useState('gun:');
  const [taslakDahil, setTaslakDahil] = useState(true);
  const [secilen, setSecilen] = useState(null);
  const [ayarTaslak, setAyarTaslak] = useState(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  // onClose her üst çizimde yeni fonksiyon; etkiye bağımlılık olsaydı her
  // çizimde bütün veri yeniden okunurdu.
  const kapatRef = _useRef(onClose);
  kapatRef.current = onClose;

  const oku = useCallback(async () => {
    ['sinav_programi', 'sinav_gonderimleri', 'sinav_fakulte_ayarlari', 'sinav_donemler'].forEach(
      (k) => window.apiInvalidate && window.apiInvalidate(k)
    );
    const [
      donemler,
      sinavlar,
      gonderimler,
      ayarlar,
      fakulteler,
      akademisyenler,
      bolumKayitlari,
      bolumSalonlari,
    ] = await Promise.all([
      window.apiRead('sinav_donemler').catch(() => []),
      window.apiRead('sinav_programi').catch(() => []),
      window.apiRead('sinav_gonderimleri').catch(() => []),
      window.apiRead('sinav_fakulte_ayarlari').catch(() => []),
      window.apiRead('faculties').catch(() => []),
      window.apiRead('professors').catch(() => []),
      window.apiRead('departments').catch(() => []),
      window.apiRead('department_classrooms').catch(() => []),
    ]);
    const dizi = (x) => (Array.isArray(x) ? x : []);
    setVeri({
      donemler: dizi(donemler),
      sinavlar: dizi(sinavlar),
      gonderimler: dizi(gonderimler),
      ayarlar: dizi(ayarlar),
      fakulteler: dizi(fakulteler),
      akademisyenler: dizi(akademisyenler),
      bolumKayitlari: dizi(bolumKayitlari),
      bolumSalonlari: dizi(bolumSalonlari),
    });
  }, []);

  useEffect(() => {
    oku();
    // Art arda gelen anlık olaylar tek okumada toplanır.
    let zamanlayici = null;
    const h = () => {
      clearTimeout(zamanlayici);
      zamanlayici = setTimeout(() => oku(), 700);
    };
    const c = ['sinav_programi', 'sinav_gonderimleri', 'sinav_fakulte_ayarlari'];
    c.forEach((x) => window.addEventListener('realtime:' + x, h));
    const esc = (e) => e.key === 'Escape' && kapatRef.current();
    window.addEventListener('keydown', esc);
    return () => {
      clearTimeout(zamanlayici);
      c.forEach((x) => window.removeEventListener('realtime:' + x, h));
      window.removeEventListener('keydown', esc);
    };
  }, [oku]);

  const tumBolumler = useMemo(
    () =>
      (window.DEPARTMENTS || []).map((d) => ({
        ...d,
        facultyId: d.facultyId || 'muhendislik',
      })),
    []
  );
  // Fakülte / MYO listesi: adıyla (Türkçe karakterleriyle), bölümü olmayan
  // birimler dahil; slug ve veritabanı kimliği aynı birimde birleşir.
  const fakulteler = useMemo(
    () => (SF ? SF.fakulteListesi((veri && veri.fakulteler) || [], tumBolumler) : []),
    [SF, veri, tumBolumler]
  );
  const fakulte =
    fakulteler.find((f) => f.kimlikler.includes(fakulteId)) ||
    fakulteler.find((f) => f.bolumSayisi > 0) ||
    fakulteler[0] ||
    null;
  const fakKimlikleri = useMemo(() => new Set(fakulte ? fakulte.kimlikler : []), [fakulte]);
  // Ayar belgesinin kimliği: yetkilinin kendi fakülte kimliği (sunucu yetki
  // alanını bununla denetler), yoksa birimin ilk kimliği.
  const fakId =
    fakulte && currentUser?.facultyId && fakulte.kimlikler.includes(currentUser.facultyId)
      ? currentUser.facultyId
      : fakulte
        ? fakulte.anahtar
        : '';
  const fakulteAdi = fakulte ? fakulte.ad : '';
  const yetkili =
    tamYonetici(currentUser) ||
    (!!currentUser?.isFacultyManager && fakKimlikleri.has(currentUser?.facultyId || ''));

  const bolumler = useMemo(
    () => tumBolumler.filter((d) => fakKimlikleri.has(d.facultyId)),
    [fakKimlikleri, tumBolumler]
  );
  const bolumIdleri = useMemo(() => new Set(bolumler.map((d) => d.id)), [bolumler]);

  const ayar = useMemo(() => {
    const a =
      ((veri && veri.ayarlar) || []).find(
        (x) =>
          x &&
          (fakKimlikleri.has(x.id) ||
            (Array.isArray(x.kimlikler) && x.kimlikler.some((k) => fakKimlikleri.has(k))))
      ) || {};
    return {
      ...a,
      bolumler: ayarHaritasi(a.bolumler, 'id'),
      kisaltmalar: ayarHaritasi(a.kisaltmalar, 'ad', (x) => x.kisaltma),
    };
  }, [veri, fakKimlikleri]);

  // Yalnız ŞU ANKİ sınav dönemi (lisans): bugünü kapsayan, yoksa en yakın
  // gelecek, o da yoksa en son biten dönem.
  const grup = useMemo(() => {
    if (!SF || !veri) return null;
    const gruplar = SF.donemGruplari(
      veri.donemler.filter(
        (d) => d && bolumIdleri.has(d.departmentId) && (d.seviye || 'lisans') === 'lisans'
      )
    );
    return SF.aktifDonemGrubu(gruplar, formatDateISO(new Date()));
  }, [SF, veri, bolumIdleri]);

  const bolumDurumlari = useMemo(() => {
    if (!SF || !veri || !grup) return [];
    const donemIdleri = new Set(grup.donemler.map((d) => d.id));
    return bolumler.map((b) => {
      const sinavlar = veri.sinavlar.filter(
        (e) => e && ayniBolumMu(e.departmentId, b.id) && donemIdleri.has(e.periodId)
      );
      const kimlik = SF.gonderimKimligi(b.id, grup.anahtar);
      // Gönderim kaydı bölüm kimliğinin bütün biçimleriyle aranır (eski slug
      // ile kaydedilmiş gönderim de bulunsun; iade doğru belgeye yazılsın).
      const kayit =
        [
          String(b.id),
          ...(Array.isArray(b.kimlikler) ? b.kimlikler : []),
          ...(window.bolumKimlikleri ? window.bolumKimlikleri(String(b.id)) : []),
        ]
          .filter((v, i, l) => v && l.indexOf(v) === i)
          .map((v) => SF.gonderimKaydiBul(veri.gonderimler, v, grup.anahtar))
          .find(Boolean) || null;
      return {
        bolum: b,
        sinavlar,
        kimlik,
        kayit,
        durum: sinavlar.length ? SF.gonderimDurumu(kayit, SF.programImzasi(sinavlar)) : 'bekliyor',
      };
    });
  }, [SF, veri, grup, bolumler]);

  const gonderenSayisi = bolumDurumlari.filter(
    (x) => x.durum === 'gonderildi' || x.durum === 'degisti'
  ).length;
  // Bu dönemde sınavı olan bölümler (sınavı hiç olmayan bölüm "göndermedi" sayılmaz).
  const programliBolumSayisi = bolumDurumlari.filter((x) => x.sinavlar.length > 0).length;

  // Bir bölümün gözetmenleri: o bölümde gözetmen olan ve ANA bölümü bu
  // fakültede olan akademisyenler. Başka fakülteden olup burada yalnız ders
  // veren (ek bölüm olarak bağlı) hoca listeye girmez.
  const bolumGozetmenleri = useCallback(
    (b) => {
      const G = window.Gozetmen || {};
      const gomulu = window.DEPARTMENTS || [];
      return ((veri && veri.akademisyenler) || [])
        .filter(
          (p) =>
            p &&
            p.name &&
            (G.bolumGozetmeniMi
              ? G.bolumGozetmeniMi(p, b.id, gomulu, b.name)
              : (p.roles || []).includes('gozetmen')) &&
            (!SF || SF.fakulteAkademisyeniMi(p, bolumler, tumBolumler))
        )
        .sort((x, y) => (x.name || '').localeCompare(y.name || '', 'tr'));
    },
    [SF, veri, bolumler, tumBolumler]
  );

  // Salonu/gözetmeni girilmemiş sınavlar şablona otomatik yerleşir (bölümün
  // "Salon ve gözetmen ata" kuralıyla; kaydedilmez, öneridir).
  const yerlesim = useMemo(() => {
    if (!SF || !veri || !grup) return null;
    const G = window.Gozetmen || {};
    // Fakülte geneli salon kapasiteleri (girilen salon yetmiyorsa ek salon).
    const kapasiteler = {};
    [...fakulteSalonListesi(ayar), ...veri.bolumSalonlari].forEach((r) => {
      if (r && r.name && Number(r.capacity) > 0) kapasiteler[r.name] = Number(r.capacity);
    });
    // Dışarıdan (ikinci kademe): fakültenin bütün araştırma görevlileri.
    const fakulteArGor = SF.fakulteArastirmaGorevlileri(veri.akademisyenler, bolumler).map(
      (x) => x.deger
    );
    return fakulteOtomatikYerlesim(
      bolumDurumlari.map((x) => {
        const kayit = G.bolumKaydiniBul ? G.bolumKaydiniBul(veri.bolumKayitlari, x.bolum.id) : null;
        // Sıra: dersin hocası (kural) → dersin bölümü (gözetmen listesi +
        // bölümün öğretim üyeleri ve araştırma görevlileri) → dışarıdan.
        const havuzKisi = bolumGozetmenleri(x.bolum);
        const birincil = [
          ...new Set([
            ...havuzKisi.map((p) => p.name),
            ...SF.bolumAkademisyenHavuzu(veri.akademisyenler, {
              ...x.bolum,
              kimlikler: window.bolumKimlikleri ? window.bolumKimlikleri(x.bolum.id) : [x.bolum.id],
            }),
          ]),
        ];
        const ek = fakulteArGor.filter((a) => !birincil.includes(a));
        const havuz = veri.akademisyenler.filter(
          (p) => p && (birincil.includes(p.name) || ek.includes(p.name))
        );
        // Bölümün SINAV salonları (Bölüm Yönetimi → Sınıf / Salon → Kullanım);
        // tanımlı değilse fakültenin salon listesi.
        const kimlikler = window.bolumKimlikleri
          ? window.bolumKimlikleri(x.bolum.id)
          : [String(x.bolum.id)];
        const salonlar = sinavSalonlari(
          veri.bolumSalonlari.filter(
            (r) => r && r.name && kimlikler.includes(String(r.departmentId))
          )
        );
        return {
          bolumId: x.bolum.id,
          salonlar: salonlar.length > 0 ? salonlar : null,
          sinavlar: x.sinavlar,
          gozetmenAdlari: birincil,
          ekGozetmenAdlari: ek,
          kapasiteler,
          kurallar: { sayiKurali: kayit && kayit.gozetmenSayiKurali },
          // Bütün akademisyenler: havuzda olmayan ders hocasının müsait
          // olmadığı gün de bilinsin.
          musaitsizlik: window.gozetmenMusaitsizlikHaritasi
            ? window.gozetmenMusaitsizlikHaritasi([...havuz, ...veri.akademisyenler])
            : {},
        };
      }),
      fakulteSalonListesi(ayar)
    );
  }, [SF, veri, grup, bolumDurumlari, bolumGozetmenleri, ayar, bolumler]);
  const yerlesik = useCallback(
    (liste) => liste.map((e) => (yerlesim && yerlesim.get(e.id)) || e),
    [yerlesim]
  );
  // Yalnız ekranda görünen bölümlerin önerileri (taslaklar gizliyse onlar
  // kaydedilmez — kullanıcının görmediği yerleşim yazılmasın).
  const otomatikYerlesenler = useMemo(() => {
    if (!yerlesim) return [];
    const gorunen = new Set(
      bolumDurumlari
        .filter((x) => taslakDahil || x.durum === 'gonderildi' || x.durum === 'degisti')
        .map((x) => x.bolum.id)
    );
    return [...yerlesim.values()].filter(
      (e) => (e.oneriSalon || e.oneriGozetmen) && gorunen.has(e.departmentId)
    );
  }, [yerlesim, bolumDurumlari, taslakDahil]);

  const kitap = useMemo(() => {
    if (!SF || !grup) return null;
    const dahil = bolumDurumlari
      .filter((x) => taslakDahil || x.durum === 'gonderildi' || x.durum === 'degisti')
      .flatMap((x) => x.sinavlar);
    return SF.fakulteKitabi({
      sinavlar: yerlesik(dahil),
      salonlar: fakulteSalonListesi(ayar),
      bolumler,
      ayar,
      // Gün sekmeleri dönemin bütün hafta içi günlerini kapsar: sınavı
      // olmayan gün de (ör. hiç sınav konmamış Cuma) görünür.
      ekGunler: [grup.bas, grup.bit].filter(Boolean),
      // Canlı görünüm: göndermemiş (ya da iade edilmiş) bölümün sınavı taslak,
      // gönderimden sonra değişmiş olanı ayrı işaretlenir.
      taslakBolumler: bolumDurumlari
        .filter((x) => x.durum === 'bekliyor' || x.durum === 'iade')
        .map((x) => x.bolum.id),
      degisenBolumler: bolumDurumlari.filter((x) => x.durum === 'degisti').map((x) => x.bolum.id),
    });
  }, [SF, grup, bolumDurumlari, taslakDahil, ayar, bolumler, yerlesik]);

  // ── Fakülte yetkilisinin seçenekleri: bütün salonlar ve gözetmenler ──
  const salonSecenekleri = useMemo(
    () =>
      fakulteSalonListesi(ayar).map((r) => ({
        deger: r.name,
        etiket: r.name + (r.capacity ? ' (' + r.capacity + ')' : ''),
      })),
    [ayar]
  );
  // Gözetmen seçenekleri: fakültenin bütün araştırma görevlileri (oturum
  // penceresi dersin öğretim elemanını en başa ekler). Unvan verisi yoksa
  // bölümlerin gözetmen listeleri.
  const gozetmenSecenekleri = useMemo(() => {
    const arGor = SF
      ? SF.fakulteArastirmaGorevlileri((veri && veri.akademisyenler) || [], bolumler)
      : [];
    if (arGor.length > 0) return arGor;
    const out = [];
    const gorulen = new Set();
    bolumler.forEach((b) =>
      bolumGozetmenleri(b).forEach((p) => {
        if (gorulen.has(p.name)) return;
        gorulen.add(p.name);
        out.push({ deger: p.name, etiket: p.name, grup: b.name });
      })
    );
    return out;
  }, [SF, veri, bolumler, bolumGozetmenleri]);
  // ── GÖZETMEN DENETİMİ: çakışma, yük sayacı, öneri ──
  // Ekrandaki oturumlar (kaydedilmemiş otomatik öneriler dahil) üzerinden:
  // aynı kişi aynı saatte iki yerde mi, kim ne kadar görev aldı, bir
  // oturuma kim önerilir (o saatte boş, o gün müsait, yükü en az).
  const tumMusaitsizlik = useMemo(
    () =>
      window.gozetmenMusaitsizlikHaritasi && veri
        ? window.gozetmenMusaitsizlikHaritasi(veri.akademisyenler || [])
        : {},
    [veri]
  );
  const gozetmenDenetimi = useMemo(() => {
    if (!SF || !kitap || !SF.gozetmenCakismalari) {
      return { liste: [], oturumBazinda: {}, yukler: [], denge: null };
    }
    const c = SF.gozetmenCakismalari(kitap.oturumlar);
    const yukler = SF.gozetmenYukleri(
      kitap.oturumlar,
      gozetmenSecenekleri.map((x) => x.deger)
    );
    return { ...c, yukler, denge: SF.yukDengesi(yukler) };
  }, [SF, kitap, gozetmenSecenekleri]);
  // Ders programıyla çakışma (uyarı) — ekrandaki oturumların sınavları.
  const [dersOlaylari, setDersOlaylari] = useState([]);
  useEffect(() => {
    let canli = true;
    if (window.dersProgramiOlaylariniOku) {
      window.dersProgramiOlaylariniOku().then((l) => canli && setDersOlaylari(l || []));
    }
    return () => {
      canli = false;
    };
  }, []);
  const dersCakismalari = useMemo(
    () =>
      window.DersSinavCakisma && kitap && dersOlaylari.length
        ? window.DersSinavCakisma.dersSinavCakismalari(
            kitap.oturumlar.flatMap((o) => o.uyeler || []),
            dersOlaylari,
            { donemler: (veri && veri.donemler) || [] }
          )
        : [],
    [kitap, dersOlaylari, veri]
  );
  const kisiUyarisi = (ad, hedef) => {
    if (!SF || !kitap) return null;
    const m = SF.gozetmenMesgulMu(ad, hedef, kitap.oturumlar);
    if (m) {
      return (
        'aynı saatte ' +
        (m.kod || 'başka bir sınavda') +
        ' (' +
        m.saat +
        (m.salonlar.length ? ', ' + m.salonlar.join(' - ') : '') +
        ') görevli'
      );
    }
    if (SF.gozetmenGunMusaitDegilMi(ad, hedef && hedef.date, tumMusaitsizlik)) {
      return 'o gün müsait değil olarak işaretli';
    }
    return null;
  };
  const oneriBul = (hedef) =>
    SF && kitap
      ? SF.gozetmenOnerileri({
          oturum: hedef,
          oturumlar: kitap.oturumlar,
          adaylar: gozetmenSecenekleri.map((x) => x.deger),
          yukler: gozetmenDenetimi.yukler,
          musaitsizlik: tumMusaitsizlik,
        })
      : [];
  const gunSecenekleri = useMemo(
    () =>
      SF && grup
        ? SF.sinavGunleri(
            bolumDurumlari.flatMap((x) => x.sinavlar),
            [grup.bas, grup.bit].filter(Boolean)
          )
        : [],
    [SF, grup, bolumDurumlari]
  );
  // Önerilen başlangıç saatleri: fakültenin çizelgesindeki dilimler.
  const saatSecenekleri = (kitap ? kitap.dilimler : []).filter((d) => !d.ara).map((d) => d.bas);
  const oneriler = useMemo(
    () => (SF ? SF.birlestirmeOnerileri(bolumDurumlari.flatMap((x) => x.sinavlar)) : []),
    [SF, bolumDurumlari]
  );
  const [onerilerAcik, setOnerilerAcik] = useState(false);

  // ── Yazma (fakülte yetkilisi: tam yetki) ──
  // Fakültenin kendi düzenlemesi, gönderilmiş programı "bölüm değiştirdi"
  // durumuna düşürmesin: etkilenen bölümlerin gönderim parmak izi tazelenir.
  const gonderimImzasiniTazele = async (ops) => {
    if (!grup || !veri) return;
    const yama = new Map(ops.map((o) => [o.docId, o.data]));
    const donemIdleri = new Set(grup.donemler.map((d) => d.id));
    const yeni = veri.sinavlar.map((e) => (yama.has(e.id) ? { ...e, ...yama.get(e.id) } : e));
    const etkilenen = new Set(
      veri.sinavlar.filter((e) => yama.has(e.id)).map((e) => e.departmentId)
    );
    const hatalar = [];
    for (const x of bolumDurumlari) {
      if (
        ![...etkilenen].some((b) => ayniBolumMu(b, x.bolum.id)) ||
        !x.kayit ||
        !(x.durum === 'gonderildi' || x.durum === 'degisti')
      )
        continue;
      const l = yeni.filter(
        (e) => ayniBolumMu(e.departmentId, x.bolum.id) && donemIdleri.has(e.periodId)
      );
      // Eski (| ayraçlı) kimlikle kayıtlı gönderim kendi belgesine yazılır.
      await DBWrite.set(
        'sinav_gonderimleri',
        x.kayit.id || x.kayit._docId || x.kimlik,
        {
          durum: 'gonderildi',
          imza: SF.programImzasi(l),
          fakulteDuzenleyen: currentUser?.name || '',
          fakulteDuzenlemeTarihi: new Date().toISOString(),
        },
        true
      ).catch((e) => hatalar.push(x.bolum.name + ': ' + e.message));
    }
    if (hatalar.length > 0) {
      alert(
        'Değişiklik kaydedildi, ancak şu bölümlerin gönderim kaydı güncellenemedi; bu ' +
          'bölümler "gönderimden sonra değişti" görünebilir:\n\n' +
          hatalar.join('\n')
      );
    }
  };
  // Aynı salonda saatleri örtüşen (1 dk bile) iki ayrı oturum yazılamaz.
  // Denetim bütün bölümlerin KAYITLI sınavları üzerinden yapılır (gizlenen
  // taslaklar dahil); yalnız saati/salonu/oturumu değişen oturuma bakılır.
  const salonEngeli = (ops) => {
    if (!SF || !SF.degisiklikSalonCakismalari) return [];
    // Bütün kayıtlı sınavlar: başka dönem grubundaki (ör. lisansüstü) aynı
    // salon ve saatteki sınav da görülsün.
    return SF.degisiklikSalonCakismalari(
      (veri && veri.sinavlar) || bolumDurumlari.flatMap((x) => x.sinavlar),
      ops
        .filter((o) => o.collection === 'sinav_programi' && o.type === 'update')
        .map((o) => ({ id: o.docId, data: o.data }))
    );
  };
  const sinavYaz = async (ops, mesaj) => {
    if (ops.length === 0) return;
    const engel = salonEngeli(ops);
    if (engel.length > 0) {
      alert(
        'Kaydedilmedi: aynı salonda saatleri örtüşen iki ayrı sınav olamaz (1 dakika bile).\n\n' +
          SF.salonCakismaMetni(engel) +
          '\n\nBirlikte yapılacaksa oturumları birleştirin; değilse başka saat ya da salon seçin.'
      );
      return;
    }
    try {
      for (let i = 0; i < ops.length; i += 50) await DBWrite.batch(ops.slice(i, i + 50));
      await gonderimImzasiniTazele(ops);
      await oku();
      setSecilen(null);
    } catch (e) {
      alert((mesaj || 'Kaydedilemedi') + ': ' + e.message);
    }
  };
  // Yalnız DEĞİŞEN alanlar yazılır: yalnız saat değiştiyse üyelerin kendi
  // salon/gözetmen kayıtları (ve otomatik işaretleri) olduğu gibi kalır.
  // Üye üye yazılır: elle girilmiş salon/gözetmen olduğu gibi kalır; yalnız
  // otomatik ÖNERİ taşıyan üyeye öneri (otomatik işaretiyle) yazılır. Gün ya
  // da saat değiştiyse öneri yazılmaz — eski saate göre hesaplanmıştı; yeni
  // saatte otomatik yerleşim yeniden önerir.
  const oturumKaydet = (o, d) => {
    const zamanDegisti = d.date !== o.date || d.timeSlot !== o.timeSlot;
    const salonDegisti = d.room !== o.salonlar.join(' - ');
    const gozetmenDegisti = d.supervisor !== o.gozetmenler.join(', ');
    // Salon başına gözetmen dağılımı (çok salonlu oturum): kişiler aynı kalıp
    // yalnız salonları değişse de kaydedilir.
    const dagilimMetni = (l) =>
      JSON.stringify((l || []).map((x) => [x.salon, x.gozetmenler || []]));
    const yeniDagilim = Array.isArray(d.salonGozetmenleri) ? d.salonGozetmenleri : null;
    const dagilimDegisti =
      !!yeniDagilim && dagilimMetni(yeniDagilim) !== dagilimMetni(o.salonGozetmenleri);
    const ops = o.uyeler
      .map((u) => {
        const data = {};
        if (zamanDegisti) Object.assign(data, { date: d.date, timeSlot: d.timeSlot });
        if (salonDegisti)
          Object.assign(data, { room: d.room, otomatikSalon: false, otomatikEkSalon: '' });
        else if (u.oneriSalon && !zamanDegisti) Object.assign(data, salonOnerisiVerisi(u));
        if (gozetmenDegisti || dagilimDegisti)
          Object.assign(data, {
            supervisor: d.supervisor,
            otomatikGozetmen: false,
            ...(yeniDagilim ? { salonGozetmenleri: yeniDagilim } : {}),
          });
        else if (u.oneriGozetmen && !zamanDegisti)
          Object.assign(data, { supervisor: u.supervisor, otomatikGozetmen: true });
        return { collection: 'sinav_programi', type: 'update', docId: u.id, data };
      })
      .filter((op) => Object.keys(op.data).length > 0);
    if (ops.length === 0) return Promise.resolve();
    return sinavYaz(ops);
  };
  // Çakışma panelinden: bir oturumda X yerine Y yazılır (salon dağılımında
  // X'in salonuna). Diğer alanlar olduğu gibi kalır.
  // tekSalon: "iki salona yazılmış" çakışmasında kişi YALNIZ son salonda
  // yeni kişiyle değişir, öbür salonlardan çıkarılır (yoksa yeni kişi de iki
  // salona birden yazılıp aynı çakışma onun adıyla sürerdi).
  const gozetmenDegistir = (o, eski, yeni, tekSalon) => {
    const anahtar = (a) =>
      window.Gozetmen && window.Gozetmen.adAnahtari ? window.Gozetmen.adAnahtari(a) : a;
    const esit = (a, b) => anahtar(a) === anahtar(b);
    const tekil = (l) => l.filter((g, i) => l.findIndex((x) => esit(x, g)) === i);
    let dagilim = null;
    if ((o.salonGozetmenleri || []).length > 0) {
      const iceren = o.salonGozetmenleri
        .map((x, i) => (x.gozetmenler.some((g) => esit(g, eski)) ? i : -1))
        .filter((i) => i >= 0);
      const hedefSalon = iceren[iceren.length - 1];
      dagilim = o.salonGozetmenleri.map((x, i) => ({
        salon: x.salon,
        gozetmenler: tekil(
          x.gozetmenler
            .map((g) => (esit(g, eski) ? (!tekSalon || i === hedefSalon ? yeni : null) : g))
            .filter(Boolean)
        ),
      }));
      // Kişi ilk salonda kalır (tekSalon): yalnız sondaki yerine yeni kişi gelir.
      if (tekSalon && iceren.length > 1) {
        dagilim = dagilim.map((x, i) =>
          i === iceren[0] ? { ...x, gozetmenler: tekil([...x.gozetmenler, eski]) } : x
        );
      }
    }
    const liste = dagilim
      ? tekil(dagilim.flatMap((x) => x.gozetmenler))
      : tekil(o.gozetmenler.map((g) => (esit(g, eski) ? yeni : g)));
    return oturumKaydet(o, {
      date: o.date,
      timeSlot: o.timeSlot,
      room: o.salonlar.join(' - '),
      supervisor: liste.join(', '),
      ...(dagilim ? { salonGozetmenleri: dagilim } : {}),
    });
  };
  // hedef: { date, timeSlot } — birleşen sınavlar bu başlangıca taşınır.
  const birlestir = (sinavlar0, hedef) => {
    const SB = window.SinavBirlesim;
    // Ekrandaki kopyalar kaydedilmemiş otomatik öneri taşıyabilir: birleşim
    // ham kayıtlar üzerinden yapılır (öneri kalıcı veri olarak yazılmasın).
    const ham = bolumDurumlari.flatMap((x) => x.sinavlar);
    const sinavlar = sinavlar0.map((e) => ham.find((h) => h.id === e.id) || e);
    const yamalar = SF.birlestirmeYamalari(sinavlar, SB ? SB.yeniBirlesimId() : 'B' + Date.now(), {
      // Seçilen sınav zaten bir ortak oturumdaysa o oturumun diğer üyeleri de
      // dahil edilir; yoksa oturum bölünürdü.
      tumSinavlar: bolumDurumlari.flatMap((x) => x.sinavlar),
      ...(hedef || {}),
    });
    const kodlar = [
      ...new Set(
        yamalar.map(
          (y) => (bolumDurumlari.flatMap((x) => x.sinavlar).find((e) => e.id === y.id) || {}).code
        )
      ),
    ]
      .filter(Boolean)
      .join(', ');
    if (
      !window.confirm(
        kodlar +
          ' tek oturumda birleştirilecek. Salonlar ve gözetmenler birleşir: ' +
          (yamalar[0].data.room || 'salon yok') +
          '. Devam edilsin mi?'
      )
    )
      return;
    return sinavYaz(
      yamalar.map((y) => ({
        collection: 'sinav_programi',
        type: 'update',
        docId: y.id,
        data: y.data,
      })),
      'Birleştirilemedi'
    );
  };
  // Ayrılan sınav oturumun salon ve gözetmenini taşırsa aynı saatte aynı
  // salonda kesin çakışma olur: boşaltılır, otomatik yerleşim yeniden önerir.
  const ayir = (u) =>
    window.confirm(
      u.code +
        ' ortak oturumdan ayrılsın mı? Salonu ve gözetmeni boşaltılır; otomatik yerleşim ' +
        'yeni salon/gözetmen önerir.'
    ) &&
    sinavYaz(
      // Geride tek üye kalırsa onun bağı da çözülür (sarkan tek üyeli oturum
      // kalmasın).
      (window.SinavBirlesim
        ? window.SinavBirlesim.birlesimdenCikarYamalari(
            u,
            bolumDurumlari.flatMap((x) => x.sinavlar)
          )
        : [{ id: u.id }]
      ).map((y) => ({
        collection: 'sinav_programi',
        type: 'update',
        docId: y.id,
        data:
          y.id === u.id
            ? {
                birlesimId: '',
                room: '',
                supervisor: '',
                otomatikSalon: false,
                otomatikGozetmen: false,
              }
            : { birlesimId: '' },
      })),
      'Ayrılamadı'
    );

  const iadeEt = async (x) => {
    const not = window.prompt(
      x.bolum.name + ' programını iade ediyorsunuz. Bölüme iletilecek not (zorunlu):'
    );
    if (!not || !not.trim()) return;
    try {
      await DBWrite.update(
        'sinav_gonderimleri',
        (x.kayit && (x.kayit.id || x.kayit._docId)) || x.kimlik,
        {
          durum: 'iade',
          iadeNotu: not.trim(),
          iadeEden: currentUser?.name || '',
          iadeTarihi: new Date().toISOString(),
        }
      );
      await oku();
    } catch (e) {
      alert('İade edilemedi: ' + e.message);
    }
  };

  const ayarKaydet = async () => {
    if (!ayarTaslak || !fakId) return;
    const otomatikKisaltmalar =
      SF && kitap ? SF.kisaltmaHaritasi(Object.keys(kitap.kisaltmalar), {}) : {};
    setKaydediliyor(true);
    try {
      const salonlar = ayarTaslak.salonlar
        .map((x) => ({
          name: String(x.name || '').trim(),
          capacity: x.capacity === '' ? '' : Number(x.capacity) || '',
        }))
        .filter((x) => x.name);
      await DBWrite.set(
        'sinav_fakulte_ayarlari',
        fakId,
        {
          facultyId: fakId,
          // Bölümler fakülteye slug ya da veritabanı kimliğiyle bağlı olabilir.
          kimlikler: fakulte ? fakulte.kimlikler : [fakId],
          salonlar,
          bolumler: Object.entries(ayarTaslak.bolumler).map(([id, v]) => ({
            id,
            kisaAd: String(v.kisaAd || '').trim(),
            renk: String(v.renk || '').replace('#', ''),
          })),
          // Yalnız elle verilen ya da otomatikten farklı kısaltmalar saklanır;
          // yoksa her kayıtta bütün otomatik kısaltmalar "elle" donuyordu.
          kisaltmalar: Object.entries(ayarTaslak.kisaltmalar)
            .filter(([, k]) => String(k || '').trim())
            .filter(
              ([ad, k]) =>
                ayar.kisaltmalar[ad] !== undefined || String(k).trim() !== otomatikKisaltmalar[ad]
            )
            .map(([ad, k]) => ({ ad, kisaltma: String(k).trim() })),
          ozelRenkler: Object.fromEntries(
            Object.entries(ayarTaslak.ozelRenkler || {}).map(([k, v]) => [
              k,
              String(v || '').replace('#', ''),
            ])
          ),
          cizelge: SF ? SF.cizelgeOku(ayarTaslak.cizelge) : ayarTaslak.cizelge,
          guncelleyen: currentUser?.name || '',
        },
        true
      );
      await oku();
      setAyarTaslak(null);
      alert('Fakülte sınav ayarları kaydedildi.');
    } catch (e) {
      alert('Kaydedilemedi: ' + e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  const ayarAc = () => {
    const bb = SF ? SF.bolumBilgileri(bolumler, ayar.bolumler) : {};
    setAyarTaslak({
      salonlar: fakulteSalonListesi(ayar).map((x) => ({ ...x })),
      bolumler: Object.fromEntries(
        Object.entries(bb).map(([id, v]) => [id, { kisaAd: v.kisaAd, renk: '#' + v.renk }])
      ),
      kisaltmalar: { ...((kitap && kitap.kisaltmalar) || {}), ...ayar.kisaltmalar },
      ozelRenkler: Object.fromEntries(
        Object.entries(SF ? SF.ozelRenkler(ayar.ozelRenkler) : {}).map(([k, v]) => [k, '#' + v])
      ),
      cizelge: SF ? { ...SF.cizelgeOku(ayar.cizelge) } : {},
    });
    setSekme('ayar');
  };

  // Resmî Excel varsayılan olarak YALNIZ gönderilmiş programlardan üretilir;
  // taslakları da içeren çıktı ayrıca seçilir (taslak hücreler kesik çizgili).
  // Otomatik yerleşimi kaydet: önerilen salon/gözetmen sınav kaydına yazılır
  // (bölümün "Salon ve gözetmen ata" düğmesi gibi otomatik işaretiyle;
  // bölüm "Otomatik atamayı temizle" ile geri alabilir).
  const yerlesimiKaydet = () => {
    if (otomatikYerlesenler.length === 0) return;
    const salonSayisi = otomatikYerlesenler.filter((e) => e.oneriSalon).length;
    const gozetmenSayisi = otomatikYerlesenler.filter((e) => e.oneriGozetmen).length;
    if (
      !window.confirm(
        otomatikYerlesenler.length +
          ' sınava otomatik yerleşim yazılacak (' +
          salonSayisi +
          ' salon, ' +
          gozetmenSayisi +
          ' gözetmen ataması). Elle girilenler değişmez.\n\nKaydedilsin mi?'
      )
    )
      return;
    sinavYaz(
      otomatikYerlesenler.map((e) => ({
        collection: 'sinav_programi',
        type: 'update',
        docId: e.id,
        data: {
          ...salonOnerisiVerisi(e),
          ...(e.oneriGozetmen ? { supervisor: e.supervisor, otomatikGozetmen: true } : {}),
        },
      })),
      'Otomatik yerleşim kaydedilemedi'
    );
  };

  const excel = (taslakDahilExcel) => {
    if (!SF || !grup) return;
    const gonderilen = (x) => x.durum === 'gonderildi' || x.durum === 'degisti';
    const eksik = bolumDurumlari.filter((x) => x.sinavlar.length > 0 && !gonderilen(x));
    if (!taslakDahilExcel && eksik.length > 0) {
      const devam = window.confirm(
        'Şu bölümler programını henüz göndermedi:\n\n' +
          eksik.map((x) => '• ' + x.bolum.name + ' (' + x.sinavlar.length + ' sınav)').join('\n') +
          '\n\nExcel yalnız gönderilmiş programlarla üretilecek. Devam edilsin mi?\n' +
          '(Taslakları da görmek için "Taslak dahil" seçeneğini kullanın.)'
      );
      if (!devam) return;
    }
    const sinavlar = bolumDurumlari
      .filter((x) => taslakDahilExcel || gonderilen(x))
      .flatMap((x) => x.sinavlar);
    if (sinavlar.length === 0) {
      alert("Excel'e alınacak gönderilmiş program yok.");
      return;
    }
    const k = SF.fakulteKitabi({
      sinavlar: yerlesik(sinavlar),
      salonlar: fakulteSalonListesi(ayar),
      bolumler,
      ayar,
      ekGunler: [grup.bas, grup.bit].filter(Boolean),
      taslakBolumler: taslakDahilExcel
        ? bolumDurumlari.filter((x) => !gonderilen(x)).map((x) => x.bolum.id)
        : [],
      degisenBolumler: bolumDurumlari.filter((x) => x.durum === 'degisti').map((x) => x.bolum.id),
    });
    exportFakulteXLSX(
      k,
      (
        'Fakulte_' +
        (grup ? grup.etiket : 'Sinav') +
        '_Programi' +
        (taslakDahilExcel ? '_TASLAK' : '')
      ).replace(/[^\wğüşıöçĞÜŞİÖÇ-]+/g, '_')
    );
  };

  // Gözetmen çıktısı: ekrandaki programın gözetmenleri ve atandıkları salonlar.
  const gozetmenCiktisi = () => {
    if (!SF || !kitap || !SF.gozetmenGorevListesi) return;
    const satirlar = SF.gozetmenGorevListesi(kitap.oturumlar);
    if (satirlar.length === 0) {
      alert('Ekrandaki programda gözetmen ataması yok.');
      return;
    }
    exportGozetmenXLSX(
      satirlar,
      (grup ? grup.etiket + ' — ' : '') + 'Gözetmen Görev Listesi',
      ('Gozetmen_Gorevleri_' + (grup ? grup.etiket : 'Sinav')).replace(/[^\wğüşıöçĞÜŞİÖÇ-]+/g, '_')
    );
  };

  // ── Görünüm parçaları ──
  const hucreStili = {
    border: '1px solid #CBD5E1',
    padding: '2px 4px',
    fontSize: 11,
    lineHeight: 1.25,
    textAlign: 'center',
    verticalAlign: 'middle',
    whiteSpace: 'pre-line',
  };
  const sabitBas = {
    position: 'sticky',
    background: '#F8FAFC',
    zIndex: 2,
    fontWeight: 700,
  };

  // Gün tablosu — dekanlık şablonu: DERSLİKLER / Kapasite / Saatler +
  // salonlar; sınav hücresi süresince birleşir. Otomatik yerleşen (henüz
  // kaydedilmemiş) oturum "oto" rozetiyle işaretlenir. Otomatik atamanın da
  // yerleştiremediği oturum en sağdaki "Salonu girilmemiş" sütununda kalır.
  // Hücredeki oturumlarda aynı saatte başka yerde de görevli olan kişiler.
  const gozetmenCakisanlari = (h) =>
    h && Array.isArray(h.oturumlar)
      ? [...new Set(h.oturumlar.flatMap((o) => gozetmenDenetimi.oturumBazinda[o.anahtar] || []))]
      : [];
  const tabloCiz = (g) => {
    const t = g.tablo;
    const hucreGorunumu = (h) => {
      const st = {
        ...hucreStili,
        background: '#' + (h.renk || 'FFFFFF'),
        fontWeight: 600,
        cursor: 'pointer',
        outlineOffset: -3,
        position: 'relative',
      };
      const gc = gozetmenCakisanlari(h);
      if (h.cakisma) st.outline = '3px solid #DC2626';
      else if (gc.length > 0) st.outline = '3px solid #F97316';
      else if (h.taslak) {
        st.outline = '2px dashed #475569';
        st.opacity = 0.62;
      } else if (h.degisti) st.outline = '2px dashed #D97706';
      return st;
    };
    const sanalBas = { background: '#FEF3C7', color: '#92400E' };
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            overflow: 'auto',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            flex: 1,
            minHeight: 0,
          }}
        >
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%' }}>
            <thead>
              <tr>
                <th
                  style={{ ...hucreStili, ...sabitBas, top: 0, left: 0, zIndex: 4, minWidth: 92 }}
                >
                  {g.kisa} {g.gun}
                </th>
                <th
                  colSpan={t.salonlar.length}
                  style={{
                    ...hucreStili,
                    ...sabitBas,
                    top: 0,
                    background: '#FFFF00',
                    fontSize: 12,
                  }}
                >
                  DERSLİKLER
                </th>
              </tr>
              <tr>
                <th style={{ ...hucreStili, ...sabitBas, top: 22, left: 0, zIndex: 4 }}>
                  Kapasite
                </th>
                {t.salonlar.map((x) => (
                  <th
                    key={'k' + x.name}
                    style={{ ...hucreStili, ...sabitBas, top: 22, ...(x.sanal ? sanalBas : {}) }}
                  >
                    {x.capacity}
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{ ...hucreStili, ...sabitBas, top: 44, left: 0, zIndex: 4 }}>Saatler</th>
                {t.salonlar.map((x) => (
                  <th
                    key={'s' + x.name}
                    title={
                      x.sanal
                        ? 'Otomatik atamanın boş salon bulamadığı oturumlar — hücreye tıklayıp salon atayın.'
                        : undefined
                    }
                    style={{
                      ...hucreStili,
                      ...sabitBas,
                      top: 44,
                      minWidth: 128,
                      ...(x.sanal ? sanalBas : {}),
                    }}
                  >
                    {x.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.satirlar.map((r) => (
                <tr key={r.etiket} style={{ height: r.ara ? 22 : 34 }}>
                  <td
                    style={{
                      ...hucreStili,
                      position: 'sticky',
                      left: 0,
                      background: r.ara ? '#DCFCE7' : '#F8FAFC',
                      fontWeight: 600,
                      fontSize: r.ara ? 10.5 : 11,
                      zIndex: 1,
                    }}
                  >
                    {r.ara ? 'Öğle arası ' + r.etiket : r.etiket}
                  </td>
                  {r.hucreler.map((h, j) => {
                    const sutun = t.salonlar[j];
                    if (h && h.gizli) return null;
                    if (!h)
                      return (
                        <td
                          key={j}
                          style={{
                            ...hucreStili,
                            background: r.ara ? '#F0FDF4' : sutun.sanal ? '#FFFBEB' : undefined,
                          }}
                        />
                      );
                    return (
                      <td
                        key={j}
                        rowSpan={h.satirSayisi}
                        onClick={() => setSecilen({ hucre: h, salon: sutun.name, saat: r.etiket })}
                        title={
                          gozetmenCakisanlari(h).length > 0
                            ? 'Gözetmen çakışması: ' +
                              gozetmenCakisanlari(h).join(', ') +
                              ' aynı saatte başka bir yerde de görevli. Tıklayıp değiştirin.'
                            : h.salonsuz
                              ? 'Boş salon bulunamadı — tıklayıp salon atayın.'
                              : h.otomatik
                                ? 'Otomatik yerleşti (henüz kaydedilmedi). Ayrıntı için tıklayın.'
                                : h.taslak
                                  ? 'Taslak — bölüm programını henüz göndermedi. Ayrıntı için tıklayın.'
                                  : h.degisti
                                    ? 'Gönderimden sonra değişti. Ayrıntı için tıklayın.'
                                    : 'Ayrıntı için tıklayın'
                        }
                        style={hucreGorunumu(h)}
                      >
                        {gozetmenCakisanlari(h).length > 0 && (
                          <span
                            data-gozetmen-cakisma
                            style={{
                              position: 'absolute',
                              top: 1,
                              left: 2,
                              fontSize: 8.5,
                              fontWeight: 800,
                              color: '#fff',
                              background: '#EA580C',
                              borderRadius: 3,
                              padding: '0 3px',
                              lineHeight: '12px',
                            }}
                          >
                            ⚠ gözetmen
                          </span>
                        )}
                        {h.otomatik && (
                          <span
                            style={{
                              position: 'absolute',
                              top: 1,
                              right: 2,
                              fontSize: 8.5,
                              fontWeight: 800,
                              color: '#fff',
                              background: '#0F766E',
                              borderRadius: 3,
                              padding: '0 3px',
                              lineHeight: '12px',
                            }}
                          >
                            oto
                          </span>
                        )}
                        {h.metin}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {renkAciklamasiCiz()}
      </div>
    );
  };

  // Tablonun altındaki renk açıklaması (Excel'de de aynısı yazılır).
  const renkAciklamasiCiz = () =>
    kitap && (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px 14px',
          alignItems: 'center',
          fontSize: 12,
          color: '#334155',
          padding: '2px 2px 0',
        }}
      >
        {kitap.renkAciklamasi.map((x) => (
          <span key={x.etiket} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 28,
                height: 14,
                borderRadius: 3,
                background: '#' + x.renk,
                border: '1px solid rgba(0,0,0,.18)',
              }}
            />
            {x.etiket}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 28,
              height: 14,
              borderRadius: 3,
              border: '2px dashed #475569',
              opacity: 0.7,
            }}
          />
          Taslak (bölüm henüz göndermedi)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 28, height: 14, borderRadius: 3, border: '2px dashed #D97706' }} />
          Gönderimden sonra değişti
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 28, height: 14, borderRadius: 3, border: '3px solid #DC2626' }} />
          Aynı salonda çakışma
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 28, height: 14, borderRadius: 3, border: '3px solid #F97316' }} />
          Gözetmen çakışması (aynı kişi aynı saatte iki yerde)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: '#fff',
              background: '#0F766E',
              borderRadius: 3,
              padding: '0 4px',
            }}
          >
            oto
          </span>
          Otomatik yerleşti (kaydedilmedi)
        </span>
      </div>
    );

  const kisaltmaCiz = () => (
    <div style={{ overflow: 'auto', height: '100%' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
        <thead>
          <tr>
            {['#', 'Kısaltma', 'Ad Soyad', 'Sınav Sayısı'].map((x) => (
              <th
                key={x}
                style={{
                  ...hucreStili,
                  fontSize: 12.5,
                  background: '#F1F5F9',
                  padding: '6px 10px',
                }}
              >
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {kitap.kisaltmaSatirlari.map((x, i) => (
            <tr key={x.ad}>
              <td style={{ ...hucreStili, fontSize: 12.5 }}>{i + 1}</td>
              <td style={{ ...hucreStili, fontSize: 12.5, fontWeight: 700 }}>{x.kisaltma}</td>
              <td style={{ ...hucreStili, fontSize: 12.5, textAlign: 'left', padding: '6px 10px' }}>
                {x.ad}
              </td>
              <td style={{ ...hucreStili, fontSize: 12.5 }}>{x.sayi}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
        Kısaltmalar addan otomatik üretilir; &quot;Ayarlar&quot; sekmesinden değiştirilebilir.
        Dersin hocası kendi sınavında &quot;Dersin Öğr. Elemanı&quot; olarak yazılır ve sayılmaz.
      </div>
    </div>
  );

  // ── GÖZETMEN YÜKÜ: çakışmalar + öneri + adalet sayacı ──
  const sureMetni = (dk) => {
    const sa = Math.floor(dk / 60);
    const d = Math.round(dk % 60);
    return (sa ? sa + ' sa ' : '') + (d || !sa ? d + ' dk' : '');
  };
  const yukCiz = () => {
    const D = gozetmenDenetimi;
    const oturumBul = (a) => (kitap ? kitap.oturumlar.find((x) => x.anahtar === a) : null);
    const durumRenk = {
      fazla: { bg: '#FEE2E2', fg: '#B91C1C', yazi: 'Fazla' },
      az: { bg: '#E0F2FE', fg: '#0369A1', yazi: 'Az' },
      dengeli: { bg: '#DCFCE7', fg: '#166534', yazi: 'Dengeli' },
    };
    const th = { ...hucreStili, fontSize: 12, background: '#F1F5F9', padding: '6px 10px' };
    const td = { ...hucreStili, fontSize: 12.5, padding: '5px 10px' };
    return (
      <div
        style={{
          overflow: 'auto',
          height: '100%',
          display: 'grid',
          gap: 16,
          alignContent: 'start',
        }}
      >
        <div data-gozetmen-cakisma-paneli>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#9A3412', marginBottom: 6 }}>
            Gözetmen çakışmaları ({D.liste.length})
          </div>
          {D.liste.length === 0 ? (
            <div style={{ fontSize: 12.5, color: '#166534' }}>
              Aynı saatte iki yerde görevli gözetmen yok.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {D.liste.map((c, i) => {
                // Öneri, çakışmanın SONRAKİ oturumu için: o oturumda kişi
                // yerine o saatte boş ve yükü az biri.
                // Kişinin DERSİN HOCASI olmadığı oturum tercih edilir: hocayı
                // kendi sınavından çıkarmak çözüm değildir.
                const adaylarOt = c.oturumlar.map(oturumBul).filter(Boolean);
                const hocaDegil = adaylarOt.filter(
                  (o) =>
                    !(SF.sinavHocalari(o.uyeler || []) || []).some(
                      (h) =>
                        window.Gozetmen &&
                        window.Gozetmen.adAnahtari(h) === window.Gozetmen.adAnahtari(c.ad)
                    )
                );
                const hedef = hocaDegil[hocaDegil.length - 1] || adaylarOt[adaylarOt.length - 1];
                const oneriler = hedef ? oneriBul(hedef).slice(0, 3) : [];
                return (
                  <div
                    key={i}
                    style={{
                      border: '1px solid #FED7AA',
                      background: '#FFF7ED',
                      borderRadius: 8,
                      padding: '8px 10px',
                      fontSize: 12.5,
                    }}
                  >
                    <div style={{ color: '#7C2D12' }}>
                      <b>{new Date(c.tarih + 'T00:00:00').toLocaleDateString('tr-TR')}</b> ·{' '}
                      {c.mesaj}
                    </div>
                    {yetkili && hedef && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        <span style={{ color: '#64748B' }}>
                          Öneri ({hedef.kodSatiri} oturumunda {c.ad} yerine):
                        </span>
                        {oneriler.length === 0 ? (
                          <span style={{ color: '#B91C1C' }}>o saatte boş gözetmen yok</span>
                        ) : (
                          oneriler.map((x) => (
                            <button
                              key={x.ad}
                              type="button"
                              title={
                                x.gorev +
                                ' görev · ' +
                                sureMetni(x.dakika) +
                                ' — tıklayınca yazılır'
                              }
                              onClick={() => {
                                if (
                                  window.confirm(
                                    hedef.kodSatiri +
                                      ' oturumunda ' +
                                      c.ad +
                                      ' yerine ' +
                                      x.ad +
                                      ' yazılsın mı?'
                                  )
                                )
                                  gozetmenDegistir(hedef, c.ad, x.ad, c.tur === 'iki_salon');
                              }}
                              style={{
                                border: '1px solid #FDBA74',
                                background: '#fff',
                                color: '#9A3412',
                                borderRadius: 999,
                                padding: '2px 10px',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              {x.ad} · {x.gorev} görev
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {dersCakismalari.length > 0 && (
          <div data-ders-cakisma-paneli>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#92400E', marginBottom: 6 }}>
              Ders programıyla çakışmalar ({dersCakismalari.length}) — uyarı
            </div>
            <div style={{ display: 'grid', gap: 4, fontSize: 12.5, color: '#78350F' }}>
              {dersCakismalari.slice(0, 60).map((c, i) => (
                <div key={i}>
                  {new Date(c.sinav.date + 'T00:00:00').toLocaleDateString('tr-TR')} · {c.mesaj}
                </div>
              ))}
              {dersCakismalari.length > 60 && <div>… ve {dersCakismalari.length - 60} daha</div>}
            </div>
          </div>
        )}

        <div data-gozetmen-yuk-paneli>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#0F766E', marginBottom: 4 }}>
            Gözetmen yük sayacı
          </div>
          {D.denge && (
            <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 8 }}>
              Kişi başı ortalama <b>{D.denge.ortalamaGorev.toFixed(1)}</b> görev ·{' '}
              <b>{sureMetni(D.denge.ortalamaDakika)}</b>.{' '}
              <span style={{ color: '#B91C1C', fontWeight: 600 }}>
                {D.denge.fazla.length} kişi fazla
              </span>
              ,{' '}
              <span style={{ color: '#0369A1', fontWeight: 600 }}>{D.denge.az.length} kişi az</span>{' '}
              yüklü (ortalamadan %50&apos;den çok sapma). Otomatik atama yükü az olanı önce seçer;
              başka bölümlerdeki görevler de yüke sayılır.
            </div>
          )}
          <table style={{ borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr>
                {[
                  '#',
                  'Ad Soyad',
                  'Görev',
                  'Toplam süre',
                  'Gün',
                  'En yoğun gün',
                  'Kendi sınavı',
                  'Durum',
                ].map((x) => (
                  <th key={x} style={th}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {D.yukler.map((y, i) => {
                const r = durumRenk[(D.denge && D.denge.durum[y.ad]) || 'dengeli'];
                return (
                  <tr key={y.ad}>
                    <td style={td}>{i + 1}</td>
                    <td style={{ ...td, textAlign: 'left' }}>{y.ad}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{y.gorev}</td>
                    <td style={td}>{sureMetni(y.dakika)}</td>
                    <td style={td}>{y.gunSayisi}</td>
                    <td
                      style={{ ...td, color: y.enYogunGun >= 3 ? '#B91C1C' : undefined }}
                      title={y.enYogunGun >= 3 ? 'Bir günde 3 ya da daha çok görev' : undefined}
                    >
                      {y.enYogunGun}
                    </td>
                    <td style={{ ...td, color: '#64748B' }}>{y.kendiSinavi}</td>
                    <td style={td}>
                      <span
                        style={{
                          padding: '1px 8px',
                          borderRadius: 999,
                          background: r.bg,
                          color: r.fg,
                          fontWeight: 700,
                          fontSize: 11.5,
                        }}
                      >
                        {r.yazi}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
            Sayaç ekrandaki programa göre (gizlenen taslak bölümler hariç) hesaplanır. Dersin
            hocasının kendi sınavı &quot;Kendi sınavı&quot; sütununda ayrı sayılır, adalet hesabına
            girmez.
          </div>
        </div>
      </div>
    );
  };

  const ayarCiz = () => {
    const a = ayarTaslak;
    if (!a) return null;
    const giris = {
      height: 32,
      padding: '0 10px',
      border: '1px solid #CBD5E1',
      borderRadius: 7,
      fontSize: 13,
      background: '#fff',
      boxSizing: 'border-box',
      minWidth: 0,
    };
    const kart = {
      background: '#fff',
      border: '1px solid #E2E8F0',
      borderRadius: 12,
      padding: 16,
      alignSelf: 'start',
      boxShadow: '0 1px 2px rgba(15,23,42,.04)',
    };
    const kartBaslik = (baslik, aciklama, sayi) => (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>{baslik}</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{aciklama}</div>
        </div>
        {sayi != null && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#0F766E',
              background: '#F0FDFA',
              border: '1px solid #99F6E4',
              borderRadius: 999,
              padding: '1px 9px',
            }}
          >
            {sayi}
          </span>
        )}
      </div>
    );
    const silDugmesi = (onClick, etiket) => (
      <button
        type="button"
        onClick={onClick}
        aria-label={etiket}
        title={etiket}
        style={{
          width: 28,
          height: 28,
          border: '1px solid #FECACA',
          background: '#FEF2F2',
          color: '#B91C1C',
          borderRadius: 7,
          cursor: 'pointer',
          fontSize: 15,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    );
    const sutunBaslik = {
      fontSize: 11.5,
      fontWeight: 600,
      color: '#64748B',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    };
    const toplamKapasite = a.salonlar.reduce((t, x) => t + (Number(x.capacity) || 0), 0);
    const kisaltmaAdlari = Object.keys(a.kisaltmalar).sort((x, y) => x.localeCompare(y, 'tr'));
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
            gap: 16,
            padding: 2,
            background: '#F8FAFC',
            borderRadius: 12,
          }}
        >
          <div style={kart}>
            {kartBaslik(
              'Ortak salonlar',
              'Fakülte tablosunun sütunları ve otomatik salon seçimi bu listeden yapılır.',
              a.salonlar.length + ' salon'
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 96px 28px',
                gap: 6,
                alignItems: 'center',
              }}
            >
              <span style={sutunBaslik}>Salon</span>
              <span style={sutunBaslik}>Kapasite</span>
              <span />
              {a.salonlar.map((x, i) => (
                <React.Fragment key={i}>
                  <input
                    value={x.name}
                    placeholder="Ör. M10Z04"
                    aria-label="Salon adı"
                    style={giris}
                    onChange={(e) => {
                      const l = [...a.salonlar];
                      l[i] = { ...l[i], name: e.target.value };
                      setAyarTaslak({ ...a, salonlar: l });
                    }}
                  />
                  <input
                    value={x.capacity}
                    placeholder="—"
                    type="number"
                    min="0"
                    aria-label="Kapasite"
                    style={giris}
                    onChange={(e) => {
                      const l = [...a.salonlar];
                      l[i] = { ...l[i], capacity: e.target.value };
                      setAyarTaslak({ ...a, salonlar: l });
                    }}
                  />
                  {silDugmesi(
                    () => setAyarTaslak({ ...a, salonlar: a.salonlar.filter((_, j) => j !== i) }),
                    (x.name || 'Salon') + ' sil'
                  )}
                </React.Fragment>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 12 }}>
              <button
                type="button"
                onClick={() =>
                  setAyarTaslak({ ...a, salonlar: [...a.salonlar, { name: '', capacity: '' }] })
                }
                style={{
                  border: '1px dashed #5EEAD4',
                  background: '#F0FDFA',
                  color: '#0F766E',
                  borderRadius: 7,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Salon ekle
              </button>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748B' }}>
                Toplam kapasite: <b style={{ color: '#0F172A' }}>{toplamKapasite}</b>
              </span>
            </div>
          </div>

          <div style={kart}>
            {kartBaslik(
              'Bölüm kısa adı ve rengi',
              'Tabloda hücre rengi ve ortak sınav etiketi ("İNŞ-MAK Ortak") buradan gelir.',
              bolumler.length + ' bölüm'
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 78px 44px',
                gap: 6,
                alignItems: 'center',
              }}
            >
              <span style={sutunBaslik}>Bölüm</span>
              <span style={sutunBaslik}>Kısa ad</span>
              <span style={sutunBaslik}>Renk</span>
              {bolumler.map((b) => {
                const v = a.bolumler[b.id] || { kisaAd: '', renk: '#FFFFFF' };
                const yaz = (alan, deger) =>
                  setAyarTaslak({
                    ...a,
                    bolumler: { ...a.bolumler, [b.id]: { ...v, [alan]: deger } },
                  });
                return (
                  <React.Fragment key={b.id}>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          flex: '0 0 auto',
                          minWidth: 38,
                          textAlign: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 5,
                          background: v.renk,
                          border: '1px solid rgba(0,0,0,.12)',
                        }}
                      >
                        {v.kisaAd || '—'}
                      </span>
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {b.name}
                      </span>
                    </span>
                    <input
                      value={v.kisaAd}
                      aria-label={b.name + ' kısa adı'}
                      style={{ ...giris, textAlign: 'center', fontWeight: 600 }}
                      onChange={(e) => yaz('kisaAd', e.target.value.toLocaleUpperCase('tr-TR'))}
                    />
                    <input
                      type="color"
                      value={v.renk}
                      aria-label={b.name + ' rengi'}
                      onChange={(e) => yaz('renk', e.target.value)}
                      style={{
                        width: 44,
                        height: 32,
                        padding: 2,
                        border: '1px solid #CBD5E1',
                        borderRadius: 7,
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    />
                  </React.Fragment>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px dashed #E2E8F0',
                display: 'grid',
                gridTemplateColumns: '1fr 44px',
                gap: 6,
                alignItems: 'center',
              }}
            >
              <span style={sutunBaslik}>Özel sınav renkleri</span>
              <span />
              {[
                ['ortak', 'Ortak ders (birden çok bölüm)'],
                ['osd', 'OSD sınavları (ortak seçmeli)'],
                ['ozd', 'OZD sınavları (ortak zorunlu)'],
              ].map(([k, ad]) => (
                <React.Fragment key={k}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span
                      style={{
                        minWidth: 38,
                        height: 18,
                        borderRadius: 5,
                        background: a.ozelRenkler[k],
                        border: '1px solid rgba(0,0,0,.12)',
                      }}
                    />
                    {ad}
                  </span>
                  <input
                    type="color"
                    value={a.ozelRenkler[k]}
                    aria-label={ad + ' rengi'}
                    onChange={(e) =>
                      setAyarTaslak({
                        ...a,
                        ozelRenkler: { ...a.ozelRenkler, [k]: e.target.value },
                      })
                    }
                    style={{
                      width: 44,
                      height: 32,
                      padding: 2,
                      border: '1px solid #CBD5E1',
                      borderRadius: 7,
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  />
                </React.Fragment>
              ))}
              <span style={{ gridColumn: '1 / -1', fontSize: 11.5, color: '#64748B' }}>
                Öncelik: OSD/OZD rengi → ortak ders rengi → bölüm rengi. Kod OSD ya da OZD ile
                başlayan sınavlar OSD/OZD sayılır.
              </span>
            </div>
          </div>

          <div style={kart}>
            {kartBaslik(
              'Saat çizelgesi',
              'Tablonun satırları. Dilim süresi serbest (ör. 30, 45, 50 dk); öğle arası isteğe bağlı.',
              null
            )}
            {(() => {
              const c = a.cizelge || {};
              const yaz = (alan, deger) =>
                setAyarTaslak({ ...a, cizelge: { ...c, [alan]: deger } });
              const onizleme = SF ? SF.saatDilimleri(c) : [];
              const alan = (etiket, icerik) => (
                <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#64748B' }}>
                  <span style={sutunBaslik}>{etiket}</span>
                  {icerik}
                </label>
              );
              return (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 8,
                    }}
                  >
                    {alan(
                      'Başlangıç',
                      <input
                        type="time"
                        value={c.baslangic || ''}
                        onChange={(e) => yaz('baslangic', e.target.value)}
                        style={giris}
                      />
                    )}
                    {alan(
                      'Bitiş',
                      <input
                        type="time"
                        value={c.bitis || ''}
                        onChange={(e) => yaz('bitis', e.target.value)}
                        style={giris}
                      />
                    )}
                    {alan(
                      'Dilim (dk)',
                      <input
                        type="number"
                        min="5"
                        max="240"
                        value={c.dilim ?? ''}
                        onChange={(e) => yaz('dilim', e.target.value)}
                        style={giris}
                      />
                    )}
                    {alan(
                      'Öğle arası başı',
                      <input
                        type="time"
                        value={c.ogleBaslangic || ''}
                        onChange={(e) => yaz('ogleBaslangic', e.target.value)}
                        style={giris}
                      />
                    )}
                    {alan(
                      'Öğle arası sonu',
                      <input
                        type="time"
                        value={c.ogleBitis || ''}
                        onChange={(e) => yaz('ogleBitis', e.target.value)}
                        style={giris}
                      />
                    )}
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() =>
                          setAyarTaslak({
                            ...a,
                            cizelge: { ...c, ogleBaslangic: '', ogleBitis: '' },
                          })
                        }
                        style={{
                          height: 32,
                          width: '100%',
                          border: '1px solid #CBD5E1',
                          borderRadius: 7,
                          background: '#fff',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        Öğle arası yok
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 11.5,
                      color: '#475569',
                      background: '#F8FAFC',
                      borderRadius: 8,
                      padding: '8px 10px',
                      lineHeight: 1.6,
                    }}
                  >
                    <b>{onizleme.length} satır:</b>{' '}
                    {onizleme
                      .map((d) => (d.ara ? '[Öğle ' + d.etiket + ']' : d.etiket))
                      .join(' · ')}
                  </div>
                </>
              );
            })()}
          </div>

          <div style={kart}>
            {kartBaslik(
              'Gözetmen kısaltmaları',
              'Addan otomatik üretilir (Mehmet Emin ÖZDEMİR → MEÖ); gerekirse değiştirin.',
              kisaltmaAdlari.length + ' kişi'
            )}
            {kisaltmaAdlari.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  color: '#64748B',
                  padding: '18px 12px',
                  textAlign: 'center',
                  background: '#F8FAFC',
                  borderRadius: 8,
                }}
              >
                Bu dönemde henüz gözetmen atanmamış. Bölümler &quot;Salon ve Gözetmen Ata&quot;
                kullandığında kişiler burada listelenir.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 86px',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                <span style={sutunBaslik}>Ad Soyad</span>
                <span style={sutunBaslik}>Kısaltma</span>
                {kisaltmaAdlari.map((ad) => (
                  <React.Fragment key={ad}>
                    <span
                      style={{
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ad}
                    </span>
                    <input
                      value={a.kisaltmalar[ad]}
                      aria-label={ad + ' kısaltması'}
                      style={{ ...giris, textAlign: 'center', fontWeight: 600 }}
                      onChange={(e) =>
                        setAyarTaslak({
                          ...a,
                          kisaltmalar: {
                            ...a.kisaltmalar,
                            [ad]: e.target.value.toLocaleUpperCase('tr-TR'),
                          },
                        })
                      }
                    />
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            background: '#fff',
          }}
        >
          <span style={{ fontSize: 12.5, color: '#64748B', marginRight: 'auto' }}>
            {fakulteAdi} için geçerlidir; kaydedilene kadar tabloya ve Excel&apos;e yansımaz.
          </span>
          <button
            type="button"
            onClick={() => {
              setAyarTaslak(null);
              setSekme('gun:');
            }}
            style={{
              height: 34,
              padding: '0 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#fff',
              color: '#334155',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={ayarKaydet}
            disabled={kaydediliyor}
            style={{
              height: 34,
              padding: '0 16px',
              borderRadius: 8,
              border: 'none',
              background: '#0F766E',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: kaydediliyor ? 'default' : 'pointer',
              opacity: kaydediliyor ? 0.7 : 1,
            }}
          >
            {kaydediliyor ? 'Kaydediliyor…' : 'Ayarları kaydet'}
          </button>
        </div>
      </div>
    );
  };

  const durumCiz = () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {bolumDurumlari.map((x) => {
        const r = FAKULTE_DURUM_RENGI[x.durum];
        const bb = kitap && kitap.bolumBilgisi[x.bolum.id];
        return (
          <div
            key={x.bolum.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 10px',
              borderRadius: 8,
              background: r.bg,
              color: r.fg,
              fontSize: 12.5,
              border: '1px solid rgba(0,0,0,.06)',
            }}
            title={
              x.kayit
                ? (x.kayit.gonderen ? 'Gönderen: ' + x.kayit.gonderen : '') +
                  (x.kayit.iadeNotu ? '\nİade notu: ' + x.kayit.iadeNotu : '')
                : ''
            }
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: '#' + (bb ? bb.renk : 'FFFFFF'),
                border: '1px solid rgba(0,0,0,.2)',
              }}
            />
            <b>{(bb && bb.kisaAd) || x.bolum.id}</b>
            <span>{SF.GONDERIM_ETIKETI[x.durum]}</span>
            <span style={{ opacity: 0.7 }}>· {x.sinavlar.length} sınav</span>
            {yetkili && (x.durum === 'gonderildi' || x.durum === 'degisti') && (
              <button
                type="button"
                onClick={() => iadeEt(x)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#991B1B',
                  cursor: 'pointer',
                  fontSize: 12,
                  textDecoration: 'underline',
                }}
              >
                İade et
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  const aktifGun =
    kitap && sekme.startsWith('gun:')
      ? kitap.gunler.find((g) => 'gun:' + g.tarih === sekme) || kitap.gunler[0] || null
      : null;
  const aktifSekme = aktifGun ? 'gun:' + aktifGun.tarih : sekme;

  const sekmeDugmesi = (anahtar, etiket, ek) => (
    <button
      key={anahtar}
      type="button"
      onClick={() => setSekme(anahtar)}
      style={{
        padding: '6px 12px',
        border: '1px solid #CBD5E1',
        borderTop: aktifSekme === anahtar ? '3px solid #0F766E' : '1px solid #CBD5E1',
        background: aktifSekme === anahtar ? '#fff' : '#F1F5F9',
        color: aktifSekme === anahtar ? '#0F766E' : '#334155',
        fontWeight: aktifSekme === anahtar ? 700 : 500,
        fontSize: 12.5,
        cursor: 'pointer',
        borderRadius: '0 0 6px 6px',
        whiteSpace: 'nowrap',
      }}
    >
      {etiket}
      {ek ? <span style={{ marginLeft: 4, opacity: 0.6 }}>({ek})</span> : null}
    </button>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fakülte sınav programı"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,.55)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: 'min(98vw, 1900px)',
          height: '94vh',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', marginRight: 'auto' }}>
            Fakülte Sınav Programı
            {!(tamYonetici(currentUser) && fakulteler.length > 1) && (
              <span style={{ fontWeight: 500, color: '#64748B', fontSize: 14 }}>
                {' '}
                — {fakulteAdi}
              </span>
            )}
          </div>
          {tamYonetici(currentUser) && fakulteler.length > 1 && (
            <select
              value={fakulte ? fakulte.anahtar : ''}
              onChange={(e) => {
                setFakulteId(e.target.value);
                setSekme('gun:');
                setAyarTaslak(null);
              }}
              aria-label="Fakülte / MYO"
              style={{
                padding: '7px 10px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 13,
                maxWidth: 320,
              }}
            >
              {fakulteler.map((f) => (
                <option key={f.anahtar} value={f.anahtar}>
                  {f.ad}
                  {f.bolumSayisi ? ' (' + f.bolumSayisi + ' bölüm)' : ''}
                </option>
              ))}
            </select>
          )}
          <div
            title="Şu anki sınav dönemi: bugünü kapsayan, yoksa en yakın dönem"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 12px',
              borderRadius: 8,
              background: '#F0FDFA',
              border: '1px solid #99F6E4',
              fontSize: 13,
              color: '#115E59',
            }}
          >
            <b>{grup ? grup.etiket : 'Açık sınav dönemi yok'}</b>
            {grup && grup.bas && (
              <span style={{ color: '#0F766E' }}>
                {formatDate(parseDateISO(grup.bas))}
                {grup.bit ? ' – ' + formatDate(parseDateISO(grup.bit)) : ''}
              </span>
            )}
            {grup && (
              <span
                style={{
                  background: '#fff',
                  border: '1px solid #99F6E4',
                  borderRadius: 999,
                  padding: '1px 9px',
                  fontWeight: 700,
                }}
              >
                {gonderenSayisi} / {programliBolumSayisi} bölüm gönderdi
              </span>
            )}
          </div>
          <label
            title="Programını henüz göndermemiş bölümlerin sınavlarını da tabloda göster"
            style={{
              fontSize: 13,
              color: '#334155',
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <input
              type="checkbox"
              checked={taslakDahil}
              onChange={(e) => setTaslakDahil(e.target.checked)}
            />
            Taslakları göster
          </label>
          {yetkili && <GhostBtn onClick={ayarAc}>Ayarlar</GhostBtn>}
          {yetkili && otomatikYerlesenler.length > 0 && (
            <button
              type="button"
              onClick={yerlesimiKaydet}
              title="Salonu/gözetmeni girilmemiş sınavlar bölümün otomatik atama kuralıyla yerleştirildi (tabloda 'oto'). Kaydetmek için tıklayın."
              style={{
                height: 34,
                padding: '0 10px',
                border: '1px solid #0F766E',
                borderRadius: 8,
                background: '#F0FDFA',
                color: '#0F766E',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Yerleşimi kaydet ({otomatikYerlesenler.length})
            </button>
          )}
          <Btn
            onClick={() => excel(false)}
            disabled={!kitap || kitap.gunler.length === 0}
            title="Yalnız fakülteye gönderilmiş programlar"
          >
            Excel indir
          </Btn>
          <button
            type="button"
            data-gozetmen-ciktisi
            onClick={gozetmenCiktisi}
            disabled={!kitap || kitap.oturumlar.length === 0}
            title="Yalnız gözetmenler, görev tarih/saatleri ve atandıkları salonlar (ekrandaki program)"
            style={{
              height: 34,
              padding: '0 10px',
              border: '1px solid #0F766E',
              borderRadius: 8,
              background: '#fff',
              color: '#0F766E',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Gözetmen çıktısı
          </button>
          <button
            type="button"
            onClick={() => excel(true)}
            disabled={!kitap || kitap.gunler.length === 0}
            title="Göndermemiş bölümlerin taslakları da (kesik çizgili) dahil"
            style={{
              height: 34,
              padding: '0 10px',
              border: '1px dashed #64748B',
              borderRadius: 8,
              background: '#fff',
              color: '#334155',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Taslak dahil
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            title="Kapat (Esc)"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#fff',
              color: '#334155',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {!veri || !SF ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>Yükleniyor…</div>
        ) : (
          <>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #F1F5F9' }}>
              {durumCiz()}
              {oneriler.length > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    border: '1px solid #FDE68A',
                    background: '#FFFBEB',
                    borderRadius: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOnerilerAcik((v) => !v)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      padding: '8px 12px',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#92400E',
                      cursor: 'pointer',
                    }}
                  >
                    {onerilerAcik ? '▼' : '▶'} {oneriler.length} birleştirme önerisi — aynı ders ya
                    da aynı öğretim elemanı, aynı saatte, farklı bölümlerde ayrı girilmiş
                  </button>
                  {onerilerAcik && (
                    <div
                      style={{
                        padding: '0 12px 10px',
                        display: 'grid',
                        gap: 6,
                        maxHeight: 220,
                        overflow: 'auto',
                      }}
                    >
                      {oneriler.map((o) => (
                        <div
                          key={o.anahtar}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            background: '#fff',
                            border: '1px solid #FDE68A',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 12.5,
                          }}
                        >
                          <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {formatDate(parseDateISO(o.date))} {o.timeSlot}
                          </span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            {o.sinavlar
                              .map(
                                (x) =>
                                  x.code +
                                  ' (' +
                                  ((kitap && kitap.bolumBilgisi[x.departmentId]?.kisaAd) ||
                                    x.departmentId) +
                                  ', ' +
                                  (x.studentCount || 0) +
                                  ' öğr.)'
                              )
                              .join(' + ')}
                            <span style={{ color: '#92400E' }}> · {o.neden}</span>
                          </span>
                          {yetkili && (
                            <button
                              type="button"
                              onClick={() => birlestir(o.sinavlar)}
                              style={{
                                border: 'none',
                                background: '#D97706',
                                color: '#fff',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 700,
                                padding: '4px 10px',
                                cursor: 'pointer',
                              }}
                            >
                              Birleştir
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minHeight: 0, padding: '10px 16px', overflow: 'hidden' }}>
              {sekme === 'ayar' && ayarCiz()}
              {sekme === 'kisaltma' && kitap && kisaltmaCiz()}
              {sekme === 'yuk' && kitap && yukCiz()}
              {sekme.startsWith('gun:') &&
                (aktifGun ? (
                  tabloCiz(aktifGun)
                ) : (
                  <div style={{ padding: 50, textAlign: 'center', color: '#94A3B8' }}>
                    {grup
                      ? 'Bu dönemde gösterilecek sınav yok' +
                        (taslakDahil ? '.' : ' (yalnız gönderen bölümler gösteriliyor).')
                      : 'Fakültenin bölümlerinde açılmış sınav dönemi yok.'}
                  </div>
                ))}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 2,
                padding: '0 16px 10px',
                overflowX: 'auto',
                borderTop: '1px solid #E2E8F0',
                background: '#F8FAFC',
              }}
            >
              {kitap && sekmeDugmesi('kisaltma', 'Kısaltmalar')}
              {kitap &&
                sekmeDugmesi(
                  'yuk',
                  gozetmenDenetimi.liste.length > 0 ? '⚠ Gözetmen Yükü' : 'Gözetmen Yükü',
                  gozetmenDenetimi.liste.length || null
                )}
              {kitap &&
                kitap.gunler.map((g) =>
                  sekmeDugmesi(
                    'gun:' + g.tarih,
                    // Salonda örtüşen oturum varsa sekme işaretlenir.
                    (g.tablo.satirlar.some((r) => r.hucreler.some((h) => h && h.cakisma))
                      ? '⚠ '
                      : '') +
                      g.kisa +
                      ' ' +
                      g.kisaGun,
                    g.oturumSayisi || null
                  )
                )}
              {yetkili && ayarTaslak && sekmeDugmesi('ayar', 'Ayarlar')}
            </div>
          </>
        )}
      </div>

      {secilen && (
        <div
          onMouseDown={(e) => e.target === e.currentTarget && setSecilen(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1001,
            background: 'rgba(15,23,42,.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 20,
              width: 'min(640px, 94vw)',
              maxHeight: '86vh',
              overflow: 'auto',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>
              {secilen.salon} · {secilen.saat}
            </div>
            {secilen.hucre.cakisma && (
              <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>
                Bu salonda aynı saatte birden çok oturum var.
              </div>
            )}
            {secilen.hucre.oturumlar.map((o) => (
              <OturumDuzenle
                key={o.anahtar + o.date + o.timeSlot}
                oturum={o}
                yetkili={yetkili}
                bolumBilgisi={kitap.bolumBilgisi}
                salonSecenekleri={salonSecenekleri}
                gozetmenSecenekleri={gozetmenSecenekleri}
                gunSecenekleri={gunSecenekleri}
                saatSecenekleri={saatSecenekleri}
                ayniSaattekiler={kitap.oturumlar.filter(
                  (x) =>
                    x.anahtar !== o.anahtar &&
                    window.SinavBirlesim &&
                    window.SinavBirlesim.zamanOrtusur(
                      { date: x.date, timeSlot: x.timeSlot, duration: x.sure },
                      { date: o.date, timeSlot: o.timeSlot, duration: o.sure }
                    )
                )}
                onKaydet={oturumKaydet}
                kisiUyarisi={kisiUyarisi}
                oneriBul={oneriBul}
                salonKontrol={(o, d) =>
                  salonEngeli(
                    o.uyeler.map((u) => ({
                      collection: 'sinav_programi',
                      type: 'update',
                      docId: u.id,
                      data: { date: d.date, timeSlot: d.timeSlot, room: d.room },
                    }))
                  )
                }
                onAyir={ayir}
                onBirlestir={(a, b) =>
                  birlestir([...a.uyeler, ...b.uyeler], { date: a.date, timeSlot: a.timeSlot })
                }
              />
            ))}
            <div style={{ marginTop: 14, textAlign: 'right' }}>
              <GhostBtn onClick={() => setSecilen(null)}>Kapat</GhostBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
  const isAdmin = tamYonetici(currentUser);
  // Bölüm yetkilisi: ayrı yetkili girişi (role) ya da akademisyen kaydındaki
  // bölüm yetkilisi işareti (uygulamanın geri kalanıyla aynı kural). Yetki
  // YALNIZ kendi bölümünde geçerlidir; ek bölümünde ders veren yetkili orada
  // sade akademisyen kurallarıyla çalışır (bkz. aşağıda isDeptManager).
  const bolumYetkilisiRolu =
    currentUser?.role === 'bolum_yetkilisi' || !!currentUser?.isDeptManager;
  const bolumAdiBul = (id) =>
    ((window.DEPARTMENTS || []).find((d) => d.id === id) || {}).name || '';
  const kendiBolumuMu = (id) => {
    const ana = currentUser?.departmentId;
    if (!id || !ana) return false;
    const kimlikler = window.bolumKimlikleri ? window.bolumKimlikleri(ana) : [String(ana)];
    if (kimlikler.includes(String(id))) return true;
    const ad = currentUser?.departmentName;
    const d = (window.DEPARTMENTS || []).find((x) => x.id === id);
    return !!(ad && d && d.name === ad);
  };
  // Fakülte / üniversite yetkilisi modülde TAM yetkilidir: fakültesindeki
  // bölümlerin programını düzenler, salon/gözetmen atar, birleştirir, iade
  // eder. Akademisyen girişiyle gelse de "sade akademisyen" kısıtları uygulanmaz.
  // Fakülte yetkilisinin fakülte kimliği yoksa alanı belirsizdir: sade
  // akademisyen kurallarıyla çalışır (bütün üniversiteyi görmesin).
  const fakulteSinirli =
    !!currentUser?.isFacultyManager &&
    !!currentUser?.facultyId &&
    !isAdmin &&
    !currentUser?.isUniversityAdmin;
  const fakulteYetkili = isAdmin || !!currentUser?.isUniversityAdmin || fakulteSinirli;

  // Department State - activeDepartment prop ile senkronize
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(
    activeDepartment || currentUser?.departmentId || null
  );
  // Fakülte yetkilisi yalnız KENDİ fakültesinin bölümlerinde yetkilidir;
  // seçili bölüm fakültesi dışındaysa (ör. üst menüden) sade akademisyen sayılır.
  // Fakülte yetkilisinin kendi bölümü fakültesi dışında kayıtlı olsa da
  // kendi alanıdır (sunucu da öyle sayıyor: server/lib/yetki-alani.js).
  const bolumYetkiAlaninda =
    !fakulteSinirli ||
    departments.some((d) => d.id === selectedDeptId) ||
    kendiBolumuMu(selectedDeptId);
  const yonetimYetkisi = fakulteYetkili && bolumYetkiAlaninda;
  const isDeptManager = bolumYetkilisiRolu && kendiBolumuMu(selectedDeptId);
  const canManage = isAdmin || isDeptManager || yonetimYetkisi;
  // Yönetim yetkisi olmayan herkes yalnız kendi dersinin sınavını düzenler
  // (akademisyen); başka bir rol (ör. modül atanmış memur) salt okur.
  const isProfessor = akademisyenMi(currentUser) && !canManage;
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
  // Ortak öğrenci denetimi için dönem ders seçimleri, öğrenci kayıtları ve
  // bütün dersler (lib/sinav-cakisma.js → ortakOgrenciSayaci).
  const [ogrenciVerisi, setOgrenciVerisi] = useState(null);
  const [cakismaPaneli, setCakismaPaneli] = useState(false);
  // Gözetmen kuralları (hoca + salon başına gözetmen) — bölüm kaydında durur.
  const [gozetmenKuralAcik, setGozetmenKuralAcik] = useState(false);
  const [kabulEdilen, setKabulEdilen] = useState(null); // şartlı kabul modalı
  // ── Fakülte programı ──
  // Fakülte ayarı (ortak salonlar, bölüm kısa ad/renk, kısaltmalar) ve
  // bölümlerin programı fakülteye gönderme kayıtları (lib/sinav-fakulte.js).
  const [fakulteAyarlari, setFakulteAyarlari] = useState([]);
  const [gonderimler, setGonderimler] = useState([]);
  const [fakultePenceresi, setFakultePenceresi] = useState(false);
  // Fakülte yetkilisi için fakültedeki bütün bölümlerin gözetmenleri.
  // Bölümün fakültesindeki araştırma görevlileri (gözetmen seçenekleri).
  const [arastirmaGorevlileri, setArastirmaGorevlileri] = useState([]);
  const [tumAkademisyenler, setTumAkademisyenler] = useState([]);

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
  // (Fakülte çizelgesinden 18:00 ve sonrasına alınmış lisans sınavı varsa
  // akşam satırları lisansta da açılır; yoksa sınav takvimde görünmüyordu.)
  const aksamSinaviVar = placedExams.some((e) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(e.timeSlot || ''));
    return !!m && Number(m[1]) * 60 + Number(m[2]) >= 18 * 60;
  });
  const visibleTimeSlots =
    seviye === 'lisans' && !aksamSinaviVar
      ? TIME_SLOTS.slice(0, LISANS_TIME_SLOT_COUNT)
      : TIME_SLOTS;
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
      // Akademisyen kayıtları SİLİNMEZ (şifre, yetki, gözetmenlik bilgisi
      // taşırlar): yalnız bölümde aynı adla olmayan örnek kayıtlar eklenir.
      const existingProfs = await pRef.where('departmentId', '==', selectedDeptId).get();
      const mevcutAdlar = new Set(
        existingProfs.docs.map((d) => String((d.data() || {}).name || '').trim())
      );
      for (const prof of SEED_PROFESSORS) {
        if (mevcutAdlar.has(String(prof.name || '').trim())) continue;
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

        // Bölüm yetkilisi girişi için: sadece kendi bölümünü göster (fakülte
        // yetkilisi de olan kişi fakültenin bütün bölümlerini görür).
        // (Akademisyen girişli bölüm yetkilisi ders verdiği bölümleri de görür:
        // aşağıdaki akademisyen dalı kendi bölümünü de ekler.)
        if (
          currentUser?.role === 'bolum_yetkilisi' &&
          currentUser?.baseRole !== 'professor' &&
          !fakulteYetkili &&
          currentUser?.departmentId
        ) {
          const userDeptId = currentUser.departmentId;
          const userDeptName = currentUser.departmentName;
          depts = depts.filter(
            (d) => d.id === userDeptId || (userDeptName && d.name === userDeptName)
          );
        }

        // Fakülte yetkilisi (üniversite yetkilisi değilse): fakültesinin bölümleri.
        // Fakülte slug ('muhendislik') ya da veritabanı kimliğiyle anılabilir;
        // aynı birimin bütün kimlikleri fakulteListesi ile çözülür.
        if (fakulteSinirli) {
          const SFk = window.SinavFakulte;
          const gomulu = (window.DEPARTMENTS || []).map((d) => ({
            ...d,
            facultyId: d.facultyId || 'muhendislik',
          }));
          const fakKayitlari = await window.apiRead('faculties').catch(() => []);
          const birim = SFk
            ? SFk.fakulteListesi(fakKayitlari || [], gomulu).find((f) =>
                f.kimlikler.includes(String(currentUser.facultyId))
              )
            : null;
          const kimlikler = new Set(birim ? birim.kimlikler : [String(currentUser.facultyId)]);
          depts = depts.filter((d) => {
            const g = gomulu.find((x) => x.id === d.id);
            return (
              kimlikler.has(String(d.facultyId || '')) ||
              (g && kimlikler.has(String(g.facultyId))) ||
              kendiBolumuMu(d.id)
            );
          });
        }

        // Akademisyen için: derslerinin olduğu bölümleri bul
        if (akademisyenMi(currentUser) && !fakulteYetkili && currentUser?.name) {
          // Ad birebir aranmaz (unvan/harf farkı, çok hocalı dersler): bütün
          // dersler okunup "hocalarından biri mi" kuralıyla süzülür.
          const cRef = getCoursesRef();
          if (cRef) {
            const coursesSnap = await cRef.get();
            const f = window.dersEgitmeniMi;
            const profDeptIds = new Set();
            coursesSnap.docs.forEach((d) => {
              const c = d.data();
              const benim = f ? f(c, currentUser.name) : c.professor === currentUser.name;
              if (benim && c.departmentId) profDeptIds.add(c.departmentId);
            });
            // Bölüm yetkilisi işaretli akademisyen kendi bölümünü de görür.
            if (bolumYetkilisiRolu)
              depts.filter((d) => kendiBolumuMu(d.id)).forEach((d) => profDeptIds.add(d.id));
            depts = depts.filter((d) =>
              [...profDeptIds].some((b) => ayniBolumMu(d.id, b) || ayniBolumMu(d.docId, b))
            );
          }
        }

        setDepartments(depts);
        // Auto-select for department manager
        if (bolumYetkilisiRolu && !fakulteYetkili && currentUser?.departmentId) {
          // Eşleştirilmiş bölüm varsa onun ID'sini kullan
          const matchedDept = depts.find(
            (d) => d.id === currentUser.departmentId || d.name === currentUser.departmentName
          );
          // Kabukta ders verdiği başka bir bölüm seçiliyse o korunur.
          setSelectedDeptId(
            activeDepartment && depts.some((d) => d.id === activeDepartment)
              ? activeDepartment
              : matchedDept
                ? matchedDept.id
                : currentUser.departmentId
          );
        } else if (
          akademisyenMi(currentUser) &&
          !fakulteYetkili &&
          depts.length > 0 &&
          (!selectedDeptId || !depts.some((d) => d.id === selectedDeptId))
        ) {
          // Akademisyenin kendi bölümü (ör. Matematik) dersini verdiği bölümden
          // (Bilgisayar) farklı olabilir: dersi olan bir bölüm seçilir.
          setSelectedDeptId(
            activeDepartment && depts.some((d) => d.id === activeDepartment)
              ? activeDepartment
              : depts[0].id
          );
        } else if (
          fakulteYetkili &&
          depts.length > 0 &&
          (!selectedDeptId || (fakulteSinirli && !depts.some((d) => d.id === selectedDeptId)))
        ) {
          // Seçili bölüm fakültenin dışındaysa fakültenin bir bölümüne geçilir.
          setSelectedDeptId(
            activeDepartment && depts.some((d) => d.id === activeDepartment)
              ? activeDepartment
              : depts[0].id
          );
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
  // Bölümün fakültesindeki bölümler ({ fakulte, tum }; kimlik biçimleriyle).
  // Çözülemezse null: süzgeç uygulanmaz (bugünkü davranış).
  const bolumunFakulteBolumleri = async (deptId) => {
    try {
      if (!SF) return null;
      const [db, fakKayit] = await Promise.all([
        window.apiRead('departments').catch(() => []),
        window.apiRead('faculties').catch(() => []),
      ]);
      const gomulu = (window.DEPARTMENTS || []).map((d) => ({
        ...d,
        facultyId: d.facultyId || 'muhendislik',
      }));
      const tum = [...(db || []), ...gomulu].map((d) => {
        const id = String(d._docId || d.id || d._id || '');
        return {
          id,
          name: d.name,
          facultyId: String(d.facultyId || '') || 'muhendislik',
          kimlikler: [
            ...new Set(
              [
                id,
                String(d.id || ''),
                ...(window.bolumKimlikleri ? window.bolumKimlikleri(id) : []),
              ].filter(Boolean)
            ),
          ],
        };
      });
      const secili = tum.find((d) => d.kimlikler.includes(String(deptId)));
      if (!secili) return null;
      const birim = SF.fakulteListesi(fakKayit || [], gomulu).find((f) =>
        f.kimlikler.includes(String(secili.facultyId))
      );
      const fakSet = new Set(birim ? birim.kimlikler : [secili.facultyId]);
      return { fakulte: tum.filter((d) => fakSet.has(d.facultyId)), tum };
    } catch (_) {
      return null;
    }
  };
  const bolumGozetmenleriniOku = async (deptId) => {
    if (!deptId) return [];
    const G = window.Gozetmen || {};
    const bolumler = window.DEPARTMENTS || [];
    const bolumAdi =
      (departments.find((d) => d.id === deptId) || bolumler.find((d) => d.id === deptId) || {})
        .name || '';
    const hepsi = (await window.apiRead('professors')) || [];
    // Fakülte görünümüyle AYNI havuz: ana bölümü başka fakültede olan kişi
    // (eski 'gozetmen' rolü ya da ek bölüm üzerinden) bölümün gözetmeni
    // sayılmaz; o kişi yalnız kendi dersinin hocası olarak girer.
    const fakulteBolumleri = await bolumunFakulteBolumleri(deptId);
    return hepsi
      .filter(
        (p) =>
          (G.bolumGozetmeniMi
            ? G.bolumGozetmeniMi(p, deptId, bolumler, bolumAdi)
            : (p.roles || []).includes('gozetmen')) &&
          (!fakulteBolumleri ||
            !SF ||
            SF.fakulteAkademisyeniMi(p, fakulteBolumleri.fakulte, fakulteBolumleri.tum))
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
          sinavSalonlari(snap.docs.map((d) => ({ id: d.id, ...d.data() }))).sort(
            (a, b) => (a.capacity || 0) - (b.capacity || 0)
          )
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
  // Fakülte yetkilisi (ya da başka kullanıcı) bu bölümün sınavlarını
  // değiştirdiğinde açık takvim de tazelenir: yalnız fakülte geneli denetim
  // listesi tazelenip bölümün kendi takvimi bayat kalıyordu.
  const seciliBolumRef = _useRef(selectedDeptId);
  seciliBolumRef.current = selectedDeptId;
  const loadFakulteGeneli = useCallback(async () => {
    try {
      // Sınavlar strict okunur: okuma hatasında eski liste korunur (apiRead
      // hata olunca [] döndürüyor; takvim ve çakışma denetimi boşalıyordu).
      const okuSiki = window.apiRead.strict || window.apiRead;
      const [sinavlar, salonlar, kabuller, ayarlar, gonderimKayitlari] = await Promise.all([
        okuSiki('sinav_programi').catch(() => null),
        window.apiRead('department_classrooms').catch(() => []),
        window.apiRead('sinav_cakisma_kabul').catch(() => []),
        window.apiRead('sinav_fakulte_ayarlari').catch(() => []),
        window.apiRead('sinav_gonderimleri').catch(() => []),
      ]);
      if (Array.isArray(sinavlar)) setTumSinavlar(sinavlar);
      const bolum = seciliBolumRef.current;
      if (Array.isArray(sinavlar) && bolum) {
        setPlacedExams(
          sinavlar
            .filter((e) => e && e.departmentId === bolum && (e.seviye || 'lisans') === seviye)
            .map((e) => ({ ...e, id: e.id || e._docId }))
        );
      }
      setTumSalonlar(Array.isArray(salonlar) ? salonlar : []);
      setCakismaKabulleri(Array.isArray(kabuller) ? kabuller : []);
      setFakulteAyarlari(Array.isArray(ayarlar) ? ayarlar : []);
      setGonderimler(Array.isArray(gonderimKayitlari) ? gonderimKayitlari : []);
    } catch (e) {
      console.warn('Fakülte geneli veri okunamadı:', e && e.message);
    }
  }, []);

  // Art arda gelen tetikler (her yazım herkese "realtime" olayı yayar) tek
  // okumada toplanır: her olayda bütün koleksiyonları yeniden okumak yük.
  const tazeleZamanlayici = _useRef(null);
  const fakulteGeneliTazele = useCallback(() => {
    clearTimeout(tazeleZamanlayici.current);
    tazeleZamanlayici.current = setTimeout(() => loadFakulteGeneli(), 700);
  }, [loadFakulteGeneli]);
  useEffect(() => () => clearTimeout(tazeleZamanlayici.current), []);

  useEffect(() => {
    fakulteGeneliTazele();
  }, [fakulteGeneliTazele, placedExams.length]);

  // ── Anlık güncelleme ──
  // Başka bölüm sınav yerleştirdiğinde ya da bir çakışmayı kabul ettiğinde
  // denetim sayfa yenilenmeden güncellenir.
  useEffect(() => {
    const h = () => fakulteGeneliTazele();
    const c = [
      'sinav_programi',
      'sinav_cakisma_kabul',
      'sinav_gonderimleri',
      'sinav_fakulte_ayarlari',
    ];
    c.forEach((x) => window.addEventListener('realtime:' + x, h));
    return () => c.forEach((x) => window.removeEventListener('realtime:' + x, h));
  }, [fakulteGeneliTazele]);

  // Ortak öğrenci verisi bir kez okunur (ders seçimleri sınav hazırlığı
  // sırasında pek değişmez); okunamazsa ortak öğrenci denetimi atlanır.
  useEffect(() => {
    let iptal = false;
    Promise.all([
      window.apiRead('student_courses').catch(() => []),
      window.apiRead('students').catch(() => []),
      window.apiRead('sinav_dersler').catch(() => []),
    ]).then(([donemKayitlari, ogrenciKayitlari, dersler]) => {
      if (iptal) return;
      setOgrenciVerisi({
        donemKayitlari: Array.isArray(donemKayitlari) ? donemKayitlari : [],
        ogrenciKayitlari: Array.isArray(ogrenciKayitlari) ? ogrenciKayitlari : [],
        dersler: Array.isArray(dersler) ? dersler : [],
      });
    });
    return () => {
      iptal = true;
    };
  }, []);

  // ── Resmî çıktı kapısı ──
  // Engel varsa çıktı üretilmez: fiziksel imkânsızlık taşıyan bir program
  // dekanlığa gönderilmemeli. Karar bekleyen uyarı varsa da tutulur —
  // yetkili ya düzeltir ya şartlı kabul eder; "görmezden gel" seçeneği yok.
  // ⚠ Çıktıdan hemen önce bütün bölümlerin sınavları ve kabuller YENİDEN
  // okunur: başka bölümün son yerleştirmesi kaçmasın.
  const cikisIzniVar = async () => {
    let tazeHazir;
    try {
      if (window.apiInvalidate) {
        window.apiInvalidate('sinav_programi');
        window.apiInvalidate('sinav_cakisma_kabul');
      }
      // strict: okuma hatası "çakışma yok" sayılmasın (apiRead hata olunca []
      // döndürür; resmî çıktı kapısı boş listeyle geçiyordu).
      const oku = window.apiRead.strict || window.apiRead;
      const [sinavlar, kabuller] = await Promise.all([
        oku('sinav_programi'),
        oku('sinav_cakisma_kabul'),
      ]);
      const taze = Array.isArray(sinavlar) ? sinavlar : [];
      const tazeKabul = Array.isArray(kabuller) ? kabuller : [];
      setTumSinavlar(taze);
      setCakismaKabulleri(tazeKabul);
      // Kapı yalnız BU bölümün sınavlarını ilgilendiren çakışmalara bakar:
      // başka bölümün düzeltemeyeceğiniz sorunu sizin çıktınızı durdurmasın.
      const liste = cakismaHesapla(denetimListesi(taze), tazeKabul, donemGunleri).filter((c) =>
        (c.sinavlar || []).some((x) => x && ayniBolumMu(x.departmentId, selectedDeptId))
      );
      tazeHazir = window.sinavProgramHazirMi ? window.sinavProgramHazirMi(liste) : true;
      if (!tazeHazir) {
        const o = window.sinavCakismaOzeti(liste);
        setCakismaPaneli(true);
        alert(
          o.engel > 0
            ? o.engel +
                ' çakışma fiziksel olarak imkânsız. Bunlar düzeltilmeden resmî çıktı alınamaz.\n\nÇakışma panelini açtım.'
            : o.bekleyen +
                ' çakışma karar bekliyor (diğer bölümlerin son durumu dahil). Her birini ya düzeltin ya da sebebini yazarak şartlı kabul edin.\n\nÇakışma panelini açtım.'
        );
        return false;
      }
      return true;
    } catch (e) {
      // Bütün bölümlerin son durumu okunamadıysa çakışma denetimi yapılamaz:
      // resmî çıktı/gönderim durdurulur (eksik veriyle "çakışma yok" denmesin).
      alert(
        'Fakülte geneli sınav verisi okunamadı (' +
          ((e && e.message) || 'bağlantı hatası') +
          '). Çakışma denetimi yapılamadığı için işlem durduruldu; biraz sonra tekrar deneyin.'
      );
      return false;
    }
  };

  // Şartlı kabul — sebep zorunlu, kim/ne zaman kayda geçer.
  const cakismayiKabulEt = async (cakisma, sebep) => {
    const k = window.sinavKabulKaydi(cakisma, sebep, currentUser);
    if (!k.olur) {
      alert(k.sebep);
      return false;
    }
    try {
      // Belge kimliği güvenli özet (anahtarda "|" ve ad var); anahtar kayıtta.
      await DBWrite.set('sinav_cakisma_kabul', k.kayit.kimlik, k.kayit, true);
      if (window.apiInvalidate) window.apiInvalidate('sinav_cakisma_kabul');
      await loadFakulteGeneli();
      return true;
    } catch (e) {
      alert('Kabul kaydedilemedi: ' + (e.message || ''));
      return false;
    }
  };

  // Çakışan iki sınavı ortak sınav yap (ör. aynı hocanın aynı saatteki iki
  // dersi — Matematik'teki gibi tek oturum). Oturumların diğer üyeleri de
  // dahil edilir; hepsi ilk sınavın gün/saatine alınır, salon ve gözetmenler
  // birleşir. Yetki: bölüm yetkilisi (kendi bölümünün sınavları), fakülte
  // yetkilisi, ya da bütün sınavların hocası olan akademisyen.
  const cakismaYamalari = (c) =>
    SF && window.SinavBirlesim
      ? SF.birlestirmeYamalari(c.sinavlar, window.SinavBirlesim.yeniBirlesimId(), {
          tumSinavlar: denetimListesi(tumSinavlar),
          date: c.sinavlar[0].date,
          timeSlot: c.sinavlar[0].timeSlot,
        })
      : [];
  // Değişecek HER sınav (oturumların diğer üyeleri dahil) yazanın alanında
  // olmalı: fakülte yetkilisi fakültesinin bölümleri, bölüm yetkilisi kendi
  // bölümü, akademisyen yalnız kendi dersleri.
  // Gönderim kaydı bölüm kimliğinin bütün biçimleriyle (slug / veritabanı
  // kimliği) aranır: sunucu kilidi de böyle arıyor (server/routes/db.js).
  const gonderimKaydiBulV = (bolumId, grup) => {
    if (!SF || !bolumId || !grup) return null;
    const v = window.bolumKimlikleri ? window.bolumKimlikleri(String(bolumId)) : [];
    for (const b of [String(bolumId), ...v]) {
      const k = SF.gonderimKaydiBul(gonderimler, b, grup);
      if (k) return k;
    }
    return null;
  };
  // Sınavın bölümü o dönem grubunu fakülteye göndermişse bölüm tarafı onu
  // yazamaz (fakülte/üniversite yetkilisi hariç). Ortak oturumun BAŞKA
  // bölümdeki üyesi için de geçerli: yazım yarıda kalmasın diye işlemden
  // ÖNCE sorulur.
  const sinavKilitli = (e) => {
    if (!e || !SF || isAdmin || currentUser?.isUniversityAdmin || yonetimYetkisi) return false;
    const donem = periods.find((p) => p.id === e.periodId) || activePeriod;
    if (!donem) return false;
    const k = gonderimKaydiBulV(e.departmentId || selectedDeptId, SF.donemGrubu(donem));
    return !!k && k.durum === 'gonderildi';
  };
  const sinavYazilabilir = (e) => {
    if (!e) return false;
    if (sinavKilitli(e)) return false;
    if (isAdmin || currentUser?.isUniversityAdmin) return true;
    if (yonetimYetkisi)
      return (
        departments.some(
          (d) => ayniBolumMu(d.id, e.departmentId) || ayniBolumMu(d.docId, e.departmentId)
        ) || kendiDersiMi(e)
      );
    // Bölüm yetkilisi başka bölümdeki KENDİ dersinin sınavını da yazar
    // (sunucu akademisyen kuralıyla izin veriyor).
    if (canManage) return ayniBolumMu(e.departmentId, selectedDeptId) || kendiDersiMi(e);
    return kendiDersiMi(e);
  };
  // Şartlı kabul: sunucu, çakışan bölümlerden en az biri yazanın alanında
  // değilse reddeder; düğme de yalnız o durumda görünür.
  const kabulYetkisi = (c) =>
    !!(
      canManage &&
      c &&
      c.kabulEdilebilir &&
      Array.isArray(c.sinavlar) &&
      c.sinavlar.some(
        (x) =>
          x &&
          (isAdmin ||
            currentUser?.isUniversityAdmin ||
            (yonetimYetkisi
              ? departments.some((d) => ayniBolumMu(d.id, x.departmentId))
              : ayniBolumMu(x.departmentId, selectedDeptId)))
      )
    );
  const cakismaBirlestirilebilir = (c) => {
    if (!c || !Array.isArray(c.sinavlar) || c.sinavlar.length !== 2) return false;
    if (c.tur !== 'hoca' && c.tur !== 'sinif') return false;
    const tum = denetimListesi(tumSinavlar);
    const yamalar = cakismaYamalari(c);
    return (
      yamalar.length > 0 && yamalar.every((y) => sinavYazilabilir(tum.find((e) => e.id === y.id)))
    );
  };
  const cakismayiBirlestir = async (c) => {
    if (kilitliyse()) return;
    if (!cakismaBirlestirilebilir(c)) return;
    const [a] = c.sinavlar;
    const tum = denetimListesi(tumSinavlar);
    const yamalar = cakismaYamalari(c);
    const kodlar = [
      ...new Set(yamalar.map((y) => (tum.find((e) => e.id === y.id) || {}).code)),
    ].filter(Boolean);
    if (
      !window.confirm(
        kodlar.join(' + ') +
          ' ortak sınav olacak: hepsi ' +
          a.date +
          ' ' +
          a.timeSlot +
          ' başlangıcında, aynı salon(lar)da yapılır; salon ve gözetmenler birleşir.\n\nDevam edilsin mi?'
      )
    )
      return;
    try {
      for (const y of yamalar) await DBWrite.update('sinav_programi', y.id, y.data);
      const h = new Map(yamalar.map((y) => [y.id, y.data]));
      setPlacedExams((prev) => prev.map((e) => (h.has(e.id) ? { ...e, ...h.get(e.id) } : e)));
      loadFakulteGeneli();
    } catch (e) {
      alert('Birleştirilemedi: ' + (e.message || ''));
    }
  };

  const kabulGeriAl = async (cakisma) => {
    if (!confirm('Bu çakışmanın şartlı kabulü geri alınacak. Devam edilsin mi?')) return;
    try {
      // Kayıt hangi kimlikle yazıldıysa onunla silinir (okunan kaydın id'si).
      const kimlik =
        (cakisma.kabul && (cakisma.kabul.id || cakisma.kabul.kimlik)) ||
        window.sinavKabulKimligi(cakisma.anahtar);
      await DBWrite.remove('sinav_cakisma_kabul', kimlik);
      if (window.apiInvalidate) window.apiInvalidate('sinav_cakisma_kabul');
      await loadFakulteGeneli();
    } catch (e) {
      alert('Geri alınamadı: ' + (e.message || ''));
    }
  };

  // ── Load data from DB (department-scoped) ──
  // Hızlı bölüm değişiminde eski isteğin cevabı yeni bölümün verisinin
  // üstüne yazılmasın: yalnız SON isteğin sonucu uygulanır.
  const yuklemeNo = _useRef(0);
  const loadData = async () => {
    const istekNo = ++yuklemeNo.current;
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
      if (istekNo !== yuklemeNo.current) return;

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
          ? sinavSalonlari(classroomsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))).sort(
              (a, b) => (a.capacity || 0) - (b.capacity || 0)
            )
          : []
      );
      // Gözetmenler: bu bölümün gözetmen listesi (başka bölümden atananlar dahil)
      setDeptSupervisors(await bolumGozetmenleriniOku(selectedDeptId));
    } catch (e) {
      console.error('Load error:', e);
    }
    setLoading(false);
  };

  // Bölümler: ilk açılışta ve rol/fakülte değişince (ana ↔ ek bölüm geçişi
  // kabuk tarafından bileşen yeniden kurulmadan yapılır) yeniden okunur.
  useEffect(() => {
    const init = async () => {
      const depts = await loadDepartments();
      // Bölümü olmayan kullanıcı (ör. dersi olmayan fakülte yetkilisi) için
      // yükleme hiç bitmiyordu: veri yalnız bölüm seçilince okunuyor.
      if (depts.length === 0 && !selectedDeptId) setLoading(false);

      // Eski tarayıcı-taraflı göç (boş departmentId → bilgisayar, aynı adlı
      // akademisyen silme) kaldırıldı: her yeni tarayıcıda yeniden çalışıp dış
      // akademisyenleri Bilgisayar'a taşıyor ve aynı adlı kişileri siliyordu.
    };
    init();
  }, [
    currentUser?.role,
    currentUser?.baseRole,
    currentUser?.isFacultyManager,
    currentUser?.isDeptManager,
    currentUser?.isUniversityAdmin,
    currentUser?.facultyId,
    currentUser?.departmentId,
  ]);
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
    // Fakülte ayarlarındaki ortak salon listeleri (yalnız orada tanımlı salon,
    // ör. amfi, de kapasitesiyle bilinsin).
    fakulteAyarlari.forEach((a) =>
      ((a && a.salonlar) || []).forEach((r) => {
        if (r && r.name && !(h[r.name] > 0) && Number(r.capacity) > 0)
          h[r.name] = Number(r.capacity);
      })
    );
    ALL_FACULTY_CLASSROOMS.forEach((r) => {
      if (h[r.name] == null && r.capacity) h[r.name] = Number(r.capacity) || 0;
    });
    return h;
  }, [tumSalonlar, deptClassrooms, fakulteAyarlari]);

  // Sınav döneminin ders seçimi dönemi: 'Güz 2026-2027' → '2026-2027_guz'.
  const secimDonemi = useMemo(() => {
    const D = window.DersOdasi || {};
    const okunan =
      D.sinavDonemiAnahtari && activePeriod ? D.sinavDonemiAnahtari(activePeriod.semester) : '';
    return okunan || (D.donemAnahtari ? D.donemAnahtari() : '');
  }, [activePeriod]);

  const ortakOgrenci = useMemo(() => {
    if (!ogrenciVerisi || !window.sinavOrtakOgrenciSayaci) return null;
    const D = window.DersOdasi || {};
    return window.sinavOrtakOgrenciSayaci({
      ...ogrenciVerisi,
      donem: secimDonemi,
      eskiListe: !!D.donemAnahtari && secimDonemi === D.donemAnahtari(),
    });
  }, [ogrenciVerisi, secimDonemi]);

  // Fakülte geneli liste + bu bölümün ekrandaki güncel sınavları. Fakülte
  // listesi yalnız belirli anlarda yeniden okunuyor; birleştirme, ayırma ya da
  // salon/gözetmen düzenlemesi sayıyı değiştirmediği için bu bölümün güncel
  // sınavları listedeki eski kopyalarının yerine geçer.
  const denetimListesi = useCallback(
    (fakulte) => {
      const yerel = new Set(placedExams.map((e) => String(e.id)));
      return fakulte.length > 0
        ? [...fakulte.filter((e) => !yerel.has(String(e.id))), ...placedExams]
        : periodExams;
    },
    [placedExams, periodExams]
  );

  const cakismaHesapla = useCallback(
    (liste, kabuller, gunler) => {
      if (!window.sinavCakismalariBul) return [];
      const kapsam = liste.filter((e) => e && e.date && gunler.has(e.date));
      return window.sinavCakismalariBul(kapsam, {
        salonKapasiteleri,
        kabuller,
        ortakOgrenci,
      });
    },
    [salonKapasiteleri, ortakOgrenci]
  );

  const cakismalar = useMemo(
    () => cakismaHesapla(denetimListesi(tumSinavlar), cakismaKabulleri, donemGunleri),
    [cakismaHesapla, denetimListesi, tumSinavlar, cakismaKabulleri, donemGunleri]
  );

  const cakismaOzet = window.sinavCakismaOzeti
    ? window.sinavCakismaOzeti(cakismalar)
    : { toplam: 0, engel: 0, bekleyen: 0, kabul: 0 };

  // ── Fakülte: ortak salonlar, başka bölümlerin doluluğu, gönderim ──
  const SF = window.SinavFakulte;
  const bolumFakultesi =
    selectedDept?.facultyId ||
    ((window.DEPARTMENTS || []).find((d) => d.id === selectedDeptId) || {}).facultyId ||
    currentUser?.facultyId ||
    'muhendislik';
  const fakulteAyari =
    fakulteAyarlari.find(
      (a) =>
        a &&
        (a.id === bolumFakultesi ||
          (Array.isArray(a.kimlikler) && a.kimlikler.includes(bolumFakultesi)))
    ) || null;
  const salonListesi = fakulteSalonListesi(fakulteAyari);
  // Bu dönemin günlerinde BAŞKA bölümlerin sınavları (salon/gözetmen doluluğu).
  const digerSinavlar = useMemo(
    () =>
      tumSinavlar.filter(
        (e) =>
          e && !ayniBolumMu(e.departmentId, selectedDeptId) && e.date && donemGunleri.has(e.date)
      ),
    [tumSinavlar, selectedDeptId, donemGunleri]
  );
  // Bu dönemin bölümler arası ortak oturumlarının BAŞKA bölümlerdeki üyeleri:
  // otomatik atama ve çıktılar oturumu bütün olarak hesaplar (yoksa iki bölüm
  // aynı oturuma farklı salon/gözetmen yazıyordu).
  const ortakUyeler = useMemo(() => {
    const bidler = new Set(periodExams.map((e) => e.birlesimId).filter(Boolean));
    if (bidler.size === 0) return [];
    return tumSinavlar.filter(
      (e) => e && bidler.has(e.birlesimId) && !ayniBolumMu(e.departmentId, selectedDeptId)
    );
  }, [periodExams, tumSinavlar, selectedDeptId]);
  // ── Salon ve gözetmen seçenekleri (sınav düzenleme) ──
  // Bölüm yetkilisi: bölümün kendi derslikleri (Bölüm Yönetimi) ve kendi
  // gözetmenleri. Fakülte yetkilisi: fakültenin ortak salon listesi (çıktı
  // dosyasındaki salonlar) ve fakültedeki bütün bölümlerin gözetmenleri.
  const salonSecenekleri = useMemo(() => {
    const l = yonetimYetkisi || deptClassrooms.length === 0 ? salonListesi : deptClassrooms;
    return l
      .filter((r) => r && r.name)
      .map((r) => ({
        deger: r.name,
        etiket: r.name + (r.capacity ? ' (' + r.capacity + ')' : ''),
      }));
  }, [yonetimYetkisi, deptClassrooms, salonListesi]);
  // Gözetmen seçenekleri: bölümün fakültesindeki bütün araştırma görevlileri
  // (Arş. Gör., Arş. Gör. Dr.); sınav penceresi dersin öğretim elemanını en
  // başa ekler. Unvan verisi yoksa bölümün gözetmen listesine düşülür.
  useEffect(() => {
    if (!SF || !bolumFakultesi) return;
    let iptal = false;
    Promise.all([
      window.apiRead('professors').catch(() => []),
      window.apiRead('faculties').catch(() => []),
    ]).then(([hepsi, fakKayitlari]) => {
      if (iptal) return;
      setTumAkademisyenler(Array.isArray(hepsi) ? hepsi : []);
      const gomulu = (window.DEPARTMENTS || []).map((d) => ({
        ...d,
        facultyId: d.facultyId || 'muhendislik',
      }));
      const birim = SF.fakulteListesi(Array.isArray(fakKayitlari) ? fakKayitlari : [], gomulu).find(
        (f) => f.kimlikler.includes(String(bolumFakultesi))
      );
      const kimlikler = new Set(birim ? birim.kimlikler : [String(bolumFakultesi)]);
      setArastirmaGorevlileri(
        SF.fakulteArastirmaGorevlileri(
          Array.isArray(hepsi) ? hepsi : [],
          gomulu.filter((d) => kimlikler.has(String(d.facultyId)))
        )
      );
    });
    return () => {
      iptal = true;
    };
  }, [SF, bolumFakultesi]);
  const gozetmenSecenekleri = useMemo(
    () =>
      arastirmaGorevlileri.length > 0
        ? arastirmaGorevlileri
        : deptSupervisors.map((x) => ({ deger: x.name, etiket: x.name })),
    [arastirmaGorevlileri, deptSupervisors]
  );

  // ── Otomatik gözetmen ataması havuzu (sıra) ──
  // 1) Dersin hocası (ilk gözetmen; bölüm kuralı, varsayılan 'zorunlu')
  // 2) Dersin bölümü: bölümün gözetmen listesi + ana bölümü bu bölüm olan
  //    öğretim üyeleri ve araştırma görevlileri
  // 3) Gerekirse dışarıdan: fakültenin diğer araştırma görevlileri
  const gozetmenHavuzu = useMemo(() => {
    const bolum = selectedDept || (window.DEPARTMENTS || []).find((d) => d.id === selectedDeptId);
    const birincil = [
      ...new Set([
        ...deptSupervisors.map((x) => x.name),
        ...(SF && bolum
          ? SF.bolumAkademisyenHavuzu(tumAkademisyenler, {
              ...bolum,
              kimlikler: window.bolumKimlikleri ? window.bolumKimlikleri(bolum.id) : [bolum.id],
            })
          : []),
      ]),
    ].filter(Boolean);
    const ek = arastirmaGorevlileri.map((x) => x.deger).filter((a) => !birincil.includes(a));
    const kisiler = tumAkademisyenler.filter(
      (p) => p && (birincil.includes(p.name) || ek.includes(p.name))
    );
    return {
      birincil,
      ek,
      musaitsizlik: window.gozetmenMusaitsizlikHaritasi
        ? // Bütün akademisyenler: havuzda olmayan ders hocasının (öğr. gör.,
          // servis dersi veren) müsait olmadığı gün de bilinsin.
          window.gozetmenMusaitsizlikHaritasi([
            ...deptSupervisors,
            ...kisiler,
            ...tumAkademisyenler,
          ])
        : {},
    };
  }, [SF, selectedDept, selectedDeptId, deptSupervisors, tumAkademisyenler, arastirmaGorevlileri]);

  const grupAnahtari = activePeriod && SF ? SF.donemGrubu(activePeriod) : '';
  const gonderimId =
    SF && selectedDeptId && grupAnahtari ? SF.gonderimKimligi(selectedDeptId, grupAnahtari) : '';
  const gonderimKaydi =
    SF && selectedDeptId && grupAnahtari ? gonderimKaydiBulV(selectedDeptId, grupAnahtari) : null;
  const gonderimDurumu =
    SF && periodExams.length > 0
      ? SF.gonderimDurumu(gonderimKaydi, SF.programImzasi(periodExams))
      : 'bekliyor';

  // ── GÖNDERİLMİŞ PROGRAM KİLİDİ ──
  // Bölüm programı fakülteye gönderdikten sonra fakülte İADE edene kadar
  // bölüm (yetkili ve akademisyenler) o dönem grubunun programını
  // değiştiremez. Fakülte ve üniversite yetkilisi düzenlemeye devam eder.
  // Sunucu da aynı kuralı uygular (server/routes/db.js → gonderimKilidi).
  const fakulteDuzeyi = isAdmin || !!currentUser?.isUniversityAdmin || yonetimYetkisi;
  const donemKilitli = (donem) => {
    if (fakulteDuzeyi || !SF || !donem || !selectedDeptId) return false;
    const k = gonderimKaydiBulV(selectedDeptId, SF.donemGrubu(donem));
    return !!k && k.durum === 'gonderildi';
  };
  const programKilitli = donemKilitli(activePeriod);
  const imzaTazeleRef = _useRef(0);
  // ── Ders programıyla çakışma (uyarı): sınav salonunda o saatte ders var mı,
  // gözetmen o saatte ders veriyor mu (lib/ders-sinav-cakisma.js) ──
  const [dersOlaylari, setDersOlaylari] = useState([]);
  useEffect(() => {
    let canli = true;
    if (window.dersProgramiOlaylariniOku) {
      window.dersProgramiOlaylariniOku().then((l) => canli && setDersOlaylari(l || []));
    }
    return () => {
      canli = false;
    };
  }, []);
  const dersCakismalari = useMemo(
    () =>
      window.DersSinavCakisma && dersOlaylari.length
        ? window.DersSinavCakisma.dersSinavCakismalari(periodExams, dersOlaylari, {
            donemler: periods,
          })
        : [],
    [periodExams, dersOlaylari, periods]
  );
  useEffect(() => {
    if (!SF || !fakulteDuzeyi || !gonderimKaydi || gonderimKaydi.durum !== 'gonderildi') return;
    // Yalnız fakülte düzeyindeki kişinin bu ekrandaki son işleminden sonra
    // (2 dk): bölümün eski, gönderilmemiş değişikliklerini sessizce
    // "gönderildi" saymamak için.
    if (Date.now() - imzaTazeleRef.current > 120000) return;
    const imza = SF.programImzasi(periodExams);
    if (!imza || gonderimKaydi.imza === imza) return;
    const kimlik = gonderimKaydi.id || gonderimKaydi._docId;
    if (!kimlik) return;
    DBWrite.set(
      'sinav_gonderimleri',
      kimlik,
      {
        durum: 'gonderildi',
        imza,
        fakulteDuzenleyen: currentUser?.name || '',
        fakulteDuzenlemeTarihi: new Date().toISOString(),
      },
      true
    )
      .then(() =>
        setGonderimler((prev) =>
          prev.map((g) => (g && (g.id || g._docId) === kimlik ? { ...g, imza } : g))
        )
      )
      .catch((e) => console.warn('Gönderim parmak izi tazelenemedi:', e && e.message));
  }, [placedExams, gonderimKaydi]);
  const KILIT_MESAJI =
    'Bu program fakülteye gönderildi. Fakülte yetkilisi iade edene kadar bölüm sınav ' +
    'programında değişiklik yapılamaz.';
  const kilitliyse = (donem) => {
    // Fakülte düzeyindeki kişinin değişikliği gönderilmiş programın parmak
    // izini de tazeler (aşağıdaki etki): bölüm "gönderimden sonra değişti"
    // görünmesin.
    if (fakulteDuzeyi) imzaTazeleRef.current = Date.now();
    if (donemKilitli(donem === undefined ? activePeriod : donem)) {
      alert(KILIT_MESAJI);
      return true;
    }
    return false;
  };

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
    ...(Array.isArray(courseData.professors) && courseData.professors.length
      ? { professors: courseData.professors }
      : {}),
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

  // ── "Kendi dersim mi?" ──
  // Ad BİREBİR karşılaştırılmaz: ders kaydındaki ad ile giriş adı unvan ya
  // da büyük/küçük harf farkıyla yazılmış olabilir (ad standardı sonrası
  // "CELALETTİN KAYA" ↔ "Celalettin KAYA"), ders çok hocalı olabilir
  // (`professors` listesi; `professor` yalnız ilk hoca). Görünüm için
  // değiştirilmiş ad (turkishify) yerine ders kaydının kendisine de bakılır.
  const kendiDersiMi = (kayit) => {
    const ad = currentUser?.name;
    if (!kayit || !ad) return false;
    const f = window.dersEgitmeniMi;
    const kaynak = kayit.courseId ? courses.find((c) => c.id === kayit.courseId) : null;
    const asil = kayit.id ? courses.find((c) => c.id === kayit.id) : null;
    return [kayit, kaynak, asil].filter(Boolean).some((x) => (f ? f(x, ad) : x.professor === ad));
  };

  const handleDrop = async (courseData, dateStr, timeSlot) => {
    if (kilitliyse()) return;
    // Akademisyen sadece kendi derslerini yerleştirebilir
    if (!canManage && !kendiDersiMi(courseData)) {
      alert('Sadece kendi derslerinizi programa ekleyebilirsiniz.');
      return;
    }
    const SB = window.SinavBirlesim;
    const karar = SB
      ? SB.yerlestirmeSecenekleri(courseData, dateStr, timeSlot, periodExams)
      : { oturumlar: [], ayriEklenebilir: true, engel: '' };
    if (karar.oturumlar.length === 0) {
      const aday = yeniSinavVerisi(courseData, dateStr, timeSlot);
      if (!yerlestirmeOnayi(aday)) return;
      await sinavEkle(aday);
      return;
    }
    setAyniSaat({ ders: courseData, tarih: dateStr, saat: timeSlot, karar });
  };

  // ── Bırakma anında fakülte geneli denetim ──
  // Yerleştirmeden ÖNCE bütün bölümlerin sınavlarıyla (ortak öğrenci, hoca,
  // salon, gözetmen, sınıf) denenir; çakışma varsa sorulur. Kabul edilirse
  // sınav yerleşir ve çakışma panelde karar bekler.
  const yerlestirmeOnayi = (aday) => {
    if (!window.sinavCakismalariBul) return true;
    const yeni = { ...aday, id: '__aday__' };
    const liste = denetimListesi(tumSinavlar).filter((e) => e && e.date === yeni.date);
    const bulunan = cakismaHesapla([...liste, yeni], [], new Set([yeni.date])).filter((c) =>
      c.sinavlar.some((x) => x && x.id === '__aday__')
    );
    if (!bulunan.length) return true;
    // Aynı salonda örtüşme kesin engeldir: onayla geçilemez.
    const salonEngel = bulunan.filter((c) => c.tur === 'salon' && c.seviye === 'engel');
    if (salonEngel.length > 0) {
      alert(
        'Yerleştirilemez: aynı salonda saatleri örtüşen iki ayrı sınav olamaz (1 dakika bile).\n\n' +
          salonEngel.map((c) => '⛔ ' + c.baslik + ' — ' + c.aciklama).join('\n') +
          '\n\nBirlikte yapılacaksa ortak oturum olarak birleştirin; değilse başka saat ya da salon seçin.'
      );
      return false;
    }
    const satirlar = bulunan
      .slice(0, 6)
      .map((c) => (c.seviye === 'engel' ? '⛔ ' : '⚠ ') + c.baslik + ' — ' + c.aciklama);
    return confirm(
      'Bu yerleştirme diğer sınavlarla çakışıyor:\n\n' +
        satirlar.join('\n') +
        (bulunan.length > 6 ? '\n… ve ' + (bulunan.length - 6) + ' çakışma daha' : '') +
        '\n\nYine de yerleştirilsin mi? (Çakışma panelinde düzeltebilir ya da şartlı kabul edebilirsiniz.)'
    );
  };

  // Seçilen oturumla ortak sınav: oturumun bağı yoksa kurulur, yeni ders
  // oturumun saatine, salonuna ve (elle girilmişse) gözetmenine katılır.
  // Akademisyen kendi derslerini birleştirebilir: bırakılan ders de
  // oturumdaki bütün sınavlar da onun dersiyse (ör. aynı hocanın MAT161 ve
  // MAT165'i). Başkasının dersine dokunan birleştirme bölüm yetkilisinindir.
  const kendiDersleriniBirlestirebilir = (oturum) =>
    !!ayniSaat &&
    kendiDersiMi(ayniSaat.ders) &&
    (oturum.uyeler || []).length > 0 &&
    oturum.uyeler.every((u) => kendiDersiMi(u));

  const ortakSinavYap = async (oturum) => {
    if (kilitliyse()) return;
    const SB = window.SinavBirlesim;
    if (!ayniSaat || !SB) return;
    if (!canManage && !kendiDersleriniBirlestirebilir(oturum)) {
      alert('Yalnız iki dersin de hocası sizseniz birleştirebilirsiniz.');
      return;
    }
    // Oturumun salonu birleşince sığmıyorsa önceden söylenir (çakışma panelinde
    // "salona sığmıyor" engeli olarak da görünür).
    const salonlar = String(oturum.ozet.room || '')
      .split(/\s+-\s+|,/)
      .map((x) => x.trim())
      .filter(Boolean);
    const kapasiteler = salonlar.map((x) => Number(salonKapasiteleri[x]) || 0);
    const toplam = (oturum.ozet.toplamOgrenci || 0) + (Number(ayniSaat.ders.studentCount) || 0);
    const toplamKap = kapasiteler.reduce((t, c) => t + c, 0);
    if (
      salonlar.length > 0 &&
      kapasiteler.every((c) => c > 0) &&
      toplam > toplamKap &&
      !window.confirm(
        'Birleşince ' +
          toplam +
          ' öğrenci olacak; ' +
          salonlar.join(' - ') +
          ' kapasitesi ' +
          toplamKap +
          '. Oturuma salon eklemeniz gerekecek. Yine de birleştirilsin mi?'
      )
    )
      return;
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
    if (kilitliyse()) return;
    if (!ayniSaat) return;
    const aday = yeniSinavVerisi(ayniSaat.ders, ayniSaat.tarih, ayniSaat.saat);
    if (!yerlestirmeOnayi(aday)) return;
    if (await sinavEkle(aday)) setAyniSaat(null);
  };

  // Ortak oturumdan ayırma: kalan tek üye olursa onun bağı da çözülür.
  const birlesimdenAyir = async (exam) => {
    if (kilitliyse()) return;
    const SB = window.SinavBirlesim;
    if (!SB) return;
    const tum = denetimListesi(tumSinavlar);
    // Sınavın kendi yaması her zaman; geride tek kalan üyenin bağını çözen
    // yama yalnız o üye yazılabiliyorsa (başka bölümün sınavıysa tek üyeli
    // oturum zararsızdır — sınav silmedeki kuralla aynı).
    const yamalar = SB.birlesimdenCikarYamalari(exam, tum).filter(
      (y) => y.id === exam.id || sinavYazilabilir(tum.find((e) => e.id === y.id))
    );
    if (!sinavYazilabilir(exam)) {
      alert('Bu sınavı düzenleme yetkiniz yok.');
      return;
    }
    // Ayrılan sınav oturumun salon/gözetmenini taşırsa aynı saatte aynı salonda
    // kesin çakışma olur: boşaltılır (fakülte görünümündeki "Ayır" ile aynı).
    const veri = (y) =>
      y.id === exam.id
        ? {
            birlesimId: '',
            room: '',
            supervisor: '',
            otomatikSalon: false,
            otomatikGozetmen: false,
          }
        : { birlesimId: '' };
    if (
      !window.confirm(
        (exam.code || 'Sınav') +
          ' ortak oturumdan ayrılacak; salonu ve gözetmeni boşaltılır (yeniden atanır). Devam edilsin mi?'
      )
    )
      return;
    try {
      for (const y of yamalar) await DBWrite.update('sinav_programi', y.id, veri(y));
      const h = new Map(yamalar.map((y) => [y.id, veri(y)]));
      setPlacedExams((prev) => prev.map((e) => (h.has(e.id) ? { ...e, ...h.get(e.id) } : e)));
      loadFakulteGeneli();
    } catch (e) {
      alert('Ayrılamadı: ' + e.message);
    }
  };

  // ── SALON VE GÖZETMEN ATA (KAYDET) ──
  // Dekanlık çıktısındaki otomatik atama artık sınav kayıtlarına yazılabilir:
  // böylece fakülte tablosu, kısaltma sayıları ve fakülte geneli çakışma
  // denetimi aynı veriyi görür. Yalnız BOŞ alanlar doldurulur; elle girilen
  // salon/gözetmen değişmez. Otomatik yazılanlar işaretlenir ve tek
  // düğmeyle geri alınabilir.
  const salonGozetmenAta = async () => {
    if (kilitliyse()) return;
    if (periodExams.length === 0) return;

    const { sayiKurali } = await bolumGozetmenKurallari(selectedDeptId);
    const { oneri, uyarilar } = otomatikAtamaHesapla({
      sinavlar: periodExams,
      salonlar: deptClassrooms.length > 0 ? deptClassrooms : salonListesi,
      gozetmenAdlari: gozetmenHavuzu.birincil,
      ekGozetmenAdlari: gozetmenHavuzu.ek,
      kurallar: { sayiKurali },
      musaitsizlik: gozetmenHavuzu.musaitsizlik,
      digerSinavlar,
      kapasiteler: salonKapasiteleri,
      ortakUyeler,
    });
    const ops = [];
    const yamalar = {};
    periodExams.forEach((e) => {
      const o = oneri[e.id];
      if (!o) return;
      const data = {};
      if (!e.room && o.room && o.room !== 'TBD') {
        data.room = o.room;
        data.otomatikSalon = true;
      } else if (e.room && o.room && o.room !== 'TBD' && o.room !== e.room) {
        // Girilen salon öğrenciye yetmiyor: kapasite için salon eklenir;
        // eklenen kısım ayrı işaretlenir ("temizle" yalnız onu çıkarır).
        const once = salonParcalari(e.room);
        const ek = salonParcalari(o.room).filter((x) => !once.includes(x));
        if (ek.length > 0) {
          data.room = o.room;
          data.otomatikEkSalon = ek.join(' - ');
        }
      }
      if (!e.supervisor && o.supervisor) {
        data.supervisor = o.supervisor;
        data.otomatikGozetmen = true;
      }
      if (Object.keys(data).length > 0) {
        ops.push({ collection: 'sinav_programi', type: 'update', docId: e.id, data });
        yamalar[e.id] = data;
      }
    });
    if (ops.length === 0) {
      alert(
        'Otomatik atama yapılamadı.' +
          (uyarilar.length ? '\n\n' + window.Gozetmen.uyariMetni(uyarilar) : '')
      );
      return;
    }
    const tamam = window.confirm(
      ops.length +
        ' sınava salon ve/veya gözetmen yazılacak (elle girilenler korunur; öğrenciye yetmeyen ' +
        'salona kapasite için salon eklenir; başka bölümlerin ' +
        'aynı saatteki salon ve gözetmenleri dolu sayıldı).' +
        (uyarilar.length
          ? '\n\n' + uyarilar.length + ' uyarı:\n' + window.Gozetmen.uyariMetni(uyarilar)
          : '') +
        '\n\nKaydedilsin mi?'
    );
    if (!tamam) return;
    try {
      for (let i = 0; i < ops.length; i += 50) await DBWrite.batch(ops.slice(i, i + 50));
      setPlacedExams((prev) => prev.map((e) => (yamalar[e.id] ? { ...e, ...yamalar[e.id] } : e)));
      loadFakulteGeneli();
    } catch (e) {
      alert('Atama kaydedilemedi: ' + e.message);
    }
  };

  const otomatikAtamayiTemizle = async () => {
    if (kilitliyse()) return;
    const hedef = periodExams.filter(
      (e) => e.otomatikSalon || e.otomatikGozetmen || e.otomatikEkSalon
    );
    if (hedef.length === 0) {
      alert('Otomatik yazılmış salon/gözetmen yok.');
      return;
    }
    if (
      !window.confirm(
        hedef.length + ' sınavdaki OTOMATİK salon/gözetmen silinecek (elle girilenler kalır).'
      )
    )
      return;
    const yamalar = {};
    const ops = hedef.map((e) => {
      const data = {};
      if (e.otomatikSalon) Object.assign(data, { room: '', otomatikSalon: false });
      else if (e.otomatikEkSalon) {
        // Yalnız kapasite için eklenen salonlar çıkar; bölümün salonu kalır.
        const ek = salonParcalari(e.otomatikEkSalon);
        Object.assign(data, {
          room: salonParcalari(e.room)
            .filter((x) => !ek.includes(x))
            .join(' - '),
          otomatikEkSalon: '',
        });
      }
      if (e.otomatikGozetmen) Object.assign(data, { supervisor: '', otomatikGozetmen: false });
      yamalar[e.id] = data;
      return { collection: 'sinav_programi', type: 'update', docId: e.id, data };
    });
    try {
      for (let i = 0; i < ops.length; i += 50) await DBWrite.batch(ops.slice(i, i + 50));
      setPlacedExams((prev) => prev.map((e) => (yamalar[e.id] ? { ...e, ...yamalar[e.id] } : e)));
      loadFakulteGeneli();
    } catch (e) {
      alert('Temizlenemedi: ' + e.message);
    }
  };

  // ── FAKÜLTEYE GÖNDER ──
  // Çakışma kapısından geçen program fakülteye gönderilir; gönderimden sonra
  // değişirse durum "değişti" olur ve yeniden gönderilmesi gerekir.
  const fakulteyeGonder = async () => {
    if (!SF || !gonderimId || !activePeriod) return;
    if (!(await cikisIzniVar())) return;
    const salonsuz = periodExams.filter((e) => !e.room).length;
    const gozetmensiz = periodExams.filter((e) => !e.supervisor).length;
    if (
      (salonsuz || gozetmensiz) &&
      !window.confirm(
        (salonsuz ? salonsuz + ' sınavın salonu' : '') +
          (salonsuz && gozetmensiz ? ', ' : '') +
          (gozetmensiz ? gozetmensiz + ' sınavın gözetmeni' : '') +
          ' kayıtlı değil. Fakülte tablosunda salonu/gözetmeni girilmemiş sınav otomatik atama kuralıyla ' +
          'öneri olarak yerleşir. Önce "Salon ve Gözetmen Ata" kullanmanız önerilir.\n\n' +
          'Yine de gönderilsin mi?'
      )
    )
      return;
    try {
      await DBWrite.set('sinav_gonderimleri', gonderimId, {
        bolumId: selectedDeptId,
        bolumAdi: selectedDept?.name || '',
        facultyId: bolumFakultesi,
        donemGrubu: grupAnahtari,
        donemEtiketi: activePeriod.label || '',
        periodId: activePeriod.id,
        durum: 'gonderildi',
        imza: SF.programImzasi(periodExams),
        sinavSayisi: periodExams.length,
        gonderen: currentUser?.name || '',
        gonderimTarihi: new Date().toISOString(),
      });
      await loadFakulteGeneli();
      alert('Program fakülteye gönderildi.');
    } catch (e) {
      alert('Gönderilemedi: ' + e.message);
    }
  };

  // ── Çıktılar ──
  // Resmî çıktı yalnız kayıtlı salon/gözetmeni basar: eksikler önceden söylenir.
  const eksikAtamaOnayi = () => {
    const salonsuz = periodExams.filter((e) => !e.room || e.room === 'TBD').length;
    const gozetmensiz = periodExams.filter((e) => !String(e.supervisor || '').trim()).length;
    if (!salonsuz && !gozetmensiz) return true;
    return window.confirm(
      [salonsuz && salonsuz + ' sınavın salonu', gozetmensiz && gozetmensiz + ' sınavın gözetmeni']
        .filter(Boolean)
        .join(', ') +
        ' kayıtlı değil; çıktıda bu alanlar boş basılacak.\n\n' +
        'Önce "Salon ve gözetmen ata" ile atayıp kaydetmeniz önerilir. Yine de çıktı alınsın mı?'
    );
  };
  const dekanlikCiktisi = async () => {
    if (periodExams.length === 0) return;
    if (!(await cikisIzniVar())) return;
    if (!eksikAtamaOnayi()) return;
    await exportToXLSX(
      periodExams,
      activePeriod.label,
      activePeriod,
      deptClassrooms.length > 0 ? deptClassrooms : salonListesi,
      gozetmenHavuzu.birincil.length > 0 ? gozetmenHavuzu.birincil : null,
      selectedDept?.name || null,
      await bolumGozetmenKurallari(selectedDeptId),
      gozetmenHavuzu.musaitsizlik,
      {
        // Dışarıdan gözetmen yalnız KAYDEDİLEN atamada ("Salon ve gözetmen
        // ata"): kaydedilmemiş çıktıda iki bölüm aynı kişiyi aynı saate yazabilirdi.
        kapasiteler: salonKapasiteleri,
        ortakUyeler,
        digerSinavlar,
        salonListesi,
        sinavAdi: SF ? SF.sinavAdi(activePeriod) : '',
        // Fakültenin saat çizelgesi (dilim süresi, öğle arası).
        dilimler: SF ? SF.saatDilimleri(fakulteAyari && fakulteAyari.cizelge) : undefined,
      }
    );
  };
  const bolumCiktisi = async () => {
    if (periodExams.length === 0) return;
    if (!(await cikisIzniVar())) return;
    if (!eksikAtamaOnayi()) return;
    await exportDeptPrintable(
      periodExams,
      activePeriod.label,
      selectedDept?.name,
      deptClassrooms.length > 0 ? deptClassrooms : salonListesi,
      selectedDept?.id || activeDepartment,
      {
        gozetmenAdlari: gozetmenHavuzu.birincil,
        kurallar: await bolumGozetmenKurallari(selectedDeptId),
        musaitsizlik: gozetmenHavuzu.musaitsizlik,
        digerSinavlar,
        kapasiteler: salonKapasiteleri,
        ortakUyeler,
      }
    );
  };

  const handleUpdateExam = async (updatedExam) => {
    if (kilitliyse()) return;
    // Akademisyen sadece kendi derslerini düzenleyebilir
    if (!canManage && !kendiDersiMi(updatedExam)) {
      alert('Sadece kendi derslerinizi düzenleyebilirsiniz.');
      return;
    }
    try {
      const onceki = placedExams.find((e) => e.id === updatedExam.id) || {};
      const id = updatedExam.id;
      // YALNIZ pencerede değişen alanlar yazılır (pencere açıldığındaki hâle
      // göre). Bütün kaydı geri yazmak, başka ekranda (fakülte görünümü) ya
      // da başka kullanıcının yaptığı değişikliği eski değerle eziyordu.
      const ilk = editingExam && editingExam.id === id ? editingExam : onceki;
      const data = {};
      ['studentCount', 'supervisor', 'room', 'duration', 'professor', 'sinif'].forEach((k) => {
        if (String(updatedExam[k] ?? '') !== String(ilk[k] ?? '')) data[k] = updatedExam[k];
      });
      // Elle değiştirilen salon/gözetmen artık otomatik sayılmaz ("otomatik
      // atamayı temizle" onu silmesin) — yalnız o alan bu pencerede değiştiyse.
      if ('room' in data) {
        if (ilk.otomatikSalon || onceki.otomatikSalon) data.otomatikSalon = false;
        if (ilk.otomatikEkSalon || onceki.otomatikEkSalon) data.otomatikEkSalon = '';
      }
      if ('supervisor' in data && (ilk.otomatikGozetmen || onceki.otomatikGozetmen))
        data.otomatikGozetmen = false;
      if (Object.keys(data).length === 0) return;
      // Ortak sınav tek oturumdur: salon ve gözetmen bütün üyelerde aynı olmalı.
      // Üyeler bütün bölümlerden aranır (oturum bölümler arası olabilir).
      const SB = window.SinavBirlesim;
      const digerleri =
        SB && updatedExam.birlesimId
          ? SB.grupUyeleri(updatedExam, denetimListesi(tumSinavlar)).filter((e) => e.id !== id)
          : [];
      // Oturuma yalnız bu pencerede DEĞİŞEN salon/gözetmen yayılır (pencere
      // açıkken başkasının yaptığı değişiklik eski değerle ezilmesin).
      const ortak = {};
      if ('room' in data)
        Object.assign(ortak, { room: data.room || '', otomatikSalon: false, otomatikEkSalon: '' });
      if ('supervisor' in data)
        Object.assign(ortak, { supervisor: data.supervisor || '', otomatikGozetmen: false });
      const ortakDegisti =
        Object.keys(ortak).length > 0 &&
        digerleri.some(
          (u) =>
            ('room' in ortak && (u.room || '') !== ortak.room) ||
            ('supervisor' in ortak && (u.supervisor || '') !== ortak.supervisor)
        );
      // Salon ya da süre değiştiyse aynı salonda örtüşme denetlenir (geniş
      // programdaki kuralın aynısı; ortak oturum tek oturum sayılır).
      if (('room' in data || 'duration' in data) && SF && SF.degisiklikSalonCakismalari) {
        const yamalar = [
          { id, data },
          ...(ortakDegisti || 'room' in ortak
            ? digerleri.map((u) => ({ id: u.id, data: ortak }))
            : []),
        ];
        const engel = SF.degisiklikSalonCakismalari(denetimListesi(tumSinavlar), yamalar);
        if (engel.length > 0) {
          alert(
            'Kaydedilmedi: aynı salonda saatleri örtüşen iki ayrı sınav olamaz (1 dakika bile).\n\n' +
              SF.salonCakismaMetni(engel) +
              '\n\nBirlikte yapılacaksa ortak oturum olarak birleştirin; değilse başka saat ya da salon seçin.'
          );
          return;
        }
      }
      const yazilamayan = digerleri.filter((u) => !sinavYazilabilir(u));
      if (ortakDegisti && yazilamayan.length > 0) {
        alert(
          'Bu ortak sınavın salonu/gözetmeni oturumdaki bütün sınavlarda aynı olmalı; ' +
            'oturumda düzenleyemeyeceğiniz sınav var (yetkiniz yok ya da bölümü programı ' +
            'fakülteye gönderdi): ' +
            yazilamayan
              .map((u) => u.code + ' (' + (bolumAdiBul(u.departmentId) || 'başka bölüm') + ')')
              .join(', ') +
            '. Bu salon/gözetmen değişikliğini ' +
            (canManage ? 'fakülte yetkilisi' : 'bölüm ya da fakülte yetkilisi') +
            ' yapar.'
        );
        return;
      }
      await DBWrite.update('sinav_programi', id, data);
      if (ortakDegisti) {
        for (const u of digerleri) await DBWrite.update('sinav_programi', u.id, ortak);
      }
      const digerIdleri = new Set(digerleri.map((u) => u.id));
      setPlacedExams((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, ...data }
            : digerIdleri.has(e.id) && ortakDegisti
              ? { ...e, ...ortak }
              : e
        )
      );
      if (digerleri.some((u) => u.departmentId !== selectedDeptId)) loadFakulteGeneli();
    } catch (e) {
      console.error('Update error:', e);
      alert('Güncelleme hatası: ' + e.message);
    }
  };

  const handleRemoveExam = async (exam) => {
    if (kilitliyse()) return;
    // Akademisyen sadece kendi derslerini kaldırabilir
    if (!canManage && !kendiDersiMi(exam)) {
      alert('Sadece kendi derslerinizi takvimden kaldırabilirsiniz.');
      return;
    }
    try {
      // Ortak oturumdan çıkan sınav: geride tek üye kalırsa onun bağı da çözülür.
      const SB = window.SinavBirlesim;
      // Üyeler bütün bölümlerden aranır: bölümler arası oturumda yalnız bu
      // bölüme bakınca diğer bölümün iki üyesi varken bağ yanlışlıkla çözülüyordu.
      const kalan =
        SB && exam.birlesimId
          ? SB.grupUyeleri(exam, denetimListesi(tumSinavlar)).filter((e) => e.id !== exam.id)
          : [];
      await DBWrite.remove('sinav_programi', exam.id);
      // Tek kalan üyenin bağı çözülür (yazılamıyorsa tek üyeli oturum zararsızdır).
      if (kalan.length === 1 && sinavYazilabilir(kalan[0]))
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
    if (kilitliyse(periods.find((p) => p.id === periodId) || null)) return;
    if (
      !confirm(
        'Bu dönemi silmek istediğinize emin misiniz? Bu döneme ait tüm sınav yerleştirmeleri de silinecek.'
      )
    )
      return;
    try {
      // Dönem EN SON silinir: bölümsüz eski sınavların yetkisi sunucuda
      // dönemin bölümünden çözülür; dönem önce giderse sonraki parçalar reddedilir.
      const ops = [];
      // İlişkili sınavları da sil
      const exRef = getExamsRef();
      if (exRef) {
        const snap = await exRef.where('periodId', '==', periodId).get();
        snap.docs.forEach((doc) =>
          ops.push({ collection: 'sinav_programi', type: 'delete', docId: doc.id })
        );
      }
      ops.push({ collection: 'sinav_donemler', type: 'delete', docId: periodId });
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
        <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>Yükleniyor...</div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      {fakultePenceresi && (
        <FakulteProgramPenceresi
          currentUser={currentUser}
          varsayilanBolum={selectedDeptId}
          onClose={() => {
            setFakultePenceresi(false);
            // Fakülte görünümünde yapılan değişiklikler ana takvime gelsin
            // (yoksa bayat kayıt bir sonraki kayıtta geri yazılabiliyordu).
            loadData();
            loadFakulteGeneli();
          }}
        />
      )}
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
            <div style={{ fontSize: 13, color: '#64748B' }}>
              Dersleri sürükleyerek takvime yerleştirin
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {fakulteYetkili && seviye === 'lisans' && (
              <Btn onClick={() => setFakultePenceresi(true)}>Fakülte Programı (geniş görünüm)</Btn>
            )}
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
                stroke="#0F766E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <div>
                <span style={{ fontWeight: 600, color: '#0F766E' }}>
                  {currentUser?.departmentName || 'Bölüm'}
                </span>
                <span style={{ color: '#64748B', fontSize: 13, marginLeft: 8 }}>
                  Bölüm Yetkilisi: {currentUser?.name}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Professor Info — gömülü modda gizli */}
        {!embedded && isProfessor && departments.length > 0 && selectedDeptId && (
          <Card style={{ marginBottom: 16, background: '#CCFBF1', border: '1px solid #5EEAD4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0F766E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <div>
                <span style={{ fontWeight: 600, color: '#0F766E' }}>{currentUser?.name}</span>
                {departments.length > 1 && (
                  <select
                    value={selectedDeptId || ''}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    aria-label="Dersinizin olduğu bölüm"
                    style={{
                      marginLeft: 10,
                      height: 30,
                      padding: '0 8px',
                      border: '1px solid #5EEAD4',
                      borderRadius: 6,
                      fontSize: 13,
                      background: '#fff',
                    }}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
                <span style={{ color: '#64748B', fontSize: 13, marginLeft: 8 }}>
                  Akademisyen - Sadece kendi derslerinizi programa ekleyebilirsiniz
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Professor no department warning */}
        {isProfessor && departments.length === 0 && (
          <Card style={{ marginBottom: 16 }}>
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
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
        {fakulteYetkili && departments.length > 0 && !selectedDeptId && (
          <Card style={{ marginBottom: 16 }}>
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
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
                  color: '#64748B',
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
                  color: '#64748B',
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
                      boxShadow: aktif ? '0 2px 10px rgba(15, 118, 110,0.12)' : 'none',
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
                            if (kilitliyse(p)) return;
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
            <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>
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
                    color: viewMode === 'calendar' ? 'white' : '#64748B',
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
                    color: viewMode === 'table' ? 'white' : '#64748B',
                    cursor: 'pointer',
                    fontSize: 13,
                    borderLeft: 'none',
                  }}
                >
                  Tablo
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#64748B' }}>
                  {periodExams.length}/{courses.length} ders yerleştirildi
                </span>
                <IslemMenusu
                  cakismaOzet={periodExams.length > 0 ? cakismaOzet : null}
                  gonderim={
                    canManage && SF && periodExams.length > 0
                      ? {
                          durum: gonderimDurumu,
                          etiket: SF.GONDERIM_ETIKETI[gonderimDurumu],
                          not: gonderimKaydi && gonderimKaydi.iadeNotu,
                          // Fakültenin salon/gözetmen/saat düzenlemesi bölüme görünür.
                          fakulteDuzenleme:
                            gonderimKaydi && gonderimKaydi.fakulteDuzenlemeTarihi
                              ? (gonderimKaydi.fakulteDuzenleyen || 'fakülte') +
                                ', ' +
                                new Date(gonderimKaydi.fakulteDuzenlemeTarihi).toLocaleString(
                                  'tr-TR',
                                  { dateStyle: 'short', timeStyle: 'short' }
                                )
                              : '',
                        }
                      : null
                  }
                  ogeler={[
                    periodExams.length > 0 && {
                      etiket: 'Çakışma denetimi',
                      aciklama: 'Fakülte geneli engel ve uyarılar; şartlı kabul',
                      onClick: () => setCakismaPaneli((v) => !v),
                    },
                    canManage &&
                      selectedDeptId && {
                        etiket: 'Gözetmen kuralları',
                        aciklama: 'Atama sırası ve salon başına gözetmen sayısı',
                        onClick: () => setGozetmenKuralAcik(true),
                      },
                    canManage &&
                      !programKilitli &&
                      periodExams.length > 0 && {
                        etiket: 'Salon ve gözetmen ata',
                        aciklama: 'Boş alanları otomatik doldurur ve kaydeder',
                        onClick: salonGozetmenAta,
                      },
                    canManage &&
                      !programKilitli &&
                      periodExams.some((e) => e.otomatikSalon || e.otomatikGozetmen) && {
                        etiket: 'Otomatik atamayı temizle',
                        aciklama: 'Yalnız otomatik yazılan salon/gözetmenleri siler',
                        onClick: otomatikAtamayiTemizle,
                      },
                    // Kilitliyken yalnız "gönderimden sonra değişti" durumunda yeniden
                    // gönderilebilir: program değişmez, yalnız fakültedeki kayıt
                    // güncel hâliyle eşitlenir.
                    canManage &&
                      (!programKilitli || gonderimDurumu === 'degisti') &&
                      periodExams.length > 0 && {
                        etiket:
                          gonderimDurumu === 'gonderildi' || gonderimDurumu === 'degisti'
                            ? 'Yeniden gönder'
                            : 'Fakülteye gönder',
                        aciklama: 'Programı fakülte yetkilisine iletir',
                        vurgu: true,
                        onClick: fakulteyeGonder,
                      },
                    canManage && { ayirac: true },
                    canManage && {
                      etiket: 'Dekanlık Çıktısı (.xlsx)',
                      aciklama: 'Liste + gün gün salon tablosu',
                      devreDisi: periodExams.length === 0,
                      onClick: dekanlikCiktisi,
                    },
                    canManage && {
                      etiket: 'Bölüm Çıktısı (.docx)',
                      aciklama: 'Şablon varsa şablonla, yoksa standart Word tablosu',
                      devreDisi: periodExams.length === 0,
                      onClick: bolumCiktisi,
                    },
                  ].filter(Boolean)}
                />
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
                  <div
                    style={{ fontSize: 12.5, color: '#475569', marginBottom: 14, lineHeight: 1.6 }}
                  >
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
                              <div style={{ fontSize: 12.5, color: '#334155', marginTop: 3 }}>
                                {c.aciklama}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                                {c.cozum}
                              </div>
                              {c.eskiKabul && (
                                <div
                                  data-eski-kabul
                                  style={{ fontSize: 12, color: '#B91C1C', marginTop: 5 }}
                                >
                                  Bu çakışma daha önce şartlı kabul edilmişti (“{c.eskiKabul.sebep}”
                                  — {c.eskiKabul.kabulEden || 'yetkili'}). Kural değişti: aynı
                                  salonda saatleri örtüşen iki ayrı sınav artık kabul edilemez.
                                  Birlikte yapılacaksa ortak oturum olarak birleştirin (başka
                                  bölümün sınavıysa fakülte yetkilisi birleştirir); değilse birini
                                  başka saate ya da salona alın.
                                </div>
                              )}
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
                            {(cakismaBirlestirilebilir(c) || kabulYetkisi(c)) && (
                              <div style={{ flexShrink: 0, display: 'flex', gap: 6 }}>
                                {cakismaBirlestirilebilir(c) && (
                                  <GhostBtn
                                    onClick={() => cakismayiBirlestir(c)}
                                    title="İki sınavı tek oturumda (aynı saat, aynı salon) yap"
                                    style={{
                                      fontSize: 12,
                                      padding: '4px 10px',
                                      background: '#0F766E',
                                      color: 'white',
                                      border: 'none',
                                    }}
                                  >
                                    Ortak sınav yap
                                  </GhostBtn>
                                )}
                                {!kabulYetkisi(c) ? null : kabulEdildi ? (
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

            {dersCakismalari.length > 0 && (
              <details
                data-ders-cakisma
                style={{
                  marginBottom: 12,
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  fontSize: 13,
                  color: '#78350F',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                  ⚠ Ders programıyla {dersCakismalari.length} çakışma (uyarı)
                </summary>
                <div style={{ marginTop: 6, display: 'grid', gap: 3 }}>
                  {dersCakismalari.slice(0, 40).map((c, i) => (
                    <div key={i}>
                      {new Date(c.sinav.date + 'T00:00:00').toLocaleDateString('tr-TR')} · {c.mesaj}
                    </div>
                  ))}
                  {dersCakismalari.length > 40 && (
                    <div>… ve {dersCakismalari.length - 40} daha</div>
                  )}
                  <div style={{ fontSize: 12, color: '#92400E', marginTop: 4 }}>
                    Uyarıdır: o hafta ders yapılmayacaksa ya da ders başka salona alındıysa
                    görmezden gelebilirsiniz.
                  </div>
                </div>
              </details>
            )}

            {programKilitli && (
              <div
                data-program-kilitli
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  marginBottom: 12,
                  borderRadius: 10,
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1E3A8A',
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <span style={{ fontSize: 16 }}>🔒</span>
                <span>
                  <b>Program fakülteye gönderildi.</b> Fakülte yetkilisi iade edene kadar sınav
                  programında değişiklik yapılamaz (yerleştirme, saat/salon/gözetmen düzenleme,
                  birleştirme, silme). Değişiklik gerekiyorsa fakülte yetkilisinden iade isteyin.
                </span>
              </div>
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
                        background: '#F8FAFC',
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
                          color: '#94A3B8',
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
                          canDrag={canManage || kendiDersiMi(c)}
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
                                canDrag={canManage || kendiDersiMi(c)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}

                  {poolCourses.length === 0 && (
                    <div
                      style={{ padding: 20, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}
                    >
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
                    <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
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
                                color: '#64748B',
                                textAlign: 'center',
                                background: '#F8FAFC',
                                borderRight: '2px solid #E2E8F0',
                                borderBottom: '1px solid #E2E8F0',
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
                ? window.SinavBirlesim.grupUyeleri(
                    editingExam,
                    denetimListesi(tumSinavlar).map(turkishifyExam)
                  )
                : []
            }
            onAyir={
              canManage || (editingExam && kendiDersiMi(editingExam)) ? birlesimdenAyir : null
            }
            professors={professors}
            onSave={handleUpdateExam}
            onRemove={handleRemoveExam}
            onClose={() => setEditingExam(null)}
            readOnly={programKilitli || (!canManage && !kendiDersiMi(editingExam))}
            salonSecenekleri={salonSecenekleri}
            gozetmenSecenekleri={gozetmenSecenekleri}
          />
        )}

        {showPeriodModal && (
          <PeriodConfigModal
            period={editingPeriod}
            departmentId={selectedDeptId}
            seviye={seviye}
            kilitKontrol={(d) => kilitliyse(d)}
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
            birlestirebilir={canManage ? true : kendiDersleriniBirlestirebilir}
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
            <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 12, lineHeight: 1.55 }}>
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
          <div style={{ marginTop: 4, color: '#475569' }}>{cakisma.aciklama}</div>
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
              border: '1px solid ' + (C ? C.border : '#E2E8F0'),
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
                border: '1px solid ' + (C ? C.border : '#E2E8F0'),
                background: 'white',
                fontSize: 11.5,
                cursor: 'pointer',
                color: '#475569',
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
