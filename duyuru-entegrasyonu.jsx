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

// ── CORS Proxy'ler (birden fazla fallback) ───────────────────────────────────
const CORS_PROXIES = [
  function(url) { return "https://api.allorigins.win/get?url=" + encodeURIComponent(url); },
  function(url) { return "https://corsproxy.io/?" + encodeURIComponent(url); },
  function(url) { return "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(url); },
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

// ── HTML'den duyuruları parse et (DOMParser) ────────────────────────────────
function htmldenDuyurulariCikar(htmlString, kaynakId, kaynakBaseUrl) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(htmlString, "text/html");
  var duyurular = [];
  var idSayac = 0;

  // Strateji 1: Tablo yapısı (Karatekin CMS genelde tablo kullanır)
  var satirlar = doc.querySelectorAll("table tr, table tbody tr");
  if (satirlar.length > 1) {
    satirlar.forEach(function(tr) {
      var link = tr.querySelector("a[href]");
      var hucreler = tr.querySelectorAll("td");
      if (!link || hucreler.length < 1) return;

      var baslik = link.textContent.trim();
      if (!baslik || baslik.length < 5) return;

      var href = link.getAttribute("href") || "";
      if (href && !href.startsWith("http")) {
        href = kaynakBaseUrl + (href.startsWith("/") ? "" : "/") + href;
      }

      // Son hücreden tarih çıkarmayı dene
      var tarih = "";
      for (var i = hucreler.length - 1; i >= 0; i--) {
        var hucreMetin = hucreler[i].textContent.trim();
        var tarihMatch = hucreMetin.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
        if (tarihMatch) {
          var gun = tarihMatch[1].padStart(2, "0");
          var ay = tarihMatch[2].padStart(2, "0");
          var yil = tarihMatch[3].length === 2 ? "20" + tarihMatch[3] : tarihMatch[3];
          tarih = yil + "-" + ay + "-" + gun;
          break;
        }
      }

      duyurular.push({
        id: kaynakId + "_" + (++idSayac),
        baslik: baslik,
        ozet: "",
        tarih: tarih || new Date().toISOString().split("T")[0],
        kaynak: kaynakId,
        kategori: kategoriBelirle(baslik),
        url: href,
        okundu: false,
        pinli: false,
      });
    });
  }

  // Strateji 2: Kart/Liste yapısı
  if (duyurular.length === 0) {
    var kartSeciciler = [
      "div.duyuru-item", "div.duyuru-listesi li", "div.content-list .item",
      "div.news-list .item", "div.icerik-listesi li", "article",
      "div.card", "li.list-group-item",
    ];
    kartSeciciler.forEach(function(sel) {
      if (duyurular.length > 0) return;
      var elemanlar = doc.querySelectorAll(sel);
      elemanlar.forEach(function(el) {
        var link = el.querySelector("a[href]");
        if (!link) return;
        var baslik = link.textContent.trim();
        if (!baslik || baslik.length < 5) return;

        var href = link.getAttribute("href") || "";
        if (href && !href.startsWith("http")) {
          href = kaynakBaseUrl + (href.startsWith("/") ? "" : "/") + href;
        }

        var tarihEl = el.querySelector("time, span.tarih, small.tarih, span.date, small");
        var tarih = "";
        if (tarihEl) {
          var tarihMatch = tarihEl.textContent.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
          if (tarihMatch) {
            var gun = tarihMatch[1].padStart(2, "0");
            var ay = tarihMatch[2].padStart(2, "0");
            var yil = tarihMatch[3].length === 2 ? "20" + tarihMatch[3] : tarihMatch[3];
            tarih = yil + "-" + ay + "-" + gun;
          }
        }

        var ozetEl = el.querySelector("p, div.ozet, span.aciklama, div.summary");
        var ozet = (ozetEl && ozetEl !== link) ? ozetEl.textContent.trim().substring(0, 300) : "";

        duyurular.push({
          id: kaynakId + "_" + (++idSayac),
          baslik: baslik,
          ozet: ozet,
          tarih: tarih || new Date().toISOString().split("T")[0],
          kaynak: kaynakId,
          kategori: kategoriBelirle(baslik),
          url: href,
          okundu: false,
          pinli: false,
        });
      });
    });
  }

  // Strateji 3: Fallback — sayfadaki duyuru/haber/icerik linklerini topla
  if (duyurular.length === 0) {
    var tumLinkler = doc.querySelectorAll("a[href]");
    var gorulenUrl = {};
    tumLinkler.forEach(function(a) {
      var href = a.getAttribute("href") || "";
      var baslik = a.textContent.trim();
      if (!baslik || baslik.length < 10) return;

      var anahtar = ["duyur", "haber", "icerik", "etkinlik", "announce"];
      var eslesti = anahtar.some(function(kw) { return href.toLowerCase().includes(kw); });
      if (!eslesti) return;

      if (!href.startsWith("http")) {
        href = kaynakBaseUrl + (href.startsWith("/") ? "" : "/") + href;
      }
      if (gorulenUrl[href]) return;
      gorulenUrl[href] = true;

      duyurular.push({
        id: kaynakId + "_" + (++idSayac),
        baslik: baslik,
        ozet: "",
        tarih: new Date().toISOString().split("T")[0],
        kaynak: kaynakId,
        kategori: kategoriBelirle(baslik),
        url: href,
        okundu: false,
        pinli: false,
      });
    });
  }

  return duyurular;
}

// ── CORS proxy ile sayfa HTML'ini fetch et ──────────────────────────────────
async function sayfayiFetchEt(url) {
  for (var i = 0; i < CORS_PROXIES.length; i++) {
    var proxyUrl = CORS_PROXIES[i](url);
    try {
      var response = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) continue;

      var contentType = response.headers.get("content-type") || "";

      // allorigins.win JSON döndürür
      if (contentType.includes("application/json") || proxyUrl.includes("allorigins")) {
        var json = await response.json();
        var html = json.contents || json.body || json.data || "";
        if (html && html.length > 500) return html;
      } else {
        var text = await response.text();
        if (text && text.length > 500) return text;
      }
    } catch (e) {
      console.warn("Proxy " + i + " basarisiz:", e.message);
    }
  }
  return null;
}

