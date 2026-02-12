
import React from 'react';
import { C as PC } from '../../../constants/theme';
import Card from '../../../components/ui/Card';
import Btn from '../../../components/ui/Btn';
import { timeAgo } from '../../StudentPortal/utils'; // Reusing from StudentPortal utils if possible, or duplicate logic

const ExemptionHistory = ({ records, loading, onDelete, onExportWord }) => {
    if (loading) {
        return <div style={{ padding: 40, textAlign: "center", color: PC.textMuted }}>Yükleniyor...</div>;
    }
    if (records.length === 0) {
        return (
            <Card title="Geçmiş Kayıtlar">
                <div style={{ padding: 40, textAlign: "center", color: PC.textMuted }}>
                    <p style={{ fontSize: 16, marginBottom: 8 }}>Henüz muafiyet kaydı yok</p>
                    <p style={{ fontSize: 13 }}>Yeni muafiyet işlemi yaparak kayıt oluşturabilirsiniz.</p>
                </div>
            </Card>
        );
    }

    return (
        <Card title={"Geçmiş Kayıtlar (" + records.length + ")"}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {records.map(function (rec) {
                    var matchCount = (rec.matches || []).length;
                    return (
                        <div key={rec.id} style={{
                            padding: 16, border: "1px solid " + PC.border, borderRadius: 10,
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            background: "white",
                        }}>
                            <div>
                                <div style={{ fontWeight: 700, color: PC.navy, fontSize: 15 }}>
                                    {rec.studentName || "İsimsiz"} <span style={{ fontWeight: 400, color: PC.textMuted }}>({rec.studentNo || "-"})</span>
                                </div>
                                <div style={{ fontSize: 12, color: PC.textMuted, marginTop: 4 }}>
                                    {rec.otherUniversity || "-"} | {matchCount} ders eşleştirildi
                                </div>
                                {rec.createdAt && (
                                    <div style={{ fontSize: 11, color: PC.textMuted, marginTop: 2 }}>
                                        {rec.createdAt.toDate ? rec.createdAt.toDate().toLocaleDateString("tr-TR") : ""}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <Btn small variant="ghost" onClick={function () { onExportWord(rec); }}>
                                    Word
                                </Btn>
                                <Btn small variant="danger" onClick={function () {
                                    if (confirm("Bu kaydı silmek istediğinizden emin misiniz?")) onDelete(rec.id);
                                }}>
                                    Sil
                                </Btn>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

export default ExemptionHistory;
