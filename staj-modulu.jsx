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
    title: "Başvuru & Kabul",
    duration: "1-2 Hafta",
    result: "Firma kabul yazısı alındı",
    desc: "Belirlediğiniz firma/kuruma başvurunuzu yapın. CV ve niyet mektubunuzu hazırlayın. Kabul aldığınızda firmadan resmi kabul yazısı isteyin.",
    links: [
      { label: "Zorunlu Staj Formu", module: "formlar", highlight: "zorunlu_staj_formu" },
      { label: "Staj Başvuru Formu (Ek-1)", module: "formlar", highlight: "ek1" },
      { label: "Kimlik Fotokopisi", note: "Kimlik fotokopinizi hazırlayın" },
    ],
    extraNote: "Firma staj için dilekçe talep ederse Ek-3 formunu kullanın.",
    extraLink: { label: "Ek-3 Formu", module: "formlar", highlight: "ek3" },
  },
  {
    id: 2,
    title: "Belge Yükleme",
    duration: "1 Hafta",
    result: "Başvuru belgeleri sisteme yüklendi",
    desc: "Artık hazırsın! Sistem üzerinden başvuru belgelerini yükleyebilirsin. Staj Kayıtları sekmesine giderek başvuru belgelerini yükleyeceğin alana erişebilirsin.",
    links: [
      { label: "Staj Kayıtlarına Git", tab: "kayitlar" },
    ],
  },
  {
    id: 3,
    title: "Komisyon Onayı",
    duration: "1 Hafta",
    result: "Staj komisyonu onayı alındı",
    desc: "Komisyon staj yerinizin uygunluğunu değerlendirecektir. Onay sonucunu takip edin.",
  },
  {
    id: 4,
    title: "SGK İşlemleri",
    duration: "3-5 Gün",
    result: "SGK kaydı tamamlandı",
    desc: "Bu adımda Ergün ÇINAR'ın onayı ile bir sonraki adıma geçebilirsiniz. Ergün ÇINAR, Staj Kayıtları alanında kendisine tanımlanan alanda onay verecektir. Onay alındıktan sonra SGK giriş bildirgeniz üniversite tarafından yapılacaktır.",
    approver: "Ergün ÇINAR",
  },
  {
    id: 5,
    title: "Staj Dönemi",
    duration: "20 İş Günü",
    result: "Staj defteri günlük tutuldu",
    desc: "Formlar modülündeki Staj Defterini kullanarak staj sürecinizi kayıt altına alın. Her sayfası imza ya da kaşelenmiş şekilde hazırlanmalıdır. Devamsızlık yapmamaya özen gösterin.",
    links: [
      { label: "Staj Defteri", module: "formlar", highlight: "staj_defteri" },
    ],
  },
  {
    id: 6,
    title: "Staj Teslim & Belge Yükleme",
    duration: "1-2 Hafta",
    result: "Tüm belgeler sisteme yüklendi",
    desc: "Staj Kayıtlarında ilgili alana staj defterinizi yükleyebilirsiniz. İmzalı ve mühürlü Ek-2 belgesini sisteme yükleyebilirsiniz (Ek-2'ye Formlar modülünden erişebilirsiniz). Staj Teslim Belgesini (Formlar modülünde mevcut) sisteme yükleyebilirsiniz. Turnitin benzerlik raporunu sisteme yükleyebilirsiniz. Not: Turnitin raporu yüklenirken sadece rapor yüklenecektir, staj defterini bu alana tekrar yüklemenize gerek yoktur.",
    links: [
      { label: "Ek-2 Formu", module: "formlar", highlight: "ek2" },
      { label: "Staj Teslim Belgesi", module: "formlar", highlight: "staj_teslim" },
      { label: "Staj Kayıtlarına Git", tab: "kayitlar" },
    ],
  },
  {
    id: 7,
    title: "Değerlendirme & Sonuç",
    duration: "2-4 Hafta",
    result: "Staj notu belirlendi",
    desc: "Sonuç değerlendirme aşaması. Staj defteriniz, belgeleriniz ve firma değerlendirme formunuz staj komisyonu tarafından incelenecektir. Onay sürecini buradan takip edebilirsiniz.",
  },
];

// ── Süre / Deadline Yardımcıları ──
const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};
const daysDiff = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
};
const deadlineBadge = (deadline) => {
  const diff = daysDiff(deadline);
  if (diff === null) return null;
  if (diff < 0) return { label: `${Math.abs(diff)} gün aşıldı`, color: "#DC2626", bg: "#FEE2E2", urgent: true };
  if (diff <= 3) return { label: `${diff} gün kaldı`, color: "#EA580C", bg: "#FFEDD5", urgent: true };
  if (diff <= 7) return { label: `${diff} gün kaldı`, color: "#D97706", bg: "#FEF3C7", urgent: false };
  return { label: `${diff} gün kaldı`, color: "#059669", bg: "#D1FAE5", urgent: false };
};

// ── XLSX dinamik yükleyici ──
const loadSheetJS = () => new Promise((resolve, reject) => {
  if (window.XLSX) { resolve(window.XLSX); return; }
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  s.onload = () => resolve(window.XLSX);
  s.onerror = () => reject(new Error("SheetJS yüklenemedi"));
  document.head.appendChild(s);
});

// ── Export kolon başlıkları ──
const EXPORT_FIELDS = [
  ["adSoyad", "Ad Soyad"],
  ["ogrenciNo", "Öğrenci No"],
  ["bolumProgrami", "Bölüm/Program"],
  ["eposta", "E-posta"],
  ["telefonNo", "Telefon No"],
  ["egitimDonemi", "Eğitim Dönemi"],
  ["ikametgahAdresi", "İkametgah Adresi"],
  ["stajEtapLabel", "Staj Etabı"],
  ["stajYeriAdi", "Staj Yeri Adı"],
  ["stajYeriAdresi", "Staj Yeri Adresi"],
  ["stajYeriTelefon", "Staj Yeri Telefon"],
  ["stajYeriFaks", "Staj Yeri Faks"],
  ["stajYeriEposta", "Staj Yeri E-posta"],
  ["isverenAdSoyad", "İşveren Ad Soyad"],
  ["isverenGorevUnvan", "İşveren Görev/Ünvan"],
  ["isverenEposta", "İşveren E-posta"],
  ["isverenTarih", "İşveren Tarih"],
  ["stajBaslamaTarihi", "Staj Başlama Tarihi"],
  ["stajBitisTarihi", "Staj Bitiş Tarihi"],
  ["stajSuresiGun", "Staj Süresi (Gün)"],
  ["nufusSoyad", "Nüfus Soyadı"],
  ["nufusAd", "Nüfus Adı"],
  ["babaAdi", "Baba Adı"],
  ["anaAdi", "Ana Adı"],
  ["dogumYeri", "Doğum Yeri"],
  ["dogumTarihi", "Doğum Tarihi"],
  ["tcKimlikNo", "T.C. Kimlik No"],
  ["nufusCuzdanSeriNo", "N.Cüzdan Seri No"],
  ["sskNo", "SSK No"],
  ["nufusIl", "Nüfus İl"],
  ["nufusIlce", "Nüfus İlçe"],
  ["nufusMahalleKoy", "Mahalle/Köy"],
  ["ciltNo", "Cilt No"],
  ["aileSiraNo", "Aile Sıra No"],
  ["siraNo", "Sıra No"],
  ["nufusDairesi", "Nüfus Dairesi"],
  ["verilisNedeni", "Veriliş Nedeni"],
  ["verilisTarihi", "Veriliş Tarihi"],
  ["saglikGuvencesi", "Sağlık Güvencesi"],
  ["status", "Başvuru Durumu"],
  ["createdAt", "Başvuru Tarihi"],
];

