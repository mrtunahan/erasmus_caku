
import React, { useState } from 'react';
import { C as PC } from '../../../constants/theme';
import { ICONS, SvgIcon } from '../../../components/ui/Icons';
import { DY, REPORT_REASONS } from '../constants';
import { getCategoryInfo, getUserId, timeAgo } from '../utils';
import PortalService from '../service';
import Avatar from './Avatar';
import CategoryBadge from './CategoryBadge';
import ReactionBar from './ReactionBar';
import CommentSection from './CommentSection';
import PollWidget from './PollWidget';
import useIsMobile from '../../../hooks/useIsMobile';

const PostCard = ({ post, currentUser, onReact, onVote, onDelete, onEdit, onTogglePin, isBookmarked, onToggleBookmark, onFilterAuthor }) => {
    var cat = getCategoryInfo(post.category);
    var userId = getUserId(currentUser);
    var isAuthor = post.authorId === userId || currentUser.role === "admin";
    var isAdmin = currentUser.role === "admin";
    var isMobile = useIsMobile(768);

    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(post.title || "");
    const [editContent, setEditContent] = useState(post.content || "");
    const [saving, setSaving] = useState(false);
    const [expanded, setExpanded] = useState(false);

    var TRUNCATE_LEN = 300;
    var isLong = post.content && post.content.length > TRUNCATE_LEN;
    var displayContent = (!expanded && isLong) ? post.content.substring(0, TRUNCATE_LEN) + "..." : post.content;

    var handleSaveEdit = async function () {
        if (!editContent.trim()) return;
        setSaving(true);
        try {
            await onEdit(post.id, { title: editTitle.trim(), content: editContent.trim() });
            setEditing(false);
        } catch (err) {
            console.error("Düzenleme hatası:", err);
        }
        setSaving(false);
    };

    var handleCancelEdit = function () {
        setEditTitle(post.title || "");
        setEditContent(post.content || "");
        setEditing(false);
    };

    return (
        <div className="daisy-card" style={{
            padding: 0, overflow: "hidden",
        }}>
            {/* Pinned banner */}
            {post.pinned && (
                <div style={{
                    background: "linear-gradient(90deg, #F59E0B, #F97316)",
                    padding: "4px 16px", fontSize: 11, fontWeight: 700,
                    color: "white", display: "flex", alignItems: "center", gap: 6,
                }}>
                    <SvgIcon path={ICONS.pin} size={12} color="white" fill="white" /> Sabitlenmiş Gönderi
                </div>
            )}

            <div style={{ padding: isMobile ? "16px" : "20px 24px" }}>
                {/* Üst kısım: avatar + yazar + zaman + kategori */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <Avatar name={post.authorName} />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span
                                onClick={function () { if (onFilterAuthor) onFilterAuthor(post.authorName); }}
                                style={{ fontWeight: 700, fontSize: 15, color: PC.navy, cursor: "pointer" }}
                                onMouseEnter={function (e) { e.currentTarget.style.textDecoration = "underline"; }}
                                onMouseLeave={function (e) { e.currentTarget.style.textDecoration = "none"; }}
                                title={"\"" + post.authorName + "\" gönderilerini filtrele"}
                            >{post.authorName}</span>
                            <CategoryBadge category={post.category} small />
                            {post.tag && (
                                <span style={{
                                    fontSize: 11, padding: "2px 8px", borderRadius: 4,
                                    background: PC.bg, color: PC.textMuted, fontWeight: 600,
                                }}>{post.tag}</span>
                            )}
                            {post.courseCode && (
                                <span style={{
                                    fontSize: 10, padding: "2px 8px", borderRadius: 4,
                                    background: DY.goldLight, color: DY.goldDark, fontWeight: 700,
                                    display: "inline-flex", alignItems: "center", gap: 3,
                                }}>
                                    <SvgIcon path={ICONS.book} size={10} color={DY.goldDark} />
                                    {post.courseCode}
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: 12, color: PC.textMuted, marginTop: 2 }}>
                            {timeAgo(post.createdAt)}
                            {post.views > 0 && <span> · {post.views} görüntülenme</span>}
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {/* Admin: Pin/Unpin */}
                        {isAdmin && (
                            <button
                                onClick={function () { onTogglePin(post.id, !post.pinned); }}
                                title={post.pinned ? "Sabitlemeyi Kaldır" : "Sabitle"}
                                style={{
                                    padding: 6, border: "none", background: "transparent",
                                    cursor: "pointer", borderRadius: 6,
                                    color: post.pinned ? "#F59E0B" : PC.textMuted,
                                }}
                                onMouseEnter={function (e) { e.currentTarget.style.color = "#F59E0B"; }}
                                onMouseLeave={function (e) { e.currentTarget.style.color = post.pinned ? "#F59E0B" : PC.textMuted; }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill={post.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2l2.09 6.26L21 9.27l-5 3.14L17.18 22 12 17.77 6.82 22 8 12.41l-5-3.14 6.91-1.01L12 2z" />
                                </svg>
                            </button>
                        )}
                        {/* Yazar/Admin: Düzenle */}
                        {isAuthor && !editing && (
                            <button
                                onClick={function () { setEditing(true); }}
                                title="Düzenle"
                                style={{
                                    padding: 6, border: "none", background: "transparent",
                                    cursor: "pointer", borderRadius: 6, color: PC.textMuted,
                                }}
                                onMouseEnter={function (e) { e.currentTarget.style.color = PC.blue; }}
                                onMouseLeave={function (e) { e.currentTarget.style.color = PC.textMuted; }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                            </button>
                        )}
                        {/* Yazar/Admin: Sil */}
                        {isAuthor && (
                            <button
                                onClick={function () { if (confirm("Bu gönderiyi silmek istediğinizden emin misiniz?")) onDelete(post.id); }}
                                title="Sil"
                                style={{
                                    padding: 6, border: "none", background: "transparent",
                                    cursor: "pointer", borderRadius: 6, color: PC.textMuted,
                                }}
                                onMouseEnter={function (e) { e.currentTarget.style.color = "#EF4444"; }}
                                onMouseLeave={function (e) { e.currentTarget.style.color = PC.textMuted; }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Başlık + İçerik (düzenleme veya görüntüleme) */}
                {editing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <input
                            value={editTitle}
                            onChange={function (e) { setEditTitle(e.target.value); }}
                            placeholder="Başlık"
                            style={{
                                width: "100%", padding: "10px 14px", border: "1px solid " + PC.border,
                                borderRadius: 8, fontSize: 15, fontWeight: 600, outline: "none",
                                color: PC.navy,
                            }}
                        />
                        <textarea
                            value={editContent}
                            onChange={function (e) { setEditContent(e.target.value); }}
                            rows={4}
                            style={{
                                width: "100%", padding: "10px 14px", border: "1px solid " + PC.border,
                                borderRadius: 8, fontSize: 14, resize: "vertical",
                                outline: "none", lineHeight: 1.6, fontFamily: "inherit",
                            }}
                        />
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button
                                onClick={handleCancelEdit}
                                style={{
                                    padding: "6px 16px", border: "1px solid " + PC.border,
                                    borderRadius: 8, background: "white", cursor: "pointer",
                                    fontSize: 13, color: PC.textMuted,
                                }}
                            >İptal</button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving || !editContent.trim()}
                                style={{
                                    padding: "6px 16px", border: "none", borderRadius: 8,
                                    background: saving || !editContent.trim() ? PC.border : PC.navy,
                                    color: "white", cursor: saving ? "wait" : "pointer",
                                    fontSize: 13, fontWeight: 600,
                                }}
                            >{saving ? "Kaydediliyor..." : "Kaydet"}</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {post.title && (
                            <h3 style={{
                                fontSize: 18, fontWeight: 700, color: PC.navy,
                                marginBottom: 8, lineHeight: 1.4,
                            }}>{post.title}</h3>
                        )}
                        <div style={{
                            fontSize: 14, color: PC.text, lineHeight: 1.7,
                            whiteSpace: "pre-wrap", wordBreak: "break-word",
                        }}>{displayContent}</div>
                        {isLong && (
                            <button
                                onClick={function () { setExpanded(!expanded); }}
                                style={{
                                    padding: 0, border: "none", background: "transparent",
                                    color: PC.blue, cursor: "pointer", fontSize: 13,
                                    fontWeight: 600, marginTop: 4,
                                }}
                            >{expanded ? "Daha az göster" : "Devamını oku"}</button>
                        )}
                        {post.editedAt && (
                            <div style={{ fontSize: 11, color: PC.textMuted, marginTop: 4, fontStyle: "italic" }}>
                                (düzenlendi)
                            </div>
                        )}
                    </>
                )}

                {/* Anket */}
                {post.category === "anket" && post.pollOptions && post.pollOptions.length > 0 && (
                    <PollWidget
                        pollOptions={post.pollOptions}
                        pollVotes={post.pollVotes}
                        postId={post.id}
                        userId={userId}
                        onVote={onVote}
                    />
                )}

                {/* Kaynak linki */}
                {post.resourceUrl && (
                    <div style={{
                        marginTop: 12, padding: "10px 14px", background: PC.bg,
                        borderRadius: 8, border: "1px solid " + PC.border,
                        display: "flex", alignItems: "center", gap: 8,
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={PC.blue} strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        <a href={post.resourceUrl} target="_blank" rel="noopener noreferrer"
                            style={{ color: PC.blue, fontWeight: 600, fontSize: 13, textDecoration: "none" }}
                        >{post.resourceUrl}</a>
                    </div>
                )}

                {/* Eklenen dosya */}
                {post.attachment && (
                    <div style={{
                        marginTop: 12, borderRadius: 10, overflow: "hidden",
                        border: "1px solid " + PC.borderLight,
                    }}>
                        {post.attachment.type && post.attachment.type.startsWith("image/") ? (
                            <img src={post.attachment.url} alt={post.attachment.name}
                                style={{ width: "100%", maxHeight: 400, objectFit: "cover", display: "block" }} />
                        ) : (
                            <a href={post.attachment.url} target="_blank" rel="noopener noreferrer"
                                style={{
                                    display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                                    background: DY.warmLight, textDecoration: "none",
                                }}>
                                <SvgIcon path={ICONS.file} size={24} color={DY.gold} />
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: PC.navy }}>{post.attachment.name}</div>
                                    <div style={{ fontSize: 11, color: PC.textMuted }}>{post.attachment.size ? (post.attachment.size / 1024).toFixed(0) + " KB" : "Dosya"}</div>
                                </div>
                            </a>
                        )}
                    </div>
                )}

                {/* Alt kısım: reaksiyonlar + yorumlar + yer imi */}
                <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <ReactionBar
                        reactions={post.reactions}
                        postId={post.id}
                        userId={userId}
                        onReact={onReact}
                    />
                    <CommentSection postId={post.id} currentUser={currentUser} />
                    <button
                        onClick={function () {
                            var url = window.location.origin + window.location.pathname + "?post=" + post.id;
                            if (navigator.clipboard) {
                                navigator.clipboard.writeText(url).then(function () { alert("Link kopyalandı!"); });
                            } else {
                                prompt("Link:", url);
                            }
                        }}
                        title="Link Kopyala"
                        style={{
                            padding: "6px 12px", border: "1px solid " + PC.border,
                            borderRadius: 20, background: "white",
                            cursor: "pointer", fontSize: 13, display: "flex",
                            alignItems: "center", gap: 6, color: PC.textMuted,
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={function (e) { e.currentTarget.style.borderColor = PC.blue; e.currentTarget.style.color = PC.blue; }}
                        onMouseLeave={function (e) { e.currentTarget.style.borderColor = PC.border; e.currentTarget.style.color = PC.textMuted; }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                        Paylaş
                    </button>
                    <button
                        onClick={function () { onToggleBookmark(post.id); }}
                        title={isBookmarked ? "Yer İminden Kaldır" : "Yer İmine Ekle"}
                        style={{
                            marginLeft: "auto", padding: "6px 12px",
                            border: "1px solid " + (isBookmarked ? "#F59E0B" : PC.border),
                            borderRadius: 20, background: isBookmarked ? "#FEF3C7" : "white",
                            cursor: "pointer", fontSize: 13, display: "flex",
                            alignItems: "center", gap: 6, color: isBookmarked ? "#F59E0B" : PC.textMuted,
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={function (e) { e.currentTarget.style.borderColor = "#F59E0B"; e.currentTarget.style.color = "#F59E0B"; }}
                        onMouseLeave={function (e) {
                            e.currentTarget.style.borderColor = isBookmarked ? "#F59E0B" : PC.border;
                            e.currentTarget.style.color = isBookmarked ? "#F59E0B" : PC.textMuted;
                        }}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                        {isBookmarked ? "Kaydedildi" : "Kaydet"}
                    </button>
                    {/* Raporla */}
                    {!isAuthor && (
                        <button
                            onClick={function () {
                                var reason = prompt("Raporlama sebebi:\n" + REPORT_REASONS.join("\n"));
                                if (reason) {
                                    PortalService.reportPost(post.id, {
                                        reason: reason, reporterId: userId, reporterName: currentUser.name || "Anonim",
                                        postTitle: post.title || "", postAuthor: post.authorName,
                                    }).then(function () { alert("Rapor gönderildi. Teşekkürler!"); });
                                }
                            }}
                            title="Gönderiyi Raporla"
                            style={{
                                padding: "6px 8px", border: "1px solid " + PC.border,
                                borderRadius: 20, background: "white",
                                cursor: "pointer", display: "flex", alignItems: "center",
                                color: PC.textMuted, transition: "all 0.2s",
                            }}
                            onMouseEnter={function (e) { e.currentTarget.style.borderColor = "#EF4444"; e.currentTarget.style.color = "#EF4444"; }}
                            onMouseLeave={function (e) { e.currentTarget.style.borderColor = PC.border; e.currentTarget.style.color = PC.textMuted; }}
                        >
                            <SvgIcon path={ICONS.flag} size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PostCard;
