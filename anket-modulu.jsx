// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Anket Modülü
// Çoktan seçmeli anket oluşturma, oylama, anlık sonuç grafikleri
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ── Renkler ──
const ANK = {
  primary: "#7c3aed",
  primaryLight: "#a78bfa",
  primaryPale: "#ede9fe",
  gold: "#d4af37",
  green: "#059669",
  greenLight: "#d1fae5",
  red: "#dc2626",
  redLight: "#fee2e2",
  orange: "#ea580c",
  orangeLight: "#ffedd5",
  bg: "#f5f3ff",
  card: "#ffffff",
  text: "#1f2937",
  textMuted: "#6b7280",
  border: "#e5e7eb",
};

const CHART_COLORS = [
  "#7c3aed", "#3b82f6", "#059669", "#ea580c", "#ec4899",
  "#eab308", "#14b8a6", "#f43f5e", "#6366f1", "#8b5cf6",
];

// ── SVG Icon Helper ──
const AnkIcon = ({ path, size, color }) => (
  <svg width={size || 18} height={size || 18} viewBox="0 0 24 24" fill="none"
    stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const ANK_ICONS = {
  barChart: "M18 20V10M12 20V4M6 20v-6",
  plus: "M12 5v14M5 12h14",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  clock: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  eyeOff: "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  share: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  calendar: "M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18",
};

// ══════════════════════════════════════════════════════════════
// ANA MODÜL
// ══════════════════════════════════════════════════════════════
function AnketModuluApp({ currentUser }) {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [filter, setFilter] = useState("active"); // active, ended, all

  const userId = currentUser?.studentNumber || currentUser?.name || "anonymous";
  const isAdmin = currentUser?.role === "admin";

  // ── Anketleri Yükle ──
  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const db = window.firebase?.firestore();
      if (!db) { setLoading(false); return; }
      const snapshot = await db.collection("surveys").orderBy("createdAt", "desc").get();
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setSurveys(data);
    } catch (e) {
      console.error("Anketler yuklenemedi:", e);
    }
    setLoading(false);
  };

  // ── Anket Oluştur ──
  const handleCreateSurvey = async (surveyData) => {
    try {
      const db = window.firebase?.firestore();
      if (!db) return;

      const optionsMap = {};
      surveyData.options.forEach((opt, i) => {
        optionsMap[`opt_${i}`] = { text: opt, votes: 0 };
      });

      const docData = {
        title: surveyData.title,
        description: surveyData.description || "",
        options: optionsMap,
        isMultiSelect: surveyData.isMultiSelect || false,
        isAnonymous: surveyData.isAnonymous || false,
        endDate: surveyData.endDate || null,
        totalVotes: 0,
        voters: {},
        createdBy: userId,
        createdByName: currentUser?.name || userId,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("surveys").add(docData);
      setSurveys(prev => [{ ...docData, id: docRef.id }, ...prev]);
      setShowCreateModal(false);
    } catch (e) {
      console.error("Anket olusturulamadi:", e);
      alert("Anket oluşturulurken hata oluştu!");
    }
  };

  // ── Oy Ver ──
  const handleVote = async (surveyId, selectedOptions) => {
    try {
      const db = window.firebase?.firestore();
      if (!db) return;

      const survey = surveys.find(s => s.id === surveyId);
      if (!survey) return;

      // Daha önce oy vermiş mi?
      if (survey.voters?.[userId]) {
        alert("Bu ankete zaten oy verdiniz!");
        return;
      }

      const updatedOptions = { ...survey.options };
      selectedOptions.forEach(optKey => {
        if (updatedOptions[optKey]) {
          updatedOptions[optKey] = {
            ...updatedOptions[optKey],
            votes: (updatedOptions[optKey].votes || 0) + 1,
          };
        }
      });

      const updatedVoters = {
        ...survey.voters,
        [userId]: survey.isAnonymous ? true : selectedOptions,
      };

      await db.collection("surveys").doc(surveyId).update({
        options: updatedOptions,
        voters: updatedVoters,
        totalVotes: Object.keys(updatedVoters).length,
      });

      setSurveys(prev => prev.map(s =>
        s.id === surveyId
          ? { ...s, options: updatedOptions, voters: updatedVoters, totalVotes: Object.keys(updatedVoters).length }
          : s
      ));

      if (selectedSurvey?.id === surveyId) {
        setSelectedSurvey(prev => ({
          ...prev,
          options: updatedOptions,
          voters: updatedVoters,
          totalVotes: Object.keys(updatedVoters).length,
        }));
      }
    } catch (e) {
      console.error("Oy verilemedi:", e);
    }
  };

  // ── Anket Sil ──
  const handleDeleteSurvey = async (surveyId) => {
    if (!confirm("Bu anketi silmek istediğinize emin misiniz?")) return;
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      await db.collection("surveys").doc(surveyId).delete();
      setSurveys(prev => prev.filter(s => s.id !== surveyId));
      if (selectedSurvey?.id === surveyId) setSelectedSurvey(null);
    } catch (e) {
      console.error("Anket silinemedi:", e);
    }
  };

  // ── Süre Kontrolü ──
  const isSurveyEnded = (survey) => {
    if (!survey.endDate) return false;
    return new Date(survey.endDate) < new Date();
  };

  // ── Filtrele ──
  const filteredSurveys = useMemo(() => {
    if (filter === "active") return surveys.filter(s => !isSurveyEnded(s));
    if (filter === "ended") return surveys.filter(s => isSurveyEnded(s));
    return surveys;
  }, [surveys, filter]);

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ background: ANK.bg, minHeight: "100vh", padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #5b21b6 0%, #7c3aed 50%, #a78bfa 100%)",
        padding: "32px 0 24px", marginBottom: 24,
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ color: "white", fontSize: 28, fontWeight: 700, fontFamily: "'Playfair Display', serif", display: "flex", alignItems: "center", gap: 10 }}>
                <AnkIcon path={ANK_ICONS.barChart} size={28} color="rgba(255,255,255,0.8)" /> Anket Modülü
              </h1>
              <p style={{ color: "rgba(255,255,255,0.7)", marginTop: 4, fontSize: 14 }}>
                Anket oluşturun, oy verin, sonuçları anlık takip edin
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(8px)",
              }}
            >
              <AnkIcon path={ANK_ICONS.plus} size={18} color="white" /> Yeni Anket
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
        {/* Filtre */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[
            { key: "active", label: "Aktif Anketler" },
            { key: "ended", label: "Sona Erenler" },
            { key: "all", label: "Tümü" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                border: `1px solid ${filter === f.key ? ANK.primary : ANK.border}`,
                background: filter === f.key ? ANK.primaryPale : "white",
                color: filter === f.key ? ANK.primary : ANK.textMuted,
              }}
            >
              {f.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: ANK.textMuted, alignSelf: "center" }}>
            {filteredSurveys.length} anket
          </span>
        </div>

        {/* Anket Listesi */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: ANK.textMuted }}>Yükleniyor...</div>
        ) : filteredSurveys.length === 0 ? (
          <div style={{
            background: "white", borderRadius: 16, padding: 60, textAlign: "center",
            border: `1px solid ${ANK.border}`,
          }}>
            <AnkIcon path={ANK_ICONS.barChart} size={48} color="#d1d5db" />
            <h3 style={{ color: ANK.textMuted, marginTop: 16 }}>
              {filter === "active" ? "Aktif anket yok" : filter === "ended" ? "Sona eren anket yok" : "Henüz anket oluşturulmamış"}
            </h3>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {filteredSurveys.map(survey => (
              <SurveyCard
                key={survey.id}
                survey={survey}
                userId={userId}
                isAdmin={isAdmin}
                isEnded={isSurveyEnded(survey)}
                onVote={handleVote}
                onDelete={handleDeleteSurvey}
                expanded={selectedSurvey?.id === survey.id}
                onToggle={() => setSelectedSurvey(selectedSurvey?.id === survey.id ? null : survey)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Anket Oluşturma Modalı */}
      {showCreateModal && (
        <CreateSurveyModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateSurvey}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ANKET KARTI
// ══════════════════════════════════════════════════════════════
function SurveyCard({ survey, userId, isAdmin, isEnded, onVote, onDelete, expanded, onToggle }) {
  const [selectedOpts, setSelectedOpts] = useState([]);
  const hasVoted = !!survey.voters?.[userId];
  const canVote = !hasVoted && !isEnded;
  const isOwner = survey.createdBy === userId;
  const showResults = hasVoted || isEnded || isAdmin;

  const optionEntries = Object.entries(survey.options || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const maxVotes = Math.max(...optionEntries.map(([, o]) => o.votes || 0), 1);
  const totalOptionVotes = optionEntries.reduce((sum, [, o]) => sum + (o.votes || 0), 0);

  const handleToggleOption = (optKey) => {
    if (!canVote) return;
    if (survey.isMultiSelect) {
      setSelectedOpts(prev => prev.includes(optKey) ? prev.filter(k => k !== optKey) : [...prev, optKey]);
    } else {
      setSelectedOpts([optKey]);
    }
  };

  const handleSubmitVote = () => {
    if (selectedOpts.length === 0) return;
    onVote(survey.id, selectedOpts);
    setSelectedOpts([]);
  };

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatEndDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getRemainingTime = (dateStr) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr) - new Date();
    if (diff <= 0) return "Sona erdi";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days} gün ${hours} saat kaldı`;
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} saat ${mins} dakika kaldı`;
  };

  return (
    <div style={{
      background: "white", borderRadius: 16, overflow: "hidden",
      border: `1px solid ${isEnded ? "#d1d5db" : ANK.border}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      opacity: isEnded ? 0.85 : 1,
    }}>
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          padding: "20px 24px", cursor: "pointer",
          borderBottom: expanded ? `1px solid ${ANK.border}` : "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: ANK.text }}>{survey.title}</h3>
              {isEnded && (
                <span style={{
                  background: ANK.redLight, color: ANK.red, padding: "2px 8px",
                  borderRadius: 4, fontSize: 11, fontWeight: 600,
                }}>Sona Erdi</span>
              )}
              {survey.isAnonymous && (
                <span style={{
                  background: ANK.primaryPale, color: ANK.primary, padding: "2px 8px",
                  borderRadius: 4, fontSize: 11, fontWeight: 600,
                }}>
                  <AnkIcon path={ANK_ICONS.eyeOff} size={10} /> Anonim
                </span>
              )}
              {survey.isMultiSelect && (
                <span style={{
                  background: ANK.orangeLight, color: ANK.orange, padding: "2px 8px",
                  borderRadius: 4, fontSize: 11, fontWeight: 600,
                }}>Çoklu Seçim</span>
              )}
            </div>
            {survey.description && (
              <p style={{ fontSize: 14, color: ANK.textMuted, marginBottom: 6 }}>{survey.description}</p>
            )}
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: ANK.textMuted }}>
              <span><AnkIcon path={ANK_ICONS.users} size={12} /> {survey.totalVotes || 0} oy</span>
              <span>Oluşturan: {survey.createdByName}</span>
              {survey.endDate && (
                <span style={{ color: isEnded ? ANK.red : ANK.orange }}>
                  <AnkIcon path={ANK_ICONS.clock} size={12} /> {getRemainingTime(survey.endDate)}
                </span>
              )}
            </div>
          </div>
          {(isAdmin || isOwner) && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(survey.id); }}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: ANK.textMuted, padding: 4,
              }}
            >
              <AnkIcon path={ANK_ICONS.trash} size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div style={{ padding: "20px 24px" }}>
          {/* Seçenekler */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {optionEntries.map(([optKey, opt], idx) => {
              const isSelected = selectedOpts.includes(optKey);
              const percentage = totalOptionVotes > 0 ? Math.round((opt.votes / totalOptionVotes) * 100) : 0;
              const barColor = CHART_COLORS[idx % CHART_COLORS.length];

              return (
                <div
                  key={optKey}
                  onClick={() => handleToggleOption(optKey)}
                  style={{
                    position: "relative", borderRadius: 10, overflow: "hidden",
                    border: `2px solid ${isSelected ? ANK.primary : ANK.border}`,
                    cursor: canVote ? "pointer" : "default",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Result Bar Background */}
                  {showResults && (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: `${barColor}15`,
                      width: `${percentage}%`,
                      transition: "width 0.6s ease-out",
                    }} />
                  )}

                  <div style={{
                    position: "relative", padding: "12px 16px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {canVote && (
                        <div style={{
                          width: 20, height: 20,
                          borderRadius: survey.isMultiSelect ? 4 : "50%",
                          border: `2px solid ${isSelected ? ANK.primary : "#d1d5db"}`,
                          background: isSelected ? ANK.primary : "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.2s",
                        }}>
                          {isSelected && <AnkIcon path={ANK_ICONS.check} size={12} color="white" />}
                        </div>
                      )}
                      <span style={{
                        fontSize: 14, fontWeight: 500, color: ANK.text,
                      }}>{opt.text}</span>
                    </div>
                    {showResults && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: barColor }}>{percentage}%</span>
                        <span style={{ fontSize: 12, color: ANK.textMuted }}>({opt.votes} oy)</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Oy Ver Butonu */}
          {canVote && (
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleSubmitVote}
                disabled={selectedOpts.length === 0}
                style={{
                  background: selectedOpts.length > 0
                    ? "linear-gradient(135deg, #5b21b6, #7c3aed)" : "#e5e7eb",
                  color: selectedOpts.length > 0 ? "white" : "#9ca3af",
                  border: "none", borderRadius: 10, padding: "10px 28px",
                  fontSize: 14, fontWeight: 600, cursor: selectedOpts.length > 0 ? "pointer" : "default",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <AnkIcon path={ANK_ICONS.check} size={16} color={selectedOpts.length > 0 ? "white" : "#9ca3af"} /> Oy Ver
              </button>
            </div>
          )}

          {hasVoted && !isEnded && (
            <p style={{ marginTop: 12, fontSize: 13, color: ANK.green, fontWeight: 500, textAlign: "center" }}>
              <AnkIcon path={ANK_ICONS.check} size={14} color={ANK.green} /> Oyunuz kaydedildi
            </p>
          )}

          {/* Grafik Gösterimi */}
          {showResults && totalOptionVotes > 0 && (
            <div style={{
              marginTop: 20, padding: 20, background: "#fafafa", borderRadius: 12,
              border: `1px solid ${ANK.border}`,
            }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: ANK.text }}>
                <AnkIcon path={ANK_ICONS.barChart} size={16} /> Sonuç Grafiği
              </h4>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 160 }}>
                {optionEntries.map(([optKey, opt], idx) => {
                  const percentage = totalOptionVotes > 0 ? (opt.votes / totalOptionVotes) * 100 : 0;
                  const barColor = CHART_COLORS[idx % CHART_COLORS.length];
                  return (
                    <div key={optKey} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{Math.round(percentage)}%</span>
                      <div style={{
                        width: "100%", maxWidth: 60,
                        height: `${Math.max(percentage * 1.4, 4)}px`,
                        background: `linear-gradient(180deg, ${barColor}, ${barColor}cc)`,
                        borderRadius: "6px 6px 0 0",
                        transition: "height 0.6s ease-out",
                      }} />
                      <span style={{
                        fontSize: 11, color: ANK.textMuted, textAlign: "center",
                        maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }} title={opt.text}>
                        {opt.text}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{
                borderTop: `1px solid ${ANK.border}`, marginTop: 12, paddingTop: 10,
                fontSize: 12, color: ANK.textMuted, textAlign: "center",
              }}>
                Toplam {survey.totalVotes || 0} katılımcı · {totalOptionVotes} oy
              </div>
            </div>
          )}

          {/* Bitiş Tarihi Bilgisi */}
          {survey.endDate && (
            <div style={{
              marginTop: 12, padding: "8px 14px", borderRadius: 8,
              background: isEnded ? ANK.redLight : ANK.orangeLight,
              fontSize: 12, color: isEnded ? ANK.red : ANK.orange,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <AnkIcon path={ANK_ICONS.calendar} size={14} />
              Bitiş: {formatEndDate(survey.endDate)}
              {!isEnded && <span style={{ marginLeft: 8, fontWeight: 600 }}>({getRemainingTime(survey.endDate)})</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ANKET OLUŞTURMA MODALI
// ══════════════════════════════════════════════════════════════
function CreateSurveyModal({ onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [endDate, setEndDate] = useState("");

  const addOption = () => {
    if (options.length >= 10) return;
    setOptions(prev => [...prev, ""]);
  };

  const removeOption = (idx) => {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateOption = (idx, value) => {
    setOptions(prev => prev.map((opt, i) => i === idx ? value : opt));
  };

  const handleSubmit = () => {
    if (!title.trim()) { alert("Anket başlığı zorunludur!"); return; }
    const validOpts = options.filter(o => o.trim());
    if (validOpts.length < 2) { alert("En az 2 seçenek gereklidir!"); return; }
    onCreate({
      title: title.trim(),
      description: description.trim(),
      options: validOpts,
      isMultiSelect,
      isAnonymous,
      endDate: endDate || null,
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "white", borderRadius: 16, padding: 32, width: 520, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)", animation: "fadeInUp 0.2s ease-out",
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: ANK.text, marginBottom: 20 }}>
          <AnkIcon path={ANK_ICONS.barChart} size={20} color={ANK.primary} /> Yeni Anket Oluştur
        </h3>

        {/* Başlık */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Anket Başlığı *</label>
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Anket sorusunu yazın..."
            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${ANK.border}`, borderRadius: 8, fontSize: 14, outline: "none" }}
          />
        </div>

        {/* Açıklama */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Açıklama</label>
          <textarea
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Ek açıklama (isteğe bağlı)..."
            rows={2}
            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${ANK.border}`, borderRadius: 8, fontSize: 14, resize: "vertical", outline: "none", fontFamily: "'Source Sans 3', sans-serif" }}
          />
        </div>

        {/* Seçenekler */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
            Seçenekler * (en az 2, en fazla 10)
          </label>
          {options.map((opt, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                type="text" value={opt}
                onChange={e => updateOption(idx, e.target.value)}
                placeholder={`Seçenek ${idx + 1}`}
                style={{
                  flex: 1, padding: "8px 12px", border: `1px solid ${ANK.border}`,
                  borderRadius: 8, fontSize: 14, outline: "none",
                }}
              />
              {options.length > 2 && (
                <button
                  onClick={() => removeOption(idx)}
                  style={{
                    background: ANK.redLight, color: ANK.red, border: "none",
                    borderRadius: 6, padding: "0 10px", cursor: "pointer",
                  }}
                >
                  <AnkIcon path={ANK_ICONS.x} size={14} />
                </button>
              )}
            </div>
          ))}
          {options.length < 10 && (
            <button
              onClick={addOption}
              style={{
                background: ANK.primaryPale, color: ANK.primary, border: "none",
                borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              <AnkIcon path={ANK_ICONS.plus} size={14} /> Seçenek Ekle
            </button>
          )}
        </div>

        {/* Ayarlar */}
        <div style={{
          marginBottom: 14, padding: 16, background: "#fafafa", borderRadius: 10,
          border: `1px solid ${ANK.border}`,
        }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 10 }}>Anket Ayarları</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={isMultiSelect} onChange={e => setIsMultiSelect(e.target.checked)} style={{ accentColor: ANK.primary }} />
              Çoklu seçim (birden fazla seçenek seçilebilsin)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} style={{ accentColor: ANK.primary }} />
              <AnkIcon path={ANK_ICONS.eyeOff} size={14} /> Anonim oylama (kim oy verdi görünmesin)
            </label>
          </div>
        </div>

        {/* Bitiş Tarihi */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
            <AnkIcon path={ANK_ICONS.calendar} size={14} /> Bitiş Tarihi (isteğe bağlı)
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            style={{
              width: "100%", padding: "10px 14px", border: `1px solid ${ANK.border}`,
              borderRadius: 8, fontSize: 14, outline: "none",
            }}
          />
        </div>

        {/* Butonlar */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "10px 20px", border: `1px solid ${ANK.border}`, background: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, color: ANK.textMuted }}
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            style={{ padding: "10px 24px", border: "none", background: "linear-gradient(135deg, #5b21b6, #7c3aed)", color: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
          >
            Anket Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}

// Export
window.AnketModuluApp = AnketModuluApp;
