// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Ders Grupları (WhatsApp Tarzı)
// Admin grup yönetimi, üye mesajlaşma
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ── Renkler ──
const GRP = {
  sidebar: "#111b21",
  sidebarHover: "#202c33",
  sidebarActive: "#2a3942",
  chatBg: "#0b141a",
  chatPattern: "#0b141a",
  header: "#1f2c34",
  input: "#2a3942",
  bubble: "#005c4b",
  bubbleOther: "#1f2c34",
  accent: "#00a884",
  accentLight: "#d9fdd3",
  text: "#e9edef",
  textSecondary: "#8696a0",
  border: "#222d34",
  white: "#ffffff",
  red: "#ef4444",
  pinBg: "#1d282f",
};

// ── SVG İkon ──
const GIcon = ({ d, size, color }) => (
  <svg width={size || 18} height={size || 18} viewBox="0 0 24 24" fill="none"
    stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  pin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 7v4M12 15h.01",
  megaphone: "M3 11l18-5v12L3 13v-2zM11.6 16.8a3 3 0 11-5.8-1.6",
  hash: "M4 9h16M4 15h16M10 3L8 21M16 3l-2 18",
  back: "M19 12H5M12 19l-7-7 7-7",
  info: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 16v-4M12 8h.01",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
};

// ── Ders Renkleri ──
const COLORS = [
  { bg: "#00a884", light: "#d9fdd3" },
  { bg: "#3b82f6", light: "#dbeafe" },
  { bg: "#f59e0b", light: "#fef3c7" },
  { bg: "#ec4899", light: "#fce7f3" },
  { bg: "#8b5cf6", light: "#ede9fe" },
  { bg: "#ef4444", light: "#fee2e2" },
  { bg: "#14b8a6", light: "#ccfbf1" },
  { bg: "#f97316", light: "#ffedd5" },
];
const getColor = (code) => {
  let h = 0;
  for (let i = 0; i < (code || "").length; i++) h = code.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
};

