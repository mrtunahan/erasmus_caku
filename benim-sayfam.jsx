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
function bsMonthShort(d) {
  // Türkçe kısa ay (Oca, Şub, Mar, ...) — TR locale veriyor, baş harf büyük
  try {
    var s = d.toLocaleDateString('tr-TR', { month: 'short' }).replace(/\./g, '');
    return s.charAt(0).toLocaleUpperCase('tr') + s.slice(1).toLocaleLowerCase('tr');
  } catch (_) {
    return '';
  }
}
// Mini takvim için: 6×7 hücre, ay başlangıç ve bitişi
function bsMiniMonth(d) {
  var first = new Date(d.getFullYear(), d.getMonth(), 1);
  var dow = (first.getDay() + 6) % 7;
  var start = new Date(first);
  start.setDate(first.getDate() - dow);
  var cells = [];
  for (var i = 0; i < 42; i++) {
    var x = new Date(start);
    x.setDate(start.getDate() + i);
    cells.push(x);
  }
  return cells;
}
// Bir hücrenin (gün) renk önceliği: 'soon' | 'future' | 'past' | null
function bsCellPriority(events) {
  var hasSoon = false,
    hasFuture = false,
    hasPast = false;
  for (var i = 0; i < events.length; i++) {
    var st = bsEventState(events[i]);
    if (st.isSoon) hasSoon = true;
    else if (!st.isPast) hasFuture = true;
    else hasPast = true;
  }
  if (hasSoon) return 'soon';
  if (hasFuture) return 'future';
  if (hasPast) return 'past';
  return null;
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

// ── Dönem (akademik yarıyıl) yardımcıları ──
// Öğrencinin aldığı dersler HER DÖNEM değişir; seçim artık (öğrenci, dönem)
// bazında student_courses koleksiyonunda saklanır. Bulunulan dönem tarihe
// göre türetilir (TR akademik takvimi: Güz Eylül–Ocak, Bahar Şubat–Ağustos).
function bsCurrentTerm() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  let donem, startYear;
  if (m >= 9) {
    donem = 'guz';
    startYear = y;
  } else if (m === 1) {
    donem = 'guz';
    startYear = y - 1;
  } else {
    donem = 'bahar';
    startYear = y - 1;
  }
  return { donem, academicYear: startYear + '-' + (startYear + 1) };
}
const bsTermKey = (academicYear, donem) => academicYear + '_' + donem;
const bsTermLabel = (academicYear, donem) =>
  academicYear + ' ' + (donem === 'guz' ? 'Güz' : 'Bahar');
