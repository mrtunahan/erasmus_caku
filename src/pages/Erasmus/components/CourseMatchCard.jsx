
import React from 'react';
import { C } from '../../../constants/theme';
import { EditIcon, TrashIcon, ArrowRightIcon } from '../../../components/ui/icons';

const CourseMatchCard = ({ match, onDelete, onEdit, showGrade, type, readOnly = false }) => {
    const homeTotal = match.homeCourses.reduce((sum, c) => sum + (parseFloat(c.credits) || 0), 0);
    const hostTotal = match.hostCourses.reduce((sum, c) => sum + (parseFloat(c.credits) || 0), 0);

    return (
        <div style={{ background: C.bg, borderRadius: 10, padding: 20, marginBottom: 16, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, background: "#EEF0F5", padding: "6px 10px", borderRadius: 6, display: "inline-block" }}>Kendi Kurumumuz</div>
                    {match.homeCourses.map((course, i) => (
                        <div key={i} style={{ background: C.card, padding: "10px 12px", borderRadius: 8, marginBottom: 6, border: `1px solid ${C.border}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{course.code}</span>
                                <span style={{ fontSize: 14, fontWeight: 500 }}>{course.name}</span>
                            </div>
                            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{course.credits} AKTS</div>
                        </div>
                    ))}
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginTop: 8 }}>Toplam: {homeTotal} AKTS</div>
                </div>
                <div style={{ color: C.gold, flexShrink: 0 }}><ArrowRightIcon /></div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, background: C.greenLight, padding: "6px 10px", borderRadius: 6, display: "inline-block" }}>Karşı Kurum</div>
                    {match.hostCourses.map((course, i) => (
                        <div key={i} style={{ background: C.card, padding: "10px 12px", borderRadius: 8, marginBottom: 6, border: `1px solid ${C.border}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{course.code}</span>
                                <span style={{ fontSize: 14, fontWeight: 500 }}>{course.name}</span>
                            </div>
                            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{course.credits} AKTS</div>
                        </div>
                    ))}
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.green, marginTop: 8 }}>Toplam: {hostTotal} AKTS</div>
                </div>
                {showGrade && (
                    <div style={{ background: C.card, padding: "12px 16px", borderRadius: 8, border: `2px solid ${C.navy}`, textAlign: "center", minWidth: 120 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Notlar</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, fontFamily: "'Playfair Display', serif" }}>
                            {match.hostGrade || "A"} → {match.homeGrade || "Muaf"}
                        </div>
                        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>Karşı → Kendi</div>
                    </div>
                )}
                {!readOnly && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <button onClick={() => onEdit(match)} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.navy, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><EditIcon /></button>
                        <button onClick={() => onDelete(match.id)} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.accent, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><TrashIcon /></button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourseMatchCard;
