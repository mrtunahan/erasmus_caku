// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Yaz Okulu Modülü
// Üniversiteler arası ders karşılaştırma ve intibak sistemi
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useCallback } = React;

// ── Shared importlar ──
const _C = window.C;
const _DY = window.DY || { bg: "#fff", navy: "#1B2A4A", gold: "#C4973B", green: "#2E7D52" }; // Fallback
const _Card = window.Card;
const _Btn = window.Btn;
const _Input = window.Input;
const _Select = window.Select;
const _FormField = window.FormField;
const _Modal = window.Modal;
const _Badge = window.Badge;
const _convertGrade = window.convertGrade;
const _FileDropZone = window.MuafiyetUtils?.FileDropZone;

// Eğer MuafiyetUtils (ders-muafiyet.jsx) yüklenmemişse hata vermemesi için dummy
const Utils = window.MuafiyetUtils || {
    extractFromFile: async () => ({ type: 'text', data: '' }),
    normalizeText: (t) => t,
    combinedSimilarity: () => 0,
    autoMatchCourses: () => [],
    ensureLibsLoaded: async () => { },
    parseCoursesFromTable: () => [],
    parseCoursesFromText: () => []
};

// ══════════════════════════════════════════════════════════════
// SABİTLER
// ══════════════════════════════════════════════════════════════

const TABS = {
    SEARCH: "search",   // Öğrenci için arama/başvuru
    ADMIN: "admin",     // Admin öğrenci yönetimi
    REVIEW: "review",   // Admin insan onayı paneli
    SETTINGS: "settings" // Ayarlar
};

const ACADEMIC_YEARS = [
    "2025-2026", "2024-2025", "2023-2024", "2022-2023"
];

// ══════════════════════════════════════════════════════════════
// FIREBASE CRUD
// ══════════════════════════════════════════════════════════════

const YazOkuluDB = {
    _checkDb() {
        return window.apiFirestore;
    },

    studentsRef() { return this._checkDb().collection("yaz_okulu_students"); },
    recordsRef() { return this._checkDb().collection("yaz_okulu_records"); },
    settingsRef() { return this._checkDb().collection("yaz_okulu_settings"); },

    // Öğrenci İşlemleri
    async fetchStudents() {
        try {
            const snap = await this.studentsRef().orderBy("updatedAt", "desc").get();
            return snap.docs.map(d => ({ ...d.data(), id: d.id }));
        } catch (e) {
            console.error("Fetch Students Error:", e);
            return [];
        }
    },

    async saveStudent(student) {
        const data = { ...student, updatedAt: window.apiFieldValue.serverTimestamp() };
        if (student.id) {
            await this.studentsRef().doc(student.id).update(data);
            return student;
        } else {
            const ref = await this.studentsRef().add({
                ...data,
                createdAt: window.apiFieldValue.serverTimestamp()
            });
            return { ...data, id: ref.id };
        }
    },

    async deleteStudent(id) {
        await this.studentsRef().doc(id).delete();
    },

    // Ders Havuzu / Ayarlar
    async saveCourseCatalog(courses) {
        await this.settingsRef().doc("caku_catalog").set({
            courses,
            updatedAt: window.apiFieldValue.serverTimestamp()
        });
    },

    async fetchCourseCatalog() {
        try {
            const doc = await this.settingsRef().doc("caku_catalog").get();
            return doc.exists ? doc.data().courses : [];
        } catch (e) {
            return [];
        }
    },

    // İntibak Kaydı (Başvuru)
    async saveApplication(appData) {
        const data = { ...appData, updatedAt: window.apiFieldValue.serverTimestamp() };
        if (appData.id) {
            await this.recordsRef().doc(appData.id).update(data);
            return appData;
        } else {
            const ref = await this.recordsRef().add({
                ...data,
                status: "pending",
                createdAt: window.apiFieldValue.serverTimestamp()
            });
            return { ...data, id: ref.id };
        }
    },

    async fetchStudentApplication(studentId) {
        try {
            const snap = await this.recordsRef().where("studentId", "==", studentId).limit(1).get();
            if (snap.empty) return null;
            return { ...snap.docs[0].data(), id: snap.docs[0].id };
        } catch (e) {
            console.error("Başvuru yüklenemedi:", e);
            return null;
        }
    },

    // Tüm başvuruları çek (admin için inceleme listesi)
    async fetchAllApplications() {
        try {
            const snap = await this.recordsRef().orderBy("updatedAt", "desc").get();
            return snap.docs.map(d => ({ ...d.data(), id: d.id }));
        } catch (e) {
            console.error("Başvurular yüklenemedi:", e);
            return [];
        }
    },

    // Admin insan onayı: tek bir match'in kararını günceller
    async updateMatchDecision(recordId, matchIndex, decision) {
        const doc = await this.recordsRef().doc(recordId).get();
        if (!doc.exists) throw new Error("Başvuru bulunamadı");
        const data = doc.data();
        const matches = (data.matches || []).slice();
        matches[matchIndex] = {
            ...matches[matchIndex],
            adminDecision: decision,
            adminUpdatedAt: new Date().toISOString(),
        };
        const pendingLeft = matches.filter(m => m.tier === "review" && !m.adminDecision).length;
        await this.recordsRef().doc(recordId).update({
            matches,
            pendingReviewCount: pendingLeft,
            updatedAt: window.apiFieldValue.serverTimestamp(),
        });
        return matches;
    },
};

