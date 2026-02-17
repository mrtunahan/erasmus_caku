// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Öğrenci Portalı
// Yardımlaşma, eğlence ve bilgi paylaşımı modülü
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// Tema + animasyonlar inject
(function () {
  if (!document.getElementById("portal-daisy-style")) {
    var s = document.createElement("style");
    s.id = "portal-daisy-style";
    s.textContent =
      "@keyframes fadeInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}" +
      "@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}" +
      "@keyframes fadeOutDown{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(20px)}}" +
      "@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}" +
      "@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}" +
      ".portal-bg{background:linear-gradient(135deg,#FFFDF7 0%,#FFF9E6 30%,#FFF4CC 70%,#FFFDF7 100%);position:relative;min-height:100vh;}" +
      ".portal-bg::before{content:'';position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:0;" +
      "background:" +
      "radial-gradient(ellipse 120px 120px at 10% 15%,rgba(255,215,0,0.12) 0%,transparent 70%)," +
      "radial-gradient(ellipse 100px 100px at 85% 20%,rgba(255,193,7,0.10) 0%,transparent 70%)," +
      "radial-gradient(ellipse 80px 80px at 20% 80%,rgba(255,235,59,0.08) 0%,transparent 70%)," +
      "radial-gradient(ellipse 90px 90px at 75% 75%,rgba(255,215,0,0.10) 0%,transparent 70%)," +
      "radial-gradient(ellipse 60px 60px at 50% 50%,rgba(255,193,7,0.06) 0%,transparent 70%);}" +
      ".daisy-card{background:rgba(255,255,255,0.92);backdrop-filter:blur(8px);border:1px solid rgba(255,215,0,0.18);border-radius:16px;box-shadow:0 2px 16px rgba(255,193,7,0.08);transition:box-shadow 0.25s,transform 0.25s;}" +
      ".daisy-card:hover{box-shadow:0 6px 24px rgba(255,193,7,0.15);transform:translateY(-1px);}" +
      ".daisy-btn{background:linear-gradient(135deg,#F59E0B,#D97706);color:white;border:none;border-radius:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(245,158,11,0.3);transition:all 0.2s;}" +
      ".daisy-btn:hover{box-shadow:0 6px 20px rgba(245,158,11,0.4);transform:translateY(-1px);}" +
      ".portal-wrap{position:relative;z-index:1;}" +
      ".ql-toolbar.ql-snow{border:none !important;border-bottom:1px solid rgba(255,215,0,0.25) !important;background:linear-gradient(135deg,#FFFDF7,#FFF9E6) !important;border-radius:10px 10px 0 0 !important;padding:8px 12px !important;font-family:'Source Sans 3','Inter',sans-serif !important;flex-wrap:wrap !important;}" +
      ".ql-container.ql-snow{border:none !important;font-family:'Source Sans 3','Inter',sans-serif !important;font-size:14px !important;}" +
      ".ql-editor{min-height:150px !important;line-height:1.7 !important;color:#2C2C2C !important;padding:12px 16px !important;}" +
      ".ql-editor.ql-blank::before{color:#6B7280 !important;font-style:normal !important;font-size:14px !important;}" +
      ".ql-snow .ql-stroke{stroke:#1B2A4A !important;}" +
      ".ql-snow .ql-fill,.ql-snow .ql-stroke.ql-fill{fill:#1B2A4A !important;}" +
      ".ql-snow .ql-picker-label{color:#1B2A4A !important;}" +
      ".ql-snow .ql-active .ql-stroke,.ql-snow button:hover .ql-stroke{stroke:#F59E0B !important;}" +
      ".ql-snow .ql-active .ql-fill,.ql-snow button:hover .ql-fill{fill:#F59E0B !important;}" +
      ".ql-snow .ql-active{color:#F59E0B !important;}" +
      ".ql-snow button:hover,.ql-snow .ql-picker-label:hover{color:#F59E0B !important;}" +
      ".ql-snow .ql-picker-options{border-radius:8px !important;box-shadow:0 4px 16px rgba(0,0,0,0.12) !important;border:1px solid #E5E1D8 !important;}" +
      ".ql-editor img{max-width:100% !important;border-radius:8px !important;margin:8px 0 !important;}" +
      ".ql-editor blockquote{border-left:4px solid #F59E0B !important;padding-left:12px !important;color:#6B7280 !important;}" +
      ".ql-editor pre.ql-syntax{background:#1B2A4A !important;color:#FEF3C7 !important;border-radius:8px !important;padding:12px 16px !important;font-family:'JetBrains Mono',monospace !important;}" +
      ".portal-post-content img{max-width:100%;border-radius:8px;margin:8px 0;}" +
      ".portal-post-content blockquote{border-left:4px solid #F59E0B;padding-left:12px;color:#6B7280;margin:8px 0;}" +
      ".portal-post-content pre{background:#1B2A4A;color:#FEF3C7;border-radius:8px;padding:12px 16px;font-family:'JetBrains Mono',monospace;overflow-x:auto;}" +
      ".portal-post-content a{color:#3B82F6;text-decoration:underline;}" +
      ".portal-post-content .mention-tag{background:linear-gradient(135deg,#DBEAFE,#EFF6FF);color:#2563EB;padding:1px 6px;border-radius:4px;font-weight:600;font-size:0.95em;cursor:pointer;border:1px solid rgba(37,99,235,0.15);}" +
      ".portal-post-content ul,.portal-post-content ol{padding-left:24px;margin:4px 0;}" +
      ".portal-post-content h2{font-size:18px;font-weight:700;color:#1B2A4A;margin:12px 0 6px;}" +
      ".portal-post-content h3{font-size:16px;font-weight:600;color:#1B2A4A;margin:10px 0 4px;}" +
      ".portal-post-content p{margin:4px 0;}";
    document.head.appendChild(s);
  }
})();

// ── Shared bileşenlerden import ──
const PC = window.C;
const PCard = window.Card;
const PBtn = window.Btn;
const PInput = window.Input;
const PModal = window.Modal;
const PBadge = window.Badge;

// ── Daisy Tema Renkleri ──
const DY = {
  gold: "#F59E0B", goldDark: "#D97706", goldLight: "#FEF3C7", goldBorder: "rgba(255,215,0,0.25)",
  warm: "#92400E", warmLight: "#FFFBEB", cream: "#FFFDF7",
  accent: "#B45309", accentLight: "#FDE68A",
};

// ══════════════════════════════════════════════════════════════
// SVG İKON YARDIMCILARI
// ══════════════════════════════════════════════════════════════
var SvgIcon = function ({ path, size, color, fill, strokeW }) {
  return React.createElement("svg", {
    width: size || 16, height: size || 16, viewBox: "0 0 24 24",
    fill: fill || "none", stroke: color || "currentColor", strokeWidth: strokeW || 2,
    strokeLinecap: "round", strokeLinejoin: "round",
    style: { flexShrink: 0 }
  }, React.createElement("path", { d: path }));
};

var ICONS = {
  question: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5a2 2 0 0 1 2-2h14v14H6.5A2.5 2.5 0 0 0 4 19.5z",
  megaphone: "M3 11l18-5v12L3 13v-2zM11.6 16.8a3 3 0 1 1-5.8-1.6",
  calendar: "M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  barChart: "M18 20V10M12 20V4M6 20v-6",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  star: "M12 2l2.09 6.26L21 9.27l-5 3.14L17.18 22 12 17.77 6.82 22 8 12.41l-5-3.14 6.91-1.01L12 2z",
  pin: "M12 2l2.09 6.26L21 9.27l-5 3.14L17.18 22 12 17.77 6.82 22 8 12.41l-5-3.14 6.91-1.01L12 2z",
  bookmark: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
  share: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13",
  search: "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM21 21l-4.35-4.35",
  bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  heart: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  image: "M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21",
  flag: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2",
  trending: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
  daisy: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 2.09 3 4.5S13.66 14 12 14s-3-2.59-3-4.5S10.34 5 12 5z",
  chevronUp: "M18 15l-6-6-6 6",
  chevronDown: "M6 9l6 6 6-6",
};

// ══════════════════════════════════════════════════════════════
// SABİTLER
// ══════════════════════════════════════════════════════════════

const PORTAL_CATEGORIES = [
  { id: "soru", label: "Soru-Cevap", icon: "question", color: "#3B82F6", bg: "#DBEAFE" },
  { id: "not", label: "Not Paylaşımı", icon: "book", color: "#8B5CF6", bg: "#EDE9FE" },
  { id: "duyuru", label: "Duyuru", icon: "megaphone", color: "#EF4444", bg: "#FEE2E2" },
  { id: "etkinlik", label: "Etkinlik", icon: "calendar", color: "#F59E0B", bg: "#FEF3C7" },
  { id: "kaynak", label: "Kaynak", icon: "link", color: "#10B981", bg: "#D1FAE5" },
  { id: "sohbet", label: "Sohbet", icon: "chat", color: "#EC4899", bg: "#FCE7F3" },
  { id: "anket", label: "Anket", icon: "barChart", color: "#6366F1", bg: "#E0E7FF" },
];

const REACTION_TYPES = [
  { id: "like", emoji: "\uD83D\uDC4D", label: "Beğeni" },
  { id: "love", emoji: "\u2764\uFE0F", label: "Sevgi" },
  { id: "clap", emoji: "\uD83D\uDC4F", label: "Alkış" },
  { id: "thanks", emoji: "\uD83D\uDE4F", label: "Teşekkür" },
  { id: "question", emoji: "\u2753", label: "Soru" },
  { id: "haha", emoji: "\uD83D\uDE04", label: "Komik" },
  { id: "wow", emoji: "\uD83D\uDE2E", label: "Şaşkın" },
  { id: "fire", emoji: "\uD83D\uDD25", label: "Ateş" },
  { id: "idea", emoji: "\uD83D\uDCA1", label: "Fikir" },
  { id: "hundred", emoji: "\uD83D\uDCAF", label: "Mükemmel" },
];

const SINIF_TAGS = ["1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf", "Yüksek Lisans", "Genel"];

const REPORT_REASONS = [
  "Uygunsuz içerik",
  "Spam / Reklam",
  "Yanıltıcı bilgi",
  "Hakaret / Küfür",
  "Diğer",
];

const POPULAR_COURSES = [
  "BIL101", "BIL201", "BIL301", "BIL305", "BIL401",
  "MAT101", "MAT165", "MAT201", "FIZ101", "FIZ102",
  "ING101", "ING102", "TUR101", "ATA101", "MDB101",
];

const FILE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const POSTS_PER_PAGE = 15;

// ── Rozet Tanımları ──
const BADGES = [
  { id: "yeni_uye", emoji: "\uD83C\uDF31", label: "Yeni Üye", desc: "İlk gönderiyi paylaştı", check: function (s) { return s.postCount >= 1; } },
  { id: "aktif_katilimci", emoji: "\uD83D\uDCAC", label: "Aktif Katılımcı", desc: "10 yorum yaptı", check: function (s) { return s.commentCount >= 10; } },
  { id: "yardimsever", emoji: "\u2B50", label: "Yardımsever", desc: "5 'En İyi Cevap' aldı", check: function (s) { return s.bestAnswerCount >= 5; } },
  { id: "not_paylasimci", emoji: "\uD83D\uDCDA", label: "Not Paylaşımcısı", desc: "10 not paylaşımı yaptı", check: function (s) { return s.noteCount >= 10; } },
  { id: "topluluk_lideri", emoji: "\uD83C\uDFC6", label: "Topluluk Lideri", desc: "100+ oy puanı kazandı", check: function (s) { return s.totalVoteScore >= 100; } },
  { id: "ilk_adim", emoji: "\uD83D\uDC63", label: "İlk Adım", desc: "İlk yorumu yaptı", check: function (s) { return s.commentCount >= 1; } },
  { id: "populer", emoji: "\uD83D\uDD25", label: "Popüler", desc: "50+ tepki aldı", check: function (s) { return s.totalReactions >= 50; } },
  { id: "soru_soran", emoji: "\u2753", label: "Meraklı", desc: "5 soru sordu", check: function (s) { return s.questionCount >= 5; } },
  { id: "oylayici", emoji: "\uD83D\uDDF3\uFE0F", label: "Demokrat", desc: "20+ oy verdi", check: function (s) { return s.votesGiven >= 20; } },
  { id: "usta", emoji: "\uD83C\uDF1F", label: "Usta Paylaşımcı", desc: "25 gönderi paylaştı", check: function (s) { return s.postCount >= 25; } },
];

// ── Seviye Sistemi ──
const LEVELS = [
  { level: 1, label: "Çaylak", minXP: 0, color: "#9CA3AF" },
  { level: 2, label: "Öğrenci", minXP: 50, color: "#60A5FA" },
  { level: 3, label: "Aktif Üye", minXP: 150, color: "#34D399" },
  { level: 4, label: "Katkıcı", minXP: 350, color: "#A78BFA" },
  { level: 5, label: "Uzman", minXP: 700, color: "#F59E0B" },
  { level: 6, label: "Lider", minXP: 1200, color: "#F97316" },
  { level: 7, label: "Efsane", minXP: 2000, color: "#EF4444" },
];

const BOLUMLER = [
  "Bilgisayar Mühendisliği",
  "Elektrik-Elektronik Mühendisliği",
  "Makine Mühendisliği",
  "İnşaat Mühendisliği",
  "Endüstri Mühendisliği",
  "Gıda Mühendisliği",
  "İşletme",
  "İktisat",
  "Hukuk",
  "Tıp",
  "Diğer",
];

// ── Puan Hesaplama Fonksiyonları ──
function calculateUserStats(userId, posts, allComments) {
  var userPosts = posts.filter(function (p) { return p.authorId === userId; });
  var postCount = userPosts.length;
  var noteCount = userPosts.filter(function (p) { return p.category === "not"; }).length;
  var questionCount = userPosts.filter(function (p) { return p.category === "soru"; }).length;
  var totalReactions = 0;
  var totalVoteScore = 0;
  var bestAnswerCount = 0;
  var commentCount = 0;
  var votesGiven = 0;

  userPosts.forEach(function (p) {
    totalReactions += getReactionTotal(p.reactions);
    totalVoteScore += getVoteScore(p);
    if (p.bestAnswerId) bestAnswerCount++;
  });

  // Yorum sayısı — tüm gönderilerdeki yorumlardan hesapla
  posts.forEach(function (p) {
    commentCount += (p.commentCount || 0);
  });
  // Basitleştirilmiş: kullanıcının kendi gönderi sayısına göre oran tahmin
  commentCount = Math.round(commentCount * (postCount / Math.max(posts.length, 1)));

  // Verdiği oy sayısı
  posts.forEach(function (p) {
    if ((p.upvotes || []).indexOf(userId) >= 0) votesGiven++;
    if ((p.downvotes || []).indexOf(userId) >= 0) votesGiven++;
  });

  return {
    postCount: postCount,
    noteCount: noteCount,
    questionCount: questionCount,
    totalReactions: totalReactions,
    totalVoteScore: totalVoteScore,
    bestAnswerCount: bestAnswerCount,
    commentCount: commentCount,
    votesGiven: votesGiven,
  };
}

function calculateXP(stats) {
  return (stats.postCount * 10) +
    (stats.commentCount * 3) +
    (stats.totalReactions * 2) +
    (Math.max(0, stats.totalVoteScore) * 5) +
    (stats.bestAnswerCount * 20) +
    (stats.noteCount * 5);
}

function getUserLevel(xp) {
  var lvl = LEVELS[0];
  for (var i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) { lvl = LEVELS[i]; break; }
  }
  var nextLvl = LEVELS[LEVELS.indexOf(lvl) + 1] || null;
  var progress = nextLvl ? ((xp - lvl.minXP) / (nextLvl.minXP - lvl.minXP)) * 100 : 100;
  return { current: lvl, next: nextLvl, progress: Math.min(100, Math.max(0, progress)), xp: xp };
}

function getUserBadges(stats) {
  return BADGES.filter(function (b) { return b.check(stats); });
}

// ── Dosya Doğrulama ──
var ALLOWED_FILE_TYPES = {
  "image/jpeg": { ext: ".jpg", label: "JPEG Görsel" },
  "image/png": { ext: ".png", label: "PNG Görsel" },
  "image/gif": { ext: ".gif", label: "GIF Görsel" },
  "image/webp": { ext: ".webp", label: "WebP Görsel" },
  "application/pdf": { ext: ".pdf", label: "PDF Doküman" },
  "application/msword": { ext: ".doc", label: "Word Doküman" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: ".docx", label: "Word Doküman" },
  "application/vnd.ms-excel": { ext: ".xls", label: "Excel Tablosu" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: ".xlsx", label: "Excel Tablosu" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { ext: ".pptx", label: "PowerPoint Sunumu" },
  "text/plain": { ext: ".txt", label: "Metin Dosyası" },
};

function validateFile(file, isInlineImage) {
  var errors = [];
  if (!file) return { valid: false, errors: ["Dosya seçilmedi."] };

  if (file.size > FILE_MAX_SIZE) {
    errors.push("Dosya boyutu 5MB'dan büyük olamaz. Seçilen dosya: " + (file.size / (1024 * 1024)).toFixed(1) + "MB");
  }

  if (file.size === 0) {
    errors.push("Dosya boş görünüyor.");
  }

  if (isInlineImage) {
    if (!file.type.startsWith("image/")) {
      errors.push("Editöre sadece görsel dosyaları yüklenebilir. Seçilen dosya türü: " + (file.type || "bilinmiyor"));
    }
  } else {
    if (!ALLOWED_FILE_TYPES[file.type]) {
      var allowedExts = Object.values(ALLOWED_FILE_TYPES).map(function (t) { return t.ext; }).join(", ");
      errors.push("Desteklenmeyen dosya türü: " + (file.type || "bilinmiyor") + ". İzin verilen türler: " + allowedExts);
    }
  }

  return { valid: errors.length === 0, errors: errors };
}

function isHtmlEmpty(html) {
  if (!html) return true;
  var tmp = document.createElement("div");
  tmp.innerHTML = html;
  var text = tmp.textContent || tmp.innerText || "";
  return !text.trim();
}

function sanitizeHtml(html) {
  if (!html) return "";
  if (typeof DOMPurify !== "undefined") {
    return DOMPurify.sanitize(html, { ADD_TAGS: ["iframe"], ADD_ATTR: ["target"] });
  }
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s*on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s*on\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript\s*:/gi, "");
}

function truncateHtml(html, maxTextLen) {
  var div = document.createElement("div");
  div.innerHTML = html;
  var text = div.textContent || div.innerText || "";
  if (text.length <= maxTextLen) return html;
  var count = 0;
  var truncated = false;
  function walk(node) {
    if (truncated) {
      if (node.parentNode) node.parentNode.removeChild(node);
      return;
    }
    if (node.nodeType === 3) {
      var remaining = maxTextLen - count;
      if (node.textContent.length > remaining) {
        node.textContent = node.textContent.substring(0, remaining) + "...";
        truncated = true;
      }
      count += node.textContent.length;
    } else if (node.nodeType === 1) {
      var children = Array.from(node.childNodes);
      children.forEach(walk);
    }
  }
  walk(div);
  return div.innerHTML;
}

function stripHtmlTags(html) {
  return (html || "").replace(/<[^>]*>/g, "");
}

// ── Etiket (Tag) Yardımcıları ──
var COURSE_CODE_REGEX = /^[A-ZÇĞİÖŞÜa-zçğıöşü]{2,5}\d{3,4}$/;

