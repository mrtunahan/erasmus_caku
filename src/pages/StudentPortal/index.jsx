
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { C as PC } from '../../constants/theme';
import { ICONS, SvgIcon } from '../../components/ui/Icons';
import { DY, POSTS_PER_PAGE, PORTAL_CATEGORIES } from './constants';
import { getReactionTotal } from './utils';
import PortalService from './service';
import useIsMobile from '../../hooks/useIsMobile';

// Components
import ToastContainer from './components/ToastContainer';
import ScrollToTopButton from './components/ScrollToTopButton';
import NotificationBell from './components/NotificationBell';
import NewPostForm from './components/NewPostForm';
import StatCard from './components/StatCard';
import SearchBar from './components/SearchBar';
import Avatar from './components/Avatar';
import PostCard from './components/PostCard';
import TrendingSidebar from './components/TrendingSidebar';
import UserProfileCard from './components/UserProfileCard';
import MobileSidebarToggle from './components/MobileSidebarToggle';

function StudentPortalPage({ currentUser }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState("tumu");
    const [showNewPost, setShowNewPost] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortMode, setSortMode] = useState("newest"); // newest, popular, comments, bookmarked
    const [authorFilter, setAuthorFilter] = useState("");
    const [toasts, setToasts] = useState([]);
    const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
    const [highlightedPostId, setHighlightedPostId] = useState(null);
    const loadMoreRef = useRef(null);
    var isMobile = useIsMobile(768);

    // Custom style injection for portal-specific animations/styles
    useEffect(() => {
        if (!document.getElementById("portal-daisy-style")) {
            var s = document.createElement("style");
            s.id = "portal-daisy-style";
            s.textContent =
                "@keyframes fadeInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}" +
                "@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}" +
                "@keyframes fadeOutDown{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(20px)}}" +
                "@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}" +
                "@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}" +
                ".portal-bg{background:linear-gradient(135deg,#FFFDF7 0%,#FFF9E6 30%,#FFF4CC 70%,#FFFDF7 100%);position:relative;min-height:100vh;}" +
                ".portal-bg::before{content:'';position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:0;" +
                "background:" +
                "radial-gradient(ellipse 120px 120px at 10% 15%,rgba(255,215,0,0.12) 0%,transparent 70%)," +
                "radial-gradient(ellipse 100px 100px at 85% 20%,rgba(255,193,7,0.10) 0%,transparent 70%)," +
                "radial-gradient(ellipse 80px 80px at 20% 80%,rgba(255,235,59,0.08) 0%,transparent 70%)," +
                "radial-gradient(ellipse 90px 90px at 75% 75%,rgba(255,215,0,0.10) 0%,transparent 70%)," +
                "radial-gradient(ellipse 60px 60px at 50% 50%,rgba(255,193,7,0.06) 0%,transparent 70%);}" +
                ".daisy-card{background:rgba(255,255,255,0.92);backdrop-filter:blur(8px);border:1px solid rgba(255,215,0,0.18);border-radius:16px;box-shadow:0 2px 16px rgba(255,193,7,0.08);transition:box-shadow 0.25s,transform 0.25s;}" +
                ".daisy-card:hover{box-shadow:0 6px 24px rgba(255,193,7,0.15);transform:translateY(-1px);}" +
                ".daisy-btn{background:linear-gradient(135deg,#F59E0B,#D97706);color:white;border:none;border-radius:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(245,158,11,0.3);transition:all 0.2s;}" +
                ".daisy-btn:hover{box-shadow:0 6px 20px rgba(245,158,11,0.4);transform:translateY(-1px);}" +
                ".portal-wrap{position:relative;z-index:1;}";
            document.head.appendChild(s);
        }
    }, []);

    useEffect(function () {
        var params = new URLSearchParams(window.location.search);
        var pid = params.get("post");
        if (pid) setHighlightedPostId(pid);
    }, []);

    var showToast = function (message, type) {
        var id = Date.now() + Math.random();
        setToasts(function (prev) { return [].concat(prev, [{ id: id, message: message, type: type || "success" }]); });
        setTimeout(function () {
            setToasts(function (prev) { return prev.filter(function (t) { return t.id !== id; }); });
        }, 3000);
    };

    // Yer imleri (localStorage)
    const [bookmarks, setBookmarks] = useState(function () {
        try {
            var saved = localStorage.getItem("portal_bookmarks");
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    var handleToggleBookmark = function (postId) {
        var wasBookmarked = bookmarks.indexOf(postId) >= 0;
        setBookmarks(function (prev) {
            var idx = prev.indexOf(postId);
            var updated;
            if (idx >= 0) {
                updated = prev.filter(function (id) { return id !== postId; });
            } else {
                updated = [].concat(prev, [postId]);
            }
            try { localStorage.setItem("portal_bookmarks", JSON.stringify(updated)); } catch (e) { }
            return updated;
        });
        showToast(wasBookmarked ? "Yer iminden kaldırıldı" : "Yer imine eklendi");
    };

    // Gerçek zamanlı dinleme (onSnapshot)
    useEffect(function () {
        var ref = PortalService.postsRef();
        if (!ref) { setLoading(false); return; }
        var query = ref.orderBy("createdAt", "desc");
        if (activeCategory && activeCategory !== "tumu") {
            query = query.where("category", "==", activeCategory);
        }
        query = query.limit(50);
        var unsubscribe = query.onSnapshot(function (snapshot) {
            if (snapshot.empty) {
                setPosts([]);
                setLoading(false);
                return;
            }
            var fetched = snapshot.docs.map(function (doc) {
                return Object.assign({}, doc.data(), { id: doc.id });
            });
            setPosts(fetched);
            setLoading(false);
        }, function (err) {
            console.error("Gönderiler yüklenemedi:", err);
            setLoading(false);
        });
        return function () { unsubscribe(); };
    }, [activeCategory]);

    // Sonsuz kaydırma
    useEffect(function () {
        var observer = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) {
                setVisibleCount(function (prev) { return prev + POSTS_PER_PAGE; });
            }
        }, { threshold: 0.1 });
        if (loadMoreRef.current) observer.observe(loadMoreRef.current);
        return function () { if (loadMoreRef.current) observer.unobserve(loadMoreRef.current); };
    }, [visibleCount]);

    // Yeni gönderi
    const handleNewPost = async function (postData) {
        var saved = await PortalService.createPost(postData);
        setPosts(function (prev) { return [saved, ...prev]; });
        setShowNewPost(false);
        showToast("Gönderi başarıyla paylaşıldı!");
    };

    // Reaksiyon
    const handleReact = async function (postId, reactionType) {
        var userId = currentUser ? (currentUser.email || currentUser.name || "anon") : "anon";
        try {
            var updatedReactions = await PortalService.toggleReaction(postId, reactionType, userId);
            setPosts(function (prev) {
                return prev.map(function (p) {
                    return p.id === postId ? Object.assign({}, p, { reactions: updatedReactions }) : p;
                });
            });
        } catch (err) {
            console.error("Reaksiyon hatası:", err);
        }
    };

    // Anket oyu
    const handleVote = async function (postId, optionIndex) {
        var userId = currentUser ? (currentUser.email || currentUser.name || "anon") : "anon";
        try {
            var updatedVotes = await PortalService.votePoll(postId, optionIndex, userId);
            setPosts(function (prev) {
                return prev.map(function (p) {
                    return p.id === postId ? Object.assign({}, p, { pollVotes: updatedVotes }) : p;
                });
            });
        } catch (err) {
            console.error("Oy hatası:", err);
        }
    };

    // Gönderi sil
    const handleDelete = async function (postId) {
        try {
            await PortalService.deletePost(postId);
            setPosts(function (prev) { return prev.filter(function (p) { return p.id !== postId; }); });
            showToast("Gönderi silindi");
        } catch (err) {
            console.error("Silme hatası:", err);
            showToast("Silme başarısız!", "error");
        }
    };

    // Gönderi düzenle
    const handleEdit = async function (postId, updates) {
        try {
            await PortalService.updatePost(postId, Object.assign({}, updates, {
                editedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            }));
            setPosts(function (prev) {
                return prev.map(function (p) {
                    return p.id === postId ? Object.assign({}, p, updates, { editedAt: new Date() }) : p;
                });
            });
            showToast("Gönderi düzenlendi");
        } catch (err) {
            console.error("Düzenleme hatası:", err);
            showToast("Düzenleme başarısız!", "error");
            throw err;
        }
    };

    // Gönderi sabitle/kaldır (admin)
    const handleTogglePin = async function (postId, pinned) {
        try {
            await PortalService.updatePost(postId, { pinned: pinned });
            setPosts(function (prev) {
                return prev.map(function (p) {
                    return p.id === postId ? Object.assign({}, p, { pinned: pinned }) : p;
                });
            });
            showToast(pinned ? "Gönderi sabitlendi" : "Sabitleme kaldırıldı");
        } catch (err) {
            console.error("Pin hatası:", err);
        }
    };

    // Arama + sıralama filtresi
    var filteredPosts = useMemo(function () {
        if (highlightedPostId) return posts.filter(function (p) { return p.id === highlightedPostId; });
        var result = posts;
        if (searchQuery.trim()) {
            var q = searchQuery.toLowerCase();
            result = result.filter(function (p) {
                return (p.title && p.title.toLowerCase().includes(q)) ||
                    (p.content && p.content.toLowerCase().includes(q)) ||
                    (p.authorName && p.authorName.toLowerCase().includes(q));
            });
        }
        // Yazar filtresi
        if (authorFilter) {
            result = result.filter(function (p) { return p.authorName === authorFilter; });
        }
        // Kaydedilenler filtresi
        if (sortMode === "bookmarked") {
            result = result.filter(function (p) { return bookmarks.indexOf(p.id) >= 0; });
        }
        // Sıralama
        if (sortMode === "popular") {
            result = [...result].sort(function (a, b) {
                return (getReactionTotal(b.reactions) + (b.views || 0)) - (getReactionTotal(a.reactions) + (a.views || 0));
            });
        } else if (sortMode === "comments") {
            result = [...result].sort(function (a, b) {
                return (b.commentCount || 0) - (a.commentCount || 0);
            });
        }
        return result;
    }, [posts, searchQuery, sortMode, bookmarks, authorFilter, highlightedPostId]);

    // Sabitlenmiş gönderileri ayır
    var pinnedPosts = filteredPosts.filter(function (p) { return p.pinned; });
    var regularPosts = filteredPosts.filter(function (p) { return !p.pinned; });

    // İstatistikler
    var totalReactions = 0;
    posts.forEach(function (p) { totalReactions += getReactionTotal(p.reactions); });
    var totalComments = 0;
    posts.forEach(function (p) { totalComments += (p.commentCount || 0); });

    return (
        <div className="portal-bg">
            <div className="portal-wrap">
                {/* Toast Bildirimler */}
                <ToastContainer toasts={toasts} />
                {/* Yukarı Kaydır */}
                <ScrollToTopButton />

                {/* Başlık */}
                <div style={{
                    marginBottom: 24, display: "flex", justifyContent: "space-between",
                    alignItems: isMobile ? "stretch" : "flex-start",
                    flexDirection: isMobile ? "column" : "row",
                    gap: isMobile ? 12 : 16,
                }}>
                    <div>
                        <h1 style={{
                            fontSize: isMobile ? 22 : 28, fontWeight: 700, color: PC.navy,
                            fontFamily: "'Playfair Display', serif", marginBottom: 4,
                        }}>Öğrenci Portalı
                            <span style={{ display: "inline-block", marginLeft: 8 }}>
                                <SvgIcon path={ICONS.daisy} size={28} color={DY.gold} fill={DY.goldLight} />
                            </span>
                        </h1>
                        <p style={{ color: PC.textMuted, fontSize: 14 }}>
                            Yardımlaşma, bilgi paylaşımı ve sosyal etkileşim platformu
                        </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <NotificationBell currentUser={currentUser} />
                        <button
                            onClick={function () { setShowNewPost(!showNewPost); }}
                            style={{
                                padding: "12px 24px", border: "none", borderRadius: 12,
                                background: showNewPost ? PC.textMuted : "linear-gradient(135deg, " + DY.gold + ", " + DY.goldDark + ")",
                                color: "white", cursor: "pointer", fontSize: 14, fontWeight: 700,
                                display: "flex", alignItems: "center", gap: 8,
                                boxShadow: "0 4px 16px rgba(27,42,74,0.25)",
                                transition: "all 0.2s",
                            }}
                        >
                            <span style={{ fontSize: 18 }}>{showNewPost ? "\u2715" : "+"}</span>
                            {showNewPost ? "Kapat" : "Yeni Gönderi"}
                        </button>
                    </div>
                </div>

                {/* İstatistikler */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
                    gap: 12, marginBottom: 24,
                }}>
                    <StatCard label="Toplam Gönderi" value={posts.length} color="#F59E0B" icon="file" />
                    <StatCard label="Tepkiler" value={totalReactions} color="#EF4444" icon="heart" />
                    <StatCard label="Yorumlar" value={totalComments} color="#10B981" icon="chat" />
                    <StatCard label="Üyeler" value={new Set(posts.map(function (p) { return p.authorId; })).size || 0} color="#8B5CF6" icon="users" />
                </div>
                {highlightedPostId && (
                    <div style={{
                        marginBottom: 16, padding: "12px 16px", background: DY.goldLight,
                        border: "1px solid " + DY.gold, borderRadius: 12,
                        display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                        <span style={{ fontWeight: 600, color: DY.goldDark, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                            <SvgIcon path={ICONS.pin} size={16} color={DY.goldDark} /> Tek bir gönderi görüntüleniyor
                        </span>
                        <button
                            onClick={function () {
                                setHighlightedPostId(null);
                                window.history.pushState({}, document.title, window.location.pathname);
                            }}
                            style={{
                                border: "none", background: "white", padding: "6px 12px", borderRadius: 8,
                                fontSize: 12, fontWeight: 700, color: PC.navy, cursor: "pointer",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                            }}
                        >Tümünü Gör</button>
                    </div>
                )}


                {/* Arama + Kategori Filtreleri */}
                <div style={{
                    display: "flex", gap: isMobile ? 10 : 16, marginBottom: 24,
                    alignItems: isMobile ? "stretch" : "center",
                    flexDirection: isMobile ? "column" : "row",
                    flexWrap: "wrap",
                }}>
                    <SearchBar value={searchQuery} onChange={setSearchQuery} />

                    {/* Yazar filtresi badge */}
                    {authorFilter && (
                        <div style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "6px 14px", borderRadius: 20,
                            background: PC.blueLight, border: "1px solid " + PC.blue,
                            fontSize: 12, fontWeight: 600, color: PC.blue,
                            alignSelf: isMobile ? "flex-start" : "center",
                        }}>
                            <Avatar name={authorFilter} size={20} />
                            {authorFilter}
                            <button
                                onClick={function () { setAuthorFilter(""); }}
                                style={{
                                    padding: 0, border: "none", background: "transparent",
                                    cursor: "pointer", color: PC.blue, fontSize: 14, fontWeight: 700,
                                    marginLeft: 4, lineHeight: 1,
                                }}
                            >{"\u2715"}</button>
                        </div>
                    )}

                    {/* Sıralama */}
                    <div style={{
                        display: "flex", gap: 4, background: PC.bg, borderRadius: 10, padding: 3,
                        overflowX: isMobile ? "auto" : "visible",
                        WebkitOverflowScrolling: "touch",
                    }}>
                        {[
                            { id: "newest", label: "En Yeni" },
                            { id: "popular", label: "En Popüler" },
                            { id: "comments", label: "En Çok Yorum" },
                            { id: "bookmarked", label: "Kaydedilenler" },
                        ].map(function (s) {
                            var isActive = sortMode === s.id;
                            return (
                                <button
                                    key={s.id}
                                    onClick={function () { setSortMode(s.id); }}
                                    style={{
                                        padding: "6px 14px", borderRadius: 8, fontSize: 12,
                                        fontWeight: isActive ? 700 : 500, cursor: "pointer",
                                        border: "none", whiteSpace: "nowrap",
                                        background: isActive ? "white" : "transparent",
                                        color: isActive ? PC.navy : PC.textMuted,
                                        boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                                        transition: "all 0.2s",
                                    }}
                                >{s.label}</button>
                            );
                        })}
                    </div>

                    <div style={{
                        display: "flex", gap: 4,
                        flexWrap: isMobile ? "nowrap" : "wrap",
                        overflowX: isMobile ? "auto" : "visible",
                        WebkitOverflowScrolling: "touch",
                        paddingBottom: isMobile ? 4 : 0,
                    }}>
                        <button
                            onClick={function () { setActiveCategory("tumu"); }}
                            style={{
                                padding: "8px 16px", borderRadius: 20, fontSize: 13,
                                fontWeight: activeCategory === "tumu" ? 700 : 500, cursor: "pointer",
                                border: activeCategory === "tumu" ? "2px solid " + PC.navy : "1px solid " + PC.border,
                                background: activeCategory === "tumu" ? PC.navy : "white",
                                color: activeCategory === "tumu" ? "white" : PC.textMuted,
                                whiteSpace: "nowrap", flexShrink: 0,
                            }}
                        >Tümü</button>
                        {PORTAL_CATEGORIES.map(function (cat) {
                            var isActive = activeCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={function () { setActiveCategory(cat.id); }}
                                    style={{
                                        padding: "8px 14px", borderRadius: 20, fontSize: 12,
                                        fontWeight: isActive ? 700 : 500, cursor: "pointer",
                                        border: isActive ? "2px solid " + cat.color : "1px solid " + PC.border,
                                        background: isActive ? cat.bg : "white",
                                        color: isActive ? cat.color : PC.textMuted,
                                        transition: "all 0.15s",
                                        whiteSpace: "nowrap", flexShrink: 0,
                                    }}
                                ><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><SvgIcon path={ICONS[cat.icon]} size={13} color={isActive ? cat.color : PC.textMuted} /> {cat.label}</span></button>
                            );
                        })}
                    </div>
                </div>

                {/* Ana İçerik: Feed + Sidebar */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 300px",
                    gap: isMobile ? 16 : 24,
                    alignItems: "start",
                }}>
                    {/* Sol: Feed */}
                    <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
                        {/* Yeni gönderi formu */}
                        {showNewPost && (
                            <NewPostForm
                                currentUser={currentUser}
                                onPost={handleNewPost}
                                onClose={function () { setShowNewPost(false); }}
                            />
                        )}

                        {/* Yükleniyor */}
                        {loading && (
                            <div style={{ padding: 40, textAlign: "center", color: PC.textMuted }}>
                                <div style={{ fontSize: 16, marginBottom: 8 }}>Gönderiler yükleniyor...</div>
                            </div>
                        )}

                        {/* Boş durum */}
                        {!loading && filteredPosts.length === 0 && (
                            <div className="daisy-card" style={{
                                padding: 60, textAlign: "center",
                            }}>
                                <div style={{ marginBottom: 16 }}><SvgIcon path={ICONS.file} size={48} color={DY.gold} /></div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: PC.navy, marginBottom: 8 }}>
                                    {searchQuery ? "Sonuç bulunamadı" : "Henüz gönderi yok"}
                                </div>
                                <div style={{ fontSize: 14, color: PC.textMuted }}>
                                    {searchQuery ? "Farklı bir arama terimi deneyin." : "İlk gönderiyi oluşturarak topluluğu başlatın!"}
                                </div>
                                {!searchQuery && (
                                    <button
                                        onClick={function () { setShowNewPost(true); }}
                                        style={{
                                            marginTop: 16, padding: "10px 24px", border: "none",
                                            borderRadius: 10, background: PC.navy, color: "white",
                                            cursor: "pointer", fontSize: 14, fontWeight: 600,
                                        }}
                                    >İlk Gönderiyi Yaz</button>
                                )}
                            </div>
                        )}

                        {/* Sabitlenmiş gönderiler */}
                        {pinnedPosts.map(function (post) {
                            return (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    currentUser={currentUser}
                                    onReact={handleReact}
                                    onVote={handleVote}
                                    onDelete={handleDelete}
                                    onEdit={handleEdit}
                                    onTogglePin={handleTogglePin}
                                    isBookmarked={bookmarks.indexOf(post.id) >= 0}
                                    onToggleBookmark={handleToggleBookmark}
                                    onFilterAuthor={setAuthorFilter}
                                />
                            );
                        })}

                        {/* Normal gönderiler */}
                        {regularPosts.slice(0, visibleCount).map(function (post) {
                            return (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    currentUser={currentUser}
                                    onReact={handleReact}
                                    onVote={handleVote}
                                    onDelete={handleDelete}
                                    onEdit={handleEdit}
                                    onTogglePin={handleTogglePin}
                                    isBookmarked={bookmarks.indexOf(post.id) >= 0}
                                    onToggleBookmark={handleToggleBookmark}
                                    onFilterAuthor={setAuthorFilter}
                                />
                            );
                        })}

                        {/* Daha fazla yükle tetikleyicisi */}
                        {visibleCount < regularPosts.length && (
                            <div ref={loadMoreRef} style={{ padding: 20, textAlign: "center", color: PC.textMuted }}>
                                Daha fazla yükleniyor...
                            </div>
                        )}
                    </div>

                    {/* Sağ: Sidebar (Sadece Masaüstü veya isMobile && toggle) */}
                    {!isMobile ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 20 }}>
                            <UserProfileCard currentUser={currentUser} posts={posts} />
                            <TrendingSidebar posts={posts} />
                        </div>
                    ) : (
                        <MobileSidebarToggle>
                            <UserProfileCard currentUser={currentUser} posts={posts} />
                            <TrendingSidebar posts={posts} />
                        </MobileSidebarToggle>
                    )}
                </div>
            </div>
        </div>
    );
}

export default StudentPortalPage;
