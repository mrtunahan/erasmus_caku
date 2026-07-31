// ══════════════════════════════════════════════════════════════
// ÇAKÜ — ÇAP (Çift Anadal) / Yandal Başvuru Modülü
//
// Ders Muafiyet modülüyle AYNI desen: tek modül, iki bağımsız başvuru türü
// (sekme): 'cap' ve 'yandal'. Her tür kendi kayıtlarını, kendi eklerini ve
// kendi dilekçe şablonunu (Şablonlar → ÇAP/Yandal) kullanır.
//
// Öğrenci tarafı : Yeni Başvuru (form + ek yükleme) · Başvurularım
// Akademisyen    : Gelen Başvurular (bilgi + ekler + dilekçe çıktısı + karar)
//
// Şablon alanları (CAPYANDAL_STATIC, shared-components) dilekçedeki yer
// tutucularla birebirdir. SİSTEMDEN gelenler otomatik dolar (ad-soyad, no,
// fakülte, bölüm, iletişim); gelmeyenler öğrenciden istenir.
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const CY = {
  navy: '#1B2A4A',
  accent: '#0F766E',
  accentPale: '#CCFBF1',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  green: '#059669',
  greenLight: '#D1FAE5',
  amber: '#B45309',
  amberLight: '#FEF3C7',
  red: '#DC2626',
  redLight: '#FEE2E2',
  bg: '#F8F9FB',
};

// Başvuru türleri — modülü iki bağımsız alana böler (ayrı kayıt, ayrı ek, ayrı çıktı)
const CY_TURLER = [
  {
    id: 'cap',
    label: 'ÇAP (Çift Anadal Programı) Başvurusu',
    kisa: 'ÇAP',
    aciklama: 'Çift anadal programı başvuru dilekçesi ve ekleri',
    color: '#00236f',
    bg: '#eef1ff',
    ekler: [
      { id: 'transkript', title: 'Not Döküm Belgesi (Transkript) — Aslı', required: true },
      {
        id: 'ust20',
        title: 'Başarı sıralamasına göre sınıfın üst %20’sinde olduğunu gösterir belge',
        required: true,
      },
    ],
  },
  {
    id: 'yandal',
    label: 'Yandal Başvurusu',
    kisa: 'Yandal',
    aciklama: 'Yandal başvuru dilekçesi ve ekleri',
    color: '#6d28d9',
    bg: '#f3e8ff',
    ekler: [{ id: 'transkript', title: 'Not Döküm Belgesi (Transkript) — Aslı', required: true }],
  },
];

const CY_DURUMLAR = {
  pending: { label: 'Beklemede', color: CY.amber, bg: CY.amberLight },
  approved: { label: 'Onaylandı', color: CY.green, bg: CY.greenLight },
  rejected: { label: 'Reddedildi', color: CY.red, bg: CY.redLight },
};

// Dosya bağlantısı: PDF önizlenir, diğerleri indirilir.
const cyFileHref = (u) => {
  const rel = String(u || '')
    .replace('/api/files/download/', '')
    .replace('/api/files/view/', '');
  if (!rel) return '#';
  return /\.pdf$/i.test(rel)
    ? '/api/files/view/' + rel
    : '/api/files/download/' + rel + '?download=true';
};

async function cyUploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const token = localStorage.getItem('caku_auth_token');
  const res = await fetch('/api/files/upload?folder=capyandal_belgeler', {
    method: 'POST',
    headers: token ? { Authorization: 'Bearer ' + token } : {},
    credentials: 'include',
    body: fd,
  });
  if (!res.ok) throw new Error('Dosya yüklenemedi (HTTP ' + res.status + ')');
  const data = await res.json();
  if (!data.downloadURL) throw new Error('Dosya URL alınamadı');
  return data.downloadURL;
}

// ── Ortak küçük stiller ──
const cyInput = {
  display: 'block',
  width: '100%',
  marginTop: 4,
  padding: '9px 11px',
  borderRadius: 8,
  border: '1px solid ' + CY.border,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: "'Inter', sans-serif",
  color: CY.text,
};
const cyLabel = { fontSize: 12, color: CY.textMuted, fontWeight: 600, display: 'block' };
const cyCard = {
  background: 'white',
  border: '1px solid ' + CY.border,
  borderRadius: 12,
  padding: 18,
};
const cyBtn = (primary) => ({
  padding: '9px 18px',
  borderRadius: 8,
  border: primary ? 'none' : '1px solid ' + CY.border,
  background: primary ? CY.navy : 'white',
  color: primary ? 'white' : CY.textMuted,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
});
const cyPill = (color, bg) => ({
  padding: '2px 10px',
  borderRadius: 12,
  background: bg,
  color,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap',
});

