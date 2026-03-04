// ══════════════════════════════════════════════════════════════
// ÇAKÜ Formlar Modülü
// Firebase Firestore üzerinden form yönetimi
// Kategoriler: Öğrenci İşleri, Bölüm, Üniversite
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useCallback, useMemo } = React;

// ── Tema ──
const FM_C = window.C || {
  bg: "#F7F5F0", card: "#FFFFFF", navy: "#1B2A4A", navyLight: "#2D4A7A",
  gold: "#C4973B", goldLight: "#E8D5A8", goldPale: "#FBF6EC",
  accent: "#8B2635", green: "#2E7D52", greenLight: "#D4EDDA",
  text: "#2C2C2C", textMuted: "#6B7280", border: "#E5E1D8",
  borderLight: "#F0EDE6", blue: "#3B82F6", blueLight: "#DBEAFE",
};

// ── Kategoriler ──
const FORM_KATEGORILER = [
  {
    id: "ogrenci-isleri",
    label: "Öğrenci İşleri",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    color: "#3B82F6",
    bg: "#DBEAFE",
    borderColor: "#93C5FD",
  },
  {
    id: "bolum",
    label: "Bölüm",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    color: "#059669",
    bg: "#D1FAE5",
    borderColor: "#6EE7B7",
  },
  {
    id: "universite",
    label: "Üniversite",
    icon: "M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z",
    color: "#C4973B",
    bg: "#FBF6EC",
    borderColor: "#E8D5A8",
  },
];

// ── Dosya boyutu formatla ──
function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

