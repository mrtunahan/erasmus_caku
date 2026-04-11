// ══════════════════════════════════════════════════════════════
// ÇAKÜ - Benim Sayfam (Öğrenci Profili & Ders Seçimi)
// Öğrenciler kendi bölümlerinden bu sistemde tanımlı dersleri seçerek
// ileride kullanılacak kişisel ders listelerini belirler.
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

// Shared components (window üzerinden)
const BS_C = window.C;
const BS_Btn = window.Btn;
const BS_Badge = window.Badge;
const BS_FirebaseDB = window.FirebaseDB;

const BS_SINIF_COLORS = {
  1: { bg: "#DBEAFE", text: "#1E40AF", label: "1. Sınıf" },
  2: { bg: "#DCFCE7", text: "#166534", label: "2. Sınıf" },
  3: { bg: "#FFEDD5", text: "#9A3412", label: "3. Sınıf" },
  4: { bg: "#FCE7F3", text: "#9D174D", label: "4. Sınıf" },
  5: { bg: "#EDE9FE", text: "#5B21B6", label: "Seçmeli" },
};

const BS_DONEM_LABEL = { guz: "Güz", bahar: "Bahar", yaz: "Yaz", genel: "Genel" };

function BenimSayfamApp({ currentUser, activeDepartment, departmentInfo }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [studentRecord, setStudentRecord] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterSinif, setFilterSinif] = useState("all");
  const [filterDonem, setFilterDonem] = useState("all");
  const [search, setSearch] = useState("");
  const [savedAt, setSavedAt] = useState(null);

  const isStudent = currentUser?.role === "student";
  const studentDeptId = currentUser?.departmentId || activeDepartment;

  const loadData = useCallback(async () => {
    if (!isStudent) { setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      // 1. Öğrenci kaydını yakala
      const students = await BS_FirebaseDB.fetchStudents();
      const me = students.find(s => s.studentNumber === currentUser.studentNumber);
      if (!me) {
        setError("Öğrenci kaydınız bulunamadı. Lütfen yöneticinizle iletişime geçin.");
        setLoading(false);
        return;
      }
      setStudentRecord(me);
      setSelectedIds(Array.isArray(me.myCourseIds) ? me.myCourseIds : []);

      // 2. Bölüme ait dersleri yükle
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
      setSavedAt(new Date());
      // App-shell seçim zorunluluk kilidini kaldırsın diye user state'ini güncelle
      try {
        const saved = JSON.parse(localStorage.getItem("caku_current_user") || "{}");
        saved.hasSelectedCourses = true;
        localStorage.setItem("caku_current_user", JSON.stringify(saved));
        if (typeof window.__onStudentCoursesSelected === "function") {
          window.__onStudentCoursesSelected();
        }
      } catch (_) { /* ignore */ }
      alert("Dersleriniz başarıyla kaydedildi.");
    } catch (e) {
      console.error(e);
      alert("Kaydedilemedi: " + (e.message || "bilinmeyen hata"));
    } finally {
      setSaving(false);
    }
  };

  // Sadece öğrenciler için
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

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: "#1F2937" }}>
      {/* Başlık */}
      <div style={{
        background: "linear-gradient(135deg, #1B2A4A 0%, #2D4A7A 100%)",
        padding: "24px 28px", borderRadius: 14, color: "white", marginBottom: 20,
        boxShadow: "0 6px 20px rgba(27,42,74,0.15)",
      }}>
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

      {/* Uyarı / açıklama */}
      {!hasSelected && (
        <div style={{
          background: "#FEF3C7", border: "1px solid #FCD34D", color: "#92400E",
          padding: "14px 18px", borderRadius: 10, marginBottom: 16, fontSize: 14,
        }}>
          <strong>Ders seçimi yapmanız gerekiyor.</strong> Devam edebilmek için bölümünüze ait
          derslerden aldığınız dersleri seçip kaydedin. Seçim tamamlanmadan diğer modüllere erişemezsiniz.
        </div>
      )}

      {hasSelected && savedAt && (
        <div style={{
          background: "#DCFCE7", border: "1px solid #86EFAC", color: "#166534",
          padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 14,
        }}>
          Dersleriniz kaydedildi. İstediğiniz zaman tekrar düzenleyebilirsiniz.
        </div>
      )}

      {/* Filtreler */}
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
        <select
          value={filterSinif}
          onChange={e => setFilterSinif(e.target.value)}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14 }}
        >
          <option value="all">Tüm Sınıflar</option>
          <option value="1">1. Sınıf</option>
          <option value="2">2. Sınıf</option>
          <option value="3">3. Sınıf</option>
          <option value="4">4. Sınıf</option>
          <option value="5">Seçmeli</option>
        </select>
        <select
          value={filterDonem}
          onChange={e => setFilterDonem(e.target.value)}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14 }}
        >
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

      {/* Ders listesi */}
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
                  transition: "all 0.15s",
                  position: "relative",
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

      {/* Kaydet barı */}
      <div style={{
        position: "sticky", bottom: 0, marginTop: 20,
        background: "white", border: "1px solid #E5E7EB", borderRadius: 12,
        padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 -4px 12px rgba(0,0,0,0.05)",
      }}>
        <div style={{ fontSize: 13, color: "#6B7280" }}>
          <strong style={{ color: "#1F2937" }}>{selectedIds.length}</strong> ders seçtiniz
        </div>
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
          {saving ? "Kaydediliyor…" : hasSelected ? "Dersleri Güncelle" : "Kaydet ve Devam Et"}
        </button>
      </div>
    </div>
  );
}

window.BenimSayfamApp = BenimSayfamApp;
