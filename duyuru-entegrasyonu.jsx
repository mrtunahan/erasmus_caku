// ═══════════════════════════════════════════════════════════════════════════════
// Çankırı Karatekin Üniversitesi — Duyuru Entegrasyonu Modülü
// etkinlik-takvimi.jsx yerine geçer
// ═══════════════════════════════════════════════════════════════════════════════

const { useState, useEffect, useCallback } = React;

// ── Sabitler & Yapılandırma ─────────────────────────────────────────────────

const DUYURU_KAYNAKLARI = [
  {
    id: "bmu",
    label: "Bilgisayar Müh.",
    url: "https://bmu.karatekin.edu.tr/tr/tum-duyurular",
    color: "#1e40af",
    icon: "💻",
  },
  {
    id: "mf",
    label: "Müh. Fakültesi",
    url: "https://mf.karatekin.edu.tr/tr/tum-duyurular",
    color: "#7c3aed",
    icon: "🏗️",
  },
  {
    id: "univ",
    label: "Üniversite",
    url: "https://www.karatekin.edu.tr/tr/tum-duyurular",
    color: "#b45309",
    icon: "🎓",
  },
  {
    id: "oidb",
    label: "Öğrenci İşleri",
    url: "https://oidb.karatekin.edu.tr/tr/tum-duyurular",
    color: "#047857",
    icon: "📋",
  },
];

const KATEGORI_RENKLERI = {
  akademik: { bg: "#dbeafe", text: "#1e40af", label: "Akademik" },
  idari: { bg: "#fef3c7", text: "#92400e", label: "İdari" },
  etkinlik: { bg: "#d1fae5", text: "#065f46", label: "Etkinlik" },
  sinav: { bg: "#fce7f3", text: "#9d174d", label: "Sınav" },
  burs: { bg: "#ede9fe", text: "#5b21b6", label: "Burs/Staj" },
  genel: { bg: "#f3f4f6", text: "#374151", label: "Genel" },
};

// ── Duyuru JSON Veri Kaynağı ─────────────────────────────────────────────────
// GitHub Actions ile scraper.py periyodik çalışır ve bu dosyayı günceller.
// Frontend sadece bu JSON dosyasını okur — CORS sorunu olmaz.
const DUYURU_JSON_URL = "duyurular/duyurular.json";

