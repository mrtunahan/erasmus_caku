import React from 'react';
import { createPortal } from 'react-dom';
import { C } from '../../constants/theme';
import { XIcon } from './Icons'; // Assuming Icons are also extracted

const Modal = ({ open, onClose, title, children, width = 600 }) => {
    if (!open) return null;
    return createPortal(
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 20,
      backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div style={{
        background: C.card,
        borderRadius: 16,
        width,
        maxWidth: "100%",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        border: `1px solid ${C.border}`,
        animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: "20px 24px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.navy, fontFamily: "'Playfair Display', serif" }}>{title}</h3>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: C.textMuted }}>
            <XIcon />
          </button>
        </div>
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>{children}</div>
      </div >
    <style>{`
        @keyframes slideIn {from {transform: translateY(20px); opacity: 0; } to {transform: translateY(0); opacity: 1; } }
      `}</style>
    </div >,
    document.body
  );
};

export default Modal;
