
import React from 'react';
import { C as PC } from '../../../constants/theme';
import { ICONS, SvgIcon } from '../../../components/ui/Icons';
import { DY } from '../constants';
import { getReactionTotal } from '../utils';

const TrendingSidebar = ({ posts }) => {
    // En çok etkileşim alan 5 gönderi
    var trending = [...posts]
        .map(function (p) {
            return Object.assign({}, p, { engagement: getReactionTotal(p.reactions) + (p.commentCount || 0) + (p.views || 0) });
        })
        .sort(function (a, b) { return b.engagement - a.engagement; })
        .slice(0, 5);

    if (trending.length === 0) return null;

    return (
        <div style={{
            background: "white", borderRadius: 16, padding: 20,
            border: "1px solid " + PC.borderLight,
        }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: DY.warm, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <SvgIcon path={ICONS.trending} size={18} color={DY.gold} /> Trend Konular
            </h3>
            {trending.map(function (p, idx) {
                return (
                    <div key={p.id} style={{
                        padding: "10px 0",
                        borderBottom: idx < trending.length - 1 ? "1px solid " + PC.borderLight : "none",
                    }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span style={{
                                fontWeight: 800, fontSize: 16, color: PC.gold,
                                width: 20, textAlign: "center",
                            }}>{idx + 1}</span>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: PC.navy, lineHeight: 1.4 }}>
                                    {p.title || p.content.substring(0, 50) + "..."}
                                </div>
                                <div style={{ fontSize: 11, color: PC.textMuted, marginTop: 4 }}>
                                    {getReactionTotal(p.reactions)} tepki · {p.commentCount || 0} yorum
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TrendingSidebar;
