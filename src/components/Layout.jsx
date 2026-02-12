import React, { useState } from 'react';
import { C } from '../constants/theme';
import logoImg from '../assets/logo.png';
import {
    HomeIcon,
    BookIcon,
    CalendarIcon,
    ChartIcon,
    UserIcon,
    BellIcon,
    SearchIcon,
    FilterIcon,
    LogOutIcon
} from './ui/Icons'; // We need to ensure all these icons are exported from Icons.jsx
import { Btn, Input } from './ui'; // Import from index

// Temporary placeholder for icons if they are not all in Icons.jsx yet
// In a real scenario, I'd check Icons.jsx content first. 
// For now, I'll assume they will be there or I'll add missing ones.

const FileTextIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
);

const NAV_ITEMS = [
    { id: "erasmus", label: "Erasmus Başvurusu", icon: <BookIcon />, adminOnly: false },
    { id: "sinav", label: "Sınav Otomasyonu", icon: <CalendarIcon />, adminOnly: false },
    { id: "muafiyet", label: "Ders Muafiyet", icon: <FileTextIcon />, adminOnly: false },
    { id: "portal", label: "Öğrenci Portalı", icon: <UserIcon />, adminOnly: false },
];

const Navbar = ({ currentRoute, onNavigate, currentUser, onLogout }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const isAdmin = currentUser?.role === 'admin';
    const isProfessor = currentUser?.role === 'professor';

    const visibleItems = NAV_ITEMS.filter(item => {
        if (isAdmin || isProfessor) return true;
        return !item.adminOnly;
    });

    return (
        <nav style={{
            background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyLight} 100%)`,
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      position: "sticky",
      top: 0,
      zIndex: 900,
    }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 80 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
             <div style={{
                width: 48, height: 48, borderRadius: 12, bg: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
             }}>
                 <img src={logoImg} alt="Logo" style={{ width: 40, height: 40, objectFit: "contain" }} />
             </div>
             <div>
               <h1 style={{ color: "white", fontSize: 18, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.2 }}>
                 Çankırı Karatekin Üniversitesi
               </h1>
               <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 500 }}>
                 Yönetim Paneli
               </div>
             </div>
          </div>

          {/* Desktop Nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {visibleItems.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: currentRoute === item.id ? "rgba(255,255,255,0.15)" : "transparent",
                  color: currentRoute === item.id ? "white" : "rgba(255,255,255,0.7)",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.2s ease",
                  border: currentRoute === item.id ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent"
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          {/* User Profile */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
             {/* Search box placeholder */}
             <div style={{ position: "relative", width: 240, display: "none" }}> {/* Hidden for now */}
               <SearchIcon style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)" }} />
               <input 
                 placeholder="Öğrenci veya belge ara..." 
                 style={{
                   width: "100%", height: 40, padding: "0 16px 0 40px",
                   borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)",
                   background: "rgba(0,0,0,0.2)", color: "white", fontSize: 13, outline: "none"
                 }}
               />
             </div>

             <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "right" }}>
                   <div style={{ color: "white", fontSize: 14, fontWeight: 600 }}>
                     {currentUser ? (currentUser.displayName || currentUser.email) : "Misafir"}
                   </div>
                   <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 500 }}>
                     {currentUser?.role === 'admin' ? "Yönetici" : "Kullanıcı"}
                   </div>
                </div>
                {currentUser && (
                  <Btn variant="ghost" small onClick={onLogout} style={{ color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.2)" }}>
                    Çıkış
                  </Btn>
                )}
             </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Layout = ({ children, currentRoute, onNavigate, currentUser, onLogout }) => {
  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <Navbar 
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        currentUser={currentUser}
        onLogout={onLogout}
      />
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
