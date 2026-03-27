// ══════════════════════════════════════════════════════════════
// Akademisyen Modülü - ÇAKUAVİS Entegrasyonu
// Bölüm akademisyenlerinin bilgilerini çeker ve gösterir
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useCallback } = React;

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

// ── Ana Modül Bileşeni ──
function AkademisyenModuluApp({ currentUser, activeDepartment, departmentInfo }) {
  var [professors, setProfessors] = useState([]);
  var [selectedProf, setSelectedProf] = useState(null);
  var [profDetail, setProfDetail] = useState(null);
  var [loading, setLoading] = useState(false);
  var [addModal, setAddModal] = useState(false);
  var [newUsername, setNewUsername] = useState("");
  var [searchTerm, setSearchTerm] = useState("");

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
    var username = newUsername.replace(/\s+/g, "").toLowerCase().trim();
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
        {canManage && (
          <Btn onClick={function() { setAddModal(true); }}>
            + Akademisyen Ekle
          </Btn>
        )}
      </div>

      {/* Arama */}
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Akademisyen ara..."
          value={searchTerm}
          onChange={function(e) { setSearchTerm(e.target.value); }}
          style={{ maxWidth: 400 }}
        />
      </div>

      {/* Loading */}
      {loading && !selectedProf && (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textLight }}>
          Yükleniyor...
        </div>
      )}

      {/* Liste */}
      {!loading && filtered.length === 0 ? (
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
      ) : (
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
      )}

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
                cakuavis.karatekin.edu.tr/<strong>{newUsername ? newUsername.replace(/\s+/g, "").toLowerCase() : "kullaniciadi"}</strong> adresindeki kullanıcı adı
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
