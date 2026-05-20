// ══════════════════════════════════════════════════════════════
// Tek Kaynak (Single Source of Truth) — Tasarım Tokenları
// ──────────────────────────────────────────────────────────────
// Hem shared-components.jsx (window.T) hem de tailwind.config.js
// bu dosyayı require eder. Bütün renkler / boşluklar / radyuslar
// burada — başka yerde sabit yazılmayacak.
// ══════════════════════════════════════════════════════════════
const tokens = {
  color: {
    // Birincil marka
    primary: "#0891B2",
    primaryPale: "#ECFEFF",
    primaryStrong: "#0E7490",

    // Lacivert (kurumsal koyu)
    navy: "#1B2A4A",
    navyLight: "#2D4A7A",

    // Vurgu / dekoratif (eski C'den DY'den)
    gold: "#C4973B",
    goldLight: "#E8D5A8",
    goldPale: "#FBF6EC",
    accent: "#8B2635",
    accentLight: "#D4A0A7",

    // Metin
    text: "#1F2937",
    textMuted: "#64748B",

    // Yüzeyler / arka plan
    bg: "#F7F5F0",
    surface: "#FFFFFF",
    surfaceMuted: "#FAFAFA",

    // Kenar
    border: "#E5E7EB",
    borderStrong: "#D1D5DB",
    borderSoft: "#F0EDE6",

    // Durum
    success: "#059669",
    successPale: "#D1FAE5",
    danger: "#DC2626",
    dangerPale: "#FEE2E2",
    warning: "#D97706",
    warningPale: "#FEF3C7",
    info: "#3B82F6",
    infoPale: "#DBEAFE",
  },
  radius: { xs: "4px", sm: "6px", md: "8px", lg: "10px", xl: "14px", pill: "999px" },
  shadow: {
    sm: "0 1px 3px rgba(0,0,0,0.05)",
    md: "0 4px 12px rgba(0,0,0,0.08)",
    lg: "0 8px 24px rgba(0,0,0,0.12)",
  },
  // 4px tabanlı ızgara
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, "3xl": 48, "4xl": 64 },
  font: {
    family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    sizeXs: 11, sizeSm: 12, sizeMd: 13, sizeLg: 14, sizeXl: 16, size2xl: 20, size3xl: 24,
    weightNormal: 400, weightMedium: 500, weightSemibold: 600, weightBold: 700,
  },
};

module.exports = tokens;
