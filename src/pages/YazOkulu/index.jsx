import React, { useState, useEffect } from 'react';
import { C } from '../../constants/theme';
import YazOkuluService from './service';
import StudentManagement from './components/StudentManagement';

const TABS = [
  { id: 'students', label: 'Öğrenci Yönetimi', icon: '👥', adminOnly: true },
  { id: 'applications', label: 'Başvurular', icon: '📋', adminOnly: false },
];

const YazOkuluPage = ({ currentUser }) => {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'professor';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'students' : 'applications');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Öğrencileri yükle
  useEffect(() => {
    const load = async () => {
      try {
        const data = await YazOkuluService.getStudents();
        setStudents(data);
      } catch (err) {
        console.error('Öğrenciler yüklenemedi:', err);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Admin: Öğrenci ekle
  const handleAddStudent = async (student) => {
    const saved = await YazOkuluService.addStudent(student);
    setStudents(prev => [...prev, saved]);
  };

  // Admin: Öğrenci sil
  const handleDeleteStudent = async (id) => {
    await YazOkuluService.deleteStudent(id);
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  // Admin: Şifre sıfırla
  const handleResetPassword = async (id, newPassword) => {
    await YazOkuluService.resetPassword(id, newPassword);
    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, password: newPassword } : s
    ));
  };

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);

  return (
    <div>
      {/* Başlık */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: C.navy,
          fontFamily: "'Playfair Display', serif", marginBottom: 4,
        }}>
          Yaz Okulu
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14 }}>
          Yaz dönemi ders intibak işlemleri ve öğrenci yönetimi
        </p>
      </div>

      {/* Tab navigasyonu */}
      <div style={{
        display: 'flex', gap: 4, background: C.bg,
        borderRadius: 12, padding: 4, marginBottom: 24,
        width: 'fit-content',
      }}>
        {visibleTabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: active ? 'white' : 'transparent',
                color: active ? C.navy : C.textMuted,
                fontSize: 14, fontWeight: active ? 700 : 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab içerikleri */}
      {activeTab === 'students' && isAdmin && (
        <StudentManagement
          students={students}
          onAdd={handleAddStudent}
          onDelete={handleDeleteStudent}
          onResetPassword={handleResetPassword}
          loading={loading}
        />
      )}

      {activeTab === 'applications' && (
        <div style={{
          background: 'white', borderRadius: 12, padding: 40,
          border: `1px solid ${C.border}`, textAlign: 'center',
          color: C.textMuted,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>
            Başvuru Modülü
          </div>
          <div style={{ fontSize: 14 }}>
            Öğrenci başvuru formu bir sonraki adımda eklenecek.
          </div>
        </div>
      )}
    </div>
  );
};

export default YazOkuluPage;