// ── XML üretici ──
const generateXML = (apps, periodLabel) => {
  const escape = (v) => String(v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const rows = apps.map(app => {
    const fields = EXPORT_FIELDS.map(([key]) =>
      `    <${key}>${escape(app[key])}</${key}>`
    ).join("\n");
    return `  <ogrenci id="${escape(app.id)}">\n${fields}\n  </ogrenci>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<stajKayitlari etap="${escape(periodLabel)}" tarih="${new Date().toISOString()}">\n${rows}\n</stajKayitlari>`;
};

// ══════════════════════════════════════════════════════════════
// Staj Yol Haritası Bileşeni
// ══════════════════════════════════════════════════════════════
function StajRoadmap({ onTabChange, currentUser, activeDepartment }) {
  const responsive = window.useResponsive();
  const isMobile = responsive.val(true, false, false);
  const [expanded, setExpanded] = useState(null);
  const [myApplication, setMyApplication] = useState(null);
  const [roadmapData, setRoadmapData] = useState({});
  const [loadingRoadmap, setLoadingRoadmap] = useState(true);
  const [uploads, setUploads] = useState({});
  const [actionMsg, setActionMsg] = useState("");

  const isStudent = currentUser?.role === "student" || (!["admin", "bolum_yetkilisi", "professor"].includes(currentUser?.role));
  const studentId = currentUser?.studentNumber || currentUser?.identifier || "";

  // Öğrencinin onaylanmış başvurusunu ve roadmap verilerini yükle
  useEffect(() => {
    const loadData = async () => {
      setLoadingRoadmap(true);
      try {
        if (!studentId) { setLoadingRoadmap(false); return; }

        // Öğrencinin başvurularını yükle
        const apps = await window.apiRead("internship_applications", { where: "ogrenciNo:eq:s:" + studentId });
        // Onaylanmış (devam) veya tamamlanmış başvuruyu bul, yoksa beklemede olanı al
        const activeApp = apps.find(a => a.status === "devam") || apps.find(a => a.status === "tamamlandi") || apps.find(a => a.status === "beklemede") || null;
        setMyApplication(activeApp);

        // Roadmap verilerini yükle
        if (activeApp) {
          const roadmapResult = await window.apiReadDoc("internship_roadmap", activeApp.id);
          if (roadmapResult.exists) {
            setRoadmapData(roadmapResult.data || {});
          }
        }

        // Yüklenen belgeleri yükle
        const uploadResult = await window.apiReadDoc("internship_uploads", studentId);
        if (uploadResult.exists) setUploads(uploadResult.data || {});
      } catch (e) {
        console.error("Roadmap verileri yüklenirken hata:", e);
      } finally {
        setLoadingRoadmap(false);
      }
    };
    if (isStudent) {
      loadData();
    } else {
      setLoadingRoadmap(false);
    }
  }, [studentId, isStudent]);

  // Adım durumunu belirle
  const getStepStatus = (stepIdx) => {
    if (!myApplication) return "locked";
    if (myApplication.status === "beklemede") return stepIdx === 0 ? "waiting_approval" : "locked";
    if (myApplication.status === "reddedildi") return "locked";

    const stepData = roadmapData?.steps?.[stepIdx];
    if (stepData?.status === "completed") return "completed";
    if (stepData?.status === "pending_approval") return "pending_approval";

    // İlk adım her zaman current (onay sonrası)
    if (stepIdx === 0 && !stepData?.status) return "current";

    // Önceki adım tamamlandı mı?
    if (stepIdx > 0) {
      const prevStep = roadmapData?.steps?.[stepIdx - 1];
      if (prevStep?.status === "completed") return "current";
    }

    return "locked";
  };

  // Adım için gerekli belgelerin yüklenip yüklenmediğini kontrol et
  const getRequiredDocsForStep = (stepId) => {
    if (stepId === 2) return ["zorunlu_staj_formu", "staj_basvuru_formu_ek1", "kimlik_fotokopisi"]; // Adım 2 (idx=1) → Belge Yükleme
    if (stepId === 6) return ["staj_defteri", "ek2_belgesi", "staj_teslim_belgesi", "turnitin_raporu"]; // Adım 6 → Staj Teslim
    return [];
  };

  const areRequiredDocsUploaded = (stepId) => {
    const required = getRequiredDocsForStep(stepId);
    if (required.length === 0) return true;
    return required.every(docId => uploads[docId]);
  };

  // Öğrenci adımı tamamla (onay beklet)
  const handleCompleteStep = async (stepIdx) => {
    if (!myApplication) return;
    const stepId = STAJ_ROADMAP_STEPS[stepIdx].id;

    // Belge kontrolü
    if (!areRequiredDocsUploaded(stepId)) {
      setActionMsg("Bu adımı tamamlamak için gerekli belgeleri yüklemeniz gerekmektedir.");
      setTimeout(() => setActionMsg(""), 4000);
      return;
    }

    try {
      const newRoadmapData = {
        ...roadmapData,
        steps: {
          ...roadmapData.steps,
          [stepIdx]: {
            status: "pending_approval",
            completedByStudent: studentId,
            completedAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      };

      await window.DBWrite.set("internship_roadmap", myApplication.id, newRoadmapData, true);

      // Komisyon üyelerine bildirim oluştur
      try {
        await window.DBWrite.add("internship_notifications", {
          type: "step_submitted",
          departmentId: activeDepartment || myApplication.departmentId || "",
          appId: myApplication.id,
          stepIdx,
          stepTitle: STAJ_ROADMAP_STEPS[stepIdx].title,
          studentName: currentUser?.name || studentId,
          studentNo: studentId,
          stajEtapLabel: myApplication.stajEtapLabel || "",
          createdAt: new Date().toISOString(),
          readBy: [],
        });
      } catch (notifErr) {
        console.warn("Bildirim oluşturulamadı:", notifErr);
      }

      setRoadmapData(newRoadmapData);
      setActionMsg("Adım tamamlandı! Yetkili onayı bekleniyor...");
      setTimeout(() => setActionMsg(""), 3000);
    } catch (e) {
      console.error("Adım güncelleme hatası:", e);
      setActionMsg("Hata oluştu: " + e.message);
      setTimeout(() => setActionMsg(""), 4000);
    }
  };

  const steps = STAJ_ROADMAP_STEPS.map((s, i) => ({
    ...s,
    _status: getStepStatus(i),
    _stepData: roadmapData?.steps?.[i] || null,
  }));

  const completedCount = steps.filter(s => s._status === "completed").length;

  // ── Step Card ──
  const StepCard = ({ step, i, isOpen }) => {
    const done = step._status === "completed";
    const active = step._status === "current";
    const pending = step._status === "pending_approval";
    const waiting = step._status === "waiting_approval";
    const locked = step._status === "locked";

    const stBg = done ? "#DCFCE7" : pending ? "#DBEAFE" : active ? "#FEF3C7" : waiting ? "#FEF9C3" : "#F1F5F9";
    const stColor = done ? "#16A34A" : pending ? "#3B82F6" : active ? "#D97706" : waiting ? "#EAB308" : "#94A3B8";
    const stLabel = done ? "Tamamlandı" : pending ? "Onay Bekleniyor" : active ? "Aktif" : waiting ? "Kayıt Onayı Bekleniyor" : "Kilitli";
    return (
      <div
        onClick={() => setExpanded(isOpen ? null : i)}
        style={{
          background: isOpen ? STAJ.accentSoft : locked ? "#FAFAFA" : "#fff",
          border: `1.5px solid ${isOpen ? STAJ.accent + "35" : locked ? "#F1F5F9" : "#F1F5F9"}`,
          borderRadius: 14, padding: "12px 16px", cursor: "pointer",
          width: "100%", maxWidth: isMobile ? "100%" : 290,
          boxShadow: isOpen ? `0 4px 18px ${STAJ.accent}18` : "0 1px 4px rgba(0,0,0,0.05)",
          transition: "all 0.2s",
          opacity: locked ? 0.6 : 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", lineHeight: 1.4 }}>{step.title}</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 10, background: stBg, color: stColor, flexShrink: 0 }}>{stLabel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: STAJ.accent }}>→</span>
          <span style={{ fontSize: 12, color: "#64748B" }}>{step.result}</span>
        </div>

        {/* Süre uyarısı - Adım 1-3 için komisyon deadline */}
        {i < 3 && myApplication && (active || pending) && (() => {
          const od = myApplication?.stajBaslamaTarihi ? addDays(myApplication.stajBaslamaTarihi, -10) : null;
          const badge = deadlineBadge(od);
          if (!badge) return null;
          return (
            <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 8, background: badge.bg, color: badge.color }}>
                ⏱ Komisyon onayı: {badge.label}
              </span>
            </div>
          );
        })()}

        {/* Süre uyarısı - Adım 4 için Ergün ÇINAR deadline */}
        {i === 3 && myApplication && (active || pending) && (() => {
          const sgkDl = myApplication?.stajBaslamaTarihi || null;
          const badge = deadlineBadge(sgkDl);
          if (!badge) return null;
          return (
            <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 8, background: badge.bg, color: badge.color }}>
                ⏱ SGK son: {sgkDl} ({badge.label})
              </span>
            </div>
          );
        })()}
        {isOpen && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${STAJ.accent}18` }}>
            <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.8, margin: 0 }}>{step.desc}</p>

            {/* Onay Yetkisi */}
            {step.approver && (
              <div style={{
                marginTop: 10, padding: "8px 12px", borderRadius: 8,
                background: "#FEF3C7", border: "1px solid #FCD34D",
                fontSize: 12, color: "#92400E", fontWeight: 500,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <StajIcon path="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" size={14} color="#92400E" />
                Onay Yetkilisi: <strong>{step.approver}</strong>
              </div>
            )}

            {/* Adım onay bilgisi */}
            {step._stepData?.approvedBy && (
              <div style={{
                marginTop: 8, padding: "6px 10px", borderRadius: 6,
                background: STAJ.greenLight, border: "1px solid #A7F3D0",
                fontSize: 11, color: STAJ.green, fontWeight: 500,
              }}>
                Onaylayan: {step._stepData.approvedBy} — {step._stepData.approvedAt ? new Date(step._stepData.approvedAt).toLocaleString("tr-TR") : ""}
              </div>
            )}

            {/* Onay bekliyor bilgisi */}
            {pending && (
              <div style={{
                marginTop: 8, padding: "8px 12px", borderRadius: 6,
                background: "#DBEAFE", border: "1px solid #93C5FD",
                fontSize: 12, color: "#1E40AF", fontWeight: 500,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <StajIcon path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size={14} color="#1E40AF" />
                Yetkili onayı bekleniyor...
              </div>
            )}

            {/* Gerekli Belgeler / Linkler */}
            {step.links && step.links.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: STAJ.accent, marginBottom: 6 }}>Gerekli Belgeler:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {step.links.map((link, li) => (
                    <div key={li}
                      onClick={e => {
                        e.stopPropagation();
                        if (link.tab && onTabChange) {
                          onTabChange(link.tab);
                        } else if (link.module) {
                          window.location.hash = "#" + link.module;
                        }
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 10px", borderRadius: 6,
                        background: (link.module || link.tab) ? "#ECFEFF" : "#F9FAFB",
                        border: `1px solid ${(link.module || link.tab) ? STAJ.accent + "30" : "#E5E7EB"}`,
                        cursor: (link.module || link.tab) ? "pointer" : "default",
                        fontSize: 12, color: (link.module || link.tab) ? STAJ.accent : "#64748B",
                        fontWeight: 500,
                      }}
                    >
                      <StajIcon path={(link.module || link.tab) ? "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" : "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"} size={13} />
                      {link.label}
                      {link.note && <span style={{ fontWeight: 400, color: "#94A3B8" }}> — {link.note}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ek Not */}
            {step.extraNote && (
              <div style={{
                marginTop: 8, padding: "7px 10px", borderRadius: 6,
                background: "#FFF7ED", border: "1px solid #FDBA7440",
                fontSize: 12, color: "#9A3412", fontWeight: 500,
              }}>
                {step.extraNote}
                {step.extraLink && (
                  <span
                    onClick={e => { e.stopPropagation(); if (step.extraLink.module) window.location.hash = "#" + step.extraLink.module; }}
                    style={{ marginLeft: 6, color: STAJ.accent, textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}
                  >
                    {step.extraLink.label}
                  </span>
                )}
              </div>
            )}

            {/* Adımı Tamamla butonu (Öğrenci - aktif adım için) */}
            {isStudent && active && !pending && !done && (
              <button
                onClick={e => { e.stopPropagation(); handleCompleteStep(i); }}
                style={{
                  marginTop: 12, padding: "10px 18px", borderRadius: 8, border: "none",
                  background: (step.id === 1 || areRequiredDocsUploaded(step.id)) ? STAJ.primary : "#9CA3AF",
                  color: "white", fontSize: 13, fontWeight: 600, width: "100%",
                  cursor: (step.id === 1 || areRequiredDocsUploaded(step.id)) ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
                disabled={step.id !== 1 && !areRequiredDocsUploaded(step.id)}
              >
                <StajIcon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={16} />
                {step.id === 1
                  ? "Belgeleri yüklemek için hazırım"
                  : areRequiredDocsUploaded(step.id)
                    ? "Adımı Tamamla (Onaya Gönder)"
                    : "Önce gerekli belgeleri yükleyin"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loadingRoadmap) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 30, height: 30, border: "3px solid #E5E1D8", borderTopColor: STAJ.primary, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ color: "#666", fontSize: 13 }}>Yol haritası yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "white", borderRadius: 16, padding: responsive.val(16, 24, 32),
      border: "1px solid #E5E7EB", position: "relative",
    }}>

      {/* Başlık */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ height: 1, width: 40, background: `linear-gradient(to right, transparent, ${STAJ.accent}60)` }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", color: STAJ.accent }}>YOL HARİTASI</span>
          <div style={{ height: 1, width: 40, background: `linear-gradient(to left, transparent, ${STAJ.accent}60)` }} />
        </div>

        <p style={{ fontSize: 13, color: STAJ.textMuted, margin: 0, textAlign: "center" }}>
          {isStudent ? "Adıma tıklayarak detayları görün, aktif adımı tamamlayarak onaya gönderin" : "Numaraya tıklayarak detayları görün"}
        </p>
        {/* İlerleme */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 }}>
          <div style={{ width: 120, height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
            <div style={{ width: `${(completedCount / steps.length) * 100}%`, height: "100%", borderRadius: 3, background: STAJ.accent, transition: "width 0.3s" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: STAJ.textMuted }}>{completedCount}/{steps.length}</span>
        </div>

        {/* Başvuru durumu bilgisi */}
        {isStudent && !myApplication && (
          <div style={{
            marginTop: 12, padding: "10px 16px", borderRadius: 8,
            background: "#FEF9C3", border: "1px solid #FCD34D",
            fontSize: 12, color: "#92400E", fontWeight: 500,
          }}>
            Yol haritasını kullanabilmek için önce staj başvurusu yapmanız gerekmektedir.
          </div>
        )}
        {isStudent && myApplication?.status === "beklemede" && (
          <div style={{
            marginTop: 12, padding: "10px 16px", borderRadius: 8,
            background: "#FEF9C3", border: "1px solid #FCD34D",
            fontSize: 12, color: "#92400E", fontWeight: 500,
          }}>
            Staj kaydınız alınmıştır. Yetkili onayı bekleniyor... Onay sonrası süreç başlayacaktır.
          </div>
        )}
      </div>

      {/* Bilgilendirme mesajı */}
      {actionMsg && (
        <div style={{
          padding: "10px 16px", borderRadius: 8, marginBottom: 16, textAlign: "center",
          background: actionMsg.includes("Hata") || actionMsg.includes("gerekli") ? STAJ.redLight : actionMsg.includes("bekleniyor") ? "#DBEAFE" : STAJ.greenLight,
          color: actionMsg.includes("Hata") || actionMsg.includes("gerekli") ? STAJ.red : actionMsg.includes("bekleniyor") ? "#1E40AF" : STAJ.green,
          fontSize: 13, fontWeight: 500,
        }}>{actionMsg}</div>
      )}

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
              {(() => {
                const pending = step._status === "pending_approval";
                const waiting = step._status === "waiting_approval";
                const locked = step._status === "locked";
                const circleBg = done ? STAJ.accent : pending ? "#3B82F6" : active ? "#fff" : waiting ? "#EAB308" : "#64748B";
                const circleBorder = done ? "rgba(255,255,255,0.85)" : pending ? "rgba(255,255,255,0.85)" : active ? STAJ.accent : waiting ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.5)";
                const circleColor = done ? "#fff" : pending ? "#fff" : active ? STAJ.accent : waiting ? "#fff" : "rgba(255,255,255,0.8)";
                return (
                  <div style={{
                    width: isMobile ? 56 : 54, flexShrink: 0, display: "flex", justifyContent: "center", zIndex: 2,
                  }}>
                    <div
                      onClick={e => { e.stopPropagation(); setExpanded(isOpen ? null : i); }}
                      title={done ? "Tamamlandı" : pending ? "Onay bekleniyor" : active ? "Aktif adım" : locked ? "Kilitli" : ""}
                      style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: circleBg,
                        border: `3.5px solid ${circleBorder}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: locked ? "default" : "pointer",
                        boxShadow: done
                          ? `0 0 0 5px ${STAJ.accent}30, 0 4px 14px rgba(0,0,0,0.3)`
                          : active
                            ? `0 0 0 5px ${STAJ.accent}25, 0 4px 14px rgba(0,0,0,0.25)`
                            : pending
                              ? `0 0 0 5px #3B82F630, 0 4px 14px rgba(0,0,0,0.25)`
                              : "0 2px 8px rgba(0,0,0,0.35)",
                        fontWeight: 800, fontSize: done ? 17 : 14,
                        color: circleColor,
                        transition: "all 0.25s",
                        opacity: locked ? 0.5 : 1,
                      }}
                    >
                      {done ? "✓" : pending ? "⏳" : step.id}
                    </div>
                  </div>
                );
              })()}

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
function StajBasvuruFormu({ currentUser, activeDepartment, departmentInfo, stajPeriods = [] }) {
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
    // Staj Etabı
    stajEtapId: "",
    stajEtapLabel: "",
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
  const [appRoadmaps, setAppRoadmaps] = useState({});

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Etap seçildiğinde tarihleri otomatik doldur
  const handleEtapSelect = (etapId) => {
    const period = stajPeriods.find(p => p.id === etapId);
    if (period) {
      const start = new Date(period.baslangic);
      const end = new Date(period.bitis);
      const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      setForm(prev => ({
        ...prev,
        stajEtapId: etapId,
        stajEtapLabel: period.label,
        stajBaslamaTarihi: period.baslangic,
        stajBitisTarihi: period.bitis,
        stajSuresiGun: String(diff > 0 ? diff : 0),
      }));
    } else {
      setForm(prev => ({ ...prev, stajEtapId: "", stajEtapLabel: "", stajBaslamaTarihi: "", stajBitisTarihi: "", stajSuresiGun: "" }));
    }
  };

  // Öğrencinin mevcut başvurularını ve roadmap verilerini yükle
  useEffect(() => {
    const loadApplications = async () => {
      try {
        const studentId = currentUser?.studentNumber || currentUser?.identifier || "";
        if (!studentId) return;
        const apps = await window.apiRead("internship_applications", { where: "ogrenciNo:eq:s:" + studentId });
        setMyApplications(apps);

        // Her başvuru için roadmap verilerini yükle
        const roadmaps = {};
        for (const app of apps) {
          try {
            const rmResult = await window.apiReadDoc("internship_roadmap", app.id);
            if (rmResult.exists) roadmaps[app.id] = rmResult.data;
          } catch {}
        }
        setAppRoadmaps(roadmaps);
      } catch (e) {
        console.error("Başvurular yüklenirken hata:", e);
      }
    };
    loadApplications();
  }, [currentUser]);

  // Zorunlu alanlar listesi
  const REQUIRED_FIELDS = {
    // Kimlik Bilgileri
    adSoyad: "Adı ve Soyadı",
    ogrenciNo: "Öğrenci No",
    bolumProgrami: "Bölümü/Programı",
    eposta: "E-posta Adresi",
    telefonNo: "Telefon No",
    egitimDonemi: "Eğitim Dönemi",
    ikametgahAdresi: "İkametgah Adresi",
    // Staj Yeri
    stajYeriAdi: "Staj Yeri Adı/Unvanı",
    stajYeriAdresi: "Staj Yeri Adresi",
    stajYeriTelefon: "Staj Yeri Telefon No",
    stajYeriEposta: "Staj Yeri E-posta",
    // İşveren
    isverenAdSoyad: "İşveren Adı ve Soyadı",
    isverenGorevUnvan: "İşveren Görev ve Ünvanı",
    isverenEposta: "İşveren E-posta",
    isverenTarih: "İşveren Tarih",
    // Staj Etabı
    stajEtapId: "Staj Etabı",
    // Nüfus
    nufusSoyad: "Nüfus Soyadı",
    nufusAd: "Nüfus Adı",
    babaAdi: "Baba Adı",
    anaAdi: "Ana Adı",
    dogumYeri: "Doğum Yeri",
    dogumTarihi: "Doğum Tarihi",
    tcKimlikNo: "T.C. Kimlik No",
    nufusCuzdanSeriNo: "N.Cüzdan Seri No",
    nufusIl: "Nüfusa Kay. Olduğu İl",
  };

  // Sadece harf ve boşluk içermeli alanlar (rakam girilememeli)
  const TEXT_ONLY_FIELDS = ["adSoyad", "isverenAdSoyad", "nufusSoyad", "nufusAd", "babaAdi", "anaAdi", "dogumYeri", "nufusIl", "nufusIlce", "nufusMahalleKoy", "isverenGorevUnvan"];
  // Sadece rakam içermeli alanlar
  const NUMERIC_ONLY_FIELDS = ["ogrenciNo", "tcKimlikNo"];
  // Telefon alanları (rakam, boşluk, +, - içerebilir)
  const PHONE_FIELDS = ["telefonNo", "stajYeriTelefon", "stajYeriFaks"];
  // E-posta alanları
  const EMAIL_FIELDS = ["eposta", "stajYeriEposta", "isverenEposta"];

  const isRequired = (key) => key in REQUIRED_FIELDS;

  const handleSave = async () => {
    // Zorunlu alan kontrolü
    const missingFields = Object.entries(REQUIRED_FIELDS)
      .filter(([key]) => !form[key] || !String(form[key]).trim())
      .map(([, label]) => label);

    if (missingFields.length > 0) {
      setSavedMsg("Lütfen zorunlu alanları doldurun: " + missingFields.slice(0, 5).join(", ") + (missingFields.length > 5 ? ` ve ${missingFields.length - 5} alan daha...` : ""));
      setTimeout(() => setSavedMsg(""), 6000);
      return;
    }

    // Tip kontrolleri
    const onlyLetters = /^[a-zA-ZçÇğĞıİöÖşŞüÜ\s.]+$/;
    for (const field of TEXT_ONLY_FIELDS) {
      if (form[field] && !onlyLetters.test(form[field].trim())) {
        setSavedMsg(`"${REQUIRED_FIELDS[field] || field}" alanına sadece harf girilmelidir.`);
        setTimeout(() => setSavedMsg(""), 4000);
        return;
      }
    }

    const onlyDigits = /^\d+$/;
    for (const field of NUMERIC_ONLY_FIELDS) {
      if (form[field] && !onlyDigits.test(form[field].trim())) {
        setSavedMsg(`"${REQUIRED_FIELDS[field] || field}" alanına sadece rakam girilmelidir.`);
        setTimeout(() => setSavedMsg(""), 4000);
        return;
      }
    }

    // TC Kimlik No 11 haneli olmalı
    if (form.tcKimlikNo && form.tcKimlikNo.trim().length !== 11) {
      setSavedMsg("T.C. Kimlik No 11 haneli olmalıdır.");
      setTimeout(() => setSavedMsg(""), 4000);
      return;
    }

    // Telefon alanları kontrolü
    const phonePattern = /^[\d\s+\-()]+$/;
    for (const field of PHONE_FIELDS) {
      if (form[field] && form[field].trim() && !phonePattern.test(form[field].trim())) {
        setSavedMsg(`"${REQUIRED_FIELDS[field] || field}" alanına geçerli bir telefon numarası giriniz.`);
        setTimeout(() => setSavedMsg(""), 4000);
        return;
      }
    }

    // E-posta formatı kontrolü
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const field of EMAIL_FIELDS) {
      if (form[field] && form[field].trim() && !emailPattern.test(form[field].trim())) {
        setSavedMsg(`"${REQUIRED_FIELDS[field] || field}" alanına geçerli bir e-posta adresi giriniz.`);
        setTimeout(() => setSavedMsg(""), 4000);
        return;
      }
    }

    setSaving(true);
    try {
      const data = {
        ...form,
        departmentId: activeDepartment,
        status: editingId ? form.status : "beklemede",
        updatedAt: new Date().toISOString(),
      };

      console.log("Staj başvurusu kaydediliyor:", { departmentId: data.departmentId, ogrenciNo: data.ogrenciNo, editingId });

      if (editingId) {
        await window.DBWrite.set("internship_applications", editingId, data, true);
      } else {
        data.createdAt = new Date().toISOString();
        const result = await window.DBWrite.add("internship_applications", data);
        console.log("Başvuru kaydedildi, ID:", result?.id);

        // Komisyon üyelerine ve fakülte yetkilisine bildirim gönder
        try {
          await window.DBWrite.add("internship_notifications", {
            type: "new_application",
            departmentId: activeDepartment || "",
            appId: result?.id || "",
            studentName: data.adSoyad || currentUser?.name || "",
            studentNo: data.ogrenciNo || "",
            stajYeriAdi: data.stajYeriAdi || "",
            stajEtapLabel: data.stajEtapLabel || "",
            createdAt: new Date().toISOString(),
            readBy: [],
          });
        } catch (notifErr) {
          console.warn("Başvuru bildirimi oluşturulamadı:", notifErr);
        }
      }

      setSavedMsg(editingId ? "Başvuru güncellendi!" : "Başvuru kaydedildi!");
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      // Reload applications
      const studentId = currentUser?.studentNumber || currentUser?.identifier || "";
      const reloadedApps = await window.apiRead("internship_applications", { where: "ogrenciNo:eq:s:" + studentId });
      setMyApplications(reloadedApps);
      // Reload roadmaps
      const roadmaps = {};
      for (const a of reloadedApps) {
        try {
          const rmResult = await window.apiReadDoc("internship_roadmap", a.id);
          if (rmResult.exists) roadmaps[a.id] = rmResult.data;
        } catch {}
      }
      setAppRoadmaps(roadmaps);
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
  const reqMark = React.createElement("span", { style: { color: STAJ.red, marginLeft: 2 } }, "*");
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
    const totalApps = myApplications.length;
    const activeApps = myApplications.filter(a => a.status === "devam" || a.status === "beklemede").length;
    const completedApps = myApplications.filter(a => a.status === "tamamlandi").length;
    const rejectedApps = myApplications.filter(a => a.status === "reddedildi").length;

    return (
      <div>
        {/* ── Hero / Hoşgeldin Banner ── */}
        <div style={{
          position: "relative", overflow: "hidden",
          borderRadius: 16,
          background: `linear-gradient(135deg, ${STAJ.navy} 0%, #0E3A5C 45%, ${STAJ.primary} 100%)`,
          padding: responsive.val(18, 22, 26),
          marginBottom: 18,
          color: "white",
          boxShadow: "0 6px 20px rgba(8, 145, 178, 0.18)",
        }}>
          {/* Dekoratif daireler */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ position: "absolute", bottom: -60, right: 60, width: 140, height: 140, borderRadius: "50%", background: "rgba(34,211,238,0.12)" }} />

          <div style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(4px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.25)",
              }}>
                <StajIcon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={24} color="white" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: responsive.val(16, 18, 20), fontWeight: 700, marginBottom: 4, letterSpacing: -0.2 }}>
                  Staj Başvurusu
                </div>
                <div style={{ fontSize: responsive.val(12, 12, 13), color: "rgba(255,255,255,0.82)", lineHeight: 1.5 }}>
                  Yeni başvuru oluşturun, başvurularınızı düzenleyin ve staj sürecinin her adımını buradan takip edin.
                </div>
              </div>
            </div>
            <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} style={{
              padding: "11px 20px", borderRadius: 10, border: "none",
              background: "white", color: STAJ.primary,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              transition: "transform 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <StajIcon path="M12 5v14M5 12h14" size={16} />
              Yeni Staj Başvurusu
            </button>
          </div>
        </div>

        {/* ── Özet Rozetleri ── */}
        {totalApps > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: responsive.val("repeat(2, 1fr)", "repeat(4, 1fr)", "repeat(4, 1fr)"),
            gap: responsive.val(8, 10, 12),
            marginBottom: 18,
          }}>
            {[
              { label: "Toplam Başvuru", value: totalApps, color: STAJ.primary, bg: STAJ.primaryPale, border: `${STAJ.primary}30`, icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
              { label: "Aktif", value: activeApps, color: "#3B82F6", bg: "#DBEAFE", border: "#93C5FD", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
              { label: "Tamamlanan", value: completedApps, color: STAJ.green, bg: STAJ.greenLight, border: "#A7F3D0", icon: "M5 13l4 4L19 7" },
              { label: "Reddedilen", value: rejectedApps, color: STAJ.red, bg: STAJ.redLight, border: "#FCA5A5", icon: "M6 18L18 6M6 6l12 12" },
            ].map((s, i) => (
              <div key={i} style={{
                background: "white", borderRadius: 12,
                padding: responsive.val("12px 14px", "14px 16px", "14px 18px"),
                border: "1px solid #E5E7EB",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: s.bg, border: `1px solid ${s.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <StajIcon path={s.icon} size={18} color={s.color} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: responsive.val(18, 20, 22), fontWeight: 700, color: STAJ.navy, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: STAJ.textMuted, marginTop: 3 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Başvuru Listesi Başlığı ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: STAJ.primary }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: STAJ.navy, margin: 0 }}>
            Başvurularım
          </h3>
          {totalApps > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
              background: "#F3F4F6", color: STAJ.textMuted,
            }}>{totalApps}</span>
          )}
        </div>

        {savedMsg && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 14,
            background: savedMsg.includes("hata") || savedMsg.includes("doldurun") ? STAJ.redLight : STAJ.greenLight,
            color: savedMsg.includes("hata") || savedMsg.includes("doldurun") ? STAJ.red : STAJ.green,
            fontSize: 13, fontWeight: 500,
            border: `1px solid ${savedMsg.includes("hata") || savedMsg.includes("doldurun") ? "#FCA5A5" : "#A7F3D0"}`,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <StajIcon path={savedMsg.includes("hata") || savedMsg.includes("doldurun") ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" : "M5 13l4 4L19 7"} size={16} />
            {savedMsg}
          </div>
        )}

        {myApplications.length === 0 ? (
          <div style={{
            background: "white", borderRadius: 16,
            border: "1.5px dashed #CBD5E1",
            padding: responsive.val("32px 20px", "44px 28px", "56px 32px"),
            textAlign: "center",
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: `linear-gradient(135deg, ${STAJ.primaryPale} 0%, #F0F9FF 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 18px",
              border: `1px solid ${STAJ.primary}20`,
            }}>
              <StajIcon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={36} color={STAJ.primary} />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: STAJ.navy, margin: "0 0 8px" }}>
              Henüz başvurunuz bulunmuyor
            </h4>
            <p style={{ fontSize: 13, color: STAJ.textMuted, margin: "0 auto 22px", maxWidth: 420, lineHeight: 1.6 }}>
              Staj yapmak için aşağıdaki butonla ilk başvurunuzu oluşturabilirsiniz.
              Başvurunuz onaylandıktan sonra yol haritası üzerinden tüm süreci adım adım takip edebilirsiniz.
            </p>
            <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} style={{
              padding: "11px 22px", borderRadius: 10, border: "none",
              background: STAJ.primary, color: "white",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 8,
              boxShadow: `0 4px 12px ${STAJ.primary}40`,
            }}>
              <StajIcon path="M12 5v14M5 12h14" size={16} color="white" />
              İlk Başvurunu Oluştur
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {myApplications.map(app => {
              const status = STAJ_STATUS[app.status] || STAJ_STATUS.beklemede;
              const isRejected = app.status === "reddedildi";
              const roadmap = appRoadmaps[app.id] || {};
              const roadmapSteps = roadmap.steps || {};
              const completedSteps = Object.values(roadmapSteps).filter(s => s.status === "completed").length;
              const pendingSteps = Object.values(roadmapSteps).filter(s => s.status === "pending_approval").length;
              const totalSteps = STAJ_ROADMAP_STEPS.length;

              let progressPct = 0;
              let progressColor = "#EAB308";
              let progressLabel = "Beklemede";

              if (isRejected) {
                progressPct = 0;
                progressColor = STAJ.red;
                progressLabel = "Reddedildi";
              } else if (app.status === "tamamlandi") {
                progressPct = 100;
                progressColor = STAJ.green;
                progressLabel = "Tamamlandı";
              } else if (app.status === "devam") {
                progressPct = Math.max(5, (completedSteps / totalSteps) * 100);
                progressColor = completedSteps === totalSteps ? STAJ.green : "#3B82F6";
                progressLabel = pendingSteps > 0 ? `${completedSteps}/${totalSteps} (Onay bekleniyor)` : `${completedSteps}/${totalSteps} adım`;
              } else {
                progressPct = 2;
                progressColor = "#EAB308";
                progressLabel = "Kayıt onayı bekleniyor";
              }

              const stajYeri = app.stajYeriAdi || "—";
              const stajInitial = (stajYeri[0] || "S").toUpperCase();

              return (
                <div key={app.id}
                  onClick={() => handleEdit(app)}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(8, 145, 178, 0.12)";
                    e.currentTarget.style.borderColor = `${STAJ.primary}50`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                    e.currentTarget.style.borderColor = "#E5E7EB";
                  }}
                  style={{
                    background: "white", borderRadius: 14,
                    padding: responsive.val(14, 16, 18),
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
                  }}
                >
                  {/* Üst satır: Avatar + başlık + durum rozeti */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: `linear-gradient(135deg, ${STAJ.primary} 0%, #0E7490 100%)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontSize: 16, fontWeight: 700,
                      boxShadow: `0 2px 8px ${STAJ.primary}30`,
                    }}>
                      {stajInitial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: STAJ.navy }}>{stajYeri}</span>
                        <span style={{
                          padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                          color: status.color, background: status.bg,
                          border: `1px solid ${status.color}30`,
                        }}>
                          {status.label}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                        {app.stajEtapLabel && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            fontSize: 11, color: STAJ.textMuted, fontWeight: 500,
                            padding: "3px 9px", borderRadius: 6,
                            background: "#F9FAFB", border: "1px solid #F3F4F6",
                          }}>
                            <StajIcon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" size={11} color="#9CA3AF" />
                            {app.stajEtapLabel}
                          </span>
                        )}
                        {(app.stajBaslamaTarihi || app.stajBitisTarihi) && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            fontSize: 11, color: STAJ.textMuted, fontWeight: 500,
                            padding: "3px 9px", borderRadius: 6,
                            background: "#F9FAFB", border: "1px solid #F3F4F6",
                          }}>
                            <StajIcon path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size={11} color="#9CA3AF" />
                            {app.stajBaslamaTarihi || "—"} / {app.stajBitisTarihi || "—"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
                      fontSize: 11, fontWeight: 600, color: STAJ.primary,
                      padding: "5px 10px", borderRadius: 8,
                      background: STAJ.primaryPale,
                    }}>
                      Düzenle
                      <StajIcon path="M9 5l7 7-7 7" size={12} color={STAJ.primary} />
                    </div>
                  </div>

                  {/* Alt satır: segmentli progress + etiket */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: STAJ.textMuted }}>
                        Staj Süreci
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: progressColor }}>
                        {progressLabel}
                      </span>
                    </div>
                    {/* Segmentli adım göstergesi */}
                    <div style={{ display: "flex", gap: 3 }}>
                      {Array.from({ length: totalSteps }).map((_, i) => {
                        const stepData = roadmapSteps[i];
                        const isCompleted = stepData?.status === "completed";
                        const isPending = stepData?.status === "pending_approval";
                        const isStepRejected = stepData?.status === "rejected";
                        const segColor = isRejected ? "#FCA5A5"
                          : isCompleted ? STAJ.green
                          : isPending ? "#3B82F6"
                          : isStepRejected ? STAJ.red
                          : "#E5E7EB";
                        return (
                          <div key={i} style={{
                            flex: 1, height: 6, borderRadius: 999,
                            background: segColor,
                            transition: "background 0.3s",
                          }} />
                        );
                      })}
                    </div>
                  </div>
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
          <div><label style={labelStyle}>Adı ve Soyadı {reqMark}</label><input value={form.adSoyad} onChange={e => set("adSoyad", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Öğrenci No {reqMark}</label><input value={form.ogrenciNo} onChange={e => set("ogrenciNo", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Bölümü/Programı {reqMark}</label><input value={form.bolumProgrami} onChange={e => set("bolumProgrami", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>E-posta Adresi {reqMark}</label><input type="email" value={form.eposta} onChange={e => set("eposta", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Telefon No {reqMark}</label><input value={form.telefonNo} onChange={e => set("telefonNo", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Eğitim Dönemi {reqMark}</label><input value={form.egitimDonemi} onChange={e => set("egitimDonemi", e.target.value)} placeholder="Örn: 2024-2025 Bahar" style={inputStyle} /></div>
          <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}><label style={labelStyle}>İkametgah Adresi {reqMark}</label><input value={form.ikametgahAdresi} onChange={e => set("ikametgahAdresi", e.target.value)} style={inputStyle} /></div>
        </div>
      </div>

      {/* 2. STAJ YAPILACAK YERİN BİLGİLERİ */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>STAJ YAPILACAK YERİN BİLGİLERİ</div>
        <div style={gridStyle(3)}>
          <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}><label style={labelStyle}>Adı / Unvanı {reqMark}</label><input value={form.stajYeriAdi} onChange={e => set("stajYeriAdi", e.target.value)} style={inputStyle} /></div>
          <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}><label style={labelStyle}>Adresi {reqMark}</label><input value={form.stajYeriAdresi} onChange={e => set("stajYeriAdresi", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Telefon No {reqMark}</label><input value={form.stajYeriTelefon} onChange={e => set("stajYeriTelefon", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Faks No</label><input value={form.stajYeriFaks} onChange={e => set("stajYeriFaks", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>E-posta Adresi {reqMark}</label><input type="email" value={form.stajYeriEposta} onChange={e => set("stajYeriEposta", e.target.value)} style={inputStyle} /></div>
        </div>
      </div>

      {/* 3. İŞVERENİN/YETKİLİNİN BİLGİLERİ */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>İŞVERENİN / YETKİLİNİN BİLGİLERİ</div>
        <div style={gridStyle(2)}>
          <div><label style={labelStyle}>Adı ve Soyadı {reqMark}</label><input value={form.isverenAdSoyad} onChange={e => set("isverenAdSoyad", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Görev ve Ünvanı {reqMark}</label><input value={form.isverenGorevUnvan} onChange={e => set("isverenGorevUnvan", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>E-posta Adresi {reqMark}</label><input type="email" value={form.isverenEposta} onChange={e => set("isverenEposta", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Tarih {reqMark}</label><input type="date" value={form.isverenTarih} onChange={e => set("isverenTarih", e.target.value)} style={inputStyle} /></div>
        </div>
      </div>

      {/* 4. STAJ ETABI SEÇİMİ */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>STAJ ETABI {reqMark}</div>
        {stajPeriods.length === 0 ? (
          <div style={{ padding: "16px 20px", borderRadius: 8, background: "#FEF9C3", border: "1px solid #FCD34D", fontSize: 13, color: "#92400E" }}>
            Henüz staj etabı tanımlanmamış. Lütfen bölüm yetkilinize veya staj komisyonuna başvurun.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stajPeriods.map(period => {
              const isSelected = form.stajEtapId === period.id;
              const start = new Date(period.baslangic);
              const end = new Date(period.bitis);
              const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
              return (
                <div key={period.id} onClick={() => handleEtapSelect(period.id)} style={{
                  padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${isSelected ? STAJ.primary : "#E5E7EB"}`,
                  background: isSelected ? STAJ.primaryPale : "white",
                  transition: "all 0.2s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: `2px solid ${isSelected ? STAJ.primary : "#D1D5DB"}`,
                      background: isSelected ? STAJ.primary : "white",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: isSelected ? STAJ.primary : STAJ.navy }}>{period.label}</div>
                      <div style={{ fontSize: 12, color: STAJ.textMuted, marginTop: 2 }}>
                        {period.baslangic} — {period.bitis} ({diff} gün)
                        {period.aciklama && <span> | {period.aciklama}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
          <div><label style={labelStyle}>Soyadı {reqMark}</label><input value={form.nufusSoyad} onChange={e => set("nufusSoyad", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Adı {reqMark}</label><input value={form.nufusAd} onChange={e => set("nufusAd", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Baba Adı {reqMark}</label><input value={form.babaAdi} onChange={e => set("babaAdi", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Ana Adı {reqMark}</label><input value={form.anaAdi} onChange={e => set("anaAdi", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Doğum Yeri {reqMark}</label><input value={form.dogumYeri} onChange={e => set("dogumYeri", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Doğum Tarihi {reqMark}</label><input type="date" value={form.dogumTarihi} onChange={e => set("dogumTarihi", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>T.C. Kimlik No {reqMark}</label><input value={form.tcKimlikNo} onChange={e => { const v = e.target.value.replace(/\D/g, ""); set("tcKimlikNo", v); }} maxLength={11} placeholder="11 haneli" style={inputStyle} /></div>
          <div><label style={labelStyle}>N.Cüzdan Seri No {reqMark}</label><input value={form.nufusCuzdanSeriNo} onChange={e => set("nufusCuzdanSeriNo", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>SSK No</label><input value={form.sskNo} onChange={e => set("sskNo", e.target.value)} placeholder="Tercih" style={inputStyle} /></div>
          <div><label style={labelStyle}>Nüfusa Kay. Olduğu İl {reqMark}</label><input value={form.nufusIl} onChange={e => set("nufusIl", e.target.value)} style={inputStyle} /></div>
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
// Staj Belge Yükleme (Öğrenci - Staj Kayıtları Sekmesi)
// ══════════════════════════════════════════════════════════════
function StajBelgeYukleme({ currentUser, activeDepartment }) {
  const responsive = window.useResponsive();
  const isMobile = responsive.val(true, true, false);
  const [uploads, setUploads] = useState({});
  const [uploading, setUploading] = useState(null);
  const [msg, setMsg] = useState("");
  const [changeRequests, setChangeRequests] = useState({});
  const [roadmapData, setRoadmapData] = useState(null);
  const [myApplication, setMyApplication] = useState(null);
  const [loadingApp, setLoadingApp] = useState(true);
  
  // Track if component is mounted to prevent state updates on unmounted component
  const mountedRef = React.useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const studentId = currentUser?.studentNumber || currentUser?.identifier || "";

  // Document visibility step constants
  // INITIAL_DOCUMENT_STEP: Application documents belong to step 2 (Belge Yükleme)
  const INITIAL_DOCUMENT_STEP = 2;

  // Belge durumunu DB'den yükleyip state'e yaz
  const loadUploadsFromDB = async () => {
    if (!studentId || !mountedRef.current) return;
    try {
      const uploadResult = await window.apiReadDoc("internship_uploads", studentId);
      if (!mountedRef.current) return;
      if (uploadResult.exists) {
        const data = uploadResult.data || {};
        setUploads(data);
        const requests = {};
        Object.keys(data).forEach(key => {
          if (data[key]?.changeRequest) requests[key] = data[key].changeRequest;
        });
        setChangeRequests(requests);
      } else {
        setUploads({});
        setChangeRequests({});
      }
    } catch (e) {
      console.error("Belgeler yüklenirken hata:", e);
    }
  };

  // Yüklenen belgeleri, değişiklik taleplerini ve roadmap durumunu yükle
  useEffect(() => {
    const loadData = async () => {
      if (!mountedRef.current) return;
      setLoadingApp(true);
      try {
        if (!studentId) { 
          if (mountedRef.current) setLoadingApp(false); 
          return; 
        }

        // Öğrencinin staj başvurusunu yükle (ogrenciNo alanıyla sorgula)
        const apps = await window.apiRead("internship_applications", { where: "ogrenciNo:eq:s:" + studentId });
        if (!mountedRef.current) return;
        
        if (apps.length > 0) {
          // Onaylı (devam) > beklemede > diğer sırasıyla al
          const app = apps.find(a => a.status === "devam") ||
                      apps.find(a => a.status === "tamamlandi") ||
                      apps.find(a => a.status === "beklemede") ||
                      apps[0];
          setMyApplication(app);

          // Roadmap ve belgeler bağımsız olarak yükle; birinin hatası diğerini etkilemesin
          const [rmSettled, uploadsSettled] = await Promise.allSettled([
            // Roadmap verisini yükle
            window.apiReadDoc("internship_roadmap", app.id).then(rmResult => {
              if (mountedRef.current && rmResult.exists) setRoadmapData(rmResult.data);
            }),
            // Belgeleri yükle (başvurusu olanlar için)
            loadUploadsFromDB(),
          ]);
          if (rmSettled.status === "rejected") console.error("Roadmap yüklenemedi:", rmSettled.reason);
          if (uploadsSettled.status === "rejected") console.error("Belgeler yüklenemedi:", uploadsSettled.reason);
        }
      } catch (e) {
        console.error("Staj verileri yüklenirken hata:", e);
      } finally {
        if (mountedRef.current) setLoadingApp(false);
      }
    };
    loadData();
  }, [studentId, activeDepartment]);

  const BELGE_ALANLARI = [
    {
      id: "zorunlu_staj_formu",
      title: "Zorunlu Staj Formu",
      desc: "Zorunlu staj formunu indirip doldurduktan sonra bu alana yükleyiniz.",
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      step: 2,
      formLink: true,
    },
    {
      id: "staj_basvuru_formu_ek1",
      title: "Staj Başvuru Formu (Ek-1)",
      desc: "Staj başvuru formunu (Ek-1) indirip doldurduktan sonra bu alana yükleyiniz.",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
      step: 2,
      formLink: true,
    },
    {
      id: "kimlik_fotokopisi",
      title: "Kimlik Fotokopisi",
      desc: "Kimlik fotokopinizi tarayıp bu alana yükleyiniz.",
      icon: "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0",
      step: 2,
    },
    {
      id: "staj_defteri",
      title: "Staj Defteri",
      desc: "Her sayfası imzalı veya kaşelenmiş staj defteri",
      icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
      step: 6,
    },
    {
      id: "ek2_belgesi",
      title: "Ek-2 Belgesi (İmzalı/Mühürlü)",
      desc: "İmzalı ve mühürlü Ek-2 belgesini yükleyin. Ek-2'ye Formlar modülünden erişebilirsiniz.",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      step: 6,
      formLink: true,
    },
    {
      id: "staj_teslim_belgesi",
      title: "Staj Teslim Belgesi",
      desc: "Staj teslim belgesini yükleyin. Formlar modülünden erişebilirsiniz.",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
      step: 6,
      formLink: true,
    },
    {
      id: "turnitin_raporu",
      title: "Turnitin Benzerlik Raporu",
      desc: "Sadece Turnitin benzerlik raporunu yükleyin. Staj defterini bu alana tekrar yüklemenize gerek yoktur.",
      icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      step: 6,
    },
  ];

  // Belge değişiklik talebi gönder
  const handleRequestChange = async (belgeId) => {
    try {
      const existingData = uploads[belgeId] || {};
      const updatedData = {
        ...existingData,
        changeRequest: {
          status: "pending",
          requestedAt: new Date().toISOString(),
          requestedBy: studentId,
        },
      };

      await window.DBWrite.set("internship_uploads", studentId, { [belgeId]: updatedData }, true);

      setUploads(prev => ({ ...prev, [belgeId]: updatedData }));
      setChangeRequests(prev => ({ ...prev, [belgeId]: updatedData.changeRequest }));
      setMsg("Belge değişiklik talebi gönderildi. Yetkili onayı bekleniyor...");
      setTimeout(() => setMsg(""), 4000);
    } catch (e) {
      console.error("Değişiklik talebi hatası:", e);
      setMsg("Hata oluştu: " + e.message);
      setTimeout(() => setMsg(""), 4000);
    }
  };

  // Belgenin ait olduğu roadmap adımının onaya gönderilip gönderilmediğini kontrol et
  const isStepSubmitted = (belgeId) => {
    const belge = BELGE_ALANLARI.find(b => b.id === belgeId);
    if (!belge || !belge.step) return false;
    const stepIdx = belge.step - 1; // 0-based index
    const stepStatus = roadmapData?.steps?.[stepIdx]?.status;
    return stepStatus === "pending_approval" || stepStatus === "completed";
  };

  // Mevcut roadmap adımını belirle (öğrenci hangi adımda)
  const getCurrentRoadmapStep = () => {
    if (!myApplication) return 0;
    if (myApplication.status === "beklemede") return 1;
    if (myApplication.status === "reddedildi") return 0;

    // STAJ_ROADMAP_STEPS defines all roadmap steps (currently 8 steps)
    const TOTAL_STEPS = STAJ_ROADMAP_STEPS.length;
    
    // Tamamlanmış en son adımı bul
    let lastCompletedStep = 0;
    for (let i = 0; i < TOTAL_STEPS; i++) {
      const stepData = roadmapData?.steps?.[i];
      if (stepData?.status === "completed") {
        lastCompletedStep = i + 1; // 1-based step number
      }
    }
    // Mevcut adım = tamamlanan son adım + 1
    return Math.min(lastCompletedStep + 1, TOTAL_STEPS);
  };

  const currentStep = getCurrentRoadmapStep();

  // Adım 4 (SGK İşlemleri, index=3) tamamlandı mı kontrol et
  const isStep5Completed = () => {
    return roadmapData?.steps?.[3]?.status === "completed";
  };

  // Belge görünür mü kontrol et
  // Başvuru mevcut olduğunda tüm belgeler görünür
  const isDocumentVisible = (belge) => {
    if (!myApplication) return false;
    return true;
  };

  // Öğrenci belge görüntüleme/indirme
  const getStudentFileUrl = (belgeId) => {
    const uploaded = uploads[belgeId];
    if (!uploaded) return null;
    const sp = uploaded.serverPath || uploaded.downloadURL || uploaded.path || uploaded.url || "";
    if (!sp) return null;
    if (sp.startsWith("http")) return sp;
    if (sp.startsWith("/api/")) return sp;
    return `/api/files/download/${sp}`;
  };

  const handleStudentPreview = (belgeId) => {
    const url = getStudentFileUrl(belgeId);
    if (!url) { return; }
    window.open(url, "_blank");
  };

  const handleStudentDownload = (belgeId) => {
    const url = getStudentFileUrl(belgeId);
    if (!url) { return; }
    window.open(url + (url.includes("?") ? "&" : "?") + "download=true", "_blank");
  };

  // Belge yüklenebilir mi kontrol et
  const canUploadDocument = (belgeId) => {
    // Başvuru yoksa hiçbir belge yüklenemez
    if (!myApplication) return false;
    const belge = BELGE_ALANLARI.find(b => b.id === belgeId);
    // Adım 6 belgeleri (staj defteri, ek2, staj teslim, turnitin) ancak
    // adım 4 (SGK) tamamlandıktan sonra yüklenebilir
    if (belge && belge.step === 6 && !isStep5Completed()) return false;
    const uploaded = uploads[belgeId];
    if (!uploaded || !uploaded.fileName) return true; // Henüz yüklenmemiş, yüklenebilir
    // Dosya sunucuda yoksa (serverPath/downloadURL/path yok), serbestçe yüklenebilir
    const hasFile = uploaded.serverPath || uploaded.downloadURL || uploaded.path || uploaded.url;
    if (!hasFile) return true;
    // Adım henüz onaya gönderilmemişse, öğrenci serbestçe değiştirebilir
    if (!isStepSubmitted(belgeId)) return true;
    // Adım onaya gönderildiyse, değişiklik izni olmalı
    const changeReq = uploaded.changeRequest;
    if (changeReq?.status === "approved") return true;
    return false;
  };

  const handleFileUpload = async (belgeId, file) => {
    if (!file) return;

    // Yüklenmiş belge değişiklik kontrolü
    if (!canUploadDocument(belgeId)) {
      setMsg("Bu belgeyi değiştirmek için önce yetkili izni almanız gerekmektedir.");
      setTimeout(() => setMsg(""), 4000);
      return;
    }

    setUploading(belgeId);
    try {
      // Dosya bilgisini kaydet
      const fileData = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        status: "yuklendi",
        serverPath: "",
        downloadURL: "",
      };

      // Dosyayı sunucuya yükle
      const formData = new FormData();
      formData.append("folder", `staj_belgeler/${studentId}`);
      formData.append("file", file);
      try {
        const resp = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });
        if (resp.ok) {
          const result = await resp.json();
          fileData.serverPath = result.fileName || result.downloadURL || result.path || result.filename;
          fileData.downloadURL = result.downloadURL || "";
        }
      } catch (uploadErr) {
        console.warn("Dosya sunucuya yüklenemedi, sadece kayıt tutulacak:", uploadErr);
      }

      await window.DBWrite.set("internship_uploads", studentId, { [belgeId]: fileData }, true);

      if (!mountedRef.current) return;

      // Optimistic state güncelle
      setUploads(prev => ({ ...prev, [belgeId]: fileData }));
      setChangeRequests(prev => { const p = { ...prev }; delete p[belgeId]; return p; });
      setMsg("Belge başarıyla yüklendi!");

      // DB'den güncel veriyi çek (tutarlılık için)
      await loadUploadsFromDB();
      setTimeout(() => { if (mountedRef.current) setMsg(""); }, 3000);
    } catch (e) {
      console.error("Yükleme hatası:", e);
      if (!mountedRef.current) return;
      setMsg("Yükleme sırasında hata oluştu: " + e.message);
      setTimeout(() => { if (mountedRef.current) setMsg(""); }, 4000);
    } finally {
      if (mountedRef.current) setUploading(null);
    }
  };

  const sectionStyle = {
    background: "white", borderRadius: 12,
    border: "1px solid #E5E7EB", overflow: "hidden",
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: STAJ.navy, margin: 0 }}>
          Staj Belge Yükleme
        </h3>
        <p style={{ fontSize: 13, color: STAJ.textMuted, marginTop: 4 }}>
          Staj sürecinizle ilgili belgeleri aşağıdaki alanlara yükleyebilirsiniz.
        </p>
      </div>

      {/* ── Yükleniyor ── */}
      {loadingApp && (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 32, height: 32, border: "3px solid #E5E7EB", borderTopColor: STAJ.primary, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13, color: STAJ.textMuted }}>Başvuru bilgileri kontrol ediliyor...</p>
          </div>
        </div>
      )}

      {/* ── Başvuru Yok → Kilit Ekranı ── */}
      {!loadingApp && !myApplication && (
        <div style={{
          background: "white", borderRadius: 16,
          border: "1.5px solid #E5E7EB",
          padding: "48px 32px", textAlign: "center",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "#F3F4F6",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <StajIcon path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" size={32} color="#9CA3AF" />
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: STAJ.navy, margin: "0 0 10px" }}>
            Belge Yükleme Kilitli
          </h4>
          <p style={{ fontSize: 13, color: STAJ.textMuted, maxWidth: 420, margin: "0 auto 24px", lineHeight: 1.7 }}>
            Belge yükleyebilmek için önce <strong>Staj Başvurusu</strong> yapmanız gerekmektedir.
            Başvurunuz tamamlandıktan sonra bu alandaki belgeler aktif hale gelecektir.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 340, margin: "0 auto 28px" }}>
            {BELGE_ALANLARI.map(belge => (
              <div key={belge.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 8,
                background: "#F9FAFB", border: "1px solid #E5E7EB",
                opacity: 0.6,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <StajIcon path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" size={14} color="#9CA3AF" />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#6B7280" }}>{belge.title}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>Adım {belge.step}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#F3F4F6", color: "#9CA3AF" }}>Kilitli</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              // Staj Başvurusu sekmesine yönlendir
              if (window.__stajSetTab) window.__stajSetTab("basvuru");
            }}
            style={{
              padding: "11px 24px", borderRadius: 10, border: "none",
              background: STAJ.primary, color: "white",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}
          >
            <StajIcon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={16} color="white" />
            Staj Başvurusu Yap
          </button>
        </div>
      )}

      {/* ── Normal Görünüm (Başvuru Mevcut) ── */}
      {!loadingApp && myApplication && (
        <>
          {/* Başvuru durum bilgisi */}
          <div style={{
            marginBottom: 16, padding: "10px 14px", borderRadius: 8,
            background: myApplication.status === "devam" ? STAJ.greenLight
              : myApplication.status === "beklemede" ? "#FEF9C3"
              : myApplication.status === "tamamlandi" ? STAJ.primaryPale
              : STAJ.redLight,
            border: `1px solid ${myApplication.status === "devam" ? "#A7F3D0"
              : myApplication.status === "beklemede" ? "#FCD34D"
              : myApplication.status === "tamamlandi" ? "#BAE6FD"
              : "#FCA5A5"}`,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <StajIcon
              path={myApplication.status === "devam" ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                : myApplication.status === "beklemede" ? "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                : "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"}
              size={15}
              color={myApplication.status === "devam" ? STAJ.green
                : myApplication.status === "beklemede" ? "#92400E"
                : myApplication.status === "tamamlandi" ? STAJ.primary
                : STAJ.red}
            />
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: myApplication.status === "devam" ? STAJ.green
                : myApplication.status === "beklemede" ? "#92400E"
                : myApplication.status === "tamamlandi" ? STAJ.primary
                : STAJ.red,
            }}>
              {myApplication.status === "devam" ? "Staj başvurunuz onaylandı — belge yükleyebilirsiniz."
                : myApplication.status === "beklemede" ? "Başvurunuz inceleniyor — belgelerinizi şimdiden yükleyebilirsiniz."
                : myApplication.status === "tamamlandi" ? "Stajınız tamamlandı."
                : "Başvurunuz reddedildi. Yeni başvuru yapınız."}
              {myApplication.stajEtapLabel && <span style={{ fontWeight: 400, marginLeft: 6 }}>({myApplication.stajEtapLabel})</span>}
            </span>
          </div>

          {msg && (
            <div style={{
              padding: "10px 16px", borderRadius: 8, marginBottom: 16,
              background: msg.includes("hata") ? STAJ.redLight : STAJ.greenLight,
              color: msg.includes("hata") ? STAJ.red : STAJ.green,
              fontSize: 13, fontWeight: 500,
            }}>{msg}</div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {BELGE_ALANLARI.filter(belge => isDocumentVisible(belge)).map(belge => {
              const uploaded = uploads[belge.id];
              const isUploading = uploading === belge.id;
              return (
                <div key={belge.id} style={sectionStyle}>
                  <div style={{
                    padding: "16px 18px",
                    display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap",
                  }}>
                    {/* Icon */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: uploaded ? STAJ.greenLight : STAJ.primaryPale,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <StajIcon path={uploaded ? "M5 13l4 4L19 7" : belge.icon} size={20}
                        color={uploaded ? STAJ.green : STAJ.primary} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: STAJ.navy }}>{belge.title}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                          background: uploaded ? STAJ.greenLight : "#FEF9C3",
                          color: uploaded ? STAJ.green : "#92400E",
                        }}>{uploaded ? "Yüklendi" : `Adım ${belge.step}`}</span>
                      </div>
                      <p style={{ fontSize: 12, color: STAJ.textMuted, margin: "4px 0 0", lineHeight: 1.5 }}>{belge.desc}</p>

                      {/* Yüklenen dosya bilgisi */}
                      {uploaded && (
                        <div style={{
                          marginTop: 8, padding: "6px 10px", borderRadius: 6,
                          background: "#F9FAFB", border: "1px solid #F3F4F6",
                          fontSize: 12, color: STAJ.text,
                          display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
                        }}>
                          <StajIcon path="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" size={13} color="#6B7280" />
                          <span style={{ fontWeight: 500 }}>{uploaded.fileName}</span>
                          <span style={{ color: STAJ.textMuted }}>
                            ({(uploaded.fileSize / 1024).toFixed(0)} KB) — {new Date(uploaded.uploadedAt).toLocaleDateString("tr-TR")}
                          </span>
                          <div style={{ display: "flex", gap: 6, marginLeft: "auto", alignItems: "center" }}>
                            {getStudentFileUrl(belge.id) ? (
                              <>
                                <button onClick={() => handleStudentPreview(belge.id)} style={{
                                  padding: "4px 10px", borderRadius: 6, border: "1px solid #93C5FD",
                                  background: "#EFF6FF", color: "#2563EB", fontSize: 11, fontWeight: 600,
                                  cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                                }}>
                                  <StajIcon path="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" size={12} />
                                  Görüntüle
                                </button>
                                <button onClick={() => handleStudentDownload(belge.id)} style={{
                                  padding: "4px 10px", borderRadius: 6, border: "1px solid #A7F3D0",
                                  background: "#ECFDF5", color: "#059669", fontSize: 11, fontWeight: 600,
                                  cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                                }}>
                                  <StajIcon path="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" size={12} />
                                  İndir
                                </button>
                              </>
                            ) : (
                              <span style={{
                                fontSize: 10, fontWeight: 600,
                                padding: "3px 8px", borderRadius: 6,
                                background: "#FEF2F2", color: "#DC2626",
                                border: "1px solid #FCA5A5",
                              }}>
                                Dosya sunucuda yok — tekrar yükleyin
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Upload / Link Buttons */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
                      {belge.formLink && (
                        <button onClick={() => window.location.hash = "#formlar"} style={{
                          padding: "8px 14px", borderRadius: 8, border: "1px solid #D1D5DB",
                          background: "white", color: STAJ.primary, fontSize: 12, fontWeight: 500,
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                        }}>
                          <StajIcon path="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" size={13} />
                          Formlar
                        </button>
                      )}

                      {/* Adım 6 belgeleri adım 4 tamamlanmadan kilitli */}
                      {belge.step === 6 && !isStep5Completed() && (
                        <span style={{
                          padding: "8px 14px", borderRadius: 8,
                          background: "#F1F5F9", border: "1px solid #CBD5E1",
                          color: "#64748B", fontSize: 11, fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 5,
                        }}>
                          <StajIcon path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" size={13} />
                          Adım 4 tamamlandıktan sonra açılır
                        </span>
                      )}

                      {/* Belge yüklenmişse, adım onaya gönderilmişse ve değişiklik talebi yoksa → Değişiklik İste butonu */}
                      {uploaded && uploaded.fileName && isStepSubmitted(belge.id) && !canUploadDocument(belge.id) && !uploaded.changeRequest && !(belge.step === 6 && !isStep5Completed()) && (
                        <button onClick={() => handleRequestChange(belge.id)} style={{
                          padding: "8px 14px", borderRadius: 8, border: "1px solid #FDBA74",
                          background: "#FFF7ED", color: "#EA580C", fontSize: 12, fontWeight: 600,
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                        }}>
                          <StajIcon path="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" size={13} />
                          Değişiklik İste
                        </button>
                      )}

                      {/* Değişiklik talebi onay bekliyorsa */}
                      {uploaded?.changeRequest?.status === "pending" && (
                        <span style={{
                          padding: "8px 14px", borderRadius: 8,
                          background: "#DBEAFE", color: "#1E40AF",
                          fontSize: 11, fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 5,
                        }}>
                          <StajIcon path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size={13} />
                          Değişiklik onayı bekleniyor
                        </span>
                      )}

                      {/* Değişiklik onaylanmışsa veya henüz yüklenmemişse → Yükle butonu */}
                      {canUploadDocument(belge.id) && (
                        <label style={{
                          padding: "8px 14px", borderRadius: 8, border: "none",
                          background: isUploading ? "#9CA3AF" : (uploaded?.fileName ? "#EA580C" : STAJ.primary),
                          color: "white", fontSize: 12, fontWeight: 600,
                          cursor: isUploading ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: 5,
                        }}>
                          <StajIcon path="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" size={13} />
                          {isUploading ? "Yükleniyor..." : (uploaded?.fileName ? "Belgeyi Değiştir" : "Yükle")}
                          <input
                            type="file"
                            style={{ display: "none" }}
                            disabled={isUploading}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={e => {
                              if (e.target.files?.[0]) handleFileUpload(belge.id, e.target.files[0]);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Ana Staj Modülü
// ══════════════════════════════════════════════════════════════
function StajModuluApp({ currentUser, activeDepartment, departmentInfo }) {
  const [stajRecords, setStajRecords] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [allUploads, setAllUploads] = useState({});
  const [stajPeriods, setStajPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [selectedApp, setSelectedApp] = useState(null);
  const [editingApp, setEditingApp] = useState(null);
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [periodForm, setPeriodForm] = useState({ label: "", baslangic: "", bitis: "", aciklama: "" });
  const [activeTab, setActiveTab] = useState("kayitlar");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [stajCommissionMembers, setStajCommissionMembers] = useState([]);
  const [isCommissionMember, setIsCommissionMember] = useState(false);
  const responsive = window.useResponsive();

  const isAdmin = currentUser?.role === "admin";
  const isDeptManager = currentUser?.role === "bolum_yetkilisi";
  const isProfessor = currentUser?.role === "professor";

  const isErgunCinar = useMemo(() => {
    if (!currentUser || (!currentUser.name && !currentUser.identifier)) return false;
    const n = currentUser.name || currentUser.identifier;
    return (n.toLowerCase().includes("ergün") || n.toLowerCase().includes("ergun")) &&
           (n.toLowerCase().includes("çinar") || n.toLowerCase().includes("çınar") || 
            n.toLowerCase().includes("cinar") || n.toLowerCase().includes("cınar"));
  }, [currentUser]);

  // Staj komisyonu üyelerini yükle
  useEffect(() => {
    const loadCommission = async () => {
      try {
        const comms = await window.apiRead("commissions");
        // "staj" kelimesi geçen komisyonu bul
        const stajComm = comms.find(c => (c.name || "").toLowerCase().includes("staj"));
        if (stajComm && stajComm.members) {
          setStajCommissionMembers(stajComm.members);
          // Mevcut kullanıcı komisyon üyesi mi kontrol et
          const userName = currentUser?.name || currentUser?.identifier || "";
          const isMember = stajComm.members.some(m =>
            m.name && userName && m.name.toLowerCase().trim() === userName.toLowerCase().trim()
          );
          setIsCommissionMember(isMember);
        }
      } catch (e) {
        console.error("Komisyon bilgileri yüklenirken hata:", e);
      }
    };
    loadCommission();
  }, [currentUser]);

  // Tam erişim: admin, bölüm yetkilisi, fakülte yetkilisi (admin), staj komisyon üyeleri, Ergün ÇINAR (SGK onayı)
  const canManage = isAdmin || isDeptManager || isCommissionMember || isErgunCinar;
  const isStudent = !canManage && !isProfessor;
  const studentId = currentUser?.studentNumber || currentUser?.identifier || "";

  // ── Öğrenci bildirimleri ──
  const [studentNotifs, setStudentNotifs] = useState([]);
  const [showStudentNotifs, setShowStudentNotifs] = useState(false);

  useEffect(() => {
    if (!isStudent || !studentId) return;
    const loadNotifs = async () => {
      try {
        const docs = await window.apiRead("internship_notifications", { where: "targetStudentNo:eq:s:" + studentId });
        const list = docs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setStudentNotifs(list);
      } catch (e) { console.error("Öğrenci bildirimleri yüklenemedi:", e); }
    };
    loadNotifs();
  }, [isStudent, studentId]);

  const studentUnread = studentNotifs.filter(n => !n.readBy?.includes(studentId)).length;

  const handleStudentMarkRead = async (notifId) => {
    try {
      const notif = studentNotifs.find(n => n.id === notifId);
      if (!notif || notif.readBy?.includes(studentId)) return;
      const newReadBy = [...(notif.readBy || []), studentId];
      await window.DBWrite.set("internship_notifications", notifId, { readBy: newReadBy }, true);
      setStudentNotifs(prev => prev.map(n => n.id === notifId ? { ...n, readBy: newReadBy } : n));
    } catch (e) { console.error("Bildirim okundu hatası:", e); }
  };

  const handleStudentMarkAllRead = async () => {
    try {
      const unread = studentNotifs.filter(n => !n.readBy?.includes(studentId));
      for (const n of unread) {
        await window.DBWrite.set("internship_notifications", n.id, { readBy: [...(n.readBy || []), studentId] }, true);
      }
      setStudentNotifs(prev => prev.map(n => ({
        ...n, readBy: n.readBy?.includes(studentId) ? n.readBy : [...(n.readBy || []), studentId],
      })));
    } catch (e) { console.error("Tümünü okundu hatası:", e); }
  };

  // Varsayılan sekmeyi ayarla
  useEffect(() => {
    if (isStudent) setActiveTab("basvuru");
    else setActiveTab("kayitlar");
  }, [isStudent, isCommissionMember]);

  // Kilit ekranındaki "Başvuru Yap" butonu için sekme değiştirici
  useEffect(() => {
    window.__stajSetTab = setActiveTab;
    return () => { delete window.__stajSetTab; };
  }, []);

  // Staj kayıtlarını ve başvuruları yükle
  const loadAllData = async () => {
    setLoading(true);
    try {
      // Staj etaplarını yükle
      const periodParams = activeDepartment ? { where: "departmentId:eq:s:" + activeDepartment } : {};
      const periods = await window.apiRead("internship_periods", periodParams);
      setStajPeriods(periods);

      // Eski internships koleksiyonunu yükle
      const internParams = activeDepartment ? { where: "departmentId:eq:s:" + activeDepartment } : {};
      const records = await window.apiRead("internships", internParams);
      setStajRecords(records);

      // Admin/yönetici ise öğrenci başvurularını ve belgelerini yükle
      if (canManage) {
        // Önce departmentId filtresiyle dene
        const appParams = activeDepartment ? { where: "departmentId:eq:s:" + activeDepartment } : {};
        let apps = await window.apiRead("internship_applications", appParams);

        // Eğer filtreyle sonuç yoksa filtresiz dene (departmentId eşleşmeme durumu)
        if (apps.length === 0 && activeDepartment) {
          console.warn("departmentId filtresiyle başvuru bulunamadı, filtresiz deneniyor...");
          apps = await window.apiRead("internship_applications");
          console.log("Toplam başvuru:", apps.length, "departmentId değerleri:", apps.map(a => a.departmentId));
        }

        setAllApplications(apps);

        // Tüm yüklenen belgeleri getir
        const uploadDocs = await window.apiRead("internship_uploads");
        const uploadsMap = {};
        uploadDocs.forEach(doc => { uploadsMap[doc.id] = doc; });
        setAllUploads(uploadsMap);
      }
    } catch (e) {
      console.error("Staj kayıtları yüklenirken hata:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAllData(); }, [activeDepartment, isCommissionMember]);

  const filteredApplications = useMemo(() => {
    return allApplications.filter(r => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (r.adSoyad || "").toLowerCase().includes(s) ||
               (r.ogrenciNo || "").toLowerCase().includes(s) ||
               (r.stajYeriAdi || "").toLowerCase().includes(s);
      }
      return true;
    });
  }, [allApplications, filterStatus, searchTerm]);

  const stats = useMemo(() => ({
    total: allApplications.length,
    beklemede: allApplications.filter(r => r.status === "beklemede").length,
    devam: allApplications.filter(r => r.status === "devam").length,
    tamamlandi: allApplications.filter(r => r.status === "tamamlandi").length,
    reddedildi: allApplications.filter(r => r.status === "reddedildi").length,
  }), [allApplications]);

  // Admin: Başvuru durumu güncelle
  const handleStatusChange = async (appId, newStatus) => {
    // Tamamlandı onayı vermeden önce belge kontrolü
    if (newStatus === "tamamlandi") {
      const app = allApplications.find(a => a.id === appId);
      const ogrNo = app?.ogrenciNo || selectedApp?.ogrenciNo;
      const uploads = allUploads[ogrNo] || {};
      const requiredDocs = ["zorunlu_staj_formu", "staj_basvuru_formu_ek1", "kimlik_fotokopisi", "staj_defteri", "ek2_belgesi", "staj_teslim_belgesi", "turnitin_raporu"];
      const missing = requiredDocs.filter(d => !uploads[d]);
      if (missing.length > 0) {
        const docLabels = {
          zorunlu_staj_formu: "Zorunlu Staj Formu",
          staj_basvuru_formu_ek1: "Staj Başvuru Formu (Ek-1)",
          kimlik_fotokopisi: "Kimlik Fotokopisi",
          staj_defteri: "Staj Defteri",
          ek2_belgesi: "EK-2 Belgesi",
          staj_teslim_belgesi: "Staj Teslim Belgesi",
          turnitin_raporu: "Turnitin Raporu"
        };
        alert("Tamamlandı onayı verilemez. Eksik belgeler:\n- " + missing.map(d => docLabels[d] || d).join("\n- "));
        return;
      }
    }
    try {
      await window.DBWrite.set("internship_applications", appId, {
        status: newStatus,
        statusUpdatedBy: currentUser?.name || currentUser?.identifier || "",
        statusUpdatedAt: new Date().toISOString(),
      }, true);
      setAllApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus, statusUpdatedBy: currentUser?.name || "", statusUpdatedAt: new Date().toISOString() } : a));
      setSelectedApp(prev => prev && prev.id === appId ? { ...prev, status: newStatus } : prev);
    } catch (e) {
      alert("Durum güncellenirken hata: " + e.message);
    }
  };

  // Admin: Başvuru sil
  const handleDeleteApp = async (appId) => {
    const app = allApplications.find(a => a.id === appId);
    // Fakülte yetkilisi (admin) her durumda silebilir, diğerleri sadece beklemede olanı silebilir
    if (!isAdmin && app && app.status !== "beklemede") {
      alert("Yalnızca 'Beklemede' durumundaki başvurular silinebilir. Bu başvurunun durumu: " + (app.status === "devam" ? "Devam Ediyor" : app.status === "tamamlandi" ? "Tamamlandı" : app.status === "reddedildi" ? "Reddedildi" : app.status));
      return;
    }
    const confirmMsg = isAdmin && app && app.status !== "beklemede"
      ? `Bu staj başvurusu "${STAJ_STATUS[app.status]?.label || app.status}" durumundadır. Silmek istediğinizden emin misiniz?`
      : "Bu staj başvurusunu silmek istediğinizden emin misiniz?";
    if (!confirm(confirmMsg)) return;
    try {
      await window.DBWrite.remove("internship_applications", appId);
      // İlişkili roadmap verisini de sil
      try { await window.DBWrite.remove("internship_roadmap", appId); } catch {}
      // İlişkili yüklenen belgeleri de sil (öğrenci no ile kayıtlı)
      if (app?.ogrenciNo) {
        try { await window.DBWrite.remove("internship_uploads", app.ogrenciNo); } catch {}
        // allUploads state'inden de kaldır
        setAllUploads(prev => {
          const newUploads = { ...prev };
          delete newUploads[app.ogrenciNo];
          return newUploads;
        });
      }
      setAllApplications(prev => prev.filter(a => a.id !== appId));
      setSelectedApp(null);
    } catch (e) {
      alert("Silme hatası: " + e.message);
    }
  };

  // Admin: Staj etabı kaydet
  const handleSavePeriod = async () => {
    if (!periodForm.label || !periodForm.baslangic || !periodForm.bitis) {
      alert("Etap adı, başlangıç ve bitiş tarihi zorunludur.");
      return;
    }
    try {
      const isNew = !editingPeriod;
      const data = { ...periodForm, departmentId: activeDepartment, updatedAt: new Date().toISOString() };
      let savedId = editingPeriod;
      if (editingPeriod) {
        await window.DBWrite.set("internship_periods", editingPeriod, data, true);
      } else {
        data.createdAt = new Date().toISOString();
        data.isActive = true;
        const result = await window.DBWrite.add("internship_periods", data);
        savedId = result?.id || String(Date.now());
      }

      // Yeni etap ise bölümdeki tüm kullanıcılara bildirim gönder
      if (isNew) {
        try {
          await window.DBWrite.add("internship_notifications", {
            type: "new_period",
            departmentId: activeDepartment || "",
            periodId: savedId,
            periodLabel: periodForm.label,
            baslangic: periodForm.baslangic,
            bitis: periodForm.bitis,
            aciklama: periodForm.aciklama || "",
            createdBy: currentUser?.name || currentUser?.identifier || "Yetkili",
            createdAt: new Date().toISOString(),
            // Tüm dept üyelerine (öğrenci + komisyon) hedeflenir — target: "department"
            target: "department",
            readBy: [],
          });
        } catch (notifErr) {
          console.warn("Etap bildirimi gönderilemedi:", notifErr);
        }
      }

      setShowPeriodForm(false);
      setEditingPeriod(null);
      setPeriodForm({ label: "", baslangic: "", bitis: "", aciklama: "" });
      loadAllData();
    } catch (e) {
      alert("Etap kaydedilemedi: " + e.message);
    }
  };


  // Admin: Staj etabı sil
  const handleDeletePeriod = async (periodId) => {
    if (!confirm("Bu staj etabını silmek istediğinizden emin misiniz?")) return;
    try {
      await window.DBWrite.remove("internship_periods", periodId);
      loadAllData();
    } catch (e) {
      alert("Silme hatası: " + e.message);
    }
  };

  // Admin: Belge indirme
  const getFileUrl = (studentId, belgeId) => {
    const upload = allUploads[studentId]?.[belgeId];
    if (!upload) return null;
    const sp = upload.serverPath || upload.downloadURL || upload.path || upload.url || "";
    if (!sp) return null;
    if (sp.startsWith("http")) return sp;
    if (sp.startsWith("/api/")) return sp;
    return `/api/files/download/${sp}`;
  };

  const handleDownloadFile = (studentId, belgeId) => {
    const url = getFileUrl(studentId, belgeId);
    if (!url) { alert("Bu belge için indirilebilir dosya bulunamadı."); return; }
    window.open(url + (url.includes("?") ? "&" : "?") + "download=true", "_blank");
  };

  const handlePreviewFile = (studentId, belgeId) => {
    const url = getFileUrl(studentId, belgeId);
    if (!url) { alert("Bu belge için görüntülenebilir dosya bulunamadı."); return; }
    window.open(url, "_blank");
  };

  // Admin: Yol haritası adım onayı
  const handleApproveStep = async (appId, stepIdx) => {
    // Adım 4 (index 3) sadece Ergün ÇINAR onaylayabilir
    if (stepIdx === 3 && !isErgunCinar) {
      alert("Bu adım (SGK İşlemleri) yalnızca Ergün ÇINAR tarafından onaylanabilir.");
      return;
    }
    // Ergün ÇINAR yalnızca adım 4 (index 3) için onay verebilir
    if (stepIdx !== 3 && isErgunCinar) {
      alert("Yalnızca SGK İşlemleri (Adım 4) için onay yetkiniz bulunmaktadır.");
      return;
    }

    try {
      const rmResult = await window.apiReadDoc("internship_roadmap", appId);
      const existingData = rmResult.exists ? rmResult.data : {};

      const newData = {
        ...existingData,
        steps: {
          ...existingData.steps,
          [stepIdx]: {
            ...(existingData.steps?.[stepIdx] || {}),
            status: "completed",
            approvedBy: currentUser?.name || currentUser?.identifier || "",
            approvedAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      };

      await window.DBWrite.set("internship_roadmap", appId, newData, true);

      // Öğrenciye onay bildirimi gönder
      try {
        const app = allApplications.find(a => a.id === appId);
        const approverName = currentUser?.name || currentUser?.identifier || "";
        if (app?.ogrenciNo) {
          await window.DBWrite.add("internship_notifications", {
            type: "step_approved",
            targetStudentNo: app.ogrenciNo,
            departmentId: activeDepartment || app.departmentId || "",
            appId,
            stepIdx,
            stepTitle: STAJ_ROADMAP_STEPS[stepIdx].title,
            approvedBy: approverName,
            stajEtapLabel: app.stajEtapLabel || "",
            createdAt: new Date().toISOString(),
            readBy: [],
          });
          // Komisyon üyelerine onay bildirimi gönder
          await window.DBWrite.add("internship_notifications", {
            type: "step_approved_commission",
            departmentId: activeDepartment || app.departmentId || "",
            appId,
            stepIdx,
            stepTitle: STAJ_ROADMAP_STEPS[stepIdx].title,
            approvedBy: approverName,
            studentName: app.adSoyad || "",
            studentNo: app.ogrenciNo,
            stajEtapLabel: app.stajEtapLabel || "",
            createdAt: new Date().toISOString(),
            readBy: [approverName],
          });
        }
      } catch (notifErr) { console.warn("Bildirim oluşturulamadı:", notifErr); }

      alert(`Adım ${stepIdx + 1} onaylandı.`);
      loadAllData(); loadNotifications();
    } catch (e) {
      alert("Adım onay hatası: " + e.message);
    }
  };

  // Admin: Yol haritası adım reddi
  const handleRejectStep = async (appId, stepIdx) => {
    // Ergün ÇINAR yalnızca adım 4 (index 3) için red verebilir
    if (stepIdx !== 3 && isErgunCinar) {
      alert("Yalnızca SGK İşlemleri (Adım 4) için red yetkiniz bulunmaktadır.");
      return;
    }
    try {
      const rmResult = await window.apiReadDoc("internship_roadmap", appId);
      const existingData = rmResult.exists ? rmResult.data : {};

      const newData = {
        ...existingData,
        steps: {
          ...existingData.steps,
          [stepIdx]: {
            status: "rejected",
            rejectedBy: currentUser?.name || currentUser?.identifier || "",
            rejectedAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      };

      await window.DBWrite.set("internship_roadmap", appId, newData, true);

      // Öğrenciye red bildirimi gönder
      try {
        const app = allApplications.find(a => a.id === appId);
        const rejecterName = currentUser?.name || currentUser?.identifier || "";
        if (app?.ogrenciNo) {
          await window.DBWrite.add("internship_notifications", {
            type: "step_rejected",
            targetStudentNo: app.ogrenciNo,
            departmentId: activeDepartment || app.departmentId || "",
            appId,
            stepIdx,
            stepTitle: STAJ_ROADMAP_STEPS[stepIdx].title,
            rejectedBy: rejecterName,
            stajEtapLabel: app.stajEtapLabel || "",
            createdAt: new Date().toISOString(),
            readBy: [],
          });
          // Komisyon üyelerine red bildirimi gönder
          await window.DBWrite.add("internship_notifications", {
            type: "step_rejected_commission",
            departmentId: activeDepartment || app.departmentId || "",
            appId,
            stepIdx,
            stepTitle: STAJ_ROADMAP_STEPS[stepIdx].title,
            rejectedBy: rejecterName,
            studentName: app.adSoyad || "",
            studentNo: app.ogrenciNo,
            stajEtapLabel: app.stajEtapLabel || "",
            createdAt: new Date().toISOString(),
            readBy: [rejecterName],
          });
        }
      } catch (notifErr) { console.warn("Bildirim oluşturulamadı:", notifErr); }

      alert(`Adım ${stepIdx + 1} reddedildi. Öğrenci adımı tekrar tamamlayabilir.`);
      loadAllData(); loadNotifications();
    } catch (e) {
      alert("Adım red hatası: " + e.message);
    }
  };

  // Admin: Belge değişiklik talebini onayla
  const handleApproveDocChange = async (ogrenciNo, belgeId) => {
    try {
      await window.DBWrite.set("internship_uploads", ogrenciNo, {
        [belgeId]: {
          ...allUploads[ogrenciNo]?.[belgeId],
          changeRequest: {
            status: "approved",
            approvedBy: currentUser?.name || currentUser?.identifier || "",
            approvedAt: new Date().toISOString(),
          },
        },
      }, true);

      // Refresh uploads
      const uploadDocs = await window.apiRead("internship_uploads");
      const uploadsMap = {};
      uploadDocs.forEach(doc => { uploadsMap[doc.id] = doc; });
      setAllUploads(uploadsMap);

      alert("Belge değişiklik talebi onaylandı. Öğrenci belgeyi yeniden yükleyebilir.");
    } catch (e) {
      alert("Belge değişiklik onay hatası: " + e.message);
    }
  };

  // Admin: Belge değişiklik talebini reddet
  const handleRejectDocChange = async (ogrenciNo, belgeId) => {
    try {
      await window.DBWrite.set("internship_uploads", ogrenciNo, {
        [belgeId]: {
          ...allUploads[ogrenciNo]?.[belgeId],
          changeRequest: {
            status: "rejected",
            rejectedBy: currentUser?.name || currentUser?.identifier || "",
            rejectedAt: new Date().toISOString(),
          },
        },
      }, true);

      const uploadDocs = await window.apiRead("internship_uploads");
      const uploadsMap = {};
      uploadDocs.forEach(doc => { uploadsMap[doc.id] = doc; });
      setAllUploads(uploadsMap);

      alert("Belge değişiklik talebi reddedildi.");
    } catch (e) {
      alert("Belge değişiklik red hatası: " + e.message);
    }
  };

  // ── Export state ──
  const [exportPeriodId, setExportPeriodId] = useState("all");
  const [exporting, setExporting] = useState(false);

  // ── Deadline: Staj başlangıcından 10 gün önce = öğrenci kayıt son + komisyon onay son tarihi ──
  const getKayitDeadline = (period) => period?.baslangic ? addDays(period.baslangic, -10) : null;
  // ── Süreç açılış tarihi: staj başlangıcından 1 ay önce ──
  const getSurecAcilis = (period) => period?.baslangic ? addDays(period.baslangic, -30) : null;
  // ── Deadline: staj başlangıcından 10 gün önce = komisyon onay son tarihi ──
  const getOnayDeadline = (app) => app?.stajBaslamaTarihi ? addDays(app.stajBaslamaTarihi, -10) : null;
  // ── Deadline: Ergün ÇINAR SGK son tarihi = staj başlangıç tarihi ──
  const getSgkDeadline = (roadmap, app) => {
    // SGK son tarihi sabit: staj başlangıcı (komisyon bittikten sonra 10 günlük pencere zaten oraya denk gelir)
    if (app?.stajBaslamaTarihi) return app.stajBaslamaTarihi;
    // Fallback: adım 3 (Komisyon Onayı) onayından 10 gün
    const komisyonStep = roadmap?.steps?.[2];
    if (komisyonStep?.status === "completed" && komisyonStep?.approvedAt) {
      return addDays(komisyonStep.approvedAt.split("T")[0], 10);
    }
    return null;
  };

  // ── XML Export ──
  const handleExportXML = () => {
    const period = stajPeriods.find(p => p.id === exportPeriodId);
    const apps = exportPeriodId === "all"
      ? allApplications
      : allApplications.filter(a => a.stajEtapId === exportPeriodId);
    const label = exportPeriodId === "all" ? "Tüm Etaplar" : (period?.label || exportPeriodId);
    const xml = generateXML(apps, label);
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staj-kayitlari-${label.replace(/\s+/g, "_")}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── XLSX Export ──
  const handleExportXLSX = async () => {
    setExporting(true);
    try {
      const XLSX = await loadSheetJS();
      const period = stajPeriods.find(p => p.id === exportPeriodId);
      const apps = exportPeriodId === "all"
        ? allApplications
        : allApplications.filter(a => a.stajEtapId === exportPeriodId);
      const label = exportPeriodId === "all" ? "Tüm Etaplar" : (period?.label || exportPeriodId);

      const headers = EXPORT_FIELDS.map(([, tr]) => tr);
      const rows = apps.map(app =>
        EXPORT_FIELDS.map(([key]) => {
          const v = app[key];
          if (key === "createdAt" && v) return new Date(v).toLocaleString("tr-TR");
          if (key === "status") {
            const map = { beklemede: "Beklemede", devam: "Devam Ediyor", tamamlandi: "Tamamlandı", reddedildi: "Reddedildi" };
            return map[v] || v || "";
          }
          return v != null ? String(v) : "";
        })
      );

      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      // Kolon genişlikleri
      ws["!cols"] = headers.map((h, i) => ({ wch: Math.max(h.length + 4, 16) }));
      // Başlık satırı bold
      headers.forEach((_, ci) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: ci });
        if (ws[cellRef]) ws[cellRef].s = { font: { bold: true } };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31));
      XLSX.writeFile(wb, `staj-kayitlari-${label.replace(/\s+/g, "_")}.xlsx`);
    } catch (e) {
      alert("XLSX dışa aktarma hatası: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  // ── Bildirimler ──
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!canManage) return;
    try {
      const docs = await window.apiRead("internship_notifications", { where: "departmentId:eq:s:" + (activeDepartment || "") });
      const list = docs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setNotifications(list);
    } catch (e) {
      console.error("Bildirimler yüklenirken hata:", e);
    }
  }, [canManage, activeDepartment]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const userId = currentUser?.name || currentUser?.identifier || "";

  const unreadCount = notifications.filter(n => !n.readBy?.includes(userId)).length;

  const handleMarkRead = async (notifId) => {
    try {
      const notif = notifications.find(n => n.id === notifId);
      if (!notif || notif.readBy?.includes(userId)) return;
      const newReadBy = [...(notif.readBy || []), userId];
      await window.DBWrite.set("internship_notifications", notifId, { readBy: newReadBy }, true);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, readBy: newReadBy } : n));
    } catch (e) { console.error("Bildirim okundu hatası:", e); }
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.readBy?.includes(userId));
      for (const n of unread) {
        await window.DBWrite.set("internship_notifications", n.id, { readBy: [...(n.readBy || []), userId] }, true);
      }
      setNotifications(prev => prev.map(n => ({
        ...n, readBy: n.readBy?.includes(userId) ? n.readBy : [...(n.readBy || []), userId],
      })));
    } catch (e) { console.error("Tümünü okundu hatası:", e); }
  };

  // Tüm roadmap verilerini yükle (admin için)
  const [allRoadmaps, setAllRoadmaps] = useState({});
  useEffect(() => {
    const loadRoadmaps = async () => {
      if (!canManage) return;
      try {
        const docs = await window.apiRead("internship_roadmap");
        const map = {};
        docs.forEach(doc => { map[doc.id] = doc; });
        setAllRoadmaps(map);
      } catch (e) {
        console.error("Roadmap verileri yüklenirken hata:", e);
      }
    };
    loadRoadmaps();
  }, [canManage, allApplications]);

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
    ...((canManage && !isErgunCinar) ? [{ id: "etaplar", label: "Staj Etapları", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" }] : []),
    { id: "roadmap", label: "Yol Haritası", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
    { id: "kayitlar", label: "Staj Kayıtları", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", position: "relative" }}>

      {/* ── Bildirim Paneli Overlay ── */}
      {showNotifications && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9990 }}
          onClick={() => setShowNotifications(false)}
        />
      )}

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

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Bildirim Zili (sadece yöneticilere) */}
          {canManage && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowNotifications(v => !v)}
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  border: `1.5px solid ${unreadCount > 0 ? STAJ.primary : "#E5E7EB"}`,
                  background: unreadCount > 0 ? STAJ.primaryPale : "white",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative", transition: "all 0.2s",
                }}
                title="Bildirimler"
              >
                <StajIcon
                  path="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  size={18}
                  color={unreadCount > 0 ? STAJ.primary : STAJ.textMuted}
                />
                {unreadCount > 0 && (
                  <span style={{
                    position: "absolute", top: -5, right: -5,
                    minWidth: 18, height: 18, borderRadius: 9,
                    background: "#EF4444", color: "white",
                    fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 4px", border: "2px solid white",
                  }}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Bildirim Dropdown Paneli */}
              {showNotifications && (
                <div style={{
                  position: "absolute", top: 48, right: 0, zIndex: 9999,
                  width: responsive.val(320, 380, 420),
                  background: "white", borderRadius: 14,
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  overflow: "hidden",
                }} onClick={e => e.stopPropagation()}>

                  {/* Panel Başlık */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 16px", borderBottom: "1px solid #F3F4F6",
                    background: "#FAFAFA",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: STAJ.navy }}>Bildirimler</span>
                      {unreadCount > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: STAJ.primaryPale, color: STAJ.primary }}>
                          {unreadCount} yeni
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{ fontSize: 12, color: STAJ.primary, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                      >
                        Tümünü okundu işaretle
                      </button>
                    )}
                  </div>

                  {/* Bildirim Listesi */}
                  <div style={{ maxHeight: 420, overflowY: "auto" }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: "32px 16px", textAlign: "center" }}>
                        <StajIcon path="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" size={32} color="#D1D5DB" />
                        <p style={{ fontSize: 13, color: STAJ.textMuted, marginTop: 10 }}>Henüz bildirim yok</p>
                      </div>
                    ) : (
                      notifications.map(notif => {
                        const isRead = notif.readBy?.includes(userId);
                        const timeAgo = (() => {
                          const diff = Date.now() - new Date(notif.createdAt).getTime();
                          const m = Math.floor(diff / 60000);
                          if (m < 1) return "Az önce";
                          if (m < 60) return `${m} dk önce`;
                          const h = Math.floor(m / 60);
                          if (h < 24) return `${h} sa önce`;
                          return `${Math.floor(h / 24)} gün önce`;
                        })();
                        const isApprovedNotif = notif.type === "step_approved_commission";
                        const isRejectedNotif = notif.type === "step_rejected_commission";
                        const isSubmittedNotif = notif.type === "step_submitted";
                        const isNewAppNotif = notif.type === "new_application";
                        const dotColor = isApprovedNotif ? STAJ.green : isRejectedNotif ? "#EF4444" : isNewAppNotif ? "#8B5CF6" : STAJ.primary;
                        const bgUnread = isApprovedNotif ? "#F0FDF4" : isRejectedNotif ? "#FEF2F2" : isNewAppNotif ? "#F5F3FF" : "#F0F9FF";
                        return (
                          <div key={notif.id} style={{
                            display: "flex", gap: 12, padding: "12px 16px",
                            borderBottom: "1px solid #F9FAFB",
                            background: isRead ? "white" : bgUnread,
                            transition: "background 0.2s",
                          }}>
                            {/* Renk dot */}
                            <div style={{ flexShrink: 0, paddingTop: 3 }}>
                              <div style={{
                                width: 8, height: 8, borderRadius: "50%",
                                background: isRead ? "#D1D5DB" : dotColor,
                                marginTop: 4,
                              }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: isRead ? 400 : 600, color: STAJ.navy, lineHeight: 1.4 }}>
                                {isSubmittedNotif && (
                                  <><span style={{ color: STAJ.primary }}>{notif.studentName || notif.studentNo}</span>{" "}<b>{notif.stepTitle}</b> adımını onaya gönderdi</>
                                )}
                                {isNewAppNotif && (
                                  <><span style={{ color: "#8B5CF6" }}>{notif.studentName || notif.studentNo}</span>{" "}yeni staj başvurusu oluşturdu{notif.stajYeriAdi ? ` — ${notif.stajYeriAdi}` : ""}</>
                                )}
                                {isApprovedNotif && (
                                  <><b>{notif.stepTitle}</b> adımı <span style={{ color: STAJ.green }}>{notif.approvedBy}</span> tarafından onaylandı</>
                                )}
                                {isRejectedNotif && (
                                  <><b>{notif.stepTitle}</b> adımı <span style={{ color: "#EF4444" }}>{notif.rejectedBy}</span> tarafından reddedildi</>
                                )}
                                {!isSubmittedNotif && !isNewAppNotif && !isApprovedNotif && !isRejectedNotif && (
                                  <><span style={{ color: STAJ.primary }}>{notif.studentName}</span> — {notif.stepTitle}</>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: STAJ.textMuted, marginTop: 3 }}>
                                {isSubmittedNotif && notif.studentNo && <span>{notif.studentNo} · </span>}
                                {isNewAppNotif && notif.studentNo && <span>{notif.studentNo} · </span>}
                                {isApprovedNotif && notif.studentName && <span>{notif.studentName} ({notif.studentNo}) · </span>}
                                {isRejectedNotif && notif.studentName && <span>{notif.studentName} ({notif.studentNo}) · </span>}
                                {notif.stajEtapLabel && <span>{notif.stajEtapLabel}</span>}
                              </div>
                              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{timeAgo}</div>
                            </div>
                            {!isRead && (
                              <button
                                onClick={() => handleMarkRead(notif.id)}
                                style={{
                                  flexShrink: 0, alignSelf: "center",
                                  padding: "4px 10px", borderRadius: 6,
                                  border: `1px solid ${STAJ.primary}30`,
                                  background: STAJ.primaryPale, color: STAJ.primary,
                                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Okundu
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Öğrenci Bildirim Zili */}
          {isStudent && (
            <div style={{ position: "relative" }}>
              {showStudentNotifs && (
                <div style={{ position: "fixed", inset: 0, zIndex: 9990 }}
                  onClick={() => setShowStudentNotifs(false)} />
              )}
              <button
                onClick={() => setShowStudentNotifs(v => !v)}
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  border: `1.5px solid ${studentUnread > 0 ? STAJ.primary : "#E5E7EB"}`,
                  background: studentUnread > 0 ? STAJ.primaryPale : "white",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative", transition: "all 0.2s",
                }}
                title="Bildirimler"
              >
                <StajIcon
                  path="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  size={18}
                  color={studentUnread > 0 ? STAJ.primary : STAJ.textMuted}
                />
                {studentUnread > 0 && (
                  <span style={{
                    position: "absolute", top: -5, right: -5,
                    minWidth: 18, height: 18, borderRadius: 9,
                    background: "#EF4444", color: "white",
                    fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 4px", border: "2px solid white",
                  }}>
                    {studentUnread > 9 ? "9+" : studentUnread}
                  </span>
                )}
              </button>

              {showStudentNotifs && (
                <div style={{
                  position: "absolute", top: 48, right: 0, zIndex: 9999,
                  width: 340, background: "white", borderRadius: 14,
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)", overflow: "hidden",
                }} onClick={e => e.stopPropagation()}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 16px", borderBottom: "1px solid #F3F4F6", background: "#FAFAFA",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: STAJ.navy }}>Bildirimler</span>
                      {studentUnread > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: STAJ.primaryPale, color: STAJ.primary }}>
                          {studentUnread} yeni
                        </span>
                      )}
                    </div>
                    {studentUnread > 0 && (
                      <button onClick={handleStudentMarkAllRead}
                        style={{ fontSize: 12, color: STAJ.primary, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                        Tümünü okundu
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    {studentNotifs.length === 0 ? (
                      <div style={{ padding: "32px 16px", textAlign: "center" }}>
                        <StajIcon path="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" size={32} color="#D1D5DB" />
                        <p style={{ fontSize: 13, color: STAJ.textMuted, marginTop: 10 }}>Henüz bildirim yok</p>
                      </div>
                    ) : (
                      studentNotifs.map(notif => {
                        const isRead = notif.readBy?.includes(studentId);
                        const isApproved = notif.type === "step_approved";
                        const isRejected = notif.type === "step_rejected";
                        const iconColor = isApproved ? STAJ.green : isRejected ? "#EF4444" : STAJ.primary;
                        const bgUnread = isApproved ? "#F0FDF4" : isRejected ? "#FEF2F2" : "#F0F9FF";
                        const iconPath = isApproved
                          ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          : isRejected
                            ? "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                            : "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z";
                        const timeAgo = (() => {
                          const diff = Date.now() - new Date(notif.createdAt).getTime();
                          const m = Math.floor(diff / 60000);
                          if (m < 1) return "Az önce";
                          if (m < 60) return `${m} dk önce`;
                          const h = Math.floor(m / 60);
                          if (h < 24) return `${h} sa önce`;
                          return `${Math.floor(h / 24)} gün önce`;
                        })();
                        return (
                          <div key={notif.id} style={{
                            display: "flex", gap: 12, padding: "12px 16px",
                            borderBottom: "1px solid #F9FAFB",
                            background: isRead ? "white" : bgUnread,
                          }}>
                            <div style={{ flexShrink: 0, paddingTop: 2 }}>
                              <StajIcon path={iconPath} size={16} color={iconColor} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: isRead ? 400 : 600, color: STAJ.navy, lineHeight: 1.4 }}>
                                {isApproved
                                  ? <><b>{notif.stepTitle}</b> adımınız <span style={{ color: STAJ.green }}>{notif.approvedBy}</span> tarafından onaylanmıştır</>
                                  : isRejected
                                    ? <><b>{notif.stepTitle}</b> adımınız <span style={{ color: "#EF4444" }}>{notif.rejectedBy}</span> tarafından reddedilmiştir</>
                                    : <><span style={{ color: iconColor }}>Bildirim</span>{" — "}{notif.stepTitle}</>
                                }
                              </div>
                              <div style={{ fontSize: 11, color: STAJ.textMuted, marginTop: 2 }}>
                                {notif.stajEtapLabel || ""}
                              </div>
                              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{timeAgo}</div>
                            </div>
                            {!isRead && (
                              <button onClick={() => handleStudentMarkRead(notif.id)}
                                style={{
                                  flexShrink: 0, alignSelf: "center",
                                  padding: "4px 10px", borderRadius: 6,
                                  border: `1px solid ${iconColor}30`,
                                  background: bgUnread, color: iconColor,
                                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}>
                                Okundu
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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
      </div>

      {/* ════ Staj Başvurusu Sekmesi (Öğrenci) ════ */}
      {activeTab === "basvuru" && (
        <StajBasvuruFormu currentUser={currentUser} activeDepartment={activeDepartment} departmentInfo={departmentInfo} stajPeriods={stajPeriods} />
      )}

      {/* ════ Staj Etapları Sekmesi (Admin/Komisyon) ════ */}
      {activeTab === "etaplar" && canManage && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: STAJ.navy, margin: 0 }}>Staj Etapları</h3>
              <p style={{ fontSize: 12, color: STAJ.textMuted, margin: "4px 0 0" }}>Öğrenciler yalnızca tanımlanan etaplardan birini seçerek staj başvurusu yapabilir.</p>
            </div>
            <button onClick={() => { setPeriodForm({ label: "", baslangic: "", bitis: "", aciklama: "" }); setEditingPeriod(null); setShowPeriodForm(true); }} style={{
              padding: "10px 20px", borderRadius: 8, border: "none",
              background: STAJ.primary, color: "white", fontSize: 13, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            }}>
              <StajIcon path="M12 5v14M5 12h14" size={16} />
              Yeni Etap Tanımla
            </button>
          </div>

          {/* Etap Formu */}
          {showPeriodForm && (
            <div style={{
              background: "white", borderRadius: 12, padding: responsive.val(16, 20, 24),
              border: "1px solid #E5E7EB", marginBottom: 20,
            }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: STAJ.navy, marginBottom: 14 }}>
                {editingPeriod ? "Etabı Düzenle" : "Yeni Staj Etabı"}
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: responsive.val("1fr", "1fr 1fr", "1fr 1fr 1fr"), gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 5 }}>Etap Adı *</label>
                  <input value={periodForm.label} onChange={e => setPeriodForm(p => ({ ...p, label: e.target.value }))}
                    placeholder="Örn: 2025 Yaz Dönemi Staj I" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 5 }}>Başlangıç Tarihi *</label>
                  <input type="date" value={periodForm.baslangic} onChange={e => setPeriodForm(p => ({ ...p, baslangic: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 5 }}>Bitiş Tarihi *</label>
                  <input type="date" value={periodForm.bitis} onChange={e => setPeriodForm(p => ({ ...p, bitis: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: STAJ.textMuted, marginBottom: 5 }}>Açıklama</label>
                  <input value={periodForm.aciklama} onChange={e => setPeriodForm(p => ({ ...p, aciklama: e.target.value }))}
                    placeholder="Opsiyonel açıklama" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                {periodForm.baslangic && (
                  <div style={{ gridColumn: "1 / -1", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#065F46", marginBottom: 6 }}>Otomatik Hesaplanan Süreler</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: "#F0FDF4", color: "#065F46", fontWeight: 600 }}>
                        🟢 Süreç açılışı: {addDays(periodForm.baslangic, -30)}
                      </span>
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: "#DBEAFE", color: "#1D4ED8", fontWeight: 600 }}>
                        📅 Kayıt &amp; Komisyon son tarihi: {addDays(periodForm.baslangic, -10)}
                      </span>
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: "#FEF3C7", color: "#92400E", fontWeight: 600 }}>
                        ⏱ SGK (Ergün ÇINAR): {addDays(periodForm.baslangic, -10)} → {periodForm.baslangic}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button onClick={() => { setShowPeriodForm(false); setEditingPeriod(null); }} style={{
                  padding: "9px 18px", borderRadius: 8, border: "1px solid #D1D5DB", background: "white", color: STAJ.textMuted, fontSize: 13, cursor: "pointer",
                }}>İptal</button>
                <button onClick={handleSavePeriod} style={{
                  padding: "9px 18px", borderRadius: 8, border: "none", background: STAJ.primary, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>Kaydet</button>
              </div>
            </div>
          )}

          {/* Etap Listesi */}
          {stajPeriods.length === 0 ? (
            <div style={{ background: "white", borderRadius: 12, padding: 40, border: "1px solid #E5E7EB", textAlign: "center" }}>
              <StajIcon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" size={48} color="#D1D5DB" />
              <p style={{ color: STAJ.textMuted, fontSize: 14, marginTop: 16 }}>Henüz staj etabı tanımlanmamış. Öğrencilerin başvuru yapabilmesi için en az bir etap tanımlayın.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stajPeriods.map(period => {
                const now = new Date().toISOString().split("T")[0];
                const isActive = period.baslangic <= now && period.bitis >= now;
                const isPast = period.bitis < now;
                return (
                  <div key={period.id} style={{
                    background: "white", borderRadius: 10, padding: 16,
                    border: `1px solid ${isActive ? STAJ.primary + "40" : "#E5E7EB"}`,
                    display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: STAJ.navy }}>{period.label}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                          background: isActive ? STAJ.greenLight : isPast ? "#F3F4F6" : "#DBEAFE",
                          color: isActive ? STAJ.green : isPast ? STAJ.textMuted : "#3B82F6",
                        }}>{isActive ? "Aktif" : isPast ? "Geçmiş" : "Yaklaşan"}</span>
                      </div>
                      <div style={{ fontSize: 12, color: STAJ.textMuted, marginTop: 4 }}>
                        {period.baslangic} — {period.bitis}
                        {period.aciklama && <span> | {period.aciklama}</span>}
                      </div>
                      {(() => {
                        const acilis = getSurecAcilis(period);
                        const onayBitis = getKayitDeadline(period);  // = staj başlangıcı - 10 gün
                        const sgkBitis = period.baslangic;            // = staj başlangıcı
                        const badge = deadlineBadge(onayBitis);
                        if (!onayBitis) return null;
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "#F0FDF4", color: "#065F46" }}>
                              🟢 Süreç açılışı: {acilis}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "#DBEAFE", color: "#1D4ED8" }}>
                              📅 Kayıt &amp; Komisyon son: {onayBitis}
                              {badge && <span style={{ marginLeft: 5, color: badge.color }}>({badge.label})</span>}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 10, background: "#FEF3C7", color: "#92400E" }}>
                              ⏱ SGK (Ergün ÇINAR): {onayBitis} → {sgkBitis}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setPeriodForm({ label: period.label, baslangic: period.baslangic, bitis: period.bitis, aciklama: period.aciklama || "" }); setEditingPeriod(period.id); setShowPeriodForm(true); }} style={{
                        padding: "6px 12px", borderRadius: 6, border: "1px solid #D1D5DB", background: "white", color: STAJ.primary, fontSize: 12, cursor: "pointer",
                      }}>Düzenle</button>
                      <button onClick={() => handleDeletePeriod(period.id)} style={{
                        padding: "6px 12px", borderRadius: 6, border: "1px solid #FCA5A5", background: "#FEF2F2", color: STAJ.red, fontSize: 12, cursor: "pointer",
                      }}>Sil</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════ Yol Haritası Sekmesi ════ */}
      {activeTab === "roadmap" && <StajRoadmap onTabChange={setActiveTab} currentUser={currentUser} activeDepartment={activeDepartment} />}

      {/* ════ Staj Kayıtları Sekmesi ════ */}
      {activeTab === "kayitlar" && (
        <>
          {/* ── Öğrenci Belge Yükleme Görünümü ── */}
          {isStudent && (
            <StajBelgeYukleme currentUser={currentUser} activeDepartment={activeDepartment} />
          )}

          {/* ── Admin/Yönetici Görünümü ── */}
          {canManage && (
            <>
              {/* Detay Modalı */}
              {selectedApp && (
                <div style={{
                  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                  background: "rgba(0,0,0,0.5)", zIndex: 9999,
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
                }} onClick={() => setSelectedApp(null)}>
                  <div style={{
                    background: "white", borderRadius: 16, width: "100%", maxWidth: 800,
                    maxHeight: "90vh", overflow: "auto", padding: responsive.val(16, 24, 28),
                  }} onClick={e => e.stopPropagation()}>
                    {/* Modal Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                      <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: STAJ.navy, margin: 0 }}>
                          {selectedApp.adSoyad} - Staj Başvurusu
                        </h3>
                        <p style={{ fontSize: 13, color: STAJ.textMuted, margin: "4px 0 0" }}>
                          {selectedApp.ogrenciNo} | {selectedApp.createdAt ? new Date(selectedApp.createdAt).toLocaleDateString("tr-TR") : ""}
                        </p>
                      </div>
                      <button onClick={() => setSelectedApp(null)} style={{
                        background: "none", border: "none", cursor: "pointer", padding: 4,
                      }}>
                        <StajIcon path="M6 18L18 6M6 6l12 12" size={20} color="#6B7280" />
                      </button>
                    </div>

                    {/* Durum & Onay - Progress Bar */}
                    {(() => {
                      const STATUS_STEPS = [
                        { key: "beklemede", label: "Başvuru Alındı", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                        { key: "devam", label: "Onaylandı / Devam Ediyor", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
                        { key: "tamamlandi", label: "Tamamlandı", icon: "M5 13l4 4L19 7" },
                      ];
                      const statusOrder = ["beklemede", "devam", "tamamlandi"];
                      const currentIdx = statusOrder.indexOf(selectedApp.status);
                      const isRejected = selectedApp.status === "reddedildi";

                      return (
                        <div style={{
                          background: "#F9FAFB", borderRadius: 12, padding: 20, marginBottom: 20,
                          border: "1px solid #E5E7EB",
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: STAJ.navy, marginBottom: 16 }}>Başvuru Durumu</div>

                          {/* Progress Bar */}
                          {isRejected ? (
                            <div style={{
                              padding: "12px 16px", borderRadius: 8, background: STAJ.redLight,
                              border: "1px solid #FCA5A5", display: "flex", alignItems: "center", gap: 10,
                            }}>
                              <StajIcon path="M6 18L18 6M6 6l12 12" size={18} color={STAJ.red} />
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: STAJ.red }}>Başvuru Reddedildi</div>
                                {selectedApp.statusUpdatedBy && (
                                  <div style={{ fontSize: 11, color: "#DC2626AA", marginTop: 2 }}>
                                    {selectedApp.statusUpdatedBy} — {selectedApp.statusUpdatedAt ? new Date(selectedApp.statusUpdatedAt).toLocaleString("tr-TR") : ""}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              {/* Step indicators */}
                              <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                                {STATUS_STEPS.map((step, i) => {
                                  const isDone = currentIdx >= i;
                                  const isCurrent = currentIdx === i;
                                  return React.createElement(React.Fragment, { key: step.key },
                                    i > 0 && React.createElement("div", {
                                      style: {
                                        flex: 1, height: 4, borderRadius: 2,
                                        background: currentIdx >= i ? STAJ.primary : "#E5E7EB",
                                        transition: "background 0.3s",
                                      }
                                    }),
                                    React.createElement("div", {
                                      style: {
                                        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                                        background: isDone ? STAJ.primary : "white",
                                        border: `2px solid ${isDone ? STAJ.primary : "#D1D5DB"}`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        transition: "all 0.3s",
                                        boxShadow: isCurrent ? `0 0 0 4px ${STAJ.primary}20` : "none",
                                      }
                                    },
                                      React.createElement(StajIcon, {
                                        path: step.icon, size: 16,
                                        color: isDone ? "white" : "#D1D5DB",
                                      })
                                    )
                                  );
                                })}
                              </div>

                              {/* Step labels */}
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                {STATUS_STEPS.map((step, i) => (
                                  <div key={step.key} style={{
                                    textAlign: i === 0 ? "left" : i === STATUS_STEPS.length - 1 ? "right" : "center",
                                    flex: 1, fontSize: 11, fontWeight: currentIdx === i ? 700 : 500,
                                    color: currentIdx >= i ? STAJ.primary : STAJ.textMuted,
                                  }}>
                                    {step.label}
                                  </div>
                                ))}
                              </div>

                              {selectedApp.statusUpdatedBy && (
                                <p style={{ fontSize: 11, color: STAJ.textMuted, margin: "10px 0 0", textAlign: "center" }}>
                                  Son güncelleme: {selectedApp.statusUpdatedBy} — {selectedApp.statusUpdatedAt ? new Date(selectedApp.statusUpdatedAt).toLocaleString("tr-TR") : ""}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Onay / Reddet Butonları */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, paddingTop: 14, borderTop: "1px solid #E5E7EB" }}>
                            {selectedApp.status === "beklemede" && (
                              <>
                                <button onClick={() => handleStatusChange(selectedApp.id, "devam")} style={{
                                  flex: 1, padding: "10px 20px", borderRadius: 8, border: "none",
                                  background: STAJ.green, color: "white", fontSize: 13, fontWeight: 600,
                                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                }}>
                                  <StajIcon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={16} />
                                  Onayla
                                </button>
                                <button onClick={() => handleStatusChange(selectedApp.id, "reddedildi")} style={{
                                  padding: "10px 20px", borderRadius: 8, border: "1px solid #FCA5A5",
                                  background: "#FEF2F2", color: STAJ.red, fontSize: 13, fontWeight: 600,
                                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                }}>
                                  <StajIcon path="M6 18L18 6M6 6l12 12" size={16} />
                                  Reddet
                                </button>
                              </>
                            )}
                            {selectedApp.status === "devam" && (() => {
                              const appRoadmap = allRoadmaps[selectedApp.id] || {};
                              const appSteps = appRoadmap.steps || {};
                              const allStepsCompleted = STAJ_ROADMAP_STEPS.every((_, idx) => appSteps[idx]?.status === "completed");
                              return allStepsCompleted ? (
                                <button onClick={() => handleStatusChange(selectedApp.id, "tamamlandi")} style={{
                                  flex: 1, padding: "10px 20px", borderRadius: 8, border: "none",
                                  background: STAJ.green, color: "white", fontSize: 13, fontWeight: 600,
                                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                }}>
                                  <StajIcon path="M5 13l4 4L19 7" size={16} />
                                  Stajı Tamamla
                                </button>
                              ) : (
                                <div style={{ padding: "10px 16px", borderRadius: 8, background: "#DBEAFE", color: "#1E40AF", fontSize: 13, fontWeight: 500, flex: 1, textAlign: "center" }}>
                                  Staj devam ediyor — Yol haritasında tüm adımlar tamamlanmalıdır ({Object.values(appSteps).filter(s => s.status === "completed").length}/{STAJ_ROADMAP_STEPS.length})
                                </div>
                              );
                            })()}
                            {selectedApp.status === "tamamlandi" && (
                              <div style={{ padding: "10px 16px", borderRadius: 8, background: STAJ.greenLight, color: STAJ.green, fontSize: 13, fontWeight: 600, flex: 1, textAlign: "center" }}>
                                Staj başarıyla tamamlanmıştır.
                              </div>
                            )}
                            {selectedApp.status === "reddedildi" && (
                              <button onClick={() => handleStatusChange(selectedApp.id, "beklemede")} style={{
                                flex: 1, padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D5DB",
                                background: "white", color: STAJ.navy, fontSize: 13, fontWeight: 600,
                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                              }}>
                                Yeniden Değerlendir
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Başvuru Detayları */}
                    {(() => {
                      const sections = [
                        { title: "Öğrenci Kimlik Bilgileri", fields: [
                          ["Adı ve Soyadı", selectedApp.adSoyad], ["Öğrenci No", selectedApp.ogrenciNo],
                          ["Bölüm/Program", selectedApp.bolumProgrami], ["E-posta", selectedApp.eposta],
                          ["Telefon", selectedApp.telefonNo], ["Eğitim Dönemi", selectedApp.egitimDonemi],
                          ["İkametgah Adresi", selectedApp.ikametgahAdresi],
                        ]},
                        { title: "Staj Yapılacak Yer", fields: [
                          ["Adı/Unvanı", selectedApp.stajYeriAdi], ["Adresi", selectedApp.stajYeriAdresi],
                          ["Telefon", selectedApp.stajYeriTelefon], ["Faks", selectedApp.stajYeriFaks],
                          ["E-posta", selectedApp.stajYeriEposta],
                        ]},
                        { title: "İşveren/Yetkili", fields: [
                          ["Adı ve Soyadı", selectedApp.isverenAdSoyad], ["Görev/Ünvan", selectedApp.isverenGorevUnvan],
                          ["E-posta", selectedApp.isverenEposta], ["Tarih", selectedApp.isverenTarih],
                        ]},
                        { title: "Staj Etabı / Bilgileri", fields: [
                          ["Staj Etabı", selectedApp.stajEtapLabel || "—"],
                          ["Başlama Tarihi", selectedApp.stajBaslamaTarihi], ["Bitiş Tarihi", selectedApp.stajBitisTarihi],
                          ["Süre (Gün)", selectedApp.stajSuresiGun],
                        ]},
                        { title: "Nüfus Kayıt Bilgileri", fields: [
                          ["Soyadı", selectedApp.nufusSoyad], ["Adı", selectedApp.nufusAd],
                          ["Baba Adı", selectedApp.babaAdi], ["Ana Adı", selectedApp.anaAdi],
                          ["Doğum Yeri", selectedApp.dogumYeri], ["Doğum Tarihi", selectedApp.dogumTarihi],
                          ["T.C. Kimlik No", selectedApp.tcKimlikNo], ["N.Cüzdan Seri No", selectedApp.nufusCuzdanSeriNo],
                          ["SSK No", selectedApp.sskNo], ["Nüfusa Kay. İl", selectedApp.nufusIl],
                          ["İlçe", selectedApp.nufusIlce], ["Mahalle-Köy", selectedApp.nufusMahalleKoy],
                          ["Cilt No", selectedApp.ciltNo], ["Aile Sıra No", selectedApp.aileSiraNo],
                          ["Sıra No", selectedApp.siraNo], ["Nüfus Dairesi", selectedApp.nufusDairesi],
                          ["Veriliş Nedeni", selectedApp.verilisNedeni], ["Veriliş Tarihi", selectedApp.verilisTarihi],
                        ]},
                        { title: "Sağlık Güvencesi", fields: [
                          ["Sağlık Güvencesi", selectedApp.saglikGuvencesi === "kendisi" ? "Kendisi" : selectedApp.saglikGuvencesi === "annesi_babasi" ? "Annesi/Babası" : selectedApp.saglikGuvencesi === "yesil_kart" ? "Yeşil Kart" : selectedApp.saglikGuvencesi === "universite" ? "Çankırı Karatekin Üniversitesi" : (selectedApp.saglikGuvencesi || "—")],
                        ]},
                      ];
                      return sections.map((sec, si) => (
                        <div key={si} style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: STAJ.navy, marginBottom: 8, paddingBottom: 4, borderBottom: `2px solid ${STAJ.primary}20` }}>{sec.title}</div>
                          <div style={{ display: "grid", gridTemplateColumns: responsive.val("1fr", "1fr 1fr", "1fr 1fr 1fr"), gap: "6px 16px" }}>
                            {sec.fields.map(([label, value], fi) => (
                              <div key={fi} style={{ fontSize: 12, padding: "4px 0" }}>
                                <span style={{ color: STAJ.textMuted, fontWeight: 500 }}>{label}: </span>
                                <span style={{ color: STAJ.text, fontWeight: 600 }}>{value || "—"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}

                    {/* Yüklenen Belgeler */}
                    {(() => {
                      const studentUploads = allUploads[selectedApp.ogrenciNo] || {};
                      const BELGE_LABELS = {
                        zorunlu_staj_formu: "Zorunlu Staj Formu",
                        staj_basvuru_formu_ek1: "Staj Başvuru Formu (Ek-1)",
                        kimlik_fotokopisi: "Kimlik Fotokopisi",
                        staj_defteri: "Staj Defteri",
                        ek2_belgesi: "Ek-2 Belgesi",
                        staj_teslim_belgesi: "Staj Teslim Belgesi",
                        turnitin_raporu: "Turnitin Raporu",
                      };
                      const uploadEntries = Object.entries(BELGE_LABELS);
                      const hasAnyUpload = uploadEntries.some(([key]) => studentUploads[key]);

                      return (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: STAJ.navy, marginBottom: 8, paddingBottom: 4, borderBottom: `2px solid ${STAJ.primary}20` }}>Yüklenen Belgeler</div>
                          {!hasAnyUpload ? (
                            <p style={{ fontSize: 12, color: STAJ.textMuted, fontStyle: "italic" }}>Henüz belge yüklenmemiş.</p>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {uploadEntries.map(([key, label]) => {
                                const upload = studentUploads[key];
                                if (!upload || !upload.fileName) return null;
                                const hasChangeReq = upload.changeRequest?.status === "pending";
                                return (
                                  <div key={key} style={{
                                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                                    borderRadius: 8,
                                    background: hasChangeReq ? "#FEF9C3" : STAJ.greenLight,
                                    border: `1px solid ${hasChangeReq ? "#FCD34D" : "#A7F3D0"}`,
                                    flexWrap: "wrap",
                                  }}>
                                    <StajIcon path={hasChangeReq ? "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" : "M5 13l4 4L19 7"} size={14} color={hasChangeReq ? "#EAB308" : STAJ.green} />
                                    <div style={{ flex: 1, minWidth: 150 }}>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: STAJ.navy }}>{label}</div>
                                      <div style={{ fontSize: 11, color: STAJ.textMuted }}>
                                        {upload.fileName} ({(upload.fileSize / 1024).toFixed(0)} KB) — {new Date(upload.uploadedAt).toLocaleDateString("tr-TR")}
                                      </div>
                                      {hasChangeReq && (
                                        <div style={{ fontSize: 11, color: "#92400E", fontWeight: 600, marginTop: 2 }}>
                                          Belge değişiklik talebi mevcut
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                      {getFileUrl(selectedApp.ogrenciNo, key) ? (
                                        <>
                                          <button onClick={() => handlePreviewFile(selectedApp.ogrenciNo, key)} style={{
                                            padding: "6px 12px", borderRadius: 6, border: "1px solid #93C5FD",
                                            background: "#EFF6FF", color: "#2563EB", fontSize: 11, fontWeight: 600,
                                            cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                                          }}>
                                            <StajIcon path="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" size={13} />
                                            Görüntüle
                                          </button>
                                          <button onClick={() => handleDownloadFile(selectedApp.ogrenciNo, key)} style={{
                                            padding: "6px 12px", borderRadius: 6, border: "1px solid #D1D5DB",
                                            background: "white", color: STAJ.primary, fontSize: 11, fontWeight: 600,
                                            cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                                          }}>
                                            <StajIcon path="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" size={13} />
                                            İndir
                                          </button>
                                        </>
                                      ) : (
                                        <span style={{ fontSize: 10, color: "#EF4444", fontWeight: 500 }}>
                                          Dosya sunucuda mevcut degil - tekrar yuklemesi gerekiyor
                                        </span>
                                      )}
                                      {hasChangeReq && (
                                        <>
                                          <button onClick={() => handleApproveDocChange(selectedApp.ogrenciNo, key)} style={{
                                            padding: "6px 12px", borderRadius: 6, border: "none",
                                            background: STAJ.green, color: "white", fontSize: 11, fontWeight: 600,
                                            cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                                          }}>
                                            <StajIcon path="M5 13l4 4L19 7" size={12} />
                                            Değişikliğe İzin Ver
                                          </button>
                                          <button onClick={() => handleRejectDocChange(selectedApp.ogrenciNo, key)} style={{
                                            padding: "6px 12px", borderRadius: 6, border: "1px solid #FCA5A5",
                                            background: "#FEF2F2", color: STAJ.red, fontSize: 11, fontWeight: 600,
                                            cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                                          }}>
                                            <StajIcon path="M6 18L18 6M6 6l12 12" size={12} />
                                            Reddet
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Yol Haritası Adım Onayları — Dikey Timeline */}
                    {(() => {
                      const appRoadmap = allRoadmaps[selectedApp.id] || {};
                      const appSteps = appRoadmap.steps || {};
                      const totalSteps = STAJ_ROADMAP_STEPS.length;
                      const completedCount = STAJ_ROADMAP_STEPS.reduce((n, _, i) => n + (appSteps[i]?.status === "completed" ? 1 : 0), 0);
                      const pendingCount = STAJ_ROADMAP_STEPS.reduce((n, _, i) => n + (appSteps[i]?.status === "pending_approval" ? 1 : 0), 0);
                      const rejectedCount = STAJ_ROADMAP_STEPS.reduce((n, _, i) => n + (appSteps[i]?.status === "rejected" ? 1 : 0), 0);
                      const progressPct = Math.round((completedCount / totalSteps) * 100);

                      return (
                        <div style={{ marginBottom: 16 }}>
                          {/* Header + özet rozetleri */}
                          <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            gap: 10, flexWrap: "wrap",
                            marginBottom: 10, paddingBottom: 8,
                            borderBottom: `2px solid ${STAJ.primary}20`,
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: `linear-gradient(135deg, ${STAJ.primary} 0%, #3B82F6 100%)`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <StajIcon path="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" size={15} color="white" />
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: STAJ.navy }}>Staj Süreci</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: STAJ.greenLight, color: STAJ.green, border: "1px solid #A7F3D0" }}>
                                ✓ {completedCount} Tamamlandı
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#DBEAFE", color: "#1E40AF", border: "1px solid #93C5FD" }}>
                                ⏱ {pendingCount} Onay Bekliyor
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: STAJ.redLight, color: STAJ.red, border: "1px solid #FCA5A5" }}>
                                ✕ {rejectedCount} Reddedildi
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: STAJ.primaryPale, color: STAJ.primary, border: `1px solid ${STAJ.primary}40` }}>
                                {completedCount}/{totalSteps} • %{progressPct}
                              </span>
                            </div>
                          </div>

                          {/* Gradient ilerleme çubuğu */}
                          <div style={{
                            height: 8, borderRadius: 999,
                            background: "#F3F4F6", overflow: "hidden",
                            marginBottom: 16, border: "1px solid #E5E7EB",
                          }}>
                            <div style={{
                              width: `${progressPct}%`, height: "100%",
                              background: `linear-gradient(90deg, ${STAJ.green} 0%, ${STAJ.primary} 50%, #3B82F6 100%)`,
                              transition: "width 0.4s ease",
                            }} />
                          </div>

                          {/* Dikey Timeline */}
                          <div style={{ position: "relative", paddingLeft: 8 }}>
                            {STAJ_ROADMAP_STEPS.map((step, idx) => {
                              const stepData = appSteps[idx] || {};
                              const isPending = stepData.status === "pending_approval";
                              const isCompleted = stepData.status === "completed";
                              const isRejected = stepData.status === "rejected";
                              const isActive = isPending || isCompleted || isRejected;
                              const isLast = idx === STAJ_ROADMAP_STEPS.length - 1;

                              const circleBg = isCompleted ? STAJ.green
                                : isPending ? "#3B82F6"
                                : isRejected ? STAJ.red
                                : "#E5E7EB";
                              const circleColor = isActive ? "white" : "#9CA3AF";
                              const circleContent = isCompleted ? "✓" : isRejected ? "✕" : String(step.id);

                              const cardBg = isCompleted ? STAJ.greenLight
                                : isPending ? "#EFF6FF"
                                : isRejected ? STAJ.redLight
                                : "#F9FAFB";
                              const cardBorder = isCompleted ? "#A7F3D0"
                                : isPending ? "#93C5FD"
                                : isRejected ? "#FCA5A5"
                                : "#E5E7EB";

                              const statusBadge = isCompleted ? { label: "Onaylandı", bg: STAJ.green, color: "white" }
                                : isPending ? { label: "Onay Bekliyor", bg: "#3B82F6", color: "white" }
                                : isRejected ? { label: "Reddedildi", bg: STAJ.red, color: "white" }
                                : { label: "Başlamadı", bg: "#E5E7EB", color: "#6B7280" };

                              return (
                                <div key={idx} style={{ position: "relative", display: "flex", gap: 14, paddingBottom: isLast ? 0 : 16 }}>
                                  {/* Bağlantı çizgisi */}
                                  {!isLast && (
                                    <div style={{
                                      position: "absolute",
                                      left: 17, top: 36, bottom: 0, width: 2,
                                      background: isCompleted ? STAJ.green : "#E5E7EB",
                                      opacity: isActive ? 1 : 0.6,
                                    }} />
                                  )}

                                  {/* Daire */}
                                  <div style={{
                                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                                    background: circleBg, color: circleColor,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 14, fontWeight: 700,
                                    border: `3px solid ${isActive ? "white" : "#F3F4F6"}`,
                                    boxShadow: isActive ? `0 0 0 2px ${circleBg}` : "none",
                                    zIndex: 1,
                                  }}>
                                    {circleContent}
                                  </div>

                                  {/* Kart */}
                                  <div style={{
                                    flex: 1, minWidth: 0,
                                    background: cardBg, border: `1px solid ${cardBorder}`,
                                    borderRadius: 10, padding: "10px 14px",
                                    opacity: isActive ? 1 : 0.75,
                                  }}>
                                    {/* Üst satır: başlık + durum rozeti + süre */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                                      <span style={{ fontSize: 13, fontWeight: 700, color: STAJ.navy }}>
                                        Adım {step.id} — {step.title}
                                      </span>
                                      <span style={{
                                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                                        background: statusBadge.bg, color: statusBadge.color,
                                      }}>
                                        {statusBadge.label}
                                      </span>
                                      {step.duration && (
                                        <span style={{
                                          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                                          background: "white", color: STAJ.textMuted, border: "1px solid #E5E7EB",
                                          display: "inline-flex", alignItems: "center", gap: 4,
                                        }}>
                                          ⏱ {step.duration}
                                        </span>
                                      )}
                                    </div>

                                    {/* Açıklama */}
                                    {step.desc && (
                                      <p style={{ fontSize: 11, color: STAJ.textMuted, margin: "0 0 6px", lineHeight: 1.5 }}>
                                        {step.desc}
                                      </p>
                                    )}

                                    {/* Meta bilgi */}
                                    {(isCompleted || isPending || isRejected) && (
                                      <div style={{ fontSize: 11, color: STAJ.text, marginTop: 4 }}>
                                        {isCompleted && stepData.approvedBy && (
                                          <span>Onaylayan: <strong>{stepData.approvedBy}</strong>{stepData.approvedAt ? ` — ${new Date(stepData.approvedAt).toLocaleString("tr-TR")}` : ""}</span>
                                        )}
                                        {isPending && (
                                          <span>Öğrenci tamamladı{stepData.completedAt ? ` — ${new Date(stepData.completedAt).toLocaleString("tr-TR")}` : ""}</span>
                                        )}
                                      </div>
                                    )}

                                    {/* Red sebebi ayrı alan */}
                                    {isRejected && (
                                      <div style={{
                                        marginTop: 6, padding: "8px 10px", borderRadius: 6,
                                        background: "#FEF2F2", border: "1px solid #FCA5A5",
                                        fontSize: 11, color: STAJ.red,
                                      }}>
                                        <div style={{ fontWeight: 700, marginBottom: 2 }}>✕ Reddedildi</div>
                                        <div style={{ color: "#991B1B" }}>
                                          Reddeden: <strong>{stepData.rejectedBy || "—"}</strong>
                                          {stepData.rejectedAt && <> — {new Date(stepData.rejectedAt).toLocaleString("tr-TR")}</>}
                                        </div>
                                      </div>
                                    )}

                                    {/* Deadline rozetleri */}
                                    {isPending && idx < 4 && (() => {
                                      const od = getOnayDeadline(selectedApp);
                                      const badge = deadlineBadge(od);
                                      if (!badge) return null;
                                      return (
                                        <div style={{ marginTop: 6 }}>
                                          <span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: badge.bg, color: badge.color }}>
                                            ⏱ Komisyon onayı: {badge.label} ({od})
                                          </span>
                                        </div>
                                      );
                                    })()}
                                    {isPending && idx === 4 && (() => {
                                      const appRoadmapLocal = allRoadmaps[selectedApp.id] || {};
                                      const sgkDl = getSgkDeadline(appRoadmapLocal, selectedApp);
                                      const badge = deadlineBadge(sgkDl);
                                      if (!badge) return null;
                                      return (
                                        <div style={{ marginTop: 6 }}>
                                          <span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: badge.bg, color: badge.color }}>
                                            ⏱ Ergün ÇINAR SGK: {badge.label} ({sgkDl})
                                          </span>
                                        </div>
                                      );
                                    })()}

                                    {/* Onayla / Reddet butonları */}
                                    {isPending && !(isErgunCinar && idx !== 4) && (
                                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                                        <button onClick={() => handleApproveStep(selectedApp.id, idx)} style={{
                                          padding: "6px 14px", borderRadius: 6, border: "none",
                                          background: STAJ.green, color: "white", fontSize: 11, fontWeight: 700,
                                          cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                                        }}>
                                          <StajIcon path="M5 13l4 4L19 7" size={12} color="white" />
                                          Onayla
                                        </button>
                                        <button onClick={() => handleRejectStep(selectedApp.id, idx)} style={{
                                          padding: "6px 14px", borderRadius: 6, border: "1px solid #FCA5A5",
                                          background: "white", color: STAJ.red, fontSize: 11, fontWeight: 700,
                                          cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                                        }}>
                                          <StajIcon path="M6 18L18 6M6 6l12 12" size={12} />
                                          Reddet
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Modal Footer */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid #E5E7EB" }}>
                      <button onClick={() => handleDeleteApp(selectedApp.id)} style={{
                        padding: "10px 18px", borderRadius: 8, border: "1px solid #FCA5A5",
                        background: "#FEF2F2", color: STAJ.red, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        <StajIcon path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" size={14} />
                        Sil
                      </button>
                      <button onClick={() => setSelectedApp(null)} style={{
                        padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D5DB",
                        background: "white", color: STAJ.textMuted, fontSize: 13, cursor: "pointer",
                      }}>Kapat</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Ergün ÇINAR: Veri Dışa Aktarma ── */}
              {isErgunCinar && (
                <div style={{
                  background: "linear-gradient(135deg, #ECFEFF 0%, #F0F9FF 100%)",
                  border: "1.5px solid #0891B220",
                  borderRadius: 14, padding: responsive.val(14, 18, 22),
                  marginBottom: 20,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: STAJ.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <StajIcon path="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" size={16} color="white" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: STAJ.navy }}>Veri Dışa Aktarma</div>
                      <div style={{ fontSize: 11, color: STAJ.textMuted }}>Etap bazlı staj kayıt verilerini XML veya XLSX olarak indirin</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: STAJ.textMuted, marginBottom: 4 }}>Etap Seçin</label>
                      <select
                        value={exportPeriodId}
                        onChange={e => setExportPeriodId(e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, outline: "none", background: "white" }}
                      >
                        <option value="all">Tüm Etaplar ({allApplications.length} öğrenci)</option>
                        {stajPeriods.map(p => {
                          const count = allApplications.filter(a => a.stajEtapId === p.id).length;
                          return <option key={p.id} value={p.id}>{p.label} ({count} öğrenci)</option>;
                        })}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: responsive.val(0, 16, 16) }}>
                      <button
                        onClick={handleExportXML}
                        style={{
                          padding: "9px 16px", borderRadius: 8, border: "1.5px solid #0891B2",
                          background: "white", color: STAJ.primary, fontSize: 13, fontWeight: 600,
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                        }}
                      >
                        <StajIcon path="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" size={15} />
                        XML İndir
                      </button>
                      <button
                        onClick={handleExportXLSX}
                        disabled={exporting}
                        style={{
                          padding: "9px 16px", borderRadius: 8, border: "none",
                          background: exporting ? "#9CA3AF" : STAJ.primary, color: "white",
                          fontSize: 13, fontWeight: 600,
                          cursor: exporting ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: 6,
                        }}
                      >
                        <StajIcon path="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={15} />
                        {exporting ? "Hazırlanıyor..." : "XLSX İndir"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div style={{
                display: "grid",
                gridTemplateColumns: responsive.val("1fr 1fr", "repeat(5, 1fr)", "repeat(5, 1fr)"),
                gap: responsive.val(8, 12, 16),
                marginBottom: 24,
              }}>
                {[
                  { label: "Toplam", value: stats.total, color: STAJ.primary, bg: STAJ.primaryPale },
                  { label: "Beklemede", value: stats.beklemede, color: "#EAB308", bg: "#FEF9C3" },
                  { label: "Devam Eden", value: stats.devam, color: "#3B82F6", bg: "#DBEAFE" },
                  { label: "Tamamlanan", value: stats.tamamlandi, color: "#059669", bg: "#D1FAE5" },
                  { label: "Reddedilen", value: stats.reddedildi, color: "#DC2626", bg: "#FEE2E2" },
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

              {/* Search & Filter */}
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16,
                alignItems: "center",
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Öğrenci adı, numara veya staj yeri ara..."
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

              {/* Başvuru Listesi */}
              {filteredApplications.length === 0 ? (
                <div style={{
                  background: "white", borderRadius: 12, padding: 40,
                  border: "1px solid #E5E7EB", textAlign: "center",
                }}>
                  <StajIcon path="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" size={48} color="#D1D5DB" />
                  <p style={{ color: STAJ.textMuted, fontSize: 14, marginTop: 16 }}>
                    {searchTerm || filterStatus !== "all"
                      ? "Arama kriterlerine uygun staj başvurusu bulunamadı."
                      : "Henüz öğrenci staj başvurusu bulunmuyor."}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredApplications.map(app => {
                    const status = STAJ_STATUS[app.status] || STAJ_STATUS.beklemede;
                    const studentUploads = allUploads[app.ogrenciNo] || {};
                    const VALID_DOC_KEYS = ["zorunlu_staj_formu", "staj_basvuru_formu_ek1", "kimlik_fotokopisi", "staj_defteri", "ek2_belgesi", "staj_teslim_belgesi", "turnitin_raporu"];
                    const uploadCount = Object.keys(studentUploads).filter(k => VALID_DOC_KEYS.includes(k) && studentUploads[k]?.fileName).length;
                    return (
                      <div key={app.id} onClick={() => setSelectedApp(app)} style={{
                        background: "white", borderRadius: 10, padding: responsive.val(12, 16, 16),
                        border: "1px solid #E5E7EB", cursor: "pointer",
                        display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12,
                        transition: "box-shadow 0.2s",
                      }} onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
                         onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: STAJ.text }}>{app.adSoyad}</div>
                          <div style={{ fontSize: 12, color: STAJ.textMuted }}>{app.ogrenciNo}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <div style={{ fontSize: 13, color: STAJ.text }}>{app.stajYeriAdi || "—"}</div>
                          <div style={{ fontSize: 11, color: STAJ.textMuted }}>
                            {app.stajBaslamaTarihi || "—"} — {app.stajBitisTarihi || "—"}
                          </div>
                          {(() => {
                            // Onay deadline (adım 1-3, sadece beklemede/devam olanlar için)
                            if (app.status === "beklemede" || app.status === "devam") {
                              const od = getOnayDeadline(app);
                              const badge = deadlineBadge(od);
                              if (badge) return (
                                <div style={{ marginTop: 3, display: "flex", gap: 4, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 6, background: badge.bg, color: badge.color, fontWeight: 600 }}>
                                    Komisyon: {badge.label}
                                  </span>
                                </div>
                              );
                            }
                            // SGK deadline (Ergün ÇINAR için)
                            if (isErgunCinar && (app.status === "devam")) {
                              const roadmap = allRoadmaps[app.id];
                              const sgkDl = getSgkDeadline(roadmap, app);
                              const badge = deadlineBadge(sgkDl);
                              if (badge) return (
                                <div style={{ marginTop: 3 }}>
                                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 6, background: badge.bg, color: badge.color, fontWeight: 600 }}>
                                    SGK: {badge.label}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {uploadCount > 0 && (
                            <span style={{
                              padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                              background: STAJ.primaryPale, color: STAJ.primary,
                            }}>
                              {uploadCount} belge
                            </span>
                          )}
                          <span style={{
                            padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                            color: status.color, background: status.bg,
                          }}>{status.label}</span>
                          <StajIcon path="M9 5l7 7-7 7" size={16} color="#9CA3AF" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

window.StajModuluApp = StajModuluApp;
