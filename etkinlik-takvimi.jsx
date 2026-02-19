// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Etkinlik Takvimi
// Etkinlik oluşturma, takvim görünümü, katılım, hatırlatıcı
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ── Renkler ──
const ETK = {
  primary: "#0e7490",
  primaryLight: "#06b6d4",
  primaryPale: "#cffafe",
  gold: "#d4af37",
  green: "#059669",
  greenLight: "#d1fae5",
  red: "#dc2626",
  redLight: "#fee2e2",
  orange: "#ea580c",
  orangeLight: "#ffedd5",
  purple: "#7c3aed",
  purpleLight: "#ede9fe",
  bg: "#ecfeff",
  card: "#ffffff",
  text: "#1f2937",
  textMuted: "#6b7280",
  border: "#e5e7eb",
};

const EVENT_CATEGORIES = [
  { key: "seminer", label: "Seminer", color: "#3b82f6", bg: "#dbeafe" },
  { key: "workshop", label: "Workshop", color: "#059669", bg: "#d1fae5" },
  { key: "sosyal", label: "Sosyal Etkinlik", color: "#ec4899", bg: "#fce7f3" },
  { key: "spor", label: "Spor", color: "#f97316", bg: "#ffedd5" },
  { key: "akademik", label: "Akademik", color: "#6366f1", bg: "#e0e7ff" },
  { key: "kultur", label: "Kültürel", color: "#8b5cf6", bg: "#ede9fe" },
  { key: "kariyer", label: "Kariyer", color: "#0ea5e9", bg: "#e0f2fe" },
  { key: "diger", label: "Diğer", color: "#6b7280", bg: "#f3f4f6" },
];

const DAYS_TR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

// Akademik takvim verileri
const ACADEMIC_CALENDAR = [
  { title: "Güz Dönemi Başlangıcı", date: "2025-09-15", category: "akademik" },
  { title: "Vize Haftası Başlangıcı", date: "2025-11-10", category: "akademik" },
  { title: "Vize Haftası Bitişi", date: "2025-11-21", category: "akademik" },
  { title: "Final Haftası Başlangıcı", date: "2026-01-05", category: "akademik" },
  { title: "Final Haftası Bitişi", date: "2026-01-16", category: "akademik" },
  { title: "Yarıyıl Tatili Başlangıcı", date: "2026-01-19", category: "akademik" },
  { title: "Bahar Dönemi Başlangıcı", date: "2026-02-09", category: "akademik" },
  { title: "Bahar Vize Başlangıcı", date: "2026-04-06", category: "akademik" },
  { title: "Bahar Vize Bitişi", date: "2026-04-17", category: "akademik" },
  { title: "Bahar Final Başlangıcı", date: "2026-06-08", category: "akademik" },
  { title: "Bahar Final Bitişi", date: "2026-06-19", category: "akademik" },
  { title: "Yaz Okulu Başlangıcı", date: "2026-07-06", category: "akademik" },
];

