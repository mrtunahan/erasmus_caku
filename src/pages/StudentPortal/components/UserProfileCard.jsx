
import React from 'react';
import { C as PC } from '../../../constants/theme';
import { DY } from '../constants';
import { getUserId, getReactionTotal } from '../utils';
import Avatar from './Avatar';

const UserProfileCard = ({ currentUser, posts }) => {
    var userId = getUserId(currentUser);
    var userPosts = posts.filter(function (p) { return p.authorId === userId; });
    var totalReactions = 0;
    userPosts.forEach(function (p) { totalReactions += getReactionTotal(p.reactions); });
    return (
        <div className="daisy-card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <Avatar name={currentUser.name} />
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: DY.warm }}>{currentUser.name || "Anonim"}</div>
                    <div style={{ fontSize: 12, color: PC.textMuted }}>{currentUser.email || ""}</div>
                </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                    { v: userPosts.length, l: "Gönderi" },
                    { v: totalReactions, l: "Tepki" },
                    { v: userPosts.reduce(function (s, p) { return s + (p.commentCount || 0); }, 0), l: "Yorum" },
                ].map(function (item) {
                    return (
                        <div key={item.l} style={{ textAlign: "center", padding: "8px 0", background: DY.warmLight, borderRadius: 8 }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: DY.warm }}>{item.v}</div>
                            <div style={{ fontSize: 10, color: PC.textMuted }}>{item.l}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default UserProfileCard;
