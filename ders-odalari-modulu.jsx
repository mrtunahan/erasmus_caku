// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Ders Odaları
//
// Her dersin her dönem için bir "odası" vardır (Google Classroom mantığı):
//   • Akış        — duyurular ve ödev paylaşımları, yaklaşan son tarihler
//   • Ödevler     — ödev listesi; öğrenci kendi durumunu görür
//   • Kişiler     — dersin akademisyenleri ve öğrencileri
//   • Notlar      — (akademisyen / yetkili) bütün notlar, Excel ve PDF çıktısı
//
// Öğrenci odaya, o dönemin DERS SEÇİMİNDE dersi seçtiyse girer; akademisyen
// verdiği derslerin odalarını, yetkili (bölüm/fakülte/üniversite) alanındaki
// bölümlerin odalarını görür ama ödev, not, teslim işlemleri dersin
// akademisyenine aittir. Bütün kararlar sunucuda (server/routes/ders-odasi.js)
// verilir; kurallar lib/ders-odasi.js'te ve testlidir.
//
// Oda türü (`tur: 'ders'`) ileride başka alanlara (proje grubu, kulüp, staj)
// açılabilsin diye ayrı tutulur; ekran türden bağımsız çalışır.
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useRef, useCallback } = React;

const DO = {
  primary: '#1B2A4A',
  accent: '#0F766E',
  accentLight: '#F0FDFA',
  accentBorder: '#99F6E4',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  muted: '#64748B',
  soft: '#94A3B8',
  border: '#E2E8F0',
  red: '#B91C1C',
  redLight: '#FEF2F2',
  amber: '#B45309',
  amberLight: '#FFFBEB',
  green: '#15803D',
  greenLight: '#F0FDF4',
  golge: '0 1px 2px rgba(15,23,42,0.06)',
};

// Oda bandı renkleri (akademisyen "Özelleştir" ile seçer). Uygulama paletine
// bağlı koyu tonlar: lacivert, teal, çelik mavisi, arduvaz — bant üzerindeki
// beyaz yazı her birinde okunur kalır.
const BANT_RENKLERI = [
  '#1B2A4A',
  '#0F766E',
  '#1E3A8A',
  '#334155',
  '#115E59',
  '#3B5078',
  '#312E81',
  '#78350F',
];

const metin = (v) => (v == null ? '' : String(v).trim());
const K = () => window.DersOdasi || {};

function varsayilanRenk(kimlik) {
  let h = 0;
  const s = metin(kimlik);
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  // Varsayılan yalnız ilk dört tondan: liste sakin ve temaya yakın kalsın.
  return BANT_RENKLERI[Math.abs(h) % 4];
}

// ── SUNUCU ──
function basliklar(ek) {
  let token = '';
  try {
    token = localStorage.getItem('caku_auth_token') || '';
  } catch (_) {
    token = '';
  }
  return Object.assign({}, token ? { Authorization: 'Bearer ' + token } : {}, ek || {});
}

async function api(yol, secenek) {
  const s = secenek || {};
  const govdeVar = s.body !== undefined;
  const r = await fetch('/api/oda' + yol, {
    method: s.method || (govdeVar ? 'POST' : 'GET'),
    credentials: 'include',
    headers: basliklar(govdeVar ? { 'Content-Type': 'application/json' } : {}),
    body: govdeVar ? JSON.stringify(s.body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j.error || 'İşlem yapılamadı (HTTP ' + r.status + ').');
    e.status = r.status;
    throw e;
  }
  return j;
}

async function dosyaYukle(odaId, amac, icerikId, dosya) {
  const fd = new FormData();
  fd.append('dosya', dosya);
  const q =
    '?odaId=' +
    encodeURIComponent(odaId) +
    '&amac=' +
    amac +
    (icerikId ? '&icerikId=' + encodeURIComponent(icerikId) : '');
  const r = await fetch('/api/oda/dosya' + q, {
    method: 'POST',
    credentials: 'include',
    headers: basliklar(),
    body: fd,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Dosya yüklenemedi (HTTP ' + r.status + ').');
  return j.dosya;
}

// Dosyalar yetkiyle korunur: bağlantı yerine istekle alınıp açılır.
async function dosyaAc(d) {
  const goster = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'txt'].includes(metin(d.uzanti));
  const pencere = goster ? window.open('', '_blank') : null;
  try {
    const r = await fetch(
      '/api/oda/dosya/' + encodeURIComponent(d.id) + (goster ? '?goster=1' : ''),
      {
        credentials: 'include',
        headers: basliklar(),
      }
    );
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j.error || 'Dosya açılamadı (HTTP ' + r.status + ').');
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    if (pencere) {
      pencere.location.href = url;
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = d.ad || 'dosya';
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    if (pencere) pencere.close();
    alert(e.message);
  }
}

// ── TARİH ──
const tarihSaat = (v) =>
  v ? (K().tarihSaat ? K().tarihSaat(v) : new Date(v).toLocaleString('tr-TR')) : '';
// <input type="datetime-local"> yerel saatle çalışır; sunucuya ISO gider.
function yerelGirdi(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    p(d.getMonth() + 1) +
    '-' +
    p(d.getDate()) +
    'T' +
    p(d.getHours()) +
    ':' +
    p(d.getMinutes())
  );
}
const girdidenIso = (v) => (v ? new Date(v).toISOString() : '');
const boyutMetni = (b) =>
  b >= 1024 * 1024
    ? (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB'
    : Math.max(1, Math.round(b / 1024)) + ' KB';
const tamAd = (s) =>
  [metin(s && s.ad), metin(s && s.soyad)].filter(Boolean).join(' ') || metin(s && s.no);

function donemSecenekleri(simdiki) {
  const m = /^(\d{4})-(\d{4})_(guz|bahar)$/.exec(simdiki || '');
  if (!m) return simdiki ? [simdiki] : [];
  const out = [];
  let yil = Number(m[1]);
  let yari = m[3];
  for (let i = 0; i < 6; i++) {
    out.push(yil + '-' + (yil + 1) + '_' + yari);
    if (yari === 'bahar') yari = 'guz';
    else {
      yari = 'bahar';
      yil -= 1;
    }
  }
  return out;
}

// ── ORTAK PARÇALAR ──
const kart = {
  background: DO.card,
  border: '1px solid ' + DO.border,
  borderRadius: 10,
  boxShadow: DO.golge,
};

function Dugme({ children, onClick, tur, disabled, title, kucuk, ...geri }) {
  const renk =
    tur === 'ana'
      ? { background: DO.accent, color: '#fff', border: '1px solid ' + DO.accent }
      : tur === 'tehlike'
        ? { background: '#fff', color: DO.red, border: '1px solid #FCA5A5' }
        : { background: '#fff', color: DO.primary, border: '1px solid ' + DO.border };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...renk,
        borderRadius: 8,
        padding: kucuk ? '5px 10px' : '8px 14px',
        fontSize: kucuk ? 12 : 13,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        whiteSpace: 'nowrap',
      }}
      {...geri}
    >
      {children}
    </button>
  );
}

function DurumRozeti({ durum }) {
  const d = (K().DURUMLAR || {})[durum];
  if (!d) return null;
  return (
    <span
      data-durum={durum}
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: d.renk,
        background: d.renk + '14',
        border: '1px solid ' + d.renk + '40',
        borderRadius: 999,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {d.etiket}
    </span>
  );
}

