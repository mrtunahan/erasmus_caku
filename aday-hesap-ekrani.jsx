// ══════════════════════════════════════════════════════════════
// ADAY HESABI EKRANLARI
//
//   AdayGirisPaneli      → giriş ekranındaki "Aday" sekmesi (giriş + kayıt)
//   AdaySifreDegistir    → geçici şifreyle girene zorunlu şifre değişimi
//   AdayHesaplariPaneli  → personel: aday listesi, şifre sıfırlama,
//                          öğrenci numarasına aktarma, hesap kapatma
//
// Kural: lib/aday-hesap.js · Sunucu: server/routes/aday.js
// ══════════════════════════════════════════════════════════════
import {
  adayModulleri,
  adayYatayTurleri,
  ADAY_TURLERI,
  ADAY_KVKK_SURUM,
  adayAydinlatmaMetni,
  adayKayitHatalari,
  adayKaydiSadele,
  donemUyarilari,
  donemHatalari,
  ADAY_SAKLAMA_GUN,
  ogrenciYatayTurleri,
  ogrenciYatayYeniBasvuruAcabilirMi,
  ogrenciDikeyKaydiVarMi,
} from './lib/aday-hesap.js';

const { useEffect, useMemo, useState } = React;

const metin = (v) => String(v == null ? '' : v).trim();