// ══════════════════════════════════════════════════════════════
// ANA MODÜL
// ══════════════════════════════════════════════════════════════
function DersGruplariApp({ currentUser }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMyGroups, setShowMyGroups] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
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

  // ── Grup Oluştur (Sadece Admin) ──
  const handleCreateGroup = async (data) => {
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      const doc = {
        ...data,
        createdBy: userId,
        createdByName: userName,
        members: [userId],
        memberCount: 1,
        lastMessage: "",
        lastMessageTime: null,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      };
      const ref = await db.collection("course_groups").add(doc);
      setGroups(prev => [{ ...doc, id: ref.id }, ...prev]);
      setShowCreateModal(false);
    } catch (e) {
      console.error("Grup olusturulamadi:", e);
      alert("Grup oluşturulurken hata oluştu!");
    }
  };

  // ── Grup Düzenle (Sadece Admin) ──
  const handleEditGroup = async (data) => {
    if (!selectedGroup) return;
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      await db.collection("course_groups").doc(selectedGroup.id).update(data);
      const updated = { ...selectedGroup, ...data };
      setGroups(prev => prev.map(g => g.id === selectedGroup.id ? updated : g));
      setSelectedGroup(updated);
      setShowEditModal(false);
    } catch (e) { console.error("Grup duzenlenemedi:", e); }
  };

  // ── Grup Sil (Sadece Admin) ──
  const handleDeleteGroup = async (groupId) => {
    if (!confirm("Bu grubu silmek istediginize emin misiniz?")) return;
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      await db.collection("course_groups").doc(groupId).delete();
      // Mesajları da sil
      const msgSnap = await db.collection("course_group_posts").where("groupId", "==", groupId).get();
      const batch = db.batch();
      msgSnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      setGroups(prev => prev.filter(g => g.id !== groupId));
      if (selectedGroup?.id === groupId) { setSelectedGroup(null); setMessages([]); }
    } catch (e) { console.error("Grup silinemedi:", e); }
  };

  // ── Katıl / Ayrıl ──
  const handleJoinLeave = async (group) => {
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      const isMember = group.members?.includes(userId);
      const updated = isMember ? group.members.filter(m => m !== userId) : [...(group.members || []), userId];
      await db.collection("course_groups").doc(group.id).update({ members: updated, memberCount: updated.length });
      setGroups(prev => prev.map(g => g.id === group.id ? { ...g, members: updated, memberCount: updated.length } : g));
      if (selectedGroup?.id === group.id) setSelectedGroup(prev => ({ ...prev, members: updated, memberCount: updated.length }));
    } catch (e) { console.error("Katilim hatasi:", e); }
  };

  // ── Grup Seç ──
  const handleSelectGroup = async (group) => {
    setSelectedGroup(group);
    setShowGroupInfo(false);
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      const snap = await db.collection("course_group_posts").where("groupId", "==", group.id).orderBy("createdAt", "asc").get();
      setMessages(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) { console.error("Mesajlar yuklenemedi:", e); setMessages([]); }
  };

  // ── Mesaj Gönder ──
  const handleSendMessage = async (content) => {
    if (!content.trim() || !selectedGroup) return;
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      const msg = {
        groupId: selectedGroup.id,
        content: content.trim(),
        authorId: userId,
        authorName: userName,
        isPinned: false,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      };
      const ref = await db.collection("course_group_posts").add(msg);
      await db.collection("course_groups").doc(selectedGroup.id).update({
        lastMessage: content.trim().substring(0, 80),
        lastMessageTime: window.firebase.firestore.FieldValue.serverTimestamp(),
      });
      setMessages(prev => [...prev, { ...msg, id: ref.id }]);
      setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, lastMessage: content.trim().substring(0, 80) } : g));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) { console.error("Mesaj gonderilemedi:", e); }
  };

  // ── Mesaj Sil ──
  const handleDeleteMessage = async (msgId) => {
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      await db.collection("course_group_posts").doc(msgId).delete();
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (e) { console.error("Mesaj silinemedi:", e); }
  };

  // ── Mesaj Sabitle (Admin) ──
  const handleTogglePin = async (msg) => {
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      await db.collection("course_group_posts").doc(msg.id).update({ isPinned: !msg.isPinned });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isPinned: !m.isPinned } : m));
    } catch (e) { console.error("Sabitleme hatasi:", e); }
  };

  // ── Filtrele ──
  const filteredGroups = useMemo(() => {
    let r = groups;
    if (showMyGroups) r = r.filter(g => g.members?.includes(userId));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(g => g.courseCode?.toLowerCase().includes(q) || g.courseName?.toLowerCase().includes(q));
    }
    return r;
  }, [groups, searchQuery, showMyGroups, userId]);

  const isMember = selectedGroup?.members?.includes(userId);
  const pinnedMessages = messages.filter(m => m.isPinned);

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ display: "flex", height: "calc(100vh - 96px)", background: GRP.chatBg, overflow: "hidden" }}>

      {/* ── SOL PANEL: Grup Listesi ── */}
      <div style={{ width: 380, flexShrink: 0, background: GRP.sidebar, borderRight: `1px solid ${GRP.border}`, display: "flex", flexDirection: "column" }}>
        {/* Sidebar Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${GRP.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ color: GRP.text, fontSize: 20, fontWeight: 700 }}>Ders Gruplari</h2>
            {isAdmin && (
              <button onClick={() => setShowCreateModal(true)} style={{ background: GRP.accent, color: "white", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <GIcon d={IC.plus} size={14} color="white" /> Grup Olustur
              </button>
            )}
          </div>
          {/* Arama */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <GIcon d={IC.search} size={15} color={GRP.textSecondary} />
            </div>
            <input type="text" placeholder="Grup ara..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "8px 12px 8px 32px", background: GRP.input, border: "none", borderRadius: 8, fontSize: 13, color: GRP.text, outline: "none" }} />
          </div>
          {/* Filtre */}
          <div style={{ display: "flex", gap: 6 }}>
            {[{ key: false, label: "Tumu" }, { key: true, label: "Gruplarım" }].map(f => (
              <button key={String(f.key)} onClick={() => setShowMyGroups(f.key)} style={{
                flex: 1, padding: "5px 10px", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
                background: showMyGroups === f.key ? GRP.accent : GRP.input, color: showMyGroups === f.key ? "white" : GRP.textSecondary,
              }}>{f.label}</button>
            ))}
          </div>
        </div>

        {/* Grup Listesi */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: GRP.textSecondary }}>Yukleniyor...</div>
          ) : filteredGroups.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: GRP.textSecondary, fontSize: 14 }}>
              {searchQuery ? "Sonuc bulunamadi" : "Henuz grup yok"}
            </div>
          ) : (
            filteredGroups.map(group => {
              const clr = getColor(group.courseCode);
              const sel = selectedGroup?.id === group.id;
              const mem = group.members?.includes(userId);
              return (
                <div key={group.id} onClick={() => handleSelectGroup(group)} style={{
                  padding: "12px 16px", cursor: "pointer", display: "flex", gap: 12, alignItems: "center",
                  background: sel ? GRP.sidebarActive : "transparent", borderBottom: `1px solid ${GRP.border}`,
                  transition: "background 0.15s",
                }}>
                  {/* Avatar */}
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: clr.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "white", fontSize: 16, fontWeight: 700 }}>{(group.courseCode || "?").substring(0, 2)}</span>
                  </div>
                  {/* Bilgi */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: GRP.text, fontSize: 15, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.courseName}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <span style={{ background: clr.bg + "30", color: clr.bg, padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{group.courseCode}</span>
                      <span style={{ color: GRP.textSecondary, fontSize: 12 }}> · {group.memberCount || 0} uye</span>
                      {mem && <span style={{ color: GRP.accent, fontSize: 10, fontWeight: 700 }}>✓</span>}
                    </div>
                    {group.lastMessage && (
                      <div style={{ color: GRP.textSecondary, fontSize: 12, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

      {/* ── SAĞ PANEL: Sohbet ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {!selectedGroup ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: GRP.sidebarActive, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GIcon d={IC.hash} size={36} color={GRP.textSecondary} />
            </div>
            <h3 style={{ color: GRP.text, fontSize: 20, fontWeight: 300 }}>Ders Gruplari</h3>
            <p style={{ color: GRP.textSecondary, fontSize: 14, maxWidth: 400, textAlign: "center" }}>
              Soldaki listeden bir grup secin veya {isAdmin ? "yeni bir grup olusturun" : "bir gruba katilin"}
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div style={{ background: GRP.header, padding: "10px 16px", borderBottom: `1px solid ${GRP.border}`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: getColor(selectedGroup.courseCode).bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>{(selectedGroup.courseCode || "?").substring(0, 2)}</span>
              </div>
              <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setShowGroupInfo(!showGroupInfo)}>
                <div style={{ color: GRP.text, fontSize: 16, fontWeight: 600 }}>{selectedGroup.courseName}</div>
                <div style={{ color: GRP.textSecondary, fontSize: 12 }}>{selectedGroup.courseCode} · {selectedGroup.memberCount || 0} uye</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setShowGroupInfo(!showGroupInfo)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}>
                  <GIcon d={IC.info} size={20} color={GRP.textSecondary} />
                </button>
                {!isMember ? (
                  <button onClick={() => handleJoinLeave(selectedGroup)} style={{ background: GRP.accent, color: "white", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Katil</button>
                ) : (
                  <button onClick={() => handleJoinLeave(selectedGroup)} style={{ background: "rgba(239,68,68,0.15)", color: GRP.red, border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Ayril</button>
                )}
                {isAdmin && (
                  <>
                    <button onClick={() => setShowEditModal(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}><GIcon d={IC.edit} size={18} color={GRP.textSecondary} /></button>
                    <button onClick={() => handleDeleteGroup(selectedGroup.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}><GIcon d={IC.trash} size={18} color={GRP.red} /></button>
                  </>
                )}
              </div>
            </div>

            {/* Sabitlenmiş Mesajlar */}
            {pinnedMessages.length > 0 && (
              <div style={{ background: GRP.pinBg, padding: "8px 16px", borderBottom: `1px solid ${GRP.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                <GIcon d={IC.pin} size={14} color={GRP.accent} />
                <span style={{ color: GRP.text, fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {pinnedMessages[pinnedMessages.length - 1].content.substring(0, 80)}
                </span>
                <span style={{ color: GRP.textSecondary, fontSize: 11 }}>{pinnedMessages.length} sabitlenmis</span>
              </div>
            )}

            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* Mesaj Alanı */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px 60px", display: "flex", flexDirection: "column", gap: 2 }}>
                  {messages.length === 0 ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ background: GRP.sidebarActive, borderRadius: 10, padding: "12px 20px", textAlign: "center" }}>
                        <span style={{ color: GRP.textSecondary, fontSize: 13 }}>Henuz mesaj yok. {isMember ? "Ilk mesaji siz gonderin!" : "Gruba katilin."}</span>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.authorId === userId;
                      const showName = !isMe && (idx === 0 || messages[idx - 1]?.authorId !== msg.authorId);
                      const clr = getColor(msg.authorId || "");
                      const ts = msg.createdAt;
                      const timeStr = ts ? (ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts)).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "";
                      return (
                        <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginTop: showName ? 8 : 0 }}>
                          <div style={{
                            maxWidth: "65%", minWidth: 120, padding: "6px 10px 4px", borderRadius: 8,
                            background: isMe ? GRP.bubble : GRP.bubbleOther,
                            borderTopLeftRadius: !isMe && showName ? 0 : 8, borderTopRightRadius: isMe && (idx === 0 || messages[idx - 1]?.authorId !== msg.authorId) ? 0 : 8,
                            position: "relative",
                          }}
                            onMouseEnter={e => { const a = e.currentTarget.querySelector('.msg-actions'); if (a) a.style.opacity = '1'; }}
                            onMouseLeave={e => { const a = e.currentTarget.querySelector('.msg-actions'); if (a) a.style.opacity = '0'; }}
                          >
                            {msg.isPinned && (
                              <div style={{ fontSize: 10, color: GRP.accent, fontWeight: 600, marginBottom: 2 }}>📌 Sabitlenmis</div>
                            )}
                            {showName && !isMe && (
                              <div style={{ fontSize: 12, fontWeight: 600, color: clr.bg, marginBottom: 2 }}>{msg.authorName}</div>
                            )}
                            <div style={{ fontSize: 14, color: GRP.text, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</div>
                            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 2 }}>
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{timeStr}</span>
                            </div>
                            {/* Mesaj aksiyonları */}
                            {(isAdmin || isMe) && (
                              <div className="msg-actions" style={{ position: "absolute", top: 4, right: isMe ? "auto" : 4, left: isMe ? 4 : "auto", opacity: 0, transition: "opacity 0.15s", display: "flex", gap: 2 }}>
                                {isAdmin && (
                                  <button onClick={() => handleTogglePin(msg)} title={msg.isPinned ? "Kaldir" : "Sabitle"} style={{ background: GRP.sidebarActive, border: "none", borderRadius: 4, padding: 3, cursor: "pointer" }}>
                                    <GIcon d={IC.pin} size={12} color={msg.isPinned ? GRP.accent : GRP.textSecondary} />
                                  </button>
                                )}
                                <button onClick={() => handleDeleteMessage(msg.id)} title="Sil" style={{ background: GRP.sidebarActive, border: "none", borderRadius: 4, padding: 3, cursor: "pointer" }}>
                                  <GIcon d={IC.trash} size={12} color={GRP.red} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Mesaj Giriş */}
                {isMember ? (
                  <MessageInput onSend={handleSendMessage} />
                ) : (
                  <div style={{ padding: 16, background: GRP.header, borderTop: `1px solid ${GRP.border}`, textAlign: "center" }}>
                    <span style={{ color: GRP.textSecondary, fontSize: 14 }}>Mesaj gondermek icin gruba katilin</span>
                  </div>
                )}
              </div>

              {/* Grup Bilgi Paneli */}
              {showGroupInfo && (
                <div style={{ width: 300, background: GRP.sidebar, borderLeft: `1px solid ${GRP.border}`, overflowY: "auto", flexShrink: 0 }}>
                  <div style={{ padding: 20, textAlign: "center", borderBottom: `1px solid ${GRP.border}` }}>
                    <div style={{ width: 70, height: 70, borderRadius: "50%", background: getColor(selectedGroup.courseCode).bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                      <span style={{ color: "white", fontSize: 24, fontWeight: 700 }}>{(selectedGroup.courseCode || "?").substring(0, 2)}</span>
                    </div>
                    <div style={{ color: GRP.text, fontSize: 18, fontWeight: 600 }}>{selectedGroup.courseName}</div>
                    <div style={{ color: GRP.textSecondary, fontSize: 13, marginTop: 4 }}>{selectedGroup.courseCode} · {selectedGroup.memberCount || 0} uye</div>
                    {selectedGroup.description && (
                      <div style={{ color: GRP.textSecondary, fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>{selectedGroup.description}</div>
                    )}
                  </div>
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ color: GRP.textSecondary, fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 10 }}>Uyeler ({selectedGroup.members?.length || 0})</div>
                    {(selectedGroup.members || []).map(mid => (
                      <div key={mid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${GRP.border}` }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: getColor(mid).bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>{mid.charAt(0).toUpperCase()}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: GRP.text, fontSize: 13, fontWeight: 500 }}>{mid}</div>
                          {mid === selectedGroup.createdBy && <span style={{ color: GRP.accent, fontSize: 10, fontWeight: 600 }}>Olusturan</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Modaller ── */}
      {showCreateModal && <GroupModal onClose={() => setShowCreateModal(false)} onSave={handleCreateGroup} title="Yeni Grup Olustur" />}
      {showEditModal && selectedGroup && <GroupModal onClose={() => setShowEditModal(false)} onSave={handleEditGroup} title="Grubu Duzenle" initial={selectedGroup} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MESAJ GİRİŞ
// ══════════════════════════════════════════════════════════════
function MessageInput({ onSend }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div style={{ padding: "10px 16px", background: GRP.header, borderTop: `1px solid ${GRP.border}`, display: "flex", gap: 10, alignItems: "flex-end" }}>
      <textarea
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Bir mesaj yazin..."
        rows={1}
        style={{
          flex: 1, padding: "10px 14px", background: GRP.input, border: "none", borderRadius: 10,
          color: GRP.text, fontSize: 14, outline: "none", resize: "none", fontFamily: "'Source Sans 3', sans-serif",
          maxHeight: 120, minHeight: 40,
        }}
        onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
      />
      <button onClick={handleSubmit} disabled={!text.trim()} style={{
        width: 42, height: 42, borderRadius: "50%", border: "none", cursor: text.trim() ? "pointer" : "default",
        background: text.trim() ? GRP.accent : GRP.input, display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.2s",
      }}>
        <GIcon d={IC.send} size={18} color={text.trim() ? "white" : GRP.textSecondary} />
      </button>
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
    if (!courseCode.trim() || !courseName.trim()) { alert("Ders kodu ve adi zorunludur!"); return; }
    onSave({ courseCode: courseCode.trim().toUpperCase(), courseName: courseName.trim(), description: description.trim() });
  };

  const inputStyle = { width: "100%", padding: "10px 14px", background: GRP.input, border: "none", borderRadius: 8, fontSize: 14, color: GRP.text, outline: "none" };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: GRP.textSecondary, display: "block", marginBottom: 6 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: GRP.sidebar, borderRadius: 12, padding: 28, width: 440, boxShadow: "0 25px 50px rgba(0,0,0,0.4)" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: GRP.text, marginBottom: 20 }}>{title}</h3>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Ders Kodu *</label>
          <input type="text" value={courseCode} onChange={e => setCourseCode(e.target.value)} placeholder="Orn: BIL307" style={inputStyle} />
          {suggestions.length > 0 && (
            <div style={{ border: `1px solid ${GRP.border}`, borderRadius: 8, marginTop: 4, background: GRP.sidebarActive, overflow: "hidden" }}>
              {suggestions.map(s => (
                <div key={s.code} onClick={() => { setCourseCode(s.code); setCourseName(s.name); }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: GRP.text, borderBottom: `1px solid ${GRP.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = GRP.sidebarHover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <strong style={{ color: GRP.accent }}>{s.code}</strong> — {s.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Ders Adi *</label>
          <input type="text" value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Orn: Mikroislemciler" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Aciklama</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Grup aciklamasi..." rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "'Source Sans 3', sans-serif" }} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", background: GRP.input, color: GRP.textSecondary, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>Iptal</button>
          <button onClick={handleSubmit} style={{ padding: "10px 24px", background: GRP.accent, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            {initial ? "Kaydet" : "Olustur"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Export
window.DersGruplariApp = DersGruplariApp;
