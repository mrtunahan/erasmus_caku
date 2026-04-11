// ══════════════════════════════════════════════════════════════
// ÇAKÜ - Benim Sayfam
//   • Öğrenci henüz ders seçmemişse → ders seçim ekranı
//   • Seçim tamamlandıktan sonra → kendi dersleri + bildirimler
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const BS_FirebaseDB = window.FirebaseDB;
const BS_Notifier = window.StudentNotifier;

const BS_SINIF_COLORS = {
  1: { bg: "#DBEAFE", text: "#1E40AF", label: "1. Sınıf" },
  2: { bg: "#DCFCE7", text: "#166534", label: "2. Sınıf" },
  3: { bg: "#FFEDD5", text: "#9A3412", label: "3. Sınıf" },
  4: { bg: "#FCE7F3", text: "#9D174D", label: "4. Sınıf" },
  5: { bg: "#EDE9FE", text: "#5B21B6", label: "Seçmeli" },
};

const BS_DONEM_LABEL = { guz: "Güz", bahar: "Bahar", yaz: "Yaz", genel: "Genel" };

function bsTimeAgo(iso) {
  if (!iso) return "";
  try {
    var d = new Date(iso);
    var diff = Date.now() - d.getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return "Az önce";
    if (mins < 60) return mins + " dk önce";
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + " saat önce";
    var days = Math.floor(hours / 24);
    if (days < 30) return days + " gün önce";
    return d.toLocaleDateString("tr-TR");
  } catch (_) { return ""; }
}

