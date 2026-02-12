import React from 'react';
import { SINIF_COLORS } from '../constants';

const DraggableCourseCard = ({ course, isPlaced, placedCount = 0 }) => {
    const color = SINIF_COLORS[course.sinif] || SINIF_COLORS[1];

    const handleDragStart = (e) => {
        e.dataTransfer.setData("application/json", JSON.stringify(course));
        e.dataTransfer.effectAllowed = "move";
        e.currentTarget.style.opacity = "0.5";
    };

    const handleDragEnd = (e) => {
        e.currentTarget.style.opacity = "1";
    };

    return (
        <div
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={{
                padding: "8px 10px",
                background: color.bg,
                color: color.text,
                borderRadius: 6,
                fontSize: 12,
                cursor: "grab",
                border: `1px solid ${color.text}30`,
        transition: "all 0.2s",
        userSelect: "none",
        position: "relative",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600, fontSize: 12 }}>{course.code}</div>
        {placedCount > 0 && (
          <span style={{
            background: color.text, color: "white", borderRadius: 10,
            padding: "1px 6px", fontSize: 9, fontWeight: 700, minWidth: 16, textAlign: "center",
          }}>{placedCount}</span>
        )}
      </div>
      <div style={{ fontSize: 11, marginTop: 2, lineHeight: 1.3 }}>{course.name}</div>
      <div style={{ fontSize: 10, marginTop: 3, opacity: 0.7 }}>{course.duration} dk</div>
    </div>
  );
};

export default DraggableCourseCard;
