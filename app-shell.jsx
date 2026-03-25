// ══════════════════════════════════════════════════════════════
// ÇAKÜ Mühendislik Fakültesi - Ana Kabuk (App Shell)
// Fakülte bazlı navigasyon, bölüm seçimi ve kimlik doğrulama
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useCallback, useRef } = React;

// ── Shared bileşenlerden import (window üzerinden) ──
const C = window.C;
const sharedStyles = window.sharedStyles;
const LoginModal = window.LoginModal;
const FACULTY = window.FACULTY;
const DEPARTMENTS = window.DEPARTMENTS;
const DEPARTMENT_MODULES = window.DEPARTMENT_MODULES;
const COMMON_MODULES = window.COMMON_MODULES;
const ADMIN_MODULES = window.ADMIN_MODULES;

// ── Responsive Hook ──
function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    let raf;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener("resize", handler);
    return () => { window.removeEventListener("resize", handler); cancelAnimationFrame(raf); };
  }, []);
  return width;
}

// ── Hash Router Hook ──
function useHashRoute(defaultRoute = "portal") {
  const getHash = () => {
    const hash = window.location.hash.replace("#", "");
    return hash || defaultRoute;
  };
  const [route, setRoute] = useState(getHash);
  useEffect(() => {
    const handleHashChange = () => setRoute(getHash());
    window.addEventListener("hashchange", handleHashChange);
    if (!window.location.hash) {
      window.location.hash = "#" + defaultRoute;
    }
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  const navigate = useCallback((newRoute) => {
    window.location.hash = "#" + newRoute;
  }, []);
  return [route, navigate];
}

// ── SVG Icon Helper ──
const NavIcon = ({ path, size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

// ══════════════════════════════════════════════════════════════
// Top Header Bar
// ══════════════════════════════════════════════════════════════
const TopHeader = ({ currentUser, onLogout, isMobile, onToggleSidebar, sidebarOpen, activeDepartment }) => {
  const dept = DEPARTMENTS.find(d => d.id === activeDepartment);

  return (
    <header style={{
      background: "linear-gradient(135deg, #1B2A4A 0%, #2D4A7A 100%)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
      position: "sticky",
      top: 0,
      zIndex: 1000,
      height: isMobile ? 56 : 64,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: isMobile ? "0 12px" : "0 24px",
    }}>
      {/* Left: Hamburger + Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16 }}>
        {isMobile && (
          <button onClick={onToggleSidebar} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: 6, display: "flex", color: "white",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarOpen
                ? <path d="M18 6L6 18M6 6l12 12" />
                : <><path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" /></>
              }
            </svg>
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
          <img src="logo.png" alt="Logo" style={{
            width: isMobile ? 36 : 44, height: isMobile ? 36 : 44, borderRadius: 8, objectFit: "cover"
          }} />
          <div>
            <div style={{
              color: "white", fontSize: isMobile ? 13 : 15, fontWeight: 700,
              fontFamily: "'Playfair Display', serif", letterSpacing: "0.02em",
              lineHeight: 1.2,
            }}>
              {FACULTY.name}
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: isMobile ? 10 : 11 }}>
              {FACULTY.university}
            </div>
          </div>
        </div>
      </div>

      {/* Center: Active Department Badge (desktop) */}
      {!isMobile && dept && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 16px", borderRadius: 20,
          background: `${dept.color}20`, border: `1px solid ${dept.color}40`,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: dept.color }} />
          <span style={{ color: "white", fontSize: 13, fontWeight: 500 }}>{dept.name}</span>
        </div>
      )}

      {/* Right: User info + Logout */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16 }}>
        {!isMobile && (
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "white", fontSize: 13, fontWeight: 600 }}>
              {currentUser?.name || "Kullanıcı"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
              {currentUser?.role === "admin" ? "Fakülte Yöneticisi"
                : currentUser?.role === "professor" ? "Akademisyen"
                : currentUser?.role === "bolum_yetkilisi" ? "Bölüm Yetkilisi"
                : `Öğrenci`}
            </div>
          </div>
        )}
        <button onClick={onLogout} style={{
          padding: isMobile ? "6px 10px" : "7px 14px",
          border: "1px solid rgba(255,255,255,0.25)",
          background: "transparent", color: "rgba(255,255,255,0.8)",
          borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500,
          transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!isMobile && "Çıkış"}
        </button>
      </div>
    </header>
  );
};