// ── Yerleşik Örnek Duyurular (tüm kaynaklar başarısız olduğunda gösterilir) ──
const YERLESIK_DUYURULAR = [
  {
    id: "bmu_demo_1",
    baslik: "2024-2025 Bahar Dönemi Ders Kayıt İşlemleri Hakkında",
    ozet: "Bahar dönemi ders kayıtları 10-14 Şubat tarihleri arasında yapılacaktır. Öğrencilerin danışman onayı alması gerekmektedir.",
    tarih: "2025-02-05",
    kaynak: "bmu",
    kategori: "akademik",
    url: "https://bmu.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: true,
  },
  {
    id: "bmu_demo_2",
    baslik: "Bilgisayar Mühendisliği Bölümü Vize Sınav Programı",
    ozet: "2024-2025 Bahar dönemi ara sınav programı yayınlanmıştır. Detaylı program için tıklayınız.",
    tarih: "2025-02-03",
    kaynak: "bmu",
    kategori: "sinav",
    url: "https://bmu.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: false,
  },
  {
    id: "bmu_demo_3",
    baslik: "Yapay Zeka ve Makine Öğrenmesi Semineri",
    ozet: "Prof. Dr. Ahmet Yılmaz tarafından verilecek seminer 20 Şubat 2025 tarihinde Mühendislik Fakültesi konferans salonunda gerçekleştirilecektir.",
    tarih: "2025-02-01",
    kaynak: "bmu",
    kategori: "etkinlik",
    url: "https://bmu.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: false,
  },
  {
    id: "mf_demo_1",
    baslik: "Mühendislik Fakültesi Akademik Kurul Toplantısı",
    ozet: "Fakülte akademik kurul toplantısı 15 Şubat 2025 tarihinde saat 14:00'te yapılacaktır.",
    tarih: "2025-02-04",
    kaynak: "mf",
    kategori: "idari",
    url: "https://mf.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: false,
  },
  {
    id: "mf_demo_2",
    baslik: "Erasmus+ Öğrenci Değişim Programı Başvuruları",
    ozet: "2025-2026 akademik yılı Erasmus+ öğrenci değişim programı başvuruları başlamıştır. Son başvuru tarihi: 15 Mart 2025.",
    tarih: "2025-02-02",
    kaynak: "mf",
    kategori: "akademik",
    url: "https://mf.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: true,
  },
  {
    id: "univ_demo_1",
    baslik: "Üniversitemiz Akreditasyon Sürecini Başarıyla Tamamladı",
    ozet: "Çankırı Karatekin Üniversitesi kurumsal akreditasyon sürecini başarıyla tamamlamıştır.",
    tarih: "2025-02-06",
    kaynak: "univ",
    kategori: "genel",
    url: "https://www.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: false,
  },
  {
    id: "univ_demo_2",
    baslik: "Kütüphane Çalışma Saatleri Güncellendi",
    ozet: "Sınav döneminde kütüphane 08:00-24:00 saatleri arasında hizmet verecektir.",
    tarih: "2025-01-28",
    kaynak: "univ",
    kategori: "idari",
    url: "https://www.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: false,
  },
  {
    id: "oidb_demo_1",
    baslik: "Öğrenci Belgesi ve Transkript Talepleri Hakkında",
    ozet: "Öğrenci belgesi ve transkript talepleri e-Devlet üzerinden yapılabilmektedir. Detaylı bilgi için tıklayınız.",
    tarih: "2025-02-05",
    kaynak: "oidb",
    kategori: "idari",
    url: "https://oidb.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: false,
  },
  {
    id: "oidb_demo_2",
    baslik: "TÜBİTAK 2209-A Üniversite Öğrencileri Araştırma Projeleri",
    ozet: "TÜBİTAK 2209-A programı başvuruları açılmıştır. İlgilenen öğrencilerin bölüm başkanlıklarına başvurması gerekmektedir.",
    tarih: "2025-01-30",
    kaynak: "oidb",
    kategori: "burs",
    url: "https://oidb.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: false,
  },
  {
    id: "oidb_demo_3",
    baslik: "Mezuniyet Töreni Tarihi Belirlendi",
    ozet: "2024-2025 akademik yılı mezuniyet töreni 20 Haziran 2025 tarihinde kampüs alanında gerçekleştirilecektir.",
    tarih: "2025-01-25",
    kaynak: "oidb",
    kategori: "etkinlik",
    url: "https://oidb.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: false,
  },
];

// ── Kategori tespiti: başlık metninden otomatik kategori çıkar ──────────────
function kategoriBelirle(baslik) {
  var metin = baslik.toLowerCase();
  if (metin.includes("sinav") || metin.includes("sınav") || metin.includes("vize") || metin.includes("final") || metin.includes("mazeret")) return "sinav";
  if (metin.includes("burs") || metin.includes("staj") || metin.includes("tubitak") || metin.includes("tübitak")) return "burs";
  if (metin.includes("seminer") || metin.includes("etkinlik") || metin.includes("toplant") || metin.includes("konferans") || metin.includes("workshop")) return "etkinlik";
  if (metin.includes("kayit") || metin.includes("kayıt") || metin.includes("ders") || metin.includes("erasmus") || metin.includes("akademik") || metin.includes("müfredat")) return "akademik";
  if (metin.includes("kutuphane") || metin.includes("kütüphane") || metin.includes("idari") || metin.includes("personel") || metin.includes("yemekhane")) return "idari";
  return "genel";
}

