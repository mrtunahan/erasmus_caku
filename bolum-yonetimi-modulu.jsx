// ══════════════════════════════════════════════════════════════
// ÇAKÜ Bölüm Yönetimi Modülü
// Bölümler, Sınıf/Salonlar ve Gözetmenlerin tanımlandığı ortak alan
// Gözetmenler artık professors koleksiyonunda roles:["gozetmen"] ile yönetilir
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo } = React;

const C = window.C;
const Modal = window.Modal;
const Input = window.Input;
const FormField = window.FormField;
const Btn = window.Btn;
const DBWrite = window.DBWrite || {};

function BolumYonetimiModuluApp({ currentUser, activeDepartment }) {
  const isAdmin = currentUser?.role === "admin";
  const isDeptManager = currentUser?.role === "bolum_yetkilisi";
  const hasAccess = isAdmin || isDeptManager;

  const [activeTab, setActiveTab] = useState(isAdmin ? "departments" : "classrooms");

  const [departments, setDepartments] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Gözetmenler = professors koleksiyonunda roles'ında "gozetmen" olanlar
  const supervisors = useMemo(() => {
    return professors.filter(p => (p.roles || []).includes("gozetmen"));
  }, [professors]);

  // Gözetmen olmayan profesörler (gözetmen eklerken seçim listesi)
  const nonSupervisorProfs = useMemo(() => {
    return professors.filter(p => !(p.roles || []).includes("gozetmen"));
  }, [professors]);

  // Veri yükleme — direkt MongoDB API
  const loadData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const depts = await window.apiRead("departments", {});
        setDepartments(depts.map(d => ({ id: d.id, ...d })));
      }

      // Derslikler (bölüm bazlı)
      const cls = await window.apiRead("department_classrooms", { where: `departmentId:eq:${activeDepartment}` });
      setClassrooms(cls.map(d => ({ id: d.id, ...d })));

      // Profesörler (bölüm bazlı) — gözetmenler bunlardan filtrelenir
      const profs = await window.apiRead("professors", { where: `departmentId:eq:${activeDepartment}` });
      setProfessors(profs.map(d => ({ id: d.id, ...d })));

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) loadData();
  }, [hasAccess, activeDepartment]);


  // ── Bölüm Yönetimi (Admin Only) ──
  const startDeptEdit = (d) => { setEditingItem(d || "new"); setForm({ name: d?.name || "", managerName: d?.managerName || "" }); };
  const handleDeptSave = async () => {
    if (!form.name.trim()) return alert("Bölüm adı gerekli");
    setSaving(true);
    try {
      const data = { name: form.name.trim(), managerName: form.managerName.trim() };
      if (editingItem === "new") {
        await DBWrite.add("departments", data);
      } else {
        await DBWrite.set("departments", editingItem.id, data, true);
      }
      setEditingItem(null);
      loadData();
    } catch(e) { alert("Hata: " + e.message); }
    setSaving(false);
  };
  const handleDeptDelete = async (d) => {
    if (!confirm(`${d.name} silinecek, emin misiniz?`)) return;
    await DBWrite.remove("departments", d.id);
    setDepartments(departments.filter(x => x.id !== d.id));
  };


  // ── Sınıf/Salon Yönetimi ──
  const startClassEdit = (c) => { setEditingItem(c || "new"); setForm({ name: c?.name || "", capacity: c?.capacity || "" }); };
  const handleClassSave = async () => {
    if (!form.name.trim()) return alert("Salon adı gerekli");
    setSaving(true);
    try {
      const data = { name: form.name.trim(), capacity: parseInt(form.capacity) || 0, departmentId: activeDepartment };
      if (editingItem === "new") {
        await DBWrite.add("department_classrooms", data);
      } else {
        await DBWrite.set("department_classrooms", editingItem.id, data, true);
      }
      setEditingItem(null);
      loadData();
    } catch(e) { alert("Hata: " + e.message); }
    setSaving(false);
  };
  const handleClassDelete = async (c) => {
    if (!confirm(`${c.name} silinecek, emin misiniz?`)) return;
    await DBWrite.remove("department_classrooms", c.id);
    setClassrooms(classrooms.filter(x => x.id !== c.id));
  };


  // ── Gözetmen Yönetimi (professors koleksiyonu üzerinden) ──
  const startSupAdd = () => {
    setEditingItem("new_sup");
    setForm({ selectedProfId: "", newName: "" });
  };
  const startSupEdit = (s) => {
    setEditingItem(s);
    setForm({ name: s.name });
  };

  const handleSupSave = async () => {
    setSaving(true);
    try {
      if (editingItem === "new_sup") {
        if (form.selectedProfId) {
          // Mevcut profesöre gozetmen rolü ekle
          const prof = professors.find(p => p.id === form.selectedProfId);
          if (prof) {
            const roles = [...new Set([...(prof.roles || []), "gozetmen"])];
            await DBWrite.update("professors", prof.id, { roles });
          }
        } else if (form.newName.trim()) {
          // Yeni profesör oluştur ve gozetmen rolü ver
          await DBWrite.add("professors", {
            name: form.newName.trim(),
            departmentId: activeDepartment,
            isExternal: false,
            roles: ["gozetmen"],
            createdAt: new Date().toISOString(),
          });
        } else {
          alert("Bir akademisyen seçin veya yeni isim girin");
          setSaving(false);
          return;
        }
      } else {
        // Düzenleme — isim güncelle
        await DBWrite.update("professors", editingItem.id, { name: form.name.trim() });
      }
      setEditingItem(null);
      await loadData();
    } catch(e) { alert("Hata: " + e.message); }
    setSaving(false);
  };

  const handleSupRemoveRole = async (s) => {
    if (!confirm(`${s.name} gözetmenlikten çıkarılacak. Akademisyen kaydı silinmez. Emin misiniz?`)) return;
    try {
      const roles = (s.roles || []).filter(r => r !== "gozetmen");
      await DBWrite.update("professors", s.id, { roles });
      await loadData();
    } catch(e) { alert("Hata: " + e.message); }
  };


  if (!hasAccess) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: "#DC2626" }}>Erişim Reddedildi</h2>
      </div>
    );
  }

  const GhostBtn = ({ children, onClick, style }) => (
    <button onClick={onClick} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: 13, fontWeight: 600, ...style }}>{children}</button>
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1B2A4A", margin: 0 }}>Bölüm Yönetimi</h1>
          <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>Bölüme ait derslikler, gözetmenler ve hiyerarşi</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 16, borderBottom: "1px solid #E5E7EB", marginBottom: 24 }}>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("departments")}
            style={{ padding: "12px 16px", background: "none", border: "none", borderBottom: activeTab === "departments" ? `2px solid ${C.blue}` : "2px solid transparent", color: activeTab === "departments" ? C.blue : "#6B7280", fontWeight: activeTab === "departments" ? 600 : 500, cursor: "pointer", fontSize: 14 }}
          >Fakülte Bölümleri</button>
        )}
        <button
          onClick={() => setActiveTab("classrooms")}
          style={{ padding: "12px 16px", background: "none", border: "none", borderBottom: activeTab === "classrooms" ? `2px solid ${C.blue}` : "2px solid transparent", color: activeTab === "classrooms" ? C.blue : "#6B7280", fontWeight: activeTab === "classrooms" ? 600 : 500, cursor: "pointer", fontSize: 14 }}
        >Sınıf/Salon Tanımları</button>
        <button
          onClick={() => setActiveTab("supervisors")}
          style={{ padding: "12px 16px", background: "none", border: "none", borderBottom: activeTab === "supervisors" ? `2px solid ${C.blue}` : "2px solid transparent", color: activeTab === "supervisors" ? C.blue : "#6B7280", fontWeight: activeTab === "supervisors" ? 600 : 500, cursor: "pointer", fontSize: 14 }}
        >Gözetmen Akademisyenler</button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center" }}>Yükleniyor...</div>
      ) : (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>

            {/* DEPARTMENTS TAB (ADMIN) */}
            {activeTab === "departments" && isAdmin && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ background: "#F9FAFB" }}>
                  <tr>
                    <th style={{ padding: "12px 16px", textAlign: "left", color:"#374151" }}>Bölüm Adı</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", color:"#374151" }}>Yetkili Kişi</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", color:"#374151", width: 120 }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map(d => (
                    <tr key={d.id} style={{ borderBottom: "1px solid #E5E7EB" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 500 }}>{d.name}</td>
                      <td style={{ padding: "12px 16px" }}>{d.managerName || <span style={{ color: "#9CA3AF" }}>Atanmadı</span>}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                          <GhostBtn onClick={() => startDeptEdit(d)}>Düzenle</GhostBtn>
                          <GhostBtn onClick={() => handleDeptDelete(d)} style={{color: "#DC2626"}}>Sil</GhostBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} style={{ padding: "12px 16px", textAlign: "right", background:"#F9FAFB" }}>
                      <Btn onClick={() => startDeptEdit()}>+ Yeni Bölüm Tanımla</Btn>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* CLASSROOMS TAB */}
            {activeTab === "classrooms" && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ background: "#F9FAFB" }}>
                  <tr>
                    <th style={{ padding: "12px 16px", textAlign: "left", color:"#374151" }}>Sınıf/Salon Adı</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", color:"#374151" }}>Kapasite</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", color:"#374151", width: 120 }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {classrooms.map(c => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #E5E7EB" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 500 }}>{c.name}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>{c.capacity || "-"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                          <GhostBtn onClick={() => startClassEdit(c)}>Düzenle</GhostBtn>
                          <GhostBtn onClick={() => handleClassDelete(c)} style={{color: "#DC2626"}}>Sil</GhostBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} style={{ padding: "12px 16px", textAlign: "right", background:"#F9FAFB" }}>
                      <Btn onClick={() => startClassEdit()}>+ Yeni Sınıf Ekle</Btn>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* SUPERVISORS TAB — professors koleksiyonundan roles:gozetmen */}
            {activeTab === "supervisors" && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ background: "#F9FAFB" }}>
                  <tr>
                    <th style={{ padding: "12px 16px", textAlign: "left", color:"#374151" }}>Gözetmen Akademisyen</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", color:"#374151", width: 150 }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {supervisors.map(s => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #E5E7EB" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 500 }}>{s.name}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                          <GhostBtn onClick={() => startSupEdit(s)}>Düzenle</GhostBtn>
                          <GhostBtn onClick={() => handleSupRemoveRole(s)} style={{color: "#DC2626"}}>Çıkar</GhostBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {supervisors.length === 0 && (
                    <tr><td colSpan={2} style={{ padding: 24, textAlign: "center", color: "#9CA3AF" }}>Henüz gözetmen atanmamış</td></tr>
                  )}
                  <tr>
                    <td colSpan={2} style={{ padding: "12px 16px", background:"#F9FAFB" }}>
                      <Btn onClick={startSupAdd}>+ Yeni Gözetmen Ekle</Btn>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

          </div>
        </div>
      )}

      {/* Bölüm Modal */}
      {editingItem && activeTab === "departments" && (
        <Modal open={true} title={editingItem === "new" ? "Yeni Bölüm" : "Bölüm Düzenle"} onClose={() => setEditingItem(null)} width={400}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FormField label="Bölüm Adı"><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></FormField>
            <FormField label="Yetkili Kişi (Ad Soyad)"><Input value={form.managerName} onChange={e => setForm({...form, managerName: e.target.value})} /></FormField>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><GhostBtn onClick={() => setEditingItem(null)} style={{color:"#6B7280"}}>İptal</GhostBtn><Btn onClick={handleDeptSave} disabled={saving}>Kaydet</Btn></div>
          </div>
        </Modal>
      )}

      {/* Sınıf/Salon Modal */}
      {editingItem && activeTab === "classrooms" && (
        <Modal open={true} title={editingItem === "new" ? "Yeni Sınıf/Salon" : "Sınıf/Salon Düzenle"} onClose={() => setEditingItem(null)} width={400}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FormField label="Sınıf/Salon Adı"><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></FormField>
            <FormField label="Kapasite (Kişi)"><Input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} /></FormField>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><GhostBtn onClick={() => setEditingItem(null)} style={{color:"#6B7280"}}>İptal</GhostBtn><Btn onClick={handleClassSave} disabled={saving}>Kaydet</Btn></div>
          </div>
        </Modal>
      )}

      {/* Gözetmen Ekleme Modal — mevcut profesörden seç veya yeni ekle */}
      {editingItem === "new_sup" && activeTab === "supervisors" && (
        <Modal open={true} title="Gözetmen Ekle" onClose={() => setEditingItem(null)} width={450}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Mevcut bir akademisyeni gözetmen olarak atayabilir veya yeni bir isim girebilirsiniz.</p>

            {nonSupervisorProfs.length > 0 && (
              <FormField label="Mevcut Akademisyenden Seç">
                <select
                  value={form.selectedProfId}
                  onChange={e => setForm({...form, selectedProfId: e.target.value, newName: ""})}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13 }}
                >
                  <option value="">— Seçim yapın —</option>
                  {nonSupervisorProfs.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </FormField>
            )}

            <div style={{ textAlign: "center", fontSize: 12, color: "#9CA3AF" }}>veya</div>

            <FormField label="Yeni Akademisyen Adı (Unvan+Ad+Soyad)">
              <Input
                value={form.newName}
                onChange={e => setForm({...form, newName: e.target.value, selectedProfId: ""})}
                placeholder="Örn: Arş. Gör. Ali YILMAZ"
              />
            </FormField>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <GhostBtn onClick={() => setEditingItem(null)} style={{color:"#6B7280"}}>İptal</GhostBtn>
              <Btn onClick={handleSupSave} disabled={saving}>{saving ? "Kaydediliyor..." : "Gözetmen Ata"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Gözetmen Düzenleme Modal */}
      {editingItem && editingItem !== "new" && editingItem !== "new_sup" && activeTab === "supervisors" && (
        <Modal open={true} title="Gözetmen Düzenle" onClose={() => setEditingItem(null)} width={400}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FormField label="Gözetmen Adı (Unvan+Ad+Soyad)"><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></FormField>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><GhostBtn onClick={() => setEditingItem(null)} style={{color:"#6B7280"}}>İptal</GhostBtn><Btn onClick={handleSupSave} disabled={saving}>Kaydet</Btn></div>
          </div>
        </Modal>
      )}

    </div>
  );
}

window.BolumYonetimiModuluApp = BolumYonetimiModuluApp;
