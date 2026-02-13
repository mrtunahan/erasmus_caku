import React from 'react';
import { C } from '../../../constants/theme';
import { STATUS_LABELS, STATUS_COLORS } from '../constants';

const ApplicationList = ({ applications, onSelect, onDelete, isAdmin, loading }) => {
  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>Yükleniyor...</div>;
  }

  if (applications.length === 0) {
    return (
      <div style={{
        background: 'white', borderRadius: 12, padding: 40,
        border: `1px solid ${C.border}`, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 8 }}>
          Henüz başvuru yok
        </div>
        <div style={{ fontSize: 13, color: C.textMuted }}>
          Yeni bir ders intibak başvurusu oluşturarak başlayın.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white', borderRadius: 12,
      border: `1px solid ${C.border}`, overflow: 'hidden',
    }}>
      {/* Başlık */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isAdmin ? '1fr 160px 180px 120px 100px' : '1fr 180px 120px 100px',
        padding: '12px 20px', background: C.bg,
        borderBottom: `1px solid ${C.border}`,
        fontSize: 12, fontWeight: 700, color: C.navy, textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}>
        {isAdmin && <span>Öğrenci</span>}
        <span>Üniversite</span>
        <span>Ders Sayısı</span>
        <span>Durum</span>
        <span style={{ textAlign: 'center' }}>İşlem</span>
      </div>

      {applications.map((app, idx) => {
        const st = STATUS_COLORS[app.status] || STATUS_COLORS.taslak;
        const courseCount = (app.courseMatches || []).length;
        const date = app.createdAt?.toDate ? app.createdAt.toDate().toLocaleDateString('tr-TR') : '';

        return (
          <div
            key={app.id}
            style={{
              display: 'grid',
              gridTemplateColumns: isAdmin ? '1fr 160px 180px 120px 100px' : '1fr 180px 120px 100px',
              padding: '14px 20px', alignItems: 'center',
              borderBottom: idx < applications.length - 1 ? `1px solid ${C.borderLight || C.border}` : 'none',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
            onClick={() => onSelect(app)}
            onMouseEnter={e => { e.currentTarget.style.background = C.bg; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
          >
            {isAdmin && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>{app.studentName}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{app.studentNo}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>
                {app.otherUniversity || '-'}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{date}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>
              {courseCount} ders
              <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 6 }}>
                ({(app.courseMatches || []).reduce((s, c) => s + (parseInt(c.extAKTS) || 0), 0)} AKTS)
              </span>
            </div>
            <span style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: 20,
              fontSize: 12, fontWeight: 600,
              background: st.bg, color: st.color,
            }}>
              {STATUS_LABELS[app.status] || app.status}
            </span>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => onSelect(app)}
                style={{
                  padding: '6px 12px', border: `1px solid ${C.border}`,
                  borderRadius: 6, background: 'white', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, color: C.blue,
                }}
              >
                {app.status === 'taslak' ? 'Düzenle' : 'Görüntüle'}
              </button>
              {(app.status === 'taslak') && (
                <button
                  onClick={() => {
                    if (confirm('Bu başvuruyu silmek istediğinizden emin misiniz?'))
                      onDelete(app.id);
                  }}
                  style={{
                    padding: '6px 10px', border: `1px solid ${C.border}`,
                    borderRadius: 6, background: 'white', cursor: 'pointer',
                    fontSize: 12, color: '#EF4444',
                  }}
                >
                  Sil
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ApplicationList;
