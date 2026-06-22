// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Fakülte Yönetimi Modülü
//   Yalnızca isFacultyManager bayraklı akademisyene açıktır; kendi
//   fakültesi (currentUser.facultyId) kapsamında çalışır.
//   • Bölüm oluştur / düzenle / sil (departments koleksiyonu)
//   • Bölüme akademisyen ekle/çıkar (professor.departmentId)
//   • Bölüme "Bölüm Yetkilisi" ata (professor.isDeptManager)
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const FAK = {
  primary: '#1B2A4A',
  accent: '#0F766E',
  accentPale: '#CCFBF1',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  green: '#059669',
  greenLight: '#D1FAE5',
  red: '#DC2626',
  redLight: '#FEE2E2',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  amber: '#B45309',
  amberLight: '#FEF3C7',
};

const FIcon = ({ path, size = 18, color = 'currentColor' }) => (
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

const fInput = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid ' + FAK.border,
  fontSize: 13,
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
  boxSizing: 'border-box',
  background: 'white',
};
const fLabel = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: FAK.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
};
const fCard = {
  background: 'white',
  borderRadius: 12,
  border: '1px solid ' + FAK.border,
  padding: 18,
};
const fIconBtn = (color) => ({
  width: 30,
  height: 30,
  borderRadius: 7,
  border: '1px solid ' + FAK.border,
  background: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  color: color || FAK.textMuted,
  flexShrink: 0,
});

