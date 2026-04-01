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
    desc: "Bölümünüze uygun firmaları ve kurumları araştırın. Kariyer merkezinden destek alabilir, önceki öğrencilerin staj yaptığı yerleri inceleyebilirsiniz.",
  },
  {
    id: 2,
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
    id: 3,
    title: "Belge Yükleme",
    duration: "1 Hafta",
    result: "Başvuru belgeleri sisteme yüklendi",
    desc: "Artık hazırsın! Sistem üzerinden başvuru belgelerini yükleyebilirsin. Staj Kayıtları sekmesine giderek başvuru belgelerini yükleyeceğin alana erişebilirsin.",
    links: [
      { label: "Staj Kayıtlarına Git", tab: "kayitlar" },
    ],
  },
  {
    id: 4,
    title: "Komisyon Onayı",
    duration: "1 Hafta",
    result: "Staj komisyonu onayı alındı",
    desc: "Komisyon staj yerinizin uygunluğunu değerlendirecektir. Onay sonucunu takip edin.",
  },
  {
    id: 5,
    title: "SGK İşlemleri",
    duration: "3-5 Gün",
    result: "SGK kaydı tamamlandı",
    desc: "Bu adımda Ergün ÇINAR'ın onayı ile bir sonraki adıma geçebilirsiniz. Ergün ÇINAR, Staj Kayıtları alanında kendisine tanımlanan alanda onay verecektir. Onay alındıktan sonra SGK giriş bildirgeniz üniversite tarafından yapılacaktır.",
    approver: "Ergün ÇINAR",
  },
  {
    id: 6,
    title: "Staj Dönemi",
    duration: "20 İş Günü",
    result: "Staj defteri günlük tutuldu",
    desc: "Formlar modülündeki Staj Defterini kullanarak staj sürecinizi kayıt altına alın. Her sayfası imza ya da kaşelenmiş şekilde hazırlanmalıdır. Devamsızlık yapmamaya özen gösterin.",
    links: [
      { label: "Staj Defteri", module: "formlar", highlight: "staj_defteri" },
    ],
  },
  {
    id: 7,
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
    id: 8,
    title: "Değerlendirme & Sonuç",
    duration: "2-4 Hafta",
    result: "Staj notu belirlendi",
    desc: "Sonuç değerlendirme aşaması. Staj defteriniz, belgeleriniz ve firma değerlendirme formunuz staj komisyonu tarafından incelenecektir. Onay sürecini buradan takip edebilirsiniz.",
  },
];

