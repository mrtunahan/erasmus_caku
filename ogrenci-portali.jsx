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
      ".portal-wrap{position:relative;z-index:1;}";
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
  { id: "like", emoji: "\uD83D\uDC4D" },
  { id: "love", emoji: "\u2764\uFE0F" },
  { id: "haha", emoji: "\uD83D\uDE04" },
  { id: "wow", emoji: "\uD83D\uDE2E" },
  { id: "fire", emoji: "\uD83D\uDD25" },
  { id: "clap", emoji: "\uD83D\uDC4F" },
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
    await ref.doc(String(commentId)).delete();
    // Yorum sayısını azalt
    var postRef = this.postsRef().doc(String(postId));
    await postRef.update({
      commentCount: window.firebase.firestore.FieldValue.increment(-1),
    });
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

// ── Reaction Bar ──
const ReactionBar = ({ reactions, postId, userId, onReact }) => {
  const [showPicker, setShowPicker] = useState(false);

  var totalCount = getReactionTotal(reactions);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
      <button
        onClick={function () { setShowPicker(!showPicker); }}
        style={{
          padding: "6px 12px", border: "1px solid " + PC.border,
          borderRadius: 20, background: "white", cursor: "pointer",
          fontSize: 13, display: "flex", alignItems: "center", gap: 6,
          transition: "all 0.2s",
        }}
        onMouseEnter={function (e) { e.currentTarget.style.background = PC.bg; }}
        onMouseLeave={function (e) { e.currentTarget.style.background = "white"; }}
      >
        <span>{"\uD83D\uDC4D"}</span>
        {totalCount > 0 && <span style={{ fontWeight: 600, color: PC.navy }}>{totalCount}</span>}
      </button>

      {/* Emoji Picker */}
      {showPicker && (
        <div style={{
          position: "absolute", bottom: "100%", left: 0,
          background: "white", borderRadius: 12, padding: 8,
          boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
          display: "flex", gap: 4, zIndex: 100,
          border: "1px solid " + PC.border,
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
                style={{
                  padding: "6px 10px", border: isActive ? "2px solid " + PC.blue : "1px solid transparent",
                  borderRadius: 8, background: isActive ? PC.blueLight : "transparent",
                  cursor: "pointer", fontSize: 20, display: "flex",
                  flexDirection: "column", alignItems: "center", gap: 2,
                  transition: "transform 0.15s",
                }}
                onMouseEnter={function (e) { e.currentTarget.style.transform = "scale(1.2)"; }}
                onMouseLeave={function (e) { e.currentTarget.style.transform = "scale(1)"; }}
              >
                {r.emoji}
                {count > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: PC.navy }}>{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Mevcut reaksiyonlar */}
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
            style={{
              padding: "4px 10px", border: isActive ? "1px solid " + PC.blue : "1px solid " + PC.border,
              borderRadius: 16, background: isActive ? PC.blueLight : "white",
              cursor: "pointer", fontSize: 14, display: "flex",
              alignItems: "center", gap: 4,
            }}
          >
            {r.emoji} <span style={{ fontSize: 12, fontWeight: 600, color: PC.navy }}>{arr.length}</span>
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
const CommentItem = ({ comment, postId, currentUser, onUpdate, onRemove }) => {
  var userId = getUserId(currentUser);
  var isOwner = comment.authorId === userId || currentUser.role === "admin";

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text || "");
  const [saving, setSaving] = useState(false);
  const [likes, setLikes] = useState(comment.likes || []);
  const [liking, setLiking] = useState(false);

  var isLiked = likes.indexOf(userId) >= 0;

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
    if (!editText.trim()) return;
    setSaving(true);
    try {
      await PortalDB.updateComment(postId, comment.id, {
        text: editText.trim(),
        editedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      });
      onUpdate(comment.id, editText.trim());
      setEditing(false);
    } catch (err) {
      console.error("Yorum düzenleme hatası:", err);
    }
    setSaving(false);
  };

  var handleDelete = async function () {
    if (!confirm("Bu yorumu silmek istediğinizden emin misiniz?")) return;
    try {
      await PortalDB.deleteComment(postId, comment.id);
      onRemove(comment.id);
    } catch (err) {
      console.error("Yorum silme hatası:", err);
    }
  };

  var handleCancel = function () {
    setEditText(comment.text || "");
    setEditing(false);
  };

  return (
    <div style={{
      display: "flex", gap: 10, padding: "10px 0",
      borderBottom: "1px solid " + PC.borderLight,
    }}>
      <Avatar name={comment.authorName} size={32} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: PC.navy }}>{comment.authorName}</span>
          <span style={{ fontSize: 11, color: PC.textMuted }}>{timeAgo(comment.createdAt)}</span>
          {comment.editedAt && (
            <span style={{ fontSize: 10, color: PC.textMuted, fontStyle: "italic" }}>(düzenlendi)</span>
          )}
          {/* Düzenle/Sil butonları */}
          {isOwner && !editing && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
              <button
                onClick={function () { setEditing(true); }}
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
                title="Sil"
                style={{
                  padding: 3, border: "none", background: "transparent",
                  cursor: "pointer", borderRadius: 4, color: PC.textMuted, fontSize: 0,
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
        {editing ? (
          <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
            <input
              value={editText}
              onChange={function (e) { setEditText(e.target.value); }}
              onKeyDown={function (e) {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
                if (e.key === "Escape") handleCancel();
              }}
              style={{
                flex: 1, padding: "6px 12px", borderRadius: 16,
                border: "1px solid " + PC.border, fontSize: 13,
                outline: "none", background: "white",
              }}
            />
            <button
              onClick={handleSave}
              disabled={saving || !editText.trim()}
              style={{
                padding: "4px 12px", borderRadius: 14, border: "none",
                background: saving || !editText.trim() ? PC.border : PC.navy,
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
        ) : (
          <>
            <div style={{ fontSize: 13, color: PC.text, marginTop: 4, lineHeight: 1.5 }}>{comment.text}</div>
            <button
              onClick={handleToggleLike}
              disabled={liking}
              style={{
                marginTop: 4, padding: "2px 8px", border: "none",
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
          </>
        )}
      </div>
    </div>
  );
};

// ── Yorum Bölümü ──
const CommentSection = ({ postId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  var viewIncremented = useRef(false);

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
      // Görüntülenme sayacını artır (ilk açılışta)
      if (!viewIncremented.current) {
        viewIncremented.current = true;
        PortalDB.incrementViews(postId);
      }
    } else {
      setOpen(false);
    }
  };

  const handleSubmit = async function () {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      var comment = {
        text: newComment.trim(),
        authorName: currentUser.name || "Anonim",
        authorId: getUserId(currentUser),
      };
      var saved = await PortalDB.addComment(postId, comment);
      setComments(function (prev) { return [...prev, saved]; });
      setNewComment("");
    } catch (err) {
      console.error("Yorum eklenemedi:", err);
    }
    setSending(false);
  };

  var handleCommentUpdate = function (commentId, newText) {
    setComments(function (prev) {
      return prev.map(function (c) {
        return c.id === commentId ? Object.assign({}, c, { text: newText, editedAt: new Date() }) : c;
      });
    });
  };

  var handleCommentRemove = function (commentId) {
    setComments(function (prev) {
      return prev.filter(function (c) { return c.id !== commentId; });
    });
  };

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
          {loading ? (
            <div style={{ textAlign: "center", color: PC.textMuted, padding: 12 }}>Yükleniyor...</div>
          ) : (
            <>
              {comments.length === 0 && (
                <div style={{ textAlign: "center", color: PC.textMuted, padding: 12, fontSize: 13 }}>
                  Henüz yorum yok. İlk yorumu siz yapın!
                </div>
              )}
              {comments.map(function (c) {
                return (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    postId={postId}
                    currentUser={currentUser}
                    onUpdate={handleCommentUpdate}
                    onRemove={handleCommentRemove}
                  />
                );
              })}
            </>
          )}

          {/* Yeni yorum */}
          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "flex-start" }}>
            <Avatar name={currentUser.name} size={32} />
            <div style={{ flex: 1, display: "flex", gap: 8 }}>
              <input
                value={newComment}
                onChange={function (e) { setNewComment(e.target.value); }}
                onKeyDown={function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                placeholder="Yorumunuzu yazın..."
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 20,
                  border: "1px solid " + PC.border, fontSize: 13,
                  outline: "none", background: "white",
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={sending || !newComment.trim()}
                style={{
                  padding: "8px 16px", borderRadius: 20,
                  border: "none", background: PC.navy, color: "white",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  opacity: (!newComment.trim() || sending) ? 0.5 : 1,
                }}
              >
                {sending ? "..." : "Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Gönderi Kartı ──
const PostCard = ({ post, currentUser, onReact, onVote, onDelete, onEdit, onTogglePin, isBookmarked, onToggleBookmark, onFilterAuthor }) => {
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
  var isLong = post.content && post.content.length > TRUNCATE_LEN;
  var displayContent = (!expanded && isLong) ? post.content.substring(0, TRUNCATE_LEN) + "..." : post.content;

  var handleSaveEdit = async function () {
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      await onEdit(post.id, { title: editTitle.trim(), content: editContent.trim() });
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

      <div style={{ padding: isMobile ? "16px" : "20px 24px" }}>
        {/* Üst kısım: avatar + yazar + zaman + kategori */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Avatar name={post.authorName} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span
                onClick={function () { if (onFilterAuthor) onFilterAuthor(post.authorName); }}
                style={{ fontWeight: 700, fontSize: 15, color: PC.navy, cursor: "pointer" }}
                onMouseEnter={function (e) { e.currentTarget.style.textDecoration = "underline"; }}
                onMouseLeave={function (e) { e.currentTarget.style.textDecoration = "none"; }}
                title={"\"" + post.authorName + "\" gönderilerini filtrele"}
              >{post.authorName}</span>
              <CategoryBadge category={post.category} small />
              {post.tag && (
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 4,
                  background: PC.bg, color: PC.textMuted, fontWeight: 600,
                }}>{post.tag}</span>
              )}
              {post.courseCode && (
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 4,
                  background: DY.goldLight, color: DY.goldDark, fontWeight: 700,
                  display: "inline-flex", alignItems: "center", gap: 3,
                }}>
                  <SvgIcon path={ICONS.book} size={10} color={DY.goldDark} />
                  {post.courseCode}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: PC.textMuted, marginTop: 2 }}>
              {timeAgo(post.createdAt)}
              {post.views > 0 && <span> · {post.views} görüntülenme</span>}
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
                disabled={saving || !editContent.trim()}
                style={{
                  padding: "6px 16px", border: "none", borderRadius: 8,
                  background: saving || !editContent.trim() ? PC.border : PC.navy,
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
            <div style={{
              fontSize: 14, color: PC.text, lineHeight: 1.7,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>{displayContent}</div>
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
          <CommentSection postId={post.id} currentUser={currentUser} />
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
      </div>
    </div>
  );
};

// ── Yeni Gönderi Formu ──
const NewPostForm = ({ currentUser, onPost, onClose }) => {
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
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  var courseSuggestions = useMemo(function () {
    if (!courseCode.trim()) return [];
    var q = courseCode.toUpperCase();
    return POPULAR_COURSES.filter(function (c) { return c.includes(q); }).slice(0, 5);
  }, [courseCode]);

  var handleFileSelect = function (f) {
    if (!f) return;
    if (f.size > FILE_MAX_SIZE) { alert("Dosya boyutu 5MB'dan büyük olamaz."); return; }
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
    if (!content.trim()) return;
    setPosting(true);
    try {
      var post = {
        category: category, title: title.trim(), content: content.trim(),
        tag: tag || "", courseCode: courseCode.trim().toUpperCase() || "",
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
      setTitle(""); setContent(""); setResourceUrl(""); setCourseCode("");
      setPollOptions(["", ""]); setFile(null); setFilePreview(null);
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

      {/* İçerik */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={function (e) { setContent(e.target.value); }}
        placeholder={category === "soru" ? "Sorunuzu detaylı bir şekilde yazın..."
          : category === "anket" ? "Anket açıklamanızı yazın..."
            : "Ne paylaşmak istiyorsunuz?"}
        rows={4}
        style={{
          width: "100%", padding: "12px 16px", border: "1px solid " + PC.border,
          borderRadius: 10, fontSize: 14, resize: "vertical",
          outline: "none", lineHeight: 1.6, fontFamily: "inherit",
        }}
      />

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
          disabled={posting || uploading || !content.trim()}
          style={{
            padding: "10px 24px", border: "none", borderRadius: 10,
            background: posting || !content.trim() ? PC.border : "linear-gradient(135deg, " + DY.gold + ", " + DY.goldDark + ")",
            color: "white", cursor: posting ? "wait" : "pointer",
            fontSize: 14, fontWeight: 700,
            boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
          }}
        >{uploading ? "Yükleniyor..." : posting ? "Gönderiliyor..." : "Paylaş"}</button>
      </div>
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
      return Object.assign({}, p, { engagement: getReactionTotal(p.reactions) + (p.commentCount || 0) + (p.views || 0) });
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
                  {p.title || p.content.substring(0, 50) + "..."}
                </div>
                <div style={{ fontSize: 11, color: PC.textMuted, marginTop: 4 }}>
                  {getReactionTotal(p.reactions)} tepki · {p.commentCount || 0} yorum
                </div>
              </div>
            </div>
          </div>
        );
      })}
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
const UserProfileCard = ({ currentUser, posts }) => {
  var userId = getUserId(currentUser);
  var userPosts = posts.filter(function (p) { return p.authorId === userId; });
  var totalReactions = 0;
  userPosts.forEach(function (p) { totalReactions += getReactionTotal(p.reactions); });
  return (
    <div className="daisy-card" style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <Avatar name={currentUser.name} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: DY.warm }}>{currentUser.name || "Anonim"}</div>
          <div style={{ fontSize: 12, color: PC.textMuted }}>{currentUser.email || ""}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { v: userPosts.length, l: "Gönderi" },
          { v: totalReactions, l: "Tepki" },
          { v: userPosts.reduce(function (s, p) { return s + (p.commentCount || 0); }, 0), l: "Yorum" },
        ].map(function (item) {
          return (
            <div key={item.l} style={{ textAlign: "center", padding: "8px 0", background: DY.warmLight, borderRadius: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: DY.warm }}>{item.v}</div>
              <div style={{ fontSize: 10, color: PC.textMuted }}>{item.l}</div>
            </div>
          );
        })}
      </div>
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

// ── Arama Çubuğu ──
const SearchBar = ({ value, onChange }) => (
  <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={PC.textMuted}
      strokeWidth="2" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      value={value}
      onChange={function (e) { onChange(e.target.value); }}
      placeholder="Gönderi ara..."
      style={{
        width: "100%", padding: "10px 14px 10px 42px",
        border: "1px solid " + PC.border, borderRadius: 12,
        fontSize: 14, outline: "none", background: "white",
      }}
    />
  </div>
);

// ══════════════════════════════════════════════════════════════
// ANA MODÜL BİLEŞENİ
// ══════════════════════════════════════════════════════════════

function OgrenciPortaliApp({ currentUser }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("tumu");
  const [showNewPost, setShowNewPost] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("newest"); // newest, popular, comments, bookmarked
  const [authorFilter, setAuthorFilter] = useState("");
  const [toasts, setToasts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const [highlightedPostId, setHighlightedPostId] = useState(null);
  const loadMoreRef = useRef(null);
  var isMobile = useIsMobile(768);
  var isAdmin = currentUser && (currentUser.isAdmin || currentUser.email === "tunahan@example.com"); // Geçici admin kontrolü

  useEffect(function () {
    var params = new URLSearchParams(window.location.search);
    var pid = params.get("post");
    if (pid) setHighlightedPostId(pid);
  }, []);

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
    if (searchQuery.trim()) {
      var q = searchQuery.toLowerCase();
      result = result.filter(function (p) {
        return (p.title && p.title.toLowerCase().includes(q)) ||
          (p.content && p.content.toLowerCase().includes(q)) ||
          (p.authorName && p.authorName.toLowerCase().includes(q));
      });
    }
    // Yazar filtresi
    if (authorFilter) {
      result = result.filter(function (p) { return p.authorName === authorFilter; });
    }
    // Kaydedilenler filtresi
    if (sortMode === "bookmarked") {
      result = result.filter(function (p) { return bookmarks.indexOf(p.id) >= 0; });
    }
    // Sıralama
    if (sortMode === "popular") {
      result = [...result].sort(function (a, b) {
        return (getReactionTotal(b.reactions) + (b.views || 0)) - (getReactionTotal(a.reactions) + (a.views || 0));
      });
    } else if (sortMode === "comments") {
      result = [...result].sort(function (a, b) {
        return (b.commentCount || 0) - (a.commentCount || 0);
      });
    }
    return result;
  }, [posts, searchQuery, sortMode, bookmarks, authorFilter]);

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
          <SearchBar value={searchQuery} onChange={setSearchQuery} />

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

          {/* Sıralama */}
          <div style={{
            display: "flex", gap: 4, background: PC.bg, borderRadius: 10, padding: 3,
            overflowX: isMobile ? "auto" : "visible",
            WebkitOverflowScrolling: "touch",
          }}>
            {[
              { id: "newest", label: "En Yeni" },
              { id: "popular", label: "En Popüler" },
              { id: "comments", label: "En Çok Yorum" },
              { id: "bookmarked", label: "Kaydedilenler" },
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
                  }}
                >{s.label}</button>
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
                  {searchQuery ? "Sonuç bulunamadı" : "Henüz gönderi yok"}
                </div>
                <div style={{ fontSize: 14, color: PC.textMuted }}>
                  {searchQuery ? "Farklı bir arama terimi deneyin." : "İlk gönderiyi oluşturarak topluluğu başlatın!"}
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
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onTogglePin={handleTogglePin}
                  isBookmarked={bookmarks.indexOf(post.id) >= 0}
                  onToggleBookmark={handleToggleBookmark}
                  onFilterAuthor={setAuthorFilter}
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
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onTogglePin={handleTogglePin}
                  onToggleBookmark={handleToggleBookmark}
                  isBookmarked={bookmarks.indexOf(post.id) >= 0}
                  isAdmin={isAdmin}
                  onFilterAuthor={setAuthorFilter}
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
              <UserProfileCard currentUser={currentUser} posts={posts} />
              <TrendingSidebar posts={posts} />

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
              <UserProfileCard currentUser={currentUser} posts={posts} />
              <TrendingSidebar posts={posts} />

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
    </div>
  );
}

// ── Window'a export ──
window.OgrenciPortaliApp = OgrenciPortaliApp;
