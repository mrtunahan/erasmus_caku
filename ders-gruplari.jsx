// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Ders Bazlı Gruplar / Kanallar
// Ders kodu ile grup oluşturma, katılma, gönderi akışı, duyuru sabitleme
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ── Shared bileşenlerden import ──
const GC = window.C;
const GDY = window.DY;

// ── Renkler ──
const GRP_COLORS = {
  primary: "#1e40af",
  primaryLight: "#3b82f6",
  primaryPale: "#dbeafe",
  gold: "#d4af37",
  goldLight: "#fef3c7",
  green: "#059669",
  greenLight: "#d1fae5",
  red: "#dc2626",
  redLight: "#fee2e2",
  bg: "#f0f4ff",
  card: "#ffffff",
  text: "#1f2937",
  textMuted: "#6b7280",
  border: "#e5e7eb",
};

// ── SVG Icon Helper ──
const GrpIcon = ({ path, size, color }) => (
  <svg width={size || 18} height={size || 18} viewBox="0 0 24 24" fill="none"
    stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const GRP_ICONS = {
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  plus: "M12 5v14M5 12h14",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  pin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 7v4M12 15h.01",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  megaphone: "M3 11l18-5v12L3 13v-2zM11.6 16.8a3 3 0 11-5.8-1.6",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  hash: "M4 9h16M4 15h16M10 3L8 21M16 3l-2 18",
  x: "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  clock: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
  message: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  book: "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5V5a2 2 0 012-2h14v14H6.5a2.5 2.5 0 00-2.5 2.5z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  userPlus: "M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6",
};

// ── Ders Renk Eşleştirme ──
const COURSE_COLORS = [
  { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  { bg: "#d1fae5", border: "#059669", text: "#065f46" },
  { bg: "#fef3c7", border: "#d97706", text: "#92400e" },
  { bg: "#fce7f3", border: "#db2777", text: "#9d174d" },
  { bg: "#e0e7ff", border: "#6366f1", text: "#4338ca" },
  { bg: "#fecaca", border: "#ef4444", text: "#991b1b" },
  { bg: "#ccfbf1", border: "#14b8a6", text: "#0f766e" },
  { bg: "#f3e8ff", border: "#a855f7", text: "#7e22ce" },
];

const getCourseColor = (code) => {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
};

// ══════════════════════════════════════════════════════════════
// ANA MODÜL
// ══════════════════════════════════════════════════════════════
function DersGruplariApp({ currentUser }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMyGroups, setShowMyGroups] = useState(false);

  const userId = currentUser?.studentNumber || currentUser?.name || "anonymous";
  const isAdmin = currentUser?.role === "admin";

  // ── Grupları Yükle ──
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const db = window.firebase?.firestore();
      if (!db) { setLoading(false); return; }
      const snapshot = await db.collection("course_groups").orderBy("createdAt", "desc").get();
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setGroups(data);
    } catch (e) {
      console.error("Gruplar yuklenemedi:", e);
    }
    setLoading(false);
  };

  // ── Grup Oluştur ──
  const handleCreateGroup = async (groupData) => {
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      const docRef = await db.collection("course_groups").add({
        ...groupData,
        createdBy: userId,
        createdByName: currentUser?.name || userId,
        admins: [userId],
        members: [userId],
        memberCount: 1,
        postCount: 0,
        pinnedPosts: [],
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      });
      const newGroup = { ...groupData, id: docRef.id, createdBy: userId, createdByName: currentUser?.name || userId, admins: [userId], members: [userId], memberCount: 1, postCount: 0, pinnedPosts: [] };
      setGroups(prev => [newGroup, ...prev]);
      setShowCreateModal(false);
    } catch (e) {
      console.error("Grup olusturulamadi:", e);
      alert("Grup oluşturulurken hata oluştu!");
    }
  };

  // ── Gruba Katıl / Ayrıl ──
  const handleJoinLeave = async (group) => {
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      const isMember = group.members?.includes(userId);
      const updatedMembers = isMember
        ? group.members.filter(m => m !== userId)
        : [...(group.members || []), userId];

      await db.collection("course_groups").doc(group.id).update({
        members: updatedMembers,
        memberCount: updatedMembers.length,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      });

      setGroups(prev => prev.map(g =>
        g.id === group.id ? { ...g, members: updatedMembers, memberCount: updatedMembers.length } : g
      ));

      if (selectedGroup?.id === group.id) {
        setSelectedGroup(prev => ({ ...prev, members: updatedMembers, memberCount: updatedMembers.length }));
      }
    } catch (e) {
      console.error("Katilma/ayrilma hatasi:", e);
    }
  };

  // ── Grup Seç & Gönderileri Yükle ──
  const handleSelectGroup = async (group) => {
    setSelectedGroup(group);
    loadPosts(group.id);
  };

  const loadPosts = async (groupId) => {
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      const snapshot = await db.collection("course_group_posts")
        .where("groupId", "==", groupId)
        .orderBy("createdAt", "desc")
        .get();
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setPosts(data);
    } catch (e) {
      console.error("Gonderiler yuklenemedi:", e);
      setPosts([]);
    }
  };

  // ── Gönderi Oluştur ──
  const handleCreatePost = async (content, isAnnouncement = false) => {
    if (!content.trim() || !selectedGroup) return;
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      const postData = {
        groupId: selectedGroup.id,
        content: content.trim(),
        authorId: userId,
        authorName: currentUser?.name || userId,
        isAnnouncement,
        isPinned: false,
        reactions: {},
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      };
      const docRef = await db.collection("course_group_posts").add(postData);

      // Update post count
      await db.collection("course_groups").doc(selectedGroup.id).update({
        postCount: window.firebase.firestore.FieldValue.increment(1),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      });

      setPosts(prev => [{ ...postData, id: docRef.id }, ...prev]);
      setSelectedGroup(prev => ({ ...prev, postCount: (prev.postCount || 0) + 1 }));
    } catch (e) {
      console.error("Gonderi olusturulamadi:", e);
    }
  };

  // ── Gönderi Sabitle / Kaldır ──
  const handleTogglePin = async (post) => {
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      const newPinned = !post.isPinned;
      await db.collection("course_group_posts").doc(post.id).update({ isPinned: newPinned });

      let pinnedPosts = selectedGroup.pinnedPosts || [];
      if (newPinned) {
        pinnedPosts = [...pinnedPosts, post.id];
      } else {
        pinnedPosts = pinnedPosts.filter(id => id !== post.id);
      }
      await db.collection("course_groups").doc(selectedGroup.id).update({ pinnedPosts });

      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isPinned: newPinned } : p));
      setSelectedGroup(prev => ({ ...prev, pinnedPosts }));
    } catch (e) {
      console.error("Sabitleme hatasi:", e);
    }
  };

  // ── Gönderi Sil ──
  const handleDeletePost = async (postId) => {
    if (!confirm("Bu gönderiyi silmek istediğinize emin misiniz?")) return;
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      await db.collection("course_group_posts").doc(postId).delete();
      await db.collection("course_groups").doc(selectedGroup.id).update({
        postCount: window.firebase.firestore.FieldValue.increment(-1),
      });
      setPosts(prev => prev.filter(p => p.id !== postId));
      setSelectedGroup(prev => ({ ...prev, postCount: Math.max(0, (prev.postCount || 1) - 1) }));
    } catch (e) {
      console.error("Gonderi silinemedi:", e);
    }
  };

  // ── Yönetici Ata ──
  const handleAssignAdmin = async (memberId) => {
    if (!selectedGroup) return;
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      const isAlreadyAdmin = selectedGroup.admins?.includes(memberId);
      const updatedAdmins = isAlreadyAdmin
        ? selectedGroup.admins.filter(a => a !== memberId)
        : [...(selectedGroup.admins || []), memberId];

      await db.collection("course_groups").doc(selectedGroup.id).update({
        admins: updatedAdmins,
      });
      setSelectedGroup(prev => ({ ...prev, admins: updatedAdmins }));
      setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, admins: updatedAdmins } : g));
    } catch (e) {
      console.error("Yonetici atama hatasi:", e);
    }
  };

  // ── Filtrele ──
  const filteredGroups = useMemo(() => {
    let result = groups;
    if (showMyGroups) {
      result = result.filter(g => g.members?.includes(userId));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g =>
        g.courseCode?.toLowerCase().includes(q) ||
        g.courseName?.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [groups, searchQuery, showMyGroups, userId]);

  // ── Sıralama: sabitlenmiş gönderiler üstte ──
  const sortedPosts = useMemo(() => {
    const pinned = posts.filter(p => p.isPinned);
    const normal = posts.filter(p => !p.isPinned);
    return [...pinned, ...normal];
  }, [posts]);

  const isGroupAdmin = selectedGroup?.admins?.includes(userId) || isAdmin;
  const isGroupMember = selectedGroup?.members?.includes(userId);

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ background: GRP_COLORS.bg, minHeight: "100vh", padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
        padding: "32px 0 24px", marginBottom: 24,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ color: "white", fontSize: 28, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
            <GrpIcon path={GRP_ICONS.hash} size={28} color="rgba(255,255,255,0.8)" /> Ders Grupları
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", marginTop: 4, fontSize: 14 }}>
            Ders bazlı kanallar oluşturun, tartışmalara katılın
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", gap: 24 }}>

        {/* ── SOL PANEL: Grup Listesi ── */}
        <div style={{ width: 360, flexShrink: 0 }}>
          {/* Arama & Filtre */}
          <div style={{
            background: "white", borderRadius: 12, padding: 16, marginBottom: 16,
            border: `1px solid ${GRP_COLORS.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <GrpIcon path={GRP_ICONS.search} size={16} color="#9ca3af" />
                <input
                  type="text"
                  placeholder="Ders kodu veya isim ara..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px 8px 32px", border: `1px solid ${GRP_COLORS.border}`,
                    borderRadius: 8, fontSize: 13, outline: "none",
                  }}
                />
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  background: "linear-gradient(135deg, #1e40af, #3b82f6)", color: "white",
                  border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
                }}
              >
                <GrpIcon path={GRP_ICONS.plus} size={16} color="white" /> Yeni
              </button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowMyGroups(false)}
                style={{
                  flex: 1, padding: "6px 12px", border: `1px solid ${!showMyGroups ? GRP_COLORS.primary : GRP_COLORS.border}`,
                  background: !showMyGroups ? GRP_COLORS.primaryPale : "white",
                  color: !showMyGroups ? GRP_COLORS.primary : GRP_COLORS.textMuted,
                  borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
                }}
              >
                Tüm Gruplar
              </button>
              <button
                onClick={() => setShowMyGroups(true)}
                style={{
                  flex: 1, padding: "6px 12px", border: `1px solid ${showMyGroups ? GRP_COLORS.primary : GRP_COLORS.border}`,
                  background: showMyGroups ? GRP_COLORS.primaryPale : "white",
                  color: showMyGroups ? GRP_COLORS.primary : GRP_COLORS.textMuted,
                  borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
                }}
              >
                Gruplarım
              </button>
            </div>
          </div>

          {/* Grup Kartları */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: GRP_COLORS.textMuted }}>Yükleniyor...</div>
          ) : filteredGroups.length === 0 ? (
            <div style={{
              textAlign: "center", padding: 40, color: GRP_COLORS.textMuted,
              background: "white", borderRadius: 12, border: `1px solid ${GRP_COLORS.border}`,
            }}>
              {searchQuery ? "Sonuç bulunamadı" : "Henüz grup oluşturulmamış"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredGroups.map(group => {
                const color = getCourseColor(group.courseCode || "");
                const isSelected = selectedGroup?.id === group.id;
                const isMember = group.members?.includes(userId);
                return (
                  <div
                    key={group.id}
                    onClick={() => handleSelectGroup(group)}
                    style={{
                      background: isSelected ? color.bg : "white",
                      border: `2px solid ${isSelected ? color.border : GRP_COLORS.border}`,
                      borderRadius: 12, padding: 14, cursor: "pointer",
                      transition: "all 0.2s",
                      boxShadow: isSelected ? `0 2px 8px ${color.border}40` : "0 1px 3px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{
                            background: color.bg, color: color.text, padding: "2px 8px",
                            borderRadius: 6, fontSize: 12, fontWeight: 700, border: `1px solid ${color.border}`,
                          }}>
                            {group.courseCode}
                          </span>
                          {isMember && (
                            <span style={{
                              background: GRP_COLORS.greenLight, color: GRP_COLORS.green,
                              padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                            }}>Üye</span>
                          )}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: GRP_COLORS.text, marginBottom: 2 }}>
                          {group.courseName}
                        </div>
                        <div style={{ fontSize: 12, color: GRP_COLORS.textMuted }}>
                          <GrpIcon path={GRP_ICONS.users} size={12} /> {group.memberCount || 0} üye · {group.postCount || 0} gönderi
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleJoinLeave(group); }}
                        style={{
                          background: isMember ? GRP_COLORS.redLight : GRP_COLORS.greenLight,
                          color: isMember ? GRP_COLORS.red : GRP_COLORS.green,
                          border: "none", borderRadius: 6, padding: "4px 10px",
                          fontSize: 11, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {isMember ? "Ayrıl" : "Katıl"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── SAĞ PANEL: Grup Detay & Gönderiler ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedGroup ? (
            <div style={{
              background: "white", borderRadius: 16, padding: 60, textAlign: "center",
              border: `1px solid ${GRP_COLORS.border}`,
            }}>
              <GrpIcon path={GRP_ICONS.hash} size={48} color="#d1d5db" />
              <h3 style={{ color: GRP_COLORS.textMuted, marginTop: 16, fontSize: 18 }}>
                Bir grup seçin veya yeni bir grup oluşturun
              </h3>
              <p style={{ color: "#9ca3af", fontSize: 14, marginTop: 8 }}>
                Soldaki listeden bir ders grubu seçerek tartışmalara katılabilirsiniz
              </p>
            </div>
          ) : (
            <GroupDetail
              group={selectedGroup}
              posts={sortedPosts}
              currentUser={currentUser}
              userId={userId}
              isAdmin={isGroupAdmin}
              isMember={isGroupMember}
              onCreatePost={handleCreatePost}
              onTogglePin={handleTogglePin}
              onDeletePost={handleDeletePost}
              onAssignAdmin={handleAssignAdmin}
              onJoinLeave={() => handleJoinLeave(selectedGroup)}
            />
          )}
        </div>
      </div>

      {/* ── Grup Oluşturma Modalı ── */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateGroup}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// GRUP DETAY BİLEŞENİ
// ══════════════════════════════════════════════════════════════
function GroupDetail({ group, posts, currentUser, userId, isAdmin, isMember, onCreatePost, onTogglePin, onDeletePost, onAssignAdmin, onJoinLeave }) {
  const [newPost, setNewPost] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const color = getCourseColor(group.courseCode || "");

  const handleSubmit = () => {
    if (!newPost.trim()) return;
    onCreatePost(newPost, isAnnouncement);
    setNewPost("");
    setIsAnnouncement(false);
  };

  return (
    <div>
      {/* Grup Başlık */}
      <div style={{
        background: `linear-gradient(135deg, ${color.text}, ${color.border})`,
        borderRadius: 16, padding: 24, marginBottom: 16, color: "white",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{
                background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: 8,
                fontSize: 14, fontWeight: 700,
              }}>
                {group.courseCode}
              </span>
              <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
                {group.courseName}
              </h2>
            </div>
            {group.description && (
              <p style={{ opacity: 0.85, fontSize: 14, maxWidth: 500 }}>{group.description}</p>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 13, opacity: 0.8 }}>
              <span><GrpIcon path={GRP_ICONS.users} size={14} color="white" /> {group.memberCount || 0} üye</span>
              <span><GrpIcon path={GRP_ICONS.message} size={14} color="white" /> {group.postCount || 0} gönderi</span>
              <span><GrpIcon path={GRP_ICONS.clock} size={14} color="white" /> {group.createdByName}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowMembers(!showMembers)}
              style={{
                background: "rgba(255,255,255,0.15)", color: "white", border: "none",
                borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500,
              }}
            >
              <GrpIcon path={GRP_ICONS.users} size={14} color="white" /> Üyeler
            </button>
            <button
              onClick={onJoinLeave}
              style={{
                background: isMember ? "rgba(220,38,38,0.8)" : "rgba(5,150,105,0.8)",
                color: "white", border: "none", borderRadius: 8, padding: "8px 14px",
                cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              {isMember ? "Ayrıl" : "Katıl"}
            </button>
          </div>
        </div>
      </div>

      {/* Üye Listesi */}
      {showMembers && (
        <div style={{
          background: "white", borderRadius: 12, padding: 16, marginBottom: 16,
          border: `1px solid ${GRP_COLORS.border}`,
        }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: GRP_COLORS.text }}>
            <GrpIcon path={GRP_ICONS.users} size={16} /> Grup Üyeleri ({group.members?.length || 0})
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(group.members || []).map(memberId => {
              const memberIsAdmin = group.admins?.includes(memberId);
              return (
                <div key={memberId} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                  background: memberIsAdmin ? GRP_COLORS.primaryPale : "#f3f4f6",
                  borderRadius: 8, fontSize: 13,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: memberIsAdmin ? GRP_COLORS.primary : "#9ca3af",
                    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {memberId.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 500 }}>{memberId}</span>
                  {memberIsAdmin && (
                    <span style={{ fontSize: 10, color: GRP_COLORS.primary, fontWeight: 700 }}>Yönetici</span>
                  )}
                  {isAdmin && memberId !== userId && (
                    <button
                      onClick={() => onAssignAdmin(memberId)}
                      title={memberIsAdmin ? "Yöneticilikten çıkar" : "Yönetici yap"}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: memberIsAdmin ? GRP_COLORS.red : GRP_COLORS.green, fontSize: 11,
                        padding: "2px 4px",
                      }}
                    >
                      <GrpIcon path={memberIsAdmin ? GRP_ICONS.x : GRP_ICONS.shield} size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gönderi Yazma Alanı */}
      {isMember && (
        <div style={{
          background: "white", borderRadius: 12, padding: 16, marginBottom: 16,
          border: `1px solid ${GRP_COLORS.border}`,
        }}>
          <textarea
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            placeholder="Gruba bir şey yazın..."
            rows={3}
            style={{
              width: "100%", border: `1px solid ${GRP_COLORS.border}`, borderRadius: 8,
              padding: 12, fontSize: 14, resize: "vertical", outline: "none",
              fontFamily: "'Source Sans 3', sans-serif",
            }}
            onFocus={e => e.target.style.borderColor = GRP_COLORS.primaryLight}
            onBlur={e => e.target.style.borderColor = GRP_COLORS.border}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {isAdmin && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: GRP_COLORS.textMuted, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isAnnouncement}
                    onChange={e => setIsAnnouncement(e.target.checked)}
                    style={{ accentColor: GRP_COLORS.primary }}
                  />
                  <GrpIcon path={GRP_ICONS.megaphone} size={14} /> Duyuru olarak paylaş
                </label>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!newPost.trim()}
              style={{
                background: newPost.trim() ? "linear-gradient(135deg, #1e40af, #3b82f6)" : "#e5e7eb",
                color: newPost.trim() ? "white" : "#9ca3af",
                border: "none", borderRadius: 8, padding: "8px 20px", cursor: newPost.trim() ? "pointer" : "default",
                fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <GrpIcon path={GRP_ICONS.send} size={16} color={newPost.trim() ? "white" : "#9ca3af"} /> Gönder
            </button>
          </div>
        </div>
      )}

      {/* Gönderiler */}
      {posts.length === 0 ? (
        <div style={{
          background: "white", borderRadius: 12, padding: 40, textAlign: "center",
          border: `1px solid ${GRP_COLORS.border}`, color: GRP_COLORS.textMuted,
        }}>
          Henüz gönderi yok. İlk gönderiyi siz paylaşın!
        </div>
      ) : (
        sortedPosts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            userId={userId}
            isAdmin={isAdmin}
            onTogglePin={onTogglePin}
            onDelete={onDeletePost}
            color={color}
          />
        ))
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// GÖNDERİ KARTI
// ══════════════════════════════════════════════════════════════
function PostCard({ post, userId, isAdmin, onTogglePin, onDelete, color }) {
  const isOwner = post.authorId === userId;
  const canManage = isAdmin || isOwner;

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{
      background: "white", borderRadius: 12, padding: 16, marginBottom: 12,
      border: `1px solid ${post.isPinned ? color.border : post.isAnnouncement ? "#fbbf24" : GRP_COLORS.border}`,
      borderLeft: post.isPinned ? `4px solid ${color.border}` : post.isAnnouncement ? "4px solid #f59e0b" : "none",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      {/* Pinned / Announcement Badge */}
      {(post.isPinned || post.isAnnouncement) && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {post.isPinned && (
            <span style={{
              background: color.bg, color: color.text, padding: "2px 8px",
              borderRadius: 4, fontSize: 11, fontWeight: 600,
            }}>
              <GrpIcon path={GRP_ICONS.pin} size={10} /> Sabitlenmiş
            </span>
          )}
          {post.isAnnouncement && (
            <span style={{
              background: "#fef3c7", color: "#92400e", padding: "2px 8px",
              borderRadius: 4, fontSize: 11, fontWeight: 600,
            }}>
              <GrpIcon path={GRP_ICONS.megaphone} size={10} /> Duyuru
            </span>
          )}
        </div>
      )}

      {/* Author & Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: `linear-gradient(135deg, ${color.border}, ${color.text})`,
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700,
          }}>
            {(post.authorName || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: GRP_COLORS.text }}>{post.authorName}</div>
            <div style={{ fontSize: 11, color: GRP_COLORS.textMuted }}>{formatDate(post.createdAt)}</div>
          </div>
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: 4 }}>
            {isAdmin && (
              <button
                onClick={() => onTogglePin(post)}
                title={post.isPinned ? "Sabitlemeyi kaldır" : "Sabitle"}
                style={{
                  background: post.isPinned ? color.bg : "transparent", border: "none",
                  cursor: "pointer", padding: 4, borderRadius: 4, color: post.isPinned ? color.text : GRP_COLORS.textMuted,
                }}
              >
                <GrpIcon path={GRP_ICONS.pin} size={16} />
              </button>
            )}
            <button
              onClick={() => onDelete(post.id)}
              title="Sil"
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                padding: 4, borderRadius: 4, color: GRP_COLORS.textMuted,
              }}
            >
              <GrpIcon path={GRP_ICONS.trash} size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{
        fontSize: 14, lineHeight: 1.7, color: GRP_COLORS.text, whiteSpace: "pre-wrap",
      }}>
        {post.content}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// GRUP OLUŞTURMA MODALI
// ══════════════════════════════════════════════════════════════
function CreateGroupModal({ onClose, onCreate }) {
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [description, setDescription] = useState("");

  // Ders kataloğundan otomatik tamamlama
  const catalogCourses = window.HOME_INSTITUTION_CATALOG?.courses || [];
  const suggestions = useMemo(() => {
    if (!courseCode || courseCode.length < 2) return [];
    const q = courseCode.toUpperCase();
    return catalogCourses.filter(c => c.code.includes(q) || c.name.toLowerCase().includes(courseCode.toLowerCase())).slice(0, 5);
  }, [courseCode]);

  const handleSelectSuggestion = (course) => {
    setCourseCode(course.code);
    setCourseName(course.name);
  };

  const handleSubmit = () => {
    if (!courseCode.trim() || !courseName.trim()) {
      alert("Ders kodu ve adı zorunludur!");
      return;
    }
    onCreate({ courseCode: courseCode.trim().toUpperCase(), courseName: courseName.trim(), description: description.trim() });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "white", borderRadius: 16, padding: 32, width: 480,
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)", animation: "fadeInUp 0.2s ease-out",
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: GRP_COLORS.text, marginBottom: 20 }}>
          <GrpIcon path={GRP_ICONS.plus} size={20} color={GRP_COLORS.primary} /> Yeni Ders Grubu Oluştur
        </h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: GRP_COLORS.text, display: "block", marginBottom: 6 }}>
            Ders Kodu *
          </label>
          <input
            type="text"
            value={courseCode}
            onChange={e => setCourseCode(e.target.value)}
            placeholder="Örn: MAT101"
            style={{
              width: "100%", padding: "10px 14px", border: `1px solid ${GRP_COLORS.border}`,
              borderRadius: 8, fontSize: 14, outline: "none",
            }}
          />
          {suggestions.length > 0 && (
            <div style={{
              border: `1px solid ${GRP_COLORS.border}`, borderRadius: 8, marginTop: 4,
              background: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}>
              {suggestions.map(s => (
                <div
                  key={s.code}
                  onClick={() => handleSelectSuggestion(s)}
                  style={{
                    padding: "8px 12px", cursor: "pointer", fontSize: 13,
                    borderBottom: `1px solid ${GRP_COLORS.border}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = GRP_COLORS.primaryPale}
                  onMouseLeave={e => e.currentTarget.style.background = "white"}
                >
                  <strong>{s.code}</strong> — {s.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: GRP_COLORS.text, display: "block", marginBottom: 6 }}>
            Ders Adı *
          </label>
          <input
            type="text"
            value={courseName}
            onChange={e => setCourseName(e.target.value)}
            placeholder="Örn: Matematik I"
            style={{
              width: "100%", padding: "10px 14px", border: `1px solid ${GRP_COLORS.border}`,
              borderRadius: 8, fontSize: 14, outline: "none",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: GRP_COLORS.text, display: "block", marginBottom: 6 }}>
            Açıklama
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Grubun amacı veya kuralları..."
            rows={3}
            style={{
              width: "100%", padding: "10px 14px", border: `1px solid ${GRP_COLORS.border}`,
              borderRadius: 8, fontSize: 14, resize: "vertical", outline: "none",
              fontFamily: "'Source Sans 3', sans-serif",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px", border: `1px solid ${GRP_COLORS.border}`,
              background: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, color: GRP_COLORS.textMuted,
            }}
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: "10px 24px", border: "none",
              background: "linear-gradient(135deg, #1e40af, #3b82f6)", color: "white",
              borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600,
            }}
          >
            Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}

// Export
window.DersGruplariApp = DersGruplariApp;
