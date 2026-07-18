// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Akreditasyon Modülü (ilk hedef: MÜDEK)
//
// Kullanıcı: FAKÜLTE YETKİLİSİ (isFacultyManager) — kendi fakültesindeki tüm
// programların (bölümlerin) akreditasyon hazırlığını tek yerden yürütür.
//
// MİMARİ İLKELER (ticarileşmeye hazırlık):
//   1. Ölçütler VERİ'dir: çerçeve 'akreditasyon_frameworks' koleksiyonundan
//      okunur (seed: server/seed-mudek-framework.js). Kodda ölçüt metni yok.
//   2. KanıtSağlayıcı adaptörü: modül sistem verisine DOĞRUDAN değil, yalnız
//      bu adaptör üzerinden bağlanır. Modül tek başına satıldığında aynı
//      sorgular Excel import'u / başka sistem kaynağıyla cevaplanabilir.
//   3. Kiracı disiplini: her kayıt universityId/facultyId/departmentId taşır;
//      kurum adı, bölüm listesi, kişi adı kodda sabit DEĞİLDİR.
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const AKR = {
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

const AKR_STATUS = [
  { id: 'eksik', label: 'Eksik', color: AKR.red, bg: AKR.redLight },
  { id: 'kismen', label: 'Kısmen', color: AKR.amber, bg: AKR.amberLight },
  { id: 'tam', label: 'Tam', color: AKR.green, bg: AKR.greenLight },
];

// Dosya bağlantısı: PDF önizlenir, Office belgeleri doğrudan indirilir.
const akrFileHref = (u) => {
  const rel = String(u || '')
    .replace('/api/files/download/', '')
    .replace('/api/files/view/', '');
  if (!rel) return '#';
  return /\.pdf$/i.test(rel)
    ? '/api/files/view/' + rel
    : '/api/files/download/' + rel + '?download=true';
};

// ══════════════════════════════════════════════════════════════
// KanıtSağlayıcı — kaynak-bağımsız kanıt sorguları.
// Sözleşme: fetch(key, ctx) → { label, count, detail } | null
//   ctx: { departmentId, departmentName, facultyId }
// Varsayılan kaynak: Offline Asistan koleksiyonları. Modül tek başına
// kurulduğunda 'queries' başka bir kaynakla (import edilen veri) değiştirilir;
// modülün geri kalanı hiç değişmez.
// ══════════════════════════════════════════════════════════════
const KanitSaglayici = {
  source: 'offline-asistan',
  async fetch(key, ctx) {
    const q = this.queries[key];
    if (!q) return null;
    try {
      return await q(ctx);
    } catch (_e) {
      return null;
    }
  },
  queries: {
    ogrenciler: async ({ departmentId }) => {
      const list = await window.apiRead('students', {
        where: 'departmentId:eq:s:' + departmentId,
      });
      return { label: 'Kayıtlı öğrenci', count: (list || []).length };
    },
    muafiyet: async ({ departmentId }) => {
      const list = await window.apiRead('muafiyet_records', {
        where: 'departmentId:eq:s:' + departmentId,
      });
      return { label: 'Muafiyet/intibak dosyası', count: (list || []).length };
    },
    anketler: async ({ departmentId }) => {
      const list = await window.apiRead('surveys');
      const mine = (list || []).filter((s) => !s.departmentId || s.departmentId === departmentId);
      return { label: 'Anket (ölçme aracı)', count: mine.length };
    },
    performans: async ({ departmentId }) => {
      const inds = await window.apiRead('performance_indicators');
      const data = await window.apiRead('performance_data', {
        where: 'departmentId:eq:s:' + departmentId,
      });
      return {
        label: 'Performans göstergesi / veri',
        count: (inds || []).length,
        detail: (data || []).length + ' veri kaydı',
      };
    },
    sinavlar: async ({ departmentId }) => {
      const list = await window.apiRead('exams', { where: 'departmentId:eq:s:' + departmentId });
      return { label: 'Sınav kaydı', count: (list || []).length };
    },
    ders_programi: async ({ departmentId }) => {
      const list = await window.apiRead('course_schedules', {
        where: 'departmentId:eq:s:' + departmentId,
      });
      return { label: 'Ders programı kaydı', count: (list || []).length };
    },
    stajlar: async ({ departmentId }) => {
      const list = await window.apiRead('internship_applications');
      const mine = (list || []).filter((s) => !s.departmentId || s.departmentId === departmentId);
      return { label: 'Staj başvurusu', count: mine.length };
    },
    kadro: async ({ departmentId, departmentName }) => {
      const list = await window.apiRead('professors');
      const mine = (list || []).filter(
        (p) =>
          !p.isMemur &&
          (window.profMatchesDept
            ? window.profMatchesDept(p, departmentId, departmentName)
            : p.departmentId === departmentId)
      );
      return { label: 'Öğretim elemanı', count: mine.length };
    },
  },
};
window.KanitSaglayici = KanitSaglayici;

// ── Alt ölçüt satırı ──
function AkrSubRow({ sub, state, onStatus, onNote, onAddLink, onUpload, onRemoveEvidence }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const st = state.status || '';
  const evidence = state.evidence || [];

  const pickFile = async (e) => {
    const f = (e.target.files && e.target.files[0]) || null;
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    try {
      await onUpload(f);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        borderTop: '1px solid ' + AKR.border,
        padding: '12px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div
          style={{
            flex: '1 1 380px',
            minWidth: 0,
            fontSize: 13,
            color: AKR.text,
            lineHeight: 1.55,
          }}
        >
          {sub.text}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {AKR_STATUS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onStatus(st === s.id ? '' : s.id)}
              style={{
                padding: '4px 11px',
                borderRadius: 16,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid ' + (st === s.id ? s.color : AKR.border),
                background: st === s.id ? s.bg : 'white',
                color: st === s.id ? s.color : AKR.textMuted,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kanıtlar + not */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {evidence.map((ev, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px',
              borderRadius: 14,
              background: AKR.accentPale,
              border: '1px solid ' + AKR.accent + '33',
              fontSize: 11.5,
            }}
          >
            <a
              href={ev.type === 'file' ? akrFileHref(ev.url) : ev.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: AKR.accent, fontWeight: 600, textDecoration: 'none' }}
            >
              {ev.type === 'file' ? '📎 ' : '🔗 '}
              {ev.label}
            </a>
            <span
              onClick={() => onRemoveEvidence(i)}
              title="Kanıtı kaldır"
              style={{ cursor: 'pointer', color: AKR.textMuted }}
            >
              ×
            </span>
          </span>
        ))}
        <label
          style={{
            cursor: uploading ? 'wait' : 'pointer',
            fontSize: 11.5,
            color: AKR.accent,
            fontWeight: 600,
          }}
        >
          <input type="file" style={{ display: 'none' }} onChange={pickFile} />
          {uploading ? 'Yükleniyor…' : '+ Dosya'}
        </label>
        <span
          onClick={() => setLinkInput(linkInput ? '' : 'https://')}
          style={{ cursor: 'pointer', fontSize: 11.5, color: AKR.accent, fontWeight: 600 }}
        >
          + Bağlantı
        </span>
        <span
          onClick={() => setNoteOpen(!noteOpen)}
          style={{ cursor: 'pointer', fontSize: 11.5, color: AKR.textMuted, fontWeight: 600 }}
        >
          {state.note ? '✎ Not (dolu)' : '✎ Not'}
        </span>
      </div>

      {linkInput !== '' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="https://… (kanıt bağlantısı)"
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: 7,
              border: '1px solid ' + AKR.border,
              fontSize: 12.5,
              outline: 'none',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && /^https?:\/\/\S+$/i.test(linkInput)) {
                onAddLink(linkInput);
                setLinkInput('');
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (/^https?:\/\/\S+$/i.test(linkInput)) {
                onAddLink(linkInput);
                setLinkInput('');
              }
            }}
            style={{
              padding: '7px 13px',
              borderRadius: 7,
              border: 'none',
              background: AKR.navy,
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ekle
          </button>
        </div>
      )}

      {noteOpen && (
        <textarea
          value={state.note || ''}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Bu alt ölçütle ilgili notlar / eksikler / yapılacaklar…"
          rows={2}
          style={{
            padding: '8px 10px',
            borderRadius: 7,
            border: '1px solid ' + AKR.border,
            fontSize: 12.5,
            outline: 'none',
            resize: 'vertical',
            fontFamily: "'Inter', sans-serif",
          }}
        />
      )}
    </div>
  );
}

