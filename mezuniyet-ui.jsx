// ══════════════════════════════════════════════════════════════
// MEZUNİYET — ortak görünüm parçaları (tema: #105BFF · #FE8500 · #F0F0F0)
// Mezuniyet modülü ve Mezuniyet Kuralları aynı düğmeyi, kartı ve anahtarı
// kullansın diye tek yerde.
// ══════════════════════════════════════════════════════════════

export const R = {
  navy: '#0B2E73',
  mavi: '#105BFF',
  maviAcik: '#E8F0FF',
  turuncu: '#FE8500',
  turuncuAcik: '#FFF3E6',
  zemin: '#F0F0F0',
  metin: '#1F2329',
  soluk: '#5F6368',
  kenar: '#E2E2E2',
  sari: '#FEF3C7',
  sariKenar: '#F59E0B',
  yesil: '#059669',
  yesilAcik: '#ECFDF5',
  kirmizi: '#DC2626',
};

export const GIRDI = {
  width: '100%',
  padding: '9px 11px',
  border: '1px solid #D5D7DB',
  borderRadius: 9,
  fontSize: 13,
  fontFamily: 'inherit',
  color: R.metin,
  background: 'white',
  boxSizing: 'border-box',
  outline: 'none',
};

/** Düğme biçimi: birincil (mavi), turuncu (asıl ilerleme), yesil, ikincil, tehlike. */
export function dugme(tur, pasif) {
  const t = {
    birincil: { background: R.mavi, color: 'white', border: '1px solid ' + R.mavi },
    turuncu: { background: R.turuncu, color: 'white', border: '1px solid ' + R.turuncu },
    yesil: { background: R.yesil, color: 'white', border: '1px solid ' + R.yesil },
    ikincil: { background: 'white', color: R.navy, border: '1px solid #D5D7DB' },
    tehlike: { background: 'white', color: R.kirmizi, border: '1px solid #FCA5A5' },
  }[tur || 'ikincil'];
  return {
    ...t,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '9px 16px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.2,
    cursor: pasif ? 'not-allowed' : 'pointer',
    opacity: pasif ? 0.5 : 1,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  };
}

/** Açık/kapalı anahtarı (onay kutusu yerine). */
export function Anahtar({ acik, onDegis, etiket, pasif }) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        cursor: pasif ? 'not-allowed' : 'pointer',
        fontSize: 13,
        color: R.metin,
        opacity: pasif ? 0.6 : 1,
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={!!acik}
        disabled={pasif}
        onClick={() => onDegis && onDegis(!acik)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 999,
          border: 'none',
          padding: 2,
          background: acik ? R.mavi : '#CBD0D6',
          cursor: 'inherit',
          flexShrink: 0,
          transition: 'background 120ms',
        }}
      >
        <span
          style={{
            display: 'block',
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'white',
            transform: acik ? 'translateX(16px)' : 'none',
            transition: 'transform 120ms',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
        />
      </button>
      {etiket && <span>{etiket}</span>}
    </label>
  );
}

/** Numaralı bölüm kartı: başlık, tek satır açıklama, sağda isteğe bağlı öğe. */
export function BolumKarti({ no, baslik, aciklama, sag, children }) {
  return (
    <section
      style={{
        background: 'white',
        border: '1px solid ' + R.kenar,
        borderRadius: 14,
        padding: '18px 20px',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: children ? 16 : 0,
        }}
      >
        {no != null && (
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: R.maviAcik,
              color: R.mavi,
              fontWeight: 800,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {no}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: R.navy }}>{baslik}</h3>
          {aciklama && (
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: R.soluk, lineHeight: 1.5 }}>
              {aciklama}
            </p>
          )}
        </div>
        {sag || null}
      </div>
      {children}
    </section>
  );
}

/** Bilgi notu: bilgi · uyari · hata · basari. */
export function BilgiNotu({ tur, children }) {
  const t = {
    bilgi: { bg: R.maviAcik, kenar: '#C9D8FF', renk: R.navy },
    uyari: { bg: '#FFFBEB', kenar: '#FCD34D', renk: '#92400E' },
    hata: { bg: '#FEF2F2', kenar: '#FCA5A5', renk: '#B91C1C' },
    basari: { bg: R.yesilAcik, kenar: '#A7F3D0', renk: '#065F46' },
  }[tur || 'bilgi'];
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        background: t.bg,
        border: '1px solid ' + t.kenar,
        color: t.renk,
        fontSize: 12.5,
        lineHeight: 1.55,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

/** "← Listeye dön" — düğme değil, sade bağlantı. */
export function GeriDon({ onClick, metin }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: 'none',
        background: 'transparent',
        color: R.mavi,
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
        padding: '4px 0',
        marginBottom: 12,
        fontFamily: 'inherit',
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {metin || 'Listeye dön'}
    </button>
  );
}
