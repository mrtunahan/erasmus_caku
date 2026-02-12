import React from 'react';
import { C } from '../../constants/theme';

const FormField = ({ label, children }) => (
    <div style={{ marginBottom: 16 }}>
        <label style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: C.navy,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
        }}>{label}</label>
        {children}
    </div>
);

export default FormField;
