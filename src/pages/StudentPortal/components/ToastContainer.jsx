
import React from 'react';

const ToastContainer = ({ toasts }) => {
    if (!toasts || toasts.length === 0) return null;
    return (
        <div style={{
            position: "fixed", top: 20, right: 20, zIndex: 9999,
            display: "flex", flexDirection: "column", gap: 8,
            pointerEvents: "none",
        }}>
            {toasts.map(function (t) {
                var bgColor = t.type === "error" ? "#FEE2E2" : t.type === "info" ? "#DBEAFE" : "#D1FAE5";
                var borderColor = t.type === "error" ? "#EF4444" : t.type === "info" ? "#3B82F6" : "#10B981";
                var textColor = t.type === "error" ? "#991B1B" : t.type === "info" ? "#1E40AF" : "#065F46";
                var icon = t.type === "error" ? "\u2716" : t.type === "info" ? "\u2139" : "\u2714";
                return (
                    <div key={t.id} style={{
                        padding: "12px 20px", borderRadius: 12,
                        background: bgColor, border: "1px solid " + borderColor,
                        color: textColor, fontSize: 13, fontWeight: 600,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                        display: "flex", alignItems: "center", gap: 8,
                        animation: "fadeInRight 0.3s ease",
                        pointerEvents: "auto",
                    }}>
                        <span style={{ fontSize: 15 }}>{icon}</span>
                        {t.message}
                    </div>
                );
            })}
        </div>
    );
};

export default ToastContainer;
