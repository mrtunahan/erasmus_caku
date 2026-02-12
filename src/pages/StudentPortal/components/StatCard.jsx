
import React from 'react';
import { ICONS, SvgIcon } from '../../../components/ui/Icons';
import { DY } from '../constants';
import { C as PC } from '../../../constants/theme';

const StatCard = ({ label, value, color, icon }) => (
    <div className="daisy-card" style={{
        padding: 18, display: "flex", alignItems: "center", gap: 14,
        flex: 1, minWidth: 140,
    }}>
        <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: "linear-gradient(135deg, " + color + "20, " + color + "10)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid " + color + "25",
        }}>
            <SvgIcon path={ICONS[icon]} size={22} color={color} />
        </div>
        <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: DY.warm }}>{value}</div>
            <div style={{ fontSize: 12, color: PC.textMuted, fontWeight: 500 }}>{label}</div>
        </div>
    </div>
);

export default StatCard;
