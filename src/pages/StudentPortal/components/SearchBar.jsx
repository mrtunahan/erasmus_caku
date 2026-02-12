
import React from 'react';
import { C as PC } from '../../../constants/theme';

const SearchBar = ({ value, onChange }) => (
    <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={PC.textMuted}
            strokeWidth="2" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
            value={value}
            onChange={function (e) { onChange(e.target.value); }}
            placeholder="Gönderi ara..."
            style={{
                width: "100%", padding: "10px 14px 10px 42px",
                border: "1px solid " + PC.border, borderRadius: 12,
                fontSize: 14, outline: "none", background: "white",
            }}
        />
    </div>
);

export default SearchBar;
