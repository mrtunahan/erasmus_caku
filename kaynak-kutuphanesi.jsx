// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Kaynak Kütüphanesi
// Kategorize dosya arşivi, ders notları, sınav soruları, değerlendirme
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ── Renkler ──
const KTB = {
  primary: "#b45309",
  primaryLight: "#d97706",
  primaryPale: "#fef3c7",
  green: "#059669",
  greenLight: "#d1fae5",
  red: "#dc2626",
  redLight: "#fee2e2",
  blue: "#2563eb",
  blueLight: "#dbeafe",
  purple: "#7c3aed",
  purpleLight: "#ede9fe",
  bg: "#fffbeb",
  card: "#ffffff",
  text: "#1f2937",
  textMuted: "#6b7280",
  border: "#e5e7eb",
};

const RESOURCE_CATEGORIES = [
  { key: "ders-notu", label: "Ders Notları", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", color: "#3b82f6", bg: "#dbeafe" },
  { key: "sinav-sorusu", label: "Sınav Soruları", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01", color: "#dc2626", bg: "#fee2e2" },
  { key: "kitap", label: "Ders Kitapları", icon: "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5V5a2 2 0 012-2h14v14H6.5a2.5 2.5 0 00-2.5 2.5z", color: "#7c3aed", bg: "#ede9fe" },
  { key: "sunum", label: "Sunumlar", icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z", color: "#059669", bg: "#d1fae5" },
  { key: "odev", label: "Ödevler", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", color: "#ea580c", bg: "#ffedd5" },
  { key: "diger", label: "Diğer", icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4", color: "#6b7280", bg: "#f3f4f6" },
];

const FILE_TYPE_ICONS = {
  pdf: { color: "#dc2626", label: "PDF" },
  doc: { color: "#2563eb", label: "DOC" },
  docx: { color: "#2563eb", label: "DOCX" },
  ppt: { color: "#ea580c", label: "PPT" },
  pptx: { color: "#ea580c", label: "PPTX" },
  xls: { color: "#059669", label: "XLS" },
  xlsx: { color: "#059669", label: "XLSX" },
  zip: { color: "#6b7280", label: "ZIP" },
  rar: { color: "#6b7280", label: "RAR" },
  jpg: { color: "#8b5cf6", label: "JPG" },
  png: { color: "#8b5cf6", label: "PNG" },
  txt: { color: "#374151", label: "TXT" },
};

// ── SVG Icon Helper ──
const KtbIcon = ({ path, size, color }) => (
  <svg width={size || 18} height={size || 18} viewBox="0 0 24 24" fill="none"
    stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const KTB_ICONS = {
  folder: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
  file: "M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z M13 2v7h7",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  starFill: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  plus: "M12 5v14M5 12h14",
  x: "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  clock: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  sort: "M3 6h18M3 12h12M3 18h6",
};

// ══════════════════════════════════════════════════════════════
// ANA MODÜL
// ══════════════════════════════════════════════════════════════
function KaynakKutuphanesiApp({ currentUser }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest, downloads, rating
  const [selectedResource, setSelectedResource] = useState(null);

  const userId = currentUser?.studentNumber || currentUser?.name || "anonymous";
  const isAdmin = currentUser?.role === "admin";

  // ── Kaynakları Yükle ──
  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setLoading(true);
    try {
      const db = window.firebase?.firestore();
      if (!db) { setLoading(false); return; }
      const snapshot = await db.collection("resources").orderBy("createdAt", "desc").get();
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setResources(data);
    } catch (e) {
      console.error("Kaynaklar yuklenemedi:", e);
    }
    setLoading(false);
  };

  // ── Kaynak Ekle ──
  const handleUploadResource = async (resourceData) => {
    try {
      const db = window.firebase?.firestore();
      if (!db) return;

      // Yinelenen dosya kontrolü
      const isDuplicate = resources.some(r =>
        r.fileName === resourceData.fileName &&
        r.category === resourceData.category &&
        r.courseCode === resourceData.courseCode
      );

      if (isDuplicate) {
        if (!confirm("Bu isimde bir dosya zaten mevcut. Yine de eklemek istiyor musunuz?")) return;
      }

      const docData = {
        ...resourceData,
        downloadCount: 0,
        ratings: {},
        averageRating: 0,
        ratingCount: 0,
        uploadedBy: userId,
        uploadedByName: currentUser?.name || userId,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("resources").add(docData);
      setResources(prev => [{ ...docData, id: docRef.id }, ...prev]);
      setShowUploadModal(false);
    } catch (e) {
      console.error("Kaynak eklenemedi:", e);
      alert("Kaynak eklenirken hata oluştu!");
    }
  };

  // ── İndirme Sayacı ──
  const handleDownload = async (resource) => {
    try {
      const db = window.firebase?.firestore();
      if (!db || resource.id.startsWith("sample_")) return;

      await db.collection("resources").doc(resource.id).update({
        downloadCount: window.firebase.firestore.FieldValue.increment(1),
      });

      setResources(prev => prev.map(r =>
        r.id === resource.id ? { ...r, downloadCount: (r.downloadCount || 0) + 1 } : r
      ));

      // Gerçek dosya indirme - URL varsa aç
      if (resource.fileUrl) {
        window.open(resource.fileUrl, "_blank");
      }
    } catch (e) {
      console.error("Indirme sayaci hatasi:", e);
    }
  };

  // ── Değerlendirme ──
  const handleRate = async (resourceId, rating) => {
    try {
      const db = window.firebase?.firestore();
      if (!db) return;

      const resource = resources.find(r => r.id === resourceId);
      if (!resource) return;

      const updatedRatings = { ...(resource.ratings || {}), [userId]: rating };
      const ratingValues = Object.values(updatedRatings);
      const averageRating = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;

      await db.collection("resources").doc(resourceId).update({
        ratings: updatedRatings,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingCount: ratingValues.length,
      });

      setResources(prev => prev.map(r =>
        r.id === resourceId
          ? { ...r, ratings: updatedRatings, averageRating: Math.round(averageRating * 10) / 10, ratingCount: ratingValues.length }
          : r
      ));
    } catch (e) {
      console.error("Degerlendirme hatasi:", e);
    }
  };

  // ── Kaynak Sil ──
  const handleDeleteResource = async (resourceId) => {
    if (!confirm("Bu kaynağı silmek istediğinize emin misiniz?")) return;
    try {
      const db = window.firebase?.firestore();
      if (!db) return;
      await db.collection("resources").doc(resourceId).delete();
      setResources(prev => prev.filter(r => r.id !== resourceId));
      if (selectedResource?.id === resourceId) setSelectedResource(null);
    } catch (e) {
      console.error("Kaynak silinemedi:", e);
    }
  };

  // ── Filtre & Sıralama ──
  const filteredResources = useMemo(() => {
    let result = resources;

    if (selectedCategory !== "all") {
      result = result.filter(r => r.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        r.courseCode?.toLowerCase().includes(q) ||
        r.fileName?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case "downloads":
        result = [...result].sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0));
        break;
      case "rating":
        result = [...result].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      default: // newest
        break;
    }

    return result;
  }, [resources, selectedCategory, searchQuery, sortBy]);

  // ── Kategori İstatistikleri ──
  const categoryStats = useMemo(() => {
    const stats = { all: resources.length };
    RESOURCE_CATEGORIES.forEach(cat => {
      stats[cat.key] = resources.filter(r => r.category === cat.key).length;
    });
    return stats;
  }, [resources]);

  const getFileTypeInfo = (fileName) => {
    if (!fileName) return { color: "#6b7280", label: "FILE" };
    const ext = fileName.split(".").pop().toLowerCase();
    return FILE_TYPE_ICONS[ext] || { color: "#6b7280", label: ext.toUpperCase() };
  };

  const getCategoryInfo = (catKey) => RESOURCE_CATEGORIES.find(c => c.key === catKey) || RESOURCE_CATEGORIES[RESOURCE_CATEGORIES.length - 1];

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ background: KTB.bg, minHeight: "100vh", padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #92400e 0%, #b45309 50%, #d97706 100%)",
        padding: "32px 0 24px", marginBottom: 24,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ color: "white", fontSize: 28, fontWeight: 700, fontFamily: "'Playfair Display', serif", display: "flex", alignItems: "center", gap: 10 }}>
                <KtbIcon path={KTB_ICONS.folder} size={28} color="rgba(255,255,255,0.8)" /> Kaynak Kütüphanesi
              </h1>
              <p style={{ color: "rgba(255,255,255,0.7)", marginTop: 4, fontSize: 14 }}>
                Ders notları, sınav soruları ve akademik kaynaklar
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              style={{
                background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <KtbIcon path={KTB_ICONS.upload} size={18} color="white" /> Kaynak Yükle
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        {/* Arama & Filtre Bar */}
        <div style={{
          background: "white", borderRadius: 12, padding: 16, marginBottom: 20,
          border: `1px solid ${KTB.border}`, display: "flex", gap: 12, alignItems: "center",
        }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Kaynak ara (ders kodu, dosya adı, başlık)..."
              style={{
                width: "100%", padding: "10px 14px 10px 36px", border: `1px solid ${KTB.border}`,
                borderRadius: 8, fontSize: 14, outline: "none",
              }}
            />
            <KtbIcon path={KTB_ICONS.search} size={16} color="#9ca3af" />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{
              padding: "10px 14px", border: `1px solid ${KTB.border}`, borderRadius: 8,
              fontSize: 13, outline: "none", background: "white", cursor: "pointer",
            }}>
            <option value="newest">En Yeni</option>
            <option value="downloads">En Çok İndirilen</option>
            <option value="rating">En Yüksek Puan</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          {/* Sol: Kategori Menüsü */}
          <div style={{ width: 240, flexShrink: 0 }}>
            <div style={{
              background: "white", borderRadius: 12, overflow: "hidden",
              border: `1px solid ${KTB.border}`, position: "sticky", top: 120,
            }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${KTB.border}`, fontWeight: 700, fontSize: 14, color: KTB.text }}>
                <KtbIcon path={KTB_ICONS.folder} size={16} /> Kategoriler
              </div>
              <div
                onClick={() => setSelectedCategory("all")}
                style={{
                  padding: "10px 16px", cursor: "pointer", fontSize: 13,
                  background: selectedCategory === "all" ? KTB.primaryPale : "white",
                  color: selectedCategory === "all" ? KTB.primary : KTB.text,
                  fontWeight: selectedCategory === "all" ? 600 : 400,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  borderBottom: `1px solid ${KTB.border}`,
                }}
              >
                <span>Tümü</span>
                <span style={{ fontSize: 11, background: "#f3f4f6", padding: "2px 8px", borderRadius: 10 }}>
                  {categoryStats.all}
                </span>
              </div>
              {RESOURCE_CATEGORIES.map(cat => (
                <div
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  style={{
                    padding: "10px 16px", cursor: "pointer", fontSize: 13,
                    background: selectedCategory === cat.key ? cat.bg : "white",
                    color: selectedCategory === cat.key ? cat.color : KTB.text,
                    fontWeight: selectedCategory === cat.key ? 600 : 400,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    borderBottom: `1px solid ${KTB.border}`,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (selectedCategory !== cat.key) e.currentTarget.style.background = "#fafafa"; }}
                  onMouseLeave={e => { if (selectedCategory !== cat.key) e.currentTarget.style.background = "white"; }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <KtbIcon path={cat.icon} size={14} color={cat.color} />
                    {cat.label}
                  </span>
                  <span style={{
                    fontSize: 11, background: selectedCategory === cat.key ? "rgba(255,255,255,0.6)" : "#f3f4f6",
                    padding: "2px 8px", borderRadius: 10,
                  }}>
                    {categoryStats[cat.key] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sağ: Kaynak Listesi */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: KTB.textMuted }}>Yükleniyor...</div>
            ) : filteredResources.length === 0 ? (
              <div style={{
                background: "white", borderRadius: 16, padding: 60, textAlign: "center",
                border: `1px solid ${KTB.border}`,
              }}>
                <KtbIcon path={KTB_ICONS.folder} size={48} color="#d1d5db" />
                <h3 style={{ color: KTB.textMuted, marginTop: 16 }}>
                  {searchQuery ? "Sonuç bulunamadı" : "Bu kategoride kaynak yok"}
                </h3>
                <p style={{ color: "#9ca3af", fontSize: 14, marginTop: 8 }}>
                  İlk kaynağı siz paylaşın!
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filteredResources.map(resource => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    userId={userId}
                    isAdmin={isAdmin}
                    onDownload={handleDownload}
                    onRate={handleRate}
                    onDelete={handleDeleteResource}
                    getFileTypeInfo={getFileTypeInfo}
                    getCategoryInfo={getCategoryInfo}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Yükleme Modalı */}
      {showUploadModal && (
        <UploadResourceModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUploadResource}
          categories={RESOURCE_CATEGORIES}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// KAYNAK KARTI
// ══════════════════════════════════════════════════════════════
function ResourceCard({ resource, userId, isAdmin, onDownload, onRate, onDelete, getFileTypeInfo, getCategoryInfo }) {
  const [hoverRating, setHoverRating] = useState(0);
  const fileType = getFileTypeInfo(resource.fileName);
  const cat = getCategoryInfo(resource.category);
  const userRating = resource.ratings?.[userId] || 0;
  const isOwner = resource.uploadedBy === userId;

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  };

  const renderStars = (rating, interactive = false) => {
    return (
      <div style={{ display: "flex", gap: 2 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            onClick={interactive ? (e) => { e.stopPropagation(); onRate(resource.id, star); } : undefined}
            onMouseEnter={interactive ? () => setHoverRating(star) : undefined}
            onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
            style={{
              cursor: interactive ? "pointer" : "default",
              fontSize: 16,
              color: star <= (hoverRating || userRating || rating) ? "#f59e0b" : "#d1d5db",
              transition: "color 0.15s",
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div style={{
      background: "white", borderRadius: 12, padding: 16,
      border: `1px solid ${KTB.border}`, display: "flex", gap: 16,
      transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = cat.color; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = KTB.border; }}
    >
      {/* Dosya Tipi İkonu */}
      <div style={{
        width: 56, height: 56, borderRadius: 10, background: cat.bg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: fileType.color,
          background: "white", borderRadius: 4, padding: "2px 6px",
        }}>
          {fileType.label}
        </div>
      </div>

      {/* İçerik */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: KTB.text }}>{resource.title}</h4>
              <span style={{
                background: cat.bg, color: cat.color, padding: "2px 8px",
                borderRadius: 4, fontSize: 11, fontWeight: 600,
              }}>
                {cat.label}
              </span>
            </div>
            {resource.description && (
              <p style={{ fontSize: 13, color: KTB.textMuted, marginBottom: 6 }}>{resource.description}</p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: KTB.textMuted }}>
              {resource.courseCode && (
                <span style={{
                  background: "#f3f4f6", padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                }}>
                  {resource.courseCode}
                </span>
              )}
              <span>{resource.fileName}</span>
              {resource.fileSize && <span>{resource.fileSize}</span>}
              <span><KtbIcon path={KTB_ICONS.download} size={11} /> {resource.downloadCount || 0} indirme</span>
              <span>Yükleyen: {resource.uploadedByName}</span>
              <span>{formatDate(resource.createdAt)}</span>
            </div>
          </div>

          {/* Aksiyonlar */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {(isAdmin || isOwner) && (
              <button
                onClick={() => onDelete(resource.id)}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: KTB.textMuted, padding: 4,
                }}
                title="Sil"
              >
                <KtbIcon path={KTB_ICONS.trash} size={16} />
              </button>
            )}
            <button
              onClick={() => onDownload(resource)}
              style={{
                background: `linear-gradient(135deg, ${KTB.primary}, ${KTB.primaryLight})`,
                color: "white", border: "none", borderRadius: 8, padding: "8px 16px",
                cursor: "pointer", fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <KtbIcon path={KTB_ICONS.download} size={14} color="white" /> İndir
            </button>
          </div>
        </div>

        {/* Değerlendirme */}
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: KTB.textMuted }}>Değerlendir:</span>
            {renderStars(resource.averageRating || 0, true)}
          </div>
          {resource.ratingCount > 0 && (
            <span style={{ fontSize: 12, color: KTB.textMuted }}>
              {resource.averageRating} / 5 ({resource.ratingCount} değerlendirme)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// KAYNAK YÜKLEME MODALI
// ══════════════════════════════════════════════════════════════
function UploadResourceModal({ onClose, onUpload, categories }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("ders-notu");
  const [courseCode, setCourseCode] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const catalogCourses = window.HOME_INSTITUTION_CATALOG?.courses || [];
  const courseSuggestions = useMemo(() => {
    if (!courseCode || courseCode.length < 2) return [];
    const q = courseCode.toUpperCase();
    return catalogCourses.filter(c => c.code.includes(q) || c.name.toLowerCase().includes(courseCode.toLowerCase())).slice(0, 5);
  }, [courseCode]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFileName(file.name);
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    setFileSize(`${sizeMB} MB`);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));

    // Firebase Storage'a yükle
    uploadToStorage(file);
  };

  const uploadToStorage = async (file) => {
    try {
      const storage = window.firebase?.storage();
      if (!storage) {
        console.warn("Firebase Storage kullanamıyor - dosya bilgileri kaydedilecek");
        return;
      }
      const ref = storage.ref(`resources/${Date.now()}_${file.name}`);
      const snapshot = await ref.put(file);
      const url = await snapshot.ref.getDownloadURL();
      setFileUrl(url);
    } catch (e) {
      console.error("Storage yuklemesi basarisiz:", e);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) { alert("Başlık zorunludur!"); return; }
    if (!fileName) { alert("Dosya seçiniz!"); return; }
    onUpload({
      title: title.trim(),
      description: description.trim(),
      category,
      courseCode: courseCode.trim().toUpperCase(),
      fileName,
      fileSize,
      fileUrl,
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "white", borderRadius: 16, padding: 32, width: 520, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)", animation: "fadeInUp 0.2s ease-out",
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: KTB.text, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <KtbIcon path={KTB_ICONS.upload} size={20} color={KTB.primary} /> Kaynak Yükle
        </h3>

        {/* Dosya Seçimi */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Dosya *</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${fileName ? KTB.green : KTB.border}`,
              borderRadius: 10, padding: 24, textAlign: "center", cursor: "pointer",
              background: fileName ? KTB.greenLight : "#fafafa",
              transition: "all 0.2s",
            }}
          >
            {fileName ? (
              <div>
                <KtbIcon path={KTB_ICONS.check} size={24} color={KTB.green} />
                <div style={{ fontSize: 14, fontWeight: 600, color: KTB.text, marginTop: 6 }}>{fileName}</div>
                <div style={{ fontSize: 12, color: KTB.textMuted }}>{fileSize}</div>
              </div>
            ) : (
              <div>
                <KtbIcon path={KTB_ICONS.upload} size={32} color="#9ca3af" />
                <div style={{ fontSize: 14, color: KTB.textMuted, marginTop: 8 }}>
                  Dosya seçmek için tıklayın
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                  PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP, vb.
                </div>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileSelect} />
        </div>

        {/* Başlık */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Başlık *</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Kaynak başlığı..."
            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${KTB.border}`, borderRadius: 8, fontSize: 14, outline: "none" }} />
        </div>

        {/* Kategori */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Kategori</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${KTB.border}`, borderRadius: 8, fontSize: 14, outline: "none", background: "white" }}>
            {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        {/* Ders Kodu */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Ders Kodu</label>
          <input type="text" value={courseCode} onChange={e => setCourseCode(e.target.value)} placeholder="Örn: MAT101"
            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${KTB.border}`, borderRadius: 8, fontSize: 14, outline: "none" }} />
          {courseSuggestions.length > 0 && (
            <div style={{
              border: `1px solid ${KTB.border}`, borderRadius: 8, marginTop: 4,
              background: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}>
              {courseSuggestions.map(s => (
                <div key={s.code}
                  onClick={() => setCourseCode(s.code)}
                  style={{ padding: "6px 12px", cursor: "pointer", fontSize: 13, borderBottom: `1px solid ${KTB.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = KTB.primaryPale}
                  onMouseLeave={e => e.currentTarget.style.background = "white"}
                >
                  <strong>{s.code}</strong> — {s.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Açıklama */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Açıklama</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Kaynak hakkında bilgi..."
            rows={2} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${KTB.border}`, borderRadius: 8, fontSize: 14, resize: "vertical", outline: "none", fontFamily: "'Source Sans 3', sans-serif" }} />
        </div>

        {/* Butonlar */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose}
            style={{ padding: "10px 20px", border: `1px solid ${KTB.border}`, background: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, color: KTB.textMuted }}>
            İptal
          </button>
          <button onClick={handleSubmit}
            style={{ padding: "10px 24px", border: "none", background: `linear-gradient(135deg, ${KTB.primary}, ${KTB.primaryLight})`, color: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            Yükle
          </button>
        </div>
      </div>
    </div>
  );
}

// Export
window.KaynakKutuphanesiApp = KaynakKutuphanesiApp;
