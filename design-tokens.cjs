// ══════════════════════════════════════════════════════════════
// Tek Kaynak (Single Source of Truth) — Tasarım Tokenları
// ──────────────────────────────────────────────────────────────
// GERÇEK KAYNAK: design-tokens.json — hem bu CJS sarmalayıcı
// (tailwind.config.js require eder) hem de shared-components.jsx
// (Vite JSON import) aynı JSON'u okur. Vite dev sunucusu kaynak
// .cjs dosyalarını dönüştürmediği için token'lar JSON'a taşındı;
// değişiklikleri design-tokens.json üzerinde yapın.
// ══════════════════════════════════════════════════════════════
module.exports = require('./design-tokens.json');
