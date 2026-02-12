
import React from 'react';
import { getInitials, hashColor } from '../utils';

const Avatar = ({ name, size }) => {
    var s = size || 40;
    var initials = getInitials(name);
    var bg = hashColor(name || "");
    return (
        <div style={{
            width: s, height: s, borderRadius: "50%",
            background: "linear-gradient(135deg, " + bg + ", " + bg + "CC)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: s * 0.38, fontWeight: 700,
            flexShrink: 0, boxShadow: "0 2px 8px " + bg + "40",
        }}>{initials}</div>
    );
};

export default Avatar;