// ── JSON verisini duyuru formatına çevir ─────────────────────────────────────
function jsonDenDuyuruCevir(jsonData) {
  return jsonData.map(function(d) {
    var kaynak = "bmu";
    if (d.kaynak) {
      var k = d.kaynak.toLowerCase();
      if (k.includes("oidb") || k.includes("ogrenci")) kaynak = "oidb";
      else if (k.includes("mf") || k.includes("muhendislik")) kaynak = "mf";
      else if (k.includes("univ") || k.includes("genel")) kaynak = "univ";
      else if (k.includes("bmu") || k.includes("bilgisayar")) kaynak = "bmu";
    } else if (d.url) {
      if (d.url.includes("oidb.")) kaynak = "oidb";
      else if (d.url.includes("mf.")) kaynak = "mf";
      else if (d.url.includes("www.karatekin")) kaynak = "univ";
    }

    var tarih = d.tarih || d.cekilme_tarihi || new Date().toISOString().split("T")[0];
    try {
      var parsed = new Date(tarih);
      if (!isNaN(parsed.getTime())) tarih = parsed.toISOString().split("T")[0];
    } catch (_) {}

    return {
      id: d.id || d.scraper_id || Math.random().toString(36).substr(2, 12),
      baslik: d.baslik || "Başlıksız Duyuru",
      ozet: d.ozet || (d.icerik ? d.icerik.substring(0, 300) : ""),
      tarih: tarih,
      kaynak: kaynak,
      kategori: kategoriBelirle(d.baslik || ""),
      url: d.url || d.kaynak_url || "#",
      okundu: false,
      pinli: false,
    };
  });
}

// ── Yardımcı Fonksiyonlar ───────────────────────────────────────────────────

function zamanFarki(tarih) {
  const simdi = new Date();
  const hedef = new Date(tarih);
  const fark = simdi - hedef;
  const dakika = Math.floor(fark / 60000);
  const saat = Math.floor(fark / 3600000);
  const gun = Math.floor(fark / 86400000);

  if (dakika < 1) return "Az önce";
  if (dakika < 60) return `${dakika} dk önce`;
  if (saat < 24) return `${saat} saat önce`;
  if (gun < 7) return `${gun} gün önce`;
  if (gun < 30) return `${Math.floor(gun / 7)} hafta önce`;
  return hedef.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function tarihFormat(tarih) {
  return new Date(tarih).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function kaynakBul(id) {
  return DUYURU_KAYNAKLARI.find((k) => k.id === id) || DUYURU_KAYNAKLARI[0];
}

// ── Alt Bileşenler ──────────────────────────────────────────────────────────

function KategoriBadge({ kategori }) {
  const k = KATEGORI_RENKLERI[kategori] || KATEGORI_RENKLERI.genel;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.02em",
        backgroundColor: k.bg,
        color: k.text,
      }}
    >
      {k.label}
    </span>
  );
}

function KaynakBadge({ kaynakId }) {
  const k = kaynakBul(kaynakId);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: 500,
        backgroundColor: k.color + "15",
        color: k.color,
        border: `1px solid ${k.color}25`,
      }}
    >
      <span style={{ fontSize: "12px" }}>{k.icon}</span>
      {k.label}
    </span>
  );
}

function DuyuruPinIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1h1V4H7v2h1a1 1 0 0 1 1 1z" />
    </svg>
  );
}

function DuyuruSearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function DuyuruRefreshIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function DuyuruExternalLinkIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function DuyuruBellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function DuyuruFilterIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

// ── Duyuru Kartı ────────────────────────────────────────────────────────────