// ── SVG Icon Helper ──
const EtkIcon = ({ path, size, color }) => (
  <svg width={size || 18} height={size || 18} viewBox="0 0 24 24" fill="none"
    stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const ETK_ICONS = {
  calendar: "M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18",
  plus: "M12 5v14M5 12h14",
  clock: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
  mapPin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 7a3 3 0 100 6 3 3 0 000-6z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  chevLeft: "M15 18l-6-6 6-6",
  chevRight: "M9 18l6-6-6-6",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  info: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 16v-4M12 8h.01",
};

// ══════════════════════════════════════════════════════════════
// ANA MODÜL
// ══════════════════════════════════════════════════════════════
function EtkinlikTakvimiApp({ currentUser }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("month"); // month, week
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showUpcoming, setShowUpcoming] = useState(false);

  const userId = currentUser?.studentNumber || currentUser?.name || "anonymous";
  const isAdmin = currentUser?.role === "admin";

  // ── Etkinlikleri Yükle ──
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const db = window.firebase?.firestore();
      if (!db) { setLoading(false); return; }
      const snapshot = await db.collection("events").orderBy("date", "asc").get();
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      // Akademik takvimi ekle
      const academicEvents = ACADEMIC_CALENDAR.map((e, i) => ({
        ...e,
        id: `academic_${i}`,
        isAcademic: true,
        attendees: [],
        createdBy: "system",
        createdByName: "Akademik Takvim",
      }));
      setEvents([...data, ...academicEvents]);
    } catch (e) {
      console.error("Etkinlikler yuklenemedi:", e);
    }
    setLoading(false);
  };

  // ── Etkinlik Oluştur ──
  const handleCreateEvent = async (eventData) => {
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      const docData = {
        ...eventData,
        attendees: [userId],
        attendeeCount: 1,
        createdBy: userId,
        createdByName: currentUser?.name || userId,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      };
      const docRef = await db.collection("events").add(docData);
      setEvents(prev => [...prev, { ...docData, id: docRef.id }]);
      setShowCreateModal(false);
    } catch (e) {
      console.error("Etkinlik olusturulamadi:", e);
      alert("Etkinlik oluşturulurken hata oluştu!");
    }
  };

  // ── Katılım ──
  const handleToggleAttendance = async (event) => {
    if (event.isAcademic) return;
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      const isAttending = event.attendees?.includes(userId);
      const updatedAttendees = isAttending
        ? event.attendees.filter(a => a !== userId)
        : [...(event.attendees || []), userId];

      await db.collection("events").doc(event.id).update({
        attendees: updatedAttendees,
        attendeeCount: updatedAttendees.length,
      });

      setEvents(prev => prev.map(e =>
        e.id === event.id ? { ...e, attendees: updatedAttendees, attendeeCount: updatedAttendees.length } : e
      ));
      if (selectedEvent?.id === event.id) {
        setSelectedEvent(prev => ({ ...prev, attendees: updatedAttendees, attendeeCount: updatedAttendees.length }));
      }
    } catch (e) {
      console.error("Katilim hatasi:", e);
    }
  };

  // ── Etkinlik Sil ──
  const handleDeleteEvent = async (eventId) => {
    if (!confirm("Bu etkinliği silmek istediğinize emin misiniz?")) return;
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      await db.collection("events").doc(eventId).delete();
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setSelectedEvent(null);
    } catch (e) {
      console.error("Etkinlik silinemedi:", e);
    }
  };

  // ── Takvim Hesaplamaları ──
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const calendarDays = useMemo(() => {
    const days = [];
    // Önceki ayın son günleri
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }
    // Bu ayın günleri
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }
    // Sonraki ayın günleri
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
    }
    return days;
  }, [year, month, daysInMonth, firstDayOfMonth]);

  // Haftalık görünüm
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const dayOfWeek = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dayOfWeek);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const getEventsForDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    return events.filter(e => e.date === dateStr);
  };

  // Yaklaşan etkinlikler
  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return events
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 10);
  }, [events]);

  const navigate = (direction) => {
    const d = new Date(currentDate);
    if (viewMode === "month") {
      d.setMonth(d.getMonth() + direction);
    } else {
      d.setDate(d.getDate() + direction * 7);
    }
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  const isToday = (date) => {
    const t = new Date();
    return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
  };

  const getCategoryInfo = (cat) => EVENT_CATEGORIES.find(c => c.key === cat) || EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ background: ETK.bg, minHeight: "100vh", padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0e7490 0%, #06b6d4 50%, #67e8f9 100%)",
        padding: "32px 0 24px", marginBottom: 24,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ color: "white", fontSize: 28, fontWeight: 700, fontFamily: "'Playfair Display', serif", display: "flex", alignItems: "center", gap: 10 }}>
                <EtkIcon path={ETK_ICONS.calendar} size={28} color="rgba(255,255,255,0.8)" /> Etkinlik Takvimi
              </h1>
              <p style={{ color: "rgba(255,255,255,0.7)", marginTop: 4, fontSize: 14 }}>
                Etkinlikleri takip edin, katılım bildirin
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowUpcoming(!showUpcoming)}
                style={{
                  background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500,
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <EtkIcon path={ETK_ICONS.bell} size={16} color="white" /> Yaklaşanlar
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <EtkIcon path={ETK_ICONS.plus} size={18} color="white" /> Yeni Etkinlik
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", gap: 24 }}>
        {/* Ana Takvim */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Takvim Navigasyonu */}
          <div style={{
            background: "white", borderRadius: 12, padding: 16, marginBottom: 16,
            border: `1px solid ${ETK.border}`, display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => navigate(-1)} style={{ background: "none", border: `1px solid ${ETK.border}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>
                <EtkIcon path={ETK_ICONS.chevLeft} size={16} />
              </button>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: ETK.text, minWidth: 200, textAlign: "center" }}>
                {viewMode === "month"
                  ? `${MONTHS_TR[month]} ${year}`
                  : `${weekDays[0].getDate()} - ${weekDays[6].getDate()} ${MONTHS_TR[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
                }
              </h2>
              <button onClick={() => navigate(1)} style={{ background: "none", border: `1px solid ${ETK.border}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>
                <EtkIcon path={ETK_ICONS.chevRight} size={16} />
              </button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={goToToday} style={{
                background: ETK.primaryPale, color: ETK.primary, border: "none",
                borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}>
                Bugün
              </button>
              <button onClick={() => setViewMode("month")} style={{
                background: viewMode === "month" ? ETK.primary : "white",
                color: viewMode === "month" ? "white" : ETK.textMuted,
                border: `1px solid ${viewMode === "month" ? ETK.primary : ETK.border}`,
                borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 500,
              }}>
                <EtkIcon path={ETK_ICONS.grid} size={14} /> Aylık
              </button>
              <button onClick={() => setViewMode("week")} style={{
                background: viewMode === "week" ? ETK.primary : "white",
                color: viewMode === "week" ? "white" : ETK.textMuted,
                border: `1px solid ${viewMode === "week" ? ETK.primary : ETK.border}`,
                borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 500,
              }}>
                <EtkIcon path={ETK_ICONS.list} size={14} /> Haftalık
              </button>
            </div>
          </div>

          {/* Aylık Takvim Grid */}
          {viewMode === "month" ? (
            <div style={{
              background: "white", borderRadius: 12, overflow: "hidden",
              border: `1px solid ${ETK.border}`,
            }}>
              {/* Gün Başlıkları */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${ETK.border}` }}>
                {DAYS_TR.map(day => (
                  <div key={day} style={{
                    padding: "10px", textAlign: "center", fontSize: 12, fontWeight: 700,
                    color: ETK.textMuted, background: "#fafafa",
                  }}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Takvim Günleri */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {calendarDays.map((dayInfo, idx) => {
                  const dayEvents = getEventsForDate(dayInfo.date);
                  const today = isToday(dayInfo.date);
                  return (
                    <div
                      key={idx}
                      style={{
                        minHeight: 90, padding: 4,
                        borderRight: (idx + 1) % 7 !== 0 ? `1px solid ${ETK.border}` : "none",
                        borderBottom: `1px solid ${ETK.border}`,
                        background: today ? "#ecfeff" : dayInfo.isCurrentMonth ? "white" : "#fafafa",
                        opacity: dayInfo.isCurrentMonth ? 1 : 0.5,
                      }}
                    >
                      <div style={{
                        fontSize: 13, fontWeight: today ? 700 : 500,
                        padding: "2px 6px",
                        background: today ? ETK.primary : "transparent",
                        color: today ? "white" : dayInfo.isCurrentMonth ? ETK.text : ETK.textMuted,
                        borderRadius: "50%", width: 24, height: 24,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginBottom: 2,
                      }}>
                        {dayInfo.day}
                      </div>
                      {dayEvents.slice(0, 3).map((evt, i) => {
                        const cat = getCategoryInfo(evt.category);
                        return (
                          <div
                            key={i}
                            onClick={() => setSelectedEvent(evt)}
                            style={{
                              background: cat.bg, color: cat.color,
                              fontSize: 10, padding: "1px 4px", borderRadius: 3,
                              marginBottom: 1, cursor: "pointer",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              borderLeft: `2px solid ${cat.color}`,
                            }}
                            title={evt.title}
                          >
                            {evt.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div style={{ fontSize: 10, color: ETK.textMuted, paddingLeft: 4 }}>
                          +{dayEvents.length - 3} daha
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Haftalık Görünüm */
            <div style={{
              background: "white", borderRadius: 12, overflow: "hidden",
              border: `1px solid ${ETK.border}`,
            }}>
              {weekDays.map((day, idx) => {
                const dayEvents = getEventsForDate(day);
                const today = isToday(day);
                return (
                  <div key={idx} style={{
                    borderBottom: idx < 6 ? `1px solid ${ETK.border}` : "none",
                    display: "flex", minHeight: 80,
                  }}>
                    <div style={{
                      width: 80, padding: 12, borderRight: `1px solid ${ETK.border}`,
                      background: today ? "#ecfeff" : "#fafafa", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 12, color: ETK.textMuted, fontWeight: 600 }}>{DAYS_TR[idx]}</div>
                      <div style={{
                        fontSize: 24, fontWeight: 700, color: today ? ETK.primary : ETK.text,
                      }}>
                        {day.getDate()}
                      </div>
                      <div style={{ fontSize: 11, color: ETK.textMuted }}>{MONTHS_TR[day.getMonth()]}</div>
                    </div>
                    <div style={{ flex: 1, padding: 8 }}>
                      {dayEvents.length === 0 ? (
                        <div style={{ padding: 8, color: "#d1d5db", fontSize: 13 }}>Etkinlik yok</div>
                      ) : (
                        dayEvents.map((evt, i) => {
                          const cat = getCategoryInfo(evt.category);
                          return (
                            <div
                              key={i}
                              onClick={() => setSelectedEvent(evt)}
                              style={{
                                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                                background: cat.bg, borderRadius: 8, marginBottom: 6, cursor: "pointer",
                                borderLeft: `3px solid ${cat.color}`,
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: cat.color }}>{evt.title}</div>
                                <div style={{ fontSize: 12, color: ETK.textMuted, display: "flex", gap: 12, marginTop: 2 }}>
                                  {evt.time && <span><EtkIcon path={ETK_ICONS.clock} size={11} /> {evt.time}</span>}
                                  {evt.location && <span><EtkIcon path={ETK_ICONS.mapPin} size={11} /> {evt.location}</span>}
                                </div>
                              </div>
                              {!evt.isAcademic && (
                                <span style={{ fontSize: 11, color: ETK.textMuted }}>
                                  <EtkIcon path={ETK_ICONS.users} size={12} /> {evt.attendeeCount || 0}
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Kategori Legendı */}
          <div style={{
            marginTop: 16, display: "flex", flexWrap: "wrap", gap: 12,
            background: "white", borderRadius: 10, padding: 12, border: `1px solid ${ETK.border}`,
          }}>
            {EVENT_CATEGORIES.map(cat => (
              <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: cat.color }} />
                <span style={{ color: ETK.textMuted }}>{cat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ Panel: Yaklaşan Etkinlikler */}
        {showUpcoming && (
          <div style={{ width: 320, flexShrink: 0 }}>
            <div style={{
              background: "white", borderRadius: 12, padding: 16,
              border: `1px solid ${ETK.border}`, position: "sticky", top: 120,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: ETK.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <EtkIcon path={ETK_ICONS.bell} size={18} color={ETK.primary} /> Yaklaşan Etkinlikler
              </h3>
              {upcomingEvents.length === 0 ? (
                <p style={{ fontSize: 13, color: ETK.textMuted, textAlign: "center", padding: 20 }}>
                  Yaklaşan etkinlik yok
                </p>
              ) : (
                upcomingEvents.map(evt => {
                  const cat = getCategoryInfo(evt.category);
                  const evtDate = new Date(evt.date);
                  const diffDays = Math.ceil((evtDate - new Date()) / (1000 * 60 * 60 * 24));
                  return (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      style={{
                        padding: 12, borderRadius: 10, marginBottom: 8, cursor: "pointer",
                        border: `1px solid ${ETK.border}`, borderLeft: `3px solid ${cat.color}`,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = cat.bg}
                      onMouseLeave={e => e.currentTarget.style.background = "white"}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: ETK.text }}>{evt.title}</div>
                      <div style={{ fontSize: 11, color: ETK.textMuted, marginTop: 4, display: "flex", gap: 10 }}>
                        <span>{evtDate.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</span>
                        {evt.time && <span>{evt.time}</span>}
                      </div>
                      <div style={{
                        fontSize: 11, fontWeight: 600, marginTop: 4,
                        color: diffDays <= 1 ? ETK.red : diffDays <= 3 ? ETK.orange : ETK.green,
                      }}>
                        {diffDays === 0 ? "Bugün!" : diffDays === 1 ? "Yarın" : `${diffDays} gün sonra`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Etkinlik Detay Modalı */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          userId={userId}
          isAdmin={isAdmin}
          onClose={() => setSelectedEvent(null)}
          onToggleAttendance={handleToggleAttendance}
          onDelete={handleDeleteEvent}
          getCategoryInfo={getCategoryInfo}
        />
      )}

      {/* Yeni Etkinlik Modalı */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateEvent}
          categories={EVENT_CATEGORIES}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ETKİNLİK DETAY MODALI
// ══════════════════════════════════════════════════════════════
function EventDetailModal({ event, userId, isAdmin, onClose, onToggleAttendance, onDelete, getCategoryInfo }) {
  const cat = getCategoryInfo(event.category);
  const isAttending = event.attendees?.includes(userId);
  const isOwner = event.createdBy === userId;
  const canDelete = (isAdmin || isOwner) && !event.isAcademic;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "white", borderRadius: 16, width: 480, overflow: "hidden",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)", animation: "fadeInUp 0.2s ease-out",
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${cat.color}, ${cat.color}cc)`,
          padding: 24, color: "white",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{
                background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 6,
                fontSize: 12, fontWeight: 600, marginBottom: 8, display: "inline-block",
              }}>{cat.label}</span>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 6, fontFamily: "'Playfair Display', serif" }}>
                {event.title}
              </h2>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", color: "white" }}>
              <EtkIcon path={ETK_ICONS.x} size={18} color="white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
              <EtkIcon path={ETK_ICONS.calendar} size={18} color={cat.color} />
              <span style={{ fontWeight: 500 }}>{formatDate(event.date)}</span>
            </div>
            {event.time && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <EtkIcon path={ETK_ICONS.clock} size={18} color={cat.color} />
                <span>{event.time}</span>
              </div>
            )}
            {event.location && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <EtkIcon path={ETK_ICONS.mapPin} size={18} color={cat.color} />
                <span>{event.location}</span>
              </div>
            )}
            {event.description && (
              <div style={{
                padding: 14, background: "#fafafa", borderRadius: 10, fontSize: 14,
                lineHeight: 1.6, color: ETK.text, marginTop: 4,
              }}>
                {event.description}
              </div>
            )}
            {!event.isAcademic && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: ETK.textMuted }}>
                <EtkIcon path={ETK_ICONS.users} size={16} />
                <span>{event.attendeeCount || 0} kişi katılıyor</span>
                <span>· Oluşturan: {event.createdByName}</span>
              </div>
            )}
            {event.isAcademic && (
              <div style={{
                padding: "8px 14px", background: "#e0e7ff", borderRadius: 8,
                fontSize: 12, color: "#4338ca", fontWeight: 500,
              }}>
                <EtkIcon path={ETK_ICONS.info} size={14} /> Bu akademik takvimden otomatik eklenen bir etkinliktir.
              </div>
            )}
          </div>

          {/* Actions */}
          {!event.isAcademic && (
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              {canDelete && (
                <button
                  onClick={() => onDelete(event.id)}
                  style={{
                    padding: "10px 16px", border: `1px solid ${ETK.border}`, background: "white",
                    borderRadius: 8, cursor: "pointer", fontSize: 13, color: ETK.red,
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <EtkIcon path={ETK_ICONS.trash} size={14} /> Sil
                </button>
              )}
              <button
                onClick={() => onToggleAttendance(event)}
                style={{
                  padding: "10px 20px", border: "none",
                  background: isAttending ? ETK.redLight : `linear-gradient(135deg, ${ETK.primary}, ${ETK.primaryLight})`,
                  color: isAttending ? ETK.red : "white",
                  borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <EtkIcon path={isAttending ? ETK_ICONS.x : ETK_ICONS.check} size={16} color={isAttending ? ETK.red : "white"} />
                {isAttending ? "Katılımı İptal Et" : "Katılıyorum"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ETKİNLİK OLUŞTURMA MODALI
// ══════════════════════════════════════════════════════════════
function CreateEventModal({ onClose, onCreate, categories }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("diger");

  const handleSubmit = () => {
    if (!title.trim() || !date) {
      alert("Etkinlik adı ve tarih zorunludur!");
      return;
    }
    onCreate({
      title: title.trim(),
      description: description.trim(),
      date,
      time,
      location: location.trim(),
      category,
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "white", borderRadius: 16, padding: 32, width: 500,
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)", animation: "fadeInUp 0.2s ease-out",
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: ETK.text, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <EtkIcon path={ETK_ICONS.plus} size={20} color={ETK.primary} /> Yeni Etkinlik Oluştur
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Etkinlik Adı *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Etkinlik başlığı..."
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${ETK.border}`, borderRadius: 8, fontSize: 14, outline: "none" }} />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Kategori</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${ETK.border}`, borderRadius: 8, fontSize: 14, outline: "none", background: "white" }}>
              {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Tarih *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${ETK.border}`, borderRadius: 8, fontSize: 14, outline: "none" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Saat</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${ETK.border}`, borderRadius: 8, fontSize: 14, outline: "none" }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
              <EtkIcon path={ETK_ICONS.mapPin} size={14} /> Konum
            </label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Etkinlik yeri..."
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${ETK.border}`, borderRadius: 8, fontSize: 14, outline: "none" }} />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Açıklama</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Etkinlik detayları..."
              rows={3} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${ETK.border}`, borderRadius: 8, fontSize: 14, resize: "vertical", outline: "none", fontFamily: "'Source Sans 3', sans-serif" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose}
            style={{ padding: "10px 20px", border: `1px solid ${ETK.border}`, background: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, color: ETK.textMuted }}>
            İptal
          </button>
          <button onClick={handleSubmit}
            style={{ padding: "10px 24px", border: "none", background: `linear-gradient(135deg, ${ETK.primary}, ${ETK.primaryLight})`, color: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            Etkinlik Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}

// Export
window.EtkinlikTakvimiApp = EtkinlikTakvimiApp;