async function adayIstek(yol, govde) {
  const r = await fetch('/api/aday' + yol, {
    method: govde ? 'POST' : 'GET',
    credentials: 'include',
    headers: Object.assign(
      govde ? { 'Content-Type': 'application/json' } : {},
      window.yoklamaBasliklari ? window.yoklamaBasliklari() : {}
    ),
    body: govde ? JSON.stringify(govde) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok && !j.error) j.error = 'Sunucu hatası (' + r.status + ').';
  return { ok: r.ok, status: r.status, ...j };
}

// Bölümün fakültesindeki başvuru dönemleri (kimliksiz okunur).
function useBolumDonemi(bolumId) {
  const [donemler, setDonemler] = useState({});
  useEffect(() => {
    let canli = true;
    if (!bolumId) {
      setDonemler({});
      return undefined;
    }
    fetch('/api/aday/donem?bolum=' + encodeURIComponent(bolumId))
      .then((r) => r.json())
      .then((j) => canli && setDonemler((j && j.donemler) || {}))
      .catch(() => canli && setDonemler({}));
    return () => {
      canli = false;
    };
  }, [bolumId]);
  return donemler;
}

function UyariKutusu({ uyarilar, koyu }) {
  if (!uyarilar || uyarilar.length === 0) return null;
  // `koyu`: giriş ekranının koyu cam kartı; modül ekranları açık zeminlidir.
  return (
    <div
      role="alert"
      data-aday-donem-uyari
      style={{
        background: koyu ? 'rgba(251, 191, 36, 0.12)' : '#FFFBEB',
        border: '1px solid ' + (koyu ? 'rgba(251, 191, 36, 0.40)' : '#FCD34D'),
        color: koyu ? '#FDE68A' : '#92400E',
        borderRadius: 10,
        padding: '10px 12px',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      {uyarilar.map((u) => (
        <div key={u.tur}>⚠ {u.mesaj}</div>
      ))}
      <div
        style={{
          fontSize: 12,
          marginTop: 4,
          color: koyu ? 'rgba(253, 230, 138, 0.75)' : '#A16207',
        }}
      >
        Başvuru alanı açık kalır; dönem dışı başvurunun değerlendirilip değerlendirilmeyeceğine
        bölümünüz karar verir.
      </div>
    </div>
  );
}

/** Giriş yapmış adayın modül ekranlarındaki dönem uyarısı. */
export function AdayDonemUyarisi({ currentUser, turler }) {
  const donemler = useBolumDonemi(currentUser && currentUser.aday ? currentUser.departmentId : '');
  if (!currentUser || !currentUser.aday) return null;
  const secili = (Array.isArray(turler) ? turler : currentUser.turler || []).filter((t) =>
    (currentUser.turler || []).includes(t)
  );
  const uyarilar = donemUyarilari(secili, donemler);
  return uyarilar.length ? (
    <div style={{ marginBottom: 14 }}>
      <UyariKutusu uyarilar={uyarilar} />
    </div>
  ) : null;
}

/** Sunucunun döndürdüğü aday → uygulamanın oturum kullanıcısı. */
export function adayOturumKullanicisi(a) {
  return {
    // Arayüzde aday ÖĞRENCİ görünümünü kullanır (kendi başvurusu, kendi
    // talebi); `aday: true` menüyü ve modül türlerini daraltır. Yetki
    // kararını sunucu verir (server/lib/aday-yetki.js).
    role: 'student',
    aday: true,
    name: (metin(a.ad) + ' ' + metin(a.soyad)).trim(),
    identifier: a.adayNo,
    studentNumber: a.adayNo,
    adayNo: a.adayNo,
    departmentId: a.departmentId,
    departmentName: a.departmentName || '',
    turler: Array.isArray(a.turler) ? a.turler : [],
    sifreDegistirmeli: !!a.sifreDegistirmeli,
  };
}

const kutu = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

// Giriş ekranındaki öğrenci/akademisyen formlarıyla aynı görünüm: lg-* sınıfları
// (shared-components.jsx → LoginModal stilleri, koyu cam kart teması).
const BAG = {
  background: 'none',
  border: 'none',
  padding: 0,
  font: 'inherit',
  color: '#7FE7DC',
  fontWeight: 600,
  cursor: 'pointer',
};

const svg = (cocuk, kalinlik = 2) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={kalinlik}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {cocuk}
  </svg>
);

const IKON = {
  kimlik: svg(
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="8" cy="12" r="2.5" />
      <line x1="13" y1="10" x2="18" y2="10" />
      <line x1="13" y1="14" x2="18" y2="14" />
    </>
  ),
  kisi: svg(<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />),
  kilit: svg(
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </>
  ),
  onay: svg(<path d="M20 6L9 17l-5-5" />),
  posta: svg(
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22 6 12 13 2 6" />
    </>
  ),
  telefon: svg(
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
  ),
  goz: svg(
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  gozKapali: svg(
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </>
  ),
  ok: svg(
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>,
    2.5
  ),
};

/** Solda ikon, şifre alanında sağda göster/gizle düğmesi olan giriş kutusu. */
function IkonluGirdi({ ikon, sifre, type, ...girdi }) {
  const [gorunur, setGorunur] = useState(false);
  return (
    <div className="lg-input-icon-wrap">
      <div className="lg-input-icon-left">{ikon}</div>
      <input
        {...girdi}
        type={sifre ? (gorunur ? 'text' : 'password') : type || 'text'}
        className={'lg-input lg-input-icon' + (sifre ? ' lg-input-eye' : '')}
      />
      {sifre && (
        <button
          type="button"
          className="lg-input-eye-btn"
          onClick={() => setGorunur((v) => !v)}
          aria-label={gorunur ? 'Şifreyi gizle' : 'Şifreyi göster'}
          tabIndex={-1}
        >
          {gorunur ? IKON.gozKapali : IKON.goz}
        </button>
      )}
    </div>
  );
}

function HataKutusu({ hata }) {
  if (!hata) return null;
  return (
    <div className="lg-error" style={{ marginBottom: 0 }}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      {hata}
    </div>
  );
}

function GonderDugmesi({ mesgul, bekleme, children, ...rest }) {
  return (
    <button type="submit" disabled={mesgul} className="lg-btn lg-btn-primary" {...rest}>
      {mesgul ? (
        <>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{ animation: 'loginSpin 1s linear infinite' }}
          >
            <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
          </svg>
          {bekleme}
        </>
      ) : (
        <>
          {children}
          {IKON.ok}
        </>
      )}
    </button>
  );
}

function Alan({ etiket, hata, children }) {
  return (
    <div>
      <label className="lg-label">{etiket}</label>
      {children}
      {hata && (
        <div style={{ color: '#FCA5A5', fontSize: 12.5, marginTop: 6 }} data-aday-hata>
          {hata}
        </div>
      )}
    </div>
  );
}

// ── Giriş ekranı: Aday sekmesi ──
export function AdayGirisPaneli({ onLogin }) {
  const [mod, setMod] = useState('giris'); // giris | kayit
  const [hata, setHata] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [tc, setTc] = useState('');
  const [sifre, setSifre] = useState('');
  const [f, setF] = useState({
    ad: '',
    soyad: '',
    tc: '',
    eposta: '',
    telefon: '',
    turler: [],
    departmentId: '',
    sifre: '',
    sifre2: '',
    kvkk: false,
  });
  const [denendi, setDenendi] = useState(false);
  const [bolumler, setBolumler] = useState([]);
  const [metinAcik, setMetinAcik] = useState(false);
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));

  useEffect(() => {
    if (mod !== 'kayit' || bolumler.length) return;
    fetch('/api/db/departments')
      .then((r) => r.json())
      .then((d) =>
        setBolumler(
          (Array.isArray(d) ? d : [])
            .map((b) => ({ id: metin(b._docId || b.id), ad: metin(b.name) }))
            .filter((b) => b.id && b.ad)
            .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
        )
      )
      .catch(() => setBolumler([]));
  }, [mod, bolumler.length]);

  const hatalar = useMemo(() => adayKayitHatalari(f), [f]);
  const donemler = useBolumDonemi(mod === 'kayit' ? f.departmentId : '');
  const kayitUyarilari = donemUyarilari(f.turler, donemler);

  const tamamla = (j) => {
    if (window.oturumBilgisiniYaz && j.token) window.oturumBilgisiniYaz(j.token);
    onLogin(adayOturumKullanicisi(j.aday));
  };

  const girisYap = async (e) => {
    e.preventDefault();
    setHata('');
    if (!/^\d{11}$/.test(tc.trim()) || !sifre) {
      setHata('T.C. kimlik numaranızı (11 hane) ve şifrenizi girin.');
      return;
    }
    setMesgul(true);
    try {
      const j = await adayIstek('/giris', { tc: tc.trim(), sifre });
      if (!j.success) setHata(j.error || 'Giriş yapılamadı.');
      else tamamla(j);
    } catch (_e) {
      setHata('Sunucuya ulaşılamadı.');
    } finally {
      setMesgul(false);
    }
  };

  const kayitOl = async (e) => {
    e.preventDefault();
    setDenendi(true);
    setHata('');
    if (Object.keys(hatalar).length) {
      setHata('Lütfen işaretli alanları düzeltin.');
      return;
    }
    setMesgul(true);
    try {
      const j = await adayIstek('/kayit', {
        ...adayKaydiSadele(f),
        sifre: f.sifre,
        kvkk: f.kvkk === true,
        kvkkSurum: ADAY_KVKK_SURUM,
      });
      if (!j.success) setHata(j.error || 'Kayıt yapılamadı.');
      else tamamla(j);
    } catch (_e) {
      setHata('Sunucuya ulaşılamadı.');
    } finally {
      setMesgul(false);
    }
  };

  const h = (k) => (denendi ? hatalar[k] : '');
  const turSec = (id) =>
    set('turler', f.turler.includes(id) ? f.turler.filter((t) => t !== id) : f.turler.concat(id));

  const bilgi = (
    <div
      style={{
        background: 'rgba(46, 196, 182, 0.10)',
        border: '1px solid rgba(46, 196, 182, 0.30)',
        borderRadius: 10,
        padding: '10px 12px',
        fontSize: 12.5,
        color: 'rgba(255, 255, 255, 0.78)',
        lineHeight: 1.5,
      }}
    >
      Henüz öğrenci numaranız yoksa (dikey geçiş, kurumlararası yatay geçiş ya da merkezi
      yerleştirme puanıyla yatay geçiş adayı) buradan hesap açıp başvurunuzu yapabilirsiniz. Kesin
      kaydınız yapılınca başvurularınız öğrenci numaranıza aktarılır.
    </div>
  );

  if (mod === 'giris') {
    return (
      <form onSubmit={girisYap} style={kutu} data-aday-giris>
        {bilgi}
        <Alan etiket="T.C. Kimlik No">
          <IkonluGirdi
            ikon={IKON.kimlik}
            value={tc}
            onChange={(e) => setTc(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="11 haneli T.C. kimlik numaranız"
            inputMode="numeric"
            autoComplete="username"
            data-aday-tc
          />
        </Alan>
        <Alan etiket="Şifre">
          <IkonluGirdi
            ikon={IKON.kilit}
            sifre
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            placeholder="Şifrenizi girin"
            autoComplete="current-password"
            data-aday-sifre
          />
        </Alan>
        <HataKutusu hata={hata} />
        <GonderDugmesi mesgul={mesgul} bekleme="Giriş yapılıyor..." data-aday-giris-btn>
          Giriş Yap
        </GonderDugmesi>
        <button
          type="button"
          onClick={() => {
            setMod('kayit');
            setHata('');
          }}
          className="lg-btn lg-btn-secondary"
          style={{ padding: '10px 16px', fontSize: 13 }}
          data-aday-kayit-ac
        >
          Hesabım yok — aday hesabı oluştur
        </button>
        <div className="lg-hint" style={{ textAlign: 'center', marginTop: 0 }}>
          Şifrenizi unuttuysanız başvurduğunuz bölümün sekreterliğinden sıfırlatın.
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={kayitOl} style={kutu} data-aday-kayit>
      {bilgi}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Alan etiket="Ad" hata={h('ad')}>
          <IkonluGirdi
            ikon={IKON.kisi}
            value={f.ad}
            onChange={(e) => set('ad', e.target.value)}
            placeholder="Adınız"
            data-k="ad"
          />
        </Alan>
        <Alan etiket="Soyad" hata={h('soyad')}>
          <IkonluGirdi
            ikon={IKON.kisi}
            value={f.soyad}
            onChange={(e) => set('soyad', e.target.value)}
            placeholder="Soyadınız"
            data-k="soyad"
          />
        </Alan>
      </div>
      <Alan etiket="T.C. Kimlik No" hata={h('tc')}>
        <IkonluGirdi
          ikon={IKON.kimlik}
          value={f.tc}
          onChange={(e) => set('tc', e.target.value.replace(/\D/g, '').slice(0, 11))}
          placeholder="11 haneli T.C. kimlik numaranız"
          inputMode="numeric"
          data-k="tc"
        />
      </Alan>
      <Alan etiket="E-posta" hata={h('eposta')}>
        <IkonluGirdi
          ikon={IKON.posta}
          type="email"
          value={f.eposta}
          onChange={(e) => set('eposta', e.target.value)}
          placeholder="ornek@eposta.com"
          data-k="eposta"
        />
      </Alan>
      <Alan etiket="Cep telefonu" hata={h('telefon')}>
        <IkonluGirdi
          ikon={IKON.telefon}
          value={f.telefon}
          onChange={(e) => set('telefon', e.target.value)}
          placeholder="5XX XXX XX XX"
          inputMode="tel"
          data-k="telefon"
        />
      </Alan>
      <Alan etiket="Başvuru türü" hata={h('turler')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ADAY_TURLERI.map((t) => {
            const secili = f.turler.includes(t.id);
            return (
              <label
                key={t.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  fontSize: 13.5,
                  cursor: 'pointer',
                  padding: '10px 12px',
                  borderRadius: 10,
                  color: '#F4F8F7',
                  border: '1.5px solid ' + (secili ? '#2EC4B6' : 'rgba(255, 255, 255, 0.18)'),
                  background: secili ? 'rgba(46, 196, 182, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                  transition: 'border-color 0.18s ease, background 0.18s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={secili}
                  onChange={() => turSec(t.id)}
                  data-tur={t.id}
                  style={{ marginTop: 3, accentColor: '#2EC4B6' }}
                />
                <span>
                  <b style={{ fontWeight: 600 }}>{t.ad}</b>
                  <span
                    style={{ display: 'block', color: 'rgba(255, 255, 255, 0.55)', fontSize: 12 }}
                  >
                    {t.aciklama}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </Alan>
      <Alan etiket="Başvurduğunuz / yerleştiğiniz bölüm" hata={h('departmentId')}>
        <select
          className="lg-input"
          value={f.departmentId}
          onChange={(e) => set('departmentId', e.target.value)}
          data-k="bolum"
        >
          <option value="">Bölüm seçin…</option>
          {bolumler.map((b) => (
            <option key={b.id} value={b.id}>
              {b.ad}
            </option>
          ))}
        </select>
      </Alan>
      <UyariKutusu uyarilar={kayitUyarilari} koyu />
      <Alan etiket="Şifre" hata={h('sifre')}>
        <IkonluGirdi
          ikon={IKON.kilit}
          sifre
          value={f.sifre}
          onChange={(e) => set('sifre', e.target.value)}
          placeholder="Şifrenizi belirleyin"
          autoComplete="new-password"
          data-k="sifre"
        />
      </Alan>
      <Alan etiket="Şifre tekrar" hata={h('sifre2')}>
        <IkonluGirdi
          ikon={IKON.onay}
          sifre
          value={f.sifre2}
          onChange={(e) => set('sifre2', e.target.value)}
          placeholder="Şifrenizi tekrar girin"
          autoComplete="new-password"
          data-k="sifre2"
        />
      </Alan>
      <div style={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.78)', lineHeight: 1.5 }}>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={f.kvkk}
            onChange={(e) => set('kvkk', e.target.checked)}
            data-k="kvkk"
            style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, accentColor: '#2EC4B6' }}
          />
          <span>
            <button
              type="button"
              onClick={() => setMetinAcik((v) => !v)}
              style={{ ...BAG, textDecoration: 'underline' }}
            >
              Aday aydınlatma metnini
            </button>{' '}
            okudum.
          </span>
        </label>
        {h('kvkk') && <div style={{ color: '#FCA5A5', marginTop: 4 }}>{h('kvkk')}</div>}
        {metinAcik && (
          <div
            style={{
              marginTop: 8,
              padding: 10,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: 10,
              maxHeight: 220,
              overflowY: 'auto',
            }}
          >
            {adayAydinlatmaMetni(window.TENANT && window.TENANT.universityName).map((p, i) => (
              <p key={i} style={{ margin: '0 0 6px' }}>
                {p}
              </p>
            ))}
          </div>
        )}
      </div>
      <HataKutusu hata={hata} />
      <GonderDugmesi mesgul={mesgul} bekleme="Hesap açılıyor..." data-aday-kayit-btn>
        Hesap Oluştur ve Giriş Yap
      </GonderDugmesi>
      <button
        type="button"
        onClick={() => {
          setMod('giris');
          setHata('');
        }}
        className="lg-btn lg-btn-secondary"
        style={{ padding: '10px 16px', fontSize: 13 }}
      >
        Hesabım var — giriş yap
      </button>
    </form>
  );
}

// ── Geçici şifreyle giren aday şifresini değiştirmeden devam edemez ──
export function AdaySifreDegistir({ onTamam, onKapat, zorunlu = true }) {
  const [eski, setEski] = useState('');
  const [yeni, setYeni] = useState('');
  const [yeni2, setYeni2] = useState('');
  const [hata, setHata] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const kaydet = async (e) => {
    e.preventDefault();
    const h = adayKayitHatalari({ sifre: yeni, sifre2: yeni2 });
    if (h.sifre || h.sifre2) {
      setHata(h.sifre || h.sifre2);
      return;
    }
    setMesgul(true);
    const j = await adayIstek('/sifre-degistir', { eski, yeni }).catch(() => ({}));
    setMesgul(false);
    if (!j.success) setHata(j.error || 'Şifre değiştirilemedi.');
    else onTamam();
  };
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.55)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <form
        onSubmit={kaydet}
        style={{
          background: 'white',
          borderRadius: 14,
          padding: 22,
          width: '100%',
          maxWidth: 380,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
        data-aday-sifre-degistir
      >
        <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
          {zorunlu ? 'Şifrenizi belirleyin' : 'Şifre değiştir'}
        </div>
        {zorunlu && (
          <div style={{ fontSize: 13, color: '#475569' }}>
            Bölümünüzün verdiği geçici şifreyle giriş yaptınız. Devam etmek için kendi şifrenizi
            belirleyin.
          </div>
        )}
        {hata && <div style={{ color: '#B91C1C', fontSize: 13 }}>{hata}</div>}
        <input
          type="password"
          placeholder={zorunlu ? 'Geçici şifre' : 'Mevcut şifre'}
          value={eski}
          onChange={(e) => setEski(e.target.value)}
          style={inp}
        />
        <input
          type="password"
          placeholder="Yeni şifre (en az 8, harf ve rakam)"
          value={yeni}
          onChange={(e) => setYeni(e.target.value)}
          style={inp}
        />
        <input
          type="password"
          placeholder="Yeni şifre (tekrar)"
          value={yeni2}
          onChange={(e) => setYeni2(e.target.value)}
          style={inp}
        />
        <button type="submit" disabled={mesgul} style={dugme('#0D9B8E')}>
          {mesgul ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {!zorunlu && onKapat && (
          <button type="button" onClick={onKapat} style={dugme('#64748B', false)}>
            Vazgeç
          </button>
        )}
      </form>
    </div>
  );
}

const inp = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #CBD5E1',
  fontSize: 14,
  fontFamily: 'inherit',
};
const dugme = (renk, dolu = true) => ({
  padding: '7px 12px',
  borderRadius: 8,
  border: '1px solid ' + renk,
  background: dolu ? renk : 'white',
  color: dolu ? 'white' : renk,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
});

const TUR_KISA = { dikey: 'Dikey', kurumlararasi: 'Kurumlararası', merkezi: 'Merkezi (Ek M.1)' };
const DURUM = {
  aktif: ['Aktif', '#047857', '#ECFDF5'],
  aktarildi: ['Öğrenciye aktarıldı', '#1D4ED8', '#EFF6FF'],
  kapali: ['Kapalı', '#6B7280', '#F3F4F6'],
};

// ── Personel: aday hesapları ──
export function AdayHesaplariPaneli({ activeDepartment, turler }) {
  const [liste, setListe] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [ara, setAra] = useState('');
  const [aktarilan, setAktarilan] = useState({}); // adayNo → girilen no

  const yukle = async () => {
    setYukleniyor(true);
    const j = await adayIstek(
      '/liste' + (activeDepartment ? '?bolum=' + encodeURIComponent(activeDepartment) : '')
    ).catch(() => ({ error: 'Sunucuya ulaşılamadı.' }));
    setYukleniyor(false);
    if (j.error) setHata(j.error);
    else {
      setHata('');
      setListe(j.adaylar || []);
    }
  };
  useEffect(() => {
    yukle();
  }, [activeDepartment]); // yukle her render'da yeniden kurulur; bölüm değişimi yeter

  const gorunen = liste.filter((a) => {
    if (Array.isArray(turler) && turler.length && !a.turler.some((t) => turler.includes(t)))
      return false;
    const q = ara.trim().toLocaleLowerCase('tr-TR');
    if (!q) return true;
    return (a.ad + ' ' + a.soyad + ' ' + a.adayNo + ' ' + a.eposta)
      .toLocaleLowerCase('tr-TR')
      .includes(q);
  });

  const sifirla = async (a) => {
    if (!window.confirm(a.ad + ' ' + a.soyad + ' için geçici şifre üretilsin mi?')) return;
    const j = await adayIstek('/sifre-sifirla', { adayNo: a.adayNo });
    if (j.success) {
      window.prompt(
        'Geçici şifre (adaya iletin; bir daha gösterilmez). Aday ilk girişte kendi şifresini belirler:',
        j.geciciSifre
      );
    } else alert(j.error || 'Sıfırlanamadı.');
  };
  const aktar = async (a) => {
    const no = metin(aktarilan[a.adayNo]);
    if (!/^\d{9}$/.test(no)) {
      alert('Kesin kayıtta verilen 9 haneli öğrenci numarasını girin.');
      return;
    }
    if (
      !window.confirm(
        a.adayNo +
          ' (' +
          a.ad +
          ' ' +
          a.soyad +
          ') adayının bütün başvuruları ' +
          no +
          ' numarasına aktarılacak ve aday hesabı kapanacak. Devam edilsin mi?'
      )
    )
      return;
    const j = await adayIstek('/numara-aktar', { adayNo: a.adayNo, ogrenciNo: no });
    if (j.success) {
      const t = j.tasinan || {};
      setMesaj(
        'Aktarıldı: ' +
          (t.yatay_gecis_basvurular || 0) +
          ' yatay geçiş, ' +
          (t.muafiyet_records || 0) +
          ' dikey geçiş kaydı.'
      );
      yukle();
    } else alert(j.error || 'Aktarılamadı.');
  };
  const kapat = async (a) => {
    if (!window.confirm(a.adayNo + ' aday hesabı kapatılsın mı? Aday bir daha giriş yapamaz.'))
      return;
    const j = await adayIstek('/kapat', { adayNo: a.adayNo });
    if (j.success) yukle();
    else alert(j.error || 'Kapatılamadı.');
  };

  return (
    <div
      style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 16 }}
      data-aday-hesaplari
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 700, color: '#0F172A' }}>Aday hesapları</div>
          <div style={{ fontSize: 12.5, color: '#64748B' }}>
            Öğrenci numarası olmadan kendi hesabını açan adaylar. Kesin kayıttan sonra numarasını
            girip aktarın; başvuruları öğrenci hesabına geçer. Aktarılmayan adayın verisi dönem
            bitişinden (ya da hesabın kapatılmasından) {ADAY_SAKLAMA_GUN} gün sonra otomatik
            silinir. Şifreyi bölüm yetkilisi sıfırlar.
          </div>
        </div>
        <input
          value={ara}
          onChange={(e) => setAra(e.target.value)}
          placeholder="Ad, aday no, e-posta…"
          style={{ ...inp, minWidth: 200 }}
        />
      </div>
      {hata && <div style={{ color: '#B91C1C', marginTop: 10 }}>{hata}</div>}
      {mesaj && (
        <div style={{ color: '#047857', marginTop: 10, fontSize: 13 }} data-aday-mesaj>
          {mesaj}
        </div>
      )}
      {yukleniyor ? (
        <div style={{ padding: 20, color: '#64748B' }}>Yükleniyor…</div>
      ) : gorunen.length === 0 ? (
        <div style={{ padding: 20, color: '#64748B' }}>Kayıtlı aday yok.</div>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#64748B', fontSize: 11.5 }}>
                <th style={th}>Aday</th>
                <th style={th}>T.C.</th>
                <th style={th}>İletişim</th>
                <th style={th}>Türler</th>
                <th style={th}>Durum</th>
                <th style={th}>Otomatik silinme</th>
                <th style={th}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {gorunen.map((a) => {
                const d = DURUM[a.durum] || DURUM.aktif;
                return (
                  <tr
                    key={a.adayNo}
                    style={{ borderTop: '1px solid #F1F5F9' }}
                    data-aday-satir={a.adayNo}
                  >
                    <td style={td}>
                      <b>
                        {a.ad} {a.soyad}
                      </b>
                      <div style={{ color: '#64748B', fontSize: 12 }}>{a.adayNo}</div>
                    </td>
                    <td style={td}>{a.tcMaske}</td>
                    <td style={td}>
                      {a.eposta}
                      <div style={{ color: '#64748B', fontSize: 12 }}>{a.telefon}</div>
                    </td>
                    <td style={td}>{a.turler.map((t) => TUR_KISA[t] || t).join(', ')}</td>
                    <td style={td}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: d[1],
                          background: d[2],
                        }}
                      >
                        {d[0]}
                        {a.durum === 'aktarildi' ? ' · ' + a.ogrenciNo : ''}
                      </span>
                    </td>
                    <td style={td} data-aday-silinme>
                      {a.silinme && a.silinme.tarih ? (
                        <b style={{ color: '#B91C1C' }}>
                          {a.silinme.tarih.split('-').reverse().join('.')}
                        </b>
                      ) : (
                        '—'
                      )}
                      <div style={{ color: '#64748B', fontSize: 11.5 }}>
                        {(a.silinme && a.silinme.sebep) || ''}
                      </div>
                    </td>
                    <td style={td}>
                      {a.durum === 'aktif' && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <input
                            value={aktarilan[a.adayNo] || ''}
                            onChange={(e) =>
                              setAktarilan((o) => ({
                                ...o,
                                [a.adayNo]: e.target.value.replace(/\D/g, '').slice(0, 9),
                              }))
                            }
                            placeholder="Öğrenci no"
                            inputMode="numeric"
                            style={{ ...inp, width: 110, padding: '6px 8px', fontSize: 12.5 }}
                            data-aday-no-gir
                          />
                          <button style={dugme('#1D4ED8')} onClick={() => aktar(a)} data-aday-aktar>
                            Numaraya aktar
                          </button>
                          {a.yetki && a.yetki.sifirlama && (
                            <button style={dugme('#0D9B8E', false)} onClick={() => sifirla(a)}>
                              Şifre sıfırla
                            </button>
                          )}
                          <button style={dugme('#B91C1C', false)} onClick={() => kapat(a)}>
                            Kapat
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
// ── Fakülte yetkilisi: aday başvuru tarihleri ──
export function AdayDonemPaneli({ facultyId }) {
  const [donemler, setDonemler] = useState({});
  const [yukleniyor, setYukleniyor] = useState(true);
  const [mesaj, setMesaj] = useState({ text: '', tur: '' });
  useEffect(() => {
    let canli = true;
    if (!facultyId) return undefined;
    // Fakültenin herhangi bir bölümü üzerinden değil, doğrudan fakülte
    // kimliğiyle okunur: bölümsüz yeni fakültede de çalışsın.
    fetch('/api/aday/donem-fakulte?facultyId=' + encodeURIComponent(facultyId), {
      credentials: 'include',
      headers: window.yoklamaBasliklari ? window.yoklamaBasliklari() : {},
    })
      .then((r) => r.json())
      .then((j) => canli && setDonemler((j && j.donemler) || {}))
      .catch(() => {})
      .finally(() => canli && setYukleniyor(false));
    return () => {
      canli = false;
    };
  }, [facultyId]);
  const set = (tur, alan, v) =>
    setDonemler((d) => ({ ...d, [tur]: { ...(d[tur] || {}), [alan]: v } }));
  const hatalar = donemHatalari(donemler);
  const kaydet = async () => {
    if (Object.keys(hatalar).length) {
      setMesaj({ text: Object.values(hatalar)[0], tur: 'hata' });
      return;
    }
    const j = await adayIstek('/donemler', { facultyId, donemler }).catch(() => ({}));
    if (j.success) {
      setDonemler(j.donemler || {});
      setMesaj({ text: 'Başvuru tarihleri kaydedildi.', tur: 'ok' });
    } else setMesaj({ text: j.error || 'Kaydedilemedi.', tur: 'hata' });
  };
  if (!facultyId) return null;
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 12,
        border: '1px solid #E5E7EB',
        padding: 16,
        marginBottom: 16,
      }}
      data-aday-donem-paneli
    >
      <div style={{ fontWeight: 700, color: '#0F172A' }}>Aday başvuru tarihleri</div>
      <div style={{ fontSize: 12.5, color: '#64748B', margin: '2px 0 12px' }}>
        Öğrenci numarası olmayan adayların (dikey geçiş, kurumlararası ve merkezi yerleştirme
        puanıyla yatay geçiş) fakültenize başvuru dönemi. Dönem dışında başvuru alanı açık kalır,
        aday "başvuru tarihleri uygun değildir" uyarısı görür. Boş bırakılan türde uyarı çıkmaz.
        Kazanamayan adayın verisi dönem bitişinden {ADAY_SAKLAMA_GUN} gün sonra silinir.
      </div>
      {yukleniyor ? (
        <div style={{ color: '#64748B', fontSize: 13 }}>Yükleniyor…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ADAY_TURLERI.map((t) => (
            <div
              key={t.id}
              style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}
              data-donem-tur={t.id}
            >
              <div style={{ flex: '1 1 260px', fontSize: 13, fontWeight: 600, color: '#334155' }}>
                {t.ad}
              </div>
              <input
                type="date"
                value={(donemler[t.id] && donemler[t.id].baslangic) || ''}
                onChange={(e) => set(t.id, 'baslangic', e.target.value)}
                style={inp}
                aria-label={t.ad + ' başlangıç'}
                data-alan="baslangic"
              />
              <span style={{ color: '#94A3B8' }}>–</span>
              <input
                type="date"
                value={(donemler[t.id] && donemler[t.id].bitis) || ''}
                onChange={(e) => set(t.id, 'bitis', e.target.value)}
                style={inp}
                aria-label={t.ad + ' bitiş'}
                data-alan="bitis"
              />
              {hatalar[t.id] && (
                <span style={{ color: '#B91C1C', fontSize: 12 }}>{hatalar[t.id]}</span>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
            <button style={dugme('#0D9B8E')} onClick={kaydet} data-donem-kaydet>
              Kaydet
            </button>
            {mesaj.text && (
              <span
                style={{ fontSize: 13, color: mesaj.tur === 'ok' ? '#047857' : '#B91C1C' }}
                data-donem-mesaj
              >
                {mesaj.text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const th = { padding: '6px 8px', fontWeight: 600 };
const td = { padding: '8px', verticalAlign: 'top' };

window.AdayGirisPaneli = AdayGirisPaneli;
window.AdaySifreDegistir = AdaySifreDegistir;
window.AdayHesaplariPaneli = AdayHesaplariPaneli;
window.adayOturumKullanicisi = adayOturumKullanicisi;
window.adayModulleri = adayModulleri;
window.AdayDonemUyarisi = AdayDonemUyarisi;
window.AdayDonemPaneli = AdayDonemPaneli;
window.adayYatayTurleri = adayYatayTurleri;
window.ogrenciYatayTurleri = ogrenciYatayTurleri;
window.ogrenciYatayYeniBasvuruAcabilirMi = ogrenciYatayYeniBasvuruAcabilirMi;
window.ogrenciDikeyKaydiVarMi = ogrenciDikeyKaydiVarMi;