function Ekler({ ekler, silinebilir, onSil }) {
  if (!ekler || !ekler.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {ekler.map((d) => (
        <div
          key={d.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid ' + DO.border,
            borderRadius: 8,
            padding: '6px 10px',
            background: '#fff',
            maxWidth: 320,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#fff',
              background: DO.primary,
              borderRadius: 4,
              padding: '2px 5px',
              textTransform: 'uppercase',
            }}
          >
            {d.uzanti || 'dosya'}
          </span>
          <button
            type="button"
            onClick={() => dosyaAc(d)}
            style={{
              border: 'none',
              background: 'none',
              color: DO.primary,
              fontSize: 13,
              cursor: 'pointer',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: 0,
              textAlign: 'left',
            }}
            title={d.ad}
          >
            {d.ad}
          </button>
          {d.boyut ? (
            <span style={{ fontSize: 11, color: DO.soft }}>{boyutMetni(d.boyut)}</span>
          ) : null}
          {silinebilir && (
            <button
              type="button"
              aria-label="Dosyayı kaldır"
              onClick={() => onSil(d)}
              style={{
                border: 'none',
                background: 'none',
                color: DO.red,
                cursor: 'pointer',
                fontSize: 15,
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function DosyaSec({ onSec, mesgul, etiket, ayarlar }) {
  const ref = useRef(null);
  const sinir = (ayarlar && ayarlar.dosyaMb) || 5;
  return (
    <>
      <input
        ref={ref}
        type="file"
        style={{ display: 'none' }}
        data-dosya-girdi
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          e.target.value = '';
          if (!f) return;
          const karar = K().dosyaKarari
            ? K().dosyaKarari({ ad: f.name, boyut: f.size }, sinir)
            : { izin: true };
          if (!karar.izin) return alert(karar.hata);
          onSec(f);
        }}
      />
      <Dugme onClick={() => ref.current && ref.current.click()} disabled={mesgul}>
        {mesgul ? 'Yükleniyor…' : etiket || '+ Dosya ekle'}
      </Dugme>
      <span style={{ fontSize: 11, color: DO.soft }}>En fazla {sinir} MB</span>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// ANA BİLEŞEN
// ══════════════════════════════════════════════════════════════
function DersOdalariApp({ currentUser, activeDepartment }) {
  const ogrenci = currentUser && currentUser.role === 'student';
  const [ayarlar, setAyarlar] = useState(null);
  const [donem, setDonem] = useState('');
  const [odalar, setOdalar] = useState(null);
  const [hata, setHata] = useState('');
  const [odaId, setOdaId] = useState('');
  const [icerikId, setIcerikId] = useState('');
  const [sekme, setSekme] = useState('akis');

  useEffect(() => {
    api('/ayarlar')
      .then((a) => {
        setAyarlar(a);
        setDonem((d) => d || a.donem);
      })
      .catch((e) => setHata(e.message));
  }, []);

  const listeyiYukle = useCallback(() => {
    if (!donem) return;
    const q =
      '?donem=' +
      encodeURIComponent(donem) +
      (!ogrenci && activeDepartment ? '&bolum=' + encodeURIComponent(activeDepartment) : '');
    api('/odalar' + q)
      .then((r) => {
        setOdalar(r.odalar || []);
        setHata('');
      })
      .catch((e) => setHata(e.message));
  }, [donem, ogrenci, activeDepartment]);
  useEffect(listeyiYukle, [listeyiYukle]);

  // Zildeki bildirim: ilgili oda ve paylaşım açılır.
  (window.useBildirimHedefi || (() => {}))('dersodalari', (h) => {
    const m = (h && h.meta) || {};
    if (m.odaId) {
      setOdaId(String(m.odaId));
      setIcerikId(m.icerikId ? String(m.icerikId) : '');
      setSekme('akis');
    }
  });

  if (currentUser && currentUser.aday) {
    return <Bos baslik="Ders odaları aday hesaplarına kapalıdır." />;
  }

  if (odaId) {
    return (
      <OdaEkrani
        odaId={odaId}
        icerikId={icerikId}
        setIcerikId={setIcerikId}
        sekme={sekme}
        setSekme={setSekme}
        ayarlar={ayarlar}
        currentUser={currentUser}
        geri={() => {
          setOdaId('');
          setIcerikId('');
          setSekme('akis');
          listeyiYukle();
        }}
      />
    );
  }

  const secenekler = donemSecenekleri(ayarlar && ayarlar.donem);
  return (
    <div
      className="do-kap"
      style={{ fontFamily: "'Inter', sans-serif", color: DO.text }}
      data-oda-listesi
    >
      <StilBlogu />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: DO.primary }}>Ders Odaları</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: DO.muted }}>
            {ogrenci
              ? 'Bu dönem ders seçiminde seçtiğiniz derslerin odaları.'
              : 'Verdiğiniz derslerin odaları' +
                (activeDepartment ? ' ve yetki alanınızdaki bölüm dersleri.' : '.')}
          </p>
        </div>
        <label
          style={{ fontSize: 13, color: DO.muted, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          Dönem
          <select
            value={donem}
            onChange={(e) => {
              setOdalar(null);
              setDonem(e.target.value);
            }}
            data-donem-sec
            style={{
              padding: '7px 10px',
              borderRadius: 8,
              border: '1px solid ' + DO.border,
              fontSize: 13,
            }}
          >
            {secenekler.map((d) => (
              <option key={d} value={d}>
                {K().donemEtiketi ? K().donemEtiketi(d) : d}
              </option>
            ))}
          </select>
        </label>
      </div>
      {hata && <Uyari>{hata}</Uyari>}
      {odalar == null && !hata && <Bos baslik="Yükleniyor…" />}
      {odalar && !odalar.length && (
        <Bos
          baslik="Bu dönem için ders odası yok."
          alt={
            ogrenci
              ? 'Ders odasına katılmak için dersi Öğrenci Portalı → Ders Seçimi alanından seçmelisiniz.'
              : 'Ders programında hocası olduğunuz bir ders bulunamadı.'
          }
        />
      )}
      {odalar && odalar.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {odalar.map((o) => (
            <button
              key={o.id}
              type="button"
              data-oda-karti={o.id}
              onClick={() => {
                setOdaId(o.id);
                setIcerikId('');
                setSekme('akis');
              }}
              style={{
                ...kart,
                borderRadius: 12,
                padding: 0,
                textAlign: 'left',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  background: bantZemini(o.renk || varsayilanRenk(o.id)),
                  backgroundImage:
                    'radial-gradient(circle at 92% 0%, rgba(45,212,191,.25), transparent 45%), ' +
                    bantZemini(o.renk || varsayilanRenk(o.id)),
                  color: '#fff',
                  padding: '18px 16px 20px',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {o.dersKod}
                  {K().kisaYil ? ' , ' + K().kisaYil(o.donem) : ''}
                </div>
                <div style={{ fontSize: 13, opacity: 0.92, marginTop: 4 }}>{o.dersAd}</div>
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  fontSize: 12,
                  color: DO.muted,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {(o.hocalar || []).join(', ') || '—'}
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>
                  {o.odevSayisi || 0} ödev ·{' '}
                  {o.rol === 'hoca' ? 'Akademisyen' : o.rol === 'yetkili' ? 'Yetkili' : 'Öğrenci'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Bos({ baslik, alt }) {
  return (
    <div style={{ ...kart, padding: 32, textAlign: 'center', color: DO.muted }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: DO.primary }}>{baslik}</div>
      {alt && <div style={{ fontSize: 13, marginTop: 6 }}>{alt}</div>}
    </div>
  );
}
function Uyari({ children, tur }) {
  const r = tur === 'bilgi' ? [DO.accentLight, DO.accent] : [DO.redLight, DO.red];
  return (
    <div
      role="alert"
      style={{
        background: r[0],
        color: r[1],
        border: '1px solid ' + r[1] + '40',
        borderRadius: 8,
        padding: '10px 12px',
        fontSize: 13,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// YERLEŞİM: ortalanmış sekme çubuğu, simetrik içerik, akış ızgarası
//
// Sekme çubuğu üç sütunlu bir ızgaradır (1fr · auto · 1fr): sol ve sağ
// sütun eşit genişlikte olduğu için sekmeler, iki yandaki düğmelerin
// genişliğinden bağımsız olarak sayfanın TAM ortasında durur. İçerik de
// 1200px'lik ortalanmış bir kapta akar — sağdan ve soldan eşit boşluk.
// Medya sorgusu satır içi stille yazılamadığı için küçük bir stil bloğu
// bir kez sayfaya eklenir.
// ══════════════════════════════════════════════════════════════
const DO_STIL = `
.do-kap{max-width:1200px;margin:0 auto;width:100%}
.do-ust-kap{position:relative;max-width:1200px;margin:0 auto 20px;background:#fff;border:1px solid #E2E8F0;border-radius:14px;box-shadow:0 1px 2px rgba(15,23,42,.05);overflow:hidden}
.do-ust-kap::after{content:'';position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,#1B2A4A 0%,#0F766E 60%,#99F6E4 100%)}
.do-ust{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:12px;padding:10px 14px 13px}
.do-sekmeler{display:inline-flex;gap:4px;padding:4px;border-radius:11px;background:#F1F5F9;border:1px solid #E2E8F0;max-width:100%;overflow-x:auto;scrollbar-width:none}
.do-sekmeler::-webkit-scrollbar{display:none}
.do-sekme{display:inline-flex;align-items:center;gap:7px;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;background:transparent;color:#64748B;white-space:nowrap;transition:background .15s,color .15s}
.do-sekme:hover{background:#E2E8F0;color:#1B2A4A}
.do-sekme-aktif,.do-sekme-aktif:hover{background:#1B2A4A;color:#fff;box-shadow:0 1px 3px rgba(15,23,42,.2)}
.do-sekmeler-tam{display:flex;width:100%;box-sizing:border-box}
.do-sekmeler-tam .do-sekme{flex:1 1 0;justify-content:center;min-width:max-content}
.do-sekme-sayi{min-width:20px;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:700;background:#E2E8F0;color:#475569}
.do-sekme-aktif .do-sekme-sayi{background:rgba(255,255,255,.18);color:#fff}
@media (max-width:560px){.do-kart-simge{display:none!important}.do-calisma-kart{padding:16px!important}}
.do-ayrac{width:1px;align-self:stretch;margin:4px 2px;background:#E2E8F0}
.do-ust>.do-sol{justify-self:start;display:flex;align-items:center;gap:10px;min-width:0}
.do-ust>.do-orta{justify-self:center}
.do-ust>.do-sag{justify-self:end;display:flex;align-items:center;gap:8px}
@media (max-width:820px){.do-ust{grid-template-columns:minmax(0,1fr)}.do-ust>.do-sol{justify-self:start}.do-ust>.do-orta{justify-self:stretch;min-width:0}.do-ust>.do-orta .do-sekmeler{display:flex;width:100%}.do-ust>.do-sag{justify-self:end}}
.do-izgara{display:grid;grid-template-columns:minmax(0,1fr);gap:24px;align-items:start}
@media (min-width:1024px){.do-izgara{grid-template-columns:minmax(0,4fr) minmax(0,8fr)}}
.do-ek-izgara{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}
@media (min-width:640px){.do-ek-izgara{grid-template-columns:repeat(2,minmax(0,1fr))}}
@keyframes do-nabiz{0%,100%{opacity:1}50%{opacity:.35}}
.do-nabiz{animation:do-nabiz 2s ease-in-out infinite}
.do-satir:hover{background:#F1F5F9}
.do-yari-saydam:hover{background:rgba(255,255,255,.26)!important}
.do-calisma-izgara{display:grid;grid-template-columns:minmax(0,1fr);gap:24px;align-items:start}
@media (min-width:1024px){.do-calisma-izgara{grid-template-columns:minmax(0,8fr) minmax(0,4fr)}}
.do-iki-satir{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.do-cip:hover{background:#E2E8F0!important}
.do-kisi-izgara{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
@media (min-width:900px){.do-kisi-izgara{grid-template-columns:repeat(2,minmax(0,1fr))}}
.do-kart-hover{transition:box-shadow .15s,border-color .15s}
.do-kart-hover:hover{border-color:#CBD5E1!important;box-shadow:0 4px 14px rgba(15,23,42,.08)!important}
`;
function StilBlogu() {
  useEffect(() => {
    if (document.getElementById('do-stil')) return;
    const el = document.createElement('style');
    el.id = 'do-stil';
    el.textContent = DO_STIL;
    document.head.appendChild(el);
  }, []);
  return null;
}

// Satır içi SVG simgeler (ek yazı tipi yüklemeden).
const SIMGE = {
  geri: 'M10 19l-7-7m0 0l7-7m-7 7h18',
  kopya:
    'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  palet:
    'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
  grup: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  kep: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
  bina: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  kamera:
    'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  bilgi: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  saat: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  konum:
    'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  kisi: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  takvim: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  odev: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  tamam: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  klasor:
    'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z',
  megafon:
    'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  arti: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z',
  ataç: 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13',
  baglanti:
    'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  yorum:
    'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z',
  gonder:
    'M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5',
  belge:
    'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  indir: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  akis: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  soru: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  kod: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  kalem:
    'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
  cop: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  dis: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
  nokta: 'M12 5h.01M12 12h.01M12 19h.01',
  ara: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  zarf: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  telefon:
    'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  sag: 'M9 5l7 7-7 7',
  ok: 'M14 5l7 7m0 0l-7 7m7-7H3',
  grafik:
    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
};
function Ikon({ ad, boyut, renk, kalinlik }) {
  return (
    <svg
      width={boyut || 18}
      height={boyut || 18}
      viewBox="0 0 24 24"
      fill="none"
      stroke={renk || 'currentColor'}
      strokeWidth={kalinlik || 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: '0 0 auto' }}
    >
      <path d={SIMGE[ad] || SIMGE.bilgi} />
    </svg>
  );
}

// Renk karıştırma: bant geçişi oda renginden türetilir, tema dışına taşmaz.
function karistir(a, b, oran) {
  const hx = (h) => {
    const s = String(h || '').replace('#', '');
    return s.length === 6 ? [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) : [27, 42, 74];
  };
  const x = hx(a);
  const y = hx(b);
  return (
    '#' +
    x
      .map((v, i) =>
        Math.round(v + (y[i] - v) * oran)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}
const bantZemini = (renk) =>
  'linear-gradient(110deg, ' +
  karistir(renk, '#000000', 0.38) +
  ' 0%, ' +
  renk +
  ' 55%, ' +
  karistir(renk, '#1B2A4A', 0.45) +
  ' 100%)';

// Unvan kelimeleri düşürülür. \b Türkçe harfleri (Ö, Ü, Ş) sözcük karakteri
// saymadığı için regex yerine kelime kelime karşılaştırılır.
const UNVANLAR = new Set(['prof', 'doç', 'dr', 'öğr', 'gör', 'üyesi', 'arş', 'uzm', 'okt']);
const basHarfler = (ad) => {
  const temiz = metin(ad)
    .split(/\s+/)
    .filter((k) => k && !UNVANLAR.has(k.replace(/\./g, '').toLocaleLowerCase('tr-TR')));
  if (!temiz.length) return '?';
  const ilk = temiz[0][0];
  const son = temiz.length > 1 ? temiz[temiz.length - 1][0] : '';
  return (ilk + son).toLocaleUpperCase('tr-TR');
};

function Avatar({ ad, boyut, hoca }) {
  const b = boyut || 36;
  return (
    <span
      aria-hidden="true"
      style={{
        width: b,
        height: b,
        flex: '0 0 ' + b + 'px',
        borderRadius: '50%',
        background: hoca ? DO.primary : DO.accentLight,
        color: hoca ? '#fff' : DO.accent,
        border: hoca ? 'none' : '1px solid ' + DO.accentBorder,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(b * 0.36),
        fontWeight: 700,
        letterSpacing: 0.3,
      }}
    >
      {basHarfler(ad)}
    </span>
  );
}

// Paylaşım metni: satır sonları korunur, http(s) bağlantıları tıklanır.
function ZenginMetin({ yazi }) {
  const parcalar = K().baglantilariAyir ? K().baglantilariAyir(yazi) : [{ t: yazi }];
  return (
    <>
      {parcalar.map((p, i) =>
        p.url ? (
          <a
            key={i}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: DO.accent, wordBreak: 'break-all' }}
          >
            {p.url}
          </a>
        ) : (
          <React.Fragment key={i}>{p.t}</React.Fragment>
        )
      )}
    </>
  );
}

const DOSYA_RENGI = (u) => {
  const x = metin(u).toLowerCase();
  if (x === 'pdf') return DO.red;
  if (['doc', 'docx', 'odt', 'rtf', 'txt'].includes(x)) return '#1E3A8A';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(x)) return DO.green;
  if (['ppt', 'pptx', 'odp'].includes(x)) return DO.amber;
  if (['zip', 'rar', '7z'].includes(x)) return '#475569';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(x)) return '#7C3AED';
  return DO.accent;
};
const dosyaSimgesi = (u) =>
  [
    'c',
    'cpp',
    'h',
    'hpp',
    'cs',
    'py',
    'java',
    'js',
    'ts',
    'html',
    'css',
    'sql',
    'ipynb',
    'm',
    'r',
    'json',
    'xml',
  ].includes(metin(u).toLowerCase())
    ? 'kod'
    : 'belge';

// ── ORTALANMIŞ ÜST ÇUBUK ──
// Beyaz bir şerit: solda geri dönüş ve ders künyesi, ortada simgeli sekmeler,
// altta tema renklerinde ince bir vurgu çizgisi. Dar ekranda sekmeler
// sarmalanmaz, yatay kayar.
const SEKME_SIMGESI = {
  akis: 'akis',
  odevler: 'odev',
  kisiler: 'grup',
  notlar: 'grafik',
  talimatlar: 'belge',
  calisma: 'odev',
};
function UstCubuk({ sol, sekmeler, aktif, sec, sag, veriAdi }) {
  return (
    <div className="do-ust-kap" data-oda-ust-cubuk>
      <div className="do-ust">
        <div className="do-sol">{sol}</div>
        <div className="do-orta">
          {sekmeler && sekmeler.length > 0 && (
            <nav role="tablist" className="do-sekmeler">
              {sekmeler.map(([id, ad]) => {
                const secili = aktif === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={secili}
                    className={secili ? 'do-sekme do-sekme-aktif' : 'do-sekme'}
                    {...{ [veriAdi || 'data-oda-sekme']: id }}
                    onClick={() => sec(id)}
                  >
                    {SEKME_SIMGESI[id] && <Ikon ad={SEKME_SIMGESI[id]} boyut={16} />}
                    {ad}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
        <div className="do-sag">{sag}</div>
      </div>
    </div>
  );
}

function GeriDugmesi({ onClick, etiket }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="do-satir"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: 'none',
        background: 'transparent',
        color: DO.primary,
        borderRadius: 8,
        padding: '7px 10px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      <Ikon ad="geri" boyut={16} />
      {etiket}
    </button>
  );
}

const KodRozeti = ({ kod }) => (
  <span
    style={{
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 12,
      fontWeight: 600,
      padding: '3px 8px',
      borderRadius: 6,
      background: '#EEF2F7',
      color: DO.primary,
      whiteSpace: 'nowrap',
    }}
  >
    {kod}
  </span>
);

const kartBasligi = (simge, baslik, sag) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: '#EEF2F7',
          color: DO.primary,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ikon ad={simge} boyut={17} />
      </span>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: DO.text }}>{baslik}</h3>
    </div>
    {sag}
  </div>
);
const yanKart = {
  ...kart,
  borderRadius: 12,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

// ══════════════════════════════════════════════════════════════
// ODA
// ══════════════════════════════════════════════════════════════
function OdaEkrani({ odaId, icerikId, setIcerikId, sekme, setSekme, ayarlar, currentUser, geri }) {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState('');
  const [form, setForm] = useState(null); // { tur, icerik? } — ödev ya da düzenleme
  const [ozellestir, setOzellestir] = useState(false);
  const [oneri, setOneri] = useState(null); // duyuru yazıcısına hazır metin
  const yaziciRef = useRef(null);

  const yukle = useCallback(() => {
    api('/oda/' + encodeURIComponent(odaId))
      .then((r) => {
        setVeri(r);
        setHata('');
      })
      .catch((e) => setHata(e.message));
  }, [odaId]);
  useEffect(yukle, [yukle]);
  useEffect(() => {
    const h = () => yukle();
    const c = ['ders_odalari', 'oda_icerikleri', 'oda_teslimleri', 'oda_yorumlari'];
    c.forEach((x) => window.addEventListener('realtime:' + x, h));
    return () => c.forEach((x) => window.removeEventListener('realtime:' + x, h));
  }, [yukle]);

  if (hata && !veri) {
    return (
      <div className="do-kap" style={{ fontFamily: "'Inter', sans-serif" }}>
        <StilBlogu />
        <GeriDugmesi onClick={geri} etiket="Ders odaları" />
        <div style={{ height: 12 }} />
        <Uyari>{hata}</Uyari>
      </div>
    );
  }
  if (!veri) return <Bos baslik="Yükleniyor…" />;

  const { oda, rol, icerikler, yorumSayisi, benimTeslimlerim, ogrenciSayisi } = veri;
  const sonYorumlar = veri.sonYorumlar || {};
  const program = veri.program || [];
  const hocaBilgileri = veri.hocaBilgileri || [];
  const hoca = rol === 'hoca';
  const ogrenci = rol === 'ogrenci';
  const renk = oda.renk || varsayilanRenk(oda.id);
  const odevler = icerikler.filter((i) => i.tur === 'odev');
  const teslimHaritasi = new Map((benimTeslimlerim || []).map((t) => [t.icerikId, t]));
  const benimNo = metin(veri.ogrenciNo);
  const benimAd = metin(currentUser && (currentUser.name || currentUser.identifier));

  if (icerikId) {
    return (
      <IcerikEkrani
        icerikId={icerikId}
        oda={oda}
        rol={rol}
        ayarlar={ayarlar}
        renk={renk}
        geri={() => {
          setIcerikId('');
          yukle();
        }}
        duzenle={(icerik) => {
          setIcerikId('');
          setSekme('akis');
          setForm({ tur: icerik.tur, icerik });
        }}
      />
    );
  }

  const sekmeler = [
    ['akis', 'Akış'],
    ['odevler', 'Sınıf çalışmaları'],
    ['kisiler', 'Kişiler'],
  ];
  sekmeler.push(['notlar', 'Notlar']);

  const yaklasan = odevler
    .filter((o) => o.sonTarih && new Date(o.sonTarih).getTime() > Date.now())
    .filter((o) => !ogrenci || !(teslimHaritasi.get(o.id) || {}).teslimEdildi)
    .sort((a, b) => (a.sonTarih < b.sonTarih ? -1 : 1))
    .slice(0, 5);

  const silIcerik = async (icerik) => {
    if (
      !confirm(
        (icerik.tur === 'odev' ? 'Ödev' : 'Duyuru') +
          ' silinsin mi? Teslimler, notlar ve yorumlar da silinir.'
      )
    )
      return;
    try {
      await api('/icerik/' + encodeURIComponent(icerik.id) + '/sil', { body: {} });
      yukle();
    } catch (e) {
      alert(e.message);
    }
  };

  const formAlani = form && (
    <IcerikFormu
      oda={oda}
      tur={form.tur}
      mevcut={form.icerik}
      ayarlar={ayarlar}
      iptal={() => setForm(null)}
      kaydedildi={() => {
        setForm(null);
        yukle();
      }}
    />
  );

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif", color: DO.text }}
      data-oda-ekrani={oda.id}
      data-rol={rol}
    >
      <StilBlogu />
      <UstCubuk
        sol={
          <>
            <GeriDugmesi onClick={geri} etiket="Ders odaları" />
            <span className="do-ayrac" aria-hidden="true" />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 3,
                minWidth: 0,
              }}
            >
              <KodRozeti kod={oda.dersKod} />
              {oda.dersAd && (
                <span
                  data-ders-adi
                  title={oda.dersAd}
                  style={{
                    fontSize: 12,
                    color: DO.muted,
                    maxWidth: 280,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {oda.dersAd}
                </span>
              )}
            </div>
          </>
        }
        sekmeler={sekmeler}
        aktif={sekme}
        sec={setSekme}
        sag={null}
      />

      {sekme === 'akis' && (
        <div className="do-kap" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <OdaBandi
            oda={oda}
            renk={renk}
            hoca={hoca}
            ogrenciSayisi={ogrenciSayisi}
            program={program}
            ozellestir={() => setOzellestir((x) => !x)}
          />
          {ozellestir && (
            <OzellestirPenceresi
              oda={oda}
              kapat={() => setOzellestir(false)}
              kaydedildi={() => {
                setOzellestir(false);
                yukle();
              }}
            />
          )}
          <div className="do-izgara">
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              <DersBilgisiKarti
                oda={oda}
                program={program}
                ogrenci={ogrenci}
                hocaBilgileri={hocaBilgileri}
              />
              <YaklasanKarti liste={yaklasan} ac={setIcerikId} tumu={() => setSekme('odevler')} />
              <KaynaklarKarti icerikler={icerikler} />
            </aside>
            <main style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              {hoca && (
                <div
                  style={{
                    ...kart,
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: DO.accentLight,
                        color: DO.accent,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ikon ad="megafon" boyut={20} />
                    </span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>Ders Akışı ve Etkileşim</div>
                      <div style={{ fontSize: 12, color: DO.muted }}>
                        Öğrencilerle duyuru, ödev ve kaynak paylaşın
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      data-yeni-duyuru
                      onClick={() => {
                        setForm(null);
                        if (yaziciRef.current) {
                          yaziciRef.current.focus();
                          yaziciRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      style={birincilDugme}
                    >
                      <Ikon ad="arti" boyut={17} /> Yeni duyuru
                    </button>
                    <button
                      type="button"
                      data-yeni-odev
                      onClick={() => setForm({ tur: 'odev' })}
                      style={ikincilDugme}
                    >
                      <Ikon ad="odev" boyut={17} /> Yeni ödev
                    </button>
                  </div>
                </div>
              )}
              {hoca && !form && (
                <DuyuruYazici
                  oda={oda}
                  ayarlar={ayarlar}
                  benimAd={benimAd}
                  girdiRef={yaziciRef}
                  oneri={oneri}
                  yayinlandi={yukle}
                />
              )}
              {formAlani}
              {icerikler.map((i) => (
                <AkisKarti
                  key={i.id}
                  icerik={i}
                  renk={renk}
                  yorumSayisi={yorumSayisi[i.id] || 0}
                  sonYorumlar={sonYorumlar[i.id] || []}
                  teslim={ogrenci ? teslimHaritasi.get(i.id) : null}
                  ogrenciNo={benimNo}
                  ogrenci={ogrenci}
                  hoca={hoca}
                  benimAd={benimAd}
                  ac={() => setIcerikId(i.id)}
                  duzenle={() => setForm({ tur: i.tur, icerik: i })}
                  sil={() => silIcerik(i)}
                  yenile={yukle}
                />
              ))}
              {icerikler.length <= 1 && (
                <BaslangicKarti
                  bos={icerikler.length === 0}
                  hoca={hoca}
                  oner={(m) => {
                    setForm(null);
                    setOneri({ metin: m, zaman: Date.now() });
                  }}
                />
              )}
            </main>
          </div>
        </div>
      )}

      {sekme === 'odevler' && (
        <div className="do-kap">
          <SinifCalismalari
            icerikler={icerikler}
            teslimHaritasi={teslimHaritasi}
            benimNo={benimNo}
            ogrenci={ogrenci}
            yorumSayisi={yorumSayisi}
            odevOzetleri={veri.odevOzetleri || {}}
            ogrenciSayisi={ogrenciSayisi}
            sinavlar={veri.sinavlar || []}
            hoca={hoca}
            oda={oda}
            ac={setIcerikId}
          />
        </div>
      )}

      {sekme === 'kisiler' && (
        <div className="do-kap">
          <KisilerSekmesi
            oda={oda}
            rol={rol}
            ogrenciSayisi={ogrenciSayisi}
            hocaBilgileri={hocaBilgileri}
            notlaraGit={ogrenci ? null : () => setSekme('notlar')}
          />
        </div>
      )}
      {sekme === 'notlar' && (
        <div className="do-kap">
          <NotlarSekmesi oda={oda} rol={rol} ac={(id) => setIcerikId(id)} />
        </div>
      )}
    </div>
  );
}

const birincilDugme = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: 'none',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  background: DO.primary,
  color: '#fff',
  boxShadow: '0 1px 2px rgba(15,23,42,.15)',
};
const ikincilDugme = {
  ...birincilDugme,
  background: '#EEF2F7',
  color: DO.primary,
  boxShadow: 'none',
};

// ── BANT ──
function OdaBandi({ oda, renk, hoca, ogrenciSayisi, program, ozellestir }) {
  const [kopyalandi, setKopyalandi] = useState(false);
  const derslikler = [];
  (program || []).forEach((p) =>
    (p.derslikler || []).forEach((d) => !derslikler.includes(d) && derslikler.push(d))
  );
  const canli = K().guvenliBaglanti ? K().guvenliBaglanti(oda.canliDers) : '';
  const rozet = (simge, simgeRengi, yazi) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 8,
        background: 'rgba(255,255,255,.12)',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <Ikon ad={simge} boyut={17} renk={simgeRengi} />
      {yazi}
    </span>
  );
  const saydamDugme = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 8,
    border: 'none',
    background: 'rgba(255,255,255,.15)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  };
  return (
    <div
      data-oda-bandi
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 14,
        background: bantZemini(renk),
        color: '#fff',
        boxShadow: '0 10px 24px rgba(15,23,42,.18)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: -80,
          top: -120,
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,212,191,.28), transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '30%',
          bottom: -110,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(253,230,138,.16), transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.12,
          backgroundImage: 'radial-gradient(#99F6E4 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          padding: '22px 28px',
          minHeight: 210,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(255,255,255,.15)',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <span
              className="do-nabiz"
              style={{ width: 8, height: 8, borderRadius: '50%', background: '#99F6E4' }}
            />
            {K().donemEtiketi ? K().donemEtiketi(oda.donem) : oda.donem}
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="do-yari-saydam"
              title="Ders kodunu kopyala"
              data-kod-kopyala
              onClick={() => {
                const bitti = () => {
                  setKopyalandi(true);
                  setTimeout(() => setKopyalandi(false), 2000);
                };
                try {
                  navigator.clipboard.writeText(oda.dersKod).then(bitti, bitti);
                } catch (_) {
                  bitti();
                }
              }}
              style={saydamDugme}
            >
              <span
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  opacity: 0.75,
                }}
              >
                Kod:
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  color: '#99F6E4',
                  fontWeight: 700,
                }}
              >
                {oda.dersKod}
              </span>
              {kopyalandi ? (
                <span style={{ fontSize: 11, color: '#99F6E4' }}>Kopyalandı!</span>
              ) : (
                <Ikon ad="kopya" boyut={15} />
              )}
            </button>
            {hoca && (
              <button
                type="button"
                className="do-yari-saydam"
                onClick={ozellestir}
                style={saydamDugme}
              >
                <Ikon ad="palet" boyut={16} /> Özelleştir
              </button>
            )}
          </div>
        </div>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              lineHeight: 1.2,
              fontWeight: 700,
              letterSpacing: -0.3,
            }}
          >
            {oda.dersKod}
            {K().kisaYil ? ' , ' + K().kisaYil(oda.donem) : ''}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 19, fontWeight: 500, opacity: 0.88 }}>
            {oda.dersAd}
          </p>
          {oda.aciklama && (
            <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.8, maxWidth: 680 }}>
              {oda.aciklama}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {rozet('grup', '#99F6E4', ogrenciSayisi + ' Öğrenci')}
          {rozet('kep', '#FDE68A', (oda.hocalar || []).length + ' Akademisyen')}
          {derslikler.length > 0 && rozet('bina', '#CCFBF1', 'Derslik ' + derslikler.join(', '))}
          {canli && (
            <a
              href={canli}
              target="_blank"
              rel="noopener noreferrer"
              data-canli-ders
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                background: DO.accent,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(0,0,0,.2)',
              }}
            >
              <Ikon ad="kamera" boyut={17} /> Canlı Derse Katıl
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SOL KARTLAR ──
function DersBilgisiKarti({ oda, program, ogrenci, hocaBilgileri }) {
  const m = /^(\d{4})-\d{4}_(guz|bahar)$/.exec(metin(oda.donem));
  const cip = m
    ? m[2] === 'guz'
      ? "Güz '" + m[1].slice(2)
      : "Bahar '" + String(Number(m[1]) + 1).slice(2)
    : '';
  const derslikler = [];
  (program || []).forEach((p) =>
    (p.derslikler || []).forEach((d) => !derslikler.includes(d) && derslikler.push(d))
  );
  const hocalar = oda.hocalar || [];
  const satir = (simge, ust, alt, key) => (
    <div
      key={key}
      className="do-satir"
      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 6, borderRadius: 8 }}
    >
      <span style={{ color: DO.muted, marginTop: 1 }}>
        <Ikon ad={simge} boyut={19} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: DO.text }}>{ust}</div>
        {alt && <div style={{ fontSize: 12, color: DO.muted }}>{alt}</div>}
      </div>
    </div>
  );
  return (
    <section style={yanKart} data-ders-bilgisi>
      {kartBasligi(
        'bilgi',
        'Ders bilgisi',
        cip && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: DO.accent,
              background: DO.accentLight,
              border: '1px solid ' + DO.accentBorder,
              padding: '2px 8px',
              borderRadius: 6,
            }}
          >
            {cip}
          </span>
        )
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {program.length
          ? program.map((p, i) =>
              satir(
                'saat',
                p.gun + (p.baslangic ? ', ' + p.baslangic + (p.bitis ? ' - ' + p.bitis : '') : ''),
                'Haftalık ders saati',
                'p' + i
              )
            )
          : satir('saat', 'Ders saati girilmemiş', 'Ders programında bu ders bulunamadı', 'p')}
        {derslikler.length > 0 && satir('konum', derslikler.join(', '), 'Derslik', 'd')}
        {hocalar.length === 0
          ? satir('kisi', 'Akademisyen atanmamış', '', 'h')
          : hocalar.map((h) => (
              <HocaIletisim key={h} ad={h} bilgi={hocaBilgisiBul(hocaBilgileri, h)} />
            ))}
      </div>
      <button
        type="button"
        onClick={() => {
          window.location.hash = '#' + (ogrenci ? 'benim' : 'dersprogrami');
        }}
        style={{
          ...ikincilDugme,
          justifyContent: 'center',
          width: '100%',
          background: '#F1F5F9',
        }}
      >
        <Ikon ad="takvim" boyut={17} /> Ders programını incele
      </button>
    </section>
  );
}

function kalanMetni(son) {
  const ms = new Date(son).getTime() - Date.now();
  const gun = Math.floor(ms / (24 * 3600 * 1000));
  if (ms < 24 * 3600 * 1000) return 'Bugün';
  if (gun === 1) return 'Yarın';
  return gun + ' gün';
}

function YaklasanKarti({ liste, ac, tumu }) {
  return (
    <section style={yanKart} data-yaklasan>
      {kartBasligi(
        'odev',
        'Teslim tarihi yaklaşanlar',
        <button
          type="button"
          onClick={tumu}
          style={{
            border: 'none',
            background: 'none',
            color: DO.accent,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Tümünü gör
        </button>
      )}
      {liste.length === 0 ? (
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            background: '#F8FAFC',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: DO.accentLight,
              color: DO.accent,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ikon ad="tamam" boyut={21} />
          </span>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            Yakın zamanda teslim edilecek ödev yok
          </div>
          <div style={{ fontSize: 12, color: DO.muted, maxWidth: 230 }}>
            Şu an yaklaşan bir teslim tarihi bulunmuyor.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {liste.map((o) => {
            const kalan = kalanMetni(o.sonTarih);
            const acil = kalan === 'Bugün' || kalan === 'Yarın';
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => ac(o.id)}
                className="do-satir"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 8,
                  borderRadius: 10,
                  border: '1px solid ' + DO.border,
                  background: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#EEF2F7',
                    color: DO.primary,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: '0 0 32px',
                  }}
                >
                  <Ikon ad="odev" boyut={17} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: DO.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {o.baslik}
                  </div>
                  <div style={{ fontSize: 12, color: DO.muted }}>{tarihSaat(o.sonTarih)}</div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: acil ? DO.amberLight : '#EEF2F7',
                    color: acil ? DO.amber : DO.muted,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {kalan}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function KaynaklarKarti({ icerikler }) {
  const [hepsi, setHepsi] = useState(false);
  const dosyalar = [];
  (icerikler || []).forEach((i) =>
    (i.ekler || []).forEach((d) => dosyalar.push({ ...d, kaynak: i.baslik || 'Duyuru' }))
  );
  const gorunen = hepsi ? dosyalar : dosyalar.slice(0, 5);
  return (
    <section style={{ ...yanKart, gap: 10 }} data-kaynaklar>
      {kartBasligi(
        'klasor',
        'Kaynaklar ve Dokümanlar',
        <span style={{ fontSize: 11, fontWeight: 600, color: DO.muted }}>
          {dosyalar.length} Dosya
        </span>
      )}
      {dosyalar.length === 0 ? (
        <div style={{ fontSize: 12, color: DO.muted }}>
          Paylaşımlara eklenen dosyalar burada toplanır.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {gorunen.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => dosyaAc(d)}
              className="do-satir"
              title={d.kaynak}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 8,
                borderRadius: 8,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Ikon ad={dosyaSimgesi(d.uzanti)} boyut={19} renk={DOSYA_RENGI(d.uzanti)} />
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13,
                  color: DO.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {d.ad}
              </span>
              <span style={{ color: DO.soft }}>
                <Ikon ad="indir" boyut={16} />
              </span>
            </button>
          ))}
          {dosyalar.length > 5 && (
            <button
              type="button"
              onClick={() => setHepsi((h) => !h)}
              style={{
                border: 'none',
                background: 'none',
                color: DO.accent,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px',
                textAlign: 'left',
              }}
            >
              {hepsi ? 'Daha az göster' : 'Tümünü göster (' + dosyalar.length + ')'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ── AKADEMİSYEN İLETİŞİM ──
// Ada tıklanınca e-posta ve dahili açılır. Bilgiler `professors` kaydından
// gelir (Bölüm Yönetimi ya da akademisyenin Benim Sayfam kartı).
const hocaBilgisiBul = (liste, ad) => (liste || []).find((b) => b && b.ad === ad) || null;

function HocaIletisim({ ad, bilgi }) {
  const [acik, setAcik] = useState(false);
  const b = bilgi || {};
  const iletisimVar = !!(b.email || b.dahili);
  const satirStili = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: DO.text,
    minWidth: 0,
  };
  return (
    <div
      data-hoca-iletisim={ad}
      style={{
        borderRadius: 10,
        border: '1px solid ' + (acik ? DO.accentBorder : 'transparent'),
        background: acik ? '#F8FFFE' : 'transparent',
        transition: 'background .15s, border-color .15s',
      }}
    >
      <button
        type="button"
        aria-expanded={acik}
        title="İletişim bilgilerini göster"
        onClick={() => setAcik((x) => !x)}
        className="do-satir"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: 6,
          border: 'none',
          background: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {b.photoURL ? (
          <img
            src={b.photoURL}
            alt=""
            style={{
              width: 34,
              height: 34,
              flex: '0 0 34px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1px solid ' + DO.border,
            }}
          />
        ) : (
          <Avatar ad={ad} boyut={34} hoca />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: DO.text }}>{ad}</div>
          <div style={{ fontSize: 12, color: DO.muted }}>Dersin sorumlusu · iletişim</div>
        </div>
        <span
          style={{
            color: DO.soft,
            display: 'inline-flex',
            transform: acik ? 'rotate(90deg)' : 'none',
            transition: 'transform .15s',
          }}
        >
          <Ikon ad="sag" boyut={16} />
        </span>
      </button>
      {acik && (
        <div
          data-hoca-iletisim-ayrinti
          style={{
            padding: '2px 12px 12px 50px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {b.email && (
            <div style={satirStili}>
              <Ikon ad="zarf" boyut={16} renk={DO.muted} />
              <a
                href={'mailto:' + b.email}
                style={{
                  color: DO.accent,
                  textDecoration: 'none',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {b.email}
              </a>
            </div>
          )}
          {b.dahili && (
            <div style={satirStili}>
              <Ikon ad="telefon" boyut={16} renk={DO.muted} />
              <span>Dahili: {b.dahili}</span>
            </div>
          )}
          {!iletisimVar && (
            <div style={{ fontSize: 12, color: DO.muted }}>
              Akademisyen henüz iletişim bilgisi girmemiş.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SINIF ÇALIŞMALARI
//
// Ödevler ve dosya eklenmiş paylaşımlar (ders materyali) tek sayfada;
// konu çipleriyle süzülür, aramayla daraltılır. Sağda teslim takvimi,
// ödev puan dağılımı ve dersin sorumluları. Paylaşım oluşturma Akış'tadır.
// ══════════════════════════════════════════════════════════════
const kucukHarf = (v) => metin(v).toLocaleLowerCase('tr-TR');
const GUN_MS = 24 * 3600 * 1000;

function Etiket({ children, zemin, renk, kenar }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: 5,
        background: zemin,
        color: renk,
        border: kenar ? '1px solid ' + kenar : 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function CalismaSimgesi({ simge, zemin, renk }) {
  return (
    <span
      className="do-kart-simge"
      style={{
        width: 44,
        height: 44,
        flex: '0 0 44px',
        borderRadius: 10,
        background: zemin,
        color: renk,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ikon ad={simge} boyut={22} />
    </span>
  );
}

function MateryalEkleri({ ekler }) {
  if (!ekler || !ekler.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {ekler.map((d) => (
        <button
          key={d.id}
          type="button"
          className="do-cip"
          onClick={() => dosyaAc(d)}
          title={d.ad}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            maxWidth: '100%',
            minWidth: 0,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid ' + DO.border,
            background: '#F1F5F9',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <Ikon ad={dosyaSimgesi(d.uzanti)} boyut={18} renk={DOSYA_RENGI(d.uzanti)} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: DO.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {d.ad}
          </span>
          {d.boyut ? (
            <span
              style={{
                fontSize: 11,
                color: DO.muted,
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                whiteSpace: 'nowrap',
              }}
            >
              {boyutMetni(d.boyut)}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function CalismaAlti({ yorum, sol, ac, etiket }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        paddingTop: 12,
        borderTop: '1px solid ' + DO.border,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            color: DO.muted,
          }}
        >
          <Ikon ad="yorum" boyut={15} /> {yorum} Sınıf yorumu
        </span>
        {sol}
      </div>
      <button
        type="button"
        onClick={ac}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: 'none',
          background: 'none',
          color: DO.primary,
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {etiket} <Ikon ad="ok" boyut={15} />
      </button>
    </div>
  );
}

function OdevCalismaKarti({ odev, teslim, durum, ozet, ogrenci, ogrenciSayisi, yorum, ac }) {
  const son = odev.sonTarih ? new Date(odev.sonTarih).getTime() : NaN;
  const kalanMs = son - Date.now();
  const acil = Number.isFinite(son) && kalanMs < 3 * GUN_MS;
  const notMetni =
    ogrenci && teslim && teslim.geriVerildi && metin(teslim.puan) !== ''
      ? K().puanMetni(teslim.puan) + (odev.puan ? '/' + odev.puan : '')
      : '';
  const sayac = (sayi, ad, renk) => (
    <div style={{ minWidth: 92 }}>
      <div style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 700, color: renk }}>{sayi}</div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: DO.muted,
        }}
      >
        {ad}
      </div>
    </div>
  );
  return (
    <article
      data-odev-satiri={odev.id}
      className="do-kart-hover do-calisma-kart"
      style={{ ...kart, borderRadius: 12, padding: 20, display: 'flex', gap: 16 }}
    >
      <CalismaSimgesi simge="odev" zemin="#EEF2F7" renk={DO.primary} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Etiket zemin={DO.primary} renk="#fff">
                Ödev
              </Etiket>
              {odev.kabulAcik === false ? (
                <Etiket zemin="#F1F5F9" renk={DO.muted} kenar={DO.border}>
                  Gönderim kapalı
                </Etiket>
              ) : (
                <Etiket zemin={DO.accentLight} renk={DO.accent} kenar={DO.accentBorder}>
                  <span
                    style={{ width: 6, height: 6, borderRadius: '50%', background: DO.accent }}
                  />
                  Yayında
                </Etiket>
              )}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 500,
                  color: acil ? DO.red : DO.muted,
                }}
              >
                <Ikon ad="saat" boyut={14} />
                {odev.sonTarih ? 'Teslim: ' + tarihSaat(odev.sonTarih) : 'Teslim tarihi yok'}
              </span>
              {odev.puan ? (
                <span style={{ fontSize: 12, color: DO.muted }}>· {odev.puan} Puan</span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={ac}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1.35,
                fontWeight: 600,
                color: DO.primary,
              }}
            >
              {odev.baslik || 'Ödev'}
            </button>
          </div>
          {ogrenci && (durum || notMetni) && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 4,
              }}
            >
              {durum && <DurumRozeti durum={durum} />}
              {notMetni && (
                <span style={{ fontSize: 13, fontWeight: 700, color: DO.accent }}>{notMetni}</span>
              )}
            </div>
          )}
        </div>
        {odev.metin && (
          <p
            className="do-iki-satir"
            style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: '#475569' }}
          >
            {odev.metin}
          </p>
        )}
        <MateryalEkleri ekler={odev.ekler} />
        {!ogrenci && ozet && (
          <div
            data-odev-ozeti
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              flexWrap: 'wrap',
              padding: '14px 18px',
              borderRadius: 10,
              background: '#F2F3FF',
            }}
          >
            {sayac(ogrenciSayisi, 'Atandı', DO.primary)}
            <span style={{ width: 1, alignSelf: 'stretch', background: DO.border }} />
            {sayac(ozet.teslim, 'Teslim edildi', DO.accent)}
            <span style={{ width: 1, alignSelf: 'stretch', background: DO.border }} />
            {sayac(ozet.notlu, 'Puanlandı', DO.text)}
            <button
              type="button"
              onClick={ac}
              style={{ ...birincilDugme, marginLeft: 'auto', padding: '9px 16px' }}
            >
              Ödevi görüntüle
            </button>
          </div>
        )}
        <CalismaAlti
          yorum={yorum}
          ac={ac}
          etiket="Talimatları incele"
          sol={
            ogrenci && teslim && teslim.teslimEdildi ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                  color: DO.accent,
                }}
              >
                <Ikon ad="tamam" boyut={15} />
                {teslim.geriVerildi ? 'Notlandırıldı' : 'Teslim edildi'}
              </span>
            ) : null
          }
        />
      </div>
    </article>
  );
}

function MateryalKarti({ icerik, yorum, ac }) {
  return (
    <article
      data-materyal-satiri={icerik.id}
      className="do-kart-hover do-calisma-kart"
      style={{ ...kart, borderRadius: 12, padding: 20, display: 'flex', gap: 16 }}
    >
      <CalismaSimgesi simge="belge" zemin="#E0F2FE" renk="#1E3A8A" />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Etiket zemin="#EEF2F7" renk={DO.primary}>
            Ders materyali
          </Etiket>
          {icerik.olusturuldu && (
            <span style={{ fontSize: 12, color: DO.muted }}>
              · {tarihSaat(icerik.olusturuldu)} tarihinde yayınlandı
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={ac}
          style={{
            border: 'none',
            background: 'none',
            padding: 0,
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1.35,
            fontWeight: 600,
            color: DO.primary,
          }}
        >
          {icerik.baslik || (icerik.ekler.length === 1 ? icerik.ekler[0].ad : 'Ders materyali')}
        </button>
        {icerik.metin && (
          <p
            className="do-iki-satir"
            style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: '#475569' }}
          >
            {icerik.metin}
          </p>
        )}
        <MateryalEkleri ekler={icerik.ekler} />
        <CalismaAlti yorum={yorum} ac={ac} etiket="Ayrıntılar" />
      </div>
    </article>
  );
}

// Sınav programındaki bir sınavın yerel zamanı ve okunur metni.
const sinavZamani = (x) => new Date(x.tarih + 'T' + (x.saat || '09:00'));
const sinavMetni = (x) =>
  sinavZamani(x).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) +
  (x.saat ? ' ' + x.saat : '') +
  (x.derslik ? ' · ' + x.derslik : '');

// Teslim takvimi: yaklaşan ödev son tarihleri ve sınav programındaki
// sınavlar (vize / final / bütünleme) tek listede, zamana göre.
function TeslimTakvimiKarti({ odevler, sinavlar, ac }) {
  const simdi = Date.now();
  const ogeler = odevler
    .filter((o) => o.sonTarih && new Date(o.sonTarih).getTime() > simdi)
    .map((o) => ({
      id: o.id,
      baslik: o.baslik,
      zaman: new Date(o.sonTarih).getTime(),
      alt: tarihSaat(o.sonTarih) + ' · ' + kalanMetni(o.sonTarih),
      ac: () => ac(o.id),
    }))
    .concat(
      (sinavlar || [])
        .filter((x) => sinavZamani(x).getTime() > simdi - 3 * 3600 * 1000)
        .map((x) => ({
          id: 'sinav-' + x.id,
          baslik: x.etiket + ' sınavı',
          sinav: x.etiket,
          zaman: sinavZamani(x).getTime(),
          alt: sinavMetni(x),
        }))
    )
    .sort((a, b) => a.zaman - b.zaman)
    .slice(0, 6);
  return (
    <section style={yanKart} data-teslim-takvimi>
      {kartBasligi('takvim', 'Teslim ve sınav takvimi')}
      {ogeler.length === 0 ? (
        <div style={{ fontSize: 12, color: DO.muted }}>Yaklaşan bir teslim ya da sınav yok.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ogeler.map((o) => {
            const acil = o.zaman - simdi < 3 * GUN_MS;
            const Kap = o.ac ? 'button' : 'div';
            return (
              <Kap
                key={o.id}
                {...(o.ac ? { type: 'button', onClick: o.ac, className: 'do-satir' } : {})}
                data-takvim-ogesi={o.sinav ? 'sinav' : 'odev'}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: o.sinav ? '1px solid ' + DO.accentBorder : 'none',
                  background: o.sinav ? DO.accentLight : '#F2F3FF',
                  cursor: o.ac ? 'pointer' : 'default',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    flex: '0 0 8px',
                    marginTop: 5,
                    borderRadius: '50%',
                    background: acil ? DO.red : o.sinav ? DO.accent : '#CBD5E1',
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: DO.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {o.baslik}
                  </div>
                  <div style={{ fontSize: 12, color: DO.muted }}>{o.alt}</div>
                </div>
              </Kap>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PuanDagilimiKarti({ odevler }) {
  const puanli = odevler
    .map((o) => ({ o, p: Number(o.puan) }))
    .filter((x) => Number.isFinite(x.p) && x.p > 0);
  if (!puanli.length) return null;
  const toplam = puanli.reduce((a, x) => a + x.p, 0);
  const renkler = [DO.accent, DO.primary, '#3B5078', '#115E59', '#78350F'];
  return (
    <section style={yanKart} data-puan-dagilimi>
      {kartBasligi('kep', 'Ödev puan dağılımı')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {puanli.map(({ o, p }, i) => {
          const oran = Math.round((p / toplam) * 100);
          return (
            <div key={o.id}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: 12,
                  marginBottom: 5,
                }}
              >
                <span
                  style={{
                    color: DO.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {o.baslik}
                </span>
                <span style={{ fontWeight: 700, color: DO.text, whiteSpace: 'nowrap' }}>
                  %{oran}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: '#EEF2F7' }}>
                <div
                  style={{
                    width: oran + '%',
                    height: '100%',
                    borderRadius: 999,
                    background: renkler[i % renkler.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          textAlign: 'right',
          fontSize: 11,
          color: DO.muted,
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        }}
      >
        Toplam: {K().puanMetni ? K().puanMetni(toplam) : toplam} puan · {puanli.length} ödev
      </div>
    </section>
  );
}

function SinifCalismalari({
  icerikler,
  teslimHaritasi,
  benimNo,
  ogrenci,
  yorumSayisi,
  odevOzetleri,
  ogrenciSayisi,
  sinavlar,
  hoca,
  oda,
  ac,
}) {
  const [suzgec, setSuzgec] = useState('hepsi');
  const [arsiv, setArsiv] = useState(false);
  const tumDosyalar = [];
  icerikler.forEach((i) =>
    (i.ekler || []).forEach((d) =>
      tumDosyalar.push({
        ...d,
        kaynak: (i.tur === 'odev' ? 'Ödev: ' : '') + (i.baslik || 'Duyuru'),
      })
    )
  );
  const [arama, setArama] = useState('');
  const odevler = icerikler.filter((i) => i.tur === 'odev');
  const materyaller = icerikler.filter((i) => i.tur !== 'odev' && (i.ekler || []).length > 0);
  const durumBul = (o) =>
    ogrenci && K().teslimDurumu ? K().teslimDurumu(o, teslimHaritasi.get(o.id), benimNo) : '';
  const q = kucukHarf(arama);
  const eslesir = (i) =>
    !q ||
    [i.baslik, i.metin, ...(i.ekler || []).map((d) => d.ad)].some((v) => kucukHarf(v).includes(q));

  const ACIK = ['atandi', 'eksik'];
  const yapilacakSayisi = odevler.filter((o) => ACIK.includes(durumBul(o))).length;
  // Ana sekmelerle aynı görünüm: simge, ad ve sayı.
  const cipler = [
    ['hepsi', 'Tüm çalışmalar', 'akis', odevler.length + materyaller.length],
    ['odev', 'Ödevler', 'odev', odevler.length],
    ['materyal', 'Ders materyalleri', 'belge', materyaller.length],
  ];
  if (ogrenci)
    cipler.push(
      ['yapilacak', 'Yapılacaklar', 'saat', yapilacakSayisi],
      ['tamam', 'Tamamlananlar', 'tamam', odevler.length - yapilacakSayisi]
    );

  let gorunenOdevler = odevler.filter(eslesir);
  if (suzgec === 'yapilacak')
    gorunenOdevler = gorunenOdevler.filter((o) => ACIK.includes(durumBul(o)));
  if (suzgec === 'tamam')
    gorunenOdevler = gorunenOdevler.filter((o) => !ACIK.includes(durumBul(o)));
  const odevGoster = suzgec !== 'materyal';
  const materyalGoster = suzgec === 'hepsi' || suzgec === 'materyal';
  const gorunenMateryaller = materyaller.filter(eslesir);

  const bolumler = [];
  if (odevGoster) bolumler.push(['odev', 'Ödevler', gorunenOdevler]);
  if (materyalGoster) bolumler.push(['materyal', 'Ders materyalleri', gorunenMateryaller]);
  const bosMu = bolumler.every((b) => b[2].length === 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} data-sinif-calismalari>
      <div style={{ ...kart, borderRadius: 14, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: DO.primary }}>
              Sınıf çalışmaları
            </div>
            <div style={{ fontSize: 12, color: DO.muted }}>
              {odevler.length} ödev · {materyaller.length} ders materyali
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 8,
                background: '#F2F3FF',
                color: DO.muted,
                minWidth: 220,
              }}
            >
              <Ikon ad="ara" boyut={16} />
              <input
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                placeholder="Çalışmalarda filtrele…"
                aria-label="Çalışmalarda filtrele"
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  color: DO.text,
                  flex: 1,
                  minWidth: 0,
                }}
              />
            </label>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 8,
                background: '#F2F3FF',
                fontSize: 12,
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                color: DO.text,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: DO.accent }} />
              {ogrenciSayisi} Öğrenci
            </span>
            {hoca && tumDosyalar.length > 0 && (
              <button
                type="button"
                data-kutuphaneye-arsivle
                onClick={() => setArsiv(true)}
                title="Paylaşım eklerini Kaynak Kütüphanesi'ne kopyala"
                style={ikincilDugme}
              >
                <Ikon ad="klasor" boyut={15} /> Kütüphaneye arşivle
              </button>
            )}
          </div>
        </div>
        <div style={{ padding: '0 16px 14px' }}>
          <nav role="tablist" className="do-sekmeler do-sekmeler-tam" aria-label="Çalışma türü">
            {cipler.map(([id, ad, simge, adet]) => {
              const secili = suzgec === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={secili}
                  data-calisma-suzgec={id}
                  className={secili ? 'do-sekme do-sekme-aktif' : 'do-sekme'}
                  onClick={() => setSuzgec(id)}
                >
                  <Ikon ad={simge} boyut={16} />
                  {ad}
                  <span className="do-sekme-sayi">{adet}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      {arsiv && <ArsivPenceresi oda={oda} dosyalar={tumDosyalar} kapat={() => setArsiv(false)} />}

      <div className="do-calisma-izgara">
        <main style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {bosMu ? (
            <Bos
              baslik={
                q
                  ? 'Aramayla eşleşen çalışma yok.'
                  : suzgec === 'materyal'
                    ? 'Henüz ders materyali yok.'
                    : 'Henüz ödev yok.'
              }
              alt={
                q
                  ? ''
                  : 'Akademisyenin paylaştığı ödevler ve dosyalı paylaşımlar burada listelenir.'
              }
            />
          ) : (
            bolumler
              .filter((b) => b[2].length > 0)
              .map(([id, , liste]) => (
                <section
                  key={id}
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                  data-calisma-bolumu={id}
                >
                  {liste.map((x) =>
                    id === 'odev' ? (
                      <OdevCalismaKarti
                        key={x.id}
                        odev={x}
                        teslim={teslimHaritasi.get(x.id)}
                        durum={durumBul(x)}
                        ozet={odevOzetleri[x.id]}
                        ogrenci={ogrenci}
                        ogrenciSayisi={ogrenciSayisi}
                        yorum={yorumSayisi[x.id] || 0}
                        ac={() => ac(x.id)}
                      />
                    ) : (
                      <MateryalKarti
                        key={x.id}
                        icerik={x}
                        yorum={yorumSayisi[x.id] || 0}
                        ac={() => ac(x.id)}
                      />
                    )
                  )}
                </section>
              ))
          )}
        </main>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <TeslimTakvimiKarti odevler={odevler} sinavlar={sinavlar} ac={ac} />
          <PuanDagilimiKarti odevler={odevler} />
        </aside>
      </div>
    </div>
  );
}

// ── KAYNAK KÜTÜPHANESİ PENCERELERİ ──
// Arşivle: odadaki paylaşım eklerini Kaynak Kütüphanesi'ne kopyalar (ders
// koduyla). Kütüphaneden ekle: bu dersin kütüphanedeki kaynaklarını (önceki
// dönemlerden de) yeni paylaşıma ek olarak kopyalar.
function Pencere({ baslik, alt, kapat, children, ayak, veri }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && kapat();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [kapat]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={baslik}
      {...(veri || {})}
      onClick={(e) => e.target === e.currentTarget && kapat()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15,23,42,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          ...kart,
          borderRadius: 14,
          width: '100%',
          maxWidth: 620,
          maxHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + DO.border }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: DO.primary }}>{baslik}</div>
          {alt && <div style={{ fontSize: 12, color: DO.muted, marginTop: 2 }}>{alt}</div>}
        </div>
        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>{children}</div>
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid ' + DO.border,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {ayak}
        </div>
      </div>
    </div>
  );
}

const secimSatiri = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 10px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
};

function ArsivPenceresi({ oda, dosyalar, kapat }) {
  const [secili, setSecili] = useState(() => new Set(dosyalar.map((d) => d.id)));
  const [kategori, setKategori] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [sonuc, setSonuc] = useState(null);
  const kategoriler = K().KUTUPHANE_KATEGORILERI || {};
  const gonder = async () => {
    setMesgul(true);
    try {
      const r = await api('/oda/' + encodeURIComponent(oda.id) + '/arsivle', {
        body: { dosyaIdleri: [...secili], kategori },
      });
      setSonuc(r);
    } catch (e) {
      alert(e.message);
    } finally {
      setMesgul(false);
    }
  };
  return (
    <Pencere
      baslik="Kaynak Kütüphanesi'ne arşivle"
      alt={
        'Seçilen dosyalar ' +
        oda.dersKod +
        ' ders koduyla kütüphaneye kopyalanır; sonraki dönemin odasında "Kütüphaneden ekle" ile yeniden paylaşılabilir. Öğrenci teslimleri arşivlenmez.'
      }
      kapat={kapat}
      veri={{ 'data-arsiv-penceresi': '' }}
      ayak={
        sonuc ? (
          <>
            <span style={{ fontSize: 13, color: DO.accent, marginRight: 'auto' }} data-arsiv-sonucu>
              {sonuc.eklenen} dosya arşivlendi
              {sonuc.atlanan ? ' · ' + sonuc.atlanan + ' dosya zaten kütüphanedeydi' : ''}.
            </span>
            <button type="button" onClick={kapat} style={birincilDugme}>
              Tamam
            </button>
          </>
        ) : (
          <>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: DO.muted,
                marginRight: 'auto',
              }}
            >
              Kategori:
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                style={{
                  border: '1px solid ' + DO.border,
                  borderRadius: 8,
                  padding: '6px 8px',
                  fontSize: 13,
                }}
              >
                <option value="">Otomatik (sunum / ödev / ders notu)</option>
                {Object.entries(kategoriler).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <Dugme onClick={kapat} disabled={mesgul}>
              Vazgeç
            </Dugme>
            <button
              type="button"
              data-arsivle-gonder
              onClick={gonder}
              disabled={mesgul || !secili.size}
              style={{ ...birincilDugme, opacity: secili.size ? 1 : 0.5 }}
            >
              {mesgul ? 'Arşivleniyor…' : secili.size + ' dosyayı arşivle'}
            </button>
          </>
        )
      }
    >
      {dosyalar.length === 0 ? (
        <div style={{ fontSize: 13, color: DO.muted }}>Bu odada paylaşılmış dosya yok.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {dosyalar.map((d) => (
            <label key={d.id} className="do-satir" style={secimSatiri}>
              <input
                type="checkbox"
                checked={secili.has(d.id)}
                onChange={() =>
                  setSecili((x) => {
                    const y = new Set(x);
                    if (y.has(d.id)) y.delete(d.id);
                    else y.add(d.id);
                    return y;
                  })
                }
                style={{ width: 16, height: 16, accentColor: DO.primary }}
              />
              <Ikon ad={dosyaSimgesi(d.uzanti)} boyut={18} renk={DOSYA_RENGI(d.uzanti)} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, color: DO.text }}>{d.ad}</span>
                <span style={{ display: 'block', fontSize: 11, color: DO.muted }}>{d.kaynak}</span>
              </span>
              {d.boyut ? (
                <span style={{ fontSize: 11, color: DO.soft }}>{boyutMetni(d.boyut)}</span>
              ) : null}
            </label>
          ))}
        </div>
      )}
    </Pencere>
  );
}

function KutuphanePenceresi({ oda, kapat, eklendi }) {
  const [liste, setListe] = useState(null);
  const [hata, setHata] = useState('');
  const [secili, setSecili] = useState(() => new Set());
  const [mesgul, setMesgul] = useState(false);
  const kategoriler = K().KUTUPHANE_KATEGORILERI || {};
  useEffect(() => {
    api('/oda/' + encodeURIComponent(oda.id) + '/kutuphane')
      .then((r) => setListe(r.kaynaklar || []))
      .catch((e) => setHata(e.message));
  }, [oda.id]);
  const ekle = async () => {
    setMesgul(true);
    try {
      const r = await api('/oda/' + encodeURIComponent(oda.id) + '/kutuphaneden', {
        body: { kaynakIdleri: [...secili] },
      });
      if (r.hatalar && r.hatalar.length) alert('Eklenemeyenler:\n' + r.hatalar.join('\n'));
      eklendi(r.ekler || []);
      kapat();
    } catch (e) {
      alert(e.message);
    } finally {
      setMesgul(false);
    }
  };
  return (
    <Pencere
      baslik="Kaynak Kütüphanesi'nden ekle"
      alt={
        oda.dersKod +
        ' ders koduyla kütüphanedeki kaynaklar (önceki dönemler dahil). Seçilenler bu paylaşıma ek olarak kopyalanır.'
      }
      kapat={kapat}
      veri={{ 'data-kutuphane-penceresi': '' }}
      ayak={
        <>
          <Dugme onClick={kapat} disabled={mesgul}>
            Vazgeç
          </Dugme>
          <button
            type="button"
            data-kutuphaneden-ekle
            onClick={ekle}
            disabled={mesgul || !secili.size}
            style={{ ...birincilDugme, opacity: secili.size ? 1 : 0.5 }}
          >
            {mesgul ? 'Ekleniyor…' : secili.size + ' kaynağı ekle'}
          </button>
        </>
      }
    >
      {hata && <Uyari>{hata}</Uyari>}
      {!hata && liste == null && <div style={{ fontSize: 13, color: DO.muted }}>Yükleniyor…</div>}
      {liste && liste.length === 0 && (
        <div style={{ fontSize: 13, color: DO.muted }}>
          Kütüphanede bu derse ait kaynak yok. Önceki dönemin odasında Sınıf çalışmaları →
          "Kütüphaneye arşivle" ile materyalleri buraya aktarabilirsiniz.
        </div>
      )}
      {liste && liste.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {liste.map((r) => (
            <label key={r.id} className="do-satir" style={secimSatiri}>
              <input
                type="checkbox"
                checked={secili.has(r.id)}
                onChange={() =>
                  setSecili((x) => {
                    const y = new Set(x);
                    if (y.has(r.id)) y.delete(r.id);
                    else if (y.size < 20) y.add(r.id);
                    return y;
                  })
                }
                style={{ width: 16, height: 16, accentColor: DO.primary }}
              />
              <Ikon
                ad={dosyaSimgesi(K().dosyaUzantisi ? K().dosyaUzantisi(r.dosyaAdi) : '')}
                boyut={18}
                renk={DOSYA_RENGI(K().dosyaUzantisi ? K().dosyaUzantisi(r.dosyaAdi) : '')}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, color: DO.text }}>{r.baslik || r.dosyaAdi}</span>
                <span style={{ display: 'block', fontSize: 11, color: DO.muted }}>
                  {[
                    kategoriler[r.kategori],
                    r.donem && K().donemEtiketi ? K().donemEtiketi(r.donem) : '',
                    r.dosyaAdi,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              {r.boyut && <span style={{ fontSize: 11, color: DO.soft }}>{r.boyut}</span>}
            </label>
          ))}
        </div>
      )}
    </Pencere>
  );
}

// ── DUYURU YAZICI (akışın başında, satır içi) ──
function DuyuruYazici({ oda, ayarlar, benimAd, girdiRef, oneri, yayinlandi }) {
  const [kutuphane, setKutuphane] = useState(false);
  const [yazi, setYazi] = useState('');
  const [ekler, setEkler] = useState([]);
  const [acik, setAcik] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState('');
  const dosyaRef = useRef(null);
  const sinir = (ayarlar && ayarlar.dosyaMb) || 5;

  useEffect(() => {
    if (!oneri) return;
    setYazi(oneri.metin);
    setAcik(true);
    if (girdiRef.current) {
      girdiRef.current.focus();
      girdiRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [oneri, girdiRef]);

  const temizle = () => {
    setYazi('');
    setEkler([]);
    setAcik(false);
    setHata('');
  };
  const yayinla = async () => {
    setMesgul(true);
    setHata('');
    try {
      await api('/oda/' + encodeURIComponent(oda.id) + '/icerik', {
        body: { tur: 'duyuru', baslik: '', metin: yazi, ekler: ekler.map((e) => e.id) },
      });
      temizle();
      yayinlandi();
    } catch (e) {
      setHata(e.message);
    }
    setMesgul(false);
  };
  const aracDugmesi = (simge, baslik, onClick, veri) => (
    <button
      type="button"
      title={baslik}
      aria-label={baslik}
      onClick={onClick}
      className="do-satir"
      {...(veri || {})}
      style={{
        border: 'none',
        background: 'none',
        color: DO.muted,
        borderRadius: 8,
        padding: 7,
        cursor: 'pointer',
        display: 'inline-flex',
      }}
    >
      <Ikon ad={simge} boyut={19} />
    </button>
  );

  return (
    <section
      style={{ ...kart, borderRadius: 12, padding: 16 }}
      data-icerik-formu="duyuru"
      data-duyuru-yazici
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar ad={benimAd} boyut={40} hoca />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hata && <Uyari>{hata}</Uyari>}
          <textarea
            ref={girdiRef}
            value={yazi}
            onChange={(e) => setYazi(e.target.value)}
            onFocus={() => setAcik(true)}
            placeholder="Sınıfınızla bir duyuru, kod örneği ya da materyal paylaşın…"
            rows={acik ? 4 : 2}
            maxLength={5000}
            data-alan="metin"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: acik ? '#fff' : '#F1F5F9',
              border: '1px solid ' + (acik ? DO.accentBorder : 'transparent'),
              borderRadius: 10,
              padding: 10,
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
            }}
          />
          {ekler.length > 0 && (
            <Ekler
              ekler={ekler}
              silinebilir
              onSil={(d) => setEkler(ekler.filter((x) => x.id !== d.id))}
            />
          )}
          {acik && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <input
                  ref={dosyaRef}
                  type="file"
                  style={{ display: 'none' }}
                  data-dosya-girdi
                  onChange={async (e) => {
                    const f = e.target.files && e.target.files[0];
                    e.target.value = '';
                    if (!f) return;
                    const karar = K().dosyaKarari
                      ? K().dosyaKarari({ ad: f.name, boyut: f.size }, sinir)
                      : { izin: true };
                    if (!karar.izin) return alert(karar.hata);
                    setYukleniyor(true);
                    try {
                      const d = await dosyaYukle(oda.id, 'ek', '', f);
                      setEkler((x) => x.concat([d]));
                    } catch (er) {
                      alert(er.message);
                    }
                    setYukleniyor(false);
                  }}
                />
                {aracDugmesi(
                  'ataç',
                  'Dosya ekle (en fazla ' + sinir + ' MB)',
                  () => dosyaRef.current && dosyaRef.current.click()
                )}
                {aracDugmesi('klasor', "Kaynak Kütüphanesi'nden ekle", () => setKutuphane(true), {
                  'data-kutuphaneden': '',
                })}
                {kutuphane && (
                  <KutuphanePenceresi
                    oda={oda}
                    kapat={() => setKutuphane(false)}
                    eklendi={(l) => setEkler((x) => x.concat(l))}
                  />
                )}
                {aracDugmesi('baglanti', 'Bağlantı ekle', () => {
                  const u = window.prompt('Bağlantı adresi (https://…)');
                  const g = K().guvenliBaglanti ? K().guvenliBaglanti(u) : u;
                  if (u && !g) return alert('Geçerli bir http(s) adresi girin.');
                  if (g) setYazi((y) => (y ? y.replace(/\s*$/, '') + '\n' : '') + g);
                })}
                {aracDugmesi('kod', 'Kod örneği', () =>
                  setYazi((y) => (y ? y.replace(/\s*$/, '') + '\n\n' : '') + 'Örnek kod:\n')
                )}
                {yukleniyor && <span style={{ fontSize: 12, color: DO.muted }}>Yükleniyor…</span>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={temizle}
                  style={{ ...ikincilDugme, background: 'none' }}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  data-kaydet
                  disabled={mesgul || yukleniyor || (!yazi.trim() && !ekler.length)}
                  onClick={yayinla}
                  style={{
                    ...birincilDugme,
                    background: DO.accent,
                    opacity: mesgul || yukleniyor || (!yazi.trim() && !ekler.length) ? 0.55 : 1,
                  }}
                >
                  Yayınla
                </button>
              </div>
            </div>
          )}
          {acik && (
            <div style={{ fontSize: 11, color: DO.soft }}>
              Yayınlandığında dersin öğrencilerine bildirim gider.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── AKIŞ KARTI ──
function AkisKarti({
  icerik,
  renk,
  yorumSayisi,
  sonYorumlar,
  teslim,
  ogrenciNo,
  ogrenci,
  hoca,
  benimAd,
  ac,
  duzenle,
  sil,
  yenile,
}) {
  const odev = icerik.tur === 'odev';
  const durum =
    ogrenci && odev && K().teslimDurumu ? K().teslimDurumu(icerik, teslim, ogrenciNo) : '';
  const [menu, setMenu] = useState(false);
  const [yorum, setYorum] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const zaman = K().akisZamani ? K().akisZamani(icerik.olusturuldu) : tarihSaat(icerik.olusturuldu);

  const yorumGonder = async () => {
    if (!yorum.trim()) return;
    setMesgul(true);
    try {
      await api('/icerik/' + encodeURIComponent(icerik.id) + '/yorum', { body: { metin: yorum } });
      setYorum('');
      yenile();
    } catch (e) {
      alert(e.message);
    }
    setMesgul(false);
  };

  return (
    <article
      style={{
        ...kart,
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
      data-akis-ogesi={icerik.id}
      data-tur={icerik.tur}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <button
          type="button"
          onClick={ac}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flex: 1,
            minWidth: 0,
            border: 'none',
            background: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          {odev ? <OdevSimgesi renk={renk} /> : <Avatar ad={icerik.yazar} boyut={42} hoca />}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {odev ? (
                <span style={{ fontSize: 14, color: DO.text }}>
                  {icerik.yazar}, yeni bir ödev yayınladı: <b>{icerik.baslik}</b>
                </span>
              ) : (
                <>
                  <span style={{ fontSize: 15, fontWeight: 700, color: DO.text }}>
                    {icerik.yazar}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: DO.accent,
                      background: DO.accentLight,
                      padding: '1px 8px',
                      borderRadius: 6,
                    }}
                  >
                    Akademisyen
                  </span>
                </>
              )}
            </div>
            <div style={{ fontSize: 12, color: DO.muted }}>
              {zaman} · {odev ? 'Ödev' : 'Sınıf duyurusu'}
              {icerik.duzenlendi ? ' (düzenlendi)' : ''}
              {odev && icerik.sonTarih ? ' · Son teslim: ' + tarihSaat(icerik.sonTarih) : ''}
            </div>
          </div>
        </button>
        {durum && <DurumRozeti durum={durum} />}
        {hoca && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              aria-label="Seçenekler"
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
              className="do-satir"
              style={{
                border: 'none',
                background: 'none',
                color: DO.muted,
                borderRadius: 8,
                padding: 4,
                cursor: 'pointer',
                display: 'inline-flex',
              }}
            >
              <Ikon ad="nokta" boyut={20} kalinlik={3} />
            </button>
            {menu && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  zIndex: 5,
                  ...kart,
                  borderRadius: 10,
                  padding: 4,
                  minWidth: 140,
                  boxShadow: '0 8px 20px rgba(15,23,42,.12)',
                }}
                onMouseLeave={() => setMenu(false)}
              >
                {[
                  ['kalem', 'Düzenle', duzenle, DO.text],
                  ['cop', 'Sil', sil, DO.red],
                ].map(([s, ad, fn, r]) => (
                  <button
                    key={ad}
                    type="button"
                    className="do-satir"
                    onClick={() => {
                      setMenu(false);
                      fn();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      border: 'none',
                      background: 'none',
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: 13,
                      color: r,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Ikon ad={s} boyut={16} /> {ad}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {(icerik.metin || (!odev && icerik.baslik)) && (
        <div style={{ fontSize: 14, lineHeight: 1.6, color: DO.text }}>
          {!odev && icerik.baslik && (
            <h4 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 600, color: DO.primary }}>
              {icerik.baslik}
            </h4>
          )}
          <div
            style={{
              whiteSpace: 'pre-wrap',
              ...(odev
                ? {
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    color: DO.muted,
                    fontSize: 13,
                  }
                : {}),
            }}
          >
            <ZenginMetin yazi={icerik.metin} />
          </div>
        </div>
      )}

      {icerik.ekler && icerik.ekler.length > 0 && (
        <div className="do-ek-izgara">
          {icerik.ekler.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => dosyaAc(d)}
              className="do-satir"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 8,
                borderRadius: 10,
                border: '1px solid ' + DO.border,
                background: '#F8FAFC',
                cursor: 'pointer',
                textAlign: 'left',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  flex: '0 0 40px',
                  background: '#fff',
                  border: '1px solid ' + DO.border,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ikon ad={dosyaSimgesi(d.uzanti)} boyut={22} renk={DOSYA_RENGI(d.uzanti)} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: DO.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {d.ad}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: DO.muted,
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  }}
                >
                  {(d.uzanti || 'dosya').toUpperCase()}
                  {d.boyut ? ' • ' + boyutMetni(d.boyut) : ''}
                </span>
              </span>
              <span style={{ color: DO.muted }}>
                <Ikon ad="indir" boyut={17} />
              </span>
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          borderTop: '1px solid ' + DO.border,
          paddingTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: DO.muted,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Ikon ad="yorum" boyut={17} />
            {yorumSayisi > 0 ? yorumSayisi + ' Sınıf Yorumu' : 'Sınıf yorumu yok'}
          </span>
          {yorumSayisi > 0 && (
            <button
              type="button"
              onClick={ac}
              style={{
                border: 'none',
                background: 'none',
                color: DO.accent,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {yorumSayisi > sonYorumlar.length ? 'Tüm yorumları göster' : 'Ayrıntıyı aç'}
            </button>
          )}
        </div>
        {sonYorumlar.map((y) => {
          const h = y.rol === 'hoca';
          return (
            <div
              key={y.id}
              data-yorum={y.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: 8,
                borderRadius: 10,
                background: h ? '#EEF2F7' : '#F8FAFC',
                marginLeft: h ? 16 : 0,
              }}
            >
              <Avatar ad={y.yazarAd} boyut={28} hoca={h} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: h ? 700 : 600,
                      color: h ? DO.primary : DO.text,
                    }}
                  >
                    {y.yazarAd}
                  </span>
                  <span style={{ fontSize: 11, color: DO.soft }}>
                    {K().akisZamani ? K().akisZamani(y.olusturuldu) : ''}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: DO.muted, whiteSpace: 'pre-wrap' }}>
                  <ZenginMetin yazi={y.metin} />
                </div>
              </div>
            </div>
          );
        })}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar ad={benimAd} boyut={32} hoca={hoca} />
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              value={yorum}
              onChange={(e) => setYorum(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  yorumGonder();
                }
              }}
              placeholder="Sınıf yorumu ekle…"
              maxLength={2000}
              data-akis-yorum-girdi
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#F1F5F9',
                border: '1px solid transparent',
                borderRadius: 999,
                padding: '8px 40px 8px 14px',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              type="button"
              aria-label="Gönder"
              title="Gönder"
              disabled={mesgul || !yorum.trim()}
              onClick={yorumGonder}
              data-akis-yorum-gonder
              style={{
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'none',
                color: yorum.trim() ? DO.accent : DO.soft,
                cursor: yorum.trim() ? 'pointer' : 'default',
                padding: 4,
                display: 'inline-flex',
              }}
            >
              <Ikon ad="gonder" boyut={17} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function BaslangicKarti({ bos, hoca, oner }) {
  const oneriler = [
    [
      'soru',
      'Soru-Cevap Başlat',
      'Soru-cevap: Bu hafta işlediğimiz konularla ilgili sorularınızı bu duyurunun altına yorum olarak yazabilirsiniz.',
    ],
    ['kod', 'Örnek Kod Paylaşımı', 'Örnek kod:\n'],
    ['takvim', 'Ofis Saati Hatırlatması', 'Ofis saati hatırlatması: '],
  ];
  return (
    <div
      style={{ ...kart, borderRadius: 12, padding: 32, textAlign: 'center' }}
      data-baslangic-karti
    >
      <div
        style={{
          maxWidth: 460,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span
          style={{
            width: 60,
            height: 60,
            borderRadius: 16,
            background: '#EEF2F7',
            color: DO.accent,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ikon ad="akis" boyut={32} />
        </span>
        <div style={{ fontSize: 20, fontWeight: 600 }}>
          {hoca ? 'Akışınızı Canlı Tutun' : 'Akış'}
        </div>
        <div style={{ fontSize: 14, color: DO.muted, lineHeight: 1.55 }}>
          {hoca
            ? (bos ? 'Henüz paylaşım yok.' : 'Henüz başka bir paylaşım yapılmadı.') +
              ' Haftalık ders notlarını, quizleri ya da hatırlatmaları buradan öğrencilerinizle anında paylaşabilirsiniz.'
            : bos
              ? 'Henüz paylaşım yok. Akademisyen duyuru ya da ödev paylaştığında burada görünür ve size bildirim gelir.'
              : 'Yeni paylaşımlar burada görünür ve size bildirim gelir.'}
        </div>
        {hoca && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
            {oneriler.map(([s, ad, m]) => (
              <button
                key={ad}
                type="button"
                onClick={() => oner(m)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: '1px solid ' + DO.border,
                  background: '#F8FAFC',
                  color: DO.text,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: DO.accent, display: 'inline-flex' }}>
                  <Ikon ad={s} boyut={15} />
                </span>
                {ad}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OdevSimgesi({ renk }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 42,
        height: 42,
        flex: '0 0 42px',
        borderRadius: '50%',
        background: renk,
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ikon ad="odev" boyut={20} />
    </span>
  );
}

function OzellestirPenceresi({ oda, kapat, kaydedildi }) {
  const [renk, setRenk] = useState(oda.renk || varsayilanRenk(oda.id));
  const [aciklama, setAciklama] = useState(oda.aciklama || '');
  const [canli, setCanli] = useState(oda.canliDers || '');
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState('');
  const girdi = {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid ' + DO.border,
    borderRadius: 8,
    padding: 9,
    fontSize: 13,
    fontFamily: 'inherit',
  };
  return (
    <div
      style={{
        ...kart,
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
      data-ozellestir
    >
      <div style={{ fontWeight: 600 }}>Odayı özelleştir</div>
      {hata && <Uyari>{hata}</Uyari>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: DO.muted, marginRight: 4 }}>Bant rengi</span>
        {BANT_RENKLERI.map((r) => (
          <button
            key={r}
            type="button"
            aria-label={'Renk ' + r}
            onClick={() => setRenk(r)}
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: bantZemini(r),
              border: renk === r ? '3px solid ' + DO.accent : '2px solid #fff',
              boxShadow: '0 0 0 1px ' + DO.border,
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
      <textarea
        value={aciklama}
        onChange={(e) => setAciklama(e.target.value)}
        maxLength={500}
        placeholder="Oda açıklaması (isteğe bağlı)"
        rows={2}
        style={girdi}
      />
      <input
        value={canli}
        onChange={(e) => setCanli(e.target.value)}
        placeholder="Canlı ders bağlantısı (isteğe bağlı) — https://…"
        data-canli-girdi
        style={girdi}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Dugme onClick={kapat}>Vazgeç</Dugme>
        <Dugme
          tur="ana"
          disabled={mesgul}
          onClick={async () => {
            setMesgul(true);
            setHata('');
            try {
              await api('/oda/' + encodeURIComponent(oda.id) + '/ozellestir', {
                body: { renk, aciklama, canliDers: canli },
              });
              kaydedildi();
            } catch (e) {
              setHata(e.message);
              setMesgul(false);
            }
          }}
        >
          Kaydet
        </Dugme>
      </div>
    </div>
  );
}

// ── DUYURU / ÖDEV FORMU ──
function IcerikFormu({ oda, tur, mevcut, ayarlar, iptal, kaydedildi }) {
  const odev = tur === 'odev';
  const [baslik, setBaslik] = useState((mevcut && mevcut.baslik) || '');
  const [yazi, setYazi] = useState((mevcut && mevcut.metin) || '');
  const [puan, setPuan] = useState(mevcut ? String(mevcut.puan || '') : odev ? '100' : '');
  const [son, setSon] = useState(yerelGirdi(mevcut && mevcut.sonTarih));
  const [gecKabul, setGecKabul] = useState(mevcut ? !!mevcut.gecKabul : true);
  const [ekler, setEkler] = useState((mevcut && mevcut.ekler) || []);
  const [kutuphane, setKutuphane] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState('');

  const girdi = {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid ' + DO.border,
    borderRadius: 8,
    padding: '9px 10px',
    fontSize: 14,
    fontFamily: 'inherit',
  };

  const kaydet = async () => {
    setHata('');
    setMesgul(true);
    const govde = {
      tur,
      baslik,
      metin: yazi,
      ekler: ekler.map((e) => e.id),
    };
    if (odev) {
      govde.puan = puan;
      govde.sonTarih = girdidenIso(son);
      govde.gecKabul = gecKabul;
    }
    try {
      if (mevcut)
        await api('/icerik/' + encodeURIComponent(mevcut.id) + '/guncelle', { body: govde });
      else await api('/oda/' + encodeURIComponent(oda.id) + '/icerik', { body: govde });
      kaydedildi();
    } catch (e) {
      setHata(e.message);
      setMesgul(false);
    }
  };

  return (
    <div
      style={{ ...kart, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
      data-icerik-formu={tur}
    >
      <div style={{ fontWeight: 700, color: DO.primary }}>
        {mevcut
          ? odev
            ? 'Ödevi düzenle'
            : 'Duyuruyu düzenle'
          : odev
            ? 'Yeni ödev'
            : 'Yeni duyuru'}
      </div>
      {hata && <Uyari>{hata}</Uyari>}
      <input
        value={baslik}
        onChange={(e) => setBaslik(e.target.value)}
        placeholder={odev ? 'Başlık (örn ÖDEV-2)' : 'Başlık (isteğe bağlı)'}
        maxLength={200}
        style={girdi}
        data-alan="baslik"
      />
      <textarea
        value={yazi}
        onChange={(e) => setYazi(e.target.value)}
        placeholder={odev ? 'Talimatlar (isteğe bağlı)' : 'Sınıfınızla bir şey paylaşın'}
        rows={4}
        maxLength={5000}
        style={girdi}
        data-alan="metin"
      />
      {odev && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ fontSize: 12, color: DO.muted }}>
            Puan
            <input
              value={puan}
              onChange={(e) => setPuan(e.target.value)}
              inputMode="decimal"
              style={{ ...girdi, width: 100, display: 'block', marginTop: 4 }}
              data-alan="puan"
            />
          </label>
          <label style={{ fontSize: 12, color: DO.muted }}>
            Teslim tarihi
            <input
              type="datetime-local"
              value={son}
              onChange={(e) => setSon(e.target.value)}
              style={{ ...girdi, width: 220, display: 'block', marginTop: 4 }}
              data-alan="sonTarih"
            />
          </label>
          <label
            style={{
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              paddingBottom: 9,
            }}
          >
            <input
              type="checkbox"
              checked={gecKabul}
              onChange={(e) => setGecKabul(e.target.checked)}
            />
            Son tarihten sonra geç teslim kabul edilsin
          </label>
        </div>
      )}
      <Ekler
        ekler={ekler}
        silinebilir
        onSil={(d) => setEkler(ekler.filter((x) => x.id !== d.id))}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <DosyaSec
          ayarlar={ayarlar}
          mesgul={yukleniyor}
          onSec={async (f) => {
            setYukleniyor(true);
            try {
              const d = await dosyaYukle(oda.id, 'ek', '', f);
              setEkler((e) => e.concat([d]));
            } catch (e) {
              alert(e.message);
            }
            setYukleniyor(false);
          }}
        />
        <Dugme onClick={() => setKutuphane(true)} data-kutuphaneden>
          Kütüphaneden ekle
        </Dugme>
        {kutuphane && (
          <KutuphanePenceresi
            oda={oda}
            kapat={() => setKutuphane(false)}
            eklendi={(l) => setEkler((e) => e.concat(l))}
          />
        )}
        <span style={{ flex: 1 }} />
        <Dugme onClick={iptal}>İptal</Dugme>
        <Dugme tur="ana" onClick={kaydet} disabled={mesgul || yukleniyor} data-kaydet>
          {mevcut ? 'Kaydet' : odev ? 'Ödev ata' : 'Yayınla'}
        </Dugme>
      </div>
      {!mevcut && (
        <div style={{ fontSize: 11, color: DO.soft }}>
          Yayınlandığında dersin öğrencilerine bildirim gider.
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PAYLAŞIM AYRINTISI (Talimatlar + Öğrenci çalışması)
// ══════════════════════════════════════════════════════════════
function IcerikEkrani({ icerikId, oda, rol, ayarlar, renk, geri, duzenle }) {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState('');
  const [sekme, setSekme] = useState('talimatlar');
  const yukle = useCallback(() => {
    api('/icerik/' + encodeURIComponent(icerikId))
      .then((r) => {
        setVeri(r);
        setHata('');
      })
      .catch((e) => setHata(e.message));
  }, [icerikId]);
  useEffect(yukle, [yukle]);
  useEffect(() => {
    const h = () => yukle();
    const c = ['oda_icerikleri', 'oda_teslimleri', 'oda_yorumlari'];
    c.forEach((x) => window.addEventListener('realtime:' + x, h));
    return () => c.forEach((x) => window.removeEventListener('realtime:' + x, h));
  }, [yukle]);

  if (hata && !veri) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif" }}>
        <GeriDugmesi onClick={geri} etiket={oda.dersKod} />
        <div style={{ height: 12 }} />
        <Uyari>{hata}</Uyari>
      </div>
    );
  }
  if (!veri) return <Bos baslik="Yükleniyor…" />;
  const { icerik } = veri;
  const odev = icerik.tur === 'odev';
  const hoca = rol === 'hoca';
  const gorevli = rol === 'hoca' || rol === 'yetkili';

  const sil = async () => {
    if (
      !confirm(
        (odev ? 'Ödev' : 'Duyuru') + ' silinsin mi? Teslimler, notlar ve yorumlar da silinir.'
      )
    )
      return;
    try {
      await api('/icerik/' + encodeURIComponent(icerik.id) + '/sil', { body: {} });
      geri();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif", color: DO.text }}
      data-icerik-ekrani={icerik.id}
    >
      <StilBlogu />
      <UstCubuk
        sol={
          <>
            <GeriDugmesi onClick={geri} etiket={oda.dersKod} />
          </>
        }
        sekmeler={
          odev && gorevli
            ? [
                ['talimatlar', 'Talimatlar'],
                ['calisma', 'Öğrenci çalışması'],
              ]
            : null
        }
        aktif={sekme}
        sec={setSekme}
        veriAdi="data-icerik-sekme"
        sag={
          hoca && (
            <>
              <Dugme kucuk onClick={() => duzenle(icerik)}>
                Düzenle
              </Dugme>
              <Dugme kucuk tur="tehlike" onClick={sil}>
                Sil
              </Dugme>
            </>
          )
        }
      />
      <div className="do-kap">
        {sekme === 'calisma' && odev && gorevli ? (
          <OgrenciCalismasi veri={veri} hoca={hoca} renk={renk} yenile={yukle} />
        ) : (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {odev && <OdevSimgesi renk={renk} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: 24, color: renk, fontWeight: 600 }}>
                    {icerik.baslik || (odev ? 'Ödev' : 'Duyuru')}
                  </h2>
                  <div style={{ fontSize: 13, color: DO.muted, marginTop: 4 }}>
                    {icerik.yazar} · {tarihSaat(icerik.olusturuldu)}
                    {icerik.duzenlendi ? ' (düzenlendi: ' + tarihSaat(icerik.duzenlendi) + ')' : ''}
                  </div>
                  {odev && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        marginTop: 10,
                        paddingBottom: 12,
                        borderBottom: '1px solid ' + renk,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>{icerik.puan ? icerik.puan + ' puan' : 'Puansız'}</span>
                      <span>
                        {icerik.sonTarih
                          ? 'Teslim tarihi: ' + tarihSaat(icerik.sonTarih)
                          : 'Teslim tarihi yok'}
                        {icerik.kabulAcik === false ? ' · Gönderim kapalı' : ''}
                      </span>
                    </div>
                  )}
                  {icerik.metin && (
                    <div
                      style={{
                        fontSize: 14,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        marginTop: 14,
                      }}
                    >
                      {icerik.metin}
                    </div>
                  )}
                  {icerik.ekler && icerik.ekler.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <Ekler ekler={icerik.ekler} />
                    </div>
                  )}
                  <Yorumlar
                    icerikId={icerik.id}
                    yorumlar={veri.yorumlar}
                    hoca={hoca}
                    yenile={yukle}
                  />
                </div>
              </div>
            </div>
            {odev && rol === 'ogrenci' && (
              <CalismanizPaneli
                veri={veri}
                oda={oda}
                ayarlar={ayarlar}
                renk={renk}
                yenile={yukle}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Yorumlar({ icerikId, yorumlar, hoca, yenile }) {
  const [yazi, setYazi] = useState('');
  const [mesgul, setMesgul] = useState(false);
  return (
    <div
      style={{ marginTop: 20, borderTop: '1px solid ' + DO.border, paddingTop: 14 }}
      data-yorumlar
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Sınıf yorumları {yorumlar && yorumlar.length ? '(' + yorumlar.length + ')' : ''}
      </div>
      {(yorumlar || []).map((y) => (
        <div key={y.id} style={{ display: 'flex', gap: 10, marginBottom: 10 }} data-yorum={y.id}>
          <span
            aria-hidden="true"
            style={{
              width: 30,
              height: 30,
              flex: '0 0 30px',
              borderRadius: '50%',
              background: y.rol === 'hoca' ? DO.primary : DO.accent,
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {(metin(y.yazarAd)[0] || '?').toLocaleUpperCase('tr')}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13 }}>
              <b>{y.yazarAd}</b>
              {y.rol === 'hoca' && <span style={{ color: DO.muted }}> · Akademisyen</span>}
              <span style={{ color: DO.soft, fontSize: 12 }}> · {tarihSaat(y.olusturuldu)}</span>
              {(y.benim || hoca) && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('Yorum silinsin mi?')) return;
                    try {
                      await api('/yorum/' + encodeURIComponent(y.id) + '/sil', { body: {} });
                      yenile();
                    } catch (e) {
                      alert(e.message);
                    }
                  }}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: DO.red,
                    fontSize: 12,
                    cursor: 'pointer',
                    marginLeft: 6,
                  }}
                >
                  Sil
                </button>
              )}
            </div>
            <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{y.metin}</div>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={yazi}
          onChange={(e) => setYazi(e.target.value)}
          placeholder="Yorum ekle…"
          rows={1}
          maxLength={2000}
          data-yorum-girdi
          style={{
            flex: 1,
            border: '1px solid ' + DO.border,
            borderRadius: 18,
            padding: '8px 14px',
            fontSize: 14,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        <Dugme
          tur="ana"
          disabled={mesgul || !yazi.trim()}
          data-yorum-gonder
          onClick={async () => {
            setMesgul(true);
            try {
              await api('/icerik/' + encodeURIComponent(icerikId) + '/yorum', {
                body: { metin: yazi },
              });
              setYazi('');
              yenile();
            } catch (e) {
              alert(e.message);
            }
            setMesgul(false);
          }}
        >
          Gönder
        </Dugme>
      </div>
    </div>
  );
}

// ── ÖĞRENCİ: ÇALIŞMANIZ ──
function CalismanizPaneli({ veri, oda, ayarlar, renk, yenile }) {
  const { icerik, kabul } = veri;
  const teslim = veri.teslim || { dosyalar: [], teslimEdildi: false };
  const [mesgul, setMesgul] = useState(false);
  const dosyalar = teslim.dosyalar || [];
  const no = metin(veri.ogrenciNo);
  const durum = K().teslimDurumu ? K().teslimDurumu(icerik, veri.teslim, no) : '';
  const ekSure = no && icerik.ekSureler ? icerik.ekSureler[no] : '';
  const izin = kabul && kabul.izin;

  const islem = async (yol, govde) => {
    setMesgul(true);
    try {
      await api('/teslim/' + encodeURIComponent(icerik.id) + yol, { body: govde || {} });
      yenile();
    } catch (e) {
      alert(e.message);
    }
    setMesgul(false);
  };

  return (
    <div
      style={{
        width: 300,
        flex: '0 0 300px',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
      data-calismaniz
    >
      <div style={{ ...kart, padding: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600 }}>Çalışmanız</span>
          {durum && <DurumRozeti durum={durum} />}
        </div>
        {teslim.geriVerildi && metin(teslim.puan) !== '' && (
          <div
            style={{ background: DO.accentLight, borderRadius: 8, padding: 10, marginBottom: 12 }}
            data-notum
          >
            <div style={{ fontSize: 12, color: DO.muted }}>Notunuz</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: renk }}>
              {K().puanMetni(teslim.puan)}
              {icerik.puan ? (
                <span style={{ fontSize: 14, color: DO.muted }}> / {icerik.puan}</span>
              ) : null}
            </div>
            {teslim.geriBildirim && (
              <div style={{ fontSize: 13, marginTop: 6, whiteSpace: 'pre-wrap' }}>
                {teslim.geriBildirim}
              </div>
            )}
          </div>
        )}
        {dosyalar.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <Ekler
              ekler={dosyalar}
              silinebilir={!teslim.teslimEdildi && izin}
              onSil={(d) => islem('/dosya-sil', { dosyaId: d.id })}
            />
          </div>
        )}
        {teslim.teslimEdildi ? (
          <>
            <div style={{ fontSize: 12, color: DO.muted, marginBottom: 10 }}>
              Teslim: {tarihSaat(teslim.teslimZamani)}
              {teslim.gec ? ' (geç)' : ''}
            </div>
            {!teslim.geriVerildi && izin && (
              <Dugme
                onClick={() => islem('/geri-al')}
                disabled={mesgul}
                style={{ width: '100%' }}
                data-geri-al
              >
                Teslimi geri al
              </Dugme>
            )}
          </>
        ) : izin ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <DosyaSec
                ayarlar={ayarlar}
                mesgul={mesgul}
                onSec={async (f) => {
                  setMesgul(true);
                  try {
                    await dosyaYukle(oda.id, 'teslim', icerik.id, f);
                    yenile();
                  } catch (e) {
                    alert(e.message);
                  }
                  setMesgul(false);
                }}
              />
            </div>
            <Dugme
              tur="ana"
              onClick={() => islem('/gonder')}
              disabled={mesgul || !dosyalar.length}
              data-teslim-et
            >
              {kabul.gec ? 'Geç teslim et' : 'Teslim et'}
            </Dugme>
          </div>
        ) : (
          <Uyari>{(kabul && kabul.sebep) || 'Teslim kapalı.'}</Uyari>
        )}
        {ekSure && (
          <div style={{ fontSize: 12, color: DO.amber, marginTop: 10 }}>
            Size tanınan ek süre: {tarihSaat(ekSure)}
          </div>
        )}
        {!teslim.teslimEdildi && kabul && kabul.izin && kabul.gec && (
          <div style={{ fontSize: 12, color: DO.amber, marginTop: 10 }}>
            Son tarih geçti; teslim geç olarak işaretlenir.
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// AKADEMİSYEN: ÖĞRENCİ ÇALIŞMASI
// ══════════════════════════════════════════════════════════════
function OgrenciCalismasi({ veri, hoca, renk, yenile }) {
  const { icerik } = veri;
  const ogrenciler = veri.ogrenciler || [];
  const teslimler = veri.teslimler || [];
  const harita = useMemo(() => new Map(teslimler.map((t) => [metin(t.ogrenciNo), t])), [teslimler]);
  const [arama, setArama] = useState('');
  const [durum, setDurum] = useState('hepsi');
  const [sira, setSira] = useState('soyad');
  const [secili, setSecili] = useState(() => new Set());
  const [odak, setOdak] = useState('');
  const [taslak, setTaslak] = useState({}); // no → girilen not
  const [ayarAcik, setAyarAcik] = useState(false);
  const [mesgul, setMesgul] = useState(false);

  const D = K();
  const durumBul = (no) => D.teslimDurumu(icerik, harita.get(no), no);
  const notBul = (no) => {
    const t = harita.get(no);
    return t ? t.puan : '';
  };
  const liste = D.ogrencileriSuz(ogrenciler, { arama, durum, sira, durumBul, notBul });
  const ozet = D.odevOzeti(icerik, ogrenciler, teslimler);

  const notKaydet = async (no) => {
    if (!(no in taslak)) return;
    const deger = taslak[no];
    const onceki = metin(notBul(no));
    if (metin(deger).replace(',', '.') === onceki.replace(',', '.')) {
      setTaslak((t) => {
        const y = { ...t };
        delete y[no];
        return y;
      });
      return;
    }
    const karar = D.puanKarari(deger, icerik.puan);
    if (!karar.gecerli) return alert(karar.hata);
    try {
      await api('/icerik/' + encodeURIComponent(icerik.id) + '/not', {
        body: {
          ogrenciNo: no,
          puan: deger,
          geriBildirim: (harita.get(no) || {}).geriBildirim || '',
        },
      });
      setTaslak((t) => {
        const y = { ...t };
        delete y[no];
        return y;
      });
      yenile();
    } catch (e) {
      alert(e.message);
    }
  };

  const geriVer = async (nolar) => {
    setMesgul(true);
    try {
      const r = await api('/icerik/' + encodeURIComponent(icerik.id) + '/geri-ver', {
        body: { ogrenciNolar: nolar },
      });
      setSecili(new Set());
      alert(r.sayi + ' öğrenciye not geri verildi; bildirim gönderildi.');
      yenile();
    } catch (e) {
      alert(e.message);
    }
    setMesgul(false);
  };

  const ayar = async (govde) => {
    setMesgul(true);
    try {
      await api('/icerik/' + encodeURIComponent(icerik.id) + '/ayar', { body: govde });
      yenile();
    } catch (e) {
      alert(e.message);
    }
    setMesgul(false);
  };

  const tumuSecili = liste.length > 0 && liste.every((s) => secili.has(s.no));
  const geriVerilebilir = [...secili].filter((no) => {
    const t = harita.get(no);
    return t && metin(t.puan) !== '' && !t.geriVerildi;
  });
  const odakOgr = odak ? ogrenciler.find((s) => s.no === odak) : null;

  const secimDegistir = (no) =>
    setSecili((s) => {
      const y = new Set(s);
      if (y.has(no)) y.delete(no);
      else y.add(no);
      return y;
    });

  return (
    <div data-ogrenci-calismasi>
      <div
        style={{
          ...kart,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        {hoca && (
          <Dugme
            tur="ana"
            disabled={mesgul || !geriVerilebilir.length}
            onClick={() => geriVer(geriVerilebilir)}
            data-geri-ver
          >
            Geri Ver{geriVerilebilir.length ? ' (' + geriVerilebilir.length + ')' : ''}
          </Dugme>
        )}
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {icerik.puan ? icerik.puan + ' puan' : 'Puansız'}
        </span>
        <span style={{ flex: 1 }} />
        {hoca && (
          <Dugme
            onClick={() => setAyarAcik((a) => !a)}
            aria-expanded={ayarAcik}
            data-gonderim-ayari
          >
            ⚙ Gönderim ayarları
          </Dugme>
        )}
      </div>

      {ayarAcik && hoca && <GonderimAyarlari icerik={icerik} mesgul={mesgul} ayar={ayar} />}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ width: 340, flex: '0 0 340px', maxWidth: '100%', ...kart }}>
          <div
            style={{
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              borderBottom: '1px solid ' + DO.border,
            }}
          >
            <input
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Ad, soyad ya da numara ara"
              data-ogrenci-ara
              style={{
                border: '1px solid ' + DO.border,
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 13,
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                value={durum}
                onChange={(e) => setDurum(e.target.value)}
                data-durum-suz
                style={{
                  flex: 1,
                  border: '1px solid ' + DO.border,
                  borderRadius: 8,
                  padding: 6,
                  fontSize: 12,
                }}
              >
                <option value="hepsi">Tümü</option>
                <option value="teslim">Teslim edenler</option>
                <option value="teslimsiz">Teslim etmeyenler</option>
                <option value="gec">Geç teslim</option>
                <option value="notlu">Not verilmiş</option>
                <option value="notsuz">Not verilmemiş</option>
              </select>
              <select
                value={sira}
                onChange={(e) => setSira(e.target.value)}
                data-sira
                style={{
                  flex: 1,
                  border: '1px solid ' + DO.border,
                  borderRadius: 8,
                  padding: 6,
                  fontSize: 12,
                }}
              >
                <option value="soyad">Soyadına göre</option>
                <option value="ad">Adına göre</option>
                <option value="no">Numaraya göre</option>
              </select>
            </div>
          </div>
          {hoca && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                fontSize: 13,
                borderBottom: '1px solid ' + DO.border,
              }}
            >
              <input
                type="checkbox"
                checked={tumuSecili}
                onChange={() => setSecili(tumuSecili ? new Set() : new Set(liste.map((s) => s.no)))}
              />
              Tüm öğrenciler ({liste.length})
            </label>
          )}
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {liste.map((s) => {
              const t = harita.get(s.no);
              const d = durumBul(s.no);
              const deger = s.no in taslak ? taslak[s.no] : D.puanMetni(t ? t.puan : '');
              return (
                <div
                  key={s.no}
                  data-ogrenci-satiri={s.no}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderBottom: '1px solid ' + DO.border,
                    background: odak === s.no ? DO.accentLight : '#fff',
                  }}
                >
                  {hoca && (
                    <input
                      type="checkbox"
                      checked={secili.has(s.no)}
                      onChange={() => secimDegistir(s.no)}
                      aria-label={tamAd(s) + ' seç'}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setOdak(odak === s.no ? '' : s.no)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: 'none',
                      background: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tamAd(s)}
                    </div>
                    <div style={{ fontSize: 11, color: (D.DURUMLAR[d] || {}).renk || DO.muted }}>
                      {s.no} · {(D.DURUMLAR[d] || {}).etiket}
                      {t && metin(t.puan) !== '' && !t.geriVerildi ? ' · Taslak not' : ''}
                    </div>
                  </button>
                  {hoca ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 13 }}>
                      <input
                        value={deger}
                        onChange={(e) => setTaslak((x) => ({ ...x, [s.no]: e.target.value }))}
                        onBlur={() => notKaydet(s.no)}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        placeholder="__"
                        inputMode="decimal"
                        aria-label={tamAd(s) + ' notu'}
                        data-not-girdi={s.no}
                        style={{
                          width: 48,
                          textAlign: 'right',
                          border: 'none',
                          borderBottom: '1px solid ' + DO.soft,
                          fontSize: 13,
                          padding: '2px 4px',
                        }}
                      />
                      {icerik.puan ? <span style={{ color: DO.muted }}>/{icerik.puan}</span> : null}
                    </span>
                  ) : (
                    <span style={{ fontSize: 13, color: DO.muted }}>
                      {D.puanMetni(t ? t.puan : '') || '—'}
                      {icerik.puan ? '/' + icerik.puan : ''}
                    </span>
                  )}
                </div>
              );
            })}
            {liste.length === 0 && (
              <div style={{ padding: 16, fontSize: 13, color: DO.muted }}>
                Süzgece uyan öğrenci yok.
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', gap: 24, marginBottom: 14, flexWrap: 'wrap' }} data-ozet>
            {[
              [ozet.teslim, 'Teslim edenler'],
              [ozet.atanan, 'Teslim etmeyenler'],
              [ozet.notlu, 'Not verilenler'],
            ].map(([n, ad]) => (
              <div key={ad} style={{ paddingRight: 24, borderRight: '1px solid ' + DO.border }}>
                <div style={{ fontSize: 30, fontWeight: 400, color: DO.text }}>{n}</div>
                <div style={{ fontSize: 12, color: DO.muted }}>{ad}</div>
              </div>
            ))}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                marginLeft: 'auto',
              }}
            >
              <Anahtar
                acik={icerik.kabulAcik !== false}
                devreDisi={!hoca || mesgul}
                degistir={(v) => ayar({ kabulAcik: v })}
              />
              {icerik.kabulAcik !== false ? 'Gönderim kabul ediliyor' : 'Gönderim kapalı'}
            </label>
          </div>

          {odakOgr ? (
            <OgrenciAyrintisi
              key={odakOgr.no}
              ogr={odakOgr}
              icerik={icerik}
              teslim={harita.get(odakOgr.no)}
              hoca={hoca}
              renk={renk}
              mesgul={mesgul}
              ayar={ayar}
              geriVer={geriVer}
              yenile={yenile}
              kapat={() => setOdak('')}
            />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                gap: 12,
              }}
            >
              {liste.map((s) => {
                const t = harita.get(s.no);
                const d = durumBul(s.no);
                const ilk = t && t.dosyalar && t.dosyalar[0];
                return (
                  <button
                    key={s.no}
                    type="button"
                    data-ogrenci-karti={s.no}
                    onClick={() => setOdak(s.no)}
                    style={{
                      ...kart,
                      padding: 12,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      minHeight: 130,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%',
                      }}
                    >
                      {tamAd(s)}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        border: '1px dashed ' + DO.border,
                        borderRadius: 6,
                        padding: 8,
                        fontSize: 11,
                        color: DO.muted,
                        overflow: 'hidden',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      {ilk ? (
                        <>
                          <b style={{ color: DO.primary }}>{(ilk.uzanti || '').toUpperCase()}</b>{' '}
                          {ilk.ad}
                          {t.dosyalar.length > 1 ? ' +' + (t.dosyalar.length - 1) : ''}
                        </>
                      ) : (
                        'Dosya yok'
                      )}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        gap: 4,
                      }}
                    >
                      <DurumRozeti durum={d} />
                      {t && metin(t.puan) !== '' && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: DO.accent }}>
                          {D.puanMetni(t.puan)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Anahtar({ acik, devreDisi, degistir }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={acik}
      disabled={devreDisi}
      onClick={() => degistir(!acik)}
      data-kabul-anahtari
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        border: 'none',
        background: acik ? DO.accent : DO.soft,
        position: 'relative',
        cursor: devreDisi ? 'default' : 'pointer',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: acik ? 21 : 3,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left .15s',
        }}
      />
    </button>
  );
}

function GonderimAyarlari({ icerik, mesgul, ayar }) {
  const [son, setSon] = useState(yerelGirdi(icerik.sonTarih));
  const [gec, setGec] = useState(!!icerik.gecKabul);
  return (
    <div
      style={{
        ...kart,
        padding: 14,
        marginBottom: 12,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-end',
        flexWrap: 'wrap',
      }}
      data-ayar-paneli
    >
      <label style={{ fontSize: 12, color: DO.muted }}>
        Teslim tarihi
        <input
          type="datetime-local"
          value={son}
          onChange={(e) => setSon(e.target.value)}
          data-ayar-son
          style={{
            display: 'block',
            marginTop: 4,
            border: '1px solid ' + DO.border,
            borderRadius: 8,
            padding: '7px 10px',
            fontSize: 13,
          }}
        />
      </label>
      <label
        style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8 }}
      >
        <input type="checkbox" checked={gec} onChange={(e) => setGec(e.target.checked)} />
        Geç teslim kabul edilsin
      </label>
      <Dugme
        tur="ana"
        disabled={mesgul}
        onClick={() => ayar({ sonTarih: girdidenIso(son), gecKabul: gec })}
        data-ayar-kaydet
      >
        Kaydet
      </Dugme>
      <div style={{ fontSize: 11, color: DO.soft, flexBasis: '100%' }}>
        Son tarihi ileri almak ya da kapalı gönderimi açmak, teslim etmemiş öğrencilere "teslim
        yeniden açıldı" bildirimi gönderir.
      </div>
    </div>
  );
}

function OgrenciAyrintisi({
  ogr,
  icerik,
  teslim,
  hoca,
  renk,
  mesgul,
  ayar,
  geriVer,
  yenile,
  kapat,
}) {
  const D = K();
  const t = teslim || {};
  const [puan, setPuan] = useState(D.puanMetni(t.puan));
  const [geri, setGeri] = useState(t.geriBildirim || '');
  const [ek, setEk] = useState(yerelGirdi(icerik.ekSureler && icerik.ekSureler[ogr.no]));
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const d = D.teslimDurumu(icerik, teslim, ogr.no);

  const kaydet = async (sonra) => {
    const karar = D.puanKarari(puan, icerik.puan);
    if (!karar.gecerli) return alert(karar.hata);
    setKaydediliyor(true);
    try {
      await api('/icerik/' + encodeURIComponent(icerik.id) + '/not', {
        body: { ogrenciNo: ogr.no, puan, geriBildirim: geri },
      });
      if (sonra) await sonra();
      else yenile();
    } catch (e) {
      alert(e.message);
    }
    setKaydediliyor(false);
  };

  return (
    <div style={{ ...kart, padding: 16 }} data-ogrenci-ayrintisi={ogr.no}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{tamAd(ogr)}</div>
          <div style={{ fontSize: 12, color: DO.muted }}>{ogr.no}</div>
        </div>
        <DurumRozeti durum={d} />
        <Dugme kucuk onClick={kapat}>
          Tüm öğrenciler
        </Dugme>
      </div>
      <div style={{ fontSize: 13, color: DO.muted, marginBottom: 8 }}>
        {t.teslimEdildi
          ? 'Teslim: ' + tarihSaat(t.teslimZamani) + (t.gec ? ' (geç)' : '')
          : 'Teslim edilmedi.'}
      </div>
      {t.dosyalar && t.dosyalar.length ? <Ekler ekler={t.dosyalar} /> : null}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginTop: 14,
          alignItems: 'flex-end',
        }}
      >
        <label style={{ fontSize: 12, color: DO.muted }}>
          Not {icerik.puan ? '(en fazla ' + icerik.puan + ')' : ''}
          <input
            value={puan}
            onChange={(e) => setPuan(e.target.value)}
            disabled={!hoca}
            inputMode="decimal"
            data-ayrinti-not
            style={{
              display: 'block',
              marginTop: 4,
              width: 90,
              border: '1px solid ' + DO.border,
              borderRadius: 8,
              padding: '7px 10px',
              fontSize: 14,
            }}
          />
        </label>
        <label style={{ fontSize: 12, color: DO.muted, flex: 1, minWidth: 200 }}>
          Geri bildirim (öğrenci notla birlikte görür)
          <textarea
            value={geri}
            onChange={(e) => setGeri(e.target.value)}
            disabled={!hoca}
            rows={2}
            maxLength={2000}
            style={{
              display: 'block',
              marginTop: 4,
              width: '100%',
              boxSizing: 'border-box',
              border: '1px solid ' + DO.border,
              borderRadius: 8,
              padding: '7px 10px',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          />
        </label>
      </div>
      {hoca && (
        <div
          style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}
        >
          <Dugme onClick={() => kaydet()} disabled={kaydediliyor || mesgul} data-not-kaydet>
            Notu kaydet (taslak)
          </Dugme>
          <Dugme
            tur="ana"
            onClick={() => kaydet(() => geriVer([ogr.no]))}
            disabled={kaydediliyor || mesgul || metin(puan) === ''}
            data-not-geri-ver
          >
            Kaydet ve geri ver
          </Dugme>
          {t.geriVerildi && (
            <span style={{ fontSize: 12, color: DO.green }}>
              Not öğrenciye geri verildi ({tarihSaat(t.geriVerilmeZamani)})
            </span>
          )}
        </div>
      )}
      {hoca && (
        <div style={{ borderTop: '1px solid ' + DO.border, marginTop: 16, paddingTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Bu öğrenci için teslimi yeniden aç (ek süre)
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="datetime-local"
              value={ek}
              onChange={(e) => setEk(e.target.value)}
              data-ek-sure
              style={{
                border: '1px solid ' + DO.border,
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 13,
              }}
            />
            <Dugme
              disabled={mesgul || !ek}
              onClick={() => ayar({ ekSure: { ogrenciNo: ogr.no, sonTarih: girdidenIso(ek) } })}
              data-ek-sure-ver
            >
              Ek süre ver
            </Dugme>
            {icerik.ekSureler && icerik.ekSureler[ogr.no] && (
              <Dugme
                tur="tehlike"
                disabled={mesgul}
                onClick={() => {
                  setEk('');
                  ayar({ ekSure: { ogrenciNo: ogr.no, sonTarih: '' } });
                }}
              >
                Ek süreyi kaldır
              </Dugme>
            )}
          </div>
          <div style={{ fontSize: 11, color: DO.soft, marginTop: 6 }}>
            Gönderim kapalı ya da son tarih geçmiş olsa da öğrenci bu tarihe kadar teslim edebilir;
            öğrenciye bildirim gider.
            {t.teslimEdildi ? ' Öğrenci teslimini geri alıp yeniden yükleyebilir.' : ''}
          </div>
        </div>
      )}
      <div style={{ height: 1, background: renk, opacity: 0.2, marginTop: 14 }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// KİŞİLER
// ══════════════════════════════════════════════════════════════
// Kişiler: akademisyen kartları + öğrenci tablosu. Öğrenci listesini (ad,
// numara, e-posta) yalnız akademisyen ve yetkili görür; öğrenci sayıyı görür.
const AVATAR_TONLARI = [
  ['#E0E7FF', '#3730A3'],
  ['#CCFBF1', '#0F766E'],
  ['#FFEDD5', '#9A3412'],
  ['#E0F2FE', '#075985'],
  ['#DCFCE7', '#166534'],
  ['#EDE9FE', '#5B21B6'],
];
const avatarTonu = (anahtar) => {
  let h = 0;
  const s = metin(anahtar);
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return AVATAR_TONLARI[Math.abs(h) % AVATAR_TONLARI.length];
};
const ogrenciBasHarf = (s) => {
  const a = metin(s.ad);
  const b = metin(s.soyad);
  const h = (a ? a[0] : '') + (b ? b[0] : '');
  return (h || metin(s.no).slice(0, 2) || '?').toLocaleUpperCase('tr-TR');
};
const monoYazi = "'JetBrains Mono', ui-monospace, monospace";

function SimgeDugmesi({ simge, baslik, onClick, href, devreDisi }) {
  const stil = {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: devreDisi ? '#CBD5E1' : DO.muted,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: devreDisi ? 'not-allowed' : 'pointer',
    textDecoration: 'none',
  };
  if (href && !devreDisi) {
    return (
      <a href={href} title={baslik} aria-label={baslik} className="do-satir" style={stil}>
        <Ikon ad={simge} boyut={18} />
      </a>
    );
  }
  return (
    <button
      type="button"
      title={baslik}
      aria-label={baslik}
      disabled={devreDisi}
      onClick={onClick}
      className={devreDisi ? '' : 'do-satir'}
      style={stil}
    >
      <Ikon ad={simge} boyut={18} />
    </button>
  );
}

function AkademisyenKarti({ ad, bilgi }) {
  const b = bilgi || {};
  return (
    <article
      data-akademisyen-karti={ad}
      style={{
        ...kart,
        borderRadius: 14,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{ padding: '20px 20px 14px', display: 'flex', gap: 14, alignItems: 'flex-start' }}
      >
        <span style={{ position: 'relative', flex: '0 0 56px' }}>
          {b.photoURL ? (
            <img
              src={b.photoURL}
              alt=""
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid ' + DO.border,
                display: 'block',
              }}
            />
          ) : (
            <span
              aria-hidden="true"
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: DO.accentLight,
                color: DO.accent,
                border: '1px solid ' + DO.accentBorder,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 19,
                fontWeight: 700,
              }}
            >
              {basHarfler(ad)}
            </span>
          )}
        </span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontSize: 17,
              fontWeight: 600,
              color: DO.primary,
              lineHeight: 1.3,
            }}
          >
            {ad}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 999,
                background: DO.primary,
                color: '#fff',
              }}
            >
              <Ikon ad="kep" boyut={13} /> Ders Sorumlusu
            </span>
            {b.email && (
              <a
                href={'mailto:' + b.email}
                style={{
                  fontFamily: monoYazi,
                  fontSize: 12,
                  color: DO.text,
                  textDecoration: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {b.email}
              </a>
            )}
          </div>
        </div>
        <SimgeDugmesi
          simge="zarf"
          baslik={b.email ? 'E-posta gönder' : 'E-posta adresi girilmemiş'}
          href={b.email ? 'mailto:' + b.email : ''}
          devreDisi={!b.email}
        />
      </div>
      <div
        style={{
          padding: '0 20px 14px',
          fontSize: 12.5,
          color: DO.muted,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {b.dahili ? (
          <>
            <Ikon ad="telefon" boyut={15} /> Dahili: {b.dahili}
          </>
        ) : !b.email ? (
          'Akademisyen henüz iletişim bilgisi girmemiş.'
        ) : (
          'Dersin akademisyeni'
        )}
      </div>
      {b.email && (
        <div
          style={{
            padding: '10px 20px',
            background: '#F8FAFC',
            borderTop: '1px solid ' + DO.border,
          }}
        >
          <a
            href={'mailto:' + b.email}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: DO.primary,
              textDecoration: 'none',
              padding: '4px 10px',
              borderRadius: 6,
              background: '#fff',
              border: '1px solid ' + DO.border,
            }}
          >
            <Ikon ad="zarf" boyut={14} /> İletişime geç
          </a>
        </div>
      )}
    </article>
  );
}

const SAYFA_BOYUTLARI = [20, 50, 100];

function KisilerSekmesi({ oda, rol, ogrenciSayisi, hocaBilgileri, notlaraGit }) {
  const [veri, setVeri] = useState(null);
  const [arama, setArama] = useState('');
  const [sira, setSira] = useState('soyad');
  const [secili, setSecili] = useState(() => new Set());
  const [sayfa, setSayfa] = useState(1);
  const [boyut, setBoyut] = useState(20);
  const ogrenciGorunumu = rol === 'ogrenci';
  useEffect(() => {
    if (ogrenciGorunumu) return;
    api('/oda/' + encodeURIComponent(oda.id) + '/notlar')
      .then((r) => setVeri(r))
      .catch(() => setVeri({ ogrenciler: [], odevler: [], teslimler: [] }));
  }, [oda.id, ogrenciGorunumu]);
  useEffect(() => setSayfa(1), [arama, sira, boyut]);

  const ogrenciler = veri ? veri.ogrenciler || [] : null;
  const liste = ogrenciler ? K().ogrencileriSuz(ogrenciler, { arama, sira }) : [];
  const odevSayisi = veri ? (veri.odevler || []).length : 0;
  const teslimSayisi = useMemo(() => {
    const m = new Map();
    ((veri && veri.teslimler) || []).forEach((t) => {
      if (t.teslimEdildi) m.set(t.ogrenciNo, (m.get(t.ogrenciNo) || 0) + 1);
    });
    return m;
  }, [veri]);
  const sayfaSayisi = Math.max(1, Math.ceil(liste.length / boyut));
  const gecerliSayfa = Math.min(sayfa, sayfaSayisi);
  const gorunen = liste.slice((gecerliSayfa - 1) * boyut, gecerliSayfa * boyut);
  const hepsiSecili = gorunen.length > 0 && gorunen.every((s) => secili.has(s.no));
  const seciliEpostalar = (ogrenciler || [])
    .filter((s) => secili.has(s.no) && s.email)
    .map((s) => s.email);
  const degistir = (no) =>
    setSecili((x) => {
      const y = new Set(x);
      if (y.has(no)) y.delete(no);
      else y.add(no);
      return y;
    });
  const sayfayiSec = () =>
    setSecili((x) => {
      const y = new Set(x);
      gorunen.forEach((s) => (hepsiSecili ? y.delete(s.no) : y.add(s.no)));
      return y;
    });

  const hocalar = oda.hocalar || [];
  const kutu = { width: 16, height: 16, accentColor: DO.primary, cursor: 'pointer' };
  const baslikHucresi = {
    padding: '12px 16px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: DO.muted,
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };
  const hucre = {
    padding: '10px 16px',
    borderTop: '1px solid ' + DO.border,
    verticalAlign: 'middle',
  };
  const sayfaDugmesi = (etiket, hedef, aktif, devreDisi, key) => (
    <button
      key={key}
      type="button"
      disabled={devreDisi}
      onClick={() => setSayfa(hedef)}
      aria-current={aktif ? 'page' : undefined}
      style={{
        minWidth: 30,
        height: 30,
        borderRadius: 8,
        border: 'none',
        background: aktif ? DO.primary : 'transparent',
        color: aktif ? '#fff' : devreDisi ? '#CBD5E1' : DO.text,
        fontSize: 12,
        fontWeight: 600,
        cursor: devreDisi ? 'default' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {etiket}
    </button>
  );
  const sayfaNolari = [];
  for (let i = 1; i <= sayfaSayisi; i++) {
    if (i === 1 || i === sayfaSayisi || Math.abs(i - gecerliSayfa) <= 1) sayfaNolari.push(i);
    else if (sayfaNolari[sayfaNolari.length - 1] !== '…') sayfaNolari.push('…');
  }

  return (
    <div data-kisiler style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <section>
        {hocalar.length === 0 ? (
          <Bos baslik="Bu derse akademisyen atanmamış." />
        ) : (
          <div className="do-kisi-izgara">
            {hocalar.map((h) => (
              <AkademisyenKarti key={h} ad={h} bilgi={hocaBilgisiBul(hocaBilgileri, h)} />
            ))}
          </div>
        )}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#E2E7FF',
              color: DO.primary,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ikon ad="kep" boyut={20} />
          </span>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: -0.3,
              color: DO.primary,
            }}
          >
            Öğrenciler
          </h2>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              padding: '3px 10px',
              borderRadius: 999,
              background: '#E2E7FF',
              color: DO.primary,
            }}
          >
            {ogrenciSayisi} öğrenci
          </span>
        </div>

        {ogrenciGorunumu ? (
          <div style={{ ...kart, borderRadius: 12, padding: 18, fontSize: 13, color: DO.muted }}>
            Bu dönem dersi seçen {ogrenciSayisi} öğrenci odadadır. Öğrenci listesini dersin
            akademisyeni görür.
          </div>
        ) : (
          <>
            <div
              style={{
                ...kart,
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: '#F2F3FF',
                  color: DO.muted,
                  flex: '1 1 260px',
                  maxWidth: 460,
                }}
              >
                <Ikon ad="ara" boyut={16} />
                <input
                  value={arama}
                  onChange={(e) => setArama(e.target.value)}
                  placeholder="Ad, soyad ya da numara ara…"
                  aria-label="Öğrenci ara"
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 13,
                    color: DO.text,
                    flex: 1,
                    minWidth: 0,
                  }}
                />
                {arama && (
                  <button
                    type="button"
                    aria-label="Aramayı temizle"
                    onClick={() => setArama('')}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: DO.muted,
                      cursor: 'pointer',
                      fontSize: 16,
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {secili.size > 0 && (
                  <>
                    <span style={{ fontSize: 12, color: DO.muted }}>{secili.size} seçildi</span>
                    <a
                      href={
                        seciliEpostalar.length
                          ? 'mailto:?bcc=' + seciliEpostalar.map(encodeURIComponent).join(',')
                          : undefined
                      }
                      aria-disabled={!seciliEpostalar.length}
                      title={
                        seciliEpostalar.length
                          ? seciliEpostalar.length + ' adrese e-posta'
                          : 'Seçilenlerin kayıtlı e-postası yok'
                      }
                      style={{
                        ...ikincilDugme,
                        textDecoration: 'none',
                        opacity: seciliEpostalar.length ? 1 : 0.5,
                        pointerEvents: seciliEpostalar.length ? 'auto' : 'none',
                      }}
                    >
                      <Ikon ad="zarf" boyut={15} /> Seçilenlere e-posta
                    </a>
                    <button
                      type="button"
                      onClick={() => setSecili(new Set())}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: DO.muted,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      Seçimi kaldır
                    </button>
                  </>
                )}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: DO.muted,
                  }}
                >
                  Sıralama:
                  <select
                    value={sira}
                    onChange={(e) => setSira(e.target.value)}
                    style={{
                      border: '1px solid ' + DO.border,
                      borderRadius: 8,
                      padding: '7px 10px',
                      fontSize: 13,
                      color: DO.text,
                      background: '#F2F3FF',
                    }}
                  >
                    <option value="soyad">Soyadına göre</option>
                    <option value="ad">Adına göre</option>
                    <option value="no">Numaraya göre</option>
                  </select>
                </label>
              </div>
            </div>

            <div style={{ ...kart, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table
                  data-ogrenci-tablosu
                  style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 640 }}
                >
                  <thead style={{ background: '#F8FAFC' }}>
                    <tr>
                      <th style={{ ...baslikHucresi, width: 1 }}>
                        <input
                          type="checkbox"
                          aria-label="Bu sayfadakileri seç"
                          checked={hepsiSecili}
                          onChange={sayfayiSec}
                          style={kutu}
                        />
                      </th>
                      <th style={baslikHucresi}>Öğrenci adı soyadı</th>
                      <th style={baslikHucresi}>Öğrenci no</th>
                      <th style={baslikHucresi}>Kayıt durumu</th>
                      <th style={{ ...baslikHucresi, textAlign: 'right' }}>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ogrenciler == null && (
                      <tr>
                        <td colSpan={5} style={{ ...hucre, color: DO.muted, fontSize: 13 }}>
                          Yükleniyor…
                        </td>
                      </tr>
                    )}
                    {ogrenciler != null && liste.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ ...hucre, color: DO.muted, fontSize: 13 }}>
                          {arama ? 'Aramayla eşleşen öğrenci yok.' : 'Odada öğrenci yok.'}
                        </td>
                      </tr>
                    )}
                    {gorunen.map((s) => {
                      const [zemin, renk] = avatarTonu(s.no);
                      const teslim = teslimSayisi.get(s.no) || 0;
                      return (
                        <tr
                          key={s.no}
                          data-ogrenci-satiri={s.no}
                          style={{ background: secili.has(s.no) ? '#F2F3FF' : 'transparent' }}
                        >
                          <td style={hucre}>
                            <input
                              type="checkbox"
                              aria-label={tamAd(s) + ' seç'}
                              checked={secili.has(s.no)}
                              onChange={() => degistir(s.no)}
                              style={kutu}
                            />
                          </td>
                          <td style={hucre}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span
                                aria-hidden="true"
                                style={{
                                  width: 34,
                                  height: 34,
                                  flex: '0 0 34px',
                                  borderRadius: '50%',
                                  background: zemin,
                                  color: renk,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {ogrenciBasHarf(s)}
                              </span>
                              <span style={{ fontWeight: 600, color: DO.text }}>{tamAd(s)}</span>
                            </div>
                          </td>
                          <td style={hucre}>
                            <span
                              style={{
                                fontFamily: monoYazi,
                                fontSize: 12,
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: '#EEF2F7',
                                color: DO.primary,
                              }}
                            >
                              {s.no}
                            </span>
                          </td>
                          <td style={hucre}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                flexWrap: 'wrap',
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: '#CCFBF1',
                                  color: DO.accent,
                                }}
                              >
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: DO.accent,
                                  }}
                                />
                                Kayıtlı
                              </span>
                              {odevSayisi > 0 && (
                                <span style={{ fontSize: 12, color: DO.muted }}>
                                  {teslim}/{odevSayisi} ödev teslim
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ ...hucre, textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <SimgeDugmesi
                              simge="zarf"
                              baslik={s.email ? 'E-posta: ' + s.email : 'Kayıtlı e-posta yok'}
                              href={s.email ? 'mailto:' + s.email : ''}
                              devreDisi={!s.email}
                            />
                            {notlaraGit && (
                              <SimgeDugmesi
                                simge="grafik"
                                baslik="Notlara git"
                                onClick={notlaraGit}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {liste.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                    padding: '10px 16px',
                    borderTop: '1px solid ' + DO.border,
                    background: '#F8FAFC',
                    fontSize: 12,
                    color: DO.muted,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Sayfada göster:
                      <select
                        value={boyut}
                        onChange={(e) => setBoyut(Number(e.target.value))}
                        style={{
                          border: '1px solid ' + DO.border,
                          borderRadius: 6,
                          padding: '3px 6px',
                          fontSize: 12,
                        }}
                      >
                        {SAYFA_BOYUTLARI.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span>
                      · {(gecerliSayfa - 1) * boyut + 1}-
                      {Math.min(gecerliSayfa * boyut, liste.length)} / {liste.length} öğrenci
                    </span>
                  </div>
                  {sayfaSayisi > 1 && (
                    <nav
                      aria-label="Sayfalar"
                      style={{ display: 'flex', alignItems: 'center', gap: 2 }}
                    >
                      {sayfaDugmesi('‹', gecerliSayfa - 1, false, gecerliSayfa === 1, 'onceki')}
                      {sayfaNolari.map((n, i) =>
                        n === '…' ? (
                          <span key={'b' + i} style={{ padding: '0 4px' }}>
                            …
                          </span>
                        ) : (
                          sayfaDugmesi(n, n, n === gecerliSayfa, false, 's' + n)
                        )
                      )}
                      {sayfaDugmesi(
                        '›',
                        gecerliSayfa + 1,
                        false,
                        gecerliSayfa === sayfaSayisi,
                        'sonraki'
                      )}
                    </nav>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// NOTLAR + EXCEL / PDF
// ══════════════════════════════════════════════════════════════
// Not defteri. Sütunlar: ödevler + akademisyenin açtığı ek sütunlar (vize,
// final…). Her sütunun ağırlığı (%) "Not ayarları"ndan verilir; satırda
// ağırlıklı ortalama ve harf notu hesaplanır. Öğrenci de bu sekmeyi görür:
// bütün sınıfın notları vardır ama diğer öğrencilerin adı/numarası sunucuda
// yıldızlanmıştır; öğrenciye yalnız geri verilmiş / yayınlanmış notlar gelir.
const DAGILIM_ARALIKLARI = [
  { ad: '0-49', alt: 0, ust: 49.995, renk: '#B91C1C' },
  { ad: '50-69', alt: 50, ust: 69.995, renk: '#F59E0B' },
  { ad: '70-79', alt: 70, ust: 79.995, renk: '#1B2A4A' },
  { ad: '80-89', alt: 80, ust: 89.995, renk: '#0F766E' },
  { ad: '90-100', alt: 90, ust: 1000, renk: '#2DD4BF' },
];
const sayiYaz = (v) => (v === '' || v == null ? '–' : K().puanMetni ? K().puanMetni(v) : String(v));
const ort = (l) =>
  l.length ? Math.round((l.reduce((a, b) => a + b, 0) / l.length) * 10) / 10 : '';

function IstatistikKutusu({ simge, ust, deger, renk }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 12,
        background: '#F2F3FF',
        minWidth: 150,
      }}
    >
      <span style={{ color: renk || DO.primary, display: 'inline-flex' }}>
        <Ikon ad={simge} boyut={20} />
      </span>
      <div>
        <div style={{ fontSize: 11, color: DO.muted }}>{ust}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: DO.primary }}>{deger}</div>
      </div>
    </div>
  );
}

// Ek sütun hücresi: yazılır, Enter ya da odaktan çıkınca kaydedilir.
function EkNotHucresi({ odaId, kalem, ogrenciNo, deger, kaydedildi }) {
  const [v, setV] = useState(deger === '' || deger == null ? '' : String(deger));
  const [durum, setDurum] = useState('');
  const odakta = useRef(false);
  useEffect(() => {
    if (!odakta.current) setV(deger === '' || deger == null ? '' : String(deger));
  }, [deger]);
  const kaydet = async () => {
    const yeni = metin(v).replace(',', '.');
    const eski = deger === '' || deger == null ? '' : String(deger);
    if (yeni === eski) return setDurum('');
    setDurum('kayit');
    try {
      await api('/oda/' + encodeURIComponent(odaId) + '/ek-not', {
        body: { kalemId: kalem.id, ogrenciNo, puan: yeni },
      });
      setDurum('');
      kaydedildi();
    } catch (e) {
      setDurum('hata');
      alert(e.message);
    }
  };
  return (
    <input
      value={v}
      inputMode="decimal"
      aria-label={kalem.ad + ' notu'}
      data-ek-not={kalem.id + '|' + ogrenciNo}
      placeholder="–"
      onFocus={() => (odakta.current = true)}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        odakta.current = false;
        kaydet();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      style={{
        width: 56,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 600,
        padding: '5px 4px',
        borderRadius: 7,
        border: '1px solid ' + (durum === 'hata' ? DO.red : DO.border),
        background: durum === 'kayit' ? DO.amberLight : '#fff',
        color: DO.text,
      }}
    />
  );
}

function NotAyariPaneli({ oda, kalemler, sinavlar, kapat, kaydedildi }) {
  const [satirlar, setSatirlar] = useState(() =>
    kalemler.map((k) => ({
      id: k.id,
      tur: k.tur,
      ad: k.ad,
      kisa: k.kisa,
      maks: String(k.maks),
      agirlik: String(k.agirlik),
      yayinlandi: k.yayinlandi,
      sinavTuru: k.sinavTuru || '',
    }))
  );
  // Sınav programındaki her sınav türünden ilki (sütun başlığında tarihi görünür).
  const sinavTurleri = [];
  (sinavlar || []).forEach((x) => {
    if (!sinavTurleri.some((y) => y.tur === x.tur)) sinavTurleri.push(x);
  });
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState('');
  const toplam =
    Math.round(satirlar.reduce((t, r) => t + (Number(r.agirlik.replace(',', '.')) || 0), 0) * 100) /
    100;
  const guncelle = (id, alan, deger) =>
    setSatirlar((l) => l.map((r) => (r.id === id ? { ...r, [alan]: deger } : r)));
  const ekle = (ad, sinavTuru) =>
    setSatirlar((l) =>
      l.concat({
        id: 'ek:' + Math.random().toString(36).slice(2, 10),
        tur: 'ek',
        ad,
        kisa: K().kisaAd ? K().kisaAd(ad) : '',
        maks: '100',
        agirlik: '0',
        yayinlandi: false,
        sinavTuru: sinavTuru || '',
      })
    );
  const sinavEklendi = (tur) => satirlar.some((r) => r.sinavTuru === tur);
  const esitDagit = () => {
    const n = satirlar.length;
    if (!n) return;
    const pay = Math.floor((100 / n) * 100) / 100;
    setSatirlar((l) =>
      l.map((r, i) => ({
        ...r,
        agirlik: String(i === n - 1 ? Math.round((100 - pay * (n - 1)) * 100) / 100 : pay),
      }))
    );
  };
  const kaydet = async () => {
    setMesgul(true);
    setHata('');
    try {
      const agirliklar = {};
      satirlar.forEach((r) => (agirliklar[r.id] = r.agirlik.replace(',', '.')));
      await api('/oda/' + encodeURIComponent(oda.id) + '/not-ayari', {
        body: {
          agirliklar,
          ekKalemler: satirlar
            .filter((r) => r.tur === 'ek')
            .map((r) => ({
              id: r.id,
              ad: r.ad,
              kisa: r.kisa,
              maks: r.maks.replace(',', '.'),
              yayinlandi: r.yayinlandi,
              sinavTuru: r.sinavTuru,
            })),
        },
      });
      kaydedildi();
    } catch (e) {
      setHata(e.message);
    } finally {
      setMesgul(false);
    }
  };
  const girdi = {
    border: '1px solid ' + DO.border,
    borderRadius: 7,
    padding: '6px 8px',
    fontSize: 13,
    color: DO.text,
    background: '#fff',
    minWidth: 0,
  };
  return (
    <section
      data-not-ayari
      style={{
        ...kart,
        borderRadius: 14,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: DO.primary }}>Not ayarları</div>
          <div style={{ fontSize: 12, color: DO.muted }}>
            Ödevlerin ve ek sütunların ağırlıkları. Vize, final, proje gibi sütunları buradan
            ekleyin; notları tabloda girilir.
          </div>
        </div>
        <span
          data-agirlik-toplami
          style={{
            fontSize: 13,
            fontWeight: 700,
            padding: '5px 12px',
            borderRadius: 999,
            background: toplam === 100 ? DO.accentLight : DO.amberLight,
            color: toplam === 100 ? DO.accent : DO.amber,
            border: '1px solid ' + (toplam === 100 ? DO.accentBorder : '#FCD34D'),
          }}
        >
          Toplam %{sayiYaz(toplam)}
          {toplam !== 100 ? ' · 100 olmalı' : ''}
        </span>
      </div>
      {hata && <Uyari>{hata}</Uyari>}
      {sinavTurleri.length > 0 && (
        <div
          data-sinav-programi-bilgisi
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            padding: '10px 12px',
            borderRadius: 10,
            background: DO.accentLight,
            border: '1px solid ' + DO.accentBorder,
            fontSize: 12,
            color: DO.text,
          }}
        >
          <Ikon ad="takvim" boyut={16} renk={DO.accent} />
          <b style={{ color: DO.accent }}>Sınav programında:</b>
          {sinavTurleri.map((x) => (
            <span key={x.tur}>
              {x.etiket} — {sinavMetni(x)}
            </span>
          ))}
          <span style={{ color: DO.muted }}>
            Aşağıdaki düğmeyle sınava bağlı not sütunu ekleyebilirsiniz.
          </span>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 620 }}>
          <thead>
            <tr>
              {['Sütun', 'Kısa ad', 'En yüksek', 'Ağırlık %', 'Öğrenci görür', ''].map((b) => (
                <th key={b} style={{ ...th, textAlign: 'left' }}>
                  {b}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {satirlar.map((r) => (
              <tr key={r.id} data-ayar-satiri={r.id}>
                <td style={{ ...td, textAlign: 'left' }}>
                  {r.tur === 'odev' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Etiket zemin="#EEF2F7" renk={DO.primary}>
                        Ödev
                      </Etiket>
                      {r.ad}
                    </span>
                  ) : (
                    <>
                      <input
                        value={r.ad}
                        onChange={(e) => guncelle(r.id, 'ad', e.target.value)}
                        aria-label="Sütun adı"
                        style={{ ...girdi, width: '100%' }}
                      />
                      {r.sinavTuru && sinavTurleri.find((x) => x.tur === r.sinavTuru) && (
                        <div style={{ fontSize: 11, color: DO.accent, marginTop: 3 }}>
                          Sınav programı:{' '}
                          {sinavMetni(sinavTurleri.find((x) => x.tur === r.sinavTuru))}
                        </div>
                      )}
                    </>
                  )}
                </td>
                <td style={{ ...td, textAlign: 'left' }}>
                  {r.tur === 'odev' ? (
                    <span style={{ fontFamily: monoYazi, fontSize: 12 }}>{r.kisa}</span>
                  ) : (
                    <input
                      value={r.kisa}
                      maxLength={6}
                      onChange={(e) => guncelle(r.id, 'kisa', e.target.value)}
                      aria-label="Kısa ad"
                      style={{ ...girdi, width: 64, fontFamily: monoYazi }}
                    />
                  )}
                </td>
                <td style={{ ...td, textAlign: 'left' }}>
                  {r.tur === 'odev' ? (
                    <span title="Ödevin puanı ödev ayarından gelir">{r.maks}</span>
                  ) : (
                    <input
                      value={r.maks}
                      inputMode="decimal"
                      onChange={(e) => guncelle(r.id, 'maks', e.target.value)}
                      aria-label="En yüksek puan"
                      style={{ ...girdi, width: 70 }}
                    />
                  )}
                </td>
                <td style={{ ...td, textAlign: 'left' }}>
                  <input
                    value={r.agirlik}
                    inputMode="decimal"
                    data-agirlik={r.id}
                    onChange={(e) => guncelle(r.id, 'agirlik', e.target.value)}
                    aria-label={r.ad + ' ağırlığı'}
                    style={{ ...girdi, width: 70 }}
                  />
                </td>
                <td style={{ ...td, textAlign: 'left' }}>
                  {r.tur === 'odev' ? (
                    <span style={{ fontSize: 12, color: DO.muted }}>Geri verilince</span>
                  ) : (
                    <Anahtar
                      acik={r.yayinlandi}
                      degistir={() => guncelle(r.id, 'yayinlandi', !r.yayinlandi)}
                    />
                  )}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {r.tur === 'ek' && (
                    <SimgeDugmesi
                      simge="cop"
                      baslik="Sütunu kaldır (notları da silinir)"
                      onClick={() => {
                        if (confirm('"' + r.ad + '" sütunu ve girilmiş notları silinsin mi?'))
                          setSatirlar((l) => l.filter((x) => x.id !== r.id));
                      }}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            ['vize', 'Vize'],
            ['final', 'Final'],
          ]
            .concat(sinavTurleri.some((x) => x.tur === 'but') ? [['but', 'Bütünleme']] : [])
            .map(([tur, ad]) => {
              const sinav = sinavTurleri.find((x) => x.tur === tur);
              return (
                <button
                  key={tur}
                  type="button"
                  data-ek-kalem-ekle={ad}
                  disabled={!!sinav && sinavEklendi(tur)}
                  title={
                    sinav
                      ? 'Sınav programından: ' + sinavMetni(sinav)
                      : 'Sınav programında bu dersin ' +
                        ad.toLocaleLowerCase('tr-TR') +
                        ' sınavı yok'
                  }
                  onClick={() => ekle(ad, sinav ? tur : '')}
                  style={{
                    ...ikincilDugme,
                    opacity: sinav && sinavEklendi(tur) ? 0.5 : 1,
                    ...(sinav ? { background: DO.accentLight, color: DO.accent } : {}),
                  }}
                >
                  <Ikon ad={sinav ? 'takvim' : 'arti'} boyut={15} /> {ad}
                  {sinav && (
                    <span style={{ fontWeight: 500, fontSize: 11 }}>
                      ·{' '}
                      {sinavZamani(sinav).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  )}
                </button>
              );
            })}
          <button
            type="button"
            data-ek-kalem-ekle="Proje"
            onClick={() => ekle('Proje')}
            style={ikincilDugme}
          >
            <Ikon ad="arti" boyut={15} /> Proje
          </button>
          <button type="button" onClick={() => ekle('Yeni sütun')} style={ikincilDugme}>
            <Ikon ad="arti" boyut={15} /> Başka sütun
          </button>
          <button
            type="button"
            onClick={esitDagit}
            style={{ ...ikincilDugme, background: '#fff', border: '1px solid ' + DO.border }}
          >
            Eşit dağıt
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Dugme onClick={kapat} disabled={mesgul}>
            Vazgeç
          </Dugme>
          <button
            type="button"
            onClick={kaydet}
            disabled={mesgul}
            data-not-ayari-kaydet
            style={birincilDugme}
          >
            {mesgul ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: DO.soft }}>
        Toplam %100 değilse ortalama, ağırlık toplamına göre ölçeklenir. Henüz kimseye not
        verilmemiş sütun ortalamaya girmez; notlanmış sütunda eksik not 0 sayılır. Harf notu 100'lük
        ölçeğe göredir (AA ≥ 90, BA ≥ 85, BB ≥ 80, CB ≥ 75, CC ≥ 70, DC ≥ 65, DD ≥ 60, FD ≥ 50).
      </div>
    </section>
  );
}

function NotlarSekmesi({ oda, rol, ac }) {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState('');
  const [arama, setArama] = useState('');
  const [durum, setDurum] = useState('hepsi');
  const [sira, setSira] = useState(rol === 'ogrenci' ? 'yuksek' : 'soyad');
  const [mesgul, setMesgul] = useState('');
  const [grafik, setGrafik] = useState(true);
  const [ayarAcik, setAyarAcik] = useState(false);
  const hoca = rol === 'hoca';
  const ogrenciMi = rol === 'ogrenci';

  const yukle = useCallback(() => {
    api('/oda/' + encodeURIComponent(oda.id) + '/notlar')
      .then((r) => {
        setVeri(r);
        setHata('');
      })
      .catch((e) => setHata(e.message));
  }, [oda.id]);
  useEffect(yukle, [yukle]);
  useEffect(() => {
    const h = () => yukle();
    const c = ['oda_teslimleri', 'oda_ek_notlar', 'ders_odalari'];
    c.forEach((x) => window.addEventListener('realtime:' + x, h));
    return () => c.forEach((x) => window.removeEventListener('realtime:' + x, h));
  }, [yukle]);

  if (hata) return <Uyari>{hata}</Uyari>;
  if (!veri) return <Bos baslik="Yükleniyor…" />;
  const D = K();
  const { odevler, teslimler } = veri;
  const kalemler = D.notKalemleri(odevler, veri.notAyari || {});
  const harita = new Map(teslimler.map((t) => [t.icerikId + '|' + t.ogrenciNo, t]));
  const ekHarita = new Map(
    (veri.ekNotlar || []).map((n) => [n.kalemId + '|' + n.ogrenciNo, n.puan])
  );
  const puanAl = (k, no) => {
    if (k.tur === 'odev') {
      const t = harita.get(k.icerikId + '|' + no);
      return t && metin(t.puan) !== '' ? t.puan : '';
    }
    const p = ekHarita.get(k.id + '|' + no);
    return p == null ? '' : p;
  };
  const kalemPuanlari = (k) =>
    veri.ogrenciler
      .map((s) => puanAl(k, s.no))
      .filter((p) => metin(p) !== '')
      .map(Number);
  // Henüz kimseye notu girilmemiş sütun (yapılmamış final gibi) ortalamaya
  // girmez; notlanmış sütunda öğrencinin eksik notu 0 sayılır.
  const etkinKalemler = kalemler.filter((k) => kalemPuanlari(k).length > 0);
  const sonuc = new Map();
  veri.ogrenciler.forEach((s) => {
    const r = D.agirlikliOrtalama(etkinKalemler, (k) => puanAl(k, s.no));
    sonuc.set(s.no, { ...r, harf: D.harfNotu(r.ort) });
  });

  // Süzme ve sıralama. Öğrencinin kendi satırı her zaman başta durur.
  let liste = D.ogrencileriSuz(veri.ogrenciler, {
    arama,
    sira: sira === 'yuksek' || sira === 'dusuk' ? 'soyad' : sira,
  }).filter((s) => {
    const r = sonuc.get(s.no);
    if (durum === 'basarili') return r.ort !== '' && r.ort >= 70;
    if (durum === 'destek') return r.ort !== '' && r.ort < 70;
    if (durum === 'eksik') return r.eksik > 0;
    return true;
  });
  if (sira === 'yuksek' || sira === 'dusuk') {
    const y = sira === 'yuksek' ? -1 : 1;
    liste = liste.slice().sort((a, b) => {
      const x = sonuc.get(a.no).ort;
      const z = sonuc.get(b.no).ort;
      if (x === '') return 1;
      if (z === '') return -1;
      return (x - z) * y;
    });
  }
  if (ogrenciMi) liste = liste.filter((s) => s.ben).concat(liste.filter((s) => !s.ben));

  const tumOrt = veri.ogrenciler.map((s) => sonuc.get(s.no).ort).filter((x) => x !== '');
  const genelOrt = ort(tumOrt);
  const tamamlanan = kalemler.filter(
    (k) => veri.ogrenciler.length && kalemPuanlari(k).length === veri.ogrenciler.length
  ).length;
  const dagilim = DAGILIM_ARALIKLARI.map((a) => ({
    ...a,
    sayi: tumOrt.filter((x) => x >= a.alt && x <= a.ust).length,
  }));
  const enCok = Math.max(1, ...dagilim.map((d) => d.sayi));
  const toplamAgirlik = D.agirlikToplami(kalemler);
  // Ağırlıklar bir kez kaydedildikten sonra eklenen ödev/sütun %0 alır;
  // akademisyen bunu fark etsin diye ayrıca uyarılır.
  const kayitliAgirlik = (veri.notAyari && veri.notAyari.agirliklar) || {};
  const agirliksiz = Object.keys(kayitliAgirlik).length
    ? kalemler.filter((k) => !(k.id in kayitliAgirlik))
    : [];
  const benimSatir = ogrenciMi ? veri.ogrenciler.find((s) => s.ben) : null;

  // ── ÇIKTI (akademisyen / yetkili) ──
  const cizelge = D.notCizelgesiVerisi({
    oda: veri.oda,
    odevler,
    ogrenciler: liste,
    teslimler,
    kunye: { ...veri.kunye, kurumAd: 'Çankırı Karatekin Üniversitesi' },
  });
  const ekKalemler = kalemler.filter((k) => k.tur === 'ek');
  cizelge.rows.forEach((r, i) => {
    const s = liste[i];
    const so = sonuc.get(s.no);
    r.agirlikli = so.ort === '' ? '' : D.puanMetni(so.ort);
    r.harf = so.harf;
    ekKalemler.forEach((k) => (r[k.id] = D.puanMetni(puanAl(k, s.no))));
  });

  const dosyaGovdesi = [oda.dersKod, 'not cizelgesi', D.kisaYil ? D.kisaYil(oda.donem) : '']
    .filter(Boolean)
    .join(' ')
    .replace(/[\\/:*?"<>|]/g, '-');

  const sebepBildir = (sonuc, ad) => {
    const sebep = sonuc && sonuc.reason;
    if (!sonuc || sebep === 'no-template') {
      alert(
        'Bu bölüm için "' +
          ad +
          '" şablonu yüklenmemiş; yerleşik çıktı veriliyor.\n\nKurumun kendi biçimi için bölüm yetkilisi Şablonlar → Ders Odaları alanına şablonu yükleyip alanları eşleyebilir.'
      );
    } else if (sebep === 'no-mapping') {
      alert('Şablon yüklü ama alan eşlemesi yapılmamış. Şimdilik yerleşik çıktı veriliyor.');
    } else if (sebep === 'no-row-token') {
      alert(
        'Şablonda öğrenci satırı bulunamadı ({{Öğrenci No}} gibi yer tutucular silinmiş olabilir). Yerleşik çıktı veriliyor.'
      );
    } else if (sebep === 'not-xlsx' || sebep === 'not-docx') {
      alert('Yüklü şablonun biçimi bu çıktıya uygun değil. Yerleşik çıktı veriliyor.');
    } else if (sebep) {
      alert(
        'Şablondan belge üretilemedi (' + (sonuc.message || sebep) + '). Yerleşik çıktı veriliyor.'
      );
    }
  };

  const yerlesikExcel = () => {
    const S = window.XLSX_STIL || {};
    const sd = cizelge.staticData;
    const bas = ['No', 'Öğrenci No', 'Adı', 'Soyadı']
      .concat(
        cizelge.odevler.map(
          (o, i) =>
            D.odevBasligi(i + 1) +
            (o.baslik ? ' (' + o.baslik + (o.puan ? ' / ' + o.puan : '') + ')' : '')
        )
      )
      .concat(ekKalemler.map((k) => k.ad + ' / ' + k.maks))
      .concat(['Teslim', 'Toplam', 'Ortalama (100)', 'Ağırlıklı Ort.', 'Harf']);
    const satirlar = [
      [{ v: sd.kurumAd, stil: S.vurgu }],
      [{ v: [sd.fakulteAd, sd.bolumAd].filter(Boolean).join(' — '), stil: S.vurgu }],
      [{ v: sd.baslik, stil: S.vurgu }],
      [{ v: sd.dersKodAd + (sd.ogretimUyesi ? ' · ' + sd.ogretimUyesi : ''), stil: S.vurgu }],
      [
        {
          v:
            'Ağırlıklar: ' + kalemler.map((k) => k.kisa + ' %' + D.puanMetni(k.agirlik)).join(', '),
        },
      ],
      bas,
    ].concat(
      cizelge.rows.map((r) =>
        [r.sira, r.ogrenciNo, r.ad, r.soyad]
          .concat(cizelge.odevler.map((_o, i) => r[D.odevAnahtari(i + 1)]))
          .concat(ekKalemler.map((k) => r[k.id]))
          .concat([r.teslimSayisi, r.toplam, r.ortalama, r.agirlikli, r.harf])
      )
    );
    return window.xlsxIndir(dosyaGovdesi, {
      sayfaAdi: 'Not Çizelgesi',
      satirlar,
      baslikIndeksi: 5,
      sutunGenislikleri: [6, 14, 16, 16]
        .concat(cizelge.odevler.map(() => 14))
        .concat(ekKalemler.map(() => 12))
        .concat([9, 9, 13, 13, 7]),
    });
  };

  const excel = async () => {
    setMesgul('excel');
    try {
      const TE = window.TemplateEngine;
      let sonuc = null;
      if (TE && TE.produceRowsXlsx) {
        sonuc = await TE.produceRowsXlsx({
          module: 'dersodalari',
          docType: 'not-cizelgesi',
          departmentId: oda.departmentId,
          staticData: cizelge.staticData,
          rows: cizelge.rows,
          filename: dosyaGovdesi + '.xlsx',
        });
      }
      if (!(sonuc && sonuc.ok)) {
        sebepBildir(sonuc, 'Ödev Not Çizelgesi — Excel');
        await yerlesikExcel();
      }
    } finally {
      setMesgul('');
    }
  };

  const yerlesikYazdir = () => {
    const sd = cizelge.staticData;
    const k = (v) =>
      String(v == null ? '' : v).replace(
        /[&<>"]/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
      );
    const odevBas = cizelge.odevler
      .map(
        (o, i) =>
          '<th title="' +
          k(o.baslik) +
          '">' +
          k(D.odevBasligi(i + 1)) +
          (o.puan ? '<br><small>/' + k(o.puan) + '</small>' : '') +
          '</th>'
      )
      .join('');
    const ekBas = ekKalemler
      .map((x) => '<th>' + k(x.ad) + '<br><small>/' + k(x.maks) + '</small></th>')
      .join('');
    const govde = cizelge.rows
      .map(
        (r) =>
          '<tr><td>' +
          k(r.sira) +
          '</td><td>' +
          k(r.ogrenciNo) +
          '</td><td class="ad">' +
          k(r.ad) +
          '</td><td class="ad">' +
          k(r.soyad) +
          '</td>' +
          cizelge.odevler.map((_o, i) => '<td>' + k(r[D.odevAnahtari(i + 1)]) + '</td>').join('') +
          ekKalemler.map((x) => '<td>' + k(r[x.id]) + '</td>').join('') +
          '<td>' +
          k(r.teslimSayisi) +
          '</td><td>' +
          k(r.toplam) +
          '</td><td><b>' +
          k(r.agirlikli) +
          '</b></td><td>' +
          k(r.harf) +
          '</td></tr>'
      )
      .join('');
    const html =
      '<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>' +
      k(dosyaGovdesi) +
      '</title><style>' +
      '@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;font-size:11px;color:#111}' +
      'h1{font-size:14px;text-align:center;margin:0}h2{font-size:12px;text-align:center;margin:2px 0;font-weight:600}' +
      '.kunye{display:flex;justify-content:space-between;margin:10px 0 6px;font-size:11px}' +
      'table{border-collapse:collapse;width:100%}th,td{border:1px solid #555;padding:3px 4px;text-align:center}th{background:#e5e7eb}td.ad{text-align:left}' +
      '.liste{font-size:10px;margin-top:8px;color:#333}.imza{margin-top:28px;text-align:right;font-size:11px}' +
      '</style></head><body>' +
      '<h1>' +
      k(sd.kurumAd) +
      '</h1><h2>' +
      k([sd.fakulteAd, sd.bolumAd].filter(Boolean).join(' — ')) +
      '</h2><h2>' +
      k(sd.baslik) +
      '</h2>' +
      '<div class="kunye"><span><b>Ders:</b> ' +
      k(sd.dersKodAd) +
      '</span><span><b>Öğretim Üyesi:</b> ' +
      k(sd.ogretimUyesi) +
      '</span><span><b>Öğrenci:</b> ' +
      k(sd.ogrenciSayisi) +
      '</span></div>' +
      '<table><thead><tr><th>No</th><th>Öğrenci No</th><th>Adı</th><th>Soyadı</th>' +
      odevBas +
      ekBas +
      '<th>Teslim</th><th>Toplam</th><th>Ağırlıklı Ort.</th><th>Harf</th></tr></thead><tbody>' +
      govde +
      '</tbody></table>' +
      '<div class="liste">' +
      k(sd.odevListesi) +
      '<br>Ağırlıklar: ' +
      k(kalemler.map((x) => x.kisa + ' %' + D.puanMetni(x.agirlik)).join(', ')) +
      '</div>' +
      '<div class="imza">' +
      k(sd.tarih) +
      '<br><br>' +
      k(sd.ogretimUyesi) +
      '<br>İmza</div>' +
      '<script>window.onload=function(){setTimeout(function(){window.print()},200)}</scr' +
      'ipt></body></html>';
    const w = window.open('', '_blank');
    if (!w) return alert('Açılır pencere engellendi; tarayıcı ayarından izin verin.');
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const pdf = async () => {
    setMesgul('pdf');
    try {
      const TE = window.TemplateEngine;
      let sonuc = null;
      if (TE && TE.produceFromTemplate) {
        sonuc = await TE.produceFromTemplate({
          module: 'dersodalari',
          docType: 'not-cizelgesi-pdf',
          departmentId: oda.departmentId,
          staticData: cizelge.staticData,
          rows: cizelge.rows,
          stripRowBold: true,
          filename: dosyaGovdesi + '.docx',
          noDownload: true,
        });
      }
      if (sonuc && sonuc.ok && sonuc.blob) {
        // Word şablonu sunucuda PDF'e çevrilir; çevrilemezse .docx iner.
        const yanit = await fetch('/api/files/docx-pdf', {
          method: 'POST',
          credentials: 'include',
          headers: basliklar({
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
          body: sonuc.blob,
        }).catch(() => null);
        const blob = yanit && yanit.ok ? await yanit.blob() : sonuc.blob;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = dosyaGovdesi + (yanit && yanit.ok ? '.pdf' : '.docx');
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        return;
      }
      sebepBildir(sonuc, 'Ödev Not Çizelgesi — Yazdırma / PDF');
      yerlesikYazdir();
    } finally {
      setMesgul('');
    }
  };

  // ── GÖRÜNÜM ──
  const secim = {
    border: '1px solid ' + DO.border,
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    color: DO.text,
    background: '#F2F3FF',
  };
  const puanRozeti = (p, k, taslak) => {
    if (metin(p) === '') return <span style={{ color: DO.soft }}>–</span>;
    const oran = (Number(p) / k.maks) * 100;
    return (
      <span
        title={taslak ? 'Taslak — öğrenci görmüyor' : ''}
        style={{
          display: 'inline-block',
          minWidth: 42,
          padding: '4px 8px',
          borderRadius: 7,
          fontWeight: 700,
          fontSize: 13,
          background: taslak ? DO.amberLight : oran >= 85 ? '#CCFBF1' : '#EEF2F7',
          color: taslak ? DO.amber : oran >= 85 ? DO.accent : DO.text,
          border: taslak ? '1px dashed #F59E0B' : 'none',
        }}
      >
        {D.puanMetni(p)}
      </span>
    );
  };
  const harfRozeti = (h) =>
    h ? (
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 6,
          fontFamily: monoYazi,
          background:
            h === 'FF' || h === 'FD'
              ? DO.redLight
              : h === 'DD' || h === 'DC'
                ? DO.amberLight
                : '#CCFBF1',
          color:
            h === 'FF' || h === 'FD' ? DO.red : h === 'DD' || h === 'DC' ? DO.amber : DO.accent,
        }}
      >
        {h}
      </span>
    ) : (
      <span style={{ color: DO.soft }}>–</span>
    );
  const ortRengi = (x) =>
    x === '' ? DO.soft : x < 50 ? DO.red : x < 70 ? DO.amber : x >= 85 ? DO.accent : DO.primary;
  const yapisik = { position: 'sticky', left: 0, zIndex: 1 };
  const bth = {
    ...th,
    padding: '12px 12px',
    background: '#EEF1FF',
    color: DO.primary,
    fontWeight: 700,
    verticalAlign: 'bottom',
  };
  const ekOrtalama = (k) => ort(kalemPuanlari(k));

  return (
    <div data-notlar style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Başlık */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <span
            style={{
              width: 48,
              height: 48,
              flex: '0 0 48px',
              borderRadius: 12,
              background: DO.primary,
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ikon ad="grafik" boyut={24} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
                fontSize: 12,
                color: DO.muted,
              }}
            >
              <KodRozeti kod={oda.dersKod} />
              <span>· {D.donemEtiketi ? D.donemEtiketi(oda.donem) : oda.donem}</span>
              <Etiket zemin={DO.accentLight} renk={DO.accent} kenar={DO.accentBorder}>
                {ogrenciMi ? 'Notlarım' : 'Aktif değerlendirme'}
              </Etiket>
            </div>
            <h2
              style={{
                margin: '4px 0 0',
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: -0.3,
                color: DO.primary,
              }}
            >
              Not Matrisi &amp; Değerlendirme Defteri
            </h2>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <IstatistikKutusu
            simge="grup"
            ust="Kayıtlı öğrenci"
            deger={veri.ogrenciler.length + ' kişi'}
          />
          <IstatistikKutusu
            simge="grafik"
            ust="Genel ortalama"
            renk={DO.amber}
            deger={genelOrt === '' ? '–' : D.puanMetni(genelOrt) + ' / 100'}
          />
          {ogrenciMi && benimSatir ? (
            <IstatistikKutusu
              simge="tamam"
              ust="Benim ortalamam"
              renk={DO.accent}
              deger={
                sonuc.get(benimSatir.no).ort === ''
                  ? '–'
                  : D.puanMetni(sonuc.get(benimSatir.no).ort) +
                    ' · ' +
                    sonuc.get(benimSatir.no).harf
              }
            />
          ) : (
            <IstatistikKutusu
              simge="tamam"
              ust="Tamamlanan sütun"
              renk={DO.accent}
              deger={tamamlanan + ' / ' + kalemler.length}
            />
          )}
        </div>
      </div>

      {/* Araç çubuğu */}
      <div
        style={{
          ...kart,
          borderRadius: 12,
          padding: 12,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 8,
            background: '#F2F3FF',
            color: DO.muted,
            flex: '1 1 220px',
          }}
        >
          <Ikon ad="ara" boyut={16} />
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder={ogrenciMi ? 'Ara…' : 'Ad, soyad ya da numara ara…'}
            data-notlar-ara
            aria-label="Öğrenci ara"
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              flex: 1,
              minWidth: 0,
            }}
          />
        </label>
        <select
          value={durum}
          onChange={(e) => setDurum(e.target.value)}
          data-notlar-durum
          style={secim}
          aria-label="Süzgeç"
        >
          <option value="hepsi">Tüm öğrenciler ({veri.ogrenciler.length})</option>
          <option value="basarili">Başarılı (≥70)</option>
          <option value="destek">Destek gerekli (&lt;70)</option>
          <option value="eksik">Eksik notu olanlar</option>
        </select>
        <select
          value={sira}
          onChange={(e) => setSira(e.target.value)}
          data-notlar-sira
          style={secim}
          aria-label="Sıralama"
        >
          {!ogrenciMi && <option value="soyad">Soyadına göre (A-Z)</option>}
          {!ogrenciMi && <option value="ad">Adına göre (A-Z)</option>}
          {!ogrenciMi && <option value="no">Öğrenci no (artan)</option>}
          <option value="yuksek">Not: en yüksekten</option>
          <option value="dusuk">Not: en düşükten</option>
        </select>
        <button
          type="button"
          onClick={() => setGrafik((x) => !x)}
          aria-pressed={grafik}
          style={{ ...ikincilDugme, background: grafik ? '#E2E7FF' : '#EEF2F7' }}
        >
          <Ikon ad="grafik" boyut={15} /> Dağılım grafiği
        </button>
        {hoca && (
          <button
            type="button"
            data-not-ayari-ac
            onClick={() => setAyarAcik((x) => !x)}
            style={{ ...ikincilDugme, background: ayarAcik ? '#E2E7FF' : '#EEF2F7' }}
          >
            <Ikon ad="palet" boyut={15} /> Not ayarları
          </button>
        )}
        {!ogrenciMi && (
          <>
            <button
              type="button"
              onClick={excel}
              disabled={!!mesgul}
              data-excel-indir
              style={{ ...birincilDugme, background: DO.accent }}
            >
              <Ikon ad="indir" boyut={15} /> {mesgul === 'excel' ? 'Hazırlanıyor…' : 'Excel indir'}
            </button>
            <button
              type="button"
              onClick={pdf}
              disabled={!!mesgul}
              data-pdf-indir
              style={{ ...ikincilDugme, background: '#fff', border: '1px solid ' + DO.border }}
            >
              <Ikon ad="belge" boyut={15} /> {mesgul === 'pdf' ? 'Hazırlanıyor…' : 'Yazdır / PDF'}
            </button>
          </>
        )}
      </div>

      {hoca && ayarAcik && (
        <NotAyariPaneli
          oda={oda}
          kalemler={D.notKalemleri(odevler, veri.notAyari || {})}
          sinavlar={veri.sinavlar || []}
          kapat={() => setAyarAcik(false)}
          kaydedildi={() => {
            setAyarAcik(false);
            yukle();
          }}
        />
      )}

      {grafik && tumOrt.length > 0 && (
        <section data-not-dagilimi style={{ ...kart, borderRadius: 14, padding: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  color: DO.muted,
                  textTransform: 'uppercase',
                }}
              >
                İstatistiksel dağılım
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: DO.primary }}>
                {oda.dersKod} ağırlıklı ortalama dağılımı
              </div>
            </div>
            <div style={{ fontSize: 12, color: DO.muted }}>
              {tumOrt.length} öğrencinin ortalaması var
            </div>
          </div>
          <div
            style={{
              marginTop: 14,
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: 12,
              alignItems: 'end',
              height: 150,
              padding: '12px 12px 0',
              borderRadius: 10,
              background: '#F8FAFC',
            }}
          >
            {dagilim.map((d) => (
              <div
                key={d.ad}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: DO.primary }}>{d.sayi}</span>
                <span
                  style={{
                    width: '70%',
                    height: Math.max(3, (d.sayi / enCok) * 100) + 'px',
                    borderRadius: '6px 6px 0 0',
                    background: d.sayi ? d.renk : '#E2E8F0',
                  }}
                />
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: 12,
              padding: '6px 12px 0',
            }}
          >
            {dagilim.map((d) => (
              <span
                key={d.ad}
                style={{ textAlign: 'center', fontSize: 11, fontFamily: monoYazi, color: DO.muted }}
              >
                {d.ad}
              </span>
            ))}
          </div>
        </section>
      )}

      {cizelge.uyari && !ogrenciMi && <Uyari tur="bilgi">{cizelge.uyari}</Uyari>}
      {hoca && agirliksiz.length > 0 && (
        <Uyari tur="bilgi">
          Ağırlık verilmemiş sütun{agirliksiz.length > 1 ? 'lar' : ''}:{' '}
          {agirliksiz.map((k) => k.ad).join(', ')} — ağırlıklar kaydedildikten sonra eklendiği için
          ortalamaya %0 ile giriyor. "Not ayarları"ndan ağırlık verin.
        </Uyari>
      )}

      <section style={{ ...kart, borderRadius: 14, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            padding: '12px 16px',
            borderBottom: '1px solid ' + DO.border,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <Ikon ad="tamam" boyut={16} renk={DO.accent} />
            <b style={{ color: DO.primary }}>Notlandırma çizelgesi</b>
            <span style={{ color: DO.muted, fontSize: 12 }}>
              {hoca
                ? '· Ek sütunlara (vize, final…) hücreye yazarak not girin; ödev notları ödev ekranından verilir.'
                : ogrenciMi
                  ? '· Diğer öğrencilerin kimliği gizlidir; yalnız geri verilen notlar görünür.'
                  : '· Notları dersin akademisyeni girer.'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
              fontFamily: monoYazi,
              fontSize: 11,
            }}
          >
            <span style={{ color: DO.muted }}>Ağırlıklar:</span>
            {kalemler.map((k) => (
              <span
                key={k.id}
                title={k.ad}
                style={{
                  padding: '2px 6px',
                  borderRadius: 5,
                  background: '#EEF2F7',
                  color: DO.primary,
                  fontWeight: 600,
                }}
              >
                {k.kisa} %{D.puanMetni(k.agirlik)}
              </span>
            ))}
            {!ogrenciMi && kalemler.length > 0 && toplamAgirlik !== 100 && (
              <span style={{ color: DO.amber, fontWeight: 700 }}>
                Σ %{D.puanMetni(toplamAgirlik)}
              </span>
            )}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 13 }}
            data-not-tablosu
          >
            <thead>
              <tr>
                <th style={{ ...bth, ...yapisik, textAlign: 'left', minWidth: 200, zIndex: 2 }}>
                  Öğrenci (ad soyad &amp; no)
                </th>
                <th style={{ ...bth, minWidth: 80 }}>
                  Ortalama
                  <div style={{ fontSize: 11, fontWeight: 500, color: DO.muted }}>
                    ağırlıklı / 100
                  </div>
                </th>
                {kalemler.map((k) => (
                  <th key={k.id} style={{ ...bth, minWidth: 96 }} data-kalem-basligi={k.id}>
                    {k.tur === 'odev' ? (
                      <button
                        type="button"
                        onClick={() => ac(k.icerikId)}
                        title="Ödevi aç"
                        style={{
                          border: 'none',
                          background: 'none',
                          color: DO.primary,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: 12,
                          padding: 0,
                        }}
                      >
                        {k.ad}
                      </button>
                    ) : (
                      <span>
                        {k.ad}
                        {k.sinavTuru &&
                          (veri.sinavlar || []).find((x) => x.tur === k.sinavTuru) && (
                            <span
                              style={{
                                display: 'block',
                                fontSize: 10,
                                fontWeight: 500,
                                color: DO.muted,
                              }}
                            >
                              {sinavZamani(
                                (veri.sinavlar || []).find((x) => x.tur === k.sinavTuru)
                              ).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        {hoca && !k.yayinlandi && (
                          <span
                            title="Öğrenciler henüz görmüyor"
                            style={{ marginLeft: 4, color: DO.amber }}
                          >
                            •
                          </span>
                        )}
                      </span>
                    )}
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: etkinKalemler.includes(k) ? DO.accent : DO.soft,
                      }}
                      title={etkinKalemler.includes(k) ? '' : 'Henüz not yok — ortalamaya girmiyor'}
                    >
                      {k.maks} · %{D.puanMetni(k.agirlik)}
                    </div>
                  </th>
                ))}
                <th style={{ ...bth, minWidth: 60 }}>Harf</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((s) => {
                const so = sonuc.get(s.no);
                const zemin = s.ben ? '#F0FDFA' : '#fff';
                const [az, ar] = avatarTonu(s.no);
                return (
                  <tr key={s.no} data-not-satiri={s.maskeli ? 'gizli' : s.no}>
                    <td
                      style={{
                        ...td,
                        ...yapisik,
                        textAlign: 'left',
                        background: zemin,
                        borderRight: '1px solid ' + DO.border,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          aria-hidden="true"
                          style={{
                            width: 32,
                            height: 32,
                            flex: '0 0 32px',
                            borderRadius: '50%',
                            background: s.maskeli ? '#E2E8F0' : az,
                            color: s.maskeli ? DO.soft : ar,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {s.maskeli ? '•' : ogrenciBasHarf(s)}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: s.maskeli ? DO.muted : DO.text,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            {tamAd(s)}
                            {s.ben && (
                              <Etiket zemin={DO.accent} renk="#fff">
                                Siz
                              </Etiket>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: DO.muted, fontFamily: monoYazi }}>
                            {s.maskeli ? D.noMaskele() : s.no}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...td, background: '#F8FAFF' }}>
                      <span
                        style={{ fontSize: 17, fontWeight: 700, color: ortRengi(so.ort) }}
                        title={so.eksik ? so.eksik + ' sütunda not yok (0 sayıldı)' : ''}
                      >
                        {sayiYaz(so.ort)}
                      </span>
                      {so.eksik > 0 && so.ort !== '' && (
                        <div style={{ fontSize: 10, color: DO.amber }}>{so.eksik} eksik</div>
                      )}
                    </td>
                    {kalemler.map((k) => {
                      if (k.tur === 'ek' && hoca)
                        return (
                          <td key={k.id} style={td}>
                            <EkNotHucresi
                              odaId={oda.id}
                              kalem={k}
                              ogrenciNo={s.no}
                              deger={puanAl(k, s.no)}
                              kaydedildi={yukle}
                            />
                          </td>
                        );
                      const t = k.tur === 'odev' ? harita.get(k.icerikId + '|' + s.no) : null;
                      const p = puanAl(k, s.no);
                      if (k.tur === 'odev' && metin(p) === '' && !ogrenciMi) {
                        const d = D.teslimDurumu(
                          odevler.find((o) => o.id === k.icerikId),
                          t,
                          s.no
                        );
                        return (
                          <td key={k.id} style={td}>
                            <span style={{ fontSize: 11, color: (D.DURUMLAR[d] || {}).renk }}>
                              {(D.DURUMLAR[d] || {}).etiket}
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td key={k.id} style={td}>
                          {puanRozeti(p, k, k.tur === 'odev' && t && !t.geriVerildi)}
                        </td>
                      );
                    })}
                    <td style={td}>{harfRozeti(so.harf)}</td>
                  </tr>
                );
              })}
              {!liste.length && (
                <tr>
                  <td colSpan={kalemler.length + 3} style={{ ...td, color: DO.muted }}>
                    Süzgece uyan öğrenci yok.
                  </td>
                </tr>
              )}
            </tbody>
            {liste.length > 0 && (
              <tfoot>
                <tr style={{ background: '#EEF1FF' }}>
                  <td
                    style={{
                      ...td,
                      ...yapisik,
                      textAlign: 'left',
                      background: '#EEF1FF',
                      fontWeight: 700,
                      color: DO.primary,
                      borderRight: '1px solid ' + DO.border,
                    }}
                  >
                    Sınıf ortalaması
                  </td>
                  <td style={{ ...td, fontSize: 16, fontWeight: 700, color: DO.accent }}>
                    {sayiYaz(genelOrt)}
                  </td>
                  {kalemler.map((k) => (
                    <td key={k.id} style={{ ...td, fontWeight: 700 }}>
                      {sayiYaz(ekOrtalama(k))}
                    </td>
                  ))}
                  <td style={{ ...td, fontWeight: 700, color: DO.accent }}>
                    {genelOrt === '' ? '–' : D.harfNotu(genelOrt)}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      ...td,
                      ...yapisik,
                      textAlign: 'left',
                      background: '#fff',
                      fontSize: 11,
                      color: DO.muted,
                      borderRight: '1px solid ' + DO.border,
                    }}
                  >
                    Uç değerler (min / maks)
                  </td>
                  <td style={{ ...td, fontFamily: monoYazi, fontSize: 11 }}>
                    {tumOrt.length ? (
                      <>
                        <span style={{ color: DO.red }}>{D.puanMetni(Math.min(...tumOrt))}</span> /{' '}
                        <span style={{ color: DO.accent }}>{D.puanMetni(Math.max(...tumOrt))}</span>
                      </>
                    ) : (
                      '–'
                    )}
                  </td>
                  {kalemler.map((k) => {
                    const l = kalemPuanlari(k);
                    return (
                      <td
                        key={k.id}
                        style={{ ...td, fontFamily: monoYazi, fontSize: 11, color: DO.muted }}
                      >
                        {l.length
                          ? D.puanMetni(Math.min(...l)) + ' / ' + D.puanMetni(Math.max(...l))
                          : '–'}
                      </td>
                    );
                  })}
                  <td style={{ ...td, fontFamily: monoYazi, fontSize: 11, color: DO.muted }}>
                    {tumOrt.length
                      ? D.harfNotu(Math.min(...tumOrt)) + ' / ' + D.harfNotu(Math.max(...tumOrt))
                      : '–'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
      <div style={{ fontSize: 11, color: DO.soft }}>
        {ogrenciMi
          ? 'Ödev notu akademisyen geri verdiğinde, sınav notu sütun yayınlandığında görünür. Ortalama görünen notlardan hesaplanır: henüz kimseye not verilmemiş sütun hesaba girmez, notlanmış bir sütunda notunuz yoksa 0 sayılır.'
          : 'Kesik çizgili turuncu notlar taslaktır: öğrenci, akademisyen "Geri Ver" diyene kadar görmez. Ek sütunu öğrenciler "Not ayarları"nda yayınlandıktan sonra görür. Henüz kimseye not verilmemiş sütun (soluk ağırlık) ortalamaya girmez; notlanmış sütunda eksik not 0 sayılır. Çıktıya bütün notlar yazılır.'}
      </div>
    </div>
  );
}
const th = {
  padding: '8px 10px',
  borderBottom: '1px solid ' + DO.border,
  textAlign: 'center',
  fontSize: 12,
  color: DO.muted,
};
const td = { padding: '8px 10px', borderBottom: '1px solid ' + DO.border, textAlign: 'center' };

window.DersOdalariApp = DersOdalariApp;
