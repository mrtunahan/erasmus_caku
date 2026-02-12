
import React from 'react';
import { C as PC } from '../../../constants/theme';

const PollWidget = ({ pollOptions, pollVotes, postId, userId, onVote }) => {
    var totalVotes = 0;
    var userVotedIdx = -1;
    if (pollVotes) {
        Object.keys(pollVotes).forEach(function (key) {
            var arr = pollVotes[key] || [];
            totalVotes += arr.length;
            if (arr.indexOf(userId) >= 0) userVotedIdx = parseInt(key);
        });
    }
    var hasVoted = userVotedIdx >= 0;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {pollOptions.map(function (option, idx) {
                var voteCount = (pollVotes && pollVotes[String(idx)]) ? pollVotes[String(idx)].length : 0;
                var pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                var isSelected = userVotedIdx === idx;

                return (
                    <button
                        key={idx}
                        onClick={function () { onVote(postId, idx); }}
                        style={{
                            padding: "12px 16px", border: isSelected ? "2px solid " + PC.blue : "1px solid " + PC.border,
                            borderRadius: 10, background: "white", cursor: "pointer",
                            textAlign: "left", position: "relative", overflow: "hidden",
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={function (e) { if (!hasVoted) e.currentTarget.style.borderColor = PC.blue; }}
                        onMouseLeave={function (e) { if (!isSelected) e.currentTarget.style.borderColor = PC.border; }}
                    >
                        {/* İlerleme çubuğu */}
                        {hasVoted && (
                            <div style={{
                                position: "absolute", top: 0, left: 0, bottom: 0,
                                width: pct + "%", background: isSelected ? PC.blueLight : PC.bg,
                                transition: "width 0.5s ease",
                                borderRadius: 8,
                            }} />
                        )}
                        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 14, fontWeight: isSelected ? 700 : 500, color: PC.navy }}>{option}</span>
                            {hasVoted && (
                                <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? PC.blue : PC.textMuted }}>
                                    {pct}% <span style={{ fontWeight: 400, fontSize: 11 }}>({voteCount})</span>
                                </span>
                            )}
                        </div>
                    </button>
                );
            })}
            <div style={{ fontSize: 12, color: PC.textMuted, marginTop: 4 }}>
                Toplam {totalVotes} oy
            </div>
        </div>
    );
};

export default PollWidget;