function BenimSayfamApp({ currentUser, activeDepartment, departmentInfo }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [studentRecord, setStudentRecord] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [filterSinif, setFilterSinif] = useState("all");
  const [filterDonem, setFilterDonem] = useState("all");
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const isStudent = currentUser?.role === "student";
  const studentDeptId = currentUser?.departmentId || activeDepartment;

  const loadData = useCallback(async () => {
    if (!isStudent) { setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const students = await BS_FirebaseDB.fetchStudents();
      const me = students.find(s => s.studentNumber === currentUser.studentNumber);
      if (!me) {
        setError("Öğrenci kaydınız bulunamadı. Lütfen yöneticinizle iletişime geçin.");
        setLoading(false);
        return;
      }
      setStudentRecord(me);
      const myIds = Array.isArray(me.myCourseIds) ? me.myCourseIds : [];
      setSelectedIds(myIds);
      // Daha önce seçim yapmadıysa otomatik düzenleme moduna gir
      setEditMode(myIds.length === 0);

      const db = window.apiFirestore;
      const snap = await db.collection("sinav_dersler").get();
      const all = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
      const mine = all.filter(c => c.departmentId === studentDeptId);
      setAllCourses(mine);
    } catch (e) {
      console.error("Benim Sayfam yüklenirken hata:", e);
      setError("Veriler yüklenemedi: " + (e.message || "bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.studentNumber, studentDeptId, isStudent]);

  useEffect(() => { loadData(); }, [loadData]);

  // Bildirimleri yükle (yalnızca seçim tamamlanmışsa anlamlı)
  const loadNotifications = useCallback(async () => {
    if (!isStudent || !currentUser?.studentNumber) return;
    setNotifLoading(true);
    try {
      const items = await BS_Notifier.fetchForStudent(currentUser.studentNumber, 30);
      setNotifications(items);
    } catch (e) {
      console.warn("Bildirimler alınamadı:", e);
    } finally {
      setNotifLoading(false);
    }
  }, [isStudent, currentUser?.studentNumber]);

  useEffect(() => {
    if (!editMode && selectedIds.length > 0) loadNotifications();
  }, [editMode, selectedIds.length, loadNotifications]);

  const myCourseDetails = useMemo(() => {
    const map = new Map(allCourses.map(c => [c.id, c]));
    return selectedIds.map(id => map.get(id)).filter(Boolean);
  }, [allCourses, selectedIds]);

  const filteredCourses = useMemo(() => {
    return allCourses.filter(c => {
      if (filterSinif !== "all" && String(c.sinif) !== String(filterSinif)) return false;
      if (filterDonem !== "all" && c.donem !== filterDonem) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${c.code || ""} ${c.name || ""} ${c.professor || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const sa = parseInt(a.sinif) || 99;
      const sb = parseInt(b.sinif) || 99;
      if (sa !== sb) return sa - sb;
      return (a.code || "").localeCompare(b.code || "");
    });
  }, [allCourses, filterSinif, filterDonem, search]);

  const toggleCourse = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!studentRecord) return;
    if (selectedIds.length === 0) {
      alert("En az bir ders seçmelisiniz.");
      return;
    }
    setSaving(true);
    try {
      const updated = Object.assign({}, studentRecord, {
        myCourseIds: selectedIds,
        myCoursesUpdatedAt: new Date().toISOString(),
      });
      await BS_FirebaseDB.updateStudent(studentRecord.id, updated);
      setStudentRecord(updated);
      try {
        const saved = JSON.parse(localStorage.getItem("caku_current_user") || "{}");
        saved.hasSelectedCourses = true;
        localStorage.setItem("caku_current_user", JSON.stringify(saved));
        if (typeof window.__onStudentCoursesSelected === "function") {
          window.__onStudentCoursesSelected();
        }
      } catch (_) { /* ignore */ }
      setEditMode(false);
    } catch (e) {
      console.error(e);
      alert("Kaydedilemedi: " + (e.message || "bilinmeyen hata"));
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser?.studentNumber) return;
    try {
      await BS_Notifier.markAllRead(currentUser.studentNumber);
      setNotifications(prev => prev.map(n => Object.assign({}, n, { read: true })));
    } catch (_) {}
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n.read) {
        await BS_Notifier.markRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? Object.assign({}, x, { read: true }) : x));
      }
    } catch (_) {}
    if (n.link && typeof n.link === "string") {
      window.location.hash = "#" + n.link.replace(/^#/, "");
    }
  };

  if (!isStudent) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: "#DC2626", fontSize: 22, marginBottom: 8 }}>Erişim Reddedildi</h2>
        <p style={{ color: "#6B7280" }}>Bu sayfa yalnızca öğrenci hesaplarına açıktır.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", fontFamily: "'Inter', sans-serif" }}>
        <div style={{
          width: 40, height: 40, margin: "0 auto 16px",
          border: "3px solid #E5E7EB", borderTopColor: "#6366F1",
          borderRadius: "50%", animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ color: "#6B7280" }}>Sayfa yükleniyor…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "'Inter', sans-serif" }}>
        <h3 style={{ color: "#DC2626", marginBottom: 8 }}>Hata</h3>
        <p style={{ color: "#6B7280" }}>{error}</p>
      </div>
    );
  }

  const hasSelected = Array.isArray(studentRecord?.myCourseIds) && studentRecord.myCourseIds.length > 0;
  const deptName = departmentInfo?.name || studentRecord?.departmentName || "—";
  const unreadCount = notifications.filter(n => !n.read).length;

  // ══════════════════════════════════════════════════════════════
  // SEÇİM MODU
  // ══════════════════════════════════════════════════════════════
  if (editMode) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", color: "#1F2937" }}>
        <div style={{
          background: "linear-gradient(135deg, #1B2A4A 0%, #2D4A7A 100%)",
          padding: "24px 28px", borderRadius: 14, color: "white", marginBottom: 20,
          boxShadow: "0 6px 20px rgba(27,42,74,0.15)",
        }}>
          <div style={{ fontSize: 12, opacity: 0.75, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Benim Sayfam · Ders Seçimi
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
            {studentRecord?.firstName} {studentRecord?.lastName}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>
            {studentRecord?.studentNumber} · {deptName}
          </div>
        </div>

        {!hasSelected ? (
          <div style={{
            background: "#FEF3C7", border: "1px solid #FCD34D", color: "#92400E",
            padding: "14px 18px", borderRadius: 10, marginBottom: 16, fontSize: 14,
          }}>
            <strong>Ders seçimi yapmanız gerekiyor.</strong> Bölümünüze ait derslerden aldığınız
            dersleri seçip kaydedin. Seçim tamamlanmadan diğer modüllere erişemezsiniz.
          </div>
        ) : (
          <div style={{
            background: "#EEF2FF", border: "1px solid #C7D2FE", color: "#3730A3",
            padding: "14px 18px", borderRadius: 10, marginBottom: 16, fontSize: 14,
          }}>
            Seçimlerinizi güncelliyorsunuz. Değişiklikleri kaydetmeden ayrılırsanız
            eski seçimleriniz korunur.
          </div>
        )}

        <div style={{
          background: "white", border: "1px solid #E5E7EB", borderRadius: 12,
          padding: 16, marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
        }}>
          <input
            type="text"
            placeholder="Ders kodu, adı veya akademisyen ara…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: "1 1 240px", padding: "10px 12px", borderRadius: 8,
              border: "1px solid #D1D5DB", fontSize: 14, fontFamily: "inherit",
            }}
          />
          <select value={filterSinif} onChange={e => setFilterSinif(e.target.value)}
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14 }}>
            <option value="all">Tüm Sınıflar</option>
            <option value="1">1. Sınıf</option>
            <option value="2">2. Sınıf</option>
            <option value="3">3. Sınıf</option>
            <option value="4">4. Sınıf</option>
            <option value="5">Seçmeli</option>
          </select>
          <select value={filterDonem} onChange={e => setFilterDonem(e.target.value)}
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14 }}>
            <option value="all">Tüm Dönemler</option>
            <option value="guz">Güz</option>
            <option value="bahar">Bahar</option>
            <option value="yaz">Yaz</option>
          </select>
          <div style={{
            padding: "8px 14px", borderRadius: 999, background: "#EEF2FF",
            color: "#4338CA", fontSize: 13, fontWeight: 600,
          }}>
            Seçili: {selectedIds.length}
          </div>
        </div>

        {allCourses.length === 0 ? (
          <div style={{
            background: "white", border: "1px dashed #D1D5DB", borderRadius: 12,
            padding: "40px 24px", textAlign: "center", color: "#6B7280",
          }}>
            <p style={{ fontSize: 15, marginBottom: 4 }}>
              Bölümünüze tanımlı ders bulunamadı.
            </p>
            <p style={{ fontSize: 13 }}>
              Akademisyenler ders tanımladıktan sonra bu sayfadan seçim yapabilirsiniz.
            </p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div style={{
            background: "white", border: "1px solid #E5E7EB", borderRadius: 12,
            padding: 32, textAlign: "center", color: "#6B7280",
          }}>
            Filtrelere uyan ders bulunamadı.
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}>
            {filteredCourses.map(c => {
              const isSelected = selectedIds.includes(c.id);
              const sinifInfo = BS_SINIF_COLORS[c.sinif] || BS_SINIF_COLORS[5];
              return (
                <div
                  key={c.id}
                  onClick={() => toggleCourse(c.id)}
                  style={{
                    background: isSelected ? "#EEF2FF" : "white",
                    border: `2px solid ${isSelected ? "#6366F1" : "#E5E7EB"}`,
                    borderRadius: 12, padding: 14, cursor: "pointer",
                    transition: "all 0.15s", position: "relative",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{
                      padding: "3px 10px", borderRadius: 999,
                      background: sinifInfo.bg, color: sinifInfo.text,
                      fontSize: 11, fontWeight: 600,
                    }}>
                      {sinifInfo.label}
                    </div>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      border: `2px solid ${isSelected ? "#6366F1" : "#D1D5DB"}`,
                      background: isSelected ? "#6366F1" : "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#4338CA", marginBottom: 2 }}>
                    {c.code}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1F2937", marginBottom: 6, lineHeight: 1.3 }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>
                    {c.professor || "Akademisyen belirtilmemiş"}
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                    Dönem: {BS_DONEM_LABEL[c.donem] || c.donem || "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{
          position: "sticky", bottom: 0, marginTop: 20,
          background: "white", border: "1px solid #E5E7EB", borderRadius: 12,
          padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: "0 -4px 12px rgba(0,0,0,0.05)", gap: 10, flexWrap: "wrap",
        }}>
          <div style={{ fontSize: 13, color: "#6B7280" }}>
            <strong style={{ color: "#1F2937" }}>{selectedIds.length}</strong> ders seçtiniz
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {hasSelected && (
              <button
                onClick={() => {
                  // Orijinal seçime geri dön
                  setSelectedIds(Array.isArray(studentRecord?.myCourseIds) ? studentRecord.myCourseIds : []);
                  setEditMode(false);
                }}
                disabled={saving}
                style={{
                  padding: "10px 18px", borderRadius: 8,
                  background: "white", color: "#4B5563",
                  border: "1px solid #D1D5DB", fontWeight: 600, fontSize: 14,
                  cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
                }}
              >
                İptal
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || selectedIds.length === 0}
              style={{
                padding: "10px 22px", borderRadius: 8,
                background: saving || selectedIds.length === 0 ? "#9CA3AF" : "#1B2A4A",
                color: "white", border: "none", fontWeight: 600, fontSize: 14,
                cursor: saving || selectedIds.length === 0 ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {saving ? "Kaydediliyor…" : hasSelected ? "Güncelle" : "Kaydet ve Devam Et"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // GÖSTERİM MODU (Ders listesi + bildirimler)
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: "#1F2937" }}>
      <div style={{
        background: "linear-gradient(135deg, #1B2A4A 0%, #2D4A7A 100%)",
        padding: "24px 28px", borderRadius: 14, color: "white", marginBottom: 20,
        boxShadow: "0 6px 20px rgba(27,42,74,0.15)",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.75, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Benim Sayfam
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
            {studentRecord?.firstName} {studentRecord?.lastName}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>
            {studentRecord?.studentNumber} · {deptName}
          </div>
        </div>
        <button
          onClick={() => setEditMode(true)}
          style={{
            background: "rgba(255,255,255,0.15)", color: "white",
            border: "1px solid rgba(255,255,255,0.35)", padding: "10px 18px",
            borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit", backdropFilter: "blur(4px)",
          }}
        >
          Dersleri Düzenle
        </button>
      </div>

      {/* Bildirimler */}
      <div style={{
        background: "white", border: "1px solid #E5E7EB", borderRadius: 14,
        padding: 18, marginBottom: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4338CA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1F2937" }}>Bildirimler</div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>
                {unreadCount > 0 ? `${unreadCount} okunmamış` : "Tüm bildirimler okundu"}
              </div>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                background: "white", border: "1px solid #D1D5DB",
                padding: "6px 12px", borderRadius: 8, fontSize: 12,
                cursor: "pointer", fontFamily: "inherit", color: "#4B5563",
              }}
            >
              Tümünü okundu işaretle
            </button>
          )}
        </div>

        {notifLoading ? (
          <p style={{ color: "#6B7280", fontSize: 13, textAlign: "center", padding: 16 }}>
            Bildirimler yükleniyor…
          </p>
        ) : notifications.length === 0 ? (
          <p style={{ color: "#6B7280", fontSize: 13, textAlign: "center", padding: 16 }}>
            Henüz bir bildiriminiz yok.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notifications.slice(0, 10).map(n => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  display: "flex", gap: 12, alignItems: "flex-start",
                  padding: 12, borderRadius: 10, cursor: "pointer",
                  background: n.read ? "#F9FAFB" : "#EEF2FF",
                  border: `1px solid ${n.read ? "#E5E7EB" : "#C7D2FE"}`,
                  transition: "all 0.15s",
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: n.type === "project_group" ? "#DBEAFE" : "#FCE7F3",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: n.type === "project_group" ? "#1E40AF" : "#9D174D",
                }}>
                  {n.type === "project_group" ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 11l18-8-5 18-3-7-7-3z" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1F2937", marginBottom: 2 }}>
                    {n.title || "Bildirim"}
                  </div>
                  <div style={{ fontSize: 13, color: "#4B5563", lineHeight: 1.4 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                    {bsTimeAgo(n.createdAt)}
                  </div>
                </div>
                {!n.read && (
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: "#6366F1", flexShrink: 0, marginTop: 8,
                  }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ders listesi */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1F2937" }}>
          Derslerim ({myCourseDetails.length})
        </div>
      </div>
      {myCourseDetails.length === 0 ? (
        <div style={{
          background: "white", border: "1px dashed #D1D5DB", borderRadius: 12,
          padding: "40px 24px", textAlign: "center", color: "#6B7280",
        }}>
          Kayıtlı dersiniz bulunmuyor. "Dersleri Düzenle" butonuna tıklayarak dersleri seçin.
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
        }}>
          {myCourseDetails.map(c => {
            const sinifInfo = BS_SINIF_COLORS[c.sinif] || BS_SINIF_COLORS[5];
            return (
              <div
                key={c.id}
                style={{
                  background: "white",
                  border: "1px solid #E5E7EB",
                  borderLeft: "4px solid #6366F1",
                  borderRadius: 12, padding: 14,
                }}
              >
                <div style={{
                  display: "inline-block",
                  padding: "3px 10px", borderRadius: 999,
                  background: sinifInfo.bg, color: sinifInfo.text,
                  fontSize: 11, fontWeight: 600, marginBottom: 8,
                }}>
                  {sinifInfo.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#4338CA", marginBottom: 2 }}>
                  {c.code}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1F2937", marginBottom: 6, lineHeight: 1.3 }}>
                  {c.name}
                </div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>
                  {c.professor || "Akademisyen belirtilmemiş"}
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                  Dönem: {BS_DONEM_LABEL[c.donem] || c.donem || "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

window.BenimSayfamApp = BenimSayfamApp;
