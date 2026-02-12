import React from 'react';
import { C } from '../../constants/theme';

const Card = ({ children, title, actions, noPadding }) => (
    <div style={{
        background: C.card,
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        border: `1px solid ${C.border}`,
    marginBottom: 24,
  }}>
    {title && (
      <div style={{
        padding: "20px 24px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <h2 style={{
          fontSize: 18,
          fontWeight: 600,
          color: C.navy,
          fontFamily: "'Playfair Display', serif",
        }}>{title}</h2>
        {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
      </div>
    )}
    <div style={{ padding: noPadding ? 0 : 24 }}>{children}</div>
  </div>
);

export default Card;
