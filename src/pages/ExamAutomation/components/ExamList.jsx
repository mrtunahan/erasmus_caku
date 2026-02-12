import React from 'react';
import { Badge } from '../../components/ui';
import { SINIF_COLORS } from '../constants';
import { formatDateISO, getDayName, formatDate, parseDateISO } from '../utils';
import { C } from '../../../constants/theme';

const ExamList = ({ placedExams, onExamClick }) => {
    const sorted = [...placedExams].sort((a, b) => {
        if (a.sinif !== b.sinif) return a.sinif - b.sinif;
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.timeSlot.localeCompare(b.timeSlot);
    });

    if (sorted.length === 0) {
        return (
            <div style={{ padding: 40, textAlign: "center", color: "#999", background: "white", borderRadius: 12, border: `1px solid ${C.border}` }}>
        Henüz takvime ders yerleştirilmedi. Dersler sekmesinden dersleri sürükleyip takvim görünümüne bırakın.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", background: "white", borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.navy, color: "white" }}>
            <th style={{ padding: "12px 16px", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.1)" }}>Sınıf</th>
            <th style={{ padding: "12px 16px", textAlign: "left", borderRight: "1px solid rgba(255,255,255,0.1)" }}>Ders Kodu - İsmi</th>
            <th style={{ padding: "12px 16px", textAlign: "left", borderRight: "1px solid rgba(255,255,255,0.1)" }}>İlgili Öğretim Üyesi</th>
            <th style={{ padding: "12px 16px", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.1)" }}>Tarih - Saat - Süre</th>
            <th style={{ padding: "12px 16px", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.1)" }}>Öğrenci Sayısı</th>
            <th style={{ padding: "12px 16px", textAlign: "left", borderRight: "1px solid rgba(255,255,255,0.1)" }}>Gözetmen</th>
            <th style={{ padding: "12px 16px", textAlign: "center" }}>Sınıf/Salon</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((exam, i) => {
            const color = SINIF_COLORS[exam.sinif] || SINIF_COLORS[1];
            const dateObj = parseDateISO(exam.date);
            const dateStr = dateObj ? `${formatDate(dateObj)} ${getDayName(dateObj)}` : "";
            return (
              <tr
                key={i}
                onClick={() => onExamClick(exam)}
                style={{
                  background: i % 2 === 0 ? "white" : "#F9FAFB",
                  cursor: "pointer",
                  borderBottom: `1px solid ${C.border}`,
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${color.bg}40`}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "white" : "#F9FAFB"}
              >
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <Badge style={{ background: color.bg, color: color.text }}>{color.label}</Badge>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: 600, color: C.text }}>{exam.code}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{exam.name}</div>
                </td>
                <td style={{ padding: "12px 16px" }}>{exam.professor || "-"}</td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ fontWeight: 600 }}>{dateStr}</div>
                  <div style={{ fontSize: 12 }}>{exam.timeSlot} ({exam.duration} dk)</div>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: "bold" }}>
                  {exam.studentCount || "-"}
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12 }}>{exam.supervisor || "-"}</td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <span style={{ background: "#F3F4F6", padding: "4px 8px", borderRadius: 4, fontWeight: 600, color: "#374151" }}>
                    {exam.room || "-"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ExamList;
