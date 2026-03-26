// ══════════════════════════════════════════════════════════════
// Akademisyen Modülü - ÇAKUAVİS Entegrasyonu
// Bölüm akademisyenlerinin bilgilerini çeker ve gösterir
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useCallback } = React;

const C = window.C;
const Card = window.Card;
const Btn = window.Btn;
const Modal = window.Modal;
const Input = window.Input;
const Badge = window.Badge;
const FormField = window.FormField;

// GhostBtn - lokal tanım (shared-components'ta yok)
var GhostBtn = function({ children, onClick, disabled, style: customStyle }) {
  return React.createElement("button", {
    onClick: onClick,
    disabled: disabled,
    style: Object.assign({
      padding: "8px 16px", background: "transparent", border: "1px solid " + (C ? C.border : "#E5E1D8"),
      borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontSize: 13,
      color: C ? C.text : "#1B2A4A", fontWeight: 500, opacity: disabled ? 0.5 : 1,
    }, customStyle || {})
  }, children);
};

// ── Renk paleti ──
const COLORS = {
  primary: "#1B2A4A",
  accent: "#2563EB",
  bg: "#F7F5F0",
  cardBg: "#FFFFFF",
  border: "#E5E1D8",
  text: "#1B2A4A",
  textLight: "#6B7280",
  success: "#059669",
  warning: "#D97706",
};

// ── Section ikonları ──
const SECTION_ICONS = {
  education: "🎓",
  researchAreas: "🔬",
  experience: "💼",
  theses: "📑",
  courses: "📚",
  publications: "📝",
  projects: "🚀",
  activities: "🏆",
  awards: "⭐",
};

// ── Akademisyen Kart Bileşeni ──
function AcademicianCard({ prof, onSelect, isSelected }) {
  return (
    <div
      onClick={function() { onSelect(prof); }}
      style={{
        background: isSelected ? "#EBF5FF" : COLORS.cardBg,
        border: "1px solid " + (isSelected ? COLORS.accent : COLORS.border),
        borderRadius: 12,
        padding: 16,
        cursor: "pointer",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      {prof.photo ? (
        <img
          src={prof.photo}
          alt={prof.fullName}
          style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid " + COLORS.border }}
          onError={function(e) { e.target.style.display = "none"; }}
        />
      ) : (
        <div style={{
          width: 56, height: 56, borderRadius: "50%", background: COLORS.accent + "20",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, fontWeight: 700, color: COLORS.accent,
        }}>
          {(prof.fullName || "?").charAt(0)}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {prof.fullName || prof.name || prof.username}
        </div>
        {prof.email && (
          <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 2 }}>{prof.email}</div>
        )}
        {prof.department && (
          <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 2 }}>{prof.department}</div>
        )}
      </div>
      {prof.fetchedAt && (
        <div style={{ fontSize: 10, color: COLORS.textLight }}>
          {new Date(prof.fetchedAt).toLocaleDateString("tr-TR")}
        </div>
      )}
    </div>
  );
}