// ══════════════════════════════════════════════════════════════
// Staj Yol Haritası Bileşeni
// ══════════════════════════════════════════════════════════════
function StajRoadmap({ onTabChange }) {
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
    // Staj
    stajBaslamaTarihi: "Staj Başlama Tarihi",
    stajBitisTarihi: "Staj Bitiş Tarihi",
    stajSuresiGun: "Staj Süresi (Gün)",
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
  const NUMERIC_ONLY_FIELDS = ["ogrenciNo", "tcKimlikNo", "stajSuresiGun"];
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

    // Staj bitiş tarihi başlama tarihinden sonra olmalı
    if (form.stajBaslamaTarihi && form.stajBitisTarihi && form.stajBitisTarihi <= form.stajBaslamaTarihi) {
      setSavedMsg("Staj bitiş tarihi, başlama tarihinden sonra olmalıdır.");
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
        status: editingId ? form.status : "beklemede",
        updatedAt: new Date().toISOString(),
      };

      console.log("Staj başvurusu kaydediliyor:", { departmentId: data.departmentId, ogrenciNo: data.ogrenciNo, editingId });

      if (editingId) {
        await db.collection("internship_applications").doc(editingId).set(data, { merge: true });
      } else {
        data.createdAt = new Date().toISOString();
        const result = await db.collection("internship_applications").add(data);
        console.log("Başvuru kaydedildi, ID:", result?.id);
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

      {/* 4. STAJIN BİLGİLERİ */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>STAJIN BİLGİLERİ</div>
        <div style={gridStyle(3)}>
          <div><label style={labelStyle}>Başlama Tarihi {reqMark}</label><input type="date" value={form.stajBaslamaTarihi} onChange={e => set("stajBaslamaTarihi", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Bitiş Tarihi {reqMark}</label><input type="date" value={form.stajBitisTarihi} onChange={e => set("stajBitisTarihi", e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Süresi (Gün) {reqMark}</label><input value={form.stajSuresiGun} readOnly style={{ ...inputStyle, background: "#F3F4F6" }} /></div>
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

  const studentId = currentUser?.studentNumber || currentUser?.identifier || "";

  // Yüklenen belgeleri yükle
  useEffect(() => {
    const loadUploads = async () => {
      try {
        const db = window.apiFirestore;
        if (!db || !studentId) return;
        const doc = await db.collection("internship_uploads").doc(studentId).get();
        if (doc.exists) setUploads(doc.data() || {});
      } catch (e) {
        console.error("Belgeler yüklenirken hata:", e);
      }
    };
    loadUploads();
  }, [studentId]);

  const BELGE_ALANLARI = [
    {
      id: "basvuru_belgeleri",
      title: "Başvuru Belgeleri",
      desc: "Zorunlu staj formu, Staj başvuru formu (Ek-1), Kimlik fotokopisi",
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      step: 3,
    },
    {
      id: "staj_defteri",
      title: "Staj Defteri",
      desc: "Her sayfası imzalı veya kaşelenmiş staj defteri",
      icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
      step: 7,
    },
    {
      id: "ek2_belgesi",
      title: "Ek-2 Belgesi (İmzalı/Mühürlü)",
      desc: "İmzalı ve mühürlü Ek-2 belgesini yükleyin. Ek-2'ye Formlar modülünden erişebilirsiniz.",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      step: 7,
      formLink: true,
    },
    {
      id: "staj_teslim_belgesi",
      title: "Staj Teslim Belgesi",
      desc: "Staj teslim belgesini yükleyin. Formlar modülünden erişebilirsiniz.",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
      step: 7,
      formLink: true,
    },
    {
      id: "turnitin_raporu",
      title: "Turnitin Benzerlik Raporu",
      desc: "Sadece Turnitin benzerlik raporunu yükleyin. Staj defterini bu alana tekrar yüklemenize gerek yoktur.",
      icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      step: 7,
    },
  ];

  const handleFileUpload = async (belgeId, file) => {
    if (!file) return;
    setUploading(belgeId);
    try {
      const db = window.apiFirestore;
      if (!db) throw new Error("Veritabanı bağlantısı yok");

      // Dosya bilgisini kaydet
      const fileData = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        status: "yuklendi",
      };

      // Dosyayı sunucuya yükle
      if (window.API_BASE) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", `staj_belgeler/${studentId}`);
        try {
          const resp = await fetch(`${window.API_BASE}/api/files/upload`, {
            method: "POST",
            body: formData,
          });
          if (resp.ok) {
            const result = await resp.json();
            fileData.serverPath = result.path || result.filename;
          }
        } catch (uploadErr) {
          console.warn("Dosya sunucuya yüklenemedi, sadece kayıt tutulacak:", uploadErr);
        }
      }

      const newUploads = { ...uploads, [belgeId]: fileData };
      await db.collection("internship_uploads").doc(studentId).set(newUploads, { merge: true });
      setUploads(newUploads);
      setMsg("Belge başarıyla yüklendi!");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      console.error("Yükleme hatası:", e);
      setMsg("Yükleme sırasında hata oluştu: " + e.message);
      setTimeout(() => setMsg(""), 4000);
    } finally {
      setUploading(null);
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

      {msg && (
        <div style={{
          padding: "10px 16px", borderRadius: 8, marginBottom: 16,
          background: msg.includes("hata") ? STAJ.redLight : STAJ.greenLight,
          color: msg.includes("hata") ? STAJ.red : STAJ.green,
          fontSize: 13, fontWeight: 500,
        }}>{msg}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {BELGE_ALANLARI.map(belge => {
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
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <StajIcon path="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" size={13} color="#6B7280" />
                      <span style={{ fontWeight: 500 }}>{uploaded.fileName}</span>
                      <span style={{ color: STAJ.textMuted }}>
                        ({(uploaded.fileSize / 1024).toFixed(0)} KB) — {new Date(uploaded.uploadedAt).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Upload / Link Buttons */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
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
                  <label style={{
                    padding: "8px 14px", borderRadius: 8, border: "none",
                    background: isUploading ? "#9CA3AF" : (uploaded ? STAJ.green : STAJ.primary),
                    color: "white", fontSize: 12, fontWeight: 600,
                    cursor: isUploading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <StajIcon path={uploaded ? "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" : "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"} size={13} />
                    {isUploading ? "Yükleniyor..." : (uploaded ? "Değiştir" : "Yükle")}
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
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Onay Durumu */}
      <div style={{
        ...sectionStyle, marginTop: 20, padding: "16px 18px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StajIcon path="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" size={20} color="#EAB308" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: STAJ.navy }}>Onay Durumu</div>
            <p style={{ fontSize: 12, color: STAJ.textMuted, margin: "2px 0 0" }}>
              Belgeleriniz yüklendikten sonra Ergün ÇINAR tarafından değerlendirilecektir.
              Onay sürecini buradan takip edebilirsiniz.
            </p>
          </div>
        </div>
        <div style={{
          marginTop: 10, padding: "8px 12px", borderRadius: 8,
          background: uploads.sgk_onay === "onaylandi" ? STAJ.greenLight : "#FEF9C3",
          color: uploads.sgk_onay === "onaylandi" ? STAJ.green : "#92400E",
          fontSize: 13, fontWeight: 500,
        }}>
          {uploads.sgk_onay === "onaylandi" ? "SGK işlemleri onaylandı" : "Onay bekleniyor..."}
        </div>
      </div>
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
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [selectedApp, setSelectedApp] = useState(null);
  const [editingApp, setEditingApp] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    const isStudent = currentUser?.role === "student" || (!["admin", "bolum_yetkilisi", "professor"].includes(currentUser?.role));
    return isStudent ? "basvuru" : "kayitlar";
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const responsive = window.useResponsive();

  const isAdmin = currentUser?.role === "admin";
  const isDeptManager = currentUser?.role === "bolum_yetkilisi";
  const isStudent = currentUser?.role === "student" || (!isAdmin && !isDeptManager && currentUser?.role !== "professor");
  const canManage = isAdmin || isDeptManager;

  // Staj kayıtlarını ve başvuruları yükle
  const loadAllData = async () => {
    setLoading(true);
    try {
      const db = window.apiFirestore;
      if (!db) return;

      // Eski internships koleksiyonunu yükle
      let query = db.collection("internships");
      if (activeDepartment) query = query.where("departmentId", "==", activeDepartment);
      const snapshot = await query.get();
      setStajRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Admin/yönetici ise öğrenci başvurularını ve belgelerini yükle
      if (canManage) {
        // Önce departmentId filtresiyle dene
        let appQuery = db.collection("internship_applications");
        if (activeDepartment) appQuery = appQuery.where("departmentId", "==", activeDepartment);
        let appSnap = await appQuery.get();
        let apps = appSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Eğer filtreyle sonuç yoksa filtresiz dene (departmentId eşleşmeme durumu)
        if (apps.length === 0 && activeDepartment) {
          console.warn("departmentId filtresiyle başvuru bulunamadı, filtresiz deneniyor...");
          const allSnap = await db.collection("internship_applications").get();
          apps = allSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log("Toplam başvuru:", apps.length, "departmentId değerleri:", apps.map(a => a.departmentId));
        }

        setAllApplications(apps);

        // Tüm yüklenen belgeleri getir
        const uploadsSnap = await db.collection("internship_uploads").get();
        const uploadsMap = {};
        uploadsSnap.docs.forEach(doc => { uploadsMap[doc.id] = doc.data(); });
        setAllUploads(uploadsMap);
      }
    } catch (e) {
      console.error("Staj kayıtları yüklenirken hata:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAllData(); }, [activeDepartment]);

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
    try {
      const db = window.apiFirestore;
      if (!db) return;
      await db.collection("internship_applications").doc(appId).set({
        status: newStatus,
        statusUpdatedBy: currentUser?.name || currentUser?.identifier || "",
        statusUpdatedAt: new Date().toISOString(),
      }, { merge: true });
      setAllApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus, statusUpdatedBy: currentUser?.name || "", statusUpdatedAt: new Date().toISOString() } : a));
      setSelectedApp(prev => prev && prev.id === appId ? { ...prev, status: newStatus } : prev);
    } catch (e) {
      alert("Durum güncellenirken hata: " + e.message);
    }
  };

  // Admin: Başvuru sil
  const handleDeleteApp = async (appId) => {
    if (!confirm("Bu staj başvurusunu silmek istediğinizden emin misiniz?")) return;
    try {
      const db = window.apiFirestore;
      if (!db) return;
      await db.collection("internship_applications").doc(appId).delete();
      setAllApplications(prev => prev.filter(a => a.id !== appId));
      setSelectedApp(null);
    } catch (e) {
      alert("Silme hatası: " + e.message);
    }
  };

  // Admin: Belge indirme
  const handleDownloadFile = (studentId, belgeId) => {
    const upload = allUploads[studentId]?.[belgeId];
    if (!upload?.serverPath) {
      alert("Bu belge için indirilebilir dosya bulunamadı.");
      return;
    }
    const url = `${window.API_BASE || ""}/api/files/download/${upload.serverPath}`;
    window.open(url, "_blank");
  };

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
    { id: "kayitlar", label: "Staj Kayıtları", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
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
      {activeTab === "roadmap" && <StajRoadmap onTabChange={setActiveTab} />}

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

                    {/* Durum & Onay */}
                    <div style={{
                      background: "#F9FAFB", borderRadius: 10, padding: 16, marginBottom: 20,
                      border: "1px solid #E5E7EB",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: STAJ.navy, marginBottom: 10 }}>Başvuru Durumu & Onay</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        {Object.entries(STAJ_STATUS).map(([key, val]) => (
                          <button key={key} onClick={() => handleStatusChange(selectedApp.id, key)} style={{
                            padding: "8px 16px", borderRadius: 8, border: `2px solid ${selectedApp.status === key ? val.color : "#E5E7EB"}`,
                            background: selectedApp.status === key ? val.bg : "white",
                            color: selectedApp.status === key ? val.color : STAJ.textMuted,
                            fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                          }}>
                            {val.label}
                          </button>
                        ))}
                      </div>
                      {selectedApp.statusUpdatedBy && (
                        <p style={{ fontSize: 11, color: STAJ.textMuted, margin: "8px 0 0" }}>
                          Son güncelleme: {selectedApp.statusUpdatedBy} - {selectedApp.statusUpdatedAt ? new Date(selectedApp.statusUpdatedAt).toLocaleString("tr-TR") : ""}
                        </p>
                      )}
                    </div>

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
                        { title: "Staj Bilgileri", fields: [
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
                        basvuru_belgeleri: "Başvuru Belgeleri",
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
                                if (!upload) return null;
                                return (
                                  <div key={key} style={{
                                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                                    borderRadius: 8, background: STAJ.greenLight, border: "1px solid #A7F3D0",
                                  }}>
                                    <StajIcon path="M5 13l4 4L19 7" size={14} color={STAJ.green} />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: STAJ.navy }}>{label}</div>
                                      <div style={{ fontSize: 11, color: STAJ.textMuted }}>
                                        {upload.fileName} ({(upload.fileSize / 1024).toFixed(0)} KB) — {new Date(upload.uploadedAt).toLocaleDateString("tr-TR")}
                                      </div>
                                    </div>
                                    <button onClick={() => handleDownloadFile(selectedApp.ogrenciNo, key)} style={{
                                      padding: "6px 12px", borderRadius: 6, border: "1px solid #D1D5DB",
                                      background: "white", color: STAJ.primary, fontSize: 11, fontWeight: 600,
                                      cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                                    }}>
                                      <StajIcon path="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" size={13} />
                                      İndir
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
                    const uploadCount = Object.keys(studentUploads).filter(k => k !== "sgk_onay").length;
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
