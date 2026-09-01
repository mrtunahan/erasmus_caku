// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Öğrenci Kulüpleri (Toplulukları) Modülü
//   • Tüm roller görür (admin / bolum_yetkilisi / professor / student)
//   • Düzenleme/silme/oluşturma: admin tüm kulüpler için,
//     bolum_yetkilisi yalnızca kendi bölümüne ait kulüpler için.
//   • Logo: yüklenmediyse topluluk adının baş harflerinden renkli avatar.
//   • Dökümanlar sekmesi: yetkililer hem dosya upload eder hem de
//     harici URL ekler (Karatekin sitesindeki dökümanlar için).
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useRef, useCallback } = React;

const KLP = {
  primary: '#1B2A4A',
  accent: '#C4973B',
  accentLight: '#FAF4E8',
  bg: '#FAFAFA',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  green: '#059669',
  greenLight: '#D1FAE5',
  red: '#DC2626',
  redLight: '#FEE2E2',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
};

// Topluluk adına göre deterministik renk paleti (initials avatarı için)
const AVATAR_COLORS = [
  ['#1B2A4A', '#3B5078'],
  ['#7C3AED', '#A78BFA'],
  ['#0EA5E9', '#38BDF8'],
  ['#059669', '#34D399'],
  ['#DC2626', '#F87171'],
  ['#EA580C', '#FB923C'],
  ['#9333EA', '#C084FC'],
  ['#0891B2', '#22D3EE'],
  ['#65A30D', '#A3E635'],
  ['#DB2777', '#F472B6'],
  ['#CA8A04', '#FBBF24'],
  ['#475569', '#94A3B8'],
];
const colorForName = (name) => {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

// Topluluk adından baş harfler (en fazla 3 harf)
const initialsOf = (name) => {
  if (!name) return '?';
  const words = name
    .replace(/Topluluğu|Topluluğ\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (
    words[0][0] +
    (words[1] ? words[1][0] : '') +
    (words[2] ? words[2][0] : '')
  ).toUpperCase();
};

// Akademisyen adı ~ topluluk danışmanı (advisor) adı eşleşmesi.
// Unvan (Prof./Doç./Dr./Öğr. Gör.) ve fazla boşluklardan arındırıp karşılaştırır.
const stripAcademicTitle = (s) =>
  (s || '')
    .replace(/(prof|doç|doc|dr|öğr|ogr|gör|gor|arş|ars|üyesi|uyesi)\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('tr');
const advisorMatchesName = (advisor, name) => {
  const a = stripAcademicTitle(advisor);
  const b = stripAcademicTitle(name);
  if (!a || !b) return false;
  return a === b || a.indexOf(b) >= 0 || b.indexOf(a) >= 0;
};

const KlpIcon = ({ path, size = 18, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={path} />
  </svg>
);

// ══════════════════════════════════════════════════════════════
// LogoAvatar — yuvarlak topluluk logosu (resim varsa onu, yoksa initials)
// ══════════════════════════════════════════════════════════════
function LogoAvatar({ club, size = 96, onClick, editable }) {
  const [g1, g2] = colorForName(club?.name || '');
  const initials = initialsOf(club?.name);
  const [imgFailed, setImgFailed] = useState(false);
  // Logo URL değişince hata bayrağını sıfırla (yeni yükleme sonrası tekrar dene)
  useEffect(() => {
    setImgFailed(false);
  }, [club?.logoURL]);
  const hasLogo = !!club?.logoURL && !imgFailed;
  return (
    <div
      onClick={onClick}
      title={editable ? 'Logoyu değiştir' : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '3px solid white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
        background: hasLogo ? 'white' : `linear-gradient(135deg, ${g1} 0%, ${g2} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: editable ? 'pointer' : 'default',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {hasLogo ? (
        <img
          src={club.logoURL}
          alt={club.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          style={{
            fontSize: size * 0.32,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '0.02em',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {initials}
        </span>
      )}
      {editable && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: '50%',
            background: KLP.accent,
            border: '2px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <KlpIcon
            path="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            size={size * 0.14}
            color="white"
          />
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ClubCard — beşerli grid'te tek kart
// ══════════════════════════════════════════════════════════════
function ClubCard({
  club,
  canEdit,
  onEdit,
  onDelete,
  onLogoChange,
  onOpen,
  followerCount = 0,
  isFollowing = false,
  isStudent = false,
  onToggleFollow,
}) {
  const [hover, setHover] = useState(false);
  const fileInputRef = useRef(null);
  const [g1, g2] = colorForName(club?.name || '');
  const hasLogo = !!club?.logoURL;

  const triggerLogoUpload = () => {
    if (!canEdit) return;
    fileInputRef.current?.click();
  };

  const handleLogoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // aynı dosyayı tekrar seçebilmek için
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      alert('Topluluk logosu yalnızca PNG veya JPEG olabilir.');
      return;
    }
    await onLogoChange(file);
  };

  const stop = (e) => e.stopPropagation();

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onOpen}
      style={{
        background: 'white',
        borderRadius: 16,
        border: `1px solid ${hover ? KLP.accent : KLP.border}`,
        boxShadow: hover ? '0 10px 28px rgba(27,42,74,0.14)' : '0 1px 2px rgba(0,0,0,0.04)',
        transition: 'all 0.2s',
        transform: hover ? 'translateY(-3px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Topluluk resmiyle uyumlu renkli banner (logo bulanık zemin + renk tonu) */}
      <div
        style={{
          position: 'relative',
          height: 74,
          background: `linear-gradient(135deg, ${g1}, ${g2})`,
          overflow: 'hidden',
        }}
      >
        {hasLogo && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url("${club.logoURL}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(7px)',
              transform: 'scale(1.2)',
              opacity: 0.55,
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, ${g1}b0, ${g2}b0)`,
          }}
        />
      </div>

      {canEdit && (
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 }}>
          <button
            onClick={(e) => {
              stop(e);
              onEdit();
            }}
            title="Düzenle"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.6)',
              background: 'rgba(255,255,255,0.9)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <KlpIcon
              path="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              size={13}
              color={KLP.textMuted}
            />
          </button>
          <button
            onClick={(e) => {
              stop(e);
              onDelete();
            }}
            title="Sil"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.6)',
              background: 'rgba(255,255,255,0.9)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <KlpIcon
              path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
              size={13}
              color={KLP.red}
            />
          </button>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: -40,
          marginBottom: 12,
        }}
        onClick={canEdit ? stop : undefined}
      >
        <div style={{ border: '3px solid white', borderRadius: '50%', background: 'white' }}>
          <LogoAvatar club={club} size={72} editable={canEdit} onClick={triggerLogoUpload} />
        </div>
        {canEdit && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            style={{ display: 'none' }}
            onChange={handleLogoFile}
          />
        )}
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: KLP.primary,
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.3,
            minHeight: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {club.name}
        </h3>

        <div style={{ height: 1, background: KLP.border, margin: '10px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Field label="Akademik Danışman" value={club.advisor} />
          <Field label="Başkan" value={club.president} />
          <Field label="Bölüm" value={club.department} />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${KLP.border}`,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: KLP.textMuted,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontWeight: 600,
            }}
          >
            <KlpIcon
              path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              size={13}
              color={KLP.textMuted}
            />
            {followerCount} takipçi
          </span>
          {isStudent && (
            <button
              onClick={(e) => {
                stop(e);
                onToggleFollow && onToggleFollow();
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: isFollowing ? `1px solid ${KLP.green}` : 'none',
                background: isFollowing ? KLP.greenLight : KLP.accent,
                color: isFollowing ? KLP.green : 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {isFollowing ? (
                <>
                  <KlpIcon path="M5 13l4 4L19 7" size={13} color={KLP.green} /> Takiptesin
                </>
              ) : (
                'Takip Et'
              )}
            </button>
          )}
        </div>
      </div>

      {(club.whatsapp || club.instagram) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 10,
            padding: '0 16px 16px',
          }}
        >
          {club.whatsapp && (
            <a
              href={normalizeSocialUrl(club.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              title="WhatsApp"
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              <KlpIcon
                path="M12 2a10 10 0 00-8.6 15.05L2 22l5.1-1.34A10 10 0 1012 2zm0 18a8 8 0 01-4.08-1.12l-.29-.17-3.03.8.81-2.95-.19-.3A8 8 0 1112 20zm4.4-5.98c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.19-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.57.18 1.1.16 1.51.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"
                size={17}
                color="white"
              />
            </a>
          )}
          {club.instagram && (
            <a
              href={normalizeSocialUrl(club.instagram)}
              target="_blank"
              rel="noopener noreferrer"
              title="Instagram"
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              <KlpIcon
                path="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 01-1.38-.9 3.7 3.7 0 01-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.12 1.38C1.36 2.67.95 3.34.63 4.13.33 4.9.13 5.77.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.28.26 2.15.56 2.92.31.79.72 1.46 1.38 2.12.66.66 1.33 1.07 2.12 1.38.77.3 1.64.5 2.92.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.28-.06 2.15-.26 2.92-.56a5.7 5.7 0 002.12-1.38 5.7 5.7 0 001.38-2.12c.3-.77.5-1.64.56-2.92.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.26-2.15-.56-2.92a5.7 5.7 0 00-1.38-2.12A5.7 5.7 0 0019.87.63c-.77-.3-1.64-.5-2.92-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1018.16 12 6.16 6.16 0 0012 5.84zM12 16a4 4 0 114-4 4 4 0 01-4 4zm6.41-10.85a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z"
                size={17}
                color="white"
              />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// Sosyal medya bağlantısını normalize et — http(s) eksikse ekle
function normalizeSocialUrl(url) {
  const u = (url || '').trim();
  if (!u) return '#';
  if (/^https?:\/\//i.test(u)) return u;
  return 'https://' + u;
}

const Field = ({ label, value }) => (
  <div style={{ fontSize: 11.5, lineHeight: 1.4 }}>
    <div
      style={{
        color: KLP.textMuted,
        fontWeight: 600,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </div>
    <div style={{ color: KLP.text, marginTop: 2, wordBreak: 'break-word' }}>{value || '—'}</div>
  </div>
);

// ══════════════════════════════════════════════════════════════
// SearchSelect — arama özellikli açılır liste (serbest metne de izin verir)
//   options: [{ label, sub }]; value = seçilen/yazılan metin
// ══════════════════════════════════════════════════════════════
function SearchSelect({ value, onChange, options, placeholder, disabled, emptyHint }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const q = (value || '').trim().toLocaleLowerCase('tr');
  const filtered = useMemo(() => {
    if (!q) return options.slice(0, 60);
    return options
      .filter(
        (o) =>
          o.label.toLocaleLowerCase('tr').includes(q) ||
          (o.sub || '').toLocaleLowerCase('tr').includes(q)
      )
      .slice(0, 60);
  }, [q, options]);

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid ' + KLP.border,
    fontSize: 13,
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
    background: disabled ? '#F3F4F6' : 'white',
    cursor: disabled ? 'not-allowed' : 'text',
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={disabled ? emptyHint || placeholder : placeholder}
        style={inputStyle}
      />
      {open && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'white',
            border: '1px solid ' + KLP.border,
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: KLP.textMuted }}>
              Eşleşme yok — yazdığınız isim olduğu gibi kaydedilir.
            </div>
          ) : (
            filtered.map((o, i) => (
              <div
                key={i}
                onClick={() => {
                  onChange(o.label);
                  setOpen(false);
                }}
                style={{
                  padding: '9px 12px',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: KLP.text,
                  borderBottom: i < filtered.length - 1 ? '1px solid #F3F4F6' : 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = KLP.accentLight)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
              >
                {o.label}
                {o.sub ? (
                  <span style={{ color: KLP.textMuted, fontSize: 11, marginLeft: 6 }}>{o.sub}</span>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ClubForm — Düzenleme/oluşturma modalı
//   • Bölüm: admin → açılır liste (fakültenin bölümleri); bölüm yetkilisi → kilitli
//   • Danışman: seçili bölümün akademisyenleri (arama özellikli)
//   • Başkan: seçili bölümün öğrencileri (arama özellikli)
// ══════════════════════════════════════════════════════════════
function ClubForm({
  initial,
  isAdmin,
  lockedDepartmentId,
  departments,
  professors,
  students,
  onSave,
  onCancel,
}) {
  const [name, setName] = useState(initial?.name || '');
  const [advisor, setAdvisor] = useState(initial?.advisor || '');
  const [president, setPresident] = useState(initial?.president || '');
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp || '');
  const [instagram, setInstagram] = useState(initial?.instagram || '');
  const initialDeptId =
    lockedDepartmentId ||
    initial?.departmentId ||
    (initial?.department ? departments.find((d) => d.name === initial.department)?.id || '' : '');
  const [departmentId, setDepartmentId] = useState(initialDeptId);
  const [saving, setSaving] = useState(false);

  const deptName =
    departments.find((d) => d.id === departmentId)?.name || initial?.department || '';

  // Seçili bölüme göre akademisyen / öğrenci seçenekleri
  const advisorOptions = useMemo(
    () =>
      professors
        .filter((p) => (p.departmentId || '') === departmentId)
        .map((p) => ({ label: (p.name || '').trim(), sub: '' }))
        .filter((o) => o.label),
    [professors, departmentId]
  );
  const presidentOptions = useMemo(
    () =>
      students
        .filter((s) => (s.departmentId || '') === departmentId)
        .map((s) => ({
          label: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
          sub: s.studentNumber || '',
        }))
        .filter((o) => o.label),
    [students, departmentId]
  );

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid ' + KLP.border,
    fontSize: 13,
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
  };

  const submit = async () => {
    if (!name.trim()) {
      alert('Topluluk adı zorunludur.');
      return;
    }
    if (!departmentId) {
      alert('Lütfen bir bölüm seçin.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        advisor: advisor.trim(),
        president: president.trim(),
        department: deptName,
        departmentId,
        whatsapp: whatsapp.trim(),
        instagram: instagram.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 14,
          padding: 24,
          width: '100%',
          maxWidth: 480,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: KLP.primary, margin: '0 0 16px' }}>
          {initial ? 'Topluluğu Düzenle' : 'Yeni Topluluk'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Topluluk Adı *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              placeholder="Örn: Karatekin Travel Topluluğu"
              autoFocus
            />
          </FormField>
          <FormField label={lockedDepartmentId ? 'Bölüm (otomatik)' : 'Bölüm *'}>
            {isAdmin && !lockedDepartmentId ? (
              <select
                value={departmentId}
                onChange={(e) => {
                  // Bölüm değişince eski bölümden seçilen danışman/başkan'ı temizle
                  setDepartmentId(e.target.value);
                  setAdvisor('');
                  setPresident('');
                }}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Bölüm seçin…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={deptName}
                disabled
                style={{ ...inputStyle, background: '#F3F4F6' }}
                placeholder="Bölümünüz"
              />
            )}
          </FormField>
          <FormField label="Akademik Danışman">
            <SearchSelect
              value={advisor}
              onChange={setAdvisor}
              options={advisorOptions}
              disabled={!departmentId}
              placeholder={
                advisorOptions.length
                  ? 'Akademisyen ara veya seç…'
                  : 'Bu bölümde kayıtlı akademisyen yok — isim yazabilirsiniz'
              }
              emptyHint="Önce bölüm seçin"
            />
          </FormField>
          <FormField label="Topluluk Başkanı">
            <SearchSelect
              value={president}
              onChange={setPresident}
              options={presidentOptions}
              disabled={!departmentId}
              placeholder={
                presidentOptions.length
                  ? 'Öğrenci ara veya seç…'
                  : 'Bu bölümde kayıtlı öğrenci yok — isim yazabilirsiniz'
              }
              emptyHint="Önce bölüm seçin"
            />
          </FormField>
          <FormField label="WhatsApp Bağlantısı">
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              style={inputStyle}
              placeholder="https://chat.whatsapp.com/…"
            />
          </FormField>
          <FormField label="Instagram Bağlantısı">
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              style={inputStyle}
              placeholder="https://instagram.com/…"
            />
          </FormField>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: '1px solid ' + KLP.border,
              background: 'white',
              color: KLP.text,
              fontWeight: 500,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            İptal
          </button>
          <button
            onClick={submit}
            disabled={saving}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: 'none',
              background: KLP.primary,
              color: 'white',
              fontWeight: 600,
              fontSize: 13,
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

const FormField = ({ label, children }) => (
  <div>
    <label
      style={{
        display: 'block',
        fontSize: 11,
        fontWeight: 600,
        color: KLP.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: 5,
      }}
    >
      {label}
    </label>
    {children}
  </div>
);

// ══════════════════════════════════════════════════════════════
// ÜÇ PANO — DUYURULAR · ETKİNLİKLER · HIZLI ERİŞİM
//
// Modülün girişi topluluk kartlarından ibaretti: hangi toplulukta ne
// olduğunu görmek için kartlara tek tek girmek gerekiyordu. Oysa öğrencinin
// aradığı şey topluluk değil, o toplulukların ÜRETTİĞİ şey — duyuru,
// etkinlik, belge.
//
// Düzen üniversitenin SKS sayfasıyla aynı dili konuşur: solda duyurular,
// ortada etkinlikler, sağda hızlı erişim. Renkler uygulamanın kendi
// paletinden; site kopyalanmıyor, düzeni örnek alınıyor.
// ══════════════════════════════════════════════════════════════
const klpPano = {
  background: KLP.card,
  border: `1px solid ${KLP.border}`,
  borderRadius: 12,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

const klpPanoBaslik = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  padding: '12px 14px',
  borderBottom: `1px solid ${KLP.border}`,
  flexWrap: 'wrap',
};

function PanoBaslik({ ikon, ad, renk, sag }) {
  return (
    <div style={klpPanoBaslik}>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          background: renk + '18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <KlpIcon path={ikon} size={15} color={renk} />
      </span>
      <span style={{ fontSize: 14.5, fontWeight: 700, color: KLP.primary }}>{ad}</span>
      {sag && <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>{sag}</div>}
    </div>
  );
}

const klpBosPano = {
  padding: '22px 14px',
  textAlign: 'center',
  color: KLP.textMuted,
  fontSize: 12.5,
};

/** Duyuru panosu — bütün toplulukların son duyuruları. */
function DuyuruPanosu({ gonderiler, kulupAdi, onAc }) {
  const liste = (gonderiler || []).filter((p) => (p.type || 'duyuru') === 'duyuru').slice(0, 6);
  return (
    <section style={klpPano}>
      <PanoBaslik
        ikon="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
        ad="Duyurular"
        renk={KLP.blue}
      />
      {liste.length === 0 ? (
        <div style={klpBosPano}>Henüz duyuru paylaşılmadı.</div>
      ) : (
        <div style={{ padding: '6px 0' }}>
          {liste.map((p) => {
            const duz = window.zenginDuzMetin ? window.zenginDuzMetin(p.content || '') : '';
            const baslik = (duz.split('\n').find((x) => x.trim()) || '').trim();
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onAc(p)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  gap: 10,
                  padding: '9px 14px',
                  border: 'none',
                  borderTop: `1px solid ${KLP.border}`,
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: KLP.blue,
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 11,
                      color: KLP.textMuted,
                      marginBottom: 2,
                    }}
                  >
                    {fmtFeedDate(p.createdAt)} · {kulupAdi(p)}
                  </span>
                  <span
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: KLP.text,
                      lineHeight: 1.4,
                    }}
                  >
                    {baslik || (p.files || []).length + ' dosya paylaşıldı'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Etkinlik panosu — en yakın tarih başta (bkz. lib/kulup-gonderi.js). */
function EtkinlikPanosu({ gonderiler, kulupAdi, onAc }) {
  const liste = window.kulupYaklasanEtkinlikler
    ? window.kulupYaklasanEtkinlikler(gonderiler, new Date(), 6)
    : [];
  return (
    <section style={klpPano}>
      <PanoBaslik
        ikon="M8 7V3m8 4V3M3 11h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
        ad="Etkinlikler"
        renk={KLP.green}
      />
      {liste.length === 0 ? (
        <div style={klpBosPano}>Yaklaşan etkinlik yok.</div>
      ) : (
        <div style={{ padding: '6px 0' }}>
          {liste.map((p) => {
            const bas = window.kulupEtkinlikBaslangici(p.etkinlik);
            const e = window.kulupEtkinlikNormalle(p.etkinlik);
            const bugun = window.kulupEtkinlikDurumu(p.etkinlik, new Date()) === 'bugun';
            const duz = window.zenginDuzMetin ? window.zenginDuzMetin(p.content || '') : '';
            const baslik = (duz.split('\n').find((x) => x.trim()) || '').trim();
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onAc(p)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  padding: '9px 14px',
                  border: 'none',
                  borderTop: `1px solid ${KLP.border}`,
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: 42,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: `1px solid ${bugun ? '#A7F3D0' : KLP.border}`,
                    textAlign: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      background: bugun ? KLP.green : KLP.textMuted,
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '2px 0',
                    }}
                  >
                    {AY_KISA[bas.getMonth()]}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 16,
                      fontWeight: 800,
                      color: KLP.text,
                      lineHeight: 1.3,
                    }}
                  >
                    {bas.getDate()}
                  </span>
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: KLP.text,
                      lineHeight: 1.4,
                    }}
                  >
                    {baslik || 'Etkinlik'}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: KLP.textMuted }}>
                    {[e.baslangic, e.yer, kulupAdi(p)].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// HIZLI ERİŞİM (dökümanlar)
//
// Belgeler daha önce ekranın enini kaplayan bir kutuda, hepsi aynı gri
// satırda duruyordu: yönetmelik ile başvuru formu arasındaki fark ancak
// başlık okunarak anlaşılıyordu. Artık dosya/bağlantı ayrımı ikonla ve
// biçimle görünür, arama kutusu uzun listeyi taranabilir kılar.
// ══════════════════════════════════════════════════════════════
const BELGE_IKON = {
  pdf: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  link: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  dosya:
    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
};

function belgeUzantisi(d) {
  const kaynak = String((d && (d.fileName || d.url || d.title)) || '');
  const m = kaynak.split('?')[0].match(/\.([a-zA-Z0-9]{1,5})$/);
  return m ? m[1].toLowerCase() : '';
}

function DocumentsPanel({ documents, canEdit, onUpload, onAddLink, onDelete }) {
  const fileInputRef = useRef(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [ara, setAra] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
    }
  };

  const submitLink = async () => {
    if (!linkTitle.trim() || !linkUrl.trim()) {
      alert('Başlık ve URL zorunludur.');
      return;
    }
    try {
      const u = new URL(linkUrl.trim());
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    } catch {
      alert('Geçerli bir URL girin (http/https).');
      return;
    }
    await onAddLink({ title: linkTitle.trim(), url: linkUrl.trim() });
    setLinkTitle('');
    setLinkUrl('');
    setLinkMode(false);
  };

  const q = ara.trim().toLocaleLowerCase('tr');
  const suzulmus = q
    ? (documents || []).filter((d) =>
        String(d.title || '')
          .toLocaleLowerCase('tr')
          .includes(q)
      )
    : documents || [];

  const kucukBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    borderRadius: 7,
    border: `1px solid ${KLP.border}`,
    background: '#fff',
    color: KLP.primary,
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
  };

  return (
    <section style={klpPano}>
      <PanoBaslik
        ikon="M13 10V3L4 14h7v7l9-11h-7z"
        ad="Hızlı Erişim"
        renk={KLP.accent}
        sag={
          canEdit ? (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ ...kucukBtn, cursor: uploading ? 'wait' : 'pointer' }}
                title="Belge yükle"
              >
                <KlpIcon
                  path="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                  size={13}
                />
                {uploading ? 'Yükleniyor…' : 'Belge'}
              </button>
              <button
                onClick={() => setLinkMode(!linkMode)}
                style={{ ...kucukBtn, background: linkMode ? KLP.accentLight : '#fff' }}
                title="Bağlantı ekle"
              >
                <KlpIcon path={BELGE_IKON.link} size={13} />
                Bağlantı
              </button>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFile}
              />
            </>
          ) : null
        }
      />

      {canEdit && linkMode && (
        <div
          style={{
            display: 'flex',
            gap: 7,
            padding: '10px 14px',
            borderBottom: `1px solid ${KLP.border}`,
            flexWrap: 'wrap',
            background: '#FCFCFD',
          }}
        >
          <input
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            placeholder="Belge başlığı"
            style={{ ...klpGiris, flex: '1 1 140px', width: 'auto' }}
          />
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://…"
            style={{ ...klpGiris, flex: '2 1 200px', width: 'auto' }}
          />
          <button
            onClick={submitLink}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: KLP.primary,
              color: '#fff',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ekle
          </button>
        </div>
      )}

      {/* Arama yalnız liste uzunken görünür: üç belgede arama kutusu
          yer kaplamaktan başka bir şey yapmıyor. */}
      {(documents || []).length > 6 && (
        <div style={{ padding: '10px 14px 0' }}>
          <input
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Belge ara…"
            style={klpGiris}
          />
        </div>
      )}

      {suzulmus.length === 0 ? (
        <div style={klpBosPano}>
          {(documents || []).length === 0 ? 'Henüz belge eklenmedi.' : 'Aramaya uyan belge yok.'}
        </div>
      ) : (
        <div
          style={{
            padding: 10,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 8,
            alignContent: 'start',
          }}
        >
          {suzulmus.map((d) => {
            const bag = d.kind === 'link';
            const uz = belgeUzantisi(d);
            return (
              <div
                key={d.id}
                style={{
                  position: 'relative',
                  border: `1px solid ${KLP.border}`,
                  borderRadius: 10,
                  background: '#fff',
                }}
              >
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={d.title}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: '10px 11px',
                    textDecoration: 'none',
                    color: KLP.text,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.05em',
                      color: bag ? KLP.blue : KLP.accent,
                    }}
                  >
                    <KlpIcon
                      path={bag ? BELGE_IKON.link : BELGE_IKON.dosya}
                      size={13}
                      color={bag ? KLP.blue : KLP.accent}
                    />
                    {bag ? 'BAĞLANTI' : uz ? uz.toUpperCase() : 'BELGE'}
                  </span>
                  <span
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontSize: 12.5,
                      fontWeight: 600,
                      lineHeight: 1.35,
                      minHeight: 34,
                    }}
                  >
                    {d.title}
                  </span>
                </a>
                {canEdit && (
                  <button
                    onClick={() => onDelete(d)}
                    title="Sil"
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: 2,
                      display: 'flex',
                    }}
                  >
                    <KlpIcon
                      path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                      size={12}
                      color={KLP.red}
                    />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// ClubDetailModal — karta tıklayınca büyüyüp ekrana ortalanan detay
//   • Öğrenci: takip et/bırak, takipçi sayısı, topluluk bilgileri
//   • Sahip akademisyen / yetkili: takipçi listesi + toplu mesaj
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// ClubFeed — topluluk akışı. Sahip akademisyen (canManage) portal "yeni
// gönderi" alanına benzer bir düzenleyiciyle paylaşım yapar (Duyuru/Etkinlik/
// Anket + zengin metin + dosya). Ders kodu/bölüm/sınıf alanı YOKTUR. Herkes
// (takipçiler/öğrenciler) akışı görür. Gönderiler club_posts koleksiyonunda.
// ══════════════════════════════════════════════════════════════
const FEED_TYPES = [
  { id: 'duyuru', label: 'Duyuru', color: '#2563EB', bg: '#DBEAFE' },
  { id: 'etkinlik', label: 'Etkinlik', color: '#059669', bg: '#D1FAE5' },
  { id: 'anket', label: 'Anket', color: '#7C3AED', bg: '#EDE9FE' },
];
// Kabul edilen türler ve boyut/tür kararları lib/kulup-medya.js'te; aşağıdaki
// değerler o kural yüklenemezse devreye giren yedektir.
const FEED_ACCEPT_YEDEK = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.svg,.mp4,.webm';

// ══════════════════════════════════════════════════════════════
// EK ÖNİZLEME
//
// Görsel ve video akışta YERİNDE gösterilir; dosya adı yazan bir bağlantı
// bir afişi ya da tanıtım videosunu görünmez kılıyordu. Belgeler (pdf, docx…)
// bağlantı olarak kalır — tarayıcıda önizlemesi zaten yok.
// ══════════════════════════════════════════════════════════════
function MedyaIzgarasi({ dosyalar, onAc }) {
  const medya = window.kulupMedyaEkleri ? window.kulupMedyaEkleri(dosyalar) : [];
  if (!medya.length) return null;
  // Tek ek geniş basılır; ikiden fazlası ızgaraya girer. Dört üstü nadirdir
  // ve satır satır büyümesi okunabilirliği bozmuyor.
  const sutun = medya.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: sutun,
        gap: 8,
        marginTop: 10,
      }}
    >
      {medya.map((f, i) => {
        const tur = window.kulupMedyaTuru ? window.kulupMedyaTuru(f) : 'belge';
        const ortak = {
          width: '100%',
          height: medya.length === 1 ? 'auto' : 190,
          maxHeight: medya.length === 1 ? 420 : 190,
          objectFit: 'cover',
          borderRadius: 12,
          display: 'block',
          background: '#0F172A0D',
        };
        if (tur === 'video') {
          return (
            <video
              key={f.url || i}
              src={f.url}
              controls
              preload="metadata"
              style={{ ...ortak, objectFit: 'contain', background: '#0F172A' }}
            />
          );
        }
        return (
          <button
            key={f.url || i}
            type="button"
            onClick={() => onAc && onAc(medya, i)}
            title={f.name}
            style={{
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'zoom-in',
              borderRadius: 12,
              overflow: 'hidden',
              display: 'block',
            }}
          >
            <img src={f.url} alt={f.name || ''} style={ortak} loading="lazy" />
          </button>
        );
      })}
    </div>
  );
}

// Görsel büyüteci: ızgarada küçük basılan afişin okunması için tam ekran.
function MedyaBuyutec({ liste, indeks, onKapat, onGit }) {
  useEffect(() => {
    const tus = (e) => {
      if (e.key === 'Escape') onKapat();
      if (e.key === 'ArrowRight') onGit(1);
      if (e.key === 'ArrowLeft') onGit(-1);
    };
    document.addEventListener('keydown', tus);
    return () => document.removeEventListener('keydown', tus);
  }, [onKapat, onGit]);

  const f = liste[indeks];
  if (!f) return null;
  const okBtn = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 46,
    height: 46,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.28)',
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  return (
    <div
      onClick={onKapat}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(8,12,20,0.94)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 34,
        cursor: 'zoom-out',
      }}
    >
      <img
        src={f.url}
        alt={f.name || ''}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          borderRadius: 10,
          cursor: 'default',
        }}
      />
      <button
        onClick={onKapat}
        title="Kapat"
        style={{ ...okBtn, top: 18, right: 20, transform: 'none' }}
      >
        <KlpIcon path="M18 6L6 18M6 6l12 12" size={18} color="#fff" />
      </button>
      {liste.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGit(-1);
            }}
            style={{ ...okBtn, left: 18 }}
            aria-label="Önceki"
          >
            <KlpIcon path="M15 18l-6-6 6-6" size={18} color="#fff" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGit(1);
            }}
            style={{ ...okBtn, right: 18 }}
            aria-label="Sonraki"
          >
            <KlpIcon path="M9 6l6 6-6 6" size={18} color="#fff" />
          </button>
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.72)',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {indeks + 1} / {liste.length}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TÜRE ÖZEL ALANLAR — DÜZENLEYİCİDE
//
// Tür seçmek eskiden yalnız renkli bir etiket seçmekti. Etkinlik seçilince
// tarih/saat/yer, anket seçilince seçenekler burada sorulur; kural ve
// doğrulama lib/kulup-gonderi.js'te.
// ══════════════════════════════════════════════════════════════
const klpAlanEtiketi = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: KLP.textMuted,
  marginBottom: 5,
};

// Etiket ile alanın bağı: `label` girdiyi SARAR. Ayrı duran bir etiket
// ekran okuyucuda alanla ilişkilenmiyor, tıklanınca da odaklanmıyordu.
function KlpAlan({ etiket, children, stil }) {
  return (
    <label style={{ display: 'block', ...(stil || {}) }}>
      <span style={klpAlanEtiketi}>{etiket}</span>
      {children}
    </label>
  );
}

const klpGiris = {
  width: '100%',
  // Etiketin büyük-harf/aralık biçimi sarmalayıcı label'dan miras kalmasın.
  textTransform: 'none',
  letterSpacing: 'normal',
  boxSizing: 'border-box',
  padding: '9px 11px',
  borderRadius: 9,
  border: `1px solid ${KLP.border}`,
  fontSize: 13,
  fontFamily: "'Inter', sans-serif",
  outline: 'none',
  background: '#fff',
  color: KLP.text,
};

function EtkinlikAlanlari({ deger, onChange }) {
  const d = deger || {};
  const yaz = (k, v) => onChange({ ...d, [k]: v });
  return (
    <div
      style={{
        border: `1px solid ${KLP.border}`,
        borderRadius: 10,
        padding: 12,
        background: '#F8FAFC',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 10,
        marginBottom: 10,
      }}
    >
      <KlpAlan etiket="Tarih *">
        <input
          type="date"
          value={d.tarih || ''}
          onChange={(e) => yaz('tarih', e.target.value)}
          style={klpGiris}
        />
      </KlpAlan>
      <KlpAlan etiket="Başlangıç">
        <input
          type="time"
          value={d.baslangic || ''}
          onChange={(e) => yaz('baslangic', e.target.value)}
          style={klpGiris}
        />
      </KlpAlan>
      <KlpAlan etiket="Bitiş">
        <input
          type="time"
          value={d.bitis || ''}
          onChange={(e) => yaz('bitis', e.target.value)}
          style={klpGiris}
        />
      </KlpAlan>
      <KlpAlan etiket="Yer" stil={{ gridColumn: '1 / -1' }}>
        <input
          value={d.yer || ''}
          onChange={(e) => yaz('yer', e.target.value)}
          placeholder="Konferans Salonu, Merkez Kampüs…"
          style={klpGiris}
        />
      </KlpAlan>
    </div>
  );
}

function AnketAlanlari({ deger, onChange }) {
  const d = deger || {};
  const secenekler = Array.isArray(d.secenekler) ? d.secenekler : ['', ''];
  const enCok = window.KULUP_ANKET_EN_COK || 6;
  const enAz = window.KULUP_ANKET_EN_AZ || 2;
  const yaz = (liste) => onChange({ ...d, secenekler: liste });
  return (
    <div
      style={{
        border: `1px solid ${KLP.border}`,
        borderRadius: 10,
        padding: 12,
        background: '#F8FAFC',
        marginBottom: 10,
      }}
    >
      {/* Bu etiket TEK bir alanı değil, numaralı seçenek satırlarının
          tamamını adlandırır; her satırın kendi yer tutucusu var. */}
      <div style={klpAlanEtiketi}>
        Seçenekler ({enAz}–{enCok})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {secenekler.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#EDE9FE',
                color: '#6D28D9',
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <input
              value={s}
              onChange={(e) => yaz(secenekler.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder={'Seçenek ' + (i + 1)}
              style={klpGiris}
            />
            {secenekler.length > enAz && (
              <button
                type="button"
                onClick={() => yaz(secenekler.filter((_, j) => j !== i))}
                title="Seçeneği kaldır"
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  flexShrink: 0,
                }}
              >
                <KlpIcon path="M18 6L6 18M6 6l12 12" size={14} color={KLP.textMuted} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          marginTop: 10,
        }}
      >
        {secenekler.length < enCok && (
          <button
            type="button"
            onClick={() => yaz([...secenekler, ''])}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              border: `1px dashed ${KLP.border}`,
              background: '#fff',
              color: KLP.primary,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <KlpIcon path="M12 5v14M5 12h14" size={13} color={KLP.primary} />
            Seçenek ekle
          </button>
        )}
        <KlpAlan etiket="Bitiş tarihi (isteğe bağlı)" stil={{ marginLeft: 'auto' }}>
          <input
            type="date"
            value={d.bitis || ''}
            onChange={(e) => onChange({ ...d, bitis: e.target.value })}
            style={{ ...klpGiris, width: 170 }}
          />
        </KlpAlan>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ETKİNLİK KUTUSU — akıştaki gönderinin üstünde
//
// Tarih ekranın en solunda takvim yaprağı gibi durur: akışta gezerken
// "ne zaman" sorusunun cevabı metni okumadan görünür.
// ══════════════════════════════════════════════════════════════
const AY_KISA = [
  'OCA',
  'ŞUB',
  'MAR',
  'NİS',
  'MAY',
  'HAZ',
  'TEM',
  'AĞU',
  'EYL',
  'EKİ',
  'KAS',
  'ARA',
];

function EtkinlikKutusu({ post, club, katilim, katildim, onKatil, kimlikVar }) {
  const e = window.kulupEtkinlikNormalle
    ? window.kulupEtkinlikNormalle(post.etkinlik)
    : post.etkinlik || {};
  const bas = window.kulupEtkinlikBaslangici ? window.kulupEtkinlikBaslangici(e) : null;
  if (!bas) return null;
  const durum = window.kulupEtkinlikDurumu ? window.kulupEtkinlikDurumu(e, new Date()) : 'yaklasan';
  const gecmis = durum === 'gecmis';
  const saat = e.baslangic ? e.baslangic + (e.bitis ? ' – ' + e.bitis : '') : 'Saat belirtilmedi';

  const takvimeEkle = () => {
    if (!window.kulupIcsBelgesi) return;
    const duz = window.zenginDuzMetin ? window.zenginDuzMetin(post.content || '') : '';
    const baslik = (duz.split('\n')[0] || '').trim().slice(0, 80);
    const ics = window.kulupIcsBelgesi(post, club.name || '', baslik);
    if (!ics) return;
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'etkinlik.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: 12,
        borderRadius: 12,
        border: `1px solid ${gecmis ? KLP.border : '#A7F3D0'}`,
        background: gecmis ? '#F8FAFC' : '#ECFDF5',
        marginBottom: 10,
      }}
    >
      {/* Takvim yaprağı */}
      <div
        style={{
          width: 54,
          borderRadius: 10,
          overflow: 'hidden',
          border: `1px solid ${gecmis ? KLP.border : '#A7F3D0'}`,
          background: '#fff',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            background: gecmis ? KLP.textMuted : '#059669',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.06em',
            padding: '3px 0',
          }}
        >
          {AY_KISA[bas.getMonth()]}
        </div>
        <div style={{ fontSize: 21, fontWeight: 800, color: KLP.text, lineHeight: 1.25 }}>
          {bas.getDate()}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: KLP.text }}>{saat}</span>
          {durum === 'bugun' && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.06em',
                padding: '2px 8px',
                borderRadius: 999,
                background: '#059669',
                color: '#fff',
              }}
            >
              BUGÜN
            </span>
          )}
          {gecmis && (
            <span style={{ fontSize: 11, fontWeight: 600, color: KLP.textMuted }}>Tamamlandı</span>
          )}
        </div>
        {e.yer && (
          <div
            style={{
              fontSize: 12.5,
              color: KLP.textMuted,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              marginTop: 2,
            }}
          >
            <KlpIcon
              path="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 7a3 3 0 100 6 3 3 0 000-6z"
              size={13}
              color={KLP.textMuted}
            />
            {e.yer}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
        {katilim > 0 && (
          <span style={{ fontSize: 12, color: KLP.textMuted, fontWeight: 600 }}>
            {katilim} kişi katılacak
          </span>
        )}
        {/* Katılım işareti oy koleksiyonuna yazılır; kimliksiz kullanıcı
            (ör. yetkili hesabı olmayan) yalnız görür. */}
        {!gecmis && kimlikVar && (
          <button
            type="button"
            onClick={onKatil}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 13px',
              borderRadius: 999,
              border: `1px solid ${katildim ? '#059669' : KLP.border}`,
              background: katildim ? '#059669' : '#fff',
              color: katildim ? '#fff' : KLP.text,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <KlpIcon path="M20 6L9 17l-5-5" size={13} color={katildim ? '#fff' : KLP.textMuted} />
            {katildim ? 'Katılıyorum' : 'Katılacağım'}
          </button>
        )}
        {!gecmis && (
          <button
            type="button"
            onClick={takvimeEkle}
            title="Takvimime ekle (.ics)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 13px',
              borderRadius: 999,
              border: `1px solid ${KLP.border}`,
              background: '#fff',
              color: KLP.text,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <KlpIcon
              path="M8 7V3m8 4V3M3 11h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
              size={13}
              color={KLP.textMuted}
            />
            Takvime ekle
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ANKET KUTUSU
//
// Oy verilmeden önce seçenekler düğmedir; oy verdikten (ya da anket
// kapandıktan) sonra sonuç çubuğuna dönüşür. Sonucu baştan göstermek
// oyları sürükler — ilk oylar sonrakileri belirlerdi.
// ══════════════════════════════════════════════════════════════
function AnketKutusu({ post, oylar, kimlik, onOyVer }) {
  const anket = post.anket || {};
  const secenekler = window.kulupAnketSecenekleri
    ? window.kulupAnketSecenekleri(anket.secenekler)
    : [];
  if (!secenekler.length) return null;
  const kapandi = window.kulupAnketKapandiMi
    ? window.kulupAnketKapandiMi(anket, new Date())
    : false;
  const benimOyum = window.kulupKullaniciOyu ? window.kulupKullaniciOyu(oylar, kimlik) : null;
  const verilebilir = window.kulupOyVerilebilirMi
    ? window.kulupOyVerilebilirMi(anket, kimlik, new Date())
    : false;
  const dagilim = window.kulupOyDagilimi
    ? window.kulupOyDagilimi(anket, oylar)
    : { toplam: 0, satirlar: [] };
  const sonucGoster = !!benimOyum || kapandi;

  return (
    <div
      style={{
        border: '1px solid #DDD6FE',
        background: '#FAF9FF',
        borderRadius: 12,
        padding: 12,
        marginTop: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          marginBottom: 9,
          flexWrap: 'wrap',
        }}
      >
        <KlpIcon path="M18 20V10M12 20V4M6 20v-6" size={14} color="#6D28D9" />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#5B21B6' }}>
          {kapandi ? 'Anket kapandı' : benimOyum ? 'Oyunuz alındı' : 'Oyunuzu verin'}
        </span>
        <span style={{ fontSize: 11.5, color: KLP.textMuted, marginLeft: 'auto' }}>
          {dagilim.toplam} oy
          {anket.bitis && !kapandi ? ' · son ' + fmtGunAy(anket.bitis) : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {dagilim.satirlar.map((s) => {
          const benim = benimOyum && String(benimOyum.optionId) === s.id;
          if (!sonucGoster) {
            return (
              <button
                key={s.id}
                type="button"
                disabled={!verilebilir}
                onClick={() => onOyVer(s.id)}
                style={{
                  textAlign: 'left',
                  padding: '10px 13px',
                  borderRadius: 10,
                  border: '1px solid #DDD6FE',
                  background: '#fff',
                  color: KLP.text,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: verilebilir ? 'pointer' : 'not-allowed',
                  opacity: verilebilir ? 1 : 0.6,
                }}
              >
                {s.metin}
              </button>
            );
          }
          // Sonuç görünürken de oy değiştirilebilir: satırın KENDİSİ düğme
          // olur. Altına ayrı bir "oyunu değiştir" çip sırası koymak aynı
          // seçenekleri ikinci kez yazmaktı.
          const Sarmal = verilebilir ? 'button' : 'div';
          return (
            <Sarmal
              key={s.id}
              type={verilebilir ? 'button' : undefined}
              onClick={verilebilir ? () => onOyVer(s.id) : undefined}
              title={verilebilir ? 'Oyunuzu bu seçeneğe taşıyın' : undefined}
              style={{
                position: 'relative',
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: 0,
                borderRadius: 10,
                border: '1px solid ' + (benim ? '#A78BFA' : '#E9E5FF'),
                background: '#fff',
                overflow: 'hidden',
                cursor: verilebilir ? 'pointer' : 'default',
                font: 'inherit',
              }}
            >
              {/* Sonuç çubuğu metnin ARKASINDA: yan yana koyunca uzun
                  seçenek metni çubuğu ezip yüzdeyi okunmaz kılıyordu. */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: s.yuzde + '%',
                  background: benim ? '#DDD6FE' : '#F1EDFF',
                  transition: 'width .3s',
                }}
              />
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 13px',
                }}
              >
                {benim && <KlpIcon path="M20 6L9 17l-5-5" size={13} color="#5B21B6" />}
                <span style={{ fontSize: 13, fontWeight: 600, color: KLP.text }}>{s.metin}</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#5B21B6',
                    whiteSpace: 'nowrap',
                  }}
                >
                  %{s.yuzde} · {s.sayi}
                </span>
              </div>
            </Sarmal>
          );
        })}
      </div>

      {benimOyum && !kapandi && (
        <div style={{ fontSize: 11.5, color: KLP.textMuted, marginTop: 8 }}>
          Seçeneğe yeniden basarak oyunuzu değiştirebilirsiniz. Oy kullananlar topluluk yöneticileri
          tarafından görülebilir.
        </div>
      )}
    </div>
  );
}

function fmtGunAy(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return '';
  const [y, a, g] = String(iso).split('-').map(Number);
  return (
    g +
    ' ' +
    [
      'Ocak',
      'Şubat',
      'Mart',
      'Nisan',
      'Mayıs',
      'Haziran',
      'Temmuz',
      'Ağustos',
      'Eylül',
      'Ekim',
      'Kasım',
      'Aralık',
    ][a - 1] +
    ' ' +
    y
  );
}

function fmtFeedDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (_) {
    return '';
  }
}

function ClubFeed({ club, canPost, canManage, currentUser, followers }) {
  const myAuthor = currentUser?.name || currentUser?.identifier || '';
  // Oy/katılım kaydının anahtarı. Öğrencide numara, personelde kimlik.
  const kimlik = String(currentUser?.studentNumber || currentUser?.identifier || '').trim();
  const [posts, setPosts] = useState([]);
  const [oylar, setOylar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('duyuru');
  const [metin, setMetin] = useState('');
  const [etkinlik, setEtkinlik] = useState({ tarih: '', baslangic: '', bitis: '', yer: '' });
  const [anket, setAnket] = useState({ secenekler: ['', ''], bitis: '' });
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [hata, setHata] = useState('');
  const [sekme, setSekme] = useState('tumu');
  // Büyüteçte gösterilen görsel listesi ve sırası.
  const [buyutec, setBuyutec] = useState(null); // { liste, indeks }
  const fileRef = useRef(null);
  const kabul = window.KULUP_FEED_KABUL || FEED_ACCEPT_YEDEK;
  const belgeler = window.kulupBelgeEkleri || ((l) => l || []);
  const enBuyukMB = window.KULUP_EN_BUYUK_MB || 50;
  const boyut = window.kulupBoyutMetni || (() => '');
  const turler = window.KULUP_GONDERI_TURLERI || FEED_TYPES;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Gönderiler ve oylar birlikte çekilir: oylar ayrı bir koleksiyonda
      // (bkz. lib/kulup-gonderi.js) ve akış onlarsız yarım görünürdü.
      const [all, oy] = await Promise.all([
        window.apiRead('club_posts', { where: 'clubId:eq:s:' + club.id }),
        window.apiRead('club_post_votes', { where: 'clubId:eq:s:' + club.id }).catch(() => []),
      ]);
      const mine = (all || []).filter((p) => String(p.clubId) === String(club.id));
      mine.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      setPosts(mine);
      setOylar((oy || []).filter((o) => String(o.clubId) === String(club.id)));
    } catch (_) {
      setPosts([]);
      setOylar([]);
    } finally {
      setLoading(false);
    }
  }, [club.id]);

  const oylariYenile = useCallback(async () => {
    try {
      const oy = await window.apiRead('club_post_votes', { where: 'clubId:eq:s:' + club.id });
      setOylar((oy || []).filter((o) => String(o.clubId) === String(club.id)));
    } catch (_) {
      /* sessiz: sayım bir sonraki yüklemede tazelenir */
    }
  }, [club.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFiles = async (e) => {
    const list = Array.from(e.target.files || []);
    e.target.value = '';
    if (!list.length) return;
    // Sunucu 50 MB'ta reddediyor; video eklenebildiği için bu sınıra artık
    // gerçekten çarpılıyor. Yüklemeye başlamadan söylemek, dakikalarca
    // bekleyip hata almaktan iyi.
    const buyuk = list.filter((f) => f.size > enBuyukMB * 1024 * 1024);
    if (buyuk.length) {
      alert(
        `Şu dosyalar ${enBuyukMB} MB sınırını aşıyor:\n` +
          buyuk.map((f) => `• ${f.name} (${boyut(f.size)})`).join('\n')
      );
      const kalan = list.filter((f) => f.size <= enBuyukMB * 1024 * 1024);
      if (!kalan.length) return;
      list.length = 0;
      kalan.forEach((f) => list.push(f));
    }
    setUploading(true);
    try {
      for (const file of list) {
        const form = new FormData();
        form.append('folder', 'club_posts');
        form.append('file', file);
        const res = await fetch('/api/files/upload?folder=' + encodeURIComponent('club_posts'), {
          method: 'POST',
          body: form,
          credentials: 'include',
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        setFiles((p) => [
          ...p,
          {
            name: json.originalName || file.name,
            url: json.downloadURL || '',
            size: json.size || file.size || 0,
            fileName: json.fileName || '',
            // Tür kararı uzantıdan veriliyor; mime varsa daha kesin.
            mimetype: json.mimetype || file.type || '',
          },
        ]);
      }
    } catch (err) {
      alert('Dosya yüklenemedi: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (i) => setFiles((p) => p.filter((_, idx) => idx !== i));

  // Düzenleyici sıfırlanır — tür de duyuruya döner, yoksa bir sonraki
  // paylaşım sessizce "etkinlik" olarak gidiyordu.
  const temizle = () => {
    setMetin('');
    setFiles([]);
    setEtkinlik({ tarih: '', baslangic: '', bitis: '', yer: '' });
    setAnket({ secenekler: ['', ''], bitis: '' });
    setType('duyuru');
    setHata('');
  };

  const duzMetin = window.zenginDuzMetin ? window.zenginDuzMetin(metin) : metin;
  const metinBos = window.zenginBosMu ? window.zenginBosMu(metin) : !String(duzMetin || '').trim();

  const submit = async () => {
    const karar = window.kulupGonderiHazirMi
      ? window.kulupGonderiHazirMi(type, {
          metinBos,
          dosyaSayisi: files.length,
          etkinlik,
          anket,
        })
      : { tamam: !metinBos || files.length > 0, hata: 'Bir metin yazın veya dosya ekleyin.' };
    if (!karar.tamam) {
      setHata(karar.hata);
      return;
    }
    setHata('');
    setPosting(true);
    try {
      const kayit = {
        clubId: club.id,
        clubName: club.name || '',
        type,
        content: metin,
        contentFormat: 'html',
        files,
        authorName: currentUser?.name || currentUser?.identifier || 'Topluluk',
        authorRole: currentUser?.role || '',
        createdAt: new Date().toISOString(),
      };
      if (type === 'etkinlik') {
        kayit.etkinlik = window.kulupEtkinlikNormalle
          ? window.kulupEtkinlikNormalle(etkinlik)
          : etkinlik;
      }
      if (type === 'anket') {
        kayit.anket = {
          secenekler: window.kulupAnketSecenekleri
            ? window.kulupAnketSecenekleri(anket.secenekler)
            : anket.secenekler,
          bitis: String(anket.bitis || ''),
        };
      }
      await window.DBWrite.add('club_posts', kayit);

      // Takipçilere otomatik bildirim: yeni paylaşım çan menüsüne düşer.
      try {
        const typeLabel =
          (turler.find((x) => x.id === type) || {}).ad ||
          (turler.find((x) => x.id === type) || {}).label ||
          'paylaşım';
        // Gövde türe göre yazılır: etkinlikte tarih/yer, ankette seçenek
        // sayısı. "Yeni paylaşım" demek bildirimi açmadan hiçbir şey
        // söylemiyordu (bkz. lib/kulup-gonderi.js).
        const body = window.kulupGonderiOzeti
          ? window.kulupGonderiOzeti(kayit, duzMetin)
          : duzMetin.slice(0, 90);
        const list = Array.isArray(followers) ? followers : [];
        for (const f of list) {
          if (!f.studentNumber) continue;
          // StudentNotifier'ı tercih et: student_notifications öğrenci-yazılabilir,
          // böylece başkan (öğrenci) paylaşımı da takipçilere bildirim gönderebilir.
          // (Merkezi notifications öğrenciye kapalı olduğundan Notify.send yalnız
          // yedek olarak kullanılır.)
          if (window.StudentNotifier && window.StudentNotifier._addNotification) {
            await window.StudentNotifier._addNotification(f.studentNumber, {
              module: 'topluluk',
              type: 'bilgi',
              title: (club.name || 'Topluluk') + ' · ' + typeLabel,
              body,
            });
          } else if (window.Notify && window.Notify.send) {
            await window.Notify.send({
              recipientType: 'user',
              recipientId: String(f.studentNumber),
              module: 'topluluk',
              type: 'bilgi',
              title: (club.name || 'Topluluk') + ' · ' + typeLabel,
              body,
              meta: { clubId: club.id, postType: type },
            });
          }
        }
      } catch (_) {
        /* bildirim opsiyonel — gönderi zaten kaydedildi */
      }

      temizle();
      await load();
    } catch (e) {
      alert('Gönderilemedi: ' + e.message);
    } finally {
      setPosting(false);
    }
  };

  const del = async (post) => {
    if (!confirm('Bu gönderi silinsin mi?')) return;
    try {
      await window.DBWrite.remove('club_posts', post.id);
      await load();
    } catch (e) {
      alert('Silinemedi: ' + e.message);
    }
  };

  // ── OY VE KATILIM ──
  // Kayıt kimliği (gönderi + kişi + tür) SABİTTİR: aynı kişi ikinci kez oy
  // verdiğinde yeni satır açılmaz, mevcut satır güncellenir. Sunucu ayrıca
  // sahipliği JWT kimliğine sabitliyor (server/routes/db.js).
  const oyKaydi = (post, kind) => post.id + '__' + kind + '__' + kimlik;

  const oyVer = async (post, optionId) => {
    if (!kimlik) return;
    try {
      await window.DBWrite.set(
        'club_post_votes',
        oyKaydi(post, 'anket'),
        {
          postId: post.id,
          clubId: club.id,
          kind: 'anket',
          optionId,
          voter: kimlik,
          createdAt: new Date().toISOString(),
        },
        true
      );
      await oylariYenile();
    } catch (e) {
      alert('Oy kaydedilemedi: ' + e.message);
    }
  };

  const katilimDegistir = async (post, katildim) => {
    if (!kimlik) return;
    try {
      if (katildim) {
        await window.DBWrite.remove('club_post_votes', oyKaydi(post, 'katilim'));
      } else {
        await window.DBWrite.set(
          'club_post_votes',
          oyKaydi(post, 'katilim'),
          {
            postId: post.id,
            clubId: club.id,
            kind: 'katilim',
            optionId: 'katilim',
            voter: kimlik,
            createdAt: new Date().toISOString(),
          },
          true
        );
      }
      await oylariYenile();
    } catch (e) {
      alert('Katılım kaydedilemedi: ' + e.message);
    }
  };

  const oylarinin = (postId, kind) =>
    oylar.filter((o) => String(o.postId) === String(postId) && (o.kind || 'anket') === kind);

  // Sekmeye göre süzülmüş akış ve yaklaşan etkinlikler.
  const gorunen = window.kulupGonderileriSuz
    ? window.kulupGonderileriSuz(posts, sekme)
    : posts.filter((p) => sekme === 'tumu' || (p.type || 'duyuru') === sekme);
  const yaklasan = window.kulupYaklasanEtkinlikler
    ? window.kulupYaklasanEtkinlikler(posts, new Date(), 3)
    : [];

  const sayac = (id) =>
    id === 'tumu' ? posts.length : posts.filter((p) => (p.type || 'duyuru') === id).length;

  const sekmeler = [{ id: 'tumu', ad: 'Tümü' }].concat(
    turler.map((t) => ({ id: t.id, ad: (t.ad || t.label) + (t.id === 'duyuru' ? 'lar' : 'ler') }))
  );

  return (
    <div style={{ marginTop: 20, borderTop: `1px solid ${KLP.border}`, paddingTop: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: KLP.primary }}>Topluluk Akışı</div>
        {/* Tür sekmeleri: bir topluluğun etkinliklerini görmek için duyuru
            ve anketlerin arasından geçmek gerekmiyor. */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {sekmeler.map((s) => {
            const on = sekme === s.id;
            const n = sayac(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSekme(s.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: `1px solid ${on ? KLP.primary : KLP.border}`,
                  background: on ? KLP.primary : '#fff',
                  color: on ? '#fff' : KLP.textMuted,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {s.ad}
                {n > 0 ? ' · ' + n : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Yaklaşan etkinlikler — akış tersine kronolojik olduğu için
          yarınki etkinlik onuncu sırada kalabiliyordu. */}
      {yaklasan.length > 0 && sekme === 'tumu' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 8,
            marginBottom: 14,
          }}
        >
          {yaklasan.map((p) => {
            const bas = window.kulupEtkinlikBaslangici(p.etkinlik);
            const e = window.kulupEtkinlikNormalle(p.etkinlik);
            const duz = window.zenginDuzMetin ? window.zenginDuzMetin(p.content || '') : '';
            const baslik = (duz.split('\n')[0] || '').trim() || 'Etkinlik';
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSekme('etkinlik')}
                style={{
                  textAlign: 'left',
                  display: 'flex',
                  gap: 9,
                  alignItems: 'center',
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid #A7F3D0',
                  background: '#ECFDF5',
                  cursor: 'pointer',
                }}
              >
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: '#059669' }}>
                    {AY_KISA[bas.getMonth()]}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: KLP.text, lineHeight: 1.1 }}>
                    {bas.getDate()}
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: KLP.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {baslik}
                  </div>
                  <div style={{ fontSize: 11, color: KLP.textMuted }}>
                    {[e.baslangic, e.yer].filter(Boolean).join(' · ') || 'Saat belirtilmedi'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Düzenleyici — sahip akademisyen (danışman) veya topluluk başkanı */}
      {canPost && (
        <div
          style={{
            border: `1px solid ${KLP.border}`,
            borderRadius: 12,
            padding: 14,
            marginBottom: 18,
            background: '#FCFCFD',
          }}
        >
          {/* Tür seçimi (ilk satır) */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {turler.map((t) => {
              const on = type === t.id;
              const renk = t.renk || t.color;
              const zemin = t.zemin || t.bg;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setType(t.id);
                    setHata('');
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: '1px solid ' + (on ? renk : KLP.border),
                    background: on ? zemin : '#fff',
                    color: on ? renk : KLP.textMuted,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t.ad || t.label}
                </button>
              );
            })}
          </div>

          {/* Türe özel alanlar */}
          {type === 'etkinlik' && <EtkinlikAlanlari deger={etkinlik} onChange={setEtkinlik} />}
          {type === 'anket' && <AnketAlanlari deger={anket} onChange={setAnket} />}

          {/* Zengin metin — duyuru editörüyle aynı Quill. Eski üç düğmeli
              (kalın/italik/liste) contentEditable alanı başlık, hizalama,
              renk, bağlantı ve alıntı tanımıyordu. */}
          {window.QuillEditoru ? (
            <window.QuillEditoru
              deger={metin}
              onChange={setMetin}
              yukseklik={type === 'duyuru' ? 150 : 110}
              yerTutucu={
                type === 'anket'
                  ? 'Anket sorusunu yazın…'
                  : type === 'etkinlik'
                    ? 'Etkinliği anlatın…'
                    : 'Paylaşmak istediklerinizi yazın…'
              }
            />
          ) : (
            <textarea
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
              rows={4}
              placeholder="Paylaşmak istediklerinizi yazın…"
              style={{ ...klpGiris, resize: 'vertical' }}
            />
          )}

          {/* Eklenen dosyalar — paylaşmadan ÖNCE ne eklendiği görünür.
              Eskiden yalnız dosya adı yazıyordu; yanlış afişi eklediğini
              ancak paylaştıktan sonra fark ediyordun. */}
          {files.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
                gap: 10,
                marginTop: 12,
              }}
            >
              {files.map((f, i) => {
                const tur = window.kulupMedyaTuru ? window.kulupMedyaTuru(f) : 'belge';
                return (
                  <div
                    key={i}
                    style={{
                      position: 'relative',
                      border: `1px solid ${KLP.border}`,
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: '#fff',
                    }}
                  >
                    <div
                      style={{
                        height: 84,
                        background: tur === 'video' ? '#0F172A' : KLP.accentLight,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {tur === 'gorsel' ? (
                        <img
                          src={f.url}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : tur === 'video' ? (
                        <video
                          src={f.url}
                          preload="metadata"
                          muted
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <KlpIcon
                          path="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          size={26}
                          color={KLP.accent}
                        />
                      )}
                    </div>
                    <div style={{ padding: '6px 8px' }}>
                      <div
                        title={f.name}
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: KLP.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {f.name}
                      </div>
                      <div style={{ fontSize: 10.5, color: KLP.textMuted }}>{boyut(f.size)}</div>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      title="Kaldır"
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(15,23,42,0.72)',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      <KlpIcon path="M18 6L6 18M6 6l12 12" size={12} color="#fff" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Eksik alan uyarısı düğmenin YANINDA değil üstünde: tıklayıp
              hiçbir şey olmamasının nedeni görünür olmalı. */}
          {hata && (
            <div
              style={{
                marginTop: 10,
                padding: '8px 12px',
                borderRadius: 8,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {hata}
            </div>
          )}

          {/* Dosya ekle + paylaş */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginTop: 12,
              flexWrap: 'wrap',
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept={kabul}
              multiple
              style={{ display: 'none' }}
              onChange={handleFiles}
            />
            <button
              onClick={() => fileRef.current && fileRef.current.click()}
              disabled={uploading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px dashed ${KLP.accent}`,
                background: '#fff',
                color: KLP.accent,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: uploading ? 'wait' : 'pointer',
              }}
            >
              <KlpIcon
                path="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                size={15}
                color={KLP.accent}
              />
              {uploading ? 'Yükleniyor…' : `Görsel, video veya belge ekle (en çok ${enBuyukMB} MB)`}
            </button>
            <button
              onClick={submit}
              disabled={posting}
              style={{
                padding: '9px 20px',
                borderRadius: 8,
                border: 'none',
                background: KLP.primary,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: posting ? 'wait' : 'pointer',
                opacity: posting ? 0.7 : 1,
              }}
            >
              {posting ? 'Paylaşılıyor…' : 'Paylaş'}
            </button>
          </div>
        </div>
      )}

      {/* Akış listesi */}
      {loading ? (
        <p style={{ fontSize: 12.5, color: KLP.textMuted, margin: 0 }}>Yükleniyor…</p>
      ) : gorunen.length === 0 ? (
        <p style={{ fontSize: 12.5, color: KLP.textMuted, margin: 0 }}>
          {posts.length === 0 ? 'Henüz paylaşım yok.' : 'Bu türde paylaşım yok.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {gorunen.map((p) => {
            const t = window.kulupTurBilgisi
              ? window.kulupTurBilgisi(p.type)
              : FEED_TYPES.find((x) => x.id === p.type) || FEED_TYPES[0];
            const katilimlar = oylarinin(p.id, 'katilim');
            const katildim = !!(window.kulupKullaniciOyu
              ? window.kulupKullaniciOyu(katilimlar, kimlik)
              : null);
            return (
              <div
                key={p.id}
                style={{ border: `1px solid ${KLP.border}`, borderRadius: 12, padding: 14 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      padding: '2px 9px',
                      borderRadius: 10,
                      background: t.zemin || t.bg,
                      color: t.renk || t.color,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {t.ad || t.label}
                  </span>
                  <span style={{ fontSize: 12, color: KLP.textMuted }}>{p.authorName}</span>
                  <span style={{ fontSize: 11.5, color: KLP.textMuted }}>
                    · {fmtFeedDate(p.createdAt)}
                  </span>
                  {(canManage || (myAuthor && p.authorName === myAuthor)) && (
                    <button
                      onClick={() => del(p)}
                      title="Sil"
                      style={{
                        marginLeft: 'auto',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: KLP.red,
                        padding: 2,
                        display: 'flex',
                      }}
                    >
                      <KlpIcon
                        path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                        size={14}
                      />
                    </button>
                  )}
                </div>

                {/* Etkinlik künyesi metnin ÜSTÜNDE: ne zaman/nerede sorusu
                    açıklamayı okumadan cevaplanmalı. */}
                {p.type === 'etkinlik' && (
                  <EtkinlikKutusu
                    post={p}
                    club={club}
                    katilim={katilimlar.length}
                    katildim={katildim}
                    kimlikVar={!!kimlik}
                    onKatil={() => katilimDegistir(p, katildim)}
                  />
                )}

                {/* İçerik HTML olarak saklanıyor ve yazan kişi topluluk
                    başkanı da olabiliyor. innerHTML yerine ayrıştırıcıdan
                    geçirilir: tanınmayan etiket düz metne düşer, betik
                    hiçbir durumda çalışmaz (lib/zengin-metin.js). */}
                {p.content &&
                  (window.ZenginMetin ? (
                    <window.ZenginMetin
                      html={p.content}
                      stil={{ fontSize: 13.5, color: KLP.text, lineHeight: 1.55 }}
                    />
                  ) : (
                    <div style={{ fontSize: 13.5, color: KLP.text, lineHeight: 1.55 }}>
                      {window.zenginDuzMetin ? window.zenginDuzMetin(p.content) : ''}
                    </div>
                  ))}

                {p.type === 'anket' && (
                  <AnketKutusu
                    post={p}
                    oylar={oylarinin(p.id, 'anket')}
                    kimlik={kimlik}
                    onOyVer={(secenekId) => oyVer(p, secenekId)}
                  />
                )}

                {/* Görsel ve video yerinde; belgeler bağlantı olarak. */}
                <MedyaIzgarasi
                  dosyalar={p.files}
                  onAc={(liste, indeks) => setBuyutec({ liste, indeks })}
                />
                {belgeler(p.files).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {belgeler(p.files).map((f, i) => (
                      <a
                        key={i}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 7,
                          padding: '8px 12px',
                          borderRadius: 10,
                          border: `1px solid ${KLP.border}`,
                          background: '#fff',
                          color: KLP.primary,
                          fontSize: 12.5,
                          fontWeight: 600,
                          textDecoration: 'none',
                          maxWidth: 260,
                        }}
                      >
                        <KlpIcon
                          path="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          size={15}
                          color={KLP.accent}
                        />
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {f.name}
                        </span>
                        {boyut(f.size) && (
                          <span style={{ fontSize: 11, color: KLP.textMuted, flexShrink: 0 }}>
                            {boyut(f.size)}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {buyutec && (
        <MedyaBuyutec
          liste={buyutec.liste}
          indeks={buyutec.indeks}
          onKapat={() => setBuyutec(null)}
          onGit={(yon) =>
            setBuyutec((b) =>
              b ? { ...b, indeks: (b.indeks + yon + b.liste.length) % b.liste.length } : b
            )
          }
        />
      )}
    </div>
  );
}

function ClubDetailModal({
  club,
  followers,
  students,
  isStudent,
  isFollowing,
  onToggleFollow,
  canManage,
  onSendBulk,
  onClose,
  currentUser,
}) {
  const [g1, g2] = colorForName(club?.name || '');
  const hasLogo = !!club?.logoURL;
  const [bulkText, setBulkText] = useState('');
  const [sending, setSending] = useState(false);
  // Takipçi listesi kapalı başlar: kalabalık bir toplulukta liste tek başına
  // ekranı dolduruyor, altındaki toplu mesaj kutusu görünmüyordu.
  const [takipciAcik, setTakipciAcik] = useState(false);
  const stop = (e) => e.stopPropagation();
  const olcu = window.useResponsive ? window.useResponsive() : { width: 1200 };
  // Geniş ekranda kimlik solda, akış sağda; dar ekranda alt alta.
  const ikiSutun = olcu.width >= 900;

  // Topluluk başkanı (öğrenci) da tıpkı danışman gibi akışa paylaşım yapabilir.
  // Başkan bir ad olarak saklanır; öğrencinin adıyla eşleştirilir.
  const normNm = (s) => (s || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
  const myStudent = isStudent
    ? (students || []).find((s) => String(s.studentNumber) === String(currentUser?.studentNumber))
    : null;
  const myFullName = myStudent
    ? `${myStudent.firstName || ''} ${myStudent.lastName || ''}`.trim()
    : currentUser?.name || '';
  const isPresident =
    isStudent && !!club.president && !!myFullName && normNm(club.president) === normNm(myFullName);
  const canPost = canManage || isPresident;

  const resolveName = (f) => {
    if (f.studentName) return f.studentName;
    const s = (students || []).find((x) => String(x.studentNumber) === String(f.studentNumber));
    const n = s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() : '';
    return n || f.studentNumber || 'Öğrenci';
  };

  const send = async () => {
    const t = bulkText.trim();
    if (!t) return;
    setSending(true);
    try {
      await onSendBulk(t);
      setBulkText('');
    } finally {
      setSending(false);
    }
  };

  const infoRow = (label, value) =>
    value ? (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0' }}>
        <span style={{ fontSize: 12, color: KLP.textMuted }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: KLP.text, textAlign: 'right' }}>
          {value}
        </span>
      </div>
    ) : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.6)',
        zIndex: 1500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <style>{`@keyframes klpPop { from { opacity:0; transform: scale(0.9); } to { opacity:1; transform: scale(1); } }`}</style>
      <div
        onClick={stop}
        style={{
          background: 'white',
          borderRadius: 18,
          // Alan iki katına çıktı: 560 px'e sığdırılan akış, önizlemeli
          // görsel ve videoyu taşıyamıyordu.
          width: 'min(1120px, calc(100vw - 32px))',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 30px 60px rgba(0,0,0,0.32)',
          animation: 'klpPop .18s ease',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Resimle uyumlu renkli banner */}
        <div
          style={{
            position: 'relative',
            height: 120,
            background: `linear-gradient(135deg, ${g1}, ${g2})`,
            overflow: 'hidden',
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
          }}
        >
          {hasLogo && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url("${club.logoURL}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(9px)',
                transform: 'scale(1.2)',
                opacity: 0.55,
              }}
            />
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(135deg, ${g1}aa, ${g2}aa)`,
            }}
          />
          <button
            onClick={onClose}
            title="Kapat"
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'rgba(255,255,255,0.9)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <KlpIcon path="M18 6L6 18M6 6l12 12" size={16} color={KLP.text} />
          </button>
        </div>

        <div style={{ marginTop: -48, display: 'flex', justifyContent: 'center' }}>
          <div style={{ border: '4px solid white', borderRadius: '50%', background: 'white' }}>
            <LogoAvatar club={club} size={88} />
          </div>
        </div>

        <div
          style={{
            padding: '10px 24px 24px',
            display: 'grid',
            gridTemplateColumns: ikiSutun ? 'minmax(280px, 340px) 1fr' : '1fr',
            gap: ikiSutun ? 28 : 0,
            alignItems: 'start',
          }}
        >
          {/* Sol sütun geniş ekranda yerinde kalır: akış kaydırılırken
              topluluğun kimliği ve toplu mesaj kutusu görünür durur. */}
          <div
            style={
              ikiSutun ? { position: 'sticky', top: 0, alignSelf: 'start', minWidth: 0 } : undefined
            }
          >
            <h2
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: KLP.primary,
                textAlign: 'center',
                margin: '4px 0 2px',
              }}
            >
              {club.name}
            </h2>
            {club.department && (
              <p style={{ fontSize: 13, color: KLP.textMuted, textAlign: 'center', margin: 0 }}>
                {club.department}
              </p>
            )}

            {/* İstatistik + takip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                margin: '16px 0',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  padding: '10px 22px',
                  borderRadius: 12,
                  background: KLP.accentLight,
                  border: `1px solid ${KLP.accent}30`,
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 800, color: KLP.accent }}>
                  {followers.length}
                </div>
                <div style={{ fontSize: 11, color: KLP.textMuted, fontWeight: 600 }}>Takipçi</div>
              </div>
              {isStudent && (
                <button
                  onClick={onToggleFollow}
                  style={{
                    padding: '11px 22px',
                    borderRadius: 24,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: isFollowing ? `1px solid ${KLP.green}` : 'none',
                    background: isFollowing ? KLP.greenLight : KLP.accent,
                    color: isFollowing ? KLP.green : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {isFollowing ? (
                    <>
                      <KlpIcon path="M5 13l4 4L19 7" size={15} color={KLP.green} /> Takiptesin
                    </>
                  ) : (
                    <>
                      <KlpIcon path="M12 5v14M5 12h14" size={15} color="white" /> Takip Et
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Bilgiler */}
            <div
              style={{
                borderTop: `1px solid ${KLP.border}`,
                borderBottom: `1px solid ${KLP.border}`,
                padding: '4px 0',
              }}
            >
              {infoRow('Akademik Danışman', club.advisor)}
              {infoRow('Başkan', club.president)}
              {infoRow('Kuruluş', club.foundedYear || club.established)}
            </div>

            {/* Sosyal */}
            {(club.whatsapp || club.instagram) && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
                {club.whatsapp && (
                  <a
                    href={normalizeSocialUrl(club.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 10,
                      background: '#25D366',
                      color: 'white',
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    WhatsApp
                  </a>
                )}
                {club.instagram && (
                  <a
                    href={normalizeSocialUrl(club.instagram)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 10,
                      background: 'linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)',
                      color: 'white',
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Instagram
                  </a>
                )}
              </div>
            )}

            {/* Sahip akademisyen / yetkili araçları */}
            {canManage && (
              <div style={{ marginTop: 20 }}>
                {/* Takipçi listesi açılır kapanır: uzun liste, altındaki toplu
                  mesaj kutusunu ekrandan itiyordu. */}
                <button
                  onClick={() => setTakipciAcik((v) => !v)}
                  disabled={followers.length === 0}
                  aria-expanded={takipciAcik}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${KLP.border}`,
                    background: takipciAcik ? KLP.accentLight : '#fff',
                    color: KLP.primary,
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    cursor: followers.length === 0 ? 'default' : 'pointer',
                    marginBottom: takipciAcik ? 0 : 14,
                  }}
                >
                  <span>Takipçiler</span>
                  <span
                    style={{
                      padding: '1px 9px',
                      borderRadius: 999,
                      background: KLP.accent,
                      color: '#fff',
                      fontSize: 11.5,
                    }}
                  >
                    {followers.length}
                  </span>
                  {followers.length > 0 && (
                    <span style={{ marginLeft: 'auto', display: 'flex' }}>
                      <KlpIcon
                        path={takipciAcik ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                        size={16}
                        color={KLP.textMuted}
                      />
                    </span>
                  )}
                </button>
                {followers.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: KLP.textMuted, margin: '8px 0 14px' }}>
                    Henüz takipçi yok.
                  </p>
                ) : (
                  takipciAcik && (
                    <div
                      style={{
                        maxHeight: 240,
                        overflowY: 'auto',
                        border: `1px solid ${KLP.border}`,
                        borderTop: 'none',
                        borderRadius: '0 0 10px 10px',
                        marginBottom: 14,
                      }}
                    >
                      {followers.map((f) => (
                        <div
                          key={f.id || f.studentNumber}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            borderBottom: `1px solid ${KLP.border}`,
                            fontSize: 13,
                            color: KLP.text,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 11,
                              color: KLP.textMuted,
                              minWidth: 78,
                            }}
                          >
                            {f.studentNumber}
                          </span>
                          {resolveName(f)}
                        </div>
                      ))}
                    </div>
                  )
                )}

                <div style={{ fontSize: 13, fontWeight: 700, color: KLP.primary, marginBottom: 6 }}>
                  Toplu Mesaj Gönder
                </div>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={3}
                  placeholder="Takipçilere gönderilecek bildirim metni…"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${KLP.border}`,
                    fontSize: 13,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    onClick={send}
                    disabled={sending || !bulkText.trim() || followers.length === 0}
                    style={{
                      padding: '9px 18px',
                      borderRadius: 10,
                      border: 'none',
                      background: KLP.primary,
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor:
                        sending || !bulkText.trim() || followers.length === 0
                          ? 'not-allowed'
                          : 'pointer',
                      opacity: sending || !bulkText.trim() || followers.length === 0 ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <KlpIcon path="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" size={14} color="white" />
                    {sending ? 'Gönderiliyor…' : 'Gönder'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Topluluk akışı (feed) — sahip akademisyen gönderi paylaşır, herkes görür */}
          <ClubFeed
            club={club}
            canPost={canPost}
            canManage={canManage}
            currentUser={currentUser}
            followers={followers}
          />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Ana modül
// ══════════════════════════════════════════════════════════════
function OgrenciKulupleriApp({ currentUser, activeDepartment, departmentInfo }) {
  const responsive = window.useResponsive();
  const FACULTY_DEPARTMENTS = window.DEPARTMENTS || [];

  const [clubs, setClubs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [students, setStudents] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [editing, setEditing] = useState(null); // null = kapalı, {} = yeni, {...} = mevcut
  const [detailClub, setDetailClub] = useState(null); // detay modalı için seçilen topluluk
  const [msg, setMsg] = useState({ text: '', kind: '' });

  const isAdmin = currentUser?.role === 'admin';
  const isDeptManager = currentUser?.role === 'bolum_yetkilisi';
  const isProfessor = currentUser?.role === 'professor';
  const isStudent = currentUser?.role === 'student';
  const myStudentNumber = currentUser?.studentNumber || '';
  const myName = currentUser?.name || currentUser?.identifier || '';
  // Bölüm yetkilisinin bölümü = aktif bölüm (app-shell'den gelir)
  const myDepartmentId = activeDepartment || '';
  const myDepartmentName = departmentInfo?.name || '';

  // Sahip akademisyen: adı topluluğun danışmanıyla (advisor) eşleşen akademisyen.
  const ownsClub = (club) => isProfessor && club && advisorMatchesName(club.advisor, myName);

  const canEditClub = (club) => {
    if (isAdmin) return true;
    if (ownsClub(club)) return true; // sahip akademisyen yalnız kendi topluluğunu
    if (isDeptManager && club) {
      // departmentId varsa onunla, yoksa (seed verisi) bölüm adıyla eşleştir
      if (club.departmentId && myDepartmentId) return club.departmentId === myDepartmentId;
      if (myDepartmentName && club.department === myDepartmentName) return true;
    }
    return false;
  };

  // Bir topluluğun takipçileri + takipçi sayısı + öğrencinin takip durumu
  const followersOf = (clubId) => followers.filter((f) => String(f.clubId) === String(clubId));
  const followerCountOf = (clubId) => followersOf(clubId).length;
  const isFollowing = (clubId) =>
    followers.some(
      (f) =>
        String(f.clubId) === String(clubId) && String(f.studentNumber) === String(myStudentNumber)
    );
  const canCreate = isAdmin || isDeptManager;
  // Topluluk dokümanları: ekleme/silme/güncelleme YALNIZCA üniversite yetkilisinde.
  // (role==='admin' fakülte/bölüm yöneticilerini de kapsadığından isUniversityAdmin bayrağı kullanılır.)
  const isUniversityAdmin = !!currentUser?.isUniversityAdmin;
  const canEditDocuments = isUniversityAdmin;

  const showMsg = (text, kind = 'info') => {
    setMsg({ text, kind });
    setTimeout(() => setMsg({ text: '', kind: '' }), 3000);
  };

  // Veri yükleme
  const loadAll = async () => {
    setLoading(true);
    try {
      // Gönderiler de burada okunur: giriş ekranındaki duyuru ve etkinlik
      // panoları BÜTÜN toplulukların paylaşımlarını gösterir — öğrencinin
      // aradığı şey topluluk değil, toplulukların ürettiği şeydir.
      const [c, d, p, s, f, g] = await Promise.all([
        window.apiRead('student_clubs'),
        window.apiRead('club_documents'),
        window.apiRead('professors'),
        window.apiRead('students'),
        window.apiRead('club_followers').catch(() => []),
        window.apiRead('club_posts').catch(() => []),
      ]);
      setClubs((c || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr')));
      setDocuments(
        (d || []).slice().sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr'))
      );
      setProfessors(p || []);
      setStudents(s || []);
      setFollowers(f || []);
      setPosts(
        (g || [])
          .slice()
          .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      );
    } catch (e) {
      console.error('Kulüpler yüklenemedi:', e);
      showMsg('Veriler yüklenirken hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Realtime: db:write event'i ile cache invalidate ve yeniden yükle
  useEffect(() => {
    const onWrite = (e) => {
      const cols = e?.detail?.collections || [];
      if (
        cols.includes('student_clubs') ||
        cols.includes('club_documents') ||
        cols.includes('club_followers') ||
        cols.includes('club_posts')
      ) {
        loadAll();
      }
    };
    window.addEventListener('realtime:student_clubs', onWrite);
    window.addEventListener('realtime:club_documents', onWrite);
    window.addEventListener('realtime:club_followers', onWrite);
    window.addEventListener('realtime:club_posts', onWrite);
    return () => {
      window.removeEventListener('realtime:student_clubs', onWrite);
      window.removeEventListener('realtime:club_documents', onWrite);
      window.removeEventListener('realtime:club_followers', onWrite);
      window.removeEventListener('realtime:club_posts', onWrite);
    };
  }, []);

  // Filtreleme
  const departments = useMemo(() => {
    const set = new Set(clubs.map((c) => c.department).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [clubs]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return clubs.filter((c) => {
      if (filterDept && c.department !== filterDept) return false;
      if (!s) return true;
      return (
        (c.name || '').toLowerCase().includes(s) ||
        (c.advisor || '').toLowerCase().includes(s) ||
        (c.president || '').toLowerCase().includes(s) ||
        (c.department || '').toLowerCase().includes(s)
      );
    });
  }, [clubs, search, filterDept]);

  // Kaydet (yeni veya güncelleme)
  const handleSave = async (data) => {
    try {
      if (editing && editing.id) {
        await window.DBWrite.set('student_clubs', editing.id, data, true);
        showMsg('Topluluk güncellendi.', 'success');
      } else {
        await window.DBWrite.add('student_clubs', data);
        showMsg('Topluluk eklendi.', 'success');
      }
      setEditing(null);
      await loadAll();
    } catch (e) {
      console.error(e);
      showMsg('Kayıt hatası: ' + e.message, 'error');
    }
  };

  const handleDelete = async (club) => {
    if (!confirm(`"${club.name}" silinsin mi?`)) return;
    try {
      await window.DBWrite.remove('student_clubs', club.id);
      showMsg('Topluluk silindi.', 'success');
      await loadAll();
    } catch (e) {
      showMsg('Silme hatası: ' + e.message, 'error');
    }
  };

  // Öğrenci takip et / takibi bırak. Kayıt id'si (clubId__öğrenciNo) sabittir;
  // sahiplik sunucuda JWT kimliğine sabitlenir.
  const handleToggleFollow = async (club) => {
    if (!isStudent || !myStudentNumber) {
      showMsg('Takip için öğrenci girişi gerekli.', 'error');
      return;
    }
    const docId = `${club.id}__${myStudentNumber}`;
    try {
      if (isFollowing(club.id)) {
        await window.DBWrite.remove('club_followers', docId);
      } else {
        const studentName =
          `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || myName;
        await window.DBWrite.set(
          'club_followers',
          docId,
          {
            clubId: club.id,
            clubName: club.name || '',
            studentNumber: myStudentNumber,
            studentName,
            at: new Date().toISOString(),
          },
          true
        );
      }
      await loadAll();
    } catch (e) {
      showMsg('Takip işlemi başarısız: ' + e.message, 'error');
    }
  };

  // Sahip akademisyen / yetkili → topluluğu takip eden öğrencilere toplu bildirim.
  const handleBulkMessage = async (club, text) => {
    const list = followersOf(club.id);
    if (list.length === 0) {
      showMsg('Bu topluluğun takipçisi yok.', 'error');
      return;
    }
    try {
      let sent = 0;
      for (const f of list) {
        if (!f.studentNumber) continue;
        if (window.Notify && window.Notify.send) {
          await window.Notify.send({
            recipientType: 'user',
            recipientId: String(f.studentNumber),
            module: 'topluluk',
            type: 'bilgi',
            title: club.name || 'Topluluk',
            body: text,
            meta: { clubId: club.id },
          });
        } else if (window.StudentNotifier && window.StudentNotifier._addNotification) {
          await window.StudentNotifier._addNotification(f.studentNumber, {
            module: 'topluluk',
            type: 'bilgi',
            title: club.name || 'Topluluk',
            body: text,
          });
        }
        sent++;
      }
      showMsg(`${sent} takipçiye mesaj gönderildi.`, 'success');
    } catch (e) {
      showMsg('Mesaj gönderilemedi: ' + e.message, 'error');
    }
  };

  // Logo upload
  const handleLogoChange = async (club, file) => {
    try {
      if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
        showMsg('Logo yalnızca PNG veya JPEG olabilir.', 'error');
        return;
      }
      const form = new FormData();
      // Klasörü query param olarak gönderiyoruz — multer destination'ı
      // multipart body'den önce okuyabilsin (field sırasından bağımsız).
      form.append('folder', 'student_clubs/logos');
      form.append('file', file);
      const res = await fetch(
        '/api/files/upload?folder=' + encodeURIComponent('student_clubs/logos'),
        {
          method: 'POST',
          body: form,
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Yükleme başarısız (HTTP ' + res.status + ')');
      const json = await res.json();
      await window.DBWrite.set('student_clubs', club.id, { logoURL: json.downloadURL }, true);
      showMsg('Logo güncellendi.', 'success');
      await loadAll();
    } catch (e) {
      console.error(e);
      showMsg('Logo yüklenemedi: ' + e.message, 'error');
    }
  };

  // Döküman upload (dosya)
  const handleDocUpload = async (file) => {
    try {
      const form = new FormData();
      form.append('folder', 'student_clubs/docs');
      form.append('file', file);
      const res = await fetch(
        '/api/files/upload?folder=' + encodeURIComponent('student_clubs/docs'),
        {
          method: 'POST',
          body: form,
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Yükleme başarısız (HTTP ' + res.status + ')');
      const json = await res.json();
      await window.DBWrite.add('club_documents', {
        title: json.originalName || file.name,
        url: json.downloadURL,
        kind: 'file',
        size: json.size || 0,
        fileName: json.fileName || '',
      });
      showMsg('Döküman eklendi.', 'success');
      await loadAll();
    } catch (e) {
      showMsg('Döküman yüklenemedi: ' + e.message, 'error');
    }
  };

  // Döküman ekle (harici link)
  const handleDocAddLink = async ({ title, url }) => {
    try {
      await window.DBWrite.add('club_documents', { title, url, kind: 'link' });
      showMsg('Link eklendi.', 'success');
      await loadAll();
    } catch (e) {
      showMsg('Link eklenemedi: ' + e.message, 'error');
    }
  };

  // Döküman sil
  const handleDocDelete = async (doc) => {
    if (!confirm(`"${doc.title}" silinsin mi?`)) return;
    try {
      await window.DBWrite.remove('club_documents', doc.id);
      // Yüklenmiş dosya ise diskten de sil
      if (doc.kind === 'file' && doc.fileName) {
        const [folder, ...rest] = doc.fileName.split('/');
        const filename = rest.join('/');
        if (folder && filename) {
          await fetch(`/api/files/${folder}/${filename}`, {
            method: 'DELETE',
            credentials: 'include',
          }).catch(() => {});
        }
      }
      showMsg('Döküman silindi.', 'success');
      await loadAll();
    } catch (e) {
      showMsg('Silme hatası: ' + e.message, 'error');
    }
  };

  // Panodaki bir satıra basınca o topluluğun sayfası açılır: duyuruyu
  // görüp topluluğu aramak zorunda kalmamalı.
  const acKulup = (clubId) => {
    const k = clubs.find((c) => String(c.id) === String(clubId));
    if (k) setDetailClub(k);
  };
  // Gönderi kaydında kulüp adı var; yoksa listeden çözülür (eski kayıtlar).
  const kulupAdiOf = (p) =>
    p.clubName || (clubs.find((c) => String(c.id) === String(p.clubId)) || {}).name || 'Topluluk';

  // Stil: kart-grid (her satırda 5 kart — masaüstü; tablet 3; mobil 1)
  const gridCols = responsive.val('1fr', 'repeat(3, 1fr)', 'repeat(5, 1fr)');

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: 60,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: '3px solid #E5E7EB',
              borderTopColor: KLP.primary,
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: KLP.textMuted, fontSize: 14 }}>Topluluklar yükleniyor…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      {React.createElement(window.CakuBanner, {
        title: 'Öğrenci Toplulukları',
        subtitle:
          'Çankırı Karatekin Üniversitesi öğrenci toplulukları rehberi' +
          (canCreate ? ' • Yetkili olduğunuz toplulukları düzenleyebilirsiniz' : ''),
      })}

      {/* Status mesajı */}
      {msg.text && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            background:
              msg.kind === 'error'
                ? KLP.redLight
                : msg.kind === 'success'
                  ? KLP.greenLight
                  : KLP.blueLight,
            color: msg.kind === 'error' ? KLP.red : msg.kind === 'success' ? KLP.green : KLP.blue,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {msg.text}
        </div>
      )}

      {/* ── ÜÇ PANO ──
          Duyurular · Etkinlikler · Hızlı Erişim. Üçü de bütün toplulukları
          kapsar; bir duyuruya basınca o topluluğun sayfası açılır. Dar
          ekranda alt alta akar. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: responsive.val('1fr', '1fr', 'repeat(3, 1fr)'),
          gap: 14,
          marginBottom: 20,
          // Üç pano eşit yükseklikte durur: içerikleri farklı uzunlukta
          // olduğu için kenarları kırık bir merdivene dönüyordu.
          alignItems: 'stretch',
        }}
      >
        <DuyuruPanosu gonderiler={posts} kulupAdi={kulupAdiOf} onAc={(p) => acKulup(p.clubId)} />
        <EtkinlikPanosu gonderiler={posts} kulupAdi={kulupAdiOf} onAc={(p) => acKulup(p.clubId)} />
        <DocumentsPanel
          documents={documents}
          canEdit={canEditDocuments}
          onUpload={handleDocUpload}
          onAddLink={handleDocAddLink}
          onDelete={handleDocDelete}
        />
      </div>

      {/* Filtre + Arama + Yeni butonu */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 16,
          alignItems: 'center',
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Topluluk, danışman, başkan veya bölüm ara…"
          style={{
            flex: '1 1 240px',
            minWidth: 0,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid ' + KLP.border,
            fontSize: 13,
            outline: 'none',
            fontFamily: "'Inter', sans-serif",
            background: 'white',
          }}
        />
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid ' + KLP.border,
            fontSize: 13,
            outline: 'none',
            background: 'white',
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            minWidth: 180,
          }}
        >
          <option value="">Tüm Bölümler ({clubs.length})</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {canCreate && (
          <button
            onClick={() => setEditing({})}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: 'none',
              background: KLP.primary,
              color: 'white',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <KlpIcon path="M12 5v14M5 12h14" size={15} />
            Yeni Topluluk
          </button>
        )}
      </div>

      {/* Kart Grid — beşerli */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: 'center',
            color: KLP.textMuted,
            background: 'white',
            borderRadius: 12,
            border: '1px solid ' + KLP.border,
          }}
        >
          Filtreye uyan topluluk bulunamadı.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 14 }}>
          {filtered.map((c) => (
            <ClubCard
              key={c.id}
              club={c}
              canEdit={canEditClub(c)}
              onEdit={() => setEditing(c)}
              onDelete={() => handleDelete(c)}
              onLogoChange={(file) => handleLogoChange(c, file)}
              onOpen={() => setDetailClub(c)}
              followerCount={followerCountOf(c.id)}
              isFollowing={isFollowing(c.id)}
              isStudent={isStudent}
              onToggleFollow={() => handleToggleFollow(c)}
            />
          ))}
        </div>
      )}

      {/* Form modalı */}
      {editing && (
        <ClubForm
          initial={editing.id ? editing : null}
          isAdmin={isAdmin}
          lockedDepartmentId={
            isAdmin ? '' : isDeptManager ? myDepartmentId : editing.departmentId || myDepartmentId
          }
          departments={FACULTY_DEPARTMENTS}
          professors={professors}
          students={students}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Detay modalı — karta tıklayınca büyür, ekrana ortalanır */}
      {detailClub && (
        <ClubDetailModal
          club={detailClub}
          followers={followersOf(detailClub.id)}
          students={students}
          isStudent={isStudent}
          isFollowing={isFollowing(detailClub.id)}
          onToggleFollow={() => handleToggleFollow(detailClub)}
          canManage={canEditClub(detailClub)}
          onSendBulk={(text) => handleBulkMessage(detailClub, text)}
          currentUser={currentUser}
          onClose={() => setDetailClub(null)}
        />
      )}

      <div style={{ height: 40 }} />
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.OgrenciKulupleriApp = OgrenciKulupleriApp;
}
