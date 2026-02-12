import React, { useState } from 'react';
import { Modal, FormField, Select, Input, Btn } from '../../../components/ui';
import { SINIF_COLORS } from '../constants';

const EditExamModal = ({ exam, professors, onSave, onRemove, onClose }) => {
    const [studentCount, setStudentCount] = useState(exam?.studentCount || "");
    const [supervisor, setSupervisor] = useState(exam?.supervisor || "");
    const [room, setRoom] = useState(exam?.room || "");
    const [duration, setDuration] = useState(exam?.duration || 30);
    const [professor, setProfessor] = useState(exam?.professor || "");
    const [saving, setSaving] = useState(false);

    // Local state for 'sinif' to allow changing it
    const [currentSinif, setCurrentSinif] = useState(exam?.sinif || 1);

    const handleSave = async () => {
        if (!studentCount || parseInt(studentCount) <= 0) {
            alert("Öğrenci sayısı girilmesi zorunludur.");
            return;
        }
        setSaving(true);
        try {
            await onSave({
                ...exam,
                sinif: parseInt(currentSinif),
                studentCount: parseInt(studentCount) || 0,
                supervisor,
                room,
                duration: parseInt(duration) || 30,
                professor,
            });
            onClose();
        } catch (e) {
            alert("Hata: " + e.message);
        }
        setSaving(false);
    };

    const color = SINIF_COLORS[currentSinif] || SINIF_COLORS[1];

    return (
        <Modal open={true} title="Sınav Detaylarını Düzenle" onClose={onClose} width={500}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ padding: 12, background: color.bg, borderRadius: 8, fontSize: 14 }}>
                    <strong>{exam.code}</strong> - {exam.name}
                </div>
                <FormField label="Akademisyen">
                    <Input value={professor} onChange={e => setProfessor(e.target.value)} placeholder="Akademisyen ismi" list="prof-list" />
                    <datalist id="prof-list">
                        {(professors || []).map((p, i) => <option key={i} value={p.name} />)}
                    </datalist>
                </FormField>

                <FormField label="Sınıf">
                    <Select value={currentSinif} onChange={e => setCurrentSinif(parseInt(e.target.value))}>
                        {[1, 2, 3, 4].map(s => <option key={s} value={s}>{s}. Sınıf</option>)}
                    </Select>
                </FormField>
                <FormField label="Sınav Süresi (dk)">
                    <Select value={duration} onChange={e => setDuration(parseInt(e.target.value))}>
                        {[30, 45, 60, 75, 90, 105, 120].map(d => <option key={d} value={d}>{d} dakika</option>)}
                    </Select>
                </FormField>
                <FormField label="Öğrenci Sayısı *">
                    <Input
                        type="number"
                        value={studentCount}
                        onChange={e => setStudentCount(e.target.value)}
                        placeholder="Örn: 45"
                        style={(!studentCount || parseInt(studentCount) <= 0) ? { borderColor: "#DC2626" } : {}}
                    />
                </FormField>
                <FormField label="Gözetmen">
                    <Input value={supervisor} onChange={e => setSupervisor(e.target.value)} placeholder="Gözetmen adı" />
                </FormField>
                <FormField label="Sınıf / Salon">
                    <Input value={room} onChange={e => setRoom(e.target.value)} placeholder="Örn: D-201" />
                </FormField>
                <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 8 }}>
                    <Btn variant="ghost" onClick={() => { onRemove(exam); onClose(); }} style={{ color: "#DC2626" }}>
                        Takvimden Kaldır
                    </Btn>
                    <div style={{ display: "flex", gap: 12 }}>
                        <Btn variant="ghost" onClick={onClose}>İptal</Btn>
                        <Btn onClick={handleSave} disabled={saving || !studentCount || parseInt(studentCount) <= 0}>{saving ? "..." : "Kaydet"}</Btn>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default EditExamModal;
