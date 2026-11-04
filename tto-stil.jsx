// ══════════════════════════════════════════════════════════════
// TTO modülünün ortak görünüm parçaları (tto-modulu.jsx ve tto-surec.jsx).
// ══════════════════════════════════════════════════════════════
import { TTO_DURUMLAR } from './lib/tto-talep.js';

const TC = (typeof window !== 'undefined' && window.C) || {};
export const T = {
  navy: TC.navy || '#0B2E73',
  metin: TC.text || '#1F2329',
  soluk: TC.textMuted || '#5F6368',
  kenar: TC.border || '#E2E2E2',
  kenarGiris: '#CFCFCF',
  yuzey: '#FFFFFF',
  zemin: '#F7F7F7',
  // Giriş sonrası paleti: zemin rengi kart (neumorfik), mavi ana renk.
  neu: '#F0F0F0',
  mavi: '#105BFF',
  turuncu: '#FE8500',
  vurgu: '#B45309',
  vurguSolgun: '#FEF3C7',
  birincil: '#0A47D1',
  tehlike: '#DC2626',
  basari: '#059669',
};

// TTO Otomasyonu dili: zeminle aynı renk, kabarık gölge, çerçevesiz.
const KABARIK = '5px 5px 12px rgba(0,0,0,0.07), -5px -5px 12px rgba(255,255,255,0.85)';
const KABARIK_KUCUK = '3px 3px 6px rgba(0,0,0,0.07), -3px -3px 6px rgba(255,255,255,0.85)';
const GOMUK = 'inset 3px 3px 7px rgba(0,0,0,0.07), inset -3px -3px 7px rgba(255,255,255,0.85)';

export const kart = {
  background: T.neu,
  border: 'none',
  boxShadow: KABARIK,
  borderRadius: 16,
  padding: 20,
  marginBottom: 16,
};
export const giris = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid transparent',
  boxShadow: GOMUK,
  borderRadius: 12,
  fontSize: 13.5,
  fontFamily: "'Inter', sans-serif",
  color: T.metin,
  background: T.neu,
  boxSizing: 'border-box',
};
export const etiket = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600,
  color: T.metin,
  marginBottom: 5,
};

export function dugme(tur) {
  const t = {
    birincil: { bg: T.mavi, fg: '#fff', bd: 'transparent', g: '0 4px 12px rgba(16,91,255,0.28)' },
    vurgu: { bg: T.turuncu, fg: '#1F2329', bd: 'transparent', g: '0 4px 12px rgba(254,133,0,0.3)' },
    basari: { bg: T.basari, fg: '#fff', bd: 'transparent', g: '0 4px 12px rgba(5,150,105,0.25)' },
    sessiz: { bg: T.neu, fg: T.metin, bd: 'transparent', g: KABARIK_KUCUK },
    tehlike: { bg: T.neu, fg: T.tehlike, bd: 'transparent', g: KABARIK_KUCUK },
  }[tur || 'sessiz'];
  // Bütün düğmeler (ve düğme gibi görünen bağlantılar) aynı yükseklikte:
  // yan yana dizildiklerinde hizalı dursun.
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    height: 38,
    padding: '0 16px',
    borderRadius: 12,
    border: `1px solid ${t.bd}`,
    boxShadow: t.g,
    background: t.bg,
    color: t.fg,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    fontFamily: "'Inter', sans-serif",
  };
}

/** Pasif düğme görünümü (tıklanamaz olduğu belli olsun). */
export const pasif = { opacity: 0.45, cursor: 'not-allowed' };

/** Kartın üst satırı: solda başlık (ve açıklama), sağda isteğe bağlı öğe. */
export function KartBaslik({ baslik, aciklama, sag }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: 14,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: T.navy }}>{baslik}</div>
        {aciklama && (
          <div style={{ fontSize: 12.5, color: T.soluk, marginTop: 3, lineHeight: 1.5 }}>
            {aciklama}
          </div>
        )}
      </div>
      {sag && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{sag}</div>}
    </div>
  );
}

/** Kartın alt eylem çubuğu: düğmeler sağa hizalı, birincil en sağda. */
export function Eylemler({ children, sol }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        flexWrap: 'wrap',
        marginTop: 16,
        paddingTop: 14,
        borderTop: `1px solid ${T.kenar}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{sol}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  );
}

export const metin = (v) => String(v == null ? '' : v).trim();

export function tarihTr(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function DurumCipi({ durum }) {
  const d = TTO_DURUMLAR[durum || 'taslak'] || TTO_DURUMLAR.taslak;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 700,
        color: d.renk,
        background: d.renk + '14',
        border: `1px solid ${d.renk}33`,
        whiteSpace: 'nowrap',
      }}
    >
      {d.label}
    </span>
  );
}

export function tarihSaatTr(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
