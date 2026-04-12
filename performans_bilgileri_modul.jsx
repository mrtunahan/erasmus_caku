import { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
// ÇAKÜ ERASMUS+ — PERFORMANS BİLGİLERİ MODÜLÜ
// 3 Katmanlı: Akademisyen → Bölüm Yetkilisi → Fakülte Yetkilisi
// Sarı göstergeler (13 adet) + 4 çıktı formatı entegrasyonu
// ═══════════════════════════════════════════════════════════════

const GOSTERGELER = [
  { kategori: "YÜKSEKÖĞRETİMDE BİLİMSEL ARAŞTIRMA GELİŞTİRME", hedef: "Yükseköğretim Kurumlarında inovasyon amaçlı bilimsel çalışmaların arttırılması", gostergeler: [
    { id: "g1", ad: "Öğretim elemanı sayısı", birim: "Sayı", aggType: "sum" },
    { id: "g2", ad: "Ar-ge proje sayısı", birim: "Sayı", aggType: "sum" },
    { id: "g3", ad: "Uluslararası endekslerde yer alan bilimsel yayın sayısı", birim: "Sayı", aggType: "sum" },
  ]},
  { kategori: "YÜKSEKÖĞRETİM KURUMLARI SÜREKLİ EĞİTİM FAALİYETLERİ", hedef: "Toplumun tüm kesimlerine ihtiyaç duyduğu alanlarda eğitimler verilmesi", gostergeler: [
    { id: "g4", ad: "Dezavantajlı gruplara yönelik sosyal entegrasyon ve kapsayıcılığa ilişkin yapılan faaliyet sayısı", birim: "Sayı", aggType: "sum" },
  ]},
  { kategori: "ÖĞRETİM ELEMANLARININ MESLEKİ GELİŞİMİ", hedef: "Alanında yetkin araştırmacı bilgi üreten ve aktaran akademisyenler yetiştirilmesi", gostergeler: [
    { id: "g5", ad: "SCI, SCI-Expanded, SSCI ve AHCI kapsamındaki dergilerdeki yayın sayısı", birim: "Sayı", aggType: "sum" },
  ]},
  { kategori: "ÖNLİSANS EĞİTİMİ LİSANS EĞİTİMİ VE LİSANSÜSTÜ EĞİTİMİ", hedef: "Mesleki yeterlilik sahibi ve gelişime açık mezunlar yetiştirilmesi", gostergeler: [
    { id: "g6", ad: "Lisansüstü öğrenci sayısı", birim: "Sayı", aggType: "sum" },
    { id: "g7", ad: "Öğrenci başına düşen eğitim alanı", birim: "m²", aggType: "fixed" },
    { id: "g8", ad: "Öğrenci başına düşen kapalı alan", birim: "m²", aggType: "fixed" },
    { id: "g9", ad: "Öğrenci değişim programlarından yararlanan öğrencilerin oranı", birim: "Oran", aggType: "fixed" },
    { id: "g10", ad: "Öğrenci sayısı", birim: "Sayı", aggType: "sum" },
    { id: "g11", ad: "Öğretim üyesi sayısı", birim: "Sayı", aggType: "sum" },
    { id: "g12", ad: "Yabancı uyruklu öğrenci sayısı", birim: "Sayı", aggType: "sum" },
  ]},
  { kategori: "YÜKSEKÖĞRETİMDE ÖĞRENCİ YAŞAMI", hedef: "Öğrencilere sunulan beslenme ve barınma hizmetlerinin kalitesinin arttırılması", gostergeler: [
    { id: "g13", ad: "Öğrenci kulüp ve topluluk sayısı", birim: "Sayı", aggType: "sum" },
  ]},
];

const HEDEFLER = [
  { hedef: "YÜKSEKÖĞRETİMDE BİLİMSEL ARAŞTIRMA VE GELİŞTİRME", alt: "Yükseköğretim Kurumlarında inovasyon amaçlı bilimsel çalışmaların arttırılması" },
  { hedef: "YÜKSEKÖĞRETİM KURUMLARI SÜREKLİ EĞİTİM FAALİYETLERİ", alt: "Toplumun tüm kesimlerine ihtiyaç duyduğu alanlarda eğitimler verilmesi" },
  { hedef: "ÖĞRETİM ELEMANLARINA SAĞLANAN BURS VE DESTEKLER", alt: "Alanında yetkin araştırmacı bilgi üreten ve aktaran akademisyenler yetiştirilmesi" },
  { hedef: "ÖNLİSANS EĞİTİMİ LİSANS EĞİTİMİ VE LİSANSÜSTÜ EĞİTİMİ", alt: "Mesleki yeterlilik sahibi ve gelişime açık mezunlar yetiştirilmesi" },
  { hedef: "YÜKSEKÖĞRETİMDE ÖĞRENCİ YAŞAMI", alt: "Öğrencilere sunulan beslenme ve barınma hizmetlerinin kalitesinin arttırılması" },
];

const AYLAR = ["TEMMUZ", "AĞUSTOS", "EYLÜL"];
const DONEMLER = ["I. Dönem", "II. Dönem", "III. Dönem", "IV. Dönem"];
const GOSTERGE_TURLERI = ["Girdi", "Çıktı", "Verimlilik", "Ekonomiklik", "Etkililik", "Sonuç"];

const ALL_GOSTERGE_IDS = GOSTERGELER.flatMap(k => k.gostergeler.map(g => g.id));
const findGosterge = (id) => {
  for (const k of GOSTERGELER) for (const g of k.gostergeler) if (g.id === id) return g;
  return null;
};

// ── Mock Akademisyen Veritabanı (Akademisyenler modülünden) ──
const AKADEMISYENLER = [
  { id: "a1", ad: "Dr. Ahmet Yılmaz", bolum: "Bilgisayar Mühendisliği", fakulte: "Mühendislik Fakültesi" },
  { id: "a2", ad: "Dr. Elif Kaya", bolum: "Bilgisayar Mühendisliği", fakulte: "Mühendislik Fakültesi" },
  { id: "a3", ad: "Prof. Dr. Mehmet Demir", bolum: "Bilgisayar Mühendisliği", fakulte: "Mühendislik Fakültesi" },
  { id: "a4", ad: "Dr. Zeynep Arslan", bolum: "Elektrik-Elektronik Mühendisliği", fakulte: "Mühendislik Fakültesi" },
  { id: "a5", ad: "Doç. Dr. Can Öztürk", bolum: "Elektrik-Elektronik Mühendisliği", fakulte: "Mühendislik Fakültesi" },
  { id: "a6", ad: "Dr. Ayşe Çelik", bolum: "İşletme", fakulte: "İktisadi ve İdari Bilimler Fakültesi" },
  { id: "a7", ad: "Prof. Dr. Ali Şahin", bolum: "İktisat", fakulte: "İktisadi ve İdari Bilimler Fakültesi" },
];

const BOLUMLER = [...new Set(AKADEMISYENLER.map(a => a.bolum))];
const FAKULTELER = [...new Set(AKADEMISYENLER.map(a => a.fakulte))];

// ── Renk Paleti ──
const C = {
  bg: "#0f1923", surface: "#162231", surfaceAlt: "#1c2d3f",
  border: "#263d52", borderLight: "#2f4d68",
  accent: "#00b4d8", accentDark: "#0096b7", accentGlow: "rgba(0,180,216,0.12)",
  text: "#e0e8f0", textMuted: "#8ba3b8", textDim: "#5a7a94",
  white: "#fff", success: "#2dd4a8", successDim: "rgba(45,212,168,0.12)",
  warning: "#f0b429", danger: "#ef6461",
  yellow: "#fde047", yellowDim: "rgba(253,224,71,0.10)", yellowBorder: "rgba(253,224,71,0.30)",
  purple: "#a78bfa", purpleDim: "rgba(167,139,250,0.12)",
  orange: "#fb923c", orangeDim: "rgba(251,146,60,0.12)",
};
const F = "'Segoe UI', 'SF Pro Display', -apple-system, sans-serif";

// ════════════════ ANA MODÜL ════════════════
export default function PerformansBilgileri() {
  // Rol sistemi
  const [role, setRole] = useState("akademisyen"); // akademisyen | bolumYetkilisi | fakulteYetkilisi
  const [selectedAkademisyen, setSelectedAkademisyen] = useState("a1");
  const [selectedBolum, setSelectedBolum] = useState(BOLUMLER[0]);
  const [tab, setTab] = useState(0);

  // Akademisyen verileri: { [akademisyenId]: { [gostergeId_AY]: value } }
  const [akademisyenData, setAkademisyenData] = useState({});
  // Hedef verileri: { [akademisyenId]: { [hedefIdx]: text } }
  const [hedefData, setHedefData] = useState({});
  // Performans formu: { [akademisyenId]: { ...fields } }
  const [perfData, setPerfData] = useState({});
  // Rapor: { [akademisyenId]: { ...fields } }
  const [raporData, setRaporData] = useState({});

  // Bölüm yetkilisi: toplama kuralları (sum/fixed override)
  const [aggOverrides, setAggOverrides] = useState({}); // { [gostergeId]: "sum" | "fixed" }

  const [toast, setToast] = useState("");
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  // ── Hesaplamalar ──
  const currentAkad = AKADEMISYENLER.find(a => a.id === selectedAkademisyen);

  const bolumAkademisyenleri = useMemo(() =>
    AKADEMISYENLER.filter(a => a.bolum === selectedBolum), [selectedBolum]);

  const fakulteBolumleri = useMemo(() => {
    const fak = role === "fakulteYetkilisi" ? FAKULTELER[0] : "";
    return [...new Set(AKADEMISYENLER.filter(a => a.fakulte === fak).map(a => a.bolum))];
  }, [role]);

  // Bölüm toplamı hesapla
  const calcBolumToplam = (gostergeId, ay) => {
    const g = findGosterge(gostergeId);
    const aggType = aggOverrides[gostergeId] || g?.aggType || "sum";
    const vals = bolumAkademisyenleri.map(a => {
      const v = akademisyenData[a.id]?.[`${gostergeId}_${ay}`];
      return v ? parseFloat(v) : 0;
    }).filter(v => !isNaN(v));
    if (vals.length === 0) return "—";
    if (aggType === "fixed") return vals[0] || "—";
    return vals.reduce((a, b) => a + b, 0);
  };

  // Fakülte toplamı (tüm bölümlerden)
  const calcFakulteToplam = (gostergeId, ay) => {
    const g = findGosterge(gostergeId);
    const aggType = aggOverrides[gostergeId] || g?.aggType || "sum";
    const allAkads = AKADEMISYENLER.filter(a => a.fakulte === FAKULTELER[0]);
    const vals = allAkads.map(a => {
      const v = akademisyenData[a.id]?.[`${gostergeId}_${ay}`];
      return v ? parseFloat(v) : 0;
    }).filter(v => !isNaN(v));
    if (vals.length === 0) return "—";
    if (aggType === "fixed") return vals[0] || "—";
    return vals.reduce((a, b) => a + b, 0);
  };

  // ── Export ──
  const exportJSON = () => {
    const d = { role, akademisyenData, hedefData, perfData, raporData, aggOverrides };
    const b = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(b);
    Object.assign(document.createElement("a"), { href: u, download: `performans_${role}.json` }).click();
    URL.revokeObjectURL(u);
    flash("JSON dosyası indirildi!");
  };

  // ── Rol başlıkları ──
  const ROLES = [
    { key: "akademisyen", label: "Akademisyen", icon: "👨‍🏫", color: C.accent },
    { key: "bolumYetkilisi", label: "Bölüm Yetkilisi", icon: "🏛️", color: C.warning },
    { key: "fakulteYetkilisi", label: "Fakülte Yetkilisi", icon: "🎓", color: C.purple },
  ];

  const tabs = [
    { label: "Gösterge İzleme", icon: "📊" },
    { label: "Hedef Değerlendirme", icon: "🎯" },
    { label: "Performans Formu", icon: "📋" },
    { label: "Rapor Formatı", icon: "📝" },
  ];

  // ═══════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: F, background: C.bg, color: C.text, minHeight: "100vh" }}>
      {/* ── Header ── */}
      <div style={{ background: `linear-gradient(135deg, ${C.surface} 0%, ${C.surfaceAlt} 100%)`, borderBottom: `2px solid ${C.accent}`, padding: "20px 24px 14px", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.accent}, ${C.success}, ${C.purple})` }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 9, background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>ÇÜ</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.white }}>Performans Bilgileri Modülü</h1>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textMuted }}>ÇAKÜ Erasmus+ — Akademisyen / Bölüm / Fakülte</p>
            </div>
          </div>
          {/* Rol Seçici */}
          <div style={{ display: "flex", gap: 4, background: C.surface, borderRadius: 10, padding: 3, border: `1px solid ${C.border}` }}>
            {ROLES.map(r => (
              <button key={r.key} onClick={() => { setRole(r.key); setTab(0); }} style={{
                padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: F,
                fontSize: 11.5, fontWeight: role === r.key ? 700 : 500, transition: "all 0.2s",
                background: role === r.key ? r.color : "transparent",
                color: role === r.key ? "#fff" : C.textMuted,
              }}>
                {r.icon} {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Akademisyen seçici (sadece akademisyen rolünde) */}
        {role === "akademisyen" && (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>Giriş yapan:</span>
            <select value={selectedAkademisyen} onChange={e => setSelectedAkademisyen(e.target.value)} style={{ ...inpF, width: "auto", padding: "5px 10px", fontSize: 12 }}>
              {AKADEMISYENLER.map(a => <option key={a.id} value={a.id}>{a.ad} — {a.bolum}</option>)}
            </select>
          </div>
        )}

        {/* Bölüm seçici (bölüm yetkilisi rolünde) */}
        {role === "bolumYetkilisi" && (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>Bölüm:</span>
            <select value={selectedBolum} onChange={e => setSelectedBolum(e.target.value)} style={{ ...inpF, width: "auto", padding: "5px 10px", fontSize: 12 }}>
              {BOLUMLER.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <span style={{ fontSize: 11, color: C.textDim, marginLeft: 8 }}>({bolumAkademisyenleri.length} akademisyen)</span>
          </div>
        )}

        {role === "fakulteYetkilisi" && (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: C.purple, fontWeight: 600 }}>Tüm bölümlerden gelen toplam değerler gösterilmektedir</span>
            <span style={{ fontSize: 11, color: C.textDim }}>({FAKULTELER[0]} — {fakulteBolumleri.length} bölüm)</span>
          </div>
        )}
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display: "flex", background: C.surface, borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            flex: "1 1 0", padding: "12px 8px", border: "none",
            background: tab === i ? C.bg : "transparent",
            color: tab === i ? C.accent : C.textMuted,
            fontSize: 11.5, fontWeight: tab === i ? 700 : 500, cursor: "pointer",
            borderBottom: tab === i ? `3px solid ${C.accent}` : "3px solid transparent",
            transition: "all 0.2s", fontFamily: F, whiteSpace: "nowrap",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}>
            <span style={{ fontSize: 13 }}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "20px 16px 40px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ════════ TAB 0: GÖSTERGE İZLEME ════════ */}
        {tab === 0 && (
          <div>
            {/* ── AKADEMİSYEN GÖRÜNÜMÜ ── */}
            {role === "akademisyen" && (
              <>
                <Hdr title="Gösterge Verilerini Girin" sub={`${currentAkad?.ad} — ${currentAkad?.bolum}`} />
                <InfoBar color={C.yellow} text="Aylık gösterge verilerinizi giriniz. Veriler bölüm yetkilisine otomatik iletilecektir." />
                {GOSTERGELER.map((kat, ki) => (
                  <GostergeTable key={ki} kat={kat} aylar={AYLAR}
                    getValue={(gId, ay) => akademisyenData[selectedAkademisyen]?.[`${gId}_${ay}`] || ""}
                    setValue={(gId, ay, val) => setAkademisyenData(p => ({
                      ...p, [selectedAkademisyen]: { ...(p[selectedAkademisyen] || {}), [`${gId}_${ay}`]: val }
                    }))}
                    editable inputStyle={inp} />
                ))}
              </>
            )}

            {/* ── BÖLÜM YETKİLİSİ GÖRÜNÜMÜ ── */}
            {role === "bolumYetkilisi" && (
              <>
                <Hdr title="Bölüm Gösterge Özeti" sub={`${selectedBolum} — Akademisyen verileri toplamı`} />
                <InfoBar color={C.warning} text="Akademisyenlerin girdiği değerler toplanarak gösterilmektedir. Her gösterge için toplama kuralını (Topla/Sabit) ayarlayabilirsiniz." />

                {/* Akademisyen bazlı detay */}
                {bolumAkademisyenleri.map(akad => (
                  <div key={akad.id} style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, padding: "8px 12px", background: C.accentGlow, borderRadius: 8, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>👨‍🏫</span> {akad.ad}
                    </div>
                    {GOSTERGELER.map((kat, ki) => (
                      <GostergeTable key={ki} kat={kat} aylar={AYLAR} compact
                        getValue={(gId, ay) => akademisyenData[akad.id]?.[`${gId}_${ay}`] || ""}
                        editable={false} />
                    ))}
                  </div>
                ))}

                {/* Toplam satırı */}
                <div style={{ marginTop: 20, borderTop: `2px solid ${C.warning}`, paddingTop: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.warning, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    📊 BÖLÜM TOPLAM DEĞERLERİ
                  </div>
                  {GOSTERGELER.map((kat, ki) => (
                    <div key={ki} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", marginBottom: 4, padding: "6px 10px", background: C.accentGlow, borderRadius: 6 }}>{kat.kategori}</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead><tr>
                          <th style={th}>Gösterge</th>
                          <th style={{ ...th, width: 50, textAlign: "center" }}>Birim</th>
                          <th style={{ ...th, width: 75, textAlign: "center" }}>Kural</th>
                          {AYLAR.map(a => <th key={a} style={{ ...th, width: 90, textAlign: "center" }}>{a}</th>)}
                        </tr></thead>
                        <tbody>
                          {kat.gostergeler.map(g => {
                            const currentAgg = aggOverrides[g.id] || g.aggType;
                            return (
                              <tr key={g.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                                <td style={{ ...td, paddingLeft: 8 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <span style={{ width: 7, height: 7, borderRadius: 2, background: C.yellow, display: "inline-block", flexShrink: 0 }} />
                                    {g.ad}
                                  </div>
                                </td>
                                <td style={{ ...td, textAlign: "center", fontSize: 10, color: C.textDim }}>{g.birim}</td>
                                <td style={{ ...td, textAlign: "center", padding: 3 }}>
                                  <select value={currentAgg} onChange={e => setAggOverrides(p => ({ ...p, [g.id]: e.target.value }))}
                                    style={{ ...inpF, padding: "3px 4px", fontSize: 10, width: "100%", textAlign: "center" }}>
                                    <option value="sum">Topla</option>
                                    <option value="fixed">Sabit</option>
                                  </select>
                                </td>
                                {AYLAR.map(a => (
                                  <td key={a} style={{ ...td, textAlign: "center", fontWeight: 700, color: C.warning, fontSize: 13 }}>
                                    {calcBolumToplam(g.id, a)}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── FAKÜLTE YETKİLİSİ GÖRÜNÜMÜ ── */}
            {role === "fakulteYetkilisi" && (
              <>
                <Hdr title="Fakülte Gösterge Özeti" sub="Tüm bölümlerden gelen toplam değerler" />
                <InfoBar color={C.purple} text="Her bölümden gelen toplam değerler fakülte düzeyinde birleştirilmiştir." />

                {/* Bölüm bazlı kırılım */}
                {fakulteBolumleri.map(bolum => {
                  const bolumAkads = AKADEMISYENLER.filter(a => a.bolum === bolum && a.fakulte === FAKULTELER[0]);
                  return (
                    <div key={bolum} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.warning, padding: "7px 12px", background: "rgba(240,180,41,0.10)", borderRadius: 8, marginBottom: 4 }}>
                        🏛️ {bolum} ({bolumAkads.length} akademisyen)
                      </div>
                      {GOSTERGELER.map((kat, ki) => (
                        <div key={ki} style={{ marginBottom: 6 }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                            <tbody>
                              {kat.gostergeler.map(g => {
                                const aggType = aggOverrides[g.id] || g.aggType;
                                const vals = bolumAkads.map(a => {
                                  return AYLAR.map(ay => {
                                    const v = akademisyenData[a.id]?.[`${g.id}_${ay}`];
                                    return v ? parseFloat(v) : 0;
                                  });
                                });
                                return (
                                  <tr key={g.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                                    <td style={{ ...td, fontSize: 11, paddingLeft: 8, maxWidth: 300 }}>{g.ad}</td>
                                    {AYLAR.map((a, ai) => {
                                      const colVals = vals.map(v => v[ai]).filter(v => !isNaN(v));
                                      const total = aggType === "fixed" ? (colVals[0] || "—") : colVals.reduce((s, v) => s + v, 0);
                                      return <td key={a} style={{ ...td, textAlign: "center", fontWeight: 600, color: C.warning, width: 80 }}>{total || "—"}</td>;
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* Fakülte toplam */}
                <div style={{ marginTop: 16, borderTop: `2px solid ${C.purple}`, paddingTop: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.purple, marginBottom: 10 }}>🎓 FAKÜLTE GENEL TOPLAM</div>
                  {GOSTERGELER.map((kat, ki) => (
                    <div key={ki} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: C.accent, textTransform: "uppercase", marginBottom: 3, padding: "5px 8px", background: C.accentGlow, borderRadius: 5 }}>{kat.kategori}</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead><tr>
                          <th style={th}>Gösterge</th>
                          {AYLAR.map(a => <th key={a} style={{ ...th, width: 90, textAlign: "center" }}>{a}</th>)}
                        </tr></thead>
                        <tbody>
                          {kat.gostergeler.map(g => (
                            <tr key={g.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                              <td style={{ ...td, paddingLeft: 8 }}>{g.ad}</td>
                              {AYLAR.map(a => (
                                <td key={a} style={{ ...td, textAlign: "center", fontWeight: 700, color: C.purple, fontSize: 13 }}>
                                  {calcFakulteToplam(g.id, a)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════ TAB 1: HEDEF DEĞERLENDİRME ════════ */}
        {tab === 1 && (
          <div>
            {role === "akademisyen" && (
              <>
                <Hdr title="Hedef Değerlendirmeleri" sub={`${currentAkad?.ad}`} />
                {HEDEFLER.map((h, i) => (
                  <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: C.accent, textTransform: "uppercase" }}>{h.hedef}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10, marginTop: 2 }}>{h.alt}</div>
                    <textarea value={hedefData[selectedAkademisyen]?.[i] || ""}
                      onChange={e => setHedefData(p => ({ ...p, [selectedAkademisyen]: { ...(p[selectedAkademisyen] || {}), [i]: e.target.value } }))}
                      rows={3} placeholder="Değerlendirmenizi yazınız..." style={txa} />
                  </div>
                ))}
              </>
            )}
            {(role === "bolumYetkilisi" || role === "fakulteYetkilisi") && (
              <>
                <Hdr title={`Hedef Değerlendirmeleri — ${role === "bolumYetkilisi" ? "Bölüm Özeti" : "Fakülte Özeti"}`} sub="Akademisyenlerin girdiği değerlendirmeler" />
                {HEDEFLER.map((h, i) => {
                  const akads = role === "bolumYetkilisi" ? bolumAkademisyenleri : AKADEMISYENLER.filter(a => a.fakulte === FAKULTELER[0]);
                  return (
                    <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: C.accent, textTransform: "uppercase" }}>{h.hedef}</div>
                      {akads.map(a => {
                        const val = hedefData[a.id]?.[i];
                        if (!val) return null;
                        return (
                          <div key={a.id} style={{ marginTop: 8, padding: "8px 10px", background: C.surfaceAlt, borderRadius: 6, border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, marginBottom: 3 }}>👨‍🏫 {a.ad}</div>
                            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>{val}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ════════ TAB 2: PERFORMANS FORMU ════════ */}
        {tab === 2 && (
          <div>
            {role === "akademisyen" && (
              <>
                <Hdr title="Performans Göstergesi Nitelikleri" sub={`${currentAkad?.ad}`} />
                <PerfForm data={perfData[selectedAkademisyen] || {}}
                  setData={(d) => setPerfData(p => ({ ...p, [selectedAkademisyen]: d }))} />
              </>
            )}
            {(role === "bolumYetkilisi" || role === "fakulteYetkilisi") && (
              <>
                <Hdr title={`Performans Formları — ${role === "bolumYetkilisi" ? "Bölüm" : "Fakülte"}`} sub="Akademisyenlerin doldurduğu formlar" />
                {(role === "bolumYetkilisi" ? bolumAkademisyenleri : AKADEMISYENLER.filter(a => a.fakulte === FAKULTELER[0])).map(a => {
                  const d = perfData[a.id];
                  if (!d || !d.gosterge) return null;
                  return (
                    <div key={a.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 8 }}>👨‍🏫 {a.ad} — {a.bolum}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                        <div><span style={{ color: C.textDim }}>Gösterge:</span> {d.gosterge}</div>
                        <div><span style={{ color: C.textDim }}>Dönem:</span> {d.donem}</div>
                        <div><span style={{ color: C.textDim }}>Tür:</span> {d.tur}</div>
                        <div><span style={{ color: C.textDim }}>Ölçüm Tarihi:</span> {d.olcumTarihi}</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ════════ TAB 3: RAPOR FORMATI ════════ */}
        {tab === 3 && (
          <div>
            {role === "akademisyen" && (
              <>
                <Hdr title="Rapor Formatı" sub={`${currentAkad?.ad}`} />
                <RaporForm data={raporData[selectedAkademisyen] || { yil: "2026", donem: "I. Dönem" }}
                  setData={(d) => setRaporData(p => ({ ...p, [selectedAkademisyen]: d }))} />
              </>
            )}
            {(role === "bolumYetkilisi" || role === "fakulteYetkilisi") && (
              <>
                <Hdr title={`Raporlar — ${role === "bolumYetkilisi" ? "Bölüm" : "Fakülte"}`} sub="Akademisyenlerin doldurduğu raporlar" />
                {(role === "bolumYetkilisi" ? bolumAkademisyenleri : AKADEMISYENLER.filter(a => a.fakulte === FAKULTELER[0])).map(a => {
                  const d = raporData[a.id];
                  if (!d || !d.genelBilgiler) return null;
                  return (
                    <div key={a.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 6 }}>👨‍🏫 {a.ad} — {a.bolum}</div>
                      <div style={{ fontSize: 11, color: C.textDim }}>Yıl: {d.yil} | Dönem: {d.donem} | İdare: {d.idare}</div>
                      <div style={{ marginTop: 6, fontSize: 12, color: C.text, lineHeight: 1.4, maxHeight: 80, overflow: "hidden" }}>{d.genelBilgiler?.substring(0, 200)}{d.genelBilgiler?.length > 200 ? "..." : ""}</div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Export bar */}
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {toast && <span style={{ fontSize: 12, color: C.success, fontWeight: 600 }}>{toast}</span>}
          <button onClick={exportJSON} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F }}>
            Verileri JSON İndir ({role === "akademisyen" ? "Kişisel" : role === "bolumYetkilisi" ? "Bölüm" : "Fakülte"})
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Alt Bileşenler ──
function Hdr({ title, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.white }}>{title}</h2>
      {sub && <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textMuted }}>{sub}</p>}
    </div>
  );
}

function InfoBar({ color, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16, padding: "9px 12px", background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 7 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: color, display: "inline-block", flexShrink: 0 }} />
      <span style={{ fontSize: 11.5, color, fontWeight: 600 }}>{text}</span>
    </div>
  );
}

function GostergeTable({ kat, aylar, getValue, setValue, editable = true, inputStyle, compact = false }) {
  return (
    <div style={{ marginBottom: compact ? 6 : 20 }}>
      {!compact && (
        <div style={{ background: C.accentGlow, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: "9px 12px", marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>{kat.kategori}</div>
          {kat.hedef && <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 1 }}>{kat.hedef}</div>}
        </div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: compact ? 11 : 12 }}>
        {!compact && (
          <thead><tr>
            <th style={th}>Gösterge</th>
            <th style={{ ...th, width: 55, textAlign: "center" }}>Birim</th>
            {aylar.map(a => <th key={a} style={{ ...th, width: 90, textAlign: "center" }}>{a}</th>)}
          </tr></thead>
        )}
        <tbody>
          {kat.gostergeler.map(g => (
            <tr key={g.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ ...td, paddingLeft: 8, fontSize: compact ? 11 : 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: C.yellow, display: "inline-block", flexShrink: 0 }} />
                  {g.ad}
                </div>
              </td>
              {!compact && <td style={{ ...td, textAlign: "center", color: C.textDim, fontSize: 10 }}>{g.birim}</td>}
              {aylar.map(a => (
                <td key={a} style={{ ...td, textAlign: "center", padding: 3 }}>
                  {editable ? (
                    <input type="text" value={getValue(g.id, a)} onChange={e => setValue(g.id, a, e.target.value)}
                      style={inputStyle || inp} placeholder="—" />
                  ) : (
                    <span style={{ color: getValue(g.id, a) ? C.text : C.textDim, fontWeight: getValue(g.id, a) ? 600 : 400 }}>
                      {getValue(g.id, a) || "—"}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PerfForm({ data, setData }) {
  const up = (k, v) => setData({ ...data, [k]: v });
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div><label style={lbl}>Performans Göstergesi</label><input type="text" value={data.gosterge || ""} onChange={e => up("gosterge", e.target.value)} style={inpF} placeholder="Gösterge adını yazın" /></div>
        <div><label style={lbl}>Değerlendirme Dönemi</label><select value={data.donem || ""} onChange={e => up("donem", e.target.value)} style={inpF}><option value="">Seçiniz</option>{DONEMLER.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
      </div>
      <label style={lbl}>Gösterge Türü</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
        {GOSTERGE_TURLERI.map(t => (
          <button key={t} onClick={() => up("tur", t)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${data.tur === t ? C.accent : C.border}`, background: data.tur === t ? C.accentGlow : "transparent", color: data.tur === t ? C.accent : C.textMuted, fontSize: 11.5, cursor: "pointer", fontFamily: F, fontWeight: data.tur === t ? 600 : 400 }}>{t}</button>
        ))}
      </div>
      {[{ k: "dissal", l: "Dışsal Unsurlar" }, { k: "sorunlar", l: "Sorunlar/Zorluklar" }, { k: "maliyetler", l: "Maliyetler" }, { k: "kiyaslama", l: "Kıyaslama Kaynakları" }].map(f => (
        <div key={f.k} style={{ marginBottom: 12 }}><label style={lbl}>{f.l}</label><textarea value={data[f.k] || ""} onChange={e => up(f.k, e.target.value)} rows={2} style={txa} placeholder="Bilgi giriniz..." /></div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div><label style={lbl}>Ölçüm Tarihi</label><input type="date" value={data.olcumTarihi || ""} onChange={e => up("olcumTarihi", e.target.value)} style={inpF} /></div>
        <div><label style={lbl}>Sonraki Ölçüm</label><input type="date" value={data.sonrakiOlcum || ""} onChange={e => up("sonrakiOlcum", e.target.value)} style={inpF} /></div>
      </div>
      <label style={lbl}>Ölçüm Yapılmadıysa Gerekçeleri</label>
      <textarea value={data.gerekceler || ""} onChange={e => up("gerekceler", e.target.value)} rows={2} style={txa} placeholder="Gerekçeleri yazınız..." />
    </div>
  );
}

function RaporForm({ data, setData }) {
  const up = (k, v) => setData({ ...data, [k]: v });
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div><label style={lbl}>Yıl</label><input type="text" value={data.yil || "2026"} onChange={e => up("yil", e.target.value)} style={inpF} /></div>
        <div><label style={lbl}>İdare Adı</label><input type="text" value={data.idare || ""} onChange={e => up("idare", e.target.value)} style={inpF} placeholder="İdare adı" /></div>
        <div><label style={lbl}>Merci</label><input type="text" value={data.merci || ""} onChange={e => up("merci", e.target.value)} style={inpF} placeholder="Merci" /></div>
      </div>
      <label style={lbl}>Dönem</label>
      <div style={{ display: "flex", gap: 5, marginBottom: 18 }}>
        {DONEMLER.map(d => (
          <button key={d} onClick={() => up("donem", d)} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${data.donem === d ? C.accent : C.border}`, background: data.donem === d ? C.accentGlow : "transparent", color: data.donem === d ? C.accent : C.textMuted, fontSize: 11.5, cursor: "pointer", fontFamily: F, fontWeight: data.donem === d ? 600 : 400 }}>{d}</button>
        ))}
      </div>
      <div style={{ borderLeft: `3px solid ${C.accent}`, paddingLeft: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 10 }}>I. Tespitler</div>
        {[{ k: "genelBilgiler", l: "Genel Bilgiler" }, { k: "gerceklesmeDurumu", l: "Gerçekleşme Durumu" }, { k: "degerlendirme", l: "Değerlendirme" }].map(f => (
          <div key={f.k} style={{ marginBottom: 10 }}><label style={lbl}>{f.l}</label><textarea value={data[f.k] || ""} onChange={e => up(f.k, e.target.value)} rows={3} style={txa} placeholder="Bilgi giriniz..." /></div>
        ))}
      </div>
      <div style={{ borderLeft: `3px solid ${C.success}`, paddingLeft: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 8 }}>II. Sonuç ve Öneriler</div>
        <textarea value={data.sonucOneriler || ""} onChange={e => up("sonucOneriler", e.target.value)} rows={4} style={txa} placeholder="Sonuç ve önerilerinizi yazınız..." />
      </div>
    </div>
  );
}

// ── Stiller ──
const th = { padding: "8px 6px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.textMuted, borderBottom: `2px solid ${C.border}`, background: C.surface };
const td = { padding: "6px", fontSize: 12, color: C.text, lineHeight: 1.3 };
const lbl = { display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 };
const inp = { width: "100%", padding: "5px 6px", borderRadius: 5, border: `1px solid ${C.yellowBorder}`, background: C.yellowDim, color: C.text, fontSize: 12, fontFamily: F, textAlign: "center", outline: "none", boxSizing: "border-box" };
const inpF = { width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.text, fontSize: 12, fontFamily: F, outline: "none", boxSizing: "border-box" };
const txa = { width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.text, fontSize: 12, fontFamily: F, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 };

// ── Global window export (app-shell lazy loader için) ──
window.PerformansBilgileriApp = PerformansBilgileri;
