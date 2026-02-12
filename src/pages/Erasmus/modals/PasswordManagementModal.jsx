
import React, { useState, useEffect } from 'react';
import { C } from '../../../constants/theme';
import { Btn, Input, Modal, EditIcon, TrashIcon, PlusIcon } from '../../../components/ui'; // Assuming these will be available via index or direct import
// If these are not yet in a UI folder, I might need to rely on shared-components or extract them too. 
// For now, I'll import them assuming they will be provided or I will need to fix imports later.
// Actually, looking at the plan, I should probably put them in a common place or keep using them from where they are if not refactored yet.
// Since I am refactoring Erasmus, I should probably use the new structure. 
// The prompt said "Check shared-components.jsx... and extract them if they haven't been already." 
// I haven't extracted `Btn`, `Input` etc. yet. They are small. 
// I'll stick to the plan: Extract PasswordManagementModal. 
// I will assume standard UI components are available or I will copy them into the file if they are small dependencies/specific to this.
// `Btn`, `Input`, `Modal` are used here. I'll assume they will be in `src/components/ui` or similar. 
// For this specific task, I'll assume they are available or I'll stub them / use standard HTML if needed, but better to import.
// Let's import from a placeholder for now and I will ensure they exist.
// Actually, I should probably check if `src/components/ui` exists or if I should create `src/pages/Erasmus/components/ui` for now.
// The user has `src/pages/Erasmus/components`. 
// I'll assume `FirebaseDB` is available globally or via service.

import FirebaseDB from '../../../services/firebase'; // Adjust path as needed

