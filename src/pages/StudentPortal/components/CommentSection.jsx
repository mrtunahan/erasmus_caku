
import React, { useState, useRef } from 'react';
import { C as PC } from '../../../constants/theme';
import { ICONS, SvgIcon } from '../../../components/ui/Icons';
import PortalService from '../service';
import CommentItem from './CommentItem';
import Avatar from './Avatar';
import { getUserId } from '../utils';

const CommentSection = ({ postId, currentUser }) => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [sending, setSending] = useState(false);
    var viewIncremented = useRef(false);

    const loadComments = async function () {
        setLoading(true);
        try {
            var fetched = await PortalService.fetchComments(postId);
            setComments(fetched);
        } catch (err) {
            console.error("Yorumlar yüklenemedi:", err);
        }
        setLoading(false);
    };

    const handleOpen = function () {
        if (!open) {
            setOpen(true);
            loadComments();
            // Görüntülenme sayacını artır (ilk açılışta)
            if (!viewIncremented.current) {
                viewIncremented.current = true;
                PortalService.incrementViews(postId);
            }
        } else {
            setOpen(false);
        }
    };

    const handleSubmit = async function () {
        if (!newComment.trim()) return;
        setSending(true);
        try {
            var comment = {
                text: newComment.trim(),
                authorName: currentUser.name || "Anonim",
                authorId: getUserId(currentUser),
            };
            var saved = await PortalService.addComment(postId, comment);
            setComments(function (prev) { return [...prev, saved]; });
            setNewComment("");
        } catch (err) {
            console.error("Yorum eklenemedi:", err);
        }
        setSending(false);
    };

    var handleCommentUpdate = function (commentId, newText) {
        setComments(function (prev) {
            return prev.map(function (c) {
                return c.id === commentId ? Object.assign({}, c, { text: newText, editedAt: new Date() }) : c;
            });
        });
    };

    var handleCommentRemove = function (commentId) {
        setComments(function (prev) {
            return prev.filter(function (c) { return c.id !== commentId; });
        });
    };

    return (
        <div style={{ marginTop: 8 }}>
            <button
                onClick={handleOpen}
                style={{
                    padding: "6px 12px", border: "1px solid " + PC.border,
                    borderRadius: 20, background: "white", cursor: "pointer",
                    fontSize: 13, display: "flex", alignItems: "center", gap: 6,
                    color: PC.textMuted, transition: "all 0.2s",
                }}
                onMouseEnter={function (e) { e.currentTarget.style.background = PC.bg; }}
                onMouseLeave={function (e) { e.currentTarget.style.background = "white"; }}
            >
                <SvgIcon path={ICONS.chat} size={16} /> {/* Using chat icon for comments button */}
                Yorumlar
            </button>

            {open && (
                <div style={{
                    marginTop: 12, padding: 16, background: PC.bg,
                    borderRadius: 12, border: "1px solid " + PC.border,
                }}>
                    {loading ? (
                        <div style={{ textAlign: "center", color: PC.textMuted, padding: 12 }}>Yükleniyor...</div>
                    ) : (
                        <>
                            {comments.length === 0 && (
                                <div style={{ textAlign: "center", color: PC.textMuted, padding: 12, fontSize: 13 }}>
                                    Henüz yorum yok. İlk yorumu siz yapın!
                                </div>
                            )}
                            {comments.map(function (c) {
                                return (
                                    <CommentItem
                                        key={c.id}
                                        comment={c}
                                        postId={postId}
                                        currentUser={currentUser}
                                        onUpdate={handleCommentUpdate}
                                        onRemove={handleCommentRemove}
                                    />
                                );
                            })}
                        </>
                    )}

                    {/* Yeni yorum */}
                    <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "flex-start" }}>
                        <Avatar name={currentUser.name} size={32} />
                        <div style={{ flex: 1, display: "flex", gap: 8 }}>
                            <input
                                value={newComment}
                                onChange={function (e) { setNewComment(e.target.value); }}
                                onKeyDown={function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                                placeholder="Yorumunuzu yazın..."
                                style={{
                                    flex: 1, padding: "10px 14px", borderRadius: 20,
                                    border: "1px solid " + PC.border, fontSize: 13,
                                    outline: "none", background: "white",
                                }}
                            />
                            <button
                                onClick={handleSubmit}
                                disabled={sending || !newComment.trim()}
                                style={{
                                    padding: "8px 16px", borderRadius: 20,
                                    border: "none", background: PC.navy, color: "white",
                                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                                    opacity: (!newComment.trim() || sending) ? 0.5 : 1,
                                }}
                            >
                                {sending ? "..." : "Gönder"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommentSection;
