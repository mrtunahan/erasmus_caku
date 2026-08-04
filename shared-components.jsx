// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Ortak Bileşenler
// ══════════════════════════════════════════════════════════════
// Token'ların gerçek kaynağı design-tokens.json — JSON import'u Vite'ın
// hem dev hem prod modunda sorunsuz çalışır (.cjs import'u dev'de patlıyordu).
import T_TOKENS from './design-tokens.json';

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
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
      cancelAnimationFrame(raf);
    };
  }, []);
  return {
    width,
    isMobile: width <= 480,
    isTablet: width > 480 && width <= 768,
    isSmallDesktop: width > 768 && width <= 1024,
    isDesktop: width > 1024,
    // Responsive değerler için yardımcı
    val: (mobile, tablet, desktop) =>
      width <= 480 ? mobile : width <= 768 ? (tablet ?? mobile) : (desktop ?? tablet ?? mobile),
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
  async hashPassword(password) {
    return password;
  },
  isHashed() {
    return false;
  },
  async verifyPassword() {
    return false;
  },
  async migrateIfNeeded(stored) {
    return stored;
  },
};

// ── Color Palette ──
// ── C: Geriye dönük uyumluluk — design-tokens'tan türetilmiş alias.
// Yeni kod doğrudan T'yi (window.T) veya Tailwind class'larını kullanmalı.
const C = {
  bg: T_TOKENS.color.bg,
  card: T_TOKENS.color.surface,
  navy: T_TOKENS.color.navy,
  navyLight: T_TOKENS.color.navyLight,
  gold: T_TOKENS.color.gold,
  goldLight: T_TOKENS.color.goldLight,
  goldPale: T_TOKENS.color.goldPale,
  accent: T_TOKENS.color.accent,
  accentLight: T_TOKENS.color.accentLight,
  green: T_TOKENS.color.success,
  greenLight: T_TOKENS.color.successPale,
  text: T_TOKENS.color.text,
  textMuted: T_TOKENS.color.textMuted,
  border: T_TOKENS.color.border,
  borderLight: T_TOKENS.color.borderSoft,
  blue: T_TOKENS.color.info,
  blueLight: T_TOKENS.color.infoPale,
};

// ── Tasarım Sistemi Tokenları (CSS değişkenleri + JS objesi) ──
// Tüm modüller bunları kullanarak görsel tutarlılık sağlar.
// CSS tarafında: var(--color-primary), var(--radius-md) vb.
// JS tarafında: window.T.color.primary, window.T.radius.md
// Tasarım tokenları design-tokens.cjs'den geliyor — TEK kaynak.
// Tailwind config de aynı dosyayı okuyor.
const T = T_TOKENS;
if (typeof window !== 'undefined') window.T = T;

// Tema CSS değişkenlerini :root'a enjekte et (idempotent)
if (typeof document !== 'undefined' && !document.getElementById('__caku-tokens')) {
  const css = `:root{
    --color-primary:${T.color.primary};--color-primary-pale:${T.color.primaryPale};--color-primary-strong:${T.color.primaryStrong};
    --color-navy:${T.color.navy};--color-text:${T.color.text};--color-text-muted:${T.color.textMuted};
    --color-bg:${T.color.bg};--color-surface:${T.color.surface};--color-surface-muted:${T.color.surfaceMuted};
    --color-border:${T.color.border};--color-border-strong:${T.color.borderStrong};
    --color-success:${T.color.success};--color-success-pale:${T.color.successPale};
    --color-danger:${T.color.danger};--color-danger-pale:${T.color.dangerPale};
    --color-warning:${T.color.warning};--color-warning-pale:${T.color.warningPale};
    --color-info:${T.color.info};--color-info-pale:${T.color.infoPale};
    --radius-xs:${T.radius.xs};--radius-sm:${T.radius.sm};--radius-md:${T.radius.md};--radius-lg:${T.radius.lg};--radius-xl:${T.radius.xl};--radius-pill:${T.radius.pill};
    --shadow-sm:${T.shadow.sm};--shadow-md:${T.shadow.md};--shadow-lg:${T.shadow.lg};
    --space-xs:${T.space.xs}px;--space-sm:${T.space.sm}px;--space-md:${T.space.md}px;--space-lg:${T.space.lg}px;--space-xl:${T.space.xl}px;--space-xxl:${T.space.xxl}px;
    --font-family:${T.font.family};
  }`;
  const el = document.createElement('style');
  el.id = '__caku-tokens';
  el.textContent = css;
  document.head.appendChild(el);
}

// ── DY: Geriye dönük uyumluluk — design-tokens'tan türetilmiş alias.
const DY = {
  bg: T_TOKENS.color.surfaceMuted,
  card: T_TOKENS.color.surface,
  gold: T_TOKENS.color.gold,
  goldLight: T_TOKENS.color.goldLight,
  goldDark: T_TOKENS.color.gold,
  navy: T_TOKENS.color.navy,
  navyLight: T_TOKENS.color.navyLight,
  green: T_TOKENS.color.success,
  greenLight: T_TOKENS.color.successPale,
  text: T_TOKENS.color.text,
  textLight: T_TOKENS.color.textMuted,
  border: T_TOKENS.color.border,
  shadow: T_TOKENS.shadow.md,
  hover: T_TOKENS.color.surfaceMuted,
  warmLight: T_TOKENS.color.warningPale,
};

// ── Daisy Theme Icons ──
const ICONS = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  calendar:
    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  chart:
    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  filter:
    'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
  plus: 'M12 4v16m8-8H4',
  dots: 'M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z',
  heart:
    'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  message:
    'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  share:
    'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
  bookmark: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z',
  check: 'M5 13l4 4L19 7',
  x: 'M6 18L18 6M6 6l12 12',
  chevronDown: 'M19 9l-7 7-7-7',
};

// ── Inject Daisy Theme Styles Global ──
(function () {
  const style = document.createElement('style');
  style.id = 'portal-daisy-style';
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
    '#EF4444',
    '#F97316',
    '#EAB308',
    '#22C55E',
    '#10B981',
    '#06B6D4',
    '#3B82F6',
    '#6366F1',
    '#8B5CF6',
    '#A855F7',
    '#EC4899',
    '#F43F5E',
  ];
  return colors[Math.abs(hash) % colors.length];
};

// ══════════════════════════════════════════════════════════════
// Mühendislik Fakültesi - Bölüm Tanımlamaları
// ══════════════════════════════════════════════════════════════
const FACULTY = {
  name: 'Mühendislik Fakültesi',
  university: 'Çankırı Karatekin Üniversitesi',
};