function DuyuruKarti({ duyuru, onOku, onPortalaEkle, compact = false }) {
  const [genisletildi, setGenisletildi] = useState(false);
  const kaynak = kaynakBul(duyuru.kaynak);

  return (
    <div
      style={{
        position: "relative",
        backgroundColor: duyuru.okundu ? "#fff" : "#fffbeb",
        border: duyuru.pinli
          ? "1.5px solid #f59e0b"
          : "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: compact ? "14px 16px" : "18px 20px",
        marginBottom: "10px",
        transition: "all 0.2s ease",
        cursor: "pointer",
        boxShadow: duyuru.pinli
          ? "0 2px 8px rgba(245, 158, 11, 0.12)"
          : "0 1px 3px rgba(0,0,0,0.04)",
      }}
      onClick={() => {
        setGenisletildi(!genisletildi);
        if (!duyuru.okundu && onOku) onOku(duyuru.id);
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = duyuru.pinli
          ? "0 2px 8px rgba(245, 158, 11, 0.12)"
          : "0 1px 3px rgba(0,0,0,0.04)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Pin göstergesi */}
      {duyuru.pinli && (
        <div
          style={{
            position: "absolute",
            top: "-1px",
            right: "16px",
            color: "#f59e0b",
            backgroundColor: "#fffbeb",
            padding: "2px 8px",
            borderRadius: "0 0 6px 6px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "3px",
            border: "1.5px solid #f59e0b",
            borderTop: "none",
          }}
        >
          <DuyuruPinIcon /> Sabitlenmiş
        </div>
      )}

      {/* Okunmadı noktası */}
      {!duyuru.okundu && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "-4px",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "#3b82f6",
            boxShadow: "0 0 6px rgba(59, 130, 246, 0.5)",
          }}
        />
      )}

      {/* Üst bilgi satırı */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
          flexWrap: "wrap",
        }}
      >
        <KaynakBadge kaynakId={duyuru.kaynak} />
        <KategoriBadge kategori={duyuru.kategori} />
        <span
          style={{
            marginLeft: "auto",
            fontSize: "12px",
            color: "#9ca3af",
            whiteSpace: "nowrap",
          }}
        >
          {zamanFarki(duyuru.tarih)}
        </span>
      </div>

      {/* Başlık */}
      <h3
        style={{
          margin: "0 0 6px 0",
          fontSize: compact ? "14px" : "15px",
          fontWeight: 600,
          color: "#111827",
          lineHeight: 1.4,
        }}
      >
        {duyuru.baslik}
      </h3>

      {/* Özet */}
      <p
        style={{
          margin: 0,
          fontSize: "13px",
          color: "#6b7280",
          lineHeight: 1.55,
          display: genisletildi ? "block" : "-webkit-box",
          WebkitLineClamp: compact ? 1 : 2,
          WebkitBoxOrient: "vertical",
          overflow: genisletildi ? "visible" : "hidden",
        }}
      >
        {duyuru.ozet}
      </p>

      {/* Genişletilmiş içerik */}
      {genisletildi && (
        <div
          style={{
            marginTop: "14px",
            paddingTop: "14px",
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <a
            href={duyuru.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              backgroundColor: "#1e40af",
              color: "#fff",
              textDecoration: "none",
              border: "none",
              cursor: "pointer",
              transition: "background-color 0.15s",
            }}
          >
            <DuyuruExternalLinkIcon /> Kaynağa Git
          </a>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onPortalaEkle) onPortalaEkle(duyuru);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              backgroundColor: "#f0fdf4",
              color: "#166534",
              border: "1px solid #bbf7d0",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            Portala Ekle
          </button>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "11px",
              color: "#9ca3af",
              alignSelf: "center",
            }}
          >
            {tarihFormat(duyuru.tarih)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── İstatistik Kartı ────────────────────────────────────────────────────────

function DuyuruStatKart({ icon, deger, etiket, renk }) {
  return (
    <div
      style={{
        flex: "1 1 120px",
        backgroundColor: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        minWidth: "140px",
      }}
    >
      <div
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "10px",
          backgroundColor: renk + "15",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "22px", fontWeight: 700, color: "#111827" }}>
          {deger}
        </div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>{etiket}</div>
      </div>
    </div>
  );
}

// ── Kaynak Filtre Butonları ─────────────────────────────────────────────────

