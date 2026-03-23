// ══════════════════════════════════════════════════════════════
// Vite Entry Point - Lazy Loading Module System
// ══════════════════════════════════════════════════════════════
import React from 'react';
import ReactDOM from 'react-dom/client';

// React'i global yap (mevcut modüller window.React kullanıyor)
window.React = React;
window.ReactDOM = ReactDOM;

// ── Phase 1: Shared components (tüm modüller buna bağımlı) ──
import './shared-components.jsx';

// ── Phase 2: Lazy module loaders (sadece ihtiyaç olduğunda yüklenecek) ──
window.__lazyModules = {
  erasmus:   { loader: () => import('./erasmus-learning-agreement.jsx'), component: 'ErasmusLearningAgreementApp' },
  sinav:     { loader: () => import('./sinav-otomasyonu.jsx'),          component: 'SinavOtomasyonuApp' },
  muafiyet:  { loader: () => import('./ders-muafiyet.jsx'),             component: 'DersMuafiyetApp' },
  yazokulu:  { loader: () => import('./yaz-okulu.jsx'),                 component: 'YazOkuluApp' },
  portal:    { loader: () => import('./ogrenci-portali.jsx'),           component: 'OgrenciPortaliApp' },
  projeler:  { loader: () => import('./proje-modulu.jsx'),              component: 'ProjeModuluApp' },
  formlar:   { loader: () => import('./formlar-modulu.jsx'),            component: 'FormlarModuluApp' },
  kullanici: { loader: () => import('./kullanici-yonetimi.jsx'),        component: 'KullaniciYonetimiApp' },
  anket:     { loader: () => import('./anket-modulu.jsx'),              component: 'AnketModuluApp' },
  kaynaklar: { loader: () => import('./kaynak-kutuphanesi.jsx'),        component: 'KaynakKutuphanesiApp' },
};

// ── Phase 3: App Shell (routing & navigation) ──
import './app-shell.jsx';

// ── Phase 4: Error Boundary ──
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('React render error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F5F0', fontFamily: 'Inter, sans-serif', padding: 20 }}>
          <div style={{ textAlign: 'center', maxWidth: 500 }}>
            <h2 style={{ fontSize: 24, color: '#1B2A4A', marginBottom: 12 }}>Bir hata oluştu</h2>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>{this.state.error?.message || 'Beklenmeyen bir hata meydana geldi.'}</p>
            <button onClick={() => location.reload()} style={{ marginTop: 16, padding: '10px 24px', fontSize: 14, border: '1px solid #E5E1D8', background: '#1B2A4A', color: 'white', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Phase 5: Mount ──
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AppErrorBoundary>
    {React.createElement(window.AppShell)}
  </AppErrorBoundary>
);