function extractTags(text) {
  if (!text) return [];
  var plain = stripHtmlTags(text);
  var matches = plain.match(/#[A-Za-zÇĞİÖŞÜçğıöşü0-9_]+/g);
  return matches ? matches.map(function (t) { return t.substring(1); }).filter(function (t) { return t.length > 1; }) : [];
}

function isCourseCode(tag) {
  return COURSE_CODE_REGEX.test(tag);
}

function getAllTags(posts) {
  var tagCount = {};
  posts.forEach(function (p) {
    var tags = p.tags || [];
    tags.forEach(function (t) {
      tagCount[t] = (tagCount[t] || 0) + 1;
    });
    if (p.courseCode) {
      tagCount[p.courseCode] = (tagCount[p.courseCode] || 0) + 1;
    }
  });
  return tagCount;
}

function highlightText(text, query) {
  if (!query || !text) return text;
  var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var parts = text.split(new RegExp("(" + escaped + ")", "gi"));
  return parts.map(function (part, i) {
    if (part.toLowerCase() === query.toLowerCase()) {
      return React.createElement("mark", {
        key: i,
        style: { background: DY.goldLight, color: DY.warm, padding: "1px 2px", borderRadius: 2 }
      }, part);
    }
    return part;
  });
}

// ══════════════════════════════════════════════════════════════
// FIREBASE CRUD
// ══════════════════════════════════════════════════════════════

var PortalDB = {
  postsRef: function () {
    return window.FirebaseDB.db() ? window.FirebaseDB.db().collection("portal_posts") : null;
  },
  commentsRef: function (postId) {
    return window.FirebaseDB.db() ? window.FirebaseDB.db().collection("portal_posts").doc(String(postId)).collection("comments") : null;
  },

  // Gönderiler
  async createPost(post) {
    var ref = this.postsRef();
    if (!ref) throw new Error("Firebase bağlantısı yok");
    var docRef = await ref.add(Object.assign({}, post, {
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      reactions: {},
      upvotes: [],
      downvotes: [],
      voteScore: 0,
      commentCount: 0,
      views: 0,
      pinned: false,
    }));
    return Object.assign({}, post, { id: docRef.id });
  },

  async fetchPosts(category, limit) {
    var ref = this.postsRef();
    if (!ref) return [];
    var query = ref.orderBy("createdAt", "desc");
    if (category && category !== "tumu") {
      query = query.where("category", "==", category);
    }
    if (limit) query = query.limit(limit);
    var snapshot = await query.get();
    return snapshot.docs.map(function (doc) {
      return Object.assign({}, doc.data(), { id: doc.id });
    });
  },

  async updatePost(id, data) {
    var ref = this.postsRef();
    if (!ref) throw new Error("Firebase bağlantısı yok");
    await ref.doc(String(id)).update(data);
  },

  async deletePost(id) {
    var ref = this.postsRef();
    if (!ref) throw new Error("Firebase bağlantısı yok");
    await ref.doc(String(id)).delete();
  },

  async toggleReaction(postId, reactionType, userId) {
    var ref = this.postsRef();
    if (!ref) return;
    var docRef = ref.doc(String(postId));
    var doc = await docRef.get();
    if (!doc.exists) return;
    var data = doc.data();
    var reactions = data.reactions || {};
    var reactionList = reactions[reactionType] || [];
    var idx = reactionList.indexOf(userId);
    if (idx >= 0) {
      reactionList.splice(idx, 1);
    } else {
      reactionList.push(userId);
    }
    reactions[reactionType] = reactionList;
    await docRef.update({ reactions: reactions });
    return reactions;
  },

  // Yukarı/Aşağı Oy (Stack Overflow modeli)
  async toggleVote(postId, voteType, userId) {
    var ref = this.postsRef();
    if (!ref) return;
    var docRef = ref.doc(String(postId));
    var doc = await docRef.get();
    if (!doc.exists) return;
    var data = doc.data();
    var upvotes = data.upvotes || [];
    var downvotes = data.downvotes || [];
    var upIdx = upvotes.indexOf(userId);
    var downIdx = downvotes.indexOf(userId);

    if (voteType === "up") {
      if (upIdx >= 0) {
        // Zaten yukarı oy verdiyse, geri al
        upvotes.splice(upIdx, 1);
      } else {
        // Aşağı oyu varsa kaldır, yukarı oy ekle
        if (downIdx >= 0) downvotes.splice(downIdx, 1);
        upvotes.push(userId);
      }
    } else if (voteType === "down") {
      if (downIdx >= 0) {
        // Zaten aşağı oy verdiyse, geri al
        downvotes.splice(downIdx, 1);
      } else {
        // Yukarı oyu varsa kaldır, aşağı oy ekle
        if (upIdx >= 0) upvotes.splice(upIdx, 1);
        downvotes.push(userId);
      }
    }

    var voteScore = upvotes.length - downvotes.length;
    await docRef.update({ upvotes: upvotes, downvotes: downvotes, voteScore: voteScore });
    return { upvotes: upvotes, downvotes: downvotes, voteScore: voteScore };
  },

  // Yorumlar
  async addComment(postId, comment) {
    var ref = this.commentsRef(postId);
    if (!ref) throw new Error("Firebase bağlantısı yok");
    var docRef = await ref.add(Object.assign({}, comment, {
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      likes: [],
    }));
    // Yorum sayısını artır
    var postRef = this.postsRef().doc(String(postId));
    await postRef.update({
      commentCount: window.firebase.firestore.FieldValue.increment(1),
    });
    return Object.assign({}, comment, { id: docRef.id });
  },

  async fetchComments(postId) {
    var ref = this.commentsRef(postId);
    if (!ref) return [];
    var snapshot = await ref.orderBy("createdAt", "asc").get();
    return snapshot.docs.map(function (doc) {
      return Object.assign({}, doc.data(), { id: doc.id });
    });
  },

  async updateComment(postId, commentId, data) {
    var ref = this.commentsRef(postId);
    if (!ref) throw new Error("Firebase bağlantısı yok");
    await ref.doc(String(commentId)).update(data);
  },

  async deleteComment(postId, commentId) {
    var ref = this.commentsRef(postId);
    if (!ref) throw new Error("Firebase bağlantısı yok");
    // Alt yorumları da sil
    var children = await ref.where("parentId", "==", commentId).get();
    var deleteCount = 1;
    var batch = window.FirebaseDB.db().batch();
    children.docs.forEach(function (doc) {
      batch.delete(doc.ref);
      deleteCount++;
    });
    batch.delete(ref.doc(String(commentId)));
    await batch.commit();
    // Yorum sayısını azalt
    var postRef = this.postsRef().doc(String(postId));
    await postRef.update({
      commentCount: window.firebase.firestore.FieldValue.increment(-deleteCount),
    });
    return deleteCount;
  },

  async toggleCommentLike(postId, commentId, userId) {
    var ref = this.commentsRef(postId);
    if (!ref) return [];
    var docRef = ref.doc(String(commentId));
    var doc = await docRef.get();
    if (!doc.exists) return [];
    var data = doc.data();
    var likes = data.likes || [];
    var idx = likes.indexOf(userId);
    if (idx >= 0) {
      likes.splice(idx, 1);
    } else {
      likes.push(userId);
    }
    await docRef.update({ likes: likes });
    return likes;
  },

  // En iyi cevap işaretleme
  async markBestAnswer(postId, commentId) {
    var postRef = this.postsRef().doc(String(postId));
    var doc = await postRef.get();
    if (!doc.exists) return null;
    var data = doc.data();
    var newBestAnswer = data.bestAnswerId === commentId ? null : commentId;
    await postRef.update({ bestAnswerId: newBestAnswer });
    return newBestAnswer;
  },

  // Anket oyu
  async votePoll(postId, optionIndex, userId) {
    var ref = this.postsRef();
    if (!ref) return;
    var docRef = ref.doc(String(postId));
    var doc = await docRef.get();
    if (!doc.exists) return;
    var data = doc.data();
    var pollVotes = data.pollVotes || {};
    // Önceki oyu kaldır
    Object.keys(pollVotes).forEach(function (key) {
      var voters = pollVotes[key] || [];
      var idx = voters.indexOf(userId);
      if (idx >= 0) voters.splice(idx, 1);
      pollVotes[key] = voters;
    });
    // Yeni oy
    var key = String(optionIndex);
    if (!pollVotes[key]) pollVotes[key] = [];
    pollVotes[key].push(userId);
    await docRef.update({ pollVotes: pollVotes });
    return pollVotes;
  },

  // Görüntülenme artır
  async incrementViews(postId) {
    var ref = this.postsRef();
    if (!ref) return;
    await ref.doc(String(postId)).update({
      views: window.firebase.firestore.FieldValue.increment(1),
    });
  },

  // ── Dosya Yükleme (Firebase Storage) ──
  async uploadFile(file) {
    var storage = window.firebase.storage();
    var ext = file.name.split(".").pop();
    var filename = "portal_files/" + Date.now() + "_" + Math.random().toString(36).substr(2) + "." + ext;
    var ref = storage.ref(filename);
    await ref.put(file);
    var url = await ref.getDownloadURL();
    return { url: url, name: file.name, type: file.type, size: file.size };
  },

  // ── Bildirimler ──
  notificationsRef: function (userId) {
    return window.FirebaseDB.db() ? window.FirebaseDB.db().collection("portal_notifications").doc(String(userId)).collection("items") : null;
  },

  async addNotification(targetUserId, notification) {
    var ref = this.notificationsRef(targetUserId);
    if (!ref) return;
    await ref.add(Object.assign({}, notification, {
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      read: false,
    }));
  },

  async fetchNotifications(userId, limit) {
    var ref = this.notificationsRef(userId);
    if (!ref) return [];
    var query = ref.orderBy("createdAt", "desc").limit(limit || 20);
    var snapshot = await query.get();
    return snapshot.docs.map(function (doc) {
      return Object.assign({}, doc.data(), { id: doc.id });
    });
  },

  async markNotificationRead(userId, notifId) {
    var ref = this.notificationsRef(userId);
    if (!ref) return;
    await ref.doc(String(notifId)).update({ read: true });
  },

  async markAllNotificationsRead(userId) {
    var ref = this.notificationsRef(userId);
    if (!ref) return;
    var snapshot = await ref.where("read", "==", false).get();
    var batch = window.FirebaseDB.db().batch();
    snapshot.docs.forEach(function (doc) { batch.update(doc.ref, { read: true }); });
    await batch.commit();
  },

  // ── Kullanıcı Profilleri ──
  profilesRef: function () {
    return window.FirebaseDB.db() ? window.FirebaseDB.db().collection("portal_profiles") : null;
  },

  async getProfile(userId) {
    var ref = this.profilesRef();
    if (!ref) return null;
    var doc = await ref.doc(String(userId)).get();
    return doc.exists ? doc.data() : null;
  },

  async updateProfile(userId, data) {
    var ref = this.profilesRef();
    if (!ref) return;
    await ref.doc(String(userId)).set(Object.assign({}, data, {
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    }), { merge: true });
  },

  // ── Takip Sistemi ──
  followsRef: function () {
    return window.FirebaseDB.db() ? window.FirebaseDB.db().collection("portal_follows") : null;
  },

  async getFollows(userId) {
    var ref = this.followsRef();
    if (!ref) return { users: [], tags: [] };
    var doc = await ref.doc(String(userId)).get();
    if (!doc.exists) return { users: [], tags: [] };
    var data = doc.data();
    return { users: data.users || [], tags: data.tags || [] };
  },

  async toggleFollowUser(currentUserId, targetUserId) {
    var ref = this.followsRef();
    if (!ref) return;
    var docRef = ref.doc(String(currentUserId));
    var doc = await docRef.get();
    var data = doc.exists ? doc.data() : {};
    var users = data.users || [];
    var idx = users.indexOf(targetUserId);
    if (idx >= 0) {
      users.splice(idx, 1);
    } else {
      users.push(targetUserId);
    }
    await docRef.set(Object.assign({}, data, { users: users }), { merge: true });
    return users;
  },

  async toggleFollowTag(currentUserId, tag) {
    var ref = this.followsRef();
    if (!ref) return;
    var docRef = ref.doc(String(currentUserId));
    var doc = await docRef.get();
    var data = doc.exists ? doc.data() : {};
    var tags = data.tags || [];
    var idx = tags.indexOf(tag);
    if (idx >= 0) {
      tags.splice(idx, 1);
    } else {
      tags.push(tag);
    }
    await docRef.set(Object.assign({}, data, { tags: tags }), { merge: true });
    return tags;
  },

  // ── Kullanıcı Listesi (Bahsetme için) ──
  async fetchAllUsers() {
    var ref = this.postsRef();
    if (!ref) return [];
    var snapshot = await ref.orderBy("createdAt", "desc").limit(200).get();
    var usersMap = {};
    snapshot.docs.forEach(function (doc) {
      var data = doc.data();
      if (data.authorId && data.authorName) {
        usersMap[data.authorId] = data.authorName;
      }
    });
    return Object.keys(usersMap).map(function (id) {
      return { id: id, name: usersMap[id] };
    });
  },

  // ── Raporlama ──
  reportsRef: function () {
    return window.FirebaseDB.db() ? window.FirebaseDB.db().collection("portal_reports") : null;
  },

  async reportPost(postId, reportData) {
    var ref = this.reportsRef();
    if (!ref) throw new Error("Firebase bağlantısı yok");
    await ref.add(Object.assign({}, reportData, {
      postId: postId,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      status: "pending",
    }));
  },

  async fetchReports() {
    var ref = this.reportsRef();
    if (!ref) return [];
    var snapshot = await ref.orderBy("createdAt", "desc").get();
    return snapshot.docs.map(function (doc) {
      return Object.assign({}, doc.data(), { id: doc.id });
    });
  },

  async resolveReport(reportId) {
    var ref = this.reportsRef();
    if (!ref) return;
    await ref.doc(String(reportId)).update({ status: "resolved" });
  },
};

// ══════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ══════════════════════════════════════════════════════════════

function timeAgo(timestamp) {
  if (!timestamp) return "";
  var date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  var now = new Date();
  var diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "Az önce";
  if (diff < 3600) return Math.floor(diff / 60) + " dk önce";
  if (diff < 86400) return Math.floor(diff / 3600) + " saat önce";
  if (diff < 604800) return Math.floor(diff / 86400) + " gün önce";
  return date.toLocaleDateString("tr-TR");
}

function getCategoryInfo(catId) {
  return PORTAL_CATEGORIES.find(function (c) { return c.id === catId; }) || PORTAL_CATEGORIES[0];
}

function getReactionTotal(reactions) {
  if (!reactions) return 0;
  var total = 0;
  Object.values(reactions).forEach(function (arr) { total += (arr || []).length; });
  return total;
}

function getVoteScore(post) {
  return (post.voteScore || 0) || ((post.upvotes || []).length - (post.downvotes || []).length);
}

// ── Mention Yardımcıları ──
function extractMentions(html) {
  if (!html) return [];
  var plain = stripHtmlTags(html);
  var matches = plain.match(/@[A-Za-zÇĞİÖŞÜçğıöşü\s]+(?=[^A-Za-zÇĞİÖŞÜçğıöşü]|$)/g);
  if (!matches) return [];
  return matches.map(function (m) { return m.substring(1).trim(); }).filter(function (m) { return m.length > 1; });
}

function renderMentions(html) {
  if (!html) return html;
  return html.replace(/@([A-Za-zÇĞİÖŞÜçğıöşü\s]{2,}?)(?=[\s<.,;:!?)}\]&]|$)/g,
    '<span class="mention-tag">@$1</span>'
  );
}

function getUserId(currentUser) {
  return currentUser ? (currentUser.email || currentUser.name || "anon") : "anon";
}

// Basit avatar oluştur
function getInitials(name) {
  if (!name) return "?";
  var parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function hashColor(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  var colors = ["#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B", "#10B981", "#6366F1", "#14B8A6"];
  return colors[Math.abs(hash) % colors.length];
}

// ── Responsive Hook ──
function useIsMobile(breakpoint) {
  var bp = breakpoint || 768;
  const [isMobile, setIsMobile] = useState(function () {
    return typeof window !== "undefined" ? window.innerWidth < bp : false;
  });
  useEffect(function () {
    var handler = function () { setIsMobile(window.innerWidth < bp); };
    window.addEventListener("resize", handler);
    return function () { window.removeEventListener("resize", handler); };
  }, [bp]);
  return isMobile;
}

// ── Scroll-to-top Hook ──
function useScrollTop(threshold) {
  var th = threshold || 400;
  const [visible, setVisible] = useState(false);
  useEffect(function () {
    var handler = function () { setVisible(window.scrollY > th); };
    window.addEventListener("scroll", handler, { passive: true });
    return function () { window.removeEventListener("scroll", handler); };
  }, [th]);
  return visible;
}

// ══════════════════════════════════════════════════════════════
// UI BİLEŞENLERİ
// ══════════════════════════════════════════════════════════════

// ── Avatar ──
const Avatar = ({ name, size }) => {
  var s = size || 40;
  var initials = getInitials(name);
  var bg = hashColor(name || "");
  return (
    <div style={{
      width: s, height: s, borderRadius: "50%",
      background: "linear-gradient(135deg, " + bg + ", " + bg + "CC)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "white", fontSize: s * 0.38, fontWeight: 700,
      flexShrink: 0, boxShadow: "0 2px 8px " + bg + "40",
    }}>{initials}</div>
  );
};

// ── Kategori Badge ──
const CategoryBadge = ({ category, small }) => {
  var cat = getCategoryInfo(category);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: small ? "3px 10px" : "5px 14px",
      borderRadius: 20, fontSize: small ? 11 : 12,
      fontWeight: 600, color: cat.color, background: cat.bg,
      transition: "all 0.15s",
    }}>
      <SvgIcon path={ICONS[cat.icon]} size={small ? 12 : 14} color={cat.color} />
      {cat.label}
    </span>
  );
};

// ── Oy Widget (Stack Overflow modeli) ──
const VoteWidget = ({ post, userId, onVote }) => {
  var upvotes = post.upvotes || [];
  var downvotes = post.downvotes || [];
  var score = getVoteScore(post);
  var userUpvoted = upvotes.indexOf(userId) >= 0;
  var userDownvoted = downvotes.indexOf(userId) >= 0;

  return (
    <div className="vote-widget" style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 2, minWidth: 44, userSelect: "none",
    }}>
      <button
        onClick={function () { onVote(post.id, "up"); }}
        className={"vote-btn vote-up" + (userUpvoted ? " vote-active-up" : "")}
        title="Yukarı Oy"
        style={{
          width: 36, height: 36, border: "none", borderRadius: 8,
          background: userUpvoted ? "#DCFCE7" : "transparent",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
          color: userUpvoted ? "#16A34A" : PC.textMuted,
        }}
        onMouseEnter={function (e) { if (!userUpvoted) { e.currentTarget.style.background = "#F0FDF4"; e.currentTarget.style.color = "#16A34A"; } }}
        onMouseLeave={function (e) { if (!userUpvoted) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = PC.textMuted; } }}
      >
        <SvgIcon path={ICONS.chevronUp} size={22} color="currentColor" strokeW={userUpvoted ? 3 : 2} />
      </button>
      <span className="vote-score" style={{
        fontSize: 16, fontWeight: 800, lineHeight: 1.2,
        color: score > 0 ? "#16A34A" : score < 0 ? "#DC2626" : PC.navy,
        minWidth: 24, textAlign: "center",
      }}>{score}</span>
      <button
        onClick={function () { onVote(post.id, "down"); }}
        className={"vote-btn vote-down" + (userDownvoted ? " vote-active-down" : "")}
        title="Aşağı Oy"
        style={{
          width: 36, height: 36, border: "none", borderRadius: 8,
          background: userDownvoted ? "#FEE2E2" : "transparent",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
          color: userDownvoted ? "#DC2626" : PC.textMuted,
        }}
        onMouseEnter={function (e) { if (!userDownvoted) { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "#DC2626"; } }}
        onMouseLeave={function (e) { if (!userDownvoted) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = PC.textMuted; } }}
      >
        <SvgIcon path={ICONS.chevronDown} size={22} color="currentColor" strokeW={userDownvoted ? 3 : 2} />
      </button>
    </div>
  );
};

