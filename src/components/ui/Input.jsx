import React from 'react';
import { C } from '../../constants/theme';

const Input = ({ value, onChange, placeholder, type = "text", disabled, ...rest }) => (
    <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        {...rest}
        style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
      fontSize: 14,
      fontFamily: "'Source Sans 3', sans-serif",
      outline: "none",
      transition: "border-color 0.2s",
      backgroundColor: disabled ? "#f5f5f5" : "white",
      cursor: disabled ? "not-allowed" : "text",
    }}
    onFocus={e => !disabled && (e.target.style.borderColor = C.navy)}
    onBlur={e => !disabled && (e.target.style.borderColor = C.border)}
  />
);

export default Input;
