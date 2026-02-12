import React, { useState } from 'react';
import { C } from '../../constants/theme';
import { Btn, Input, Card } from '../ui';
import { db } from '../../services/firebase';

export const LoginModal = ({ onLogin }) => {
    const [mode, setMode] = useState("student"); // student, professor, admin
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Form states
    const [studentNo, setStudentNo] = useState("");
    const [studentPass, setStudentPass] = useState("");

    const [profEmail, setProfEmail] = useState("");
    const [profPass, setProfPass] = useState("");

    const [adminUser, setAdminUser] = useState("");
    const [adminPass, setAdminPass] = useState("");

    const handleStudentLogin = async () => {
        if (!studentNo || !studentPass) return setError("Lütfen tüm alanları doldurun.");
        setLoading(true); setError("");

        try {
            // 1. Check passwords collection
            const passDoc = await db.collection('passwords').doc('student_passwords').get();
            const passwords = passDoc.exists ? passDoc.data() : {};

            if (passwords[studentNo] === studentPass) {
                // Password match, get student details
                const studentDoc = await db.collection('students').doc(studentNo).get();
                if (studentDoc.exists) {
                    onLogin({ ...studentDoc.data(), role: 'student', studentNumber: studentNo });
                } else {
                    // If student record not found but password correct, log in as basic user
                    onLogin({ name: "Öğrenci", role: 'student', studentNumber: studentNo });
                }
            } else {
                setError("Öğrenci numarası veya şifre hatalı.");
            }
        } catch (e) {
            console.error(e);
            setError("Giriş sırasında bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const handleProfLogin = async () => {
        if (!profEmail || !profPass) return setError("Lütfen tüm alanları doldurun.");
        setLoading(true); setError("");

        try {
            // Using 'professor_passwords' document mostly name mapping to password
            // For simplicity assuming email is the key or name
            const passDoc = await db.collection('passwords').doc('professor_passwords').get();
            const passwords = passDoc.exists ? passDoc.data() : {};

            // Basic check - in real app would be more robust
            const foundProfName = Object.keys(passwords).find(name => name === profEmail && passwords[name] === profPass);

            if (foundProfName) {
                onLogin({ name: foundProfName, role: 'professor', email: profEmail });
            } else {
                setError("Kullanıcı adı veya şifre hatalı.");
            }
        } catch (e) {
            setError("Hata oluştu: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdminLogin = async () => {
        if (adminUser !== "admin") return setError("Kullanıcı adı hatalı.");
        setLoading(true); setError("");

        try {
            const doc = await db.collection('passwords').doc('admin').get();
            const realPass = doc.exists ? doc.data().password : null;

            if (realPass === adminPass) {
                onLogin({ name: "Yönetici", role: 'admin' });
            } else {
                setError("Şifre hatalı.");
            }
        } catch (e) {
            setError("Hata: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            minHeight: "100vh", background: C.bg
        }}>
            <Card title="Giriş Yap" noPadding>
                <div style={{ padding: 24, width: 400 }}>
                    {/* Tabs */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                        {[
                            { id: "student", label: "Öğrenci" },
                            { id: "professor", label: "Akademisyen" },
                            { id: "admin", label: "Yönetici" }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setMode(tab.id); setError(""); }}
                                style={{
                                    flex: 1, padding: "8px 0",
                                    border: "none", background: "transparent",
                                    borderBottom: mode === tab.id ? `2px solid ${C.navy}` : "2px solid transparent",
                        color: mode === tab.id ? C.navy : C.textMuted,
                        fontWeight: 600, cursor: "pointer"
                }}
              >
                        {tab.label}
                    </button>
            ))}
                </div>

                {error && (
                    <div style={{ padding: 12, background: "#FEE2E2", color: "#DC2626", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                        {error}
                    </div>
                )}

                {mode === "student" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <Input placeholder="Öğrenci Numarası" value={studentNo} onChange={e => setStudentNo(e.target.value)} />
                        <Input type="password" placeholder="Şifre" value={studentPass} onChange={e => setStudentPass(e.target.value)} />
                        <Btn onClick={handleStudentLogin} disabled={loading} style={{ justifyContent: "center" }}>
                            {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
                        </Btn>
                    </div>
                )}

                {mode === "professor" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <Input placeholder="Ad Soyad" value={profEmail} onChange={e => setProfEmail(e.target.value)} />
                        <Input type="password" placeholder="Şifre" value={profPass} onChange={e => setProfPass(e.target.value)} />
                        <Btn onClick={handleProfLogin} disabled={loading} style={{ justifyContent: "center" }}>
                            {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
                        </Btn>
                    </div>
                )}

                {mode === "admin" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <Input placeholder="Kullanıcı Adı" value={adminUser} onChange={e => setAdminUser(e.target.value)} />
                        <Input type="password" placeholder="Şifre" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
                        <Btn onClick={handleAdminLogin} disabled={loading} style={{ justifyContent: "center" }}>
                            {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
                        </Btn>
                    </div>
                )}
        </div>
      </Card >
    </div >
  );
};