// ── Tarih formatla ──
function formatTarih(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

// ── Dosya ikonu ──
function dosyaIkonu(fileName) {
  if (!fileName) return "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z";
  const ext = fileName.split(".").pop().toLowerCase();
  if (["pdf"].includes(ext)) return "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z";
  if (["doc", "docx"].includes(ext)) return "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z";
  if (["xls", "xlsx"].includes(ext)) return "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z";
  if (["jpg", "jpeg", "png", "gif"].includes(ext)) return "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z";
  return "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z";
}

function dosyaRenk(fileName) {
  if (!fileName) return FM_C.textMuted;
  const ext = fileName.split(".").pop().toLowerCase();
  if (ext === "pdf") return "#DC2626";
  if (["doc", "docx"].includes(ext)) return "#2563EB";
  if (["xls", "xlsx"].includes(ext)) return "#059669";
  if (["jpg", "jpeg", "png", "gif"].includes(ext)) return "#7C3AED";
  return FM_C.textMuted;
}

// ══════════════════════════════════════════════════════════════
// Form Kartı Bileşeni
// ══════════════════════════════════════════════════════════════
const FormKarti = ({ form, kategori, isAdmin, onDelete }) => {
  const [hover, setHover] = useState(false);
  const [silOnay, setSilOnay] = useState(false);

  const kat = FORM_KATEGORILER.find(k => k.id === kategori) || FORM_KATEGORILER[0];

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setSilOnay(false); }}
      style={{
        background: FM_C.card,
        borderRadius: 12,
        border: `1px solid ${hover ? kat.borderColor : FM_C.border}`,
        padding: 20,
        transition: "all 0.2s ease",
        boxShadow: hover
          ? `0 8px 25px rgba(0,0,0,0.08), 0 0 0 1px ${kat.borderColor}`
          : "0 1px 3px rgba(0,0,0,0.04)",
        transform: hover ? "translateY(-2px)" : "none",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
      }}
    >
      {/* Üst: İkon + Başlık */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: kat.bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={dosyaRenk(form.dosyaAdi)} strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={dosyaIkonu(form.dosyaAdi)} />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: 0, fontSize: 14, fontWeight: 600,
            color: FM_C.text, lineHeight: 1.4,
            wordBreak: "break-word",
          }}>
            {form.baslik}
          </h3>
          {form.aciklama && (
            <p style={{
              margin: "4px 0 0", fontSize: 12, color: FM_C.textMuted,
              lineHeight: 1.4, wordBreak: "break-word",
            }}>
              {form.aciklama}
            </p>
          )}
        </div>
      </div>

      {/* Alt: Tarih + Dosya bilgisi */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {form.dosyaAdi && (
            <span style={{
              fontSize: 11, color: FM_C.textMuted, background: FM_C.bg,
              padding: "2px 8px", borderRadius: 6,
              maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {form.dosyaAdi}
            </span>
          )}
          {form.dosyaBoyutu && (
            <span style={{ fontSize: 11, color: FM_C.textMuted }}>
              {formatFileSize(form.dosyaBoyutu)}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: FM_C.textMuted }}>
          {formatTarih(form.createdAt)}
        </span>
      </div>

      {/* İndir Butonu */}
      {form.dosyaURL && (
        <a
          href={form.dosyaURL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 0", borderRadius: 8,
            background: hover ? kat.color : FM_C.bg,
            color: hover ? "#fff" : kat.color,
            fontSize: 13, fontWeight: 500, textDecoration: "none",
            transition: "all 0.2s ease",
            border: `1px solid ${hover ? kat.color : FM_C.border}`,
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          İndir
        </a>
      )}

      {/* Admin: Sil Butonu */}
      {isAdmin && (
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          {silOnay ? (
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => onDelete(form)}
                style={{
                  padding: "4px 10px", fontSize: 11, fontWeight: 600,
                  background: "#DC2626", color: "#fff", border: "none",
                  borderRadius: 6, cursor: "pointer",
                }}
              >
                Sil
              </button>
              <button
                onClick={() => setSilOnay(false)}
                style={{
                  padding: "4px 10px", fontSize: 11,
                  background: FM_C.bg, color: FM_C.textMuted, border: `1px solid ${FM_C.border}`,
                  borderRadius: 6, cursor: "pointer",
                }}
              >
                İptal
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSilOnay(true)}
              style={{
                padding: "4px 6px", background: "transparent", border: "none",
                cursor: "pointer", color: FM_C.textMuted, opacity: hover ? 1 : 0,
                transition: "opacity 0.2s",
              }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// Form Ekleme Modal
// ══════════════════════════════════════════════════════════════
const FormEkleModal = ({ onClose, onEkle }) => {
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [kategori, setKategori] = useState("ogrenci-isleri");
  const [dosya, setDosya] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");

  const handleSubmit = async () => {
    if (!baslik.trim()) { setHata("Form başlığı gereklidir."); return; }
    if (!dosya) { setHata("Lütfen bir dosya seçin."); return; }

    setYukleniyor(true);
    setHata("");

    try {
      const FirebaseDB = window.FirebaseDB;
      if (!FirebaseDB) throw new Error("Firebase bağlantısı yok");

      const { downloadURL, fileName } = await FirebaseDB.uploadFormFile(dosya);

      const formData = {
        baslik: baslik.trim(),
        aciklama: aciklama.trim(),
        kategori,
        dosyaURL: downloadURL,
        dosyaAdi: dosya.name,
        dosyaBoyutu: dosya.size,
        storagePath: fileName,
      };

      const saved = await FirebaseDB.addForm(formData);
      onEkle(saved);
      onClose();
    } catch (err) {
      setHata("Form yüklenirken hata: " + err.message);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: FM_C.card, borderRadius: 16, width: "100%", maxWidth: 480,
        boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          background: `linear-gradient(135deg, ${FM_C.navy} 0%, ${FM_C.navyLight} 100%)`,
          color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Yeni Form Ekle</h2>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
            width: 32, height: 32, borderRadius: 8, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Başlık */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: FM_C.text, marginBottom: 6, display: "block" }}>
              Form Başlığı *
            </label>
            <input
              type="text"
              value={baslik}
              onChange={e => setBaslik(e.target.value)}
              placeholder="Örn: Staj Başvuru Formu"
              style={{
                width: "100%", padding: "10px 14px", fontSize: 14,
                border: `1px solid ${FM_C.border}`, borderRadius: 8,
                outline: "none", background: FM_C.bg,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Açıklama */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: FM_C.text, marginBottom: 6, display: "block" }}>
              Açıklama (isteğe bağlı)
            </label>
            <textarea
              value={aciklama}
              onChange={e => setAciklama(e.target.value)}
              placeholder="Kısa bir açıklama ekleyin..."
              rows={2}
              style={{
                width: "100%", padding: "10px 14px", fontSize: 14,
                border: `1px solid ${FM_C.border}`, borderRadius: 8,
                outline: "none", background: FM_C.bg, resize: "vertical",
                fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Kategori */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: FM_C.text, marginBottom: 6, display: "block" }}>
              Kategori
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {FORM_KATEGORILER.map(kat => (
                <button
                  key={kat.id}
                  onClick={() => setKategori(kat.id)}
                  style={{
                    flex: 1, padding: "10px 8px", fontSize: 12, fontWeight: 500,
                    border: `2px solid ${kategori === kat.id ? kat.color : FM_C.border}`,
                    borderRadius: 8, cursor: "pointer",
                    background: kategori === kat.id ? kat.bg : FM_C.card,
                    color: kategori === kat.id ? kat.color : FM_C.textMuted,
                    transition: "all 0.2s",
                  }}
                >
                  {kat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dosya */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: FM_C.text, marginBottom: 6, display: "block" }}>
              Dosya *
            </label>
            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: dosya ? "12px 16px" : "24px 16px",
              border: `2px dashed ${dosya ? FM_C.green : FM_C.border}`,
              borderRadius: 10, cursor: "pointer",
              background: dosya ? FM_C.greenLight : FM_C.bg,
              transition: "all 0.2s",
            }}>
              <input
                type="file"
                onChange={e => setDosya(e.target.files[0])}
                style={{ display: "none" }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.zip,.rar"
              />
              {dosya ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={FM_C.green} strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: FM_C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {dosya.name}
                    </div>
                    <div style={{ fontSize: 11, color: FM_C.textMuted }}>
                      {formatFileSize(dosya.size)}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={FM_C.textMuted} strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span style={{ fontSize: 13, color: FM_C.textMuted, marginTop: 6 }}>
                    Dosya seçmek için tıklayın
                  </span>
                  <span style={{ fontSize: 11, color: FM_C.textMuted, marginTop: 2 }}>
                    PDF, DOC, XLS, resim veya arşiv dosyaları
                  </span>
                </>
              )}
            </label>
          </div>

          {/* Hata */}
          {hata && (
            <div style={{
              padding: "10px 14px", borderRadius: 8,
              background: "#FEE2E2", color: "#DC2626",
              fontSize: 13,
            }}>
              {hata}
            </div>
          )}

          {/* Butonlar */}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              onClick={onClose}
              disabled={yukleniyor}
              style={{
                flex: 1, padding: "10px 0", fontSize: 14, fontWeight: 500,
                border: `1px solid ${FM_C.border}`, borderRadius: 8,
                background: FM_C.card, color: FM_C.textMuted, cursor: "pointer",
              }}
            >
              İptal
            </button>
            <button
              onClick={handleSubmit}
              disabled={yukleniyor}
              style={{
                flex: 1, padding: "10px 0", fontSize: 14, fontWeight: 600,
                border: "none", borderRadius: 8, cursor: yukleniyor ? "wait" : "pointer",
                background: yukleniyor
                  ? FM_C.textMuted
                  : `linear-gradient(135deg, ${FM_C.navy} 0%, ${FM_C.navyLight} 100%)`,
                color: "#fff",
              }}
            >
              {yukleniyor ? "Yükleniyor..." : "Formu Ekle"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// Ana Bileşen: FormlarModuluApp
// ══════════════════════════════════════════════════════════════
function FormlarModuluApp({ currentUser }) {
  const [formlar, setFormlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [seciliKategori, setSeciliKategori] = useState("tumu");
  const [aramaMetni, setAramaMetni] = useState("");
  const [modalAcik, setModalAcik] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  // Responsive
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  const isMobile = windowWidth <= 768;

  // Formları yükle
  const formlariYukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const FirebaseDB = window.FirebaseDB;
      if (!FirebaseDB) { setYukleniyor(false); return; }
      const data = await FirebaseDB.fetchForms();
      setFormlar(data || []);
    } catch (err) {
      console.error("Formlar yüklenirken hata:", err);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => { formlariYukle(); }, [formlariYukle]);

  // Form sil
  const formSil = useCallback(async (form) => {
    try {
      const FirebaseDB = window.FirebaseDB;
      if (!FirebaseDB) return;
      await FirebaseDB.deleteForm(form.id);
      if (form.storagePath) {
        await FirebaseDB.deleteFormFile(form.storagePath);
      }
      setFormlar(prev => prev.filter(f => f.id !== form.id));
    } catch (err) {
      console.error("Form silinirken hata:", err);
    }
  }, []);

  // Form ekle
  const formEkle = useCallback((yeniForm) => {
    setFormlar(prev => [yeniForm, ...prev]);
  }, []);

  // Filtreleme
  const filtrelenmisFormlar = useMemo(() => {
    let sonuc = formlar;
    if (seciliKategori !== "tumu") {
      sonuc = sonuc.filter(f => f.kategori === seciliKategori);
    }
    if (aramaMetni.trim()) {
      const aranan = aramaMetni.toLowerCase();
      sonuc = sonuc.filter(f =>
        (f.baslik || "").toLowerCase().includes(aranan) ||
        (f.aciklama || "").toLowerCase().includes(aranan) ||
        (f.dosyaAdi || "").toLowerCase().includes(aranan)
      );
    }
    return sonuc;
  }, [formlar, seciliKategori, aramaMetni]);

  // Kategori başına sayılar
  const kategoriSayilari = useMemo(() => {
    const sayilar = { tumu: formlar.length };
    FORM_KATEGORILER.forEach(k => {
      sayilar[k.id] = formlar.filter(f => f.kategori === k.id).length;
    });
    return sayilar;
  }, [formlar]);

  // Grid kolon hesapla
  const gridKolonlar = isMobile ? 1 : windowWidth <= 1024 ? 2 : 3;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 16px" }}>
      {/* Başlık */}
      <div style={{
        display: "flex", alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
        flexDirection: isMobile ? "column" : "row",
        gap: 12, marginBottom: 24,
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 700,
            color: FM_C.navy,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke={FM_C.navy} strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Formlar
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: FM_C.textMuted }}>
            Gerekli form ve belgeleri buradan indirebilirsiniz
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setModalAcik(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 20px", fontSize: 14, fontWeight: 600,
              background: `linear-gradient(135deg, ${FM_C.navy} 0%, ${FM_C.navyLight} 100%)`,
              color: "#fff", border: "none", borderRadius: 10,
              cursor: "pointer", boxShadow: "0 2px 8px rgba(27,42,74,0.3)",
              whiteSpace: "nowrap",
            }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Form Ekle
          </button>
        )}
      </div>

      {/* Kategori Filtreleri */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 16,
        overflowX: "auto", paddingBottom: 4,
      }}>
        <button
          onClick={() => setSeciliKategori("tumu")}
          style={{
            padding: "8px 16px", fontSize: 13, fontWeight: 500,
            border: `1px solid ${seciliKategori === "tumu" ? FM_C.navy : FM_C.border}`,
            borderRadius: 20, cursor: "pointer",
            background: seciliKategori === "tumu" ? FM_C.navy : FM_C.card,
            color: seciliKategori === "tumu" ? "#fff" : FM_C.textMuted,
            whiteSpace: "nowrap", transition: "all 0.2s",
          }}
        >
          Tümü ({kategoriSayilari.tumu})
        </button>
        {FORM_KATEGORILER.map(kat => (
          <button
            key={kat.id}
            onClick={() => setSeciliKategori(kat.id)}
            style={{
              padding: "8px 16px", fontSize: 13, fontWeight: 500,
              border: `1px solid ${seciliKategori === kat.id ? kat.color : FM_C.border}`,
              borderRadius: 20, cursor: "pointer",
              background: seciliKategori === kat.id ? kat.bg : FM_C.card,
              color: seciliKategori === kat.id ? kat.color : FM_C.textMuted,
              whiteSpace: "nowrap", transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={kat.icon} />
            </svg>
            {kat.label} ({kategoriSayilari[kat.id] || 0})
          </button>
        ))}
      </div>

      {/* Arama */}
      <div style={{
        position: "relative", marginBottom: 20,
      }}>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={FM_C.textMuted} strokeWidth={2}
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={aramaMetni}
          onChange={e => setAramaMetni(e.target.value)}
          placeholder="Form ara..."
          style={{
            width: "100%", padding: "10px 14px 10px 42px", fontSize: 14,
            border: `1px solid ${FM_C.border}`, borderRadius: 10,
            outline: "none", background: FM_C.card,
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Yükleniyor */}
      {yukleniyor && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 60, color: FM_C.textMuted, fontSize: 14,
        }}>
          <div style={{
            width: 24, height: 24, border: `3px solid ${FM_C.border}`,
            borderTopColor: FM_C.navy, borderRadius: "50%",
            animation: "spin 0.8s linear infinite", marginRight: 10,
          }} />
          Formlar yükleniyor...
          <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg) } }` }} />
        </div>
      )}

      {/* Boş Durum */}
      {!yukleniyor && filtrelenmisFormlar.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: FM_C.card, borderRadius: 16,
          border: `1px solid ${FM_C.border}`,
        }}>
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke={FM_C.border} strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p style={{ fontSize: 16, color: FM_C.textMuted, marginTop: 12 }}>
            {aramaMetni ? "Aramanızla eşleşen form bulunamadı." : "Henüz form eklenmemiş."}
          </p>
          {isAdmin && !aramaMetni && (
            <button
              onClick={() => setModalAcik(true)}
              style={{
                marginTop: 12, padding: "10px 24px", fontSize: 14, fontWeight: 500,
                background: FM_C.navy, color: "#fff", border: "none",
                borderRadius: 8, cursor: "pointer",
              }}
            >
              İlk Formu Ekle
            </button>
          )}
        </div>
      )}

      {/* Kartlar Grid */}
      {!yukleniyor && filtrelenmisFormlar.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridKolonlar}, 1fr)`,
          gap: 16,
        }}>
          {filtrelenmisFormlar.map(form => (
            <FormKarti
              key={form.id}
              form={form}
              kategori={form.kategori}
              isAdmin={isAdmin}
              onDelete={formSil}
            />
          ))}
        </div>
      )}

      {/* Form Ekle Modal */}
      {modalAcik && (
        <FormEkleModal
          onClose={() => setModalAcik(false)}
          onEkle={formEkle}
        />
      )}
    </div>
  );
}

// ── Global Export ──
window.FormlarModuluApp = FormlarModuluApp;
