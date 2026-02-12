
import React, { useState } from 'react';
import { C } from '../../../constants/theme';
import { Btn, Input, Modal, FormField, PlusIcon, DownloadIcon } from '../../../components/ui';
import { UNIVERSITY_CATALOGS } from '../constants';
import CourseMatchCard from '../components/CourseMatchCard';
import CourseMatchEditModal from './CourseMatchEditModal';
import CourseCatalogModal from './CourseCatalogModal';

const StudentDetailModal = ({ student, onClose, onSave, readOnly = false }) => {
    const [editedStudent, setEditedStudent] = useState(student);
    const [activeTab, setActiveTab] = useState("outgoing");
    const [editingMatch, setEditingMatch] = useState(null);
    const [showCatalogModal, setShowCatalogModal] = useState(false);

    const generateSemesters = () => {
        const semesters = [];
        for (let year = 2024; year <= 2030; year++) { semesters.push(`Spring ${year}`); semesters.push(`Fall ${year}`); }
        return semesters;
    };
    const semesters = generateSemesters();

    const updateStudent = (field, value) => setEditedStudent(prev => ({ ...prev, [field]: value }));

    const addMatch = (type) => {
        const newMatch = { id: `${type}${Date.now()}`, homeCourses: [], hostCourses: [], ...(type === "return" ? { hostGrade: "", homeGrade: "Muaf" } : {}) };
        setEditedStudent(prev => ({ ...prev, [`${type}Matches`]: [...prev[`${type}Matches`], newMatch] }));
        setEditingMatch({ type, match: newMatch });
    };

    const copyFromOutgoing = (outgoingMatch) => {
        const newReturnMatch = { id: `return${Date.now()}`, homeCourses: JSON.parse(JSON.stringify(outgoingMatch.homeCourses)), hostCourses: JSON.parse(JSON.stringify(outgoingMatch.hostCourses)), hostGrade: "A", homeGrade: "Muaf" };
        setEditedStudent(prev => ({ ...prev, returnMatches: [...prev.returnMatches, newReturnMatch] }));
    };

    const deleteMatch = (type, id) => setEditedStudent(prev => ({ ...prev, [`${type}Matches`]: prev[`${type}Matches`].filter(m => m.id !== id) }));

    const exportStudentData = () => {
        const data = {
            "Öğrenci Bilgileri": { "Öğrenci Numarası": editedStudent.studentNumber, "Ad": editedStudent.firstName, "Soyad": editedStudent.lastName, "Karşı Kurum": editedStudent.hostInstitution, "Fakülte": editedStudent.hostFaculty || "", "Bölüm": editedStudent.hostDepartment || "", "Ülke": editedStudent.hostCountry },
            "Gidiş Eşleştirmeleri": editedStudent.outgoingMatches.map(m => ({
                "Kendi Derslerimiz": m.homeCourses.map(c => `${c.code} - ${c.name} (${c.credits} AKTS)`).join(" | "),
                "Karşı Kurum Dersleri": m.hostCourses.map(c => `${c.code} - ${c.name} (${c.credits} AKTS)`).join(" | "),
            })),
            "Dönüş Eşleştirmeleri": editedStudent.returnMatches.map(m => ({
                "Kendi Derslerimiz": m.homeCourses.map(c => `${c.code} - ${c.name} (${c.credits} AKTS)`).join(" | "),
                "Karşı Kurum Dersleri": m.hostCourses.map(c => `${c.code} - ${c.name} (${c.credits} AKTS)`).join(" | "),
                "Not": m.grade, "Puan": m.gradePoints,
            })),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${editedStudent.studentNumber}_${editedStudent.lastName}_Learning_Agreement.json`;
        a.click();
    };

    return (
        <Modal open={true} onClose={onClose} title={`${student.firstName} ${student.lastName} - Öğrenim Anlaşması`} width={1000}>
            {readOnly && (
                <div style={{ padding: 16, background: "#FFF3CD", border: "2px solid #FFC107", borderRadius: 12, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 24 }}>🔒</div>
                    <div>
                        <div style={{ fontWeight: 600, color: "#856404", marginBottom: 4 }}>Sadece Görüntüleme Modu</div>
                        <div style={{ fontSize: 13, color: "#856404" }}>Bu öğrencinin bilgilerini sadece görüntüleyebilirsiniz.</div>
                    </div>
                </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24, padding: 20, background: C.goldPale, borderRadius: 10, border: `1px solid ${C.goldLight}` }}>
                <FormField label="Öğrenci Numarası"><Input value={editedStudent.studentNumber} onChange={e => updateStudent("studentNumber", e.target.value)} disabled={readOnly} /></FormField>
                <FormField label="Ad"><Input value={editedStudent.firstName} onChange={e => updateStudent("firstName", e.target.value)} disabled={readOnly} /></FormField>
                <FormField label="Soyad"><Input value={editedStudent.lastName} onChange={e => updateStudent("lastName", e.target.value)} disabled={readOnly} /></FormField>
                <FormField label="Karşı Kurum (Üniversite)">
                    <select value={editedStudent.hostInstitution} onChange={e => { updateStudent("hostInstitution", e.target.value); if (UNIVERSITY_CATALOGS[e.target.value]) updateStudent("hostCountry", UNIVERSITY_CATALOGS[e.target.value].country); }} disabled={readOnly}
                        style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", backgroundColor: readOnly ? "#f5f5f5" : "white", cursor: readOnly ? "not-allowed" : "pointer" }}>
                        <option value="">Üniversite Seçin</option>
                        {Object.keys(UNIVERSITY_CATALOGS).map(uni => <option key={uni} value={uni}>{uni}</option>)}
                    </select>
                </FormField>
                <FormField label="Ülke"><Input value={editedStudent.hostCountry} onChange={e => updateStudent("hostCountry", e.target.value)} disabled /></FormField>
                <FormField label="Dönem">
                    <select value={editedStudent.semester || "Fall 2025"} onChange={e => updateStudent("semester", e.target.value)} disabled={readOnly}
                        style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", backgroundColor: "white", cursor: "pointer" }}>
                        {semesters.map(sem => <option key={sem} value={sem}>{sem.startsWith("Spring") ? sem.replace("Spring", "Bahar") : sem.replace("Fall", "Güz")}</option>)}
                    </select>
                </FormField>
                <FormField label="Karşı Kurum Fakülte Adı"><Input value={editedStudent.hostFaculty || ""} onChange={e => updateStudent("hostFaculty", e.target.value)} disabled={readOnly} placeholder="Örn: Faculty of Engineering" /></FormField>
                <FormField label="Karşı Kurum Bölüm Adı"><Input value={editedStudent.hostDepartment || ""} onChange={e => updateStudent("hostDepartment", e.target.value)} disabled={readOnly} placeholder="Örn: Computer Engineering" /></FormField>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: `2px solid ${C.border}` }}>
                {["outgoing", "return"].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                        padding: "12px 24px", border: "none", background: "transparent",
                        color: activeTab === tab ? C.navy : C.textMuted, fontWeight: 600, fontSize: 14,
                        cursor: "pointer", borderBottom: activeTab === tab ? `3px solid ${C.navy}` : "3px solid transparent",
                        fontFamily: "'Source Sans 3', sans-serif",
                    }}>
                        {tab === "outgoing" ? `Gidiş Eşleştirmeleri (${editedStudent.outgoingMatches.length})` : `Dönüş Eşleştirmeleri (${editedStudent.returnMatches.length})`}
                    </button>
                ))}
            </div>

            {/* Matches */}
            <div style={{ minHeight: 300, maxHeight: 400, overflowY: "auto", marginBottom: 20 }}>
                {activeTab === "outgoing" && (
                    <>
                        {editedStudent.hostInstitution && UNIVERSITY_CATALOGS[editedStudent.hostInstitution] && (
                            <div style={{ padding: 16, background: "#E3F2FD", border: "2px solid #2196F3", borderRadius: 12, marginBottom: 20 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "#1565C0", marginBottom: 12 }}>{editedStudent.hostInstitution} Ders Kataloğu</div>
                                {!readOnly && <Btn onClick={() => setShowCatalogModal(true)} variant="secondary" icon={<PlusIcon />}>Katalogdan Ders Seç ve Ekle</Btn>}
                            </div>
                        )}
                        {editedStudent.outgoingMatches.map(match => (
                            <CourseMatchCard key={match.id} match={match} onDelete={id => deleteMatch("outgoing", id)} onEdit={m => setEditingMatch({ type: "outgoing", match: m })} showGrade={false} type="outgoing" readOnly={readOnly} />
                        ))}
                        {!readOnly && <Btn onClick={() => addMatch("outgoing")} variant="secondary" icon={<PlusIcon />}>Manuel Eşleştirme Ekle</Btn>}
                    </>
                )}
                {activeTab === "return" && (
                    <>
                        {!readOnly && editedStudent.outgoingMatches.length > 0 && (
                            <div style={{ padding: 20, background: "#FFF9E6", border: "2px dashed #FDB022", borderRadius: 12, marginBottom: 20 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: C.navy, marginBottom: 12 }}>Gidiş Eşleştirmelerinden Hızlı Doldur</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                    {editedStudent.outgoingMatches.map((outMatch, idx) => {
                                        const alreadyExists = editedStudent.returnMatches.some(retMatch => JSON.stringify(retMatch.homeCourses) === JSON.stringify(outMatch.homeCourses) && JSON.stringify(retMatch.hostCourses) === JSON.stringify(outMatch.hostCourses));
                                        return (
                                            <button key={idx} onClick={() => copyFromOutgoing(outMatch)} disabled={alreadyExists} style={{ padding: "10px 16px", background: alreadyExists ? "#f5f5f5" : "white", border: `2px solid ${alreadyExists ? "#e0e0e0" : C.gold}`, borderRadius: 8, cursor: alreadyExists ? "not-allowed" : "pointer", fontSize: 13, color: alreadyExists ? C.textMuted : C.navy, opacity: alreadyExists ? 0.5 : 1 }}>
                                                <div style={{ fontWeight: 600, marginBottom: 4 }}>{alreadyExists ? "✓ " : "+ "}Eşleştirme {idx + 1}</div>
                                                <div style={{ fontSize: 11, opacity: 0.8 }}>{outMatch.homeCourses.map(c => c.code || c.name).join(", ").substring(0, 30)}...</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {editedStudent.returnMatches.map(match => (
                            <CourseMatchCard key={match.id} match={match} onDelete={id => deleteMatch("return", id)} onEdit={m => setEditingMatch({ type: "return", match: m })} showGrade={true} type="return" readOnly={readOnly} />
                        ))}
                        {!readOnly && <Btn onClick={() => addMatch("return")} variant="secondary" icon={<PlusIcon />}>Manuel Dönüş Eşleştirmesi Ekle</Btn>}
                    </>
                )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
                <Btn onClick={exportStudentData} variant="secondary" icon={<DownloadIcon />}>Dışa Aktar (JSON)</Btn>
                <div style={{ display: "flex", gap: 10 }}>
                    <Btn onClick={onClose} variant="secondary">{readOnly ? 'Kapat' : 'İptal'}</Btn>
                    {!readOnly && <Btn onClick={() => onSave(editedStudent)}>Kaydet</Btn>}
                </div>
            </div>

            {editingMatch && (
                <CourseMatchEditModal match={editingMatch.match} type={editingMatch.type} onClose={() => setEditingMatch(null)}
                    onSave={updatedMatch => { setEditedStudent(prev => ({ ...prev, [`${editingMatch.type}Matches`]: prev[`${editingMatch.type}Matches`].map(m => m.id === updatedMatch.id ? updatedMatch : m) })); setEditingMatch(null); }} />
            )}
            {showCatalogModal && (
                <CourseCatalogModal university={editedStudent.hostInstitution} onClose={() => setShowCatalogModal(false)}
                    onSelect={hostCourses => { const newMatch = { id: `outgoing${Date.now()}`, homeCourses: [], hostCourses }; setEditedStudent(prev => ({ ...prev, outgoingMatches: [...prev.outgoingMatches, newMatch] })); setShowCatalogModal(false); setEditingMatch({ type: "outgoing", match: newMatch }); }} />
            )}
        </Modal>
    );
};

export default StudentDetailModal;
