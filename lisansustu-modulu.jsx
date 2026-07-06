// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Lisansüstü Modülü
//   Yüksek Lisans / Doktora seviyeleri için Ders Programı ve Sınav
//   Otomasyonu'nu (aynı bileşenler) seviye filtresiyle barındırır.
//   Dersler sinav_dersler'de seviye alanıyla ayrışır; lisans modülleri
//   yalnız 'lisans', bu modül 'yukseklisans'/'doktora' gösterir.
// ══════════════════════════════════════════════════════════════

const { useState, useEffect } = React;

const LU = {
  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#EAECF0',
  surface: '#FFFFFF',
  bg: '#F6F7F9',
  grad: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
};

const LU_LEVELS = [
  { id: 'yukseklisans', label: 'Yüksek Lisans' },
  { id: 'doktora', label: 'Doktora' },
];
const LU_VIEWS = [
  {
    id: 'program',
    label: 'Ders Programı',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'sinav',
    label: 'Sınav Otomasyonu',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
];

function LUIcon({ path, size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

function LisansustuApp({ currentUser, activeDepartment, departmentInfo }) {
  const [ready, setReady] = useState(!!(window.SinavOtomasyonuApp && window.DersProgramiApp));
  const [level, setLevel] = useState('yukseklisans');
  const [view, setView] = useState('program');

  useEffect(() => {
    if (ready) return;
    let alive = true;
    Promise.all([import('./ders-programi.jsx'), import('./sinav-otomasyonu.jsx')])
      .then(() => alive && setReady(true))
      .catch(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [ready]);

  const Program = window.DersProgramiApp;
  const Sinav = window.SinavOtomasyonuApp;

  const pill = (active) => ({
    padding: '7px 16px',
    borderRadius: 9,
    border: 'none',
    background: active ? LU.grad : 'transparent',
    color: active ? '#fff' : LU.textMuted,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    boxShadow: active ? '0 2px 6px rgba(124,58,237,0.30)' : 'none',
    transition: 'all .15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  });

  const levelLabel = (LU_LEVELS.find((l) => l.id === level) || {}).label || '';

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: LU.text }}>
      {/* Başlık */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 13,
            background: LU.grad,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
            boxShadow: '0 6px 16px rgba(124,58,237,0.28)',
          }}
        >
          <LUIcon
            path="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.42a12 12 0 01.84 4.42c0 3.31-3.13 6-7 6s-7-2.69-7-6c0-1.55.42-3.04 1.16-4.42L12 14z"
            size={22}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            Lisansüstü
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: LU.textMuted }}>
            {departmentInfo?.name || 'Bölüm'} — {levelLabel} · ders programı ve sınav otomasyonu
          </p>
        </div>
      </div>

      {/* Seviye seçici (Yüksek Lisans / Doktora) */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'inline-flex',
            gap: 2,
            padding: 4,
            background: LU.surface,
            border: `1px solid ${LU.border}`,
            borderRadius: 12,
            boxShadow: '0 1px 2px rgba(16,24,40,0.05)',
          }}
        >
          {LU_LEVELS.map((l) => (
            <button key={l.id} onClick={() => setLevel(l.id)} style={pill(level === l.id)}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Görünüm sekmeleri (Ders Programı / Sınav) */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'inline-flex',
            gap: 2,
            padding: 4,
            background: LU.surface,
            border: `1px solid ${LU.border}`,
            borderRadius: 12,
            boxShadow: '0 1px 2px rgba(16,24,40,0.05)',
          }}
        >
          {LU_VIEWS.map((v) => (
            <button key={v.id} onClick={() => setView(v.id)} style={pill(view === v.id)}>
              <LUIcon path={v.icon} size={15} /> {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* İçerik — seviye değişince remount (key) → veriler yeniden yüklenir */}
      {!ready || !Program || !Sinav ? (
        <div style={{ padding: 50, textAlign: 'center', color: LU.textMuted, fontSize: 14 }}>
          Modüller yükleniyor…
        </div>
      ) : view === 'program' ? (
        <Program
          key={'program_' + level}
          currentUser={currentUser}
          activeDepartment={activeDepartment}
          departmentInfo={departmentInfo}
          seviye={level}
        />
      ) : (
        <Sinav
          key={'sinav_' + level}
          currentUser={currentUser}
          activeDepartment={activeDepartment}
          departmentInfo={departmentInfo}
          seviye={level}
        />
      )}
    </div>
  );
}

window.LisansustuApp = LisansustuApp;
