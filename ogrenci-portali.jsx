// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Öğrenci Portalı
// Yardımlaşma, eğlence ve bilgi paylaşımı modülü
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ── Shared bileşenlerden import ──
const PC = window.C;
const PCard = window.Card;
const PBtn = window.Btn;
const PInput = window.Input;
const PModal = window.Modal;
const PBadge = window.Badge;

// ══════════════════════════════════════════════════════════════
// SABİTLER
// ══════════════════════════════════════════════════════════════

const PORTAL_CATEGORIES = [
  { id: "soru", label: "Soru-Cevap", emoji: "?", color: "#3B82F6", bg: "#DBEAFE" },
  { id: "not", label: "Not Paylaşımı", emoji: "N", color: "#8B5CF6", bg: "#EDE9FE" },
  { id: "duyuru", label: "Duyuru", emoji: "!", color: "#EF4444", bg: "#FEE2E2" },
  { id: "etkinlik", label: "Etkinlik", emoji: "E", color: "#F59E0B", bg: "#FEF3C7" },
  { id: "kaynak", label: "Kaynak", emoji: "K", color: "#10B981", bg: "#D1FAE5" },
  { id: "sohbet", label: "Sohbet", emoji: "S", color: "#EC4899", bg: "#FCE7F3" },
  { id: "anket", label: "Anket", emoji: "A", color: "#6366F1", bg: "#E0E7FF" },
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
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: small ? "2px 8px" : "4px 12px",
      borderRadius: 20, fontSize: small ? 11 : 12,
      fontWeight: 600, color: cat.color, background: cat.bg,
    }}>
      <span style={{ fontSize: small ? 10 : 12 }}>{cat.emoji}</span> {cat.label}
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

