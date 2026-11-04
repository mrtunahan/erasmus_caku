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
        // ── TTO Otomasyonu "Stitch" paleti — Offline Asistan'ın giriş sonrası
        // paletine uyarlandı: #105BFF mavi · #FE8500 turuncu (tertiary,
        // metinde koyu ton #A65300) · #F0F0F0 zemin. Token adları aynı. ──
        'surface-bright': '#F7F7F7',
        'tertiary-container': '#FFB061',
        'surface-variant': '#E2E2E2',
        'secondary-fixed-dim': '#C4C6CC',
        'surface-container-high': '#E2E2E2',
        'surface-container-lowest': '#F7F7F7',
        'secondary-container': '#DDDFE3',
        'surface-container': '#E8E8E8',
        'on-tertiary-fixed': '#3D1F00',
        background: '#F0F0F0',
        'on-surface-variant': '#5F6368',
        primary: '#105BFF',
        'surface-container-highest': '#DCDCDC',
        'outline-variant': '#D5D5D5',
        'on-surface': '#1F2329',
        'inverse-on-surface': '#F0F0F0',
        tertiary: '#A65300',
        'on-tertiary-container': '#4A2600',
        'on-tertiary-fixed-variant': '#7A3E00',
        'on-tertiary': '#ffffff',
        'on-error-container': '#991b1b',
        secondary: '#6B6F76',
        'secondary-fixed': '#DDDFE3',
        'tertiary-fixed-dim': '#FFC48A',
        'on-primary-container': '#E7EFFF',
        'primary-container': '#4D84FF',
        'error-container': '#fee2e2',
        'tertiary-fixed': '#FFF1E3',
        'on-primary-fixed': '#061A45',
        'on-secondary-container': '#5F6368',
        'on-secondary-fixed': '#1A1C20',
        'inverse-primary': '#9DBCFF',
        'on-error': '#ffffff',
        'inverse-surface': '#1F2329',
        'on-primary-fixed-variant': '#0A47D1',
        'primary-fixed': '#E7EFFF',
        'on-primary': '#ffffff',
        'on-secondary': '#ffffff',
        'on-secondary-fixed-variant': '#43474E',
        'surface-dim': '#D9D9D9',
        error: '#dc2626',
        outline: '#8E9299',
        'primary-fixed-dim': '#9DBCFF',
        'surface-tint': '#105BFF',
        'surface-container-low': '#EBEBEB',
        surface: '#F0F0F0',
        'on-background': '#1F2329',
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
