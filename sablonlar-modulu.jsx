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
  { id: 'staj', label: 'Staj', color: '#0EA5E9' },
  { id: 'sinav', label: 'Sınav Otomasyonu', color: '#DC2626' },
  { id: 'dersprogrami', label: 'Ders Programı', color: '#F59E0B' },
  { id: 'projeler', label: 'Proje Performans', color: '#8B5CF6' },
  { id: 'formlar', label: 'Formlar', color: '#64748B' },
  { id: 'performans', label: 'Performans', color: '#0D9488' },
  { id: 'akreditasyon', label: 'Akreditasyon', color: '#0F766E' },
  { id: 'anket', label: 'Anketler', color: '#06B6D4' },
];
// Bir modülün belge türleri (shared TEMPLATE_VARS'tan)
function docTypesOf(moduleId) {
  return typeof window !== 'undefined' && window.templateDocTypes
    ? window.templateDocTypes(moduleId)
    : [{ id: 'default', label: 'Belge' }];
}
function docTypeLabel(moduleId, docType) {
  const dt = docTypesOf(moduleId).find((d) => d.id === (docType || 'default'));
  return dt ? dt.label : docType || 'Belge';
}
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
  const [editTpl, setEditTpl] = useState(null); // düzenlenen şablon (meta/dosya)
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
      // POST takma rotası — bazı nginx yapılandırmaları DELETE'e 405 döner
      const r = await fetch('/api/templates/' + tpl._id + '/delete', {
        method: 'POST',
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
      // POST takma rotası — bazı nginx yapılandırmaları PATCH'e 405 döner
      const r = await fetch('/api/templates/' + tpl._id + '/update', {
        method: 'POST',
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((t) => {
            const m = moduleMeta(t.module);
            const isDocx = t.file && t.file.extension === 'docx';
            const mappedCount = (t.fields || []).filter((f) => f.variable).length;
            const hasMapping = mappedCount > 0;
            return (
              <div
                key={t._id}
                style={{
                  background: 'white',
                  border: '1px solid #E5E7EB',
                  borderLeft: '4px solid ' + m.color,
                  borderRadius: 12,
                  padding: 16,
                  opacity: t.isActive ? 1 : 0.72,
                }}
              >
                {/* Üst satır: başlık + rozetler */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15.5, fontWeight: 700, color: '#111827' }}>
                    {t.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 9px',
                      borderRadius: 999,
                      background: m.color + '18',
                      color: m.color,
                    }}
                  >
                    {m.label}
                  </span>
                  {docTypesOf(t.module).length > 1 && (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '2px 9px',
                        borderRadius: 999,
                        background: '#EEF2FF',
                        color: '#4338CA',
                      }}
                    >
                      {docTypeLabel(t.module, t.docType)}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: '2px 9px',
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
                        padding: '2px 9px',
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
                        padding: '2px 9px',
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
                  <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 5 }}>
                    {t.description}
                  </div>
                )}

                {/* Dosya + meta satırı */}
                <div
                  style={{
                    fontSize: 12,
                    color: '#6B7280',
                    marginTop: 8,
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  {t.file && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderRadius: 7,
                        padding: '4px 10px',
                        maxWidth: '100%',
                      }}
                    >
                      <span>📄</span>
                      <span
                        style={{
                          maxWidth: 340,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: 600,
                          color: '#374151',
                        }}
                        title={t.file.originalName}
                      >
                        {t.file.originalName}
                      </span>
                      <span style={{ color: '#9CA3AF' }}>
                        {(t.file.extension || '').toUpperCase()} · {fmtBytes(t.file.size)}
                      </span>
                    </span>
                  )}
                  <span style={{ color: '#9CA3AF' }}>
                    {fmtDate(t.createdAt)}
                    {t.createdByName ? ' · ' + t.createdByName : ''}
                  </span>
                </div>

                {/* Eşleme durum şeridi (yalnız .docx) */}
                {isDocx && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: hasMapping ? '#EDE9FE' : '#FEF3C7',
                      color: hasMapping ? '#6D28D9' : '#92400E',
                      border: '1px solid ' + (hasMapping ? '#DDD6FE' : '#FDE68A'),
                    }}
                  >
                    <span>{hasMapping ? '🧩' : '⚠️'}</span>
                    <span>
                      {hasMapping
                        ? mappedCount + ' anahtar alan eşlendi — belge üretimine hazır'
                        : 'Anahtar alanlar henüz eşlenmedi. Çıktı üretmek için eşleme gerekli.'}
                    </span>
                  </div>
                )}

                {/* Aksiyon butonları — etiketli */}
                <div
                  style={{
                    marginTop: 12,
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
                >
                  {isDocx && (
                    <button
                      onClick={() => setMapping({ tpl: t, file: null })}
                      style={textBtn(
                        hasMapping ? '#7C3AED' : '#B45309',
                        hasMapping ? '#EDE9FE' : '#FEF3C7'
                      )}
                    >
                      🧩 {hasMapping ? 'Eşlemeyi Düzenle' : 'Alanları Eşle'}
                    </button>
                  )}
                  <button onClick={() => setEditTpl(t)} style={textBtn('#0F766E', '#CCFBF1')}>
                    ✏️ Düzenle
                  </button>
                  <a
                    href={'/api/templates/' + t._id + '/download'}
                    style={{ ...textBtn('#15803D', '#DCFCE7'), textDecoration: 'none' }}
                  >
                    ⬇ İndir
                  </a>
                  <button
                    onClick={() => handleToggle(t, 'isDefault')}
                    style={textBtn(
                      t.isDefault ? '#B45309' : '#6B7280',
                      t.isDefault ? '#FEF3C7' : '#F3F4F6'
                    )}
                  >
                    ★ {t.isDefault ? 'Varsayılanı Kaldır' : 'Varsayılan Yap'}
                  </button>
                  <button
                    onClick={() => handleToggle(t, 'isActive')}
                    style={textBtn(
                      t.isActive ? '#1E40AF' : '#6B7280',
                      t.isActive ? '#DBEAFE' : '#F3F4F6'
                    )}
                  >
                    {t.isActive ? '✓ Aktif' : '○ Pasif'}
                  </button>
                  <button onClick={() => handleDelete(t)} style={textBtn('#DC2626', '#FEE2E2')}>
                    ✕ Sil
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

      {editTpl && (
        <AddTemplateModal
          editTemplate={editTpl}
          onClose={() => setEditTpl(null)}
          onSaved={(tpl, needsRemap) => {
            setEditTpl(null);
            load();
            if (needsRemap && tpl && tpl.file && tpl.file.extension === 'docx') {
              showMsg('Şablon güncellendi — eşleme sıfırlandı, yeniden eşleyin.', 'ok');
              setMapping({ tpl, file: null });
            } else {
              showMsg('Şablon güncellendi.', 'ok');
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

// Metin etiketli aksiyon butonu (kart alt satırı)
function textBtn(color, bg) {
  return {
    padding: '7px 13px',
    borderRadius: 8,
    border: '1px solid ' + color + '33',
    background: bg,
    color: color,
    cursor: 'pointer',
    fontSize: 12.5,
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  };
}

function AddTemplateModal(props) {
  const {
    onClose,
    onSaved,
    isUniAdmin,
    isFacMgr,
    isDeptMgr,
    activeDepartment,
    currentUser,
    editTemplate,
  } = props;
  const isEdit = !!editTemplate;
  const [name, setName] = useState(editTemplate?.name || '');
  const [description, setDescription] = useState(editTemplate?.description || '');
  const [module_, setModule] = useState(editTemplate?.module || 'erasmus');
  const [docType, setDocType] = useState(editTemplate?.docType || (isEdit ? 'default' : 'gidis'));
  const [file, setFile] = useState(null);
  const [isDefault, setIsDefault] = useState(!!editTemplate?.isDefault);
  const [isActive, setIsActive] = useState(editTemplate ? editTemplate.isActive !== false : true);
  const [scope, setScope] = useState(
    editTemplate?.scope || (isUniAdmin ? 'university' : 'department')
  );
  const [scopeDeptId, setScopeDeptId] = useState(
    editTemplate?.departmentId || activeDepartment || ''
  );
  const [scopeFacId, setScopeFacId] = useState(
    editTemplate?.facultyId || currentUser?.facultyId || ''
  );
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

  // Düzenlemede modül veya belge türü değişimi eşlemeyi sıfırlar — kullanıcıyı uyar
  const mappingWillReset =
    isEdit &&
    (module_ !== editTemplate.module ||
      (docType || 'default') !== (editTemplate.docType || 'default'));
  const hadMapping = isEdit && (editTemplate.fields || []).some((f) => f.variable);

  const authHeaders = () => {
    const t = localStorage.getItem('caku_auth_token');
    return t ? { Authorization: 'Bearer ' + t } : {};
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) return setError('Şablon adı en az 2 karakter.');
    if (!isEdit && !file) return setError('Bir dosya seçin.');
    if (file) {
      const ext = '.' + (file.name.split('.').pop() || '').toLocaleLowerCase('tr');
      if (!SB_ALLOWED_EXT.includes(ext))
        return setError('Sadece şu uzantılar destekleniyor: ' + SB_ALLOWED_EXT.join(', '));
    }

    setSaving(true);
    try {
      if (isEdit) {
        // 1) Dosya değiştirilmişse önce onu yükle (fields sıfırlanır)
        let replacedFile = null;
        if (file) {
          const ffd = new FormData();
          ffd.append('file', file);
          const fr = await fetch('/api/templates/' + editTemplate._id + '/replace-file', {
            method: 'POST',
            headers: authHeaders(),
            credentials: 'include',
            body: ffd,
          });
          replacedFile = await fr.json().catch(() => ({}));
          if (!fr.ok) throw new Error(replacedFile.error || 'Dosya değiştirilemedi');
        }
        // 2) Meta güncelle
        const body = {
          name: name.trim(),
          description: description.trim(),
          module: module_,
          docType: docType || 'default',
          isDefault: !!isDefault,
          isActive: !!isActive,
          scope,
        };
        if (scope === 'department') body.departmentId = scopeDeptId;
        if (scope === 'faculty') body.facultyId = scopeFacId;
        const r = await fetch('/api/templates/' + editTemplate._id + '/update', {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Güncellenemedi');
        // Eşleme sıfırlandıysa (modül/tür/dosya değişti) sihirbazı aç
        const cleared = d.clearedMapping || !!file;
        onSaved(d, cleared && d.file && d.file.extension === 'docx' ? true : false);
        return;
      }

      // Oluşturma akışı
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', name.trim());
      fd.append('description', description.trim());
      fd.append('module', module_);
      fd.append('docType', docType || 'default');
      fd.append('isDefault', String(!!isDefault));
      fd.append('isActive', String(!!isActive));
      fd.append('scope', scope);
      if (scope === 'department') fd.append('departmentId', scopeDeptId);
      if (scope === 'faculty') fd.append('facultyId', scopeFacId);
      const r = await fetch('/api/templates', {
        method: 'POST',
        headers: authHeaders(),
        body: fd,
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Yüklenemedi');
      onSaved(d, file);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SB_Modal
      open={true}
      onClose={onClose}
      title={isEdit ? 'Şablonu Düzenle' : 'Yeni Şablon'}
      width={560}
    >
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
            onChange={(e) => {
              const mod = e.target.value;
              setModule(mod);
              // Modül değişince belge türünü o modülün ilk türüne çek
              const types = docTypesOf(mod);
              setDocType(types[0] ? types[0].id : 'default');
            }}
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
        {docTypesOf(module_).length > 1 && (
          <SB_FormField label="Belge Türü *">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
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
              {docTypesOf(module_).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 4 }}>
              Aynı modüle birden çok belge atanabilir (örn. Erasmus gidiş ve dönüş ayrı
              belgelerdir). Her belge türü için ayrı şablon yükleyin.
            </div>
          </SB_FormField>
        )}
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
        <SB_FormField
          label={
            isEdit
              ? 'Dosyayı Değiştir (isteğe bağlı — .docx, .doc, .pdf, .xlsx, .xls)'
              : 'Dosya * (.docx, .doc, .pdf, .xlsx, .xls — maks 10 MB)'
          }
        >
          {isEdit && editTemplate.file && (
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
              Mevcut: <b>{editTemplate.file.originalName}</b> (
              {(editTemplate.file.extension || '').toUpperCase()}). Değiştirmek için yeni dosya
              seçin; bırakırsanız aynı kalır.
            </div>
          )}
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
          {isEdit && (file || mappingWillReset) && hadMapping && (
            <div
              style={{
                marginTop: 8,
                padding: '8px 12px',
                borderRadius: 8,
                background: '#FEF3C7',
                color: '#92400E',
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid #FDE68A',
              }}
            >
              ⚠️ {file ? 'Yeni dosya' : 'Modül/belge türü değişimi'} nedeniyle mevcut alan eşlemeniz
              sıfırlanacak — kaydettikten sonra 🧩 ile yeniden eşlemeniz gerekir.
            </div>
          )}
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
            {saving
              ? isEdit
                ? 'Kaydediliyor…'
                : 'Yükleniyor…'
              : isEdit
                ? 'Değişiklikleri Kaydet'
                : 'Şablonu Kaydet'}
          </SB_Btn>
        </div>
      </form>
    </SB_Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// Alan Eşleme Sihirbazı — .docx şablonundaki yer tutucuları
// ({{Alan Adı}} biçiminde) tespit eder; yükleyen yetkili
// her birini modülün değişkenlerine ya da sabit metne eşler. Eşleme
// document_templates.fields'a kaydedilir; hedef modül çıktı üretirken
// window.TemplateEngine.generateDocx bu eşlemeyi kullanır.
// ══════════════════════════════════════════════════════════════
function FieldMappingModal({ tpl, localFile, headers, onClose, onSaved }) {
  const [fields, setFields] = useState(null); // null=yükleniyor
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const vars = window.templateVarsFor
    ? window.templateVarsFor(tpl.module, tpl.docType)
    : { static: [], row: [] };

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

  // Aynı token'ın (örn. aynı sayının) diğer tekrarlarına da bu eşlemeyi uygula
  const applyToAll = (i) =>
    setFields((prev) => {
      const src = prev[i];
      return prev.map((f) =>
        f.token === src.token ? { ...f, variable: src.variable, value: src.value } : f
      );
    });

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/templates/' + tpl._id + '/update', {
        method: 'POST',
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
          Belgede yer tutucu bulunamadı. Şablonda değişken alanları çift süslü parantez içinde{' '}
          <b>{'{{Ders Kodu}}'}</b>, <b>{'{{Öğrenci No}}'}</b> biçiminde yazın (içinde boşluk ve
          Türkçe harf serbest) ve şablonu yeniden yükleyin.
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
                {f.variable &&
                  fields.filter((x) => x.token === f.token).length > 1 &&
                  fields.some((x) => x.token === f.token && x.variable !== f.variable) && (
                    <button
                      type="button"
                      onClick={() => applyToAll(i)}
                      style={{
                        marginTop: 5,
                        border: 'none',
                        background: 'transparent',
                        color: '#7C3AED',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      ⧉ "{f.token}" tekrarlarının tümüne uygula
                    </button>
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