function KaynakFiltre({ secili, onDegistir }) {
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      <button
        onClick={() => onDegistir("tumu")}
        style={{
          padding: "6px 14px",
          borderRadius: "8px",
          fontSize: "12px",
          fontWeight: secili === "tumu" ? 700 : 500,
          backgroundColor: secili === "tumu" ? "#1f2937" : "#f9fafb",
          color: secili === "tumu" ? "#fff" : "#374151",
          border: secili === "tumu" ? "none" : "1px solid #e5e7eb",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        Tümü
      </button>
      {DUYURU_KAYNAKLARI.map((k) => (
        <button
          key={k.id}
          onClick={() => onDegistir(k.id)}
          style={{
            padding: "6px 14px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: secili === k.id ? 700 : 500,
            backgroundColor:
              secili === k.id ? k.color : "#f9fafb",
            color: secili === k.id ? "#fff" : "#374151",
            border:
              secili === k.id ? "none" : "1px solid #e5e7eb",
            cursor: "pointer",
            transition: "all 0.15s",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "13px" }}>{k.icon}</span>
          {k.label}
        </button>
      ))}
    </div>
  );
}

// ── Scraper Durum Paneli ────────────────────────────────────────────────────

function ScraperDurum({ sonGuncelleme, yukleniyor, onYenile }) {
  return (
    <div
      style={{
        backgroundColor: "#f0f9ff",
        border: "1px solid #bae6fd",
        borderRadius: "10px",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: yukleniyor ? "#f59e0b" : "#22c55e",
            animation: yukleniyor ? "duyuruPulse 1.5s infinite" : "none",
          }}
        />
        <span style={{ fontSize: "13px", color: "#0c4a6e" }}>
          {yukleniyor
            ? "Duyurular güncelleniyor..."
            : `Son güncelleme: ${sonGuncelleme || "Henüz güncellenmedi"}`}
        </span>
      </div>
      <button
        onClick={onYenile}
        disabled={yukleniyor}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 14px",
          borderRadius: "8px",
          fontSize: "12px",
          fontWeight: 600,
          backgroundColor: yukleniyor ? "#e0e7ff" : "#fff",
          color: yukleniyor ? "#94a3b8" : "#0369a1",
          border: "1px solid #bae6fd",
          cursor: yukleniyor ? "not-allowed" : "pointer",
          transition: "all 0.15s",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            animation: yukleniyor ? "duyuruSpin 1s linear infinite" : "none",
          }}
        >
          <DuyuruRefreshIcon />
        </span>
        {yukleniyor ? "Güncelleniyor..." : "Şimdi Güncelle"}
      </button>
    </div>
  );
}

// ── Ayarlar Paneli ──────────────────────────────────────────────────────────

