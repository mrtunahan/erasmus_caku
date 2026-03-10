// ══════════════════════════════════════════════════════════════
// Kullanıcı Yönetimi Modülü
// Öğrenci, Akademisyen ve Şifre Yönetimi (Sadece Admin)
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useCallback } = React;

const KullaniciYonetimiApp = ({ currentUser }) => {
  const r = useResponsive();
  const [activeSection, setActiveSection] = useState("students"); // students, professors, passwords
  const [students, setStudents] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingProf, setEditingProf] = useState(null);
  const [saving, setSaving] = useState(false);

  // Password states
  const [studentPasses, setStudentPasses] = useState({});
  const [professorPasses, setProfessorPasses] = useState({});
  const [adminPass, setAdminPass] = useState("");
  const [passwordTab, setPasswordTab] = useState("student");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!FirebaseDB.isReady()) { setLoading(false); return; }
    try {
      setLoading(true);
      const [fetchedStudents, fetchedProfs] = await Promise.all([
        FirebaseDB.fetchStudents(),
        FirebaseDB.fetchProfessors()
      ]);
      setStudents(fetchedStudents || []);
      setProfessors((fetchedProfs || []).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Student Handlers ──
  const handleAddStudent = () => {
    const newStudent = {
      id: String(Date.now()),
      studentNumber: "",
      firstName: "",
      lastName: "",
      hostInstitution: "",
      hostCountry: "",
      semester: "Fall 2025",
      outgoingMatches: [],
      returnMatches: [],
      erasmusAccess: true
    };
    setEditingStudent(newStudent);
  };

  const handleSaveStudent = async (student) => {
    setSaving(true);
    try {
      if (students.find(s => s.id === student.id)) {
        await FirebaseDB.updateStudent(student.id, student);
        setStudents(prev => prev.map(s => s.id === student.id ? student : s));
      } else {
        await FirebaseDB.addStudent(student);
        setStudents(prev => [...prev, student]);
      }
      setEditingStudent(null);
      alert('Öğrenci kaydedildi!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Kayıt sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!confirm("Bu öğrenciyi silmek istediğinizden emin misiniz?")) return;
    try {
      await FirebaseDB.deleteStudent(id);
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleToggleErasmusAccess = async (student) => {
    try {
      const newAccess = !student.erasmusAccess;
      await FirebaseDB.updateStudent(student.id, { ...student, erasmusAccess: newAccess });
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, erasmusAccess: newAccess } : s));
    } catch (error) {
      console.error('Erasmus erişim güncelleme hatası:', error);
      alert('Erişim güncellenirken hata oluştu.');
    }
  };

  // ── Professor Handlers ──
  const handleSaveProfessor = async () => {
    if (!editingProf.name || !editingProf.department) return alert("İsim ve Bölüm zorunludur.");
    setSaving(true);
    try {
      await FirebaseDB.saveProfessor(editingProf);
      const newProfs = await FirebaseDB.fetchProfessors();
      setProfessors((newProfs || []).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingProf(null);
    } catch (e) {
      alert("Hata: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProf = async (id, name) => {
    if (!confirm(`${name} isimli akademisyeni silmek istediğinize emin misiniz?`)) return;
    setSaving(true);
    try {
      await FirebaseDB.deleteProfessor(id);
      const newProfs = await FirebaseDB.fetchProfessors();
      setProfessors((newProfs || []).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      alert("Hata: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Password Handlers ──
  const handleSavePasswords = async () => {
    setSaving(true);
    try {
      if (passwordTab === "student") {
        for (const [studentNo, pass] of Object.entries(studentPasses)) {
          if (pass && pass !== '••••••') {
            await FirebaseDB.changePassword('student', studentNo, pass);
          }
        }
      } else if (passwordTab === "professor") {
        for (const [name, pass] of Object.entries(professorPasses)) {
          if (pass && pass !== '••••••') {
            await FirebaseDB.changePassword('professor', name, pass);
          }
        }
      } else if (passwordTab === "admin") {
        if (adminPass && adminPass.length >= 6) {
          await FirebaseDB.changePassword('admin', null, adminPass);
        }
      }
      alert('Şifreler kaydedildi!');
      setStudentPasses({});
      setProfessorPasses({});
      setAdminPass("");
    } catch (error) {
      console.error('Error saving passwords:', error);
      alert('Hata: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="portal-bg">
        <div className="portal-wrap">
          <Card>
            <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
              Bu sayfaya erişim yetkiniz bulunmamaktadır.
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: C.textMuted }}>Veriler yükleniyor...</div>;
  }

  const filteredStudents = students.filter(s =>
    `${s.firstName} ${s.lastName} ${s.studentNumber}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProfessors = professors.filter(p =>
    `${p.name} ${p.department || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sectionTabs = [
    { id: "students", label: "Öğrenciler", count: students.length },
    { id: "professors", label: "Akademisyenler", count: professors.length },
    { id: "passwords", label: "Şifre Yönetimi" },
  ];

  return (
    <div className="portal-bg">
      <div className="portal-wrap">
        {/* Section Tabs */}
        <Card>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {sectionTabs.map(tab => (
                <Btn key={tab.id}
                  variant={activeSection === tab.id ? "primary" : "secondary"}
                  onClick={() => { setActiveSection(tab.id); setSearchTerm(""); }}
                >
                  {tab.label}{tab.count != null ? ` (${tab.count})` : ''}
                </Btn>
              ))}
            </div>
            {activeSection !== "passwords" && (
              <div style={{ flex: 1, maxWidth: 350, minWidth: 200 }}>
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Ara..." />
              </div>
            )}
          </div>
        </Card>

        {/* ══════ STUDENTS SECTION ══════ */}
        {activeSection === "students" && (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: r.val("repeat(2, 1fr)", "repeat(3, 1fr)", "repeat(3, 1fr)"), gap: r.val(12, 16, 20), marginBottom: 24 }}>
              {[
                { label: "Toplam Öğrenci", value: students.length, color: C.navy },
                { label: "Erasmus Yetkili", value: students.filter(s => s.erasmusAccess).length, color: C.green },
                { label: "Erasmus Yetkisiz", value: students.filter(s => !s.erasmusAccess).length, color: C.accent },
              ].map((stat, i) => (
                <Card key={i} noPadding>
                  <div style={{ padding: r.val(16, 20, 24), textAlign: "center" }}>
                    <div style={{ fontSize: r.val(12, 13, 14), color: C.textMuted, marginBottom: r.val(4, 6, 8) }}>{stat.label}</div>
                    <div style={{ fontSize: r.val(24, 30, 36), fontWeight: 700, color: stat.color, fontFamily: "'Playfair Display', serif" }}>{stat.value}</div>
                  </div>
                </Card>
              ))}
            </div>

            <Card title="Öğrenci Listesi" noPadding>
              <div style={{ padding: "12px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end" }}>
                <Btn onClick={handleAddStudent} icon={<PlusIcon />}>Yeni Öğrenci Ekle</Btn>
              </div>
              <div className="responsive-table-wrap" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: r.isMobile ? 600 : "auto" }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                      {["Öğrenci No", "Ad Soyad", "Erasmus", "İşlemler"].map((h, i) => (
                        <th key={i} style={{ padding: "14px 20px", textAlign: i === 3 ? "right" : "left", fontSize: 11, fontWeight: 700, color: C.navy, letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr key={student.id} style={{ borderBottom: `1px solid ${C.border}`, transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.bg; }}
                        onMouseLeave={e => { e.currentTarget.style.background = ""; }}>
                        <td style={{ padding: "14px 20px" }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: C.navy }}>{student.studentNumber}</span>
                        </td>
                        <td style={{ padding: "14px 20px", fontWeight: 500 }}>
                          {student.firstName} {student.lastName}
                          {student.hostInstitution && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{student.hostInstitution} - {student.hostCountry}</div>}
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <button onClick={() => handleToggleErasmusAccess(student)}
                            style={{
                              padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                              background: student.erasmusAccess ? "#E6F4EA" : "#FEE2E2",
                              color: student.erasmusAccess ? "#1E7E34" : "#DC2626",
                            }}>
                            {student.erasmusAccess ? "Yetkili" : "Yetkisiz"}
                          </button>
                        </td>
                        <td style={{ padding: "14px 20px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button onClick={() => setEditingStudent(student)} style={{
                              padding: "6px", border: `1px solid ${C.border}`, borderRadius: 6,
                              background: "white", cursor: "pointer", color: C.blue, display: "flex"
                            }} title="Düzenle"><EditIcon /></button>
                            <button onClick={() => handleDeleteStudent(student.id)} style={{
                              padding: "6px", border: `1px solid ${C.border}`, borderRadius: 6,
                              background: "white", cursor: "pointer", color: C.accent, display: "flex"
                            }} title="Sil"><TrashIcon /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Öğrenci bulunamadı.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ══════ PROFESSORS SECTION ══════ */}
        {activeSection === "professors" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: r.val(12, 16, 20), marginBottom: 24 }}>
              {[
                { label: "Toplam Akademisyen", value: professors.length, color: C.navy },
                { label: "Bölüm Sayısı", value: [...new Set(professors.map(p => p.department).filter(Boolean))].length, color: C.green },
              ].map((stat, i) => (
                <Card key={i} noPadding>
                  <div style={{ padding: r.val(16, 20, 24), textAlign: "center" }}>
                    <div style={{ fontSize: r.val(12, 13, 14), color: C.textMuted, marginBottom: r.val(4, 6, 8) }}>{stat.label}</div>
                    <div style={{ fontSize: r.val(24, 30, 36), fontWeight: 700, color: stat.color, fontFamily: "'Playfair Display', serif" }}>{stat.value}</div>
                  </div>
                </Card>
              ))}
            </div>

            <Card title="Akademisyen Listesi" noPadding>
              <div style={{ padding: "12px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end" }}>
                <Btn onClick={() => setEditingProf({ name: "", department: "" })} icon={<PlusIcon />}>Yeni Akademisyen Ekle</Btn>
              </div>
              <div className="responsive-table-wrap" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                      {["Unvan & İsim", "Bölüm", "İşlemler"].map((h, i) => (
                        <th key={i} style={{ padding: "14px 20px", textAlign: i === 2 ? "right" : "left", fontSize: 11, fontWeight: 700, color: C.navy, letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* New professor form row */}
                    {editingProf && !editingProf.id && (
                      <tr style={{ background: "rgba(0,255,135,0.05)", borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: 14 }}>
                          <Input autoFocus value={editingProf.name} onChange={e => setEditingProf({ ...editingProf, name: e.target.value })} placeholder="Örn: Dr. Ali Veli" />
                        </td>
                        <td style={{ padding: 14 }}>
                          <Input value={editingProf.department} onChange={e => setEditingProf({ ...editingProf, department: e.target.value })} placeholder="Örn: Bilgisayar Müh." />
                        </td>
                        <td style={{ padding: 14, textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <Btn small onClick={handleSaveProfessor} disabled={saving}>Kaydet</Btn>
                            <Btn small variant="secondary" onClick={() => setEditingProf(null)}>İptal</Btn>
                          </div>
                        </td>
                      </tr>
                    )}

                    {filteredProfessors.map((prof, idx) => {
                      const isEditing = editingProf && editingProf.id === prof.id;
                      return isEditing ? (
                        <tr key={prof.id} style={{ background: "rgba(0,255,135,0.05)", borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: 14 }}>
                            <Input value={editingProf.name} onChange={e => setEditingProf({ ...editingProf, name: e.target.value })} />
                          </td>
                          <td style={{ padding: 14 }}>
                            <Input value={editingProf.department} onChange={e => setEditingProf({ ...editingProf, department: e.target.value })} />
                          </td>
                          <td style={{ padding: 14, textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              <Btn small onClick={handleSaveProfessor} disabled={saving}>Kaydet</Btn>
                              <Btn small variant="secondary" onClick={() => setEditingProf(null)}>İptal</Btn>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={prof.id || idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: "14px 20px", fontWeight: 600, color: C.navy }}>{prof.name}</td>
                          <td style={{ padding: "14px 20px" }}>{prof.department}</td>
                          <td style={{ padding: "14px 20px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              <button onClick={() => setEditingProf({ ...prof })} style={{
                                padding: "6px", border: `1px solid ${C.border}`, borderRadius: 6,
                                background: "white", cursor: "pointer", color: C.blue, display: "flex"
                              }} title="Düzenle"><EditIcon /></button>
                              <button onClick={() => handleDeleteProf(prof.id, prof.name)} style={{
                                padding: "6px", border: `1px solid ${C.border}`, borderRadius: 6,
                                background: "white", cursor: "pointer", color: C.accent, display: "flex"
                              }} title="Sil"><TrashIcon /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProfessors.length === 0 && (
                      <tr><td colSpan={3} style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Akademisyen bulunamadı.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ══════ PASSWORDS SECTION ══════ */}
        {activeSection === "passwords" && (
          <Card title="Şifre Yönetimi">
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {[
                { id: "student", label: "Öğrenciler" },
                { id: "professor", label: "Akademisyenler" },
                { id: "admin", label: "Admin" },
              ].map(tab => (
                <Btn key={tab.id}
                  variant={passwordTab === tab.id ? "primary" : "secondary"}
                  onClick={() => setPasswordTab(tab.id)}
                  small
                >
                  {tab.label}
                </Btn>
              ))}
            </div>

            <div style={{ maxHeight: 500, overflowY: 'auto', marginBottom: 24, paddingRight: 8 }}>
              {passwordTab === "student" && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Öğrenci No</th>
                      <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Ad Soyad</th>
                      <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Yeni Şifre</th>
                      <th style={{ padding: 12, textAlign: 'center', borderBottom: `2px solid ${C.border}` }}>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student.studentNumber} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: 12, fontWeight: 600, color: C.navy }}>{student.studentNumber}</td>
                        <td style={{ padding: 12 }}>{student.firstName} {student.lastName}</td>
                        <td style={{ padding: 12 }}>
                          <Input type="password" value={studentPasses[student.studentNumber] || ''}
                            placeholder="Yeni şifre girin"
                            onChange={e => setStudentPasses(p => ({ ...p, [student.studentNumber]: e.target.value }))} />
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <button onClick={() => {
                            if (confirm('Şifreyi sıfırlamak istediğinizden emin misiniz?')) {
                              setStudentPasses(p => ({ ...p, [student.studentNumber]: '' }));
                            }
                          }} style={{
                            padding: "6px 12px", fontSize: 12, border: `1px solid ${C.border}`,
                            borderRadius: 6, background: "white", cursor: "pointer", color: C.accent,
                          }}>Sıfırla</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {passwordTab === "professor" && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Unvan & İsim</th>
                      <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Yeni Şifre</th>
                      <th style={{ padding: 12, textAlign: 'center', borderBottom: `2px solid ${C.border}` }}>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {professors.map((prof, idx) => (
                      <tr key={prof.id || idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: 12, fontWeight: 600, color: C.navy }}>{prof.name}</td>
                        <td style={{ padding: 12 }}>
                          <Input type="password" value={professorPasses[prof.name] || ''}
                            placeholder="Yeni şifre girin"
                            onChange={e => setProfessorPasses(p => ({ ...p, [prof.name]: e.target.value }))} />
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <button onClick={() => {
                            if (confirm('Şifreyi sıfırlamak istediğinizden emin misiniz?')) {
                              setProfessorPasses(p => ({ ...p, [prof.name]: '' }));
                            }
                          }} style={{
                            padding: "6px 12px", fontSize: 12, border: `1px solid ${C.border}`,
                            borderRadius: 6, background: "white", cursor: "pointer", color: C.accent,
                          }}>Şifre Sıfırla</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {passwordTab === "admin" && (
                <div style={{ padding: 20, textAlign: 'center' }}>
                  <div style={{ marginBottom: 16, fontWeight: 600, color: C.navy }}>Admin Giriş Şifresi</div>
                  <div style={{ maxWidth: 300, margin: '0 auto' }}>
                    <Input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="Yeni admin şifresi" style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2 }} />
                  </div>
                  <div style={{ marginTop: 12, fontSize: 13, color: C.textMuted }}>
                    Bu şifre ile Admin paneline erişim sağlanır.
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
              <Btn onClick={handleSavePasswords} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Şifreleri Kaydet'}</Btn>
            </div>
          </Card>
        )}

        {/* Student Edit Modal */}
        {editingStudent && (
          <Modal open={true} onClose={() => setEditingStudent(null)} title={editingStudent.studentNumber ? "Öğrenci Düzenle" : "Yeni Öğrenci"} width={600}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 6 }}>Öğrenci Numarası</label>
                <Input value={editingStudent.studentNumber} onChange={e => setEditingStudent({ ...editingStudent, studentNumber: e.target.value })} placeholder="9 haneli öğrenci numarası" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 6 }}>Ad</label>
                  <Input value={editingStudent.firstName} onChange={e => setEditingStudent({ ...editingStudent, firstName: e.target.value })} placeholder="Ad" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 6 }}>Soyad</label>
                  <Input value={editingStudent.lastName} onChange={e => setEditingStudent({ ...editingStudent, lastName: e.target.value })} placeholder="Soyad" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 6 }}>Karşı Kurum</label>
                  <Input value={editingStudent.hostInstitution || ""} onChange={e => setEditingStudent({ ...editingStudent, hostInstitution: e.target.value })} placeholder="Üniversite adı" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 6 }}>Ülke</label>
                  <Input value={editingStudent.hostCountry || ""} onChange={e => setEditingStudent({ ...editingStudent, hostCountry: e.target.value })} placeholder="Ülke" />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>Erasmus Erişimi:</label>
                <button onClick={() => setEditingStudent({ ...editingStudent, erasmusAccess: !editingStudent.erasmusAccess })}
                  style={{
                    padding: "4px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    background: editingStudent.erasmusAccess ? "#E6F4EA" : "#FEE2E2",
                    color: editingStudent.erasmusAccess ? "#1E7E34" : "#DC2626",
                  }}>
                  {editingStudent.erasmusAccess ? "Yetkili" : "Yetkisiz"}
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <Btn onClick={() => setEditingStudent(null)} variant="secondary">İptal</Btn>
                <Btn onClick={() => handleSaveStudent(editingStudent)} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Btn>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

if (typeof window !== 'undefined') {
  window.KullaniciYonetimiApp = KullaniciYonetimiApp;
}
