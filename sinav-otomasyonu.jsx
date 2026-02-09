// ══════════════════════════════════════════════════════════════
// ÇAKÜ Sınav Otomasyonu Modülü
// Shared bileşenler shared-components.jsx'den window üzerinden gelir
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useMemo } = React;

// ── Sabitler ──
const EXAM_TYPES = [
  { value: "vize", label: "Vize (Ara Sinav)" },
  { value: "final", label: "Final" },
  { value: "but", label: "Butunleme" },
  { value: "quiz", label: "Quiz" },
  { value: "odev", label: "Odev / Proje" },
];

const EXAM_STATUSES = [
  { value: "planned", label: "Planlanmis", color: C.blue, bg: C.blueLight },
  { value: "active", label: "Aktif", color: C.green, bg: C.greenLight },
  { value: "completed", label: "Tamamlandi", color: C.navy, bg: "#E8EAF0" },
  { value: "cancelled", label: "Iptal Edildi", color: C.accent, bg: "#FAEBED" },
];

const SEMESTERS = [
  "Guz 2024-2025", "Bahar 2024-2025",
  "Guz 2025-2026", "Bahar 2025-2026",
  "Guz 2026-2027", "Bahar 2026-2027",
];

const LOCATIONS = [
  "A Blok - 101", "A Blok - 102", "A Blok - 201", "A Blok - 202",
  "B Blok - 101", "B Blok - 102", "B Blok - 201",
  "Lab 1", "Lab 2", "Lab 3",
  "Amfi - 1", "Amfi - 2",
  "Online (Uzaktan)",
];

// ── Sinav Olusturma / Duzenleme Modali ──
const ExamFormModal = ({ exam, onClose, onSave }) => {
  const isEdit = !!exam?.id;
  const [form, setForm] = useState({
    courseCode: "",
    courseName: "",
    examType: "vize",
    semester: SEMESTERS[2],
    date: "",
    startTime: "09:00",
    duration: 90,
    location: "",
    supervisors: "",
    status: "planned",
    description: "",
    maxScore: 100,
    weight: 40,
    ...exam,
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = () => {
    if (!form.courseCode.trim() || !form.courseName.trim()) {
      alert("Ders kodu ve adi zorunludur!");
      return;
    }
    if (!form.date) {
      alert("Sinav tarihi zorunludur!");
      return;
    }
    onSave(form);
  };

  // Auto-fill course name from catalog
  const handleCourseCodeChange = (code) => {
    update("courseCode", code);
    const course = HOME_INSTITUTION_CATALOG.courses.find(c => c.code === code.toUpperCase());
    if (course) update("courseName", course.name);
  };

  return (
    <Modal open={true} onClose={onClose} title={isEdit ? "Sinavi Duzenle" : "Yeni Sinav Olustur"} width={800}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <FormField label="Ders Kodu">
          <Input value={form.courseCode} onChange={e => handleCourseCodeChange(e.target.value)} placeholder="Orn: BIL401" />
        </FormField>
        <FormField label="Ders Adi">
          <Input value={form.courseName} onChange={e => update("courseName", e.target.value)} placeholder="Orn: Bilgisayar Aglari" />
        </FormField>
        <FormField label="Sinav Turu">
          <Select value={form.examType} onChange={e => update("examType", e.target.value)} options={EXAM_TYPES} />
        </FormField>
        <FormField label="Donem">
          <Select value={form.semester} onChange={e => update("semester", e.target.value)} options={SEMESTERS.map(s => ({ value: s, label: s }))} />
        </FormField>
        <FormField label="Tarih">
          <Input type="date" value={form.date} onChange={e => update("date", e.target.value)} />
        </FormField>
        <FormField label="Baslangic Saati">
          <Input type="time" value={form.startTime} onChange={e => update("startTime", e.target.value)} />
        </FormField>
        <FormField label="Sure (dk)">
          <Input type="number" value={form.duration} onChange={e => update("duration", parseInt(e.target.value) || 0)} />
        </FormField>
        <FormField label="Mekan">
          <Select value={form.location} onChange={e => update("location", e.target.value)}
            options={LOCATIONS.map(l => ({ value: l, label: l }))} placeholder="Mekan Secin" />
        </FormField>
        <FormField label="Gozetmenler">
          <Input value={form.supervisors} onChange={e => update("supervisors", e.target.value)} placeholder="Orn: Prof. Dr. Mehmet Yilmaz, Dr. Ayse Kara" />
        </FormField>
        <FormField label="Durum">
          <Select value={form.status} onChange={e => update("status", e.target.value)} options={EXAM_STATUSES.map(s => ({ value: s.value, label: s.label }))} />
        </FormField>
        <FormField label="Maksimum Puan">
          <Input type="number" value={form.maxScore} onChange={e => update("maxScore", parseInt(e.target.value) || 100)} />
        </FormField>
        <FormField label="Agirlik (%)">
          <Input type="number" value={form.weight} onChange={e => update("weight", parseInt(e.target.value) || 0)} />
        </FormField>
      </div>
      <FormField label="Aciklama">
        <textarea value={form.description || ""} onChange={e => update("description", e.target.value)}
          placeholder="Sinav hakkinda notlar..."
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
            fontSize: 14, fontFamily: "'Source Sans 3', sans-serif", minHeight: 80, resize: "vertical",
            outline: "none",
          }}
        />
      </FormField>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
        <Btn onClick={onClose} variant="secondary">Iptal</Btn>
        <Btn onClick={handleSave}>{isEdit ? "Guncelle" : "Olustur"}</Btn>
      </div>
    </Modal>
  );
};

