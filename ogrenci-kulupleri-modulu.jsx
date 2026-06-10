// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Öğrenci Kulüpleri (Toplulukları) Modülü
//   • Tüm roller görür (admin / bolum_yetkilisi / professor / student)
//   • Düzenleme/silme/oluşturma: admin tüm kulüpler için,
//     bolum_yetkilisi yalnızca kendi bölümüne ait kulüpler için.
//   • Logo: yüklenmediyse topluluk adının baş harflerinden renkli avatar.
//   • Dökümanlar sekmesi: yetkililer hem dosya upload eder hem de
//     harici URL ekler (Karatekin sitesindeki dökümanlar için).
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useRef } = React;

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
function ClubCard({ club, canEdit, onEdit, onDelete, onLogoChange }) {
  const [hover, setHover] = useState(false);
  const fileInputRef = useRef(null);

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

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'white',
        borderRadius: 16,
        border: `1px solid ${hover ? KLP.accent : KLP.border}`,
        padding: '20px 16px 16px',
        boxShadow: hover ? '0 8px 24px rgba(27,42,74,0.10)' : '0 1px 2px rgba(0,0,0,0.04)',
        transition: 'all 0.2s',
        transform: hover ? 'translateY(-2px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {canEdit && (
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 }}>
          <button
            onClick={onEdit}
            title="Düzenle"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid ' + KLP.border,
              background: 'white',
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
            onClick={onDelete}
            title="Sil"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid ' + KLP.redLight,
              background: 'white',
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

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <LogoAvatar club={club} size={84} editable={canEdit} onClick={triggerLogoUpload} />
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

      <div style={{ height: 1, background: KLP.border, margin: '12px 0 10px' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Field label="Akademik Danışman" value={club.advisor} />
        <Field label="Başkan" value={club.president} />
        <Field label="Bölüm" value={club.department} />
      </div>
    </div>
  );
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
// Ana modül
// ══════════════════════════════════════════════════════════════
function OgrenciKulupleriApp({ currentUser, activeDepartment, departmentInfo }) {
  const responsive = window.useResponsive();
  const FACULTY_DEPARTMENTS = window.DEPARTMENTS || [];

  const [clubs, setClubs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [editing, setEditing] = useState(null); // null = kapalı, {} = yeni, {...} = mevcut
  const [msg, setMsg] = useState({ text: '', kind: '' });

  const isAdmin = currentUser?.role === 'admin';
  const isDeptManager = currentUser?.role === 'bolum_yetkilisi';
  // Bölüm yetkilisinin bölümü = aktif bölüm (app-shell'den gelir)
  const myDepartmentId = activeDepartment || '';
  const myDepartmentName = departmentInfo?.name || '';

  const canEditClub = (club) => {
    if (isAdmin) return true;
    if (isDeptManager && club) {
      // departmentId varsa onunla, yoksa (seed verisi) bölüm adıyla eşleştir
      if (club.departmentId && myDepartmentId) return club.departmentId === myDepartmentId;
      if (myDepartmentName && club.department === myDepartmentName) return true;
    }
    return false;
  };
  const canCreate = isAdmin || isDeptManager;
  const canEditDocuments = isAdmin || isDeptManager;

  const showMsg = (text, kind = 'info') => {
    setMsg({ text, kind });
    setTimeout(() => setMsg({ text: '', kind: '' }), 3000);
  };

  // Veri yükleme
  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, d, p, s] = await Promise.all([
        window.apiRead('student_clubs'),
        window.apiRead('club_documents'),
        window.apiRead('professors'),
        window.apiRead('students'),
      ]);
      setClubs((c || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr')));
      setDocuments(
        (d || []).slice().sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr'))
      );
      setProfessors(p || []);
      setStudents(s || []);
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
      if (cols.includes('student_clubs') || cols.includes('club_documents')) {
        loadAll();
      }
    };
    window.addEventListener('realtime:student_clubs', onWrite);
    window.addEventListener('realtime:club_documents', onWrite);
    return () => {
      window.removeEventListener('realtime:student_clubs', onWrite);
      window.removeEventListener('realtime:club_documents', onWrite);
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
      <div style={{ marginBottom: 20 }}>
        <h1
          style={{
            fontSize: responsive.val(20, 24, 28),
            fontWeight: 700,
            color: KLP.primary,
            margin: 0,
          }}
        >
          Öğrenci Toplulukları
        </h1>
        <p style={{ fontSize: 13, color: KLP.textMuted, marginTop: 4 }}>
          Çankırı Karatekin Üniversitesi öğrenci toplulukları rehberi
          {canCreate ? ' • Yetkili olduğunuz toplulukları düzenleyebilirsiniz' : ''}
        </p>
      </div>

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
            />
          ))}
        </div>
      )}

      {/* Form modalı */}
      {editing && (
        <ClubForm
          initial={editing.id ? editing : null}
          isAdmin={isAdmin}
          lockedDepartmentId={isDeptManager && !isAdmin ? myDepartmentId : ''}
          departments={FACULTY_DEPARTMENTS}
          professors={professors}
          students={students}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      <div style={{ height: 40 }} />
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.OgrenciKulupleriApp = OgrenciKulupleriApp;
}