// ── Reaction Bar (Gelişmiş Emoji Tepkileri) ──
const ReactionBar = ({ reactions, postId, userId, onReact }) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  var totalCount = getReactionTotal(reactions);

  // Dışarı tıklanınca picker'ı kapat
  useEffect(function () {
    if (!showPicker) return;
    var handleClick = function (e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return function () { document.removeEventListener("mousedown", handleClick); };
  }, [showPicker]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative", flexWrap: "wrap" }}>
      <button
        onClick={function () { setShowPicker(!showPicker); }}
        className="reaction-trigger-btn"
        style={{
          padding: "6px 12px", border: "1px solid " + PC.border,
          borderRadius: 20, background: "white", cursor: "pointer",
          fontSize: 13, display: "flex", alignItems: "center", gap: 6,
          transition: "all 0.2s",
        }}
        onMouseEnter={function (e) { e.currentTarget.style.background = PC.bg; e.currentTarget.style.borderColor = DY.gold; }}
        onMouseLeave={function (e) { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = PC.border; }}
      >
        <span style={{ fontSize: 16 }}>{showPicker ? "\u2715" : "\u{1F600}"}</span>
        <span style={{ fontWeight: 500, color: PC.textMuted }}>Tepki</span>
        {totalCount > 0 && <span style={{ fontWeight: 700, color: PC.navy, background: PC.bg, padding: "1px 7px", borderRadius: 10, fontSize: 11 }}>{totalCount}</span>}
      </button>

      {/* Emoji Picker */}
      {showPicker && (
        <div ref={pickerRef} className="emoji-picker-popup" style={{
          position: "absolute", bottom: "100%", left: 0, marginBottom: 6,
          background: "white", borderRadius: 14, padding: "10px 8px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
          display: "flex", flexWrap: "wrap", gap: 4, zIndex: 100,
          border: "1px solid " + PC.border, maxWidth: 280,
          animation: "fadeInUp 0.15s ease-out",
        }}>
          {REACTION_TYPES.map(function (r) {
            var count = (reactions && reactions[r.id]) ? reactions[r.id].length : 0;
            var isActive = reactions && reactions[r.id] && reactions[r.id].indexOf(userId) >= 0;
            return (
              <button
                key={r.id}
                onClick={function () {
                  onReact(postId, r.id);
                  setShowPicker(false);
                }}
                title={r.label}
                className="emoji-picker-item"
                style={{
                  padding: "6px 8px", border: isActive ? "2px solid " + DY.gold : "1px solid transparent",
                  borderRadius: 10, background: isActive ? DY.goldLight : "transparent",
                  cursor: "pointer", fontSize: 22, display: "flex",
                  flexDirection: "column", alignItems: "center", gap: 2,
                  transition: "all 0.15s", position: "relative",
                }}
                onMouseEnter={function (e) { e.currentTarget.style.transform = "scale(1.25)"; e.currentTarget.style.background = PC.bg; }}
                onMouseLeave={function (e) { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = isActive ? DY.goldLight : "transparent"; }}
              >
                {r.emoji}
                {count > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: DY.warm }}>{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Mevcut reaksiyonlar (aktif olanlar) */}
      {reactions && Object.keys(reactions).map(function (key) {
        var arr = reactions[key] || [];
        if (arr.length === 0) return null;
        var r = REACTION_TYPES.find(function (rt) { return rt.id === key; });
        if (!r) return null;
        var isActive = arr.indexOf(userId) >= 0;
        return (
          <button
            key={key}
            onClick={function () { onReact(postId, key); }}
            title={r.label + " (" + arr.length + ")"}
            className={"reaction-chip" + (isActive ? " reaction-chip-active" : "")}
            style={{
              padding: "4px 10px", border: isActive ? "1.5px solid " + DY.gold : "1px solid " + PC.border,
              borderRadius: 16, background: isActive ? DY.goldLight : "white",
              cursor: "pointer", fontSize: 15, display: "flex",
              alignItems: "center", gap: 4, transition: "all 0.2s",
            }}
            onMouseEnter={function (e) { e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={function (e) { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {r.emoji} <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? DY.warm : PC.navy }}>{arr.length}</span>
          </button>
        );
      })}
    </div>
  );
};

// ── Anket Widget ──
const PollWidget = ({ pollOptions, pollVotes, postId, userId, onVote }) => {
  var totalVotes = 0;
  var userVotedIdx = -1;
  if (pollVotes) {
    Object.keys(pollVotes).forEach(function (key) {
      var arr = pollVotes[key] || [];
      totalVotes += arr.length;
      if (arr.indexOf(userId) >= 0) userVotedIdx = parseInt(key);
    });
  }
  var hasVoted = userVotedIdx >= 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
      {pollOptions.map(function (option, idx) {
        var voteCount = (pollVotes && pollVotes[String(idx)]) ? pollVotes[String(idx)].length : 0;
        var pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
        var isSelected = userVotedIdx === idx;

        return (
          <button
            key={idx}
            onClick={function () { onVote(postId, idx); }}
            style={{
              padding: "12px 16px", border: isSelected ? "2px solid " + PC.blue : "1px solid " + PC.border,
              borderRadius: 10, background: "white", cursor: "pointer",
              textAlign: "left", position: "relative", overflow: "hidden",
              transition: "all 0.2s",
            }}
            onMouseEnter={function (e) { if (!hasVoted) e.currentTarget.style.borderColor = PC.blue; }}
            onMouseLeave={function (e) { if (!isSelected) e.currentTarget.style.borderColor = PC.border; }}
          >
            {/* İlerleme çubuğu */}
            {hasVoted && (
              <div style={{
                position: "absolute", top: 0, left: 0, bottom: 0,
                width: pct + "%", background: isSelected ? PC.blueLight : PC.bg,
                transition: "width 0.5s ease",
                borderRadius: 8,
              }} />
            )}
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: isSelected ? 700 : 500, color: PC.navy }}>{option}</span>
              {hasVoted && (
                <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? PC.blue : PC.textMuted }}>
                  {pct}% <span style={{ fontWeight: 400, fontSize: 11 }}>({voteCount})</span>
                </span>
              )}
            </div>
          </button>
        );
      })}
      <div style={{ fontSize: 12, color: PC.textMuted, marginTop: 4 }}>
        Toplam {totalVotes} oy
      </div>
    </div>
  );
};

// ── Tekil Yorum Öğesi ──
const CommentItem = ({ comment, postId, currentUser, onUpdate, onRemove, onReply, replies, isBestAnswer, onMarkBestAnswer, isQuestionPost, isPostAuthor, depth }) => {
  var userId = getUserId(currentUser);
  var isOwner = comment.authorId === userId || currentUser.role === "admin";

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.text || "");
  const [editResetKey, setEditResetKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [likes, setLikes] = useState(comment.likes || []);
  const [liking, setLiking] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyResetKey, setReplyResetKey] = useState(0);
  const [replySending, setReplySending] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [deleting, setDeleting] = useState(false);

  var isLiked = likes.indexOf(userId) >= 0;
  var currentDepth = depth || 0;

  var handleToggleLike = async function () {
    if (liking) return;
    setLiking(true);
    try {
      var updated = await PortalDB.toggleCommentLike(postId, comment.id, userId);
      setLikes(updated);
    } catch (err) {
      console.error("Beğeni hatası:", err);
    }
    setLiking(false);
  };

  var handleSave = async function () {
    var isEmpty = comment.contentFormat === "html" ? isHtmlEmpty(editContent) : !editContent.trim();
    if (isEmpty) return;
    setSaving(true);
    try {
      var updateData = {
        text: comment.contentFormat === "html" ? editContent : editContent.trim(),
        editedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (comment.contentFormat === "html") updateData.contentFormat = "html";
      await PortalDB.updateComment(postId, comment.id, updateData);
      onUpdate(comment.id, comment.contentFormat === "html" ? editContent : editContent.trim(), comment.contentFormat);
      setEditing(false);
    } catch (err) {
      console.error("Yorum düzenleme hatası:", err);
    }
    setSaving(false);
  };

  var handleDelete = async function () {
    var hasReplies = replies && replies.length > 0;
    var msg = hasReplies
      ? "Bu yorumu ve " + replies.length + " alt yorumu silmek istediğinizden emin misiniz?"
      : "Bu yorumu silmek istediğinizden emin misiniz?";
    if (!confirm(msg)) return;
    setDeleting(true);
    try {
      await PortalDB.deleteComment(postId, comment.id);
      onRemove(comment.id);
    } catch (err) {
      console.error("Yorum silme hatası:", err);
    }
    setDeleting(false);
  };

  var handleCancel = function () {
    setEditContent(comment.text || "");
    setEditResetKey(function (k) { return k + 1; });
    setEditing(false);
  };

  var handleReplySubmit = async function () {
    if (isHtmlEmpty(replyContent)) return;
    setReplySending(true);
    try {
      await onReply(comment.id, replyContent);
      setReplyContent("");
      setReplyResetKey(function (k) { return k + 1; });
      setShowReplyInput(false);
    } catch (err) {
      console.error("Yanıt eklenemedi:", err);
    }
    setReplySending(false);
  };

  var handleStartEdit = function () {
    setEditContent(comment.text || "");
    setEditResetKey(function (k) { return k + 1; });
    setEditing(true);
  };

  var editIsEmpty = comment.contentFormat === "html" ? isHtmlEmpty(editContent) : !editContent.trim();

  return (
    <div style={{
      marginLeft: currentDepth > 0 ? 24 : 0,
      borderLeft: currentDepth > 0 ? "2px solid " + DY.goldBorder : "none",
      paddingLeft: currentDepth > 0 ? 14 : 0,
    }}>
      <div style={{
        display: "flex", gap: 10, padding: "10px 0",
        borderBottom: "1px solid " + PC.borderLight,
        position: "relative",
      }}>
        {/* En İyi Cevap Rozeti */}
        {isBestAnswer && (
          <div style={{
            position: "absolute", top: 0, right: 0,
            background: "linear-gradient(135deg, #10B981, #059669)",
            color: "white", fontSize: 10, fontWeight: 700,
            padding: "3px 10px", borderRadius: "0 0 8px 8px",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            En İyi Cevap
          </div>
        )}
        <Avatar name={comment.authorName} size={32} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: PC.navy }}>{comment.authorName}</span>
            <span style={{ fontSize: 11, color: PC.textMuted }}>{timeAgo(comment.createdAt)}</span>
            {comment.editedAt && (
              <span style={{ fontSize: 10, color: PC.textMuted, fontStyle: "italic" }}>(düzenlendi)</span>
            )}
            {comment.parentId && (
              <span style={{ fontSize: 10, color: DY.gold, fontWeight: 600 }}>yanıt</span>
            )}
            {/* Düzenle/Sil butonları */}
            {isOwner && !editing && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                <button
                  onClick={handleStartEdit}
                  title="Düzenle"
                  style={{
                    padding: 3, border: "none", background: "transparent",
                    cursor: "pointer", borderRadius: 4, color: PC.textMuted, fontSize: 0,
                  }}
                  onMouseEnter={function (e) { e.currentTarget.style.color = PC.blue; }}
                  onMouseLeave={function (e) { e.currentTarget.style.color = PC.textMuted; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  title="Sil"
                  style={{
                    padding: 3, border: "none", background: "transparent",
                    cursor: deleting ? "wait" : "pointer", borderRadius: 4, color: PC.textMuted, fontSize: 0,
                  }}
                  onMouseEnter={function (e) { e.currentTarget.style.color = "#EF4444"; }}
                  onMouseLeave={function (e) { e.currentTarget.style.color = PC.textMuted; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Düzenleme Modu */}
          {editing ? (
            <div style={{ marginTop: 6 }}>
              {comment.contentFormat === "html" ? (
                <RichTextEditor
                  key={"edit-" + editResetKey}
                  value={editContent}
                  onChange={function (html) { setEditContent(html); }}
                  placeholder="Yorumunuzu düzenleyin..."
                  onImageUpload={function (file) { return PortalDB.uploadFile(file); }}
                />
              ) : (
                <input
                  value={editContent}
                  onChange={function (e) { setEditContent(e.target.value); }}
                  onKeyDown={function (e) {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
                    if (e.key === "Escape") handleCancel();
                  }}
                  style={{
                    width: "100%", padding: "6px 12px", borderRadius: 16,
                    border: "1px solid " + PC.border, fontSize: 13,
                    outline: "none", background: "white",
                  }}
                />
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button
                  onClick={handleSave}
                  disabled={saving || editIsEmpty}
                  style={{
                    padding: "4px 12px", borderRadius: 14, border: "none",
                    background: saving || editIsEmpty ? PC.border : PC.navy,
                    color: "white", cursor: saving ? "wait" : "pointer",
                    fontSize: 12, fontWeight: 600,
                  }}
                >{saving ? "..." : "Kaydet"}</button>
                <button
                  onClick={handleCancel}
                  style={{
                    padding: "4px 10px", borderRadius: 14,
                    border: "1px solid " + PC.border, background: "white",
                    cursor: "pointer", fontSize: 12, color: PC.textMuted,
                  }}
                >Vazgeç</button>
              </div>
            </div>
          ) : (
            <>
              {/* Yorum İçeriği */}
              {comment.contentFormat === "html" ? (
                <div
                  className="portal-post-content"
                  style={{ fontSize: 13, color: PC.text, marginTop: 4, lineHeight: 1.5 }}
                  dangerouslySetInnerHTML={{ __html: renderMentions(sanitizeHtml(comment.text)) }}
                />
              ) : (
                <div style={{ fontSize: 13, color: PC.text, marginTop: 4, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{comment.text}</div>
              )}

              {/* Aksiyon Butonları */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                {/* Beğen */}
                <button
                  onClick={handleToggleLike}
                  disabled={liking}
                  style={{
                    padding: "2px 8px", border: "none",
                    background: "transparent", cursor: "pointer",
                    fontSize: 12, color: isLiked ? "#EF4444" : PC.textMuted,
                    display: "flex", alignItems: "center", gap: 4,
                    borderRadius: 10, transition: "all 0.15s",
                  }}
                  onMouseEnter={function (e) { e.currentTarget.style.background = PC.bg; }}
                  onMouseLeave={function (e) { e.currentTarget.style.background = "transparent"; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {likes.length > 0 && <span style={{ fontWeight: 600 }}>{likes.length}</span>}
                </button>

                {/* Yanıtla (max 2 seviye iç içe) */}
                {currentDepth < 2 && (
                  <button
                    onClick={function () { setShowReplyInput(!showReplyInput); }}
                    style={{
                      padding: "2px 8px", border: "none",
                      background: "transparent", cursor: "pointer",
                      fontSize: 12, color: showReplyInput ? DY.gold : PC.textMuted,
                      display: "flex", alignItems: "center", gap: 4,
                      borderRadius: 10, transition: "all 0.15s",
                    }}
                    onMouseEnter={function (e) { e.currentTarget.style.background = PC.bg; }}
                    onMouseLeave={function (e) { e.currentTarget.style.background = "transparent"; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Yanıtla
                  </button>
                )}

                {/* En İyi Cevap İşaretle (sadece soru kategorisi + gönderi sahibi veya admin) */}
                {isQuestionPost && (isPostAuthor || currentUser.role === "admin") && !comment.parentId && (
                  <button
                    onClick={function () { if (onMarkBestAnswer) onMarkBestAnswer(comment.id); }}
                    style={{
                      padding: "2px 8px", border: "none",
                      background: "transparent", cursor: "pointer",
                      fontSize: 12, color: isBestAnswer ? "#10B981" : PC.textMuted,
                      display: "flex", alignItems: "center", gap: 4,
                      borderRadius: 10, transition: "all 0.15s",
                    }}
                    onMouseEnter={function (e) { e.currentTarget.style.background = PC.bg; }}
                    onMouseLeave={function (e) { e.currentTarget.style.background = "transparent"; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill={isBestAnswer ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    {isBestAnswer ? "En İyi Cevap" : "En İyi Olarak İşaretle"}
                  </button>
                )}
              </div>
            </>
          )}

          {/* Yanıt Girdi Alanı */}
          {showReplyInput && (
            <div style={{ marginTop: 8 }}>
              <RichTextEditor
                key={"reply-" + replyResetKey}
                value={replyContent}
                onChange={function (html) { setReplyContent(html); }}
                placeholder={"@" + comment.authorName + " kullanıcısına yanıt yazın..."}
                onImageUpload={function (file) { return PortalDB.uploadFile(file); }}
              />
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button
                  onClick={handleReplySubmit}
                  disabled={replySending || isHtmlEmpty(replyContent)}
                  style={{
                    padding: "4px 12px", borderRadius: 14, border: "none",
                    background: replySending || isHtmlEmpty(replyContent) ? PC.border : DY.gold,
                    color: "white", cursor: replySending ? "wait" : "pointer",
                    fontSize: 12, fontWeight: 600,
                  }}
                >{replySending ? "..." : "Yanıtla"}</button>
                <button
                  onClick={function () { setShowReplyInput(false); setReplyContent(""); }}
                  style={{
                    padding: "4px 10px", borderRadius: 14,
                    border: "1px solid " + PC.border, background: "white",
                    cursor: "pointer", fontSize: 12, color: PC.textMuted,
                  }}
                >Vazgeç</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alt Yorumlar (Replies) */}
      {replies && replies.length > 0 && (
        <div>
          {replies.length > 2 && !showReplies && (
            <button
              onClick={function () { setShowReplies(true); }}
              style={{
                padding: "4px 0", border: "none", background: "transparent",
                cursor: "pointer", fontSize: 12, color: DY.gold, fontWeight: 600,
                marginLeft: 24,
              }}
            >{replies.length} yanıtı göster</button>
          )}
          {(showReplies || replies.length <= 2) && replies.map(function (reply) {
            return (
              <CommentItem
                key={reply.id}
                comment={reply}
                postId={postId}
                currentUser={currentUser}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onReply={onReply}
                replies={[]}
                isBestAnswer={false}
                onMarkBestAnswer={onMarkBestAnswer}
                isQuestionPost={isQuestionPost}
                isPostAuthor={isPostAuthor}
                depth={currentDepth + 1}
              />
            );
          })}
          {showReplies && replies.length > 2 && (
            <button
              onClick={function () { setShowReplies(false); }}
              style={{
                padding: "4px 0", border: "none", background: "transparent",
                cursor: "pointer", fontSize: 12, color: PC.textMuted,
                marginLeft: 24,
              }}
            >Yanıtları gizle</button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Yorum Bölümü ──
const CommentSection = ({ postId, currentUser, post, allUsers }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newCommentResetKey, setNewCommentResetKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [bestAnswerId, setBestAnswerId] = useState(post ? post.bestAnswerId || null : null);
  var viewIncremented = useRef(false);

  var isQuestionPost = post && post.category === "soru";
  var isPostAuthor = post && post.authorId === getUserId(currentUser);

  const loadComments = async function () {
    setLoading(true);
    try {
      var fetched = await PortalDB.fetchComments(postId);
      setComments(fetched);
    } catch (err) {
      console.error("Yorumlar yüklenemedi:", err);
    }
    setLoading(false);
  };

  const handleOpen = function () {
    if (!open) {
      setOpen(true);
      loadComments();
      if (!viewIncremented.current) {
        viewIncremented.current = true;
        PortalDB.incrementViews(postId);
      }
    } else {
      setOpen(false);
    }
  };

  const handleSubmit = async function () {
    if (isHtmlEmpty(newComment)) return;
    setSending(true);
    try {
      var comment = {
        text: newComment,
        contentFormat: "html",
        authorName: currentUser.name || "Anonim",
        authorId: getUserId(currentUser),
      };
      var saved = await PortalDB.addComment(postId, comment);
      setComments(function (prev) { return [...prev, saved]; });
      setNewComment("");
      setNewCommentResetKey(function (k) { return k + 1; });
      // Mention bildirimleri gönder
      var curUserId = getUserId(currentUser);
      var mentions = extractMentions(newComment);
      mentions.forEach(function (mentionedName) {
        var mentionedUser = (allUsers || []).find(function (u) { return u.name.toLowerCase() === mentionedName.toLowerCase(); });
        if (mentionedUser && mentionedUser.id !== curUserId) {
          PortalDB.addNotification(mentionedUser.id, {
            type: "mention",
            message: (currentUser.name || "Birisi") + " sizi bir yorumda bahsetti",
            postId: postId,
            fromUser: currentUser.name,
          });
        }
      });
    } catch (err) {
      console.error("Yorum eklenemedi:", err);
    }
    setSending(false);
  };

  var handleReply = async function (parentId, replyContent) {
    var comment = {
      text: replyContent,
      contentFormat: "html",
      parentId: parentId,
      authorName: currentUser.name || "Anonim",
      authorId: getUserId(currentUser),
    };
    var saved = await PortalDB.addComment(postId, comment);
    setComments(function (prev) { return [...prev, saved]; });
  };

  var handleCommentUpdate = function (commentId, newText, contentFormat) {
    setComments(function (prev) {
      return prev.map(function (c) {
        var updates = { text: newText, editedAt: new Date() };
        if (contentFormat) updates.contentFormat = contentFormat;
        return c.id === commentId ? Object.assign({}, c, updates) : c;
      });
    });
  };

  var handleCommentRemove = function (commentId) {
    setComments(function (prev) {
      return prev.filter(function (c) { return c.id !== commentId && c.parentId !== commentId; });
    });
  };

  var handleMarkBestAnswer = async function (commentId) {
    try {
      var newBestId = await PortalDB.markBestAnswer(postId, commentId);
      setBestAnswerId(newBestId);
    } catch (err) {
      console.error("En iyi cevap işaretleme hatası:", err);
    }
  };

  // Yorumları thread'lere ayır
  var rootComments = comments.filter(function (c) { return !c.parentId; });
  var replyMap = {};
  comments.forEach(function (c) {
    if (c.parentId) {
      if (!replyMap[c.parentId]) replyMap[c.parentId] = [];
      replyMap[c.parentId].push(c);
    }
  });

  // En iyi cevabı en üste taşı
  if (bestAnswerId) {
    rootComments.sort(function (a, b) {
      if (a.id === bestAnswerId) return -1;
      if (b.id === bestAnswerId) return 1;
      return 0;
    });
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={handleOpen}
        style={{
          padding: "6px 12px", border: "1px solid " + PC.border,
          borderRadius: 20, background: "white", cursor: "pointer",
          fontSize: 13, display: "flex", alignItems: "center", gap: 6,
          color: PC.textMuted, transition: "all 0.2s",
        }}
        onMouseEnter={function (e) { e.currentTarget.style.background = PC.bg; }}
        onMouseLeave={function (e) { e.currentTarget.style.background = "white"; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        Yorumlar
      </button>

      {open && (
        <div style={{
          marginTop: 12, padding: 16, background: PC.bg,
          borderRadius: 12, border: "1px solid " + PC.border,
        }}>
          {/* Soru-Cevap bilgi notu */}
          {isQuestionPost && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
              background: DY.goldLight + "80", borderRadius: 8, marginBottom: 12,
              fontSize: 12, color: DY.warm,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              {isPostAuthor
                ? "En iyi cevabı işaretleyerek diğer kullanıcılara yardımcı olabilirsiniz."
                : "Gönderi sahibi en iyi cevabı işaretleyebilir."}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", color: PC.textMuted, padding: 12 }}>Yükleniyor...</div>
          ) : (
            <>
              {comments.length === 0 && (
                <div style={{ textAlign: "center", color: PC.textMuted, padding: 12, fontSize: 13 }}>
                  Henüz yorum yok. İlk yorumu siz yapın!
                </div>
              )}
              {rootComments.map(function (c) {
                return (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    postId={postId}
                    currentUser={currentUser}
                    onUpdate={handleCommentUpdate}
                    onRemove={handleCommentRemove}
                    onReply={handleReply}
                    replies={replyMap[c.id] || []}
                    isBestAnswer={bestAnswerId === c.id}
                    onMarkBestAnswer={handleMarkBestAnswer}
                    isQuestionPost={isQuestionPost}
                    isPostAuthor={isPostAuthor}
                    depth={0}
                  />
                );
              })}
            </>
          )}

          {/* Yeni yorum - Zengin Metin Editörü */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Avatar name={currentUser.name} size={32} />
              <div style={{ flex: 1 }}>
                <RichTextEditor
                  key={"new-comment-" + newCommentResetKey}
                  value={newComment}
                  onChange={function (html) { setNewComment(html); }}
                  placeholder="Yorumunuzu yazın... (@kullanıcı ile bahsetebilirsiniz)"
                  onImageUpload={function (file) { return PortalDB.uploadFile(file); }}
                  allUsers={allUsers}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    onClick={handleSubmit}
                    disabled={sending || isHtmlEmpty(newComment)}
                    style={{
                      padding: "8px 20px", borderRadius: 20,
                      border: "none",
                      background: isHtmlEmpty(newComment) || sending ? PC.border : "linear-gradient(135deg, " + DY.gold + ", " + DY.goldDark + ")",
                      color: "white",
                      fontSize: 13, fontWeight: 600, cursor: sending ? "wait" : "pointer",
                      boxShadow: isHtmlEmpty(newComment) ? "none" : "0 2px 8px rgba(245,158,11,0.3)",
                    }}
                  >
                    {sending ? "Gönderiliyor..." : "Yorum Yap"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Mention Autocomplete Overlay ──
const MentionAutocomplete = ({ quillRef, allUsers }) => {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mentionStart, setMentionStart] = useState(null);
  const listRef = useRef(null);

  var filtered = useMemo(function () {
    if (!query) return allUsers.slice(0, 6);
    var q = query.toLowerCase();
    return allUsers.filter(function (u) {
      return u.name.toLowerCase().includes(q);
    }).slice(0, 6);
  }, [query, allUsers]);

  useEffect(function () {
    var quill = quillRef.current;
    if (!quill) return;

    var handleTextChange = function () {
      var sel = quill.getSelection();
      if (!sel) { setVisible(false); return; }
      var text = quill.getText(0, sel.index);
      // @ karakterinden sonraki metni bul
      var atIdx = text.lastIndexOf("@");
      if (atIdx < 0) { setVisible(false); return; }
      // @ dan önceki karakter boşluk veya satır başı olmalı
      if (atIdx > 0 && text[atIdx - 1] !== " " && text[atIdx - 1] !== "\n") { setVisible(false); return; }
      var afterAt = text.substring(atIdx + 1);
      // Boşluk varsa daha sona ermiştir, ama kullanıcı adı boşluk içerebilir
      // Sadece 20 karaktere kadar arayalım
      if (afterAt.length > 20) { setVisible(false); return; }
      setMentionStart(atIdx);
      setQuery(afterAt);
      setSelectedIdx(0);

      // Pozisyon hesapla
      var bounds = quill.getBounds(sel.index);
      setPosition({ top: bounds.top + bounds.height + 4, left: bounds.left });
      setVisible(true);
    };

    quill.on("text-change", handleTextChange);
    quill.on("selection-change", function (range) {
      if (!range) setVisible(false);
    });

    return function () {
      quill.off("text-change", handleTextChange);
    };
  }, [quillRef.current]);

  var insertMention = function (user) {
    var quill = quillRef.current;
    if (!quill || mentionStart === null) return;
    var sel = quill.getSelection();
    if (!sel) return;
    var deleteLen = sel.index - mentionStart;
    quill.deleteText(mentionStart, deleteLen);
    var mentionText = "@" + user.name + " ";
    quill.insertText(mentionStart, mentionText, { bold: true, color: "#3B82F6" });
    quill.setSelection(mentionStart + mentionText.length);
    setVisible(false);
  };

  useEffect(function () {
    if (!visible || !quillRef.current) return;
    var handleKeydown = function (e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx(function (i) { return Math.min(i + 1, filtered.length - 1); });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx(function (i) { return Math.max(i - 1, 0); });
      } else if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        insertMention(filtered[selectedIdx]);
      } else if (e.key === "Escape") {
        setVisible(false);
      }
    };
    quillRef.current.root.addEventListener("keydown", handleKeydown);
    return function () {
      if (quillRef.current) quillRef.current.root.removeEventListener("keydown", handleKeydown);
    };
  }, [visible, filtered, selectedIdx]);

  if (!visible || filtered.length === 0) return null;

  return (
    <div ref={listRef} className="mention-autocomplete" style={{
      position: "absolute", top: position.top, left: position.left,
      background: "white", borderRadius: 10, padding: 4,
      boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
      border: "1px solid " + PC.border, zIndex: 200,
      minWidth: 200, maxWidth: 280,
      animation: "fadeInUp 0.12s ease-out",
    }}>
      <div style={{ padding: "4px 10px 6px", fontSize: 10, fontWeight: 700, color: PC.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Kullanıcılar
      </div>
      {filtered.map(function (user, idx) {
        var isSelected = idx === selectedIdx;
        return (
          <div
            key={user.id}
            onMouseDown={function (e) { e.preventDefault(); insertMention(user); }}
            onMouseEnter={function () { setSelectedIdx(idx); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 8, cursor: "pointer",
              background: isSelected ? DY.goldLight : "transparent",
              transition: "background 0.1s",
            }}
          >
            <Avatar name={user.name} size={28} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: PC.navy }}>{user.name}</div>
              <div style={{ fontSize: 10, color: PC.textMuted }}>{user.id}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Zengin İçerik Editörü (Quill.js) ──
const RichTextEditor = ({ value, onChange, placeholder, onImageUpload, allUsers }) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);

  // Quill yoksa fallback textarea
  if (typeof Quill === "undefined") {
    return (
      <textarea
        value={value || ""}
        onChange={function (e) { if (onChange) onChange(e.target.value); }}
        placeholder={placeholder}
        rows={5}
        style={{
          width: "100%", padding: "12px 16px", border: "1px solid " + PC.border,
          borderRadius: 10, fontSize: 14, resize: "vertical",
          outline: "none", lineHeight: 1.6, fontFamily: "inherit",
        }}
      />
    );
  }

  useEffect(function () {
    if (!editorRef.current || quillRef.current) return;

    var handleDirectImageUpload = function (file, quill) {
      var validation = validateFile(file, true);
      if (!validation.valid) {
        alert(validation.errors.join("\n"));
        return;
      }
      var range = quill.getSelection(true) || { index: quill.getLength() };
      quill.insertText(range.index, "Yükleniyor...", { italic: true, color: "#999" });
      quill.setSelection(range.index + 13);

      if (onImageUpload) {
        onImageUpload(file).then(function (result) {
          quill.deleteText(range.index, 13);
          quill.insertEmbed(range.index, "image", result.url);
          quill.setSelection(range.index + 1);
        }).catch(function (err) {
          quill.deleteText(range.index, 13);
          alert("Görsel yüklenemedi: " + err.message);
        });
      }
    };

    var imageHandler = function () {
      var input = document.createElement("input");
      input.setAttribute("type", "file");
      input.setAttribute("accept", "image/*");
      input.click();
      input.onchange = function () {
        var file = input.files[0];
        if (!file) return;
        handleDirectImageUpload(file, quillRef.current);
      };
    };

    var quill = new Quill(editorRef.current, {
      theme: "snow",
      placeholder: placeholder || "İçerik yazın...",
      modules: {
        toolbar: {
          container: [
            [{ header: [2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ color: [] }, { background: [] }],
            [{ list: "ordered" }, { list: "bullet" }],
            ["blockquote", "code-block"],
            ["link", "image"],
            ["clean"],
          ],
          handlers: {
            image: imageHandler,
          },
        },
      },
    });

    if (value) {
      quill.root.innerHTML = value;
    }

    quill.on("text-change", function () {
      var html = quill.root.innerHTML;
      if (html === "<p><br></p>") html = "";
      if (onChange) onChange(html);
    });

    // Sürükle-bırak görsel desteği
    quill.root.addEventListener("drop", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 0) {
        var file = files[0];
        if (file.type.startsWith("image/")) {
          handleDirectImageUpload(file, quill);
        }
      }
    }, false);

    // Yapıştırma görsel desteği
    quill.root.addEventListener("paste", function (e) {
      var items = e.clipboardData && e.clipboardData.items;
      if (items) {
        for (var i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            e.preventDefault();
            var file = items[i].getAsFile();
            handleDirectImageUpload(file, quill);
            break;
          }
        }
      }
    }, false);

    quillRef.current = quill;

    return function () {
      quillRef.current = null;
    };
  }, []);

  return (
    <div style={{
      border: "1px solid " + PC.border,
      borderRadius: 10,
      overflow: "hidden",
      background: "white",
      position: "relative",
    }}>
      <div ref={editorRef} />
      {allUsers && allUsers.length > 0 && (
        <MentionAutocomplete quillRef={quillRef} allUsers={allUsers} />
      )}
    </div>
  );
};

// ── Gönderi Kartı ──
const PostCard = ({ post, currentUser, onReact, onVote, onVotePost, onDelete, onEdit, onTogglePin, isBookmarked, onToggleBookmark, onFilterAuthor, onFilterTag, allUsers, onFollowUser, followedUsers, onViewProfile }) => {
  var cat = getCategoryInfo(post.category);
  var userId = getUserId(currentUser);
  var isAuthor = post.authorId === userId || currentUser.role === "admin";
  var isAdmin = currentUser.role === "admin";
  var isMobile = useIsMobile(768);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || "");
  const [editContent, setEditContent] = useState(post.content || "");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  var TRUNCATE_LEN = 300;
  var isLong, displayContent;
  if (post.contentFormat === "html") {
    var textContent = stripHtmlTags(post.content);
    isLong = textContent.length > TRUNCATE_LEN;
    if (!expanded && isLong) {
      displayContent = truncateHtml(post.content, TRUNCATE_LEN);
    } else {
      displayContent = post.content;
    }
  } else {
    isLong = post.content && post.content.length > TRUNCATE_LEN;
    displayContent = (!expanded && isLong) ? post.content.substring(0, TRUNCATE_LEN) + "..." : post.content;
  }

  var handleSaveEdit = async function () {
    var isEmpty = post.contentFormat === "html" ? isHtmlEmpty(editContent) : !editContent.trim();
    if (isEmpty) return;
    setSaving(true);
    try {
      var updateData = { title: editTitle.trim(), content: post.contentFormat === "html" ? editContent : editContent.trim() };
      if (post.contentFormat === "html") updateData.contentFormat = "html";
      await onEdit(post.id, updateData);
      setEditing(false);
    } catch (err) {
      console.error("Düzenleme hatası:", err);
    }
    setSaving(false);
  };

  var handleCancelEdit = function () {
    setEditTitle(post.title || "");
    setEditContent(post.content || "");
    setEditing(false);
  };

  return (
    <div className="daisy-card" style={{
      padding: 0, overflow: "hidden",
    }}>
      {/* Pinned banner */}
      {post.pinned && (
        <div style={{
          background: "linear-gradient(90deg, #F59E0B, #F97316)",
          padding: "4px 16px", fontSize: 11, fontWeight: 700,
          color: "white", display: "flex", alignItems: "center", gap: 6,
        }}>
          <SvgIcon path={ICONS.pin} size={12} color="white" fill="white" /> Sabitlenmiş Gönderi
        </div>
      )}

      <div style={{ padding: isMobile ? "16px" : "20px 24px", display: "flex", gap: isMobile ? 10 : 16 }}>
        {/* Sol: Oylama Widget */}
        <VoteWidget post={post} userId={userId} onVote={onVotePost} />

        {/* Sağ: İçerik */}
        <div style={{ flex: 1, minWidth: 0 }}>
        {/* Üst kısım: avatar + yazar + zaman + kategori */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Avatar name={post.authorName} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span
                onClick={function () { if (onViewProfile) onViewProfile(post.authorId, post.authorName); else if (onFilterAuthor) onFilterAuthor(post.authorName); }}
                style={{ fontWeight: 700, fontSize: 15, color: PC.navy, cursor: "pointer" }}
                onMouseEnter={function (e) { e.currentTarget.style.textDecoration = "underline"; }}
                onMouseLeave={function (e) { e.currentTarget.style.textDecoration = "none"; }}
                title={"\"" + post.authorName + "\" profilini görüntüle"}
              >{post.authorName}</span>
              {/* Takip butonu (kendi gönderisi değilse) */}
              {post.authorId !== userId && onFollowUser && (
                <button
                  onClick={function (e) { e.stopPropagation(); onFollowUser(post.authorId); }}
                  className="follow-btn-inline"
                  style={{
                    padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                    border: "1px solid " + (followedUsers && followedUsers.indexOf(post.authorId) >= 0 ? "#10B981" : PC.border),
                    background: followedUsers && followedUsers.indexOf(post.authorId) >= 0 ? "#D1FAE5" : "white",
                    color: followedUsers && followedUsers.indexOf(post.authorId) >= 0 ? "#059669" : PC.textMuted,
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  {followedUsers && followedUsers.indexOf(post.authorId) >= 0 ? "Takip Ediliyor" : "+ Takip Et"}
                </button>
              )}
              <CategoryBadge category={post.category} small />
              {post.tag && (
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 4,
                  background: PC.bg, color: PC.textMuted, fontWeight: 600,
                }}>{post.tag}</span>
              )}
              {post.courseCode && (
                <span
                  onClick={function () { if (onFilterTag) onFilterTag(post.courseCode); }}
                  style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 4,
                    background: DY.goldLight, color: DY.goldDark, fontWeight: 700,
                    display: "inline-flex", alignItems: "center", gap: 3,
                    cursor: "pointer",
                  }}
                  title={"#" + post.courseCode + " etiketine göre filtrele"}
                >
                  <SvgIcon path={ICONS.book} size={10} color={DY.goldDark} />
                  {post.courseCode}
                </span>
              )}
            </div>
            {/* Etiketler */}
            {post.tags && post.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {post.tags.filter(function (t) { return t !== post.courseCode; }).map(function (t, idx) {
                  return (
                    <span
                      key={idx}
                      onClick={function () { if (onFilterTag) onFilterTag(t); }}
                      style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 10,
                        background: isCourseCode(t) ? DY.goldLight : "#E0E7FF",
                        color: isCourseCode(t) ? DY.goldDark : "#4F46E5",
                        fontWeight: 600, cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={function (e) { e.currentTarget.style.opacity = "0.7"; }}
                      onMouseLeave={function (e) { e.currentTarget.style.opacity = "1"; }}
                      title={"#" + t + " etiketine göre filtrele"}
                    >#{t}</span>
                  );
                })}
              </div>
            )}
            <div style={{ fontSize: 12, color: PC.textMuted, marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              {timeAgo(post.createdAt)}
              {post.views > 0 && <span> · {post.views} görüntülenme</span>}
              {getVoteScore(post) !== 0 && (
                <span style={{ color: getVoteScore(post) > 0 ? "#16A34A" : "#DC2626", fontWeight: 600 }}>
                  {" · "}{getVoteScore(post) > 0 ? "+" : ""}{getVoteScore(post)} oy
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* Admin: Pin/Unpin */}
            {isAdmin && (
              <button
                onClick={function () { onTogglePin(post.id, !post.pinned); }}
                title={post.pinned ? "Sabitlemeyi Kaldır" : "Sabitle"}
                style={{
                  padding: 6, border: "none", background: "transparent",
                  cursor: "pointer", borderRadius: 6,
                  color: post.pinned ? "#F59E0B" : PC.textMuted,
                }}
                onMouseEnter={function (e) { e.currentTarget.style.color = "#F59E0B"; }}
                onMouseLeave={function (e) { e.currentTarget.style.color = post.pinned ? "#F59E0B" : PC.textMuted; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={post.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l2.09 6.26L21 9.27l-5 3.14L17.18 22 12 17.77 6.82 22 8 12.41l-5-3.14 6.91-1.01L12 2z" />
                </svg>
              </button>
            )}
            {/* Yazar/Admin: Düzenle */}
            {isAuthor && !editing && (
              <button
                onClick={function () { setEditing(true); }}
                title="Düzenle"
                style={{
                  padding: 6, border: "none", background: "transparent",
                  cursor: "pointer", borderRadius: 6, color: PC.textMuted,
                }}
                onMouseEnter={function (e) { e.currentTarget.style.color = PC.blue; }}
                onMouseLeave={function (e) { e.currentTarget.style.color = PC.textMuted; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            {/* Yazar/Admin: Sil */}
            {isAuthor && (
              <button
                onClick={function () { if (confirm("Bu gönderiyi silmek istediğinizden emin misiniz?")) onDelete(post.id); }}
                title="Sil"
                style={{
                  padding: 6, border: "none", background: "transparent",
                  cursor: "pointer", borderRadius: 6, color: PC.textMuted,
                }}
                onMouseEnter={function (e) { e.currentTarget.style.color = "#EF4444"; }}
                onMouseLeave={function (e) { e.currentTarget.style.color = PC.textMuted; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Başlık + İçerik (düzenleme veya görüntüleme) */}
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={editTitle}
              onChange={function (e) { setEditTitle(e.target.value); }}
              placeholder="Başlık"
              style={{
                width: "100%", padding: "10px 14px", border: "1px solid " + PC.border,
                borderRadius: 8, fontSize: 15, fontWeight: 600, outline: "none",
                color: PC.navy,
              }}
            />
            {post.contentFormat === "html" ? (
              <RichTextEditor
                value={editContent}
                onChange={function (html) { setEditContent(html); }}
                placeholder="İçerik"
                onImageUpload={function (file) { return PortalDB.uploadFile(file); }}
              />
            ) : (
              <textarea
                value={editContent}
                onChange={function (e) { setEditContent(e.target.value); }}
                rows={4}
                style={{
                  width: "100%", padding: "10px 14px", border: "1px solid " + PC.border,
                  borderRadius: 8, fontSize: 14, resize: "vertical",
                  outline: "none", lineHeight: 1.6, fontFamily: "inherit",
                }}
              />
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={handleCancelEdit}
                style={{
                  padding: "6px 16px", border: "1px solid " + PC.border,
                  borderRadius: 8, background: "white", cursor: "pointer",
                  fontSize: 13, color: PC.textMuted,
                }}
              >İptal</button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || (post.contentFormat === "html" ? isHtmlEmpty(editContent) : !editContent.trim())}
                style={{
                  padding: "6px 16px", border: "none", borderRadius: 8,
                  background: saving || (post.contentFormat === "html" ? isHtmlEmpty(editContent) : !editContent.trim()) ? PC.border : PC.navy,
                  color: "white", cursor: saving ? "wait" : "pointer",
                  fontSize: 13, fontWeight: 600,
                }}
              >{saving ? "Kaydediliyor..." : "Kaydet"}</button>
            </div>
          </div>
        ) : (
          <>
            {post.title && (
              <h3 style={{
                fontSize: 18, fontWeight: 700, color: PC.navy,
                marginBottom: 8, lineHeight: 1.4,
              }}>{post.title}</h3>
            )}
            {post.contentFormat === "html" ? (
              <div
                className="portal-post-content"
                style={{
                  fontSize: 14, color: PC.text, lineHeight: 1.7,
                  wordBreak: "break-word",
                }}
                dangerouslySetInnerHTML={{ __html: renderMentions(sanitizeHtml(displayContent)) }}
              />
            ) : (
              <div style={{
                fontSize: 14, color: PC.text, lineHeight: 1.7,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>{displayContent}</div>
            )}
            {isLong && (
              <button
                onClick={function () { setExpanded(!expanded); }}
                style={{
                  padding: 0, border: "none", background: "transparent",
                  color: PC.blue, cursor: "pointer", fontSize: 13,
                  fontWeight: 600, marginTop: 4,
                }}
              >{expanded ? "Daha az göster" : "Devamını oku"}</button>
            )}
            {post.editedAt && (
              <div style={{ fontSize: 11, color: PC.textMuted, marginTop: 4, fontStyle: "italic" }}>
                (düzenlendi)
              </div>
            )}
          </>
        )}

        {/* Anket */}
        {post.category === "anket" && post.pollOptions && post.pollOptions.length > 0 && (
          <PollWidget
            pollOptions={post.pollOptions}
            pollVotes={post.pollVotes}
            postId={post.id}
            userId={userId}
            onVote={onVote}
          />
        )}

        {/* Kaynak linki */}
        {post.resourceUrl && (
          <div style={{
            marginTop: 12, padding: "10px 14px", background: PC.bg,
            borderRadius: 8, border: "1px solid " + PC.border,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={PC.blue} strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <a href={post.resourceUrl} target="_blank" rel="noopener noreferrer"
              style={{ color: PC.blue, fontWeight: 600, fontSize: 13, textDecoration: "none" }}
            >{post.resourceUrl}</a>
          </div>
        )}

        {/* Eklenen dosya */}
        {post.attachment && (
          <div style={{
            marginTop: 12, borderRadius: 10, overflow: "hidden",
            border: "1px solid " + PC.borderLight,
          }}>
            {post.attachment.type && post.attachment.type.startsWith("image/") ? (
              <img src={post.attachment.url} alt={post.attachment.name}
                style={{ width: "100%", maxHeight: 400, objectFit: "cover", display: "block" }} />
            ) : (
              <a href={post.attachment.url} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                  background: DY.warmLight, textDecoration: "none",
                }}>
                <SvgIcon path={ICONS.file} size={24} color={DY.gold} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: PC.navy }}>{post.attachment.name}</div>
                  <div style={{ fontSize: 11, color: PC.textMuted }}>{post.attachment.size ? (post.attachment.size / 1024).toFixed(0) + " KB" : "Dosya"}</div>
                </div>
              </a>
            )}
          </div>
        )}

        {/* Alt kısım: reaksiyonlar + yorumlar + yer imi */}
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <ReactionBar
            reactions={post.reactions}
            postId={post.id}
            userId={userId}
            onReact={onReact}
          />
          <CommentSection postId={post.id} currentUser={currentUser} post={post} allUsers={allUsers} />
          <button
            onClick={function () {
              var url = window.location.origin + window.location.pathname + "?post=" + post.id;
              if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(function () { alert("Link kopyalandı!"); });
              } else {
                prompt("Link:", url);
              }
            }}
            title="Link Kopyala"
            style={{
              padding: "6px 12px", border: "1px solid " + PC.border,
              borderRadius: 20, background: "white",
              cursor: "pointer", fontSize: 13, display: "flex",
              alignItems: "center", gap: 6, color: PC.textMuted,
              transition: "all 0.2s",
            }}
            onMouseEnter={function (e) { e.currentTarget.style.borderColor = PC.blue; e.currentTarget.style.color = PC.blue; }}
            onMouseLeave={function (e) { e.currentTarget.style.borderColor = PC.border; e.currentTarget.style.color = PC.textMuted; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Paylaş
          </button>
          <button
            onClick={function () { onToggleBookmark(post.id); }}
            title={isBookmarked ? "Yer İminden Kaldır" : "Yer İmine Ekle"}
            style={{
              marginLeft: "auto", padding: "6px 12px",
              border: "1px solid " + (isBookmarked ? "#F59E0B" : PC.border),
              borderRadius: 20, background: isBookmarked ? "#FEF3C7" : "white",
              cursor: "pointer", fontSize: 13, display: "flex",
              alignItems: "center", gap: 6, color: isBookmarked ? "#F59E0B" : PC.textMuted,
              transition: "all 0.2s",
            }}
            onMouseEnter={function (e) { e.currentTarget.style.borderColor = "#F59E0B"; e.currentTarget.style.color = "#F59E0B"; }}
            onMouseLeave={function (e) {
              e.currentTarget.style.borderColor = isBookmarked ? "#F59E0B" : PC.border;
              e.currentTarget.style.color = isBookmarked ? "#F59E0B" : PC.textMuted;
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {isBookmarked ? "Kaydedildi" : "Kaydet"}
          </button>
          {/* Raporla */}
          {!isAuthor && (
            <button
              onClick={function () {
                var reason = prompt("Raporlama sebebi:\n" + REPORT_REASONS.join("\n"));
                if (reason) {
                  PortalDB.reportPost(post.id, {
                    reason: reason, reporterId: userId, reporterName: currentUser.name || "Anonim",
                    postTitle: post.title || "", postAuthor: post.authorName,
                  }).then(function () { alert("Rapor gönderildi. Teşekkürler!"); });
                }
              }}
              title="Gönderiyi Raporla"
              style={{
                padding: "6px 8px", border: "1px solid " + PC.border,
                borderRadius: 20, background: "white",
                cursor: "pointer", display: "flex", alignItems: "center",
                color: PC.textMuted, transition: "all 0.2s",
              }}
              onMouseEnter={function (e) { e.currentTarget.style.borderColor = "#EF4444"; e.currentTarget.style.color = "#EF4444"; }}
              onMouseLeave={function (e) { e.currentTarget.style.borderColor = PC.border; e.currentTarget.style.color = PC.textMuted; }}
            >
              <SvgIcon path={ICONS.flag} size={14} />
            </button>
          )}
        </div>
        </div>{/* /Sağ: İçerik */}
      </div>
    </div>
  );
};

// ── Yeni Gönderi Formu ──
const NewPostForm = ({ currentUser, onPost, onClose, allUsers }) => {
  const [category, setCategory] = useState("sohbet");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tag, setTag] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollAnonymous, setPollAnonymous] = useState(false);
  const [pollMultiSelect, setPollMultiSelect] = useState(false);
  const [pollDeadline, setPollDeadline] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [showCourseSuggestions, setShowCourseSuggestions] = useState(false);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [postResetKey, setPostResetKey] = useState(0);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const fileInputRef = useRef(null);

  var courseSuggestions = useMemo(function () {
    if (!courseCode.trim()) return [];
    var q = courseCode.toUpperCase();
    return POPULAR_COURSES.filter(function (c) { return c.includes(q); }).slice(0, 5);
  }, [courseCode]);

  var handleFileSelect = function (f) {
    if (!f) return;
    var validation = validateFile(f, false);
    if (!validation.valid) {
      alert(validation.errors.join("\n"));
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      var reader = new FileReader();
      reader.onload = function (e) { setFilePreview(e.target.result); };
      reader.readAsDataURL(f);
    } else { setFilePreview(null); }
  };

  var handleDrop = function (e) {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleSubmit = async function () {
    if (isHtmlEmpty(content)) return;
    setPosting(true);
    try {
      // Etiketleri birleştir: elle eklenenler + içerikten otomatik çıkarılanlar
      var contentTags = extractTags(content).concat(extractTags(title));
      var allTags = tags.slice();
      contentTags.forEach(function (t) {
        var upper = t.toUpperCase();
        if (allTags.map(function (x) { return x.toUpperCase(); }).indexOf(upper) < 0) allTags.push(t);
      });
      // Ders kodunu da etiket olarak ekle
      var cc = courseCode.trim().toUpperCase();
      if (cc && allTags.map(function (x) { return x.toUpperCase(); }).indexOf(cc) < 0) allTags.push(cc);

      var post = {
        category: category, title: title.trim(), content: content,
        contentFormat: "html",
        tag: tag || "", courseCode: cc || "",
        tags: allTags,
        authorName: currentUser.name || "Anonim", authorId: getUserId(currentUser),
      };
      if (file) {
        setUploading(true);
        try { var uploaded = await PortalDB.uploadFile(file); post.attachment = uploaded; }
        catch (err) { console.warn("Dosya yüklenemedi:", err); }
        setUploading(false);
      }
      if (category === "kaynak" && resourceUrl.trim()) { post.resourceUrl = resourceUrl.trim(); }
      if (category === "anket") {
        post.pollOptions = pollOptions.filter(function (o) { return o.trim(); });
        post.pollVotes = {};
        post.pollAnonymous = pollAnonymous;
        post.pollMultiSelect = pollMultiSelect;
        if (pollDeadline) post.pollDeadline = pollDeadline;
      }
      await onPost(post);
      setTitle(""); setContent(""); setResourceUrl(""); setCourseCode(""); setTags([]); setTagInput("");
      setPollOptions(["", ""]); setFile(null); setFilePreview(null);
      setPostResetKey(function (k) { return k + 1; });
      if (onClose) onClose();
    } catch (err) {
      alert("Gönderi oluşturulamadı: " + err.message);
    }
    setPosting(false);
  };

  const addPollOption = function () {
    if (pollOptions.length < 6) setPollOptions([...pollOptions, ""]);
  };

  return (
    <div className="daisy-card" style={{
      padding: 24, marginBottom: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Avatar name={currentUser.name} />
        <div>
          <div style={{ fontWeight: 700, color: PC.navy }}>{currentUser.name || "Anonim"}</div>
          <div style={{ fontSize: 12, color: PC.textMuted }}>Yeni gönderi oluştur</div>
        </div>
      </div>

      {/* Kategori seçimi */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {PORTAL_CATEGORIES.map(function (cat) {
          var isActive = category === cat.id;
          return (
            <button
              key={cat.id}
              onClick={function () { setCategory(cat.id); }}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12,
                fontWeight: isActive ? 700 : 500, cursor: "pointer",
                border: isActive ? "2px solid " + cat.color : "1px solid " + PC.border,
                background: isActive ? cat.bg : "white",
                color: isActive ? cat.color : PC.textMuted,
                transition: "all 0.15s",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><SvgIcon path={ICONS[cat.icon]} size={12} color={isActive ? cat.color : PC.textMuted} /> {cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Başlık */}
      <input
        value={title}
        onChange={function (e) { setTitle(e.target.value); }}
        placeholder="Başlık (isteğe bağlı)"
        style={{
          width: "100%", padding: "12px 16px", border: "1px solid " + PC.border,
          borderRadius: 10, fontSize: 15, fontWeight: 600, marginBottom: 12,
          outline: "none", color: PC.navy,
        }}
      />

      {/* İçerik - Zengin Metin Editörü */}
      <div style={{ position: "relative" }}>
        <RichTextEditor
          key={postResetKey}
          value={content}
          onChange={function (html) { setContent(html); }}
          placeholder={category === "soru" ? "Sorunuzu detaylı bir şekilde yazın... (@kullanıcı ile bahsetebilirsiniz)"
            : category === "anket" ? "Anket açıklamanızı yazın..."
              : "Ne paylaşmak istiyorsunuz? (@kullanıcı ile bahsetebilirsiniz)"}
          onImageUpload={function (file) {
            return PortalDB.uploadFile(file);
          }}
          allUsers={allUsers}
        />
      </div>

      {/* Ders Kodu + Tag seçimi */}
      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ position: "relative", minWidth: 160 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: PC.textMuted, marginBottom: 4 }}>Ders Kodu</div>
          <input
            value={courseCode}
            onChange={function (e) { setCourseCode(e.target.value); setShowCourseSuggestions(true); }}
            onBlur={function () { setTimeout(function () { setShowCourseSuggestions(false); }, 200); }}
            placeholder="Örn: BIL301"
            style={{ width: "100%", padding: "8px 12px", border: "1px solid " + PC.border, borderRadius: 8, fontSize: 12, outline: "none" }}
          />
          {showCourseSuggestions && courseSuggestions.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0,
              background: "white", border: "1px solid " + PC.border,
              borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 10, marginTop: 2,
            }}>
              {courseSuggestions.map(function (c) {
                return (
                  <div key={c}
                    onMouseDown={function () { setCourseCode(c); setShowCourseSuggestions(false); }}
                    style={{ padding: "8px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: PC.navy }}
                    onMouseEnter={function (e) { e.currentTarget.style.background = DY.goldLight; }}
                    onMouseLeave={function (e) { e.currentTarget.style.background = "white"; }}
                  >{c}</div>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: PC.textMuted, marginBottom: 4 }}>Sınıf</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {SINIF_TAGS.map(function (t) {
              var isActive = tag === t;
              return (
                <button key={t} onClick={function () { setTag(isActive ? "" : t); }} style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 11,
                  fontWeight: isActive ? 700 : 500, cursor: "pointer",
                  border: "1px solid " + (isActive ? DY.gold : PC.border),
                  background: isActive ? DY.goldLight : "white",
                  color: isActive ? DY.goldDark : PC.textMuted,
                }}>{t}</button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Etiket Ekleme */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: PC.textMuted, marginBottom: 4 }}>Etiketler</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: tags.length > 0 ? 8 : 0 }}>
          {tags.map(function (t, idx) {
            return (
              <span key={idx} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                background: isCourseCode(t) ? DY.goldLight : "#E0E7FF",
                color: isCourseCode(t) ? DY.goldDark : "#4F46E5",
                border: "1px solid " + (isCourseCode(t) ? DY.goldBorder : "#C7D2FE"),
              }}>
                #{t}
                <button
                  onClick={function () { setTags(function (prev) { return prev.filter(function (_, i) { return i !== idx; }); }); }}
                  style={{
                    padding: 0, border: "none", background: "transparent",
                    cursor: "pointer", fontSize: 14, lineHeight: 1, fontWeight: 700,
                    color: isCourseCode(t) ? DY.goldDark : "#4F46E5",
                  }}
                >{"\u2715"}</button>
              </span>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={tagInput}
            onChange={function (e) { setTagInput(e.target.value.replace(/\s/g, "")); }}
            onKeyDown={function (e) {
              if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                e.preventDefault();
                var newTag = tagInput.replace(/^#/, "").trim();
                if (newTag && tags.map(function (t) { return t.toUpperCase(); }).indexOf(newTag.toUpperCase()) < 0) {
                  setTags(function (prev) { return prev.concat([newTag]); });
                }
                setTagInput("");
              }
              if (e.key === "Backspace" && !tagInput && tags.length > 0) {
                setTags(function (prev) { return prev.slice(0, -1); });
              }
            }}
            placeholder="#FinalHazırlık, #MAT101..."
            style={{
              flex: 1, padding: "6px 12px", border: "1px solid " + PC.border,
              borderRadius: 8, fontSize: 12, outline: "none",
            }}
          />
        </div>
        <div style={{ fontSize: 10, color: PC.textMuted, marginTop: 3 }}>
          Enter veya virgül ile ekleyin. İçerikteki #etiketler otomatik algılanır.
        </div>
      </div>

      {/* Dosya Ekleme */}
      <div
        onDragOver={function (e) { e.preventDefault(); setDragOver(true); }}
        onDragLeave={function () { setDragOver(false); }}
        onDrop={handleDrop}
        style={{
          marginTop: 12, padding: file ? "10px 14px" : "16px",
          border: "2px dashed " + (dragOver ? DY.gold : file ? DY.goldBorder : PC.border),
          borderRadius: 10, textAlign: "center",
          background: dragOver ? DY.warmLight : file ? DY.goldLight + "60" : "transparent",
          cursor: "pointer", transition: "all 0.2s",
        }}
        onClick={function () { if (!file && fileInputRef.current) fileInputRef.current.click(); }}
      >
        <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xlsx,.pptx,.txt"
          style={{ display: "none" }}
          onChange={function (e) { if (e.target.files[0]) handleFileSelect(e.target.files[0]); }}
        />
        {file ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {filePreview ? (
              <img src={filePreview} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
            ) : (
              <SvgIcon path={ICONS.file} size={28} color={DY.gold} />
            )}
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: PC.navy }}>{file.name}</div>
              <div style={{ fontSize: 11, color: PC.textMuted }}>{(file.size / 1024).toFixed(0)} KB</div>
            </div>
            <button onClick={function (e) { e.stopPropagation(); setFile(null); setFilePreview(null); }}
              style={{ padding: 4, border: "none", background: "transparent", cursor: "pointer" }}
            ><SvgIcon path={ICONS.x} size={16} color="#EF4444" /></button>
          </div>
        ) : (
          <div>
            <SvgIcon path={ICONS.upload} size={24} color={DY.gold} />
            <div style={{ fontSize: 12, color: PC.textMuted, marginTop: 6 }}>
              Dosya sürükleyin veya <span style={{ color: DY.gold, fontWeight: 600 }}>seçin</span>
            </div>
            <div style={{ fontSize: 10, color: PC.textMuted, marginTop: 2 }}>Resim, PDF, DOC, XLSX (max 5MB)</div>
          </div>
        )}
      </div>

      {/* Kaynak URL */}
      {category === "kaynak" && (
        <input
          value={resourceUrl}
          onChange={function (e) { setResourceUrl(e.target.value); }}
          placeholder="Kaynak linki (https://...)"
          style={{
            width: "100%", padding: "10px 14px", border: "1px solid " + PC.border,
            borderRadius: 10, fontSize: 13, marginTop: 12, outline: "none",
          }}
        />
      )}

      {/* Anket seçenekleri */}
      {category === "anket" && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: PC.navy }}>Anket Seçenekleri</div>
          {pollOptions.map(function (opt, idx) {
            return (
              <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: PC.textMuted, width: 20 }}>{idx + 1}.</span>
                <input
                  value={opt}
                  onChange={function (e) {
                    var updated = [...pollOptions];
                    updated[idx] = e.target.value;
                    setPollOptions(updated);
                  }}
                  placeholder={"Seçenek " + (idx + 1)}
                  style={{
                    flex: 1, padding: "8px 12px", border: "1px solid " + PC.border,
                    borderRadius: 8, fontSize: 13, outline: "none",
                  }}
                />
                {pollOptions.length > 2 && (
                  <button
                    onClick={function () { setPollOptions(pollOptions.filter(function (_, i) { return i !== idx; })); }}
                    style={{ padding: 4, border: "none", background: "transparent", cursor: "pointer", color: "#EF4444" }}
                  >X</button>
                )}
              </div>
            );
          })}
          {pollOptions.length < 6 && (
            <button
              onClick={addPollOption}
              style={{
                padding: "6px 12px", border: "1px dashed " + PC.border,
                borderRadius: 8, background: "transparent", cursor: "pointer",
                fontSize: 12, color: PC.textMuted,
              }}
            >+ Seçenek Ekle</button>
          )}
          {/* Anket Ayarları */}
          <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: PC.textMuted, cursor: "pointer" }}>
              <input type="checkbox" checked={pollAnonymous} onChange={function (e) { setPollAnonymous(e.target.checked); }} />
              Anonim oylama
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: PC.textMuted, cursor: "pointer" }}>
              <input type="checkbox" checked={pollMultiSelect} onChange={function (e) { setPollMultiSelect(e.target.checked); }} />
              Çoklu seçim
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <SvgIcon path={ICONS.clock} size={14} color={PC.textMuted} />
              <input type="datetime-local" value={pollDeadline}
                onChange={function (e) { setPollDeadline(e.target.value); }}
                style={{ padding: "4px 8px", border: "1px solid " + PC.border, borderRadius: 6, fontSize: 11, outline: "none" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Gönder */}
      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px", border: "1px solid " + PC.border,
              borderRadius: 10, background: "white", cursor: "pointer",
              fontSize: 14, color: PC.textMuted,
            }}
          >İptal</button>
        )}
        <button
          onClick={handleSubmit}
          disabled={posting || uploading || isHtmlEmpty(content)}
          style={{
            padding: "10px 24px", border: "none", borderRadius: 10,
            background: posting || isHtmlEmpty(content) ? PC.border : "linear-gradient(135deg, " + DY.gold + ", " + DY.goldDark + ")",
            color: "white", cursor: posting ? "wait" : "pointer",
            fontSize: 14, fontWeight: 700,
            boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
          }}
        >{uploading ? "Yükleniyor..." : posting ? "Gönderiliyor..." : "Paylaş"}</button>
      </div>
    </div>
  );
};

// ── Seviye Çubuğu ──
const LevelBar = ({ xp }) => {
  var lvlInfo = getUserLevel(xp);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: lvlInfo.current.color,
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          Seviye {lvlInfo.current.level} — {lvlInfo.current.label}
        </span>
        <span style={{ fontSize: 10, color: PC.textMuted }}>{xp} XP</span>
      </div>
      <div className="level-bar-container" style={{
        height: 8, background: PC.bg, borderRadius: 4, overflow: "hidden",
        border: "1px solid " + PC.borderLight,
      }}>
        <div className="level-bar-fill" style={{
          height: "100%", width: lvlInfo.progress + "%",
          background: "linear-gradient(90deg, " + lvlInfo.current.color + ", " + (lvlInfo.next ? lvlInfo.next.color : lvlInfo.current.color) + ")",
          borderRadius: 4, transition: "width 0.8s ease",
          position: "relative",
        }} />
      </div>
      {lvlInfo.next && (
        <div style={{ fontSize: 9, color: PC.textMuted, marginTop: 2, textAlign: "right" }}>
          Sonraki: {lvlInfo.next.label} ({lvlInfo.next.minXP} XP)
        </div>
      )}
    </div>
  );
};

// ── Rozet Gösterimi ──
const BadgeDisplay = ({ badges, compact }) => {
  if (!badges || badges.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: compact ? 4 : 6 }}>
      {badges.map(function (b) {
        return (
          <span key={b.id} title={b.label + " — " + b.desc} className="badge-item" style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            padding: compact ? "2px 6px" : "4px 10px",
            borderRadius: 10, fontSize: compact ? 11 : 12,
            background: "linear-gradient(135deg, #FFFBEB, #FEF3C7)",
            border: "1px solid " + DY.goldBorder,
            cursor: "default", transition: "all 0.15s",
            fontWeight: 600, color: DY.warm,
          }}>
            <span style={{ fontSize: compact ? 13 : 16 }}>{b.emoji}</span>
            {!compact && b.label}
          </span>
        );
      })}
    </div>
  );
};

// ── Kullanıcı Profil Sayfası (Detaylı) ──
const UserProfilePage = ({ targetUserId, targetUserName, currentUser, posts, onClose, onFollowUser, followedUsers }) => {
  var userId = getUserId(currentUser);
  var isOwnProfile = targetUserId === userId;
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editBolum, setEditBolum] = useState("");
  const [editSinif, setEditSinif] = useState("");
  const [editCourses, setEditCourses] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");

  var userPosts = posts.filter(function (p) { return p.authorId === targetUserId; });
  var stats = calculateUserStats(targetUserId, posts);
  var xp = calculateXP(stats);
  var lvlInfo = getUserLevel(xp);
  var badges = getUserBadges(stats);
  var isFollowed = followedUsers && followedUsers.indexOf(targetUserId) >= 0;

  useEffect(function () {
    PortalDB.getProfile(targetUserId).then(function (p) {
      if (p) {
        setProfile(p);
        setEditBio(p.bio || "");
        setEditBolum(p.bolum || "");
        setEditSinif(p.sinif || "");
        setEditCourses((p.courses || []).join(", "));
      }
    }).catch(function () { });
  }, [targetUserId]);

  var handleSave = async function () {
    setSaving(true);
    var data = {
      bio: editBio.trim(),
      bolum: editBolum,
      sinif: editSinif,
      courses: editCourses.split(",").map(function (c) { return c.trim(); }).filter(Boolean),
      name: currentUser.name || "Anonim",
    };
    await PortalDB.updateProfile(targetUserId, data);
    setProfile(Object.assign({}, profile, data));
    setEditing(false);
    setSaving(false);
  };

  var tabPosts = useMemo(function () {
    if (activeTab === "posts") return userPosts;
    if (activeTab === "notes") return userPosts.filter(function (p) { return p.category === "not"; });
    if (activeTab === "questions") return userPosts.filter(function (p) { return p.category === "soru"; });
    return userPosts;
  }, [activeTab, userPosts]);

  return (
    <div className="daisy-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Başlık bandı */}
      <div style={{
        background: "linear-gradient(135deg, " + lvlInfo.current.color + "20, " + DY.goldLight + ")",
        padding: "24px 24px 16px", position: "relative",
        borderBottom: "1px solid " + PC.borderLight,
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 12, padding: "4px 10px",
          border: "1px solid " + PC.border, borderRadius: 8, background: "white",
          cursor: "pointer", fontSize: 12, fontWeight: 600, color: PC.textMuted,
        }}>{"\u2715"} Kapat</button>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Avatar name={targetUserName} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: PC.navy, margin: 0 }}>{targetUserName}</h2>
              <span className="level-badge" style={{
                padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                background: lvlInfo.current.color + "20", color: lvlInfo.current.color,
                border: "1px solid " + lvlInfo.current.color + "40",
              }}>Lv.{lvlInfo.current.level} {lvlInfo.current.label}</span>
              {!isOwnProfile && onFollowUser && (
                <button onClick={function () { onFollowUser(targetUserId); }}
                  className="follow-btn-inline" style={{
                    padding: "4px 12px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                    border: "1px solid " + (isFollowed ? "#10B981" : DY.gold),
                    background: isFollowed ? "#D1FAE5" : DY.goldLight,
                    color: isFollowed ? "#059669" : DY.goldDark, cursor: "pointer",
                  }}>{isFollowed ? "Takip Ediliyor" : "+ Takip Et"}</button>
              )}
            </div>
            {profile && profile.bolum && (
              <div style={{ fontSize: 12, color: PC.textMuted, marginTop: 4 }}>
                {profile.bolum}{profile.sinif ? " · " + profile.sinif : ""}
              </div>
            )}
            {profile && profile.bio && (
              <div style={{ fontSize: 13, color: PC.text, marginTop: 6, lineHeight: 1.5 }}>{profile.bio}</div>
            )}
            <LevelBar xp={xp} />
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 24px" }}>
        {/* İstatistikler */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { v: stats.postCount, l: "Gönderi", c: "#F59E0B" },
            { v: stats.totalVoteScore, l: "Oy Puanı", c: stats.totalVoteScore >= 0 ? "#16A34A" : "#DC2626" },
            { v: stats.totalReactions, l: "Tepki", c: "#EC4899" },
            { v: stats.bestAnswerCount, l: "En İyi Cevap", c: "#8B5CF6" },
            { v: xp, l: "XP", c: lvlInfo.current.color },
          ].map(function (s) {
            return (
              <div key={s.l} style={{ textAlign: "center", padding: "10px 4px", background: s.c + "10", borderRadius: 10, border: "1px solid " + s.c + "20" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, color: PC.textMuted, fontWeight: 500 }}>{s.l}</div>
              </div>
            );
          })}
        </div>

        {/* Rozetler */}
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: DY.warm, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <SvgIcon path={ICONS.star} size={14} color={DY.gold} /> Rozetler ({badges.length}/{BADGES.length})
          </h4>
          {badges.length > 0 ? (
            <BadgeDisplay badges={badges} />
          ) : (
            <div style={{ fontSize: 12, color: PC.textMuted }}>Henüz rozet kazanılmadı. Paylaşarak ve yardım ederek rozetler kazanın!</div>
          )}
          {/* Kazanılmamış rozetler */}
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {BADGES.filter(function (b) { return !b.check(stats); }).map(function (b) {
              return (
                <span key={b.id} title={b.desc} className="badge-item badge-item-locked" style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "3px 8px", borderRadius: 8, fontSize: 11,
                  background: PC.bg, color: PC.textMuted,
                  border: "1px dashed " + PC.border,
                }}>
                  <span style={{ fontSize: 13 }}>{b.emoji}</span>
                  {b.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Dersler */}
        {profile && profile.courses && profile.courses.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: DY.warm, marginBottom: 6 }}>Aldığı Dersler</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {profile.courses.map(function (c, i) {
                return (
                  <span key={i} style={{
                    padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: isCourseCode(c) ? DY.goldLight : "#E0E7FF",
                    color: isCourseCode(c) ? DY.goldDark : "#4F46E5",
                  }}>{c}</span>
                );
              })}
            </div>
          </div>
        )}

        {/* Profil Düzenleme (kendi profili ise) */}
        {isOwnProfile && (
          <div style={{ marginBottom: 16 }}>
            {editing ? (
              <div style={{ padding: 16, background: PC.bg, borderRadius: 12, border: "1px solid " + PC.border }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: DY.warm, marginBottom: 10 }}>Profili Düzenle</h4>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: PC.textMuted }}>Biyografi</label>
                  <textarea value={editBio} onChange={function (e) { setEditBio(e.target.value); }} rows={3}
                    placeholder="Kendinizden bahsedin..." className="profile-edit-field"
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid " + PC.border, fontSize: 13, resize: "vertical", marginTop: 4, outline: "none", fontFamily: "inherit" }} />
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: PC.textMuted }}>Bölüm</label>
                    <select value={editBolum} onChange={function (e) { setEditBolum(e.target.value); }}
                      style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid " + PC.border, fontSize: 12, marginTop: 4, outline: "none" }}>
                      <option value="">Seçiniz</option>
                      {BOLUMLER.map(function (b) { return <option key={b} value={b}>{b}</option>; })}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: PC.textMuted }}>Sınıf</label>
                    <select value={editSinif} onChange={function (e) { setEditSinif(e.target.value); }}
                      style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid " + PC.border, fontSize: 12, marginTop: 4, outline: "none" }}>
                      <option value="">Seçiniz</option>
                      {SINIF_TAGS.map(function (s) { return <option key={s} value={s}>{s}</option>; })}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: PC.textMuted }}>Aldığı Dersler (virgülle ayırın)</label>
                  <input value={editCourses} onChange={function (e) { setEditCourses(e.target.value); }}
                    placeholder="BIL301, MAT201, FIZ101"
                    style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid " + PC.border, fontSize: 12, marginTop: 4, outline: "none" }} />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={function () { setEditing(false); }}
                    style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid " + PC.border, background: "white", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    İptal
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, " + DY.gold + ", " + DY.goldDark + ")", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
                    {saving ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={function () { setEditing(true); }}
                style={{
                  padding: "8px 16px", border: "1px solid " + PC.border, borderRadius: 10,
                  background: "white", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  color: PC.navy, display: "flex", alignItems: "center", gap: 6,
                }}>
                <SvgIcon path={ICONS.edit} size={14} color={PC.navy} /> Profili Düzenle
              </button>
            )}
          </div>
        )}

        {/* Gönderi Geçmişi */}
        <div>
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {[
              { id: "posts", label: "Tüm Gönderiler (" + userPosts.length + ")" },
              { id: "notes", label: "Notlar" },
              { id: "questions", label: "Sorular" },
            ].map(function (tab) {
              var isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={function () { setActiveTab(tab.id); }}
                  style={{
                    padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: isActive ? 700 : 500,
                    border: "none", background: isActive ? DY.goldLight : PC.bg,
                    color: isActive ? DY.warm : PC.textMuted, cursor: "pointer",
                  }}>{tab.label}</button>
              );
            })}
          </div>
          {tabPosts.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: PC.textMuted, fontSize: 13 }}>Gönderi bulunamadı.</div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {tabPosts.slice(0, 10).map(function (p) {
                var cat = getCategoryInfo(p.category);
                return (
                  <div key={p.id} style={{
                    padding: "10px 0", borderBottom: "1px solid " + PC.borderLight,
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}>
                    <CategoryBadge category={p.category} small />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: PC.navy, lineHeight: 1.4 }}>
                        {p.title || (p.contentFormat === "html" ? stripHtmlTags(p.content).substring(0, 60) : (p.content || "").substring(0, 60))}
                      </div>
                      <div style={{ fontSize: 10, color: PC.textMuted, marginTop: 2 }}>
                        {timeAgo(p.createdAt)} · {getVoteScore(p)} oy · {getReactionTotal(p.reactions)} tepki · {p.commentCount || 0} yorum
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Liderlik Tablosu ──
const LeaderboardPanel = ({ posts, allUsers, currentUser }) => {
  const [period, setPeriod] = useState("all"); // all, month, week
  const [category, setCategory] = useState("general"); // general, notes, questions
  const [deptFilter, setDeptFilter] = useState("all");
  const [profiles, setProfiles] = useState({});

  // Profil verilerini yükle (bölüm filtresi için)
  useEffect(function () {
    var ref = PortalDB.profilesRef();
    if (!ref) return;
    ref.get().then(function (snap) {
      var data = {};
      snap.forEach(function (doc) { data[doc.id] = doc.data(); });
      setProfiles(data);
    }).catch(function () {});
  }, []);

  var leaderboard = useMemo(function () {
    var now = new Date();
    var filteredPosts = posts;

    // Zaman filtresi
    if (period === "week") {
      var weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredPosts = posts.filter(function (p) {
        var d = p.createdAt && p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        return d >= weekAgo;
      });
    } else if (period === "month") {
      var monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredPosts = posts.filter(function (p) {
        var d = p.createdAt && p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        return d >= monthAgo;
      });
    }

    // Kullanıcı bazlı toplama
    var userMap = {};
    filteredPosts.forEach(function (p) {
      if (!p.authorId) return;
      if (!userMap[p.authorId]) {
        userMap[p.authorId] = { id: p.authorId, name: p.authorName, postCount: 0, noteCount: 0, questionCount: 0, voteScore: 0, reactions: 0, bestAnswers: 0 };
      }
      var u = userMap[p.authorId];
      u.postCount++;
      if (p.category === "not") u.noteCount++;
      if (p.category === "soru") u.questionCount++;
      u.voteScore += getVoteScore(p);
      u.reactions += getReactionTotal(p.reactions);
      if (p.bestAnswerId) u.bestAnswers++;
    });

    var users = Object.values(userMap);

    // Bölüm filtresi
    if (deptFilter !== "all") {
      users = users.filter(function (u) {
        var prof = profiles[u.id];
        return prof && prof.bolum === deptFilter;
      });
    }

    // Kategori sıralaması
    if (category === "notes") {
      users.sort(function (a, b) { return b.noteCount - a.noteCount; });
    } else if (category === "questions") {
      users.sort(function (a, b) { return b.bestAnswers - a.bestAnswers; });
    } else {
      // Genel: XP bazlı
      users.forEach(function (u) {
        u.score = (u.postCount * 10) + (u.reactions * 2) + (Math.max(0, u.voteScore) * 5) + (u.bestAnswers * 20) + (u.noteCount * 5);
      });
      users.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    }

    return users.slice(0, 10);
  }, [posts, period, category, deptFilter, profiles]);

  var medalColors = ["#F59E0B", "#9CA3AF", "#CD7F32"];

  return (
    <div style={{
      background: "white", borderRadius: 16, padding: 20,
      border: "1px solid " + PC.borderLight,
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: DY.warm, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <SvgIcon path={ICONS.trending} size={18} color={DY.gold} /> Liderlik Tablosu
      </h3>

      {/* Dönem seçici */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {[
          { id: "all", label: "Tüm Zamanlar" },
          { id: "month", label: "Bu Ay" },
          { id: "week", label: "Bu Hafta" },
        ].map(function (p) {
          var isActive = period === p.id;
          return (
            <button key={p.id} onClick={function () { setPeriod(p.id); }}
              style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: isActive ? 700 : 500,
                border: "none", background: isActive ? DY.goldLight : PC.bg,
                color: isActive ? DY.warm : PC.textMuted, cursor: "pointer",
              }}>{p.label}</button>
          );
        })}
      </div>

      {/* Kategori seçici */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {[
          { id: "general", label: "Genel" },
          { id: "notes", label: "Not Paylaşımı" },
          { id: "questions", label: "Cevaplar" },
        ].map(function (c) {
          var isActive = category === c.id;
          return (
            <button key={c.id} onClick={function () { setCategory(c.id); }}
              style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: isActive ? 700 : 500,
                border: "none", background: isActive ? "#E0E7FF" : PC.bg,
                color: isActive ? "#4F46E5" : PC.textMuted, cursor: "pointer",
              }}>{c.label}</button>
          );
        })}
      </div>

      {/* Bölüm filtresi */}
      <div style={{ marginBottom: 12 }}>
        <select
          value={deptFilter}
          onChange={function (e) { setDeptFilter(e.target.value); }}
          style={{
            width: "100%", padding: "4px 8px", borderRadius: 6, fontSize: 10,
            border: "1px solid " + PC.borderLight, background: PC.bg, color: PC.navy,
            cursor: "pointer",
          }}
        >
          <option value="all">Tüm Bölümler</option>
          {BOLUMLER.map(function (b) { return <option key={b} value={b}>{b}</option>; })}
        </select>
      </div>

      {/* Liste */}
      {leaderboard.length === 0 ? (
        <div style={{ padding: 16, textAlign: "center", color: PC.textMuted, fontSize: 12 }}>Bu dönemde veri yok.</div>
      ) : (
        leaderboard.map(function (user, idx) {
          var isSelf = user.id === getUserId(currentUser);
          var stats = calculateUserStats(user.id, posts);
          var userXP = calculateXP(stats);
          var userLvl = getUserLevel(userXP);
          return (
            <div key={user.id} className="leaderboard-row" style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 0",
              borderBottom: idx < leaderboard.length - 1 ? "1px solid " + PC.borderLight : "none",
              background: isSelf ? DY.goldLight + "40" : "transparent",
              borderRadius: isSelf ? 8 : 0,
              padding: isSelf ? "8px 6px" : "8px 0",
            }}>
              <span style={{
                width: 22, textAlign: "center", fontWeight: 800, fontSize: 14,
                color: idx < 3 ? medalColors[idx] : PC.textMuted,
              }}>
                {idx < 3 ? ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"][idx] : (idx + 1)}
              </span>
              <Avatar name={user.name} size={28} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: isSelf ? DY.warm : PC.navy }}>
                  {user.name} {isSelf && <span style={{ fontSize: 9, opacity: 0.6 }}>(sen)</span>}
                </div>
                <div style={{ fontSize: 10, color: PC.textMuted }}>
                  Lv.{userLvl.current.level} · {category === "notes" ? user.noteCount + " not" : category === "questions" ? user.bestAnswers + " cevap" : (user.score || 0) + " puan"}
                </div>
              </div>
              <span style={{
                padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                background: userLvl.current.color + "20", color: userLvl.current.color,
              }}>{userLvl.current.label}</span>
            </div>
          );
        })
      )}
    </div>
  );
};

// ── İstatistik Kartı ──
const StatCard = ({ label, value, color, icon }) => (
  <div className="daisy-card" style={{
    padding: 18, display: "flex", alignItems: "center", gap: 14,
    flex: 1, minWidth: 140,
  }}>
    <div style={{
      width: 46, height: 46, borderRadius: 12,
      background: "linear-gradient(135deg, " + color + "20, " + color + "10)",
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "1px solid " + color + "25",
    }}>
      <SvgIcon path={ICONS[icon]} size={22} color={color} />
    </div>
    <div>
      <div style={{ fontSize: 24, fontWeight: 800, color: DY.warm }}>{value}</div>
      <div style={{ fontSize: 12, color: PC.textMuted, fontWeight: 500 }}>{label}</div>
    </div>
  </div>
);

// ── Trend Konular Sidebar ──
const TrendingSidebar = ({ posts }) => {
  // En çok etkileşim alan 5 gönderi
  var trending = [...posts]
    .map(function (p) {
      return Object.assign({}, p, { engagement: getVoteScore(p) * 3 + getReactionTotal(p.reactions) + (p.commentCount || 0) + (p.views || 0) });
    })
    .sort(function (a, b) { return b.engagement - a.engagement; })
    .slice(0, 5);

  if (trending.length === 0) return null;

  return (
    <div style={{
      background: "white", borderRadius: 16, padding: 20,
      border: "1px solid " + PC.borderLight,
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: DY.warm, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <SvgIcon path={ICONS.trending} size={18} color={DY.gold} /> Trend Konular
      </h3>
      {trending.map(function (p, idx) {
        return (
          <div key={p.id} style={{
            padding: "10px 0",
            borderBottom: idx < trending.length - 1 ? "1px solid " + PC.borderLight : "none",
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{
                fontWeight: 800, fontSize: 16, color: PC.gold,
                width: 20, textAlign: "center",
              }}>{idx + 1}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: PC.navy, lineHeight: 1.4 }}>
                  {p.title || (p.contentFormat === "html" ? stripHtmlTags(p.content).substring(0, 50) : (p.content || "").substring(0, 50)) + "..."}
                </div>
                <div style={{ fontSize: 11, color: PC.textMuted, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: getVoteScore(p) > 0 ? "#16A34A" : getVoteScore(p) < 0 ? "#DC2626" : PC.textMuted, fontWeight: 600 }}>
                    {getVoteScore(p) > 0 ? "+" : ""}{getVoteScore(p)} oy
                  </span>
                  · {getReactionTotal(p.reactions)} tepki · {p.commentCount || 0} yorum
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Takip Edilen Sidebar ──
const FollowingSidebar = ({ followData, onFollowUser, onFollowTag, allUsers, posts }) => {
  var followedUserNames = useMemo(function () {
    return followData.users.map(function (uid) {
      var user = allUsers.find(function (u) { return u.id === uid; });
      return user ? user.name : uid;
    });
  }, [followData.users, allUsers]);

  if (followData.users.length === 0 && followData.tags.length === 0) return null;

  return (
    <div style={{
      background: "white", borderRadius: 16, padding: 20,
      border: "1px solid " + PC.borderLight,
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: DY.warm, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <SvgIcon path={ICONS.heart} size={16} color={DY.gold} /> Takip Edilenler
      </h3>

      {/* Takip edilen kullanıcılar */}
      {followData.users.length > 0 && (
        <div style={{ marginBottom: followData.tags.length > 0 ? 14 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: PC.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Kullanıcılar ({followData.users.length})
          </div>
          {followData.users.map(function (uid, idx) {
            var userName = followedUserNames[idx];
            return (
              <div key={uid} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
                borderBottom: idx < followData.users.length - 1 ? "1px solid " + PC.borderLight : "none",
              }}>
                <Avatar name={userName} size={24} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: PC.navy }}>{userName}</span>
                <button
                  onClick={function () { onFollowUser(uid); }}
                  style={{
                    padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 600,
                    border: "1px solid #EF4444", background: "#FEF2F2", color: "#EF4444",
                    cursor: "pointer",
                  }}
                >{"\u2715"}</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Takip edilen etiketler */}
      {followData.tags.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: PC.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Etiketler ({followData.tags.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {followData.tags.map(function (tag) {
              return (
                <span key={tag} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                  background: isCourseCode(tag) ? DY.goldLight : "#E0E7FF",
                  color: isCourseCode(tag) ? DY.goldDark : "#4F46E5",
                  cursor: "pointer",
                }}>
                  #{tag}
                  <button
                    onClick={function () { onFollowTag(tag); }}
                    style={{
                      padding: 0, border: "none", background: "transparent",
                      cursor: "pointer", color: "inherit", fontSize: 12, fontWeight: 700,
                      lineHeight: 1, marginLeft: 2,
                    }}
                  >{"\u2715"}</button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Popüler Etiketler Bulutu ──
const TagCloud = ({ posts, onFilterTag, activeTag, onFollowTag, followedTags }) => {
  var tagCounts = useMemo(function () { return getAllTags(posts); }, [posts]);

  var sortedTags = useMemo(function () {
    return Object.keys(tagCounts)
      .map(function (t) { return { tag: t, count: tagCounts[t] }; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 20);
  }, [tagCounts]);

  if (sortedTags.length === 0) return null;

  var maxCount = sortedTags[0].count;

  return (
    <div style={{
      background: "white", borderRadius: 16, padding: 20,
      border: "1px solid " + PC.borderLight,
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: DY.warm, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={DY.gold} strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
        Popüler Etiketler
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {sortedTags.map(function (item) {
          var isActive = activeTag === item.tag;
          var intensity = Math.max(0.4, item.count / maxCount);
          var isCourse = isCourseCode(item.tag);
          return (
            <button
              key={item.tag}
              onClick={function () { onFilterTag(isActive ? "" : item.tag); }}
              style={{
                padding: "4px 10px", borderRadius: 12,
                fontSize: 10 + Math.round(intensity * 4), fontWeight: isActive ? 700 : 500,
                border: isActive ? "2px solid " + (isCourse ? DY.gold : "#6366F1") : "1px solid " + PC.border,
                background: isActive
                  ? (isCourse ? DY.goldLight : "#E0E7FF")
                  : "rgba(255,255,255," + (1 - intensity * 0.3) + ")",
                color: isCourse ? DY.goldDark : "#4F46E5",
                cursor: "pointer",
                transition: "all 0.15s",
                opacity: isActive ? 1 : (0.6 + intensity * 0.4),
              }}
              onMouseEnter={function (e) { e.currentTarget.style.transform = "scale(1.05)"; }}
              onMouseLeave={function (e) { e.currentTarget.style.transform = "scale(1)"; }}
              title={item.count + " gönderi"}
            >
              #{item.tag}
              <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.7 }}>{item.count}</span>
              {onFollowTag && (
                <span
                  onClick={function (e) { e.stopPropagation(); onFollowTag(item.tag); }}
                  title={followedTags && followedTags.indexOf(item.tag) >= 0 ? "Takipten çık" : "Takip et"}
                  style={{
                    marginLeft: 4, fontSize: 10, fontWeight: 700,
                    color: followedTags && followedTags.indexOf(item.tag) >= 0 ? "#10B981" : PC.textMuted,
                  }}
                >{followedTags && followedTags.indexOf(item.tag) >= 0 ? "\u2713" : "+"}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Toast Bildirim ──
const ToastContainer = ({ toasts }) => {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 8,
      pointerEvents: "none",
    }}>
      {toasts.map(function (t) {
        var bgColor = t.type === "error" ? "#FEE2E2" : t.type === "info" ? "#DBEAFE" : "#D1FAE5";
        var borderColor = t.type === "error" ? "#EF4444" : t.type === "info" ? "#3B82F6" : "#10B981";
        var textColor = t.type === "error" ? "#991B1B" : t.type === "info" ? "#1E40AF" : "#065F46";
        var icon = t.type === "error" ? "\u2716" : t.type === "info" ? "\u2139" : "\u2714";
        return (
          <div key={t.id} style={{
            padding: "12px 20px", borderRadius: 12,
            background: bgColor, border: "1px solid " + borderColor,
            color: textColor, fontSize: 13, fontWeight: 600,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            display: "flex", alignItems: "center", gap: 8,
            animation: "fadeInRight 0.3s ease",
            pointerEvents: "auto",
          }}>
            <span style={{ fontSize: 15 }}>{icon}</span>
            {t.message}
          </div>
        );
      })}
    </div>
  );
};

// ── Seviye Atlama Bildirimi ──
const LevelUpNotification = ({ levelInfo, onClose }) => {
  if (!levelInfo) return null;
  return (
    <div className="level-up-notification" style={{
      position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
      zIndex: 10000, background: "linear-gradient(135deg, " + (levelInfo.color || DY.gold) + ", " + DY.goldDark + ")",
      color: "white", padding: "16px 32px", borderRadius: 16,
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
      minWidth: 280, justifyContent: "center",
    }} onClick={onClose}>
      <span style={{ fontSize: 32 }}>{"\uD83C\uDF89"}</span>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.9, textTransform: "uppercase", letterSpacing: 1 }}>Seviye Atladın!</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Lv.{levelInfo.level} {levelInfo.label}</div>
      </div>
      <span style={{ fontSize: 32 }}>{"\u2B50"}</span>
    </div>
  );
};

// ── Yukarı Kaydır Butonu ──
const ScrollToTopButton = () => {
  var showBtn = useScrollTop(400);
  if (!showBtn) return null;
  return (
    <button
      onClick={function () { window.scrollTo({ top: 0, behavior: "smooth" }); }}
      title="Yukarı Kaydır"
      style={{
        position: "fixed", bottom: 28, right: 28, zIndex: 9998,
        width: 48, height: 48, borderRadius: "50%",
        border: "none", background: "linear-gradient(135deg, " + PC.navy + ", " + PC.navyLight + ")",
        color: "white", cursor: "pointer",
        boxShadow: "0 4px 16px rgba(27,42,74,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeInUp 0.3s ease",
        transition: "transform 0.2s",
      }}
      onMouseEnter={function (e) { e.currentTarget.style.transform = "scale(1.1)"; }}
      onMouseLeave={function (e) { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
};

// ── Bildirim Zili ──
const NotificationBell = ({ currentUser }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  var userId = getUserId(currentUser);

  useEffect(function () {
    var load = function () {
      PortalDB.fetchNotifications(userId, 10).then(function (notifs) {
        setNotifications(notifs);
        setUnread(notifs.filter(function (n) { return !n.read; }).length);
      }).catch(function () { });
    };
    load();
    var interval = setInterval(load, 30000);
    return function () { clearInterval(interval); };
  }, [userId]);

  return (
    <div style={{ position: "relative" }}>
      <button onClick={function () { setOpen(!open); }}
        style={{ padding: 8, border: "none", background: "transparent", cursor: "pointer", position: "relative", borderRadius: 8 }}
        title="Bildirimler"
      >
        <SvgIcon path={ICONS.bell} size={22} color={DY.warm} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%",
            background: "#EF4444", color: "white", fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, width: 320, maxHeight: 400, overflow: "auto",
          background: "white", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          border: "1px solid " + PC.borderLight, zIndex: 100,
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid " + PC.borderLight, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: DY.warm }}>Bildirimler</span>
            {unread > 0 && (
              <button onClick={function () {
                PortalDB.markAllNotificationsRead(userId).then(function () {
                  setNotifications(notifications.map(function (n) { return Object.assign({}, n, { read: true }); }));
                  setUnread(0);
                });
              }} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 11, color: DY.gold, fontWeight: 600 }}>
                Tümünü Okundu İşaretle
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: PC.textMuted, fontSize: 13 }}>Henüz bildirim yok</div>
          ) : notifications.map(function (n) {
            return (
              <div key={n.id} style={{ padding: "10px 16px", borderBottom: "1px solid " + PC.borderLight, background: n.read ? "transparent" : DY.warmLight }}>
                <div style={{ fontSize: 13, color: PC.navy }}>{n.message || "Bildirim"}</div>
                <div style={{ fontSize: 11, color: PC.textMuted, marginTop: 2 }}>{n.createdAt ? timeAgo(n.createdAt) : ""}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Kullanıcı Profil Kartı ──
const UserProfileCard = ({ currentUser, posts, onViewProfile }) => {
  var userId = getUserId(currentUser);
  var stats = calculateUserStats(userId, posts);
  var xp = calculateXP(stats);
  var lvlInfo = getUserLevel(xp);
  var badges = getUserBadges(stats);

  return (
    <div className="daisy-card" style={{ padding: 20, marginBottom: 16 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 10,
        cursor: onViewProfile ? "pointer" : "default",
      }}
        onClick={function () { if (onViewProfile) onViewProfile(userId, currentUser.name); }}
      >
        <Avatar name={currentUser.name} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: DY.warm }}>{currentUser.name || "Anonim"}</span>
            <span className="level-badge" style={{
              padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700,
              background: lvlInfo.current.color + "20", color: lvlInfo.current.color,
            }}>Lv.{lvlInfo.current.level}</span>
          </div>
          <div style={{ fontSize: 11, color: PC.textMuted }}>{lvlInfo.current.label} · {xp} XP</div>
        </div>
      </div>
      <LevelBar xp={xp} />
      {badges.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <BadgeDisplay badges={badges} compact />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginTop: 10 }}>
        {[
          { v: stats.postCount, l: "Gönderi" },
          { v: stats.totalVoteScore, l: "Oy", color: stats.totalVoteScore > 0 ? "#16A34A" : stats.totalVoteScore < 0 ? "#DC2626" : undefined },
          { v: stats.totalReactions, l: "Tepki" },
          { v: stats.bestAnswerCount, l: "Çözüm" },
        ].map(function (item) {
          return (
            <div key={item.l} style={{ textAlign: "center", padding: "6px 0", background: DY.warmLight, borderRadius: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: item.color || DY.warm }}>{item.v}</div>
              <div style={{ fontSize: 9, color: PC.textMuted }}>{item.l}</div>
            </div>
          );
        })}
      </div>
      {onViewProfile && (
        <button onClick={function () { onViewProfile(userId, currentUser.name); }}
          style={{
            width: "100%", marginTop: 10, padding: "8px 0", border: "1px solid " + PC.border,
            borderRadius: 10, background: "white", cursor: "pointer",
            fontSize: 12, fontWeight: 600, color: PC.navy,
            transition: "all 0.2s",
          }}
          onMouseEnter={function (e) { e.currentTarget.style.background = DY.goldLight; e.currentTarget.style.borderColor = DY.gold; }}
          onMouseLeave={function (e) { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = PC.border; }}
        >
          <SvgIcon path={ICONS.user} size={13} color={PC.navy} /> Profilimi Gör
        </button>
      )}
    </div>
  );
};

// ── Mobil Sidebar Drawer ──
const MobileSidebarToggle = ({ children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={function () { setOpen(!open); }}
        style={{
          width: "100%", padding: "12px 16px", border: "1px solid " + PC.border,
          borderRadius: 12, background: "white", cursor: "pointer",
          fontSize: 13, fontWeight: 600, color: PC.navy,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: open ? 12 : 0,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Trend & İstatistikler
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
          {children}
        </div>
      )}
    </div>
  );
};

// ── Gelişmiş Arama Çubuğu ──
const AdvancedSearchBar = ({ value, onChange, posts, onFilterTag, dateRange, onDateRangeChange, tagFilter, onTagFilterChange }) => {
  const [focused, setFocused] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  var inputRef = useRef(null);

  // Otomatik tamamlama önerileri
  var suggestions = useMemo(function () {
    if (!value || value.length < 2 || !focused) return [];
    var q = value.toLowerCase();
    var results = [];
    var seen = {};

    // Başlık eşleşmeleri
    posts.forEach(function (p) {
      if (p.title && p.title.toLowerCase().includes(q) && !seen["title:" + p.id]) {
        seen["title:" + p.id] = true;
        results.push({ type: "post", text: p.title, id: p.id, category: p.category });
      }
    });

    // Yazar eşleşmeleri
    posts.forEach(function (p) {
      if (p.authorName && p.authorName.toLowerCase().includes(q) && !seen["author:" + p.authorName]) {
        seen["author:" + p.authorName] = true;
        results.push({ type: "author", text: p.authorName });
      }
    });

    // Etiket eşleşmeleri
    var allTagCounts = getAllTags(posts);
    Object.keys(allTagCounts).forEach(function (t) {
      if (t.toLowerCase().includes(q) && !seen["tag:" + t]) {
        seen["tag:" + t] = true;
        results.push({ type: "tag", text: t, count: allTagCounts[t] });
      }
    });

    return results.slice(0, 8);
  }, [value, posts, focused]);

  var handleSuggestionClick = function (s) {
    if (s.type === "tag") {
      if (onFilterTag) onFilterTag(s.text);
      onChange("");
    } else {
      onChange(s.text);
    }
    setFocused(false);
    if (inputRef.current) inputRef.current.blur();
  };

  return (
    <div style={{ flex: 1, maxWidth: 500, position: "relative" }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={focused ? DY.gold : PC.textMuted}
            strokeWidth="2" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", transition: "all 0.2s" }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={value}
            onChange={function (e) { onChange(e.target.value); }}
            onFocus={function () { setFocused(true); }}
            onBlur={function () { setTimeout(function () { setFocused(false); }, 200); }}
            placeholder="Gönderi, yazar veya #etiket ara..."
            style={{
              width: "100%", padding: "10px 14px 10px 42px",
              border: "1px solid " + (focused ? DY.gold : PC.border), borderRadius: 12,
              fontSize: 14, outline: "none", background: "white",
              transition: "border-color 0.2s",
              boxShadow: focused ? "0 0 0 3px " + DY.goldLight : "none",
            }}
          />
          {value && (
            <button
              onClick={function () { onChange(""); if (inputRef.current) inputRef.current.focus(); }}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                padding: 2, border: "none", background: "transparent",
                cursor: "pointer", color: PC.textMuted, fontSize: 14, lineHeight: 1,
              }}
            >{"\u2715"}</button>
          )}
        </div>
        {/* Gelişmiş Filtreler Toggle */}
        <button
          onClick={function () { setShowAdvanced(!showAdvanced); }}
          title="Gelişmiş Filtreler"
          style={{
            padding: "10px 12px", border: "1px solid " + (showAdvanced ? DY.gold : PC.border),
            borderRadius: 12, background: showAdvanced ? DY.goldLight : "white",
            cursor: "pointer", color: showAdvanced ? DY.goldDark : PC.textMuted,
            display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
            transition: "all 0.2s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
          </svg>
          Filtre
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {focused && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
          background: "white", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          border: "1px solid " + PC.borderLight, zIndex: 100, overflow: "hidden",
        }}>
          {suggestions.map(function (s, idx) {
            var icon, label, color;
            if (s.type === "post") { icon = "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"; label = "Gönderi"; color = PC.navy; }
            else if (s.type === "author") { icon = "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"; label = "Yazar"; color = "#3B82F6"; }
            else { icon = "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01"; label = "#Etiket"; color = "#6366F1"; }
            return (
              <div
                key={idx}
                onMouseDown={function () { handleSuggestionClick(s); }}
                style={{
                  padding: "10px 16px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 10,
                  borderBottom: idx < suggestions.length - 1 ? "1px solid " + PC.borderLight : "none",
                }}
                onMouseEnter={function (e) { e.currentTarget.style.background = PC.bg; }}
                onMouseLeave={function (e) { e.currentTarget.style.background = "white"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                  <path d={icon} />
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: PC.navy }}>{highlightText(s.text, value)}</div>
                  <div style={{ fontSize: 10, color: PC.textMuted }}>{label}{s.count ? " (" + s.count + " gönderi)" : ""}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Gelişmiş Filtreler Paneli */}
      {showAdvanced && (
        <div style={{
          marginTop: 8, padding: 16, background: "white",
          borderRadius: 12, border: "1px solid " + PC.border,
          display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end",
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: PC.textMuted, marginBottom: 4 }}>Başlangıç Tarihi</div>
            <input
              type="date"
              value={dateRange.start || ""}
              onChange={function (e) { onDateRangeChange({ start: e.target.value, end: dateRange.end }); }}
              style={{
                padding: "6px 10px", border: "1px solid " + PC.border,
                borderRadius: 8, fontSize: 12, outline: "none",
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: PC.textMuted, marginBottom: 4 }}>Bitiş Tarihi</div>
            <input
              type="date"
              value={dateRange.end || ""}
              onChange={function (e) { onDateRangeChange({ start: dateRange.start, end: e.target.value }); }}
              style={{
                padding: "6px 10px", border: "1px solid " + PC.border,
                borderRadius: 8, fontSize: 12, outline: "none",
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: PC.textMuted, marginBottom: 4 }}>Etiket Filtresi</div>
            <input
              value={tagFilter}
              onChange={function (e) { onTagFilterChange(e.target.value); }}
              placeholder="#etiket"
              style={{
                padding: "6px 10px", border: "1px solid " + PC.border,
                borderRadius: 8, fontSize: 12, outline: "none", width: 120,
              }}
            />
          </div>
          {(dateRange.start || dateRange.end || tagFilter) && (
            <button
              onClick={function () { onDateRangeChange({ start: "", end: "" }); onTagFilterChange(""); }}
              style={{
                padding: "6px 14px", border: "1px solid " + PC.border,
                borderRadius: 8, background: "white", cursor: "pointer",
                fontSize: 12, color: "#EF4444", fontWeight: 600,
              }}
            >Filtreleri Temizle</button>
          )}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// ANA MODÜL BİLEŞENİ
// ══════════════════════════════════════════════════════════════

function OgrenciPortaliApp({ currentUser }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("tumu");
  const [showNewPost, setShowNewPost] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("newest"); // newest, popular, comments, bookmarked, following
  const [authorFilter, setAuthorFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [toasts, setToasts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const [highlightedPostId, setHighlightedPostId] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [followData, setFollowData] = useState({ users: [], tags: [] });
  const [viewProfile, setViewProfile] = useState(null); // { userId, userName }
  const [levelUpInfo, setLevelUpInfo] = useState(null);
  const prevLevelRef = useRef(null);
  const loadMoreRef = useRef(null);
  var isMobile = useIsMobile(768);
  var isAdmin = currentUser && (currentUser.isAdmin || currentUser.email === "tunahan@example.com"); // Geçici admin kontrolü
  var userId = getUserId(currentUser);

  useEffect(function () {
    var params = new URLSearchParams(window.location.search);
    var pid = params.get("post");
    if (pid) setHighlightedPostId(pid);
  }, []);

  // Kullanıcı listesini yükle (mention autocomplete için)
  useEffect(function () {
    PortalDB.fetchAllUsers().then(function (users) { setAllUsers(users); }).catch(function () { });
  }, [posts.length]);

  // Takip verilerini yükle
  useEffect(function () {
    PortalDB.getFollows(userId).then(function (data) { setFollowData(data); }).catch(function () { });
  }, [userId]);

  // Seviye atlama kontrolü
  useEffect(function () {
    if (!userId || posts.length === 0) return;
    var stats = calculateUserStats(userId, posts);
    var xp = calculateXP(stats);
    var lvlInfo = getUserLevel(xp);
    if (prevLevelRef.current !== null && lvlInfo.current.level > prevLevelRef.current) {
      setLevelUpInfo(lvlInfo.current);
      setTimeout(function () { setLevelUpInfo(null); }, 4000);
    }
    prevLevelRef.current = lvlInfo.current.level;
  }, [posts, userId]);

  // Takip fonksiyonları
  var handleFollowUser = async function (targetUserId) {
    try {
      var updatedUsers = await PortalDB.toggleFollowUser(userId, targetUserId);
      setFollowData(function (prev) { return Object.assign({}, prev, { users: updatedUsers }); });
      var wasFollowing = followData.users.indexOf(targetUserId) >= 0;
      showToast(wasFollowing ? "Takipten çıkıldı" : "Takip edildi");
    } catch (err) { console.error("Takip hatası:", err); }
  };

  var handleFollowTag = async function (tag) {
    try {
      var updatedTags = await PortalDB.toggleFollowTag(userId, tag);
      setFollowData(function (prev) { return Object.assign({}, prev, { tags: updatedTags }); });
      var wasFollowing = followData.tags.indexOf(tag) >= 0;
      showToast(wasFollowing ? "Etiket takipten çıkıldı" : "Etiket takip edildi");
    } catch (err) { console.error("Etiket takip hatası:", err); }
  };

  var handleViewProfile = function (uid, name) {
    setViewProfile({ userId: uid, userName: name });
  };

  var showToast = function (message, type) {
    var id = Date.now() + Math.random();
    setToasts(function (prev) { return [].concat(prev, [{ id: id, message: message, type: type || "success" }]); });
    setTimeout(function () {
      setToasts(function (prev) { return prev.filter(function (t) { return t.id !== id; }); });
    }, 3000);
  };

  // Yer imleri (localStorage)
  const [bookmarks, setBookmarks] = useState(function () {
    try {
      var saved = localStorage.getItem("portal_bookmarks");
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  var handleToggleBookmark = function (postId) {
    var wasBookmarked = bookmarks.indexOf(postId) >= 0;
    setBookmarks(function (prev) {
      var idx = prev.indexOf(postId);
      var updated;
      if (idx >= 0) {
        updated = prev.filter(function (id) { return id !== postId; });
      } else {
        updated = [].concat(prev, [postId]);
      }
      try { localStorage.setItem("portal_bookmarks", JSON.stringify(updated)); } catch (e) { }
      return updated;
    });
    showToast(wasBookmarked ? "Yer iminden kaldırıldı" : "Yer imine eklendi");
  };

  // Gerçek zamanlı dinleme (onSnapshot)
  useEffect(function () {
    var ref = PortalDB.postsRef();
    if (!ref) { setLoading(false); return; }
    var query = ref.orderBy("createdAt", "desc");
    if (activeCategory && activeCategory !== "tumu") {
      query = query.where("category", "==", activeCategory);
    }
    query = query.limit(50);
    var unsubscribe = query.onSnapshot(function (snapshot) {
      var fetched = snapshot.docs.map(function (doc) {
        return Object.assign({}, doc.data(), { id: doc.id });
      });
      setPosts(fetched);
      setLoading(false);
    }, function (err) {
      console.error("Gönderiler yüklenemedi:", err);
      setLoading(false);
    });
    return function () { unsubscribe(); };
  }, [activeCategory]);

  // Sonsuz kaydırma
  useEffect(function () {
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        setVisibleCount(function (prev) { return prev + POSTS_PER_PAGE; });
      }
    }, { threshold: 0.1 });
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return function () { if (loadMoreRef.current) observer.unobserve(loadMoreRef.current); };
  }, [visibleCount]);

  // Yeni gönderi
  const handleNewPost = async function (postData) {
    var saved = await PortalDB.createPost(postData);
    setPosts(function (prev) { return [saved, ...prev]; });
    setShowNewPost(false);
    showToast("Gönderi başarıyla paylaşıldı!");
    // Mention bildirimleri gönder
    var mentions = extractMentions(postData.content);
    mentions.forEach(function (mentionedName) {
      var mentionedUser = allUsers.find(function (u) { return u.name.toLowerCase() === mentionedName.toLowerCase(); });
      if (mentionedUser && mentionedUser.id !== userId) {
        PortalDB.addNotification(mentionedUser.id, {
          type: "mention",
          message: (currentUser.name || "Birisi") + " sizi bir gönderide bahsetti: \"" + (postData.title || "Gönderi") + "\"",
          postId: saved.id,
          fromUser: currentUser.name,
        });
      }
    });
  };

  // Reaksiyon
  const handleReact = async function (postId, reactionType) {
    var userId = getUserId(currentUser);
    try {
      var updatedReactions = await PortalDB.toggleReaction(postId, reactionType, userId);
      setPosts(function (prev) {
        return prev.map(function (p) {
          return p.id === postId ? Object.assign({}, p, { reactions: updatedReactions }) : p;
        });
      });
    } catch (err) {
      console.error("Reaksiyon hatası:", err);
    }
  };

  // Gönderi oyu (yukarı/aşağı)
  const handleVotePost = async function (postId, voteType) {
    var userId = getUserId(currentUser);
    try {
      var result = await PortalDB.toggleVote(postId, voteType, userId);
      setPosts(function (prev) {
        return prev.map(function (p) {
          return p.id === postId ? Object.assign({}, p, result) : p;
        });
      });
    } catch (err) {
      console.error("Oy hatası:", err);
    }
  };

  // Anket oyu
  const handleVote = async function (postId, optionIndex) {
    var userId = getUserId(currentUser);
    try {
      var updatedVotes = await PortalDB.votePoll(postId, optionIndex, userId);
      setPosts(function (prev) {
        return prev.map(function (p) {
          return p.id === postId ? Object.assign({}, p, { pollVotes: updatedVotes }) : p;
        });
      });
    } catch (err) {
      console.error("Oy hatası:", err);
    }
  };

  // Gönderi sil
  const handleDelete = async function (postId) {
    try {
      await PortalDB.deletePost(postId);
      setPosts(function (prev) { return prev.filter(function (p) { return p.id !== postId; }); });
      showToast("Gönderi silindi");
    } catch (err) {
      console.error("Silme hatası:", err);
      showToast("Silme başarısız!", "error");
    }
  };

  // Gönderi düzenle
  const handleEdit = async function (postId, updates) {
    try {
      await PortalDB.updatePost(postId, Object.assign({}, updates, {
        editedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      }));
      setPosts(function (prev) {
        return prev.map(function (p) {
          return p.id === postId ? Object.assign({}, p, updates, { editedAt: new Date() }) : p;
        });
      });
      showToast("Gönderi düzenlendi");
    } catch (err) {
      console.error("Düzenleme hatası:", err);
      showToast("Düzenleme başarısız!", "error");
      throw err;
    }
  };

  // Gönderi sabitle/kaldır (admin)
  const handleTogglePin = async function (postId, pinned) {
    try {
      await PortalDB.updatePost(postId, { pinned: pinned });
      setPosts(function (prev) {
        return prev.map(function (p) {
          return p.id === postId ? Object.assign({}, p, { pinned: pinned }) : p;
        });
      });
      showToast(pinned ? "Gönderi sabitlendi" : "Sabitleme kaldırıldı");
    } catch (err) {
      console.error("Pin hatası:", err);
    }
  };

  // Arama + sıralama filtresi
  var filteredPosts = useMemo(function () {
    if (highlightedPostId) return posts.filter(function (p) { return p.id === highlightedPostId; });
    var result = posts;
    // Tam metin arama
    if (searchQuery.trim()) {
      var q = searchQuery.toLowerCase();
      result = result.filter(function (p) {
        var searchContent = p.contentFormat === "html"
          ? stripHtmlTags(p.content).toLowerCase()
          : (p.content || "").toLowerCase();
        var tagText = (p.tags || []).join(" ").toLowerCase();
        return (p.title && p.title.toLowerCase().includes(q)) ||
          searchContent.includes(q) ||
          (p.authorName && p.authorName.toLowerCase().includes(q)) ||
          tagText.includes(q) ||
          (p.courseCode && p.courseCode.toLowerCase().includes(q));
      });
    }
    // Yazar filtresi
    if (authorFilter) {
      result = result.filter(function (p) { return p.authorName === authorFilter; });
    }
    // Etiket filtresi
    if (tagFilter) {
      var tf = tagFilter.replace(/^#/, "").toLowerCase();
      result = result.filter(function (p) {
        var postTags = (p.tags || []).map(function (t) { return t.toLowerCase(); });
        return postTags.indexOf(tf) >= 0 || (p.courseCode && p.courseCode.toLowerCase() === tf);
      });
    }
    // Tarih aralığı filtresi
    if (dateRange.start) {
      var startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      result = result.filter(function (p) {
        if (!p.createdAt) return false;
        var postDate = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        return postDate >= startDate;
      });
    }
    if (dateRange.end) {
      var endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter(function (p) {
        if (!p.createdAt) return false;
        var postDate = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        return postDate <= endDate;
      });
    }
    // Kaydedilenler filtresi
    if (sortMode === "bookmarked") {
      result = result.filter(function (p) { return bookmarks.indexOf(p.id) >= 0; });
    }
    // Takip edilen akış filtresi
    if (sortMode === "following") {
      result = result.filter(function (p) {
        // Takip edilen kullanıcıların gönderileri
        if (followData.users.indexOf(p.authorId) >= 0) return true;
        // Takip edilen etiketlerin gönderileri
        var postTags = (p.tags || []).map(function (t) { return t.toLowerCase(); });
        if (p.courseCode) postTags.push(p.courseCode.toLowerCase());
        var followedTags = followData.tags.map(function (t) { return t.toLowerCase(); });
        for (var i = 0; i < followedTags.length; i++) {
          if (postTags.indexOf(followedTags[i]) >= 0) return true;
        }
        return false;
      });
    }
    // Sıralama
    if (sortMode === "popular") {
      result = [...result].sort(function (a, b) {
        var scoreA = getVoteScore(a) * 3 + getReactionTotal(a.reactions) + (a.views || 0) * 0.1;
        var scoreB = getVoteScore(b) * 3 + getReactionTotal(b.reactions) + (b.views || 0) * 0.1;
        return scoreB - scoreA;
      });
    } else if (sortMode === "comments") {
      result = [...result].sort(function (a, b) {
        return (b.commentCount || 0) - (a.commentCount || 0);
      });
    }
    return result;
  }, [posts, searchQuery, sortMode, bookmarks, authorFilter, tagFilter, dateRange, followData]);

  // Sabitlenmiş gönderileri ayır
  var pinnedPosts = filteredPosts.filter(function (p) { return p.pinned; });
  var regularPosts = filteredPosts.filter(function (p) { return !p.pinned; });

  // İstatistikler
  var totalReactions = 0;
  posts.forEach(function (p) { totalReactions += getReactionTotal(p.reactions); });
  var totalComments = 0;
  posts.forEach(function (p) { totalComments += (p.commentCount || 0); });

  return (
    <div className="portal-bg">
      <div className="portal-wrap">
        {/* Toast Bildirimler */}
        <ToastContainer toasts={toasts} />
        <LevelUpNotification levelInfo={levelUpInfo} onClose={function () { setLevelUpInfo(null); }} />
        {/* Yukarı Kaydır */}
        <ScrollToTopButton />

        {/* Başlık */}
        <div style={{
          marginBottom: 24, display: "flex", justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "flex-start",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 12 : 16,
        }}>
          <div>
            <h1 style={{
              fontSize: isMobile ? 22 : 28, fontWeight: 700, color: PC.navy,
              fontFamily: "'Playfair Display', serif", marginBottom: 4,
            }}>Öğrenci Portalı
              <span style={{ display: "inline-block", marginLeft: 8 }}>
                <SvgIcon path={ICONS.daisy} size={28} color={DY.gold} fill={DY.goldLight} />
              </span>
            </h1>
            <p style={{ color: PC.textMuted, fontSize: 14 }}>
              Yardımlaşma, bilgi paylaşımı ve sosyal etkileşim platformu
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <NotificationBell currentUser={currentUser} />
            <button
              onClick={function () { setShowNewPost(!showNewPost); }}
              style={{
                padding: "12px 24px", border: "none", borderRadius: 12,
                background: showNewPost ? PC.textMuted : "linear-gradient(135deg, " + DY.gold + ", " + DY.goldDark + ")",
                color: "white", cursor: "pointer", fontSize: 14, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 4px 16px rgba(27,42,74,0.25)",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: 18 }}>{showNewPost ? "\u2715" : "+"}</span>
              {showNewPost ? "Kapat" : "Yeni Gönderi"}
            </button>
          </div>
        </div>

        {/* İstatistikler */}

        {/* İstatistikler */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: 12, marginBottom: 24,
        }}>
          <StatCard label="Toplam Gönderi" value={posts.length} color="#F59E0B" icon="file" />
          <StatCard label="Tepkiler" value={totalReactions} color="#EF4444" icon="heart" />
          <StatCard label="Yorumlar" value={totalComments} color="#10B981" icon="chat" />
          <StatCard label="Üyeler" value={new Set(posts.map(function (p) { return p.authorId; })).size || 0} color="#8B5CF6" icon="users" />
        </div>
        {highlightedPostId && (
          <div style={{
            marginBottom: 16, padding: "12px 16px", background: DY.goldLight,
            border: "1px solid " + DY.gold, borderRadius: 12,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span style={{ fontWeight: 600, color: DY.goldDark, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <SvgIcon path={ICONS.pin} size={16} color={DY.goldDark} /> Tek bir gönderi görüntüleniyor
            </span>
            <button
              onClick={function () {
                setHighlightedPostId(null);
                window.history.pushState({}, document.title, window.location.pathname);
              }}
              style={{
                border: "none", background: "white", padding: "6px 12px", borderRadius: 8,
                fontSize: 12, fontWeight: 700, color: PC.navy, cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
              }}
            >Tümünü Gör</button>
          </div>
        )}


        {/* Arama + Kategori Filtreleri */}
        <div style={{
          display: "flex", gap: isMobile ? 10 : 16, marginBottom: 24,
          alignItems: isMobile ? "stretch" : "center",
          flexDirection: isMobile ? "column" : "row",
          flexWrap: "wrap",
        }}>
          <AdvancedSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            posts={posts}
            onFilterTag={setTagFilter}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            tagFilter={tagFilter}
            onTagFilterChange={setTagFilter}
          />

          {/* Yazar filtresi badge */}
          {authorFilter && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 20,
              background: PC.blueLight, border: "1px solid " + PC.blue,
              fontSize: 12, fontWeight: 600, color: PC.blue,
              alignSelf: isMobile ? "flex-start" : "center",
            }}>
              <Avatar name={authorFilter} size={20} />
              {authorFilter}
              <button
                onClick={function () { setAuthorFilter(""); }}
                style={{
                  padding: 0, border: "none", background: "transparent",
                  cursor: "pointer", color: PC.blue, fontSize: 14, fontWeight: 700,
                  marginLeft: 4, lineHeight: 1,
                }}
              >{"\u2715"}</button>
            </div>
          )}

          {/* Etiket filtresi badge */}
          {tagFilter && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 20,
              background: isCourseCode(tagFilter.replace(/^#/, "")) ? DY.goldLight : "#E0E7FF",
              border: "1px solid " + (isCourseCode(tagFilter.replace(/^#/, "")) ? DY.gold : "#6366F1"),
              fontSize: 12, fontWeight: 600,
              color: isCourseCode(tagFilter.replace(/^#/, "")) ? DY.goldDark : "#4F46E5",
              alignSelf: isMobile ? "flex-start" : "center",
            }}>
              #{tagFilter.replace(/^#/, "")}
              <button
                onClick={function () { setTagFilter(""); }}
                style={{
                  padding: 0, border: "none", background: "transparent",
                  cursor: "pointer", color: "inherit", fontSize: 14, fontWeight: 700,
                  marginLeft: 4, lineHeight: 1,
                }}
              >{"\u2715"}</button>
            </div>
          )}

          {/* Sıralama */}
          <div style={{
            display: "flex", gap: 4, background: PC.bg, borderRadius: 10, padding: 3,
            overflowX: isMobile ? "auto" : "visible",
            WebkitOverflowScrolling: "touch",
          }}>
            {[
              { id: "newest", label: "En Yeni", icon: "clock" },
              { id: "popular", label: "En Popüler", icon: "trending" },
              { id: "following", label: "Takip", icon: "heart" },
              { id: "comments", label: "En Çok Yorum", icon: "chat" },
              { id: "bookmarked", label: "Kaydedilenler", icon: "bookmark" },
            ].map(function (s) {
              var isActive = sortMode === s.id;
              return (
                <button
                  key={s.id}
                  onClick={function () { setSortMode(s.id); }}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 12,
                    fontWeight: isActive ? 700 : 500, cursor: "pointer",
                    border: "none", whiteSpace: "nowrap",
                    background: isActive ? "white" : "transparent",
                    color: isActive ? PC.navy : PC.textMuted,
                    boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                    transition: "all 0.2s",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                ><SvgIcon path={ICONS[s.icon]} size={13} color={isActive ? DY.gold : PC.textMuted} />{s.label}</button>
              );
            })}
          </div>

          <div style={{
            display: "flex", gap: 4,
            flexWrap: isMobile ? "nowrap" : "wrap",
            overflowX: isMobile ? "auto" : "visible",
            WebkitOverflowScrolling: "touch",
            paddingBottom: isMobile ? 4 : 0,
          }}>
            <button
              onClick={function () { setActiveCategory("tumu"); }}
              style={{
                padding: "8px 16px", borderRadius: 20, fontSize: 13,
                fontWeight: activeCategory === "tumu" ? 700 : 500, cursor: "pointer",
                border: activeCategory === "tumu" ? "2px solid " + PC.navy : "1px solid " + PC.border,
                background: activeCategory === "tumu" ? PC.navy : "white",
                color: activeCategory === "tumu" ? "white" : PC.textMuted,
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >Tümü</button>
            {PORTAL_CATEGORIES.map(function (cat) {
              var isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={function () { setActiveCategory(cat.id); }}
                  style={{
                    padding: "8px 14px", borderRadius: 20, fontSize: 12,
                    fontWeight: isActive ? 700 : 500, cursor: "pointer",
                    border: isActive ? "2px solid " + cat.color : "1px solid " + PC.border,
                    background: isActive ? cat.bg : "white",
                    color: isActive ? cat.color : PC.textMuted,
                    transition: "all 0.15s",
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}
                ><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><SvgIcon path={ICONS[cat.icon]} size={13} color={isActive ? cat.color : PC.textMuted} /> {cat.label}</span></button>
              );
            })}
          </div>
        </div>

        {/* Ana İçerik: Feed + Sidebar */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 300px",
          gap: isMobile ? 16 : 24,
          alignItems: "start",
        }}>
          {/* Sol: Feed */}
          <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
            {/* Yeni gönderi formu */}
            {showNewPost && (
              <NewPostForm
                currentUser={currentUser}
                onPost={handleNewPost}
                onClose={function () { setShowNewPost(false); }}
                allUsers={allUsers}
              />
            )}

            {/* Yükleniyor */}
            {loading && (
              <div style={{ padding: 40, textAlign: "center", color: PC.textMuted }}>
                <div style={{ fontSize: 16, marginBottom: 8 }}>Gönderiler yükleniyor...</div>
              </div>
            )}

            {/* Boş durum */}
            {!loading && filteredPosts.length === 0 && (
              <div className="daisy-card" style={{
                padding: 60, textAlign: "center",
              }}>
                <div style={{ marginBottom: 16 }}><SvgIcon path={ICONS.file} size={48} color={DY.gold} /></div>
                <div style={{ fontSize: 18, fontWeight: 700, color: PC.navy, marginBottom: 8 }}>
                  {(searchQuery || tagFilter || authorFilter || dateRange.start || dateRange.end) ? "Sonuç bulunamadı" : "Henüz gönderi yok"}
                </div>
                <div style={{ fontSize: 14, color: PC.textMuted }}>
                  {(searchQuery || tagFilter || authorFilter || dateRange.start || dateRange.end)
                    ? "Farklı bir arama terimi veya filtre deneyin."
                    : "İlk gönderiyi oluşturarak topluluğu başlatın!"}
                </div>
                {!searchQuery && (
                  <button
                    onClick={function () { setShowNewPost(true); }}
                    style={{
                      marginTop: 16, padding: "10px 24px", border: "none",
                      borderRadius: 10, background: PC.navy, color: "white",
                      cursor: "pointer", fontSize: 14, fontWeight: 600,
                    }}
                  >İlk Gönderiyi Yaz</button>
                )}
              </div>
            )}

            {/* Sabitlenmiş gönderiler */}
            {pinnedPosts.map(function (post) {
              return (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onReact={handleReact}
                  onVote={handleVote}
                  onVotePost={handleVotePost}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onTogglePin={handleTogglePin}
                  isBookmarked={bookmarks.indexOf(post.id) >= 0}
                  onToggleBookmark={handleToggleBookmark}
                  onFilterAuthor={setAuthorFilter}
                  onFilterTag={setTagFilter}
                  allUsers={allUsers}
                  onFollowUser={handleFollowUser}
                  followedUsers={followData.users}
                  onViewProfile={handleViewProfile}
                />
              );
            })}

            {/* Normal gönderiler */}
            {regularPosts.slice(0, visibleCount).map(function (post) {
              return (
                <PostCard
                  key={post.id}
                  post={post}
                  userId={getUserId(currentUser)}
                  currentUser={currentUser}
                  onReact={handleReact}
                  onVote={handleVote}
                  onVotePost={handleVotePost}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onTogglePin={handleTogglePin}
                  onToggleBookmark={handleToggleBookmark}
                  isBookmarked={bookmarks.indexOf(post.id) >= 0}
                  isAdmin={isAdmin}
                  onFilterAuthor={setAuthorFilter}
                  onFilterTag={setTagFilter}
                  allUsers={allUsers}
                  onFollowUser={handleFollowUser}
                  followedUsers={followData.users}
                  onViewProfile={handleViewProfile}
                />
              );
            })}
            {regularPosts.length > visibleCount && (
              <div ref={loadMoreRef} style={{ padding: 20, textAlign: "center", color: PC.textMuted }}>
                <SvgIcon path={ICONS.daisy} size={24} color={DY.gold} spin />
              </div>
            )}
          </div>

          {/* Sağ: Sidebar */}
          {isMobile ? (
            <MobileSidebarToggle>
              <UserProfileCard currentUser={currentUser} posts={posts} onViewProfile={handleViewProfile} />
              <TrendingSidebar posts={posts} />
              <FollowingSidebar followData={followData} onFollowUser={handleFollowUser} onFollowTag={handleFollowTag} allUsers={allUsers} posts={posts} />
              <TagCloud posts={posts} onFilterTag={setTagFilter} activeTag={tagFilter.replace(/^#/, "")} onFollowTag={handleFollowTag} followedTags={followData.tags} />
              <LeaderboardPanel posts={posts} allUsers={allUsers} currentUser={currentUser} />

              <div style={{
                background: "white", borderRadius: 16, padding: 20,
                border: "1px solid " + PC.borderLight,
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: PC.navy, marginBottom: 14 }}>
                  Kategori Dağılımı
                </h3>
                {PORTAL_CATEGORIES.map(function (cat) {
                  var count = posts.filter(function (p) { return p.category === cat.id; }).length;
                  var pct = posts.length > 0 ? Math.round((count / posts.length) * 100) : 0;
                  return (
                    <div key={cat.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: cat.color, display: "inline-flex", alignItems: "center", gap: 4 }}><SvgIcon path={ICONS[cat.icon]} size={12} color={cat.color} /> {cat.label}</span>
                        <span style={{ color: PC.textMuted }}>{count}</span>
                      </div>
                      <div style={{ height: 6, background: PC.bg, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: pct + "%", background: cat.color,
                          borderRadius: 3, transition: "width 0.5s ease",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </MobileSidebarToggle>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 88 }}>
              <UserProfileCard currentUser={currentUser} posts={posts} onViewProfile={handleViewProfile} />
              <TrendingSidebar posts={posts} />
              <FollowingSidebar followData={followData} onFollowUser={handleFollowUser} onFollowTag={handleFollowTag} allUsers={allUsers} posts={posts} />
              <TagCloud posts={posts} onFilterTag={setTagFilter} activeTag={tagFilter.replace(/^#/, "")} onFollowTag={handleFollowTag} followedTags={followData.tags} />
              <LeaderboardPanel posts={posts} allUsers={allUsers} currentUser={currentUser} />

              <div style={{
                background: "white", borderRadius: 16, padding: 20,
                border: "1px solid " + PC.borderLight,
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: PC.navy, marginBottom: 14 }}>
                  Kategori Dağılımı
                </h3>
                {PORTAL_CATEGORIES.map(function (cat) {
                  var count = posts.filter(function (p) { return p.category === cat.id; }).length;
                  var pct = posts.length > 0 ? Math.round((count / posts.length) * 100) : 0;
                  return (
                    <div key={cat.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: cat.color, display: "inline-flex", alignItems: "center", gap: 4 }}><SvgIcon path={ICONS[cat.icon]} size={12} color={cat.color} /> {cat.label}</span>
                        <span style={{ color: PC.textMuted }}>{count}</span>
                      </div>
                      <div style={{ height: 6, background: PC.bg, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: pct + "%", background: cat.color,
                          borderRadius: 3, transition: "width 0.5s ease",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profil Sayfası Overlay */}
      {viewProfile && (
        <div className="profile-overlay" style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20, overflowY: "auto",
        }} onClick={function (e) { if (e.target === e.currentTarget) setViewProfile(null); }}>
          <div className="profile-card-enter" style={{ width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto", borderRadius: 20 }}>
            <UserProfilePage
              targetUserId={viewProfile.userId}
              targetUserName={viewProfile.userName}
              currentUser={currentUser}
              posts={posts}
              onClose={function () { setViewProfile(null); }}
              onFollowUser={handleFollowUser}
              followedUsers={followData.users}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Window'a export ──
window.OgrenciPortaliApp = OgrenciPortaliApp;
