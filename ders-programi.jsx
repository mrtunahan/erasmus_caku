// ══════════════════════════════════════════════════════════════
// ÇAKÜ Mühendislik Fakültesi - Ders Programı Otomasyonu
// Bölüm bazlı haftalık ders programı oluşturma ve yönetimi
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const DP = {
  primary: "#7C3AED",
  primaryLight: "#A78BFA",
  primaryPale: "#EDE9FE",
  bg: "#F5F3FF",
  card: "#FFFFFF",
  text: "#1F2937",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  green: "#059669",
  greenLight: "#D1FAE5",
  navy: "#1B2A4A",
};

const DPIcon = ({ path, size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
const HOURS = [
  "08:00-08:50", "09:00-09:50", "10:00-10:50", "11:00-11:50",
  "12:00-12:50", "13:00-13:50", "14:00-14:50", "15:00-15:50",
  "16:00-16:50", "17:00-17:50",
];

const SLOT_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
];

function DersProgramiApp({ currentUser, activeDepartment, departmentInfo }) {
  const [scheduleData, setScheduleData] = useState({});
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState("guz"); // guz, bahar
  const [year, setYear] = useState("1"); // 1,2,3,4
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); // { day, hour }
  const responsive = window.useResponsive();

  const isAdmin = currentUser?.role === "admin";
  const isDeptManager = currentUser?.role === "bolum_yetkilisi";
  const canManage = isAdmin || isDeptManager;

  // Ders programını yükle
  useEffect(() => {
    const loadSchedule = async () => {
      setLoading(true);
      try {
        const db = window.firebase?.firestore();
        if (db) {
          const docId = `${activeDepartment}_${semester}_${year}`;
          const doc = await db.collection("course_schedules").doc(docId).get();
          if (doc.exists) {
            setScheduleData(doc.data().slots || {});
          } else {
            setScheduleData({});
          }
        }
      } catch (e) {
        console.error("Ders programı yüklenirken hata:", e);
        setScheduleData({});
      } finally {
        setLoading(false);
      }
    };
    loadSchedule();
  }, [activeDepartment, semester, year]);

  // Renk ataması (ders koduna göre)
  const courseColors = useMemo(() => {
    const map = {};
    let idx = 0;
    Object.values(scheduleData).forEach(slot => {
      if (slot?.courseCode && !map[slot.courseCode]) {
        map[slot.courseCode] = SLOT_COLORS[idx % SLOT_COLORS.length];
        idx++;
      }
    });
    return map;
  }, [scheduleData]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, border: "3px solid #E5E1D8", borderTopColor: DP.primary, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#666", fontSize: 14 }}>Ders programı yükleniyor...</p>
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
          <h1 style={{ fontSize: responsive.val(20, 24, 28), fontWeight: 700, color: DP.navy, margin: 0 }}>
            Ders Programı
          </h1>
          <p style={{ fontSize: 13, color: DP.textMuted, marginTop: 4 }}>
            {departmentInfo?.name || "Bölüm"} - Haftalık ders programı
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canManage && (
            <button onClick={() => setEditMode(!editMode)} style={{
              padding: "8px 16px", borderRadius: 8,
              border: editMode ? "none" : "1px solid #D1D5DB",
              background: editMode ? DP.primary : "white",
              color: editMode ? "white" : DP.textMuted,
              fontSize: 13, fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <DPIcon path={editMode ? "M5 13l4 4L19 7" : "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"} size={14} />
              {editMode ? "Kaydet" : "Düzenle"}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20,
        background: "white", padding: responsive.val(12, 16, 16),
        borderRadius: 12, border: "1px solid #E5E7EB",
      }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: DP.textMuted, marginBottom: 4 }}>Dönem</label>
          <div style={{ display: "flex", gap: 4 }}>
            {[{ id: "guz", label: "Güz" }, { id: "bahar", label: "Bahar" }].map(s => (
              <button key={s.id} onClick={() => setSemester(s.id)} style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                border: "1px solid #D1D5DB", cursor: "pointer",
                background: semester === s.id ? DP.primary : "white",
                color: semester === s.id ? "white" : DP.text,
              }}>{s.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: DP.textMuted, marginBottom: 4 }}>Sınıf</label>
          <div style={{ display: "flex", gap: 4 }}>
            {["1", "2", "3", "4"].map(y => (
              <button key={y} onClick={() => setYear(y)} style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                border: "1px solid #D1D5DB", cursor: "pointer",
                background: year === y ? DP.primary : "white",
                color: year === y ? "white" : DP.text,
              }}>{y}. Sınıf</button>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div style={{
        background: "white", borderRadius: 12, border: "1px solid #E5E7EB",
        overflow: "auto",
      }}>
        {responsive.isMobile ? (
          // Mobile: Card-based view
          <div style={{ padding: 12 }}>
            {DAYS.map(day => {
              const daySlots = HOURS.map((hour, hi) => {
                const key = `${day}_${hi}`;
                return scheduleData[key] ? { ...scheduleData[key], hour, hourIndex: hi } : null;
              }).filter(Boolean);

              if (daySlots.length === 0) return null;

              return (
                <div key={day} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: DP.navy,
                    padding: "8px 0", borderBottom: "2px solid " + DP.primary,
                    marginBottom: 8,
                  }}>{day}</div>
                  {daySlots.map((slot, i) => (
                    <div key={i} style={{
                      padding: "8px 12px", marginBottom: 4, borderRadius: 8,
                      background: `${courseColors[slot.courseCode] || "#6B7280"}15`,
                      borderLeft: `3px solid ${courseColors[slot.courseCode] || "#6B7280"}`,
                    }}>
                      <div style={{ fontSize: 11, color: DP.textMuted }}>{slot.hour}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: DP.text }}>{slot.courseName || slot.courseCode}</div>
                      {slot.instructor && <div style={{ fontSize: 11, color: DP.textMuted }}>{slot.instructor}</div>}
                      {slot.classroom && <div style={{ fontSize: 11, color: DP.textMuted }}>Derslik: {slot.classroom}</div>}
                    </div>
                  ))}
                </div>
              );
            })}
            {Object.keys(scheduleData).length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: DP.textMuted }}>
                <DPIcon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" size={48} color="#D1D5DB" />
                <p style={{ marginTop: 12 }}>Bu dönem için ders programı henüz oluşturulmamış.</p>
              </div>
            )}
          </div>
        ) : (
          // Desktop: Table grid
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{
                  padding: "12px 8px", fontSize: 12, fontWeight: 700,
                  color: DP.textMuted, textAlign: "center", background: "#F9FAFB",
                  borderBottom: "2px solid #E5E7EB", width: 90,
                }}>Saat</th>
                {DAYS.map(day => (
                  <th key={day} style={{
                    padding: "12px 8px", fontSize: 13, fontWeight: 700,
                    color: DP.navy, textAlign: "center", background: "#F9FAFB",
                    borderBottom: "2px solid #E5E7EB",
                  }}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour, hi) => (
                <tr key={hi}>
                  <td style={{
                    padding: "8px 6px", fontSize: 11, fontWeight: 500,
                    color: DP.textMuted, textAlign: "center",
                    borderBottom: "1px solid #F3F4F6", background: "#FAFAFA",
                  }}>{hour}</td>
                  {DAYS.map(day => {
                    const key = `${day}_${hi}`;
                    const slot = scheduleData[key];
                    return (
                      <td
                        key={day}
                        onClick={() => {
                          if (editMode) {
                            setSelectedSlot({ day, hourIndex: hi, hour });
                            setShowAddModal(true);
                          }
                        }}
                        style={{
                          padding: 4, borderBottom: "1px solid #F3F4F6",
                          cursor: editMode ? "pointer" : "default",
                          background: editMode && !slot ? "#FAFBFF" : "transparent",
                          transition: "background 0.15s",
                        }}
                      >
                        {slot ? (
                          <div style={{
                            padding: "6px 8px", borderRadius: 6,
                            background: `${courseColors[slot.courseCode] || "#6B7280"}15`,
                            borderLeft: `3px solid ${courseColors[slot.courseCode] || "#6B7280"}`,
                            minHeight: 40,
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: DP.text }}>{slot.courseCode}</div>
                            <div style={{ fontSize: 11, color: DP.textMuted }}>{slot.courseName}</div>
                            {slot.classroom && <div style={{ fontSize: 10, color: DP.textMuted }}>{slot.classroom}</div>}
                          </div>
                        ) : editMode ? (
                          <div style={{
                            minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center",
                            borderRadius: 6, border: "1px dashed #D1D5DB",
                          }}>
                            <DPIcon path="M12 5v14M5 12h14" size={14} color="#D1D5DB" />
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal Placeholder */}
      {showAddModal && selectedSlot && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.4)", zIndex: 2000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            background: "white", borderRadius: 16,
            padding: responsive.val(20, 24, 28),
            width: "100%", maxWidth: 440,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: DP.navy, marginBottom: 4 }}>
              Ders Ekle
            </h3>
            <p style={{ fontSize: 13, color: DP.textMuted, marginBottom: 20 }}>
              {selectedSlot.day} - {selectedSlot.hour}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DP.textMuted, marginBottom: 4 }}>Ders Kodu</label>
                <input placeholder="örn: BİL301" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DP.textMuted, marginBottom: 4 }}>Ders Adı</label>
                <input placeholder="Ders adını girin" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DP.textMuted, marginBottom: 4 }}>Öğretim Üyesi</label>
                <input placeholder="Hoca adı" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DP.textMuted, marginBottom: 4 }}>Derslik</label>
                <input placeholder="örn: D-201" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none" }} />
              </div>
            </div>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowAddModal(false)} style={{
                padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D5DB",
                background: "white", color: DP.textMuted, fontSize: 13, cursor: "pointer",
              }}>İptal</button>
              <button style={{
                padding: "10px 20px", borderRadius: 8, border: "none",
                background: DP.primary, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Ekle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.DersProgramiApp = DersProgramiApp;
