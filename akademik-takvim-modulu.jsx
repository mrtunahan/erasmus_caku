// ══════════════════════════════════════════════════════════════
// ÇAKÜ - Akademik Takvim Yönetimi
//   • Fakülte yetkilileri  → fakülte geneli akademik takvimi belirler
//   • Bölüm yetkilileri    → kendi bölümleri için duyuru/etkinlik ekler
//   • Üniversite yetkilisi → üniversite geneli etkinlik ekler / tümünü yönetir
//   Tüm bu kayıtlar öğrencilerin "Benim Sayfam" takviminde görünür.
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const ATModal = window.Modal;
const ATInput = window.Input;
const ATFormField = window.FormField;
const ATBtn = window.Btn;
const ATDBWrite = window.DBWrite || {};

const AT_KIND_LABEL = {
  takvim: 'Akademik Takvim',
  duyuru: 'Duyuru',
  etkinlik: 'Etkinlik',
  sinav: 'Sınav',
  tatil: 'Tatil',
};
const AT_KIND_COLOR = {
  takvim: { bg: '#EEF2FF', text: '#4338CA' },
  duyuru: { bg: '#FEF3C7', text: '#92400E' },
  etkinlik: { bg: '#DCFCE7', text: '#166534' },
  sinav: { bg: '#FEE2E2', text: '#B91C1C' },
  tatil: { bg: '#E0F2FE', text: '#075985' },
};
const AT_SCOPE_LABEL = {
  university: 'Üniversite Geneli',
  faculty: 'Fakülte Geneli',
  department: 'Bölüm',
};

function atFormatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch (_) {
    return iso || '';
  }
}

