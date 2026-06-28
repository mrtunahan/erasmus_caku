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
var GhostBtn = function ({ children, onClick, disabled, style: customStyle }) {
  return React.createElement(
    'button',
    {
      onClick: onClick,
      disabled: disabled,
      style: Object.assign(
        {
          padding: '8px 16px',
          background: 'transparent',
          border: '1px solid ' + (C ? C.border : '#E5E1D8'),
          borderRadius: 8,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 13,
          color: C ? C.text : '#1B2A4A',
          fontWeight: 500,
          opacity: disabled ? 0.5 : 1,
        },
        customStyle || {}
      ),
    },
    children
  );
};

// ── Renk paleti ──
const COLORS = {
  primary: '#1B2A4A',
  accent: '#2563EB',
  bg: '#F7F5F0',
  cardBg: '#FFFFFF',
  border: '#E5E1D8',
  text: '#1B2A4A',
  textLight: '#6B7280',
  success: '#059669',
  warning: '#D97706',
};

// ── Section ikonları ──
const SECTION_ICONS = {
  education: '🎓',
  researchAreas: '🔬',
  experience: '💼',
  theses: '📑',
  courses: '📚',
  publications: '📝',
  projects: '🚀',
  activities: '🏆',
  awards: '⭐',
};

// ── Akademisyen Kart Bileşeni (Zenginleştirilmiş) ──
function AcademicianCard({ prof, onSelect, onDelete, isSelected, canManage, isAdmin }) {
  var [hovered, setHovered] = useState(false);
  var [imgError, setImgError] = useState(false);

  // Unvanı isimden ayır
  var titleParts = (prof.fullName || '').match(
    /^(Prof\.\s*Dr\.|Doç\.\s*Dr\.|Dr\.\s*Öğr\.\s*Üyesi|Öğr\.\s*Gör\.\s*Dr\.|Öğr\.\s*Gör\.|Arş\.\s*Gör\.\s*Dr\.|Arş\.\s*Gör\.)\s*(.*)/i
  );
  var academicTitle = titleParts ? titleParts[1] : null;
  var displayName = titleParts ? titleParts[2] : prof.fullName || prof.name || prof.username;

  // Unvan renkleri
  var titleColor = '#6B7280';
  var titleBg = '#F3F4F6';
  if (academicTitle) {
    if (academicTitle.match(/^Prof/i)) {
      titleColor = '#7C3AED';
      titleBg = '#EDE9FE';
    } else if (academicTitle.match(/^Doç/i)) {
      titleColor = '#2563EB';
      titleBg = '#DBEAFE';
    } else if (academicTitle.match(/^Dr\.\s*Öğr/i)) {
      titleColor = '#059669';
      titleBg = '#D1FAE5';
    } else if (academicTitle.match(/^Arş/i)) {
      titleColor = '#D97706';
      titleBg = '#FEF3C7';
    }
  }

  // İsmin baş harflerini al (avatar fallback)
  var initials = (displayName || '?')
    .split(' ')
    .map(function (w) {
      return w.charAt(0);
    })
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Avatar renkleri (isim hash'ine göre)
  var avatarColors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#6366F1'];
  var hash = 0;
  var nameStr = prof.fullName || prof.username || '';
  for (var i = 0; i < nameStr.length; i++) hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
  var avatarBg = avatarColors[Math.abs(hash) % avatarColors.length];

  return (
    <div
      onClick={function () {
        onSelect(prof);
      }}
      onMouseEnter={function () {
        setHovered(true);
      }}
      onMouseLeave={function () {
        setHovered(false);
      }}
      style={{
        background: isSelected ? 'linear-gradient(135deg, #F0F9FF, #E0F2FE)' : COLORS.cardBg,
        border:
          '1px solid ' +
          (isSelected ? '#3B82F6' : hovered ? '#BFDBFE' : 'rgba(229, 231, 235, 0.6)'),
        borderRadius: 20,
        padding: 0,
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        boxShadow: hovered ? '0 12px 32px rgba(37,99,235,0.08)' : '0 4px 12px rgba(0,0,0,0.02)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        position: 'relative',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Üst gradient şerit */}
      <div
        style={{
          height: hovered ? 6 : 4,
          background: isSelected
            ? 'linear-gradient(90deg, #3B82F6, #8B5CF6)'
            : hovered
              ? 'linear-gradient(90deg, #60A5FA, #A78BFA)'
              : 'linear-gradient(90deg, #E5E7EB, #E5E7EB)',
          transition: 'all 0.3s ease',
        }}
      />

      <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {prof.photo && !imgError ? (
            <img
              src={prof.photo}
              alt={prof.fullName}
              style={{
                width: 60,
                height: 60,
                borderRadius: 14,
                objectFit: 'cover',
                border: '3px solid ' + (isSelected ? COLORS.accent : COLORS.border),
                transition: 'border-color 0.2s',
              }}
              onError={function () {
                setImgError(true);
              }}
            />
          ) : (
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 14,
                background: 'linear-gradient(135deg, ' + avatarBg + ', ' + avatarBg + 'CC)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 700,
                color: '#FFFFFF',
                border: '3px solid ' + avatarBg + '30',
                letterSpacing: 1,
              }}
            >
              {initials}
            </div>
          )}
          {/* Online/cache durumu */}
          {prof.fetchedAt && (
            <div
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#10B981',
                border: '2px solid white',
              }}
            />
          )}
        </div>

        {/* Bilgi */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Unvan badge */}
          {academicTitle && (
            <div
              style={{
                display: 'inline-block',
                fontSize: 10,
                fontWeight: 700,
                color: titleColor,
                background: titleBg,
                padding: '2px 8px',
                borderRadius: 6,
                marginBottom: 4,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
              }}
            >
              {academicTitle}
            </div>
          )}
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: COLORS.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.3,
            }}
          >
            {displayName}
          </div>
          {prof.email && (
            <div
              style={{
                fontSize: 12,
                color: COLORS.textLight,
                marginTop: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <span style={{ fontSize: 11, opacity: 0.7 }}>✉</span> {prof.email}
            </div>
          )}
          {prof.department && (
            <div
              style={{
                fontSize: 11,
                color: COLORS.textLight,
                marginTop: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <span style={{ fontSize: 11, opacity: 0.7 }}>🏛</span> {prof.department}
            </div>
          )}
        </div>

        {/* Sağ taraf aksiyonlar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6,
            flexShrink: 0,
          }}
        >
          {isAdmin && prof.departmentId && (
            <div
              style={{
                fontSize: 9,
                color: COLORS.accent,
                background: COLORS.accent + '12',
                padding: '3px 8px',
                borderRadius: 6,
                fontWeight: 600,
                maxWidth: 100,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {prof.departmentId}
            </div>
          )}
          {/* Detay göster ikonu */}
          <div
            style={{
              fontSize: 16,
              color: hovered ? COLORS.accent : COLORS.textLight + '60',
              transition: 'all 0.2s',
              transform: hovered ? 'translateX(2px)' : 'translateX(0)',
            }}
          >
            →
          </div>
          {canManage && onDelete && (
            <button
              onClick={function (e) {
                e.stopPropagation();
                onDelete(prof);
              }}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: 'none',
                color: '#EF4444',
                cursor: 'pointer',
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 8,
                fontWeight: 600,
                opacity: hovered ? 1 : 0,
                transition: 'opacity 0.2s, background 0.2s',
              }}
              onMouseEnter={(e) => (e.target.style.background = 'rgba(239, 68, 68, 0.15)')}
              onMouseLeave={(e) => (e.target.style.background = 'rgba(239, 68, 68, 0.1)')}
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
  var [activeTab, setActiveTab] = useState('genel');
  var [imgError, setImgError] = useState(false);

  if (!data) return null;

  var titleParts = (data.fullName || '').match(
    /^(Prof\.\s*Dr\.|Doç\.\s*Dr\.|Dr\.\s*Öğr\.\s*Üyesi|Öğr\.\s*Gör\.\s*Dr\.|Öğr\.\s*Gör\.|Arş\.\s*Gör\.\s*Dr\.|Arş\.\s*Gör\.)\s*(.*)/i
  );
  var academicTitle = titleParts ? titleParts[1] : null;
  var displayName = titleParts ? titleParts[2] : data.fullName || data.username;

  var initials = (displayName || '?')
    .split(' ')
    .map(function (w) {
      return w.charAt(0);
    })
    .slice(0, 2)
    .join('')
    .toUpperCase();

  var avatarColors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#6366F1'];
  var hash = 0;
  var nameStr = data.fullName || data.username || '';
  for (var ci = 0; ci < nameStr.length; ci++) hash = nameStr.charCodeAt(ci) + ((hash << 5) - hash);
  var avatarBg = avatarColors[Math.abs(hash) % avatarColors.length];

  var statColors = ['#EFF6FF', '#F0FDF4', '#FEF3C7', '#EDE9FE', '#FFF1F2'];
  var statBorderColors = ['#BFDBFE', '#BBF7D0', '#FDE68A', '#DDD6FE', '#FECDD3'];
  var statTextColors = ['#2563EB', '#16A34A', '#D97706', '#7C3AED', '#E11D48'];

  var renderTabs = () => (
    <div
      style={{
        display: 'flex',
        gap: 12,
        borderBottom: '2px solid #E5E7EB',
        marginBottom: 24,
        overflowX: 'auto',
      }}
    >
      {[
        { id: 'genel', label: 'Genel Bakış', icon: '📊' },
        { id: 'yayinlar', label: 'Akademik Profil', icon: '📚' },
        { id: 'loglar', label: 'Kazıma Logları', icon: '🤖' },
      ].map((t) => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === t.id ? '3px solid #2563EB' : '3px solid transparent',
            padding: '12px 16px',
            fontSize: 14,
            fontWeight: activeTab === t.id ? 700 : 500,
            color: activeTab === t.id ? '#2563EB' : '#6B7280',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          <span>{t.icon}</span> {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      {/* Üst Navigasyon Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
          padding: '12px 20px',
          background: COLORS.cardBg,
          borderRadius: 12,
          border: '1px solid ' + COLORS.border,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <GhostBtn
          onClick={onBack}
          style={{
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
            padding: '8px 14px',
          }}
        >
          ← Listeye Dön
        </GhostBtn>
        <div style={{ flex: 1 }} />
      </div>

      {/* Hero Profil Kartı */}
      <div
        style={{
          background: 'linear-gradient(135deg, ' + COLORS.primary + ' 0%, #2D4A7A 100%)',
          borderRadius: 20,
          padding: 0,
          marginBottom: 24,
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(27,42,74,0.2)',
        }}
      >
        <div
          style={{
            position: 'relative',
            padding: '32px 32px 28px',
            backgroundImage:
              'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.05) 0%, transparent 50%)',
          }}
        >
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ position: 'relative' }}>
              {data.photo && !imgError ? (
                <img
                  src={data.photo}
                  alt={data.fullName}
                  onError={() => setImgError(true)}
                  style={{
                    width: 130,
                    height: 130,
                    borderRadius: 20,
                    objectFit: 'cover',
                    border: '4px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 130,
                    height: 130,
                    borderRadius: 20,
                    background: 'linear-gradient(135deg, ' + avatarBg + ', ' + avatarBg + 'CC)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 44,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    border: '4px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    letterSpacing: 2,
                  }}
                >
                  {initials}
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              {academicTitle && (
                <div
                  style={{
                    display: 'inline-block',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#FCD34D',
                    background: 'rgba(255,255,255,0.12)',
                    padding: '4px 12px',
                    borderRadius: 8,
                    marginBottom: 10,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {academicTitle}
                </div>
              )}
              <h2
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  margin: '0 0 8px 0',
                  lineHeight: 1.2,
                }}
              >
                {displayName}
              </h2>
              {data.department && (
                <div
                  style={{
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.7)',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  🏛 {data.department}
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {data.email && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.85)',
                      padding: '6px 12px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: 8,
                    }}
                  >
                    ✉ {data.email}
                  </div>
                )}
                {data.phone && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.85)',
                      padding: '6px 12px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: 8,
                    }}
                  >
                    📞 {data.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats on Hero */}
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(4px)',
                borderRadius: 16,
                padding: '16px 24px',
                minWidth: 150,
              }}
            >
              <div
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Veri Kaynakları
              </div>
              <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: 13,
                    color: data.links?.scholar ? '#4ADE80' : '#F87171',
                    fontWeight: 600,
                  }}
                >
                  ● Google Scholar
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: data.links?.yoksis ? '#4ADE80' : '#F87171',
                    fontWeight: 600,
                  }}
                >
                  ● YÖKSİS
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: data.links?.wos ? '#4ADE80' : '#F87171',
                    fontWeight: 600,
                  }}
                >
                  ● Web of Science
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {renderTabs()}

      {activeTab === 'genel' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          {/* İstatistikler */}
          {data.stats && Object.keys(data.stats).length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 14,
                marginBottom: 24,
              }}
            >
              {Object.keys(data.stats).map((key, idx) => (
                <div
                  key={key}
                  style={{
                    background: statColors[idx % statColors.length],
                    borderRadius: 16,
                    padding: '20px 18px',
                    border: '1px solid ' + statBorderColors[idx % statBorderColors.length],
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: statTextColors[idx % statTextColors.length],
                      lineHeight: 1,
                      marginBottom: 6,
                    }}
                  >
                    {data.stats[key]}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#4B5563',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0,
                    }}
                  >
                    {key}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hızlı Bakış - Kaynaklar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div
              style={{
                background: 'white',
                padding: 24,
                borderRadius: 16,
                border: '1px solid #E5E7EB',
              }}
            >
              <h3
                style={{
                  margin: '0 0 16px',
                  fontSize: 16,
                  color: '#111827',
                  display: 'flex',
                  gap: 8,
                }}
              >
                <span role="img">🎓</span> YÖKSİS Profili
              </h3>
              <p style={{ color: '#4B5563', fontSize: 13, lineHeight: 1.6 }}>
                YÖKSİS sistemi üzerinden{' '}
                <strong>{data.sections?.projects?.items?.length || 0} proje</strong> ve{' '}
                <strong>{data.sections?.theses?.items?.length || 0} tez</strong> kaydı bulundu.
              </p>
              {data.links?.yoksis && (
                <a
                  href={data.links.yoksis}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: 12,
                    padding: '8px 16px',
                    background: '#F3F4F6',
                    color: '#374151',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  YÖKSİS Profiline Git ↗
                </a>
              )}
            </div>

            <div
              style={{
                background: 'white',
                padding: 24,
                borderRadius: 16,
                border: '1px solid #E5E7EB',
              }}
            >
              <h3
                style={{
                  margin: '0 0 16px',
                  fontSize: 16,
                  color: '#111827',
                  display: 'flex',
                  gap: 8,
                }}
              >
                <span role="img">📊</span> Scholar & WoS
              </h3>
              <p style={{ color: '#4B5563', fontSize: 13, lineHeight: 1.6 }}>
                Google Scholar üzerinden{' '}
                <strong>{data.sections?.publications?.items?.length || 0} yayın</strong>, Web of
                Science üzerinden{' '}
                <strong>{data.sections?.wosPapers?.items?.length || 0} makale</strong> eşleştirildi.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {data.links?.scholar && (
                  <a
                    href={data.links.scholar}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 16px',
                      background: '#EFF6FF',
                      color: '#1D4ED8',
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Scholar ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'yayinlar' && (
        <div
          style={{
            animation: 'fadeIn 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Dinamik bölümler listesi (sadece yayın, proje vs. olanlar) */}
          {Object.keys(data.sections || {})
            .filter((k) => k !== 'error')
            .map((key) => {
              const section = data.sections[key];
              return (
                <div
                  key={key}
                  style={{
                    background: 'white',
                    padding: 24,
                    borderRadius: 16,
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  }}
                >
                  <h3
                    style={{
                      margin: '0 0 16px',
                      fontSize: 16,
                      color: '#111827',
                      paddingBottom: 12,
                      borderBottom: '1px solid #F3F4F6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{section.label}</span>
                    <span
                      style={{
                        fontSize: 12,
                        background: '#EFF6FF',
                        color: '#2563EB',
                        padding: '4px 10px',
                        borderRadius: 12,
                      }}
                    >
                      {section.items.length} Kayıt
                    </span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {section.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px',
                          background: '#F9FAFB',
                          borderRadius: 8,
                          fontSize: 13,
                          color: '#374151',
                        }}
                      >
                        <strong style={{ opacity: 0.5, marginRight: 8, fontSize: 11 }}>
                          {(idx + 1).toString().padStart(2, '0')}
                        </strong>{' '}
                        {item}
                      </div>
                    ))}
                    {section.items.length === 0 && (
                      <div style={{ color: '#9CA3AF', fontSize: 13 }}>Kayıt bulunamadı.</div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {activeTab === 'loglar' && (
        <div
          style={{
            animation: 'fadeIn 0.3s ease',
            background: '#111827',
            borderRadius: 16,
            padding: 24,
            color: '#D1D5DB',
            fontFamily: 'monospace',
          }}
        >
          <h3 style={{ color: 'white', margin: '0 0 16px', fontSize: 15, display: 'flex', gap: 8 }}>
            <span role="img">⚡</span> Sistem Kazıma İşlemi (Real-time Scraping Engine)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.sections?.error ? (
              data.sections.error.items.map((log, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 14px',
                    background: log.includes('Başarılı')
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(239, 68, 68, 0.1)',
                    borderLeft: `3px solid ${log.includes('Başarılı') ? '#10B981' : '#EF4444'}`,
                    fontSize: 13,
                  }}
                >
                  &gt; {log}
                </div>
              ))
            ) : (
              <div style={{ opacity: 0.7 }}>
                Log verisi mevcut değil. Yeni mimaride hata yönetimi yok.
              </div>
            )}
          </div>
          <div style={{ marginTop: 24, fontSize: 11, color: '#6B7280' }}>
            * Kazıma işlemleri hedefin erişilebilirliğine göre IP/Captcha korumasına takılabilir.
            Arama yapıldığında "Başarılı" dönen sonuçlar sisteme yansıtılır.
          </div>
        </div>
      )}
    </div>
  );
}

// ── XLSX Export Fonksiyonu ──
function generateXLSX(metricsData, periodLabel) {
  // XML Spreadsheet 2003 format - no library needed
  var categories = [
    { key: 'sci', label: 'SCI-Exp/SSCI, AHCI kapsamındaki dergilerdeki yayın sayısı' },
    {
      key: 'uak',
      label: 'ÜAK tarafından alan indeksi olarak kabul edilen indekslerdeki yayın sayısı',
    },
    { key: 'ulakbim', label: "Ulakbim/TR Dizin'de taranan dergilerdeki ulusal yayın sayısı" },
    {
      key: 'book',
      label: 'ÜAK tarafından kabul edilen yayınevlerinde yayımlanmış kitap ve kitap bölümü sayısı',
    },
    {
      key: 'conference',
      label: 'Uluslararası kongre ve sempozyumlarda sunulmuş tam metin bildiri sayısı',
    },
    { key: 'other', label: 'Diğer yayınlar' },
  ];

  var esc = function (s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  xml += '<Styles>\n';
  xml +=
    '<Style ss:ID="hdr"><Interior ss:Color="#1B2A4A" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF" ss:Bold="1" ss:Size="10"/><Alignment ss:Horizontal="Center" ss:WrapText="1"/></Style>\n';
  xml +=
    '<Style ss:ID="cat"><Font ss:Bold="1" ss:Size="10"/><Interior ss:Color="#FFF2CC" ss:Pattern="Solid"/></Style>\n';
  xml +=
    '<Style ss:ID="sec"><Font ss:Bold="1" ss:Size="11"/><Interior ss:Color="#E2EFDA" ss:Pattern="Solid"/></Style>\n';
  xml +=
    '<Style ss:ID="num"><NumberFormat ss:Format="0"/><Alignment ss:Horizontal="Center"/></Style>\n';
  xml +=
    '<Style ss:ID="numY"><NumberFormat ss:Format="0"/><Alignment ss:Horizontal="Center"/><Interior ss:Color="#FFFF00" ss:Pattern="Solid"/></Style>\n';
  xml += '<Style ss:ID="txt"><Alignment ss:WrapText="1"/></Style>\n';
  xml += '</Styles>\n';

  // ═══ SAYFA 1: Genel Özet (görsellerdeki format) ═══
  xml += '<Worksheet ss:Name="Genel Özet">\n<Table ss:DefaultColumnWidth="100">\n';
  xml += '<Column ss:Width="60"/><Column ss:Width="350"/><Column ss:Width="70"/>';

  // Akademisyen isimlerini sütun olarak ekle
  metricsData.forEach(function () {
    xml += '<Column ss:Width="100"/>';
  });
  xml += '\n';

  // Header row
  xml += '<Row>\n';
  xml += '<Cell ss:StyleID="hdr"><Data ss:Type="String">No</Data></Cell>\n';
  xml += '<Cell ss:StyleID="hdr"><Data ss:Type="String">GÖSTERGE</Data></Cell>\n';
  xml += '<Cell ss:StyleID="hdr"><Data ss:Type="String">ÖLÇÜ BİRİMİ</Data></Cell>\n';
  metricsData.forEach(function (m) {
    var shortName = (m.fullName || '')
      .replace(/^(Prof\.|Doç\.|Dr\.|Arş\.|Öğr\.|Gör\.|Yrd\.)\s*/gi, '')
      .trim();
    xml +=
      '<Cell ss:StyleID="hdr"><Data ss:Type="String">' +
      esc(shortName || m.username) +
      '</Data></Cell>\n';
  });
  xml += '</Row>\n';

  // Section header: ARAŞTIRMA
  xml +=
    '<Row><Cell ss:StyleID="sec"/><Cell ss:StyleID="sec"><Data ss:Type="String">YÜKSEKÖĞRETİMDE BİLİMSEL ARAŞTIRMA GELİŞTİRME</Data></Cell><Cell ss:StyleID="sec"/>';
  metricsData.forEach(function () {
    xml += '<Cell ss:StyleID="sec"/>';
  });
  xml += '</Row>\n';

  // Gösterge satırları
  var rowNum = 1;
  categories.forEach(function (cat) {
    xml += '<Row>\n';
    xml += '<Cell ss:StyleID="num"><Data ss:Type="Number">' + rowNum + '</Data></Cell>\n';
    xml += '<Cell ss:StyleID="txt"><Data ss:Type="String">' + esc(cat.label) + '</Data></Cell>\n';
    xml += '<Cell><Data ss:Type="String">Sayı</Data></Cell>\n';
    metricsData.forEach(function (m) {
      var val = m.filtered[cat.key] || 0;
      xml +=
        '<Cell ss:StyleID="' +
        (val > 0 ? 'numY' : 'num') +
        '"><Data ss:Type="Number">' +
        val +
        '</Data></Cell>\n';
    });
    xml += '</Row>\n';
    rowNum++;
  });

  // Toplam yayın satırı
  xml += '<Row>\n';
  xml += '<Cell ss:StyleID="num"><Data ss:Type="Number">' + rowNum + '</Data></Cell>\n';
  xml += '<Cell ss:StyleID="cat"><Data ss:Type="String">Toplam Yayın Sayısı</Data></Cell>\n';
  xml += '<Cell><Data ss:Type="String">Sayı</Data></Cell>\n';
  metricsData.forEach(function (m) {
    var total =
      (m.filtered.sci || 0) +
      (m.filtered.uak || 0) +
      (m.filtered.ulakbim || 0) +
      (m.filtered.book || 0) +
      (m.filtered.conference || 0) +
      (m.filtered.other || 0);
    xml += '<Cell ss:StyleID="numY"><Data ss:Type="Number">' + total + '</Data></Cell>\n';
  });
  xml += '</Row>\n';
  rowNum++;

  // Atıf sayısı satırı
  xml += '<Row>\n';
  xml += '<Cell ss:StyleID="num"><Data ss:Type="Number">' + rowNum + '</Data></Cell>\n';
  xml += '<Cell ss:StyleID="txt"><Data ss:Type="String">Toplam atıf sayısı</Data></Cell>\n';
  xml += '<Cell><Data ss:Type="String">Sayı</Data></Cell>\n';
  metricsData.forEach(function (m) {
    var citationVal = 0;
    if (m.stats) {
      Object.keys(m.stats).forEach(function (k) {
        if (
          k.toLocaleLowerCase('tr').indexOf('atıf') >= 0 ||
          k.toLocaleLowerCase('tr').indexOf('atif') >= 0 ||
          k.toLowerCase().indexOf('citation') >= 0
        ) {
          citationVal = parseInt(m.stats[k]) || 0;
        }
      });
    }
    xml +=
      '<Cell ss:StyleID="' +
      (citationVal > 0 ? 'numY' : 'num') +
      '"><Data ss:Type="Number">' +
      citationVal +
      '</Data></Cell>\n';
  });
  xml += '</Row>\n';
  rowNum++;

  // 2209 Proje satırı
  xml += '<Row>\n';
  xml += '<Cell ss:StyleID="num"><Data ss:Type="Number">' + rowNum + '</Data></Cell>\n';
  xml += '<Cell ss:StyleID="txt"><Data ss:Type="String">TÜBİTAK 2209 proje sayısı</Data></Cell>\n';
  xml += '<Cell><Data ss:Type="String">Sayı</Data></Cell>\n';
  metricsData.forEach(function (m) {
    var val = m.project2209Count || 0;
    xml +=
      '<Cell ss:StyleID="' +
      (val > 0 ? 'numY' : 'num') +
      '"><Data ss:Type="Number">' +
      val +
      '</Data></Cell>\n';
  });
  xml += '</Row>\n';

  // Öğretim elemanı sayısı
  xml +=
    '<Row><Cell ss:StyleID="sec"/><Cell ss:StyleID="sec"><Data ss:Type="String">GENEL BİLGİLER</Data></Cell><Cell ss:StyleID="sec"/>';
  metricsData.forEach(function () {
    xml += '<Cell ss:StyleID="sec"/>';
  });
  xml += '</Row>\n';
  xml += '<Row>\n';
  xml += '<Cell ss:StyleID="num"><Data ss:Type="Number">' + (rowNum + 1) + '</Data></Cell>\n';
  xml += '<Cell ss:StyleID="txt"><Data ss:Type="String">Öğretim elemanı sayısı</Data></Cell>\n';
  xml += '<Cell><Data ss:Type="String">Sayı</Data></Cell>\n';
  xml +=
    '<Cell ss:StyleID="numY" ss:MergeAcross="' +
    (metricsData.length - 1) +
    '"><Data ss:Type="Number">' +
    metricsData.length +
    '</Data></Cell>\n';
  xml += '</Row>\n';

  xml += '</Table>\n</Worksheet>\n';

  // ═══ SAYFA 2: Akademisyen Detay ═══
  xml += '<Worksheet ss:Name="Akademisyen Detay">\n<Table>\n';
  xml += '<Column ss:Width="200"/><Column ss:Width="150"/>';
  categories.forEach(function () {
    xml += '<Column ss:Width="90"/>';
  });
  xml += '<Column ss:Width="80"/><Column ss:Width="80"/><Column ss:Width="80"/>\n';

  // Header
  xml += '<Row>\n';
  xml += '<Cell ss:StyleID="hdr"><Data ss:Type="String">Ad Soyad</Data></Cell>\n';
  xml += '<Cell ss:StyleID="hdr"><Data ss:Type="String">Bölüm</Data></Cell>\n';
  categories.forEach(function (c) {
    var shortLabel =
      c.key === 'sci'
        ? 'SCI/SSCI/AHCI'
        : c.key === 'uak'
          ? 'ÜAK İndeks'
          : c.key === 'ulakbim'
            ? 'Ulakbim/TR Dizin'
            : c.key === 'book'
              ? 'Kitap/Bölüm'
              : c.key === 'conference'
                ? 'Kongre/Bildiri'
                : 'Diğer';
    xml += '<Cell ss:StyleID="hdr"><Data ss:Type="String">' + esc(shortLabel) + '</Data></Cell>\n';
  });
  xml += '<Cell ss:StyleID="hdr"><Data ss:Type="String">Toplam</Data></Cell>\n';
  xml += '<Cell ss:StyleID="hdr"><Data ss:Type="String">Atıf</Data></Cell>\n';
  xml += '<Cell ss:StyleID="hdr"><Data ss:Type="String">2209 Proje</Data></Cell>\n';
  xml += '</Row>\n';

  // Data rows
  metricsData.forEach(function (m) {
    xml += '<Row>\n';
    xml += '<Cell><Data ss:Type="String">' + esc(m.fullName) + '</Data></Cell>\n';
    xml += '<Cell><Data ss:Type="String">' + esc(m.department) + '</Data></Cell>\n';
    var total = 0;
    categories.forEach(function (cat) {
      var val = m.filtered[cat.key] || 0;
      total += val;
      xml +=
        '<Cell ss:StyleID="' +
        (val > 0 ? 'numY' : 'num') +
        '"><Data ss:Type="Number">' +
        val +
        '</Data></Cell>\n';
    });
    xml += '<Cell ss:StyleID="numY"><Data ss:Type="Number">' + total + '</Data></Cell>\n';
    var citationVal = 0;
    if (m.stats) {
      Object.keys(m.stats).forEach(function (k) {
        if (
          k.toLocaleLowerCase('tr').indexOf('atıf') >= 0 ||
          k.toLocaleLowerCase('tr').indexOf('atif') >= 0 ||
          k.toLowerCase().indexOf('citation') >= 0
        ) {
          citationVal = parseInt(m.stats[k]) || 0;
        }
      });
    }
    xml += '<Cell ss:StyleID="num"><Data ss:Type="Number">' + citationVal + '</Data></Cell>\n';
    xml +=
      '<Cell ss:StyleID="num"><Data ss:Type="Number">' +
      (m.project2209Count || 0) +
      '</Data></Cell>\n';
    xml += '</Row>\n';
  });

  xml += '</Table>\n</Worksheet>\n</Workbook>';

  var BOM = '\uFEFF';
  var blob = new Blob([BOM + xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'akademisyen_metrikleri_' + periodLabel + '.xls';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── SVG Chart Bileşenleri ──

// Yatay Bar Chart
function HBarChart({ data, width, height, barColor }) {
  if (!data || data.length === 0) return null;
  var maxVal = Math.max.apply(
    null,
    data.map(function (d) {
      return d.value;
    })
  );
  if (maxVal === 0) maxVal = 1;
  var barH = Math.min(28, (height - 20) / data.length - 4);
  var labelW = 140;
  var chartW = width - labelW - 50;

  return React.createElement(
    'svg',
    {
      width: width,
      height: Math.max(height, data.length * (barH + 4) + 10),
      style: { display: 'block' },
    },
    data.map(function (d, i) {
      var y = i * (barH + 4) + 5;
      var bw = (d.value / maxVal) * chartW;
      return React.createElement(
        'g',
        { key: i },
        React.createElement(
          'text',
          {
            x: labelW - 8,
            y: y + barH / 2 + 4,
            textAnchor: 'end',
            fontSize: 11,
            fill: COLORS.text,
            fontWeight: 500,
          },
          d.label.length > 20 ? d.label.substring(0, 18) + '…' : d.label
        ),
        React.createElement('rect', {
          x: labelW,
          y: y,
          width: Math.max(bw, 2),
          height: barH,
          rx: 4,
          fill: barColor || COLORS.accent,
          opacity: 0.85,
        }),
        React.createElement(
          'text',
          {
            x: labelW + bw + 6,
            y: y + barH / 2 + 4,
            fontSize: 11,
            fill: COLORS.text,
            fontWeight: 600,
          },
          d.value
        )
      );
    })
  );
}

// Donut Chart
function DonutChart({ data, size, title }) {
  if (!data || data.length === 0) return null;
  var total = data.reduce(function (s, d) {
    return s + d.value;
  }, 0);
  if (total === 0)
    return React.createElement(
      'div',
      { style: { textAlign: 'center', padding: 20, color: COLORS.textLight, fontSize: 13 } },
      'Veri yok'
    );
  var r = (size - 40) / 2;
  var cx = size / 2;
  var cy = size / 2 - 10;
  var strokeW = r * 0.35;
  var innerR = r - strokeW / 2;
  var colors = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2'];
  var startAngle = -Math.PI / 2;

  var arcs = data.map(function (d, i) {
    var angle = (d.value / total) * Math.PI * 2;
    var endAngle = startAngle + angle;
    var largeArc = angle > Math.PI ? 1 : 0;
    var x1 = cx + innerR * Math.cos(startAngle);
    var y1 = cy + innerR * Math.sin(startAngle);
    var x2 = cx + innerR * Math.cos(endAngle);
    var y2 = cy + innerR * Math.sin(endAngle);
    var pathD =
      'M ' +
      x1 +
      ' ' +
      y1 +
      ' A ' +
      innerR +
      ' ' +
      innerR +
      ' 0 ' +
      largeArc +
      ' 1 ' +
      x2 +
      ' ' +
      y2;
    startAngle = endAngle;
    return React.createElement('path', {
      key: i,
      d: pathD,
      fill: 'none',
      stroke: colors[i % colors.length],
      strokeWidth: strokeW,
      strokeLinecap: 'round',
    });
  });

  var legend = data.map(function (d, i) {
    return React.createElement(
      'div',
      { key: i, style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 } },
      React.createElement('div', {
        style: {
          width: 10,
          height: 10,
          borderRadius: 2,
          background: colors[i % colors.length],
          flexShrink: 0,
        },
      }),
      React.createElement('span', { style: { color: COLORS.textLight } }, d.label),
      React.createElement(
        'span',
        { style: { fontWeight: 600, color: COLORS.text, marginLeft: 'auto' } },
        d.value
      )
    );
  });

  return React.createElement(
    'div',
    { style: { textAlign: 'center' } },
    React.createElement(
      'svg',
      { width: size, height: size - 20, style: { display: 'block', margin: '0 auto' } },
      arcs,
      React.createElement(
        'text',
        {
          x: cx,
          y: cy - 4,
          textAnchor: 'middle',
          fontSize: 22,
          fontWeight: 700,
          fill: COLORS.text,
        },
        total
      ),
      React.createElement(
        'text',
        { x: cx, y: cy + 14, textAnchor: 'middle', fontSize: 10, fill: COLORS.textLight },
        title || 'Toplam'
      )
    ),
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          marginTop: 8,
          maxWidth: 220,
          margin: '8px auto 0',
        },
      },
      legend
    )
  );
}

// Trend Line Chart (yıllara göre)
function TrendChart({ data, width, height, lineColor }) {
  if (!data || data.length < 2) return null;
  var maxVal = Math.max.apply(
    null,
    data.map(function (d) {
      return d.value;
    })
  );
  if (maxVal === 0) maxVal = 1;
  var padL = 36,
    padR = 16,
    padT = 16,
    padB = 28;
  var chartW = width - padL - padR;
  var chartH = height - padT - padB;
  var step = chartW / (data.length - 1);

  var points = data.map(function (d, i) {
    var x = padL + i * step;
    var y = padT + chartH - (d.value / maxVal) * chartH;
    return { x: x, y: y, label: d.label, value: d.value };
  });

  var pathD = points
    .map(function (p, i) {
      return (i === 0 ? 'M' : 'L') + p.x + ',' + p.y;
    })
    .join(' ');
  var areaD =
    pathD +
    ' L' +
    points[points.length - 1].x +
    ',' +
    (padT + chartH) +
    ' L' +
    points[0].x +
    ',' +
    (padT + chartH) +
    ' Z';

  return React.createElement(
    'svg',
    { width: width, height: height, style: { display: 'block' } },
    // Grid lines
    [0, 0.25, 0.5, 0.75, 1].map(function (frac, i) {
      var y = padT + chartH - frac * chartH;
      return React.createElement('line', {
        key: 'g' + i,
        x1: padL,
        y1: y,
        x2: width - padR,
        y2: y,
        stroke: COLORS.border,
        strokeWidth: 0.5,
      });
    }),
    // Y axis labels
    [0, 0.5, 1].map(function (frac, i) {
      var y = padT + chartH - frac * chartH;
      return React.createElement(
        'text',
        {
          key: 'yl' + i,
          x: padL - 6,
          y: y + 4,
          textAnchor: 'end',
          fontSize: 9,
          fill: COLORS.textLight,
        },
        Math.round(maxVal * frac)
      );
    }),
    // Area fill
    React.createElement('path', { d: areaD, fill: lineColor || COLORS.accent, opacity: 0.08 }),
    // Line
    React.createElement('path', {
      d: pathD,
      fill: 'none',
      stroke: lineColor || COLORS.accent,
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
    // Dots & labels
    points.map(function (p, i) {
      return React.createElement(
        'g',
        { key: 'd' + i },
        React.createElement('circle', {
          cx: p.x,
          cy: p.y,
          r: 3.5,
          fill: lineColor || COLORS.accent,
        }),
        React.createElement(
          'text',
          {
            x: p.x,
            y: padT + chartH + 16,
            textAnchor: 'middle',
            fontSize: 9,
            fill: COLORS.textLight,
          },
          p.label
        ),
        p.value > 0
          ? React.createElement(
              'text',
              {
                x: p.x,
                y: p.y - 8,
                textAnchor: 'middle',
                fontSize: 9,
                fontWeight: 600,
                fill: COLORS.text,
              },
              p.value
            )
          : null
      );
    })
  );
}

// ── Analitik Dashboard Bileşeni ──
function AnalyticsDashboard({ deptId, isAdmin }) {
  var [metricsData, setMetricsData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [refreshing, setRefreshing] = useState(false);
  var [period, setPeriod] = useState(12); // 3, 6, 9, 12 ay

  var loadMetrics = useCallback(
    function () {
      setLoading(true);
      var token = localStorage.getItem('caku_auth_token');
      var headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;
      var url = '/api/akademisyen/metrics/all';
      if (!isAdmin && deptId) url += '?departmentId=' + encodeURIComponent(deptId);

      fetch(url, { headers: headers })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (Array.isArray(data)) setMetricsData(data);
          setLoading(false);
        })
        .catch(function () {
          setLoading(false);
        });
    },
    [deptId, isAdmin]
  );

  // Tüm akademisyenleri force refresh et (cache'i yenile)
  var handleRefresh = function () {
    if (!metricsData || metricsData.length === 0) return;
    setRefreshing(true);
    var token = localStorage.getItem('caku_auth_token');
    var headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    var promises = metricsData.map(function (m) {
      return fetch('/api/akademisyen/' + encodeURIComponent(m.username) + '?force=true', {
        headers: headers,
      })
        .then(function (r) {
          return r.json();
        })
        .catch(function () {
          return null;
        });
    });
    Promise.all(promises).then(function () {
      setRefreshing(false);
      loadMetrics(); // Yenilenen verileri tekrar çek
    });
  };

  useEffect(
    function () {
      loadMetrics();
    },
    [loadMetrics]
  );

  // Zaman dilimine göre filtreleme
  var cutoffDate = useMemo(
    function () {
      var d = new Date();
      d.setMonth(d.getMonth() - period);
      return d.getFullYear();
    },
    [period]
  );

  var processedData = useMemo(
    function () {
      if (!metricsData) return [];
      return metricsData.map(function (m) {
        var pm = m.publicationMetrics || {};
        var filtered = {};
        var cats = ['sci', 'uak', 'ulakbim', 'book', 'conference', 'scholar'];
        cats.forEach(function (cat) {
          var items = pm[cat] || [];
          filtered[cat] = items.filter(function (item) {
            if (!item.year) return true; // yılı bilinmeyenleri dahil et
            return item.year >= cutoffDate;
          }).length;
        });
        return Object.assign({}, m, { filtered: filtered });
      });
    },
    [metricsData, cutoffDate]
  );

  // Toplu istatistikler — ÇAKUAVİS stats + legacy publicationMetrics
  var totals = useMemo(
    function () {
      var t = {
        // Legacy (eski publicationMetrics, dönem filtresine bağlı)
        sci: 0,
        uak: 0,
        ulakbim: 0,
        book: 0,
        conference: 0,
        scholar: 0,
        project2209: 0,
        citations: 0,
        wosCitations: 0,
        // ÇAKUAVİS (sayısal stat string'leri — m.stats)
        yoksisArticle: 0,
        scholarArticle: 0,
        wosArticle: 0,
        bildiri: 0,
        kitap: 0,
        proje: 0,
        patent: 0,
        tasarim: 0,
        tez: 0,
      };
      var parseN = function (v) {
        var n = parseInt(v, 10);
        return isNaN(n) ? 0 : n;
      };
      processedData.forEach(function (m) {
        t.sci += m.filtered.sci || 0;
        t.uak += m.filtered.uak || 0;
        t.ulakbim += m.filtered.ulakbim || 0;
        t.book += m.filtered.book || 0;
        t.conference += m.filtered.conference || 0;
        t.scholar += m.filtered.scholar || 0;
        t.project2209 += m.project2209Count || 0;
        if (m.stats) {
          // ÇAKUAVİS stats anahtarları (büyük/küçük harf esnek)
          var s = m.stats;
          t.yoksisArticle += parseN(s['YÖKSİS Makale']);
          t.scholarArticle += parseN(s['Scholar Makale']);
          t.wosArticle += parseN(s['WoS Makale']);
          t.bildiri += parseN(s['Bildiri']);
          t.kitap += parseN(s['Kitap']);
          t.proje += parseN(s['Proje']);
          t.patent += parseN(s['Patent']);
          t.tasarim += parseN(s['Tasarım']);
          t.tez += parseN(s['Tez']);
          // Atıflar — en yüksek atıf "ana atıf"; WoS atıf ayrı
          var maxCit = 0;
          var wosCit = 0;
          Object.keys(s).forEach(function (k) {
            var lk = k.toLocaleLowerCase('tr');
            if (lk.indexOf('atıf') >= 0 || lk.indexOf('atif') >= 0 || lk.indexOf('citation') >= 0) {
              var val = parseN(s[k]);
              if (val > maxCit) maxCit = val;
              if (lk.indexOf('wos') >= 0) wosCit = val;
            }
          });
          t.citations += maxCit;
          t.wosCitations += wosCit;
        }
      });
      return t;
    },
    [processedData]
  );

  // Yıllara göre trend verisi
  var yearlyTrend = useMemo(
    function () {
      if (!metricsData) return [];
      var yearMap = {};
      metricsData.forEach(function (m) {
        var pm = m.publicationMetrics || {};
        ['sci', 'uak', 'ulakbim', 'book', 'conference', 'scholar'].forEach(function (cat) {
          (pm[cat] || []).forEach(function (item) {
            if (item.year && item.year >= cutoffDate) {
              yearMap[item.year] = (yearMap[item.year] || 0) + 1;
            }
          });
        });
      });
      var years = Object.keys(yearMap).sort();
      return years.map(function (y) {
        return { label: y, value: yearMap[y] };
      });
    },
    [metricsData, cutoffDate]
  );

  // Akademisyen bazlı bar chart verisi (top 10)
  var topAuthors = useMemo(
    function () {
      return processedData
        .map(function (m) {
          var total =
            (m.filtered.sci || 0) +
            (m.filtered.uak || 0) +
            (m.filtered.ulakbim || 0) +
            (m.filtered.book || 0) +
            (m.filtered.conference || 0) +
            (m.filtered.scholar || 0);
          var shortName = (m.fullName || '')
            .replace(/^(Prof\.|Doç\.|Dr\.|Arş\.|Öğr\.|Gör\.|Yrd\.)\s*/gi, '')
            .trim();
          return { label: shortName || m.username, value: total };
        })
        .filter(function (d) {
          return d.value > 0;
        })
        .sort(function (a, b) {
          return b.value - a.value;
        })
        .slice(0, 10);
    },
    [processedData]
  );

  // Yeni Tablo: Top 10 Atıf
  var topCitations = useMemo(
    function () {
      return processedData
        .map(function (m) {
          let maxCit = 0;
          if (m.stats) {
            Object.keys(m.stats).forEach((k) => {
              if (
                k.toLowerCase().includes('atıf') ||
                k.toLowerCase().includes('atif') ||
                k.includes('Citation')
              ) {
                let v = parseInt(m.stats[k]) || 0;
                if (v > maxCit) maxCit = v;
              }
            });
          }
          var shortName = (m.fullName || '')
            .replace(/^(Prof\.|Doç\.|Dr\.|Arş\.|Öğr\.|Gör\.|Yrd\.)\s*/gi, '')
            .trim();
          return { label: shortName || m.username, value: maxCit };
        })
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
    [processedData]
  );

  // Yeni Tablo: Top 10 H-Index
  var topHIndex = useMemo(
    function () {
      return processedData
        .map(function (m) {
          let maxH = 0;
          if (m.stats) {
            Object.keys(m.stats).forEach((k) => {
              if (k.toLowerCase().includes('h-index') || k.toLowerCase().includes('h-endeksi')) {
                let v = parseInt(m.stats[k]) || 0;
                if (v > maxH) maxH = v;
              }
            });
          }
          var shortName = (m.fullName || '')
            .replace(/^(Prof\.|Doç\.|Dr\.|Arş\.|Öğr\.|Gör\.|Yrd\.)\s*/gi, '')
            .trim();
          return { label: shortName || m.username, value: maxH };
        })
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
    [processedData]
  );

  var periodButtons = [
    { val: 3, label: '3 Ay' },
    { val: 6, label: '6 Ay' },
    { val: 9, label: '9 Ay' },
    { val: 12, label: '12 Ay' },
  ];

  if (loading) {
    return React.createElement(
      'div',
      { style: { textAlign: 'center', padding: 60, color: COLORS.textLight } },
      React.createElement('div', { style: { fontSize: 14 } }, 'Metrikler yükleniyor...')
    );
  }

  if (!metricsData || metricsData.length === 0) {
    return React.createElement(
      Card,
      null,
      React.createElement(
        'div',
        { style: { textAlign: 'center', padding: 40 } },
        React.createElement(
          'div',
          { style: { fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 8 } },
          'Henüz metrik verisi yok'
        ),
        React.createElement(
          'div',
          { style: { fontSize: 13, color: COLORS.textLight } },
          'Akademisyen ekleyerek başlayabilirsiniz.'
        )
      )
    );
  }

  var donutData = [
    { label: 'SCI/SSCI/WoS', value: totals.sci },
    { label: 'Google Scholar', value: totals.scholar },
    { label: 'ÜAK Alan İndeksi', value: totals.uak },
    { label: 'Ulakbim/TR Dizin', value: totals.ulakbim },
    { label: 'Kitap/Bölüm', value: totals.book },
    { label: 'Kongre/Bildiri', value: totals.conference },
  ].filter(function (d) {
    return d.value > 0;
  });

  // ÇAKÜAVİS tarzı renkli metric kartları — 9 kart, büyük rakam beyaz.
  // İlk sayı: ÇAKUAVİS varsa onu, yoksa legacy filtered fallback (eski cache).
  var metricCards = [
    {
      label: 'PROJE',
      value: totals.proje || totals.project2209,
      bg: '#7C3AED',
    },
    {
      label: 'MAKALE (YÖKSİS)',
      value: totals.yoksisArticle || totals.sci + totals.uak + totals.ulakbim,
      bg: '#D97706',
    },
    {
      label: 'MAKALE (SCHOLAR)',
      value: totals.scholarArticle || totals.scholar,
      bg: '#0EA5E9',
    },
    {
      label: 'MAKALE (WOS)',
      value: totals.wosArticle || totals.sci,
      bg: '#2563EB',
    },
    {
      label: 'BİLDİRİ',
      value: totals.bildiri || totals.conference,
      bg: '#DB2777',
    },
    {
      label: 'KİTAP',
      value: totals.kitap || totals.book,
      bg: '#16A34A',
    },
    {
      label: 'PATENT',
      value: totals.patent,
      bg: '#CA8A04',
    },
    {
      label: 'TEZ',
      value: totals.tez,
      bg: '#14B8A6',
    },
    {
      label: 'ATIF (WOS)',
      value: totals.wosCitations,
      bg: '#DC2626',
    },
  ];

  return React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: 16 } },

    // Üst Kontroller: Dönem seçimi + XLSX export
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', gap: 4, background: COLORS.bg, borderRadius: 8, padding: 3 } },
        periodButtons.map(function (pb) {
          var isActive = period === pb.val;
          return React.createElement(
            'button',
            {
              key: pb.val,
              onClick: function () {
                setPeriod(pb.val);
              },
              style: {
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: isActive ? COLORS.accent : 'transparent',
                color: isActive ? '#fff' : COLORS.textLight,
                transition: 'all 0.15s',
              },
            },
            pb.label
          );
        })
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', gap: 8 } },
        React.createElement(
          'button',
          {
            onClick: handleRefresh,
            disabled: refreshing,
            style: {
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 600,
              background: refreshing ? COLORS.textLight : COLORS.accent,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: refreshing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: refreshing ? 0.7 : 1,
            },
          },
          React.createElement(
            'svg',
            {
              width: 14,
              height: 14,
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 2,
              style: refreshing ? { animation: 'loginSpin 1s linear infinite' } : {},
            },
            React.createElement('path', { d: 'M23 4v6h-6' }),
            React.createElement('path', { d: 'M1 20v-6h6' }),
            React.createElement('path', {
              d: 'M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
            })
          ),
          refreshing ? 'Yenileniyor...' : 'Verileri Yenile'
        ),
        React.createElement(
          'button',
          {
            onClick: function () {
              generateXLSX(processedData, period + '_ay');
            },
            style: {
              padding: '8px 18px',
              fontSize: 12,
              fontWeight: 600,
              background: '#059669',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            },
          },
          React.createElement(
            'svg',
            {
              width: 14,
              height: 14,
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 2,
            },
            React.createElement('path', { d: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4' }),
            React.createElement('polyline', { points: '7 10 12 15 17 10' }),
            React.createElement('line', { x1: 12, y1: 15, x2: 12, y2: 3 })
          ),
          'Excel İndir'
        )
      )
    ),

    // Özet Metrik Kartları — ÇAKÜAVİS tarzı renkli büyük kutucuklar
    React.createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 14,
        },
      },
      metricCards.map(function (mc, i) {
        return React.createElement(
          'div',
          {
            key: i,
            style: {
              background: mc.bg,
              borderRadius: 14,
              padding: '20px 18px 18px',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 110,
              position: 'relative',
              overflow: 'hidden',
            },
          },
          // Hafif dekor (sağ üst köşede saydam daire — ÇAKÜAVİS dokusu)
          React.createElement('div', {
            style: {
              position: 'absolute',
              top: -20,
              right: -20,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            },
          }),
          React.createElement(
            'div',
            {
              style: {
                fontSize: 38,
                fontWeight: 900,
                color: '#fff',
                lineHeight: 1,
                letterSpacing: '-0.02em',
                zIndex: 1,
              },
            },
            String(mc.value)
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.92)',
                marginTop: 10,
                letterSpacing: '0.08em',
                textAlign: 'center',
                zIndex: 1,
              },
            },
            mc.label
          )
        );
      })
    ),

    // Grafikler Grid
    React.createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
        },
      },

      // Sol: Donut Chart - Yayın Dağılımı
      React.createElement(
        'div',
        {
          style: {
            background: COLORS.cardBg,
            borderRadius: 12,
            padding: 20,
            border: '1px solid ' + COLORS.border,
          },
        },
        React.createElement(
          'div',
          { style: { fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 12 } },
          'Yayın Türü Dağılımı'
        ),
        React.createElement(DonutChart, { data: donutData, size: 200, title: 'Yayın' })
      ),

      // Sağ: Trend Chart - Yıllara Göre
      React.createElement(
        'div',
        {
          style: {
            background: COLORS.cardBg,
            borderRadius: 12,
            padding: 20,
            border: '1px solid ' + COLORS.border,
          },
        },
        React.createElement(
          'div',
          { style: { fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 12 } },
          'Yıllara Göre Yayın Trendi'
        ),
        yearlyTrend.length >= 2
          ? React.createElement(
              'div',
              { style: { width: '100%', overflowX: 'auto' } },
              React.createElement(TrendChart, {
                data: yearlyTrend,
                width: 400,
                height: 200,
                lineColor: COLORS.accent,
              })
            )
          : React.createElement(
              'div',
              {
                style: { textAlign: 'center', padding: 40, color: COLORS.textLight, fontSize: 12 },
              },
              'Yeterli yıl verisi yok'
            )
      )
    ),

    // Grafikler Grid Alt Satır (YENI)
    React.createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
          marginTop: 16,
        },
      },
      topAuthors.length > 0 &&
        React.createElement(
          'div',
          {
            style: {
              background: COLORS.cardBg,
              borderRadius: 12,
              padding: 20,
              border: '1px solid ' + COLORS.border,
            },
          },
          React.createElement(
            'div',
            { style: { fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 12 } },
            'En Çok Yayın Yapanlar'
          ),
          React.createElement(
            'div',
            { style: { width: '100%', overflowX: 'auto' } },
            React.createElement(HBarChart, {
              data: topAuthors,
              width: 400,
              height: topAuthors.length * 32 + 20,
              barColor: '#2563EB',
            })
          )
        ),

      topCitations.length > 0 &&
        React.createElement(
          'div',
          {
            style: {
              background: COLORS.cardBg,
              borderRadius: 12,
              padding: 20,
              border: '1px solid ' + COLORS.border,
            },
          },
          React.createElement(
            'div',
            { style: { fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 12 } },
            'En Çok Atıf Alanlar'
          ),
          React.createElement(
            'div',
            { style: { width: '100%', overflowX: 'auto' } },
            React.createElement(HBarChart, {
              data: topCitations,
              width: 400,
              height: topCitations.length * 32 + 20,
              barColor: '#0891B2',
            })
          )
        ),

      topHIndex.length > 0 &&
        React.createElement(
          'div',
          {
            style: {
              background: COLORS.cardBg,
              borderRadius: 12,
              padding: 20,
              border: '1px solid ' + COLORS.border,
            },
          },
          React.createElement(
            'div',
            { style: { fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 12 } },
            'En Yüksek H-Index'
          ),
          React.createElement(
            'div',
            { style: { width: '100%', overflowX: 'auto' } },
            React.createElement(HBarChart, {
              data: topHIndex,
              width: 400,
              height: topHIndex.length * 32 + 20,
              barColor: '#059669',
            })
          )
        )
    ),

    // Akademisyen Detay Tablosu
    React.createElement(
      'div',
      {
        style: {
          background: COLORS.cardBg,
          borderRadius: 12,
          padding: 20,
          border: '1px solid ' + COLORS.border,
          overflow: 'auto',
        },
      },
      React.createElement(
        'div',
        { style: { fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 12 } },
        'Akademisyen Bazlı Yayın Detayı'
      ),
      React.createElement(
        'table',
        { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
        React.createElement(
          'thead',
          null,
          React.createElement(
            'tr',
            { style: { borderBottom: '2px solid ' + COLORS.border } },
            [
              'Akademisyen',
              'SCI/SSCI/AHCI',
              'ÜAK',
              'Ulakbim',
              'Kitap',
              'Bildiri',
              'Diğer',
              'Toplam',
              '2209',
            ].map(function (h, i) {
              return React.createElement(
                'th',
                {
                  key: i,
                  style: {
                    padding: '8px 6px',
                    textAlign: i === 0 ? 'left' : 'center',
                    color: COLORS.text,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    fontSize: 11,
                  },
                },
                h
              );
            })
          )
        ),
        React.createElement(
          'tbody',
          null,
          processedData
            .map(function (m) {
              var total =
                (m.filtered.sci || 0) +
                (m.filtered.uak || 0) +
                (m.filtered.ulakbim || 0) +
                (m.filtered.book || 0) +
                (m.filtered.conference || 0) +
                (m.filtered.scholar || 0);
              return Object.assign({}, m, { totalPub: total });
            })
            .sort(function (a, b) {
              return b.totalPub - a.totalPub;
            })
            .map(function (m, i) {
              var shortName = (m.fullName || '')
                .replace(/^(Prof\.|Doç\.|Dr\.|Arş\.|Öğr\.|Gör\.|Yrd\.)\s*/gi, '')
                .trim();
              return React.createElement(
                'tr',
                {
                  key: i,
                  style: {
                    borderBottom: '1px solid ' + COLORS.border,
                    background: i % 2 === 0 ? 'transparent' : COLORS.bg,
                  },
                },
                React.createElement(
                  'td',
                  {
                    style: {
                      padding: '7px 6px',
                      fontWeight: 500,
                      color: COLORS.text,
                      maxWidth: 160,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  },
                  shortName || m.username
                ),
                [
                  m.filtered.sci,
                  m.filtered.uak,
                  m.filtered.ulakbim,
                  m.filtered.book,
                  m.filtered.conference,
                  m.filtered.scholar,
                  m.totalPub,
                  m.project2209Count || 0,
                ].map(function (v, j) {
                  return React.createElement(
                    'td',
                    {
                      key: j,
                      style: {
                        padding: '7px 6px',
                        textAlign: 'center',
                        color: v > 0 ? COLORS.text : COLORS.textLight,
                        fontWeight: v > 0 ? 600 : 400,
                      },
                    },
                    v || 0
                  );
                })
              );
            })
        )
      )
    ),

    // Akademisyen sayısı bilgisi
    React.createElement(
      'div',
      { style: { fontSize: 11, color: COLORS.textLight, textAlign: 'right', padding: '0 4px' } },
      processedData.length +
        ' akademisyen · Son ' +
        period +
        ' ay · ' +
        new Date().toLocaleDateString('tr-TR')
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
  var [newUsername, setNewUsername] = useState('');
  var [searchTerm, setSearchTerm] = useState('');
  var [viewMode, setViewMode] = useState('list'); // "list" | "analytics"

  // Sadece üniversite yetkilisi tüm fakülteleri/bölümleri görür.
  // Fakülte yetkilisi ve bölüm yetkilisi yalnızca aktif bölümün akademisyenlerini görür
  // (kendi bölümünden farklı bir fakülte veya bölümün akademisyen bilgilerine erişemez).
  var isUniversityAdmin = !!(currentUser && currentUser.isUniversityAdmin);
  var isFacultyManager = !!(currentUser && currentUser.isFacultyManager);
  var isDeptManagerFlag = !!(
    currentUser &&
    (currentUser.isDeptManager || currentUser.role === 'bolum_yetkilisi')
  );
  var isAdmin = isUniversityAdmin; // sadece üniversite yetkilisi "tümünü gör" yetkisine sahip
  var isDeptManager = isDeptManagerFlag;
  var canManage = isUniversityAdmin || isFacultyManager || isDeptManagerFlag;
  var deptId = activeDepartment || (currentUser && currentUser.departmentId) || null;

  // Akademisyen listesini yükle (bölüm bazlı)
  var loadProfessors = useCallback(
    function () {
      setLoading(true);
      var token = localStorage.getItem('caku_auth_token');
      var headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;

      var url = '/api/akademisyen';
      // Admin hepsini görür, diğerleri sadece kendi bölümünü
      if (!isAdmin && deptId) {
        url += '?departmentId=' + encodeURIComponent(deptId);
      }

      fetch(url, { headers: headers })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (Array.isArray(data)) {
            setProfessors(data);
          }
          setLoading(false);
        })
        .catch(function () {
          setLoading(false);
        });
    },
    [isAdmin, deptId]
  );

  useEffect(
    function () {
      loadProfessors();
    },
    [loadProfessors]
  );

  // Akademisyen detayını yükle
  var loadDetail = useCallback(function (username) {
    setLoading(true);
    var token = localStorage.getItem('caku_auth_token');
    var headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    fetch('/api/akademisyen/' + encodeURIComponent(username), { headers: headers })
      .then(function (r) {
        if (!r.ok) {
          return r.json().then(function (err) {
            throw new Error(err.error || 'Akademisyen bulunamadı');
          });
        }
        return r.json();
      })
      .then(function (data) {
        if (data.error) {
          throw new Error(data.error);
        }
        setProfDetail(data);
        setLoading(false);
      })
      .catch(function (err) {
        alert('Akademisyen bilgisi alınamadı: ' + err.message);
        setSelectedProf(null);
        setProfDetail(null);
        setLoading(false);
      });
  }, []);

  // Akademisyen seç
  var handleSelect = function (prof) {
    setSelectedProf(prof);
    loadDetail(prof.username);
  };

  // Yeni akademisyen ekle (bölüme atayarak)
  var handleAdd = function () {
    if (!newUsername.trim()) return alert('ÇAKUAVİS kullanıcı adı gerekli');
    // Boşlukları sil, küçük harf yap (kullanıcı "taha etem" yazsa "tahaetem" olsun)
    var username = newUsername
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .replace(/\s+/g, '')
      .toLocaleLowerCase('tr')
      .replace(/ı/g, 'i')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .trim();
    if (!username) return alert('Geçerli bir kullanıcı adı girin');
    var assignDeptId = deptId;
    setAddModal(false);
    setNewUsername('');
    setLoading(true);
    // Direkt detay yükle (departmentId ile cache'e kaydedilecek)
    setSelectedProf({ username: username });
    var token = localStorage.getItem('caku_auth_token');
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    // Önce bilgileri çek
    fetch(
      '/api/akademisyen/' +
        encodeURIComponent(username) +
        (assignDeptId ? '?departmentId=' + encodeURIComponent(assignDeptId) : ''),
      { headers: headers }
    )
      .then(function (r) {
        if (!r.ok) {
          return r.json().then(function (err) {
            throw new Error(err.error || 'Akademisyen bulunamadı');
          });
        }
        return r.json();
      })
      .then(function (data) {
        if (data.error || data.notFound) {
          throw new Error(data.error || 'Akademisyen bulunamadı');
        }
        setProfDetail(data);
        setLoading(false);
        // Listeyi güncelle
        setTimeout(loadProfessors, 1000);
      })
      .catch(function (err) {
        alert('Akademisyen bilgisi alınamadı: ' + err.message);
        setSelectedProf(null);
        setProfDetail(null);
        setLoading(false);
      });
  };

  // Akademisyeni sil
  var handleDelete = function (prof) {
    if (!confirm((prof.fullName || prof.username) + ' akademisyeni listeden kaldırılsın mı?'))
      return;
    var token = localStorage.getItem('caku_auth_token');
    var headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    // İyimser güncelleme: response beklenmeden karttan kaldır.
    setProfessors(function (prev) {
      return prev.filter(function (x) {
        return x.username !== prof.username;
      });
    });
    fetch('/api/akademisyen/' + encodeURIComponent(prof.username), {
      method: 'DELETE',
      headers: headers,
    })
      .then(function (r) {
        if (!r.ok) {
          return r
            .json()
            .catch(function () {
              return {};
            })
            .then(function (j) {
              throw new Error(j.error || 'HTTP ' + r.status);
            });
        }
        // Başarılı — listeyi server'dan tazele (silinen gerçekten gitti mi).
        loadProfessors();
      })
      .catch(function (err) {
        alert('Silinemedi: ' + err.message);
        // Hatadaysa geri yükle
        loadProfessors();
      });
  };

  // Filtreleme
  var filtered = professors.filter(function (p) {
    if (!searchTerm) return true;
    var term = searchTerm.toLowerCase();
    return (
      (p.fullName || '').toLowerCase().indexOf(term) >= 0 ||
      (p.username || '').toLowerCase().indexOf(term) >= 0 ||
      (p.email || '').toLowerCase().indexOf(term) >= 0
    );
  });

  // Detay görünümü
  if (selectedProf && profDetail) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <AcademicianDetail
          data={profDetail}
          onBack={function () {
            setSelectedProf(null);
            setProfDetail(null);
          }}
        />
      </div>
    );
  }

  // Liste görünümü
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Başlık */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, margin: 0 }}>
            Akademisyen Bilgi Sistemi
          </h2>
          <p style={{ fontSize: 13, color: COLORS.textLight, margin: '4px 0 0 0' }}>
            ÇAKUAVİS entegrasyonu ile akademisyen profilleri
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {canManage && viewMode === 'list' && filtered.length > 0 && (
            <a
              href={
                '/api/akademisyen/export.csv' +
                (deptId ? '?departmentId=' + encodeURIComponent(deptId) : '')
              }
              style={{
                padding: '8px 14px',
                border: '1px solid #16A34A',
                background: 'white',
                color: '#15803D',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="Aktif bölümün akademisyenlerini Excel uyumlu CSV olarak indir"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Excel İndir
            </a>
          )}
          {canManage && viewMode === 'list' && (
            <Btn
              onClick={function () {
                setAddModal(true);
              }}
            >
              + Akademisyen Ekle
            </Btn>
          )}
        </div>
      </div>

      {/* Görünüm Sekmeleri */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          marginBottom: 16,
          borderBottom: '2px solid ' + COLORS.border,
        }}
      >
        {[
          { key: 'list', label: 'Akademisyenler' },
          { key: 'analytics', label: 'Analitik Dashboard' },
        ].map(function (tab) {
          var isActive = viewMode === tab.key;
          return React.createElement(
            'button',
            {
              key: tab.key,
              onClick: function () {
                setViewMode(tab.key);
              },
              style: {
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                border: 'none',
                borderBottom: isActive ? '2px solid ' + COLORS.accent : '2px solid transparent',
                marginBottom: -2,
                cursor: 'pointer',
                background: 'transparent',
                color: isActive ? COLORS.accent : COLORS.textLight,
                transition: 'all 0.15s',
              },
            },
            tab.label
          );
        })}
      </div>

      {/* Analitik Dashboard Görünümü */}
      {viewMode === 'analytics' &&
        React.createElement(AnalyticsDashboard, { deptId: deptId, isAdmin: isAdmin })}

      {/* Arama - sadece liste görünümünde */}
      {viewMode === 'list' &&
        React.createElement(
          'div',
          {
            style: {
              marginBottom: 24,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
          },
          React.createElement(
            'div',
            { style: { position: 'relative', flex: 1, maxWidth: 400 } },
            React.createElement(
              'span',
              { style: { position: 'absolute', left: 14, top: 12, color: '#9CA3AF' } },
              '🔍'
            ),
            React.createElement('input', {
              placeholder: 'Akademisyen ara... (Ad, Unvan, Email)',
              value: searchTerm,
              onChange: function (e) {
                setSearchTerm(e.target.value);
              },
              style: {
                width: '100%',
                padding: '12px 16px 12px 40px',
                borderRadius: 12,
                border: '1px solid #E5E7EB',
                background: '#FFFFFF',
                fontSize: 14,
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                outline: 'none',
                transition: 'all 0.2s',
              },
              onFocus: (e) => (e.target.style.borderColor = '#3B82F6'),
              onBlur: (e) => (e.target.style.borderColor = '#E5E7EB'),
            })
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: 13,
                color: '#6B7280',
                background: '#F3F4F6',
                padding: '8px 12px',
                borderRadius: 8,
                fontWeight: 500,
              },
            },
            <>
              <strong style={{ color: '#111827' }}>{filtered.length}</strong> akademisyen
              listeleniyor
            </>
          )
        )}

      {/* Loading */}
      {viewMode === 'list' && loading && !selectedProf && (
        <div style={{ textAlign: 'center', padding: 40, color: COLORS.textLight }}>
          Yükleniyor...
        </div>
      )}

      {/* Liste */}
      {viewMode === 'list' && !loading && filtered.length === 0 ? (
        <div
          style={{
            background: 'linear-gradient(135deg, #FFFFFF, #F9FAFB)',
            border: '1px dashed #CBD5E1',
            borderRadius: 24,
            padding: '60px 40px',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16, animation: 'bounce 2s infinite' }}>👨‍🏫</div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#111827',
              marginBottom: 8,
              letterSpacing: -0.5,
            }}
          >
            Henüz akademisyen bulunamadı.
          </div>
          <div
            style={{
              fontSize: 14,
              color: '#6B7280',
              marginBottom: 24,
              maxWidth: 400,
              margin: '0 auto 24px auto',
              lineHeight: 1.5,
            }}
          >
            Belirlediğiniz arama kriterlerine uyan bir kişi bulunmadı ya da sisteme henüz kimseyi
            kaydetmediniz. ÇAKUAVİS hesabı bulunan birini anında dahil edebilirsiniz.
          </div>
          {canManage && (
            <Btn
              onClick={function () {
                setAddModal(true);
              }}
              style={{ padding: '12px 24px', fontSize: 14, borderRadius: 12 }}
            >
              + Akademisyen Ekle & Verilerini Çek
            </Btn>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 12,
          }}
        >
          {filtered.map(function (prof) {
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
        <Modal
          open={true}
          title="Akademisyen Ekle"
          onClose={function () {
            setAddModal(false);
          }}
          width={450}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="ÇAKUAVİS Kullanıcı Adı">
              <Input
                value={newUsername}
                onChange={function (e) {
                  setNewUsername(e.target.value);
                }}
                placeholder="Örn: aliegi, ksenturk"
              />
              <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 4 }}>
                cakuavis.karatekin.edu.tr/
                <strong>
                  {newUsername
                    ? newUsername
                        .replace(/İ/g, 'i')
                        .replace(/I/g, 'ı')
                        .replace(/\s+/g, '')
                        .toLocaleLowerCase('tr')
                        .replace(/ı/g, 'i')
                        .replace(/ü/g, 'u')
                        .replace(/ö/g, 'o')
                        .replace(/ş/g, 's')
                        .replace(/ç/g, 'c')
                        .replace(/ğ/g, 'g')
                        .trim()
                    : 'kullaniciadi'}
                </strong>{' '}
                adresindeki kullanıcı adı
              </div>
              <div style={{ fontSize: 11, color: COLORS.warning, marginTop: 2 }}>
                Ad soyad girerseniz otomatik olarak boşluklar silinir (ör: "taha etem" → "tahaetem")
              </div>
            </FormField>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <GhostBtn
                onClick={function () {
                  setAddModal(false);
                }}
              >
                İptal
              </GhostBtn>
              <Btn onClick={handleAdd}>Ekle ve Bilgileri Çek</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

window.AkademisyenModuluApp = AkademisyenModuluApp;
