import React, { useState, useMemo } from 'react';
import { Modal, FormField, Select, Input, Btn } from '../../../components/ui';
import { EXAM_TYPES } from '../constants';
import { formatDate, formatDateISO, parseDateISO } from '../utils';
import { db } from '../../../services/firebase';
import { C } from '../../../constants/theme';

const PeriodConfigModal = ({ period, onSave, onClose }) => {
    const [examType, setExamType] = useState(period?.examType || "final");
    const [startDate, setStartDate] = useState(period?.startDate || "");
    const [semester, setSemester] = useState(period?.semester || "Güz 2024-2025");
    const [saving, setSaving] = useState(false);

    const selectedType = EXAM_TYPES.find(t => t.value === examType);
    const endDate = useMemo(() => {
        if (!startDate || !selectedType) return "";
        const d = parseDateISO(startDate);
        d.setDate(d.getDate() + selectedType.weeks * 7 - 1);
        return formatDateISO(d);
    }, [startDate, selectedType]);

    const handleSave = async () => {
        if (!startDate) return alert("Başlangıç tarihi seçin");
        setSaving(true);
        try {
            const data = {
                examType,
                semester,
                startDate,
                endDate,
                weeks: selectedType.weeks,
                label: `${selectedType.label} - ${semester}`,
      };
      
      const ref = db.collection("sinav_donemler");
      if (period?.id) {
        await ref.doc(period.id).update(data);
      } else {
        await ref.add(data);
      }
      onSave(); // Refresh parent
      onClose();
    } catch (e) {
      console.error("Period save error:", e);
      alert("Kayıt hatası: " + e.message);
    }
    setSaving(false);
  };

  return (
    <Modal open={true} title={period?.id ? "Dönemi Düzenle" : "Yeni Sınav Dönemi"} onClose={onClose} width={500}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FormField label="Dönem">
          <Select value={semester} onChange={e => setSemester(e.target.value)}>
            {(() => {
              const semList = [];
              for (let y = 2024; y <= 2030; y++) {
                semList.push(`Güz ${y}-${y + 1}`);
                semList.push(`Bahar ${y}-${y + 1}`);
              }
              return semList;
            })().map(s =>
              <option key={s} value={s}>{s}</option>
            )}
          </Select>
        </FormField>
        <FormField label="Sınav Türü">
          <Select value={examType} onChange={e => setExamType(e.target.value)}>
            {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} ({t.weeks} hafta)</option>)}
          </Select>
        </FormField>
        <FormField label="Başlangıç Tarihi">
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </FormField>
        {endDate && (
          <div style={{ padding: 12, background: C.blueLight, borderRadius: 8, fontSize: 14 }}>
            Bitiş Tarihi: <strong>{formatDate(parseDateISO(endDate))}</strong> ({selectedType.weeks} hafta)
          </div>
        )}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="ghost" onClick={onClose}>İptal</Btn>
          <Btn onClick={handleSave} disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Btn>
        </div>
      </div>
    </Modal>
  );
};

export default PeriodConfigModal;
