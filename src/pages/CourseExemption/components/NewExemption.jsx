
import React, { useState } from 'react';
import { C as PC } from '../../../constants/theme';
import Card from '../../../components/ui/Card';
import { Btn } from '../../../components/ui';
import FormField from '../../../components/ui/FormField';
import Input from '../../../components/ui/Input';
import FileDropZone from './FileDropZone';
import { extractFromFile, parseCoursesFromTable, parseCoursesFromText, autoMatchCourses } from '../utils';
import { exportMuafiyetWord } from '../utils'; // Assuming this utility is also moved or will be
import { SIMILARITY_THRESHOLD } from '../constants';
import ExemptionService from '../service';

const NewExemption = ({ courseContents, gradingSystem, onSave }) => {
    // Öğrenci bilgileri
    const [studentName, setStudentName] = useState("");
    const [studentNo, setStudentNo] = useState("");
    const [otherUni, setOtherUni] = useState("");
    const [otherFaculty, setOtherFaculty] = useState("");
    const [otherDept, setOtherDept] = useState("");

    // Dosya yükleme
    const [transcriptFile, setTranscriptFile] = useState("");
    const [matchTableFile, setMatchTableFile] = useState("");
    const [loadingTranscript, setLoadingTranscript] = useState(false);
    const [loadingMatchTable, setLoadingMatchTable] = useState(false);

    // Parse edilen veriler
    const [transcriptCourses, setTranscriptCourses] = useState([]);
    const [matchTableCourses, setMatchTableCourses] = useState([]);

    // Eşleştirme sonuçları
    const [matches, setMatches] = useState([]);
    const [showResults, setShowResults] = useState(false);

    // Mesajlar
    const [msg, setMsg] = useState("");

    // ÇAKÜ müfredatı (yüklenen ders içerikleri veya varsayılan katalog)
    var targetCourses = courseContents.length > 0 ? courseContents :
        (window.HOME_INSTITUTION_CATALOG ? window.HOME_INSTITUTION_CATALOG.courses.map(function (c) {
            return { code: c.code, name: c.name, akts: String(c.credits), content: "", status: c.type };
        }) : []);

    // Not dönüştürme
    function convertGradeLocal(inputGrade) {
        if (!inputGrade) return "";
        // Önce yüklenmiş sisteme bak
        if (gradingSystem && gradingSystem.length > 0) {
            var found = gradingSystem.find(function (g) {
                return g.input.toUpperCase() === inputGrade.toString().toUpperCase();
            });
            if (found) return found.output;
        }
        // Yoksa varsayılan convertGrade kullan (GLOBAL function, need to import or reimplement)
        return window.convertGrade ? window.convertGrade(inputGrade) : inputGrade;
    }

    // Transkript yükle
    const handleTranscript = async function (file) {
        setLoadingTranscript(true);
        try {
            var result = await extractFromFile(file);
            var courses = [];
            if (result.type === "table") {
                courses = parseCoursesFromTable(result.data);
            } else {
                courses = parseCoursesFromText(result.data);
            }
            setTranscriptCourses(courses);
            setTranscriptFile(file.name);
            setMsg(courses.length + " ders transkriptten okundu.");
        } catch (err) {
            setMsg("Transkript okunamadı: " + err.message);
        }
        setLoadingTranscript(false);
    };

    // Ders eşleştirme tablosu yükle
    const handleMatchTable = async function (file) {
        setLoadingMatchTable(true);
        try {
            var result = await extractFromFile(file);
            var courses = [];
            if (result.type === "table") {
                courses = parseCoursesFromTable(result.data);
            } else {
                courses = parseCoursesFromText(result.data);
            }
            setMatchTableCourses(courses);
            setMatchTableFile(file.name);
            setMsg(courses.length + " ders eşleştirme tablosundan okundu.");
        } catch (err) {
            setMsg("Eşleştirme tablosu okunamadı: " + err.message);
        }
        setLoadingMatchTable(false);
    };

    // Otomatik eşleştir
    const runAutoMatch = function () {
        var sourceCourses = transcriptCourses.length > 0 ? transcriptCourses :
            (matchTableCourses.length > 0 ? matchTableCourses : []);

        if (sourceCourses.length === 0) {
            setMsg("Eşleştirme için önce transkript veya eşleştirme tablosu yükleyin.");
            return;
        }
        if (targetCourses.length === 0) {
            setMsg("ÇAKÜ ders bilgileri bulunamadı. Ayarlar'dan yükleyin.");
            return;
        }

        var autoMatches = autoMatchCourses(sourceCourses, targetCourses);

        // Not dönüşümü uygula
        var enrichedMatches = autoMatches.map(function (m) {
            return Object.assign({}, m, {
                convertedGrade: m.source.grade ? convertGradeLocal(m.source.grade) : "",
            });
        });

        setMatches(enrichedMatches);
        setShowResults(true);
        setMsg("Otomatik eşleştirme tamamlandı. " +
            enrichedMatches.filter(function (m) { return m.matched; }).length + "/" +
            enrichedMatches.length + " ders eşleştirildi.");
    };

    // Eşleştirme düzenle
    const updateMatch = function (index, field, value) {
        setMatches(function (prev) {
            var updated = [...prev];
            if (field === "targetCode") {
                // Yeni hedef ders seç
                var newTarget = targetCourses.find(function (c) { return c.code === value; });
                updated[index] = Object.assign({}, updated[index], {
                    target: newTarget || null,
                    matched: !!newTarget,
                });
            } else if (field === "convertedGrade") {
                updated[index] = Object.assign({}, updated[index], { convertedGrade: value });
            }
            return updated;
        });
    };

    // Kaydet
    const handleSave = async function () {
        var record = {
            studentName: studentName,
            studentNo: studentNo,
            otherUniversity: otherUni,
            otherFaculty: otherFaculty,
            otherDepartment: otherDept,
            matches: matches.filter(function (m) { return m.matched; }).map(function (m) {
                return {
                    source: { code: m.source.code, name: m.source.name, akts: m.source.akts, grade: m.source.grade },
                    target: m.target ? { code: m.target.code, name: m.target.name, akts: m.target.akts, status: m.target.status || m.target.type || "" } : null,
                    convertedGrade: m.convertedGrade,
                    score: m.score,
                };
            }),
        };
        try {
            var saved = await ExemptionService.saveRecord(record);
            setMsg("Muafiyet kaydı başarıyla kaydedildi.");
            if (onSave) onSave(saved);
        } catch (err) {
            setMsg("Kaydetme hatası: " + err.message);
        }
    };

    // Word çıktısı (Moved to parent or utilitarian function call inside)
    // For NewExemption, we can use the same export logic but constructed from current state
    const handleExportWord = function () {
        // We need to import exportMuafiyetWord or define it here. 
        // Assuming it is passed or imported. Let's rely on utils export.
        var record = {
            studentName: studentName || "xxxxx XXXXX",
            studentNo: studentNo || "xxxxx",
            otherUniversity: otherUni || "xxxxx Üniversitesi",
            otherFaculty: otherFaculty || "xxxxx Fakültesi",
            otherDepartment: otherDept || "xxxxx Mühendisliği",
            matches: matches.filter(function (m) { return m.matched; }).map(function (m) {
                return {
                    source: m.source,
                    target: m.target,
                    convertedGrade: m.convertedGrade,
                };
            }),
        };
        // exportMuafiyetWord(record); // This needs to be imported from utils
        // If not exported, we need to move it. Let's assume utils has it.
        if (window.exportMuafiyetWord) window.exportMuafiyetWord(record);
        else console.error("Word export function not found");
    };

    return (
        <div>
            {/* Öğrenci Bilgileri */}
            <Card title="Öğrenci Bilgileri">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <FormField label="Öğrenci Adı Soyadı">
                        <Input value={studentName} onChange={function (e) { setStudentName(e.target.value); }} placeholder="Örn: Ahmet YILMAZ" />
                    </FormField>
                    <FormField label="Öğrenci Numarası">
                        <Input value={studentNo} onChange={function (e) { setStudentNo(e.target.value); }} placeholder="Örn: 2024001" />
                    </FormField>
                    <FormField label="Karşı Üniversite">
                        <Input value={otherUni} onChange={function (e) { setOtherUni(e.target.value); }} placeholder="Örn: Ankara Üniversitesi" />
                    </FormField>
                    <FormField label="Karşı Fakülte">
                        <Input value={otherFaculty} onChange={function (e) { setOtherFaculty(e.target.value); }} placeholder="Örn: Mühendislik Fakültesi" />
                    </FormField>
                    <FormField label="Karşı Bölüm">
                        <Input value={otherDept} onChange={function (e) { setOtherDept(e.target.value); }} placeholder="Örn: Bilgisayar Mühendisliği" />
                    </FormField>
                </div>
            </Card>

            {/* Belge Yükleme */}
            <Card title="Belge Yükleme">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: PC.navy, marginBottom: 8 }}>Transkript</div>
                        <FileDropZone
                            label="Transkript Yükle"
                            onFile={handleTranscript}
                            fileName={transcriptFile}
                            loading={loadingTranscript}
                        />
                        {transcriptCourses.length > 0 && (
                            <div style={{ marginTop: 8, fontSize: 12, color: "#166534", fontWeight: 600 }}>
                                {transcriptCourses.length} ders okundu
                            </div>
                        )}
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: PC.navy, marginBottom: 8 }}>Ders Eşleştirme Tablosu</div>
                        <FileDropZone
                            label="Eşleştirme Tablosu Yükle"
                            onFile={handleMatchTable}
                            fileName={matchTableFile}
                            loading={loadingMatchTable}
                        />
                        {matchTableCourses.length > 0 && (
                            <div style={{ marginTop: 8, fontSize: 12, color: "#166534", fontWeight: 600 }}>
                                {matchTableCourses.length} ders okundu
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
                    <Btn onClick={runAutoMatch} disabled={transcriptCourses.length === 0 && matchTableCourses.length === 0}>
                        Otomatik Eşleştir
                    </Btn>
                </div>
            </Card>

            {/* Mesaj */}
            {msg && (
                <div style={{
                    padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13,
                    background: msg.includes("hata") || msg.includes("bulunamadı") ? "#FEE2E2" : "#D1FAE5",
                    color: msg.includes("hata") || msg.includes("bulunamadı") ? "#991B1B" : "#166534",
                }}>{msg}</div>
            )}

            {/* Eşleştirme Sonuçları */}
            {showResults && matches.length > 0 && (
                <Card title="Eşleştirme Sonuçları">
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: PC.bg }}>
                                    <th colSpan="4" style={{ padding: 10, textAlign: "center", borderBottom: "2px solid " + PC.border, color: PC.navy, fontWeight: 700 }}>Karşı Kurum</th>
                                    <th style={{ borderBottom: "2px solid " + PC.border, width: 40 }}></th>
                                    <th colSpan="4" style={{ padding: 10, textAlign: "center", borderBottom: "2px solid " + PC.border, color: "#166534", fontWeight: 700 }}>ÇAKÜ Eşleşme</th>
                                    <th style={{ padding: 10, textAlign: "center", borderBottom: "2px solid " + PC.border }}>Skor</th>
                                </tr>
                                <tr style={{ background: PC.bg }}>
                                    <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid " + PC.border }}>Kod</th>
                                    <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid " + PC.border }}>Ders Adı</th>
                                    <th style={{ padding: 8, textAlign: "center", borderBottom: "1px solid " + PC.border }}>AKTS</th>
                                    <th style={{ padding: 8, textAlign: "center", borderBottom: "1px solid " + PC.border }}>Not</th>
                                    <th style={{ borderBottom: "1px solid " + PC.border }}></th>
                                    <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid " + PC.border }}>Kod</th>
                                    <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid " + PC.border }}>Ders Adı</th>
                                    <th style={{ padding: 8, textAlign: "center", borderBottom: "1px solid " + PC.border }}>AKTS</th>
                                    <th style={{ padding: 8, textAlign: "center", borderBottom: "1px solid " + PC.border }}>Dönüşen Not</th>
                                    <th style={{ padding: 8, textAlign: "center", borderBottom: "1px solid " + PC.border }}>%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matches.map(function (m, idx) {
                                    var scoreColor = m.score >= 0.5 ? "#166534" : (m.score >= SIMILARITY_THRESHOLD ? "#D97706" : "#B45309");
                                    return (
                                        <tr key={idx} style={{ borderBottom: "1px solid " + PC.borderLight, background: m.matched ? "white" : "#FFF7ED" }}>
                                            <td style={{ padding: 8, fontWeight: 600 }}>{m.source.code}</td>
                                            <td style={{ padding: 8 }}>{m.source.name}</td>
                                            <td style={{ padding: 8, textAlign: "center" }}>{m.source.akts}</td>
                                            <td style={{ padding: 8, textAlign: "center", fontWeight: 600 }}>{m.source.grade}</td>
                                            <td style={{ padding: 4, textAlign: "center" }}>
                                                <span style={{ color: m.matched ? "#166534" : PC.textMuted, fontSize: 18 }}>{m.matched ? "\u2192" : "\u2717"}</span>
                                            </td>
                                            <td style={{ padding: 8 }}>
                                                <select
                                                    value={m.target ? m.target.code : ""}
                                                    onChange={function (e) { updateMatch(idx, "targetCode", e.target.value); }}
                                                    style={{
                                                        padding: "4px 8px", fontSize: 12, borderRadius: 6,
                                                        border: "1px solid " + PC.border, background: "white", cursor: "pointer",
                                                        width: "100%",
                                                    }}
                                                >
                                                    <option value="">-- Seçiniz --</option>
                                                    {targetCourses.map(function (c) {
                                                        return <option key={c.code} value={c.code}>{c.code} - {c.name}</option>;
                                                    })}
                                                </select>
                                            </td>
                                            <td style={{ padding: 8, fontSize: 12 }}>{m.target ? m.target.name : ""}</td>
                                            <td style={{ padding: 8, textAlign: "center" }}>{m.target ? m.target.akts : ""}</td>
                                            <td style={{ padding: 8, textAlign: "center" }}>
                                                <input
                                                    type="text"
                                                    value={m.convertedGrade}
                                                    onChange={function (e) { updateMatch(idx, "convertedGrade", e.target.value); }}
                                                    style={{
                                                        width: 60, padding: "4px 8px", fontSize: 12,
                                                        border: "1px solid " + PC.border, borderRadius: 6, textAlign: "center",
                                                    }}
                                                />
                                            </td>
                                            <td style={{ padding: 8, textAlign: "center" }}>
                                                <span style={{
                                                    fontSize: 11, fontWeight: 700, color: scoreColor,
                                                    background: m.matched ? "#D1FAE5" : "#FEE2E2",
                                                    padding: "2px 8px", borderRadius: 4,
                                                }}>
                                                    {Math.round(m.score * 100)}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "flex-end" }}>
                        <Btn onClick={handleSave} variant="success">
                            Kaydet
                        </Btn>
                        {/* Disabled for now as we haven't ported export functionality fully purely to React context yet without window helpers */}
                        {/* <Btn onClick={handleExportWord} style={{ background: "#2563EB", border: "none" }}>
              Word Çıktısı Al
            </Btn> */}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default NewExemption;
