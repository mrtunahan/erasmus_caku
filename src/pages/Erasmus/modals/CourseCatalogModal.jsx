
import React, { useState } from 'react';
import { C } from '../../../constants/theme';
import { Btn } from '../../../components/ui';
import { UNIVERSITY_CATALOGS } from '../constants';

const CourseCatalogModal = ({ university, onClose, onSelect }) => {
    const [selectedCourses, setSelectedCourses] = useState([]);
    const catalog = UNIVERSITY_CATALOGS[university];
    if (!catalog) return null;

    const toggleCourse = (course) => {
        setSelectedCourses(prev => prev.find(c => c.code === course.code) ? prev.filter(c => c.code !== course.code) : [...prev, { ...course }]);
    };
    const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);

    return (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 20 }}>
            {/* Inline styles kept from legacy, can be refactored to CSS/Tailwind later */}
            <div style={{ background: C.card, borderRadius: 16, maxWidth: 900, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                <div style={{ padding: 24, borderBottom: `2px solid ${C.border}` }}>
                    <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.navy, fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>Ders Katalogu</h3>
                    <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>{university}</p>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                    <div style={{ display: "grid", gap: 12 }}>
                        {catalog.courses.map((course, idx) => {
                            const isSelected = selectedCourses.find(c => c.code === course.code);
                            return (
                                <div key={idx} onClick={() => toggleCourse(course)} style={{ padding: 16, border: `2px solid ${isSelected ? C.green : C.border}`, borderRadius: 12, cursor: "pointer", background: isSelected ? C.greenLight : "white", transition: "all 0.2s" }}>
                                    <div style={{ display: "flex", alignItems: "start", gap: 12 }}>
                                        <div style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${isSelected ? C.green : C.border}`, background: isSelected ? C.green : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                                            {isSelected && <div style={{ color: "white", fontSize: 14, fontWeight: 700 }}>✓</div>}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 15, fontWeight: 600, color: C.navy, marginBottom: 4 }}>{course.name}</div>
                                            <div style={{ fontSize: 13, color: C.textMuted, display: "flex", gap: 16 }}>
                                                <span>Kod: <strong>{course.code}</strong></span>
                                                <span>AKTS: <strong>{course.credits}</strong></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div style={{ padding: 24, borderTop: `2px solid ${C.border}`, background: C.bg }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div style={{ fontSize: 14, color: C.textMuted }}>Secili: <strong>{selectedCourses.length}</strong> ders</div>
                        <div style={{ fontSize: 14, color: C.navy, fontWeight: 600 }}>Toplam: <strong>{totalCredits}</strong> AKTS</div>
                    </div>
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <Btn onClick={onClose} variant="secondary">Iptal</Btn>
                        <Btn onClick={() => selectedCourses.length > 0 && onSelect(selectedCourses)} disabled={selectedCourses.length === 0}>{selectedCourses.length} Ders Ekle</Btn>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseCatalogModal;
