import React, { useState } from 'react';
import { C } from '../../../constants/theme';
import { Card, Btn, Input } from '../../../components/ui';

const StudentManagement = ({ students, onAdd, onDelete, onResetPassword, loading }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudentNo, setNewStudentNo] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Rastgele 4 haneli şifre üret
  const generatePassword = () => {
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  const handleAdd = async () => {
    if (!newStudentNo.trim() || !newStudentName.trim()) return;
    setAdding(true);
    try {
      const pw = newPassword || generatePassword();
      await onAdd({
        studentNo: newStudentNo.trim(),
        studentName: newStudentName.trim(),
        password: pw,
      });
      setNewStudentNo('');
      setNewStudentName('');
      setNewPassword('');
      setShowAddForm(false);
    } catch (err) {
      alert('Öğrenci eklenemedi: ' + err.message);
    }
    setAdding(false);
  };

  const handleReset = async (student) => {
    const pw = generatePassword();
    await onResetPassword(student.id, pw);
  };

  const filtered = students.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.studentNo.toLowerCase().includes(q) || s.studentName.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Başlık + Ekle butonu */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 4 }}>
            Öğrenci Yönetimi
          </h2>
          <p style={{ fontSize: 13, color: C.textMuted }}>
            Yaz okulu öğrencilerini ekleyin ve şifrelerini yönetin
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '10px 20px', border: 'none', borderRadius: 10,
            background: showAddForm ? C.textMuted : `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`,
            color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {showAddForm ? 'Kapat' : '+ Öğrenci Ekle'}
        </button>
      </div>

      {/* Yeni öğrenci formu */}
      {showAddForm && (
        <div style={{
          background: 'white', borderRadius: 12, padding: 20,
          border: `1px solid ${C.border}`, marginBottom: 20,
          display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.navy, display: 'block', marginBottom: 4 }}>
              Öğrenci No
            </label>
            <input
              value={newStudentNo}
              onChange={e => setNewStudentNo(e.target.value)}
              placeholder="Ör: FO006"
              style={{
                width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`,
                borderRadius: 8, fontSize: 14, outline: 'none',
              }}
            />
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.navy, display: 'block', marginBottom: 4 }}>
              Ad Soyad
            </label>
            <input
              value={newStudentName}
              onChange={e => setNewStudentName(e.target.value)}
              placeholder="Ör: Furkan ÖZEL"
              style={{
                width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`,
                borderRadius: 8, fontSize: 14, outline: 'none',
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.navy, display: 'block', marginBottom: 4 }}>
              Şifre (boş bırakılırsa otomatik)
            </label>
            <input
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Otomatik"
              style={{
                width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`,
                borderRadius: 8, fontSize: 14, outline: 'none',
              }}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !newStudentNo.trim() || !newStudentName.trim()}
            style={{
              padding: '10px 24px', border: 'none', borderRadius: 8,
              background: adding ? C.border : C.navy, color: 'white',
              cursor: adding ? 'wait' : 'pointer', fontSize: 14, fontWeight: 600,
              opacity: (!newStudentNo.trim() || !newStudentName.trim()) ? 0.5 : 1,
            }}
          >
            {adding ? 'Ekleniyor...' : 'Ekle'}
          </button>
        </div>
      )}

      {/* Arama */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Öğrenci ara (no veya isim)..."
          style={{
            width: '100%', maxWidth: 400, padding: '10px 14px',
            border: `1px solid ${C.border}`, borderRadius: 10,
            fontSize: 14, outline: 'none',
          }}
        />
      </div>

      {/* Öğrenci listesi */}
      <div style={{
        background: 'white', borderRadius: 12,
        border: `1px solid ${C.border}`, overflow: 'hidden',
      }}>
        {/* Tablo başlığı */}
        <div style={{
          display: 'grid', gridTemplateColumns: '120px 1fr 140px 100px',
          padding: '12px 20px', background: C.bg,
          borderBottom: `1px solid ${C.border}`,
          fontSize: 12, fontWeight: 700, color: C.navy, textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          <span>Öğrenci No</span>
          <span>Ad Soyad</span>
          <span>Şifre</span>
          <span style={{ textAlign: 'center' }}>İşlem</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>
            {searchQuery ? 'Sonuç bulunamadı' : 'Henüz öğrenci eklenmemiş'}
          </div>
        ) : (
          filtered.map((student, idx) => (
            <div
              key={student.id}
              style={{
                display: 'grid', gridTemplateColumns: '120px 1fr 140px 100px',
                padding: '14px 20px', alignItems: 'center',
                borderBottom: idx < filtered.length - 1 ? `1px solid ${C.borderLight}` : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.bg; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
            >
              <span style={{ fontWeight: 700, fontSize: 14, color: C.blue }}>
                {student.studentNo}
              </span>
              <span style={{ fontSize: 14, fontWeight: 500, color: C.navy }}>
                {student.studentName}
              </span>
              <span style={{
                fontFamily: 'monospace', fontSize: 14,
                background: C.bg, padding: '4px 12px', borderRadius: 6,
                border: `1px solid ${C.border}`, display: 'inline-block',
              }}>
                {student.password}
              </span>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                <button
                  onClick={() => handleReset(student)}
                  title="Şifreyi Sıfırla"
                  style={{
                    padding: '6px 14px', border: `1px solid ${C.border}`,
                    borderRadius: 6, background: 'white', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, color: C.blue,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.blueLight || '#DBEAFE'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                >
                  Sıfırla
                </button>
                <button
                  onClick={() => {
                    if (confirm(`"${student.studentName}" silinecek. Emin misiniz?`))
                      onDelete(student.id);
                  }}
                  title="Öğrenciyi Sil"
                  style={{
                    padding: '6px 10px', border: `1px solid ${C.border}`,
                    borderRadius: 6, background: 'white', cursor: 'pointer',
                    fontSize: 12, color: '#EF4444',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}

        {/* Alt bilgi */}
        {filtered.length > 0 && (
          <div style={{
            padding: '10px 20px', background: C.bg,
            borderTop: `1px solid ${C.border}`,
            fontSize: 12, color: C.textMuted,
          }}>
            Toplam {filtered.length} öğrenci
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentManagement;
