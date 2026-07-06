// ══════════════════════════════════════════════════════════════
// ÇAKÜ Ders Yönetimi Modülü
// Sınav otomasyonu için gerekli tüm derslerin eklendiği ve yönetildiği alan
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo } = React;

// Shared bileşenlerden importlar
const C = window.C;
const Modal = window.Modal;
const Input = window.Input;
const Select = window.Select;
const FormField = window.FormField;
const Btn = window.Btn;
const Badge = window.Badge;
const DBWrite = window.DBWrite || {};

const SINIF_COLORS = {
  1: { bg: '#B2EBF2', text: '#006064', label: '1. Sınıf' },
  2: { bg: '#C8E6C9', text: '#1B5E20', label: '2. Sınıf' },
  3: { bg: '#FFE0B2', text: '#E65100', label: '3. Sınıf' },
  4: { bg: '#F8BBD0', text: '#880E4F', label: '4. Sınıf' },
  5: { bg: '#E1BEE7', text: '#4A148C', label: 'Seçmeli Dersler' },
};

function DersYonetimiModuluApp({ currentUser, activeDepartment }) {
  const [courses, setCourses] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    sinif: 1,
    duration: 30,
    professor: '',
    donem: 'guz',
    akts: 6,
    bolognaLink: '',
    statu: '', // Z/S — bilinçli seçim zorunlu, varsayılan yok
    seviye: 'lisans', // lisans | yukseklisans | doktora
  });
  const [saving, setSaving] = useState(false);
  const [filterClass, setFilterClass] = useState('all');
  const [filterTerm, setFilterTerm] = useState('all');
  const [search, setSearch] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const isDeptManager = currentUser?.role === 'bolum_yetkilisi';
  const hasAccess = isAdmin || isDeptManager;

  const loadData = async () => {
    setLoading(true);
    try {
      // Dersleri getir (bölüm bazlı)
      const whereParam = activeDepartment ? `departmentId:eq:${activeDepartment}` : undefined;
      let allCourses = await window.apiRead(
        'sinav_dersler',
        whereParam ? { where: whereParam } : {}
      );
      setCourses(allCourses);

      // Akademisyenleri getir (dropdown için) — çapraz-bölüm desteği için
      // tüm listeyi al, sonra (admin değilse) profMatchesDept ile filtrele.
      let allProfs = await window.apiRead('professors');
      if (!isAdmin && activeDepartment) {
        const dept = (window.DEPARTMENTS || []).find((x) => x.id === activeDepartment);
        allProfs = (allProfs || []).filter((p) =>
          window.profMatchesDept
            ? window.profMatchesDept(p, activeDepartment, dept?.name)
            : p.departmentId === activeDepartment
        );
      }
      setProfessors(allProfs);
    } catch (e) {
      console.error('Ders yönetimi yüklenirken hata:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      loadData();
    }
  }, [hasAccess, activeDepartment]);

  const startEdit = (c) => {
    setEditingCourse(c);
    setForm({
      code: c.code,
      name: c.name,
      sinif: c.sinif,
      duration: c.duration,
      professor: c.professor || '',
      donem: c.donem || 'guz',
      akts: c.akts || 6,
      bolognaLink: c.bolognaLink || '',
      statu: c.statu || (c.sinif === 5 ? 'S' : ''),
      seviye: c.seviye || 'lisans',
    });
  };

  const startNew = () => {
    setEditingCourse('new');
    setForm({
      code: '',
      name: '',
      sinif: 1,
      duration: 30,
      professor: '',
      donem: 'guz',
      akts: 6,
      bolognaLink: '',
      statu: '',
      seviye: 'lisans',
    });
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) return alert('Ders kodu ve adı zorunludur.');
    const bolognaLink = (form.bolognaLink || '').trim();
    if (!bolognaLink) return alert('Ders Bologna linki zorunludur.');
    if (form.statu !== 'Z' && form.statu !== 'S')
      return alert('Zorunlu (Z) / Seçmeli (S) seçimi zorunludur.');
    setSaving(true);
    try {
      const dataToSave = {
        code: form.code.trim(),
        name: form.name.trim(),
        sinif: parseInt(form.sinif) || 1,
        duration: parseInt(form.duration) || 30,
        akts: parseInt(form.akts) || 6,
        professor: form.professor || '',
        donem: form.donem,
        bolognaLink: bolognaLink,
        statu: form.statu,
        seviye: form.seviye || 'lisans',
        departmentId: activeDepartment || 'bilgisayar',
        updatedAt: new Date().toISOString(),
      };

      if (editingCourse === 'new') {
        dataToSave.studentCount = 0;
        dataToSave.createdAt = dataToSave.updatedAt;
        await DBWrite.add('sinav_dersler', dataToSave);
        if (window.audit)
          window.audit('course_create', 'sinav_dersler', '', {
            meta: { code: dataToSave.code, name: dataToSave.name },
          });
      } else {
        await DBWrite.set('sinav_dersler', editingCourse.id, dataToSave, true);
        if (window.audit)
          window.audit('course_update', 'sinav_dersler', editingCourse.id, {
            meta: { code: dataToSave.code, name: dataToSave.name },
          });
      }

      setEditingCourse(null);
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Ders kaydedilemedi: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`${c.code} kodlu ${c.name} dersini silmek istediğinize emin misiniz?`)) return;
    try {
      await DBWrite.remove('sinav_dersler', c.id);
      if (window.audit)
        window.audit('course_delete', 'sinav_dersler', c.id, {
          meta: { code: c.code, name: c.name },
        });
      setCourses(courses.filter((course) => course.id !== c.id));
    } catch (e) {
      console.error(e);
      alert('Silme başarısız: ' + e.message);
    }
  };

  const filteredCourses = useMemo(() => {
    return courses
      .filter((c) => {
        if (filterClass !== 'all' && c.sinif.toString() !== filterClass) return false;
        if (filterTerm === 'none' && c.donem && (c.donem === 'guz' || c.donem === 'bahar'))
          return false;
        if (filterTerm !== 'all' && filterTerm !== 'none' && c.donem !== filterTerm) return false;
        if (
          search &&
          !c.code.toLowerCase().includes(search.toLowerCase()) &&
          !c.name.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        if (a.sinif !== b.sinif) return a.sinif - b.sinif;
        return a.code.localeCompare(b.code);
      });
  }, [courses, filterClass, filterTerm, search]);

  if (!hasAccess) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: '#DC2626' }}>Erişim Reddedildi</h2>
        <p>Bu modüle sadece Fakülte Yöneticisi veya Bölüm Yetkilileri erişebilir.</p>
      </div>
    );
  }

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
            Ders Yönetimi
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            Bölüme ait derslerin programı, hocası ve temel tanımlamaları
          </p>
        </div>
        <Btn onClick={startNew}>+ Yeni Ders Tanımla</Btn>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 12,
            border: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>Tümü</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1B2A4A' }}>{courses.length}</div>
        </div>
        <div
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 12,
            border: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>Güz Dönemi</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0D47A1' }}>
            {courses.filter((c) => c.donem === 'guz').length}
          </div>
        </div>
        <div
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 12,
            border: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>Bahar Dönemi</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1B5E20' }}>
            {courses.filter((c) => c.donem === 'bahar').length}
          </div>
        </div>
        {courses.filter((c) => !c.donem || (c.donem !== 'guz' && c.donem !== 'bahar')).length >
          0 && (
          <div
            style={{
              background: '#FFF7ED',
              padding: 16,
              borderRadius: 12,
              border: '1px solid #FED7AA',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 13, color: '#C2410C', fontWeight: 600 }}>
              Dönem Belirtilmemiş
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#EA580C' }}>
              {courses.filter((c) => !c.donem || (c.donem !== 'guz' && c.donem !== 'bahar')).length}
            </div>
          </div>
        )}
      </div>

      {loading ? (
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
          <div
            style={{
              padding: 16,
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              gap: 12,
              background: '#F9FAFB',
              flexWrap: 'wrap',
            }}
          >
            <Input
              placeholder="Ders kodu veya adı ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <Select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              style={{ width: 140 }}
            >
              <option value="all">Tüm Sınıflar</option>
              <option value="1">1. Sınıf</option>
              <option value="2">2. Sınıf</option>
              <option value="3">3. Sınıf</option>
              <option value="4">4. Sınıf</option>
              <option value="5">Seçmeli</option>
            </Select>
            <Select
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
              style={{ width: 160 }}
            >
              <option value="all">Tüm Dönemler</option>
              <option value="guz">Güz</option>
              <option value="bahar">Bahar</option>
              <option value="none">Belirtilmemiş</option>
            </Select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}
            >
              <thead>
                <tr style={{ background: 'white' }}>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${C.border}`,
                      color: '#374151',
                    }}
                  >
                    Kod
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${C.border}`,
                      color: '#374151',
                    }}
                  >
                    Ders Adı
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      borderBottom: `2px solid ${C.border}`,
                      color: '#374151',
                    }}
                  >
                    Sınıf
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      borderBottom: `2px solid ${C.border}`,
                      color: '#374151',
                    }}
                  >
                    Dönem
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      borderBottom: `2px solid ${C.border}`,
                      color: '#374151',
                    }}
                  >
                    AKTS
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      borderBottom: `2px solid ${C.border}`,
                      color: '#374151',
                    }}
                  >
                    Süre
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${C.border}`,
                      color: '#374151',
                    }}
                  >
                    Akademisyen
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      borderBottom: `2px solid ${C.border}`,
                      color: '#374151',
                    }}
                  >
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge
                        style={{
                          background: SINIF_COLORS[c.sinif]?.bg,
                          color: SINIF_COLORS[c.sinif]?.text,
                        }}
                      >
                        {c.code}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {c.sinif === 5 ? 'Seçmeli' : `${c.sinif}. Sınıf`}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <Badge
                        style={{
                          background:
                            c.donem === 'bahar'
                              ? '#C8E6C9'
                              : c.donem === 'guz'
                                ? '#BBDEFB'
                                : '#FEE2E2',
                          color:
                            c.donem === 'bahar'
                              ? '#1B5E20'
                              : c.donem === 'guz'
                                ? '#0D47A1'
                                : '#DC2626',
                          fontSize: 11,
                        }}
                      >
                        {c.donem === 'bahar' ? 'Bahar' : c.donem === 'guz' ? 'Güz' : '—'}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                      {c.akts || 6}
                      {c.statu && (
                        <span
                          title={c.statu === 'Z' ? 'Zorunlu' : 'Seçmeli'}
                          style={{
                            marginLeft: 6,
                            padding: '1px 6px',
                            borderRadius: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            background: c.statu === 'Z' ? '#DBEAFE' : '#E1BEE7',
                            color: c.statu === 'Z' ? '#0D47A1' : '#4A148C',
                          }}
                        >
                          {c.statu}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>{c.duration} dk</td>
                    <td style={{ padding: '12px 16px', fontSize: 12 }}>
                      {c.professor || <span style={{ color: '#9CA3AF' }}>Bilinmiyor</span>}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button
                          onClick={() => startEdit(c)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#6366F1',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#DC2626',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCourses.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
                      Aradığınız kritere uygun ders bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ders Düzenle/Ekle Modal */}
      {editingCourse && (
        <Modal
          open={true}
          title={editingCourse === 'new' ? 'Yeni Ders Tanımla' : 'Ders Bilgilerini Düzenle'}
          onClose={() => setEditingCourse(null)}
          width={600}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <FormField label="Ders Kodu">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="Örn: BİL101"
                />
              </FormField>
              <FormField label="Ders Adı">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Örn: Algoritmalara Giriş"
                />
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Sınıf">
                <Select
                  value={form.sinif}
                  onChange={(e) => setForm({ ...form, sinif: parseInt(e.target.value) })}
                >
                  {[1, 2, 3, 4, 5].map((s) => (
                    <option key={s} value={s}>
                      {s === 5 ? 'Seçmeli' : `${s}. Sınıf`}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Dönem">
                <Select
                  value={form.donem}
                  onChange={(e) => setForm({ ...form, donem: e.target.value })}
                >
                  <option value="guz">Güz</option>
                  <option value="bahar">Bahar</option>
                </Select>
              </FormField>
              <FormField label="AKTS">
                <Select
                  value={form.akts}
                  onChange={(e) => setForm({ ...form, akts: parseInt(e.target.value) })}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((a) => (
                    <option key={a} value={a}>
                      {a} AKTS
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Zorunlu / Seçmeli *">
                <Select
                  value={form.statu}
                  onChange={(e) => setForm({ ...form, statu: e.target.value })}
                >
                  <option value="">— Seçiniz —</option>
                  <option value="Z">Z (Zorunlu)</option>
                  <option value="S">S (Seçmeli)</option>
                </Select>
              </FormField>
              <FormField label="Seviye">
                <Select
                  value={form.seviye}
                  onChange={(e) => setForm({ ...form, seviye: e.target.value })}
                >
                  <option value="lisans">Lisans</option>
                  <option value="yukseklisans">Yüksek Lisans</option>
                  <option value="doktora">Doktora</option>
                </Select>
              </FormField>
              <FormField label="Sınav Süresi (dk)">
                <Select
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) })}
                >
                  {[30, 45, 60, 75, 90, 105, 120, 150].map((d) => (
                    <option key={d} value={d}>
                      {d} dk
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="İlgili Akademisyen">
                <Input
                  value={form.professor}
                  onChange={(e) => setForm({ ...form, professor: e.target.value })}
                  placeholder="İsim yazın veya seçin..."
                  list="course-prof-lookup"
                />
                <datalist id="course-prof-lookup">
                  {professors.map((p, i) => (
                    <option key={i} value={p.name} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Ders Bologna Linki *">
                <Input
                  value={form.bolognaLink}
                  onChange={(e) => setForm({ ...form, bolognaLink: e.target.value })}
                  placeholder="https://bologna.cankiri.edu.tr/..."
                />
              </FormField>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={() => setEditingCourse(null)}
                style={{
                  padding: '10px 16px',
                  background: 'white',
                  border: '1px solid #D1D5DB',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                İptal
              </button>
              <Btn onClick={handleSave} disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

window.DersYonetimiModuluApp = DersYonetimiModuluApp;
