// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Lisansüstü Modülü
//   Yüksek Lisans / Doktora seviyeleri için Ders Programı ve Sınav
//   Otomasyonu'nu (aynı bileşenler) seviye filtresiyle barındırır.
//   Dersler sinav_dersler'de seviye alanıyla ayrışır; lisans modülleri
//   yalnız 'lisans', bu modül 'yukseklisans'/'doktora' gösterir.
//   Sade tasarım: ikon/rozet/gölge yok, düz segment kontroller.
// ══════════════════════════════════════════════════════════════

const { useState, useEffect } = React;

const LU = {
  primary: '#5B21B6',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#D8DCE3',
  surface: '#FFFFFF',
};

const LU_LEVELS = [
  { id: 'yukseklisans', label: 'Yüksek Lisans' },
  { id: 'doktora', label: 'Doktora' },
];
const LU_VIEWS = [
  { id: 'program', label: 'Ders Programı' },
  { id: 'sinav', label: 'Sınav Otomasyonu' },
];

// Düz segment kontrol — gradyan, gölge, ikon ve geçiş efekti yok
function LUSeg({ options, value, onChange }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        border: `1px solid ${LU.border}`,
        borderRadius: 8,
        overflow: 'hidden',
        background: LU.surface,
      }}
    >
      {options.map((o, i) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            style={{
              padding: '8px 18px',
              border: 'none',
              borderLeft: i > 0 ? `1px solid ${LU.border}` : 'none',
              background: active ? LU.primary : 'transparent',
              color: active ? '#fff' : LU.text,
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
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
  const levelLabel = (LU_LEVELS.find((l) => l.id === level) || {}).label || '';
  const viewLabel = (LU_VIEWS.find((v) => v.id === view) || {}).label || '';

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: LU.text }}>
      {/* Başlık — ortak banner */}
      {React.createElement(window.CakuBanner, {
        title: 'Lisansüstü — ' + viewLabel,
        subtitle: (departmentInfo?.name || 'Bölüm') + ' · ' + levelLabel,
      })}

      {/* Seviye + görünüm — tek satır, düz segment kontroller */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <LUSeg options={LU_LEVELS} value={level} onChange={setLevel} />
        <LUSeg options={LU_VIEWS} value={view} onChange={setView} />
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
          embedded
        />
      ) : (
        <Sinav
          key={'sinav_' + level}
          currentUser={currentUser}
          activeDepartment={activeDepartment}
          departmentInfo={departmentInfo}
          seviye={level}
          embedded
        />
      )}
    </div>
  );
}

window.LisansustuApp = LisansustuApp;
