
import React, { useState, useEffect } from 'react';
import { C as PC } from '../../constants/theme';
import ExemptionService from './service';
import { MUAFIYET_TABS } from './constants';
import SettingsPanel from './components/SettingsPanel';
import NewExemption from './components/NewExemption';
import ExemptionHistory from './components/ExemptionHistory';
import { exportMuafiyetWord } from './utils';
import { Card } from '../../components/ui/Card'; // Assuming Card is exported from ui/Card or we need to use the one from extracted components if customized

// Re-using the style injection approach for consistency if needed, or relying on global styles
// For now, let's implement the refined design

const CourseExemptionPage = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState("yeni");
    const [courseContents, setCourseContents] = useState([]);
    const [gradingSystem, setGradingSystem] = useState(null);
    const [records, setRecords] = useState([]);
    const [recordsLoading, setRecordsLoading] = useState(true);

    // Firebase'den ayarları ve kayıtları yükle
    useEffect(function () {
        async function loadData() {
            try {
                var contents = await ExemptionService.fetchCourseContents();
                if (contents.length > 0) setCourseContents(contents);
                var grading = await ExemptionService.fetchGradingSystem();
                if (grading) setGradingSystem(grading);
                var recs = await ExemptionService.fetchRecords();
                setRecords(recs);
            } catch (err) {
                console.error("Muafiyet verileri yüklenirken hata:", err);
            }
            setRecordsLoading(false);
        }
        loadData();
    }, []);

    const handleDeleteRecord = async function (id) {
        try {
            await ExemptionService.deleteRecord(id);
            setRecords(function (prev) { return prev.filter(function (r) { return r.id !== id; }); });
        } catch (err) {
            alert("Silme hatası: " + err.message);
        }
    };

    const handleSaveRecord = function (saved) {
        setRecords(function (prev) { return [saved, ...prev]; });
        setActiveTab("gecmis");
    };

    return (
        <div className="portal-bg" style={{ minHeight: "100vh", padding: 20 }}>
            <div className="portal-wrap" style={{ maxWidth: 1200, margin: "0 auto" }}>
                {/* Başlık */}
                <div style={{ marginBottom: 24 }}>
                    <h1 style={{
                        fontSize: 28, fontWeight: 700, color: PC.navy,
                        fontFamily: "'Playfair Display', serif", marginBottom: 4,
                    }}>Ders Muafiyet Modülü</h1>
                    <p style={{ color: PC.textMuted, fontSize: 14 }}>
                        Belge yükleyin, otomatik ders eşleştirme ve Word çıktısı alın.
                    </p>
                </div>

                {/* Tab Bar */}
                <div style={{
                    display: "flex", gap: 4, marginBottom: 24,
                    borderBottom: "2px solid " + PC.border, paddingBottom: 0,
                }}>
                    {MUAFIYET_TABS.map(function (tab) {
                        var isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={function () { setActiveTab(tab.id); }}
                                style={{
                                    padding: "12px 24px",
                                    border: "none",
                                    background: isActive ? PC.navy : "transparent",
                                    color: isActive ? "white" : PC.textMuted,
                                    fontSize: 14,
                                    fontWeight: isActive ? 700 : 500,
                                    cursor: "pointer",
                                    borderRadius: "8px 8px 0 0",
                                    fontFamily: "'Source Sans 3', sans-serif",
                                    transition: "all 0.2s",
                                }}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab İçeriği */}
                <div style={{ background: "transparent" }}>
                    {activeTab === "ayarlar" && (
                        <SettingsPanel
                            courseContents={courseContents}
                            setCourseContents={setCourseContents}
                            gradingSystem={gradingSystem}
                            setGradingSystem={setGradingSystem}
                        />
                    )}
                    {activeTab === "yeni" && (
                        <NewExemption
                            courseContents={courseContents}
                            gradingSystem={gradingSystem}
                            onSave={handleSaveRecord}
                        />
                    )}
                    {activeTab === "gecmis" && (
                        <ExemptionHistory
                            records={records}
                            loading={recordsLoading}
                            onDelete={handleDeleteRecord}
                            onExportWord={exportMuafiyetWord}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseExemptionPage;