// Akademisyen arama-seç
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
        style={fInput}
      />
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'white',
            border: '1px solid ' + FAK.border,
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 12, color: FAK.textMuted }}>
              {q ? 'Eşleşen akademisyen yok.' : 'Aday akademisyen yok.'}
            </div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                onMouseDown={() => {
                  onPick(p);
                  setQ('');
                  setOpen(false);
                }}
                style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, color: FAK.text }}
                onMouseEnter={(e) => (e.currentTarget.style.background = FAK.accentPale)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
              >
                {p.name}
                {p.department ? (
                  <span style={{ color: FAK.textMuted, fontSize: 11, marginLeft: 6 }}>
                    {p.department}
                  </span>
                ) : p.facultyId ? null : (
                  <span style={{ color: '#92400E', fontSize: 11, marginLeft: 6 }}>
                    (fakültesiz)
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function FakYonetimiApp({ currentUser }) {
  const responsive = window.useResponsive ? window.useResponsive() : { val: (_a, _b, c) => c };
  const myFacultyId = currentUser?.facultyId || '';

  const [faculty, setFaculty] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', kind: '' });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', shortName: '' });

  const isFacultyManager = !!currentUser?.isFacultyManager;

  const showMsg = (text, kind = 'success') => {
    setMsg({ text, kind });
    setTimeout(() => setMsg({ text: '', kind: '' }), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, d, p] = await Promise.all([
        window.apiRead('faculties'),
        window.apiRead('departments'),
        window.apiRead('professors'),
      ]);
      setFaculty((f || []).find((x) => x.id === myFacultyId) || null);
      setDepartments(
        (d || [])
          .filter((x) => (x.facultyId || '') === myFacultyId)
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'))
      );
      setProfessors(
        (p || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'))
      );
    } catch (e) {
      console.error('Fakülte yönetimi yüklenemedi:', e);
      showMsg('Veriler yüklenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  }, [myFacultyId]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const h = () => load();
    ['departments', 'professors'].forEach((c) => window.addEventListener('realtime:' + c, h));
    return () =>
      ['departments', 'professors'].forEach((c) => window.removeEventListener('realtime:' + c, h));
  }, [load]);

  // Atama için aday havuzu — kendi fakültesindekiler + fakülteye atanmamış
  // akademisyenler. Başka fakültelerin akademisyenleri burada görünmez
  // (yanlışlıkla başka fakülteden çekmeyi engeller).
  const assignableProfs = useMemo(
    () => professors.filter((p) => (p.facultyId || '') === myFacultyId || !p.facultyId),
    [professors, myFacultyId]
  );

  const profsOfDept = (deptId, deptName) =>
    professors.filter((p) => p.departmentId === deptId || (deptName && p.department === deptName));

  const openNew = () => {
    setForm({ name: '', shortName: '' });
    setEditing({});
  };
  const openEdit = (d) => {
    setForm({ name: d.name || '', shortName: d.shortName || '' });
    setEditing(d);
  };

  const saveDept = async () => {
    if (!form.name.trim()) {
      showMsg('Bölüm adı zorunludur.', 'error');
      return;
    }
    try {
      const data = {
        name: form.name.trim(),
        shortName: form.shortName.trim() || form.name.trim(),
        facultyId: myFacultyId,
        universityId: currentUser?.universityId || 'caku',
      };
      if (editing && editing.id) await window.DBWrite.set('departments', editing.id, data, true);
      else await window.DBWrite.add('departments', data);
      setEditing(null);
      await load();
      showMsg('Bölüm kaydedildi.');
    } catch (e) {
      showMsg('Kayıt hatası: ' + e.message, 'error');
    }
  };

  const deleteDept = async (d) => {
    if (!confirm(`"${d.name}" bölümü silinsin mi?`)) return;
    try {
      await window.DBWrite.remove('departments', d.id);
      await load();
      showMsg('Bölüm silindi.');
    } catch (e) {
      showMsg('Silme hatası: ' + e.message, 'error');
    }
  };

  const addProfToDept = async (dept, prof, { makeManager = false } = {}) => {
    try {
      const patch = {
        departmentId: dept.id,
        department: dept.name,
        facultyId: myFacultyId,
      };
      if (makeManager) patch.isDeptManager = true;
      await window.DBWrite.set('professors', prof.id, patch, true);
      await load();
      showMsg(
        makeManager
          ? `${prof.name} → ${dept.name} bölüm yetkilisi yapıldı.`
          : `${prof.name} → ${dept.name} bölümüne eklendi.`
      );
    } catch (e) {
      showMsg('Ekleme hatası: ' + e.message, 'error');
    }
  };

  const toggleDeptManager = async (prof, makeManager) => {
    try {
      await window.DBWrite.set('professors', prof.id, { isDeptManager: makeManager }, true);
      await load();
      showMsg(
        makeManager ? `${prof.name} bölüm yetkilisi yapıldı.` : 'Bölüm yetkiliği kaldırıldı.'
      );
    } catch (e) {
      showMsg('İşlem hatası: ' + e.message, 'error');
    }
  };

  // Fakülte Staj Yetkilisi (SGK onayı + fakülte geneli staj erişimi).
  // Birden fazla kişi olabilir; her biri staj modülünü fakülte genelinde görür.
  const stajCoordinators = useMemo(
    () => professors.filter((p) => p.isStajCoordinator && (p.facultyId || '') === myFacultyId),
    [professors, myFacultyId]
  );
  const assignStajCoordinator = async (prof) => {
    try {
      await window.DBWrite.set(
        'professors',
        prof.id,
        { isStajCoordinator: true, facultyId: myFacultyId },
        true
      );
      await load();
      showMsg(`${prof.name} fakülte staj yetkilisi yapıldı.`);
    } catch (e) {
      showMsg('Atama hatası: ' + e.message, 'error');
    }
  };
  const revokeStajCoordinator = async (prof) => {
    if (!confirm(`${prof.name} fakülte staj yetkiliğinden alınsın mı?`)) return;
    try {
      await window.DBWrite.set('professors', prof.id, { isStajCoordinator: false }, true);
      await load();
      showMsg('Staj yetkiliği kaldırıldı.');
    } catch (e) {
      showMsg('İşlem hatası: ' + e.message, 'error');
    }
  };

  if (!isFacultyManager) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <FIcon
          path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          size={48}
          color="#D1D5DB"
        />
        <p style={{ color: FAK.textMuted, fontSize: 14, marginTop: 16 }}>
          Bu modüle yalnızca fakülte yetkilisi erişebilir.
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
            border: '3px solid ' + FAK.border,
            borderTopColor: FAK.accent,
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
              color: FAK.primary,
              margin: 0,
            }}
          >
            Fakülte Yönetimi
          </h1>
          <p style={{ fontSize: 13, color: FAK.textMuted, marginTop: 4 }}>
            {faculty?.name || 'Fakülte'} — bölümleri ve akademisyenleri yönet
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
            background: FAK.accent,
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <FIcon path="M12 5v14M5 12h14" size={15} /> Yeni Bölüm
        </button>
      </div>

      {msg.text && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            background: msg.kind === 'error' ? FAK.redLight : FAK.greenLight,
            color: msg.kind === 'error' ? FAK.red : FAK.green,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {msg.text}
        </div>
      )}

      {!myFacultyId && (
        <div
          style={{
            ...fCard,
            color: FAK.amber,
            background: FAK.amberLight,
            border: 'none',
            marginBottom: 16,
          }}
        >
          Hesabınıza bağlı bir fakülte bulunamadı (facultyId boş). Üniversite yöneticisinden fakülte
          ataması isteyin.
        </div>
      )}

      {/* Fakülte Staj Yetkilisi (SGK onayı + fakülte geneli staj erişimi) */}
      <div style={{ ...fCard, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 9,
              background: FAK.amberLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FIcon
              path="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              size={20}
              color={FAK.amber}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: FAK.primary, margin: 0 }}>
              Fakülte Staj Yetkilisi
            </p>
            <p style={{ fontSize: 12, color: FAK.textMuted, margin: '2px 0 0' }}>
              Staj modülünü fakülte genelinde (tüm bölümler) yönetir, SGK onayı verir
            </p>
          </div>
        </div>
        {stajCoordinators.length === 0 ? (
          <p style={{ fontSize: 12, color: FAK.textMuted, margin: '0 0 10px' }}>
            Henüz staj yetkilisi atanmadı.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {stajCoordinators.map((m) => (
              <span
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  borderRadius: 20,
                  background: FAK.amberLight,
                  color: FAK.amber,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {m.name}
                <span
                  onClick={() => revokeStajCoordinator(m)}
                  title="Yetkiyi kaldır"
                  style={{ cursor: 'pointer', display: 'flex' }}
                >
                  <FIcon path="M6 18L18 6M6 6l12 12" size={12} color={FAK.amber} />
                </span>
              </span>
            ))}
          </div>
        )}
        <ProfPicker
          professors={assignableProfs.filter((p) => !p.isStajCoordinator)}
          placeholder="Staj yetkilisi eklemek için akademisyen ara…"
          onPick={(p) => assignStajCoordinator(p)}
        />
      </div>

      {departments.length === 0 ? (
        <div style={{ ...fCard, textAlign: 'center', color: FAK.textMuted, padding: 40 }}>
          Bu fakültede henüz bölüm yok. "Yeni Bölüm" ile başlayın.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Bölüm kısayolları — sayfa içi atlama (sağ panel olmadan da gezinmek için) */}
          {departments.length > 1 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                padding: '10px 12px',
                background: '#F9FAFB',
                border: '1px solid ' + FAK.border,
                borderRadius: 10,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: FAK.textMuted, marginRight: 6 }}>
                BÖLÜME ATLA:
              </span>
              {departments.map((d) => (
                <a
                  key={d.id}
                  href={`#dept-${d.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(`dept-${d.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'white',
                    border: '1px solid ' + FAK.border,
                    fontSize: 11,
                    fontWeight: 600,
                    color: FAK.text,
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {d.shortName || d.name}
                </a>
              ))}
            </div>
          )}
          {departments.map((d) => {
            const deptProfs = profsOfDept(d.id, d.name);
            return (
              <div key={d.id} id={`dept-${d.id}`} style={fCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: (d.color || FAK.accent) + '22',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FIcon
                      path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      size={20}
                      color={d.color || FAK.accent}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: FAK.primary, margin: 0 }}>
                      {d.name}
                    </p>
                    <p style={{ fontSize: 12, color: FAK.textMuted, margin: '2px 0 0' }}>
                      {deptProfs.length} akademisyen
                    </p>
                  </div>
                  <button onClick={() => openEdit(d)} title="Düzenle" style={fIconBtn()}>
                    <FIcon
                      path="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      size={13}
                      color={FAK.textMuted}
                    />
                  </button>
                  <button onClick={() => deleteDept(d)} title="Sil" style={fIconBtn(FAK.red)}>
                    <FIcon
                      path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                      size={13}
                      color={FAK.red}
                    />
                  </button>
                </div>

                {/* Akademisyenler */}
                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
                  <p style={{ ...fLabel, marginBottom: 8 }}>Akademisyenler & Bölüm Yetkilisi</p>
                  {deptProfs.length === 0 ? (
                    <p style={{ fontSize: 12, color: FAK.textMuted, margin: '0 0 10px' }}>
                      Bu bölümde akademisyen yok.
                    </p>
                  ) : (
                    <div
                      style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}
                    >
                      {deptProfs.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '7px 10px',
                            borderRadius: 8,
                            border: '1px solid ' + FAK.border,
                          }}
                        >
                          <span style={{ flex: 1, fontSize: 13, color: FAK.text }}>{p.name}</span>
                          {p.isDeptManager ? (
                            <>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 20,
                                  background: FAK.blueLight,
                                  color: FAK.blue,
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                Bölüm Yetkilisi
                              </span>
                              <button
                                onClick={() => toggleDeptManager(p, false)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: FAK.red,
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                Kaldır
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => toggleDeptManager(p, true)}
                              style={{
                                border: '1px solid ' + FAK.border,
                                background: 'white',
                                color: FAK.accent,
                                fontSize: 12,
                                cursor: 'pointer',
                                fontWeight: 600,
                                padding: '4px 10px',
                                borderRadius: 7,
                              }}
                            >
                              Yetkili Yap
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ProfPicker
                      professors={assignableProfs.filter(
                        (p) => !deptProfs.some((dp) => dp.id === p.id)
                      )}
                      placeholder="Bölüme akademisyen ekle…"
                      onPick={(p) => addProfToDept(d, p)}
                    />
                    <ProfPicker
                      professors={assignableProfs.filter(
                        (p) => !deptProfs.some((dp) => dp.id === p.id && dp.isDeptManager)
                      )}
                      placeholder="Doğrudan bölüm yetkilisi yap…"
                      onPick={(p) => addProfToDept(d, p, { makeManager: true })}
                    />
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
            <h3 style={{ fontSize: 16, fontWeight: 700, color: FAK.primary, margin: '0 0 16px' }}>
              {editing.id ? 'Bölümü Düzenle' : 'Yeni Bölüm'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={fLabel}>Bölüm Adı *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Örn: Yazılım Mühendisliği"
                  style={fInput}
                  autoFocus
                />
              </div>
              <div>
                <label style={fLabel}>Kısa Ad</label>
                <input
                  value={form.shortName}
                  onChange={(e) => setForm((p) => ({ ...p, shortName: e.target.value }))}
                  placeholder="Örn: Yazılım"
                  style={fInput}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setEditing(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: '1px solid ' + FAK.border,
                  background: 'white',
                  color: FAK.text,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                İptal
              </button>
              <button
                onClick={saveDept}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: FAK.accent,
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

      <div style={{ height: 40 }} />
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.FakYonetimiApp = FakYonetimiApp;
}
