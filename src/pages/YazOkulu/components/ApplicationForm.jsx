import React, { useState } from 'react';
import { C } from '../../../constants/theme';
import { DERS_STATUSU, EMPTY_APPLICATION } from '../constants';

// ── Boş ders satırı ──
const emptyCourseRow = () => ({
  extCode: '', extName: '', extAKTS: '', extGrade: '',
  cakuCode: '', cakuName: '', cakuAKTS: '', cakuGrade: '', cakuStatus: 'Zorunlu',
});

// ── Form alan bileşeni ──
const Field = ({ label, value, onChange, placeholder, required, width }) => (
  <div style={{ flex: width || 1, minWidth: 160 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: C.navy, display: 'block', marginBottom: 4 }}>
      {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
    </label>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`,
        borderRadius: 8, fontSize: 14, outline: 'none',
        background: 'white',
      }}
      onFocus={e => { e.target.style.borderColor = C.blue; }}
      onBlur={e => { e.target.style.borderColor = C.border; }}
    />
  </div>
);

// ── Ana Başvuru Formu ──
const ApplicationForm = ({ currentUser, onSubmit, onCancel, initialData }) => {
  const [form, setForm] = useState(() => {
    if (initialData) return { ...initialData };
    return {
      ...EMPTY_APPLICATION,
      studentNo: currentUser?.studentNo || '',
      studentName: currentUser?.studentName || currentUser?.name || '',
      courseMatches: [emptyCourseRow()],
    };
  });
  const [saving, setSaving] = useState(false);

  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // ── Ders satırı işlemleri ──
  const updateCourse = (idx, key, value) => {
    setForm(prev => {
      const updated = [...prev.courseMatches];
      updated[idx] = { ...updated[idx], [key]: value };
      return { ...prev, courseMatches: updated };
    });
  };

  const addCourseRow = () => {
    setForm(prev => ({
      ...prev,
      courseMatches: [...prev.courseMatches, emptyCourseRow()],
    }));
  };

  const removeCourseRow = (idx) => {
    if (form.courseMatches.length <= 1) return;
    setForm(prev => ({
      ...prev,
      courseMatches: prev.courseMatches.filter((_, i) => i !== idx),
    }));
  };

  // ── Toplam AKTS hesapla ──
  const totalExtAKTS = form.courseMatches.reduce((sum, c) => sum + (parseInt(c.extAKTS) || 0), 0);
  const totalCakuAKTS = form.courseMatches.reduce((sum, c) => sum + (parseInt(c.cakuAKTS) || 0), 0);

  // ── Gönder ──
  const handleSubmit = async (asDraft) => {
    if (!asDraft) {
      if (!form.studentNo || !form.studentName || !form.otherUniversity || !form.academicYear) {
        alert('Lütfen zorunlu alanları doldurun (Öğrenci No, Ad Soyad, Üniversite, Eğitim-Öğretim Yılı)');
        return;
      }
      const hasEmptyCourse = form.courseMatches.some(c => !c.extName || !c.cakuName);
      if (hasEmptyCourse) {
        alert('Lütfen tüm ders eşleştirmelerini doldurun');
        return;
      }
    }
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        status: asDraft ? 'taslak' : 'gonderildi',
      });
    } catch (err) {
      alert('Hata: ' + err.message);
    }
    setSaving(false);
  };

  // ── Tablo hücre stili ──
  const cellInput = (value, onChange, placeholder, width) => (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: width || '100%', padding: '8px 10px',
        border: `1px solid ${C.borderLight || C.border}`,
        borderRadius: 6, fontSize: 13, outline: 'none',
        background: 'white',
      }}
      onFocus={e => { e.target.style.borderColor = C.blue; }}
      onBlur={e => { e.target.style.borderColor = C.borderLight || C.border; }}
    />
  );

  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: 28,
      border: `1px solid ${C.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    }}>
      {/* Başlık */}
      <div style={{ marginBottom: 24, borderBottom: `2px solid ${C.navy}`, paddingBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 4 }}>
          YAZ DÖNEMİ DERS İNTİBAK İSTEĞİ
        </h2>
        <p style={{ fontSize: 13, color: C.textMuted }}>
          Çankırı Karatekin Üniversitesi Önlisans ve Lisans Eğitim Öğretim Yönetmeliğinin 12. maddesi
        </p>
      </div>

      {/* ── Bölüm 1: Öğrenci Bilgileri ── */}
      <div style={{
        background: C.bg, borderRadius: 12, padding: 20, marginBottom: 20,
        border: `1px solid ${C.border}`,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: C.navy, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>1</span>
          Öğrenci Bilgileri
        </h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label="Öğrenci No" value={form.studentNo} onChange={v => updateField('studentNo', v)} placeholder="Ör: 2021..." required />
          <Field label="Ad Soyad" value={form.studentName} onChange={v => updateField('studentName', v)} placeholder="Ör: Furkan ÖZEL" required width={2} />
          <Field label="Eğitim-Öğretim Yılı" value={form.academicYear} onChange={v => updateField('academicYear', v)} placeholder="Ör: 2024-2025" required />
        </div>
      </div>

      {/* ── Bölüm 2: Yaz Okulu Üniversite Bilgileri ── */}
      <div style={{
        background: C.bg, borderRadius: 12, padding: 20, marginBottom: 20,
        border: `1px solid ${C.border}`,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: C.navy, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>2</span>
          Yaz Okulu Üniversite Bilgileri
        </h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label="Üniversite Adı" value={form.otherUniversity} onChange={v => updateField('otherUniversity', v)} placeholder="Ör: Ankara Üniversitesi" required width={2} />
          <Field label="Fakülte" value={form.otherFaculty} onChange={v => updateField('otherFaculty', v)} placeholder="Ör: Mühendislik Fakültesi" />
          <Field label="Bölüm" value={form.otherDepartment} onChange={v => updateField('otherDepartment', v)} placeholder="Ör: Bilgisayar Mühendisliği" />
        </div>
      </div>

      {/* ── Bölüm 3: ÇAKÜ Bilgileri ── */}
      <div style={{
        background: C.bg, borderRadius: 12, padding: 20, marginBottom: 20,
        border: `1px solid ${C.border}`,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: C.navy, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>3</span>
          ÇAKÜ Bilgileri
        </h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label="Fakülte" value={form.cakuFaculty} onChange={v => updateField('cakuFaculty', v)} placeholder="Ör: Mühendislik Fakültesi" />
          <Field label="Bölüm" value={form.cakuDepartment} onChange={v => updateField('cakuDepartment', v)} placeholder="Ör: Bilgisayar Mühendisliği" />
        </div>
      </div>

      {/* ── Bölüm 4: Ders Eşleştirme Tablosu ── */}
      <div style={{
        borderRadius: 12, marginBottom: 24,
        border: `1px solid ${C.border}`, overflow: 'hidden',
      }}>
        <h3 style={{
          fontSize: 14, fontWeight: 700, color: 'white', padding: '12px 20px',
          background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`,
          display: 'flex', alignItems: 'center', gap: 8, margin: 0,
        }}>
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>4</span>
          Ders Eşleştirme Tablosu
        </h3>

        {/* Tablo başlık */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                <th colSpan={4} style={{
                  padding: '10px 12px', background: '#DBEAFE',
                  borderBottom: `2px solid ${C.blue}`, borderRight: `2px solid ${C.navy}`,
                  fontSize: 12, fontWeight: 700, color: C.navy, textAlign: 'center',
                }}>
                  {form.otherUniversity || 'Diğer Üniversite'} - Aldığı Ders
                </th>
                <th colSpan={5} style={{
                  padding: '10px 12px', background: '#D1FAE5',
                  borderBottom: `2px solid ${C.green || '#10B981'}`,
                  fontSize: 12, fontWeight: 700, color: C.navy, textAlign: 'center',
                }}>
                  ÇAKÜ - Muaf Olacağı Ders
                </th>
                <th style={{ width: 40, background: C.bg, borderBottom: `1px solid ${C.border}` }}></th>
              </tr>
              <tr style={{ background: C.bg }}>
                {['Kodu', 'Adı', 'AKTS', 'Başarı Notu'].map((h, i) => (
                  <th key={'ext-' + i} style={{
                    padding: '8px 6px', fontSize: 11, fontWeight: 700, color: C.navy,
                    textAlign: 'center', borderBottom: `1px solid ${C.border}`,
                    borderRight: i === 3 ? `2px solid ${C.navy}` : `1px solid ${C.borderLight || C.border}`,
                  }}>{h}</th>
                ))}
                {['Kodu', 'Adı', 'AKTS', 'Başarı Notu', 'Statüsü'].map((h, i) => (
                  <th key={'caku-' + i} style={{
                    padding: '8px 6px', fontSize: 11, fontWeight: 700, color: C.navy,
                    textAlign: 'center', borderBottom: `1px solid ${C.border}`,
                    borderRight: `1px solid ${C.borderLight || C.border}`,
                  }}>{h}</th>
                ))}
                <th style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}></th>
              </tr>
            </thead>
            <tbody>
              {form.courseMatches.map((course, idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${C.borderLight || C.border}` }}>
                  {/* Diğer üniversite (sol) */}
                  <td style={{ padding: 4, borderRight: `1px solid ${C.borderLight || C.border}` }}>
                    {cellInput(course.extCode, v => updateCourse(idx, 'extCode', v), 'Kod')}
                  </td>
                  <td style={{ padding: 4, borderRight: `1px solid ${C.borderLight || C.border}`, minWidth: 160 }}>
                    {cellInput(course.extName, v => updateCourse(idx, 'extName', v), 'Ders adı')}
                  </td>
                  <td style={{ padding: 4, borderRight: `1px solid ${C.borderLight || C.border}`, width: 60 }}>
                    {cellInput(course.extAKTS, v => updateCourse(idx, 'extAKTS', v), 'AKTS')}
                  </td>
                  <td style={{ padding: 4, borderRight: `2px solid ${C.navy}`, width: 70 }}>
                    {cellInput(course.extGrade, v => updateCourse(idx, 'extGrade', v), 'Not')}
                  </td>
                  {/* ÇAKÜ (sağ) */}
                  <td style={{ padding: 4, borderRight: `1px solid ${C.borderLight || C.border}` }}>
                    {cellInput(course.cakuCode, v => updateCourse(idx, 'cakuCode', v), 'Kod')}
                  </td>
                  <td style={{ padding: 4, borderRight: `1px solid ${C.borderLight || C.border}`, minWidth: 160 }}>
                    {cellInput(course.cakuName, v => updateCourse(idx, 'cakuName', v), 'Ders adı')}
                  </td>
                  <td style={{ padding: 4, borderRight: `1px solid ${C.borderLight || C.border}`, width: 60 }}>
                    {cellInput(course.cakuAKTS, v => updateCourse(idx, 'cakuAKTS', v), 'AKTS')}
                  </td>
                  <td style={{ padding: 4, borderRight: `1px solid ${C.borderLight || C.border}`, width: 70 }}>
                    {cellInput(course.cakuGrade, v => updateCourse(idx, 'cakuGrade', v), 'Not')}
                  </td>
                  <td style={{ padding: 4, borderRight: `1px solid ${C.borderLight || C.border}`, width: 90 }}>
                    <select
                      value={course.cakuStatus}
                      onChange={e => updateCourse(idx, 'cakuStatus', e.target.value)}
                      style={{
                        width: '100%', padding: '8px 6px',
                        border: `1px solid ${C.borderLight || C.border}`,
                        borderRadius: 6, fontSize: 12, outline: 'none', background: 'white',
                      }}
                    >
                      {DERS_STATUSU.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  {/* Sil */}
                  <td style={{ padding: 4, textAlign: 'center' }}>
                    {form.courseMatches.length > 1 && (
                      <button
                        onClick={() => removeCourseRow(idx)}
                        style={{
                          padding: 4, border: 'none', background: 'transparent',
                          cursor: 'pointer', color: '#EF4444', fontSize: 16, lineHeight: 1,
                        }}
                        title="Satırı sil"
                      >×</button>
                    )}
                  </td>
                </tr>
              ))}
              {/* Toplam satırı */}
              <tr style={{ background: C.bg, fontWeight: 700 }}>
                <td colSpan={2} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: C.navy, borderRight: `1px solid ${C.border}` }}>
                  Toplam
                </td>
                <td style={{ padding: '10px 6px', textAlign: 'center', fontSize: 14, color: C.navy, borderRight: `1px solid ${C.border}` }}>
                  {totalExtAKTS || ''}
                </td>
                <td style={{ borderRight: `2px solid ${C.navy}` }}></td>
                <td colSpan={2} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: C.navy, borderRight: `1px solid ${C.border}` }}>
                  Toplam
                </td>
                <td style={{ padding: '10px 6px', textAlign: 'center', fontSize: 14, color: C.navy, borderRight: `1px solid ${C.border}` }}>
                  {totalCakuAKTS || ''}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Ders satırı ekle */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={addCourseRow}
            style={{
              padding: '8px 16px', border: `1px dashed ${C.border}`,
              borderRadius: 8, background: 'transparent', cursor: 'pointer',
              fontSize: 13, color: C.blue, fontWeight: 600,
            }}
          >
            + Ders Satırı Ekle
          </button>
        </div>
      </div>

      {/* ── Alt butonlar ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              padding: '12px 24px', border: `1px solid ${C.border}`,
              borderRadius: 10, background: 'white', cursor: 'pointer',
              fontSize: 14, color: C.textMuted, fontWeight: 500,
            }}
          >
            İptal
          </button>
        )}
        <button
          onClick={() => handleSubmit(true)}
          disabled={saving}
          style={{
            padding: '12px 24px', border: `1px solid ${C.border}`,
            borderRadius: 10, background: 'white', cursor: 'pointer',
            fontSize: 14, color: C.navy, fontWeight: 600,
          }}
        >
          {saving ? '...' : 'Taslak Kaydet'}
        </button>
        <button
          onClick={() => handleSubmit(false)}
          disabled={saving}
          style={{
            padding: '12px 24px', border: 'none', borderRadius: 10,
            background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`,
            color: 'white', cursor: 'pointer',
            fontSize: 14, fontWeight: 700,
            boxShadow: '0 4px 12px rgba(27,42,74,0.3)',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
        </button>
      </div>
    </div>
  );
};

export default ApplicationForm;
