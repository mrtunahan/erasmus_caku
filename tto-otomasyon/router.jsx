// ══════════════════════════════════════════════════════════════
// TTO Otomasyonu ekranları için küçük bir iç yönlendirici.
//
// Ekranlar orijinal uygulamada react-router-dom ile yazılmıştı ve BİREBİR
// taşındı; aynı adlı parçalar (Link, useNavigate, useParams, useLocation,
// useSearchParams, Navigate) burada aynı imzayla verilir, sayfaların koduna
// dokunmak gerekmez.
//
// Adres çubuğu KULLANILMAZ: Offline Asistan modül seçimini `#tto` gibi bir
// hash ile yapıyor; iç sayfa yolu (/, /records/new, /firms/3 …) bellekte
// tutulur ki kabuğun yönlendirmesi bozulmasın.
// ══════════════════════════════════════════════════════════════
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const YolBaglami = createContext(null);
const ParametreBaglami = createContext({});

function coz(hedef) {
  const s = String(hedef || '/');
  const i = s.indexOf('?');
  return { pathname: i >= 0 ? s.slice(0, i) || '/' : s, search: i >= 0 ? s.slice(i) : '' };
}

export function BellekYonlendirici({ baslangic, children, onDegis }) {
  const [konum, setKonum] = useState(() => coz(baslangic));
  const navigate = useCallback(
    (hedef) => {
      if (typeof hedef === 'number') return;
      const yeni = coz(hedef);
      setKonum(yeni);
      if (onDegis) onDegis(yeni);
    },
    [onDegis]
  );
  const deger = useMemo(() => ({ konum, navigate }), [konum, navigate]);
  return <YolBaglami.Provider value={deger}>{children}</YolBaglami.Provider>;
}

function useYol() {
  const b = useContext(YolBaglami);
  if (!b) throw new Error('TTO yönlendiricisi bulunamadı.');
  return b;
}

export function useNavigate() {
  return useYol().navigate;
}

export function useLocation() {
  return useYol().konum;
}

export function useSearchParams() {
  const { konum, navigate } = useYol();
  const params = useMemo(() => new URLSearchParams(konum.search), [konum.search]);
  const ayarla = useCallback(
    (yeni) => navigate(konum.pathname + '?' + new URLSearchParams(yeni).toString()),
    [konum.pathname, navigate]
  );
  return [params, ayarla];
}

export function useParams() {
  return useContext(ParametreBaglami);
}

/** `/firms/:id` gibi bir kalıbı yola eşler; eşleşmezse null. */
export function yolEslestir(kalip, yol) {
  const k = kalip.split('/').filter(Boolean);
  const y = yol.split('/').filter(Boolean);
  if (k.length !== y.length) return null;
  const p = {};
  for (let i = 0; i < k.length; i++) {
    if (k[i].charAt(0) === ':') p[k[i].slice(1)] = decodeURIComponent(y[i]);
    else if (k[i] !== y[i]) return null;
  }
  return p;
}

/** İlk eşleşen rotayı parametreleriyle çizer. */
export function Rotalar({ rotalar, varsayilan }) {
  const { konum } = useYol();
  for (const r of rotalar) {
    const p = yolEslestir(r.yol, konum.pathname);
    if (p) {
      return (
        <ParametreBaglami.Provider key={konum.pathname + konum.search} value={p}>
          {r.eleman}
        </ParametreBaglami.Provider>
      );
    }
  }
  return <Navigate to={varsayilan || '/'} replace />;
}

export function Link({ to, onClick, children, ...geri }) {
  const navigate = useNavigate();
  return (
    <a
      href="#tto"
      {...geri}
      onClick={(e) => {
        if (onClick) onClick(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

export function Navigate({ to }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to);
  }, [navigate, to]);
  return null;
}