// ══════════════════════════════════════════════════════════════
// ANA UYGULAMA
// ══════════════════════════════════════════════════════════════

const YazOkuluApp = ({ currentUser, activeDepartment, departmentInfo }) => {
    const [activeTab, setActiveTab] = useState(TABS.SEARCH);
    const [students, setStudents] = useState([]);
    const [cakuCourses, setCakuCourses] = useState([]);
    const [myStudentProfile, setMyStudentProfile] = useState(null);
    const [loading, setLoading] = useState(false);

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'bolum_yetkilisi' || currentUser?.role === 'professor';

    useEffect(() => {
        loadInitialData();
    }, [currentUser, activeDepartment]);

    const loadInitialData = async () => {
        setLoading(true);
        // 1. ÇAKÜ Ders Kataloğunu Çek
        let catalog = await YazOkuluDB.fetchCourseCatalog();
        if ((!catalog || catalog.length === 0) && window.HOME_INSTITUTION_CATALOG) {
            catalog = window.HOME_INSTITUTION_CATALOG.courses || [];
        }
        setCakuCourses(catalog);

        // 2. Öğrencileri Çek (Sadece Admin) - bölüm bazlı filtreleme
        if (isAdmin) {
            const allStds = await YazOkuluDB.fetchStudents();
            const stds = allStds.filter(s => {
                const deptId = s.departmentId || "bilgisayar";
                return deptId === activeDepartment;
            });
            setStudents(stds);
            // Admin için varsayılan tab
            if (activeTab === TABS.SEARCH) setActiveTab(TABS.ADMIN);
        }
        // 3. Öğrenci girişi ise kendi profilini bul
        else if (currentUser?.role === 'student' || currentUser?.studentNumber) {
            const stds = await YazOkuluDB.fetchStudents();
            const me = stds.find(s => s.studentNo === currentUser.studentNumber);
            if (me) {
                setMyStudentProfile(me);
                setActiveTab(TABS.SEARCH);
            } else {
                // Create a temporary profile for demo purposes if not found in specific DB but logged in
                setMyStudentProfile({
                    firstName: currentUser.name?.split(' ')[0] || "Öğrenci",
                    lastName: currentUser.name?.split(' ').slice(1).join(' ') || "",
                    studentNo: currentUser.studentNumber,
                    id: currentUser.uid || currentUser.studentNumber // Fallback ID
                });
                setActiveTab(TABS.SEARCH);
            }
        }
        setLoading(false);
    };

    const handleCreateStudent = async (student) => {
        try {
            await YazOkuluDB.saveStudent(student);
            if (window.FirebaseDB && window.FirebaseDB.updatePassword) {
                if (student.password && student.password.length >= 6) {
                    await window.FirebaseDB.updatePassword(student.studentNo, student.password);
                }
            }
            loadInitialData();
        } catch (e) {
            alert("Öğrenci kaydedilemedi: " + e.message);
        }
    };

    return (
        <div style={{ minHeight: "80vh", paddingBottom: 60 }}>
            {/* Header */}
            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 30, background: "white", padding: 24, borderRadius: 16,
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
            }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: _C.navy, marginBottom: 4, fontFamily: "'Playfair Display', serif" }}>
                        Yaz Okulu İntibak Sistemi
                    </h1>
                    <p style={{ color: _C.textMuted }}>
                        Üniversiteler arası ders içerik analizi ve not dönüşüm modülü
                    </p>
                </div>

                {/* Tab Navigation */}
                <div style={{ display: "flex", background: _C.bg, padding: 4, borderRadius: 12, gap: 4 }}>
                    {isAdmin && (
                        <>
                            <TabBtn id={TABS.ADMIN} active={activeTab} onClick={setActiveTab}>Öğrenciler</TabBtn>
                            <TabBtn id={TABS.REVIEW} active={activeTab} onClick={setActiveTab}>İnceleme</TabBtn>
                            <TabBtn id={TABS.SETTINGS} active={activeTab} onClick={setActiveTab}>Ayarlar</TabBtn>
                        </>
                    )}
                    {!isAdmin && (
                        <TabBtn id={TABS.SEARCH} active={activeTab} onClick={setActiveTab}>Başvurum</TabBtn>
                    )}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: "center", padding: 60, color: _C.textMuted }}>Yükleniyor...</div>
            ) : (
                <>
                    {activeTab === TABS.ADMIN && (
                        <AdminStudentPanel
                            students={students}
                            onSave={handleCreateStudent}
                            onDelete={async (id) => {
                                try {
                                    await YazOkuluDB.deleteStudent(id);
                                    loadInitialData();
                                } catch (e) {
                                    alert("Silme hatası: " + e.message);
                                }
                            }}
                        />
                    )}

                    {activeTab === TABS.REVIEW && (
                        <AdminReviewPanel />
                    )}

                    {activeTab === TABS.SETTINGS && (
                        <SettingsPanel
                            cakuCourses={cakuCourses}
                            onSaveCatalog={async (courses) => {
                                try {
                                    await YazOkuluDB.saveCourseCatalog(courses);
                                    setCakuCourses(courses);
                                    alert("Ders kataloğu güncellendi!");
                                } catch (e) {
                                    alert("Katalog kaydedilemedi: " + e.message);
                                }
                            }}
                        />
                    )}

                    {activeTab === TABS.SEARCH && (
                        <StudentApplicationPanel
                            student={myStudentProfile || {}}
                            cakuCourses={cakuCourses}
                            currentUser={currentUser}
                        />
                    )}
                </>
            )}
        </div>
    );
};

