// ══════════════════════════════════════════════════════════════
// Audit Log Görüntüleyici (Admin)
// ══════════════════════════════════════════════════════════════
const { useState, useEffect, useMemo } = React;

const AL = {
  primary: '#0891B2',
  primaryPale: '#ECFEFF',
  navy: '#1E293B',
  text: '#334155',
  textMuted: '#64748B',
  border: '#E5E7EB',
};

// Defansif render: server-side audit girişlerinde bazı alanlar obje olabilir
// (örn. actor = {userId, username, role, ip, userAgent}). React doğrudan
// obje render edemez → bu helper güvenli string'e çevirir.
const toText = (v) => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    // Aktör objeleri için anlamlı kısa gösterim
    if (v.username || v.userId || v.name) return String(v.username || v.name || v.userId);
    try {
      return JSON.stringify(v);
    } catch (_e) {
      return '[obj]';
    }
  }
  return String(v);
};

function AuditLogModuluApp({ currentUser, activeDepartment }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterTarget, setFilterTarget] = useState('all');

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const docs = await window.apiRead('audit_logs');
        const sorted = (docs || []).sort((a, b) =>
          (b.createdAt || '').localeCompare(a.createdAt || '')
        );
        setLogs(sorted);
      } catch (e) {
        console.error('Audit log yüklenemedi:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const actionOptions = useMemo(() => {
    const s = new Set();
    logs.forEach((l) => {
      const t = toText(l.action);
      if (t) s.add(t);
    });
    return Array.from(s).sort();
  }, [logs]);

  const targetOptions = useMemo(() => {
    const s = new Set();
    logs.forEach((l) => {
      const t = toText(l.target);
      if (t) s.add(t);
    });
    return Array.from(s).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterAction !== 'all' && toText(l.action) !== filterAction) return false;
      if (filterTarget !== 'all' && toText(l.target) !== filterTarget) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay =
          `${toText(l.actor)} ${toText(l.action)} ${toText(l.target)} ${toText(l.targetId)}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [logs, search, filterAction, filterTarget]);

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: AL.textMuted, fontSize: 14 }}>
          Bu modüle yalnızca fakülte yöneticisi erişebilir.
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #0891B2, #06B6D4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: AL.navy, margin: 0 }}>Audit Log</h1>
          <p style={{ fontSize: 12, color: AL.textMuted, margin: 0 }}>
            Kritik aksiyon kayıtları — {logs.length} olay
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Aktör, aksiyon, hedef ara..."
          style={{
            flex: 1,
            minWidth: 200,
            padding: '9px 12px',
            borderRadius: 8,
            border: `1px solid ${AL.border}`,
            fontSize: 13,
            outline: 'none',
          }}
        />
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          style={{
            padding: '9px 12px',
            borderRadius: 8,
            border: `1px solid ${AL.border}`,
            fontSize: 13,
            background: 'white',
            cursor: 'pointer',
          }}
        >
          <option value="all">Tüm Aksiyonlar</option>
          {actionOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={filterTarget}
          onChange={(e) => setFilterTarget(e.target.value)}
          style={{
            padding: '9px 12px',
            borderRadius: 8,
            border: `1px solid ${AL.border}`,
            fontSize: 13,
            background: 'white',
            cursor: 'pointer',
          }}
        >
          <option value="all">Tüm Hedefler</option>
          {targetOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div
        style={{
          background: 'white',
          borderRadius: 12,
          border: `1px solid ${AL.border}`,
          overflow: 'auto',
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: AL.textMuted }}>Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: AL.textMuted }}>
            Kayıt bulunamadı.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: `2px solid ${AL.border}` }}>
                {['Tarih', 'Aktör', 'Rol', 'Aksiyon', 'Hedef', 'Kayıt ID', 'Detay'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: AL.navy,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((l, i) => (
                <tr key={l.id || i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: AL.textMuted }}>
                    {l.createdAt ? new Date(l.createdAt).toLocaleString('tr-TR') : ''}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: AL.text }}>
                    {toText(l.actor) || '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: AL.textMuted }}>
                    {l.actorRole === 'admin'
                      ? 'Admin'
                      : l.actorRole === 'bolum_yetkilisi'
                        ? 'Bölüm Yetk.'
                        : l.actorRole === 'professor'
                          ? 'Akademisyen'
                          : toText(l.actorRole) || '—'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        background: AL.primaryPale,
                        color: AL.primary,
                      }}
                    >
                      {toText(l.action) || toText(l.kind) || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: AL.text }}>
                    {toText(l.target) || toText(l.path) || '—'}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      fontFamily: 'monospace',
                      fontSize: 11,
                      color: AL.textMuted,
                    }}
                  >
                    {toText(l.targetId) || toText(l.requestId) || '—'}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      fontSize: 11,
                      color: AL.textMuted,
                      maxWidth: 280,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={(() => {
                      try {
                        return JSON.stringify(l.meta || {});
                      } catch {
                        return '';
                      }
                    })()}
                  >
                    {l.meta && Object.keys(l.meta).length > 0 ? JSON.stringify(l.meta) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filtered.length > 500 && (
          <div
            style={{
              padding: 12,
              textAlign: 'center',
              color: AL.textMuted,
              fontSize: 11,
              borderTop: `1px solid ${AL.border}`,
            }}
          >
            İlk 500 kayıt gösteriliyor. Daha eski kayıtlar için filtre kullanın.
          </div>
        )}
      </div>
    </div>
  );
}

window.AuditLogModuluApp = AuditLogModuluApp;
