// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Ders Grupları (Redesigned)
// Proje temasına uygun sıcak renkler, gelişmiş işlevsellik
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ── Proje Temasına Uygun Renkler ──
const G = {
  // Arka planlar
  bg: "#FFFDF7",
  bgWarm: "#FBF8F1",
  sidebar: "#FFFFFF",
  sidebarHover: "#FFF9ED",
  sidebarActive: "#FEF3C7",
  chatBg: "#F9F6EF",
  header: "#FFFFFF",
  input: "#F5F1E8",
  inputFocus: "#FFFFFF",
  // Mesaj balonları
  bubble: "#1B2A4A",       // navy - kendi mesajımız
  bubbleText: "#FFFFFF",
  bubbleOther: "#FFFFFF",
  bubbleOtherText: "#1E293B",
  // Renkler
  navy: "#1B2A4A",
  navyLight: "#2D4A7A",
  gold: "#C4973B",
  goldLight: "#F3E5AB",
  goldPale: "#FBF6EC",
  accent: "#D4A037",
  accentDark: "#B8891F",
  green: "#059669",
  greenLight: "#D1FAE5",
  blue: "#3B82F6",
  blueLight: "#DBEAFE",
  red: "#DC2626",
  redLight: "#FEE2E2",
  orange: "#F59E0B",
  // Metin
  text: "#1E293B",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  // Kenarlık
  border: "#E8E2D6",
  borderLight: "#F0EDE6",
  // Gölge
  shadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)",
  shadowLg: "0 10px 15px -3px rgba(0,0,0,0.06), 0 4px 6px -4px rgba(0,0,0,0.03)",
};

// ── Ders Renkleri ──
const COLORS = [
  { bg: "#1B2A4A", light: "#DBEAFE", text: "#fff" },
  { bg: "#059669", light: "#D1FAE5", text: "#fff" },
  { bg: "#D4A037", light: "#FEF3C7", text: "#fff" },
  { bg: "#7C3AED", light: "#EDE9FE", text: "#fff" },
  { bg: "#EC4899", light: "#FCE7F3", text: "#fff" },
  { bg: "#EF4444", light: "#FEE2E2", text: "#fff" },
  { bg: "#14B8A6", light: "#CCFBF1", text: "#fff" },
  { bg: "#F97316", light: "#FFEDD5", text: "#fff" },
];
const getColor = (code) => {
  let h = 0;
  for (let i = 0; i < (code || "").length; i++) h = code.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
};

// ── SVG İkonlar ──
const I = ({ d, size, color, fill }) => (
  <svg width={size || 18} height={size || 18} viewBox="0 0 24 24"
    fill={fill || "none"} stroke={color || "currentColor"}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const IC = {
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  plus: "M12 5v14M5 12h14",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  x: "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  pin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z",
  megaphone: "M3 11l18-5v12L3 13v-2zM11.6 16.8a3 3 0 11-5.8-1.6",
  hash: "M4 9h16M4 15h16M10 3L8 21M16 3l-2 18",
  info: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 16v-4M12 8h.01",
  reply: "M9 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-5l-5 5v-5z",
  smile: "M12 2a10 10 0 100 20 10 10 0 000-20zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  copy: "M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  link: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  arrowLeft: "M19 12H5M12 19l-7-7 7-7",
  chevDown: "M6 9l6 6 6-6",
  clock: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
};

// ── Emoji Listesi ──
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "💯"];

// ══════════════════════════════════════════════════════════════
// YARDIMCI BİLEŞENLER
// ══════════════════════════════════════════════════════════════

// Zaman formatlama
function timeAgo(ts) {
  if (!ts) return "";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return "şimdi";
    if (diff < 3600) return Math.floor(diff / 60) + " dk";
    if (diff < 86400) return Math.floor(diff / 3600) + " sa";
    if (diff < 604800) return Math.floor(diff / 86400) + " gün";
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  } catch { return ""; }
}

function formatTime(ts) {
  if (!ts) return "";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function formatDate(ts) {
  if (!ts) return "";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Bugün";
    if (d.toDateString() === yesterday.toDateString()) return "Dün";
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  } catch { return ""; }
}