const TabBtn = ({ id, active, onClick, children }) => {
    const isActive = active === id;
    return (
        <button
            onClick={() => onClick(id)}
            style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: isActive ? _C.navy : "transparent",
                color: isActive ? "white" : _C.textMuted,
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.2s"
            }}
        >
            {children}
        </button>
    );
};

// ══════════════════════════════════════════════════════════════
// ADMIN: ÖĞRENCİ YÖNETİMİ
// ══════════════════════════════════════════════════════════════

// ── Admin İnceleme Paneli (yaz okulu başvuruları) ──
const AdminReviewPanel = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        YazOkuluDB.fetchAllApplications().then(apps => {
            setApplications(apps);
            setLoading(false);
        });
    }, []);

    const handleDecision = async (appId, matchIdx, decision) => {
        setProcessing(true);
        try {
            const updatedMatches = await YazOkuluDB.updateMatchDecision(appId, matchIdx, decision);
            setApplications(prev => prev.map(a => {
                if (a.id !== appId) return a;
                const pendingLeft = updatedMatches.filter(m => m.tier === "review" && !m.adminDecision).length;
                return { ...a, matches: updatedMatches, pendingReviewCount: pendingLeft };
            }));
        } catch (e) {
            alert("Karar güncellenemedi: " + e.message);
        }
        setProcessing(false);
    };

    const pendingApps = applications.filter(a => (a.pendingReviewCount || 0) > 0);
    const reviewedApps = applications.filter(a => (a.pendingReviewCount || 0) === 0 && (a.matches || []).length > 0);

    if (loading) return <div style={{ padding: 40, textAlign: "center", color: _C.textMuted }}>Başvurular yükleniyor...</div>;

    return (
        <div>
            {/* Özet */}
            <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
                {[
                    { label: "Toplam Başvuru", value: applications.length, color: _C.navy, bg: "#F1F5F9" },
                    { label: "İnceleme Bekliyor", value: pendingApps.length, color: "#D97706", bg: "#FEF3C7" },
                    { label: "Tamamlandı", value: reviewedApps.length, color: "#059669", bg: "#D1FAE5" },
                ].map((s, i) => (
                    <div key={i} style={{
                        flex: "1 1 120px", padding: "14px 18px", borderRadius: 12,
                        background: s.bg, textAlign: "center",
                        border: "1px solid " + _C.border,
                    }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: _C.textMuted, marginTop: 4 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {pendingApps.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: _C.textMuted, background: "white", borderRadius: 12, border: "1px solid " + _C.border }}>
                    İnceleme bekleyen başvuru bulunmuyor.
                </div>
            )}

            {applications.map(app => {
                const isExpanded = expandedId === app.id;
                const hasPending = (app.pendingReviewCount || 0) > 0;
                return (
                    <div key={app.id} style={{
                        marginBottom: 12, borderRadius: 12,
                        border: "1px solid " + (hasPending ? "#FCD34D" : _C.border),
                        background: "white", overflow: "hidden",
                    }}>
                        {/* Başlık */}
                        <div style={{
                            padding: "14px 18px", display: "flex", justifyContent: "space-between",
                            alignItems: "center", cursor: "pointer",
                        }} onClick={() => setExpandedId(isExpanded ? null : app.id)}>
                            <div>
                                <div style={{ fontWeight: 700, color: _C.navy }}>
                                    {app.studentName || "İsimsiz"}
                                    <span style={{ fontFamily: "monospace", fontSize: 12, color: _C.textMuted, marginLeft: 8 }}>#{app.studentNo}</span>
                                </div>
                                <div style={{ fontSize: 12, color: _C.textMuted, marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    <span>{app.targetUniversity || "—"}</span>
                                    <span>{app.academicYear}</span>
                                    {hasPending && (
                                        <span style={{ color: "#D97706", fontWeight: 600, background: "#FEF3C7", padding: "0 6px", borderRadius: 10 }}>
                                            ⏳ {app.pendingReviewCount} bekliyor
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span style={{ color: _C.textMuted, fontSize: 18 }}>{isExpanded ? "▲" : "▼"}</span>
                        </div>

                        {/* İnceleme Satırları */}
                        {isExpanded && (
                            <div style={{ padding: "0 18px 16px", borderTop: "1px solid " + _C.border }}>
                                {(app.matches || []).map((m, idx) => {
                                    if (m.tier !== "review") return null;
                                    const decided = m.adminDecision;
                                    return (
                                        <div key={idx} style={{
                                            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                                            padding: "10px 12px", marginTop: 10, borderRadius: 8,
                                            background: decided ? (decided === "confirmed" ? "#F0FDF4" : "#FEF2F2") : "#FFFBEB",
                                            border: "1px solid " + (decided ? (decided === "confirmed" ? "#BBF7D0" : "#FECACA") : "#FCD34D"),
                                            fontSize: 13,
                                        }}>
                                            <div style={{ flex: "1 1 180px" }}>
                                                <span style={{ fontWeight: 700, color: _C.navy }}>{m.external?.code}</span>
                                                <span style={{ color: _C.textMuted, marginLeft: 6 }}>{m.external?.name}</span>
                                            </div>
                                            <div style={{ fontSize: 11, color: _C.textMuted, flex: "1 1 140px" }}>
                                                {m.local ? "→ " + m.local.code + " " + m.local.name : "→ Eşleşme yok"}
                                            </div>
                                            <span style={{
                                                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                                                background: "#DBEAFE", color: _C.navy,
                                            }}>%{Math.round((m.score || 0) * 100)}</span>
                                            {decided ? (
                                                <span style={{
                                                    padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                                                    background: decided === "confirmed" ? "#D1FAE5" : "#FEE2E2",
                                                    color: decided === "confirmed" ? "#059669" : "#DC2626",
                                                }}>
                                                    {decided === "confirmed" ? "✓ Onaylandı" : "✗ Reddedildi"}
                                                </span>
                                            ) : (
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    <button disabled={processing} onClick={() => handleDecision(app.id, idx, "confirmed")}
                                                        style={{ padding: "4px 14px", borderRadius: 20, border: "none", background: "#059669", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                                        Onayla
                                                    </button>
                                                    <button disabled={processing} onClick={() => handleDecision(app.id, idx, "rejected")}
                                                        style={{ padding: "4px 14px", borderRadius: 20, border: "none", background: "#DC2626", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                                        Reddet
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {!(app.matches || []).some(m => m.tier === "review") && (
                                    <div style={{ padding: 16, textAlign: "center", color: _C.textMuted, fontSize: 13 }}>
                                        Bu başvuruda inceleme bekleyen ders bulunmuyor.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const AdminStudentPanel = ({ students, onSave, onDelete }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ firstName: "", lastName: "", studentNo: "", password: "" });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(form);
        setIsModalOpen(false);
        setForm({ firstName: "", lastName: "", studentNo: "", password: "" });
    };

    return (
        <_Card title="Yaz Okulu Öğrenci Listesi" actions={
            <_Btn onClick={() => setIsModalOpen(true)} icon={<PlusIcon />}>Yeni Öğrenci Ekle</_Btn>
        }>
            <div className="responsive-table-wrap"><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                    <tr style={{ borderBottom: `2px solid ${_C.border}`, textAlign: "left" }}>
                        <th style={{ padding: 12 }}>Öğrenci No</th>
                        <th style={{ padding: 12 }}>Ad Soyad</th>
                        <th style={{ padding: 12 }}>Gidilen Üniversite/Bölüm</th>
                        <th style={{ padding: 12 }}>Şifre</th>
                        <th style={{ padding: 12, textAlign: "right" }}>İşlem</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map(s => (
                        <tr key={s.id} style={{ borderBottom: `1px solid ${_C.borderLight}` }}>
                            <td style={{ padding: 12, fontWeight: 600 }}>{s.studentNo}</td>
                            <td style={{ padding: 12 }}>{s.firstName} {s.lastName}</td>
                            <td style={{ padding: 12, color: _C.textMuted }}>
                                {s.targetUniversity ? `${s.targetUniversity} - ${s.targetDepartment}` : "-"}
                            </td>
                            <td style={{ padding: 12, color: _C.textMuted }}>****</td>
                            <td style={{ padding: 12, textAlign: "right" }}>
                                <button
                                    onClick={() => confirm("Silmek istediğinize emin misiniz?") && onDelete(s.id)}
                                    style={{ background: "none", border: "none", color: _C.accent, cursor: "pointer" }}
                                >
                                    Sil
                                </button>
                            </td>
                        </tr>
                    ))}
                    {students.length === 0 && (
                        <tr><td colSpan="5" style={{ padding: 24, textAlign: "center", color: _C.textMuted }}>Kayıtlı öğrenci bulunamadı.</td></tr>
                    )}
                </tbody>
            </table></div>

            {isModalOpen && (
                <_Modal title="Yeni Öğrenci Ekle" onClose={() => setIsModalOpen(false)}>
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <_FormField label="Öğrenci No">
                            <_Input value={form.studentNo} onChange={e => setForm({ ...form, studentNo: e.target.value })} required />
                        </_FormField>
                        <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            <_FormField label="Ad">
                                <_Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required />
                            </_FormField>
                            <_FormField label="Soyad">
                                <_Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required />
                            </_FormField>
                        </div>
                        <_FormField label="Giriş Şifresi">
                            <_Input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                        </_FormField>
                        <_Btn type="submit">Kaydet</_Btn>
                    </form>
                </_Modal>
            )}
        </_Card>
    );
};

// ══════════════════════════════════════════════════════════════
// ADMIN: AYARLAR (Ders Kataloğu)
// ══════════════════════════════════════════════════════════════

const SettingsPanel = ({ cakuCourses, onSaveCatalog }) => {
    const [jsonInput, setJsonInput] = useState(JSON.stringify(cakuCourses, null, 2));

    return (
        <_Card title="ÇAKÜ Mühendislik Fakültesi Ders Kataloğu">
            <p style={{ marginBottom: 16, color: _C.textMuted }}>
                Buraya JSON formatında ders kataloğunu yapıştırabilirsiniz. Bu katalog karşılaştırma motorunda "referans" olarak kullanılacaktır.
            </p>
            <textarea
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                style={{
                    width: "100%", height: 300, padding: 12, borderRadius: 8,
                    border: `1px solid ${_C.border}`, fontFamily: "monospace", fontSize: 12
                }}
            />
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                <_Btn onClick={() => {
                    try {
                        const parsed = JSON.parse(jsonInput);
                        onSaveCatalog(parsed);
                    } catch (e) {
                        alert("JSON Hatası: " + e.message);
                    }
                }}>Kataloğu Güncelle</_Btn>
            </div>
        </_Card>
    );
};

// ══════════════════════════════════════════════════════════════
// ÖĞRENCİ: BAŞVURU VE KARŞILAŞTIRMA MOTORU
// ══════════════════════════════════════════════════════════════

const StudentApplicationPanel = ({ student, cakuCourses }) => {
    // Başvuru Formu State
    const [info, setInfo] = useState({
        targetUni: "", targetFaculty: "", targetDept: "", academicYear: "2024-2025"
    });

    // Ders Listeleri
    const [externalCourses, setExternalCourses] = useState([]); // Karşı kurum dersleri
    const [matches, setMatches] = useState([]); // Eşleşmeler

    const [viewMode, setViewMode] = useState("input"); // input (veri girişi) | compare (karşılaştırma)
    const [loading, setLoading] = useState(false);

    // Mevcut başvuruyu yükle
    useEffect(() => {
        if (student.id) {
            YazOkuluDB.fetchStudentApplication(student.id).then(app => {
                if (app) {
                    setInfo({
                        targetUni: app.targetUniversity || "",
                        targetFaculty: app.targetFaculty || "",
                        targetDept: app.targetDepartment || "",
                        academicYear: app.academicYear || "2024-2025"
                    });
                    setExternalCourses(app.externalCourses || []);
                    setMatches(app.matches || []);
                    if (app.matches?.length > 0) setViewMode("compare");
                }
            });
        }
        // Libs yükle
        Utils.ensureLibsLoaded();
    }, [student]);

    // Dosyadan ders yükleme
    const handleFileLoad = async (file) => {
        setLoading(true);
        try {
            const res = await Utils.extractFromFile(file);
            let courses = [];
            if (res.type === 'table') courses = Utils.parseCoursesFromTable(res.data);
            else courses = Utils.parseCoursesFromText(res.data);

            if (courses.length > 0) {
                setExternalCourses(prev => {
                    // Duplicate check
                    const codes = new Set(prev.map(c => c.code));
                    const uniqueNew = courses.filter(c => !codes.has(c.code));
                    return [...prev, ...uniqueNew];
                });
                alert(`${courses.length} ders içeriği başarıyla okundu!`);
            } else {
                alert("Ders bulunamadı. Lütfen dosya formatını kontrol edin veya metin tabanlı bir PDF yükleyin.");
            }
        } catch (e) {
            alert("Hata: " + e.message);
        }
        setLoading(false);
    };

    // Otomatik Eşleştirme Motoru
    const runAutoMatch = () => {
        setLoading(true);
        // 3-katmanlı eşik: %80+ otomatik onay, %60-79 inceleme, <%60 red
        const AUTO_APPROVE = Utils.THRESHOLD_AUTO_APPROVE || 0.80;
        const REVIEW_MIN   = Utils.THRESHOLD_REVIEW || 0.60;
        const results = Utils.autoMatchCourses(externalCourses, cakuCourses, REVIEW_MIN);

        // Formatı bizim match yapımıza çevir; tier bilgisini aktar
        const formattedMatches = results.map(r => {
            const tier = r.tier || (r.matched ? "approved" : (r.contentScore >= REVIEW_MIN ? "review" : "rejected"));
            return {
                external: r.source,
                local: r.target,
                score: r.contentScore,
                tier: tier,
                adminDecision: null,
                status: tier === "approved" ? "Otomatik Onay"
                       : tier === "review"   ? "İnceleme Bekliyor"
                       :                       "Red",
            };
        });

        setMatches(formattedMatches);
        setViewMode("compare");
        setLoading(false);
    };

    // Kaydet
    const handleSave = async () => {
        if (!student.id) return alert("Öğrenci kaydı bulunamadı! Lütfen önce giriş yapın.");
        setLoading(true);
        try {
            const pendingCount = matches.filter(m => m.tier === "review" && !m.adminDecision).length;
            const approvedCount = matches.filter(m => m.tier === "approved" || m.adminDecision === "confirmed").length;
            await YazOkuluDB.saveApplication({
                studentId: student.id,
                studentName: `${student.firstName} ${student.lastName}`,
                studentNo: student.studentNo,
                targetUniversity: info.targetUni,
                targetFaculty: info.targetFaculty,
                targetDepartment: info.targetDept,
                academicYear: info.academicYear,
                externalCourses,
                matches,
                pendingReviewCount: pendingCount,
                approvedCount: approvedCount,
                submittedAt: new Date().toISOString()
            });
            alert("Başvurunuz başarıyla kaydedildi!");
        } catch (e) {
            alert("Kayıt hatası: " + e.message);
        }
        setLoading(false);
    };

    // Export
    const handleExport = () => {
        if (!window.XLSX) return alert("Excel kütüphanesi yüklenmedi, lütfen sayfayı yenileyin.");

        // Data hazırlama (Dekanlık formatına benzer)
        const data = matches.map(m => ({
            "Karşı Üni Kodu": m.external.code,
            "Karşı Üni Ders Adı": m.external.name,
            "Karşı Üni AKTS": m.external.akts,
            "Karşı Üni Not": m.external.grade,
            "---": ">>>",
            "ÇAKÜ Kodu": m.local ? m.local.code : "-",
            "ÇAKÜ Ders Adı": m.local ? m.local.name : "-",
            "ÇAKÜ AKTS": m.local ? m.local.credits || m.local.akts : "-",
            "Durum": m.status
        }));

        const ws = window.XLSX.utils.json_to_sheet(data);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Intibak Tablosu");
        window.XLSX.writeFile(wb, `${student.studentNo}_YazOkulu_Intibak.xlsx`);
    };

    return (
        <div style={{ paddingBottom: 60 }}>
            {/* Üst Bilgi Formu */}
            <_Card title="Başvuru Bilgileri">
                <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <_FormField label="Gidilen Üniversite">
                        <_Input value={info.targetUni} onChange={e => setInfo({ ...info, targetUni: e.target.value })} placeholder="Örn: ODTÜ" />
                    </_FormField>
                    <_FormField label="Fakülte">
                        <_Input value={info.targetFaculty} onChange={e => setInfo({ ...info, targetFaculty: e.target.value })} placeholder="Örn: Mühendislik Fakültesi" />
                    </_FormField>
                    <_FormField label="Bölüm">
                        <_Input value={info.targetDept} onChange={e => setInfo({ ...info, targetDept: e.target.value })} placeholder="Örn: Bilgisayar Mühendisliği" />
                    </_FormField>
                    <_FormField label="Eğitim Öğretim Yılı">
                        <_Select value={info.academicYear} onChange={e => setInfo({ ...info, academicYear: e.target.value })} options={ACADEMIC_YEARS.map(y => ({ value: y, label: y }))} />
                    </_FormField>
                </div>
            </_Card>

            {/* Kontrol Butonları ve Steps */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, justifyContent: "center" }}>
                <button
                    onClick={() => setViewMode("input")}
                    style={{
                        padding: "10px 24px", borderRadius: 20, border: "2px solid",
                        borderColor: viewMode === "input" ? _C.navy : "transparent",
                        background: viewMode === "input" ? _C.navy : "white",
                        color: viewMode === "input" ? "white" : _C.navy,
                        fontWeight: 600, boxShadow: "0 2px 5px rgba(0,0,0,0.1)", cursor: "pointer"
                    }}
                >
                    1. Ders Yükleme
                </button>
                <div style={{ width: 40, height: 2, background: "#ccc", alignSelf: "center" }}></div>
                <button
                    onClick={() => {
                        if (externalCourses.length === 0) return alert("Önce ders eklemelisiniz!");
                        if (matches.length === 0) runAutoMatch();
                        setViewMode("compare");
                    }}
                    disabled={externalCourses.length === 0}
                    style={{
                        padding: "10px 24px", borderRadius: 20, border: "2px solid",
                        borderColor: viewMode === "compare" ? _C.navy : "transparent",
                        background: viewMode === "compare" ? _C.navy : "white",
                        color: viewMode === "compare" ? "white" : (externalCourses.length === 0 ? "#ccc" : _C.navy),
                        fontWeight: 600, boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                        cursor: externalCourses.length === 0 ? "not-allowed" : "pointer"
                    }}
                >
                    2. Karşılaştırma Motoru
                </button>
            </div>

            {viewMode === "input" ? (
                <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
                    {/* Sol: Dosya Yükleme */}
                    <div>
                        <_Card title="Ders İçeriklerini Yükle">
                            {_FileDropZone ? (
                                <_FileDropZone label="Transkript veya Ders Kataloğu (PDF/Excel)" onFile={handleFileLoad} loading={loading} />
                            ) : (
                                <div style={{ padding: 20, border: "2px dashed #ccc", textAlign: "center" }}>
                                    Dosya yükleme modülü hazırlanıyor...
                                </div>
                            )}
                            <div style={{ marginTop: 16, fontSize: 13, color: _C.textMuted }}>
                                Yüklenen dosyadan ders kodları ve adları otomatik çekilir. PDF formatı desteklenir.
                            </div>
                        </_Card>

                        <_Card title="Manuel Ders Ekle">
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const fd = new FormData(e.target);
                                const newCourse = {
                                    code: fd.get("code"), name: fd.get("name"), akts: fd.get("akts"), grade: fd.get("grade")
                                };
                                setExternalCourses([...externalCourses, newCourse]);
                                e.target.reset();
                            }}>
                                <div style={{ display: "grid", gap: 8 }}>
                                    <_Input name="code" placeholder="Ders Kodu (Örn: CS101)" required />
                                    <_Input name="name" placeholder="Ders Adı" required />
                                    <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                        <_Input name="akts" placeholder="AKTS" type="number" required />
                                        <_Input name="grade" placeholder="Not (Opsiyonel)" />
                                    </div>
                                    <_Btn type="submit" small>Listeye Ekle</_Btn>
                                </div>
                            </form>
                        </_Card>
                    </div>

                    {/* Sağ: Yüklenen Dersler Listesi */}
                    <_Card title={`Yüklenen Karşı Üniversite Dersleri (${externalCourses.length})`}>
                        {externalCourses.length === 0 ? (
                            <div style={{ textAlign: "center", color: _C.textMuted, padding: 40 }}>Henüz ders eklenmedi.</div>
                        ) : (
                            <div className="responsive-table-wrap"><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
                                <thead style={{ background: _C.bg, color: _C.textMuted }}>
                                    <tr>
                                        <th style={{ padding: 8, textAlign: "left" }}>Kod</th>
                                        <th style={{ padding: 8, textAlign: "left" }}>Ders Adı</th>
                                        <th style={{ padding: 8, textAlign: "center" }}>AKTS</th>
                                        <th style={{ padding: 8, textAlign: "center" }}>Not</th>
                                        <th style={{ padding: 8 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {externalCourses.map((c, i) => (
                                        <tr key={i} style={{ borderBottom: "1px solid " + _C.borderLight }}>
                                            <td style={{ padding: 8, fontWeight: 600 }}>{c.code}</td>
                                            <td style={{ padding: 8 }}>{c.name}</td>
                                            <td style={{ padding: 8, textAlign: "center" }}>{c.akts}</td>
                                            <td style={{ padding: 8, textAlign: "center" }}>{c.grade || "-"}</td>
                                            <td style={{ padding: 8, textAlign: "right" }}>
                                                <button onClick={() => setExternalCourses(externalCourses.filter((_, idx) => idx !== i))} style={{ color: "red", border: "none", background: "none", cursor: "pointer" }}>Sil</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table></div>
                        )}
                        {externalCourses.length > 0 && (
                            <div style={{ marginTop: 20, textAlign: "right" }}>
                                <_Btn onClick={() => { runAutoMatch(); }} icon={<ArrowRightIcon />}>Karşılaştırmayı Başlat</_Btn>
                            </div>
                        )}
                    </_Card>
                </div>
            ) : (
                /* KARŞILAŞTIRMA EKRANI */
                <div>
                    <h3 style={{ marginBottom: 16, color: _C.navy, textAlign: "center" }}>Ders Eşleştirme ve Analiz</h3>

                    <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                        {/* Sol: Karşı Üniversite */}
                        <div>
                            <div style={{ background: _C.navy, color: "white", padding: 12, borderRadius: "8px 8px 0 0", textAlign: "center" }}>Gidilen Üniversite</div>
                            <div style={{ background: "#f8f9fa", padding: 12, borderRadius: "0 0 8px 8px", border: "1px solid #ddd", minHeight: 400 }}>
                                {matches.map((m, i) => (
                                    <div key={i} style={{
                                        height: 120, marginBottom: 12, padding: 12,
                                        border: "1px solid " + _C.border, borderRadius: 8, background: "white",
                                        display: "flex", flexDirection: "column", justifyContent: "center"
                                    }}>
                                        <div style={{ fontWeight: 700, color: _C.navy, fontSize: 15 }}>{m.external.code}</div>
                                        <div style={{ fontWeight: 600 }}>{m.external.name}</div>
                                        <div style={{ fontSize: 13, color: _C.textMuted, marginTop: 4 }}>
                                            AKTS: <b>{m.external.akts}</b> | Not: <b>{m.external.grade || "-"}</b>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sağ: ÇAKÜ Eşleşmeleri */}
                        <div>
                            <div style={{ background: _C.gold, color: "white", padding: 12, borderRadius: "8px 8px 0 0", textAlign: "center" }}>Çankırı Karatekin Üniversitesi</div>
                            <div style={{ background: "#fffdf5", padding: 12, borderRadius: "0 0 8px 8px", border: "1px solid #ddd", minHeight: 400 }}>
                                {matches.map((m, i) => (
                                    <div key={i} style={{
                                        height: 120, marginBottom: 12, padding: 12,
                                        borderLeft: "4px solid " + (m.tier === "approved" || m.adminDecision === "confirmed" ? _C.green : m.tier === "review" ? "#F59E0B" : "#EF4444"),
                                        border: "1px solid " + _C.border,
                                        borderRadius: 8, background: m.tier === "approved" || m.adminDecision === "confirmed" ? "#F0FDF4" : m.tier === "review" ? "#FFFBEB" : "#FFF5F5",
                                        position: "relative", display: "flex", flexDirection: "column", justifyContent: "center"
                                    }}>
                                        {/* Seçim Dropdown */}
                                        <div style={{ marginBottom: 8 }}>
                                            <select
                                                value={m.local ? m.local.code : ""}
                                                onChange={(e) => {
                                                    const selected = cakuCourses.find(c => c.code === e.target.value);
                                                    const newMatches = [...matches];
                                                    newMatches[i].local = selected;
                                                    newMatches[i].status = "Uygundur"; // Manuel seçimde onayla
                                                    setMatches(newMatches);
                                                }}
                                                style={{
                                                    width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc",
                                                    fontSize: 14, fontWeight: 500
                                                }}
                                            >
                                                <option value="">-- Karşılık Seçilmedi --</option>
                                                {cakuCourses.map(c => (
                                                    <option key={c.code} value={c.code}>{c.code} - {c.name} ({c.credits || c.akts} AKTS)</option>
                                                ))}
                                            </select>
                                        </div>

                                        {m.local ? (
                                            <div style={{ fontSize: 12 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, flexWrap: "wrap", gap: 4 }}>
                                                    <span>Statü: <b>{m.local.type || "Zorunlu"}</b></span>
                                                    {m.score > 0 && <span style={{ color: _C.navy, background: "#dbeafe", padding: "0 4px", borderRadius: 4 }}>Benzerlik: %{Math.round(m.score * 100)}</span>}
                                                </div>
                                                <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                                    <span style={{
                                                        padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                                                        background: m.tier === "approved" || m.adminDecision === "confirmed" ? "#D1FAE5"
                                                                  : m.tier === "review" ? "#FEF3C7" : "#FEE2E2",
                                                        color: m.tier === "approved" || m.adminDecision === "confirmed" ? "#059669"
                                                             : m.tier === "review" ? "#D97706" : "#DC2626",
                                                    }}>
                                                        {m.tier === "approved" ? "✓ Otomatik Onay"
                                                       : m.adminDecision === "confirmed" ? "✓ Onaylandı"
                                                       : m.adminDecision === "rejected"  ? "✗ Reddedildi"
                                                       : m.tier === "review"   ? "⏳ İnceleme Bekliyor"
                                                       :                         "✗ Red"}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: 13, color: "#D97706", fontStyle: "italic" }}>
                                                <span style={{ marginRight: 6 }}>⚠</span> Eşleşen ders bulunamadı. Lütfen listeden seçiniz.
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 30, display: "flex", gap: 16, justifyContent: "center" }}>
                        <_Btn onClick={handleSave} variant="secondary">Kaydet</_Btn>
                        <_Btn onClick={handleExport} variant="success" icon={<DownloadIcon />}>Excel İndir (Dekanlık Formatı)</_Btn>
                    </div>
                </div>
            )}
        </div>
    );
};


// ── Icons ──
const PlusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);
const ArrowRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
);
const DownloadIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

// ── Window'a export ──
window.YazOkuluApp = YazOkuluApp;
