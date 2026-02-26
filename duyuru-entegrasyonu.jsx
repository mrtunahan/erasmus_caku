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

// ── Yerleşik Örnek Duyurular (JSON yüklenemezse gösterilir) ──────────────────
const YERLESIK_DUYURULAR = [
  {
    id: "bmu_demo_1",
    baslik: "MTH412 Doğal Dil İşleme ve Büyük Dil Modelleri Dersi Hk.",
    ozet: "MTH412 Doğal Dil İşleme ve Büyük Dil Modelleri dersi ile ilgili önemli duyuru yayınlanmıştır.",
    tarih: "2025-02-24",
    kaynak: "bmu",
    kategori: "akademik",
    url: "https://bmu.karatekin.edu.tr/tr/mth412-dogal-dil-isleme-ve-buyuk-dil-modelleri-dersi-hk-64437-duyurusu-icerigi.karatekin",
    okundu: false,
    pinli: false,
  },
  {
    id: "bmu_demo_2",
    baslik: "2024-2025 Bahar Yarıyılı Ders Programları Yayınlandı",
    ozet: "Bilgisayar Mühendisliği bölümü 2024-2025 bahar yarıyılı ders programları yayınlanmıştır.",
    tarih: "2025-02-20",
    kaynak: "bmu",
    kategori: "akademik",
    url: "https://bmu.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: false,
  },
  {
    id: "bmu_demo_3",
    baslik: "Bahar Dönemi Staj Başvuruları Başladı",
    ozet: "2024-2025 bahar dönemi zorunlu staj başvuruları başlamıştır. Son başvuru tarihi 14 Mart 2025.",
    tarih: "2025-02-18",
    kaynak: "bmu",
    kategori: "burs",
    url: "https://bmu.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: false,
  },
  {
    id: "mf_demo_1",
    baslik: "Mühendislik Fakültesi Ders Ekleme-Bırakma Tarihleri",
    ozet: "Bahar dönemi ders ekleme-bırakma işlemleri 24-28 Şubat 2025 tarihleri arasında yapılacaktır.",
    tarih: "2025-02-22",
    kaynak: "mf",
    kategori: "akademik",
    url: "https://mf.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: false,
  },
  {
    id: "mf_demo_2",
    baslik: "Erasmus+ 2025-2026 Öğrenim Hareketliliği Başvuruları",
    ozet: "2025-2026 akademik yılı Erasmus+ öğrenim hareketliliği başvuruları başlamıştır. Son başvuru: 21 Mart 2025.",
    tarih: "2025-02-19",
    kaynak: "mf",
    kategori: "akademik",
    url: "https://mf.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: false,
  },
  {
    id: "univ_demo_1",
    baslik: "Rektörlük - Bahar Dönemi Akademik Takvim Güncellendi",
    ozet: "2024-2025 akademik yılı bahar dönemi akademik takviminde güncelleme yapılmıştır.",
    tarih: "2025-02-23",
    kaynak: "univ",
    kategori: "genel",
    url: "https://www.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: false,
  },
  {
    id: "univ_demo_2",
    baslik: "Merkez Kütüphane Sınav Dönemi Çalışma Saatleri",
    ozet: "Vize sınavları döneminde Merkez Kütüphane 08:00-23:00 saatleri arasında hizmet verecektir.",
    tarih: "2025-02-16",
    kaynak: "univ",
    kategori: "idari",
    url: "https://www.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: false,
  },
  {
    id: "oidb_demo_1",
    baslik: "2024-2025 Bahar Dönemi Ders Kayıt Yenileme İşlemleri",
    ozet: "Bahar dönemi ders kayıt yenileme işlemleri 24-28 Şubat 2025 tarihleri arasında OBS üzerinden yapılacaktır.",
    tarih: "2025-02-24",
    kaynak: "oidb",
    kategori: "akademik",
    url: "https://oidb.karatekin.edu.tr/tr/tum-duyurular",
    okundu: false,
    pinli: false,
  },
  {
    id: "oidb_demo_2",
    baslik: "Öğrenci Katkı Payı / Öğrenim Ücreti Ödeme Duyurusu",
    ozet: "2024-2025 bahar dönemi katkı payı ve öğrenim ücreti ödemeleri hakkında bilgilendirme.",
    tarih: "2025-02-21",
    kaynak: "oidb",
    kategori: "idari",
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

// ── Formlar Verileri ─────────────────────────────────────────────────────────

const FORM_KATEGORILERI = {
  ogrenci: { label: "Öğrenci İşleri", color: "#1e40af", icon: "🎓" },
  akademik: { label: "Akademik", color: "#7c3aed", icon: "📚" },
  staj: { label: "Staj/Kariyer", color: "#047857", icon: "💼" },
  idari: { label: "İdari", color: "#b45309", icon: "🏛️" },
};

const FORMLAR = [
  {
    id: "dilekce",
    baslik: "Genel Dilekçe Formu",
    aciklama: "Üniversiteye genel amaçlı dilekçe başvurusu için kullanılır.",
    kategori: "ogrenci",
    url: "https://oidb.karatekin.edu.tr",
    format: "PDF",
  },
  {
    id: "ders_ekleme",
    baslik: "Ders Ekleme / Bırakma Formu",
    aciklama: "Dönem başında ders ekleme ve bırakma işlemleri için gerekli form.",
    kategori: "akademik",
    url: "https://oidb.karatekin.edu.tr",
    format: "PDF",
  },
  {
    id: "mazeret_sinav",
    baslik: "Mazeret Sınavı Başvuru Formu",
    aciklama: "Sınava giremeyen öğrencilerin mazeret sınavı başvurusu için doldurması gereken form.",
    kategori: "akademik",
    url: "https://oidb.karatekin.edu.tr",
    format: "PDF",
  },
  {
    id: "staj_basvuru",
    baslik: "Staj Başvuru Formu",
    aciklama: "Zorunlu ve isteğe bağlı staj başvuruları için kullanılan form.",
    kategori: "staj",
    url: "https://bmu.karatekin.edu.tr",
    format: "PDF",
  },
  {
    id: "staj_defteri",
    baslik: "Staj Defteri Şablonu",
    aciklama: "Staj süresince günlük olarak doldurulması gereken staj defteri şablonu.",
    kategori: "staj",
    url: "https://bmu.karatekin.edu.tr",
    format: "DOCX",
  },
  {
    id: "erasmus_basvuru",
    baslik: "Erasmus+ Başvuru Formu",
    aciklama: "Erasmus+ öğrenim ve staj hareketliliği başvurusu için gerekli form.",
    kategori: "akademik",
    url: "https://www.karatekin.edu.tr",
    format: "PDF",
  },
  {
    id: "ders_muafiyet",
    baslik: "Ders Muafiyet / İntibak Formu",
    aciklama: "Yatay geçiş veya daha önce alınan derslerden muafiyet başvurusu için kullanılır.",
    kategori: "akademik",
    url: "https://oidb.karatekin.edu.tr",
    format: "PDF",
  },
  {
    id: "yaz_okulu",
    baslik: "Yaz Okulu Başvuru Formu",
    aciklama: "Yaz okuluna kayıt yaptırmak isteyen öğrenciler için başvuru formu.",
    kategori: "akademik",
    url: "https://oidb.karatekin.edu.tr",
    format: "PDF",
  },
  {
    id: "tecil",
    baslik: "Askerlik Tecil Belgesi Başvuru Formu",
    aciklama: "Askerlik tecil işlemleri için öğrenci belgesi talep formu.",
    kategori: "ogrenci",
    url: "https://oidb.karatekin.edu.tr",
    format: "PDF",
  },
  {
    id: "ogrenci_belgesi",
    baslik: "Öğrenci Belgesi Talep Formu",
    aciklama: "Resmi kurumlara ibraz edilmek üzere öğrenci belgesi talep formu.",
    kategori: "ogrenci",
    url: "https://oidb.karatekin.edu.tr",
    format: "PDF",
  },
  {
    id: "transkript",
    baslik: "Transkript Talep Formu",
    aciklama: "Not döküm belgesi (transkript) talep etmek için kullanılan form.",
    kategori: "ogrenci",
    url: "https://oidb.karatekin.edu.tr",
    format: "PDF",
  },
  {
    id: "kayit_dondurma",
    baslik: "Kayıt Dondurma / İzin Formu",
    aciklama: "Dönem izni veya kayıt dondurma başvurusu için gerekli form.",
    kategori: "idari",
    url: "https://oidb.karatekin.edu.tr",
    format: "PDF",
  },
  {
    id: "burs_basvuru",
    baslik: "Burs Başvuru Formu",
    aciklama: "Üniversite burs programlarına başvuru için gerekli form ve beyan.",
    kategori: "ogrenci",
    url: "https://www.karatekin.edu.tr",
    format: "PDF",
  },
  {
    id: "laboratuvar",
    baslik: "Laboratuvar Kullanım Talep Formu",
    aciklama: "Ders dışı saatlerde laboratuvar kullanım talebi için doldurulması gereken form.",
    kategori: "idari",
    url: "https://bmu.karatekin.edu.tr",
    format: "PDF",
  },
];

// ── Form Kartı Bileşeni ─────────────────────────────────────────────────────

function FormKarti({ form, isAdmin, onDelete }) {
  const kategori = FORM_KATEGORILERI[form.kategori] || FORM_KATEGORILERI.ogrenci;
  const isPDF = (form.format || "").toUpperCase() === "PDF";
  const tarih = form.createdAt?.toDate ? form.createdAt.toDate().toLocaleDateString("tr-TR") : form.tarih || "";

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "18px 20px",
        marginBottom: "10px",
        transition: "all 0.2s ease",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Üst bilgi satırı */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "6px",
          fontSize: "11px", fontWeight: 500, backgroundColor: kategori.color + "15", color: kategori.color,
          border: `1px solid ${kategori.color}25`,
        }}>
          <span style={{ fontSize: "12px" }}>{kategori.icon}</span>
          {kategori.label}
        </span>
        <span style={{
          display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "6px",
          fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em",
          backgroundColor: isPDF ? "#fef2f2" : "#eff6ff", color: isPDF ? "#dc2626" : "#2563eb",
          border: isPDF ? "1px solid #fecaca" : "1px solid #bfdbfe",
        }}>
          {(form.format || "DOSYA").toUpperCase()}
        </span>
        {tarih && (
          <span style={{ fontSize: "11px", color: "#9ca3af", marginLeft: "auto" }}>{tarih}</span>
        )}
      </div>

      {/* Başlık */}
      <h3 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: 600, color: "#111827", lineHeight: 1.4 }}>
        {form.baslik}
      </h3>

      {/* Açıklama / İçerik */}
      <p style={{ margin: "0 0 14px 0", fontSize: "13px", color: "#6b7280", lineHeight: 1.55 }}>
        {form.aciklama}
      </p>

      {/* Alt butonlar */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <a
          href={form.downloadURL || form.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 14px", borderRadius: "8px",
            fontSize: "12px", fontWeight: 600, backgroundColor: "#1e40af", color: "#fff",
            textDecoration: "none", border: "none", cursor: "pointer", transition: "background-color 0.15s",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Dosyayı İndir
        </a>
        {isAdmin && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(form); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 14px", borderRadius: "8px",
              fontSize: "12px", fontWeight: 600, backgroundColor: "#fef2f2", color: "#dc2626",
              border: "1px solid #fecaca", cursor: "pointer", transition: "all 0.15s", marginLeft: "auto",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Sil
          </button>
        )}
      </div>
    </div>
  );
}

