// ══════════════════════════════════════════════════════════════
// TTO Otomasyonu ekranlarının Tailwind yapılandırması
//
// Bu ekranlar ayrı bir uygulamadan (TTO Otomasyonu — Tailwind v4, kendi
// "Stitch" paleti) BİREBİR taşındı. Kök yapılandırma (tailwind.config.js)
// yazı boyutlarını ve köşe yarıçaplarını kendi tasarım tokenlarıyla
// değiştiriyor (ör. text-sm = 12px); TTO sınıfları onunla derlenseydi
// ekranlar orijinalinden farklı görünürdü.
//
// Bu yüzden tto.css kendi yapılandırmasıyla derlenir (@config) ve her
// yardımcı sınıf `.tto-kok` altına kapsanır (important: '.tto-kok'):
//   • TTO sınıfları yalnız TTO kapsayıcısının İÇİNDE geçerlidir — Offline
//     Asistan'ın geri kalanı etkilenmez;
//   • kapsayıcı içinde kök sınıflardan daha özgüldür, orijinal değerler kazanır.
// Tailwind'in varsayılan ölçekleri (v4 ile aynı olanlar) olduğu gibi kullanılır;
// v4'te değişen birkaç değer (renk paleti, blur-sm) aşağıda v4'e eşitlendi.
// ══════════════════════════════════════════════════════════════
const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [path.join(__dirname, '**/*.{jsx,js}')],
  important: '.tto-kok',
  // Temel sıfırlama tto.css'te `.tto-kok` altına kapsanmış olarak durur;
  // Tailwind'in kendi preflight'ı bütün sayfaya uygulanırdı.
  corePlugins: { preflight: false },
  theme: {
    // v4 satır yüksekliği ORANSALDIR (text-xs → 1.3333); v3'te sabit rem idi.
    // Fark iç içe öğelerde görünür: text-xs bir satırın içindeki text-[10px]
    // bağlantı v4'te 13.3px, v3'te 16px yüksekliğinde çıkıyordu.
    fontSize: {
      xs: ['0.75rem', { lineHeight: 'calc(1 / 0.75)' }],
      sm: ['0.875rem', { lineHeight: 'calc(1.25 / 0.875)' }],
      base: ['1rem', { lineHeight: '1.5' }],
      lg: ['1.125rem', { lineHeight: 'calc(1.75 / 1.125)' }],
      xl: ['1.25rem', { lineHeight: 'calc(1.75 / 1.25)' }],
      '2xl': ['1.5rem', { lineHeight: 'calc(2 / 1.5)' }],
      '3xl': ['1.875rem', { lineHeight: 'calc(2.25 / 1.875)' }],
      '4xl': ['2.25rem', { lineHeight: 'calc(2.5 / 2.25)' }],
      '5xl': ['3rem', { lineHeight: '1' }],
    },
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          '"Noto Sans"',
          'Arial',
          'sans-serif',
        ],
      },
      backdropBlur: { sm: '8px' },
      colors: {
        // ── TTO Otomasyonu "Stitch" paleti (orijinal src/index.css @theme) ──
        'surface-bright': '#edeef4',
        'tertiary-container': '#a78bfa',
        'surface-variant': '#dcdee4',
        'secondary-fixed-dim': '#b8baca',
        'surface-container-high': '#dcdee4',
        'surface-container-lowest': '#f0f2f8',
        'secondary-container': '#d8dae6',
        'surface-container': '#e2e4ea',
        'on-tertiary-fixed': '#2e1065',
        background: '#e8eaf0',
        'on-surface-variant': '#585a68',
        primary: '#6366f1',
        'surface-container-highest': '#d6d8de',
        'outline-variant': '#d0d2dc',
        'on-surface': '#2e3040',
        'inverse-on-surface': '#e8eaf0',
        tertiary: '#7c3aed',
        'on-tertiary-container': '#3b1f63',
        'on-tertiary-fixed-variant': '#5b21b6',
        'on-tertiary': '#ffffff',
        'on-error-container': '#991b1b',
        secondary: '#6c6e7e',
        'secondary-fixed': '#d8dae6',
        'tertiary-fixed-dim': '#c4b5fd',
        'on-primary-container': '#e0e2ff',
        'primary-container': '#818cf8',
        'error-container': '#fee2e2',
        'tertiary-fixed': '#ede9fe',
        'on-primary-fixed': '#1e1b4b',
        'on-secondary-container': '#585a68',
        'on-secondary-fixed': '#1a1b26',
        'inverse-primary': '#a5b4fc',
        'on-error': '#ffffff',
        'inverse-surface': '#2e3040',
        'on-primary-fixed-variant': '#4338ca',
        'primary-fixed': '#e0e2ff',
        'on-primary': '#ffffff',
        'on-secondary': '#ffffff',
        'on-secondary-fixed-variant': '#404252',
        'surface-dim': '#d4d6dc',
        error: '#dc2626',
        outline: '#8a8c9a',
        'primary-fixed-dim': '#a5b4fc',
        'surface-tint': '#6366f1',
        'surface-container-low': '#e5e7ed',
        surface: '#e8eaf0',
        'on-background': '#2e3040',
        // ── Orijinalin kullandığı Tailwind v4 varsayılan renkleri (v3'ten farklı) ──
        red: {
          200: 'oklch(88.5% 0.062 18.334 / <alpha-value>)',
          700: 'oklch(50.5% 0.213 27.518 / <alpha-value>)',
          900: 'oklch(39.6% 0.141 25.723 / <alpha-value>)',
        },
        amber: {
          500: 'oklch(76.9% 0.188 70.08 / <alpha-value>)',
          600: 'oklch(66.6% 0.179 58.318 / <alpha-value>)',
          700: 'oklch(55.5% 0.163 48.998 / <alpha-value>)',
          800: 'oklch(47.3% 0.137 46.201 / <alpha-value>)',
        },
        yellow: {
          200: 'oklch(94.5% 0.129 101.54 / <alpha-value>)',
          500: 'oklch(79.5% 0.184 86.047 / <alpha-value>)',
          700: 'oklch(55.4% 0.135 66.442 / <alpha-value>)',
          900: 'oklch(42.1% 0.095 57.708 / <alpha-value>)',
        },
        green: {
          200: 'oklch(92.5% 0.084 155.995 / <alpha-value>)',
          700: 'oklch(52.7% 0.154 150.069 / <alpha-value>)',
          900: 'oklch(39.3% 0.095 152.535 / <alpha-value>)',
        },
        emerald: {
          500: 'oklch(69.6% 0.17 162.48 / <alpha-value>)',
          600: 'oklch(59.6% 0.145 163.225 / <alpha-value>)',
          700: 'oklch(50.8% 0.118 165.612 / <alpha-value>)',
        },
        indigo: {
          200: 'oklch(87% 0.065 274.039 / <alpha-value>)',
          700: 'oklch(45.7% 0.24 277.023 / <alpha-value>)',
          900: 'oklch(35.9% 0.144 278.697 / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};