// ── Avatar ──
const Avatar = ({ name, code, size, online }) => {
  const clr = getColor(code || name || "");
  const sz = size || 42;
  const fs = sz < 32 ? 11 : sz < 40 ? 13 : 16;
  const initials = (code || name || "?").substring(0, 2).toUpperCase();
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: sz, height: sz, borderRadius: "50%",
        background: `linear-gradient(135deg, ${clr.bg}, ${clr.bg}dd)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}>
        <span style={{ color: clr.text, fontSize: fs, fontWeight: 700, letterSpacing: "0.5px" }}>{initials}</span>
      </div>
      {online && (
        <div style={{
          position: "absolute", bottom: 0, right: 0,
          width: 12, height: 12, borderRadius: "50%",
          background: G.green, border: "2px solid white",
        }} />
      )}
    </div>
  );
};

// ── Boş Durum ──
const EmptyState = ({ icon, title, desc, action }) => (
  <div style={{
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    flexDirection: "column", gap: 12, padding: 40,
  }}>
    <div style={{
      width: 72, height: 72, borderRadius: 20, background: G.goldPale,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "1px solid " + G.border,
    }}>
      <span style={{ fontSize: 32 }}>{icon || "💬"}</span>
    </div>
    <h3 style={{ fontSize: 18, fontWeight: 600, color: G.navy }}>{title}</h3>
    <p style={{ fontSize: 14, color: G.textSecondary, maxWidth: 320, textAlign: "center", lineHeight: 1.5 }}>{desc}</p>
    {action}
  </div>
);

// ── Badge ──
const CountBadge = ({ count }) => {
  if (!count || count <= 0) return null;
  return (
    <span style={{
      minWidth: 20, height: 20, borderRadius: 10,
      background: G.accent, color: "white",
      fontSize: 11, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 6px",
    }}>{count > 99 ? "99+" : count}</span>
  );
};

// ── Buton ──
const GBtn = ({ children, onClick, variant, small, icon, disabled, style: cs }) => {
  const variants = {
    primary: { bg: G.navy, color: "#fff", hoverBg: G.navyLight },
    accent: { bg: G.accent, color: "#fff", hoverBg: G.accentDark },
    success: { bg: G.green, color: "#fff" },
    danger: { bg: "transparent", color: G.red, border: "1px solid " + G.redLight },
    ghost: { bg: "transparent", color: G.textSecondary, border: "1px solid " + G.border },
    soft: { bg: G.goldPale, color: G.navy, border: "1px solid " + G.border },
  };
  const v = variants[variant || "primary"] || variants.primary;
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: small ? "6px 12px" : "9px 18px",
      borderRadius: 8, fontSize: small ? 12 : 13, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      border: v.border || "none", background: v.bg, color: v.color,
      opacity: disabled ? 0.5 : 1, transition: "all 0.2s",
      fontFamily: "'Source Sans 3', sans-serif", ...cs,
    }}>
      {icon}{children}
    </button>
  );
};

// ══════════════════════════════════════════════════════════════
// ANA MODÜL
// ══════════════════════════════════════════════════════════════

function DersGruplariApp({ currentUser }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // all, my, unread
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [msgSearch, setMsgSearch] = useState("");
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef(null);

  const userId = currentUser?.studentNumber || currentUser?.name || "anonymous";
  const userName = currentUser?.name || userId;
  const isAdmin = currentUser?.role === "admin";

  // ── Yükle ──
  useEffect(() => { loadGroups(); }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const db = window.firebase?.firestore();
      if (!db) { setLoading(false); return; }
      const snap = await db.collection("course_groups").orderBy("createdAt", "desc").get();
      setGroups(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    } catch (e) { console.error("Gruplar yuklenemedi:", e); }
    setLoading(false);
  };

  // ── Grup CRUD ──
  const handleCreateGroup = async (data) => {
    try {
      const db = window.firebase?.firestore(); if (!db) return;
      const doc = { ...data, createdBy: userId, createdByName: userName, members: [userId], memberCount: 1, lastMessage: "", lastMessageTime: null, createdAt: window.firebase.firestore.FieldValue.serverTimestamp() };
      const ref = await db.collection("course_groups").add(doc);
      setGroups(prev => [{ ...doc, id: ref.id }, ...prev]);
      setShowCreate(false);
    } catch (e) { console.error(e); alert("Grup oluşturulurken hata!"); }
  };

  const handleEditGroup = async (data) => {
    if (!selectedGroup) return;
    try {
      const db = window.firebase?.firestore(); if (!db) return;
      await db.collection("course_groups").doc(selectedGroup.id).update(data);
      const updated = { ...selectedGroup, ...data };
      setGroups(prev => prev.map(g => g.id === selectedGroup.id ? updated : g));
      setSelectedGroup(updated);
      setShowEdit(false);
    } catch (e) { console.error(e); }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm("Bu grubu silmek istediğinize emin misiniz?")) return;
    try {
      const db = window.firebase?.firestore(); if (!db) return;
      await db.collection("course_groups").doc(groupId).delete();
      const msgSnap = await db.collection("course_group_posts").where("groupId", "==", groupId).get();
      const batch = db.batch();
      msgSnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      setGroups(prev => prev.filter(g => g.id !== groupId));
      if (selectedGroup?.id === groupId) { setSelectedGroup(null); setMessages([]); }
    } catch (e) { console.error(e); }
  };

  // ── Katıl / Ayrıl ──
  const handleJoinLeave = async (group) => {
    try {
      const db = window.firebase?.firestore(); if (!db) return;
      const isMem = group.members?.includes(userId);
      const updated = isMem ? group.members.filter(m => m !== userId) : [...(group.members || []), userId];
      await db.collection("course_groups").doc(group.id).update({ members: updated, memberCount: updated.length });
      setGroups(prev => prev.map(g => g.id === group.id ? { ...g, members: updated, memberCount: updated.length } : g));
      if (selectedGroup?.id === group.id) setSelectedGroup(prev => ({ ...prev, members: updated, memberCount: updated.length }));
    } catch (e) { console.error(e); }
  };

  // ── Grup Seç ──
  const handleSelectGroup = async (group) => {
    setSelectedGroup(group);
    setShowGroupInfo(false);
    setReplyTo(null);
    setMobileShowChat(true);
    try {
      const db = window.firebase?.firestore(); if (!db) return;
      const snap = await db.collection("course_group_posts").where("groupId", "==", group.id).orderBy("createdAt", "asc").get();
      setMessages(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) { console.error(e); setMessages([]); }
  };

  // ── Mesaj Gönder ──
  const handleSendMessage = async (content, type) => {
    if (!content.trim() || !selectedGroup) return;
    try {
      const db = window.firebase?.firestore(); if (!db) return;
      const msg = {
        groupId: selectedGroup.id, content: content.trim(),
        authorId: userId, authorName: userName,
        isPinned: false, type: type || "text",
        replyTo: replyTo ? { id: replyTo.id, authorName: replyTo.authorName, content: replyTo.content.substring(0, 60) } : null,
        reactions: {},
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      };
      const ref = await db.collection("course_group_posts").add(msg);
      await db.collection("course_groups").doc(selectedGroup.id).update({
        lastMessage: (type === "announcement" ? "📢 " : "") + content.trim().substring(0, 80),
        lastMessageTime: window.firebase.firestore.FieldValue.serverTimestamp(),
      });
      setMessages(prev => [...prev, { ...msg, id: ref.id }]);
      setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, lastMessage: content.trim().substring(0, 80) } : g));
      setReplyTo(null);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) { console.error(e); }
  };

  // ── Mesaj Sil ──
  const handleDeleteMessage = async (msgId) => {
    try {
      const db = window.firebase?.firestore(); if (!db) return;
      await db.collection("course_group_posts").doc(msgId).delete();
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (e) { console.error(e); }
  };

  // ── Sabitle ──
  const handleTogglePin = async (msg) => {
    try {
      const db = window.firebase?.firestore(); if (!db) return;
      await db.collection("course_group_posts").doc(msg.id).update({ isPinned: !msg.isPinned });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isPinned: !m.isPinned } : m));
    } catch (e) { console.error(e); }
  };

  // ── Emoji Tepki ──
  const handleReaction = async (msg, emoji) => {
    try {
      const db = window.firebase?.firestore(); if (!db) return;
      const reactions = { ...(msg.reactions || {}) };
      const key = emoji;
      if (!reactions[key]) reactions[key] = [];
      const idx = reactions[key].indexOf(userId);
      if (idx >= 0) reactions[key].splice(idx, 1);
      else reactions[key].push(userId);
      if (reactions[key].length === 0) delete reactions[key];
      await db.collection("course_group_posts").doc(msg.id).update({ reactions });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions } : m));
    } catch (e) { console.error(e); }
  };

  // ── Mesaj Kopyala ──
  const handleCopyMessage = (content) => {
    navigator.clipboard?.writeText(content);
  };

  // ── Filtrele ──
  const filteredGroups = useMemo(() => {
    let r = groups;
    if (filterTab === "my") r = r.filter(g => g.members?.includes(userId));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(g => g.courseCode?.toLowerCase().includes(q) || g.courseName?.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q));
    }
    return r;
  }, [groups, searchQuery, filterTab, userId]);

  // Mesaj arama
  const filteredMessages = useMemo(() => {
    if (!msgSearch.trim()) return messages;
    const q = msgSearch.toLowerCase();
    return messages.filter(m => m.content?.toLowerCase().includes(q) || m.authorName?.toLowerCase().includes(q));
  }, [messages, msgSearch]);

  const isMember = selectedGroup?.members?.includes(userId);
  const pinnedMessages = messages.filter(m => m.isPinned);

  // Mesajları tarihe göre grupla
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = "";
    (msgSearch.trim() ? filteredMessages : messages).forEach(msg => {
      const date = formatDate(msg.createdAt);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ type: "date", date });
      }
      groups.push({ type: "msg", msg });
    });
    return groups;
  }, [messages, filteredMessages, msgSearch]);

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="portal-bg" style={{ minHeight: "100vh" }}>
      <style>{`
        @keyframes grpFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes grpSpin { to { transform: rotate(360deg); } }
        .grp-sidebar-item { transition: all 0.15s ease; }
        .grp-sidebar-item:hover { background: ${G.sidebarHover} !important; }
        .grp-msg-row { position: relative; }
        .grp-msg-row .grp-msg-actions { opacity: 0; transition: opacity 0.15s; }
        .grp-msg-row:hover .grp-msg-actions { opacity: 1; }
        .grp-reaction-btn { transition: all 0.15s; cursor: pointer; }
        .grp-reaction-btn:hover { transform: scale(1.15); }
        .grp-reaction-btn:active { transform: scale(0.95); }
        input:focus, textarea:focus { outline: none; border-color: ${G.accent} !important; box-shadow: 0 0 0 3px rgba(212,160,55,0.15); }
      `}</style>

      <div className="portal-wrap">
        {/* Başlık */}
        <div style={{ padding: "20px 0 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: G.navy, fontFamily: "'Playfair Display', serif", letterSpacing: "-0.5px" }}>Ders Grupları</h1>
            <p style={{ color: G.textSecondary, fontSize: 13, marginTop: 2 }}>Ders bazlı iletişim ve işbirliği platformu</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: G.textMuted, background: G.goldPale, padding: "4px 12px", borderRadius: 20, border: "1px solid " + G.border }}>
              {groups.length} grup
            </span>
            {isAdmin && (
              <GBtn onClick={() => setShowCreate(true)} variant="accent" icon={<I d={IC.plus} size={14} color="white" />}>
                Yeni Grup
              </GBtn>
            )}
          </div>
        </div>

        {/* Ana İçerik */}
        <div style={{
          display: "flex", height: "calc(100vh - 180px)", minHeight: 500,
          borderRadius: 16, overflow: "hidden",
          border: "1px solid " + G.border, boxShadow: G.shadowLg,
          background: G.sidebar,
        }}>

          {/* ═══ SOL PANEL ═══ */}
          <div style={{
            width: 340, flexShrink: 0, borderRight: "1px solid " + G.border,
            display: "flex", flexDirection: "column", background: G.sidebar,
          }}>
            {/* Arama */}
            <div style={{ padding: "14px 16px 10px" }}>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: G.textMuted }}>
                  <I d={IC.search} size={15} />
                </div>
                <input type="text" placeholder="Grup ara..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%", padding: "9px 12px 9px 36px", background: G.input, border: "1px solid " + G.border,
                    borderRadius: 10, fontSize: 13, color: G.text, fontFamily: "inherit",
                  }} />
              </div>
            </div>

            {/* Filtre Tabları */}
            <div style={{ display: "flex", gap: 4, padding: "0 16px 10px" }}>
              {[
                { key: "all", label: "Tümü", count: groups.length },
                { key: "my", label: "Gruplarım", count: groups.filter(g => g.members?.includes(userId)).length },
              ].map(f => (
                <button key={f.key} onClick={() => setFilterTab(f.key)} style={{
                  flex: 1, padding: "7px 10px", border: "none", borderRadius: 8, cursor: "pointer",
                  fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                  background: filterTab === f.key ? G.navy : G.input,
                  color: filterTab === f.key ? "white" : G.textSecondary,
                  fontFamily: "inherit",
                }}>
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            {/* Grup Listesi */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ width: 28, height: 28, margin: "0 auto 12px", borderRadius: "50%", border: "3px solid " + G.border, borderTopColor: G.accent, animation: "grpSpin 0.8s linear infinite" }} />
                  <span style={{ color: G.textMuted, fontSize: 13 }}>Yükleniyor...</span>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: G.textMuted, fontSize: 13 }}>
                  {searchQuery ? `"${searchQuery}" ile sonuç yok` : "Henüz grup yok"}
                </div>
              ) : (
                filteredGroups.map(group => {
                  const clr = getColor(group.courseCode);
                  const sel = selectedGroup?.id === group.id;
                  const mem = group.members?.includes(userId);
                  return (
                    <div key={group.id} className="grp-sidebar-item" onClick={() => handleSelectGroup(group)} style={{
                      padding: "12px 16px", cursor: "pointer", display: "flex", gap: 12, alignItems: "center",
                      background: sel ? G.sidebarActive : "transparent",
                      borderBottom: "1px solid " + G.borderLight,
                      borderLeft: sel ? "3px solid " + G.accent : "3px solid transparent",
                    }}>
                      <Avatar code={group.courseCode} size={44} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: G.text, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {group.courseName}
                          </span>
                          <span style={{ fontSize: 11, color: G.textMuted, flexShrink: 0, marginLeft: 8 }}>
                            {timeAgo(group.lastMessageTime)}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                          <span style={{
                            background: clr.light, color: clr.bg, padding: "1px 7px", borderRadius: 4,
                            fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                          }}>{group.courseCode}</span>
                          <span style={{ color: G.textMuted, fontSize: 11 }}>{group.memberCount || 0} üye</span>
                          {mem && <span style={{ color: G.green, fontSize: 10 }}>✓ Üye</span>}
                        </div>
                        {group.lastMessage && (
                          <div style={{ color: G.textMuted, fontSize: 12, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {group.lastMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ═══ SAĞ PANEL ═══ */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: G.chatBg }}>
            {!selectedGroup ? (
              <EmptyState
                icon="💬"
                title="Ders Grupları"
                desc={isAdmin ? "Soldaki listeden bir grup seçin veya yeni bir grup oluşturun." : "Soldaki listeden bir ders grubuna katılın ve sohbete başlayın."}
              />
            ) : (
              <>
                {/* ── Chat Header ── */}
                <div style={{
                  background: G.header, padding: "10px 16px", borderBottom: "1px solid " + G.border,
                  display: "flex", alignItems: "center", gap: 12, boxShadow: G.shadow,
                }}>
                  <Avatar code={selectedGroup.courseCode} size={38} />
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setShowGroupInfo(!showGroupInfo)}>
                    <div style={{ color: G.navy, fontSize: 15, fontWeight: 700 }}>{selectedGroup.courseName}</div>
                    <div style={{ color: G.textSecondary, fontSize: 12 }}>
                      {selectedGroup.courseCode} · {selectedGroup.memberCount || 0} üye
                      {selectedGroup.description && <span> · {selectedGroup.description.substring(0, 40)}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {/* Mesaj Arama */}
                    <button onClick={() => setShowMsgSearch(!showMsgSearch)} style={{ background: showMsgSearch ? G.goldPale : "none", border: "none", cursor: "pointer", padding: 7, borderRadius: 8, color: G.textSecondary }}>
                      <I d={IC.search} size={18} />
                    </button>
                    <button onClick={() => setShowGroupInfo(!showGroupInfo)} style={{ background: showGroupInfo ? G.goldPale : "none", border: "none", cursor: "pointer", padding: 7, borderRadius: 8, color: G.textSecondary }}>
                      <I d={IC.info} size={18} />
                    </button>
                    {!isMember ? (
                      <GBtn small onClick={() => handleJoinLeave(selectedGroup)} variant="accent">Katıl</GBtn>
                    ) : (
                      <GBtn small onClick={() => handleJoinLeave(selectedGroup)} variant="danger">Ayrıl</GBtn>
                    )}
                    {isAdmin && (
                      <>
                        <button onClick={() => setShowEdit(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 7, borderRadius: 8, color: G.textSecondary }}>
                          <I d={IC.edit} size={16} />
                        </button>
                        <button onClick={() => handleDeleteGroup(selectedGroup.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 7, borderRadius: 8, color: G.red }}>
                          <I d={IC.trash} size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Mesaj Arama Çubuğu */}
                {showMsgSearch && (
                  <div style={{ padding: "8px 16px", background: G.header, borderBottom: "1px solid " + G.border, display: "flex", gap: 8, alignItems: "center", animation: "grpFadeIn 0.2s ease" }}>
                    <I d={IC.search} size={15} color={G.textMuted} />
                    <input type="text" placeholder="Mesajlarda ara..." value={msgSearch} onChange={e => setMsgSearch(e.target.value)} autoFocus
                      style={{ flex: 1, padding: "6px 10px", border: "1px solid " + G.border, borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: G.input }} />
                    {msgSearch && <span style={{ fontSize: 12, color: G.textMuted }}>{filteredMessages.length} sonuç</span>}
                    <button onClick={() => { setShowMsgSearch(false); setMsgSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: G.textMuted }}>
                      <I d={IC.x} size={16} />
                    </button>
                  </div>
                )}

                {/* Sabitlenmiş */}
                {pinnedMessages.length > 0 && (
                  <div style={{ padding: "8px 16px", background: G.goldPale, borderBottom: "1px solid " + G.border, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>📌</span>
                    <span style={{ color: G.navy, fontSize: 12, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pinnedMessages[pinnedMessages.length - 1].content.substring(0, 100)}
                    </span>
                    <span style={{ color: G.textMuted, fontSize: 11, flexShrink: 0 }}>{pinnedMessages.length} sabit</span>
                  </div>
                )}

                <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                  {/* ── Mesaj Alanı ── */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 3 }}>
                      {groupedMessages.length === 0 ? (
                        <EmptyState
                          icon={isMember ? "✍️" : "🔒"}
                          title={isMember ? "İlk mesajı siz gönderin!" : "Gruba katılın"}
                          desc={isMember ? "Sohbeti başlatmak için aşağıdaki alana mesajınızı yazın." : "Mesaj göndermek için önce gruba katılmanız gerekiyor."}
                        />
                      ) : (
                        groupedMessages.map((item, idx) => {
                          if (item.type === "date") {
                            return (
                              <div key={"d-" + idx} style={{ textAlign: "center", padding: "12px 0 6px" }}>
                                <span style={{
                                  background: G.goldPale, color: G.textSecondary,
                                  padding: "4px 14px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                                  border: "1px solid " + G.border,
                                }}>{item.date}</span>
                              </div>
                            );
                          }

                          const msg = item.msg;
                          const isMe = msg.authorId === userId;
                          const prevMsg = idx > 0 ? groupedMessages[idx - 1] : null;
                          const showName = !isMe && (prevMsg?.type === "date" || prevMsg?.msg?.authorId !== msg.authorId);
                          const isAnnouncement = msg.type === "announcement";
                          const reactions = msg.reactions || {};
                          const hasReactions = Object.keys(reactions).length > 0;

                          return (
                            <div key={msg.id} className="grp-msg-row" style={{
                              display: "flex", justifyContent: isMe ? "flex-end" : "flex-start",
                              marginTop: showName ? 10 : 1,
                              animation: "grpFadeIn 0.2s ease",
                            }}>
                              {/* Avatar (başkaları için) */}
                              {!isMe && showName && (
                                <div style={{ marginRight: 8, marginTop: 2, flexShrink: 0 }}>
                                  <Avatar name={msg.authorName || msg.authorId} size={30} />
                                </div>
                              )}
                              {!isMe && !showName && <div style={{ width: 38 }} />}

                              <div style={{ maxWidth: "65%", minWidth: 100 }}>
                                {/* Balon */}
                                <div style={{
                                  padding: isAnnouncement ? "10px 14px" : "8px 12px 6px",
                                  borderRadius: 12,
                                  borderTopLeftRadius: !isMe && showName ? 4 : 12,
                                  borderTopRightRadius: isMe && showName ? 4 : 12,
                                  background: isAnnouncement ? "linear-gradient(135deg, " + G.goldPale + ", #FFF9ED)" :
                                    (isMe ? G.bubble : G.bubbleOther),
                                  color: isAnnouncement ? G.navy : (isMe ? G.bubbleText : G.bubbleOtherText),
                                  border: isAnnouncement ? "1px solid " + G.accent : (isMe ? "none" : "1px solid " + G.border),
                                  boxShadow: isMe ? "none" : G.shadow,
                                  position: "relative",
                                }}>
                                  {/* Sabit rozeti */}
                                  {msg.isPinned && (
                                    <div style={{ fontSize: 10, color: G.accent, fontWeight: 600, marginBottom: 2 }}>📌 Sabitlenmiş</div>
                                  )}
                                  {/* Duyuru etiketi */}
                                  {isAnnouncement && (
                                    <div style={{ fontSize: 10, fontWeight: 700, color: G.accent, marginBottom: 4, display: "flex", alignItems: "center", gap: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                      📢 Duyuru
                                    </div>
                                  )}
                                  {/* İsim */}
                                  {showName && !isMe && (
                                    <div style={{ fontSize: 12, fontWeight: 700, color: getColor(msg.authorId || "").bg, marginBottom: 3 }}>
                                      {msg.authorName}
                                      {msg.authorId === selectedGroup?.createdBy && (
                                        <span style={{ fontSize: 9, marginLeft: 6, color: G.accent, fontWeight: 600 }}>● Yönetici</span>
                                      )}
                                    </div>
                                  )}
                                  {/* Yanıt referansı */}
                                  {msg.replyTo && (
                                    <div style={{
                                      padding: "4px 8px", marginBottom: 6, borderRadius: 6,
                                      background: isMe ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.04)",
                                      borderLeft: "3px solid " + G.accent, fontSize: 11,
                                    }}>
                                      <div style={{ fontWeight: 700, fontSize: 10, color: isMe ? "rgba(255,255,255,0.7)" : G.accent }}>{msg.replyTo.authorName}</div>
                                      <div style={{ color: isMe ? "rgba(255,255,255,0.6)" : G.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {msg.replyTo.content}
                                      </div>
                                    </div>
                                  )}
                                  {/* İçerik */}
                                  <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</div>
                                  {/* Zaman */}
                                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 3 }}>
                                    <span style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.45)" : G.textMuted }}>{formatTime(msg.createdAt)}</span>
                                  </div>

                                  {/* Mesaj aksiyonları (hover) */}
                                  <div className="grp-msg-actions" style={{
                                    position: "absolute", top: -14, right: isMe ? "auto" : 8, left: isMe ? 8 : "auto",
                                    display: "flex", gap: 2, background: "white", borderRadius: 8, padding: "3px",
                                    boxShadow: G.shadowMd, border: "1px solid " + G.border,
                                  }}>
                                    {/* Yanıtla */}
                                    {isMember && (
                                      <button onClick={() => setReplyTo(msg)} title="Yanıtla"
                                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4, color: G.textSecondary }}>
                                        <I d={IC.reply} size={13} />
                                      </button>
                                    )}
                                    {/* Emoji */}
                                    {isMember && (
                                      <EmojiPicker onSelect={(emoji) => handleReaction(msg, emoji)} />
                                    )}
                                    {/* Kopyala */}
                                    <button onClick={() => handleCopyMessage(msg.content)} title="Kopyala"
                                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4, color: G.textSecondary }}>
                                      <I d={IC.copy} size={13} />
                                    </button>
                                    {/* Sabitle (Admin) */}
                                    {isAdmin && (
                                      <button onClick={() => handleTogglePin(msg)} title={msg.isPinned ? "Kaldır" : "Sabitle"}
                                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4, color: msg.isPinned ? G.accent : G.textSecondary }}>
                                        <I d={IC.pin} size={13} />
                                      </button>
                                    )}
                                    {/* Sil */}
                                    {(isAdmin || isMe) && (
                                      <button onClick={() => handleDeleteMessage(msg.id)} title="Sil"
                                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4, color: G.red }}>
                                        <I d={IC.trash} size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Tepkiler */}
                                {hasReactions && (
                                  <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                                    {Object.entries(reactions).map(([emoji, users]) => {
                                      const myReaction = users.includes(userId);
                                      return (
                                        <button key={emoji} onClick={() => handleReaction(msg, emoji)} className="grp-reaction-btn"
                                          style={{
                                            display: "flex", alignItems: "center", gap: 3,
                                            padding: "2px 8px", borderRadius: 12, fontSize: 13,
                                            background: myReaction ? G.blueLight : "white",
                                            border: "1px solid " + (myReaction ? G.blue : G.border),
                                            color: myReaction ? G.blue : G.text,
                                          }}>
                                          {emoji} <span style={{ fontSize: 10, fontWeight: 600 }}>{users.length}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* ── Mesaj Giriş ── */}
                    {isMember ? (
                      <MessageInput
                        onSend={handleSendMessage}
                        replyTo={replyTo}
                        onCancelReply={() => setReplyTo(null)}
                        isAdmin={isAdmin}
                      />
                    ) : (
                      <div style={{ padding: 16, background: G.header, borderTop: "1px solid " + G.border, textAlign: "center" }}>
                        <span style={{ color: G.textSecondary, fontSize: 13 }}>Mesaj göndermek için gruba katılın</span>
                        <br />
                        <GBtn small onClick={() => handleJoinLeave(selectedGroup)} variant="accent" style={{ marginTop: 8 }}>Gruba Katıl</GBtn>
                      </div>
                    )}
                  </div>

                  {/* ── Grup Bilgi Paneli ── */}
                  {showGroupInfo && (
                    <div style={{
                      width: 280, background: G.sidebar, borderLeft: "1px solid " + G.border,
                      overflowY: "auto", flexShrink: 0, animation: "grpFadeIn 0.2s ease",
                    }}>
                      <div style={{ padding: 24, textAlign: "center", borderBottom: "1px solid " + G.border }}>
                        <Avatar code={selectedGroup.courseCode} size={64} />
                        <div style={{ marginTop: 12, fontSize: 17, fontWeight: 700, color: G.navy }}>{selectedGroup.courseName}</div>
                        <div style={{ fontSize: 13, color: G.textSecondary, marginTop: 4 }}>
                          <span style={{
                            background: getColor(selectedGroup.courseCode).light,
                            color: getColor(selectedGroup.courseCode).bg,
                            padding: "2px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>{selectedGroup.courseCode}</span>
                        </div>
                        {selectedGroup.description && (
                          <p style={{ color: G.textSecondary, fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>{selectedGroup.description}</p>
                        )}
                      </div>

                      {/* İstatistikler */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, borderBottom: "1px solid " + G.border }}>
                        {[
                          { label: "Üye", value: selectedGroup.members?.length || 0, icon: "👥" },
                          { label: "Mesaj", value: messages.length, icon: "💬" },
                        ].map((s, i) => (
                          <div key={i} style={{ padding: "14px", textAlign: "center", background: i === 0 ? G.bgWarm : G.goldPale }}>
                            <div style={{ fontSize: 18 }}>{s.icon}</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: G.navy }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: G.textMuted }}>{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Üyeler */}
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: G.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                          Üyeler ({selectedGroup.members?.length || 0})
                        </div>
                        {(selectedGroup.members || []).map(mid => {
                          const isCreator = mid === selectedGroup.createdBy;
                          return (
                            <div key={mid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid " + G.borderLight }}>
                              <Avatar name={mid} size={30} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: G.text }}>{mid}</div>
                                {isCreator && (
                                  <span style={{
                                    fontSize: 10, fontWeight: 600, color: G.accent,
                                    background: G.goldPale, padding: "1px 6px", borderRadius: 4,
                                  }}>Yönetici</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Sabitlenmiş Mesajlar */}
                      {pinnedMessages.length > 0 && (
                        <div style={{ padding: "14px 16px", borderTop: "1px solid " + G.border }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: G.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                            📌 Sabitlenmiş ({pinnedMessages.length})
                          </div>
                          {pinnedMessages.map(pm => (
                            <div key={pm.id} style={{ padding: "8px 10px", marginBottom: 6, borderRadius: 8, background: G.goldPale, border: "1px solid " + G.border, fontSize: 12 }}>
                              <div style={{ fontWeight: 600, color: G.navy, fontSize: 11, marginBottom: 2 }}>{pm.authorName}</div>
                              <div style={{ color: G.text, lineHeight: 1.4 }}>{pm.content.substring(0, 100)}{pm.content.length > 100 ? "..." : ""}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Modaller ── */}
      {showCreate && <GroupModal onClose={() => setShowCreate(false)} onSave={handleCreateGroup} title="Yeni Grup Oluştur" />}
      {showEdit && selectedGroup && <GroupModal onClose={() => setShowEdit(false)} onSave={handleEditGroup} title="Grubu Düzenle" initial={selectedGroup} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// EMOJİ PICKER (Mini)
// ══════════════════════════════════════════════════════════════
function EmojiPicker({ onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} title="Tepki Ekle"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4, color: G.textSecondary }}>
        <I d={IC.smile} size={13} />
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
          background: "white", borderRadius: 12, padding: "6px 8px",
          boxShadow: G.shadowLg, border: "1px solid " + G.border,
          display: "flex", gap: 2, zIndex: 100,
          animation: "grpFadeIn 0.15s ease",
        }}>
          {QUICK_EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => { onSelect(emoji); setOpen(false); }}
              className="grp-reaction-btn"
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 5px", fontSize: 18, borderRadius: 6 }}>
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MESAJ GİRİŞ (Gelişmiş)
// ══════════════════════════════════════════════════════════════
function MessageInput({ onSend, replyTo, onCancelReply, isAdmin }) {
  const [text, setText] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = (type) => {
    if (!text.trim()) return;
    onSend(text, type || "text");
    setText("");
    setShowOptions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div style={{ background: G.header, borderTop: "1px solid " + G.border }}>
      {/* Yanıt banner */}
      {replyTo && (
        <div style={{
          padding: "8px 16px", display: "flex", alignItems: "center", gap: 10,
          borderBottom: "1px solid " + G.border, background: G.goldPale,
          animation: "grpFadeIn 0.15s ease",
        }}>
          <div style={{ width: 3, height: 32, borderRadius: 2, background: G.accent }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.accent }}>{replyTo.authorName}'a yanıt</div>
            <div style={{ fontSize: 12, color: G.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {replyTo.content.substring(0, 80)}
            </div>
          </div>
          <button onClick={onCancelReply} style={{ background: "none", border: "none", cursor: "pointer", color: G.textMuted, padding: 4 }}>
            <I d={IC.x} size={16} />
          </button>
        </div>
      )}

      <div style={{ padding: "10px 16px", display: "flex", gap: 8, alignItems: "flex-end" }}>
        {/* Ek seçenekler */}
        {isAdmin && (
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowOptions(!showOptions)} style={{
              width: 38, height: 38, borderRadius: "50%", border: "1px solid " + G.border,
              background: showOptions ? G.goldPale : "white", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: G.textSecondary,
            }}>
              <I d={IC.plus} size={18} />
            </button>
            {showOptions && (
              <div style={{
                position: "absolute", bottom: "100%", left: 0, marginBottom: 8,
                background: "white", borderRadius: 12, padding: "6px",
                boxShadow: G.shadowLg, border: "1px solid " + G.border,
                minWidth: 160, zIndex: 100,
                animation: "grpFadeIn 0.15s ease",
              }}>
                <button onClick={() => { handleSubmit("announcement"); }} style={{
                  width: "100%", padding: "8px 12px", border: "none", borderRadius: 8,
                  background: "transparent", cursor: "pointer", textAlign: "left",
                  fontSize: 13, color: G.text, display: "flex", alignItems: "center", gap: 8,
                  fontFamily: "inherit",
                }}
                  onMouseEnter={e => e.target.style.background = G.goldPale}
                  onMouseLeave={e => e.target.style.background = "transparent"}>
                  📢 Duyuru Olarak Gönder
                </button>
              </div>
            )}
          </div>
        )}

        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Bir mesaj yazın..."
          rows={1}
          style={{
            flex: 1, padding: "10px 14px", background: G.input, border: "1px solid " + G.border,
            borderRadius: 12, color: G.text, fontSize: 14, resize: "none",
            fontFamily: "'Source Sans 3', sans-serif", maxHeight: 120, minHeight: 40,
          }}
          onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
        />

        <button onClick={() => handleSubmit()} disabled={!text.trim()} style={{
          width: 40, height: 40, borderRadius: "50%", border: "none",
          cursor: text.trim() ? "pointer" : "default",
          background: text.trim() ? G.navy : G.input,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.2s", flexShrink: 0,
        }}>
          <I d={IC.send} size={18} color={text.trim() ? "white" : G.textMuted} />
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// GRUP OLUŞTUR / DÜZENLE MODALI
// ══════════════════════════════════════════════════════════════
function GroupModal({ onClose, onSave, title, initial }) {
  const [courseCode, setCourseCode] = useState(initial?.courseCode || "");
  const [courseName, setCourseName] = useState(initial?.courseName || "");
  const [description, setDescription] = useState(initial?.description || "");

  const catalog = window.HOME_INSTITUTION_CATALOG?.courses || [];
  const suggestions = useMemo(() => {
    if (!courseCode || courseCode.length < 2 || initial) return [];
    const q = courseCode.toUpperCase();
    return catalog.filter(c => c.code.includes(q) || c.name.toLowerCase().includes(courseCode.toLowerCase())).slice(0, 5);
  }, [courseCode]);

  const handleSubmit = () => {
    if (!courseCode.trim() || !courseName.trim()) { alert("Ders kodu ve adı zorunludur!"); return; }
    onSave({ courseCode: courseCode.trim().toUpperCase(), courseName: courseName.trim(), description: description.trim() });
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", background: G.input,
    border: "1px solid " + G.border, borderRadius: 10, fontSize: 14,
    color: G.text, fontFamily: "inherit",
  };
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 700, color: G.navy, marginBottom: 6 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{
        background: "white", borderRadius: 16, padding: 28, width: 440,
        boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
        animation: "grpFadeIn 0.25s ease",
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: G.navy, marginBottom: 24, fontFamily: "'Playfair Display', serif" }}>{title}</h3>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Ders Kodu <span style={{ color: G.red }}>*</span></label>
          <input type="text" value={courseCode} onChange={e => setCourseCode(e.target.value)} placeholder="Örn: BİL307" style={inputStyle} />
          {suggestions.length > 0 && (
            <div style={{ border: "1px solid " + G.border, borderRadius: 10, marginTop: 4, background: "white", overflow: "hidden", boxShadow: G.shadow }}>
              {suggestions.map(s => (
                <div key={s.code} onClick={() => { setCourseCode(s.code); setCourseName(s.name); }} style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, color: G.text, borderBottom: "1px solid " + G.borderLight, transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = G.goldPale}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <strong style={{ color: G.navy, fontFamily: "'JetBrains Mono', monospace" }}>{s.code}</strong>
                  <span style={{ color: G.textSecondary }}> — {s.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Ders Adı <span style={{ color: G.red }}>*</span></label>
          <input type="text" value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Örn: Mikroişlemciler" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Açıklama</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Grup açıklaması (opsiyonel)..." rows={3}
            style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <GBtn onClick={onClose} variant="ghost">İptal</GBtn>
          <GBtn onClick={handleSubmit} variant="accent">{initial ? "Kaydet" : "Oluştur"}</GBtn>
        </div>
      </div>
    </div>
  );
}

// Export
window.DersGruplariApp = DersGruplariApp;
