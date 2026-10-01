// ══════════════════════════════════════════════════════════════
// TTO modülünün ortak görünüm parçaları (tto-modulu.jsx ve tto-surec.jsx).
// ══════════════════════════════════════════════════════════════
import { TTO_DURUMLAR } from './lib/tto-talep.js';

const TC = (typeof window !== 'undefined' && window.C) || {};
export const T = {
  navy: TC.navy || '#1B2A4A',
  metin: TC.text || '#1F2937',
  soluk: TC.textMuted || '#64748B',
  kenar: TC.border || '#E5E7EB',
  kenarGiris: '#D1D5DB',
  yuzey: '#FFFFFF',
  zemin: '#F8FAFC',
  vurgu: '#B45309',
  vurguSolgun: '#FEF3C7',
  birincil: '#1D4ED8',
  tehlike: '#DC2626',
  basari: '#059669',
};

export const kart = {
  background: T.yuzey,
  border: `1px solid ${T.kenar}`,
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};
export const giris = {
  width: '100%',
  padding: '9px 11px',
  border: `1px solid ${T.kenarGiris}`,
  borderRadius: 8,
  fontSize: 13.5,
  fontFamily: "'Inter', sans-serif",
  color: T.metin,
  background: T.yuzey,
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
    birincil: { bg: T.navy, fg: '#fff', bd: T.navy },
    vurgu: { bg: T.birincil, fg: '#fff', bd: T.birincil },
    sessiz: { bg: T.yuzey, fg: T.metin, bd: T.kenarGiris },
    tehlike: { bg: T.yuzey, fg: T.tehlike, bd: '#FCA5A5' },
  }[tur || 'sessiz'];
  return {
    padding: '9px 16px',
    borderRadius: 8,
    border: `1px solid ${t.bd}`,
    background: t.bg,
    color: t.fg,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  };
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