// ── Ölçüt kartı (akordeon) ──
function AkrCriterionCard({ criterion, assessment, ctx, onPatch }) {
  const [open, setOpen] = useState(false);
  const [autoEvidence, setAutoEvidence] = useState(null); // null=yüklenmedi

  const subStates = assessment.items || {};
  const done = criterion.sub.filter((s) => (subStates[s.id] || {}).status === 'tam').length;
  const partial = criterion.sub.filter((s) => (subStates[s.id] || {}).status === 'kismen').length;

  // Otomatik kanıtlar — kart açılınca bir kez, adaptörden.
  useEffect(() => {
    if (!open || autoEvidence !== null || !criterion.evidenceKeys?.length) return;
    let alive = true;
    (async () => {
      const results = [];
      for (const key of criterion.evidenceKeys) {
        const r = await KanitSaglayici.fetch(key, ctx);
        if (r) results.push(r);
      }
      if (alive) setAutoEvidence(results);
    })();
    return () => {
      alive = false;
    };
  }, [open, criterion, ctx, autoEvidence]);

  const patchSub = (subId, patch) => {
    const cur = subStates[subId] || {};
    onPatch({ items: { ...subStates, [subId]: { ...cur, ...patch } } });
  };

  const uploadEvidence = async (subId, file) => {
    try {
      const token = localStorage.getItem('caku_auth_token');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/files/upload?folder=akreditasyon_kanitlar', {
        method: 'POST',
        headers: token ? { Authorization: 'Bearer ' + token } : {},
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data.downloadURL) throw new Error('URL alınamadı');
      const cur = subStates[subId] || {};
      const evidence = (cur.evidence || []).concat({
        type: 'file',
        label: file.name,
        url: data.downloadURL,
      });
      patchSub(subId, { evidence });
    } catch (e) {
      alert('Kanıt yüklenemedi: ' + e.message);
    }
  };

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid ' + AKR.border,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: done === criterion.sub.length ? AKR.greenLight : AKR.bg,
            color: done === criterion.sub.length ? AKR.green : AKR.navy,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {criterion.no}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: AKR.navy }}>
            {criterion.title}
          </span>
          <span style={{ fontSize: 11.5, color: AKR.textMuted }}>
            {done}/{criterion.sub.length} tam{partial ? ' · ' + partial + ' kısmen' : ''}
          </span>
        </span>
        <span
          style={{
            color: AKR.textMuted,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
            fontSize: 12,
          }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 18px 14px' }}>
          {/* Sistemden otomatik kanıt özeti (KanıtSağlayıcı) */}
          {criterion.evidenceKeys?.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                padding: '10px 12px',
                background: AKR.bg,
                borderRadius: 9,
                marginBottom: 4,
                fontSize: 11.5,
              }}
            >
              <span style={{ fontWeight: 700, color: AKR.textMuted }}>Sistemden kanıt:</span>
              {autoEvidence === null ? (
                <span style={{ color: AKR.textMuted }}>yükleniyor…</span>
              ) : autoEvidence.length === 0 ? (
                <span style={{ color: AKR.textMuted }}>veri bulunamadı</span>
              ) : (
                autoEvidence.map((ev, i) => (
                  <span key={i} style={{ color: AKR.accent, fontWeight: 600 }}>
                    {ev.label}: {ev.count}
                    {ev.detail ? ' (' + ev.detail + ')' : ''}
                  </span>
                ))
              )}
            </div>
          )}

          {criterion.sub.map((sub) => (
            <AkrSubRow
              key={sub.id}
              sub={sub}
              state={subStates[sub.id] || {}}
              onStatus={(status) => patchSub(sub.id, { status })}
              onNote={(note) => patchSub(sub.id, { note })}
              onAddLink={(url) => {
                const cur = subStates[sub.id] || {};
                patchSub(sub.id, {
                  evidence: (cur.evidence || []).concat({
                    type: 'link',
                    label: url.replace(/^https?:\/\//, '').slice(0, 40),
                    url,
                  }),
                });
              }}
              onUpload={(file) => uploadEvidence(sub.id, file)}
              onRemoveEvidence={(idx) => {
                const cur = subStates[sub.id] || {};
                patchSub(sub.id, { evidence: (cur.evidence || []).filter((_x, i) => i !== idx) });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Ana uygulama
// ══════════════════════════════════════════════════════════════
function AkreditasyonApp({ currentUser }) {
  const isFacultyManager = !!currentUser?.isFacultyManager;
  const myFacultyId = currentUser?.facultyId || '';
  const myUniversityId = currentUser?.universityId || '';

  const [framework, setFramework] = useState(null); // çerçeve (VERİ)
  const [departments, setDepartments] = useState([]);
  const [selDept, setSelDept] = useState('');
  const [assessment, setAssessment] = useState(null); // {items:{subId:{status,note,evidence}}}
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');

  // Çerçeve + fakülte bölümleri
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [fws, depts] = await Promise.all([
          window.apiRead('akreditasyon_frameworks'),
          window.apiRead('departments'),
        ]);
        if (!alive) return;
        const fw = (fws || []).find((f) => (f.id || f._docId) === 'mudek-genel') || (fws || [])[0];
        setFramework(fw || null);
        const mine = (depts || [])
          .filter((d) => (d.facultyId || '') === myFacultyId)
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
        setDepartments(mine);
        if (mine.length > 0) setSelDept((prev) => prev || mine[0].id);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [myFacultyId]);

  // Seçili programın değerlendirme kaydı
  const assessmentId = framework && selDept ? (framework.id || 'mudek-genel') + '__' + selDept : '';
  useEffect(() => {
    if (!assessmentId) return;
    let alive = true;
    (async () => {
      try {
        const res = await window.apiReadDoc('akreditasyon_assessments', assessmentId);
        const doc = (res && res.exists && res.data) || {};
        if (alive) {
          setAssessment({ items: doc.items || {} });
          setDirty(false);
        }
      } catch (_e) {
        if (alive) {
          setAssessment({ items: {} });
          setDirty(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [assessmentId]);

  const save = useCallback(async () => {
    if (!assessmentId || !assessment) return;
    setSaving(true);
    try {
      await window.DBWrite.set(
        'akreditasyon_assessments',
        assessmentId,
        {
          frameworkId: framework.id || 'mudek-genel',
          departmentId: selDept,
          facultyId: myFacultyId,
          universityId: myUniversityId,
          items: assessment.items,
          updatedBy: currentUser?.name || currentUser?.identifier || '',
          updatedAt: new Date().toISOString(),
        },
        true
      );
      setDirty(false);
      setMsg('Kaydedildi ✓');
      setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      setMsg('Kaydedilemedi: ' + e.message);
    } finally {
      setSaving(false);
    }
  }, [assessmentId, assessment, framework, selDept, myFacultyId, myUniversityId, currentUser]);

  const selDeptObj = departments.find((d) => d.id === selDept);
  const ctx = useMemo(
    () => ({
      departmentId: selDept,
      departmentName: selDeptObj?.name || '',
      facultyId: myFacultyId,
    }),
    [selDept, selDeptObj, myFacultyId]
  );

  // İlerleme özeti
  const progress = useMemo(() => {
    if (!framework || !assessment) return { total: 0, tam: 0, kismen: 0 };
    let total = 0;
    let tam = 0;
    let kismen = 0;
    framework.criteria.forEach((c) =>
      c.sub.forEach((s) => {
        total++;
        const st = (assessment.items[s.id] || {}).status;
        if (st === 'tam') tam++;
        else if (st === 'kismen') kismen++;
      })
    );
    return { total, tam, kismen };
  }, [framework, assessment]);

  // ── Paketli ÖDR iskelet şablonunun TEK TIKLA kurulumu ──
  // public/odr-sablon.docx (scripts/build-odr-sablon.py üretir) çekilir,
  // Şablonlar sistemine yüklenir ve eşlemesi OTOMATİK yazılır — kullanıcı
  // Word düzenlemez, sihirbazda eşleme yapmaz. Token adları build script'iyle
  // birebir aynı tutulmalıdır.
  const ODR_TOKEN_MAP = useMemo(() => {
    const m = {
      '{{Üniversite Adı}}': 'static:universiteAd',
      '{{Fakülte Adı}}': 'static:fakulteAd',
      '{{Program (Bölüm) Adı}}': 'static:programAd',
      '{{Çerçeve}}': 'static:cerceve',
      '{{Rapor Tarihi}}': 'static:tarih',
      '{{Hazırlayan}}': 'static:hazirlayan',
      '{{İlerleme Özeti}}': 'static:ilerlemeOzet',
    };
    for (let i = 1; i <= 10; i++) {
      m['{{Ölçüt ' + i + ' — Durum Özeti}}'] = 'static:olcut' + i + 'Durum';
      m['{{Ölçüt ' + i + ' — Notlar}}'] = 'static:olcut' + i + 'Not';
      m['{{Ölçüt ' + i + ' — Kanıt Listesi}}'] = 'static:olcut' + i + 'Kanit';
    }
    return m;
  }, []);
  const [installingTpl, setInstallingTpl] = useState(false);
  const installBundledTemplate = async () => {
    if (
      !confirm(
        'Sistemle gelen hazır ÖDR iskelet şablonu Şablonlar modülüne kurulacak ve alan eşlemesi otomatik yapılacak. Devam edilsin mi?'
      )
    )
      return;
    setInstallingTpl(true);
    try {
      const fr = await fetch('/odr-sablon.docx');
      if (!fr.ok) throw new Error('Paketli şablon dosyası bulunamadı (odr-sablon.docx).');
      const blob = await fr.blob();
      const buf = await blob.arrayBuffer();
      const detected = await window.TemplateEngine.detectPlaceholders(buf);
      const fields = detected.map((d) => ({
        token: d.token,
        tokenOccurrence: d.tokenOccurrence,
        context: d.context || '',
        variable: ODR_TOKEN_MAP[d.token] || '',
        value: '',
      }));
      const token = localStorage.getItem('caku_auth_token');
      const authH = token ? { Authorization: 'Bearer ' + token } : {};
      const fd = new FormData();
      fd.append(
        'file',
        new File([blob], 'ODR_Iskelet_Sablonu.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })
      );
      fd.append('name', 'ÖDR İskelet Şablonu (hazır)');
      fd.append('module', 'akreditasyon');
      fd.append('docType', 'odr');
      fd.append('description', 'Sistemle gelen hazır ÖDR iskeleti — eşleme otomatik yapıldı.');
      const cr = await fetch('/api/templates', {
        method: 'POST',
        headers: authH,
        credentials: 'include',
        body: fd,
      });
      const created = await cr.json().catch(() => ({}));
      if (!cr.ok) throw new Error(created.error || 'Şablon yüklenemedi.');
      const ur = await fetch('/api/templates/' + created._id + '/update', {
        method: 'POST',
        headers: { ...authH, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fields }),
      });
      if (!ur.ok) {
        const d = await ur.json().catch(() => ({}));
        throw new Error(d.error || 'Eşleme kaydedilemedi.');
      }
      alert(
        'Hazır ÖDR şablonu kuruldu ve eşlendi ✓\n"Rapor Oluştur (ÖDR)" artık doğrudan çalışır. İsterseniz Şablonlar modülünden iskeleti kendi ÖDR belgenizle değiştirebilirsiniz.'
      );
    } catch (e) {
      alert('Kurulum hatası: ' + e.message);
    } finally {
      setInstallingTpl(false);
    }
  };

  // ── ÖDR / rapor üretimi — Şablonlar modülüne yüklenen HERHANGİ bir .docx
  // şablonunu doldurur ({{...}} + alan eşleme). Değerlendirme verisi hem
  // numaralı statik değişkenler (bölüm-tarzı ÖDR) hem satır değişkenleri
  // (tablo-tarzı özet) olarak sunulur; şablon hangisini kullanırsa o dolar.
  const [generatingReport, setGeneratingReport] = useState(false);
  const generateReport = async () => {
    if (!framework || !assessment || !selDept) return;
    const items = assessment.items || {};
    const per = framework.criteria.map((c) => {
      let tam = 0;
      let kismen = 0;
      let eksik = 0;
      const notes = [];
      const evid = [];
      c.sub.forEach((s, si) => {
        const st = items[s.id] || {};
        if (st.status === 'tam') tam++;
        else if (st.status === 'kismen') kismen++;
        else eksik++;
        const tag = c.no + '.' + (si + 1);
        if (st.note) notes.push(tag + ': ' + st.note);
        (st.evidence || []).forEach((ev) => evid.push(tag + ': ' + (ev.label || ev.url)));
      });
      const durum =
        tam +
        '/' +
        c.sub.length +
        ' tam' +
        (kismen ? ' · ' + kismen + ' kısmen' : '') +
        (eksik ? ' · ' + eksik + ' eksik' : '');
      return {
        no: c.no,
        baslik: c.title,
        durum,
        not: notes.join(' | ') || '—',
        kanit: evid.join(' | ') || '—',
      };
    });
    const pctNow = progress.total ? Math.round((progress.tam / progress.total) * 100) : 0;
    const staticData = {
      programAd: selDeptObj?.name || '',
      fakulteAd: window.TENANT?.facultyName || '',
      universiteAd: window.TENANT?.universityName || '',
      cerceve: ((framework.name || '') + ' ' + (framework.version || '')).trim(),
      tarih: new Date().toLocaleDateString('tr-TR'),
      hazirlayan: currentUser?.name || currentUser?.identifier || '',
      ilerlemeOzet:
        progress.tam + '/' + progress.total + ' tam · ' + progress.kismen + ' kısmen · %' + pctNow,
    };
    per.forEach((p, i) => {
      const n = i + 1;
      staticData['olcut' + n + 'Durum'] = p.durum;
      staticData['olcut' + n + 'Not'] = p.not;
      staticData['olcut' + n + 'Kanit'] = p.kanit;
    });
    const rows = per.map((p) => ({
      olcutNo: p.no,
      olcutBaslik: p.baslik,
      olcutDurum: p.durum,
      olcutNot: p.not,
      olcutKanit: p.kanit,
    }));
    setGeneratingReport(true);
    try {
      const res = await window.TemplateEngine.produceFromTemplate({
        module: 'akreditasyon',
        docType: 'odr',
        departmentId: selDept,
        staticData,
        rows,
        filename:
          'ODR_' + (selDeptObj?.name || 'program').replace(/[^\wğüşıöçĞÜŞİÖÇ]/g, '_') + '.docx',
      });
      if (res.ok) return;
      const msgs = {
        'no-template':
          'ÖDR şablonu bulunamadı.\nŞablonlar modülünden "Akreditasyon" → "Öz Değerlendirme Raporu (ÖDR)" türüne bir .docx şablonu yükleyin ({{...}} yer tutucularıyla) ve 🧩 ile alanları eşleyin. Herhangi bir şablon (MÜDEK ÖDR dahil) kullanılabilir.',
        'no-mapping':
          'Şablonun alan eşlemesi yapılmamış.\nŞablonlar modülünde 🧩 (Alanlar) butonuyla yer tutucuları değişkenlere eşleyin.',
        'not-docx': 'Atanan şablon .docx değil — rapor üretimi yalnızca .docx ile çalışır.',
        'invalid-output': 'Şablondan geçerli belge üretilemedi (şablon yapısı desteklenmiyor).',
      };
      alert(msgs[res.reason] || 'Rapor üretilemedi: ' + (res.message || res.reason));
    } catch (e) {
      alert('Rapor üretilemedi: ' + e.message);
    } finally {
      setGeneratingReport(false);
    }
  };

  if (!isFacultyManager) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: AKR.red, fontSize: 20, marginBottom: 8 }}>Erişim Reddedildi</h2>
        <p style={{ color: AKR.textMuted }}>
          Akreditasyon modülü yalnızca fakülte yetkililerine açıktır.
        </p>
      </div>
    );
  }
  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: AKR.textMuted }}>Yükleniyor…</div>
    );
  }
  if (!framework) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: AKR.navy, fontSize: 18, marginBottom: 8 }}>Çerçeve tanımı yok</h2>
        <p style={{ color: AKR.textMuted, fontSize: 13.5 }}>
          Akreditasyon çerçevesi (MÜDEK) henüz yüklenmemiş. Sunucuda{' '}
          <code>node server/seed-mudek-framework.js</code> çalıştırın.
        </p>
      </div>
    );
  }

  const pct = progress.total ? Math.round((progress.tam / progress.total) * 100) : 0;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: AKR.text, maxWidth: 1000 }}>
      {/* Başlık + program seçici */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: AKR.navy }}>
            Akreditasyon — {framework.shortName || framework.name}
          </h2>
          <p style={{ fontSize: 12.5, color: AKR.textMuted, margin: '4px 0 0' }}>
            {framework.name} · {framework.version}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selDept}
            onChange={(e) => {
              if (dirty && !confirm('Kaydedilmemiş değişiklikler var. Yine de geçilsin mi?'))
                return;
              setSelDept(e.target.value);
            }}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid ' + AKR.border,
              fontSize: 13,
              background: 'white',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: 'none',
              background: dirty ? AKR.navy : AKR.border,
              color: dirty ? 'white' : AKR.textMuted,
              fontSize: 13,
              fontWeight: 600,
              cursor: dirty ? 'pointer' : 'default',
            }}
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button
            type="button"
            onClick={generateReport}
            disabled={generatingReport || !selDept}
            title="Şablonlar modülüne yüklü ÖDR şablonunu değerlendirme verisiyle doldurur"
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: '1px solid ' + AKR.accent,
              background: AKR.accentPale,
              color: AKR.accent,
              fontSize: 13,
              fontWeight: 600,
              cursor: generatingReport ? 'wait' : 'pointer',
            }}
          >
            {generatingReport ? 'Üretiliyor…' : 'Rapor Oluştur (ÖDR)'}
          </button>
          <button
            type="button"
            onClick={installBundledTemplate}
            disabled={installingTpl}
            title="Sistemle gelen hazır ÖDR iskeletini tek tıkla kurar (Word düzenleme ve eşleme gerekmez)"
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid ' + AKR.border,
              background: 'white',
              color: AKR.textMuted,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: installingTpl ? 'wait' : 'pointer',
            }}
          >
            {installingTpl ? 'Kuruluyor…' : 'Hazır Şablonu Kur'}
          </button>
          {msg && <span style={{ fontSize: 12, color: AKR.green, fontWeight: 600 }}>{msg}</span>}
        </div>
      </div>

      {departments.length === 0 ? (
        <div
          style={{
            background: 'white',
            border: '1px solid ' + AKR.border,
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
            color: AKR.textMuted,
          }}
        >
          Fakültenizde tanımlı bölüm bulunamadı.
        </div>
      ) : (
        <>
          {/* İlerleme */}
          <div
            style={{
              background: 'white',
              border: '1px solid ' + AKR.border,
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12.5,
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 700, color: AKR.navy }}>
                {selDeptObj?.name || ''} — hazırlık durumu
              </span>
              <span style={{ color: AKR.textMuted }}>
                {progress.tam}/{progress.total} tam · {progress.kismen} kısmen · %{pct}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: AKR.bg, overflow: 'hidden' }}>
              <div
                style={{
                  width: pct + '%',
                  height: '100%',
                  background: pct === 100 ? AKR.green : AKR.accent,
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>

          {/* Ölçütler */}
          {assessment && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {framework.criteria.map((c) => (
                <AkrCriterionCard
                  key={c.id}
                  criterion={c}
                  assessment={assessment}
                  ctx={ctx}
                  onPatch={(patch) => {
                    setAssessment((prev) => ({ ...prev, ...patch }));
                    setDirty(true);
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

window.AkreditasyonApp = AkreditasyonApp;