const DEPARTMENTS = [
  {
    id: 'bilgisayar',
    name: 'Bilgisayar Mühendisliği',
    shortName: 'Bilgisayar',
    color: '#3B82F6',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    id: 'elektrik',
    name: 'Elektrik ve Elektronik Mühendisliği',
    shortName: 'Elektrik-Elektronik',
    color: '#EAB308',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    id: 'makine',
    name: 'Makine Mühendisliği',
    shortName: 'Makine',
    color: '#EF4444',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    id: 'insaat',
    name: 'İnşaat Mühendisliği',
    shortName: 'İnşaat',
    color: '#F97316',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
  {
    id: 'gida',
    name: 'Gıda Mühendisliği',
    shortName: 'Gıda',
    color: '#22C55E',
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  },
  {
    id: 'kimya',
    name: 'Kimya Mühendisliği',
    shortName: 'Kimya',
    color: '#8B5CF6',
    icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  },
];

// Çekirdek 6 bölüm Mühendislik fakültesine aittir — fakülte kapsamı
// filtrelemesi (sağ sidebar bölüm geçişi) bu alanı kullanır.
DEPARTMENTS.forEach((d) => {
  if (!d.facultyId) d.facultyId = 'muhendislik';
});

// Bölüm bazlı modüller (her bölüm yetkilisi bunlara erişir)
const DEPARTMENT_MODULES = [
  {
    id: 'erasmus',
    label: 'Erasmus',
    icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
  },
  { id: 'muafiyet', label: 'Ders Muafiyet', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  {
    // Dikey Geçiş — Ders Muafiyet'ten ayrılan modül. Altyapı aynı kalır
    // (eşleştirme + dilekçe); yalnız başvuru türü sabittir.
    id: 'dikeygecis',
    label: 'Dikey Geçiş',
    icon: 'M12 19V5m0 0l-7 7m7-7l7 7',
  },
  {
    // Yatay Geçiş — üç türü (kurum içi · kurumlararası · merkezi yerleştirme)
    // kendi sekmelerinde yürüten ayrı modül. Ders Muafiyet'ten ayrıldı.
    id: 'yataygecis',
    label: 'Yatay Geçiş',
    icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  },
  {
    id: 'capyandal',
    label: 'ÇAP / Yandal',
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  },
  {
    id: 'staj',
    label: 'Staj',
    icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    id: 'sinav',
    label: 'Sınav Otomasyonu',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  },
  {
    id: 'dersprogrami',
    label: 'Ders Programı',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'lisansustu',
    label: 'Lisansüstü',
    icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.42a12 12 0 01.84 4.42c0 3.31-3.13 6-7 6s-7-2.69-7-6c0-1.55.42-3.04 1.16-4.42L12 14z',
  },
  {
    id: 'projeler',
    // Modülün kendi sayfa başlığı da "Proje Grupları" — sidebar etiketi
    // onunla aynı olsun ve ortak modüllerdeki "Projeler" ile karışmasın.
    label: 'Proje Grupları',
    icon: 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z',
  },

  {
    id: 'formlar',
    label: 'Formlar',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    id: 'performans',
    label: 'Performans Modülü',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    id: 'benim',
    label: 'Benim Sayfam',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
];

// Ortak modüller (tüm bölümler için)
const COMMON_MODULES = [
  {
    id: 'gelenbelgeler',
    label: 'Gelen / Giden Belgeler',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    id: 'portal',
    label: 'Öğrenci Portalı',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    // Proje destek programları (ÜNİDES, TÜBİTAK 2209 vb.) — eski adı
    // "Yol Haritaları" idi; o ad artık ayrı bir modüle ait.
    id: 'roadmaps',
    label: 'Projeler',
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  },
  {
    // Bölüm yetkilisinin herhangi bir modül/sekme için yazdığı adım adım
    // rehberler. Öğrenci tarafı salt-okunur; sağdaki listeden modül/sekme
    // seçip ilgili yol haritasını görür.
    id: 'yolharitalari',
    label: 'Yol Haritaları',
    icon: 'M9 5l7 7-7 7M5 5l7 7-7 7',
  },
  {
    id: 'kulupler',
    label: 'Öğrenci Kulüpleri',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    id: 'anket',
    label: 'Anketler',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  },
];

// Admin-only modüller
const ADMIN_MODULES = [
  {
    id: 'kullanici',
    label: 'Kullanıcı Yönetimi',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  },
  {
    id: 'bolumyonetimi',
    label: 'Bölüm Yönetimi',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
  {
    id: 'dersyonetimi',
    label: 'Ders Yönetimi',
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  },
  {
    id: 'komisyonlar',
    label: 'Komisyonlar',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    id: 'akademiktakvim',
    label: 'Akademik Takvim',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'sablonlar',
    label: 'Şablonlar',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    id: 'audit',
    label: 'Audit Log',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  },
];

// Hiyerarşi yönetim modülleri — yetki bayrağına göre gösterilir
// (univ → isUniversityAdmin, fakulte → isFacultyManager)
const HIERARCHY_MODULES = [
  {
    id: 'univ',
    label: 'Üniversite Yönetimi',
    flag: 'isUniversityAdmin',
    icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
  },
  {
    id: 'fakulte',
    label: 'Fakülte Yönetimi',
    flag: 'isFacultyManager',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
  {
    id: 'akreditasyon',
    label: 'Akreditasyon',
    flag: 'isFacultyManager',
    icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  },
];

window.FACULTY = FACULTY;
window.DEPARTMENTS = DEPARTMENTS;

// Akademisyen-bölüm eşleşme kontrolü — modüllerin ortak kullanımı için.
// Bir akademisyen aşağıdaki durumlardan herhangi birinde belirtilen bölümde
// sayılır:
//   1. ana bölümü: prof.departmentId === deptId
//   2. ek bölüm listesi: prof.additionalDepartments içerir deptId'yi
//   3. eski/ham veride sadece ad eşleşmesi (departmentId hiç yoksa)
// Modüller (proje, sınav otomasyonu, ders programı, anketler, kullanıcı
// yönetimi) bu fonksiyonu kullanarak çapraz-bölüm akademisyen atamalarını
// otomatik destekler.
window.profMatchesDept = function (prof, deptId, deptName) {
  if (!prof || !deptId) return false;
  if (prof.departmentId === deptId) return true;
  const extras = Array.isArray(prof.additionalDepartments) ? prof.additionalDepartments : [];
  if (extras.includes(deptId)) return true;
  // Ham veri fallback: departmentId boşsa ad ile dene
  if (!prof.departmentId && deptName && prof.department) {
    const norm = (s) => (s || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, '');
    if (norm(prof.department) === norm(deptName)) return true;
  }
  return false;
};
// Bir bölümün TÜM kimlik varyantlarını döndürür (id, _id, _docId, code).
// Bölüm kimliği zamanla biçim değiştirmiş olabilir (üretilmiş _docId → slug);
// eski kimlikle kaydedilmiş veriler (ders, derslik, program) ham eşitlik
// filtresine takılıp "kaybolur" ya da başka bölüm sanılır. departmentId ile
// sorgulayan modüller bu varyant listesinin tamamıyla eşleştirmelidir.
window.deptIdVariants = async function (deptId) {
  if (!deptId) return [];
  const key = String(deptId);
  try {
    const depts = await window.apiRead('departments');
    const rec = (depts || []).find(
      (d) => d && [d.id, d._id, d._docId, d.code].some((k) => k && String(k) === key)
    );
    if (!rec) return [key];
    const set = new Set([rec.id, rec._id, rec._docId, rec.code].filter(Boolean).map(String));
    set.add(key);
    return [...set];
  } catch {
    return [key];
  }
};

window.DEPARTMENT_MODULES = DEPARTMENT_MODULES;
window.COMMON_MODULES = COMMON_MODULES;
window.ADMIN_MODULES = ADMIN_MODULES;
window.HIERARCHY_MODULES = HIERARCHY_MODULES;

// ── Tüm modüllerde ortak kullanılan başlık banner'ı (tutarlı renk/şekil) ──
// Lacivert marka gradyanı, beyaz başlık + soluk alt başlık. İkon yok.
// Kullanım: const CakuBanner = window.CakuBanner; <CakuBanner title="…" subtitle="…" right={…} />
function CakuBanner({ title, subtitle, right }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1B2A4A 0%, #2D4A7A 100%)',
        borderRadius: 14,
        padding: '20px 24px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: '0 6px 20px rgba(27,42,74,0.18)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p style={{ margin: '5px 0 0', fontSize: 13.5, color: 'rgba(255,255,255,0.72)' }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {right || null}
    </div>
  );
}
window.CakuBanner = CakuBanner;

// ── Belge Gönder butonu (ortak) ──
// Üretilen bir belgeyi bir GÖREVE yönlendirir. Her modül tek satırla kullanır:
//   <BelgeGonderButonu belge={{module, docType, sourceId, title, subtitle, url,
//                              ogrenciNo, departmentId, facultyId}} />
function BelgeGonderButonu({ belge, resolveBelge, label, onSent }) {
  const [open, setOpen] = React.useState(false);
  const [rol, setRol] = React.useState('memur');
  const [not, setNot] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [ok, setOk] = React.useState('');
  const roller = window.BELGE_HEDEF_ROLLERI || [];

  const gonder = async () => {
    setBusy(true);
    try {
      // Belge anlık üretiliyorsa (ör. Erasmus) URL çağrı anında çözülür.
      let b = belge;
      if (resolveBelge) {
        b = await resolveBelge();
      }
      if (!b || !b.url) {
        alert('Önce belgeyi oluşturun — gönderilecek bir belge bulunamadı.');
        setBusy(false);
        return;
      }
      const r = await window.belgeYonlendir({ ...b, hedefRol: rol, not });
      if (!r || !r.ok) throw new Error((r && r.reason) || 'gönderilemedi');
      setOk(r.zatenVar ? 'Bu göreve zaten gönderilmiş' : 'Gönderildi ✓');
      setNot('');
      setTimeout(() => {
        setOk('');
        setOpen(false);
      }, 1800);
      if (onSent) onSent();
    } catch (e) {
      alert('Gönderilemedi: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const btn = {
    padding: '7px 14px',
    borderRadius: 8,
    border: '1px solid #7C3AED',
    background: '#F5F3FF',
    color: '#6D28D9',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
  };
  const sel = {
    padding: '7px 10px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    fontSize: 12.5,
    fontFamily: "'Inter', sans-serif",
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={btn}>
        {label || 'Gönder'}
      </button>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        gap: 6,
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: '6px 8px',
        border: '1px solid #7C3AED55',
        background: '#F5F3FF',
        borderRadius: 10,
      }}
    >
      <select value={rol} onChange={(e) => setRol(e.target.value)} style={sel}>
        {roller.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
      <input
        value={not}
        onChange={(e) => setNot(e.target.value)}
        placeholder="Not (isteğe bağlı)"
        style={{ ...sel, width: 160 }}
      />
      <button type="button" onClick={gonder} disabled={busy} style={btn}>
        {busy ? 'Gönderiliyor…' : 'Gönder'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        style={{ ...sel, cursor: 'pointer', background: 'white' }}
      >
        Vazgeç
      </button>
      {ok && <span style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>{ok}</span>}
    </span>
  );
}
window.BelgeGonderButonu = BelgeGonderButonu;

// ══════════════════════════════════════════════════════════════
// Belge Önizleme — üretilen .docx ÖNCE görüntülenir, sonra indirilir
// veya bir göreve gönderilir.
//
// Üretilen belgeler salt-okunur DEĞİLDİR; bu yalnız bir ara adımdır:
// kullanıcı çıktının doğru dolduğunu görmeden indirmek/göndermek
// zorunda kalmaz.
// ══════════════════════════════════════════════════════════════

// docx-preview: .docx'i BİREBİR (tablolar, kenarlıklar, yazı tipleri)
// HTML'e render eder. CDN'den bir kez yüklenir.
async function ensureDocxPreview() {
  if (window.docx && window.docx.renderAsync) return window.docx;
  if (!window.JSZip) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
      s.onload = res;
      s.onerror = () => rej(new Error('JSZip yüklenemedi'));
      document.head.appendChild(s);
    });
  }
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/docx-preview@0.3.5/dist/docx-preview.min.js';
    s.onload = res;
    s.onerror = () => rej(new Error('docx-preview yüklenemedi'));
    document.head.appendChild(s);
  });
  return window.docx;
}
window.ensureDocxPreview = ensureDocxPreview;

// A4 sayfası kapsayıcıdan genişse zoom ile sığdır (yatay kaydırma olmasın).
function fitDocxPreview(container) {
  if (!container) return;
  const wrap = container.querySelector('.docx-wrapper');
  const page = wrap && wrap.querySelector('section');
  if (!wrap || !page) return;
  wrap.style.zoom = '';
  wrap.style.padding = '0';
  const pageW = page.offsetWidth;
  const availW = container.clientWidth;
  if (pageW && availW && pageW > availW) wrap.style.zoom = (availW / pageW).toFixed(3);
}
window.fitDocxPreview = fitDocxPreview;

function indirBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'belge.docx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// { blob, filename, baslik, onClose, onSend } — onSend verilirse "Gönder"
// düğmesi çıkar (belgeyi bir göreve yönlendirir).
// { blob | url, filename, baslik, onClose, onSend }
// `blob` yoksa `url` indirilir — böylece daha önce üretilip saklanmış
// belgeler de (dilekçe snapshot'ları) aynı akışla önizlenebilir.
// `indirilebilir: false` → yalnız görüntüleme (ör. öğrenci resmî belgeyi
// görebilir ama indiremez; imzalı nüsha akademisyen/memur üzerinden verilir).
function BelgeOnizlemeModal({
  blob,
  url,
  filename,
  baslik,
  onClose,
  onSend,
  indirilebilir = true,
}) {
  const ref = React.useRef(null);
  const [hata, setHata] = React.useState('');
  const [gonderiliyor, setGonderiliyor] = React.useState(false);
  const [gonderildi, setGonderildi] = React.useState(false);
  const [veri, setVeri] = React.useState(blob || null);

  React.useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        let b = blob;
        if (!b && url) {
          const token = localStorage.getItem('caku_auth_token');
          const r = await fetch(url, {
            headers: token ? { Authorization: 'Bearer ' + token } : {},
            credentials: 'include',
          });
          if (!r.ok) throw new Error('Belge alınamadı (HTTP ' + r.status + ').');
          b = await r.blob();
        }
        if (iptal) return;
        if (!b) throw new Error('Önizlenecek belge yok.');
        setVeri(b);
        const docx = await ensureDocxPreview();
        if (iptal || !ref.current) return;
        ref.current.innerHTML = '';
        await docx.renderAsync(b, ref.current, null, { inWrapper: true });
        if (!iptal) fitDocxPreview(ref.current);
      } catch (e) {
        if (!iptal) setHata(e.message || 'Önizleme oluşturulamadı.');
      }
    })();
    return () => {
      iptal = true;
    };
  }, [blob, url]);

  const btn = {
    padding: '9px 18px',
    borderRadius: 9,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid #E5E7EB',
    background: '#fff',
    color: '#1F2937',
    fontFamily: 'inherit',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.55)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          width: 'min(940px, 100%)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1B2A4A' }}>
              {baslik || 'Belge Önizleme'}
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              {filename || 'belge.docx'}
            </div>
          </div>
          <button onClick={onClose} style={{ ...btn, padding: '6px 12px' }}>
            Kapat
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            background: '#F3F4F6',
            padding: 16,
          }}
        >
          {hata ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#B91C1C', fontSize: 13 }}>
              {hata}
              <div style={{ color: '#6B7280', marginTop: 6, fontSize: 12.5 }}>
                Belgeyi yine de indirebilirsiniz.
              </div>
            </div>
          ) : (
            <div ref={ref} style={{ background: '#fff' }} />
          )}
        </div>

        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          {gonderildi && (
            <span
              style={{ fontSize: 12.5, color: '#059669', fontWeight: 700, marginRight: 'auto' }}
            >
              Gönderildi.
            </span>
          )}
          {indirilebilir ? (
            <button
              onClick={() => {
                if (veri) indirBlob(veri, filename);
                else if (url) window.open(url, '_blank', 'noopener');
              }}
              style={btn}
            >
              İndir
            </button>
          ) : (
            <span style={{ fontSize: 12, color: '#6B7280', alignSelf: 'center' }}>
              Bu belge yalnızca görüntülenebilir.
            </span>
          )}
          {onSend && (
            <button
              disabled={gonderiliyor || gonderildi}
              onClick={async () => {
                setGonderiliyor(true);
                try {
                  await onSend();
                  setGonderildi(true);
                } catch (e) {
                  alert('Gönderilemedi: ' + (e.message || ''));
                } finally {
                  setGonderiliyor(false);
                }
              }}
              style={{
                ...btn,
                background: gonderiliyor || gonderildi ? '#9CA3AF' : '#1B2A4A',
                color: '#fff',
                borderColor: 'transparent',
                cursor: gonderiliyor || gonderildi ? 'default' : 'pointer',
              }}
            >
              {gonderiliyor ? 'Gönderiliyor…' : gonderildi ? 'Gönderildi' : 'Gönder'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
window.BelgeOnizlemeModal = BelgeOnizlemeModal;

// Hazır düğme: saklanmış bir belgeyi (url) önizler; modal içinden indirilir
// veya bir göreve gönderilir. Modüllerde "İndir + Gönder" ikilisinin yerine
// tek giriş noktası olarak kullanılır.
//   <BelgeOnizleButonu url="..." filename="..." baslik="..." belge={...} />
// `belge` verilirse modalde "Gönder" düğmesi çıkar (belgeYonlendir'e gider).
function BelgeOnizleButonu({
  url,
  filename,
  baslik,
  belge,
  label,
  style,
  hedefRol,
  indirilebilir = true,
}) {
  const [acik, setAcik] = React.useState(false);
  if (!url) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        style={
          style || {
            padding: '7px 14px',
            borderRadius: 8,
            border: '1px solid #1B2A4A',
            background: '#fff',
            color: '#1B2A4A',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }
        }
      >
        {label || 'Önizle'}
      </button>
      {acik &&
        React.createElement(BelgeOnizlemeModal, {
          url,
          filename,
          baslik,
          indirilebilir,
          onClose: () => setAcik(false),
          onSend: belge
            ? async () => {
                const sonuc = await window.belgeYonlendir({
                  ...belge,
                  hedefRol: hedefRol || belge.hedefRol || 'memur',
                });
                if (!sonuc || !sonuc.ok)
                  throw new Error((sonuc && sonuc.reason) || 'gönderilemedi');
              }
            : null,
        })}
    </>
  );
}
window.BelgeOnizleButonu = BelgeOnizleButonu;

// ── Shared Constants ──
const SEED_PROFESSORS = [
  { name: 'Prof. Dr. Hamit ALYAR', department: 'Fizik', isExternal: true },
  { name: 'Prof. Dr. Çiğdem YÜKSEKTEPE ATAOL', department: 'Kimya', isExternal: true },
  { name: 'Dr. Öğr. Üyesi Celalettin KAYA', department: 'Matematik', isExternal: true },
  { name: 'Dr. Öğr. Üyesi Esma Baran ÖZKAN', department: 'Matematik', isExternal: true },
  { name: 'Dr. Öğr. Üyesi Taha ETEM', department: 'Bilgisayar', isExternal: false },
  { name: 'Dr. Öğr. Üyesi Seda ŞAHİN', department: 'Bilgisayar', isExternal: false },
  { name: 'Dr. Öğr. Üyesi Fatih ISSI', department: 'Bilgisayar', isExternal: false },
  { name: 'Doç. Dr. Selim BÜYÜKOĞLU', department: 'Bilgisayar', isExternal: false },
  { name: 'Dr. Mehmet Akif ALPER', department: 'Bilgisayar', isExternal: false },
  { name: 'Prof. Dr. İlyas İNCİ', department: 'Matematik', isExternal: true },
  { name: 'Dr. Selim SÜRÜCÜ', department: 'Bilgisayar', isExternal: false },
  { name: 'Dr. Uğur BİNZAT', department: 'İstatistik', isExternal: true },
  { name: 'Dr. Alime YILMAZ', department: 'Yabancı Diller', isExternal: true },
  { name: 'Dr. Öğr. Üyesi Osman GÜLER', department: 'Bilgisayar', isExternal: false },
];

const FONTS_LINK =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Source+Sans+3:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';

// ── Styles ──
// Tipografi tek noktadan: modüllerin bir kısmı kökünde 'Inter' tanımlıyor, bir
// kısmı tanımlamıyordu; tanımlamayanlar 'Source Sans 3' + tarayıcı varsayılanı
// 16px ile açılıyor, böylece rolden role (hangi modülleri gördüğüne göre) farklı
// font ve punto çıkıyordu. Taban aileyi/puntoyu burada sabitliyoruz — Inter'in
// x-yüksekliği daha büyük olduğundan 16px Source Sans 3 ≈ 14px Inter, yani
// punto değil yalnızca tutarlılık değişiyor.
const APP_FONT_STACK = "'Inter', 'Source Sans 3', sans-serif";
const APP_FONT_SIZE = 14;

const sharedStyles = {
  global: `
    @import url('${FONTS_LINK}');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${APP_FONT_STACK};
      font-size: ${APP_FONT_SIZE}px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    /* Form elemanları fontu miras almaz — rol/modül farkı olmasın diye zorluyoruz. */
    input, select, textarea, button { font-family: inherit; }
  `,
};

// ── Home Institution Course Catalog ──
const HOME_INSTITUTION_CATALOG = {
  name: 'Çankırı Karatekin Üniversitesi',
  department: 'Bilgisayar Mühendisliği',
  courses: [
    { code: 'TDİ101', name: 'Türk Dili I', credits: 2, year: 1, semester: 'Fall', type: 'Zorunlu' },
    {
      code: 'BİL111',
      name: 'Bilgisayar Programlama I',
      credits: 5,
      year: 1,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    {
      code: 'BİL113',
      name: 'Bilgisayar Mühendisliği Etiği',
      credits: 4,
      year: 1,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    {
      code: 'ATA101',
      name: 'Atatürk İlkeleri ve İnkılâp Tarihi I',
      credits: 2,
      year: 1,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    {
      code: 'FİZ161',
      name: 'Genel Fizik I',
      credits: 5,
      year: 1,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    {
      code: 'BİL101',
      name: 'Bilgisayar Mühendisliğine Giriş',
      credits: 5,
      year: 1,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    {
      code: 'OZD101',
      name: 'Kariyer Planlama',
      credits: 1,
      year: 1,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    { code: 'MAT161', name: 'Matematik I', credits: 5, year: 1, semester: 'Fall', type: 'Zorunlu' },
    {
      code: 'ATA102',
      name: 'Atatürk İlkeleri ve İnkılâp Tarihi II',
      credits: 2,
      year: 1,
      semester: 'Spring',
      type: 'Zorunlu',
    },
    {
      code: 'TDİ102',
      name: 'Türk Dili II',
      credits: 2,
      year: 1,
      semester: 'Spring',
      type: 'Zorunlu',
    },
    {
      code: 'BİL132',
      name: 'Bilgisayar Programlama II',
      credits: 7,
      year: 1,
      semester: 'Spring',
      type: 'Zorunlu',
    },
    {
      code: 'MAT162',
      name: 'Matematik II',
      credits: 5,
      year: 1,
      semester: 'Spring',
      type: 'Zorunlu',
    },
    {
      code: 'FİZ162',
      name: 'Genel Fizik II',
      credits: 5,
      year: 1,
      semester: 'Spring',
      type: 'Zorunlu',
    },
    {
      code: 'MAT142',
      name: 'Ayrık Matematik ve Uygulamaları',
      credits: 5,
      year: 1,
      semester: 'Spring',
      type: 'Zorunlu',
    },
    {
      code: 'BİL231',
      name: 'Bilgisayar Mühendisliğinde Mesleki İngilizce',
      credits: 4,
      year: 2,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    {
      code: 'BİL201',
      name: 'Algoritma ve Veri Yapıları I',
      credits: 6,
      year: 2,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    {
      code: 'BİL203',
      name: 'Nesnesel Tasarım ve Programlama',
      credits: 7,
      year: 2,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    {
      code: 'BİL205',
      name: 'Sayısal Sistem Tasarımı',
      credits: 7,
      year: 2,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    {
      code: 'MAT221',
      name: 'Doğrusal Cebir',
      credits: 6,
      year: 2,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    {
      code: 'BİL222',
      name: 'Differansiyel Denklemler',
      credits: 5,
      year: 2,
      semester: 'Spring',
      type: 'Zorunlu',
    },
    {
      code: 'BİL232',
      name: 'Mühendislik Ekonomisi',
      credits: 5,
      year: 2,
      semester: 'Spring',
      type: 'Zorunlu',
    },
    {
      code: 'BİL202',
      name: 'Algoritma ve Veri Yapıları II',
      credits: 6,
      year: 2,
      semester: 'Spring',
      type: 'Zorunlu',
    },
    {
      code: 'BİL206',
      name: 'Elektrik ve Elektronik Devrelerinin Temelleri',
      credits: 5,
      year: 2,
      semester: 'Spring',
      type: 'Zorunlu',
    },
    {
      code: 'BİL212',
      name: 'Olasılık Teorisi ve İstatistik',
      credits: 5,
      year: 2,
      semester: 'Spring',
      type: 'Zorunlu',
    },
    { code: 'BİL200', name: 'Staj I', credits: 4, year: 2, semester: 'Spring', type: 'Zorunlu' },
    {
      code: 'BİL305',
      name: 'İşletim Sistemleri',
      credits: 6,
      year: 3,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    {
      code: 'BİL307',
      name: 'Mikroişlemciler',
      credits: 7,
      year: 3,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    {
      code: 'BİL301',
      name: 'Programlama Dilleri',
      credits: 6,
      year: 3,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    {
      code: 'BİL303',
      name: 'Veritabanı Sistemleri',
      credits: 7,
      year: 3,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    {
      code: 'BİL308',
      name: 'Bilgisayar Mimarisi ve Organizasyonu',
      credits: 6,
      year: 3,
      semester: 'Spring',
      type: 'Zorunlu',
    },
    {
      code: 'BİL312',
      name: 'Web Tasarımı ve Programlama',
      credits: 5,
      year: 3,
      semester: 'Spring',
      type: 'Zorunlu',
    },
    {
      code: 'BİL314',
      name: 'Otomata Teorisi ve Formal Diller',
      credits: 5,
      year: 3,
      semester: 'Spring',
      type: 'Zorunlu',
    },
    { code: 'BİL300', name: 'Staj II', credits: 4, year: 3, semester: 'Spring', type: 'Zorunlu' },
    {
      code: 'BİL401',
      name: 'Bilgisayar Ağları',
      credits: 7,
      year: 4,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    {
      code: 'BİL403',
      name: 'Yazılım Mühendisliği İlkeleri',
      credits: 6,
      year: 4,
      semester: 'Fall',
      type: 'Zorunlu',
    },
    {
      code: 'BİL482',
      name: 'Yönetim Bilişim Sistemleri',
      credits: 6,
      year: 4,
      semester: 'Spring',
      type: 'Zorunlu',
    },
    {
      code: 'BİL494',
      name: 'Bitirme Projesi',
      credits: 6,
      year: 4,
      semester: 'Spring',
      type: 'Zorunlu',
    },
    {
      code: 'SEÇ301',
      name: 'Bilgisayar Grafiği',
      credits: 5,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    { code: 'SEÇ302', name: 'Yapay Zeka', credits: 6, year: 0, semester: 'Any', type: 'Seçmeli' },
    {
      code: 'SEÇ303',
      name: 'Mobil Programlama',
      credits: 5,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ304',
      name: 'Görüntü İşleme',
      credits: 6,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ305',
      name: 'Makine Öğrenmesi',
      credits: 6,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ306',
      name: 'Bulut Bilişim',
      credits: 5,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ307',
      name: 'Siber Güvenlik',
      credits: 5,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ308',
      name: 'Veri Madenciliği',
      credits: 6,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ309',
      name: 'Derin Öğrenme',
      credits: 6,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ310',
      name: 'Gömülü Sistemler',
      credits: 5,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ311',
      name: 'IoT ve Uygulamaları',
      credits: 5,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ312',
      name: 'Blockchain Teknolojileri',
      credits: 5,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ313',
      name: 'Oyun Programlama',
      credits: 6,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ314',
      name: 'Doğal Dil İşleme',
      credits: 6,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ315',
      name: 'Bilgisayar Güvenliği',
      credits: 5,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    { code: 'SEÇ401', name: 'Girişimcilik', credits: 3, year: 0, semester: 'Any', type: 'Seçmeli' },
    {
      code: 'SEÇ402',
      name: 'Proje Yönetimi',
      credits: 4,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ403',
      name: 'İnovasyon Yönetimi',
      credits: 3,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ404',
      name: 'Teknik İletişim',
      credits: 3,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ405',
      name: 'Mesleki İngilizce',
      credits: 4,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ406',
      name: 'Patent ve Fikri Mülkiyet Hakları',
      credits: 3,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ407',
      name: 'Takım Çalışması ve Liderlik',
      credits: 3,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
    {
      code: 'SEÇ408',
      name: 'Araştırma Yöntemleri',
      credits: 4,
      year: 0,
      semester: 'Any',
      type: 'Seçmeli',
    },
  ],
};

// ── Grade Conversion System ──
const GRADE_CONVERSION = {
  table1: {
    'very good': 'A',
    'good +': 'B1',
    good: 'B2',
    'sufficient +': 'B3',
    sufficient: 'C1',
    'allowing +': 'C2',
    allowing: 'C3',
    insufficient: 'F1',
  },
  numericToGrade: (score) => {
    const num = parseFloat(score);
    if (num >= 90) return 'A';
    if (num >= 85) return 'B1';
    if (num >= 80) return 'B2';
    if (num >= 75) return 'B3';
    if (num >= 70) return 'C1';
    if (num >= 65) return 'C2';
    if (num >= 60) return 'C3';
    if (num >= 50) return 'F1';
    return 'F2';
  },
  letterGrades: {
    AA: 'A',
    'A+': 'A',
    A: 'A',
    BA: 'B1',
    'A-': 'B1',
    BB: 'B2',
    'B+': 'B2',
    B: 'B2',
    CB: 'B3',
    'B-': 'B3',
    CC: 'C1',
    'C+': 'C1',
    C: 'C1',
    DC: 'C2',
    'C-': 'C2',
    DD: 'C3',
    'D+': 'C3',
    D: 'C3',
    FF: 'F1',
    F: 'F1',
    FD: 'F2',
    'F-': 'F2',
  },
  ectsGrades: {
    A: 'A',
    B: 'B1',
    C: 'B2',
    D: 'C1',
    E: 'C3',
    FX: 'F1',
    F: 'F2',
  },
  scale10: {
    10: 'A',
    9: 'B1',
    8: 'B2',
    7: 'B3',
    6: 'C1',
    5: 'C2',
    4: 'C3',
    3: 'F2',
    2: 'F2',
    1: 'F2',
    0: 'F2',
  },
  scale5a: {
    5: 'A',
    '5.0': 'A',
    4.5: 'B1',
    4: 'B2',
    '4.0': 'B2',
    3.5: 'B3',
    3: 'C1',
    '3.0': 'C1',
    2.5: 'C2',
    2: 'C3',
    '2.0': 'C3',
    1.5: 'F2',
    1: 'F2',
    '1.0': 'F2',
    0.5: 'F2',
    0: 'F2',
    '0.0': 'F2',
  },
  scale5b: {
    5: 'A',
    '5.0': 'A',
    4.5: 'B1',
    4: 'B2',
    '4.0': 'B2',
    3.5: 'C1',
    3: 'C2',
    '3.0': 'C2',
    2.5: 'C3',
    2: 'F2',
    '2.0': 'F2',
  },
  scale5c: {
    5: 'A',
    '5.0': 'A',
    4: 'B2',
    '4.0': 'B2',
    3: 'C1',
    '3.0': 'C1',
    2: 'C3',
    '2.0': 'C3',
    1: 'F1',
    '1.0': 'F1',
    0: 'F2',
    '0.0': 'F2',
  },
  scale5d: {
    5: 'A',
    '5.0': 'A',
    4.5: 'B1',
    4: 'B2',
    '4.0': 'B2',
    3.5: 'C1',
    3: 'C2',
    '3.0': 'C2',
    2.5: 'C3',
    2: 'F2',
    '2.0': 'F2',
  },
};

const convertGrade = (inputGrade, system = 'auto') => {
  if (!inputGrade) return 'Muaf';
  const grade = inputGrade.toString().trim().toUpperCase();
  if (system === 'auto') {
    if (/^[A-F]X?$/.test(grade)) return GRADE_CONVERSION.ectsGrades[grade] || grade;
    if (GRADE_CONVERSION.letterGrades[grade]) return GRADE_CONVERSION.letterGrades[grade];
    const num = parseFloat(grade);
    if (!isNaN(num)) {
      if (num <= 4) return GRADE_CONVERSION.numericToGrade(num * 25);
      if (num <= 5)
        return GRADE_CONVERSION.scale5a[grade] || GRADE_CONVERSION.numericToGrade(num * 20);
      if (num <= 10)
        return (
          GRADE_CONVERSION.scale10[Math.floor(num).toString()] ||
          GRADE_CONVERSION.numericToGrade(num * 10)
        );
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
  studentLookup: { method: 'POST', path: '/api/auth/student-lookup' },
  studentRegister: { method: 'POST', path: '/api/auth/student-register' },
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
  },
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
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return response;
    } catch (err) {
      // Ağ hatası (bağlantı kopması)
      if (attempt < maxRetries) {
        console.warn(
          `[DB] İstek başarısız (deneme ${attempt + 1}/${maxRetries + 1}):`,
          err.message
        );
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
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
    const res = await this._apiCall([op]);
    if (typeof window !== 'undefined' && window.apiInvalidate) {
      window.apiInvalidate(collection);
      // Alt-koleksiyon yazması sunucuda `collection_subCollection` adında
      // saklanır ve okuma da bu bileşik adla yapılır; yalnız üst adı
      // geçersiz kılmak yorum/bildirim listelerinde bayat okumaya yol açıyordu.
      if (subCollection) window.apiInvalidate(collection + '_' + subCollection);
    }
    return res;
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
    const res = await this._apiCall(operations);
    if (typeof window !== 'undefined' && window.apiInvalidate) {
      const seen = new Set();
      const inv = (name) => {
        if (name && !seen.has(name)) {
          seen.add(name);
          window.apiInvalidate(name);
        }
      };
      (operations || []).forEach((op) => {
        if (!op || !op.collection) return;
        inv(op.collection);
        if (op.subCollection) inv(op.collection + '_' + op.subCollection);
      });
    }
    return res;
  },
};
window.DBWrite = DBWrite;

// ── MongoDB API okuma yardımcısı ──
// Saydam cache + in-flight dedup + yazma sonrası otomatik invalidasyon.
// Aynı koleksiyon/parametreyle eş zamanlı çağrılar tek isteğe katlanır,
// kısa TTL içinde tekrar çağrı bellekten döner, herhangi bir DBWrite
// işlemi etkilenen koleksiyonun cache'ini geçersiz kılar.
const __apiCache = new Map(); // key -> { data, ts }
const __apiInflight = new Map(); // key -> Promise
const __API_TTL = 15 * 1000; // 15 sn
const __API_CACHE_MAX = 500; // LRU üst sınırı — uzun oturumlarda bellek sızıntısını engeller

// Map ekleme/erişim sırasını koruduğu için: en eski (ilk) anahtarı atarak LRU
function __apiCacheSet(key, value) {
  if (__apiCache.has(key)) __apiCache.delete(key); // erişim sırası güncellensin
  __apiCache.set(key, value);
  while (__apiCache.size > __API_CACHE_MAX) {
    const oldest = __apiCache.keys().next().value;
    if (oldest === undefined) break;
    __apiCache.delete(oldest);
  }
}

function __apiInvalidate(collection) {
  if (!collection) {
    __apiCache.clear();
    return;
  }
  const prefix = collection + '::';
  for (const k of Array.from(__apiCache.keys())) {
    if (k.startsWith(prefix)) __apiCache.delete(k);
  }
  for (const k of Array.from(__apiInflight.keys())) {
    if (k.startsWith(prefix)) __apiInflight.delete(k);
  }
}
window.apiInvalidate = __apiInvalidate;

// ── API hata bildirimi: sessiz [] dönüşü yerine kullanıcıya görünür banner ──
// React'e bağımlı değil (login öncesi de çalışır); 30 sn'de en fazla bir kez
// gösterilir, 8 sn sonra otomatik kapanır. Ayrıca 'api:error' CustomEvent'i
// yayınlanır — modüller isterse dinleyebilir.
let __apiErrLastShown = 0;
function __notifyApiError(collection, err) {
  try {
    window.dispatchEvent(
      new CustomEvent('api:error', { detail: { collection, message: err?.message } })
    );
  } catch (_e) {
    /* CustomEvent desteklenmiyorsa sessiz */
  }
  const now = Date.now();
  if (now - __apiErrLastShown < 30 * 1000) return; // spam engeli
  __apiErrLastShown = now;
  try {
    let el = document.getElementById('caku-api-error-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'caku-api-error-banner';
      el.style.cssText =
        'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;' +
        'background:#8B2635;color:#fff;padding:10px 18px;border-radius:8px;' +
        "font:600 13px 'Inter',sans-serif;box-shadow:0 6px 20px rgba(0,0,0,0.25);" +
        'display:flex;align-items:center;gap:10px;max-width:90vw;';
      document.body.appendChild(el);
    }
    el.innerHTML =
      '<span>⚠ Sunucudan veri alınamıyor — gösterilen bilgiler eksik olabilir.</span>' +
      '<button onclick="this.parentElement.remove()" style="border:none;background:rgba(255,255,255,0.2);' +
      'color:#fff;border-radius:5px;padding:3px 9px;cursor:pointer;font-weight:700">Kapat</button>';
    el.style.display = 'flex';
    setTimeout(() => {
      if (el && el.parentElement) el.remove();
    }, 8000);
  } catch (_e) {
    /* DOM hazır değilse sessiz */
  }
}

async function __apiReadRaw(collection, params = {}) {
  const url = new URL(`/api/db/${collection}`, window.location.origin);
  if (params.where) {
    const wheres = Array.isArray(params.where) ? params.where : [params.where];
    wheres.forEach((w) => url.searchParams.append('where', w));
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

async function apiRead(collection, params = {}) {
  const key = collection + '::' + JSON.stringify(params || {});
  // Bellekteki taze cache
  const cached = __apiCache.get(key);
  if (cached && Date.now() - cached.ts < __API_TTL) return cached.data;
  // Eş zamanlı uçuş halinde tek isteğe katla
  if (__apiInflight.has(key)) return __apiInflight.get(key);
  const p = __apiReadRaw(collection, params)
    .then((data) => {
      __apiCacheSet(key, { data, ts: Date.now() });
      __apiInflight.delete(key);
      return data;
    })
    .catch((err) => {
      __apiInflight.delete(key);
      console.warn(`apiRead(${collection}) failed:`, err.message);
      __notifyApiError(collection, err); // kullanıcıya görünür uyarı (banner)
      return []; // 502/500 veya diğer hatalarda çökmek yerine boş dizi dön
    });
  __apiInflight.set(key, p);
  return p;
}
// Açıkça taze veri isteyen yerler için
apiRead.fresh = function (collection, params) {
  __apiInvalidate(collection);
  return apiRead(collection, params);
};
// Kritik akışlar için: hata durumunda [] yerine THROW eder (cache'siz).
// Örn. mükerrer-önleme kontrolleri — başarısız okuma "kayıt yok" sanılırsa
// aynı veriler tekrar tekrar yazılır (trip_history şişmesinin kök nedeni).
apiRead.strict = function (collection, params) {
  return __apiReadRaw(collection, params);
};

async function __apiReadDocRaw(collection, docId) {
  const token = localStorage.getItem('caku_auth_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetchWithRetry(`/api/db/${collection}/${encodeURIComponent(docId)}`, {
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Okuma hatası' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return response.json();
}

async function apiReadDoc(collection, docId) {
  const key = collection + '::doc::' + docId;
  const cached = __apiCache.get(key);
  if (cached && Date.now() - cached.ts < __API_TTL) return cached.data;
  if (__apiInflight.has(key)) return __apiInflight.get(key);
  const p = __apiReadDocRaw(collection, docId)
    .then((data) => {
      __apiCacheSet(key, { data, ts: Date.now() });
      __apiInflight.delete(key);
      return data;
    })
    .catch((err) => {
      __apiInflight.delete(key);
      throw err;
    });
  __apiInflight.set(key, p);
  return p;
}

// API yardımcılarını global yap (diğer modüller için)
window.apiRead = apiRead;
window.apiReadDoc = apiReadDoc;

// ══════════════════════════════════════════════════════════════
// Kiracı (tenant) kimliği — beyaz etiket temeli (bkz. docs/hardcoded-envanter.md)
// Uygulama/kurum/fakülte adları DB'deki tenant_config/main dokümanından gelir;
// kayıt yoksa aşağıdaki varsayılanlar geçerlidir (sıfır regresyon). Yüklenince
// FACULTY sabiti senkronlanır ve 'tenant:loaded' eventi yayınlanır (giriş
// ekranı gibi erken render olan bileşenler bu eventle tazelenir).
// ══════════════════════════════════════════════════════════════
window.TENANT = {
  appName: 'Offline Asistan',
  universityName: FACULTY.university,
  facultyName: FACULTY.name,
  unitName: 'ÇAKÜ Bilgisayar Mühendisliği',
  developerNote: 'Offline Asistan, Arş. Gör. A. Tunahan KORKMAZ tarafından geliştirilmektedir.',
  logoUrl: 'logo.png',
  studentEmailDomain: 'ogrenci.karatekin.edu.tr',
};
(async () => {
  try {
    const rows = await apiRead('tenant_config');
    const cfg = (rows || []).find((r) => (r.id || r._docId) === 'main') || (rows || [])[0];
    if (!cfg) return;
    Object.keys(window.TENANT).forEach((k) => {
      if (cfg[k] != null && cfg[k] !== '') window.TENANT[k] = cfg[k];
    });
    // Eski kullanım yerleri FACULTY sabitini okuyor — yerinde senkronla.
    FACULTY.name = window.TENANT.facultyName;
    FACULTY.university = window.TENANT.universityName;
    // Sekme başlığı da kiracıya göre (index.html'deki statik başlık yalnız
    // ilk yükleme anında görünür).
    try {
      document.title = window.TENANT.appName;
    } catch (_) {
      /* yok say */
    }
    try {
      window.dispatchEvent(new CustomEvent('tenant:loaded'));
    } catch (_) {
      /* yok say */
    }
  } catch (_) {
    /* config yoksa varsayılanlarla devam */
  }
})();

// ══════════════════════════════════════════════════════════════
// ── PerfData: Performans cevaplarını modüller arası paylaşımlı okuma ──
// Performans modülünde girilen değerler performance_data koleksiyonunda
// { akademisyenId, gostergeId, yil, ay, value } olarak saklanır. Herhangi
// bir modül bu değerleri STABİL gostergeId ile buradan okuyabilir; böylece
// bir kez girilen cevap başka modüllerde de doğrudan kullanılabilir.
//   PerfData.get(gostergeId, { akademisyenId, yil, ay })
//     - ay verilirse o ayın değeri; verilmezse yılın sayısal TOPLAMI.
//   PerfData.list({ akademisyenId, yil }) → { gostergeId: yıllıkToplam }
//   PerfData.questions() → dinamik (kullanıcı tanımlı) göstergeler
const PerfData = {
  async _rows() {
    const r = await apiRead('performance_data').catch(() => []);
    return Array.isArray(r) ? r : [];
  },
  async get(gostergeId, opts) {
    if (!gostergeId) return '';
    const o = opts || {};
    const rows = await this._rows();
    const matched = rows.filter(
      (r) =>
        r &&
        r.gostergeId === gostergeId &&
        (o.akademisyenId == null || r.akademisyenId === o.akademisyenId) &&
        (o.yil == null || String(r.yil) === String(o.yil)) &&
        (o.ay == null || String(r.ay) === String(o.ay))
    );
    if (o.ay != null) {
      const hit = matched.find((r) => (r.value ?? '') !== '');
      return hit ? String(hit.value) : '';
    }
    // ay yok → yılın sayısal toplamı (sayısal değilse dolu değerleri birleştir)
    const nums = matched
      .map((r) => parseFloat(String(r.value).replace(',', '.')))
      .filter((n) => !isNaN(n));
    if (nums.length) return String(nums.reduce((a, b) => a + b, 0));
    const filled = matched.map((r) => r.value).filter((v) => (v ?? '') !== '');
    return filled.length ? String(filled[0]) : '';
  },
  async list(opts) {
    const o = opts || {};
    const rows = await this._rows();
    const acc = {};
    rows.forEach((r) => {
      if (!r || !r.gostergeId) return;
      if (o.akademisyenId != null && r.akademisyenId !== o.akademisyenId) return;
      if (o.yil != null && String(r.yil) !== String(o.yil)) return;
      const n = parseFloat(String(r.value).replace(',', '.'));
      if (!isNaN(n)) acc[r.gostergeId] = (acc[r.gostergeId] || 0) + n;
      else if ((r.value ?? '') !== '' && acc[r.gostergeId] == null) acc[r.gostergeId] = r.value;
    });
    return acc;
  },
  async questions() {
    const q = await apiRead('performance_indicators').catch(() => []);
    return (Array.isArray(q) ? q : []).filter((x) => x && x.id && x.ad);
  },
};
window.PerfData = PerfData;

// ══════════════════════════════════════════════════════════════
// ── ŞABLON MOTORU (window.TemplateEngine) ──
// Word (.docx) şablonlarındaki yer tutucuları ({{Alan Adı}} biçiminde)
// tespit eder ve gerçek verilerle doldurup yeni .docx
// üretir. Şablonlar modülü tespit+eşleme için, hedef modüller (muafiyet vb.)
// çıktı üretimi için kullanır.
//
// Alan eşleme kaydı (document_templates.fields):
//   { token, tokenOccurrence, context, variable, value }
//   variable: 'static:<id>' | 'row:<id>' | 'const' | '' (atla)
// ══════════════════════════════════════════════════════════════

// Modül/belge-türü başına eşlenebilir değişken sözlüğü — Şablonlar modülündeki
// eşleme arayüzü bu etiketleri gösterir; hedef modül aynı id'lerle veri sağlar.
//
// Değişken sözlüğü çözümü: TEMPLATE_VARS[module][docType] → yoksa
// TEMPLATE_VARS[module].default → yoksa _generic.
// docTypes: her modülün belge türleri (aynı modüle birden çok belge).

// Kaynak↔ÇAKÜ ders tablosu ortak satır değişkenleri (muafiyet/erasmus)
const DERS_ESLESME_ROWS = [
  { id: 'kDersKod', label: 'Karşı/Yurtdışı Ders Kodu' },
  // Yurtdışı ders adı İngilizce olabilir — Türkçe başlık-kasası "TIMISOARA →
  // Tımısoara" gibi bozar; olduğu gibi bırakılır (İngilizce İngilizce kalsın).
  { id: 'kDersAd', label: 'Karşı/Yurtdışı Ders Adı' },
  { id: 'kDersAkts', label: 'Karşı Ders AKTS' },
  { id: 'kDersDonem', label: 'Karşı Ders Dönemi (Güz/Bahar)' },
  { id: 'kDersNot', label: 'Karşı Başarı Notu' },
  { id: 'cDersKod', label: 'ÇAKÜ Ders Kodu' },
  { id: 'cDersAd', label: 'ÇAKÜ Ders Adı', format: 'title' },
  { id: 'cDersAkts', label: 'ÇAKÜ Ders AKTS' },
  { id: 'cDersDonem', label: 'ÇAKÜ Ders Dönemi (Güz/Bahar)' },
  { id: 'cDersNot', label: 'ÇAKÜ Başarı Notu' },
  { id: 'cDersStatu', label: 'ÇAKÜ Ders Statüsü (Z/S)' },
];
const OGR_KURUM_STATIC = [
  { id: 'ogrenciNo', label: 'Öğrenci Numarası' },
  { id: 'ogrenciAdSoyad', label: 'Öğrenci Adı Soyadı', format: 'name' },
  // "…'nın/…'nin" ilgi ekli hâl (şablonda elle 'nun yazmaya gerek kalmaz).
  { id: 'ogrenciAdSoyadTamlanan', label: "Öğrenci Adı Soyadı (–'nın ekli)" },
  // Yurtdışı kurum/fakülte/bölüm adları İngilizce — Türkçe kasa dönüşümü
  // uygulanmaz (İngilizce İngilizce kalsın). ÇAKÜ tarafı Türkçe → 'title'.
  { id: 'kaynakUniversite', label: 'Karşı/Yurtdışı Üniversite' },
  { id: 'kaynakFakulte', label: 'Karşı Fakülte' },
  { id: 'kaynakBolum', label: 'Karşı Bölüm' },
  { id: 'cakuBolum', label: 'ÇAKÜ Bölüm Adı', format: 'title' },
  { id: 'kaynakToplamAkts', label: 'Karşı Toplam AKTS' },
  { id: 'cakuToplamAkts', label: 'ÇAKÜ Toplam AKTS' },
  { id: 'akademikYil', label: 'Akademik Yıl (örn 2025-2026)' },
  { id: 'donem', label: 'Dönem (Güz/Bahar)' },
  { id: 'tarih', label: 'Bugünün Tarihi' },
];
// Ders Muafiyet: öğrencinin kendi iletişim bilgileri (Benim Sayfam'daki
// student_profiles kaydından belge üretiminde otomatik doldurulur).
const MUAFIYET_STATIC = [
  ...OGR_KURUM_STATIC,
  { id: 'ogrenciTelefon', label: 'Öğrenci Telefon' },
  { id: 'ogrenciEposta', label: 'Öğrenci E-posta' },
  { id: 'ogrenciAdres', label: 'Öğrenci Adres' },
];

// ── Yatay Geçiş değişkenleri ──
// Şablonlar SATIR BAZLI değerlendirme raporudur: bir belge = bir bölümün
// tüm başvuranları, her satır bir öğrenci. Bu yüzden statik alanlar rapor
// künyesi (yıl/dönem/bölüm), satır alanları ise öğrenci bilgileridir.
// Alan adları şablonlardaki yer tutucularla birebir eşlenmek üzere seçildi.
const YATAY_STATIC = [
  { id: 'egitimYili', label: 'Eğitim-Öğretim Yılı (örn 2026-2027)' },
  { id: 'donem', label: 'Dönem (Güz/Bahar)' },
  { id: 'basvurulanBolum', label: 'Raporun Ait Olduğu Bölüm', format: 'title' },
  { id: 'fakulteAd', label: 'Fakülte Adı', format: 'title' },
  { id: 'tarih', label: 'Bugünün Tarihi' },
];

// Satır (her başvuran bir satır). Üç tür aynı seti kullanır; ilgisiz alanlar
// o türün şablonunda eşlenmez ve boş kalır.
const YATAY_ROWS = [
  { id: 'adSoyad', label: 'Adı Soyadı', format: 'name' },
  // Hâlen öğrenim gördüğü (geldiği) program
  { id: 'aktifUniversite', label: 'Aktif Üniversite' },
  { id: 'aktifFakulte', label: 'Aktif Fakülte' },
  { id: 'aktifBolum', label: 'Aktif Bölüm' },
  // Başvurduğu program
  { id: 'basvurduguBolum', label: 'Başvurduğu Bölüm', format: 'title' },
  { id: 'basvurduguSinif', label: 'Başvurduğu Sınıf' },
  { id: 'basvurduguYariyil', label: 'Başvurduğu Yarıyıl' },
  // Yerleştirme bilgileri
  { id: 'yksYerlesmeYili', label: 'YKS Yerleşme Yılı' },
  { id: 'yksPuanTuru', label: 'Yerleştiği Puan Türü' },
  { id: 'yksPuani', label: 'YKS Puanı' },
  { id: 'notOrtalamasi', label: 'Not Ortalaması' },
  // Kurumlararası hesaplama (sistem hesaplar)
  { id: 'yksPuaniYuzde40', label: "YKS Puanının %40'ı" },
  { id: 'notOrtYuzde60', label: "Not Ortalamasının %60'ı" },
  { id: 'yerlesmePuani', label: 'Yerleştirmeye Esas Puan' },
  // Merkezi yerleştirme
  { id: 'basvurduguBolumOsysPuani', label: 'Başvurduğu Bölümün ÖSYS Puanı' },
  // Akademisyenin dropdown'dan seçtiği karar (belgedeki son sütun)
  { id: 'degerlendirme', label: 'Değerlendirme Sonucu' },
];

// Sınav programı şablon değişkenleri (Bölüm ve Dekanlık çıktısı ortak set)
const SINAV_STATIC = [
  { id: 'bolumAd', label: 'Bölüm Adı', format: 'title' },
  { id: 'donemAd', label: 'Dönem/Sınav Adı (örn. Bütünleme - Bahar 2025-2026)' },
  { id: 'tarih', label: 'Bugünün Tarihi' },
];
const SINAV_ROWS = [
  { id: 'dersAd', label: 'Dersin Adı', format: 'title' },
  { id: 'dersKod', label: 'Dersin Kodu' },
  { id: 'baslangic', label: 'Başlangıç Tarih-Saat' },
  { id: 'bitis', label: 'Bitiş Tarih-Saat' },
  { id: 'sure', label: 'Sınav Süresi' },
  { id: 'salon', label: 'Salon/Sınıf' },
  { id: 'ogrenciSayisi', label: 'Sınava Girecek Öğrenci Sayısı' },
  { id: 'gozetmen', label: 'Gözetmen(ler)' },
];

// Akreditasyon ÖDR değişkenleri — şablon HANGİ biçimde gelirse gelsin
// doldurulabilsin diye iki yol birden sunulur:
//   • Bölüm-tarzı şablonlar (ÖDR gibi her ölçüt ayrı bölüm): ölçüt başına
//     NUMARALI statik değişkenler (olcut1Durum … olcut10Kanit).
//   • Tablo-tarzı şablonlar: SATIR değişkenleri (ölçüt başına bir satır
//     çoğaltılır — mevcut satır-klonlama motoru).
// Numaralı statikler ilk 10 ölçütü kapsar (MÜDEK=10); daha fazla ölçütlü
// çerçevelerde tablo-tarzı satır değişkenleri sınırsız çalışır.
const AKREDITASYON_STATIC = [
  { id: 'programAd', label: 'Program (Bölüm) Adı', format: 'title' },
  { id: 'fakulteAd', label: 'Fakülte Adı', format: 'title' },
  { id: 'universiteAd', label: 'Üniversite Adı', format: 'title' },
  { id: 'cerceve', label: 'Çerçeve Adı/Sürümü (örn. MÜDEK Genel Ölçütler)' },
  { id: 'tarih', label: 'Rapor Tarihi' },
  { id: 'hazirlayan', label: 'Hazırlayan (fakülte yetkilisi)', format: 'name' },
  { id: 'ilerlemeOzet', label: 'İlerleme Özeti (X/Y tam · %Z)' },
];
for (let _i = 1; _i <= 10; _i++) {
  AKREDITASYON_STATIC.push(
    { id: 'olcut' + _i + 'Durum', label: 'Ölçüt ' + _i + ' — Durum Özeti' },
    { id: 'olcut' + _i + 'Not', label: 'Ölçüt ' + _i + ' — Notlar' },
    { id: 'olcut' + _i + 'Kanit', label: 'Ölçüt ' + _i + ' — Kanıt Listesi' }
  );
}
const AKREDITASYON_ROWS = [
  { id: 'olcutNo', label: 'Ölçüt No' },
  { id: 'olcutBaslik', label: 'Ölçüt Başlığı' },
  { id: 'olcutDurum', label: 'Ölçüt Durum Özeti' },
  { id: 'olcutNot', label: 'Ölçüt Notları' },
  { id: 'olcutKanit', label: 'Ölçüt Kanıt Listesi' },
];

// ÇAP/Yandal dilekçe değişkenleri — şablondaki yer tutucularla birebir.
// Sistemden gelenler (ad-soyad, no, fakülte, bölüm, iletişim) otomatik dolar;
// gelmeyenleri (uyruk, doğum tarihi, AGNO, sınıf, dönem, tercihler) öğrenci girer.
const CAPYANDAL_STATIC = [
  { id: 'ogrenciAdSoyad', label: 'Öğrenci Adı Soyadı', format: 'name' },
  { id: 'ogrenciNo', label: 'Öğrenci Numarası' },
  { id: 'uyruk', label: 'Uyruğu', format: 'title' },
  { id: 'dogumTarihi', label: 'Doğum Tarihi' },
  { id: 'telCep', label: 'Telefon (GSM)' },
  { id: 'telEv', label: 'Telefon (Ev)' },
  { id: 'eposta', label: 'E-posta' },
  { id: 'adres', label: 'Adres' },
  { id: 'fakulte', label: 'Fakülte', format: 'title' },
  { id: 'bolum', label: 'Bölüm', format: 'title' },
  { id: 'bitirdigiSinif', label: 'Bitirdiği Sınıf' },
  { id: 'genelNotOrt', label: 'Genel Not Ortalaması (AGNO)' },
  { id: 'okudugiDonem', label: 'Okuduğu Dönem Sayısı' },
  { id: 'tercih1', label: '1. Tercih (Bölüm)', format: 'title' },
  { id: 'tercih2', label: '2. Tercih (Bölüm)', format: 'title' },
  { id: 'tarih', label: 'Günün Tarihi' },
];

window.TEMPLATE_VARS = {
  muafiyet: {
    docTypes: [
      { id: 'muafiyet', label: 'Ders Muafiyet İsteği' },
      { id: 'intibak', label: 'Yaz Dönemi Ders İntibak İsteği' },
      { id: 'dikey', label: 'Dikey Geçiş İsteği' },
    ],
    muafiyet: { static: MUAFIYET_STATIC, row: DERS_ESLESME_ROWS },
    intibak: { static: MUAFIYET_STATIC, row: DERS_ESLESME_ROWS },
    // Dikey geçiş ayrı modülde yürür ama şablon tarafında muafiyet altyapısını
    // kullanmaya devam eder (mevcut şablonlar bozulmasın).
    dikey: { static: MUAFIYET_STATIC, row: DERS_ESLESME_ROWS },
    // Geriye dönük: docType='default' ile kaydedilmiş eski şablonlar
    default: { static: MUAFIYET_STATIC, row: DERS_ESLESME_ROWS },
  },
  // Yatay Geçiş — üç ayrı tür, üçü de aynı değişken setini kullanır.
  // Şablonlar modülünden her tür için ayrı şablon eşlenebilir.
  yataygecis: {
    docTypes: [
      { id: 'kurumici', label: 'Kurum İçi Yatay Geçiş' },
      { id: 'kurumlararasi', label: 'Kurumlararası (Yurt İçi) Yatay Geçiş' },
      { id: 'merkezi', label: 'Merkezi Yerleştirme Puanı ile Yatay Geçiş' },
    ],
    kurumici: { static: YATAY_STATIC, row: YATAY_ROWS },
    kurumlararasi: { static: YATAY_STATIC, row: YATAY_ROWS },
    merkezi: { static: YATAY_STATIC, row: YATAY_ROWS },
    default: { static: YATAY_STATIC, row: YATAY_ROWS },
  },
  // ÇAP (Çift Anadal) / Yandal başvuru dilekçeleri — alanlar şablondaki
  // yer tutucularla birebir: kimlik/iletişim + öğrencilik + 2 tercih.
  capyandal: {
    docTypes: [
      { id: 'cap', label: 'ÇAP (Çift Anadal) Başvuru Dilekçesi' },
      { id: 'yandal', label: 'Yandal Başvuru Dilekçesi' },
    ],
    cap: { static: CAPYANDAL_STATIC, row: [] },
    yandal: { static: CAPYANDAL_STATIC, row: [] },
    default: { static: CAPYANDAL_STATIC, row: [] },
  },
  erasmus: {
    docTypes: [
      { id: 'gidis', label: 'Gidiş Öncesi Değerlendirme' },
      { id: 'donus', label: 'Dönüş Muafiyet İsteği' },
    ],
    gidis: {
      static: [
        ...OGR_KURUM_STATIC,
        { id: 'hostUlke', label: 'Gidilen Ülke', format: 'title' },
        { id: 'hostKurum', label: 'Gidilen Kurum', format: 'title' },
      ],
      row: DERS_ESLESME_ROWS,
    },
    donus: {
      static: [
        ...OGR_KURUM_STATIC,
        { id: 'hostUlke', label: 'Gidilen Ülke', format: 'title' },
        { id: 'hostKurum', label: 'Gidilen Kurum', format: 'title' },
      ],
      row: DERS_ESLESME_ROWS,
    },
  },
  sinav: {
    docTypes: [
      { id: 'bolum', label: 'Bölüm Çıktısı' },
      { id: 'dekanlik', label: 'Dekanlık Çıktısı' },
    ],
    bolum: { static: SINAV_STATIC, row: SINAV_ROWS },
    dekanlik: { static: SINAV_STATIC, row: SINAV_ROWS },
    // Geriye dönük: docType='default' ile kaydedilmiş eski şablonlar
    default: { static: SINAV_STATIC, row: SINAV_ROWS },
  },
  performans: {
    docTypes: [
      { id: 'strateji-izleme', label: 'Stratejik Plan İzleme' },
      { id: 'uc-aylik', label: 'Üç Aylık Gösterge (xlsx, sarı alanlar)' },
    ],
    // Bu belgeler placeholder eşlemesi KULLANMAZ; gösterge koduna/adına göre
    // doldurulur (produceByRowKey / produceQuarterXlsx). Değişken seti boş.
    'strateji-izleme': { static: [], row: [], rowKeyFill: true },
    'uc-aylik': { static: [], row: [], rowKeyFill: true },
    default: { static: [], row: [] },
  },
  akreditasyon: {
    docTypes: [{ id: 'odr', label: 'Öz Değerlendirme Raporu (ÖDR)' }],
    odr: { static: AKREDITASYON_STATIC, row: AKREDITASYON_ROWS },
    default: { static: AKREDITASYON_STATIC, row: AKREDITASYON_ROWS },
  },
  _generic: {
    docTypes: [{ id: 'default', label: 'Belge' }],
    default: {
      static: [
        { id: 'tarih', label: 'Bugünün Tarihi' },
        { id: 'bolumAd', label: 'Bölüm Adı', format: 'title' },
        { id: 'hazirlayan', label: 'Hazırlayan (yetkili adı)', format: 'name' },
      ],
      row: [],
    },
  },
};

// Bir modül+belge-türü için değişken setini çöz
window.templateVarsFor = function (module, docType) {
  const mod = window.TEMPLATE_VARS[module] || window.TEMPLATE_VARS._generic;
  return mod[docType || 'default'] || mod.default || window.TEMPLATE_VARS._generic.default;
};
// Bir modülün belge türleri
window.templateDocTypes = function (module) {
  const mod = window.TEMPLATE_VARS[module] || window.TEMPLATE_VARS._generic;
  return mod.docTypes || [{ id: 'default', label: 'Belge' }];
};

const TemplateEngine = (() => {
  async function ensureJSZip() {
    if (window.JSZip) return window.JSZip;
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
      s.onload = res;
      s.onerror = () => rej(new Error('JSZip yüklenemedi'));
      document.head.appendChild(s);
    });
    return window.JSZip;
  }

  // XML entity çözümü (metin çıkarımında)
  const decodeEnt = (s) =>
    s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  const escapeXml = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  // Yer tutucu deseni: YALNIZCA çift süslü parantez → {{Alan Adı}}
  // İçine boşluk, nokta, Türkçe harf vb. serbestçe yazılabilir (yalnız { } ve
  // satır sonu hariç). Eski xxxx / tek X / 1-2 haneli sayı sezgileri kaldırıldı:
  // normal metinle (tarih, metindeki X vb.) çakışıp yanlış tespit üretiyordu.
  // Artık standart, çakışmayan tek biçim: {{ ... }}.
  const TOKEN_RX = /\{\{[^{}\n]+\}\}/g;

  async function readDocumentXml(arrayBuffer) {
    const JSZip = await ensureJSZip();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const entry = zip.file('word/document.xml');
    if (!entry) throw new Error('Geçersiz .docx (word/document.xml yok)');
    const xml = await entry.async('string');
    return { zip, xml };
  }

  // XLSX yer tutucuları: metinler xl/sharedStrings.xml içindeki <si> girdilerinde
  // durur. Word'den farkı, her <si> bir hücre metnidir (satır/paragraf yok).
  async function detectPlaceholdersXlsx(arrayBuffer) {
    const JSZip = await ensureJSZip();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const ss = zip.file('xl/sharedStrings.xml');
    if (!ss) return [];
    const xml = await ss.async('string');
    const perToken = {};
    const out = [];
    const parcalar = [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
      decodeEnt([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(''))
    );
    parcalar.forEach((metin) => {
      TOKEN_RX.lastIndex = 0;
      let m;
      while ((m = TOKEN_RX.exec(metin)) !== null) {
        const token = m[0];
        perToken[token] = (perToken[token] || 0) + 1;
        // Bağlam: hücrenin tamamı (tek satıra indirgenmiş)
        out.push({
          token,
          tokenOccurrence: perToken[token],
          context: metin.replace(/\s+/g, ' ').trim(),
          variable: '',
          value: '',
        });
      }
    });
    return out;
  }

  // Belgedeki yer tutucuları belge sırasıyla döndürür.
  // Dönen her kayıt: { token, tokenOccurrence, context }
  // .docx ve .xlsx desteklenir — xlsx şablonlarda alan eşlemesi yapılamıyordu.
  async function detectPlaceholders(arrayBuffer) {
    try {
      const JSZip = await ensureJSZip();
      const zip = await JSZip.loadAsync(arrayBuffer);
      if (!zip.file('word/document.xml') && zip.file('xl/sharedStrings.xml')) {
        return await detectPlaceholdersXlsx(arrayBuffer);
      }
    } catch (_) {
      /* docx yoluna düş */
    }
    const { xml } = await readDocumentXml(arrayBuffer);
    // Düz metin: paragrafları satıra çevir, etiketleri at
    const text = decodeEnt(xml.replace(/<w:p\b[^>]*>/g, '\n').replace(/<[^>]+>/g, ''));
    const perToken = {};
    const out = [];
    let m;
    TOKEN_RX.lastIndex = 0;
    while ((m = TOKEN_RX.exec(text)) !== null) {
      const token = m[0];
      perToken[token] = (perToken[token] || 0) + 1;
      const before = text.slice(Math.max(0, m.index - 40), m.index).replace(/\n/g, ' ');
      const after = text
        .slice(m.index + token.length, m.index + token.length + 40)
        .replace(/\n/g, ' ');
      out.push({
        token,
        tokenOccurrence: perToken[token],
        context: (before + '⟪' + token + '⟫' + after).trim(),
        variable: '',
        value: '',
      });
    }
    return out;
  }

  // Token'ı, karakterleri arasında XML etiketlerine (run sınırları) izin
  // veren bir regex'e çevir — Word metni birden çok <w:t>'ye bölebilir.
  const TAGS = '(?:<[^>]*>)*';
  function xmlTokenRegex(token) {
    const parts = token.split('').map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    let pattern = parts.join(TAGS);
    if (token === 'X') {
      // Tek X: harf/rakam komşuluğunda eşleşmesin (etiketler hariç)
      pattern = '(?<![A-Za-zÇĞİÖŞÜçğıöşü0-9])' + pattern + '(?![A-Za-zÇĞİÖŞÜçğıöşü0-9])';
    } else if (/^\d+$/.test(token)) {
      // Sayı token'ı: "7", "17" içinde ya da "12."/"12.04" bitişiğinde eşleşmesin
      pattern = '(?<![A-Za-zÇĞİÖŞÜçğıöşü0-9.])' + pattern + '(?![A-Za-zÇĞİÖŞÜçğıöşü0-9.])';
    }
    return new RegExp(pattern, 'g');
  }

  // XML içinde her alanın (token + tokenOccurrence) mutlak konumunu bul.
  // KRİTİK: eşleşme yalnızca GÖRÜNÜR METİN içindeyse sayılır — XML öznitelik
  // değerlerindeki sayılar (w:val="4", w:sz="16" gibi) sayaç kaydırır ve
  // yanlış alanların değiştirilmesine yol açar. Bu yüzden match'in başlangıcı
  // bir <w:t>…</w:t> aralığında olmalıdır (TAGS deseni sayesinde token
  // run sınırlarını aşabilir; başlangıç noktası yeterli koşuldur).
  function textRangesOf(xml) {
    const ranges = [];
    // DİKKAT: '<w:t' sonrası boşluk ya da '>' ZORUNLU — aksi halde desen
    // <w:tbl>, <w:tc>, <w:tblInd …> gibi w:t ile BAŞLAYAN diğer etiketleri
    // de yakalar ve öznitelik bölgeleri 'görünür metin' sanılır.
    const rx = /<w:t(?:\s[^>]*)?>/g;
    let m;
    while ((m = rx.exec(xml)) !== null) {
      const s = m.index + m[0].length;
      const e = xml.indexOf('</w:t>', s);
      if (e >= 0) ranges.push([s, e]);
    }
    return ranges;
  }

  // Bir eşleşme aralığı YAPISAL etiket içeriyorsa (paragraf/hücre/satır/tablo
  // sınırı) o token'ı değiştirmek belgeyi bozar. TAGS deseni token'ı birden
  // çok run'a bölünmüş halde yakalayabilir; ama iki ayrı paragraf/hücreye
  // yayılmışsa bu meşru bir yer tutucu değildir. Böyle eşleşmeler reddedilir.
  const STRUCT_TAG = /<\/?w:(p|tc|tr|tbl|sectPr|tblPr|tblGrid|body)\b/;

  // '<w:tr>' AÇILIŞ etiketini bul — KRİTİK: düz string araması ('<w:tr')
  // '<w:trPr>' ile de eşleşir (ikisi de '<w:tr' ile başlar). Bu, satır
  // bölgesinin başlangıcını yanlış (satır-özellikleri etiketine) kaydırıp
  // gerçek <w:tr> açılışını bölge dışında bırakır ve çıktı XML'ini bozar.
  // Bu yüzden '<w:tr' sonrası ' ' veya '>' zorunlu (trPr'yi dışlar).
  const TR_OPEN_RX = /<w:tr(?=[ >])/g;
  // pos'tan ÖNCEKI son <w:tr> açılışının konumu (yoksa -1)
  function lastTrOpenBefore(xml, pos) {
    TR_OPEN_RX.lastIndex = 0;
    let last = -1;
    let m;
    while ((m = TR_OPEN_RX.exec(xml)) !== null) {
      if (m.index >= pos) break;
      last = m.index;
    }
    return last;
  }
  // pos'tan İTİBAREN ilk <w:tr> açılışının konumu (yoksa -1)
  function firstTrOpenFrom(xml, pos) {
    TR_OPEN_RX.lastIndex = pos < 0 ? 0 : pos;
    const m = TR_OPEN_RX.exec(xml);
    return m ? m.index : -1;
  }

  function locateFields(xml, fields) {
    const ranges = textRangesOf(xml);
    const inText = (pos) => {
      for (let i = 0; i < ranges.length; i++) {
        if (pos >= ranges[i][0] && pos < ranges[i][1]) return true;
        if (ranges[i][0] > pos) return false; // aralıklar sıralı
      }
      return false;
    };
    const perTokenPos = {}; // token → [{start,end}, …] belge sırasında
    const tokens = [...new Set(fields.map((f) => f.token))];
    tokens.forEach((token) => {
      const rx = xmlTokenRegex(token);
      const list = [];
      let m;
      while ((m = rx.exec(xml)) !== null) {
        const matchStr = m[0];
        // Başlangıç görünür metinde VE aralık yapısal sınır aşmıyorsa kabul
        if (inText(m.index) && !STRUCT_TAG.test(matchStr)) {
          list.push({ start: m.index, end: m.index + matchStr.length });
        }
        // İç içe eşleşme kaymalarını önle
        rx.lastIndex = m.index + Math.max(1, matchStr.length);
      }
      perTokenPos[token] = list;
    });
    return fields.map((f) => {
      const pos = (perTokenPos[f.token] || [])[f.tokenOccurrence - 1] || null;
      return { ...f, _pos: pos };
    });
  }

  // Konumlara göre (sondan başa) değiştirme — offset kayması olmaz
  function applyReplacements(xml, repls) {
    const sorted = repls.filter((r) => r._pos).sort((a, b) => b._pos.start - a._pos.start);
    let out = xml;
    sorted.forEach((r) => {
      out = out.slice(0, r._pos.start) + escapeXml(r._value) + out.slice(r._pos.end);
    });
    return out;
  }

  // Veri (alt) satırlarından KALIN (bold) biçimini kaldır — yalnızca çoğaltılan
  // satırlara uygulanır; başlık satırı ve statik metin dokunulmadan kalır.
  // Word'ün kalın işareti <w:b/> ya da <w:b w:val="true"/>; w:val="false/0"
  // zaten kalın-değil demek, ona dokunmuyoruz.
  function stripBoldRuns(xml) {
    return xml
      .replace(/<w:b(?:Cs)?(?:\s+w:val="(?:false|0)")\s*\/>/g, '') // zaten kapalı: sadeleştir
      .replace(/<w:b(?:Cs)?(?:\s+w:val="(?:true|1)")?\s*\/>/g, '') // <w:b/> / <w:b w:val="true"/>
      .replace(/<w:b(?:Cs)?(?:\s[^>]*)?>\s*<\/w:b(?:Cs)?>/g, ''); // paired <w:b></w:b>
  }

  // Bir satır XML'indeki <w:tc>…</w:tc> hücrelerini (sıralı) döndürür.
  function tcCells(rowXml) {
    const cells = [];
    const rx = /<w:tc\b[\s\S]*?<\/w:tc>/g;
    let m;
    while ((m = rx.exec(rowXml)) !== null) {
      cells.push({ start: m.index, end: m.index + m[0].length, xml: m[0] });
    }
    return cells;
  }

  // Bir hücreye dikey birleştirme (vMerge) ekle.
  //   mode='restart' → grubun ilk satırı (değer burada durur)
  //   mode='continue' → alttaki satırlar (içerik boş, üstteki hücreyle birleşir)
  // vMerge, OOXML şema sırasına uygun olsun diye tcW/gridSpan'dan SONRA,
  // tcBorders/shd'den ÖNCE eklenir; mevcut vMerge varsa temizlenir.
  function injectVMerge(cellXml, mode) {
    const tag = mode === 'restart' ? '<w:vMerge w:val="restart"/>' : '<w:vMerge/>';
    if (/<w:tcPr\s*\/>/.test(cellXml)) {
      return cellXml.replace(/<w:tcPr\s*\/>/, '<w:tcPr>' + tag + '</w:tcPr>');
    }
    const pm = cellXml.match(/<w:tcPr>([\s\S]*?)<\/w:tcPr>/);
    if (pm) {
      let inner = pm[1].replace(/<w:vMerge(?:\s[^>]*)?\/>/g, '');
      let insertPos = 0;
      const tcw = inner.match(/<w:tcW[^>]*\/>/);
      if (tcw) insertPos = Math.max(insertPos, tcw.index + tcw[0].length);
      const gs = inner.match(/<w:gridSpan[^>]*\/>/);
      if (gs) insertPos = Math.max(insertPos, gs.index + gs[0].length);
      inner = inner.slice(0, insertPos) + tag + inner.slice(insertPos);
      return cellXml.replace(/<w:tcPr>[\s\S]*?<\/w:tcPr>/, '<w:tcPr>' + inner + '</w:tcPr>');
    }
    // tcPr yok — hücre açılışından hemen sonra ekle
    return cellXml.replace(/(<w:tc(?:\s[^>]*)?>)/, '$1<w:tcPr>' + tag + '</w:tcPr>');
  }

  function resolveValue(field, staticData) {
    if (field.variable === 'const') return field.value || '';
    if (field.variable && field.variable.startsWith('static:')) {
      const id = field.variable.slice(7);
      return staticData[id] != null ? String(staticData[id]) : '';
    }
    return null; // atla / row (bu geçişte değil)
  }

  // ── Tür-kelimesi ikilenmesini önleme (tüm şablonlarda) ──
  // Şablon çoğu zaman yer tutucudan SONRA tür kelimesini statik yazar
  // ("{{Karşı kurum}} Üniversitesi", "{{Çakü Bölüm}} Mühendisliği …"). Öğrenci
  // değeri tam yazınca ("Bursa Uludağ Üniversitesi") çıktı ikilenir
  // ("… Üniversitesi Üniversitesi"). Değerin son kelimesi, yer tutucudan hemen
  // sonra gelen statik kelimeyle aynı "tür"deyse, değerden o kelimeyi kırparız.
  // Kök bazlı eşleşme, Türkçe çekim eklerini (Üniversite/Üniversitesi,
  // Bölüm/Bölümü, Mühendislik/Mühendisliği) tolere eder.
  const _TYPE_WORD_ROOTS = [
    'ünivers',
    'fakült',
    'bölüm',
    'enstit',
    'yükseko',
    'mühendis',
    'dekan',
    'rektör',
    'müdürl',
    'başkan',
    'anabilim',
    'meslek',
    // İngilizce karşılıklar (Erasmus yurtdışı kurum adları) — "University
    // University", "Faculty of Faculty", "Department of Department" tekrarını da önle.
    'univers',
    'facult',
    'departmen',
  ];
  function _typeWordRoot(word) {
    const w = (word || '')
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLowerCase()
      .replace(/[^0-9a-zçğıöşü]/g, '');
    if (!w) return null;
    for (const r of _TYPE_WORD_ROOTS) if (w.startsWith(r)) return r;
    return null;
  }
  // xml içinde pos'tan sonraki İLK görünür kelime (etiketleri atlayarak); ancak
  // paragraf/hücre/satır sınırı geçilirse "yok" sayılır (ayrı bağlam).
  function _firstVisibleWordAfter(xml, pos) {
    let text = '';
    let i = pos;
    while (i < xml.length && text.length < 60) {
      if (xml[i] === '<') {
        const close = xml.indexOf('>', i);
        if (close < 0) break;
        const tag = xml.slice(i, close + 1);
        if (/<\/?w:(p|tc|tr|tbl|body)\b/.test(tag)) break;
        i = close + 1;
      } else {
        text += xml[i];
        i++;
      }
    }
    const m = decodeEnt(text).replace(/^\s+/, '').match(/^\S+/);
    return m ? m[0] : '';
  }
  function dedupeTrailingTypeWord(value, xml, posEnd) {
    if (!value) return value;
    const words = String(value).trim().split(/\s+/);
    if (words.length < 2) return value; // tek kelimeyi kırpma
    const lastRoot = _typeWordRoot(words[words.length - 1]);
    if (!lastRoot) return value;
    const nextWord = _firstVisibleWordAfter(xml, posEnd);
    if (nextWord && _typeWordRoot(nextWord) === lastRoot) {
      words.pop();
      return words.join(' ');
    }
    return value;
  }

  // ── Türkçe-duyarlı harf normalizasyonu (tüm şablonlarda) ──
  // JS'in standart toLowerCase/toUpperCase'i Türkçe'de yanlıştır (I→i, İ→i̇).
  // Bu yüzden i/İ/ı/I özel olarak eşlenir.
  function _trLower(s) {
    return String(s).replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr-TR');
  }
  function _trUpper(s) {
    return String(s).replace(/i/g, 'İ').replace(/ı/g, 'I').toLocaleUpperCase('tr-TR');
  }
  // Her kelimenin ilk harfi büyük, kalanı küçük (kelime başı = başta ya da
  // harf/rakam olmayan bir karakterden sonra gelen ilk harf). Parantez/tire
  // sonrası da doğru büyütülür: "(şube 1-2)" → "(Şube 1-2)".
  function _titleCaseTr(s) {
    return _trLower(s).replace(
      /(^|[^0-9a-zçğıöşü])([a-zçğıöşü])/g,
      (_m, pre, ch) => pre + _trUpper(ch)
    );
  }
  // Ad-soyad: son kelime SOYAD (tümü büyük), önceki kelimeler ad (ilk harf
  // büyük): "gizem yurtseven" → "Gizem YURTSEVEN".
  function _nameCaseTr(s) {
    const parts = String(s).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return String(s);
    if (parts.length === 1) return _titleCaseTr(parts[0]);
    const last = parts.pop();
    return parts.map(_titleCaseTr).join(' ') + ' ' + _trUpper(last);
  }
  function formatCaseTr(value, mode) {
    if (value == null) return value;
    const s = String(value);
    if (!s.trim() || !mode || mode === 'none') return value;
    if (mode === 'name') return _nameCaseTr(s);
    if (mode === 'title') return _titleCaseTr(s);
    if (mode === 'upper') return _trUpper(s);
    if (mode === 'lower') return _trLower(s);
    return value;
  }

  // Şablonu verilerle doldurup .docx Blob döndürür.
  //   fields: eşleme kayıtları (detect sırası korunmuş)
  //   staticData: { degiskenId: değer }
  //   rows: [{ degiskenId: değer }, …] — satır değişkenleri için tablo satırı
  async function generateDocx(arrayBuffer, fields, staticData, rows, opts) {
    const stripRowBold = !!(opts && opts.stripRowBold);
    const { zip, xml } = await readDocumentXml(arrayBuffer);
    const located = locateFields(xml, fields);

    const isRow = (f) => f.variable && f.variable.startsWith('row:');
    const rowFields = located.filter((f) => isRow(f) && f._pos);
    const staticFields = located.filter((f) => !isRow(f));

    // İki satır kuralı desteklenir:
    //   KLON modu   → satır değişkenleri kendi başına bir tablo satırındaysa
    //                 o satır ders sayısı kadan çoğaltılır.
    //   İŞARETÇİ modu → değişkenler sütun BAŞLIKLARININ içindeyse
    //                 ("Kodu 7", "Adı 8" gibi), işaretler başlıktan silinir
    //                 ve hemen ALTINDAKİ boş satır sütun hizasıyla çoğaltılır.
    let rowRegion = null; // { start, end, tpl, rowFieldRel } — klon modu
    let markerRegion = null; // { start, end, cleanedHeader, dataStart, dataEnd, dataTpl, cellVars }
    if (rowFields.length > 0) {
      const anchor = rowFields[0]._pos.start;
      const trStart = lastTrOpenBefore(xml, anchor);
      const trEnd = xml.indexOf('</w:tr>', anchor);
      if (trStart >= 0 && trEnd >= 0) {
        const end = trEnd + '</w:tr>'.length;
        const tpl = xml.slice(trStart, end);
        const rowFieldRel = rowFields
          .filter((f) => f._pos.start >= trStart && f._pos.end <= end)
          .map((f) => ({
            ...f,
            _pos: { start: f._pos.start - trStart, end: f._pos.end - trStart },
          }));

        // Satır metni, token'lar çıkarılınca anlamlı kelime içeriyor mu?
        // İçeriyorsa bunlar sütun başlığı işaretçileridir (İŞARETÇİ modu).
        let plain = tpl.replace(/<[^>]+>/g, '');
        rowFieldRel.forEach((f) => {
          plain = plain.replace(f.token, '');
        });
        // Satır-değişkeni OLMAYAN ama satır içinde kalan {{...}} yer tutucularını
        // (ör. statik "{{dönem}}") da temizle — bunlar başlık kelimesi değildir.
        // Yoksa satır tamamı placeholder olsa bile motor yanlışlıkla İŞARETÇİ
        // moduna geçip ilk satırı "başlık" sanıyor (dönem dolmuyor, boş satır).
        plain = plain.replace(/\{\{[^{}\n]*\}\}/g, '');
        const isMarkerMode = /[A-Za-zÇĞİÖŞÜçğıöşü]{3}/.test(plain);

        if (!isMarkerMode) {
          rowRegion = { start: trStart, end, tpl, rowFieldRel };
        } else {
          // Hücre sınırlarını çıkar, her değişkenin sütun indeksini bul
          const cellsOf = (rowXml) => {
            const cells = [];
            const rx = /<w:tc\b[\s\S]*?<\/w:tc>/g;
            let m;
            while ((m = rx.exec(rowXml)) !== null) {
              cells.push({ start: m.index, end: m.index + m[0].length });
            }
            return cells;
          };
          const headerCells = cellsOf(tpl);
          const cellVars = rowFieldRel
            .map((f) => ({
              varId: f.variable.slice(4),
              cellIndex: headerCells.findIndex(
                (c) => f._pos.start >= c.start && f._pos.end <= c.end
              ),
            }))
            .filter((cv) => cv.cellIndex >= 0);

          // İşaretleri başlıktan sil (önündeki boşlukla birlikte)
          const cleanedHeader = applyReplacements(
            tpl,
            rowFieldRel.map((f) => {
              const s =
                f._pos.start > 0 && tpl[f._pos.start - 1] === ' ' ? f._pos.start - 1 : f._pos.start;
              return { _pos: { start: s, end: f._pos.end }, _value: '' };
            })
          );

          // Veri şablonu = başlık satırının hemen altındaki satır
          const dataStart = firstTrOpenFrom(xml, end);
          const dataEnd = dataStart >= 0 ? xml.indexOf('</w:tr>', dataStart) : -1;
          if (dataStart >= 0 && dataEnd >= 0) {
            markerRegion = {
              start: trStart,
              end,
              cleanedHeader,
              dataStart,
              dataEnd: dataEnd + '</w:tr>'.length,
              dataTpl: xml.slice(dataStart, dataEnd + '</w:tr>'.length),
              cellVars,
            };
          } else {
            // Altında satır yoksa klon moduna düş
            rowRegion = { start: trStart, end, tpl, rowFieldRel };
          }
        }
      }
    }

    // Hücredeki mevcut yazı-tipi ayarını (rPr) bul — enjekte edilen değer
    // aynı boyut/stille yazılsın. Öncelik: mevcut bir run'ın rPr'si, yoksa
    // paragraf işaretinin rPr'si (<w:pPr><w:rPr>), o da yoksa boş.
    function cellRunProps(cellXml) {
      let m = cellXml.match(/<w:r\b[^>]*>\s*(<w:rPr>[\s\S]*?<\/w:rPr>)/);
      if (m) return m[1];
      m = cellXml.match(/<w:pPr>[\s\S]*?(<w:rPr>[\s\S]*?<\/w:rPr>)[\s\S]*?<\/w:pPr>/);
      if (m) return m[1];
      return '';
    }

    // İşaretçi modunda bir veri satırını doldur: değeri ilgili hücrenin
    // paragrafına run olarak enjekte eder (sondan başa — offset güvenli).
    // Enjekte edilen run, hücrenin mevcut font ayarını (rPr) devralır.
    function fillDataRow(dataTpl, cellVars, rowData) {
      const cells = [];
      const rx = /<w:tc\b[\s\S]*?<\/w:tc>/g;
      let m;
      while ((m = rx.exec(dataTpl)) !== null) {
        cells.push({ start: m.index, end: m.index + m[0].length, xml: m[0] });
      }
      let out = dataTpl;
      const sorted = cellVars.slice().sort((a, b) => b.cellIndex - a.cellIndex);
      sorted.forEach((cv) => {
        const cell = cells[cv.cellIndex];
        if (!cell) return;
        const val = rowData[cv.varId] != null ? String(rowData[cv.varId]) : '';
        const pEnd = out.slice(cell.start, cell.end).indexOf('</w:p>');
        if (pEnd < 0) return;
        const insertAt = cell.start + pEnd;
        const rPr = cellRunProps(cell.xml);
        out =
          out.slice(0, insertAt) +
          '<w:r>' +
          rPr +
          '<w:t xml:space="preserve">' +
          escapeXml(val) +
          '</w:t></w:r>' +
          out.slice(insertAt);
      });
      return out;
    }

    // 1) Statik alanlar: satır/işaretçi bölgesi DIŞINDA kalanlar
    const exclStart = markerRegion ? markerRegion.start : rowRegion ? rowRegion.start : -1;
    const exclEnd = markerRegion ? markerRegion.dataEnd : rowRegion ? rowRegion.end : -1;
    const staticRepls = staticFields
      .filter(
        (f) => f._pos && (exclStart < 0 || f._pos.end <= exclStart || f._pos.start >= exclEnd)
      )
      .map((f) => {
        const raw = resolveValue(f, staticData);
        // Tür-kelimesi ikilenmesini önle (örn. "… Üniversitesi Üniversitesi").
        const val = raw == null ? raw : dedupeTrailingTypeWord(raw, xml, f._pos.end);
        return { ...f, _value: val };
      })
      .filter((f) => f._value !== null);

    let out;
    if (markerRegion) {
      // İŞARETÇİ modu: temiz başlık + sütun hizalı veri satırları
      const renderedRows = (rows || [])
        .map((rowData) => {
          const r = fillDataRow(markerRegion.dataTpl, markerRegion.cellVars, rowData);
          return stripRowBold ? stripBoldRuns(r) : r;
        })
        .join('');
      const head = applyReplacements(
        xml.slice(0, markerRegion.start),
        staticRepls.filter((f) => f._pos.end <= markerRegion.start)
      );
      // Başlık ile veri satırı arasında kalan XML (varsa) korunur
      const between = xml.slice(markerRegion.end, markerRegion.dataStart);
      const tailOffset = markerRegion.dataEnd;
      const tail = applyReplacements(
        xml.slice(tailOffset),
        staticRepls
          .filter((f) => f._pos.start >= tailOffset)
          .map((f) => ({
            ...f,
            _pos: { start: f._pos.start - tailOffset, end: f._pos.end - tailOffset },
          }))
      );
      out = head + markerRegion.cleanedHeader + between + renderedRows + tail;
    } else if (rowRegion) {
      // Şablon satırındaki her hücrenin hangi satır-değişkenini taşıdığını
      // (sütun→değişken haritası) bir kez çıkar — vMerge (hücre birleştirme)
      // için gerekli. rowData._merge[varId] = 'restart' | 'continue' ise o
      // sütunun hücresine dikey birleştirme uygulanır.
      const tplCells = tcCells(rowRegion.tpl);
      const cellVarOf = tplCells.map((c) => {
        const f = rowRegion.rowFieldRel.find(
          (rf) => rf._pos.start >= c.start && rf._pos.end <= c.end
        );
        return f ? f.variable.slice(4) : null;
      });
      // STATİK alan tekrarlanan satırın İÇİNDE ise (örn. Erasmus "{{dönem}}"
      // hücresi ders satırında) her klonda doldurulmalı — yoksa yer tutucu
      // olduğu gibi kalır. Bu alanları tpl'e göre konumlandırıp klon başına uygula.
      const rowStaticRels = staticFields
        .filter((f) => f._pos && f._pos.start >= rowRegion.start && f._pos.end <= rowRegion.end)
        .map((f) => {
          const raw = resolveValue(f, staticData);
          const val = raw == null ? '' : dedupeTrailingTypeWord(raw, xml, f._pos.end);
          return {
            ...f,
            _pos: { start: f._pos.start - rowRegion.start, end: f._pos.end - rowRegion.start },
            _value: val == null ? '' : val,
          };
        });
      // TÜM satır değişkenleri boş olan satırları render ETME — çağıran boş
      // satır geçse bile çıktıda hayalet/boş satır oluşmasın (motor güvencesi).
      const rowVarIds = rowRegion.rowFieldRel.map((f) => f.variable.slice(4));
      const nonEmptyRows = (rows || []).filter((rd) =>
        rowVarIds.some((id) => rd[id] != null && String(rd[id]).trim() !== '')
      );
      const renderedRows = nonEmptyRows
        .map((rowData) => {
          const merge = rowData._merge || null;
          const rowRepls = rowRegion.rowFieldRel.map((f) => {
            const varId = f.variable.slice(4);
            const st = merge && merge[varId];
            // 'continue' hücreleri boşaltılır (üstteki hücreyle birleşecek)
            const val =
              st === 'continue' ? '' : rowData[varId] != null ? String(rowData[varId]) : '';
            return { ...f, _value: val };
          });
          let r = applyReplacements(rowRegion.tpl, rowRepls.concat(rowStaticRels));
          if (stripRowBold) r = stripBoldRuns(r);
          // vMerge enjeksiyonu — hücre indeksleri şablonla aynı kaldığından
          // (replacement yalnızca token metnini değiştirir) sondan başa uygula
          if (merge) {
            const cells = tcCells(r);
            for (let ci = cells.length - 1; ci >= 0; ci--) {
              const varId = cellVarOf[ci];
              const st = varId && merge[varId];
              if (st) {
                const nc = injectVMerge(cells[ci].xml, st);
                r = r.slice(0, cells[ci].start) + nc + r.slice(cells[ci].end);
              }
            }
          }
          return r;
        })
        .join('');
      const head = applyReplacements(
        xml.slice(0, rowRegion.start),
        staticRepls.filter((f) => f._pos.end <= rowRegion.start)
      );
      const tailOffset = rowRegion.end;
      const tail = applyReplacements(
        xml.slice(tailOffset),
        staticRepls
          .filter((f) => f._pos.start >= tailOffset)
          .map((f) => ({
            ...f,
            _pos: { start: f._pos.start - tailOffset, end: f._pos.end - tailOffset },
          }))
      );
      out = head + renderedRows + tail;
    } else {
      out = applyReplacements(xml, staticRepls);
    }

    // ÇIKTI DOĞRULAMA: yalnızca etiket DENGESİ kontrol edilir (namespace-agnostic).
    // DOMParser namespace bağlama konusunda Word'den katıdır ve geçerli OOXML'i
    // "bozuk" sanıp yanlış-pozitif üretiyordu; onun yerine açılış/kapanış etiket
    // dengesini sayan hafif kontrol — motor'un yapısal etiket bozması (gerçek
    // hata) yakalanır, geçerli belge reddedilmez.
    const balance = tagBalanceFailure(out);
    if (balance) {
      // Tanılama: dengenin ilk bozulduğu noktayı ve çevresini konsola yaz —
      // hangi run/hücre sınırının koptuğu görülsün (kök neden teşhisi).
      try {
        const snippet = out.slice(Math.max(0, balance.pos - 200), balance.pos + 120);
        console.error(
          '[TemplateEngine] Etiket dengesi bozuldu →',
          balance.reason,
          '@',
          balance.pos,
          '\n--- çevre XML ---\n' + snippet + '\n-----------------'
        );
      } catch (_) {
        /* konsol yoksa yut */
      }
      throw new Error('Şablon çıktısında etiket dengesi bozuldu. (' + balance.reason + ')');
    }

    zip.file('word/document.xml', out);
    return zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }

  // Hafif, namespace-agnostic etiket dengesi kontrolü. Açılış/kapanış
  // etiketlerini bir yığınla eşler; self-closing ve <?…?>/<!--…--> atlanır.
  // Motor'un yapısal etiket silmesi gibi GERÇEK bozulmaları yakalar,
  // geçerli OOXML'i (namespace prefix'i ne olursa olsun) reddetmez.
  function isTagBalanced(xml) {
    return tagBalanceFailure(xml) === null;
  }

  // Denge bozulmuşsa { pos, reason } döndürür, dengeliyse null.
  // reason: hangi etiketin nerede sırayı bozduğunu insan-okur biçimde anlatır.
  function tagBalanceFailure(xml) {
    const stack = [];
    const rx =
      /<\/?([A-Za-z_][\w:.-]*)([^>]*?)(\/?)>|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g;
    let m;
    while ((m = rx.exec(xml)) !== null) {
      const whole = m[0];
      if (whole.startsWith('<?') || whole.startsWith('<!--') || whole.startsWith('<![CDATA[')) {
        continue;
      }
      const name = m[1];
      const selfClose = m[3] === '/';
      if (whole.startsWith('</')) {
        if (stack.length === 0) {
          return { pos: m.index, reason: 'fazladan kapanış </' + name + '>' };
        }
        if (stack[stack.length - 1].name !== name) {
          return {
            pos: m.index,
            reason:
              'kapanış </' +
              name +
              '> ama açık olan <' +
              stack[stack.length - 1].name +
              '> (@' +
              stack[stack.length - 1].pos +
              ')',
          };
        }
        stack.pop();
      } else if (!selfClose) {
        stack.push({ name, pos: m.index });
      }
    }
    if (stack.length > 0) {
      const top = stack[stack.length - 1];
      return { pos: top.pos, reason: 'kapanmamış <' + top.name + '>' };
    }
    return null;
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  // Uçtan uca yardımcı: modül+belge-türü için atanmış şablonu çözer, verilerle
  // doldurur ve indirir. Şablon yoksa/eşleme yoksa { ok:false, reason } döner
  // — çağıran modül isterse gömülü çıktıya (fallback) düşer.
  //   opts: { module, docType, departmentId, staticData, rows, filename }
  async function produceFromTemplate(opts) {
    const token = localStorage.getItem('caku_auth_token');
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    const url =
      '/api/templates/resolve?module=' +
      encodeURIComponent(opts.module) +
      '&docType=' +
      encodeURIComponent(opts.docType || 'default') +
      '&departmentId=' +
      encodeURIComponent(opts.departmentId || '');
    let tpl;
    try {
      const r = await fetch(url, { headers, credentials: 'include' });
      const d = await r.json().catch(() => ({}));
      tpl = d.template;
    } catch (e) {
      return { ok: false, reason: 'network', message: e.message };
    }
    if (!tpl) return { ok: false, reason: 'no-template' };
    if (!tpl.file || tpl.file.extension !== 'docx') {
      return { ok: false, reason: 'not-docx' };
    }
    if (!(tpl.fields || []).some((f) => f.variable)) {
      return { ok: false, reason: 'no-mapping' };
    }
    let buf;
    try {
      const fr = await fetch('/api/templates/' + tpl._id + '/download', {
        headers,
        credentials: 'include',
      });
      if (!fr.ok) throw new Error('indirilemedi');
      buf = await fr.arrayBuffer();
    } catch (e) {
      return { ok: false, reason: 'download', message: e.message };
    }
    // Değişken-bazlı Türkçe harf normalizasyonu: katalogdaki `format` etiketine
    // göre değerler biçimlenir (ad→'name', ders/kurum adları→'title', kod/akts/
    // tarih→dokunma). Motor tüm modüllerce paylaşıldığından her şablonda geçerli.
    const _vars =
      (window.templateVarsFor && window.templateVarsFor(opts.module, opts.docType)) || {};
    const _fmtById = {};
    [...(_vars.static || []), ...(_vars.row || [])].forEach((v) => {
      if (v && v.format) _fmtById[v.id] = v.format;
    });
    const _applyFmt = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      const out = {};
      for (const k in obj) out[k] = _fmtById[k] ? formatCaseTr(obj[k], _fmtById[k]) : obj[k];
      return out;
    };
    const _staticData = _applyFmt(opts.staticData || {});
    const _rows = (opts.rows || []).map(_applyFmt);

    let blob;
    try {
      blob = await generateDocx(buf, tpl.fields, _staticData, _rows, {
        stripRowBold: !!opts.stripRowBold,
      });
    } catch (e) {
      // Motor bozuk XML üretti (şablonun karmaşık yapısı) — sessiz bozuk
      // dosya indirmek yerine çağırana bildir; o yerleşik biçime düşebilir.
      // Gerçek sebebi konsola da yaz (tanılama için — uyarı mesajı kısaltılmış).
      try {
        console.error(
          '[TemplateEngine] generateDocx hatası:',
          e && e.message,
          '\nmodule=',
          opts.module,
          'docType=',
          opts.docType,
          'tpl=',
          tpl && tpl._id,
          'fields=',
          (tpl.fields || []).length,
          e
        );
      } catch (_) {
        /* konsol yoksa yut */
      }
      return { ok: false, reason: 'invalid-output', message: e && e.message };
    }
    // opts.noDownload: yalnız blob istenir (ör. snapshot yükleme) — indirme yok.
    if (!opts.noDownload) downloadBlob(blob, opts.filename || 'belge.docx');
    // blob geri döndürülür ki çağıran (ör. dilekçe snapshot'ı) yükleyebilsin.
    return { ok: true, blob, filename: opts.filename || 'belge.docx' };
  }

  // ── SATIR-KODU (PG) DOLDURMA — Stratejik Plan İzleme gibi "boşluk doldurma"
  // belgeleri için. Placeholder yok; her tablo satırının 1. hücresindeki
  // gösterge kodu (PG x.y.z) anahtar; 2. ve 3. hücreler (Değer, Açıklama)
  // verilerle doldurulur. Diğer satırlar/hücreler dokunulmaz — çıktı TÜM
  // şablonu içerir, sadece verisi olan göstergeler dolar.

  // Hücre görünür metnini çıkar (entity çözülür)
  function cellText(cellXml) {
    return (cellXml.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || [])
      .map((x) => x.replace(/<[^>]+>/g, ''))
      .join('')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  // Hücrenin yazı-tipi ayarını (rPr) bul (run → yoksa paragraf işareti)
  function cellRPr(cellXml) {
    let m = cellXml.match(/<w:r\b[^>]*>\s*(<w:rPr>[\s\S]*?<\/w:rPr>)/);
    if (m) return m[1];
    m = cellXml.match(/<w:pPr>[\s\S]*?(<w:rPr>[\s\S]*?<\/w:rPr>)[\s\S]*?<\/w:pPr>/);
    if (m) return m[1];
    return '';
  }

  // Boş bir hücrenin ilk paragrafına değeri run olarak enjekte et
  function fillCell(cellXml, val) {
    const rPr = cellRPr(cellXml);
    const run = '<w:r>' + rPr + '<w:t xml:space="preserve">' + escapeXml(val) + '</w:t></w:r>';
    const idx = cellXml.indexOf('</w:p>');
    if (idx < 0) return cellXml;
    return cellXml.slice(0, idx) + run + cellXml.slice(idx);
  }

  const normCode = (k) =>
    String(k || '')
      .replace(/\s+/g, '')
      .replace(/\.+$/, '')
      .toUpperCase();

  // xml içindeki tablo satırlarını, 1. hücredeki PG koduna göre doldur.
  //   dataByKey: { 'PG 1.1.1': { deger, aciklama }, … }
  function fillRowsByKey(xml, dataByKey) {
    const data = {};
    Object.keys(dataByKey || {}).forEach((k) => {
      data[normCode(k)] = dataByKey[k];
    });
    return xml.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, (tbl) =>
      tbl.replace(/<w:tr\b[\s\S]*?<\/w:tr>/g, (tr) => {
        const cells = tcCells(tr);
        if (cells.length < 3) return tr;
        const c0 = cellText(cells[0].xml);
        const m = c0.match(/PG\s*\d+\.\d+\.\d+/i);
        if (!m) return tr;
        const rec = data[normCode(m[0])];
        if (!rec) return tr;
        let out = tr;
        // sondan başa (offset güvenli): 3. hücre (açıklama), 2. hücre (değer)
        [
          [2, rec.aciklama],
          [1, rec.deger],
        ].forEach(([ci, val]) => {
          if (val == null || String(val) === '') return;
          const cell = cells[ci];
          if (!cell) return;
          out = out.slice(0, cell.start) + fillCell(cell.xml, String(val)) + out.slice(cell.end);
        });
        return out;
      })
    );
  }

  // Şablondaki gösterge satırlarını çıkar → form üretmek için.
  //   döner: [{ amac, hedef, code, desc, unit, isAcademic }]
  async function parseRowIndicators(arrayBuffer) {
    const { xml } = await readDocumentXml(arrayBuffer);
    const tbls = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
    const acadRx = /akademik birim|fak[üu]lte|enstit[üu]|y[üu]ksekokul/i;
    const out = [];
    tbls.forEach((tbl) => {
      const rows = tbl.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || [];
      let amac = '';
      let hedef = '';
      rows.forEach((r) => {
        const cells = tcCells(r);
        if (cells.length < 2) return;
        const c0 = cellText(cells[0].xml).trim();
        const c1 = cellText(cells[1].xml).trim();
        if (/^A\s*\d+$/i.test(c0)) amac = c1;
        else if (/^H\s*\d/i.test(c0) && !/performans/i.test(c0)) hedef = c1;
      });
      rows.forEach((r) => {
        const cells = tcCells(r);
        if (cells.length < 3) return;
        const c0 = cellText(cells[0].xml).trim();
        const m = c0.match(/PG\s*\d+\.\d+\.\d+/i);
        if (!m) return;
        const par = c0.match(/\(([^)]*?)\s*taraf[ıi]ndan\s*doldurulacak/i);
        const unit = par ? par[1].trim() : '';
        out.push({
          amac,
          hedef,
          code: m[0].replace(/\s+/g, ' ').trim(),
          desc: c0,
          unit,
          isAcademic: acadRx.test(unit),
        });
      });
    });
    return out;
  }

  // Uçtan uca: atanmış şablonu çöz, PG koduna göre doldur, indir.
  //   opts: { module, docType, departmentId, dataByKey, filename }
  async function produceByRowKey(opts) {
    const token = localStorage.getItem('caku_auth_token');
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    const url =
      '/api/templates/resolve?module=' +
      encodeURIComponent(opts.module) +
      '&docType=' +
      encodeURIComponent(opts.docType || 'default') +
      '&departmentId=' +
      encodeURIComponent(opts.departmentId || '');
    let tpl;
    try {
      const r = await fetch(url, { headers, credentials: 'include' });
      const d = await r.json().catch(() => ({}));
      tpl = d.template;
    } catch (e) {
      return { ok: false, reason: 'network', message: e.message };
    }
    if (!tpl) return { ok: false, reason: 'no-template' };
    if (!tpl.file || tpl.file.extension !== 'docx') return { ok: false, reason: 'not-docx' };
    let buf;
    try {
      const fr = await fetch('/api/templates/' + tpl._id + '/download', {
        headers,
        credentials: 'include',
      });
      if (!fr.ok) throw new Error('indirilemedi');
      buf = await fr.arrayBuffer();
    } catch (e) {
      return { ok: false, reason: 'download', message: e.message };
    }
    try {
      const { zip, xml } = await readDocumentXml(buf);
      const out = fillRowsByKey(xml, opts.dataByKey || {});
      const bal = tagBalanceFailure(out);
      if (bal) {
        try {
          console.error('[TemplateEngine] satır-kodu doldurma denge hatası:', bal.reason);
        } catch (_) {
          /* yut */
        }
        return { ok: false, reason: 'invalid-output', message: bal.reason };
      }
      zip.file('word/document.xml', out);
      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      if (!opts.noDownload) downloadBlob(blob, opts.filename || 'belge.docx');
      return { ok: true, blob, filename: opts.filename || 'belge.docx' };
    } catch (e) {
      return { ok: false, reason: 'invalid-output', message: e && e.message };
    }
  }

  // ── ÜÇ AYLIK XLSX DOLDURMA — "sarı" hücreli gösterge tablosu ──
  // Şablonda SARI dolgulu hücreler (C/D/E gibi ay sütunları) o satırın
  // göstergesinin aylık değeriyle doldurulur. Satır göstergesi, 1. hücredeki
  // (A/B) ada göre eşlenir → valueByName[normalizeAd] = [ay1, ay2, ay3].
  // Başlık satırındaki sarı sütunlar monthLabels ile yeniden adlandırılır.
  const xlEsc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const xlNorm = (s) =>
    String(s || '')
      .replace(/&amp;/g, '&')
      .replace(/&#10;/g, ' ')
      .toLocaleLowerCase('tr-TR')
      .replace(/\s+/g, ' ')
      .replace(/[^\wçğıöşü ]/gi, '')
      .trim();
  const xlColNum = (ref) => {
    const c = (ref.match(/^[A-Z]+/) || [''])[0];
    let n = 0;
    for (const ch of c) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n;
  };
  function xlYellowStyleIds(stXml) {
    const fills = [...stXml.matchAll(/<fill>([\s\S]*?)<\/fill>/g)].map((m) => m[1]);
    const yf = new Set();
    fills.forEach((f, i) => {
      const c = (f.match(/rgb="([0-9A-Fa-f]{8})"/) || [])[1];
      if (c && /FFFF00$/i.test(c)) yf.add(i);
    });
    const xfsB = stXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/);
    const xfs = xfsB ? [...xfsB[1].matchAll(/<xf\b[^>]*?\/?>/g)].map((m) => m[0]) : [];
    const ys = new Set();
    xfs.forEach((xf, i) => {
      const fid = (xf.match(/fillId="(\d+)"/) || [])[1];
      if (fid && yf.has(parseInt(fid, 10))) ys.add(String(i));
    });
    return ys;
  }

  async function produceQuarterXlsx(opts) {
    const token = localStorage.getItem('caku_auth_token');
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    const resolveUrl = (dep) =>
      '/api/templates/resolve?module=' +
      encodeURIComponent(opts.module) +
      '&docType=' +
      encodeURIComponent(opts.docType || 'uc-aylik') +
      '&departmentId=' +
      encodeURIComponent(dep || '');
    const tryResolve = async (dep) => {
      try {
        const r = await fetch(resolveUrl(dep), { headers, credentials: 'include' });
        const d = await r.json().catch(() => ({}));
        return d.template || null;
      } catch (_) {
        return null;
      }
    };
    // Önce verilen bölüm kapsamı; bulunamazsa genel/fakülte/üniversite şablonu
    let tpl = await tryResolve(opts.departmentId || '');
    if (!tpl && opts.departmentId) tpl = await tryResolve('');
    if (!tpl) return { ok: false, reason: 'no-template' };
    if (!tpl.file || !/^xlsx?$/.test(tpl.file.extension || '')) {
      return { ok: false, reason: 'not-xlsx' };
    }
    let buf;
    try {
      const fr = await fetch('/api/templates/' + tpl._id + '/download', {
        headers,
        credentials: 'include',
      });
      if (!fr.ok) throw new Error('indirilemedi');
      buf = await fr.arrayBuffer();
    } catch (e) {
      return { ok: false, reason: 'download', message: e.message };
    }
    try {
      const JSZip = await ensureJSZip();
      const zip = await JSZip.loadAsync(buf);
      const ssFile = zip.file('xl/sharedStrings.xml');
      const ssXml = ssFile ? await ssFile.async('string') : '';
      const strings = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
        [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join('')
      );
      const stFile = zip.file('xl/styles.xml');
      const ys = stFile ? xlYellowStyleIds(await stFile.async('string')) : new Set();
      const valueByName = opts.valueByName || {};
      const monthLabels = opts.monthLabels || ['', '', ''];
      let filledCount = 0;
      const matched = [];
      const unmatched = [];
      const sheetNames = Object.keys(zip.files).filter((n) =>
        /^xl\/worksheets\/sheet\d+\.xml$/.test(n)
      );
      for (const sn of sheetNames) {
        let sx = await zip.file(sn).async('string');
        const yellowCols = new Set();
        sx = sx.replace(/<row [^>]*?>[\s\S]*?<\/row>/g, (rowXml) => {
          const rowNum = parseInt((rowXml.match(/<row r="(\d+)"/) || [])[1] || '0', 10);
          const cells = [
            ...rowXml.matchAll(/<c r="([A-Z]+\d+)"((?:[^>]*?))(?:\/>|>([\s\S]*?)<\/c>)/g),
          ];
          const yc = cells
            .filter((c) => ys.has((c[2].match(/s="(\d+)"/) || [])[1]))
            .sort((a, b) => xlColNum(a[1]) - xlColNum(b[1]));
          if (!yc.length) return rowXml;
          // Sarı sütunları başlık için topla (satır 1 dahil)
          yc.forEach((c) => yellowCols.add((c[1].match(/^[A-Z]+/) || [''])[0]));
          // 1. satır = başlık; veriyle doldurulmaz (aylar aşağıda yazılır)
          if (rowNum === 1) return rowXml;
          // satır göstergesi adı (ilk sharedString metin hücresi)
          let name = '';
          for (const c of cells) {
            const isS = /t="s"/.test(c[2]);
            const v = (c[3] || '').match(/<v>(\d+)<\/v>/);
            if (isS && v) {
              const txt = strings[parseInt(v[1], 10)] || '';
              if (txt && isNaN(txt)) {
                name = txt;
                break;
              }
            }
          }
          if (!name) return rowXml;
          const vals = valueByName[xlNorm(name)];
          if (!vals) {
            // Bu sarı gösterge performansta tanımlı değil → boş bırak, raporla
            unmatched.push(name.trim());
            return rowXml;
          }
          matched.push(name.trim());
          let out = rowXml;
          yc.forEach((c, idx) => {
            const ref = c[1];
            const val = vals[idx] != null && vals[idx] !== '' ? vals[idx] : '';
            const sAttr = (c[2].match(/s="\d+"/) || ['s="0"'])[0];
            const newCell =
              val === ''
                ? '<c r="' + ref + '" ' + sAttr + '/>'
                : '<c r="' + ref + '" ' + sAttr + '><v>' + xlEsc(String(val)) + '</v></c>';
            out = out.replace(
              new RegExp('<c r="' + ref + '"[^>]*?(?:/>|>[\\s\\S]*?</c>)'),
              () => newCell
            );
            if (val !== '') filledCount++;
          });
          return out;
        });
        // başlık (1. satır) sarı sütunlarını ay adlarıyla değiştir
        [...yellowCols]
          .sort((a, b) => xlColNum(a + '1') - xlColNum(b + '1'))
          .forEach((col, i) => {
            if (i > 2) return;
            const ref = col + '1';
            const sAttr =
              (sx.match(new RegExp('<c r="' + ref + '"[^>]*?(s="\\d+")')) || [])[1] || 's="0"';
            sx = sx.replace(
              new RegExp('<c r="' + ref + '"[^>]*?(?:/>|>[\\s\\S]*?</c>)'),
              () =>
                '<c r="' +
                ref +
                '" ' +
                sAttr +
                ' t="inlineStr"><is><t>' +
                xlEsc(monthLabels[i] || '') +
                '</t></is></c>'
            );
          });
        zip.file(sn, sx);
      }
      // Hiç sarı gösterge yoksa (şablonda sarı alan yok) → gerçek hata
      if (!matched.length && !unmatched.length) return { ok: false, reason: 'no-yellow' };
      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      if (!opts.noDownload) downloadBlob(blob, opts.filename || 'gosterge.xlsx');
      return {
        ok: true,
        filled: filledCount,
        matched,
        unmatched,
        blob,
        filename: opts.filename || 'gosterge.xlsx',
      };
    } catch (e) {
      return { ok: false, reason: 'fill-error', message: e && e.message };
    }
  }

  // ══════════════════════════════════════════════════════════════
  // XLSX şablon doldurucu — statik alanlar + SATIR ÇOĞALTMA
  //
  // Word tarafındaki produceFromTemplate'in xlsx karşılığı: satır değişkeni
  // içeren <row> "şablon satırı" sayılır ve her veri kaydı için bir kopya
  // üretilir; sonraki satır numaraları ve birleşik hücre aralıkları kaydırılır.
  // Değerler inlineStr olarak yazılır — sharedStrings tablosuna dokunulmaz.
  // ══════════════════════════════════════════════════════════════

  // Hücre başvurusundaki satır numarasını değiştir (C7 → C12)
  function xlRefSatir(ref, yeniSatir) {
    return String(ref).replace(/^([A-Z]+)\d+$/, (_, h) => h + yeniSatir);
  }

  // Bir <row> XML'ini doldur ve satır numarasını ayarla.
  function xlSatirDoldur(rowXml, yeniSatirNo, strings, doldur) {
    let out = rowXml.replace(/(<row\b[^>]*\sr=")(\d+)(")/, (_, a, __, c) => a + yeniSatirNo + c);
    out = out.replace(
      /(<c\b[^>]*\sr=")([A-Z]+\d+)(")/g,
      (_, a, ref, c) => a + xlRefSatir(ref, yeniSatirNo) + c
    );
    out = out.replace(/<c\b([^>]*)>([\s\S]*?)<\/c>/g, (tam, oz, ic) => {
      if (!/\st="s"/.test(oz)) return tam;
      const m = ic.match(/<v>(\d+)<\/v>/);
      if (!m) return tam;
      const metin = strings[Number(m[1])];
      if (metin == null || metin.indexOf('{{') < 0) return tam;
      const yeni = doldur(metin);
      if (yeni === metin) return tam;
      const ozTemiz = oz.replace(/\st="[^"]*"/, '');
      return (
        '<c' +
        ozTemiz +
        ' t="inlineStr"><is><t xml:space="preserve">' +
        escapeXml(yeni) +
        '</t></is></c>'
      );
    });
    return out;
  }

  async function produceRowsXlsx(opts) {
    const token = localStorage.getItem('caku_auth_token');
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    const resolveUrl = (dep) =>
      '/api/templates/resolve?module=' +
      encodeURIComponent(opts.module) +
      '&docType=' +
      encodeURIComponent(opts.docType || 'default') +
      '&departmentId=' +
      encodeURIComponent(dep || '');
    const tryResolve = async (dep) => {
      try {
        const r = await fetch(resolveUrl(dep), { headers, credentials: 'include' });
        const d = await r.json().catch(() => ({}));
        return d.template || null;
      } catch (_) {
        return null;
      }
    };
    let tpl = await tryResolve(opts.departmentId || '');
    if (!tpl && opts.departmentId) tpl = await tryResolve('');
    if (!tpl) return { ok: false, reason: 'no-template' };
    if (!tpl.file || !/^xlsx?$/.test(tpl.file.extension || '')) {
      return { ok: false, reason: 'not-xlsx' };
    }
    const eslesme = Array.isArray(tpl.mapping) ? tpl.mapping : [];
    if (eslesme.length === 0) return { ok: false, reason: 'no-mapping' };

    let buf;
    try {
      const fr = await fetch('/api/templates/' + tpl._id + '/download', {
        headers,
        credentials: 'include',
      });
      if (!fr.ok) throw new Error('indirilemedi');
      buf = await fr.arrayBuffer();
    } catch (e) {
      return { ok: false, reason: 'download', message: e.message };
    }

    try {
      const JSZip = await ensureJSZip();
      const zip = await JSZip.loadAsync(buf);
      const ssFile = zip.file('xl/sharedStrings.xml');
      const ssXml = ssFile ? await ssFile.async('string') : '';
      const strings = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
        decodeEnt([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(''))
      );

      const tokenHarita = {};
      eslesme.forEach((f) => {
        if (!f || !f.token || !f.variable) return;
        const parts = String(f.variable).split(':');
        tokenHarita[f.token] = { tip: parts[0], id: parts[1] };
      });

      const statik = opts.staticData || {};
      const veri = Array.isArray(opts.rows) ? opts.rows : [];

      const satirTokenuVarMi = (metin) => {
        TOKEN_RX.lastIndex = 0;
        const bulunan = String(metin).match(TOKEN_RX) || [];
        return bulunan.some((t) => tokenHarita[t] && tokenHarita[t].tip === 'row');
      };

      const doldurYap = (kayit) => (metin) => {
        TOKEN_RX.lastIndex = 0;
        return String(metin).replace(TOKEN_RX, (t) => {
          const h = tokenHarita[t];
          if (!h) return t;
          const kaynak = h.tip === 'row' ? kayit || {} : statik;
          const v = kaynak[h.id];
          return v == null ? '' : String(v);
        });
      };

      const sheetAdlari = Object.keys(zip.files).filter((n) =>
        /^xl\/worksheets\/sheet\d+\.xml$/.test(n)
      );

      let uretilen = 0;
      for (const sn of sheetAdlari) {
        const xml = await zip.file(sn).async('string');
        const satirRx = /<row\b[^>]*>[\s\S]*?<\/row>|<row\b[^>]*\/>/g;
        const satirlar = [...xml.matchAll(satirRx)].map((m) => m[0]);
        if (satirlar.length === 0) continue;

        let sablonIdx = -1;
        satirlar.forEach((r, i) => {
          if (sablonIdx >= 0) return;
          const idx = [...r.matchAll(/<c\b[^>]*\st="s"[^>]*>\s*<v>(\d+)<\/v>/g)].map((x) =>
            Number(x[1])
          );
          if (idx.some((ix) => strings[ix] && satirTokenuVarMi(strings[ix]))) sablonIdx = i;
        });

        const yeni = [];
        let no = 0;
        satirlar.forEach((r, i) => {
          if (i === sablonIdx && veri.length > 0) {
            veri.forEach((kayit) => {
              no += 1;
              yeni.push(xlSatirDoldur(r, no, strings, doldurYap(kayit)));
            });
            uretilen += veri.length;
          } else {
            no += 1;
            yeni.push(xlSatirDoldur(r, no, strings, doldurYap(i === sablonIdx ? {} : null)));
          }
        });

        let cikti = xml.replace(satirRx, () => yeni.shift() || '');

        const kayma = veri.length > 0 ? veri.length - 1 : 0;
        if (kayma > 0 && sablonIdx >= 0) {
          const sablonNo = sablonIdx + 1;
          cikti = cikti.replace(
            /<mergeCell ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"\/>/g,
            (tam, h1, s1, h2, s2) => {
              const a = Number(s1);
              const b = Number(s2);
              if (a <= sablonNo) return tam;
              return '<mergeCell ref="' + h1 + (a + kayma) + ':' + h2 + (b + kayma) + '"/>';
            }
          );
        }
        cikti = cikti.replace(
          /<dimension ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"\/>/,
          (tam, h1, s1, h2) => '<dimension ref="' + h1 + s1 + ':' + h2 + no + '"/>'
        );
        zip.file(sn, cikti);
      }

      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      if (!opts.noDownload) downloadBlob(blob, opts.filename || 'rapor.xlsx');
      return {
        ok: true,
        blob,
        filename: opts.filename || 'rapor.xlsx',
        rowCount: uretilen,
        templateId: tpl._id,
      };
    } catch (e) {
      return { ok: false, reason: 'invalid-output', message: e.message };
    }
  }

  return {
    detectPlaceholders,
    generateDocx,
    downloadBlob,
    produceFromTemplate,
    parseRowIndicators,
    produceByRowKey,
    produceQuarterXlsx,
    produceRowsXlsx,
    detectPlaceholdersXlsx,
    fillRowsByKey,
    formatCaseTr,
  };
})();
window.TemplateEngine = TemplateEngine;
// Türkçe-duyarlı harf biçimlendirmesini modüllere aç (ekran görüntüsü için):
//   window.formatCaseTr(value, 'name' | 'title' | 'upper' | 'lower')
window.formatCaseTr = TemplateEngine.formatCaseTr;

// Türkçe İLGİ (genitive / "–in") ekini kurala göre ekler: ünlü uyumu + son
// harf (ünlüyle biterse kaynaştırma 'n'). Özel ad olduğu için kesme (') ile.
//   ÖZKAN → ÖZKAN'ın · SAMAST → SAMAST'ın · EĞİ → EĞİ'nin · Oğuz → Oğuz'un
// Ad-soyad verilirse SON kelimeye (soyada) göre çekimlenir.
window.trGenitive = function (name) {
  const s = String(name == null ? '' : name).trim();
  if (!s) return s;
  const lower = s.toLocaleLowerCase('tr-TR');
  const vowels = 'aeıioöuü';
  let lastV = '';
  for (let i = lower.length - 1; i >= 0; i--) {
    if (vowels.indexOf(lower[i]) >= 0) {
      lastV = lower[i];
      break;
    }
  }
  const endsVowel = vowels.indexOf(lower[lower.length - 1]) >= 0;
  let sv = 'ı';
  if (lastV === 'a' || lastV === 'ı') sv = 'ı';
  else if (lastV === 'e' || lastV === 'i') sv = 'i';
  else if (lastV === 'o' || lastV === 'u') sv = 'u';
  else if (lastV === 'ö' || lastV === 'ü') sv = 'ü';
  const suf = (endsVowel ? 'n' : '') + sv + 'n';
  return s + '’' + suf;
};

// ══════════════════════════════════════════════════════════════
// Memur çıktı akışı — modüllerin ürettiği belgeyi kalıcı saklayıp memur
// görünümünde (MemurModuleOutputs) salt-okunur listelemek için ortak yardımcılar.
// ══════════════════════════════════════════════════════════════
// Üretilen bir Blob'u /api/files'e yükler; indirme URL'sini döndürür.
window.uploadGeneratedDoc = async function (blob, filename, folder) {
  const token = localStorage.getItem('caku_auth_token');
  const fd = new FormData();
  const type = (blob && blob.type) || 'application/octet-stream';
  fd.append('file', new File([blob], filename || 'belge.docx', { type }));
  const res = await fetch(
    '/api/files/upload?folder=' + encodeURIComponent(folder || 'memur_ciktilari'),
    {
      method: 'POST',
      headers: token ? { Authorization: 'Bearer ' + token } : {},
      credentials: 'include',
      body: fd,
    }
  );
  if (!res.ok) throw new Error('Yükleme başarısız (HTTP ' + res.status + ')');
  const data = await res.json();
  return data.downloadURL || null;
};

// Bir modül çıktısını (snapshot) 'memur_outputs' koleksiyonuna yazar. sourceId
// varsa upsert edilir (yeniden üretimde tekrar oluşmaz). facultyId verilmezse
// departmentId'den türetilir (kapsam eşleşmesi için).
// ══════════════════════════════════════════════════════════════
// BELGE AKIŞI (Evrak Yönlendirme)
//
// Üretilen her belge memur_outputs'a snapshot olarak yazılır (aşağıdaki
// recordMemurOutput). Bu katman ona YÖNLENDİRME ekler: belge bir GÖREVE
// (rol + kapsam) gönderilir, alıcı "Görüldü/Tamamlandı" işaretler.
//
// Kişi değil GÖREV hedeflenir → personel değişse de yönlendirme bozulmaz.
//   hedefRol : 'memur' | 'bolum_yetkilisi' | 'akademisyen' | 'ogrenci'
//   kapsamTip: 'bolum' | 'fakulte' | 'ogrenci'
//   kapsamId : departmentId | facultyId | öğrenci no
// ══════════════════════════════════════════════════════════════
window.BELGE_HEDEF_ROLLERI = [
  { id: 'memur', label: 'Memur', kapsam: 'bolum' },
  { id: 'bolum_yetkilisi', label: 'Bölüm Yetkilisi', kapsam: 'bolum' },
  { id: 'akademisyen', label: 'Akademisyen', kapsam: 'bolum' },
  { id: 'ogrenci', label: 'Öğrenci (belgenin sahibi)', kapsam: 'ogrenci' },
];

// Otomatik yönlendirme kuralları: 'modul' veya 'modul:belgeTuru' → hedef rol.
// Kural varsa belge üretildiğinde/onaylandığında kendiliğinden düşer; yoksa
// kullanıcı "Gönder" ile elle yönlendirir. (Faz 1: kod içi varsayılanlar.)
window.BELGE_OTO_KURALLAR = {
  'capyandal:cap': 'memur',
  'capyandal:yandal': 'memur',
  'muafiyet:muafiyet': 'memur',
  'muafiyet:intibak': 'memur',
  'muafiyet:dikey': 'memur',
  'yataygecis:kurumici': 'memur',
  'yataygecis:kurumlararasi': 'memur',
  'yataygecis:merkezi': 'memur',
  'erasmus:gidis': 'memur',
  'erasmus:donus': 'memur',
};

// Bir belgeyi bir GÖREVE yönlendir. Aynı hedefe tekrar gönderim yinelenmez.
//   belgeYonlendir({ module, docType, sourceId, title, subtitle, url,
//                    ogrenciNo, departmentId, facultyId,
//                    hedefRol, kapsamId, not })
window.belgeYonlendir = async function (o) {
  if (!o || !o.module || !o.url || !o.hedefRol) return { ok: false, reason: 'eksik-parametre' };
  const cu = window.__currentUser || {};
  const rolDef = (window.BELGE_HEDEF_ROLLERI || []).find((r) => r.id === o.hedefRol);
  const kapsamTip = rolDef ? rolDef.kapsam : 'bolum';
  let kapsamId = o.kapsamId || '';
  if (!kapsamId) {
    if (kapsamTip === 'ogrenci') kapsamId = o.ogrenciNo || '';
    else if (kapsamTip === 'fakulte') kapsamId = o.facultyId || cu.facultyId || '';
    else kapsamId = o.departmentId || cu.departmentId || '';
  }
  const docId = o.module + '__' + (o.sourceId || 'x' + Date.now());
  try {
    // Mevcut kaydı oku (gönderim geçmişi korunur)
    let mevcut = {};
    try {
      const r = await window.apiReadDoc('memur_outputs', docId);
      mevcut = (r && r.data) || {};
    } catch (_e) {
      mevcut = {};
    }
    const gonderimler = Array.isArray(mevcut.gonderimler) ? mevcut.gonderimler.slice() : [];
    const ayni = gonderimler.find(
      (g) => g.hedefRol === o.hedefRol && String(g.kapsamId || '') === String(kapsamId)
    );
    if (ayni) return { ok: true, zatenVar: true };
    gonderimler.push({
      hedefRol: o.hedefRol,
      hedefAd: o.hedefAd || (rolDef ? rolDef.label : o.hedefRol),
      kapsamTip,
      kapsamId: String(kapsamId || ''),
      not: o.not || '',
      gonderen: cu.identifier || '',
      gonderenAd: cu.name || cu.identifier || '',
      gonderilmeTarihi: new Date().toISOString(),
      durum: 'bekliyor',
    });
    await window.DBWrite.set(
      'memur_outputs',
      docId,
      {
        module: o.module,
        docType: o.docType || '',
        sourceId: o.sourceId || '',
        title: o.title || mevcut.title || '',
        subtitle: o.subtitle || mevcut.subtitle || '',
        url: o.url,
        ogrenciNo: o.ogrenciNo || mevcut.ogrenciNo || '',
        departmentId: o.departmentId || mevcut.departmentId || '',
        facultyId: o.facultyId || mevcut.facultyId || cu.facultyId || '',
        gonderimler,
        updatedAt: new Date().toISOString(),
      },
      true
    );
    if (window.apiInvalidate) window.apiInvalidate('memur_outputs');
    return { ok: true };
  } catch (e) {
    console.warn('belgeYonlendir hatası:', e && e.message);
    return { ok: false, reason: e && e.message };
  }
};

// Otomatik kural varsa uygula (modül üretim/onay anında çağırır).
window.belgeOtoYonlendir = async function (o) {
  const key = (o.module || '') + ':' + (o.docType || '');
  const rol = (window.BELGE_OTO_KURALLAR || {})[key] || (window.BELGE_OTO_KURALLAR || {})[o.module];
  if (!rol) return { ok: false, reason: 'kural-yok' };
  return window.belgeYonlendir({ ...o, hedefRol: rol, not: o.not || 'Otomatik yönlendirme' });
};

// ── Belgeyi KENDİ listemden kaldır ──
// Kayıt SİLİNMEZ; yalnız kaldıran kişinin kimliği `gizleyenler` listesine
// eklenir. Böylece memur kendi listesini toplarken belgeyi gönderen
// akademisyenin takibi ve diğer alıcıların kutusu bozulmaz. Dosya da yerinde
// kalır; belge gerekirse yeniden erişilebilir.
window.belgeListedenKaldir = async function (koleksiyon, docId) {
  const cu = window.__currentUser || {};
  const kim = String(cu.identifier || cu.name || '');
  if (!kim) return { ok: false, reason: 'kimlik çözülemedi' };
  try {
    const r = await window.apiReadDoc(koleksiyon, String(docId));
    const doc = (r && r.data) || {};
    const liste = Array.isArray(doc.gizleyenler) ? doc.gizleyenler.slice() : [];
    if (liste.indexOf(kim) < 0) liste.push(kim);
    await window.DBWrite.set(koleksiyon, String(docId), { gizleyenler: liste }, true);
    if (window.apiInvalidate) window.apiInvalidate(koleksiyon);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e && e.message };
  }
};

// Bu kullanıcı belgeyi kendi listesinden kaldırmış mı?
window.belgeGizliMi = function (doc, user) {
  const u = user || window.__currentUser || {};
  const kim = String(u.identifier || u.name || '');
  if (!kim || !doc) return false;
  return (doc.gizleyenler || []).indexOf(kim) >= 0;
};

// Alıcı durum günceller: 'goruldu' | 'islemde' | 'tamamlandi'
// 'islemde' (İşleme Alındı) → belgeyi gönderen taraf, "Gönderdiklerim"de
// belgesinin işleme alındığını görür.
window.belgeDurumGuncelle = async function (docId, gonderimIndex, durum) {
  const cu = window.__currentUser || {};
  try {
    const r = await window.apiReadDoc('memur_outputs', docId);
    const doc = (r && r.data) || {};
    const gonderimler = Array.isArray(doc.gonderimler) ? doc.gonderimler.slice() : [];
    if (!gonderimler[gonderimIndex]) return { ok: false };
    gonderimler[gonderimIndex] = {
      ...gonderimler[gonderimIndex],
      durum,
      durumTarihi: new Date().toISOString(),
      durumBy: cu.name || cu.identifier || '',
    };
    await window.DBWrite.set('memur_outputs', docId, { gonderimler }, true);
    if (window.apiInvalidate) window.apiInvalidate('memur_outputs');
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e && e.message };
  }
};

// Kullanıcıya gelen belgeleri süz (rol + kapsam eşleşmesi). Tek yerden karar
// verilir ki Gelen Belgeler ekranı ve bildirim rozeti aynı mantığı kullansın.
window.belgeGelenKutusu = function (list, user) {
  const u = user || window.__currentUser || {};
  const isStudent = u.role === 'student';
  const myNo = String(u.studentNumber || u.identifier || '');
  const myDept = String(u.departmentId || '');
  const myFac = String(u.facultyId || '');
  const isMemur = u.role === 'memur' || !!u.isMemur;
  const memurModules = Array.isArray(u.memurModules) ? u.memurModules : [];
  const out = [];
  (list || []).forEach((doc) => {
    // Kullanıcı bu belgeyi kendi listesinden kaldırdıysa gösterilmez.
    if (window.belgeGizliMi && window.belgeGizliMi(doc, u)) return;
    (doc.gonderimler || []).forEach((g, idx) => {
      let uygun = false;
      if (g.hedefRol === 'ogrenci') {
        uygun = isStudent && String(g.kapsamId || '') === myNo;
      } else if (isStudent) {
        uygun = false;
      } else if (g.hedefRol === 'memur') {
        uygun =
          isMemur &&
          (memurModules.length === 0 || memurModules.indexOf(doc.module) >= 0) &&
          (String(g.kapsamId) === myDept || String(g.kapsamId) === myFac || !g.kapsamId);
      } else if (g.hedefRol === 'bolum_yetkilisi') {
        uygun = !!u.isDeptManager && (String(g.kapsamId) === myDept || !g.kapsamId);
      } else if (g.hedefRol === 'akademisyen') {
        uygun = !isMemur && (String(g.kapsamId) === myDept || !g.kapsamId);
      }
      if (uygun) out.push({ doc, gonderim: g, index: idx });
    });
  });
  return out.sort((a, b) =>
    String(b.gonderim.gonderilmeTarihi || '').localeCompare(
      String(a.gonderim.gonderilmeTarihi || '')
    )
  );
};

window.recordMemurOutput = async function (o) {
  if (!o || !o.module || !o.url) return;
  const cu = window.__currentUser || {};
  let facultyId = o.facultyId || '';
  if (!facultyId && o.departmentId) {
    const d = (window.DEPARTMENTS || []).find((x) => x.id === o.departmentId);
    facultyId = (d && d.facultyId) || '';
  }
  // Bölüm yoksa (ör. fakülte geneli çıktı) üreten kullanıcının fakültesini kullan
  // — böylece yalnız aynı fakültenin memurları görür.
  if (!facultyId) facultyId = cu.facultyId || '';
  const id = o.module + '__' + (o.sourceId || 'x' + Date.now());
  try {
    await window.DBWrite.set(
      'memur_outputs',
      id,
      {
        module: o.module,
        sourceId: o.sourceId || '',
        title: o.title || '',
        subtitle: o.subtitle || '',
        url: o.url,
        departmentId: o.departmentId || '',
        facultyId,
        createdBy: cu.name || cu.identifier || '',
        updatedAt: new Date().toISOString(),
      },
      true
    );
  } catch (e) {
    console.warn('memur_outputs kaydedilemedi:', e && e.message);
  }
};

// ══════════════════════════════════════════════════════════════
// ── Merkezi Bildirim Sistemi (notifications koleksiyonu) ─────
// Tek koleksiyon, çoklu modül (staj/portal/erasmus/sistem...).
// Mevcut modül-bazlı bildirim koleksiyonları olduğu gibi kalır;
// yeni kodlar bu API'yi kullanabilir, modüller tedrici geçer.
// ══════════════════════════════════════════════════════════════
// Doküman şeması:
//   { recipientType: "user"|"department"|"role",
//     recipientId: string,
//     module: "staj"|"portal"|"erasmus"|"sistem"|...,
//     type: string, title: string, body: string,
//     link: string?, meta: object?, readBy: string[], createdAt: ISO }
const Notify = {
  async send(n) {
    const doc = {
      recipientType: n.recipientType || 'user',
      recipientId: n.recipientId || '',
      module: n.module || 'sistem',
      type: n.type || 'info',
      title: n.title || '',
      body: n.body || '',
      link: n.link || '',
      meta: n.meta || {},
      readBy: [],
      createdAt: new Date().toISOString(),
    };
    try {
      return await window.DBWrite.add('notifications', doc);
    } catch (e) {
      console.warn('Bildirim gönderilemedi:', e);
      return null;
    }
  },
  // Birden çok alıcıya tek seferde (batch)
  async sendMany(list) {
    if (!Array.isArray(list) || list.length === 0) return;
    const ops = list.map((n) => ({
      collection: 'notifications',
      type: 'add',
      data: {
        recipientType: n.recipientType || 'user',
        recipientId: n.recipientId || '',
        module: n.module || 'sistem',
        type: n.type || 'info',
        title: n.title || '',
        body: n.body || '',
        link: n.link || '',
        meta: n.meta || {},
        readBy: [],
        createdAt: new Date().toISOString(),
      },
    }));
    try {
      return await window.DBWrite.batch(ops);
    } catch (e) {
      console.warn('Toplu bildirim gönderilemedi:', e);
    }
  },
  // Kullanıcı için uygulanabilir bildirimleri getir.
  // (recipientId === userKey) VEYA (recipientType === "department" && id === aktifBölüm)
  // VEYA (recipientType === "role" && id === kullanıcı rolü).
  async listFor(currentUser, activeDepartment) {
    if (!currentUser) return [];
    const userKey = currentUser.studentNumber || currentUser.identifier || currentUser.name || '';
    try {
      const all = await window.apiRead('notifications');
      const role = currentUser.role || '';
      return (all || [])
        .filter((n) => {
          if (n.recipientType === 'user') return n.recipientId === userKey;
          if (n.recipientType === 'department') return n.recipientId === activeDepartment;
          if (n.recipientType === 'role') return n.recipientId === role;
          return false;
        })
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (e) {
      console.warn('Bildirimler yüklenemedi:', e);
      return [];
    }
  },
  async markRead(notifId, userKey) {
    try {
      const r = await window.apiReadDoc('notifications', notifId);
      if (!r.exists) return;
      const readBy = Array.from(new Set([...(r.data.readBy || []), userKey]));
      await window.DBWrite.set('notifications', notifId, { readBy }, true);
    } catch (e) {
      console.warn('Okundu işaretlenemedi:', e);
    }
  },
  async markAllRead(notifs, userKey) {
    const unread = (notifs || []).filter((n) => !(n.readBy || []).includes(userKey));
    if (unread.length === 0) return;
    const ops = unread.map((n) => ({
      collection: 'notifications',
      type: 'set',
      docId: n.id,
      merge: true,
      data: { readBy: Array.from(new Set([...(n.readBy || []), userKey])) },
    }));
    try {
      await window.DBWrite.batch(ops);
    } catch (e) {
      console.warn('Tümünü okundu hatası:', e);
    }
  },
  async remove(notifId) {
    try {
      await window.DBWrite.remove('notifications', notifId);
    } catch (e) {
      console.warn('Bildirim silinemedi:', e);
    }
  },
  async removeMany(ids) {
    if (!ids || ids.length === 0) return;
    const ops = ids.map((id) => ({ collection: 'notifications', type: 'delete', docId: id }));
    try {
      await window.DBWrite.batch(ops);
    } catch (e) {
      console.warn('Toplu silme hatası:', e);
    }
  },
};
window.Notify = Notify;

// ── Paylaşılan Bildirim Zili (her modül/app-shell tarafından kullanılır)
const BellMenu = ({ currentUser, activeDepartment, onNavigate }) => {
  const [open, setOpen] = window.React.useState(false);
  const [list, setList] = window.React.useState([]);
  const [selected, setSelected] = window.React.useState(() => new Set());
  const userKey =
    currentUser && (currentUser.studentNumber || currentUser.identifier || currentUser.name || '');

  const reload = window.React.useCallback(async () => {
    setList(await Notify.listFor(currentUser, activeDepartment));
  }, [currentUser, activeDepartment]);

  window.React.useEffect(() => {
    reload();
  }, [reload]);
  // Açıldıkça yenile (kısa süreli)
  window.React.useEffect(() => {
    if (open) reload();
  }, [open, reload]);
  // Gerçek zamanlı: notifications koleksiyonu değişince otomatik yenile
  window.React.useEffect(() => {
    const handler = () => reload();
    window.addEventListener('realtime:notifications', handler);
    return () => window.removeEventListener('realtime:notifications', handler);
  }, [reload]);

  const unread = list.filter((n) => !(n.readBy || []).includes(userKey)).length;

  const toggleSel = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected((prev) => (prev.size === list.length ? new Set() : new Set(list.map((n) => n.id))));
  };
  const doMarkAll = async () => {
    await Notify.markAllRead(list, userKey);
    reload();
  };
  const doDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`${selected.size} bildirim silinsin mi?`)) return;
    await Notify.removeMany(Array.from(selected));
    setSelected(new Set());
    reload();
  };
  const doDeleteAll = async () => {
    if (list.length === 0) return;
    if (!window.confirm(`Tüm bildirimler (${list.length}) silinsin mi?`)) return;
    await Notify.removeMany(list.map((n) => n.id));
    setSelected(new Set());
    reload();
  };

  const PRIMARY = '#0891B2',
    NAVY = '#1E293B',
    MUTED = '#64748B';
  const timeAgo = (iso) => {
    if (!iso) return '';
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'Az önce';
    if (m < 60) return `${m} dk önce`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} sa önce`;
    return `${Math.floor(h / 24)} gün önce`;
  };

  return (
    <div style={{ position: 'relative' }}>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9990 }} onClick={() => setOpen(false)} />
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Bildirimler"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          border: `1.5px solid ${unread > 0 ? PRIMARY : '#E5E7EB'}`,
          background: unread > 0 ? '#ECFEFF' : 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={unread > 0 ? PRIMARY : MUTED}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -5,
              right: -5,
              background: '#DC2626',
              color: 'white',
              fontSize: 10,
              fontWeight: 700,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid white',
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 48,
            right: 0,
            zIndex: 9999,
            width: 380,
            background: 'white',
            borderRadius: 14,
            border: '1px solid #E5E7EB',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid #F3F4F6',
              background: '#FAFAFA',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Bildirimler</span>
              {unread > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: 10,
                    background: '#ECFEFF',
                    color: PRIMARY,
                  }}
                >
                  {unread} yeni
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={doMarkAll}
                style={{
                  fontSize: 12,
                  color: PRIMARY,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Tümünü okundu
              </button>
            )}
          </div>

          {list.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '8px 16px',
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: MUTED,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.size === list.length && list.length > 0}
                  onChange={toggleAll}
                  style={{ accentColor: PRIMARY }}
                />
                {selected.size > 0 ? `${selected.size} seçili` : 'Tümünü seç'}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {selected.size > 0 && (
                  <button
                    onClick={doDelete}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: '1px solid #FCA5A5',
                      background: '#FEF2F2',
                      color: '#DC2626',
                      cursor: 'pointer',
                    }}
                  >
                    Seçilenleri Sil
                  </button>
                )}
                <button
                  onClick={doDeleteAll}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: '1px solid #E5E7EB',
                    background: 'white',
                    color: MUTED,
                    cursor: 'pointer',
                  }}
                >
                  Tümünü Sil
                </button>
              </div>
            </div>
          )}

          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {list.length === 0 ? (
              <div
                style={{ padding: '32px 16px', textAlign: 'center', color: MUTED, fontSize: 13 }}
              >
                Henüz bildirim yok
              </div>
            ) : (
              list.map((n) => {
                const isRead = (n.readBy || []).includes(userKey);
                const isSel = selected.has(n.id);
                const tagColor =
                  n.type === 'approved'
                    ? '#059669'
                    : n.type === 'rejected'
                      ? '#DC2626'
                      : n.type === 'request'
                        ? '#8B5CF6'
                        : PRIMARY;
                return (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid #F9FAFB',
                      background: isSel ? '#FEF2F2' : isRead ? 'white' : '#F0F9FF',
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        paddingTop: 2,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleSel(n.id)}
                        style={{ accentColor: PRIMARY, cursor: 'pointer' }}
                      />
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: isRead ? '#D1D5DB' : tagColor,
                        }}
                      />
                    </div>
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: n.link ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (!isRead) Notify.markRead(n.id, userKey).then(reload);
                        if (n.link && onNavigate) {
                          onNavigate(n.link);
                          setOpen(false);
                        }
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}
                      >
                        {n.module && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: tagColor + '20',
                              color: tagColor,
                              textTransform: 'uppercase',
                            }}
                          >
                            {n.module}
                          </span>
                        )}
                        <span style={{ fontSize: 13, fontWeight: isRead ? 500 : 700, color: NAVY }}>
                          {n.title}
                        </span>
                      </div>
                      {n.body && (
                        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>
                          {n.body}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                    <div
                      style={{
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        alignSelf: 'center',
                      }}
                    >
                      {!isRead && (
                        <button
                          onClick={() => Notify.markRead(n.id, userKey).then(reload)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: `1px solid ${PRIMARY}30`,
                            background: '#ECFEFF',
                            color: PRIMARY,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Okundu
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          await Notify.remove(n.id);
                          reload();
                        }}
                        title="Sil"
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: '1px solid #FCA5A5',
                          background: '#FEF2F2',
                          color: '#DC2626',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#DC2626"
                          strokeWidth="2"
                        >
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22m-15 0V4a2 2 0 012-2h4a2 2 0 012 2v3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
window.BellMenu = BellMenu;

// ══════════════════════════════════════════════════════════════
// ── Audit Log ────────────────────────────────────────────────
// Kritik aksiyonların merkezi kaydı (kim/ne zaman/ne yaptı).
// ══════════════════════════════════════════════════════════════
// Schema: { actor, actorRole, action, target, targetId, before?, after?, meta?, createdAt }
const audit = async (action, target, targetId, opts = {}) => {
  try {
    const u = (typeof window !== 'undefined' && window.__currentUser) || null;
    await window.DBWrite.add('audit_logs', {
      action,
      target,
      targetId: targetId == null ? '' : String(targetId),
      actor: (u && (u.name || u.identifier || u.studentNumber)) || opts.actor || '',
      actorRole: (u && u.role) || opts.actorRole || '',
      departmentId: opts.departmentId || (u && u.departmentId) || '',
      before: opts.before == null ? null : opts.before,
      after: opts.after == null ? null : opts.after,
      meta: opts.meta || {},
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Audit log yazılamadı:', e);
  }
};
window.audit = audit;

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
  async updateForm(formId, data) {
    try {
      await DBWrite.update('forms', String(formId), data);
    } catch (error) {
      console.error('Error updating form:', error);
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
      return students.map((s) => ({
        ...s,
        outgoingMatches: s.outgoingMatches || [],
        returnMatches: s.returnMatches || [],
      }));
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
      // ÖNEMLİ: apiRead.strict — normal apiRead hata durumunda sessizce []
      // döndürür; bu, "geçmiş boş" sanılıp aynı eşleştirmelerin HER kayıtta
      // yeniden yazılmasına yol açıyordu (trip_history 17k+ kayda şişmişti).
      // strict hata fırlatır → aşağıdaki catch senkronu yazmadan iptal eder.
      const existingEntries = await apiRead.strict('trip_history', {
        where: [
          `studentNumber:eq:${student.studentNumber}`,
          `hostInstitution:eq:${student.hostInstitution}`,
        ],
      });

      // Build match signature for deduplication.
      // ÖNEMLİ: type (gidiş/dönüş) anahtara dahil — aksi halde aynı dersleri
      // içeren dönüş eşleştirmesi, gidiş ile aynı sanılıp geçmişe yazılmaz.
      // homeCourses/hostCourses tanımsız olabilir → güvenli erişim.
      const matchKey = (m, type) =>
        JSON.stringify({
          type: type || m.type || '',
          home: (m.homeCourses || []).map((c) => c.code).sort(),
          host: (m.hostCourses || []).map((c) => c.code).sort(),
        });

      const existingKeys = new Set(existingEntries.map((e) => matchKey(e, e.type)));
      const ops = [];

      // Sunucu tarafı ikinci savunma hattı: her kayda deterministik imza
      // anahtarı yazılır; trip_history'de sigKey üzerinde UNIQUE indeks var.
      // İstemci kontrolü ne olursa olsun (yarış durumu, eski build) aynı
      // imzayla ikinci kayıt Mongo tarafından reddedilir.
      const sigKeyOf = (key) =>
        (student.studentNumber || '') + '|' + (student.hostInstitution || '') + '|' + key;

      // Process outgoing matches
      // ONAY KAPISI: yalnız akademisyen onayından geçmiş (status==='approved')
      // eşleştirmeler geçmişe yazılır. status alanı olmayan eski kayıtlar
      // (legacy) güvenli varsayım ile 'approved' kabul edilir.
      (student.outgoingMatches || []).forEach((m) => {
        const home = m.homeCourses || [];
        const host = m.hostCourses || [];
        if (home.length === 0 && host.length === 0) return;
        if ((m.status || 'approved') !== 'approved') return;
        const key = matchKey(m, 'outgoing');
        if (!existingKeys.has(key)) {
          ops.push({
            collection: 'trip_history',
            type: 'add',
            data: {
              sigKey: sigKeyOf(key),
              hostInstitution: student.hostInstitution,
              hostCountry: student.hostCountry || '',
              type: 'outgoing',
              homeCourses: home,
              hostCourses: host,
              studentName: `${student.firstName} ${student.lastName}`,
              studentNumber: student.studentNumber,
              semester: student.semester || '',
              departmentId: student.departmentId || '',
              facultyId: student.facultyId || '',
              createdAt: new Date().toISOString(),
            },
          });
          existingKeys.add(key);
        }
      });

      // Process return matches
      // ONAY KAPISI: yalnız onaylanmış dönüş eşleştirmeleri geçmişe yazılır.
      (student.returnMatches || []).forEach((m) => {
        const home = m.homeCourses || [];
        const host = m.hostCourses || [];
        if (home.length === 0 && host.length === 0) return;
        if ((m.status || 'approved') !== 'approved') return;
        const key = matchKey(m, 'return');
        if (!existingKeys.has(key)) {
          ops.push({
            collection: 'trip_history',
            type: 'add',
            data: {
              sigKey: sigKeyOf(key),
              hostInstitution: student.hostInstitution,
              hostCountry: student.hostCountry || '',
              type: 'return',
              homeCourses: home,
              hostCourses: host,
              hostGrade: m.hostGrade || '',
              homeGrade: m.homeGrade || '',
              hostGrades: m.hostGrades || {},
              homeGrades: m.homeGrades || {},
              studentName: `${student.firstName} ${student.lastName}`,
              studentNumber: student.studentNumber,
              semester: student.semester || '',
              departmentId: student.departmentId || '',
              facultyId: student.facultyId || '',
              createdAt: new Date().toISOString(),
            },
          });
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
        return {
          success: false,
          error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.',
        };
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
        return {
          success: false,
          error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.',
        };
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
        return {
          success: false,
          error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.',
        };
      }
      throw error;
    }
  },

  async verifyDepartmentManagerLogin(managerName, password) {
    try {
      const result = await CloudFunctions.call('verifyDepartmentManagerLogin', {
        managerName,
        password,
      });
      return result.data;
    } catch (error) {
      console.error('verifyDepartmentManagerLogin error:', error);
      if (error.code === 'functions/resource-exhausted') {
        return {
          success: false,
          error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.',
        };
      }
      throw error;
    }
  },

  async changePassword(role, identifier, newPassword, currentPassword) {
    try {
      const result = await CloudFunctions.call('changePassword', {
        role,
        identifier,
        newPassword,
        currentPassword,
      });
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
      const result = await CloudFunctions.call('setDefaultProfessorPassword', {
        adminPassword,
        defaultPassword,
      });
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
        await DBWrite.update('professors', String(_id), data);
        return prof;
      } else {
        const result = await DBWrite.add('professors', data);
        return { ...prof, id: result?.id || String(Date.now()) };
      }
    } catch (error) {
      console.error('Error saving professor:', error);
      throw error;
    }
  },
  async deleteProfessor(id) {
    try {
      await DBWrite.remove('professors', String(id));
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
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
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
      } catch (e) {
        /* geçersiz token */
      }
    }
    return null;
  },
};

// ── Icons ──
const UploadIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const DownloadIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2h4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const PlusIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const EditIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);
const FileTextIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

// ── UI Components ──
// ══════════════════════════════════════════════════════════════
// ── Ortak Bileşenler (T tokenlarına bağlı, tutarlı) ──────────
// ══════════════════════════════════════════════════════════════
const Card = ({ children, title, actions, noPadding }) => (
  <div
    style={{
      background: T.color.surface,
      borderRadius: T.radius.xl, // 14px — modern, yumuşak
      boxShadow: T.shadow.sm, // hafif gölge
      border: `1px solid ${T.color.border}`,
      marginBottom: T.space.xl, // 24px
      fontFamily: T.font.family,
    }}
  >
    {title && (
      <div
        style={{
          padding: `${T.space.lg}px ${T.space.xl}px`, // 16 24
          borderBottom: `1px solid ${T.color.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2
          style={{
            fontSize: T.font.sizeXl,
            fontWeight: T.font.weightSemibold,
            color: T.color.navy,
            fontFamily: T.font.family,
            margin: 0,
          }}
        >
          {title}
        </h2>
        {actions && <div style={{ display: 'flex', gap: T.space.sm }}>{actions}</div>}
      </div>
    )}
    <div style={{ padding: noPadding ? 0 : T.space.xl }}>{children}</div>
  </div>
);

const Btn = ({
  children,
  onClick,
  variant = 'primary',
  icon,
  small,
  disabled,
  style: customStyle,
}) => {
  const btnStyles = {
    primary: { bg: T.color.primary, color: '#fff', hoverBg: T.color.primaryStrong, border: 'none' },
    secondary: {
      bg: 'transparent',
      color: T.color.text,
      hoverBg: T.color.surfaceMuted,
      border: `1px solid ${T.color.border}`,
    },
    success: { bg: T.color.success, color: '#fff', hoverBg: '#047857', border: 'none' },
    danger: { bg: T.color.danger, color: '#fff', hoverBg: '#B91C1C', border: 'none' },
    ghost: {
      bg: 'transparent',
      color: T.color.primary,
      hoverBg: T.color.primaryPale,
      border: `1px solid ${T.color.border}`,
    },
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
        padding: small ? `${T.space.sm}px ${T.space.md}px` : `${T.space.md - 2}px ${T.space.lg}px`,
        borderRadius: T.radius.md, // 8px — standart
        border: s.border,
        background: disabled ? T.color.surfaceMuted : hover ? s.hoverBg : s.bg,
        color: disabled ? T.color.textMuted : s.color,
        fontSize: small ? T.font.sizeMd : T.font.sizeLg,
        fontWeight: T.font.weightSemibold,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: T.font.family,
        display: 'inline-flex',
        alignItems: 'center',
        gap: T.space.sm,
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        opacity: disabled ? 0.55 : 1,
        ...customStyle,
      }}
    >
      {icon}
      {children}
    </button>
  );
};

const Input = ({ value, onChange, placeholder, type = 'text', disabled, ...rest }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    {...rest}
    style={{
      width: '100%',
      padding: `${T.space.sm + 2}px ${T.space.md + 2}px`, // 10 14
      borderRadius: T.radius.md,
      border: `1px solid ${T.color.border}`,
      fontSize: T.font.sizeLg,
      fontFamily: T.font.family,
      outline: 'none',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      background: disabled ? T.color.surfaceMuted : T.color.surface,
      color: T.color.text,
      boxSizing: 'border-box',
      ...(rest.style || {}),
    }}
    onFocus={(e) => {
      e.target.style.borderColor = T.color.primary;
      e.target.style.boxShadow = `0 0 0 3px ${T.color.primary}20`;
    }}
    onBlur={(e) => {
      e.target.style.borderColor = T.color.border;
      e.target.style.boxShadow = 'none';
    }}
  />
);

const Select = ({ value, onChange, options, placeholder, children }) => (
  <select
    value={value}
    onChange={onChange}
    style={{
      width: '100%',
      padding: `${T.space.sm + 2}px ${T.space.md + 2}px`,
      borderRadius: T.radius.md,
      border: `1px solid ${T.color.border}`,
      fontSize: T.font.sizeLg,
      fontFamily: T.font.family,
      outline: 'none',
      background: T.color.surface,
      color: T.color.text,
      cursor: 'pointer',
      boxSizing: 'border-box',
    }}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {children
      ? children
      : (options || []).map((opt, i) => (
          <option key={i} value={opt.value}>
            {opt.label}
          </option>
        ))}
  </select>
);

const FormField = ({ label, children }) => (
  <div style={{ marginBottom: T.space.lg }}>
    <label
      style={{
        display: 'block',
        fontSize: T.font.sizeXs,
        fontWeight: T.font.weightSemibold,
        color: T.color.textMuted,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        marginBottom: T.space.sm,
        fontFamily: T.font.family,
      }}
    >
      {label}
    </label>
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
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: isMobileModal ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: isMobileModal ? 0 : T.space.xl,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: T.color.surface,
          borderRadius: isMobileModal ? `${T.radius.xl} ${T.radius.xl} 0 0` : T.radius.xl,
          width: '100%',
          maxWidth: isMobileModal ? '100%' : width,
          maxHeight: isMobileModal ? '85vh' : '90vh',
          overflow: 'auto',
          boxShadow: T.shadow.lg,
          fontFamily: T.font.family,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            style={{
              padding: isMobileModal ? `${T.space.lg}px` : `${T.space.lg}px ${T.space.xl}px`,
              borderBottom: `1px solid ${T.color.border}`,
              position: 'sticky',
              top: 0,
              background: T.color.surface,
              zIndex: 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2
              style={{
                fontSize: isMobileModal ? T.font.sizeXl : T.font.size2xl,
                fontWeight: T.font.weightSemibold,
                color: T.color.navy,
                fontFamily: T.font.family,
                margin: 0,
              }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: T.space.xs,
                color: T.color.textMuted,
                fontSize: T.font.sizeXl,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        )}
        <div style={{ padding: isMobileModal ? T.space.lg : T.space.xl }}>{children}</div>
      </div>
    </div>
  );
};

const Badge = ({ children, color, bg }) => (
  <span
    style={{
      padding: `${T.space.xs}px ${T.space.md - 2}px`, // 4 10
      borderRadius: T.radius.sm,
      fontSize: T.font.sizeXs,
      fontWeight: T.font.weightSemibold,
      color: color || T.color.success,
      background: bg || T.color.successPale,
      display: 'inline-flex',
      alignItems: 'center',
      gap: T.space.xs + 2,
      fontFamily: T.font.family,
    }}
  >
    {children}
  </span>
);

// ── Login Modal ──
const LoginModal = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState('student'); // student, professor, admin
  // Kiracı kimliği (marka/kurum adları) DB'den geç yüklenebilir — event ile tazele.
  const [, setTenantTick] = useState(0);
  useEffect(() => {
    const h = () => setTenantTick((t) => t + 1);
    window.addEventListener('tenant:loaded', h);
    return () => window.removeEventListener('tenant:loaded', h);
  }, []);
  const T = window.TENANT || {};
  const [identifier, setIdentifier] = useState(''); // studentNo or professorName
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [professorList, setProfessorList] = useState([]);
  // İlk giriş / kayıt state'leri
  const [setupPasswordMode, setSetupPasswordMode] = useState(false); // mevcut öğrenci şifre değiştirme
  const [registerMode, setRegisterMode] = useState(false); // yeni öğrenci kayıt
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [pendingStudentNumber, setPendingStudentNumber] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [profSearch, setProfSearch] = useState('');
  const [profDropdownOpen, setProfDropdownOpen] = useState(false);
  // Hiyerarşi seçimi (Üniversite → Fakülte → Bölüm)
  const [hierUniversities, setHierUniversities] = useState([]);
  const [hierFaculties, setHierFaculties] = useState([]);
  const [hierDepartments, setHierDepartments] = useState([]);
  const [selUni, setSelUni] = useState('');
  const [selFaculty, setSelFaculty] = useState('');
  const [selDept, setSelDept] = useState('');

  // URL tabanlı admin girişi (?admin / #admin) KALDIRILDI.
  // Üniversite/fakülte yetkilisi artık akademisyen girişinden (yetki
  // bayraklarıyla) erişir; ayrı admin şifresi/sekmesi kullanılmaz.

  useEffect(() => {
    const loadProfessors = async () => {
      try {
        const profs = await DB.fetchProfessors();
        // Unvanları soyarak soyadı + ilk ad bazında tekilleştir
        const titles = [
          'Dr. Öğr. Üyesi',
          'Dr. Öğr. Gör.',
          'Öğr. Gör. Dr.',
          'Arş. Gör. Dr.',
          'Prof. Dr.',
          'Prof Dr.',
          'Doç. Dr.',
          'Öğr. Gör.',
          'Arş. Gör.',
          'Dr.',
        ];
        const stripTitle = (name) => {
          let n = (name || '').trim();
          for (const t of titles) {
            if (n.startsWith(t)) {
              n = n.slice(t.length).trim();
              break;
            }
          }
          return n;
        };
        // Tekilleştirme anahtarı = unvanı soyulmuş TAM ad (normalize edilmiş).
        // ÖNEMLİ: Eski sürüm anahtarı "ilk ad + BÜYÜK-HARF soyadı" ile
        // üretiyordu; soyadı büyük harf değilse (ör. "Ahmet Tunahan Korkmaz")
        // anahtar yalnızca ilk ada düşüyor ("AHMET") ve farklı kişiler
        // birbirine karışıp listeden GİZLENİYORDU. Artık tam ad kullanılır:
        // yalnızca gerçekten aynı ad (farklı unvanlı kayıtlar) birleşir,
        // farklı kişiler asla gizlenmez.
        const getKey = (name) => {
          return stripTitle(name)
            .toLocaleLowerCase('tr')
            .replace(/\./g, '')
            .replace(/\s+/g, ' ')
            .trim();
        };
        const seen = new Map();
        (profs || []).forEach((p) => {
          const key = getKey(p.name);
          if (!key) return;
          // Daha uzun (daha detaylı) ismi tercih et
          if (!seen.has(key) || (p.name || '').length > (seen.get(key).name || '').length) {
            seen.set(key, p);
          }
        });
        const unique = Array.from(seen.values());
        unique.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
        setProfessorList(unique);
      } catch (e) {
        console.error('Error loading professors:', e);
        setProfessorList(window.SEED_PROFESSORS || []);
      }
    };
    loadProfessors();
  }, []);

  // Hiyerarşiyi yükle (Üniversite → Fakülte → Bölüm). Tek seçenek varsa
  // otomatik seçilir; veri yoksa sabit DEPARTMENTS'a düşeriz (geriye uyum).
  useEffect(() => {
    const loadHierarchy = async () => {
      try {
        const [unis, facs, depts] = await Promise.all([
          window.apiRead('universities').catch(() => []),
          window.apiRead('faculties').catch(() => []),
          window.apiRead('departments').catch(() => []),
        ]);
        const us = unis || [];
        const fs = facs || [];
        const ds = (depts && depts.length ? depts : window.DEPARTMENTS || []).slice();
        ds.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
        setHierUniversities(us);
        setHierFaculties(fs);
        setHierDepartments(ds);
        if (us.length === 1) setSelUni(us[0].id);
        if (fs.length === 1) setSelFaculty(fs[0].id);
      } catch (e) {
        console.warn('Hiyerarşi yüklenemedi, sabit listeye düşülüyor:', e?.message);
        setHierDepartments((window.DEPARTMENTS || []).slice());
      }
    };
    loadHierarchy();
  }, []);

  // Mevcut öğrenci/profesör/admin: şifre değiştirme + Auth hesabı oluşturma
  const handleSetupPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPassword.trim()) {
      setError('Yeni şifre boş olamaz!');
      return;
    }
    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Şifreler uyuşmuyor!');
      return;
    }
    setLoading(true);
    try {
      // Şifreyi Cloud Functions ile sunucu tarafında kaydet
      const identifier =
        pendingUser.role === 'student' ? pendingUser.studentNumber : pendingUser.name;
      await DB.changePassword(pendingUser.role, identifier, newPassword);
      // Oturum token'ı al — API artık kimliksiz okuma/yazma kabul etmiyor;
      // token alınamazsa da devam edilir (kullanıcı yeniden giriş yapabilir).
      try {
        if (pendingUser.role === 'student') {
          await CloudFunctions.call('verifyStudentLogin', {
            studentNumber: identifier,
            password: newPassword,
          });
        } else if (pendingUser.role === 'professor') {
          await CloudFunctions.call('verifyProfessorLogin', {
            professorName: identifier,
            password: newPassword,
          });
        }
      } catch (tokenErr) {
        console.warn('Kurulum sonrası token alınamadı:', tokenErr.message);
      }
      onLogin(pendingUser);
    } catch (err) {
      console.error('Password setup error:', err);
      setError('Şifre kaydedilirken hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Yeni öğrenci: kayıt ol + Auth hesabı oluştur
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!firstName.trim()) {
      setError('Ad alanı zorunludur!');
      return;
    }
    if (!lastName.trim()) {
      setError('Soyad alanı zorunludur!');
      return;
    }
    if (!selectedDepartment) {
      setError('Bölüm seçimi zorunludur!');
      return;
    }
    if (!newPassword.trim()) {
      setError('Şifre boş olamaz!');
      return;
    }
    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Şifreler uyuşmuyor!');
      return;
    }
    setLoading(true);
    try {
      // Kayıt sunucu tarafında atomik yapılır: mükerrer kontrolü + öğrenci
      // kaydı + şifre hash'i + oturum token'ı tek endpoint'te
      // (/api/auth/student-register). Token yanıtla birlikte gelir ve
      // CloudFunctions.call tarafından otomatik saklanır.
      const deptObj = DEPARTMENTS.find((d) => d.id === selectedDepartment);
      const regRes = await CloudFunctions.call('studentRegister', {
        studentNumber: pendingStudentNumber,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        departmentId: selectedDepartment,
        departmentName: deptObj?.name || '',
        password: newPassword,
      });
      const reg = regRes.data || {};
      if (!reg.success) {
        setError(reg.error || 'Kayıt başarısız.');
        setLoading(false);
        return;
      }
      const user = {
        role: 'student',
        name: `${firstName.trim()} ${lastName.trim()}`,
        studentNumber: pendingStudentNumber,
        departmentId: selectedDepartment,
        departmentName: deptObj?.name || '',
        erasmusAccess: false,
      };
      onLogin(user);
    } catch (err) {
      console.error('Register error:', err);
      setError('Kayıt hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetSetupState = () => {
    setSetupPasswordMode(false);
    setRegisterMode(false);
    setPendingUser(null);
    setPendingStudentNumber('');
    setNewPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setSelectedDepartment('');
    setStudentStep('number');
    setStudentInfo(null);
    setError('');
  };

  // Öğrenci: numara doğrulama (ilk adım)
  const [studentStep, setStudentStep] = useState('number'); // number, password
  const [studentInfo, setStudentInfo] = useState(null); // mevcut öğrenci bilgisi

  const handleStudentContinue = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) {
      setError('Öğrenci numarası gerekli!');
      return;
    }
    const trimmedId = identifier.trim();
    if (!/^\d{9}$/.test(trimmedId)) {
      setError('Öğrenci numarası 9 haneli olmalıdır!');
      return;
    }
    setLoading(true);
    try {
      // Sunucu tarafı tekil sorgu — eski akış tüm öğrenci listesini çekiyordu
      // (PII sızıntısı + kimliksiz okuma zorunluluğu). Artık tek endpoint.
      const lookupRes = await CloudFunctions.call('studentLookup', { studentNumber: trimmedId });
      const lookup = lookupRes.data || {};
      if (lookup.exists) {
        const student = { studentNumber: trimmedId, ...(lookup.student || {}) };
        if (!lookup.hasPassword) {
          // Şifre yok: şifre belirleme ekranına
          const user = {
            role: 'student',
            name: `${student.firstName} ${student.lastName}`,
            studentNumber: trimmedId,
            departmentId: student.departmentId || 'bilgisayar',
            departmentName: student.departmentName || 'Bilgisayar Mühendisliği',
            erasmusAccess: student.erasmusAccess === true,
          };
          setPendingUser(user);
          setSetupPasswordMode(true);
        } else {
          // Şifresi var: şifre giriş adımına geç
          setStudentInfo(student);
          setStudentStep('password');
        }
      } else {
        // Yeni öğrenci: kayıt ekranına yönlendir
        setPendingStudentNumber(trimmedId);
        setRegisterMode(true);
      }
    } catch (err) {
      console.error('Student check error:', err);
      const msg = err.message || '';
      if (msg.includes('400') || msg.includes('Bad Request') || msg.includes('bağlantısı yok')) {
        setError(
          'Veritabanına bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.'
        );
      } else if (err.code === 'permission-denied') {
        setError('Veritabanı erişim izni reddedildi. Yöneticiyle iletişime geçin.');
      } else {
        setError('Bir hata oluştu: ' + (msg || 'Lütfen tekrar deneyin.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) {
      setError('Şifre gerekli!');
      return;
    }
    setLoading(true);
    try {
      const trimmedId = identifier.trim();
      const user = {
        role: 'student',
        name: `${studentInfo.firstName} ${studentInfo.lastName}`,
        studentNumber: trimmedId,
        departmentId: studentInfo.departmentId || 'bilgisayar',
        departmentName: studentInfo.departmentName || 'Bilgisayar Mühendisliği',
        erasmusAccess: studentInfo.erasmusAccess === true,
      };

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
        setError(loginResult.error || 'Giriş bilgileri hatalı!');
      }
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.message || '';
      if (msg.includes('400') || msg.includes('Bad Request') || msg.includes('bağlantısı yok')) {
        setError(
          'Veritabanına bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.'
        );
      } else if (err.code === 'permission-denied') {
        setError('Veritabanı erişim izni reddedildi. Yöneticiyle iletişime geçin.');
      } else {
        setError('Giriş hatası: ' + (msg || 'Bilinmeyen hata'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (activeTab === 'admin') {
        const adminUser = {
          role: 'admin',
          name: 'A. Tunahan KORKMAZ',
          studentNumber: null,
          departmentId: 'bilgisayar',
          departmentName: 'Bilgisayar Mühendisliği',
        };

        const adminResult = await DB.verifyAdminLogin(password);

        if (!adminResult.success && adminResult.error?.includes('belirlenmemiş')) {
          setError('Admin şifresi henüz belirlenmemiş.');
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
          setError(adminResult.error || 'Giriş bilgileri hatalı!');
        }
      } else if (activeTab === 'bolum_yetkilisi') {
        if (!identifier.trim()) {
          setError('Yetkili adı gerekli!');
          setLoading(false);
          return;
        }
        const user = { role: 'bolum_yetkilisi', name: identifier, studentNumber: null };

        const deptResult = await DB.verifyDepartmentManagerLogin(identifier, password);

        if (deptResult.success) {
          // Veritabanı doc ID ile hardcoded DEPARTMENTS ID'sini eşleştir
          // Tüm veriler hardcoded ID ile kaydedildiği için bu eşleşme kritik
          const matchedDept = DEPARTMENTS.find((d) => d.name === deptResult.departmentName);
          user.departmentId = matchedDept ? matchedDept.id : deptResult.departmentId;
          user.departmentName = deptResult.departmentName;
          onLogin(user);
        } else {
          setError(deptResult.error || 'Giriş bilgileri hatalı!');
        }
      } else if (activeTab === 'professor') {
        if (!identifier.trim()) {
          setError('Akademisyen seçimi gerekli!');
          setLoading(false);
          return;
        }
        const user = { role: 'professor', name: identifier, studentNumber: null };

        const profResult = await DB.verifyProfessorLogin(identifier, password);

        // Sunucudan gelen DB profili (hiyerarşi + yetki bayrakları) — varsa
        // user'a iliştir. app-shell bu bayraklara göre effectiveRole hesaplar.
        const attachProfile = (u) => {
          const p = profResult.profile;
          if (!p) return u;
          // Üni/fakülte yetkilisi modül düzeyinde tam (admin) yetkiye sahip
          // olur; modüller role==='admin' ile düzenleme/silmeye izin verir.
          // baseRole akademisyen kimliğini korur (gerekirse referans için).
          const hierMgr = !!(p.isUniversityAdmin || p.isFacultyManager);
          // Bayrak → istemci rolü çözümlemesi:
          //   isMemur → 'memur' (akademisyen DEĞİL; yalnız atandığı modüller)
          //   isUniversityAdmin / isFacultyManager → 'admin' (yönetim kabuğu)
          //   isDeptManager → 'bolum_yetkilisi' (bölüm yetkilisi modülleri)
          //   diğer durumda akademisyen rolü korunur.
          const effectiveRole = p.isMemur
            ? 'memur'
            : hierMgr
              ? 'admin'
              : p.isDeptManager
                ? 'bolum_yetkilisi'
                : u.role;
          return {
            ...u,
            role: effectiveRole,
            baseRole: 'professor',
            departmentId: p.departmentId || u.departmentId || '',
            departmentName: p.department || u.departmentName || '',
            facultyId: p.facultyId || '',
            universityId: p.universityId || '',
            isUniversityAdmin: !!p.isUniversityAdmin,
            isFacultyManager: !!p.isFacultyManager,
            isDeptManager: !!p.isDeptManager,
            isStajCoordinator: !!p.isStajCoordinator,
            // Memur rolü + atandığı modüller (yalnız bunların çıktısına erişir).
            isMemur: !!p.isMemur,
            memurModules: Array.isArray(p.memurModules) ? p.memurModules : [],
            additionalDepartments: Array.isArray(p.additionalDepartments)
              ? p.additionalDepartments
              : [],
            // Üniversite dışı (bölümsüz) akademisyen — ana bölümü yoktur, yalnız
            // atandığı bölümlerde sınırlı modül setine erişir.
            external: !!p.external,
          };
        };

        if (profResult.needsSetup) {
          setPendingUser(attachProfile(user));
          setSetupPasswordMode(true);
          setLoading(false);
          return;
        }

        if (profResult.success) {
          if (password.length < 6) {
            setPendingUser(attachProfile(user));
            setSetupPasswordMode(true);
            setLoading(false);
            return;
          }
          onLogin(attachProfile(user));
        } else {
          // Cloud Functions doğrulamadı - hata göster
          setError(profResult.error || 'Giriş bilgileri hatalı!');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.message || '';
      if (msg.includes('400') || msg.includes('Bad Request') || msg.includes('bağlantısı yok')) {
        setError(
          'Veritabanına bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.'
        );
      } else if (err.code === 'permission-denied') {
        setError('Veritabanı erişim izni reddedildi. Yöneticiyle iletişime geçin.');
      } else {
        setError('Giriş hatası: ' + (msg || 'Bilinmeyen hata'));
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
      background-color: #121828;
      background-image:
        linear-gradient(rgba(8, 12, 24, 0.30), rgba(8, 12, 24, 0.50)),
        url('/login-bg.jpg');
      background-size: cover;
      background-position: center;
      animation: lgBgDrift 45s ease-in-out infinite alternate;
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
        0 40px 90px rgba(0, 0, 0, 0.65),
        0 15px 35px rgba(0, 0, 0, 0.40),
        0 0 0 1px rgba(255, 255, 255, 0.10) inset,
        0 0 40px rgba(0, 200, 180, 0.12);
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
    .lg-illus-wrap {
      position: relative;
      width: 200px;
      height: 200px;
      flex-shrink: 0;
    }
    .lg-illus-circle {
      position: absolute;
      inset: 18px;
      border-radius: 50%;
      background: radial-gradient(circle at 50% 40%, #ffffff 0%, #f4efe2 100%);
      box-shadow: 0 12px 28px rgba(11,35,65,0.12), inset 0 0 0 1px rgba(11,35,65,0.06);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lg-illus-logo {
      display: block;
      width: 78%;
      height: 78%;
      object-fit: contain;
      mix-blend-mode: multiply;
      filter: contrast(1.02);
    }
    .lg-illus-orbit {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 1.5px dashed rgba(11,35,65,0.18);
      animation: lg-orbit-spin 14s linear infinite;
      transform-origin: center center;
      pointer-events: none;
    }
    .lg-illus-orbit-dot {
      position: absolute;
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .lg-illus-orbit-dot.d1 { top: -6px; left: calc(50% - 6px); background: #22c55e; box-shadow: 0 2px 8px rgba(34,197,94,0.55); }
    .lg-illus-orbit-dot.d2 { top: calc(50% - 6px); right: -6px; background: #eab308; box-shadow: 0 2px 8px rgba(234,179,8,0.55); }
    .lg-illus-orbit-dot.d3 { bottom: -6px; left: calc(50% - 6px); background: #1B2A4A; box-shadow: 0 2px 8px rgba(27,42,74,0.55); }
    .lg-illus-orbit-dot.d4 { top: calc(50% - 6px); left: -6px; background: #C4973B; box-shadow: 0 2px 8px rgba(196,151,59,0.55); }

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
      padding: 16px 16px;
      min-height: 54px;
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
    /* select için: sağda chevron ikonu için yer aç, native ok'u görsel ile yedekle */
    select.lg-input {
      padding-right: 40px;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='1 1 6 6 11 1'/></svg>");
      background-repeat: no-repeat;
      background-position: right 16px center;
      cursor: pointer;
    }
    select.lg-input:disabled {
      background-color: #F1F5F9;
      cursor: not-allowed;
      opacity: 0.7;
    }
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
      color: rgba(255, 255, 255, 0.55);
      letter-spacing: 0.02em;
      font-weight: 500;
      line-height: 1.7;
    }
    .lg-footer-dev {
      color: rgba(127, 255, 239, 0.78);
      font-size: 11.5px;
      font-weight: 600;
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
      .lg-illus-wrap { width: 160px; height: 160px; }
      .lg-illus-circle { inset: 14px; }
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

    /* ══ ÇAKÜ 3D Gün Batımı Teması — koyu cam kart ══ */
    @keyframes lgBgDrift {
      from { background-position: 46% 50%; }
      to   { background-position: 54% 50%; }
    }
    .lg-card-split {
      max-width: 450px;
      grid-template-columns: 1fr;
      background: rgba(12, 20, 34, 0.60);
      -webkit-backdrop-filter: blur(22px) saturate(1.15);
      backdrop-filter: blur(22px) saturate(1.15);
      border: 1px solid rgba(255, 255, 255, 0.16);
      box-shadow:
        0 40px 90px rgba(0, 0, 0, 0.60),
        0 0 60px rgba(0, 229, 204, 0.10),
        inset 0 1px 0 rgba(255, 255, 255, 0.10);
    }
    .lg-left {
      background: transparent;
      padding: 30px 34px 0;
      justify-content: flex-start;
    }
    .lg-left-blob1, .lg-left-blob2, .lg-illus, .lg-left-tagline { display: none; }
    .lg-brand-row { flex-direction: column; gap: 10px; justify-content: center; text-align: center; }
    .lg-brand-mini-logo { width: 46px; height: 46px; }
    .lg-brand-mini-img { width: 38px; height: 38px; }
    .lg-brand-name {
      color: #EAF6F4;
      font-size: 19px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      text-shadow: 0 0 18px rgba(0, 229, 204, 0.35);
    }
    .lg-brand-sub { color: rgba(234, 246, 244, 0.55); letter-spacing: 0.08em; }
    .lg-right { background: transparent; padding: 20px 34px 30px; }
    .lg-right-heading { color: #FFFFFF; text-align: center; }
    .lg-right-sub { color: rgba(255, 255, 255, 0.60); text-align: center; }
    .lg-tabs { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); }
    .lg-tab { color: rgba(255, 255, 255, 0.65); }
    .lg-tab:hover:not(.lg-tab-active) { color: #FFFFFF; background: rgba(255, 255, 255, 0.08); }
    .lg-tab-active { background: #FFFFFF; color: #0B2341; }
    .lg-label { color: rgba(255, 255, 255, 0.78); }
    .lg-input {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.18);
      color: #F4F8F7;
    }
    .lg-input::placeholder { color: rgba(255, 255, 255, 0.40); }
    .lg-input:focus {
      border-color: #2EC4B6;
      background: rgba(255, 255, 255, 0.12);
      box-shadow: 0 0 0 3px rgba(46, 196, 182, 0.22);
    }
    select.lg-input { color: #F4F8F7; }
    select.lg-input option { color: #0F172A; background: #FFFFFF; }
    .lg-input-icon-left, .lg-input-eye-btn { color: rgba(255, 255, 255, 0.55); }
    .lg-hint { color: rgba(255, 255, 255, 0.55); }
    .lg-btn-primary { background: #F2F6F5; color: #0B2341; }
    .lg-btn-primary:hover:not(:disabled) { background: #FFFFFF; }
    .lg-btn-primary:disabled { background: rgba(255, 255, 255, 0.25); color: rgba(11, 35, 65, 0.55); }
    .lg-btn-secondary {
      background: rgba(255, 255, 255, 0.10);
      color: #EAF6F4;
      border-color: rgba(255, 255, 255, 0.22);
    }
    .lg-error { background: rgba(248, 113, 113, 0.14); color: #FCA5A5; border-color: rgba(248, 113, 113, 0.35); }
    .lg-footer { color: rgba(255, 255, 255, 0.55); }
    .lg-footer-dev { color: #7FE7DC; }
    .lg-setup-title, .lg-greeting-name { color: #FFFFFF; }
    .lg-setup-sub, .lg-greeting-label, .lg-greeting-id { color: rgba(255, 255, 255, 0.60); }
    .lg-greeting { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.14); }
    .lg-prof-list { background: transparent; border-color: rgba(255, 255, 255, 0.14); }
    .lg-prof-row { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.10); color: #EAF6F4; }
    .lg-prof-row:hover { background: rgba(255, 255, 255, 0.12); }
    .lg-prof-empty { color: rgba(255, 255, 255, 0.50); }
    .lg-prof-selected { background: rgba(46, 196, 182, 0.15); border-color: rgba(46, 196, 182, 0.45); }
  `;

  return (
    <div className="lg-wrap">
      <style dangerouslySetInnerHTML={{ __html: loginStyles }} />

      <div
        style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
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
                <div className="lg-brand-name">{T.appName || 'Offline Asistan'}</div>
              </div>
            </div>

            <div className="lg-illus">
              <div className="lg-illus-wrap">
                <div className="lg-illus-circle">
                  <img src="logo.png" alt="ÇAKÜ Logo" className="lg-illus-logo" />
                </div>
                <div className="lg-illus-orbit" aria-hidden="true">
                  <span className="lg-illus-orbit-dot d1" />
                  <span className="lg-illus-orbit-dot d2" />
                  <span className="lg-illus-orbit-dot d3" />
                  <span className="lg-illus-orbit-dot d4" />
                </div>
              </div>
            </div>

            <div className="lg-left-tagline">
              <div className="lg-left-tagline-main">
                Akademik yaşamı kolaylaştıran dijital asistanınız.
              </div>
            </div>
          </div>

          {/* Right panel — form */}
          <div className="lg-right">
            <h2 className="lg-right-heading">Giriş Yap</h2>
            <p className="lg-right-sub">Devam etmek için hesabınızla oturum açın.</p>

            {activeTab === 'admin' && (
              <div className="lg-admin-banner">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Yönetici Girişi
              </div>
            )}

            {/* Tabs - Admin hariç */}
            {activeTab !== 'admin' &&
              !registerMode &&
              !setupPasswordMode &&
              !(activeTab === 'student' && studentStep === 'password') && (
                <div className="lg-tabs">
                  {[
                    { key: 'student', label: 'Öğrenci' },
                    { key: 'professor', label: 'Akademisyen' },
                  ].map((tab) => {
                    const active = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => {
                          setActiveTab(tab.key);
                          setError('');
                          setIdentifier('');
                          setPassword('');
                          setStudentStep('number');
                          setStudentInfo(null);
                          resetSetupState();
                          setProfSearch('');
                          setProfDropdownOpen(false);
                        }}
                        type="button"
                        className={`lg-tab${active ? ' lg-tab-active' : ''}`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              )}

            {/* Üniversite seçimi — yalnızca ÖĞRENCİ girişinde.
                Akademisyen girişinde Üniversite/Fakülte/Bölüm seçimine GEREK YOK:
                akademisyen adıyla giriş yapar ve doğrudan kendi ekranına yönlenir. */}
            {activeTab === 'student' &&
              !registerMode &&
              !setupPasswordMode &&
              studentStep !== 'password' && (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}
                >
                  {hierUniversities.length > 0 && (
                    <div>
                      <label className="lg-label">Üniversite</label>
                      <select
                        value={selUni}
                        onChange={(e) => {
                          setSelUni(e.target.value);
                          setSelFaculty('');
                          setSelDept('');
                        }}
                        className="lg-input"
                      >
                        <option value="">Üniversite seçin…</option>
                        {hierUniversities.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

            {/* Yeni Öğrenci Kayıt Ekranı */}
            {registerMode ? (
              <form onSubmit={handleRegister}>
                <div className="lg-setup-hero">
                  <div className="lg-setup-icon">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#C4973B"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                  </div>
                  <h3 className="lg-setup-title">Kayıt Ol</h3>
                  <p className="lg-setup-sub">
                    <strong>{pendingStudentNumber}</strong> numaralı öğrenci olarak kayıt olun.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label className="lg-label">Ad</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Adınız"
                      autoFocus
                      className="lg-input"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label className="lg-label">Soyad</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Soyadınız"
                      className="lg-input"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label className="lg-label">Bölüm</label>
                  <div className="lg-input-icon-wrap">
                    <div className="lg-input-icon-left">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                      </svg>
                    </div>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="lg-input lg-input-icon"
                      style={{
                        paddingRight: 40,
                        color: selectedDepartment ? '#0F172A' : '#94A3B8',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="" disabled>
                        Bölümünüzü seçin
                      </option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <div
                      style={{
                        position: 'absolute',
                        right: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#64748B',
                        pointerEvents: 'none',
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label className="lg-label">Şifre</label>
                  <div className="lg-input-icon-wrap">
                    <div className="lg-input-icon-left">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Şifrenizi belirleyin (en az 6 karakter)"
                      className="lg-input lg-input-icon"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 22 }}>
                  <label className="lg-label">Şifre Tekrar</label>
                  <div className="lg-input-icon-wrap">
                    <div className="lg-input-icon-left">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Şifrenizi tekrar girin"
                      className="lg-input lg-input-icon"
                    />
                  </div>
                </div>

                {error && (
                  <div className="lg-error">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="lg-btn lg-btn-primary">
                  {loading ? (
                    <>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        style={{ animation: 'loginSpin 1s linear infinite' }}
                      >
                        <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
                      </svg>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      Kayıt Ol ve Giriş Yap
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetSetupState}
                  className="lg-btn lg-btn-secondary"
                  style={{ marginTop: 10, padding: '10px 16px', fontSize: 13 }}
                >
                  Geri Dön
                </button>
              </form>
            ) : setupPasswordMode ? (
              /* Mevcut öğrenci: şifre değiştirme ekranı */
              <form onSubmit={handleSetupPassword}>
                <div className="lg-setup-hero">
                  <div className="lg-setup-icon">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#C4973B"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </div>
                  <h3 className="lg-setup-title">Yeni Şifre Belirleyin</h3>
                  <p className="lg-setup-sub">
                    Hoş geldiniz, <strong>{pendingUser?.name}</strong>. Güvenliğiniz için lütfen
                    yeni bir şifre belirleyin.
                  </p>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label className="lg-label">Yeni Şifre</label>
                  <div className="lg-input-icon-wrap">
                    <div className="lg-input-icon-left">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Yeni şifrenizi girin (en az 6 karakter)"
                      autoFocus
                      className="lg-input lg-input-icon"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 22 }}>
                  <label className="lg-label">Şifre Tekrar</label>
                  <div className="lg-input-icon-wrap">
                    <div className="lg-input-icon-left">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Şifrenizi tekrar girin"
                      className="lg-input lg-input-icon"
                    />
                  </div>
                </div>

                {error && (
                  <div className="lg-error">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="lg-btn lg-btn-primary">
                  {loading ? (
                    <>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        style={{ animation: 'loginSpin 1s linear infinite' }}
                      >
                        <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
                      </svg>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      Şifreyi Belirle ve Giriş Yap
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetSetupState}
                  className="lg-btn lg-btn-secondary"
                  style={{ marginTop: 10, padding: '10px 16px', fontSize: 13 }}
                >
                  Geri Dön
                </button>
              </form>
            ) : activeTab === 'student' && studentStep === 'password' ? (
              /* Öğrenci: Şifre Giriş Adımı */
              <form onSubmit={handleStudentLogin}>
                <div className="lg-greeting">
                  <div className="lg-greeting-label">Hoş geldiniz</div>
                  <div className="lg-greeting-name">
                    {studentInfo?.firstName} {studentInfo?.lastName}
                  </div>
                  <div className="lg-greeting-id">{identifier}</div>
                </div>

                <div style={{ marginBottom: 22 }}>
                  <label className="lg-label">Şifre</label>
                  <div className="lg-input-icon-wrap">
                    <div className="lg-input-icon-left">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Şifrenizi girin"
                      autoFocus
                      className="lg-input lg-input-icon lg-input-eye"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="lg-input-eye-btn"
                      aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showPassword ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="lg-error">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="lg-btn lg-btn-primary">
                  {loading ? (
                    <>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        style={{ animation: 'loginSpin 1s linear infinite' }}
                      >
                        <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
                      </svg>
                      Giriş yapılıyor...
                    </>
                  ) : (
                    <>
                      Giriş Yap
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStudentStep('number');
                    setPassword('');
                    setStudentInfo(null);
                    setError('');
                  }}
                  className="lg-btn lg-btn-secondary"
                  style={{ marginTop: 10, padding: '10px 16px', fontSize: 13 }}
                >
                  Farklı numara ile giriş
                </button>
              </form>
            ) : activeTab === 'student' ? (
              /* Öğrenci: Numara Giriş Adımı */
              <form onSubmit={handleStudentContinue}>
                <div style={{ marginBottom: 20 }}>
                  <label className="lg-label">Öğrenci Numarası</label>
                  <div className="lg-input-icon-wrap">
                    <div className="lg-input-icon-left">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, ''))}
                      placeholder="9 haneli öğrenci numaranız"
                      autoFocus
                      maxLength={9}
                      inputMode="numeric"
                      className="lg-input lg-input-icon"
                      style={{ letterSpacing: '1px' }}
                    />
                  </div>
                  <div className="lg-hint">
                    Sisteme ilk kez giriyorsanız, bilgilerinizi girip şifre belirlemeniz
                    istenecektir.
                  </div>
                </div>

                {error && (
                  <div className="lg-error">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || identifier.length !== 9}
                  className="lg-btn lg-btn-primary"
                >
                  {loading ? (
                    <>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        style={{ animation: 'loginSpin 1s linear infinite' }}
                      >
                        <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
                      </svg>
                      Kontrol ediliyor...
                    </>
                  ) : (
                    <>
                      Devam Et
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Bölüm Yetkilisi / Akademisyen / Admin Form */
              <form onSubmit={handleSubmit}>
                {activeTab === 'bolum_yetkilisi' && (
                  <div style={{ marginBottom: 18 }}>
                    <label className="lg-label">Yetkili Adı Soyadı</label>
                    <div className="lg-input-icon-wrap">
                      <div className="lg-input-icon-left">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Adınızı ve soyadınızı girin"
                        autoFocus
                        className="lg-input lg-input-icon"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'professor' && (
                  <div style={{ marginBottom: 18 }}>
                    <label className="lg-label">Akademisyen</label>
                    {/* Seçili akademisyen gösterimi */}
                    {identifier && !profDropdownOpen && (
                      <div
                        onClick={() => {
                          setProfDropdownOpen(true);
                          setProfSearch('');
                        }}
                        className="lg-prof-selected"
                      >
                        <div className="lg-prof-avatar">
                          {(identifier || '')
                            .split(' ')
                            .map((w) => w.charAt(0))
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>
                        <span style={{ flex: 1 }}>{identifier}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIdentifier('');
                            setProfSearch('');
                            setProfDropdownOpen(true);
                          }}
                          className="lg-prof-clear"
                          aria-label="Seçimi temizle"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    {/* Arama + Liste */}
                    {(!identifier || profDropdownOpen) && (
                      <div>
                        <div className="lg-input-icon-wrap" style={{ marginBottom: 6 }}>
                          <div className="lg-input-icon-left" style={{ left: 12 }}>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            value={profSearch}
                            onChange={(e) => setProfSearch(e.target.value)}
                            placeholder="Akademisyen adı yazın..."
                            autoFocus
                            className="lg-input lg-input-icon"
                            style={{ fontSize: 14, padding: '11px 14px 11px 38px' }}
                          />
                        </div>
                        <div className="lg-prof-list">
                          {(() => {
                            const filtered = professorList.filter((p) => {
                              const matchesSearch =
                                !profSearch ||
                                (p.name || '')
                                  .toLocaleLowerCase('tr')
                                  .indexOf(profSearch.toLocaleLowerCase('tr')) >= 0;
                              // Bölüm seçiliyse yumuşak filtre: o bölümdekiler +
                              // bölümü tanımsız akademisyenler (örn. fakülte/üni
                              // yöneticisi) her zaman görünür.
                              const matchesDept =
                                !selDept || !p.departmentId || p.departmentId === selDept;
                              return matchesSearch && matchesDept;
                            });
                            if (filtered.length === 0)
                              return <div className="lg-prof-empty">Sonuç bulunamadı</div>;
                            return filtered.map((p) => (
                              <div
                                key={p.id || p.name}
                                onClick={() => {
                                  setIdentifier(p.name);
                                  setProfDropdownOpen(false);
                                  setProfSearch('');
                                }}
                                className="lg-prof-row"
                              >
                                <div className="lg-prof-row-avatar">
                                  {(p.name || '')
                                    .split(' ')
                                    .map((w) => w.charAt(0))
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase()}
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
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={activeTab === 'admin' ? 'Admin şifresi' : 'Şifreniz'}
                      autoFocus={activeTab === 'admin'}
                      className="lg-input lg-input-icon lg-input-eye"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="lg-input-eye-btn"
                      aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showPassword ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="lg-error">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="lg-btn lg-btn-primary">
                  {loading ? (
                    <>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        style={{ animation: 'loginSpin 1s linear infinite' }}
                      >
                        <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
                      </svg>
                      Giriş yapılıyor...
                    </>
                  ) : (
                    <>
                      Giriş Yap
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="lg-footer">
          © {new Date().getFullYear()} {T.unitName || ''} · {T.appName || ''}
          <br />
          <span className="lg-footer-dev">{T.developerNote || ''}</span>
        </p>
      </div>
    </div>
  );
};

// ── Password Management Modal ──
const PasswordManagementModal = ({ students, onClose }) => {
  const [activeTab, setActiveTab] = useState('student'); // student, professor, admin
  const [studentPasses, setStudentPasses] = useState({});
  const [professorPasses, setProfessorPasses] = useState({});
  const [adminPass, setAdminPass] = useState('');
  const [professorList, setProfessorList] = useState([]);
  const [editingProf, setEditingProf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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
      if (activeTab === 'student') {
        // Her değiştirilmiş öğrenci şifresini Cloud Functions ile kaydet
        for (const [studentNo, pass] of Object.entries(studentPasses)) {
          if (pass && pass !== '••••••') {
            await DB.changePassword('student', studentNo, pass);
          }
        }
      } else if (activeTab === 'professor') {
        for (const [name, pass] of Object.entries(professorPasses)) {
          if (pass && pass !== '••••••') {
            await DB.changePassword('professor', name, pass);
          }
        }
      } else if (activeTab === 'admin') {
        if (adminPass && adminPass.length >= 6) {
          await DB.changePassword('admin', null, adminPass);
        }
      }
      alert('Şifreler kaydedildi!');
      setStudentPasses({});
      setProfessorPasses({});
      setAdminPass('');
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
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfessorValues = async () => {
    if (!editingProf.name || !editingProf.department) return alert('İsim ve Bölüm zorunludur.');
    setSaving(true);
    try {
      await DB.saveProfessor(editingProf);
      const newProfs = await DB.fetchProfessors();
      setProfessorList(newProfs);
      setEditingProf(null);
    } catch (e) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Yönetim Paneli" width={900}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {['student', 'professor', 'admin'].map((tab) => (
          <Btn
            key={tab}
            variant={activeTab === tab ? 'primary' : 'secondary'}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'student' ? 'Öğrenciler' : tab === 'professor' ? 'Akademisyenler' : 'Admin'}
          </Btn>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>Yükleniyor...</div>
      ) : (
        <div>
          <div style={{ maxHeight: 500, overflowY: 'auto', marginBottom: 24, paddingRight: 8 }}>
            {activeTab === 'student' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    <th
                      style={{
                        padding: 12,
                        textAlign: 'left',
                        borderBottom: `2px solid ${C.border}`,
                      }}
                    >
                      Öğrenci No
                    </th>
                    <th
                      style={{
                        padding: 12,
                        textAlign: 'left',
                        borderBottom: `2px solid ${C.border}`,
                      }}
                    >
                      Ad Soyad
                    </th>
                    <th
                      style={{
                        padding: 12,
                        textAlign: 'left',
                        borderBottom: `2px solid ${C.border}`,
                      }}
                    >
                      Şifre
                    </th>
                    <th
                      style={{
                        padding: 12,
                        textAlign: 'center',
                        borderBottom: `2px solid ${C.border}`,
                      }}
                    >
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.studentNumber}
                      style={{ borderBottom: `1px solid ${C.border}` }}
                    >
                      <td style={{ padding: 12, fontWeight: 600, color: C.navy }}>
                        {student.studentNumber}
                      </td>
                      <td style={{ padding: 12 }}>
                        {student.firstName} {student.lastName}
                      </td>
                      <td style={{ padding: 12 }}>
                        <Input
                          type="password"
                          value={studentPasses[student.studentNumber] || ''}
                          placeholder="Yeni şifre girin"
                          onChange={(e) =>
                            setStudentPasses((p) => ({
                              ...p,
                              [student.studentNumber]: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                'Şifreyi sıfırlamak istediğinizden emin misiniz? Kullanıcı bir sonraki girişte yeni şifre belirleyecek.'
                              )
                            ) {
                              setStudentPasses((p) => ({ ...p, [student.studentNumber]: '' }));
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            border: `1px solid ${C.border}`,
                            borderRadius: 6,
                            background: 'white',
                            cursor: 'pointer',
                            color: C.accent,
                          }}
                        >
                          Sıfırla
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'professor' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <Btn
                    small
                    onClick={() => setEditingProf({ name: '', department: '' })}
                    icon={<PlusIcon />}
                  >
                    Yeni Ekle
                  </Btn>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      <th
                        style={{
                          padding: 12,
                          textAlign: 'left',
                          borderBottom: `2px solid ${C.border}`,
                        }}
                      >
                        Unvan & İsim
                      </th>
                      <th
                        style={{
                          padding: 12,
                          textAlign: 'left',
                          borderBottom: `2px solid ${C.border}`,
                        }}
                      >
                        Bölüm
                      </th>
                      <th
                        style={{
                          padding: 12,
                          textAlign: 'left',
                          borderBottom: `2px solid ${C.border}`,
                        }}
                      >
                        Şifre
                      </th>
                      <th
                        style={{
                          padding: 12,
                          textAlign: 'center',
                          borderBottom: `2px solid ${C.border}`,
                        }}
                      >
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* New/Editing Row at top if adding new */}
                    {editingProf && !editingProf.id && (
                      <tr
                        style={{
                          background: 'rgba(0,255,135,0.05)',
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        <td style={{ padding: 12 }}>
                          <Input
                            autoFocus
                            value={editingProf.name}
                            onChange={(e) =>
                              setEditingProf({ ...editingProf, name: e.target.value })
                            }
                            placeholder="Örn: Dr. Ali Veli"
                          />
                        </td>
                        <td style={{ padding: 12 }}>
                          <Input
                            value={editingProf.department}
                            onChange={(e) =>
                              setEditingProf({ ...editingProf, department: e.target.value })
                            }
                            placeholder="Örn: Bilgisayar Müh."
                          />
                        </td>
                        <td style={{ padding: 12, color: C.textMuted }}>-</td>
                        <td
                          style={{ padding: 12, display: 'flex', gap: 6, justifyContent: 'center' }}
                        >
                          <Btn small onClick={handleSaveProfessorValues} disabled={saving}>
                            Kaydet
                          </Btn>
                          <Btn small variant="secondary" onClick={() => setEditingProf(null)}>
                            İptal
                          </Btn>
                        </td>
                      </tr>
                    )}

                    {professorList.map((prof, idx) => {
                      const isEditing = editingProf && editingProf.id === prof.id;
                      return isEditing ? (
                        <tr
                          key={prof.id}
                          style={{
                            background: 'rgba(0,255,135,0.05)',
                            borderBottom: `1px solid ${C.border}`,
                          }}
                        >
                          <td style={{ padding: 12 }}>
                            <Input
                              value={editingProf.name}
                              onChange={(e) =>
                                setEditingProf({ ...editingProf, name: e.target.value })
                              }
                            />
                          </td>
                          <td style={{ padding: 12 }}>
                            <Input
                              value={editingProf.department}
                              onChange={(e) =>
                                setEditingProf({ ...editingProf, department: e.target.value })
                              }
                            />
                          </td>
                          <td style={{ padding: 12, color: C.textMuted }}>(Şifre değişmez)</td>
                          <td
                            style={{
                              padding: 12,
                              display: 'flex',
                              gap: 6,
                              justifyContent: 'center',
                            }}
                          >
                            <Btn small onClick={handleSaveProfessorValues} disabled={saving}>
                              Kaydet
                            </Btn>
                            <Btn small variant="secondary" onClick={() => setEditingProf(null)}>
                              İptal
                            </Btn>
                          </td>
                        </tr>
                      ) : (
                        <tr key={prof.id || idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: 12, fontWeight: 600, color: C.navy }}>
                            {prof.name}
                          </td>
                          <td style={{ padding: 12 }}>{prof.department}</td>
                          <td style={{ padding: 12 }}>
                            <Input
                              type="password"
                              value={professorPasses[prof.name] || ''}
                              placeholder="Yeni şifre girin"
                              onChange={(e) =>
                                setProfessorPasses((p) => ({ ...p, [prof.name]: e.target.value }))
                              }
                            />
                          </td>
                          <td
                            style={{
                              padding: 12,
                              display: 'flex',
                              gap: 6,
                              justifyContent: 'center',
                            }}
                          >
                            <button
                              onClick={() => setEditingProf({ ...prof })}
                              style={{
                                padding: '6px',
                                border: `1px solid ${C.border}`,
                                borderRadius: 6,
                                background: 'white',
                                cursor: 'pointer',
                                color: C.blue,
                                display: 'flex',
                              }}
                              title="Düzenle"
                            >
                              <EditIcon />
                            </button>
                            <button
                              onClick={() => handleDeleteProf(prof.id, prof.name)}
                              style={{
                                padding: '6px',
                                border: `1px solid ${C.border}`,
                                borderRadius: 6,
                                background: 'white',
                                cursor: 'pointer',
                                color: C.accent,
                                display: 'flex',
                              }}
                              title="Sil"
                            >
                              <TrashIcon />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    'Şifreyi sıfırlamak istediğinizden emin misiniz? Kullanıcı bir sonraki girişte yeni şifre belirleyecek.'
                                  )
                                ) {
                                  setProfessorPasses((p) => ({ ...p, [prof.name]: '' }));
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                fontSize: 12,
                                border: `1px solid ${C.border}`,
                                borderRadius: 6,
                                background: 'white',
                                cursor: 'pointer',
                                color: C.accent,
                              }}
                            >
                              Şifre Sıfırla
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'admin' && (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ marginBottom: 16, fontWeight: 600, color: C.navy }}>
                  Admin Giriş Şifresi
                </div>
                <div style={{ maxWidth: 300, margin: '0 auto' }}>
                  <Input
                    type="password"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    placeholder="Yeni admin şifresi"
                    style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2 }}
                  />
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: C.textMuted }}>
                  Bu şifre ile Admin paneline erişim sağlanır.
                </div>
              </div>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              paddingTop: 20,
              borderTop: `1px solid ${C.border}`,
            }}
          >
            <Btn onClick={onClose} variant="secondary">
              Kapat
            </Btn>
            <Btn onClick={handleSavePasswords} disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Şifreleri Kaydet'}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── Grade Converter Widget ──
const GradeConverter = () => {
  const [activeTab, setActiveTab] = useState('table1');
  const [inputGrade, setInputGrade] = useState('');
  const [result, setResult] = useState(null);

  // ── Table Definitions ──
  const TABLE_DATA = {
    table1: {
      title: "Tablo 1 (100'lük)",
      desc: "100'lük Sistem -> Harf Notu",
      placeholder: 'Not (0-100)',
      type: 'range',
      columns: ['Tanım (English)', 'Sayısal (Numeric)', 'Karsılık'],
      data: [
        { text: 'very good', range: '90-100', min: 90, max: 100, eq: 'A', color: '#10B981' },
        { text: 'good +', range: '85-89', min: 85, max: 89, eq: 'B1', color: '#3B82F6' },
        { text: 'good', range: '80-84', min: 80, max: 84, eq: 'B2', color: '#60A5FA' },
        { text: 'sufficient +', range: '75-79', min: 75, max: 79, eq: 'B3', color: '#93C5FD' },
        { text: 'sufficient', range: '70-74', min: 70, max: 74, eq: 'C1', color: '#F59E0B' },
        { text: 'allowing +', range: '65-69', min: 65, max: 69, eq: 'C2', color: '#FBBF24' },
        { text: 'allowing', range: '60-64', min: 60, max: 64, eq: 'C3', color: '#FCD34D' },
        { text: 'insufficient', range: '50-59', min: 50, max: 59, eq: 'F1', color: '#EF4444' },
        { text: 'insufficient', range: '0-49', min: 0, max: 49, eq: 'F2', color: '#DC2626' },
      ],
    },
    table2: {
      title: 'Tablo 2 (Katsayı)',
      desc: "100'lük -> Katsayı -> Harf",
      placeholder: 'Not (0-100)',
      type: 'range',
      columns: ['Sayısal Notlar', 'Katsayılar', 'Karsılık'],
      data: [
        { range: '90-100', min: 90, max: 100, coef: '4,00', eq: 'A', color: '#10B981' },
        { range: '85-89', min: 85, max: 89, coef: '3,50', eq: 'B1', color: '#3B82F6' },
        { range: '80-84', min: 80, max: 84, coef: '3,25', eq: 'B2', color: '#60A5FA' },
        { range: '75-79', min: 75, max: 79, coef: '3,00', eq: 'B3', color: '#93C5FD' },
        { range: '70-74', min: 70, max: 74, coef: '2,50', eq: 'C1', color: '#F59E0B' },
        { range: '65-69', min: 65, max: 69, coef: '2,25', eq: 'C2', color: '#FBBF24' },
        { range: '60-64', min: 60, max: 64, coef: '2,00', eq: 'C3', color: '#FCD34D' },
        { range: '50-59', min: 50, max: 59, coef: '1,50', eq: 'F1', color: '#EF4444' },
        { range: '0-49', min: 0, max: 49, coef: '0,00', eq: 'F2', color: '#DC2626' },
      ],
    },
    table3: {
      title: "Tablo 3 (Harf/4'lük)",
      desc: 'Basarı Notu / Harf -> Karsılık',
      placeholder: 'Not (örn: 3.50 veya BA)',
      type: 'mixed',
      columns: ['Basarı Notu', 'Harf Notu', 'Karsılık'],
      data: [
        { val: 4.0, letter: 'AA', eq: 'A', color: '#10B981' },
        { val: 3.5, letter: 'BA', eq: 'B1', color: '#3B82F6' },
        { val: 3.0, letter: 'BB', eq: 'B2', color: '#60A5FA' },
        { val: 2.5, letter: 'CB', eq: 'B3', color: '#93C5FD' },
        { val: 2.0, letter: 'CC', eq: 'C1', color: '#F59E0B' },
        { val: 1.5, letter: 'DC', eq: 'C2', color: '#FBBF24' },
        { val: 1.0, letter: 'DD', eq: 'C3', color: '#FCD34D' },
        { val: 0.0, letter: 'FF', eq: 'F1', color: '#EF4444' },
        { val: 0.0, letter: 'FD', eq: 'F2', color: '#DC2626' },
        { text: '-', letter: 'Sınava girmedi', eq: 'FF1', color: '#991B1B' },
        { text: '-', letter: 'Devamsızlıktan kaldı', eq: 'FF2', color: '#7F1D1D' },
      ],
    },
    ects_conv: {
      title: 'ECTS Dönüşüm',
      desc: 'ECTS Notu -> Kurum Notu',
      placeholder: 'ECTS Notu (A, B...)',
      type: 'match',
      columns: ['ECTS Notu', 'Acıklama', 'Karsılık'],
      data: [
        { eq: 'A', def: 'excellent', u_eq: 'A', color: '#10B981' },
        { eq: 'B', def: 'very good', u_eq: 'B1', color: '#3B82F6' },
        { eq: 'C', def: 'good', u_eq: 'B2', color: '#60A5FA' },
        { eq: 'D', def: 'satisfactory', u_eq: 'C1', color: '#F59E0B' },
        { eq: 'E', def: 'sufficient', u_eq: 'C3', color: '#FCD34D' },
        { eq: 'FX', def: 'failed', u_eq: 'F1', color: '#EF4444' },
        { eq: 'F', def: 'failed', u_eq: 'F2', color: '#DC2626' },
      ],
    },
    table4: {
      title: 'ECTS Tanım',
      desc: 'ECTS Notu -> Tanım (Referans)',
      placeholder: 'ECTS Notu (A, B, C...)',
      type: 'match',
      columns: ['ECTS Grade', '% of successful students', 'Definition'],
      data: [
        {
          eq: 'A',
          pct: '10',
          def: 'EXCELLENT - outstanding performance with only minor errors',
          color: '#10B981',
        },
        {
          eq: 'B',
          pct: '25',
          def: 'VERY GOOD - above the average standard but with some errors',
          color: '#3B82F6',
        },
        {
          eq: 'C',
          pct: '30',
          def: 'GOOD - generally sound work with a number of notable errors',
          color: '#60A5FA',
        },
        {
          eq: 'D',
          pct: '25',
          def: 'SATISFACTORY - fair but with significant shortcomings',
          color: '#F59E0B',
        },
        {
          eq: 'E',
          pct: '10',
          def: 'SUFFICIENT - performance meets the minimum criteria',
          color: '#FBBF24',
        },
        {
          eq: 'FX',
          pct: '-',
          def: 'FAIL - some more work required before the credit can be awarded',
          color: '#EF4444',
        },
        {
          eq: 'F',
          pct: '-',
          def: 'FAIL - considerable further work is required',
          color: '#DC2626',
        },
      ],
    },
    system10: {
      title: "10'luk Sistem",
      desc: "10'luk Sistem -> Harf Notu",
      placeholder: 'Not (0-10)',
      type: 'exact',
      columns: ['Not', 'Acıklama', 'Karsılık'],
      data: [
        { val: 10, text: 'with distinctions', eq: 'A', color: '#10B981' },
        { val: 9, text: 'excellent', eq: 'B1', color: '#3B82F6' },
        { val: 8, text: 'very good', eq: 'B2', color: '#60A5FA' },
        { val: 7, text: 'good', eq: 'B3', color: '#93C5FD' },
        { val: 6, text: 'almost good', eq: 'C1', color: '#F59E0B' },
        { val: 5, text: 'satisfactory', eq: 'C2', color: '#FBBF24' },
        { val: 4, text: 'almost satisfactory', eq: 'C3', color: '#FCD34D' },
        { val: 3, text: 'not passed or failed', eq: 'F2', color: '#EF4444' },
        { val: 2, text: 'not passed or failed', eq: 'F2', color: '#EF4444' },
        { val: 1, text: 'not passed or failed', eq: 'F2', color: '#EF4444' },
        { val: 0, text: 'not passed or failed', eq: 'F2', color: '#EF4444' },
      ],
    },
    system5a: {
      title: "5'lik (A)",
      desc: "5'lik Sistem (Tip A) -> Harf",
      placeholder: 'Not (0-5)',
      type: 'exact',
      columns: ['Not', 'Acıklama', 'Karsılık'],
      data: [
        { val: 5, text: 'very good', eq: 'A', color: '#10B981' },
        { val: 4.5, text: 'good +', eq: 'B1', color: '#3B82F6' },
        { val: 4, text: 'good', eq: 'B2', color: '#60A5FA' },
        { val: 3.5, text: 'sufficient +', eq: 'B3', color: '#93C5FD' },
        { val: 3, text: 'sufficient', eq: 'C1', color: '#F59E0B' },
        { val: 2.5, text: 'allowing +', eq: 'C2', color: '#FBBF24' },
        { val: 2, text: 'allowing', eq: 'C3', color: '#FCD34D' },
        { val: 1.5, text: 'insufficient', eq: 'F2', color: '#EF4444' },
        { val: 1, text: 'insufficient', eq: 'F2', color: '#EF4444' },
        { val: 0.5, text: 'insufficient', eq: 'F2', color: '#EF4444' },
        { val: 0, text: 'insufficient', eq: 'F2', color: '#EF4444' },
      ],
    },
    system5b: {
      title: "5'lik (B/D)",
      desc: "5'lik Sistem (Tip B/D) -> Harf",
      placeholder: 'Not (0-5)',
      type: 'exact',
      columns: ['Not', 'Acıklama', 'Karsılık'],
      data: [
        { val: 5, text: 'very good', eq: 'A', color: '#10B981' },
        { val: 4.5, text: 'better than good', eq: 'B1', color: '#3B82F6' },
        { val: 4, text: 'good', eq: 'B2', color: '#60A5FA' },
        { val: 3.5, text: 'better than satisfactory', eq: 'C1', color: '#F59E0B' },
        { val: 3, text: 'satisfactory', eq: 'C2', color: '#FBBF24' },
        { val: 2.5, text: 'satisfactory', eq: 'C3', color: '#FCD34D' },
        { val: 2, text: 'failure', eq: 'F2', color: '#EF4444' },
        { val: 1.5, text: 'failure', eq: 'F2', color: '#EF4444' },
        { val: 1, text: 'failure', eq: 'F2', color: '#EF4444' },
        { val: 0.5, text: 'failure', eq: 'F2', color: '#EF4444' },
        { val: 0, text: 'failure', eq: 'F2', color: '#EF4444' },
      ],
    },
    system5c: {
      title: "5'lik (C)",
      desc: "5'lik Sistem (Tip C - Tam Sayı) -> Harf",
      placeholder: 'Not (0-5)',
      type: 'exact',
      columns: ['Not', 'Acıklama', 'Karsılık'],
      data: [
        { val: 5, text: 'excellent', eq: 'A', color: '#10B981' },
        { val: 4, text: 'good', eq: 'B2', color: '#60A5FA' },
        { val: 3, text: 'satisfactory', eq: 'C1', color: '#F59E0B' },
        { val: 2, text: 'passed', eq: 'C3', color: '#FCD34D' },
        { val: 1, text: 'failed', eq: 'F1', color: '#EF4444' },
        { val: 0, text: 'failed', eq: 'F2', color: '#DC2626' },
      ],
    },
  };

  const calculateGrade = (val, tableKey) => {
    if (!val) return null;
    const table = TABLE_DATA[tableKey];
    const num = parseFloat(val);
    const str = String(val).trim().toUpperCase();

    if (table.type === 'range') {
      if (isNaN(num)) return null;
      return table.data.find((row) => num >= row.min && num <= row.max) || null;
    } else if (table.type === 'exact') {
      if (isNaN(num)) return null;
      // Precision handle for 4.5 vs 4,5
      return table.data.find((row) => Math.abs(row.val - num) < 0.1) || null;
    } else if (table.type === 'mixed') {
      // Try string match (AA, BA...)
      const strMatch = table.data.find((row) => row.letter && row.letter.toUpperCase() === str);
      if (strMatch) return strMatch;
      // Try number match (4.00, 3.50...)
      if (!isNaN(num))
        return (
          table.data.find((row) => row.val !== undefined && Math.abs(row.val - num) < 0.01) || null
        );
      return null;
    } else if (table.type === 'match') {
      return table.data.find((row) => row.eq === str) || null;
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
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 12,
          borderBottom: '1px solid #E5E7EB',
          marginBottom: 20,
        }}
      >
        {Object.entries(TABLE_DATA).map(([key, t]) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key);
              setInputGrade('');
              setResult(null);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              background: activeTab === key ? '#EEF2FF' : 'transparent',
              color: activeTab === key ? '#4F46E5' : '#6B7280',
              border: activeTab === key ? '1px solid #C7D2FE' : '1px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {t.title}
          </button>
        ))}
      </div>

      {/* Input Section */}
      <div
        style={{
          background: '#F3F4F6',
          padding: 20,
          borderRadius: 12,
          marginBottom: 24,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#6B7280',
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {activeData.desc}
        </div>
        <div style={{ display: 'flex', gap: 12, maxWidth: 320, margin: '0 auto' }}>
          <Input
            value={inputGrade}
            onChange={(e) => setInputGrade(e.target.value)}
            placeholder={activeData.placeholder}
            style={{ textAlign: 'center', fontSize: 16, padding: 12 }}
          />
        </div>

        {result && (
          <div style={{ marginTop: 20, animation: 'fadeIn 0.3s ease' }}>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>Dönüştürülen Not</div>
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: result.color || '#374151',
                fontFamily: "'Playfair Display', serif",
                lineHeight: 1,
              }}
            >
              {result.u_eq || result.eq || result.def}
            </div>
            {result.text && (
              <div style={{ fontSize: 14, fontWeight: 500, color: '#374151', marginTop: 8 }}>
                {result.text}
              </div>
            )}
            {activeTab === 'ects_conv' && (
              <div style={{ fontSize: 14, fontWeight: 500, color: '#374151', marginTop: 8 }}>
                {result.def}
              </div>
            )}
            {activeTab === 'table4' && (
              <div
                style={{
                  fontSize: 12,
                  color: '#6B7280',
                  marginTop: 8,
                  maxWidth: 300,
                  margin: '8px auto',
                }}
              >
                {result.def}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reference Table */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              {activeData.columns.map((col, i) => (
                <th
                  key={i}
                  style={{
                    padding: '12px 16px',
                    textAlign: i === 0 ? 'left' : 'center',
                    color: '#6B7280',
                    fontWeight: 600,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeData.data.map((row, i) => {
              // Highlight logic varies by table
              let isActive = false;
              if (result) {
                if (activeTab === 'table4') isActive = result.eq === row.eq;
                else if (activeTab === 'ects_conv') isActive = result.eq === row.eq;
                else if (row.eq) isActive = result.eq === row.eq;
              }

              return (
                <tr
                  key={i}
                  style={{
                    background: isActive ? `${row.color}15` : 'white',
                    borderBottom: i !== activeData.data.length - 1 ? '1px solid #F3F4F6' : 'none',
                    transition: 'background 0.2s',
                  }}
                >
                  {/* Render columns based on table type */}
                  {activeTab === 'table1' && (
                    <>
                      <td style={{ padding: '10px 16px', color: '#111827', fontWeight: 500 }}>
                        {row.text}
                      </td>
                      <td
                        style={{
                          padding: '10px 16px',
                          textAlign: 'center',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {row.range}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <Badge
                          color="white"
                          bg={result && result.eq === row.eq ? row.color : '#9CA3AF'}
                        >
                          {row.eq}
                        </Badge>
                      </td>
                    </>
                  )}
                  {activeTab === 'table2' && (
                    <>
                      <td style={{ padding: '10px 16px', color: '#111827', fontWeight: 500 }}>
                        {row.range}
                      </td>
                      <td
                        style={{
                          padding: '10px 16px',
                          textAlign: 'center',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {row.coef}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <Badge
                          color="white"
                          bg={result && result.eq === row.eq ? row.color : '#9CA3AF'}
                        >
                          {row.eq}
                        </Badge>
                      </td>
                    </>
                  )}
                  {activeTab === 'table3' && (
                    <>
                      <td style={{ padding: '10px 16px', color: '#111827', fontWeight: 500 }}>
                        {row.val !== undefined ? row.val.toFixed(2) : row.text}
                      </td>
                      <td
                        style={{
                          padding: '10px 16px',
                          textAlign: 'center',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {row.letter}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <Badge
                          color="white"
                          bg={result && result.eq === row.eq ? row.color : '#9CA3AF'}
                        >
                          {row.eq}
                        </Badge>
                      </td>
                    </>
                  )}
                  {activeTab === 'ects_conv' && (
                    <>
                      <td
                        style={{
                          padding: '10px 16px',
                          color: '#111827',
                          fontWeight: 500,
                          textAlign: 'center',
                        }}
                      >
                        <Badge color="white" bg={row.color}>
                          {row.eq}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>{row.def}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <Badge
                          color="white"
                          bg={result && result.u_eq === row.u_eq ? row.color : '#9CA3AF'}
                        >
                          {row.u_eq}
                        </Badge>
                      </td>
                    </>
                  )}
                  {activeTab === 'table4' && (
                    <>
                      <td
                        style={{
                          padding: '10px 16px',
                          color: '#111827',
                          fontWeight: 500,
                          textAlign: 'center',
                        }}
                      >
                        <Badge color="white" bg={row.color}>
                          {row.eq}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>{row.pct}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#4B5563' }}>
                        {row.def}
                      </td>
                    </>
                  )}
                  {(activeTab.startsWith('system10') || activeTab.startsWith('system5')) && (
                    <>
                      <td style={{ padding: '10px 16px', color: '#111827', fontWeight: 500 }}>
                        {row.val}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>{row.text}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <Badge
                          color="white"
                          bg={result && result.eq === row.eq ? row.color : '#9CA3AF'}
                        >
                          {row.eq}
                        </Badge>
                      </td>
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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const eyeIcon = (show) =>
    show ? (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    ) : (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Yeni şifreler uyuşmuyor.');
      return;
    }

    setLoading(true);
    try {
      // Hierarchy yetkilileri (uni admin / fac manager / dept manager) akademisyen
      // olarak giriş yapıyor; şifreleri 'professor_passwords' koleksiyonunda.
      // ChangePassword isteğinde role=currentUser.role kullanmak şifreyi
      // YANLIŞ koleksiyona yazıyordu (admin/department_manager_passwords).
      // baseRole='professor' ise her zaman role='professor' + name gönderilir.
      const isProfBased = currentUser.baseRole === 'professor';
      const role = isProfBased ? 'professor' : currentUser.role;
      const identifier = isProfBased
        ? currentUser.name
        : role === 'student'
          ? currentUser.studentNumber
          : role === 'professor'
            ? currentUser.name
            : role === 'bolum_yetkilisi'
              ? currentUser.name
              : null;

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('caku_auth_token') || ''}`,
        },
        body: JSON.stringify({ role, identifier, newPassword, currentPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Şifre değiştirilemedi.');
      }
    } catch (err) {
      setError('Sunucu hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputWrap = { position: 'relative', marginBottom: 16 };
  const inputStyle = {
    width: '100%',
    padding: '11px 42px 11px 14px',
    borderRadius: 8,
    border: '1px solid #D1D5DB',
    fontSize: 14,
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };
  const eyeBtn = {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9CA3AF',
    display: 'flex',
    alignItems: 'center',
    padding: 4,
  };
  const label = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 6,
  };

  return (
    <Modal open={true} onClose={onClose} title="Şifre Değiştir" width={400}>
      {success ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#D1FAE5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#059669', marginBottom: 8 }}>
            Şifre başarıyla değiştirildi!
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>
            Bir sonraki girişinizde yeni şifrenizi kullanın.
          </div>
          <Btn onClick={onClose}>Kapat</Btn>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div
            style={{
              marginBottom: 8,
              padding: '10px 14px',
              borderRadius: 8,
              background: '#F3F4F6',
              fontSize: 13,
              color: '#374151',
            }}
          >
            <span style={{ fontWeight: 600 }}>
              {currentUser?.name || currentUser?.studentNumber}
            </span>
            <span style={{ color: '#9CA3AF', marginLeft: 8, fontSize: 11 }}>
              {currentUser?.role === 'admin'
                ? 'Yönetici'
                : currentUser?.role === 'professor'
                  ? 'Akademisyen'
                  : currentUser?.role === 'bolum_yetkilisi'
                    ? 'Bölüm Yetkilisi'
                    : 'Öğrenci'}
            </span>
          </div>

          <div style={{ height: 1, background: '#E5E7EB', margin: '16px 0' }} />

          {/* Mevcut şifre — admin için gerekli değil */}
          {currentUser?.role !== 'admin' && (
            <div>
              <label style={label}>Mevcut Şifre</label>
              <div style={inputWrap}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Mevcut şifreniz"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#6366F1')}
                  onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                />
                <button type="button" style={eyeBtn} onClick={() => setShowCurrent(!showCurrent)}>
                  {eyeIcon(showCurrent)}
                </button>
              </div>
            </div>
          )}

          <label style={label}>Yeni Şifre</label>
          <div style={inputWrap}>
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="En az 6 karakter"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#6366F1')}
              onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
            />
            <button type="button" style={eyeBtn} onClick={() => setShowNew(!showNew)}>
              {eyeIcon(showNew)}
            </button>
          </div>
          {newPassword.length > 0 && (
            <div style={{ marginTop: -10, marginBottom: 12, display: 'flex', gap: 4 }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    background:
                      newPassword.length >= i * 4
                        ? newPassword.length >= 10
                          ? '#10B981'
                          : '#F59E0B'
                        : '#E5E7EB',
                    transition: 'background 0.3s',
                  }}
                />
              ))}
              <span
                style={{
                  fontSize: 10,
                  color: newPassword.length >= 10 ? '#10B981' : '#F59E0B',
                  marginLeft: 6,
                  alignSelf: 'center',
                }}
              >
                {newPassword.length >= 10 ? 'Güçlü' : 'Orta'}
              </span>
            </div>
          )}

          <label style={label}>Yeni Şifre (Tekrar)</label>
          <div style={inputWrap}>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Şifreyi tekrar girin"
              style={{
                ...inputStyle,
                borderColor:
                  confirmPassword && confirmPassword !== newPassword ? '#EF4444' : '#D1D5DB',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#6366F1')}
              onBlur={(e) =>
                (e.target.style.borderColor =
                  confirmPassword && confirmPassword !== newPassword ? '#EF4444' : '#D1D5DB')
              }
            />
            <button type="button" style={eyeBtn} onClick={() => setShowConfirm(!showConfirm)}>
              {eyeIcon(showConfirm)}
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                fontSize: 13,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>
              İptal
            </Btn>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: loading ? '#A5B4FC' : '#6366F1',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.2s',
              }}
            >
              {loading ? (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
                    <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
                  </svg>
                  Kaydediliyor...
                </>
              ) : (
                'Şifreyi Değiştir'
              )}
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
      console.warn('StudentNotifier: öğrenciler alınamadı', e);
      return [];
    }
  },
  async _fetchCoursesByCode(departmentId, code) {
    try {
      var snap = await window.apiFirestore.collection('sinav_dersler').get();
      var all = snap.docs.map(function (d) {
        return Object.assign({ id: d.id }, d.data());
      });
      var normalized = (code || '').toString().trim().toLowerCase();
      return all.filter(function (c) {
        if (!normalized) return false;
        if (departmentId && c.departmentId !== departmentId) return false;
        return (c.code || '').toString().trim().toLowerCase() === normalized;
      });
    } catch (e) {
      console.warn('StudentNotifier: dersler alınamadı', e);
      return [];
    }
  },
  async _addNotification(studentNumber, payload) {
    // Tekleştirilmiş bildirim: hem eski student_notifications (Benim Sayfam)
    // hem de merkezi notifications koleksiyonuna (Notify → çan menüsü) yazar.
    // Böylece tüm modüller tek sisteme (Notify) bağlanırken öğrenci paneli
    // de bozulmaz. Yeni kodlar doğrudan window.Notify.send kullanabilir.
    try {
      var data = Object.assign(
        {
          studentNumber: String(studentNumber),
          read: false,
          createdAt: new Date().toISOString(),
        },
        payload
      );
      await FirestoreWrite.add('student_notifications', data);
    } catch (e) {
      console.warn('StudentNotifier: bildirim eklenemedi', studentNumber, e);
    }
    // Merkezi sisteme de yansıt (öğrencinin çan menüsünde görünsün)
    try {
      if (window.Notify && window.Notify.send) {
        await window.Notify.send({
          recipientType: 'user',
          recipientId: String(studentNumber),
          module: payload.module || 'sistem',
          type: payload.type || 'bilgi',
          title: payload.title || '',
          body: payload.body || '',
          link: payload.link || '',
          meta: payload.meta || {},
        });
      }
    } catch (e) {
      /* merkezi yazım opsiyonel — sessiz geç */
    }
  },
  async fetchForStudent(studentNumber, limitN) {
    try {
      var items = await apiRead('student_notifications', {
        where: 'studentNumber:eq:s:' + String(studentNumber),
      });
      items.sort(function (a, b) {
        var ta = new Date(a.createdAt || 0).getTime();
        var tb = new Date(b.createdAt || 0).getTime();
        return tb - ta;
      });
      if (limitN) return items.slice(0, limitN);
      return items;
    } catch (e) {
      console.warn('StudentNotifier: liste alınamadı', e);
      return [];
    }
  },
  async markRead(id) {
    try {
      await FirestoreWrite.update('student_notifications', String(id), { read: true });
    } catch (e) {
      console.warn('StudentNotifier: okundu yapılamadı', e);
    }
  },
  async markAllRead(studentNumber) {
    try {
      var items = await this.fetchForStudent(studentNumber);
      var ops = items
        .filter(function (n) {
          return !n.read;
        })
        .map(function (n) {
          return FirestoreWrite.update('student_notifications', String(n.id), { read: true });
        });
      await Promise.all(ops);
    } catch (e) {
      console.warn('StudentNotifier: toplu okundu hatası', e);
    }
  },
  // Bir dersle ilgili proje grubu oluştuğunda o dersi almış öğrencilere bildirim yolla
  async notifyCourseStudents(departmentId, courseCode, payload) {
    try {
      var courses = await this._fetchCoursesByCode(departmentId, courseCode);
      if (courses.length === 0) return;
      var courseIds = courses.map(function (c) {
        return c.id;
      });
      var students = await this._fetchStudents();
      var targets = students.filter(function (s) {
        if (!Array.isArray(s.myCourseIds) || s.myCourseIds.length === 0) return false;
        if (departmentId && s.departmentId !== departmentId) return false;
        return s.myCourseIds.some(function (id) {
          return courseIds.indexOf(id) !== -1;
        });
      });
      await Promise.all(
        targets.map(function (s) {
          return StudentNotifier._addNotification(s.studentNumber, payload);
        })
      );
    } catch (e) {
      console.warn('StudentNotifier: ders bildirimi gönderilemedi', e);
    }
  },
  // Portal duyurusunda bölüm öğrencilerinin tümüne bildirim yolla
  async notifyDepartmentStudents(departmentId, payload, excludeStudentNumber) {
    try {
      var students = await this._fetchStudents();
      var targets = students.filter(function (s) {
        if (departmentId && s.departmentId !== departmentId) return false;
        if (excludeStudentNumber && String(s.studentNumber) === String(excludeStudentNumber))
          return false;
        return true;
      });
      await Promise.all(
        targets.map(function (s) {
          return StudentNotifier._addNotification(s.studentNumber, payload);
        })
      );
    } catch (e) {
      console.warn('StudentNotifier: bölüm bildirimi gönderilemedi', e);
    }
  },
};
window.StudentNotifier = StudentNotifier;

// ── Export to window ──
window.C = C;
window.FONTS_LINK = FONTS_LINK;
// Tüm rollerde aynı tipografi — modüller de bu değerleri kullanabilsin.
window.APP_FONT_STACK = APP_FONT_STACK;
window.APP_FONT_SIZE = APP_FONT_SIZE;
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

// ── Google AdSense Reklam Banner Bileşeni ──
const AdSenseBanner = ({ type }) => {
  const containerRef = window.React.useRef(null);
  const pushed = window.React.useRef(false);

  window.React.useEffect(() => {
    if (pushed.current) return;
    if (!containerRef.current) return;
    const timer = setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      } catch (err) {
        console.warn('AdSense push hatası:', err);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Feed içi reklam (fluid)
  if (!type || type === 'feed') {
    return (
      <div ref={containerRef} style={{ overflow: 'hidden', margin: '4px 0', minHeight: 50 }}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-format="fluid"
          data-ad-layout-key="-fb+5w+4e-db+86"
          data-ad-client="ca-pub-7694350832593138"
          data-ad-slot="1362423408"
        />
      </div>
    );
  }

  // Sidebar / yatay reklam (auto responsive)
  if (type === 'sidebar') {
    return (
      <div ref={containerRef} style={{ overflow: 'hidden', margin: '4px 0', minHeight: 90 }}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-7694350832593138"
          data-ad-slot="6879159724"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  return null;
};
window.AdSenseBanner = AdSenseBanner;
