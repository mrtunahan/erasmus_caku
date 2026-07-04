// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Şablonlar Modülü
//   Bölüm yetkilisi: yalnızca kendi bölüm şablonları
//   Fakülte yetkilisi: fakültesindeki bölüm + fakülte-geneli
//   Üni yetkilisi: tüm şablonlar (+ üniversite-geneli ekleyebilir)
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useCallback, useMemo } = React;

const SB_Modal = window.Modal;
const SB_Input = window.Input;
const SB_FormField = window.FormField;
const SB_Btn = window.Btn;

const SB_MODULES = [
  { id: 'erasmus', label: 'Erasmus', color: '#3B82F6' },
  { id: 'muafiyet', label: 'Ders Muafiyet', color: '#10B981' },
  { id: 'sinav', label: 'Sınav Otomasyonu', color: '#DC2626' },
  { id: 'dersprogrami', label: 'Ders Programı', color: '#F59E0B' },
  { id: 'projeler', label: 'Proje Performans', color: '#8B5CF6' },
  { id: 'anket', label: 'Anketler', color: '#06B6D4' },
];
const SB_SCOPE_LABEL = {
  university: 'Üniversite Geneli',
  faculty: 'Fakülte Geneli',
  department: 'Bölüm',
};
const SB_ALLOWED_EXT = ['.docx', '.doc', '.pdf', '.xlsx', '.xls'];

function fmtBytes(b) {
  if (!b) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return Math.round(b / 1024) + ' KB';
  return (b / 1024 / 1024).toFixed(2) + ' MB';
}
function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (_) {
    return '';
  }
}
function moduleMeta(id) {
  return SB_MODULES.find((m) => m.id === id) || { id, label: id, color: '#6B7280' };
}

