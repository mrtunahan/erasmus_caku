// ══════════════════════════════════════════════════════════════
// ÇAKÜ Mühendislik Fakültesi - Komisyonlar Modülü
// Fakülte yöneticisi komisyon oluşturma, akademisyen atama
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const KOM = {
  // Genel tema ile uyumlu: lacivert + mavi aksan (mor kaldırıldı)
  primary: '#2563EB',
  primaryLight: '#60A5FA',
  primaryPale: '#EFF6FF',
  bg: '#FAFAFA',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  green: '#059669',
  greenLight: '#D1FAE5',
  red: '#DC2626',
  redLight: '#FEE2E2',
  navy: '#1B2A4A',
  orange: '#EA580C',
  orangeLight: '#FFEDD5',
  shadow: '0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)',
  shadowHover: '0 8px 24px rgba(16,24,40,0.10)',
};

const KomIcon = ({ path, size = 18, color = 'currentColor' }) => (
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

function KomisyonlarModuluApp({ currentUser, activeDepartment, departmentInfo }) {
  const responsive = window.useResponsive();
  const isMobile = responsive.val(true, true, false);

  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [msg, setMsg] = useState('');
  const [professors, setProfessors] = useState([]);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formMembers, setFormMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isDeptManager = currentUser?.role === 'bolum_yetkilisi';
  const hasFullAccess = isAdmin || isDeptManager;

  // Akademisyenleri yükle (bölüme göre filtreleme client-side)
  useEffect(() => {
    const loadProfessors = async () => {
      try {
        const allProfs = await window.apiRead('professors');
        // ── HAYALET AKADEMİSYEN ──
        // Eskiden ölçüt `(p.departmentId || 'bilgisayar') === activeDepartment`
        // idi: BÖLÜMÜ OLMAYAN akademisyen Bilgisayar Mühendisliği sayılıyordu.
        // Üniversite yetkilisinin fakülte düzeyinde eklediği kişide
        // departmentId hiç yazılmıyor (unv-yonetimi-modulu.jsx: yalnız
        // facultyId) — o yüzden fakülteye eklenen her akademisyen Bilgisayar
        // Mühendisliği'nin komisyon listesinde beliriyordu. Ortak kural
        // kullanılır: ana bölüm + ek bölümler + (kimliksiz eski kayıtlarda) ad.
        const dept = (window.DEPARTMENTS || []).find((x) => x.id === activeDepartment);
        const filtered = activeDepartment
          ? allProfs.filter((p) =>
              window.profMatchesDept
                ? window.profMatchesDept(p, activeDepartment, dept?.name)
                : p.departmentId === activeDepartment
            )
          : allProfs;
        setProfessors(filtered);
      } catch (e) {
        console.error('Akademisyenler yüklenirken hata:', e);
      }
    };
    loadProfessors();
  }, [activeDepartment]);

  // Komisyonları yükle (bölüme göre filtreleme client-side)
  useEffect(() => {
    const loadCommissions = async () => {
      setLoading(true);
      try {
        const allComms = await window.apiRead('commissions');
        const filtered = activeDepartment
          ? allComms.filter((c) => (c.departmentId || 'bilgisayar') === activeDepartment)
          : allComms;
        setCommissions(filtered);
      } catch (e) {
        console.error('Komisyonlar yüklenirken hata:', e);
      } finally {
        setLoading(false);
      }
    };
    loadCommissions();
  }, [activeDepartment]);

  const showMessage = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showMessage('Komisyon adı zorunludur.');
      return;
    }
    try {
      const data = {
        name: formName.trim(),
        description: formDesc.trim(),
        members: formMembers,
        departmentId: activeDepartment || '',
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await window.DBWrite.set('commissions', editingId, data, true);
        if (window.audit)
          window.audit('commission_update', 'commissions', editingId, {
            departmentId: activeDepartment,
            meta: { name: data.name, memberCount: (data.members || []).length },
          });
        showMessage('Komisyon güncellendi!');
      } else {
        data.createdAt = new Date().toISOString();
        const result = await window.DBWrite.add('commissions', data);
        data.id = result?.id || String(Date.now());
        if (window.audit)
          window.audit('commission_create', 'commissions', data.id, {
            departmentId: activeDepartment,
            meta: { name: data.name, memberCount: (data.members || []).length },
          });
        showMessage('Komisyon oluşturuldu!');
      }

      // Reload (client-side bölüm filtresi)
      const allComms = await window.apiRead('commissions');
      const filtered = activeDepartment
        ? allComms.filter((c) => (c.departmentId || 'bilgisayar') === activeDepartment)
        : allComms;
      setCommissions(filtered);
      resetForm();
    } catch (e) {
      console.error('Komisyon kayıt hatası:', e);
      showMessage('Kayıt sırasında hata oluştu: ' + e.message);
    }
  };

  const handleDelete = async (commId) => {
    if (!confirm('Bu komisyonu silmek istediğinize emin misiniz?')) return;
    try {
      const comm = commissions.find((c) => c.id === commId);
      await window.DBWrite.remove('commissions', commId);
      if (window.audit)
        window.audit('commission_delete', 'commissions', commId, {
          departmentId: activeDepartment,
          meta: { name: comm?.name || '' },
        });
      setCommissions((prev) => prev.filter((c) => c.id !== commId));
      if (selectedCommission?.id === commId) setSelectedCommission(null);
      showMessage('Komisyon silindi.');
    } catch (e) {
      console.error('Silme hatası:', e);
      showMessage('Silme sırasında hata oluştu.');
    }
  };

  const handleEdit = (comm) => {
    setFormName(comm.name || '');
    setFormDesc(comm.description || '');
    setFormMembers(comm.members || []);
    setEditingId(comm.id);
    setShowForm(true);
    setSelectedCommission(null);
  };

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
    setFormMembers([]);
    setEditingId(null);
    setShowForm(false);
    setMemberSearch('');
  };

  const addMember = (prof) => {
    if (formMembers.some((m) => m.name === prof.name)) return;
    setFormMembers((prev) => [
      ...prev,
      {
        name: prof.name,
        department: prof.department || '',
        role: 'Üye',
        addedAt: new Date().toISOString(),
      },
    ]);
    setMemberSearch('');
    setShowMemberDropdown(false);
  };

  const removeMember = (name) => {
    setFormMembers((prev) => prev.filter((m) => m.name !== name));
  };

  const updateMemberRole = (name, role) => {
    setFormMembers((prev) => prev.map((m) => (m.name === name ? { ...m, role } : m)));
  };

  const filteredProfessors = useMemo(() => {
    if (!memberSearch.trim()) return [];
    const s = memberSearch.toLowerCase();
    return professors
      .filter((p) => (p.name || '').toLowerCase().includes(s))
      .filter((p) => !formMembers.some((m) => m.name === p.name))
      .slice(0, 8);
  }, [memberSearch, professors, formMembers]);

  // Styles
  const cardStyle = {
    background: 'white',
    borderRadius: 14,
    border: '1px solid ' + KOM.border,
    overflow: 'hidden',
    boxShadow: KOM.shadow,
  };
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #D1D5DB',
    fontSize: 13,
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
  };

  if (!hasFullAccess) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", padding: 40, textAlign: 'center' }}>
        <KomIcon
          path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          size={48}
          color="#D1D5DB"
        />
        <p style={{ color: KOM.textMuted, fontSize: 14, marginTop: 16 }}>
          Bu modüle yalnızca fakülte yöneticisi veya bölüm yetkilisi erişebilir.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: '3px solid #E5E7EB',
              borderTopColor: KOM.primary,
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: '#666', fontSize: 14 }}>Komisyonlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header — ortak banner */}
      {React.createElement(window.CakuBanner, {
        title: 'Komisyonlar',
        subtitle: 'Komisyon oluşturma ve akademisyen atama yönetimi',
        right: React.createElement(
          'button',
          {
            onClick: () => {
              resetForm();
              setShowForm(true);
            },
            style: {
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              background: '#FFFFFF',
              color: KOM.navy,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
          },
          React.createElement(KomIcon, { path: 'M12 5v14M5 12h14', size: 16, color: KOM.navy }),
          ' Yeni Komisyon'
        ),
      })}

      {/* Message */}
      {msg && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            marginBottom: 16,
            background:
              msg.includes('hata') || msg.includes('zorunlu') ? KOM.redLight : KOM.greenLight,
            color: msg.includes('hata') || msg.includes('zorunlu') ? KOM.red : KOM.green,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {msg}
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: responsive.val('1fr 1fr', 'repeat(3, 1fr)', 'repeat(3, 1fr)'),
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          { label: 'Toplam Komisyon', value: commissions.length, color: KOM.primary },
          {
            label: 'Toplam Üye',
            value: commissions.reduce((acc, c) => acc + (c.members?.length || 0), 0),
            color: '#3B82F6',
          },
          { label: 'Akademisyen', value: professors.length, color: KOM.green },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              background: 'white',
              borderRadius: 14,
              padding: responsive.val(14, 18, 22),
              border: '1px solid ' + KOM.border,
              textAlign: 'center',
              boxShadow: KOM.shadow,
              borderTop: '3px solid ' + s.color,
            }}
          >
            <div style={{ fontSize: responsive.val(22, 28, 32), fontWeight: 800, color: s.color }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: KOM.textMuted, marginTop: 4, fontWeight: 500 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ ...cardStyle, padding: responsive.val(16, 20, 24), marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: KOM.navy, marginBottom: 16 }}>
            {editingId ? 'Komisyonu Düzenle' : 'Yeni Komisyon Oluştur'}
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: KOM.textMuted,
                  marginBottom: 5,
                }}
              >
                Komisyon Adı *
              </label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Örn: Staj Komisyonu"
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: KOM.textMuted,
                  marginBottom: 5,
                }}
              >
                Açıklama
              </label>
              <input
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Komisyon hakkında kısa açıklama"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Üye Ekleme */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: KOM.textMuted,
                marginBottom: 5,
              }}
            >
              Üye Ekle (Akademisyen Ara)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setShowMemberDropdown(true);
                }}
                onFocus={() => setShowMemberDropdown(true)}
                placeholder="Akademisyen adı yazarak arayın..."
                style={inputStyle}
              />
              {showMemberDropdown && filteredProfessors.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    background: 'white',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    maxHeight: 220,
                    overflowY: 'auto',
                  }}
                >
                  {filteredProfessors.map((prof) => (
                    <div
                      key={prof.id || prof.name}
                      onClick={() => addMember(prof)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #F3F4F6',
                        fontSize: 13,
                        color: KOM.text,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F3FF')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                    >
                      <div style={{ fontWeight: 500 }}>{prof.name}</div>
                      {prof.department && (
                        <div style={{ fontSize: 11, color: KOM.textMuted }}>{prof.department}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mevcut Üyeler */}
          {formMembers.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: KOM.textMuted,
                  marginBottom: 8,
                }}
              >
                Komisyon Üyeleri ({formMembers.length})
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {formMembers.map((member) => (
                  <div
                    key={member.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      background: '#F9FAFB',
                      borderRadius: 8,
                      border: '1px solid #F3F4F6',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: KOM.primaryPale,
                        color: KOM.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {(member.name || '?')[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: KOM.text }}>
                        {member.name}
                      </div>
                      {member.department && (
                        <div style={{ fontSize: 11, color: KOM.textMuted }}>
                          {member.department}
                        </div>
                      )}
                    </div>
                    <select
                      value={member.role}
                      onChange={(e) => updateMemberRole(member.name, e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid #D1D5DB',
                        fontSize: 12,
                        background: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="Başkan">Başkan</option>
                      <option value="Başkan Yrd.">Başkan Yrd.</option>
                      <option value="Üye">Üye</option>
                      <option value="Raportör">Raportör</option>
                    </select>
                    <button
                      onClick={() => removeMember(member.name)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 4,
                        color: KOM.red,
                        display: 'flex',
                      }}
                    >
                      <KomIcon path="M6 18L18 6M6 6l12 12" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              onClick={resetForm}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                background: 'white',
                color: KOM.textMuted,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: KOM.primary,
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {editingId ? 'Güncelle' : 'Oluştur'}
            </button>
          </div>
        </div>
      )}

      {/* Commission List */}
      {commissions.length === 0 && !showForm ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center' }}>
          <KomIcon
            path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            size={48}
            color="#D1D5DB"
          />
          <p style={{ color: KOM.textMuted, fontSize: 14, marginTop: 16 }}>
            Henüz komisyon oluşturulmamış. Yeni komisyon oluşturmak için yukarıdaki butona tıklayın.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: responsive.val('1fr', '1fr', '1fr 1fr'),
            gap: 16,
          }}
        >
          {commissions.map((comm) => {
            const isSelected = selectedCommission?.id === comm.id;
            const memberCount = comm.members?.length || 0;
            return (
              <div
                key={comm.id}
                style={{
                  ...cardStyle,
                  border: isSelected ? `2px solid ${KOM.primary}` : '1px solid #E5E7EB',
                  transition: 'all 0.2s',
                }}
              >
                {/* Commission Header */}
                <div
                  style={{
                    padding: '16px 18px',
                    borderBottom: '1px solid #F3F4F6',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => setSelectedCommission(isSelected ? null : comm)}
                  >
                    <div style={{ fontSize: 15, fontWeight: 600, color: KOM.navy }}>
                      {comm.name}
                    </div>
                    {comm.description && (
                      <div style={{ fontSize: 12, color: KOM.textMuted, marginTop: 4 }}>
                        {comm.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: KOM.primary, fontWeight: 600 }}>
                        {memberCount} üye
                      </span>
                      {comm.createdAt && (
                        <span style={{ fontSize: 11, color: KOM.textMuted }}>
                          {new Date(comm.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => handleEdit(comm)}
                      title="Düzenle"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 6,
                        color: '#6B7280',
                        borderRadius: 6,
                      }}
                    >
                      <KomIcon
                        path="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        size={16}
                      />
                    </button>
                    <button
                      onClick={() => handleDelete(comm.id)}
                      title="Sil"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 6,
                        color: KOM.red,
                        borderRadius: 6,
                      }}
                    >
                      <KomIcon
                        path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        size={16}
                      />
                    </button>
                  </div>
                </div>

                {/* Members Preview */}
                <div style={{ padding: '12px 18px' }}>
                  {memberCount === 0 ? (
                    <p
                      style={{ fontSize: 12, color: KOM.textMuted, margin: 0, fontStyle: 'italic' }}
                    >
                      Henüz üye eklenmemiş
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(comm.members || []).slice(0, isSelected ? undefined : 3).map((member) => (
                        <div
                          key={member.name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '4px 0',
                          }}
                        >
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: KOM.primaryPale,
                              color: KOM.primary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {(member.name || '?')[0]}
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: KOM.text }}>
                              {member.name}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 10,
                              background:
                                member.role === 'Başkan'
                                  ? '#FEF3C7'
                                  : member.role === 'Başkan Yrd.'
                                    ? '#DBEAFE'
                                    : '#F3F4F6',
                              color:
                                member.role === 'Başkan'
                                  ? '#92400E'
                                  : member.role === 'Başkan Yrd.'
                                    ? '#1E40AF'
                                    : '#6B7280',
                            }}
                          >
                            {member.role}
                          </span>
                        </div>
                      ))}
                      {!isSelected && memberCount > 3 && (
                        <div
                          style={{
                            fontSize: 11,
                            color: KOM.primary,
                            cursor: 'pointer',
                            fontWeight: 500,
                            paddingTop: 4,
                          }}
                          onClick={() => setSelectedCommission(comm)}
                        >
                          +{memberCount - 3} daha...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

window.KomisyonlarModuluApp = KomisyonlarModuluApp;
