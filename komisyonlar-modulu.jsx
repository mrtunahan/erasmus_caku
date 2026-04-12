// ══════════════════════════════════════════════════════════════
// ÇAKÜ Mühendislik Fakültesi - Komisyonlar Modülü
// Fakülte yöneticisi komisyon oluşturma, akademisyen atama
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback, useRef } = React;

const KOM = {
  primary: "#7C3AED",
  primaryLight: "#A78BFA",
  primaryPale: "#F5F3FF",
  bg: "#FAFAFA",
  card: "#FFFFFF",
  text: "#1F2937",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  green: "#059669",
  greenLight: "#D1FAE5",
  red: "#DC2626",
  redLight: "#FEE2E2",
  navy: "#1B2A4A",
  orange: "#EA580C",
  orangeLight: "#FFEDD5",
  blue: "#3B82F6",
  blueLight: "#DBEAFE",
};

// Komisyon kartları için renk paleti (indeks bazlı döngü)
const ACCENT_COLORS = [
  "#7C3AED", "#3B82F6", "#059669", "#EA580C", "#DC2626",
  "#0891B2", "#DB2777", "#65A30D", "#9333EA", "#F59E0B",
];
const accentFor = (idx) => ACCENT_COLORS[idx % ACCENT_COLORS.length];

// İkon path'leri
const ICONS = {
  plus: "M12 5v14M5 12h14",
  search: "M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z",
  edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  x: "M6 18L18 6M6 6l12 12",
  check: "M5 13l4 4L19 7",
  users: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  briefcase: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  graduationCap: "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z",
  sort: "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12",
  lock: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  spinner: "M12 4V2M12 22v-2M6.34 6.34l-1.42-1.42M19.07 19.07l-1.41-1.41M4 12H2M22 12h-2M6.34 17.66l-1.42 1.42M19.07 4.93l-1.41 1.41",
};

