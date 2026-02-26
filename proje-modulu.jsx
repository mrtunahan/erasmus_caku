// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Proje Modülü
// Öğrenci proje grupları oluşturma, listeleme ve yönetim
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo } = React;

// ── Renkler ──
const PRJ = {
  primary: "#2563eb",
  primaryLight: "#60a5fa",
  primaryPale: "#dbeafe",
  gold: "#d4af37",
  green: "#059669",
  greenLight: "#d1fae5",
  red: "#dc2626",
  redLight: "#fee2e2",
  orange: "#ea580c",
  orangeLight: "#ffedd5",
  bg: "#f0f4ff",
  card: "#ffffff",
  text: "#1f2937",
  textMuted: "#6b7280",
  border: "#e5e7eb",
};

// ── SVG Icon Helper ──
const PrjIcon = ({ path, size, color }) => (
  <svg width={size || 18} height={size || 18} viewBox="0 0 24 24" fill="none"
    stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const PRJ_ICONS = {
  folder: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
  plus: "M12 5v14M5 12h14",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  x: "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  clock: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
  userPlus: "M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6",
  info: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 16v-4M12 8h.01",
};

// ══════════════════════════════════════════════════════════════
// ANA MODÜL
// ══════════════════════════════════════════════════════════════
function ProjeModuluApp({ currentUser }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const userId = currentUser?.studentNumber || currentUser?.name || "anonymous";
  const userName = currentUser?.name || "Anonim";
  const isAdmin = currentUser?.role === "admin";

  // ── Projeleri Yükle ──
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const db = window.firebase?.firestore();
      if (!db) { setLoading(false); return; }
      const snapshot = await db.collection("projects").orderBy("createdAt", "desc").get();
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setProjects(data);
    } catch (e) {
      console.error("Projeler yuklenemedi:", e);
    }
    setLoading(false);
  };

  // ── Proje Oluştur ──
  const handleCreateProject = async (projectData) => {
    try {
      const db = window.firebase?.firestore();
      if (!db) return;

      const docData = {
        name: projectData.name,
        summary: projectData.summary,
        members: projectData.members,
        createdBy: userId,
        createdByName: userName,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("projects").add(docData);
      setProjects(prev => [{ ...docData, id: docRef.id }, ...prev]);
      setShowCreateModal(false);
    } catch (e) {
      console.error("Proje olusturulamadi:", e);
      alert("Proje oluşturulurken hata oluştu!");
    }
  };

  // ── Proje Sil ──
  const handleDeleteProject = async (projectId) => {
    if (!confirm("Bu projeyi silmek istediğinize emin misiniz?")) return;
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      await db.collection("projects").doc(projectId).delete();
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (e) {
      console.error("Proje silinemedi:", e);
    }
  };

  // ── Arama / Filtre ──
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.summary?.toLowerCase().includes(q) ||
      p.members?.some(m => m.toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  };

  // Kullanıcının zaten bir projede olup olmadığını kontrol et
  const userInProject = projects.some(p =>
    p.members?.some(m => m.toLowerCase() === userName.toLowerCase())
  );

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ background: PRJ.bg, minHeight: "100vh", padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #60a5fa 100%)",
        padding: "32px 0 24px", marginBottom: 24,
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ color: "white", fontSize: 28, fontWeight: 700, fontFamily: "'Playfair Display', serif", display: "flex", alignItems: "center", gap: 10 }}>
                <PrjIcon path={PRJ_ICONS.folder} size={28} color="rgba(255,255,255,0.8)" /> Proje Grupları
              </h1>
              <p style={{ color: "rgba(255,255,255,0.7)", marginTop: 4, fontSize: 14 }}>
                Proje grubu oluşturun, ekip arkadaşlarınızı ekleyin
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(8px)",
              }}
            >
              <PrjIcon path={PRJ_ICONS.plus} size={18} color="white" /> Yeni Proje Grubu
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
        {/* Arama & İstatistik */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 8,
            background: "white", borderRadius: 10, padding: "8px 14px",
            border: `1px solid ${PRJ.border}`,
          }}>
            <PrjIcon path={PRJ_ICONS.search} size={16} color={PRJ.textMuted} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Proje veya kişi ara..."
              style={{
                flex: 1, border: "none", outline: "none", fontSize: 14,
                fontFamily: "'Source Sans 3', sans-serif", background: "transparent",
              }}
            />
          </div>
          <div style={{
            background: "white", borderRadius: 10, padding: "10px 16px",
            border: `1px solid ${PRJ.border}`, fontSize: 13, color: PRJ.textMuted, fontWeight: 500,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <PrjIcon path={PRJ_ICONS.folder} size={14} color={PRJ.primary} />
            {projects.length} proje
          </div>
          <div style={{
            background: "white", borderRadius: 10, padding: "10px 16px",
            border: `1px solid ${PRJ.border}`, fontSize: 13, color: PRJ.textMuted, fontWeight: 500,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <PrjIcon path={PRJ_ICONS.users} size={14} color={PRJ.green} />
            {projects.reduce((sum, p) => sum + (p.members?.length || 0), 0)} katılımcı
          </div>
        </div>

        {/* Proje Listesi */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: PRJ.textMuted }}>Yükleniyor...</div>
        ) : filteredProjects.length === 0 ? (
          <div style={{
            background: "white", borderRadius: 16, padding: 60, textAlign: "center",
            border: `1px solid ${PRJ.border}`,
          }}>
            <PrjIcon path={PRJ_ICONS.folder} size={48} color="#d1d5db" />
            <h3 style={{ color: PRJ.textMuted, marginTop: 16 }}>
              {searchQuery ? "Arama sonucu bulunamadı" : "Henüz proje grubu oluşturulmamış"}
            </h3>
            {!searchQuery && (
              <p style={{ color: PRJ.textMuted, fontSize: 14, marginTop: 8 }}>
                İlk proje grubunu oluşturmak için "Yeni Proje Grubu" butonuna tıklayın.
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
            {filteredProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                userId={userId}
                userName={userName}
                isAdmin={isAdmin}
                onDelete={handleDeleteProject}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Proje Oluşturma Modalı */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
          currentUserName={userName}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PROJE KARTI
// ══════════════════════════════════════════════════════════════
function ProjectCard({ project, userId, userName, isAdmin, onDelete, formatDate }) {
  const isOwner = project.createdBy === userId;
  const memberCount = project.members?.length || 0;

  // Üye renkleri
  const memberColors = ["#2563eb", "#059669", "#ea580c", "#7c3aed"];

  return (
    <div style={{
      background: "white", borderRadius: 16, overflow: "hidden",
      border: `1px solid ${PRJ.border}`,
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      transition: "all 0.2s",
      display: "flex", flexDirection: "column",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(37,99,235,0.12)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Üst Renkli Bant */}
      <div style={{
        height: 4,
        background: `linear-gradient(90deg, ${PRJ.primary}, ${PRJ.primaryLight})`,
      }} />

      {/* İçerik */}
      <div style={{ padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Proje Adı & Silme */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: PRJ.text, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <PrjIcon path={PRJ_ICONS.folder} size={18} color={PRJ.primary} />
              {project.name}
            </h3>
            <div style={{ fontSize: 12, color: PRJ.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
              <PrjIcon path={PRJ_ICONS.clock} size={12} />
              {formatDate(project.createdAt)}
              <span style={{ margin: "0 4px" }}>·</span>
              Oluşturan: {project.createdByName}
            </div>
          </div>
          {(isAdmin || isOwner) && (
            <button
              onClick={() => onDelete(project.id)}
              title="Projeyi sil"
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: PRJ.textMuted, padding: 4, borderRadius: 6,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = PRJ.red; e.currentTarget.style.background = PRJ.redLight; }}
              onMouseLeave={e => { e.currentTarget.style.color = PRJ.textMuted; e.currentTarget.style.background = "transparent"; }}
            >
              <PrjIcon path={PRJ_ICONS.trash} size={16} />
            </button>
          )}
        </div>

        {/* Özet */}
        {project.summary && (
          <div style={{
            background: "#f8fafc", borderRadius: 10, padding: "12px 16px",
            marginBottom: 16, border: `1px solid ${PRJ.border}`,
          }}>
            <p style={{ fontSize: 14, color: PRJ.text, lineHeight: 1.6, margin: 0 }}>
              {project.summary}
            </p>
          </div>
        )}

        {/* Üyeler */}
        <div style={{ marginTop: "auto" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: PRJ.textMuted, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <PrjIcon path={PRJ_ICONS.users} size={14} />
            Grup Üyeleri ({memberCount} kişi)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(project.members || []).map((member, idx) => (
              <div key={idx} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 8,
                background: `${memberColors[idx % memberColors.length]}08`,
                border: `1px solid ${memberColors[idx % memberColors.length]}20`,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${memberColors[idx % memberColors.length]}, ${memberColors[idx % memberColors.length]}cc)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}>
                  {member.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: PRJ.text }}>
                  {member}
                </span>
                {idx === 0 && (
                  <span style={{
                    marginLeft: "auto", fontSize: 10, fontWeight: 600,
                    background: PRJ.primaryPale, color: PRJ.primary,
                    padding: "2px 8px", borderRadius: 4,
                  }}>
                    Grup Lideri
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PROJE OLUŞTURMA MODALI
// ══════════════════════════════════════════════════════════════
function CreateProjectModal({ onClose, onCreate, currentUserName }) {
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [members, setMembers] = useState([currentUserName, ""]);

  const addMember = () => {
    if (members.length >= 3) return;
    setMembers(prev => [...prev, ""]);
  };

  const removeMember = (idx) => {
    if (members.length <= 2) return;
    // İlk üyeyi (kendini) silmeye izin verme
    if (idx === 0) return;
    setMembers(prev => prev.filter((_, i) => i !== idx));
  };

  const updateMember = (idx, value) => {
    setMembers(prev => prev.map((m, i) => i === idx ? value : m));
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      alert("Proje adı zorunludur!");
      return;
    }
    if (!summary.trim()) {
      alert("Proje özeti zorunludur!");
      return;
    }

    const validMembers = members.filter(m => m.trim());
    if (validMembers.length < 2) {
      alert("En az 2 kişi olmalıdır!");
      return;
    }
    if (validMembers.length > 3) {
      alert("En fazla 3 kişi olabilir!");
      return;
    }

    // Tekrar eden isim kontrolü
    const uniqueMembers = [...new Set(validMembers.map(m => m.trim().toLowerCase()))];
    if (uniqueMembers.length !== validMembers.length) {
      alert("Aynı isimde birden fazla üye ekleyemezsiniz!");
      return;
    }

    onCreate({
      name: name.trim(),
      summary: summary.trim(),
      members: validMembers.map(m => m.trim()),
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "white", borderRadius: 16, padding: 32, width: 520, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)", animation: "fadeInUp 0.2s ease-out",
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: PRJ.text, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <PrjIcon path={PRJ_ICONS.userPlus} size={22} color={PRJ.primary} /> Yeni Proje Grubu Oluştur
        </h3>

        {/* Bilgi Kutusu */}
        <div style={{
          background: PRJ.primaryPale, borderRadius: 10, padding: "12px 16px",
          marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 10,
          border: `1px solid ${PRJ.primary}30`,
        }}>
          <PrjIcon path={PRJ_ICONS.info} size={18} color={PRJ.primary} />
          <p style={{ fontSize: 13, color: PRJ.primary, margin: 0, lineHeight: 1.5 }}>
            Proje grupları 2 veya 3 kişiden oluşabilir. İlk üye olarak siz otomatik eklenirsiniz.
          </p>
        </div>

        {/* Proje Adı */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>
            Proje Adı *
          </label>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Proje adını yazın..."
            style={{
              width: "100%", padding: "10px 14px", border: `1px solid ${PRJ.border}`,
              borderRadius: 8, fontSize: 14, outline: "none",
              fontFamily: "'Source Sans 3', sans-serif",
            }}
          />
        </div>

        {/* Proje Özeti */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>
            Proje Özeti *
          </label>
          <textarea
            value={summary} onChange={e => setSummary(e.target.value)}
            placeholder="Projenizin kısa bir özetini yazın..."
            rows={3}
            style={{
              width: "100%", padding: "10px 14px", border: `1px solid ${PRJ.border}`,
              borderRadius: 8, fontSize: 14, resize: "vertical", outline: "none",
              fontFamily: "'Source Sans 3', sans-serif",
            }}
          />
        </div>

        {/* Grup Üyeleri */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: PRJ.text }}>
            <PrjIcon path={PRJ_ICONS.users} size={14} /> Grup Üyeleri * (2-3 kişi)
          </label>
          {members.map((member, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: idx === 0 ? PRJ.primary : PRJ.border,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: idx === 0 ? "white" : PRJ.textMuted, fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {idx + 1}
              </div>
              <input
                type="text"
                value={member}
                onChange={e => updateMember(idx, e.target.value)}
                placeholder={idx === 0 ? "Sizin adınız" : `${idx + 1}. üye adı`}
                disabled={idx === 0}
                style={{
                  flex: 1, padding: "8px 12px", border: `1px solid ${PRJ.border}`,
                  borderRadius: 8, fontSize: 14, outline: "none",
                  fontFamily: "'Source Sans 3', sans-serif",
                  background: idx === 0 ? "#f9fafb" : "white",
                  color: idx === 0 ? PRJ.textMuted : PRJ.text,
                }}
              />
              {idx === 0 && (
                <span style={{ fontSize: 10, color: PRJ.primary, fontWeight: 600, whiteSpace: "nowrap" }}>
                  (Siz)
                </span>
              )}
              {idx > 0 && members.length > 2 && (
                <button
                  onClick={() => removeMember(idx)}
                  style={{
                    background: PRJ.redLight, color: PRJ.red, border: "none",
                    borderRadius: 6, padding: "0 10px", cursor: "pointer", height: 34,
                    display: "flex", alignItems: "center",
                  }}
                >
                  <PrjIcon path={PRJ_ICONS.x} size={14} />
                </button>
              )}
            </div>
          ))}
          {members.length < 3 && (
            <button
              onClick={addMember}
              style={{
                background: PRJ.primaryPale, color: PRJ.primary, border: "none",
                borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <PrjIcon path={PRJ_ICONS.plus} size={14} /> Üye Ekle
            </button>
          )}
        </div>

        {/* Butonlar */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px", border: `1px solid ${PRJ.border}`, background: "white",
              borderRadius: 8, cursor: "pointer", fontSize: 14, color: PRJ.textMuted,
            }}
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: "10px 24px", border: "none",
              background: "linear-gradient(135deg, #1e40af, #2563eb)",
              color: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <PrjIcon path={PRJ_ICONS.check} size={16} color="white" /> Proje Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}

// Export
window.ProjeModuluApp = ProjeModuluApp;
