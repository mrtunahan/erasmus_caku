
import React, { useState, useRef, useMemo } from 'react';
import { C as PC } from '../../../constants/theme';
import { ICONS, SvgIcon } from '../../../components/ui/Icons';
import { PORTAL_CATEGORIES, DY, SINIF_TAGS, POPULAR_COURSES, FILE_MAX_SIZE } from '../constants';
import { getUserId } from '../utils';
import PortalService from '../service';
import Avatar from './Avatar';

const NewPostForm = ({ currentUser, onPost, onClose }) => {
    const [category, setCategory] = useState("sohbet");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [tag, setTag] = useState("");
    const [resourceUrl, setResourceUrl] = useState("");
    const [pollOptions, setPollOptions] = useState(["", ""]);
    const [pollAnonymous, setPollAnonymous] = useState(false);
    const [pollMultiSelect, setPollMultiSelect] = useState(false);
    const [pollDeadline, setPollDeadline] = useState("");
    const [courseCode, setCourseCode] = useState("");
    const [showCourseSuggestions, setShowCourseSuggestions] = useState(false);
    const [file, setFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [posting, setPosting] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    var courseSuggestions = useMemo(function () {
        if (!courseCode.trim()) return [];
        var q = courseCode.toUpperCase();
        return POPULAR_COURSES.filter(function (c) { return c.includes(q); }).slice(0, 5);
    }, [courseCode]);

    var handleFileSelect = function (f) {
        if (!f) return;
        if (f.size > FILE_MAX_SIZE) { alert("Dosya boyutu 5MB'dan büyük olamaz."); return; }
        setFile(f);
        if (f.type.startsWith("image/")) {
            var reader = new FileReader();
            reader.onload = function (e) { setFilePreview(e.target.result); };
            reader.readAsDataURL(f);
        } else { setFilePreview(null); }
    };

    var handleDrop = function (e) {
        e.preventDefault(); setDragOver(false);
        if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
    };

    const handleSubmit = async function () {
        if (!content.trim()) return;
        setPosting(true);
        try {
            var post = {
                category: category, title: title.trim(), content: content.trim(),
                tag: tag || "", courseCode: courseCode.trim().toUpperCase() || "",
                authorName: currentUser.name || "Anonim", authorId: getUserId(currentUser),
            };
            if (file) {
                setUploading(true);
                try { var uploaded = await PortalService.uploadFile(file); post.attachment = uploaded; }
                catch (err) { console.warn("Dosya yüklenemedi:", err); }
                setUploading(false);
            }
            if (category === "kaynak" && resourceUrl.trim()) { post.resourceUrl = resourceUrl.trim(); }
            if (category === "anket") {
                post.pollOptions = pollOptions.filter(function (o) { return o.trim(); });
                post.pollVotes = {};
                post.pollAnonymous = pollAnonymous;
                post.pollMultiSelect = pollMultiSelect;
                if (pollDeadline) post.pollDeadline = pollDeadline;
            }
            await onPost(post);
            setTitle(""); setContent(""); setResourceUrl(""); setCourseCode("");
            setPollOptions(["", ""]); setFile(null); setFilePreview(null);
            if (onClose) onClose();
        } catch (err) {
            alert("Gönderi oluşturulamadı: " + err.message);
        }
        setPosting(false);
    };

    const addPollOption = function () {
        if (pollOptions.length < 6) setPollOptions([...pollOptions, ""]);
    };

    return (
        <div className="daisy-card" style={{
            padding: 24, marginBottom: 24,
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <Avatar name={currentUser.name} />
                <div>
                    <div style={{ fontWeight: 700, color: PC.navy }}>{currentUser.name || "Anonim"}</div>
                    <div style={{ fontSize: 12, color: PC.textMuted }}>Yeni gönderi oluştur</div>
                </div>
            </div>

            {/* Kategori seçimi */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {PORTAL_CATEGORIES.map(function (cat) {
                    var isActive = category === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={function () { setCategory(cat.id); }}
                            style={{
                                padding: "6px 14px", borderRadius: 20, fontSize: 12,
                                fontWeight: isActive ? 700 : 500, cursor: "pointer",
                                border: isActive ? "2px solid " + cat.color : "1px solid " + PC.border,
                                background: isActive ? cat.bg : "white",
                                color: isActive ? cat.color : PC.textMuted,
                                transition: "all 0.15s",
                            }}
                        >
                            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><SvgIcon path={ICONS[cat.icon]} size={12} color={isActive ? cat.color : PC.textMuted} /> {cat.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Başlık */}
            <input
                value={title}
                onChange={function (e) { setTitle(e.target.value); }}
                placeholder="Başlık (isteğe bağlı)"
                style={{
                    width: "100%", padding: "12px 16px", border: "1px solid " + PC.border,
                    borderRadius: 10, fontSize: 15, fontWeight: 600, marginBottom: 12,
                    outline: "none", color: PC.navy,
                }}
            />

            {/* İçerik */}
            <textarea
                ref={textareaRef}
                value={content}
                onChange={function (e) { setContent(e.target.value); }}
                placeholder={category === "soru" ? "Sorunuzu detaylı bir şekilde yazın..."
                    : category === "anket" ? "Anket açıklamanızı yazın..."
                        : "Ne paylaşmak istiyorsunuz?"}
                rows={4}
                style={{
                    width: "100%", padding: "12px 16px", border: "1px solid " + PC.border,
                    borderRadius: 10, fontSize: 14, resize: "vertical",
                    outline: "none", lineHeight: 1.6, fontFamily: "inherit",
                }}
            />

            {/* Ders Kodu + Tag seçimi */}
            <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ position: "relative", minWidth: 160 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: PC.textMuted, marginBottom: 4 }}>Ders Kodu</div>
                    <input
                        value={courseCode}
                        onChange={function (e) { setCourseCode(e.target.value); setShowCourseSuggestions(true); }}
                        onBlur={function () { setTimeout(function () { setShowCourseSuggestions(false); }, 200); }}
                        placeholder="Örn: BIL301"
                        style={{ width: "100%", padding: "8px 12px", border: "1px solid " + PC.border, borderRadius: 8, fontSize: 12, outline: "none" }}
                    />
                    {showCourseSuggestions && courseSuggestions.length > 0 && (
                        <div style={{
                            position: "absolute", top: "100%", left: 0, right: 0,
                            background: "white", border: "1px solid " + PC.border,
                            borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 10, marginTop: 2,
                        }}>
                            {courseSuggestions.map(function (c) {
                                return (
                                    <div key={c}
                                        onMouseDown={function () { setCourseCode(c); setShowCourseSuggestions(false); }}
                                        style={{ padding: "8px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: PC.navy }}
                                        onMouseEnter={function (e) { e.currentTarget.style.background = DY.goldLight; }}
                                        onMouseLeave={function (e) { e.currentTarget.style.background = "white"; }}
                                    >{c}</div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: PC.textMuted, marginBottom: 4 }}>Sınıf</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {SINIF_TAGS.map(function (t) {
                            var isActive = tag === t;
                            return (
                                <button key={t} onClick={function () { setTag(isActive ? "" : t); }} style={{
                                    padding: "4px 10px", borderRadius: 6, fontSize: 11,
                                    fontWeight: isActive ? 700 : 500, cursor: "pointer",
                                    border: "1px solid " + (isActive ? DY.gold : PC.border),
                                    background: isActive ? DY.goldLight : "white",
                                    color: isActive ? DY.goldDark : PC.textMuted,
                                }}>{t}</button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Dosya Ekleme */}
            <div
                onDragOver={function (e) { e.preventDefault(); setDragOver(true); }}
                onDragLeave={function () { setDragOver(false); }}
                onDrop={handleDrop}
                style={{
                    marginTop: 12, padding: file ? "10px 14px" : "16px",
                    border: "2px dashed " + (dragOver ? DY.gold : file ? DY.goldBorder : PC.border),
                    borderRadius: 10, textAlign: "center",
                    background: dragOver ? DY.warmLight : file ? DY.goldLight + "60" : "transparent",
                    cursor: "pointer", transition: "all 0.2s",
                }}
                onClick={function () { if (!file && fileInputRef.current) fileInputRef.current.click(); }}
            >
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xlsx,.pptx,.txt"
                    style={{ display: "none" }}
                    onChange={function (e) { if (e.target.files[0]) handleFileSelect(e.target.files[0]); }}
                />
                {file ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {filePreview ? (
                            <img src={filePreview} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
                        ) : (
                            <SvgIcon path={ICONS.file} size={28} color={DY.gold} />
                        )}
                        <div style={{ flex: 1, textAlign: "left" }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: PC.navy }}>{file.name}</div>
                            <div style={{ fontSize: 11, color: PC.textMuted }}>{(file.size / 1024).toFixed(0)} KB</div>
                        </div>
                        <button onClick={function (e) { e.stopPropagation(); setFile(null); setFilePreview(null); }}
                            style={{ padding: 4, border: "none", background: "transparent", cursor: "pointer" }}
                        ><SvgIcon path={ICONS.x} size={16} color="#EF4444" /></button>
                    </div>
                ) : (
                    <div>
                        <SvgIcon path={ICONS.upload} size={24} color={DY.gold} />
                        <div style={{ fontSize: 12, color: PC.textMuted, marginTop: 6 }}>
                            Dosya sürükleyin veya <span style={{ color: DY.gold, fontWeight: 600 }}>seçin</span>
                        </div>
                        <div style={{ fontSize: 10, color: PC.textMuted, marginTop: 2 }}>Resim, PDF, DOC, XLSX (max 5MB)</div>
                    </div>
                )}
            </div>

            {/* Kaynak URL */}
            {category === "kaynak" && (
                <input
                    value={resourceUrl}
                    onChange={function (e) { setResourceUrl(e.target.value); }}
                    placeholder="Kaynak linki (https://...)"
                    style={{
                        width: "100%", padding: "10px 14px", border: "1px solid " + PC.border,
                        borderRadius: 10, fontSize: 13, marginTop: 12, outline: "none",
                    }}
                />
            )}

            {/* Anket seçenekleri */}
            {category === "anket" && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: PC.navy }}>Anket Seçenekleri</div>
                    {pollOptions.map(function (opt, idx) {
                        return (
                            <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: PC.textMuted, width: 20 }}>{idx + 1}.</span>
                                <input
                                    value={opt}
                                    onChange={function (e) {
                                        var updated = [...pollOptions];
                                        updated[idx] = e.target.value;
                                        setPollOptions(updated);
                                    }}
                                    placeholder={"Seçenek " + (idx + 1)}
                                    style={{
                                        flex: 1, padding: "8px 12px", border: "1px solid " + PC.border,
                                        borderRadius: 8, fontSize: 13, outline: "none",
                                    }}
                                />
                                {pollOptions.length > 2 && (
                                    <button
                                        onClick={function () { setPollOptions(pollOptions.filter(function (_, i) { return i !== idx; })); }}
                                        style={{ padding: 4, border: "none", background: "transparent", cursor: "pointer", color: "#EF4444" }}
                                    >X</button>
                                )}
                            </div>
                        );
                    })}
                    {pollOptions.length < 6 && (
                        <button
                            onClick={addPollOption}
                            style={{
                                padding: "6px 12px", border: "1px dashed " + PC.border,
                                borderRadius: 8, background: "transparent", cursor: "pointer",
                                fontSize: 12, color: PC.textMuted,
                            }}
                        >+ Seçenek Ekle</button>
                    )}
                    {/* Anket Ayarları */}
                    <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: PC.textMuted, cursor: "pointer" }}>
                            <input type="checkbox" checked={pollAnonymous} onChange={function (e) { setPollAnonymous(e.target.checked); }} />
                            Anonim oylama
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: PC.textMuted, cursor: "pointer" }}>
                            <input type="checkbox" checked={pollMultiSelect} onChange={function (e) { setPollMultiSelect(e.target.checked); }} />
                            Çoklu seçim
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <SvgIcon path={ICONS.clock} size={14} color={PC.textMuted} />
                            <input type="datetime-local" value={pollDeadline}
                                onChange={function (e) { setPollDeadline(e.target.value); }}
                                style={{ padding: "4px 8px", border: "1px solid " + PC.border, borderRadius: 6, fontSize: 11, outline: "none" }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Gönder */}
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                {onClose && (
                    <button
                        onClick={onClose}
                        style={{
                            padding: "10px 20px", border: "1px solid " + PC.border,
                            borderRadius: 10, background: "white", cursor: "pointer",
                            fontSize: 14, color: PC.textMuted,
                        }}
                    >İptal</button>
                )}
                <button
                    onClick={handleSubmit}
                    disabled={posting || uploading || !content.trim()}
                    style={{
                        padding: "10px 24px", border: "none", borderRadius: 10,
                        background: posting || !content.trim() ? PC.border : "linear-gradient(135deg, " + DY.gold + ", " + DY.goldDark + ")",
                        color: "white", cursor: posting ? "wait" : "pointer",
                        fontSize: 14, fontWeight: 700,
                        boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
                    }}
                >{uploading ? "Yükleniyor..." : posting ? "Gönderiliyor..." : "Paylaş"}</button>
            </div>
        </div>
    );
};

export default NewPostForm;
