
import React, { useState } from 'react';
import { C as PC } from '../../../constants/theme';
import { REACTION_TYPES } from '../constants';
import { getReactionTotal } from '../utils';

const ReactionBar = ({ reactions, postId, userId, onReact }) => {
    const [showPicker, setShowPicker] = useState(false);

    var totalCount = getReactionTotal(reactions);

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
            <button
                onClick={function () { setShowPicker(!showPicker); }}
                style={{
                    padding: "6px 12px", border: "1px solid " + PC.border,
                    borderRadius: 20, background: "white", cursor: "pointer",
                    fontSize: 13, display: "flex", alignItems: "center", gap: 6,
                    transition: "all 0.2s",
                }}
                onMouseEnter={function (e) { e.currentTarget.style.background = PC.bg; }}
                onMouseLeave={function (e) { e.currentTarget.style.background = "white"; }}
            >
                <span>{"\uD83D\uDC4D"}</span>
                {totalCount > 0 && <span style={{ fontWeight: 600, color: PC.navy }}>{totalCount}</span>}
            </button>

            {/* Emoji Picker */}
            {showPicker && (
                <div style={{
                    position: "absolute", bottom: "100%", left: 0,
                    background: "white", borderRadius: 12, padding: 8,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
                    display: "flex", gap: 4, zIndex: 100,
                    border: "1px solid " + PC.border,
                }}>
                    {REACTION_TYPES.map(function (r) {
                        var count = (reactions && reactions[r.id]) ? reactions[r.id].length : 0;
                        var isActive = reactions && reactions[r.id] && reactions[r.id].indexOf(userId) >= 0;
                        return (
                            <button
                                key={r.id}
                                onClick={function () {
                                    onReact(postId, r.id);
                                    setShowPicker(false);
                                }}
                                style={{
                                    padding: "6px 10px", border: isActive ? "2px solid " + PC.blue : "1px solid transparent",
                                    borderRadius: 8, background: isActive ? PC.blueLight : "transparent",
                                    cursor: "pointer", fontSize: 20, display: "flex",
                                    flexDirection: "column", alignItems: "center", gap: 2,
                                    transition: "transform 0.15s",
                                }}
                                onMouseEnter={function (e) { e.currentTarget.style.transform = "scale(1.2)"; }}
                                onMouseLeave={function (e) { e.currentTarget.style.transform = "scale(1)"; }}
                            >
                                {r.emoji}
                                {count > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: PC.navy }}>{count}</span>}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Mevcut reaksiyonlar */}
            {reactions && Object.keys(reactions).map(function (key) {
                var arr = reactions[key] || [];
                if (arr.length === 0) return null;
                var r = REACTION_TYPES.find(function (rt) { return rt.id === key; });
                if (!r) return null;
                var isActive = arr.indexOf(userId) >= 0;
                return (
                    <button
                        key={key}
                        onClick={function () { onReact(postId, key); }}
                        style={{
                            padding: "4px 10px", border: isActive ? "1px solid " + PC.blue : "1px solid " + PC.border,
                            borderRadius: 16, background: isActive ? PC.blueLight : "white",
                            cursor: "pointer", fontSize: 14, display: "flex",
                            alignItems: "center", gap: 4,
                        }}
                    >
                        {r.emoji} <span style={{ fontSize: 12, fontWeight: 600, color: PC.navy }}>{arr.length}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default ReactionBar;
