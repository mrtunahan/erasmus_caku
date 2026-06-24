// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Üniversite Yönetimi Modülü
//   Yalnızca isUniversityAdmin bayraklı akademisyene açıktır.
//   • Fakülte oluştur / düzenle / sil (faculties koleksiyonu)
//   • Her fakülteye "Fakülte Yetkilisi" ata (bir akademisyenin
//     isFacultyManager + facultyId bayraklarını set eder)
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const UNV = {
  primary: '#1B2A4A',
  accent: '#8B2635',
  accentPale: '#FBEAEC',
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

const UIcon = ({ path, size = 18, color = 'currentColor' }) => (
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
    {Array.isArray(path) ? path.map((d, i) => <path key={i} d={d} />) : <path d={path} />}
  </svg>
);

const uInput = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid ' + UNV.border,
  fontSize: 13,
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
  boxSizing: 'border-box',
  background: 'white',
};
const uLabel = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: UNV.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
};
const uCard = {
  background: 'white',
  borderRadius: 12,
  border: '1px solid ' + UNV.border,
  padding: 18,
};

// Akademisyen arama-seç (serbest seçim, isim listesi DB'den)
function ProfPicker({ professors, onPick, placeholder }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase('tr');
    if (!s) return professors.slice(0, 40);
    return professors
      .filter((p) => (p.name || '').toLocaleLowerCase('tr').includes(s))
      .slice(0, 40);
  }, [q, professors]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder || 'Akademisyen ara…'}
        style={uInput}
      />
      {open && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'white',
            border: '1px solid ' + UNV.border,
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {filtered.map((p) => (
            <div
              key={p.id}
              onMouseDown={() => {
                onPick(p);
                setQ('');
                setOpen(false);
              }}
              style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, color: UNV.text }}
              onMouseEnter={(e) => (e.currentTarget.style.background = UNV.accentPale)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
            >
              {p.name}
              {p.department ? (
                <span style={{ color: UNV.textMuted, fontSize: 11, marginLeft: 6 }}>
                  {p.department}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UnvYonetimiApp({ currentUser }) {
  const responsive = window.useResponsive ? window.useResponsive() : { val: (_a, _b, c) => c };
  const [faculties, setFaculties] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', kind: '' });
  const [editing, setEditing] = useState(null); // {} yeni, {...} düzenle
  const [form, setForm] = useState({ name: '', shortName: '', universityId: 'caku' });
  // Şifre sıfırlama modalı: { prof, password } veya null
  const [pwReset, setPwReset] = useState(null);
  // "Bu fakülteye yeni akademisyen oluştur" formu:
  // { facultyId, facultyName, name, title } veya null
  const [newProfForm, setNewProfForm] = useState(null);

  const isUniversityAdmin = !!currentUser?.isUniversityAdmin;

  const showMsg = (text, kind = 'success') => {
    setMsg({ text, kind });
    setTimeout(() => setMsg({ text: '', kind: '' }), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, u, p] = await Promise.all([
        window.apiRead('faculties'),
        window.apiRead('universities'),
        window.apiRead('professors'),
      ]);
      setFaculties(
        (f || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'))
      );
      setUniversities(u || []);
      setProfessors(
        (p || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'))
      );
    } catch (e) {
      console.error('Üniversite yönetimi yüklenemedi:', e);
      showMsg('Veriler yüklenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const h = () => load();
    ['faculties', 'professors'].forEach((c) => window.addEventListener('realtime:' + c, h));
    return () =>
      ['faculties', 'professors'].forEach((c) => window.removeEventListener('realtime:' + c, h));
  }, [load]);

  const openNew = () => {
    setForm({ name: '', shortName: '', universityId: universities[0]?.id || 'caku' });
    setEditing({});
  };
  const openEdit = (f) => {
    setForm({
      name: f.name || '',
      shortName: f.shortName || '',
      universityId: f.universityId || 'caku',
    });
    setEditing(f);
  };

  const saveFaculty = async () => {
    if (!form.name.trim()) {
      showMsg('Fakülte adı zorunludur.', 'error');
      return;
    }
    try {
      const data = {
        name: form.name.trim(),
        shortName: form.shortName.trim() || form.name.trim(),
        universityId: form.universityId || 'caku',
      };
      if (editing && editing.id) await window.DBWrite.set('faculties', editing.id, data, true);
      else await window.DBWrite.add('faculties', data);
      setEditing(null);
      await load();
      showMsg('Fakülte kaydedildi.');
    } catch (e) {
      showMsg('Kayıt hatası: ' + e.message, 'error');
    }
  };

  const deleteFaculty = async (f) => {
    if (!confirm(`"${f.name}" fakültesi silinsin mi? (Bölümler ayrı silinmez)`)) return;
    try {
      await window.DBWrite.remove('faculties', f.id);
      await load();
      showMsg('Fakülte silindi.');
    } catch (e) {
      showMsg('Silme hatası: ' + e.message, 'error');
    }
  };

  const assignManager = async (faculty, prof) => {
    try {
      await window.DBWrite.set(
        'professors',
        prof.id,
        { isFacultyManager: true, facultyId: faculty.id },
        true
      );
      await load();
      showMsg(`${prof.name} → ${faculty.name} fakülte yetkilisi yapıldı.`);
    } catch (e) {
      showMsg('Atama hatası: ' + e.message, 'error');
    }
  };

  const revokeManager = async (prof) => {
    if (!confirm(`${prof.name} fakülte yetkiliğinden alınsın mı?`)) return;
    try {
      await window.DBWrite.set('professors', prof.id, { isFacultyManager: false }, true);
      await load();
      showMsg('Fakülte yetkiliği kaldırıldı.');
    } catch (e) {
      showMsg('İşlem hatası: ' + e.message, 'error');
    }
  };

  const managersOf = (facultyId) =>
    professors.filter((p) => p.isFacultyManager && p.facultyId === facultyId);

  // Fakülte yetkilisi şifresini sıfırla — backend /api/auth/change-password
  // role='professor', identifier=name. Tunahan üniversite yetkilisi (admin
  // tokenı yok ama akademisyen tokenı var; backend !isAdmin yolu authUser
  // kontrolü yapar). Direkt admin reset endpoint'i daha güvenli ama mevcut
  // sistemde role='professor' + admin=true alternatifi var. En basitini
  // kullanıyoruz: değiştiren sadece şifreyi belirler.
  const resetManagerPassword = async () => {
    if (!pwReset || !pwReset.password) return;
    if (pwReset.password.length < 6) {
      showMsg('Şifre en az 6 karakter olmalıdır.', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('caku_auth_token') || '';
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: 'professor',
          identifier: pwReset.prof.name,
          newPassword: pwReset.password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg(`${pwReset.prof.name} şifresi sıfırlandı.`);
        setPwReset(null);
      } else {
        showMsg('Şifre sıfırlanamadı: ' + (data.error || 'Bilinmeyen hata'), 'error');
      }
    } catch (e) {
      showMsg('Sunucu hatası: ' + e.message, 'error');
    }
  };

  // Bu fakülteye yeni akademisyen oluştur (Fakülte Yönetimi'ndeki ile aynı
  // mantık ama buradan üniversite yetkilisi, kendi fakültesi olmasa bile
  // herhangi bir fakülteye akademisyen yaratabilir). Opsiyonel olarak aynı
  // anda 'Fakülte Yetkilisi' bayrağıyla atar — atayacak hiç akademisyen
  // yokken zincirin başlaması için kritik.
  const createProfInFaculty = async () => {
    if (!newProfForm || !newProfForm.name?.trim()) {
      showMsg('Akademisyen adı zorunludur.', 'error');
      return;
    }
    try {
      const fullName = newProfForm.title?.trim()
        ? `${newProfForm.title.trim()} ${newProfForm.name.trim()}`
        : newProfForm.name.trim();
      const data = {
        name: fullName,
        facultyId: newProfForm.facultyId,
        universityId: currentUser?.universityId || 'caku',
        isFacultyManager: !!newProfForm.makeManager,
        createdAt: new Date(),
      };
      await window.DBWrite.add('professors', data);
      setNewProfForm(null);
      await load();
      showMsg(
        newProfForm.makeManager
          ? `${fullName} → ${newProfForm.facultyName} fakülte yetkilisi olarak eklendi.`
          : `${fullName} → ${newProfForm.facultyName} fakültesine eklendi.`
      );
    } catch (e) {
      showMsg('Akademisyen oluşturulamadı: ' + e.message, 'error');
    }
  };

  if (!isUniversityAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <UIcon
          path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          size={48}
          color="#D1D5DB"
        />
        <p style={{ color: UNV.textMuted, fontSize: 14, marginTop: 16 }}>
          Bu modüle yalnızca üniversite yöneticisi erişebilir.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <div
          style={{
            width: 34,
            height: 34,
            border: '3px solid ' + UNV.border,
            borderTopColor: UNV.accent,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: responsive.val(20, 24, 28),
              fontWeight: 700,
              color: UNV.primary,
              margin: 0,
            }}
          >
            Üniversite Yönetimi
          </h1>
          <p style={{ fontSize: 13, color: UNV.textMuted, marginTop: 4 }}>
            Fakülteleri yönet ve fakülte yetkilisi ata
          </p>
        </div>
        <button
          onClick={openNew}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: UNV.accent,
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <UIcon path="M12 5v14M5 12h14" size={15} /> Yeni Fakülte
        </button>
      </div>

      {msg.text && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            background: msg.kind === 'error' ? UNV.redLight : UNV.greenLight,
            color: msg.kind === 'error' ? UNV.red : UNV.green,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {msg.text}
        </div>
      )}

      {faculties.length === 0 ? (
        <div style={{ ...uCard, textAlign: 'center', color: UNV.textMuted, padding: 40 }}>
          Henüz fakülte yok. "Yeni Fakülte" ile başlayın.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {faculties.map((f) => {
            const managers = managersOf(f.id);
            return (
              <div key={f.id} style={uCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: UNV.accentPale,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <UIcon
                      path="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                      size={20}
                      color={UNV.accent}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: UNV.primary, margin: 0 }}>
                      {f.name}
                    </p>
                    <p style={{ fontSize: 12, color: UNV.textMuted, margin: '2px 0 0' }}>
                      {f.shortName || '—'}
                    </p>
                  </div>
                  <button onClick={() => openEdit(f)} title="Düzenle" style={iconBtn()}>
                    <UIcon
                      path="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      size={13}
                      color={UNV.textMuted}
                    />
                  </button>
                  <button onClick={() => deleteFaculty(f)} title="Sil" style={iconBtn(UNV.red)}>
                    <UIcon
                      path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                      size={13}
                      color={UNV.red}
                    />
                  </button>
                </div>

                {/* Fakülte yetkilileri */}
                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
                  <p style={{ ...uLabel, marginBottom: 8 }}>Fakülte Yetkilileri</p>
                  {managers.length === 0 ? (
                    <p style={{ fontSize: 12, color: UNV.textMuted, margin: '0 0 10px' }}>
                      Henüz yetkili atanmadı.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                      {managers.map((m) => (
                        <span
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '5px 10px',
                            borderRadius: 20,
                            background: UNV.blueLight,
                            color: UNV.blue,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {m.name}
                          <button
                            type="button"
                            onClick={() => setPwReset({ prof: m, password: '' })}
                            title="Şifreyi sıfırla"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: UNV.blue,
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <UIcon
                              path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              size={12}
                              color={UNV.blue}
                            />
                          </button>
                          <span
                            onClick={() => revokeManager(m)}
                            title="Yetkiyi kaldır"
                            style={{ cursor: 'pointer', display: 'flex' }}
                          >
                            <UIcon path="M6 18L18 6M6 6l12 12" size={12} color={UNV.blue} />
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ProfPicker
                      professors={professors}
                      placeholder="Yetkili eklemek için akademisyen ara…"
                      onPick={(p) => assignManager(f, p)}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setNewProfForm({
                          facultyId: f.id,
                          facultyName: f.name,
                          name: '',
                          title: '',
                          makeManager: true,
                        })
                      }
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px dashed ' + UNV.accent,
                        background: 'white',
                        color: UNV.accent,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      + Bu fakülteye yeni akademisyen oluştur
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form modalı */}
      {editing && (
        <div
          onClick={() => setEditing(null)}
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
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 14,
              padding: 24,
              width: '100%',
              maxWidth: 420,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: UNV.primary, margin: '0 0 16px' }}>
              {editing.id ? 'Fakülteyi Düzenle' : 'Yeni Fakülte'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={uLabel}>Fakülte Adı *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Örn: Tıp Fakültesi"
                  style={uInput}
                  autoFocus
                />
              </div>
              <div>
                <label style={uLabel}>Kısa Ad</label>
                <input
                  value={form.shortName}
                  onChange={(e) => setForm((p) => ({ ...p, shortName: e.target.value }))}
                  placeholder="Örn: Tıp"
                  style={uInput}
                />
              </div>
              {universities.length > 1 && (
                <div>
                  <label style={uLabel}>Üniversite</label>
                  <select
                    value={form.universityId}
                    onChange={(e) => setForm((p) => ({ ...p, universityId: e.target.value }))}
                    style={{ ...uInput, cursor: 'pointer' }}
                  >
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setEditing(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: '1px solid ' + UNV.border,
                  background: 'white',
                  color: UNV.text,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                İptal
              </button>
              <button
                onClick={saveFaculty}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: UNV.accent,
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fakülte yetkilisi şifre sıfırlama modalı */}
      {pwReset && (
        <div
          onClick={() => setPwReset(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 14,
              padding: 22,
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: UNV.primary }}>
              Şifreyi Sıfırla
            </h3>
            <p style={{ margin: '6px 0 18px', fontSize: 12, color: UNV.textMuted }}>
              <b>{pwReset.prof.name}</b> için yeni şifre belirleyin. Kullanıcı bu şifre ile
              akademisyen tarafından giriş yapabilir, ardından kendi paneline değiştirebilir.
            </p>
            <input
              autoFocus
              type="text"
              value={pwReset.password}
              onChange={(e) => setPwReset({ ...pwReset, password: e.target.value })}
              placeholder="En az 6 karakter"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid ' + UNV.border,
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setPwReset(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid ' + UNV.border,
                  background: 'white',
                  color: UNV.textMuted,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={resetManagerPassword}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: UNV.accent,
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Şifreyi Sıfırla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Akademisyen Oluştur modalı (fakülteye doğrudan) */}
      {newProfForm && (
        <div
          onClick={() => setNewProfForm(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 14,
              padding: 22,
              width: '100%',
              maxWidth: 460,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: UNV.primary }}>
              Yeni Akademisyen — {newProfForm.facultyName}
            </h3>
            <p style={{ margin: '6px 0 18px', fontSize: 12, color: UNV.textMuted }}>
              Akademisyen sisteme kaydedilir ve doğrudan bu fakülteye atanır. İsteğe bağlı olarak
              aynı anda <b>fakülte yetkilisi</b> olarak da atanabilir.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={uLabel}>Unvan (Opsiyonel)</label>
                <input
                  value={newProfForm.title}
                  onChange={(e) => setNewProfForm({ ...newProfForm, title: e.target.value })}
                  placeholder="Örn: Prof. Dr. / Doç. Dr. / Arş. Gör."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid ' + UNV.border,
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={uLabel}>Ad Soyad *</label>
                <input
                  autoFocus
                  value={newProfForm.name}
                  onChange={(e) => setNewProfForm({ ...newProfForm, name: e.target.value })}
                  placeholder="Örn: Ahmet YILMAZ"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid ' + UNV.border,
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  background: UNV.blueLight,
                  borderRadius: 8,
                  fontSize: 13,
                  color: UNV.text,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={!!newProfForm.makeManager}
                  onChange={(e) =>
                    setNewProfForm({ ...newProfForm, makeManager: e.target.checked })
                  }
                />
                Aynı zamanda <b style={{ marginLeft: 4 }}>fakülte yetkilisi</b> olarak da ata
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setNewProfForm(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid ' + UNV.border,
                  background: 'white',
                  color: UNV.textMuted,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={createProfInFaculty}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: UNV.accent,
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Oluştur ve Ata
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 40 }} />
    </div>
  );

  function iconBtn(color) {
    return {
      width: 30,
      height: 30,
      borderRadius: 7,
      border: '1px solid ' + UNV.border,
      background: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      padding: 0,
      color: color || UNV.textMuted,
      flexShrink: 0,
    };
  }
}

if (typeof window !== 'undefined') {
  window.UnvYonetimiApp = UnvYonetimiApp;
}