// ── Yorum Bölümü ──
const CommentSection = ({ postId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

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
                  <div key={c.id} style={{
                    display: "flex", gap: 10, padding: "10px 0",
                    borderBottom: "1px solid " + PC.borderLight,
                  }}>
                    <Avatar name={c.authorName} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: PC.navy }}>{c.authorName}</span>
                        <span style={{ fontSize: 11, color: PC.textMuted }}>{timeAgo(c.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: PC.text, marginTop: 4, lineHeight: 1.5 }}>{c.text}</div>
                    </div>
                  </div>
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
const PostCard = ({ post, currentUser, onReact, onVote, onDelete, onEdit, onTogglePin }) => {
  var cat = getCategoryInfo(post.category);
  var userId = getUserId(currentUser);
  var isAuthor = post.authorId === userId || currentUser.role === "admin";
  var isAdmin = currentUser.role === "admin";

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || "");
  const [editContent, setEditContent] = useState(post.content || "");
  const [saving, setSaving] = useState(false);

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
    <div style={{
      background: "white", borderRadius: 16, padding: 0,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      border: "1px solid " + PC.borderLight,
      transition: "box-shadow 0.2s",
      overflow: "hidden",
    }}>
      {/* Pinned banner */}
      {post.pinned && (
        <div style={{
          background: "linear-gradient(90deg, #F59E0B, #F97316)",
          padding: "4px 16px", fontSize: 11, fontWeight: 700,
          color: "white", display: "flex", alignItems: "center", gap: 6,
        }}>
          <span>{"\uD83D\uDCCC"}</span> Sabitlenmiş Gönderi
        </div>
      )}

      <div style={{ padding: "20px 24px" }}>
        {/* Üst kısım: avatar + yazar + zaman + kategori */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Avatar name={post.authorName} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: PC.navy }}>{post.authorName}</span>
              <CategoryBadge category={post.category} small />
              {post.tag && (
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 4,
                  background: PC.bg, color: PC.textMuted, fontWeight: 600,
                }}>{post.tag}</span>
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
            }}>{post.content}</div>
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

        {/* Alt kısım: reaksiyonlar + yorumlar */}
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <ReactionBar
            reactions={post.reactions}
            postId={post.id}
            userId={userId}
            onReact={onReact}
          />
          <CommentSection postId={post.id} currentUser={currentUser} />
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
  const [posting, setPosting] = useState(false);
  const textareaRef = useRef(null);

  const handleSubmit = async function () {
    if (!content.trim()) return;
    setPosting(true);
    try {
      var post = {
        category: category,
        title: title.trim(),
        content: content.trim(),
        tag: tag || "",
        authorName: currentUser.name || "Anonim",
        authorId: getUserId(currentUser),
      };
      if (category === "kaynak" && resourceUrl.trim()) {
        post.resourceUrl = resourceUrl.trim();
      }
      if (category === "anket") {
        post.pollOptions = pollOptions.filter(function (o) { return o.trim(); });
        post.pollVotes = {};
      }
      await onPost(post);
      setTitle("");
      setContent("");
      setResourceUrl("");
      setPollOptions(["", ""]);
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
    <div style={{
      background: "white", borderRadius: 16, padding: 24,
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      border: "1px solid " + PC.borderLight,
      marginBottom: 24,
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
              {cat.emoji} {cat.label}
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

      {/* Tag seçimi */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        {SINIF_TAGS.map(function (t) {
          var isActive = tag === t;
          return (
            <button
              key={t}
              onClick={function () { setTag(isActive ? "" : t); }}
              style={{
                padding: "4px 12px", borderRadius: 6, fontSize: 11,
                fontWeight: isActive ? 700 : 500, cursor: "pointer",
                border: "1px solid " + (isActive ? PC.navy : PC.border),
                background: isActive ? PC.navy : "white",
                color: isActive ? "white" : PC.textMuted,
              }}
            >{t}</button>
          );
        })}
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
          disabled={posting || !content.trim()}
          style={{
            padding: "10px 24px", border: "none", borderRadius: 10,
            background: posting || !content.trim() ? PC.border : "linear-gradient(135deg, " + PC.navy + ", " + PC.navyLight + ")",
            color: "white", cursor: posting ? "wait" : "pointer",
            fontSize: 14, fontWeight: 700,
            boxShadow: "0 4px 12px rgba(27,42,74,0.3)",
          }}
        >{posting ? "Gönderiliyor..." : "Paylaş"}</button>
      </div>
    </div>
  );
};

// ── İstatistik Kartı ──
const StatCard = ({ label, value, color, icon }) => (
  <div style={{
    background: "white", borderRadius: 12, padding: 16,
    border: "1px solid " + PC.borderLight,
    display: "flex", alignItems: "center", gap: 14,
    flex: 1, minWidth: 140,
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: 10,
      background: color + "15",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 22,
    }}>{icon}</div>
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: PC.navy }}>{value}</div>
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
      <h3 style={{ fontSize: 15, fontWeight: 700, color: PC.navy, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <span>{"\uD83D\uDD25"}</span> Trend Konular
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
  const [sortMode, setSortMode] = useState("newest"); // newest, popular, comments

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

  // Yeni gönderi
  const handleNewPost = async function (postData) {
    var saved = await PortalDB.createPost(postData);
    setPosts(function (prev) { return [saved, ...prev]; });
    setShowNewPost(false);
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
    } catch (err) {
      console.error("Silme hatası:", err);
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
    } catch (err) {
      console.error("Düzenleme hatası:", err);
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
    } catch (err) {
      console.error("Pin hatası:", err);
    }
  };

  // Arama + sıralama filtresi
  var filteredPosts = useMemo(function () {
    var result = posts;
    if (searchQuery.trim()) {
      var q = searchQuery.toLowerCase();
      result = result.filter(function (p) {
        return (p.title && p.title.toLowerCase().includes(q)) ||
               (p.content && p.content.toLowerCase().includes(q)) ||
               (p.authorName && p.authorName.toLowerCase().includes(q));
      });
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
  }, [posts, searchQuery, sortMode]);

  // Sabitlenmiş gönderileri ayır
  var pinnedPosts = filteredPosts.filter(function (p) { return p.pinned; });
  var regularPosts = filteredPosts.filter(function (p) { return !p.pinned; });

  // İstatistikler
  var totalReactions = 0;
  posts.forEach(function (p) { totalReactions += getReactionTotal(p.reactions); });
  var totalComments = 0;
  posts.forEach(function (p) { totalComments += (p.commentCount || 0); });

  return (
    <div>
      {/* Başlık */}
      <div style={{
        marginBottom: 24, display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <h1 style={{
            fontSize: 28, fontWeight: 700, color: PC.navy,
            fontFamily: "'Playfair Display', serif", marginBottom: 4,
          }}>Öğrenci Portalı</h1>
          <p style={{ color: PC.textMuted, fontSize: 14 }}>
            Yardımlaşma, bilgi paylaşımı ve sosyal etkileşim platformu
          </p>
        </div>
        <button
          onClick={function () { setShowNewPost(!showNewPost); }}
          style={{
            padding: "12px 24px", border: "none", borderRadius: 12,
            background: showNewPost ? PC.textMuted : "linear-gradient(135deg, " + PC.navy + ", " + PC.navyLight + ")",
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

      {/* İstatistikler */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Toplam Gönderi" value={posts.length} color="#3B82F6" icon={"\uD83D\uDCDD"} />
        <StatCard label="Tepkiler" value={totalReactions} color="#EF4444" icon={"\u2764\uFE0F"} />
        <StatCard label="Yorumlar" value={totalComments} color="#10B981" icon={"\uD83D\uDCAC"} />
        <StatCard label="Üyeler" value={new Set(posts.map(function (p) { return p.authorId; })).size || 0} color="#8B5CF6" icon={"\uD83D\uDC65"} />
      </div>

      {/* Arama + Kategori Filtreleri */}
      <div style={{
        display: "flex", gap: 16, marginBottom: 24,
        alignItems: "center", flexWrap: "wrap",
      }}>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {/* Sıralama */}
        <div style={{ display: "flex", gap: 4, background: PC.bg, borderRadius: 10, padding: 3 }}>
          {[
            { id: "newest", label: "En Yeni" },
            { id: "popular", label: "En Popüler" },
            { id: "comments", label: "En Çok Yorum" },
          ].map(function (s) {
            var isActive = sortMode === s.id;
            return (
              <button
                key={s.id}
                onClick={function () { setSortMode(s.id); }}
                style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 12,
                  fontWeight: isActive ? 700 : 500, cursor: "pointer",
                  border: "none",
                  background: isActive ? "white" : "transparent",
                  color: isActive ? PC.navy : PC.textMuted,
                  boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.2s",
                }}
              >{s.label}</button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button
            onClick={function () { setActiveCategory("tumu"); }}
            style={{
              padding: "8px 16px", borderRadius: 20, fontSize: 13,
              fontWeight: activeCategory === "tumu" ? 700 : 500, cursor: "pointer",
              border: activeCategory === "tumu" ? "2px solid " + PC.navy : "1px solid " + PC.border,
              background: activeCategory === "tumu" ? PC.navy : "white",
              color: activeCategory === "tumu" ? "white" : PC.textMuted,
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
                }}
              >{cat.emoji} {cat.label}</button>
            );
          })}
        </div>
      </div>

      {/* Ana İçerik: Feed + Sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>
        {/* Sol: Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
            <div style={{
              padding: 60, textAlign: "center", background: "white",
              borderRadius: 16, border: "1px solid " + PC.borderLight,
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>{"\uD83D\uDCED"}</div>
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
              />
            );
          })}

          {/* Normal gönderiler */}
          {regularPosts.map(function (post) {
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
              />
            );
          })}
        </div>

        {/* Sağ: Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 88 }}>
          {/* Trend Konular */}
          <TrendingSidebar posts={posts} />

          {/* Hızlı Bilgi */}
          <div style={{
            background: "linear-gradient(135deg, " + PC.navy + ", " + PC.navyLight + ")",
            borderRadius: 16, padding: 20, color: "white",
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
              <span>{"\uD83D\uDCA1"}</span> Portal Rehberi
            </h3>
            <div style={{ fontSize: 12, lineHeight: 1.8, opacity: 0.9 }}>
              <div><strong>? Soru-Cevap:</strong> Derslerle ilgili sorularınızı sorun</div>
              <div><strong>N Not Paylaşımı:</strong> Ders notlarını arkadaşlarınızla paylaşın</div>
              <div><strong>! Duyuru:</strong> Önemli duyuruları paylaşın</div>
              <div><strong>E Etkinlik:</strong> Kampüs etkinliklerini duyurun</div>
              <div><strong>K Kaynak:</strong> Faydalı link ve kaynakları paylaşın</div>
              <div><strong>S Sohbet:</strong> Serbest sohbet edin</div>
              <div><strong>A Anket:</strong> Anket oluşturup oy toplayın</div>
            </div>
          </div>

          {/* Kategorilere göre dağılım */}
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
                    <span style={{ fontWeight: 600, color: cat.color }}>{cat.emoji} {cat.label}</span>
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
      </div>
    </div>
  );
}

// ── Window'a export ──
window.OgrenciPortaliApp = OgrenciPortaliApp;
