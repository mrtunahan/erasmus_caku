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

// ══════════════════════════════════════════════════════════════
// GÖRSEL DİL
//
// Modül zamanla farklı ellerden geçti: her sekme kendi renk ve boşluk
// değerlerini satır içinde taşıyordu (aynı gri için üç ayrı hex, kartlarda
// 12/16/18 karışık padding). Ekranlar tek tek çalışıyor ama bir arada
// dağınık duruyordu. Aşağıdaki palet ve küçük bileşenler tek kaynak: yeni
// bir sekme eklerken renk uydurmak gerekmez.
// ══════════════════════════════════════════════════════════════
const BY = {
  navy: '#1B2A4A',
  blue: '#2563EB',
  bluePale: '#EFF6FF',
  teal: '#0F766E',
  tealText: '#0F766E',
  tealPale: '#F0FDFA',
  tealBorder: '#99F6E4',
  amber: '#B45309',
  amberPale: '#FFFBEB',
  red: '#DC2626',
  redPale: '#FEF2F2',
  text: '#1F2937',
  textMuted: '#64748B',
  border: '#E5E7EB',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
};

const byKart = {
  background: BY.surface,
  border: `1px solid ${BY.border}`,
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
};

/** Sekme başındaki açıklama bloğu — her sekmede aynı biçim. */
const BYAciklama = ({ children }) => (
  <div
    style={{
      background: BY.bluePale,
      border: `1px solid #BFDBFE`,
      borderRadius: 10,
      padding: '11px 14px',
      margin: '0 0 16px',
      fontSize: 12.5,
      color: '#1E3A5F',
      lineHeight: 1.6,
    }}
  >
    {children}
  </div>
);

/** Boş/yükleniyor durumu — her sekmede aynı görünsün. */
const BYBos = ({ children }) => (
  <div
    style={{
      ...byKart,
      padding: 40,
      textAlign: 'center',
      color: '#94A3B8',
      fontSize: 13.5,
      borderStyle: 'dashed',
      boxShadow: 'none',
    }}
  >
    {children}
  </div>
);

// Sekmeler tek listede: ekleme/çıkarma tek satır, sıralama burada görünür.
const BY_SEKMELER = [
  { id: 'classrooms', label: 'Sınıf / Salon', ipucu: 'Bölümün derslik ve salon tanımları' },
  { id: 'supervisors', label: 'Gözetmenler', ipucu: 'Sınav gözetmeni akademisyenler' },
  { id: 'kilitler', label: 'Ders Seçim Kilitleri', ipucu: 'Öğrencinin ders seçimini aç/kapat' },
  { id: 'benimayar', label: 'Benim Sayfam', ipucu: 'Öğrenci sayfasında görünecek alanlar' },
  { id: 'akademisyenbilgi', label: 'Akademisyenler', ipucu: 'İletişim bilgileri ve ders programı' },
  { id: 'memurbilgi', label: 'Memurlar', ipucu: 'Bu bölüme memur ata ve modüllerini seç' },
  { id: 'duyurular', label: 'Duyurular', ipucu: 'Kapsamındaki bölümlere pop-up duyuru' },
  { id: 'mezuniyet', label: 'Mezuniyet Kuralları', ipucu: 'AKTS, AGNO ve staj şartı' },
  { id: 'programayar', label: 'Program Ayarları', ipucu: 'Ders programı rengi ve saat aralığı' },
];

// Hangi bölümü düzenlediğimizi söyleyen şerit — modül bölüme özeldir, bu
// ekranda yapılan her ayar yalnız o bölümü etkiler.
const byBolumBaslik = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  padding: '10px 14px',
  marginBottom: 10,
  background: BY.surfaceMuted,
  border: `1px solid ${BY.border}`,
  borderLeft: `3px solid ${BY.blue}`,
  borderRadius: 8,
};

const byySekmeCubugu = {
  display: 'flex',
  gap: 4,
  flexWrap: 'wrap',
  padding: 4,
  marginBottom: 20,
  background: BY.surfaceMuted,
  border: `1px solid ${BY.border}`,
  borderRadius: 10,
};

// Tablolar üç sekmede aynı işi yapıyor ama her biri kendi hücre dolgusunu,
// başlık rengini ve zebrasını taşıyordu. Tek biçim:
const byTablo = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const byTh = {
  padding: '10px 14px',
  textAlign: 'left',
  color: BY.textMuted,
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: 0.3,
  textTransform: 'uppercase',
  borderBottom: `1px solid ${BY.border}`,
  background: BY.surfaceMuted,
};
const byTd = { padding: '11px 14px', color: BY.text, borderBottom: `1px solid ${BY.border}` };

/** Tablo içi "kayıt yok" satırı — boş ekran sessiz kalmasın. */
const BYTabloBos = ({ kolon, children }) => (
  <tr>
    <td
      colSpan={kolon}
      style={{ ...byTd, textAlign: 'center', color: '#94A3B8', padding: '26px 14px' }}
    >
      {children}
    </td>
  </tr>
);

