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

// Oda bandı için renkler (akademisyen "Özelleştir" ile seçer).
const BANT_RENKLERI = [
  '#1E3A8A',
  '#0F766E',
  '#7C3AED',
  '#B45309',
  '#BE123C',
  '#15803D',
  '#0369A1',
  '#475569',
];

const metin = (v) => (v == null ? '' : String(v).trim());
const K = () => window.DersOdasi || {};

function varsayilanRenk(kimlik) {
  let h = 0;
  const s = metin(kimlik);
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return BANT_RENKLERI[Math.abs(h) % BANT_RENKLERI.length];
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
    <div style={{ fontFamily: "'Inter', sans-serif", color: DO.text }} data-oda-listesi>
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
                padding: 0,
                textAlign: 'left',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  background: o.renk || varsayilanRenk(o.id),
                  color: '#fff',
                  padding: '16px 16px 18px',
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
// ODA
// ══════════════════════════════════════════════════════════════
function OdaEkrani({ odaId, icerikId, setIcerikId, sekme, setSekme, ayarlar, geri }) {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState('');
  const [form, setForm] = useState(null); // { tur, icerik? }
  const [ozellestir, setOzellestir] = useState(false);

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
      <div style={{ fontFamily: "'Inter', sans-serif" }}>
        <Dugme onClick={geri}>← Ders odaları</Dugme>
        <div style={{ height: 12 }} />
        <Uyari>{hata}</Uyari>
      </div>
    );
  }
  if (!veri) return <Bos baslik="Yükleniyor…" />;

  const { oda, rol, icerikler, yorumSayisi, benimTeslimlerim, ogrenciSayisi } = veri;
  const hoca = rol === 'hoca';
  const ogrenci = rol === 'ogrenci';
  const renk = oda.renk || varsayilanRenk(oda.id);
  const odevler = icerikler.filter((i) => i.tur === 'odev');
  const teslimHaritasi = new Map((benimTeslimlerim || []).map((t) => [t.icerikId, t]));
  const benimNo = metin(veri.ogrenciNo);

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
  if (!ogrenci) sekmeler.push(['notlar', 'Notlar']);

  const yaklasan = odevler
    .filter((o) => o.sonTarih && new Date(o.sonTarih).getTime() > Date.now())
    .filter((o) => !ogrenci || !(teslimHaritasi.get(o.id) || {}).teslimEdildi)
    .sort((a, b) => (a.sonTarih < b.sonTarih ? -1 : 1))
    .slice(0, 5);

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif", color: DO.text }}
      data-oda-ekrani={oda.id}
      data-rol={rol}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <Dugme onClick={geri}>← Ders odaları</Dugme>
        <div role="tablist" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginLeft: 8 }}>
          {sekmeler.map(([id, ad]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={sekme === id}
              data-oda-sekme={id}
              onClick={() => setSekme(id)}
              style={{
                border: 'none',
                background: 'none',
                padding: '8px 12px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                color: sekme === id ? renk : DO.muted,
                borderBottom: '3px solid ' + (sekme === id ? renk : 'transparent'),
              }}
            >
              {ad}
            </button>
          ))}
        </div>
      </div>

      {sekme === 'akis' && (
        <>
          <div
            style={{
              background: renk,
              color: '#fff',
              borderRadius: 12,
              padding: '28px 24px',
              minHeight: 120,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 16,
            }}
            data-oda-bandi
          >
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {oda.dersKod}
                {K().kisaYil ? ' , ' + K().kisaYil(oda.donem) : ''}
              </div>
              <div style={{ fontSize: 15, opacity: 0.92, marginTop: 4 }}>{oda.dersAd}</div>
              {oda.aciklama && (
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, maxWidth: 640 }}>
                  {oda.aciklama}
                </div>
              )}
            </div>
            {hoca && (
              <button
                type="button"
                onClick={() => setOzellestir(true)}
                style={{
                  background: '#fff',
                  color: renk,
                  border: 'none',
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Özelleştir
              </button>
            )}
          </div>

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

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div
              style={{
                width: 230,
                flex: '0 0 230px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                maxWidth: '100%',
              }}
            >
              <div style={{ ...kart, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Ders bilgisi</div>
                <div style={{ fontSize: 12, color: DO.muted, marginTop: 6, lineHeight: 1.6 }}>
                  {K().donemEtiketi ? K().donemEtiketi(oda.donem) : oda.donem}
                  <br />
                  {ogrenciSayisi} öğrenci · {odevler.length} ödev
                </div>
              </div>
              <div style={{ ...kart, padding: 14 }} data-yaklasan>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Teslim tarihi yaklaşan ödevler</div>
                {yaklasan.length === 0 ? (
                  <div style={{ fontSize: 12, color: DO.muted, marginTop: 6 }}>
                    Teslim tarihi yaklaşan ödev yok.
                  </div>
                ) : (
                  yaklasan.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setIcerikId(o.id)}
                      style={{
                        display: 'block',
                        border: 'none',
                        background: 'none',
                        padding: '6px 0 0',
                        textAlign: 'left',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      <div style={{ fontSize: 11, color: DO.muted }}>
                        Son: {tarihSaat(o.sonTarih)}
                      </div>
                      <div style={{ fontSize: 13, color: DO.primary, fontWeight: 600 }}>
                        {o.baslik}
                      </div>
                    </button>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => setSekme('odevler')}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: renk,
                    fontSize: 12,
                    fontWeight: 600,
                    marginTop: 10,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Tümünü görüntüle
                </button>
              </div>
            </div>

            <div
              style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {hoca && !form && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Dugme tur="ana" onClick={() => setForm({ tur: 'duyuru' })} data-yeni-duyuru>
                    + Yeni duyuru
                  </Dugme>
                  <Dugme onClick={() => setForm({ tur: 'odev' })} data-yeni-odev>
                    + Yeni ödev
                  </Dugme>
                </div>
              )}
              {form && (
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
              )}
              {icerikler.length === 0 && (
                <Bos
                  baslik="Henüz paylaşım yok."
                  alt={
                    hoca
                      ? 'Duyuru ya da ödev paylaşarak başlayın.'
                      : 'Akademisyen paylaşım yaptığında burada görünür.'
                  }
                />
              )}
              {icerikler.map((i) => (
                <AkisOgesi
                  key={i.id}
                  icerik={i}
                  renk={renk}
                  yorum={yorumSayisi[i.id] || 0}
                  teslim={ogrenci ? teslimHaritasi.get(i.id) : null}
                  ogrenciNo={benimNo}
                  ogrenci={ogrenci}
                  ac={() => setIcerikId(i.id)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {sekme === 'odevler' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 900 }}>
          {hoca && !form && (
            <div>
              <Dugme tur="ana" onClick={() => setForm({ tur: 'odev' })}>
                + Oluştur: Ödev
              </Dugme>
            </div>
          )}
          {form && (
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
          )}
          {odevler.length === 0 && <Bos baslik="Henüz ödev yok." />}
          {odevler.map((o) => {
            const t = teslimHaritasi.get(o.id);
            const durum = ogrenci && K().teslimDurumu ? K().teslimDurumu(o, t, benimNo) : '';
            return (
              <button
                key={o.id}
                type="button"
                data-odev-satiri={o.id}
                onClick={() => setIcerikId(o.id)}
                style={{
                  ...kart,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <OdevSimgesi renk={renk} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: DO.primary }}>{o.baslik}</div>
                  <div style={{ fontSize: 12, color: DO.muted }}>
                    {o.sonTarih ? 'Teslim tarihi: ' + tarihSaat(o.sonTarih) : 'Teslim tarihi yok'}
                    {o.puan ? ' · ' + o.puan + ' puan' : ''}
                    {o.kabulAcik === false ? ' · Gönderim kapalı' : ''}
                  </div>
                </div>
                {durum && <DurumRozeti durum={durum} />}
                {ogrenci && t && t.geriVerildi && metin(t.puan) !== '' && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: DO.accent }}>
                    {K().puanMetni(t.puan)}
                    {o.puan ? '/' + o.puan : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {sekme === 'kisiler' && <KisilerSekmesi oda={oda} rol={rol} ogrenciSayisi={ogrenciSayisi} />}
      {sekme === 'notlar' && !ogrenci && (
        <NotlarSekmesi oda={oda} rol={rol} ac={(id) => setIcerikId(id)} />
      )}
    </div>
  );
}

function OdevSimgesi({ renk }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 36,
        height: 36,
        flex: '0 0 36px',
        borderRadius: '50%',
        background: renk,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </span>
  );
}

function AkisOgesi({ icerik, renk, yorum, teslim, ogrenciNo, ogrenci, ac }) {
  const odev = icerik.tur === 'odev';
  const durum =
    ogrenci && odev && K().teslimDurumu ? K().teslimDurumu(icerik, teslim, ogrenciNo) : '';
  return (
    <div
      style={{ ...kart, padding: '14px 16px' }}
      data-akis-ogesi={icerik.id}
      data-tur={icerik.tur}
    >
      <button
        type="button"
        onClick={ac}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          border: 'none',
          background: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {odev ? (
          <OdevSimgesi renk={renk} />
        ) : (
          <span
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              flex: '0 0 36px',
              borderRadius: '50%',
              background: DO.accentLight,
              color: renk,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            {(
              metin(icerik.yazar).replace(/^(Prof\.|Doç\.|Dr\.|Öğr\.|Gör\.|Arş\.|\s)+/g, '')[0] ||
              '?'
            ).toLocaleUpperCase('tr')}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, color: DO.text }}>
            {odev ? (
              <>
                {icerik.yazar}, yeni bir ödev yayınladı: <b>{icerik.baslik}</b>
              </>
            ) : (
              <b>{icerik.yazar}</b>
            )}
          </div>
          <div style={{ fontSize: 12, color: DO.muted }}>
            {tarihSaat(icerik.olusturuldu)}
            {icerik.duzenlendi ? ' (düzenlendi)' : ''}
            {odev && icerik.sonTarih ? ' · Son teslim: ' + tarihSaat(icerik.sonTarih) : ''}
          </div>
        </div>
        {durum && <DurumRozeti durum={durum} />}
      </button>
      {!odev && (
        <div style={{ marginTop: 10, fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
          {icerik.baslik && <div style={{ fontWeight: 600, marginBottom: 4 }}>{icerik.baslik}</div>}
          {icerik.metin}
        </div>
      )}
      {!odev && icerik.ekler && icerik.ekler.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <Ekler ekler={icerik.ekler} />
        </div>
      )}
      <div style={{ borderTop: '1px solid ' + DO.border, marginTop: 12, paddingTop: 8 }}>
        <button
          type="button"
          onClick={ac}
          style={{
            border: 'none',
            background: 'none',
            color: DO.muted,
            fontSize: 12,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {yorum > 0 ? yorum + ' sınıf yorumu' : 'Sınıf yorumu ekle'}
        </button>
      </div>
    </div>
  );
}

function OzellestirPenceresi({ oda, kapat, kaydedildi }) {
  const [renk, setRenk] = useState(oda.renk || varsayilanRenk(oda.id));
  const [aciklama, setAciklama] = useState(oda.aciklama || '');
  const [mesgul, setMesgul] = useState(false);
  return (
    <div style={{ ...kart, padding: 16, marginBottom: 16 }} data-ozellestir>
      <div style={{ fontWeight: 600, marginBottom: 10 }}>Odayı özelleştir</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
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
              background: r,
              border: renk === r ? '3px solid ' + DO.text : '2px solid #fff',
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
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: '1px solid ' + DO.border,
          borderRadius: 8,
          padding: 8,
          fontSize: 13,
          fontFamily: 'inherit',
        }}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
        <Dugme onClick={kapat}>Vazgeç</Dugme>
        <Dugme
          tur="ana"
          disabled={mesgul}
          onClick={async () => {
            setMesgul(true);
            try {
              await api('/oda/' + encodeURIComponent(oda.id) + '/ozellestir', {
                body: { renk, aciklama },
              });
              kaydedildi();
            } catch (e) {
              alert(e.message);
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
        <Dugme onClick={geri}>← {oda.dersKod}</Dugme>
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <Dugme onClick={geri}>← {oda.dersKod}</Dugme>
        {odev && gorevli && (
          <div role="tablist" style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
            {[
              ['talimatlar', 'Talimatlar'],
              ['calisma', 'Öğrenci çalışması'],
            ].map(([id, ad]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={sekme === id}
                data-icerik-sekme={id}
                onClick={() => setSekme(id)}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: '8px 12px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: sekme === id ? renk : DO.muted,
                  borderBottom: '3px solid ' + (sekme === id ? renk : 'transparent'),
                }}
              >
                {ad}
              </button>
            ))}
          </div>
        )}
        <span style={{ flex: 1 }} />
        {hoca && (
          <>
            <Dugme kucuk onClick={() => duzenle(icerik)}>
              Düzenle
            </Dugme>
            <Dugme kucuk tur="tehlike" onClick={sil}>
              Sil
            </Dugme>
          </>
        )}
      </div>

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
                    style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: 14 }}
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
            <CalismanizPaneli veri={veri} oda={oda} ayarlar={ayarlar} renk={renk} yenile={yukle} />
          )}
        </div>
      )}
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
function KisilerSekmesi({ oda, rol, ogrenciSayisi }) {
  const [ogrenciler, setOgrenciler] = useState(null);
  const [arama, setArama] = useState('');
  const [sira, setSira] = useState('soyad');
  useEffect(() => {
    if (rol === 'ogrenci') return;
    api('/oda/' + encodeURIComponent(oda.id) + '/notlar')
      .then((r) => setOgrenciler(r.ogrenciler || []))
      .catch(() => setOgrenciler([]));
  }, [oda.id, rol]);
  const liste = ogrenciler ? K().ogrencileriSuz(ogrenciler, { arama, sira }) : [];
  return (
    <div style={{ maxWidth: 760 }} data-kisiler>
      <h3
        style={{
          fontSize: 20,
          color: DO.primary,
          borderBottom: '1px solid ' + DO.border,
          paddingBottom: 8,
        }}
      >
        Akademisyenler
      </h3>
      {(oda.hocalar || []).map((h) => (
        <div key={h} style={{ padding: '8px 0', fontSize: 14 }}>
          {h}
        </div>
      ))}
      <h3
        style={{
          fontSize: 20,
          color: DO.primary,
          borderBottom: '1px solid ' + DO.border,
          paddingBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Öğrenciler</span>
        <span style={{ fontSize: 13, color: DO.muted, fontWeight: 400 }}>
          {ogrenciSayisi} öğrenci
        </span>
      </h3>
      {rol === 'ogrenci' ? (
        <div style={{ fontSize: 13, color: DO.muted }}>
          Bu dönem dersi seçen {ogrenciSayisi} öğrenci odadadır.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Ad, soyad ya da numara ara"
              style={{
                flex: 1,
                border: '1px solid ' + DO.border,
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 13,
              }}
            />
            <select
              value={sira}
              onChange={(e) => setSira(e.target.value)}
              style={{
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
          {ogrenciler == null && <div style={{ fontSize: 13, color: DO.muted }}>Yükleniyor…</div>}
          {liste.map((s) => (
            <div
              key={s.no}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid ' + DO.border,
                fontSize: 14,
              }}
            >
              <span>{tamAd(s)}</span>
              <span style={{ color: DO.muted, fontSize: 13 }}>{s.no}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// NOTLAR + EXCEL / PDF
// ══════════════════════════════════════════════════════════════
function NotlarSekmesi({ oda, ac }) {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState('');
  const [arama, setArama] = useState('');
  const [durum, setDurum] = useState('hepsi');
  const [sira, setSira] = useState('soyad');
  const [mesgul, setMesgul] = useState('');

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
    window.addEventListener('realtime:oda_teslimleri', h);
    return () => window.removeEventListener('realtime:oda_teslimleri', h);
  }, [yukle]);

  if (hata) return <Uyari>{hata}</Uyari>;
  if (!veri) return <Bos baslik="Yükleniyor…" />;
  const D = K();
  const { odevler, teslimler } = veri;
  const harita = new Map(teslimler.map((t) => [t.icerikId + '|' + t.ogrenciNo, t]));
  // "Not verilmiş / verilmemiş" süzgeci: bütün ödevlerde notu olan öğrenci notlu sayılır.
  const notBul = (no) =>
    odevler.length && odevler.every((o) => metin((harita.get(o.id + '|' + no) || {}).puan) !== '')
      ? 'var'
      : '';
  const durumBul = (no) => {
    const dd = odevler.map((o) => D.teslimDurumu(o, harita.get(o.id + '|' + no), no));
    if (dd.includes('gec')) return 'gec';
    if (dd.length && dd.every((x) => x === 'teslim' || x === 'notlandi')) return 'teslim';
    return 'atandi';
  };
  const liste = D.ogrencileriSuz(veri.ogrenciler, { arama, durum, sira, durumBul, notBul });
  const cizelge = D.notCizelgesiVerisi({
    oda: veri.oda,
    odevler,
    ogrenciler: liste,
    teslimler,
    kunye: { ...veri.kunye, kurumAd: 'Çankırı Karatekin Üniversitesi' },
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
      .concat(['Teslim', 'Toplam', 'Ortalama (100)']);
    const satirlar = [
      [{ v: sd.kurumAd, stil: S.vurgu }],
      [{ v: [sd.fakulteAd, sd.bolumAd].filter(Boolean).join(' — '), stil: S.vurgu }],
      [{ v: sd.baslik, stil: S.vurgu }],
      [{ v: sd.dersKodAd + (sd.ogretimUyesi ? ' · ' + sd.ogretimUyesi : ''), stil: S.vurgu }],
      [],
      bas,
    ].concat(
      cizelge.rows.map((r) =>
        [r.sira, r.ogrenciNo, r.ad, r.soyad]
          .concat(cizelge.odevler.map((_o, i) => r[D.odevAnahtari(i + 1)]))
          .concat([r.teslimSayisi, r.toplam, r.ortalama])
      )
    );
    return window.xlsxIndir(dosyaGovdesi, {
      sayfaAdi: 'Not Çizelgesi',
      satirlar,
      baslikIndeksi: 5,
      sutunGenislikleri: [6, 14, 16, 16].concat(cizelge.odevler.map(() => 14)).concat([9, 9, 13]),
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
          '<td>' +
          k(r.teslimSayisi) +
          '</td><td><b>' +
          k(r.toplam) +
          '</b></td><td>' +
          k(r.ortalama) +
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
      '<th>Teslim</th><th>Toplam</th><th>Ort. (100)</th></tr></thead><tbody>' +
      govde +
      '</tbody></table>' +
      '<div class="liste">' +
      k(sd.odevListesi) +
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

  return (
    <div data-notlar>
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Ad, soyad ya da numara ara"
          data-notlar-ara
          style={{
            flex: '1 1 220px',
            border: '1px solid ' + DO.border,
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 13,
          }}
        />
        <select
          value={durum}
          onChange={(e) => setDurum(e.target.value)}
          data-notlar-durum
          style={{ border: '1px solid ' + DO.border, borderRadius: 8, padding: 7, fontSize: 13 }}
        >
          <option value="hepsi">Tüm öğrenciler</option>
          <option value="notlu">Bütün notları verilmiş</option>
          <option value="notsuz">Notu eksik olanlar</option>
          <option value="teslim">Bütün ödevleri teslim edenler</option>
          <option value="teslimsiz">Eksik teslimi olanlar</option>
          <option value="gec">Geç teslimi olanlar</option>
        </select>
        <select
          value={sira}
          onChange={(e) => setSira(e.target.value)}
          data-notlar-sira
          style={{ border: '1px solid ' + DO.border, borderRadius: 8, padding: 7, fontSize: 13 }}
        >
          <option value="soyad">Soyadına göre</option>
          <option value="ad">Adına göre</option>
          <option value="no">Numaraya göre</option>
        </select>
        <Dugme tur="ana" onClick={excel} disabled={!!mesgul} data-excel-indir>
          {mesgul === 'excel' ? 'Hazırlanıyor…' : 'Excel indir'}
        </Dugme>
        <Dugme onClick={pdf} disabled={!!mesgul} data-pdf-indir>
          {mesgul === 'pdf' ? 'Hazırlanıyor…' : 'PDF / Yazdır'}
        </Dugme>
      </div>
      {cizelge.uyari && <Uyari tur="bilgi">{cizelge.uyari}</Uyari>}
      <div style={{ ...kart, overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }} data-not-tablosu>
          <thead>
            <tr style={{ background: DO.bg }}>
              <th style={th}>Öğrenci</th>
              {odevler.map((o) => (
                <th key={o.id} style={{ ...th, minWidth: 90 }}>
                  <button
                    type="button"
                    onClick={() => ac(o.id)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: DO.primary,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: 12,
                      padding: 0,
                    }}
                  >
                    {o.baslik}
                  </button>
                  <div style={{ fontSize: 11, color: DO.muted, fontWeight: 400 }}>
                    {o.puan ? o.puan + ' puan' : 'puansız'}
                  </div>
                </th>
              ))}
              <th style={th}>Toplam</th>
              <th style={th}>Ort. (100)</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((s, i) => {
              const r = cizelge.rows[i];
              return (
                <tr key={s.no} data-not-satiri={s.no}>
                  <td style={{ ...td, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600 }}>{tamAd(s)}</div>
                    <div style={{ fontSize: 11, color: DO.muted }}>{s.no}</div>
                  </td>
                  {odevler.map((o) => {
                    const t = harita.get(o.id + '|' + s.no);
                    const d = D.teslimDurumu(o, t, s.no);
                    return (
                      <td key={o.id} style={td}>
                        {t && metin(t.puan) !== '' ? (
                          <span
                            style={{ fontWeight: 600, color: t.geriVerildi ? DO.text : DO.amber }}
                            title={t.geriVerildi ? 'Geri verildi' : 'Taslak (öğrenci görmüyor)'}
                          >
                            {D.puanMetni(t.puan)}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: (D.DURUMLAR[d] || {}).renk }}>
                            {(D.DURUMLAR[d] || {}).etiket}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ ...td, fontWeight: 700 }}>{r.toplam}</td>
                  <td style={td}>{r.ortalama}</td>
                </tr>
              );
            })}
            {!liste.length && (
              <tr>
                <td colSpan={odevler.length + 3} style={{ ...td, color: DO.muted }}>
                  Süzgece uyan öğrenci yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: DO.soft, marginTop: 8 }}>
        Turuncu notlar taslaktır: öğrenci, akademisyen "Geri Ver" diyene kadar görmez. Çıktıya bütün
        notlar yazılır.
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