// Seçilebilir dönemler: önceki akademik yıldan 2030-2031'e kadar Güz+Bahar.
function bsTermOptions() {
  const c = bsCurrentTerm();
  const startY = parseInt(c.academicYear.split('-')[0], 10);
  const opts = [];
  for (let y = Math.min(startY - 1, 2024); y <= 2030; y++) {
    opts.push({ academicYear: y + '-' + (y + 1), donem: 'guz' });
    opts.push({ academicYear: y + '-' + (y + 1), donem: 'bahar' });
  }
  return opts;
}
// Yaz dönemi hariç normal yarıyıl AKTS tavanı (öğrenci farklı fakülte/bölüm
// derslerini de sayabilir; toplam bu tavanı aşamaz).
const BS_AKTS_CAP = 42;

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
  // Aktif dönem (yarıyıl) — seçim bu döneme göre yüklenir/kaydedilir
  const [term, setTerm] = useState(() => bsCurrentTerm());
  const termKey = bsTermKey(term.academicYear, term.donem);
  // Cross-faculty: bölüm id → ad haritası + bölüm filtresi
  const [deptNameMap, setDeptNameMap] = useState({});
  const [filterDept, setFilterDept] = useState('all');
  // Danışman: yalnız öğrencinin KENDİ bölümündeki akademisyenler
  const [advisorOptions, setAdvisorOptions] = useState([]);
  const [advisor, setAdvisor] = useState('');
  // Bu dönemin seçimi kilitli mi (kaydedildikten sonra kilitlenir)
  const [locked, setLocked] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [calendar, setCalendar] = useState([]);
  // Bölüm yetkilisinin tanımladığı Hızlı Bağlantılar + Kampüs Haritası
  const [pageSettings, setPageSettings] = useState({ quickLinks: [], campusMapUrl: '' });
  // Öğrencinin takip ettiği topluluklar (profil kartında gösterilir)
  const [followedClubs, setFollowedClubs] = useState([]);
  // Danışman iletişim bilgisi için bölüm akademisyenleri
  const [professors, setProfessors] = useState([]);
  // Aylık takvim görünümü: gösterilen ay (ayın ilk günü, 00:00 yerel)
  const [displayMonth, setDisplayMonth] = useState(() => {
    var d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  // Hover popover: { ev, rect } — etkinlik çubuğunun üzerine gelinince doldurulur
  const [hoverInfo, setHoverInfo] = useState(null);
  // Takvim için responsive: geniş ekranda 2 sütun (sol panel + grid), dar ekranda tek sütun
  const _bsResp = window.useResponsive ? window.useResponsive() : { width: 1200 };
  const bsCalLayout = { isWide: _bsResp.width > 880 };

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

      // Öğrenci farklı fakülte/bölüm derslerini de alabilir → TÜM bölümlerin
      // (lisans) dersleri yüklenir; her ders bölüm/fakülte etiketiyle gösterilir.
      const allRaw = await window.apiRead('sinav_dersler');
      const all = (Array.isArray(allRaw) ? allRaw : []).filter(
        (c) => (c.seviye || 'lisans') === 'lisans'
      );
      setAllCourses(all);

      // Bölüm id → ad haritası (tüm varyantlar) — ders kartlarında bölüm adı
      const dnm = {};
      try {
        const depts = await window.apiRead('departments');
        (depts || []).forEach((d) => {
          const nm = d.name;
          if (!nm) return;
          [d.id, d._id, d._docId, d.code].forEach((k) => {
            if (k) dnm[String(k)] = nm;
          });
        });
      } catch (_) {
        /* yok say */
      }
      (window.DEPARTMENTS || []).forEach((d) => {
        if (d.id && !dnm[d.id]) dnm[d.id] = d.name || d.id;
      });
      setDeptNameMap(dnm);

      // Danışman seçenekleri: yalnız öğrencinin KENDİ bölümündeki akademisyenler
      try {
        let variants = [studentDeptId];
        if (window.deptIdVariants) {
          try {
            variants = await window.deptIdVariants(studentDeptId);
          } catch (_) {
            variants = [studentDeptId];
          }
        }
        const vset = new Set((variants || [studentDeptId]).map(String));
        const profs = await window.apiRead('professors');
        const myProfs = (profs || []).filter((p) => {
          if (p.departmentId && vset.has(String(p.departmentId))) return true;
          const extras = Array.isArray(p.additionalDepartments) ? p.additionalDepartments : [];
          return extras.some((x) => vset.has(String(x)));
        });
        setProfessors(myProfs);
        const seenN = {};
        const opts = [];
        myProfs.forEach((p) => {
          const nm = (p.name || '').trim();
          if (nm && !seenN[nm]) {
            seenN[nm] = true;
            opts.push(nm);
          }
        });
        opts.sort((a, b) => a.localeCompare(b, 'tr'));
        setAdvisorOptions(opts);
      } catch (_) {
        setAdvisorOptions([]);
      }

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

  // Dönem bazlı seçim yükle: student_courses/{ogrNo__donem}. Bu döneme ait
  // kayıt yoksa (ilk kez) boş başlar; eski tek-liste (students.myCourseIds)
  // varsa başlangıç önerisi olarak yalnız İLK açılan dönemde tohumlanır.
  useEffect(() => {
    if (!isStudent || !currentUser?.studentNumber) return;
    let cancelled = false;
    (async () => {
      let ids = [];
      let found = false;
      let adv = '';
      let lock = false;
      try {
        const res = await window.apiReadDoc(
          'student_courses',
          currentUser.studentNumber + '__' + termKey
        );
        if (res && res.exists && res.data) {
          if (Array.isArray(res.data.courseIds)) ids = res.data.courseIds;
          adv = res.data.advisor || '';
          lock = res.data.locked === true;
          found = true;
        }
      } catch (_) {
        /* yok say */
      }
      // Eski kalıcı seçim (students.myCourseIds) → yalnız bu dönemde henüz
      // kayıt yoksa ve dönem bulunulan dönemse başlangıç olarak öner.
      if (
        !found &&
        studentRecord &&
        Array.isArray(studentRecord.myCourseIds) &&
        studentRecord.myCourseIds.length &&
        termKey === bsTermKey(bsCurrentTerm().academicYear, bsCurrentTerm().donem)
      ) {
        ids = studentRecord.myCourseIds.slice();
      }
      if (!cancelled) {
        setSelectedIds(ids);
        setAdvisor(adv);
        setLocked(lock);
        // Kilitliyse veya kayıt varsa düzenleme kapalı; ilk kez ise açık
        setEditMode(!found && ids.length === 0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isStudent, currentUser?.studentNumber, termKey, studentRecord]);

  // Bölüm ayarları (Hızlı Bağlantılar + Kampüs Haritası) ve takip edilen topluluklar
  useEffect(() => {
    if (!isStudent) return undefined;
    let alive = true;
    (async () => {
      // benim_ayarlar/{deptId} — bölüm id varyantlarını sırayla dene
      let variants = [studentDeptId];
      if (window.deptIdVariants) {
        try {
          variants = await window.deptIdVariants(studentDeptId);
        } catch (_) {
          variants = [studentDeptId];
        }
      }
      for (const v of variants || [studentDeptId]) {
        try {
          // apiReadDoc { exists, data, id } döner — asıl kayıt data içinde.
          const res = await window.apiReadDoc('benim_ayarlar', String(v));
          const doc = res && res.exists ? res.data : res && res.data ? res.data : null;
          if (doc && (Array.isArray(doc.quickLinks) || doc.campusMapUrl)) {
            if (alive)
              setPageSettings({
                quickLinks: Array.isArray(doc.quickLinks) ? doc.quickLinks : [],
                campusMapUrl: doc.campusMapUrl || '',
              });
            break;
          }
        } catch (_) {
          /* bu varyant yok, sonrakine geç */
        }
      }
      // Takip edilen topluluklar
      try {
        const follows = await window.apiRead('club_followers', {
          where: 'studentNumber:eq:s:' + currentUser.studentNumber,
        });
        const clubIds = new Set((follows || []).map((f) => String(f.clubId)));
        if (clubIds.size) {
          const clubs = await window.apiRead('student_clubs');
          const mine = (clubs || []).filter((c) => clubIds.has(String(c.id)));
          if (alive) setFollowedClubs(mine);
        } else if (alive) {
          setFollowedClubs([]);
        }
      } catch (_) {
        if (alive) setFollowedClubs([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isStudent, studentDeptId, currentUser?.studentNumber]);

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

  // Seçilen derslerin toplam AKTS'si (42 tavanı) — akts/kredi alanından
  const totalAkts = useMemo(
    () => myCourseDetails.reduce((t, c) => t + (parseInt(c.akts ?? c.kredi, 10) || 0), 0),
    [myCourseDetails]
  );
  const aktsCapExceeded = totalAkts > BS_AKTS_CAP;

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
        // Yalnız seçili DÖNEMİN dersleri (Güz döneminde Güz dersleri).
        // 'genel'/boş dönemli dersler her yarıyılda seçilebilir.
        const cd = c.donem || 'genel';
        if (cd !== term.donem && cd !== 'genel') return false;
        if (filterDept !== 'all' && String(c.departmentId) !== String(filterDept)) return false;
        if (filterSinif !== 'all' && String(c.sinif) !== String(filterSinif)) return false;
        if (filterDonem !== 'all' && c.donem !== filterDonem) return false;
        if (search) {
          const q = search.toLowerCase();
          const dep = (deptNameMap[String(c.departmentId)] || '').toLowerCase();
          const hay = `${c.code || ''} ${c.name || ''} ${c.professor || ''} ${dep}`.toLowerCase();
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
  }, [allCourses, filterSinif, filterDonem, filterDept, search, term.donem, deptNameMap]);

  // Ders listesinde geçen bölümler (cross-faculty filtre dropdown'ı için)
  const courseDeptOptions = useMemo(() => {
    const seen = {};
    const list = [];
    allCourses.forEach((c) => {
      const id = String(c.departmentId || '');
      if (id && !seen[id]) {
        seen[id] = true;
        list.push({ id, name: deptNameMap[id] || id });
      }
    });
    list.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    return list;
  }, [allCourses, deptNameMap]);

  const toggleCourse = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (!currentUser?.studentNumber) return;
    if (selectedIds.length === 0) {
      alert('En az bir ders seçmelisiniz.');
      return;
    }
    if (aktsCapExceeded) {
      alert(
        'Toplam ' +
          BS_AKTS_CAP +
          ' AKTS aşılamaz. Seçtiğiniz derslerin toplamı: ' +
          totalAkts +
          ' AKTS. Lütfen ders çıkarın.'
      );
      return;
    }
    if (!advisor) {
      alert('Danışman seçimi zorunludur. Kendi bölümünüzdeki bir akademisyeni seçin.');
      return;
    }
    if (
      !confirm(
        'Kaydettikten sonra ders seçim ekranınız KİLİTLENİR. Değişiklik için bölüm ' +
          'yetkilinizle iletişime geçmeniz gerekir.\n\n' +
          selectedIds.length +
          ' ders · ' +
          totalAkts +
          ' AKTS · Danışman: ' +
          advisor +
          '\n\nKaydetmek istiyor musunuz?'
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      // Seçim DÖNEM bazlı student_courses koleksiyonuna yazılır. Kaydedince
      // KİLİTLENİR (locked:true); açmak için bölüm yetkilisi gerekir.
      const docId = currentUser.studentNumber + '__' + termKey;
      await window.DBWrite.set(
        'student_courses',
        docId,
        {
          studentNumber: currentUser.studentNumber,
          termKey,
          academicYear: term.academicYear,
          donem: term.donem,
          departmentId: studentDeptId,
          courseIds: selectedIds,
          advisor,
          totalAkts,
          locked: true,
          updatedAt: new Date().toISOString(),
        },
        true
      );
      setLocked(true);
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
          <strong>{bsTermLabel(term.academicYear, term.donem)} dönemi ders seçimi.</strong> Bu
          yarıyılda aldığınız dersleri seçip kaydedin. Her dönem ayrı seçim yaparsınız; seçiminizi
          istediğinizde güncelleyebilirsiniz.
        </div>

        {/* Dönem seçici */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Dönem:</span>
          <select
            value={termKey}
            onChange={(e) => {
              const o = bsTermOptions().find(
                (x) => bsTermKey(x.academicYear, x.donem) === e.target.value
              );
              if (o) setTerm({ academicYear: o.academicYear, donem: o.donem });
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 13,
              background: 'white',
              cursor: 'pointer',
            }}
          >
            {bsTermOptions().map((o) => {
              const k = bsTermKey(o.academicYear, o.donem);
              return (
                <option key={k} value={k}>
                  {bsTermLabel(o.academicYear, o.donem)}
                </option>
              );
            })}
          </select>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginLeft: 8 }}>
            Danışman:
          </span>
          <select
            value={advisor}
            onChange={(e) => setAdvisor(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid ' + (advisor ? '#D1D5DB' : '#FCA5A5'),
              fontSize: 13,
              background: 'white',
              cursor: 'pointer',
              minWidth: 220,
            }}
          >
            <option value="">Danışman seçin (zorunlu)</option>
            {advisorOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {advisorOptions.length === 0 && (
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>
              Bölümünüzde tanımlı akademisyen bulunamadı.
            </span>
          )}
          {/* AKTS tavanı göstergesi (42) */}
          <span
            style={{
              marginLeft: 'auto',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              background: aktsCapExceeded ? '#FEE2E2' : '#EFF6FF',
              color: aktsCapExceeded ? '#B91C1C' : '#1B2A4A',
              border: '1px solid ' + (aktsCapExceeded ? '#FCA5A5' : '#BFDBFE'),
            }}
          >
            {totalAkts} / {BS_AKTS_CAP} AKTS{aktsCapExceeded ? ' — tavan aşıldı' : ''}
          </span>
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
            placeholder="Ders kodu, adı, akademisyen veya bölüm ara…"
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
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 14,
              maxWidth: 260,
            }}
            title="Farklı fakülte/bölüm derslerini görmek için bölüm seçin"
          >
            <option value="all">Tüm Bölümler</option>
            {courseDeptOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
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
                    {(deptNameMap[String(c.departmentId)] || '—') +
                      ' · ' +
                      (c.akts || c.kredi ? (c.akts || c.kredi) + ' AKTS' : 'AKTS —') +
                      ' · ' +
                      (BS_DONEM_LABEL[c.donem] || c.donem || '—')}
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
            <strong style={{ color: '#1F2937' }}>{selectedIds.length}</strong> ders ·{' '}
            <strong style={{ color: aktsCapExceeded ? '#B91C1C' : '#1F2937' }}>{totalAkts}</strong>{' '}
            AKTS
            {!advisor ? ' · danışman seçilmedi' : ''}
          </div>
          {(() => {
            const disabled = saving || selectedIds.length === 0 || aktsCapExceeded || !advisor;
            return (
              <button
                onClick={handleSave}
                disabled={disabled}
                style={{
                  padding: '10px 22px',
                  borderRadius: 8,
                  background: disabled ? '#9CA3AF' : '#1B2A4A',
                  color: 'white',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {saving ? 'Kaydediliyor…' : 'Seçimi Kaydet ve Kilitle'}
              </button>
            );
          })()}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // GÖSTERİM MODU (Ders listesi + bildirimler)
  // ══════════════════════════════════════════════════════════════
  const cardBox = {
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 18,
    boxShadow: '0 1px 3px rgba(16,24,40,0.06)',
  };
  const M3navy = '#1B2A4A';
  const M3green = '#059669';
  const sectionTitle = {
    margin: '0 0 14px',
    fontSize: 16,
    fontWeight: 700,
    color: M3navy,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };
  const advisorProf = professors.find((p) => (p.name || '').trim() === (advisor || '').trim());
  const _today = new Date();
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const dayEvents = (cell) => {
    const c = new Date(cell);
    c.setHours(0, 0, 0, 0);
    return (calendar || []).filter((ev) => {
      if (!ev.date) return false;
      const s = new Date(ev.date);
      s.setHours(0, 0, 0, 0);
      const e = ev.endDate ? new Date(ev.endDate) : new Date(ev.date);
      e.setHours(0, 0, 0, 0);
      return c >= s && c <= e;
    });
  };
  const weekdays = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'];
  const initials = (
    (studentRecord?.firstName || '').charAt(0) + (studentRecord?.lastName || '').charAt(0)
  )
    .toLocaleUpperCase('tr')
    .trim();

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#191C1E' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: bsCalLayout.isWide ? '300px minmax(0, 1fr) 300px' : '1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* ══ SOL SÜTUN: Profil · Danışman · Bağlantılar · Topluluklar ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {/* Profil Kartı */}
          <div style={cardBox}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: '#DCE1FF',
                  padding: 4,
                  marginBottom: 10,
                }}
              >
                {studentRecord?.photoURL ? (
                  <img
                    src={studentRecord.photoURL}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      background: M3navy,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 26,
                      fontWeight: 700,
                    }}
                  >
                    {initials || '?'}
                  </div>
                )}
              </div>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: M3navy }}>
                {studentRecord?.firstName} {studentRecord?.lastName}
              </h2>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#6B7280',
                  letterSpacing: '0.06em',
                }}
              >
                {studentRecord?.studentNumber}
              </p>
            </div>
            <div
              style={{
                borderTop: '1px solid #E5E7EB',
                paddingTop: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, color: '#757682' }}>Bölüm</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#191C1E' }}>{deptName}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, color: '#757682' }}>Akademik Dönem</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#191C1E' }}>
                  {bsTermLabel(term.academicYear, term.donem)}
                </span>
              </div>
            </div>
          </div>

          {/* Danışman Bilgileri */}
          <div style={cardBox}>
            <h3 style={sectionTitle}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={M3green}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
              Danışman Bilgileri
            </h3>
            {advisor ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {advisorProf?.photoURL && (
                    <img
                      src={advisorProf.photoURL}
                      alt=""
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        flexShrink: 0,
                        border: '1px solid #E5E7EB',
                      }}
                    />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: 12, color: '#757682' }}>Danışman</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#191C1E' }}>
                      {advisor}
                    </span>
                  </div>
                </div>
                {advisorProf?.dahili && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#6B7280"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.81.36 1.6.7 2.34a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.74-1.74a2 2 0 012.11-.45c.74.34 1.53.57 2.34.7A2 2 0 0122 16.92z" />
                    </svg>
                    <span style={{ fontSize: 13.5, color: '#191C1E' }}>
                      Dahili: {advisorProf.dahili}
                    </span>
                  </div>
                )}
                {advisorProf?.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#6B7280"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" />
                    </svg>
                    <a
                      href={'mailto:' + advisorProf.email}
                      style={{ fontSize: 13.5, color: M3green, textDecoration: 'none' }}
                    >
                      {advisorProf.email}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
                Danışman seçilmedi. "Dersleri Düzenle" ile kendi bölümünüzden bir danışman
                seçebilirsiniz.
              </p>
            )}
          </div>

          {/* Hızlı Bağlantılar */}
          {pageSettings.quickLinks.length > 0 && (
            <div style={cardBox}>
              <h3 style={sectionTitle}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={M3green}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
                Hızlı Bağlantılar
              </h3>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {pageSettings.quickLinks.map((l, i) => (
                  <a
                    key={i}
                    href={/^https?:\/\//i.test(l.url) ? l.url : 'https://' + l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 10px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: '#1F2937',
                      fontSize: 13.5,
                      fontWeight: 500,
                      transition: 'background 0.15s',
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#6B7280"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                    </svg>
                    {l.label}
                  </a>
                ))}
              </nav>
            </div>
          )}

          {/* Takip Ettiğim Topluluklar */}
          {followedClubs.length > 0 && (
            <div style={cardBox}>
              <h3 style={sectionTitle}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={M3green}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
                Takip Ettiğim Topluluklar
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {followedClubs.map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: c.logoURL ? '#fff' : M3navy,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        overflow: 'hidden',
                        border: '1px solid #E5E7EB',
                      }}
                    >
                      {c.logoURL ? (
                        <img
                          src={c.logoURL}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        (c.name || '?').trim().charAt(0).toLocaleUpperCase('tr')
                      )}
                    </div>
                    <span style={{ fontSize: 13, color: '#1F2937', fontWeight: 500 }}>
                      {c.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══ MERKEZ: Takvim · Kampüs Haritası · Derslerim ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
          {/* Akademik Takvim */}
          <div style={cardBox}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <h3 style={{ ...sectionTitle, margin: 0 }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={M3green}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Akademik Takvim
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={goPrevMonth}
                  aria-label="Önceki ay"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    border: '1px solid #E5E7EB',
                    background: '#fff',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#444651"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#191C1E',
                    minWidth: 108,
                    textAlign: 'center',
                  }}
                >
                  {bsMonthLabel(displayMonth)}
                </span>
                <button
                  onClick={goNextMonth}
                  aria-label="Sonraki ay"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    border: '1px solid #E5E7EB',
                    background: '#fff',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#444651"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                <button
                  onClick={goToday}
                  style={{
                    marginLeft: 4,
                    background: M3green,
                    color: '#fff',
                    border: 'none',
                    padding: '5px 12px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Bugün
                </button>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 4,
                textAlign: 'center',
                borderTop: '1px solid #E5E7EB',
                paddingTop: 12,
              }}
            >
              {weekdays.map((w, i) => (
                <div
                  key={w}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: i >= 5 ? '#DC2626' : '#757682',
                    padding: '4px 0',
                  }}
                >
                  {w}
                </div>
              ))}
              {monthCells.map((cell, i) => {
                const inMonth = cell.getMonth() === displayMonth.getMonth();
                const isToday = isSameDay(cell, _today);
                const evs = dayEvents(cell);
                const hasEv = evs.length > 0;
                const accent = hasEv ? bsEventState(evs[0]).accent : null;
                const isWeekendCol = i % 7 >= 5;
                return (
                  <div
                    key={i}
                    title={
                      hasEv
                        ? evs.map((e) => e.title || e.baslik || 'Etkinlik').join(', ')
                        : undefined
                    }
                    style={{
                      position: 'relative',
                      padding: '8px 0',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: isToday ? 700 : 400,
                      cursor: hasEv ? 'default' : 'default',
                      opacity: inMonth ? 1 : 0.25,
                      color: isToday ? M3navy : isWeekendCol && inMonth ? '#DC2626' : '#191C1E',
                      background: isToday ? '#DCE1FF' : 'transparent',
                      border: isToday ? '2px solid ' + M3navy : '2px solid transparent',
                    }}
                  >
                    {cell.getDate()}
                    {hasEv && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: accent,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kampüs Haritası */}
          {pageSettings.campusMapUrl && (
            <div style={cardBox}>
              <h3 style={sectionTitle}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={M3green}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16" />
                </svg>
                Kampüs Haritası
              </h3>
              <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                <img
                  src={pageSettings.campusMapUrl}
                  alt="Kampüs Haritası"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            </div>
          )}

          {/* Derslerim */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: M3navy }}>
                  Derslerim
                </h3>
                <select
                  value={termKey}
                  onChange={(e) => {
                    const o = bsTermOptions().find(
                      (x) => bsTermKey(x.academicYear, x.donem) === e.target.value
                    );
                    if (o) setTerm({ academicYear: o.academicYear, donem: o.donem });
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #757682',
                    fontSize: 13,
                    background: '#fff',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {bsTermOptions().map((o) => {
                    const k = bsTermKey(o.academicYear, o.donem);
                    return (
                      <option key={k} value={k}>
                        {bsTermLabel(o.academicYear, o.donem)}
                      </option>
                    );
                  })}
                </select>
              </div>
              <button
                onClick={() => setEditMode(true)}
                style={{
                  background: '#fff',
                  border: '1px solid ' + M3navy,
                  color: M3navy,
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={M3navy}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                Dersleri Düzenle
              </button>
            </div>

            {locked && (
              <div
                style={{
                  marginBottom: 14,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  fontSize: 12.5,
                  color: '#1E3A8A',
                }}
              >
                Ders seçiminiz kilitli. Değişiklik için bölüm yetkilinizle iletişime geçin.
              </div>
            )}

            {myCourseDetails.length === 0 ? (
              <div
                style={{
                  ...cardBox,
                  textAlign: 'center',
                  color: '#9CA3AF',
                  fontSize: 13.5,
                }}
              >
                Kayıtlı dersiniz bulunmuyor. "Dersleri Düzenle" butonuna tıklayarak dersleri seçin.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: bsCalLayout.isWide ? '1fr 1fr' : '1fr',
                  gap: 14,
                }}
              >
                {myCourseDetails.map((c) => (
                  <div
                    key={c.id || c.code}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = M3navy)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E5E7EB')}
                    style={{
                      background: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: 12,
                      padding: 16,
                      transition: 'border-color 0.15s',
                      boxShadow: '0 1px 3px rgba(16,24,40,0.05)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: M3navy,
                        marginBottom: 8,
                        lineHeight: 1.35,
                      }}
                    >
                      {c.code} {c.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: '#444651',
                        marginBottom: 10,
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#757682"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
                      </svg>
                      <span style={{ fontSize: 12.5 }}>
                        {c.professor || 'Öğretim üyesi belirtilmemiş'}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 10,
                        borderTop: '1px solid #F0EDE6',
                      }}
                    >
                      <span style={{ fontSize: 12, color: '#757682' }}>
                        AKTS: {c.akts || c.kredi || '—'}
                      </span>
                      {c.bolognaLink ? (
                        <a
                          href={bsNormalizeUrl(c.bolognaLink)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            color: M3green,
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={M3green}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                          </svg>
                          Bologna linki
                        </a>
                      ) : (
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>Bologna linki yok</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══ SAĞ SÜTUN: Yaklaşan Etkinlikler ══ */}
        {bsCalLayout.isWide && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <div style={cardBox}>
              <h3 style={sectionTitle}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={M3green}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 11a9 9 0 019 9M4 4a16 16 0 0116 16M5 19a1 1 0 100-2 1 1 0 000 2z" />
                </svg>
                Yaklaşan Etkinlikler
              </h3>
              {upcomingEvents.length === 0 ? (
                <p style={{ fontSize: 12.5, color: '#9CA3AF', margin: 0 }}>
                  Yaklaşan etkinlik yok.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {upcomingEvents.slice(0, 6).map((ev, i) => {
                    const st = bsEventState(ev);
                    const d = new Date(ev.date);
                    return (
                      <div
                        key={i}
                        style={{
                          borderBottom:
                            i < Math.min(upcomingEvents.length, 6) - 1
                              ? '1px solid #F0EDE6'
                              : 'none',
                          paddingBottom: 10,
                        }}
                      >
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: st.accent,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: 11.5, color: '#757682', fontWeight: 600 }}>
                            {d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                            {st.isSoon ? ' · yaklaşıyor' : ''}
                          </span>
                        </div>
                        <div
                          style={{ fontSize: 13, fontWeight: 600, color: M3navy, lineHeight: 1.4 }}
                        >
                          {ev.title || ev.baslik || 'Etkinlik'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.BenimSayfamApp = BenimSayfamApp;
