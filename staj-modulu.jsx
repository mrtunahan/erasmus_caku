// ══════════════════════════════════════════════════════════════
// ÇAKÜ Mühendislik Fakültesi - Staj Modülü
// Bölüm bazlı staj takibi ve yönetimi + Staj Yol Haritası
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
  accent: "#0891B2",
  accentMid: "#0891B280",
  accentSoft: "#ECFEFF",
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

// ── Staj Yol Haritası Adımları ──
const STAJ_ROADMAP_STEPS = [
  {
    id: 1,
    title: "Staj Yeri Araştırması",
    duration: "2-4 Hafta",
    result: "Uygun staj yeri belirlendi",
    desc: "Bölümünüze uygun firmaları ve kurumları araştırın. Kariyer merkezinden destek alabilir, önceki öğrencilerin staj yaptığı yerleri inceleyebilirsiniz. En az 3 alternatif belirleyin.",
  },
  {
    id: 2,
    title: "Başvuru & Kabul",
    duration: "1-2 Hafta",
    result: "Firma kabul yazısı alındı",
    desc: "Belirlediğiniz firma/kuruma başvurunuzu yapın. CV ve niyet mektubunuzu hazırlayın. Kabul aldığınızda firmadan resmi kabul yazısı isteyin.",
  },
  {
    id: 3,
    title: "Evrak Hazırlığı",
    duration: "1 Hafta",
    result: "Tüm belgeler hazır",
    desc: "Staj başvuru formu, SGK giriş bildirgesi, iş güvenliği taahhütnamesi ve staj kabul formunu hazırlayın. Bölüm sekreterliğinden gerekli belgeleri temin edin.",
  },
  {
    id: 4,
    title: "Komisyon Onayı",
    duration: "1 Hafta",
    result: "Staj komisyonu onayı alındı",
    desc: "Hazırladığınız evrakları staj komisyonuna teslim edin. Komisyon staj yerinizin uygunluğunu değerlendirecektir. Onay sonucunu takip edin.",
  },
  {
    id: 5,
    title: "SGK İşlemleri",
    duration: "3-5 Gün",
    result: "SGK kaydı tamamlandı",
    desc: "Üniversite tarafından SGK giriş bildirgeniz yapılacaktır. İş kazası ve meslek hastalığı sigortası kapsamında tescil işleminizi kontrol edin.",
  },
  {
    id: 6,
    title: "Staj Dönemi",
    duration: "20 İş Günü",
    result: "Staj defteri günlük tutuldu",
    desc: "Staj süresince her gün staj defterinizi doldurun. Yaptığınız işleri detaylı açıklayın, sorumlu mühendisinize onaylatın. Devamsızlık yapmamaya özen gösterin.",
  },
  {
    id: 7,
    title: "Staj Raporu Yazımı",
    duration: "1-2 Hafta",
    result: "Rapor teslime hazır",
    desc: "Staj sürecinde edindiğiniz deneyimleri, öğrendiklerinizi ve yaptığınız projeleri içeren staj raporunuzu yazın. Bölüm formatına uygun hazırlayın.",
  },
  {
    id: 8,
    title: "Değerlendirme & Sonuç",
    duration: "2-4 Hafta",
    result: "Staj notu belirlendi",
    desc: "Staj defteriniz, raporunuz ve firma değerlendirme formunuz staj komisyonu tarafından incelenecektir. Eksik varsa tamamlamanız istenebilir. Sonucu ÖBS'den takip edin.",
  },
];

