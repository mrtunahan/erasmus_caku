// ══════════════════════════════════════════════════════════════
// ÇAKÜ Mühendislik Fakültesi - Ana Kabuk (App Shell)
// Fakülte bazlı navigasyon, bölüm seçimi ve kimlik doğrulama
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useCallback, useRef, useMemo } = React;

// ── Shared bileşenlerden import (window üzerinden) ──
const C = window.C;
const sharedStyles = window.sharedStyles;
const LoginModal = window.LoginModal;
const ChangePasswordModal = window.ChangePasswordModal;
const FACULTY = window.FACULTY;
const DEPARTMENTS = window.DEPARTMENTS;
const DEPARTMENT_MODULES = window.DEPARTMENT_MODULES;
const COMMON_MODULES = window.COMMON_MODULES;
const ADMIN_MODULES = window.ADMIN_MODULES;
const HIERARCHY_MODULES = window.HIERARCHY_MODULES || [];

// Tüm roller için oturum boşta-kalma (idle) süresi: 10 dk işlemsizlik sonrası
// otomatik çıkış → yeniden giriş gerekir.
const IDLE_LIMIT_MS = 10 * 60 * 1000;
const IDLE_ACTIVITY_KEY = 'caku_last_activity';

// Sidebar/RightSidebar/route-guard için ortak: kullanıcının erişebileceği
// bölümler. Kurallar:
//   • Öğrenci → yalnız kendi bölümü
//   • Ergün ÇINAR (fakülte staj koordinatörü) → tüm bölümler
//   • Üniversite yetkilisi → adminScope'a göre tüm fakülteler veya kendi fakültesi
//   • Fakülte yetkilisi → kendi fakültesi + ek bölümler (additionalDepartments)
//   • Bölüm yetkilisi / akademisyen → ana bölüm + ek bölümler
function computeAvailableDepts(currentUser, adminScope) {
  const allDepts = window.DEPARTMENTS || DEPARTMENTS || [];
  if (!currentUser) return allDepts;

  const isAdmin = currentUser.role === 'admin';
  const isDeptManager = currentUser.role === 'bolum_yetkilisi' || !!currentUser.isDeptManager;
  const isProfessor = currentUser.role === 'professor';
  const isStudent = currentUser.role === 'student' || (!isAdmin && !isDeptManager && !isProfessor);
  const isUniAdmin = !!currentUser.isUniversityAdmin;
  const isFacMgr = !!currentUser.isFacultyManager;
  const isErgun = isErgunCinarUser(currentUser);
  const extras = Array.isArray(currentUser.additionalDepartments)
    ? currentUser.additionalDepartments
    : [];
  const mainDept = currentUser.departmentId;
  const myFaculty = currentUser.facultyId;

  // Ergün ÇINAR — tüm bölümler (fakülte geneli staj erişimi)
  if (isErgun) return allDepts;

  // Memur (staj dışı) — kendi fakültesinin bölümleri. Staj memuru zaten
  // yukarıda isErgun (isStajCoordinator) dalından tüm bölümleri aldı.
  const isMemur = currentUser.role === 'memur' || !!currentUser.isMemur;
  if (isMemur) {
    if (myFaculty) return allDepts.filter((d) => (d.facultyId || '') === myFaculty);
    return allDepts;
  }

  // Öğrenci — yalnız kendi bölümü
  if (isStudent) {
    return allDepts.filter((d) => d.id === mainDept);
  }

  // Bölüm listesi birleştirici (id'ye göre tekilleştir)
  const merge = (...lists) => {
    const seen = new Set();
    const out = [];
    lists.forEach((list) =>
      (list || []).forEach((d) => {
        if (d && !seen.has(d.id)) {
          seen.add(d.id);
          out.push(d);
        }
      })
    );
    return out;
  };
  const extraDepts = allDepts.filter((d) => extras.includes(d.id));

  // Üniversite yetkilisi
  if (isUniAdmin) {
    const scope = adminScope || 'university';
    if (scope === 'faculty' && myFaculty) {
      const facDepts = allDepts.filter((d) => (d.facultyId || '') === myFaculty);
      return merge(facDepts, extraDepts);
    }
    return allDepts;
  }

  // Fakülte yetkilisi (üni admin değil)
  if (isFacMgr && myFaculty) {
    const facDepts = allDepts.filter((d) => (d.facultyId || '') === myFaculty);
    return merge(facDepts, extraDepts);
  }

  // Bölüm yetkilisi veya akademisyen — ana bölüm + ek bölümler
  const mainList = mainDept ? allDepts.filter((d) => d.id === mainDept) : [];
  return merge(mainList, extraDepts);
}

// Fakülte staj yetkilisi (SGK onayı + fakülte geneli staj erişimi) tespiti.
// Yeni: isStajCoordinator bayrağı (Fakülte Yönetimi'nden atanır).
// Geriye dönük: "Ergün ÇINAR" ismi de tanınır (eski hardcoded kullanıcı).
const isErgunCinarUser = (currentUser) => {
  if (!currentUser) return false;
  if (currentUser.isStajCoordinator) return true;
  const n = currentUser.name || currentUser.identifier;
  if (!n) return false;
  const s = n.toLowerCase();
  return (
    (s.includes('ergün') || s.includes('ergun')) &&
    (s.includes('çinar') || s.includes('çınar') || s.includes('cinar') || s.includes('cınar'))
  );
};

// Komisyon adından erişilebilecek modül id'sini çıkarır. Komisyon üyeleri
// (akademisyenler dahil) üyesi oldukları komisyonun ilgili modülüne erişir.
const commissionToModuleId = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('erasmus')) return 'erasmus';
  if (n.includes('staj')) return 'staj';
  if (n.includes('muafiyet')) return 'muafiyet';
  if (n.includes('proje')) return 'projeler';
  if (n.includes('sınav') || n.includes('sinav')) return 'sinav';
  if (n.includes('ders program')) return 'dersprogrami';
  if (n.includes('performans')) return 'performans';
  return null;
};

// ── Responsive Hook ──
function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    let raf;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
      cancelAnimationFrame(raf);
    };
  }, []);
  return width;
}

