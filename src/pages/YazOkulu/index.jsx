import React, { useState, useEffect } from 'react';
import { C } from '../../constants/theme';
import YazOkuluService from './service';
import StudentManagement from './components/StudentManagement';
import ApplicationForm from './components/ApplicationForm';
import ApplicationList from './components/ApplicationList';

const TABS = [
  { id: 'students', label: 'Öğrenci Yönetimi', icon: '👥', adminOnly: true },
  { id: 'applications', label: 'Başvurular', icon: '📋', adminOnly: false },
];

const YazOkuluPage = ({ currentUser }) => {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'professor';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'students' : 'applications');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Başvuru state
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingApp, setEditingApp] = useState(null);

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
    if (isAdmin) load();
    else setLoading(false);
  }, [isAdmin]);

  // Başvuruları yükle
  useEffect(() => {
    const load = async () => {
      try {
        let data;
        if (isAdmin) {
          data = await YazOkuluService.getAllApplications();
        } else {
          data = await YazOkuluService.getApplicationsByStudent(currentUser?.studentNo || currentUser?.email);
        }
        setApplications(data);
      } catch (err) {
        console.error('Başvurular yüklenemedi:', err);
      }
      setAppsLoading(false);
    };
    load();
  }, [isAdmin, currentUser]);

  // ── Öğrenci yönetimi handler'ları ──
  const handleAddStudent = async (student) => {
    const saved = await YazOkuluService.addStudent(student);
    setStudents(prev => [...prev, saved]);
  };

  const handleDeleteStudent = async (id) => {
    await YazOkuluService.deleteStudent(id);
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const handleResetPassword = async (id, newPassword) => {
    await YazOkuluService.resetPassword(id, newPassword);
    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, password: newPassword } : s
    ));
  };

  // ── Başvuru handler'ları ──
  const handleSubmitApp = async (formData) => {
    if (editingApp) {
      await YazOkuluService.updateApplication(editingApp.id, formData);
      setApplications(prev => prev.map(a =>
        a.id === editingApp.id ? { ...a, ...formData } : a
      ));
    } else {
      const saved = await YazOkuluService.createApplication(formData);
      setApplications(prev => [saved, ...prev]);
    }
    setShowForm(false);
    setEditingApp(null);
  };

  const handleSelectApp = (app) => {
    setEditingApp(app);
    setShowForm(true);
  };

  const handleDeleteApp = async (id) => {
    await YazOkuluService.deleteApplication(id);
    setApplications(prev => prev.filter(a => a.id !== id));
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingApp(null);
  };

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);

  return (
    <div>
      {/* Başlık */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
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
        {activeTab === 'applications' && !showForm && (
          <button
            onClick={() => { setEditingApp(null); setShowForm(true); }}
            style={{
              padding: '12px 24px', border: 'none', borderRadius: 10,
              background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`,
              color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(27,42,74,0.25)',
            }}
          >
            + Yeni Başvuru
          </button>
        )}
      </div>

      {/* Tab navigasyonu */}
      {!showForm && (
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
      )}

      {/* Form göster/gizle */}
      {showForm ? (
        <ApplicationForm
          currentUser={currentUser}
          onSubmit={handleSubmitApp}
          onCancel={handleCancelForm}
          initialData={editingApp}
        />
      ) : (
        <>
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
            <ApplicationList
              applications={applications}
              onSelect={handleSelectApp}
              onDelete={handleDeleteApp}
              isAdmin={isAdmin}
              loading={appsLoading}
            />
          )}
        </>
      )}
    </div>
  );
};

export default YazOkuluPage;
