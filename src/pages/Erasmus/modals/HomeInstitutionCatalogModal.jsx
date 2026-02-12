
import React, { useState } from 'react';
import { C } from '../../../constants/theme';
import { Btn } from '../../../components/ui';
import { HOME_INSTITUTION_CATALOG } from '../constants';

const HomeInstitutionCatalogModal = ({ onClose, onSelect }) => {
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [filterYear, setFilterYear] = useState("all");
    const [filterSemester, setFilterSemester] = useState("all");
    const [filterType, setFilterType] = useState("all");

    const toggleCourse = (course) => {
        setSelectedCourses(prev => prev.find(c => c.code === course.code) ? prev.filter(c => c.code !== course.code) : [...prev, { code: course.code, name: course.name, credits: course.credits }]);
    };
    const filteredCourses = HOME_INSTITUTION_CATALOG.courses.filter(c => {
        if (filterYear !== "all" && c.year !== parseInt(filterYear) && c.year !== 0) return false;
        if (filterSemester !== "all" && c.semester !== filterSemester && c.semester !== "Any") return false;
        if (filterType !== "all" && c.type !== filterType) return false;
        return true;
    });
    const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);

    const filterStyle = { padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", backgroundColor: "white", cursor: "pointer" };

    return (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10001, padding: 20 }}>
            <div style={{ background: C.card, borderRadius: 16, maxWidth: 900, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                <div style={{ padding: 24, borderBottom: `2px solid ${C.border}` }}>
                    <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.navy, fontFamily: "'Playfair Display', serif", marginBottom: 4 }}>{HOME_INSTITUTION_CATALOG.name}</h3>
                    <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>{HOME_INSTITUTION_CATALOG.department} - Ders Katalogu</p>
                    <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={filterStyle}>
                            <option value="all">Tum Siniflar</option><option value="1">1. Sinif</option><option value="2">2. Sinif</option><option value="3">3. Sinif</option><option value="4">4. Sinif</option><option value="0">Secmeli</option>
                        </select>
                        <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} style={filterStyle}>
                            <option value="all">Tum Donemler</option><option value="Fall">Guz</option><option value="Spring">Bahar</option>
                        </select>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={filterStyle}>
                            <option value="all">Tumu</option><option value="Zorunlu">Zorunlu</option><option value="Seçmeli">Secmeli</option>
                        </select>
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                    <div style={{ display: "grid", gap: 12 }}>
                        {filteredCourses.map((course, idx) => {
                            const isSelected = selectedCourses.find(c => c.code === course.code);
                            return (
                                <div key={idx} onClick={() => toggleCourse(course)} style={{ padding: 16, border: `2px solid ${isSelected ? C.navy : C.border}`, borderRadius: 12, cursor: "pointer", background: isSelected ? "#EEF0F5" : "white", transition: "all 0.2s" }}>
                                    <div style={{ display: "flex", alignItems: "start", gap: 12 }}>
                                        <div style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${isSelected ? C.navy : C.border}`, background: isSelected ? C.navy : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                                            {isSelected && <div style={{ color: "white", fontSize: 14, fontWeight: 700 }}>✓</div>}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                                <div style={{ fontSize: 15, fontWeight: 600, color: C.navy }}>{course.name}</div>
                                                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: course.type === "Zorunlu" ? "#DBEAFE" : "#FEF3C7", color: course.type === "Zorunlu" ? "#1E40AF" : "#92400E" }}>{course.type}</span>
                                            </div>
                                            <div style={{ fontSize: 13, color: C.textMuted, display: "flex", gap: 16, flexWrap: "wrap" }}>
                                                <span>Kod: <strong>{course.code}</strong></span>
                                                <span>AKTS: <strong>{course.credits}</strong></span>
                                                {course.year > 0 && <span>Sinif: <strong>{course.year}</strong></span>}
                                                {course.semester !== "Any" && <span>Donem: <strong>{course.semester === "Fall" ? "Guz" : "Bahar"}</strong></span>}
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

export default HomeInstitutionCatalogModal;