// ══════════════════════════════════════════════════════════════
// Staj Yol Haritası Bileşeni
// ══════════════════════════════════════════════════════════════
function StajRoadmap() {
  const responsive = window.useResponsive();
  const isMobile = responsive.val(true, false, false);
  const [expanded, setExpanded] = useState(null);
  const [statuses, setStatuses] = useState(() => {
    try {
      const saved = localStorage.getItem("staj_roadmap_statuses");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    try { localStorage.setItem("staj_roadmap_statuses", JSON.stringify(statuses)); } catch {}
  }, [statuses]);

  const cycleStatus = (idx) => {
    const order = ["upcoming", "in-progress", "completed"];
    const cur = statuses[idx] || "upcoming";
    const next = order[(order.indexOf(cur) + 1) % order.length];
    setStatuses(p => ({ ...p, [idx]: next }));
  };

  const steps = STAJ_ROADMAP_STEPS.map((s, i) => ({
    ...s,
    _status: statuses[i] || "upcoming",
  }));

  const completedCount = steps.filter(s => s._status === "completed").length;

  // ── Step Card ──
  const StepCard = ({ step, i, isOpen }) => {
    const done = step._status === "completed";
    const active = step._status === "in-progress";
    const stBg = done ? "#DCFCE7" : active ? "#FEF3C7" : "#F1F5F9";
    const stColor = done ? "#16A34A" : active ? "#D97706" : "#94A3B8";
    return (
      <div
        onClick={() => setExpanded(isOpen ? null : i)}
        style={{
          background: isOpen ? STAJ.accentSoft : "#fff",
          border: `1.5px solid ${isOpen ? STAJ.accent + "35" : "#F1F5F9"}`,
          borderRadius: 14, padding: "12px 16px", cursor: "pointer",
          width: "100%", maxWidth: isMobile ? "100%" : 290,
          boxShadow: isOpen ? `0 4px 18px ${STAJ.accent}18` : "0 1px 4px rgba(0,0,0,0.05)",
          transition: "all 0.2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", lineHeight: 1.4 }}>{step.title}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 10, background: stBg, color: stColor, flexShrink: 0 }}>{step.duration}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: STAJ.accent }}>→</span>
          <span style={{ fontSize: 12, color: "#64748B" }}>{step.result}</span>
        </div>
        {isOpen && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${STAJ.accent}18` }}>
            <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.8, margin: 0 }}>{step.desc}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      background: "white", borderRadius: 16, padding: responsive.val(16, 24, 32),
      border: "1px solid #E5E7EB",
    }}>
      {/* Başlık */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ height: 1, width: 40, background: `linear-gradient(to right, transparent, ${STAJ.accent}60)` }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", color: STAJ.accent }}>YOL HARİTASI</span>
          <div style={{ height: 1, width: 40, background: `linear-gradient(to left, transparent, ${STAJ.accent}60)` }} />
        </div>
        <p style={{ fontSize: 13, color: STAJ.textMuted, margin: 0 }}>
          Numaraya tıklayarak durumunuzu güncelleyin
        </p>
        {/* İlerleme */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 }}>
          <div style={{ width: 120, height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
            <div style={{ width: `${(completedCount / steps.length) * 100}%`, height: "100%", borderRadius: 3, background: STAJ.accent, transition: "width 0.3s" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: STAJ.textMuted }}>{completedCount}/{steps.length}</span>
        </div>
      </div>

      {/* Yol Haritası */}
      <div style={{ position: "relative", paddingBottom: 20 }}>

        {/* ── Asfalt Yol ── */}
        <div style={{
          position: "absolute",
          left: isMobile ? 28 : "50%",
          transform: isMobile ? "none" : "translateX(-50%)",
          width: 54, top: 0, bottom: 0,
          background: "linear-gradient(to right, #2D3748 0%, #374151 40%, #374151 60%, #2D3748 100%)",
          zIndex: 0, borderRadius: 4,
        }}>
          {/* Sol beyaz çizgi */}
          <div style={{ position: "absolute", left: 5, top: 0, bottom: 0, width: 3, background: "rgba(255,255,255,0.65)", borderRadius: 2 }} />
          {/* Sağ beyaz çizgi */}
          <div style={{ position: "absolute", right: 5, top: 0, bottom: 0, width: 3, background: "rgba(255,255,255,0.65)", borderRadius: 2 }} />
          {/* Ortadaki sarı kesikli çizgi */}
          <div style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            width: 4, top: 0, bottom: 0,
            background: "repeating-linear-gradient(to bottom, #FCD34D 0px, #FCD34D 14px, transparent 14px, transparent 28px)",
            borderRadius: 2,
          }} />
        </div>

        {/* ── BAŞLANGIÇ ── */}
        <div style={{ display: "flex", justifyContent: isMobile ? "flex-start" : "center", marginBottom: 32, position: "relative", zIndex: 2 }}>
          <div style={{
            marginLeft: isMobile ? 6 : 0,
            background: STAJ.accent, color: "#fff",
            padding: "8px 22px", borderRadius: 8,
            fontWeight: 800, fontSize: 11, letterSpacing: "0.12em",
            boxShadow: `0 3px 12px ${STAJ.accent}40`,
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>BAŞLANGIÇ</div>
        </div>

        {/* ── Adımlar ── */}
        {steps.map((step, i) => {
          const isLeft = !isMobile && i % 2 === 0;
          const isOpen = expanded === i;
          const done = step._status === "completed";
          const active = step._status === "in-progress";

          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", marginBottom: 40,
              position: "relative", zIndex: 1,
            }}>
              {/* Sol taraf */}
              {!isMobile && (
                <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", paddingRight: 14 }}>
                  {isLeft ? (
                    <StepCard step={step} i={i} isOpen={isOpen} />
                  ) : (
                    <div style={{ height: 2, width: 32, background: `repeating-linear-gradient(to right, ${STAJ.accentMid} 0, ${STAJ.accentMid} 5px, transparent 5px, transparent 10px)` }} />
                  )}
                </div>
              )}

              {/* Yol üzerindeki numara dairesi */}
              <div style={{
                width: isMobile ? 56 : 54, flexShrink: 0, display: "flex", justifyContent: "center", zIndex: 2,
              }}>
                <div
                  onClick={e => { e.stopPropagation(); cycleStatus(i); }}
                  title="Durumu değiştir"
                  style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: done ? STAJ.accent : active ? "#fff" : "#64748B",
                    border: `3.5px solid ${done ? "rgba(255,255,255,0.85)" : active ? STAJ.accent : "rgba(255,255,255,0.5)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: done
                      ? `0 0 0 5px ${STAJ.accent}30, 0 4px 14px rgba(0,0,0,0.3)`
                      : active
                        ? `0 0 0 5px ${STAJ.accent}25, 0 4px 14px rgba(0,0,0,0.25)`
                        : "0 2px 8px rgba(0,0,0,0.35)",
                    fontWeight: 800, fontSize: done ? 17 : 14,
                    color: done ? "#fff" : active ? STAJ.accent : "rgba(255,255,255,0.8)",
                    transition: "all 0.25s",
                  }}
                >
                  {done ? "✓" : step.id}
                </div>
              </div>

              {/* Sağ taraf */}
              <div style={{ flex: 1, paddingLeft: 14 }}>
                {(!isMobile && !isLeft) || isMobile ? (
                  <StepCard step={step} i={i} isOpen={isOpen} />
                ) : (
                  <div style={{ height: 2, width: 32, background: `repeating-linear-gradient(to right, ${STAJ.accentMid} 0, ${STAJ.accentMid} 5px, transparent 5px, transparent 10px)` }} />
                )}
              </div>
            </div>
          );
        })}

        {/* ── BİTİŞ ── */}
        <div style={{ display: "flex", justifyContent: isMobile ? "flex-start" : "center", marginTop: 8, position: "relative", zIndex: 2 }}>
          <div style={{
            marginLeft: isMobile ? 6 : 0,
            background: "#0F172A", color: "#fff",
            padding: "8px 22px", borderRadius: 8,
            fontWeight: 800, fontSize: 11, letterSpacing: "0.12em",
            boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>BİTİŞ</div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Ana Staj Modülü
// ══════════════════════════════════════════════════════════════
function StajModuluApp({ currentUser, activeDepartment, departmentInfo }) {
  const [stajRecords, setStajRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list, add
  const [activeTab, setActiveTab] = useState("roadmap"); // roadmap, kayitlar
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

  const TABS = [
    { id: "roadmap", label: "Yol Haritası", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
    { id: "kayitlar", label: "Staj Kayıtları", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  ];

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

        {/* Tab Switcher */}
        <div style={{
          display: "flex", background: "#F3F4F6", borderRadius: 10, padding: 3,
        }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: activeTab === tab.id ? "white" : "transparent",
              color: activeTab === tab.id ? STAJ.navy : STAJ.textMuted,
              fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              boxShadow: activeTab === tab.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s",
            }}>
              <StajIcon path={tab.icon} size={15} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ════ Yol Haritası Sekmesi ════ */}
      {activeTab === "roadmap" && <StajRoadmap />}

      {/* ════ Staj Kayıtları Sekmesi ════ */}
      {activeTab === "kayitlar" && (
        <>
          {/* Yeni Kayıt Butonu */}
          {canManage && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={() => setView(view === "add" ? "list" : "add")} style={{
                padding: "10px 20px", borderRadius: 8, border: "none",
                background: view === "add" ? "#6B7280" : STAJ.primary,
                color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <StajIcon path={view === "add" ? "M6 18L18 6M6 6l12 12" : "M12 5v14M5 12h14"} size={16} />
                {view === "add" ? "İptal" : "Yeni Staj Kaydı"}
              </button>
            </div>
          )}

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

          {/* Records */}
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
        </>
      )}
    </div>
  );
}

window.StajModuluApp = StajModuluApp;
