// ══════════════════════════════════════════════════════════════
// ÇAKÜ Mühendislik Fakültesi - Ders Programı Otomasyonu
// Sınav otomasyonundaki ders/hoca/derslik verilerini kullanır
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const DP = {
  primary: "#7C3AED",
  primaryLight: "#A78BFA",
  primaryPale: "#EDE9FE",
  text: "#1F2937",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  green: "#059669",
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
  "#84CC16", "#F43F5E",
];

function DersProgramiApp({ currentUser, activeDepartment, departmentInfo }) {
  const [scheduleData, setScheduleData] = useState({});
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState("guz");
  const [year, setYear] = useState("1");
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const responsive = window.useResponsive();

  // Sınav otomasyonundan paylaşılan veriler
  const [courses, setCourses] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  // Modal form state
  const [modalCourseId, setModalCourseId] = useState("");
  const [modalClassroom, setModalClassroom] = useState("");

  const isAdmin = currentUser?.role === "admin";
  const isDeptManager = currentUser?.role === "bolum_yetkilisi";
  const canManage = isAdmin || isDeptManager;

  // Sınav otomasyonundaki dersleri, hocaları ve derslikleri yükle
  useEffect(() => {
    const loadSharedData = async () => {
      try {
        const db = window.firebase?.firestore();
        if (!db) return;

        // Dersler (sinav_dersler) - bölüm bazlı
        const coursesSnap = activeDepartment
          ? await db.collection("sinav_dersler").where("departmentId", "==", activeDepartment).get()
          : await db.collection("sinav_dersler").get();
        const courseList = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        courseList.sort((a, b) => (a.sinif || 0) - (b.sinif || 0) || (a.code || "").localeCompare(b.code || ""));
        setCourses(courseList);

        // Akademisyenler (professors) - bölüm bazlı
        const profsSnap = activeDepartment
          ? await db.collection("professors").where("departmentId", "==", activeDepartment).get()
          : await db.collection("professors").get();
        const profList = profsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        profList.sort((a, b) => (a.name || "").localeCompare(b.name || "", "tr"));
        setProfessors(profList);

        // Derslikler (department_classrooms) - bölüm bazlı
        const roomsSnap = activeDepartment
          ? await db.collection("department_classrooms").where("departmentId", "==", activeDepartment).get()
          : await db.collection("department_classrooms").get();
        const roomList = roomsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        roomList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setClassrooms(roomList);
      } catch (e) {
        console.error("Paylaşılan veriler yüklenirken hata:", e);
      }
    };
    loadSharedData();
  }, [activeDepartment]);

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

  // Program kaydet
  const saveSchedule = useCallback(async (newData) => {
    try {
      const docId = `${activeDepartment}_${semester}_${year}`;
      await window.FirestoreWrite.set("course_schedules", docId, {
        slots: newData,
        departmentId: activeDepartment,
        semester,
        year,
        updatedAt: new Date().toISOString(),
      }, true);
    } catch (e) {
      console.error("Program kaydedilirken hata:", e);
      alert("Program kaydedilirken hata: " + e.message);
    }
  }, [activeDepartment, semester, year]);

  // Slot ekle
  const handleAddSlot = useCallback(() => {
    if (!selectedSlot || !modalCourseId) return;
    const course = courses.find(c => c.id === modalCourseId);
    if (!course) return;

    const key = `${selectedSlot.day}_${selectedSlot.hourIndex}`;
    const newData = {
      ...scheduleData,
      [key]: {
        courseCode: course.code || "",
        courseName: course.name || "",
        instructor: course.professor || "",
        classroom: modalClassroom || "",
        courseId: course.id,
        sinif: course.sinif || 0,
      },
    };
    setScheduleData(newData);
    saveSchedule(newData);
    setShowAddModal(false);
    setModalCourseId("");
    setModalClassroom("");
  }, [selectedSlot, modalCourseId, modalClassroom, scheduleData, courses, saveSchedule]);

  // Slot sil
  const handleRemoveSlot = useCallback((key) => {
    const newData = { ...scheduleData };
    delete newData[key];
    setScheduleData(newData);
    saveSchedule(newData);
  }, [scheduleData, saveSchedule]);

  // Seçili sınıfa ait dersler
  const yearCourses = useMemo(() => {
    const y = parseInt(year);
    return courses.filter(c => c.sinif === y || c.sinif === 5);
  }, [courses, year]);

  // Renk ataması
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

  // İstatistikler
  const stats = useMemo(() => {
    const slotCount = Object.keys(scheduleData).length;
    const uniqueCourses = new Set(Object.values(scheduleData).map(s => s.courseCode)).size;
    const uniqueProfs = new Set(Object.values(scheduleData).map(s => s.instructor).filter(Boolean)).size;
    return { slotCount, uniqueCourses, uniqueProfs };
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
        justifyContent: "space-between", gap: 12, marginBottom: 20,
      }}>
        <div>
          <h1 style={{ fontSize: responsive.val(20, 24, 28), fontWeight: 700, color: DP.navy, margin: 0 }}>
            Ders Programı
          </h1>
          <p style={{ fontSize: 13, color: DP.textMuted, marginTop: 4 }}>
            {departmentInfo?.name || "Bölüm"} - Haftalık ders programı
          </p>
        </div>
        {canManage && (
          <button onClick={() => setEditMode(!editMode)} style={{
            padding: "8px 16px", borderRadius: 8,
            border: editMode ? "none" : "1px solid #D1D5DB",
            background: editMode ? DP.green : "white",
            color: editMode ? "white" : DP.textMuted,
            fontSize: 13, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <DPIcon path={editMode ? "M5 13l4 4L19 7" : "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"} size={14} />
            {editMode ? "Düzenleme Modu Aktif" : "Düzenle"}
          </button>
        )}
      </div>

      {/* Stats + Filters */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20,
        alignItems: "stretch",
      }}>
        {/* Stats */}
        <div style={{
          display: "flex", gap: 8, flex: "0 0 auto",
        }}>
          {[
            { label: "Ders Saati", value: stats.slotCount, color: DP.primary },
            { label: "Ders", value: stats.uniqueCourses, color: "#3B82F6" },
            { label: "Hoca", value: stats.uniqueProfs, color: "#059669" },
          ].map((s, i) => (
            <div key={i} style={{
              background: "white", borderRadius: 8, padding: "8px 16px",
              border: "1px solid #E5E7EB", textAlign: "center", minWidth: 70,
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: DP.textMuted }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 12, flex: 1,
          background: "white", padding: responsive.val(10, 12, 12),
          borderRadius: 8, border: "1px solid #E5E7EB", alignItems: "center",
        }}>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: DP.textMuted, marginBottom: 2 }}>Dönem</label>
            <div style={{ display: "flex", gap: 2 }}>
              {[{ id: "guz", label: "Güz" }, { id: "bahar", label: "Bahar" }].map(s => (
                <button key={s.id} onClick={() => setSemester(s.id)} style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                  border: "1px solid #D1D5DB", cursor: "pointer",
                  background: semester === s.id ? DP.primary : "white",
                  color: semester === s.id ? "white" : DP.text,
                }}>{s.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: DP.textMuted, marginBottom: 2 }}>Sınıf</label>
            <div style={{ display: "flex", gap: 2 }}>
              {["1", "2", "3", "4"].map(y => (
                <button key={y} onClick={() => setYear(y)} style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                  border: "1px solid #D1D5DB", cursor: "pointer",
                  background: year === y ? DP.primary : "white",
                  color: year === y ? "white" : DP.text,
                }}>{y}. Sınıf</button>
              ))}
            </div>
          </div>
          {courses.length > 0 && (
            <div style={{ fontSize: 11, color: DP.textMuted, marginLeft: "auto" }}>
              Sınav Otomasyonundan: <strong>{courses.length}</strong> ders, <strong>{professors.length}</strong> hoca, <strong>{classrooms.length}</strong> derslik
            </div>
          )}
        </div>
      </div>

      {/* Info banner when no courses */}
      {courses.length === 0 && (
        <div style={{
          background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 10,
          padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
        }}>
          <DPIcon path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" size={20} color="#F59E0B" />
          <div style={{ fontSize: 13, color: "#92400E" }}>
            Bu bölüm için henüz ders tanımlanmamış. Önce <strong>Sınav Otomasyonu</strong> modülünden ders ve akademisyen ekleyin.
          </div>
        </div>
      )}

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
                return scheduleData[key] ? { ...scheduleData[key], hour, hourIndex: hi, key } : null;
              }).filter(Boolean);

              if (daySlots.length === 0 && !editMode) return null;

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
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <div>
                        <div style={{ fontSize: 11, color: DP.textMuted }}>{slot.hour}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: DP.text }}>{slot.courseCode} - {slot.courseName}</div>
                        {slot.instructor && <div style={{ fontSize: 11, color: DP.textMuted }}>{slot.instructor}</div>}
                        {slot.classroom && <div style={{ fontSize: 11, color: DP.textMuted }}>Derslik: {slot.classroom}</div>}
                      </div>
                      {editMode && (
                        <button onClick={() => handleRemoveSlot(slot.key)} style={{
                          background: "none", border: "none", cursor: "pointer", padding: 4, color: "#EF4444",
                        }}>
                          <DPIcon path="M18 6L6 18M6 6l12 12" size={16} color="#EF4444" />
                        </button>
                      )}
                    </div>
                  ))}
                  {editMode && (
                    <button onClick={() => { setSelectedSlot({ day, hourIndex: 0, hour: HOURS[0] }); setShowAddModal(true); }} style={{
                      width: "100%", padding: 8, border: "1px dashed #D1D5DB", borderRadius: 8,
                      background: "transparent", cursor: "pointer", fontSize: 12, color: DP.textMuted,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 4,
                    }}>
                      <DPIcon path="M12 5v14M5 12h14" size={14} color="#D1D5DB" /> Ders Ekle
                    </button>
                  )}
                </div>
              );
            })}
            {Object.keys(scheduleData).length === 0 && !editMode && (
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
                          if (editMode && !slot) {
                            setSelectedSlot({ day, hourIndex: hi, hour });
                            setModalCourseId("");
                            setModalClassroom("");
                            setShowAddModal(true);
                          }
                        }}
                        style={{
                          padding: 4, borderBottom: "1px solid #F3F4F6",
                          cursor: editMode && !slot ? "pointer" : "default",
                          background: editMode && !slot ? "#FAFBFF" : "transparent",
                          transition: "background 0.15s",
                        }}
                      >
                        {slot ? (
                          <div style={{
                            padding: "6px 8px", borderRadius: 6,
                            background: `${courseColors[slot.courseCode] || "#6B7280"}15`,
                            borderLeft: `3px solid ${courseColors[slot.courseCode] || "#6B7280"}`,
                            minHeight: 40, position: "relative",
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: DP.text }}>{slot.courseCode}</div>
                            <div style={{ fontSize: 11, color: DP.textMuted, lineHeight: 1.2 }}>{slot.courseName}</div>
                            {slot.instructor && <div style={{ fontSize: 10, color: DP.textMuted, marginTop: 2 }}>{slot.instructor}</div>}
                            {slot.classroom && <div style={{ fontSize: 10, color: DP.primary, fontWeight: 500 }}>{slot.classroom}</div>}
                            {editMode && (
                              <button onClick={(e) => { e.stopPropagation(); handleRemoveSlot(key); }} style={{
                                position: "absolute", top: 2, right: 2,
                                background: "none", border: "none", cursor: "pointer", padding: 2,
                              }}>
                                <DPIcon path="M18 6L6 18M6 6l12 12" size={12} color="#EF4444" />
                              </button>
                            )}
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

      {/* Add Slot Modal */}
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
            width: "100%", maxWidth: 480,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: DP.navy, marginBottom: 4 }}>
              Ders Programına Ekle
            </h3>
            <p style={{ fontSize: 13, color: DP.textMuted, marginBottom: 20 }}>
              {selectedSlot.day} - {selectedSlot.hour}
            </p>

            {/* Saat seçimi (mobilde) */}
            {responsive.isMobile && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DP.textMuted, marginBottom: 4 }}>Saat</label>
                <select
                  value={selectedSlot.hourIndex}
                  onChange={e => setSelectedSlot({ ...selectedSlot, hourIndex: parseInt(e.target.value), hour: HOURS[parseInt(e.target.value)] })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none", background: "white" }}
                >
                  {HOURS.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </div>
            )}

            {/* Ders seçimi (sınav otomasyonundaki derslerden) */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DP.textMuted, marginBottom: 4 }}>
                Ders Seçimi <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(Sınav Otomasyonundan)</span>
              </label>
              {yearCourses.length > 0 ? (
                <select
                  value={modalCourseId}
                  onChange={e => setModalCourseId(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none", background: "white" }}
                >
                  <option value="">Ders seçin...</option>
                  {yearCourses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name} {c.professor ? `(${c.professor})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{
                  padding: "10px 12px", borderRadius: 8, border: "1px solid #FCD34D",
                  background: "#FFFBEB", fontSize: 12, color: "#92400E",
                }}>
                  Bu sınıf için ders bulunamadı. Sınav Otomasyonundan ders ekleyin.
                </div>
              )}
            </div>

            {/* Derslik seçimi */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DP.textMuted, marginBottom: 4 }}>
                Derslik <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(Sınav Otomasyonundan)</span>
              </label>
              {classrooms.length > 0 ? (
                <select
                  value={modalClassroom}
                  onChange={e => setModalClassroom(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none", background: "white" }}
                >
                  <option value="">Derslik seçin (opsiyonel)...</option>
                  {classrooms.map(r => (
                    <option key={r.id} value={r.name}>{r.name} ({r.capacity} kişi)</option>
                  ))}
                </select>
              ) : (
                <input
                  value={modalClassroom}
                  onChange={e => setModalClassroom(e.target.value)}
                  placeholder="Derslik adı (ör: D-201)"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none" }}
                />
              )}
            </div>

            {/* Seçili ders önizleme */}
            {modalCourseId && (() => {
              const c = courses.find(x => x.id === modalCourseId);
              if (!c) return null;
              return (
                <div style={{
                  padding: 12, borderRadius: 8, background: "#F3F4F6",
                  marginBottom: 14, fontSize: 12,
                }}>
                  <div style={{ fontWeight: 600, color: DP.text }}>{c.code} - {c.name}</div>
                  {c.professor && <div style={{ color: DP.textMuted, marginTop: 2 }}>Hoca: {c.professor}</div>}
                  {c.sinif && <div style={{ color: DP.textMuted }}>Sınıf: {c.sinif === 5 ? "Seçmeli" : c.sinif + ". Sınıf"}</div>}
                  {c.studentCount > 0 && <div style={{ color: DP.textMuted }}>Öğrenci: {c.studentCount}</div>}
                </div>
              );
            })()}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowAddModal(false)} style={{
                padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D5DB",
                background: "white", color: DP.textMuted, fontSize: 13, cursor: "pointer",
              }}>İptal</button>
              <button onClick={handleAddSlot} disabled={!modalCourseId} style={{
                padding: "10px 20px", borderRadius: 8, border: "none",
                background: modalCourseId ? DP.primary : "#D1D5DB",
                color: "white", fontSize: 13, fontWeight: 600,
                cursor: modalCourseId ? "pointer" : "default",
              }}>Ekle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.DersProgramiApp = DersProgramiApp;