const BYRozet = ({ children, renk, zemin }) => (
  <span
    style={{
      padding: '2px 9px',
      borderRadius: 20,
      background: zemin || BY.surfaceMuted,
      color: renk || BY.textMuted,
      fontSize: 10.5,
      fontWeight: 700,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}
  >
    {children}
  </span>
);

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

  // Modül BÖLÜME ÖZELDİR; ekranın her yerinde hangi bölümü düzenlediğimiz
  // yazsın diye ad tek yerde çözülür (DB kaydı → gömülü liste → boş).
  const aktifBolumAdi = useMemo(
    () =>
      (departments || []).find((d) =>
        [d.id, d._id, d._docId, d.code].some((k) => k && String(k) === activeDepartment)
      )?.name ||
      (window.DEPARTMENTS || []).find((x) => x.id === activeDepartment)?.name ||
      '',
    [departments, activeDepartment]
  );

  // Bölümün KENDİ akademisyenleri: memurlar ve yalnızca çapraz-bölüm olarak
  // (additionalDepartments üzerinden) eklenmiş dışarıdan hocalar HARİÇ.
  // `professors` listesi çapraz-bölüm atamalarını da içerdiği için burada
  // ana bölüm eşleşmesi aranır.
  const bolumAkademisyenleri = useMemo(() => {
    const dept = (window.DEPARTMENTS || []).find((x) => x.id === activeDepartment);
    const deptAdi = (dept?.name || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, '');
    return professors.filter((p) => {
      if (p.isMemur) return false;
      if (p.departmentId) return p.departmentId === activeDepartment;
      // departmentId'si boş olan eski kayıtlar: bölüm ADI eşleşmesi kabul edilir
      const adi = (p.department || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, '');
      return !!deptAdi && adi === deptAdi;
    });
  }, [professors, activeDepartment]);

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
          <h1 style={{ fontSize: 24, fontWeight: 700, color: BY.navy, margin: 0 }}>
            Bölüm Yönetimi
          </h1>
          {/* Eski alt başlık "hiyerarşi"den söz ediyordu; o sekme kaldırılmıştı
              (bölüm tanımı artık Fakülte Yönetimi'nde). */}
          <p style={{ fontSize: 13, color: BY.textMuted, marginTop: 4 }}>
            Derslikler, gözetmenler, akademisyen ve memur ayarları — <b>yalnız bu bölüm için</b>
          </p>
        </div>
      </div>

      {/* ── Sekmeler ──
          Yedi sekme, yedi kez kopyalanmış aynı 16 satırlık düğme bloğuydu;
          bir sekmenin rengi ya da boşluğu değişince diğerleri geride
          kalıyordu. Liste artık veri: yeni sekme bir satır. */}
      <div style={byBolumBaslik}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: BY.textMuted, letterSpacing: 0.3 }}>
          DÜZENLENEN BÖLÜM
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: BY.navy }}>
          {aktifBolumAdi || 'Bölüm seçilmedi'}
        </div>
      </div>
      <div style={byySekmeCubugu}>
        {BY_SEKMELER.map((t) => {
          const aktif = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              title={t.ipucu}
              style={{
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid ' + (aktif ? BY.blue : 'transparent'),
                background: aktif ? BY.bluePale : 'transparent',
                color: aktif ? BY.blue : BY.textMuted,
                fontWeight: aktif ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
                transition: 'all .15s',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'kilitler' && (
        <DersSecimKilitleri activeDepartment={activeDepartment} currentUser={currentUser} />
      )}

      {activeTab === 'benimayar' && (
        <BenimSayfamAyarlari activeDepartment={activeDepartment} currentUser={currentUser} />
      )}

      {activeTab === 'akademisyenbilgi' && (
        <AkademisyenBilgileri
          professors={bolumAkademisyenleri}
          onSaved={loadData}
          bolumAdi={aktifBolumAdi}
        />
      )}

      {activeTab === 'memurbilgi' && (
        <MemurBilgileri
          currentUser={currentUser}
          // Memur ataması BÖLÜM başınadır: hangi bölümün ayarını
          // düzenlediğimiz açık olmalı.
          activeDepartment={activeDepartment}
          bolumAdi={aktifBolumAdi}
        />
      )}

      {activeTab === 'duyurular' && (
        <DuyuruYonetimi currentUser={currentUser} activeDepartment={activeDepartment} />
      )}

      {activeTab === 'mezuniyet' && (
        <MezuniyetKurallari activeDepartment={activeDepartment} currentUser={currentUser} />
      )}

      {activeTab === 'programayar' && (
        <BolumRengiAyari
          activeDepartment={activeDepartment}
          bolumAdi={aktifBolumAdi}
          currentUser={currentUser}
        />
      )}

      {activeTab !== 'kilitler' &&
        activeTab !== 'benimayar' &&
        activeTab !== 'akademisyenbilgi' &&
        activeTab !== 'memurbilgi' &&
        activeTab !== 'duyurular' &&
        activeTab !== 'mezuniyet' &&
        activeTab !== 'programayar' &&
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
                <table style={byTablo}>
                  <thead>
                    <tr>
                      <th style={byTh}>Bölüm Adı</th>
                      <th style={byTh}>Yetkili Kişi</th>
                      <th style={{ ...byTh, textAlign: 'center', width: 120 }}>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((d) => (
                      <tr key={d.id}>
                        <td style={{ ...byTd, fontWeight: 600 }}>{d.name}</td>
                        <td style={byTd}>
                          {d.managerNames?.join(', ') || d.managerName || (
                            <span style={{ color: '#9CA3AF' }}>Atanmadı</span>
                          )}
                        </td>
                        <td style={{ ...byTd, textAlign: 'center' }}>
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
                        style={{
                          ...byTd,
                          textAlign: 'right',
                          background: BY.surfaceMuted,
                          borderBottom: 'none',
                        }}
                      >
                        <Btn onClick={() => startDeptEdit()}>+ Yeni Bölüm Tanımla</Btn>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* CLASSROOMS TAB */}
              {activeTab === 'classrooms' && (
                <table style={byTablo}>
                  <thead>
                    <tr>
                      <th style={byTh}>Sınıf/Salon Adı</th>
                      <th style={{ ...byTh, textAlign: 'center' }}>Kapasite</th>
                      <th style={{ ...byTh, textAlign: 'center', width: 120 }}>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classrooms.length === 0 && (
                      <BYTabloBos kolon={3}>
                        Bu bölümde tanımlı sınıf/salon yok. Aşağıdan ekleyebilirsiniz.
                      </BYTabloBos>
                    )}
                    {classrooms.map((c) => (
                      <tr key={c.id}>
                        <td style={{ ...byTd, fontWeight: 600 }}>{c.name}</td>
                        <td style={{ ...byTd, textAlign: 'center' }}>{c.capacity || '-'}</td>
                        <td style={{ ...byTd, textAlign: 'center' }}>
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
                        style={{
                          ...byTd,
                          textAlign: 'right',
                          background: BY.surfaceMuted,
                          borderBottom: 'none',
                        }}
                      >
                        <Btn onClick={() => startClassEdit()}>+ Yeni Sınıf Ekle</Btn>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* SUPERVISORS TAB — professors koleksiyonundan roles:gozetmen */}
              {activeTab === 'supervisors' && <GozetmenKurali departmentId={activeDepartment} />}
              {activeTab === 'supervisors' && (
                <table style={byTablo}>
                  <thead>
                    <tr>
                      <th style={byTh}>Gözetmen Akademisyen</th>
                      <th style={{ ...byTh, textAlign: 'center', width: 150 }}>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supervisors.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ ...byTd, fontWeight: 600 }}>{s.name}</td>
                        <td style={{ ...byTd, textAlign: 'center' }}>
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
                      <td
                        colSpan={2}
                        style={{ ...byTd, background: BY.surfaceMuted, borderBottom: 'none' }}
                      >
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
          <table style={byTablo}>
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
// Akademisyen Bilgileri — bu bölümün akademisyenleri kart olarak listelenir;
// her karttan e-posta/dahili/foto düzenlenir. professors dokümanına yazılır;
// öğrencinin Benim Sayfam "Danışman Bilgileri" alanında görünür.
// NOT: Bu sekme yalnızca aktif bölümün (kimliği bu bölüm olan) akademisyenlerini
// gösterir; danışmanlık da bölüm bazlıdır — bir bölümün öğrencisine yalnızca o
// bölümün akademisyeni danışman olabilir.
// ══════════════════════════════════════════════════════════════
function AkademisyenKart({ prof, onSaved, bolumAdi }) {
  const AkademisyenProgramButonu = window.AkademisyenProgramButonu;
  const profId = prof.id || prof._docId;
  const [email, setEmail] = useState(prof.email || '');
  const [dahili, setDahili] = useState(prof.dahili || '');
  const [photoURL, setPhotoURL] = useState(prof.photoURL || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = React.useRef(null);

  const dirty =
    email !== (prof.email || '') ||
    dahili !== (prof.dahili || '') ||
    photoURL !== (prof.photoURL || '');

  const handlePhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      setMsg('Yalnızca PNG/JPEG');
      setTimeout(() => setMsg(''), 2500);
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
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      setPhotoURL(json.downloadURL || '');
    } catch (err) {
      setMsg('Yükleme hatası');
      setTimeout(() => setMsg(''), 2500);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      await DBWrite.set(
        'professors',
        String(profId),
        {
          email: (email || '').trim(),
          dahili: (dahili || '').trim(),
          photoURL: (photoURL || '').trim(),
          updatedAt: new Date().toISOString(),
        },
        true
      );
      if (window.audit)
        window.audit('professor_info_update', 'professors', String(profId), {
          meta: { name: prof.name, hasPhoto: !!photoURL },
        });
      setMsg('Kaydedildi');
      if (onSaved) onSaved();
    } catch (e) {
      setMsg('Hata: ' + e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const inputStyle = {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #D1D5DB',
    fontSize: 13,
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
    width: '100%',
  };

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 1px 3px rgba(16,24,40,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 56,
            height: 56,
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
              width="26"
              height="26"
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, lineHeight: 1.3 }}>
            {prof.name}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            style={{ display: 'none' }}
            onChange={handlePhoto}
          />
          <button
            onClick={() => fileRef.current && fileRef.current.click()}
            disabled={uploading}
            style={{
              marginTop: 4,
              background: 'none',
              border: 'none',
              color: C.blue,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {uploading ? 'Yükleniyor…' : photoURL ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle'}
          </button>
        </div>
      </div>

      <div>
        <label
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#6B7280',
            display: 'block',
            marginBottom: 4,
          }}
        >
          E-posta
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@karatekin.edu.tr"
          style={inputStyle}
        />
      </div>
      <div>
        <label
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#6B7280',
            display: 'block',
            marginBottom: 4,
          }}
        >
          Dahili
        </label>
        <input
          value={dahili}
          onChange={(e) => setDahili(e.target.value)}
          placeholder="Örn: 1234"
          style={inputStyle}
        />
      </div>

      {/* Üniversite geneli haftalık ders programı — bölüm yetkilisi buradan
          görüntüler ve indirir; akademisyenin kendisi Ders Programı modülündeki
          "Benim Ders Programım" butonundan aynı belgeye ulaşır. */}
      {AkademisyenProgramButonu && (
        <AkademisyenProgramButonu
          ad={prof.name}
          unvan={prof.title || prof.unvan || ''}
          birim={bolumAdi || ''}
          etiket="Ders Programı Görüntüle"
          style={{ width: '100%', justifyContent: 'center' }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
        <Btn small onClick={save} disabled={saving || !dirty}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </Btn>
        {msg && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color:
                msg.startsWith('Hata') || msg.includes('hata') || msg.includes('JPEG')
                  ? '#DC2626'
                  : '#059669',
            }}
          >
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}

function AkademisyenBilgileri({ professors, onSaved, bolumAdi }) {
  const sorted = (professors || [])
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));

  return (
    <div>
      <p style={{ fontSize: 12.5, color: '#6B7280', margin: '0 0 16px', lineHeight: 1.5 }}>
        Bu bölümün akademisyenleri. İletişim bilgileri, danışmanı bu akademisyen olan öğrencilerin{' '}
        <b>Benim Sayfam → Danışman Bilgileri</b> alanında görünür. Danışmanlık bölüm bazlıdır: bir
        bölümün öğrencisine yalnızca o bölümün akademisyeni danışman olabilir.{' '}
        <b>Ders Programı Görüntüle</b> ile akademisyenin üniversite genelindeki (tüm bölüm ve
        sınıflar) haftalık ders programı açılır; yazdırılabilir veya indirilebilir.
      </p>
      {sorted.length === 0 ? (
        <div
          style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
            color: '#9CA3AF',
            fontSize: 13.5,
          }}
        >
          Bu bölümde akademisyen bulunamadı.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {sorted.map((p) => (
            <AkademisyenKart
              key={p.id || p._docId}
              prof={p}
              onSaved={onSaved}
              bolumAdi={bolumAdi}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Memur Bilgileri sekmesi — sisteme eklenen memurları listeler; bölüm/fakülte
// yetkilisi modül çıktılarını memura yönlendirir (memurModules). Ekleme/silme
// Fakülte Yönetimi'ndedir. Memur, atandığı modülde akademisyen çıktısını
// salt-okunur görür/indirir.
function MemurBilgileri({ currentUser, activeDepartment, bolumAdi }) {
  const myFacultyId = currentUser?.facultyId || '';
  const [memurlar, setMemurlar] = useState([]);
  const [atamalar, setAtamalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [yazilan, setYazilan] = useState('');
  const MEMUR_ASSIGNABLE = useMemo(
    () => (window.DEPARTMENT_MODULES || []).filter((m) => m.id !== 'benim'),
    []
  );
  const load = () => {
    setLoading(true);
    Promise.all([
      window.apiRead('professors').catch(() => []),
      window.apiRead(window.MEMUR_ATAMA_KOLEKSIYONU || 'memur_bolum_modulleri').catch(() => []),
    ])
      .then(([all, at]) => {
        const list = (all || [])
          .filter((p) => p.isMemur && (!myFacultyId || (p.facultyId || '') === myFacultyId))
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
        setMemurlar(list);
        setAtamalar(Array.isArray(at) ? at : []);
      })
      .catch(() => {
        setMemurlar([]);
        setAtamalar([]);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [myFacultyId]);

  // Bu BÖLÜMÜN atamaları. Havuz fakültede, atama bölümde: aynı memuru başka
  // bölüm de kullanabilir ve onun ayarı buradan görünmez/etkilenmez.
  const bolumModulleri = (memur) =>
    window.memurModulleri
      ? window.memurModulleri(
          atamalar,
          activeDepartment,
          memur.id || memur._docId,
          // Geriye dönük: atama kaydı yoksa memur kaydındaki eski düz liste.
          memur.memurModules
        )
      : [];

  const toggleModule = async (memur, moduleId) => {
    if (!activeDepartment) return;
    const memurId = String(memur.id || memur._docId || '');
    const cur = bolumModulleri(memur);
    const has = cur.includes(moduleId);
    const next = has ? cur.filter((m) => m !== moduleId) : cur.concat(moduleId);
    setYazilan(memurId + ':' + moduleId);
    try {
      const kayit = window.memurAtamaKaydi
        ? window.memurAtamaKaydi({
            bolumId: activeDepartment,
            memur,
            modules: next,
            yazan: currentUser?.name || currentUser?.identifier || '',
          })
        : null;
      if (!kayit) return;
      await DBWrite.set(
        window.MEMUR_ATAMA_KOLEKSIYONU || 'memur_bolum_modulleri',
        kayit.id,
        kayit,
        true
      );

      // ── Staj bilerek İSTİSNA ──
      // SGK onayı fakülte çapında tek elden verilir; bu yüzden staj yetkisi
      // memur kaydında fakülte düzeyinde durur. Kural: HERHANGİ bir bölüm staj
      // atadıysa yetkilidir. Bu yüzden bayrak, yalnız bu bölümün seçimine göre
      // değil TÜM atamalara göre hesaplanır — başka bölüm staj atamışsa bu
      // bölümden kaldırmak yetkiyi düşürmemeli.
      const sonrakiAtamalar = atamalar
        .filter(
          (a) =>
            !(String(a.departmentId) === String(activeDepartment) && String(a.memurId) === memurId)
        )
        .concat([{ departmentId: activeDepartment, memurId, modules: next }]);
      const stajli = window.memurStajYetkilisiMi
        ? window.memurStajYetkilisiMi(sonrakiAtamalar, memurId)
        : false;
      if (!!memur.isStajCoordinator !== stajli) {
        await DBWrite.set(
          'professors',
          memurId,
          {
            isStajCoordinator: stajli,
            ...(stajli ? { facultyId: memur.facultyId || myFacultyId } : {}),
          },
          true
        );
      }
      load();
    } catch (e) {
      alert('Güncelleme hatası: ' + e.message);
    } finally {
      setYazilan('');
    }
  };

  const atanmisSayisi = memurlar.filter((m) => bolumModulleri(m).length > 0).length;

  return (
    <div>
      <BYAciklama>
        Memurlar <b>fakülte havuzunda</b> toplanır; her bölüm havuzdan istediği memuru{' '}
        <b>kendi bölümüne</b> alır ve o bölüm için hangi modülleri göreceğini belirler. Memur{' '}
        <b>akademisyen değildir</b>: atandığı modülde akademisyenin ürettiği çıktıyı{' '}
        <b>salt-okunur</b> görüntüler/indirir. Buradaki ayar yalnız <b>{bolumAdi || 'bu bölüm'}</b>{' '}
        için geçerlidir — aynı memuru başka bölüm de kendi modülleriyle kullanabilir. (Havuza memur
        ekleme/silme <b>Fakülte Yönetimi → Memurlar</b>
        alanındadır.)
      </BYAciklama>

      {loading ? (
        <BYBos>Yükleniyor…</BYBos>
      ) : memurlar.length === 0 ? (
        <BYBos>
          Fakülte havuzunda memur yok. <b>Fakülte Yönetimi → Memurlar</b> alanından
          ekleyebilirsiniz.
        </BYBos>
      ) : (
        <>
          <div
            style={{
              fontSize: 12,
              color: BY.textMuted,
              margin: '0 0 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span>
              Havuzda <b>{memurlar.length}</b> memur
            </span>
            <span style={{ color: BY.border }}>•</span>
            <span>
              bu bölüme atanmış <b>{atanmisSayisi}</b>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {memurlar.map((m) => {
              const memurId = String(m.id || m._docId || '');
              const mods = bolumModulleri(m);
              const atanmis = mods.length > 0;
              return (
                <div
                  key={memurId}
                  style={{
                    ...byKart,
                    padding: 0,
                    overflow: 'hidden',
                    borderColor: atanmis ? BY.tealBorder : BY.border,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '13px 16px',
                      background: atanmis ? BY.tealPale : BY.surfaceMuted,
                      borderBottom: `1px solid ${atanmis ? BY.tealBorder : BY.border}`,
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: atanmis ? BY.teal : '#94A3B8',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {(m.name || '?').trim().charAt(0).toLocaleUpperCase('tr-TR')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: BY.navy }}>{m.name}</div>
                      <div style={{ fontSize: 11.5, color: BY.textMuted, marginTop: 1 }}>
                        {atanmis
                          ? `${mods.length} modül • bu bölümde atanmış`
                          : 'bu bölüme atanmamış'}
                      </div>
                    </div>
                    {m.isStajCoordinator && (
                      <BYRozet renk={BY.amber} zemin={BY.amberPale}>
                        Fakülte staj yetkilisi
                      </BYRozet>
                    )}
                  </div>
                  <div style={{ padding: '12px 16px 14px' }}>
                    <div style={{ fontSize: 11.5, color: BY.textMuted, marginBottom: 8 }}>
                      Bu bölümde göreceği modül çıktıları — tıklayarak aç/kapat:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {MEMUR_ASSIGNABLE.map((mod) => {
                        const on = mods.includes(mod.id);
                        const bekliyor = yazilan === memurId + ':' + mod.id;
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            disabled={!!yazilan}
                            onClick={() => toggleModule(m, mod.id)}
                            style={{
                              padding: '5px 11px',
                              borderRadius: 20,
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: yazilan ? 'wait' : 'pointer',
                              transition: 'all .15s',
                              border: '1px solid ' + (on ? BY.teal : BY.border),
                              background: on ? BY.tealPale : 'white',
                              color: on ? BY.tealText : BY.textMuted,
                              opacity: bekliyor ? 0.5 : 1,
                            }}
                          >
                            {on ? '✓ ' : ''}
                            {mod.label}
                            {mod.id === 'staj' && on ? ' (fakülte geneli)' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DUYURULAR
//   Bölüm / fakülte / üniversite yetkilisi, kapsamındaki bölümlere pop-up
//   duyuru açar. İçerik metin, görsel ya da video olabilir.
//
//   Hedefleme kapsamı yetki düzeyine göre daralır:
//     üniversite yetkilisi → tüm bölümler
//     fakülte yetkilisi    → kendi fakültesinin bölümleri
//     bölüm yetkilisi      → kendi bölümü (+ çapraz atandığı bölümler)
//
//   Pop-up'ın kendisi shared-components'taki window.DuyuruPopup — bu ekran
//   yalnızca kaydı yönetir. Önizleme aynı window.DuyuruIcerik bileşenini
//   kullanır ki yetkili yayınlamadan önce birebir aynısını görsün.
// ══════════════════════════════════════════════════════════════

// Duyuru hedefleyebileceğim bölümler. app-shell'deki computeAvailableDepts
// ile aynı kuralları izler; burada modül içinde yeniden kurulur çünkü o
// yardımcı window'a açılmıyor.
function duyuruKapsamBolumleri(currentUser) {
  const hepsi = window.DEPARTMENTS || [];
  if (!currentUser) return [];
  if (currentUser.isUniversityAdmin) return hepsi;
  const fak = currentUser.facultyId || '';
  if (currentUser.isFacultyManager && fak) {
    return hepsi.filter((d) => (d.facultyId || '') === fak);
  }
  const benim = [currentUser.departmentId].concat(
    Array.isArray(currentUser.additionalDepartments) ? currentUser.additionalDepartments : []
  );
  return hepsi.filter((d) => benim.includes(d.id));
}

const DUYURU_BOS = {
  baslik: '',
  tur: 'metin',
  metin: '',
  medyaUrl: '',
  medyaAdi: '',
  videoUrl: '',
  baglantiUrl: '',
  baglantiMetni: '',
  hedefDepartmentIds: [],
  hedefRoller: ['student', 'staff'],
  baslangic: '',
  bitis: '',
  aktif: true,
};

// Görsel/video en çok bu kadar olabilir — sunucudaki multer sınırı 50 MB.
const DUYURU_MAX_BAYT = 50 * 1024 * 1024;

function DuyuruYonetimi({ currentUser, activeDepartment }) {
  const kapsam = useMemo(() => duyuruKapsamBolumleri(currentUser), [currentUser]);
  const [liste, setListe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = form kapalı
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [mesaj, setMesaj] = useState('');
  // Hedef seçici: 60+ bölüm tek şerit hâlinde diziliyordu ve aranan bölümü
  // bulmak gözle taramaya kalıyordu. Fakülteye göre gruplu + aranabilir.
  const [bolumArama, setBolumArama] = useState('');
  const [acikFakulteler, setAcikFakulteler] = useState({});
  const [fakulteAdlari, setFakulteAdlari] = useState({});

  useEffect(() => {
    let iptal = false;
    window
      .apiRead('faculties')
      .then((f) => {
        if (iptal) return;
        const harita = {};
        (f || []).forEach((x) => {
          const ad = String((x && x.name) || '').trim();
          if (!ad) return;
          [x.id, x._id, x._docId].forEach((k) => {
            if (k) harita[String(k)] = ad;
          });
        });
        setFakulteAdlari(harita);
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, []);

  const kapsamIdleri = useMemo(() => kapsam.map((d) => d.id), [kapsam]);

  // Hedeflenebilir bölümler, fakültesine göre öbeklenir. Fakültesi
  // çözülemeyen bölümler tek bir "Diğer" öbeğinde toplanır — kaybolmasınlar.
  const fakulteObekleri = useMemo(() => {
    const q = bolumArama.toLocaleLowerCase('tr').replace(/ı/g, 'i').trim();
    const uyar = (ad) =>
      !q ||
      String(ad || '')
        .toLocaleLowerCase('tr')
        .replace(/ı/g, 'i')
        .includes(q);
    const obek = new Map();
    kapsam.forEach((d) => {
      if (!uyar(d.name)) return;
      const fid = String(d.facultyId || '');
      const ad = fakulteAdlari[fid] || (fid ? 'Fakülte' : 'Diğer');
      if (!obek.has(ad)) obek.set(ad, []);
      obek.get(ad).push(d);
    });
    return Array.from(obek.entries())
      .map(([ad, bolumler]) => ({ ad, bolumler }))
      .sort((x, y) => x.ad.localeCompare(y.ad, 'tr'));
  }, [kapsam, bolumArama, fakulteAdlari]);
  // Yazanın yetki alanı — kayda GÖMÜLÜR ve gösterimde uygulanır. Duyuru bu
  // alanın dışına çıkamaz; hedef listesi yalnız daraltabilir.
  const yetkiKapsami = useMemo(
    () =>
      window.duyuruKapsamCoz
        ? window.duyuruKapsamCoz(currentUser, window.DEPARTMENTS || [])
        : { kapsamTuru: 'bolum', departmentIds: kapsamIdleri },
    [currentUser, kapsamIdleri]
  );
  const kapsamTuru = yetkiKapsami.kapsamTuru;
  const kapsamMetni =
    kapsamTuru === 'universite'
      ? 'üniversite geneli'
      : kapsamTuru === 'fakulte'
        ? 'kendi fakülteniz (' + kapsamIdleri.length + ' bölüm)'
        : 'kendi bölümünüz' + (kapsamIdleri.length > 1 ? ' (' + kapsamIdleri.length + ')' : '');

  const load = () => {
    setLoading(true);
    window
      .apiRead('duyurular', { orderBy: 'createdAt:desc' })
      .then((all) => {
        // Yalnız kapsamımdaki duyurular: hedefi boş olanlar (herkese açık)
        // ya da hedefinde kapsamımdan en az bir bölüm bulunanlar.
        // Yönetim listesi de KAPSAMA bağlı. Eskiden hedefi boş olan her
        // duyuru burada da herkese görünüyordu: bir bölüm yetkilisi başka
        // fakültenin duyurusunu görebiliyor, düzenleyip silebiliyordu.
        setListe(
          (all || []).filter((d) => {
            if (kapsamTuru === 'universite') return true;
            const kayitKapsami = Array.isArray(d.kapsamDepartmentIds) ? d.kapsamDepartmentIds : [];
            if (kayitKapsami.length > 0) {
              return kayitKapsami.some((x) => kapsamIdleri.includes(x));
            }
            // Kapsamsız (eski) kayıt: hedefi varsa hedefe, yoksa yazanın
            // bölümüne göre — gösterimdeki kuralla aynı.
            const h = Array.isArray(d.hedefDepartmentIds) ? d.hedefDepartmentIds : [];
            if (h.length > 0) return h.some((x) => kapsamIdleri.includes(x));
            const yazan = String(d.departmentId || '');
            return yazan ? kapsamIdleri.includes(yazan) : true;
          })
        );
      })
      .catch(() => setListe([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [kapsamIdleri.join(',')]);

  const yeni = () =>
    setForm({
      ...DUYURU_BOS,
      // Varsayılan hedef: üzerinde çalışılan bölüm. Yetkili genişletebilir.
      hedefDepartmentIds: activeDepartment ? [activeDepartment] : [],
    });

  const dosyaSec = async (file) => {
    if (!file) return;
    if (file.size > DUYURU_MAX_BAYT) {
      setMesaj('Dosya çok büyük (en fazla 50 MB).');
      return;
    }
    setYukleniyor(true);
    setMesaj('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('caku_auth_token');
      const res = await fetch('/api/files/upload?folder=duyurular', {
        method: 'POST',
        headers: token ? { Authorization: 'Bearer ' + token } : {},
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) throw new Error('Yükleme başarısız (HTTP ' + res.status + ')');
      const data = await res.json();
      setForm((f) => ({ ...f, medyaUrl: data.downloadURL || '', medyaAdi: file.name }));
    } catch (e) {
      setMesaj('Dosya yüklenemedi: ' + e.message);
    } finally {
      setYukleniyor(false);
    }
  };

  const kaydet = async () => {
    if (!form.baslik.trim()) {
      setMesaj('Başlık zorunlu.');
      return;
    }
    // Editör boş bırakılınca `<p><br></p>` gibi bir artık üretiyor; düz
    // `trim()` bunu "dolu" sanır ve boş duyuru kaydedilirdi.
    const metinBos = window.zenginBosMu
      ? window.zenginBosMu(form.metin)
      : !String(form.metin || '').trim();
    if (form.tur === 'metin' && metinBos) {
      setMesaj('Metin duyurusunda içerik boş olamaz.');
      return;
    }
    if (form.tur === 'gorsel' && !form.medyaUrl) {
      setMesaj('Görsel duyurusunda bir görsel yükleyin.');
      return;
    }
    if (form.tur === 'video' && !form.medyaUrl && !window.duyuruGomulebilirUrl(form.videoUrl)) {
      setMesaj(
        'Video duyurusunda ya video dosyası yükleyin ya da geçerli bir YouTube/Vimeo bağlantısı girin.'
      );
      return;
    }
    if (form.baslangic && form.bitis && form.bitis < form.baslangic) {
      setMesaj('Bitiş tarihi başlangıçtan önce olamaz.');
      return;
    }
    setKaydediliyor(true);
    setMesaj('');
    try {
      const kayit = {
        baslik: form.baslik.trim(),
        tur: form.tur,
        metin: form.metin,
        medyaUrl: form.medyaUrl,
        medyaAdi: form.medyaAdi,
        videoUrl: form.tur === 'video' ? form.videoUrl.trim() : '',
        baglantiUrl: /^https?:\/\//i.test(form.baglantiUrl.trim()) ? form.baglantiUrl.trim() : '',
        baglantiMetni: form.baglantiMetni.trim(),
        // Hedef listesi kapsamın DIŞINA taşamaz. İstemci zaten kapsam dışı
        // bölüm göstermiyor, ama kayıt anında da süzülüyor: form durumu eski
        // bir kayıttan gelmiş olabilir (yetkisi değişen bir kullanıcı, başka
        // kapsamda oluşturulmuş bir duyuruyu düzenliyor olabilir).
        hedefDepartmentIds:
          kapsamTuru === 'universite'
            ? form.hedefDepartmentIds
            : (form.hedefDepartmentIds || []).filter((x) => kapsamIdleri.includes(x)),
        hedefRoller: form.hedefRoller,
        kapsamTuru,
        kapsamDepartmentIds: kapsamTuru === 'universite' ? [] : kapsamIdleri,
        kapsamFacultyId: yetkiKapsami.facultyId || '',
        baslangic: form.baslangic,
        bitis: form.bitis,
        aktif: form.aktif !== false,
        olusturan: currentUser?.name || currentUser?.identifier || '',
        // Sahiplik damgası: düzenleme ve silme YALNIZ yayınlayanda. Kapsam
        // yetkisi görmeyi ve yeni duyuru yazmayı verir, başkasının kaydına
        // dokunmayı değil. Sunucu da aynı kuralı uyguluyor.
        ...(window.duyuruSahiplikDamgasi
          ? window.duyuruSahiplikDamgasi(currentUser)
          : { olusturanId: currentUser?.identifier || currentUser?.name || '' }),
        facultyId: currentUser?.facultyId || '',
        departmentId: currentUser?.departmentId || '',
        updatedAt: new Date().toISOString(),
      };
      if (form.id) {
        await DBWrite.set('duyurular', form.id, kayit, true);
      } else {
        await DBWrite.add('duyurular', { ...kayit, createdAt: new Date().toISOString() });
      }
      setForm(null);
      load();
    } catch (e) {
      setMesaj('Kaydedilemedi: ' + e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  // Bu duyuruya dokunabilir miyim? Kural lib/duyuru-sahiplik.js'te ve testli.
  const dokunabilirim = (d) =>
    window.duyuruDuzenlenebilirMi ? window.duyuruDuzenlenebilirMi(d, currentUser) : true;
  const engelSebebi = (d) =>
    window.duyuruDuzenlemeEngeli ? window.duyuruDuzenlemeEngeli(d, currentUser) : '';

  const sil = async (d) => {
    if (!dokunabilirim(d)) {
      alert(engelSebebi(d));
      return;
    }
    if (!confirm('"' + (d.baslik || 'Duyuru') + '" silinsin mi?')) return;
    try {
      await DBWrite.remove('duyurular', String(d.id));
      load();
    } catch (e) {
      alert('Silinemedi: ' + e.message);
    }
  };

  const aktifDegistir = async (d) => {
    if (!dokunabilirim(d)) {
      alert(engelSebebi(d));
      return;
    }
    try {
      await DBWrite.set(
        'duyurular',
        String(d.id),
        { aktif: d.aktif === false, updatedAt: new Date().toISOString() },
        true
      );
      load();
    } catch (e) {
      alert('Güncellenemedi: ' + e.message);
    }
  };

  const etiket = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 5,
  };
  const girdi = {
    width: '100%',
    padding: '9px 11px',
    borderRadius: 8,
    border: '1px solid #D1D5DB',
    fontSize: 13,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };
  const kutu = {
    background: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
  };

  const cip = (secili) => ({
    padding: '5px 12px',
    borderRadius: 999,
    border: '1px solid ' + (secili ? C.blue : '#D1D5DB'),
    background: secili ? C.blue + '14' : 'white',
    color: secili ? C.blue : '#6B7280',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  });

  const cevir = (dizi, deger) =>
    dizi.includes(deger) ? dizi.filter((x) => x !== deger) : dizi.concat(deger);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <p style={{ fontSize: 12.5, color: '#6B7280', margin: 0, lineHeight: 1.55, maxWidth: 720 }}>
          Duyurular, hedeflenen kişilerin ekranında <b>pop-up</b> olarak açılır. Kullanıcı duyuruyu
          kapattığında bir daha görmez. İçerik metin, görsel ya da video olabilir.
          Hedefleyebildiğiniz bölümler yetki düzeyinize göre belirlenir ({kapsam.length} bölüm).
        </p>
        {!form && (
          <Btn onClick={yeni} variant="primary">
            + Yeni Duyuru
          </Btn>
        )}
      </div>

      {mesaj && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            color: '#92400E',
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          {mesaj}
        </div>
      )}

      {form && (
        <div style={kutu}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1B2A4A', marginBottom: 14 }}>
            {form.id ? 'Duyuruyu Düzenle' : 'Yeni Duyuru'}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={etiket}>Başlık *</label>
            <input
              value={form.baslik}
              onChange={(e) => setForm({ ...form, baslik: e.target.value })}
              style={girdi}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={etiket}>Tür</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(window.DUYURU_TURLERI || []).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setForm({ ...form, tur: t.id })}
                  style={cip(form.tur === t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {form.tur !== 'metin' && (
            <div style={{ marginBottom: 12 }}>
              <label style={etiket}>
                {form.tur === 'gorsel' ? 'Görsel dosyası *' : 'Video dosyası'}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ cursor: 'pointer' }}>
                  <input
                    type="file"
                    accept={form.tur === 'gorsel' ? 'image/*' : 'video/*'}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = (e.target.files && e.target.files[0]) || null;
                      e.target.value = '';
                      dosyaSec(f);
                    }}
                  />
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '1px solid #D1D5DB',
                      background: 'white',
                      color: '#1B2A4A',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {yukleniyor ? 'Yükleniyor…' : 'Dosya seç'}
                  </span>
                </label>
                {form.medyaAdi && (
                  <span style={{ fontSize: 12.5, color: '#059669' }}>{form.medyaAdi}</span>
                )}
                {form.medyaUrl && (
                  <button
                    onClick={() => setForm({ ...form, medyaUrl: '', medyaAdi: '' })}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#DC2626',
                      fontSize: 12.5,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Kaldır
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 5 }}>En fazla 50 MB.</div>
            </div>
          )}

          {form.tur === 'video' && (
            <div style={{ marginBottom: 12 }}>
              <label style={etiket}>veya YouTube / Vimeo bağlantısı</label>
              <input
                value={form.videoUrl}
                placeholder="https://www.youtube.com/watch?v=..."
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                style={girdi}
              />
              {form.videoUrl.trim() && !window.duyuruGomulebilirUrl(form.videoUrl) && (
                <div style={{ fontSize: 11.5, color: '#B45309', marginTop: 5 }}>
                  Bu bağlantı gömülemiyor. Yalnız YouTube ve Vimeo adresleri desteklenir (https
                  ile).
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={etiket}>
              {form.tur === 'metin' ? 'Duyuru metni *' : 'Açıklama (isteğe bağlı)'}
            </label>
            {window.QuillEditoru || window.ZenginMetinEditoru ? (
              React.createElement(window.QuillEditoru || window.ZenginMetinEditoru, {
                deger: form.metin,
                onChange: (html) => setForm((f) => ({ ...f, metin: html })),
                yukseklik: form.tur === 'metin' ? 240 : 140,
                yerTutucu:
                  form.tur === 'metin'
                    ? 'Duyuru metnini yazın…'
                    : 'Görsel/videoya kısa bir açıklama (isteğe bağlı)',
              })
            ) : (
              <textarea
                value={form.metin}
                rows={form.tur === 'metin' ? 6 : 3}
                onChange={(e) => setForm({ ...form, metin: e.target.value })}
                style={{ ...girdi, resize: 'vertical' }}
              />
            )}
            <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 6, lineHeight: 1.5 }}>
              Araç çubuğundaki her biçim duyuruda da görünür: başlık, kalın/italik, liste, girinti,
              hizalama, alıntı, kod, renk ve bağlantı. Renkler sabit palettendir — serbest renk
              seçilseydi bir kısmı gösterimde düşerdi. Aşağıdaki önizleme, duyurunun kullanıcıda
              göründüğü hâlidir.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <label style={etiket}>Bağlantı adresi (isteğe bağlı)</label>
              <input
                value={form.baglantiUrl}
                placeholder="https://..."
                onChange={(e) => setForm({ ...form, baglantiUrl: e.target.value })}
                style={girdi}
              />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={etiket}>Bağlantı yazısı</label>
              <input
                value={form.baglantiMetni}
                placeholder="Ayrıntılar için tıklayın"
                onChange={(e) => setForm({ ...form, baglantiMetni: e.target.value })}
                style={girdi}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={etiket}>Hedef bölümler</label>

            {/* ── FAKÜLTEYE GÖRE GRUPLU SEÇİCİ ──
                60+ bölüm tek şerit hâlinde diziliyordu: aranan bölümü bulmak
                gözle taramaya kalıyor, seçilenler kalabalıkta kayboluyordu.
                Artık önce SEÇİLENLER, sonra fakülte fakülte açılır liste. */}

            {/* Seçilenler her zaman üstte ve görünür. */}
            {form.hedefDepartmentIds.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginBottom: 10,
                  padding: 10,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                }}
              >
                {form.hedefDepartmentIds.map((id) => {
                  const b2 = kapsam.find((x) => x.id === id);
                  return (
                    <button
                      key={id}
                      title="Seçimden çıkar"
                      onClick={() =>
                        setForm({
                          ...form,
                          hedefDepartmentIds: cevir(form.hedefDepartmentIds, id),
                        })
                      }
                      style={{ ...cip(true), display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {(b2 && b2.name) || id}
                      <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.7 }}>×</span>
                    </button>
                  );
                })}
                <button
                  onClick={() => setForm({ ...form, hedefDepartmentIds: [] })}
                  style={{
                    ...cip(false),
                    borderStyle: 'dashed',
                    color: '#B45309',
                    borderColor: '#FCD34D',
                  }}
                >
                  Tümünü kaldır
                </button>
              </div>
            )}

            <input
              value={bolumArama}
              onChange={(e) => setBolumArama(e.target.value)}
              placeholder="Bölüm ara…"
              style={{ ...girdi, marginBottom: 8 }}
            />

            <div
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                maxHeight: 300,
                overflowY: 'auto',
                background: 'white',
              }}
            >
              {fakulteObekleri.length === 0 && (
                <div style={{ padding: 14, fontSize: 12.5, color: '#6B7280' }}>
                  Aramaya uyan bölüm yok.
                </div>
              )}
              {fakulteObekleri.map((f) => {
                // Arama varken öbekler kendiliğinden açılır: kullanıcı
                // aradığını bulup bir de açmak zorunda kalmasın.
                const acik = bolumArama.trim() ? true : acikFakulteler[f.ad] !== false;
                const idler = f.bolumler.map((x) => x.id);
                const seciliSayi = idler.filter((x) => form.hedefDepartmentIds.includes(x)).length;
                const hepsiSecili = seciliSayi === idler.length && idler.length > 0;
                return (
                  <div key={f.ad} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '9px 12px',
                        background: '#FBFCFE',
                      }}
                    >
                      <button
                        onClick={() => setAcikFakulteler((p) => ({ ...p, [f.ad]: !acik }))}
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flex: 1,
                          textAlign: 'left',
                          fontFamily: 'inherit',
                        }}
                      >
                        <span style={{ fontSize: 11, color: '#94A3B8', width: 10 }}>
                          {acik ? '▾' : '▸'}
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>
                          {f.ad}
                        </span>
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>
                          {seciliSayi ? seciliSayi + '/' + idler.length : idler.length}
                        </span>
                      </button>
                      <button
                        onClick={() =>
                          setForm({
                            ...form,
                            hedefDepartmentIds: hepsiSecili
                              ? form.hedefDepartmentIds.filter((x) => !idler.includes(x))
                              : Array.from(new Set(form.hedefDepartmentIds.concat(idler))),
                          })
                        }
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: C.blue,
                          fontFamily: 'inherit',
                          padding: '2px 4px',
                        }}
                      >
                        {hepsiSecili ? 'Kaldır' : 'Tümü'}
                      </button>
                    </div>
                    {acik && (
                      <div
                        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 12px' }}
                      >
                        {f.bolumler.map((d) => (
                          <button
                            key={d.id}
                            onClick={() =>
                              setForm({
                                ...form,
                                hedefDepartmentIds: cevir(form.hedefDepartmentIds, d.id),
                              })
                            }
                            style={cip(form.hedefDepartmentIds.includes(d.id))}
                          >
                            {d.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Kapsam açıkça yazılıyor: "hiç bölüm seçilmedi" ifadesi eskiden
                "tüm kullanıcılara" diye anlaşılıyordu ve gerçekten de öyle
                davranıyordu — bölüm duyurusu başka fakültelere sızıyordu.
                Artık kapsam yetkinizle sınırlı ve bu satır onu söylüyor. */}
            {form.hedefDepartmentIds.length === 0 && (
              <div style={{ fontSize: 11.5, color: '#B45309', marginTop: 6, lineHeight: 1.5 }}>
                Hiç bölüm seçilmedi — duyuru <b>{kapsamMetni}</b> içindeki tüm kullanıcılara
                gösterilir. Yetki alanınızın dışına çıkmaz.
              </div>
            )}
            {form.hedefDepartmentIds.length > 0 && (
              <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 6 }}>
                Seçilen {form.hedefDepartmentIds.length} bölüm — kapsamınız {kapsamMetni}.
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={etiket}>Kimler görsün</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(window.DUYURU_HEDEF_ROLLER || []).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setForm({ ...form, hedefRoller: cevir(form.hedefRoller, r.id) })}
                  style={cip(form.hedefRoller.includes(r.id))}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label style={etiket}>Başlangıç (isteğe bağlı)</label>
              <input
                type="date"
                value={form.baslangic}
                onChange={(e) => setForm({ ...form, baslangic: e.target.value })}
                style={girdi}
              />
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label style={etiket}>Bitiş (isteğe bağlı)</label>
              <input
                type="date"
                value={form.bitis}
                onChange={(e) => setForm({ ...form, bitis: e.target.value })}
                style={girdi}
              />
            </div>
          </div>

          {/* Önizleme — yayındaki pop-up ile aynı bileşen */}
          {window.DuyuruIcerik && (form.metin || form.medyaUrl || form.videoUrl) && (
            <div
              style={{
                border: '1px dashed #D1D5DB',
                borderRadius: 10,
                padding: 14,
                marginBottom: 16,
                background: '#F9FAFB',
              }}
            >
              <div style={{ ...etiket, marginBottom: 10 }}>Önizleme</div>
              <window.DuyuruIcerik duyuru={form} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={kaydet} variant="primary" disabled={kaydediliyor || yukleniyor}>
              {kaydediliyor ? 'Kaydediliyor…' : 'Yayınla'}
            </Btn>
            <Btn
              variant="secondary"
              onClick={() => {
                setForm(null);
                setMesaj('');
              }}
            >
              Vazgeç
            </Btn>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Yükleniyor...</div>
      ) : liste.length === 0 ? (
        <div
          style={{ ...kutu, textAlign: 'center', color: '#9CA3AF', fontSize: 13.5, padding: 40 }}
        >
          Henüz duyuru yok.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {liste.map((d) => {
            const hedefler = Array.isArray(d.hedefDepartmentIds) ? d.hedefDepartmentIds : [];
            const adlar = hedefler
              .map((id) => (window.DEPARTMENTS || []).find((x) => x.id === id)?.name || id)
              .join(', ');
            const pasif = d.aktif === false;
            return (
              <div
                key={d.id}
                style={{
                  background: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                  padding: 14,
                  opacity: pasif ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1B2A4A' }}>
                      {d.baslik || '(başlıksız)'}
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: '#EEF2FF',
                          color: '#4338CA',
                          textTransform: 'uppercase',
                        }}
                      >
                        {(window.DUYURU_TURLERI || []).find((t) => t.id === (d.tur || 'metin'))
                          ?.label || d.tur}
                      </span>
                      {pasif && (
                        <span style={{ marginLeft: 8, fontSize: 11.5, color: '#9CA3AF' }}>
                          pasif
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 4 }}>
                      {adlar || 'Tüm bölümler'}
                      {(d.baslangic || d.bitis) &&
                        ' · ' + (d.baslangic || '…') + ' → ' + (d.bitis || '…')}
                      {d.olusturan && ' · ' + d.olusturan}
                    </div>
                  </div>
                  {/* Düzenleme ve silme YALNIZ yayınlayanda. Başkasının
                      duyurusunda düğmeler hiç çıkmaz; yerine kimin
                      yayınladığı yazar — "neden yapamıyorum" sorusu
                      ekranda yanıtlanmalı. */}
                  {dokunabilirim(d) ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <Btn variant="secondary" small onClick={() => aktifDegistir(d)}>
                        {pasif ? 'Yayına al' : 'Durdur'}
                      </Btn>
                      <Btn
                        variant="secondary"
                        small
                        onClick={() =>
                          setForm({
                            ...DUYURU_BOS,
                            ...d,
                            hedefDepartmentIds: hedefler,
                            hedefRoller: Array.isArray(d.hedefRoller)
                              ? d.hedefRoller
                              : ['student', 'staff'],
                          })
                        }
                      >
                        Düzenle
                      </Btn>
                      <Btn onClick={() => sil(d)} variant="danger" small>
                        Sil
                      </Btn>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: '#6B7280',
                        background: '#F3F4F6',
                        border: '1px solid #E5E7EB',
                        borderRadius: 8,
                        padding: '6px 12px',
                        maxWidth: 230,
                        lineHeight: 1.5,
                        flexShrink: 0,
                      }}
                    >
                      {d.olusturanAd || d.olusturan ? (
                        <>
                          <b>{d.olusturanAd || d.olusturan}</b> yayınladı
                        </>
                      ) : (
                        'Başka bir yetkili yayınladı'
                      )}
                      <div style={{ marginTop: 2 }}>düzenleme yayınlayanda</div>
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

// ══════════════════════════════════════════════════════════════
// MEZUNİYET KURALLARI (bölüm başına)
//
//   Öğrencinin "Benim Sayfam → Mezuniyet Durumum" hesabının tabanı budur.
//   Kurallar bölümden bölüme değişir (toplam AKTS, asgari AGNO, 7+1 mi
//   normal müfredat mı, staj şartı, hangi harf notu geçer sayılır) ve
//   yönetmeliğe bağlıdır — bu yüzden koda gömülmez, burada tanımlanır.
//
//   Kayıt yoksa shared-components'taki MEZUNIYET_VARSAYILAN geçerlidir.
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// BÖLÜM RENGİ
//
// Fakülte birleşik ders programında bir hücrede yalnız DERS KODU yazar;
// dersin hangi bölüme ait olduğu RENKTEN okunur. Bu yüzden renk süs değil,
// belgenin okunabilirliğini taşıyan bilgidir ve bölüm başına sabittir.
//
// Ayar yapılmamışsa renk yine de belirlidir (bölüm adından tanınan renk, ya
// da paletten sıradaki) — yani hiçbir bölüm bir şey seçmeden de tutarlı
// çıktı alır. Buradaki seçim yalnız o varsayılanı EZER.
// ══════════════════════════════════════════════════════════════
const BolumRengiAyari = ({ activeDepartment, bolumAdi, currentUser }) => {
  const [surum, setSurum] = useState(0);
  const ayarlar = window.useBolumAyarlari(surum);
  const kayit = ayarlar[String(activeDepartment || '')] || null;
  const cozulen = window.bolumRengiCoz({
    ayarRengi: kayit && kayit.renk,
    bolumAdi,
  });
  const [secili, setSecili] = useState(cozulen);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [hata, setHata] = useState('');

  useEffect(() => {
    setSecili(cozulen);
  }, [cozulen]);

  const kaydet = async (renk) => {
    setKaydediyor(true);
    setHata('');
    try {
      await window.DBWrite.set(
        window.BOLUM_AYAR_KOLEKSIYONU || 'bolum_program_ayarlari',
        String(activeDepartment),
        {
          id: String(activeDepartment),
          departmentId: String(activeDepartment),
          renk: window.renkNormalize(renk) || renk,
          guncelleyen: currentUser?.name || '',
        },
        true
      );
      setSurum((n) => n + 1);
    } catch (e) {
      setHata(e && e.message ? e.message : 'Renk kaydedilemedi.');
    } finally {
      setKaydediyor(false);
    }
  };

  const palet = window.BOLUM_RENK_PALETI || [];
  const ayarli = !!(kayit && window.renkNormalize(kayit.renk));

  return (
    <div style={{ ...byKart, marginTop: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: BY.text }}>Bölüm Rengi</div>
      <BYAciklama>
        Fakülte ders programı çıktısında bu bölümün ders kodları bu renkte yazılır. Seçim
        yapmazsanız bölüm adına göre bilinen renk, o da yoksa paletten sıradaki renk kullanılır.
      </BYAciklama>

      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}
      >
        <div
          style={{
            width: 92,
            height: 40,
            borderRadius: 8,
            border: `1px solid ${BY.border}`,
            background: secili,
            color: window.renkMetinRengi(secili),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          BLM101
        </div>
        <input
          type="color"
          value={secili}
          onChange={(e) => setSecili(e.target.value)}
          aria-label="Bölüm rengi"
          style={{
            width: 46,
            height: 40,
            padding: 0,
            border: `1px solid ${BY.border}`,
            borderRadius: 8,
            background: 'white',
            cursor: 'pointer',
          }}
        />
        <button
          onClick={() => kaydet(secili)}
          disabled={kaydediyor || secili === cozulen}
          style={{
            padding: '9px 16px',
            borderRadius: 8,
            border: 'none',
            background: secili === cozulen ? BY.border : BY.blue,
            color: secili === cozulen ? BY.textMuted : 'white',
            fontSize: 12,
            fontWeight: 700,
            cursor: kaydediyor || secili === cozulen ? 'default' : 'pointer',
          }}
        >
          {kaydediyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {ayarli && (
          <button
            onClick={() => kaydet('')}
            disabled={kaydediyor}
            title="Seçimi kaldır — varsayılan renge dön"
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: `1px solid ${BY.border}`,
              background: 'white',
              color: BY.textMuted,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Varsayılana dön
          </button>
        )}
      </div>

      <div style={{ fontSize: 11, color: BY.textMuted, marginTop: 14, fontWeight: 600 }}>
        Fakültenin basılı programındaki renkler
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        {palet.map((renk) => (
          <button
            key={renk}
            onClick={() => setSecili(renk)}
            title={renk}
            aria-label={'Renk ' + renk}
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              background: renk,
              cursor: 'pointer',
              border:
                window.renkNormalize(renk) === window.renkNormalize(secili)
                  ? `3px solid ${BY.text}`
                  : `1px solid ${BY.border}`,
            }}
          />
        ))}
      </div>

      {hata && <div style={{ marginTop: 10, fontSize: 12, color: '#B91C1C' }}>{hata}</div>}
    </div>
  );
};
function MezuniyetKurallari({ activeDepartment, currentUser }) {
  const varsayilan = window.MEZUNIYET_VARSAYILAN || {};
  const [form, setForm] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState('');
  // Virgüllü listelerin HAM metni. Her tuşta ayrıştırılınca yazılan virgül
  // anında siliniyor ve listeyi düzenlemek imkânsız hâle geliyordu; metin
  // burada duruyor, ayrıştırma alandan çıkışta yapılıyor.
  const [gecerMetin, setGecerMetin] = useState('');
  const [kalirMetin, setKalirMetin] = useState('');

  useEffect(() => {
    let iptal = false;
    setYukleniyor(true);
    setMesaj('');
    window
      .apiReadDoc('mezuniyet_kurallari', String(activeDepartment || ''))
      .then((r) => {
        if (iptal) return;
        const d = (r && r.exists && r.data) || {};
        // Normalize ederek yükle: eski `mufredatTipi` kaydı yeni yarıyıl
        // alanlarına çevrilsin ki 7+1 uygulayan bir bölüm formu açtığı anda
        // sessizce 8+0 görünmesin.
        const k = window.mezKuralNormalize
          ? window.mezKuralNormalize(d)
          : Object.assign({}, varsayilan, d);
        setForm(k);
        // Serbest listeler: yalnız KAYITTA yazılı olanlar metin alanına girer.
        // Ölçekten türetilenler zaten tabloda görünüyor; ikisini birden
        // göstermek aynı harfi iki yerde düzenlettirirdi.
        setGecerMetin((Array.isArray(d.gecerNotlar) ? d.gecerNotlar : []).join(', '));
        setKalirMetin((Array.isArray(d.kalirNotlar) ? d.kalirNotlar : []).join(', '));
      })
      .catch(() => !iptal && setForm(Object.assign({}, varsayilan)))
      .finally(() => !iptal && setYukleniyor(false));
    return () => {
      iptal = true;
    };
  }, [activeDepartment]);

  // "90" → 90 ; "3,5" → 3.5 ; okunamıyorsa null (0 DEĞİL: sıfır katsayı
  // gerçek bir değer, "girilmemiş" ile karıştırılmamalı).
  const sayiAl = (v) => {
    const n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  const kaydet = async () => {
    setKaydediliyor(true);
    setMesaj('');
    try {
      await DBWrite.set(
        'mezuniyet_kurallari',
        String(activeDepartment),
        {
          departmentId: String(activeDepartment),
          toplamYariyil: parseInt(form.toplamYariyil, 10) || 8,
          isyeriYariyilSayisi: parseInt(form.isyeriYariyilSayisi, 10) || 0,
          // Eski alan artık YAZILMIYOR ama okunan kayıtlarda kalabilir;
          // mezKuralNormalize yeni alanlar varken onu görmezden geliyor.
          toplamAkts: parseInt(form.toplamAkts, 10) || 240,
          minAgno: parseFloat(String(form.minAgno).replace(',', '.')) || 2,
          minSecmeliAkts: parseInt(form.minSecmeliAkts, 10) || 0,
          isyeriEgitimiAkts: parseInt(form.isyeriEgitimiAkts, 10) || 0,
          stajZorunlu: form.stajZorunlu !== false,
          // Ölçek sayıya normalize edilerek yazılır — metin alanından gelen
          // "90" ile sayısal 90 karışmasın, karşılaştırmalar hep sayı olsun.
          notOlcegi: (form.notOlcegi || []).map((r) => ({
            min: sayiAl(r.min),
            max: sayiAl(r.max),
            harf: String(r.harf || '')
              .trim()
              .toLocaleUpperCase('tr-TR'),
            katsayi: sayiAl(r.katsayi),
            gecer: !!r.gecer,
          })),
          ekHarfler: (form.ekHarfler || []).map((r) => ({
            harf: String(r.harf || '')
              .trim()
              .toLocaleUpperCase('tr-TR'),
            aciklama: String(r.aciklama || '').slice(0, 300),
            sayilanHarf: String(r.sayilanHarf || '')
              .trim()
              .toLocaleUpperCase('tr-TR'),
            gecer: !!r.gecer,
          })),
          // Alandan çıkılmadan kaydedilirse son yazım kaybolmasın diye
          // metinler burada da ayrıştırılıyor.
          gecerNotlar: notAyristir(gecerMetin),
          kalirNotlar: notAyristir(kalirMetin),
          aciklama: form.aciklama || '',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.name || currentUser?.identifier || '',
        },
        true
      );
      setMesaj('Kaydedildi.');
    } catch (e) {
      setMesaj('Kaydedilemedi: ' + e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  if (yukleniyor || !form) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Yükleniyor...</div>;
  }

  const etiket = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 5,
  };
  const girdi = {
    width: '100%',
    padding: '9px 11px',
    borderRadius: 8,
    border: '1px solid #D1D5DB',
    fontSize: 13,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };
  const cip = (secili) => ({
    padding: '6px 14px',
    borderRadius: 999,
    border: '1px solid ' + (secili ? C.blue : '#D1D5DB'),
    background: secili ? C.blue + '14' : 'white',
    color: secili ? C.blue : '#6B7280',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  });
  // Model özeti formdaki iki sayıdan TÜRETİLİR — ayrıca saklanmadığı için
  // etiketle gerçek ayarın çelişmesi mümkün değil.
  const toplamY = parseInt(form.toplamYariyil, 10) || 0;
  const isyeriY = Math.max(0, Math.min(toplamY, parseInt(form.isyeriYariyilSayisi, 10) || 0));
  const isyeriVar = isyeriY > 0;
  const modelEtiketi = toplamY - isyeriY + '+' + isyeriY;
  const yilMetni = toplamY > 0 ? (toplamY / 2).toString().replace('.', ',') + ' yıl' : '—';
  const isyeriIlk = toplamY - isyeriY + 1;
  const isyeriAralik =
    isyeriY === 1 ? isyeriIlk + '. yarıyıl' : isyeriIlk + '–' + toplamY + '. yarıyıllar';
  const kalipSecili = (k) => k.toplamYariyil === toplamY && k.isyeriYariyilSayisi === isyeriY;

  // ── Ölçek düzenleme ──
  const olcekSatir = (i, alan, deger) =>
    setForm((f) => {
      const yeni = (f.notOlcegi || []).slice();
      yeni[i] = { ...yeni[i], [alan]: deger };
      return { ...f, notOlcegi: yeni };
    });
  const olcekSil = (i) =>
    setForm((f) => ({ ...f, notOlcegi: (f.notOlcegi || []).filter((_, j) => j !== i) }));
  const olcekEkle = () =>
    setForm((f) => ({
      ...f,
      notOlcegi: (f.notOlcegi || []).concat({
        min: '',
        max: '',
        harf: '',
        katsayi: '',
        gecer: true,
      }),
    }));
  const olcegiSifirla = () =>
    setForm((f) => ({
      ...f,
      notOlcegi: (window.NOT_OLCEGI_VARSAYILAN || []).map((r) => ({ ...r })),
      ekHarfler: (window.EK_HARFLER_VARSAYILAN || []).map((r) => ({ ...r })),
    }));

  const ekHarfSatir = (i, alan, deger) =>
    setForm((f) => {
      const yeni = (f.ekHarfler || []).slice();
      yeni[i] = { ...yeni[i], [alan]: deger };
      return { ...f, ekHarfler: yeni };
    });
  const ekHarfSil = (i) =>
    setForm((f) => ({ ...f, ekHarfler: (f.ekHarfler || []).filter((_, j) => j !== i) }));
  const ekHarfEkle = () =>
    setForm((f) => ({
      ...f,
      ekHarfler: (f.ekHarfler || []).concat({
        harf: '',
        aciklama: '',
        sayilanHarf: '',
        gecer: false,
      }),
    }));

  const olcekSorunlari = window.mezOlcekDogrula
    ? window.mezOlcekDogrula(form.notOlcegi || []).sorunlar
    : [];

  const notListesi = (dizi) => (Array.isArray(dizi) ? dizi.join(', ') : '');
  const notAyristir = (metin) =>
    String(metin || '')
      .split(/[,\s]+/)
      .map((s) => s.trim().toLocaleUpperCase('tr-TR'))
      .filter(Boolean);

  return (
    <div>
      <p style={{ fontSize: 12.5, color: '#6B7280', margin: '0 0 16px', lineHeight: 1.55 }}>
        Bu kurallar öğrencinin <b>Benim Sayfam → Mezuniyet Durumum</b> hesabında kullanılır. Öğrenci
        transkriptini yükler, sistem bu kurallara göre geçilen/kalan dersleri ve mezuniyet
        koşullarını çıkarır. Kural tanımlanmazsa varsayılanlar geçerlidir. Öğretim modeli iki
        sayıyla tanımlanır — toplam yarıyıl ve bunun kaçının işyeri eğitimi olduğu — böylece MYO’nun
        3+1’i, lisansın 7+1’i, 5 ve 6 yıllık programlar ve hazır kalıplarda olmayan her düzen aynı
        alanla anlatılabilir.
      </p>

      <div
        style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={etiket}>Öğretim modeli</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {(window.MEZUNIYET_KALIPLARI || []).map((k) => (
              <button
                key={k.id}
                onClick={() =>
                  setForm({
                    ...form,
                    toplamYariyil: k.toplamYariyil,
                    isyeriYariyilSayisi: k.isyeriYariyilSayisi,
                    toplamAkts: k.toplamAkts,
                  })
                }
                style={cip(kalipSecili(k))}
              >
                {k.ad}
              </button>
            ))}
          </div>

          {/* Kalıplar kolaylıktır, kısıt değil: hiçbirine uymayan bir program
              iki sayıyı elle girerek tanımlanır. */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 170px' }}>
              <label style={etiket}>Toplam yarıyıl</label>
              <input
                value={form.toplamYariyil}
                onChange={(e) =>
                  setForm({ ...form, toplamYariyil: e.target.value.replace(/\D/g, '').slice(0, 2) })
                }
                placeholder="ör. 8"
                style={girdi}
              />
            </div>
            <div style={{ flex: '1 1 170px' }}>
              <label style={etiket}>Bunun kaçı işyeri eğitimi</label>
              <input
                value={form.isyeriYariyilSayisi}
                onChange={(e) =>
                  setForm({
                    ...form,
                    isyeriYariyilSayisi: e.target.value.replace(/\D/g, '').slice(0, 2),
                  })
                }
                placeholder="ör. 1"
                style={girdi}
              />
            </div>
            <div
              style={{
                flex: '1 1 170px',
                padding: '9px 11px',
                borderRadius: 8,
                background: C.blue + '10',
                border: '1px solid ' + C.blue + '33',
                fontSize: 13,
                color: C.blue,
                fontWeight: 700,
                boxSizing: 'border-box',
              }}
            >
              Model: {modelEtiketi}
              <span style={{ fontWeight: 400, color: '#6B7280' }}> · {yilMetni}</span>
            </div>
          </div>

          <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 8, lineHeight: 1.55 }}>
            {isyeriVar ? (
              <>
                Programın <b>son {form.isyeriYariyilSayisi} yarıyılı</b> ({isyeriAralik}) ders değil{' '}
                <b>işyeri eğitimi</b> sayılır: o yarıyıla düşen müfredat dersleri öğrencinin “kalan
                ders” listesinde görünmez, yerine işyeri eğitimi koşulu çıkar. Bu ayrım Ders
                Yönetimi’ndeki <b>sınıf ve dönem</b> bilgisine dayanır — o alanlar doğru girilmiş
                olmalıdır.
              </>
            ) : (
              <>
                Tüm yarıyıllar ders yarıyılıdır; işyeri eğitimi koşulu aranmaz. İşyeri eğitimi
                uygulayan bir programda ikinci alana kaç yarıyıl olduğunu yazın.
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: '1 1 150px' }}>
            <label style={etiket}>Mezuniyet için toplam AKTS</label>
            <input
              value={form.toplamAkts}
              onChange={(e) => setForm({ ...form, toplamAkts: e.target.value.replace(/\D/g, '') })}
              style={girdi}
            />
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
              {form.toplamYariyil > 0
                ? 'Yarıyıl başına ' + Math.round(form.toplamAkts / form.toplamYariyil) + ' AKTS'
                : ''}
            </div>
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label style={etiket}>Asgari AGNO</label>
            <input
              value={form.minAgno}
              onChange={(e) => setForm({ ...form, minAgno: e.target.value })}
              style={girdi}
            />
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label style={etiket}>Asgari seçmeli AKTS (0 = aranmaz)</label>
            <input
              value={form.minSecmeliAkts}
              onChange={(e) =>
                setForm({ ...form, minSecmeliAkts: e.target.value.replace(/\D/g, '') })
              }
              style={girdi}
            />
          </div>
          {isyeriVar && (
            <div style={{ flex: '1 1 150px' }}>
              <label style={etiket}>İşyeri eğitimi AKTS</label>
              <input
                value={form.isyeriEgitimiAkts}
                onChange={(e) =>
                  setForm({ ...form, isyeriEgitimiAkts: e.target.value.replace(/\D/g, '') })
                }
                style={girdi}
              />
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={form.stajZorunlu !== false}
              onChange={(e) => setForm({ ...form, stajZorunlu: e.target.checked })}
            />
            Mezuniyet için staj zorunlu
          </label>
        </div>

        {/* ── DERS GEÇME ÖLÇEĞİ ──
            Yüzlük puan → harf → katsayı. Kodda sabit değil: buradaki değerler
            kayda yazılır ve hem mezuniyet hesabında hem yaz intibakında
            (karşı kurumdan gelen yüzlük puanın harfe çevrilmesinde) kullanılır. */}
        <div style={{ marginBottom: 16 }}>
          <label style={etiket}>Ders geçme ölçeği (yüzlük puan → harf → katsayı)</label>
          <div style={{ fontSize: 11.5, color: '#6B7280', marginBottom: 8, lineHeight: 1.55 }}>
            Bu ölçek iki yerde kullanılır: mezuniyet hesabında hangi harfin geçer sayıldığı, ve{' '}
            <b>yaz intibakında</b> öğrencinin karşı kurumdan aldığı <b>yüzlük puanın</b> ÇAKÜ harf
            notuna çevrilmesi. Karşı kurumun kendi harf notu kullanılmaz.
          </div>

          <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: '6px 10px',
                background: '#F9FAFB',
                fontSize: 10.5,
                fontWeight: 700,
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <span style={{ width: 130 }}>Puan aralığı</span>
              <span style={{ width: 78 }}>Harf</span>
              <span style={{ width: 78 }}>Katsayı</span>
              <span style={{ flex: 1 }}>Geçer mi</span>
            </div>
            {(form.notOlcegi || []).map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderTop: '1px solid #F3F4F6',
                }}
              >
                <span style={{ display: 'flex', gap: 4, alignItems: 'center', width: 130 }}>
                  <input
                    value={r.min ?? ''}
                    onChange={(e) => olcekSatir(i, 'min', e.target.value)}
                    style={{ ...girdi, width: 56, padding: '6px 8px', textAlign: 'center' }}
                  />
                  <span style={{ color: '#9CA3AF' }}>–</span>
                  <input
                    value={r.max ?? ''}
                    onChange={(e) => olcekSatir(i, 'max', e.target.value)}
                    style={{ ...girdi, width: 56, padding: '6px 8px', textAlign: 'center' }}
                  />
                </span>
                <input
                  value={r.harf ?? ''}
                  onChange={(e) => olcekSatir(i, 'harf', e.target.value)}
                  style={{
                    ...girdi,
                    width: 78,
                    padding: '6px 8px',
                    textAlign: 'center',
                    fontWeight: 700,
                  }}
                />
                <input
                  value={r.katsayi ?? ''}
                  onChange={(e) => olcekSatir(i, 'katsayi', e.target.value)}
                  style={{ ...girdi, width: 78, padding: '6px 8px', textAlign: 'center' }}
                />
                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: '#374151',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!r.gecer}
                    onChange={(e) => olcekSatir(i, 'gecer', e.target.checked)}
                  />
                  {r.gecer ? 'Geçer' : 'Kalır'}
                </label>
                <button onClick={() => olcekSil(i)} style={{ ...cip(false), padding: '4px 10px' }}>
                  Sil
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button onClick={olcekEkle} style={cip(false)}>
              + Aralık ekle
            </button>
            <button onClick={olcegiSifirla} style={cip(false)}>
              Varsayılan ölçeğe dön
            </button>
          </div>

          {/* Katsayısı olması geçtiği anlamına gelmiyor (F1: 1,50 ama kalır) —
              bu ayrım kaybolursa öğrenci geçmediği dersten geçmiş sayılır. */}
          {olcekSorunlari.length > 0 && (
            <div
              style={{
                marginTop: 8,
                padding: '8px 11px',
                borderRadius: 8,
                background: '#FEF3C7',
                color: '#92400E',
                fontSize: 11.5,
                lineHeight: 1.6,
              }}
            >
              {olcekSorunlari.slice(0, 6).map((s, i) => (
                <div key={i}>• {s}</div>
              ))}
            </div>
          )}
        </div>

        {/* ── Puan aralığı olmayan harfler ── */}
        <div style={{ marginBottom: 16 }}>
          <label style={etiket}>Diğer harf notları (puan aralığı olmayan)</label>
          <div style={{ fontSize: 11.5, color: '#6B7280', marginBottom: 8, lineHeight: 1.5 }}>
            Devamsızlık, sınava girmeme, muafiyet gibi durumlar. “Ortalamada sayılan harf” doluysa
            not, ortalama hesabında o harfin katsayısıyla işleme girer (ör. FF1/FF2/FF3 → F2).
          </div>
          <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
            {(form.ekHarfler || []).map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderTop: i === 0 ? 'none' : '1px solid #F3F4F6',
                  flexWrap: 'wrap',
                }}
              >
                <input
                  value={r.harf ?? ''}
                  onChange={(e) => ekHarfSatir(i, 'harf', e.target.value)}
                  placeholder="FF1"
                  style={{
                    ...girdi,
                    width: 78,
                    padding: '6px 8px',
                    textAlign: 'center',
                    fontWeight: 700,
                  }}
                />
                <input
                  value={r.aciklama ?? ''}
                  onChange={(e) => ekHarfSatir(i, 'aciklama', e.target.value)}
                  placeholder="Açıklama"
                  style={{ ...girdi, flex: '1 1 220px', padding: '6px 8px' }}
                />
                <input
                  value={r.sayilanHarf ?? ''}
                  onChange={(e) => ekHarfSatir(i, 'sayilanHarf', e.target.value)}
                  placeholder="→ F2"
                  title="Ortalamada sayılan harf"
                  style={{ ...girdi, width: 78, padding: '6px 8px', textAlign: 'center' }}
                />
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, width: 90 }}
                >
                  <input
                    type="checkbox"
                    checked={!!r.gecer}
                    onChange={(e) => ekHarfSatir(i, 'gecer', e.target.checked)}
                  />
                  {r.gecer ? 'Geçer' : 'Kalır'}
                </label>
                <button onClick={() => ekHarfSil(i)} style={{ ...cip(false), padding: '4px 10px' }}>
                  Sil
                </button>
              </div>
            ))}
          </div>
          <button onClick={ekHarfEkle} style={{ ...cip(false), marginTop: 8 }}>
            + Harf ekle
          </button>
        </div>

        {/* ── Ölçek dışında kalan notlar (serbest liste) ── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: '1 1 260px' }}>
            <label style={etiket}>Ek geçer notlar (virgülle ayırın)</label>
            {/* Metin HAM tutulup alandan çıkınca ayrıştırılıyor. Her tuşta
                ayrıştırılınca yazdığınız virgül anında siliniyor ve listeyi
                düzenlemek imkânsız hâle geliyordu. */}
            <input
              value={gecerMetin}
              onChange={(e) => setGecerMetin(e.target.value)}
              onBlur={() => setForm({ ...form, gecerNotlar: notAyristir(gecerMetin) })}
              placeholder="S, MU"
              style={girdi}
            />
          </div>
          <div style={{ flex: '1 1 260px' }}>
            <label style={etiket}>Ek kalır notlar (virgülle ayırın)</label>
            <input
              value={kalirMetin}
              onChange={(e) => setKalirMetin(e.target.value)}
              onBlur={() => setForm({ ...form, kalirNotlar: notAyristir(kalirMetin) })}
              placeholder="DZ, GR"
              style={girdi}
            />
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: '#6B7280', marginBottom: 14, lineHeight: 1.5 }}>
          Ölçekte yer almayan bir not <b>“belirsiz”</b> sayılır ve geçilmiş kabul edilmez —
          öğrenciye olmayan bir mezuniyet vaat etmemek için. Bu iki alan ölçeği <b>tamamlar</b>,
          onun yerine geçmez.
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={etiket}>Öğrenciye not (isteğe bağlı)</label>
          <textarea
            value={form.aciklama || ''}
            rows={2}
            onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
            style={{ ...girdi, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Btn onClick={kaydet} variant="primary" disabled={kaydediliyor}>
            {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
          </Btn>
          {mesaj && <span style={{ fontSize: 12.5, color: '#059669' }}>{mesaj}</span>}
        </div>
      </div>
    </div>
  );
}

window.BolumYonetimiModuluApp = BolumYonetimiModuluApp;

// ══════════════════════════════════════════════════════════════
// Gözetmen Kuralı — dersin kendi hocasının gözetmenliği
//
// Bu kural bölümden bölüme değişir: bazı bölümlerde dersin hocasının kendi
// sınavında bulunması zorunlu, bazılarında gözetmenlik bilinçli olarak
// bağımsız tutulur. Kural bölüm kaydında (departments.gozetmenKurali)
// saklanır ve sınav otomasyonunun dekanlık çıktısında uygulanır.
// ══════════════════════════════════════════════════════════════
const GOZETMEN_KURAL_SECENEKLERI = [
  {
    id: 'tercihli',
    label: 'Tercihli',
    desc: 'Dersin hocası gözetmen listesindeyse kendi sınavına öncelikli atanır, ama zorunlu değildir. Kalan gözetmenler yük dengesine göre seçilir.',
  },
  {
    id: 'zorunlu',
    label: 'Zorunlu',
    desc: 'Dersin hocası kendi sınavında her zaman gözetmen olarak yer alır. Gözetmen listesinde olması gerekir.',
  },
  {
    id: 'haric',
    label: 'Hariç',
    desc: 'Dersin hocası kendi sınavına otomatik atanmaz; gözetmenlik tamamen bağımsız yürütülür.',
  },
];

function GozetmenKurali({ departmentId }) {
  const [kural, setKural] = useState('tercihli');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState('');

  useEffect(() => {
    let alive = true;
    setYukleniyor(true);
    window
      .apiReadDoc('departments', String(departmentId))
      .then((r) => {
        if (!alive) return;
        setKural((r?.exists && r.data?.gozetmenKurali) || 'tercihli');
      })
      .catch(() => {})
      .finally(() => alive && setYukleniyor(false));
    return () => {
      alive = false;
    };
  }, [departmentId]);

  const kaydet = async (yeni) => {
    setKural(yeni);
    setKaydediliyor(true);
    setMesaj('');
    try {
      await DBWrite.set('departments', String(departmentId), { gozetmenKurali: yeni }, true);
      if (window.apiInvalidate) window.apiInvalidate('departments');
      setMesaj('Kaydedildi.');
      setTimeout(() => setMesaj(''), 2500);
    } catch (e) {
      setMesaj('Kaydedilemedi: ' + e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  if (yukleniyor) return null;

  return (
    <div style={{ padding: 16, borderBottom: '1px solid #E5E7EB', background: '#FAFBFC' }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>
        Dersin hocası kendi sınavında gözetmen olsun mu?
      </div>
      <div style={{ fontSize: 12.5, color: '#6B7280', marginBottom: 12, lineHeight: 1.55 }}>
        Bu kural bölümden bölüme değişir. Seçiminiz sınav otomasyonundaki otomatik gözetmen
        atamasında ve dekanlık çıktısında uygulanır.
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {GOZETMEN_KURAL_SECENEKLERI.map((s) => {
          const secili = kural === s.id;
          return (
            <label
              key={s.id}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                padding: '10px 12px',
                border: '1.5px solid ' + (secili ? '#2563EB' : '#E5E7EB'),
                background: secili ? '#EFF6FF' : 'white',
                borderRadius: 10,
                cursor: kaydediliyor ? 'wait' : 'pointer',
              }}
            >
              <input
                type="radio"
                name={'gozetmen-kurali-' + departmentId}
                checked={secili}
                disabled={kaydediliyor}
                onChange={() => kaydet(s.id)}
                style={{ marginTop: 3, cursor: 'inherit' }}
              />
              <span>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: secili ? '#1D4ED8' : '#1F2937' }}
                >
                  {s.label}
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    color: '#6B7280',
                    lineHeight: 1.5,
                    marginTop: 2,
                  }}
                >
                  {s.desc}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {mesaj && (
        <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 8 }}>{mesaj}</div>
      )}
    </div>
  );
}
