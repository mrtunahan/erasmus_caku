// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Ana Kabuk (App Shell)
// Hash-tabanlı yönlendirme, navigasyon ve kimlik doğrulama
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useCallback } = React;

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
  { id: "sinav", label: "Sinav Otomasyonu", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
];

// ── Navigation Bar ──
const NavigationBar = ({ currentRoute, onNavigate, currentUser, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 64,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 700, color: "#C4973B",
            fontFamily: "'Playfair Display', serif",
          }}>C</div>
          <div>
            <div style={{ color: "white", fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", letterSpacing: "0.02em" }}>
              CAKU Yonetim Sistemi
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
              Cankiri Karatekin Universitesi
            </div>
          </div>
        </div>

        {/* Nav Tabs */}
        <div style={{ display: "flex", gap: 4, height: "100%" }}>
          {NAV_ITEMS.map(item => {
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  padding: "0 20px",
                  border: "none",
                  background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                  color: isActive ? "white" : "rgba(255,255,255,0.7)",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: "'Source Sans 3', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  borderBottom: isActive ? "3px solid #C4973B" : "3px solid transparent",
                  transition: "all 0.2s",
                  height: "100%",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </button>
            );
          })}
        </div>

        {/* User Info */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "white", fontSize: 14, fontWeight: 600 }}>
              {currentUser?.name || "Kullanici"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
              {currentUser?.role === "admin" ? "Admin" : `Ogrenci (${currentUser?.studentNumber || ""})`}
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
            Cikis Yap
          </button>
        </div>
      </div>
    </nav>
  );
};

// ── Main App Shell ──
function AppShell() {
  const [route, navigate] = useHashRoute("erasmus");
  const [currentUser, setCurrentUser] = useState(null);

  // Restore session from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("caku_current_user");
      if (saved) {
        setCurrentUser(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Session restore error:", e);
    }
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem("caku_current_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("caku_current_user");
  };

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
    switch (route) {
      case "erasmus":
        return React.createElement(window.ErasmusLearningAgreementApp, { currentUser });
      case "sinav":
        return React.createElement(window.SinavOtomasyonuApp, { currentUser });
      default:
        return React.createElement(window.ErasmusLearningAgreementApp, { currentUser });
    }
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
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
        {renderModule()}
      </div>
    </div>
  );
}

// Export to window
window.AppShell = AppShell;
