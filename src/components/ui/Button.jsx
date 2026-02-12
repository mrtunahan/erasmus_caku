import React, { useState } from 'react';
import { C } from '../../constants/theme';

const Btn = ({ children, onClick, variant = "primary", icon, small, disabled, style: customStyle }) => {
    const btnStyles = {
        primary: { bg: C.navy, color: "#fff", hoverBg: C.navyLight },
        secondary: { bg: C.border, color: C.text, hoverBg: C.borderLight },
        success: { bg: C.green, color: "#fff", hoverBg: "#247d4d" },
        danger: { bg: C.accent, color: "#fff", hoverBg: "#6d1d29" },
        ghost: { bg: "transparent", color: C.blue, hoverBg: C.blueLight },
    };
    const s = btnStyles[variant] || btnStyles.primary;
    const [hover, setHover] = useState(false);
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                padding: small ? "8px 14px" : "10px 18px",
                borderRadius: 8,
                border: variant === "ghost" ? `1px solid ${C.border}` : "none",
        background: disabled ? C.border : (hover ? s.hoverBg : s.bg),
        color: disabled ? C.textMuted : s.color,
        fontSize: small ? 13 : 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'Source Sans 3', sans-serif",
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "all 0.2s",
        opacity: disabled ? 0.5 : 1,
        ...customStyle,
      }}
    >
      {icon}
      {children}
    </button>
  );
};

export default Btn;
