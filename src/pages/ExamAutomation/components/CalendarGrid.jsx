import React, { useMemo } from 'react';
import CalendarCell from './CalendarCell';
import { TIME_SLOTS } from '../constants';
import { getDayName, formatDate } from '../utils';
import { C } from '../../../constants/theme';

const CalendarGrid = ({ weekDays, placedExams, onDropExam, onExamClick }) => {
    return (
        <div style={{ overflowX: "auto", background: "white", borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 800 }}>
        <thead>
          <tr>
            <th style={{
              position: "sticky", left: 0, top: 0, zIndex: 20,
              background: "#F9FAFB", borderBottom: "2px solid #E5E7EB", borderRight: "2px solid #E5E7EB",
              width: 60, height: 50, fontSize: 13, color: "#6B7280"
            }}>Saat</th>
            {weekDays.map((d, i) => (
              <th key={i} style={{
                position: "sticky", top: 0, zIndex: 10,
                background: "#F9FAFB", borderBottom: "2px solid #E5E7EB",
                padding: "10px 0", fontSize: 13, fontWeight: 600, color: C.navy, minWidth: 140
              }}>
                <div>{getDayName(d)}</div>
                <div style={{ fontSize: 11, fontWeight: 400, color: "#9CA3AF" }}>{formatDate(d)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_SLOTS.map((time, slotIndex) => (
            <tr key={time}>
              <td style={{
                position: "sticky", left: 0, zIndex: 10,
                background: "#F9FAFB", borderRight: "2px solid #E5E7EB", borderBottom: "1px solid #E5E7EB",
                textAlign: "center", fontSize: 11, color: "#6B7280", fontWeight: 500, height: 40
              }}>
                {time}
              </td>
              {weekDays.map((d, dayIndex) => (
                <CalendarCell
                  key={dayIndex}
                  day={d}
                  timeSlot={time}
                  slotIndex={slotIndex}
                  placedExams={placedExams}
                  onDrop={onDropExam}
                  onExamClick={onExamClick}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CalendarGrid;