// ══════════════════════════════════════════════════════════════
// Sidebar Navigation
// ══════════════════════════════════════════════════════════════
const Sidebar = ({
  activeDepartment, onDepartmentChange,
  currentRoute, onNavigate,
  currentUser, isMobile, isOpen, onClose,
}) => {
  const isAdmin = currentUser?.role === "admin";
  const isDeptManager = currentUser?.role === "bolum_yetkilisi";
  const isProfessor = currentUser?.role === "professor";
  const isStudent = !isAdmin && !isDeptManager && !isProfessor;

  // Bölüm yetkilisi sadece kendi bölümünü görebilir
  const availableDepts = isDeptManager
    ? DEPARTMENTS.filter(d => d.id === currentUser?.departmentId)
    : DEPARTMENTS;

  // Öğrenciler ve profesörler için erişilebilir modüller
  const getVisibleModules = () => {
    if (isAdmin || isDeptManager) return DEPARTMENT_MODULES;
    if (isProfessor) return DEPARTMENT_MODULES.filter(m => ["sinav", "formlar"].includes(m.id));
    // Öğrenci
    return DEPARTMENT_MODULES.filter(m => ["erasmus", "projeler", "formlar"].includes(m.id));
  };

  const visibleModules = getVisibleModules();
  const activeDept = DEPARTMENTS.find(d => d.id === activeDepartment);

  const sidebarWidth = 260;

  const sidebarContent = (
    <div style={{
      width: sidebarWidth,
      height: "100%",
      background: "#F8F9FB",
      borderRight: "1px solid #E5E7EB",
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
    }}>
      {/* Department Selector */}
      {availableDepts.length > 1 && (
        <div style={{ padding: "16px 16px 8px" }}>
          <label style={{
            display: "block", fontSize: 10, fontWeight: 700, color: "#9CA3AF",
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8,
          }}>Bölüm Seçimi</label>
          <select
            value={activeDepartment}
            onChange={e => onDepartmentChange(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8,
              border: `2px solid ${activeDept?.color || "#E5E7EB"}`,
              background: "white", fontSize: 13, fontWeight: 500,
              color: "#1F2937", cursor: "pointer", outline: "none",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {availableDepts.map(d => (
              <option key={d.id} value={d.id}>{d.shortName}</option>
            ))}
          </select>
        </div>
      )}

      {/* Single department badge (for dept managers) */}
      {availableDepts.length === 1 && (
        <div style={{ padding: "16px 16px 8px" }}>
          <div style={{
            padding: "10px 12px", borderRadius: 8,
            background: `${activeDept?.color}10`, border: `2px solid ${activeDept?.color}30`,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: activeDept?.color }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1F2937" }}>{activeDept?.name}</span>
          </div>
        </div>
      )}

      {/* Department Modules */}
      <div style={{ padding: "8px 12px 4px" }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: "#9CA3AF",
          textTransform: "uppercase", letterSpacing: "0.1em",
          padding: "8px 4px 4px",
        }}>Bölüm Modülleri</div>
        {visibleModules.map(mod => {
          const isActive = currentRoute === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => { onNavigate(mod.id); if (isMobile) onClose(); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", marginBottom: 2, borderRadius: 8,
                border: "none", cursor: "pointer",
                background: isActive ? `${activeDept?.color || C.navy}15` : "transparent",
                color: isActive ? (activeDept?.color || C.navy) : "#4B5563",
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s",
                textAlign: "left",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#F3F4F6"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? `${activeDept?.color || C.navy}15` : "transparent"; }}
            >
              <NavIcon path={mod.icon} size={18} />
              {mod.label}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ margin: "4px 16px", borderTop: "1px solid #E5E7EB" }} />

      {/* Common Modules */}
      <div style={{ padding: "4px 12px" }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: "#9CA3AF",
          textTransform: "uppercase", letterSpacing: "0.1em",
          padding: "8px 4px 4px",
        }}>Ortak</div>
        {COMMON_MODULES.map(mod => {
          const isActive = currentRoute === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => { onNavigate(mod.id); if (isMobile) onClose(); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", marginBottom: 2, borderRadius: 8,
                border: "none", cursor: "pointer",
                background: isActive ? "#3B82F615" : "transparent",
                color: isActive ? "#3B82F6" : "#4B5563",
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s",
                textAlign: "left",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#F3F4F6"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? "#3B82F615" : "transparent"; }}
            >
              <NavIcon path={mod.icon} size={18} />
              {mod.label}
            </button>
          );
        })}
      </div>

      {/* Admin Modules */}
      {isAdmin && (
        <>
          <div style={{ margin: "4px 16px", borderTop: "1px solid #E5E7EB" }} />
          <div style={{ padding: "4px 12px 16px" }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "#9CA3AF",
              textTransform: "uppercase", letterSpacing: "0.1em",
              padding: "8px 4px 4px",
            }}>Yönetim</div>
            {ADMIN_MODULES.map(mod => {
              const isActive = currentRoute === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => { onNavigate(mod.id); if (isMobile) onClose(); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", marginBottom: 2, borderRadius: 8,
                    border: "none", cursor: "pointer",
                    background: isActive ? "#8B263515" : "transparent",
                    color: isActive ? "#8B2635" : "#4B5563",
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    fontFamily: "'Inter', sans-serif",
                    transition: "all 0.15s",
                    textAlign: "left",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#F3F4F6"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? "#8B263515" : "transparent"; }}
                >
                  <NavIcon path={mod.icon} size={18} />
                  {mod.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Mobile: User info at bottom */}
      {isMobile && (
        <div style={{
          marginTop: "auto", padding: "16px",
          borderTop: "1px solid #E5E7EB", background: "#F3F4F6",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1F2937" }}>
            {currentUser?.name || "Kullanıcı"}
          </div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
            {currentUser?.role === "admin" ? "Admin"
              : currentUser?.role === "professor" ? "Akademisyen"
              : currentUser?.role === "bolum_yetkilisi" ? "Bölüm Yetkilisi"
              : `Öğrenci (${currentUser?.studentNumber || ""})`}
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
        <div onClick={onClose} style={{
          position: "fixed", top: 56, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.4)", zIndex: 998,
        }} />
        <div style={{
          position: "fixed", top: 56, left: 0, bottom: 0,
          zIndex: 999, width: sidebarWidth,
          boxShadow: "4px 0 24px rgba(0,0,0,0.15)",
          animation: "slideInLeft 0.2s ease-out",
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes slideInLeft {
              from { transform: translateX(-100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}} />
          {sidebarContent}
        </div>
      </>
    );
  }

  // Desktop: static sidebar
  return (
    <div style={{
      width: sidebarWidth,
      flexShrink: 0,
      height: "calc(100vh - 64px)",
      position: "sticky",
      top: 64,
      overflowY: "auto",
    }}>
      {sidebarContent}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// Main App Shell
// ══════════════════════════════════════════════════════════════
function AppShell() {
  const [route, navigate] = useHashRoute("portal");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeDepartment, setActiveDepartment] = useState("bilgisayar");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth <= 768;

  // Restore session from localStorage + Firebase Auth state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("caku_current_user");
      if (saved) {
        const user = JSON.parse(saved);
        // Bölüm yetkilisi için: eski oturumda yanlış departmentId varsa düzelt
        if (user.role === "bolum_yetkilisi" && user.departmentId && user.departmentName) {
          const matchedDept = DEPARTMENTS.find(d => d.name === user.departmentName);
          if (matchedDept && user.departmentId !== matchedDept.id) {
            user.departmentId = matchedDept.id;
            localStorage.setItem("caku_current_user", JSON.stringify(user));
            localStorage.setItem("caku_active_department", matchedDept.id);
          }
        }
        setCurrentUser(user);
        // Bölüm yetkilisi ise kendi bölümünü aktif yap
        if (user.departmentId) {
          setActiveDepartment(user.departmentId);
        }
      }
      // Kaydedilmiş bölüm tercihini yükle (sadece admin için, bölüm yetkilisi kendi bölümüne kilitli)
      const savedDept = localStorage.getItem("caku_active_department");
      if (saved) {
        const user = JSON.parse(saved);
        // Bölüm yetkilisi ise localStorage'daki eski tercihi yoksay, kendi bölümünde kalsın
        if (user.role === "bolum_yetkilisi" && user.departmentId) {
          setActiveDepartment(user.departmentId);
        } else if (savedDept && DEPARTMENTS.find(d => d.id === savedDept)) {
          setActiveDepartment(savedDept);
        }
      } else if (savedDept && DEPARTMENTS.find(d => d.id === savedDept)) {
        setActiveDepartment(savedDept);
      }
    } catch (e) {
      console.error("Session restore error:", e);
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

    // Firebase Auth oturum dinleyicisi (geriye uyumluluk)
    const auth = window.firebase?.auth();
    let unsubscribeAuth = null;
    if (auth) {
      unsubscribeAuth = auth.onAuthStateChanged((firebaseUser) => {
        if (!firebaseUser) {
          const current = localStorage.getItem("caku_current_user");
          const hasJwtToken = localStorage.getItem("caku_auth_token");
          // JWT token varsa Firebase Auth'un çıkışını yoksay
          if (current && !hasJwtToken) {
            setCurrentUser(null);
            localStorage.removeItem("caku_current_user");
          }
        }
      });
    }

    return () => {
      clearInterval(tokenCheckInterval);
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  // Bölüm değiştiğinde kaydet (bölüm yetkilisi kendi bölümünden çıkamaz)
  const handleDepartmentChange = useCallback((deptId) => {
    if (currentUser?.role === "bolum_yetkilisi" && deptId !== currentUser?.departmentId) {
      return; // Bölüm yetkilisi sadece kendi bölümünü görebilir
    }
    setActiveDepartment(deptId);
    localStorage.setItem("caku_active_department", deptId);
  }, [currentUser]);

  const isAdmin = currentUser?.role === "admin";
  const isProfessor = currentUser?.role === "professor";
  const isDeptManager = currentUser?.role === "bolum_yetkilisi";
  const isStudent = !isAdmin && !isProfessor && !isDeptManager;

  // All valid route IDs
  const ALL_MODULE_IDS = [
    ...DEPARTMENT_MODULES.map(m => m.id),
    ...COMMON_MODULES.map(m => m.id),
    ...ADMIN_MODULES.map(m => m.id),
  ];

  const handleLogin = (user) => {
    setCurrentUser(user);
    const safeUser = {
      role: user.role, name: user.name,
      studentNumber: user.studentNumber || null,
      departmentId: user.departmentId || null,
      departmentName: user.departmentName || null,
      erasmusAccess: user.erasmusAccess || false,
    };
    localStorage.setItem("caku_current_user", JSON.stringify(safeUser));

    // Bölüm yetkilisi ise kendi bölümünü aktif yap
    if (user.departmentId) {
      setActiveDepartment(user.departmentId);
      localStorage.setItem("caku_active_department", user.departmentId);
    }

    // Redirect based on role
    if (user.role === "admin") {
      navigate("erasmus");
    } else if (user.role === "bolum_yetkilisi") {
      navigate("erasmus");
    } else if (user.role === "professor") {
      navigate("sinav");
    } else {
      navigate("portal");
    }
  };

  const handleLogout = async () => {
    try {
      await FirebaseAuth.signOut();
    } catch (e) {
      console.error("Firebase Auth signOut error:", e);
    }
    setCurrentUser(null);
    localStorage.removeItem("caku_current_user");
    navigate("portal");
  };

  // ── Lazy Loading State ──
  const [loadedModules, setLoadedModules] = useState({});
  const [moduleLoading, setModuleLoading] = useState(false);

  // Routing Protection
  useEffect(() => {
    if (!currentUser) return;

    const allowedDeptModules = isDeptManager
      ? DEPARTMENT_MODULES.map(m => m.id)
      : isProfessor
        ? ["sinav", "formlar"]
        : isAdmin
          ? DEPARTMENT_MODULES.map(m => m.id)
          : ["erasmus", "projeler", "formlar"]; // student

    const allowedCommon = COMMON_MODULES.map(m => m.id);
    const allowedAdmin = isAdmin ? ADMIN_MODULES.map(m => m.id) : [];
    const allAllowed = [...allowedDeptModules, ...allowedCommon, ...allowedAdmin];

    if (!allAllowed.includes(route)) {
      if (isAdmin || isDeptManager) navigate("erasmus");
      else if (isProfessor) navigate("sinav");
      else navigate("portal");
    }
  }, [route, currentUser, isAdmin, isProfessor, isDeptManager, navigate]);

  // Lazy load module
  useEffect(() => {
    const lazyMod = window.__lazyModules?.[route];
    if (!lazyMod) return;

    const componentName = lazyMod.component;
    if (window[componentName]) {
      if (!loadedModules[route]) {
        setLoadedModules(prev => ({ ...prev, [route]: true }));
      }
      return;
    }

    setModuleLoading(true);
    lazyMod.loader().then(() => {
      setLoadedModules(prev => ({ ...prev, [route]: true }));
      setModuleLoading(false);
    }).catch(err => {
      console.error("Module load error:", err);
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
      <div style={{ minHeight: "100vh", background: C.bg }}>
        <style dangerouslySetInnerHTML={{ __html: sharedStyles.global }} />
        <LoginModal onLogin={handleLogin} />
      </div>
    );
  }

  // Render active module
  const renderModule = () => {
    if (moduleLoading) {
      return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "80px 20px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 36, height: 36, border: "3px solid #E5E1D8",
              borderTopColor: C.navy, borderRadius: "50%",
              animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
            }} />
            <p style={{ color: "#666", fontSize: 14 }}>Modül yükleniyor...</p>
            <style dangerouslySetInnerHTML={{ __html: "@keyframes spin { to { transform: rotate(360deg) } }" }} />
          </div>
        </div>
      );
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
        yazokulu: window.YazOkuluApp,
        portal: window.OgrenciPortaliApp,
        projeler: window.ProjeModuluApp,
        formlar: window.FormlarModuluApp,
        kullanici: window.KullaniciYonetimiApp,
        staj: window.StajModuluApp,
        dersprogrami: window.DersProgramiApp,
      };
      const FallbackComponent = fallback[route];
      if (FallbackComponent) return React.createElement(FallbackComponent, {
        currentUser,
        activeDepartment,
        departmentInfo: DEPARTMENTS.find(d => d.id === activeDepartment),
      });
      return (
        <div style={{ padding: "40px 16px", textAlign: "center", color: "#c00" }}>
          Modül yüklenemedi. Lütfen sayfayı yenileyin (Ctrl+Shift+R).
        </div>
      );
    }

    return React.createElement(Component, {
      currentUser,
      activeDepartment,
      departmentInfo: DEPARTMENTS.find(d => d.id === activeDepartment),
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F6", display: "flex", flexDirection: "column" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        ${sharedStyles.global}
        @keyframes spin { to { transform: rotate(360deg) } }
        /* Sidebar scrollbar */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }
      `}} />

      <TopHeader
        currentUser={currentUser}
        onLogout={handleLogout}
        isMobile={isMobile}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        activeDepartment={activeDepartment}
      />

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Sidebar
          activeDepartment={activeDepartment}
          onDepartmentChange={handleDepartmentChange}
          currentRoute={route}
          onNavigate={navigate}
          currentUser={currentUser}
          isMobile={isMobile}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main style={{
          flex: 1,
          minWidth: 0,
          padding: isMobile ? 12 : 24,
          overflowY: "auto",
        }}>
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            {renderModule()}
          </div>
        </main>
      </div>
    </div>
  );
}

// Export to window
window.AppShell = AppShell;
