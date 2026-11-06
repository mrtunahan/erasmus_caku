// ══════════════════════════════════════════════════════════════
// GENEL ARAMA — üst banttaki "Ara" düğmesi ve Ctrl+K penceresi
//
// Modüller, işlemler ve (personel için) öğrenciler tek kutudan aranır.
// YETKİ TAŞIMAZ (ayrıntı lib/genel-arama.js başında):
//   • modüller: yalnız sol menüde görünenler (window.__geriBildirimModulleri,
//     Sidebar her çizimde günceller)
//   • işlemler: üst bandın verdiği, kullanıcıya zaten açık işlemler
//   • öğrenciler: sunucunun okuma kapsamıyla süzülmüş liste; öğrenci ve
//     aday için istek hiç atılmaz (sunucu da boş döner)
// ══════════════════════════════════════════════════════════════
import { modulSonuclari, islemSonuclari, ogrenciAramasiAcikMi } from './lib/genel-arama.js';

const LACIVERT = '#0B2341';
const VURGU = '#105BFF';

const Ikon = ({ d, boyut = 18 }) => (
  <svg
    width={boyut}
    height={boyut}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <path d={d} />
  </svg>
);
const IKON_ARA = 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm10 3-5.2-5.2';
const IKON_OGRENCI = 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z';
const IKON_ISLEM = 'M13 10V3L4 14h7v7l9-11h-7z';

function modulIkonu(id) {
  const tumu = []
    .concat(window.DEPARTMENT_MODULES || [])
    .concat(window.COMMON_MODULES || [])
    .concat(window.ADMIN_MODULES || [])
    .concat(window.HIERARCHY_MODULES || []);
  const m = tumu.find((x) => x.id === id);
  return (m && m.icon) || 'M4 6h16M4 12h16M4 18h16';
}