// ── Akademisyen Detay Sayfası ──
function AcademicianDetail({ data, onBack }) {
  var [activeSection, setActiveSection] = useState(null);

  if (!data) return null;

  var sectionKeys = Object.keys(data.sections || {});

  return (
    <div>
      {/* Üst Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <GhostBtn onClick={onBack} style={{ fontSize: 13 }}>← Geri</GhostBtn>
        <a
          href={"https://cakuavis.karatekin.edu.tr/" + data.username}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: COLORS.accent, textDecoration: "none", marginLeft: "auto" }}
        >
          ÇAKUAVİS Profili →
        </a>
      </div>

      {/* Profil Kartı */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {data.photo ? (
            <img
              src={data.photo}
              alt={data.fullName}
              style={{ width: 120, height: 120, borderRadius: 12, objectFit: "cover", border: "3px solid " + COLORS.border }}
            />
          ) : (
            <div style={{
              width: 120, height: 120, borderRadius: 12, background: COLORS.accent + "15",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 40, fontWeight: 700, color: COLORS.accent,
            }}>
              {(data.fullName || "?").charAt(0)}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 8px 0" }}>
              {data.fullName}
            </h2>
            {data.department && (
              <div style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 8 }}>{data.department}</div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13 }}>
              {data.email && (
                <div>
                  <span style={{ color: COLORS.textLight }}>E-posta: </span>
                  <a href={"mailto:" + data.email} style={{ color: COLORS.accent, textDecoration: "none" }}>{data.email}</a>
                </div>
              )}
              {data.phone && (
                <div>
                  <span style={{ color: COLORS.textLight }}>Tel: </span>
                  <span>{data.phone}</span>
                </div>
              )}
              {data.web && (
                <div>
                  <a href={data.web} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.accent, textDecoration: "none" }}>
                    Web Sitesi
                  </a>
                </div>
              )}
            </div>

            {/* Akademik Linkler */}
            {data.links && Object.keys(data.links).length > 0 && (
              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                {data.links.yoksis && (
                  <a href={data.links.yoksis} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "4px 10px", background: "#FEF3C7", color: "#92400E", borderRadius: 6, fontSize: 11, textDecoration: "none", fontWeight: 600 }}>
                    YÖKSİS
                  </a>
                )}
                {data.links.orcid && (
                  <a href={data.links.orcid} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "4px 10px", background: "#D1FAE5", color: "#065F46", borderRadius: 6, fontSize: 11, textDecoration: "none", fontWeight: 600 }}>
                    ORCID
                  </a>
                )}
                {data.links.scholar && (
                  <a href={data.links.scholar} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "4px 10px", background: "#DBEAFE", color: "#1E40AF", borderRadius: 6, fontSize: 11, textDecoration: "none", fontWeight: 600 }}>
                    Google Scholar
                  </a>
                )}
                {data.links.wos && (
                  <a href={data.links.wos} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "4px 10px", background: "#EDE9FE", color: "#5B21B6", borderRadius: 6, fontSize: 11, textDecoration: "none", fontWeight: 600 }}>
                    Web of Science
                  </a>
                )}
              </div>
            )}

            {/* İstatistikler */}
            {data.stats && Object.keys(data.stats).length > 0 && (
              <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                {Object.keys(data.stats).map(function(key) {
                  return (
                    <div key={key} style={{ textAlign: "center", padding: "8px 16px", background: COLORS.bg, borderRadius: 8 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.accent }}>{data.stats[key]}</div>
                      <div style={{ fontSize: 11, color: COLORS.textLight, textTransform: "capitalize" }}>{key}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Bölümler */}
      {sectionKeys.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sectionKeys.map(function(key) {
            var section = data.sections[key];
            var isOpen = activeSection === key;
            return (
              <Card key={key} style={{ padding: 0, overflow: "hidden" }}>
                <div
                  onClick={function() { setActiveSection(isOpen ? null : key); }}
                  style={{
                    padding: "14px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                    background: isOpen ? COLORS.accent + "08" : "transparent",
                    borderBottom: isOpen ? "1px solid " + COLORS.border : "none",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{SECTION_ICONS[key] || "📄"}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{section.label}</span>
                  <Badge style={{ background: COLORS.accent + "15", color: COLORS.accent }}>{section.items.length}</Badge>
                  <span style={{ fontSize: 12, color: COLORS.textLight }}>{isOpen ? "▲" : "▼"}</span>
                </div>
                {isOpen && (
                  <div style={{ padding: "12px 20px" }}>
                    {section.items.map(function(item, i) {
                      return (
                        <div key={i} style={{
                          padding: "10px 0",
                          borderBottom: i < section.items.length - 1 ? "1px solid " + COLORS.border + "80" : "none",
                          fontSize: 13,
                          lineHeight: 1.6,
                          color: COLORS.text,
                        }}>
                          {item}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div style={{ textAlign: "center", padding: 30, color: COLORS.textLight }}>
            Henüz detay bilgisi yüklenmedi.
          </div>
        </Card>
      )}

      {data.lastUpdate && (
        <div style={{ textAlign: "right", fontSize: 11, color: COLORS.textLight, marginTop: 12 }}>
          YÖKSİS Son Güncelleme: {data.lastUpdate}
        </div>
      )}
    </div>
  );
}

// ── Ana Modül Bileşeni ──
function AkademisyenModuluApp({ currentUser, activeDepartment, departmentInfo }) {
  var [professors, setProfessors] = useState([]);
  var [selectedProf, setSelectedProf] = useState(null);
  var [profDetail, setProfDetail] = useState(null);
  var [loading, setLoading] = useState(false);
  var [addModal, setAddModal] = useState(false);
  var [newUsername, setNewUsername] = useState("");
  var [searchTerm, setSearchTerm] = useState("");

  var isAdmin = currentUser && currentUser.role === "admin";
  var isDeptManager = currentUser && currentUser.role === "bolum_yetkilisi";
  var canManage = isAdmin || isDeptManager;

  // Akademisyen listesini yükle
  var loadProfessors = useCallback(function() {
    setLoading(true);
    var token = localStorage.getItem("caku_auth_token");
    var headers = {};
    if (token) headers["Authorization"] = "Bearer " + token;

    fetch("/api/akademisyen", { headers: headers })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (Array.isArray(data)) {
          setProfessors(data);
        }
        setLoading(false);
      })
      .catch(function() { setLoading(false); });
  }, []);

  useEffect(function() { loadProfessors(); }, [loadProfessors]);

  // Akademisyen detayını yükle
  var loadDetail = useCallback(function(username) {
    setLoading(true);
    var token = localStorage.getItem("caku_auth_token");
    var headers = {};
    if (token) headers["Authorization"] = "Bearer " + token;

    fetch("/api/akademisyen/" + encodeURIComponent(username), { headers: headers })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        setProfDetail(data);
        setLoading(false);
      })
      .catch(function(err) {
        alert("Akademisyen bilgisi alınamadı: " + err.message);
        setLoading(false);
      });
  }, []);

  // Akademisyen seç
  var handleSelect = function(prof) {
    setSelectedProf(prof);
    loadDetail(prof.username);
  };

  // Yeni akademisyen ekle
  var handleAdd = function() {
    if (!newUsername.trim()) return alert("ÇAKUAVİS kullanıcı adı gerekli");
    var username = newUsername.trim().toLowerCase();
    setAddModal(false);
    setNewUsername("");
    // Direkt detay yükle (cache'e de kaydedilecek)
    setSelectedProf({ username: username });
    loadDetail(username);
    // Listeyi güncelle
    setTimeout(loadProfessors, 2000);
  };

  // Filtreleme
  var filtered = professors.filter(function(p) {
    if (!searchTerm) return true;
    var term = searchTerm.toLowerCase();
    return (p.fullName || "").toLowerCase().indexOf(term) >= 0 ||
           (p.username || "").toLowerCase().indexOf(term) >= 0 ||
           (p.email || "").toLowerCase().indexOf(term) >= 0;
  });

  // Detay görünümü
  if (selectedProf && profDetail) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <AcademicianDetail
          data={profDetail}
          onBack={function() { setSelectedProf(null); setProfDetail(null); }}
        />
      </div>
    );
  }

  // Liste görünümü
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Başlık */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, margin: 0 }}>
            Akademisyen Bilgi Sistemi
          </h2>
          <p style={{ fontSize: 13, color: COLORS.textLight, margin: "4px 0 0 0" }}>
            ÇAKUAVİS entegrasyonu ile akademisyen profilleri
          </p>
        </div>
        {canManage && (
          <Btn onClick={function() { setAddModal(true); }}>
            + Akademisyen Ekle
          </Btn>
        )}
      </div>

      {/* Arama */}
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Akademisyen ara..."
          value={searchTerm}
          onChange={function(e) { setSearchTerm(e.target.value); }}
          style={{ maxWidth: 400 }}
        />
      </div>

      {/* Loading */}
      {loading && !selectedProf && (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textLight }}>
          Yükleniyor...
        </div>
      )}

      {/* Liste */}
      {!loading && filtered.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👨‍🏫</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>
              Henüz akademisyen eklenmedi
            </div>
            <div style={{ fontSize: 13, color: COLORS.textLight, marginBottom: 16 }}>
              ÇAKUAVİS kullanıcı adı ile akademisyen ekleyebilirsiniz.
            </div>
            {canManage && (
              <Btn onClick={function() { setAddModal(true); }}>
                + İlk Akademisyeni Ekle
              </Btn>
            )}
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
          {filtered.map(function(prof) {
            return (
              <AcademicianCard
                key={prof.username}
                prof={prof}
                onSelect={handleSelect}
                isSelected={selectedProf && selectedProf.username === prof.username}
              />
            );
          })}
        </div>
      )}

      {/* Akademisyen Ekleme Modal */}
      {addModal && (
        <Modal open={true} title="Akademisyen Ekle" onClose={function() { setAddModal(false); }} width={450}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FormField label="ÇAKUAVİS Kullanıcı Adı">
              <Input
                value={newUsername}
                onChange={function(e) { setNewUsername(e.target.value); }}
                placeholder="Örn: aliegi, ksenturk"
              />
              <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 4 }}>
                cakuavis.karatekin.edu.tr/<strong>{newUsername || "kullaniciadi"}</strong> adresindeki kullanıcı adı
              </div>
            </FormField>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <GhostBtn onClick={function() { setAddModal(false); }}>İptal</GhostBtn>
              <Btn onClick={handleAdd}>Ekle ve Bilgileri Çek</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

window.AkademisyenModuluApp = AkademisyenModuluApp;
