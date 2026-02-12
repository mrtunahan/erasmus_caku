import React, { useState } from 'react';
import { SINIF_COLORS, TIME_SLOTS } from '../constants';
import { formatDateISO, slotSpan, timeToSlotIndex } from '../utils';

const CalendarCell = ({ day, timeSlot, slotIndex, placedExams, onDrop, onExamClick }) => {
    const [dragOver, setDragOver] = useState(false);
    const dateStr = formatDateISO(day);

    const examHere = placedExams.find(e => e.date === dateStr && e.timeSlot === timeSlot);

    const coveredBy = placedExams.find(e => {
        if (e.date !== dateStr) return false;
        const startIdx = timeToSlotIndex(e.timeSlot);
        const span = slotSpan(e.duration);
        return slotIndex > startIdx && slotIndex < startIdx + span;
    });

    if (coveredBy) return null;

    const examSpan = examHere ? slotSpan(examHere.duration) : 1;
    const color = examHere ? SINIF_COLORS[examHere.sinif] || SINIF_COLORS[1] : null;

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOver(true);
    };

    const handleDragLeave = () => setDragOver(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        try {
            const courseData = JSON.parse(e.dataTransfer.getData("application/json"));
            onDrop(courseData, dateStr, timeSlot);
        } catch (err) {
            console.error("Drop error:", err);
        }
    };

    const cellHeight = 40;

    return (
        <td
            onDragOver={!examHere ? handleDragOver : undefined}
            onDragLeave={!examHere ? handleDragLeave : undefined}
            onDrop={!examHere ? handleDrop : undefined}
            onClick={examHere ? () => onExamClick(examHere) : undefined}
            rowSpan={examHere ? examSpan : 1}
            style={{
                border: "1px solid #E5E7EB",
                padding: 0,
                height: examHere ? cellHeight * examSpan : cellHeight,
                minWidth: 140,
                maxWidth: 180,
                verticalAlign: "top",
                background: examHere
                    ? color.bg
                    : dragOver
                        ? "#DBEAFE"
                        : "white",
                cursor: examHere ? "pointer" : "default",
                transition: "background 0.15s",
                position: "relative",
            }}
        >
            {examHere && (
                <div style={{
                    padding: "3px 5px",
                    fontSize: 10,
                    lineHeight: 1.3,
                    color: color.text,
                    height: "100%",
                    overflow: "hidden",
                    fontWeight: 600,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                }}>
                    <div>{examHere.code}</div>
                    <div style={{ fontWeight: 400, fontSize: 9 }}>{examHere.name}</div>
                    {examHere.studentCount > 0 && (
                        <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{examHere.studentCount} öğrenci</div>
                    )}
                </div>
            )}
        </td>
    );
};

export default CalendarCell;
