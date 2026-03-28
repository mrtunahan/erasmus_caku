// ══════════════════════════════════════════════════════════════
// Akademisyen Modülü - ÇAKUAVİS Entegrasyonu
// Bölüm akademisyenlerinin bilgilerini çeker ve gösterir
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useCallback, useMemo } = React;

const C = window.C;
const Card = window.Card;
const Btn = window.Btn;
const Modal = window.Modal;
const Input = window.Input;
const Badge = window.Badge;
const FormField = window.FormField;

// GhostBtn - lokal tanım (shared-components'ta yok)
var GhostBtn = function({ children, onClick, disabled, style: customStyle }) {
  return React.createElement("button", {
    onClick: onClick,
    disabled: disabled,
    style: Object.assign({
      padding: "8px 16px", background: "transparent", border: "1px solid " + (C ? C.border : "#E5E1D8"),
      borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontSize: 13,
      color: C ? C.text : "#1B2A4A", fontWeight: 500, opacity: disabled ? 0.5 : 1,
    }, customStyle || {})
  }, children);
};

// ── Renk paleti ──
const COLORS = {
  primary: "#1B2A4A",
  accent: "#2563EB",
  bg: "#F7F5F0",
  cardBg: "#FFFFFF",
  border: "#E5E1D8",
  text: "#1B2A4A",
  textLight: "#6B7280",
  success: "#059669",
  warning: "#D97706",
};

// ── Section ikonları ──
const SECTION_ICONS = {
  education: "🎓",
  researchAreas: "🔬",
  experience: "💼",
  theses: "📑",
  courses: "📚",
  publications: "📝",
  projects: "🚀",
  activities: "🏆",
  awards: "⭐",
};

