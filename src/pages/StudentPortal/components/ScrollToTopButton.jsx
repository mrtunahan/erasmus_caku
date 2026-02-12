
import React from 'react';
import { C as PC } from '../../../constants/theme';
import useScrollTop from '../../../hooks/useScrollTop';

const ScrollToTopButton = () => {
    var showBtn = useScrollTop(400);
    if (!showBtn) return null;
    return (
        <button
            onClick={function () { window.scrollTo({ top: 0, behavior: "smooth" }); }}
            title="Yukarı Kaydır"
            style={{
                position: "fixed", bottom: 28, right: 28, zIndex: 9998,
                width: 48, height: 48, borderRadius: "50%",
                border: "none", background: "linear-gradient(135deg, " + PC.navy + ", " + PC.navyLight + ")",
                color: "white", cursor: "pointer",
                boxShadow: "0 4px 16px rgba(27,42,74,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "fadeInUp 0.3s ease",
                transition: "transform 0.2s",
            }}
            onMouseEnter={function (e) { e.currentTarget.style.transform = "scale(1.1)"; }}
            onMouseLeave={function (e) { e.currentTarget.style.transform = "scale(1)"; }}
        >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="18 15 12 9 6 15" />
            </svg>
        </button>
    );
};

export default ScrollToTopButton;
