// ══════════════════════════════════════════════════════════════
// ÇAKÜ Sınav Programı Otomasyonu Modülü
// Sınav dönem ayarları, hoca yönetimi, otomatik tarih atama
// Shared bileşenler shared-components.jsx'den window üzerinden gelir
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ── Sabitler ──
const EXAM_TYPES = [
  { value: "vize", label: "Vize", periodWeeks: 1 },
  { value: "final", label: "Final", periodWeeks: 2 },
  { value: "but", label: "Butunleme", periodWeeks: 1 },
];

const EXAM_STATUSES = [
  { value: "unscheduled", label: "Tarih Atanmadi", color: "#9CA3AF", bg: "#F3F4F6" },
  { value: "scheduled", label: "Tarih Atandi", color: C.blue, bg: C.blueLight },
  { value: "locked", label: "Kilitli (Hoca Secti)", color: C.green, bg: C.greenLight },
  { value: "completed", label: "Tamamlandi", color: C.navy, bg: "#E8EAF0" },
  { value: "cancelled", label: "Iptal", color: C.accent, bg: "#FAEBED" },
];

const SEMESTERS = [
  "Guz 2024-2025", "Bahar 2024-2025",
  "Guz 2025-2026", "Bahar 2025-2026",
  "Guz 2026-2027", "Bahar 2026-2027",
];

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00",
];

const LOCATIONS = [
  "A Blok - 101", "A Blok - 102", "A Blok - 201", "A Blok - 202",
  "B Blok - 101", "B Blok - 102", "B Blok - 201",
  "Lab 1", "Lab 2", "Lab 3",
  "Amfi - 1", "Amfi - 2",
  "Online (Uzaktan)",
];