function AkademikTakvimApp({ currentUser, activeDepartment, departmentInfo }) {
  const [events, setEvents] = useState([]);
  const [deptMap, setDeptMap] = useState({}); // deptId → { name, facultyId }
  const [facultyNames, setFacultyNames] = useState({}); // facultyId → name
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | event
  const [form, setForm] = useState({ title: '', date: '', kind: 'takvim', description: '' });
  const [saving, setSaving] = useState(false);

  // ── Rol çözümü (öncelik: üni > fakülte > bölüm) ──
  const isUniAdmin = !!currentUser?.isUniversityAdmin;
  const isFacMgr = !isUniAdmin && !!currentUser?.isFacultyManager;
  const isDeptMgr =
    !isUniAdmin &&
    !isFacMgr &&
    (currentUser?.role === 'bolum_yetkilisi' || !!currentUser?.isDeptManager);
  const canAccess = isUniAdmin || isFacMgr || isDeptMgr;

  const myFacultyId = currentUser?.facultyId || deptMap[activeDepartment]?.facultyId || '';
  const myDeptId = activeDepartment || currentUser?.departmentId || '';

  // Kullanıcının yeni kayıt kapsamı
  const myScope = isUniAdmin ? 'university' : isFacMgr ? 'faculty' : 'department';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [evRaw, deptsRaw, facsRaw] = await Promise.all([
        window.apiRead('akademik_takvim'),
        window.apiRead('departments'),
        window.apiRead('faculties').catch(() => []),
      ]);
      const dMap = {};
      (deptsRaw || []).forEach((d) => {
        const id = d.id || d._docId;
        if (id) dMap[id] = { name: d.name || id, facultyId: d.facultyId || '' };
      });
      // Sabit listedeki çekirdek bölümleri de ekle (ad için)
      (window.DEPARTMENTS || []).forEach((d) => {
        if (d.id && !dMap[d.id]) dMap[d.id] = { name: d.name, facultyId: d.facultyId || '' };
      });
      setDeptMap(dMap);
      const fMap = {};
      (facsRaw || []).forEach((f) => {
        const id = f.id || f._docId;
        if (id) fMap[id] = f.name || id;
      });
      setFacultyNames(fMap);
      setEvents(Array.isArray(evRaw) ? evRaw : []);
    } catch (e) {
      console.error('Akademik takvim yüklenemedi:', e);
    } finally {
      setLoading(false);
    }
  }, [activeDepartment]);

  useEffect(() => {
    if (canAccess) loadData();
    else setLoading(false);
  }, [canAccess, loadData]);

  // Bu kullanıcının bağlamına ait fakültedeki bölümler
  const facultyDeptIds = useMemo(() => {
    const set = new Set();
    if (myFacultyId) {
      Object.keys(deptMap).forEach((id) => {
        if (deptMap[id].facultyId === myFacultyId) set.add(id);
      });
    }
    return set;
  }, [deptMap, myFacultyId]);

  // Bir kaydı düzenleyebilir mi?
  const canManage = useCallback(
    (ev) => {
      if (isUniAdmin) return true;
      if (isFacMgr) return ev.scope === 'faculty' && ev.facultyId === myFacultyId;
      if (isDeptMgr) return ev.scope === 'department' && ev.departmentId === myDeptId;
      return false;
    },
    [isUniAdmin, isFacMgr, isDeptMgr, myFacultyId, myDeptId]
  );

  // Görünür kayıtlar: kullanıcı kendi bağlamındaki tüm takvimi görür
  const visibleEvents = useMemo(() => {
    const list = events.filter((ev) => {
      if (isUniAdmin) return true;
      if (ev.scope === 'university') return true; // herkes üniversite genelini görür
      if (isFacMgr) {
        return (
          (ev.scope === 'faculty' && ev.facultyId === myFacultyId) ||
          (ev.scope === 'department' && facultyDeptIds.has(ev.departmentId))
        );
      }
      if (isDeptMgr) {
        return (
          (ev.scope === 'faculty' && ev.facultyId === myFacultyId) ||
          (ev.scope === 'department' && ev.departmentId === myDeptId)
        );
      }
      return false;
    });
    return list.slice().sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });
  }, [events, isUniAdmin, isFacMgr, isDeptMgr, myFacultyId, myDeptId, facultyDeptIds]);

  const startNew = () => {
    setEditing('new');
    setForm({
      title: '',
      date: '',
      kind: isDeptMgr ? 'duyuru' : 'takvim',
      description: '',
    });
  };

  const startEdit = (ev) => {
    setEditing(ev);
    setForm({
      title: ev.title || '',
      date: ev.date || '',
      kind: ev.kind || 'takvim',
      description: ev.description || '',
    });
  };

  const handleSave = async () => {
    if (!form.title.trim()) return alert('Etkinlik başlığı zorunludur.');
    if (!form.date) return alert('Tarih zorunludur.');
    setSaving(true);
    try {
      const base = {
        title: form.title.trim(),
        date: form.date,
        kind: form.kind,
        description: (form.description || '').trim(),
        updatedAt: new Date().toISOString(),
      };
      if (editing === 'new') {
        // Yeni kayıt kullanıcının kapsamıyla damgalanır
        const data = {
          ...base,
          scope: myScope,
          facultyId: myScope === 'faculty' ? myFacultyId : '',
          departmentId: myScope === 'department' ? myDeptId : '',
          createdByName: currentUser?.name || currentUser?.identifier || '',
          createdAt: base.updatedAt,
        };
        await ATDBWrite.add('akademik_takvim', data);
        if (window.audit)
          window.audit('akademik_takvim_create', 'akademik_takvim', '', {
            meta: { title: data.title, scope: data.scope },
          });
      } else {
        // Düzenleme: kapsam/sahiplik alanları korunur
        await ATDBWrite.set('akademik_takvim', editing.id, base, true);
        if (window.audit)
          window.audit('akademik_takvim_update', 'akademik_takvim', editing.id, {
            meta: { title: base.title },
          });
      }
      setEditing(null);
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Kaydedilemedi: ' + (e.message || 'bilinmeyen hata'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ev) => {
    if (!confirm(`"${ev.title}" etkinliğini silmek istediğinize emin misiniz?`)) return;
    try {
      await ATDBWrite.remove('akademik_takvim', ev.id);
      if (window.audit)
        window.audit('akademik_takvim_delete', 'akademik_takvim', ev.id, {
          meta: { title: ev.title },
        });
      setEvents((prev) => prev.filter((x) => x.id !== ev.id));
    } catch (e) {
      console.error(e);
      alert('Silinemedi: ' + (e.message || 'bilinmeyen hata'));
    }
  };

  const scopeBadgeText = (ev) => {
    if (ev.scope === 'department') {
      const name = deptMap[ev.departmentId]?.name || ev.departmentId || 'Bölüm';
      return name;
    }
    if (ev.scope === 'faculty') {
      return facultyNames[ev.facultyId] || 'Fakülte Geneli';
    }
    return AT_SCOPE_LABEL[ev.scope] || 'Üniversite Geneli';
  };

  if (!canAccess) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: '#DC2626', fontSize: 20, marginBottom: 8 }}>Erişim Reddedildi</h2>
        <p style={{ color: '#6B7280' }}>
          Akademik takvim yönetimi yalnızca fakülte/bölüm/üniversite yetkililerine açıktır.
        </p>
      </div>
    );
  }

  const scopeHint = isUniAdmin
    ? 'Eklediğiniz etkinlikler üniversite genelinde tüm öğrencilere görünür.'
    : isFacMgr
      ? 'Belirlediğiniz akademik takvim, fakültenizdeki tüm bölümlerin öğrencilerine görünür.'
      : 'Eklediğiniz duyuru/etkinlikler bölümünüzdeki öğrencilere görünür.';

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#1F2937', maxWidth: 920 }}>
      {/* Başlık */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Akademik Takvim</h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>{scopeHint}</p>
        </div>
        <ATBtn onClick={startNew}>
          {isDeptMgr ? '+ Duyuru / Etkinlik Ekle' : '+ Takvim Etkinliği Ekle'}
        </ATBtn>
      </div>

      {isDeptMgr && (
        <div
          style={{
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 12.5,
            color: '#4B5563',
            margin: '12px 0 16px',
          }}
        >
          Aktif bölüm:{' '}
          <strong>{departmentInfo?.name || deptMap[myDeptId]?.name || myDeptId}</strong>. Fakülte
          geneli akademik takvim (yalnızca okunur) ve bölümünüzün kayıtları aşağıda listelenir.
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6B7280', padding: 24, textAlign: 'center' }}>Yükleniyor…</p>
      ) : visibleEvents.length === 0 ? (
        <div
          style={{
            background: 'white',
            border: '1px dashed #D1D5DB',
            borderRadius: 12,
            padding: '40px 24px',
            textAlign: 'center',
            color: '#6B7280',
            marginTop: 8,
          }}
        >
          Henüz tanımlı bir etkinlik yok. Yukarıdaki butonla ilk etkinliği ekleyin.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {visibleEvents.map((ev) => {
            const kc = AT_KIND_COLOR[ev.kind] || AT_KIND_COLOR.takvim;
            const editable = canManage(ev);
            return (
              <div
                key={ev.id}
                style={{
                  background: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 58,
                    textAlign: 'center',
                    padding: '8px 0',
                    borderRadius: 10,
                    background: '#F3F4F6',
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', lineHeight: 1 }}>
                    {(() => {
                      try {
                        return new Date(ev.date).getDate();
                      } catch (_) {
                        return '—';
                      }
                    })()}
                  </div>
                  <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase' }}>
                    {(() => {
                      try {
                        return new Date(ev.date).toLocaleDateString('tr-TR', { month: 'short' });
                      } catch (_) {
                        return '';
                      }
                    })()}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#1F2937' }}>
                      {ev.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: kc.bg,
                        color: kc.text,
                      }}
                    >
                      {AT_KIND_LABEL[ev.kind] || ev.kind}
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
                      {scopeBadgeText(ev)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 4 }}>
                    {atFormatDate(ev.date)}
                    {ev.description ? ` · ${ev.description}` : ''}
                  </div>
                </div>

                {editable && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => startEdit(ev)}
                      title="Düzenle"
                      style={atIconBtnStyle('#E5E7EB', '#6B7280')}
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDelete(ev)}
                      title="Sil"
                      style={atIconBtnStyle('#FECACA', '#DC2626')}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Ekle / Düzenle Modal */}
      <ATModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Yeni Etkinlik' : 'Etkinliği Düzenle'}
        width={520}
      >
        <div>
          <ATFormField label="Başlık *">
            <ATInput
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Örn: Güz Dönemi Final Sınavları"
            />
          </ATFormField>
          <ATFormField label="Tarih *">
            <ATInput
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </ATFormField>
          <ATFormField label="Tür">
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
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
              <option value="takvim">Akademik Takvim</option>
              <option value="duyuru">Duyuru</option>
              <option value="etkinlik">Etkinlik</option>
              <option value="sinav">Sınav</option>
              <option value="tatil">Tatil</option>
            </select>
          </ATFormField>
          <ATFormField label="Açıklama">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="İsteğe bağlı kısa açıklama"
              rows={3}
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
          </ATFormField>
          <div
            style={{
              fontSize: 12,
              color: '#6B7280',
              background: '#F9FAFB',
              borderRadius: 8,
              padding: '8px 12px',
              marginBottom: 12,
            }}
          >
            Kapsam: <strong>{AT_SCOPE_LABEL[myScope]}</strong> — bu etkinlik{' '}
            {myScope === 'university'
              ? 'tüm öğrencilere'
              : myScope === 'faculty'
                ? 'fakültenizdeki tüm öğrencilere'
                : 'bölümünüzdeki öğrencilere'}{' '}
            görünür.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <ATBtn variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
              İptal
            </ATBtn>
            <ATBtn onClick={handleSave} disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </ATBtn>
          </div>
        </div>
      </ATModal>
    </div>
  );
}

function atIconBtnStyle(borderColor, color) {
  return {
    width: 30,
    height: 30,
    borderRadius: 6,
    border: '1px solid ' + borderColor,
    background: 'white',
    color: color,
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

window.AkademikTakvimApp = AkademikTakvimApp;
