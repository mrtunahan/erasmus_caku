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
// DocumentsPanel — Genel dökümanlar (yetkililer ekler, herkes okur)
// ══════════════════════════════════════════════════════════════
function DocumentsPanel({ documents, canEdit, onUpload, onAddLink, onDelete }) {
  const fileInputRef = useRef(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);

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

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 12,
        padding: 20,
        border: '1px solid ' + KLP.border,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <KlpIcon
            path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            size={20}
            color={KLP.primary}
          />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: KLP.primary, margin: 0 }}>
            Dökümanlar{' '}
            <span style={{ color: KLP.textMuted, fontWeight: 500, fontSize: 13 }}>
              ({documents.length})
            </span>
          </h2>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid ' + KLP.border,
                background: 'white',
                color: KLP.primary,
                fontSize: 12,
                fontWeight: 600,
                cursor: uploading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <KlpIcon
                path="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                size={14}
              />
              {uploading ? 'Yükleniyor…' : 'Dosya Yükle'}
            </button>
            <button
              onClick={() => setLinkMode(!linkMode)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid ' + KLP.border,
                background: linkMode ? KLP.accentLight : 'white',
                color: KLP.primary,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <KlpIcon
                path="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                size={14}
              />
              Link Ekle
            </button>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
          </div>
        )}
      </div>

      {canEdit && linkMode && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <input
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            placeholder="Belge başlığı"
            style={{
              flex: '1 1 200px',
              minWidth: 0,
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid ' + KLP.border,
              fontSize: 13,
              outline: 'none',
              fontFamily: "'Inter', sans-serif",
            }}
          />
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            style={{
              flex: '2 1 280px',
              minWidth: 0,
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid ' + KLP.border,
              fontSize: 13,
              outline: 'none',
              fontFamily: "'Inter', sans-serif",
            }}
          />
          <button
            onClick={submitLink}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: 'none',
              background: KLP.primary,
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ekle
          </button>
        </div>
      )}

      {documents.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: KLP.textMuted, fontSize: 13 }}>
          Henüz döküman eklenmemiş.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 10,
          }}
        >
          {documents.map((d) => (
            <div
              key={d.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                border: '1px solid ' + KLP.border,
                borderRadius: 8,
                background: '#FAFAFA',
              }}
            >
              <KlpIcon
                path={
                  d.kind === 'link'
                    ? 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1'
                    : 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                }
                size={16}
                color={KLP.primary}
              />
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  fontSize: 12.5,
                  color: KLP.text,
                  textDecoration: 'none',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={d.title}
              >
                {d.title}
              </a>
              {canEdit && (
                <button
                  onClick={() => onDelete(d)}
                  title="Sil"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <KlpIcon
                    path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                    size={13}
                    color={KLP.red}
                  />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
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
const FEED_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.svg,image/svg+xml';

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
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('duyuru');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const editorRef = useRef(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await window.apiRead('club_posts', { where: 'clubId:eq:s:' + club.id });
      const mine = (all || []).filter((p) => String(p.clubId) === String(club.id));
      mine.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      setPosts(mine);
    } catch (_) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [club.id]);

  useEffect(() => {
    load();
  }, [load]);

  const exec = (cmd) => {
    document.execCommand(cmd, false, null);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleFiles = async (e) => {
    const list = Array.from(e.target.files || []);
    e.target.value = '';
    if (!list.length) return;
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

  const submit = async () => {
    const content = editorRef.current ? editorRef.current.innerHTML.trim() : '';
    const plain = editorRef.current ? (editorRef.current.textContent || '').trim() : '';
    if (!plain && files.length === 0) {
      alert('Bir metin yazın veya dosya ekleyin.');
      return;
    }
    setPosting(true);
    try {
      await window.DBWrite.add('club_posts', {
        clubId: club.id,
        clubName: club.name || '',
        type,
        content,
        contentFormat: 'html',
        files,
        authorName: currentUser?.name || currentUser?.identifier || 'Topluluk',
        authorRole: currentUser?.role || '',
        createdAt: new Date().toISOString(),
      });

      // Takipçilere otomatik bildirim: yeni paylaşım çan menüsüne düşer.
      try {
        const typeLabel = (FEED_TYPES.find((x) => x.id === type) || {}).label || 'paylaşım';
        const snippet = plain.length > 90 ? plain.slice(0, 90) + '…' : plain;
        const body =
          snippet || (files.length ? files.length + ' dosya paylaşıldı' : 'Yeni paylaşım');
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

      if (editorRef.current) editorRef.current.innerHTML = '';
      setFiles([]);
      setType('duyuru');
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

  const tbBtn = {
    width: 30,
    height: 30,
    borderRadius: 6,
    border: '1px solid ' + KLP.border,
    background: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    color: KLP.text,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={{ marginTop: 20, borderTop: `1px solid ${KLP.border}`, paddingTop: 16 }}>
      <style>{`[contenteditable][data-placeholder]:empty:before{content:attr(data-placeholder);color:#9CA3AF;pointer-events:none;}`}</style>
      <div style={{ fontSize: 14, fontWeight: 700, color: KLP.primary, marginBottom: 12 }}>
        Topluluk Akışı
      </div>

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
            {FEED_TYPES.map((t) => {
              const on = type === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: '1px solid ' + (on ? t.color : KLP.border),
                    background: on ? t.bg : '#fff',
                    color: on ? t.color : KLP.textMuted,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Metin düzenleyici */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <button
              onClick={() => exec('bold')}
              title="Kalın"
              style={{ ...tbBtn, fontStyle: 'normal' }}
            >
              B
            </button>
            <button
              onClick={() => exec('italic')}
              title="İtalik"
              style={{ ...tbBtn, fontStyle: 'italic' }}
            >
              I
            </button>
            <button onClick={() => exec('insertUnorderedList')} title="Liste" style={tbBtn}>
              ☰
            </button>
          </div>
          <div
            ref={editorRef}
            contentEditable
            data-placeholder="Paylaşmak istediklerinizi yazın…"
            style={{
              minHeight: 80,
              border: `1px solid ${KLP.border}`,
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 13.5,
              outline: 'none',
              background: '#fff',
              lineHeight: 1.5,
            }}
          />

          {/* Eklenen dosyalar */}
          {files.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {files.map((f, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: KLP.accentLight,
                    color: KLP.primary,
                    fontSize: 12,
                    fontWeight: 600,
                    maxWidth: 220,
                  }}
                >
                  <span
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {f.name}
                  </span>
                  <button
                    onClick={() => removeFile(i)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: KLP.red,
                      padding: 0,
                      display: 'flex',
                    }}
                    title="Kaldır"
                  >
                    <KlpIcon path="M18 6L6 18M6 6l12 12" size={12} />
                  </button>
                </span>
              ))}
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
              accept={FEED_ACCEPT}
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
              {uploading ? 'Yükleniyor…' : 'Dosya Ekle (PDF/DOCX/XLSX/JPEG/PNG/SVG)'}
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
      ) : posts.length === 0 ? (
        <p style={{ fontSize: 12.5, color: KLP.textMuted, margin: 0 }}>Henüz paylaşım yok.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map((p) => {
            const t = FEED_TYPES.find((x) => x.id === p.type) || FEED_TYPES[0];
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
                      background: t.bg,
                      color: t.color,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {t.label}
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
                {p.content && (
                  <div
                    style={{ fontSize: 13.5, color: KLP.text, lineHeight: 1.55 }}
                    dangerouslySetInnerHTML={{ __html: p.content }}
                  />
                )}
                {Array.isArray(p.files) && p.files.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {p.files.map((f, i) => (
                      <a
                        key={i}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: `1px solid ${KLP.border}`,
                          background: '#fff',
                          color: KLP.primary,
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: 'none',
                          maxWidth: 220,
                        }}
                      >
                        <KlpIcon
                          path="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          size={14}
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
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
  const stop = (e) => e.stopPropagation();

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
          width: 'min(560px, calc(100vw - 32px))',
          maxHeight: '90vh',
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

        <div style={{ padding: '10px 24px 24px' }}>
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
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: KLP.primary,
                  marginBottom: 8,
                }}
              >
                Takipçiler ({followers.length})
              </div>
              {followers.length === 0 ? (
                <p style={{ fontSize: 12.5, color: KLP.textMuted, margin: '0 0 12px' }}>
                  Henüz takipçi yok.
                </p>
              ) : (
                <div
                  style={{
                    maxHeight: 140,
                    overflowY: 'auto',
                    border: `1px solid ${KLP.border}`,
                    borderRadius: 10,
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
      const [c, d, p, s, f] = await Promise.all([
        window.apiRead('student_clubs'),
        window.apiRead('club_documents'),
        window.apiRead('professors'),
        window.apiRead('students'),
        window.apiRead('club_followers').catch(() => []),
      ]);
      setClubs((c || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr')));
      setDocuments(
        (d || []).slice().sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr'))
      );
      setProfessors(p || []);
      setStudents(s || []);
      setFollowers(f || []);
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
        cols.includes('club_followers')
      ) {
        loadAll();
      }
    };
    window.addEventListener('realtime:student_clubs', onWrite);
    window.addEventListener('realtime:club_documents', onWrite);
    window.addEventListener('realtime:club_followers', onWrite);
    return () => {
      window.removeEventListener('realtime:student_clubs', onWrite);
      window.removeEventListener('realtime:club_documents', onWrite);
      window.removeEventListener('realtime:club_followers', onWrite);
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

      {/* Dökümanlar paneli */}
      <DocumentsPanel
        documents={documents}
        canEdit={canEditDocuments}
        onUpload={handleDocUpload}
        onAddLink={handleDocAddLink}
        onDelete={handleDocDelete}
      />

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