// ══════════════════════════════════════════════════════════════
// Öğrenci — Yeni Başvuru formu
// ══════════════════════════════════════════════════════════════
function CyBasvuruFormu({ tur, currentUser, departmentInfo, onSaved }) {
  const sysAdSoyad = currentUser?.name || '';
  const sysOgrNo = currentUser?.studentNumber || currentUser?.identifier || '';
  const sysFakulte = window.TENANT?.facultyName || '';
  const sysBolum = departmentInfo?.name || currentUser?.departmentName || '';

  const [form, setForm] = useState({
    uyruk: 'T.C.',
    dogumTarihi: '',
    telCep: '',
    telEv: '',
    eposta: '',
    adres: '',
    bitirdigiSinif: '',
    genelNotOrt: '',
    okudugiDonem: '',
    tercih1Fakulte: '',
    tercih1: '',
    tercih2Fakulte: '',
    tercih2: '',
  });
  const [ekler, setEkler] = useState({}); // {ekId: {url, name}}
  const [uploading, setUploading] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', kind: '' });
  const [depts, setDepts] = useState([]);
  const [faculties, setFaculties] = useState([]);

  // İletişim bilgilerini Benim Sayfam (student_profiles) kaydından ön-doldur
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (sysOgrNo) {
          const pr = await window.apiReadDoc('student_profiles', String(sysOgrNo));
          const d = (pr && pr.data) || {};
          if (alive && (d.phone || d.email || d.address)) {
            setForm((f) => ({
              ...f,
              telCep: f.telCep || d.phone || '',
              eposta: f.eposta || d.email || '',
              adres: f.adres || d.address || '',
            }));
          }
        }
      } catch (_e) {
        /* profil yoksa boş kalır */
      }
      try {
        // ÇAP/Yandal başka FAKÜLTEDE de yapılabilir → tüm fakülte + bölümler.
        const [facList, deptList] = await Promise.all([
          window.apiRead('faculties'),
          window.apiRead('departments'),
        ]);
        if (!alive) return;
        const norm = (s) =>
          String(s || '')
            .trim()
            .replace(/İ/g, 'i')
            .replace(/I/g, 'ı')
            .toLocaleLowerCase('tr-TR')
            .replace(/\s+/g, ' ');
        // Mükerrer temizliği (aynı ad, farklı id kayıtları olabiliyor)
        const dedupe = (arr) => {
          const seen = new Set();
          const out = [];
          (arr || []).forEach((it) => {
            const nm = String(it.name || '').trim();
            if (!nm) return;
            const k = norm(nm);
            if (seen.has(k)) return;
            seen.add(k);
            out.push(it);
          });
          return out.sort((a, b) => String(a.name).localeCompare(String(b.name), 'tr'));
        };
        setFaculties(dedupe(facList));
        setDepts(dedupe(deptList));
      } catch (_e) {
        /* liste alınamadı — alanlar boş kalır */
      }
    })();
    return () => {
      alive = false;
    };
  }, [sysOgrNo]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pickFile = async (ekId, e) => {
    const f = (e.target.files && e.target.files[0]) || null;
    e.target.value = '';
    if (!f) return;
    setUploading(ekId);
    setMsg({ text: '', kind: '' });
    try {
      const url = await cyUploadFile(f);
      setEkler((prev) => ({ ...prev, [ekId]: { url, name: f.name } }));
    } catch (e2) {
      setMsg({ text: e2.message, kind: 'error' });
    } finally {
      setUploading('');
    }
  };

  const submit = async () => {
    // Zorunlu alan kontrolü
    const zorunlu = [
      ['uyruk', 'Uyruk'],
      ['dogumTarihi', 'Doğum tarihi'],
      ['telCep', 'GSM telefonu'],
      ['eposta', 'E-posta'],
      ['adres', 'Adres'],
      ['bitirdigiSinif', 'Bitirdiği sınıf'],
      ['genelNotOrt', 'Genel not ortalaması'],
      ['okudugiDonem', 'Okuduğu dönem sayısı'],
      ['tercih1Fakulte', '1. tercih fakültesi'],
      ['tercih1', '1. tercih bölümü'],
    ];
    for (const [k, adi] of zorunlu) {
      if (!String(form[k] || '').trim()) {
        setMsg({ text: adi + ' alanı zorunludur.', kind: 'error' });
        return;
      }
    }
    for (const ek of tur.ekler) {
      if (ek.required && !ekler[ek.id]) {
        setMsg({ text: '“' + ek.title + '” yüklenmelidir.', kind: 'error' });
        return;
      }
    }
    setSaving(true);
    try {
      await window.DBWrite.add('cap_yandal_basvurular', {
        turu: tur.id,
        status: 'pending',
        ogrenciAdSoyad: sysAdSoyad,
        ogrenciNo: sysOgrNo,
        fakulte: sysFakulte,
        bolum: sysBolum,
        departmentId: currentUser?.departmentId || '',
        facultyId: currentUser?.facultyId || '',
        ...form,
        ekler,
        createdBy: sysOgrNo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setMsg({ text: 'Başvurunuz gönderildi ✓', kind: 'ok' });
      setEkler({});
      setForm((f) => ({ ...f, tercih1Fakulte: '', tercih1: '', tercih2Fakulte: '', tercih2: '' }));
      if (onSaved) await onSaved();
    } catch (e) {
      setMsg({ text: 'Gönderilemedi: ' + e.message, kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Fakülte adından id çöz (bölüm listesini o fakülteye göre süzmek için)
  const facIdByName = (nm) => {
    const f = faculties.find((x) => String(x.name || '') === String(nm || ''));
    return f ? f.id || f._docId || '' : '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sistemden gelen bilgiler */}
      <div style={cyCard}>
        <div style={{ fontSize: 14, fontWeight: 700, color: CY.navy, marginBottom: 12 }}>
          Sistemden Gelen Bilgiler
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
            gap: 12,
          }}
        >
          {[
            ['Adı ve Soyadı', sysAdSoyad],
            ['Fakülte Numarası', sysOgrNo],
            ['Devam Ettiği Fakülte', sysFakulte],
            ['Devam Ettiği Bölüm', sysBolum],
          ].map(([k, v]) => (
            <div key={k}>
              <span style={cyLabel}>{k}</span>
              <div
                style={{
                  marginTop: 4,
                  padding: '9px 11px',
                  borderRadius: 8,
                  background: CY.bg,
                  border: '1px solid ' + CY.border,
                  fontSize: 13,
                  color: v ? CY.text : CY.textMuted,
                }}
              >
                {v || '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Öğrenciden istenen bilgiler */}
      <div style={cyCard}>
        <div style={{ fontSize: 14, fontWeight: 700, color: CY.navy, marginBottom: 4 }}>
          Kimlik ve İletişim Bilgileri
        </div>
        <div style={{ fontSize: 11.5, color: CY.textMuted, marginBottom: 12 }}>
          Bu alanlar sistemde bulunmadığından sizin doldurmanız gerekir.
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
            gap: 12,
          }}
        >
          <label style={cyLabel}>
            Uyruğu *
            <input
              value={form.uyruk}
              onChange={(e) => set('uyruk', e.target.value)}
              style={cyInput}
            />
          </label>
          <label style={cyLabel}>
            Doğum Tarihi *
            <input
              type="date"
              value={form.dogumTarihi}
              onChange={(e) => set('dogumTarihi', e.target.value)}
              style={cyInput}
            />
          </label>
          <label style={cyLabel}>
            Telefon (GSM) *
            <input
              value={form.telCep}
              onChange={(e) => set('telCep', e.target.value)}
              placeholder="05xx xxx xx xx"
              style={cyInput}
            />
          </label>
          <label style={cyLabel}>
            Telefon (Ev)
            <input
              value={form.telEv}
              onChange={(e) => set('telEv', e.target.value)}
              style={cyInput}
            />
          </label>
          <label style={cyLabel}>
            E-posta *
            <input
              type="email"
              value={form.eposta}
              onChange={(e) => set('eposta', e.target.value)}
              style={cyInput}
            />
          </label>
        </div>
        <label style={{ ...cyLabel, marginTop: 12 }}>
          Adres *
          <textarea
            value={form.adres}
            onChange={(e) => set('adres', e.target.value)}
            rows={2}
            style={{ ...cyInput, resize: 'vertical' }}
          />
        </label>
      </div>

      <div style={cyCard}>
        <div style={{ fontSize: 14, fontWeight: 700, color: CY.navy, marginBottom: 12 }}>
          Öğrencilik Bilgileri
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
            gap: 12,
          }}
        >
          <label style={cyLabel}>
            Bitirdiği Sınıf *
            <input
              value={form.bitirdigiSinif}
              onChange={(e) => set('bitirdigiSinif', e.target.value)}
              placeholder="örn. 2"
              style={cyInput}
            />
          </label>
          <label style={cyLabel}>
            Genel Not Ortalaması (AGNO) *
            <input
              value={form.genelNotOrt}
              onChange={(e) => set('genelNotOrt', e.target.value)}
              placeholder="örn. 3.12"
              style={cyInput}
            />
          </label>
          <label style={cyLabel}>
            Okuduğu Dönem Sayısı (hazırlık hariç) *
            <input
              value={form.okudugiDonem}
              onChange={(e) => set('okudugiDonem', e.target.value)}
              placeholder="örn. 4"
              style={cyInput}
            />
          </label>
        </div>
      </div>

      <div style={cyCard}>
        <div style={{ fontSize: 14, fontWeight: 700, color: CY.navy, marginBottom: 4 }}>
          {tur.kisa} Yapmak İstediği Bölüm Tercihleri
        </div>
        <div style={{ fontSize: 11.5, color: CY.textMuted, marginBottom: 12 }}>
          Sıra önemlidir. 1. tercih zorunludur. İstediğiniz fakülte ve bölümü seçebilirsiniz.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2].map((n) => {
            const fk = 'tercih' + n + 'Fakulte';
            const bk = 'tercih' + n;
            const selFacId = facIdByName(form[fk]);
            const opts = form[fk]
              ? depts.filter((d) => String(d.facultyId || '') === String(selFacId))
              : depts;
            return (
              <div
                key={n}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
                  gap: 12,
                }}
              >
                <label style={cyLabel}>
                  {n}. Tercih — Fakülte {n === 1 ? '*' : ''}
                  <select
                    value={form[fk]}
                    onChange={(e) => {
                      set(fk, e.target.value);
                      set(bk, ''); // fakülte değişince bölüm sıfırlanır
                    }}
                    style={cyInput}
                  >
                    <option value="">Fakülte seçiniz…</option>
                    {faculties.map((f) => (
                      <option key={f.id || f.name} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={cyLabel}>
                  {n}. Tercih — Bölüm {n === 1 ? '*' : ''}
                  <select
                    value={form[bk]}
                    onChange={(e) => set(bk, e.target.value)}
                    style={cyInput}
                  >
                    <option value="">{form[fk] ? 'Bölüm seçiniz…' : 'Önce fakülte seçiniz'}</option>
                    {opts.map((d) => (
                      <option key={d.id || d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ekler */}
      <div style={cyCard}>
        <div style={{ fontSize: 14, fontWeight: 700, color: CY.navy, marginBottom: 12 }}>Ekler</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tur.ekler.map((ek, i) => {
            const cur = ekler[ek.id];
            return (
              <div
                key={ek.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: '10px 12px',
                  border: '1px dashed ' + (cur ? CY.accent : CY.border),
                  borderRadius: 10,
                  background: cur ? CY.accentPale + '55' : 'white',
                }}
              >
                <span style={{ flex: '1 1 260px', fontSize: 12.5, color: CY.text }}>
                  <b>{i + 1}.</b> {ek.title}
                  {ek.required && <span style={{ color: CY.red }}> *</span>}
                </span>
                {cur && (
                  <a
                    href={cyFileHref(cur.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: CY.accent, fontWeight: 600 }}
                  >
                    📎 {cur.name}
                  </a>
                )}
                <label
                  style={{ ...cyBtn(false), cursor: uploading === ek.id ? 'wait' : 'pointer' }}
                >
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => pickFile(ek.id, e)}
                  />
                  {uploading === ek.id ? 'Yükleniyor…' : cur ? 'Değiştir' : 'Dosya Yükle'}
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {msg.text && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 13,
            background: msg.kind === 'ok' ? CY.greenLight : CY.redLight,
            color: msg.kind === 'ok' ? CY.green : CY.red,
            fontWeight: 600,
          }}
        >
          {msg.text}
        </div>
      )}

      <div>
        <button type="button" onClick={submit} disabled={saving} style={cyBtn(true)}>
          {saving ? 'Gönderiliyor…' : 'Başvuruyu Gönder'}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Başvuru detay kartı (öğrenci + akademisyen ortak)
// ══════════════════════════════════════════════════════════════
function CyBasvuruKarti({ rec, tur, isStaff, onDecision, onDilekce, onUploadSigned, busyId }) {
  const [open, setOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const st = CY_DURUMLAR[rec.status || 'pending'] || CY_DURUMLAR.pending;
  const satir = (k, v) =>
    v ? (
      <div key={k} style={{ fontSize: 12.5 }}>
        <span style={{ color: CY.textMuted }}>{k}: </span>
        <b style={{ color: CY.text }}>{v}</b>
      </div>
    ) : null;

  return (
    <div style={{ ...cyCard, padding: 0, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          cursor: 'pointer',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: CY.navy }}>
            {rec.ogrenciAdSoyad || '—'}
            {rec.ogrenciNo ? '  ·  ' + rec.ogrenciNo : ''}
          </div>
          <div style={{ fontSize: 11.5, color: CY.textMuted, marginTop: 3 }}>
            {[rec.bolum, rec.tercih1 && '1. tercih: ' + rec.tercih1].filter(Boolean).join('  ·  ')}
          </div>
        </div>
        <span style={cyPill(st.color, st.bg)}>{st.label}</span>
        <span style={{ color: CY.textMuted, fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid ' + CY.border }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
              gap: 8,
              margin: '14px 0',
            }}
          >
            {satir('Uyruk', rec.uyruk)}
            {satir('Doğum Tarihi', rec.dogumTarihi)}
            {satir('GSM', rec.telCep)}
            {satir('Ev Tel.', rec.telEv)}
            {satir('E-posta', rec.eposta)}
            {satir('Fakülte', rec.fakulte)}
            {satir('Bölüm', rec.bolum)}
            {satir('Bitirdiği Sınıf', rec.bitirdigiSinif)}
            {satir('AGNO', rec.genelNotOrt)}
            {satir('Okuduğu Dönem', rec.okudugiDonem)}
            {satir(
              '1. Tercih',
              [rec.tercih1, rec.tercih1Fakulte && '(' + rec.tercih1Fakulte + ')']
                .filter(Boolean)
                .join(' ')
            )}
            {satir(
              '2. Tercih',
              [rec.tercih2, rec.tercih2Fakulte && '(' + rec.tercih2Fakulte + ')']
                .filter(Boolean)
                .join(' ')
            )}
          </div>
          {rec.adres && (
            <div style={{ fontSize: 12.5, marginBottom: 12 }}>
              <span style={{ color: CY.textMuted }}>Adres: </span>
              <b style={{ color: CY.text }}>{rec.adres}</b>
            </div>
          )}

          {/* Ekler */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {(tur?.ekler || []).map((ek) => {
              const f = (rec.ekler || {})[ek.id];
              return f ? (
                <a
                  key={ek.id}
                  href={cyFileHref(f.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    color: CY.accent,
                    fontWeight: 600,
                    textDecoration: 'none',
                    border: '1px solid ' + CY.accent + '55',
                    background: CY.accentPale,
                    borderRadius: 14,
                    padding: '4px 11px',
                  }}
                >
                  📎 {ek.title}
                </a>
              ) : (
                <span key={ek.id} style={cyPill(CY.textMuted, CY.bg)}>
                  ✗ {ek.title} (yok)
                </span>
              );
            })}
          </div>

          {/* ── ÖĞRENCİ: dilekçe akışı (indir → imzala → yükle → sekretere ver) ── */}
          {!isStaff && (
            <div
              style={{
                border: '1px solid ' + CY.border,
                borderRadius: 12,
                overflow: 'hidden',
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  background: CY.bg,
                  borderBottom: '1px solid ' + CY.border,
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: CY.navy,
                }}
              >
                Dilekçe İşlemleri
              </div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Bilgi kartı — süreç anlatımı */}
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '10px 12px',
                    background: CY.amberLight,
                    border: '1px solid ' + CY.amber + '44',
                    borderRadius: 10,
                    fontSize: 12,
                    color: '#7c4a03',
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1.2 }}>ℹ️</span>
                  <span>
                    <b>Nasıl ilerlemeliyim?</b>
                    <br />
                    <b>1.</b> Başvurunuz <b>akademisyen tarafından onaylandıktan sonra</b> dilekçe
                    indirme butonu aktif olur. &nbsp;<b>2.</b> Dilekçenizi indirin. &nbsp;<b>3.</b>{' '}
                    Çıktısını alıp <b>imzalayın</b>. &nbsp;<b>4.</b> İmzalı dilekçeyi aşağıdan
                    sisteme yükleyin. &nbsp;<b>5.</b> İmzalı dilekçenin aslını{' '}
                    <b>
                      ve dilekçede belirtilen ekleri (
                      {(tur?.ekler || []).map((e) => e.title).join(', ') || 'gerekli belgeler'})
                    </b>{' '}
                    birlikte <b>bölüm sekreterine elden teslim edin</b>.
                  </span>
                </div>

                {/* 1) Oluşturulan dilekçe */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    padding: '10px 12px',
                    border: '1px solid ' + CY.border,
                    borderRadius: 10,
                  }}
                >
                  <span style={{ flex: '1 1 220px', fontSize: 12.5, color: CY.text }}>
                    <b>1.</b> Başvuru dilekçeniz
                  </span>
                  {/* İndirme YALNIZCA akademisyen onayından sonra açılır. */}
                  {rec.status !== 'approved' ? (
                    <span
                      style={{
                        ...cyBtn(false),
                        cursor: 'not-allowed',
                        color: CY.textMuted,
                        borderStyle: 'dashed',
                      }}
                      title="Başvurunuz onaylandıktan sonra indirebilirsiniz"
                    >
                      🔒{' '}
                      {rec.status === 'rejected'
                        ? 'Başvuru reddedildi'
                        : 'Onay bekleniyor — indirme kapalı'}
                    </span>
                  ) : rec.dilekceUrl ? (
                    <a
                      href={cyFileHref(rec.dilekceUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...cyBtn(false),
                        color: CY.accent,
                        borderColor: CY.accent,
                        textDecoration: 'none',
                        display: 'inline-block',
                      }}
                    >
                      ⬇️ Dilekçeyi İndir
                    </a>
                  ) : (
                    <span style={cyPill(CY.amber, CY.amberLight)}>
                      Onaylandı — dilekçe hazırlanıyor
                    </span>
                  )}
                </div>

                {/* 2) İmzalı dilekçe yükleme */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    padding: '10px 12px',
                    border: '1px dashed ' + (rec.imzaliDilekceUrl ? CY.green : CY.border),
                    borderRadius: 10,
                    background: rec.imzaliDilekceUrl ? CY.greenLight + '66' : 'white',
                  }}
                >
                  <span style={{ flex: '1 1 220px', fontSize: 12.5, color: CY.text }}>
                    <b>2.</b> İmzalı dilekçe
                    {rec.imzaliDilekceUrl ? (
                      <span style={{ ...cyPill(CY.green, CY.greenLight), marginLeft: 8 }}>
                        ✓ Yüklendi
                      </span>
                    ) : (
                      <span style={{ ...cyPill(CY.amber, CY.amberLight), marginLeft: 8 }}>
                        Bekleniyor
                      </span>
                    )}
                  </span>
                  {rec.imzaliDilekceUrl && (
                    <a
                      href={cyFileHref(rec.imzaliDilekceUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: CY.accent, fontWeight: 600 }}
                    >
                      📎 {rec.imzaliDilekceAd || 'Görüntüle'}
                    </a>
                  )}
                  {/* Yükleme de onaydan sonra açılır (indiremediğiniz belgeyi imzalayamazsınız) */}
                  {rec.status !== 'approved' ? (
                    <span
                      style={{
                        ...cyBtn(false),
                        cursor: 'not-allowed',
                        color: CY.textMuted,
                        borderStyle: 'dashed',
                      }}
                      title="Önce başvurunuzun onaylanması gerekir"
                    >
                      🔒 Onay sonrası yüklenebilir
                    </span>
                  ) : (
                    <label
                      style={{
                        ...cyBtn(false),
                        cursor: signing ? 'wait' : 'pointer',
                        color: CY.navy,
                      }}
                    >
                      <input
                        type="file"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const f = (e.target.files && e.target.files[0]) || null;
                          e.target.value = '';
                          if (!f) return;
                          setSigning(true);
                          try {
                            await onUploadSigned(rec, f);
                          } finally {
                            setSigning(false);
                          }
                        }}
                      />
                      {signing
                        ? 'Yükleniyor…'
                        : rec.imzaliDilekceUrl
                          ? 'Değiştir'
                          : '⬆️ İmzalı Dilekçe Yükle'}
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── AKADEMİSYEN: dilekçe üret + öğrencinin imzalı dilekçesi + karar ── */}
          {isStaff && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => onDilekce(rec)}
                disabled={busyId === rec.id}
                style={{ ...cyBtn(false), color: CY.accent, borderColor: CY.accent }}
              >
                {busyId === rec.id ? 'Üretiliyor…' : '📄 Dilekçe Oluştur'}
              </button>

              {/* Öğrencinin yüklediği İMZALI dilekçe */}
              {rec.imzaliDilekceUrl ? (
                <a
                  href={cyFileHref(rec.imzaliDilekceUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={rec.imzaliDilekceAd || ''}
                  style={{
                    ...cyBtn(false),
                    color: CY.green,
                    borderColor: CY.green,
                    background: CY.greenLight + '66',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  ✒️ İmzalı Dilekçe (indir)
                </a>
              ) : (
                <span
                  style={{
                    ...cyBtn(false),
                    cursor: 'default',
                    color: CY.textMuted,
                    borderStyle: 'dashed',
                  }}
                >
                  ✒️ İmzalı dilekçe yüklenmedi
                </span>
              )}

              {rec.dilekceUrl &&
                window.BelgeGonderButonu &&
                React.createElement(window.BelgeGonderButonu, {
                  belge: {
                    module: 'capyandal',
                    docType: rec.turu || 'cap',
                    sourceId: String(rec.id),
                    title:
                      (rec.ogrenciAdSoyad || '') + (rec.ogrenciNo ? '  ·  ' + rec.ogrenciNo : ''),
                    subtitle: (rec.turu === 'yandal' ? 'Yandal' : 'ÇAP') + ' başvuru dilekçesi',
                    url: rec.dilekceUrl,
                    ogrenciNo: rec.ogrenciNo || '',
                    departmentId: rec.departmentId || '',
                    facultyId: rec.facultyId || '',
                  },
                })}

              {(rec.status || 'pending') === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => onDecision(rec, 'approved')}
                    style={{ ...cyBtn(false), color: CY.green, borderColor: CY.green }}
                  >
                    ✓ Onayla
                  </button>
                  <button
                    type="button"
                    onClick={() => onDecision(rec, 'rejected')}
                    style={{ ...cyBtn(false), color: CY.red, borderColor: CY.red }}
                  >
                    ✕ Reddet
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Ana uygulama
// ══════════════════════════════════════════════════════════════
function CapYandalApp({ currentUser, activeDepartment, departmentInfo }) {
  const isStudent = currentUser?.role === 'student';
  const [turId, setTurId] = useState('cap');
  const [activeTab, setActiveTab] = useState(isStudent ? 'yeni' : 'gelen');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [msg, setMsg] = useState('');

  const tur = CY_TURLER.find((t) => t.id === turId) || CY_TURLER[0];
  const myNo = currentUser?.studentNumber || currentUser?.identifier || '';

  const load = useCallback(async () => {
    try {
      const read = window.apiRead.fresh || window.apiRead;
      const list = await read('cap_yandal_basvurular');
      let mine = list || [];
      if (isStudent) {
        mine = mine.filter((r) => String(r.ogrenciNo || r.createdBy || '') === String(myNo));
      } else if (activeDepartment) {
        // Akademisyen: kendi bölümünün başvuruları (bölüm bilgisi yoksa göster)
        mine = mine.filter(
          (r) => !r.departmentId || String(r.departmentId) === String(activeDepartment)
        );
      }
      setRecords(
        mine.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      );
    } catch (_e) {
      setRecords([]);
    }
  }, [isStudent, myNo, activeDepartment]);

  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const turRecords = useMemo(
    () => records.filter((r) => (r.turu || 'cap') === turId),
    [records, turId]
  );
  const pendingCount = turRecords.filter((r) => (r.status || 'pending') === 'pending').length;

  const setDecision = async (rec, status) => {
    try {
      await window.DBWrite.update('cap_yandal_basvurular', String(rec.id), {
        status,
        decidedBy: currentUser?.name || currentUser?.identifier || '',
        decidedAt: new Date().toISOString(),
      });
      // Onaylandıysa otomatik yönlendirme kuralını uygula (varsa)
      if (status === 'approved' && rec.dilekceUrl && window.belgeOtoYonlendir) {
        await window.belgeOtoYonlendir({
          module: 'capyandal',
          docType: rec.turu || 'cap',
          sourceId: String(rec.id),
          title: (rec.ogrenciAdSoyad || '') + (rec.ogrenciNo ? '  ·  ' + rec.ogrenciNo : ''),
          subtitle: (rec.turu === 'yandal' ? 'Yandal' : 'ÇAP') + ' başvuru dilekçesi',
          url: rec.dilekceUrl,
          ogrenciNo: rec.ogrenciNo || '',
          departmentId: rec.departmentId || '',
          facultyId: rec.facultyId || '',
        });
      }
      await load();
      setMsg(status === 'approved' ? 'Onaylandı ✓' : 'Reddedildi');
      setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      alert('Güncellenemedi: ' + e.message);
    }
  };

  // Öğrenci imzalı dilekçesini yükler (indir → imzala → yükle → sekretere ver)
  const uploadSigned = async (rec, file) => {
    try {
      const url = await cyUploadFile(file);
      await window.DBWrite.update('cap_yandal_basvurular', String(rec.id), {
        imzaliDilekceUrl: url,
        imzaliDilekceAd: file.name,
        imzaliDilekceAt: new Date().toISOString(),
      });
      await load();
      setMsg('İmzalı dilekçe yüklendi ✓');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      alert('Yüklenemedi: ' + e.message);
    }
  };

  // Dilekçe üretimi — Şablonlar → ÇAP/Yandal türüne yüklü .docx doldurulur.
  const makeDilekce = async (rec) => {
    setBusyId(rec.id);
    try {
      const staticData = {
        ogrenciAdSoyad: rec.ogrenciAdSoyad || '',
        ogrenciNo: rec.ogrenciNo || '',
        uyruk: rec.uyruk || '',
        dogumTarihi: rec.dogumTarihi || '',
        telCep: rec.telCep || '',
        telEv: rec.telEv || '',
        eposta: rec.eposta || '',
        adres: rec.adres || '',
        fakulte: rec.fakulte || '',
        bolum: rec.bolum || '',
        bitirdigiSinif: rec.bitirdigiSinif || '',
        genelNotOrt: rec.genelNotOrt || '',
        okudugiDonem: rec.okudugiDonem || '',
        tercih1: rec.tercih1 || '',
        tercih2: rec.tercih2 || '',
        tarih: new Date().toLocaleDateString('tr-TR'),
      };
      const fname =
        (rec.turu === 'yandal' ? 'Yandal' : 'CAP') +
        '_Dilekce_' +
        String(rec.ogrenciNo || '').replace(/\W/g, '') +
        '.docx';
      const res = await window.TemplateEngine.produceFromTemplate({
        module: 'capyandal',
        docType: rec.turu || 'cap',
        departmentId: rec.departmentId || '',
        staticData,
        rows: [],
        filename: fname,
      });
      if (res.ok) {
        // Snapshot: üretilen dilekçeyi sakla ki öğrenci de indirebilsin
        try {
          if (res.blob && window.uploadGeneratedDoc) {
            const url = await window.uploadGeneratedDoc(res.blob, fname, 'capyandal_belgeler');
            if (url) {
              await window.DBWrite.update('cap_yandal_basvurular', String(rec.id), {
                dilekceUrl: url,
                dilekceAt: new Date().toISOString(),
              });
              await load();
            }
          }
        } catch (_e) {
          /* snapshot başarısız olsa da indirme yapıldı */
        }
        return;
      }
      const msgs = {
        'no-template':
          'Bu tür için dilekçe şablonu bulunamadı.\nŞablonlar modülünden "ÇAP / Yandal" modülüne, ilgili belge türüne bir .docx şablonu yükleyip alanları eşleyin.',
        'no-mapping': 'Şablonun alan eşlemesi yapılmamış (Şablonlar → 🧩 Alanlar).',
        'not-docx': 'Atanan şablon .docx değil.',
        'invalid-output': 'Şablondan geçerli belge üretilemedi.',
      };
      alert(msgs[res.reason] || 'Dilekçe üretilemedi: ' + (res.message || res.reason));
    } catch (e) {
      alert('Dilekçe üretilemedi: ' + e.message);
    } finally {
      setBusyId('');
    }
  };

  const tabs = isStudent
    ? [
        { id: 'yeni', label: 'Yeni Başvuru' },
        { id: 'gecmis', label: 'Başvurularım' },
      ]
    : [
        { id: 'gelen', label: 'Gelen Başvurular' },
        { id: 'gecmis', label: 'Tüm Kayıtlar' },
      ];

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: CY.textMuted }}>Yükleniyor…</div>;
  }

  const listeGoster = (list) =>
    list.length === 0 ? (
      <div
        style={{
          ...cyCard,
          borderStyle: 'dashed',
          padding: 44,
          textAlign: 'center',
          color: CY.textMuted,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>🗂️</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: CY.navy, marginBottom: 4 }}>
          Kayıt yok
        </div>
        <div style={{ fontSize: 12 }}>
          {isStudent
            ? '“' +
              tur.kisa +
              '” için henüz başvurunuz yok. “Yeni Başvuru” sekmesinden oluşturabilirsiniz.'
            : 'Bu türde henüz başvuru bulunmuyor.'}
        </div>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((r) => (
          <CyBasvuruKarti
            key={r.id}
            rec={r}
            tur={CY_TURLER.find((t) => t.id === (r.turu || 'cap'))}
            isStaff={!isStudent}
            onDecision={setDecision}
            onDilekce={makeDilekce}
            onUploadSigned={uploadSigned}
            busyId={busyId}
          />
        ))}
      </div>
    );

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        color: CY.text,
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 4px 40px',
      }}
    >
      {window.CakuBanner &&
        React.createElement(window.CakuBanner, {
          title: 'ÇAP / Yandal Başvuruları',
          subtitle: tur.aciklama,
        })}

      {/* Başvuru türü seçici — muafiyet modülüyle aynı desen */}
      <div style={{ display: 'flex', gap: 10, margin: '18px 0 20px', flexWrap: 'wrap' }}>
        {CY_TURLER.map((t) => {
          const sel = turId === t.id;
          const cnt = records.filter((r) => (r.turu || 'cap') === t.id).length;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTurId(t.id);
                setActiveTab(isStudent ? 'yeni' : 'gelen');
              }}
              style={{
                flex: '1 1 300px',
                textAlign: 'left',
                padding: '16px 18px',
                borderRadius: 12,
                cursor: 'pointer',
                border: (sel ? '2px solid ' : '1px solid ') + (sel ? t.color : CY.border),
                borderLeft: '3px solid ' + (sel ? t.color : CY.border),
                background: sel ? t.bg : 'white',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: 15.5,
                  fontWeight: 700,
                  color: sel ? t.color : CY.text,
                  marginBottom: 5,
                }}
              >
                {t.label}
              </span>
              <span style={{ fontSize: 11.5, color: CY.textMuted }}>
                {t.aciklama}
                {cnt ? '  ·  ' + cnt + ' kayıt' : ''}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sekmeler */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid ' + CY.border,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        {tabs.map((t) => {
          const on = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                borderBottom: '2px solid ' + (on ? CY.navy : 'transparent'),
                color: on ? CY.navy : CY.textMuted,
                fontSize: 13.5,
                fontWeight: on ? 700 : 600,
                cursor: 'pointer',
              }}
            >
              {t.label}
              {t.id === 'gelen' && pendingCount > 0 && (
                <span style={{ ...cyPill(CY.amber, CY.amberLight), marginLeft: 8 }}>
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
        {msg && (
          <span
            style={{
              alignSelf: 'center',
              marginLeft: 'auto',
              fontSize: 12,
              color: CY.green,
              fontWeight: 600,
            }}
          >
            {msg}
          </span>
        )}
      </div>

      {/* İçerik */}
      {activeTab === 'yeni' && isStudent && (
        <CyBasvuruFormu
          key={turId}
          tur={tur}
          currentUser={currentUser}
          departmentInfo={departmentInfo}
          onSaved={load}
        />
      )}
      {activeTab === 'gelen' && !isStudent && listeGoster(turRecords)}
      {activeTab === 'gecmis' && listeGoster(turRecords)}
    </div>
  );
}

window.CapYandalApp = CapYandalApp;