const KomIcon = ({ path, size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

function KomisyonlarModuluApp({ currentUser, activeDepartment, departmentInfo }) {
  const responsive = window.useResponsive();
  const isMobile = responsive.val(true, true, false);

  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message }
  const [professors, setProfessors] = useState([]);

  // Arama + sıralama
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name | date | members

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formMembers, setFormMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  // Inline silme onayı
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Dropdown dış tıklama
  const dropdownRef = useRef(null);

  const isAdmin = currentUser?.role === "admin";
  const isDeptManager = currentUser?.role === "bolum_yetkilisi";
  const hasFullAccess = isAdmin || isDeptManager;

  // Dropdown dışına tıklanınca kapat
  useEffect(() => {
    if (!showMemberDropdown) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowMemberDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMemberDropdown]);

  // Akademisyenleri yükle (bölüme göre filtreleme client-side)
  useEffect(() => {
    const loadProfessors = async () => {
      try {
        const allProfs = await window.apiRead("professors");
        const filtered = activeDepartment
          ? allProfs.filter(p => (p.departmentId || "bilgisayar") === activeDepartment)
          : allProfs;
        setProfessors(filtered);
      } catch (e) {
        console.error("Akademisyenler yüklenirken hata:", e);
      }
    };
    loadProfessors();
  }, [activeDepartment]);

  // Komisyonları yükle (bölüme göre filtreleme client-side)
  useEffect(() => {
    const loadCommissions = async () => {
      setLoading(true);
      try {
        const allComms = await window.apiRead("commissions");
        const filtered = activeDepartment
          ? allComms.filter(c => (c.departmentId || "bilgisayar") === activeDepartment)
          : allComms;
        setCommissions(filtered);
      } catch (e) {
        console.error("Komisyonlar yüklenirken hata:", e);
      } finally {
        setLoading(false);
      }
    };
    loadCommissions();
  }, [activeDepartment]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showToast("Komisyon adı zorunludur.", "error");
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: formName.trim(),
        description: formDesc.trim(),
        members: formMembers,
        departmentId: activeDepartment || "",
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await window.DBWrite.set("commissions", editingId, data, true);
        showToast("Komisyon güncellendi!", "success");
      } else {
        data.createdAt = new Date().toISOString();
        const result = await window.DBWrite.add("commissions", data);
        data.id = result?.id || String(Date.now());
        showToast("Komisyon oluşturuldu!", "success");
      }

      // Reload (client-side bölüm filtresi)
      const allComms = await window.apiRead("commissions");
      const filtered = activeDepartment
        ? allComms.filter(c => (c.departmentId || "bilgisayar") === activeDepartment)
        : allComms;
      setCommissions(filtered);
      resetForm();
    } catch (e) {
      console.error("Komisyon kayıt hatası:", e);
      showToast("Kayıt sırasında hata oluştu: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (commId) => {
    try {
      await window.DBWrite.remove("commissions", commId);
      setCommissions(prev => prev.filter(c => c.id !== commId));
      if (selectedCommission?.id === commId) setSelectedCommission(null);
      setDeleteConfirmId(null);
      showToast("Komisyon silindi.", "success");
    } catch (e) {
      console.error("Silme hatası:", e);
      showToast("Silme sırasında hata oluştu.", "error");
    }
  };

  const handleEdit = (comm) => {
    setFormName(comm.name || "");
    setFormDesc(comm.description || "");
    setFormMembers(comm.members || []);
    setEditingId(comm.id);
    setShowForm(true);
    setSelectedCommission(null);
  };

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormMembers([]);
    setEditingId(null);
    setShowForm(false);
    setMemberSearch("");
  };

  const addMember = (prof) => {
    if (formMembers.some(m => m.name === prof.name)) return;
    setFormMembers(prev => [...prev, {
      name: prof.name,
      department: prof.department || "",
      role: "Üye",
      addedAt: new Date().toISOString(),
    }]);
    setMemberSearch("");
    setShowMemberDropdown(false);
  };

  const removeMember = (name) => {
    setFormMembers(prev => prev.filter(m => m.name !== name));
  };

  const updateMemberRole = (name, role) => {
    setFormMembers(prev => prev.map(m => m.name === name ? { ...m, role } : m));
  };

  const filteredProfessors = useMemo(() => {
    if (!memberSearch.trim()) return [];
    const s = memberSearch.toLowerCase();
    return professors
      .filter(p => (p.name || "").toLowerCase().includes(s))
      .filter(p => !formMembers.some(m => m.name === p.name))
      .slice(0, 8);
  }, [memberSearch, professors, formMembers]);

  // Komisyonları filtrele + sırala
  const visibleCommissions = useMemo(() => {
    let result = commissions.slice();
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === "members") {
        return (b.members?.length || 0) - (a.members?.length || 0);
      }
      return (a.name || "").localeCompare(b.name || "", "tr");
    });
    return result;
  }, [commissions, searchQuery, sortBy]);

  // Styles
  const cardStyle = {
    background: "white", borderRadius: 12,
    border: "1px solid #E5E7EB", overflow: "hidden",
  };
  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #D1D5DB", fontSize: 13, outline: "none",
    fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
  };

  if (!hasFullAccess) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", padding: 40, textAlign: "center" }}>
        <KomIcon path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" size={48} color="#D1D5DB" />
        <p style={{ color: KOM.textMuted, fontSize: 14, marginTop: 16 }}>
          Bu modüle yalnızca fakülte yöneticisi veya bölüm yetkilisi erişebilir.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, border: "3px solid #E5E7EB", borderTopColor: KOM.primary, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#666", fontSize: 14 }}>Komisyonlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", position: "relative" }}>
      {/* Toast (sabit konum) */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 10000,
          padding: "12px 18px", borderRadius: 10, minWidth: 260, maxWidth: 420,
          background: toast.type === "error" ? KOM.red : KOM.green,
          color: "white", fontSize: 13, fontWeight: 500,
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", gap: 10,
          animation: "komToastIn 0.25s ease-out",
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: "50%",
            background: "rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <KomIcon path={toast.type === "error" ? ICONS.x : ICONS.check} size={14} color="white" />
          </div>
          <span>{toast.message}</span>
        </div>
      )}

      <style>{`
        @keyframes komToastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes komSpin { to { transform: rotate(360deg); } }
        .kom-card { transition: all 0.2s ease; }
        .kom-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .kom-icon-btn:hover { background: #F3F4F6; }
        .kom-spin { animation: komSpin 0.8s linear infinite; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: responsive.val(20, 24, 28), fontWeight: 700, color: KOM.navy, margin: 0 }}>
            Komisyonlar
          </h1>
          <p style={{ fontSize: 13, color: KOM.textMuted, marginTop: 4 }}>
            Komisyon oluşturma ve akademisyen atama yönetimi
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={{
          padding: "10px 20px", borderRadius: 8, border: "none",
          background: KOM.primary, color: "white", fontSize: 13, fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
        }}>
          <KomIcon path={ICONS.plus} size={16} />
          Yeni Komisyon
        </button>
      </div>

      {/* Stats (ikonlu) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: responsive.val("1fr 1fr", "repeat(3, 1fr)", "repeat(3, 1fr)"),
        gap: 12, marginBottom: 24,
      }}>
        {[
          { label: "Toplam Komisyon", value: commissions.length, color: KOM.primary, bg: KOM.primaryPale, icon: ICONS.briefcase },
          { label: "Toplam Üye", value: commissions.reduce((acc, c) => acc + (c.members?.length || 0), 0), color: KOM.blue, bg: KOM.blueLight, icon: ICONS.users },
          { label: "Akademisyen", value: professors.length, color: KOM.green, bg: KOM.greenLight, icon: ICONS.graduationCap },
        ].map((s, i) => (
          <div key={i} style={{
            background: "white", borderRadius: 12, padding: responsive.val(14, 18, 20),
            border: "1px solid #E5E7EB",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: s.bg, color: s.color,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <KomIcon path={s.icon} size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: responsive.val(20, 24, 26), fontWeight: 700, color: KOM.navy, lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: KOM.textMuted, marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Arama + Sıralama */}
      {!showForm && commissions.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16,
          background: "white", padding: 10, borderRadius: 10, border: "1px solid #E5E7EB",
        }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: KOM.textMuted, pointerEvents: "none" }}>
              <KomIcon path={ICONS.search} size={16} />
            </div>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Komisyon ara..."
              style={{
                ...inputStyle, paddingLeft: 36, border: "1px solid #E5E7EB",
              }}
            />
          </div>
          <div style={{ position: "relative" }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: "10px 36px 10px 14px", borderRadius: 8,
                border: "1px solid #E5E7EB", fontSize: 13, background: "white",
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                appearance: "none", outline: "none", color: KOM.text,
              }}
            >
              <option value="name">İsme göre (A-Z)</option>
              <option value="date">Tarihe göre (Yeni)</option>
              <option value="members">Üye sayısına göre</option>
            </select>
            <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: KOM.textMuted }}>
              <KomIcon path={ICONS.sort} size={14} />
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{ ...cardStyle, padding: responsive.val(16, 20, 24), marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: KOM.navy, marginBottom: 16 }}>
            {editingId ? "Komisyonu Düzenle" : "Yeni Komisyon Oluştur"}
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: KOM.textMuted, marginBottom: 5 }}>Komisyon Adı *</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Örn: Staj Komisyonu" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: KOM.textMuted, marginBottom: 5 }}>Açıklama</label>
              <input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Komisyon hakkında kısa açıklama" style={inputStyle} />
            </div>
          </div>

          {/* Üye Ekleme */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: KOM.textMuted, marginBottom: 5 }}>Üye Ekle (Akademisyen Ara)</label>
            <div style={{ position: "relative" }} ref={dropdownRef}>
              <input
                value={memberSearch}
                onChange={e => { setMemberSearch(e.target.value); setShowMemberDropdown(true); }}
                onFocus={() => setShowMemberDropdown(true)}
                placeholder="Akademisyen adı yazarak arayın..."
                style={inputStyle}
              />
              {showMemberDropdown && filteredProfessors.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                  background: "white", border: "1px solid #D1D5DB", borderRadius: 8,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 220, overflowY: "auto",
                }}>
                  {filteredProfessors.map(prof => (
                    <div
                      key={prof.id || prof.name}
                      onClick={() => addMember(prof)}
                      style={{
                        padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #F3F4F6",
                        fontSize: 13, color: KOM.text,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#F5F3FF"}
                      onMouseLeave={e => e.currentTarget.style.background = "white"}
                    >
                      <div style={{ fontWeight: 500 }}>{prof.name}</div>
                      {prof.department && <div style={{ fontSize: 11, color: KOM.textMuted }}>{prof.department}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mevcut Üyeler */}
          {formMembers.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: KOM.textMuted, marginBottom: 8 }}>
                Komisyon Üyeleri ({formMembers.length})
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {formMembers.map(member => (
                  <div key={member.name} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                    background: "#F9FAFB", borderRadius: 8, border: "1px solid #F3F4F6",
                    flexWrap: "wrap",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: KOM.primaryPale, color: KOM.primary,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, flexShrink: 0,
                    }}>
                      {(member.name || "?")[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: KOM.text }}>{member.name}</div>
                      {member.department && <div style={{ fontSize: 11, color: KOM.textMuted }}>{member.department}</div>}
                    </div>
                    <select
                      value={member.role}
                      onChange={e => updateMemberRole(member.name, e.target.value)}
                      style={{
                        padding: "4px 8px", borderRadius: 6, border: "1px solid #D1D5DB",
                        fontSize: 12, background: "white", cursor: "pointer",
                      }}
                    >
                      <option value="Başkan">Başkan</option>
                      <option value="Başkan Yrd.">Başkan Yrd.</option>
                      <option value="Üye">Üye</option>
                      <option value="Raportör">Raportör</option>
                    </select>
                    <button onClick={() => removeMember(member.name)} style={{
                      background: "none", border: "none", cursor: "pointer", padding: 4,
                      color: KOM.red, display: "flex",
                    }}>
                      <KomIcon path="M6 18L18 6M6 6l12 12" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button onClick={resetForm} disabled={saving} style={{
              padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D5DB",
              background: "white", color: KOM.textMuted, fontSize: 13,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
            }}>İptal</button>
            <button onClick={handleSave} disabled={saving} style={{
              padding: "10px 20px", borderRadius: 8, border: "none",
              background: saving ? KOM.primaryLight : KOM.primary,
              color: "white", fontSize: 13, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 8, minWidth: 110, justifyContent: "center",
            }}>
              {saving && (
                <span className="kom-spin" style={{ display: "flex" }}>
                  <KomIcon path={ICONS.spinner} size={14} color="white" />
                </span>
              )}
              {saving ? "Kaydediliyor..." : (editingId ? "Güncelle" : "Oluştur")}
            </button>
          </div>
        </div>
      )}

      {/* Commission List */}
      {commissions.length === 0 && !showForm ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: "center" }}>
          <KomIcon path={ICONS.users} size={48} color="#D1D5DB" />
          <p style={{ color: KOM.textMuted, fontSize: 14, marginTop: 16 }}>
            Henüz komisyon oluşturulmamış. Yeni komisyon oluşturmak için yukarıdaki butona tıklayın.
          </p>
        </div>
      ) : visibleCommissions.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: "center" }}>
          <KomIcon path={ICONS.search} size={48} color="#D1D5DB" />
          <p style={{ color: KOM.textMuted, fontSize: 14, marginTop: 16 }}>
            "{searchQuery}" için sonuç bulunamadı.
          </p>
          <button onClick={() => setSearchQuery("")} style={{
            marginTop: 12, padding: "8px 16px", borderRadius: 8, border: "1px solid #E5E7EB",
            background: "white", color: KOM.primary, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Aramayı temizle</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: responsive.val("1fr", "1fr", "1fr 1fr"), gap: 16 }}>
          {visibleCommissions.map((comm, idx) => {
            const isSelected = selectedCommission?.id === comm.id;
            const memberCount = comm.members?.length || 0;
            const accent = accentFor(idx);
            const isConfirming = deleteConfirmId === comm.id;
            const visibleAvatars = (comm.members || []).slice(0, 5);
            const extraCount = Math.max(0, memberCount - visibleAvatars.length);

            return (
              <div key={comm.id} className="kom-card" style={{
                ...cardStyle,
                border: isSelected ? `2px solid ${accent}` : "1px solid #E5E7EB",
                position: "relative",
              }}>
                {/* Sol renk aksan çubuğu */}
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
                  background: accent,
                }} />

                {/* Commission Header */}
                <div style={{
                  padding: "16px 18px 14px 22px", borderBottom: "1px solid #F3F4F6",
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8,
                }}>
                  <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => setSelectedCommission(isSelected ? null : comm)}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: KOM.navy, wordBreak: "break-word" }}>{comm.name}</div>
                    {comm.description && <div style={{ fontSize: 12, color: KOM.textMuted, marginTop: 4 }}>{comm.description}</div>}
                    <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                        background: `${accent}15`, color: accent,
                      }}>
                        {memberCount} üye
                      </span>
                      {comm.createdAt && (
                        <span style={{ fontSize: 11, color: KOM.textMuted }}>
                          {new Date(comm.createdAt).toLocaleDateString("tr-TR")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="kom-icon-btn" onClick={() => handleEdit(comm)} title="Düzenle" style={{
                      background: "none", border: "none", cursor: "pointer", padding: 6,
                      color: "#6B7280", borderRadius: 6, display: "flex",
                    }}>
                      <KomIcon path={ICONS.edit} size={16} />
                    </button>
                    <button className="kom-icon-btn" onClick={() => setDeleteConfirmId(comm.id)} title="Sil" style={{
                      background: "none", border: "none", cursor: "pointer", padding: 6,
                      color: KOM.red, borderRadius: 6, display: "flex",
                    }}>
                      <KomIcon path={ICONS.trash} size={16} />
                    </button>
                  </div>
                </div>

                {/* Avatar stack (kompakt görünüm) */}
                {!isSelected && memberCount > 0 && (
                  <div style={{
                    padding: "14px 18px 14px 22px",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {visibleAvatars.map((member, mi) => (
                        <div
                          key={member.name || mi}
                          title={`${member.name}${member.role ? " – " + member.role : ""}`}
                          style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: `${accentFor(mi + idx)}15`,
                            color: accentFor(mi + idx),
                            border: "2px solid white",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, flexShrink: 0,
                            marginLeft: mi === 0 ? 0 : -10,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                            position: "relative", zIndex: visibleAvatars.length - mi,
                          }}
                        >
                          {(member.name || "?")[0]}
                        </div>
                      ))}
                      {extraCount > 0 && (
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: "#F3F4F6", color: KOM.textMuted,
                          border: "2px solid white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, flexShrink: 0, marginLeft: -10,
                        }}>
                          +{extraCount}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedCommission(comm)}
                      style={{
                        marginLeft: "auto", background: "none", border: "none",
                        color: accent, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      Detayları gör →
                    </button>
                  </div>
                )}
                {!isSelected && memberCount === 0 && (
                  <div style={{ padding: "14px 18px 14px 22px" }}>
                    <p style={{ fontSize: 12, color: KOM.textMuted, margin: 0, fontStyle: "italic" }}>Henüz üye eklenmemiş</p>
                  </div>
                )}

                {/* Genişletilmiş üye listesi */}
                {isSelected && memberCount > 0 && (
                  <div style={{ padding: "12px 18px 16px 22px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {(comm.members || []).map(member => (
                        <div key={member.name} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "6px 0",
                        }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: `${accent}15`, color: accent,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 700, flexShrink: 0,
                          }}>{(member.name || "?")[0]}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: KOM.text, overflow: "hidden", textOverflow: "ellipsis" }}>{member.name}</div>
                            {member.department && <div style={{ fontSize: 10, color: KOM.textMuted }}>{member.department}</div>}
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                            background: member.role === "Başkan" ? "#FEF3C7" : member.role === "Başkan Yrd." ? "#DBEAFE" : "#F3F4F6",
                            color: member.role === "Başkan" ? "#92400E" : member.role === "Başkan Yrd." ? "#1E40AF" : "#6B7280",
                          }}>{member.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inline silme onayı overlay */}
                {isConfirming && (
                  <div style={{
                    position: "absolute", inset: 0, background: "rgba(255,255,255,0.96)",
                    backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 20, zIndex: 5, borderRadius: 12,
                    animation: "komToastIn 0.2s ease-out",
                  }}>
                    <div style={{ textAlign: "center", maxWidth: 320 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: "50%",
                        background: KOM.redLight, color: KOM.red,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 12px",
                      }}>
                        <KomIcon path={ICONS.trash} size={22} />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: KOM.navy, marginBottom: 4 }}>
                        Komisyonu silmek istediğinize emin misiniz?
                      </div>
                      <div style={{ fontSize: 12, color: KOM.textMuted, marginBottom: 16 }}>
                        "{comm.name}" kalıcı olarak silinecek.
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          style={{
                            padding: "8px 16px", borderRadius: 8, border: "1px solid #E5E7EB",
                            background: "white", color: KOM.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer",
                          }}
                        >İptal</button>
                        <button
                          onClick={() => confirmDelete(comm.id)}
                          style={{
                            padding: "8px 16px", borderRadius: 8, border: "none",
                            background: KOM.red, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 6,
                          }}
                        >
                          <KomIcon path={ICONS.trash} size={14} color="white" />
                          Sil
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

window.KomisyonlarModuluApp = KomisyonlarModuluApp;