// ── Hash Router Hook ──
function useHashRoute(defaultRoute = 'portal') {
  const getHash = () => {
    const hash = window.location.hash.replace('#', '');
    return hash || defaultRoute;
  };
  const [route, setRoute] = useState(getHash);
  useEffect(() => {
    const handleHashChange = () => setRoute(getHash());
    window.addEventListener('hashchange', handleHashChange);
    if (!window.location.hash) {
      window.location.hash = '#' + defaultRoute;
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const navigate = useCallback((newRoute) => {
    window.location.hash = '#' + newRoute;
  }, []);
  return [route, navigate];
}

// ── SVG Icon Helper ──
const NavIcon = ({ path, size = 20, color = 'currentColor' }) => (
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
// Top Header Bar
// ══════════════════════════════════════════════════════════════
const TopHeader = ({
  currentUser,
  onLogout,
  isMobile,
  onToggleSidebar,
  sidebarOpen,
  activeDepartment,
  onNavigate,
  availableDepts = [],
  onDepartmentChange,
}) => {
  const dept = DEPARTMENTS.find((d) => d.id === activeDepartment);
  const [deptMenuOpen, setDeptMenuOpen] = React.useState(false);
  const canSwitchDept = availableDepts.length > 1;

  return (
    <header
      style={{
        background: 'linear-gradient(135deg, #1B2A4A 0%, #2D4A7A 100%)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        height: isMobile ? 56 : 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 12px' : '0 24px',
      }}
    >
      {/* Left: Hamburger + Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
        {isMobile && (
          <button
            onClick={onToggleSidebar}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              color: 'white',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {sidebarOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <path d="M3 12h18" />
                  <path d="M3 6h18" />
                  <path d="M3 18h18" />
                </>
              )}
            </svg>
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
          <img
            src="logo.png"
            alt="Logo"
            style={{
              width: isMobile ? 36 : 44,
              height: isMobile ? 36 : 44,
              borderRadius: 8,
              objectFit: 'cover',
            }}
          />
          <div>
            <div
              style={{
                color: 'white',
                fontSize: isMobile ? 13 : 15,
                fontWeight: 700,
                fontFamily: "'Playfair Display', serif",
                letterSpacing: '0.02em',
                lineHeight: 1.2,
              }}
            >
              {window.TENANT?.facultyName || FACULTY.name}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? 10 : 11 }}>
              {window.TENANT?.universityName || FACULTY.university}
            </div>
          </div>
        </div>
      </div>

      {/* Center: Aktif Bölüm rozeti — tıklanabilir bölüm seçici */}
      {!isMobile && dept && (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => canSwitchDept && setDeptMenuOpen((v) => !v)}
            onBlur={() => setTimeout(() => setDeptMenuOpen(false), 150)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 20,
              background: `${dept.color}20`,
              border: `1px solid ${dept.color}40`,
              color: 'white',
              fontSize: 13,
              fontWeight: 500,
              cursor: canSwitchDept ? 'pointer' : 'default',
            }}
            title={canSwitchDept ? 'Bölüm değiştir' : ''}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: dept.color }} />
            <span>{dept.name}</span>
            {canSwitchDept && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{
                  transform: deptMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.18s',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </button>
          {deptMenuOpen && canSwitchDept && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                minWidth: 240,
                maxHeight: 360,
                overflowY: 'auto',
                zIndex: 1100,
                padding: 6,
              }}
            >
              {availableDepts.map((d) => {
                const active = d.id === activeDepartment;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onMouseDown={() => {
                      if (onDepartmentChange) onDepartmentChange(d.id);
                      setDeptMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '9px 12px',
                      border: 'none',
                      background: active ? `${d.color}18` : 'transparent',
                      color: active ? d.color : '#1F2937',
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      borderRadius: 7,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: d.color,
                        flexShrink: 0,
                      }}
                    />
                    {d.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Right: Bildirim + User info + Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
        {window.BellMenu && currentUser && (
          <window.BellMenu
            currentUser={currentUser}
            activeDepartment={activeDepartment}
            onNavigate={onNavigate}
          />
        )}
        {!isMobile && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>
              {currentUser?.name || 'Kullanıcı'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
              {currentUser?.role === 'memur' || currentUser?.isMemur
                ? 'Memur'
                : currentUser?.isUniversityAdmin
                  ? 'Üniversite Yetkilisi'
                  : currentUser?.isFacultyManager
                    ? 'Fakülte Yetkilisi'
                    : currentUser?.role === 'admin'
                      ? 'Fakülte Yöneticisi'
                      : currentUser?.role === 'professor'
                        ? 'Akademisyen'
                        : currentUser?.role === 'bolum_yetkilisi'
                          ? 'Bölüm Yetkilisi'
                          : `Öğrenci`}
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          style={{
            padding: isMobile ? '6px 10px' : '7px 14px',
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.8)',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!isMobile && 'Çıkış'}
        </button>
      </div>
    </header>
  );
};

// ══════════════════════════════════════════════════════════════
// Sidebar Navigation
// ══════════════════════════════════════════════════════════════
const Sidebar = ({
  activeDepartment,
  onDepartmentChange,
  currentRoute,
  onNavigate,
  currentUser,
  isMobile,
  isOpen,
  onClose,
  onRequestChangePassword,
  commissionModules = [],
  studentLocked = false,
  adminScope,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  // Hiyerarşi: bölüm yetkilisi rolü VEYA isDeptManager bayraklı akademisyen
  const isDeptManager = currentUser?.role === 'bolum_yetkilisi' || !!currentUser?.isDeptManager;
  const isProfessor = currentUser?.role === 'professor';
  const isStudent = !isAdmin && !isDeptManager && !isProfessor;
  // Üni/fakülte yetkilisi — modül görünürlüğünde admin gibi davranır
  const isHierarchyManager = !!(currentUser?.isUniversityAdmin || currentUser?.isFacultyManager);

  // Faz 2 — "Gelen Belgeler" bekleyen sayısı (sidebar rozeti). Gelen kutusu
  // ekranıyla AYNI filtreyi (window.belgeGelenKutusu) kullanır.
  const [gelenBelgeSayisi, setGelenBelgeSayisi] = useState(0);
  useEffect(() => {
    let alive = true;
    const hesapla = async () => {
      try {
        if (!window.belgeGelenKutusu || !window.apiRead) return;
        const list = await window.apiRead('memur_outputs');
        if (!alive) return;
        const gelen = window.belgeGelenKutusu(list || [], currentUser) || [];
        setGelenBelgeSayisi(gelen.filter((i) => i.gonderim.durum === 'bekliyor').length);
      } catch (_e) {
        /* sayaç kritik değil */
      }
    };
    hesapla();
    const t = setInterval(hesapla, 60000); // dakikada bir tazele
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [currentUser, currentRoute]);

  const isErgunCinar = isErgunCinarUser(currentUser);
  // Memur — yalnız atandığı modülleri görür; Ortak/Yönetim bölümleri gizli.
  const isMemur = currentUser?.role === 'memur' || !!currentUser?.isMemur;

  // Ortak helper: rol + bayrak + additionalDepartments hepsini birden yönetir.
  const availableDepts = computeAvailableDepts(currentUser, adminScope);

  // Aktif bölüm bir EK BÖLÜM mü? (kullanıcı buraya çapraz-bölüm olarak atanmış
  // — ana bölümü değil.) Eğer öyle ise yetkili modüllerine değil, sadece
  // KENDİ DERSİYLE ilgili 3 modüle erişebilir: Ders Programı, Sınav, Proje.
  // Akademisyenler/Staj/Erasmus/Muafiyet/Formlar/Performans/Anketler ve TÜM
  // yönetim modülleri (Kullanıcı/Bölüm/Ders Yönetimi/Komisyon/Audit) gizlenir.
  const extras = Array.isArray(currentUser?.additionalDepartments)
    ? currentUser.additionalDepartments
    : [];
  const mainDept = currentUser?.departmentId;
  const isOnExtraDept =
    activeDepartment && activeDepartment !== mainDept && extras.includes(activeDepartment);
  // Üniversite dışı akademisyen: eklendiği bölümde Öğrenci Portalı'na da erişir.
  const isExternalUser = currentUser?.external === true;

  // Öğrenciler ve profesörler için erişilebilir modüller
  const getVisibleModules = () => {
    // Memur — yalnız atandığı modüller. 'staj' atanmışsa staj modülü koordinatör
    // (Ergün Çınar) panelini gösterir; diğer modüller salt-okunur çıktı görünümü
    // (Faz 2). Öğrenci/akademisyen dallarına düşmez.
    const isMemur = currentUser?.role === 'memur' || !!currentUser?.isMemur;
    if (isMemur) {
      const mods = Array.isArray(currentUser?.memurModules) ? currentUser.memurModules : [];
      return DEPARTMENT_MODULES.filter((m) => mods.includes(m.id));
    }

    if (isErgunCinar) return DEPARTMENT_MODULES.filter((m) => m.id === 'staj');

    // Çapraz-bölümde (ana bölümü değil ek bölüm) — yetkili/admin olsa bile
    // sadece DERSE BAĞLI 3 modül: kendi dersini ders programına ekler, sınav
    // programına yerleştirir, proje modülünde kendi dersi için işlem yapar.
    if (isOnExtraDept) {
      const crossAllowed = ['dersprogrami', 'sinav', 'projeler'];
      return DEPARTMENT_MODULES.filter((m) => crossAllowed.includes(m.id));
    }

    // Yetkililer (admin / bölüm yetkilisi / hierarchy yetkilisi) — yetkili oldukları
    // bölümde TÜM bölüm modüllerini görürler. AKADEMISYENLER modülünü de görürler
    // (kendisi de akademisyen, bilgi amaçlı). 'Benim Sayfam' hariç.
    if (isAdmin || isDeptManager || isHierarchyManager) {
      return DEPARTMENT_MODULES.filter((m) => m.id !== 'benim');
    }

    // Saf akademisyen
    if (isProfessor) {
      const base = [
        'sinav',
        'formlar',
        'dersprogrami',
        'lisansustu',
        'projeler',
        'staj',
        'performans',
      ];
      const allowed = base.concat(commissionModules);
      return DEPARTMENT_MODULES.filter((m) => allowed.includes(m.id));
    }
    // Öğrenci: ders seçimi yapılana kadar yalnızca "Benim Sayfam" görünür
    if (studentLocked) return DEPARTMENT_MODULES.filter((m) => m.id === 'benim');
    const stdBase = [
      'benim',
      'erasmus',
      'projeler',
      'formlar',
      'staj',
      'muafiyet',
      'capyandal',
      'gelenbelgeler',
    ];
    const stdAllowed = stdBase.concat(commissionModules);
    return DEPARTMENT_MODULES.filter((m) => stdAllowed.includes(m.id));
  };

  const visibleModules = getVisibleModules();
  const activeDept = DEPARTMENTS.find((d) => d.id === activeDepartment);

  const sidebarWidth = 260;

  const sidebarContent = (
    <div
      style={{
        width: sidebarWidth,
        height: '100%',
        background: '#F8F9FB',
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Active Department Badge */}
      {activeDept && (
        <div style={{ padding: '16px 12px 8px' }}>
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: `${activeDept.color}10`,
              border: `1.5px solid ${activeDept.color}25`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `${activeDept.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={activeDept.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={activeDept.icon} />
              </svg>
            </div>
            <div>
              <div
                style={{ fontSize: 12, fontWeight: 700, color: activeDept.color, lineHeight: 1.2 }}
              >
                {activeDept.shortName}
              </div>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>Aktif Bölüm</div>
            </div>
          </div>
        </div>
      )}

      {/* Department Modules */}
      <div style={{ padding: '8px 12px 4px' }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#9CA3AF',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            padding: '8px 4px 4px',
          }}
        >
          Bölüm Modülleri
        </div>
        {visibleModules.map((mod) => {
          const isActive = currentRoute === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => {
                onNavigate(mod.id);
                if (isMobile) onClose();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                marginBottom: 2,
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                background: isActive ? `${activeDept?.color || C.navy}15` : 'transparent',
                color: isActive ? activeDept?.color || C.navy : '#4B5563',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                fontFamily: "'Inter', sans-serif",
                transition: 'all 0.15s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  e.currentTarget.style.background = isActive
                    ? `${activeDept?.color || C.navy}15`
                    : 'transparent';
              }}
            >
              <NavIcon path={mod.icon} size={18} />
              <span style={{ flex: 1 }}>{mod.label}</span>
              {mod.id === 'gelenbelgeler' && gelenBelgeSayisi > 0 && (
                <span
                  style={{
                    background: '#B45309',
                    color: 'white',
                    borderRadius: 10,
                    padding: '1px 7px',
                    fontSize: 10.5,
                    fontWeight: 800,
                  }}
                >
                  {gelenBelgeSayisi}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ margin: '4px 16px', borderTop: '1px solid #E5E7EB' }} />

      {/* Common Modules — çapraz bölümde tamamen gizli (sadece ders modülleri).
          İstisna: üniversite dışı akademisyen eklendiği bölümde yalnız Öğrenci
          Portalı'nı görür. */}
      {!isErgunCinar && !isMemur && !studentLocked && (!isOnExtraDept || isExternalUser) && (
        <div style={{ padding: '4px 12px' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '8px 4px 4px',
            }}
          >
            Ortak
          </div>
          {(isOnExtraDept && isExternalUser
            ? COMMON_MODULES.filter((m) => m.id === 'portal')
            : COMMON_MODULES
          ).map((mod) => {
            const isActive = currentRoute === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => {
                  onNavigate(mod.id);
                  if (isMobile) onClose();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  marginBottom: 2,
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? '#3B82F615' : 'transparent',
                  color: isActive ? '#3B82F6' : '#4B5563',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: "'Inter', sans-serif",
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = isActive ? '#3B82F615' : 'transparent';
                }}
              >
                <NavIcon path={mod.icon} size={18} />
                {mod.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Admin + Bölüm Yetkilisi: Yönetim Modülleri (komisyonlar) */}
      {/* Admin + Bölüm/Fakülte/Üni Yetkilisi: Yönetim Modülleri.
          Çapraz-bölüm aktifken (kullanıcının kendi yetki alanı değil) gizlenir. */}
      {!isErgunCinar && !isOnExtraDept && (isAdmin || isDeptManager || isHierarchyManager) && (
        <>
          <div style={{ margin: '4px 16px', borderTop: '1px solid #E5E7EB' }} />
          <div style={{ padding: '4px 12px 16px' }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                padding: '8px 4px 4px',
              }}
            >
              Yönetim
            </div>
            {ADMIN_MODULES.filter((mod) => {
              // Bölüm yetkilisi: Audit Log dışında tüm yönetim modülleri
              if (isDeptManager && !isAdmin && !isHierarchyManager) {
                return mod.id !== 'audit';
              }
              return true;
            }).map((mod) => {
              const isActive = currentRoute === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    onNavigate(mod.id);
                    if (isMobile) onClose();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    marginBottom: 2,
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    background: isActive ? '#8B263515' : 'transparent',
                    color: isActive ? '#8B2635' : '#4B5563',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    fontFamily: "'Inter', sans-serif",
                    transition: 'all 0.15s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = isActive ? '#8B263515' : 'transparent';
                  }}
                >
                  <NavIcon path={mod.icon} size={18} />
                  {mod.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Hiyerarşi Yönetimi: Üniversite / Fakülte yetkilileri.
          Çapraz-bölüm aktifken kullanıcı oranın yetkilisi değil → gizlenir. */}
      {!isErgunCinar &&
        !isOnExtraDept &&
        HIERARCHY_MODULES.some((m) => currentUser && currentUser[m.flag]) && (
          <>
            <div style={{ margin: '4px 16px', borderTop: '1px solid #E5E7EB' }} />
            <div style={{ padding: '4px 12px 16px' }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  padding: '8px 4px 4px',
                }}
              >
                Hiyerarşi
              </div>
              {HIERARCHY_MODULES.filter((m) => currentUser && currentUser[m.flag]).map((mod) => {
                const isActive = currentRoute === mod.id;
                return (
                  <button
                    key={mod.id}
                    onClick={() => {
                      onNavigate(mod.id);
                      if (isMobile) onClose();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      marginBottom: 2,
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      background: isActive ? '#8B263515' : 'transparent',
                      color: isActive ? '#8B2635' : '#4B5563',
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      fontFamily: "'Inter', sans-serif",
                      transition: 'all 0.15s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        e.currentTarget.style.background = isActive ? '#8B263515' : 'transparent';
                    }}
                  >
                    <NavIcon path={mod.icon} size={18} />
                    {mod.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

      {/* Şifre Değiştir butonu (tüm roller) — sidebar altı */}
      <div style={{ marginTop: 'auto', padding: '8px 12px 16px' }}>
        <button
          onClick={() => {
            if (onRequestChangePassword) onRequestChangePassword();
            if (isMobile) onClose();
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #E5E7EB',
            background: 'white',
            color: '#6366F1',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#EEF2FF';
            e.currentTarget.style.borderColor = '#C7D2FE';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.borderColor = '#E5E7EB';
          }}
        >
          <svg
            width="16"
            height="16"
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
          Şifre Değiştir
        </button>
      </div>

      {/* Mobile: User info at bottom */}
      {isMobile && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #E5E7EB',
            background: '#F3F4F6',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>
            {currentUser?.name || 'Kullanıcı'}
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
            {currentUser?.role === 'admin'
              ? 'Admin'
              : currentUser?.role === 'professor'
                ? 'Akademisyen'
                : currentUser?.role === 'bolum_yetkilisi'
                  ? 'Bölüm Yetkilisi'
                  : `Öğrenci (${currentUser?.studentNumber || ''})`}
          </div>
        </div>
      )}
    </div>
  );

  // Mobile: overlay sidebar
  if (isMobile) {
    if (!isOpen) return null;
    return (
      <>
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 56,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 998,
          }}
        />
        <div
          style={{
            position: 'fixed',
            top: 56,
            left: 0,
            bottom: 0,
            zIndex: 999,
            width: sidebarWidth,
            boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
            animation: 'slideInLeft 0.2s ease-out',
          }}
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `
            @keyframes slideInLeft {
              from { transform: translateX(-100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `,
            }}
          />
          {sidebarContent}
        </div>
      </>
    );
  }

  // Desktop: static sidebar
  return (
    <div
      style={{
        width: sidebarWidth,
        flexShrink: 0,
        height: 'calc(100vh - 64px)',
        position: 'sticky',
        top: 64,
        overflowY: 'auto',
      }}
    >
      {sidebarContent}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// Right Sidebar - Department Selector
// ══════════════════════════════════════════════════════════════
const RightSidebar = ({ activeDepartment, onDepartmentChange, currentUser, adminScope }) => {
  // Ortak helper — Sidebar ile aynı kuralları kullanır.
  const availableDepts = computeAvailableDepts(currentUser, adminScope);

  // Tek bölüm varsa sağ sidebar gösterme
  if (availableDepts.length <= 1) return null;

  // ── FAKÜLTE BAZLI GRUPLAMA ──
  // departments koleksiyonundan veya DEPARTMENTS sabit listesinden facultyId
  // okunur. faculties koleksiyonundan fakülte adları çekilir (lazy state).
  const [facultyNames, setFacultyNames] = React.useState({});
  const [openFaculties, setOpenFaculties] = React.useState(() => new Set());

  React.useEffect(() => {
    let cancelled = false;
    // strict + yeniden deneme: geçici okuma hatasında apiRead [] döndürüp
    // facultyNames'i boş bıraktığından "Fen Fakültesi" başlığı ham id'ye
    // düşüyordu. Hata artık "fakülte yok" ile karıştırılmaz.
    const loadFacultyNames = async () => {
      const MAX_TRIES = 5;
      for (let attempt = 1; attempt <= MAX_TRIES && !cancelled; attempt++) {
        try {
          const facs = await window.apiRead.strict('faculties');
          if (cancelled) return;
          const map = {};
          (facs || []).forEach((f) => {
            const id = f._docId || f.id || (f._id && f._id.toString());
            if (id) map[id] = f.name || id;
          });
          setFacultyNames(map);
          return; // başarılı — yeniden denemeye gerek yok
        } catch (_) {
          if (cancelled || attempt === MAX_TRIES) return;
          await new Promise((r) => setTimeout(r, attempt * 1000));
        }
      }
    };
    loadFacultyNames();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fakülte → bölümler haritası
  const facultyGroups = React.useMemo(() => {
    const groups = new Map();
    for (const d of availableDepts) {
      const fId = d.facultyId || '(bagimsiz)';
      if (!groups.has(fId)) groups.set(fId, []);
      groups.get(fId).push(d);
    }
    // Fakülte adına göre sırala (en üstte bilinen ad, sonda bağımsız)
    return [...groups.entries()].sort((a, b) => {
      if (a[0] === '(bagimsiz)') return 1;
      if (b[0] === '(bagimsiz)') return -1;
      const an = facultyNames[a[0]] || a[0];
      const bn = facultyNames[b[0]] || b[0];
      return an.localeCompare(bn, 'tr');
    });
  }, [availableDepts, facultyNames]);

  // Aktif bölümün fakültesini varsayılan açık tut
  React.useEffect(() => {
    if (!activeDepartment) return;
    const dep = availableDepts.find((d) => d.id === activeDepartment);
    if (!dep) return;
    const fId = dep.facultyId || '(bagimsiz)';
    setOpenFaculties((prev) => {
      if (prev.has(fId)) return prev;
      const next = new Set(prev);
      next.add(fId);
      return next;
    });
  }, [activeDepartment, availableDepts]);

  const toggleFaculty = (fId) => {
    setOpenFaculties((prev) => {
      const next = new Set(prev);
      if (next.has(fId)) next.delete(fId);
      else next.add(fId);
      return next;
    });
  };

  const sidebarWidth = 240;

  return (
    <div
      style={{
        width: sidebarWidth,
        flexShrink: 0,
        height: 'calc(100vh - 64px)',
        position: 'sticky',
        top: 64,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: sidebarWidth,
          height: '100%',
          background: '#F8F9FB',
          borderLeft: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 14px',
          gap: 6,
        }}
      >
        {/* Header */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#9CA3AF',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 6,
            paddingLeft: 2,
          }}
        >
          Fakülteler
        </div>

        {/* Fakülte-Bazlı Açılır Menüler */}
        {facultyGroups.map(([fId, depts]) => {
          const isOpen = openFaculties.has(fId);
          const facName = fId === '(bagimsiz)' ? 'Diğer Bölümler' : facultyNames[fId] || fId;
          const hasActive = depts.some((d) => d.id === activeDepartment);

          return (
            <div key={fId} style={{ marginBottom: 4 }}>
              {/* Fakülte başlığı (açılır menü tetikleyici) */}
              <button
                onClick={() => toggleFaculty(fId)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: hasActive ? '1.5px solid #6366F140' : '1.5px solid transparent',
                  background: hasActive ? '#EEF2FF' : isOpen ? '#F0F1F3' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (!hasActive && !isOpen) e.currentTarget.style.background = '#F0F1F3';
                }}
                onMouseLeave={(e) => {
                  if (!hasActive && !isOpen) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={hasActive ? '#4338CA' : '#6B7280'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
                  </svg>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: hasActive ? 700 : 600,
                      color: hasActive ? '#4338CA' : '#1F2937',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={facName}
                  >
                    {facName}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#9CA3AF',
                      background: '#FFFFFF',
                      padding: '1px 6px',
                      borderRadius: 999,
                      border: '1px solid #E5E7EB',
                    }}
                  >
                    {depts.length}
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6B7280"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>

              {/* Bölüm Listesi (açıkken) */}
              {isOpen && (
                <div
                  style={{
                    paddingLeft: 8,
                    marginTop: 4,
                    marginBottom: 4,
                    borderLeft: '2px solid #E5E7EB',
                    marginLeft: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  {depts.map((d) => {
                    const isActive = d.id === activeDepartment;
                    return (
                      <button
                        key={d.id}
                        onClick={() => onDepartmentChange(d.id)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '7px 10px',
                          borderRadius: 8,
                          border: 'none',
                          background: isActive ? `${d.color}15` : 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          textAlign: 'left',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.background = `${d.color}08`;
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {isActive && (
                          <div
                            style={{
                              position: 'absolute',
                              left: -10,
                              top: 6,
                              bottom: 6,
                              width: 2,
                              background: d.color,
                              borderRadius: 1,
                            }}
                          />
                        )}
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            flexShrink: 0,
                            background: isActive ? `${d.color}25` : '#F0F1F3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={isActive ? d.color : '#9CA3AF'}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d={d.icon} />
                          </svg>
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: isActive ? 650 : 450,
                            color: isActive ? d.color : '#4B5563',
                            fontFamily: "'Inter', sans-serif",
                            lineHeight: 1.3,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={d.shortName || d.name}
                        >
                          {d.shortName || d.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// Zorunlu anket kapısı — anket modülünü tembel yükleyip
// window.AnketZorunluGate bileşenini tam ekran overlay olarak gösterir.
// Katılımcı (öğrenci/akademisyen) rollerinde mount edilir; doldurulmamış
// zorunlu anket yoksa kapı null döner (görünmez).
// ══════════════════════════════════════════════════════════════
function MandatorySurveyGate({ currentUser, activeDepartment }) {
  const [Gate, setGate] = useState(() =>
    typeof window !== 'undefined' ? window.AnketZorunluGate || null : null
  );
  useEffect(() => {
    if (Gate) return;
    let alive = true;
    const loader = window.__lazyModules?.anket?.loader;
    if (!loader) return;
    loader()
      .then(() => {
        if (alive && window.AnketZorunluGate) setGate(() => window.AnketZorunluGate);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [Gate]);
  if (!Gate) return null;
  return React.createElement(Gate, { currentUser, activeDepartment });
}

// ══════════════════════════════════════════════════════════════
// Memur — atandığı modülün akademisyen çıktılarını SALT-OKUNUR listeler.
// Faz 2: muafiyet (dilekçe + transkript snapshot'ları) tam desteklenir; çıktısını
// henüz kalıcı saklamayan modüller için bilgi mesajı gösterilir. Kapsam: memurun
// fakültesinin bölümleri (computeAvailableDepts). Düzenleme/üretim YOK.
// ══════════════════════════════════════════════════════════════
// Memur ekranındaki eylem düğmeleri — tek ölçü, tek yerden.
const memurBtn = (renk, zemin, kenar) => ({
  padding: '7px 13px',
  borderRadius: 8,
  border: '1px solid ' + (kenar || '#0F766E33'),
  background: zemin || '#CCFBF1',
  color: renk || '#0F766E',
  fontSize: 12.5,
  fontWeight: 600,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-block',
});

function MemurModuleOutputs({ route, currentUser }) {
  const moduleLabel = (DEPARTMENT_MODULES.find((m) => m.id === route) || {}).label || route;
  const [items, setItems] = useState(null); // null = yükleniyor
  const [busy, setBusy] = useState(false);
  const [yenile, setYenile] = useState(0);

  // Durum işaretle — gönderenin "Gönderdiklerim" ekranına yansır.
  const isaretle = async (it, durum) => {
    if (it.gonderimIndex < 0) return;
    setBusy(true);
    try {
      const r = await window.belgeDurumGuncelle(it.docId, it.gonderimIndex, durum);
      if (!r || !r.ok) throw new Error((r && r.reason) || 'güncellenemedi');
      setYenile((n) => n + 1);
    } catch (e) {
      alert('İşaretlenemedi: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const sil = async (it) => {
    if (
      !confirm(
        'Bu belge sistemden tamamen silinecek:\n\n' +
          (it.title || '(başlıksız belge)') +
          '\n\nDevam edilsin mi?'
      )
    )
      return;
    setBusy(true);
    try {
      const r = await window.belgeSil(it.docId);
      if (!r || !r.ok) throw new Error((r && r.reason) || 'silinemedi');
      setYenile((n) => n + 1);
    } catch (e) {
      alert('Silinemedi: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const scopeDeptIds = useMemo(
    () => new Set(computeAvailableDepts(currentUser).map((d) => d.id)),
    [currentUser]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setItems(null);
      // PDF tarayıcıda önizlenir (/view); Office belgeleri (.docx/.xlsx) Office
      // Online ile açılamadığından doğrudan indirilir (/download?download=true).
      // Görüntüle ve indir AYRI iki eylemdir:
      //   view  → tarayıcıda açar (PDF önizlenir, Office belgeleri Word'e gider)
      //   indir → her zaman dosya olarak indirir
      const rel = (u) =>
        String(u || '')
          .replace('/api/files/download/', '')
          .replace('/api/files/view/', '');
      const toView = (u) => (rel(u) ? '/api/files/view/' + rel(u) : '#');
      const toDownload = (u) => (rel(u) ? '/api/files/download/' + rel(u) + '?download=true' : '#');
      const memurFacultyId = currentUser?.facultyId || '';
      // Ortak kapsam eşleşmesi: kaydın fakültesi memurun fakültesiyle aynıysa,
      // ya da bölümü memurun kapsamındaysa, ya da kapsamsız (genel) ise göster.
      const inScope = (rec) => {
        if (rec.facultyId && memurFacultyId && rec.facultyId === memurFacultyId) return true;
        if (rec.departmentId && scopeDeptIds.has(rec.departmentId)) return true;
        if (!rec.facultyId && !rec.departmentId) return true;
        return false;
      };
      // 1) Ortak memur_outputs koleksiyonu (tüm modüller — snapshot'lar).
      const outs = await window
        .apiRead('memur_outputs', { where: 'module:eq:s:' + route })
        .catch(() => []);
      const list = (outs || [])
        .filter(inScope)
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
        .map((o) => {
          // Memura yönlendirilmiş gönderim varsa durumu buradan işaretlenir;
          // işaret gönderenin "Gönderdiklerim" ekranına yansır.
          const gs = Array.isArray(o.gonderimler) ? o.gonderimler : [];
          const gIdx = gs.findIndex((g) => g && g.hedefRol === 'memur');
          return {
            id: 'mo_' + (o.id || o.sourceId),
            docId: o.id || o._docId || o.module + '__' + o.sourceId,
            title: o.title || '(başlıksız)',
            sub: o.subtitle || '',
            silinebilir: true,
            gonderimIndex: gIdx,
            durum: gIdx >= 0 ? gs[gIdx].durum || 'bekliyor' : '',
            files: [{ label: 'Belge', view: toView(o.url), download: toDownload(o.url) }],
          };
        });
      // 2) Muafiyet: eski dilekceUrl kayıtları (memur_outputs'a yazılmamış olabilir).
      if (route === 'muafiyet') {
        const recs = await window
          .apiRead('muafiyet_records', { orderBy: 'createdAt:desc' })
          .catch(() => []);
        const seen = new Set((outs || []).map((o) => String(o.sourceId)));
        (recs || [])
          .filter((r) => r.dilekceUrl && !seen.has(String(r.id)))
          .filter(
            (r) => !r.departmentId || scopeDeptIds.size === 0 || scopeDeptIds.has(r.departmentId)
          )
          .forEach((r) => {
            list.push({
              id: r.id,
              title:
                (window.formatCaseTr ? window.formatCaseTr(r.studentName, 'name') : r.studentName) +
                (r.studentNo ? '  ·  ' + r.studentNo : ''),
              sub: [r.otherUniversity || r.otherUni, r.localDept].filter(Boolean).join('  →  '),
              files: [
                r.dilekceUrl && {
                  label: 'Dilekçe',
                  view: toView(r.dilekceUrl),
                  download: toDownload(r.dilekceUrl),
                },
                r.transcriptUrl && {
                  label: 'Transkript',
                  view: toView(r.transcriptUrl),
                  download: toDownload(r.transcriptUrl),
                },
              ].filter(Boolean),
            });
          });
      }
      if (alive) setItems(list);
    })();
    return () => {
      alive = false;
    };
  }, [route, scopeDeptIds, currentUser, yenile]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1B2A4A' }}>
          {moduleLabel} — Çıktılar
        </div>
        <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 4 }}>
          Akademisyenin ürettiği çıktıları görüntüleyip indirebilir, işleme alabilir ve gerekirse
          silebilirsiniz. "İşleme Al" işareti belgeyi gönderen tarafta görünür.
        </div>
      </div>

      {items === null ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Yükleniyor…</div>
      ) : items.length === 0 ? (
        <div
          style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            padding: 32,
            textAlign: 'center',
            color: '#6B7280',
            fontSize: 13.5,
            lineHeight: 1.6,
          }}
        >
          Henüz görüntülenecek <b>{moduleLabel}</b> çıktısı yok. Akademisyen bu modülde bir belge
          ürettiğinde (ör. "Belge Oluştur") kopyası burada listelenir.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((it) => (
            <div
              key={it.id}
              style={{
                background: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1B2A4A' }}>{it.title}</div>
                {it.sub && (
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{it.sub}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {it.files.map((f, i) => (
                  <React.Fragment key={i}>
                    <a href={f.view} target="_blank" rel="noopener noreferrer" style={memurBtn()}>
                      {f.label}: Görüntüle
                    </a>
                    <a href={f.download} style={memurBtn('#1B2A4A', '#EEF2F7', '#1B2A4A33')}>
                      İndir
                    </a>
                  </React.Fragment>
                ))}

                {/* Durum işaretleme — gönderene yansır */}
                {it.gonderimIndex >= 0 && it.durum !== 'islemde' && it.durum !== 'tamamlandi' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => isaretle(it, 'islemde')}
                    style={memurBtn('#7C3AED', '#EDE9FE', '#7C3AED33')}
                  >
                    İşleme Al
                  </button>
                )}
                {it.gonderimIndex >= 0 && it.durum !== 'tamamlandi' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => isaretle(it, 'tamamlandi')}
                    style={memurBtn('#059669', '#D1FAE5', '#05966933')}
                  >
                    Tamamlandı
                  </button>
                )}
                {it.durum === 'islemde' && (
                  <span style={{ fontSize: 11.5, color: '#7C3AED', fontWeight: 700 }}>
                    İşleme alındı
                  </span>
                )}
                {it.durum === 'tamamlandi' && (
                  <span style={{ fontSize: 11.5, color: '#059669', fontWeight: 700 }}>
                    Tamamlandı
                  </span>
                )}

                {it.silinebilir && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => sil(it)}
                    style={memurBtn('#DC2626', '#FEE2E2', '#DC262633')}
                  >
                    Sil
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main App Shell
// ══════════════════════════════════════════════════════════════
function AppShell() {
  const [route, navigate] = useHashRoute('portal');
  const [currentUser, setCurrentUser] = useState(null);
  const [activeDepartment, setActiveDepartment] = useState('bilgisayar');
  // Çift rolü olan yetkililer için aktif kapsam: 'university' (tüm fakülteler)
  // veya 'faculty' (yalnız kendi fakültesi).
  //
  // ÖNEMLİ: Kapsamı değiştiren UI (TopHeader rol anahtarı) kaldırıldı;
  // handleScopeChange artık hiçbir yere bağlı değil. Bu yüzden localStorage'da
  // kalmış eski bir 'faculty' değeri, üniversite adminini kendi fakültesine
  // (ör. Mühendislik) kilitleyip diğer fakülteleri (ör. Fen) KALICI olarak
  // gizliyordu ve geri almanın hiçbir yolu yoktu. Kapsam anahtarı yeniden
  // eklenene kadar her zaman 'university' ile başla ve takılı kalan değeri
  // temizle. (Yalnız fakülte yetkilileri zaten computeAvailableDepts'teki
  // isFacMgr dalıyla doğru kısıtlanır; adminScope onları etkilemez.)
  const [adminScope, setAdminScope] = useState(() => {
    try {
      if (localStorage.getItem('adminScope')) localStorage.removeItem('adminScope');
    } catch {
      /* yok say */
    }
    return 'university';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [commissionModules, setCommissionModules] = useState([]);
  const [, setDeptVersion] = useState(0); // DB bölümleri yüklenince re-render tetikler
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth <= 768;

  // DB'deki bölümleri (Fakülte panelinden eklenenler dahil) sabit
  // window.DEPARTMENTS dizisine yerinde ekle — tüm modüller bu referansı
  // kullandığından, eklenenler uygulama genelinde görünür olur. Mevcut 6
  // çekirdek bölüm (renk/ikon dolu) korunur; yalnızca eksik olanlar eklenir.
  useEffect(() => {
    let cancelled = false;
    // ÖNEMLİ: apiRead (cache'li) geçici hatalarda [] döndürür. Bu birleştirme
    // yalnız BİR kez çalıştığından, o tek okuma bir ağ dalgalanması / rate-limit
    // (açılışta ~30-50 paralel okuma) / 5xx nedeniyle boş dönerse yalnızca DB'de
    // tanımlı fakülteler (ör. Fen Fakültesi) hiç eklenmez ve sağ menüden
    // "kaybolur". Bunu önlemek için strict okuma (hata → [] yerine THROW) +
    // yeniden deneme kullanılır; böylece geçici hata "bölüm yok" ile
    // karıştırılmaz. Birleştirme idempotenttir (id/ad bazlı dedup).
    const mergeDbDepartments = async () => {
      const MAX_TRIES = 5;
      for (let attempt = 1; attempt <= MAX_TRIES && !cancelled; attempt++) {
        try {
          const dbDepts = await window.apiRead.strict('departments');
          if (cancelled || !DEPARTMENTS) return;
          if (!Array.isArray(dbDepts)) throw new Error('Beklenmeyen yanıt biçimi');
          const existingIds = new Set(DEPARTMENTS.map((d) => d.id));
          // Türkçe-locale-aware ad normalize. Aynı isimle hem sabit listede
          // hem DB'de iki kayıt varsa duplicate görünüyordu (ör. 'Gıda Mühendisliği').
          const norm = (s) =>
            (s || '').toString().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
          const existingNames = new Set(DEPARTMENTS.map((d) => norm(d.name)));
          let added = 0;
          dbDepts.forEach((d) => {
            const id = d.id || d._docId;
            if (!id || existingIds.has(id)) return;
            if (existingNames.has(norm(d.name))) return; // ad bazlı dedup
            DEPARTMENTS.push({
              id,
              name: d.name || id,
              shortName: d.shortName || d.name || id,
              color: d.color || '#64748B',
              icon:
                d.icon ||
                'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
              facultyId: d.facultyId || '',
            });
            existingIds.add(id);
            existingNames.add(norm(d.name));
            added++;
          });
          if (added > 0) setDeptVersion((v) => v + 1);
          return; // başarılı okuma — yeniden denemeye gerek yok
        } catch (e) {
          if (cancelled) return;
          if (attempt === MAX_TRIES) {
            console.warn('DB bölümleri yüklenemedi (sabit listeyle devam):', e?.message);
            return;
          }
          // Artan bekleme (1s, 2s, 3s, 4s) ile yeniden dene.
          await new Promise((r) => setTimeout(r, attempt * 1000));
        }
      }
    };
    mergeDbDepartments();
    return () => {
      cancelled = true;
    };
  }, []);

  // Audit log ve merkezi bildirim helper'larının erişebilmesi için
  // mevcut kullanıcıyı global'e yansıt
  useEffect(() => {
    window.__currentUser = currentUser;
  }, [currentUser]);

  // Üyesi olunan komisyonlara göre erişilebilir modülleri belirle.
  // (Örn. Erasmus komisyonu üyesi akademisyen → Erasmus modülü)
  useEffect(() => {
    let cancelled = false;
    const loadCommissionAccess = async () => {
      const uname = (currentUser?.name || currentUser?.identifier || '').toLowerCase().trim();
      if (!currentUser || !uname) {
        setCommissionModules([]);
        return;
      }
      try {
        const comms = await window.apiRead('commissions');
        const ids = new Set();
        (comms || []).forEach((c) => {
          const isMember = (c.members || []).some(
            (m) => m && m.name && m.name.toLowerCase().trim() === uname
          );
          if (!isMember) return;
          const mid = commissionToModuleId(c.name);
          if (mid) ids.add(mid);
        });
        if (!cancelled) setCommissionModules(Array.from(ids));
      } catch (e) {
        if (!cancelled) setCommissionModules([]);
      }
    };
    loadCommissionAccess();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Restore session from localStorage + JWT auth state
  useEffect(() => {
    try {
      let saved = localStorage.getItem('caku_current_user');
      // 10 dk boşta-kalma: son etkinlikten bu yana >= 10 dk geçtiyse oturumu
      // geçersiz say (sekme kapalı kalmış olabilir) → giriş ekranı gösterilir.
      const lastAct = parseInt(localStorage.getItem(IDLE_ACTIVITY_KEY) || '0', 10);
      if (saved && lastAct && Date.now() - lastAct >= IDLE_LIMIT_MS) {
        localStorage.removeItem('caku_auth_token');
        localStorage.removeItem('caku_current_user');
        localStorage.removeItem(IDLE_ACTIVITY_KEY);
        saved = null;
      }
      if (saved) {
        const user = JSON.parse(saved);
        // Bölüm yetkilisi için: eski oturumda yanlış departmentId varsa düzelt
        if (user.role === 'bolum_yetkilisi' && user.departmentId && user.departmentName) {
          const matchedDept = DEPARTMENTS.find((d) => d.name === user.departmentName);
          if (matchedDept && user.departmentId !== matchedDept.id) {
            user.departmentId = matchedDept.id;
            localStorage.setItem('caku_current_user', JSON.stringify(user));
            localStorage.setItem('caku_active_department', matchedDept.id);
          }
        }
        setCurrentUser(user);
        // Bölüm yetkilisi ise kendi bölümünü aktif yap
        if (user.departmentId) {
          setActiveDepartment(user.departmentId);
        }
      }
      // Kaydedilmiş bölüm tercihini yükle (sadece admin için, bölüm yetkilisi kendi bölümüne kilitli)
      const savedDept = localStorage.getItem('caku_active_department');
      if (saved) {
        const user = JSON.parse(saved);
        // Bölüm yetkilisi ise localStorage'daki eski tercihi yoksay, kendi bölümünde kalsın
        if (user.role === 'bolum_yetkilisi' && user.departmentId) {
          setActiveDepartment(user.departmentId);
        } else if (savedDept && DEPARTMENTS.find((d) => d.id === savedDept)) {
          setActiveDepartment(savedDept);
        }
      } else if (savedDept && DEPARTMENTS.find((d) => d.id === savedDept)) {
        setActiveDepartment(savedDept);
      }
    } catch (e) {
      console.error('Session restore error:', e);
    }

    // Oturum dinleyicisi: JWT token süresi dolmuşsa çıkış yap
    const tokenCheckInterval = setInterval(() => {
      const token = localStorage.getItem('caku_auth_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('caku_auth_token');
            localStorage.removeItem('caku_current_user');
            setCurrentUser(null);
          }
        } catch (e) {
          localStorage.removeItem('caku_auth_token');
        }
      }
    }, 60000); // Her 1 dakikada kontrol

    return () => {
      clearInterval(tokenCheckInterval);
    };
  }, []);

  // Bölüm değiştiğinde kaydet. Kapsam mantığı computeAvailableDepts ile birebir;
  // hedef bölüm kullanıcının erişebileceği listede yoksa değişimi reddet.
  // (Akademisyenin additionalDepartments'tan gelen ek bölümlerine geçişe izin
  // verir; sırf 'faculty' filtresi geçmişte engelliyordu.)
  const handleDepartmentChange = useCallback(
    (deptId) => {
      const allowed = computeAvailableDepts(currentUser, adminScope);
      if (allowed.length === 0 || allowed.some((d) => d.id === deptId)) {
        setActiveDepartment(deptId);
        localStorage.setItem('caku_active_department', deptId);
      }
    },
    [currentUser, adminScope]
  );

  // Aktif bölüm, kullanıcının erişebildiği bölümler arasında değilse ilk
  // erişilebilir bölüme geç. Özellikle üniversite dışı akademisyen için önemli:
  // ana bölümü olmadığından varsayılan bölümde kalıp o bölümün tam akademisyen
  // setine erişmemeli — yalnız atandığı bölüme (ek bölüm) düşmeli.
  useEffect(() => {
    if (!currentUser) return;
    const allowed = computeAvailableDepts(currentUser, adminScope);
    if (allowed.length > 0 && !allowed.some((d) => d.id === activeDepartment)) {
      setActiveDepartment(allowed[0].id);
      try {
        localStorage.setItem('caku_active_department', allowed[0].id);
      } catch {
        /* yok say */
      }
    }
  }, [currentUser, adminScope, activeDepartment]);

  // Rol kapsamı değişimi: localStorage'a yaz; fakülte kapsamına geçildiğinde
  // aktif bölüm o fakültenin bir bölümüne otomatik düşer (yetkisiz görünüm
  // kalmasın).
  const handleScopeChange = useCallback(
    (nextScope) => {
      setAdminScope(nextScope);
      try {
        localStorage.setItem('adminScope', nextScope);
      } catch {
        /* yok say */
      }
      if (nextScope === 'faculty' && currentUser?.facultyId) {
        const facultyDepts = (window.DEPARTMENTS || DEPARTMENTS).filter(
          (d) => (d.facultyId || '') === currentUser.facultyId
        );
        if (facultyDepts.length > 0 && !facultyDepts.some((d) => d.id === activeDepartment)) {
          const preferred =
            facultyDepts.find((d) => d.id === currentUser.departmentId) || facultyDepts[0];
          setActiveDepartment(preferred.id);
          try {
            localStorage.setItem('caku_active_department', preferred.id);
          } catch {
            /* yok say */
          }
        }
      }
    },
    [currentUser, activeDepartment]
  );

  const isAdmin = currentUser?.role === 'admin';
  const isProfessor = currentUser?.role === 'professor';
  const isDeptManager = currentUser?.role === 'bolum_yetkilisi' || !!currentUser?.isDeptManager;
  const isStudent = !isAdmin && !isProfessor && !isDeptManager;

  // All valid route IDs
  const ALL_MODULE_IDS = [
    ...DEPARTMENT_MODULES.map((m) => m.id),
    ...COMMON_MODULES.map((m) => m.id),
    ...ADMIN_MODULES.map((m) => m.id),
  ];

  const handleLogin = (user) => {
    setCurrentUser(user);
    const safeUser = {
      role: user.role,
      name: user.name,
      studentNumber: user.studentNumber || null,
      departmentId: user.departmentId || null,
      departmentName: user.departmentName || null,
      erasmusAccess: user.erasmusAccess || false,
      // Hiyerarşi yetki bayrakları (akademisyen profilinden)
      facultyId: user.facultyId || null,
      universityId: user.universityId || null,
      isUniversityAdmin: user.isUniversityAdmin || false,
      isFacultyManager: user.isFacultyManager || false,
      isDeptManager: user.isDeptManager || false,
      isStajCoordinator: user.isStajCoordinator || false,
      // Memur rolü — yenileme sonrası da korunmalı (aksi halde rol/erişim kaybolur).
      isMemur: user.isMemur || false,
      memurModules: Array.isArray(user.memurModules) ? user.memurModules : [],
      // Ek bölümler ve üniversite dışı bayrağı refresh sonrası da korunmalı
      // (aksi halde çapraz-bölüm ve üniversite dışı erişim yenilenince kayboluyordu).
      additionalDepartments: Array.isArray(user.additionalDepartments)
        ? user.additionalDepartments
        : [],
      external: user.external || false,
    };
    localStorage.setItem('caku_current_user', JSON.stringify(safeUser));

    // Bölüm yetkilisi ise kendi bölümünü aktif yap. Üniversite dışı akademisyenin
    // ana bölümü yoktur; atandığı ilk bölümü aktif yap (varsayılan bölümde kalıp
    // yetkisiz görünüm oluşmasın).
    if (user.departmentId) {
      setActiveDepartment(user.departmentId);
      localStorage.setItem('caku_active_department', user.departmentId);
    } else if (
      user.external &&
      Array.isArray(user.additionalDepartments) &&
      user.additionalDepartments.length > 0
    ) {
      setActiveDepartment(user.additionalDepartments[0]);
      localStorage.setItem('caku_active_department', user.additionalDepartments[0]);
    }

    // Redirect based on role
    const userName = (user.name || '').toLowerCase();
    const isErgun =
      (userName.includes('ergün') || userName.includes('ergun')) &&
      (userName.includes('çinar') ||
        userName.includes('çınar') ||
        userName.includes('cinar') ||
        userName.includes('cınar'));
    // Memur → ilk atandığı modül (staj varsa staj). Böylece erişemediği
    // 'portal' rotasında takılı kalmaz.
    const memurMods = Array.isArray(user.memurModules) ? user.memurModules : [];
    if (user.isMemur || user.role === 'memur') {
      navigate(memurMods.includes('staj') ? 'staj' : memurMods[0] || 'staj');
    } else if (isErgun) {
      navigate('staj');
    } else {
      navigate('portal');
    }
  };

  const handleLogout = async () => {
    try {
      await Auth.signOut();
    } catch (_) {
      /* çıkış API'si hata verse de yerel oturum temizlenir */
    }
    try {
      localStorage.removeItem('caku_auth_token');
      localStorage.removeItem('caku_current_user');
      localStorage.removeItem(IDLE_ACTIVITY_KEY);
    } catch (_) {
      /* yok say */
    }
    setCurrentUser(null);
    navigate('portal');
  };

  // ── Oturum boşta-kalma (idle) denetimi — TÜM roller ──
  // 10 dk boyunca kullanıcı etkinliği (fare/klavye/dokunma/kaydırma) olmazsa
  // otomatik çıkış yapılır. Son etkinlik zaman damgası localStorage'da tutulur
  // (sekmeler arası paylaşım + geri-yüklemede kontrol). Uyku/arka plan
  // throttling'e dayanıklı olması için tek setTimeout yerine periyodik kontrol.
  useEffect(() => {
    if (!currentUser) return;
    const bump = () => {
      try {
        localStorage.setItem(IDLE_ACTIVITY_KEY, String(Date.now()));
      } catch (_) {
        /* yok say */
      }
    };
    bump(); // oturum başında/etkinlikte işaretle
    let lastWrite = Date.now();
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < 5000) return; // en çok 5 sn'de bir yaz (performans)
      lastWrite = now;
      bump();
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const check = setInterval(() => {
      const last = parseInt(localStorage.getItem(IDLE_ACTIVITY_KEY) || '0', 10);
      if (last && Date.now() - last >= IDLE_LIMIT_MS) {
        handleLogout();
      }
    }, 30000); // 30 sn'de bir kontrol
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(check);
    };
  }, [currentUser]);

  // ── Lazy Loading State ──
  const [loadedModules, setLoadedModules] = useState({});
  const [moduleLoading, setModuleLoading] = useState(false);

  // Öğrenci ders seçimi durumu: seçim yapmadıysa "benim" dışındaki modüllere erişemez
  const [studentCoursesChecked, setStudentCoursesChecked] = useState(false);
  const [studentHasCourses, setStudentHasCourses] = useState(true); // varsayılan: engelleme

  useEffect(() => {
    // Öğrenci dışı rollerde veya kullanıcı yoksa kontrol yok
    if (!currentUser || currentUser.role !== 'student') {
      setStudentCoursesChecked(true);
      setStudentHasCourses(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Ders seçimi artık DÖNEM bazlı (student_courses). Öğrenci en az bir
        // dönem için seçim yaptıysa kapı açılır. Geriye dönük: eski tek-liste
        // (students.myCourseIds) de kabul edilir (mevcut öğrenciler kilitlenmesin).
        let hasCourses = false;
        try {
          const sel = await window.apiRead('student_courses', {
            where: 'studentNumber:eq:s:' + currentUser.studentNumber,
          });
          hasCourses =
            Array.isArray(sel) &&
            sel.some((d) => Array.isArray(d.courseIds) && d.courseIds.length > 0);
        } catch (_) {
          /* koleksiyon yoksa aşağıdaki legacy kontrolüne düş */
        }
        if (!hasCourses) {
          const students = await window.FirebaseDB.fetchStudents();
          const me = students.find((s) => s.studentNumber === currentUser.studentNumber);
          hasCourses = Array.isArray(me?.myCourseIds) && me.myCourseIds.length > 0;
        }
        if (!cancelled) {
          setStudentHasCourses(hasCourses);
          setStudentCoursesChecked(true);
        }
      } catch (e) {
        // Hata durumunda engellemeyelim
        if (!cancelled) {
          setStudentHasCourses(true);
          setStudentCoursesChecked(true);
        }
      }
    })();
    // Benim Sayfam'da kaydet dendikten sonra yenilemek için global kanca
    window.__onStudentCoursesSelected = () => {
      if (!cancelled) setStudentHasCourses(true);
    };
    return () => {
      cancelled = true;
      delete window.__onStudentCoursesSelected;
    };
  }, [currentUser?.studentNumber, currentUser?.role]);

  // Erasmus erişimi yetkili tarafından değiştirildiğinde, öğrencinin çıkış/giriş
  // yapmasına gerek kalmadan sayfa yenilenince güncel değeri sunucudan senkronla.
  // currentUser localStorage'dan geri yüklendiği için aksi halde eski (stale)
  // erasmusAccess değeri kalıyor; öğrenci refresh atınca yetki aktifleşmiyordu.
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student' || !currentUser.studentNumber) return;
    let cancelled = false;
    (async () => {
      try {
        const students = await window.FirebaseDB.fetchStudents();
        const me = students.find((s) => s.studentNumber === currentUser.studentNumber);
        if (!me || cancelled) return;
        const serverErasmus = me.erasmusAccess === true;
        if (serverErasmus !== (currentUser.erasmusAccess === true)) {
          setCurrentUser((prev) => {
            if (!prev) return prev;
            const next = { ...prev, erasmusAccess: serverErasmus };
            try {
              localStorage.setItem('caku_current_user', JSON.stringify(next));
            } catch (_) {
              /* localStorage yoksa yoksay */
            }
            return next;
          });
        }
      } catch (_) {
        /* sessizce geç — hata durumunda mevcut değeri koru */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.studentNumber, currentUser?.role]);

  // Routing Protection
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'student' && !studentCoursesChecked) return;

    // Öğrenci ders seçimi yapmadıysa sadece "benim" rotası açık
    if (currentUser.role === 'student' && !studentHasCourses) {
      if (route !== 'benim') navigate('benim');
      return;
    }

    // Hiyerarşi yöneticisi (üni/fakülte yetkilisi) — yönetim açısından
    // admin gibi davranır: tüm bölüm modüllerini ve yönetim modüllerini görür.
    const isHierarchyManager = !!(currentUser?.isUniversityAdmin || currentUser?.isFacultyManager);

    // Aktif bölüm bir EK BÖLÜM mü — yetkili olsa bile kısıtlı modül seti.
    const extras = Array.isArray(currentUser?.additionalDepartments)
      ? currentUser.additionalDepartments
      : [];
    const isOnExtraDept =
      activeDepartment &&
      activeDepartment !== currentUser?.departmentId &&
      extras.includes(activeDepartment);
    // Üniversite dışı akademisyen: eklendiği bölümde Öğrenci Portalı da açık.
    const isExternalUser = currentUser?.external === true;

    // Modül izin listesi:
    //   • Çapraz-bölüm (ek) → sadece ders-bağlı modüller (Staj/Erasmus/Muafiyet yok)
    //   • Yetkili (admin/dept mgr/hier mgr) → akademisyen modülü dahil tümü (benim hariç)
    //   • Saf akademisyen → eski set
    //   • Öğrenci → eski set
    const allowedDeptModules = isOnExtraDept
      ? ['dersprogrami', 'sinav', 'projeler']
      : isDeptManager || isAdmin || isHierarchyManager
        ? DEPARTMENT_MODULES.filter((m) => m.id !== 'benim').map((m) => m.id)
        : isProfessor
          ? ['sinav', 'formlar', 'dersprogrami', 'lisansustu', 'projeler', 'staj', 'performans']
          : [
              'benim',
              'erasmus',
              'projeler',
              'formlar',
              'staj',
              'muafiyet',
              'capyandal',
              'gelenbelgeler',
            ]; // student

    // Çapraz-bölümde Ortak/Yönetim/Hiyerarşi modülleri tamamen gizli.
    // İstisna: üniversite dışı akademisyen eklendiği bölümde Öğrenci Portalı'na erişir.
    const allowedCommon = isOnExtraDept
      ? isExternalUser
        ? ['portal']
        : []
      : COMMON_MODULES.map((m) => m.id);
    // Bölüm yetkilisi yönetim modülleri görür ama Audit Log hariç.
    const allowedAdmin = isOnExtraDept
      ? []
      : isAdmin || isHierarchyManager
        ? ADMIN_MODULES.map((m) => m.id)
        : isDeptManager
          ? ADMIN_MODULES.filter((m) => m.id !== 'audit').map((m) => m.id)
          : [];
    // Hiyerarşi yönetim modülleri (yetki bayrağına göre)
    const allowedHierarchy = isOnExtraDept
      ? []
      : HIERARCHY_MODULES.filter((m) => currentUser && currentUser[m.flag]).map((m) => m.id);
    // Komisyon üyeliği ile kazanılan modül erişimleri
    const allAllowed = [
      ...allowedDeptModules,
      ...allowedCommon,
      ...allowedAdmin,
      ...allowedHierarchy,
      ...commissionModules,
    ];

    if (!allAllowed.includes(route)) {
      if (isAdmin || isDeptManager) navigate('erasmus');
      else if (isProfessor) navigate('sinav');
      else navigate('portal');
    }
  }, [
    route,
    currentUser,
    isAdmin,
    isProfessor,
    isDeptManager,
    navigate,
    studentCoursesChecked,
    studentHasCourses,
    commissionModules,
  ]);

  // Lazy load module
  useEffect(() => {
    const lazyMod = window.__lazyModules?.[route];
    if (!lazyMod) return;

    const componentName = lazyMod.component;
    if (window[componentName]) {
      if (!loadedModules[route]) {
        setLoadedModules((prev) => ({ ...prev, [route]: true }));
      }
      return;
    }

    setModuleLoading(true);
    lazyMod
      .loader()
      .then(() => {
        setLoadedModules((prev) => ({ ...prev, [route]: true }));
        setModuleLoading(false);
      })
      .catch((err) => {
        console.error('Module load error:', err);
        setModuleLoading(false);
      });
  }, [route]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [route]);

  // Show login if not authenticated
  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <style dangerouslySetInnerHTML={{ __html: sharedStyles.global }} />
        <LoginModal onLogin={handleLogin} />
      </div>
    );
  }

  // TopHeader'daki bölüm seçici için kullanılabilir bölüm listesi.
  // Ortak computeAvailableDepts helper'ı (Sidebar/RightSidebar ile aynı kurallar).
  const topAvailableDepts = computeAvailableDepts(currentUser, adminScope);
  // RightSidebar tek bölümlü kullanıcılarda render edilmiyor (aynı kural orada da
  // var). İçerik genişliğini rollere göre eşitlemek için burada da biliyoruz.
  const rightRailVisible = topAvailableDepts.length > 1;

  // Render active module
  // Çapraz-bölümde modüllere AKADEMİSYEN olarak görünür: tüm yetki bayrakları
  // bu bölüm için geçici olarak temizlenir, role='professor' yapılır. Modüller
  // role/admin kontrolüne göre düğmeleri (silme/herkes-düzenleme/yetkili
  // işlemleri) gizler. Sonuç: çapraz akademisyen sadece KENDİ dersi/projesi/
  // sınavıyla işlem yapar; başkasının verisine müdahale edemez.
  const extrasUser = Array.isArray(currentUser?.additionalDepartments)
    ? currentUser.additionalDepartments
    : [];
  const isOnExtraDeptForModule =
    !!currentUser &&
    activeDepartment &&
    activeDepartment !== currentUser.departmentId &&
    extrasUser.includes(activeDepartment);
  const effectiveUser = isOnExtraDeptForModule
    ? {
        ...currentUser,
        role: 'professor',
        isAdmin: false,
        isDeptManager: false,
        isFacultyManager: false,
        isUniversityAdmin: false,
      }
    : currentUser;

  const renderModule = () => {
    if (moduleLoading) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '80px 20px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: '3px solid #E5E1D8',
                borderTopColor: C.navy,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <p style={{ color: '#666', fontSize: 14 }}>Modül yükleniyor...</p>
            <style
              dangerouslySetInnerHTML={{
                __html: '@keyframes spin { to { transform: rotate(360deg) } }',
              }}
            />
          </div>
        </div>
      );
    }

    // Memur — 'staj' tam koordinatör paneli; diğer atanan modüller için
    // akademisyen çıktılarının SALT-OKUNUR görünümü (MemurModuleOutputs).
    const _isMemur = currentUser?.role === 'memur' || !!currentUser?.isMemur;
    if (_isMemur && route !== 'staj') {
      return <MemurModuleOutputs route={route} currentUser={currentUser} />;
    }

    // Lazy loading
    const lazyMod = window.__lazyModules?.[route];
    const componentName = lazyMod?.component;
    const Component = componentName ? window[componentName] : null;

    if (!Component) {
      const fallback = {
        erasmus: window.ErasmusLearningAgreementApp,
        sinav: window.SinavOtomasyonuApp,
        muafiyet: window.DersMuafiyetApp,
        capyandal: window.CapYandalApp,
        gelenbelgeler: window.GelenBelgelerApp,

        portal: window.OgrenciPortaliApp,
        projeler: window.ProjeModuluApp,
        formlar: window.FormlarModuluApp,
        kullanici: window.KullaniciYonetimiApp,
        staj: window.StajModuluApp,
        dersprogrami: window.DersProgramiApp,
        lisansustu: window.LisansustuApp,
        komisyonlar: window.KomisyonlarModuluApp,
        benim: window.BenimSayfamApp,
        audit: window.AuditLogModuluApp,
        kulupler: window.OgrenciKulupleriApp,
        anket: window.AnketModulu,
        univ: window.UnvYonetimiApp,
        fakulte: window.FakYonetimiApp,
        akreditasyon: window.AkreditasyonApp,
        yolharitalari: window.YolHaritalariApp,
      };
      const FallbackComponent = fallback[route];
      if (FallbackComponent)
        return React.createElement(FallbackComponent, {
          currentUser: effectiveUser,
          activeDepartment,
          departmentInfo: DEPARTMENTS.find((d) => d.id === activeDepartment),
        });
      return (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#c00' }}>
          Modül yüklenemedi. Lütfen sayfayı yenileyin (Ctrl+Shift+R).
        </div>
      );
    }

    return React.createElement(Component, {
      currentUser: effectiveUser,
      activeDepartment,
      departmentInfo: DEPARTMENTS.find((d) => d.id === activeDepartment),
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F3F4F6',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        ${sharedStyles.global}
        @keyframes spin { to { transform: rotate(360deg) } }
        /* Sidebar scrollbar */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }
      `,
        }}
      />

      {(currentUser?.role === 'student' || currentUser?.role === 'professor') && (
        <MandatorySurveyGate currentUser={currentUser} activeDepartment={activeDepartment} />
      )}

      <TopHeader
        currentUser={currentUser}
        onLogout={handleLogout}
        isMobile={isMobile}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        activeDepartment={activeDepartment}
        onNavigate={navigate}
        availableDepts={topAvailableDepts}
        onDepartmentChange={handleDepartmentChange}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar
          activeDepartment={activeDepartment}
          onDepartmentChange={handleDepartmentChange}
          currentRoute={route}
          onNavigate={navigate}
          currentUser={currentUser}
          isMobile={isMobile}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onRequestChangePassword={() => setShowChangePassword(true)}
          commissionModules={commissionModules}
          studentLocked={currentUser?.role === 'student' && !studentHasCourses}
          adminScope={adminScope}
        />

        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: isMobile ? 12 : 24,
            // Sağ raf (bölüm seçici) yalnızca çok bölümlü rollerde çıkıyor; rafsız
            // rollerde içerik sütunu 240px daha genişleyip sayfa oranı role göre
            // değişiyordu. Ekran yeterince genişse rafın yerini boş bırakarak
            // içerik genişliğini tüm rollerde eşitliyoruz; dar ekranda ise
            // sıkıştırmamak için bu telafiyi uygulamıyoruz.
            paddingRight:
              !isMobile && !rightRailVisible && windowWidth >= 1500 ? 24 + 240 : undefined,
            // Kısa modüllerde sayfa yüksekliği sidebar'ın altında kalmasın —
            // sidebar'lı/sidebar'sız her rolde aynı taban yükseklik.
            minHeight: isMobile ? undefined : 'calc(100vh - 64px)',
            overflowY: 'auto',
          }}
        >
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>{renderModule()}</div>
        </main>

        {!isMobile && (
          <RightSidebar
            activeDepartment={activeDepartment}
            onDepartmentChange={handleDepartmentChange}
            currentUser={currentUser}
            adminScope={adminScope}
          />
        )}
      </div>

      {showChangePassword && currentUser && (
        <ChangePasswordModal
          currentUser={currentUser}
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </div>
  );
}

// Export to window
window.AppShell = AppShell;
