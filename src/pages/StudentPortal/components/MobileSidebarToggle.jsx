
import React, { useState } from 'react';
import { C as PC } from '../../../constants/theme';

const MobileSidebarToggle = ({ children }) => {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <button
                onClick={function () { setOpen(!open); }}
                style={{
                    width: "100%", padding: "12px 16px", border: "1px solid " + PC.border,
                    borderRadius: 12, background: "white", cursor: "pointer",
                    fontSize: 13, fontWeight: 600, color: PC.navy,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: open ? 12 : 0,
                }}
            >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    Trend & İstatistikler
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>
            {open && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
                    {children}
                </div>
            )}
        </div>
    );
};

export default MobileSidebarToggle;
