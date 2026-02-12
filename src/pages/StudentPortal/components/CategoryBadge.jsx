
import React from 'react';
import { getCategoryInfo } from '../utils';
import { ICONS, SvgIcon } from '../../../components/ui/Icons';

const CategoryBadge = ({ category, small }) => {
    var cat = getCategoryInfo(category);
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: small ? "3px 10px" : "5px 14px",
            borderRadius: 20, fontSize: small ? 11 : 12,
            fontWeight: 600, color: cat.color, background: cat.bg,
            transition: "all 0.15s",
        }}>
            <SvgIcon path={ICONS[cat.icon]} size={small ? 12 : 14} color={cat.color} />
            {cat.label}
        </span>
    );
};

export default CategoryBadge;