// ── Formlar Bölümü ──────────────────────────────────────────────────────────

function FormlarBolumu({ currentUser, onFormSayisiDegisti }) {
  const [aramaMetni, setAramaMetni] = useState("");
  const [seciliKategori, setSeciliKategori] = useState("tumu");
  const [formlar, setFormlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [formEkleModalGorunur, setFormEkleModalGorunur] = useState(false);

  const isAdmin = currentUser?.role === "admin";
  const FirebaseDB = window.FirebaseDB;

  // Form sayisini parent'a bildir
  useEffect(() => {
    if (onFormSayisiDegisti) onFormSayisiDegisti(formlar.length);
  }, [formlar.length]);

  // Firebase'den formlari yukle
  useEffect(() => {
    const yukle = async () => {
      try {
        const fbFormlar = await FirebaseDB.fetchForms();
        setFormlar(fbFormlar);
      } catch (e) {
        console.error("Form yukleme hatasi:", e);
      } finally {
        setYukleniyor(false);
      }
    };
    yukle();
  }, []);

  // Form silme
  const handleFormSil = async (form) => {
    if (!confirm(`"${form.baslik}" formunu silmek istediginize emin misiniz?`)) return;
    try {
      await FirebaseDB.deleteForm(form.id);
      if (form.storagePath) {
        await FirebaseDB.deleteFormFile(form.storagePath);
      }
      setFormlar((prev) => prev.filter((f) => f.id !== form.id));
    } catch (e) {
      alert("Silme hatasi: " + e.message);
    }
  };

  // Yeni form eklendikten sonra
  const handleFormEklendi = (yeniForm) => {
    setFormlar((prev) => [yeniForm, ...prev]);
    setFormEkleModalGorunur(false);
  };

  const filtrelenmisFormlar = formlar.filter((f) => {
    if (seciliKategori !== "tumu" && f.kategori !== seciliKategori) return false;
    if (aramaMetni) {
      const ara = aramaMetni.toLowerCase();
      return (
        (f.baslik || "").toLowerCase().includes(ara) ||
        (f.aciklama || "").toLowerCase().includes(ara)
      );
    }
    return true;
  });

  return (
    <div>
      {/* İstatistikler */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <DuyuruStatKart icon="📄" deger={formlar.length} etiket="Toplam Form" renk="#3b82f6" />
        <DuyuruStatKart icon="🎓" deger={formlar.filter((f) => f.kategori === "ogrenci").length} etiket="Öğrenci İşleri" renk="#1e40af" />
        <DuyuruStatKart icon="📚" deger={formlar.filter((f) => f.kategori === "akademik").length} etiket="Akademik" renk="#7c3aed" />
        <DuyuruStatKart icon="💼" deger={formlar.filter((f) => f.kategori === "staj").length} etiket="Staj/Kariyer" renk="#047857" />
      </div>

      {/* Admin: Form Ekle Butonu */}
      {isAdmin && (
        <div style={{ marginBottom: "16px" }}>
          <button
            onClick={() => setFormEkleModalGorunur(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px",
              borderRadius: "10px", fontSize: "13px", fontWeight: 600, backgroundColor: "#1e40af",
              color: "#fff", border: "none", cursor: "pointer", transition: "all 0.2s",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Yeni Form / Dosya Ekle
          </button>
        </div>
      )}

      {/* Kategori Filtreleri */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
        <button
          onClick={() => setSeciliKategori("tumu")}
          style={{
            padding: "6px 14px", borderRadius: "8px", fontSize: "12px",
            fontWeight: seciliKategori === "tumu" ? 700 : 500,
            backgroundColor: seciliKategori === "tumu" ? "#1f2937" : "#f9fafb",
            color: seciliKategori === "tumu" ? "#fff" : "#374151",
            border: seciliKategori === "tumu" ? "none" : "1px solid #e5e7eb",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          Tümü
        </button>
        {Object.entries(FORM_KATEGORILERI).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setSeciliKategori(key)}
            style={{
              padding: "6px 14px", borderRadius: "8px", fontSize: "12px",
              fontWeight: seciliKategori === key ? 700 : 500,
              backgroundColor: seciliKategori === key ? val.color : "#f9fafb",
              color: seciliKategori === key ? "#fff" : "#374151",
              border: seciliKategori === key ? "none" : "1px solid #e5e7eb",
              cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: "4px",
            }}
          >
            <span style={{ fontSize: "13px" }}>{val.icon}</span>
            {val.label}
          </button>
        ))}
      </div>

      {/* Arama */}
      <div style={{ position: "relative", marginBottom: "20px" }}>
        <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>
          <DuyuruSearchIcon />
        </div>
        <input
          type="text"
          placeholder="Formlarda ara..."
          value={aramaMetni}
          onChange={(e) => setAramaMetni(e.target.value)}
          style={{
            width: "100%", padding: "10px 12px 10px 38px", borderRadius: "10px",
            border: "1px solid #e5e7eb", fontSize: "13px", backgroundColor: "#f9fafb",
            outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
          onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
        />
      </div>

      {/* Form Listesi */}
      <div style={{ marginBottom: "24px" }}>
        {yukleniyor ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
            <p style={{ fontSize: "15px", fontWeight: 500 }}>Formlar yükleniyor...</p>
          </div>
        ) : filtrelenmisFormlar.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <p style={{ fontSize: "15px", fontWeight: 500 }}>
              {aramaMetni
                ? `"${aramaMetni}" ile eşleşen form bulunamadı`
                : formlar.length === 0
                ? (isAdmin ? "Henüz form eklenmemiş. Yukarıdaki butonu kullanarak form ekleyebilirsiniz." : "Henüz form eklenmemiş.")
                : "Bu filtrelere uygun form bulunamadı"}
            </p>
          </div>
        ) : (
          filtrelenmisFormlar.map((f, i) => (
            <div key={f.id} style={{ animation: `duyuruFadeIn 0.3s ease ${i * 0.05}s both` }}>
              <FormKarti form={f} isAdmin={isAdmin} onDelete={handleFormSil} />
            </div>
          ))
        )}
      </div>

      {/* Form Ekleme Modalı (Sadece Admin) */}
      {formEkleModalGorunur && isAdmin && (
        <FormEkleModal
          onKapat={() => setFormEkleModalGorunur(false)}
          onEklendi={handleFormEklendi}
        />
      )}
    </div>
  );
}

// ── Form Ekleme Modalı (Admin) ──────────────────────────────────────────────

function FormEkleModal({ onKapat, onEklendi }) {
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [kategori, setKategori] = useState("ogrenci");
  const [dosya, setDosya] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const dosyaInputRef = useRef(null);
  const FirebaseDB = window.FirebaseDB;

  const desteklenenTipler = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const dosyaSecildi = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!desteklenenTipler.includes(file.type)) {
      setHata("Yalnızca PDF ve Word (DOC/DOCX) dosyaları yüklenebilir.");
      setDosya(null);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setHata("Dosya boyutu 20MB'dan küçük olmalıdır.");
      setDosya(null);
      return;
    }
    setHata("");
    setDosya(file);
  };

  const formatBelirle = (file) => {
    if (!file) return "PDF";
    if (file.type === "application/pdf") return "PDF";
    return "DOCX";
  };

  const handleKaydet = async () => {
    if (!baslik.trim()) { setHata("Başlık zorunludur."); return; }
    if (!aciklama.trim()) { setHata("İçerik/açıklama zorunludur."); return; }
    if (!dosya) { setHata("Lütfen bir dosya seçin (PDF veya Word)."); return; }

    setYukleniyor(true);
    setHata("");
    try {
      // 1. Dosyayı Firebase Storage'a yükle
      const { downloadURL, fileName } = await FirebaseDB.uploadFormFile(dosya);

      // 2. Form bilgilerini Firestore'a kaydet
      const formData = {
        baslik: baslik.trim(),
        aciklama: aciklama.trim(),
        kategori,
        format: formatBelirle(dosya),
        downloadURL,
        storagePath: fileName,
        dosyaAdi: dosya.name,
      };
      const kaydedilen = await FirebaseDB.addForm(formData);
      onEklendi(kaydedilen);
    } catch (err) {
      console.error("Form ekleme hatasi:", err);
      setHata("Yükleme hatası: " + err.message);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000,
      backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{
        backgroundColor: "#fff", borderRadius: "16px", maxWidth: "540px", width: "100%",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)", overflow: "hidden",
        animation: "duyuruFadeIn 0.25s ease",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #e5e7eb",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#111827" }}>
            Yeni Form / Dosya Ekle
          </h2>
          <button onClick={onKapat} style={{
            background: "none", border: "none", cursor: "pointer", color: "#6b7280",
            padding: "4px", display: "flex", borderRadius: "8px",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          {/* Dosya Yükleme */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>
              Dosya (PDF veya Word) *
            </label>
            <input
              ref={dosyaInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={dosyaSecildi}
              style={{ display: "none" }}
            />
            <div
              onClick={() => dosyaInputRef.current?.click()}
              style={{
                border: `2px dashed ${dosya ? "#059669" : "#d1d5db"}`,
                borderRadius: "12px", padding: "24px", textAlign: "center", cursor: "pointer",
                backgroundColor: dosya ? "#f0fdf4" : "#f9fafb", transition: "all 0.2s",
              }}
            >
              {dosya ? (
                <div>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>
                    {dosya.type === "application/pdf" ? "📕" : "📘"}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#059669" }}>{dosya.name}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                    {(dosya.size / 1024 / 1024).toFixed(2)} MB - Değiştirmek için tıklayın
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#6b7280" }}>
                    PDF veya Word dosyası seçin
                  </div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
                    Maksimum 20MB
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Başlık */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
              Başlık *
            </label>
            <input
              type="text"
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              placeholder="Formun başlığını girin"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "10px",
                border: "1px solid #e5e7eb", fontSize: "14px", outline: "none",
                boxSizing: "border-box", transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
            />
          </div>

          {/* İçerik / Açıklama */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
              İçerik / Açıklama *
            </label>
            <textarea
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              placeholder="Form hakkında açıklama yazın"
              rows={3}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "10px",
                border: "1px solid #e5e7eb", fontSize: "14px", outline: "none",
                boxSizing: "border-box", resize: "vertical", fontFamily: "inherit",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
            />
          </div>

          {/* Kategori */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>
              Kategori *
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {Object.entries(FORM_KATEGORILERI).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setKategori(key)}
                  style={{
                    padding: "8px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 500,
                    backgroundColor: kategori === key ? val.color : "#f9fafb",
                    color: kategori === key ? "#fff" : "#374151",
                    border: kategori === key ? "none" : "1px solid #e5e7eb",
                    cursor: "pointer", transition: "all 0.15s",
                    display: "flex", alignItems: "center", gap: "6px",
                  }}
                >
                  <span>{val.icon}</span> {val.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hata */}
          {hata && (
            <div style={{
              padding: "10px 14px", marginBottom: "16px", borderRadius: "10px",
              backgroundColor: "#fef2f2", color: "#dc2626", fontSize: "13px",
              border: "1px solid #fecaca", display: "flex", alignItems: "center", gap: "8px",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {hata}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px", borderTop: "1px solid #e5e7eb",
          display: "flex", justifyContent: "flex-end", gap: "10px",
        }}>
          <button onClick={onKapat} disabled={yukleniyor} style={{
            padding: "10px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: 600,
            backgroundColor: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb",
            cursor: "pointer", transition: "all 0.15s",
          }}>
            İptal
          </button>
          <button onClick={handleKaydet} disabled={yukleniyor} style={{
            padding: "10px 24px", borderRadius: "10px", fontSize: "13px", fontWeight: 600,
            backgroundColor: yukleniyor ? "#9ca3af" : "#1e40af", color: "#fff",
            border: "none", cursor: yukleniyor ? "not-allowed" : "pointer",
            transition: "all 0.15s", display: "flex", alignItems: "center", gap: "8px",
          }}>
            {yukleniyor ? (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "duyuruSpin 1s linear infinite" }}><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" /></svg>Yükleniyor...</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>Kaydet ve Yükle</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANA BİLEŞEN — DuyuruEntegrasyonuApp
// ═══════════════════════════════════════════════════════════════════════════════

function DuyuruEntegrasyonuApp({ currentUser }) {
  // ── State ─────────────────────────────────────────────────────────────
  const [aktifSekme, setAktifSekme] = useState("duyurular");
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
  const [formSayisi, setFormSayisi] = useState(0);
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
    // Form sayisini da yukle
    const FirebaseDB = window.FirebaseDB;
    if (FirebaseDB?.isReady()) {
      FirebaseDB.fetchForms().then(forms => setFormSayisi(forms.length)).catch(() => {});
    }
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

      {/* ── Sekme Navigasyonu (Duyurular / Formlar) ──────────────── */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "20px",
          backgroundColor: "#f3f4f6",
          borderRadius: "12px",
          padding: "4px",
        }}
      >
        <button
          onClick={() => setAktifSekme("duyurular")}
          style={{
            flex: 1,
            padding: "10px 20px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: aktifSekme === "duyurular" ? 700 : 500,
            backgroundColor: aktifSekme === "duyurular" ? "#fff" : "transparent",
            color: aktifSekme === "duyurular" ? "#111827" : "#6b7280",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: aktifSekme === "duyurular" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Duyurular
          {okunmamisSayisi > 0 && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                backgroundColor: "#ef4444",
                color: "#fff",
                padding: "1px 7px",
                borderRadius: "9999px",
              }}
            >
              {okunmamisSayisi}
            </span>
          )}
        </button>
        <button
          onClick={() => setAktifSekme("formlar")}
          style={{
            flex: 1,
            padding: "10px 20px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: aktifSekme === "formlar" ? 700 : 500,
            backgroundColor: aktifSekme === "formlar" ? "#fff" : "transparent",
            color: aktifSekme === "formlar" ? "#111827" : "#6b7280",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: aktifSekme === "formlar" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Formlar
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              backgroundColor: "#3b82f6",
              color: "#fff",
              padding: "1px 7px",
              borderRadius: "9999px",
            }}
          >
            {formSayisi}
          </span>
        </button>
      </div>

      {/* ── Duyurular Sekmesi ────────────────────────────────────────── */}
      {aktifSekme === "duyurular" && (
        <div>
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
        </div>
      )}

      {/* ── Formlar Sekmesi ──────────────────────────────────────────── */}
      {aktifSekme === "formlar" && <FormlarBolumu currentUser={currentUser} onFormSayisiDegisti={setFormSayisi} />}

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
