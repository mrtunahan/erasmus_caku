// Tailwind v3 yapılandırması — design-tokens.cjs'den besleniyor.
const T = require("./design-tokens.cjs");

const spacingFromTokens = Object.fromEntries(
  Object.entries(T.space).map(([k, v]) => [k, typeof v === "number" ? `${v}px` : v])
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./*.jsx",
    "./main.jsx",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: T.color.primary, pale: T.color.primaryPale, strong: T.color.primaryStrong },
        navy:    { DEFAULT: T.color.navy, light: T.color.navyLight },
        gold:    { DEFAULT: T.color.gold, light: T.color.goldLight, pale: T.color.goldPale },
        accent:  { DEFAULT: T.color.accent, light: T.color.accentLight },
        success: { DEFAULT: T.color.success, pale: T.color.successPale },
        danger:  { DEFAULT: T.color.danger, pale: T.color.dangerPale },
        warning: { DEFAULT: T.color.warning, pale: T.color.warningPale },
        info:    { DEFAULT: T.color.info, pale: T.color.infoPale },
        ink:     { DEFAULT: T.color.text, muted: T.color.textMuted },
        surface: { DEFAULT: T.color.surface, muted: T.color.surfaceMuted, page: T.color.bg },
        edge:    { DEFAULT: T.color.border, strong: T.color.borderStrong, soft: T.color.borderSoft },
      },
      borderRadius: {
        xs: T.radius.xs, sm: T.radius.sm, md: T.radius.md, lg: T.radius.lg, xl: T.radius.xl, pill: T.radius.pill,
      },
      boxShadow: {
        sm: T.shadow.sm, md: T.shadow.md, lg: T.shadow.lg,
      },
      spacing: spacingFromTokens,
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      fontSize: {
        xs: [`${T.font.sizeXs}px`, "1.4"],
        sm: [`${T.font.sizeSm}px`, "1.45"],
        base: [`${T.font.sizeMd}px`, "1.5"],
        lg: [`${T.font.sizeLg}px`, "1.5"],
        xl: [`${T.font.sizeXl}px`, "1.4"],
        "2xl": [`${T.font.size2xl}px`, "1.3"],
        "3xl": [`${T.font.size3xl}px`, "1.25"],
      },
    },
  },
  // Mevcut inline stillerle çakışmayı en aza indirmek için `preflight`'ı kapatıyoruz;
  // base reset eski tasarımı bozar.
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
