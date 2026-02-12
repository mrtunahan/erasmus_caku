
import React, { useState } from 'react';
import { C } from '../../../constants/theme';
import { Btn, Input, Modal, FormField, TrashIcon, PlusIcon, ArrowRightIcon } from '../../../components/ui';
import { convertGrade } from '../utils';
import HomeInstitutionCatalogModal from './HomeInstitutionCatalogModal';

const CourseMatchEditModal = ({ match, type, onClose, onSave }) => {
    // Deep copy match to avoid mutating prop directly
    const [editedMatch, setEditedMatch] = useState(JSON.parse(JSON.stringify(match)));
    const [showHomeCatalog, setShowHomeCatalog] = useState(false);

    const addCourse = (side) => {
        setEditedMatch(prev => ({ ...prev, [`${side}Courses`]: [...prev[`${side}Courses`], { code: "", name: "", credits: 0 }] }));
    };
    const addCoursesFromCatalog = (side, courses) => {
        setEditedMatch(prev => ({ ...prev, [`${side}Courses`]: [...prev[`${side}Courses`], ...courses] }));
    };
    const updateCourse = (side, index, field, value) => {
        setEditedMatch(prev => ({ ...prev, [`${side}Courses`]: prev[`${side}Courses`].map((c, i) => i === index ? { ...c, [field]: field === "credits" ? parseFloat(value) || 0 : value } : c) }));
    };
    const removeCourse = (side, index) => {
        setEditedMatch(prev => ({ ...prev, [`${side}Courses`]: prev[`${side}Courses`].filter((_, i) => i !== index) }));
    };

    return (
        <Modal open={true} onClose={onClose} title="Ders Eşleştirmesini Düzenle" width={900}>
            {type === "return" && (
                <div style={{ padding: 16, background: "#E3F2FD", border: "2px solid #2196F3", borderRadius: 12, marginBottom: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1565C0", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>Duzenleme Ipucu</div>
                    <div style={{ fontSize: 13, color: "#424242" }}>Bu eslestirme gidis verileriyle dolduruldu. Ogrenci farkli bir ders aldiysa asagidaki alanlardan duzenleyebilirsiniz.</div>
                </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 24 }}>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, background: "#EEF0F5", padding: "8px 12px", borderRadius: 8 }}>Kendi Kurumumuz</div>
                    {editedMatch.homeCourses.map((course, i) => (
                        <div key={i} style={{ padding: 16, background: C.bg, borderRadius: 8, marginBottom: 12, border: `1px solid ${C.border}` }}>
                            <FormField label="Ders Kodu"><Input value={course.code} onChange={e => updateCourse("home", i, "code", e.target.value)} placeholder="BIL201" /></FormField>
                            <FormField label="Ders Adi"><Input value={course.name} onChange={e => updateCourse("home", i, "name", e.target.value)} placeholder="Veri Yapilari" /></FormField>
                            <FormField label="AKTS"><Input type="number" value={course.credits} onChange={e => updateCourse("home", i, "credits", e.target.value)} /></FormField>
                            <Btn onClick={() => removeCourse("home", i)} variant="danger" small><TrashIcon /> Sil</Btn>
                        </div>
                    ))}
                    <div style={{ display: "flex", gap: 8 }}>
                        <Btn onClick={() => setShowHomeCatalog(true)} variant="secondary" small icon={<PlusIcon />}>Katalogdan Sec</Btn>
                        <Btn onClick={() => addCourse("home")} variant="secondary" small icon={<PlusIcon />}>Manuel Ekle</Btn>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: C.gold, paddingTop: 40 }}><ArrowRightIcon /></div>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.green, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, background: C.greenLight, padding: "8px 12px", borderRadius: 8 }}>Karşı Kurum</div>
                    {editedMatch.hostCourses.map((course, i) => (
                        <div key={i} style={{ padding: 16, background: C.bg, borderRadius: 8, marginBottom: 12, border: `1px solid ${C.border}` }}>
                            <FormField label="Ders Kodu"><Input value={course.code} onChange={e => updateCourse("host", i, "code", e.target.value)} placeholder="CS201" /></FormField>
                            <FormField label="Ders Adi"><Input value={course.name} onChange={e => updateCourse("host", i, "name", e.target.value)} placeholder="Data Structures" /></FormField>
                            <FormField label="AKTS"><Input type="number" value={course.credits} onChange={e => updateCourse("host", i, "credits", e.target.value)} /></FormField>
                            <Btn onClick={() => removeCourse("host", i)} variant="danger" small><TrashIcon /> Sil</Btn>
                        </div>
                    ))}
                    <Btn onClick={() => addCourse("host")} variant="secondary" small icon={<PlusIcon />}>Manuel Ders Ekle</Btn>
                </div>
            </div>
            {type === "return" && (
                <div style={{ marginTop: 24, padding: 20, background: C.goldPale, borderRadius: 10, border: `1px solid ${C.goldLight}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>Not Bilgileri</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <FormField label="Karşı Kurumdan Alinan Not">
                            <Input value={editedMatch.hostGrade || ""} onChange={e => setEditedMatch(prev => ({ ...prev, hostGrade: e.target.value }))} placeholder="A, B+, 85, vb." />
                            {editedMatch.hostGrade && (
                                <div style={{ marginTop: 8, padding: 8, background: '#fffacd', borderRadius: 6, fontSize: 12, fontWeight: 600, color: C.navy, border: '2px solid #ffd700' }}>
                                    Donusum: <strong>{convertGrade(editedMatch.hostGrade)}</strong>
                                </div>
                            )}
                        </FormField>
                        <FormField label="Kendi Kurumumuzdaki Karsilik">
                            <Input value={editedMatch.homeGrade || "Muaf"} onChange={e => setEditedMatch(prev => ({ ...prev, homeGrade: e.target.value }))} placeholder="Muaf, AA, BB, vb." />
                        </FormField>
                    </div>
                </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
                <Btn onClick={onClose} variant="secondary">Iptal</Btn>
                <Btn onClick={() => onSave(editedMatch)}>Kaydet</Btn>
            </div>
            {showHomeCatalog && (
                <HomeInstitutionCatalogModal onClose={() => setShowHomeCatalog(false)} onSelect={(courses) => { addCoursesFromCatalog("home", courses); setShowHomeCatalog(false); }} />
            )}
        </Modal>
    );
};

export default CourseMatchEditModal;
