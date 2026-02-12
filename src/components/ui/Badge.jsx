import React from 'react';
import { generateColorFromString } from '../../utils/colors';

const Badge = ({ children, color }) => {
    const bg = color || generateColorFromString(children?.toString() || "");
    return (
        <span style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: 16,
            fontSize: 11,
            fontWeight: 700,
            background: \`\${bg}20\`,
      color: bg,
      letterSpacing: "0.02em",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: bg, marginRight: 6 }}></span>
      {children}
    </span>
  );
};

export default Badge;