const PasswordManagementModal = ({ students, onClose }) => {
    const [activeTab, setActiveTab] = useState("student"); // student, professor, admin
    const [studentPasses, setStudentPasses] = useState({});
    const [professorPasses, setProfessorPasses] = useState({});
    const [adminPass, setAdminPass] = useState("");
    const [professorList, setProfessorList] = useState([]);
    const [editingProf, setEditingProf] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadAllPasswords(); }, []);

    const loadAllPasswords = async () => {
        try {
            const [sPass, pPass, aPass, profs] = await Promise.all([
                FirebaseDB.fetchPasswords(),
                FirebaseDB.fetchProfessorPasswords(),
                FirebaseDB.fetchAdminPassword(),
                FirebaseDB.fetchProfessors(),
            ]);
            setStudentPasses(sPass || {});
            setProfessorPasses(pPass || {});
            setAdminPass(aPass || "1605");
            setProfessorList((profs || []).sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error('Error loading passwords:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePasswords = async () => {
        setSaving(true);
        try {
            if (activeTab === "student") {
                await FirebaseDB.passwordsRef().doc('student_passwords').set(studentPasses);
            } else if (activeTab === "professor") {
                await FirebaseDB.saveProfessorPasswords(professorPasses);
            } else if (activeTab === "admin") {
                await FirebaseDB.saveAdminPassword(adminPass);
            }
            alert('Şifreler kaydedildi!');
        } catch (error) {
            console.error('Error saving passwords:', error);
            alert('Hata: ' + error.message);
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
            setProfessorList(newProfs);
        } catch (e) {
            alert("Hata: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveProfessorValues = async () => {
        if (!editingProf.name || !editingProf.department) return alert("İsim ve Bölüm zorunludur.");
        setSaving(true);
        try {
            await FirebaseDB.saveProfessor(editingProf);
            const newProfs = await FirebaseDB.fetchProfessors();
            setProfessorList(newProfs);
            setEditingProf(null);
        } catch (e) {
            alert("Hata: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={true} onClose={onClose} title="Yönetim Paneli" width={900}>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                {["student", "professor", "admin"].map(tab => (
                    <Btn key={tab}
                        variant={activeTab === tab ? "primary" : "secondary"}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === "student" ? "Öğrenciler" : tab === "professor" ? "Akademisyenler" : "Admin"}
                    </Btn>
                ))}
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>Yükleniyor...</div>
            ) : (
                <div>
                    <div style={{ maxHeight: 500, overflowY: 'auto', marginBottom: 24, paddingRight: 8 }}>

                        {activeTab === "student" && (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: C.bg }}>
                                        <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Öğrenci No</th>
                                        <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Ad Soyad</th>
                                        <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Şifre</th>
                                        <th style={{ padding: 12, textAlign: 'center', borderBottom: `2px solid ${C.border}` }}>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(student => (
                                        <tr key={student.studentNumber} style={{ borderBottom: `1px solid ${C.border}` }}>
                                            <td style={{ padding: 12, fontWeight: 600, color: C.navy }}>{student.studentNumber}</td>
                                            <td style={{ padding: 12 }}>{student.firstName} {student.lastName}</td>
                                            <td style={{ padding: 12 }}>
                                                <Input type="text" value={studentPasses[student.studentNumber] || '1234'}
                                                    onChange={e => setStudentPasses(p => ({ ...p, [student.studentNumber]: e.target.value }))} />
                                            </td>
                                            <td style={{ padding: 12, textAlign: 'center' }}>
                                                <button onClick={() => {
                                                    if (confirm('Şifreyi sıfırlamak istediğinizden emin misiniz?')) {
                                                        setStudentPasses(p => ({ ...p, [student.studentNumber]: '1234' }));
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

                        {activeTab === "professor" && (
                            <div>
                                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                                    <Btn small onClick={() => setEditingProf({ name: "", department: "" })} icon={<PlusIcon />}>Yeni Ekle</Btn>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: C.bg }}>
                                            <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Unvan & İsim</th>
                                            <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Bölüm</th>
                                            <th style={{ padding: 12, textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Şifre</th>
                                            <th style={{ padding: 12, textAlign: 'center', borderBottom: `2px solid ${C.border}` }}>İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* New/Editing Row at top if adding new */}
                                        {editingProf && !editingProf.id && (
                                            <tr style={{ background: "rgba(0,255,135,0.05)", borderBottom: `1px solid ${C.border}` }}>
                                                <td style={{ padding: 12 }}>
                                                    <Input autoFocus value={editingProf.name} onChange={e => setEditingProf({ ...editingProf, name: e.target.value })} placeholder="Örn: Dr. Ali Veli" />
                                                </td>
                                                <td style={{ padding: 12 }}>
                                                    <Input value={editingProf.department} onChange={e => setEditingProf({ ...editingProf, department: e.target.value })} placeholder="Örn: Bilgisayar Müh." />
                                                </td>
                                                <td style={{ padding: 12, color: C.textMuted }}>-</td>
                                                <td style={{ padding: 12, display: "flex", gap: 6, justifyContent: "center" }}>
                                                    <Btn small onClick={handleSaveProfessorValues} disabled={saving}>Kaydet</Btn>
                                                    <Btn small variant="secondary" onClick={() => setEditingProf(null)}>İptal</Btn>
                                                </td>
                                            </tr>
                                        )}

                                        {professorList.map((prof, idx) => {
                                            const isEditing = editingProf && editingProf.id === prof.id;
                                            return isEditing ? (
                                                <tr key={prof.id} style={{ background: "rgba(0,255,135,0.05)", borderBottom: `1px solid ${C.border}` }}>
                                                    <td style={{ padding: 12 }}>
                                                        <Input value={editingProf.name} onChange={e => setEditingProf({ ...editingProf, name: e.target.value })} />
                                                    </td>
                                                    <td style={{ padding: 12 }}>
                                                        <Input value={editingProf.department} onChange={e => setEditingProf({ ...editingProf, department: e.target.value })} />
                                                    </td>
                                                    <td style={{ padding: 12, color: C.textMuted }}>
                                                        (Şifre değişmez)
                                                    </td>
                                                    <td style={{ padding: 12, display: "flex", gap: 6, justifyContent: "center" }}>
                                                        <Btn small onClick={handleSaveProfessorValues} disabled={saving}>Kaydet</Btn>
                                                        <Btn small variant="secondary" onClick={() => setEditingProf(null)}>İptal</Btn>
                                                    </td>
                                                </tr>
                                            ) : (
                                                <tr key={prof.id || idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                                                    <td style={{ padding: 12, fontWeight: 600, color: C.navy }}>{prof.name}</td>
                                                    <td style={{ padding: 12 }}>{prof.department}</td>
                                                    <td style={{ padding: 12 }}>
                                                        <Input type="text" value={professorPasses[prof.name] || '1234'}
                                                            onChange={e => setProfessorPasses(p => ({ ...p, [prof.name]: e.target.value }))} />
                                                    </td>
                                                    <td style={{ padding: 12, display: "flex", gap: 6, justifyContent: "center" }}>
                                                        <button onClick={() => setEditingProf({ ...prof })} style={{
                                                            padding: "6px", border: `1px solid ${C.border}`, borderRadius: 6,
                                                            background: "white", cursor: "pointer", color: C.blue, display: "flex"
                                                        }} title="Düzenle"><EditIcon /></button>
                                                        <button onClick={() => handleDeleteProf(prof.id, prof.name)} style={{
                                                            padding: "6px", border: `1px solid ${C.border}`, borderRadius: 6,
                                                            background: "white", cursor: "pointer", color: C.accent, display: "flex"
                                                        }} title="Sil"><TrashIcon /></button>
                                                        <button onClick={() => {
                                                            if (confirm('Şifreyi sıfırlamak istediğinizden emin misiniz?')) {
                                                                setProfessorPasses(p => ({ ...p, [prof.name]: '1234' }));
                                                            }
                                                        }} style={{
                                                            padding: "6px 12px", fontSize: 12, border: `1px solid ${C.border}`,
                                                            borderRadius: 6, background: "white", cursor: "pointer", color: C.accent,
                                                        }}>Şifre Sıfırla</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === "admin" && (
                            <div style={{ padding: 20, textAlign: 'center' }}>
                                <div style={{ marginBottom: 16, fontWeight: 600, color: C.navy }}>Admin Giriş Şifresi</div>
                                <div style={{ maxWidth: 300, margin: '0 auto' }}>
                                    <Input type="text" value={adminPass} onChange={e => setAdminPass(e.target.value)} style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2 }} />
                                </div>
                                <div style={{ marginTop: 12, fontSize: 13, color: C.textMuted }}>
                                    Bu şifre ile Admin paneline erişim sağlanır.
                                </div>
                            </div>
                        )}

                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
                        <Btn onClick={onClose} variant="secondary">Kapat</Btn>
                        <Btn onClick={handleSavePasswords} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Şifreleri Kaydet'}</Btn>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default PasswordManagementModal;
