// ══════════════════════════════════════════════════════════════
// Kullanıcı Yönetimi Modülü
// Öğrenci, Akademisyen ve Şifre Yönetimi (Admin ve Bölüm Yetkilisi)
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useCallback } = React;

const KullaniciYonetimiApp = ({ currentUser, activeDepartment, departmentInfo }) => {
  const r = useResponsive();
  const DEPARTMENTS = window.DEPARTMENTS || [];
  const isAdmin = currentUser?.role === 'admin';
  const isDeptManager = currentUser?.role === 'bolum_yetkilisi';
  const [activeSection, setActiveSection] = useState('students'); // students, professors, passwords
  const [students, setStudents] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingProf, setEditingProf] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dbDepartments, setDbDepartments] = useState([]);
  // Çapraz-bölüm "Yeni Akademisyen Ekle" formu için akademisyen havuzu.
  // Kullanıcı kaynak bölüm seçtiğinde o bölümün akademisyenleri buraya yüklenir;
  // ad dropdown'unu bu liste besler.
  const [crossPickProfs, setCrossPickProfs] = useState([]);
  const [crossPickLoading, setCrossPickLoading] = useState(false);
  // Üniversite dışı (bölümsüz) akademisyenler — aktif bölümden bağımsız
  const [externalProfs, setExternalProfs] = useState([]);
  // ÇAP (çift anadal) öğrenci ekleme modalı
  const [capModalOpen, setCapModalOpen] = useState(false);
  const [capAllStudents, setCapAllStudents] = useState([]);
  const [capSearch, setCapSearch] = useState('');
  const [capLoading, setCapLoading] = useState(false);
  const [capSaving, setCapSaving] = useState('');

  // Password states
  const [studentPasses, setStudentPasses] = useState({});
  const [professorPasses, setProfessorPasses] = useState({});
  const [adminPass, setAdminPass] = useState('');
  const [passwordTab, setPasswordTab] = useState('student');
  const [defaultProfPass, setDefaultProfPass] = useState('');
  const [defaultProfAdminPass, setDefaultProfAdminPass] = useState('');
  const [savingDefault, setSavingDefault] = useState(false);

  // Bölümleri yükle (dropdown için)
  useEffect(() => {
    const loadDepts = async () => {
      try {
        const depts = await window.apiRead('departments');
        setDbDepartments(depts);
      } catch (e) {
        console.error('Bölümler yüklenemedi:', e);
      }
    };
    loadDepts();
  }, []);

  useEffect(() => {
    loadData();
  }, [activeDepartment]);

  const loadData = async () => {
    if (!DB.isReady()) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [fetchedStudents, fetchedProfs] = await Promise.all([
        DB.fetchStudents(),
        DB.fetchProfessors(),
      ]);
      // ── BÖLÜM FİLTRESİ: ADI KOŞULSUZ DENEMEK BİR PANSUMANDI ──
      // Burada eskiden "departmentId doğru bölümü göstermese bile adı
      // eşleşiyorsa kabul et" kuralı vardı. Gerekçesi, kimliği "yanlış"
      // görünen akademisyenlerin listeden kaybolmasıydı. Asıl sebep kimliğin
      // yanlış olması değil, AYNI bölümün iki kimlik biçimi (slug ve
      // ObjectId) taşıması ve ham eşitliğin bunları farklı bölüm saymasıydı.
      // O kök neden artık kimlik varyantı eşleştirmesiyle kapandı; pansuman
      // ise kendi arızasını üretiyordu: kimliği Makine'yi gösterip eski
      // `department` metni Bilgisayar'da kalmış kişi İKİ bölümde birden
      // görünüyordu ("hayalet akademisyen").
      const deptInfo = DEPARTMENTS.find((d) => d.id === activeDepartment);
      const deptName = deptInfo?.name || '';
      const normName = (s) => (s || '').toLowerCase().replace(/\s+/g, '');
      const shortTarget = normName(deptInfo?.shortName);
      // Bölüm eşleşmesi ORTAK kuralla (window.profMatchesDept): ham eşitlik
      // yerine bölümün tüm kimlik biçimleri denenir ve bölüm ADI yalnız
      // `departmentId` BOŞKEN devreye girer. Eskiden ad koşulsuz deneniyordu:
      // kimliği Makine'yi gösteren ama eski `department` metni Bilgisayar'da
      // kalmış kişi iki bölümde birden görünüyordu.
      const filterByDept = (item) => {
        if (!activeDepartment) return true;
        // Üniversite dışı akademisyen hiçbir bölümün asıl akademisyeni sayılmaz;
        // ana listede görünmez (yalnız "Üniversite Dışı Akademisyenler" havuzunda).
        if (item.external === true) return false;
        if (
          window.profMatchesDept
            ? window.profMatchesDept(item, activeDepartment, deptName)
            : item.departmentId === activeDepartment
        ) {
          return true;
        }
        // Kısa ad, ortak kuralın kapsamadığı tek durum: eski kayıtlarda
        // `department` alanına bölümün KISA adı yazılmış olabilir.
        if (item.departmentId || !shortTarget) return false;
        return normName(item.department) === shortTarget;
      };
      // Öğrenciler için de aynı OR mantığı — eski 'departmentId yoksa bilgisayar'
      // fallback'i kaldırıldı (yanlış bölüme düşürüyordu).
      const filterStudentByDept = (s) => {
        if (!activeDepartment) return true;
        // Öğrenci kaydında bölüm adı `departmentName` alanında da olabilir;
        // ortak kural `department`e bakar, bu yüzden normalize edilmiş bir
        // kopya verilir. ÇAP (çift anadal) öğrencisi ek bölüm listesinden
        // yakalanır — o da ortak kuralın içinde.
        const aday = s.department ? s : { ...s, department: s.departmentName };
        if (
          window.profMatchesDept
            ? window.profMatchesDept(aday, activeDepartment, deptName)
            : s.departmentId === activeDepartment
        ) {
          return true;
        }
        if (s.departmentId || !shortTarget) return false;
        return normName(s.department || s.departmentName) === shortTarget;
      };
      // Memurlar akademisyen değildir — akademisyen listelerinde/ders atamada
      // görünmezler. En kaynakta ayıklanır ki tüm alt kullanımları kapsasın.
      const visibleProfs = (fetchedProfs || []).filter((p) => !p.isMemur);
      setStudents((fetchedStudents || []).filter(filterStudentByDept));
      setProfessors(
        visibleProfs.filter(filterByDept).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      );
      // Üniversite dışı (bölümsüz) akademisyenler — hiçbir bölüm filtresine
      // takılmadıkları için ayrı tutulur ve aktif bölümden bağımsız gösterilir.
      setExternalProfs(
        visibleProfs
          .filter((p) => p.external === true)
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'))
      );
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Student Handlers ──
  const handleAddStudent = () => {
    const newStudent = {
      id: String(Date.now()),
      studentNumber: '',
      firstName: '',
      lastName: '',
      hostInstitution: '',
      hostCountry: '',
      semester: 'Fall 2025',
      outgoingMatches: [],
      returnMatches: [],
      erasmusAccess: true,
    };
    setEditingStudent(newStudent);
  };

  const handleSaveStudent = async (student) => {
    setSaving(true);
    try {
      if (students.find((s) => s.id === student.id)) {
        await DB.updateStudent(student.id, student);
        setStudents((prev) => prev.map((s) => (s.id === student.id ? student : s)));
      } else {
        await DB.addStudent(student);
        setStudents((prev) => [...prev, student]);
      }
      setEditingStudent(null);
      alert('Öğrenci kaydedildi!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Kayıt sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!confirm('Bu öğrenciyi silmek istediğinizden emin misiniz?')) return;
    try {
      const st = students.find((s) => s.id === id);
      await DB.deleteStudent(id);
      if (window.audit)
        window.audit('student_delete', 'students', id, {
          meta: {
            studentNumber: st?.studentNumber,
            name: `${st?.firstName || ''} ${st?.lastName || ''}`.trim(),
          },
        });
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleToggleErasmusAccess = async (student) => {
    try {
      const newAccess = !student.erasmusAccess;
      await DB.updateStudent(student.id, { ...student, erasmusAccess: newAccess });
      if (window.audit)
        window.audit('student_erasmus_access', 'students', student.id, {
          meta: { studentNumber: student.studentNumber, erasmusAccess: newAccess },
        });
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, erasmusAccess: newAccess } : s))
      );
    } catch (error) {
      console.error('Erasmus erişim güncelleme hatası:', error);
      alert('Erişim güncellenirken hata oluştu.');
    }
  };

  // ── ÇAP (çift anadal) öğrenci ekleme ──
  // Başka bölümde kayıtlı bir öğrenciyi, ÇAP yaptığı bu bölüme ek bölüm olarak
  // ekler. Böylece öğrenci bu bölümün öğrencileriyle aynı seviyede görünür.
  const openCapModal = async () => {
    setCapModalOpen(true);
    setCapSearch('');
    setCapLoading(true);
    try {
      const all = await DB.fetchStudents();
      // Zaten bu bölümde (ana ya da ek) olan öğrencileri hariç tut.
      const here = new Set(students.map((s) => s.id || s._docId));
      const notHere = (all || []).filter((s) => {
        const id = s.id || s._docId;
        if (here.has(id)) return false;
        if (s.departmentId === activeDepartment) return false;
        if (
          Array.isArray(s.additionalDepartments) &&
          s.additionalDepartments.includes(activeDepartment)
        )
          return false;
        return true;
      });
      setCapAllStudents(notHere);
    } catch (e) {
      console.error('ÇAP öğrenci listesi yüklenemedi:', e);
      setCapAllStudents([]);
    } finally {
      setCapLoading(false);
    }
  };

  const handleAddCapStudent = async (student) => {
    const sid = student.id || student._docId;
    setCapSaving(sid);
    try {
      const prevExtra = Array.isArray(student.additionalDepartments)
        ? student.additionalDepartments
        : [];
      const nextExtra = prevExtra.includes(activeDepartment)
        ? prevExtra
        : [...prevExtra, activeDepartment];
      await DB.updateStudent(sid, { ...student, additionalDepartments: nextExtra });
      if (window.audit)
        window.audit('student_cap_add', 'students', sid, {
          meta: {
            studentNumber: student.studentNumber,
            capDepartment: activeDepartment,
          },
        });
      setCapAllStudents((prev) => prev.filter((s) => (s.id || s._docId) !== sid));
      await loadData();
      alert('ÇAP öğrencisi bu bölüme eklendi.');
    } catch (e) {
      console.error('ÇAP öğrenci ekleme hatası:', e);
      alert('Eklenirken hata oluştu: ' + e.message);
    } finally {
      setCapSaving('');
    }
  };

  // ── Çapraz-bölüm akademisyen ekleme ──
  // Kaynak bölümün akademisyenlerini yükle — "Yeni Akademisyen Ekle" form satırı
  // bunları ad dropdown'unda gösterir.
  const loadCrossPickProfs = async (deptId) => {
    if (!deptId) {
      setCrossPickProfs([]);
      return;
    }
    setCrossPickLoading(true);
    try {
      const dept = (window.DEPARTMENTS || []).find((d) => d.id === deptId);
      const deptName = dept?.name || '';
      const all = await DB.fetchProfessors();
      // O bölümün akademisyenleri (id eşleşmesi VEYA ad eşleşmesi VEYA ek bölümde)
      // Memurlar akademisyen değildir — çapraz-bölüm ekleme havuzunda görünmez.
      const filtered = (all || []).filter((p) => {
        if (p.isMemur) return false;
        if (p.departmentId === deptId) return true;
        if (Array.isArray(p.additionalDepartments) && p.additionalDepartments.includes(deptId))
          return true;
        if (!p.departmentId && deptName && (p.department || '').trim() === deptName) return true;
        return false;
      });
      // Aktif bölümde zaten kayıtlı olanları çıkar
      const alreadyHere = new Set(professors.map((p) => p.id || p._docId));
      setCrossPickProfs(
        filtered
          .filter((p) => !alreadyHere.has(p.id || p._docId))
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'))
      );
    } catch (e) {
      console.error('Çapraz-bölüm akademisyen listesi yüklenemedi:', e);
    } finally {
      setCrossPickLoading(false);
    }
  };
  const addProfToActiveDept = async (prof) => {
    if (!activeDepartment) {
      alert('Aktif bölüm yok.');
      return;
    }
    try {
      const id = prof.id || prof._docId;
      const existing = Array.isArray(prof.additionalDepartments) ? prof.additionalDepartments : [];
      if (existing.includes(activeDepartment)) {
        alert(prof.name + ' zaten bu bölüme atanmış.');
        return;
      }
      const next = [...existing, activeDepartment];
      await window.DBWrite.set(
        'professors',
        id,
        { additionalDepartments: next, updatedAt: new Date().toISOString() },
        true
      );
      if (window.audit) {
        window.audit('professor_cross_dept_add', 'professors', id, {
          meta: { from: prof.departmentId, to: activeDepartment, name: prof.name },
        });
      }
      alert(prof.name + ' artık bu bölüme de erişebilir.');
      loadData(); // Listeyi tazele
    } catch (e) {
      alert('Atama hatası: ' + e.message);
    }
  };
  // Çapraz atamayı geri al — bir akademisyenin ek bölüm listesinden activeDept'i çıkar
  const removeProfFromActiveDept = async (prof) => {
    if (!activeDepartment) return;
    if (prof.departmentId === activeDepartment) {
      alert(
        prof.name + ' bu bölümün ANA akademisyeni. Kaldırmak için bölümünü değiştirmeniz gerekir.'
      );
      return;
    }
    if (
      !confirm(
        prof.name + ' kişisini ' + (departmentInfo?.name || 'bu bölüm') + ' erişiminden çıkar?'
      )
    )
      return;
    try {
      const id = prof.id || prof._docId;
      const existing = Array.isArray(prof.additionalDepartments) ? prof.additionalDepartments : [];
      const next = existing.filter((d) => d !== activeDepartment);
      await window.DBWrite.set(
        'professors',
        id,
        { additionalDepartments: next, updatedAt: new Date().toISOString() },
        true
      );
      if (window.audit) {
        window.audit('professor_cross_dept_remove', 'professors', id, {
          meta: { from: activeDepartment, name: prof.name },
        });
      }
      loadData();
    } catch (e) {
      alert('Kaldırma hatası: ' + e.message);
    }
  };

  // ── Professor Handlers ──
  const handleSaveProfessor = async () => {
    if (!editingProf.name || !editingProf.departmentId) return alert('İsim ve Bölüm zorunludur.');
    // departmentId'den department adını bul
    const dept = DEPARTMENTS.find((d) => d.id === editingProf.departmentId);
    const profData = {
      ...editingProf,
      department: dept?.name || editingProf.department || '',
      departmentId: editingProf.departmentId,
    };
    // Bölüm değişimini tespit et (kullanıcıya bilgilendirici mesaj göstermek için)
    const originalDeptId = editingProf.id
      ? professors.find((p) => p.id === editingProf.id)?.departmentId || 'bilgisayar'
      : null;
    const isMovingAway =
      originalDeptId &&
      originalDeptId !== editingProf.departmentId &&
      activeDepartment &&
      originalDeptId === activeDepartment;
    setSaving(true);
    try {
      await DB.saveProfessor(profData);
      if (window.audit)
        window.audit(
          editingProf.id ? 'professor_update' : 'professor_create',
          'professors',
          editingProf.id || '',
          {
            meta: { name: profData.name, departmentId: profData.departmentId },
          }
        );
      setEditingProf(null);
      // Filtreyi yeniden uygula (bölüm değişmişse profesör bu listeden çıkar)
      await loadData();
      if (isMovingAway) {
        alert(
          `${editingProf.name} artık ${dept?.name || editingProf.departmentId} bölümüne atandı. Bu bölüm listesinden kaldırıldı, fakülte genelinde yeni bölümünde görünür.`
        );
      }
    } catch (e) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProf = async (id, name) => {
    if (!confirm(`${name} isimli akademisyeni silmek istediğinize emin misiniz?`)) return;
    setSaving(true);
    try {
      await DB.deleteProfessor(id);
      if (window.audit) window.audit('professor_delete', 'professors', id, { meta: { name } });
      await loadData();
    } catch (e) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Password Handlers ──
  const handleSavePasswords = async () => {
    setSaving(true);
    try {
      if (passwordTab === 'student') {
        for (const [studentNo, pass] of Object.entries(studentPasses)) {
          if (pass && pass !== '••••••') {
            await DB.changePassword('student', studentNo, pass);
            if (window.audit)
              window.audit('password_reset', 'passwords', studentNo, { meta: { role: 'student' } });
          }
        }
      } else if (passwordTab === 'professor') {
        for (const [name, pass] of Object.entries(professorPasses)) {
          if (pass && pass !== '••••••') {
            await DB.changePassword('professor', name, pass);
            if (window.audit)
              window.audit('password_reset', 'passwords', name, { meta: { role: 'professor' } });
          }
        }
      } else if (passwordTab === 'admin') {
        if (adminPass && adminPass.length >= 6) {
          await DB.changePassword('admin', null, adminPass);
          if (window.audit)
            window.audit('password_reset', 'passwords', 'admin', { meta: { role: 'admin' } });
        }
      }
      alert('Şifreler kaydedildi!');
      setStudentPasses({});
      setProfessorPasses({});
      setAdminPass('');
    } catch (error) {
      console.error('Error saving passwords:', error);
      alert('Hata: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin && !isDeptManager) {
    return (
      <div>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 4px 40px' }}>
          <Card>
            <div style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>
              Bu sayfaya erişim yetkiniz bulunmamaktadır.
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: C.textMuted }}>
        Veriler yükleniyor...
      </div>
    );
  }

  const filteredStudents = students.filter((s) =>
    `${s.firstName} ${s.lastName} ${s.studentNumber}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const filteredProfessors = professors.filter((p) =>
    `${p.name} ${p.department || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sectionTabs = [
    { id: 'students', label: 'Öğrenciler', count: students.length },
    { id: 'professors', label: 'Akademisyenler', count: professors.length },
    { id: 'passwords', label: 'Şifre Yönetimi' },
  ];

  return (
    <div>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 4px 40px' }}>
        {/* Section Tabs */}
        <Card>
          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {sectionTabs.map((tab) => (
                <Btn
                  key={tab.id}
                  variant={activeSection === tab.id ? 'primary' : 'secondary'}
                  onClick={() => {
                    setActiveSection(tab.id);
                    setSearchTerm('');
                  }}
                >
                  {tab.label}
                  {tab.count != null ? ` (${tab.count})` : ''}
                </Btn>
              ))}
            </div>
            {(activeSection !== 'passwords' || passwordTab !== 'admin') && (
              <div style={{ flex: 1, maxWidth: 400, minWidth: 220, position: 'relative' }}>
                {/* Search Icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={C.textMuted}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    opacity: 0.6,
                  }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    activeSection === 'students'
                      ? 'Ad, soyad veya öğrenci no ile ara...'
                      : activeSection === 'passwords'
                        ? passwordTab === 'student'
                          ? 'Öğrenci no veya ad soyad ile ara...'
                          : 'Akademisyen adı ile ara...'
                        : 'İsim veya bölüm ile ara...'
                  }
                  style={{
                    width: '100%',
                    padding: '10px 36px 10px 38px',
                    borderRadius: 10,
                    border: `1.5px solid ${searchTerm ? C.gold : C.border}`,
                    fontSize: 14,
                    fontFamily: "'Source Sans 3', sans-serif",
                    outline: 'none',
                    transition: 'all 0.2s',
                    background: C.card,
                    boxShadow: searchTerm ? `0 0 0 3px ${C.gold}20` : 'none',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = C.gold;
                    e.target.style.boxShadow = `0 0 0 3px ${C.gold}20`;
                  }}
                  onBlur={(e) => {
                    if (!searchTerm) {
                      e.target.style.borderColor = C.border;
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                />
                {/* Clear Button */}
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: C.bg,
                      border: 'none',
                      borderRadius: '50%',
                      width: 22,
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: C.textMuted,
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = C.border;
                      e.currentTarget.style.color = C.navy;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = C.bg;
                      e.currentTarget.style.color = C.textMuted;
                    }}
                    title="Aramayı temizle"
                  >
                    &times;
                  </button>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Search Results Info */}
        {searchTerm && (activeSection !== 'passwords' || passwordTab !== 'admin') && (
          <div
            style={{
              padding: '8px 16px',
              fontSize: 13,
              color: C.textMuted,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>
              <strong style={{ color: C.navy }}>"{searchTerm}"</strong> için{' '}
              {activeSection === 'students'
                ? `${filteredStudents.length} öğrenci`
                : activeSection === 'passwords'
                  ? passwordTab === 'student'
                    ? `${filteredStudents.length} öğrenci`
                    : `${filteredProfessors.length} akademisyen`
                  : `${filteredProfessors.length} akademisyen`}{' '}
              bulundu
            </span>
          </div>
        )}

        {/* ══════ STUDENTS SECTION ══════ */}
        {activeSection === 'students' && (
          <>
            {/* Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: r.val('repeat(2, 1fr)', 'repeat(3, 1fr)', 'repeat(3, 1fr)'),
                gap: r.val(12, 16, 20),
                marginBottom: 24,
              }}
            >
              {[
                { label: 'Toplam Öğrenci', value: students.length, color: C.navy },
                {
                  label: 'Erasmus Yetkili',
                  value: students.filter((s) => s.erasmusAccess).length,
                  color: C.green,
                },
                {
                  label: 'Erasmus Yetkisiz',
                  value: students.filter((s) => !s.erasmusAccess).length,
                  color: C.accent,
                },
              ].map((stat, i) => (
                <Card key={i} noPadding>
                  <div style={{ padding: r.val(16, 20, 24), textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: r.val(12, 13, 14),
                        color: C.textMuted,
                        marginBottom: r.val(4, 6, 8),
                      }}
                    >
                      {stat.label}
                    </div>
                    <div
                      style={{
                        fontSize: r.val(24, 30, 36),
                        fontWeight: 700,
                        color: stat.color,
                        fontFamily: "'Playfair Display', serif",
                      }}
                    >
                      {stat.value}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card title="Öğrenci Listesi" noPadding>
              <div
                style={{
                  padding: '12px 24px',
                  borderBottom: `1px solid ${C.border}`,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <Btn onClick={openCapModal} variant="secondary" icon={<PlusIcon />}>
                  Çap Öğrencisi Ekle
                </Btn>
                <Btn onClick={handleAddStudent} icon={<PlusIcon />}>
                  Yeni Öğrenci Ekle
                </Btn>
              </div>
              <div className="responsive-table-wrap" style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    minWidth: r.isMobile ? 600 : 'auto',
                  }}
                >
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                      {['Öğrenci No', 'Ad Soyad', 'Erasmus', 'İşlemler'].map((h, i) => (
                        <th
                          key={i}
                          style={{
                            padding: '14px 20px',
                            textAlign: i === 3 ? 'right' : 'left',
                            fontSize: 11,
                            fontWeight: 700,
                            color: C.navy,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.id}
                        style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.15s' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = C.bg;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '';
                        }}
                      >
                        <td style={{ padding: '14px 20px' }}>
                          <span
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 13,
                              fontWeight: 600,
                              color: C.navy,
                            }}
                          >
                            {student.studentNumber}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', fontWeight: 500 }}>
                          {student.firstName} {student.lastName}
                          {Array.isArray(student.additionalDepartments) &&
                            student.additionalDepartments.includes(activeDepartment) &&
                            student.departmentId !== activeDepartment && (
                              <span
                                style={{
                                  marginLeft: 8,
                                  padding: '1px 8px',
                                  borderRadius: 10,
                                  background: '#FEF3C7',
                                  color: '#B45309',
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                }}
                              >
                                ÇAP
                              </span>
                            )}
                          {student.hostInstitution && (
                            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                              {student.hostInstitution} - {student.hostCountry}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <button
                            onClick={() => handleToggleErasmusAccess(student)}
                            style={{
                              padding: '4px 12px',
                              borderRadius: 20,
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600,
                              background: student.erasmusAccess ? '#E6F4EA' : '#FEE2E2',
                              color: student.erasmusAccess ? '#1E7E34' : '#DC2626',
                            }}
                          >
                            {student.erasmusAccess ? 'Yetkili' : 'Yetkisiz'}
                          </button>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setEditingStudent(student)}
                              style={{
                                padding: '6px',
                                border: `1px solid ${C.border}`,
                                borderRadius: 6,
                                background: 'white',
                                cursor: 'pointer',
                                color: C.blue,
                                display: 'flex',
                              }}
                              title="Düzenle"
                            >
                              <EditIcon />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student.id)}
                              style={{
                                padding: '6px',
                                border: `1px solid ${C.border}`,
                                borderRadius: 6,
                                background: 'white',
                                cursor: 'pointer',
                                color: C.accent,
                                display: 'flex',
                              }}
                              title="Sil"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          style={{ padding: 40, textAlign: 'center', color: C.textMuted }}
                        >
                          Öğrenci bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ══════ PROFESSORS SECTION ══════ */}
        {activeSection === 'professors' && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: r.val(12, 16, 20),
                marginBottom: 24,
              }}
            >
              {[
                { label: 'Toplam Akademisyen', value: professors.length, color: C.navy },
                {
                  label: 'Bölüm Sayısı',
                  value: [...new Set(professors.map((p) => p.department).filter(Boolean))].length,
                  color: C.green,
                },
              ].map((stat, i) => (
                <Card key={i} noPadding>
                  <div style={{ padding: r.val(16, 20, 24), textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: r.val(12, 13, 14),
                        color: C.textMuted,
                        marginBottom: r.val(4, 6, 8),
                      }}
                    >
                      {stat.label}
                    </div>
                    <div
                      style={{
                        fontSize: r.val(24, 30, 36),
                        fontWeight: 700,
                        color: stat.color,
                        fontFamily: "'Playfair Display', serif",
                      }}
                    >
                      {stat.value}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card title="Akademisyen Listesi" noPadding>
              <div
                style={{
                  padding: '12px 24px',
                  borderBottom: `1px solid ${C.border}`,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <Btn
                  variant="secondary"
                  onClick={() =>
                    setEditingProf({
                      mode: 'cross',
                      name: '',
                      department: '',
                      departmentId: '',
                    })
                  }
                  icon={<PlusIcon />}
                >
                  Var Olan Akademisyenden Ekle
                </Btn>
                <Btn
                  onClick={() =>
                    setEditingProf({
                      mode: 'new',
                      name: '',
                      title: '',
                      department: departmentInfo?.name || '',
                      departmentId: activeDepartment || '',
                    })
                  }
                  icon={<PlusIcon />}
                >
                  Yeni Akademisyen Oluştur
                </Btn>
                <Btn
                  variant="secondary"
                  onClick={() =>
                    setEditingProf({
                      mode: 'external',
                      name: '',
                      title: '',
                      department: '',
                      departmentId: '',
                    })
                  }
                  icon={<PlusIcon />}
                >
                  Üniversite Dışı Görevlendirme
                </Btn>
              </div>
              <div className="responsive-table-wrap" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                      {['Unvan & İsim', 'Bölüm', 'İşlemler'].map((h, i) => (
                        <th
                          key={i}
                          style={{
                            padding: '14px 20px',
                            textAlign: i === 2 ? 'right' : 'left',
                            fontSize: 11,
                            fontWeight: 700,
                            color: C.navy,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Yepyeni akademisyen oluştur — kendi bölümüne sıfırdan kayıt.
                        İsim + opsiyonel unvan; bu bölüm yetkilisinin aktif bölümüne
                        eklenir. */}
                    {editingProf && editingProf.mode === 'new' && !editingProf.id && (
                      <tr
                        style={{
                          background: 'rgba(0,150,255,0.05)',
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        <td style={{ padding: 14 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Input
                              value={editingProf.title || ''}
                              onChange={(e) =>
                                setEditingProf({ ...editingProf, title: e.target.value })
                              }
                              placeholder="Unvan (Prof. Dr., Doç. Dr. vb.)"
                            />
                            <Input
                              autoFocus
                              value={editingProf.name}
                              onChange={(e) =>
                                setEditingProf({ ...editingProf, name: e.target.value })
                              }
                              placeholder="Ad Soyad (Örn: Ahmet YILMAZ)"
                            />
                          </div>
                        </td>
                        <td style={{ padding: 14 }}>
                          <div
                            style={{
                              padding: '10px 12px',
                              borderRadius: 8,
                              background: C.bg,
                              fontSize: 13,
                              color: C.navy,
                              fontWeight: 600,
                            }}
                          >
                            {departmentInfo?.name || activeDepartment}
                          </div>
                        </td>
                        <td style={{ padding: 14, textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <Btn
                              small
                              disabled={!editingProf.name?.trim() || saving}
                              onClick={async () => {
                                if (!editingProf.name?.trim()) {
                                  alert('Ad zorunlu.');
                                  return;
                                }
                                setSaving(true);
                                try {
                                  const fullName = editingProf.title?.trim()
                                    ? `${editingProf.title.trim()} ${editingProf.name.trim()}`
                                    : editingProf.name.trim();
                                  await DB.saveProfessor({
                                    name: fullName,
                                    departmentId: activeDepartment,
                                    department: departmentInfo?.name || '',
                                    facultyId: currentUser?.facultyId || '',
                                    universityId: currentUser?.universityId || 'caku',
                                  });
                                  if (window.audit)
                                    window.audit('professor_create', 'professors', '', {
                                      meta: {
                                        name: fullName,
                                        departmentId: activeDepartment,
                                      },
                                    });
                                  setEditingProf(null);
                                  loadData();
                                } catch (e) {
                                  alert('Kayıt hatası: ' + e.message);
                                } finally {
                                  setSaving(false);
                                }
                              }}
                            >
                              Kaydet
                            </Btn>
                            <Btn small variant="secondary" onClick={() => setEditingProf(null)}>
                              İptal
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Üniversite dışı görevlendirme — hiçbir bölüme tabi olmayan
                        ama üniversitede ders veren akademisyen. departmentId boş,
                        external:true olarak kaydedilir. */}
                    {editingProf && editingProf.mode === 'external' && !editingProf.id && (
                      <tr
                        style={{
                          background: 'rgba(180,83,9,0.06)',
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        <td style={{ padding: 14 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Input
                              value={editingProf.title || ''}
                              onChange={(e) =>
                                setEditingProf({ ...editingProf, title: e.target.value })
                              }
                              placeholder="Unvan (Öğr. Gör., Dr. vb.)"
                            />
                            <Input
                              autoFocus
                              value={editingProf.name}
                              onChange={(e) =>
                                setEditingProf({ ...editingProf, name: e.target.value })
                              }
                              placeholder="Ad Soyad (Örn: Ahmet YILMAZ)"
                            />
                          </div>
                        </td>
                        <td style={{ padding: 14 }}>
                          <div
                            style={{
                              padding: '10px 12px',
                              borderRadius: 8,
                              background: '#FEF3C7',
                              fontSize: 12.5,
                              color: '#B45309',
                              fontWeight: 600,
                            }}
                          >
                            Üniversite dışı (bölümsüz)
                          </div>
                        </td>
                        <td style={{ padding: 14, textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <Btn
                              small
                              disabled={!editingProf.name?.trim() || saving}
                              onClick={async () => {
                                if (!editingProf.name?.trim()) {
                                  alert('Ad zorunlu.');
                                  return;
                                }
                                setSaving(true);
                                try {
                                  const fullName = editingProf.title?.trim()
                                    ? `${editingProf.title.trim()} ${editingProf.name.trim()}`
                                    : editingProf.name.trim();
                                  await DB.saveProfessor({
                                    name: fullName,
                                    departmentId: '',
                                    department: '',
                                    external: true,
                                    facultyId: currentUser?.facultyId || '',
                                    universityId: currentUser?.universityId || 'caku',
                                  });
                                  if (window.audit)
                                    window.audit('professor_create_external', 'professors', '', {
                                      meta: { name: fullName, external: true },
                                    });
                                  setEditingProf(null);
                                  loadData();
                                } catch (e) {
                                  alert('Kayıt hatası: ' + e.message);
                                } finally {
                                  setSaving(false);
                                }
                              }}
                            >
                              Kaydet
                            </Btn>
                            <Btn small variant="secondary" onClick={() => setEditingProf(null)}>
                              İptal
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* New professor form row — bölüm seç → o bölümün akademisyenleri ad
                        olarak listelenir → seçilen akademisyen aktif bölüme additionalDepartments
                        olarak eklenir (çapraz-bölüm akademisyen ataması). */}
                    {editingProf && editingProf.mode === 'cross' && !editingProf.id && (
                      <tr
                        style={{
                          background: 'rgba(0,255,135,0.05)',
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        <td style={{ padding: 14 }}>
                          <select
                            autoFocus
                            value={editingProf.selectedProfId || ''}
                            onChange={(e) => {
                              const sel = crossPickProfs.find(
                                (p) => (p.id || p._docId) === e.target.value
                              );
                              setEditingProf({
                                ...editingProf,
                                selectedProfId: e.target.value,
                                name: sel?.name || '',
                              });
                            }}
                            disabled={!editingProf.departmentId || crossPickLoading}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: `1.5px solid ${C.border}`,
                              borderRadius: 8,
                              fontSize: 14,
                              fontFamily: 'inherit',
                              backgroundColor: editingProf.departmentId ? 'white' : '#F3F4F6',
                              cursor: editingProf.departmentId ? 'pointer' : 'not-allowed',
                            }}
                          >
                            <option value="">
                              {!editingProf.departmentId
                                ? 'Önce kaynak bölüm seçin'
                                : crossPickLoading
                                  ? 'Yükleniyor…'
                                  : crossPickProfs.length === 0
                                    ? 'Bu bölümde akademisyen yok'
                                    : 'Akademisyen seçin'}
                            </option>
                            {crossPickProfs.map((p) => {
                              const k = p.id || p._docId;
                              return (
                                <option key={k} value={k}>
                                  {p.name}
                                  {p.department ? ` — ${p.department}` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </td>
                        <td style={{ padding: 14 }}>
                          <window.BolumSecici
                            value={editingProf.departmentId}
                            placeholder="Kaynak Bölüm Seçin"
                            haric={activeDepartment}
                            onChange={(e) => {
                              setEditingProf({
                                ...editingProf,
                                departmentId: e.target.value,
                                selectedProfId: '',
                                name: '',
                              });
                              loadCrossPickProfs(e.target.value);
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: `1.5px solid ${C.border}`,
                              borderRadius: 8,
                              fontSize: 14,
                              fontFamily: 'inherit',
                              backgroundColor: 'white',
                              cursor: 'pointer',
                            }}
                          />
                        </td>
                        <td style={{ padding: 14, textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <Btn
                              small
                              disabled={!editingProf.selectedProfId || saving}
                              onClick={async () => {
                                const picked = crossPickProfs.find(
                                  (p) => (p.id || p._docId) === editingProf.selectedProfId
                                );
                                if (!picked) {
                                  alert('Önce bir akademisyen seçin.');
                                  return;
                                }
                                await addProfToActiveDept(picked);
                                setEditingProf(null);
                              }}
                            >
                              Bu Bölüme Ekle
                            </Btn>
                            <Btn small variant="secondary" onClick={() => setEditingProf(null)}>
                              İptal
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    )}

                    {filteredProfessors.map((prof, idx) => {
                      const isEditing = editingProf && editingProf.id === prof.id;
                      return isEditing ? (
                        <tr
                          key={prof.id}
                          style={{
                            background: 'rgba(0,255,135,0.05)',
                            borderBottom: `1px solid ${C.border}`,
                          }}
                        >
                          <td style={{ padding: 14 }}>
                            <Input
                              value={editingProf.name}
                              onChange={(e) =>
                                setEditingProf({ ...editingProf, name: e.target.value })
                              }
                            />
                          </td>
                          <td style={{ padding: 14 }}>
                            <window.BolumSecici
                              value={editingProf.departmentId}
                              onChange={(e) => {
                                const dept = DEPARTMENTS.find((d) => d.id === e.target.value);
                                setEditingProf({
                                  ...editingProf,
                                  departmentId: e.target.value,
                                  department: dept?.name || '',
                                });
                              }}
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: `1.5px solid ${C.border}`,
                                borderRadius: 8,
                                fontSize: 14,
                                fontFamily: 'inherit',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                              }}
                            />
                          </td>
                          <td style={{ padding: 14, textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <Btn small onClick={handleSaveProfessor} disabled={saving}>
                                Kaydet
                              </Btn>
                              <Btn small variant="secondary" onClick={() => setEditingProf(null)}>
                                İptal
                              </Btn>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={prof.id || idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '14px 20px', fontWeight: 600, color: C.navy }}>
                            {prof.name}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            {(() => {
                              const dept = prof.departmentId
                                ? DEPARTMENTS.find((d) => d.id === prof.departmentId)
                                : null;
                              const deptColor = dept?.color || '#6b7280';
                              return (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    background: `${deptColor}12`,
                                    border: `1px solid ${deptColor}30`,
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: deptColor,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 7,
                                      height: 7,
                                      borderRadius: '50%',
                                      background: deptColor,
                                    }}
                                  />
                                  {dept?.name || prof.department || 'Belirtilmemiş'}
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => {
                                  // departmentId yoksa department adından çıkar
                                  let deptId = prof.departmentId || '';
                                  if (!deptId && prof.department) {
                                    const deptNorm = prof.department
                                      .toLowerCase()
                                      .replace(/\s+/g, '');
                                    const match = DEPARTMENTS.find(
                                      (d) =>
                                        d.name.toLowerCase().replace(/\s+/g, '') === deptNorm ||
                                        d.shortName.toLowerCase().replace(/\s+/g, '') ===
                                          deptNorm ||
                                        deptNorm.includes(
                                          d.shortName.toLowerCase().replace(/\s+/g, '')
                                        )
                                    );
                                    if (match) deptId = match.id;
                                  }
                                  setEditingProf({ ...prof, departmentId: deptId });
                                }}
                                style={{
                                  padding: '6px',
                                  border: `1px solid ${C.border}`,
                                  borderRadius: 6,
                                  background: 'white',
                                  cursor: 'pointer',
                                  color: C.blue,
                                  display: 'flex',
                                }}
                                title="Düzenle"
                              >
                                <EditIcon />
                              </button>
                              <button
                                onClick={() => handleDeleteProf(prof.id, prof.name)}
                                style={{
                                  padding: '6px',
                                  border: `1px solid ${C.border}`,
                                  borderRadius: 6,
                                  background: 'white',
                                  cursor: 'pointer',
                                  color: C.accent,
                                  display: 'flex',
                                }}
                                title="Sil"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProfessors.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          style={{ padding: 40, textAlign: 'center', color: C.textMuted }}
                        >
                          Akademisyen bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Üniversite dışı (bölümsüz) akademisyenler — aktif bölümden
                bağımsız listelenir; "Üniversite Dışı Görevlendirme" ile eklenir. */}
            <div style={{ marginTop: 20 }}>
              <Card title="Üniversite Dışı Akademisyenler (bölümsüz)" noPadding>
                <div style={{ padding: '12px 24px', borderBottom: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 12.5, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>
                    Hiçbir bölüme tabi olmayan, üniversitede ders veren akademisyenler bu havuzda
                    durur (bölüm seçiminden bağımsız görünür). "Bu bölüme ekle" ile aktif bölüme
                    dahil edilirler; o bölümün asıl akademisyeni sayılmazlar ancak o bölümde Sınav
                    Otomasyonu, Ders Programı, Projeler ve Öğrenci Portalı modüllerini
                    kullanabilirler.
                  </p>
                </div>
                <div className="responsive-table-wrap" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                        {['Unvan & İsim', 'Erişebildiği Bölümler', 'İşlemler'].map((h, i) => (
                          <th
                            key={i}
                            style={{
                              padding: '14px 20px',
                              textAlign: i === 2 ? 'right' : 'left',
                              fontSize: 11,
                              fontWeight: 700,
                              color: C.navy,
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {externalProfs.map((prof) => {
                        const assigned = Array.isArray(prof.additionalDepartments)
                          ? prof.additionalDepartments
                          : [];
                        const inActiveDept = assigned.includes(activeDepartment);
                        return (
                          <tr
                            key={prof.id || prof._docId}
                            style={{ borderBottom: `1px solid ${C.border}` }}
                          >
                            <td style={{ padding: '14px 20px', fontWeight: 600, color: C.navy }}>
                              {prof.name}
                              <span
                                style={{
                                  marginLeft: 8,
                                  padding: '1px 8px',
                                  borderRadius: 10,
                                  background: '#FEF3C7',
                                  color: '#B45309',
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                }}
                              >
                                Üniversite dışı
                              </span>
                            </td>
                            <td style={{ padding: '14px 20px' }}>
                              {assigned.length === 0 ? (
                                <span style={{ fontSize: 12, color: C.textMuted }}>
                                  Henüz bir bölüme eklenmedi
                                </span>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {assigned.map((deptId) => (
                                    <span
                                      key={deptId}
                                      style={{
                                        padding: '2px 9px',
                                        borderRadius: 10,
                                        background: C.bg,
                                        color: C.navy,
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {DEPARTMENTS.find((d) => d.id === deptId)?.name || deptId}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  gap: 6,
                                  justifyContent: 'flex-end',
                                }}
                              >
                                {inActiveDept ? (
                                  <Btn
                                    small
                                    variant="secondary"
                                    onClick={() => removeProfFromActiveDept(prof)}
                                  >
                                    Bu bölümden çıkar
                                  </Btn>
                                ) : (
                                  <Btn small onClick={() => addProfToActiveDept(prof)}>
                                    Bu bölüme ekle
                                  </Btn>
                                )}
                                <button
                                  onClick={() =>
                                    handleDeleteProf(prof.id || prof._docId, prof.name)
                                  }
                                  style={{
                                    padding: 8,
                                    borderRadius: 8,
                                    border: `1px solid ${C.border}`,
                                    background: 'white',
                                    cursor: 'pointer',
                                    color: C.accent,
                                    display: 'inline-flex',
                                  }}
                                  title="Havuzdan tamamen sil"
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {externalProfs.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            style={{ padding: 40, textAlign: 'center', color: C.textMuted }}
                          >
                            Üniversite dışı görevlendirme ile eklenmiş akademisyen yok.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ══════ PASSWORDS SECTION ══════ */}
        {activeSection === 'passwords' && (
          <Card title="Şifre Yönetimi">
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {[
                { id: 'student', label: 'Öğrenciler' },
                { id: 'professor', label: 'Akademisyenler' },
                ...(isAdmin ? [{ id: 'admin', label: 'Admin' }] : []),
              ].map((tab) => (
                <Btn
                  key={tab.id}
                  variant={passwordTab === tab.id ? 'primary' : 'secondary'}
                  onClick={() => {
                    setPasswordTab(tab.id);
                    setSearchTerm('');
                  }}
                  small
                >
                  {tab.label}
                </Btn>
              ))}
            </div>

            <div style={{ maxHeight: 500, overflowY: 'auto', marginBottom: 24, paddingRight: 8 }}>
              {passwordTab === 'student' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      <th
                        style={{
                          padding: 12,
                          textAlign: 'left',
                          borderBottom: `2px solid ${C.border}`,
                        }}
                      >
                        Öğrenci No
                      </th>
                      <th
                        style={{
                          padding: 12,
                          textAlign: 'left',
                          borderBottom: `2px solid ${C.border}`,
                        }}
                      >
                        Ad Soyad
                      </th>
                      <th
                        style={{
                          padding: 12,
                          textAlign: 'left',
                          borderBottom: `2px solid ${C.border}`,
                        }}
                      >
                        Yeni Şifre
                      </th>
                      <th
                        style={{
                          padding: 12,
                          textAlign: 'center',
                          borderBottom: `2px solid ${C.border}`,
                        }}
                      >
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.studentNumber}
                        style={{ borderBottom: `1px solid ${C.border}` }}
                      >
                        <td style={{ padding: 12, fontWeight: 600, color: C.navy }}>
                          {student.studentNumber}
                        </td>
                        <td style={{ padding: 12 }}>
                          {student.firstName} {student.lastName}
                        </td>
                        <td style={{ padding: 12 }}>
                          <Input
                            type="password"
                            value={studentPasses[student.studentNumber] || ''}
                            placeholder="Yeni şifre girin"
                            onChange={(e) =>
                              setStudentPasses((p) => ({
                                ...p,
                                [student.studentNumber]: e.target.value,
                              }))
                            }
                          />
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              if (confirm('Şifreyi sıfırlamak istediğinizden emin misiniz?')) {
                                setStudentPasses((p) => ({ ...p, [student.studentNumber]: '' }));
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              fontSize: 12,
                              border: `1px solid ${C.border}`,
                              borderRadius: 6,
                              background: 'white',
                              cursor: 'pointer',
                              color: C.accent,
                            }}
                          >
                            Sıfırla
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {passwordTab === 'professor' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      <th
                        style={{
                          padding: 12,
                          textAlign: 'left',
                          borderBottom: `2px solid ${C.border}`,
                        }}
                      >
                        Unvan & İsim
                      </th>
                      <th
                        style={{
                          padding: 12,
                          textAlign: 'left',
                          borderBottom: `2px solid ${C.border}`,
                        }}
                      >
                        Yeni Şifre
                      </th>
                      <th
                        style={{
                          padding: 12,
                          textAlign: 'center',
                          borderBottom: `2px solid ${C.border}`,
                        }}
                      >
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfessors.map((prof, idx) => (
                      <tr key={prof.id || idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: 12, fontWeight: 600, color: C.navy }}>{prof.name}</td>
                        <td style={{ padding: 12 }}>
                          <Input
                            type="password"
                            value={professorPasses[prof.name] || ''}
                            placeholder="Yeni şifre girin"
                            onChange={(e) =>
                              setProfessorPasses((p) => ({ ...p, [prof.name]: e.target.value }))
                            }
                          />
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              if (confirm('Şifreyi sıfırlamak istediğinizden emin misiniz?')) {
                                setProfessorPasses((p) => ({ ...p, [prof.name]: '' }));
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              fontSize: 12,
                              border: `1px solid ${C.border}`,
                              borderRadius: 6,
                              background: 'white',
                              cursor: 'pointer',
                              color: C.accent,
                            }}
                          >
                            Şifre Sıfırla
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {passwordTab === 'admin' && isAdmin && (
                <div style={{ padding: 20 }}>
                  <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ marginBottom: 16, fontWeight: 600, color: C.navy }}>
                      Admin Giriş Şifresi
                    </div>
                    <div style={{ maxWidth: 300, margin: '0 auto' }}>
                      <Input
                        type="password"
                        value={adminPass}
                        onChange={(e) => setAdminPass(e.target.value)}
                        placeholder="Yeni admin şifresi"
                        style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2 }}
                      />
                    </div>
                    <div style={{ marginTop: 12, fontSize: 13, color: C.textMuted }}>
                      Bu şifre ile Admin paneline erişim sağlanır.
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: `1px solid ${C.border}`,
                      paddingTop: 24,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ marginBottom: 16, fontWeight: 600, color: C.navy }}>
                      Varsayılan Akademisyen Şifresi
                    </div>
                    <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
                      Şifresi olmayan akademisyenler ilk girişte bu şifreyi kullanır.
                    </div>
                    <div
                      style={{
                        maxWidth: 300,
                        margin: '0 auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <Input
                        type="password"
                        value={defaultProfAdminPass}
                        onChange={(e) => setDefaultProfAdminPass(e.target.value)}
                        placeholder="Admin şifreniz (doğrulama)"
                      />
                      <Input
                        type="password"
                        value={defaultProfPass}
                        onChange={(e) => setDefaultProfPass(e.target.value)}
                        placeholder="Yeni varsayılan akademisyen şifresi"
                      />
                      <Btn
                        small
                        onClick={async () => {
                          if (!defaultProfAdminPass || !defaultProfPass)
                            return alert('Lütfen tüm alanları doldurun.');
                          if (defaultProfPass.length < 6)
                            return alert('Şifre en az 6 karakter olmalıdır.');
                          setSavingDefault(true);
                          try {
                            const result = await DB.setDefaultProfessorPassword(
                              defaultProfAdminPass,
                              defaultProfPass
                            );
                            if (result.success) {
                              alert('Varsayılan akademisyen şifresi güncellendi!');
                              setDefaultProfPass('');
                              setDefaultProfAdminPass('');
                            }
                          } catch (error) {
                            alert('Hata: ' + (error.message || 'Bilinmeyen hata'));
                          } finally {
                            setSavingDefault(false);
                          }
                        }}
                        disabled={savingDefault}
                      >
                        {savingDefault ? 'Kaydediliyor...' : 'Varsayılan Şifreyi Kaydet'}
                      </Btn>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                paddingTop: 20,
                borderTop: `1px solid ${C.border}`,
              }}
            >
              <Btn onClick={handleSavePasswords} disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Şifreleri Kaydet'}
              </Btn>
            </div>
          </Card>
        )}

        {/* Student Edit Modal */}
        {editingStudent && (
          <Modal
            open={true}
            onClose={() => setEditingStudent(null)}
            title={editingStudent.studentNumber ? 'Öğrenci Düzenle' : 'Yeni Öğrenci'}
            width={600}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.navy,
                    marginBottom: 6,
                  }}
                >
                  Öğrenci Numarası
                </label>
                <Input
                  value={editingStudent.studentNumber}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, studentNumber: e.target.value })
                  }
                  placeholder="9 haneli öğrenci numarası"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.navy,
                      marginBottom: 6,
                    }}
                  >
                    Ad
                  </label>
                  <Input
                    value={editingStudent.firstName}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, firstName: e.target.value })
                    }
                    placeholder="Ad"
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.navy,
                      marginBottom: 6,
                    }}
                  >
                    Soyad
                  </label>
                  <Input
                    value={editingStudent.lastName}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, lastName: e.target.value })
                    }
                    placeholder="Soyad"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.navy,
                      marginBottom: 6,
                    }}
                  >
                    Karşı Kurum
                  </label>
                  <Input
                    value={editingStudent.hostInstitution || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, hostInstitution: e.target.value })
                    }
                    placeholder="Üniversite adı"
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.navy,
                      marginBottom: 6,
                    }}
                  >
                    Ülke
                  </label>
                  <Input
                    value={editingStudent.hostCountry || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, hostCountry: e.target.value })
                    }
                    placeholder="Ülke"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>
                  Erasmus Erişimi:
                </label>
                <button
                  onClick={() =>
                    setEditingStudent({
                      ...editingStudent,
                      erasmusAccess: !editingStudent.erasmusAccess,
                    })
                  }
                  style={{
                    padding: '4px 16px',
                    borderRadius: 20,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    background: editingStudent.erasmusAccess ? '#E6F4EA' : '#FEE2E2',
                    color: editingStudent.erasmusAccess ? '#1E7E34' : '#DC2626',
                  }}
                >
                  {editingStudent.erasmusAccess ? 'Yetkili' : 'Yetkisiz'}
                </button>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 12,
                  paddingTop: 16,
                  borderTop: `1px solid ${C.border}`,
                }}
              >
                <Btn onClick={() => setEditingStudent(null)} variant="secondary">
                  İptal
                </Btn>
                <Btn onClick={() => handleSaveStudent(editingStudent)} disabled={saving}>
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Btn>
              </div>
            </div>
          </Modal>
        )}

        {/* Çapraz-bölüm akademisyen ekleme modalı */}

        {/* ÇAP (çift anadal) öğrenci ekleme modalı */}
        {capModalOpen && (
          <Modal
            open={true}
            onClose={() => setCapModalOpen(false)}
            title={`Çap Öğrencisi Ekle — ${departmentInfo?.name || activeDepartment}`}
            width={640}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>
                Başka bölümde kayıtlı bir öğrenciyi bu bölüme ÇAP öğrencisi olarak ekleyin. Eklenen
                öğrenci, bu bölümün öğrencileriyle aynı seviyede görünür ve bu bölüme erişebilir.
              </p>
              <Input
                autoFocus
                value={capSearch}
                onChange={(e) => setCapSearch(e.target.value)}
                placeholder="Öğrenci no veya ad soyad ile ara…"
              />
              <div
                style={{
                  maxHeight: 360,
                  overflowY: 'auto',
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                }}
              >
                {capLoading ? (
                  <p style={{ padding: 20, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
                    Yükleniyor…
                  </p>
                ) : (
                  (() => {
                    const q = capSearch.trim().toLocaleLowerCase('tr');
                    const list = capAllStudents
                      .filter((s) => {
                        if (!q) return true;
                        const name = `${s.firstName || ''} ${s.lastName || ''}`.toLocaleLowerCase(
                          'tr'
                        );
                        return name.includes(q) || String(s.studentNumber || '').includes(q);
                      })
                      .slice(0, 100);
                    if (list.length === 0) {
                      return (
                        <p
                          style={{
                            padding: 20,
                            textAlign: 'center',
                            color: C.textMuted,
                            fontSize: 13,
                          }}
                        >
                          {capAllStudents.length === 0
                            ? 'Eklenebilecek başka bölüm öğrencisi bulunamadı.'
                            : 'Aramayla eşleşen öğrenci yok.'}
                        </p>
                      );
                    }
                    return list.map((s) => {
                      const sid = s.id || s._docId;
                      const deptName =
                        DEPARTMENTS.find((d) => d.id === s.departmentId)?.name ||
                        s.department ||
                        s.departmentName ||
                        '—';
                      return (
                        <div
                          key={sid}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 14px',
                            borderBottom: `1px solid ${C.border}`,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>
                              {s.firstName} {s.lastName}
                            </div>
                            <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>
                              {s.studentNumber} · {deptName}
                            </div>
                          </div>
                          <Btn
                            small
                            disabled={capSaving === sid}
                            onClick={() => handleAddCapStudent(s)}
                          >
                            {capSaving === sid ? 'Ekleniyor…' : 'Ekle'}
                          </Btn>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  paddingTop: 8,
                  borderTop: `1px solid ${C.border}`,
                }}
              >
                <Btn variant="secondary" onClick={() => setCapModalOpen(false)}>
                  Kapat
                </Btn>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

if (typeof window !== 'undefined') {
  window.KullaniciYonetimiApp = KullaniciYonetimiApp;
}