// ══════════════════════════════════════════════════════════════
// SINAV DONEM AYARLARI MODALI
// ══════════════════════════════════════════════════════════════
const ExamPeriodConfigModal = ({ periods, onClose, onSave }) => {
  const [localPeriods, setLocalPeriods] = useState(() => {
    const defaults = {};
    EXAM_TYPES.forEach(t => {
      const existing = periods.find(p => p.examType === t.value);
      defaults[t.value] = existing || { examType: t.value, startDate: "", endDate: "", semester: SEMESTERS[2] };
    });
    return defaults;
  });
  const [saving, setSaving] = useState(false);

  const updatePeriod = (type, field, value) => {
    setLocalPeriods(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
  };

  const autoEndDate = (type, startDate) => {
    if (!startDate) return;
    const start = new Date(startDate + "T00:00:00");
    const typeInfo = EXAM_TYPES.find(t => t.value === type);
    const weeks = typeInfo?.periodWeeks || 1;
    const end = new Date(start);
    end.setDate(end.getDate() + (weeks * 7) - 1);
    while (end.getDay() === 0 || end.getDay() === 6) {
      end.setDate(end.getDate() - 1);
    }
    updatePeriod(type, "endDate", end.toISOString().split("T")[0]);
  };

  const getDaysCount = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    let count = 0;
    const d = new Date(start);
    while (d <= end) {
      if (d.getDay() !== 0 && d.getDay() !== 6) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const results = [];
      for (const type of EXAM_TYPES) {
        const p = localPeriods[type.value];
        if (p.startDate && p.endDate) {
          const saved = await FirebaseDB.saveExamPeriod(p);
          results.push(saved);
        }
      }
      onSave(results);
      onClose();
    } catch (error) {
      alert("Donem ayarlari kaydedilirken hata: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Sinav Donemi Tarih Ayarlari" width={800}>
      <div style={{ padding: 16, background: "#E3F2FD", borderRadius: 10, marginBottom: 20, fontSize: 13, color: "#1565C0" }}>
        <strong>Bilgi:</strong> Final icin 2 haftalik (10 is gunu), Vize ve Butunleme icin 1'er haftalik (5 is gunu) donemler tanimlanir.
        Baslangic tarihini sectikten sonra bitis tarihi otomatik hesaplanir.
      </div>
      <FormField label="Donem">
        <Select value={localPeriods.vize.semester}
          onChange={e => { const s = e.target.value; EXAM_TYPES.forEach(t => updatePeriod(t.value, "semester", s)); }}
          options={SEMESTERS.map(s => ({ value: s, label: s }))} />
      </FormField>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {EXAM_TYPES.map(type => {
          const p = localPeriods[type.value];
          const days = getDaysCount(p.startDate, p.endDate);
          return (
            <div key={type.value} style={{ padding: 20, background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{
                  padding: "6px 14px", background: type.value === "final" ? C.navy : type.value === "vize" ? C.blue : C.gold,
                  color: "white", borderRadius: 8, fontWeight: 700, fontSize: 14,
                }}>{type.label}</div>
                <div style={{ fontSize: 13, color: C.textMuted }}>{type.periodWeeks} hafta ({type.periodWeeks * 5} is gunu)</div>
                {days > 0 && <Badge color={C.green} bg={C.greenLight}>{days} gun secili</Badge>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FormField label="Baslangic Tarihi">
                  <Input type="date" value={p.startDate}
                    onChange={e => { updatePeriod(type.value, "startDate", e.target.value); autoEndDate(type.value, e.target.value); }} />
                </FormField>
                <FormField label="Bitis Tarihi">
                  <Input type="date" value={p.endDate}
                    onChange={e => updatePeriod(type.value, "endDate", e.target.value)} />
                </FormField>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
        <Btn onClick={onClose} variant="secondary">Iptal</Btn>
        <Btn onClick={handleSave} disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Btn>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// HOCA YONETIMI MODALI
// ══════════════════════════════════════════════════════════════
const ProfessorManagementModal = ({ professors, onClose, onSave }) => {
  const [list, setList] = useState(professors);
  const [newProf, setNewProf] = useState({ name: "", title: "", department: "", faculty: "", isExternal: false, canChooseDate: false });

  const handleAdd = async () => {
    if (!newProf.name.trim()) { alert("Hoca adi zorunlu!"); return; }
    try {
      const saved = await FirebaseDB.saveProfessor(newProf);
      setList(prev => [...prev, saved]);
      setNewProf({ name: "", title: "", department: "", faculty: "", isExternal: false, canChooseDate: false });
    } catch (error) {
      alert("Hoca eklenirken hata: " + error.message);
    }
  };

  const handleUpdate = async (prof) => {
    try {
      await FirebaseDB.saveProfessor(prof);
      setList(prev => prev.map(p => p.id === prof.id ? prof : p));
    } catch (error) {
      alert("Hoca guncellenirken hata: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Bu hocayi silmek istiyor musunuz?")) return;
    try {
      await FirebaseDB.deleteProfessor(id);
      setList(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      alert("Hoca silinirken hata: " + error.message);
    }
  };

  const updateField = (id, field, value) => {
    setList(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const titleOptions = [
    { value: "Prof. Dr.", label: "Prof. Dr." },
    { value: "Doc. Dr.", label: "Doc. Dr." },
    { value: "Dr. Ogr. Uyesi", label: "Dr. Ogr. Uyesi" },
    { value: "Ogr. Gor.", label: "Ogr. Gor." },
    { value: "Ars. Gor.", label: "Ars. Gor." },
  ];

  return (
    <Modal open={true} onClose={() => { onSave(list); onClose(); }} title="Hoca Yonetimi" width={950}>
      <div style={{ padding: 16, background: C.goldPale, borderRadius: 10, border: `1px solid ${C.goldLight}`, marginBottom: 20, fontSize: 13 }}>
        <strong>Dis Fakulte Hocalari:</strong> "Dis Fakulte" ve "Tarih Secebilir" isaretli hocalar kendi sinav tarihlerini belirleyebilir.
        Diger hocalar icin tarihler otomatik atanir.
      </div>

      {/* Add New */}
      <div style={{ padding: 16, background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 12 }}>Yeni Hoca Ekle</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <FormField label="Unvan">
            <Select value={newProf.title} onChange={e => setNewProf(p => ({ ...p, title: e.target.value }))} options={titleOptions} placeholder="Unvan" />
          </FormField>
          <FormField label="Ad Soyad">
            <Input value={newProf.name} onChange={e => setNewProf(p => ({ ...p, name: e.target.value }))} placeholder="Orn: Ahmet Yilmaz" />
          </FormField>
          <FormField label="Bolum / Fakulte">
            <Input value={newProf.faculty} onChange={e => setNewProf(p => ({ ...p, faculty: e.target.value }))} placeholder="Orn: Fen Edebiyat Fakultesi" />
          </FormField>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
            <input type="checkbox" checked={newProf.isExternal} onChange={e => setNewProf(p => ({ ...p, isExternal: e.target.checked, canChooseDate: e.target.checked ? p.canChooseDate : false }))} />
            Dis Fakulte Hocasi
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, opacity: newProf.isExternal ? 1 : 0.4 }}>
            <input type="checkbox" checked={newProf.canChooseDate} onChange={e => setNewProf(p => ({ ...p, canChooseDate: e.target.checked }))} disabled={!newProf.isExternal} />
            Tarih Secebilir
          </label>
          <Btn onClick={handleAdd} icon={<PlusIcon />} small>Ekle</Btn>
        </div>
      </div>

      {/* List */}
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.bg }}>
              {["Unvan", "Ad Soyad", "Fakulte", "Dis Fakulte", "Tarih Secebilir", "Islem"].map((h, i) => (
                <th key={i} style={{ padding: "10px 12px", textAlign: i >= 3 ? "center" : "left", fontSize: 11, fontWeight: 700, color: C.navy, borderBottom: `2px solid ${C.border}`, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 30, textAlign: "center", color: C.textMuted }}>Henuz hoca eklenmemis.</td></tr>
            ) : list.map(prof => (
              <tr key={prof.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{prof.title}</td>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: C.navy }}>{prof.name}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: C.textMuted }}>{prof.faculty || "-"}</td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <input type="checkbox" checked={!!prof.isExternal}
                    onChange={e => { updateField(prof.id, "isExternal", e.target.checked); if (!e.target.checked) updateField(prof.id, "canChooseDate", false); handleUpdate({ ...prof, isExternal: e.target.checked, canChooseDate: e.target.checked ? prof.canChooseDate : false }); }} />
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <input type="checkbox" checked={!!prof.canChooseDate} disabled={!prof.isExternal}
                    onChange={e => { updateField(prof.id, "canChooseDate", e.target.checked); handleUpdate({ ...prof, canChooseDate: e.target.checked }); }}
                    style={{ opacity: prof.isExternal ? 1 : 0.3 }} />
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <button onClick={() => handleDelete(prof.id)} style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.accent, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 20, marginTop: 20, borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 13, color: C.textMuted }}>
          Toplam: {list.length} hoca | Dis fakulte: {list.filter(p => p.isExternal).length} | Tarih secebilir: {list.filter(p => p.canChooseDate).length}
        </div>
        <Btn onClick={() => { onSave(list); onClose(); }}>Kapat</Btn>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// SINAV OLUSTURMA / DUZENLEME MODALI
// ══════════════════════════════════════════════════════════════
const ExamFormModal = ({ exam, professors, periods, onClose, onSave }) => {
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
    professorId: "",
    professorName: "",
    status: "unscheduled",
    description: "",
    yearLevel: 0,
    ...exam,
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = () => {
    if (!form.courseCode.trim() || !form.courseName.trim()) { alert("Ders kodu ve adi zorunludur!"); return; }
    onSave(form);
  };

  const handleCourseCodeChange = (code) => {
    update("courseCode", code);
    const course = HOME_INSTITUTION_CATALOG.courses.find(c => c.code === code.toUpperCase());
    if (course) {
      update("courseName", course.name);
      update("yearLevel", course.year);
    }
  };

  const handleProfessorChange = (profId) => {
    const prof = professors.find(p => p.id === profId);
    update("professorId", profId);
    update("professorName", prof ? `${prof.title} ${prof.name}` : "");
  };

  const selectedProf = professors.find(p => p.id === form.professorId);
  const profCanChoose = selectedProf?.canChooseDate;

  const activePeriod = periods.find(p => p.examType === form.examType);
  const availableDates = useMemo(() => {
    if (!activePeriod?.startDate || !activePeriod?.endDate) return [];
    const dates = [];
    const start = new Date(activePeriod.startDate + "T00:00:00");
    const end = new Date(activePeriod.endDate + "T00:00:00");
    const d = new Date(start);
    while (d <= end) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        dates.push(d.toISOString().split("T")[0]);
      }
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }, [activePeriod]);

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
          <Select value={form.examType} onChange={e => update("examType", e.target.value)}
            options={EXAM_TYPES.map(t => ({ value: t.value, label: t.label }))} />
        </FormField>
        <FormField label="Donem">
          <Select value={form.semester} onChange={e => update("semester", e.target.value)}
            options={SEMESTERS.map(s => ({ value: s, label: s }))} />
        </FormField>
        <FormField label="Sorumlu Hoca">
          <Select value={form.professorId} onChange={e => handleProfessorChange(e.target.value)}
            options={professors.map(p => ({ value: p.id, label: `${p.title} ${p.name}${p.isExternal ? " (Dis)" : ""}` }))}
            placeholder="Hoca Secin" />
        </FormField>
        <FormField label="Sinif Duzey">
          <Select value={form.yearLevel} onChange={e => update("yearLevel", parseInt(e.target.value))}
            options={[{ value: 0, label: "Belirtilmemis" }, { value: 1, label: "1. Sinif" }, { value: 2, label: "2. Sinif" }, { value: 3, label: "3. Sinif" }, { value: 4, label: "4. Sinif" }]} />
        </FormField>

        <FormField label={profCanChoose ? "Tarih (Hoca Secimi)" : "Tarih"}>
          {availableDates.length > 0 ? (
            <Select value={form.date} onChange={e => { update("date", e.target.value); if (profCanChoose) update("status", "locked"); }}
              options={availableDates.map(d => {
                const dt = new Date(d + "T00:00:00");
                return { value: d, label: dt.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }) };
              })} placeholder="Tarih secin..." />
          ) : (
            <Input type="date" value={form.date} onChange={e => update("date", e.target.value)} />
          )}
          {profCanChoose && (
            <div style={{ marginTop: 6, fontSize: 11, color: C.green, fontWeight: 600 }}>
              Bu hoca dis fakulteden - kendi tarihini secebilir
            </div>
          )}
        </FormField>
        <FormField label="Baslangic Saati">
          <Select value={form.startTime} onChange={e => update("startTime", e.target.value)}
            options={TIME_SLOTS.map(t => ({ value: t, label: t }))} />
        </FormField>
        <FormField label="Sure (dk)">
          <Input type="number" value={form.duration} onChange={e => update("duration", parseInt(e.target.value) || 0)} />
        </FormField>
        <FormField label="Mekan">
          <Select value={form.location} onChange={e => update("location", e.target.value)}
            options={LOCATIONS.map(l => ({ value: l, label: l }))} placeholder="Mekan Secin" />
        </FormField>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
        <Btn onClick={onClose} variant="secondary">Iptal</Btn>
        <Btn onClick={handleSave}>{isEdit ? "Guncelle" : "Olustur"}</Btn>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// OTOMATIK ATAMA MOTORU
// ══════════════════════════════════════════════════════════════
const SchedulingEngine = {
  getWorkDays(startDate, endDate) {
    const days = [];
    if (!startDate || !endDate) return days;
    const d = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    while (d <= end) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        days.push(d.toISOString().split("T")[0]);
      }
      d.setDate(d.getDate() + 1);
    }
    return days;
  },

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  autoAssign(exams, periods) {
    const locked = exams.filter(e => e.status === "locked" || (e.date && e.status === "scheduled"));
    const toSchedule = exams.filter(e => !e.date || e.status === "unscheduled");

    if (toSchedule.length === 0) return { scheduled: exams, conflicts: [] };

    const conflicts = [];
    const scheduled = [...locked];

    // Build occupied map: date -> [{ examId, yearLevel, startTime }]
    const occupiedMap = {};
    locked.forEach(e => {
      if (!e.date) return;
      if (!occupiedMap[e.date]) occupiedMap[e.date] = [];
      occupiedMap[e.date].push({ examId: e.id, yearLevel: e.yearLevel, startTime: e.startTime });
    });

    // Group unscheduled by exam type
    const byType = {};
    toSchedule.forEach(e => {
      if (!byType[e.examType]) byType[e.examType] = [];
      byType[e.examType].push(e);
    });

    for (const [examType, typeExams] of Object.entries(byType)) {
      const period = periods.find(p => p.examType === examType);
      if (!period?.startDate || !period?.endDate) {
        typeExams.forEach(e => {
          conflicts.push({ exam: e, reason: `${examType} icin donem tarihi tanimlanmamis` });
          scheduled.push(e);
        });
        continue;
      }

      const workDays = this.getWorkDays(period.startDate, period.endDate);
      if (workDays.length === 0) {
        typeExams.forEach(e => { conflicts.push({ exam: e, reason: "Donemde is gunu bulunamadi" }); scheduled.push(e); });
        continue;
      }

      const shuffled = this.shuffle(typeExams);

      for (const exam of shuffled) {
        let assigned = false;
        const sortedDays = [...workDays].sort((a, b) => {
          return (occupiedMap[a] || []).length - (occupiedMap[b] || []).length;
        });

        for (const day of sortedDays) {
          const dayExams = occupiedMap[day] || [];

          // KRITER 1: Ayni sinif duzeyindeki ogrencilerin ayni gunde 2 sinavi olmasin
          const sameYearConflict = exam.yearLevel > 0 && dayExams.some(de => de.yearLevel === exam.yearLevel);
          if (sameYearConflict) continue;

          // KRITER 2: Bir gunde max 3 sinav
          if (dayExams.length >= 3) continue;

          const usedSlots = dayExams.map(de => de.startTime);
          const availableSlot = TIME_SLOTS.find(t => !usedSlots.includes(t));

          exam.date = day;
          exam.startTime = availableSlot || "09:00";
          exam.status = "scheduled";

          if (!occupiedMap[day]) occupiedMap[day] = [];
          occupiedMap[day].push({ examId: exam.id, yearLevel: exam.yearLevel, startTime: exam.startTime });

          assigned = true;
          break;
        }

        if (!assigned) {
          const fallbackDay = sortedDays.find(d => (occupiedMap[d] || []).length < 4) || sortedDays[0];
          const dayExams = occupiedMap[fallbackDay] || [];
          const usedSlots = dayExams.map(de => de.startTime);
          const slot = TIME_SLOTS.find(t => !usedSlots.includes(t)) || "09:00";

          exam.date = fallbackDay;
          exam.startTime = slot;
          exam.status = "scheduled";

          if (!occupiedMap[fallbackDay]) occupiedMap[fallbackDay] = [];
          occupiedMap[fallbackDay].push({ examId: exam.id, yearLevel: exam.yearLevel, startTime: exam.startTime });

          conflicts.push({ exam, reason: "Sinif catismasi onlenemedi, en uygun gune atandi" });
        }

        scheduled.push(exam);
      }
    }

    return { scheduled, conflicts };
  },
};

// ══════════════════════════════════════════════════════════════
// EXCEL / CSV CIKTI
// ══════════════════════════════════════════════════════════════
const exportExamScheduleToExcel = (exams, semester) => {
  const sorted = [...exams].filter(e => e.status !== "cancelled").sort((a, b) => {
    if (a.date && b.date) return new Date(a.date) - new Date(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });

  if (sorted.length === 0) { alert("Disa aktarilacak sinav bulunamadi."); return; }

  const headers = ["Tarih", "Gun", "Saat", "Ders Kodu", "Ders Adi", "Sinav Turu", "Sure (dk)", "Mekan", "Sorumlu Hoca", "Sinif", "Durum"];
  const rows = sorted.map(exam => {
    const dateObj = exam.date ? new Date(exam.date + "T00:00:00") : null;
    const dateStr = dateObj ? dateObj.toLocaleDateString('tr-TR') : "-";
    const dayStr = dateObj ? dateObj.toLocaleDateString('tr-TR', { weekday: 'long' }) : "-";
    const typeLabel = EXAM_TYPES.find(t => t.value === exam.examType)?.label || exam.examType;
    const statusLabel = EXAM_STATUSES.find(s => s.value === exam.status)?.label || exam.status;
    const yearStr = exam.yearLevel > 0 ? `${exam.yearLevel}. Sinif` : "-";
    return [dateStr, dayStr, exam.startTime || "-", exam.courseCode, `"${exam.courseName}"`, typeLabel, exam.duration || "-", exam.location || "-", `"${exam.professorName || "-"}"`, yearStr, statusLabel];
  });

  const csvContent = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Sinav_Programi_${(semester || "").replace(/\s/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Word export
const generateExamScheduleDoc = (exams, semester) => {
  const filtered = exams.filter(e => e.status !== "cancelled").sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
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
<th style='border: 1px solid black;'>Gun</th>
<th style='border: 1px solid black;'>Saat</th>
<th style='border: 1px solid black;'>Ders Kodu</th>
<th style='border: 1px solid black;'>Ders Adi</th>
<th style='border: 1px solid black;'>Sinav Turu</th>
<th style='border: 1px solid black;'>Sure</th>
<th style='border: 1px solid black;'>Mekan</th>
<th style='border: 1px solid black;'>Sorumlu Hoca</th>
</tr></thead><tbody>
${filtered.map(exam => {
  const dateObj = exam.date ? new Date(exam.date + "T00:00:00") : null;
  const date = dateObj ? dateObj.toLocaleDateString('tr-TR') : "-";
  const day = dateObj ? dateObj.toLocaleDateString('tr-TR', { weekday: 'long' }) : "-";
  const typeLabel = EXAM_TYPES.find(t => t.value === exam.examType)?.label || exam.examType;
  return `<tr>
    <td style='border: 1px solid black;'>${date}</td>
    <td style='border: 1px solid black;'>${day}</td>
    <td style='border: 1px solid black; text-align: center;'>${exam.startTime || "-"}</td>
    <td style='border: 1px solid black;'>${exam.courseCode}</td>
    <td style='border: 1px solid black;'>${exam.courseName}</td>
    <td style='border: 1px solid black; text-align: center;'>${typeLabel}</td>
    <td style='border: 1px solid black; text-align: center;'>${exam.duration ? exam.duration + " dk" : "-"}</td>
    <td style='border: 1px solid black;'>${exam.location || "-"}</td>
    <td style='border: 1px solid black;'>${exam.professorName || "-"}</td>
  </tr>`;
}).join("")}
</tbody></table>
<p style='margin-top: 20px; font-size: 10pt;'>Olusturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
</body></html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `Sinav_Programi_${(semester || "").replace(/\s/g, "_")}.doc`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};

// ══════════════════════════════════════════════════════════════
// SINAV PROGRAMI GORUNUMU
// ══════════════════════════════════════════════════════════════
const ExamScheduleView = ({ exams }) => {
  const sortedExams = [...exams].filter(e => e.date && e.status !== "cancelled").sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sortedExams.length === 0) return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Tarih atanmis sinav bulunamadi.</div>;

  const grouped = {};
  sortedExams.forEach(exam => {
    if (!grouped[exam.date]) grouped[exam.date] = [];
    grouped[exam.date].push(exam);
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
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, opacity: isPast ? 0.6 : 1 }}>
              <div style={{ width: 50, height: 50, borderRadius: 10, background: isPast ? C.border : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: isPast ? C.textMuted : "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif" }}>
                <div style={{ fontSize: 18, lineHeight: 1, fontWeight: 700 }}>{date.getDate()}</div>
                <div style={{ fontSize: 9, textTransform: "uppercase" }}>{date.toLocaleDateString('tr-TR', { month: 'short' })}</div>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.navy }}>{formattedDate}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{dayName} - {dayExams.length} sinav</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 62 }}>
              {dayExams.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || "")).map(exam => {
                const statusInfo = EXAM_STATUSES.find(s => s.value === exam.status);
                return (
                  <div key={exam.id} style={{ padding: "12px 16px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ padding: "4px 8px", background: C.blueLight, color: C.blue, borderRadius: 6, fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", minWidth: 50, textAlign: "center" }}>{exam.startTime || "TBD"}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: C.navy, fontSize: 14 }}>{exam.courseCode} - {exam.courseName}</div>
                      <div style={{ fontSize: 12, color: C.textMuted, display: "flex", gap: 12, marginTop: 2 }}>
                        {exam.professorName && <span>{exam.professorName}</span>}
                        {exam.duration && <span>{exam.duration} dk</span>}
                        {exam.location && <span>{exam.location}</span>}
                      </div>
                    </div>
                    <Badge color={statusInfo?.color || C.navy} bg={statusInfo?.bg || C.bg}>{statusInfo?.label || exam.status}</Badge>
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

// ══════════════════════════════════════════════════════════════
// ANA SINAV PROGRAMI OTOMASYONU MODULU
// ══════════════════════════════════════════════════════════════
function SinavOtomasyonuApp({ currentUser }) {
  const [exams, setExams] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterSemester, setFilterSemester] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list");

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [showPeriodConfig, setShowPeriodConfig] = useState(false);
  const [showProfessorModal, setShowProfessorModal] = useState(false);
  const [schedulingResult, setSchedulingResult] = useState(null);

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    if (!FirebaseDB.isReady()) { setLoading(false); return; }
    try {
      setLoading(true);
      const [fetchedExams, fetchedProfessors, fetchedPeriods] = await Promise.all([
        FirebaseDB.fetchExams(),
        FirebaseDB.fetchProfessors(),
        FirebaseDB.fetchExamPeriods(),
      ]);
      setExams(fetchedExams);
      setProfessors(fetchedProfessors);
      setPeriods(fetchedPeriods);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = useMemo(() => exams.filter(e => {
    if (filterSemester !== "all" && e.semester !== filterSemester) return false;
    if (filterType !== "all" && e.examType !== filterType) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (searchTerm && !`${e.courseCode} ${e.courseName} ${e.professorName || ""}`.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }), [exams, filterSemester, filterType, filterStatus, searchTerm]);

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
      alert("Sinav kaydedilirken hata: " + error.message);
    }
  };

  const handleDeleteExam = async (id) => {
    if (!confirm("Bu sinavi silmek istiyor musunuz?")) return;
    try {
      await FirebaseDB.deleteExam(id);
      setExams(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      alert("Sinav silinirken hata: " + error.message);
    }
  };

  // OTOMATIK ATAMA
  const handleAutoSchedule = async () => {
    if (periods.length === 0) {
      alert("Oncelikle 'Donem Ayarlari'ndan sinav tarihi araligini tanimlayin.");
      return;
    }
    const unscheduledCount = exams.filter(e => !e.date || e.status === "unscheduled").length;
    if (unscheduledCount === 0) {
      alert("Tarih atanacak sinav bulunmuyor.");
      return;
    }
    if (!confirm(`${unscheduledCount} sinav icin otomatik tarih atamasi yapilacak. Devam edilsin mi?`)) return;

    const result = SchedulingEngine.autoAssign([...exams], periods);

    try {
      for (const exam of result.scheduled) {
        if (exam.id && exam.date) {
          await FirebaseDB.updateExam(exam.id, exam);
        }
      }
      setExams(result.scheduled);
      setSchedulingResult(result);
      alert(`Otomatik atama tamamlandi! ${result.conflicts.length > 0 ? result.conflicts.length + " uyari var." : ""}`);
    } catch (error) {
      alert("Atama sirasinda hata: " + error.message);
    }
  };

  // Tarihleri sifirla
  const handleResetSchedule = async () => {
    const scheduledExams = exams.filter(e => e.status === "scheduled");
    if (scheduledExams.length === 0) { alert("Sifirlanacak atanmis sinav yok."); return; }
    if (!confirm(`${scheduledExams.length} sinavin tarih atamasini sifirlamak istiyor musunuz? (Hoca kilitli olanlar etkilenmez)`)) return;

    try {
      const updated = exams.map(e => {
        if (e.status === "scheduled") {
          return { ...e, date: "", startTime: "09:00", status: "unscheduled" };
        }
        return e;
      });
      for (const exam of updated) {
        if (exam.id && exam.status === "unscheduled") {
          await FirebaseDB.updateExam(exam.id, exam);
        }
      }
      setExams(updated);
      setSchedulingResult(null);
      alert("Tarih atamalari sifirlandi. Hoca kilitli sinavlar korundu.");
    } catch (error) {
      alert("Sifirlama sirasinda hata: " + error.message);
    }
  };

  // Stats
  const stats = useMemo(() => ({
    total: exams.length,
    unscheduled: exams.filter(e => !e.date || e.status === "unscheduled").length,
    scheduled: exams.filter(e => e.status === "scheduled").length,
    locked: exams.filter(e => e.status === "locked").length,
    completed: exams.filter(e => e.status === "completed").length,
  }), [exams]);

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: C.textMuted }}>Sinavlar yukleniyor...</div>;
  }

  const selectStyle = { padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "white", cursor: "pointer" };

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Toplam Sinav", value: stats.total, color: C.navy },
          { label: "Atanmamis", value: stats.unscheduled, color: "#9CA3AF" },
          { label: "Tarih Atandi", value: stats.scheduled, color: C.blue },
          { label: "Hoca Kilidi", value: stats.locked, color: C.green },
          { label: "Tamamlanan", value: stats.completed, color: C.gold },
        ].map((s, i) => (
          <Card key={i} noPadding>
            <div style={{ padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: s.color, fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Period Info */}
      {periods.length > 0 && (
        <Card>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {EXAM_TYPES.map(type => {
              const period = periods.find(p => p.examType === type.value);
              if (!period?.startDate) return null;
              const start = new Date(period.startDate + "T00:00:00");
              const end = new Date(period.endDate + "T00:00:00");
              return (
                <div key={type.value} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <Badge color={type.value === "final" ? C.navy : type.value === "vize" ? C.blue : C.gold} bg={type.value === "final" ? "#E8EAF0" : type.value === "vize" ? C.blueLight : C.goldPale}>{type.label}</Badge>
                  <span style={{ fontSize: 13 }}>{start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} - {end.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Scheduling Result Conflicts */}
      {schedulingResult?.conflicts.length > 0 && (
        <Card>
          <div style={{ padding: 16, background: "#FFF3CD", borderRadius: 10, border: "2px solid #FFC107" }}>
            <div style={{ fontWeight: 600, color: "#856404", marginBottom: 8 }}>Atama Uyarilari ({schedulingResult.conflicts.length})</div>
            {schedulingResult.conflicts.map((c, i) => (
              <div key={i} style={{ fontSize: 13, color: "#856404", marginBottom: 4 }}>
                {c.exam.courseCode} - {c.exam.courseName}: {c.reason}
              </div>
            ))}
            <Btn onClick={() => setSchedulingResult(null)} variant="secondary" small>Kapat</Btn>
          </div>
        </Card>
      )}

      {/* Toolbar */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 300, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180, maxWidth: 280 }}>
              <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Ders veya hoca ara..." />
            </div>
            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} style={selectStyle}>
              <option value="all">Tum Donemler</option>
              {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selectStyle}>
              <option value="all">Tum Turler</option>
              {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
              <option value="all">Tum Durumlar</option>
              {EXAM_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              {["list", "schedule"].map(m => (
                <button key={m} onClick={() => setViewMode(m)} style={{ padding: "8px 14px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: viewMode === m ? C.navy : "white", color: viewMode === m ? "white" : C.textMuted }}>{m === "list" ? "Liste" : "Program"}</button>
              ))}
            </div>
            {isAdmin && (
              <>
                <Btn onClick={() => setShowPeriodConfig(true)} variant="secondary" small>Donem Ayarlari</Btn>
                <Btn onClick={() => setShowProfessorModal(true)} variant="secondary" small>Hoca Yonetimi</Btn>
                <Btn onClick={handleAutoSchedule} variant="success" small>Otomatik Ata</Btn>
                <Btn onClick={handleResetSchedule} variant="secondary" small>Sifirla</Btn>
                <Btn onClick={() => exportExamScheduleToExcel(filteredExams, filterSemester !== "all" ? filterSemester : "")} variant="secondary" small icon={<DownloadIcon />}>Excel</Btn>
                <Btn onClick={() => generateExamScheduleDoc(filteredExams, filterSemester !== "all" ? filterSemester : "")} variant="secondary" small icon={<DownloadIcon />}>Word</Btn>
                <Btn onClick={() => { setEditingExam(null); setShowFormModal(true); }} icon={<PlusIcon />} small>Yeni Sinav</Btn>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Content */}
      {viewMode === "schedule" ? (
        <Card title="Sinav Programi"><ExamScheduleView exams={filteredExams} /></Card>
      ) : (
        <Card title={`Sinavlar (${filteredExams.length})`} noPadding>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                  {["Ders", "Tur / Sinif", "Hoca", "Tarih / Saat", "Mekan", "Durum", "Islemler"].map((h, i) => (
                    <th key={i} style={{ padding: "12px 14px", textAlign: i === 6 ? "right" : "left", fontSize: 11, fontWeight: 700, color: C.navy, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredExams.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
                    {exams.length === 0 ? "Henuz sinav eklenmemis." : "Filtrelere uygun sinav bulunamadi."}
                  </td></tr>
                ) : filteredExams.map(exam => {
                  const typeInfo = EXAM_TYPES.find(t => t.value === exam.examType);
                  const statusInfo = EXAM_STATUSES.find(s => s.value === exam.status);
                  const dateStr = exam.date ? new Date(exam.date + "T00:00:00").toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : "-";
                  const dayStr = exam.date ? new Date(exam.date + "T00:00:00").toLocaleDateString('tr-TR', { weekday: 'short' }) : "";
                  return (
                    <tr key={exam.id} style={{ borderBottom: `1px solid ${C.border}` }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bg}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{exam.courseCode}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{exam.courseName}</div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <Badge color={C.blue} bg={C.blueLight}>{typeInfo?.label || exam.examType}</Badge>
                        {exam.yearLevel > 0 && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{exam.yearLevel}. Sinif</div>}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13 }}>
                        {exam.professorName || <span style={{ color: C.textMuted }}>-</span>}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{dateStr} {dayStr && <span style={{ color: C.textMuted, fontSize: 12 }}>({dayStr})</span>}</div>
                        <div style={{ fontSize: 12, color: C.textMuted }}>{exam.startTime || "-"} {exam.duration ? `(${exam.duration} dk)` : ""}</div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13 }}>{exam.location || "-"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <Badge color={statusInfo?.color || C.navy} bg={statusInfo?.bg || C.bg}>{statusInfo?.label || exam.status}</Badge>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {isAdmin && <button onClick={() => { setEditingExam(exam); setShowFormModal(true); }} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.navy, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><EditIcon /></button>}
                          {isAdmin && <button onClick={() => handleDeleteExam(exam.id)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.accent, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><TrashIcon /></button>}
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
        <ExamFormModal exam={editingExam} professors={professors} periods={periods}
          onClose={() => { setShowFormModal(false); setEditingExam(null); }} onSave={handleSaveExam} />
      )}
      {showPeriodConfig && (
        <ExamPeriodConfigModal periods={periods}
          onClose={() => setShowPeriodConfig(false)} onSave={(saved) => setPeriods(saved)} />
      )}
      {showProfessorModal && (
        <ProfessorManagementModal professors={professors}
          onClose={() => setShowProfessorModal(false)} onSave={(list) => setProfessors(list)} />
      )}
    </div>
  );
}

// Export
window.SinavOtomasyonuApp = SinavOtomasyonuApp;
