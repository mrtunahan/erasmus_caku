
import React, { useState } from 'react';
import { C as PC } from '../../../constants/theme';
import Avatar from './Avatar';
import { getUserId, timeAgo } from '../utils';
import PortalService from '../service';

const CommentItem = ({ comment, postId, currentUser, onUpdate, onRemove }) => {
    var userId = getUserId(currentUser);
    var isOwner = comment.authorId === userId || currentUser.role === "admin";

    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(comment.text || "");
    const [saving, setSaving] = useState(false);
    const [likes, setLikes] = useState(comment.likes || []);
    const [liking, setLiking] = useState(false);

    var isLiked = likes.indexOf(userId) >= 0;

    var handleToggleLike = async function () {
        if (liking) return;
        setLiking(true);
        try {
            var updated = await PortalService.toggleCommentLike(postId, comment.id, userId);
            setLikes(updated);
        } catch (err) {
            console.error("Beğeni hatası:", err);
        }
        setLiking(false);
    };

    var handleSave = async function () {
        if (!editText.trim()) return;
        setSaving(true);
        try {
            await PortalService.updateComment(postId, comment.id, {
                text: editText.trim(),
                editedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            });
            onUpdate(comment.id, editText.trim());
            setEditing(false);
        } catch (err) {
            console.error("Yorum düzenleme hatası:", err);
        }
        setSaving(false);
    };

    var handleDelete = async function () {
        if (!confirm("Bu yorumu silmek istediğinizden emin misiniz?")) return;
        try {
            await PortalService.deleteComment(postId, comment.id);
            onRemove(comment.id);
        } catch (err) {
            console.error("Yorum silme hatası:", err);
        }
    };

    var handleCancel = function () {
        setEditText(comment.text || "");
        setEditing(false);
    };

    return (
        <div style={{
            display: "flex", gap: 10, padding: "10px 0",
            borderBottom: "1px solid " + PC.borderLight,
        }}>
            <Avatar name={comment.authorName} size={32} />
            <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: PC.navy }}>{comment.authorName}</span>
                    <span style={{ fontSize: 11, color: PC.textMuted }}>{timeAgo(comment.createdAt)}</span>
                    {comment.editedAt && (
                        <span style={{ fontSize: 10, color: PC.textMuted, fontStyle: "italic" }}>(düzenlendi)</span>
                    )}
                    {/* Düzenle/Sil butonları */}
                    {isOwner && !editing && (
                        <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                            <button
                                onClick={function () { setEditing(true); }}
                                title="Düzenle"
                                style={{
                                    padding: 3, border: "none", background: "transparent",
                                    cursor: "pointer", borderRadius: 4, color: PC.textMuted, fontSize: 0,
                                }}
                                onMouseEnter={function (e) { e.currentTarget.style.color = PC.blue; }}
                                onMouseLeave={function (e) { e.currentTarget.style.color = PC.textMuted; }}
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                            </button>
                            <button
                                onClick={handleDelete}
                                title="Sil"
                                style={{
                                    padding: 3, border: "none", background: "transparent",
                                    cursor: "pointer", borderRadius: 4, color: PC.textMuted, fontSize: 0,
                                }}
                                onMouseEnter={function (e) { e.currentTarget.style.color = "#EF4444"; }}
                                onMouseLeave={function (e) { e.currentTarget.style.color = PC.textMuted; }}
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
                {editing ? (
                    <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                            value={editText}
                            onChange={function (e) { setEditText(e.target.value); }}
                            onKeyDown={function (e) {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
                                if (e.key === "Escape") handleCancel();
                            }}
                            style={{
                                flex: 1, padding: "6px 12px", borderRadius: 16,
                                border: "1px solid " + PC.border, fontSize: 13,
                                outline: "none", background: "white",
                            }}
                        />
                        <button
                            onClick={handleSave}
                            disabled={saving || !editText.trim()}
                            style={{
                                padding: "4px 12px", borderRadius: 14, border: "none",
                                background: saving || !editText.trim() ? PC.border : PC.navy,
                                color: "white", cursor: saving ? "wait" : "pointer",
                                fontSize: 12, fontWeight: 600,
                            }}
                        >{saving ? "..." : "Kaydet"}</button>
                        <button
                            onClick={handleCancel}
                            style={{
                                padding: "4px 10px", borderRadius: 14,
                                border: "1px solid " + PC.border, background: "white",
                                cursor: "pointer", fontSize: 12, color: PC.textMuted,
                            }}
                        >Vazgeç</button>
                    </div>
                ) : (
                    <>
                        <div style={{ fontSize: 13, color: PC.text, marginTop: 4, lineHeight: 1.5 }}>{comment.text}</div>
                        <button
                            onClick={handleToggleLike}
                            disabled={liking}
                            style={{
                                marginTop: 4, padding: "2px 8px", border: "none",
                                background: "transparent", cursor: "pointer",
                                fontSize: 12, color: isLiked ? "#EF4444" : PC.textMuted,
                                display: "flex", alignItems: "center", gap: 4,
                                borderRadius: 10, transition: "all 0.15s",
                            }}
                            onMouseEnter={function (e) { e.currentTarget.style.background = PC.bg; }}
                            onMouseLeave={function (e) { e.currentTarget.style.background = "transparent"; }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            {likes.length > 0 && <span style={{ fontWeight: 600 }}>{likes.length}</span>}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default CommentItem;