function DuyuruAyarlarPaneli({ ayarlar, onDegistir, gorunur, onKapat }) {
  if (!gorunur) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onKapat}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "16px",
          padding: "28px",
          width: "90%",
          maxWidth: "480px",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            margin: "0 0 20px 0",
            fontSize: "18px",
            fontWeight: 700,
            color: "#111827",
          }}
        >
          Duyuru Ayarları
        </h3>

        {/* Otomatik güncelleme aralığı */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "#374151",
              marginBottom: "8px",
            }}
          >
            Otomatik Güncelleme Aralığı
          </label>
          <select
            value={ayarlar.guncellemeAraligi}
            onChange={(e) =>
              onDegistir({
                ...ayarlar,
                guncellemeAraligi: parseInt(e.target.value),
              })
            }
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "13px",
              backgroundColor: "#f9fafb",
            }}
          >
            <option value={0}>Kapalı</option>
            <option value={15}>Her 15 dakika</option>
            <option value={30}>Her 30 dakika</option>
            <option value={60}>Her 1 saat</option>
            <option value={360}>Her 6 saat</option>
          </select>
        </div>

        {/* Kaynak seçimi */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "#374151",
              marginBottom: "8px",
            }}
          >
            Takip Edilen Kaynaklar
          </label>
          {DUYURU_KAYNAKLARI.map((k) => (
            <label
              key={k.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 0",
                fontSize: "13px",
                color: "#374151",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={ayarlar.aktifKaynaklar.includes(k.id)}
                onChange={(e) => {
                  const yeni = e.target.checked
                    ? [...ayarlar.aktifKaynaklar, k.id]
                    : ayarlar.aktifKaynaklar.filter((x) => x !== k.id);
                  onDegistir({ ...ayarlar, aktifKaynaklar: yeni });
                }}
                style={{ accentColor: k.color }}
              />
              <span style={{ fontSize: "14px" }}>{k.icon}</span>
              {k.label}
            </label>
          ))}
        </div>

        {/* Bildirim tercihi */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#374151",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={ayarlar.bildirimAktif}
              onChange={(e) =>
                onDegistir({ ...ayarlar, bildirimAktif: e.target.checked })
              }
              style={{ accentColor: "#3b82f6" }}
            />
            Yeni duyurularda bildirim göster
          </label>
        </div>

        <button
          onClick={onKapat}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 600,
            backgroundColor: "#1f2937",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Kaydet ve Kapat
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANA BİLEŞEN — DuyuruEntegrasyonuApp
// ═══════════════════════════════════════════════════════════════════════════════

function DuyuruEntegrasyonuApp({ currentUser }) {
  // ── State ─────────────────────────────────────────────────────────────
  const [duyurular, setDuyurular] = useState([]);
  const [aramaMetni, setAramaMetni] = useState("");
  const [seciliKaynak, setSeciliKaynak] = useState("tumu");
  const [seciliKategori, setSeciliKategori] = useState("tumu");
  const [siralama, setSiralama] = useState("tarih");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(null);
  const [sonGuncelleme, setSonGuncelleme] = useState(null);
  const [ayarlarGorunur, setAyarlarGorunur] = useState(false);
  const [bildirimSayisi, setBildirimSayisi] = useState(0);
  const [portalaEklenenler, setPortalaEklenenler] = useState([]);
  const [ayarlar, setAyarlar] = useState({
    guncellemeAraligi: 30,
    aktifKaynaklar: DUYURU_KAYNAKLARI.map((k) => k.id),
    bildirimAktif: true,
  });

  // ── Filtreleme & Sıralama ─────────────────────────────────────────────
  const filtrelenmis = duyurular
    .filter((d) => {
      if (seciliKaynak !== "tumu" && d.kaynak !== seciliKaynak) return false;
      if (seciliKategori !== "tumu" && d.kategori !== seciliKategori)
        return false;
      if (aramaMetni) {
        const ara = aramaMetni.toLowerCase();
        return (
          d.baslik.toLowerCase().includes(ara) ||
          d.ozet.toLowerCase().includes(ara)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (a.pinli && !b.pinli) return -1;
      if (!a.pinli && b.pinli) return 1;
      if (siralama === "okunmamis") {
        if (!a.okundu && b.okundu) return -1;
        if (a.okundu && !b.okundu) return 1;
      }
      return new Date(b.tarih) - new Date(a.tarih);
    });

  // ── Sonuçları state'e uygula (ortak yardımcı) ──────────────────────────
  const sonuclariUygula = useCallback((yeniDuyurular) => {
    setDuyurular((prev) => {
      const okunduMap = {};
      prev.forEach((d) => { if (d.okundu) okunduMap[d.id] = true; });

      const sonuc = yeniDuyurular.map((d) => ({
        ...d,
        okundu: okunduMap[d.id] || false,
      }));

      const mevcutIdler = new Set(prev.map((d) => d.id));
      const yeniSayisi = sonuc.filter((d) => !mevcutIdler.has(d.id)).length;
      if (yeniSayisi > 0 && prev.length > 0) {
        setBildirimSayisi((s) => s + yeniSayisi);
      }

      return sonuc;
    });

    setSonGuncelleme(
      new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, []);

  // ── Duyuruları çek: JSON dosyasından oku → yerleşik fallback ────────
  const duyurulariGuncelle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      // 1. JSON dosyasından oku (scraper.py tarafından güncellenir)
      console.log("JSON dosyasindan duyurular yukleniyor: " + DUYURU_JSON_URL);
      var response = await fetch(DUYURU_JSON_URL + "?v=" + Date.now());
      if (response.ok) {
        var jsonData = await response.json();
        if (jsonData && jsonData.length > 0) {
          var duyuruListesi = jsonDenDuyuruCevir(jsonData);
          // Aktif kaynaklara göre filtrele
          duyuruListesi = duyuruListesi.filter(function(d) {
            return ayarlar.aktifKaynaklar.includes(d.kaynak);
          });
          console.log("JSON basarili: " + duyuruListesi.length + " duyuru yuklendi");
          sonuclariUygula(duyuruListesi);
          setYukleniyor(false);
          return;
        }
      }
      console.warn("JSON dosyasi bos veya yuklenemedi, yerlesik veriler kullaniliyor");
    } catch (err) {
      console.warn("JSON yukleme hatasi: " + err.message);
    }

    // 2. JSON başarısız → Yerleşik örnek duyuruları göster
    var yerlesikDuyurular = YERLESIK_DUYURULAR.filter(function(d) {
      return ayarlar.aktifKaynaklar.includes(d.kaynak);
    });
    sonuclariUygula(yerlesikDuyurular);
    setHata(
      "Duyuru verileri henüz güncellenmemiş. Örnek veriler gösterilmektedir."
    );
    setYukleniyor(false);
  }, [ayarlar.aktifKaynaklar, sonuclariUygula]);

  // ── İlk yükleme ───────────────────────────────────────────────────────
  useEffect(() => {
    duyurulariGuncelle();
  }, [duyurulariGuncelle]);

  // ── Otomatik güncelleme timer ─────────────────────────────────────────
  useEffect(() => {
    if (ayarlar.guncellemeAraligi === 0) return;
    const interval = setInterval(
      duyurulariGuncelle,
      ayarlar.guncellemeAraligi * 60 * 1000
    );
    return () => clearInterval(interval);
  }, [ayarlar.guncellemeAraligi, duyurulariGuncelle]);

  // ── Okundu işaretle ───────────────────────────────────────────────────
  const okuIslaretle = (id) => {
    setDuyurular((prev) =>
      prev.map((d) => (d.id === id ? { ...d, okundu: true } : d))
    );
  };

  // ── Portala ekle ──────────────────────────────────────────────────────
  const portalaEkle = (duyuru) => {
    if (portalaEklenenler.includes(duyuru.id)) return;
    setPortalaEklenenler((prev) => [...prev, duyuru.id]);
    alert(`"${duyuru.baslik}" Öğrenci Portalı'na eklendi!`);
  };

  // ── İstatistikler ─────────────────────────────────────────────────────
  const okunmamisSayisi = duyurular.filter((d) => !d.okundu).length;
  const bugunSayisi = duyurular.filter((d) => {
    const bugun = new Date().toISOString().split("T")[0];
    return d.tarih === bugun;
  }).length;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "24px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* CSS Animasyonlar */}
      <style>{`
        @keyframes duyuruPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes duyuruSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes duyuruFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Başlık ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              margin: "0 0 4px 0",
              fontSize: "24px",
              fontWeight: 800,
              color: "#111827",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            Duyuru Merkezi
            {okunmamisSayisi > 0 && (
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  padding: "2px 10px",
                  borderRadius: "9999px",
                }}
              >
                {okunmamisSayisi} yeni
              </span>
            )}
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
            Üniversite ve bölüm duyuruları otomatik olarak çekilir
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {/* Bildirim butonu */}
          <button
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              cursor: "pointer",
              color: "#374151",
            }}
          >
            <DuyuruBellIcon />
            {bildirimSayisi > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  fontSize: "10px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {bildirimSayisi}
              </span>
            )}
          </button>
          {/* Ayarlar butonu */}
          <button
            onClick={() => setAyarlarGorunur(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Scraper Durumu ─────────────────────────────────────────── */}
      <div style={{ marginBottom: "20px" }}>
        <ScraperDurum
          sonGuncelleme={sonGuncelleme}
          yukleniyor={yukleniyor}
          onYenile={duyurulariGuncelle}
        />
      </div>

      {/* ── İstatistikler ──────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <DuyuruStatKart
          icon="📋"
          deger={duyurular.length}
          etiket="Toplam Duyuru"
          renk="#3b82f6"
        />
        <DuyuruStatKart
          icon="🔵"
          deger={okunmamisSayisi}
          etiket="Okunmamış"
          renk="#ef4444"
        />
        <DuyuruStatKart
          icon="📌"
          deger={portalaEklenenler.length}
          etiket="Portala Eklenen"
          renk="#22c55e"
        />
        <DuyuruStatKart
          icon="🏷️"
          deger={DUYURU_KAYNAKLARI.length}
          etiket="Aktif Kaynak"
          renk="#8b5cf6"
        />
      </div>

      {/* ── Kaynak Filtreleri ──────────────────────────────────────── */}
      <div style={{ marginBottom: "16px" }}>
        <KaynakFiltre secili={seciliKaynak} onDegistir={setSeciliKaynak} />
      </div>

      {/* ── Arama ve Sıralama ─────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        {/* Arama kutusu */}
        <div
          style={{
            flex: "1 1 300px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
            }}
          >
            <DuyuruSearchIcon />
          </div>
          <input
            type="text"
            placeholder="Duyurularda ara..."
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 38px",
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
              fontSize: "13px",
              backgroundColor: "#f9fafb",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
          />
        </div>

        {/* Kategori filtresi */}
        <div style={{ position: "relative" }}>
          <select
            value={seciliKategori}
            onChange={(e) => setSeciliKategori(e.target.value)}
            style={{
              padding: "10px 32px 10px 12px",
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
              fontSize: "13px",
              backgroundColor: "#f9fafb",
              cursor: "pointer",
              appearance: "none",
            }}
          >
            <option value="tumu">Tüm Kategoriler</option>
            {Object.entries(KATEGORI_RENKLERI).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
          <div
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "#9ca3af",
            }}
          >
            <DuyuruFilterIcon />
          </div>
        </div>

        {/* Sıralama */}
        <select
          value={siralama}
          onChange={(e) => setSiralama(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
            fontSize: "13px",
            backgroundColor: "#f9fafb",
            cursor: "pointer",
          }}
        >
          <option value="tarih">En Yeni</option>
          <option value="okunmamis">Okunmamışlar Önce</option>
        </select>
      </div>

      {/* ── Duyuru Listesi ─────────────────────────────────────────── */}
      <div style={{ marginBottom: "24px" }}>
        {filtrelenmis.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "#9ca3af",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <p style={{ fontSize: "15px", fontWeight: 500 }}>
              {aramaMetni
                ? `"${aramaMetni}" ile eşleşen duyuru bulunamadı`
                : "Bu filtrelere uygun duyuru bulunamadı"}
            </p>
          </div>
        ) : (
          filtrelenmis.map((d, i) => (
            <div
              key={d.id}
              style={{
                animation: `duyuruFadeIn 0.3s ease ${i * 0.05}s both`,
              }}
            >
              <DuyuruKarti
                duyuru={d}
                onOku={okuIslaretle}
                onPortalaEkle={portalaEkle}
              />
            </div>
          ))
        )}
      </div>

      {/* ── Tümünü Okundu İşaretle ─────────────────────────────────── */}
      {okunmamisSayisi > 0 && (
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <button
            onClick={() =>
              setDuyurular((prev) =>
                prev.map((d) => ({ ...d, okundu: true }))
              )
            }
            style={{
              padding: "8px 20px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 600,
              backgroundColor: "#f9fafb",
              color: "#6b7280",
              border: "1px solid #e5e7eb",
              cursor: "pointer",
            }}
          >
            Tümünü Okundu İşaretle
          </button>
        </div>
      )}

      {/* ── Hata / Bilgi Mesajı ─────────────────────────────────────── */}
      {hata && (
        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "10px",
            padding: "14px 18px",
            fontSize: "13px",
            color: "#92400e",
            lineHeight: 1.6,
          }}
        >
          <strong>Bilgi:</strong> {hata}
        </div>
      )}

      {/* ── Ayarlar Modal ──────────────────────────────────────────── */}
      <DuyuruAyarlarPaneli
        ayarlar={ayarlar}
        onDegistir={setAyarlar}
        gorunur={ayarlarGorunur}
        onKapat={() => setAyarlarGorunur(false)}
      />
    </div>
  );
}

// ── Global export ───────────────────────────────────────────────────────────
window.DuyuruEntegrasyonuApp = DuyuruEntegrasyonuApp;