// ── Not Giris Modali ──
const GradeEntryModal = ({ exam, onClose, onSave }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEntry, setNewEntry] = useState({ studentNumber: "", studentName: "", score: "" });

  useEffect(() => {
    loadResults();
  }, [exam.id]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const fetched = await FirebaseDB.fetchExamResults(exam.id);
      setResults(fetched);
    } catch (error) {
      console.error("Error loading results:", error);
    } finally {
      setLoading(false);
    }
  };

  const addResult = async () => {
    if (!newEntry.studentNumber.trim() || !newEntry.studentName.trim()) {
      alert("Ogrenci numarasi ve adi zorunludur!");
      return;
    }
    const score = parseFloat(newEntry.score) || 0;
    const maxScore = exam.maxScore || 100;
    const percentage = (score / maxScore) * 100;
    const letterGrade = GRADE_CONVERSION.numericToGrade(percentage);

    try {
      const result = await FirebaseDB.addExamResult({
        examId: exam.id,
        studentNumber: newEntry.studentNumber.trim(),
        studentName: newEntry.studentName.trim(),
        score,
        maxScore,
        percentage: Math.round(percentage * 100) / 100,
        letterGrade,
      });
      setResults(prev => [...prev, result]);
      setNewEntry({ studentNumber: "", studentName: "", score: "" });
    } catch (error) {
      console.error("Error adding result:", error);
      alert("Not eklenirken hata olustu.");
    }
  };

  const deleteResult = async (id) => {
    if (!confirm("Bu sonucu silmek istiyor musunuz?")) return;
    try {
      await FirebaseDB.deleteExamResult(id);
      setResults(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error("Error deleting result:", error);
    }
  };

  const updateResultScore = (id, newScore) => {
    const score = parseFloat(newScore) || 0;
    const maxScore = exam.maxScore || 100;
    const percentage = (score / maxScore) * 100;
    const letterGrade = GRADE_CONVERSION.numericToGrade(percentage);
    setResults(prev => prev.map(r => r.id === id ? { ...r, score, percentage: Math.round(percentage * 100) / 100, letterGrade } : r));
  };

  const saveAllResults = async () => {
    setSaving(true);
    try {
      for (const result of results) {
        if (result.id) {
          await FirebaseDB.updateExamResult(result.id, {
            score: result.score,
            percentage: result.percentage,
            letterGrade: result.letterGrade,
          });
        }
      }
      alert("Tum notlar kaydedildi!");
      onSave();
    } catch (error) {
      console.error("Error saving results:", error);
      alert("Notlar kaydedilirken hata olustu.");
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    if (results.length === 0) return null;
    const scores = results.map(r => r.score).filter(s => s != null);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const passed = results.filter(r => r.percentage >= 50).length;
    return { avg: avg.toFixed(1), max, min, passed, failed: results.length - passed, total: results.length };
  }, [results]);

  const exportResults = () => {
    if (results.length === 0) { alert("Disa aktarilacak sonuc yok."); return; }
    const csv = ["Ogrenci No,Ad Soyad,Puan,Yuzde,Harf Notu",
      ...results.map(r => `${r.studentNumber},${r.studentName},${r.score},${r.percentage},${r.letterGrade}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exam.courseCode}_${exam.examType}_sonuclari.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open={true} onClose={onClose} title={`${exam.courseCode} - ${exam.courseName} (${EXAM_TYPES.find(t => t.value === exam.examType)?.label || exam.examType})`} width={950}>
      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Ogrenci", value: stats.total, color: C.navy },
            { label: "Ortalama", value: stats.avg, color: C.blue },
            { label: "En Yuksek", value: stats.max, color: C.green },
            { label: "En Dusuk", value: stats.min, color: C.accent },
            { label: "Gecen", value: stats.passed, color: C.green },
            { label: "Kalan", value: stats.failed, color: C.accent },
          ].map((s, i) => (
            <div key={i} style={{ padding: 12, background: C.bg, borderRadius: 8, textAlign: "center", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Result */}
      <div style={{ padding: 16, background: C.goldPale, borderRadius: 10, border: `1px solid ${C.goldLight}`, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 12 }}>Yeni Not Ekle</div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.navy, marginBottom: 4 }}>Ogrenci No</div>
            <Input value={newEntry.studentNumber} onChange={e => setNewEntry(p => ({ ...p, studentNumber: e.target.value }))} placeholder="Orn: AND43" />
          </div>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.navy, marginBottom: 4 }}>Ad Soyad</div>
            <Input value={newEntry.studentName} onChange={e => setNewEntry(p => ({ ...p, studentName: e.target.value }))} placeholder="Orn: Ayten Nisa DIK" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.navy, marginBottom: 4 }}>Puan (/{exam.maxScore || 100})</div>
            <Input type="number" value={newEntry.score} onChange={e => setNewEntry(p => ({ ...p, score: e.target.value }))} placeholder="0" />
          </div>
          <Btn onClick={addResult} icon={<PlusIcon />}>Ekle</Btn>
        </div>
      </div>

      {/* Results Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Yukleniyor...</div>
      ) : (
        <div style={{ maxHeight: 400, overflowY: "auto", marginBottom: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {["#", "Ogrenci No", "Ad Soyad", `Puan (/${exam.maxScore || 100})`, "Yuzde", "Harf Notu", "Islem"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 12px", textAlign: i >= 3 ? "center" : "left", fontSize: 11, fontWeight: 700, color: C.navy, borderBottom: `2px solid ${C.border}`, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 30, textAlign: "center", color: C.textMuted }}>Henuz sonuc girilmemis.</td></tr>
              ) : results.map((r, idx) => (
                <tr key={r.id || idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 12px", color: C.textMuted, fontSize: 13 }}>{idx + 1}</td>
                  <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: C.navy }}>{r.studentNumber}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>{r.studentName}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <input type="number" value={r.score} onChange={e => updateResultScore(r.id, e.target.value)}
                      style={{ width: 70, padding: "6px 8px", border: `1px solid ${C.border}`, borderRadius: 6, textAlign: "center", fontSize: 14, fontWeight: 600 }} />
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: r.percentage >= 50 ? C.green : C.accent }}>
                    %{r.percentage}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <Badge color={r.percentage >= 50 ? C.green : C.accent} bg={r.percentage >= 50 ? C.greenLight : "#FAEBED"}>
                      {r.letterGrade}
                    </Badge>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <button onClick={() => deleteResult(r.id)}
                      style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.accent, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
        <Btn onClick={exportResults} variant="secondary" icon={<DownloadIcon />}>CSV Olarak Indir</Btn>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={onClose} variant="secondary">Kapat</Btn>
          <Btn onClick={saveAllResults} disabled={saving}>{saving ? "Kaydediliyor..." : "Tum Notlari Kaydet"}</Btn>
        </div>
      </div>
    </Modal>
  );
};

// ── Sinav Programi Gorunumu ──
const ExamScheduleView = ({ exams }) => {
  const sortedExams = [...exams]
    .filter(e => e.date && e.status !== "cancelled")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (sortedExams.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
        Goruntulenecek sinav programi bulunamadi.
      </div>
    );
  }

  // Group by date
  const grouped = {};
  sortedExams.forEach(exam => {
    const dateStr = exam.date;
    if (!grouped[dateStr]) grouped[dateStr] = [];
    grouped[dateStr].push(exam);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {Object.entries(grouped).map(([dateStr, dayExams]) => {
        const date = new Date(dateStr + "T00:00:00");
        const dayName = date.toLocaleDateString('tr-TR', { weekday: 'long' });
        const formattedDate = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        const isPast = date < new Date(new Date().toDateString());

        return (
          <div key={dateStr}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12, marginBottom: 12,
              opacity: isPast ? 0.6 : 1,
            }}>
              <div style={{
                width: 50, height: 50, borderRadius: 10,
                background: isPast ? C.border : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: isPast ? C.textMuted : "white",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif",
              }}>
                <div style={{ fontSize: 18, lineHeight: 1 }}>{date.getDate()}</div>
                <div style={{ fontSize: 9, fontWeight: 400, textTransform: "uppercase" }}>{date.toLocaleDateString('tr-TR', { month: 'short' })}</div>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.navy }}>{formattedDate}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{dayName} - {dayExams.length} sinav</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 62 }}>
              {dayExams.map(exam => {
                const typeInfo = EXAM_TYPES.find(t => t.value === exam.examType);
                return (
                  <div key={exam.id} style={{
                    padding: "12px 16px", background: C.card, borderRadius: 8,
                    border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 16,
                  }}>
                    <div style={{
                      padding: "4px 8px", background: C.blueLight, color: C.blue,
                      borderRadius: 6, fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                      minWidth: 50, textAlign: "center",
                    }}>
                      {exam.startTime || "TBD"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: C.navy, fontSize: 14 }}>
                        {exam.courseCode} - {exam.courseName}
                      </div>
                      <div style={{ fontSize: 12, color: C.textMuted, display: "flex", gap: 12, marginTop: 2 }}>
                        <span>{typeInfo?.label || exam.examType}</span>
                        {exam.duration && <span>{exam.duration} dk</span>}
                        {exam.location && <span>{exam.location}</span>}
                      </div>
                    </div>
                    <Badge color={EXAM_STATUSES.find(s => s.value === exam.status)?.color || C.navy}
                           bg={EXAM_STATUSES.find(s => s.value === exam.status)?.bg || C.bg}>
                      {EXAM_STATUSES.find(s => s.value === exam.status)?.label || exam.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Word Belge Olusturucu (Sinav Programi) ──
const generateExamScheduleDoc = (exams, semester) => {
  const filtered = exams.filter(e => e.status !== "cancelled").sort((a, b) => new Date(a.date) - new Date(b.date));
  if (filtered.length === 0) { alert("Disa aktarilacak sinav bulunamadi."); return; }

  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Sinav Programi</title></head>
<body style='font-family: Arial, sans-serif; font-size: 11pt;'>
<h2 style='text-align: center;'>CANKIRI KARATEKIN UNIVERSITESI</h2>
<h3 style='text-align: center;'>Bilgisayar Muhendisligi Bolumu</h3>
<h4 style='text-align: center;'>${semester || ""} Sinav Programi</h4>
<table border='1' cellpadding='6' cellspacing='0' style='width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt;'>
<thead><tr style='background-color: #f0f0f0; font-weight: bold;'>
<th style='border: 1px solid black;'>Tarih</th>
<th style='border: 1px solid black;'>Saat</th>
<th style='border: 1px solid black;'>Ders Kodu</th>
<th style='border: 1px solid black;'>Ders Adi</th>
<th style='border: 1px solid black;'>Sinav Turu</th>
<th style='border: 1px solid black;'>Sure</th>
<th style='border: 1px solid black;'>Mekan</th>
<th style='border: 1px solid black;'>Gozetmen(ler)</th>
</tr></thead><tbody>
${filtered.map(exam => {
  const date = exam.date ? new Date(exam.date + "T00:00:00").toLocaleDateString('tr-TR') : "-";
  const typeLabel = EXAM_TYPES.find(t => t.value === exam.examType)?.label || exam.examType;
  return `<tr>
    <td style='border: 1px solid black;'>${date}</td>
    <td style='border: 1px solid black; text-align: center;'>${exam.startTime || "-"}</td>
    <td style='border: 1px solid black;'>${exam.courseCode}</td>
    <td style='border: 1px solid black;'>${exam.courseName}</td>
    <td style='border: 1px solid black; text-align: center;'>${typeLabel}</td>
    <td style='border: 1px solid black; text-align: center;'>${exam.duration ? exam.duration + " dk" : "-"}</td>
    <td style='border: 1px solid black;'>${exam.location || "-"}</td>
    <td style='border: 1px solid black;'>${exam.supervisors || "-"}</td>
  </tr>`;
}).join("")}
</tbody></table>
<p style='margin-top: 20px; font-size: 10pt;'>Olusturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
</body></html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sinav_Programi_${(semester || "").replace(/\s/g, "_")}.doc`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};

// ── Word Belge Olusturucu (Sinav Sonuclari) ──
const generateExamResultsDoc = async (exam) => {
  const results = await FirebaseDB.fetchExamResults(exam.id);
  if (results.length === 0) { alert("Bu sinav icin henuz sonuc girilmemis."); return; }
  const sorted = [...results].sort((a, b) => (b.score || 0) - (a.score || 0));
  const avg = sorted.reduce((s, r) => s + (r.score || 0), 0) / sorted.length;
  const passed = sorted.filter(r => (r.percentage || 0) >= 50).length;
  const typeLabel = EXAM_TYPES.find(t => t.value === exam.examType)?.label || exam.examType;

  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Sinav Sonuclari</title></head>
<body style='font-family: Arial, sans-serif; font-size: 11pt;'>
<h3 style='text-align: center;'>SINAV SONUC LISTESI</h3>
<p><strong>Ders:</strong> ${exam.courseCode} - ${exam.courseName}</p>
<p><strong>Sinav Turu:</strong> ${typeLabel} | <strong>Tarih:</strong> ${exam.date ? new Date(exam.date + "T00:00:00").toLocaleDateString('tr-TR') : "-"}</p>
<p><strong>Ortalama:</strong> ${avg.toFixed(1)} | <strong>Gecen:</strong> ${passed}/${sorted.length}</p>
<table border='1' cellpadding='6' cellspacing='0' style='width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt;'>
<thead><tr style='background-color: #f0f0f0; font-weight: bold;'>
<th style='border: 1px solid black;'>#</th>
<th style='border: 1px solid black;'>Ogrenci No</th>
<th style='border: 1px solid black;'>Ad Soyad</th>
<th style='border: 1px solid black;'>Puan</th>
<th style='border: 1px solid black;'>Yuzde</th>
<th style='border: 1px solid black;'>Harf Notu</th>
<th style='border: 1px solid black;'>Durum</th>
</tr></thead><tbody>
${sorted.map((r, i) => `<tr>
<td style='border: 1px solid black; text-align: center;'>${i + 1}</td>
<td style='border: 1px solid black;'>${r.studentNumber}</td>
<td style='border: 1px solid black;'>${r.studentName}</td>
<td style='border: 1px solid black; text-align: center;'>${r.score}/${exam.maxScore || 100}</td>
<td style='border: 1px solid black; text-align: center;'>%${r.percentage}</td>
<td style='border: 1px solid black; text-align: center;'>${r.letterGrade}</td>
<td style='border: 1px solid black; text-align: center;'>${(r.percentage || 0) >= 50 ? "Gecti" : "Kaldi"}</td>
</tr>`).join("")}
</tbody></table>
<p style='margin-top: 20px; font-size: 10pt;'>Olusturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
</body></html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${exam.courseCode}_${exam.examType}_Sonuclari.doc`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};

// ── Ana Sinav Otomasyonu Modulu ──
function SinavOtomasyonuApp({ currentUser }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSemester, setFilterSemester] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [gradeEntryExam, setGradeEntryExam] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list" | "schedule"

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    if (!FirebaseDB.isReady()) { setLoading(false); return; }
    try {
      setLoading(true);
      const fetched = await FirebaseDB.fetchExams();
      setExams(fetched);
    } catch (error) {
      console.error("Error loading exams:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      if (filterSemester !== "all" && e.semester !== filterSemester) return false;
      if (filterType !== "all" && e.examType !== filterType) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!(`${e.courseCode} ${e.courseName} ${e.supervisors || ""}`.toLowerCase().includes(search))) return false;
      }
      return true;
    });
  }, [exams, filterSemester, filterType, filterStatus, searchTerm]);

  const handleSaveExam = async (examData) => {
    try {
      if (examData.id) {
        await FirebaseDB.updateExam(examData.id, examData);
        setExams(prev => prev.map(e => e.id === examData.id ? { ...examData } : e));
        alert("Sinav guncellendi!");
      } else {
        const saved = await FirebaseDB.addExam(examData);
        setExams(prev => [...prev, saved]);
        alert("Sinav olusturuldu!");
      }
      setShowFormModal(false);
      setEditingExam(null);
    } catch (error) {
      console.error("Save exam error:", error);
      alert("Sinav kaydedilirken hata olustu.");
    }
  };

  const handleDeleteExam = async (id) => {
    if (!confirm("Bu sinavi silmek istediginizden emin misiniz? Iliskili tum sonuclar da silinecektir.")) return;
    try {
      // Delete exam results first
      const results = await FirebaseDB.fetchExamResults(id);
      for (const r of results) {
        await FirebaseDB.deleteExamResult(r.id);
      }
      await FirebaseDB.deleteExam(id);
      setExams(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error("Delete exam error:", error);
      alert("Sinav silinirken hata olustu.");
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = exams.length;
    const planned = exams.filter(e => e.status === "planned").length;
    const active = exams.filter(e => e.status === "active").length;
    const completed = exams.filter(e => e.status === "completed").length;
    return { total, planned, active, completed };
  }, [exams]);

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: C.textMuted }}>Sinavlar yukleniyor...</div>;
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 24 }}>
        {[
          { label: "Toplam Sinav", value: stats.total, color: C.navy },
          { label: "Planlanmis", value: stats.planned, color: C.blue },
          { label: "Aktif", value: stats.active, color: C.green },
          { label: "Tamamlanan", value: stats.completed, color: C.gold },
        ].map((s, i) => (
          <Card key={i} noPadding>
            <div style={{ padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: s.color, fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 300, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
              <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Ders kodu veya adi ara..." />
            </div>
            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}
              style={{ padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "white", cursor: "pointer" }}>
              <option value="all">Tum Donemler</option>
              {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              style={{ padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "white", cursor: "pointer" }}>
              <option value="all">Tum Turler</option>
              {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "white", cursor: "pointer" }}>
              <option value="all">Tum Durumlar</option>
              {EXAM_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {/* View toggle */}
            <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              <button onClick={() => setViewMode("list")} style={{
                padding: "8px 14px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
                background: viewMode === "list" ? C.navy : "white", color: viewMode === "list" ? "white" : C.textMuted,
              }}>Liste</button>
              <button onClick={() => setViewMode("schedule")} style={{
                padding: "8px 14px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
                background: viewMode === "schedule" ? C.navy : "white", color: viewMode === "schedule" ? "white" : C.textMuted,
              }}>Program</button>
            </div>
            {isAdmin && (
              <>
                <Btn onClick={() => generateExamScheduleDoc(filteredExams, filterSemester !== "all" ? filterSemester : "")} variant="secondary" icon={<DownloadIcon />}>Word Cikti</Btn>
                <Btn onClick={() => { setEditingExam(null); setShowFormModal(true); }} icon={<PlusIcon />}>Yeni Sinav</Btn>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Content */}
      {viewMode === "schedule" ? (
        <Card title="Sinav Programi">
          <ExamScheduleView exams={filteredExams} />
        </Card>
      ) : (
        <Card title={`Sinavlar (${filteredExams.length})`} noPadding>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                  {["Ders", "Tur", "Tarih / Saat", "Mekan", "Durum", "Islemler"].map((h, i) => (
                    <th key={i} style={{
                      padding: "14px 16px",
                      textAlign: i === 5 ? "right" : "left",
                      fontSize: 11, fontWeight: 700, color: C.navy,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredExams.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
                    {exams.length === 0 ? "Henuz sinav eklenmemis. 'Yeni Sinav' butonuna tiklayarak baslayabilirsiniz." : "Filtrelere uygun sinav bulunamadi."}
                  </td></tr>
                ) : filteredExams.map(exam => {
                  const typeInfo = EXAM_TYPES.find(t => t.value === exam.examType);
                  const statusInfo = EXAM_STATUSES.find(s => s.value === exam.status);
                  const dateStr = exam.date ? new Date(exam.date + "T00:00:00").toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : "-";

                  return (
                    <tr key={exam.id} style={{ borderBottom: `1px solid ${C.border}`, transition: "all 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bg}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{exam.courseCode}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{exam.courseName}</div>
                        {exam.supervisors && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{exam.supervisors}</div>}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <Badge color={C.blue} bg={C.blueLight}>{typeInfo?.label || exam.examType}</Badge>
                        {exam.weight > 0 && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Agirlik: %{exam.weight}</div>}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{dateStr}</div>
                        <div style={{ fontSize: 12, color: C.textMuted }}>{exam.startTime || "-"} {exam.duration ? `(${exam.duration} dk)` : ""}</div>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 14, color: C.text }}>{exam.location || "-"}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <Badge color={statusInfo?.color || C.navy} bg={statusInfo?.bg || C.bg}>{statusInfo?.label || exam.status}</Badge>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          {isAdmin && (
                            <Btn onClick={() => setGradeEntryExam(exam)} variant="success" small>Not Gir</Btn>
                          )}
                          {isAdmin && (
                            <Btn onClick={() => generateExamResultsDoc(exam)} variant="secondary" small icon={<DownloadIcon />}>Sonuc</Btn>
                          )}
                          {isAdmin && (
                            <button onClick={() => { setEditingExam(exam); setShowFormModal(true); }}
                              style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.navy, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                              <EditIcon />
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => handleDeleteExam(exam.id)}
                              style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.accent, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modals */}
      {showFormModal && (
        <ExamFormModal exam={editingExam} onClose={() => { setShowFormModal(false); setEditingExam(null); }} onSave={handleSaveExam} />
      )}
      {gradeEntryExam && (
        <GradeEntryModal exam={gradeEntryExam} onClose={() => setGradeEntryExam(null)} onSave={() => { setGradeEntryExam(null); loadExams(); }} />
      )}
    </div>
  );
}

// Export
window.SinavOtomasyonuApp = SinavOtomasyonuApp;
