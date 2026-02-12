import React, { useState, useEffect, useCallback } from 'react';
import { C } from '../../constants/theme';
import { Btn, Card, Select, Input, FormField, PlusIcon, CalendarIcon, DownloadIcon } from '../../components/ui';
import { db } from '../../services/firebase';
import {
    CalendarGrid,
    ExamList,
    DraggableCourseCard
} from './components';
import {
    PeriodConfigModal,
    EditExamModal,
    CourseManagementModal
} from './modals';
import {
    getWeekDays,
    assignClassroom,
    assignClassroom as assignSupervisorsToExams // Note: Logic slightly different in legacy, will check
} from './utils';

// Re-implementing specific utils here if not exported or if they need state context
const SinavOtomasyonuPage = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState("sinavlar"); // default to calendar/exams
    const [courses, setCourses] = useState([]);
    const [professors, setProfessors] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState("");
    const [placedExams, setPlacedExams] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals state
    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [editingExam, setEditingExam] = useState(null);

    // 1. Fetch Initial Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Professors
                const profSnap = await db.collection('professors').get();
                const profList = profSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProfessors(profList);

                // Fetch Courses
                const courseSnap = await db.collection('sinav_dersler').get();
                const courseList = courseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCourses(courseList);

                // Fetch Periods
                const periodSnap = await db.collection('sinav_donemler').orderBy("startDate", "desc").get();
                const periodList = periodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPeriods(periodList);

                if (periodList.length > 0) {
                    setSelectedPeriodId(periodList[0].id);
                }
            } catch (error) {
                console.error("Error fetching initial data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // 2. Fetch Exams when Period Changes
    useEffect(() => {
        if (!selectedPeriodId) return;

        const unsubscribe = db.collection('sinav_programi')
            .where('periodId', '==', selectedPeriodId)
            .onSnapshot(snapshot => {
                const exams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPlacedExams(exams);
            });

        return () => unsubscribe();
    }, [selectedPeriodId]);

    const currentPeriod = periods.find(p => p.id === selectedPeriodId);

    // 3. Handlers
    const handleDropExam = async (course, date, timeSlot) => {
        if (!selectedPeriodId) return alert("Lütfen önce bir sınav dönemi seçin.");

        // Check if ready to save
        try {
            const room = assignClassroom(0); // Default assignment logic could be better
            const newExam = {
                ...course,
                date,
                timeSlot,
                periodId: selectedPeriodId,
                supervisor: "", // could assign randomly
                room: room,
                studentCount: 0,
                // ID comes from firebase
            };
            // Ideally we open EditModal here to confirm details? 
            // Legacy code just dropped it. Let's keep it simple: drop then edit.
            await db.collection("sinav_programi").add(newExam);
        } catch (e) {
            console.error(e);
            alert("Ekleme hatası: " + e.message);
        }
    };

    const handleUpdateExam = async (updatedExam) => {
        try {
            await db.collection("sinav_programi").doc(updatedExam.id).update(updatedExam);
        } catch (e) {
            alert("Güncelleme hatası: " + e.message);
        }
    };

    const handleRemoveExam = async (exam) => {
        if (!window.confirm("Bu sınavı takvimden kaldırmak istediğinize emin misiniz?")) return;
        try {
            await db.collection("sinav_programi").doc(exam.id).delete();
        } catch (e) {
            alert("Silme hatası: " + e.message);
        }
    };

    const handleCourseSave = async (courseId, courseData) => {
        try {
            if (courseId) {
                await db.collection("sinav_dersler").doc(courseId).update(courseData);
            } else {
                await db.collection("sinav_dersler").add(courseData);
            }
            // Refresh locally or rely on snapshot? 
            // We fetched courses once. Let's re-fetch or update local state.
            const snap = await db.collection("sinav_dersler").get();
            setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            alert("Ders kaydetme hatası: " + e.message);
        }
    };

    const handleCourseDelete = async (course) => {
        if (!window.confirm(`${course.code} dersini silmek istediğinize emin misiniz?`)) return;
      try {
          await db.collection("sinav_dersler").doc(course.id).delete();
          setCourses(prev => prev.filter(c => c.id !== course.id));
      } catch (e) {
          alert("Silme hatası: " + e.message);
      }
  };

  const weekDays = currentPeriod ? getWeekDays(currentPeriod.startDate, currentPeriod.weeks || 2) : [];
  
  // Calculate stats
  const placedCountMap = {};
  placedExams.forEach(e => {
      placedCountMap[e.code] = (placedCountMap[e.code] || 0) + 1;
  });

  return (
    <div className="fade-in">
       {/* Header */}
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.navy, fontFamily: "'Playfair Display', serif" }}>
            Sınav Otomasyonu
          </h1>
          <p style={{ color: C.textMuted, fontSize: 14 }}>
            Sınav programlarını oluşturun, düzenleyin ve yayınlayın
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
             <Select 
                value={selectedPeriodId} 
                onChange={e => setSelectedPeriodId(e.target.value)}
                style={{ width: 200 }}
             >
                 {periods.map(p => <option key={p.id} value={p.id}>{p.label || p.semester}</option>)}
             </Select>
             <Btn variant="secondary" icon={<CalendarIcon />} onClick={() => setShowPeriodModal(true)}>
                Dönem Ayarları
             </Btn>
             <Btn variant="primary" icon={<DownloadIcon />} onClick={() => alert("Excel indir (Yakında)")}>
                Dışa Aktar
             </Btn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, padding: 4, background: "white", borderRadius: 12, border: `1px solid ${C.border}`, width: "fit-content" }}>
        {[
            { id: "sinavlar", label: "Takvim Görünümü" },
            { id: "liste", label: "Liste Görünümü" },
            { id: "dersler", label: "Ders Havuzu" }
        ].map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                    padding: "8px 20px",
                    borderRadius: 8,
                    border: "none",
                    background: activeTab === tab.id ? C.navy : "transparent",
                    color: activeTab === tab.id ? "white" : C.textMuted,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s"
                }}
            >
                {tab.label}
            </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 24 }}>
          {/* Main Content Area */}
          <div style={{ flex: 1, minWidth: 0 }}>
              {activeTab === "sinavlar" && currentPeriod && (
                  <CalendarGrid 
                    weekDays={weekDays} 
                    placedExams={placedExams}
                    onDropExam={handleDropExam}
                    onExamClick={setEditingExam}
                  />
              )}
              {activeTab === "liste" && (
                  <ExamList 
                    placedExams={placedExams} 
                    onExamClick={setEditingExam}
                  />
              )}
              {activeTab === "dersler" && (
                   <Card title="Ders Havuzu Yönetimi" 
                        action={<Btn small onClick={() => setShowCourseModal(true)}>Yönet</Btn>}
                   >
                        <p style={{marginBottom: 16, color: C.textMuted}}>
                            Bu görünümde dersleri yönetebilir ve listeleyebilirsiniz. Takvim görünümünde sol panelden sürükleyip bırakarak sınav oluşturabilirsiniz.
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                            {courses.map(c => (
                                <div key={c.id} style={{border: `1px solid ${C.border}`, padding: 12, borderRadius: 8}}>
                                    <div style={{fontWeight: 600}}>{c.code}</div>
                                    <div style={{opacity: 0.7, fontSize: 12}}>{c.name}</div>
                                </div>
                            ))}
                        </div>
                   </Card>
              )}
          </div>

          {/* Sidebar - Only visible in Calendar mode */}
          {activeTab === "sinavlar" && (
              <div style={{ width: 280, flexShrink: 0 }}>
                  <Card title="Ders Havuzu" noPadding compact
                        action={<button onClick={() => setShowCourseModal(true)} style={{background:"none", border:"none", color: C.blue, cursor:"pointer", fontSize:12}}>Düzenle</button>}
                  >
                      <div style={{ padding: 12, maxHeight: "calc(100vh - 250px)", overflowY: "auto" }}>
                          <Input placeholder="Ders ara..." style={{marginBottom: 12}} />
                          
                          {[1, 2, 3, 4, 5].map(sinif => {
                              const sinifCourses = courses.filter(c => c.sinif === sinif);
                              if (sinifCourses.length === 0) return null;
                              return (
                                  <div key={sinif} style={{ marginBottom: 16 }}>
                                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: C.textMuted, marginBottom: 8 }}>
                                          {sinif === 5 ? "Seçmeli" : `${sinif}. Sınıf`}
                                      </div>
                                      {sinifCourses.map(course => (
                                          <DraggableCourseCard 
                                            key={course.id || course.code} 
                                            course={course}
                                            placedCount={placedCountMap[course.code] || 0}
                                          />
                                      ))}
                                  </div>
                              );
                          })}
                      </div>
                  </Card>
              </div>
          )}
      </div>

      {/* Modals */}
      {showPeriodModal && (
          <PeriodConfigModal 
             period={currentPeriod} // Pass active checks if editing? Or handle new vs edit
             onSave={() => {
                 // Refresh periods logic if needed (snapshot usually handles it)
                 setShowPeriodModal(false);
             }}
             onClose={() => setShowPeriodModal(false)}
          />
      )}

      {showCourseModal && (
          <CourseManagementModal 
             courses={courses}
             professors={professors}
             onSave={handleCourseSave}
             onDelete={handleCourseDelete}
             onClose={() => setShowCourseModal(false)}
          />
      )}

      {editingExam && (
          <EditExamModal 
             exam={editingExam}
             professors={professors}
             onSave={handleUpdateExam}
             onRemove={handleRemoveExam}
             onClose={() => setEditingExam(null)}
          />
      )}

    </div>
  );
};

export default SinavOtomasyonuPage;
