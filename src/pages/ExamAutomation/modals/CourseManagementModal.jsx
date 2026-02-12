import React, { useState } from 'react';
import { Modal, FormField, Select, Input, Btn, Badge } from '../../../components/ui';
import { SINIF_COLORS } from '../constants';
import { C } from '../../../constants/theme';

const CourseManagementModal = ({ courses, professors, onSave, onDelete, onClose }) => {
    const [editingCourse, setEditingCourse] = useState(null);
    const [form, setForm] = useState({ code: "", name: "", sinif: 1, duration: 30, professor: "" });

    const startEdit = (c) => {
        setEditingCourse(c);
        setForm({ code: c.code, name: c.name, sinif: c.sinif, duration: c.duration, professor: c.professor });
    };

    const startNew = () => {
        setEditingCourse("new");
        setForm({ code: "", name: "", sinif: 1, duration: 30, professor: "" });
    };

    const handleSave = () => {
        if (!form.code || !form.name) return alert("Ders kodu ve adı gerekli");
        onSave(editingCourse === "new" ? null : editingCourse, form);
        setEditingCourse(null);
    };

    return (
    <Modal open={true} title="Ders Yönetimi" onClose={onClose} width={800}>
      <div style={{ maxHeight: 500, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.bg }}>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: `2px solid ${C.border}` }}>Kod</th>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: `2px solid ${C.border}` }}>Ders Adı</th>
              <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: `2px solid ${C.border}` }}>Sınıf</th>
              <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: `2px solid ${C.border}` }}>Süre</th>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: `2px solid ${C.border}` }}>Akademisyen</th>
              <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: `2px solid ${C.border}` }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {[...courses].sort((a, b) => {
              if (a.sinif !== b.sinif) return a.sinif - b.sinif;
              return a.code.localeCompare(b.code);
            }).map((c, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "8px 12px" }}>
                  <Badge style={{ background: SINIF_COLORS[c.sinif]?.bg, color: SINIF_COLORS[c.sinif]?.text }}>{c.code}</Badge>
                </td>
                <td style={{ padding: "8px 12px" }}>{c.name}</td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>{c.sinif === 5 ? "Seçmeli" : `${c.sinif}. Sınıf`}</td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>{c.duration} dk</td>
                <td style={{ padding: "8px 12px", fontSize: 12 }}>{c.professor || "-"}</td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <button onClick={() => startEdit(c)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: 13 }}>Düzenle</button>
                    <button onClick={() => onDelete(c)} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 13 }}>Sil</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingCourse && (
        <div style={{ marginTop: 16, padding: 16, background: C.bg, borderRadius: 8, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{editingCourse === "new" ? "Yeni Ders" : "Dersi Düzenle"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
            <FormField label="Ders Kodu">
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            </FormField>
            <FormField label="Ders Adı">
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </FormField>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12 }}>
            <FormField label="Sınıf">
              <Select value={form.sinif} onChange={e => setForm({ ...form, sinif: parseInt(e.target.value) })}>
                {[1, 2, 3, 4, 5].map(s => <option key={s} value={s}>{s === 5 ? "Seçmeli" : `${s}. Sınıf`}</option>)}
              </Select>
            </FormField>
            <FormField label="Süre (dk)">
              <Select value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })}>
                {[30, 45, 60, 75, 90, 105, 120].map(d => <option key={d} value={d}>{d} dk</option>)}
              </Select>
            </FormField>
            <FormField label="Akademisyen">
              <Input
                value={form.professor}
                onChange={e => setForm({ ...form, professor: e.target.value })}
                placeholder="Akademisyen ismi yazın..."
                list="course-prof-list"
              />
              <datalist id="course-prof-list">
                {professors.map((p, i) => <option key={i} value={p.name} />)}
              </datalist>
            </FormField>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setEditingCourse(null)}>İptal</Btn>
            <Btn onClick={handleSave}>Kaydet</Btn>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
        <Btn variant="ghost" onClick={startNew}>+ Yeni Ders Ekle</Btn>
        <Btn variant="ghost" onClick={onClose}>Kapat</Btn>
      </div>
    </Modal>
  );
};

export default CourseManagementModal;
