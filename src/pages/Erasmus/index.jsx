
import React, { useState, useEffect, useRef } from 'react';
import { Card, Btn, Input, Badge, FileTextIcon, TrashIcon, PlusIcon, UploadIcon, DownloadIcon } from '../../components/ui';
import StudentDetailModal from './modals/StudentDetailModal';
import PasswordManagementModal from './modals/PasswordManagementModal';
import GradeConverter from './components/GradeConverter';
import { SAMPLE_STUDENTS } from './constants';
import { generateOutgoingWordDoc, generateReturnWordDoc } from './utils';
import FirebaseDB from '../../services/firebase'; // Assuming Firebase service exists
import { C } from '../../constants/theme'; // Assuming theme constants exist

const ErasmusPage = ({ currentUser }) => {
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSemester, setSelectedSemester] = useState("all");
    const [loading, setLoading] = useState(true);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const loadStudents = async () => {
            // Check if FirebaseDB is ready if it has such method, or just try
            if (FirebaseDB.isReady && !FirebaseDB.isReady()) { setLoading(false); return; }

            try {
                setLoading(true);
                // Initialize database if needed (logic from legacy)
                const ref = FirebaseDB.studentsRef ? FirebaseDB.studentsRef() : null;
                if (!ref) {
                    // If Firebase service is not fully implemented or mock, we might fallback to sample or stop.
                    // For now, let's assume it works or just use sample if allowed.
                    // Legacy code checked if snapshot.empty then added samples.
                    // I'll keep the logic but be safe.
                    if (!FirebaseDB.studentsRef) {
                        console.warn("Firebase methods missing, using local state only.");
                        setStudents(SAMPLE_STUDENTS); // Fallback for dev/demo if Firebase not ready
                        setLoading(false);
                        return;
                    }
                }

                if (ref) {
                    const snapshot = await ref.limit(1).get();
                    if (snapshot.empty) {
                        for (const student of SAMPLE_STUDENTS) await FirebaseDB.addStudent(student);
                        const defaultPasswords = {};
                        SAMPLE_STUDENTS.forEach(s => { defaultPasswords[s.studentNumber] = '1234'; });
                        const pwRef = FirebaseDB.passwordsRef();
                        if (pwRef) await pwRef.doc('student_passwords').set(defaultPasswords);
                    }
                    const fetchedStudents = await FirebaseDB.fetchStudents();
                    setStudents(fetchedStudents);
                }
            } catch (error) {
                console.error('Error loading students:', error);
                // Fallback to sample data on error for robustness during dev
                setStudents(SAMPLE_STUDENTS);
            } finally {
                setLoading(false);
            }
        };
        // Small delay to ensure firebase init if needed, matching legacy
        setTimeout(loadStudents, 500);
    }, []);

    const canEdit = (student) => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        return currentUser.role === 'student' && student.studentNumber === currentUser.studentNumber;
    };

    const generateSemesters = () => {
        const semesters = ["all"];
        for (let year = 2024; year <= 2030; year++) { semesters.push(`Spring ${year}`); semesters.push(`Fall ${year}`); }
        return semesters;
    };
    const semesters = generateSemesters();

    const filteredStudents = students
        .filter(s => selectedSemester === "all" || s.semester === selectedSemester)
        .filter(s => `${s.firstName} ${s.lastName} ${s.studentNumber} ${s.hostInstitution}`.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSaveStudent = async (updatedStudent) => {
        try {
            const originalStudent = students.find(s => s.id === updatedStudent.id);
            const studentNumberChanged = originalStudent && originalStudent.studentNumber !== updatedStudent.studentNumber;

            if (FirebaseDB.updateStudent) {
                await FirebaseDB.updateStudent(updatedStudent.id, updatedStudent);
                if (studentNumberChanged) {
                    const passwords = await FirebaseDB.fetchPasswords();
                    const oldPassword = passwords[originalStudent.studentNumber] || '1234';
                    delete passwords[originalStudent.studentNumber];
                    passwords[updatedStudent.studentNumber] = oldPassword;
                    await FirebaseDB.passwordsRef().doc('student_passwords').set(passwords);
                }
            }
            setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
            setSelectedStudent(null);
            alert('Degisiklikler kaydedildi!');
        } catch (error) {
            console.error('Save error:', error);
            alert('Kayit sirasinda hata olustu.');
        }
    };

    const handleAddStudent = async () => {
        const newStudent = { id: String(Date.now()), studentNumber: "", firstName: "", lastName: "", hostInstitution: "", hostCountry: "", semester: "Fall 2025", outgoingMatches: [], returnMatches: [] };
        // Optimistically update UI
        setStudents(prev => [...prev, newStudent]);
        setSelectedStudent(newStudent);
        // Note: We don't save to DB until they click save in modal usually, but logic here adds to list first.
    };

    const handleDeleteStudent = async (id) => {
        if (confirm("Bu ogrenciyi silmek istediginizden emin misiniz?")) {
            try {
                if (FirebaseDB.deleteStudent) await FirebaseDB.deleteStudent(id);
                setStudents(prev => prev.filter(s => s.id !== id));
            } catch (error) {
                console.error('Delete error:', error);
            }
        }
    };

    const exportAllData = () => {
        const data = students.map(s => ({ "Ogrenci Numarasi": s.studentNumber, "Ad": s.firstName, "Soyad": s.lastName, "Karsi Kurum": s.hostInstitution, "Ulke": s.hostCountry, "Gidis": s.outgoingMatches.length, "Donus": s.returnMatches.length }));
        if (data.length === 0) { alert('Disa aktarilacak ogrenci bulunamadi.'); return; }
        const csv = [Object.keys(data[0]).join(","), ...data.map(row => Object.values(row).join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `Erasmus_Learning_Agreements_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (Array.isArray(importedData)) { setStudents(prev => [...prev, ...importedData]); alert(`${importedData.length} öğrenci içeye aktarıldı!`); }
            } catch (error) { alert("Dosya formati hatali!"); }
        };
        reader.readAsText(file);
    };

    if (loading) {
        return <div style={{ padding: 60, textAlign: "center", color: C.textMuted }}>Veriler yükleniyor...</div>;
    }

    return (
        <div className="portal-bg">
            <div className="portal-wrap">
                {/* Actions Bar */}
                <Card>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 300 }}>
                            <div style={{ flex: 1, maxWidth: 350 }}>
                                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Öğrenci ara (ad, numara, kurum)..." />
                            </div>
                            <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}
                                style={{ padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", backgroundColor: "white", cursor: "pointer", minWidth: 150 }}>
                                {semesters.map(sem => {
                                    let displayText = sem === "all" ? "Tüm Dönemler" : sem.startsWith("Spring") ? sem.replace("Spring", "Bahar") : sem.replace("Fall", "Güz");
                                    return <option key={sem} value={sem}>{displayText}</option>;
                                })}
                            </select>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            {currentUser?.role === 'admin' && (
                                <>
                                    <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
                                    <Btn onClick={() => fileInputRef.current?.click()} variant="secondary" icon={<UploadIcon />}>İçe Aktar</Btn>
                                    <Btn onClick={exportAllData} variant="secondary" icon={<DownloadIcon />}>Tümünü Dışa Aktar</Btn>
                                    <Btn onClick={handleAddStudent} icon={<PlusIcon />}>Yeni Öğrenci Ekle</Btn>
                                    <Btn onClick={() => setShowPasswordModal(true)} variant="secondary">Şifre Yönetimi</Btn>
                                </>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Statistics */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 24 }}>
                    {[
                        { label: "Toplam Öğrenci", value: students.length, color: C.navy },
                        { label: "Gidiş Eşleştirmeleri", value: students.reduce((sum, s) => sum + s.outgoingMatches.length, 0), color: C.green },
                        { label: "Dönüş Eşleştirmeleri", value: students.reduce((sum, s) => sum + s.returnMatches.length, 0), color: C.gold },
                        { label: "Ortalama Eşleştirme", value: students.length > 0 ? ((students.reduce((sum, s) => sum + s.outgoingMatches.length + s.returnMatches.length, 0)) / students.length).toFixed(1) : 0, color: C.accent },
                    ].map((stat, i) => (
                        <Card key={i} noPadding>
                            <div style={{ padding: 24, textAlign: "center" }}>
                                <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 8 }}>{stat.label}</div>
                                <div style={{ fontSize: 36, fontWeight: 700, color: stat.color, fontFamily: "'Playfair Display', serif" }}>{stat.value}</div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Grade Conversion */}
                <Card title="Not Dönüşüm Hesaplayıcı"><GradeConverter /></Card>

                {/* Students Table */}
                <Card title="Öğrenciler" noPadding>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                                    {["Öğrenci No", "Ad Soyad", "Karşı Kurum", "Gidiş", "Dönüş", "İşlemler"].map((h, i) => (
                                        <th key={i} style={{ padding: "16px 24px", textAlign: i === 3 || i === 4 ? "center" : i === 5 ? "right" : "left", fontSize: 11, fontWeight: 700, color: C.navy, letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map(student => (
                                    <tr key={student.id} style={{ borderBottom: `1px solid ${C.border}`, transition: "all 0.15s" }}
                                        onMouseEnter={e => { e.currentTarget.style.background = C.bg; }} onMouseLeave={e => { e.currentTarget.style.background = ""; }}>
                                        <td style={{ padding: "16px 24px" }}><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: C.navy }}>{student.studentNumber}</span></td>
                                        <td style={{ padding: "16px 24px", fontWeight: 500 }}>
                                            {student.firstName} {student.lastName}
                                            {student.semester && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{student.semester}</div>}
                                        </td>
                                        <td style={{ padding: "16px 24px" }}>
                                            <div style={{ fontSize: 14, fontWeight: 500 }}>{student.hostInstitution}</div>
                                            <div style={{ fontSize: 12, color: C.textMuted }}>{student.hostCountry}</div>
                                        </td>
                                        <td style={{ padding: "16px 24px", textAlign: "center" }}><Badge color={C.green} bg={C.greenLight}>{student.outgoingMatches.length} eşleştirme</Badge></td>
                                        <td style={{ padding: "16px 24px", textAlign: "center" }}><Badge color={C.gold} bg={C.goldPale}>{student.returnMatches.length} eşleştirme</Badge></td>
                                        <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                                                <Btn onClick={() => setSelectedStudent(student)} variant="secondary" small icon={<FileTextIcon />}>{canEdit(student) ? 'Detay & Düzenle' : 'Detay'}</Btn>
                                                <button onClick={() => generateOutgoingWordDoc(student)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#E6F4EA", color: "#1E7E34", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Gidiş</button>
                                                {student.returnMatches.length > 0 && (
                                                    <button onClick={() => generateReturnWordDoc(student)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#FFF3E0", color: "#E65100", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Dönüş</button>
                                                )}
                                                {canEdit(student) && (
                                                    <button onClick={() => handleDeleteStudent(student.id)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#FAEBED", color: C.accent, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><TrashIcon /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {selectedStudent && (
                    <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} onSave={handleSaveStudent} readOnly={!canEdit(selectedStudent)} />
                )}
                {showPasswordModal && currentUser?.role === 'admin' && (
                    <PasswordManagementModal students={students} onClose={() => setShowPasswordModal(false)} />
                )}
            </div>
        </div>
    );
}

export default ErasmusPage;
