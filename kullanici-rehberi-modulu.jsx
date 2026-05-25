// ══════════════════════════════════════════════════════════════
// ÇAKÜ Kullanıcı Rehberi Modülü
// public/rehberler/<id>.pdf altındaki rehberleri listeler,
// rol bazlı filtreleme + önizleme + indirme sunar.
// ══════════════════════════════════════════════════════════════

const { useState, useMemo, useEffect } = React;

const KR_C = window.C || {
  bg: "#F7F5F0", card: "#FFFFFF", navy: "#1B2A4A", navyLight: "#2D4A7A",
  gold: "#C4973B", goldLight: "#E8D5A8", goldPale: "#FBF6EC",
  text: "#2C2C2C", textMuted: "#6B7280", border: "#E5E1D8",
  borderLight: "#F0EDE6", blue: "#3B82F6", blueLight: "#DBEAFE",
  green: "#2E7D52", greenLight: "#D4EDDA",
};

// ── Rehber Kataloğu ──
// Her giriş public/rehberler/<id>.pdf dosyasına işaret eder.
// roller: hangi kullanıcı rollerine görünecek
// kategori: ogrenci | akademisyen | admin | ortak
const REHBER_KATALOG = [
  // Öğrenci
  { id: "benim",          baslik: "Benim Sayfam",                ozet: "Kişisel öğrenci ana sayfası, ders seçimi ve dönem özetleri.", roller: ["student"], kategori: "ogrenci" },
  { id: "erasmus",        baslik: "Erasmus Learning Agreement",  ozet: "Erasmus giden öğrenci için ders eşleştirme ve LA onay süreci.", roller: ["student", "professor", "admin"], kategori: "ogrenci" },
  { id: "staj",           baslik: "Staj",                        ozet: "Staj başvuru, defter teslimi, değerlendirme ve onay süreçleri.", roller: ["student", "professor", "admin"], kategori: "ogrenci" },
  { id: "muafiyet",       baslik: "Ders Muafiyet",               ozet: "Önceden alınan dersler için muafiyet başvurusu ve değerlendirme.", roller: ["student", "professor", "admin"], kategori: "ogrenci" },
  { id: "projeler",       baslik: "Proje",                       ozet: "Bitirme/dönem projesi başvuru, danışmanlık, jüri süreci.", roller: ["student", "professor", "admin"], kategori: "ogrenci" },

  // Akademisyen
  { id: "sinav",          baslik: "Sınav Otomasyonu",            ozet: "Sınav takvimi, salon dağıtımı, gözetmen atama, sonuç girişi.", roller: ["professor", "admin"], kategori: "akademisyen" },
  { id: "akademisyen",    baslik: "Akademisyenler",              ozet: "Bölüm akademisyenleri profilleri ve iletişim bilgileri.", roller: ["professor", "admin"], kategori: "akademisyen" },
  { id: "performans",     baslik: "Performans Modülü",           ozet: "Yayın, proje, ders yükü ve performans göstergeleri.", roller: ["professor", "admin"], kategori: "akademisyen" },

  // Ortak
  { id: "dersprogrami",   baslik: "Ders Programı",               ozet: "Haftalık ders programı, çakışma kontrolü, dönem değişiklikleri.", roller: ["student", "professor", "admin"], kategori: "ortak" },
  { id: "formlar",        baslik: "Formlar",                     ozet: "Öğrenci işleri, bölüm ve üniversite formlarının indirme arşivi.", roller: ["student", "professor", "admin"], kategori: "ortak" },
  { id: "portal",         baslik: "Öğrenci Portalı",             ozet: "Duyuru, tartışma, etkinlik akışı ve sosyal etkileşim.", roller: ["student", "professor", "admin"], kategori: "ortak" },
  { id: "roadmaps",       baslik: "Yol Haritaları",              ozet: "Bölüm bazlı kariyer ve öğrenim yol haritaları.", roller: ["student", "professor", "admin"], kategori: "ortak" },
  { id: "rehber",         baslik: "Kullanıcı Rehberi",           ozet: "Bu modül: tüm modüller için kullanım rehberi arşivi.", roller: ["student", "professor", "admin"], kategori: "ortak" },

  // Admin
  { id: "kullanici",      baslik: "Kullanıcı Yönetimi",          ozet: "Kullanıcı oluşturma, rol/bölüm atama, parola sıfırlama.", roller: ["admin"], kategori: "admin" },
  { id: "bolumyonetimi",  baslik: "Bölüm Yönetimi",              ozet: "Bölümler, yetkili atamaları, sınıf/program yapısı.", roller: ["admin"], kategori: "admin" },
  { id: "dersyonetimi",   baslik: "Ders Yönetimi",               ozet: "Bölüm ders katalogları, kredi/AKTS, dönem tanımları.", roller: ["admin"], kategori: "admin" },
  { id: "komisyonlar",    baslik: "Komisyonlar",                 ozet: "Bölüm komisyonları (staj, erasmus, sınav) ve üye yönetimi.", roller: ["admin"], kategori: "admin" },
  { id: "audit",          baslik: "Audit Log",                   ozet: "Sistemdeki kritik işlemlerin zaman damgalı kaydı.", roller: ["admin"], kategori: "admin" },
];

