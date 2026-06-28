// ══════════════════════════════════════════════════════════════
// ÇAKÜ - Benim Sayfam
//   • Öğrenci henüz ders seçmemişse → ders seçim ekranı
//   • Seçim tamamlandıktan sonra → kendi dersleri + bildirimler
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const BS_FirebaseDB = window.DB;
const BS_Notifier = window.StudentNotifier;

const BS_SINIF_COLORS = {
  1: { bg: '#DBEAFE', text: '#1E40AF', label: '1. Sınıf' },
  2: { bg: '#DCFCE7', text: '#166534', label: '2. Sınıf' },
  3: { bg: '#FFEDD5', text: '#9A3412', label: '3. Sınıf' },
  4: { bg: '#FCE7F3', text: '#9D174D', label: '4. Sınıf' },
  5: { bg: '#EDE9FE', text: '#5B21B6', label: 'Seçmeli' },
};

const BS_DONEM_LABEL = { guz: 'Güz', bahar: 'Bahar', yaz: 'Yaz', genel: 'Genel' };

function bsTimeAgo(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso);
    var diff = Date.now() - d.getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Az önce';
    if (mins < 60) return mins + ' dk önce';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + ' saat önce';
    var days = Math.floor(hours / 24);
    if (days < 30) return days + ' gün önce';
    return d.toLocaleDateString('tr-TR');
  } catch (_) {
    return '';
  }
}

// Akademik takvim tarih yardımcıları
function bsFormatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch (_) {
    return iso || '';
  }
}
function bsDaysUntil(iso) {
  try {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / 86400000);
  } catch (_) {
    return null;
  }
}
function bsDaysUntilLabel(days) {
  if (days === null) return '';
  if (days < 0) return 'Geçti';
  if (days === 0) return 'Bugün';
  if (days === 1) return 'Yarın';
  return days + ' gün kaldı';
}

