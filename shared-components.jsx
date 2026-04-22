// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Ortak Bileşenler
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ══════════════════════════════════════════════════════════════
// Global Responsive Hook — tüm modüller tarafından kullanılır
// ══════════════════════════════════════════════════════════════
function useResponsive() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    let raf;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener("resize", handler);
    return () => { window.removeEventListener("resize", handler); cancelAnimationFrame(raf); };
  }, []);
  return {
    width,
    isMobile: width <= 480,
    isTablet: width > 480 && width <= 768,
    isSmallDesktop: width > 768 && width <= 1024,
    isDesktop: width > 1024,
    // Responsive değerler için yardımcı
    val: (mobile, tablet, desktop) => width <= 480 ? mobile : width <= 768 ? (tablet ?? mobile) : (desktop ?? tablet ?? mobile),
    // Modal genişlik hesapla
    modalWidth: (maxW) => Math.min(maxW, width - (width <= 480 ? 16 : 32)),
  };
}
window.useResponsive = useResponsive;

// ── Şifre Güvenliği ──
// Tüm şifre hash'leme ve doğrulama işlemleri sunucu tarafında (Cloud Functions)
// bcrypt ile yapılmaktadır. İstemci tarafında hash'leme yapılmaz.
const PasswordSecurity = {
  // Geriye dönük uyumluluk için stub - tüm hash'leme artık sunucu tarafında bcrypt ile yapılır
  async hashPassword(password) { return password; },
  isHashed() { return false; },
  async verifyPassword() { return false; },
  async migrateIfNeeded(stored) { return stored; }
};

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
    @media (max-width: 768px) {
      .portal-wrap {
        padding: 0 10px 32px;
      }
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
    /* Quill editor responsive */
    .ql-toolbar.ql-snow { flex-wrap: wrap; }
    .ql-container.ql-snow { font-size: 14px; }
    .portal-post-content img { max-width: 100%; height: auto; border-radius: 8px; }
    @media (max-width: 768px) {
      .ql-toolbar.ql-snow { padding: 4px !important; }
      .ql-toolbar .ql-formats { margin-right: 6px !important; }
      .daisy-card { margin-bottom: 14px; }
      .daisy-btn { padding: 8px 14px; font-size: 13px; }
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

// ══════════════════════════════════════════════════════════════
// Mühendislik Fakültesi - Bölüm Tanımlamaları
// ══════════════════════════════════════════════════════════════
const FACULTY = {
  name: "Mühendislik Fakültesi",
  university: "Çankırı Karatekin Üniversitesi",
};

const DEPARTMENTS = [
  { id: "bilgisayar", name: "Bilgisayar Mühendisliği", shortName: "Bilgisayar", color: "#3B82F6", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { id: "elektrik", name: "Elektrik ve Elektronik Mühendisliği", shortName: "Elektrik-Elektronik", color: "#EAB308", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { id: "makine", name: "Makine Mühendisliği", shortName: "Makine", color: "#EF4444", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  { id: "insaat", name: "İnşaat Mühendisliği", shortName: "İnşaat", color: "#F97316", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { id: "gida", name: "Gıda Mühendisliği", shortName: "Gıda", color: "#22C55E", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { id: "kimya", name: "Kimya Mühendisliği", shortName: "Kimya", color: "#8B5CF6", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
];

// Bölüm bazlı modüller (her bölüm yetkilisi bunlara erişir)
const DEPARTMENT_MODULES = [
  { id: "erasmus", label: "Erasmus", icon: "M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" },
  { id: "muafiyet", label: "Ders Muafiyet", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "staj", label: "Staj", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { id: "sinav", label: "Sınav Otomasyonu", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { id: "dersprogrami", label: "Ders Programı", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { id: "projeler", label: "Proje", icon: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" },

  { id: "formlar", label: "Formlar", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "akademisyen", label: "Akademisyenler", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" },
  { id: "performans", label: "Performans Modülü", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { id: "benim", label: "Benim Sayfam", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
];

// Ortak modüller (tüm bölümler için)
const COMMON_MODULES = [
  { id: "portal", label: "Öğrenci Portalı", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { id: "roadmaps", label: "Yol Haritaları", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
];

// Admin-only modüller
const ADMIN_MODULES = [
  { id: "kullanici", label: "Kullanıcı Yönetimi", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { id: "bolumyonetimi", label: "Bölüm Yönetimi", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { id: "dersyonetimi", label: "Ders Yönetimi", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { id: "komisyonlar", label: "Komisyonlar", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
];

window.FACULTY = FACULTY;
window.DEPARTMENTS = DEPARTMENTS;
window.DEPARTMENT_MODULES = DEPARTMENT_MODULES;
window.COMMON_MODULES = COMMON_MODULES;
window.ADMIN_MODULES = ADMIN_MODULES;

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

// ── API Functions ──
// ── Auth çağrıları sunucu API'ye yönlendirilir ──
const AUTH_API_ROUTES = {
  verifyStudentLogin: { method: 'POST', path: '/api/auth/student' },
  verifyAdminLogin: { method: 'POST', path: '/api/auth/admin' },
  verifyProfessorLogin: { method: 'POST', path: '/api/auth/professor' },
  verifyDepartmentManagerLogin: { method: 'POST', path: '/api/auth/department-manager' },
  changePassword: { method: 'POST', path: '/api/auth/change-password' },
  checkStudentHasPassword: { method: 'POST', path: '/api/auth/student-has-password-check' },
  adminResetPassword: { method: 'POST', path: '/api/auth/admin-reset' },
  setDefaultProfessorPassword: { method: 'POST', path: '/api/auth/default-professor-password' },
};

const CloudFunctions = {
  async call(name, data) {
    const route = AUTH_API_ROUTES[name];
    if (!route) throw new Error(`Bilinmeyen API çağrısı: ${name}`);

    const token = localStorage.getItem('caku_auth_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(route.path, {
      method: route.method,
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.status === 429) {
      const error = new Error(result.error);
      error.code = 'functions/resource-exhausted';
      throw error;
    }

    if (response.status >= 500) {
      throw new Error(result.error || 'Sunucu hatası');
    }

    if (result.token) {
      localStorage.setItem('caku_auth_token', result.token);
    }

    return { data: result };
  }
};
window.CloudFunctions = CloudFunctions;

// ── Retry mekanizması (bağlantı koptuğunda otomatik yeniden deneme) ──
async function fetchWithRetry(url, options = {}, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      // 5xx sunucu hatası ise yeniden dene
      if (response.status >= 500 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return response;
    } catch (err) {
      // Ağ hatası (bağlantı kopması)
      if (attempt < maxRetries) {
        console.warn(`[DB] İstek başarısız (deneme ${attempt + 1}/${maxRetries + 1}):`, err.message);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

// ── Veritabanı yazma yardımcısı (MongoDB API üzerinden) ──
const DBWrite = {
  async _apiCall(operations) {
    const token = localStorage.getItem('caku_auth_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetchWithRetry('/api/db/write', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ operations }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Yazma hatası' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    return response.json();
  },
  async single(collection, type, data, docId, merge, parentDocId, subCollection) {
    const op = { collection, type, data };
    if (docId) op.docId = docId;
    if (merge) op.merge = true;
    if (parentDocId) op.parentDocId = parentDocId;
    if (subCollection) op.subCollection = subCollection;
    return this._apiCall([op]);
  },
  async add(collection, data, parentDocId, subCollection) {
    return this.single(collection, 'add', data, null, false, parentDocId, subCollection);
  },
  async set(collection, docId, data, merge = false) {
    return this.single(collection, 'set', data, docId, merge);
  },
  async update(collection, docId, data, parentDocId, subCollection) {
    return this.single(collection, 'update', data, docId, false, parentDocId, subCollection);
  },
  async remove(collection, docId, parentDocId, subCollection) {
    return this.single(collection, 'delete', null, docId, false, parentDocId, subCollection);
  },
  async batch(operations) {
    return this._apiCall(operations);
  }
};
window.DBWrite = DBWrite;

// ── MongoDB API okuma yardımcısı ──
async function apiRead(collection, params = {}) {
  const url = new URL(`/api/db/${collection}`, window.location.origin);
  if (params.where) {
    const wheres = Array.isArray(params.where) ? params.where : [params.where];
    wheres.forEach(w => url.searchParams.append('where', w));
  }
  if (params.orderBy) url.searchParams.set('orderBy', params.orderBy);
  if (params.limit) url.searchParams.set('limit', params.limit);

  const token = localStorage.getItem('caku_auth_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetchWithRetry(url.toString(), { headers, credentials: 'include' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Okuma hatası' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return response.json();
}

async function apiReadDoc(collection, docId) {
  const token = localStorage.getItem('caku_auth_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetchWithRetry(`/api/db/${collection}/${encodeURIComponent(docId)}`, { headers, credentials: 'include' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Okuma hatası' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// API yardımcılarını global yap (diğer modüller için)
window.apiRead = apiRead;
window.apiReadDoc = apiReadDoc;

// NOT: Eski uyumluluk katmanı kaldırıldı.
// Tüm modüller artık doğrudan apiRead, apiReadDoc ve DBWrite kullanır.

const DB = {
  isReady: () => true,

  // Bağlantı kontrolü - API health check
  async checkConnection() {
    try {
      const response = await fetch('/api/health');
      if (response.ok) return { ok: true, error: null };
      return { ok: false, error: 'API sunucusu yanıt vermiyor.' };
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('network')) {
        return { ok: false, error: 'Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.' };
      }
      return { ok: false, error: 'API bağlantı hatası: ' + msg };
    }
  },

  // ── Forms CRUD ──
  async fetchForms() {
    try {
      return await apiRead('forms', { orderBy: 'createdAt:desc' });
    } catch (error) {
      console.error('Error fetching forms:', error);
      return [];
    }
  },
  async addForm(formData) {
    try {
      const result = await DBWrite.add('forms', formData);
      return { ...formData, id: result?.id || String(Date.now()) };
    } catch (error) {
      console.error('Error adding form:', error);
      throw error;
    }
  },
  async deleteForm(formId) {
    try {
      await DBWrite.remove('forms', String(formId));
    } catch (error) {
      console.error('Error deleting form:', error);
      throw error;
    }
  },
  async uploadFormFile(file) {
    try {
      const formData = new FormData();
      formData.append('folder', 'forms');
      formData.append('file', file);
      const response = await fetch('/api/files/upload', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Dosya yüklenemedi');
      const result = await response.json();
      return { downloadURL: result.downloadURL, fileName: result.fileName };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },
  async deleteFormFile(fileName) {
    try {
      const response = await fetch(`/api/files/${fileName}`, { method: 'DELETE' });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Dosya silinemedi');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  },

  // ── Erasmus Student CRUD ──
  async fetchStudents() {
    try {
      const students = await apiRead('students');
      return students.map(s => ({ ...s, outgoingMatches: s.outgoingMatches || [], returnMatches: s.returnMatches || [] }));
    } catch (error) {
      console.error('Error fetching students:', error);
      throw error;
    }
  },
  async addStudent(student) {
    try {
      const { id: _id, ...data } = student;
      const result = await DBWrite.add('students', data);
      return { ...student, id: result.id };
    } catch (error) {
      console.error('Error adding student:', error);
      throw error;
    }
  },
  async updateStudent(id, student) {
    try {
      const { id: _id, ...data } = student;
      await DBWrite.update('students', String(id), data);
      return student;
    } catch (error) {
      console.error('Error updating student:', error);
      throw error;
    }
  },
  async deleteStudent(id) {
    try {
      await DBWrite.remove('students', String(id));
      return true;
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  },

  // ── Trip History CRUD (Eşleştirme Geçmişi) ──
  async fetchTripHistory(hostInstitution, departmentId) {
    if (DB._tripHistoryDisabled) return [];
    try {
      const params = {};
      const whereArr = [];
      if (hostInstitution) {
        whereArr.push(`hostInstitution:eq:${hostInstitution}`);
      }
      if (departmentId) {
        whereArr.push(`departmentId:eq:${departmentId}`);
      }
      if (whereArr.length === 1) params.where = whereArr[0];
      else if (whereArr.length > 1) params.where = whereArr;
      return await apiRead('trip_history', params);
    } catch (error) {
      console.error('Error fetching trip history:', error);
      return [];
    }
  },
  async saveTripHistoryEntry(entry) {
    try {
      const result = await DBWrite.add('trip_history', entry);
      return { ...entry, id: result?.id || String(Date.now()) };
    } catch (error) {
      console.error('Error saving trip history entry:', error);
      throw error;
    }
  },
  async deleteTripHistoryEntry(id) {
    try {
      await DBWrite.remove('trip_history', String(id));
      return true;
    } catch (error) {
      console.error('Error deleting trip history entry:', error);
      throw error;
    }
  },
  _tripHistoryDisabled: false,

  async syncStudentToTripHistory(student) {
    // Skip if previously disabled due to permission errors
    if (DB._tripHistoryDisabled) return;
    try {
      if (!student.hostInstitution) return;

      // Fetch existing entries for this student
      const existingEntries = await apiRead('trip_history', {
        where: [
          `studentNumber:eq:${student.studentNumber}`,
          `hostInstitution:eq:${student.hostInstitution}`,
        ],
      });

      // Build match signature for deduplication
      const matchKey = (m) => JSON.stringify({
        home: m.homeCourses.map(c => c.code).sort(),
        host: m.hostCourses.map(c => c.code).sort(),
      });

      const existingKeys = new Set(existingEntries.map(e => matchKey(e)));
      const ops = [];

      // Process outgoing matches
      (student.outgoingMatches || []).forEach(m => {
        if (m.homeCourses.length === 0 && m.hostCourses.length === 0) return;
        const key = matchKey(m);
        if (!existingKeys.has(key)) {
          ops.push({ collection: 'trip_history', type: 'add', data: {
            hostInstitution: student.hostInstitution,
            hostCountry: student.hostCountry || '',
            type: 'outgoing',
            homeCourses: m.homeCourses,
            hostCourses: m.hostCourses,
            studentName: `${student.firstName} ${student.lastName}`,
            studentNumber: student.studentNumber,
            semester: student.semester || '',
            departmentId: student.departmentId || 'bilgisayar',
            createdAt: new Date().toISOString(),
          }});
          existingKeys.add(key);
        }
      });

      // Process return matches
      (student.returnMatches || []).forEach(m => {
        if (m.homeCourses.length === 0 && m.hostCourses.length === 0) return;
        const key = matchKey(m);
        if (!existingKeys.has(key)) {
          ops.push({ collection: 'trip_history', type: 'add', data: {
            hostInstitution: student.hostInstitution,
            hostCountry: student.hostCountry || '',
            type: 'return',
            homeCourses: m.homeCourses,
            hostCourses: m.hostCourses,
            hostGrade: m.hostGrade || '',
            homeGrade: m.homeGrade || '',
            hostGrades: m.hostGrades || {},
            homeGrades: m.homeGrades || {},
            studentName: `${student.firstName} ${student.lastName}`,
            studentNumber: student.studentNumber,
            semester: student.semester || '',
            departmentId: student.departmentId || 'bilgisayar',
            createdAt: new Date().toISOString(),
          }});
          existingKeys.add(key);
        }
      });

      if (ops.length > 0) {
        await DBWrite.batch(ops);
      }
    } catch (error) {
      // Disable trip history sync on permission errors to avoid flooding console
      if (error.code === 'permission-denied') {
        console.warn('Trip history sync disabled: veritabanı izin hatası.');
        DB._tripHistoryDisabled = true;
      } else {
        console.error('Error syncing to trip history:', error);
      }
    }
  },

  // ── Şifre İşlemleri (Cloud Functions üzerinden) ──
  // NOT: Şifreler artık istemcide okunmuyor, tüm doğrulama sunucu tarafında yapılır

  async verifyStudentLogin(studentNumber, password) {
    try {
      const result = await CloudFunctions.call('verifyStudentLogin', { studentNumber, password });
      return result.data;
    } catch (error) {
      console.error('verifyStudentLogin error:', error);
      if (error.code === 'functions/resource-exhausted') {
        return { success: false, error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' };
      }
      throw error;
    }
  },

  async verifyAdminLogin(password) {
    try {
      const result = await CloudFunctions.call('verifyAdminLogin', { password });
      return result.data;
    } catch (error) {
      console.error('verifyAdminLogin error:', error);
      if (error.code === 'functions/resource-exhausted') {
        return { success: false, error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' };
      }
      throw error;
    }
  },

  async verifyProfessorLogin(professorName, password) {
    try {
      const result = await CloudFunctions.call('verifyProfessorLogin', { professorName, password });
      return result.data;
    } catch (error) {
      console.error('verifyProfessorLogin error:', error);
      if (error.code === 'functions/resource-exhausted') {
        return { success: false, error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' };
      }
      throw error;
    }
  },

  async verifyDepartmentManagerLogin(managerName, password) {
    try {
      const result = await CloudFunctions.call('verifyDepartmentManagerLogin', { managerName, password });
      return result.data;
    } catch (error) {
      console.error('verifyDepartmentManagerLogin error:', error);
      if (error.code === 'functions/resource-exhausted') {
        return { success: false, error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' };
      }
      throw error;
    }
  },

  async changePassword(role, identifier, newPassword, currentPassword) {
    try {
      const result = await CloudFunctions.call('changePassword', { role, identifier, newPassword, currentPassword });
      return result.data;
    } catch (error) {
      console.error('changePassword error:', error);
      throw error;
    }
  },

  async checkStudentHasPassword(studentNumber) {
    try {
      const result = await CloudFunctions.call('checkStudentHasPassword', { studentNumber });
      return result.data.hasPassword;
    } catch (error) {
      console.error('checkStudentHasPassword error:', error);
      throw error;
    }
  },

  async setDefaultProfessorPassword(adminPassword, defaultPassword) {
    try {
      const result = await CloudFunctions.call('setDefaultProfessorPassword', { adminPassword, defaultPassword });
      return result.data;
    } catch (error) {
      console.error('setDefaultProfessorPassword error:', error);
      throw error;
    }
  },

  // Geriye uyumluluk (eski fonksiyon isimleri)
  async updatePassword(studentNumber, newPassword) {
    return await DB.changePassword('student', studentNumber, newPassword);
  },
  async saveAdminPassword(password) {
    return await DB.changePassword('admin', null, password);
  },
  async saveProfessorPasswords(passwords) {
    // Toplu profesör şifre güncelleme - her biri için Cloud Function çağır
    var errors = [];
    for (const [name, pass] of Object.entries(passwords)) {
      if (pass) {
        try {
          await DB.changePassword('professor', name, pass);
        } catch (e) {
          errors.push(name + ': ' + e.message);
        }
      }
    }
    if (errors.length > 0) {
      throw new Error('Bazı şifreler kaydedilemedi: ' + errors.join(', '));
    }
    return true;
  },

  // ── Exam CRUD ──
  async fetchExams(semester) {
    try {
      const params = {};
      if (semester && semester !== 'all') {
        params.where = `semester:eq:${semester}`;
      }
      return await apiRead('exams', params);
    } catch (error) {
      console.error('Error fetching exams:', error);
      return [];
    }
  },
  async addExam(exam) {
    try {
      const { id: _id, ...data } = exam;
      const result = await DBWrite.add('exams', data);
      return { ...exam, id: result?.id || String(Date.now()) };
    } catch (error) {
      console.error('Error adding exam:', error);
      throw error;
    }
  },
  async updateExam(id, exam) {
    try {
      const { id: _id, ...data } = exam;
      await DBWrite.update('exams', String(id), data);
      return exam;
    } catch (error) {
      console.error('Error updating exam:', error);
      throw error;
    }
  },
  async deleteExam(id) {
    try {
      await DBWrite.remove('exams', String(id));
      return true;
    } catch (error) {
      console.error('Error deleting exam:', error);
      throw error;
    }
  },
  async fetchExamResults(examId) {
    try {
      return await apiRead('exam_results', { where: `examId:eq:${examId}` });
    } catch (error) {
      console.error('Error fetching exam results:', error);
      return [];
    }
  },
  async addExamResult(result) {
    try {
      const { id: _id, ...data } = result;
      const res = await DBWrite.add('exam_results', data);
      return { ...result, id: res?.id || String(Date.now()) };
    } catch (error) {
      console.error('Error adding exam result:', error);
      throw error;
    }
  },
  async updateExamResult(id, result) {
    try {
      const { id: _id, ...data } = result;
      await DBWrite.update('exam_results', String(id), data);
      return result;
    } catch (error) {
      console.error('Error updating exam result:', error);
      throw error;
    }
  },
  async deleteExamResult(id) {
    try {
      await DBWrite.remove('exam_results', String(id));
      return true;
    } catch (error) {
      console.error('Error deleting exam result:', error);
      throw error;
    }
  },

  // ── Exam Periods CRUD ──
  async fetchExamPeriods() {
    try {
      return await apiRead('exam_periods');
    } catch (error) {
      console.error('Error fetching exam periods:', error);
      return [];
    }
  },
  async saveExamPeriod(period) {
    try {
      const { id: _id, ...data } = period;
      if (_id) {
        await DBWrite.update('exam_periods', String(_id), data);
        return period;
      } else {
        const result = await DBWrite.add('exam_periods', data);
        return { ...period, id: result?.id || String(Date.now()) };
      }
    } catch (error) {
      console.error('Error saving exam period:', error);
      throw error;
    }
  },
  async deleteExamPeriod(id) {
    try {
      await DBWrite.remove('exam_periods', String(id));
      return true;
    } catch (error) {
      console.error('Error deleting exam period:', error);
      throw error;
    }
  },

  // ── Professors CRUD ──
  async fetchProfessors() {
    try {
      return await apiRead('professors');
    } catch (error) {
      console.error('Error fetching professors:', error);
      return [];
    }
  },
  async saveProfessor(prof) {
    try {
      const { id: _id, ...data } = prof;
      if (_id) {
        await DBWrite.update("professors", String(_id), data);
        return prof;
      } else {
        const result = await DBWrite.add("professors", data);
        return { ...prof, id: result?.id || String(Date.now()) };
      }
    } catch (error) {
      console.error('Error saving professor:', error);
      throw error;
    }
  },
  async deleteProfessor(id) {
    try {
      await DBWrite.remove("professors", String(id));
      return true;
    } catch (error) {
      console.error('Error deleting professor:', error);
      throw error;
    }
  },
};

// ── Authentication Helper (JWT tabanlı) ──
const Auth = {
  // Çıkış yap (httpOnly cookie + localStorage temizle)
  async signOut() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch(e) {}
    localStorage.removeItem('caku_auth_token');
    localStorage.removeItem('caku_current_user');
  },

  // Mevcut kullanıcı - JWT token varsa geçerli sayılır
  currentUser() {
    const token = localStorage.getItem('caku_auth_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          return { uid: payload.identifier || payload.role };
        }
        localStorage.removeItem('caku_auth_token');
      } catch (e) { /* geçersiz token */ }
    }
    return null;
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
  const r = useResponsive();
  if (!open) return null;
  const isMobileModal = r.width <= 768;
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: isMobileModal ? "flex-end" : "center", justifyContent: "center",
        zIndex: 1000, padding: isMobileModal ? 0 : 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.card,
          borderRadius: isMobileModal ? "16px 16px 0 0" : 12,
          width: "100%",
          maxWidth: isMobileModal ? "100%" : width,
          maxHeight: isMobileModal ? "85vh" : "90vh",
          overflow: "auto",
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div style={{
            padding: isMobileModal ? "16px 16px" : "20px 24px",
            borderBottom: `1px solid ${C.border}`,
            position: "sticky", top: 0, background: C.card, zIndex: 1,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <h2 style={{
              fontSize: isMobileModal ? 17 : 20, fontWeight: 600, color: C.navy,
              fontFamily: "'Playfair Display', serif",
            }}>{title}</h2>
            {isMobileModal && (
              <button onClick={onClose} style={{
                border: "none", background: "none", cursor: "pointer", padding: 4,
                color: C.textMuted, fontSize: 20,
              }}>✕</button>
            )}
          </div>
        )}
        <div style={{ padding: isMobileModal ? 16 : 24 }}>{children}</div>
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
  const [professorList, setProfessorList] = useState([]);
  // İlk giriş / kayıt state'leri
  const [setupPasswordMode, setSetupPasswordMode] = useState(false); // mevcut öğrenci şifre değiştirme
  const [registerMode, setRegisterMode] = useState(false); // yeni öğrenci kayıt
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pendingUser, setPendingUser] = useState(null);
  const [pendingStudentNumber, setPendingStudentNumber] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [profSearch, setProfSearch] = useState("");
  const [profDropdownOpen, setProfDropdownOpen] = useState(false);

  // URL'den admin girişi kontrolü (?admin veya #admin)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('admin') || window.location.hash === '#admin') {
      setActiveTab("admin");
    }
  }, []);

  useEffect(() => {
    const loadProfessors = async () => {
      try {
        const profs = await DB.fetchProfessors();
        // Unvanları soyarak soyadı + ilk ad bazında tekilleştir
        const titles = ["Dr. Öğr. Üyesi", "Dr. Öğr. Gör.", "Öğr. Gör. Dr.", "Arş. Gör. Dr.", "Prof. Dr.", "Prof Dr.", "Doç. Dr.", "Öğr. Gör.", "Arş. Gör.", "Dr."];
        const stripTitle = (name) => {
          let n = (name || "").trim();
          for (const t of titles) { if (n.startsWith(t)) { n = n.slice(t.length).trim(); break; } }
          return n;
        };
        // Soyadını çıkar (sondaki tamamı büyük harf kelime(ler))
        const getKey = (name) => {
          const bare = stripTitle(name);
          const parts = bare.split(/\s+/);
          // Sondaki büyük harfli kelimeler = soyadı
          const surnames = [];
          for (let i = parts.length - 1; i >= 0; i--) {
            if (parts[i] === parts[i].toUpperCase() && parts[i].length > 1) surnames.unshift(parts[i]);
            else break;
          }
          const surname = surnames.join(" ");
          // İlk ad = soyadı hariç ilk kelime
          const firstName = parts.length > surnames.length ? parts[0].replace(/\./g, "").toUpperCase() : "";
          return (firstName + " " + surname).trim().toUpperCase();
        };
        const seen = new Map();
        (profs || []).forEach(p => {
          const key = getKey(p.name);
          if (!key) return;
          // Daha uzun (daha detaylı) ismi tercih et
          if (!seen.has(key) || (p.name || "").length > (seen.get(key).name || "").length) {
            seen.set(key, p);
          }
        });
        const unique = Array.from(seen.values());
        unique.sort((a, b) => (a.name || "").localeCompare(b.name || "", "tr"));
        setProfessorList(unique);
      } catch (e) {
        console.error("Error loading professors:", e);
        setProfessorList(window.SEED_PROFESSORS || []);
      }
    };
    loadProfessors();
  }, []);

  // Mevcut öğrenci/profesör/admin: şifre değiştirme + Auth hesabı oluşturma
  const handleSetupPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (!newPassword.trim()) { setError("Yeni şifre boş olamaz!"); return; }
    if (newPassword.length < 6) { setError("Şifre en az 6 karakter olmalıdır!"); return; }
    if (newPassword !== confirmPassword) { setError("Şifreler uyuşmuyor!"); return; }
    setLoading(true);
    try {
      // Şifreyi Cloud Functions ile sunucu tarafında kaydet
      const identifier = pendingUser.role === "student" ? pendingUser.studentNumber : pendingUser.name;
      await DB.changePassword(pendingUser.role, identifier, newPassword);
      onLogin(pendingUser);
    } catch (err) {
      console.error("Password setup error:", err);
      setError("Şifre kaydedilirken hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Yeni öğrenci: kayıt ol + Auth hesabı oluştur
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!firstName.trim()) { setError("Ad alanı zorunludur!"); return; }
    if (!lastName.trim()) { setError("Soyad alanı zorunludur!"); return; }
    if (!selectedDepartment) { setError("Bölüm seçimi zorunludur!"); return; }
    if (!newPassword.trim()) { setError("Şifre boş olamaz!"); return; }
    if (newPassword.length < 6) { setError("Şifre en az 6 karakter olmalıdır!"); return; }
    if (newPassword !== confirmPassword) { setError("Şifreler uyuşmuyor!"); return; }
    setLoading(true);
    try {
      // Mükerrer kayıt kontrolü
      const existingStudents = await DB.fetchStudents();
      const alreadyExists = existingStudents.find(s => s.studentNumber === pendingStudentNumber);
      if (alreadyExists) {
        setError("Bu öğrenci numarası ile daha önce kayıt olunmuş!");
        setLoading(false);
        return;
      }

      // Öğrenciyi veritabanına kaydet
      const deptObj = DEPARTMENTS.find(d => d.id === selectedDepartment);
      const studentData = {
        studentNumber: pendingStudentNumber,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        departmentId: selectedDepartment,
        departmentName: deptObj?.name || "",
        erasmusAccess: false,
      };
      await DB.addStudent(studentData);
      // Şifreyi kaydet
      await DB.updatePassword(pendingStudentNumber, newPassword);
      const user = { role: "student", name: `${firstName.trim()} ${lastName.trim()}`, studentNumber: pendingStudentNumber, departmentId: selectedDepartment, departmentName: deptObj?.name || "", erasmusAccess: false };
      onLogin(user);
    } catch (err) {
      console.error("Register error:", err);
      setError("Kayıt hatası: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetSetupState = () => {
    setSetupPasswordMode(false);
    setRegisterMode(false);
    setPendingUser(null);
    setPendingStudentNumber("");
    setNewPassword("");
    setConfirmPassword("");
    setFirstName("");
    setLastName("");
    setSelectedDepartment("");
    setStudentStep("number");
    setStudentInfo(null);
    setError("");
  };

  // Öğrenci: numara doğrulama (ilk adım)
  const [studentStep, setStudentStep] = useState("number"); // number, password
  const [studentInfo, setStudentInfo] = useState(null); // mevcut öğrenci bilgisi

  const handleStudentContinue = async (e) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim()) { setError("Öğrenci numarası gerekli!"); return; }
    const trimmedId = identifier.trim();
    if (!/^\d{9}$/.test(trimmedId)) { setError("Öğrenci numarası 9 haneli olmalıdır!"); return; }
    setLoading(true);
    try {
      const students = await DB.fetchStudents();
      const student = students.find(s => s.studentNumber === trimmedId);
      if (student) {
        // Mevcut öğrenci: şifre var mı kontrol et (Cloud Functions üzerinden)
        const hasPassword = await DB.checkStudentHasPassword(trimmedId);
        if (!hasPassword) {
          // Şifre yok: şifre belirleme ekranına
          const user = { role: "student", name: `${student.firstName} ${student.lastName}`, studentNumber: trimmedId, departmentId: student.departmentId || "bilgisayar", departmentName: student.departmentName || "Bilgisayar Mühendisliği", erasmusAccess: student.erasmusAccess === true };
          setPendingUser(user);
          setSetupPasswordMode(true);
        } else {
          // Şifresi var: şifre giriş adımına geç
          setStudentInfo(student);
          setStudentStep("password");
        }
      } else {
        // Yeni öğrenci: kayıt ekranına yönlendir
        setPendingStudentNumber(trimmedId);
        setRegisterMode(true);
      }
    } catch (err) {
      console.error("Student check error:", err);
      const msg = err.message || '';
      if (msg.includes('400') || msg.includes('Bad Request') || msg.includes('bağlantısı yok')) {
        setError("Veritabanına bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.");
      } else if (err.code === 'permission-denied') {
        setError("Veritabanı erişim izni reddedildi. Yöneticiyle iletişime geçin.");
      } else {
        setError("Bir hata oluştu: " + (msg || "Lütfen tekrar deneyin."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!password.trim()) { setError("Şifre gerekli!"); return; }
    setLoading(true);
    try {
      const trimmedId = identifier.trim();
      const user = { role: "student", name: `${studentInfo.firstName} ${studentInfo.lastName}`, studentNumber: trimmedId, departmentId: studentInfo.departmentId || "bilgisayar", departmentName: studentInfo.departmentName || "Bilgisayar Mühendisliği", erasmusAccess: studentInfo.erasmusAccess === true };

      // Sunucu tarafında şifre doğrulama
      const loginResult = await DB.verifyStudentLogin(trimmedId, password);

      if (loginResult.success) {
        if (password.length < 6) {
          setPendingUser(user);
          setSetupPasswordMode(true);
          setLoading(false);
          return;
        }
        onLogin(user);
      } else {
        // Cloud Functions doğrulamadı - hata göster
        setError(loginResult.error || "Giriş bilgileri hatalı!");
      }
    } catch (err) {
      console.error("Login error:", err);
      const msg = err.message || '';
      if (msg.includes('400') || msg.includes('Bad Request') || msg.includes('bağlantısı yok')) {
        setError("Veritabanına bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.");
      } else if (err.code === 'permission-denied') {
        setError("Veritabanı erişim izni reddedildi. Yöneticiyle iletişime geçin.");
      } else {
        setError("Giriş hatası: " + (msg || "Bilinmeyen hata"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (activeTab === "admin") {
        const adminUser = { role: "admin", name: "A. Tunahan KORKMAZ", studentNumber: null, departmentId: "bilgisayar", departmentName: "Bilgisayar Mühendisliği" };

        const adminResult = await DB.verifyAdminLogin(password);

        if (!adminResult.success && adminResult.error?.includes('belirlenmemiş')) {
          setError("Admin şifresi henüz belirlenmemiş.");
          setLoading(false);
          return;
        }

        if (adminResult.success) {
          if (password.length < 6) {
            setPendingUser(adminUser);
            setSetupPasswordMode(true);
            setLoading(false);
            return;
          }
          onLogin(adminUser);
        } else {
          // Cloud Functions doğrulamadı - hata göster
          setError(adminResult.error || "Giriş bilgileri hatalı!");
        }
      } else if (activeTab === "bolum_yetkilisi") {
        if (!identifier.trim()) { setError("Yetkili adı gerekli!"); setLoading(false); return; }
        const user = { role: "bolum_yetkilisi", name: identifier, studentNumber: null };

        const deptResult = await DB.verifyDepartmentManagerLogin(identifier, password);

        if (deptResult.success) {
          // Veritabanı doc ID ile hardcoded DEPARTMENTS ID'sini eşleştir
          // Tüm veriler hardcoded ID ile kaydedildiği için bu eşleşme kritik
          const matchedDept = DEPARTMENTS.find(d => d.name === deptResult.departmentName);
          user.departmentId = matchedDept ? matchedDept.id : deptResult.departmentId;
          user.departmentName = deptResult.departmentName;
          onLogin(user);
        } else {
          setError(deptResult.error || "Giriş bilgileri hatalı!");
        }
      } else if (activeTab === "professor") {
        if (!identifier.trim()) { setError("Akademisyen seçimi gerekli!"); setLoading(false); return; }
        const user = { role: "professor", name: identifier, studentNumber: null };

        const profResult = await DB.verifyProfessorLogin(identifier, password);

        if (profResult.needsSetup) {
          setPendingUser(user);
          setSetupPasswordMode(true);
          setLoading(false);
          return;
        }

        if (profResult.success) {
          if (password.length < 6) {
            setPendingUser(user);
            setSetupPasswordMode(true);
            setLoading(false);
            return;
          }
          onLogin(user);
        } else {
          // Cloud Functions doğrulamadı - hata göster
          setError(profResult.error || "Giriş bilgileri hatalı!");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      const msg = err.message || '';
      if (msg.includes('400') || msg.includes('Bad Request') || msg.includes('bağlantısı yok')) {
        setError("Veritabanına bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.");
      } else if (err.code === 'permission-denied') {
        setError("Veritabanı erişim izni reddedildi. Yöneticiyle iletişime geçin.");
      } else {
        setError("Giriş hatası: " + (msg || "Bilinmeyen hata"));
      }
    } finally {
      setLoading(false);
    }
  };

  const loginStyles = `
    @keyframes loginFadeIn {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes loginSpin {
      to { transform: rotate(360deg); }
    }
    @keyframes loginShake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-5px); }
      40%, 80% { transform: translateX(5px); }
    }
    @keyframes lgBlobFloat {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(14px, -10px) scale(1.04); }
    }
    @keyframes lgBlobFloat2 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(-12px, 14px) scale(0.96); }
    }
    @keyframes lg-orbit-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    /* ── Outer wrapper ── */
    .lg-wrap {
      position: fixed; inset: 0;
      background-color: #C9D8DC;
      background-image:
        radial-gradient(circle at 12% 8%, rgba(255, 255, 255, 0.7) 0%, transparent 40%),
        radial-gradient(circle at 90% 95%, rgba(13, 155, 142, 0.18) 0%, transparent 45%),
        radial-gradient(circle at 50% 50%, rgba(201, 216, 220, 1) 0%, rgba(169, 193, 199, 1) 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      overflow: auto;
      z-index: 10000;
      font-family: 'Inter', 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #0F172A;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Split card ── */
    .lg-card-split {
      background: #FFFFFF;
      width: 100%;
      max-width: 960px;
      border-radius: 22px;
      overflow: hidden;
      box-shadow:
        0 30px 70px rgba(11, 35, 65, 0.22),
        0 10px 25px rgba(11, 35, 65, 0.10),
        0 0 0 1px rgba(255, 255, 255, 0.6) inset;
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      animation: loginFadeIn 0.5s ease-out;
      position: relative;
      isolation: isolate;
    }

    /* ── Left panel (brand + illustration + tagline) ── */
    .lg-left {
      background: linear-gradient(155deg, #F3F6F4 0%, #E8EEEA 55%, #DDE8E5 100%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 34px 38px;
      position: relative;
      overflow: hidden;
    }
    .lg-left-blob1 {
      position: absolute;
      top: -80px; right: -60px;
      width: 260px; height: 260px;
      background: radial-gradient(circle, rgba(13, 155, 142, 0.22) 0%, rgba(13, 155, 142, 0) 70%);
      filter: blur(18px);
      -webkit-filter: blur(18px);
      animation: lgBlobFloat 12s ease-in-out infinite;
      pointer-events: none;
      border-radius: 50%;
    }
    .lg-left-blob2 {
      position: absolute;
      bottom: -100px; left: -70px;
      width: 300px; height: 300px;
      background: radial-gradient(circle, rgba(11, 35, 65, 0.14) 0%, rgba(11, 35, 65, 0) 70%);
      filter: blur(22px);
      -webkit-filter: blur(22px);
      animation: lgBlobFloat2 14s ease-in-out infinite;
      pointer-events: none;
      border-radius: 50%;
    }

    .lg-brand-row {
      display: flex;
      align-items: center;
      gap: 10px;
      position: relative;
      z-index: 2;
    }
    .lg-brand-mini-logo {
      width: 36px; height: 36px;
      position: relative;
      flex-shrink: 0;
    }
    .lg-brand-mini-img {
      position: absolute;
      inset: 4px;
      border-radius: 50%;
      object-fit: contain;
      background: rgba(255,255,255,0.75);
      padding: 2px;
    }
    .lg-brand-mini-ring {
      position: absolute;
      inset: 0;
      animation: lg-orbit-spin 6s linear infinite;
      transform-origin: center center;
    }
    .lg-brand-mini-dot {
      position: absolute;
      width: 8px; height: 8px;
      border-radius: 50%;
    }
    .lg-brand-mini-dot.d1 { top: -4px; left: calc(50% - 4px); background: #22c55e; box-shadow: 0 2px 6px rgba(34,197,94,0.6); }
    .lg-brand-mini-dot.d2 { top: calc(50% - 4px); right: -4px; background: #eab308; box-shadow: 0 2px 6px rgba(234,179,8,0.6); }
    .lg-brand-mini-dot.d3 { bottom: -4px; left: calc(50% - 4px); background: #111827; box-shadow: 0 2px 6px rgba(0,0,0,0.45); }
    .lg-brand-name {
      font-size: 18px;
      font-weight: 700;
      color: #0B2341;
      letter-spacing: -0.01em;
      line-height: 1;
    }
    .lg-brand-sub {
      font-size: 11px;
      color: #5B6B75;
      font-weight: 500;
      letter-spacing: 0.03em;
      margin-top: 2px;
      line-height: 1;
    }

    .lg-illus {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px 0 10px;
      position: relative;
      z-index: 2;
    }
    .lg-illus-ring {
      position: relative;
      width: 260px;
      height: 260px;
      max-width: 100%;
    }
    .lg-illus-ring::before {
      content: '';
      position: absolute; inset: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.55);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow:
        0 20px 40px rgba(11, 35, 65, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.8);
    }
    .lg-illus-logo {
      position: relative;
      z-index: 2;
      width: 72%; height: 72%;
      object-fit: contain;
      margin: 14% 14% 14%;
      display: block;
      filter: drop-shadow(0 6px 14px rgba(11, 35, 65, 0.18));
    }
    .lg-illus-orbit {
      position: absolute;
      inset: -18px;
      border-radius: 50%;
      border: 1.5px dashed rgba(34, 197, 94, 0.35);
      pointer-events: none;
      animation: lg-orbit-spin 9s linear infinite;
      transform-origin: center center;
    }
    .lg-illus-orbit-dot {
      position: absolute;
      width: 14px; height: 14px; border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.5);
    }
    .lg-illus-orbit-dot.top { top: -7px; left: 50%; transform: translateX(-50%); }
    .lg-illus-orbit-dot.right { top: 50%; right: -7px; transform: translateY(-50%); background: #eab308; box-shadow: 0 4px 12px rgba(234, 179, 8, 0.55); }
    .lg-illus-orbit-dot.bottom { bottom: -7px; left: 50%; transform: translateX(-50%); background: #111827; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45); }

    .lg-left-tagline {
      text-align: center;
      color: #0B2341;
      font-weight: 500;
      max-width: 320px;
      margin: 0 auto;
      position: relative;
      z-index: 2;
    }
    .lg-left-tagline-main {
      font-size: 17px;
      line-height: 1.45;
      font-weight: 600;
      letter-spacing: -0.005em;
    }
    .lg-left-tagline-sub {
      font-size: 13px;
      color: #5B6B75;
      margin-top: 6px;
      font-weight: 500;
      line-height: 1.5;
    }

    /* ── Right panel (form) ── */
    .lg-right {
      background: #FFFFFF;
      padding: 38px 42px;
      display: flex;
      flex-direction: column;
      min-width: 0;
      position: relative;
    }
    .lg-right-heading {
      color: #0D9B8E;
      font-size: 30px;
      font-weight: 700;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .lg-right-sub {
      color: #64748B;
      font-size: 13.5px;
      margin: 0 0 20px 0;
      font-weight: 500;
    }

    /* ── Base input (shared by every form variant) ── */
    .lg-input {
      width: 100%;
      padding: 12px 16px;
      border-radius: 10px;
      border: 1.5px solid #D5DBE3;
      background: #FFFFFF;
      color: #0F172A;
      font-size: 14.5px;
      line-height: 1.4;
      outline: none;
      font-family: 'Inter', 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
      -webkit-appearance: none;
      appearance: none;
      box-sizing: border-box;
    }
    .lg-input.lg-input-icon { padding-left: 42px; }
    .lg-input.lg-input-eye { padding-right: 44px; }
    .lg-input::placeholder { color: #94A3B8; opacity: 1; }
    .lg-input:-ms-input-placeholder { color: #94A3B8; }
    .lg-input::-ms-input-placeholder { color: #94A3B8; }
    .lg-input:hover { border-color: #B9C2CE; }
    .lg-input:focus {
      border-color: #0D9B8E;
      box-shadow: 0 0 0 3px rgba(13, 155, 142, 0.16);
      background: #FFFFFF;
    }

    .lg-input-icon-wrap { position: relative; }
    .lg-input-icon-left {
      position: absolute;
      left: 14px; top: 50%; transform: translateY(-50%);
      color: #64748B;
      pointer-events: none;
      display: flex;
    }
    .lg-input-eye-btn {
      position: absolute;
      right: 10px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer;
      color: #64748B;
      padding: 6px;
      display: flex; align-items: center;
      border-radius: 6px;
      transition: color 0.15s ease, background 0.15s ease;
    }
    .lg-input-eye-btn:hover { color: #0D9B8E; background: #F1F5F9; }

    .lg-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
      font-family: 'Inter', sans-serif;
    }

    /* ── Buttons ── */
    .lg-btn {
      width: 100%;
      padding: 13px 20px;
      border-radius: 10px;
      border: none;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      transition: background 0.18s ease, box-shadow 0.18s ease, transform 0.05s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      line-height: 1.2;
    }
    .lg-btn-primary {
      background: #0B2341;
      color: #FFFFFF;
      box-shadow: 0 6px 14px rgba(11, 35, 65, 0.22);
    }
    .lg-btn-primary:hover:not(:disabled) { background: #102E55; box-shadow: 0 8px 20px rgba(11, 35, 65, 0.32); }
    .lg-btn-primary:active:not(:disabled) { transform: translateY(1px); }
    .lg-btn-primary:disabled { background: #CBD5E1; color: #64748B; cursor: not-allowed; box-shadow: none; }

    .lg-btn-secondary {
      background: transparent;
      color: #475569;
      border: 1.5px solid #D5DBE3;
    }
    .lg-btn-secondary:hover { color: #0B2341; border-color: #0B2341; background: #F8FAFC; }

    /* ── Tabs ── */
    .lg-tabs {
      display: flex;
      gap: 4px;
      padding: 4px;
      background: #F1F5F9;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .lg-tab {
      flex: 1;
      padding: 10px 8px;
      border: none;
      background: transparent;
      color: #64748B;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.18s ease;
      font-family: 'Inter', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 34px;
      text-align: center;
    }
    .lg-tab:hover:not(.lg-tab-active) { color: #0D9B8E; background: rgba(255,255,255,0.65); }
    .lg-tab-active {
      background: #FFFFFF;
      color: #0B2341;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.10), 0 1px 2px rgba(15, 23, 42, 0.06);
    }

    /* ── Error ── */
    .lg-error {
      padding: 12px 14px;
      margin-bottom: 18px;
      border-radius: 10px;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      color: #B91C1C;
      font-size: 13.5px;
      line-height: 1.45;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      animation: loginShake 0.4s ease;
      font-family: 'Inter', sans-serif;
    }
    .lg-error svg { flex-shrink: 0; margin-top: 1px; }

    .lg-hint {
      font-size: 12.5px;
      color: #64748B;
      margin-top: 8px;
      line-height: 1.45;
    }

    .lg-greeting {
      margin-bottom: 18px;
      padding: 14px 16px;
      border-radius: 10px;
      background: linear-gradient(135deg, #F0FDFA 0%, #F8FAFC 100%);
      border: 1px solid #CCFBF1;
    }
    .lg-greeting-label { font-size: 12px; color: #0D9B8E; margin-bottom: 2px; font-weight: 600; letter-spacing: 0.02em; }
    .lg-greeting-name { font-size: 16px; font-weight: 700; color: #0B2341; }
    .lg-greeting-id { font-size: 13px; color: #64748B; margin-top: 2px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.04em; }

    .lg-setup-hero { text-align: center; margin-bottom: 22px; }
    .lg-setup-icon {
      width: 56px; height: 56px; border-radius: 50%;
      margin: 0 auto 14px;
      background: rgba(13, 155, 142, 0.12);
      display: flex; align-items: center; justify-content: center;
    }
    .lg-setup-title {
      color: #0B2341;
      font-size: 20px; font-weight: 700;
      margin: 0;
      letter-spacing: -0.01em;
    }
    .lg-setup-sub {
      color: #64748B;
      font-size: 13.5px;
      margin: 8px 0 0;
      line-height: 1.5;
    }
    .lg-setup-sub strong { color: #0B2341; font-weight: 600; }

    /* ── Professor picker ── */
    .lg-prof-selected {
      padding: 10px 12px;
      border-radius: 10px;
      border: 1.5px solid #0D9B8E;
      background: #F0FDFA;
      color: #0B2341;
      font-size: 14.5px;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      display: flex; align-items: center; gap: 10px;
      font-weight: 500;
    }
    .lg-prof-avatar {
      width: 32px; height: 32px; border-radius: 8px;
      background: #0B2341; color: #FFFFFF;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; flex-shrink: 0;
      letter-spacing: 0.02em;
    }
    .lg-prof-clear {
      background: none; border: none; color: #64748B; cursor: pointer;
      font-size: 20px; padding: 0 6px; line-height: 1; border-radius: 4px;
    }
    .lg-prof-clear:hover { color: #DC2626; background: #FEF2F2; }
    .lg-prof-list {
      max-height: 180px;
      overflow-y: auto;
      border-radius: 10px;
      border: 1px solid #E2E8F0;
      background: #FFFFFF;
      margin-top: 6px;
    }
    .lg-prof-row {
      padding: 10px 12px;
      cursor: pointer;
      display: flex; align-items: center; gap: 10px;
      border-bottom: 1px solid #F1F5F9;
      font-size: 13.5px;
      color: #334155;
      transition: background 0.12s;
    }
    .lg-prof-row:last-child { border-bottom: none; }
    .lg-prof-row:hover { background: #F0FDFA; color: #0B2341; }
    .lg-prof-row-avatar {
      width: 28px; height: 28px; border-radius: 7px;
      background: #E2E8F0; color: #475569;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .lg-prof-empty {
      padding: 16px; text-align: center; color: #94A3B8; font-size: 13px;
    }

    /* ── Admin banner ── */
    .lg-admin-banner {
      padding: 10px 14px;
      margin-bottom: 18px;
      background: linear-gradient(135deg, #0B2341 0%, #102E55 100%);
      border-radius: 10px;
      color: #FFFFFF;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      font-size: 13px; font-weight: 600;
      letter-spacing: 0.03em;
    }

    .lg-footer {
      text-align: center;
      margin-top: 18px;
      font-size: 12px;
      color: rgba(11, 35, 65, 0.55);
      letter-spacing: 0.02em;
      font-weight: 500;
    }

    /* ── Responsive ── */
    @media (max-width: 820px) {
      .lg-card-split {
        grid-template-columns: 1fr;
        max-width: 520px;
      }
      .lg-left {
        padding: 26px 28px 22px;
      }
      .lg-illus { padding: 4px 0; }
      .lg-illus-ring { width: 160px; height: 160px; }
      .lg-left-tagline-main { font-size: 15px; }
      .lg-left-tagline-sub { font-size: 12.5px; }
      .lg-right { padding: 28px; }
      .lg-right-heading { font-size: 26px; }
    }
    @media (max-width: 520px) {
      .lg-wrap { padding: 12px; }
      .lg-right { padding: 22px; }
      .lg-left { padding: 22px 22px 18px; }
      .lg-tab { font-size: 12.5px; padding: 10px 4px; }
    }
  `;


  return (
    <div className="lg-wrap">
      <style dangerouslySetInnerHTML={{ __html: loginStyles }} />

      <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="lg-card-split">
          {/* Left panel — brand + illustration + tagline */}
          <div className="lg-left">
            <div className="lg-left-blob1" aria-hidden="true" />
            <div className="lg-left-blob2" aria-hidden="true" />

            <div className="lg-brand-row">
              <div className="lg-brand-mini-logo" aria-hidden="true">
                <img src="logo.png" alt="" className="lg-brand-mini-img" />
                <div className="lg-brand-mini-ring">
                  <span className="lg-brand-mini-dot d1" />
                  <span className="lg-brand-mini-dot d2" />
                  <span className="lg-brand-mini-dot d3" />
                </div>
              </div>
              <div>
                <div className="lg-brand-name">Offline Asistan</div>
                <div className="lg-brand-sub">ÇAKÜ • Bilgisayar Mühendisliği</div>
              </div>
            </div>

            <div className="lg-illus">
              <div className="lg-illus-ring">
                <img src="logo.png" alt="Çankırı Karatekin Üniversitesi" className="lg-illus-logo" />
                <div className="lg-illus-orbit" aria-hidden="true">
                  <span className="lg-illus-orbit-dot top" />
                  <span className="lg-illus-orbit-dot right" />
                  <span className="lg-illus-orbit-dot bottom" />
                </div>
              </div>
            </div>

            <div className="lg-left-tagline">
              <div className="lg-left-tagline-main">Akademik yaşamı kolaylaştıran dijital asistanınız.</div>
              <div className="lg-left-tagline-sub">Öğrenciler, akademisyenler ve bölüm yetkilileri için tek noktadan erişim.</div>
            </div>
          </div>

          {/* Right panel — form */}
          <div className="lg-right">
            <h2 className="lg-right-heading">Giriş Yap</h2>
            <p className="lg-right-sub">Devam etmek için hesabınızla oturum açın.</p>

            {activeTab === "admin" && (
              <div className="lg-admin-banner">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                Yönetici Girişi
              </div>
            )}

            {/* Tabs - Admin hariç */}
            {activeTab !== "admin" && !registerMode && !setupPasswordMode && !(activeTab === "student" && studentStep === "password") && (
            <div className="lg-tabs">
              {[
                { key: "student", label: "Öğrenci" },
                { key: "professor", label: "Akademisyen" },
                { key: "bolum_yetkilisi", label: "Bölüm Yetkilisi" },
              ].map(tab => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setError(""); setIdentifier(""); setPassword(""); setStudentStep("number"); setStudentInfo(null); resetSetupState(); setProfSearch(""); setProfDropdownOpen(false); }}
                    type="button"
                    className={`lg-tab${active ? " lg-tab-active" : ""}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            )}

          {/* Yeni Öğrenci Kayıt Ekranı */}
          {registerMode ? (
            <form onSubmit={handleRegister}>
              <div className="lg-setup-hero">
                <div className="lg-setup-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4973B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                </div>
                <h3 className="lg-setup-title">Kayıt Ol</h3>
                <p className="lg-setup-sub">
                  <strong>{pendingStudentNumber}</strong> numaralı öğrenci olarak kayıt olun.
                </p>
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label className="lg-label">Ad</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Adınız" autoFocus className="lg-input" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label className="lg-label">Soyad</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Soyadınız" className="lg-input" />
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="lg-label">Bölüm</label>
                <div className="lg-input-icon-wrap">
                  <div className="lg-input-icon-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>
                  </div>
                  <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)}
                    className="lg-input lg-input-icon"
                    style={{ paddingRight: 40, color: selectedDepartment ? "#0F172A" : "#94A3B8", cursor: "pointer" }}>
                    <option value="" disabled>Bölümünüzü seçin</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#64748B", pointerEvents: "none" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="lg-label">Şifre</label>
                <div className="lg-input-icon-wrap">
                  <div className="lg-input-icon-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  </div>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Şifrenizi belirleyin (en az 6 karakter)" className="lg-input lg-input-icon" />
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <label className="lg-label">Şifre Tekrar</label>
                <div className="lg-input-icon-wrap">
                  <div className="lg-input-icon-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  </div>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Şifrenizi tekrar girin" className="lg-input lg-input-icon" />
                </div>
              </div>

              {error && (
                <div className="lg-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="lg-btn lg-btn-primary">
                {loading ? (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "loginSpin 1s linear infinite" }}><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" /></svg>Kaydediliyor...</>
                ) : (
                  <>Kayıt Ol ve Giriş Yap<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></>
                )}
              </button>

              <button type="button" onClick={resetSetupState} className="lg-btn lg-btn-secondary" style={{ marginTop: 10, padding: "10px 16px", fontSize: 13 }}>Geri Dön</button>
            </form>

          ) : setupPasswordMode ? (
            /* Mevcut öğrenci: şifre değiştirme ekranı */
            <form onSubmit={handleSetupPassword}>
              <div className="lg-setup-hero">
                <div className="lg-setup-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4973B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <h3 className="lg-setup-title">Yeni Şifre Belirleyin</h3>
                <p className="lg-setup-sub">
                  Hoş geldiniz, <strong>{pendingUser?.name}</strong>. Güvenliğiniz için lütfen yeni bir şifre belirleyin.
                </p>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="lg-label">Yeni Şifre</label>
                <div className="lg-input-icon-wrap">
                  <div className="lg-input-icon-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  </div>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Yeni şifrenizi girin (en az 6 karakter)" autoFocus className="lg-input lg-input-icon" />
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <label className="lg-label">Şifre Tekrar</label>
                <div className="lg-input-icon-wrap">
                  <div className="lg-input-icon-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  </div>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Şifrenizi tekrar girin" className="lg-input lg-input-icon" />
                </div>
              </div>

              {error && (
                <div className="lg-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="lg-btn lg-btn-primary">
                {loading ? (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "loginSpin 1s linear infinite" }}><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" /></svg>Kaydediliyor...</>
                ) : (
                  <>Şifreyi Belirle ve Giriş Yap<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></>
                )}
              </button>

              <button type="button" onClick={resetSetupState} className="lg-btn lg-btn-secondary" style={{ marginTop: 10, padding: "10px 16px", fontSize: 13 }}>Geri Dön</button>
            </form>
          ) : activeTab === "student" && studentStep === "password" ? (
          /* Öğrenci: Şifre Giriş Adımı */
          <form onSubmit={handleStudentLogin}>
            <div className="lg-greeting">
              <div className="lg-greeting-label">Hoş geldiniz</div>
              <div className="lg-greeting-name">{studentInfo?.firstName} {studentInfo?.lastName}</div>
              <div className="lg-greeting-id">{identifier}</div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label className="lg-label">Şifre</label>
              <div className="lg-input-icon-wrap">
                <div className="lg-input-icon-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                </div>
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Şifrenizi girin" autoFocus className="lg-input lg-input-icon lg-input-eye" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="lg-input-eye-btn" aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="lg-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="lg-btn lg-btn-primary">
              {loading ? (
                <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "loginSpin 1s linear infinite" }}><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" /></svg>Giriş yapılıyor...</>
              ) : (
                <>Giriş Yap<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></>
              )}
            </button>
            <button type="button" onClick={() => { setStudentStep("number"); setPassword(""); setStudentInfo(null); setError(""); }} className="lg-btn lg-btn-secondary" style={{ marginTop: 10, padding: "10px 16px", fontSize: 13 }}>Farklı numara ile giriş</button>
          </form>

          ) : activeTab === "student" ? (
          /* Öğrenci: Numara Giriş Adımı */
          <form onSubmit={handleStudentContinue}>
            <div style={{ marginBottom: 20 }}>
              <label className="lg-label">Öğrenci Numarası</label>
              <div className="lg-input-icon-wrap">
                <div className="lg-input-icon-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <input value={identifier} onChange={e => setIdentifier(e.target.value.replace(/\D/g, ""))} placeholder="9 haneli öğrenci numaranız" autoFocus maxLength={9} inputMode="numeric"
                  className="lg-input lg-input-icon"
                  style={{ letterSpacing: "1px" }} />
              </div>
              <div className="lg-hint">
                Sisteme ilk kez giriyorsanız, bilgilerinizi girip şifre belirlemeniz istenecektir.
              </div>
            </div>

            {error && (
              <div className="lg-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || identifier.length !== 9} className="lg-btn lg-btn-primary">
              {loading ? (
                <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "loginSpin 1s linear infinite" }}><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" /></svg>Kontrol ediliyor...</>
              ) : (
                <>Devam Et<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></>
              )}
            </button>
          </form>

          ) : (
          /* Bölüm Yetkilisi / Akademisyen / Admin Form */
          <form onSubmit={handleSubmit}>

            {activeTab === "bolum_yetkilisi" && (
              <div style={{ marginBottom: 18 }}>
                <label className="lg-label">Yetkili Adı Soyadı</label>
                <div className="lg-input-icon-wrap">
                  <div className="lg-input-icon-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="Adınızı ve soyadınızı girin" autoFocus className="lg-input lg-input-icon" />
                </div>
              </div>
            )}

            {activeTab === "professor" && (
              <div style={{ marginBottom: 18 }}>
                <label className="lg-label">Akademisyen</label>
                {/* Seçili akademisyen gösterimi */}
                {identifier && !profDropdownOpen && (
                  <div
                    onClick={() => { setProfDropdownOpen(true); setProfSearch(""); }}
                    className="lg-prof-selected"
                  >
                    <div className="lg-prof-avatar">
                      {(identifier || "").split(" ").map(w => w.charAt(0)).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <span style={{ flex: 1 }}>{identifier}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIdentifier(""); setProfSearch(""); setProfDropdownOpen(true); }} className="lg-prof-clear" aria-label="Seçimi temizle">×</button>
                  </div>
                )}
                {/* Arama + Liste */}
                {(!identifier || profDropdownOpen) && (
                  <div>
                    <div className="lg-input-icon-wrap" style={{ marginBottom: 6 }}>
                      <div className="lg-input-icon-left" style={{ left: 12 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </div>
                      <input
                        type="text" value={profSearch}
                        onChange={e => setProfSearch(e.target.value)}
                        placeholder="Akademisyen adı yazın..."
                        autoFocus
                        className="lg-input lg-input-icon"
                        style={{ fontSize: 14, padding: "11px 14px 11px 38px" }}
                      />
                    </div>
                    <div className="lg-prof-list">
                      {(() => {
                        const filtered = professorList.filter(p => !profSearch || (p.name || "").toLocaleLowerCase("tr").indexOf(profSearch.toLocaleLowerCase("tr")) >= 0);
                        if (filtered.length === 0) return <div className="lg-prof-empty">Sonuç bulunamadı</div>;
                        return filtered.map(p => (
                          <div key={p.id || p.name}
                            onClick={() => { setIdentifier(p.name); setProfDropdownOpen(false); setProfSearch(""); }}
                            className="lg-prof-row"
                          >
                            <div className="lg-prof-row-avatar">
                              {(p.name || "").split(" ").map(w => w.charAt(0)).slice(0, 2).join("").toUpperCase()}
                            </div>
                            {p.name}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: 22 }}>
              <label className="lg-label">Şifre</label>
              <div className="lg-input-icon-wrap">
                <div className="lg-input-icon-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                </div>
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={activeTab === "admin" ? "Admin şifresi" : "Şifreniz"} autoFocus={activeTab === "admin"}
                  className="lg-input lg-input-icon lg-input-eye" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="lg-input-eye-btn" aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="lg-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="lg-btn lg-btn-primary">
              {loading ? (
                <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "loginSpin 1s linear infinite" }}><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" /></svg>Giriş yapılıyor...</>
              ) : (
                <>Giriş Yap<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></>
              )}
            </button>
          </form>
          )}
          </div>
        </div>

        <p className="lg-footer">
          © 2025 ÇAKÜ Bilgisayar Mühendisliği · Offline Asistan
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
  const [professorList, setProfessorList] = useState([]);
  const [editingProf, setEditingProf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const profs = await DB.fetchProfessors();
      setProfessorList((profs || []).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePasswords = async () => {
    setSaving(true);
    try {
      if (activeTab === "student") {
        // Her değiştirilmiş öğrenci şifresini Cloud Functions ile kaydet
        for (const [studentNo, pass] of Object.entries(studentPasses)) {
          if (pass && pass !== '••••••') {
            await DB.changePassword('student', studentNo, pass);
          }
        }
      } else if (activeTab === "professor") {
        for (const [name, pass] of Object.entries(professorPasses)) {
          if (pass && pass !== '••••••') {
            await DB.changePassword('professor', name, pass);
          }
        }
      } else if (activeTab === "admin") {
        if (adminPass && adminPass.length >= 6) {
          await DB.changePassword('admin', null, adminPass);
        }
      }
      alert('Şifreler kaydedildi!');
      setStudentPasses({});
      setProfessorPasses({});
      setAdminPass("");
    } catch (error) {
      console.error('Error saving passwords:', error);
      alert('Hata: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProf = async (id, name) => {
    if (!confirm(`${name} isimli akademisyeni silmek istediğinize emin misiniz?`)) return;
    setSaving(true);
    try {
      await DB.deleteProfessor(id);
      const newProfs = await DB.fetchProfessors();
      setProfessorList(newProfs);
    } catch (e) {
      alert("Hata: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfessorValues = async () => {
    if (!editingProf.name || !editingProf.department) return alert("İsim ve Bölüm zorunludur.");
    setSaving(true);
    try {
      await DB.saveProfessor(editingProf);
      const newProfs = await DB.fetchProfessors();
      setProfessorList(newProfs);
      setEditingProf(null);
    } catch (e) {
      alert("Hata: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Yönetim Paneli" width={900}>
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
          <div style={{ maxHeight: 500, overflowY: 'auto', marginBottom: 24, paddingRight: 8 }}>

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
                        <Input type="password" value={studentPasses[student.studentNumber] || ''}
                          placeholder="Yeni şifre girin"
                          onChange={e => setStudentPasses(p => ({ ...p, [student.studentNumber]: e.target.value }))} />
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <button onClick={() => {
                          if (confirm('Şifreyi sıfırlamak istediğinizden emin misiniz? Kullanıcı bir sonraki girişte yeni şifre belirleyecek.')) {
                            setStudentPasses(p => ({ ...p, [student.studentNumber]: '' }));
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
              <div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                  <Btn small onClick={() => setEditingProf({ name: "", department: "" })} icon={<PlusIcon />}>Yeni Ekle</Btn>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Unvan & İsim</th>
                      <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Bölüm</th>
                      <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Şifre</th>
                      <th style={{ padding: 12, textAlign: 'center', borderBottom: `2px solid ${C.border}` }}>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* New/Editing Row at top if adding new */}
                    {editingProf && !editingProf.id && (
                      <tr style={{ background: "rgba(0,255,135,0.05)", borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: 12 }}>
                          <Input autoFocus value={editingProf.name} onChange={e => setEditingProf({ ...editingProf, name: e.target.value })} placeholder="Örn: Dr. Ali Veli" />
                        </td>
                        <td style={{ padding: 12 }}>
                          <Input value={editingProf.department} onChange={e => setEditingProf({ ...editingProf, department: e.target.value })} placeholder="Örn: Bilgisayar Müh." />
                        </td>
                        <td style={{ padding: 12, color: C.textMuted }}>-</td>
                        <td style={{ padding: 12, display: "flex", gap: 6, justifyContent: "center" }}>
                          <Btn small onClick={handleSaveProfessorValues} disabled={saving}>Kaydet</Btn>
                          <Btn small variant="secondary" onClick={() => setEditingProf(null)}>İptal</Btn>
                        </td>
                      </tr>
                    )}

                    {professorList.map((prof, idx) => {
                      const isEditing = editingProf && editingProf.id === prof.id;
                      return isEditing ? (
                        <tr key={prof.id} style={{ background: "rgba(0,255,135,0.05)", borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: 12 }}>
                            <Input value={editingProf.name} onChange={e => setEditingProf({ ...editingProf, name: e.target.value })} />
                          </td>
                          <td style={{ padding: 12 }}>
                            <Input value={editingProf.department} onChange={e => setEditingProf({ ...editingProf, department: e.target.value })} />
                          </td>
                          <td style={{ padding: 12, color: C.textMuted }}>
                            (Şifre değişmez)
                          </td>
                          <td style={{ padding: 12, display: "flex", gap: 6, justifyContent: "center" }}>
                            <Btn small onClick={handleSaveProfessorValues} disabled={saving}>Kaydet</Btn>
                            <Btn small variant="secondary" onClick={() => setEditingProf(null)}>İptal</Btn>
                          </td>
                        </tr>
                      ) : (
                        <tr key={prof.id || idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: 12, fontWeight: 600, color: C.navy }}>{prof.name}</td>
                          <td style={{ padding: 12 }}>{prof.department}</td>
                          <td style={{ padding: 12 }}>
                            <Input type="password" value={professorPasses[prof.name] || ''}
                              placeholder="Yeni şifre girin"
                              onChange={e => setProfessorPasses(p => ({ ...p, [prof.name]: e.target.value }))} />
                          </td>
                          <td style={{ padding: 12, display: "flex", gap: 6, justifyContent: "center" }}>
                            <button onClick={() => setEditingProf({ ...prof })} style={{
                              padding: "6px", border: `1px solid ${C.border}`, borderRadius: 6,
                              background: "white", cursor: "pointer", color: C.blue, display: "flex"
                            }} title="Düzenle"><EditIcon /></button>
                            <button onClick={() => handleDeleteProf(prof.id, prof.name)} style={{
                              padding: "6px", border: `1px solid ${C.border}`, borderRadius: 6,
                              background: "white", cursor: "pointer", color: C.accent, display: "flex"
                            }} title="Sil"><TrashIcon /></button>
                            <button onClick={() => {
                              if (confirm('Şifreyi sıfırlamak istediğinizden emin misiniz? Kullanıcı bir sonraki girişte yeni şifre belirleyecek.')) {
                                setProfessorPasses(p => ({ ...p, [prof.name]: '' }));
                              }
                            }} style={{
                              padding: "6px 12px", fontSize: 12, border: `1px solid ${C.border}`,
                              borderRadius: 6, background: "white", cursor: "pointer", color: C.accent,
                            }}>Şifre Sıfırla</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "admin" && (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ marginBottom: 16, fontWeight: 600, color: C.navy }}>Admin Giriş Şifresi</div>
                <div style={{ maxWidth: 300, margin: '0 auto' }}>
                  <Input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="Yeni admin şifresi" style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2 }} />
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: C.textMuted }}>
                  Bu şifre ile Admin paneline erişim sağlanır.
                </div>
              </div>
            )}

          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <Btn onClick={onClose} variant="secondary">Kapat</Btn>
            <Btn onClick={handleSavePasswords} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Şifreleri Kaydet'}</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── Grade Converter Widget ──
const GradeConverter = () => {
  const [activeTab, setActiveTab] = useState("table1");
  const [inputGrade, setInputGrade] = useState("");
  const [result, setResult] = useState(null);

  // ── Table Definitions ──
  const TABLE_DATA = {
    table1: {
      title: "Tablo 1 (100'lük)",
      desc: "100'lük Sistem -> Harf Notu",
      placeholder: "Not (0-100)",
      type: "range",
      columns: ["Tanım (English)", "Sayısal (Numeric)", "Karsılık"],
      data: [
        { text: "very good", range: "90-100", min: 90, max: 100, eq: "A", color: "#10B981" },
        { text: "good +", range: "85-89", min: 85, max: 89, eq: "B1", color: "#3B82F6" },
        { text: "good", range: "80-84", min: 80, max: 84, eq: "B2", color: "#60A5FA" },
        { text: "sufficient +", range: "75-79", min: 75, max: 79, eq: "B3", color: "#93C5FD" },
        { text: "sufficient", range: "70-74", min: 70, max: 74, eq: "C1", color: "#F59E0B" },
        { text: "allowing +", range: "65-69", min: 65, max: 69, eq: "C2", color: "#FBBF24" },
        { text: "allowing", range: "60-64", min: 60, max: 64, eq: "C3", color: "#FCD34D" },
        { text: "insufficient", range: "50-59", min: 50, max: 59, eq: "F1", color: "#EF4444" },
        { text: "insufficient", range: "0-49", min: 0, max: 49, eq: "F2", color: "#DC2626" },
      ]
    },
    table2: {
      title: "Tablo 2 (Katsayı)",
      desc: "100'lük -> Katsayı -> Harf",
      placeholder: "Not (0-100)",
      type: "range",
      columns: ["Sayısal Notlar", "Katsayılar", "Karsılık"],
      data: [
        { range: "90-100", min: 90, max: 100, coef: "4,00", eq: "A", color: "#10B981" },
        { range: "85-89", min: 85, max: 89, coef: "3,50", eq: "B1", color: "#3B82F6" },
        { range: "80-84", min: 80, max: 84, coef: "3,25", eq: "B2", color: "#60A5FA" },
        { range: "75-79", min: 75, max: 79, coef: "3,00", eq: "B3", color: "#93C5FD" },
        { range: "70-74", min: 70, max: 74, coef: "2,50", eq: "C1", color: "#F59E0B" },
        { range: "65-69", min: 65, max: 69, coef: "2,25", eq: "C2", color: "#FBBF24" },
        { range: "60-64", min: 60, max: 64, coef: "2,00", eq: "C3", color: "#FCD34D" },
        { range: "50-59", min: 50, max: 59, coef: "1,50", eq: "F1", color: "#EF4444" },
        { range: "0-49", min: 0, max: 49, coef: "0,00", eq: "F2", color: "#DC2626" },
      ]
    },
    table3: {
      title: "Tablo 3 (Harf/4'lük)",
      desc: "Basarı Notu / Harf -> Karsılık",
      placeholder: "Not (örn: 3.50 veya BA)",
      type: "mixed",
      columns: ["Basarı Notu", "Harf Notu", "Karsılık"],
      data: [
        { val: 4.00, letter: "AA", eq: "A", color: "#10B981" },
        { val: 3.50, letter: "BA", eq: "B1", color: "#3B82F6" },
        { val: 3.00, letter: "BB", eq: "B2", color: "#60A5FA" },
        { val: 2.50, letter: "CB", eq: "B3", color: "#93C5FD" },
        { val: 2.00, letter: "CC", eq: "C1", color: "#F59E0B" },
        { val: 1.50, letter: "DC", eq: "C2", color: "#FBBF24" },
        { val: 1.00, letter: "DD", eq: "C3", color: "#FCD34D" },
        { val: 0.00, letter: "FF", eq: "F1", color: "#EF4444" },
        { val: 0.00, letter: "FD", eq: "F2", color: "#DC2626" },
        { text: "-", letter: "Sınava girmedi", eq: "FF1", color: "#991B1B" },
        { text: "-", letter: "Devamsızlıktan kaldı", eq: "FF2", color: "#7F1D1D" },
      ]
    },
    ects_conv: {
      title: "ECTS Dönüşüm",
      desc: "ECTS Notu -> Kurum Notu",
      placeholder: "ECTS Notu (A, B...)",
      type: "match",
      columns: ["ECTS Notu", "Acıklama", "Karsılık"],
      data: [
        { eq: "A", def: "excellent", u_eq: "A", color: "#10B981" },
        { eq: "B", def: "very good", u_eq: "B1", color: "#3B82F6" },
        { eq: "C", def: "good", u_eq: "B2", color: "#60A5FA" },
        { eq: "D", def: "satisfactory", u_eq: "C1", color: "#F59E0B" },
        { eq: "E", def: "sufficient", u_eq: "C3", color: "#FCD34D" },
        { eq: "FX", def: "failed", u_eq: "F1", color: "#EF4444" },
        { eq: "F", def: "failed", u_eq: "F2", color: "#DC2626" },
      ]
    },
    table4: {
      title: "ECTS Tanım",
      desc: "ECTS Notu -> Tanım (Referans)",
      placeholder: "ECTS Notu (A, B, C...)",
      type: "match",
      columns: ["ECTS Grade", "% of successful students", "Definition"],
      data: [
        { eq: "A", pct: "10", def: "EXCELLENT - outstanding performance with only minor errors", color: "#10B981" },
        { eq: "B", pct: "25", def: "VERY GOOD - above the average standard but with some errors", color: "#3B82F6" },
        { eq: "C", pct: "30", def: "GOOD - generally sound work with a number of notable errors", color: "#60A5FA" },
        { eq: "D", pct: "25", def: "SATISFACTORY - fair but with significant shortcomings", color: "#F59E0B" },
        { eq: "E", pct: "10", def: "SUFFICIENT - performance meets the minimum criteria", color: "#FBBF24" },
        { eq: "FX", pct: "-", def: "FAIL - some more work required before the credit can be awarded", color: "#EF4444" },
        { eq: "F", pct: "-", def: "FAIL - considerable further work is required", color: "#DC2626" },
      ]
    },
    system10: {
      title: "10'luk Sistem",
      desc: "10'luk Sistem -> Harf Notu",
      placeholder: "Not (0-10)",
      type: "exact",
      columns: ["Not", "Acıklama", "Karsılık"],
      data: [
        { val: 10, text: "with distinctions", eq: "A", color: "#10B981" },
        { val: 9, text: "excellent", eq: "B1", color: "#3B82F6" },
        { val: 8, text: "very good", eq: "B2", color: "#60A5FA" },
        { val: 7, text: "good", eq: "B3", color: "#93C5FD" },
        { val: 6, text: "almost good", eq: "C1", color: "#F59E0B" },
        { val: 5, text: "satisfactory", eq: "C2", color: "#FBBF24" },
        { val: 4, text: "almost satisfactory", eq: "C3", color: "#FCD34D" },
        { val: 3, text: "not passed or failed", eq: "F2", color: "#EF4444" },
        { val: 2, text: "not passed or failed", eq: "F2", color: "#EF4444" },
        { val: 1, text: "not passed or failed", eq: "F2", color: "#EF4444" },
        { val: 0, text: "not passed or failed", eq: "F2", color: "#EF4444" },
      ]
    },
    system5a: {
      title: "5'lik (A)",
      desc: "5'lik Sistem (Tip A) -> Harf",
      placeholder: "Not (0-5)",
      type: "exact",
      columns: ["Not", "Acıklama", "Karsılık"],
      data: [
        { val: 5, text: "very good", eq: "A", color: "#10B981" },
        { val: 4.5, text: "good +", eq: "B1", color: "#3B82F6" },
        { val: 4, text: "good", eq: "B2", color: "#60A5FA" },
        { val: 3.5, text: "sufficient +", eq: "B3", color: "#93C5FD" },
        { val: 3, text: "sufficient", eq: "C1", color: "#F59E0B" },
        { val: 2.5, text: "allowing +", eq: "C2", color: "#FBBF24" },
        { val: 2, text: "allowing", eq: "C3", color: "#FCD34D" },
        { val: 1.5, text: "insufficient", eq: "F2", color: "#EF4444" },
        { val: 1, text: "insufficient", eq: "F2", color: "#EF4444" },
        { val: 0.5, text: "insufficient", eq: "F2", color: "#EF4444" },
        { val: 0, text: "insufficient", eq: "F2", color: "#EF4444" },
      ]
    },
    system5b: {
      title: "5'lik (B/D)",
      desc: "5'lik Sistem (Tip B/D) -> Harf",
      placeholder: "Not (0-5)",
      type: "exact",
      columns: ["Not", "Acıklama", "Karsılık"],
      data: [
        { val: 5, text: "very good", eq: "A", color: "#10B981" },
        { val: 4.5, text: "better than good", eq: "B1", color: "#3B82F6" },
        { val: 4, text: "good", eq: "B2", color: "#60A5FA" },
        { val: 3.5, text: "better than satisfactory", eq: "C1", color: "#F59E0B" },
        { val: 3, text: "satisfactory", eq: "C2", color: "#FBBF24" },
        { val: 2.5, text: "satisfactory", eq: "C3", color: "#FCD34D" },
        { val: 2, text: "failure", eq: "F2", color: "#EF4444" },
        { val: 1.5, text: "failure", eq: "F2", color: "#EF4444" },
        { val: 1, text: "failure", eq: "F2", color: "#EF4444" },
        { val: 0.5, text: "failure", eq: "F2", color: "#EF4444" },
        { val: 0, text: "failure", eq: "F2", color: "#EF4444" },
      ]
    },
    system5c: {
      title: "5'lik (C)",
      desc: "5'lik Sistem (Tip C - Tam Sayı) -> Harf",
      placeholder: "Not (0-5)",
      type: "exact",
      columns: ["Not", "Acıklama", "Karsılık"],
      data: [
        { val: 5, text: "excellent", eq: "A", color: "#10B981" },
        { val: 4, text: "good", eq: "B2", color: "#60A5FA" },
        { val: 3, text: "satisfactory", eq: "C1", color: "#F59E0B" },
        { val: 2, text: "passed", eq: "C3", color: "#FCD34D" },
        { val: 1, text: "failed", eq: "F1", color: "#EF4444" },
        { val: 0, text: "failed", eq: "F2", color: "#DC2626" },
      ]
    },
  };

  const calculateGrade = (val, tableKey) => {
    if (!val) return null;
    const table = TABLE_DATA[tableKey];
    const num = parseFloat(val);
    const str = String(val).trim().toUpperCase();

    if (table.type === "range") {
      if (isNaN(num)) return null;
      return table.data.find(row => num >= row.min && num <= row.max) || null;
    }
    else if (table.type === "exact") {
      if (isNaN(num)) return null;
      // Precision handle for 4.5 vs 4,5
      return table.data.find(row => Math.abs(row.val - num) < 0.1) || null;
    }
    else if (table.type === "mixed") {
      // Try string match (AA, BA...)
      const strMatch = table.data.find(row => row.letter && row.letter.toUpperCase() === str);
      if (strMatch) return strMatch;
      // Try number match (4.00, 3.50...)
      if (!isNaN(num)) return table.data.find(row => row.val !== undefined && Math.abs(row.val - num) < 0.01) || null;
      return null;
    }
    else if (table.type === "match") {
      return table.data.find(row => row.eq === str) || null;
    }
    return null;
  };

  useEffect(() => {
    setResult(calculateGrade(inputGrade, activeTab));
  }, [inputGrade, activeTab]);

  const activeData = TABLE_DATA[activeTab];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, borderBottom: "1px solid #E5E7EB", marginBottom: 20 }}>
        {Object.entries(TABLE_DATA).map(([key, t]) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setInputGrade(""); setResult(null); }}
            style={{
              padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", cursor: "pointer",
              background: activeTab === key ? "#EEF2FF" : "transparent",
              color: activeTab === key ? "#4F46E5" : "#6B7280",
              border: activeTab === key ? "1px solid #C7D2FE" : "1px solid transparent",
              transition: "all 0.2s"
            }}
          >
            {t.title}
          </button>
        ))}
      </div>

      {/* Input Section */}
      <div style={{ background: "#F3F4F6", padding: 20, borderRadius: 12, marginBottom: 24, textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#6B7280", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {activeData.desc}
        </div>
        <div style={{ display: "flex", gap: 12, maxWidth: 320, margin: "0 auto" }}>
          <Input
            value={inputGrade}
            onChange={e => setInputGrade(e.target.value)}
            placeholder={activeData.placeholder}
            style={{ textAlign: "center", fontSize: 16, padding: 12 }}
          />
        </div>

        {result && (
          <div style={{ marginTop: 20, animation: "fadeIn 0.3s ease" }}>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>Dönüştürülen Not</div>
            <div style={{
              fontSize: 48, fontWeight: 700,
              color: result.color || "#374151",
              fontFamily: "'Playfair Display', serif",
              lineHeight: 1
            }}>
              {result.u_eq || result.eq || result.def}
            </div>
            {result.text && <div style={{ fontSize: 14, fontWeight: 500, color: "#374151", marginTop: 8 }}>{result.text}</div>}
            {activeTab === "ects_conv" && <div style={{ fontSize: 14, fontWeight: 500, color: "#374151", marginTop: 8 }}>{result.def}</div>}
            {activeTab === "table4" && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 8, maxWidth: 300, margin: "8px auto" }}>{result.def}</div>}
          </div>
        )}
      </div>

      {/* Reference Table */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
              {activeData.columns.map((col, i) => (
                <th key={i} style={{ padding: "12px 16px", textAlign: i === 0 ? "left" : "center", color: "#6B7280", fontWeight: 600 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeData.data.map((row, i) => {
              // Highlight logic varies by table
              let isActive = false;
              if (result) {
                if (activeTab === "table4") isActive = result.eq === row.eq;
                else if (activeTab === "ects_conv") isActive = result.eq === row.eq;
                else if (row.eq) isActive = result.eq === row.eq;
              }

              return (
                <tr key={i} style={{
                  background: isActive ? `${row.color}15` : "white",
                  borderBottom: i !== activeData.data.length - 1 ? "1px solid #F3F4F6" : "none",
                  transition: "background 0.2s"
                }}>
                  {/* Render columns based on table type */}
                  {activeTab === "table1" && (
                    <>
                      <td style={{ padding: "10px 16px", color: "#111827", fontWeight: 500 }}>{row.text}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{row.range}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}><Badge color="white" bg={result && result.eq === row.eq ? row.color : "#9CA3AF"}>{row.eq}</Badge></td>
                    </>
                  )}
                  {activeTab === "table2" && (
                    <>
                      <td style={{ padding: "10px 16px", color: "#111827", fontWeight: 500 }}>{row.range}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{row.coef}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}><Badge color="white" bg={result && result.eq === row.eq ? row.color : "#9CA3AF"}>{row.eq}</Badge></td>
                    </>
                  )}
                  {activeTab === "table3" && (
                    <>
                      <td style={{ padding: "10px 16px", color: "#111827", fontWeight: 500 }}>{row.val !== undefined ? row.val.toFixed(2) : row.text}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{row.letter}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}><Badge color="white" bg={result && result.eq === row.eq ? row.color : "#9CA3AF"}>{row.eq}</Badge></td>
                    </>
                  )}
                  {activeTab === "ects_conv" && (
                    <>
                      <td style={{ padding: "10px 16px", color: "#111827", fontWeight: 500, textAlign: "center" }}><Badge color="white" bg={row.color}>{row.eq}</Badge></td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}>{row.def}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}><Badge color="white" bg={result && result.u_eq === row.u_eq ? row.color : "#9CA3AF"}>{row.u_eq}</Badge></td>
                    </>
                  )}
                  {activeTab === "table4" && (
                    <>
                      <td style={{ padding: "10px 16px", color: "#111827", fontWeight: 500, textAlign: "center" }}><Badge color="white" bg={row.color}>{row.eq}</Badge></td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}>{row.pct}</td>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: "#4B5563" }}>{row.def}</td>
                    </>
                  )}
                  {(activeTab.startsWith("system10") || activeTab.startsWith("system5")) && (
                    <>
                      <td style={{ padding: "10px 16px", color: "#111827", fontWeight: 500 }}>{row.val}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}>{row.text}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}><Badge color="white" bg={result && result.eq === row.eq ? row.color : "#9CA3AF"}>{row.eq}</Badge></td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// Şifre Değiştir Modal (tüm roller için)
// ══════════════════════════════════════════════
const ChangePasswordModal = ({ currentUser, onClose }) => {
  const { useState } = React;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const eyeIcon = (show) => show
    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) { setError("Yeni şifre en az 6 karakter olmalıdır."); return; }
    if (newPassword !== confirmPassword) { setError("Yeni şifreler uyuşmuyor."); return; }

    setLoading(true);
    try {
      const role = currentUser.role;
      const identifier = role === "student" ? currentUser.studentNumber
        : role === "professor" ? currentUser.name
        : role === "bolum_yetkilisi" ? currentUser.name
        : null;

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("caku_auth_token") || ""}` },
        body: JSON.stringify({ role, identifier, newPassword, currentPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      } else {
        setError(data.error || "Şifre değiştirilemedi.");
      }
    } catch (err) {
      setError("Sunucu hatası: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputWrap = { position: "relative", marginBottom: 16 };
  const inputStyle = { width: "100%", padding: "11px 42px 11px 14px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14, outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", transition: "border-color 0.2s" };
  const eyeBtn = { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", display: "flex", alignItems: "center", padding: 4 };
  const label = { display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 };

  return (
    <Modal open={true} onClose={onClose} title="Şifre Değiştir" width={400}>
      {success ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#059669", marginBottom: 8 }}>Şifre başarıyla değiştirildi!</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>Bir sonraki girişinizde yeni şifrenizi kullanın.</div>
          <Btn onClick={onClose}>Kapat</Btn>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 8, padding: "10px 14px", borderRadius: 8, background: "#F3F4F6", fontSize: 13, color: "#374151" }}>
            <span style={{ fontWeight: 600 }}>{currentUser?.name || currentUser?.studentNumber}</span>
            <span style={{ color: "#9CA3AF", marginLeft: 8, fontSize: 11 }}>
              {currentUser?.role === "admin" ? "Yönetici" : currentUser?.role === "professor" ? "Akademisyen" : currentUser?.role === "bolum_yetkilisi" ? "Bölüm Yetkilisi" : "Öğrenci"}
            </span>
          </div>

          <div style={{ height: 1, background: "#E5E7EB", margin: "16px 0" }} />

          {/* Mevcut şifre — admin için gerekli değil */}
          {currentUser?.role !== "admin" && (
            <div>
              <label style={label}>Mevcut Şifre</label>
              <div style={inputWrap}>
                <input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Mevcut şifreniz" style={inputStyle} onFocus={e => e.target.style.borderColor = "#6366F1"} onBlur={e => e.target.style.borderColor = "#D1D5DB"} />
                <button type="button" style={eyeBtn} onClick={() => setShowCurrent(!showCurrent)}>{eyeIcon(showCurrent)}</button>
              </div>
            </div>
          )}

          <label style={label}>Yeni Şifre</label>
          <div style={inputWrap}>
            <input type={showNew ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="En az 6 karakter" style={inputStyle} onFocus={e => e.target.style.borderColor = "#6366F1"} onBlur={e => e.target.style.borderColor = "#D1D5DB"} />
            <button type="button" style={eyeBtn} onClick={() => setShowNew(!showNew)}>{eyeIcon(showNew)}</button>
          </div>
          {newPassword.length > 0 && (
            <div style={{ marginTop: -10, marginBottom: 12, display: "flex", gap: 4 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: newPassword.length >= i * 4 ? (newPassword.length >= 10 ? "#10B981" : "#F59E0B") : "#E5E7EB", transition: "background 0.3s" }} />
              ))}
              <span style={{ fontSize: 10, color: newPassword.length >= 10 ? "#10B981" : "#F59E0B", marginLeft: 6, alignSelf: "center" }}>{newPassword.length >= 10 ? "Güçlü" : "Orta"}</span>
            </div>
          )}

          <label style={label}>Yeni Şifre (Tekrar)</label>
          <div style={inputWrap}>
            <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Şifreyi tekrar girin" style={{ ...inputStyle, borderColor: confirmPassword && confirmPassword !== newPassword ? "#EF4444" : "#D1D5DB" }} onFocus={e => e.target.style.borderColor = "#6366F1"} onBlur={e => e.target.style.borderColor = confirmPassword && confirmPassword !== newPassword ? "#EF4444" : "#D1D5DB"} />
            <button type="button" style={eyeBtn} onClick={() => setShowConfirm(!showConfirm)}>{eyeIcon(showConfirm)}</button>
          </div>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>İptal</Btn>
            <button type="submit" disabled={loading} style={{ flex: 2, padding: "10px 16px", borderRadius: 8, border: "none", background: loading ? "#A5B4FC" : "#6366F1", color: "white", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s" }}>
              {loading ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93"/></svg>Kaydediliyor...</> : "Şifreyi Değiştir"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// Student Notifier — "Benim Sayfam" bildirim sistemi
// student_notifications koleksiyonuna düşer, Benim Sayfam dinler
// ══════════════════════════════════════════════════════════════
const StudentNotifier = {
  async _fetchStudents() {
    try {
      return await FirebaseDB.fetchStudents();
    } catch (e) {
      console.warn("StudentNotifier: öğrenciler alınamadı", e);
      return [];
    }
  },
  async _fetchCoursesByCode(departmentId, code) {
    try {
      var snap = await window.apiFirestore.collection("sinav_dersler").get();
      var all = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      var normalized = (code || "").toString().trim().toLowerCase();
      return all.filter(function (c) {
        if (!normalized) return false;
        if (departmentId && c.departmentId !== departmentId) return false;
        return (c.code || "").toString().trim().toLowerCase() === normalized;
      });
    } catch (e) {
      console.warn("StudentNotifier: dersler alınamadı", e);
      return [];
    }
  },
  async _addNotification(studentNumber, payload) {
    try {
      var data = Object.assign({
        studentNumber: String(studentNumber),
        read: false,
        createdAt: new Date().toISOString(),
      }, payload);
      await FirestoreWrite.add("student_notifications", data);
    } catch (e) {
      console.warn("StudentNotifier: bildirim eklenemedi", studentNumber, e);
    }
  },
  async fetchForStudent(studentNumber, limitN) {
    try {
      var items = await apiRead("student_notifications", {
        where: "studentNumber:eq:s:" + String(studentNumber),
      });
      items.sort(function (a, b) {
        var ta = new Date(a.createdAt || 0).getTime();
        var tb = new Date(b.createdAt || 0).getTime();
        return tb - ta;
      });
      if (limitN) return items.slice(0, limitN);
      return items;
    } catch (e) {
      console.warn("StudentNotifier: liste alınamadı", e);
      return [];
    }
  },
  async markRead(id) {
    try { await FirestoreWrite.update("student_notifications", String(id), { read: true }); }
    catch (e) { console.warn("StudentNotifier: okundu yapılamadı", e); }
  },
  async markAllRead(studentNumber) {
    try {
      var items = await this.fetchForStudent(studentNumber);
      var ops = items.filter(function (n) { return !n.read; }).map(function (n) {
        return FirestoreWrite.update("student_notifications", String(n.id), { read: true });
      });
      await Promise.all(ops);
    } catch (e) { console.warn("StudentNotifier: toplu okundu hatası", e); }
  },
  // Bir dersle ilgili proje grubu oluştuğunda o dersi almış öğrencilere bildirim yolla
  async notifyCourseStudents(departmentId, courseCode, payload) {
    try {
      var courses = await this._fetchCoursesByCode(departmentId, courseCode);
      if (courses.length === 0) return;
      var courseIds = courses.map(function (c) { return c.id; });
      var students = await this._fetchStudents();
      var targets = students.filter(function (s) {
        if (!Array.isArray(s.myCourseIds) || s.myCourseIds.length === 0) return false;
        if (departmentId && s.departmentId !== departmentId) return false;
        return s.myCourseIds.some(function (id) { return courseIds.indexOf(id) !== -1; });
      });
      await Promise.all(targets.map(function (s) {
        return StudentNotifier._addNotification(s.studentNumber, payload);
      }));
    } catch (e) {
      console.warn("StudentNotifier: ders bildirimi gönderilemedi", e);
    }
  },
  // Portal duyurusunda bölüm öğrencilerinin tümüne bildirim yolla
  async notifyDepartmentStudents(departmentId, payload, excludeStudentNumber) {
    try {
      var students = await this._fetchStudents();
      var targets = students.filter(function (s) {
        if (departmentId && s.departmentId !== departmentId) return false;
        if (excludeStudentNumber && String(s.studentNumber) === String(excludeStudentNumber)) return false;
        return true;
      });
      await Promise.all(targets.map(function (s) {
        return StudentNotifier._addNotification(s.studentNumber, payload);
      }));
    } catch (e) {
      console.warn("StudentNotifier: bölüm bildirimi gönderilemedi", e);
    }
  },
};
window.StudentNotifier = StudentNotifier;

// ── Export to window ──
window.C = C;
window.FONTS_LINK = FONTS_LINK;
window.sharedStyles = sharedStyles;
window.HOME_INSTITUTION_CATALOG = HOME_INSTITUTION_CATALOG;
window.GRADE_CONVERSION = GRADE_CONVERSION;
window.convertGrade = convertGrade;
window.DB = DB;
window.Auth = Auth;
window.PasswordSecurity = PasswordSecurity;
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
window.ChangePasswordModal = ChangePasswordModal;