function SablonlarApp({ currentUser, activeDepartment, departmentInfo }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [mapping, setMapping] = useState(null); // { tpl, file? } — alan eşleme sihirbazı
  const [filter, setFilter] = useState({ module: 'all', search: '' });
  const [msg, setMsg] = useState({ text: '', kind: '' });

  const isUniAdmin = !!currentUser?.isUniversityAdmin;
  const isFacMgr = !isUniAdmin && !!currentUser?.isFacultyManager;
  const isDeptMgr =
    !isUniAdmin &&
    !isFacMgr &&
    (currentUser?.role === 'bolum_yetkilisi' || !!currentUser?.isDeptManager);
  const canManage = isUniAdmin || isFacMgr || isDeptMgr;

  const showMsg = (text, kind = 'info') => {
    setMsg({ text, kind });
    setTimeout(() => setMsg({ text: '', kind: '' }), 3500);
  };

  const headers = useCallback(() => {
    const t = localStorage.getItem('caku_auth_token');
    return t ? { Authorization: 'Bearer ' + t } : {};
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/templates', { headers: headers() });
      const d = await r.json();
      setTemplates(Array.isArray(d) ? d : []);
    } catch (e) {
      showMsg('Şablonlar yüklenemedi: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = (filter.search || '').toLocaleLowerCase('tr');
    return templates.filter((t) => {
      if (filter.module !== 'all' && t.module !== filter.module) return false;
      if (!q) return true;
      return (
        (t.name || '').toLocaleLowerCase('tr').indexOf(q) >= 0 ||
        (t.description || '').toLocaleLowerCase('tr').indexOf(q) >= 0
      );
    });
  }, [templates, filter]);

  const handleDelete = async (tpl) => {
    if (!confirm('"' + tpl.name + '" şablonu silinsin mi?')) return;
    try {
      const r = await fetch('/api/templates/' + tpl._id, {
        method: 'DELETE',
        headers: headers(),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Silinemedi');
      showMsg('Şablon silindi.', 'ok');
      load();
    } catch (e) {
      showMsg('Silinemedi: ' + e.message, 'error');
    }
  };

  const handleToggle = async (tpl, field) => {
    try {
      const r = await fetch('/api/templates/' + tpl._id, {
        method: 'PATCH',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !tpl[field] }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Güncellenemedi');
      showMsg(
        field === 'isDefault'
          ? tpl.isDefault
            ? 'Varsayılan kaldırıldı.'
            : 'Varsayılan olarak işaretlendi.'
          : tpl.isActive
            ? 'Pasifleştirildi.'
            : 'Aktifleştirildi.',
        'ok'
      );
      load();
    } catch (e) {
      showMsg('Güncellenemedi: ' + e.message, 'error');
    }
  };

  if (!canManage) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: '#DC2626', fontSize: 20, marginBottom: 8 }}>Erişim Reddedildi</h2>
        <p style={{ color: '#6B7280' }}>
          Şablonlar modülüne yalnızca bölüm/fakülte/üniversite yetkilileri erişebilir.
        </p>
      </div>
    );
  }

  const scopeHint = isUniAdmin
    ? 'Tüm şablonları yönetebilirsiniz.'
    : isFacMgr
      ? 'Fakültenizdeki bölümlerin ve fakülte geneli şablonları yönetirsiniz.'
      : 'Yalnızca kendi bölümünüzün şablonlarını yönetirsiniz.';

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#1F2937', maxWidth: 1100 }}>
      {/* Başlık */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Şablonlar</h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>{scopeHint}</p>
        </div>
        <SB_Btn onClick={() => setShowAdd(true)}>+ Yeni Şablon Ekle</SB_Btn>
      </div>

      {/* Mesaj */}
      {msg.text && (
        <div
          style={{
            background:
              msg.kind === 'error' ? '#FEE2E2' : msg.kind === 'ok' ? '#DCFCE7' : '#EFF6FF',
            color: msg.kind === 'error' ? '#991B1B' : msg.kind === 'ok' ? '#166534' : '#1E40AF',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 12,
            border:
              '1px solid ' +
              (msg.kind === 'error' ? '#FECACA' : msg.kind === 'ok' ? '#BBF7D0' : '#DBEAFE'),
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Filtre */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <select
          value={filter.module}
          onChange={(e) => setFilter({ ...filter, module: e.target.value })}
          style={{
            padding: '8px 10px',
            border: '1px solid #D1D5DB',
            borderRadius: 8,
            fontSize: 13,
            background: 'white',
          }}
        >
          <option value="all">Tüm Modüller</option>
          {SB_MODULES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <input
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          placeholder="Şablon ara..."
          style={{
            flex: 1,
            minWidth: 180,
            padding: '8px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <div style={{ fontSize: 12, color: '#6B7280' }}>{filtered.length} şablon</div>
      </div>

      {/* Liste */}
      {loading ? (
        <p style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>Yükleniyor…</p>
      ) : filtered.length === 0 ? (
        <div
          style={{
            background: 'white',
            border: '1px dashed #D1D5DB',
            borderRadius: 12,
            padding: '40px 24px',
            textAlign: 'center',
            color: '#6B7280',
          }}
        >
          Henüz bir şablon eklenmedi. Yukarıdaki butonla başlayın.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((t) => {
            const m = moduleMeta(t.module);
            return (
              <div
                key={t._id}
                style={{
                  background: 'white',
                  border: '1px solid #E5E7EB',
                  borderLeft: '4px solid ' + m.color,
                  borderRadius: 12,
                  padding: 14,
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>
                      {t.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: m.color + '15',
                        color: m.color,
                      }}
                    >
                      {m.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: '#F1F5F9',
                        color: '#475569',
                      }}
                    >
                      {SB_SCOPE_LABEL[t.scope] || t.scope}
                    </span>
                    {t.isDefault && (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: '#FEF3C7',
                          color: '#92400E',
                        }}
                      >
                        ★ VARSAYILAN
                      </span>
                    )}
                    {!t.isActive && (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: '#E5E7EB',
                          color: '#374151',
                        }}
                      >
                        PASİF
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 4 }}>
                      {t.description}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 11.5,
                      color: '#9CA3AF',
                      marginTop: 4,
                      display: 'flex',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    {t.file && (
                      <span>
                        📄 {t.file.originalName} ({fmtBytes(t.file.size)} ·{' '}
                        {(t.file.extension || '').toUpperCase()})
                      </span>
                    )}
                    <span>· {fmtDate(t.createdAt)}</span>
                    {t.createdByName && <span>· {t.createdByName}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {t.file && t.file.extension === 'docx' && (
                    <button
                      onClick={() => setMapping({ tpl: t, file: null })}
                      title={
                        (t.fields || []).some((f) => f.variable)
                          ? 'Alan eşlemesini düzenle (' +
                            t.fields.filter((f) => f.variable).length +
                            ' alan eşli)'
                          : 'Anahtar alanları eşle — çıktı üretimi için gerekli'
                      }
                      style={iconBtn(
                        (t.fields || []).some((f) => f.variable) ? '#7C3AED' : '#D97706',
                        (t.fields || []).some((f) => f.variable) ? '#EDE9FE' : '#FEF3C7'
                      )}
                    >
                      🧩
                    </button>
                  )}
                  <a
                    href={'/api/templates/' + t._id + '/download'}
                    title="İndir"
                    style={iconBtn('#16A34A', '#DCFCE7')}
                  >
                    ⬇
                  </a>
                  <button
                    onClick={() => handleToggle(t, 'isDefault')}
                    title={t.isDefault ? 'Varsayılanı kaldır' : 'Varsayılan yap'}
                    style={iconBtn(t.isDefault ? '#9A3412' : '#92400E', '#FEF3C7')}
                  >
                    ★
                  </button>
                  <button
                    onClick={() => handleToggle(t, 'isActive')}
                    title={t.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                    style={iconBtn(t.isActive ? '#1E40AF' : '#6B7280', '#DBEAFE')}
                  >
                    {t.isActive ? '✓' : '○'}
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    title="Sil"
                    style={iconBtn('#DC2626', '#FEE2E2')}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddTemplateModal
          onClose={() => setShowAdd(false)}
          onSaved={(tpl, file) => {
            setShowAdd(false);
            load();
            // .docx ise yer tutucu eşleme sihirbazını otomatik aç
            if (tpl && tpl.file && tpl.file.extension === 'docx') {
              showMsg('Şablon eklendi — şimdi anahtar alanları eşleyin.', 'ok');
              setMapping({ tpl, file });
            } else {
              showMsg('Şablon eklendi.', 'ok');
            }
          }}
          currentUser={currentUser}
          activeDepartment={activeDepartment}
          departmentInfo={departmentInfo}
          isUniAdmin={isUniAdmin}
          isFacMgr={isFacMgr}
          isDeptMgr={isDeptMgr}
        />
      )}

      {mapping && (
        <FieldMappingModal
          tpl={mapping.tpl}
          localFile={mapping.file}
          headers={headers}
          onClose={() => setMapping(null)}
          onSaved={() => {
            setMapping(null);
            showMsg('Alan eşlemesi kaydedildi.', 'ok');
            load();
          }}
        />
      )}
    </div>
  );
}

function iconBtn(color, bg) {
  return {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid ' + color + '40',
    background: bg,
    color: color,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    lineHeight: 1,
  };
}

function AddTemplateModal(props) {
  const { onClose, onSaved, isUniAdmin, isFacMgr, isDeptMgr, activeDepartment, currentUser } =
    props;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [module_, setModule] = useState('erasmus');
  const [file, setFile] = useState(null);
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [scope, setScope] = useState(
    isUniAdmin ? 'university' : isFacMgr ? 'department' : 'department'
  );
  const [scopeDeptId, setScopeDeptId] = useState(activeDepartment || '');
  const [scopeFacId, setScopeFacId] = useState(currentUser?.facultyId || '');
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [d, f] = await Promise.all([
          window.apiRead('departments'),
          window.apiRead('faculties').catch(() => []),
        ]);
        setDepartments(Array.isArray(d) ? d : []);
        setFaculties(Array.isArray(f) ? f : []);
      } catch (_) {
        /* yok say */
      }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!file) return setError('Bir dosya seçin.');
    if (name.trim().length < 2) return setError('Şablon adı en az 2 karakter.');
    const ext = '.' + (file.name.split('.').pop() || '').toLocaleLowerCase('tr');
    if (!SB_ALLOWED_EXT.includes(ext))
      return setError('Sadece şu uzantılar destekleniyor: ' + SB_ALLOWED_EXT.join(', '));

    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', name.trim());
    fd.append('description', description.trim());
    fd.append('module', module_);
    fd.append('isDefault', String(!!isDefault));
    fd.append('isActive', String(!!isActive));
    fd.append('scope', scope);
    if (scope === 'department') fd.append('departmentId', scopeDeptId);
    if (scope === 'faculty') fd.append('facultyId', scopeFacId);

    setSaving(true);
    try {
      const t = localStorage.getItem('caku_auth_token');
      const r = await fetch('/api/templates', {
        method: 'POST',
        headers: t ? { Authorization: 'Bearer ' + t } : {},
        body: fd,
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Yüklenemedi');
      // Oluşan şablonu ve yerel dosyayı üst bileşene ver — .docx ise
      // alan eşleme sihirbazı otomatik açılır
      onSaved(d, file);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SB_Modal open={true} onClose={onClose} title="Yeni Şablon" width={560}>
      <form onSubmit={submit}>
        <SB_FormField label="Şablon Adı *">
          <SB_Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn: Bilgisayar Müh. Erasmus Çıktı Şablonu"
          />
        </SB_FormField>
        <SB_FormField label="Modül *">
          <select
            value={module_}
            onChange={(e) => setModule(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
              boxSizing: 'border-box',
            }}
          >
            {SB_MODULES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </SB_FormField>
        {(isUniAdmin || isFacMgr) && (
          <SB_FormField label="Kapsam *">
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            >
              {isUniAdmin && <option value="university">Üniversite Geneli</option>}
              {(isUniAdmin || isFacMgr) && <option value="faculty">Fakülte Geneli</option>}
              <option value="department">Bölüm</option>
            </select>
          </SB_FormField>
        )}
        {scope === 'department' && (
          <SB_FormField label={isDeptMgr ? 'Bölüm (otomatik)' : 'Bölüm *'}>
            {isDeptMgr ? (
              <SB_Input
                value={
                  (departments.find((d) => (d._docId || d.id) === (activeDepartment || '')) || {})
                    .name || activeDepartment
                }
                disabled
              />
            ) : (
              <select
                value={scopeDeptId}
                onChange={(e) => setScopeDeptId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #D1D5DB',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              >
                <option value="">Bölüm seçin…</option>
                {departments
                  .filter((d) => !isFacMgr || d.facultyId === currentUser?.facultyId)
                  .map((d) => (
                    <option key={d._docId || d.id} value={d._docId || d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            )}
          </SB_FormField>
        )}
        {scope === 'faculty' && isUniAdmin && (
          <SB_FormField label="Fakülte *">
            <select
              value={scopeFacId}
              onChange={(e) => setScopeFacId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            >
              <option value="">Fakülte seçin…</option>
              {faculties.map((f) => (
                <option key={f._docId || f.id} value={f._docId || f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </SB_FormField>
        )}
        <SB_FormField label="Açıklama">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="İsteğe bağlı kısa açıklama"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </SB_FormField>
        <SB_FormField label="Dosya * (.docx, .doc, .pdf, .xlsx, .xls — maks 10 MB)">
          <input
            type="file"
            accept={SB_ALLOWED_EXT.join(',')}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{
              width: '100%',
              padding: 8,
              border: '1px dashed #9CA3AF',
              borderRadius: 8,
              fontSize: 13,
              background: '#F9FAFB',
              boxSizing: 'border-box',
            }}
          />
        </SB_FormField>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            Varsayılan yap
          </label>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Aktif
          </label>
        </div>
        {error && (
          <div
            style={{
              background: '#FEE2E2',
              color: '#991B1B',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <SB_Btn type="button" variant="secondary" onClick={onClose} disabled={saving}>
            İptal
          </SB_Btn>
          <SB_Btn type="submit" disabled={saving}>
            {saving ? 'Yükleniyor…' : 'Şablonu Kaydet'}
          </SB_Btn>
        </div>
      </form>
    </SB_Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// Alan Eşleme Sihirbazı — .docx şablonundaki yer tutucuları
// (yyyyy, xxxxx, XXXXX, tek X, {degisken}) tespit eder; yükleyen yetkili
// her birini modülün değişkenlerine ya da sabit metne eşler. Eşleme
// document_templates.fields'a kaydedilir; hedef modül çıktı üretirken
// window.TemplateEngine.generateDocx bu eşlemeyi kullanır.
// ══════════════════════════════════════════════════════════════
function FieldMappingModal({ tpl, localFile, headers, onClose, onSaved }) {
  const [fields, setFields] = useState(null); // null=yükleniyor
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const vars = window.TEMPLATE_VARS?.[tpl.module] ||
    window.TEMPLATE_VARS?._generic || {
      static: [],
      row: [],
    };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let buf;
        if (localFile) {
          buf = await localFile.arrayBuffer();
        } else {
          const r = await fetch('/api/templates/' + tpl._id + '/download', {
            headers: headers(),
          });
          if (!r.ok) throw new Error('Şablon dosyası indirilemedi.');
          buf = await r.arrayBuffer();
        }
        const detected = await window.TemplateEngine.detectPlaceholders(buf);
        // Kayıtlı eşlemeleri (token + sıra) üzerine bindir
        const saved = tpl.fields || [];
        const merged = detected.map((d) => {
          const s = saved.find(
            (x) => x.token === d.token && x.tokenOccurrence === d.tokenOccurrence
          );
          return s ? { ...d, variable: s.variable || '', value: s.value || '' } : d;
        });
        if (alive) setFields(merged);
      } catch (e) {
        if (alive) {
          setError(e.message);
          setFields([]);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [tpl._id]);

  const update = (i, patch) =>
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/templates/' + tpl._id, {
        method: 'PATCH',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: fields.map(({ token, tokenOccurrence, context, variable, value }) => ({
            token,
            tokenOccurrence,
            context,
            variable,
            value,
          })),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Kaydedilemedi');
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const mappedCount = (fields || []).filter((f) => f.variable).length;
  const selStyle = {
    width: '100%',
    padding: '7px 10px',
    borderRadius: 7,
    border: '1px solid #D1D5DB',
    fontSize: 12.5,
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
  };

  return (
    <SB_Modal open={true} onClose={onClose} title={'Alan Eşleme — ' + tpl.name} width={760}>
      <p style={{ fontSize: 12.5, color: '#6B7280', margin: '0 0 12px', lineHeight: 1.6 }}>
        Belgede tespit edilen yer tutucular aşağıda. Her birini{' '}
        <b>{moduleMeta(tpl.module).label}</b> modülünün değişkenlerine eşleyin — çıktı üretilirken
        bu alanlar gerçek verilerle doldurulur. <b>Satır değişkenleri</b> tablo satırındaki alanlar
        içindir: o satır, ders sayısı kadar çoğaltılır. Eşlemek istemediklerinizi "Atla" bırakın;
        sabit bir metin yazmak için "Sabit metin" seçin.
      </p>

      {fields === null ? (
        <p style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>Belge inceleniyor…</p>
      ) : fields.length === 0 ? (
        <div
          style={{
            padding: 20,
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: 10,
            fontSize: 13,
            color: '#92400E',
          }}
        >
          Belgede yer tutucu bulunamadı. Şablonda değişken alanları <b>xxxxx</b>, <b>yyyyy</b>,{' '}
          <b>XXXXX</b> ya da <b>{'{degiskenAdi}'}</b> biçiminde yazın ve şablonu yeniden yükleyin.
        </div>
      ) : (
        <div
          style={{
            maxHeight: 420,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 12,
          }}
        >
          {fields.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 220px',
                gap: 10,
                alignItems: 'center',
                padding: '9px 12px',
                borderRadius: 9,
                border: '1px solid ' + (f.variable ? '#C4B5FD' : '#E5E7EB'),
                background: f.variable ? '#F5F3FF' : 'white',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 8,
                    background: '#1F2937',
                    color: 'white',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {f.token}
                </span>
                <span style={{ fontSize: 10.5, color: '#9CA3AF', marginLeft: 6 }}>
                  #{f.tokenOccurrence}
                </span>
                <div
                  style={{
                    fontSize: 11.5,
                    color: '#6B7280',
                    marginTop: 3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={f.context}
                >
                  …{f.context}…
                </div>
              </div>
              <div>
                <select
                  value={f.variable}
                  onChange={(e) => update(i, { variable: e.target.value })}
                  style={selStyle}
                >
                  <option value="">— Atla —</option>
                  {vars.static.length > 0 && (
                    <optgroup label="Belge alanları">
                      {vars.static.map((v) => (
                        <option key={v.id} value={'static:' + v.id}>
                          {v.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {vars.row.length > 0 && (
                    <optgroup label="Tablo satırı (ders başına)">
                      {vars.row.map((v) => (
                        <option key={v.id} value={'row:' + v.id}>
                          {v.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <option value="const">Sabit metin…</option>
                </select>
                {f.variable === 'const' && (
                  <input
                    value={f.value}
                    onChange={(e) => update(i, { value: e.target.value })}
                    placeholder="Yazılacak sabit metin"
                    style={{ ...selStyle, marginTop: 5 }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          style={{
            background: '#FEE2E2',
            color: '#991B1B',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12.5,
            marginBottom: 10,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 12, color: '#6B7280' }}>
          {mappedCount} alan eşlendi{fields ? ' / ' + fields.length + ' tespit' : ''}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <SB_Btn type="button" variant="secondary" onClick={onClose} disabled={saving}>
            İptal
          </SB_Btn>
          <SB_Btn type="button" onClick={save} disabled={saving || fields === null}>
            {saving ? 'Kaydediliyor…' : 'Eşlemeyi Kaydet'}
          </SB_Btn>
        </div>
      </div>
    </SB_Modal>
  );
}

window.SablonlarApp = SablonlarApp;