const KATEGORILER = [
  { id: "hepsi",       label: "Tümü",         color: "#1B2A4A", bg: "#E5E7EB" },
  { id: "ogrenci",     label: "Öğrenci",      color: "#3B82F6", bg: "#DBEAFE" },
  { id: "akademisyen", label: "Akademisyen",  color: "#059669", bg: "#D1FAE5" },
  { id: "ortak",       label: "Ortak",        color: "#C4973B", bg: "#FBF6EC" },
  { id: "admin",       label: "Yönetici",     color: "#7C3AED", bg: "#EDE9FE" },
];

const ROL_ETIKET = { student: "Öğrenci", professor: "Akademisyen", admin: "Yönetici" };

function rehberKategorisi(katId) {
  return KATEGORILER.find(k => k.id === katId) || KATEGORILER[0];
}

// ══════════════════════════════════════════════════════════════
// Rehber Kartı
// ══════════════════════════════════════════════════════════════
const RehberKarti = ({ rehber, onOnizle }) => {
  const [hover, setHover] = useState(false);
  const kat = rehberKategorisi(rehber.kategori);
  const pdfUrl = `/rehberler/${rehber.id}.pdf`;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: KR_C.card,
        borderRadius: 12,
        border: `1px solid ${hover ? kat.color : KR_C.border}`,
        padding: 20,
        transition: "all 0.2s ease",
        boxShadow: hover
          ? `0 8px 25px rgba(0,0,0,0.08), 0 0 0 1px ${kat.color}33`
          : "0 1px 3px rgba(0,0,0,0.04)",
        transform: hover ? "translateY(-2px)" : "none",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Üst: PDF ikon + Başlık */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: kat.bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={kat.color} strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: 0, fontSize: 14, fontWeight: 600,
            color: KR_C.text, lineHeight: 1.4,
          }}>
            {rehber.baslik}
          </h3>
          <p style={{
            margin: "4px 0 0", fontSize: 12, color: KR_C.textMuted,
            lineHeight: 1.4,
          }}>
            {rehber.ozet}
          </p>
        </div>
      </div>

      {/* Rol rozetleri */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {rehber.roller.map(r => (
          <span key={r} style={{
            fontSize: 10, fontWeight: 600,
            color: kat.color, background: kat.bg,
            padding: "3px 8px", borderRadius: 5,
            textTransform: "uppercase", letterSpacing: 0.4,
          }}>
            {ROL_ETIKET[r] || r}
          </span>
        ))}
      </div>

      {/* Butonlar */}
      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <button
          onClick={() => onOnizle(rehber)}
          style={{
            flex: 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 0", borderRadius: 8,
            background: hover ? kat.color : KR_C.bg,
            color: hover ? "#fff" : kat.color,
            fontSize: 13, fontWeight: 500,
            border: `1px solid ${hover ? kat.color : KR_C.border}`,
            cursor: "pointer", transition: "all 0.2s ease",
          }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Önizle
        </button>
        <a
          href={pdfUrl}
          download={`${rehber.baslik} - Rehber.pdf`}
          style={{
            flex: 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 0", borderRadius: 8,
            background: KR_C.bg, color: KR_C.text,
            fontSize: 13, fontWeight: 500, textDecoration: "none",
            border: `1px solid ${KR_C.border}`,
            transition: "all 0.2s ease",
          }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          İndir
        </a>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// Önizleme Modal
// ══════════════════════════════════════════════════════════════
const OnizlemeModal = ({ rehber, onClose }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const pdfUrl = `/rehberler/${rehber.id}.pdf`;
  const kat = rehberKategorisi(rehber.kategori);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: KR_C.card,
        borderRadius: 16,
        width: "100%", maxWidth: "min(900px, calc(100vw - 24px))",
        height: "min(90vh, 900px)",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          background: `linear-gradient(135deg, ${KR_C.navy} 0%, ${KR_C.navyLight} 100%)`,
          color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 600, letterSpacing: 0.5 }}>
              KULLANICI REHBERİ
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 600 }}>
              {rehber.baslik}
            </h2>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <a
              href={pdfUrl}
              download={`${rehber.baslik} - Rehber.pdf`}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 8,
                background: KR_C.gold, color: "#fff",
                fontSize: 12, fontWeight: 600, textDecoration: "none",
              }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              İndir
            </a>
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
        </div>

        {/* PDF iframe */}
        <iframe
          src={`${pdfUrl}#toolbar=0&navpanes=0`}
          title={`${rehber.baslik} rehberi`}
          style={{
            flex: 1, width: "100%", border: "none",
            background: "#525659",
          }}
        />
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// Ana Modül
// ══════════════════════════════════════════════════════════════
function KullaniciRehberiApp({ currentUser }) {
  const [seciliKategori, setSeciliKategori] = useState("hepsi");
  const [aramaMetni, setAramaMetni] = useState("");
  const [onizlenen, setOnizlenen] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const isMobile = windowWidth <= 768;

  // Kullanıcı rolüne göre filtre
  const kullaniciRol = useMemo(() => {
    if (!currentUser) return "student";
    if (currentUser.role === "admin") return "admin";
    if (currentUser.role === "bolum_yetkilisi") return "admin";
    if (currentUser.role === "professor") return "professor";
    return "student";
  }, [currentUser]);

  const gorunurRehberler = useMemo(() => {
    let sonuc = REHBER_KATALOG.filter(r => r.roller.includes(kullaniciRol));
    if (seciliKategori !== "hepsi") {
      sonuc = sonuc.filter(r => r.kategori === seciliKategori);
    }
    if (aramaMetni.trim()) {
      const aranan = aramaMetni.toLowerCase();
      sonuc = sonuc.filter(r =>
        r.baslik.toLowerCase().includes(aranan) ||
        r.ozet.toLowerCase().includes(aranan)
      );
    }
    return sonuc;
  }, [kullaniciRol, seciliKategori, aramaMetni]);

  const kategoriSayilari = useMemo(() => {
    const rolFiltreli = REHBER_KATALOG.filter(r => r.roller.includes(kullaniciRol));
    const sayilar = { hepsi: rolFiltreli.length };
    KATEGORILER.forEach(k => {
      if (k.id !== "hepsi") sayilar[k.id] = rolFiltreli.filter(r => r.kategori === k.id).length;
    });
    return sayilar;
  }, [kullaniciRol]);

  const gridKolonlar = isMobile ? 1 : windowWidth <= 1024 ? 2 : 3;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 16px" }}>
      {/* Başlık */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 700,
          color: KR_C.navy,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke={KR_C.navy} strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Kullanıcı Rehberi
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: KR_C.textMuted }}>
          Sistemdeki her modülün ne işe yaradığını ve nasıl kullanılacağını PDF rehberleriyle keşfedin.
        </p>
      </div>

      {/* Arama */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: "relative" }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={KR_C.textMuted} strokeWidth={2}
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            placeholder="Rehber ara..."
            style={{
              width: "100%", padding: "10px 14px 10px 40px",
              fontSize: 14, borderRadius: 10,
              border: `1px solid ${KR_C.border}`,
              background: KR_C.card, color: KR_C.text,
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Kategori Sekmeleri */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 20,
        flexWrap: "wrap",
      }}>
        {KATEGORILER.map(kat => {
          const aktif = seciliKategori === kat.id;
          const sayi = kategoriSayilari[kat.id] || 0;
          if (kat.id !== "hepsi" && sayi === 0) return null;
          return (
            <button
              key={kat.id}
              onClick={() => setSeciliKategori(kat.id)}
              style={{
                padding: "8px 14px", borderRadius: 8,
                fontSize: 13, fontWeight: 600,
                background: aktif ? kat.color : KR_C.card,
                color: aktif ? "#fff" : kat.color,
                border: `1px solid ${aktif ? kat.color : KR_C.border}`,
                cursor: "pointer", transition: "all 0.2s ease",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {kat.label}
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: aktif ? "rgba(255,255,255,0.25)" : kat.bg,
                color: aktif ? "#fff" : kat.color,
                padding: "1px 7px", borderRadius: 10,
              }}>
                {sayi}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kartlar Grid */}
      {gorunurRehberler.length > 0 ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridKolonlar}, 1fr)`,
          gap: 16,
        }}>
          {gorunurRehberler.map(rehber => (
            <RehberKarti
              key={rehber.id}
              rehber={rehber}
              onOnizle={(r) => setOnizlenen(r)}
            />
          ))}
        </div>
      ) : (
        <div style={{
          padding: "60px 20px", textAlign: "center",
          background: KR_C.card, borderRadius: 12,
          border: `1px dashed ${KR_C.border}`,
          color: KR_C.textMuted,
        }}>
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
            style={{ margin: "0 auto 12px", opacity: 0.4, display: "block" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <div style={{ fontSize: 14 }}>Aranan kritere uygun rehber bulunamadı.</div>
        </div>
      )}

      {/* Önizleme */}
      {onizlenen && (
        <OnizlemeModal
          rehber={onizlenen}
          onClose={() => setOnizlenen(null)}
        />
      )}
    </div>
  );
}

window.KullaniciRehberiApp = KullaniciRehberiApp;
