
import React, { useState } from 'react';
import { C as PC } from '../../../constants/theme';
import Card from '../../../components/ui/Card';
import { Btn } from '../../../components/ui';
import FileDropZone from './FileDropZone';
import { extractFromFile, parseCoursesFromTable, parseCoursesFromText } from '../utils';
import ExemptionService from '../service';

const SettingsPanel = ({ courseContents, setCourseContents, gradingSystem, setGradingSystem }) => {
    const [loadingCourse, setLoadingCourse] = useState(false);
    const [loadingGrade, setLoadingGrade] = useState(false);
    const [courseFileName, setCourseFileName] = useState("");
    const [gradeFileName, setGradeFileName] = useState("");
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    const handleCourseFile = async function (file) {
        setLoadingCourse(true);
        try {
            var result = await extractFromFile(file);
            var courses = [];
            if (result.type === "table") {
                courses = parseCoursesFromTable(result.data);
            } else {
                courses = parseCoursesFromText(result.data);
            }
            if (courses.length === 0) {
                setMsg("Ders bilgisi bulunamadı. Dosya formatını kontrol edin.");
            } else {
                setCourseContents(courses);
                setCourseFileName(file.name);
                setMsg(courses.length + " ders içeriği yüklendi.");
            }
        } catch (err) {
            console.error(err);
            setMsg("Dosya okunurken hata: " + err.message);
        }
        setLoadingCourse(false);
    };

    const handleGradeFile = async function (file) {
        setLoadingGrade(true);
        try {
            var result = await extractFromFile(file);
            var grades = [];
            if (result.type === "table") {
                // İlk sheet'ten not tablosu oku
                var sheet = result.data[0];
                if (sheet && sheet.rows.length > 1) {
                    for (var r = 1; r < sheet.rows.length; r++) {
                        var row = sheet.rows[r];
                        if (row[0] && row[1]) {
                            grades.push({ input: String(row[0]).trim(), output: String(row[1]).trim() });
                        }
                    }
                }
            }
            if (grades.length === 0) {
                setMsg("Not tablosu bulunamadı. İlk sütun: giriş notu, ikinci sütun: ÇAKÜ notu olmalı.");
            } else {
                setGradingSystem(grades);
                setGradeFileName(file.name);
                setMsg(grades.length + " not dönüşüm kuralı yüklendi.");
            }
        } catch (err) {
            console.error(err);
            setMsg("Dosya okunurken hata: " + err.message);
        }
        setLoadingGrade(false);
    };

    const handleSaveSettings = async function () {
        setSaving(true);
        try {
            if (courseContents.length > 0) {
                await ExemptionService.saveCourseContents(courseContents);
            }
            if (gradingSystem && gradingSystem.length > 0) {
                await ExemptionService.saveGradingSystem(gradingSystem);
            }
            setMsg("Ayarlar Firebase'e kaydedildi.");
        } catch (err) {
            setMsg("Kaydetme hatası: " + err.message);
        }
        setSaving(false);
    };

    return (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                {/* ÇAKÜ Ders İçerikleri */}
                <Card title="ÇAKÜ Ders İçerikleri">
                    <p style={{ fontSize: 13, color: PC.textMuted, marginBottom: 16 }}>
                        ÇAKÜ Bilgisayar Mühendisliği ders bilgilerini (kod, ad, AKTS, içerik) yükleyin.
                        Excel formatında: Kodu | Adı | AKTS | İçerik sütunları olmalı.
                    </p>
                    <FileDropZone
                        label="ÇAKÜ Ders İçerikleri Yükle"
                        onFile={handleCourseFile}
                        fileName={courseFileName}
                        loading={loadingCourse}
                    />
                    {courseContents.length > 0 && (
                        <div style={{ marginTop: 16, maxHeight: 300, overflowY: "auto", border: "1px solid " + PC.border, borderRadius: 8 }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                    <tr style={{ background: PC.bg }}>
                                        <th style={{ padding: 8, textAlign: "left", borderBottom: "2px solid " + PC.border }}>Kod</th>
                                        <th style={{ padding: 8, textAlign: "left", borderBottom: "2px solid " + PC.border }}>Ad</th>
                                        <th style={{ padding: 8, textAlign: "center", borderBottom: "2px solid " + PC.border }}>AKTS</th>
                                        <th style={{ padding: 8, textAlign: "left", borderBottom: "2px solid " + PC.border }}>İçerik</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {courseContents.map(function (c, i) {
                                        return (
                                            <tr key={i} style={{ borderBottom: "1px solid " + PC.borderLight }}>
                                                <td style={{ padding: 6, fontWeight: 600 }}>{c.code}</td>
                                                <td style={{ padding: 6 }}>{c.name}</td>
                                                <td style={{ padding: 6, textAlign: "center" }}>{c.akts}</td>
                                                <td style={{ padding: 6, fontSize: 11, color: PC.textMuted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.content || "-"}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                {/* Not Sistemi */}
                <Card title="Not Dönüşüm Sistemi">
                    <p style={{ fontSize: 13, color: PC.textMuted, marginBottom: 16 }}>
                        Sabit not dönüşüm tablosunu yükleyin. Excel formatında: 1. sütun giriş notu, 2. sütun ÇAKÜ notu.
                        Yüklenmezse varsayılan sistem (AA→A, BA→B1, BB→B2...) kullanılır.
                    </p>
                    <FileDropZone
                        label="Not Sistemi Yükle"
                        onFile={handleGradeFile}
                        fileName={gradeFileName}
                        loading={loadingGrade}
                    />
                    {gradingSystem && gradingSystem.length > 0 && (
                        <div style={{ marginTop: 16, maxHeight: 300, overflowY: "auto", border: "1px solid " + PC.border, borderRadius: 8 }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                    <tr style={{ background: PC.bg }}>
                                        <th style={{ padding: 8, textAlign: "center", borderBottom: "2px solid " + PC.border }}>Giriş Notu</th>
                                        <th style={{ padding: 8, textAlign: "center", borderBottom: "2px solid " + PC.border }}>ÇAKÜ Notu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gradingSystem.map(function (g, i) {
                                        return (
                                            <tr key={i} style={{ borderBottom: "1px solid " + PC.borderLight }}>
                                                <td style={{ padding: 6, textAlign: "center", fontWeight: 600 }}>{g.input}</td>
                                                <td style={{ padding: 6, textAlign: "center", color: "#166534", fontWeight: 600 }}>{g.output}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div style={{ marginTop: 16, padding: 12, background: PC.bg, borderRadius: 8, fontSize: 12, color: PC.textMuted }}>
                        <strong>Varsayılan sistem:</strong> AA→A, BA→B1, BB→B2, CB→B3, CC→C1, DC→C2, DD→C3, FF→F1
                    </div>
                </Card>
            </div>

            {msg && (
                <div style={{
                    padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13,
                    background: msg.includes("hata") || msg.includes("bulunamadı") ? "#FEE2E2" : "#D1FAE5",
                    color: msg.includes("hata") || msg.includes("bulunamadı") ? "#991B1B" : "#166534",
                }}>{msg}</div>
            )}

            <Btn onClick={handleSaveSettings} disabled={saving} variant="success">
                {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
            </Btn>
        </div>
    );
};

export default SettingsPanel;