// ── Tüm kaynaklardan duyuruları çek ─────────────────────────────────────────
async function tumKaynaklardanCek(aktifKaynaklar) {
  var tumDuyurular = [];

  for (var k = 0; k < DUYURU_KAYNAKLARI.length; k++) {
    var kaynak = DUYURU_KAYNAKLARI[k];
    if (!aktifKaynaklar.includes(kaynak.id)) continue;

    console.log("Duyurular cekiliyor: " + kaynak.label + " (" + kaynak.url + ")");
    var html = await sayfayiFetchEt(kaynak.url);
    if (!html) {
      console.warn(kaynak.label + " icin HTML alinamadi");
      continue;
    }

    var baseUrl = kaynak.url.replace(/\/tr\/.*$/, "");
    var duyurular = htmldenDuyurulariCikar(html, kaynak.id, baseUrl);
    console.log(kaynak.label + ": " + duyurular.length + " duyuru bulundu");
    tumDuyurular = tumDuyurular.concat(duyurular);
  }

  return tumDuyurular;
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

  // ── Duyuruları canlı olarak kaynak sitelerden çek ───────────────────────
  const duyurulariGuncelle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const yeniDuyurular = await tumKaynaklardanCek(ayarlar.aktifKaynaklar);

      if (yeniDuyurular.length === 0) {
        setHata("Kaynak sitelerden duyuru çekilemedi. Siteler geçici olarak erişilemez olabilir.");
        setYukleniyor(false);
        return;
      }

      setDuyurular((prev) => {
        // Okundu durumlarını koru
        const okunduMap = {};
        prev.forEach((d) => { if (d.okundu) okunduMap[d.id] = true; });

        const sonuc = yeniDuyurular.map((d) => ({
          ...d,
          okundu: okunduMap[d.id] || false,
        }));

        // Yeni duyuru sayısını hesapla
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
    } catch (err) {
      console.error("Duyuru yukleme hatasi:", err);
      setHata("Duyuru verisi yüklenirken hata oluştu: " + err.message);
    }
    setYukleniyor(false);
  }, [ayarlar.aktifKaynaklar]);

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
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            padding: "14px 18px",
            fontSize: "13px",
            color: "#991b1b",
            lineHeight: 1.6,
          }}
        >
          <strong>Bağlantı hatası:</strong> {hata}
          <div style={{ marginTop: "8px", fontSize: "12px", color: "#b91c1c" }}>
            Kaynak sitelere erişim sağlanamıyor. Lütfen internet bağlantınızı kontrol edip
            {" "}<strong>Şimdi Güncelle</strong> butonuna tekrar basın.
          </div>
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