// ── Akademisyen Kart Bileşeni (Zenginleştirilmiş) ──
function AcademicianCard({ prof, onSelect, onDelete, isSelected, canManage, isAdmin }) {
  var [hovered, setHovered] = useState(false);
  var [imgError, setImgError] = useState(false);

  // Unvanı isimden ayır
  var titleParts = (prof.fullName || "").match(/^(Prof\.\s*Dr\.|Doç\.\s*Dr\.|Dr\.\s*Öğr\.\s*Üyesi|Öğr\.\s*Gör\.\s*Dr\.|Öğr\.\s*Gör\.|Arş\.\s*Gör\.\s*Dr\.|Arş\.\s*Gör\.)\s*(.*)/i);
  var academicTitle = titleParts ? titleParts[1] : null;
  var displayName = titleParts ? titleParts[2] : (prof.fullName || prof.name || prof.username);

  // Unvan renkleri
  var titleColor = "#6B7280";
  var titleBg = "#F3F4F6";
  if (academicTitle) {
    if (academicTitle.match(/^Prof/i)) { titleColor = "#7C3AED"; titleBg = "#EDE9FE"; }
    else if (academicTitle.match(/^Doç/i)) { titleColor = "#2563EB"; titleBg = "#DBEAFE"; }
    else if (academicTitle.match(/^Dr\.\s*Öğr/i)) { titleColor = "#059669"; titleBg = "#D1FAE5"; }
    else if (academicTitle.match(/^Arş/i)) { titleColor = "#D97706"; titleBg = "#FEF3C7"; }
  }

  // İsmin baş harflerini al (avatar fallback)
  var initials = (displayName || "?").split(" ").map(function(w) { return w.charAt(0); }).slice(0, 2).join("").toUpperCase();

  // Avatar renkleri (isim hash'ine göre)
  var avatarColors = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#EF4444", "#6366F1"];
  var hash = 0;
  var nameStr = prof.fullName || prof.username || "";
  for (var i = 0; i < nameStr.length; i++) hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
  var avatarBg = avatarColors[Math.abs(hash) % avatarColors.length];

  return (
    <div
      onClick={function() { onSelect(prof); }}
      onMouseEnter={function() { setHovered(true); }}
      onMouseLeave={function() { setHovered(false); }}
      style={{
        background: isSelected ? "#EBF5FF" : COLORS.cardBg,
        border: "2px solid " + (isSelected ? COLORS.accent : hovered ? COLORS.accent + "60" : COLORS.border),
        borderRadius: 16,
        padding: 0,
        cursor: "pointer",
        transition: "all 0.25s ease",
        overflow: "hidden",
        boxShadow: hovered ? "0 8px 25px rgba(37,99,235,0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        position: "relative",
      }}
    >
      {/* Üst gradient şerit */}
      <div style={{
        height: 4,
        background: isSelected
          ? "linear-gradient(90deg, " + COLORS.accent + ", #8B5CF6)"
          : "linear-gradient(90deg, " + COLORS.primary + "40, " + COLORS.accent + "40)",
        transition: "all 0.25s ease",
      }} />

      <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {prof.photo && !imgError ? (
            <img
              src={prof.photo}
              alt={prof.fullName}
              style={{
                width: 60, height: 60, borderRadius: 14, objectFit: "cover",
                border: "3px solid " + (isSelected ? COLORS.accent : COLORS.border),
                transition: "border-color 0.2s",
              }}
              onError={function() { setImgError(true); }}
            />
          ) : (
            <div style={{
              width: 60, height: 60, borderRadius: 14,
              background: "linear-gradient(135deg, " + avatarBg + ", " + avatarBg + "CC)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 700, color: "#FFFFFF",
              border: "3px solid " + avatarBg + "30",
              letterSpacing: 1,
            }}>
              {initials}
            </div>
          )}
          {/* Online/cache durumu */}
          {prof.fetchedAt && (
            <div style={{
              position: "absolute", bottom: -2, right: -2,
              width: 14, height: 14, borderRadius: "50%",
              background: "#10B981", border: "2px solid white",
            }} />
          )}
        </div>

        {/* Bilgi */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Unvan badge */}
          {academicTitle && (
            <div style={{
              display: "inline-block",
              fontSize: 10, fontWeight: 700, color: titleColor, background: titleBg,
              padding: "2px 8px", borderRadius: 6, marginBottom: 4,
              letterSpacing: 0.3, textTransform: "uppercase",
            }}>
              {academicTitle}
            </div>
          )}
          <div style={{
            fontWeight: 700, fontSize: 15, color: COLORS.text,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            lineHeight: 1.3,
          }}>
            {displayName}
          </div>
          {prof.email && (
            <div style={{
              fontSize: 12, color: COLORS.textLight, marginTop: 3,
              display: "flex", alignItems: "center", gap: 4,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              <span style={{ fontSize: 11, opacity: 0.7 }}>✉</span> {prof.email}
            </div>
          )}
          {prof.department && (
            <div style={{
              fontSize: 11, color: COLORS.textLight, marginTop: 3,
              display: "flex", alignItems: "center", gap: 4,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              <span style={{ fontSize: 11, opacity: 0.7 }}>🏛</span> {prof.department}
            </div>
          )}
        </div>

        {/* Sağ taraf aksiyonlar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          {isAdmin && prof.departmentId && (
            <div style={{
              fontSize: 9, color: COLORS.accent, background: COLORS.accent + "12",
              padding: "3px 8px", borderRadius: 6, fontWeight: 600,
              maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {prof.departmentId}
            </div>
          )}
          {/* Detay göster ikonu */}
          <div style={{
            fontSize: 16, color: hovered ? COLORS.accent : COLORS.textLight + "60",
            transition: "all 0.2s",
            transform: hovered ? "translateX(2px)" : "translateX(0)",
          }}>
            →
          </div>
          {canManage && onDelete && (
            <button
              onClick={function(e) { e.stopPropagation(); onDelete(prof); }}
              style={{
                background: "none", border: "none", color: "#DC2626", cursor: "pointer",
                fontSize: 11, padding: "3px 6px", borderRadius: 4,
                opacity: hovered ? 1 : 0, transition: "opacity 0.2s",
              }}
            >
              Kaldır
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Akademisyen Detay Sayfası (Dashboard Tarzı) ──
function AcademicianDetail({ data, onBack }) {
  var [activeSection, setActiveSection] = useState(null);
  var [imgError, setImgError] = useState(false);

  if (!data) return null;

  var sectionKeys = Object.keys(data.sections || {});

  // Unvanı isimden ayır
  var titleParts = (data.fullName || "").match(/^(Prof\.\s*Dr\.|Doç\.\s*Dr\.|Dr\.\s*Öğr\.\s*Üyesi|Öğr\.\s*Gör\.\s*Dr\.|Öğr\.\s*Gör\.|Arş\.\s*Gör\.\s*Dr\.|Arş\.\s*Gör\.)\s*(.*)/i);
  var academicTitle = titleParts ? titleParts[1] : null;
  var displayName = titleParts ? titleParts[2] : (data.fullName || data.username);

  // Avatar fallback rengi
  var avatarColors = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#EF4444", "#6366F1"];
  var hash = 0;
  var nameStr = data.fullName || data.username || "";
  for (var ci = 0; ci < nameStr.length; ci++) hash = nameStr.charCodeAt(ci) + ((hash << 5) - hash);
  var avatarBg = avatarColors[Math.abs(hash) % avatarColors.length];
  var initials = (displayName || "?").split(" ").map(function(w) { return w.charAt(0); }).slice(0, 2).join("").toUpperCase();

  // İstatistik renkleri
  var statColors = [
    { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
    { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
    { bg: "#FEF3C7", color: "#D97706", border: "#FDE68A" },
    { bg: "#EDE9FE", color: "#7C3AED", border: "#DDD6FE" },
    { bg: "#FFF1F2", color: "#E11D48", border: "#FECDD3" },
  ];

  // Section renkleri
  var sectionColors = {
    education: { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
    researchAreas: { bg: "#F0FDF4", color: "#059669", border: "#A7F3D0" },
    experience: { bg: "#FEF3C7", color: "#D97706", border: "#FDE68A" },
    theses: { bg: "#FDF2F8", color: "#DB2777", border: "#FBCFE8" },
    courses: { bg: "#EDE9FE", color: "#7C3AED", border: "#DDD6FE" },
    publications: { bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" },
    projects: { bg: "#FFF7ED", color: "#EA580C", border: "#FED7AA" },
    activities: { bg: "#F0F9FF", color: "#0284C7", border: "#BAE6FD" },
    awards: { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
  };

  // Akademik link konfigürasyonları
  var linkConfigs = {
    yoksis: { label: "YÖKSİS", icon: "🎓", bg: "linear-gradient(135deg, #FEF3C7, #FDE68A)", color: "#92400E", hoverBg: "#FDE68A" },
    orcid: { label: "ORCID", icon: "🔗", bg: "linear-gradient(135deg, #D1FAE5, #A7F3D0)", color: "#065F46", hoverBg: "#A7F3D0" },
    scholar: { label: "Google Scholar", icon: "📊", bg: "linear-gradient(135deg, #DBEAFE, #BFDBFE)", color: "#1E40AF", hoverBg: "#BFDBFE" },
    wos: { label: "Web of Science", icon: "🌐", bg: "linear-gradient(135deg, #EDE9FE, #DDD6FE)", color: "#5B21B6", hoverBg: "#DDD6FE" },
  };

  return (
    <div>
      {/* Üst Navigasyon Bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 24,
        padding: "12px 20px", background: COLORS.cardBg, borderRadius: 12,
        border: "1px solid " + COLORS.border, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <GhostBtn onClick={onBack} style={{
          fontSize: 13, display: "flex", alignItems: "center", gap: 6,
          borderRadius: 8, padding: "8px 14px",
        }}>
          ← Listeye Dön
        </GhostBtn>
        <div style={{ flex: 1 }} />
        {data.username && (
          <a
            href={"https://cakuavis.karatekin.edu.tr/" + data.username}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12, color: COLORS.accent, textDecoration: "none",
              padding: "6px 14px", background: COLORS.accent + "10", borderRadius: 8,
              fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.2s",
            }}
          >
            ÇAKUAVİS Profili ↗
          </a>
        )}
      </div>

      {/* Hero Profil Kartı */}
      <div style={{
        background: "linear-gradient(135deg, " + COLORS.primary + " 0%, #2D4A7A 100%)",
        borderRadius: 20, padding: 0, marginBottom: 24, overflow: "hidden",
        boxShadow: "0 10px 40px rgba(27,42,74,0.2)",
      }}>
        {/* Dekoratif pattern */}
        <div style={{
          position: "relative", padding: "32px 32px 28px",
          backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.05) 0%, transparent 50%)",
        }}>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
            {/* Profil Fotoğrafı */}
            <div style={{ position: "relative" }}>
              {data.photo && !imgError ? (
                <img
                  src={data.photo}
                  alt={data.fullName}
                  onError={function() { setImgError(true); }}
                  style={{
                    width: 130, height: 130, borderRadius: 20, objectFit: "cover",
                    border: "4px solid rgba(255,255,255,0.3)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  }}
                />
              ) : (
                <div style={{
                  width: 130, height: 130, borderRadius: 20,
                  background: "linear-gradient(135deg, " + avatarBg + ", " + avatarBg + "CC)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 44, fontWeight: 700, color: "#FFFFFF",
                  border: "4px solid rgba(255,255,255,0.3)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  letterSpacing: 2,
                }}>
                  {initials}
                </div>
              )}
            </div>

            {/* İsim ve Bilgiler */}
            <div style={{ flex: 1, minWidth: 200 }}>
              {academicTitle && (
                <div style={{
                  display: "inline-block", fontSize: 11, fontWeight: 700,
                  color: "#FCD34D", background: "rgba(255,255,255,0.12)",
                  padding: "4px 12px", borderRadius: 8, marginBottom: 10,
                  letterSpacing: 0.5, textTransform: "uppercase",
                  backdropFilter: "blur(4px)",
                }}>
                  {academicTitle}
                </div>
              )}
              <h2 style={{
                fontSize: 26, fontWeight: 800, color: "#FFFFFF", margin: "0 0 8px 0",
                lineHeight: 1.2, fontFamily: "'Playfair Display', serif",
              }}>
                {displayName}
              </h2>
              {data.department && (
                <div style={{
                  fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 16,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  🏛 {data.department}
                </div>
              )}

              {/* İletişim Bilgileri */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {data.email && (
                  <a href={"mailto:" + data.email} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 13, color: "rgba(255,255,255,0.85)", textDecoration: "none",
                    padding: "6px 12px", background: "rgba(255,255,255,0.1)", borderRadius: 8,
                    transition: "all 0.2s",
                  }}>
                    ✉ {data.email}
                  </a>
                )}
                {data.phone && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 13, color: "rgba(255,255,255,0.85)",
                    padding: "6px 12px", background: "rgba(255,255,255,0.1)", borderRadius: 8,
                  }}>
                    📞 {data.phone}
                  </div>
                )}
                {data.web && (
                  <a href={data.web} target="_blank" rel="noopener noreferrer" style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 13, color: "rgba(255,255,255,0.85)", textDecoration: "none",
                    padding: "6px 12px", background: "rgba(255,255,255,0.1)", borderRadius: 8,
                    transition: "all 0.2s",
                  }}>
                    🌐 Web Sitesi
                  </a>
                )}
                {data.address && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 13, color: "rgba(255,255,255,0.85)",
                    padding: "6px 12px", background: "rgba(255,255,255,0.1)", borderRadius: 8,
                  }}>
                    📍 {data.address}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Akademik Linkler Bar */}
        {data.links && Object.keys(data.links).length > 0 && (
          <div style={{
            display: "flex", gap: 0, borderTop: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(0,0,0,0.15)",
          }}>
            {Object.keys(data.links).map(function(key) {
              var conf = linkConfigs[key];
              if (!conf || !data.links[key]) return null;
              return (
                <a
                  key={key}
                  href={data.links[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "12px 16px", fontSize: 12, fontWeight: 600,
                    color: "rgba(255,255,255,0.9)", textDecoration: "none",
                    borderRight: "1px solid rgba(255,255,255,0.08)",
                    transition: "all 0.2s",
                  }}
                >
                  <span>{conf.icon}</span> {conf.label}
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* İstatistik Kartları */}
      {data.stats && Object.keys(data.stats).length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 14, marginBottom: 24,
        }}>
          {Object.keys(data.stats).map(function(key, idx) {
            var sc = statColors[idx % statColors.length];
            return (
              <div key={key} style={{
                background: COLORS.cardBg, borderRadius: 16, padding: "20px 18px",
                border: "1px solid " + sc.border,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                textAlign: "center",
                transition: "all 0.2s",
              }}>
                <div style={{
                  fontSize: 28, fontWeight: 800, color: sc.color,
                  lineHeight: 1, marginBottom: 6,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {data.stats[key]}
                </div>
                <div style={{
                  fontSize: 11, color: COLORS.textLight, fontWeight: 600,
                  textTransform: "capitalize", letterSpacing: 0.3,
                }}>
                  {key}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bölüm Özet Kartları (mini dashboard) */}
      {sectionKeys.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10, marginBottom: 24,
        }}>
          {sectionKeys.map(function(key) {
            var section = data.sections[key];
            var sc = sectionColors[key] || { bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" };
            var isActive = activeSection === key;
            return (
              <div
                key={key}
                onClick={function() { setActiveSection(isActive ? null : key); }}
                style={{
                  background: isActive ? sc.bg : COLORS.cardBg,
                  border: "2px solid " + (isActive ? sc.color : COLORS.border),
                  borderRadius: 14, padding: "14px 12px", cursor: "pointer",
                  textAlign: "center", transition: "all 0.2s",
                  boxShadow: isActive ? "0 4px 12px " + sc.color + "20" : "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>{SECTION_ICONS[key] || "📄"}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: sc.color }}>{section.items.length}</div>
                <div style={{ fontSize: 10, color: COLORS.textLight, fontWeight: 600, marginTop: 2, lineHeight: 1.3 }}>
                  {section.label}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detay Bölümleri (Accordion) */}
      {sectionKeys.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sectionKeys.map(function(key) {
            var section = data.sections[key];
            var isOpen = activeSection === key;
            var sc = sectionColors[key] || { bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" };
            return (
              <div key={key} style={{
                background: COLORS.cardBg, borderRadius: 16, overflow: "hidden",
                border: "1px solid " + (isOpen ? sc.color + "60" : COLORS.border),
                boxShadow: isOpen ? "0 4px 16px " + sc.color + "15" : "0 1px 4px rgba(0,0,0,0.04)",
                transition: "all 0.25s ease",
              }}>
                <div
                  onClick={function() { setActiveSection(isOpen ? null : key); }}
                  style={{
                    padding: "16px 22px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                    background: isOpen ? sc.bg : "transparent",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: isOpen ? sc.color + "18" : COLORS.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, transition: "all 0.2s",
                  }}>
                    {SECTION_ICONS[key] || "📄"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: isOpen ? sc.color : COLORS.text }}>
                      {section.label}
                    </span>
                  </div>
                  <div style={{
                    padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: sc.color + "15", color: sc.color,
                    minWidth: 32, textAlign: "center",
                  }}>
                    {section.items.length}
                  </div>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isOpen ? sc.color + "15" : COLORS.bg,
                    color: isOpen ? sc.color : COLORS.textLight,
                    fontSize: 12, fontWeight: 700,
                    transition: "all 0.25s ease",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}>
                    ▼
                  </div>
                </div>
                {isOpen && (
                  <div style={{ padding: "4px 22px 16px" }}>
                    {section.items.map(function(item, i) {
                      return (
                        <div key={i} style={{
                          padding: "12px 16px",
                          margin: "6px 0",
                          background: i % 2 === 0 ? COLORS.bg : "transparent",
                          borderRadius: 10,
                          fontSize: 13,
                          lineHeight: 1.7,
                          color: COLORS.text,
                          borderLeft: "3px solid " + sc.color + "40",
                        }}>
                          <span style={{ color: sc.color, fontWeight: 600, marginRight: 8, fontSize: 11 }}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {item}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          textAlign: "center", padding: "50px 30px",
          background: COLORS.cardBg, borderRadius: 16,
          border: "1px solid " + COLORS.border,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>
            Henüz detay bilgisi yüklenmedi
          </div>
          <div style={{ fontSize: 13, color: COLORS.textLight }}>
            ÇAKUAVİS profilinde ek bilgi bulunamadı.
          </div>
        </div>
      )}

      {/* Footer */}
      {data.lastUpdate && (
        <div style={{
          textAlign: "center", fontSize: 11, color: COLORS.textLight, marginTop: 20,
          padding: "12px", background: COLORS.bg, borderRadius: 10,
        }}>
          YÖKSİS Son Güncelleme: {data.lastUpdate}
        </div>
      )}
    </div>
  );
}

// ── XLSX Export Fonksiyonu ──
function generateXLSX(metricsData, periodLabel) {
  // XML Spreadsheet 2003 format - no library needed
  var categories = [
    { key: "sci", label: "SCI-Exp/SSCI/AHCI Yayın" },
    { key: "uak", label: "ÜAK Alan İndeksi Yayın" },
    { key: "ulakbim", label: "Ulakbim/TR Dizin Yayın" },
    { key: "book", label: "Kitap/Kitap Bölümü" },
    { key: "conference", label: "Kongre/Sempozyum Bildiri" },
    { key: "other", label: "Diğer Yayınlar" },
  ];

  var rows = metricsData.map(function(m) {
    var row = { fullName: m.fullName, department: m.department };
    var totalPub = 0;
    categories.forEach(function(cat) {
      var count = m.filtered[cat.key] || 0;
      row[cat.key] = count;
      totalPub += count;
    });
    row.totalPub = totalPub;
    row.project2209 = m.project2209Count || 0;
    // Atıf sayısı - stats'tan çekmeye çalış
    var citationVal = 0;
    if (m.stats) {
      Object.keys(m.stats).forEach(function(k) {
        if (k.toLocaleLowerCase("tr").indexOf("atıf") >= 0 || k.toLocaleLowerCase("tr").indexOf("atif") >= 0 || k.toLowerCase().indexOf("citation") >= 0) {
          citationVal = parseInt(m.stats[k]) || 0;
        }
      });
    }
    row.citations = citationVal;
    return row;
  });

  var esc = function(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };

  var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  xml += '<Styles>\n';
  xml += '<Style ss:ID="hdr"><Font ss:Bold="1" ss:Size="11"/><Interior ss:Color="#1B2A4A" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF" ss:Bold="1"/></Style>\n';
  xml += '<Style ss:ID="num"><NumberFormat ss:Format="0"/></Style>\n';
  xml += '</Styles>\n';
  xml += '<Worksheet ss:Name="Akademisyen Metrikleri">\n<Table>\n';

  // Header
  var headers = ["Ad Soyad", "Bölüm"];
  categories.forEach(function(c) { headers.push(c.label); });
  headers.push("Toplam Yayın", "Atıf Sayısı", "2209 Proje");

  xml += '<Row>\n';
  headers.forEach(function(h) {
    xml += '<Cell ss:StyleID="hdr"><Data ss:Type="String">' + esc(h) + '</Data></Cell>\n';
  });
  xml += '</Row>\n';

  // Data rows
  rows.forEach(function(r) {
    xml += '<Row>\n';
    xml += '<Cell><Data ss:Type="String">' + esc(r.fullName) + '</Data></Cell>\n';
    xml += '<Cell><Data ss:Type="String">' + esc(r.department) + '</Data></Cell>\n';
    categories.forEach(function(cat) {
      xml += '<Cell ss:StyleID="num"><Data ss:Type="Number">' + (r[cat.key] || 0) + '</Data></Cell>\n';
    });
    xml += '<Cell ss:StyleID="num"><Data ss:Type="Number">' + r.totalPub + '</Data></Cell>\n';
    xml += '<Cell ss:StyleID="num"><Data ss:Type="Number">' + r.citations + '</Data></Cell>\n';
    xml += '<Cell ss:StyleID="num"><Data ss:Type="Number">' + r.project2209 + '</Data></Cell>\n';
    xml += '</Row>\n';
  });

  xml += '</Table>\n</Worksheet>\n</Workbook>';

  var blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "akademisyen_metrikleri_" + periodLabel + ".xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── SVG Chart Bileşenleri ──

// Yatay Bar Chart
function HBarChart({ data, width, height, barColor }) {
  if (!data || data.length === 0) return null;
  var maxVal = Math.max.apply(null, data.map(function(d) { return d.value; }));
  if (maxVal === 0) maxVal = 1;
  var barH = Math.min(28, (height - 20) / data.length - 4);
  var labelW = 140;
  var chartW = width - labelW - 50;

  return React.createElement("svg", { width: width, height: Math.max(height, data.length * (barH + 4) + 10), style: { display: "block" } },
    data.map(function(d, i) {
      var y = i * (barH + 4) + 5;
      var bw = (d.value / maxVal) * chartW;
      return React.createElement("g", { key: i },
        React.createElement("text", {
          x: labelW - 8, y: y + barH / 2 + 4, textAnchor: "end",
          fontSize: 11, fill: COLORS.text, fontWeight: 500,
        }, d.label.length > 20 ? d.label.substring(0, 18) + "…" : d.label),
        React.createElement("rect", {
          x: labelW, y: y, width: Math.max(bw, 2), height: barH,
          rx: 4, fill: barColor || COLORS.accent, opacity: 0.85,
        }),
        React.createElement("text", {
          x: labelW + bw + 6, y: y + barH / 2 + 4,
          fontSize: 11, fill: COLORS.text, fontWeight: 600,
        }, d.value)
      );
    })
  );
}

// Donut Chart
function DonutChart({ data, size, title }) {
  if (!data || data.length === 0) return null;
  var total = data.reduce(function(s, d) { return s + d.value; }, 0);
  if (total === 0) return React.createElement("div", { style: { textAlign: "center", padding: 20, color: COLORS.textLight, fontSize: 13 } }, "Veri yok");
  var r = (size - 40) / 2;
  var cx = size / 2;
  var cy = size / 2 - 10;
  var strokeW = r * 0.35;
  var innerR = r - strokeW / 2;
  var colors = ["#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0891B2"];
  var startAngle = -Math.PI / 2;

  var arcs = data.map(function(d, i) {
    var angle = (d.value / total) * Math.PI * 2;
    var endAngle = startAngle + angle;
    var largeArc = angle > Math.PI ? 1 : 0;
    var x1 = cx + innerR * Math.cos(startAngle);
    var y1 = cy + innerR * Math.sin(startAngle);
    var x2 = cx + innerR * Math.cos(endAngle);
    var y2 = cy + innerR * Math.sin(endAngle);
    var pathD = "M " + x1 + " " + y1 + " A " + innerR + " " + innerR + " 0 " + largeArc + " 1 " + x2 + " " + y2;
    startAngle = endAngle;
    return React.createElement("path", {
      key: i, d: pathD, fill: "none",
      stroke: colors[i % colors.length], strokeWidth: strokeW, strokeLinecap: "round",
    });
  });

  var legend = data.map(function(d, i) {
    return React.createElement("div", { key: i, style: { display: "flex", alignItems: "center", gap: 6, fontSize: 11 } },
      React.createElement("div", { style: { width: 10, height: 10, borderRadius: 2, background: colors[i % colors.length], flexShrink: 0 } }),
      React.createElement("span", { style: { color: COLORS.textLight } }, d.label),
      React.createElement("span", { style: { fontWeight: 600, color: COLORS.text, marginLeft: "auto" } }, d.value)
    );
  });

  return React.createElement("div", { style: { textAlign: "center" } },
    React.createElement("svg", { width: size, height: size - 20, style: { display: "block", margin: "0 auto" } },
      arcs,
      React.createElement("text", { x: cx, y: cy - 4, textAnchor: "middle", fontSize: 22, fontWeight: 700, fill: COLORS.text }, total),
      React.createElement("text", { x: cx, y: cy + 14, textAnchor: "middle", fontSize: 10, fill: COLORS.textLight }, title || "Toplam")
    ),
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4, marginTop: 8, maxWidth: 220, margin: "8px auto 0" } }, legend)
  );
}

// Trend Line Chart (yıllara göre)
function TrendChart({ data, width, height, lineColor }) {
  if (!data || data.length < 2) return null;
  var maxVal = Math.max.apply(null, data.map(function(d) { return d.value; }));
  if (maxVal === 0) maxVal = 1;
  var padL = 36, padR = 16, padT = 16, padB = 28;
  var chartW = width - padL - padR;
  var chartH = height - padT - padB;
  var step = chartW / (data.length - 1);

  var points = data.map(function(d, i) {
    var x = padL + i * step;
    var y = padT + chartH - (d.value / maxVal) * chartH;
    return { x: x, y: y, label: d.label, value: d.value };
  });

  var pathD = points.map(function(p, i) { return (i === 0 ? "M" : "L") + p.x + "," + p.y; }).join(" ");
  var areaD = pathD + " L" + points[points.length - 1].x + "," + (padT + chartH) + " L" + points[0].x + "," + (padT + chartH) + " Z";

  return React.createElement("svg", { width: width, height: height, style: { display: "block" } },
    // Grid lines
    [0, 0.25, 0.5, 0.75, 1].map(function(frac, i) {
      var y = padT + chartH - frac * chartH;
      return React.createElement("line", { key: "g" + i, x1: padL, y1: y, x2: width - padR, y2: y, stroke: COLORS.border, strokeWidth: 0.5 });
    }),
    // Y axis labels
    [0, 0.5, 1].map(function(frac, i) {
      var y = padT + chartH - frac * chartH;
      return React.createElement("text", { key: "yl" + i, x: padL - 6, y: y + 4, textAnchor: "end", fontSize: 9, fill: COLORS.textLight }, Math.round(maxVal * frac));
    }),
    // Area fill
    React.createElement("path", { d: areaD, fill: lineColor || COLORS.accent, opacity: 0.08 }),
    // Line
    React.createElement("path", { d: pathD, fill: "none", stroke: lineColor || COLORS.accent, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }),
    // Dots & labels
    points.map(function(p, i) {
      return React.createElement("g", { key: "d" + i },
        React.createElement("circle", { cx: p.x, cy: p.y, r: 3.5, fill: lineColor || COLORS.accent }),
        React.createElement("text", { x: p.x, y: padT + chartH + 16, textAnchor: "middle", fontSize: 9, fill: COLORS.textLight }, p.label),
        p.value > 0 ? React.createElement("text", { x: p.x, y: p.y - 8, textAnchor: "middle", fontSize: 9, fontWeight: 600, fill: COLORS.text }, p.value) : null
      );
    })
  );
}

// ── Analitik Dashboard Bileşeni ──
function AnalyticsDashboard({ deptId, isAdmin }) {
  var [metricsData, setMetricsData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [period, setPeriod] = useState(12); // 3, 6, 9, 12 ay

  useEffect(function() {
    setLoading(true);
    var token = localStorage.getItem("caku_auth_token");
    var headers = {};
    if (token) headers["Authorization"] = "Bearer " + token;
    var url = "/api/akademisyen/metrics/all";
    if (!isAdmin && deptId) url += "?departmentId=" + encodeURIComponent(deptId);

    fetch(url, { headers: headers })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (Array.isArray(data)) setMetricsData(data);
        setLoading(false);
      })
      .catch(function() { setLoading(false); });
  }, [deptId, isAdmin]);

  // Zaman dilimine göre filtreleme
  var cutoffDate = useMemo(function() {
    var d = new Date();
    d.setMonth(d.getMonth() - period);
    return d.getFullYear();
  }, [period]);

  var processedData = useMemo(function() {
    if (!metricsData) return [];
    return metricsData.map(function(m) {
      var pm = m.publicationMetrics || {};
      var filtered = {};
      var cats = ["sci", "uak", "ulakbim", "book", "conference", "other"];
      cats.forEach(function(cat) {
        var items = pm[cat] || [];
        filtered[cat] = items.filter(function(item) {
          if (!item.year) return true; // yılı bilinmeyenleri dahil et
          return item.year >= cutoffDate;
        }).length;
      });
      return Object.assign({}, m, { filtered: filtered });
    });
  }, [metricsData, cutoffDate]);

  // Toplu istatistikler
  var totals = useMemo(function() {
    var t = { sci: 0, uak: 0, ulakbim: 0, book: 0, conference: 0, other: 0, project2209: 0, citations: 0 };
    processedData.forEach(function(m) {
      t.sci += m.filtered.sci || 0;
      t.uak += m.filtered.uak || 0;
      t.ulakbim += m.filtered.ulakbim || 0;
      t.book += m.filtered.book || 0;
      t.conference += m.filtered.conference || 0;
      t.other += m.filtered.other || 0;
      t.project2209 += m.project2209Count || 0;
      if (m.stats) {
        Object.keys(m.stats).forEach(function(k) {
          if (k.toLocaleLowerCase("tr").indexOf("atıf") >= 0 || k.toLocaleLowerCase("tr").indexOf("atif") >= 0 || k.toLowerCase().indexOf("citation") >= 0) {
            t.citations += parseInt(m.stats[k]) || 0;
          }
        });
      }
    });
    return t;
  }, [processedData]);

  // Yıllara göre trend verisi
  var yearlyTrend = useMemo(function() {
    if (!metricsData) return [];
    var yearMap = {};
    metricsData.forEach(function(m) {
      var pm = m.publicationMetrics || {};
      ["sci", "uak", "ulakbim", "book", "conference", "other"].forEach(function(cat) {
        (pm[cat] || []).forEach(function(item) {
          if (item.year && item.year >= cutoffDate) {
            yearMap[item.year] = (yearMap[item.year] || 0) + 1;
          }
        });
      });
    });
    var years = Object.keys(yearMap).sort();
    return years.map(function(y) { return { label: y, value: yearMap[y] }; });
  }, [metricsData, cutoffDate]);

  // Akademisyen bazlı bar chart verisi (top 10)
  var topAuthors = useMemo(function() {
    return processedData
      .map(function(m) {
        var total = (m.filtered.sci || 0) + (m.filtered.uak || 0) + (m.filtered.ulakbim || 0) +
                    (m.filtered.book || 0) + (m.filtered.conference || 0) + (m.filtered.other || 0);
        var shortName = (m.fullName || "").replace(/^(Prof\.|Doç\.|Dr\.|Arş\.|Öğr\.|Gör\.|Yrd\.)\s*/gi, "").trim();
        return { label: shortName || m.username, value: total };
      })
      .filter(function(d) { return d.value > 0; })
      .sort(function(a, b) { return b.value - a.value; })
      .slice(0, 10);
  }, [processedData]);

  var periodButtons = [
    { val: 3, label: "3 Ay" },
    { val: 6, label: "6 Ay" },
    { val: 9, label: "9 Ay" },
    { val: 12, label: "12 Ay" },
  ];

  if (loading) {
    return React.createElement("div", { style: { textAlign: "center", padding: 60, color: COLORS.textLight } },
      React.createElement("div", { style: { fontSize: 14 } }, "Metrikler yükleniyor...")
    );
  }

  if (!metricsData || metricsData.length === 0) {
    return React.createElement(Card, null,
      React.createElement("div", { style: { textAlign: "center", padding: 40 } },
        React.createElement("div", { style: { fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 8 } }, "Henüz metrik verisi yok"),
        React.createElement("div", { style: { fontSize: 13, color: COLORS.textLight } }, "Akademisyen ekleyerek başlayabilirsiniz.")
      )
    );
  }

  var donutData = [
    { label: "SCI/SSCI/AHCI", value: totals.sci },
    { label: "ÜAK Alan İndeksi", value: totals.uak },
    { label: "Ulakbim/TR Dizin", value: totals.ulakbim },
    { label: "Kitap/Bölüm", value: totals.book },
    { label: "Kongre/Bildiri", value: totals.conference },
    { label: "Diğer", value: totals.other },
  ].filter(function(d) { return d.value > 0; });

  // Metric cards
  var metricCards = [
    { label: "SCI/SSCI/AHCI", value: totals.sci, color: "#2563EB" },
    { label: "ÜAK Alan İndeksi", value: totals.uak, color: "#059669" },
    { label: "Ulakbim/TR Dizin", value: totals.ulakbim, color: "#D97706" },
    { label: "Kitap/Bölüm", value: totals.book, color: "#DC2626" },
    { label: "Kongre/Bildiri", value: totals.conference, color: "#7C3AED" },
    { label: "Atıf Sayısı", value: totals.citations, color: "#0891B2" },
    { label: "2209 Proje", value: totals.project2209, color: "#BE185D" },
  ];

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } },

    // Üst Kontroller: Dönem seçimi + XLSX export
    React.createElement("div", { style: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 12,
    } },
      React.createElement("div", { style: { display: "flex", gap: 4, background: COLORS.bg, borderRadius: 8, padding: 3 } },
        periodButtons.map(function(pb) {
          var isActive = period === pb.val;
          return React.createElement("button", {
            key: pb.val,
            onClick: function() { setPeriod(pb.val); },
            style: {
              padding: "6px 14px", fontSize: 12, fontWeight: isActive ? 600 : 400,
              border: "none", borderRadius: 6, cursor: "pointer",
              background: isActive ? COLORS.accent : "transparent",
              color: isActive ? "#fff" : COLORS.textLight,
              transition: "all 0.15s",
            }
          }, pb.label);
        })
      ),
      React.createElement("button", {
        onClick: function() { generateXLSX(processedData, period + "_ay"); },
        style: {
          padding: "8px 18px", fontSize: 12, fontWeight: 600,
          background: "#059669", color: "#fff", border: "none", borderRadius: 8,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }
      },
        React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 },
          React.createElement("path", { d: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" }),
          React.createElement("polyline", { points: "7 10 12 15 17 10" }),
          React.createElement("line", { x1: 12, y1: 15, x2: 12, y2: 3 })
        ),
        "XLSX İndir"
      )
    ),

    // Özet Metrik Kartları
    React.createElement("div", { style: {
      display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10,
    } },
      metricCards.map(function(mc, i) {
        return React.createElement("div", {
          key: i,
          style: {
            background: COLORS.cardBg, borderRadius: 10, padding: "14px 16px",
            border: "1px solid " + COLORS.border,
            borderLeft: "3px solid " + mc.color,
          }
        },
          React.createElement("div", { style: { fontSize: 22, fontWeight: 700, color: mc.color } }, mc.value),
          React.createElement("div", { style: { fontSize: 11, color: COLORS.textLight, marginTop: 2, lineHeight: 1.3 } }, mc.label)
        );
      })
    ),

    // Grafikler Grid
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } },

      // Sol: Donut Chart - Yayın Dağılımı
      React.createElement("div", { style: {
        background: COLORS.cardBg, borderRadius: 12, padding: 20,
        border: "1px solid " + COLORS.border,
      } },
        React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 12 } }, "Yayın Türü Dağılımı"),
        React.createElement(DonutChart, { data: donutData, size: 200, title: "Yayın" })
      ),

      // Sağ: Trend Chart - Yıllara Göre
      React.createElement("div", { style: {
        background: COLORS.cardBg, borderRadius: 12, padding: 20,
        border: "1px solid " + COLORS.border,
      } },
        React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 12 } }, "Yıllara Göre Yayın Trendi"),
        yearlyTrend.length >= 2
          ? React.createElement(TrendChart, { data: yearlyTrend, width: 380, height: 200, lineColor: COLORS.accent })
          : React.createElement("div", { style: { textAlign: "center", padding: 40, color: COLORS.textLight, fontSize: 12 } }, "Yeterli yıl verisi yok")
      )
    ),

    // En Çok Yayın Yapan Akademisyenler - Bar Chart
    topAuthors.length > 0 && React.createElement("div", { style: {
      background: COLORS.cardBg, borderRadius: 12, padding: 20,
      border: "1px solid " + COLORS.border,
    } },
      React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 12 } }, "En Çok Yayın Yapan Akademisyenler (Top 10)"),
      React.createElement(HBarChart, { data: topAuthors, width: 580, height: topAuthors.length * 32 + 20, barColor: COLORS.accent })
    ),

    // Akademisyen Detay Tablosu
    React.createElement("div", { style: {
      background: COLORS.cardBg, borderRadius: 12, padding: 20,
      border: "1px solid " + COLORS.border, overflow: "auto",
    } },
      React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 12 } }, "Akademisyen Bazlı Yayın Detayı"),
      React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 } },
        React.createElement("thead", null,
          React.createElement("tr", { style: { borderBottom: "2px solid " + COLORS.border } },
            ["Akademisyen", "SCI/SSCI/AHCI", "ÜAK", "Ulakbim", "Kitap", "Bildiri", "Diğer", "Toplam", "2209"].map(function(h, i) {
              return React.createElement("th", {
                key: i,
                style: {
                  padding: "8px 6px", textAlign: i === 0 ? "left" : "center",
                  color: COLORS.text, fontWeight: 600, whiteSpace: "nowrap",
                  fontSize: 11,
                }
              }, h);
            })
          )
        ),
        React.createElement("tbody", null,
          processedData
            .map(function(m) {
              var total = (m.filtered.sci || 0) + (m.filtered.uak || 0) + (m.filtered.ulakbim || 0) +
                          (m.filtered.book || 0) + (m.filtered.conference || 0) + (m.filtered.other || 0);
              return Object.assign({}, m, { totalPub: total });
            })
            .sort(function(a, b) { return b.totalPub - a.totalPub; })
            .map(function(m, i) {
              var shortName = (m.fullName || "").replace(/^(Prof\.|Doç\.|Dr\.|Arş\.|Öğr\.|Gör\.|Yrd\.)\s*/gi, "").trim();
              return React.createElement("tr", {
                key: i,
                style: { borderBottom: "1px solid " + COLORS.border, background: i % 2 === 0 ? "transparent" : COLORS.bg }
              },
                React.createElement("td", { style: { padding: "7px 6px", fontWeight: 500, color: COLORS.text, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, shortName || m.username),
                [m.filtered.sci, m.filtered.uak, m.filtered.ulakbim, m.filtered.book, m.filtered.conference, m.filtered.other, m.totalPub, m.project2209Count || 0].map(function(v, j) {
                  return React.createElement("td", {
                    key: j,
                    style: {
                      padding: "7px 6px", textAlign: "center", color: v > 0 ? COLORS.text : COLORS.textLight,
                      fontWeight: v > 0 ? 600 : 400,
                    }
                  }, v || 0);
                })
              );
            })
        )
      )
    ),

    // Akademisyen sayısı bilgisi
    React.createElement("div", { style: { fontSize: 11, color: COLORS.textLight, textAlign: "right", padding: "0 4px" } },
      processedData.length + " akademisyen · Son " + period + " ay · " + new Date().toLocaleDateString("tr-TR")
    )
  );
}

// ── Ana Modül Bileşeni ──
function AkademisyenModuluApp({ currentUser, activeDepartment, departmentInfo }) {
  var [professors, setProfessors] = useState([]);
  var [selectedProf, setSelectedProf] = useState(null);
  var [profDetail, setProfDetail] = useState(null);
  var [loading, setLoading] = useState(false);
  var [addModal, setAddModal] = useState(false);
  var [newUsername, setNewUsername] = useState("");
  var [searchTerm, setSearchTerm] = useState("");
  var [viewMode, setViewMode] = useState("list"); // "list" | "analytics"

  var isAdmin = currentUser && currentUser.role === "admin";
  var isDeptManager = currentUser && currentUser.role === "bolum_yetkilisi";
  var canManage = isAdmin || isDeptManager;
  var deptId = activeDepartment || (currentUser && currentUser.departmentId) || null;

  // Akademisyen listesini yükle (bölüm bazlı)
  var loadProfessors = useCallback(function() {
    setLoading(true);
    var token = localStorage.getItem("caku_auth_token");
    var headers = {};
    if (token) headers["Authorization"] = "Bearer " + token;

    var url = "/api/akademisyen";
    // Admin hepsini görür, diğerleri sadece kendi bölümünü
    if (!isAdmin && deptId) {
      url += "?departmentId=" + encodeURIComponent(deptId);
    }

    fetch(url, { headers: headers })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (Array.isArray(data)) {
          setProfessors(data);
        }
        setLoading(false);
      })
      .catch(function() { setLoading(false); });
  }, [isAdmin, deptId]);

  useEffect(function() { loadProfessors(); }, [loadProfessors]);

  // Akademisyen detayını yükle
  var loadDetail = useCallback(function(username) {
    setLoading(true);
    var token = localStorage.getItem("caku_auth_token");
    var headers = {};
    if (token) headers["Authorization"] = "Bearer " + token;

    fetch("/api/akademisyen/" + encodeURIComponent(username), { headers: headers })
      .then(function(r) {
        if (!r.ok) {
          return r.json().then(function(err) { throw new Error(err.error || "Akademisyen bulunamadı"); });
        }
        return r.json();
      })
      .then(function(data) {
        if (data.error) {
          throw new Error(data.error);
        }
        setProfDetail(data);
        setLoading(false);
      })
      .catch(function(err) {
        alert("Akademisyen bilgisi alınamadı: " + err.message);
        setSelectedProf(null);
        setProfDetail(null);
        setLoading(false);
      });
  }, []);

  // Akademisyen seç
  var handleSelect = function(prof) {
    setSelectedProf(prof);
    loadDetail(prof.username);
  };

  // Yeni akademisyen ekle (bölüme atayarak)
  var handleAdd = function() {
    if (!newUsername.trim()) return alert("ÇAKUAVİS kullanıcı adı gerekli");
    // Boşlukları sil, küçük harf yap (kullanıcı "taha etem" yazsa "tahaetem" olsun)
    var username = newUsername.replace(/İ/g, "i").replace(/I/g, "ı").replace(/\s+/g, "").toLocaleLowerCase("tr")
      .replace(/ı/g, "i").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").trim();
    if (!username) return alert("Geçerli bir kullanıcı adı girin");
    var assignDeptId = deptId;
    setAddModal(false);
    setNewUsername("");
    setLoading(true);
    // Direkt detay yükle (departmentId ile cache'e kaydedilecek)
    setSelectedProf({ username: username });
    var token = localStorage.getItem("caku_auth_token");
    var headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;

    // Önce bilgileri çek
    fetch("/api/akademisyen/" + encodeURIComponent(username) + (assignDeptId ? "?departmentId=" + encodeURIComponent(assignDeptId) : ""), { headers: headers })
      .then(function(r) {
        if (!r.ok) {
          return r.json().then(function(err) { throw new Error(err.error || "Akademisyen bulunamadı"); });
        }
        return r.json();
      })
      .then(function(data) {
        if (data.error || data.notFound) {
          throw new Error(data.error || "Akademisyen bulunamadı");
        }
        setProfDetail(data);
        setLoading(false);
        // Listeyi güncelle
        setTimeout(loadProfessors, 1000);
      })
      .catch(function(err) {
        alert("Akademisyen bilgisi alınamadı: " + err.message);
        setSelectedProf(null);
        setProfDetail(null);
        setLoading(false);
      });
  };

  // Akademisyeni sil
  var handleDelete = function(prof) {
    if (!confirm((prof.fullName || prof.username) + " akademisyeni listeden kaldırılsın mı?")) return;
    var token = localStorage.getItem("caku_auth_token");
    var headers = {};
    if (token) headers["Authorization"] = "Bearer " + token;
    fetch("/api/akademisyen/" + encodeURIComponent(prof.username), { method: "DELETE", headers: headers })
      .then(function() { loadProfessors(); })
      .catch(function(err) { alert("Hata: " + err.message); });
  };

  // Filtreleme
  var filtered = professors.filter(function(p) {
    if (!searchTerm) return true;
    var term = searchTerm.toLowerCase();
    return (p.fullName || "").toLowerCase().indexOf(term) >= 0 ||
           (p.username || "").toLowerCase().indexOf(term) >= 0 ||
           (p.email || "").toLowerCase().indexOf(term) >= 0;
  });

  // Detay görünümü
  if (selectedProf && profDetail) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <AcademicianDetail
          data={profDetail}
          onBack={function() { setSelectedProf(null); setProfDetail(null); }}
        />
      </div>
    );
  }

  // Liste görünümü
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Başlık */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, margin: 0 }}>
            Akademisyen Bilgi Sistemi
          </h2>
          <p style={{ fontSize: 13, color: COLORS.textLight, margin: "4px 0 0 0" }}>
            ÇAKUAVİS entegrasyonu ile akademisyen profilleri
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {canManage && viewMode === "list" && (
            <Btn onClick={function() { setAddModal(true); }}>
              + Akademisyen Ekle
            </Btn>
          )}
        </div>
      </div>

      {/* Görünüm Sekmeleri */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "2px solid " + COLORS.border }}>
        {[
          { key: "list", label: "Akademisyenler" },
          { key: "analytics", label: "Analitik Dashboard" },
        ].map(function(tab) {
          var isActive = viewMode === tab.key;
          return React.createElement("button", {
            key: tab.key,
            onClick: function() { setViewMode(tab.key); },
            style: {
              padding: "10px 20px", fontSize: 13, fontWeight: isActive ? 600 : 400,
              border: "none", borderBottom: isActive ? "2px solid " + COLORS.accent : "2px solid transparent",
              marginBottom: -2, cursor: "pointer",
              background: "transparent", color: isActive ? COLORS.accent : COLORS.textLight,
              transition: "all 0.15s",
            }
          }, tab.label);
        })}
      </div>

      {/* Analitik Dashboard Görünümü */}
      {viewMode === "analytics" && (
        React.createElement(AnalyticsDashboard, { deptId: deptId, isAdmin: isAdmin })
      )}

      {/* Arama - sadece liste görünümünde */}
      {viewMode === "list" && React.createElement("div", { style: { marginBottom: 16 } },
        React.createElement(Input, {
          placeholder: "Akademisyen ara...",
          value: searchTerm,
          onChange: function(e) { setSearchTerm(e.target.value); },
          style: { maxWidth: 400 },
        })
      )}

      {/* Loading */}
      {viewMode === "list" && loading && !selectedProf && (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textLight }}>
          Yükleniyor...
        </div>
      )}

      {/* Liste */}
      {viewMode === "list" && !loading && filtered.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👨‍🏫</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>
              Henüz akademisyen eklenmedi
            </div>
            <div style={{ fontSize: 13, color: COLORS.textLight, marginBottom: 16 }}>
              ÇAKUAVİS kullanıcı adı ile akademisyen ekleyebilirsiniz.
            </div>
            {canManage && (
              <Btn onClick={function() { setAddModal(true); }}>
                + İlk Akademisyeni Ekle
              </Btn>
            )}
          </div>
        </Card>
      ) : viewMode === "list" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
          {filtered.map(function(prof) {
            return (
              <AcademicianCard
                key={prof.username}
                prof={prof}
                onSelect={handleSelect}
                onDelete={handleDelete}
                isSelected={selectedProf && selectedProf.username === prof.username}
                canManage={canManage}
                isAdmin={isAdmin}
              />
            );
          })}
        </div>
      ) : null}

      {/* Akademisyen Ekleme Modal */}
      {addModal && (
        <Modal open={true} title="Akademisyen Ekle" onClose={function() { setAddModal(false); }} width={450}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FormField label="ÇAKUAVİS Kullanıcı Adı">
              <Input
                value={newUsername}
                onChange={function(e) { setNewUsername(e.target.value); }}
                placeholder="Örn: aliegi, ksenturk"
              />
              <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 4 }}>
                cakuavis.karatekin.edu.tr/<strong>{newUsername ? newUsername.replace(/İ/g, "i").replace(/I/g, "ı").replace(/\s+/g, "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").trim() : "kullaniciadi"}</strong> adresindeki kullanıcı adı
              </div>
              <div style={{ fontSize: 11, color: COLORS.warning, marginTop: 2 }}>
                Ad soyad girerseniz otomatik olarak boşluklar silinir (ör: "taha etem" → "tahaetem")
              </div>
            </FormField>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <GhostBtn onClick={function() { setAddModal(false); }}>İptal</GhostBtn>
              <Btn onClick={handleAdd}>Ekle ve Bilgileri Çek</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

window.AkademisyenModuluApp = AkademisyenModuluApp;
