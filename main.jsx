// ══════════════════════════════════════════════════════════════
// Vite Entry Point - Lazy Loading Module System
// ══════════════════════════════════════════════════════════════
import React from 'react';
import ReactDOM from 'react-dom/client';

// Tailwind + tasarım sistemi temel CSS
import './index.css';

// React'i global yap (mevcut modüller window.React kullanıyor)
window.React = React;
window.ReactDOM = ReactDOM;

// ── Phase 1: Shared components (tüm modüller buna bağımlı) ──
import './shared-components.jsx';

// ── Phase 1.5: Gerçek zamanlı (Socket.IO) — opsiyonel & dayanıklı ──
// Sunucu yazma yapınca her açık istemci ilgili cache'i geçersiz kılar,
// modüller `realtime:<collection>` CustomEvent'ini dinler. Bağlantı
// kurulamazsa uygulama 15 sn TTL cache + manuel ile çalışmaya devam eder.
(async () => {
  try {
    const { io } = await import('socket.io-client');
    // transports: ['websocket'] — yalnızca WS kullan; WS koptuğunda eski sid
    // ile polling fallback denenip 400 (unknown session) hatası üretmesini önler.
    const socket = io({
      path: '/socket.io',
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      transports: ['websocket'],
    });
    window.__socket = socket;
    socket.on('connect', () => {
      console.info('[realtime] bağlandı');
    });
    socket.on('disconnect', () => {
      /* sessiz */
    });
    socket.on('db:write', (payload) => {
      const cols = (payload && payload.collections) || [];
      cols.forEach((c) => {
        if (window.apiInvalidate) window.apiInvalidate(c);
        try {
          window.dispatchEvent(new CustomEvent('realtime:' + c, { detail: payload }));
        } catch (_) {}
      });
      try {
        window.dispatchEvent(new CustomEvent('realtime:any', { detail: payload }));
      } catch (_) {}
    });
  } catch (e) {
    console.warn('[realtime] socket.io-client yüklenemedi, gerçek zamanlı devre dışı:', e?.message);
  }
})();

// ── Phase 2: Lazy module loaders (sadece ihtiyaç olduğunda yüklenecek) ──
window.__lazyModules = {
  erasmus: {
    loader: () => import('./erasmus-learning-agreement.jsx'),
    component: 'ErasmusLearningAgreementApp',
  },
  sinav: { loader: () => import('./sinav-otomasyonu.jsx'), component: 'SinavOtomasyonuApp' },
  dersyonetimi: {
    loader: () => import('./ders-yonetimi-modulu.jsx'),
    component: 'DersYonetimiModuluApp',
  },
  bolumyonetimi: {
    loader: () => import('./bolum-yonetimi-modulu.jsx'),
    component: 'BolumYonetimiModuluApp',
  },
  muafiyet: { loader: () => import('./ders-muafiyet.jsx'), component: 'DersMuafiyetApp' },

  portal: { loader: () => import('./ogrenci-portali.jsx'), component: 'OgrenciPortaliApp' },
  projeler: { loader: () => import('./proje-modulu.jsx'), component: 'ProjeModuluApp' },
  formlar: { loader: () => import('./formlar-modulu.jsx'), component: 'FormlarModuluApp' },
  kullanici: {
    loader: () => import('./kullanici-yonetimi.jsx'),
    component: 'KullaniciYonetimiApp',
  },
  kaynaklar: {
    loader: () => import('./kaynak-kutuphanesi.jsx'),
    component: 'KaynakKutuphanesiApp',
  },
  staj: { loader: () => import('./staj-modulu.jsx'), component: 'StajModuluApp' },
  dersprogrami: { loader: () => import('./ders-programi.jsx'), component: 'DersProgramiApp' },
  akademisyen: {
    loader: () => import('./akademisyen-modulu.jsx'),
    component: 'AkademisyenModuluApp',
  },
  roadmaps: { loader: () => import('./roadmaps-module.jsx'), component: 'RoadmapsModuleApp' },
  komisyonlar: {
    loader: () => import('./komisyonlar-modulu.jsx'),
    component: 'KomisyonlarModuluApp',
  },
  benim: { loader: () => import('./benim-sayfam.jsx'), component: 'BenimSayfamApp' },
  performans: {
    loader: () => import('./performans_bilgileri_modul.jsx'),
    component: 'PerformansBilgileriApp',
  },
  audit: { loader: () => import('./audit-log-modulu.jsx'), component: 'AuditLogModuluApp' },
  akademiktakvim: {
    loader: () => import('./akademik-takvim-modulu.jsx'),
    component: 'AkademikTakvimApp',
  },
  kulupler: {
    loader: () => import('./ogrenci-kulupleri-modulu.jsx'),
    component: 'OgrenciKulupleriApp',
  },
  anket: {
    loader: () => import('./anket-modulu.jsx'),
    component: 'AnketModulu',
  },
  univ: {
    loader: () => import('./unv-yonetimi-modulu.jsx'),
    component: 'UnvYonetimiApp',
  },
  fakulte: {
    loader: () => import('./fak-yonetimi-modulu.jsx'),
    component: 'FakYonetimiApp',
  },
};

// ── Phase 3: App Shell (routing & navigation) ──
import './app-shell.jsx';

// ── Phase 4: Error Boundary ──
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('React render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F7F5F0',
            fontFamily: 'Inter, sans-serif',
            padding: 20,
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 500 }}>
            <h2 style={{ fontSize: 24, color: '#1B2A4A', marginBottom: 12 }}>Bir hata oluştu</h2>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>
              {this.state.error?.message || 'Beklenmeyen bir hata meydana geldi.'}
            </p>
            <button
              onClick={() => location.reload()}
              style={{
                marginTop: 16,
                padding: '10px 24px',
                fontSize: 14,
                border: '1px solid #E5E1D8',
                background: '#1B2A4A',
                color: 'white',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
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
root.render(<AppErrorBoundary>{React.createElement(window.AppShell)}</AppErrorBoundary>);
