// ══════════════════════════════════════════════════════════════
// Patent & FSMH Takibi ekranları için küçük bir iç yönlendirici.
//
// Ekranlar ayrı uygulamada (mrtunahan/patent) react-router-dom ile yazılmıştı
// ve BİREBİR taşındı; kullanılan parçalar (Link, NavLink, useNavigate,
// useLocation, useParams, useMatch) burada aynı imzayla verilir.
//
// Adres çubuğu KULLANILMAZ: Offline Asistan modül seçimini `#patent` gibi bir
// hash ile yapıyor; iç sayfa yolu (/, /patents/3, /applicants …) bellekte
// tutulur ki kabuğun yönlendirmesi bozulmasın (tto-otomasyon/router.jsx ile
// aynı yaklaşım).
// ══════════════════════════════════════════════════════════════
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const YolBaglami = createContext(null);
const ParametreBaglami = createContext({});

function coz(hedef, state) {
  const s = String(hedef || '/');
  const i = s.indexOf('?');
  return {
    pathname: i >= 0 ? s.slice(0, i) || '/' : s,
    search: i >= 0 ? s.slice(i) : '',
    state: state === undefined ? null : state,
  };
}

export function BellekYonlendirici({ baslangic, children, onDegis }) {
  const [konum, setKonum] = useState(() => coz(baslangic));
  const navigate = useCallback(
    (hedef, secenek) => {
      if (typeof hedef === 'number') return;
      const yeni = coz(hedef, secenek && secenek.state);
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
  if (!b) throw new Error('Patent yönlendiricisi bulunamadı.');
  return b;
}

export function useNavigate() {
  return useYol().navigate;
}

export function useLocation() {
  return useYol().konum;
}

export function useParams() {
  return useContext(ParametreBaglami);
}

/** `/patents/:id` gibi bir kalıbı yola eşler; eşleşmezse null. */
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

export function useMatch(kalip) {
  const { konum } = useYol();
  const p = yolEslestir(kalip, konum.pathname);
  return p ? { params: p, pathname: konum.pathname } : null;
}

/** İlk eşleşen rotayı parametreleriyle çizer; hiçbiri eşleşmezse `bulunamadi`. */
export function Rotalar({ rotalar, bulunamadi }) {
  const { konum } = useYol();
  for (const r of rotalar) {
    const p = yolEslestir(r.yol, konum.pathname);
    if (p) {
      // Anahtar rota kalıbıdır (yol değil): /patents/3 → /patents/4 geçişinde
      // liste sayfası yeniden kurulmaz, yalnız çekmece değişir (orijinal davranış).
      return (
        <ParametreBaglami.Provider key={r.anahtar || r.yol} value={p}>
          {r.eleman}
        </ParametreBaglami.Provider>
      );
    }
  }
  return bulunamadi || null;
}

function tiklamaYonlendir(e, onClick, navigate, to) {
  if (onClick) onClick(e);
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  navigate(to);
}

export function Link({ to, onClick, children, ...geri }) {
  const navigate = useNavigate();
  return (
    <a href="#patent" {...geri} onClick={(e) => tiklamaYonlendir(e, onClick, navigate, to)}>
      {children}
    </a>
  );
}

export function NavLink({ to, end, className, onClick, children, ...geri }) {
  const { konum, navigate } = useYol();
  const yol = konum.pathname;
  const isActive = end
    ? yol === to
    : yol === to || yol.startsWith(to.endsWith('/') ? to : to + '/');
  const sinif = typeof className === 'function' ? className({ isActive }) : className;
  return (
    <a
      href="#patent"
      {...geri}
      className={sinif}
      onClick={(e) => tiklamaYonlendir(e, onClick, navigate, to)}
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
