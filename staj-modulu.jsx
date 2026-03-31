// ══════════════════════════════════════════════════════════════
// ÇAKÜ Mühendislik Fakültesi - Staj Modülü
// Bölüm bazlı staj takibi ve yönetimi + Staj Yol Haritası
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const STAJ = {
  primary: "#0891B2",
  primaryLight: "#22D3EE",
  primaryPale: "#ECFEFF",
  bg: "#F0FDFA",
  card: "#FFFFFF",
  text: "#1F2937",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  green: "#059669",
  greenLight: "#D1FAE5",
  red: "#DC2626",
  redLight: "#FEE2E2",
  orange: "#EA580C",
  orangeLight: "#FFEDD5",
  navy: "#1B2A4A",
  accent: "#0891B2",
  accentMid: "#0891B280",
  accentSoft: "#ECFEFF",
};

const StajIcon = ({ path, size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

// ── Staj Durumları ──
const STAJ_STATUS = {
  beklemede: { label: "Beklemede", color: "#EAB308", bg: "#FEF9C3" },
  devam: { label: "Devam Ediyor", color: "#3B82F6", bg: "#DBEAFE" },
  tamamlandi: { label: "Tamamlandı", color: "#059669", bg: "#D1FAE5" },
  reddedildi: { label: "Reddedildi", color: "#DC2626", bg: "#FEE2E2" },
};

// ── Staj Türleri ──
const STAJ_TYPES = [
  { id: "staj1", label: "Staj I (İşyeri Stajı)", duration: "20 iş günü" },
  { id: "staj2", label: "Staj II (Mühendislik Stajı)", duration: "20 iş günü" },
];

// ── Staj Yol Haritası Adımları ──
const STAJ_ROADMAP_STEPS = [
  {
    id: 1,
    title: "Staj Yeri Araştırması",
    duration: "2-4 Hafta",
    result: "Uygun staj yeri belirlendi",
    desc: "Bölümünüze uygun firmaları ve kurumları araştırın. Kariyer merkezinden destek alabilir, önceki öğrencilerin staj yaptığı yerleri inceleyebilirsiniz. En az 3 alternatif belirleyin.",
  },
  {
    id: 2,
    title: "Başvuru & Kabul",
    duration: "1-2 Hafta",
    result: "Firma kabul yazısı alındı",
    desc: "Belirlediğiniz firma/kuruma başvurunuzu yapın. CV ve niyet mektubunuzu hazırlayın. Kabul aldığınızda firmadan resmi kabul yazısı isteyin.",
  },
  {
    id: 3,
    title: "Evrak Hazırlığı",
    duration: "1 Hafta",
    result: "Tüm belgeler hazır",
    desc: "Staj başvuru formu, SGK giriş bildirgesi, iş güvenliği taahhütnamesi ve staj kabul formunu hazırlayın. Bölüm sekreterliğinden gerekli belgeleri temin edin.",
  },
  {
    id: 4,
    title: "Komisyon Onayı",
    duration: "1 Hafta",
    result: "Staj komisyonu onayı alındı",
    desc: "Hazırladığınız evrakları staj komisyonuna teslim edin. Komisyon staj yerinizin uygunluğunu değerlendirecektir. Onay sonucunu takip edin.",
  },
  {
    id: 5,
    title: "SGK İşlemleri",
    duration: "3-5 Gün",
    result: "SGK kaydı tamamlandı",
    desc: "Üniversite tarafından SGK giriş bildirgeniz yapılacaktır. İş kazası ve meslek hastalığı sigortası kapsamında tescil işleminizi kontrol edin.",
  },
  {
    id: 6,
    title: "Staj Dönemi",
    duration: "20 İş Günü",
    result: "Staj defteri günlük tutuldu",
    desc: "Staj süresince her gün staj defterinizi doldurun. Yaptığınız işleri detaylı açıklayın, sorumlu mühendisinize onaylatın. Devamsızlık yapmamaya özen gösterin.",
  },
  {
    id: 7,
    title: "Staj Raporu Yazımı",
    duration: "1-2 Hafta",
    result: "Rapor teslime hazır",
    desc: "Staj sürecinde edindiğiniz deneyimleri, öğrendiklerinizi ve yaptığınız projeleri içeren staj raporunuzu yazın. Bölüm formatına uygun hazırlayın.",
  },
  {
    id: 8,
    title: "Değerlendirme & Sonuç",
    duration: "2-4 Hafta",
    result: "Staj notu belirlendi",
    desc: "Staj defteriniz, raporunuz ve firma değerlendirme formunuz staj komisyonu tarafından incelenecektir. Eksik varsa tamamlamanız istenebilir. Sonucu ÖBS'den takip edin.",
  },
];

// ══════════════════════════════════════════════════════════════
// Staj Yol Haritası Bileşeni
// ══════════════════════════════════════════════════════════════
function StajRoadmap() {
  const responsive = window.useResponsive();
  const isMobile = responsive.val(true, false, false);
  const [expanded, setExpanded] = useState(null);
  const [statuses, setStatuses] = useState(() => {
    try {
      const saved = localStorage.getItem("staj_roadmap_statuses");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    try { localStorage.setItem("staj_roadmap_statuses", JSON.stringify(statuses)); } catch {}
  }, [statuses]);

  const cycleStatus = (idx) => {
    const order = ["upcoming", "in-progress", "completed"];
    const cur = statuses[idx] || "upcoming";
    const next = order[(order.indexOf(cur) + 1) % order.length];
    setStatuses(p => ({ ...p, [idx]: next }));
  };

  const steps = STAJ_ROADMAP_STEPS.map((s, i) => ({
    ...s,
    _status: statuses[i] || "upcoming",
  }));

  const completedCount = steps.filter(s => s._status === "completed").length;

  // ── Step Card ──
  const StepCard = ({ step, i, isOpen }) => {
    const done = step._status === "completed";
    const active = step._status === "in-progress";
    const stBg = done ? "#DCFCE7" : active ? "#FEF3C7" : "#F1F5F9";
    const stColor = done ? "#16A34A" : active ? "#D97706" : "#94A3B8";
    return (
      <div
        onClick={() => setExpanded(isOpen ? null : i)}
        style={{
          background: isOpen ? STAJ.accentSoft : "#fff",
          border: `1.5px solid ${isOpen ? STAJ.accent + "35" : "#F1F5F9"}`,
          borderRadius: 14, padding: "12px 16px", cursor: "pointer",
          width: "100%", maxWidth: isMobile ? "100%" : 290,
          boxShadow: isOpen ? `0 4px 18px ${STAJ.accent}18` : "0 1px 4px rgba(0,0,0,0.05)",
          transition: "all 0.2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", lineHeight: 1.4 }}>{step.title}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 10, background: stBg, color: stColor, flexShrink: 0 }}>{step.duration}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: STAJ.accent }}>→</span>
          <span style={{ fontSize: 12, color: "#64748B" }}>{step.result}</span>
        </div>
        {isOpen && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${STAJ.accent}18` }}>
            <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.8, margin: 0 }}>{step.desc}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      background: "white", borderRadius: 16, padding: responsive.val(16, 24, 32),
      border: "1px solid #E5E7EB",
    }}>
      {/* Başlık */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ height: 1, width: 40, background: `linear-gradient(to right, transparent, ${STAJ.accent}60)` }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", color: STAJ.accent }}>YOL HARİTASI</span>
          <div style={{ height: 1, width: 40, background: `linear-gradient(to left, transparent, ${STAJ.accent}60)` }} />
        </div>
        <p style={{ fontSize: 13, color: STAJ.textMuted, margin: 0 }}>
          Numaraya tıklayarak durumunuzu güncelleyin
        </p>
        {/* İlerleme */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 }}>
          <div style={{ width: 120, height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
            <div style={{ width: `${(completedCount / steps.length) * 100}%`, height: "100%", borderRadius: 3, background: STAJ.accent, transition: "width 0.3s" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: STAJ.textMuted }}>{completedCount}/{steps.length}</span>
        </div>
      </div>

      {/* Yol Haritası */}
      <div style={{ position: "relative", paddingBottom: 20 }}>

        {/* ── Asfalt Yol ── */}
        <div style={{
          position: "absolute",
          left: isMobile ? 28 : "50%",
          transform: isMobile ? "none" : "translateX(-50%)",
          width: 54, top: 0, bottom: 0,
          background: "linear-gradient(to right, #2D3748 0%, #374151 40%, #374151 60%, #2D3748 100%)",
          zIndex: 0, borderRadius: 4,
        }}>
          {/* Sol beyaz çizgi */}
          <div style={{ position: "absolute", left: 5, top: 0, bottom: 0, width: 3, background: "rgba(255,255,255,0.65)", borderRadius: 2 }} />
          {/* Sağ beyaz çizgi */}
          <div style={{ position: "absolute", right: 5, top: 0, bottom: 0, width: 3, background: "rgba(255,255,255,0.65)", borderRadius: 2 }} />
          {/* Ortadaki sarı kesikli çizgi */}
          <div style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            width: 4, top: 0, bottom: 0,
            background: "repeating-linear-gradient(to bottom, #FCD34D 0px, #FCD34D 14px, transparent 14px, transparent 28px)",
            borderRadius: 2,
          }} />
        </div>

        {/* ── BAŞLANGIÇ ── */}
        <div style={{ display: "flex", justifyContent: isMobile ? "flex-start" : "center", marginBottom: 32, position: "relative", zIndex: 2 }}>
          <div style={{
            marginLeft: isMobile ? 6 : 0,
            background: STAJ.accent, color: "#fff",
            padding: "8px 22px", borderRadius: 8,
            fontWeight: 800, fontSize: 11, letterSpacing: "0.12em",
            boxShadow: `0 3px 12px ${STAJ.accent}40`,
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>BAŞLANGIÇ</div>
        </div>

        {/* ── Adımlar ── */}
        {steps.map((step, i) => {
          const isLeft = !isMobile && i % 2 === 0;
          const isOpen = expanded === i;
          const done = step._status === "completed";
          const active = step._status === "in-progress";

          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", marginBottom: 40,
              position: "relative", zIndex: 1,
            }}>
              {/* Sol taraf */}
              {!isMobile && (
                <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", paddingRight: 14 }}>
                  {isLeft ? (
                    <StepCard step={step} i={i} isOpen={isOpen} />
                  ) : (
                    <div style={{ height: 2, width: 32, background: `repeating-linear-gradient(to right, ${STAJ.accentMid} 0, ${STAJ.accentMid} 5px, transparent 5px, transparent 10px)` }} />
                  )}
                </div>
              )}

              {/* Yol üzerindeki numara dairesi */}
              <div style={{
                width: isMobile ? 56 : 54, flexShrink: 0, display: "flex", justifyContent: "center", zIndex: 2,
              }}>
                <div
                  onClick={e => { e.stopPropagation(); cycleStatus(i); }}
                  title="Durumu değiştir"
                  style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: done ? STAJ.accent : active ? "#fff" : "#64748B",
                    border: `3.5px solid ${done ? "rgba(255,255,255,0.85)" : active ? STAJ.accent : "rgba(255,255,255,0.5)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: done
                      ? `0 0 0 5px ${STAJ.accent}30, 0 4px 14px rgba(0,0,0,0.3)`
                      : active
                        ? `0 0 0 5px ${STAJ.accent}25, 0 4px 14px rgba(0,0,0,0.25)`
                        : "0 2px 8px rgba(0,0,0,0.35)",
                    fontWeight: 800, fontSize: done ? 17 : 14,
                    color: done ? "#fff" : active ? STAJ.accent : "rgba(255,255,255,0.8)",
                    transition: "all 0.25s",
                  }}
                >
                  {done ? "✓" : step.id}
                </div>
              </div>

              {/* Sağ taraf */}
              <div style={{ flex: 1, paddingLeft: 14 }}>
                {(!isMobile && !isLeft) || isMobile ? (
                  <StepCard step={step} i={i} isOpen={isOpen} />
                ) : (
                  <div style={{ height: 2, width: 32, background: `repeating-linear-gradient(to right, ${STAJ.accentMid} 0, ${STAJ.accentMid} 5px, transparent 5px, transparent 10px)` }} />
                )}
              </div>
            </div>
          );
        })}

        {/* ── BİTİŞ ── */}
        <div style={{ display: "flex", justifyContent: isMobile ? "flex-start" : "center", marginTop: 8, position: "relative", zIndex: 2 }}>
          <div style={{
            marginLeft: isMobile ? 6 : 0,
            background: "#0F172A", color: "#fff",
            padding: "8px 22px", borderRadius: 8,
            fontWeight: 800, fontSize: 11, letterSpacing: "0.12em",
            boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>BİTİŞ</div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Staj Başvuru Formu (Öğrenci)
// ══════════════════════════════════════════════════════════════
function StajBasvuruFormu({ currentUser, activeDepartment, departmentInfo }) {
  const responsive = window.useResponsive();
  const isMobile = responsive.val(true, true, false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [myApplications, setMyApplications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    // Öğrenci Kimlik Bilgileri
    adSoyad: currentUser?.name || "",
    ogrenciNo: currentUser?.studentNumber || currentUser?.identifier || "",
    bolumProgrami: departmentInfo?.name || "",
    eposta: "",
    telefonNo: "",
    egitimDonemi: "",
    ikametgahAdresi: "",
    // Staj Yapılacak Yerin Bilgileri
    stajYeriAdi: "",
    stajYeriAdresi: "",
    stajYeriTelefon: "",
    stajYeriFaks: "",
    stajYeriEposta: "",
    // İşveren/Yetkilinin Bilgileri
    isverenAdSoyad: "",
    isverenGorevUnvan: "",
    isverenEposta: "",
    isverenTarih: "",
    // Stajın Bilgileri
    stajBaslamaTarihi: "",
    stajBitisTarihi: "",
    stajSuresiGun: "",
    // Nüfus Kayıt Bilgileri
    nufusSoyad: "",
    nufusAd: "",
    babaAdi: "",
    anaAdi: "",
    dogumYeri: "",
    dogumTarihi: "",
    tcKimlikNo: "",
    nufusCuzdanSeriNo: "",
    sskNo: "",
    nufusIl: "",
    nufusIlce: "",
    nufusMahalleKoy: "",
    ciltNo: "",
    aileSiraNo: "",
    siraNo: "",
    nufusDairesi: "",
    verilisNedeni: "",
    verilisTarihi: "",
    // Sağlık Güvencesi
    saglikGuvencesi: "",
  };

  const [form, setForm] = useState(emptyForm);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Staj süresini otomatik hesapla
  useEffect(() => {
    if (form.stajBaslamaTarihi && form.stajBitisTarihi) {
      const start = new Date(form.stajBaslamaTarihi);
      const end = new Date(form.stajBitisTarihi);
      const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (diff > 0) set("stajSuresiGun", String(diff));
    }
  }, [form.stajBaslamaTarihi, form.stajBitisTarihi]);

  // Öğrencinin mevcut başvurularını yükle
  useEffect(() => {
    const loadApplications = async () => {
      try {
        const db = window.apiFirestore;
        if (!db) return;
        const studentId = currentUser?.studentNumber || currentUser?.identifier || "";
        if (!studentId) return;
        const snapshot = await db.collection("internship_applications")
          .where("ogrenciNo", "==", studentId)
          .get();
        const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMyApplications(apps);
      } catch (e) {
        console.error("Başvurular yüklenirken hata:", e);
      }
    };
    loadApplications();
  }, [currentUser]);

  const handleSave = async () => {
    // Zorunlu alan kontrolü
    if (!form.adSoyad || !form.ogrenciNo || !form.stajYeriAdi || !form.stajBaslamaTarihi || !form.stajBitisTarihi) {
      setSavedMsg("Lütfen zorunlu alanları doldurun (Ad Soyad, Öğrenci No, Staj Yeri, Tarihler).");
      setTimeout(() => setSavedMsg(""), 4000);
      return;
    }
    setSaving(true);
    try {
      const db = window.apiFirestore;
      if (!db) throw new Error("Veritabanı bağlantısı yok");

      const data = {
        ...form,
        departmentId: activeDepartment,
        status: "beklemede",
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await db.collection("internship_applications").doc(editingId).set(data, { merge: true });
      } else {
        data.createdAt = new Date().toISOString();
        await db.collection("internship_applications").add(data);
      }

      setSavedMsg(editingId ? "Başvuru güncellendi!" : "Başvuru kaydedildi!");
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      // Reload applications
      const studentId = currentUser?.studentNumber || currentUser?.identifier || "";
      const snapshot = await db.collection("internship_applications")
        .where("ogrenciNo", "==", studentId)
        .get();
      setMyApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (e) {
      console.error("Kayıt hatası:", e);
      setSavedMsg("Kayıt sırasında hata oluştu: " + e.message);
      setTimeout(() => setSavedMsg(""), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (app) => {
    setForm({ ...emptyForm, ...app });
    setEditingId(app.id);
    setShowForm(true);
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid #D1D5DB", fontSize: 13, outline: "none",
    fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  };
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 5 };
  const sectionStyle = {
    background: "white", borderRadius: 12, padding: responsive.val(14, 18, 22),
    border: "1px solid #E5E7EB", marginBottom: 16,
  };
  const sectionTitleStyle = {
    fontSize: 14, fontWeight: 700, color: STAJ.navy, marginBottom: 14,
    paddingBottom: 8, borderBottom: `2px solid ${STAJ.primary}30`,
  };
  const gridStyle = (cols) => ({
    display: "grid",
    gridTemplateColumns: responsive.val("1fr", cols >= 3 ? "1fr 1fr" : "1fr 1fr", `repeat(${cols}, 1fr)`),
    gap: 14,
  });

  const SAGLIK_OPTIONS = [
    { id: "kendisi", label: "Kendisi" },
    { id: "annesi_babasi", label: "Annesi/Babası" },
    { id: "yesil_kart", label: "Yeşil Kart" },
    { id: "universite", label: "Çankırı Karatekin Üniversitesi" },
  ];

  // Başvuru listesi görünümü
  if (!showForm) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: STAJ.navy, margin: 0 }}>
            Staj Başvurularım
          </h3>
          <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: STAJ.primary, color: "white", fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          }}>
            <StajIcon path="M12 5v14M5 12h14" size={16} />
            Yeni Staj Başvurusu
          </button>
        </div>

        {savedMsg && (
          <div style={{
            padding: "10px 16px", borderRadius: 8, marginBottom: 16,
            background: savedMsg.includes("hata") || savedMsg.includes("doldurun") ? STAJ.redLight : STAJ.greenLight,
            color: savedMsg.includes("hata") || savedMsg.includes("doldurun") ? STAJ.red : STAJ.green,
            fontSize: 13, fontWeight: 500,
          }}>{savedMsg}</div>
        )}

        {myApplications.length === 0 ? (
          <div style={{ ...sectionStyle, textAlign: "center", padding: 40 }}>
            <StajIcon path="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" size={48} color="#D1D5DB" />
            <p style={{ color: STAJ.textMuted, fontSize: 14, marginTop: 16 }}>
              Henüz staj başvurunuz bulunmuyor. Yeni başvuru oluşturmak için yukarıdaki butona tıklayın.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {myApplications.map(app => {
              const status = STAJ_STATUS[app.status] || STAJ_STATUS.beklemede;
              return (
                <div key={app.id} style={{
                  ...sectionStyle, marginBottom: 0, padding: responsive.val(12, 16, 16),
                  display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12,
                  cursor: "pointer",
                }} onClick={() => handleEdit(app)}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: STAJ.text }}>{app.stajYeriAdi || "—"}</div>
                    <div style={{ fontSize: 12, color: STAJ.textMuted }}>{app.stajYeriAdresi || ""}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 13, color: STAJ.text }}>
                      {app.stajBaslamaTarihi || "—"} — {app.stajBitisTarihi || "—"}
                    </div>
                    <div style={{ fontSize: 11, color: STAJ.textMuted }}>{app.stajSuresiGun ? `${app.stajSuresiGun} gün` : ""}</div>
                  </div>
                  <span style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    color: status.color, background: status.bg,
                  }}>{status.label}</span>
                  <StajIcon path="M9 5l7 7-7 7" size={16} color="#9CA3AF" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Form görünümü
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{
          padding: "8px 12px", borderRadius: 8, border: "1px solid #D1D5DB",
          background: "white", cursor: "pointer", display: "flex", alignItems: "center",
        }}>
          <StajIcon path="M15 19l-7-7 7-7" size={16} color="#6B7280" />
        </button>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: STAJ.navy, margin: 0 }}>
          {editingId ? "Başvuruyu Düzenle" : "Yeni Staj Başvurusu"}
        </h3>
      </div>

      {savedMsg && (
        <div style={{
          padding: "10px 16px", borderRadius: 8, marginBottom: 16,
          background: savedMsg.includes("hata") || savedMsg.includes("doldurun") ? STAJ.redLight : STAJ.greenLight,
          color: savedMsg.includes("hata") || savedMsg.includes("doldurun") ? STAJ.red : STAJ.green,
          fontSize: 13, fontWeight: 500,
        }}>{savedMsg}</div>
      )}

      {/* 1. ÖĞRENCİNİN KİMLİK BİLGİLERİ */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>ÖĞRENCİNİN KİMLİK BİLGİLERİ <span style={{ fontSize: 11, fontWeight: 400, color: STAJ.textMuted }}>(Tüm alanları eksiksiz doldurunuz)</span></div>
        <div style={gridStyle(3)}>
          <div><label style={labelStyle}>Adı ve Soyadı *</label><input value={form.adSoyad} onChange={e => set("adSoyad", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Öğrenci No *</label><input value={form.ogrenciNo} onChange={e => set("ogrenciNo", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Bölümü/Programı</label><input value={form.bolumProgrami} onChange={e => set("bolumProgrami", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>E-posta Adresi</label><input type="email" value={form.eposta} onChange={e => set("eposta", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Telefon No</label><input value={form.telefonNo} onChange={e => set("telefonNo", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Eğitim Dönemi</label><input value={form.egitimDonemi} onChange={e => set("egitimDonemi", e.target.value)} placeholder="Örn: 2024-2025 Bahar" style={inputStyle} /></div>
          <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}><label style={labelStyle}>İkametgah Adresi</label><input value={form.ikametgahAdresi} onChange={e => set("ikametgahAdresi", e.target.value)} style={inputStyle} /></div>
        </div>
      </div>

      {/* 2. STAJ YAPILACAK YERİN BİLGİLERİ */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>STAJ YAPILACAK YERİN BİLGİLERİ</div>
        <div style={gridStyle(3)}>
          <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}><label style={labelStyle}>Adı / Unvanı *</label><input value={form.stajYeriAdi} onChange={e => set("stajYeriAdi", e.target.value)} style={inputStyle} /></div>
          <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}><label style={labelStyle}>Adresi</label><input value={form.stajYeriAdresi} onChange={e => set("stajYeriAdresi", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Telefon No</label><input value={form.stajYeriTelefon} onChange={e => set("stajYeriTelefon", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Faks No</label><input value={form.stajYeriFaks} onChange={e => set("stajYeriFaks", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>E-posta Adresi</label><input type="email" value={form.stajYeriEposta} onChange={e => set("stajYeriEposta", e.target.value)} style={inputStyle} /></div>
        </div>
      </div>

      {/* 3. İŞVERENİN/YETKİLİNİN BİLGİLERİ */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>İŞVERENİN / YETKİLİNİN BİLGİLERİ</div>
        <div style={gridStyle(2)}>
          <div><label style={labelStyle}>Adı ve Soyadı</label><input value={form.isverenAdSoyad} onChange={e => set("isverenAdSoyad", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Görev ve Ünvanı</label><input value={form.isverenGorevUnvan} onChange={e => set("isverenGorevUnvan", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>E-posta Adresi</label><input type="email" value={form.isverenEposta} onChange={e => set("isverenEposta", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Tarih</label><input type="date" value={form.isverenTarih} onChange={e => set("isverenTarih", e.target.value)} style={inputStyle} /></div>
        </div>
        <div style={{
          marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "#F0FDFA",
          border: "1px dashed #0891B240", fontSize: 13, color: STAJ.navy, fontWeight: 500,
        }}>
          Kurumumuzda/İşletmemizde Staj Yapması Uygundur. <span style={{ color: STAJ.textMuted, fontWeight: 400 }}>(İmza/Kaşe staj yeri tarafından doldurulacaktır)</span>
        </div>
      </div>

      {/* 4. STAJIN BİLGİLERİ */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>STAJIN BİLGİLERİ</div>
        <div style={gridStyle(3)}>
          <div><label style={labelStyle}>Başlama Tarihi *</label><input type="date" value={form.stajBaslamaTarihi} onChange={e => set("stajBaslamaTarihi", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Bitiş Tarihi *</label><input type="date" value={form.stajBitisTarihi} onChange={e => set("stajBitisTarihi", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Süresi (Gün)</label><input value={form.stajSuresiGun} onChange={e => set("stajSuresiGun", e.target.value)} style={inputStyle} /></div>
        </div>
      </div>

      {/* 5. NÜFUS KAYIT ve SİGORTA BİLGİLERİ */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          ÖĞRENCİNİN NÜFUS KAYIT ve SİGORTA BİLGİLERİ
          <div style={{ fontSize: 11, fontWeight: 400, color: STAJ.textMuted, marginTop: 4 }}>
            (Staj başvurusu kabul edildiği takdirde öğrenci tarafından tüm alanlar eksiksiz doldurulacaktır)
          </div>
        </div>
        <div style={gridStyle(3)}>
          <div><label style={labelStyle}>Soyadı</label><input value={form.nufusSoyad} onChange={e => set("nufusSoyad", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Adı</label><input value={form.nufusAd} onChange={e => set("nufusAd", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Baba Adı</label><input value={form.babaAdi} onChange={e => set("babaAdi", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Ana Adı</label><input value={form.anaAdi} onChange={e => set("anaAdi", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Doğum Yeri</label><input value={form.dogumYeri} onChange={e => set("dogumYeri", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Doğum Tarihi</label><input type="date" value={form.dogumTarihi} onChange={e => set("dogumTarihi", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>T.C. Kimlik No</label><input value={form.tcKimlikNo} onChange={e => set("tcKimlikNo", e.target.value)} maxLength={11} style={inputStyle} /></div>
          <div><label style={labelStyle}>N.Cüzdan Seri No</label><input value={form.nufusCuzdanSeriNo} onChange={e => set("nufusCuzdanSeriNo", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>SSK No</label><input value={form.sskNo} onChange={e => set("sskNo", e.target.value)} placeholder="Tercih" style={inputStyle} /></div>
          <div><label style={labelStyle}>Nüfusa Kay. Olduğu İl</label><input value={form.nufusIl} onChange={e => set("nufusIl", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>İlçe</label><input value={form.nufusIlce} onChange={e => set("nufusIlce", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Mahalle-Köy</label><input value={form.nufusMahalleKoy} onChange={e => set("nufusMahalleKoy", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Cilt No</label><input value={form.ciltNo} onChange={e => set("ciltNo", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Aile Sıra No</label><input value={form.aileSiraNo} onChange={e => set("aileSiraNo", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Sıra No</label><input value={form.siraNo} onChange={e => set("siraNo", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Verildiği Nüfus Dairesi</label><input value={form.nufusDairesi} onChange={e => set("nufusDairesi", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Veriliş Nedeni</label><input value={form.verilisNedeni} onChange={e => set("verilisNedeni", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Veriliş Tarihi</label><input type="date" value={form.verilisTarihi} onChange={e => set("verilisTarihi", e.target.value)} style={inputStyle} /></div>
        </div>
      </div>

      {/* 6. SAĞLIK GÜVENCESİ */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>SAĞLIK GÜVENCESİ <span style={{ fontSize: 11, fontWeight: 400, color: STAJ.textMuted }}>Sağlık güvencenizle ilgili kutucuğu işaretleyiniz</span></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {SAGLIK_OPTIONS.map(opt => (
            <label key={opt.id} style={{
              display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
              padding: "8px 14px", borderRadius: 8,
              border: `1.5px solid ${form.saglikGuvencesi === opt.id ? STAJ.primary : "#D1D5DB"}`,
              background: form.saglikGuvencesi === opt.id ? STAJ.primaryPale : "white",
              fontSize: 13, color: form.saglikGuvencesi === opt.id ? STAJ.primary : STAJ.text,
              fontWeight: form.saglikGuvencesi === opt.id ? 600 : 400,
              transition: "all 0.2s",
            }}>
              <input
                type="radio" name="saglikGuvencesi"
                checked={form.saglikGuvencesi === opt.id}
                onChange={() => set("saglikGuvencesi", opt.id)}
                style={{ accentColor: STAJ.primary }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Kaydet / İptal */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8, marginBottom: 24 }}>
        <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{
          padding: "12px 24px", borderRadius: 8, border: "1px solid #D1D5DB",
          background: "white", color: STAJ.textMuted, fontSize: 14, cursor: "pointer",
        }}>İptal</button>
        <button onClick={handleSave} disabled={saving} style={{
          padding: "12px 28px", borderRadius: 8, border: "none",
          background: saving ? "#9CA3AF" : STAJ.primary, color: "white",
          fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {saving ? "Kaydediliyor..." : (editingId ? "Güncelle" : "Başvuruyu Kaydet")}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Ana Staj Modülü
// ══════════════════════════════════════════════════════════════
function StajModuluApp({ currentUser, activeDepartment, departmentInfo }) {
  const [stajRecords, setStajRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list, add
  const [activeTab, setActiveTab] = useState(() => {
    const isStudent = currentUser?.role === "student" || (!["admin", "bolum_yetkilisi", "professor"].includes(currentUser?.role));
    return isStudent ? "basvuru" : "roadmap";
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const responsive = window.useResponsive();

  const isAdmin = currentUser?.role === "admin";
  const isDeptManager = currentUser?.role === "bolum_yetkilisi";
  const isStudent = currentUser?.role === "student" || (!isAdmin && !isDeptManager && currentUser?.role !== "professor");
  const canManage = isAdmin || isDeptManager;

  // Staj kayıtlarını yükle
  useEffect(() => {
    const loadRecords = async () => {
      setLoading(true);
      try {
        const db = window.apiFirestore;
        if (db) {
          let query = db.collection("internships");
          if (activeDepartment) {
            query = query.where("departmentId", "==", activeDepartment);
          }
          const snapshot = await query.get();
          const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setStajRecords(records);
        }
      } catch (e) {
        console.error("Staj kayıtları yüklenirken hata:", e);
      } finally {
        setLoading(false);
      }
    };
    loadRecords();
  }, [activeDepartment]);

  const filteredRecords = useMemo(() => {
    return stajRecords.filter(r => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (r.studentName || "").toLowerCase().includes(s) ||
               (r.studentNumber || "").toLowerCase().includes(s) ||
               (r.companyName || "").toLowerCase().includes(s);
      }
      return true;
    });
  }, [stajRecords, filterStatus, searchTerm]);

  const stats = useMemo(() => ({
    total: stajRecords.length,
    beklemede: stajRecords.filter(r => r.status === "beklemede").length,
    devam: stajRecords.filter(r => r.status === "devam").length,
    tamamlandi: stajRecords.filter(r => r.status === "tamamlandi").length,
  }), [stajRecords]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, border: "3px solid #E5E1D8", borderTopColor: STAJ.primary, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#666", fontSize: 14 }}>Staj kayıtları yükleniyor...</p>
        </div>
      </div>
    );
  }

  const TABS = [
    ...(isStudent ? [{ id: "basvuru", label: "Staj Başvurusu", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }] : []),
    { id: "roadmap", label: "Yol Haritası", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
    ...(canManage ? [{ id: "kayitlar", label: "Staj Kayıtları", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" }] : []),
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center",
        justifyContent: "space-between", gap: 12, marginBottom: 24,
      }}>
        <div>
          <h1 style={{ fontSize: responsive.val(20, 24, 28), fontWeight: 700, color: STAJ.navy, margin: 0 }}>
            Staj Yönetimi
          </h1>
          <p style={{ fontSize: 13, color: STAJ.textMuted, marginTop: 4 }}>
            {departmentInfo?.name || "Bölüm"} - Staj takip ve değerlendirme
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: "flex", background: "#F3F4F6", borderRadius: 10, padding: 3,
        }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: activeTab === tab.id ? "white" : "transparent",
              color: activeTab === tab.id ? STAJ.navy : STAJ.textMuted,
              fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              boxShadow: activeTab === tab.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s",
            }}>
              <StajIcon path={tab.icon} size={15} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ════ Staj Başvurusu Sekmesi (Öğrenci) ════ */}
      {activeTab === "basvuru" && (
        <StajBasvuruFormu currentUser={currentUser} activeDepartment={activeDepartment} departmentInfo={departmentInfo} />
      )}

      {/* ════ Yol Haritası Sekmesi ════ */}
      {activeTab === "roadmap" && <StajRoadmap />}

      {/* ════ Staj Kayıtları Sekmesi ════ */}
      {activeTab === "kayitlar" && (
        <>
          {/* Yeni Kayıt Butonu */}
          {canManage && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={() => setView(view === "add" ? "list" : "add")} style={{
                padding: "10px 20px", borderRadius: 8, border: "none",
                background: view === "add" ? "#6B7280" : STAJ.primary,
                color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <StajIcon path={view === "add" ? "M6 18L18 6M6 6l12 12" : "M12 5v14M5 12h14"} size={16} />
                {view === "add" ? "İptal" : "Yeni Staj Kaydı"}
              </button>
            </div>
          )}

          {/* Stats */}
          <div style={{
            display: "grid",
            gridTemplateColumns: responsive.val("1fr 1fr", "repeat(4, 1fr)", "repeat(4, 1fr)"),
            gap: responsive.val(8, 12, 16),
            marginBottom: 24,
          }}>
            {[
              { label: "Toplam", value: stats.total, color: STAJ.primary, bg: STAJ.primaryPale },
              { label: "Beklemede", value: stats.beklemede, color: "#EAB308", bg: "#FEF9C3" },
              { label: "Devam Eden", value: stats.devam, color: "#3B82F6", bg: "#DBEAFE" },
              { label: "Tamamlanan", value: stats.tamamlandi, color: "#059669", bg: "#D1FAE5" },
            ].map((s, i) => (
              <div key={i} style={{
                background: "white", borderRadius: 12, padding: responsive.val(12, 16, 20),
                border: "1px solid #E5E7EB", textAlign: "center",
              }}>
                <div style={{ fontSize: responsive.val(22, 28, 32), fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: STAJ.textMuted, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Add Form */}
          {view === "add" && canManage && (
            <div style={{
              background: "white", borderRadius: 12, padding: responsive.val(16, 20, 24),
              border: "1px solid #E5E7EB", marginBottom: 24,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: STAJ.navy, marginBottom: 16 }}>
                Yeni Staj Kaydı
              </h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: responsive.val("1fr", "1fr 1fr", "1fr 1fr 1fr"),
                gap: 16,
              }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 6 }}>Öğrenci No</label>
                  <input placeholder="Öğrenci numarası" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 6 }}>Öğrenci Adı</label>
                  <input placeholder="Ad Soyad" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 6 }}>Staj Türü</label>
                  <select style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none", background: "white" }}>
                    {STAJ_TYPES.map(t => <option key={t.id} value={t.id}>{t.label} ({t.duration})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 6 }}>Kurum/Firma Adı</label>
                  <input placeholder="Staj yapılacak yer" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 6 }}>Başlangıç Tarihi</label>
                  <input type="date" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 6 }}>Bitiş Tarihi</label>
                  <input type="date" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none" }} />
                </div>
              </div>
              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button onClick={() => setView("list")} style={{
                  padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D5DB",
                  background: "white", color: STAJ.textMuted, fontSize: 13, cursor: "pointer",
                }}>İptal</button>
                <button style={{
                  padding: "10px 20px", borderRadius: 8, border: "none",
                  background: STAJ.primary, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>Kaydet</button>
              </div>
            </div>
          )}

          {/* Search & Filter */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16,
            alignItems: "center",
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Öğrenci adı, numara veya firma ara..."
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 8,
                  border: "1px solid #D1D5DB", fontSize: 13, outline: "none",
                }}
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{
                padding: "10px 14px", borderRadius: 8, border: "1px solid #D1D5DB",
                fontSize: 13, outline: "none", background: "white", cursor: "pointer",
              }}
            >
              <option value="all">Tüm Durumlar</option>
              {Object.entries(STAJ_STATUS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Records */}
          {filteredRecords.length === 0 ? (
            <div style={{
              background: "white", borderRadius: 12, padding: 40,
              border: "1px solid #E5E7EB", textAlign: "center",
            }}>
              <StajIcon path="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" size={48} color="#D1D5DB" />
              <p style={{ color: STAJ.textMuted, fontSize: 14, marginTop: 16 }}>
                {searchTerm || filterStatus !== "all"
                  ? "Arama kriterlerine uygun staj kaydı bulunamadı."
                  : "Henüz staj kaydı bulunmuyor."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredRecords.map(record => {
                const status = STAJ_STATUS[record.status] || STAJ_STATUS.beklemede;
                return (
                  <div key={record.id} style={{
                    background: "white", borderRadius: 10, padding: responsive.val(12, 16, 16),
                    border: "1px solid #E5E7EB",
                    display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: STAJ.text }}>{record.studentName}</div>
                      <div style={{ fontSize: 12, color: STAJ.textMuted }}>{record.studentNumber}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 13, color: STAJ.text }}>{record.companyName || "—"}</div>
                      <div style={{ fontSize: 11, color: STAJ.textMuted }}>{record.stajType === "staj2" ? "Staj II" : "Staj I"}</div>
                    </div>
                    <span style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      color: status.color, background: status.bg,
                    }}>{status.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

window.StajModuluApp = StajModuluApp;