async function ogrenciGetir(q, sinyal) {
  const url = new URL('/api/db/genel-arama/ogrenci', window.location.origin);
  url.searchParams.set('q', q);
  const token = localStorage.getItem('caku_auth_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const r = await fetch(url.toString(), { headers, credentials: 'include', signal: sinyal });
  if (!r.ok) return [];
  const d = await r.json().catch(() => ({}));
  return Array.isArray(d.ogrenciler) ? d.ogrenciler : [];
}

const bolumAdi = (id) => {
  const d = (window.DEPARTMENTS || []).find((x) => x.id === id);
  return d ? d.name : id || '';
};

function AramaPenceresi({ currentUser, islemler, onNavigate, onKapat }) {
  const [q, setQ] = React.useState('');
  const [secili, setSecili] = React.useState(0);
  const [ogrenciler, setOgrenciler] = React.useState([]);
  const [ogrenciYukleniyor, setOgrenciYukleniyor] = React.useState(false);
  const [ogrenciAyrinti, setOgrenciAyrinti] = React.useState(null);
  const [kopyalandi, setKopyalandi] = React.useState(false);
  const girdi = React.useRef(null);
  const liste = React.useRef(null);
  const ogrenciAcik = ogrenciAramasiAcikMi(currentUser);

  React.useEffect(() => {
    if (girdi.current) girdi.current.focus();
  }, []);

  // Öğrenci araması — yazmayı bekleyip tek istek.
  React.useEffect(() => {
    const aranan = q.trim();
    if (!ogrenciAcik || aranan.length < 2) {
      setOgrenciler([]);
      setOgrenciYukleniyor(false);
      return undefined;
    }
    const kontrol = new AbortController();
    setOgrenciYukleniyor(true);
    const t = setTimeout(() => {
      ogrenciGetir(aranan, kontrol.signal)
        .then((l) => setOgrenciler(l))
        .catch(() => {})
        .finally(() => setOgrenciYukleniyor(false));
    }, 250);
    return () => {
      clearTimeout(t);
      kontrol.abort();
    };
  }, [q, ogrenciAcik]);

  const moduller = modulSonuclari(window.__geriBildirimModulleri || [], q).slice(0, q ? 8 : 12);
  const islemSonuc = islemSonuclari(islemler, q).slice(0, q ? 6 : 4);
  const gruplar = [
    { baslik: 'Modüller', ogeler: moduller },
    { baslik: 'İşlemler', ogeler: islemSonuc },
    ...(ogrenciAcik
      ? [
          {
            baslik: 'Öğrenciler',
            ogeler: ogrenciler.map((o) => ({ tur: 'ogrenci', id: 'o-' + o.no, ...o })),
          },
        ]
      : []),
  ].filter((g) => g.ogeler.length > 0);
  const duz = gruplar.flatMap((g) => g.ogeler);

  React.useEffect(() => setSecili(0), [q]);
  React.useEffect(() => {
    const el = liste.current && liste.current.querySelector('[data-secili="1"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [secili]);

  const sec = (oge) => {
    if (!oge) return;
    if (oge.tur === 'modul') {
      onNavigate(oge.id);
      onKapat();
    } else if (oge.tur === 'islem') {
      onKapat();
      if (oge.calistir) oge.calistir();
    } else if (oge.tur === 'ogrenci') {
      setOgrenciAyrinti(oge);
      setKopyalandi(false);
    }
  };

  const tus = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (ogrenciAyrinti) setOgrenciAyrinti(null);
      else onKapat();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSecili((s) => Math.min(duz.length - 1, s + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSecili((s) => Math.max(0, s - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      sec(duz[secili]);
    }
  };

  let sira = -1;
  return (
    <div
      className="ga-ortu"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onKapat();
      }}
      role="presentation"
    >
      <div className="ga-pencere" role="dialog" aria-modal="true" aria-label="Genel arama">
        <div className="ga-girdi-satir">
          <Ikon d={IKON_ARA} boyut={20} />
          <input
            ref={girdi}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOgrenciAyrinti(null);
            }}
            onKeyDown={tus}
            placeholder={
              ogrenciAcik ? 'Modül, işlem, öğrenci adı veya numarası ara…' : 'Modül veya işlem ara…'
            }
            aria-label="Ara"
            data-genel-arama-girdi
          />
          <kbd className="ga-kbd">Esc</kbd>
        </div>

        {ogrenciAyrinti ? (
          <div className="ga-ayrinti" data-ogrenci-ayrinti>
            <button type="button" className="ga-geri" onClick={() => setOgrenciAyrinti(null)}>
              ← Sonuçlara dön
            </button>
            <div className="ga-ayrinti-ust">
              <div className="ga-avatar">{(ogrenciAyrinti.ad || '?').slice(0, 1)}</div>
              <div>
                <div className="ga-ayrinti-ad">{ogrenciAyrinti.ad}</div>
                <div className="ga-ayrinti-alt">
                  {ogrenciAyrinti.no} · {bolumAdi(ogrenciAyrinti.bolum)}
                  {ogrenciAyrinti.sinif ? ` · ${ogrenciAyrinti.sinif}. sınıf` : ''}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="ga-dugme"
              onClick={() => {
                try {
                  navigator.clipboard.writeText(ogrenciAyrinti.no);
                  setKopyalandi(true);
                } catch (_e) {
                  /* pano izni yoksa sessiz */
                }
              }}
            >
              {kopyalandi ? 'Kopyalandı ✓' : 'Öğrenci numarasını kopyala'}
            </button>
          </div>
        ) : (
          <div className="ga-liste" ref={liste}>
            {gruplar.map((g) => (
              <div key={g.baslik}>
                <div className="ga-grup">{g.baslik}</div>
                {g.ogeler.map((oge) => {
                  sira += 1;
                  const benim = sira;
                  const aktif = benim === secili;
                  return (
                    <button
                      type="button"
                      key={oge.tur + oge.id}
                      className={`ga-oge${aktif ? ' ga-oge-aktif' : ''}`}
                      data-secili={aktif ? '1' : '0'}
                      data-ga-tur={oge.tur}
                      onMouseEnter={() => setSecili(benim)}
                      onClick={() => sec(oge)}
                    >
                      <span className="ga-oge-ikon">
                        <Ikon
                          d={
                            oge.tur === 'modul'
                              ? modulIkonu(oge.id)
                              : oge.tur === 'ogrenci'
                                ? IKON_OGRENCI
                                : oge.ikon || IKON_ISLEM
                          }
                        />
                      </span>
                      <span className="ga-oge-ad">{oge.ad}</span>
                      <span className="ga-oge-ipucu">
                        {oge.tur === 'modul'
                          ? oge.ipucu
                            ? `“${oge.ipucu}”`
                            : 'Modül'
                          : oge.tur === 'ogrenci'
                            ? `${oge.no} · ${bolumAdi(oge.bolum)}`
                            : oge.ipucu || ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
            {duz.length === 0 && !ogrenciYukleniyor && (
              <div className="ga-bos">
                “{q}” için sonuç yok.
                {!ogrenciAcik ? '' : ' Öğrenci aramak için ad ya da numara yazın.'}
              </div>
            )}
            {ogrenciYukleniyor && <div className="ga-bos">Öğrenciler aranıyor…</div>}
          </div>
        )}

        <div className="ga-alt">
          <span>
            <kbd className="ga-kbd">↑</kbd> <kbd className="ga-kbd">↓</kbd> gezin
          </span>
          <span>
            <kbd className="ga-kbd">Enter</kbd> aç
          </span>
          <span style={{ marginLeft: 'auto' }}>Yalnız yetkiniz olan kayıtlar listelenir</span>
        </div>
      </div>
    </div>
  );
}

const STIL = `
  .ga-dugme-bant { display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 12px 0 14px;
    border-radius: 12px; border: 1px solid rgba(255,255,255,.22); background: rgba(255,255,255,.10);
    color: rgba(255,255,255,.85); font: inherit; font-size: 13px; cursor: pointer; min-width: 280px;
    transition: background .15s, border-color .15s; }
  .ga-dugme-bant:hover { background: rgba(255,255,255,.18); border-color: rgba(255,255,255,.4); color: #fff; }
  .ga-dugme-bant .ga-kbd { margin-left: auto; background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.25); color: #fff; }
  .ga-dugme-bant.ga-dar { min-width: 0; width: 40px; padding: 0; justify-content: center; }
  .ga-kbd { font-family: inherit; font-size: 11px; border: 1px solid #d5dde5; border-radius: 6px; padding: 1px 6px;
    background: #f6f8fa; color: #5b6b7b; font-weight: 600; }
  .ga-ortu { position: fixed; inset: 0; z-index: 20000; background: rgba(8,20,40,.45); backdrop-filter: blur(3px);
    display: flex; justify-content: center; align-items: flex-start; padding: 9vh 14px 14px; }
  .ga-pencere { width: 100%; max-width: 640px; background: #fff; border-radius: 16px; overflow: hidden;
    box-shadow: 0 30px 80px rgba(0,0,0,.35); display: flex; flex-direction: column; max-height: 78vh;
    font-family: 'Inter', sans-serif; color: #1F2329; }
  .ga-girdi-satir { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #e8edf2; color: #5b6b7b; }
  .ga-girdi-satir input { flex: 1; border: none; outline: none; font: inherit; font-size: 16px; color: #1F2329; background: transparent; min-width: 0; }
  .ga-liste { overflow-y: auto; padding: 6px 0 8px; }
  .ga-grup { font-size: 10.5px; font-weight: 800; letter-spacing: .08em; color: #8a98a6; padding: 10px 18px 4px; text-transform: uppercase; }
  .ga-oge { display: flex; align-items: center; gap: 12px; width: 100%; padding: 9px 18px; border: none; background: none;
    font: inherit; font-size: 14px; color: #1F2329; cursor: pointer; text-align: left; }
  .ga-oge-aktif { background: #EEF3FF; }
  .ga-oge-aktif .ga-oge-ikon { color: ${VURGU}; background: #fff; }
  .ga-oge-ikon { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; background: #f1f4f7; color: #4b5d6e; flex-shrink: 0; }
  .ga-oge-ad { font-weight: 600; }
  .ga-oge-ipucu { margin-left: auto; color: #7a8896; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 55%; }
  .ga-bos { padding: 22px 18px; color: #7a8896; font-size: 13.5px; text-align: center; }
  .ga-alt { display: flex; gap: 14px; align-items: center; padding: 9px 18px; border-top: 1px solid #e8edf2;
    font-size: 11.5px; color: #8a98a6; background: #fafbfc; flex-wrap: wrap; }
  .ga-ayrinti { padding: 16px 18px 20px; display: flex; flex-direction: column; gap: 14px; }
  .ga-geri { align-self: flex-start; border: none; background: none; color: ${VURGU}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; padding: 0; }
  .ga-ayrinti-ust { display: flex; gap: 12px; align-items: center; }
  .ga-avatar { width: 46px; height: 46px; border-radius: 12px; background: ${LACIVERT}; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 18px; }
  .ga-ayrinti-ad { font-size: 16px; font-weight: 700; }
  .ga-ayrinti-alt { color: #6b7a89; font-size: 13px; margin-top: 2px; }
  .ga-dugme { align-self: flex-start; border: 1px solid #d5dde5; background: #fff; border-radius: 10px; padding: 9px 14px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  .ga-dugme:hover { border-color: ${VURGU}; color: ${VURGU}; }
  @media (max-width: 1250px) { .ga-dugme-bant { min-width: 170px; } }
  @media (max-width: 640px) {
    .ga-ortu { padding: 0; }
    .ga-pencere { max-width: none; max-height: none; height: 100%; border-radius: 0; }
    .ga-oge-ipucu { display: none; }
  }
`;

/**
 * Üst banttaki arama düğmesi + Ctrl+K penceresi.
 * @param {{currentUser, isMobile, onNavigate, islemler}} p
 */
export function GenelArama({ currentUser, isMobile, onNavigate, islemler = [] }) {
  const [acik, setAcik] = React.useState(false);

  React.useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setAcik((v) => !v);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  if (!currentUser) return null;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STIL }} />
      <button
        type="button"
        className={`ga-dugme-bant${isMobile ? ' ga-dar' : ''}`}
        onClick={() => setAcik(true)}
        title="Ara (Ctrl+K)"
        aria-label="Ara"
        data-genel-arama
      >
        <Ikon d={IKON_ARA} boyut={17} />
        {!isMobile && (
          <>
            <span>Ara…</span>
            <kbd className="ga-kbd">Ctrl K</kbd>
          </>
        )}
      </button>
      {acik && (
        <AramaPenceresi
          currentUser={currentUser}
          islemler={islemler}
          onNavigate={onNavigate}
          onKapat={() => setAcik(false)}
        />
      )}
    </>
  );
}

window.GenelArama = GenelArama;
