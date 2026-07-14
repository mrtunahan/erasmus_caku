// ══════════════════════════════════════════════════════════════
// ÇAKÜ Bölüm Yönetimi Modülü
// Bölümler, Sınıf/Salonlar ve Gözetmenlerin tanımlandığı ortak alan
// Gözetmenler artık professors koleksiyonunda roles:["gozetmen"] ile yönetilir
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo } = React;

const C = window.C;
const Modal = window.Modal;
const Input = window.Input;
const FormField = window.FormField;
const Btn = window.Btn;
const DBWrite = window.DBWrite || {};

function BolumYonetimiModuluApp({ currentUser, activeDepartment }) {
  const isAdmin = currentUser?.role === 'admin';
  const isDeptManager = currentUser?.role === 'bolum_yetkilisi';
  const hasAccess = isAdmin || isDeptManager;

  // 'departments' sekmesi kaldırıldı — bölüm tanımı ve yetkili ataması artık
  // 'Fakülte Yönetimi' modülünden yapılıyor (çift-yer karışıklığı + duplicate
  // kayıtlar oluşturuyordu). Bu modül sadece 'Sınıf/Salon' ve 'Gözetmen' için.
  const [activeTab, setActiveTab] = useState('classrooms');

  const [departments, setDepartments] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [editDeptProfs, setEditDeptProfs] = useState([]);

  // Gözetmenler = professors koleksiyonunda roles'ında "gozetmen" olanlar
  const supervisors = useMemo(() => {
    return professors.filter((p) => (p.roles || []).includes('gozetmen'));
  }, [professors]);

  // Gözetmen olmayan profesörler (gözetmen eklerken seçim listesi)
  const nonSupervisorProfs = useMemo(() => {
    return professors.filter((p) => !(p.roles || []).includes('gozetmen'));
  }, [professors]);

  // Veri yükleme — direkt MongoDB API
  const loadData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const depts = await window.apiRead('departments', {});
        // Fakülte yetkilisi (üni admin olmayan) → yalnız kendi fakültesinin
        // bölümlerini görür. Üniversite yetkilisi → tüm bölümleri görür.
        const myFacultyId = currentUser?.facultyId || '';
        const isUniAdmin = !!currentUser?.isUniversityAdmin;
        const filtered = isUniAdmin
          ? depts
          : myFacultyId
            ? depts.filter((d) => (d.facultyId || '') === myFacultyId)
            : depts;
        setDepartments(filtered.map((d) => ({ id: d.id, ...d })));
      }

      // Derslikler (bölüm bazlı)
      const cls = await window.apiRead('department_classrooms', {
        where: `departmentId:eq:${activeDepartment}`,
      });
      setClassrooms(cls.map((d) => ({ id: d.id, ...d })));

      // Profesörler (bölüm bazlı) — gözetmenler bunlardan filtrelenir.
      // Çapraz-bölüm: additionalDepartments ile atananları da dahil et.
      const allProfs = await window.apiRead('professors');
      const dept = (window.DEPARTMENTS || []).find((x) => x.id === activeDepartment);
      const profs = (allProfs || []).filter((p) =>
        window.profMatchesDept
          ? window.profMatchesDept(p, activeDepartment, dept?.name)
          : p.departmentId === activeDepartment
      );
      setProfessors(profs.map((d) => ({ id: d.id, ...d })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) loadData();
  }, [hasAccess, activeDepartment]);

  // ── Bölüm Yönetimi (Admin Only) ──
  const startDeptEdit = async (d) => {
    // managerNames array veya eski managerName string'den listeyi al
    const existingManagers = d?.managerNames || (d?.managerName ? [d.managerName] : []);
    setEditingItem(d || 'new');
    setForm({ name: d?.name || '', managerNames: existingManagers });
    setEditDeptProfs([]);
    // Düzenlemede ise o bölümdeki akademisyenleri çek (dropdown için).
    // Çapraz-bölüm: ek bölüm listesinde bu bölüm geçenleri de dahil et.
    if (d && d.id) {
      try {
        const all = await window.apiRead('professors');
        const profs = (all || []).filter((p) =>
          window.profMatchesDept ? window.profMatchesDept(p, d.id, d.name) : p.departmentId === d.id
        );
        setEditDeptProfs(
          profs.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'))
        );
      } catch (e) {
        console.warn('Bölüm akademisyenleri yüklenemedi:', e?.message);
      }
    }
  };
  const handleDeptSave = async () => {
    if (!form.name.trim()) return alert('Bölüm adı gerekli');
    setSaving(true);
    try {
      // form.managerNames artık array (multi-select dropdown). Geriye dönük
      // uyumluluk için string gelirse virgülle ayır.
      const managerNames = Array.isArray(form.managerNames)
        ? form.managerNames.filter(Boolean)
        : String(form.managerNames || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      const data = { name: form.name.trim(), managerNames, managerName: managerNames[0] || '' };
      if (editingItem === 'new') {
        await DBWrite.add('departments', data);
        if (window.audit)
          window.audit('department_create', 'departments', '', { meta: { name: data.name } });
      } else {
        await DBWrite.set('departments', editingItem.id, data, true);
        if (window.audit)
          window.audit('department_update', 'departments', editingItem.id, {
            meta: { name: data.name },
          });
      }
      setEditingItem(null);
      loadData();
    } catch (e) {
      alert('Hata: ' + e.message);
    }
    setSaving(false);
  };
  const handleDeptDelete = async (d) => {
    if (!confirm(`${d.name} silinecek, emin misiniz?`)) return;
    await DBWrite.remove('departments', d.id);
    if (window.audit)
      window.audit('department_delete', 'departments', d.id, { meta: { name: d.name } });
    setDepartments(departments.filter((x) => x.id !== d.id));
  };

  // ── Sınıf/Salon Yönetimi ──
  const startClassEdit = (c) => {
    setEditingItem(c || 'new');
    setForm({ name: c?.name || '', capacity: c?.capacity || '' });
  };
  const handleClassSave = async () => {
    if (!form.name.trim()) return alert('Salon adı gerekli');
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        capacity: parseInt(form.capacity) || 0,
        departmentId: activeDepartment,
      };
      if (editingItem === 'new') {
        await DBWrite.add('department_classrooms', data);
        if (window.audit)
          window.audit('classroom_create', 'department_classrooms', '', {
            departmentId: activeDepartment,
            meta: { name: data.name },
          });
      } else {
        await DBWrite.set('department_classrooms', editingItem.id, data, true);
        if (window.audit)
          window.audit('classroom_update', 'department_classrooms', editingItem.id, {
            departmentId: activeDepartment,
            meta: { name: data.name },
          });
      }
      setEditingItem(null);
      loadData();
    } catch (e) {
      alert('Hata: ' + e.message);
    }
    setSaving(false);
  };
  const handleClassDelete = async (c) => {
    if (!confirm(`${c.name} silinecek, emin misiniz?`)) return;
    await DBWrite.remove('department_classrooms', c.id);
    if (window.audit)
      window.audit('classroom_delete', 'department_classrooms', c.id, {
        departmentId: activeDepartment,
        meta: { name: c.name },
      });
    setClassrooms(classrooms.filter((x) => x.id !== c.id));
  };

  // ── Gözetmen Yönetimi (professors koleksiyonu üzerinden) ──
  const startSupAdd = () => {
    setEditingItem('new_sup');
    setForm({ selectedProfId: '', newName: '' });
  };
  const startSupEdit = (s) => {
    setEditingItem(s);
    setForm({ name: s.name });
  };

  const handleSupSave = async () => {
    setSaving(true);
    try {
      if (editingItem === 'new_sup') {
        if (form.selectedProfId) {
          // Mevcut profesöre gozetmen rolü ekle
          const prof = professors.find((p) => p.id === form.selectedProfId);
          if (prof) {
            const roles = [...new Set([...(prof.roles || []), 'gozetmen'])];
            await DBWrite.update('professors', prof.id, { roles });
          }
        } else if (form.newName.trim()) {
          // Yeni profesör oluştur ve gozetmen rolü ver
          await DBWrite.add('professors', {
            name: form.newName.trim(),
            departmentId: activeDepartment,
            isExternal: false,
            roles: ['gozetmen'],
            createdAt: new Date().toISOString(),
          });
        } else {
          alert('Bir akademisyen seçin veya yeni isim girin');
          setSaving(false);
          return;
        }
      } else {
        // Düzenleme — isim güncelle
        await DBWrite.update('professors', editingItem.id, { name: form.name.trim() });
      }
      setEditingItem(null);
      await loadData();
    } catch (e) {
      alert('Hata: ' + e.message);
    }
    setSaving(false);
  };

  const handleSupRemoveRole = async (s) => {
    if (!confirm(`${s.name} gözetmenlikten çıkarılacak. Akademisyen kaydı silinmez. Emin misiniz?`))
      return;
    try {
      const roles = (s.roles || []).filter((r) => r !== 'gozetmen');
      await DBWrite.update('professors', s.id, { roles });
      await loadData();
    } catch (e) {
      alert('Hata: ' + e.message);
    }
  };

  if (!hasAccess) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: '#DC2626' }}>Erişim Reddedildi</h2>
      </div>
    );
  }

  const GhostBtn = ({ children, onClick, style }) => (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        color: C.blue,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        ...style,
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1B2A4A', margin: 0 }}>
            Bölüm Yönetimi
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            Bölüme ait derslikler, gözetmenler ve hiyerarşi
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{ display: 'flex', gap: 16, borderBottom: '1px solid #E5E7EB', marginBottom: 24 }}
      >
        <button
          onClick={() => setActiveTab('classrooms')}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom:
              activeTab === 'classrooms' ? `2px solid ${C.blue}` : '2px solid transparent',
            color: activeTab === 'classrooms' ? C.blue : '#6B7280',
            fontWeight: activeTab === 'classrooms' ? 600 : 500,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Sınıf/Salon Tanımları
        </button>
        <button
          onClick={() => setActiveTab('supervisors')}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom:
              activeTab === 'supervisors' ? `2px solid ${C.blue}` : '2px solid transparent',
            color: activeTab === 'supervisors' ? C.blue : '#6B7280',
            fontWeight: activeTab === 'supervisors' ? 600 : 500,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Gözetmen Akademisyenler
        </button>
        <button
          onClick={() => setActiveTab('kilitler')}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom:
              activeTab === 'kilitler' ? `2px solid ${C.blue}` : '2px solid transparent',
            color: activeTab === 'kilitler' ? C.blue : '#6B7280',
            fontWeight: activeTab === 'kilitler' ? 600 : 500,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Ders Seçim Kilitleri
        </button>
        <button
          onClick={() => setActiveTab('benimayar')}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom:
              activeTab === 'benimayar' ? `2px solid ${C.blue}` : '2px solid transparent',
            color: activeTab === 'benimayar' ? C.blue : '#6B7280',
            fontWeight: activeTab === 'benimayar' ? 600 : 500,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Benim Sayfam Ayarları
        </button>
        <button
          onClick={() => setActiveTab('akademisyenbilgi')}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom:
              activeTab === 'akademisyenbilgi' ? `2px solid ${C.blue}` : '2px solid transparent',
            color: activeTab === 'akademisyenbilgi' ? C.blue : '#6B7280',
            fontWeight: activeTab === 'akademisyenbilgi' ? 600 : 500,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Akademisyen Bilgileri
        </button>
      </div>

      {activeTab === 'kilitler' && (
        <DersSecimKilitleri activeDepartment={activeDepartment} currentUser={currentUser} />
      )}

      {activeTab === 'benimayar' && (
        <BenimSayfamAyarlari activeDepartment={activeDepartment} currentUser={currentUser} />
      )}

      {activeTab === 'akademisyenbilgi' && (
        <AkademisyenBilgileri professors={professors} onSaved={loadData} />
      )}

      {activeTab !== 'kilitler' &&
        activeTab !== 'benimayar' &&
        activeTab !== 'akademisyenbilgi' &&
        (loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Yükleniyor...</div>
        ) : (
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              border: '1px solid #E5E7EB',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              {/* DEPARTMENTS TAB (ADMIN) */}
              {activeTab === 'departments' && isAdmin && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ background: '#F9FAFB' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#374151' }}>
                        Bölüm Adı
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#374151' }}>
                        Yetkili Kişi
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          color: '#374151',
                          width: 120,
                        }}
                      >
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>{d.name}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {d.managerNames?.join(', ') || d.managerName || (
                            <span style={{ color: '#9CA3AF' }}>Atanmadı</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <GhostBtn onClick={() => startDeptEdit(d)}>Düzenle</GhostBtn>
                            <GhostBtn
                              onClick={() => handleDeptDelete(d)}
                              style={{ color: '#DC2626' }}
                            >
                              Sil
                            </GhostBtn>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td
                        colSpan={3}
                        style={{ padding: '12px 16px', textAlign: 'right', background: '#F9FAFB' }}
                      >
                        <Btn onClick={() => startDeptEdit()}>+ Yeni Bölüm Tanımla</Btn>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* CLASSROOMS TAB */}
              {activeTab === 'classrooms' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ background: '#F9FAFB' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#374151' }}>
                        Sınıf/Salon Adı
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', color: '#374151' }}>
                        Kapasite
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          color: '#374151',
                          width: 120,
                        }}
                      >
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {classrooms.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>{c.name}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {c.capacity || '-'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <GhostBtn onClick={() => startClassEdit(c)}>Düzenle</GhostBtn>
                            <GhostBtn
                              onClick={() => handleClassDelete(c)}
                              style={{ color: '#DC2626' }}
                            >
                              Sil
                            </GhostBtn>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td
                        colSpan={3}
                        style={{ padding: '12px 16px', textAlign: 'right', background: '#F9FAFB' }}
                      >
                        <Btn onClick={() => startClassEdit()}>+ Yeni Sınıf Ekle</Btn>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* SUPERVISORS TAB — professors koleksiyonundan roles:gozetmen */}
              {activeTab === 'supervisors' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ background: '#F9FAFB' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#374151' }}>
                        Gözetmen Akademisyen
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          color: '#374151',
                          width: 150,
                        }}
                      >
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {supervisors.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>{s.name}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <GhostBtn onClick={() => startSupEdit(s)}>Düzenle</GhostBtn>
                            <GhostBtn
                              onClick={() => handleSupRemoveRole(s)}
                              style={{ color: '#DC2626' }}
                            >
                              Çıkar
                            </GhostBtn>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {supervisors.length === 0 && (
                      <tr>
                        <td
                          colSpan={2}
                          style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}
                        >
                          Henüz gözetmen atanmamış
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={2} style={{ padding: '12px 16px', background: '#F9FAFB' }}>
                        <Btn onClick={startSupAdd}>+ Yeni Gözetmen Ekle</Btn>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ))}

      {/* Bölüm Modal */}
      {editingItem && activeTab === 'departments' && (
        <Modal
          open={true}
          title={editingItem === 'new' ? 'Yeni Bölüm' : 'Bölüm Düzenle'}
          onClose={() => setEditingItem(null)}
          width={460}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Bölüm Adı">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
            <FormField label="Yetkili Kişi">
              {editingItem === 'new' ? (
                <div style={{ fontSize: 12, color: '#6B7280', padding: '8px 0' }}>
                  Bölümü kaydettikten sonra "Düzenle" ile yetkili atayabilirsiniz (önce bölüme
                  akademisyen eklenmelidir).
                </div>
              ) : editDeptProfs.length === 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: '#92400E',
                    background: '#FEF3C7',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #FCD34D',
                  }}
                >
                  Bu bölümde tanımlı akademisyen yok. Önce <b>Fakülte Yönetimi</b> &gt; ilgili bölüm
                  &gt; <i>"Bölüme akademisyen ekle"</i> ile akademisyen eklemelisiniz.
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    maxHeight: 220,
                    overflowY: 'auto',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    padding: 8,
                  }}
                >
                  {editDeptProfs.map((p) => {
                    const selected = (form.managerNames || []).includes(p.name);
                    return (
                      <label
                        key={p.id || p._docId || p.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 8px',
                          cursor: 'pointer',
                          borderRadius: 6,
                          background: selected ? '#EFF6FF' : 'transparent',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            const cur = Array.isArray(form.managerNames) ? form.managerNames : [];
                            const next = selected
                              ? cur.filter((n) => n !== p.name)
                              : [...cur, p.name];
                            setForm({ ...form, managerNames: next });
                          }}
                        />
                        <span style={{ fontSize: 13, color: '#1F2937' }}>{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {Array.isArray(form.managerNames) && form.managerNames.length > 0 && (
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>
                  Seçili: <b>{form.managerNames.length}</b> kişi
                </div>
              )}
            </FormField>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <GhostBtn onClick={() => setEditingItem(null)} style={{ color: '#6B7280' }}>
                İptal
              </GhostBtn>
              <Btn onClick={handleDeptSave} disabled={saving}>
                Kaydet
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Sınıf/Salon Modal */}
      {editingItem && activeTab === 'classrooms' && (
        <Modal
          open={true}
          title={editingItem === 'new' ? 'Yeni Sınıf/Salon' : 'Sınıf/Salon Düzenle'}
          onClose={() => setEditingItem(null)}
          width={400}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Sınıf/Salon Adı">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
            <FormField label="Kapasite (Kişi)">
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </FormField>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <GhostBtn onClick={() => setEditingItem(null)} style={{ color: '#6B7280' }}>
                İptal
              </GhostBtn>
              <Btn onClick={handleClassSave} disabled={saving}>
                Kaydet
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Gözetmen Ekleme Modal — mevcut profesörden seç veya yeni ekle */}
      {editingItem === 'new_sup' && activeTab === 'supervisors' && (
        <Modal open={true} title="Gözetmen Ekle" onClose={() => setEditingItem(null)} width={450}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
              Mevcut bir akademisyeni gözetmen olarak atayabilir veya yeni bir isim girebilirsiniz.
            </p>

            {nonSupervisorProfs.length > 0 && (
              <FormField label="Mevcut Akademisyenden Seç">
                <select
                  value={form.selectedProfId}
                  onChange={(e) =>
                    setForm({ ...form, selectedProfId: e.target.value, newName: '' })
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #D1D5DB',
                    fontSize: 13,
                  }}
                >
                  <option value="">— Seçim yapın —</option>
                  {nonSupervisorProfs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            <div style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>veya</div>

            <FormField label="Yeni Akademisyen Adı (Unvan+Ad+Soyad)">
              <Input
                value={form.newName}
                onChange={(e) => setForm({ ...form, newName: e.target.value, selectedProfId: '' })}
                placeholder="Örn: Arş. Gör. Ali YILMAZ"
              />
            </FormField>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <GhostBtn onClick={() => setEditingItem(null)} style={{ color: '#6B7280' }}>
                İptal
              </GhostBtn>
              <Btn onClick={handleSupSave} disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Gözetmen Ata'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Gözetmen Düzenleme Modal */}
      {editingItem &&
        editingItem !== 'new' &&
        editingItem !== 'new_sup' &&
        activeTab === 'supervisors' && (
          <Modal
            open={true}
            title="Gözetmen Düzenle"
            onClose={() => setEditingItem(null)}
            width={400}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormField label="Gözetmen Adı (Unvan+Ad+Soyad)">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </FormField>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <GhostBtn onClick={() => setEditingItem(null)} style={{ color: '#6B7280' }}>
                  İptal
                </GhostBtn>
                <Btn onClick={handleSupSave} disabled={saving}>
                  Kaydet
                </Btn>
              </div>
            </div>
          </Modal>
        )}
    </div>
  );
}

// ── Ders Seçim Kilitleri ──
// Öğrenci ders seçimini kaydedince kilitlenir; değiştirmesi için bölüm
// yetkilisi buradan kilidi açar. Yalnız bölümün (tüm kimlik varyantları)
// kilitli student_courses kayıtları listelenir.
function DersSecimKilitleri({ activeDepartment, currentUser }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      let variants = [activeDepartment];
      if (window.deptIdVariants) {
        try {
          variants = await window.deptIdVariants(activeDepartment);
        } catch (_) {
          variants = [activeDepartment];
        }
      }
      const vset = new Set((variants || [activeDepartment]).map(String));
      const all = await window.apiRead('student_courses');
      const mine = (all || []).filter(
        (d) => d && d.locked === true && vset.has(String(d.departmentId))
      );
      mine.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      setRows(mine);
    } catch (e) {
      console.error('Kilitler yüklenemedi:', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeDepartment]);

  useEffect(() => {
    load();
  }, [load]);

  const unlock = async (r) => {
    if (!window.confirm(r.studentNumber + ' için ' + r.termKey + ' seçim kilidi açılsın mı?'))
      return;
    setBusyId(r.id || r._docId || r.studentNumber + r.termKey);
    try {
      const docId = r.studentNumber + '__' + r.termKey;
      await window.DBWrite.update('student_courses', docId, { locked: false });
      if (window.audit)
        window.audit('ders_secim_kilit_ac', 'student_courses', docId, {
          meta: { by: currentUser?.name || currentUser?.identifier, term: r.termKey },
        });
      setRows((prev) => prev.filter((x) => x !== r));
    } catch (e) {
      alert('Kilit açılamadı: ' + e.message);
    } finally {
      setBusyId('');
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Yükleniyor...</div>;

  return (
    <div
      style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 16 }}
    >
      <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 14px' }}>
        Öğrenci ders seçimini kaydedince kilitlenir. Değişiklik talebinde kilidi buradan açın;
        öğrenci yeniden düzenleyip kaydedebilir (tekrar kilitlenir).
      </p>
      {rows.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
          Kilitli ders seçimi bulunmuyor.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Öğrenci No</th>
                <th style={{ padding: '10px 12px' }}>Dönem</th>
                <th style={{ padding: '10px 12px' }}>Ders</th>
                <th style={{ padding: '10px 12px' }}>AKTS</th>
                <th style={{ padding: '10px 12px' }}>Danışman</th>
                <th style={{ padding: '10px 12px' }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id || r._docId || r.studentNumber + r.termKey}
                  style={{ borderTop: '1px solid #F3F4F6' }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.studentNumber}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {(r.academicYear || '') + ' ' + (r.donem === 'guz' ? 'Güz' : 'Bahar')}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{(r.courseIds || []).length} ders</td>
                  <td style={{ padding: '10px 12px' }}>
                    {r.totalAkts != null ? r.totalAkts : '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{r.advisor || '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <button
                      onClick={() => unlock(r)}
                      disabled={busyId === (r.id || r._docId || r.studentNumber + r.termKey)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: '1px solid ' + C.blue,
                        background: 'white',
                        color: C.blue,
                        fontWeight: 600,
                        fontSize: 12.5,
                        cursor: 'pointer',
                      }}
                    >
                      Kilidi Aç
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Benim Sayfam Ayarları — bölüm bazlı Hızlı Bağlantılar + Kampüs Haritası.
// benim_ayarlar/{departmentId} dokümanına yazılır; öğrencinin Benim Sayfam'ı okur.
// ══════════════════════════════════════════════════════════════
function BenimSayfamAyarlari({ activeDepartment }) {
  const [links, setLinks] = useState([]);
  const [campusMapUrl, setCampusMapUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMap, setUploadingMap] = useState(false);
  const [msg, setMsg] = useState('');
  const mapFileRef = React.useRef(null);

  const handleMapUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      setMsg('Kampüs haritası yalnızca PNG veya JPEG olabilir.');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    setUploadingMap(true);
    setMsg('');
    try {
      const form = new FormData();
      form.append('folder', 'benim_ayarlar/maps');
      form.append('file', file);
      const res = await fetch(
        '/api/files/upload?folder=' + encodeURIComponent('benim_ayarlar/maps'),
        {
          method: 'POST',
          body: form,
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Yükleme başarısız (HTTP ' + res.status + ')');
      const json = await res.json();
      setCampusMapUrl(json.downloadURL || '');
      setMsg('Görsel yüklendi — kaydetmeyi unutmayın.');
    } catch (err) {
      setMsg('Yükleme hatası: ' + err.message);
    } finally {
      setUploadingMap(false);
      setTimeout(() => setMsg(''), 3500);
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        // apiReadDoc { exists, data, id } döner — asıl kayıt data içinde.
        const res = await window.apiReadDoc('benim_ayarlar', String(activeDepartment));
        const doc = (res && (res.data || (res.exists ? res.data : null))) || {};
        if (!alive) return;
        setLinks(Array.isArray(doc.quickLinks) ? doc.quickLinks : []);
        setCampusMapUrl(doc.campusMapUrl || '');
      } catch (_) {
        if (alive) {
          setLinks([]);
          setCampusMapUrl('');
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [activeDepartment]);

  const addLink = () => setLinks((p) => [...p, { label: '', url: '' }]);
  const updateLink = (i, k, v) =>
    setLinks((p) => p.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  const removeLink = (i) => setLinks((p) => p.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const cleanLinks = links
        .map((l) => ({ label: (l.label || '').trim(), url: (l.url || '').trim() }))
        .filter((l) => l.label && l.url);
      await DBWrite.set(
        'benim_ayarlar',
        String(activeDepartment),
        {
          departmentId: String(activeDepartment),
          quickLinks: cleanLinks,
          campusMapUrl: (campusMapUrl || '').trim(),
          updatedAt: new Date().toISOString(),
        },
        true
      );
      setLinks(cleanLinks);
      setMsg('Kaydedildi.');
      if (window.audit)
        window.audit('benim_ayarlar_update', 'benim_ayarlar', String(activeDepartment), {
          meta: { linkCount: cleanLinks.length, hasMap: !!campusMapUrl },
        });
    } catch (e) {
      setMsg('Hata: ' + e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const inputStyle = {
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid #D1D5DB',
    fontSize: 13,
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7280',
    marginBottom: 6,
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Yükleniyor...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ fontSize: 12.5, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
        Bu ayarlar bu bölümün öğrencilerinin <b>Benim Sayfam</b> ekranında görünür. Hızlı
        bağlantılar ve kampüs haritası bölümden bölüme değişebilir.
      </p>

      {/* Hızlı Bağlantılar */}
      <div
        style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.navy }}>
            Hızlı Bağlantılar
          </h3>
          <Btn small variant="secondary" onClick={addLink}>
            + Bağlantı Ekle
          </Btn>
        </div>
        {links.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
            Henüz bağlantı yok. "Bağlantı Ekle" ile başlayın (ör. Öğrenci Bilgi Sistemi, Kütüphane).
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {links.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={l.label}
                  onChange={(e) => updateLink(i, 'label', e.target.value)}
                  placeholder="Ad (ör. Kütüphane)"
                  style={{ ...inputStyle, flex: '1 1 180px', minWidth: 0 }}
                />
                <input
                  value={l.url}
                  onChange={(e) => updateLink(i, 'url', e.target.value)}
                  placeholder="https://…"
                  style={{ ...inputStyle, flex: '2 1 260px', minWidth: 0 }}
                />
                <button
                  onClick={() => removeLink(i)}
                  title="Sil"
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: '1px solid #FCA5A5',
                    background: 'white',
                    color: '#DC2626',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    flexShrink: 0,
                  }}
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
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kampüs Haritası */}
      <div
        style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: 18,
        }}
      >
        <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: C.navy }}>
          Kampüs Haritası
        </h3>
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: 10,
          }}
        >
          <input
            ref={mapFileRef}
            type="file"
            accept="image/png,image/jpeg"
            style={{ display: 'none' }}
            onChange={handleMapUpload}
          />
          <Btn
            small
            onClick={() => mapFileRef.current && mapFileRef.current.click()}
            disabled={uploadingMap}
          >
            {uploadingMap ? 'Yükleniyor…' : 'Görsel Yükle (PNG/JPEG)'}
          </Btn>
          {campusMapUrl && (
            <button
              onClick={() => setCampusMapUrl('')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #FCA5A5',
                background: 'white',
                color: '#DC2626',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Kaldır
            </button>
          )}
        </div>
        <label style={labelStyle}>veya görsel bağlantısı (URL)</label>
        <input
          value={campusMapUrl}
          onChange={(e) => setCampusMapUrl(e.target.value)}
          placeholder="https://… (kampüs haritası görseli)"
          style={{ ...inputStyle, width: '100%' }}
        />
        {campusMapUrl && (
          <div
            style={{
              marginTop: 12,
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <img
              src={campusMapUrl}
              alt="Kampüs Haritası önizleme"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                maxHeight: 260,
                objectFit: 'cover',
              }}
            />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Btn onClick={save} disabled={saving}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </Btn>
        {msg && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: msg.startsWith('Hata') ? '#DC2626' : '#059669',
            }}
          >
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Akademisyen Bilgileri — akademisyen seç, e-posta/dahili/foto ekle.
// professors koleksiyonundaki ilgili dokümana yazılır; öğrencinin
// Benim Sayfam "Danışman Bilgileri" alanında görünür.
// ══════════════════════════════════════════════════════════════
function AkademisyenBilgileri({ professors, onSaved }) {
  const [selId, setSelId] = useState('');
  const [email, setEmail] = useState('');
  const [dahili, setDahili] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const photoRef = React.useRef(null);

  const sorted = (professors || [])
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));

  const onSelect = (id) => {
    setSelId(id);
    const p = sorted.find((x) => (x.id || x._docId) === id);
    setEmail(p?.email || '');
    setDahili(p?.dahili || '');
    setPhotoURL(p?.photoURL || '');
    setMsg('');
  };

  const handlePhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      setMsg('Fotoğraf yalnızca PNG veya JPEG olabilir.');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    setUploading(true);
    setMsg('');
    try {
      const form = new FormData();
      form.append('folder', 'akademisyen/foto');
      form.append('file', file);
      const res = await fetch(
        '/api/files/upload?folder=' + encodeURIComponent('akademisyen/foto'),
        {
          method: 'POST',
          body: form,
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Yükleme başarısız (HTTP ' + res.status + ')');
      const json = await res.json();
      setPhotoURL(json.downloadURL || '');
    } catch (err) {
      setMsg('Yükleme hatası: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!selId) {
      setMsg('Önce bir akademisyen seçin.');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      await DBWrite.set(
        'professors',
        String(selId),
        {
          email: (email || '').trim(),
          dahili: (dahili || '').trim(),
          photoURL: (photoURL || '').trim(),
          updatedAt: new Date().toISOString(),
        },
        true
      );
      const p = sorted.find((x) => (x.id || x._docId) === selId);
      if (window.audit)
        window.audit('professor_info_update', 'professors', String(selId), {
          meta: { name: p?.name, hasPhoto: !!photoURL },
        });
      setMsg('Kaydedildi.');
      if (onSaved) onSaved();
    } catch (e) {
      setMsg('Hata: ' + e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const inputStyle = {
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid #D1D5DB',
    fontSize: 13,
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
    width: '100%',
  };
  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7280',
    marginBottom: 6,
  };

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: 20,
        maxWidth: 560,
      }}
    >
      <p style={{ fontSize: 12.5, color: '#6B7280', margin: '0 0 16px', lineHeight: 1.5 }}>
        Akademisyen seçip iletişim bilgilerini girin. Bu bilgiler, danışmanı bu akademisyen olan
        öğrencilerin <b>Benim Sayfam → Danışman Bilgileri</b> alanında görünür.
      </p>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Akademisyen</label>
        <select
          value={selId}
          onChange={(e) => onSelect(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">— Akademisyen seçin —</option>
          {sorted.map((p) => (
            <option key={p.id || p._docId} value={p.id || p._docId}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {selId && (
        <>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                flexShrink: 0,
                background: '#F3F4F6',
                border: '1px solid #E5E7EB',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {photoURL ? (
                <img
                  src={photoURL}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
                </svg>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                ref={photoRef}
                type="file"
                accept="image/png,image/jpeg"
                style={{ display: 'none' }}
                onChange={handlePhoto}
              />
              <Btn
                small
                variant="secondary"
                onClick={() => photoRef.current && photoRef.current.click()}
                disabled={uploading}
              >
                {uploading ? 'Yükleniyor…' : 'Fotoğraf Yükle'}
              </Btn>
              {photoURL && (
                <button
                  onClick={() => setPhotoURL('')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid #FCA5A5',
                    background: 'white',
                    color: '#DC2626',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Kaldır
                </button>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>E-posta</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@karatekin.edu.tr"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Dahili</label>
            <input
              value={dahili}
              onChange={(e) => setDahili(e.target.value)}
              placeholder="Örn: 1234"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Btn onClick={save} disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </Btn>
            {msg && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color:
                    msg.startsWith('Hata') || msg.startsWith('Yükleme hatası')
                      ? '#DC2626'
                      : '#059669',
                }}
              >
                {msg}
              </span>
            )}
          </div>
        </>
      )}
      {!selId && msg && (
        <span style={{ fontSize: 13, fontWeight: 500, color: '#DC2626' }}>{msg}</span>
      )}
    </div>
  );
}

window.BolumYonetimiModuluApp = BolumYonetimiModuluApp;
