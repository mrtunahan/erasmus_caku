// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Ana Kabuk (App Shell)
// Hash-tabanlı yönlendirme, navigasyon ve kimlik doğrulama
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useCallback } = React;

// ── Shared bilesenlerden import (window uzerinden) ──
const C = window.C;
const sharedStyles = window.sharedStyles;
const LoginModal = window.LoginModal;

// ── Responsive Hook (throttled with rAF) ──
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
function useHashRoute(defaultRoute = "erasmus") {
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

// ── Navigation Items ──
const NAV_ITEMS = [
  { id: "erasmus", label: "Erasmus Learning Agreement", icon: "M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" },
  { id: "sinav", label: "Sınav Otomasyonu", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01", adminOnly: true },
  { id: "muafiyet", label: "Ders Muafiyet", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", adminOnly: true },
  { id: "yazokulu", label: "Yaz Okulu", icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z", adminOnly: true },
  { id: "portal", label: "Öğrenci Portalı", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { id: "projeler", label: "Proje", icon: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" },
  { id: "formlar", label: "Formlar", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "kullanici", label: "Kullanıcı Yönetimi", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z", adminOnly: true },
];

// ── Navigation Bar ──
const NavigationBar = ({ currentRoute, onNavigate, currentUser, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth <= 1024;
  const isAdmin = currentUser?.role === 'admin';
  const isProfessor = currentUser?.role === 'professor';

  // Sadece erişilebilir sekmeleri göster (kilitli olanları gizle)
  const visibleItems = NAV_ITEMS.filter(item => {
    if (isAdmin) return true;
    if (isProfessor) return ['sinav', 'formlar'].includes(item.id);
    // Öğrenci - tüm öğrenciler erasmus modülünü görebilir (yetkisiz olanlar salt okunur)
    const allowed = ['erasmus', 'portal', 'projeler', 'formlar'];
    return allowed.includes(item.id);
  });

  // Mobil menü açıkken body scroll engelle
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  return (
    <nav style={{
      background: "linear-gradient(135deg, #1B2A4A 0%, #2D4A7A 100%)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      position: "sticky",
      top: 0,
      zIndex: 900,
    }}>
      <div style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: isMobile ? "0 16px" : "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: isMobile ? 64 : 96,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
          <img src="logo.png" alt="Logo" style={{
            width: isMobile ? 40 : 56, height: isMobile ? 40 : 56, borderRadius: isMobile ? 8 : 10,
            objectFit: "cover"
          }} />
          <div>
            <div style={{ color: "white", fontSize: isMobile ? 14 : 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", letterSpacing: "0.02em" }}>
              Online Assistant
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: isMobile ? 10 : 11 }}>
              Çankırı Karatekin Üniversitesi
            </div>
          </div>
        </div>

        {/* Desktop Nav Tabs */}
        {!isMobile && (
          <div className="nav-tabs-desktop" style={{ display: "flex", gap: 2, height: "100%", flexWrap: "wrap", alignItems: "center" }}>
            {visibleItems.map(item => {
              const isActive = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  style={{
                    padding: "0 10px",
                    border: "none",
                    background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                    color: isActive ? "white" : "rgba(255,255,255,0.7)",
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 400,
                    cursor: "pointer",
                    fontFamily: "'Source Sans 3', sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    borderBottom: isActive ? "3px solid #C4973B" : "3px solid transparent",
                    transition: "all 0.2s",
                    height: "100%",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Desktop User Info */}
        {!isMobile && (
          <div className="nav-user-desktop" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "white", fontSize: 14, fontWeight: 600 }}>
                {currentUser?.name || "Kullanıcı"}
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                {currentUser?.role === "admin" ? "Admin"
                  : currentUser?.role === "professor" ? "Akademisyen"
                    : `Öğrenci (${currentUser?.studentNumber || ""})`}
              </div>
            </div>
            <button
              onClick={onLogout}
              style={{
                padding: "8px 16px",
                border: "1px solid rgba(255,255,255,0.3)",
                background: "transparent",
                color: "rgba(255,255,255,0.8)",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
            >
              Çıkış Yap
            </button>
          </div>
        )}

        {/* Mobile Hamburger Button */}
        {isMobile && (
          <button
            className="nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 44, height: 44, border: "none", borderRadius: 10,
              background: mobileMenuOpen ? "rgba(255,255,255,0.15)" : "transparent",
              cursor: "pointer", transition: "all 0.2s",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen
                ? <path d="M18 6L6 18M6 6l12 12" />
                : <><path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" /></>
              }
            </svg>
          </button>
        )}
      </div>

      {/* Mobile Menu Panel */}
      {isMobile && mobileMenuOpen && (
        <>
          <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-menu-panel">
            {/* Kullanıcı bilgisi */}
            <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ color: "white", fontSize: 16, fontWeight: 600 }}>
                {currentUser?.name || "Kullanıcı"}
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>
                {currentUser?.role === "admin" ? "Admin"
                  : currentUser?.role === "professor" ? "Akademisyen"
                    : `Öğrenci (${currentUser?.studentNumber || ""})`}
              </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: "8px 0" }}>
              {visibleItems.map(item => {
                const isActive = currentRoute === item.id;
                return (
                  <button
                    key={item.id}
                    className={`mobile-menu-item ${isActive ? "mobile-menu-item-active" : ""}`}
                    onClick={() => { onNavigate(item.id); setMobileMenuOpen(false); }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={item.icon} />
                    </svg>
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Çıkış Yap */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 8 }}>
              <button
                onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                style={{
                  width: "100%", padding: "12px 16px", border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(139,38,53,0.3)", color: "rgba(255,255,255,0.9)",
                  borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontFamily: "'Source Sans 3', sans-serif",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Çıkış Yap
              </button>
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

// ── Main App Shell ──
function AppShell() {
  const [route, navigate] = useHashRoute("erasmus");
  const [currentUser, setCurrentUser] = useState(null);

  // Restore session from localStorage + Firebase Auth state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("caku_current_user");
      if (saved) {
        setCurrentUser(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Session restore error:", e);
    }

    // Firebase Auth oturum dinleyicisi
    const auth = window.firebase?.auth();
    if (auth) {
      const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
        if (!firebaseUser) {
          // Firebase Auth oturumu kapandı, localStorage'ı da temizle
          const current = localStorage.getItem("caku_current_user");
          if (current) {
            setCurrentUser(null);
            localStorage.removeItem("caku_current_user");
          }
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const isAdmin = currentUser?.role === 'admin';
  const isProfessor = currentUser?.role === 'professor';

  // Öğrencilerin erişebileceği modüller (tüm öğrenciler erasmus'u görebilir, yetkisiz olanlar salt okunur)
  const hasErasmusAccess = currentUser?.erasmusAccess === true;
  const STUDENT_ALLOWED_ROUTES = ['erasmus', 'portal', 'projeler', 'formlar'];

  const handleLogin = (user) => {
    setCurrentUser(user);
    // localStorage'a sadece minimum oturum bilgisi kaydet (hassas veri saklanmaz)
    const safeUser = { role: user.role, name: user.name, studentNumber: user.studentNumber || null };
    localStorage.setItem("caku_current_user", JSON.stringify(safeUser));

    // Redirect based on role immediately after login
    if (user.role === 'professor') {
      navigate('sinav');
    } else if (user.role === 'admin') {
      // Admin stays on current or goes to default
    } else {
      // Student: tüm öğrenciler erasmus modülünü görüntüleyebilir
      const studentRoutes = ['erasmus', 'portal', 'projeler', 'formlar'];
      if (!studentRoutes.includes(route)) {
        navigate('erasmus');
      }
    }
  };

  const handleLogout = async () => {
    // Firebase Auth oturumunu kapat
    try {
      await FirebaseAuth.signOut();
    } catch (e) {
      console.error("Firebase Auth signOut error:", e);
    }
    setCurrentUser(null);
    localStorage.removeItem("caku_current_user");
    navigate('portal'); // Reset route on logout
  };

  // Routing Protection
  useEffect(() => {
    if (!currentUser) return;

    if (isProfessor) {
      // Professors can access 'sinav' and 'formlar'
      const professorRoutes = ['sinav', 'formlar'];
      if (!professorRoutes.includes(route)) {
        navigate('sinav');
      }
    } else if (!isAdmin) {
      // Students can only access allowed routes
      if (!STUDENT_ALLOWED_ROUTES.includes(route)) {
        navigate('erasmus');
      }
    }
  }, [route, isAdmin, isProfessor, currentUser, navigate]);

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
    const components = {
      erasmus: window.ErasmusLearningAgreementApp,
      sinav: window.SinavOtomasyonuApp,
      muafiyet: window.DersMuafiyetApp,
      yazokulu: window.YazOkuluApp,
      portal: window.OgrenciPortaliApp,
      projeler: window.ProjeModuluApp,
      formlar: window.FormlarModuluApp,
      kullanici: window.KullaniciYonetimiApp,
    };

    // Safety check for rendering availability
    if (isProfessor && !['sinav', 'formlar'].includes(route)) return null; // Wait for redirect
    if (!isAdmin && !isProfessor && !STUDENT_ALLOWED_ROUTES.includes(route)) return null; // Wait for redirect

    const Component = components[route] || components.erasmus;
    if (!Component) {
      return <div style={{ padding: "40px 16px", textAlign: "center", color: "#c00" }}>Modül yüklenemedi. Lütfen sayfayı yenileyin (Ctrl+Shift+R).</div>;
    }
    return React.createElement(Component, { currentUser });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <style dangerouslySetInnerHTML={{ __html: sharedStyles.global }} />
      <NavigationBar
        currentRoute={route}
        onNavigate={navigate}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <div className="app-content-wrap" style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
        {renderModule()}
      </div>
    </div>
  );
}

// Export to window
window.AppShell = AppShell;
