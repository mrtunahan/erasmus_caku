// ══════════════════════════════════════════════════════════════
// ÇAKÜ Mühendislik Fakültesi - Staj Modülü
// Bölüm bazlı staj takibi ve yönetimi
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const STAJ = {
  primary: "#0891B2",
  primaryLight: "#22D3EE",
  primaryPale: "#ECFEFF",
  bg: "#F0FDFA",
  card: "#FFFFFF",
  text: "#1F2937",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  green: "#059669",
  greenLight: "#D1FAE5",
  red: "#DC2626",
  redLight: "#FEE2E2",
  orange: "#EA580C",
  orangeLight: "#FFEDD5",
  navy: "#1B2A4A",
};

const StajIcon = ({ path, size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

// ── Staj Durumları ──
const STAJ_STATUS = {
  beklemede: { label: "Beklemede", color: "#EAB308", bg: "#FEF9C3" },
  devam: { label: "Devam Ediyor", color: "#3B82F6", bg: "#DBEAFE" },
  tamamlandi: { label: "Tamamlandı", color: "#059669", bg: "#D1FAE5" },
  reddedildi: { label: "Reddedildi", color: "#DC2626", bg: "#FEE2E2" },
};

// ── Staj Türleri ──
const STAJ_TYPES = [
  { id: "staj1", label: "Staj I (İşyeri Stajı)", duration: "20 iş günü" },
  { id: "staj2", label: "Staj II (Mühendislik Stajı)", duration: "20 iş günü" },
];

function StajModuluApp({ currentUser, activeDepartment, departmentInfo }) {
  const [stajRecords, setStajRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list, add
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const responsive = window.useResponsive();

  const isAdmin = currentUser?.role === "admin";
  const isDeptManager = currentUser?.role === "bolum_yetkilisi";
  const canManage = isAdmin || isDeptManager;

  // Staj kayıtlarını yükle
  useEffect(() => {
    const loadRecords = async () => {
      setLoading(true);
      try {
        const db = window.apiFirestore;
        if (db) {
          let query = db.collection("internships");
          if (activeDepartment) {
            query = query.where("departmentId", "==", activeDepartment);
          }
          const snapshot = await query.get();
          const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setStajRecords(records);
        }
      } catch (e) {
        console.error("Staj kayıtları yüklenirken hata:", e);
      } finally {
        setLoading(false);
      }
    };
    loadRecords();
  }, [activeDepartment]);

  const filteredRecords = useMemo(() => {
    return stajRecords.filter(r => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (r.studentName || "").toLowerCase().includes(s) ||
               (r.studentNumber || "").toLowerCase().includes(s) ||
               (r.companyName || "").toLowerCase().includes(s);
      }
      return true;
    });
  }, [stajRecords, filterStatus, searchTerm]);

  const stats = useMemo(() => ({
    total: stajRecords.length,
    beklemede: stajRecords.filter(r => r.status === "beklemede").length,
    devam: stajRecords.filter(r => r.status === "devam").length,
    tamamlandi: stajRecords.filter(r => r.status === "tamamlandi").length,
  }), [stajRecords]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, border: "3px solid #E5E1D8", borderTopColor: STAJ.primary, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#666", fontSize: 14 }}>Staj kayıtları yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center",
        justifyContent: "space-between", gap: 12, marginBottom: 24,
      }}>
        <div>
          <h1 style={{ fontSize: responsive.val(20, 24, 28), fontWeight: 700, color: STAJ.navy, margin: 0 }}>
            Staj Yönetimi
          </h1>
          <p style={{ fontSize: 13, color: STAJ.textMuted, marginTop: 4 }}>
            {departmentInfo?.name || "Bölüm"} - Staj takip ve değerlendirme
          </p>
        </div>
        {canManage && (
          <button onClick={() => setView(view === "add" ? "list" : "add")} style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: view === "add" ? "#6B7280" : STAJ.primary,
            color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <StajIcon path={view === "add" ? "M6 18L18 6M6 6l12 12" : "M12 5v14M5 12h14"} size={16} />
            {view === "add" ? "İptal" : "Yeni Staj Kaydı"}
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: responsive.val("1fr 1fr", "repeat(4, 1fr)", "repeat(4, 1fr)"),
        gap: responsive.val(8, 12, 16),
        marginBottom: 24,
      }}>
        {[
          { label: "Toplam", value: stats.total, color: STAJ.primary, bg: STAJ.primaryPale },
          { label: "Beklemede", value: stats.beklemede, color: "#EAB308", bg: "#FEF9C3" },
          { label: "Devam Eden", value: stats.devam, color: "#3B82F6", bg: "#DBEAFE" },
          { label: "Tamamlanan", value: stats.tamamlandi, color: "#059669", bg: "#D1FAE5" },
        ].map((s, i) => (
          <div key={i} style={{
            background: "white", borderRadius: 12, padding: responsive.val(12, 16, 20),
            border: "1px solid #E5E7EB", textAlign: "center",
          }}>
            <div style={{ fontSize: responsive.val(22, 28, 32), fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: STAJ.textMuted, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {view === "add" && canManage && (
        <div style={{
          background: "white", borderRadius: 12, padding: responsive.val(16, 20, 24),
          border: "1px solid #E5E7EB", marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: STAJ.navy, marginBottom: 16 }}>
            Yeni Staj Kaydı
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: responsive.val("1fr", "1fr 1fr", "1fr 1fr 1fr"),
            gap: 16,
          }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 6 }}>Öğrenci No</label>
              <input placeholder="Öğrenci numarası" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 6 }}>Öğrenci Adı</label>
              <input placeholder="Ad Soyad" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 6 }}>Staj Türü</label>
              <select style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none", background: "white" }}>
                {STAJ_TYPES.map(t => <option key={t.id} value={t.id}>{t.label} ({t.duration})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 6 }}>Kurum/Firma Adı</label>
              <input placeholder="Staj yapılacak yer" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 6 }}>Başlangıç Tarihi</label>
              <input type="date" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 6 }}>Bitiş Tarihi</label>
              <input type="date" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none" }} />
            </div>
          </div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button onClick={() => setView("list")} style={{
              padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D5DB",
              background: "white", color: STAJ.textMuted, fontSize: 13, cursor: "pointer",
            }}>İptal</button>
            <button style={{
              padding: "10px 20px", borderRadius: 8, border: "none",
              background: STAJ.primary, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>Kaydet</button>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16,
        alignItems: "center",
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Öğrenci adı, numara veya firma ara..."
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 8,
              border: "1px solid #D1D5DB", fontSize: 13, outline: "none",
            }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: "10px 14px", borderRadius: 8, border: "1px solid #D1D5DB",
            fontSize: 13, outline: "none", background: "white", cursor: "pointer",
          }}
        >
          <option value="all">Tüm Durumlar</option>
          {Object.entries(STAJ_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Records Table / Cards */}
      {filteredRecords.length === 0 ? (
        <div style={{
          background: "white", borderRadius: 12, padding: 40,
          border: "1px solid #E5E7EB", textAlign: "center",
        }}>
          <StajIcon path="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" size={48} color="#D1D5DB" />
          <p style={{ color: STAJ.textMuted, fontSize: 14, marginTop: 16 }}>
            {searchTerm || filterStatus !== "all"
              ? "Arama kriterlerine uygun staj kaydı bulunamadı."
              : "Henüz staj kaydı bulunmuyor."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredRecords.map(record => {
            const status = STAJ_STATUS[record.status] || STAJ_STATUS.beklemede;
            return (
              <div key={record.id} style={{
                background: "white", borderRadius: 10, padding: responsive.val(12, 16, 16),
                border: "1px solid #E5E7EB",
                display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: STAJ.text }}>{record.studentName}</div>
                  <div style={{ fontSize: 12, color: STAJ.textMuted }}>{record.studentNumber}</div>
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 13, color: STAJ.text }}>{record.companyName || "—"}</div>
                  <div style={{ fontSize: 11, color: STAJ.textMuted }}>{record.stajType === "staj2" ? "Staj II" : "Staj I"}</div>
                </div>
                <span style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  color: status.color, background: status.bg,
                }}>{status.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

window.StajModuluApp = StajModuluApp;
