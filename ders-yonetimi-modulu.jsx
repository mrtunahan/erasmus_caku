// ══════════════════════════════════════════════════════════════
// ÇAKÜ Ders Yönetimi Modülü
// Sınav otomasyonu için gerekli tüm derslerin eklendiği ve yönetildiği alan
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo } = React;

// Shared bileşenlerden importlar
const C = window.C;
const Modal = window.Modal;
const Input = window.Input;
const Select = window.Select;
const FormField = window.FormField;
const Btn = window.Btn;
const Badge = window.Badge;
const FirestoreRead = window.FirestoreRead || {};
const FirestoreWrite = window.FirestoreWrite || {};

const SINIF_COLORS = {
  1: { bg: "#B2EBF2", text: "#006064", label: "1. Sınıf" },
  2: { bg: "#C8E6C9", text: "#1B5E20", label: "2. Sınıf" },
  3: { bg: "#FFE0B2", text: "#E65100", label: "3. Sınıf" },
  4: { bg: "#F8BBD0", text: "#880E4F", label: "4. Sınıf" },
  5: { bg: "#E1BEE7", text: "#4A148C", label: "Seçmeli Dersler" },
};

function DersYonetimiModuluApp({ currentUser, activeDepartment }) {
  const [courses, setCourses] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState({ code: "", name: "", sinif: 1, duration: 30, professor: "", donem: "guz" });
  const [saving, setSaving] = useState(false);
  const [filterClass, setFilterClass] = useState("all");
  const [filterTerm, setFilterTerm] = useState("all");
  const [search, setSearch] = useState("");

  const isAdmin = currentUser?.role === "admin";
  const isDeptManager = currentUser?.role === "bolum_yetkilisi";
  const hasAccess = isAdmin || isDeptManager;

  const loadData = async () => {
    setLoading(true);
    try {
      const db = window.apiFirestore;
      if (!db) throw new Error("Veritabanı API si eksik");

      // Dersleri getir (dept filter if manager)
      const coursesSnap = await db.collection("sinav_dersler").get();
      let allCourses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (activeDepartment) {
        allCourses = allCourses.filter(c => c.departmentId === activeDepartment);
      }
      setCourses(allCourses);

      // Akademisyenleri getir (dropdown için)
      const profsSnap = await db.collection("professors").get();
      let allProfs = profsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!isAdmin) {
         allProfs = allProfs.filter(p => p.departmentId === activeDepartment);
      }
      setProfessors(allProfs);
    } catch (e) {
      console.error("Ders yönetimi yüklenirken hata:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess && window.apiFirestore) {
      loadData();
    }
  }, [hasAccess, activeDepartment]);

  const startEdit = (c) => {
    setEditingCourse(c);
    setForm({ 
      code: c.code, 
      name: c.name, 
      sinif: c.sinif, 
      duration: c.duration, 
      professor: c.professor || "", 
      donem: c.donem || "guz" 
    });
  };

  const startNew = () => {
    setEditingCourse("new");
    setForm({ code: "", name: "", sinif: 1, duration: 30, professor: "", donem: "guz" });
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) return alert("Ders kodu ve adı zorunludur.");
    setSaving(true);
    try {
      const db = window.apiFirestore;
      const dataToSave = {
        code: form.code.trim(),
        name: form.name.trim(),
        sinif: parseInt(form.sinif) || 1,
        duration: parseInt(form.duration) || 30,
        professor: form.professor || "",
        donem: form.donem,
        departmentId: activeDepartment || "bilgisayar",
        updatedAt: window.firebase?.firestore?.FieldValue?.serverTimestamp() || new Date()
      };

      if (editingCourse === "new") {
        dataToSave.studentCount = 0; // default for new course
        dataToSave.createdAt = dataToSave.updatedAt;
        await db.collection("sinav_dersler").add(dataToSave);
      } else {
        await db.collection("sinav_dersler").doc(editingCourse.id).set(dataToSave, { merge: true });
      }

      setEditingCourse(null);
      await loadData(); // Reload table
    } catch (e) {
      console.error(e);
      alert("Ders kaydedilemedi: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`${c.code} kodlu ${c.name} dersini silmek istediğinize emin misiniz?`)) return;
    try {
      const db = window.apiFirestore;
      await db.collection("sinav_dersler").doc(c.id).delete();
      setCourses(courses.filter(course => course.id !== c.id));
    } catch (e) {
      console.error(e);
      alert("Silme başarısız: " + e.message);
    }
  };

  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      if (filterClass !== "all" && c.sinif.toString() !== filterClass) return false;
      if (filterTerm !== "all" && c.donem !== filterTerm) return false;
      if (search && !c.code.toLowerCase().includes(search.toLowerCase()) && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a,b) => {
      if (a.sinif !== b.sinif) return a.sinif - b.sinif;
      return a.code.localeCompare(b.code);
    });
  }, [courses, filterClass, filterTerm, search]);

  if (!hasAccess) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: "#DC2626" }}>Erişim Reddedildi</h2>
        <p>Bu modüle sadece Fakülte Yöneticisi veya Bölüm Yetkilileri erişebilir.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1B2A4A", margin: 0 }}>Ders Yönetimi</h1>
          <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>Bölüme ait derslerin programı, hocası ve temel tanımlamaları</p>
        </div>
        <Btn onClick={startNew}>+ Yeni Ders Tanımla</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid #E5E7EB", display: "flex",flexDirection:"column", gap:8}}>
          <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 600 }}>Tümü</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1B2A4A" }}>{courses.length}</div>
        </div>
        <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid #E5E7EB", display: "flex",flexDirection:"column", gap:8}}>
          <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 600 }}>Güz Dönemi</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#0D47A1" }}>{courses.filter(c => c.donem === "guz").length}</div>
        </div>
        <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid #E5E7EB", display: "flex",flexDirection:"column", gap:8}}>
          <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 600 }}>Bahar Dönemi</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1B5E20" }}>{courses.filter(c => c.donem === "bahar").length}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center" }}>Yükleniyor...</div>
      ) : (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
          
          <div style={{ padding: 16, borderBottom: "1px solid #E5E7EB", display: "flex", gap: 12, background: "#F9FAFB", flexWrap: "wrap" }}>
            <Input 
              placeholder="Ders kodu veya adı ile ara..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ flex: 1, minWidth: 200 }} 
            />
            <Select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ width: 140 }}>
              <option value="all">Tüm Sınıflar</option>
              <option value="1">1. Sınıf</option>
              <option value="2">2. Sınıf</option>
              <option value="3">3. Sınıf</option>
              <option value="4">4. Sınıf</option>
              <option value="5">Seçmeli</option>
            </Select>
            <Select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} style={{ width: 140 }}>
              <option value="all">Tüm Dönemler</option>
              <option value="guz">Güz</option>
              <option value="bahar">Bahar</option>
            </Select>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 }}>
              <thead>
                <tr style={{ background: "white" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: `2px solid ${C.border}`, color:"#374151" }}>Kod</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: `2px solid ${C.border}`, color:"#374151" }}>Ders Adı</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: `2px solid ${C.border}`, color:"#374151" }}>Sınıf</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: `2px solid ${C.border}`, color:"#374151" }}>Dönem</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: `2px solid ${C.border}`, color:"#374151" }}>Süre</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: `2px solid ${C.border}`, color:"#374151" }}>Akademisyen</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: `2px solid ${C.border}`, color:"#374151" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #E5E7EB" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <Badge style={{ background: SINIF_COLORS[c.sinif]?.bg, color: SINIF_COLORS[c.sinif]?.text }}>{c.code}</Badge>
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>{c.sinif === 5 ? "Seçmeli" : `${c.sinif}. Sınıf`}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <Badge style={{ background: c.donem === "bahar" ? "#C8E6C9" : "#BBDEFB", color: c.donem === "bahar" ? "#1B5E20" : "#0D47A1", fontSize: 11 }}>
                        {c.donem === "bahar" ? "Bahar" : "Güz"}
                      </Badge>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>{c.duration} dk</td>
                    <td style={{ padding: "12px 16px", fontSize: 12 }}>{c.professor || <span style={{color:"#9CA3AF"}}>Bilinmiyor</span>}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                        <button onClick={() => startEdit(c)} style={{ background: "none", border: "none", color: "#6366F1", cursor: "pointer", fontSize: 13, fontWeight:600 }}>Düzenle</button>
                        <button onClick={() => handleDelete(c)} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 13, fontWeight:600 }}>Sil</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCourses.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#6B7280" }}>Aradığınız kritere uygun ders bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ders Düzenle/Ekle Modal */}
      {editingCourse && (
        <Modal open={true} title={editingCourse === "new" ? "Yeni Ders Tanımla" : "Ders Bilgilerini Düzenle"} onClose={() => setEditingCourse(null)} width={600}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
              <FormField label="Ders Kodu">
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Örn: BİL101" />
              </FormField>
              <FormField label="Ders Adı">
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Örn: Algoritmalara Giriş" />
              </FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormField label="Sınıf">
                <Select value={form.sinif} onChange={e => setForm({ ...form, sinif: parseInt(e.target.value) })}>
                  {[1, 2, 3, 4, 5].map(s => <option key={s} value={s}>{s === 5 ? "Seçmeli" : `${s}. Sınıf`}</option>)}
                </Select>
              </FormField>
              <FormField label="Dönem">
                <Select value={form.donem} onChange={e => setForm({ ...form, donem: e.target.value })}>
                  <option value="guz">Güz</option>
                  <option value="bahar">Bahar</option>
                </Select>
              </FormField> 
              <FormField label="Sınav Süresi (dk)">
                <Select value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })}>
                  {[30, 45, 60, 75, 90, 105, 120, 150].map(d => <option key={d} value={d}>{d} dk</option>)}
                </Select>
              </FormField>
              <FormField label="İlgili Akademisyen">
                <Input
                  value={form.professor}
                  onChange={e => setForm({ ...form, professor: e.target.value })}
                  placeholder="İsim yazın veya seçin..."
                  list="course-prof-lookup"
                />
                <datalist id="course-prof-lookup">
                  {professors.map((p, i) => <option key={i} value={p.name} />)}
                </datalist>
              </FormField>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button 
                onClick={() => setEditingCourse(null)} 
                style={{ padding: "10px 16px", background: "white", border: "1px solid #D1D5DB", borderRadius: 8, cursor:"pointer" }}>
                İptal
              </button>
              <Btn onClick={handleSave} disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Btn>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

window.DersYonetimiModuluApp = DersYonetimiModuluApp;