// Sosyal/dış bağlantı normalize
function bsNormalizeUrl(url) {
  var u = (url || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return 'https://' + u;
}

// Date → 'YYYY-MM-DD' (yerel saat dilimi)
function bsToISO(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}
function bsMonthLabel(d) {
  try {
    return d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  } catch (_) {
    return '';
  }
}
// Etkinlik durumunu çöz: { isPast, isSoon, accent }
function bsEventState(ev) {
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var start = new Date(ev.date);
  start.setHours(0, 0, 0, 0);
  var end = ev.endDate ? new Date(ev.endDate) : new Date(ev.date);
  end.setHours(0, 0, 0, 0);
  var isPast = end.getTime() < today.getTime();
  var daysToStart = Math.round((start.getTime() - today.getTime()) / 86400000);
  var isSoon = !isPast && daysToStart <= 15;
  var accent = isPast ? '#9CA3AF' : isSoon ? '#DC2626' : '#16A34A';
  return { isPast: isPast, isSoon: isSoon, accent: accent, daysToStart: daysToStart };
}

function BenimSayfamApp({ currentUser, activeDepartment, departmentInfo }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [studentRecord, setStudentRecord] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [filterSinif, setFilterSinif] = useState('all');
  const [filterDonem, setFilterDonem] = useState('all');
  const [search, setSearch] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [calendar, setCalendar] = useState([]);
  // Aylık takvim görünümü: gösterilen ay (ayın ilk günü, 00:00 yerel)
  const [displayMonth, setDisplayMonth] = useState(() => {
    var d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  // Hover popover: { ev, rect } — etkinlik çubuğunun üzerine gelinince doldurulur
  const [hoverInfo, setHoverInfo] = useState(null);

  const isStudent = currentUser?.role === 'student';
  const studentDeptId = currentUser?.departmentId || activeDepartment;

  const loadData = useCallback(async () => {
    if (!isStudent) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const students = await BS_FirebaseDB.fetchStudents();
      const me = students.find((s) => s.studentNumber === currentUser.studentNumber);
      if (!me) {
        setError('Öğrenci kaydınız bulunamadı. Lütfen yöneticinizle iletişime geçin.');
        setLoading(false);
        return;
      }
      setStudentRecord(me);
      const myIds = Array.isArray(me.myCourseIds) ? me.myCourseIds : [];
      setSelectedIds(myIds);
      // Seçim yalnızca ilk kez yapılır; bir kez kaydedildiyse tekrar düzenlenemez
      setEditMode(myIds.length === 0);

      const allRaw = await window.apiRead('sinav_dersler');
      const all = Array.isArray(allRaw) ? allRaw : [];
      const mine = all.filter((c) => c.departmentId === studentDeptId);
      setAllCourses(mine);

      // Akademik takvim (opsiyonel koleksiyon). Kapsam mantığı:
      //   • Bölüm kapsamı (departmentId)  → yalnızca o bölümün öğrencileri
      //   • Fakülte kapsamı (facultyId)   → yalnızca o fakültenin öğrencileri
      //   • Üniversite geneli (kapsam yok) → tüm öğrenciler
      // Öğrencinin fakültesi bölüm→fakülte haritasından çözülür.
      try {
        const [calRaw, deptsRaw] = await Promise.all([
          window.apiRead('akademik_takvim'),
          window.apiRead('departments'),
        ]);
        const cal = Array.isArray(calRaw) ? calRaw : [];
        const dmap = {};
        (deptsRaw || []).forEach((d) => {
          const id = d.id || d._docId;
          if (id) dmap[id] = d.facultyId || '';
        });
        (window.DEPARTMENTS || []).forEach((d) => {
          if (d.id && dmap[d.id] === undefined) dmap[d.id] = d.facultyId || '';
        });
        const myFacultyId = dmap[studentDeptId] || '';
        const relevant = cal.filter((ev) => {
          if (ev.departmentId) return ev.departmentId === studentDeptId;
          if (ev.facultyId) return !!myFacultyId && ev.facultyId === myFacultyId;
          return true; // üniversite geneli
        });
        setCalendar(relevant);
      } catch (_) {
        setCalendar([]);
      }
    } catch (e) {
      console.error('Benim Sayfam yüklenirken hata:', e);
      setError('Veriler yüklenemedi: ' + (e.message || 'bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.studentNumber, studentDeptId, isStudent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Bildirimleri yükle (yalnızca seçim tamamlanmışsa anlamlı)
  const loadNotifications = useCallback(async () => {
    if (!isStudent || !currentUser?.studentNumber) return;
    setNotifLoading(true);
    try {
      const items = await BS_Notifier.fetchForStudent(currentUser.studentNumber, 30);
      setNotifications(items);
    } catch (e) {
      console.warn('Bildirimler alınamadı:', e);
    } finally {
      setNotifLoading(false);
    }
  }, [isStudent, currentUser?.studentNumber]);

  useEffect(() => {
    if (!editMode && selectedIds.length > 0) loadNotifications();
  }, [editMode, selectedIds.length, loadNotifications]);

  const myCourseDetails = useMemo(() => {
    const map = new Map(allCourses.map((c) => [c.id, c]));
    return selectedIds.map((id) => map.get(id)).filter(Boolean);
  }, [allCourses, selectedIds]);

  // Akademik takvim: tarihe göre sıralı + yaklaşan (bugün ve sonrası) etkinlikler
  const sortedCalendar = useMemo(() => {
    return calendar
      .filter((ev) => ev.date)
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [calendar]);

  const upcomingEvents = useMemo(() => {
    return sortedCalendar.filter((ev) => {
      const days = bsDaysUntil(ev.date);
      return days !== null && days >= 0;
    });
  }, [sortedCalendar]);

  // Yaklaşan tarihler bildirimi: önümüzdeki 15 gün içindeki etkinlikler
  const upcomingSoon = useMemo(() => {
    return upcomingEvents.filter((ev) => {
      const days = bsDaysUntil(ev.date);
      return days !== null && days <= 15;
    });
  }, [upcomingEvents]);

  // Tarih → o güne düşen etkinlik(ler) haritası. Aralıklı etkinlikler her
  // güne yazılır; sıralama tarih başlangıcına göredir.
  const eventsByDate = useMemo(() => {
    const map = new Map();
    calendar.forEach((ev) => {
      if (!ev || !ev.date) return;
      const start = new Date(ev.date);
      if (isNaN(start.getTime())) return;
      const end = ev.endDate ? new Date(ev.endDate) : new Date(ev.date);
      if (isNaN(end.getTime())) return;
      const cur = new Date(start);
      cur.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      while (cur.getTime() <= end.getTime()) {
        const key = bsToISO(cur);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(ev);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [calendar]);

  // Görüntülenen ay için 6 hafta × 7 gün = 42 hücrelik grid (Pzt-Paz).
  const monthCells = useMemo(() => {
    const first = new Date(displayMonth);
    const dow = (first.getDay() + 6) % 7; // 0 = Pzt
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - dow);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [displayMonth]);

  const goPrevMonth = () => {
    const d = new Date(displayMonth);
    d.setMonth(d.getMonth() - 1);
    setDisplayMonth(d);
  };
  const goNextMonth = () => {
    const d = new Date(displayMonth);
    d.setMonth(d.getMonth() + 1);
    setDisplayMonth(d);
  };
  const goToday = () => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    setDisplayMonth(d);
  };

  const filteredCourses = useMemo(() => {
    return allCourses
      .filter((c) => {
        if (filterSinif !== 'all' && String(c.sinif) !== String(filterSinif)) return false;
        if (filterDonem !== 'all' && c.donem !== filterDonem) return false;
        if (search) {
          const q = search.toLowerCase();
          const hay = `${c.code || ''} ${c.name || ''} ${c.professor || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const sa = parseInt(a.sinif) || 99;
        const sb = parseInt(b.sinif) || 99;
        if (sa !== sb) return sa - sb;
        return (a.code || '').localeCompare(b.code || '');
      });
  }, [allCourses, filterSinif, filterDonem, search]);

  const toggleCourse = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (!studentRecord) return;
    if (selectedIds.length === 0) {
      alert('En az bir ders seçmelisiniz.');
      return;
    }
    if (
      !confirm(
        'Seçimleriniz kaydedildikten sonra bir daha değiştirilemez.\n\n' +
          selectedIds.length +
          ' ders seçtiniz. Kaydetmek istediğinize emin misiniz?'
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const updated = Object.assign({}, studentRecord, {
        myCourseIds: selectedIds,
        myCoursesUpdatedAt: new Date().toISOString(),
      });
      await BS_FirebaseDB.updateStudent(studentRecord.id, updated);
      setStudentRecord(updated);
      try {
        const saved = JSON.parse(localStorage.getItem('caku_current_user') || '{}');
        saved.hasSelectedCourses = true;
        localStorage.setItem('caku_current_user', JSON.stringify(saved));
        if (typeof window.__onStudentCoursesSelected === 'function') {
          window.__onStudentCoursesSelected();
        }
      } catch (_) {
        /* ignore */
      }
      setEditMode(false);
    } catch (e) {
      console.error(e);
      alert('Kaydedilemedi: ' + (e.message || 'bilinmeyen hata'));
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser?.studentNumber) return;
    try {
      await BS_Notifier.markAllRead(currentUser.studentNumber);
      setNotifications((prev) => prev.map((n) => Object.assign({}, n, { read: true })));
    } catch (_) {}
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n.read) {
        await BS_Notifier.markRead(n.id);
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? Object.assign({}, x, { read: true }) : x))
        );
      }
    } catch (_) {}
    if (n.link && typeof n.link === 'string') {
      window.location.hash = '#' + n.link.replace(/^#/, '');
    }
  };

  if (!isStudent) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: '#DC2626', fontSize: 22, marginBottom: 8 }}>Erişim Reddedildi</h2>
        <p style={{ color: '#6B7280' }}>Bu sayfa yalnızca öğrenci hesaplarına açıktır.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div
          style={{
            width: 40,
            height: 40,
            margin: '0 auto 16px',
            border: '3px solid #E5E7EB',
            borderTopColor: '#6366F1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#6B7280' }}>Sayfa yükleniyor…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h3 style={{ color: '#DC2626', marginBottom: 8 }}>Hata</h3>
        <p style={{ color: '#6B7280' }}>{error}</p>
      </div>
    );
  }

  const hasSelected =
    Array.isArray(studentRecord?.myCourseIds) && studentRecord.myCourseIds.length > 0;
  const deptName = departmentInfo?.name || studentRecord?.departmentName || '—';
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ══════════════════════════════════════════════════════════════
  // SEÇİM MODU
  // ══════════════════════════════════════════════════════════════
  if (editMode) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", color: '#1F2937' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #1B2A4A 0%, #2D4A7A 100%)',
            padding: '24px 28px',
            borderRadius: 14,
            color: 'white',
            marginBottom: 20,
            boxShadow: '0 6px 20px rgba(27,42,74,0.15)',
          }}
        >
          <div
            style={{
              fontSize: 12,
              opacity: 0.75,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Benim Sayfam · Ders Seçimi
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
            {studentRecord?.firstName} {studentRecord?.lastName}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>
            {studentRecord?.studentNumber} · {deptName}
          </div>
        </div>

        <div
          style={{
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            color: '#92400E',
            padding: '14px 18px',
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          <strong>Ders seçimi yapmanız gerekiyor.</strong> Bölümünüze ait derslerden aldığınız
          dersleri seçip kaydedin. Seçim tamamlanmadan diğer modüllere erişemezsiniz.{' '}
          <strong>Kaydettikten sonra seçimleriniz kilitlenir ve bir daha değiştirilemez.</strong>
        </div>

        <div
          style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="Ders kodu, adı veya akademisyen ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: '1 1 240px',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          />
          <select
            value={filterSinif}
            onChange={(e) => setFilterSinif(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 14,
            }}
          >
            <option value="all">Tüm Sınıflar</option>
            <option value="1">1. Sınıf</option>
            <option value="2">2. Sınıf</option>
            <option value="3">3. Sınıf</option>
            <option value="4">4. Sınıf</option>
            <option value="5">Seçmeli</option>
          </select>
          <select
            value={filterDonem}
            onChange={(e) => setFilterDonem(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 14,
            }}
          >
            <option value="all">Tüm Dönemler</option>
            <option value="guz">Güz</option>
            <option value="bahar">Bahar</option>
            <option value="yaz">Yaz</option>
          </select>
          <div
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              background: '#EEF2FF',
              color: '#4338CA',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Seçili: {selectedIds.length}
          </div>
        </div>

        {allCourses.length === 0 ? (
          <div
            style={{
              background: 'white',
              border: '1px dashed #D1D5DB',
              borderRadius: 12,
              padding: '40px 24px',
              textAlign: 'center',
              color: '#6B7280',
            }}
          >
            <p style={{ fontSize: 15, marginBottom: 4 }}>Bölümünüze tanımlı ders bulunamadı.</p>
            <p style={{ fontSize: 13 }}>
              Akademisyenler ders tanımladıktan sonra bu sayfadan seçim yapabilirsiniz.
            </p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div
            style={{
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              padding: 32,
              textAlign: 'center',
              color: '#6B7280',
            }}
          >
            Filtrelere uyan ders bulunamadı.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}
          >
            {filteredCourses.map((c) => {
              const isSelected = selectedIds.includes(c.id);
              const sinifInfo = BS_SINIF_COLORS[c.sinif] || BS_SINIF_COLORS[5];
              return (
                <div
                  key={c.id}
                  onClick={() => toggleCourse(c.id)}
                  style={{
                    background: isSelected ? '#EEF2FF' : 'white',
                    border: `2px solid ${isSelected ? '#6366F1' : '#E5E7EB'}`,
                    borderRadius: 12,
                    padding: 14,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: sinifInfo.bg,
                        color: sinifInfo.text,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {sinifInfo.label}
                    </div>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        border: `2px solid ${isSelected ? '#6366F1' : '#D1D5DB'}`,
                        background: isSelected ? '#6366F1' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4338CA', marginBottom: 2 }}>
                    {c.code}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#1F2937',
                      marginBottom: 6,
                      lineHeight: 1.3,
                    }}
                  >
                    {c.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    {c.professor || 'Akademisyen belirtilmemiş'}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                    Dönem: {BS_DONEM_LABEL[c.donem] || c.donem || '—'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div
          style={{
            position: 'sticky',
            bottom: 0,
            marginTop: 20,
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 13, color: '#6B7280' }}>
            <strong style={{ color: '#1F2937' }}>{selectedIds.length}</strong> ders seçtiniz
          </div>
          <button
            onClick={handleSave}
            disabled={saving || selectedIds.length === 0}
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              background: saving || selectedIds.length === 0 ? '#9CA3AF' : '#1B2A4A',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              fontSize: 14,
              cursor: saving || selectedIds.length === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet ve Kilitle'}
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // GÖSTERİM MODU (Ders listesi + bildirimler)
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#1F2937' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #1B2A4A 0%, #2D4A7A 100%)',
          padding: '24px 28px',
          borderRadius: 14,
          color: 'white',
          marginBottom: 20,
          boxShadow: '0 6px 20px rgba(27,42,74,0.15)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            opacity: 0.75,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Benim Sayfam
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
          {studentRecord?.firstName} {studentRecord?.lastName}
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>
          {studentRecord?.studentNumber} · {deptName}
        </div>
        <div
          style={{
            marginTop: 12,
            padding: '8px 14px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            fontSize: 12,
            color: 'rgba(255,255,255,0.9)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
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
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          Ders seçiminiz kilitlendi. Değişiklik için bölüm yetkilisi ile iletişime geçin.
        </div>
      </div>

      {/* Bildirimler */}
      <div
        style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: 14,
          padding: 18,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: '#EEF2FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4338CA"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>Bildirimler</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                {unreadCount > 0 ? `${unreadCount} okunmamış` : 'Tüm bildirimler okundu'}
              </div>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                background: 'white',
                border: '1px solid #D1D5DB',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: '#4B5563',
              }}
            >
              Tümünü okundu işaretle
            </button>
          )}
        </div>

        {notifLoading ? (
          <p style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', padding: 16 }}>
            Bildirimler yükleniyor…
          </p>
        ) : notifications.length === 0 ? (
          <p style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', padding: 16 }}>
            Henüz bir bildiriminiz yok.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.slice(0, 10).map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  padding: 12,
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: n.read ? '#F9FAFB' : '#EEF2FF',
                  border: `1px solid ${n.read ? '#E5E7EB' : '#C7D2FE'}`,
                  transition: 'all 0.15s',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: n.type === 'project_group' ? '#DBEAFE' : '#FCE7F3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: n.type === 'project_group' ? '#1E40AF' : '#9D174D',
                  }}
                >
                  {n.type === 'project_group' ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 11l18-8-5 18-3-7-7-3z" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', marginBottom: 2 }}>
                    {n.title || 'Bildirim'}
                  </div>
                  <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.4 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                    {bsTimeAgo(n.createdAt)}
                  </div>
                </div>
                {!n.read && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#6366F1',
                      flexShrink: 0,
                      marginTop: 8,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Akademik Takvim — Aylık Görünüm */}
      <div
        style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: 14,
          padding: 18,
          marginBottom: 20,
        }}
      >
        {/* Başlık + ay navigasyonu */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: '#EEF2FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4338CA"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>Akademik Takvim</div>
              <div style={{ fontSize: 12, color: '#6B7280', textTransform: 'capitalize' }}>
                {bsMonthLabel(displayMonth)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={goPrevMonth}
              aria-label="Önceki ay"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: 'white',
                cursor: 'pointer',
                fontSize: 16,
                color: '#374151',
                fontFamily: 'inherit',
              }}
            >
              ‹
            </button>
            <button
              onClick={goToday}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: 'white',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                color: '#374151',
                fontFamily: 'inherit',
              }}
            >
              Bugün
            </button>
            <button
              onClick={goNextMonth}
              aria-label="Sonraki ay"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: 'white',
                cursor: 'pointer',
                fontSize: 16,
                color: '#374151',
                fontFamily: 'inherit',
              }}
            >
              ›
            </button>
          </div>
        </div>

        {/* Renk göstergeleri */}
        <div
          style={{
            display: 'flex',
            gap: 14,
            marginBottom: 10,
            fontSize: 11,
            color: '#6B7280',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: '#DC2626' }} />
            Yaklaşan (≤15 gün)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: '#16A34A' }} />
            Gelecek etkinlik
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: '#D1D5DB' }} />
            Geçmiş
          </span>
        </div>

        {/* Gün başlıkları */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
            marginBottom: 4,
          }}
        >
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d) => (
            <div
              key={d}
              style={{
                fontSize: 10,
                fontWeight: 700,
                textAlign: 'center',
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '6px 0',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Takvim grid'i */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {monthCells.map((d) => {
            const iso = bsToISO(d);
            const inMonth = d.getMonth() === displayMonth.getMonth();
            const isToday = iso === bsToISO(new Date());
            const evs = eventsByDate.get(iso) || [];
            return (
              <div
                key={iso}
                style={{
                  background: inMonth ? 'white' : '#FAFAFA',
                  border: `1px solid ${isToday ? '#6366F1' : '#E5E7EB'}`,
                  borderRadius: 8,
                  padding: 6,
                  minHeight: 84,
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: inMonth ? 1 : 0.5,
                  boxShadow: isToday ? '0 0 0 2px rgba(99,102,241,0.2)' : 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    color: isToday ? '#4338CA' : '#374151',
                  }}
                >
                  <span>{d.getDate()}</span>
                  {isToday && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: '#4338CA',
                        letterSpacing: '0.04em',
                      }}
                    >
                      BUGÜN
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                  {evs.slice(0, 2).map((ev, i) => {
                    const st = bsEventState(ev);
                    const bg = st.isPast ? '#E5E7EB' : st.isSoon ? '#DC2626' : '#16A34A';
                    const fg = st.isPast ? '#6B7280' : 'white';
                    return (
                      <div
                        key={(ev.id || ev.title) + ':' + i}
                        onMouseEnter={(e) =>
                          setHoverInfo({
                            ev,
                            rect: e.currentTarget.getBoundingClientRect(),
                          })
                        }
                        onMouseLeave={() => setHoverInfo(null)}
                        style={{
                          background: bg,
                          color: fg,
                          fontSize: 9.5,
                          fontWeight: 700,
                          padding: '2px 5px',
                          borderRadius: 3,
                          letterSpacing: '0.02em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    );
                  })}
                  {evs.length > 2 && (
                    <div
                      onMouseEnter={(e) =>
                        setHoverInfo({
                          ev: { __extra: true, items: evs, date: iso },
                          rect: e.currentTarget.getBoundingClientRect(),
                        })
                      }
                      onMouseLeave={() => setHoverInfo(null)}
                      style={{
                        fontSize: 9.5,
                        color: '#6B7280',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      +{evs.length - 2} daha
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover popover — etkinlik çubuğunun üzerine gelince detay büyür */}
      {hoverInfo &&
        (() => {
          const hov = hoverInfo;
          const isExtra = hov.ev && hov.ev.__extra;
          // Popover konumu: çubuğun üstünde, ekran sınırlarını aşmasın
          const W = 320;
          let left = hov.rect.left + hov.rect.width / 2 - W / 2;
          if (typeof window !== 'undefined') {
            left = Math.max(8, Math.min(window.innerWidth - W - 8, left));
          }
          const top = hov.rect.top - 10;
          const accent = isExtra ? '#4338CA' : bsEventState(hov.ev).accent;
          return (
            <div
              style={{
                position: 'fixed',
                top: top,
                left: left,
                transform: 'translateY(-100%)',
                width: W,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
                border: `2px solid ${accent}`,
                padding: 14,
                zIndex: 1000,
                pointerEvents: 'none',
                animation: 'bsPopIn 0.15s ease-out',
              }}
            >
              {isExtra ? (
                <>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: accent,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 8,
                    }}
                  >
                    {hov.ev.items.length} etkinlik · {bsFormatDate(hov.ev.date)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {hov.ev.items.map((ev, i) => {
                      const st = bsEventState(ev);
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'flex-start',
                            fontSize: 12,
                            color: '#1F2937',
                          }}
                        >
                          <span
                            style={{
                              flexShrink: 0,
                              marginTop: 5,
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: st.accent,
                            }}
                          />
                          <span style={{ fontWeight: 600 }}>{ev.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: accent,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: accent,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {bsEventState(hov.ev).isPast
                        ? 'Geçmiş etkinlik'
                        : bsEventState(hov.ev).isSoon
                          ? bsDaysUntilLabel(bsEventState(hov.ev).daysToStart) + ' · YAKLAŞAN'
                          : bsDaysUntilLabel(bsEventState(hov.ev).daysToStart)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#1F2937',
                      marginBottom: 6,
                      lineHeight: 1.3,
                    }}
                  >
                    {hov.ev.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#6B7280',
                      marginBottom: hov.ev.description ? 8 : 0,
                    }}
                  >
                    {bsFormatDate(hov.ev.date)}
                    {hov.ev.endDate && hov.ev.endDate !== hov.ev.date
                      ? ' – ' + bsFormatDate(hov.ev.endDate)
                      : ''}
                  </div>
                  {hov.ev.description && (
                    <div style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.5 }}>
                      {hov.ev.description}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

      <style>{`@keyframes bsPopIn { from { opacity: 0; transform: translateY(-100%) scale(0.96); } to { opacity: 1; transform: translateY(-100%) scale(1); } }`}</style>

      {/* Ders listesi */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>
          Derslerim ({myCourseDetails.length})
        </div>
      </div>
      {myCourseDetails.length === 0 ? (
        <div
          style={{
            background: 'white',
            border: '1px dashed #D1D5DB',
            borderRadius: 12,
            padding: '40px 24px',
            textAlign: 'center',
            color: '#6B7280',
          }}
        >
          Kayıtlı dersiniz bulunmuyor. "Dersleri Düzenle" butonuna tıklayarak dersleri seçin.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {myCourseDetails.map((c) => {
            const sinifInfo = BS_SINIF_COLORS[c.sinif] || BS_SINIF_COLORS[5];
            return (
              <div
                key={c.id}
                style={{
                  background: 'white',
                  border: '1px solid #E5E7EB',
                  borderLeft: '4px solid #6366F1',
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: sinifInfo.bg,
                    color: sinifInfo.text,
                    fontSize: 11,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  {sinifInfo.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#4338CA', marginBottom: 2 }}>
                  {c.code}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#1F2937',
                    marginBottom: 8,
                    lineHeight: 1.3,
                  }}
                >
                  {c.name}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6B7280' }}>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    {c.professor || 'Öğretim üyesi belirtilmemiş'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6B7280' }}>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                    {c.akts || c.kredi ? `${c.akts || c.kredi} AKTS / Kredi` : 'AKTS belirtilmemiş'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9CA3AF' }}>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Dönem: {BS_DONEM_LABEL[c.donem] || c.donem || '—'}
                  </div>
                </div>

                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
                  {c.bolognaLink ? (
                    <a
                      href={bsNormalizeUrl(c.bolognaLink)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#4338CA',
                        textDecoration: 'none',
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                      </svg>
                      Ders Bologna Sayfası
                    </a>
                  ) : (
                    <span style={{ fontSize: 11, color: '#D1D5DB' }}>
                      Bologna linki tanımlı değil
                    </span>
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

window.BenimSayfamApp = BenimSayfamApp;
